/**
 * SKM — Uji beban (project terpisah, BUKAN project SKM).
 * Membuat database tiruan setara ±3 tahun data di folder Drive "SKM_UJI_BEBAN", lalu mengukur kecepatan nyata
 * Google Sheet di akun ini. Tidak menyentuh SKM_DB. Hapus semuanya dengan bersihkan().
 *
 * Urutan: siapkanData → (menunggu, lanjut otomatis) → ukurServer → deploy Web app → uji dari browser → bersihkan.
 */
var UJI_VERSI = '1.0';
var JML = { total: 18000, aktifDari: 15000, log: 300000 };   // kontrak 2024: 0–5999, 2025: 6000–11999, 2026 close: 12000–14999, aktif: 15000–17999
var BATAS_DETIK_BAWAAN = 270;

var KOL = {
  Kontrak: ['KontrakID', 'NoKontrak', 'NoKontrakNorm', 'JenisDok', 'TahunProject', 'Populasi', 'NamaPelanggan', 'EndCustomer', 'JudulKontrak', 'Segment',
    'NilaiKontrak', 'JumlahLokasi', 'PIC', 'JenisCustomer', 'TahapKontrak', 'StatusKontrak', 'SisaLokasi', 'KendalaUmum', 'KendalaDetil', 'TglStatusBerubah',
    'PerluVerifikasi', 'Arsip', 'SumberAwal', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'Version', 'Keterangan', 'Wilayah',
    'Kategori', 'NoPO', 'Termin', 'MataUang', 'TglKontrak', 'Catatan'],
  BAST: ['BASTID', 'KontrakID', 'Urutan', 'DokTagih', 'KodeTahap', 'Siklus', 'CakupanOrder', 'CakupanLokasi', 'DaftarLokasi', 'NoDokBAST',
    'TglTahapMulai', 'Keterangan', 'Status', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'Version', 'Info1', 'Info2'],
  Orders: ['OrderID', 'KontrakID', 'JenisOrder', 'NoOrder', 'NoOrderNorm', 'JenisLayanan', 'JenisPekerjaan', 'JumlahLokasi', 'Keterangan', 'CreatedAt', 'CreatedBy', 'Version'],
  Riwayat: ['BASTID', 'Siklus', 'KodeTahap', 'Masuk', 'Keluar', 'Oleh', 'Keterangan'],
  Indeks: ['NoKontrakNorm', 'KontrakID', 'NoKontrak', 'EndCustomer', 'JudulKontrak', 'StatusKontrak', 'Lokasi', 'Alias'],
  Log: ['Timestamp', 'Username', 'Aksi', 'Entitas', 'EntitasID', 'Field', 'NilaiLama', 'NilaiBaru', 'Catatan', 'Hasil']
};
var FILE = { AKTIF: 'SKM_UJI_AKTIF', A2024: 'SKM_UJI_ARSIP_2024', A2025: 'SKM_UJI_ARSIP_2025', A2026: 'SKM_UJI_ARSIP_2026',
             SATU: 'SKM_UJI_TANPA_ARSIP', LOG: 'SKM_UJI_LOG_2026' };

// ------------------------------------------------------------------ data tiruan (deterministik)
var CUST = ['PT Telkom Indonesia (Persero) Tbk', 'Bank Rakyat Indonesia', 'Bank Mandiri', 'Bank Permata', 'Bank Danamon Indonesia', 'Pertamina Hulu Energi',
  'PT Freeport Indonesia', 'Kementerian Kesehatan', 'Dinas Kominfo Prov. Jawa Barat', 'PT Sawit Nusantara Raya', 'PT Armada Bahari', 'Pemprov Maluku',
  'PT Hexindo Adi Perkasa', 'PT Wananugraha Bima Lestari', 'BAKTI Kominfo', 'PT PLN (Persero)', 'Bank Negara Indonesia', 'PT Indosat Tbk', 'PT XL Axiata', 'Pemkab Sorong'];
var JUDUL = ['Layanan VSAT IP', 'Internet Satelit', 'Backhaul BTS Remote', 'Sewa Link Satelit', 'Jaringan VSAT Remote Site', 'Maritime VSAT', 'Layanan Komunikasi Data Satelit'];
var KOTA = ['Papua', 'Maluku', 'NTT', 'Kalimantan Barat', 'Sulawesi Tengah', 'Aceh', 'Riau', 'Jawa Barat', 'Sumatera Utara', 'Kepulauan Riau'];
var PIC = ['Edo', 'Unggul', 'Baim', 'Alif', 'Rina', 'Dewi', 'Fajar', 'Gilang', 'Hana', 'Irfan', 'Joko', 'Kiki', 'Lia', 'Mega', 'omPik'];
var TAHAP = ['KOMPULIR', 'DRAFTING', 'REVIEW_CUST', 'SIRKULIR', 'BAST_DONE', 'TAKEOUT'];
var KU = ['KOMPULIR EVIDEN', 'DRAFTING DOKUMEN', 'DRAFT REVIEW CUSTOMER', 'SIRKULIR DOKUMEN', 'BAST DONE', 'REVISI DOKUMEN', 'KENDALA CUSTOMER'];
var AKSI = ['UBAH_TAHAP', 'UBAH_KONTRAK', 'BUKA_KENDALA', 'TUTUP_KENDALA', 'LOGIN', 'ATUR_PIC', 'BUAT_KONTRAK', 'UBAH_BAST'];
var POP = ['TREG', 'SDA', 'PRM', 'DIRECT'], SEG = ['LBCS', 'GOS', 'ENS', 'OLOS'], LAY = ['VSAT IP', 'VSAT Broadband', 'Backhaul', 'Mangoesky'], PEK = ['Instalasi', 'Sewa', 'Instalasi + Sewa'];

