/**
 * STATUS KONTRAK MANAGER — server Apps Script.
 * File Code.gs ini HASIL BUILD dari src/server/*.js dan src/ui/*. Jangan diedit langsung;
 * ubah sumbernya lalu jalankan `node tools/build.js`.
 */

// Konstanta kode (bukan nilai bisnis). Nilai bisnis disimpan di database (§3).
var APP = {
  NAMA: 'Status Kontrak Manager',
  VERSI: '1.0.0',
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
