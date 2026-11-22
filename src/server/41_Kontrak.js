/**
 * F2: kontrak, BAST, kendala, arsip tahunan, upload Excel, pengaturan referensi.
 * Operasi kontrak dijalankan dengan aturan bersama KD (src/shared/kd.js) — sama persis dengan yang dijalankan browser
 * untuk tampilan instan; server adalah keputusan akhir (§4.4).
 */

// ---------------------------------------------------------------- helper
var TAB_REF_ = { tahap: 'Ref_Tahap', kendala: 'Ref_Kendala', push: 'Ref_NilaiPush', jenisDok: 'Ref_JenisDok', populasi: 'Ref_Populasi', segment: 'Ref_Segment', dokTagih: 'Ref_DokTagih' };
function refRaw_() {
  var o = {};
  Object.keys(TAB_REF_).forEach(function (k) { o[k] = Repo.semua(TAB_REF_[k]).map(function (r) { var x = {}; for (var c in r) if (c !== '_row') x[c] = r[c]; return x; }); });
  return o;
}
function ctxKD_(ctx) {
  return { user: ctx.user.Username, nama: ctx.user.Nama, alias: ctx.user.AliasPIC || '', now: Repo.sekarang(), ref: KD.siapkanRef(refRaw_()),
           cfg: Repo.semuaConfig(), izin: ctx.izin,
           idKontrak: function () { var n = String(Repo.nomorBaru('KONTRAK')); while (n.length < 6) n = '0' + n; return 'K-' + n; } };
}
function bersih_(o) { var x = {}; for (var c in o) if (c !== '_row') x[c] = o[c]; return x; }
function hariIni_() { return Utilities.formatDate(new Date(), APP.TZ, 'yyyy-MM-dd'); }
function daftarUserPic_() {
  return Repo.semua('Users').map(function (u) { return { username: u.Username, nama: u.Nama, alias: u.AliasPIC, aktif: Domain.bool(u.Aktif), role: u.Role }; });
}
function cfgKlien_() {
  var c = Repo.semuaConfig(), o = {};
  ['TAHAP_REOPEN', 'AGING_BATAS', 'KENDALA_BATAS_HARI', 'FIELD_WAJIB', 'DOKTAGIH_DEFAULT_DIRECT', 'DOKTAGIH_DEFAULT_INDIRECT', 'DOKTAGIH_DEFAULT_BELUM',
   'ARSIP_SETELAH_HARI', 'SINKRON_KLIEN_DETIK'].forEach(function (k) { o[k] = c[k]; });
  return o;
}
function barisIndeks_(k, lokasi) {
  return { NoKontrakNorm: k.NoKontrakNorm, KontrakID: k.KontrakID, NoKontrak: k.NoKontrak, NamaPelanggan: k.NamaPelanggan, EndCustomer: k.EndCustomer,
           JudulKontrak: k.JudulKontrak, StatusKontrak: k.StatusKontrak, TahapKontrak: k.TahapKontrak, PIC: k.PIC, Lokasi: lokasi || 'AKTIF', TglClose: k.TglClose, Arsip: k.Arsip };
}
var KOL_INDEKS_ = ['NoKontrakNorm', 'NoKontrak', 'NamaPelanggan', 'EndCustomer', 'JudulKontrak', 'StatusKontrak', 'TahapKontrak', 'PIC', 'TglClose', 'Arsip'];

/** Cari nomor (normKey) di Indeks semua kontrak lalu di nomor lama. Dipakai cek dobel. */
function cariNomor_(nk, kecuali) {
  var cariKolom = function (tab, col) {
    var sh = Repo.besarSheet(tab), lr = sh.getLastRow();
    if (lr < 2) return null;
    var c = sh.getRange(2, col, lr - 1, 1).createTextFinder(nk).matchEntireCell(true).findNext();
    return c ? Repo.besarBarisKe(tab, c.getRow()) : null;
  };
  var ix = cariKolom('Indeks', 1);
  if (ix && ix.KontrakID !== kecuali) return { KontrakID: ix.KontrakID, NoKontrak: ix.NoKontrak, lokasi: ix.Lokasi, viaAlias: false };
  var al = cariKolom('KontrakAlias', 1);
  if (al && al.KontrakID !== kecuali) { var i2 = Repo.besarBaca('Indeks', al.KontrakID); return { KontrakID: al.KontrakID, NoKontrak: i2 ? i2.NoKontrak : '', lokasi: i2 ? i2.Lokasi : 'AKTIF', viaAlias: true, noLama: al.NoAsli }; }
  return null;
}
/** Peta normKey → kontrak dari Indeks + alias (satu kali baca; dipakai upload). */
function petaNomor_() {
  var m = {}, ix = Repo.semua('Indeks'), lok = {};
  ix.forEach(function (r) { m[r.NoKontrakNorm] = { KontrakID: r.KontrakID, NoKontrak: r.NoKontrak, lokasi: r.Lokasi, viaAlias: false }; lok[r.KontrakID] = r; });
  Repo.semua('KontrakAlias').forEach(function (a) { if (!m[a.AliasNorm]) { var r = lok[a.KontrakID] || {}; m[a.AliasNorm] = { KontrakID: a.KontrakID, NoKontrak: r.NoKontrak || '', lokasi: r.Lokasi || 'AKTIF', viaAlias: true }; } });
  return m;
}
function pesanDobel_(d) {
  return 'No. kontrak sudah terdaftar sebagai ' + d.KontrakID + (d.viaAlias ? ' (sebagai nomor lama)' : '') + (d.lokasi && d.lokasi !== 'AKTIF' ? ', tersimpan di arsip ' + d.lokasi.replace('ARSIP_', '') : '') + '.';
}

