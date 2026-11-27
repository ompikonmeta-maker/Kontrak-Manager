// Sheet unit tiruan yang menjalankan src/receiver/Penerima.gs apa adanya (doPost) di Node.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const colNum = a => a.toUpperCase().split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
class USheet {
  constructor(nama, aoa) { this.nama = nama; this.data = (aoa || []).map(r => r.slice()); this.f = {}; this.calls = 0; }
  getName() { return this.nama; }
  getLastRow() { for (let i = this.data.length - 1; i >= 0; i--) if ((this.data[i] || []).some(v => v !== '' && v != null)) return i + 1; return 0; }
  getLastColumn() { return this.data.reduce((m, r) => Math.max(m, (r || []).reduce((a, v, j) => (v !== '' && v != null ? j + 1 : a), 0)), 0); }
  sel(r, c) { return (this.data[r - 1] || [])[c - 1]; }
  set(r, c, v) { this.data[r - 1] = this.data[r - 1] || []; this.data[r - 1][c - 1] = v; delete this.f[r + ',' + c]; }
  getRange(r, c, nr = 1, nc = 1) {
    const sh = this; sh.calls++;
    const grid = fn => { const o = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) row.push(fn(r + i, c + j)); o.push(row); } return o; };
    return {
      getDisplayValues: () => grid((y, x) => { const fo = sh.f[y + ',' + x]; const v = sh.sel(y, x); return fo ? String(v == null ? '#N/A' : v) : v == null ? '' : String(v); }),
      getFormulas: () => grid((y, x) => sh.f[y + ',' + x] || ''),
      getSheet: () => sh, getRow: () => r, getColumn: () => c, getNumRows: () => nr, getNumColumns: () => nc
    };
  }
  getRangeList(a1s) { const sh = this; sh.calls++; return { setValue(v) { a1s.forEach(a => { const m = a.match(/^([A-Z]+)(\d+)$/); sh.set(+m[2], colNum(m[1]), v); }); } }; }
}
/** tabs: { nama: aoa }. Mengembalikan {url, ss, edit(tab, r, c, nilai, oleh), props}. */
function createUnit(opts) {
  const sheets = Object.keys(opts.tabs).map(n => new USheet(n, opts.tabs[n]));
  const props = {}, triggers = [], logs = [];
  const ss = { getName: () => opts.nama || 'Sheet unit', getId: () => opts.id || 'ID-UNIT', getSpreadsheetTimeZone: () => 'Asia/Jakarta',
    getSheets: () => sheets.slice(), getSheetByName: n => sheets.find(s => s.nama === n) || null, sheets,
    tambahTab(n, aoa) { const s = new USheet(n, aoa); sheets.push(s); return s; } };
  const lock = { waitLock() {}, releaseLock() {} };
  const g = {
    SpreadsheetApp: { getActive: () => ss },
    LockService: { getDocumentLock: () => lock, getScriptLock: () => lock },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty(k, v) { props[k] = String(v); }, deleteProperty(k) { delete props[k]; }, getProperties: () => Object.assign({}, props) }) },
    ScriptApp: { getProjectTriggers: () => triggers.slice(), deleteTrigger(t) { triggers.splice(triggers.indexOf(t), 1); },
      newTrigger(fn) { const b = { forSpreadsheet: () => b, onEdit: () => b, create: () => { const t = { getHandlerFunction: () => fn }; triggers.push(t); return t; } }; return b; } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType() { return this; }, getContent: () => s, isi: s }) },
    Logger: { log: m => logs.push(String(m)) },
    JSON, Date, Math, String, Number, Object, Array, Error
  };
  const ctx = vm.createContext(g);
  let src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'receiver', 'Penerima.gs'), 'utf8');
  if (opts.secret !== undefined) src = src.replace("var SECRET = 'ISI-KODE-RAHASIA';", 'var SECRET = ' + JSON.stringify(opts.secret) + ';');
  if (opts.versi) src = src.replace('var VERSI = 1;', 'var VERSI = ' + opts.versi + ';');
  vm.runInContext(src, ctx, { filename: 'Penerima.gs' });
  const unit = {
    url: opts.url || 'https://script.google.com/macros/s/UNIT/exec', ss, props, triggers, logs, ctx, panggilan: 0,
    post(body) { unit.panggilan++; return JSON.parse(ctx.doPost({ postData: { contents: body } }).isi); },
    tab: n => ss.getSheetByName(n),
    /** edit manual oleh pengguna sheet (memicu catatEdit bila terpasang) */
    edit(tab, r, c, nilai, oleh) {
      const sh = ss.getSheetByName(tab), lama = sh.sel(r, c); sh.set(r, c, nilai);
      if (triggers.some(t => t.getHandlerFunction() === 'catatEdit')) ctx.catatEdit({ range: sh.getRange(r, c), oldValue: lama, value: nilai, user: { getEmail: () => oleh || '' } });
    }
  };
  return unit;
}
module.exports = { createUnit };
