/**
 * Repo: SATU-SATUNYA modul yang menyentuh database (§3.4). Database = file Google Sheet milik akun FF.
 * Semua nilai disimpan sebagai teks (format sel "@") supaya Sheets tidak mengubah NIK/tanggal secara otomatis.
 */
var Repo = (function () {

  // Skema versi terbaru. Migrasi hanya MENAMBAH tab/kolom (§3.3).
  var SKEMA_TAB = {
    _Meta: ['Key', 'Nilai'],
    Users: ['Username', 'Nama', 'AliasPIC', 'Role', 'PasswordHash', 'Salt', 'Aktif', 'WajibGantiPassword', 'GagalLogin',
            'TerkunciSampai', 'LoginTerakhir', 'PunyaAktivitas', 'SesiVersi', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'Version'],
    Ref_Role: ['Role', 'Izin', 'UpdatedAt', 'UpdatedBy'],
    Log: ['Timestamp', 'Username', 'Aksi', 'Entitas', 'EntitasID', 'Field', 'NilaiLama', 'NilaiBaru', 'Catatan', 'Hasil'],
    Config: ['Key', 'Nilai', 'Keterangan', 'UpdatedAt', 'UpdatedBy']
  };
  var KUNCI = { _Meta: 'Key', Users: 'Username', Ref_Role: 'Role', Config: 'Key' };
  var TANPA_CACHE = { Log: true };
  var CACHE_DETIK = 300;

  var _ss = null, _memo = {}, _hdr = {}, _max = {}, _logBuf = [];

  function galat(kode, pesan) { var e = new Error(pesan); e.kode = kode; return e; }
  function sekarang() { return Utilities.formatDate(new Date(), APP.TZ, 'yyyy-MM-dd HH:mm:ss'); }
  function props() { return PropertiesService.getScriptProperties(); }
  function dbId() { return props().getProperty('DB_ID'); }
  function siap() { return !!dbId(); }

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
  function cache() { return CacheService.getScriptCache(); }
  /** Simpan isi tab terbaru ke cache (write-through), supaya permintaan berikutnya tidak membaca ulang sheet. */
  function simpanCache(tab) {
    if (TANPA_CACHE[tab] || !_memo[tab]) return;
    try { cache().put('tab:' + tab, JSON.stringify(_memo[tab]), CACHE_DETIK); } catch (e) { cache().remove('tab:' + tab); }
  }
  function lupakan(tab) { delete _memo[tab]; delete _hdr[tab]; delete _max[tab]; cache().remove('hdr:' + tab); if (!TANPA_CACHE[tab]) cache().remove('tab:' + tab); }

  // ---------- baca ----------
  function headerSheet(sh) {
    var lc = sh.getLastColumn();
    return lc ? sh.getRange(1, 1, 1, lc).getValues()[0].map(String) : [];
  }
  /** Judul kolom: memo → cache (6 jam; dibuang saat migrasi) → sheet. */
  function header(tab) {
    if (_hdr[tab]) return _hdr[tab];
    var c = cache().get('hdr:' + tab);
    if (c) { _hdr[tab] = JSON.parse(c); return _hdr[tab]; }
    _hdr[tab] = headerSheet(sheet(tab));
    if (_hdr[tab].length) cache().put('hdr:' + tab, JSON.stringify(_hdr[tab]), 21600);
    return _hdr[tab];
  }
  function semua(tab) {
    if (_memo[tab]) return _memo[tab];
    if (!TANPA_CACHE[tab]) {
      var c = cache().get('tab:' + tab);
      if (c) { _memo[tab] = JSON.parse(c); return _memo[tab]; }
    }
    var sh = sheet(tab), v = sh.getDataRange().getValues(), h = (v[0] || []).map(String), rows = [];
    _hdr[tab] = h;
    for (var i = 1; i < v.length; i++) {
      var o = { _row: i + 1 };
      for (var j = 0; j < h.length; j++) o[h[j]] = v[i][j] === null || v[i][j] === undefined ? '' : String(v[i][j]);
      rows.push(o);
    }
    _memo[tab] = rows;
    simpanCache(tab);
    return rows;
  }
  function cari(tab, kunci) {
    var k = KUNCI[tab], rows = semua(tab);
    for (var i = 0; i < rows.length; i++) if (rows[i][k] === String(kunci)) return rows[i];
    return null;
  }

  // ---------- tulis (panggil di dalam kunci(...)) ----------
  function barisNilai(h, obj) { return h.map(function (c) { var v = obj[c]; return v === undefined || v === null ? '' : String(v); }); }

  /** Sheet bawaan hanya 1.000 baris: tambah baris berformat teks bila penulisan melewati batas. */
  function pastikanBaris(tab, sh, sampai) {
    if (_max[tab] === undefined) _max[tab] = sh.getMaxRows();
    if (sampai <= _max[tab]) return;
    var n = Math.max(1000, sampai - _max[tab]);
    sh.insertRowsAfter(_max[tab], n);
    sh.getRange(_max[tab] + 1, 1, n, Math.max(sh.getMaxColumns(), header(tab).length)).setNumberFormat('@');
    _max[tab] += n;
  }

  function tambah(tab, obj) {
    var rows = semua(tab), h = header(tab), now = sekarang(), o = {}, r = 2;
    for (var k in obj) o[k] = obj[k];
    if (h.indexOf('Version') >= 0 && !o.Version) o.Version = '1';
    if (h.indexOf('CreatedAt') >= 0 && !o.CreatedAt) o.CreatedAt = now;
    if (h.indexOf('UpdatedAt') >= 0 && !o.UpdatedAt) o.UpdatedAt = now;
    rows.forEach(function (x) { if (x._row >= r) r = x._row + 1; });
    var sh = sheet(tab);
    pastikanBaris(tab, sh, r);
    var nilai = barisNilai(h, o);
    sh.getRange(r, 1, 1, h.length).setValues([nilai]);
    var simpan = { _row: r };
    h.forEach(function (c, i) { simpan[c] = nilai[i]; });
    rows.push(simpan);
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
    sheet(tab).getRange(lama._row, 1, 1, h.length).setValues([barisNilai(h, baru)]);
    var rows = semua(tab), i = rows.indexOf(lama);
    if (i >= 0) rows[i] = baru;
    simpanCache(tab);
    return baru;
  }

  function hapus(tab, kunci) {
    var lama = cari(tab, kunci);
    if (!lama) throw galat('TIDAK_ADA', tab + ' "' + kunci + '" tidak ditemukan.');
    sheet(tab).deleteRow(lama._row);
    if (_max[tab] !== undefined) _max[tab]--;
    var rows = semua(tab), i = rows.indexOf(lama);
    if (i >= 0) { rows.splice(i, 1); for (var j = i; j < rows.length; j++) rows[j]._row--; }
    simpanCache(tab);
  }

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
      var sh = sheet('Log'), h = header('Log'), r = sh.getLastRow() + 1;
      pastikanBaris('Log', sh, r + buf.length - 1);
      sh.getRange(r, 1, buf.length, h.length).setValues(buf.map(function (o) { return barisNilai(h, o); }));
    } finally { if (!punya) lock.releaseLock(); }
    delete _memo.Log;
  }

  function kunci(fn) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw galat('SIBUK', 'Server sedang sibuk. Coba lagi beberapa detik lagi.');
    _memo = {};   // baca ulang dari cache yang sudah diperbarui permintaan lain sebelum kita mendapat kunci
    try { return fn(); }
    finally { try { flushLog(); } finally { lock.releaseLock(); } }   // log ikut ditulis selagi kunci masih dipegang
  }

  // ---------- config & meta ----------
  function config(key, bawaan) {
    if (!siap()) return bawaan;
    var r = cari('Config', key);
    return r && r.Nilai !== '' ? r.Nilai : bawaan;
  }
  function meta(key) { var r = cari('_Meta', key); return r ? r.Nilai : ''; }
  function setMeta(key, nilai) { if (cari('_Meta', key)) ubah('_Meta', key, { Nilai: nilai }); else tambah('_Meta', { Key: key, Nilai: nilai }); }

  // ---------- migrasi ----------
  function kondisiSaatIni() {
    var k = {};
    ss().getSheets().forEach(function (sh) { k[sh.getName()] = headerSheet(sh); });
    return k;
  }

  /** Menjalankan migrasi sampai APP.SKEMA. Mengembalikan daftar teks langkah (untuk log/console). */
  function migrasi(oleh) {
    var catatan = [];
    var langkah = Domain.rencanaMigrasi(SKEMA_TAB, kondisiSaatIni());
    var bawaanAwal = ss().getSheets().filter(function (sh) { return !SKEMA_TAB[sh.getName()] && sh.getLastRow() === 0; });
    langkah.forEach(function (l) {
      if (l.op === 'buatTab') {
        var sh = ss().insertSheet(l.tab);
        sh.getRange(1, 1, Math.max(sh.getMaxRows(), 2), Math.max(sh.getMaxColumns(), l.kolom.length)).setNumberFormat('@');
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
      _memo = {}; _hdr = {}; _max = {};
    });
    // sheet kosong bawaan file baru (mis. "Sheet1") dibuang setelah tab kita ada
    bawaanAwal.forEach(function (sh) { if (ss().getSheets().length > 1) ss().deleteSheet(sh); });
    Object.keys(SKEMA_TAB).forEach(function (t) { lupakan(t); });

    // isi awal hanya bila kosong
    if (!semua('Ref_Role').length) {
      Object.keys(ROLE_AWAL).forEach(function (r) { tambah('Ref_Role', { Role: r, Izin: ROLE_AWAL[r].join(','), UpdatedBy: oleh }); });
      catatan.push('Isi awal Ref_Role: ' + Object.keys(ROLE_AWAL).map(function (r) { return r + ' (' + ROLE_AWAL[r].length + ' izin)'; }).join(', '));
    }
    var adaConfig = semua('Config').map(function (r) { return r.Key; }), cfgBaru = [];
    CONFIG_AWAL.forEach(function (c) {
      if (adaConfig.indexOf(c[0]) < 0) { tambah('Config', { Key: c[0], Nilai: c[1], Keterangan: c[2], UpdatedBy: oleh }); cfgBaru.push(c[0] + '=' + c[1]); }
    });
    if (cfgBaru.length) catatan.push('Isi awal Config: ' + cfgBaru.join(', '));

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
    return catatan;
  }

  /** Dipanggil setiap aplikasi dibuka: migrasi hanya berjalan bila versi skema kode lebih baru. Murah: cek properti saja. */
  function pastikanMigrasi() {
    if (!siap()) return false;
    if (Domain.num(props().getProperty('SKEMA_TERPASANG'), 0) >= APP.SKEMA) return false;
    kunci(function () { if (Domain.num(props().getProperty('SKEMA_TERPASANG'), 0) < APP.SKEMA) migrasi('otomatis'); });
    return true;
  }

  function buatDatabase() {
    var f = SpreadsheetApp.create(APP.NAMA_DB);
    props().setProperty('DB_ID', f.getId());
    _ss = f; _memo = {}; _hdr = {}; _max = {};
    return f;
  }

  function infoDatabase() {
    var f = ss(), tabs = f.getSheets().map(function (sh) { return { tab: sh.getName(), baris: Math.max(sh.getLastRow() - 1, 0) }; });
    var editors = [], viewers = [];
    try { editors = f.getEditors().map(function (u) { return u.getEmail(); }); viewers = f.getViewers().map(function (u) { return u.getEmail(); }); } catch (e) { /* tanpa izin: abaikan */ }
    var akses = [];   // gabungan unik: pemilik bisa muncul di daftar editor dan viewer sekaligus
    editors.concat(viewers).forEach(function (e) { e = String(e || '').toLowerCase(); if (e && akses.indexOf(e) < 0) akses.push(e); });
    return { nama: f.getName(), tabs: tabs, editors: editors, viewers: viewers, akses: akses };
  }

  return {
    SKEMA_TAB: SKEMA_TAB, galat: galat, sekarang: sekarang, siap: siap, semua: semua, cari: cari, tambah: tambah, ubah: ubah,
    hapus: hapus, tulisLog: tulisLog, flushLog: flushLog, kunci: kunci, config: config, meta: meta, migrasi: migrasi, pastikanMigrasi: pastikanMigrasi,
    buatDatabase: buatDatabase, infoDatabase: infoDatabase, _reset: function () { _ss = null; _memo = {}; _hdr = {}; _max = {}; _logBuf = []; }
  };
})();