/** Tulis hasil operasi KD ke database: baris berubah, baris baru, riwayat, alias, Indeks, Log, feed. Panggil di dalam kunci. */
function terapkanHasil_(lama, hasil, ctx, opt) {
  opt = opt || {};
  var d = KD.beda(lama, hasil.bundle);
  ['Kontrak', 'OrderInternal', 'BAST', 'Kendala'].forEach(function (tab) {
    (d.ubah[tab] || []).forEach(function (r) { Repo.besarTulis(tab, r); });
    if ((d.tambah[tab] || []).length) Repo.besarTambah(tab, d.tambah[tab]);
  });
  if (hasil.riwayat.length) Repo.besarTambah('RiwayatTahap', hasil.riwayat);
  if (hasil.alias.length) Repo.besarTambah('KontrakAlias', hasil.alias);
  var k = hasil.bundle.k;
  if (!lama) Repo.besarTambah('Indeks', [barisIndeks_(k)]);
  else if (opt.indeksPenuh || KOL_INDEKS_.some(function (c) { return String(lama.k[c]) !== String(k[c]); })) Repo.besarTulis('Indeks', barisIndeks_(k, 'AKTIF'));
  hasil.log.forEach(function (l) {
    Repo.tulisLog({ user: ctx.user.Username, aksi: l.aksi, entitas: l.entitas, id: l.id, field: l.field, lama: l.lama, baru: l.baru, catatan: l.catatan });
  });
  if (!opt.tanpaFeed) return Repo.feedTambah({ kid: k.KontrakID, bundle: hasil.bundle });
  return Repo.seq();
}
function bundleDariBaris_(rows) {
  var b = { k: null, bast: [], order: [], kend: [], alias: [] };
  (rows.Kontrak || []).forEach(function (r) { b.k = bersih_(r); });
  (rows.BAST || []).forEach(function (r) { b.bast.push(bersih_(r)); });
  (rows.OrderInternal || []).forEach(function (r) { b.order.push(bersih_(r)); });
  (rows.Kendala || []).forEach(function (r) { b.kend.push(bersih_(r)); });
  (rows.KontrakAlias || []).forEach(function (r) { b.alias.push(bersih_(r)); });
  return b;
}
/** Bundle lengkap beberapa kontrak dari SKM_DB (baca utuh 4 tab; dipakai pekerjaan massal). */
function bundleSemua_() {
  var m = {};
  Repo.semua('Kontrak').forEach(function (r) { m[r.KontrakID] = { k: bersih_(r), bast: [], order: [], kend: [], alias: [], _row: r._row }; });
  [['BAST', 'bast'], ['OrderInternal', 'order'], ['Kendala', 'kend']].forEach(function (p) {
    Repo.semua(p[0]).forEach(function (r) { if (m[r.KontrakID]) m[r.KontrakID][p[1]].push(bersih_(r)); });
  });
  return m;
}
/** Hitung ulang kolom turunan semua kontrak aktif (setelah tahap/aturan push diubah). */
function hitungUlang_() {
  var ref = KD.siapkanRef(refRaw_()), now = Repo.sekarang(), m = bundleSemua_(), rows = Repo.semua('Kontrak'), maks = 1, peta = {};
  rows.forEach(function (r) { maks = Math.max(maks, r._row); peta[r._row] = r; });
  var blok = [], ubah = 0, statusBaru = {};
  for (var i = 2; i <= maks; i++) {
    var r = peta[i];
    if (!r) { blok.push(KD.KOL_TURUNAN.map(function () { return ''; })); continue; }
    var t = KD.turunan(m[r.KontrakID], ref, now);
    if (KD.KOL_TURUNAN.some(function (c) { return String(t[c]) !== String(r[c]); })) ubah++;
    statusBaru[r.KontrakID] = t;
    blok.push(KD.KOL_TURUNAN.map(function (c) { return t[c]; }));
  }
  if (blok.length && ubah) {
    Repo.besarTulisKolom('Kontrak', KD.KOL_TURUNAN[0], blok);
    var ix = Repo.semua('Indeks'), mx = 1, pi = {};
    ix.forEach(function (x) { mx = Math.max(mx, x._row); pi[x._row] = x; });
    var b2 = [];
    for (var j = 2; j <= mx; j++) { var x = pi[j], t2 = x && statusBaru[x.KontrakID]; b2.push(x ? [t2 ? t2.StatusKontrak : x.StatusKontrak, t2 ? t2.TahapKontrak : x.TahapKontrak] : ['', '']); }
    if (b2.length) Repo.besarTulisKolom('Indeks', 'StatusKontrak', b2);
  }
  return ubah;
}

// ---------------------------------------------------------------- arsip tahunan (§4.3)
/** Pindahkan kontrak CLOSE lama ke arsip per tahun close. Paling banyak `maks` kontrak per jalan. */
function pindahArsip_(oleh, maks) {
  maks = maks || 300;
  var hari = Domain.num(Repo.config('ARSIP_SETELAH_HARI', '90'), 90), hi = hariIni_(), calon = [];
  Repo.semua('Kontrak').forEach(function (k) {
    if (k.StatusKontrak !== 'CLOSE' || !k.TglClose) return;
    var h = KD.hariSejak(k.TglClose, hi);
    if (h !== null && h > hari) calon.push(k);
  });
  var pilih = calon.slice(0, maks), peta = {};
  pilih.forEach(function (k) { peta[k.KontrakID] = k.TglClose.slice(0, 4); });
  var baris = pilih.length ? Repo.arsipPindah(peta) : 0;
  if (pilih.length) {
    Repo.tulisLog({ user: oleh, aksi: 'PINDAH_ARSIP', entitas: 'Kontrak', id: pilih.length + ' kontrak', catatan: baris + ' baris dipindah; ' + Object.keys(peta).map(function (k) { return k + '→' + peta[k]; }).slice(0, 20).join(', ') + (pilih.length > 20 ? ', …' : '') });
    Repo.feedTambah({ muatUlang: true, alasan: 'pindah arsip' });
  }
  Repo.setMeta('ARSIP_TERAKHIR', Repo.sekarang() + ' · ' + pilih.length + ' kontrak');
  return { dipindah: pilih.length, sisa: calon.length - pilih.length };
}
/** Dijalankan pemicu bulanan (dan lanjutan bila masih ada sisa). */
function pindahArsipTerjadwal() {
  var r = Repo.kunci(function () { return pindahArsip_('pemicu', 300); }, 60000);
  if (r.sisa > 0) ScriptApp.newTrigger('pindahArsipTerjadwal').timeBased().after(60 * 1000).create();
  console.log('Pindah arsip: ' + r.dipindah + ' kontrak, sisa ' + r.sisa);
  return r;
}
function pemicuArsip_() {
  return ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'pindahArsipTerjadwal'; });
}
/** Pasang pemicu bulanan (tanggal 1, ±01.00). Aman diulang. */
function pasangPemicuArsip_() {
  if (pemicuArsip_().length) return false;
  ScriptApp.newTrigger('pindahArsipTerjadwal').timeBased().onMonthDay(1).atHour(1).create();
  return true;
}

