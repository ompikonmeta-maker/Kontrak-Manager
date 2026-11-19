// ===== 00_Config.js =====
/**
 * STATUS KONTRAK MANAGER — server Apps Script.
 * File Code.gs ini HASIL BUILD dari src/server/*.js dan src/ui/*. Jangan diedit langsung;
 * ubah sumbernya lalu jalankan `node tools/build.js`.
 */

// Konstanta kode (bukan nilai bisnis). Nilai bisnis disimpan di database (§3).
var APP = {
  NAMA: 'Status Kontrak Manager',
  VERSI: '1.0.1',
  FASE: 'F1',
  SKEMA: 1,                 // versi skema database yang dibutuhkan kode ini
  TZ: 'Asia/Jakarta',
  NAMA_DB: 'SKM_DB'
};

// Katalog izin: kemampuan yang dicek oleh kode. Pemetaan role → izin ada di tab Ref_Role (data).
var IZIN = [
  ['dashboard.lihat', 'Lihat dashboard'],
  ['kontrak.lihat', 'Lihat kontrak'],
  ['export', 'Export data'],
  ['kontrak.update', 'Update kontrak, BAST, kendala'],
  ['kontrak.daftar', 'Daftarkan kontrak, proses antrian, import'],
  ['kontrak.arsip', 'Arsipkan kontrak'],
  ['pic.atur', 'Atur PIC'],
  ['sinkron.jalankan', 'Jalankan Cek saja / Update ke GSheet'],
  ['target.kelola', 'Kelola target Google Sheet'],
  ['pengaturan.kelola', 'Kelola tahap, kendala, nilai push, referensi, config'],
  ['user.kelola', 'Kelola user, role, dan izin'],
  ['log.semua', 'Lihat log semua user']
];

// Isi awal (hanya dipakai saat tab masih kosong; setelah itu diatur dari aplikasi).
var ROLE_AWAL = {
  ADMIN: IZIN.map(function (x) { return x[0]; }),
  STAFF: ['dashboard.lihat', 'kontrak.lihat', 'export', 'kontrak.update', 'kontrak.daftar'],
  VIEWER: ['dashboard.lihat', 'kontrak.lihat', 'export']
};

var CONFIG_AWAL = [
  ['APP_NAMA', 'Status Kontrak Manager', 'Nama aplikasi'],
  ['SESI_JAM', '6', 'Sesi berakhir bila tidak ada aktivitas selama ini (jam, maks 6)'],
  ['LOGIN_GAGAL_MAKS', '5', 'Batas salah password sebelum akun dikunci'],
  ['KUNCI_MENIT', '15', 'Lama akun terkunci (menit)'],
  ['PASSWORD_MIN', '8', 'Panjang minimal password']
];

// ===== 10_Domain.js =====
/**
 * Domain: aturan bisnis berupa fungsi murni (tanpa Google API) supaya bisa diuji dengan node --test.
 */
var Domain = (function () {

  function bool(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
  function num(v, d) { var n = Number(v); return isFinite(n) && String(v) !== '' ? n : (d === undefined ? 0 : d); }

  // ---------- username & password ----------
  function normUsername(u) { return String(u == null ? '' : u).trim().toLowerCase(); }

  function cekUsername(u) {
    u = normUsername(u);
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(u)) {
      return 'Username 3–32 karakter: huruf, angka, titik, garis bawah, atau strip, dan diawali huruf/angka.';
    }
    return '';
  }

  /** Mengembalikan daftar pelanggaran (kosong = valid). */
  function cekPassword(pw, opt) {
    opt = opt || {};
    var min = num(opt.min, 8), e = [];
    pw = String(pw == null ? '' : pw);
    if (pw.length < min) e.push('Minimal ' + min + ' karakter');
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) e.push('Harus berisi huruf dan angka');
    if (opt.samaDenganLama) e.push('Harus berbeda dari password lama');
    return e;
  }

  var CHARSET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  /** Password acak "xxx-xxx-xxx" dari deret bilangan acak 0..255 (sumber acak disediakan pemanggil). */
  function passwordAcak(bytes) {
    var s = '';
    for (var i = 0; i < 9; i++) {
      if (i && i % 3 === 0) s += '-';
      s += CHARSET[bytes[i] % CHARSET.length];
    }
    if (!/\d/.test(s)) s = s.slice(0, 10) + '7';          // jamin ada angka
    if (!/[A-Za-z]/.test(s)) s = 'k' + s.slice(1);         // jamin ada huruf
    return s;
  }

  // ---------- role & izin ----------
  function parseIzin(str) {
    return String(str || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  }
  /** rows Ref_Role → { ROLE: [izin] } */
  function petaRole(rows) {
    var m = {};
    (rows || []).forEach(function (r) { if (r.Role) m[r.Role] = parseIzin(r.Izin); });
    return m;
  }
  function izinUser(user, peta) { return (peta && user && peta[user.Role]) ? peta[user.Role].slice() : []; }

  function jumlahAdminAktif(users, peta) {
    return (users || []).filter(function (u) {
      return bool(u.Aktif) && (peta[u.Role] || []).indexOf('user.kelola') >= 0;
    }).length;
  }

  /**
   * Apakah perubahan ini membuat tidak ada lagi admin aktif dengan user.kelola?
   * perubahan: { username, role?, aktif?, hapus? } dan/atau { petaBaru }.
   */
  function hilangkanAdminTerakhir(users, peta, perubahan) {
    perubahan = perubahan || {};
    var p2 = perubahan.petaBaru || peta;
    var u2 = (users || []).map(function (u) {
      if (u.Username !== perubahan.username) return u;
      if (perubahan.hapus) return null;
      var c = {}; for (var k in u) c[k] = u[k];
      if (perubahan.role !== undefined) c.Role = perubahan.role;
      if (perubahan.aktif !== undefined) c.Aktif = perubahan.aktif;
      return c;
    }).filter(Boolean);
    return jumlahAdminAktif(users, peta) > 0 && jumlahAdminAktif(u2, p2) === 0;
  }

  /** Validasi peta role baru terhadap katalog izin. */
  function cekPetaRole(peta, katalog) {
    var e = [], valid = katalog.map(function (x) { return x[0]; });
    Object.keys(peta).forEach(function (r) {
      if (!/^[A-Z][A-Z0-9_]{1,31}$/.test(r)) e.push('Nama role "' + r + '" tidak valid (huruf kapital, angka, garis bawah).');
      (peta[r] || []).forEach(function (i) { if (valid.indexOf(i) < 0) e.push('Izin "' + i + '" tidak dikenal.'); });
    });
    return e;
  }

  // ---------- login & kunci akun ----------
  function terkunci(user, nowMs) {
    var t = num(user.TerkunciSampai, 0);
    return t > nowMs ? t : 0;
  }
  /** Setelah password salah. Mengembalikan nilai baru untuk kolom GagalLogin & TerkunciSampai. */
  function catatGagal(user, nowMs, maks, kunciMenit) {
    var g = num(user.GagalLogin, 0) + 1;
    if (g >= maks) return { GagalLogin: 0, TerkunciSampai: String(nowMs + kunciMenit * 60000), terkunci: true, sisa: 0 };
    return { GagalLogin: String(g), TerkunciSampai: '', terkunci: false, sisa: maks - g };
  }

  /** Status tampilan user. */
  function statusUser(user, nowMs) {
    if (!bool(user.Aktif)) return 'NONAKTIF';
    if (terkunci(user, nowMs)) return 'TERKUNCI';
    if (bool(user.WajibGantiPassword)) return 'WAJIB_GANTI';
    return 'AKTIF';
  }

  /** Hapus hanya untuk user yang belum pernah login dan belum pernah beraktivitas (§6.1). */
  function bolehHapus(user) { return !bool(user.PunyaAktivitas) && !String(user.LoginTerakhir || ''); }

  // ---------- migrasi skema (hanya menambah) ----------
  /**
   * skema: { Tab: [kolom...] }, kondisi: { Tab: [header yang sudah ada] } (tab tidak ada = undefined).
   * Mengembalikan langkah: buatTab / tambahKolom. Tidak pernah menghapus atau mengganti urutan.
   */
  function rencanaMigrasi(skema, kondisi) {
    var langkah = [];
    Object.keys(skema).forEach(function (tab) {
      var ada = kondisi[tab];
      if (!ada) { langkah.push({ op: 'buatTab', tab: tab, kolom: skema[tab].slice() }); return; }
      var kurang = skema[tab].filter(function (c) { return ada.indexOf(c) < 0; });
      if (kurang.length) langkah.push({ op: 'tambahKolom', tab: tab, kolom: kurang });
    });
    return langkah;
  }

  return {
    bool: bool, num: num, normUsername: normUsername, cekUsername: cekUsername, cekPassword: cekPassword,
    passwordAcak: passwordAcak, parseIzin: parseIzin, petaRole: petaRole, izinUser: izinUser,
    jumlahAdminAktif: jumlahAdminAktif, hilangkanAdminTerakhir: hilangkanAdminTerakhir, cekPetaRole: cekPetaRole,
    terkunci: terkunci, catatGagal: catatGagal, statusUser: statusUser, bolehHapus: bolehHapus,
    rencanaMigrasi: rencanaMigrasi
  };
})();

// ===== 20_Repo.js =====
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

// ===== 30_Auth.js =====
/**
 * Auth: hash password, sesi, dan profil izin. Pengecekan izin dilakukan di gerbang api() (40_Api.js).
 */
var Auth = (function () {
  var ITERASI = 500;   // SHA-256 berulang + salt (§12). Jumlah iterasi ikut disimpan supaya bisa dinaikkan nanti.

  function hex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) { var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i]; s += (b < 16 ? '0' : '') + b.toString(16); }
    return s;
  }
  function sha(s) { return hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }

  function hash(pw, salt, iterasi) {
    iterasi = iterasi || ITERASI;
    var h = salt + ':' + pw;
    for (var i = 0; i < iterasi; i++) h = sha(h + ':' + salt);
    return 'sha256$' + iterasi + '$' + h;
  }
  function cocok(pw, salt, tersimpan) {
    var p = String(tersimpan || '').split('$');
    if (p.length !== 3 || p[0] !== 'sha256') return false;
    var h = hash(pw, salt, Number(p[1]));
    var beda = h.length ^ tersimpan.length;                 // bandingkan tanpa berhenti di karakter pertama yang beda
    for (var i = 0; i < h.length && i < tersimpan.length; i++) beda |= h.charCodeAt(i) ^ tersimpan.charCodeAt(i);
    return beda === 0;
  }
  function saltBaru() { return Utilities.getUuid().replace(/-/g, ''); }
  function bytesAcak(n) {
    var hx = '', out = [];
    while (hx.length < n * 2) hx += Utilities.getUuid().replace(/-/g, '');
    for (var i = 0; i < n; i++) out.push(parseInt(hx.substr(i * 2, 2), 16));
    return out;
  }
  function passwordAcak() { return Domain.passwordAcak(bytesAcak(9)); }

  // ---------- sesi (token di CacheService, diperpanjang tiap permintaan) ----------
  function detikSesi() { return Math.min(21600, Math.max(600, Domain.num(Repo.config('SESI_JAM', '6'), 6) * 3600)); }
  function buatSesi(user) {
    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    CacheService.getScriptCache().put('sesi:' + token, JSON.stringify({ u: user.Username, v: Domain.num(user.SesiVersi, 0) }), detikSesi());
    return token;
  }
  function ambilSesi(token) {
    if (!token) throw Repo.galat('SESI_HABIS', 'Silakan masuk dulu.');
    var c = CacheService.getScriptCache(), s = c.get('sesi:' + token);
    if (!s) throw Repo.galat('SESI_HABIS', 'Sesi Anda berakhir. Silakan masuk lagi.');
    c.put('sesi:' + token, s, detikSesi());                // perpanjang
    return JSON.parse(s);
  }
  function hapusSesi(token) { if (token) CacheService.getScriptCache().remove('sesi:' + token); }

  /** Data user yang aman dikirim ke browser (tanpa hash & salt). */
  function profil(u, peta) {
    var now = Date.now(), kunci = Domain.terkunci(u, now);
    return {
      username: u.Username, nama: u.Nama, alias: u.AliasPIC, role: u.Role,
      aktif: Domain.bool(u.Aktif), wajibGanti: Domain.bool(u.WajibGantiPassword),
      status: Domain.statusUser(u, now),
      terkunciSampai: kunci ? Utilities.formatDate(new Date(kunci), APP.TZ, 'HH:mm') : '',
      loginTerakhir: u.LoginTerakhir || '', bisaDihapus: Domain.bolehHapus(u),
      dibuatOleh: u.CreatedBy || '', version: u.Version || '',
      izin: peta ? Domain.izinUser(u, peta) : undefined
    };
  }

  return { hash: hash, cocok: cocok, saltBaru: saltBaru, passwordAcak: passwordAcak,
           buatSesi: buatSesi, ambilSesi: ambilSesi, hapusSesi: hapusSesi, profil: profil };
})();

// ===== 40_Api.js =====
/**
 * Pintu masuk web app: doGet() menyajikan UI, api() satu-satunya gerbang untuk semua aksi.
 * Setiap aksi dicek sesi + izinnya DI SERVER (§6). Penolakan dicatat sebagai IZIN_DITOLAK.
 */