function h_(i, s) { var x = Math.sin((i + 1) * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); }
function pilih_(a, i, s) { return a[Math.floor(h_(i, s) * a.length)]; }
function pad_(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
function tahun_(i) { return i < 6000 ? 2024 : i < 12000 ? 2025 : 2026; }
function kid_(i) { return 'K-' + pad_(i + 1, 6); }
function noK_(i) { return 'TEL.' + pad_(i % 10000, 4) + '-' + pad_(Math.floor(h_(i, 1) * 9999), 4) + '/HK.810/DES-A' + pad_(1000000 + i, 7) + '/' + tahun_(i); }
function norm_(s) { return String(s).toUpperCase().replace(/\s+/g, ''); }
function tgl_(i, s, t) {
  return t + '-' + pad_(1 + Math.floor(h_(i, s) * 12), 2) + '-' + pad_(1 + Math.floor(h_(i, s + 1) * 28), 2) + ' ' +
    pad_(8 + Math.floor(h_(i, s + 2) * 9), 2) + ':' + pad_(Math.floor(h_(i, s + 3) * 60), 2) + ':00';
}
function lokasi_(i) { return i >= JML.aktifDari ? 'AKTIF' : 'ARSIP_' + (i >= 12000 ? 2026 : tahun_(i)); }
function judul_(i) { return pilih_(JUDUL, i, 3) + ' ' + (1 + Math.floor(h_(i, 4) * 60)) + ' Lokasi ' + pilih_(KOTA, i, 5); }

function barisKontrak_(i) {
  var t = tahun_(i), aktif = i >= JML.aktifDari, end = pilih_(CUST, i, 6), cust = h_(i, 7) < 0.4 ? end : CUST[0], tahap = aktif ? pilih_(TAHAP.slice(0, 5), i, 8) : 'TAKEOUT';
  var st = aktif ? (h_(i, 9) < 0.9 ? 'OPEN' : 'CLOSE') : 'CLOSE', dibuat = tgl_(i, 10, t);
  return [kid_(i), noK_(i), norm_(noK_(i)), 'KL', String(t), pilih_(POP, i, 11), cust, end, judul_(i), pilih_(SEG, i, 12),
    String(Math.floor(h_(i, 13) * 5e9)), String(1 + Math.floor(h_(i, 4) * 60)), pilih_(PIC, i, 14), cust === end ? 'DIRECT' : 'INDIRECT', tahap, st,
    '0', st === 'CLOSE' ? 'BAST TAKEOUT/SERTIM AR' : pilih_(KU, i, 15), 'Menunggu tanda tangan GM customer, evidence lokasi ' + (i % 7 + 1) + ' belum lengkap',
    tgl_(i, 16, t), 'FALSE', 'FALSE', 'UPLOAD', dibuat, 'admin', tgl_(i, 17, t), pilih_(PIC, i, 18).toLowerCase(), String(1 + i % 9),
    'Termin ' + (i % 4 + 1), pilih_(KOTA, i, 5), 'Satelit', 'PO-' + pad_(i, 7), String(i % 4 + 1), 'IDR', tgl_(i, 19, t), ''];
}
function barisBast_(i) {
  var out = [], n = 1 + (i % 2), t = tahun_(i), aktif = i >= JML.aktifDari;
  for (var b = 0; b < n; b++) {
    out.push([kid_(i) + '-B' + (b + 1), kid_(i), String(b + 1), h_(i, 20) < 0.4 ? 'BAA' : 'BAST', aktif ? pilih_(TAHAP, i + b, 21) : 'TAKEOUT', '1',
      'SO-' + t + '-' + pad_(i, 6), String(1 + Math.floor(h_(i + b, 22) * 30)), '', aktif ? '' : 'BAST/TSAT/' + pad_(i, 5) + '/' + t,
      tgl_(i + b, 23, t), 'Lokasi tahap ' + (b + 1), aktif ? 'OPEN' : 'CLOSE', tgl_(i, 10, t), 'admin', tgl_(i + b, 24, t), pilih_(PIC, i, 14).toLowerCase(), '1', '', '']);
  }
  return out;
}
function barisOrder_(i) {
  var t = tahun_(i);
  return [0, 1].map(function (o) {
    var no = (o ? 'MI-' : 'SO-') + t + '-' + pad_(i * 2 + o, 6);
    return ['O-' + pad_(i * 2 + o + 1, 7), kid_(i), o ? 'MI' : 'SO', no, norm_(no), pilih_(LAY, i + o, 25), pilih_(PEK, i + o, 26),
      String(1 + Math.floor(h_(i + o, 27) * 30)), '', tgl_(i, 10, t), 'admin', '1'];
  });
}
function barisRiwayat_(i) {
  var out = [], n = 4 + (i % 5), t = tahun_(i);
  for (var k = 0; k < n; k++) out.push([kid_(i) + '-B1', '1', TAHAP[k % 6], tgl_(i + k, 30, t), k < n - 1 ? tgl_(i + k, 31, t) : '', pilih_(PIC, i + k, 32).toLowerCase(), k % 3 ? '' : 'catatan tahap ' + k]);
  return out;
}
function barisIndeks_(i) { var r = barisKontrak_(i); return [r[2], r[0], r[1], r[7], r[8], r[15], lokasi_(i), '']; }
function barisLog_(i) {
  var k = Math.floor(h_(i, 41) * JML.total);
  return [tgl_(i, 40, 2026), pilih_(PIC, i, 42).toLowerCase(), pilih_(AKSI, i, 43), 'Kontrak', kid_(k), 'KodeTahap', pilih_(TAHAP, i, 44), pilih_(TAHAP, i, 45),
    'perubahan dari halaman detail kontrak', 'BERHASIL'];
}

function daftarTugas_() {
  var t = [], kontrakTabs = function (f, a, b) {
    t.push({ f: f, tab: 'Kontrak', a: a, b: b, gen: function (i) { return [barisKontrak_(i)]; } });
    t.push({ f: f, tab: 'BAST', a: a, b: b, gen: barisBast_ });
    t.push({ f: f, tab: 'Orders', a: a, b: b, gen: barisOrder_ });
    t.push({ f: f, tab: 'Riwayat', a: a, b: b, gen: barisRiwayat_ });
  };
  kontrakTabs('AKTIF', JML.aktifDari, JML.total);
  t.push({ f: 'AKTIF', tab: 'Indeks', a: 0, b: JML.total, gen: function (i) { return [barisIndeks_(i)]; } });
  kontrakTabs('A2024', 0, 6000); kontrakTabs('A2025', 6000, 12000); kontrakTabs('A2026', 12000, JML.aktifDari);
  t.push({ f: 'SATU', tab: 'Kontrak', a: 0, b: JML.total, gen: function (i) { return [barisKontrak_(i)]; } });
  t.push({ f: 'SATU', tab: 'Riwayat', a: 0, b: JML.total, gen: barisRiwayat_ });
  t.push({ f: 'LOG', tab: 'Log', a: 0, b: JML.log, gen: function (i) { return [barisLog_(i)]; } });
  return t;
}
function barisTugas_(tg) { var n = 0; for (var i = tg.a; i < tg.b; i++) n += tg.tab === 'BAST' ? 1 + (i % 2) : tg.tab === 'Orders' ? 2 : tg.tab === 'Riwayat' ? 4 + (i % 5) : 1; return n; }

// ------------------------------------------------------------------ util
function P_() { return PropertiesService.getScriptProperties(); }
function getJ_(k, d) { var v = P_().getProperty(k); try { return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function setJ_(k, v) { P_().setProperty(k, JSON.stringify(v)); }
function buka_(key) { var id = P_().getProperty('ID_' + key); if (!id) throw new Error('File ' + FILE[key] + ' belum dibuat. Jalankan siapkanData dulu.'); return SpreadsheetApp.openById(id); }
function tab_(key, tab) { return buka_(key).getSheetByName(tab); }
function sekarang_() { return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'); }
function batasDetik_() { return Number(P_().getProperty('UJI_BATAS_DETIK')) || BATAS_DETIK_BAWAAN; }
function angka_(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function pastikanIzin_() { if (typeof ScriptApp !== 'undefined' && ScriptApp.requireAllScopes) ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL); }

function aturUkuran_(sh, rows, cols) {
  var mr = sh.getMaxRows(), mc = sh.getMaxColumns();
  if (mc > cols) sh.deleteColumns(cols + 1, mc - cols); else if (mc < cols) sh.insertColumnsAfter(mc, cols - mc);
  if (mr > rows) sh.deleteRows(rows + 1, mr - rows); else if (mr < rows) sh.insertRowsAfter(mr, rows - mr);
}
/** Tulis baris mulai baris r; tambah baris sheet (berformat teks) bila kurang. */
function tulis_(sh, r, rows, ncol) {
  if (!rows.length) return;
  var butuh = r + rows.length - 1, max = sh.getMaxRows();
  if (butuh > max) { var n = butuh - max; sh.insertRowsAfter(max, n); sh.getRange(max + 1, 1, n, ncol).setNumberFormat('@'); }
  sh.getRange(r, 1, rows.length, ncol).setValues(rows);
}
function tambahBaris_(sh, rows) { tulis_(sh, sh.getLastRow() + 1, rows, rows.length ? rows[0].length : 1); }

// ------------------------------------------------------------------ 1. siapkan data
/** Jalankan dari editor. Membuat folder + file uji, lalu menulis data; berlanjut otomatis tiap ±1 menit sampai selesai. */
function siapkanData() {
  pastikanIzin_();
  if (P_().getProperty('SIAP') === '1') { console.log('Data uji sudah siap. Lanjut jalankan ukurServer.'); return; }
  if (!P_().getProperty('ID_FOLDER')) {
    var f = DriveApp.createFolder('SKM_UJI_BEBAN');
    P_().setProperty('ID_FOLDER', f.getId());
    setJ_('KURSOR', { t: 0, i: null, r: 2 });
    setJ_('TULIS', { sel: 0, ms: 0, run: 0 });
    P_().setProperty('MULAI', sekarang_());
    console.log('Folder SKM_UJI_BEBAN dibuat di My Drive.');
  }
  kerjakan_();
}
function lanjutkanData() { kerjakan_(); }

function kerjakan_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) { console.log('Proses lain sedang berjalan. Tunggu sebentar lalu jalankan status.'); return; }
  var t0 = Date.now(), batas = batasDetik_() * 1000;
  try {
    var tugas = daftarTugas_(), k = getJ_('KURSOR', { t: 0, i: null, r: 2 }), w = getJ_('TULIS', { sel: 0, ms: 0, run: 0 }), cache = {};
    w.run++;
    while (k.t < tugas.length) {
      var tg = tugas[k.t], ncol = KOL[tg.tab].length;
      if (k.i === null) k.i = tg.a;
      var ss = cache[tg.f] || (cache[tg.f] = siapkanFile_(tg.f)), sh = ss.getSheetByName(tg.tab) || siapkanTab_(ss, tg.tab, false);
      while (k.i < tg.b) {
        if (Date.now() - t0 > batas) { simpanKursor_(k, w); jadwalkan_(); console.log(progres_()); return; }
        var rows = [];
        while (k.i < tg.b && rows.length < 5000) { var g = tg.gen(k.i); for (var x = 0; x < g.length; x++) rows.push(g[x]); k.i++; }
        var tw = Date.now();
        tulis_(sh, k.r, rows, ncol);
        w.ms += Date.now() - tw; w.sel += rows.length * ncol; k.r += rows.length;
        simpanKursor_(k, w);   // bila terhenti paksa, lanjut dari sini (baris yang sama ditulis ulang, hasilnya identik)
      }
      k.t++; k.i = null; k.r = 2;
      simpanKursor_(k, w);
    }
    hapusPemicu_();
    P_().setProperty('SIAP', '1'); P_().setProperty('SELESAI', sekarang_());
    console.log('SELESAI. ' + ringkasData_() + '\nLanjut: pilih fungsi ukurServer → Run.');
  } catch (e) {
    console.error('Gagal: ' + (e.stack || e.message));
    jadwalkan_();   // dicoba lagi otomatis
    throw e;
  } finally { lock.releaseLock(); }
}
function simpanKursor_(k, w) { setJ_('KURSOR', k); setJ_('TULIS', w); }
function siapkanFile_(key) {
  var id = P_().getProperty('ID_' + key);
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.create(FILE[key]);
  P_().setProperty('ID_' + key, ss.getId());
  DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(P_().getProperty('ID_FOLDER')));
  var tabPertama = daftarTugas_().filter(function (t) { return t.f === key; })[0].tab;
  siapkanTab_(ss, tabPertama, true);
  return ss;
}
function siapkanTab_(ss, tab, pertama) {
  var sh = pertama ? ss.getSheets()[0] : ss.insertSheet(tab), ncol = KOL[tab].length;
  if (pertama) sh.setName(tab);
  aturUkuran_(sh, 2, ncol);
  sh.getRange(1, 1, 2, ncol).setNumberFormat('@');
  sh.getRange(1, 1, 1, ncol).setValues([KOL[tab]]);
  sh.setFrozenRows(1);
  return sh;
}
function jadwalkan_() {
  hapusPemicu_();
  ScriptApp.newTrigger('lanjutkanData').timeBased().after(60 * 1000).create();
}
function hapusPemicu_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'lanjutkanData') ScriptApp.deleteTrigger(t); });
}
function progres_() {
  var tugas = daftarTugas_(), k = getJ_('KURSOR', { t: 0, i: null, r: 2 }), tot = 0, sudah = 0;
  tugas.forEach(function (tg, j) { var n = barisTugas_(tg); tot += n; if (j < k.t) sudah += n; else if (j === k.t && k.r > 2) sudah += k.r - 2; });
  var pct = Math.min(100, Math.floor(sudah / tot * 100));
  return P_().getProperty('SIAP') === '1' ? 'Data uji SIAP (100%).' :
    'Menyiapkan data: ' + pct + '% (' + angka_(sudah) + ' dari ' + angka_(tot) + ' baris). Lanjut otomatis ±1 menit lagi; jalankan status untuk melihat progres.';
}
/** Jalankan dari editor untuk melihat progres penyiapan data. */
function status() { console.log(progres_()); }
function ringkasData_() {
  var w = getJ_('TULIS', { sel: 0, ms: 0, run: 0 });
  return 'Data: ' + angka_(JML.total - JML.aktifDari) + ' kontrak aktif, indeks ' + angka_(JML.total) + ' kontrak, arsip 2024/2025/2026 = 6.000/6.000/3.000 kontrak, ' +
    'pembanding tanpa arsip ' + angka_(JML.total) + ' kontrak, log ' + angka_(JML.log) + ' baris. Total ditulis ' + angka_(w.sel) + ' sel dalam ' +
    (w.ms / 1000).toFixed(0) + ' dtk tulis (' + angka_(w.sel / Math.max(1, w.ms / 1000)) + ' sel/dtk), ' + w.run + ' kali jalan.';
}