// ---------------------------------------------------------------- Excel (template & laporan) lewat Google Sheet sementara
function xlsxDari_(nama, isi) {
  var f = SpreadsheetApp.create('SKM_sementara_' + nama);
  try {
    isi(f);
    SpreadsheetApp.flush();
    var r = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + f.getId() + '/export?format=xlsx',
      { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) throw Repo.galat('EXPORT', 'Gagal membuat file Excel (HTTP ' + r.getResponseCode() + '). Coba lagi sebentar.');
    return Utilities.base64Encode(r.getBlob().getBytes());
  } finally {
    try { DriveApp.getFileById(f.getId()).setTrashed(true); } catch (e) { console.error('File sementara tidak terhapus: ' + e.message); }
  }
}
var KOLOM_TEMPLATE_ = [
  ['No. Kontrak', 1, 40, 'Nomor KL/WO/SPK persis seperti di dokumen. Menjadi kunci pencocokan; tidak boleh dobel.'],
  ['Judul Kontrak', 1, 40, 'Judul/nama pekerjaan.'],
  ['Jenis Dok', 0, 12, 'Kosongkan bila ingin ditebak dari nomor.', 'jenisDok'],
  ['Tahun Project', 0, 12, 'Angka 4 digit, mis. 2026.'],
  ['Populasi', 0, 12, 'Pilih dari daftar.', 'populasi'],
  ['Customer', 0, 32, 'Direct customer. Sama dengan End customer → DIRECT; beda → INDIRECT; kosong → BELUM TERDEFINISI.'],
  ['End Customer', 0, 32, 'Pengguna akhir / nama pelanggan.'],
  ['Segment', 0, 11, 'Pilih dari daftar.', 'segment'],
  ['Nilai Kontrak', 0, 18, 'Angka rupiah. Teks seperti "Rp 95,352,000.00" juga dibaca.'],
  ['Jumlah Lokasi', 0, 12, 'Total lokasi di kontrak.'],
  ['PIC', 0, 12, 'Alias PIC sesuai menu Users. Kosong = tanpa PIC.', 'pic'],
  ['Dok Tagih BAST-1', 0, 14, 'BAST atau BAA. Kosong = otomatis (DIRECT → BAA, lainnya → BAST).', 'dokTagih'],
  ['Tahap Awal BAST-1', 0, 24, 'Kosong = tahap pertama.', 'tahap'],
  ['Tgl Masuk Tahap', 0, 15, 'Tanggal mulai tahap (aging dihitung dari sini). Kosong = tanggal upload.', 'tanggal'],
  ['Kendala', 0, 22, 'Bila ada kendala aktif saat ini. Kosong = tidak ada.', 'kendala'],
  ['Keterangan Kendala', 0, 36, 'Wajib diisi bila kolom Kendala diisi.'],
  ['Catatan', 0, 32, 'Keterangan bebas untuk BAST-1.']
];
var KOLOM_SO_ = [['No. Kontrak', 1, 40, 'Sama dengan No. Kontrak di tab Kontrak, atau kontrak yang sudah ada di SKM.'], ['Jenis', 1, 8, 'SO atau MI.', 'order'],
  ['No. Order', 1, 22, 'Nomor SO / MI.'], ['Jenis Layanan', 0, 20, ''], ['Jenis Pekerjaan', 0, 20, ''], ['Jumlah Lokasi', 0, 12, ''], ['Keterangan', 0, 32, '']];
