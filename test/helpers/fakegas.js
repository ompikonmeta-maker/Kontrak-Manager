// Apps Script tiruan di memori: SpreadsheetApp, PropertiesService, CacheService, LockService, Utilities, Session, HtmlService.
// Cukup untuk menjalankan dist/Code.gs dari ujung ke ujung di Node. Jam bisa dimajukan (clock.tambah(ms)).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

function makeClock() {
  let offset = 0;
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + offset); }
    static now() { return RealDate.now() + offset; }
  }
  return { Date: FakeDate, tambah(ms) { offset += ms; }, now: () => RealDate.now() + offset };
}

const OPS = { n: 0 };
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() {
    OPS.n++;
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) { const v = (this.sh.data[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? '' : v); }
      out.push(row);
    }
    return out;
  }
  setValues(v) {
    OPS.n++;
    if (this.r + this.nr - 1 > this.sh.maxRows) throw new Error(`Exception: Those rows are out of bounds (baris ${this.r + this.nr - 1} > ${this.sh.maxRows})`);
    if (v.length !== this.nr || v.some(row => row.length !== this.nc)) throw new Error(`Ukuran data ${v.length}x${v[0] && v[0].length} tidak sama dengan range ${this.nr}x${this.nc}`);
    for (let i = 0; i < this.nr; i++) {
      const ri = this.r - 1 + i;
      this.sh.data[ri] = this.sh.data[ri] || [];
      for (let j = 0; j < this.nc; j++) this.sh.data[ri][this.c - 1 + j] = v[i][j];
    }
    return this;
  }
  getRow() { return this.r; }
  setValue(v) { return this.setValues([[v]]); }
  clearContent() { OPS.n++; for (let i = 0; i < this.nr; i++) { const row = this.sh.data[this.r - 1 + i]; if (row) for (let j = 0; j < this.nc; j++) row[this.c - 1 + j] = ''; } return this; }
  createTextFinder(text) {
    const rg = this; let entire = false;
    const cocok = v => entire ? String(v) === text : String(v).includes(text);
    const tf = { matchEntireCell(b) { entire = !!b; return tf; },
      findAll() { OPS.n++; const out = []; for (let i = 0; i < rg.nr; i++) for (let j = 0; j < rg.nc; j++) { const v = (rg.sh.data[rg.r - 1 + i] || [])[rg.c - 1 + j]; if (v !== undefined && v !== '' && cocok(v)) out.push(new Range(rg.sh, rg.r + i, rg.c + j, 1, 1)); } return out; },
      findNext() { const a = tf.findAll(); return a[0] || null; } };
    return tf;
  }
  setNumberFormat(f) { OPS.n++; if (this.r + this.nr - 1 > this.sh.maxRows) throw new Error('Exception: Those rows are out of bounds'); this.sh.formats.push([this.r, this.c, this.nr, this.nc, f]); return this; }
}