// ------------------------------------------------------------------ 2. ukur di server
function acakAktif_() { return JML.aktifDari + 300 + Math.floor(Math.random() * (JML.total - JML.aktifDari - 300)); }
function acakArsip_() { return 6000 + Math.floor(Math.random() * 6000); }

function halaman_() {
  var v = tab_('AKTIF', 'Kontrak').getDataRange().getValues(); v.shift();
  var hasil = v.filter(function (r) { return r[15] === 'OPEN' && (r[8] + ' ' + r[7]).toUpperCase().indexOf('VSAT') >= 0; });
  hasil.sort(function (a, b) { return a[19] < b[19] ? 1 : a[19] > b[19] ? -1 : 0; });
  return { total: hasil.length, rows: hasil.slice(0, 50).map(function (r) { return [r[0], r[1], r[7], r[8], r[14], r[17], r[12], String(r[10]), r[15]]; }) };
}
function cariIndeks_(i) {
  var sh = tab_('AKTIF', 'Indeks'), n = sh.getLastRow() - 1, col = sh.getRange(2, 1, n, 1).getValues(), key = norm_(noK_(i));
  for (var r = 0; r < col.length; r++) if (col[r][0] === key) return sh.getRange(r + 2, 1, 1, KOL.Indeks.length).getValues()[0];
  return null;
}
function cariIndeksTF_(i) {
  var sh = tab_('AKTIF', 'Indeks'), c = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(norm_(noK_(i))).matchEntireCell(true).findNext();
  return c ? sh.getRange(c.getRow(), 1, 1, KOL.Indeks.length).getValues()[0] : null;
}
var KUNCI_TAB = { Kontrak: 1, BAST: 2, Orders: 2, Riwayat: 1 };
/** Ambil semua baris satu kontrak dengan TextFinder (baris satu kontrak berurutan). */
function barisKontrakTF_(ss, t, kid) {
  var sh = ss.getSheetByName(t), last = sh.getLastRow();
  if (last < 2) return { sh: sh, r1: 0, rows: [] };
  var f = sh.getRange(2, KUNCI_TAB[t], last - 1, 1).createTextFinder(t === 'Riwayat' ? kid + '-B' : kid).matchEntireCell(t !== 'Riwayat').findAll();
  if (!f.length) return { sh: sh, r1: 0, rows: [] };
  var r1 = f[0].getRow(), r2 = f[f.length - 1].getRow();
  return { sh: sh, r1: r1, rows: sh.getRange(r1, 1, r2 - r1 + 1, KOL[t].length).getValues() };
}
function detailTF_(key, kid) {
  var ss = buka_(key), n = 0;
  ['Kontrak', 'BAST', 'Orders', 'Riwayat'].forEach(function (t) { n += barisKontrakTF_(ss, t, kid).rows.length; });
  return n;
}
function detailPenuh_(key, kid) {
  var ss = buka_(key), n = 0;
  ['Kontrak', 'BAST', 'Orders', 'Riwayat'].forEach(function (t) {
    var v = ss.getSheetByName(t).getDataRange().getValues(), c = KUNCI_TAB[t] - 1;
    v.forEach(function (r) { if (t === 'Riwayat' ? String(r[0]).indexOf(kid + '-B') === 0 : r[c] === kid) n++; });
  });
  return n;
}
function detailArsip_(viaTF) {
  var i = acakArsip_(), idx = cariIndeks_(i), key = idx[6] === 'AKTIF' ? 'AKTIF' : 'A' + idx[6].slice(-4);
  return (viaTF ? detailTF_(key, idx[1]) : detailPenuh_(key, idx[1])) + ' baris dari ' + FILE[key];
}
/** Simulasi satu simpan perubahan status: kunci, ubah 1 baris kontrak, tambah riwayat, tulis 3 baris Log. */
function simpanSatu_() {
  var t0 = Date.now(), lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Kunci tidak didapat dalam 30 dtk');
  var tunggu = Date.now() - t0;
  try {
    var ss = buka_('AKTIF'), k = ss.getSheetByName('Kontrak'), nc = KOL.Kontrak.length, r = 2 + Math.floor(Math.random() * 2500), now = sekarang_();
    var row = k.getRange(r, 1, 1, nc).getValues()[0];
    row[14] = 'DRAFTING'; row[25] = now; row[27] = String(Number(row[27] || 1) + 1);
    k.getRange(r, 1, 1, nc).setValues([row]);
    tambahBaris_(ss.getSheetByName('Riwayat'), [[row[0] + '-B1', '1', 'DRAFTING', now, '', 'uji', 'uji beban']]);
    tambahBaris_(tab_('LOG', 'Log'), [0, 1, 2].map(function (x) { return [now, 'uji', 'UBAH_TAHAP', 'Kontrak', row[0], 'KodeTahap', 'KOMPULIR', 'DRAFTING', 'uji beban ' + x, 'BERHASIL']; }));
  } finally { lock.releaseLock(); }
  return { tunggu: tunggu, kerja: Date.now() - t0 - tunggu };
}
/** Pindahkan kontrak (beserta BAST, order, riwayat) antar file dengan menulis ulang tab. */
function pindahMassal_(dari, ke, ids, lokasi) {
  var A = buka_(dari), B = buka_(ke), n = 0;
  ['Kontrak', 'BAST', 'Orders', 'Riwayat'].forEach(function (t) {
    var sh = A.getSheetByName(t), v = sh.getDataRange().getValues(), head = v.shift(), c = KUNCI_TAB[t] - 1, pindah = [], sisa = [];
    v.forEach(function (r) { var key = t === 'Riwayat' ? String(r[0]).replace(/-B\d+$/, '') : r[c]; (ids[key] ? pindah : sisa).push(r); });
    tambahBaris_(B.getSheetByName(t), pindah);
    if (v.length) sh.getRange(2, 1, v.length, head.length).clearContent();
    if (sisa.length) sh.getRange(2, 1, sisa.length, head.length).setValues(sisa);
    n += pindah.length;
  });
  aturLokasi_(Object.keys(ids), lokasi);
  return n;
}
function aturLokasi_(kids, lokasi) {
  var sh = tab_('AKTIF', 'Indeks');
  if (kids.length === 1) { sh.getRange(Number(kids[0].slice(2)) + 1, 7).setValue(lokasi); return; }
  var col = sh.getRange(2, 7, sh.getLastRow() - 1, 1).getValues();
  kids.forEach(function (kid) { col[Number(kid.slice(2)) - 1][0] = lokasi; });
  sh.getRange(2, 7, col.length, 1).setValues(col);
}
/** Pindahkan satu kontrak antar file dengan TextFinder + hapus baris (dipakai untuk reopen dari arsip). */
function pindahSatu_(dari, ke, kid, lokasi) {
  var A = buka_(dari), B = buka_(ke), n = 0;
  ['Kontrak', 'BAST', 'Orders', 'Riwayat'].forEach(function (t) {
    var x = barisKontrakTF_(A, t, kid);
    if (!x.rows.length) return;
    tambahBaris_(B.getSheetByName(t), x.rows);
    x.sh.deleteRows(x.r1, x.rows.length);
    n += x.rows.length;
  });
  aturLokasi_([kid], lokasi);
  return n;
}
/** 300 kontrak pertama di DB aktif; disimpan supaya bisa dikembalikan walau ukurServer terputus di tengah. */
function ids300_(baru) {
  var simpan = getJ_('IDS300', null);
  if (simpan || !baru) return simpan;
  var ids = {}; tab_('AKTIF', 'Kontrak').getRange(2, 1, 300, 1).getValues().forEach(function (r) { ids[r[0]] = 1; });
  setJ_('IDS300', ids);
  return ids;
}