function isiTemplate_(f) {
  var ref = KD.siapkanRef(refRaw_()), aktif = function (l) { return l.filter(function (x) { return x.Aktif; }); };
  var daftar = {
    jenisDok: aktif(ref.jenisDok).map(function (x) { return x.Kode; }), populasi: aktif(ref.populasi).map(function (x) { return x.Kode; }),
    segment: aktif(ref.segment).map(function (x) { return x.Kode; }), dokTagih: aktif(ref.dokTagih).map(function (x) { return x.Kode; }),
    tahap: aktif(ref.tahap).map(function (x) { return x.Label; }), kendala: aktif(ref.kendala).map(function (x) { return x.Label; }),
    pic: daftarUserPic_().filter(function (u) { return u.aktif && u.alias; }).map(function (u) { return u.alias; }), order: ['SO', 'MI']
  };
  var pet = f.getSheets()[0]; pet.setName('Petunjuk');
  var kon = f.insertSheet('Kontrak'), so = f.insertSheet('SO_MI'), rf = f.insertSheet('Referensi');
  var rng = {}, kolRef = Object.keys(daftar);
  rf.getRange(1, 1).setValue('Daftar pilihan dropdown, dibuat dari Pengaturan SKM saat template diunduh. Jangan diubah.');
  kolRef.forEach(function (k, i) {
    var v = daftar[k].length ? daftar[k] : ['-'];
    rf.getRange(3, i + 1).setValue(k);
    rf.getRange(4, i + 1, v.length, 1).setValues(v.map(function (x) { return [x]; }));
    rng[k] = rf.getRange(4, i + 1, v.length, 1);
  });
  var tabel = function (sh, kolom) {
    var n = sh.getMaxRows() - 1;   // sheet baru: 1.000 baris (1 judul + 999 isi)
    sh.getRange(1, 1, 1, kolom.length).setValues([kolom.map(function (c) { return c[0] + (c[1] ? ' *' : ''); })]).setFontWeight('bold').setFontColor('#ffffff');
    kolom.forEach(function (c, i) {
      sh.getRange(1, i + 1).setBackground(c[1] ? '#b4232f' : '#1e2a4a');
      if (c[3]) sh.getRange(1, i + 1).setNote(c[3]);
      sh.setColumnWidth(i + 1, c[2] * 7);
      var isi = sh.getRange(2, i + 1, n, 1);
      if (c[4] === 'tanggal') isi.setNumberFormat('dd/mm/yyyy').setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
      else if (c[0] === 'Nilai Kontrak') isi.setNumberFormat('#,##0');
      else isi.setNumberFormat('@');
      if (c[4] && rng[c[4]]) isi.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(rng[c[4]], true).setAllowInvalid(false).build());
    });
    sh.setFrozenRows(1);
  };
  tabel(kon, KOLOM_TEMPLATE_); tabel(so, KOLOM_SO_);
  var langkah = [['Template upload kontrak — Status Kontrak Manager', ''], ['Versi', 'SKM-UPLOAD-1 · diunduh ' + Repo.sekarang().slice(0, 10) + ' · jangan ubah judul kolom (baris 1)'], ['', ''],
    ['1. Isi tab Kontrak', 'Satu baris = satu kontrak. Kolom merah (*) wajib: No. Kontrak dan Judul Kontrak.'],
    ['2. Isi tab SO_MI (opsional)', 'Satu baris = satu SO/MI, dihubungkan lewat No. Kontrak.'],
    ['3. Upload di SKM', 'Menu Kontrak → Upload Excel. SKM memeriksa setiap baris SEBELUM ada data yang disimpan.'],
    ['4. Periksa pratinjau', 'Baris Error tidak disimpan. Baris Peringatan tetap disimpan (mis. Customer kosong → BELUM TERDEFINISI).'],
    ['5. Simpan', 'Kontrak dibuat dengan BAST-1 otomatis dan tercatat di Log atas nama Anda.'], ['', ''],
    ['Nomor sudah ada', 'Default dilewati. Pilihan "Perbarui": hanya kolom yang DIISI yang menimpa data SKM.'],
    ['Nomor lama', 'Nomor lama yang sudah dikoreksi dikenali sebagai kontrak yang sudah ada.'],
    ['Penulisan nomor', 'Beda spasi, huruf besar/kecil, jenis tanda strip, atau titik di akhir dianggap nomor yang sama.'],
    ['Batas', 'Maksimal 1.000 kontrak per file.']];
  pet.getRange(1, 1, langkah.length, 2).setValues(langkah);
  pet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  pet.setColumnWidth(1, 200); pet.setColumnWidth(2, 640);
}

// ---------------------------------------------------------------- aksi
/** Data aktif untuk browser + perubahan sejak snapshot (supaya browser tidak perlu panggilan kedua). */
function muatDataKlien_() {
  var snap = Repo.snapshot();
  return { snap: snap, feed: Repo.feedAmbil(snap.seq), ref: refRaw_(), cfg: cfgKlien_(), users: daftarUserPic_(), hariIni: hariIni_(), sekarang: Repo.sekarang() };
}
AKSI['data.muat'] = { izin: 'kontrak.lihat', fn: function () { return muatDataKlien_(); } };
AKSI['data.ref'] = { izin: 'kontrak.lihat', fn: function () { return { ref: refRaw_(), cfg: cfgKlien_(), users: daftarUserPic_() }; } };
AKSI['data.perubahan'] = { izin: 'kontrak.lihat', fn: function (ctx) { var r = Repo.feedAmbil(ctx.payload.sejak); r.hariIni = hariIni_(); return r; } };

AKSI['kontrak.op'] = { izin: 'kontrak.lihat', ubah: true, fn: function (ctx) {
  var p = ctx.payload, op = String(p.op || ''), c = ctxKD_(ctx), lama = null, hasil;
  if (p.data) delete p.data.KontrakID;   // ID kontrak baru selalu dibuat server
  if (op === 'kontrak.buat') {
    var no = KD.t((p.data && p.data.f || {}).NoKontrak);
    if (no) { var d = cariNomor_(KD.normKey(no)); if (d) throw Repo.galat('DOBEL', pesanDobel_(d)); }
    hasil = KD.jalankan(op, null, p.data, c);
  } else {
    var row = Repo.besarBaca('Kontrak', p.kid);
    if (!row) {
      var ix = Repo.besarBaca('Indeks', p.kid);
      throw Repo.galat(ix ? 'DI_ARSIP' : 'TIDAK_ADA', ix ? 'Kontrak ini sudah dipindah ke arsip ' + ix.Lokasi.replace('ARSIP_', '') + '. Cari di bagian Kontrak lama untuk membukanya.' : 'Kontrak tidak ditemukan.');
    }
    if (String(row.Version) !== String(p.versi)) throw Repo.galat('KONFLIK', 'Kontrak ' + p.kid + ' baru saja diubah orang lain. Tampilan dimuat ulang; ulangi perubahan Anda bila masih perlu.');
    var b = p.bundle || {};
    lama = { k: bersih_(row), bast: b.bast || [], order: b.order || [], kend: b.kend || [], alias: b.alias || [] };
    if (op === 'kontrak.ubah' && p.data && p.data.f && KD.t(p.data.f.NoKontrak) && KD.normKey(p.data.f.NoKontrak) !== row.NoKontrakNorm) {
      var d2 = cariNomor_(KD.normKey(p.data.f.NoKontrak), p.kid);
      if (d2) throw Repo.galat('DOBEL', pesanDobel_(d2));
    }
    hasil = KD.jalankan(op, lama, p.data, c);
    if (hasil.kosong) return { bundle: lama, seq: Repo.seq(), tempKid: p.tempKid || '' };
  }
  var seq = terapkanHasil_(lama, hasil, ctx);
  return { bundle: hasil.bundle, seq: seq, tempKid: p.tempKid || '' };
} };