class Sheet {
  constructor(name) { this.name = name; this.data = []; this.maxRows = 1000; this.maxCols = 26; this.formats = []; this.frozen = 0; }
  getName() { return this.name; }
  isEmptyRow(row) { return !row || row.every(v => v === '' || v === undefined || v === null); }
  insertRowsAfter(after, n) { OPS.n++; this.maxRows += n; this.cekSel(); }
  insertColumnsAfter(after, n) { OPS.n++; this.maxCols += n; this.cekSel(); }
  deleteRows(r, n) { OPS.n++; if (r + n - 1 > this.maxRows) throw new Error('Those rows are out of bounds.'); if (this.maxRows - n <= this.frozen) throw new Error("You can't delete all the rows on the sheet."); this.data.splice(r - 1, n); this.maxRows -= n; }
  deleteColumns(c, n) { OPS.n++; if (this.maxCols - n < 1) throw new Error("You can't delete all the columns on the sheet."); this.data.forEach(row => row && row.splice(c - 1, n)); this.maxCols -= n; }
  setName(n) { this.name = n; return this; }
  cekSel() { if (this.ss) { const tot = this.ss.sheets.reduce((a, s) => a + s.maxRows * s.maxCols, 0); if (tot > 10000000) throw new Error('This action would increase the number of cells in the workbook above the limit of 10000000 cells.'); } }
  getLastRow() { OPS.n++; return this._lastRow(); }
  _lastRow() { for (let i = this.data.length - 1; i >= 0; i--) if (!this.isEmptyRow(this.data[i])) return i + 1; return 0; }
  getLastColumn() { OPS.n++; let m = 0; this.data.forEach(row => (row || []).forEach((v, j) => { if (v !== '' && v !== undefined && v !== null) m = Math.max(m, j + 1); })); return m; }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  getRange(r, c, nr = 1, nc = 1) {
    if (r < 1 || c < 1 || nr < 1 || nc < 1) throw new Error(`Range tidak valid (${r},${c},${nr},${nc})`);
    return new Range(this, r, c, nr, nc);
  }
  getDataRange() { OPS.n++; let m = 0; this.data.forEach(row => (row || []).forEach((v, j) => { if (v !== '' && v !== undefined && v !== null) m = Math.max(m, j + 1); })); return new Range(this, 1, 1, Math.max(this._lastRow(), 1), Math.max(m, 1)); }
  setFrozenRows(n) { if (n >= this.maxRows) throw new Error("You can't freeze all visible rows on the sheet."); this.frozen = n; }
  deleteRow(r) { OPS.n++; this.data.splice(r - 1, 1); }
}

class Spreadsheet {
  constructor(id, name, owner) { this.id = id; this.name = name; this.sheets = [new Sheet('Sheet1')]; this.sheets[0].ss = this; this.editors = [owner]; this.viewers = []; }
  getId() { return this.id; }
  getName() { return this.name; }
  getSheets() { return this.sheets.slice(); }
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
  insertSheet(n) { if (this.getSheetByName(n)) throw new Error('Sheet ' + n + ' sudah ada'); const s = new Sheet(n); s.ss = this; this.sheets.push(s); s.cekSel(); return s; }
  deleteSheet(s) { this.sheets = this.sheets.filter(x => x !== s); }
  getEditors() { return this.editors.map(e => ({ getEmail: () => e })); }
  getViewers() { return this.viewers.map(e => ({ getEmail: () => e })); }
}

