/**
 * Repo: SATU-SATUNYA modul yang menyentuh database (§3.4, §4.3). Semua nilai disimpan sebagai teks (format sel "@").
 *
 * File:
 *   SKM_DB              tab kecil (Users, Ref_*, Config, _Meta) + tab besar data aktif (Kontrak, BAST, …) + Indeks semua kontrak
 *   SKM_ARSIP_<tahun>   kontrak CLOSE yang dipindah (tab sama dengan tab besar data kontrak)
 *   SKM_LOG_<tahun>     satu tab per bulan: Log-<yyyy-mm>
 *
 * Tab kecil: dibaca utuh lalu di-cache (diperbarui setelah menulis).
 * Tab besar: TIDAK dibaca utuh per permintaan. Nomor baris dicari lewat indeks (kunci → baris) di cache; satu baris dibaca/ditulis.
 */
var Repo = (function () {

  var KOL_LOG = ['Timestamp', 'Username', 'Aksi', 'Entitas', 'EntitasID', 'Field', 'NilaiLama', 'NilaiBaru', 'Catatan', 'Hasil'];
  var KOL_DATA = {
    Kontrak: ['KontrakID', 'NoKontrak', 'NoKontrakNorm', 'JenisDok', 'TahunProject', 'Populasi', 'NamaPelanggan', 'EndCustomer', 'JudulKontrak', 'Segment',
      'NilaiKontrak', 'JumlahLokasi', 'PIC', 'JenisCustomer', 'TahapKontrak', 'StatusKontrak', 'SisaLokasi', 'KendalaUmum', 'KendalaDetil', 'TglStatusBerubah',
      'TglClose', 'PerluVerifikasi', 'Arsip', 'AlasanArsip', 'SumberAwal', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'Version'],
    OrderInternal: ['OrderID', 'KontrakID', 'JenisOrder', 'NoOrder', 'NoOrderNorm', 'JenisLayanan', 'JenisPekerjaan', 'JumlahLokasi', 'Keterangan', 'Dihapus',
      'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'Version'],
    BAST: ['BASTID', 'KontrakID', 'Urutan', 'DokTagih', 'KodeTahap', 'Siklus', 'CakupanOrder', 'CakupanLokasi', 'DaftarLokasi', 'NoDokBAST', 'TglTahapMulai',
      'Keterangan', 'Status', 'Dihapus', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'Version'],
    RiwayatTahap: ['BASTID', 'KontrakID', 'Siklus', 'KodeTahap', 'Masuk', 'Oleh', 'Keterangan'],
    Kendala: ['KendalaID', 'BASTID', 'KontrakID', 'Jenis', 'Keterangan', 'Status', 'Mulai', 'DibuatOleh', 'Selesai', 'DiselesaikanOleh', 'CatatanSelesai', 'Version']
  };
  var REF = ['Kode', 'Label', 'Aktif', 'Urutan', 'UpdatedAt', 'UpdatedBy'];
  // Skema SKM_DB versi terbaru. Migrasi hanya MENAMBAH tab/kolom (§3.3).
  var SKEMA_TAB = {
    _Meta: ['Key', 'Nilai'],
    Users: ['Username', 'Nama', 'AliasPIC', 'Role', 'PasswordHash', 'Salt', 'Aktif', 'WajibGantiPassword', 'GagalLogin',
            'TerkunciSampai', 'LoginTerakhir', 'PunyaAktivitas', 'SesiVersi', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'Version', 'IzinTambahan'],
    Ref_Role: ['Role', 'Izin', 'UpdatedAt', 'UpdatedBy'],
    Config: ['Key', 'Nilai', 'Keterangan', 'UpdatedAt', 'UpdatedBy'],
    Kontrak: KOL_DATA.Kontrak, OrderInternal: KOL_DATA.OrderInternal, BAST: KOL_DATA.BAST, RiwayatTahap: KOL_DATA.RiwayatTahap, Kendala: KOL_DATA.Kendala,
    KontrakAlias: ['AliasNorm', 'NoAsli', 'KontrakID', 'Sumber', 'Catatan', 'CreatedAt', 'CreatedBy'],
    Indeks: ['NoKontrakNorm', 'KontrakID', 'NoKontrak', 'NamaPelanggan', 'EndCustomer', 'JudulKontrak', 'StatusKontrak', 'TahapKontrak', 'PIC', 'Lokasi', 'TglClose', 'Arsip'],
    Ref_Tahap: ['Kode', 'Urutan', 'Label', 'Penutup', 'BatasAgingHari', 'Aktif', 'UpdatedAt', 'UpdatedBy'],
    Ref_Kendala: ['Kode', 'Label', 'WajibKeterangan', 'MemicuReopen', 'Aktif', 'Urutan', 'UpdatedAt', 'UpdatedBy'],
    Ref_NilaiPush: ['Urutan', 'Kondisi', 'Nilai', 'Aktif', 'UpdatedAt', 'UpdatedBy'],
    Ref_JenisDok: REF, Ref_Populasi: REF, Ref_Segment: REF, Ref_DokTagih: REF
  };
  var KUNCI = { _Meta: 'Key', Users: 'Username', Ref_Role: 'Role', Config: 'Key', Ref_Tahap: 'Kode', Ref_Kendala: 'Kode', Ref_NilaiPush: 'Kondisi',
                Ref_JenisDok: 'Kode', Ref_Populasi: 'Kode', Ref_Segment: 'Kode', Ref_DokTagih: 'Kode' };
  // tab besar: kunci (null = hanya ditambah) dan kolom KontrakID (untuk arsip)
  var BESAR = { Kontrak: { key: 'KontrakID', kid: 'KontrakID' }, BAST: { key: 'BASTID', kid: 'KontrakID' }, OrderInternal: { key: 'OrderID', kid: 'KontrakID' },
                Kendala: { key: 'KendalaID', kid: 'KontrakID' }, Indeks: { key: 'KontrakID', kid: 'KontrakID' }, RiwayatTahap: { key: null, kid: 'KontrakID' },
                KontrakAlias: { key: null, kid: 'KontrakID' } };
  var TAB_ARSIP = ['Kontrak', 'OrderInternal', 'BAST', 'RiwayatTahap', 'Kendala'];
  var CACHE_DETIK = 300, CACHE_LAMA = 21600, POTONG = 90000;

  var _ss = null, _memo = {}, _hdr = {}, _max = {}, _logBuf = [], _file = {}, _idx = {};

  function galat(kode, pesan) { var e = new Error(pesan); e.kode = kode; return e; }
  function sekarang() { return Utilities.formatDate(new Date(), APP.TZ, 'yyyy-MM-dd HH:mm:ss'); }
  function props() { return PropertiesService.getScriptProperties(); }
  function dbId() { return props().getProperty('DB_ID'); }
  function siap() { return !!dbId(); }
  function cache() { return CacheService.getScriptCache(); }

  function ss() {
    if (_ss) return _ss;
    var id = dbId();
    if (!id) throw galat('BELUM_SETUP', 'Database belum dibuat. Jalankan fungsi setup() di editor Apps Script.');
    _ss = SpreadsheetApp.openById(id);
    return _ss;
  }
  function sheet(tab) {
    var sh = ss().getSheetByName(tab);
    if (!sh) throw galat('SKEMA', 'Tab "' + tab + '" tidak ada di database. Buka ulang aplikasi supaya migrasi berjalan.');
    return sh;
  }

  // ---------- cache besar: JSON dipotong ≤ 90 KB per item ----------
  function cachePut(key, obj, detik) {
    var json = JSON.stringify(obj), n = Math.ceil(json.length / POTONG) || 1, o = {};
    for (var i = 0; i < n; i++) o[key + '#' + i] = json.substr(i * POTONG, POTONG);
    o[key] = String(n);
    try { cache().putAll(o, detik || CACHE_LAMA); } catch (e) { cache().remove(key); }
  }
  function cacheGet(key) {
    var n = Number(cache().get(key));
    if (!n) return null;
    var keys = []; for (var i = 0; i < n; i++) keys.push(key + '#' + i);
    var got = cache().getAll(keys), s = '';
    for (var j = 0; j < n; j++) { if (got[keys[j]] === undefined || got[keys[j]] === null) return null; s += got[keys[j]]; }
    try { return JSON.parse(s); } catch (e) { return null; }
  }

  // ---------- tab kecil ----------
  function simpanCache(tab) {
    if (BESAR[tab] || !_memo[tab]) return;
    try { cache().put('tab:' + tab, JSON.stringify(_memo[tab]), CACHE_DETIK); } catch (e) { cache().remove('tab:' + tab); }
  }
  function lupakan(tab) {
    delete _memo[tab]; delete _hdr[tab]; delete _max[tab]; delete _idx[tab];
    cache().removeAll(['hdr:' + tab, 'tab:' + tab, 'idx:' + tab, 'n:' + tab]);
  }
  function headerSheet(sh) { var lc = sh.getLastColumn(); return lc ? sh.getRange(1, 1, 1, lc).getValues()[0].map(String) : []; }
  /** Judul kolom tab SKM_DB: memo → cache (6 jam; dibuang saat migrasi) → sheet. */
  function header(tab) {
    if (_hdr[tab]) return _hdr[tab];
    var c = cache().get('hdr:' + tab);
    if (c) { _hdr[tab] = JSON.parse(c); return _hdr[tab]; }
    _hdr[tab] = headerSheet(sheet(tab));
    if (_hdr[tab].length) cache().put('hdr:' + tab, JSON.stringify(_hdr[tab]), CACHE_LAMA);
    return _hdr[tab];
  }
  function keObjek(h, v, row) { var o = row ? { _row: row } : {}; for (var j = 0; j < h.length; j++) o[h[j]] = v[j] === null || v[j] === undefined ? '' : String(v[j]); return o; }
  function bacaSemua(sh) {
    var v = sh.getDataRange().getValues(), h = (v[0] || []).map(String), rows = [];
    for (var i = 1; i < v.length; i++) { if (v[i].join('') === '') continue; rows.push(keObjek(h, v[i], i + 1)); }
    return { h: h, rows: rows };
  }
  function semua(tab) {
    if (BESAR[tab]) return bacaSemua(sheet(tab)).rows;      // tab besar: tidak di-cache (dipakai snapshot & pekerjaan latar)
    if (_memo[tab]) return _memo[tab];
    var c = cache().get('tab:' + tab);
    if (c) { _memo[tab] = JSON.parse(c); return _memo[tab]; }
    var x = bacaSemua(sheet(tab));
    _hdr[tab] = x.h; _memo[tab] = x.rows; simpanCache(tab);
    return x.rows;
  }
  function cari(tab, kunci) {
    if (BESAR[tab]) return besarBaca(tab, kunci);
    var k = KUNCI[tab], rows = semua(tab);
    for (var i = 0; i < rows.length; i++) if (rows[i][k] === String(kunci)) return rows[i];
    return null;
  }
  function barisNilai(h, obj) { return h.map(function (c) { var v = obj[c]; return v === undefined || v === null ? '' : String(v); }); }

  /** Sheet bawaan hanya 1.000 baris: tambah baris berformat teks bila penulisan melewati batas. */
  function pastikanBaris(kunci, sh, sampai, ncol) {
    if (_max[kunci] === undefined) _max[kunci] = sh.getMaxRows();
    if (sampai <= _max[kunci]) return;
    var n = Math.max(1000, sampai - _max[kunci]);
    sh.insertRowsAfter(_max[kunci], n);
    sh.getRange(_max[kunci] + 1, 1, n, Math.max(sh.getMaxColumns(), ncol)).setNumberFormat('@');
    _max[kunci] += n;
  }
  function isiOtomatis(h, obj) {
    var now = sekarang(), o = {};
    for (var k in obj) o[k] = obj[k];
    if (h.indexOf('Version') >= 0 && !o.Version) o.Version = '1';
    if (h.indexOf('CreatedAt') >= 0 && !o.CreatedAt) o.CreatedAt = now;
    if (h.indexOf('UpdatedAt') >= 0 && !o.UpdatedAt) o.UpdatedAt = now;
    return o;
  }
  function tambah(tab, obj) {
    if (BESAR[tab]) { besarTambah(tab, [obj]); return obj; }
    var rows = semua(tab), h = header(tab), o = isiOtomatis(h, obj), r = 2;
    rows.forEach(function (x) { if (x._row >= r) r = x._row + 1; });
    var sh = sheet(tab);
    pastikanBaris(tab, sh, r, h.length);
    var nilai = barisNilai(h, o);
    sh.getRange(r, 1, 1, h.length).setValues([nilai]);
    rows.push(keObjek(h, nilai, r));
    simpanCache(tab);
    return o;
  }
  /** Ubah baris berdasarkan kunci. versi (opsional) mencegah saling timpa (§7). */
  function ubah(tab, kunci, patch, oleh, versi) {
    var lama = cari(tab, kunci);
    if (!lama) throw galat('TIDAK_ADA', tab + ' "' + kunci + '" tidak ditemukan.');
    var h = header(tab);
    if (versi !== undefined && versi !== null && h.indexOf('Version') >= 0 && String(versi) !== String(lama.Version)) {
      throw galat('KONFLIK', 'Data ini baru saja diubah orang lain. Muat ulang lalu coba lagi.');
    }
    var baru = {};
    for (var k in lama) baru[k] = lama[k];
    for (var p in patch) baru[p] = patch[p] === undefined || patch[p] === null ? '' : String(patch[p]);
    if (h.indexOf('UpdatedAt') >= 0) baru.UpdatedAt = sekarang();
    if (h.indexOf('UpdatedBy') >= 0 && oleh) baru.UpdatedBy = oleh;
    if (h.indexOf('Version') >= 0) baru.Version = String(Domain.num(lama.Version, 0) + 1);
    if (BESAR[tab]) { besarTulis(tab, baru); return baru; }
    sheet(tab).getRange(lama._row, 1, 1, h.length).setValues([barisNilai(h, baru)]);
    var rows = semua(tab), i = rows.indexOf(lama);
    if (i >= 0) rows[i] = baru;
    simpanCache(tab);
    return baru;
  }
  function hapus(tab, kunci) {
    if (BESAR[tab]) throw galat('SKEMA', 'Baris tab besar tidak dihapus langsung.');
    var lama = cari(tab, kunci);
    if (!lama) throw galat('TIDAK_ADA', tab + ' "' + kunci + '" tidak ditemukan.');
    sheet(tab).deleteRow(lama._row);
    if (_max[tab] !== undefined) _max[tab]--;
    var rows = semua(tab), i = rows.indexOf(lama);
    if (i >= 0) { rows.splice(i, 1); for (var j = i; j < rows.length; j++) rows[j]._row--; }
    simpanCache(tab);
  }
  /** Ganti seluruh isi tab kecil (dipakai halaman pengaturan: urutan aturan, dll). */
  function gantiSemua(tab, list) {
    var sh = sheet(tab), h = header(tab), lr = sh.getLastRow(), now = sekarang();
    if (lr > 1) sh.getRange(2, 1, lr - 1, h.length).clearContent();
    var rows = list.map(function (o) { var x = {}; for (var k in o) x[k] = o[k]; if (h.indexOf('UpdatedAt') >= 0 && !x.UpdatedAt) x.UpdatedAt = now; return barisNilai(h, x); });
    if (rows.length) { pastikanBaris(tab, sh, rows.length + 1, h.length); sh.getRange(2, 1, rows.length, h.length).setValues(rows); }
    delete _memo[tab]; cache().remove('tab:' + tab);
  }

  // ---------- tab besar: indeks kunci → baris ----------
  function indeks(tab) {
    if (_idx[tab]) return _idx[tab];
    var c = cacheGet('idx:' + tab);
    if (c) { _idx[tab] = c; return c; }
    return bangunIndeks(tab);
  }
  function bangunIndeks(tab) {
    var sh = sheet(tab), lr = sh.getLastRow(), m = {}, b = BESAR[tab];
    if (b.key && lr > 1) {
      var col = header(tab).indexOf(b.key) + 1, v = sh.getRange(2, col, lr - 1, 1).getValues();
      for (var i = 0; i < v.length; i++) if (v[i][0] !== '') m[String(v[i][0])] = i + 2;
    }
    _idx[tab] = { m: m, n: Math.max(lr, 1) };
    cachePut('idx:' + tab, _idx[tab]);
    return _idx[tab];
  }
  function simpanIndeks(tab) { if (_idx[tab]) cachePut('idx:' + tab, _idx[tab]); }
  /** Satu baris tab besar menurut kunci. Isi sheet dicek; indeks dibangun ulang sekali bila tidak cocok/tidak ada. */
  function besarBaca(tab, kunci) {
    var h = header(tab), kc = h.indexOf(BESAR[tab].key);
    for (var coba = 0; coba < 2; coba++) {
      var r = (coba ? bangunIndeks(tab) : indeks(tab)).m[String(kunci)];
      if (!r) continue;
      var v = sheet(tab).getRange(r, 1, 1, h.length).getValues()[0];
      if (String(v[kc]) === String(kunci)) return keObjek(h, v, r);
    }
    return null;
  }
  /** Tulis baris tab besar (kunci harus sudah ada). Kunci di sheet dicek dulu supaya tidak menimpa baris lain. */
  function besarTulis(tab, obj) {
    var h = header(tab), kc = h.indexOf(BESAR[tab].key) + 1, kunci = String(obj[BESAR[tab].key]), sh = sheet(tab);
    for (var coba = 0; coba < 2; coba++) {
      var r = (coba ? bangunIndeks(tab) : indeks(tab)).m[kunci];
      if (r && String(sh.getRange(r, kc).getValue()) === kunci) { sh.getRange(r, 1, 1, h.length).setValues([barisNilai(h, obj)]); return r; }
    }
    throw galat('TIDAK_ADA', tab + ' "' + kunci + '" tidak ditemukan di database.');
  }
  function besarSheet(tab) { return sheet(tab); }
  function besarBarisKe(tab, r) { var h = header(tab); return keObjek(h, sheet(tab).getRange(r, 1, 1, h.length).getValues()[0], r); }
  /** Semua baris tab besar yang kolomnya = nilai (TextFinder; dipakai riwayat satu kontrak). */
  function besarCari(tab, kolom, nilai) {
    var sh = sheet(tab), lr = sh.getLastRow(), h = header(tab), c = h.indexOf(kolom) + 1, out = [];
    if (lr < 2 || !c) return out;
    sh.getRange(2, c, lr - 1, 1).createTextFinder(String(nilai)).matchEntireCell(true).findAll().forEach(function (cell) {
      var o = besarBarisKe(tab, cell.getRow()); if (o[kolom] === String(nilai)) out.push(o);
    });
    return out;
  }
  function nomorAkhir(tab) {
    if (BESAR[tab].key) return indeks(tab).n;
    if (_idx[tab]) return _idx[tab].n;
    var c = Number(cache().get('n:' + tab));
    _idx[tab] = { m: {}, n: c || Math.max(sheet(tab).getLastRow(), 1) };
    return _idx[tab].n;
  }
  /** Tambah banyak baris sekaligus (satu kali tulis). */
  function besarTambah(tab, list) {
    if (!list.length) return;
    var h = header(tab), sh = sheet(tab), r = nomorAkhir(tab) + 1, b = BESAR[tab];
    var vals = list.map(function (o) { return barisNilai(h, isiOtomatis(h, o)); });
    pastikanBaris(tab, sh, r + vals.length - 1, h.length);
    sh.getRange(r, 1, vals.length, h.length).setValues(vals);
    var x = _idx[tab];
    if (b.key) { var kc = h.indexOf(b.key); vals.forEach(function (v, i) { x.m[v[kc]] = r + i; }); }
    x.n = r + vals.length - 1;
    if (b.key) simpanIndeks(tab); else cache().put('n:' + tab, String(x.n), CACHE_LAMA);
  }
  /** Ganti seluruh isi tab besar (dipakai pindah arsip & hitung ulang massal). */
  function besarGantiSemua(tab, list) {
    var sh = sheet(tab), h = header(tab), lr = sh.getLastRow();
    if (lr > 1) sh.getRange(2, 1, lr - 1, h.length).clearContent();
    if (list.length) { pastikanBaris(tab, sh, list.length + 1, h.length); sh.getRange(2, 1, list.length, h.length).setValues(list.map(function (o) { return barisNilai(h, o); })); }
    lupakan(tab);
  }
  /** Tulis satu blok kolom (berurutan) untuk semua baris — hemat untuk hitung ulang turunan massal. */
  function besarTulisKolom(tab, kolomPertama, nilai2d) {
    if (!nilai2d.length) return;
    var c = header(tab).indexOf(kolomPertama) + 1;
    sheet(tab).getRange(2, c, nilai2d.length, nilai2d[0].length).setValues(nilai2d);
  }

  // ---------- file lain: arsip & log ----------
  function idFile(kunci) { return meta('FILE_' + kunci); }
  function bukaFile(kunci, buat) {
    if (_file[kunci]) return _file[kunci];
    var id = idFile(kunci);
    if (id) { _file[kunci] = SpreadsheetApp.openById(id); return _file[kunci]; }
    if (!buat) return null;
    var f = SpreadsheetApp.create('SKM_' + kunci);
    setMeta('FILE_' + kunci, f.getId());
    _file[kunci] = f;
    return f;
  }
  function tabFile(f, tab, kolom, buat) {
    var sh = f.getSheetByName(tab);
    if (sh || !buat) return sh;
    var kosong = f.getSheets().filter(function (x) { return x.getLastRow() === 0 && /^(Sheet|Lembar)\d*$/.test(x.getName()); })[0];
    sh = kosong || f.insertSheet(tab);
    if (kosong) sh.setName(tab);
    if (sh.getMaxColumns() < kolom.length) sh.insertColumnsAfter(sh.getMaxColumns(), kolom.length - sh.getMaxColumns());
    sh.getRange(1, 1, sh.getMaxRows(), kolom.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, kolom.length).setValues([kolom]);
    sh.setFrozenRows(1);
    return sh;
  }
  function tambahKeFile(f, kunciFile, tab, kolom, vals) {
    if (!vals.length) return;
    var sh = tabFile(f, tab, kolom, true), ck = 'n:' + kunciFile + ':' + tab, r = (Number(cache().get(ck)) || sh.getLastRow() || 1) + 1;
    pastikanBaris(kunciFile + ':' + tab, sh, r + vals.length - 1, kolom.length);
    sh.getRange(r, 1, vals.length, kolom.length).setValues(vals);
    cache().put(ck, String(r + vals.length - 1), CACHE_LAMA);
  }

  // ---------- Log per bulan (§4.3) ----------
  /** Log ditampung dulu, lalu ditulis sekaligus oleh flushLog() di akhir permintaan. */
  function tulisLog(e) {
    _logBuf.push({ Timestamp: sekarang(), Username: e.user || 'sistem', Aksi: e.aksi, Entitas: e.entitas || '', EntitasID: e.id || '',
                   Field: e.field || '', NilaiLama: e.lama || '', NilaiBaru: e.baru || '', Catatan: e.catatan || '', Hasil: e.hasil || 'BERHASIL' });
  }
  function flushLog() {
    if (!_logBuf.length) return;
    var buf = _logBuf, lock = LockService.getScriptLock(), punya = lock.hasLock();
    _logBuf = [];
    if (!punya && !lock.tryLock(30000)) { console.error('Log tidak tertulis (kunci tidak didapat): ' + JSON.stringify(buf)); return; }
    try {
      var per = {};
      buf.forEach(function (o) { var ym = o.Timestamp.slice(0, 7); (per[ym] = per[ym] || []).push(barisNilai(KOL_LOG, o)); });
      Object.keys(per).forEach(function (ym) { var k = 'LOG_' + ym.slice(0, 4); tambahKeFile(bukaFile(k, true), k, 'Log-' + ym, KOL_LOG, per[ym]); });
    } finally { if (!punya) lock.releaseLock(); }
  }
  function logBulan(ym) {
    var f = bukaFile('LOG_' + ym.slice(0, 4), false), sh = f && f.getSheetByName('Log-' + ym);
    return sh ? bacaSemua(sh).rows : [];
  }
  /** Log yang EntitasID-nya diawali prefix (mis. "K-000123") di beberapa bulan, lewat TextFinder. */
  function logEntitas(prefix, bulan) {
    var out = [];
    bulan.forEach(function (ym) {
      var f = bukaFile('LOG_' + ym.slice(0, 4), false), sh = f && f.getSheetByName('Log-' + ym);
      if (!sh || sh.getLastRow() < 2) return;
      sh.getRange(2, 5, sh.getLastRow() - 1, 1).createTextFinder(prefix).matchEntireCell(false).findAll().forEach(function (c) {
        out.push(keObjek(KOL_LOG, sh.getRange(c.getRow(), 1, 1, KOL_LOG.length).getValues()[0]));
      });
    });
    return out;
  }
  function daftarBulanLog() {
    var c = cache().get('bulanLog'); if (c) return JSON.parse(c);
    var out = [];
    semua('_Meta').forEach(function (m) {
      if (!/^FILE_LOG_\d{4}$/.test(m.Key)) return;
      try { SpreadsheetApp.openById(m.Nilai).getSheets().forEach(function (sh) { var n = sh.getName(); if (/^Log-\d{4}-\d{2}$/.test(n)) out.push(n.slice(4)); }); } catch (e) { /* file hilang */ }
    });
    out = out.sort().reverse();
    cache().put('bulanLog', JSON.stringify(out), 3600);
    return out;
  }

  // ---------- arsip tahunan (§4.3) ----------
  function kolomKid(h, tab) { return h.indexOf(BESAR[tab].kid); }
  /**
   * Pindahkan kontrak ke arsip. pindah: { KontrakID: tahunClose }. Semua tab ditulis ulang sekali per tab.
   * Mengembalikan jumlah baris yang dipindah.
   */
  function arsipPindah(pindah) {
    var ids = Object.keys(pindah); if (!ids.length) return 0;
    var n = 0;
    TAB_ARSIP.forEach(function (tab) {
      var x = bacaSemua(sheet(tab)), kc = BESAR[tab].kid, per = {}, sisa = [];
      x.rows.forEach(function (o) { var th = pindah[o[kc]]; if (th) (per[th] = per[th] || []).push(o); else sisa.push(o); });
      Object.keys(per).forEach(function (th) {
        var list = per[th].sort(function (a, b) { return a[kc] < b[kc] ? -1 : a[kc] > b[kc] ? 1 : 0; });   // baris satu kontrak berurutan
        tambahKeFile(bukaFile('ARSIP_' + th, true), 'ARSIP_' + th, tab, KOL_DATA[tab], list.map(function (o) { return barisNilai(KOL_DATA[tab], o); }));
        n += list.length;
      });
      if (Object.keys(per).length) besarGantiSemua(tab, sisa);
    });
    aturLokasi(pindah, function (th) { return 'ARSIP_' + th; });
    return n;
  }
  /** Ubah kolom Lokasi Indeks untuk kontrak di peta {KontrakID: x}; satu kali tulis kolom. */
  function aturLokasi(peta, nilai) {
    var ix = bacaSemua(sheet('Indeks')), maks = 1;
    ix.rows.forEach(function (o) { maks = Math.max(maks, o._row); });
    var col = []; for (var i = 2; i <= maks; i++) col.push(['']);
    ix.rows.forEach(function (o) { col[o._row - 2][0] = peta[o.KontrakID] !== undefined ? nilai(peta[o.KontrakID]) : o.Lokasi; });
    if (col.length) besarTulisKolom('Indeks', 'Lokasi', col);
  }
  function arsipBaris(f, tab, kid) {
    var sh = f.getSheetByName(tab);
    if (!sh || sh.getLastRow() < 2) return { sh: sh, rows: [], nomor: [] };
    var c = KOL_DATA[tab].indexOf(BESAR[tab].kid) + 1, hit = sh.getRange(2, c, sh.getLastRow() - 1, 1).createTextFinder(kid).matchEntireCell(true).findAll();
    if (!hit.length) return { sh: sh, rows: [], nomor: [] };
    var r1 = hit[0].getRow(), r2 = hit[hit.length - 1].getRow(), v = sh.getRange(r1, 1, r2 - r1 + 1, KOL_DATA[tab].length).getValues(), rows = [], nomor = [];
    v.forEach(function (row, i) { if (String(row[c - 1]) === kid) { rows.push(keObjek(KOL_DATA[tab], row)); nomor.push(r1 + i); } });
    return { sh: sh, rows: rows, nomor: nomor };
  }
  /** Ambil satu kontrak dari file arsipnya (hanya baca). */
  function arsipAmbil(kid, lokasi) {
    var f = bukaFile(lokasi, false);
    if (!f) throw galat('TIDAK_ADA', 'File arsip ' + lokasi + ' tidak ditemukan.');
    var out = {};
    TAB_ARSIP.forEach(function (tab) { out[tab] = arsipBaris(f, tab, kid).rows; });
    return out;
  }
  /** Keluarkan kontrak dari arsip ke SKM_DB (reopen). Baris di arsip dihapus, Indeks → AKTIF. */
  function arsipKeluarkan(kid, lokasi) {
    var f = bukaFile(lokasi, false);
    if (!f) throw galat('TIDAK_ADA', 'File arsip ' + lokasi + ' tidak ditemukan.');
    var out = {};
    TAB_ARSIP.forEach(function (tab) {
      var x = arsipBaris(f, tab, kid);
      out[tab] = x.rows;
      if (!x.rows.length) return;
      besarTambah(tab, x.rows);
      x.nomor.slice().reverse().forEach(function (r) { x.sh.deleteRow(r); });
      cache().remove('n:' + lokasi + ':' + tab);
    });
    if (!out.Kontrak.length) throw galat('TIDAK_ADA', 'Kontrak ' + kid + ' tidak ditemukan di ' + lokasi + '.');
    return out;
  }

  // ---------- feed perubahan & snapshot (§4.4) ----------
  function seq() { return Number(props().getProperty('FEED_SEQ') || 0); }
  /** Catat perubahan untuk browser lain. entri: {bundle} atau {muatUlang: true}. Panggil di dalam kunci. */
  function feedTambah(entri) {
    var n = seq() + 1;
    props().setProperty('FEED_SEQ', String(n));
    entri.seq = n;
    cachePut('feed:' + n, entri, CACHE_LAMA);
    if (entri.muatUlang) cache().remove('snap');
    return n;
  }
  function feedAmbil(sejak) {
    var kini = seq();
    sejak = Number(sejak) || 0;
    if (sejak >= kini) return { seq: kini, entri: [] };
    if (kini - sejak > 200) return { seq: kini, muatUlang: true };
    var out = [];
    for (var i = sejak + 1; i <= kini; i++) { var e = cacheGet('feed:' + i); if (!e) return { seq: kini, muatUlang: true }; out.push(e); }
    return { seq: kini, entri: out };
  }
  function kompak(rows, kolom) { return { c: kolom, r: rows.map(function (o) { return barisNilai(kolom, o); }) }; }
  /** Data aktif untuk browser: dari cache bila masih segar, selain itu dibaca dari sheet. */
  function snapshot() {
    var kini = seq(), c = cacheGet('snap');
    if (c && c.skema === APP.SKEMA && kini - c.seq <= 150) return c;
    var t0 = kini, data = {};
    ['Kontrak', 'BAST', 'OrderInternal', 'Kendala'].forEach(function (tab) { data[tab] = kompak(semua(tab), KOL_DATA[tab]); });
    var aktif = {}; data.Kontrak.r.forEach(function (r) { aktif[r[0]] = 1; });
    data.KontrakAlias = kompak(semua('KontrakAlias').filter(function (a) { return aktif[a.KontrakID]; }), SKEMA_TAB.KontrakAlias);
    var snap = { seq: t0, skema: APP.SKEMA, dibuat: sekarang(), tabs: data };
    cachePut('snap', snap, 3600);
    return snap;
  }

  // ---------- kunci ----------
  function kunci(fn, tunggu) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(tunggu || 20000)) throw galat('SIBUK', 'Server sedang sibuk. Coba lagi beberapa detik lagi.');
    _memo = {}; _idx = {};   // baca ulang dari cache yang sudah diperbarui permintaan lain sebelum kita mendapat kunci
    try { return fn(); }
    finally { try { flushLog(); } finally { lock.releaseLock(); } }   // log ikut ditulis selagi kunci masih dipegang
  }
  function nomorBaru(jenis) {
    var k = 'SEQ_' + jenis, n = Number(props().getProperty(k) || 0) + 1;
    props().setProperty(k, String(n));
    return n;
  }

  // ---------- config & meta ----------
  function config(key, bawaan) {
    if (!siap()) return bawaan;
    var r = cari('Config', key);
    return r && r.Nilai !== '' ? r.Nilai : bawaan;
  }
  function semuaConfig() { var o = {}; if (siap()) semua('Config').forEach(function (r) { o[r.Key] = r.Nilai; }); return o; }
  function meta(key) { var r = cari('_Meta', key); return r ? r.Nilai : ''; }
  function setMeta(key, nilai) { if (cari('_Meta', key)) ubah('_Meta', key, { Nilai: nilai }); else tambah('_Meta', { Key: key, Nilai: nilai }); }

  // ---------- migrasi ----------
  function kondisiSaatIni() { var k = {}; ss().getSheets().forEach(function (sh) { k[sh.getName()] = headerSheet(sh); }); return k; }

  /** Menjalankan migrasi sampai APP.SKEMA. Mengembalikan daftar teks langkah (untuk log/console). */
  function migrasi(oleh) {
    var catatan = [];
    var langkah = Domain.rencanaMigrasi(SKEMA_TAB, kondisiSaatIni());
    var bawaanAwal = ss().getSheets().filter(function (sh) { return !SKEMA_TAB[sh.getName()] && sh.getLastRow() === 0; });
    langkah.forEach(function (l) {
      if (l.op === 'buatTab') {
        var sh = ss().insertSheet(l.tab);
        if (sh.getMaxColumns() < l.kolom.length) sh.insertColumnsAfter(sh.getMaxColumns(), l.kolom.length - sh.getMaxColumns());
        sh.getRange(1, 1, sh.getMaxRows(), l.kolom.length).setNumberFormat('@');
        sh.getRange(1, 1, 1, l.kolom.length).setValues([l.kolom]);
        sh.setFrozenRows(1);
        catatan.push('Tab ' + l.tab + ' dibuat (' + l.kolom.length + ' kolom)');
      } else {
        var s2 = sheet(l.tab), lc = s2.getLastColumn();
        if (lc + l.kolom.length > s2.getMaxColumns()) s2.insertColumnsAfter(s2.getMaxColumns(), lc + l.kolom.length - s2.getMaxColumns());
        s2.getRange(1, lc + 1, s2.getMaxRows(), l.kolom.length).setNumberFormat('@');
        s2.getRange(1, lc + 1, 1, l.kolom.length).setValues([l.kolom]);
        catatan.push('Tab ' + l.tab + ': kolom ditambah ' + l.kolom.join(', '));
      }
      _memo = {}; _hdr = {}; _max = {}; _idx = {};
    });
    bawaanAwal.forEach(function (sh) { if (ss().getSheets().length > 1) ss().deleteSheet(sh); });
    Object.keys(SKEMA_TAB).forEach(function (t) { lupakan(t); });

    // isi awal hanya bila kosong
    if (!semua('Ref_Role').length) {
      Object.keys(ROLE_AWAL).forEach(function (r) { tambah('Ref_Role', { Role: r, Izin: ROLE_AWAL[r].join(','), UpdatedBy: oleh }); });
      catatan.push('Isi awal Ref_Role: ' + Object.keys(ROLE_AWAL).map(function (r) { return r + ' (' + ROLE_AWAL[r].length + ' izin)'; }).join(', '));
    } else if (!meta('IZIN_IMPORT_F3')) {
      // F3: Upload Excel & import pindah ke izin kontrak.import, diberikan ke role admin (yang punya user.kelola) saja.
      semua('Ref_Role').forEach(function (r) {
        var iz = Domain.parseIzin(r.Izin);
        if (iz.indexOf('user.kelola') >= 0 && iz.indexOf('kontrak.import') < 0) { iz.push('kontrak.import'); ubah('Ref_Role', r.Role, { Izin: iz.join(',') }, oleh); catatan.push('Role ' + r.Role + ': izin kontrak.import ditambahkan'); }
      });
    }
    if (!meta('IZIN_IMPORT_F3')) setMeta('IZIN_IMPORT_F3', sekarang());
    Object.keys(REF_AWAL).forEach(function (tab) {
      if (semua(tab).length) return;
      gantiSemua(tab, REF_AWAL[tab].map(function (o) { var x = {}; for (var k in o) x[k] = o[k]; x.UpdatedBy = oleh; return x; }));
      catatan.push('Isi awal ' + tab + ' (' + REF_AWAL[tab].length + ')');
    });
    var adaConfig = semua('Config').map(function (r) { return r.Key; }), cfgBaru = [];
    CONFIG_AWAL.forEach(function (c) {
      if (adaConfig.indexOf(c[0]) < 0) { tambah('Config', { Key: c[0], Nilai: c[1], Keterangan: c[2], UpdatedBy: oleh }); cfgBaru.push(c[0] + '=' + c[1]); }
    });
    if (cfgBaru.length) catatan.push('Isi awal Config: ' + cfgBaru.join(', '));

    // F1 menyimpan Log di SKM_DB; sejak F2 Log per bulan di SKM_LOG_<tahun>. Salin sekali; tab lama dibiarkan sebagai cadangan.
    var lama = ss().getSheetByName('Log');
    if (lama && !meta('LOG_F1_DISALIN')) {
      var rows = bacaSemua(lama).rows, per = {};
      rows.forEach(function (o) { var ym = String(o.Timestamp).slice(0, 7); if (/^\d{4}-\d{2}$/.test(ym)) (per[ym] = per[ym] || []).push(barisNilai(KOL_LOG, o)); });
      Object.keys(per).sort().forEach(function (ym) { var k = 'LOG_' + ym.slice(0, 4); tambahKeFile(bukaFile(k, true), k, 'Log-' + ym, KOL_LOG, per[ym]); });
      setMeta('LOG_F1_DISALIN', sekarang() + ' (' + rows.length + ' baris)');
      catatan.push('Log F1 disalin ke file Log per bulan (' + rows.length + ' baris); tab Log lama di SKM_DB dibiarkan sebagai cadangan');
    }

    var dari = Domain.num(meta('SKEMA_VERSI'), 0);
    if (dari < APP.SKEMA || langkah.length) {
      if (!meta('DB_DIBUAT')) setMeta('DB_DIBUAT', sekarang());
      setMeta('SKEMA_VERSI', String(APP.SKEMA));
      var riwayat = []; try { riwayat = JSON.parse(meta('RIWAYAT_MIGRASI') || '[]'); } catch (e) { riwayat = []; }
      riwayat.push({ waktu: sekarang(), dari: dari, ke: APP.SKEMA, oleh: oleh, langkah: catatan.length ? catatan : ['tidak ada perubahan struktur'] });
      setMeta('RIWAYAT_MIGRASI', JSON.stringify(riwayat));
      tulisLog({ user: 'sistem', aksi: 'MIGRASI_SKEMA', entitas: '_Meta', id: 'v' + dari + ' → v' + APP.SKEMA, catatan: catatan.join('; ') || 'tanpa perubahan struktur' });
    }
    props().setProperty('SKEMA_TERPASANG', String(APP.SKEMA));
    cache().remove('snap');
    return catatan;
  }

  /** Dipanggil setiap aplikasi dibuka: migrasi hanya berjalan bila versi skema kode lebih baru. Murah: cek properti saja. */
  function pastikanMigrasi() {
    if (!siap()) return false;
    if (Domain.num(props().getProperty('SKEMA_TERPASANG'), 0) >= APP.SKEMA) return false;
    kunci(function () { if (Domain.num(props().getProperty('SKEMA_TERPASANG'), 0) < APP.SKEMA) migrasi('otomatis'); }, 60000);
    return true;
  }

  function buatDatabase() {
    var f = SpreadsheetApp.create(APP.NAMA_DB);
    props().setProperty('DB_ID', f.getId());
    _ss = f; _memo = {}; _hdr = {}; _max = {}; _idx = {}; _file = {};
    return f;
  }

  function aksesFile(f) {
    var editors = [], viewers = [];
    try { editors = f.getEditors().map(function (u) { return u.getEmail(); }); viewers = f.getViewers().map(function (u) { return u.getEmail(); }); } catch (e) { /* tanpa izin: abaikan */ }
    var akses = [];   // gabungan unik: pemilik bisa muncul di daftar editor dan viewer sekaligus
    editors.concat(viewers).forEach(function (e) { e = String(e || '').toLowerCase(); if (e && akses.indexOf(e) < 0) akses.push(e); });
    return { editors: editors, viewers: viewers, akses: akses };
  }
  /** Info file database. ringan=true (halaman Sistem): jumlah baris di-cache 10 menit, akses file arsip/log tidak dibuka. */
  function infoDatabase(ringan) {
    var f = ss(), tabs = ringan ? JSON.parse(cache().get('infoTabs') || 'null') : null;
    if (!tabs) { tabs = f.getSheets().map(function (sh) { return { tab: sh.getName(), baris: Math.max(sh.getLastRow() - 1, 0) }; }); cache().put('infoTabs', JSON.stringify(tabs), 600); }
    var a = aksesFile(f), files = [];
    semua('_Meta').forEach(function (m) {
      if (!/^FILE_/.test(m.Key)) return;
      var info = { kunci: m.Key.slice(5), nama: 'SKM_' + m.Key.slice(5), akses: [] };
      if (!ringan) { try { var g = SpreadsheetApp.openById(m.Nilai); info.nama = g.getName(); info.akses = aksesFile(g).akses; } catch (e) { info.hilang = true; } }
      files.push(info);
    });
    return { nama: f.getName(), tabs: tabs, editors: a.editors, viewers: a.viewers, akses: a.akses, files: files };
  }

  return {
    SKEMA_TAB: SKEMA_TAB, KOL_DATA: KOL_DATA, KOL_LOG: KOL_LOG, BESAR: BESAR, galat: galat, sekarang: sekarang, siap: siap,
    semua: semua, cari: cari, tambah: tambah, ubah: ubah, hapus: hapus, gantiSemua: gantiSemua, header: header,
    besarBaca: besarBaca, besarSheet: besarSheet, besarBarisKe: besarBarisKe, besarCari: besarCari, besarTulis: besarTulis, besarTambah: besarTambah, besarGantiSemua: besarGantiSemua, besarTulisKolom: besarTulisKolom, lupakan: lupakan,
    tulisLog: tulisLog, flushLog: flushLog, logBulan: logBulan, logEntitas: logEntitas, daftarBulanLog: daftarBulanLog,
    arsipPindah: arsipPindah, aturLokasi: aturLokasi, arsipAmbil: arsipAmbil, arsipKeluarkan: arsipKeluarkan, idFile: idFile,
    seq: seq, feedTambah: feedTambah, feedAmbil: feedAmbil, snapshot: snapshot, cacheGet: cacheGet, cachePut: cachePut,
    kunci: kunci, nomorBaru: nomorBaru, config: config, semuaConfig: semuaConfig, meta: meta, setMeta: setMeta,
    migrasi: migrasi, pastikanMigrasi: pastikanMigrasi, buatDatabase: buatDatabase, infoDatabase: infoDatabase,
    _reset: function () { _ss = null; _memo = {}; _hdr = {}; _max = {}; _logBuf = []; _file = {}; _idx = {}; }
  };
})();