AKSI['kontrak.riwayat'] = { izin: 'kontrak.lihat', fn: function (ctx) {
  var kid = String(ctx.payload.kid || ''), lokasi = String(ctx.payload.lokasi || 'AKTIF'), riw;
  if (lokasi === 'AKTIF') riw = Repo.besarCari('RiwayatTahap', 'KontrakID', kid);
  else riw = Repo.arsipAmbil(kid, lokasi).RiwayatTahap;
  var bulan = [], d = new Date();
  for (var i = 0; i < 3; i++) { bulan.push(Utilities.formatDate(new Date(d.getFullYear(), d.getMonth() - i, 1), APP.TZ, 'yyyy-MM')); }
  var log = Repo.logEntitas(kid, bulan).map(function (l) {
    return { waktu: l.Timestamp, user: l.Username, aksi: l.Aksi, id: l.EntitasID, field: l.Field, lama: l.NilaiLama, baru: l.NilaiBaru, catatan: l.Catatan };
  });
  return { riwayat: riw.map(bersih_), log: log.sort(function (a, b) { return a.waktu < b.waktu ? 1 : -1; }), bulan: bulan };
} };

AKSI['arsip.cari'] = { izin: 'kontrak.lihat', fn: function (ctx) {
  var q = KD.t(ctx.payload.q), ql = q.toLowerCase(), qn = KD.normKey(q);
  if (q.length < 3) return { hasil: [] };
  var ix = Repo.semua('Indeks').filter(function (r) { return r.Lokasi && r.Lokasi !== 'AKTIF'; }), ids = {};
  ix.forEach(function (r) { ids[r.KontrakID] = r; });
  var alias = {};
  Repo.semua('KontrakAlias').forEach(function (a) {
    if (!ids[a.KontrakID]) return;
    if (String(a.NoAsli).toLowerCase().indexOf(ql) >= 0 || (qn.length >= 4 && String(a.AliasNorm).indexOf(qn) >= 0)) alias[a.KontrakID] = bersih_(a);
  });
  var hasil = ix.filter(function (r) {
    var teks = (r.NoKontrak + ' ' + r.NamaPelanggan + ' ' + r.EndCustomer + ' ' + r.JudulKontrak + ' ' + r.KontrakID).toLowerCase();
    return teks.indexOf(ql) >= 0 || (qn.length >= 4 && String(r.NoKontrakNorm).indexOf(qn) >= 0) || alias[r.KontrakID];
  }).slice(0, 50).map(function (r) { var o = bersih_(r); o.aliasCocok = alias[r.KontrakID] || null; return o; });
  return { hasil: hasil };
} };

AKSI['arsip.buka'] = { izin: 'kontrak.lihat', fn: function (ctx) {
  var kid = String(ctx.payload.kid || ''), ix = Repo.besarBaca('Indeks', kid);
  if (!ix) throw Repo.galat('TIDAK_ADA', 'Kontrak tidak ditemukan di indeks.');
  if (ix.Lokasi === 'AKTIF') return { lokasi: 'AKTIF' };
  var rows = Repo.arsipAmbil(kid, ix.Lokasi);
  rows.KontrakAlias = Repo.besarCari('KontrakAlias', 'KontrakID', kid);
  return { lokasi: ix.Lokasi, bundle: bundleDariBaris_(rows), riwayat: rows.RiwayatTahap.map(bersih_) };
} };

AKSI['arsip.reopen'] = { izin: 'kontrak.update', ubah: true, fn: function (ctx) {
  var p = ctx.payload, kid = String(p.kid || ''), ix = Repo.besarBaca('Indeks', kid);
  if (!ix) throw Repo.galat('TIDAK_ADA', 'Kontrak tidak ditemukan di indeks.');
  if (ix.Lokasi === 'AKTIF') throw Repo.galat('KONFLIK', 'Kontrak ini sudah berada di data aktif. Muat ulang tampilan.');
  var c = ctxKD_(ctx), rows = Repo.arsipAmbil(kid, ix.Lokasi);
  rows.KontrakAlias = Repo.besarCari('KontrakAlias', 'KontrakID', kid);
  var b = bundleDariBaris_(rows), bast = p.bastId || (b.bast.filter(function (x) { return !KD.bool(x.Dihapus); }).slice(-1)[0] || {}).BASTID;
  var data = { bastId: bast, Jenis: p.Jenis, Keterangan: p.Keterangan, tahapReopen: p.tahapReopen, dariArsip: ix.Lokasi.replace('ARSIP_', '') };
  var hasil = KD.jalankan('kendala.buka', b, data, c);      // validasi dulu sebelum memindah apa pun
  Repo.arsipKeluarkan(kid, ix.Lokasi);
  var seq = terapkanHasil_(b, hasil, ctx, { indeksPenuh: true });
  Repo.tulisLog({ user: ctx.user.Username, aksi: 'REOPEN_DARI_ARSIP', entitas: 'Kontrak', id: kid, field: 'Lokasi', lama: ix.Lokasi, baru: 'AKTIF', catatan: KD.t(p.Keterangan) });
  return { bundle: hasil.bundle, seq: seq };
} };

AKSI['arsip.jalankan'] = { izin: 'pengaturan.kelola', ubah: true, fn: function (ctx) { return pindahArsip_(ctx.user.Username, 300); } };
AKSI['arsip.pemicu'] = { izin: 'pengaturan.kelola', ubah: true, fn: function (ctx) {
  var baru = pasangPemicuArsip_();
  if (baru) catat_(ctx, 'PASANG_PEMICU', 'Sistem', 'pindahArsipTerjadwal', 'bulanan, tanggal 1 ±01.00');
  return { dipasang: baru, aktif: pemicuArsip_().length > 0 };
} };

