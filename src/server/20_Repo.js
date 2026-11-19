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

  var _ss = null, _memo = {};

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
  function lupakan(tab) { delete _memo[tab]; if (!TANPA_CACHE[tab]) cache().remove('tab:' + tab); }

  // ---------- baca ----------
  function header(sh) {
    var lc = sh.getLastColumn();
    return lc ? sh.getRange(1, 1, 1, lc).getValues()[0].map(String) : [];
  }
  function semua(tab) {
    if (_memo[tab]) return _memo[tab];
    if (!TANPA_CACHE[tab]) {
      var c = cache().get('tab:' + tab);
      if (c) { _memo[tab] = JSON.parse(c); return _memo[tab]; }
    }
    var sh = sheet(tab), v = sh.getDataRange().getValues(), h = (v[0] || []).map(String), rows = [];
    for (var i = 1; i < v.length; i++) {
      var o = { _row: i + 1 };
      for (var j = 0; j < h.length; j++) o[h[j]] = v[i][j] === null || v[i][j] === undefined ? '' : String(v[i][j]);
      rows.push(o);
    }
    _memo[tab] = rows;
    if (!TANPA_CACHE[tab]) { try { cache().put('tab:' + tab, JSON.stringify(rows), CACHE_DETIK); } catch (e) { /* terlalu besar untuk cache: lewati */ } }
    return rows;
  }
  function cari(tab, kunci) {
    var k = KUNCI[tab], rows = semua(tab);
    for (var i = 0; i < rows.length; i++) if (rows[i][k] === String(kunci)) return rows[i];
    return null;
  }

  // ---------- tulis (panggil di dalam kunci(...)) ----------
  function barisNilai(h, obj) { return h.map(function (c) { var v = obj[c]; return v === undefined || v === null ? '' : String(v); }); }

  function tambah(tab, obj) {
    var sh = sheet(tab), h = header(sh), now = sekarang(), o = {};
    for (var k in obj) o[k] = obj[k];
    if (h.indexOf('Version') >= 0 && !o.Version) o.Version = '1';
    if (h.indexOf('CreatedAt') >= 0 && !o.CreatedAt) o.CreatedAt = now;
    if (h.indexOf('UpdatedAt') >= 0 && !o.UpdatedAt) o.UpdatedAt = now;
    var r = sh.getLastRow() + 1;
    sh.getRange(r, 1, 1, h.length).setNumberFormat('@').setValues([barisNilai(h, o)]);
    lupakan(tab);
    return o;
  }

  /** Ubah baris berdasarkan kunci. versi (opsional) mencegah saling timpa (§7). */
  function ubah(tab, kunci, patch, oleh, versi) {
    var lama = cari(tab, kunci);
    if (!lama) throw galat('TIDAK_ADA', tab + ' "' + kunci + '" tidak ditemukan.');
    var sh = sheet(tab), h = header(sh);
    if (versi !== undefined && versi !== null && h.indexOf('Version') >= 0 && String(versi) !== String(lama.Version)) {
      throw galat('KONFLIK', 'Data ini baru saja diubah orang lain. Muat ulang lalu coba lagi.');
    }
    var baru = {};
    for (var k in lama) baru[k] = lama[k];
    for (var p in patch) baru[p] = patch[p];
    if (h.indexOf('UpdatedAt') >= 0) baru.UpdatedAt = sekarang();
    if (h.indexOf('UpdatedBy') >= 0 && oleh) baru.UpdatedBy = oleh;
    if (h.indexOf('Version') >= 0) baru.Version = String(Domain.num(lama.Version, 0) + 1);
    sh.getRange(lama._row, 1, 1, h.length).setNumberFormat('@').setValues([barisNilai(h, baru)]);
    lupakan(tab);
    return baru;
  }

  function hapus(tab, kunci) {
    var lama = cari(tab, kunci);
    if (!lama) throw galat('TIDAK_ADA', tab + ' "' + kunci + '" tidak ditemukan.');
    sheet(tab).deleteRow(lama._row);
    lupakan(tab);
  }

  function tulisLog(e) {
    var sh = sheet('Log'), h = header(sh);
    var o = { Timestamp: sekarang(), Username: e.user || 'sistem', Aksi: e.aksi, Entitas: e.entitas || '', EntitasID: e.id || '',
              Field: e.field || '', NilaiLama: e.lama || '', NilaiBaru: e.baru || '', Catatan: e.catatan || '', Hasil: e.hasil || 'BERHASIL' };
    sh.getRange(sh.getLastRow() + 1, 1, 1, h.length).setNumberFormat('@').setValues([barisNilai(h, o)]);
    delete _memo.Log;
  }

  function kunci(fn) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw galat('SIBUK', 'Server sedang sibuk. Coba lagi beberapa detik lagi.');
    try { return fn(); } finally { lock.releaseLock(); }
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
    ss().getSheets().forEach(function (sh) { k[sh.getName()] = header(sh); });
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
        s2.getRange(1, lc + 1, 1, l.kolom.length).setNumberFormat('@').setValues([l.kolom]);
        catatan.push('Tab ' + l.tab + ': kolom ditambah ' + l.kolom.join(', '));
      }
      _memo = {};
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
    _ss = f; _memo = {};
    return f;
  }

  function infoDatabase() {
    var f = ss(), tabs = f.getSheets().map(function (sh) { return { tab: sh.getName(), baris: Math.max(sh.getLastRow() - 1, 0) }; });
    var editors = [], viewers = [];
    try { editors = f.getEditors().map(function (u) { return u.getEmail(); }); viewers = f.getViewers().map(function (u) { return u.getEmail(); }); } catch (e) { /* tanpa izin: abaikan */ }
    return { nama: f.getName(), tabs: tabs, editors: editors, viewers: viewers };
  }

  return {
    SKEMA_TAB: SKEMA_TAB, galat: galat, sekarang: sekarang, siap: siap, semua: semua, cari: cari, tambah: tambah, ubah: ubah,
    hapus: hapus, tulisLog: tulisLog, kunci: kunci, config: config, meta: meta, migrasi: migrasi, pastikanMigrasi: pastikanMigrasi,
    buatDatabase: buatDatabase, infoDatabase: infoDatabase, _reset: function () { _ss = null; _memo = {}; }
  };
})();