function createGas(opts = {}) {
  const clock = makeClock();
  const owner = opts.owner || 'ff.unit@gmail.com';
  const files = {};
  const props = {};
  const cache = {};
  const logs = [];
  const lockState = { held: false };
  const triggers = [], drive = {};
  const driveObj = id => ({ getId: () => id, setTrashed(b) { drive[id].trashed = b; return this; }, moveTo(f) { drive[id].folder = f.getId(); return this; } });
  const fmt2 = n => String(n).padStart(2, '0');
  const gas = {
    Date: clock.Date,
    SpreadsheetApp: {
      create(name) { const id = 'ss_' + crypto.randomUUID().slice(0, 8); files[id] = new Spreadsheet(id, name, owner); return files[id]; },
      openById(id) { OPS.n++; if (!files[id]) throw new Error('File tidak ditemukan: ' + id); return files[id]; },
    },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null), setProperty(k, v) { if (String(v).length > 9 * 1024) throw new Error('Argument too large: value'); props[k] = String(v); return this; }, deleteProperty(k) { delete props[k]; },
      getProperties: () => ({ ...props }), deleteAllProperties() { Object.keys(props).forEach(k => delete props[k]); },
    }) },
    CacheService: { getScriptCache: () => ({
      get(k) { const e = cache[k]; if (!e) return null; if (e.exp < clock.now()) { delete cache[k]; return null; } return e.v; },
      put(k, v, ttl = 600) { if (String(v).length > 100 * 1024) throw new Error('Argument too large: value'); if (ttl > 21600) throw new Error('TTL maks 21600'); cache[k] = { v: String(v), exp: clock.now() + ttl * 1000 }; },
      remove(k) { delete cache[k]; },
      putAll(o, ttl) { Object.keys(o).forEach(k => this.put(k, o[k], ttl)); },
      getAll(keys) { const r = {}; keys.forEach(k => { const v = this.get(k); if (v !== null) r[k] = v; }); return r; },
    }) },
    LockService: { getScriptLock: () => ({ tryLock() { lockState.held = true; return true; }, waitLock() { lockState.held = true; }, releaseLock() { lockState.held = false; }, hasLock: () => lockState.held }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest(alg, s) { return [...crypto.createHash(alg).update(String(s), 'utf8').digest()].map(b => (b > 127 ? b - 256 : b)); },
      getUuid: () => crypto.randomUUID(),
      formatDate(d, tz, f) {
        if (tz !== 'Asia/Jakarta') throw new Error('Zona tidak didukung tiruan: ' + tz);
        const j = new Date(d.getTime() + 7 * 3600000);     // WIB = UTC+7, tanpa DST
        return f.replace('yyyy', j.getUTCFullYear()).replace('MM', fmt2(j.getUTCMonth() + 1)).replace('dd', fmt2(j.getUTCDate()))
          .replace('HH', fmt2(j.getUTCHours())).replace('mm', fmt2(j.getUTCMinutes())).replace('ss', fmt2(j.getUTCSeconds()));
      },
    },
    ScriptApp: { AuthMode: { FULL: 'FULL' }, requireAllScopes(m) { logs.push('requireAllScopes ' + m); },
      newTrigger(fn) { const b = { timeBased: () => b, after: ms => { b.ms = ms; return b; }, create: () => { const t = { fn, ms: b.ms, getHandlerFunction: () => fn }; triggers.push(t); return t; } }; return b; },
      getProjectTriggers: () => triggers.slice(), deleteTrigger(t) { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); } },
    DriveApp: {
      createFolder(name) { const id = 'fd_' + crypto.randomUUID().slice(0, 8); drive[id] = { name, trashed: false, isFolder: true }; return driveObj(id); },
      getFolderById: id => { if (!drive[id]) throw new Error('Folder tidak ada'); return driveObj(id); },
      getFileById: id => { if (!files[id] && !drive[id]) throw new Error('File tidak ada'); drive[id] = drive[id] || { name: files[id].name, trashed: false }; return driveObj(id); },
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => owner }), getScriptTimeZone: () => 'Asia/Jakarta' },
    HtmlService: { createHtmlOutput(h) { const o = { html: h, title: '', meta: [], setTitle(t) { o.title = t; return o; }, addMetaTag(n, c) { o.meta.push([n, c]); return o; }, getContent: () => h }; return o; } },
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push('ERROR ' + a.join(' ')), warn: (...a) => logs.push('WARN ' + a.join(' ')) },
  };
  const ctx = vm.createContext(gas);
  vm.runInContext(fs.readFileSync(opts.file || path.join(__dirname, '..', '..', 'dist', 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
  return {
    ctx, clock, logs, props, cache, ops: OPS, triggers, drive, files,
    db: () => files[props.DB_ID],
    tab: name => { const s = files[props.DB_ID].getSheetByName(name); const [h, ...rows] = s.data; return rows.filter(r => r && r.some(v => v !== '')).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]]))); },
    /** Jalankan api() seperti google.script.run: hasil dibuat ulang lewat JSON (yang bisa dikirim ke browser saja). */
    api: (token, aksi, payload) => { ctx.Repo._reset(); return JSON.parse(JSON.stringify(ctx.api(token, aksi, payload))); },
    /** Mulai eksekusi baru (memo per-eksekusi dibuang, seperti request baru di Apps Script). */
    baru: () => { if (ctx.Repo) ctx.Repo._reset(); },
  };
}

module.exports = { createGas };
