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
  } finally { try { Repo.flushLog(); } finally { lock.releaseLock(); } }
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
