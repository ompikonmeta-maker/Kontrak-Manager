/**
 * F4a · Sinkron ke sheet unit lewat script penerima (§8): target, wizard, Cek saja, Update ke GSheet, jejak sel, riwayat push.
 * Pemanggilan ke sheet unit dilakukan DI LUAR kunci global supaya simpan kontrak tim tidak tertahan; kunci hanya saat mencatat hasil.
 */
var KOL_PUSH_ = ['Waktu', 'Oleh', 'Jenis', 'TargetID', 'Tab', 'Baris', 'KontrakID', 'NoKontrak', 'Field', 'NilaiLama', 'NilaiBaru', 'Pelaku', 'WaktuKejadian'];
var KOL_SINKRON_ = ['Waktu', 'Oleh', 'Jenis', 'TargetID', 'Tab', 'BarisCocok', 'SelDitulis', 'Gagal', 'Alarm', 'Detail'];

function rahasia_(id) { return PropertiesService.getScriptProperties().getProperty('RAHASIA_' + id) || ''; }
function cekUrl_(url) {
  url = String(url || '').trim();
  wajib_(/^https:\/\/script\.google\.com\/(a\/[^\/]+\/)?macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url), 'Web App URL harus berbentuk https://script.google.com/macros/s/…/exec (salin dari Deploy › Manage deployments di sheet unit).');
  return url;
}
/** Panggil script penerima. Galat yang dimengerti pengguna bila URL/akses/kode salah. */
function panggilPenerima_(url, secret, aksi, data) {
  var body = { secret: secret, aksi: aksi }; for (var k in (data || {})) body[k] = data[k];
  var res;
  try { res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true, followRedirects: true }); }
  catch (e) { throw Repo.galat('KONEKSI', 'Tidak bisa menghubungi script penerima: ' + e.message); }
  var code = res.getResponseCode(), teks = res.getContentText ? res.getContentText() : '', j = null;
  if (code === 401 || code === 403) throw Repo.galat('KONEKSI', 'Web app sheet unit menolak akses (HTTP ' + code + '). Minta pemilik sheet deploy ulang dengan "Who has access: Anyone".');
  if (code !== 200) throw Repo.galat('KONEKSI', 'Script penerima menjawab HTTP ' + code + '. Cek URL dan deployment-nya.');
  try { j = JSON.parse(teks); } catch (e) { throw Repo.galat('KONEKSI', 'Jawaban bukan dari script penerima SKM. Pastikan URL berakhiran /exec dan akses web app "Anyone".'); }
  if (!j.ok) throw Repo.galat(j.kode === 'KODE_SALAH' || j.kode === 'BELUM_DIISI' ? 'KODE_RAHASIA' : (j.kode || 'PENERIMA'), j.pesan || 'Script penerima menolak permintaan.');
  return j;
}
function targetLengkap_(id) {
  var t = Repo.cari('Target', id); wajib_(t, 'Target tidak ditemukan.', 'TIDAK_ADA');
  return { t: bersih_(t), kolom: Repo.semua('TargetKolom').filter(function (k) { return k.TargetID === id; }).map(bersih_), secret: rahasia_(id) };
}
/** Konfigurasi dari payload wizard (belum disimpan) atau dari DB. */
function konfig_(p) {
  if (p.id) { var c = targetLengkap_(p.id); if (p.konfig && p.konfig.kolom) c.kolom = p.konfig.kolom; return c; }
  var k = p.konfig || {};
  wajib_(k.target, 'Konfigurasi target kosong.');
  return { t: k.target, kolom: k.kolom || [], secret: String(k.rahasia || (k.target.TargetID ? rahasia_(k.target.TargetID) : '')), baru: true };
}
function logBulan_(prefix, kolom, rows) {
  if (!rows.length) return;
  var ym = Repo.sekarang().slice(0, 7), kunci = 'LOG_' + ym.slice(0, 4);
  Repo.tambahKeFile(Repo.bukaFile(kunci, true), kunci, prefix + '-' + ym, kolom, rows.map(function (o) { return kolom.map(function (c) { return o[c] === undefined || o[c] === null ? '' : String(o[c]); }); }));
}
function bacaLogBulan_(prefix, kolom, ym) {
  var f = Repo.bukaFile('LOG_' + ym.slice(0, 4), false), sh = f && f.getSheetByName(prefix + '-' + ym);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, kolom.length).getValues().map(function (r) { var o = {}; kolom.forEach(function (c, i) { o[c] = String(r[i]); }); return o; });
}
function syncLogTerbaru_(n) {
  var ym = Repo.sekarang().slice(0, 7), rows = bacaLogBulan_('Sinkron', KOL_SINKRON_, ym);
  if (rows.length < n) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); rows = bacaLogBulan_('Sinkron', KOL_SINKRON_, Utilities.formatDate(d, APP.TZ, 'yyyy-MM')).concat(rows); }
  return rows.slice(-n).reverse();
}
/** Indeks kontrak untuk pencocokan nomor: aktif (bundle), nomor lama, arsip tahunan, diarsipkan manual. */
function indeksSync_() {
  var semuaB = bundleSemua_(), byNorm = {}, out = {};
  Object.keys(semuaB).forEach(function (kid) { var b = semuaB[kid]; byNorm[b.k.NoKontrakNorm] = b; });
  Repo.semua('Indeks').forEach(function (r) { if (r.Lokasi && r.Lokasi !== 'AKTIF') out[r.NoKontrakNorm] = { status: 'ARSIP', kid: r.KontrakID }; });
  Object.keys(byNorm).forEach(function (nk) { var b = byNorm[nk]; out[nk] = KD.bool(b.k.Arsip) ? { status: 'DIARSIPKAN', kid: b.k.KontrakID } : { status: 'AKTIF', bundle: b }; });
  Repo.semua('KontrakAlias').forEach(function (a) {
    if (out[a.AliasNorm]) return;
    var b = semuaB[a.KontrakID];
    if (b) out[a.AliasNorm] = KD.bool(b.k.Arsip) ? { status: 'DIARSIPKAN', kid: b.k.KontrakID } : { status: 'AKTIF', bundle: b };
  });
  return out;
}
function jejakTarget_(id, tab) {
  var m = {};
  Repo.semua('JejakSel').forEach(function (j) { if (j.TargetID === id && j.Tab === tab) m[j.NoKontrakNorm + '|' + j.Field] = j.NilaiDitulis; });
  return m;
}

