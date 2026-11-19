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

class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) { const v = (this.sh.data[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? '' : v); }
      out.push(row);
    }
    return out;
  }
  setValues(v) {
    if (v.length !== this.nr || v.some(row => row.length !== this.nc)) throw new Error(`Ukuran data ${v.length}x${v[0] && v[0].length} tidak sama dengan range ${this.nr}x${this.nc}`);
    for (let i = 0; i < this.nr; i++) {
      const ri = this.r - 1 + i;
      this.sh.data[ri] = this.sh.data[ri] || [];
      for (let j = 0; j < this.nc; j++) this.sh.data[ri][this.c - 1 + j] = v[i][j];
    }
    this.sh.maxRows = Math.max(this.sh.maxRows, this.r + this.nr - 1);
    return this;
  }
  setNumberFormat(f) { this.sh.formats.push([this.r, this.c, this.nr, this.nc, f]); return this; }
}

class Sheet {
  constructor(name) { this.name = name; this.data = []; this.maxRows = 1000; this.maxCols = 26; this.formats = []; this.frozen = 0; }
  getName() { return this.name; }
  isEmptyRow(row) { return !row || row.every(v => v === '' || v === undefined || v === null); }
  getLastRow() { for (let i = this.data.length - 1; i >= 0; i--) if (!this.isEmptyRow(this.data[i])) return i + 1; return 0; }
  getLastColumn() { let m = 0; this.data.forEach(row => (row || []).forEach((v, j) => { if (v !== '' && v !== undefined && v !== null) m = Math.max(m, j + 1); })); return m; }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  getRange(r, c, nr = 1, nc = 1) {
    if (r < 1 || c < 1 || nr < 1 || nc < 1) throw new Error(`Range tidak valid (${r},${c},${nr},${nc})`);
    return new Range(this, r, c, nr, nc);
  }
  getDataRange() { return new Range(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
  setFrozenRows(n) { this.frozen = n; }
  deleteRow(r) { this.data.splice(r - 1, 1); }
}

class Spreadsheet {
  constructor(id, name, owner) { this.id = id; this.name = name; this.sheets = [new Sheet('Sheet1')]; this.editors = [owner]; this.viewers = []; }
  getId() { return this.id; }
  getName() { return this.name; }
  getSheets() { return this.sheets.slice(); }
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
  insertSheet(n) { if (this.getSheetByName(n)) throw new Error('Sheet ' + n + ' sudah ada'); const s = new Sheet(n); this.sheets.push(s); return s; }
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
  const fmt2 = n => String(n).padStart(2, '0');
  const gas = {
    Date: clock.Date,
    SpreadsheetApp: {
      create(name) { const id = 'ss_' + crypto.randomUUID().slice(0, 8); files[id] = new Spreadsheet(id, name, owner); return files[id]; },
      openById(id) { if (!files[id]) throw new Error('File tidak ditemukan: ' + id); return files[id]; },
    },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null), setProperty(k, v) { props[k] = String(v); return this; }, deleteProperty(k) { delete props[k]; },
    }) },
    CacheService: { getScriptCache: () => ({
      get(k) { const e = cache[k]; if (!e) return null; if (e.exp < clock.now()) { delete cache[k]; return null; } return e.v; },
      put(k, v, ttl = 600) { if (String(v).length > 100 * 1024) throw new Error('Argument too large: value'); if (ttl > 21600) throw new Error('TTL maks 21600'); cache[k] = { v: String(v), exp: clock.now() + ttl * 1000 }; },
      remove(k) { delete cache[k]; },
    }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
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
    ScriptApp: { AuthMode: { FULL: 'FULL' }, requireAllScopes(m) { logs.push('requireAllScopes ' + m); } },
    Session: { getEffectiveUser: () => ({ getEmail: () => owner }), getScriptTimeZone: () => 'Asia/Jakarta' },
    HtmlService: { createHtmlOutput(h) { const o = { html: h, title: '', meta: [], setTitle(t) { o.title = t; return o; }, addMetaTag(n, c) { o.meta.push([n, c]); return o; }, getContent: () => h }; return o; } },
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push('ERROR ' + a.join(' ')), warn: (...a) => logs.push('WARN ' + a.join(' ')) },
  };
  const ctx = vm.createContext(gas);
  vm.runInContext(fs.readFileSync(opts.file || path.join(__dirname, '..', '..', 'dist', 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
  return {
    ctx, clock, logs, props, cache,
    db: () => files[props.DB_ID],
    tab: name => { const s = files[props.DB_ID].getSheetByName(name); const [h, ...rows] = s.data; return rows.filter(r => r && r.some(v => v !== '')).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]]))); },
    /** Jalankan api() seperti google.script.run: hasil dibuat ulang lewat JSON (yang bisa dikirim ke browser saja). */
    api: (token, aksi, payload) => { ctx.Repo._reset(); return JSON.parse(JSON.stringify(ctx.api(token, aksi, payload))); },
    /** Mulai eksekusi baru (memo per-eksekusi dibuang, seperti request baru di Apps Script). */
    baru: () => ctx.Repo._reset(),
  };
}

module.exports = { createGas };
