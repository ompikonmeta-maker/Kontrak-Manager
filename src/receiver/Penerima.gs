/**
 * SKM · Script Penerima — dipasang SEKALI oleh pemilik sheet unit.
 *
 * Cara pasang:
 *  1. Buka sheet ini → Extensions › Apps Script → hapus isi Code.gs → tempel seluruh script ini.
 *  2. Isi SECRET di bawah dengan kode rahasia yang diberikan tim FF. Simpan (Ctrl+S).
 *  3. Pilih fungsi `pasang` → Run → izinkan akses (memasang pencatat edit manual di kolom milik FF).
 *  4. Deploy › New deployment › Web app · Execute as: Me · Who has access: Anyone → Deploy
 *     → kirim Web app URL (berakhiran /exec) ke tim FF.
 *
 * Yang dilakukan script ini:
 *  - Hanya menjawab permintaan yang membawa kode rahasia yang benar.
 *  - Membaca judul kolom dan kolom yang diminta saja (tidak mengirim seluruh sheet).
 *  - Menulis HANYA sel kolom milik FF yang diminta. Tidak pernah menambah/menghapus baris atau kolom,
 *    tidak mengubah format, dan tidak menimpa sel berisi rumus.
 *  - Sebelum menulis, membaca ulang judul kolom dan kolom nomor kontrak; bila ada yang berubah,
 *    seluruh penulisan dibatalkan.
 *  - Mencatat edit manual di kolom milik FF (siapa & kapan) supaya tidak ditimpa SKM.
 */
var SECRET = 'ISI-KODE-RAHASIA';
var VERSI = 1;
var MAKS_CATATAN = 300;   // catatan edit manual yang disimpan

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (x) { return keluar_({ ok: false, kode: 'FORMAT', pesan: 'Permintaan bukan JSON.' }); }
  if (!SECRET || SECRET === 'ISI-KODE-RAHASIA') return keluar_({ ok: false, kode: 'BELUM_DIISI', pesan: 'Kode rahasia (SECRET) di script penerima belum diisi.' });
  if (req.secret !== SECRET) return keluar_({ ok: false, kode: 'KODE_SALAH', pesan: 'Kode rahasia tidak cocok.' });
  try {
    if (req.aksi === 'info') return keluar_(info_());
    if (req.aksi === 'baca') return keluar_(baca_(req));
    if (req.aksi === 'tulis') return keluar_(tulis_(req));
    if (req.aksi === 'edit') return keluar_(ambilEdit_(req));
    return keluar_({ ok: false, kode: 'AKSI', pesan: 'Aksi tidak dikenal: ' + req.aksi });
  } catch (err) {
    return keluar_({ ok: false, kode: 'ERROR', pesan: String(err && err.message || err) });
  }
}
function doGet() { return keluar_({ ok: true, versi: VERSI, pesan: 'Script penerima SKM v' + VERSI + ' aktif. Dipakai dari aplikasi SKM.' }); }

/** Jalankan SEKALI (tombol Run): memasang pencatat edit manual. Aman dijalankan ulang. */
function pasang() {
  var ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'catatEdit') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('catatEdit').forSpreadsheet(ss).onEdit().create();
  Logger.log('Pencatat edit manual terpasang untuk "' + ss.getName() + '". Lanjutkan: Deploy › New deployment › Web app.');
}

// ------------------------------------------------------------------ aksi
function info_() {
  var ss = SpreadsheetApp.getActive();
  return { ok: true, versi: VERSI, nama: ss.getName(), id: ss.getId(), zona: ss.getSpreadsheetTimeZone(),
           tabs: ss.getSheets().map(function (sh) { return { nama: sh.getName(), baris: sh.getLastRow(), kolom: sh.getLastColumn() }; }),
           pencatat: ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'catatEdit'; }),
           catatan: daftarEdit_().length };
}
/** {tab, header: jumlah baris teratas, dari: baris data pertama, kolom: [c…], formula: [c…]} */
function baca_(req) {
  var sh = tab_(req.tab), last = sh.getLastRow(), lastCol = Math.max(sh.getLastColumn(), 1), out = { ok: true, tab: sh.getName(), lastRow: last, lastCol: lastCol, kolom: {}, formula: {} };
  if (req.header) out.header = last ? sh.getRange(1, 1, Math.min(req.header, last), lastCol).getDisplayValues() : [];
  var dari = Number(req.dari) || 2, n = last - dari + 1;
  (req.kolom || []).forEach(function (c) { out.kolom[c] = n > 0 ? sh.getRange(dari, c, n, 1).getDisplayValues().map(function (r) { return r[0]; }) : []; });
  (req.formula || []).forEach(function (c) {
    var f = n > 0 ? sh.getRange(dari, c, n, 1).getFormulas() : [], idx = [];
    f.forEach(function (r, i) { if (r[0]) idx.push(dari + i); });
    out.formula[c] = idx;
  });
  return out;
}
/**
 * {tab, hdrRow, harap: [{c, judul}], kunci: {c, baris: {r: normKey}}, sel: [{r, c, v}]}
 * Dikunci; judul & kunci dibaca ulang; bila berubah → seluruh tab dibatalkan. Sel berformula dilewati.
 */