AKSI['upload.template'] = { izin: 'kontrak.daftar', fn: function () {
  return { nama: 'Template_Upload_Kontrak_SKM.xlsx', base64: xlsxDari_('template', isiTemplate_) };
} };
AKSI['upload.laporan'] = { izin: 'kontrak.daftar', fn: function (ctx) {
  var tabs = ctx.payload.tabs || [];
  return { nama: 'Laporan_error_upload.xlsx', base64: xlsxDari_('laporan', function (f) {
    tabs.forEach(function (t, i) {
      var sh = i === 0 ? f.getSheets()[0] : f.insertSheet(String(t.nama));
      if (i === 0) sh.setName(String(t.nama));
      var aoa = (t.aoa || []).map(function (r) { return r.map(String); }), w = aoa.reduce(function (a, r) { return Math.max(a, r.length); }, 1);
      if (aoa.length) sh.getRange(1, 1, aoa.length, w).setNumberFormat('@').setValues(aoa.map(function (r) { while (r.length < w) r.push(''); return r; }));
    });
  }) };
} };
AKSI['upload.cekNomor'] = { izin: 'kontrak.daftar', fn: function (ctx) {
  var m = petaNomor_(), out = {};
  (ctx.payload.nomor || []).forEach(function (nk) { if (m[nk]) out[nk] = m[nk]; });
  return { ada: out };
} };

AKSI['upload.simpan'] = { izin: 'kontrak.daftar', ubah: true, fn: function (ctx) {
  var p = ctx.payload, mode = p.mode === 'perbarui' ? 'perbarui' : 'lewati', file = String(p.file || 'file'), c = ctxKD_(ctx);
  if ((p.rows || []).length > 300) throw Repo.galat('VALIDASI', 'Maksimal 300 baris per bagian.');
  var peta = petaNomor_(), picAktif = daftarUserPic_().filter(function (u) { return u.aktif && u.alias; }).map(function (u) { return u.alias; });
  var hasil = KD.periksaUpload(p.rows || [], { ref: c.ref, cfg: c.cfg, pic: picAktif, bolehPic: ctx.izin.indexOf('pic.atur') >= 0, alias: c.alias, hariIni: hariIni_(),
    cariNomor: function (nk) { return peta[nk] || null; } });
  var so = KD.periksaSO(p.so || [], hasil, function (nk) { return peta[nk] || null; });
  var out = { dibuat: [], diperbarui: [], dilewati: 0, gagal: [], so: 0 }, tambah = { Kontrak: [], BAST: [], OrderInternal: [], Kendala: [], RiwayatTahap: [], Indeks: [] }, bundles = [];
  var semuaB = null;
  hasil.forEach(function (o) {
    if (o.st === 'error') { out.gagal.push({ baris: o.baris, no: o.no, err: o.err }); return; }
    var orders = so.filter(function (x) { return x.st === 'ok' && x.kontrak && KD.normKey(x.kontrak.no) === KD.normKey(o.no); })
      .map(function (x) { return { JenisOrder: x.j, NoOrder: x.ono, JenisLayanan: x.lay, JenisPekerjaan: x.pek, JumlahLokasi: x.lok, Keterangan: x.ket }; });
    if (o.st === 'ada') {
      if (mode !== 'perbarui' || !o.ada || o.ada.lokasi !== 'AKTIF') { out.dilewati++; return; }
      semuaB = semuaB || bundleSemua_();
      var bl = semuaB[o.ada.KontrakID];
      if (!bl) { out.dilewati++; return; }
      var ch = KD.perubahanUpload(o, bl.k), f = {};
      ch.forEach(function (x) { f[x[0]] = x[2]; });
      if (!c.izin || ctx.izin.indexOf('pic.atur') < 0) delete f.PIC;
      var lamaB = { k: bl.k, bast: bl.bast, order: bl.order, kend: bl.kend, alias: [] }, cur = lamaB, logs = [], riw = [];
      try {
        if (Object.keys(f).length) { var r1 = KD.jalankan('kontrak.ubah', cur, { f: f }, c); cur = r1.bundle; logs = logs.concat(r1.log); }
        orders.forEach(function (od) {
          if (KD.hidup(cur.order).some(function (x) { return x.NoOrderNorm === KD.normKey(od.NoOrder); })) return;
          var r2 = KD.jalankan('order.simpan', cur, { o: od }, c); cur = r2.bundle; logs = logs.concat(r2.log); out.so++;
        });
      } catch (e) { out.gagal.push({ baris: o.baris, no: o.no, err: [e.message] }); return; }
      if (cur === lamaB) { out.dilewati++; return; }
      logs.forEach(function (l) { l.catatan = [l.catatan, 'upload Excel ' + file + ' baris ' + o.baris].filter(Boolean).join(' · '); });
      terapkanHasil_(lamaB, { bundle: cur, log: logs, riwayat: riw, alias: [] }, ctx, { tanpaFeed: true });
      bundles.push(cur); out.diperbarui.push({ baris: o.baris, KontrakID: cur.k.KontrakID, no: cur.k.NoKontrak });
      return;
    }
    try {
      var tgl = o.tgl ? o.tgl + ' 08:00:00' : '';
      var r = KD.jalankan('kontrak.buat', null, {
        f: { NoKontrak: o.no, JudulKontrak: o.judul, JenisDok: o.jenis, TahunProject: o.tahun, Populasi: o.pop, NamaPelanggan: o.pel, EndCustomer: o.end,
             Segment: o.seg, NilaiKontrak: o.nilai, JumlahLokasi: o.lok, PIC: o.pic },
        orders: orders, dokTagih: o.docFinal, tahapAwal: o.tahap, tglTahap: tgl, ketBast: o.cat,
        kendala: o.kend ? { Jenis: o.kend, Keterangan: o.ket } : null, sumber: 'UPLOAD', catatan: 'upload Excel ' + file + ' baris ' + o.baris
      }, c);
      var b = r.bundle;
      tambah.Kontrak.push(b.k); tambah.BAST = tambah.BAST.concat(b.bast); tambah.OrderInternal = tambah.OrderInternal.concat(b.order);
      tambah.Kendala = tambah.Kendala.concat(b.kend); tambah.RiwayatTahap = tambah.RiwayatTahap.concat(r.riwayat); tambah.Indeks.push(barisIndeks_(b.k));
      peta[b.k.NoKontrakNorm] = { KontrakID: b.k.KontrakID, NoKontrak: b.k.NoKontrak, lokasi: 'AKTIF' };
      r.log.forEach(function (l) { Repo.tulisLog({ user: ctx.user.Username, aksi: l.aksi, entitas: l.entitas, id: l.id, field: l.field, lama: l.lama, baru: l.baru, catatan: l.catatan }); });
      out.so += b.order.length;
      bundles.push(b); out.dibuat.push({ baris: o.baris, KontrakID: b.k.KontrakID, no: b.k.NoKontrak });
    } catch (e) { out.gagal.push({ baris: o.baris, no: o.no, err: [e.message] }); }
  });
  Object.keys(tambah).forEach(function (tab) { if (tambah[tab].length) Repo.besarTambah(tab, tambah[tab]); });
  catat_(ctx, 'UPLOAD_EXCEL', 'Kontrak', file, out.dibuat.length + ' dibuat, ' + out.diperbarui.length + ' diperbarui, ' + out.dilewati + ' dilewati, ' + out.gagal.length + ' error' + (p.bagian ? ' (bagian ' + p.bagian + ')' : ''));
  out.seq = bundles.length ? Repo.feedTambah({ bundles: bundles }) : Repo.seq();
  out.bundles = bundles;
  return out;
} };

