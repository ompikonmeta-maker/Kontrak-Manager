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
    var info = Repo.infoDatabase(), orang = info.akses.length;
    cek('File database tidak dibagikan (maks. akun FF + 1 admin cadangan)', orang <= 2, orang + ' akun punya akses: ' + info.akses.join(', '));
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