function tulis_(req) {
  var lock = LockService.getDocumentLock() || LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = tab_(req.tab), lastCol = Math.max(sh.getLastColumn(), 1), hdr = sh.getRange(req.hdrRow, 1, 1, lastCol).getDisplayValues()[0];
    var normH = hdr.map(normHeader_), salah = [];
    (req.harap || []).forEach(function (h) {
      var n = normHeader_(h.judul), di = normH[h.c - 1], jml = normH.filter(function (x) { return x === n; }).length;
      if (di !== n) salah.push('kolom ' + huruf_(h.c) + ' seharusnya "' + h.judul + '", sekarang "' + (hdr[h.c - 1] || '') + '"');
      else if (jml > 1) salah.push('judul "' + h.judul + '" ada lebih dari satu');
    });
    if (salah.length) return { ok: false, kode: 'KOLOM_BERUBAH', pesan: 'Judul kolom berubah: ' + salah.join('; ') + '. Tidak ada yang ditulis.' };
    var rows = Object.keys((req.kunci || {}).baris || {}).map(Number);
    if (rows.length) {
      var r0 = Math.min.apply(null, rows), r1 = Math.max.apply(null, rows), kv = sh.getRange(r0, req.kunci.c, r1 - r0 + 1, 1).getDisplayValues(), geser = [];
      rows.forEach(function (r) { if (normKey_(kv[r - r0][0]) !== req.kunci.baris[r]) geser.push(r); });
      if (geser.length) return { ok: false, kode: 'URUTAN_BERUBAH', pesan: 'Urutan baris berubah (baris ' + geser.slice(0, 5).join(', ') + (geser.length > 5 ? ', …' : '') + '). Tidak ada yang ditulis; coba lagi.' };
    }
    // lewati sel berformula; kelompokkan per nilai supaya satu panggilan per nilai
    var perKolom = {}, dilewati = [], grup = {}, n = 0;
    (req.sel || []).forEach(function (x) { (perKolom[x.c] = perKolom[x.c] || []).push(x); });
    Object.keys(perKolom).forEach(function (c) {
      var xs = perKolom[c], a = Math.min.apply(null, xs.map(function (x) { return x.r; })), b = Math.max.apply(null, xs.map(function (x) { return x.r; }));
      var f = sh.getRange(a, Number(c), b - a + 1, 1).getFormulas();
      xs.forEach(function (x) {
        if (f[x.r - a][0]) { dilewati.push({ r: x.r, c: x.c, alasan: 'FORMULA' }); return; }
        var key = String(x.v); (grup[key] = grup[key] || []).push(huruf_(x.c) + x.r);
      });
    });
    Object.keys(grup).forEach(function (v) {
      for (var i = 0; i < grup[v].length; i += 500) { sh.getRangeList(grup[v].slice(i, i + 500)).setValue(v); }
      n += grup[v].length;
    });
    if (req.pantau) PropertiesService.getScriptProperties().setProperty('PANTAU', JSON.stringify(req.pantau));
    return { ok: true, ditulis: n, dilewati: dilewati };
  } finally { lock.releaseLock(); }
}
/** Edit manual sejak waktu tertentu (ISO). */
function ambilEdit_(req) {
  var sejak = String(req.sejak || '');
  return { ok: true, edit: daftarEdit_().filter(function (e) { return e.w > sejak; }) };
}

// ------------------------------------------------------------------ pencatat edit manual (trigger onEdit terpasang)
function catatEdit(e) {
  try {
    var p = JSON.parse(PropertiesService.getScriptProperties().getProperty('PANTAU') || 'null');
    if (!p || !e || !e.range) return;
    var sh = e.range.getSheet(), hdrRow = (p.hdr || {})[sh.getName()] || p.hdrDefault;
    if (!hdrRow || e.range.getRow() <= hdrRow) return;
    var judul = (p.judul || []).map(normHeader_), c0 = e.range.getColumn(), nc = e.range.getNumColumns();
    var hdr = sh.getRange(hdrRow, c0, 1, nc).getDisplayValues()[0], oleh = '';
    try { oleh = e.user && e.user.getEmail ? e.user.getEmail() : ''; } catch (x) { oleh = ''; }
    var props = PropertiesService.getScriptProperties(), seq = Number(props.getProperty('E_SEQ') || 0), banyak = e.range.getNumRows() > 1 || nc > 1;
    for (var i = 0; i < nc; i++) {
      if (judul.indexOf(normHeader_(hdr[i])) < 0) continue;
      seq++;
      props.setProperty('E_' + seq, JSON.stringify({ w: new Date().toISOString(), tab: sh.getName(), r: e.range.getRow(), n: e.range.getNumRows(), c: c0 + i, judul: hdr[i],
        lama: banyak ? '' : String(e.oldValue == null ? '' : e.oldValue), baru: banyak ? '(banyak sel)' : String(e.value == null ? '' : e.value), oleh: oleh }));
      props.deleteProperty('E_' + (seq - MAKS_CATATAN));
    }
    props.setProperty('E_SEQ', String(seq));
  } catch (err) { /* pencatat tidak boleh mengganggu pengguna sheet */ }
}
function daftarEdit_() {
  var all = PropertiesService.getScriptProperties().getProperties(), out = [];
  Object.keys(all).forEach(function (k) { if (/^E_\d+$/.test(k)) { try { out.push(JSON.parse(all[k])); } catch (x) { /* abaikan */ } } });
  return out.sort(function (a, b) { return a.w < b.w ? -1 : 1; });
}

// ------------------------------------------------------------------ bantuan
function tab_(nama) { var sh = SpreadsheetApp.getActive().getSheetByName(nama); if (!sh) throw new Error('Tab "' + nama + '" tidak ada.'); return sh; }
function normHeader_(v) { return String(v == null ? '' : v).normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]+/g, ''); }
function normKey_(x) { return String(x == null ? '' : x).normalize('NFKC').toUpperCase().replace(/[‐-―−]/g, '-').replace(/\s+/g, '').replace(/\.+$/, ''); }
function huruf_(c) { var r = ''; while (c > 0) { var m = (c - 1) % 26; r = String.fromCharCode(65 + m) + r; c = Math.floor((c - 1) / 26); } return r; }
function keluar_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