// ---------------- pengaturan referensi (§5.1, §5.2, §5.5)
function cekKode_(kode) { return /^[A-Z][A-Z0-9_]{1,31}$/.test(kode); }
function simpanDaftar_(ctx, tab, list, kunci, label) {
  var lama = Repo.semua(tab), kodeLama = lama.map(function (r) { return r[kunci]; }), kodeBaru = list.map(function (r) { return r[kunci]; });
  kodeLama.forEach(function (k) { wajib_(kodeBaru.indexOf(k) >= 0, label + ' "' + k + '" tidak boleh dihapus. Nonaktifkan saja supaya riwayat tetap utuh.'); });
  wajib_(new Set(kodeBaru).size === kodeBaru.length, 'Ada kode yang dobel.');
  var by = {}; lama.forEach(function (r) { by[r[kunci]] = r; });
  var catatan = [];
  list.forEach(function (r) {
    var l = by[r[kunci]];
    if (!l) catatan.push('tambah ' + r[kunci]);
    else Object.keys(r).forEach(function (c) { if (c !== 'UpdatedAt' && c !== 'UpdatedBy' && String(l[c]) !== String(r[c])) catatan.push(r[kunci] + '.' + c + ': ' + l[c] + ' → ' + r[c]); });
    r.UpdatedBy = ctx.user.Username;
  });
  if (!catatan.length) return false;
  Repo.gantiSemua(tab, list);
  catat_(ctx, 'UBAH_PENGATURAN', tab, '—', catatan.slice(0, 30).join('; ') + (catatan.length > 30 ? '; …' : ''));
  return true;
}
function bastOpenPerTahap_() {
  var ref = KD.siapkanRef(refRaw_()), n = {};
  Repo.semua('BAST').forEach(function (b) { if (!KD.bool(b.Dihapus) && !KD.bastClose(b, ref)) n[b.KodeTahap] = (n[b.KodeTahap] || 0) + 1; });
  return n;
}

AKSI['pengaturan.tahap'] = { izin: 'pengaturan.kelola', ubah: true, fn: function (ctx) {
  var list = (ctx.payload.list || []).map(function (r, i) {
    var o = { Kode: KD.t(r.Kode).toUpperCase(), Urutan: String(i + 1), Label: KD.t(r.Label), Penutup: KD.bool(r.Penutup) ? 'TRUE' : 'FALSE',
              BatasAgingHari: KD.t(r.BatasAgingHari) || '14', Aktif: KD.bool(r.Aktif) ? 'TRUE' : 'FALSE' };
    wajib_(cekKode_(o.Kode), 'Kode tahap "' + o.Kode + '" harus 2–32 huruf kapital/angka/garis bawah, diawali huruf.');
    wajib_(o.Label, 'Label tahap ' + o.Kode + ' wajib diisi.');
    wajib_(/^\d+$/.test(o.BatasAgingHari) && +o.BatasAgingHari >= 1 && +o.BatasAgingHari <= 365, 'Batas aging ' + o.Kode + ' harus 1–365 hari.');
    return o;
  });
  wajib_(list.filter(function (r) { return r.Aktif === 'TRUE' && r.Penutup === 'TRUE'; }).length === 1, 'Harus ada tepat satu tahap penutup yang aktif.');
  wajib_(list.some(function (r) { return r.Aktif === 'TRUE' && r.Penutup !== 'TRUE'; }), 'Harus ada minimal satu tahap aktif yang bukan penutup.');
  var open = bastOpenPerTahap_();
  list.forEach(function (r) { if (r.Aktif !== 'TRUE' && open[r.Kode]) throw Repo.galat('MASIH_DIPAKAI', 'Tahap ' + r.Label + ' masih dipakai ' + open[r.Kode] + ' BAST OPEN. Pindahkan dulu ke tahap lain.'); });
  var lamaPenutup = Repo.semua('Ref_Tahap').filter(function (r) { return KD.bool(r.Penutup); }).map(function (r) { return r.Kode; }).join();
  list.forEach(function (r) { if (r.Penutup === 'TRUE' && lamaPenutup.split(',').indexOf(r.Kode) < 0 && open[r.Kode]) throw Repo.galat('VALIDASI', 'Tahap ' + r.Label + ' masih berisi BAST OPEN; tidak bisa dijadikan penutup.'); });
  var berubah = simpanDaftar_(ctx, 'Ref_Tahap', list, 'Kode', 'Tahap');
  var n = berubah ? hitungUlang_() : 0;
  if (berubah) Repo.feedTambah({ muatUlang: true, alasan: 'tahap diubah' });
  return { berubah: berubah, dihitungUlang: n, ref: refRaw_() };
} };