function doGet() {
  try { Repo.pastikanMigrasi(); } catch (e) { console.error('Migrasi gagal: ' + e.message); }
  return HtmlService.createHtmlOutput(UI_HTML)
    .setTitle(APP.NAMA)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function api(token, aksi, payload) {
  try {
    var A = AKSI[aksi];
    if (!A) throw Repo.galat('AKSI_TIDAK_DIKENAL', 'Aksi "' + aksi + '" tidak dikenal.');
    var ctx = { payload: payload || {}, token: token };
    if (A.publik) return { ok: true, data: A.fn(ctx) };

    if (!Repo.siap()) throw Repo.galat('BELUM_SETUP', 'Database belum dibuat. Jalankan setup() di editor Apps Script.');
    var sesi = Auth.ambilSesi(token);
    var u = Repo.cari('Users', sesi.u);
    if (!u || !Domain.bool(u.Aktif) || Domain.num(u.SesiVersi, 0) !== sesi.v) {
      Auth.hapusSesi(token);
      throw Repo.galat('SESI_HABIS', 'Sesi Anda berakhir. Silakan masuk lagi.');
    }
    ctx.user = u;
    ctx.peta = Domain.petaRole(Repo.semua('Ref_Role'));
    ctx.izin = Domain.izinUser(u, ctx.peta);

    if (Domain.bool(u.WajibGantiPassword) && !A.saatWajibGanti) {
      throw Repo.galat('WAJIB_GANTI', 'Ganti password Anda dulu sebelum melanjutkan.');
    }
    if (A.izin && ctx.izin.indexOf(A.izin) < 0) {
      Repo.tulisLog({ user: u.Username, aksi: 'IZIN_DITOLAK', entitas: 'api', id: aksi, catatan: A.izin + ' dibutuhkan', hasil: 'DITOLAK' });
      throw Repo.galat('IZIN_DITOLAK', 'Anda tidak punya izin untuk aksi ini (' + A.izin + '). Hubungi admin bila memerlukan akses.');
    }
    var data = A.ubah ? Repo.kunci(function () { return A.fn(ctx); }) : A.fn(ctx);
    if (A.ubah && !Domain.bool(u.PunyaAktivitas) && Repo.cari('Users', u.Username)) {
      Repo.kunci(function () { Repo.ubah('Users', u.Username, { PunyaAktivitas: 'TRUE' }); });
    }
    return { ok: true, data: data };
  } catch (e) {
    if (!e.kode && /required permissions|do not have permission|tidak memiliki izin/i.test(String(e.message))) {
      e = Repo.galat('IZIN_GOOGLE', 'Izin Google untuk aplikasi belum lengkap. Admin: di editor Apps Script jalankan fungsi mintaIzin, centang semua izin (Select all), lalu muat ulang halaman.');
    }
    if (!e.kode) console.error(aksi + ': ' + (e.stack || e.message));
    return { ok: false, kode: e.kode || 'ERROR', pesan: e.kode ? e.message : 'Terjadi kesalahan di server: ' + e.message };
  }
}

// ---------------------------------------------------------------- helper
function catat_(ctx, aksi, entitas, id, catatan, hasil, field, lama, baru) {
  Repo.tulisLog({ user: ctx.user ? ctx.user.Username : 'sistem', aksi: aksi, entitas: entitas, id: id, catatan: catatan,
                  hasil: hasil, field: field, lama: lama, baru: baru });
}
function cfgNum_(key, bawaan) { return Domain.num(Repo.config(key, String(bawaan)), bawaan); }
function infoApp_() {
  return { nama: Repo.config('APP_NAMA', APP.NAMA), versi: APP.VERSI, fase: APP.FASE, skema: APP.SKEMA,
           passwordMin: cfgNum_('PASSWORD_MIN', 8), sesiJam: cfgNum_('SESI_JAM', 6) };
}
function wajib_(kondisi, pesan, kode) { if (!kondisi) throw Repo.galat(kode || 'VALIDASI', pesan); }
function jam_(ms) { return Utilities.formatDate(new Date(Number(ms)), APP.TZ, 'HH:mm'); }

// ---------------------------------------------------------------- aksi
var AKSI = {

  status: { publik: true, fn: function () { return { siap: Repo.siap(), app: infoApp_() }; } },

  login: { publik: true, fn: function (ctx) {
    wajib_(Repo.siap(), 'Database belum dibuat. Jalankan setup() di editor Apps Script.', 'BELUM_SETUP');
    var uname = Domain.normUsername(ctx.payload.username), pw = String(ctx.payload.password || '');
    return Repo.kunci(function () {
      var u = Repo.cari('Users', uname), now = Date.now();
      var log = function (catatan, hasil) { Repo.tulisLog({ user: uname || '?', aksi: 'LOGIN', entitas: 'Users', id: uname || '?', catatan: catatan, hasil: hasil }); };
      if (!u || !uname) { log('username tidak dikenal', 'GAGAL'); throw Repo.galat('LOGIN_GAGAL', 'Username atau password salah.'); }
      if (!Domain.bool(u.Aktif)) { log('akun nonaktif', 'DITOLAK'); throw Repo.galat('AKUN_NONAKTIF', 'Akun ini dinonaktifkan. Hubungi admin FF.'); }
      var k = Domain.terkunci(u, now);
      if (k) { log('akun terkunci', 'DITOLAK'); throw Repo.galat('TERKUNCI', 'Akun terkunci sampai ' + jam_(k) + ' karena terlalu banyak salah password. Tunggu, atau minta admin membuka kunci.'); }
      if (!Auth.cocok(pw, u.Salt, u.PasswordHash)) {
        var maks = cfgNum_('LOGIN_GAGAL_MAKS', 5), menit = cfgNum_('KUNCI_MENIT', 15), g = Domain.catatGagal(u, now, maks, menit);
        Repo.ubah('Users', u.Username, { GagalLogin: String(g.GagalLogin), TerkunciSampai: g.TerkunciSampai });
        log('password salah', 'GAGAL');
        if (g.terkunci) {
          Repo.tulisLog({ user: uname, aksi: 'AKUN_TERKUNCI', entitas: 'Users', id: uname, catatan: maks + '× salah, terkunci ' + menit + ' menit' });
          throw Repo.galat('TERKUNCI', 'Akun terkunci sampai ' + jam_(g.TerkunciSampai) + ' karena ' + maks + ' kali salah password.');
        }
        throw Repo.galat('LOGIN_GAGAL', 'Username atau password salah. Sisa ' + g.sisa + ' percobaan sebelum akun dikunci ' + menit + ' menit.');
      }
      var u2 = Repo.ubah('Users', u.Username, { GagalLogin: '0', TerkunciSampai: '', LoginTerakhir: Repo.sekarang(), PunyaAktivitas: 'TRUE' });
      log('', 'BERHASIL');
      var peta = Domain.petaRole(Repo.semua('Ref_Role'));
      return { token: Auth.buatSesi(u2), user: Auth.profil(u2, peta), app: infoApp_() };
    });
  } },

  me: { saatWajibGanti: true, fn: function (ctx) { return { user: Auth.profil(ctx.user, ctx.peta), app: infoApp_(), katalog: IZIN }; } },

  logout: { saatWajibGanti: true, fn: function (ctx) {
    Auth.hapusSesi(ctx.token); catat_(ctx, 'LOGOUT', 'Users', ctx.user.Username, ''); return {};
  } },

  gantiPassword: { saatWajibGanti: true, ubah: true, fn: function (ctx) {
    var u = Repo.cari('Users', ctx.user.Username), wajib = Domain.bool(u.WajibGantiPassword), p = ctx.payload;
    if (!wajib) wajib_(Auth.cocok(String(p.lama || ''), u.Salt, u.PasswordHash), 'Password lama salah.', 'PASSWORD_LAMA');
    var baru = String(p.baru || '');
    var e = Domain.cekPassword(baru, { min: cfgNum_('PASSWORD_MIN', 8), samaDenganLama: Auth.cocok(baru, u.Salt, u.PasswordHash) });
    wajib_(!e.length, e.join('. ') + '.', 'PASSWORD_LEMAH');
    var salt = Auth.saltBaru();
    var u2 = Repo.ubah('Users', u.Username, { PasswordHash: Auth.hash(baru, salt), Salt: salt, WajibGantiPassword: 'FALSE' }, u.Username);
    catat_(ctx, 'GANTI_PASSWORD', 'Users', u.Username, wajib ? 'password sementara diganti' : '');
    return { user: Auth.profil(u2, ctx.peta) };
  } },

  // ---------------- users ----------------
  'users.list': { izin: 'user.kelola', fn: function (ctx) {
    return { users: Repo.semua('Users').map(function (u) { return Auth.profil(u); }),
             roles: Object.keys(ctx.peta).map(function (r) { return { role: r, izin: ctx.peta[r] }; }), katalog: IZIN };
  } },

  'users.simpan': { izin: 'user.kelola', ubah: true, fn: function (ctx) {
    var p = ctx.payload, oleh = ctx.user.Username, peta = ctx.peta;
    wajib_(peta[p.role], 'Role "' + p.role + '" tidak dikenal.');
    var nama = String(p.nama || '').trim(), alias = String(p.alias || '').trim();
    wajib_(nama, 'Nama lengkap wajib diisi.');
    wajib_(nama.length <= 80 && alias.length <= 40, 'Nama maksimal 80 karakter dan alias maksimal 40 karakter.');

    var pw = '', mode = '';
    if (p.baru || p.password) {
      mode = p.password && p.password.mode === 'ketik' ? 'ketik' : 'acak';
      if (mode === 'ketik') {
        pw = String(p.password.nilai || '');
        var e = Domain.cekPassword(pw, { min: cfgNum_('PASSWORD_MIN', 8) });
        wajib_(!e.length, 'Password: ' + e.join(', ') + '.', 'PASSWORD_LEMAH');
      } else pw = Auth.passwordAcak();
    }
    var catatPw = mode === 'acak' ? 'password acak' : mode === 'ketik' ? 'password diketik admin' : '';
    var salt;

    if (p.baru) {
      var uname = Domain.normUsername(p.username), eu = Domain.cekUsername(uname);
      wajib_(!eu, eu);
      wajib_(!Repo.cari('Users', uname), 'Username "' + uname + '" sudah dipakai.');
      salt = Auth.saltBaru();
      Repo.tambah('Users', { Username: uname, Nama: nama, AliasPIC: alias, Role: p.role, PasswordHash: Auth.hash(pw, salt), Salt: salt,
        Aktif: 'TRUE', WajibGantiPassword: 'TRUE', GagalLogin: '0', TerkunciSampai: '', LoginTerakhir: '', PunyaAktivitas: 'FALSE',
        SesiVersi: '0', CreatedBy: oleh, UpdatedBy: oleh });
      catat_(ctx, 'BUAT_USER', 'Users', uname, 'role ' + p.role + (alias ? ', alias ' + alias : '') + ' · ' + catatPw);
      return { username: uname, passwordAcak: mode === 'acak' ? pw : '' };
    }

    var u = Repo.cari('Users', Domain.normUsername(p.username));
    wajib_(u, 'User tidak ditemukan.', 'TIDAK_ADA');
    var aktif = p.aktif === undefined ? Domain.bool(u.Aktif) : !!p.aktif;
    if (Domain.hilangkanAdminTerakhir(Repo.semua('Users'), peta, { username: u.Username, role: p.role, aktif: aktif ? 'TRUE' : 'FALSE' })) {
      catat_(ctx, 'UBAH_USER', 'Users', u.Username, 'akan menghapus admin aktif terakhir', 'DITOLAK');
      throw Repo.galat('ADMIN_TERAKHIR', 'Ditolak: harus ada minimal satu admin aktif dengan izin user.kelola.');
    }
    var ubah = [], patch = { Nama: nama, AliasPIC: alias, Role: p.role, Aktif: aktif ? 'TRUE' : 'FALSE' };
    if (p.role !== u.Role) ubah.push('role ' + u.Role + ' → ' + p.role);
    if (aktif !== Domain.bool(u.Aktif)) ubah.push(aktif ? 'diaktifkan' : 'dinonaktifkan');
    if (nama !== u.Nama) ubah.push('nama ' + u.Nama + ' → ' + nama);
    if (alias !== u.AliasPIC) ubah.push('alias ' + (u.AliasPIC || '—') + ' → ' + (alias || '—'));
    if (pw) { salt = Auth.saltBaru(); patch.PasswordHash = Auth.hash(pw, salt); patch.Salt = salt; patch.WajibGantiPassword = 'TRUE'; patch.GagalLogin = '0'; patch.TerkunciSampai = ''; }
    if (pw || !aktif || p.role !== u.Role) patch.SesiVersi = String(Domain.num(u.SesiVersi, 0) + 1);   // akhiri sesi aktif
    Repo.ubah('Users', u.Username, patch, oleh, p.version);
    if (ubah.length) catat_(ctx, 'UBAH_USER', 'Users', u.Username, ubah.join(', '));
    if (pw) catat_(ctx, 'RESET_PASSWORD', 'Users', u.Username, catatPw + ' · sesi diakhiri');
    return { username: u.Username, passwordAcak: mode === 'acak' ? pw : '' };
  } },

  'users.aktif': { izin: 'user.kelola', ubah: true, fn: function (ctx) {
    var u = Repo.cari('Users', Domain.normUsername(ctx.payload.username)), aktif = !!ctx.payload.aktif;
    wajib_(u, 'User tidak ditemukan.', 'TIDAK_ADA');
    if (!aktif && Domain.hilangkanAdminTerakhir(Repo.semua('Users'), ctx.peta, { username: u.Username, aktif: 'FALSE' })) {
      catat_(ctx, 'NONAKTIFKAN_USER', 'Users', u.Username, 'akan menghapus admin aktif terakhir', 'DITOLAK');
      throw Repo.galat('ADMIN_TERAKHIR', 'Ditolak: harus ada minimal satu admin aktif dengan izin user.kelola.');
    }
    var patch = { Aktif: aktif ? 'TRUE' : 'FALSE' };
    if (!aktif) patch.SesiVersi = String(Domain.num(u.SesiVersi, 0) + 1);
    Repo.ubah('Users', u.Username, patch, ctx.user.Username);
    catat_(ctx, aktif ? 'AKTIFKAN_USER' : 'NONAKTIFKAN_USER', 'Users', u.Username, aktif ? '' : 'sesi aktif diakhiri');
    return {};
  } },

  'users.bukaKunci': { izin: 'user.kelola', ubah: true, fn: function (ctx) {
    var u = Repo.cari('Users', Domain.normUsername(ctx.payload.username));
    wajib_(u, 'User tidak ditemukan.', 'TIDAK_ADA');
    Repo.ubah('Users', u.Username, { GagalLogin: '0', TerkunciSampai: '' }, ctx.user.Username);
    catat_(ctx, 'BUKA_KUNCI', 'Users', u.Username, '');
    return {};
  } },

  'users.hapus': { izin: 'user.kelola', ubah: true, fn: function (ctx) {
    var u = Repo.cari('Users', Domain.normUsername(ctx.payload.username));
    wajib_(u, 'User tidak ditemukan.', 'TIDAK_ADA');
    if (!Domain.bolehHapus(u) || u.Username === ctx.user.Username) {
      catat_(ctx, 'HAPUS_USER', 'Users', u.Username, 'user sudah punya riwayat', 'DITOLAK');
      throw Repo.galat('PUNYA_RIWAYAT', 'Ditolak: user ini sudah punya riwayat. Nonaktifkan saja supaya Log tetap utuh.');
    }
    if (Domain.hilangkanAdminTerakhir(Repo.semua('Users'), ctx.peta, { username: u.Username, hapus: true })) {
      throw Repo.galat('ADMIN_TERAKHIR', 'Ditolak: harus ada minimal satu admin aktif dengan izin user.kelola.');
    }
    Repo.hapus('Users', u.Username);
    catat_(ctx, 'HAPUS_USER', 'Users', u.Username, 'tanpa aktivitas');
    return {};
  } },

  // ---------------- role & izin ----------------
  'roles.list': { izin: 'user.kelola', fn: function (ctx) {
    var users = Repo.semua('Users');
    return { katalog: IZIN, roles: Object.keys(ctx.peta).map(function (r) {
      return { role: r, izin: ctx.peta[r], jumlahUser: users.filter(function (u) { return u.Role === r && Domain.bool(u.Aktif); }).length };
    }) };
  } },

  'roles.simpan': { izin: 'user.kelola', ubah: true, fn: function (ctx) {
    var baru = ctx.payload.peta || {}, lama = ctx.peta;
    var e = Domain.cekPetaRole(baru, IZIN);
    wajib_(!e.length, e.join(' '));
    wajib_(Object.keys(baru).sort().join() === Object.keys(lama).sort().join(), 'Daftar role berubah di tempat lain. Muat ulang halaman.', 'KONFLIK');
    if (Domain.hilangkanAdminTerakhir(Repo.semua('Users'), lama, { petaBaru: baru })) {
      catat_(ctx, 'UBAH_IZIN', 'Ref_Role', '—', 'akan menghapus user.kelola dari semua admin aktif', 'DITOLAK');
      throw Repo.galat('ADMIN_TERAKHIR', 'Ditolak: perubahan ini membuat tidak ada lagi user aktif dengan izin user.kelola.');
    }
    var n = 0;
    Object.keys(baru).forEach(function (r) {
      var tambah = baru[r].filter(function (i) { return lama[r].indexOf(i) < 0; }), kurang = lama[r].filter(function (i) { return baru[r].indexOf(i) < 0; });
      if (!tambah.length && !kurang.length) return;
      var urut = IZIN.map(function (x) { return x[0]; }).filter(function (i) { return baru[r].indexOf(i) >= 0; });
      Repo.ubah('Ref_Role', r, { Izin: urut.join(',') }, ctx.user.Username);
      tambah.forEach(function (i) { catat_(ctx, 'UBAH_IZIN', 'Ref_Role', r, '', '', i, 'tidak', 'ya'); });
      kurang.forEach(function (i) { catat_(ctx, 'UBAH_IZIN', 'Ref_Role', r, '', '', i, 'ya', 'tidak'); });
      n += tambah.length + kurang.length;
    });
    return { diubah: n };
  } },

  'roles.buat': { izin: 'user.kelola', ubah: true, fn: function (ctx) {
    var nama = String(ctx.payload.nama || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'), dari = ctx.payload.salinDari;
    wajib_(/^[A-Z][A-Z0-9_]{1,31}$/.test(nama), 'Nama role 2–32 karakter: huruf kapital, angka, garis bawah; diawali huruf.');
    wajib_(!ctx.peta[nama], 'Role ' + nama + ' sudah ada.');
    var izin = dari && ctx.peta[dari] ? ctx.peta[dari] : [];
    Repo.tambah('Ref_Role', { Role: nama, Izin: izin.join(','), UpdatedBy: ctx.user.Username });
    catat_(ctx, 'BUAT_ROLE', 'Ref_Role', nama, dari ? 'disalin dari ' + dari : 'tanpa izin');
    return { role: nama };
  } },

  // ---------------- log ----------------
  'log.list': { fn: function (ctx) {
    var semuaLog = ctx.izin.indexOf('log.semua') >= 0, f = ctx.payload || {}, me = ctx.user.Username;
    var rows = Repo.semua('Log').slice().reverse().filter(function (l) { return semuaLog || l.Username === me; });
    var uniq = function (k) { var s = {}; rows.forEach(function (l) { s[l[k]] = 1; }); return Object.keys(s).sort(); };
    var users = uniq('Username'), aksi = uniq('Aksi');
    rows = rows.filter(function (l) { return (!f.user || l.Username === f.user) && (!f.aksi || l.Aksi === f.aksi) && (!f.hasil || l.Hasil === f.hasil); });
    var total = rows.length;
    return { semua: semuaLog, total: total, users: users, aksi: aksi,
      entri: rows.slice(0, Math.min(Domain.num(f.limit, 300), 1000)).map(function (l) {
        return { waktu: l.Timestamp, user: l.Username, aksi: l.Aksi, entitas: l.Entitas, id: l.EntitasID, field: l.Field,
                 lama: l.NilaiLama, baru: l.NilaiBaru, catatan: l.Catatan, hasil: l.Hasil || 'BERHASIL' };
      }) };
  } },

  // ---------------- sistem ----------------
  'sistem.info': { izin: 'user.kelola', fn: function () {
    var riwayat = []; try { riwayat = JSON.parse(Repo.meta('RIWAYAT_MIGRASI') || '[]'); } catch (e) { riwayat = []; }
    var akun = ''; try { akun = Session.getEffectiveUser().getEmail(); } catch (e) { akun = ''; }
    return { app: infoApp_(), skemaDb: Repo.meta('SKEMA_VERSI'), dibuat: Repo.meta('DB_DIBUAT'), riwayat: riwayat, db: Repo.infoDatabase(),
             akunFF: akun, config: Repo.semua('Config').map(function (c) { return { key: c.Key, nilai: c.Nilai, ket: c.Keterangan }; }) };
  } },

  'sistem.cek': { izin: 'user.kelola', fn: function (ctx) {
    var hasil = [], users = Repo.semua('Users');
    var cek = function (nama, ok, catatan) { hasil.push({ nama: nama, ok: !!ok, catatan: catatan || '' }); };
    cek('Database bisa dibuka', true);
    cek('Skema sesuai versi aplikasi (v' + APP.SKEMA + ')', Domain.num(Repo.meta('SKEMA_VERSI'), 0) === APP.SKEMA, 'Skema database v' + Repo.meta('SKEMA_VERSI'));
    var nAdmin = Domain.jumlahAdminAktif(users, ctx.peta);
    cek('Ada admin aktif dengan user.kelola', nAdmin > 0, nAdmin + ' admin aktif');
    var tanpaRole = users.filter(function (u) { return !ctx.peta[u.Role]; }).map(function (u) { return u.Username; });
    cek('Semua user memakai role yang ada', !tanpaRole.length, tanpaRole.length ? 'Role hilang: ' + tanpaRole.join(', ') : '');
    var keys = Repo.semua('Config').map(function (c) { return c.Key; });
    var kurang = CONFIG_AWAL.filter(function (c) { return keys.indexOf(c[0]) < 0; }).map(function (c) { return c[0]; });
    cek('Config lengkap', !kurang.length, kurang.length ? 'Kurang: ' + kurang.join(', ') : '');
    var info = Repo.infoDatabase(), orang = info.editors.length + info.viewers.length;
    cek('File database tidak dibagikan (maks. akun FF + 1 admin cadangan)', orang <= 2, orang + ' akun punya akses');
    catat_(ctx, 'CEK_SISTEM', '_Meta', '—', hasil.filter(function (h) { return h.ok; }).length + '/' + hasil.length + ' OK');
    return { hasil: hasil };
  } },

  'config.simpan': { izin: 'pengaturan.kelola', ubah: true, fn: function (ctx) {
    var key = String(ctx.payload.key || ''), nilai = String(ctx.payload.nilai == null ? '' : ctx.payload.nilai).trim();
    var BATAS = { SESI_JAM: [1, 6], LOGIN_GAGAL_MAKS: [3, 20], KUNCI_MENIT: [1, 1440], PASSWORD_MIN: [6, 64] };
    wajib_(CONFIG_AWAL.some(function (c) { return c[0] === key; }), 'Key config tidak dikenal.');
    if (BATAS[key]) {
      var n = Number(nilai);
      wajib_(/^\d+$/.test(nilai) && n >= BATAS[key][0] && n <= BATAS[key][1], key + ' harus angka ' + BATAS[key][0] + '–' + BATAS[key][1] + '.');
    } else wajib_(nilai && nilai.length <= 60, key + ' wajib diisi (maks. 60 karakter).');
    var lama = Repo.cari('Config', key);
    if (lama.Nilai === nilai) return { berubah: false };
    Repo.ubah('Config', key, { Nilai: nilai }, ctx.user.Username);
    catat_(ctx, 'UBAH_CONFIG', 'Config', key, '', '', 'Nilai', lama.Nilai, nilai);
    return { berubah: true };
  } }
};

// ===== 50_Setup.js =====
/**
 * Dijalankan dari editor Apps Script (pilih fungsi → Run). Hasilnya tampil di Execution log.
 */

/** Sekali saat pemasangan: membuat database, migrasi skema, isi awal, dan admin awal. Aman dijalankan ulang. */
function setup() {
  pastikanIzin_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Ada proses lain yang sedang berjalan. Coba lagi sebentar.');
  try {
    var props = PropertiesService.getScriptProperties(), id = props.getProperty('DB_ID');
    if (id) {
      try { SpreadsheetApp.openById(id); }
      catch (e) { throw new Error('Database tersimpan (DB_ID) tidak bisa dibuka: ' + e.message + '. Bila memang ingin membuat database baru, hapus properti DB_ID di Project Settings › Script properties.'); }
      console.log('Database sudah ada. Memeriksa migrasi skema …');
    } else {
      Repo.buatDatabase();
      console.log('Membuat file database "' + APP.NAMA_DB + '" di My Drive akun ini …  OK');
    }
    var langkah = Repo.migrasi('setup()');
    langkah.forEach(function (l) { console.log('  ' + l); });
    if (!langkah.length) console.log('  Skema sudah versi terbaru (v' + APP.SKEMA + ').');

    if (!Repo.semua('Users').length) {
      var pw = buatAdmin_('admin', 'Admin awal', 'setup()');
      Repo.tulisLog({ user: 'sistem', aksi: 'SETUP', entitas: '_Meta', id: APP.NAMA_DB, catatan: 'database & admin awal dibuat' });
      console.log('Admin awal dibuat →  username: admin   password sementara: ' + pw);
      console.log('  Simpan password ini sekarang. Tidak ditampilkan lagi; wajib diganti saat login pertama.');
    } else {
      console.log('User sudah ada; admin awal tidak dibuat ulang. Lupa password admin? Jalankan pulihkanAdmin().');
    }
    console.log('Selesai (aplikasi v' + APP.VERSI + ', skema v' + APP.SKEMA + '). Buka Web app URL untuk login.');
  } finally { lock.releaseLock(); }
}

/**
 * Darurat: bila tidak ada admin yang bisa login. Mengaktifkan/membuat user "admin" dengan role ADMIN
 * dan password sementara baru. Hanya bisa dijalankan pemilik script dari editor.
 */
function pulihkanAdmin() {
  pastikanIzin_();
  return Repo.kunci(function () {
    var peta = Domain.petaRole(Repo.semua('Ref_Role'));
    if (!peta.ADMIN || peta.ADMIN.indexOf('user.kelola') < 0) {
      if (peta.ADMIN) Repo.ubah('Ref_Role', 'ADMIN', { Izin: ROLE_AWAL.ADMIN.join(',') }, 'pulihkanAdmin()');
      else Repo.tambah('Ref_Role', { Role: 'ADMIN', Izin: ROLE_AWAL.ADMIN.join(','), UpdatedBy: 'pulihkanAdmin()' });
      console.log('Role ADMIN dikembalikan ke izin penuh.');
    }
    var pw;
    if (Repo.cari('Users', 'admin')) {
      pw = Auth.passwordAcak();
      var salt = Auth.saltBaru(), u = Repo.cari('Users', 'admin');
      Repo.ubah('Users', 'admin', { Role: 'ADMIN', Aktif: 'TRUE', PasswordHash: Auth.hash(pw, salt), Salt: salt, WajibGantiPassword: 'TRUE',
        GagalLogin: '0', TerkunciSampai: '', SesiVersi: String(Domain.num(u.SesiVersi, 0) + 1) }, 'pulihkanAdmin()');
    } else pw = buatAdmin_('admin', 'Admin awal', 'pulihkanAdmin()');
    Repo.tulisLog({ user: 'sistem', aksi: 'PULIHKAN_ADMIN', entitas: 'Users', id: 'admin', catatan: 'dijalankan dari editor' });
    console.log('User "admin" aktif dengan password sementara: ' + pw + '  (wajib diganti saat login)');
  });
}

/** Jalankan dari editor bila aplikasi melapor izin Google belum lengkap. */
function mintaIzin() {
  pastikanIzin_();
  console.log('Semua izin sudah diberikan. Muat ulang halaman web app.');
}

/** Memunculkan layar izin Google bila ada izin yang belum dicentang (layar ber-kotak-centang tidak muncul otomatis lagi). */
function pastikanIzin_() {
  if (typeof ScriptApp !== 'undefined' && ScriptApp.requireAllScopes) ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
}

function buatAdmin_(username, nama, oleh) {
  var pw = Auth.passwordAcak(), salt = Auth.saltBaru();
  Repo.tambah('Users', { Username: username, Nama: nama, AliasPIC: '', Role: 'ADMIN', PasswordHash: Auth.hash(pw, salt), Salt: salt,
    Aktif: 'TRUE', WajibGantiPassword: 'TRUE', GagalLogin: '0', TerkunciSampai: '', LoginTerakhir: '', PunyaAktivitas: 'TRUE',
    SesiVersi: '0', CreatedBy: oleh, UpdatedBy: oleh });
  return pw;
}

// ===== UI (src/ui, disematkan saat build) =====
var UI_HTML = "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap\">\n<style>\n/* Gaya bersama (sumber: mockup \"Orbit\"). */\n/* Layout: \"Orbit\" — rail kaca di kiri, langit berbintang tipis di belakang, kartu melayang. Alur BAST digambar sebagai lintasan orbit\n   (subjek: layanan satelit/VSAT). Detail kontrak = panel geser dari kanan, jadi daftar tetap terlihat. Tema terang + gelap. */\n:root{\n  --bg:#edf2f5; --surface:#ffffff; --surface2:#f3f7f9; --surface3:#e5edf1; --glass:rgba(255,255,255,.74);\n  --line:#d9e3e9; --line2:#c3d1d9; --fg:#0c1a24; --muted:#4d606d; --dim:#7b8d99;\n  --accent:#07857b; --accent-hi:#05a394; --on-accent:#ffffff; --accent-bg:rgba(7,133,123,.10); --glow:rgba(7,133,123,.28);\n  --violet:#5559e8; --violet-bg:rgba(85,89,232,.10);\n  --ok:#14905a; --ok-bg:rgba(20,144,90,.11); --warn:#9c6205; --warn-bg:rgba(214,150,30,.15);\n  --crit:#cc3b3b; --crit-bg:rgba(204,59,59,.10); --info:#3a58d6; --info-bg:rgba(58,88,214,.10);\n  --fresh:#0ea494; --warm:#c59c00; --stale:#df6f1f; --cold:#d23f3f;\n  --halo1:rgba(5,163,148,.16); --halo2:rgba(85,89,232,.11); --star:rgba(12,26,36,.08);\n  --shadow:0 1px 2px rgba(12,26,36,.05),0 10px 30px rgba(12,26,36,.06); --shadow-lg:0 30px 80px rgba(12,26,36,.22);\n  --scrim:rgba(10,22,32,.32);\n  --font:\"Plus Jakarta Sans\",\"Segoe UI\",system-ui,-apple-system,Roboto,Arial,sans-serif;\n  --mono:\"JetBrains Mono\",Consolas,\"Cascadia Mono\",Menlo,monospace;\n  --r:18px; --r-sm:11px; --ease:cubic-bezier(.2,.8,.2,1); --spring:cubic-bezier(.34,1.45,.64,1);\n}\n@media (prefers-color-scheme:dark){:root:not([data-theme=\"light\"]){\n  --bg:#060b14; --surface:#0d1522; --surface2:#121d2e; --surface3:#1a283e; --glass:rgba(12,20,33,.72);\n  --line:#1b293d; --line2:#2a3c57; --fg:#e4edf6; --muted:#93a6bb; --dim:#617490;\n  --accent:#37e2cb; --accent-hi:#86f2e2; --on-accent:#022320; --accent-bg:rgba(55,226,203,.12); --glow:rgba(55,226,203,.42);\n  --violet:#9ca2ff; --violet-bg:rgba(156,162,255,.13);\n  --ok:#4fd897; --ok-bg:rgba(79,216,151,.12); --warn:#f4c552; --warn-bg:rgba(244,197,82,.12);\n  --crit:#ff7c78; --crit-bg:rgba(255,124,120,.12); --info:#92a8ff; --info-bg:rgba(146,168,255,.12);\n  --fresh:#37e2cb; --warm:#f4d250; --stale:#ff9e4e; --cold:#ff7c78;\n  --halo1:rgba(55,226,203,.10); --halo2:rgba(120,110,255,.12); --star:rgba(220,235,255,.13);\n  --shadow:0 1px 0 rgba(255,255,255,.03) inset,0 12px 34px rgba(0,0,0,.38); --shadow-lg:0 30px 90px rgba(0,0,0,.65);\n  --scrim:rgba(2,6,12,.58); color-scheme:dark;\n}}\n:root[data-theme=\"dark\"]{\n  --bg:#060b14; --surface:#0d1522; --surface2:#121d2e; --surface3:#1a283e; --glass:rgba(12,20,33,.72);\n  --line:#1b293d; --line2:#2a3c57; --fg:#e4edf6; --muted:#93a6bb; --dim:#617490;\n  --accent:#37e2cb; --accent-hi:#86f2e2; --on-accent:#022320; --accent-bg:rgba(55,226,203,.12); --glow:rgba(55,226,203,.42);\n  --violet:#9ca2ff; --violet-bg:rgba(156,162,255,.13);\n  --ok:#4fd897; --ok-bg:rgba(79,216,151,.12); --warn:#f4c552; --warn-bg:rgba(244,197,82,.12);\n  --crit:#ff7c78; --crit-bg:rgba(255,124,120,.12); --info:#92a8ff; --info-bg:rgba(146,168,255,.12);\n  --fresh:#37e2cb; --warm:#f4d250; --stale:#ff9e4e; --cold:#ff7c78;\n  --halo1:rgba(55,226,203,.10); --halo2:rgba(120,110,255,.12); --star:rgba(220,235,255,.13);\n  --shadow:0 1px 0 rgba(255,255,255,.03) inset,0 12px 34px rgba(0,0,0,.38); --shadow-lg:0 30px 90px rgba(0,0,0,.65);\n  --scrim:rgba(2,6,12,.58); color-scheme:dark;\n}\n*{box-sizing:border-box}\nhtml,body{height:100%}\nbody{background:var(--bg);color:var(--fg);font-family:var(--font);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}\nbutton,input,select,textarea{font:inherit;color:inherit}\na{color:var(--accent)}\n:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}\n::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}\n.tnum{font-variant-numeric:tabular-nums}\n.mono{font-family:var(--mono);font-size:12.5px;font-variant-ligatures:none}\n.code,.ku,kbd,.t .no{font-variant-ligatures:none}\n.muted{color:var(--muted)} .dim{color:var(--dim)}\nsvg.i{width:20px;height:20px;fill:currentColor;flex:none}\nsvg.i.s{width:16px;height:16px}\n.sky{position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(1100px 620px at 88% -12%,var(--halo1),transparent 62%),radial-gradient(900px 600px at -8% 112%,var(--halo2),transparent 62%)}\n.sky::after{content:\"\";position:absolute;inset:0;background-image:radial-gradient(var(--star) 1px,transparent 1.4px);background-size:30px 30px;-webkit-mask-image:linear-gradient(to bottom,#000 0,transparent 75%);mask-image:linear-gradient(to bottom,#000 0,transparent 75%)}\nbody::before{content:\"\";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:30;background:var(--bg)}\n\n/* ---------- shell ---------- */\n.app{display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100%}\n.side{background:var(--glass);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-right:1px solid var(--line);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;padding-block:18px 14px;padding-left:max(12px,env(safe-area-inset-left,0px));padding-right:12px;z-index:25}\n.brand{display:flex;gap:11px;align-items:center;padding:2px 8px 22px}\n.brand svg{width:40px;height:40px;flex:none}\n.brand b{display:block;font-size:14.5px;line-height:1.15;font-weight:800;letter-spacing:-.01em}\n.brand span{font-size:11.5px;color:var(--muted)}\n.orbit-sat{transform-origin:20px 20px;animation:spin 7s linear infinite}\n@keyframes spin{to{transform:rotate(360deg)}}\n.nav{display:flex;flex-direction:column;gap:3px;position:relative}\n.nav-ind{position:absolute;left:0;right:0;top:0;height:42px;border-radius:13px;background:var(--accent-bg);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 22%,transparent);transition:transform .5s var(--spring);z-index:0}\n.nav a{position:relative;z-index:1;display:flex;align-items:center;gap:12px;height:42px;padding:0 12px;border-radius:13px;color:var(--muted);text-decoration:none;font-weight:600;font-size:13.5px;transition:color .2s}\n.nav a:hover{color:var(--fg)}\n.nav a.on{color:var(--accent)}\n.nav .cnt{margin-left:auto;font-size:11px;font-weight:700;min-width:22px;text-align:center;background:var(--surface3);color:var(--fg);border-radius:999px;padding:1px 7px}\n.nav a.on .cnt{background:var(--accent);color:var(--on-accent)}\n.side-foot{margin-top:auto;padding:12px;border-radius:14px;background:var(--surface2);border:1px solid var(--line);font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:4px}\n.live{display:inline-flex;align-items:center;gap:8px;color:var(--fg);font-weight:600}\n.pulse{width:8px;height:8px;border-radius:50%;background:var(--ok);position:relative;flex:none}\n.pulse::after{content:\"\";position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--ok);opacity:0;animation:ping 2.2s var(--ease) infinite}\n.pulse.warn{background:var(--warn)} .pulse.warn::after{border-color:var(--warn)}\n@keyframes ping{0%{transform:scale(.4);opacity:.9}100%{transform:scale(1.6);opacity:0}}\n\n.main{min-width:0;display:flex;flex-direction:column}\n.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px;padding-block:12px;padding-left:max(24px,env(safe-area-inset-left,0px));padding-right:max(24px,env(safe-area-inset-right,0px))}\n.top h1{font-size:20px;margin:0;font-weight:800;letter-spacing:-.02em;text-wrap:balance;line-height:1.2}\n.top .crumb{color:var(--muted);font-size:12.5px}\n.top .sp{flex:1}\n.cmdk{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:7px 8px 7px 14px;color:var(--muted);cursor:pointer;min-width:250px;box-shadow:var(--shadow);transition:border-color .2s}\n.cmdk:hover{border-color:var(--accent)}\n.cmdk span{flex:1;text-align:left}\nkbd{font-family:var(--mono);font-size:11px;border:1px solid var(--line2);border-bottom-width:2px;border-radius:6px;padding:0 6px;color:var(--muted);background:var(--surface2)}\n.mock{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;border:1px dashed var(--warn);color:var(--warn);padding:3px 8px;border-radius:7px;white-space:nowrap;font-weight:700}\n.iconbtn{background:none;border:0;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:var(--muted);cursor:pointer;position:relative;transition:background .2s,color .2s}\n.iconbtn:hover{background:var(--surface3);color:var(--fg)}\n.iconbtn[disabled]{opacity:.35;cursor:default}\n.badge{position:absolute;top:4px;right:4px;min-width:17px;height:17px;border-radius:9px;background:var(--crit);color:#fff;font-size:10.5px;font-weight:800;display:grid;place-items:center;padding:0 4px;box-shadow:0 0 0 2px var(--bg)}\n.me{display:flex;align-items:center;gap:8px;padding:4px 12px 4px 4px;border-radius:999px;background:var(--surface);border:1px solid var(--line);cursor:pointer;font-weight:600;font-size:13px}\n.av{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;color:var(--on-accent);background:linear-gradient(135deg,var(--accent),var(--violet));flex:none}\n.av.sm{width:26px;height:26px;font-size:11px}\n.av.none{background:var(--warn-bg);color:var(--warn)}\n.burger{display:none}\n.content{padding-block:24px 64px;padding-left:max(24px,env(safe-area-inset-left,0px));padding-right:max(24px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:20px;min-width:0;max-width:1480px;width:100%}\n.content.enter>*{animation:rise .55s var(--ease) both;animation-delay:calc(var(--i,0)*55ms)}\n@keyframes rise{from{opacity:0;transform:translateY(12px)}}\n\n/* ---------- building blocks ---------- */\n.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:18px;min-width:0;box-shadow:var(--shadow)}\n.card h2{font-size:15px;margin:0 0 14px;font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap;letter-spacing:-.01em}\n.card h2 small{font-weight:500;color:var(--muted);font-size:12.5px}\n.eyebrow{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700}\n.grid{display:grid;gap:20px}\n.g2{grid-template-columns:repeat(2,minmax(0,1fr))}\n.g3{grid-template-columns:repeat(3,minmax(0,1fr))}\n.g64{grid-template-columns:minmax(0,1.45fr) minmax(0,1fr)}\n.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n.sp{flex:1}\n.kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}\n.kpi{position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:16px 18px;box-shadow:var(--shadow)}\n.kpi .l{font-size:12px;color:var(--muted);font-weight:600}\n.kpi .v{font-size:30px;font-weight:800;margin-top:6px;letter-spacing:-.03em;line-height:1.05}\n.kpi .s{font-size:12px;color:var(--dim);margin-top:4px}\n.kpi .glyph{position:absolute;right:-8px;top:-8px;width:64px;height:64px;opacity:.07;fill:var(--fg)}\n.btn{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:8px 16px;border:1px solid var(--line2);background:var(--surface);color:var(--fg);cursor:pointer;font-weight:600;font-size:13px;white-space:nowrap;text-decoration:none;transition:transform .15s,background .2s,border-color .2s,box-shadow .2s}\n.btn:hover{border-color:var(--accent)}\n.btn:active{transform:scale(.97)}\n.btn.pri{background:var(--accent);border-color:var(--accent);color:var(--on-accent);box-shadow:0 6px 18px -6px var(--glow)}\n.btn.pri:hover{background:var(--accent-hi);border-color:var(--accent-hi)}\n.btn.ton{background:var(--accent-bg);border-color:transparent;color:var(--accent)}\n.btn.ghost{background:transparent;border-color:transparent;color:var(--accent)}\n.btn.ghost:hover{background:var(--accent-bg)}\n.btn.sm{padding:5px 12px;font-size:12.5px}\n.btn[disabled]{opacity:.45;cursor:not-allowed;box-shadow:none}\n.inp,select.inp,textarea.inp{background:var(--surface);border:1px solid var(--line2);border-radius:var(--r-sm);padding:8px 11px;min-width:0;transition:border-color .2s,box-shadow .2s}\ntextarea.inp{width:100%;min-height:76px;resize:vertical}\n.inp:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-bg)}\n.of{position:relative;display:flex;flex-direction:column;min-width:0}\n.of>span{position:absolute;top:-8px;left:10px;padding:0 5px;font-size:11px;font-weight:600;color:var(--accent);background:var(--surface);line-height:16px;z-index:1}\n.of>.inp{padding:12px 12px 10px;width:100%}\n.of>small{font-size:11.5px;color:var(--dim);margin-top:4px;padding-left:4px}\n.search{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line2);border-radius:999px;padding:7px 14px;flex:1 1 260px;min-width:0;transition:border-color .2s,box-shadow .2s}\n.search:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-bg)}\n.search input{background:none;border:0;outline:0;flex:1;min-width:0}\n.seg{display:inline-flex;background:var(--surface2);border:1px solid var(--line);border-radius:999px;padding:3px}\n.seg button{border:0;background:none;padding:5px 14px;border-radius:999px;cursor:pointer;color:var(--muted);font-weight:600;font-size:12.5px;transition:background .25s,color .25s}\n.seg button.on{background:var(--surface);color:var(--fg);box-shadow:var(--shadow)}\n.chipf{border:1px dashed var(--line2);background:transparent;border-radius:999px;padding:5px 12px;font-size:12.5px;cursor:pointer;color:var(--muted);font-weight:600;display:inline-flex;gap:6px;align-items:center;transition:all .2s}\n.chipf.on{border-style:solid;border-color:var(--accent);color:var(--accent);background:var(--accent-bg)}\n.chipf b{font-variant-numeric:tabular-nums}\n\n.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;white-space:nowrap;background:var(--surface3);color:var(--fg)}\n.pill .dot{width:7px;height:7px;border-radius:50%;background:currentColor}\n.p-ok{background:var(--ok-bg);color:var(--ok)} .p-warn{background:var(--warn-bg);color:var(--warn)}\n.p-crit{background:var(--crit-bg);color:var(--crit)} .p-info{background:var(--info-bg);color:var(--info)}\n.p-acc{background:var(--accent-bg);color:var(--accent)} .p-dim{background:var(--surface2);color:var(--muted);box-shadow:inset 0 0 0 1px var(--line)}\n.p-vio{background:var(--violet-bg);color:var(--violet)}\n.ku{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.02em;border-radius:7px;padding:3px 8px;white-space:nowrap;display:inline-block}\n\n.tbl-wrap{overflow-x:auto;border-radius:var(--r-sm)}\ntable.t{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}\n.t th{text-align:left;font-weight:600;color:var(--dim);font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;padding:9px 12px;border-bottom:1px solid var(--line);white-space:nowrap}\n.t td{padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:middle}\n.t tr:last-child td{border-bottom:0}\n.t tbody tr.click{cursor:pointer;transition:background .15s}\n.t tbody tr.click:hover td{background:var(--surface2)}\n.t tbody tr.sel td{background:var(--accent-bg)}\n.t td.num,.t th.num{text-align:right;font-variant-numeric:tabular-nums}\n.t .no{font-family:var(--mono);font-size:12px;font-weight:500}\n.t .sub{display:block;font-size:12px;color:var(--muted);max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n\n.agebar{display:flex;height:10px;border-radius:6px;overflow:hidden;background:var(--surface3);min-width:120px;gap:2px}\n.agebar i{display:block;height:100%;border-radius:3px}\n.age{font-size:11.5px;border-radius:7px;padding:2px 8px;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}\n.a-fresh{background:color-mix(in srgb,var(--fresh) 15%,transparent);color:var(--fresh)} .a-warm{background:color-mix(in srgb,var(--warm) 16%,transparent);color:var(--warm)}\n.a-stale{background:color-mix(in srgb,var(--stale) 15%,transparent);color:var(--stale)} .a-cold{background:color-mix(in srgb,var(--cold) 15%,transparent);color:var(--cold)}\n.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);font-weight:500}\n.legend span{display:inline-flex;align-items:center;gap:6px}\n.legend i{width:10px;height:10px;border-radius:3px;display:inline-block}\n.spark{display:inline-flex;align-items:flex-end;gap:2px;height:22px}\n.spark i{width:5px;border-radius:2px;background:var(--accent);opacity:.75}\n.spark i:last-child{opacity:1;box-shadow:0 0 8px var(--glow)}\n\n.hbars{display:flex;flex-direction:column;gap:10px}\n.hb{display:grid;grid-template-columns:minmax(0,210px) minmax(0,1fr) 30px;gap:12px;align-items:center;font-size:13px;cursor:pointer;border-radius:8px}\n.hb:hover .lbl{color:var(--accent)}\n.hb .lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .2s}\n.hb .track{height:12px;background:var(--surface2);border-radius:6px;overflow:hidden}\n.hb .fill{height:100%;border-radius:6px;transform-origin:left}\n.enter .hb .fill{animation:grow 1s var(--ease) both;animation-delay:.25s}\n@keyframes grow{from{transform:scaleX(0)}}\n.hb .n{text-align:right;font-variant-numeric:tabular-nums;color:var(--muted);font-weight:700}\n\n.hero{position:relative;overflow:hidden;padding:20px 22px 14px}\n.hero::before{content:\"\";position:absolute;inset:0;background:radial-gradient(600px 220px at 50% 120%,var(--halo1),transparent 70%);pointer-events:none}\n.pipe-wrap{overflow-x:auto;margin:0 -8px}\n.pipe{display:block;width:100%;min-width:760px;height:auto}\n.pipe .track{fill:none;stroke:var(--line2);stroke-width:2;stroke-dasharray:2 7;stroke-linecap:round}\n.pipe .trail{fill:none;stroke:url(#gTrail);stroke-width:3;stroke-linecap:round}\n.pipe .pt{fill:var(--accent);filter:drop-shadow(0 0 4px var(--glow))}\n.pnode{cursor:pointer;outline:none}\n.pnode .body{fill:var(--surface);stroke:var(--accent);stroke-width:2;transition:stroke-width .2s}\n.pnode:hover .body,.pnode:focus-visible .body{stroke-width:4}\n.pnode .halo{fill:var(--accent);opacity:.10}\n.pnode.closer .body{stroke:var(--ok)} .pnode.closer .halo{fill:var(--ok)}\n.pnode .ring{fill:none;stroke:var(--warn);stroke-width:2;stroke-dasharray:4 5;transform-box:fill-box;transform-origin:center;animation:spin 12s linear infinite}\n.pnode .cnt{fill:var(--fg);font-weight:800;font-size:22px;font-family:var(--font)}\n.pnode .lbl{fill:var(--fg);font-size:12.5px;font-weight:600;font-family:var(--font)}\n.pnode .sub{fill:var(--muted);font-size:11.5px;font-family:var(--font)}\n.pnode .sub.w{fill:var(--warn);font-weight:700}\n.enter .pnode{animation:popin .6s var(--spring) both;animation-delay:calc(.15s + var(--d)*70ms);transform-box:fill-box;transform-origin:center}\n@keyframes popin{from{opacity:0;transform:scale(.6)}}\n\n.syncs{display:grid;gap:10px}\n.sync{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:14px;background:var(--surface2);border:1px solid var(--line)}\n\n/* drawer */\n.dscrim{position:fixed;inset:0;background:var(--scrim);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:40;animation:fade .35s var(--ease) both}\n.drawer{position:fixed;top:0;right:0;bottom:0;width:min(1080px,100vw);background:var(--bg);border-left:1px solid var(--line);z-index:41;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);animation:slidein .5s var(--ease) both;padding-top:env(safe-area-inset-top,0px)}\n.drawer::before{content:\"\";position:absolute;inset:0;z-index:-1;background:radial-gradient(700px 300px at 100% 0,var(--halo1),transparent 70%)}\n.closing .drawer{animation:slideout .3s ease-in both}\n.closing .dscrim{animation:fadeout .3s ease-in both}\n@keyframes slidein{from{transform:translateX(70px);opacity:0}}\n@keyframes slideout{to{transform:translateX(70px);opacity:0}}\n@keyframes fade{from{opacity:0}} @keyframes fadeout{to{opacity:0}}\n.dhead{padding-block:14px 0;padding-left:24px;padding-right:max(24px,env(safe-area-inset-right,0px));border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:12px}\n.dtop{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n.dtitle{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}\n.dtitle .no{font-family:var(--mono);font-size:13px;color:var(--muted);display:flex;align-items:center;gap:6px;overflow-wrap:anywhere}\n.dtitle h2{margin:4px 0 2px;font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.2}\n.dtabs{display:flex;gap:4px;position:relative;overflow-x:auto}\n.dtabs button{background:none;border:0;padding:10px 16px;cursor:pointer;font-weight:700;color:var(--muted);font-size:13.5px;position:relative;white-space:nowrap}\n.dtabs button.on{color:var(--fg)}\n.dtabs button.on::after{content:\"\";position:absolute;left:12px;right:12px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:var(--accent);box-shadow:0 0 12px var(--glow)}\n.dbody{flex:1;overflow:auto;padding-block:20px 48px;padding-left:24px;padding-right:max(24px,env(safe-area-inset-right,0px))}\n.dbody.swap>*{animation:rise .4s var(--ease) both}\n\n.bast{border:1px solid var(--line);border-radius:var(--r);padding:16px 18px 18px;display:flex;flex-direction:column;gap:16px;background:var(--surface);box-shadow:var(--shadow)}\n.bast-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n.bast-h b{font-family:var(--mono);font-size:13px}\n.otrack{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(78px,1fr);overflow-x:auto;padding:6px 0 2px}\n.otrack .rail,.otrack .prog{position:absolute;top:19px;height:3px;border-radius:3px}\n.otrack .rail{left:var(--half);right:var(--half);background:var(--surface3)}\n.otrack .prog{left:var(--half);background:linear-gradient(90deg,var(--accent),var(--violet));box-shadow:0 0 12px var(--glow);transition:width .8s var(--ease)}\n.ost{position:relative;z-index:1;background:none;border:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 4px;color:var(--muted);font-size:11.5px;font-weight:600;line-height:1.25;text-align:center}\n.ost .d{width:28px;height:28px;border-radius:50%;background:var(--surface);border:2px solid var(--line2);display:grid;place-items:center;font-size:11px;font-weight:800;transition:all .3s var(--spring)}\n.ost:hover .d{border-color:var(--accent);transform:scale(1.12)}\n.ost:hover{color:var(--fg)}\n.ost.done .d{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}\n.ost.done{color:var(--fg)}\n.ost.cur .d{width:34px;height:34px;margin-top:-3px;margin-bottom:-3px;background:var(--surface);border:3px solid var(--accent);color:var(--accent);box-shadow:0 0 0 6px var(--accent-bg),0 0 22px var(--glow)}\n.ost.cur{color:var(--accent);font-weight:800}\n.ost.closer.done .d,.ost.closer.cur .d{background:var(--ok);border-color:var(--ok);color:var(--on-accent);box-shadow:0 0 0 6px var(--ok-bg)}\n.ost.closer.cur{color:var(--ok)}\ndl.kv{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:8px 18px;margin:0;font-size:13px}\ndl.kv dt{color:var(--muted)} dl.kv dd{margin:0;min-width:0;overflow-wrap:anywhere}\n.push{display:flex;flex-direction:column;gap:2px;border-radius:14px;overflow:hidden;border:1px solid var(--line)}\n.pushrow{display:grid;grid-template-columns:118px minmax(0,1fr);gap:10px;align-items:baseline;font-size:13px;padding:10px 12px;background:var(--surface2)}\n.pushrow .k{font-family:var(--mono);font-size:10.5px;color:var(--dim);font-weight:600}\n.pushrow .v{font-family:var(--mono);font-size:12.5px;font-weight:600;overflow-wrap:anywhere}\n.pushrow.main .v{color:var(--accent);font-size:13.5px}\n.sheetprev{border-radius:14px;overflow:hidden;border:1px solid var(--line);font-size:12px;background:var(--surface)}\n.sheetprev .sh{display:flex;gap:6px;align-items:center;padding:8px 10px;background:var(--surface3);font-weight:600;color:var(--muted)}\n.sheetprev .sh i{width:10px;height:10px;border-radius:50%;background:var(--ok);display:inline-block}\n.tl{display:flex;flex-direction:column;font-size:13px;position:relative}\n.tl .e{display:grid;grid-template-columns:18px 96px minmax(0,1fr);gap:10px;padding:9px 0;align-items:start}\n.tl .e .b{width:10px;height:10px;border-radius:50%;background:var(--accent);margin-top:5px;box-shadow:0 0 0 4px var(--accent-bg)}\n.tl .w{color:var(--dim);font-size:12px}\n.kend{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--crit-bg);border:1px solid color-mix(in srgb,var(--crit) 25%,transparent)}\n.kend.done{background:var(--surface2);border-color:var(--line);opacity:.75}\n.note{padding:11px 14px;border-radius:14px;font-size:13px;display:flex;gap:10px;align-items:flex-start;border:1px solid transparent}\n.note.warn{background:var(--warn-bg);color:var(--warn)} .note.info{background:var(--info-bg);color:var(--info)}\n.note.ok{background:var(--ok-bg);color:var(--ok)} .note.crit{background:var(--crit-bg);color:var(--crit)}\n.note .tx{color:var(--fg)} .note b{color:inherit}\n\n.tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);overflow-x:auto}\n.tabs a{padding:10px 16px;color:var(--muted);text-decoration:none;white-space:nowrap;font-weight:700;position:relative;transition:color .2s}\n.tabs a:hover{color:var(--fg)}\n.tabs a.on{color:var(--fg)}\n.tabs a.on::after{content:\"\";position:absolute;left:12px;right:12px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:var(--accent);box-shadow:0 0 12px var(--glow)}\n.bulk{position:sticky;bottom:16px;background:var(--surface);border:1px solid var(--accent);border-radius:999px;padding:8px 10px 8px 20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;box-shadow:var(--shadow-lg),0 0 0 4px var(--accent-bg);animation:rise .35s var(--spring) both}\n.wiz-steps{display:flex;gap:6px;flex-wrap:wrap}\n.wiz-steps span{display:flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:999px;background:var(--surface2);color:var(--muted);font-size:12.5px;font-weight:600;border:1px solid var(--line)}\n.wiz-steps span i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--surface3);font-style:normal;font-size:11.5px;font-weight:800}\n.wiz-steps span.on{color:var(--accent);background:var(--accent-bg);border-color:transparent}\n.wiz-steps span.on i{background:var(--accent);color:var(--on-accent)}\n.wiz-steps span.done i{background:var(--ok);color:var(--on-accent)}\n.choice{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n.choice label{display:flex;gap:12px;align-items:flex-start;padding:14px;border-radius:14px;border:1.5px solid var(--line2);cursor:pointer;transition:all .2s;background:var(--surface)}\n.choice label.on{border-color:var(--accent);background:var(--accent-bg);box-shadow:0 0 0 4px var(--accent-bg)}\n.choice input{accent-color:var(--accent);margin-top:3px}\n.choice b{display:block;margin-bottom:2px}\n.chk{width:16px;height:16px;accent-color:var(--accent)}\n.toggle{width:38px;height:22px;border-radius:11px;background:var(--surface3);border:1px solid var(--line2);position:relative;cursor:pointer;flex:none;transition:background .25s}\n.toggle::after{content:\"\";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dim);transition:left .3s var(--spring),background .25s}\n.toggle.on{background:var(--accent);border-color:var(--accent)}\n.toggle.on::after{left:18px;background:var(--on-accent)}\n.matrix td,.matrix th{text-align:center} .matrix td:first-child,.matrix th:first-child{text-align:left}\n.attn{display:flex;gap:12px;padding:12px 14px;border-radius:14px;background:var(--surface2);border:1px solid var(--line);cursor:pointer;transition:transform .2s var(--ease),border-color .2s;align-items:center}\n.attn:hover{transform:translateX(3px);border-color:var(--accent)}\n.attn .bar{width:4px;border-radius:4px;flex:none;align-self:stretch}\n.qcard{display:flex;flex-direction:column;gap:12px}\n.diff-old{text-decoration:line-through;color:var(--dim)}\n.diff-new{color:var(--accent);font-weight:700}\n.code{font-family:var(--mono);font-size:11.5px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px;white-space:pre;overflow-x:auto;max-height:180px;color:var(--muted)}\n\n/* overlays */\n.scrim{position:fixed;inset:0;background:var(--scrim);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);z-index:60;display:grid;place-items:center;padding:16px;animation:fade .25s var(--ease) both}\n.modal{background:var(--surface);border:1px solid var(--line);border-radius:22px;width:min(540px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:22px;display:flex;flex-direction:column;gap:16px;box-shadow:var(--shadow-lg);animation:pop .45s var(--spring) both}\n.scrim.closing{animation:fadeout .2s ease-in both} .scrim.closing .modal{animation:popout .2s ease-in both}\n@keyframes pop{from{opacity:0;transform:translateY(10px) scale(.95)}}\n@keyframes popout{to{opacity:0;transform:translateY(6px) scale(.97)}}\n.modal h3{margin:0;font-size:18px;font-weight:800;letter-spacing:-.01em}\n.modal .acts{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}\n.pal{place-items:start center;padding-top:12vh}\n.pal .modal{padding:0;gap:0;width:min(640px,100%)}\n.pal .ps{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--line)}\n.pal .ps input{flex:1;background:none;border:0;outline:0;font-size:16px;min-width:0}\n.pal .pr{max-height:50vh;overflow:auto;padding:8px}\n.pal .pi{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:12px;cursor:pointer}\n.pal .pi.on{background:var(--accent-bg)}\n.pal .pi .mono{font-size:11.5px;color:var(--muted)}\n.pal .pf{display:flex;gap:14px;padding:10px 18px;border-top:1px solid var(--line);font-size:11.5px;color:var(--dim)}\n.notif{position:absolute;right:max(16px,env(safe-area-inset-right,0px));top:62px;width:min(420px,calc(100vw - 32px));background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow-lg);overflow:hidden;transform-origin:top right;transition:opacity .25s var(--ease),transform .35s var(--spring),visibility .35s;opacity:0;transform:scale(.94) translateY(-6px);pointer-events:none;visibility:hidden}\n.notif.open{opacity:1;transform:none;pointer-events:auto;visibility:visible}\n.notif-h{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line)}\n.notif-i{display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);cursor:pointer;font-size:13px;transition:background .15s}\n.notif-i:hover{background:var(--surface2)}\n.notif-i.read{opacity:.5}\n.notif-i .w{font-size:11.5px;color:var(--dim);margin-top:3px}\n.toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));background:var(--fg);color:var(--bg);padding:11px 18px;border-radius:14px;z-index:70;font-size:13px;font-weight:600;box-shadow:var(--shadow-lg);max-width:calc(100vw - 32px);display:flex;gap:10px;align-items:center;animation:toastin .45s var(--spring) both;transform:translateX(-50%)}\n@keyframes toastin{from{opacity:0;transform:translate(-50%,16px) scale(.96)}}\n\n/* login */\n.login{min-height:100%;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)}\n.login-art{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;gap:24px;padding:40px;padding-left:max(40px,env(safe-area-inset-left,0px));border-right:1px solid var(--line);background:radial-gradient(700px 500px at 40% 45%,var(--halo1),transparent 70%),radial-gradient(500px 400px at 80% 90%,var(--halo2),transparent 70%)}\n.login-art svg.orb{position:absolute;left:50%;top:50%;width:min(620px,95%);transform:translate(-50%,-50%);overflow:visible}\n.orb .ring{fill:none;stroke:var(--line2);stroke-width:1.2}\n.orb .ring.d{stroke-dasharray:3 8}\n.orb .nd{fill:var(--surface);stroke:var(--accent);stroke-width:2}\n.orb .nd.ok{stroke:var(--ok)}\n.orb text{fill:var(--muted);font-size:12px;font-weight:600;font-family:var(--font)}\n.orb .sat{fill:var(--accent);filter:drop-shadow(0 0 6px var(--glow))}\n.login-art h2{position:relative;font-size:clamp(26px,3.2vw,40px);line-height:1.1;letter-spacing:-.03em;margin:0;font-weight:800;max-width:15ch;text-wrap:balance}\n.login-art h2 em{font-style:normal;background:linear-gradient(90deg,var(--accent),var(--violet));-webkit-background-clip:text;background-clip:text;color:transparent}\n.login-form{display:grid;place-items:center;padding-block:32px;padding-left:24px;padding-right:max(24px,env(safe-area-inset-right,0px))}\n.login-form .box{width:min(380px,100%);display:flex;flex-direction:column;gap:18px}\n.login-form h3{font-size:24px;margin:0;font-weight:800;letter-spacing:-.02em}\n\n@media (max-width:1180px){.kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.g64,.g3{grid-template-columns:minmax(0,1fr)}}\n@media (max-width:900px){\n  .app{grid-template-columns:minmax(0,1fr)}\n  .side{position:fixed;left:0;top:0;bottom:0;width:264px;transform:translateX(-105%);transition:transform .35s var(--ease);background:var(--surface)}\n  .side.open{transform:none;box-shadow:var(--shadow-lg)}\n  .burger{display:grid}\n  .g2,.choice{grid-template-columns:minmax(0,1fr)}\n  .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}\n  .top{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));gap:4px}\n  .content{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}\n  .top .crumb,.me .nm,.mock,.cmdk span,.cmdk kbd{display:none}\n  .top h1{font-size:17px}\n  .cmdk{min-width:0;padding:9px;border-radius:50%}\n  .hb{grid-template-columns:minmax(0,120px) minmax(0,1fr) 26px}\n  .login{grid-template-columns:minmax(0,1fr)}\n  .login-art{min-height:320px;border-right:0;border-bottom:1px solid var(--line);padding:24px}\n  .dtitle h2{font-size:20px}\n  .dhead,.dbody{padding-left:16px;padding-right:max(16px,env(safe-area-inset-right,0px))}\n  .dkeys{display:none}\n}\n@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.pipe .pt,.orb .sat{display:none}}\n\n/* ---- tambahan F1 ---- */\n/* Tambahan khusus mockup F1 */\n.mpanel{position:fixed;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:55;background:var(--surface);border:1px dashed var(--warn);border-radius:16px;box-shadow:var(--shadow-lg);width:min(300px,calc(100vw - 32px));font-size:12.5px;overflow:hidden}\n.mpanel summary{list-style:none;cursor:pointer;padding:10px 14px;font-weight:800;color:var(--warn);display:flex;align-items:center;gap:8px;letter-spacing:.04em;text-transform:uppercase;font-size:11px}\n.mpanel summary::-webkit-details-marker{display:none}\n.mpanel .mb{padding:0 14px 14px;display:flex;flex-direction:column;gap:10px}\n.mpanel .mb .lbl{font-weight:700;color:var(--muted);font-size:11px;letter-spacing:.06em;text-transform:uppercase}\n.mpanel .chips{display:flex;flex-wrap:wrap;gap:6px}\n.mpanel .chips button{font:inherit;font-size:12px;font-weight:600;border:1px solid var(--line2);background:var(--surface);color:var(--fg);border-radius:999px;padding:4px 10px;cursor:pointer}\n.mpanel .chips button.on{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}\n.term{font-family:var(--mono);font-variant-ligatures:none;font-size:12.5px;line-height:1.75;background:#0b1220;color:#cfe3f0;border-radius:14px;padding:16px 18px;overflow-x:auto;white-space:pre}\n.term .t{color:#6f8aa3} .term .ok{color:#5fe0a0} .term .k{color:#ffd479;font-weight:700} .term .c{color:#8fb3ff}\n.nav a.soon{opacity:.45;cursor:not-allowed}\n.nav a.soon .cnt{background:transparent;border:1px solid var(--line2);color:var(--muted);font-weight:600}\n.rules{display:flex;flex-direction:column;gap:6px;font-size:12.5px}\n.rules span{display:flex;gap:8px;align-items:center;color:var(--muted)}\n.rules span.ok{color:var(--ok)}\n.rules i{width:16px;height:16px;border-radius:50%;border:1.5px solid currentColor;display:grid;place-items:center;font-style:normal;font-size:10px;font-weight:800}\n.secret{display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:14px;background:var(--surface2);border:1px dashed var(--accent);font-family:var(--mono);font-size:20px;font-weight:600;letter-spacing:.08em;font-variant-ligatures:none}\n.secret .btn{font-family:var(--font);letter-spacing:0;font-size:12.5px}\n.denied{display:grid;place-items:center;text-align:center;padding:60px 20px;gap:10px}\n.denied .big{width:64px;height:64px;border-radius:20px;background:var(--crit-bg);color:var(--crit);display:grid;place-items:center}\n.denied .big svg{width:32px;height:32px}\n.res-ok{color:var(--ok);font-weight:700} .res-no{color:var(--crit);font-weight:700}\n.check{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line);font-size:13px}\n.check:last-child{border-bottom:0}\n.check .d{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;flex:none}\n.check .d.y{background:var(--ok);color:var(--on-accent)} .check .d.n{background:var(--surface3);color:var(--muted)}\n/* Users: avatar status, menu ⋮, panel user */\n.ava{--s:34px;width:var(--s);height:var(--s);border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:calc(var(--s)*.36);color:var(--on-accent);background:linear-gradient(135deg,var(--accent),var(--violet));box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--ring,transparent);flex:none;letter-spacing:.02em}\n.ava.on{--ring:var(--ok)} .ava.pw{--ring:var(--warn)} .ava.lock{--ring:var(--crit)} .ava.off{--ring:var(--line2);filter:grayscale(1);opacity:.55}\n.rbadge{display:inline-flex;gap:6px;align-items:center;font-size:12px;font-weight:700;padding:3px 10px 3px 7px;border-radius:999px;background:var(--surface2);box-shadow:inset 0 0 0 1px var(--line)}\n.rbadge svg{width:15px;height:15px;fill:currentColor}\n.rbadge.ADMIN{background:var(--accent-bg);color:var(--accent);box-shadow:none} .rbadge.VIEWER{color:var(--muted)}\n.menu{position:fixed;z-index:65;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg);padding:6px;width:250px;animation:pop .25s var(--spring) both}\n.menu button{display:flex;gap:10px;align-items:flex-start;width:100%;border:0;background:none;padding:9px 12px;border-radius:10px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;color:var(--fg);text-align:left}\n.menu button:hover:not([disabled]){background:var(--surface2)} .menu button.danger{color:var(--crit)} .menu button[disabled]{opacity:.5;cursor:not-allowed}\n.menu button svg{width:18px;height:18px;fill:currentColor;flex:none;margin-top:1px}\n.menu small{display:block;color:var(--muted);font-size:11.5px;font-weight:500}\n.menu hr{border:0;border-top:1px solid var(--line);margin:4px 6px}\n.idcard{position:relative;overflow:hidden;border-radius:20px;padding:20px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 15%,var(--surface)),color-mix(in srgb,var(--violet) 13%,var(--surface)));border:1px solid var(--line);display:flex;gap:16px;align-items:center;min-height:118px}\n.idcard::before,.idcard::after{content:\"\";position:absolute;border-radius:50%;border:1.5px dashed color-mix(in srgb,var(--accent) 35%,transparent);pointer-events:none}\n.idcard::before{width:240px;height:240px;right:-90px;top:-110px} .idcard::after{width:150px;height:150px;right:-30px;top:-55px;border-style:solid;border-color:color-mix(in srgb,var(--violet) 25%,transparent)}\n.idcard .who{min-width:0;position:relative;z-index:1}\n.idcard .who b{display:block;font-size:19px;font-weight:800;letter-spacing:-.02em;overflow-wrap:anywhere}\n.idcard .who .mono{color:var(--muted)}\n.rcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}\n.rcard{border:1.5px solid var(--line2);border-radius:14px;padding:12px;background:var(--surface);cursor:pointer;text-align:left;font:inherit;color:var(--fg);display:flex;flex-direction:column;gap:3px;transition:border-color .2s,background .2s,box-shadow .2s,transform .15s}\n.rcard:hover{transform:translateY(-1px)}\n.rcard.on{border-color:var(--accent);background:var(--accent-bg);box-shadow:0 0 0 4px var(--accent-bg)}\n.rcard svg{width:22px;height:22px;fill:var(--accent);margin-bottom:4px}\n.rcard b{font-size:14px} .rcard small{color:var(--muted);font-size:11.5px;line-height:1.35}\n.perms{display:flex;flex-wrap:wrap;gap:6px}\n.perms span{font-size:11.5px;padding:3px 9px;border-radius:999px;background:var(--surface2);border:1px solid var(--line)}\n.perms.anim span:not(.no){animation:rise .3s var(--ease) both;animation-delay:calc(var(--i)*22ms)}\n.perms span.no{opacity:.4;text-decoration:line-through;animation:none}\n.strength{height:6px;border-radius:3px;background:var(--surface3);overflow:hidden;margin-top:8px}\n.strength i{display:block;height:100%;border-radius:3px;transition:width .3s,background .3s}\n.sect{display:flex;flex-direction:column;gap:12px}\n.sect>.eyebrow{margin-bottom:-2px}\n.swrow{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:14px;background:var(--surface2);border:1px solid var(--line)}\n.swrow b{display:block;font-size:13.5px} .swrow small{color:var(--muted);font-size:12px}\n.danger-zone{border:1px solid color-mix(in srgb,var(--crit) 35%,transparent);border-radius:14px;padding:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}\n.btn.danger{border-color:var(--crit);color:var(--crit);background:transparent}\n.sfoot{display:flex;gap:8px;justify-content:flex-end;padding-block:14px;padding-left:24px;padding-right:max(24px,env(safe-area-inset-right,0px));border-top:1px solid var(--line);background:var(--surface)}\n.ussheet .dbody{display:flex;flex-direction:column;gap:22px}\n\n/* ---- aplikasi ---- */\n.boot{min-height:100vh;display:grid;place-items:center;gap:14px;text-align:center;padding:24px}\n.spinner{width:34px;height:34px;border-radius:50%;border:3px solid var(--line2);border-top-color:var(--accent);animation:spin 1s linear infinite}\n.loading{display:flex;gap:12px;align-items:center;justify-content:center;padding:48px;color:var(--muted)}\n.toast.err{background:var(--crit);color:#fff}\n.btn.busy{opacity:.6;pointer-events:none}\n</style>\n<div class=\"sky\" aria-hidden=\"true\"></div>\n<div id=\"root\"><div class=\"boot\"><div><div class=\"spinner\" style=\"margin:0 auto 12px\"></div><div style=\"color:#7b8d99;font:14px system-ui\">Memuat Status Kontrak Manager…</div></div></div></div>\n<div id=\"sheet-root\"></div>\n<div id=\"overlay-root\"></div>\n<script>\n/* Ikon inline SVG (tanpa CDN). */\nconst IC={\ndash:\"M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z\",\ndoc:\"M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z\",\nwarn:\"M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z\",\ninbox:\"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.34 3-3 3s-3-1.34-3-3H5V5h14v10z\",\nsync:\"M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z\",\ngear:\"M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z\",\nlog:\"M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z\",\nbell:\"M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z\",\nsearch:\"M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z\",\ndl:\"M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z\",\nadd:\"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z\",\nmenu:\"M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z\",\nx:\"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\",\ncheck:\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z\",\nup:\"M7 14l5-5 5 5z\", down:\"M7 10l5 5 5-5z\",\nchevL:\"M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z\", chevR:\"M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z\",\neye:\"M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z\",\nup2:\"M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z\",\nflag:\"M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z\",\nperson:\"M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\",\nsun:\"M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z\",\nmoon:\"M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z\",\nauto:\"M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm1-17.93c3.94.49 7 3.85 7 7.93s-3.05 7.44-7 7.93V4.07z\",\ncopy:\"M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z\",\nlink:\"M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z\"\n};\nconst ic=(n,c='')=>`<svg class=\"i ${c}\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"${IC[n]}\"/></svg>`;\nconst esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\nconst rp=n=>n==null?'—':'Rp '+Number(n).toLocaleString('id-ID');\nconst rpShort=n=>n>=1e12?'Rp '+(n/1e12).toLocaleString('id-ID',{maximumFractionDigits:1})+' T':n>=1e9?'Rp '+(n/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M':'Rp '+Math.round(n/1e6).toLocaleString('id-ID')+' jt';\nconst REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;\nconst LOGO=`<svg viewBox=\"0 0 40 40\" aria-hidden=\"true\"><defs><linearGradient id=\"lg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"var(--accent)\"/><stop offset=\"1\" stop-color=\"var(--violet)\"/></linearGradient></defs><rect width=\"40\" height=\"40\" rx=\"12\" fill=\"url(#lg)\"/><circle cx=\"20\" cy=\"20\" r=\"11\" fill=\"none\" stroke=\"var(--on-accent)\" stroke-opacity=\".45\" stroke-width=\"1.5\"/><circle cx=\"20\" cy=\"20\" r=\"4.5\" fill=\"var(--on-accent)\"/><g class=\"orbit-sat\"><circle cx=\"31\" cy=\"20\" r=\"2.6\" fill=\"var(--on-accent)\"/></g></svg>`;\nIC.lock=\"M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z\";\nIC.users=\"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z\";\nIC.shield=\"M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z\";\nIC.db=\"M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.59 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2-6-1.5-6-2 2.13-2 6-2zm6 12c0 .5-2.13 2-6 2s-6-1.5-6-2v-2.23c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V17zm0-4c0 .5-2.13 2-6 2s-6-1.5-6-2v-2.23c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V13z\";\nIC.more=\"M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z\";\nIC.trash=\"M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z\";\nIC.edit=\"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z\";\nIC.block=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z\";\nIC.home=\"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z\";\nIC.key=\"M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z\";\n\n/* ================= Status Kontrak Manager · UI F1 ================= */\n'use strict';\n\nconst S = {\n  token: null, me: null, app: null, katalog: [], theme: 'system', page: 'beranda',\n  users: null, roles: null, uf: '', uq: '', logF: { user: '', aksi: '', hasil: '' }, roleDraft: null,\n  form: null, formOrig: null, formErr: '', permAnim: false, loginErr: null, gantiErr: '', pw1: '', pw2: '', pwLama: ''\n};\nconst store = {\n  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },\n  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }\n};\nS.token = store.get('skm-token');\nS.theme = store.get('skm-theme') || 'system';\nfunction applyTheme() { const r = document.documentElement; S.theme === 'system' ? r.removeAttribute('data-theme') : r.setAttribute('data-theme', S.theme); }\napplyTheme();\n\nconst can = p => !!(S.me && S.me.izin && S.me.izin.indexOf(p) >= 0);\nconst $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);\n\n/* ---------------- panggilan server ---------------- */\nfunction call(aksi, payload) {\n  return new Promise((resolve, reject) => {\n    if (!window.google || !google.script || !google.script.run) {\n      reject({ kode: 'TANPA_SERVER', pesan: 'Halaman ini harus dibuka lewat URL web app.' }); return;\n    }\n    google.script.run\n      .withSuccessHandler(r => {\n        if (r && r.ok) { resolve(r.data); return; }\n        r = r || { kode: 'ERROR', pesan: 'Tidak ada jawaban dari server.' };\n        if (r.kode === 'SESI_HABIS' && S.me) sesiHabis(r.pesan);\n        else if (r.kode === 'WAJIB_GANTI' && S.me) { S.me.wajibGanti = true; go('ganti'); }\n        reject(r);\n      })\n      .withFailureHandler(e => reject({ kode: 'JARINGAN', pesan: 'Tidak bisa menghubungi server: ' + (e && e.message || e) }))\n      .api(S.token, aksi, payload || {});\n  });\n}\nfunction busy(btn, on) { if (btn) { btn.classList.toggle('busy', on); btn.disabled = on; } }\nfunction gagal(e) { if (e && e.kode !== 'SESI_HABIS' && e.kode !== 'WAJIB_GANTI') toast(e.pesan || String(e), true); }\nfunction sesiHabis(pesan) {\n  S.me = null; S.token = null; store.set('skm-token', null); closeSheet(true); closeMenu();\n  document.getElementById('overlay-root').innerHTML = '';\n  S.loginErr = { msg: esc(pesan || 'Sesi Anda berakhir. Silakan masuk lagi.'), kind: 'info' };\n  go('login');\n}\n\n/* ---------------- boot & navigasi ---------------- */\nasync function boot() {\n  try {\n    const st = await call('status');\n    S.app = st.app;\n    if (!st.siap) { renderBelumSetup(); return; }\n    if (S.token) {\n      try { const m = await call('me'); S.me = m.user; S.app = m.app; S.katalog = m.katalog; }\n      catch (e) { S.token = null; store.set('skm-token', null); }\n    }\n    go(S.me ? (S.me.wajibGanti ? 'ganti' : 'beranda') : 'login');\n  } catch (e) { renderFatal(e.pesan || String(e)); }\n}\nfunction go(page) { S.page = page; closeMenu(); render(); window.scrollTo(0, 0); }\nasync function refreshMe() { try { const m = await call('me'); S.me = m.user; } catch (e) { /* ditangani call() */ } }\n\nconst PAGES = {\n  beranda: { title: () => 'Selamat datang, ' + S.me.nama, crumb: 'Fondasi aplikasi (F1)' },\n  users: { title: () => 'Users', crumb: 'Akun tim FF', izin: 'user.kelola' },\n  role: { title: () => 'Role & izin', crumb: 'Hak akses berupa data, bisa diubah tanpa ubah kode', izin: 'user.kelola' },\n  sistem: { title: () => 'Sistem', crumb: 'Database, skema, dan kesehatan aplikasi', izin: 'user.kelola' },\n  log: { title: () => can('log.semua') ? 'Log' : 'Log saya', crumb: () => can('log.semua') ? 'Semua aksi, hanya ditambah' : 'Aksi yang Anda lakukan' }\n};\nconst SOON = [['dashboard', 'Dashboard', 'dash', 'F3'], ['kontrak', 'Kontrak', 'doc', 'F2'], ['perhatian', 'Perlu Perhatian', 'warn', 'F3'], ['antrian', 'Antrian', 'inbox', 'F4b'], ['gsheet', 'Google Sheet', 'sync', 'F4a']];\n\nfunction render() {\n  const root = document.getElementById('root');\n  if (S.page === 'login' || !S.me) { root.innerHTML = viewLogin(); bindLogin(); return; }\n  if (S.page === 'ganti' || S.me.wajibGanti) { S.page = 'ganti'; root.innerHTML = viewGanti(); bindGanti(); return; }\n  const P = PAGES[S.page] || PAGES.beranda;\n  root.innerHTML = shell(P.title(), typeof P.crumb === 'function' ? P.crumb() : P.crumb);\n  bindShell();\n  loadPage(S.page);\n}\nasync function loadPage(page) {\n  const c = document.getElementById('content');\n  const show = html => {\n    if (S.page !== page || !c.isConnected) return;\n    c.innerHTML = html; [...c.children].forEach((el, i) => el.style.setProperty('--i', i));\n    if (!REDUCED) { c.classList.add('enter'); setTimeout(() => c.classList.remove('enter'), 1400); }\n  };\n  try {\n    if (page === 'beranda') { show(viewHome()); return; }\n    c.innerHTML = '<div class=\"loading\"><div class=\"spinner\"></div>Memuat…</div>';\n    if (page === 'users') { S.users = await call('users.list'); show(viewUsers()); bindUsers(); }\n    else if (page === 'role') { S.roles = await call('roles.list'); S.roleDraft = null; show(viewRole()); bindRole(); }\n    else if (page === 'sistem') { S.sistem = await call('sistem.info'); show(viewSistem()); bindSistem(); }\n    else if (page === 'log') { S.log = await call('log.list', S.logF); show(viewLog()); bindLog(); }\n  } catch (e) {\n    if (e.kode === 'IZIN_DITOLAK') show(viewDenied(e.pesan));\n    else if (e.kode !== 'SESI_HABIS' && e.kode !== 'WAJIB_GANTI') show(`<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(e.pesan || String(e))}</span></div>`);\n  }\n}\n\n/* ---------------- layar khusus ---------------- */\nfunction renderBelumSetup() {\n  document.getElementById('root').innerHTML = `<div class=\"boot\"><div class=\"card\" style=\"max-width:520px;text-align:left;display:flex;flex-direction:column;gap:12px\">\n    <div class=\"brand\" style=\"padding:0\">${LOGO}<div><b>${esc(S.app ? S.app.nama : 'Status Kontrak Manager')}</b><span>Belum siap dipakai</span></div></div>\n    <div class=\"note warn\">${ic('db', 's')}<span class=\"tx\">Database belum dibuat. Buka editor Apps Script, pilih fungsi <span class=\"mono\">setup</span>, lalu klik <b>Run</b>. Setelah selesai, muat ulang halaman ini.</span></div></div></div>`;\n}\nfunction renderFatal(msg) {\n  document.getElementById('root').innerHTML = `<div class=\"boot\"><div class=\"card\" style=\"max-width:520px;text-align:left\"><h2>Aplikasi tidak bisa dimuat</h2><div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(msg)}</span></div><button class=\"btn\" onclick=\"location.reload()\" style=\"margin-top:12px\">Coba lagi</button></div></div>`;\n}\n\n/* ---------------- shell ---------------- */\nconst avatarOf = u => `<span class=\"av\">${esc(String(u.nama || u.username || '?')[0].toUpperCase())}</span>`;\nfunction shell(title, crumb) {\n  const a = (h, l, i) => `<a href=\"#\" data-go=\"${h}\" class=\"${S.page === h ? 'on' : ''}\">${ic(i)}<span>${l}</span></a>`;\n  const soon = ([h, l, i, f]) => `<a class=\"soon\" aria-disabled=\"true\" title=\"Dibangun di ${f}\">${ic(i)}<span>${l}</span><span class=\"cnt\">${f}</span></a>`;\n  return `<div class=\"app\">\n   <aside class=\"side\" id=\"side\">\n    <div class=\"brand\">${LOGO}<div><b>Status Kontrak<br>Manager</b><span>Unit Fulfillment</span></div></div>\n    <nav class=\"nav\">${a('beranda', 'Beranda', 'home')}${SOON.map(soon).join('')}\n     ${can('user.kelola') ? `<div class=\"eyebrow\" style=\"padding:16px 12px 6px;font-size:10.5px\">Pengaturan</div>${a('users', 'Users', 'users')}${a('role', 'Role & izin', 'shield')}${a('sistem', 'Sistem', 'db')}` : ''}\n     <div style=\"height:8px\"></div>${a('log', can('log.semua') ? 'Log' : 'Log saya', 'log')}</nav>\n    <div class=\"side-foot\"><span class=\"live\"><span class=\"pulse\"></span>Versi ${esc(S.app.versi)} · ${esc(S.app.fase)}</span><span>Skema database v${S.app.skema}</span><span class=\"dim\">Menu redup dibangun di fase berikutnya</span></div>\n   </aside>\n   <div class=\"main\">\n    <header class=\"top\">\n     <button class=\"iconbtn burger\" id=\"burger\" aria-label=\"Menu\">${ic('menu')}</button>\n     <div style=\"min-width:0\"><h1>${esc(title)}</h1><div class=\"crumb\">${esc(crumb)}</div></div>\n     <div class=\"sp\"></div>\n     <button class=\"iconbtn\" id=\"themeBtn\" aria-label=\"Ganti tema\" title=\"Ganti tema\">${ic({ system: 'auto', light: 'sun', dark: 'moon' }[S.theme])}</button>\n     <button class=\"me\" id=\"meBtn\">${avatarOf(S.me)}<span class=\"nm\">${esc(S.me.nama)} · ${esc(S.me.role)}</span></button>\n    </header>\n    <main class=\"content\" id=\"content\"></main>\n   </div></div>`;\n}\nfunction bindShell() {\n  $('#burger').onclick = e => { e.stopPropagation(); $('#side').classList.toggle('open'); };\n  $('#themeBtn').onclick = e => cycleTheme(e);\n  $$('[data-go]').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.go); });\n  $('#meBtn').onclick = () => modal(esc(S.me.nama) + ' · ' + esc(S.me.role),\n    `<dl class=\"kv\"><dt>Username</dt><dd class=\"mono\">${esc(S.me.username)}</dd><dt>Alias PIC</dt><dd>${esc(S.me.alias) || '—'}</dd><dt>Sesi</dt><dd>berakhir setelah ${S.app.sesiJam} jam tanpa aktivitas</dd></dl>`,\n    [{ l: 'Ganti password', fn: () => { S.pw1 = S.pw2 = S.pwLama = ''; S.gantiErr = ''; go('ganti'); } },\n     { l: 'Keluar', pri: true, fn: () => { call('logout').catch(() => {}); S.me = null; S.token = null; store.set('skm-token', null); S.loginErr = null; go('login'); } }]);\n}\nfunction cycleTheme(e) {\n  const order = ['system', 'light', 'dark'], next = order[(order.indexOf(S.theme) + 1) % 3];\n  const apply = () => { S.theme = next; applyTheme(); store.set('skm-theme', next); const b = $('#themeBtn'); if (b) b.innerHTML = ic({ system: 'auto', light: 'sun', dark: 'moon' }[next]); };\n  if (!document.startViewTransition || REDUCED) { apply(); return; }\n  const x = e.clientX, y = e.clientY, r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));\n  document.startViewTransition(apply).ready.then(() => document.documentElement.animate(\n    { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },\n    { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});\n}\n\n/* ---------------- login & ganti password ---------------- */\nfunction orbit() {\n  const ts = ['Kompulir', 'Drafting', 'Review', 'Sirkulir', 'BAST Done', 'Takeout'], cx = 310, cy = 300, rx = 250, ry = 96;\n  const ep = `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0`;\n  return `<svg class=\"orb\" viewBox=\"0 0 620 600\" aria-hidden=\"true\"><defs><radialGradient id=\"pl\" cx=\".35\" cy=\".3\"><stop offset=\"0\" stop-color=\"var(--accent-hi)\"/><stop offset=\".6\" stop-color=\"var(--accent)\"/><stop offset=\"1\" stop-color=\"var(--violet)\"/></radialGradient></defs><g transform=\"rotate(-12 ${cx} ${cy})\"><ellipse class=\"ring\" cx=\"${cx}\" cy=\"${cy}\" rx=\"${rx}\" ry=\"${ry}\"/><ellipse class=\"ring d\" cx=\"${cx}\" cy=\"${cy}\" rx=\"${rx * .66}\" ry=\"${ry * .62}\"/><circle cx=\"${cx}\" cy=\"${cy}\" r=\"52\" fill=\"url(#pl)\" style=\"filter:drop-shadow(0 0 40px var(--glow))\"/>${ts.map((t, i) => { const a = Math.PI * (1 + i * 1.9 / 5), x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a); return `<circle class=\"nd ${i === 5 ? 'ok' : ''}\" cx=\"${x.toFixed(1)}\" cy=\"${y.toFixed(1)}\" r=\"7\"/><text x=\"${x.toFixed(1)}\" y=\"${(y + (Math.sin(a) > 0.05 ? 26 : -16)).toFixed(1)}\" text-anchor=\"middle\">${t}</text>`; }).join('')}${REDUCED ? '' : `<circle class=\"sat\" r=\"4.5\"><animateMotion dur=\"16s\" repeatCount=\"indefinite\" path=\"${ep}\"/></circle>`}</g></svg>`;\n}\nconst art = () => `<div class=\"login-art\"><div class=\"brand\" style=\"padding:0;position:relative\">${LOGO}<div><b>${esc(S.app.nama)}</b><span>Unit Fulfillment</span></div></div>${orbit()}<h2>Status BAST di satu tempat. <em>Semua sheet unit ikut seragam.</em></h2></div>`;\n\nfunction viewLogin() {\n  const e = S.loginErr;\n  return `<div class=\"login\">${art()}<div class=\"login-form\"><form class=\"box\" id=\"lform\" novalidate>\n   <div><div class=\"eyebrow\">Masuk</div><h3>Selamat datang</h3></div>\n   ${e ? `<div class=\"note ${e.kind}\">${ic(e.kind === 'crit' ? 'lock' : e.kind === 'info' ? 'person' : 'warn', 's')}<span class=\"tx\">${e.msg}</span></div>` : ''}\n   <label class=\"of\"><span>Username</span><input class=\"inp\" id=\"lu\" value=\"${esc(e && e.u || '')}\" autocomplete=\"username\" autocapitalize=\"none\" spellcheck=\"false\"></label>\n   <label class=\"of\"><span>Password</span><input class=\"inp\" id=\"lp\" type=\"password\" autocomplete=\"current-password\"><small>Lupa password? Minta admin FF untuk mereset.</small></label>\n   <button class=\"btn pri\" type=\"submit\" id=\"lbtn\" style=\"justify-content:center;padding:12px\">Masuk</button>\n   <div class=\"row\" style=\"justify-content:space-between\"><span class=\"dim\" style=\"font-size:12px\">v${esc(S.app.versi)}</span><button type=\"button\" class=\"iconbtn\" id=\"lgTheme\" aria-label=\"Ganti tema\">${ic({ system: 'auto', light: 'sun', dark: 'moon' }[S.theme])}</button></div>\n  </form></div></div>`;\n}\nfunction bindLogin() {\n  setTimeout(() => (($('#lu').value ? $('#lp') : $('#lu')) || {}).focus && ($('#lu').value ? $('#lp') : $('#lu')).focus(), 50);\n  $('#lgTheme').onclick = e => { cycleTheme(e); setTimeout(() => { const b = $('#lgTheme'); if (b) b.innerHTML = ic({ system: 'auto', light: 'sun', dark: 'moon' }[S.theme]); }, 30); };\n  $('#lform').onsubmit = async ev => {\n    ev.preventDefault();\n    const u = $('#lu').value.trim(), p = $('#lp').value, btn = $('#lbtn');\n    if (!u || !p) { S.loginErr = { msg: 'Isi username dan password.', kind: 'warn', u }; render(); return; }\n    busy(btn, true);\n    try {\n      const r = await call('login', { username: u, password: p });\n      S.token = r.token; store.set('skm-token', r.token); S.me = r.user; S.app = r.app; S.loginErr = null;\n      call('me').then(m => { S.katalog = m.katalog; }).catch(() => {});\n      S.pw1 = S.pw2 = S.pwLama = ''; S.gantiErr = '';\n      go(r.user.wajibGanti ? 'ganti' : 'beranda');\n    } catch (e) {\n      S.loginErr = { msg: esc(e.pesan || String(e)), kind: e.kode === 'TERKUNCI' || e.kode === 'AKUN_NONAKTIF' ? 'crit' : 'warn', u };\n      render();\n    }\n  };\n}\n\nfunction pwRules() {\n  const a = S.pw1, b = S.pw2, min = S.app.passwordMin || 8;\n  const r = [[a.length >= min, 'Minimal ' + min + ' karakter'], [/[A-Za-z]/.test(a) && /\\d/.test(a), 'Berisi huruf dan angka'], [!!a && a === b, 'Kedua isian sama']];\n  if (!S.me.wajibGanti) r.splice(2, 0, [!!a && a !== S.pwLama, 'Berbeda dari password lama']);\n  return r;\n}\nfunction rulesHtml() { return pwRules().map(([y, t]) => `<span class=\"${y ? 'ok' : ''}\"><i>${y ? '✓' : ''}</i>${t}</span>`).join(''); }\nfunction viewGanti() {\n  const wajib = S.me.wajibGanti, ok = pwRules().every(x => x[0]);\n  return `<div class=\"login\">${art()}<div class=\"login-form\"><form class=\"box\" id=\"gform\" novalidate>\n   <div><div class=\"eyebrow\">${wajib ? 'Login pertama' : 'Ganti password'}</div><h3>Buat password baru</h3></div>\n   ${wajib ? `<div class=\"note info\">${ic('key', 's')}<span class=\"tx\">Halo <b>${esc(S.me.nama)}</b>, password sementara harus diganti sebelum masuk ke aplikasi.</span></div>` : ''}\n   ${S.gantiErr ? `<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(S.gantiErr)}</span></div>` : ''}\n   ${wajib ? '' : `<label class=\"of\"><span>Password lama</span><input class=\"inp\" type=\"password\" id=\"pw0\" value=\"${esc(S.pwLama)}\" autocomplete=\"current-password\"></label>`}\n   <label class=\"of\"><span>Password baru</span><input class=\"inp\" type=\"password\" id=\"pw1\" value=\"${esc(S.pw1)}\" autocomplete=\"new-password\"></label>\n   <label class=\"of\"><span>Ulangi password baru</span><input class=\"inp\" type=\"password\" id=\"pw2\" value=\"${esc(S.pw2)}\" autocomplete=\"new-password\"></label>\n   <div class=\"rules\" id=\"rules\">${rulesHtml()}</div>\n   <button class=\"btn pri\" type=\"submit\" id=\"gsave\" style=\"justify-content:center;padding:12px\" ${ok ? '' : 'disabled'}>${wajib ? 'Simpan &amp; masuk' : 'Simpan password'}</button>\n   ${wajib ? `<button type=\"button\" class=\"btn ghost sm\" id=\"gout\" style=\"align-self:flex-start\">Keluar</button>` : `<button type=\"button\" class=\"btn ghost sm\" id=\"gback\" style=\"align-self:flex-start\">Batal</button>`}\n  </form></div></div>`;\n}\nfunction bindGanti() {\n  const upd = () => {\n    S.pw1 = $('#pw1').value; S.pw2 = $('#pw2').value; if ($('#pw0')) S.pwLama = $('#pw0').value;\n    $('#rules').innerHTML = rulesHtml(); $('#gsave').disabled = !pwRules().every(x => x[0]);\n  };\n  ['pw0', 'pw1', 'pw2'].forEach(id => { const el = document.getElementById(id); if (el) el.oninput = upd; });\n  setTimeout(() => ($('#pw0') || $('#pw1')).focus(), 50);\n  if ($('#gback')) $('#gback').onclick = () => go('beranda');\n  if ($('#gout')) $('#gout').onclick = () => { call('logout').catch(() => {}); S.me = null; S.token = null; store.set('skm-token', null); go('login'); };\n  $('#gform').onsubmit = async ev => {\n    ev.preventDefault();\n    if (!pwRules().every(x => x[0])) return;\n    const btn = $('#gsave'); busy(btn, true);\n    try {\n      const r = await call('gantiPassword', { lama: S.pwLama, baru: S.pw1 });\n      S.me = Object.assign(S.me, r.user); S.pw1 = S.pw2 = S.pwLama = ''; S.gantiErr = '';\n      await refreshMe(); go('beranda'); toast('Password diganti. Password lama tidak berlaku lagi.');\n    } catch (e) { S.gantiErr = e.pesan || String(e); render(); }\n  };\n}\n\n/* ---------------- beranda ---------------- */\nfunction viewHome() {\n  const done = ['Database & migrasi skema otomatis', 'Login, sesi ' + S.app.sesiJam + ' jam, kunci akun setelah salah password berulang', 'Users, Role & izin (dicek di server)', 'Log semua aksi', 'Tema terang/gelap'];\n  const next = [['F2', 'Kontrak, BAST/BAA, tahap, kendala, Nilai Push'], ['F3', 'Import data lama, Dashboard, Perlu Perhatian'], ['F4a', 'Script penerima & update ke sheet unit'], ['F4b', 'Jejak sel, notifikasi, Antrian, sinkron otomatis'], ['F5', 'Export & backup']];\n  return `<div class=\"card hero\" style=\"padding:24px\"><div class=\"row\" style=\"position:relative;align-items:flex-start\"><div style=\"flex:1 1 320px\"><div class=\"eyebrow\">Versi ${esc(S.app.versi)} · fase ${esc(S.app.fase)}</div><h2 style=\"font-size:22px;margin:6px 0\">Fondasi aplikasi sudah berjalan</h2>\n    <p class=\"muted\" style=\"margin:0;max-width:60ch\">${can('user.kelola') ? 'Buat akun untuk setiap anggota tim di menu <b>Users</b>, lalu cek hak aksesnya di <b>Role &amp; izin</b>.' : 'Menu lain akan aktif bertahap sesuai fase.'}</p></div>\n    ${can('user.kelola') ? `<button class=\"btn pri\" data-go2=\"users\">${ic('users', 's')}Kelola users</button>` : ''}</div></div>\n   <div class=\"grid g2\">\n    <div class=\"card\"><h2>Sudah tersedia</h2>${done.map(t => `<div class=\"check\"><span class=\"d y\">✓</span><span>${t}</span></div>`).join('')}</div>\n    <div class=\"card\"><h2>Berikutnya</h2>${next.map(([f, t]) => `<div class=\"check\"><span class=\"d n\">${f}</span><span>${t}</span></div>`).join('')}</div>\n   </div>`;\n}\ndocument.addEventListener('click', e => { const b = e.target.closest('[data-go2]'); if (b) go(b.dataset.go2); });\n\n/* ---------------- users ---------------- */\nconst ROLE_META = { ADMIN: ['shield', 'Akses penuh'], STAFF: ['person', 'Isi & kelola'], VIEWER: ['eye', 'Hanya melihat'] };\nconst roleMeta = r => ROLE_META[r] || ['users', 'Role khusus'];\nconst initials = n => String(n || '').trim().split(/\\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';\nconst RING = { AKTIF: 'on', WAJIB_GANTI: 'pw', TERKUNCI: 'lock', NONAKTIF: 'off' };\nconst stLabel = u => ({ AKTIF: 'Aktif', WAJIB_GANTI: 'Wajib ganti password', TERKUNCI: 'Terkunci s/d ' + u.terkunciSampai, NONAKTIF: 'Nonaktif' })[u.status];\nconst ava = (u, size) => `<span class=\"ava ${RING[u.status] || 'on'}\" ${size ? `style=\"--s:${size}px\"` : ''} title=\"${esc(stLabel(u))}\">${esc(initials(u.nama || u.username))}</span>`;\nconst rbadge = r => `<span class=\"rbadge ${esc(r)}\">${ic(roleMeta(r)[0])}${esc(r)}</span>`;\nfunction stPill(u) { const k = RING[u.status]; return `<span class=\"pill ${{ on: 'p-ok', pw: 'p-warn', lock: 'p-crit', off: 'p-dim' }[k]}\">${k === 'lock' ? ic('lock', 's') : '<span class=\"dot\"></span>'}${esc(stLabel(u))}</span>`; }\nconst UF = [['', 'Semua', u => true], ['ADMIN', 'Admin', u => u.role === 'ADMIN' && u.aktif], ['STAFF', 'Staff', u => u.role === 'STAFF' && u.aktif], ['VIEWER', 'Viewer', u => u.role === 'VIEWER' && u.aktif],\n  ['pw', 'Wajib ganti password', u => u.status === 'WAJIB_GANTI'], ['lock', 'Terkunci', u => u.status === 'TERKUNCI'], ['off', 'Nonaktif', u => !u.aktif]];\nfunction viewUsers() {\n  const list = S.users.users, f = UF.find(x => x[0] === S.uf) || UF[0], q = S.uq.toLowerCase();\n  const rows = list.filter(f[2]).filter(u => !q || (u.username + ' ' + u.nama + ' ' + u.alias).toLowerCase().includes(q));\n  return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:14px\">\n   <div class=\"row\"><div class=\"search\">${ic('search', 's')}<input id=\"uq\" placeholder=\"Cari username, nama, alias PIC…\" aria-label=\"Cari user\" value=\"${esc(S.uq)}\"></div><span class=\"sp\"></span><button class=\"btn pri\" id=\"addUser\">${ic('add', 's')}Tambah user</button></div>\n   <div class=\"row\">${UF.map(([k, l, t]) => `<button class=\"chipf ${S.uf === k ? 'on' : ''}\" data-uf=\"${k}\">${l} <b>${list.filter(t).length}</b></button>`).join('')}</div>\n   <div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>User</th><th>Alias PIC</th><th>Role</th><th>Status</th><th>Login terakhir</th><th style=\"width:48px\"></th></tr></thead><tbody>\n   ${rows.map(u => `<tr class=\"click\" data-row=\"${esc(u.username)}\"><td><div class=\"row\" style=\"flex-wrap:nowrap;gap:12px\">${ava(u)}<div style=\"min-width:0\"><b>${esc(u.nama)}</b>${u.username === S.me.username ? ' <span class=\"pill p-acc\" style=\"font-size:10.5px;padding:0 7px\">Anda</span>' : ''}<div class=\"mono dim\" style=\"font-size:11.5px\">${esc(u.username)}</div></div></div></td>\n    <td>${u.alias ? `<span class=\"pill p-dim\">${esc(u.alias)}</span>` : '<span class=\"dim\">—</span>'}</td><td>${rbadge(u.role)}</td><td>${stPill(u)}</td>\n    <td class=\"tnum muted\">${esc(u.loginTerakhir ? u.loginTerakhir.slice(0, 16) : '—')}</td><td><button class=\"iconbtn\" data-kebab=\"${esc(u.username)}\" aria-label=\"Aksi untuk ${esc(u.nama)}\">${ic('more')}</button></td></tr>`).join('') || '<tr><td colspan=\"6\" class=\"muted\" style=\"text-align:center;padding:28px\">Tidak ada user yang cocok.</td></tr>'}\n   </tbody></table></div>\n   <div class=\"muted\" style=\"font-size:12px\">Username bebas (NIK, nama, atau apa pun) dan menjadi ID tetap. Cincin avatar: hijau aktif, kuning wajib ganti password, merah terkunci, abu-abu nonaktif.</div></div>`;\n}\nfunction rerenderUsers() { const c = document.getElementById('content'); if (!c || S.page !== 'users') return; c.innerHTML = viewUsers(); bindUsers(); }\nasync function reloadUsers() { try { S.users = await call('users.list'); rerenderUsers(); } catch (e) { gagal(e); } }\nfunction bindUsers() {\n  const q = $('#uq');\n  q.oninput = () => { S.uq = q.value; const pos = q.selectionStart; rerenderUsers(); const n = $('#uq'); n.focus(); n.setSelectionRange(pos, pos); };\n  $$('[data-uf]').forEach(b => b.onclick = () => { S.uf = b.dataset.uf; rerenderUsers(); });\n  $('#addUser').onclick = () => openUserSheet(null);\n  const find = un => S.users.users.find(u => u.username === un);\n  $$('[data-kebab]').forEach(b => b.onclick = e => { e.stopPropagation(); openMenu(b, find(b.dataset.kebab)); });\n  $$('tr[data-row]').forEach(tr => tr.onclick = e => { if (e.target.closest('[data-kebab]')) return; openUserSheet(find(tr.dataset.row)); });\n}\nfunction showTempPw(u, pw, judul) {\n  modal(judul, `<div>Berikan password sementara ini ke <b>${esc(u.nama)}</b> (<span class=\"mono\">${esc(u.username)}</span>). Password <b>tidak ditampilkan lagi</b> setelah jendela ini ditutup, dan wajib diganti saat login.</div>\n   <div class=\"secret\"><span id=\"tpw\" style=\"flex:1\">${esc(pw)}</span><button class=\"btn sm ton\" id=\"cpw\">${ic('copy', 's')}Salin</button></div>\n   <div class=\"muted\" style=\"font-size:12px\">Yang disimpan di database hanya hash + salt, bukan passwordnya.</div>`, [{ l: 'Selesai', pri: true }]);\n  setTimeout(() => { const b = document.getElementById('cpw'); if (b) b.onclick = () => copyText(pw, 'Password sementara disalin.', document.getElementById('tpw')); }, 60);\n}\nfunction copyText(t, msg, el) {\n  const pilih = () => { if (!el) { toast('Salin manual: ' + t); return; } const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Teks sudah dipilih, tekan Ctrl+C.'); };\n  try { navigator.clipboard.writeText(t).then(() => toast(msg), pilih); } catch (e) { pilih(); }\n}\n\n/* menu ⋮ */\nfunction closeMenu() { const m = document.querySelector('.menu'); if (m) m.remove(); }\nfunction openMenu(btn, u) {\n  closeMenu();\n  const r = btn.getBoundingClientRect(), m = document.createElement('div'); m.className = 'menu'; m.setAttribute('role', 'menu');\n  const items = [['edit', 'Ubah data & role', '', () => openUserSheet(u)], ['key', 'Reset password', 'Password sementara baru, wajib diganti', () => openUserSheet(u, { reset: true })]];\n  if (u.status === 'TERKUNCI') items.push(['lock', 'Buka kunci', 'Terkunci sampai ' + u.terkunciSampai, () => simple('users.bukaKunci', { username: u.username }, `Kunci akun ${u.username} dibuka.`)]);\n  items.push(['block', u.aktif ? 'Nonaktifkan' : 'Aktifkan lagi', u.aktif ? 'Tidak bisa login; riwayat tetap ada' : '', () => simple('users.aktif', { username: u.username, aktif: !u.aktif }, u.aktif ? `${u.nama} dinonaktifkan. Riwayatnya tetap tersimpan.` : `${u.nama} bisa login lagi.`)]);\n  m.innerHTML = items.map((it, i) => `<button data-mi=\"${i}\" role=\"menuitem\">${ic(it[0])}<span>${it[1]}${it[2] ? `<small>${esc(it[2])}</small>` : ''}</span></button>`).join('') +\n    `<hr><button class=\"danger\" data-mi=\"del\" role=\"menuitem\" ${u.bisaDihapus ? '' : 'disabled'}>${ic('trash')}<span>Hapus user<small>${u.bisaDihapus ? 'Belum pernah beraktivitas' : 'Sudah punya riwayat. Nonaktifkan saja.'}</small></span></button>`;\n  document.getElementById('overlay-root').appendChild(m);\n  m.style.top = Math.max(12, Math.min(r.bottom + 6, innerHeight - m.offsetHeight - 12)) + 'px';\n  m.style.left = Math.max(12, r.right - m.offsetWidth) + 'px';\n  m.addEventListener('click', e => { e.stopPropagation(); const b = e.target.closest('[data-mi]'); if (!b || b.disabled) return; closeMenu(); b.dataset.mi === 'del' ? confirmDelete(u) : items[+b.dataset.mi][3](); });\n  const first = m.querySelector('button'); if (first) first.focus();\n}\nasync function simple(aksi, payload, okMsg) {\n  try { await call(aksi, payload); toast(okMsg); await reloadUsers(); refreshMe(); } catch (e) { modalGagal(e); }\n}\nfunction modalGagal(e) {\n  if (e.kode === 'SESI_HABIS' || e.kode === 'WAJIB_GANTI') return;\n  modal(e.kode === 'ADMIN_TERAKHIR' || e.kode === 'IZIN_DITOLAK' || e.kode === 'PUNYA_RIWAYAT' ? 'Ditolak server' : 'Gagal', `<div class=\"note crit\">${ic('shield', 's')}<span class=\"tx\">${esc(e.pesan || String(e))}</span></div>`, [{ l: 'Mengerti', pri: true }]);\n}\nfunction confirmDelete(u) {\n  modal('Hapus user?', `<div class=\"row\" style=\"flex-wrap:nowrap;gap:14px\">${ava(u, 44)}<div><b>${esc(u.nama)}</b><div class=\"mono dim\">${esc(u.username)}</div></div></div><div class=\"muted\">User ini belum pernah login atau melakukan aksi apa pun, jadi aman dihapus. Pembuatan dan penghapusannya tetap tercatat di Log.</div>`,\n    [{ l: 'Batal' }, { l: 'Hapus', pri: true, fn: () => { closeSheet(true); simple('users.hapus', { username: u.username }, `User ${u.username} dihapus.`); } }]);\n}\n\n/* panel tambah/ubah user */\nfunction openUserSheet(u, opt) {\n  opt = opt || {};\n  S.form = u ? { username: u.username, nama: u.nama, alias: u.alias, role: u.role, aktif: u.aktif, pwOn: !!opt.reset, pwMode: 'acak', pwTyped: '', pwShow: false, version: u.version }\n             : { username: '', nama: '', alias: '', role: 'STAFF', aktif: true, pwOn: true, pwMode: 'acak', pwTyped: '', pwShow: false };\n  S.formOrig = u || null; S.formErr = ''; renderSheet(true);\n  setTimeout(() => { const el = document.querySelector(opt.reset ? '#sheet-root [data-pwmode=\"acak\"]' : u ? '#fn' : '#fu'); if (el) el.focus(); }, 80);\n}\nfunction closeSheet(instant) {\n  const r = document.getElementById('sheet-root'); if (!r.firstChild) return;\n  if (instant || REDUCED) { r.innerHTML = ''; return; }\n  r.firstElementChild.classList.add('closing'); setTimeout(() => { r.innerHTML = ''; }, 300);\n}\nfunction idcardHtml() {\n  const F = S.form, fake = { nama: F.nama || 'Nama user', username: F.username, status: !F.aktif ? 'NONAKTIF' : (F.pwOn || (S.formOrig && S.formOrig.status === 'WAJIB_GANTI')) ? 'WAJIB_GANTI' : (S.formOrig ? S.formOrig.status : 'AKTIF'), terkunciSampai: S.formOrig ? S.formOrig.terkunciSampai : '' };\n  return `${ava(fake, 64)}<div class=\"who\"><b>${esc(F.nama || 'Nama user')}</b><div class=\"mono\" style=\"font-size:12.5px\">${esc(F.username || 'username')}</div>\n   <div class=\"row\" style=\"margin-top:8px;gap:6px\">${rbadge(F.role)}${F.alias ? `<span class=\"pill p-dim\">PIC: ${esc(F.alias)}</span>` : ''}${stPill(fake)}</div></div>`;\n}\nfunction rolePeta() { const m = {}; (S.users.roles || []).forEach(r => { m[r.role] = r.izin; }); return m; }\nfunction permsHtml() { const R = rolePeta()[S.form.role] || []; return (S.users.katalog || []).map(([p, d], i) => `<span class=\"${R.indexOf(p) >= 0 ? '' : 'no'}\" style=\"--i:${i}\" title=\"${p}\">${esc(d)}</span>`).join(''); }\nconst pwScore = p => { let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return Math.min(4, s); };\nconst SCOL = ['var(--crit)', 'var(--crit)', 'var(--warn)', 'var(--ok)', 'var(--ok)'], SLBL = ['lemah', 'lemah', 'cukup', 'kuat', 'sangat kuat'];\nfunction renderSheet(opening) {\n  const F = S.form, O = S.formOrig, isNew = !O, root = document.getElementById('sheet-root');\n  const sc = root.querySelector('.dbody') ? root.querySelector('.dbody').scrollTop : 0, peta = rolePeta(), sco = pwScore(F.pwTyped);\n  root.innerHTML = `<div><div class=\"dscrim\" id=\"sscrim\" style=\"${opening ? '' : 'animation:none'}\"></div>\n  <aside class=\"drawer ussheet\" role=\"dialog\" aria-modal=\"true\" aria-label=\"${isNew ? 'Tambah user' : 'Ubah user'}\" style=\"width:min(580px,100vw);${opening ? '' : 'animation:none'}\">\n   <div class=\"dhead\" style=\"padding-bottom:14px\"><div class=\"dtop\"><button class=\"iconbtn\" id=\"sclose\" aria-label=\"Tutup\">${ic('x')}</button><div><div class=\"eyebrow\">${isNew ? 'User baru' : 'Ubah user'}</div><div style=\"font-weight:800;font-size:18px\">${isNew ? 'Tambah anggota tim' : esc(O.nama)}</div></div></div></div>\n   <div class=\"dbody\">\n    <div class=\"idcard\" id=\"idcard\">${idcardHtml()}</div>\n    <div class=\"sect\"><div class=\"eyebrow\">Identitas</div>\n     <label class=\"of\"><span>Username</span><input class=\"inp mono\" id=\"fu\" value=\"${esc(F.username)}\" ${isNew ? '' : 'disabled'} autocomplete=\"off\" autocapitalize=\"none\" spellcheck=\"false\" placeholder=\"mis. 95210101 atau dina.lestari\"><small>${isNew ? 'NIK, nama, atau apa pun · 3–32 karakter: huruf, angka, titik, garis bawah, strip. Menjadi ID tetap.' : 'ID tetap, tidak bisa diganti.'}</small></label>\n     <div class=\"grid g2\" style=\"gap:14px\"><label class=\"of\"><span>Nama lengkap</span><input class=\"inp\" id=\"fn\" value=\"${esc(F.nama)}\" autocomplete=\"off\" maxlength=\"80\"></label>\n      <label class=\"of\"><span>Alias PIC</span><input class=\"inp\" id=\"fa\" value=\"${esc(F.alias)}\" autocomplete=\"off\" maxlength=\"40\" placeholder=\"mis. Dina\"><small>Nama di kolom PIC sheet lama. Kosongkan bila bukan PIC.</small></label></div></div>\n    <div class=\"sect\"><div class=\"eyebrow\">Role & akses</div>\n     <div class=\"rcards\" role=\"radiogroup\" aria-label=\"Role\">${Object.keys(peta).map(r => { const m = roleMeta(r); return `<button type=\"button\" class=\"rcard ${F.role === r ? 'on' : ''}\" data-role=\"${esc(r)}\" role=\"radio\" aria-checked=\"${F.role === r}\">${ic(m[0])}<b>${esc(r)}</b><small>${m[1]} · ${peta[r].length} izin</small></button>`; }).join('')}</div>\n     <div><div class=\"muted\" style=\"font-size:12px;margin-bottom:8px\">User ini bisa:</div><div class=\"perms ${S.permAnim ? 'anim' : ''}\" id=\"perms\">${permsHtml()}</div></div></div>\n    <div class=\"sect\"><div class=\"eyebrow\">Password</div>\n     ${isNew ? '' : `<div class=\"swrow\"><div style=\"flex:1\"><b>Reset password</b><small>Biarkan mati bila password tidak diganti</small></div><button type=\"button\" class=\"toggle ${F.pwOn ? 'on' : ''}\" id=\"pwOn\" aria-label=\"Reset password\" aria-pressed=\"${F.pwOn}\"></button></div>`}\n     ${F.pwOn ? `<div class=\"seg\" role=\"group\" aria-label=\"Cara membuat password\"><button type=\"button\" data-pwmode=\"acak\" class=\"${F.pwMode === 'acak' ? 'on' : ''}\">Buat acak</button><button type=\"button\" data-pwmode=\"ketik\" class=\"${F.pwMode === 'ketik' ? 'on' : ''}\">Ketik sendiri</button></div>\n      ${F.pwMode === 'acak' ? `<div class=\"note ok\">${ic('key', 's')}<span class=\"tx\">Password acak dibuat server saat disimpan, lalu <b>ditampilkan sekali</b> untuk Anda sampaikan ke user.</span></div>`\n      : `<div><label class=\"of\"><span>Password</span><div style=\"position:relative\"><input class=\"inp mono\" id=\"fpw\" type=\"${F.pwShow ? 'text' : 'password'}\" value=\"${esc(F.pwTyped)}\" autocomplete=\"new-password\" style=\"width:100%;padding:12px 44px 10px 12px\"><button type=\"button\" class=\"iconbtn\" id=\"pwEye\" aria-label=\"${F.pwShow ? 'Sembunyikan' : 'Tampilkan'} password\" style=\"position:absolute;right:2px;top:2px\">${ic('eye', 's')}</button></div></label>\n        <div class=\"strength\"><i id=\"pwBar\" style=\"width:${sco * 25}%;background:${SCOL[sco]}\"></i></div>\n        <div class=\"muted\" style=\"font-size:12px;margin-top:6px\" id=\"pwHint\">Minimal ${S.app.passwordMin} karakter, berisi huruf dan angka.</div></div>`}\n      <div class=\"note info\">${ic('key', 's')}<span class=\"tx\">User <b>wajib mengganti</b> password ini saat login berikutnya${isNew ? '' : ', dan sesi aktifnya diakhiri'}.</span></div>` : ''}\n    </div>\n    ${isNew ? '' : `<div class=\"sect\"><div class=\"eyebrow\">Status</div><div class=\"swrow\"><div style=\"flex:1\"><b>Akun aktif</b><small>User bisa login selama akun aktif</small></div><button type=\"button\" class=\"toggle ${F.aktif ? 'on' : ''}\" id=\"stOn\" aria-label=\"Akun aktif\" aria-pressed=\"${F.aktif}\"></button></div>\n      <div class=\"danger-zone\"><div style=\"flex:1;min-width:200px\"><b style=\"color:var(--crit)\">Hapus user</b><div class=\"muted\" style=\"font-size:12px\">${O.bisaDihapus ? 'Tersedia karena user ini belum pernah login atau melakukan aksi.' : 'Tidak tersedia: user ini sudah punya riwayat. Nonaktifkan saja supaya Log tetap utuh.'}</div></div><button type=\"button\" class=\"btn sm danger\" id=\"delUser\" ${O.bisaDihapus ? '' : 'disabled'}>${ic('trash', 's')}Hapus</button></div></div>`}\n    <div id=\"ferr\">${S.formErr ? `<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(S.formErr)}</span></div>` : ''}</div>\n   </div>\n   <div class=\"sfoot\"><button class=\"btn\" id=\"scancel\">Batal</button><button class=\"btn pri\" id=\"ssave\">${ic('check', 's')}${isNew ? 'Buat user' : 'Simpan'}</button></div>\n  </aside></div>`;\n  root.querySelector('.dbody').scrollTop = sc;\n  bindSheet();\n}\nfunction bindSheet() {\n  const q = s => document.querySelector('#sheet-root ' + s), F = S.form, refresh = () => { q('#idcard').innerHTML = idcardHtml(); };\n  q('#sclose').onclick = q('#scancel').onclick = q('#sscrim').onclick = () => closeSheet();\n  q('#fu').oninput = e => { F.username = e.target.value.trim().toLowerCase(); refresh(); };\n  q('#fn').oninput = e => { F.nama = e.target.value; refresh(); };\n  q('#fa').oninput = e => { F.alias = e.target.value.trim(); refresh(); };\n  document.querySelectorAll('#sheet-root [data-role]').forEach(b => b.onclick = () => { F.role = b.dataset.role; S.permAnim = true; renderSheet(false); S.permAnim = false; });\n  if (q('#pwOn')) q('#pwOn').onclick = () => { F.pwOn = !F.pwOn; renderSheet(false); };\n  if (q('#stOn')) q('#stOn').onclick = () => { F.aktif = !F.aktif; renderSheet(false); };\n  document.querySelectorAll('#sheet-root [data-pwmode]').forEach(b => b.onclick = () => { F.pwMode = b.dataset.pwmode; renderSheet(false); if (F.pwMode === 'ketik') setTimeout(() => q('#fpw') && q('#fpw').focus(), 30); });\n  if (q('#pwEye')) q('#pwEye').onclick = () => { F.pwShow = !F.pwShow; renderSheet(false); setTimeout(() => { const i = q('#fpw'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 20); };\n  if (q('#fpw')) q('#fpw').oninput = e => {\n    F.pwTyped = e.target.value; const s = pwScore(F.pwTyped), ok = F.pwTyped.length >= S.app.passwordMin && /[A-Za-z]/.test(F.pwTyped) && /\\d/.test(F.pwTyped);\n    q('#pwBar').style.width = s * 25 + '%'; q('#pwBar').style.background = SCOL[s];\n    q('#pwHint').textContent = ok ? 'Memenuhi syarat · kekuatan: ' + SLBL[s] : `Minimal ${S.app.passwordMin} karakter, berisi huruf dan angka.`; q('#pwHint').style.color = ok ? 'var(--ok)' : '';\n  };\n  if (q('#delUser')) q('#delUser').onclick = () => confirmDelete(S.formOrig);\n  q('#ssave').onclick = saveUser;\n}\nasync function saveUser() {\n  const F = S.form, O = S.formOrig, btn = document.querySelector('#sheet-root #ssave');\n  const err = m => { S.formErr = m; renderSheet(false); const b = document.querySelector('#sheet-root .dbody'); b.scrollTop = 1e5; };\n  if (!F.nama.trim()) return err('Nama lengkap wajib diisi.');\n  const payload = { baru: !O, username: F.username, nama: F.nama.trim(), alias: F.alias, role: F.role, aktif: F.aktif, version: F.version,\n                    password: F.pwOn ? { mode: F.pwMode, nilai: F.pwMode === 'ketik' ? F.pwTyped : '' } : null };\n  busy(btn, true);\n  try {\n    const r = await call('users.simpan', payload);\n    closeSheet(); await reloadUsers(); refreshMe();\n    const target = { username: r.username, nama: F.nama.trim() };\n    if (r.passwordAcak) setTimeout(() => showTempPw(target, r.passwordAcak, O ? 'Password direset' : 'User dibuat'), 320);\n    else toast(!O ? `User ${r.username} dibuat. Wajib ganti password saat login pertama.` : F.pwOn ? 'Disimpan. Password baru wajib diganti saat login.' : 'Perubahan disimpan dan dicatat di Log.');\n  } catch (e) {\n    if (e.kode === 'SESI_HABIS' || e.kode === 'WAJIB_GANTI') return;\n    if (e.kode === 'KONFLIK') { await reloadUsers(); }\n    busy(btn, false); err(e.pesan || String(e));\n  }\n}\n\n/* ---------------- role & izin ---------------- */\nfunction viewRole() {\n  const base = {}; S.roles.roles.forEach(r => { base[r.role] = r.izin; });\n  const R = S.roleDraft || base, roles = Object.keys(base), dirty = !!S.roleDraft;\n  return `<div class=\"card\"><h2>Matriks izin<small>${roles.length} role · ${S.roles.katalog.length} izin</small><span class=\"sp\"></span><button class=\"btn sm\" id=\"addRole\">${ic('add', 's')}Role baru</button></h2>\n   <div class=\"tbl-wrap\"><table class=\"t matrix\"><thead><tr><th>Izin</th>${S.roles.roles.map(r => `<th>${esc(r.role)}<div class=\"dim\" style=\"font-size:10.5px;text-transform:none;letter-spacing:0\">${r.jumlahUser} user aktif</div></th>`).join('')}</tr></thead><tbody>\n   ${S.roles.katalog.map(([p, d]) => `<tr><td><span class=\"mono\" style=\"font-size:12px\">${p}</span><div class=\"muted\" style=\"font-size:12px\">${esc(d)}</div></td>${roles.map(r => { const on = R[r].indexOf(p) >= 0, orig = base[r].indexOf(p) >= 0; return `<td style=\"${dirty && on !== orig ? 'background:var(--accent-bg)' : ''}\"><input type=\"checkbox\" class=\"chk\" data-perm=\"${esc(r)}|${p}\" aria-label=\"${esc(r)} ${p}\" ${on ? 'checked' : ''}></td>`; }).join('')}</tr>`).join('')}\n   </tbody></table></div>\n   ${dirty ? `<div class=\"bulk\" style=\"margin-top:14px\"><b>Ada perubahan belum disimpan</b><span class=\"sp\"></span><button class=\"btn sm\" id=\"roleCancel\">Batal</button><button class=\"btn sm pri\" id=\"roleSave\">Simpan izin</button></div>` : ''}\n  </div>\n  <div class=\"note info\">${ic('shield', 's')}<span class=\"tx\">Setiap permintaan dicek izinnya di server, bukan hanya disembunyikan di layar. Permintaan tanpa izin ditolak dan tercatat sebagai <b>IZIN_DITOLAK</b> di Log. Perubahan izin berlaku pada permintaan berikutnya setiap user, tanpa login ulang.</span></div>`;\n}\nfunction rerenderRole() { const c = document.getElementById('content'); c.innerHTML = viewRole(); bindRole(); }\nfunction bindRole() {\n  $$('[data-perm]').forEach(c => c.onchange = () => {\n    const [role, p] = c.dataset.perm.split('|');\n    if (!S.roleDraft) { S.roleDraft = {}; S.roles.roles.forEach(r => { S.roleDraft[r.role] = r.izin.slice(); }); }\n    const l = S.roleDraft[role]; if (c.checked) l.push(p); else l.splice(l.indexOf(p), 1);\n    rerenderRole();\n  });\n  if ($('#roleCancel')) $('#roleCancel').onclick = () => { S.roleDraft = null; rerenderRole(); };\n  if ($('#roleSave')) $('#roleSave').onclick = async () => {\n    const btn = $('#roleSave'); busy(btn, true);\n    try { const r = await call('roles.simpan', { peta: S.roleDraft }); toast(`${r.diubah} izin diubah. Berlaku di permintaan berikutnya.`); S.roles = await call('roles.list'); S.roleDraft = null; rerenderRole(); refreshMe(); }\n    catch (e) { busy(btn, false); modalGagal(e); }\n  };\n  $('#addRole').onclick = () => modal('Role baru', `<label class=\"of\"><span>Nama role</span><input class=\"inp mono\" id=\"rn\" placeholder=\"mis. KOORDINATOR\"></label><label class=\"of\"><span>Salin izin dari</span><select class=\"inp\" id=\"rc\"><option value=\"\">— tanpa izin —</option>${S.roles.roles.map(r => `<option>${esc(r.role)}</option>`).join('')}</select></label>`,\n    [{ l: 'Batal' }, { l: 'Buat', pri: true, fn: d => {\n      const nama = d.querySelector('#rn').value, dari = d.querySelector('#rc').value;\n      call('roles.buat', { nama, salinDari: dari }).then(async r => { toast(`Role ${r.role} dibuat. Atur izinnya di tabel.`); S.roles = await call('roles.list'); S.roleDraft = null; rerenderRole(); }).catch(modalGagal);\n    } }]);\n}\n\n/* ---------------- log ---------------- */\nfunction viewLog() {\n  const L = S.log, f = S.logF;\n  const sel = (id, lbl, opts, v) => `<select class=\"inp\" id=\"${id}\" aria-label=\"${lbl}\"><option value=\"\">${lbl}: semua</option>${opts.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;\n  return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:14px\"><div class=\"row\">\n   ${L.semua ? sel('lfu', 'User', L.users, f.user) : ''}${sel('lfa', 'Aksi', L.aksi, f.aksi)}${sel('lfr', 'Hasil', ['BERHASIL', 'GAGAL', 'DITOLAK'], f.hasil)}\n   <span class=\"sp\"></span><span class=\"muted tnum\">${L.entri.length < L.total ? `${L.entri.length} terbaru dari ${L.total}` : L.total + ' entri'}</span><button class=\"btn\" disabled title=\"Dibangun di F5\">${ic('dl', 's')}Export xlsx · F5</button></div>\n   <div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Entitas</th><th>Detail</th><th>Hasil</th></tr></thead><tbody>\n   ${L.entri.map(l => `<tr><td class=\"tnum\" style=\"white-space:nowrap\">${esc(l.waktu)}</td><td class=\"mono\">${esc(l.user)}</td><td><span class=\"pill p-dim\">${esc(l.aksi)}</span></td><td>${esc(l.entitas)} <span class=\"mono\" style=\"font-size:12px\">${esc(l.id)}</span></td>\n     <td class=\"muted\">${l.field ? `<span class=\"mono\">${esc(l.field)}</span>: ${esc(l.lama)} → ${esc(l.baru)} ` : ''}${esc(l.catatan)}</td><td class=\"${l.hasil === 'BERHASIL' ? 'res-ok' : 'res-no'}\">${esc(l.hasil)}</td></tr>`).join('') || '<tr><td colspan=\"6\" class=\"muted\" style=\"text-align:center;padding:24px\">Tidak ada entri.</td></tr>'}\n   </tbody></table></div>\n   <div class=\"muted\" style=\"font-size:12px\">Log hanya bisa ditambah; tidak ada yang bisa mengubah atau menghapus entri, termasuk admin. Password tidak pernah dicatat.</div></div>`;\n}\nfunction bindLog() {\n  [['lfu', 'user'], ['lfa', 'aksi'], ['lfr', 'hasil']].forEach(([id, k]) => { const el = document.getElementById(id); if (el) el.onchange = () => { S.logF[k] = el.value; loadPage('log'); }; });\n}\n\n/* ---------------- sistem ---------------- */\nfunction viewSistem() {\n  const I = S.sistem, akses = I.db.editors.length + I.db.viewers.length;\n  return `<div class=\"grid g2\">\n   <div class=\"card\"><h2>${ic('db', 's')} Database</h2><dl class=\"kv\"><dt>File</dt><dd class=\"mono\">${esc(I.db.nama)}</dd><dt>Pemilik</dt><dd>${esc(I.akunFF) || 'akun FF'}</dd><dt>Akses file</dt><dd>${akses <= 2 ? '<span class=\"pill p-ok\">aman</span>' : '<span class=\"pill p-crit\">terlalu banyak</span>'} <span class=\"muted\" style=\"font-size:12px\">${akses} akun</span></dd><dt>Versi aplikasi</dt><dd>${esc(I.app.versi)} (${esc(I.app.fase)})</dd><dt>Versi skema</dt><dd>v${esc(I.skemaDb)}</dd><dt>Dibuat</dt><dd>${esc(I.dibuat)}</dd></dl></div>\n   <div class=\"card\"><h2>${ic('check', 's')} Pemeriksaan kesehatan<span class=\"sp\"></span><button class=\"btn sm\" id=\"health\">Jalankan</button></h2><div id=\"hres\"><div class=\"muted\" style=\"font-size:13px\">Klik <b>Jalankan</b> untuk memeriksa database, skema, admin, role, config, dan akses file.</div></div></div>\n   <div class=\"card\"><h2>Tab di database</h2><div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Tab</th><th class=\"num\">Baris data</th></tr></thead><tbody>${I.db.tabs.map(t => `<tr><td class=\"mono\">${esc(t.tab)}</td><td class=\"num\">${t.baris}</td></tr>`).join('')}</tbody></table></div>\n    <div class=\"muted\" style=\"font-size:12px;margin-top:8px\">Tab untuk kontrak, BAST, dan lainnya ditambahkan otomatis oleh migrasi di fase berikutnya.</div></div>\n   <div class=\"card\"><h2>Riwayat migrasi</h2><div class=\"tl\">${I.riwayat.slice().reverse().map(e => `<div class=\"e\"><span class=\"b\"></span><span class=\"w\">${esc(e.waktu)}</span><span><b>v${e.dari} → v${e.ke}</b> · ${esc(e.oleh)}<br><span class=\"muted\" style=\"font-size:12px\">${esc(e.langkah.join(' · '))}</span></span></div>`).join('')}</div>\n    <div class=\"muted\" style=\"font-size:12px;margin-top:8px\">Migrasi hanya menambah tab/kolom, tidak pernah menghapus data.</div></div>\n   <div class=\"card\" style=\"grid-column:1/-1\"><h2>Config</h2><div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Key</th><th>Nilai</th><th>Arti</th><th></th></tr></thead><tbody>${I.config.map(c => `<tr><td class=\"mono\" style=\"font-size:12px\">${esc(c.key)}</td><td><input class=\"inp\" data-cfg=\"${esc(c.key)}\" value=\"${esc(c.nilai)}\" aria-label=\"${esc(c.key)}\" style=\"max-width:240px\" ${can('pengaturan.kelola') ? '' : 'disabled'}></td><td class=\"muted\" style=\"font-size:12.5px\">${esc(c.ket)}</td><td>${can('pengaturan.kelola') ? `<button class=\"btn sm\" data-cfgsave=\"${esc(c.key)}\">Simpan</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>\n  </div>`;\n}\nfunction bindSistem() {\n  $('#health').onclick = async () => {\n    const btn = $('#health'); busy(btn, true);\n    try { const r = await call('sistem.cek'); $('#hres').innerHTML = r.hasil.map(h => `<div class=\"check\"><span class=\"d ${h.ok ? 'y' : ''}\" style=\"${h.ok ? '' : 'background:var(--crit);color:#fff'}\">${h.ok ? '✓' : '!'}</span><span>${esc(h.nama)}${h.catatan ? `<br><span class=\"muted\" style=\"font-size:12px\">${esc(h.catatan)}</span>` : ''}</span></div>`).join(''); toast(`Pemeriksaan selesai: ${r.hasil.filter(h => h.ok).length} dari ${r.hasil.length} OK.`); }\n    catch (e) { gagal(e); } finally { busy(btn, false); }\n  };\n  $$('[data-cfgsave]').forEach(b => b.onclick = async () => {\n    const key = b.dataset.cfgsave, nilai = document.querySelector(`[data-cfg=\"${key}\"]`).value; busy(b, true);\n    try { const r = await call('config.simpan', { key, nilai }); toast(r.berubah ? `${key} disimpan.` : 'Tidak ada perubahan.'); const st = await call('status'); S.app = Object.assign(S.app, st.app); }\n    catch (e) { modalGagal(e); } finally { busy(b, false); }\n  });\n}\nfunction viewDenied(pesan) {\n  return `<div class=\"card denied\"><div class=\"big\">${ic('shield')}</div><h2 style=\"margin:0;font-size:20px\">Anda tidak punya izin untuk halaman ini</h2>\n  <p class=\"muted\" style=\"margin:0;max-width:52ch\">${esc(pesan)} Kejadian ini tercatat di Log.</p><button class=\"btn\" data-go2=\"beranda\">Kembali ke beranda</button></div>`;\n}\n\n/* ---------------- modal & toast ---------------- */\nfunction modal(title, body, acts) {\n  const d = document.createElement('div'); d.className = 'scrim';\n  d.innerHTML = `<div class=\"modal\" role=\"dialog\" aria-modal=\"true\"><h3>${title}</h3>${body}<div class=\"acts\">${acts.map((a, i) => `<button class=\"btn ${a.pri ? 'pri' : ''}\" data-a=\"${i}\">${a.l}</button>`).join('')}</div></div>`;\n  document.getElementById('overlay-root').appendChild(d);\n  const close = () => { d.classList.add('closing'); setTimeout(() => d.remove(), 200); }; d._close = close;\n  d.addEventListener('click', e => { if (e.target === d) { close(); return; } const b = e.target.closest('[data-a]'); if (b) { const a = acts[+b.dataset.a]; if (!a.fn || a.fn(d) !== false) close(); } });\n  setTimeout(() => { const f = d.querySelector('input:not([disabled]),select,.btn.pri'); if (f) f.focus(); }, 60);\n}\nlet toastT;\nfunction toast(m, isErr) {\n  const old = document.querySelector('.toast'); if (old) old.remove();\n  const t = document.createElement('div'); t.className = 'toast' + (isErr ? ' err' : ''); t.setAttribute('role', 'status');\n  t.innerHTML = ic(isErr ? 'warn' : 'check', 's') + '<span>' + esc(m) + '</span>'; document.body.appendChild(t);\n  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), isErr ? 6000 : 3400);\n}\ndocument.addEventListener('keydown', e => {\n  if (e.key !== 'Escape') return;\n  if (document.querySelector('.menu')) { closeMenu(); return; }\n  const m = [...document.querySelectorAll('#overlay-root .scrim:not(.closing)')].pop(); if (m) { m._close(); return; }\n  closeSheet();\n});\ndocument.addEventListener('click', () => { closeMenu(); const s = $('#side'); if (s) s.classList.remove('open'); });\nwindow.addEventListener('resize', closeMenu);\n\nboot();\n\n</script>\n";