/**
 * Inti Cek saja: info → pilih tab → baca judul → petakan lewat judul → baca kolom → rencana. Tidak menulis apa pun ke sheet unit.
 * Hasil berisi semua yang dibutuhkan Update (posisi kolom, baris kunci, rencana).
 */
function jalankanCek_(c) {
  var t = c.t, info = panggilPenerima_(t.WebAppUrl, c.secret, 'info', {}), tabs = info.tabs.map(function (x) { return x.nama; });
  var out = { target: t.TargetID || '', nama: t.Nama, info: { nama: info.nama, versi: info.versi, pencatat: info.pencatat, tabs: tabs }, alarm: [], tabBaru: '' };
  var pilih = SKD.pilihTab(tabs, t), tab = pilih;
  if (!pilih) throw Repo.galat('TAB_TIDAK_ADA', t.ModeTab === 'TERBARU' ? 'Tidak ada tab yang cocok dengan pola "' + t.TabNama + '".' : 'Tab "' + t.TabNama + '" tidak ada di sheet unit.');
  if (t.ModeTab === 'TERBARU' && t.TabTerakhirDipakai && pilih !== t.TabTerakhirDipakai) {
    out.tabBaru = pilih;
    if (Domain.bool(Repo.config('KONFIRMASI_TAB_BARU', 'TRUE')) && tabs.indexOf(t.TabTerakhirDipakai) >= 0) {
      tab = t.TabTerakhirDipakai;
      out.alarm.push({ j: 'TAB_BERGANTI', txt: 'Tab baru "' + pilih + '" terdeteksi. Sampai dikonfirmasi (Pakai tab baru), target ini hanya Cek saja pada tab ' + tab + '.' });
    }
  }
  out.tab = tab; out.titikAwal = !t.TabTerakhirDipakai || tab !== t.TabTerakhirDipakai;
  var h = panggilPenerima_(t.WebAppUrl, c.secret, 'baca', { tab: tab, header: 15 });
  var kunci = c.kolom.filter(function (k) { return k.Arah === 'KUNCI'; })[0];
  wajib_(kunci, 'Target belum punya kolom kunci.');
  var hdrRow = SKD.cariBarisHeader(h.header, kunci.JudulHeader, String(kunci.AliasHeader || t.AliasHeaderKunci || '').split(','));
  if (!hdrRow) { out.batal = true; out.alarm.push({ j: 'KOLOM_BERUBAH', txt: 'Judul kolom kunci "' + kunci.JudulHeader + '" tidak ditemukan (atau lebih dari sekali) di 15 baris teratas tab ' + tab + '. Tab dilewati; SKM tidak menebak kolom.' }); return out; }
  var pm = SKD.petakan(h.header[hdrRow - 1], c.kolom);
  out.hdrRow = hdrRow; out.pos = pm.pos; out.warn = pm.warn;
  if (pm.err.length) { out.batal = true; out.alarm.push({ j: 'KOLOM_BERUBAH', txt: pm.err.join('; ') + '. Seluruh tab dilewati; perbaiki judul di sheet atau ubah pemetaan.' }); return out; }
  var tulis = c.kolom.filter(function (k) { return k.Arah === 'TULIS'; }).map(function (k) { return k.Field; });
  var cols = [pm.pos.KUNCI].concat(tulis.map(function (f) { return pm.pos[f]; }));
  var d = panggilPenerima_(t.WebAppUrl, c.secret, 'baca', { tab: tab, dari: hdrRow + 1, kolom: cols, formula: cols.slice(1) });
  var fset = {}; cols.slice(1).forEach(function (cc) { (d.formula[cc] || []).forEach(function (r) { fset[r + ',' + cc] = 1; }); });
  var baris = (d.kolom[pm.pos.KUNCI] || []).map(function (v, i) {
    var r = hdrRow + 1 + i, sel = {};
    tulis.forEach(function (f) { var cc = pm.pos[f]; sel[f] = { v: (d.kolom[cc] || [])[i], formula: !!fset[r + ',' + cc] }; });
    return { r: r, kunci: v, sel: sel };
  });
  var idx = indeksSync_(), jejak = out.titikAwal ? {} : jejakTarget_(t.TargetID, tab);
  if (out.titikAwal) baris.forEach(function (b) { var hit = idx[SKD.normKey(b.kunci)]; if (hit && hit.status === 'AKTIF') tulis.forEach(function (f) { if (f !== 'TGL_UPDATE' && !b.sel[f].formula) jejak[hit.bundle.k.NoKontrakNorm + '|' + f] = String(b.sel[f].v || '').trim(); }); });
  out.jejakAwal = out.titikAwal ? jejak : null;
  var riwayat = tulis.some(function (f) { return f.indexOf('TGL_TAHAP:') === 0; }) ? Repo.semua('RiwayatTahap') : [];
  var ref = KD.siapkanRef(refRaw_());
  out.rencana = SKD.rencana({ baris: baris, tulis: tulis, cari: function (nk) { return idx[nk] || null; }, jejak: jejak, ref: ref, riwayat: riwayat,
    fmtTgl: t.FormatTanggal || 'dd/MM/yyyy', hariIni: Repo.sekarang().slice(0, 10) });
  out.alarm = out.alarm.concat(out.rencana.alarm);
  out.tulis = tulis;
  return out;
}
/** Ringkasan untuk browser (tanpa data internal). */
function ringkasCek_(r) {
  var rows = r.rencana ? r.rencana.rows.map(function (x) { return { r: x.r, raw: x.raw, kid: x.kid || '', st: x.st, sel: x.sel }; }) : [];
  return { target: r.target, nama: r.nama, tab: r.tab, tabBaru: r.tabBaru, titikAwal: r.titikAwal, hdrRow: r.hdrRow, info: r.info, batal: !!r.batal, warn: r.warn || [],
           pos: r.pos || {}, huruf: Object.keys(r.pos || {}).reduce(function (o, f) { o[f] = SKD.huruf(r.pos[f]); return o; }, {}),
           alarm: r.alarm, n: r.rencana ? r.rencana.n : null, rows: rows, tulis: r.tulis || [] };
}
function catatHasil_(id, patch, logRow) {
  Repo.kunci(function () {
    if (id) Repo.ubah('Target', id, patch, logRow.Oleh);
    logBulan_('Sinkron', KOL_SINKRON_, [logRow]);
  });
  Repo.feedTambah({ muatRef: true });
}
function alarmSingkat_(a) { return JSON.stringify((a || []).slice(0, 20).map(function (x) { return { j: x.j, r: x.r || '', kid: x.kid || '', txt: String(x.txt).slice(0, 300) }; })); }
function daftarTargetKlien_(lengkap) {
  return Repo.semua('Target').map(function (t) {
    var o = { TargetID: t.TargetID, Nama: t.Nama, ModeTab: t.ModeTab, TabNama: t.TabNama, Tab: t.TabTerakhirDipakai, TabBaru: t.TabBaru, Aktif: Domain.bool(t.Aktif),
              TerakhirCek: t.TerakhirCek, TerakhirUpdate: t.TerakhirUpdate, StatusTerakhir: t.StatusTerakhir, PesanTerakhir: t.PesanTerakhir, alarm: [] };
    try { o.alarm = JSON.parse(t.AlarmTerakhir || '[]'); } catch (e) { o.alarm = []; }
    if (lengkap) {
      Object.keys(t).forEach(function (k) { if (k !== '_row' && !(k in o)) o[k] = t[k]; });
      o.adaRahasia = !!rahasia_(t.TargetID);
      o.kolom = Repo.semua('TargetKolom').filter(function (k) { return k.TargetID === t.TargetID; }).map(bersih_);
    }
    return o;
  });
}