AKSI['pengaturan.pindahTahap'] = { izin: 'pengaturan.kelola', ubah: true, fn: function (ctx) {
  var dari = String(ctx.payload.dari || ''), ke = String(ctx.payload.ke || ''), ket = KD.t(ctx.payload.ket), c = ctxKD_(ctx), tk = c.ref.T[ke];
  wajib_(tk && tk.Aktif && !tk.Penutup, 'Tahap tujuan harus aktif dan bukan tahap penutup.');
  wajib_(dari !== ke, 'Tahap asal dan tujuan sama.');
  var m = bundleSemua_(), n = 0;
  Object.keys(m).forEach(function (kid) {
    var b = m[kid], lama = { k: b.k, bast: b.bast, order: b.order, kend: b.kend, alias: [] }, cur = lama, logs = [], riw = [];
    b.bast.filter(function (x) { return x.KodeTahap === dari && !KD.bool(x.Dihapus) && !KD.bastClose(x, c.ref); }).forEach(function (x) {
      var r = KD.jalankan('bast.tahap', cur, { id: x.BASTID, ke: ke, ket: ket || 'dipindah massal dari tahap ' + dari }, c);
      cur = r.bundle; logs = logs.concat(r.log); riw = riw.concat(r.riwayat); n++;
    });
    if (cur !== lama) terapkanHasil_(lama, { bundle: cur, log: logs, riwayat: riw, alias: [] }, ctx, { tanpaFeed: true });
  });
  catat_(ctx, 'PINDAH_TAHAP_MASSAL', 'Ref_Tahap', dari + '→' + ke, n + ' BAST');
  if (n) Repo.feedTambah({ muatUlang: true, alasan: 'pindah tahap massal' });
  return { dipindah: n };
} };

AKSI['pengaturan.kendala'] = { izin: 'pengaturan.kelola', ubah: true, fn: function (ctx) {
  var list = (ctx.payload.list || []).map(function (r, i) {
    var o = { Kode: KD.t(r.Kode).toUpperCase(), Label: KD.t(r.Label), WajibKeterangan: KD.bool(r.WajibKeterangan) ? 'TRUE' : 'FALSE',
              MemicuReopen: KD.bool(r.MemicuReopen) ? 'TRUE' : 'FALSE', Aktif: KD.bool(r.Aktif) ? 'TRUE' : 'FALSE', Urutan: String(i + 1) };
    wajib_(cekKode_(o.Kode), 'Kode kendala "' + o.Kode + '" harus 2–32 huruf kapital/angka/garis bawah, diawali huruf.');
    wajib_(o.Label, 'Label kendala ' + o.Kode + ' wajib diisi.');
    return o;
  });
  var berubah = simpanDaftar_(ctx, 'Ref_Kendala', list, 'Kode', 'Jenis kendala');
  if (berubah) Repo.feedTambah({ muatRef: true });
  return { berubah: berubah, ref: refRaw_() };
} };

AKSI['pengaturan.push'] = { izin: 'pengaturan.kelola', ubah: true, fn: function (ctx) {
  var ref = KD.siapkanRef(refRaw_()), kondisi = {};
  var list = (ctx.payload.list || []).map(function (r, i) {
    var o = { Urutan: String(i + 1), Kondisi: KD.t(r.Kondisi).toUpperCase(), Nilai: KD.t(r.Nilai), Aktif: KD.bool(r.Aktif) ? 'TRUE' : 'FALSE' };
    var k = o.Kondisi, sah = ['CLOSE', 'SISA_LOKASI', 'BELUM_ADA_BAST', 'KENDALA:*'].indexOf(k) >= 0 ||
      (k.indexOf('KENDALA:') === 0 && ref.KD[k.slice(8)]) || (k.indexOf('TAHAP:') === 0 && ref.T[k.slice(6)]);
    wajib_(sah, 'Kondisi "' + k + '" tidak dikenal.');
    wajib_(o.Nilai, 'Teks Kendala Umum untuk ' + k + ' wajib diisi.');
    wajib_(o.Nilai.length <= 80, 'Teks Kendala Umum maksimal 80 karakter.');
    wajib_(!kondisi[k], 'Kondisi ' + k + ' muncul dua kali.');
    kondisi[k] = 1;
    return o;
  });
  wajib_(list.length, 'Minimal satu aturan.');
  var lama = Repo.semua('Ref_NilaiPush').map(function (r) { return [r.Kondisi, r.Nilai, r.Aktif].join('|'); }).join('\n');
  var baru = list.map(function (r) { return [r.Kondisi, r.Nilai, r.Aktif].join('|'); }).join('\n');
  if (lama === baru) return { berubah: false, ref: refRaw_() };
  list.forEach(function (r) { r.UpdatedBy = ctx.user.Username; });
  Repo.gantiSemua('Ref_NilaiPush', list);
  catat_(ctx, 'UBAH_NILAI_PUSH', 'Ref_NilaiPush', '—', list.length + ' aturan');
  var n = hitungUlang_();
  Repo.feedTambah({ muatUlang: true, alasan: 'aturan Nilai Push diubah' });
  return { berubah: true, dihitungUlang: n, ref: refRaw_() };
} };

AKSI['pengaturan.ref'] = { izin: 'pengaturan.kelola', ubah: true, fn: function (ctx) {
  var tab = { jenisDok: 'Ref_JenisDok', populasi: 'Ref_Populasi', segment: 'Ref_Segment', dokTagih: 'Ref_DokTagih' }[ctx.payload.jenis];
  wajib_(tab, 'Jenis referensi tidak dikenal.');
  var list = (ctx.payload.list || []).map(function (r, i) {
    var o = { Kode: KD.t(r.Kode), Label: KD.t(r.Label) || KD.t(r.Kode), Aktif: KD.bool(r.Aktif) ? 'TRUE' : 'FALSE', Urutan: String(i + 1) };
    wajib_(o.Kode && o.Kode.length <= 40, 'Kode referensi wajib diisi (maks. 40 karakter).');
    return o;
  });
  if (tab === 'Ref_DokTagih') wajib_(list.some(function (r) { return r.Kode === 'BAST' && r.Aktif === 'TRUE'; }) && list.some(function (r) { return r.Kode === 'BAA' && r.Aktif === 'TRUE'; }), 'BAST dan BAA harus tetap aktif.');
  var berubah = simpanDaftar_(ctx, tab, list, 'Kode', 'Referensi');
  if (berubah) Repo.feedTambah({ muatRef: true });
  return { berubah: berubah, ref: refRaw_() };
} };
