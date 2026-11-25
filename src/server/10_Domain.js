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
  /** Izin efektif = izin role + izin tambahan milik user (Users.IzinTambahan). */
  function izinUser(user, peta) {
    var a = (peta && user && peta[user.Role]) ? peta[user.Role].slice() : [];
    parseIzin(user && user.IzinTambahan).forEach(function (i) { if (a.indexOf(i) < 0) a.push(i); });
    return a;
  }

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