AKSI['target.list'] = { izin: 'sinkron.jalankan', fn: function () {
  return { targets: daftarTargetKlien_(true), log: syncLogTerbaru_(30), versiScript: RECEIVER_VERSI };
} };
AKSI['target.script'] = { izin: 'target.kelola', fn: function () { return { kode: RECEIVER_CODE, versi: RECEIVER_VERSI }; } };
AKSI['target.rahasiaBaru'] = { izin: 'target.kelola', fn: function () { return { rahasia: Utilities.getUuid().replace(/-/g, '').slice(0, 24) }; } };
AKSI['target.rahasia'] = { izin: 'target.kelola', fn: function (ctx) {
  var id = String(ctx.payload.id || ''); wajib_(Repo.cari('Target', id), 'Target tidak ditemukan.', 'TIDAK_ADA');
  catat_(ctx, 'LIHAT_RAHASIA', 'Target', id, 'kode rahasia ditampilkan');
  return { rahasia: rahasia_(id) };
} };
/** Tes koneksi: info dari script penerima (tab, versi, pencatat). */
AKSI['target.tes'] = { izin: 'sinkron.jalankan', fn: function (ctx) {
  var p = ctx.payload, c = p.id ? targetLengkap_(p.id) : { t: { WebAppUrl: cekUrl_(p.url) }, secret: String(p.rahasia || '') };
  wajib_(c.secret, 'Kode rahasia belum diisi.');
  var i = panggilPenerima_(c.t.WebAppUrl, c.secret, 'info', {});
  if (p.id) Repo.kunci(function () { Repo.ubah('Target', p.id, { VersiScript: String(i.versi), SpreadsheetID: i.id, NamaFile: i.nama }, ctx.user.Username); });
  return { nama: i.nama, id: i.id, versi: i.versi, versiTerbaru: RECEIVER_VERSI, pencatat: i.pencatat, tabs: i.tabs, zona: i.zona };
} };
/** 15 baris teratas sebuah tab (wizard langkah pemetaan). */
AKSI['target.header'] = { izin: 'target.kelola', fn: function (ctx) {
  var p = ctx.payload, c = p.id && !p.url ? targetLengkap_(p.id) : { t: { WebAppUrl: cekUrl_(p.url) }, secret: String(p.rahasia || (p.id ? rahasia_(p.id) : '')) };
  var h = panggilPenerima_(c.t.WebAppUrl, c.secret, 'baca', { tab: String(p.tab || ''), header: 15 });
  return { header: h.header, lastRow: h.lastRow, lastCol: h.lastCol };
} };
AKSI['target.simpan'] = { izin: 'target.kelola', ubah: true, fn: function (ctx) {
  var p = ctx.payload, t = p.target || {}, kolom = (p.kolom || []).filter(function (k) { return String(k.JudulHeader || '').trim(); }), oleh = ctx.user.Username;
  var nama = String(t.Nama || '').trim(); wajib_(nama && nama.length <= 80, 'Nama target wajib diisi (maks 80 karakter).');
  var url = cekUrl_(t.WebAppUrl);
  wajib_(t.ModeTab === 'FIXED' || t.ModeTab === 'TERBARU', 'Mode tab harus FIXED atau TERBARU.');
  wajib_(String(t.TabNama || '').trim(), t.ModeTab === 'TERBARU' ? 'Pola nama tab wajib diisi.' : 'Tab wajib dipilih.');
  if (t.ModeTab === 'TERBARU') wajib_(SKD.polaRegex(t.TabNama).urut.length >= 1, 'Pola nama tab harus memuat MMM/MM dan YYYY/YY.');
  var e = SKD.validasi(kolom); wajib_(!e.length, e.join(' '));
  kolom.forEach(function (k) { wajib_(['KUNCI', 'TULIS', 'BACA'].indexOf(k.Arah) >= 0 && SKD.arahField(k.Field) === k.Arah || (k.Field === 'KUNCI' && k.Arah === 'KUNCI'), 'Arah kolom ' + k.Field + ' tidak sesuai.'); });
  var id = String(t.TargetID || ''), lama = id ? Repo.cari('Target', id) : null, rahasia = String(p.rahasia || '').trim();
  if (id) wajib_(lama, 'Target tidak ditemukan.', 'TIDAK_ADA');
  wajib_(rahasia || (lama && rahasia_(id)), 'Kode rahasia wajib diisi.');
  if (!id) id = 'T' + ('0' + Repo.nomorBaru('TARGET')).slice(-2);
  var data = { Nama: nama, ModeKoneksi: 'RECEIVER', WebAppUrl: url, ModeTab: t.ModeTab, TabNama: String(t.TabNama).trim(), CaraTerbaru: t.CaraTerbaru === 'POSISI_TERAKHIR' ? 'POSISI_TERAKHIR' : 'TANGGAL_DI_NAMA',
               BarisHeader: String(t.BarisHeader || ''), AliasHeaderKunci: String(t.AliasHeaderKunci || ''), FormatTanggal: String(t.FormatTanggal || 'dd/MM/yyyy'), Aktif: t.Aktif === false ? 'FALSE' : 'TRUE',
               VersiScript: String(t.VersiScript || (lama && lama.VersiScript) || ''), SpreadsheetID: String(t.SpreadsheetID || (lama && lama.SpreadsheetID) || ''), NamaFile: String(t.NamaFile || (lama && lama.NamaFile) || '') };
  if (lama) {
    if (lama.ModeTab !== data.ModeTab || lama.TabNama !== data.TabNama) { data.TabTerakhirDipakai = ''; data.TabBaru = ''; }
    Repo.ubah('Target', id, data, oleh, p.version);
  } else { data.TargetID = id; data.CreatedBy = oleh; data.UpdatedBy = oleh; data.StatusTerakhir = 'BARU'; data.PesanTerakhir = 'Belum pernah dicek'; Repo.tambah('Target', data); }
  if (rahasia) PropertiesService.getScriptProperties().setProperty('RAHASIA_' + id, rahasia);
  var lain = Repo.semua('TargetKolom').filter(function (k) { return k.TargetID !== id; }).map(bersih_);
  Repo.gantiSemua('TargetKolom', lain.concat(kolom.map(function (k) { return { TargetID: id, Field: k.Field, Arah: k.Arah, JudulHeader: String(k.JudulHeader).trim(), AliasHeader: String(k.AliasHeader || ''), KolomTerakhir: String(k.KolomTerakhir || '') }; })));
  catat_(ctx, lama ? 'UBAH_TARGET' : 'BUAT_TARGET', 'Target', id, nama + ' · ' + data.ModeTab + ' ' + data.TabNama + ' · ' + kolom.length + ' kolom (' + kolom.filter(function (k) { return k.Arah === 'TULIS'; }).map(function (k) { return k.Field; }).join(', ') + ')' + (rahasia ? ' · kode rahasia ' + (lama ? 'diganti' : 'disimpan') : ''));
  Repo.feedTambah({ muatRef: true });
  return { id: id, targets: daftarTargetKlien_(true) };
} };
AKSI['target.aktif'] = { izin: 'target.kelola', ubah: true, fn: function (ctx) {
  var id = String(ctx.payload.id || ''), aktif = !!ctx.payload.aktif;
  Repo.ubah('Target', id, { Aktif: aktif ? 'TRUE' : 'FALSE' }, ctx.user.Username);
  catat_(ctx, 'UBAH_TARGET', 'Target', id, aktif ? 'diaktifkan' : 'dinonaktifkan');
  Repo.feedTambah({ muatRef: true });
  return { targets: daftarTargetKlien_(true) };
} };
/** Cek saja: tidak menulis apa pun ke sheet unit. Untuk target tersimpan, hasilnya dicatat di riwayat sinkron. */
AKSI['target.cek'] = { izin: 'sinkron.jalankan', fn: function (ctx) {
  var c = konfig_(ctx.payload), oleh = ctx.user.Username, r;
  wajib_(c.secret, 'Kode rahasia belum diisi.');
  try { r = jalankanCek_(c); }
  catch (e) {
    if (!c.baru && e.kode) catatHasil_(c.t.TargetID, { TerakhirCek: Repo.sekarang(), StatusTerakhir: 'ERROR', PesanTerakhir: e.message, AlarmTerakhir: alarmSingkat_([{ j: e.kode, txt: e.message }]) },
      { Waktu: Repo.sekarang(), Oleh: oleh, Jenis: 'CEK', TargetID: c.t.TargetID, Tab: '', BarisCocok: 0, SelDitulis: 0, Gagal: 1, Alarm: 1, Detail: e.kode + ': ' + e.message });
    throw e;
  }
  if (!c.baru) {
    var n = r.rencana ? r.rencana.n : { cocok: 0, tulis: 0 };
    catatHasil_(c.t.TargetID, { TerakhirCek: Repo.sekarang(), StatusTerakhir: r.batal || r.tabBaru ? 'ALARM' : r.alarm.length ? 'PERINGATAN' : 'OK', TabBaru: r.tabBaru && r.tab !== r.tabBaru ? r.tabBaru : '',
      PesanTerakhir: r.batal ? r.alarm[0].j + ': tab dilewati' : (n.cocok + ' baris cocok · ' + n.tulis + ' sel akan ditulis' + (r.alarm.length ? ' · ' + r.alarm.length + ' alarm' : '')), AlarmTerakhir: alarmSingkat_(r.alarm) },
      { Waktu: Repo.sekarang(), Oleh: oleh, Jenis: 'CEK', TargetID: c.t.TargetID, Tab: r.tab, BarisCocok: n.cocok || 0, SelDitulis: 0, Gagal: 0, Alarm: r.alarm.length, Detail: r.batal ? r.alarm[0].txt : '' });
  }
  return ringkasCek_(r);
} };
/** Update ke GSheet: Cek ulang, lalu satu permintaan tulis (penerima mengunci, membaca ulang judul & kunci, menulis). */
AKSI['target.update'] = { izin: 'sinkron.jalankan', fn: function (ctx) {
  var id = String(ctx.payload.id || ''), c = targetLengkap_(id), oleh = ctx.user.Username, now = Repo.sekarang();
  wajib_(Domain.bool(c.t.Aktif), 'Target nonaktif. Aktifkan dulu.');
  var r = jalankanCek_(c), log = { Waktu: now, Oleh: oleh, Jenis: 'UPDATE', TargetID: id, Tab: r.tab, BarisCocok: r.rencana ? r.rencana.n.cocok : 0, SelDitulis: 0, Gagal: 0, Alarm: r.alarm.length, Detail: '' };
  if (r.batal || (r.tabBaru && r.tab !== r.tabBaru)) {
    log.Jenis = 'BATAL'; log.Gagal = 1; log.Detail = r.alarm[0] ? r.alarm[0].j + ': ' + r.alarm[0].txt : 'dibatalkan';
    catatHasil_(id, { TerakhirCek: now, StatusTerakhir: 'ALARM', TabBaru: r.tabBaru && r.tab !== r.tabBaru ? r.tabBaru : '', PesanTerakhir: 'Update ditahan: ' + (r.alarm[0] ? r.alarm[0].j : ''), AlarmTerakhir: alarmSingkat_(r.alarm) }, log);
    var hb = ringkasCek_(r); hb.ditahan = true; return hb;
  }
  var plan = r.rencana, kunciBaris = {}, sel = [];
  plan.tulis.forEach(function (x) { kunciBaris[x.r] = SKD.normKey(plan.rows.filter(function (y) { return y.r === x.r; })[0].raw); sel.push({ r: x.r, c: r.pos[x.field], v: x.v }); });
  var harap = c.kolom.filter(function (k) { return k.Arah !== 'BACA'; }).map(function (k) { return { c: r.pos[k.Field], judul: k.JudulHeader }; });
  var hasil = { ok: true, ditulis: 0, dilewati: [] };
  if (sel.length || r.titikAwal) {
    try {
      hasil = panggilPenerima_(c.t.WebAppUrl, c.secret, 'tulis', { tab: r.tab, hdrRow: r.hdrRow, harap: harap, kunci: { c: r.pos.KUNCI, baris: kunciBaris }, sel: sel,
        pantau: { judul: c.kolom.filter(function (k) { return k.Arah === 'TULIS'; }).map(function (k) { return k.JudulHeader; }), hdr: (function () { var o = {}; o[r.tab] = r.hdrRow; return o; })(), hdrDefault: r.hdrRow } });
    } catch (e) {
      log.Jenis = 'BATAL'; log.Gagal = 1; log.Detail = (e.kode || 'ERROR') + ': ' + e.message;
      catatHasil_(id, { TerakhirCek: now, StatusTerakhir: 'ALARM', PesanTerakhir: 'Update dibatalkan: ' + e.message, AlarmTerakhir: alarmSingkat_([{ j: e.kode || 'ERROR', txt: e.message }].concat(r.alarm)) }, log);
      var hg = ringkasCek_(r); hg.batalTulis = { kode: e.kode || 'ERROR', pesan: e.message }; return hg;
    }
  }
  var lewat = {}; (hasil.dilewati || []).forEach(function (x) { lewat[x.r + ',' + x.c] = 1; });
  var ditulis = plan.tulis.filter(function (x) { return !lewat[x.r + ',' + r.pos[x.field]]; });
  Repo.kunci(function () {
    // jejak sel: titik awal tab baru + nilai yang baru ditulis (TGL_UPDATE tidak dijejak)
    var jejakAda = Repo.semua('JejakSel').map(bersih_), keep = jejakAda.filter(function (j) { return j.TargetID !== id; }), mine = {};
    jejakAda.forEach(function (j) { if (j.TargetID === id && j.Tab === r.tab) mine[j.NoKontrakNorm + '|' + j.Field] = j; });   // tab lama dibuang
    if (r.jejakAwal) Object.keys(r.jejakAwal).forEach(function (k) { if (!mine[k]) { var p = k.split('|'); mine[k] = { TargetID: id, Tab: r.tab, NoKontrakNorm: p[0], Field: p[1], NilaiDitulis: r.jejakAwal[k], WaktuTulis: now, Baris: '', KontrakID: '' }; } });
    ditulis.forEach(function (x) { if (x.field === 'TGL_UPDATE') return; mine[x.nk + '|' + x.field] = { TargetID: id, Tab: r.tab, NoKontrakNorm: x.nk, Field: x.field, NilaiDitulis: x.v, WaktuTulis: now, Baris: String(x.r), KontrakID: x.kid }; });
    // semua baris tempat kontrak itu muncul (bisa lebih dari satu karena periode tagih)
    var barisK = {}; plan.rows.forEach(function (row) { if (row.kid) (barisK[row.kid] = barisK[row.kid] || []).push(row.r); });
    Object.keys(mine).forEach(function (k) { var m = mine[k]; if (m.TargetID !== id) return;
      if (!m.KontrakID) { var hit = plan.rows.filter(function (row) { return row.kid && SKD.normKey(row.raw) === m.NoKontrakNorm; })[0]; if (hit) m.KontrakID = hit.kid; }
      if (m.KontrakID && barisK[m.KontrakID]) m.Baris = barisK[m.KontrakID].join(','); });
    Repo.gantiSemua('JejakSel', keep.concat(Object.keys(mine).map(function (k) { return mine[k]; })));
    logBulan_('Push', KOL_PUSH_, ditulis.map(function (x) { return { Waktu: now, Oleh: oleh, Jenis: 'TULIS', TargetID: id, Tab: r.tab, Baris: x.r, KontrakID: x.kid, NoKontrak: x.no, Field: x.field, NilaiLama: x.now, NilaiBaru: x.v }; }));
  });
  log.SelDitulis = ditulis.length; log.Detail = (hasil.dilewati || []).length ? (hasil.dilewati.length + ' sel berformula dilewati saat menulis') : (r.titikAwal ? 'tab ' + r.tab + ' pertama kali dipakai: nilai yang ada dijadikan titik awal' : '');
  catatHasil_(id, { TerakhirCek: now, TerakhirUpdate: now, TabTerakhirDipakai: r.tab, TabBaru: '', StatusTerakhir: r.alarm.length ? 'PERINGATAN' : 'OK',
    PesanTerakhir: plan.n.cocok + ' baris cocok · ' + ditulis.length + ' sel ditulis' + (r.alarm.length ? ' · ' + r.alarm.length + ' alarm' : ''), AlarmTerakhir: alarmSingkat_(r.alarm), VersiScript: String(r.info.versi) }, log);
  catat_(ctx, 'SINKRON_UPDATE', 'Target', id, c.t.Nama + ' · tab ' + r.tab + ' · ' + ditulis.length + ' sel ditulis');
  var out = ringkasCek_(r); out.ditulis = ditulis.length; out.dilewatiTulis = (hasil.dilewati || []).length; return out;
} };
/** Konfirmasi tab bulan baru (§8.3): tab baru dipakai; nilai yang ada menjadi titik awal pada Update berikutnya. */
AKSI['target.tabBaru'] = { izin: 'target.kelola', ubah: true, fn: function (ctx) {
  var id = String(ctx.payload.id || ''), t = Repo.cari('Target', id);
  wajib_(t && t.TabBaru, 'Tidak ada tab baru yang menunggu konfirmasi.');
  Repo.ubah('Target', id, { TabTerakhirDipakai: '', TabBaru: '', StatusTerakhir: 'OK', PesanTerakhir: 'Tab ' + t.TabBaru + ' dipakai; jalankan Cek saja / Update', AlarmTerakhir: '[]' }, ctx.user.Username);
  catat_(ctx, 'TAB_BARU', 'Target', id, (t.TabTerakhirDipakai || '—') + ' → ' + t.TabBaru, '', 'Tab', t.TabTerakhirDipakai, t.TabBaru);
  Repo.feedTambah({ muatRef: true });
  return { targets: daftarTargetKlien_(true) };
} };
/** Posisi kontrak di sheet unit (dari jejak sel) dan riwayat push bulan ini — untuk panel detail. */
AKSI['target.posisi'] = { izin: 'kontrak.lihat', fn: function (ctx) {
  var kid = String(ctx.payload.kid || ''), nama = {};
  Repo.semua('Target').forEach(function (t) { nama[t.TargetID] = t.Nama; });
  var pos = {};
  Repo.semua('JejakSel').forEach(function (j) {
    if (j.KontrakID !== kid) return;
    var k = j.TargetID + '|' + j.Tab, p = pos[k] = pos[k] || { TargetID: j.TargetID, Nama: nama[j.TargetID] || j.TargetID, Tab: j.Tab, Baris: {}, Nilai: {}, Waktu: '' };
    String(j.Baris || '').split(',').forEach(function (x) { if (x) p.Baris[x] = 1; }); p.Nilai[j.Field] = j.NilaiDitulis; if (j.WaktuTulis > p.Waktu) p.Waktu = j.WaktuTulis;
  });
  var ym = Repo.sekarang().slice(0, 7), push = bacaLogBulan_('Push', KOL_PUSH_, ym).filter(function (x) { return x.KontrakID === kid; }).slice(-30).reverse();
  return { posisi: Object.keys(pos).map(function (k) { var p = pos[k]; p.Baris = Object.keys(p.Baris).sort(function (a, b) { return a - b; }); return p; }), push: push, nama: nama };
} };