var UJI = [
  ['buka', 'Buka file DB aktif', 3, function () { buka_('AKTIF').getSheetByName('Kontrak').getMaxRows(); }],
  ['kontrakAktif', 'Baca semua kontrak aktif (3.000 × 36 kolom)', 3, function () { return tab_('AKTIF', 'Kontrak').getDataRange().getValues().length - 1 + ' baris'; }],
  ['halaman', 'Halaman daftar: baca kontrak aktif → filter → urut → 50 baris', 3, function () { return halaman_().total + ' cocok'; }],
  ['indeksPenuh', 'Cari teks di indeks semua kontrak (18.000 × 8 kolom)', 3, function () {
    var v = tab_('AKTIF', 'Indeks').getDataRange().getValues(), n = 0; v.forEach(function (r) { if (String(r[3]).indexOf('Bank') >= 0) n++; }); return n + ' cocok'; }],
  ['indeksKolom', 'Cari nomor di indeks (baca kolom nomor saja)', 3, function () { return cariIndeks_(acakArsip_()) ? 'ketemu' : 'TIDAK KETEMU'; }],
  ['indeksTF', 'Cari nomor di indeks (TextFinder)', 3, function () { return cariIndeksTF_(acakArsip_()) ? 'ketemu' : 'TIDAK KETEMU'; }],
  ['detailAktif', 'Buka detail kontrak aktif (TextFinder di 4 tab)', 3, function () { return detailTF_('AKTIF', kid_(acakAktif_())) + ' baris'; }],
  ['detailAktifPenuh', 'Buka detail kontrak aktif (baca 4 tab penuh)', 2, function () { return detailPenuh_('AKTIF', kid_(acakAktif_())) + ' baris'; }],
  ['detailArsip', 'Cari lewat indeks → buka detail kontrak arsip (TextFinder)', 3, function () { return detailArsip_(true); }],
  ['detailArsipPenuh', 'Cari lewat indeks → buka detail kontrak arsip (baca penuh)', 2, function () { return detailArsip_(false); }],
  ['tanpaArsipKontrak', 'TANPA ARSIP: baca semua kontrak (18.000 × 36)', 2, function () { return tab_('SATU', 'Kontrak').getDataRange().getValues().length - 1 + ' baris'; }],
  ['tanpaArsipRiwayat', 'TANPA ARSIP: baca semua riwayat (±108.000 × 7)', 2, function () { return tab_('SATU', 'Riwayat').getDataRange().getValues().length - 1 + ' baris'; }],
  ['simpan', 'Simpan 1 perubahan status (kunci + kontrak + riwayat + 3 log)', 5, function () { var s = simpanSatu_(); return 'tunggu kunci ' + s.tunggu + ' ms'; }],
  ['logTambah', 'Tambah 1 baris ke Log 300.000 baris', 3, function () { tambahBaris_(tab_('LOG', 'Log'), [[sekarang_(), 'uji', 'UJI', '', '', '', '', '', 'uji beban', 'BERHASIL']]); }],
  ['logAkhir', 'Baca 300 log terakhir (halaman Log)', 3, function () { var sh = tab_('LOG', 'Log'), l = sh.getLastRow(); return sh.getRange(l - 299, 1, 300, 10).getValues().length + ' baris'; }],
  ['logFilter', 'Filter Log setahun per user (baca 2 kolom × 300.000)', 2, function () {
    var sh = tab_('LOG', 'Log'), v = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues(), n = 0; v.forEach(function (r) { if (r[1] === 'edo') n++; }); return n + ' cocok'; }],
  ['cache', 'Cache: simpan + ambil kontrak aktif (dipotong per 90 KB)', 3, function () {
    var json = JSON.stringify(tab_('AKTIF', 'Kontrak').getDataRange().getValues()), c = CacheService.getScriptCache(), obj = {}, keys = [];
    for (var j = 0; j * 90000 < json.length; j++) { obj['uji:' + j] = json.substr(j * 90000, 90000); keys.push('uji:' + j); }
    c.putAll(obj, 600);
    var got = c.getAll(keys), s = keys.map(function (k) { return got[k] || ''; }).join('');
    return Math.round(json.length / 1024) + ' KB, ' + keys.length + ' potong, ' + (s === json ? 'utuh' : 'TIDAK UTUH');
  }],
  ['pindah300', 'Pindahkan 300 kontrak CLOSE ke arsip (bulanan)', 1, function () {
    if (getJ_('IDS300', null)) return 'lewat (300 kontrak masih di arsip, dikembalikan di langkah berikut)';
    return pindahMassal_('AKTIF', 'A2026', ids300_(true), 'ARSIP_2026') + ' baris dipindah'; }],
  ['kembali300', 'Kembalikan 300 kontrak dari arsip ke aktif', 1, function () {
    var ids = ids300_(false); if (!ids) return 'lewat';
    var n = pindahMassal_('A2026', 'AKTIF', ids, 'AKTIF'); P_().deleteProperty('IDS300'); return n + ' baris dipindah'; }],
  ['reopen', 'Reopen 1 kontrak dari arsip 2025 ke aktif', 3, function () {
    var kid = kid_(acakArsip_()), l = getJ_('REOPEN', []); l.push(kid); setJ_('REOPEN', l); return pindahSatu_('A2025', 'AKTIF', kid, 'AKTIF') + ' baris'; }],
  ['arsipLagi', 'Arsipkan lagi 1 kontrak (aktif → arsip)', 3, function () {
    var l = getJ_('REOPEN', []), kid = l.shift(); setJ_('REOPEN', l); return kid ? pindahSatu_('AKTIF', 'A2025', kid, 'ARSIP_2025') + ' baris' : 'lewat'; }]
];

