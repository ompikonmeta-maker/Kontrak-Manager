/**
 * STATUS KONTRAK MANAGER — server Apps Script.
 * File Code.gs ini HASIL BUILD dari src/server/*.js dan src/ui/*. Jangan diedit langsung;
 * ubah sumbernya lalu jalankan `node tools/build.js`.
 */

// Konstanta kode (bukan nilai bisnis). Nilai bisnis disimpan di database (§3).
var APP = {
  NAMA: 'Status Kontrak Manager',
  VERSI: '2.0.0',
  FASE: 'F2',
  SKEMA: 2,                 // versi skema database yang dibutuhkan kode ini
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
  ['PASSWORD_MIN', '8', 'Panjang minimal password'],
  ['TAHAP_REOPEN', 'DRAFTING', 'Tahap tujuan bawaan saat BAST di-reopen'],
  ['AGING_BATAS', '7,14,30', 'Batas aging Fresh/Warm/Stale (hari); di atasnya Cold'],
  ['KENDALA_BATAS_HARI', '14', 'Kendala aktif lebih lama dari ini masuk Perlu Perhatian'],
  ['FIELD_WAJIB', 'Customer,EndCustomer,NilaiKontrak,Segment,Populasi,OrderInternal', 'Field yang harus terisi pada kontrak OPEN'],
  ['DOKTAGIH_DEFAULT_DIRECT', 'BAA', 'Dokumen tagih usulan untuk customer DIRECT'],
  ['DOKTAGIH_DEFAULT_INDIRECT', 'BAST', 'Dokumen tagih usulan untuk customer INDIRECT'],
  ['DOKTAGIH_DEFAULT_BELUM', 'BAST', 'Dokumen tagih usulan bila jenis customer belum terdefinisi'],
  ['ARSIP_SETELAH_HARI', '90', 'Kontrak CLOSE lebih lama dari ini dipindah ke arsip tahunan'],
  ['SINKRON_KLIEN_DETIK', '30', 'Browser menarik perubahan dari anggota tim lain setiap … detik']
];

// Isi awal referensi F2 (§5.1, §5.2, §5.5). Setelah terisi, diatur dari halaman Pengaturan.
var REF_AWAL = {
  Ref_Tahap: [['KOMPULIR', 'Kompulir Eviden'], ['DRAFTING', 'Drafting Dokumen'], ['REVIEW_CUST', 'Draft Review Customer'], ['SIRKULIR', 'Sirkulir Dokumen'],
              ['BAST_DONE', 'BAST Done'], ['TAKEOUT', 'BAST Takeout / BAST Sertim AR']].map(function (x, i) {
    return { Kode: x[0], Urutan: String(i + 1), Label: x[1], Penutup: x[0] === 'TAKEOUT' ? 'TRUE' : 'FALSE', BatasAgingHari: '14', Aktif: 'TRUE' }; }),
  Ref_Kendala: [['REV_KONTRAK', 'Revisi Kontrak', true], ['REV_DOKUMEN', 'Revisi Dokumen', true], ['RETURN_CUST', 'Return Customer', true],
                ['KENDALA_CUST', 'Kendala Sisi Customer', false], ['LAINNYA', 'Kendala Lainnya', false]].map(function (x, i) {
    return { Kode: x[0], Label: x[1], WajibKeterangan: 'TRUE', MemicuReopen: x[2] ? 'TRUE' : 'FALSE', Aktif: 'TRUE', Urutan: String(i + 1) }; }),
  Ref_NilaiPush: [['CLOSE', 'BAST TAKEOUT/SERTIM AR'], ['KENDALA:REV_KONTRAK', 'REVISI KONTRAK'], ['KENDALA:REV_DOKUMEN', 'REVISI DOKUMEN'],
    ['KENDALA:RETURN_CUST', 'RETURN CUSTOMER'], ['KENDALA:KENDALA_CUST', 'KENDALA CUSTOMER'], ['KENDALA:*', 'KENDALA LAINNYA'],
    ['SISA_LOKASI', 'BAST PARSIAL - MENUNGGU SISA LOKASI'], ['TAHAP:BAST_DONE', 'BAST DONE'], ['TAHAP:SIRKULIR', 'SIRKULIR DOKUMEN'],
    ['TAHAP:REVIEW_CUST', 'DRAFT REVIEW CUSTOMER'], ['TAHAP:DRAFTING', 'DRAFTING DOKUMEN'], ['TAHAP:KOMPULIR', 'KOMPULIR EVIDEN'], ['BELUM_ADA_BAST', 'BELUM DIPROSES']
  ].map(function (x, i) { return { Urutan: String(i + 1), Kondisi: x[0], Nilai: x[1], Aktif: 'TRUE' }; }),
  Ref_JenisDok: ['KL', 'WO', 'SPK', 'PO', 'Nota Pesanan', 'Surat Pesanan'].map(function (x, i) { return { Kode: x, Label: x, Aktif: 'TRUE', Urutan: String(i + 1) }; }),
  Ref_Populasi: ['TREG', 'SDA', 'PRM', 'DIRECT'].map(function (x, i) { return { Kode: x, Label: x, Aktif: 'TRUE', Urutan: String(i + 1) }; }),
  Ref_Segment: ['LBCS', 'GOS', 'ENS', 'OLOS'].map(function (x, i) { return { Kode: x, Label: x, Aktif: 'TRUE', Urutan: String(i + 1) }; }),
  Ref_DokTagih: [['BAST', 'Berita Acara Serah Terima'], ['BAA', 'Berita Acara Aktivasi (dipakai sebagai dokumen tagih)']].map(function (x, i) {
    return { Kode: x[0], Label: x[1], Aktif: 'TRUE', Urutan: String(i + 1) }; })
};