/** Jalankan dari editor setelah data SIAP. Hasil tercetak di Execution log dan tersimpan untuk halaman Web app. */
function ukurServer() {
  if (P_().getProperty('SIAP') !== '1') { console.log(progres_() + '\nTunggu sampai data SIAP, lalu jalankan ukurServer lagi.'); return; }
  var t0 = Date.now(), mulai = Number(P_().getProperty('UKUR_I') || 0);
  for (var u = mulai; u < UJI.length; u++) {
    if (Date.now() - t0 > 240000) {
      P_().setProperty('UKUR_I', String(u));
      console.log('Sebagian selesai (' + u + '/' + UJI.length + '). Jalankan ukurServer sekali lagi untuk melanjutkan.');
      return;
    }
    var x = UJI[u], ms = [], info = '';
    for (var r = 0; r < x[2]; r++) {
      var a = Date.now();
      try { info = x[3]() || info; } catch (e) { info = 'GAGAL: ' + e.message; ms.push(Date.now() - a); break; }
      ms.push(Date.now() - a);
    }
    setJ_('H_' + x[0], { nama: x[1], ms: ms, info: info });
    console.log(barisHasil_(x[1], ms, info));
  }
  P_().setProperty('UKUR_I', '0');
  P_().setProperty('UKUR_WAKTU', sekarang_());
  console.log('\nSelesai. Lanjut: Deploy sebagai Web app lalu buka URL-nya untuk uji dari browser.\n\n' + laporanServer_());
}
function median_(a) { var s = a.slice().sort(function (x, y) { return x - y; }); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; }
function barisHasil_(nama, ms, info) {
  return nama + ': ' + (ms.length > 1 ? 'median ' + angka_(median_(ms)) + ' ms (min ' + angka_(Math.min.apply(null, ms)) + ', maks ' + angka_(Math.max.apply(null, ms)) + ')' : angka_(ms[0] || 0) + ' ms') + (info ? ' · ' + info : '');
}
function laporanServer_() {
  var out = ['Hasil uji beban SKM v' + UJI_VERSI + ' — server (' + (P_().getProperty('UKUR_WAKTU') || '-') + ')', ringkasData_()];
  UJI.forEach(function (x) { var h = getJ_('H_' + x[0], null); if (h) out.push('- ' + barisHasil_(h.nama, h.ms, h.info)); });
  return out.join('\n');
}
/** Cetak ulang laporan server di Execution log. */
function laporan() { console.log(laporanServer_()); }

// ------------------------------------------------------------------ 3. Web app (uji dari browser)
function doGet() {
  return HtmlService.createHtmlOutput(PAGE_HTML.split('{{VERSI}}').join(UJI_VERSI)).setTitle('SKM Uji Beban').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function waktu_(fn) { var a = Date.now(), r = fn(); return { s: Date.now() - a, r: r }; }
function wInfo() { return { siap: P_().getProperty('SIAP') === '1', progres: progres_(), server: laporanServer_(), sudahUkur: !!P_().getProperty('UKUR_WAKTU') }; }
function wPing() { return { s: 0 }; }
function wHalaman() { var x = waktu_(halaman_); return { s: x.s, n: x.r.rows.length, rows: x.r.rows }; }
function wDetailAktif() { var x = waktu_(function () { return detailTF_('AKTIF', kid_(acakAktif_())); }); return { s: x.s, n: x.r }; }
function wDetailArsip() { var x = waktu_(function () { return detailArsip_(true); }); return { s: x.s, n: x.r }; }
function wSimpan() { var x = simpanSatu_(); return { s: x.tunggu + x.kerja, tunggu: x.tunggu, kerja: x.kerja }; }

// ------------------------------------------------------------------ 4. bersihkan
/** Hapus semua file uji (ke Sampah Drive), pemicu, dan catatan. Aman dijalankan kapan saja. */
function bersihkan() {
  hapusPemicu_();
  var p = P_().getProperties(), n = 0;
  Object.keys(p).forEach(function (k) {
    if (k.indexOf('ID_') === 0) { try { (k === 'ID_FOLDER' ? DriveApp.getFolderById(p[k]) : DriveApp.getFileById(p[k])).setTrashed(true); n++; } catch (e) { console.log('Lewati ' + k + ': ' + e.message); } }
  });
  P_().deleteAllProperties();
  console.log('Selesai: ' + n + ' file/folder uji dipindah ke Sampah Drive. Project ini boleh dihapus.');
}

var PAGE_HTML = `<!doctype html><html lang="id"><head><meta charset="utf-8"><base target="_top">
<style>
:root{--bg:#f4f6fb;--card:#fff;--fg:#141a2b;--muted:#5d6680;--line:#e2e6f0;--acc:#2f6fed;--ok:#18935f;--warn:#b7791f;--crit:#c53030}
@media (prefers-color-scheme:dark){:root{--bg:#0e1220;--card:#161c2e;--fg:#e8ecf6;--muted:#9aa3bd;--line:#273049;--acc:#6f9bff;--ok:#3cc488;--warn:#e0b04a;--crit:#f26d6d}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:860px;margin:0 auto;padding:24px 16px 60px;display:flex;flex-direction:column;gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px}
h1{margin:0;font-size:22px}h2{margin:0 0 10px;font-size:16px}.muted{color:var(--muted)}
button{font:inherit;font-weight:600;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--fg);padding:9px 14px;cursor:pointer}
button.pri{background:var(--acc);border-color:var(--acc);color:#fff}button:disabled{opacity:.5;cursor:default}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:7px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
textarea{width:100%;min-height:220px;font:12px/1.5 ui-monospace,Consolas,monospace;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:10px;padding:10px}
.pill{display:inline-block;padding:1px 9px;border-radius:99px;font-size:12px;font-weight:600;background:var(--bg)}
.ok{color:var(--ok)}.warn{color:var(--warn)}.crit{color:var(--crit)}
pre{white-space:pre-wrap;font:12px/1.5 ui-monospace,Consolas,monospace;margin:0}
</style></head><body><div class="wrap">
<div><div class="muted">Status Kontrak Manager · uji beban v{{VERSI}}</div><h1>Uji kecepatan dari browser</h1></div>
<div class="card" id="st">Memeriksa data uji…</div>
<div class="card"><h2>Uji dari browser</h2><p class="muted" style="margin-top:0">Buka halaman ini dari PC kantor. Setiap uji memanggil server lewat jalur yang sama dengan aplikasi SKM, jadi waktunya sudah termasuk jaringan. Total ±2 menit.</p>
<div class="row"><button class="pri" id="b1">1. Uji berurutan</button><button class="pri" id="b2">2. Uji 15 orang bersamaan</button><span class="muted" id="prog"></span></div>
<table id="tb" style="margin-top:12px"><thead><tr><th>Uji</th><th>Median</th><th>Min</th><th>Maks</th><th>Catatan</th></tr></thead><tbody></tbody></table></div>
<div class="card"><h2>Laporan</h2><p class="muted" style="margin-top:0">Setelah kedua uji selesai, klik Salin laporan lalu tempel di chat.</p>
<div class="row" style="margin-bottom:10px"><button class="pri" id="cp">Salin laporan</button><span class="muted" id="cpm"></span></div><textarea id="rep" readonly></textarea></div>
</div>
<script>
(function(){
var hasil=[],server='',info=null;
function $(s){return document.querySelector(s);}
function call(fn){return new Promise(function(ok,no){var t=performance.now();google.script.run.withSuccessHandler(function(r){ok({rt:Math.round(performance.now()-t),r:r});}).withFailureHandler(function(e){no(e);})[fn]();});}
function med(a){var s=a.slice().sort(function(x,y){return x-y;});return s.length?s[Math.floor((s.length-1)/2)]:0;}
function f(n){return String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.')+' ms';}
function tambah(nama,a,cat){hasil.push({nama:nama,a:a,cat:cat||''});gambar();}
function gambar(){$('#tb tbody').innerHTML=hasil.map(function(h){return '<tr><td>'+h.nama+'</td><td class="n">'+f(med(h.a))+'</td><td class="n">'+f(Math.min.apply(null,h.a))+'</td><td class="n">'+f(Math.max.apply(null,h.a))+'</td><td class="muted">'+h.cat+'</td></tr>';}).join('');laporan();}
function laporan(){var L=[server||'(hasil server belum ada: jalankan ukurServer di editor)','','Hasil uji beban SKM v{{VERSI}} — browser ('+new Date().toLocaleString('id-ID')+')','Browser: '+((navigator.userAgent.match(/(Edg|OPR|Firefox|Chrome)\\/[\\d.]+/)||[navigator.userAgent])[0])];
 hasil.forEach(function(h){L.push('- '+h.nama+': median '+f(med(h.a))+' (min '+f(Math.min.apply(null,h.a))+', maks '+f(Math.max.apply(null,h.a))+')'+(h.cat?' · '+h.cat:''));});$('#rep').value=L.join('\\n');}
async function seri(nama,fn,n){var a=[],s=[];for(var i=0;i<n;i++){$('#prog').textContent=nama+' '+(i+1)+'/'+n+'…';var x=await call(fn);a.push(x.rt);if(x.r&&x.r.s!=null)s.push(x.r.s);}
 tambah(nama,a,s.length?'di server median '+f(med(s))+', sisanya jaringan & Apps Script':'');}
async function bersamaan(nama,fn,n){$('#prog').textContent=nama+'…';var t=performance.now();var xs=await Promise.all(Array.from({length:n},function(){return call(fn).catch(function(e){return {rt:0,err:String(e&&e.message||e)};});}));
 var tot=Math.round(performance.now()-t),ok=xs.filter(function(x){return !x.err;}),tg=ok.map(function(x){return x.r.tunggu||0;});
 tambah(nama,ok.map(function(x){return x.rt;}),'semua selesai dalam '+f(tot)+(tg.length&&fn==='wSimpan'?', tunggu antre median '+f(med(tg))+' maks '+f(Math.max.apply(null,tg)):'')+(xs.length-ok.length?', '+(xs.length-ok.length)+' GAGAL':''));}
$('#b1').onclick=async function(){this.disabled=true;try{await seri('Panggilan kosong (ongkos dasar)','wPing',5);await seri('Halaman daftar kontrak (50 baris)','wHalaman',5);await seri('Detail kontrak aktif','wDetailAktif',3);
 await seri('Cari & buka kontrak arsip','wDetailArsip',3);await seri('Simpan perubahan status','wSimpan',5);$('#prog').textContent='Uji berurutan selesai.';}catch(e){$('#prog').textContent='Gagal: '+(e.message||e);}this.disabled=false;};
$('#b2').onclick=async function(){this.disabled=true;try{await bersamaan('15 orang buka daftar bersamaan','wHalaman',15);await bersamaan('15 orang simpan bersamaan','wSimpan',15);$('#prog').textContent='Uji bersamaan selesai.';}catch(e){$('#prog').textContent='Gagal: '+(e.message||e);}this.disabled=false;};
$('#cp').onclick=function(){var t=$('#rep');t.focus();t.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}if(navigator.clipboard)navigator.clipboard.writeText(t.value).then(function(){$('#cpm').textContent='Tersalin.';},function(){$('#cpm').textContent=ok?'Tersalin.':'Teks sudah dipilih, tekan Ctrl+C.';});else $('#cpm').textContent=ok?'Tersalin.':'Teks sudah dipilih, tekan Ctrl+C.';};
google.script.run.withSuccessHandler(function(r){info=r;server=r.server;
 $('#st').innerHTML=r.siap?(r.sudahUkur?'<span class="pill ok">Data siap · hasil server ada</span> <span class="muted">Lanjut uji dari browser di bawah.</span>':'<span class="pill warn">Data siap, hasil server belum ada</span> <span class="muted">Di editor jalankan ukurServer dulu, lalu muat ulang halaman ini.</span>'):'<span class="pill warn">Data belum siap</span> <span class="muted">'+r.progres+'</span>';
 $('#b1').disabled=$('#b2').disabled=!r.siap;laporan();}).withFailureHandler(function(e){$('#st').innerHTML='<span class="crit">Gagal memanggil server: '+(e.message||e)+'</span>';}).wInfo();
})();
</script></body></html>`;
