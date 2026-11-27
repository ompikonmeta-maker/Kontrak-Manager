// ===== 00_Config.js =====
/**
 * STATUS KONTRAK MANAGER — server Apps Script.
 * File Code.gs ini HASIL BUILD dari src/server/*.js dan src/ui/*. Jangan diedit langsung;
 * ubah sumbernya lalu jalankan `node tools/build.js`.
 */

// Konstanta kode (bukan nilai bisnis). Nilai bisnis disimpan di database (§3).
var APP = {
  NAMA: 'Status Kontrak Manager',
  VERSI: '3.0.1',
  FASE: 'F3',
  SKEMA: 3,                 // versi skema database yang dibutuhkan kode ini
  TZ: 'Asia/Jakarta',
  NAMA_DB: 'SKM_DB'
};

// Katalog izin: kemampuan yang dicek oleh kode. Pemetaan role → izin ada di tab Ref_Role (data).
var IZIN = [
  ['dashboard.lihat', 'Lihat dashboard'],
  ['kontrak.lihat', 'Lihat kontrak'],
  ['export', 'Export data'],
  ['kontrak.update', 'Update kontrak, BAST, kendala'],
  ['kontrak.daftar', 'Daftarkan kontrak satu per satu, proses antrian'],
  ['kontrak.import', 'Upload Excel & import data lama'],
  ['kontrak.arsip', 'Arsipkan kontrak'],
  ['pic.atur', 'Atur PIC'],
  ['sinkron.jalankan', 'Jalankan Cek saja / Update ke GSheet'],
  ['target.kelola', 'Kelola target Google Sheet'],
  ['pengaturan.kelola', 'Kelola tahap, kendala, nilai push, referensi, config'],
  ['user.kelola', 'Kelola user, role, dan izin'],
  ['log.semua', 'Lihat log semua user']
];

// Izin yang boleh diberikan per user di luar role-nya (Users.IzinTambahan, §6).
var IZIN_TAMBAHAN = ['kontrak.import'];

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

// ===== src/shared (dipakai server dan browser) =====
/**
 * KD — aturan kontrak yang dipakai BERSAMA oleh server (Apps Script) dan browser.
 * Browser menjalankan operasi yang sama untuk tampilan instan (simpan optimis, §4.4);
 * server menjalankannya ulang sebagai keputusan akhir. Fungsi murni: tanpa Google API, tanpa DOM.
 */
var KD = (function () {

  // ------------------------------------------------------------------ dasar
  function s(v) { return v === undefined || v === null ? '' : String(v); }
  function t(v) { return s(v).trim(); }
  function bool(v) { return v === true || s(v).toUpperCase() === 'TRUE'; }
  function num(v, d) { var n = Number(v); return s(v) !== '' && isFinite(n) ? n : (d === undefined ? 0 : d); }
  function salin(o) { return JSON.parse(JSON.stringify(o)); }
  function galat(kode, pesan) { var e = new Error(pesan); e.kode = kode; return e; }
  function wajib(c, pesan, kode) { if (!c) throw galat(kode || 'VALIDASI', pesan); }

  /** Kunci pencocokan nomor (§8.2). */
  function normKey(x) {
    return s(x).normalize('NFKC').toUpperCase().replace(/[‐-―−]/g, '-').replace(/\s+/g, '').replace(/\.+$/, '');
  }
  /** Nama customer untuk perbandingan DIRECT/INDIRECT (§5.7). */
  function normCust(x) {
    return s(x).toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\b(PT|TBK|PERSERO|CV)\b/g, ' ').replace(/\s+/g, '');
  }
  function jenisCustomer(cust, end) {
    if (!t(cust) || !t(end)) return 'BELUM';
    return normCust(cust) === normCust(end) ? 'DIRECT' : 'INDIRECT';
  }
  var LABEL_JC = { DIRECT: 'DIRECT', INDIRECT: 'INDIRECT', BELUM: 'BELUM TERDEFINISI' };
  function dokDefault(jc, cfg) {
    cfg = cfg || {};
    return t(cfg['DOKTAGIH_DEFAULT_' + (jc === 'BELUM' ? 'BELUM' : jc)]) || (jc === 'DIRECT' ? 'BAA' : 'BAST');
  }

  // ------------------------------------------------------------------ referensi
  /** ref mentah (baris tab) → bentuk siap pakai. */
  function siapkanRef(raw) {
    var tahap = (raw.tahap || []).map(function (r) {
      return { Kode: s(r.Kode), Urutan: num(r.Urutan), Label: s(r.Label) || s(r.Kode), Penutup: bool(r.Penutup), BatasAgingHari: num(r.BatasAgingHari, 14), Aktif: bool(r.Aktif) };
    }).sort(function (a, b) { return a.Urutan - b.Urutan; });
    var kendala = (raw.kendala || []).map(function (r) {
      return { Kode: s(r.Kode), Label: s(r.Label) || s(r.Kode), WajibKeterangan: bool(r.WajibKeterangan), MemicuReopen: bool(r.MemicuReopen), Aktif: bool(r.Aktif), Urutan: num(r.Urutan) };
    }).sort(function (a, b) { return a.Urutan - b.Urutan; });
    var push = (raw.push || []).map(function (r) {
      return { Urutan: num(r.Urutan), Kondisi: s(r.Kondisi), Nilai: s(r.Nilai), Aktif: bool(r.Aktif) };
    }).sort(function (a, b) { return a.Urutan - b.Urutan; });
    var peta = function (l) { var m = {}; l.forEach(function (x) { m[x.Kode] = x; }); return m; };
    var daftar = function (l) { return (l || []).map(function (r) { return { Kode: s(r.Kode), Label: s(r.Label) || s(r.Kode), Aktif: bool(r.Aktif), Urutan: num(r.Urutan) }; }).sort(function (a, b) { return a.Urutan - b.Urutan; }); };
    return { tahap: tahap, kendala: kendala, push: push, T: peta(tahap), KD: peta(kendala),
             jenisDok: daftar(raw.jenisDok), populasi: daftar(raw.populasi), segment: daftar(raw.segment), dokTagih: daftar(raw.dokTagih) };
  }
  function tahapPertama(ref) { var a = ref.tahap.filter(function (x) { return x.Aktif && !x.Penutup; }); return a.length ? a[0].Kode : (ref.tahap[0] || {}).Kode; }
  function penutup(ref) { return ref.tahap.filter(function (x) { return x.Aktif && x.Penutup; })[0] || ref.tahap.filter(function (x) { return x.Penutup; })[0] || null; }
  function bastClose(b, ref) { var x = ref.T[b.KodeTahap]; return !!(x && x.Penutup); }
  function hidup(rows) { return (rows || []).filter(function (r) { return !bool(r.Dihapus); }); }

  // ------------------------------------------------------------------ status, tahap, aging (§5.4, §5.6)
  function cakupan(bundle) {
    var b = hidup(bundle.bast);
    if (b.length === 1 && t(b[0].CakupanLokasi) === '') return num(bundle.k.JumlahLokasi, 0);   // satu BAST tanpa isian = seluruh lokasi
    return b.reduce(function (a, x) { return a + num(x.CakupanLokasi, 0); }, 0);
  }
  function statusKontrak(bundle, ref) {
    var b = hidup(bundle.bast), lok = t(bundle.k.JumlahLokasi), tot = cakupan(bundle);
    var semuaClose = b.length > 0 && b.every(function (x) { return bastClose(x, ref); });
    var sisa = lok === '' ? '' : Math.max(0, num(lok) - tot);
    if (semuaClose && (lok === '' || tot >= num(lok))) return { status: 'CLOSE', menunggu: false, sisa: sisa === '' ? '' : 0 };
    return { status: 'OPEN', menunggu: semuaClose && lok !== '' && tot < num(lok), sisa: sisa };
  }
  function bastOpen(bundle, ref) { return hidup(bundle.bast).filter(function (x) { return !bastClose(x, ref); }); }
  /** Tahap kontrak = tahap BAST OPEN dengan urutan terendah (bottleneck). */
  function tahapKontrak(bundle, ref) {
    var o = bastOpen(bundle, ref);
    if (o.length) {
      o.sort(function (a, b) { return num((ref.T[a.KodeTahap] || {}).Urutan, 999) - num((ref.T[b.KodeTahap] || {}).Urutan, 999); });
      return o[0].KodeTahap;
    }
    var b = hidup(bundle.bast);
    return b.length ? (penutup(ref) || {}).Kode || b[0].KodeTahap : '';
  }
  function tanggal(x) { var m = s(x).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; }
  /** Hari sejak tanggal (yyyy-MM-dd…) sampai hari ini (yyyy-MM-dd). Tidak pernah berhenti (§5.6). */
  function hariSejak(dari, hariIni) { var a = tanggal(dari), b = tanggal(hariIni); return a === null || b === null ? null : Math.max(0, Math.round((b - a) / 864e5)); }
  function bucket(h, batas) { batas = batas || [7, 14, 30]; return h === null ? '' : h <= batas[0] ? 'fresh' : h <= batas[1] ? 'warm' : h <= batas[2] ? 'stale' : 'cold'; }
  function kendalaAktif(bundle) { return (bundle.kend || []).filter(function (x) { return x.Status === 'AKTIF'; }); }

  // ------------------------------------------------------------------ Nilai Push (§5.5)
  function cocokKondisi(kond, st, tahap, aktif, adaBast) {
    if (kond === 'CLOSE') return st.status === 'CLOSE';
    if (kond === 'SISA_LOKASI') return st.menunggu;
    if (kond === 'BELUM_ADA_BAST') return !adaBast;
    if (kond === 'KENDALA:*') return aktif.length > 0;
    if (kond.indexOf('KENDALA:') === 0) return aktif.some(function (x) { return x.Jenis === kond.slice(8); });
    if (kond.indexOf('TAHAP:') === 0) return st.status !== 'CLOSE' && tahap === kond.slice(6);
    return false;
  }
  function evalPush(bundle, ref, st, tahap) {
    st = st || statusKontrak(bundle, ref); tahap = tahap === undefined ? tahapKontrak(bundle, ref) : tahap;
    var aktif = kendalaAktif(bundle).slice().sort(function (a, b) { return s(a.Mulai) < s(b.Mulai) ? -1 : 1; });
    var b = hidup(bundle.bast), aturan = ref.push.filter(function (r) { return r.Aktif; });
    for (var i = 0; i < aturan.length; i++) {
      var r = aturan[i];
      if (!cocokKondisi(r.Kondisi, st, tahap, aktif, b.length > 0)) continue;
      var detil = '', lain = aktif.length;
      if (r.Kondisi.indexOf('KENDALA:') === 0) {
        var k = r.Kondisi === 'KENDALA:*' ? aktif[0] : aktif.filter(function (x) { return x.Jenis === r.Kondisi.slice(8); })[0];
        detil = s(k && k.Keterangan); lain = aktif.length - 1;
      } else if (b.length) {
        var terbaru = b.slice().sort(function (x, y) { return s(x.UpdatedAt) < s(y.UpdatedAt) ? 1 : -1; })[0];
        detil = s(terbaru.Keterangan);
      }
      if (lain > 0) detil = (detil ? detil + ' ' : '') + '(+' + lain + ')';
      return { nilai: r.Nilai, detil: detil, kondisi: r.Kondisi, urutan: r.Urutan, cocok: true };
    }
    return { nilai: '', detil: '', kondisi: '', cocok: false };
  }
  /** Tahap & kendala aktif yang tidak tercakup aturan mana pun (peringatan halaman pengaturan). */
  function celahAturan(ref) {
    var kond = ref.push.filter(function (r) { return r.Aktif; }).map(function (r) { return r.Kondisi; }), out = [];
    var adaKendalaUmum = kond.indexOf('KENDALA:*') >= 0;
    ref.tahap.forEach(function (x) { if (x.Aktif && !x.Penutup && kond.indexOf('TAHAP:' + x.Kode) < 0) out.push('Tahap ' + x.Label + ' (' + x.Kode + ')'); });
    if (penutup(ref) && kond.indexOf('CLOSE') < 0) out.push('Kontrak CLOSE');
    if (!adaKendalaUmum) ref.kendala.forEach(function (x) { if (x.Aktif && kond.indexOf('KENDALA:' + x.Kode) < 0) out.push('Kendala ' + x.Label + ' (' + x.Kode + ')'); });
    if (kond.indexOf('BELUM_ADA_BAST') < 0) out.push('Kontrak tanpa BAST');
    return out;
  }

  // ------------------------------------------------------------------ turunan kontrak
  var KOL_TURUNAN = ['JenisCustomer', 'TahapKontrak', 'StatusKontrak', 'SisaLokasi', 'KendalaUmum', 'KendalaDetil', 'TglStatusBerubah', 'TglClose'];
  function turunan(bundle, ref, now) {
    var k = bundle.k, st = statusKontrak(bundle, ref), tahap = tahapKontrak(bundle, ref), p = evalPush(bundle, ref, st, tahap);
    var o = { JenisCustomer: jenisCustomer(k.NamaPelanggan, k.EndCustomer), TahapKontrak: tahap, StatusKontrak: st.status,
              SisaLokasi: s(st.sisa), KendalaUmum: p.nilai, KendalaDetil: p.detil, TglStatusBerubah: s(k.TglStatusBerubah), TglClose: s(k.TglClose) };
    if (o.StatusKontrak !== s(k.StatusKontrak)) { o.TglStatusBerubah = now; o.TglClose = o.StatusKontrak === 'CLOSE' ? now : ''; }
    return o;
  }
  function terapkanTurunan(bundle, ref, now) { var o = turunan(bundle, ref, now); for (var c in o) bundle.k[c] = o[c]; return bundle; }
  /** Field wajib yang masih kosong (§5.6, Config.FIELD_WAJIB). */
  function fieldKurang(bundle, cfg) {
    var k = bundle.k, daftar = s((cfg || {}).FIELD_WAJIB || 'Customer,EndCustomer,NilaiKontrak,Segment,Populasi,OrderInternal').split(',').map(t).filter(Boolean);
    var isi = { Customer: k.NamaPelanggan, EndCustomer: k.EndCustomer, NilaiKontrak: k.NilaiKontrak, Segment: k.Segment, Populasi: k.Populasi,
                JumlahLokasi: k.JumlahLokasi, PIC: k.PIC, TahunProject: k.TahunProject, JenisDok: k.JenisDok,
                OrderInternal: hidup(bundle.order).length ? 'ada' : '' };
    return daftar.filter(function (f) { return f in isi && !t(isi[f]); });
  }

  // ------------------------------------------------------------------ nilai & tanggal
  function bacaRupiah(v) {
    if (v === '' || v === null || v === undefined) return { v: '' };
    if (typeof v === 'number') return isFinite(v) && v >= 0 ? { v: String(Math.round(v)) } : { e: 1 };
    var x = String(v).replace(/rp/i, '').replace(/\s/g, '');
    if (x === '') return { v: '' };
    if (!/^[\d.,]+$/.test(x)) return { e: 1 };
    if (/,\d{1,2}$/.test(x) && x.indexOf('.') >= 0) x = x.replace(/\./g, '').replace(',', '.');
    else if (/\.\d{1,2}$/.test(x) && x.indexOf(',') >= 0) x = x.replace(/,/g, '');
    else if (/^\d+,\d{1,2}$/.test(x)) x = x.replace(',', '.');
    else if (/^\d+\.\d{1,2}$/.test(x)) { /* desimal biasa */ }
    else x = x.replace(/[.,]/g, '');
    var n = Number(x);
    return isFinite(n) ? { v: String(Math.round(n)) } : { e: 1 };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  /** Tanggal dari Excel (nomor seri), teks dd/mm/yyyy, atau yyyy-mm-dd → 'yyyy-MM-dd'. */
  function bacaTanggal(v) {
    if (v === '' || v === null || v === undefined) return { v: '' };
    var y, m, d;
    if (typeof v === 'number' || /^\d{5}(\.\d+)?$/.test(s(v))) {
      var dt = new Date(Math.round((Number(v) - 25569) * 864e5));
      y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
    } else {
      var a = s(v).trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/), b = s(v).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (a) { d = +a[1]; m = +a[2]; y = +a[3]; } else if (b) { y = +b[1]; m = +b[2]; d = +b[3]; } else return { e: 1 };
    }
    var c = new Date(Date.UTC(y, m - 1, d));
    if (c.getUTCMonth() !== m - 1 || y < 2000 || y > 2100) return { e: 1 };
    return { v: y + '-' + pad(m) + '-' + pad(d) };
  }
  function tebakJenisDok(no) {
    var u = s(no).toUpperCase().trim();
    return /^TEL\./.test(u) || /^KL[.\-\/ ]/.test(u) ? 'KL' : /^WO[.\-\/ ]/.test(u) ? 'WO' : /^SPK/.test(u) ? 'SPK' : /^PO[.\-\/ ]/.test(u) ? 'PO' : '';
  }

  // ------------------------------------------------------------------ operasi kontrak
  var FIELD_KONTRAK = ['NoKontrak', 'JenisDok', 'TahunProject', 'Populasi', 'NamaPelanggan', 'EndCustomer', 'JudulKontrak', 'Segment', 'NilaiKontrak', 'JumlahLokasi', 'PIC'];
  var LABEL = { NoKontrak: 'No. kontrak', JenisDok: 'Jenis dok', TahunProject: 'Tahun', Populasi: 'Populasi', NamaPelanggan: 'Customer', EndCustomer: 'End customer',
                JudulKontrak: 'Judul', Segment: 'Segment', NilaiKontrak: 'Nilai', JumlahLokasi: 'Jumlah lokasi', PIC: 'PIC',
                DokTagih: 'Dok tagih', CakupanOrder: 'Cakupan order', CakupanLokasi: 'Cakupan lokasi', NoDokBAST: 'No. dokumen', Keterangan: 'Keterangan' };
  function punya(ctx, izin) { return (ctx.izin || []).indexOf(izin) >= 0; }
  function cekIzin(ctx, izin) { if (!punya(ctx, izin)) throw galat('IZIN_DITOLAK', 'Anda tidak punya izin untuk aksi ini (' + izin + ').'); }

  function rapikanKontrak(f) {
    var o = {};
    FIELD_KONTRAK.forEach(function (c) { if (c in f) o[c] = t(f[c]); });
    if ('NilaiKontrak' in o) { var r = bacaRupiah(o.NilaiKontrak); wajib(!r.e, 'Nilai kontrak harus angka.'); o.NilaiKontrak = r.v; }
    if ('JumlahLokasi' in o && o.JumlahLokasi !== '') wajib(/^\d+$/.test(o.JumlahLokasi) && +o.JumlahLokasi >= 1, 'Jumlah lokasi harus bilangan bulat ≥ 1, atau kosong.');
    if ('TahunProject' in o && o.TahunProject !== '') wajib(/^(19|20)\d\d$/.test(o.TahunProject), 'Tahun project harus 4 digit, mis. 2026.');
    if ('NoKontrak' in o) { wajib(o.NoKontrak, 'No. kontrak wajib diisi.'); wajib(o.NoKontrak.length <= 120, 'No. kontrak terlalu panjang.'); }
    if ('JudulKontrak' in o) wajib(o.JudulKontrak, 'Judul kontrak wajib diisi.');
    return o;
  }
  function barisOrder(kid, n, o, ctx) {
    var j = t(o.JenisOrder).toUpperCase(), no = t(o.NoOrder);
    wajib(j === 'SO' || j === 'MI', 'Jenis order harus SO atau MI.');
    wajib(no, 'No. order wajib diisi.');
    if (t(o.JumlahLokasi) !== '') wajib(/^\d+$/.test(t(o.JumlahLokasi)), 'Jumlah lokasi order harus angka.');
    return { OrderID: kid + '-O' + n, KontrakID: kid, JenisOrder: j, NoOrder: no, NoOrderNorm: normKey(no), JenisLayanan: t(o.JenisLayanan), JenisPekerjaan: t(o.JenisPekerjaan),
             JumlahLokasi: t(o.JumlahLokasi), Keterangan: t(o.Keterangan), Dihapus: 'FALSE', CreatedAt: ctx.now, CreatedBy: ctx.user, UpdatedAt: ctx.now, UpdatedBy: ctx.user, Version: '1' };
  }
  function riwayat(b, kode, ctx, ket) {
    return { BASTID: b.BASTID, KontrakID: b.KontrakID, Siklus: s(b.Siklus || '1'), KodeTahap: kode, Masuk: ctx.now, Oleh: ctx.user, Keterangan: s(ket) };
  }
  function bastBaru(bundle, ctx, data) {
    var k = bundle.k, urut = 1;
    (bundle.bast || []).forEach(function (b) { urut = Math.max(urut, num(b.Urutan) + 1); });
    var jc = jenisCustomer(k.NamaPelanggan, k.EndCustomer), doc = t(data.DokTagih) || dokDefault(jc, ctx.cfg);
    wajib(doc === 'BAST' || doc === 'BAA' || (ctx.ref.dokTagih || []).some(function (d) { return d.Kode === doc; }), 'Dokumen tagih tidak dikenal.');
    var tahap = t(data.KodeTahap) || tahapPertama(ctx.ref), x = ctx.ref.T[tahap];
    wajib(x && x.Aktif, 'Tahap awal tidak dikenal atau nonaktif.');
    var b = { BASTID: k.KontrakID + '-B' + urut, KontrakID: k.KontrakID, Urutan: String(urut), DokTagih: doc, KodeTahap: tahap, Siklus: '1',
              CakupanOrder: s(data.CakupanOrder), CakupanLokasi: t(data.CakupanLokasi), DaftarLokasi: '', NoDokBAST: '', TglTahapMulai: data.TglTahapMulai || ctx.now,
              Keterangan: t(data.Keterangan), Status: x.Penutup ? 'CLOSE' : 'OPEN', Dihapus: 'FALSE', CreatedAt: ctx.now, CreatedBy: ctx.user, UpdatedAt: ctx.now, UpdatedBy: ctx.user, Version: '1' };
    if (b.CakupanLokasi !== '') wajib(/^\d+$/.test(b.CakupanLokasi), 'Cakupan lokasi harus angka.');
    return b;
  }
  function cariBaris(list, kunci, nilai, nama) { var r = (list || []).filter(function (x) { return x[kunci] === nilai; })[0]; wajib(r, nama + ' tidak ditemukan. Muat ulang data.', 'TIDAK_ADA'); return r; }
  function catatBantu(bundle, ctx) { var pic = t(bundle.k.PIC); return pic && ctx.alias !== pic ? 'bantu (PIC ' + pic + ')' : ''; }

  /**
   * Jalankan operasi pada bundle kontrak {k, bast[], order[], kend[], alias[]}.
   * ctx: {user, nama, alias, now ('yyyy-MM-dd HH:mm:ss'), ref (siapkanRef), cfg, izin[], idKontrak()}
   * Hasil: {bundle, log[], riwayat[], alias[]} — bundle baru (salinan), daftar log, baris riwayat & alias baru.
   */
  function jalankan(op, bundleLama, data, ctx) {
    data = data || {};
    var b = bundleLama ? salin(bundleLama) : { k: null, bast: [], order: [], kend: [], alias: [] };
    ['bast', 'order', 'kend', 'alias'].forEach(function (x) { b[x] = b[x] || []; });
    var out = { bundle: b, log: [], riwayat: [], alias: [] }, k = b.k;
    var lg = function (aksi, entitas, id, field, lama, baru, cat) {
      out.log.push({ aksi: aksi, entitas: entitas, id: id, field: field || '', lama: s(lama), baru: s(baru), catatan: [cat || '', catatBantu(b, ctx)].filter(Boolean).join(' · ') });
    };
    if (op !== 'kontrak.buat') { wajib(k, 'Kontrak tidak ditemukan.', 'TIDAK_ADA'); wajib(!bool(k.Arsip) || op === 'kontrak.unarsip', 'Kontrak ini diarsipkan. Kembalikan dari arsip dulu untuk mengubahnya.', 'DIARSIPKAN'); }

    if (op === 'kontrak.buat') {
      cekIzin(ctx, 'kontrak.daftar');
      var f = rapikanKontrak(data.f || {});
      wajib('NoKontrak' in f, 'No. kontrak wajib diisi.'); wajib('JudulKontrak' in f, 'Judul kontrak wajib diisi.');
      if (!punya(ctx, 'pic.atur')) f.PIC = t(ctx.alias);
      if (!f.JenisDok) f.JenisDok = tebakJenisDok(f.NoKontrak);
      var kid = data.KontrakID || ctx.idKontrak();
      k = b.k = { KontrakID: kid, NoKontrak: f.NoKontrak, NoKontrakNorm: normKey(f.NoKontrak), JenisDok: s(f.JenisDok), TahunProject: s(f.TahunProject), Populasi: s(f.Populasi),
        NamaPelanggan: s(f.NamaPelanggan), EndCustomer: s(f.EndCustomer), JudulKontrak: f.JudulKontrak, Segment: s(f.Segment), NilaiKontrak: s(f.NilaiKontrak), JumlahLokasi: s(f.JumlahLokasi),
        PIC: s(f.PIC), JenisCustomer: '', TahapKontrak: '', StatusKontrak: '', SisaLokasi: '', KendalaUmum: '', KendalaDetil: '', TglStatusBerubah: ctx.now,
        PerluVerifikasi: data.verifikasi ? 'TRUE' : 'FALSE', Arsip: 'FALSE', AlasanArsip: '', SumberAwal: t(data.sumber) || 'MANUAL', TglClose: '',
        CreatedAt: ctx.now, CreatedBy: ctx.user, UpdatedAt: ctx.now, UpdatedBy: ctx.user, Version: '0' };
      var seen = {};
      (data.orders || []).filter(function (o) { return t(o.NoOrder); }).forEach(function (o, i) {
        var r = barisOrder(kid, i + 1, o, ctx); wajib(!seen[r.NoOrderNorm], 'Ada nomor SO/MI yang dobel: ' + r.NoOrder + '.'); seen[r.NoOrderNorm] = 1; b.order.push(r);
      });
      lg('BUAT_KONTRAK', 'Kontrak', kid, '', '', f.NoKontrak, (data.catatan || 'input manual') + (f.PIC ? '; PIC ' + f.PIC : ''));
      if (data.buatBast !== false) {
        var nb = bastBaru(b, ctx, { DokTagih: data.dokTagih, KodeTahap: data.tahapAwal, TglTahapMulai: data.tglTahap, Keterangan: data.ketBast,
          CakupanOrder: b.order.map(function (o) { return o.NoOrder; }).join(', ') });
        b.bast.push(nb); out.riwayat.push(riwayat(nb, nb.KodeTahap, ctx, 'BAST dibuat'));
        lg('BUAT_BAST', 'BAST', nb.BASTID, 'DokTagih', '', nb.DokTagih, 'dibuat bersama kontrak');
        (data.kendala ? [].concat(data.kendala) : []).forEach(function (kd0, i) {
          var kj = ctx.ref.KD[kd0.Jenis], kid2 = nb.BASTID + '-K' + (i + 1);
          wajib(kj && kj.Aktif, 'Jenis kendala tidak dikenal.');
          if (kj.WajibKeterangan) wajib(t(kd0.Keterangan), 'Keterangan kendala wajib diisi.');
          b.kend.push({ KendalaID: kid2, BASTID: nb.BASTID, KontrakID: kid, Jenis: kj.Kode, Keterangan: t(kd0.Keterangan), Status: 'AKTIF',
                        Mulai: data.tglTahap || ctx.now, DibuatOleh: ctx.user, Selesai: '', DiselesaikanOleh: '', CatatanSelesai: '', Version: '1' });
          lg('BUKA_KENDALA', 'Kendala', kid2, 'Jenis', '', kj.Kode, t(kd0.Keterangan));
        });
      }
    } else if (op === 'kontrak.ubah') {
      cekIzin(ctx, 'kontrak.update');
      var p = rapikanKontrak(data.f || {});
      if ('PIC' in p && p.PIC !== s(k.PIC)) cekIzin(ctx, 'pic.atur');
      var ubah = Object.keys(p).filter(function (c) { return s(p[c]) !== s(k[c]); });
      if ('NoKontrak' in p && normKey(p.NoKontrak) !== s(k.NoKontrakNorm) && ubah.indexOf('NoKontrak') >= 0) {
        var lama = k.NoKontrak;
        if (!(b.alias || []).some(function (a) { return a.AliasNorm === normKey(lama); })) {
          var al = { AliasNorm: normKey(lama), NoAsli: lama, KontrakID: k.KontrakID, Sumber: 'KOREKSI', Catatan: t(data.alasan), CreatedAt: ctx.now, CreatedBy: ctx.user };
          b.alias.push(al); out.alias.push(al);
        }
        k.NoKontrakNorm = normKey(p.NoKontrak);
      }
      ubah.forEach(function (c) { lg(c === 'PIC' ? 'ATUR_PIC' : 'UBAH_KONTRAK', 'Kontrak', k.KontrakID, LABEL[c] || c, k[c], p[c], c === 'NoKontrak' ? 'nomor lama disimpan sebagai alias' : ''); k[c] = p[c]; });
      if (!ubah.length) out.kosong = true;
    } else if (op === 'kontrak.pic') {
      cekIzin(ctx, 'pic.atur');
      var pic = t(data.PIC);
      if (pic === s(k.PIC)) out.kosong = true; else { lg('ATUR_PIC', 'Kontrak', k.KontrakID, 'PIC', k.PIC, pic, data.massal ? 'atur PIC massal' : ''); k.PIC = pic; }
    } else if (op === 'kontrak.arsip') {
      cekIzin(ctx, 'kontrak.arsip');
      wajib(t(data.alasan), 'Alasan wajib diisi.');
      k.Arsip = 'TRUE'; k.AlasanArsip = t(data.alasan); lg('ARSIP_KONTRAK', 'Kontrak', k.KontrakID, 'Arsip', 'tidak', 'ya', t(data.alasan));
    } else if (op === 'kontrak.unarsip') {
      cekIzin(ctx, 'kontrak.arsip');
      k.Arsip = 'FALSE'; k.AlasanArsip = ''; lg('ARSIP_KONTRAK', 'Kontrak', k.KontrakID, 'Arsip', 'ya', 'tidak', 'dikembalikan dari arsip');
    } else if (op === 'kontrak.verif') {
      cekIzin(ctx, 'kontrak.update');
      k.PerluVerifikasi = 'FALSE'; lg('VERIFIKASI', 'Kontrak', k.KontrakID, 'PerluVerifikasi', 'ya', 'tidak', '');
    } else if (op === 'order.simpan') {
      cekIzin(ctx, 'kontrak.update');
      var o = data.o || {}, ada = o.OrderID ? cariBaris(b.order, 'OrderID', o.OrderID, 'SO/MI') : null;
      var n = ada ? null : b.order.length + 1, r = barisOrder(k.KontrakID, n || 0, o, ctx);
      var dobel = hidup(b.order).some(function (x) { return x.NoOrderNorm === r.NoOrderNorm && (!ada || x.OrderID !== ada.OrderID); });
      wajib(!dobel, 'No. order ' + r.NoOrder + ' sudah ada di kontrak ini.');
      if (ada) {
        ['JenisOrder', 'NoOrder', 'NoOrderNorm', 'JenisLayanan', 'JenisPekerjaan', 'JumlahLokasi', 'Keterangan'].forEach(function (c) {
          if (s(ada[c]) !== s(r[c])) { if (c !== 'NoOrderNorm') lg('UBAH_ORDER', 'OrderInternal', ada.OrderID, c, ada[c], r[c]); ada[c] = r[c]; } });
        ada.UpdatedAt = ctx.now; ada.UpdatedBy = ctx.user; ada.Version = s(num(ada.Version) + 1);
      } else { b.order.push(r); lg('TAMBAH_ORDER', 'OrderInternal', r.OrderID, 'NoOrder', '', r.NoOrder, r.JenisOrder); }
    } else if (op === 'order.hapus') {
      cekIzin(ctx, 'kontrak.update');
      var oh = cariBaris(b.order, 'OrderID', data.id, 'SO/MI');
      oh.Dihapus = 'TRUE'; oh.UpdatedAt = ctx.now; oh.UpdatedBy = ctx.user; oh.Version = s(num(oh.Version) + 1);
      lg('HAPUS_ORDER', 'OrderInternal', oh.OrderID, 'NoOrder', oh.NoOrder, '', '');
    } else if (op === 'bast.tambah') {
      cekIzin(ctx, 'kontrak.update');
      var bb = bastBaru(b, ctx, data);
      cekCakupan(b, bb, ctx);
      b.bast.push(bb); out.riwayat.push(riwayat(bb, bb.KodeTahap, ctx, 'BAST dibuat'));
      lg('BUAT_BAST', 'BAST', bb.BASTID, 'DokTagih', '', bb.DokTagih, bb.CakupanLokasi ? bb.CakupanLokasi + ' lokasi' : '');
    } else if (op === 'bast.ubah') {
      cekIzin(ctx, 'kontrak.update');
      var bu = cariBaris(b.bast, 'BASTID', data.id, 'BAST'), baru = {};
      ['DokTagih', 'CakupanOrder', 'CakupanLokasi', 'NoDokBAST', 'Keterangan'].forEach(function (c) { if (c in data) baru[c] = t(data[c]); });
      if ('DokTagih' in baru) wajib(baru.DokTagih === 'BAST' || baru.DokTagih === 'BAA' || (ctx.ref.dokTagih || []).some(function (d) { return d.Kode === baru.DokTagih; }), 'Dokumen tagih tidak dikenal.');
      if ('CakupanLokasi' in baru && baru.CakupanLokasi !== '') wajib(/^\d+$/.test(baru.CakupanLokasi), 'Cakupan lokasi harus angka.');
      var uji = salin(bu); for (var c2 in baru) uji[c2] = baru[c2];
      cekCakupan(b, uji, ctx, bu.BASTID);
      var adaUbah = false;
      Object.keys(baru).forEach(function (c) { if (s(bu[c]) !== baru[c]) { adaUbah = true; lg(c === 'DokTagih' ? 'UBAH_DOKTAGIH' : 'UBAH_BAST', 'BAST', bu.BASTID, LABEL[c] || c, bu[c], baru[c]); bu[c] = baru[c]; } });
      if (adaUbah) { bu.UpdatedAt = ctx.now; bu.UpdatedBy = ctx.user; bu.Version = s(num(bu.Version) + 1); } else out.kosong = true;
    } else if (op === 'bast.tahap') {
      cekIzin(ctx, 'kontrak.update');
      var bt = cariBaris(b.bast, 'BASTID', data.id, 'BAST'), ke = ctx.ref.T[data.ke], dari = ctx.ref.T[bt.KodeTahap];
      wajib(ke && ke.Aktif, 'Tahap tujuan tidak dikenal atau nonaktif.');
      wajib(!bastClose(bt, ctx.ref), 'BAST ini sudah close. Untuk membukanya lagi, buka kendala pemicu reopen (mis. Revisi Dokumen).', 'SUDAH_CLOSE');
      if (bt.KodeTahap === ke.Kode) { out.kosong = true; }
      else {
        var mundur = dari && ke.Urutan < dari.Urutan;
        if (mundur) wajib(t(data.ket), 'Mundur tahap wajib disertai keterangan.');
        lg('UBAH_TAHAP', 'BAST', bt.BASTID, 'KodeTahap', bt.KodeTahap, ke.Kode, t(data.ket) + (mundur ? (t(data.ket) ? ' ' : '') + '(mundur)' : ''));
        bt.KodeTahap = ke.Kode; bt.TglTahapMulai = ctx.now; bt.Status = ke.Penutup ? 'CLOSE' : 'OPEN';
        bt.UpdatedAt = ctx.now; bt.UpdatedBy = ctx.user; bt.Version = s(num(bt.Version) + 1);
        out.riwayat.push(riwayat(bt, ke.Kode, ctx, data.ket));
      }
    } else if (op === 'kendala.buka') {
      cekIzin(ctx, 'kontrak.update');
      var bk = cariBaris(b.bast, 'BASTID', data.bastId, 'BAST'), jk = ctx.ref.KD[data.Jenis], ket = t(data.Keterangan);
      wajib(jk && jk.Aktif, 'Jenis kendala tidak dikenal atau nonaktif.');
      if (jk.WajibKeterangan) wajib(ket, 'Keterangan kendala wajib diisi.');
      if (bastClose(bk, ctx.ref)) {
        wajib(jk.MemicuReopen, 'BAST ini sudah close. Hanya kendala pemicu reopen (mis. Revisi Dokumen, Return Customer) yang bisa dibuka.', 'SUDAH_CLOSE');
        var tr = ctx.ref.T[t(data.tahapReopen) || s(ctx.cfg.TAHAP_REOPEN) || 'DRAFTING'];
        wajib(tr && tr.Aktif && !tr.Penutup, 'Tahap reopen tidak dikenal, nonaktif, atau tahap penutup.');
        bk.Siklus = s(num(bk.Siklus, 1) + 1); bk.KodeTahap = tr.Kode; bk.TglTahapMulai = ctx.now; bk.Status = 'OPEN';
        bk.UpdatedAt = ctx.now; bk.UpdatedBy = ctx.user; bk.Version = s(num(bk.Version) + 1);
        out.riwayat.push(riwayat(bk, tr.Kode, ctx, 'Reopen: ' + jk.Label + (ket ? ' — ' + ket : '')));
        lg('REOPEN', 'BAST', bk.BASTID, 'Siklus', num(bk.Siklus) - 1, bk.Siklus, jk.Label + ' → ' + tr.Label + (data.dariArsip ? '; dari arsip ' + data.dariArsip : ''));
      }
      var nk = b.kend.filter(function (x) { return x.BASTID === bk.BASTID; }).length + 1;
      var kr = { KendalaID: bk.BASTID + '-K' + nk, BASTID: bk.BASTID, KontrakID: k.KontrakID, Jenis: jk.Kode, Keterangan: ket, Status: 'AKTIF', Mulai: ctx.now,
                 DibuatOleh: ctx.user, Selesai: '', DiselesaikanOleh: '', CatatanSelesai: '', Version: '1' };
      b.kend.push(kr); lg('BUKA_KENDALA', 'Kendala', kr.KendalaID, 'Jenis', '', jk.Kode, ket);
    } else if (op === 'kendala.tutup') {
      cekIzin(ctx, 'kontrak.update');
      var kt = cariBaris(b.kend, 'KendalaID', data.id, 'Kendala');
      wajib(kt.Status === 'AKTIF', 'Kendala ini sudah selesai.');
      kt.Status = 'SELESAI'; kt.Selesai = ctx.now; kt.DiselesaikanOleh = ctx.user; kt.CatatanSelesai = t(data.catatan); kt.Version = s(num(kt.Version) + 1);
      lg('TUTUP_KENDALA', 'Kendala', kt.KendalaID, 'Status', 'AKTIF', 'SELESAI', t(data.catatan));
    } else {
      throw galat('AKSI_TIDAK_DIKENAL', 'Operasi "' + op + '" tidak dikenal.');
    }

    terapkanTurunan(b, ctx.ref, ctx.now);
    if (!out.kosong) { b.k.UpdatedAt = ctx.now; b.k.UpdatedBy = ctx.user; b.k.Version = s(num(b.k.Version) + 1); }
    return out;
  }
  function cekCakupan(bundle, bastUji, ctx, gantiId) {
    var lok = t(bundle.k.JumlahLokasi);
    if (lok === '') return;
    var lain = hidup(bundle.bast).filter(function (x) { return x.BASTID !== (gantiId || bastUji.BASTID); });
    var jumlah = lain.reduce(function (a, x) { return a + num(x.CakupanLokasi, 0); }, 0) + num(bastUji.CakupanLokasi, 0);
    wajib(jumlah <= num(lok), 'Total cakupan semua BAST (' + jumlah + ') melebihi jumlah lokasi kontrak (' + lok + ').');
  }

  /** Bandingkan dua bundle → baris yang ditambah/diubah per tab (dipakai server untuk menulis seminimal mungkin). */
  var KUNCI_TAB = { Kontrak: 'KontrakID', BAST: 'BASTID', OrderInternal: 'OrderID', Kendala: 'KendalaID' };
  var TAB_BUNDLE = { Kontrak: 'k', BAST: 'bast', OrderInternal: 'order', Kendala: 'kend' };
  function beda(lama, baru) {
    var out = { tambah: {}, ubah: {} };
    Object.keys(TAB_BUNDLE).forEach(function (tab) {
      var key = KUNCI_TAB[tab], a = lama ? lama[TAB_BUNDLE[tab]] : null, z = baru[TAB_BUNDLE[tab]];
      if (tab === 'Kontrak') { a = a ? [a] : []; z = z ? [z] : []; }
      var peta = {}; (a || []).forEach(function (r) { peta[r[key]] = JSON.stringify(r); });
      (z || []).forEach(function (r) {
        if (!(r[key] in peta)) (out.tambah[tab] = out.tambah[tab] || []).push(r);
        else if (peta[r[key]] !== JSON.stringify(r)) (out.ubah[tab] = out.ubah[tab] || []).push(r);
      });
    });
    return out;
  }

  // ------------------------------------------------------------------ upload Excel (§11.0)
  var KOL_UPLOAD = { no: ['no kontrak', 'nomor kontrak', 'no wo/spk/kl'], judul: ['judul kontrak', 'judul'], jenis: ['jenis dok'], tahun: ['tahun project', 'tahun'],
    pop: ['populasi', 'pop'], pel: ['customer', 'direct customer'], end: ['end customer', 'nama pelanggan', 'pelanggan'], seg: ['segment', 'seg'], nilai: ['nilai kontrak', 'nilai'],
    lok: ['jumlah lokasi'], pic: ['pic'], doc: ['dok tagih bast-1', 'dok tagih'], tahap: ['tahap awal bast-1', 'tahap awal', 'tahap'], tgl: ['tgl masuk tahap', 'tanggal masuk tahap'],
    kend: ['kendala'], ket: ['keterangan kendala'], cat: ['catatan'], so: ['no so', 'so'], mi: ['no mi', 'mi'] };
  var KOL_SO = { no: ['no kontrak', 'nomor kontrak'], j: ['jenis'], ono: ['no order'], lay: ['jenis layanan'], pek: ['jenis pekerjaan'], lok: ['jumlah lokasi'], ket: ['keterangan'] };
  function hNorm(h) { return s(h).toLowerCase().replace(/\*/g, '').replace(/\./g, '').replace(/[^a-z0-9\/-]+/g, ' ').trim(); }
  function petaKolom(header, def) {
    var m = {}, hs = header.map(hNorm);
    Object.keys(def).forEach(function (f) { var i = hs.findIndex(function (h) { return def[f].map(hNorm).indexOf(h) >= 0; }); if (i >= 0) m[f] = i; });
    return m;
  }
  /** aoa (baris pertama = header) → objek per baris dengan nomor baris Excel. */
  function barisDariAoa(aoa, def) {
    var m = petaKolom(aoa[0] || [], def);
    if (m.no === undefined) return null;
    var out = [];
    for (var i = 1; i < aoa.length; i++) {
      var row = aoa[i] || [], o = { baris: i + 1 }, isi = false;
      Object.keys(m).forEach(function (f) { var v = row[m[f]]; o[f] = v === undefined || v === null ? '' : v; if (s(v).trim() !== '') isi = true; });
      if (isi) out.push(o);
    }
    return out;
  }
  function cariRef(list, v) { v = t(v).toLowerCase(); return (list || []).filter(function (x) { return x.Aktif && (x.Kode.toLowerCase() === v || x.Label.toLowerCase() === v); })[0] || null; }

  /**
   * Periksa baris upload. ctx: {ref, cfg, cariNomor(normKey) → {KontrakID, NoKontrak, viaAlias, lokasi} | null, pic[] (alias PIC aktif),
   *   bolehPic, alias (PIC user), hariIni ('yyyy-MM-dd')}
   */
  /** "SO-1, SO-2; SO-3" → ['SO-1','SO-2','SO-3'] (koma, titik koma, atau baris baru). */
  function pecahNomor(v) { return s(v).split(/[,;\n]+/).map(t).filter(Boolean); }
  function periksaUpload(rows, ctx) {
    var seen = {}, seenOrder = {};
    return rows.map(function (r) {
      var o = { baris: r.baris, err: [], warn: [], info: [], st: 'baru' }, v = function (f) { return t(r[f]); };
      o.no = v('no'); o.judul = v('judul');
      if (!o.no) { o.err.push('No. kontrak kosong'); o.st = 'error'; return o; }
      var nk = normKey(o.no);
      if (seen[nk]) o.err.push('Nomor sama dengan baris ' + seen[nk] + ' di file ini'); else seen[nk] = r.baris;
      var ada = ctx.cariNomor(nk);
      o.ada = ada || null;
      if (ada && ada.lokasi && ada.lokasi !== 'AKTIF') o.info.push('Kontrak ini sudah CLOSE dan tersimpan di arsip ' + ada.lokasi.replace('ARSIP_', '') + '; tidak diubah lewat upload');
      if (!ada && !o.judul) o.err.push('Judul kontrak wajib diisi');
      o.jenis = v('jenis');
      if (o.jenis) { var jd = cariRef(ctx.ref.jenisDok, o.jenis); if (!jd) { o.warn.push('Jenis dok "' + o.jenis + '" tidak dikenal, ditebak dari nomor'); o.jenis = ''; } else o.jenis = jd.Kode; }
      if (!o.jenis && !ada) { o.jenis = tebakJenisDok(o.no); if (o.jenis) o.info.push('Jenis dok ditebak: ' + o.jenis); else o.warn.push('Jenis dok tidak bisa ditebak, dikosongkan'); }
      o.tahun = v('tahun'); if (/^\d{4}\.0+$/.test(o.tahun)) o.tahun = o.tahun.slice(0, 4);
      if (o.tahun && !/^(19|20)\d\d$/.test(o.tahun)) { o.warn.push('Tahun "' + o.tahun + '" tidak valid, dikosongkan'); o.tahun = ''; }
      ['pop:populasi:Populasi', 'seg:segment:Segment'].forEach(function (x) {
        var p = x.split(':'), val = v(p[0]);
        if (!val) { o[p[0]] = ''; return; }
        var rf = cariRef(ctx.ref[p[1]], val);
        if (!rf) { o.warn.push(p[2] + ' "' + val + '" belum ada di Referensi, dikosongkan'); o[p[0]] = ''; } else o[p[0]] = rf.Kode;
      });
      o.pel = v('pel'); o.end = v('end');
      var n = bacaRupiah(r.nilai); if (n.e) o.err.push('Nilai kontrak "' + v('nilai') + '" bukan angka'); else o.nilai = n.v;
      o.lok = v('lok'); if (/^\d+\.0+$/.test(o.lok)) o.lok = o.lok.split('.')[0];
      if (o.lok !== '' && !(/^\d+$/.test(o.lok) && +o.lok >= 1)) o.err.push('Jumlah lokasi "' + o.lok + '" harus bilangan bulat ≥ 1');
      o.pic = v('pic');
      if (!ctx.bolehPic) { if (o.pic && o.pic !== ctx.alias) o.warn.push('Kolom PIC diabaikan (butuh izin pic.atur); PIC sementara = Anda'); o.pic = ada ? '' : t(ctx.alias); }
      else if (o.pic) { var pc = (ctx.pic || []).filter(function (x) { return x.toLowerCase() === o.pic.toLowerCase(); })[0]; if (!pc) { o.warn.push('PIC "' + o.pic + '" tidak ada di Users → kontrak tanpa PIC'); o.pic = ''; } else o.pic = pc; }
      o.doc = v('doc').toUpperCase();
      if (o.doc && !cariRef(ctx.ref.dokTagih, o.doc) && o.doc !== 'BAST' && o.doc !== 'BAA') o.err.push('Dok tagih "' + v('doc') + '" tidak dikenal (BAST atau BAA)');
      var tv = v('tahap'), tp = tv ? ctx.ref.tahap.filter(function (x) { return x.Aktif && (x.Label.toLowerCase() === tv.toLowerCase() || x.Kode.toLowerCase() === tv.toLowerCase()); })[0] : ctx.ref.T[tahapPertama(ctx.ref)];
      if (!tp) o.err.push('Tahap "' + tv + '" tidak ada. Pilihan: ' + ctx.ref.tahap.filter(function (x) { return x.Aktif; }).map(function (x) { return x.Label; }).join(', ')); else o.tahap = tp.Kode;
      var tg = bacaTanggal(r.tgl);
      if (tg.e) o.err.push('Tgl masuk tahap "' + v('tgl') + '" tidak terbaca');
      else if (tg.v && ctx.hariIni && tg.v > ctx.hariIni) o.err.push('Tgl masuk tahap tidak boleh di masa depan');
      else o.tgl = tg.v;
      var kv = v('kend'); o.ket = v('ket');
      if (kv) {
        var kj = ctx.ref.kendala.filter(function (x) { return x.Aktif && (x.Label.toLowerCase() === kv.toLowerCase() || x.Kode.toLowerCase() === kv.toLowerCase()); })[0];
        if (!kj) o.err.push('Kendala "' + kv + '" tidak ada. Pilihan: ' + ctx.ref.kendala.filter(function (x) { return x.Aktif; }).map(function (x) { return x.Label; }).join(', '));
        else { o.kend = kj.Kode; if (kj.WajibKeterangan && !o.ket) o.err.push('Keterangan kendala wajib diisi bila Kendala diisi'); }
      }
      o.cat = v('cat');
      // SO/MI ditulis di tab Kontrak, banyak nomor dipisah koma (C18)
      o.orders = [];
      [['so', 'SO'], ['mi', 'MI']].forEach(function (x) {
        var dalam = {};
        pecahNomor(r[x[0]]).forEach(function (no) {
          var on = normKey(no);
          if (dalam[on]) return; dalam[on] = 1;
          if (seenOrder[on] && seenOrder[on] !== r.baris) o.err.push('No. ' + x[1] + ' ' + no + ' juga ada di baris ' + seenOrder[on]); else seenOrder[on] = r.baris;
          o.orders.push({ JenisOrder: x[1], NoOrder: no });
        });
      });
      if (!ada) {
        o.jc = jenisCustomer(o.pel, o.end);
        if (!o.pel) o.warn.push('Customer kosong → jenis customer BELUM TERDEFINISI (masuk "Data belum lengkap")');
        if (!o.end) o.warn.push('End customer kosong → jenis customer BELUM TERDEFINISI');
        o.docFinal = o.doc || dokDefault(o.jc, ctx.cfg);
      }
      o.st = o.err.length ? 'error' : ada ? 'ada' : o.warn.length ? 'peringatan' : 'baru';
      return o;
    });
  }
  var LABEL_UP = { judul: 'JudulKontrak', jenis: 'JenisDok', tahun: 'TahunProject', pop: 'Populasi', pel: 'NamaPelanggan', end: 'EndCustomer', seg: 'Segment', nilai: 'NilaiKontrak', lok: 'JumlahLokasi', pic: 'PIC' };
  /** Mode "Perbarui": kolom yang diisi dan berbeda saja. */
  function perubahanUpload(o, k) {
    if (!k) return [];
    var ch = [];
    Object.keys(LABEL_UP).forEach(function (f) { var v = o[f]; if (v === '' || v === undefined || v === null) return; var c = LABEL_UP[f]; if (s(v) !== s(k[c])) ch.push([c, s(k[c]), s(v)]); });
    return ch;
  }
  function periksaSO(so, rows, cariNomor) {
    var ok = {}, err = {}, seenO = {};
    rows.forEach(function (o) { var nk = normKey(o.no); if (o.st !== 'error') ok[nk] = o; });
    rows.forEach(function (o) { var nk = normKey(o.no); if (o.st === 'error' && o.no && !ok[nk] && !err[nk]) err[nk] = o.baris; });
    return so.map(function (r) {
      var x = { baris: r.baris, no: t(r.no), j: t(r.j).toUpperCase(), ono: t(r.ono), lay: t(r.lay), pek: t(r.pek), lok: t(r.lok).replace(/\.0+$/, ''), ket: t(r.ket), err: [] }, nk = normKey(x.no);
      if (!x.no) x.err.push('No. kontrak kosong');
      else if (err[nk]) x.err.push('Kontraknya error di baris ' + err[nk] + ' tab Kontrak, ikut tidak disimpan');
      else if (!ok[nk] && !cariNomor(nk)) x.err.push('No. kontrak tidak ada di tab Kontrak maupun di SKM');
      if (x.j !== 'SO' && x.j !== 'MI') x.err.push('Jenis "' + t(r.j) + '" harus SO atau MI');
      if (!x.ono) x.err.push('No. order kosong');
      else { var on = normKey(x.ono); if (seenO[on]) x.err.push('No. order sama dengan baris ' + seenO[on]); else seenO[on] = x.baris; }
      if (x.lok !== '' && !/^\d+$/.test(x.lok)) x.err.push('Jumlah lokasi harus angka');
      x.st = x.err.length ? 'error' : 'ok'; x.kontrak = ok[nk] || null;
      return x;
    });
  }

  // ------------------------------------------------------------------ import sheet FF format lama (§11.1, F3)
  var KOL_IMPORT = [['no', 'No. kontrak', ['no wo/spk/kl', 'no kontrak', 'nomor kontrak', 'no wo spk kl']], ['judul', 'Judul kontrak', ['judul kontrak', 'judul']],
    ['tahun', 'Tahun project', ['tahun project', 'tahun']], ['pop', 'Populasi', ['populasi', 'pop']], ['end', 'End customer', ['nama pelanggan', 'end customer', 'pelanggan']],
    ['pel', 'Customer (direct)', ['customer', 'nama customer', 'direct customer']], ['seg', 'Segment', ['segment tsat', 'segment', 'seg']], ['nilai', 'Nilai kontrak', ['nilai kontrak', 'nilai']],
    ['pic', 'PIC', ['pic']], ['status', 'Status awal', ['status awal', 'status']], ['ku', 'Kendala umum (lama)', ['kendala umum']], ['detil', 'Kendala detil', ['kendala detil', 'kendala detail']]];
  /** Header file → { field: indeks kolom } (dikenali dari judul; -1 = tidak ada). */
  function petaImport(header) {
    var hs = (header || []).map(hNorm), m = {};
    KOL_IMPORT.forEach(function (x) { var al = x[2].map(hNorm); m[x[0]] = hs.findIndex(function (h) { return al.indexOf(h) >= 0; }); });
    return m;
  }
  /** Usulan arti nilai STATUS AWAL / KENDALA UMUM lama (tabel §11.1). tebak = di luar tabel, perlu dicek. */
  function tebakNilaiLama(v, ref) {
    var u = t(v).toUpperCase().replace(/\s+/g, ' '), ada = function (k) { return ref && ref.T && ref.T[k] && ref.T[k].Aktif; };
    var th = function (k, tebak) { return ada(k) ? { jenis: 'tahap', kode: k, tebak: !!tebak } : { jenis: 'lain' }; };
    if (!u) return { jenis: 'abaikan' };
    if (/PARSIAL/.test(u)) return { jenis: 'parsial' };
    if (/REVISI/.test(u)) return ref && ref.KD && ref.KD.REV_DOKUMEN ? { jenis: 'kendala', kode: 'REV_DOKUMEN' } : { jenis: 'lain' };
    if (/TAKEOUT|SERTIM/.test(u)) { var pt = penutup(ref || { tahap: [] }); return pt ? { jenis: 'tahap', kode: pt.Kode } : { jenis: 'lain' }; }
    if (/BAST DONE/.test(u)) return th('BAST_DONE');
    if (/ON REVIEW/.test(u)) return th('REVIEW_CUST');
    if (/KOMPULIR/.test(u)) return th('KOMPULIR');
    if (/SIRKULIR/.test(u)) return th('SIRKULIR', true);
    if (/REVIEW/.test(u)) return th('REVIEW_CUST', true);
    if (/DRAFT/.test(u)) return th('DRAFTING', true);
    return { jenis: 'lain' };
  }
  /** Nilai unik STATUS AWAL & KENDALA UMUM + PIC + referensi baru, untuk layar pemetaan. */
  function ringkasImport(rows, map, ref) {
    var nilai = {}, pic = {}, refBaru = {};
    var v = function (r, f) { return map[f] >= 0 ? t(r[map[f]]) : ''; };
    rows.forEach(function (r) {
      [v(r, 'status'), v(r, 'ku')].forEach(function (x) { if (!x) return; var k = x.toUpperCase().replace(/\s+/g, ' '); nilai[k] = (nilai[k] || 0) + 1; });
      var p = v(r, 'pic'); if (p) pic[p] = (pic[p] || 0) + 1;
      [['pop', 'populasi', 'Populasi'], ['seg', 'segment', 'Segment']].forEach(function (x) { var val = v(r, x[0]); if (val && !cariRef(ref[x[1]], val)) refBaru[x[2] + ':' + val] = (refBaru[x[2] + ':' + val] || 0) + 1; });
    });
    return { nilai: nilai, pic: pic, refBaru: refBaru };
  }
  /**
   * Periksa baris import. rows: [{baris, r:[sel...]}]. o: {map, nilai{NILAI: {jenis,kode}}, pic{nama: alias}, refBaru{'Populasi:X': true}, ref, cfg,
   *   cariNomor(normKey)}. Hasil per baris: st baru | peringatan | ada | error.
   */
  function periksaImport(rows, o) {
    var seen = {}, ref = o.ref, map = o.map || {};
    return rows.map(function (row) {
      var r = row.r || [], v = function (f) { return map[f] >= 0 ? t(r[map[f]]) : ''; };
      var x = { baris: row.baris, err: [], warn: [], info: [], asal: [], kend: [], parsial: false, st: 'baru' };
      x.no = v('no').replace(/\.+$/, ''); x.judul = v('judul'); x.end = v('end'); x.pel = v('pel'); x.detil = v('detil');
      if (!x.no) { x.err.push('No. kontrak kosong'); x.st = 'error'; return x; }
      var nk = normKey(x.no);
      if (seen[nk]) { x.err.push('Nomor sama dengan baris ' + seen[nk] + ' di file ini'); x.st = 'error'; return x; }
      seen[nk] = row.baris;
      var ada = o.cariNomor ? o.cariNomor(nk) : null;
      if (ada) {
        x.ada = ada; x.st = 'ada';
        x.info.push('Sudah terdaftar sebagai ' + ada.KontrakID + (ada.viaAlias ? ' (lewat nomor lama)' : '') + (ada.lokasi && ada.lokasi !== 'AKTIF' ? ' di arsip ' + ada.lokasi.replace('ARSIP_', '') : '') + ' · dilewati');
        return x;
      }
      if (!x.judul) { x.judul = x.end ? 'Kontrak ' + x.end : x.no; x.warn.push('Judul kosong → diisi "' + x.judul + '", lengkapi saat verifikasi'); }
      x.jenis = tebakJenisDok(x.no);
      x.tahun = v('tahun').replace(/\.0+$/, '');
      if (x.tahun && !/^(19|20)\d\d$/.test(x.tahun)) { x.warn.push('Tahun "' + x.tahun + '" tidak valid, dikosongkan'); x.tahun = ''; }
      var n = bacaRupiah(map.nilai >= 0 ? r[map.nilai] : '');
      if (n.e) { x.warn.push('Nilai "' + v('nilai') + '" tidak terbaca, dikosongkan'); x.nilai = ''; } else x.nilai = n.v;
      [['pop', 'populasi', 'Populasi'], ['seg', 'segment', 'Segment']].forEach(function (q) {
        var val = v(q[0]); x[q[0]] = '';
        if (!val) return;
        var rf = cariRef(ref[q[1]], val);
        if (rf) x[q[0]] = rf.Kode;
        else if ((o.refBaru || {})[q[2] + ':' + val]) { x[q[0]] = val; x.info.push(q[2] + ' baru "' + val + '" ditambahkan ke Referensi'); }
        else x.warn.push(q[2] + ' "' + val + '" belum ada di Referensi, dikosongkan');
      });
      var p = v('pic'); x.pic = p ? t((o.pic || {})[p]) : '';
      if (o.bolehPic === false) { if (p && x.pic !== t(o.alias)) x.warn.push('Kolom PIC diabaikan (butuh izin pic.atur); PIC = Anda'); x.pic = t(o.alias); }
      else if (p && !x.pic) x.warn.push('PIC "' + p + '" tidak dipetakan → tanpa PIC');
      var tahap = null;
      [v('status'), v('ku')].forEach(function (val) {
        if (!val) return;
        var key = val.toUpperCase().replace(/\s+/g, ' '), m = (o.nilai || {})[key] || tebakNilaiLama(key, ref);
        if (m.jenis === 'tahap' && ref.T[m.kode]) { if (!tahap || ref.T[m.kode].Urutan > ref.T[tahap].Urutan) tahap = m.kode; x.asal.push(val + ' → tahap ' + ref.T[m.kode].Label); }
        else if (m.jenis === 'kendala' && ref.KD[m.kode]) { x.kend.push({ Jenis: m.kode, Keterangan: x.detil || val }); x.asal.push(val + ' → kendala ' + ref.KD[m.kode].Label); }
        else if (m.jenis === 'parsial') { x.parsial = true; x.asal.push(val + ' → ditandai BAST parsial'); }
        else if (m.jenis === 'abaikan') x.asal.push(val + ' → diabaikan');
        else { var kl = ref.KD.LAINNYA ? 'LAINNYA' : (ref.kendala.filter(function (k) { return k.Aktif; })[0] || {}).Kode; if (kl) { x.kend.push({ Jenis: kl, Keterangan: val }); x.asal.push(val + ' → kendala ' + ref.KD[kl].Label); } }
      });
      x.tahap = tahap || tahapPertama(ref);
      var dk = {}; x.kend = x.kend.filter(function (k) { if (dk[k.Jenis]) return false; dk[k.Jenis] = 1; return true; });
      if (ref.T[x.tahap] && ref.T[x.tahap].Penutup) {
        x.info.push('Langsung CLOSE saat diimport · tanggal close = tanggal import');
        if (x.kend.length) { x.warn.push('Kendala tidak dibuka karena kontrak langsung CLOSE: ' + x.kend.map(function (k) { return ref.KD[k.Jenis].Label; }).join(', ')); x.kend = []; }
      }
      x.ketBast = x.parsial ? 'BAST parsial (dari data lama): lengkapi cakupan lokasi & BAST berikutnya saat verifikasi' + (x.kend.length || !x.detil ? '' : ' · ' + x.detil) : (x.kend.length ? '' : x.detil);
      x.jc = jenisCustomer(x.pel, x.end);
      if (!x.pel) x.info.push('Customer kosong → jenis customer BELUM TERDEFINISI');
      x.doc = dokDefault(x.jc, o.cfg);
      x.st = x.err.length ? 'error' : x.warn.length ? 'peringatan' : 'baru';
      return x;
    });
  }
  /** Data operasi kontrak.buat untuk satu baris hasil periksaImport. */
  function dataImport(x, file) {
    return { f: { NoKontrak: x.no, JudulKontrak: x.judul, JenisDok: x.jenis, TahunProject: x.tahun, Populasi: x.pop, NamaPelanggan: x.pel, EndCustomer: x.end,
                  Segment: x.seg, NilaiKontrak: x.nilai, PIC: x.pic },
             orders: [], dokTagih: x.doc, tahapAwal: x.tahap, ketBast: x.ketBast, kendala: x.kend, verifikasi: true, sumber: 'IMPORT',
             catatan: 'import data lama ' + file + ' baris ' + x.baris + (x.asal.length ? ' (' + x.asal.join('; ') + ')' : '') };
  }

  return {
    KOL_IMPORT: KOL_IMPORT, petaImport: petaImport, tebakNilaiLama: tebakNilaiLama, ringkasImport: ringkasImport, periksaImport: periksaImport, dataImport: dataImport,
    s: s, t: t, bool: bool, num: num, salin: salin, galat: galat, normKey: normKey, normCust: normCust, jenisCustomer: jenisCustomer, LABEL_JC: LABEL_JC,
    dokDefault: dokDefault, siapkanRef: siapkanRef, tahapPertama: tahapPertama, penutup: penutup, bastClose: bastClose, hidup: hidup, cakupan: cakupan,
    statusKontrak: statusKontrak, tahapKontrak: tahapKontrak, bastOpen: bastOpen, hariSejak: hariSejak, bucket: bucket, kendalaAktif: kendalaAktif,
    evalPush: evalPush, celahAturan: celahAturan, turunan: turunan, terapkanTurunan: terapkanTurunan, KOL_TURUNAN: KOL_TURUNAN, fieldKurang: fieldKurang,
    bacaRupiah: bacaRupiah, bacaTanggal: bacaTanggal, tebakJenisDok: tebakJenisDok, FIELD_KONTRAK: FIELD_KONTRAK, LABEL: LABEL,
    jalankan: jalankan, beda: beda, KUNCI_TAB: KUNCI_TAB, TAB_BUNDLE: TAB_BUNDLE,
    KOL_UPLOAD: KOL_UPLOAD, KOL_SO: KOL_SO, pecahNomor: pecahNomor, petaKolom: petaKolom, barisDariAoa: barisDariAoa, periksaUpload: periksaUpload, perubahanUpload: perubahanUpload, periksaSO: periksaSO
  };
})();
if (typeof module !== 'undefined') module.exports = KD;

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

// ===== 20_Repo.js =====
/**
 * Repo: SATU-SATUNYA modul yang menyentuh database (§3.4, §4.3). Semua nilai disimpan sebagai teks (format sel "@").
 *
 * File:
 *   SKM_DB              tab kecil (Users, Ref_*, Config, _Meta) + tab besar data aktif (Kontrak, BAST, …) + Indeks semua kontrak
 *   SKM_ARSIP_<tahun>   kontrak CLOSE yang dipindah (tab sama dengan tab besar data kontrak)
 *   SKM_LOG_<tahun>     satu tab per bulan: Log-<yyyy-mm>
 *
 * Tab kecil: dibaca utuh lalu di-cache (diperbarui setelah menulis).
 * Tab besar: TIDAK dibaca utuh per permintaan. Nomor baris dicari lewat indeks (kunci → baris) di cache; satu baris dibaca/ditulis.
 */
var Repo = (function () {

  var KOL_LOG = ['Timestamp', 'Username', 'Aksi', 'Entitas', 'EntitasID', 'Field', 'NilaiLama', 'NilaiBaru', 'Catatan', 'Hasil'];
  var KOL_DATA = {
    Kontrak: ['KontrakID', 'NoKontrak', 'NoKontrakNorm', 'JenisDok', 'TahunProject', 'Populasi', 'NamaPelanggan', 'EndCustomer', 'JudulKontrak', 'Segment',
      'NilaiKontrak', 'JumlahLokasi', 'PIC', 'JenisCustomer', 'TahapKontrak', 'StatusKontrak', 'SisaLokasi', 'KendalaUmum', 'KendalaDetil', 'TglStatusBerubah',
      'TglClose', 'PerluVerifikasi', 'Arsip', 'AlasanArsip', 'SumberAwal', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'Version'],
    OrderInternal: ['OrderID', 'KontrakID', 'JenisOrder', 'NoOrder', 'NoOrderNorm', 'JenisLayanan', 'JenisPekerjaan', 'JumlahLokasi', 'Keterangan', 'Dihapus',
      'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'Version'],
    BAST: ['BASTID', 'KontrakID', 'Urutan', 'DokTagih', 'KodeTahap', 'Siklus', 'CakupanOrder', 'CakupanLokasi', 'DaftarLokasi', 'NoDokBAST', 'TglTahapMulai',
      'Keterangan', 'Status', 'Dihapus', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'Version'],
    RiwayatTahap: ['BASTID', 'KontrakID', 'Siklus', 'KodeTahap', 'Masuk', 'Oleh', 'Keterangan'],
    Kendala: ['KendalaID', 'BASTID', 'KontrakID', 'Jenis', 'Keterangan', 'Status', 'Mulai', 'DibuatOleh', 'Selesai', 'DiselesaikanOleh', 'CatatanSelesai', 'Version']
  };
  var REF = ['Kode', 'Label', 'Aktif', 'Urutan', 'UpdatedAt', 'UpdatedBy'];
  // Skema SKM_DB versi terbaru. Migrasi hanya MENAMBAH tab/kolom (§3.3).
  var SKEMA_TAB = {
    _Meta: ['Key', 'Nilai'],
    Users: ['Username', 'Nama', 'AliasPIC', 'Role', 'PasswordHash', 'Salt', 'Aktif', 'WajibGantiPassword', 'GagalLogin',
            'TerkunciSampai', 'LoginTerakhir', 'PunyaAktivitas', 'SesiVersi', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'Version', 'IzinTambahan'],
    Ref_Role: ['Role', 'Izin', 'UpdatedAt', 'UpdatedBy'],
    Config: ['Key', 'Nilai', 'Keterangan', 'UpdatedAt', 'UpdatedBy'],
    Kontrak: KOL_DATA.Kontrak, OrderInternal: KOL_DATA.OrderInternal, BAST: KOL_DATA.BAST, RiwayatTahap: KOL_DATA.RiwayatTahap, Kendala: KOL_DATA.Kendala,
    KontrakAlias: ['AliasNorm', 'NoAsli', 'KontrakID', 'Sumber', 'Catatan', 'CreatedAt', 'CreatedBy'],
    Indeks: ['NoKontrakNorm', 'KontrakID', 'NoKontrak', 'NamaPelanggan', 'EndCustomer', 'JudulKontrak', 'StatusKontrak', 'TahapKontrak', 'PIC', 'Lokasi', 'TglClose', 'Arsip'],
    Ref_Tahap: ['Kode', 'Urutan', 'Label', 'Penutup', 'BatasAgingHari', 'Aktif', 'UpdatedAt', 'UpdatedBy'],
    Ref_Kendala: ['Kode', 'Label', 'WajibKeterangan', 'MemicuReopen', 'Aktif', 'Urutan', 'UpdatedAt', 'UpdatedBy'],
    Ref_NilaiPush: ['Urutan', 'Kondisi', 'Nilai', 'Aktif', 'UpdatedAt', 'UpdatedBy'],
    Ref_JenisDok: REF, Ref_Populasi: REF, Ref_Segment: REF, Ref_DokTagih: REF
  };
  var KUNCI = { _Meta: 'Key', Users: 'Username', Ref_Role: 'Role', Config: 'Key', Ref_Tahap: 'Kode', Ref_Kendala: 'Kode', Ref_NilaiPush: 'Kondisi',
                Ref_JenisDok: 'Kode', Ref_Populasi: 'Kode', Ref_Segment: 'Kode', Ref_DokTagih: 'Kode' };
  // tab besar: kunci (null = hanya ditambah) dan kolom KontrakID (untuk arsip)
  var BESAR = { Kontrak: { key: 'KontrakID', kid: 'KontrakID' }, BAST: { key: 'BASTID', kid: 'KontrakID' }, OrderInternal: { key: 'OrderID', kid: 'KontrakID' },
                Kendala: { key: 'KendalaID', kid: 'KontrakID' }, Indeks: { key: 'KontrakID', kid: 'KontrakID' }, RiwayatTahap: { key: null, kid: 'KontrakID' },
                KontrakAlias: { key: null, kid: 'KontrakID' } };
  var TAB_ARSIP = ['Kontrak', 'OrderInternal', 'BAST', 'RiwayatTahap', 'Kendala'];
  var CACHE_DETIK = 300, CACHE_LAMA = 21600, POTONG = 90000;

  var _ss = null, _memo = {}, _hdr = {}, _max = {}, _logBuf = [], _file = {}, _idx = {};

  function galat(kode, pesan) { var e = new Error(pesan); e.kode = kode; return e; }
  function sekarang() { return Utilities.formatDate(new Date(), APP.TZ, 'yyyy-MM-dd HH:mm:ss'); }
  function props() { return PropertiesService.getScriptProperties(); }
  function dbId() { return props().getProperty('DB_ID'); }
  function siap() { return !!dbId(); }
  function cache() { return CacheService.getScriptCache(); }

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

  // ---------- cache besar: JSON dipotong ≤ 90 KB per item ----------
  function cachePut(key, obj, detik) {
    var json = JSON.stringify(obj), n = Math.ceil(json.length / POTONG) || 1, o = {};
    for (var i = 0; i < n; i++) o[key + '#' + i] = json.substr(i * POTONG, POTONG);
    o[key] = String(n);
    try { cache().putAll(o, detik || CACHE_LAMA); } catch (e) { cache().remove(key); }
  }
  function cacheGet(key) {
    var n = Number(cache().get(key));
    if (!n) return null;
    var keys = []; for (var i = 0; i < n; i++) keys.push(key + '#' + i);
    var got = cache().getAll(keys), s = '';
    for (var j = 0; j < n; j++) { if (got[keys[j]] === undefined || got[keys[j]] === null) return null; s += got[keys[j]]; }
    try { return JSON.parse(s); } catch (e) { return null; }
  }

  // ---------- tab kecil ----------
  function simpanCache(tab) {
    if (BESAR[tab] || !_memo[tab]) return;
    try { cache().put('tab:' + tab, JSON.stringify(_memo[tab]), CACHE_DETIK); } catch (e) { cache().remove('tab:' + tab); }
  }
  function lupakan(tab) {
    delete _memo[tab]; delete _hdr[tab]; delete _max[tab]; delete _idx[tab];
    cache().removeAll(['hdr:' + tab, 'tab:' + tab, 'idx:' + tab, 'n:' + tab]);
  }
  function headerSheet(sh) { var lc = sh.getLastColumn(); return lc ? sh.getRange(1, 1, 1, lc).getValues()[0].map(String) : []; }
  /** Judul kolom tab SKM_DB: memo → cache (6 jam; dibuang saat migrasi) → sheet. */
  function header(tab) {
    if (_hdr[tab]) return _hdr[tab];
    var c = cache().get('hdr:' + tab);
    if (c) { _hdr[tab] = JSON.parse(c); return _hdr[tab]; }
    _hdr[tab] = headerSheet(sheet(tab));
    if (_hdr[tab].length) cache().put('hdr:' + tab, JSON.stringify(_hdr[tab]), CACHE_LAMA);
    return _hdr[tab];
  }
  function keObjek(h, v, row) { var o = row ? { _row: row } : {}; for (var j = 0; j < h.length; j++) o[h[j]] = v[j] === null || v[j] === undefined ? '' : String(v[j]); return o; }
  function bacaSemua(sh) {
    var v = sh.getDataRange().getValues(), h = (v[0] || []).map(String), rows = [];
    for (var i = 1; i < v.length; i++) { if (v[i].join('') === '') continue; rows.push(keObjek(h, v[i], i + 1)); }
    return { h: h, rows: rows };
  }
  function semua(tab) {
    if (BESAR[tab]) return bacaSemua(sheet(tab)).rows;      // tab besar: tidak di-cache (dipakai snapshot & pekerjaan latar)
    if (_memo[tab]) return _memo[tab];
    var c = cache().get('tab:' + tab);
    if (c) { _memo[tab] = JSON.parse(c); return _memo[tab]; }
    var x = bacaSemua(sheet(tab));
    _hdr[tab] = x.h; _memo[tab] = x.rows; simpanCache(tab);
    return x.rows;
  }
  function cari(tab, kunci) {
    if (BESAR[tab]) return besarBaca(tab, kunci);
    var k = KUNCI[tab], rows = semua(tab);
    for (var i = 0; i < rows.length; i++) if (rows[i][k] === String(kunci)) return rows[i];
    return null;
  }
  function barisNilai(h, obj) { return h.map(function (c) { var v = obj[c]; return v === undefined || v === null ? '' : String(v); }); }

  /** Sheet bawaan hanya 1.000 baris: tambah baris berformat teks bila penulisan melewati batas. */
  function pastikanBaris(kunci, sh, sampai, ncol) {
    if (_max[kunci] === undefined) _max[kunci] = sh.getMaxRows();
    if (sampai <= _max[kunci]) return;
    var n = Math.max(1000, sampai - _max[kunci]);
    sh.insertRowsAfter(_max[kunci], n);
    sh.getRange(_max[kunci] + 1, 1, n, Math.max(sh.getMaxColumns(), ncol)).setNumberFormat('@');
    _max[kunci] += n;
  }
  function isiOtomatis(h, obj) {
    var now = sekarang(), o = {};
    for (var k in obj) o[k] = obj[k];
    if (h.indexOf('Version') >= 0 && !o.Version) o.Version = '1';
    if (h.indexOf('CreatedAt') >= 0 && !o.CreatedAt) o.CreatedAt = now;
    if (h.indexOf('UpdatedAt') >= 0 && !o.UpdatedAt) o.UpdatedAt = now;
    return o;
  }
  function tambah(tab, obj) {
    if (BESAR[tab]) { besarTambah(tab, [obj]); return obj; }
    var rows = semua(tab), h = header(tab), o = isiOtomatis(h, obj), r = 2;
    rows.forEach(function (x) { if (x._row >= r) r = x._row + 1; });
    var sh = sheet(tab);
    pastikanBaris(tab, sh, r, h.length);
    var nilai = barisNilai(h, o);
    sh.getRange(r, 1, 1, h.length).setValues([nilai]);
    rows.push(keObjek(h, nilai, r));
    simpanCache(tab);
    return o;
  }
  /** Ubah baris berdasarkan kunci. versi (opsional) mencegah saling timpa (§7). */
  function ubah(tab, kunci, patch, oleh, versi) {
    var lama = cari(tab, kunci);
    if (!lama) throw galat('TIDAK_ADA', tab + ' "' + kunci + '" tidak ditemukan.');
    var h = header(tab);
    if (versi !== undefined && versi !== null && h.indexOf('Version') >= 0 && String(versi) !== String(lama.Version)) {
      throw galat('KONFLIK', 'Data ini baru saja diubah orang lain. Muat ulang lalu coba lagi.');
    }
    var baru = {};
    for (var k in lama) baru[k] = lama[k];
    for (var p in patch) baru[p] = patch[p] === undefined || patch[p] === null ? '' : String(patch[p]);
    if (h.indexOf('UpdatedAt') >= 0) baru.UpdatedAt = sekarang();
    if (h.indexOf('UpdatedBy') >= 0 && oleh) baru.UpdatedBy = oleh;
    if (h.indexOf('Version') >= 0) baru.Version = String(Domain.num(lama.Version, 0) + 1);
    if (BESAR[tab]) { besarTulis(tab, baru); return baru; }
    sheet(tab).getRange(lama._row, 1, 1, h.length).setValues([barisNilai(h, baru)]);
    var rows = semua(tab), i = rows.indexOf(lama);
    if (i >= 0) rows[i] = baru;
    simpanCache(tab);
    return baru;
  }
  function hapus(tab, kunci) {
    if (BESAR[tab]) throw galat('SKEMA', 'Baris tab besar tidak dihapus langsung.');
    var lama = cari(tab, kunci);
    if (!lama) throw galat('TIDAK_ADA', tab + ' "' + kunci + '" tidak ditemukan.');
    sheet(tab).deleteRow(lama._row);
    if (_max[tab] !== undefined) _max[tab]--;
    var rows = semua(tab), i = rows.indexOf(lama);
    if (i >= 0) { rows.splice(i, 1); for (var j = i; j < rows.length; j++) rows[j]._row--; }
    simpanCache(tab);
  }
  /** Ganti seluruh isi tab kecil (dipakai halaman pengaturan: urutan aturan, dll). */
  function gantiSemua(tab, list) {
    var sh = sheet(tab), h = header(tab), lr = sh.getLastRow(), now = sekarang();
    if (lr > 1) sh.getRange(2, 1, lr - 1, h.length).clearContent();
    var rows = list.map(function (o) { var x = {}; for (var k in o) x[k] = o[k]; if (h.indexOf('UpdatedAt') >= 0 && !x.UpdatedAt) x.UpdatedAt = now; return barisNilai(h, x); });
    if (rows.length) { pastikanBaris(tab, sh, rows.length + 1, h.length); sh.getRange(2, 1, rows.length, h.length).setValues(rows); }
    delete _memo[tab]; cache().remove('tab:' + tab);
  }

  // ---------- tab besar: indeks kunci → baris ----------
  function indeks(tab) {
    if (_idx[tab]) return _idx[tab];
    var c = cacheGet('idx:' + tab);
    if (c) { _idx[tab] = c; return c; }
    return bangunIndeks(tab);
  }
  function bangunIndeks(tab) {
    var sh = sheet(tab), lr = sh.getLastRow(), m = {}, b = BESAR[tab];
    if (b.key && lr > 1) {
      var col = header(tab).indexOf(b.key) + 1, v = sh.getRange(2, col, lr - 1, 1).getValues();
      for (var i = 0; i < v.length; i++) if (v[i][0] !== '') m[String(v[i][0])] = i + 2;
    }
    _idx[tab] = { m: m, n: Math.max(lr, 1) };
    cachePut('idx:' + tab, _idx[tab]);
    return _idx[tab];
  }
  function simpanIndeks(tab) { if (_idx[tab]) cachePut('idx:' + tab, _idx[tab]); }
  /** Satu baris tab besar menurut kunci. Isi sheet dicek; indeks dibangun ulang sekali bila tidak cocok/tidak ada. */
  function besarBaca(tab, kunci) {
    var h = header(tab), kc = h.indexOf(BESAR[tab].key);
    for (var coba = 0; coba < 2; coba++) {
      var r = (coba ? bangunIndeks(tab) : indeks(tab)).m[String(kunci)];
      if (!r) continue;
      var v = sheet(tab).getRange(r, 1, 1, h.length).getValues()[0];
      if (String(v[kc]) === String(kunci)) return keObjek(h, v, r);
    }
    return null;
  }
  /** Tulis baris tab besar (kunci harus sudah ada). Kunci di sheet dicek dulu supaya tidak menimpa baris lain. */
  function besarTulis(tab, obj) {
    var h = header(tab), kc = h.indexOf(BESAR[tab].key) + 1, kunci = String(obj[BESAR[tab].key]), sh = sheet(tab);
    for (var coba = 0; coba < 2; coba++) {
      var r = (coba ? bangunIndeks(tab) : indeks(tab)).m[kunci];
      if (r && String(sh.getRange(r, kc).getValue()) === kunci) { sh.getRange(r, 1, 1, h.length).setValues([barisNilai(h, obj)]); return r; }
    }
    throw galat('TIDAK_ADA', tab + ' "' + kunci + '" tidak ditemukan di database.');
  }
  function besarSheet(tab) { return sheet(tab); }
  function besarBarisKe(tab, r) { var h = header(tab); return keObjek(h, sheet(tab).getRange(r, 1, 1, h.length).getValues()[0], r); }
  /** Semua baris tab besar yang kolomnya = nilai (TextFinder; dipakai riwayat satu kontrak). */
  function besarCari(tab, kolom, nilai) {
    var sh = sheet(tab), lr = sh.getLastRow(), h = header(tab), c = h.indexOf(kolom) + 1, out = [];
    if (lr < 2 || !c) return out;
    sh.getRange(2, c, lr - 1, 1).createTextFinder(String(nilai)).matchEntireCell(true).findAll().forEach(function (cell) {
      var o = besarBarisKe(tab, cell.getRow()); if (o[kolom] === String(nilai)) out.push(o);
    });
    return out;
  }
  function nomorAkhir(tab) {
    if (BESAR[tab].key) return indeks(tab).n;
    if (_idx[tab]) return _idx[tab].n;
    var c = Number(cache().get('n:' + tab));
    _idx[tab] = { m: {}, n: c || Math.max(sheet(tab).getLastRow(), 1) };
    return _idx[tab].n;
  }
  /** Tambah banyak baris sekaligus (satu kali tulis). */
  function besarTambah(tab, list) {
    if (!list.length) return;
    var h = header(tab), sh = sheet(tab), r = nomorAkhir(tab) + 1, b = BESAR[tab];
    var vals = list.map(function (o) { return barisNilai(h, isiOtomatis(h, o)); });
    pastikanBaris(tab, sh, r + vals.length - 1, h.length);
    sh.getRange(r, 1, vals.length, h.length).setValues(vals);
    var x = _idx[tab];
    if (b.key) { var kc = h.indexOf(b.key); vals.forEach(function (v, i) { x.m[v[kc]] = r + i; }); }
    x.n = r + vals.length - 1;
    if (b.key) simpanIndeks(tab); else cache().put('n:' + tab, String(x.n), CACHE_LAMA);
  }
  /** Ganti seluruh isi tab besar (dipakai pindah arsip & hitung ulang massal). */
  function besarGantiSemua(tab, list) {
    var sh = sheet(tab), h = header(tab), lr = sh.getLastRow();
    if (lr > 1) sh.getRange(2, 1, lr - 1, h.length).clearContent();
    if (list.length) { pastikanBaris(tab, sh, list.length + 1, h.length); sh.getRange(2, 1, list.length, h.length).setValues(list.map(function (o) { return barisNilai(h, o); })); }
    lupakan(tab);
  }
  /** Tulis satu blok kolom (berurutan) untuk semua baris — hemat untuk hitung ulang turunan massal. */
  function besarTulisKolom(tab, kolomPertama, nilai2d) {
    if (!nilai2d.length) return;
    var c = header(tab).indexOf(kolomPertama) + 1;
    sheet(tab).getRange(2, c, nilai2d.length, nilai2d[0].length).setValues(nilai2d);
  }

  // ---------- file lain: arsip & log ----------
  function idFile(kunci) { return meta('FILE_' + kunci); }
  function bukaFile(kunci, buat) {
    if (_file[kunci]) return _file[kunci];
    var id = idFile(kunci);
    if (id) { _file[kunci] = SpreadsheetApp.openById(id); return _file[kunci]; }
    if (!buat) return null;
    var f = SpreadsheetApp.create('SKM_' + kunci);
    setMeta('FILE_' + kunci, f.getId());
    _file[kunci] = f;
    return f;
  }
  function tabFile(f, tab, kolom, buat) {
    var sh = f.getSheetByName(tab);
    if (sh || !buat) return sh;
    var kosong = f.getSheets().filter(function (x) { return x.getLastRow() === 0 && /^(Sheet|Lembar)\d*$/.test(x.getName()); })[0];
    sh = kosong || f.insertSheet(tab);
    if (kosong) sh.setName(tab);
    if (sh.getMaxColumns() < kolom.length) sh.insertColumnsAfter(sh.getMaxColumns(), kolom.length - sh.getMaxColumns());
    sh.getRange(1, 1, sh.getMaxRows(), kolom.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, kolom.length).setValues([kolom]);
    sh.setFrozenRows(1);
    return sh;
  }
  function tambahKeFile(f, kunciFile, tab, kolom, vals) {
    if (!vals.length) return;
    var sh = tabFile(f, tab, kolom, true), ck = 'n:' + kunciFile + ':' + tab, r = (Number(cache().get(ck)) || sh.getLastRow() || 1) + 1;
    pastikanBaris(kunciFile + ':' + tab, sh, r + vals.length - 1, kolom.length);
    sh.getRange(r, 1, vals.length, kolom.length).setValues(vals);
    cache().put(ck, String(r + vals.length - 1), CACHE_LAMA);
  }

  // ---------- Log per bulan (§4.3) ----------
  /** Log ditampung dulu, lalu ditulis sekaligus oleh flushLog() di akhir permintaan. */
  function tulisLog(e) {
    _logBuf.push({ Timestamp: sekarang(), Username: e.user || 'sistem', Aksi: e.aksi, Entitas: e.entitas || '', EntitasID: e.id || '',
                   Field: e.field || '', NilaiLama: e.lama || '', NilaiBaru: e.baru || '', Catatan: e.catatan || '', Hasil: e.hasil || 'BERHASIL' });
  }
  function flushLog() {
    if (!_logBuf.length) return;
    var buf = _logBuf, lock = LockService.getScriptLock(), punya = lock.hasLock();
    _logBuf = [];
    if (!punya && !lock.tryLock(30000)) { console.error('Log tidak tertulis (kunci tidak didapat): ' + JSON.stringify(buf)); return; }
    try {
      var per = {};
      buf.forEach(function (o) { var ym = o.Timestamp.slice(0, 7); (per[ym] = per[ym] || []).push(barisNilai(KOL_LOG, o)); });
      Object.keys(per).forEach(function (ym) { var k = 'LOG_' + ym.slice(0, 4); tambahKeFile(bukaFile(k, true), k, 'Log-' + ym, KOL_LOG, per[ym]); });
    } finally { if (!punya) lock.releaseLock(); }
  }
  function logBulan(ym) {
    var f = bukaFile('LOG_' + ym.slice(0, 4), false), sh = f && f.getSheetByName('Log-' + ym);
    return sh ? bacaSemua(sh).rows : [];
  }
  /** Log yang EntitasID-nya diawali prefix (mis. "K-000123") di beberapa bulan, lewat TextFinder. */
  function logEntitas(prefix, bulan) {
    var out = [];
    bulan.forEach(function (ym) {
      var f = bukaFile('LOG_' + ym.slice(0, 4), false), sh = f && f.getSheetByName('Log-' + ym);
      if (!sh || sh.getLastRow() < 2) return;
      sh.getRange(2, 5, sh.getLastRow() - 1, 1).createTextFinder(prefix).matchEntireCell(false).findAll().forEach(function (c) {
        out.push(keObjek(KOL_LOG, sh.getRange(c.getRow(), 1, 1, KOL_LOG.length).getValues()[0]));
      });
    });
    return out;
  }
  function daftarBulanLog() {
    var c = cache().get('bulanLog'); if (c) return JSON.parse(c);
    var out = [];
    semua('_Meta').forEach(function (m) {
      if (!/^FILE_LOG_\d{4}$/.test(m.Key)) return;
      try { SpreadsheetApp.openById(m.Nilai).getSheets().forEach(function (sh) { var n = sh.getName(); if (/^Log-\d{4}-\d{2}$/.test(n)) out.push(n.slice(4)); }); } catch (e) { /* file hilang */ }
    });
    out = out.sort().reverse();
    cache().put('bulanLog', JSON.stringify(out), 3600);
    return out;
  }

  // ---------- arsip tahunan (§4.3) ----------
  function kolomKid(h, tab) { return h.indexOf(BESAR[tab].kid); }
  /**
   * Pindahkan kontrak ke arsip. pindah: { KontrakID: tahunClose }. Semua tab ditulis ulang sekali per tab.
   * Mengembalikan jumlah baris yang dipindah.
   */
  function arsipPindah(pindah) {
    var ids = Object.keys(pindah); if (!ids.length) return 0;
    var n = 0;
    TAB_ARSIP.forEach(function (tab) {
      var x = bacaSemua(sheet(tab)), kc = BESAR[tab].kid, per = {}, sisa = [];
      x.rows.forEach(function (o) { var th = pindah[o[kc]]; if (th) (per[th] = per[th] || []).push(o); else sisa.push(o); });
      Object.keys(per).forEach(function (th) {
        var list = per[th].sort(function (a, b) { return a[kc] < b[kc] ? -1 : a[kc] > b[kc] ? 1 : 0; });   // baris satu kontrak berurutan
        tambahKeFile(bukaFile('ARSIP_' + th, true), 'ARSIP_' + th, tab, KOL_DATA[tab], list.map(function (o) { return barisNilai(KOL_DATA[tab], o); }));
        n += list.length;
      });
      if (Object.keys(per).length) besarGantiSemua(tab, sisa);
    });
    aturLokasi(pindah, function (th) { return 'ARSIP_' + th; });
    return n;
  }
  /** Ubah kolom Lokasi Indeks untuk kontrak di peta {KontrakID: x}; satu kali tulis kolom. */
  function aturLokasi(peta, nilai) {
    var ix = bacaSemua(sheet('Indeks')), maks = 1;
    ix.rows.forEach(function (o) { maks = Math.max(maks, o._row); });
    var col = []; for (var i = 2; i <= maks; i++) col.push(['']);
    ix.rows.forEach(function (o) { col[o._row - 2][0] = peta[o.KontrakID] !== undefined ? nilai(peta[o.KontrakID]) : o.Lokasi; });
    if (col.length) besarTulisKolom('Indeks', 'Lokasi', col);
  }
  function arsipBaris(f, tab, kid) {
    var sh = f.getSheetByName(tab);
    if (!sh || sh.getLastRow() < 2) return { sh: sh, rows: [], nomor: [] };
    var c = KOL_DATA[tab].indexOf(BESAR[tab].kid) + 1, hit = sh.getRange(2, c, sh.getLastRow() - 1, 1).createTextFinder(kid).matchEntireCell(true).findAll();
    if (!hit.length) return { sh: sh, rows: [], nomor: [] };
    var r1 = hit[0].getRow(), r2 = hit[hit.length - 1].getRow(), v = sh.getRange(r1, 1, r2 - r1 + 1, KOL_DATA[tab].length).getValues(), rows = [], nomor = [];
    v.forEach(function (row, i) { if (String(row[c - 1]) === kid) { rows.push(keObjek(KOL_DATA[tab], row)); nomor.push(r1 + i); } });
    return { sh: sh, rows: rows, nomor: nomor };
  }
  /** Ambil satu kontrak dari file arsipnya (hanya baca). */
  function arsipAmbil(kid, lokasi) {
    var f = bukaFile(lokasi, false);
    if (!f) throw galat('TIDAK_ADA', 'File arsip ' + lokasi + ' tidak ditemukan.');
    var out = {};
    TAB_ARSIP.forEach(function (tab) { out[tab] = arsipBaris(f, tab, kid).rows; });
    return out;
  }
  /** Keluarkan kontrak dari arsip ke SKM_DB (reopen). Baris di arsip dihapus, Indeks → AKTIF. */
  function arsipKeluarkan(kid, lokasi) {
    var f = bukaFile(lokasi, false);
    if (!f) throw galat('TIDAK_ADA', 'File arsip ' + lokasi + ' tidak ditemukan.');
    var out = {};
    TAB_ARSIP.forEach(function (tab) {
      var x = arsipBaris(f, tab, kid);
      out[tab] = x.rows;
      if (!x.rows.length) return;
      besarTambah(tab, x.rows);
      x.nomor.slice().reverse().forEach(function (r) { x.sh.deleteRow(r); });
      cache().remove('n:' + lokasi + ':' + tab);
    });
    if (!out.Kontrak.length) throw galat('TIDAK_ADA', 'Kontrak ' + kid + ' tidak ditemukan di ' + lokasi + '.');
    return out;
  }

  // ---------- feed perubahan & snapshot (§4.4) ----------
  function seq() { return Number(props().getProperty('FEED_SEQ') || 0); }
  /** Catat perubahan untuk browser lain. entri: {bundle} atau {muatUlang: true}. Panggil di dalam kunci. */
  function feedTambah(entri) {
    var n = seq() + 1;
    props().setProperty('FEED_SEQ', String(n));
    entri.seq = n;
    cachePut('feed:' + n, entri, CACHE_LAMA);
    if (entri.muatUlang) cache().remove('snap');
    return n;
  }
  function feedAmbil(sejak) {
    var kini = seq();
    sejak = Number(sejak) || 0;
    if (sejak >= kini) return { seq: kini, entri: [] };
    if (kini - sejak > 200) return { seq: kini, muatUlang: true };
    var out = [];
    for (var i = sejak + 1; i <= kini; i++) { var e = cacheGet('feed:' + i); if (!e) return { seq: kini, muatUlang: true }; out.push(e); }
    return { seq: kini, entri: out };
  }
  function kompak(rows, kolom) { return { c: kolom, r: rows.map(function (o) { return barisNilai(kolom, o); }) }; }
  /** Data aktif untuk browser: dari cache bila masih segar, selain itu dibaca dari sheet. */
  function snapshot() {
    var kini = seq(), c = cacheGet('snap');
    if (c && c.skema === APP.SKEMA && kini - c.seq <= 150) return c;
    var t0 = kini, data = {};
    ['Kontrak', 'BAST', 'OrderInternal', 'Kendala'].forEach(function (tab) { data[tab] = kompak(semua(tab), KOL_DATA[tab]); });
    var aktif = {}; data.Kontrak.r.forEach(function (r) { aktif[r[0]] = 1; });
    data.KontrakAlias = kompak(semua('KontrakAlias').filter(function (a) { return aktif[a.KontrakID]; }), SKEMA_TAB.KontrakAlias);
    var snap = { seq: t0, skema: APP.SKEMA, dibuat: sekarang(), tabs: data };
    cachePut('snap', snap, 3600);
    return snap;
  }

  // ---------- kunci ----------
  function kunci(fn, tunggu) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(tunggu || 20000)) throw galat('SIBUK', 'Server sedang sibuk. Coba lagi beberapa detik lagi.');
    _memo = {}; _idx = {};   // baca ulang dari cache yang sudah diperbarui permintaan lain sebelum kita mendapat kunci
    try { return fn(); }
    finally { try { flushLog(); } finally { lock.releaseLock(); } }   // log ikut ditulis selagi kunci masih dipegang
  }
  function nomorBaru(jenis) {
    var k = 'SEQ_' + jenis, n = Number(props().getProperty(k) || 0) + 1;
    props().setProperty(k, String(n));
    return n;
  }

  // ---------- config & meta ----------
  function config(key, bawaan) {
    if (!siap()) return bawaan;
    var r = cari('Config', key);
    return r && r.Nilai !== '' ? r.Nilai : bawaan;
  }
  function semuaConfig() { var o = {}; if (siap()) semua('Config').forEach(function (r) { o[r.Key] = r.Nilai; }); return o; }
  function meta(key) { var r = cari('_Meta', key); return r ? r.Nilai : ''; }
  function setMeta(key, nilai) { if (cari('_Meta', key)) ubah('_Meta', key, { Nilai: nilai }); else tambah('_Meta', { Key: key, Nilai: nilai }); }

  // ---------- migrasi ----------
  function kondisiSaatIni() { var k = {}; ss().getSheets().forEach(function (sh) { k[sh.getName()] = headerSheet(sh); }); return k; }

  /** Menjalankan migrasi sampai APP.SKEMA. Mengembalikan daftar teks langkah (untuk log/console). */
  function migrasi(oleh) {
    var catatan = [];
    var langkah = Domain.rencanaMigrasi(SKEMA_TAB, kondisiSaatIni());
    var bawaanAwal = ss().getSheets().filter(function (sh) { return !SKEMA_TAB[sh.getName()] && sh.getLastRow() === 0; });
    langkah.forEach(function (l) {
      if (l.op === 'buatTab') {
        var sh = ss().insertSheet(l.tab);
        if (sh.getMaxColumns() < l.kolom.length) sh.insertColumnsAfter(sh.getMaxColumns(), l.kolom.length - sh.getMaxColumns());
        sh.getRange(1, 1, sh.getMaxRows(), l.kolom.length).setNumberFormat('@');
        sh.getRange(1, 1, 1, l.kolom.length).setValues([l.kolom]);
        sh.setFrozenRows(1);
        catatan.push('Tab ' + l.tab + ' dibuat (' + l.kolom.length + ' kolom)');
      } else {
        var s2 = sheet(l.tab), lc = s2.getLastColumn();
        if (lc + l.kolom.length > s2.getMaxColumns()) s2.insertColumnsAfter(s2.getMaxColumns(), lc + l.kolom.length - s2.getMaxColumns());
        s2.getRange(1, lc + 1, s2.getMaxRows(), l.kolom.length).setNumberFormat('@');
        s2.getRange(1, lc + 1, 1, l.kolom.length).setValues([l.kolom]);
        catatan.push('Tab ' + l.tab + ': kolom ditambah ' + l.kolom.join(', '));
      }
      _memo = {}; _hdr = {}; _max = {}; _idx = {};
    });
    bawaanAwal.forEach(function (sh) { if (ss().getSheets().length > 1) ss().deleteSheet(sh); });
    Object.keys(SKEMA_TAB).forEach(function (t) { lupakan(t); });

    // isi awal hanya bila kosong
    if (!semua('Ref_Role').length) {
      Object.keys(ROLE_AWAL).forEach(function (r) { tambah('Ref_Role', { Role: r, Izin: ROLE_AWAL[r].join(','), UpdatedBy: oleh }); });
      catatan.push('Isi awal Ref_Role: ' + Object.keys(ROLE_AWAL).map(function (r) { return r + ' (' + ROLE_AWAL[r].length + ' izin)'; }).join(', '));
    } else if (!meta('IZIN_IMPORT_F3')) {
      // F3: Upload Excel & import pindah ke izin kontrak.import, diberikan ke role admin (yang punya user.kelola) saja.
      semua('Ref_Role').forEach(function (r) {
        var iz = Domain.parseIzin(r.Izin);
        if (iz.indexOf('user.kelola') >= 0 && iz.indexOf('kontrak.import') < 0) { iz.push('kontrak.import'); ubah('Ref_Role', r.Role, { Izin: iz.join(',') }, oleh); catatan.push('Role ' + r.Role + ': izin kontrak.import ditambahkan'); }
      });
    }
    if (!meta('IZIN_IMPORT_F3')) setMeta('IZIN_IMPORT_F3', sekarang());
    Object.keys(REF_AWAL).forEach(function (tab) {
      if (semua(tab).length) return;
      gantiSemua(tab, REF_AWAL[tab].map(function (o) { var x = {}; for (var k in o) x[k] = o[k]; x.UpdatedBy = oleh; return x; }));
      catatan.push('Isi awal ' + tab + ' (' + REF_AWAL[tab].length + ')');
    });
    var adaConfig = semua('Config').map(function (r) { return r.Key; }), cfgBaru = [];
    CONFIG_AWAL.forEach(function (c) {
      if (adaConfig.indexOf(c[0]) < 0) { tambah('Config', { Key: c[0], Nilai: c[1], Keterangan: c[2], UpdatedBy: oleh }); cfgBaru.push(c[0] + '=' + c[1]); }
    });
    if (cfgBaru.length) catatan.push('Isi awal Config: ' + cfgBaru.join(', '));

    // F1 menyimpan Log di SKM_DB; sejak F2 Log per bulan di SKM_LOG_<tahun>. Salin sekali; tab lama dibiarkan sebagai cadangan.
    var lama = ss().getSheetByName('Log');
    if (lama && !meta('LOG_F1_DISALIN')) {
      var rows = bacaSemua(lama).rows, per = {};
      rows.forEach(function (o) { var ym = String(o.Timestamp).slice(0, 7); if (/^\d{4}-\d{2}$/.test(ym)) (per[ym] = per[ym] || []).push(barisNilai(KOL_LOG, o)); });
      Object.keys(per).sort().forEach(function (ym) { var k = 'LOG_' + ym.slice(0, 4); tambahKeFile(bukaFile(k, true), k, 'Log-' + ym, KOL_LOG, per[ym]); });
      setMeta('LOG_F1_DISALIN', sekarang() + ' (' + rows.length + ' baris)');
      catatan.push('Log F1 disalin ke file Log per bulan (' + rows.length + ' baris); tab Log lama di SKM_DB dibiarkan sebagai cadangan');
    }

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
    cache().remove('snap');
    return catatan;
  }

  /** Dipanggil setiap aplikasi dibuka: migrasi hanya berjalan bila versi skema kode lebih baru. Murah: cek properti saja. */
  function pastikanMigrasi() {
    if (!siap()) return false;
    if (Domain.num(props().getProperty('SKEMA_TERPASANG'), 0) >= APP.SKEMA) return false;
    kunci(function () { if (Domain.num(props().getProperty('SKEMA_TERPASANG'), 0) < APP.SKEMA) migrasi('otomatis'); }, 60000);
    return true;
  }

  function buatDatabase() {
    var f = SpreadsheetApp.create(APP.NAMA_DB);
    props().setProperty('DB_ID', f.getId());
    _ss = f; _memo = {}; _hdr = {}; _max = {}; _idx = {}; _file = {};
    return f;
  }

  function aksesFile(f) {
    var editors = [], viewers = [];
    try { editors = f.getEditors().map(function (u) { return u.getEmail(); }); viewers = f.getViewers().map(function (u) { return u.getEmail(); }); } catch (e) { /* tanpa izin: abaikan */ }
    var akses = [];   // gabungan unik: pemilik bisa muncul di daftar editor dan viewer sekaligus
    editors.concat(viewers).forEach(function (e) { e = String(e || '').toLowerCase(); if (e && akses.indexOf(e) < 0) akses.push(e); });
    return { editors: editors, viewers: viewers, akses: akses };
  }
  /** Info file database. ringan=true (halaman Sistem): jumlah baris di-cache 10 menit, akses file arsip/log tidak dibuka. */
  function infoDatabase(ringan) {
    var f = ss(), tabs = ringan ? JSON.parse(cache().get('infoTabs') || 'null') : null;
    if (!tabs) { tabs = f.getSheets().map(function (sh) { return { tab: sh.getName(), baris: Math.max(sh.getLastRow() - 1, 0) }; }); cache().put('infoTabs', JSON.stringify(tabs), 600); }
    var a = aksesFile(f), files = [];
    semua('_Meta').forEach(function (m) {
      if (!/^FILE_/.test(m.Key)) return;
      var info = { kunci: m.Key.slice(5), nama: 'SKM_' + m.Key.slice(5), akses: [] };
      if (!ringan) { try { var g = SpreadsheetApp.openById(m.Nilai); info.nama = g.getName(); info.akses = aksesFile(g).akses; } catch (e) { info.hilang = true; } }
      files.push(info);
    });
    return { nama: f.getName(), tabs: tabs, editors: a.editors, viewers: a.viewers, akses: a.akses, files: files };
  }

  return {
    SKEMA_TAB: SKEMA_TAB, KOL_DATA: KOL_DATA, KOL_LOG: KOL_LOG, BESAR: BESAR, galat: galat, sekarang: sekarang, siap: siap,
    semua: semua, cari: cari, tambah: tambah, ubah: ubah, hapus: hapus, gantiSemua: gantiSemua, header: header,
    besarBaca: besarBaca, besarSheet: besarSheet, besarBarisKe: besarBarisKe, besarCari: besarCari, besarTulis: besarTulis, besarTambah: besarTambah, besarGantiSemua: besarGantiSemua, besarTulisKolom: besarTulisKolom, lupakan: lupakan,
    tulisLog: tulisLog, flushLog: flushLog, logBulan: logBulan, logEntitas: logEntitas, daftarBulanLog: daftarBulanLog,
    arsipPindah: arsipPindah, aturLokasi: aturLokasi, arsipAmbil: arsipAmbil, arsipKeluarkan: arsipKeluarkan, idFile: idFile,
    seq: seq, feedTambah: feedTambah, feedAmbil: feedAmbil, snapshot: snapshot, cacheGet: cacheGet, cachePut: cachePut,
    kunci: kunci, nomorBaru: nomorBaru, config: config, semuaConfig: semuaConfig, meta: meta, setMeta: setMeta,
    migrasi: migrasi, pastikanMigrasi: pastikanMigrasi, buatDatabase: buatDatabase, infoDatabase: infoDatabase,
    _reset: function () { _ss = null; _memo = {}; _hdr = {}; _max = {}; _logBuf = []; _file = {}; _idx = {}; }
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
      username: u.Username, nama: u.Nama, alias: u.AliasPIC, role: u.Role, izinTambahan: Domain.parseIzin(u.IzinTambahan),
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
  try { Repo.flushLog(); } catch (e) { console.error('Log gagal: ' + e.message); }
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
    var u = userSesi_(token);
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
    var data = A.ubah ? Repo.kunci(function () {
      var d = A.fn(ctx);
      var saya = Repo.cari('Users', u.Username);
      if (saya && !Domain.bool(saya.PunyaAktivitas)) Repo.ubah('Users', u.Username, { PunyaAktivitas: 'TRUE' });
      return d;
    }) : A.fn(ctx);
    return { ok: true, data: data };
  } catch (e) {
    if (!e.kode && /required permissions|do not have permission|tidak memiliki izin/i.test(String(e.message))) {
      e = Repo.galat('IZIN_GOOGLE', 'Izin Google untuk aplikasi belum lengkap. Admin: di editor Apps Script jalankan fungsi mintaIzin, centang semua izin (Select all), lalu muat ulang halaman.');
    }
    if (!e.kode) console.error(aksi + ': ' + (e.stack || e.message));
    return { ok: false, kode: e.kode || 'ERROR', pesan: e.kode ? e.message : 'Terjadi kesalahan di server: ' + e.message };
  } finally {
    try { Repo.flushLog(); } catch (e2) { console.error('Log gagal ditulis: ' + e2.message); }
  }
}

/** User pemilik token yang masih sah; selain itu SESI_HABIS. */
function userSesi_(token) {
  var sesi = Auth.ambilSesi(token);
  var u = Repo.cari('Users', sesi.u);
  if (!u || !Domain.bool(u.Aktif) || Domain.num(u.SesiVersi, 0) !== sesi.v) {
    Auth.hapusSesi(token);
    throw Repo.galat('SESI_HABIS', 'Sesi Anda berakhir. Silakan masuk lagi.');
  }
  return u;
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
/** Data terbaru setelah perubahan, supaya layar tidak perlu memanggil server lagi. */
function petaKini_() { return Domain.petaRole(Repo.semua('Ref_Role')); }
function daftarRole_(peta) {
  var users = Repo.semua('Users');
  return Object.keys(peta).map(function (r) {
    return { role: r, izin: peta[r], jumlahUser: users.filter(function (u) { return u.Role === r && Domain.bool(u.Aktif); }).length };
  });
}
function daftarUser_(peta) {
  return { users: Repo.semua('Users').map(function (u) { return Auth.profil(u); }), roles: daftarRole_(peta), katalog: IZIN, izinTambahan: IZIN_TAMBAHAN };
}
function profilKini_(ctx, peta) { var u = Repo.cari('Users', ctx.user.Username); return u ? Auth.profil(u, peta) : null; }
function setelahUbahUser_(ctx, hasil) {
  var peta = petaKini_();
  hasil.daftar = daftarUser_(peta); hasil.me = profilKini_(ctx, peta);
  return hasil;
}
function jam_(ms) { return Utilities.formatDate(new Date(Number(ms)), APP.TZ, 'HH:mm'); }

// ---------------------------------------------------------------- aksi
var AKSI = {

  status: { publik: true, fn: function () { return { siap: Repo.siap(), app: infoApp_() }; } },

  /** Satu panggilan saat halaman dibuka: status aplikasi + profil (bila token masih sah) + katalog izin. */
  boot: { publik: true, fn: function (ctx) {
    var hasil = { siap: Repo.siap(), app: infoApp_(), user: null, katalog: IZIN };
    if (!hasil.siap || !ctx.token) return hasil;
    try { hasil.user = Auth.profil(userSesi_(ctx.token), petaKini_()); } catch (e) { if (e.kode !== 'SESI_HABIS') throw e; }
    // sekalian data aktif (F2), supaya membuka halaman cukup satu panggilan
    if (hasil.user && ctx.payload && ctx.payload.data && !hasil.user.wajibGanti && hasil.user.izin.indexOf('kontrak.lihat') >= 0) {
      hasil.data = muatDataKlien_();
      // ringkasan "update 7 hari" (F3) hanya bila sudah ada di cache; bila belum, browser memintanya di latar
      var d7 = hasil.user.izin.indexOf('dashboard.lihat') >= 0 && CacheService.getScriptCache().get('dash7');
      if (d7) hasil.dash7 = JSON.parse(d7);
    }
    return hasil;
  } },

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
      return { token: Auth.buatSesi(u2), user: Auth.profil(u2, peta), app: infoApp_(), katalog: IZIN };
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
    return daftarUser_(ctx.peta);
  } },

  'users.simpan': { izin: 'user.kelola', ubah: true, fn: function (ctx) {
    var p = ctx.payload, oleh = ctx.user.Username, peta = ctx.peta;
    wajib_(peta[p.role], 'Role "' + p.role + '" tidak dikenal.');
    var nama = String(p.nama || '').trim(), alias = String(p.alias || '').trim();
    var ekstra = p.izinTambahan === undefined ? null : [].concat(p.izinTambahan || []).map(String);
    if (ekstra) {
      ekstra.forEach(function (i) { wajib_(IZIN_TAMBAHAN.indexOf(i) >= 0, 'Izin "' + i + '" tidak bisa diberikan per user.'); });
      ekstra = ekstra.filter(function (i, n) { return ekstra.indexOf(i) === n && (peta[p.role] || []).indexOf(i) < 0; });   // yang sudah ada di role tidak disimpan
    }
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
        SesiVersi: '0', IzinTambahan: (ekstra || []).join(','), CreatedBy: oleh, UpdatedBy: oleh });
      catat_(ctx, 'BUAT_USER', 'Users', uname, 'role ' + p.role + (alias ? ', alias ' + alias : '') + ((ekstra || []).length ? ', izin tambahan ' + ekstra.join(',') : '') + ' · ' + catatPw);
      return setelahUbahUser_(ctx, { username: uname, passwordAcak: mode === 'acak' ? pw : '' });
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
    if (ekstra) {
      var ekLama = Domain.parseIzin(u.IzinTambahan).join(','), ekBaru = ekstra.join(',');
      if (ekLama !== ekBaru) { patch.IzinTambahan = ekBaru; ubah.push('izin tambahan ' + (ekLama || '—') + ' → ' + (ekBaru || '—')); }
    }
    if (pw) { salt = Auth.saltBaru(); patch.PasswordHash = Auth.hash(pw, salt); patch.Salt = salt; patch.WajibGantiPassword = 'TRUE'; patch.GagalLogin = '0'; patch.TerkunciSampai = ''; }
    if (pw || !aktif || p.role !== u.Role) patch.SesiVersi = String(Domain.num(u.SesiVersi, 0) + 1);   // akhiri sesi aktif
    Repo.ubah('Users', u.Username, patch, oleh, p.version);
    if (ubah.length) catat_(ctx, 'UBAH_USER', 'Users', u.Username, ubah.join(', '));
    if (pw) catat_(ctx, 'RESET_PASSWORD', 'Users', u.Username, catatPw + ' · sesi diakhiri');
    return setelahUbahUser_(ctx, { username: u.Username, passwordAcak: mode === 'acak' ? pw : '' });
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
    return setelahUbahUser_(ctx, {});
  } },

  'users.bukaKunci': { izin: 'user.kelola', ubah: true, fn: function (ctx) {
    var u = Repo.cari('Users', Domain.normUsername(ctx.payload.username));
    wajib_(u, 'User tidak ditemukan.', 'TIDAK_ADA');
    Repo.ubah('Users', u.Username, { GagalLogin: '0', TerkunciSampai: '' }, ctx.user.Username);
    catat_(ctx, 'BUKA_KUNCI', 'Users', u.Username, '');
    return setelahUbahUser_(ctx, {});
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
    return setelahUbahUser_(ctx, {});
  } },

  // ---------------- role & izin ----------------
  'roles.list': { izin: 'user.kelola', fn: function (ctx) {
    return { katalog: IZIN, roles: daftarRole_(ctx.peta) };
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
    var peta = petaKini_();
    return { diubah: n, daftar: { katalog: IZIN, roles: daftarRole_(peta) }, me: profilKini_(ctx, peta) };
  } },

  'roles.buat': { izin: 'user.kelola', ubah: true, fn: function (ctx) {
    var nama = String(ctx.payload.nama || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'), dari = ctx.payload.salinDari;
    wajib_(/^[A-Z][A-Z0-9_]{1,31}$/.test(nama), 'Nama role 2–32 karakter: huruf kapital, angka, garis bawah; diawali huruf.');
    wajib_(!ctx.peta[nama], 'Role ' + nama + ' sudah ada.');
    var izin = dari && ctx.peta[dari] ? ctx.peta[dari] : [];
    Repo.tambah('Ref_Role', { Role: nama, Izin: izin.join(','), UpdatedBy: ctx.user.Username });
    catat_(ctx, 'BUAT_ROLE', 'Ref_Role', nama, dari ? 'disalin dari ' + dari : 'tanpa izin');
    return { role: nama, daftar: { katalog: IZIN, roles: daftarRole_(petaKini_()) } };
  } },

  // ---------------- log ----------------
  'log.list': { fn: function (ctx) {
    var semuaLog = ctx.izin.indexOf('log.semua') >= 0, f = ctx.payload || {}, me = ctx.user.Username;
    var bulanIni = Repo.sekarang().slice(0, 7), daftar = Repo.daftarBulanLog();
    if (daftar.indexOf(bulanIni) < 0) daftar.unshift(bulanIni);
    var bulan = /^\d{4}-\d{2}$/.test(f.bulan || '') ? f.bulan : '', rows;
    if (bulan) rows = Repo.logBulan(bulan);
    else {   // 30 hari terakhir: bulan ini + bulan lalu
      var d = new Date(), lalu = Utilities.formatDate(new Date(d.getFullYear(), d.getMonth() - 1, 1), APP.TZ, 'yyyy-MM');
      var batas = Utilities.formatDate(new Date(d.getTime() - 30 * 864e5), APP.TZ, 'yyyy-MM-dd');
      rows = Repo.logBulan(lalu).concat(Repo.logBulan(bulanIni)).filter(function (l) { return String(l.Timestamp) >= batas; });
    }
    rows = rows.slice().reverse().filter(function (l) { return semuaLog || l.Username === me; });
    var uniq = function (k) { var s = {}; rows.forEach(function (l) { s[l[k]] = 1; }); return Object.keys(s).sort(); };
    var users = uniq('Username'), aksi = uniq('Aksi'), q = String(f.q || '').toLowerCase();
    rows = rows.filter(function (l) {
      return (!f.user || l.Username === f.user) && (!f.aksi || l.Aksi === f.aksi) && (!f.hasil || l.Hasil === f.hasil) &&
             (!q || [l.EntitasID, l.Catatan, l.NilaiLama, l.NilaiBaru, l.Field].join(' ').toLowerCase().indexOf(q) >= 0);
    });
    var total = rows.length;
    return { semua: semuaLog, total: total, users: users, aksi: aksi, bulan: bulan, daftarBulan: daftar,
      entri: rows.slice(0, Math.min(Domain.num(f.limit, 300), 1000)).map(function (l) {
        return { waktu: l.Timestamp, user: l.Username, aksi: l.Aksi, entitas: l.Entitas, id: l.EntitasID, field: l.Field,
                 lama: l.NilaiLama, baru: l.NilaiBaru, catatan: l.Catatan, hasil: l.Hasil || 'BERHASIL' };
      }) };
  } },

  // ---------------- sistem ----------------
  'sistem.info': { izin: 'user.kelola', fn: function () {
    var riwayat = []; try { riwayat = JSON.parse(Repo.meta('RIWAYAT_MIGRASI') || '[]'); } catch (e) { riwayat = []; }
    var akun = ''; try { akun = Session.getEffectiveUser().getEmail(); } catch (e) { akun = ''; }
    var pemicu = false; try { pemicu = pemicuArsip_().length > 0; } catch (e) { pemicu = null; }
    return { app: infoApp_(), skemaDb: Repo.meta('SKEMA_VERSI'), dibuat: Repo.meta('DB_DIBUAT'), riwayat: riwayat, db: Repo.infoDatabase(true),
             akunFF: akun, config: Repo.semua('Config').map(function (c) { return { key: c.Key, nilai: c.Nilai, ket: c.Keterangan }; }),
             arsip: { pemicu: pemicu, terakhir: Repo.meta('ARSIP_TERAKHIR'), setelahHari: Repo.config('ARSIP_SETELAH_HARI', '90') }, seq: Repo.seq() };
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
    var bocor = info.files.filter(function (f) { return f.akses.length > 2; }), hilang = info.files.filter(function (f) { return f.hilang; });
    if (info.files.length) cek('File arsip & log tidak dibagikan dan bisa dibuka', !bocor.length && !hilang.length,
      bocor.map(function (f) { return f.nama + ': ' + f.akses.length + ' akun'; }).concat(hilang.map(function (f) { return f.nama + ' tidak bisa dibuka'; })).join('; ') || info.files.length + ' file');
    var ref = KD.siapkanRef(refRaw_()), penutup = ref.tahap.filter(function (t) { return t.Aktif && t.Penutup; }).length;
    cek('Tepat satu tahap penutup aktif', penutup === 1, penutup + ' tahap penutup aktif');
    var celah = KD.celahAturan(ref);
    cek('Semua tahap & kendala aktif tercakup aturan Nilai Push', !celah.length, celah.join(', '));
    var pemicu = null; try { pemicu = pemicuArsip_().length > 0; } catch (e) { pemicu = null; }
    cek('Pemicu pindah arsip bulanan terpasang', pemicu === true, pemicu === null ? 'Izin Google untuk pemicu belum diberikan: jalankan mintaIzin di editor' : pemicu ? 'tanggal 1 tiap bulan ±01.00' : 'Belum terpasang: klik "Pasang pemicu arsip" di halaman Sistem');
    catat_(ctx, 'CEK_SISTEM', '_Meta', '—', hasil.filter(function (h) { return h.ok; }).length + '/' + hasil.length + ' OK');
    return { hasil: hasil };
  } },

  'config.simpan': { izin: 'pengaturan.kelola', ubah: true, fn: function (ctx) {
    var key = String(ctx.payload.key || ''), nilai = String(ctx.payload.nilai == null ? '' : ctx.payload.nilai).trim();
    var BATAS = { SESI_JAM: [1, 6], LOGIN_GAGAL_MAKS: [3, 20], KUNCI_MENIT: [1, 1440], PASSWORD_MIN: [6, 64], KENDALA_BATAS_HARI: [1, 365],
                  ARSIP_SETELAH_HARI: [30, 3650], SINKRON_KLIEN_DETIK: [15, 300] };
    wajib_(CONFIG_AWAL.some(function (c) { return c[0] === key; }), 'Key config tidak dikenal.');
    var ref = KD.siapkanRef(refRaw_());
    if (key === 'TAHAP_REOPEN') {
      var t = ref.T[nilai]; wajib_(t && t.Aktif && !t.Penutup, 'TAHAP_REOPEN harus kode tahap aktif yang bukan penutup (mis. DRAFTING).');
    } else if (key === 'AGING_BATAS') {
      var a = nilai.split(',').map(function (x) { return x.trim(); });
      wajib_(a.length === 3 && a.every(function (x) { return /^\d+$/.test(x); }) && +a[0] < +a[1] && +a[1] < +a[2], 'AGING_BATAS berisi 3 angka naik, mis. 7,14,30.');
      nilai = a.join(',');
    } else if (key === 'FIELD_WAJIB') {
      var boleh = ['Customer', 'EndCustomer', 'NilaiKontrak', 'Segment', 'Populasi', 'OrderInternal', 'JumlahLokasi', 'PIC', 'TahunProject', 'JenisDok'];
      var f = nilai.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      f.forEach(function (x) { wajib_(boleh.indexOf(x) >= 0, 'Field "' + x + '" tidak dikenal. Pilihan: ' + boleh.join(', ')); });
      nilai = f.join(',');
    } else if (/^DOKTAGIH_DEFAULT_/.test(key)) {
      wajib_(ref.dokTagih.some(function (d) { return d.Aktif && d.Kode === nilai; }), key + ' harus salah satu dokumen tagih aktif (BAST/BAA).');
    } else if (BATAS[key]) {
      var n = Number(nilai);
      wajib_(/^\d+$/.test(nilai) && n >= BATAS[key][0] && n <= BATAS[key][1], key + ' harus angka ' + BATAS[key][0] + '–' + BATAS[key][1] + '.');
    } else wajib_(nilai && nilai.length <= 60, key + ' wajib diisi (maks. 60 karakter).');
    var lama = Repo.cari('Config', key);
    if (lama.Nilai === nilai) return { berubah: false, app: infoApp_() };
    Repo.ubah('Config', key, { Nilai: nilai }, ctx.user.Username);
    catat_(ctx, 'UBAH_CONFIG', 'Config', key, '', '', 'Nilai', lama.Nilai, nilai);
    if (['SESI_JAM', 'LOGIN_GAGAL_MAKS', 'KUNCI_MENIT', 'PASSWORD_MIN', 'APP_NAMA'].indexOf(key) < 0) Repo.feedTambah({ muatRef: true });
    return { berubah: true, app: infoApp_() };
  } }
};

// ===== 41_Kontrak.js =====
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
  ['No. SO', 0, 26, 'Nomor SO. Lebih dari satu: pisahkan dengan koma, mis. SO-2026-001, SO-2026-002.'],
  ['No. MI', 0, 22, 'Nomor MI. Lebih dari satu: pisahkan dengan koma.'],
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
  var kon = f.insertSheet('Kontrak'), rf = f.insertSheet('Referensi');
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
  tabel(kon, KOLOM_TEMPLATE_);
  var langkah = [['Template upload kontrak — Status Kontrak Manager', ''], ['Versi', 'SKM-UPLOAD-1 · diunduh ' + Repo.sekarang().slice(0, 10) + ' · jangan ubah judul kolom (baris 1)'], ['', ''],
    ['1. Isi tab Kontrak', 'Satu baris = satu kontrak. Kolom merah (*) wajib: No. Kontrak dan Judul Kontrak.'],
    ['3. Upload di SKM', 'Menu Kontrak → Upload Excel. SKM memeriksa setiap baris SEBELUM ada data yang disimpan.'],
    ['SO / MI', 'Tulis di kolom No. SO dan No. MI pada baris kontraknya. Satu kontrak banyak SO/MI: pisahkan dengan koma. Detail layanan per SO/MI bisa dilengkapi di SKM.'],
    ['4. Periksa pratinjau', 'Baris Error tidak disimpan. Baris Peringatan tetap disimpan (mis. Customer kosong → BELUM TERDEFINISI).'],
    ['5. Simpan', 'Kontrak dibuat dengan BAST-1 otomatis dan tercatat di Log atas nama Anda.'], ['', ''],
    ['Nomor sudah ada', 'Default dilewati. Pilihan "Perbarui": hanya kolom yang DIISI yang menimpa data SKM.'],
    ['Nomor lama', 'Nomor lama yang sudah dikoreksi dikenali sebagai kontrak yang sudah ada.'],
    ['Penulisan nomor', 'Beda spasi, huruf besar/kecil, jenis tanda strip, atau titik di akhir dianggap nomor yang sama.'],
    ['Batas', 'Maksimal 1.000 kontrak per file.'],
    ['Template lama', 'Dropdown template mengikuti Pengaturan SKM saat diunduh. Bila sejak itu ada tahap/kendala/referensi yang diganti atau dinonaktifkan, baris yang memakai nilai lama ditandai di pratinjau (tidak membuat error sistem). Unduh template baru bila ragu.']];
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

AKSI['upload.template'] = { izin: 'kontrak.import', fn: function () {
  return { nama: 'Template_Upload_Kontrak_SKM.xlsx', base64: xlsxDari_('template', isiTemplate_) };
} };
AKSI['upload.laporan'] = { izin: 'kontrak.import', fn: function (ctx) {
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
AKSI['upload.cekNomor'] = { izin: 'kontrak.import', fn: function (ctx) {
  var m = petaNomor_(), out = {};
  (ctx.payload.nomor || []).forEach(function (nk) { if (m[nk]) out[nk] = m[nk]; });
  return { ada: out };
} };

/** Upload & import: izin kontrak.import sudah mencakup membuat kontrak. */
function ctxImport_(ctx) { var c = ctxKD_(ctx); if (c.izin.indexOf('kontrak.daftar') < 0) c.izin = c.izin.concat(['kontrak.daftar']); return c; }

AKSI['upload.simpan'] = { izin: 'kontrak.import', ubah: true, fn: function (ctx) {
  var p = ctx.payload, mode = p.mode === 'perbarui' ? 'perbarui' : 'lewati', file = String(p.file || 'file'), c = ctxImport_(ctx);
  if ((p.rows || []).length > 300) throw Repo.galat('VALIDASI', 'Maksimal 300 baris per bagian.');
  var peta = petaNomor_(), picAktif = daftarUserPic_().filter(function (u) { return u.aktif && u.alias; }).map(function (u) { return u.alias; });
  var hasil = KD.periksaUpload(p.rows || [], { ref: c.ref, cfg: c.cfg, pic: picAktif, bolehPic: ctx.izin.indexOf('pic.atur') >= 0, alias: c.alias, hariIni: hariIni_(),
    cariNomor: function (nk) { return peta[nk] || null; } });
  var so = KD.periksaSO(p.so || [], hasil, function (nk) { return peta[nk] || null; });
  var out = { dibuat: [], diperbarui: [], dilewati: 0, gagal: [], so: 0 }, tambah = { Kontrak: [], BAST: [], OrderInternal: [], Kendala: [], RiwayatTahap: [], Indeks: [] }, bundles = [];
  var semuaB = null;
  hasil.forEach(function (o) {
    if (o.st === 'error') { out.gagal.push({ baris: o.baris, no: o.no, err: o.err }); return; }
    var orders = (o.orders || []).concat(so.filter(function (x) { return x.st === 'ok' && x.kontrak && KD.normKey(x.kontrak.no) === KD.normKey(o.no); })
      .map(function (x) { return { JenisOrder: x.j, NoOrder: x.ono, JenisLayanan: x.lay, JenisPekerjaan: x.pek, JumlahLokasi: x.lok, Keterangan: x.ket }; }));
    var dlm = {}; orders = orders.filter(function (x) { var k = KD.normKey(x.NoOrder); if (dlm[k]) return false; dlm[k] = 1; return true; });
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

// ---------------- import sheet FF format lama (§11.1, F3)
AKSI['import.simpan'] = { izin: 'kontrak.import', ubah: true, fn: function (ctx) {
  var p = ctx.payload, file = String(p.file || 'file'), rows = p.rows || [];
  if (rows.length > 300) throw Repo.galat('VALIDASI', 'Maksimal 300 baris per bagian.');
  wajib_(p.map && p.map.no >= 0, 'Kolom No. kontrak belum dipetakan.');
  // referensi baru yang dicentang: tambahkan sekali (bagian berikutnya melihatnya sudah ada)
  var refBaru = p.refBaru || {}, ditambah = [], TAB = { Populasi: 'Ref_Populasi', Segment: 'Ref_Segment' };
  Object.keys(refBaru).forEach(function (k) {
    if (!refBaru[k]) return;
    var tab = TAB[k.split(':')[0]], val = String(k.slice(k.indexOf(':') + 1)).trim();
    if (!tab || !val || val.length > 40) return;
    var ada = Repo.semua(tab), sama = ada.some(function (r) { return String(r.Kode).toLowerCase() === val.toLowerCase() || String(r.Label).toLowerCase() === val.toLowerCase(); });
    if (sama) return;
    var urut = ada.reduce(function (m, r) { return Math.max(m, Domain.num(r.Urutan, 0)); }, 0) + 1;
    Repo.tambah(tab, { Kode: val, Label: val, Aktif: 'TRUE', Urutan: String(urut), UpdatedBy: ctx.user.Username });
    ditambah.push(k);
  });
  if (ditambah.length) catat_(ctx, 'UBAH_PENGATURAN', 'Referensi', '—', 'tambah dari import data lama: ' + ditambah.join(', '));
  var c = ctxImport_(ctx), peta = petaNomor_();
  var aliasAktif = {}; daftarUserPic_().forEach(function (u) { if (u.aktif && u.alias) aliasAktif[u.alias] = 1; });
  var petaPic = {}; Object.keys(p.pic || {}).forEach(function (k) { if (aliasAktif[p.pic[k]]) petaPic[k] = p.pic[k]; });
  var hasil = KD.periksaImport(rows, { map: p.map, nilai: p.nilai || {}, pic: petaPic, refBaru: refBaru, ref: c.ref, cfg: c.cfg,
    bolehPic: ctx.izin.indexOf('pic.atur') >= 0, alias: ctx.user.AliasPIC || '', cariNomor: function (nk) { return peta[nk] || null; } });
  var out = { dibuat: [], dilewati: 0, gagal: [], refBaru: ditambah }, tambah = { Kontrak: [], BAST: [], OrderInternal: [], Kendala: [], RiwayatTahap: [], Indeks: [] }, bundles = [];
  hasil.forEach(function (x) {
    if (x.st === 'error') { out.gagal.push({ baris: x.baris, no: x.no, err: x.err }); return; }
    if (x.st === 'ada') { out.dilewati++; return; }
    try {
      var r = KD.jalankan('kontrak.buat', null, KD.dataImport(x, file), c), b = r.bundle;
      tambah.Kontrak.push(b.k); tambah.BAST = tambah.BAST.concat(b.bast); tambah.Kendala = tambah.Kendala.concat(b.kend);
      tambah.RiwayatTahap = tambah.RiwayatTahap.concat(r.riwayat); tambah.Indeks.push(barisIndeks_(b.k));
      peta[b.k.NoKontrakNorm] = { KontrakID: b.k.KontrakID, NoKontrak: b.k.NoKontrak, lokasi: 'AKTIF' };
      r.log.forEach(function (l) { Repo.tulisLog({ user: ctx.user.Username, aksi: l.aksi, entitas: l.entitas, id: l.id, field: l.field, lama: l.lama, baru: l.baru, catatan: l.catatan }); });
      bundles.push(b); out.dibuat.push({ baris: x.baris, KontrakID: b.k.KontrakID, no: b.k.NoKontrak, status: b.k.StatusKontrak });
    } catch (e) { out.gagal.push({ baris: x.baris, no: x.no, err: [e.message] }); }
  });
  Object.keys(tambah).forEach(function (tab) { if (tambah[tab].length) Repo.besarTambah(tab, tambah[tab]); });
  catat_(ctx, 'IMPORT_DATA_LAMA', 'Kontrak', file, out.dibuat.length + ' diimport (perlu verifikasi), ' + out.dilewati + ' dilewati, ' + out.gagal.length + ' error' + (p.bagian ? ' (bagian ' + p.bagian + ')' : ''));
  if (ditambah.length) Repo.feedTambah({ muatRef: true });
  out.seq = bundles.length ? Repo.feedTambah({ bundles: bundles }) : Repo.seq();
  out.bundles = bundles;
  if (ditambah.length) out.ref = refRaw_();
  return out;
} };

// ---------------- dashboard: jumlah update 7 hari per user dari Log, diringkas sekali per jam (§10)
var AKSI_UPDATE_ = { Kontrak: 1, BAST: 1, Kendala: 1, OrderInternal: 1 };
function ringkasUpdate_() {
  var hari = [], now = new Date();
  for (var i = 6; i >= 0; i--) hari.push(Utilities.formatDate(new Date(now.getTime() - i * 864e5), APP.TZ, 'yyyy-MM-dd'));
  var bulan = {}; hari.forEach(function (h) { bulan[h.slice(0, 7)] = 1; });
  var alias = {}; Repo.semua('Users').forEach(function (u) { alias[u.Username] = u.AliasPIC || ''; });
  var per = {};
  Object.keys(bulan).forEach(function (ym) {
    Repo.logBulan(ym).forEach(function (l) {
      if (!AKSI_UPDATE_[l.Entitas] || l.Hasil === 'GAGAL' || l.Hasil === 'DITOLAK') return;
      var h = String(l.Timestamp).slice(0, 10), i = hari.indexOf(h);
      if (i < 0) return;
      var u = per[l.Username] = per[l.Username] || { username: l.Username, alias: alias[l.Username] || '', n: [0, 0, 0, 0, 0, 0, 0], bantu: 0, terakhir: null };
      u.n[i]++;
      if (/bantu \(PIC/.test(l.Catatan || '') && !/^BUAT_(KONTRAK|BAST)$/.test(l.Aksi)) u.bantu++;   // mendaftarkan kontrak untuk PIC lain bukan "bantu"
      if (!u.terakhir || String(l.Timestamp) > u.terakhir.waktu) u.terakhir = { waktu: String(l.Timestamp), aksi: l.Aksi, id: l.EntitasID };
    });
  });
  return { dibuat: Repo.sekarang(), hari: hari, user: Object.keys(per).map(function (k) { return per[k]; }) };
}
AKSI['dashboard.ringkas'] = { izin: 'dashboard.lihat', fn: function (ctx) {
  var c = CacheService.getScriptCache(), x = !ctx.payload.segarkan && c.get('dash7');
  if (x) return JSON.parse(x);
  var r = ringkasUpdate_();
  c.put('dash7', JSON.stringify(r), 3600);
  return r;
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
    try { console.log(pasangPemicuArsip_() ? 'Pemicu pindah arsip bulanan dipasang (tanggal 1, ±01.00).' : 'Pemicu pindah arsip bulanan sudah ada.'); }
    catch (e) { console.log('Pemicu arsip belum bisa dipasang: ' + e.message + ' — jalankan mintaIzin lalu setup() lagi.'); }
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

// ===== UI (src/ui, disematkan saat build) =====
var UI_HTML = "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap\">\n<style>\n/* Gaya bersama (sumber: mockup \"Orbit\"). */\n/* Layout: \"Orbit\" — rail kaca di kiri, langit berbintang tipis di belakang, kartu melayang. Alur BAST digambar sebagai lintasan orbit\n   (subjek: layanan satelit/VSAT). Detail kontrak = panel geser dari kanan, jadi daftar tetap terlihat. Tema terang + gelap. */\n:root{\n  --bg:#edf2f5; --surface:#ffffff; --surface2:#f3f7f9; --surface3:#e5edf1; --glass:rgba(255,255,255,.74);\n  --line:#d9e3e9; --line2:#c3d1d9; --fg:#0c1a24; --muted:#4d606d; --dim:#7b8d99;\n  --accent:#07857b; --accent-hi:#05a394; --on-accent:#ffffff; --accent-bg:rgba(7,133,123,.10); --glow:rgba(7,133,123,.28);\n  --violet:#5559e8; --violet-bg:rgba(85,89,232,.10);\n  --ok:#14905a; --ok-bg:rgba(20,144,90,.11); --warn:#9c6205; --warn-bg:rgba(214,150,30,.15);\n  --crit:#cc3b3b; --crit-bg:rgba(204,59,59,.10); --info:#3a58d6; --info-bg:rgba(58,88,214,.10);\n  --fresh:#0ea494; --warm:#c59c00; --stale:#df6f1f; --cold:#d23f3f;\n  --halo1:rgba(5,163,148,.16); --halo2:rgba(85,89,232,.11); --star:rgba(12,26,36,.08);\n  --shadow:0 1px 2px rgba(12,26,36,.05),0 10px 30px rgba(12,26,36,.06); --shadow-lg:0 30px 80px rgba(12,26,36,.22);\n  --scrim:rgba(10,22,32,.32);\n  --font:\"Plus Jakarta Sans\",\"Segoe UI\",system-ui,-apple-system,Roboto,Arial,sans-serif;\n  --mono:\"JetBrains Mono\",Consolas,\"Cascadia Mono\",Menlo,monospace;\n  --r:18px; --r-sm:11px; --ease:cubic-bezier(.2,.8,.2,1); --spring:cubic-bezier(.34,1.45,.64,1);\n}\n@media (prefers-color-scheme:dark){:root:not([data-theme=\"light\"]){\n  --bg:#060b14; --surface:#0d1522; --surface2:#121d2e; --surface3:#1a283e; --glass:rgba(12,20,33,.72);\n  --line:#1b293d; --line2:#2a3c57; --fg:#e4edf6; --muted:#93a6bb; --dim:#617490;\n  --accent:#37e2cb; --accent-hi:#86f2e2; --on-accent:#022320; --accent-bg:rgba(55,226,203,.12); --glow:rgba(55,226,203,.42);\n  --violet:#9ca2ff; --violet-bg:rgba(156,162,255,.13);\n  --ok:#4fd897; --ok-bg:rgba(79,216,151,.12); --warn:#f4c552; --warn-bg:rgba(244,197,82,.12);\n  --crit:#ff7c78; --crit-bg:rgba(255,124,120,.12); --info:#92a8ff; --info-bg:rgba(146,168,255,.12);\n  --fresh:#37e2cb; --warm:#f4d250; --stale:#ff9e4e; --cold:#ff7c78;\n  --halo1:rgba(55,226,203,.10); --halo2:rgba(120,110,255,.12); --star:rgba(220,235,255,.13);\n  --shadow:0 1px 0 rgba(255,255,255,.03) inset,0 12px 34px rgba(0,0,0,.38); --shadow-lg:0 30px 90px rgba(0,0,0,.65);\n  --scrim:rgba(2,6,12,.58); color-scheme:dark;\n}}\n:root[data-theme=\"dark\"]{\n  --bg:#060b14; --surface:#0d1522; --surface2:#121d2e; --surface3:#1a283e; --glass:rgba(12,20,33,.72);\n  --line:#1b293d; --line2:#2a3c57; --fg:#e4edf6; --muted:#93a6bb; --dim:#617490;\n  --accent:#37e2cb; --accent-hi:#86f2e2; --on-accent:#022320; --accent-bg:rgba(55,226,203,.12); --glow:rgba(55,226,203,.42);\n  --violet:#9ca2ff; --violet-bg:rgba(156,162,255,.13);\n  --ok:#4fd897; --ok-bg:rgba(79,216,151,.12); --warn:#f4c552; --warn-bg:rgba(244,197,82,.12);\n  --crit:#ff7c78; --crit-bg:rgba(255,124,120,.12); --info:#92a8ff; --info-bg:rgba(146,168,255,.12);\n  --fresh:#37e2cb; --warm:#f4d250; --stale:#ff9e4e; --cold:#ff7c78;\n  --halo1:rgba(55,226,203,.10); --halo2:rgba(120,110,255,.12); --star:rgba(220,235,255,.13);\n  --shadow:0 1px 0 rgba(255,255,255,.03) inset,0 12px 34px rgba(0,0,0,.38); --shadow-lg:0 30px 90px rgba(0,0,0,.65);\n  --scrim:rgba(2,6,12,.58); color-scheme:dark;\n}\n*{box-sizing:border-box}\nhtml,body{height:100%}\nbody{background:var(--bg);color:var(--fg);font-family:var(--font);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}\nbutton,input,select,textarea{font:inherit;color:inherit}\na{color:var(--accent)}\n:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}\n::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}\n.tnum{font-variant-numeric:tabular-nums}\n.mono{font-family:var(--mono);font-size:12.5px;font-variant-ligatures:none}\n.code,.ku,kbd,.t .no{font-variant-ligatures:none}\n.muted{color:var(--muted)} .dim{color:var(--dim)}\nsvg.i{width:20px;height:20px;fill:currentColor;flex:none}\nsvg.i.s{width:16px;height:16px}\n.sky{position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(1100px 620px at 88% -12%,var(--halo1),transparent 62%),radial-gradient(900px 600px at -8% 112%,var(--halo2),transparent 62%)}\n.sky::after{content:\"\";position:absolute;inset:0;background-image:radial-gradient(var(--star) 1px,transparent 1.4px);background-size:30px 30px;-webkit-mask-image:linear-gradient(to bottom,#000 0,transparent 75%);mask-image:linear-gradient(to bottom,#000 0,transparent 75%)}\nbody::before{content:\"\";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:30;background:var(--bg)}\n\n/* ---------- shell ---------- */\n.app{display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100%}\n.side{background:var(--glass);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-right:1px solid var(--line);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;padding-block:18px 14px;padding-left:max(12px,env(safe-area-inset-left,0px));padding-right:12px;z-index:25}\n.brand{display:flex;gap:11px;align-items:center;padding:2px 8px 22px}\n.brand svg{width:40px;height:40px;flex:none}\n.brand b{display:block;font-size:14.5px;line-height:1.15;font-weight:800;letter-spacing:-.01em}\n.brand span{font-size:11.5px;color:var(--muted)}\n.orbit-sat{transform-origin:20px 20px;animation:spin 7s linear infinite}\n@keyframes spin{to{transform:rotate(360deg)}}\n.nav{display:flex;flex-direction:column;gap:3px;position:relative}\n.nav-ind{position:absolute;left:0;right:0;top:0;height:42px;border-radius:13px;background:var(--accent-bg);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 22%,transparent);transition:transform .5s var(--spring);z-index:0}\n.nav a{position:relative;z-index:1;display:flex;align-items:center;gap:12px;height:42px;padding:0 12px;border-radius:13px;color:var(--muted);text-decoration:none;font-weight:600;font-size:13.5px;transition:color .2s}\n.nav a:hover{color:var(--fg)}\n.nav a.on{color:var(--accent)}\n.nav .cnt{margin-left:auto;font-size:11px;font-weight:700;min-width:22px;text-align:center;background:var(--surface3);color:var(--fg);border-radius:999px;padding:1px 7px}\n.nav a.on .cnt{background:var(--accent);color:var(--on-accent)}\n.side-foot{margin-top:auto;padding:12px;border-radius:14px;background:var(--surface2);border:1px solid var(--line);font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:4px}\n.live{display:inline-flex;align-items:center;gap:8px;color:var(--fg);font-weight:600}\n.pulse{width:8px;height:8px;border-radius:50%;background:var(--ok);position:relative;flex:none}\n.pulse::after{content:\"\";position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--ok);opacity:0;animation:ping 2.2s var(--ease) infinite}\n.pulse.warn{background:var(--warn)} .pulse.warn::after{border-color:var(--warn)}\n@keyframes ping{0%{transform:scale(.4);opacity:.9}100%{transform:scale(1.6);opacity:0}}\n\n.main{min-width:0;display:flex;flex-direction:column}\n.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px;padding-block:12px;padding-left:max(24px,env(safe-area-inset-left,0px));padding-right:max(24px,env(safe-area-inset-right,0px))}\n.top h1{font-size:20px;margin:0;font-weight:800;letter-spacing:-.02em;text-wrap:balance;line-height:1.2}\n.top .crumb{color:var(--muted);font-size:12.5px}\n.top .sp{flex:1}\n.cmdk{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:7px 8px 7px 14px;color:var(--muted);cursor:pointer;min-width:250px;box-shadow:var(--shadow);transition:border-color .2s}\n.cmdk:hover{border-color:var(--accent)}\n.cmdk span{flex:1;text-align:left}\nkbd{font-family:var(--mono);font-size:11px;border:1px solid var(--line2);border-bottom-width:2px;border-radius:6px;padding:0 6px;color:var(--muted);background:var(--surface2)}\n.mock{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;border:1px dashed var(--warn);color:var(--warn);padding:3px 8px;border-radius:7px;white-space:nowrap;font-weight:700}\n.iconbtn{background:none;border:0;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:var(--muted);cursor:pointer;position:relative;transition:background .2s,color .2s}\n.iconbtn:hover{background:var(--surface3);color:var(--fg)}\n.iconbtn[disabled]{opacity:.35;cursor:default}\n.badge{position:absolute;top:4px;right:4px;min-width:17px;height:17px;border-radius:9px;background:var(--crit);color:#fff;font-size:10.5px;font-weight:800;display:grid;place-items:center;padding:0 4px;box-shadow:0 0 0 2px var(--bg)}\n.me{display:flex;align-items:center;gap:8px;padding:4px 12px 4px 4px;border-radius:999px;background:var(--surface);border:1px solid var(--line);cursor:pointer;font-weight:600;font-size:13px}\n.av{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;color:var(--on-accent);background:linear-gradient(135deg,var(--accent),var(--violet));flex:none}\n.av.sm{width:26px;height:26px;font-size:11px}\n.av.none{background:var(--warn-bg);color:var(--warn)}\n.burger{display:grid}\n/* menu samping ringkas (F3): hanya ikon, ruang konten lebih lebar */\n.app{transition:grid-template-columns .35s var(--ease)}\n@media (min-width:901px){\n  .app.mini{grid-template-columns:76px minmax(0,1fr)}\n  .app.mini .side{padding-left:10px;padding-right:10px}\n  .app.mini .brand{justify-content:center;padding:2px 0 22px}\n  .app.mini .brand>div,.app.mini .nav a>span:not(.cnt),.app.mini .nav .eyebrow,.app.mini .side-foot,.app.mini .nav a.soon{display:none}\n  .app.mini .nav a{justify-content:center;padding:0}\n  .app.mini .nav .cnt{position:absolute;top:3px;right:2px;min-width:0;font-size:9.5px;padding:0 5px;line-height:15px}\n}\n.content{padding-block:24px 64px;padding-left:max(24px,env(safe-area-inset-left,0px));padding-right:max(24px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:20px;min-width:0;max-width:1480px;width:100%}\n.content.enter>*{animation:rise .55s var(--ease) both;animation-delay:calc(var(--i,0)*55ms)}\n@keyframes rise{from{opacity:0;transform:translateY(12px)}}\n\n/* ---------- building blocks ---------- */\n.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:18px;min-width:0;box-shadow:var(--shadow)}\n.card h2{font-size:15px;margin:0 0 14px;font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap;letter-spacing:-.01em}\n.card h2 small{font-weight:500;color:var(--muted);font-size:12.5px}\n.eyebrow{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700}\n.grid{display:grid;gap:20px}\n.g2{grid-template-columns:repeat(2,minmax(0,1fr))}\n.g3{grid-template-columns:repeat(3,minmax(0,1fr))}\n.g64{grid-template-columns:minmax(0,1.45fr) minmax(0,1fr)}\n.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n.sp{flex:1}\n.kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}\n.kpi{position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:16px 18px;box-shadow:var(--shadow)}\n.kpi .l{font-size:12px;color:var(--muted);font-weight:600}\n.kpi .v{font-size:30px;font-weight:800;margin-top:6px;letter-spacing:-.03em;line-height:1.05}\n.kpi .s{font-size:12px;color:var(--dim);margin-top:4px}\n.kpi .glyph{position:absolute;right:-8px;top:-8px;width:64px;height:64px;opacity:.07;fill:var(--fg)}\n.btn{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:8px 16px;border:1px solid var(--line2);background:var(--surface);color:var(--fg);cursor:pointer;font-weight:600;font-size:13px;white-space:nowrap;text-decoration:none;transition:transform .15s,background .2s,border-color .2s,box-shadow .2s}\n.btn:hover{border-color:var(--accent)}\n.btn:active{transform:scale(.97)}\n.btn.pri{background:var(--accent);border-color:var(--accent);color:var(--on-accent);box-shadow:0 6px 18px -6px var(--glow)}\n.btn.pri:hover{background:var(--accent-hi);border-color:var(--accent-hi)}\n.btn.ton{background:var(--accent-bg);border-color:transparent;color:var(--accent)}\n.btn.ghost{background:transparent;border-color:transparent;color:var(--accent)}\n.btn.ghost:hover{background:var(--accent-bg)}\n.btn.sm{padding:5px 12px;font-size:12.5px}\n.btn[disabled]{opacity:.45;cursor:not-allowed;box-shadow:none}\n.inp,select.inp,textarea.inp{background:var(--surface);border:1px solid var(--line2);border-radius:var(--r-sm);padding:8px 11px;min-width:0;transition:border-color .2s,box-shadow .2s}\ntextarea.inp{width:100%;min-height:76px;resize:vertical}\n.inp:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-bg)}\n.of{position:relative;display:flex;flex-direction:column;min-width:0}\n.of>span{position:absolute;top:-8px;left:10px;padding:0 5px;font-size:11px;font-weight:600;color:var(--accent);background:var(--surface);line-height:16px;z-index:1}\n.of>.inp{padding:12px 12px 10px;width:100%}\n.of>small{font-size:11.5px;color:var(--dim);margin-top:4px;padding-left:4px}\n.search{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line2);border-radius:999px;padding:7px 14px;flex:1 1 260px;min-width:0;transition:border-color .2s,box-shadow .2s}\n.search:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-bg)}\n.search input{background:none;border:0;outline:0;flex:1;min-width:0}\n.seg{display:inline-flex;background:var(--surface2);border:1px solid var(--line);border-radius:999px;padding:3px}\n.seg button{border:0;background:none;padding:5px 14px;border-radius:999px;cursor:pointer;color:var(--muted);font-weight:600;font-size:12.5px;transition:background .25s,color .25s}\n.seg button.on{background:var(--surface);color:var(--fg);box-shadow:var(--shadow)}\n.chipf{border:1px dashed var(--line2);background:transparent;border-radius:999px;padding:5px 12px;font-size:12.5px;cursor:pointer;color:var(--muted);font-weight:600;display:inline-flex;gap:6px;align-items:center;transition:all .2s}\n.chipf.on{border-style:solid;border-color:var(--accent);color:var(--accent);background:var(--accent-bg)}\n.chipf b{font-variant-numeric:tabular-nums}\n\n.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;white-space:nowrap;background:var(--surface3);color:var(--fg)}\n.pill .dot{width:7px;height:7px;border-radius:50%;background:currentColor}\n.p-ok{background:var(--ok-bg);color:var(--ok)} .p-warn{background:var(--warn-bg);color:var(--warn)}\n.p-crit{background:var(--crit-bg);color:var(--crit)} .p-info{background:var(--info-bg);color:var(--info)}\n.p-acc{background:var(--accent-bg);color:var(--accent)} .p-dim{background:var(--surface2);color:var(--muted);box-shadow:inset 0 0 0 1px var(--line)}\n.p-vio{background:var(--violet-bg);color:var(--violet)}\n.ku{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.02em;border-radius:7px;padding:3px 8px;white-space:nowrap;display:inline-block}\n\n.tbl-wrap{overflow-x:auto;border-radius:var(--r-sm)}\ntable.t{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}\n.t th{text-align:left;font-weight:600;color:var(--dim);font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;padding:9px 12px;border-bottom:1px solid var(--line);white-space:nowrap}\n.t td{padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:middle}\n.t tr:last-child td{border-bottom:0}\n.t tbody tr.click{cursor:pointer;transition:background .15s}\n.t tbody tr.click:hover td{background:var(--surface2)}\n.t tbody tr.sel td{background:var(--accent-bg)}\n.t td.num,.t th.num{text-align:right;font-variant-numeric:tabular-nums}\n.t .no{font-family:var(--mono);font-size:12px;font-weight:500}\n.t .sub{display:block;font-size:12px;color:var(--muted);max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n\n.agebar{display:flex;height:10px;border-radius:6px;overflow:hidden;background:var(--surface3);min-width:120px;gap:2px}\n.agebar i{display:block;height:100%;border-radius:3px}\n.age{font-size:11.5px;border-radius:7px;padding:2px 8px;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}\n.a-fresh{background:color-mix(in srgb,var(--fresh) 15%,transparent);color:var(--fresh)} .a-warm{background:color-mix(in srgb,var(--warm) 16%,transparent);color:var(--warm)}\n.a-stale{background:color-mix(in srgb,var(--stale) 15%,transparent);color:var(--stale)} .a-cold{background:color-mix(in srgb,var(--cold) 15%,transparent);color:var(--cold)}\n.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);font-weight:500}\n.legend span{display:inline-flex;align-items:center;gap:6px}\n.legend i{width:10px;height:10px;border-radius:3px;display:inline-block}\n.spark{display:inline-flex;align-items:flex-end;gap:2px;height:22px}\n.spark i{width:5px;border-radius:2px;background:var(--accent);opacity:.75}\n.spark i:last-child{opacity:1;box-shadow:0 0 8px var(--glow)}\n\n.hbars{display:flex;flex-direction:column;gap:10px}\n.hb{display:grid;grid-template-columns:minmax(0,210px) minmax(0,1fr) 30px;gap:12px;align-items:center;font-size:13px;cursor:pointer;border-radius:8px}\n.hb:hover .lbl{color:var(--accent)}\n.hb .lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .2s}\n.hb .track{height:12px;background:var(--surface2);border-radius:6px;overflow:hidden}\n.hb .fill{height:100%;border-radius:6px;transform-origin:left}\n.enter .hb .fill{animation:grow 1s var(--ease) both;animation-delay:.25s}\n@keyframes grow{from{transform:scaleX(0)}}\n.hb .n{text-align:right;font-variant-numeric:tabular-nums;color:var(--muted);font-weight:700}\n\n.hero{position:relative;overflow:hidden;padding:20px 22px 14px}\n.hero::before{content:\"\";position:absolute;inset:0;background:radial-gradient(600px 220px at 50% 120%,var(--halo1),transparent 70%);pointer-events:none}\n.pipe-wrap{overflow-x:auto;margin:0 -8px}\n.pipe{display:block;width:100%;min-width:760px;height:auto}\n.pipe .track{fill:none;stroke:var(--line2);stroke-width:2;stroke-dasharray:2 7;stroke-linecap:round}\n.pipe .trail{fill:none;stroke:url(#gTrail);stroke-width:3;stroke-linecap:round}\n.pipe .pt{fill:var(--accent);filter:drop-shadow(0 0 4px var(--glow))}\n.pnode{cursor:pointer;outline:none}\n.pnode .body{fill:var(--surface);stroke:var(--accent);stroke-width:2;transition:stroke-width .2s}\n.pnode:hover .body,.pnode:focus-visible .body{stroke-width:4}\n.pnode .halo{fill:var(--accent);opacity:.10}\n.pnode.closer .body{stroke:var(--ok)} .pnode.closer .halo{fill:var(--ok)}\n.pnode .ring{fill:none;stroke:var(--warn);stroke-width:2;stroke-dasharray:4 5;transform-box:fill-box;transform-origin:center;animation:spin 12s linear infinite}\n.pnode .cnt{fill:var(--fg);font-weight:800;font-size:22px;font-family:var(--font)}\n.pnode .lbl{fill:var(--fg);font-size:12.5px;font-weight:600;font-family:var(--font)}\n.pnode .sub{fill:var(--muted);font-size:11.5px;font-family:var(--font)}\n.pnode .sub.w{fill:var(--warn);font-weight:700}\n.enter .pnode{animation:popin .6s var(--spring) both;animation-delay:calc(.15s + var(--d)*70ms);transform-box:fill-box;transform-origin:center}\n@keyframes popin{from{opacity:0;transform:scale(.6)}}\n\n.syncs{display:grid;gap:10px}\n.sync{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:14px;background:var(--surface2);border:1px solid var(--line)}\n\n/* drawer */\n.dscrim{position:fixed;inset:0;background:var(--scrim);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:40;animation:fade .35s var(--ease) both}\n.drawer{position:fixed;top:0;right:0;bottom:0;width:min(1080px,100vw);background:var(--bg);border-left:1px solid var(--line);z-index:41;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);animation:slidein .5s var(--ease) both;padding-top:env(safe-area-inset-top,0px)}\n.drawer::before{content:\"\";position:absolute;inset:0;z-index:-1;background:radial-gradient(700px 300px at 100% 0,var(--halo1),transparent 70%)}\n.closing .drawer{animation:slideout .3s ease-in both}\n.closing .dscrim{animation:fadeout .3s ease-in both}\n@keyframes slidein{from{transform:translateX(70px);opacity:0}}\n@keyframes slideout{to{transform:translateX(70px);opacity:0}}\n@keyframes fade{from{opacity:0}} @keyframes fadeout{to{opacity:0}}\n.dhead{padding-block:14px 0;padding-left:24px;padding-right:max(24px,env(safe-area-inset-right,0px));border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:12px}\n.dtop{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n.dtitle{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}\n.dtitle .no{font-family:var(--mono);font-size:13px;color:var(--muted);display:flex;align-items:center;gap:6px;overflow-wrap:anywhere}\n.dtitle h2{margin:4px 0 2px;font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.2}\n.dtabs{display:flex;gap:4px;position:relative;overflow-x:auto}\n.dtabs button{background:none;border:0;padding:10px 16px;cursor:pointer;font-weight:700;color:var(--muted);font-size:13.5px;position:relative;white-space:nowrap}\n.dtabs button.on{color:var(--fg)}\n.dtabs button.on::after{content:\"\";position:absolute;left:12px;right:12px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:var(--accent);box-shadow:0 0 12px var(--glow)}\n.dbody{flex:1;overflow:auto;padding-block:20px 48px;padding-left:24px;padding-right:max(24px,env(safe-area-inset-right,0px))}\n.dbody.swap>*{animation:rise .4s var(--ease) both}\n\n.bast{border:1px solid var(--line);border-radius:var(--r);padding:16px 18px 18px;display:flex;flex-direction:column;gap:16px;background:var(--surface);box-shadow:var(--shadow)}\n.bast-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n.bast-h b{font-family:var(--mono);font-size:13px}\n.otrack{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(78px,1fr);overflow-x:auto;padding:6px 0 2px}\n.otrack .rail,.otrack .prog{position:absolute;top:19px;height:3px;border-radius:3px}\n.otrack .rail{left:var(--half);right:var(--half);background:var(--surface3)}\n.otrack .prog{left:var(--half);background:linear-gradient(90deg,var(--accent),var(--violet));box-shadow:0 0 12px var(--glow);transition:width .8s var(--ease)}\n.ost{position:relative;z-index:1;background:none;border:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 4px;color:var(--muted);font-size:11.5px;font-weight:600;line-height:1.25;text-align:center}\n.ost .d{width:28px;height:28px;border-radius:50%;background:var(--surface);border:2px solid var(--line2);display:grid;place-items:center;font-size:11px;font-weight:800;transition:all .3s var(--spring)}\n.ost:hover .d{border-color:var(--accent);transform:scale(1.12)}\n.ost:hover{color:var(--fg)}\n.ost.done .d{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}\n.ost.done{color:var(--fg)}\n.ost.cur .d{width:34px;height:34px;margin-top:-3px;margin-bottom:-3px;background:var(--surface);border:3px solid var(--accent);color:var(--accent);box-shadow:0 0 0 6px var(--accent-bg),0 0 22px var(--glow)}\n.ost.cur{color:var(--accent);font-weight:800}\n.ost.closer.done .d,.ost.closer.cur .d{background:var(--ok);border-color:var(--ok);color:var(--on-accent);box-shadow:0 0 0 6px var(--ok-bg)}\n.ost.closer.cur{color:var(--ok)}\ndl.kv{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:8px 18px;margin:0;font-size:13px}\ndl.kv dt{color:var(--muted)} dl.kv dd{margin:0;min-width:0;overflow-wrap:anywhere}\n.push{display:flex;flex-direction:column;gap:2px;border-radius:14px;overflow:hidden;border:1px solid var(--line)}\n.pushrow{display:grid;grid-template-columns:118px minmax(0,1fr);gap:10px;align-items:baseline;font-size:13px;padding:10px 12px;background:var(--surface2)}\n.pushrow .k{font-family:var(--mono);font-size:10.5px;color:var(--dim);font-weight:600}\n.pushrow .v{font-family:var(--mono);font-size:12.5px;font-weight:600;overflow-wrap:anywhere}\n.pushrow.main .v{color:var(--accent);font-size:13.5px}\n.sheetprev{border-radius:14px;overflow:hidden;border:1px solid var(--line);font-size:12px;background:var(--surface)}\n.sheetprev .sh{display:flex;gap:6px;align-items:center;padding:8px 10px;background:var(--surface3);font-weight:600;color:var(--muted)}\n.sheetprev .sh i{width:10px;height:10px;border-radius:50%;background:var(--ok);display:inline-block}\n.tl{display:flex;flex-direction:column;font-size:13px;position:relative}\n.tl .e{display:grid;grid-template-columns:18px 96px minmax(0,1fr);gap:10px;padding:9px 0;align-items:start}\n.tl .e .b{width:10px;height:10px;border-radius:50%;background:var(--accent);margin-top:5px;box-shadow:0 0 0 4px var(--accent-bg)}\n.tl .w{color:var(--dim);font-size:12px}\n.kend{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--crit-bg);border:1px solid color-mix(in srgb,var(--crit) 25%,transparent)}\n.kend.done{background:var(--surface2);border-color:var(--line);opacity:.75}\n.note{padding:11px 14px;border-radius:14px;font-size:13px;display:flex;gap:10px;align-items:flex-start;border:1px solid transparent}\n.note.warn{background:var(--warn-bg);color:var(--warn)} .note.info{background:var(--info-bg);color:var(--info)}\n.note.ok{background:var(--ok-bg);color:var(--ok)} .note.crit{background:var(--crit-bg);color:var(--crit)}\n.note .tx{color:var(--fg)} .note b{color:inherit}\n\n.tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);overflow-x:auto}\n.tabs a{padding:10px 16px;color:var(--muted);text-decoration:none;white-space:nowrap;font-weight:700;position:relative;transition:color .2s}\n.tabs a:hover{color:var(--fg)}\n.tabs a.on{color:var(--fg)}\n.tabs a.on::after{content:\"\";position:absolute;left:12px;right:12px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:var(--accent);box-shadow:0 0 12px var(--glow)}\n.bulk{position:sticky;bottom:16px;background:var(--surface);border:1px solid var(--accent);border-radius:999px;padding:8px 10px 8px 20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;box-shadow:var(--shadow-lg),0 0 0 4px var(--accent-bg);animation:rise .35s var(--spring) both}\n.wiz-steps{display:flex;gap:6px;flex-wrap:wrap}\n.wiz-steps span{display:flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:999px;background:var(--surface2);color:var(--muted);font-size:12.5px;font-weight:600;border:1px solid var(--line)}\n.wiz-steps span i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--surface3);font-style:normal;font-size:11.5px;font-weight:800}\n.wiz-steps span.on{color:var(--accent);background:var(--accent-bg);border-color:transparent}\n.wiz-steps span.on i{background:var(--accent);color:var(--on-accent)}\n.wiz-steps span.done i{background:var(--ok);color:var(--on-accent)}\n.choice{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n.choice label{display:flex;gap:12px;align-items:flex-start;padding:14px;border-radius:14px;border:1.5px solid var(--line2);cursor:pointer;transition:all .2s;background:var(--surface)}\n.choice label.on{border-color:var(--accent);background:var(--accent-bg);box-shadow:0 0 0 4px var(--accent-bg)}\n.choice input{accent-color:var(--accent);margin-top:3px}\n.choice b{display:block;margin-bottom:2px}\n.chk{width:16px;height:16px;accent-color:var(--accent)}\n.toggle{width:38px;height:22px;border-radius:11px;background:var(--surface3);border:1px solid var(--line2);position:relative;cursor:pointer;flex:none;transition:background .25s}\n.toggle::after{content:\"\";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dim);transition:left .3s var(--spring),background .25s}\n.toggle.on{background:var(--accent);border-color:var(--accent)}\n.toggle.on::after{left:18px;background:var(--on-accent)}\n.matrix td,.matrix th{text-align:center} .matrix td:first-child,.matrix th:first-child{text-align:left}\n.attn{display:flex;gap:12px;padding:12px 14px;border-radius:14px;background:var(--surface2);border:1px solid var(--line);cursor:pointer;transition:transform .2s var(--ease),border-color .2s;align-items:center}\n.attn:hover{transform:translateX(3px);border-color:var(--accent)}\n.attn .bar{width:4px;border-radius:4px;flex:none;align-self:stretch}\n.qcard{display:flex;flex-direction:column;gap:12px}\n.diff-old{text-decoration:line-through;color:var(--dim)}\n.diff-new{color:var(--accent);font-weight:700}\n.code{font-family:var(--mono);font-size:11.5px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px;white-space:pre;overflow-x:auto;max-height:180px;color:var(--muted)}\n\n/* overlays */\n.scrim{position:fixed;inset:0;background:var(--scrim);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);z-index:60;display:grid;place-items:center;padding:16px;animation:fade .25s var(--ease) both}\n.modal{background:var(--surface);border:1px solid var(--line);border-radius:22px;width:min(540px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:22px;display:flex;flex-direction:column;gap:16px;box-shadow:var(--shadow-lg);animation:pop .45s var(--spring) both}\n.scrim.closing{animation:fadeout .2s ease-in both} .scrim.closing .modal{animation:popout .2s ease-in both}\n@keyframes pop{from{opacity:0;transform:translateY(10px) scale(.95)}}\n@keyframes popout{to{opacity:0;transform:translateY(6px) scale(.97)}}\n.modal h3{margin:0;font-size:18px;font-weight:800;letter-spacing:-.01em}\n.modal .acts{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}\n.pal{place-items:start center;padding-top:12vh}\n.pal .modal{padding:0;gap:0;width:min(640px,100%)}\n.pal .ps{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--line)}\n.pal .ps input{flex:1;background:none;border:0;outline:0;font-size:16px;min-width:0}\n.pal .pr{max-height:50vh;overflow:auto;padding:8px}\n.pal .pi{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:12px;cursor:pointer}\n.pal .pi.on{background:var(--accent-bg)}\n.pal .pi .mono{font-size:11.5px;color:var(--muted)}\n.pal .pf{display:flex;gap:14px;padding:10px 18px;border-top:1px solid var(--line);font-size:11.5px;color:var(--dim)}\n.notif{position:absolute;right:max(16px,env(safe-area-inset-right,0px));top:62px;width:min(420px,calc(100vw - 32px));background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow-lg);overflow:hidden;transform-origin:top right;transition:opacity .25s var(--ease),transform .35s var(--spring),visibility .35s;opacity:0;transform:scale(.94) translateY(-6px);pointer-events:none;visibility:hidden}\n.notif.open{opacity:1;transform:none;pointer-events:auto;visibility:visible}\n.notif-h{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line)}\n.notif-i{display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);cursor:pointer;font-size:13px;transition:background .15s}\n.notif-i:hover{background:var(--surface2)}\n.notif-i.read{opacity:.5}\n.notif-i .w{font-size:11.5px;color:var(--dim);margin-top:3px}\n.toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));background:var(--fg);color:var(--bg);padding:11px 18px;border-radius:14px;z-index:70;font-size:13px;font-weight:600;box-shadow:var(--shadow-lg);max-width:calc(100vw - 32px);display:flex;gap:10px;align-items:center;animation:toastin .45s var(--spring) both;transform:translateX(-50%)}\n@keyframes toastin{from{opacity:0;transform:translate(-50%,16px) scale(.96)}}\n\n/* login */\n.login{min-height:100%;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)}\n.login-art{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;gap:24px;padding:40px;padding-left:max(40px,env(safe-area-inset-left,0px));border-right:1px solid var(--line);background:radial-gradient(700px 500px at 40% 45%,var(--halo1),transparent 70%),radial-gradient(500px 400px at 80% 90%,var(--halo2),transparent 70%)}\n.login-art svg.orb{position:absolute;left:50%;top:50%;width:min(620px,95%);transform:translate(-50%,-50%);overflow:visible}\n.orb .ring{fill:none;stroke:var(--line2);stroke-width:1.2}\n.orb .ring.d{stroke-dasharray:3 8}\n.orb .nd{fill:var(--surface);stroke:var(--accent);stroke-width:2}\n.orb .nd.ok{stroke:var(--ok)}\n.orb text{fill:var(--muted);font-size:12px;font-weight:600;font-family:var(--font)}\n.orb .sat{fill:var(--accent);filter:drop-shadow(0 0 6px var(--glow))}\n.login-art h2{position:relative;font-size:clamp(26px,3.2vw,40px);line-height:1.1;letter-spacing:-.03em;margin:0;font-weight:800;max-width:15ch;text-wrap:balance}\n.login-art h2 em{font-style:normal;background:linear-gradient(90deg,var(--accent),var(--violet));-webkit-background-clip:text;background-clip:text;color:transparent}\n.login-form{display:grid;place-items:center;padding-block:32px;padding-left:24px;padding-right:max(24px,env(safe-area-inset-right,0px))}\n.login-form .box{width:min(380px,100%);display:flex;flex-direction:column;gap:18px}\n.login-form h3{font-size:24px;margin:0;font-weight:800;letter-spacing:-.02em}\n\n@media (max-width:1180px){.kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.g64,.g3{grid-template-columns:minmax(0,1fr)}}\n@media (max-width:900px){\n  .app{grid-template-columns:minmax(0,1fr)}\n  .side{position:fixed;left:0;top:0;bottom:0;width:264px;transform:translateX(-105%);transition:transform .35s var(--ease);background:var(--surface)}\n  .side.open{transform:none;box-shadow:var(--shadow-lg)}\n  .burger{display:grid}\n  .g2,.choice{grid-template-columns:minmax(0,1fr)}\n  .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}\n  .top{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));gap:4px}\n  .content{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}\n  .top .crumb,.me .nm,.mock,.cmdk span,.cmdk kbd{display:none}\n  .top h1{font-size:17px}\n  .cmdk{min-width:0;padding:9px;border-radius:50%}\n  .hb{grid-template-columns:minmax(0,120px) minmax(0,1fr) 26px}\n  .login{grid-template-columns:minmax(0,1fr)}\n  .login-art{min-height:320px;border-right:0;border-bottom:1px solid var(--line);padding:24px}\n  .dtitle h2{font-size:20px}\n  .dhead,.dbody{padding-left:16px;padding-right:max(16px,env(safe-area-inset-right,0px))}\n  .dkeys{display:none}\n}\n@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.pipe .pt,.orb .sat{display:none}}\n\n/* ---- tambahan F1 ---- */\n/* Tambahan khusus mockup F1 */\n.mpanel{position:fixed;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:55;background:var(--surface);border:1px dashed var(--warn);border-radius:16px;box-shadow:var(--shadow-lg);width:min(300px,calc(100vw - 32px));font-size:12.5px;overflow:hidden}\n.mpanel summary{list-style:none;cursor:pointer;padding:10px 14px;font-weight:800;color:var(--warn);display:flex;align-items:center;gap:8px;letter-spacing:.04em;text-transform:uppercase;font-size:11px}\n.mpanel summary::-webkit-details-marker{display:none}\n.mpanel .mb{padding:0 14px 14px;display:flex;flex-direction:column;gap:10px}\n.mpanel .mb .lbl{font-weight:700;color:var(--muted);font-size:11px;letter-spacing:.06em;text-transform:uppercase}\n.mpanel .chips{display:flex;flex-wrap:wrap;gap:6px}\n.mpanel .chips button{font:inherit;font-size:12px;font-weight:600;border:1px solid var(--line2);background:var(--surface);color:var(--fg);border-radius:999px;padding:4px 10px;cursor:pointer}\n.mpanel .chips button.on{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}\n.term{font-family:var(--mono);font-variant-ligatures:none;font-size:12.5px;line-height:1.75;background:#0b1220;color:#cfe3f0;border-radius:14px;padding:16px 18px;overflow-x:auto;white-space:pre}\n.term .t{color:#6f8aa3} .term .ok{color:#5fe0a0} .term .k{color:#ffd479;font-weight:700} .term .c{color:#8fb3ff}\n.nav a.soon{opacity:.45;cursor:not-allowed}\n.nav a.soon .cnt{background:transparent;border:1px solid var(--line2);color:var(--muted);font-weight:600}\n.rules{display:flex;flex-direction:column;gap:6px;font-size:12.5px}\n.rules span{display:flex;gap:8px;align-items:center;color:var(--muted)}\n.rules span.ok{color:var(--ok)}\n.rules i{width:16px;height:16px;border-radius:50%;border:1.5px solid currentColor;display:grid;place-items:center;font-style:normal;font-size:10px;font-weight:800}\n.secret{display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:14px;background:var(--surface2);border:1px dashed var(--accent);font-family:var(--mono);font-size:20px;font-weight:600;letter-spacing:.08em;font-variant-ligatures:none}\n.secret .btn{font-family:var(--font);letter-spacing:0;font-size:12.5px}\n.denied{display:grid;place-items:center;text-align:center;padding:60px 20px;gap:10px}\n.denied .big{width:64px;height:64px;border-radius:20px;background:var(--crit-bg);color:var(--crit);display:grid;place-items:center}\n.denied .big svg{width:32px;height:32px}\n.res-ok{color:var(--ok);font-weight:700} .res-no{color:var(--crit);font-weight:700}\n.check{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line);font-size:13px}\n.check:last-child{border-bottom:0}\n.check .d{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;flex:none}\n.check .d.y{background:var(--ok);color:var(--on-accent)} .check .d.n{background:var(--surface3);color:var(--muted)}\n/* Users: avatar status, menu ⋮, panel user */\n.ava{--s:34px;width:var(--s);height:var(--s);border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:calc(var(--s)*.36);color:var(--on-accent);background:linear-gradient(135deg,var(--accent),var(--violet));box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--ring,transparent);flex:none;letter-spacing:.02em}\n.ava.on{--ring:var(--ok)} .ava.pw{--ring:var(--warn)} .ava.lock{--ring:var(--crit)} .ava.off{--ring:var(--line2);filter:grayscale(1);opacity:.55}\n.rbadge{display:inline-flex;gap:6px;align-items:center;font-size:12px;font-weight:700;padding:3px 10px 3px 7px;border-radius:999px;background:var(--surface2);box-shadow:inset 0 0 0 1px var(--line)}\n.rbadge svg{width:15px;height:15px;fill:currentColor}\n.rbadge.ADMIN{background:var(--accent-bg);color:var(--accent);box-shadow:none} .rbadge.VIEWER{color:var(--muted)}\n.menu{position:fixed;z-index:65;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg);padding:6px;width:250px;animation:pop .25s var(--spring) both}\n.menu button{display:flex;gap:10px;align-items:flex-start;width:100%;border:0;background:none;padding:9px 12px;border-radius:10px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;color:var(--fg);text-align:left}\n.menu button:hover:not([disabled]){background:var(--surface2)} .menu button.danger{color:var(--crit)} .menu button[disabled]{opacity:.5;cursor:not-allowed}\n.menu button svg{width:18px;height:18px;fill:currentColor;flex:none;margin-top:1px}\n.menu small{display:block;color:var(--muted);font-size:11.5px;font-weight:500}\n.menu hr{border:0;border-top:1px solid var(--line);margin:4px 6px}\n.idcard{position:relative;overflow:hidden;border-radius:20px;padding:20px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 15%,var(--surface)),color-mix(in srgb,var(--violet) 13%,var(--surface)));border:1px solid var(--line);display:flex;gap:16px;align-items:center;min-height:118px}\n.idcard::before,.idcard::after{content:\"\";position:absolute;border-radius:50%;border:1.5px dashed color-mix(in srgb,var(--accent) 35%,transparent);pointer-events:none}\n.idcard::before{width:240px;height:240px;right:-90px;top:-110px} .idcard::after{width:150px;height:150px;right:-30px;top:-55px;border-style:solid;border-color:color-mix(in srgb,var(--violet) 25%,transparent)}\n.idcard .who{min-width:0;position:relative;z-index:1}\n.idcard .who b{display:block;font-size:19px;font-weight:800;letter-spacing:-.02em;overflow-wrap:anywhere}\n.idcard .who .mono{color:var(--muted)}\n.rcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}\n.rcard{border:1.5px solid var(--line2);border-radius:14px;padding:12px;background:var(--surface);cursor:pointer;text-align:left;font:inherit;color:var(--fg);display:flex;flex-direction:column;gap:3px;transition:border-color .2s,background .2s,box-shadow .2s,transform .15s}\n.rcard:hover{transform:translateY(-1px)}\n.rcard.on{border-color:var(--accent);background:var(--accent-bg);box-shadow:0 0 0 4px var(--accent-bg)}\n.rcard svg{width:22px;height:22px;fill:var(--accent);margin-bottom:4px}\n.rcard b{font-size:14px} .rcard small{color:var(--muted);font-size:11.5px;line-height:1.35}\n.perms{display:flex;flex-wrap:wrap;gap:6px}\n.perms span{font-size:11.5px;padding:3px 9px;border-radius:999px;background:var(--surface2);border:1px solid var(--line)}\n.perms.anim span:not(.no){animation:rise .3s var(--ease) both;animation-delay:calc(var(--i)*22ms)}\n.perms span.no{opacity:.4;text-decoration:line-through;animation:none}\n.strength{height:6px;border-radius:3px;background:var(--surface3);overflow:hidden;margin-top:8px}\n.strength i{display:block;height:100%;border-radius:3px;transition:width .3s,background .3s}\n.sect{display:flex;flex-direction:column;gap:12px}\n.sect>.eyebrow{margin-bottom:-2px}\n.swrow{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:14px;background:var(--surface2);border:1px solid var(--line)}\n.swrow b{display:block;font-size:13.5px} .swrow small{color:var(--muted);font-size:12px}\n.danger-zone{border:1px solid color-mix(in srgb,var(--crit) 35%,transparent);border-radius:14px;padding:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}\n.btn.danger{border-color:var(--crit);color:var(--crit);background:transparent}\n.sfoot{display:flex;gap:8px;justify-content:flex-end;padding-block:14px;padding-left:24px;padding-right:max(24px,env(safe-area-inset-right,0px));border-top:1px solid var(--line);background:var(--surface)}\n.ussheet .dbody{display:flex;flex-direction:column;gap:22px}\n\n/* tombol sibuk */\n.btn.busy { cursor: progress; opacity: .85; }\n.bspin { width: 13px; height: 13px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; display: inline-block; animation: bspin .7s linear infinite; flex: none; }\n@keyframes bspin { to { transform: rotate(360deg); } }\n@media (prefers-reduced-motion: reduce) { .bspin { animation-duration: 2s; } }\n\n/* ---- F2: kontrak, upload, sinkron latar ---- */\n.orow{display:grid;grid-template-columns:80px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) 70px 36px;gap:8px;align-items:center}\n@media (max-width:700px){.orow{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}\n.dupe{font-size:12.5px;color:var(--crit);margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}\n.ahit{display:flex;gap:6px;align-items:flex-start;margin-top:6px;font-size:12px;color:var(--muted);background:var(--accent-bg);border-radius:8px;padding:4px 8px;width:fit-content;max-width:100%}\n.ahit .i{flex:none;margin-top:1px;color:var(--accent)}.ahit .mono{font-size:11.5px;word-break:break-all}\nmark{background:color-mix(in oklab,var(--warn) 35%,transparent);color:inherit;border-radius:3px;padding:0 1px}\n.ustep{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ustep>div{display:flex;align-items:center;gap:8px;color:var(--muted);font-weight:600;font-size:13px}\n.ustep i{font-style:normal;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;border:1.5px solid var(--line2);font-size:12px}\n.ustep .on{color:var(--fg)}.ustep .on i{background:var(--accent);border-color:var(--accent);color:var(--on-accent,#fff)}.ustep .done i{background:var(--ok);border-color:var(--ok);color:#fff}.ustep b{flex:0 1 40px;height:1.5px;background:var(--line2)}\n.ucard,.drop{display:flex;gap:16px;padding:20px;border-radius:16px;border:1px solid var(--line);background:var(--surface)}.ucard h3,.drop h3{margin:0 0 6px;font-size:15.5px}\n.drop{flex-direction:column;align-items:center;justify-content:center;text-align:center;border:2px dashed var(--line2);cursor:pointer;transition:border-color .2s,background .2s,transform .2s;min-height:200px}\n.drop:hover,.drop:focus-visible,.drop.over{border-color:var(--accent);background:var(--accent-bg);outline:none}.drop.over{transform:scale(1.01)}\n.uic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--accent-bg);color:var(--accent);flex:none}.uic.big{width:56px;height:56px;border-radius:16px}.uic.ok{background:color-mix(in oklab,var(--ok) 15%,transparent);color:var(--ok)}\n.utiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}\n.utile{display:flex;flex-direction:column;gap:2px;text-align:left;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--fg);font:inherit;cursor:pointer}\n.utile b{font-size:24px;line-height:1.1}.utile span{font-size:12.5px;color:var(--muted)}div.utile{cursor:default}\n.utile.ok b{color:var(--ok)}.utile.warn b{color:var(--warn)}.utile.crit b{color:var(--crit)}.utile.on{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-bg)}\n.umsg{margin:0;padding:0;list-style:none;font-size:12.5px;display:flex;flex-direction:column;gap:3px;min-width:220px}.umsg li{padding-left:16px;position:relative}\n.umsg li:before{content:'';position:absolute;left:3px;top:7px;width:6px;height:6px;border-radius:50%;background:var(--muted)}\n.umsg li.e{color:var(--crit)}.umsg li.e:before{background:var(--crit)}.umsg li.w{color:var(--warn)}.umsg li.w:before{background:var(--warn)}.umsg li.ok:before{background:var(--ok)}\n.utbl tr.u-error td{background:color-mix(in oklab,var(--crit) 5%,transparent)}.utbl tr.u-ada td{opacity:.85}.udone{display:flex;gap:16px;align-items:center}.udone h3{margin:0;font-size:18px}\n.upbar{flex:1 1 160px;height:6px;border-radius:6px;background:var(--line);overflow:hidden}.upbar i{display:block;height:100%;background:var(--accent);transition:width .4s}\n@media (max-width:700px){.ucard{flex-direction:column}.ustep span{display:none}}\n.syncchip{display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:12.5px;font-weight:600;color:var(--muted);background:transparent;border:1px solid var(--line);border-radius:999px;padding:5px 12px;cursor:pointer;white-space:nowrap}\n.syncchip.busy{color:var(--accent);border-color:var(--accent)}.syncchip.ok{color:var(--ok);border-color:color-mix(in oklab,var(--ok) 50%,transparent)}.syncchip.warn{color:var(--warn);border-color:var(--warn)}\n.syncchip .pulse{width:7px;height:7px}.syncchip[hidden]{display:none}@media (max-width:900px){.syncchip{display:none}}\n.loadov{position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:color-mix(in oklab,var(--bg) 70%,transparent);backdrop-filter:blur(8px);animation:fadeIn .25s}.loadov.out{opacity:0;transition:opacity .4s}\n.loadbox{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:26px 28px;min-width:min(420px,90vw);box-shadow:var(--shadow-lg);display:flex;flex-direction:column;gap:12px}.loadbox h3{margin:0;font-size:17px}\n.lsteps{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;font-size:13.5px}.lsteps li{display:flex;gap:10px;align-items:center;color:var(--muted)}\n.lsteps li:before{content:\"\";width:16px;height:16px;border-radius:50%;border:2px solid var(--line2);flex:none;box-sizing:border-box}\n.lsteps li.on{color:var(--fg);font-weight:600}.lsteps li.on:before{border-color:var(--accent);border-right-color:transparent;animation:bspin .7s linear infinite}.lsteps li.done{color:var(--fg)}.lsteps li.done:before{background:var(--ok);border-color:var(--ok)}\n@keyframes fadeIn{from{opacity:0}}\ntr.flash td{animation:flashrow 2.6s ease}@keyframes flashrow{0%,40%{background:color-mix(in oklab,var(--accent) 18%,transparent)}}\n.arsres h2 small{font-weight:500}.lamaload{display:flex;gap:14px;align-items:center;padding:40px 8px}.lamaload .bspin{width:22px;height:22px;color:var(--accent)}\n.otrack .ost .l{font-size:11.5px}\n.tl .e>span{min-width:0;overflow-wrap:anywhere}.kv dd{min-width:0;overflow-wrap:anywhere}\n.bulk[hidden]{display:none}\n.goyang{animation:goyang .38s ease}\n@keyframes goyang{20%{transform:translateX(-7px)}45%{transform:translateX(6px)}70%{transform:translateX(-3px)}}\n@media (prefers-reduced-motion: reduce){.goyang{animation:none}}\n.bchips{display:flex;flex-direction:column;gap:3px;align-items:flex-start}\n.bchip{display:inline-flex;gap:6px;align-items:center;font-size:11.5px;font-weight:600;border-radius:7px;padding:1px 8px;background:var(--accent-bg);color:var(--accent);white-space:nowrap}\n.bchip b{font-family:var(--mono);font-size:10.5px;color:var(--muted)}.bchip.cl{background:color-mix(in oklab,var(--ok) 14%,transparent);color:var(--ok)}\n.filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}\n@media (min-width:1500px){.filters{grid-template-columns:repeat(6,minmax(0,1fr))}}\n.filters select.inp{width:100%;min-width:0;text-overflow:ellipsis}\n@media (max-width:520px){.filters{grid-template-columns:repeat(2,minmax(0,1fr))}}\n\n/* ---- aplikasi ---- */\n.boot{min-height:100vh;display:grid;place-items:center;gap:14px;text-align:center;padding:24px}\n.spinner{width:34px;height:34px;border-radius:50%;border:3px solid var(--line2);border-top-color:var(--accent);animation:spin 1s linear infinite}\n.loading{display:flex;gap:12px;align-items:center;justify-content:center;padding:48px;color:var(--muted)}\n.toast.err{background:var(--crit);color:#fff}\n.btn.busy{opacity:.6;pointer-events:none}\n</style>\n<div class=\"sky\" aria-hidden=\"true\"></div>\n<div id=\"root\"><div class=\"boot\"><div><div class=\"spinner\" style=\"margin:0 auto 12px\"></div><div style=\"color:#7b8d99;font:14px system-ui\">Memuat Status Kontrak Manager…</div></div></div></div>\n<div id=\"sheet-root\"></div>\n<div id=\"overlay-root\"></div>\n<script>\n/* Ikon inline SVG (tanpa CDN). */\nconst IC={\ndash:\"M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z\",\ndoc:\"M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z\",\nwarn:\"M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z\",\ninbox:\"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.34 3-3 3s-3-1.34-3-3H5V5h14v10z\",\nsync:\"M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z\",\ngear:\"M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z\",\nlog:\"M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z\",\nbell:\"M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z\",\nsearch:\"M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z\",\ndl:\"M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z\",\nadd:\"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z\",\nmenu:\"M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z\",\nx:\"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\",\ncheck:\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z\",\nup:\"M7 14l5-5 5 5z\", down:\"M7 10l5 5 5-5z\",\nchevL:\"M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z\", chevR:\"M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z\",\neye:\"M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z\",\nup2:\"M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z\",\nflag:\"M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z\",\nperson:\"M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\",\nsun:\"M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z\",\nmoon:\"M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z\",\nauto:\"M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm1-17.93c3.94.49 7 3.85 7 7.93s-3.05 7.44-7 7.93V4.07z\",\ncopy:\"M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z\",\nlink:\"M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z\"\n};\nconst ic=(n,c='')=>`<svg class=\"i ${c}\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"${IC[n]}\"/></svg>`;\nconst esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\nconst rp=n=>(n===''||n==null||!isFinite(Number(n)))?'—':'Rp '+Number(n).toLocaleString('id-ID');\nconst rpShort=n=>n>=1e12?'Rp '+(n/1e12).toLocaleString('id-ID',{maximumFractionDigits:1})+' T':n>=1e9?'Rp '+(n/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M':'Rp '+Math.round(n/1e6).toLocaleString('id-ID')+' jt';\nconst REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;\nconst LOGO=`<svg viewBox=\"0 0 40 40\" aria-hidden=\"true\"><defs><linearGradient id=\"lg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"var(--accent)\"/><stop offset=\"1\" stop-color=\"var(--violet)\"/></linearGradient></defs><rect width=\"40\" height=\"40\" rx=\"12\" fill=\"url(#lg)\"/><circle cx=\"20\" cy=\"20\" r=\"11\" fill=\"none\" stroke=\"var(--on-accent)\" stroke-opacity=\".45\" stroke-width=\"1.5\"/><circle cx=\"20\" cy=\"20\" r=\"4.5\" fill=\"var(--on-accent)\"/><g class=\"orbit-sat\"><circle cx=\"31\" cy=\"20\" r=\"2.6\" fill=\"var(--on-accent)\"/></g></svg>`;\nIC.lock=\"M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z\";\nIC.users=\"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z\";\nIC.shield=\"M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z\";\nIC.db=\"M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.59 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2-6-1.5-6-2 2.13-2 6-2zm6 12c0 .5-2.13 2-6 2s-6-1.5-6-2v-2.23c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V17zm0-4c0 .5-2.13 2-6 2s-6-1.5-6-2v-2.23c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V13z\";\nIC.more=\"M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z\";\nIC.trash=\"M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z\";\nIC.edit=\"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z\";\nIC.block=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z\";\nIC.home=\"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z\";\nIC.key=\"M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z\";\n\n/**\n * KD — aturan kontrak yang dipakai BERSAMA oleh server (Apps Script) dan browser.\n * Browser menjalankan operasi yang sama untuk tampilan instan (simpan optimis, §4.4);\n * server menjalankannya ulang sebagai keputusan akhir. Fungsi murni: tanpa Google API, tanpa DOM.\n */\nvar KD = (function () {\n\n  // ------------------------------------------------------------------ dasar\n  function s(v) { return v === undefined || v === null ? '' : String(v); }\n  function t(v) { return s(v).trim(); }\n  function bool(v) { return v === true || s(v).toUpperCase() === 'TRUE'; }\n  function num(v, d) { var n = Number(v); return s(v) !== '' && isFinite(n) ? n : (d === undefined ? 0 : d); }\n  function salin(o) { return JSON.parse(JSON.stringify(o)); }\n  function galat(kode, pesan) { var e = new Error(pesan); e.kode = kode; return e; }\n  function wajib(c, pesan, kode) { if (!c) throw galat(kode || 'VALIDASI', pesan); }\n\n  /** Kunci pencocokan nomor (§8.2). */\n  function normKey(x) {\n    return s(x).normalize('NFKC').toUpperCase().replace(/[‐-―−]/g, '-').replace(/\\s+/g, '').replace(/\\.+$/, '');\n  }\n  /** Nama customer untuk perbandingan DIRECT/INDIRECT (§5.7). */\n  function normCust(x) {\n    return s(x).toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\\b(PT|TBK|PERSERO|CV)\\b/g, ' ').replace(/\\s+/g, '');\n  }\n  function jenisCustomer(cust, end) {\n    if (!t(cust) || !t(end)) return 'BELUM';\n    return normCust(cust) === normCust(end) ? 'DIRECT' : 'INDIRECT';\n  }\n  var LABEL_JC = { DIRECT: 'DIRECT', INDIRECT: 'INDIRECT', BELUM: 'BELUM TERDEFINISI' };\n  function dokDefault(jc, cfg) {\n    cfg = cfg || {};\n    return t(cfg['DOKTAGIH_DEFAULT_' + (jc === 'BELUM' ? 'BELUM' : jc)]) || (jc === 'DIRECT' ? 'BAA' : 'BAST');\n  }\n\n  // ------------------------------------------------------------------ referensi\n  /** ref mentah (baris tab) → bentuk siap pakai. */\n  function siapkanRef(raw) {\n    var tahap = (raw.tahap || []).map(function (r) {\n      return { Kode: s(r.Kode), Urutan: num(r.Urutan), Label: s(r.Label) || s(r.Kode), Penutup: bool(r.Penutup), BatasAgingHari: num(r.BatasAgingHari, 14), Aktif: bool(r.Aktif) };\n    }).sort(function (a, b) { return a.Urutan - b.Urutan; });\n    var kendala = (raw.kendala || []).map(function (r) {\n      return { Kode: s(r.Kode), Label: s(r.Label) || s(r.Kode), WajibKeterangan: bool(r.WajibKeterangan), MemicuReopen: bool(r.MemicuReopen), Aktif: bool(r.Aktif), Urutan: num(r.Urutan) };\n    }).sort(function (a, b) { return a.Urutan - b.Urutan; });\n    var push = (raw.push || []).map(function (r) {\n      return { Urutan: num(r.Urutan), Kondisi: s(r.Kondisi), Nilai: s(r.Nilai), Aktif: bool(r.Aktif) };\n    }).sort(function (a, b) { return a.Urutan - b.Urutan; });\n    var peta = function (l) { var m = {}; l.forEach(function (x) { m[x.Kode] = x; }); return m; };\n    var daftar = function (l) { return (l || []).map(function (r) { return { Kode: s(r.Kode), Label: s(r.Label) || s(r.Kode), Aktif: bool(r.Aktif), Urutan: num(r.Urutan) }; }).sort(function (a, b) { return a.Urutan - b.Urutan; }); };\n    return { tahap: tahap, kendala: kendala, push: push, T: peta(tahap), KD: peta(kendala),\n             jenisDok: daftar(raw.jenisDok), populasi: daftar(raw.populasi), segment: daftar(raw.segment), dokTagih: daftar(raw.dokTagih) };\n  }\n  function tahapPertama(ref) { var a = ref.tahap.filter(function (x) { return x.Aktif && !x.Penutup; }); return a.length ? a[0].Kode : (ref.tahap[0] || {}).Kode; }\n  function penutup(ref) { return ref.tahap.filter(function (x) { return x.Aktif && x.Penutup; })[0] || ref.tahap.filter(function (x) { return x.Penutup; })[0] || null; }\n  function bastClose(b, ref) { var x = ref.T[b.KodeTahap]; return !!(x && x.Penutup); }\n  function hidup(rows) { return (rows || []).filter(function (r) { return !bool(r.Dihapus); }); }\n\n  // ------------------------------------------------------------------ status, tahap, aging (§5.4, §5.6)\n  function cakupan(bundle) {\n    var b = hidup(bundle.bast);\n    if (b.length === 1 && t(b[0].CakupanLokasi) === '') return num(bundle.k.JumlahLokasi, 0);   // satu BAST tanpa isian = seluruh lokasi\n    return b.reduce(function (a, x) { return a + num(x.CakupanLokasi, 0); }, 0);\n  }\n  function statusKontrak(bundle, ref) {\n    var b = hidup(bundle.bast), lok = t(bundle.k.JumlahLokasi), tot = cakupan(bundle);\n    var semuaClose = b.length > 0 && b.every(function (x) { return bastClose(x, ref); });\n    var sisa = lok === '' ? '' : Math.max(0, num(lok) - tot);\n    if (semuaClose && (lok === '' || tot >= num(lok))) return { status: 'CLOSE', menunggu: false, sisa: sisa === '' ? '' : 0 };\n    return { status: 'OPEN', menunggu: semuaClose && lok !== '' && tot < num(lok), sisa: sisa };\n  }\n  function bastOpen(bundle, ref) { return hidup(bundle.bast).filter(function (x) { return !bastClose(x, ref); }); }\n  /** Tahap kontrak = tahap BAST OPEN dengan urutan terendah (bottleneck). */\n  function tahapKontrak(bundle, ref) {\n    var o = bastOpen(bundle, ref);\n    if (o.length) {\n      o.sort(function (a, b) { return num((ref.T[a.KodeTahap] || {}).Urutan, 999) - num((ref.T[b.KodeTahap] || {}).Urutan, 999); });\n      return o[0].KodeTahap;\n    }\n    var b = hidup(bundle.bast);\n    return b.length ? (penutup(ref) || {}).Kode || b[0].KodeTahap : '';\n  }\n  function tanggal(x) { var m = s(x).match(/^(\\d{4})-(\\d{2})-(\\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; }\n  /** Hari sejak tanggal (yyyy-MM-dd…) sampai hari ini (yyyy-MM-dd). Tidak pernah berhenti (§5.6). */\n  function hariSejak(dari, hariIni) { var a = tanggal(dari), b = tanggal(hariIni); return a === null || b === null ? null : Math.max(0, Math.round((b - a) / 864e5)); }\n  function bucket(h, batas) { batas = batas || [7, 14, 30]; return h === null ? '' : h <= batas[0] ? 'fresh' : h <= batas[1] ? 'warm' : h <= batas[2] ? 'stale' : 'cold'; }\n  function kendalaAktif(bundle) { return (bundle.kend || []).filter(function (x) { return x.Status === 'AKTIF'; }); }\n\n  // ------------------------------------------------------------------ Nilai Push (§5.5)\n  function cocokKondisi(kond, st, tahap, aktif, adaBast) {\n    if (kond === 'CLOSE') return st.status === 'CLOSE';\n    if (kond === 'SISA_LOKASI') return st.menunggu;\n    if (kond === 'BELUM_ADA_BAST') return !adaBast;\n    if (kond === 'KENDALA:*') return aktif.length > 0;\n    if (kond.indexOf('KENDALA:') === 0) return aktif.some(function (x) { return x.Jenis === kond.slice(8); });\n    if (kond.indexOf('TAHAP:') === 0) return st.status !== 'CLOSE' && tahap === kond.slice(6);\n    return false;\n  }\n  function evalPush(bundle, ref, st, tahap) {\n    st = st || statusKontrak(bundle, ref); tahap = tahap === undefined ? tahapKontrak(bundle, ref) : tahap;\n    var aktif = kendalaAktif(bundle).slice().sort(function (a, b) { return s(a.Mulai) < s(b.Mulai) ? -1 : 1; });\n    var b = hidup(bundle.bast), aturan = ref.push.filter(function (r) { return r.Aktif; });\n    for (var i = 0; i < aturan.length; i++) {\n      var r = aturan[i];\n      if (!cocokKondisi(r.Kondisi, st, tahap, aktif, b.length > 0)) continue;\n      var detil = '', lain = aktif.length;\n      if (r.Kondisi.indexOf('KENDALA:') === 0) {\n        var k = r.Kondisi === 'KENDALA:*' ? aktif[0] : aktif.filter(function (x) { return x.Jenis === r.Kondisi.slice(8); })[0];\n        detil = s(k && k.Keterangan); lain = aktif.length - 1;\n      } else if (b.length) {\n        var terbaru = b.slice().sort(function (x, y) { return s(x.UpdatedAt) < s(y.UpdatedAt) ? 1 : -1; })[0];\n        detil = s(terbaru.Keterangan);\n      }\n      if (lain > 0) detil = (detil ? detil + ' ' : '') + '(+' + lain + ')';\n      return { nilai: r.Nilai, detil: detil, kondisi: r.Kondisi, urutan: r.Urutan, cocok: true };\n    }\n    return { nilai: '', detil: '', kondisi: '', cocok: false };\n  }\n  /** Tahap & kendala aktif yang tidak tercakup aturan mana pun (peringatan halaman pengaturan). */\n  function celahAturan(ref) {\n    var kond = ref.push.filter(function (r) { return r.Aktif; }).map(function (r) { return r.Kondisi; }), out = [];\n    var adaKendalaUmum = kond.indexOf('KENDALA:*') >= 0;\n    ref.tahap.forEach(function (x) { if (x.Aktif && !x.Penutup && kond.indexOf('TAHAP:' + x.Kode) < 0) out.push('Tahap ' + x.Label + ' (' + x.Kode + ')'); });\n    if (penutup(ref) && kond.indexOf('CLOSE') < 0) out.push('Kontrak CLOSE');\n    if (!adaKendalaUmum) ref.kendala.forEach(function (x) { if (x.Aktif && kond.indexOf('KENDALA:' + x.Kode) < 0) out.push('Kendala ' + x.Label + ' (' + x.Kode + ')'); });\n    if (kond.indexOf('BELUM_ADA_BAST') < 0) out.push('Kontrak tanpa BAST');\n    return out;\n  }\n\n  // ------------------------------------------------------------------ turunan kontrak\n  var KOL_TURUNAN = ['JenisCustomer', 'TahapKontrak', 'StatusKontrak', 'SisaLokasi', 'KendalaUmum', 'KendalaDetil', 'TglStatusBerubah', 'TglClose'];\n  function turunan(bundle, ref, now) {\n    var k = bundle.k, st = statusKontrak(bundle, ref), tahap = tahapKontrak(bundle, ref), p = evalPush(bundle, ref, st, tahap);\n    var o = { JenisCustomer: jenisCustomer(k.NamaPelanggan, k.EndCustomer), TahapKontrak: tahap, StatusKontrak: st.status,\n              SisaLokasi: s(st.sisa), KendalaUmum: p.nilai, KendalaDetil: p.detil, TglStatusBerubah: s(k.TglStatusBerubah), TglClose: s(k.TglClose) };\n    if (o.StatusKontrak !== s(k.StatusKontrak)) { o.TglStatusBerubah = now; o.TglClose = o.StatusKontrak === 'CLOSE' ? now : ''; }\n    return o;\n  }\n  function terapkanTurunan(bundle, ref, now) { var o = turunan(bundle, ref, now); for (var c in o) bundle.k[c] = o[c]; return bundle; }\n  /** Field wajib yang masih kosong (§5.6, Config.FIELD_WAJIB). */\n  function fieldKurang(bundle, cfg) {\n    var k = bundle.k, daftar = s((cfg || {}).FIELD_WAJIB || 'Customer,EndCustomer,NilaiKontrak,Segment,Populasi,OrderInternal').split(',').map(t).filter(Boolean);\n    var isi = { Customer: k.NamaPelanggan, EndCustomer: k.EndCustomer, NilaiKontrak: k.NilaiKontrak, Segment: k.Segment, Populasi: k.Populasi,\n                JumlahLokasi: k.JumlahLokasi, PIC: k.PIC, TahunProject: k.TahunProject, JenisDok: k.JenisDok,\n                OrderInternal: hidup(bundle.order).length ? 'ada' : '' };\n    return daftar.filter(function (f) { return f in isi && !t(isi[f]); });\n  }\n\n  // ------------------------------------------------------------------ nilai & tanggal\n  function bacaRupiah(v) {\n    if (v === '' || v === null || v === undefined) return { v: '' };\n    if (typeof v === 'number') return isFinite(v) && v >= 0 ? { v: String(Math.round(v)) } : { e: 1 };\n    var x = String(v).replace(/rp/i, '').replace(/\\s/g, '');\n    if (x === '') return { v: '' };\n    if (!/^[\\d.,]+$/.test(x)) return { e: 1 };\n    if (/,\\d{1,2}$/.test(x) && x.indexOf('.') >= 0) x = x.replace(/\\./g, '').replace(',', '.');\n    else if (/\\.\\d{1,2}$/.test(x) && x.indexOf(',') >= 0) x = x.replace(/,/g, '');\n    else if (/^\\d+,\\d{1,2}$/.test(x)) x = x.replace(',', '.');\n    else if (/^\\d+\\.\\d{1,2}$/.test(x)) { /* desimal biasa */ }\n    else x = x.replace(/[.,]/g, '');\n    var n = Number(x);\n    return isFinite(n) ? { v: String(Math.round(n)) } : { e: 1 };\n  }\n  function pad(n) { return (n < 10 ? '0' : '') + n; }\n  /** Tanggal dari Excel (nomor seri), teks dd/mm/yyyy, atau yyyy-mm-dd → 'yyyy-MM-dd'. */\n  function bacaTanggal(v) {\n    if (v === '' || v === null || v === undefined) return { v: '' };\n    var y, m, d;\n    if (typeof v === 'number' || /^\\d{5}(\\.\\d+)?$/.test(s(v))) {\n      var dt = new Date(Math.round((Number(v) - 25569) * 864e5));\n      y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();\n    } else {\n      var a = s(v).trim().match(/^(\\d{1,2})[\\/\\-.](\\d{1,2})[\\/\\-.](\\d{4})$/), b = s(v).trim().match(/^(\\d{4})-(\\d{1,2})-(\\d{1,2})/);\n      if (a) { d = +a[1]; m = +a[2]; y = +a[3]; } else if (b) { y = +b[1]; m = +b[2]; d = +b[3]; } else return { e: 1 };\n    }\n    var c = new Date(Date.UTC(y, m - 1, d));\n    if (c.getUTCMonth() !== m - 1 || y < 2000 || y > 2100) return { e: 1 };\n    return { v: y + '-' + pad(m) + '-' + pad(d) };\n  }\n  function tebakJenisDok(no) {\n    var u = s(no).toUpperCase().trim();\n    return /^TEL\\./.test(u) || /^KL[.\\-\\/ ]/.test(u) ? 'KL' : /^WO[.\\-\\/ ]/.test(u) ? 'WO' : /^SPK/.test(u) ? 'SPK' : /^PO[.\\-\\/ ]/.test(u) ? 'PO' : '';\n  }\n\n  // ------------------------------------------------------------------ operasi kontrak\n  var FIELD_KONTRAK = ['NoKontrak', 'JenisDok', 'TahunProject', 'Populasi', 'NamaPelanggan', 'EndCustomer', 'JudulKontrak', 'Segment', 'NilaiKontrak', 'JumlahLokasi', 'PIC'];\n  var LABEL = { NoKontrak: 'No. kontrak', JenisDok: 'Jenis dok', TahunProject: 'Tahun', Populasi: 'Populasi', NamaPelanggan: 'Customer', EndCustomer: 'End customer',\n                JudulKontrak: 'Judul', Segment: 'Segment', NilaiKontrak: 'Nilai', JumlahLokasi: 'Jumlah lokasi', PIC: 'PIC',\n                DokTagih: 'Dok tagih', CakupanOrder: 'Cakupan order', CakupanLokasi: 'Cakupan lokasi', NoDokBAST: 'No. dokumen', Keterangan: 'Keterangan' };\n  function punya(ctx, izin) { return (ctx.izin || []).indexOf(izin) >= 0; }\n  function cekIzin(ctx, izin) { if (!punya(ctx, izin)) throw galat('IZIN_DITOLAK', 'Anda tidak punya izin untuk aksi ini (' + izin + ').'); }\n\n  function rapikanKontrak(f) {\n    var o = {};\n    FIELD_KONTRAK.forEach(function (c) { if (c in f) o[c] = t(f[c]); });\n    if ('NilaiKontrak' in o) { var r = bacaRupiah(o.NilaiKontrak); wajib(!r.e, 'Nilai kontrak harus angka.'); o.NilaiKontrak = r.v; }\n    if ('JumlahLokasi' in o && o.JumlahLokasi !== '') wajib(/^\\d+$/.test(o.JumlahLokasi) && +o.JumlahLokasi >= 1, 'Jumlah lokasi harus bilangan bulat ≥ 1, atau kosong.');\n    if ('TahunProject' in o && o.TahunProject !== '') wajib(/^(19|20)\\d\\d$/.test(o.TahunProject), 'Tahun project harus 4 digit, mis. 2026.');\n    if ('NoKontrak' in o) { wajib(o.NoKontrak, 'No. kontrak wajib diisi.'); wajib(o.NoKontrak.length <= 120, 'No. kontrak terlalu panjang.'); }\n    if ('JudulKontrak' in o) wajib(o.JudulKontrak, 'Judul kontrak wajib diisi.');\n    return o;\n  }\n  function barisOrder(kid, n, o, ctx) {\n    var j = t(o.JenisOrder).toUpperCase(), no = t(o.NoOrder);\n    wajib(j === 'SO' || j === 'MI', 'Jenis order harus SO atau MI.');\n    wajib(no, 'No. order wajib diisi.');\n    if (t(o.JumlahLokasi) !== '') wajib(/^\\d+$/.test(t(o.JumlahLokasi)), 'Jumlah lokasi order harus angka.');\n    return { OrderID: kid + '-O' + n, KontrakID: kid, JenisOrder: j, NoOrder: no, NoOrderNorm: normKey(no), JenisLayanan: t(o.JenisLayanan), JenisPekerjaan: t(o.JenisPekerjaan),\n             JumlahLokasi: t(o.JumlahLokasi), Keterangan: t(o.Keterangan), Dihapus: 'FALSE', CreatedAt: ctx.now, CreatedBy: ctx.user, UpdatedAt: ctx.now, UpdatedBy: ctx.user, Version: '1' };\n  }\n  function riwayat(b, kode, ctx, ket) {\n    return { BASTID: b.BASTID, KontrakID: b.KontrakID, Siklus: s(b.Siklus || '1'), KodeTahap: kode, Masuk: ctx.now, Oleh: ctx.user, Keterangan: s(ket) };\n  }\n  function bastBaru(bundle, ctx, data) {\n    var k = bundle.k, urut = 1;\n    (bundle.bast || []).forEach(function (b) { urut = Math.max(urut, num(b.Urutan) + 1); });\n    var jc = jenisCustomer(k.NamaPelanggan, k.EndCustomer), doc = t(data.DokTagih) || dokDefault(jc, ctx.cfg);\n    wajib(doc === 'BAST' || doc === 'BAA' || (ctx.ref.dokTagih || []).some(function (d) { return d.Kode === doc; }), 'Dokumen tagih tidak dikenal.');\n    var tahap = t(data.KodeTahap) || tahapPertama(ctx.ref), x = ctx.ref.T[tahap];\n    wajib(x && x.Aktif, 'Tahap awal tidak dikenal atau nonaktif.');\n    var b = { BASTID: k.KontrakID + '-B' + urut, KontrakID: k.KontrakID, Urutan: String(urut), DokTagih: doc, KodeTahap: tahap, Siklus: '1',\n              CakupanOrder: s(data.CakupanOrder), CakupanLokasi: t(data.CakupanLokasi), DaftarLokasi: '', NoDokBAST: '', TglTahapMulai: data.TglTahapMulai || ctx.now,\n              Keterangan: t(data.Keterangan), Status: x.Penutup ? 'CLOSE' : 'OPEN', Dihapus: 'FALSE', CreatedAt: ctx.now, CreatedBy: ctx.user, UpdatedAt: ctx.now, UpdatedBy: ctx.user, Version: '1' };\n    if (b.CakupanLokasi !== '') wajib(/^\\d+$/.test(b.CakupanLokasi), 'Cakupan lokasi harus angka.');\n    return b;\n  }\n  function cariBaris(list, kunci, nilai, nama) { var r = (list || []).filter(function (x) { return x[kunci] === nilai; })[0]; wajib(r, nama + ' tidak ditemukan. Muat ulang data.', 'TIDAK_ADA'); return r; }\n  function catatBantu(bundle, ctx) { var pic = t(bundle.k.PIC); return pic && ctx.alias !== pic ? 'bantu (PIC ' + pic + ')' : ''; }\n\n  /**\n   * Jalankan operasi pada bundle kontrak {k, bast[], order[], kend[], alias[]}.\n   * ctx: {user, nama, alias, now ('yyyy-MM-dd HH:mm:ss'), ref (siapkanRef), cfg, izin[], idKontrak()}\n   * Hasil: {bundle, log[], riwayat[], alias[]} — bundle baru (salinan), daftar log, baris riwayat & alias baru.\n   */\n  function jalankan(op, bundleLama, data, ctx) {\n    data = data || {};\n    var b = bundleLama ? salin(bundleLama) : { k: null, bast: [], order: [], kend: [], alias: [] };\n    ['bast', 'order', 'kend', 'alias'].forEach(function (x) { b[x] = b[x] || []; });\n    var out = { bundle: b, log: [], riwayat: [], alias: [] }, k = b.k;\n    var lg = function (aksi, entitas, id, field, lama, baru, cat) {\n      out.log.push({ aksi: aksi, entitas: entitas, id: id, field: field || '', lama: s(lama), baru: s(baru), catatan: [cat || '', catatBantu(b, ctx)].filter(Boolean).join(' · ') });\n    };\n    if (op !== 'kontrak.buat') { wajib(k, 'Kontrak tidak ditemukan.', 'TIDAK_ADA'); wajib(!bool(k.Arsip) || op === 'kontrak.unarsip', 'Kontrak ini diarsipkan. Kembalikan dari arsip dulu untuk mengubahnya.', 'DIARSIPKAN'); }\n\n    if (op === 'kontrak.buat') {\n      cekIzin(ctx, 'kontrak.daftar');\n      var f = rapikanKontrak(data.f || {});\n      wajib('NoKontrak' in f, 'No. kontrak wajib diisi.'); wajib('JudulKontrak' in f, 'Judul kontrak wajib diisi.');\n      if (!punya(ctx, 'pic.atur')) f.PIC = t(ctx.alias);\n      if (!f.JenisDok) f.JenisDok = tebakJenisDok(f.NoKontrak);\n      var kid = data.KontrakID || ctx.idKontrak();\n      k = b.k = { KontrakID: kid, NoKontrak: f.NoKontrak, NoKontrakNorm: normKey(f.NoKontrak), JenisDok: s(f.JenisDok), TahunProject: s(f.TahunProject), Populasi: s(f.Populasi),\n        NamaPelanggan: s(f.NamaPelanggan), EndCustomer: s(f.EndCustomer), JudulKontrak: f.JudulKontrak, Segment: s(f.Segment), NilaiKontrak: s(f.NilaiKontrak), JumlahLokasi: s(f.JumlahLokasi),\n        PIC: s(f.PIC), JenisCustomer: '', TahapKontrak: '', StatusKontrak: '', SisaLokasi: '', KendalaUmum: '', KendalaDetil: '', TglStatusBerubah: ctx.now,\n        PerluVerifikasi: data.verifikasi ? 'TRUE' : 'FALSE', Arsip: 'FALSE', AlasanArsip: '', SumberAwal: t(data.sumber) || 'MANUAL', TglClose: '',\n        CreatedAt: ctx.now, CreatedBy: ctx.user, UpdatedAt: ctx.now, UpdatedBy: ctx.user, Version: '0' };\n      var seen = {};\n      (data.orders || []).filter(function (o) { return t(o.NoOrder); }).forEach(function (o, i) {\n        var r = barisOrder(kid, i + 1, o, ctx); wajib(!seen[r.NoOrderNorm], 'Ada nomor SO/MI yang dobel: ' + r.NoOrder + '.'); seen[r.NoOrderNorm] = 1; b.order.push(r);\n      });\n      lg('BUAT_KONTRAK', 'Kontrak', kid, '', '', f.NoKontrak, (data.catatan || 'input manual') + (f.PIC ? '; PIC ' + f.PIC : ''));\n      if (data.buatBast !== false) {\n        var nb = bastBaru(b, ctx, { DokTagih: data.dokTagih, KodeTahap: data.tahapAwal, TglTahapMulai: data.tglTahap, Keterangan: data.ketBast,\n          CakupanOrder: b.order.map(function (o) { return o.NoOrder; }).join(', ') });\n        b.bast.push(nb); out.riwayat.push(riwayat(nb, nb.KodeTahap, ctx, 'BAST dibuat'));\n        lg('BUAT_BAST', 'BAST', nb.BASTID, 'DokTagih', '', nb.DokTagih, 'dibuat bersama kontrak');\n        (data.kendala ? [].concat(data.kendala) : []).forEach(function (kd0, i) {\n          var kj = ctx.ref.KD[kd0.Jenis], kid2 = nb.BASTID + '-K' + (i + 1);\n          wajib(kj && kj.Aktif, 'Jenis kendala tidak dikenal.');\n          if (kj.WajibKeterangan) wajib(t(kd0.Keterangan), 'Keterangan kendala wajib diisi.');\n          b.kend.push({ KendalaID: kid2, BASTID: nb.BASTID, KontrakID: kid, Jenis: kj.Kode, Keterangan: t(kd0.Keterangan), Status: 'AKTIF',\n                        Mulai: data.tglTahap || ctx.now, DibuatOleh: ctx.user, Selesai: '', DiselesaikanOleh: '', CatatanSelesai: '', Version: '1' });\n          lg('BUKA_KENDALA', 'Kendala', kid2, 'Jenis', '', kj.Kode, t(kd0.Keterangan));\n        });\n      }\n    } else if (op === 'kontrak.ubah') {\n      cekIzin(ctx, 'kontrak.update');\n      var p = rapikanKontrak(data.f || {});\n      if ('PIC' in p && p.PIC !== s(k.PIC)) cekIzin(ctx, 'pic.atur');\n      var ubah = Object.keys(p).filter(function (c) { return s(p[c]) !== s(k[c]); });\n      if ('NoKontrak' in p && normKey(p.NoKontrak) !== s(k.NoKontrakNorm) && ubah.indexOf('NoKontrak') >= 0) {\n        var lama = k.NoKontrak;\n        if (!(b.alias || []).some(function (a) { return a.AliasNorm === normKey(lama); })) {\n          var al = { AliasNorm: normKey(lama), NoAsli: lama, KontrakID: k.KontrakID, Sumber: 'KOREKSI', Catatan: t(data.alasan), CreatedAt: ctx.now, CreatedBy: ctx.user };\n          b.alias.push(al); out.alias.push(al);\n        }\n        k.NoKontrakNorm = normKey(p.NoKontrak);\n      }\n      ubah.forEach(function (c) { lg(c === 'PIC' ? 'ATUR_PIC' : 'UBAH_KONTRAK', 'Kontrak', k.KontrakID, LABEL[c] || c, k[c], p[c], c === 'NoKontrak' ? 'nomor lama disimpan sebagai alias' : ''); k[c] = p[c]; });\n      if (!ubah.length) out.kosong = true;\n    } else if (op === 'kontrak.pic') {\n      cekIzin(ctx, 'pic.atur');\n      var pic = t(data.PIC);\n      if (pic === s(k.PIC)) out.kosong = true; else { lg('ATUR_PIC', 'Kontrak', k.KontrakID, 'PIC', k.PIC, pic, data.massal ? 'atur PIC massal' : ''); k.PIC = pic; }\n    } else if (op === 'kontrak.arsip') {\n      cekIzin(ctx, 'kontrak.arsip');\n      wajib(t(data.alasan), 'Alasan wajib diisi.');\n      k.Arsip = 'TRUE'; k.AlasanArsip = t(data.alasan); lg('ARSIP_KONTRAK', 'Kontrak', k.KontrakID, 'Arsip', 'tidak', 'ya', t(data.alasan));\n    } else if (op === 'kontrak.unarsip') {\n      cekIzin(ctx, 'kontrak.arsip');\n      k.Arsip = 'FALSE'; k.AlasanArsip = ''; lg('ARSIP_KONTRAK', 'Kontrak', k.KontrakID, 'Arsip', 'ya', 'tidak', 'dikembalikan dari arsip');\n    } else if (op === 'kontrak.verif') {\n      cekIzin(ctx, 'kontrak.update');\n      k.PerluVerifikasi = 'FALSE'; lg('VERIFIKASI', 'Kontrak', k.KontrakID, 'PerluVerifikasi', 'ya', 'tidak', '');\n    } else if (op === 'order.simpan') {\n      cekIzin(ctx, 'kontrak.update');\n      var o = data.o || {}, ada = o.OrderID ? cariBaris(b.order, 'OrderID', o.OrderID, 'SO/MI') : null;\n      var n = ada ? null : b.order.length + 1, r = barisOrder(k.KontrakID, n || 0, o, ctx);\n      var dobel = hidup(b.order).some(function (x) { return x.NoOrderNorm === r.NoOrderNorm && (!ada || x.OrderID !== ada.OrderID); });\n      wajib(!dobel, 'No. order ' + r.NoOrder + ' sudah ada di kontrak ini.');\n      if (ada) {\n        ['JenisOrder', 'NoOrder', 'NoOrderNorm', 'JenisLayanan', 'JenisPekerjaan', 'JumlahLokasi', 'Keterangan'].forEach(function (c) {\n          if (s(ada[c]) !== s(r[c])) { if (c !== 'NoOrderNorm') lg('UBAH_ORDER', 'OrderInternal', ada.OrderID, c, ada[c], r[c]); ada[c] = r[c]; } });\n        ada.UpdatedAt = ctx.now; ada.UpdatedBy = ctx.user; ada.Version = s(num(ada.Version) + 1);\n      } else { b.order.push(r); lg('TAMBAH_ORDER', 'OrderInternal', r.OrderID, 'NoOrder', '', r.NoOrder, r.JenisOrder); }\n    } else if (op === 'order.hapus') {\n      cekIzin(ctx, 'kontrak.update');\n      var oh = cariBaris(b.order, 'OrderID', data.id, 'SO/MI');\n      oh.Dihapus = 'TRUE'; oh.UpdatedAt = ctx.now; oh.UpdatedBy = ctx.user; oh.Version = s(num(oh.Version) + 1);\n      lg('HAPUS_ORDER', 'OrderInternal', oh.OrderID, 'NoOrder', oh.NoOrder, '', '');\n    } else if (op === 'bast.tambah') {\n      cekIzin(ctx, 'kontrak.update');\n      var bb = bastBaru(b, ctx, data);\n      cekCakupan(b, bb, ctx);\n      b.bast.push(bb); out.riwayat.push(riwayat(bb, bb.KodeTahap, ctx, 'BAST dibuat'));\n      lg('BUAT_BAST', 'BAST', bb.BASTID, 'DokTagih', '', bb.DokTagih, bb.CakupanLokasi ? bb.CakupanLokasi + ' lokasi' : '');\n    } else if (op === 'bast.ubah') {\n      cekIzin(ctx, 'kontrak.update');\n      var bu = cariBaris(b.bast, 'BASTID', data.id, 'BAST'), baru = {};\n      ['DokTagih', 'CakupanOrder', 'CakupanLokasi', 'NoDokBAST', 'Keterangan'].forEach(function (c) { if (c in data) baru[c] = t(data[c]); });\n      if ('DokTagih' in baru) wajib(baru.DokTagih === 'BAST' || baru.DokTagih === 'BAA' || (ctx.ref.dokTagih || []).some(function (d) { return d.Kode === baru.DokTagih; }), 'Dokumen tagih tidak dikenal.');\n      if ('CakupanLokasi' in baru && baru.CakupanLokasi !== '') wajib(/^\\d+$/.test(baru.CakupanLokasi), 'Cakupan lokasi harus angka.');\n      var uji = salin(bu); for (var c2 in baru) uji[c2] = baru[c2];\n      cekCakupan(b, uji, ctx, bu.BASTID);\n      var adaUbah = false;\n      Object.keys(baru).forEach(function (c) { if (s(bu[c]) !== baru[c]) { adaUbah = true; lg(c === 'DokTagih' ? 'UBAH_DOKTAGIH' : 'UBAH_BAST', 'BAST', bu.BASTID, LABEL[c] || c, bu[c], baru[c]); bu[c] = baru[c]; } });\n      if (adaUbah) { bu.UpdatedAt = ctx.now; bu.UpdatedBy = ctx.user; bu.Version = s(num(bu.Version) + 1); } else out.kosong = true;\n    } else if (op === 'bast.tahap') {\n      cekIzin(ctx, 'kontrak.update');\n      var bt = cariBaris(b.bast, 'BASTID', data.id, 'BAST'), ke = ctx.ref.T[data.ke], dari = ctx.ref.T[bt.KodeTahap];\n      wajib(ke && ke.Aktif, 'Tahap tujuan tidak dikenal atau nonaktif.');\n      wajib(!bastClose(bt, ctx.ref), 'BAST ini sudah close. Untuk membukanya lagi, buka kendala pemicu reopen (mis. Revisi Dokumen).', 'SUDAH_CLOSE');\n      if (bt.KodeTahap === ke.Kode) { out.kosong = true; }\n      else {\n        var mundur = dari && ke.Urutan < dari.Urutan;\n        if (mundur) wajib(t(data.ket), 'Mundur tahap wajib disertai keterangan.');\n        lg('UBAH_TAHAP', 'BAST', bt.BASTID, 'KodeTahap', bt.KodeTahap, ke.Kode, t(data.ket) + (mundur ? (t(data.ket) ? ' ' : '') + '(mundur)' : ''));\n        bt.KodeTahap = ke.Kode; bt.TglTahapMulai = ctx.now; bt.Status = ke.Penutup ? 'CLOSE' : 'OPEN';\n        bt.UpdatedAt = ctx.now; bt.UpdatedBy = ctx.user; bt.Version = s(num(bt.Version) + 1);\n        out.riwayat.push(riwayat(bt, ke.Kode, ctx, data.ket));\n      }\n    } else if (op === 'kendala.buka') {\n      cekIzin(ctx, 'kontrak.update');\n      var bk = cariBaris(b.bast, 'BASTID', data.bastId, 'BAST'), jk = ctx.ref.KD[data.Jenis], ket = t(data.Keterangan);\n      wajib(jk && jk.Aktif, 'Jenis kendala tidak dikenal atau nonaktif.');\n      if (jk.WajibKeterangan) wajib(ket, 'Keterangan kendala wajib diisi.');\n      if (bastClose(bk, ctx.ref)) {\n        wajib(jk.MemicuReopen, 'BAST ini sudah close. Hanya kendala pemicu reopen (mis. Revisi Dokumen, Return Customer) yang bisa dibuka.', 'SUDAH_CLOSE');\n        var tr = ctx.ref.T[t(data.tahapReopen) || s(ctx.cfg.TAHAP_REOPEN) || 'DRAFTING'];\n        wajib(tr && tr.Aktif && !tr.Penutup, 'Tahap reopen tidak dikenal, nonaktif, atau tahap penutup.');\n        bk.Siklus = s(num(bk.Siklus, 1) + 1); bk.KodeTahap = tr.Kode; bk.TglTahapMulai = ctx.now; bk.Status = 'OPEN';\n        bk.UpdatedAt = ctx.now; bk.UpdatedBy = ctx.user; bk.Version = s(num(bk.Version) + 1);\n        out.riwayat.push(riwayat(bk, tr.Kode, ctx, 'Reopen: ' + jk.Label + (ket ? ' — ' + ket : '')));\n        lg('REOPEN', 'BAST', bk.BASTID, 'Siklus', num(bk.Siklus) - 1, bk.Siklus, jk.Label + ' → ' + tr.Label + (data.dariArsip ? '; dari arsip ' + data.dariArsip : ''));\n      }\n      var nk = b.kend.filter(function (x) { return x.BASTID === bk.BASTID; }).length + 1;\n      var kr = { KendalaID: bk.BASTID + '-K' + nk, BASTID: bk.BASTID, KontrakID: k.KontrakID, Jenis: jk.Kode, Keterangan: ket, Status: 'AKTIF', Mulai: ctx.now,\n                 DibuatOleh: ctx.user, Selesai: '', DiselesaikanOleh: '', CatatanSelesai: '', Version: '1' };\n      b.kend.push(kr); lg('BUKA_KENDALA', 'Kendala', kr.KendalaID, 'Jenis', '', jk.Kode, ket);\n    } else if (op === 'kendala.tutup') {\n      cekIzin(ctx, 'kontrak.update');\n      var kt = cariBaris(b.kend, 'KendalaID', data.id, 'Kendala');\n      wajib(kt.Status === 'AKTIF', 'Kendala ini sudah selesai.');\n      kt.Status = 'SELESAI'; kt.Selesai = ctx.now; kt.DiselesaikanOleh = ctx.user; kt.CatatanSelesai = t(data.catatan); kt.Version = s(num(kt.Version) + 1);\n      lg('TUTUP_KENDALA', 'Kendala', kt.KendalaID, 'Status', 'AKTIF', 'SELESAI', t(data.catatan));\n    } else {\n      throw galat('AKSI_TIDAK_DIKENAL', 'Operasi \"' + op + '\" tidak dikenal.');\n    }\n\n    terapkanTurunan(b, ctx.ref, ctx.now);\n    if (!out.kosong) { b.k.UpdatedAt = ctx.now; b.k.UpdatedBy = ctx.user; b.k.Version = s(num(b.k.Version) + 1); }\n    return out;\n  }\n  function cekCakupan(bundle, bastUji, ctx, gantiId) {\n    var lok = t(bundle.k.JumlahLokasi);\n    if (lok === '') return;\n    var lain = hidup(bundle.bast).filter(function (x) { return x.BASTID !== (gantiId || bastUji.BASTID); });\n    var jumlah = lain.reduce(function (a, x) { return a + num(x.CakupanLokasi, 0); }, 0) + num(bastUji.CakupanLokasi, 0);\n    wajib(jumlah <= num(lok), 'Total cakupan semua BAST (' + jumlah + ') melebihi jumlah lokasi kontrak (' + lok + ').');\n  }\n\n  /** Bandingkan dua bundle → baris yang ditambah/diubah per tab (dipakai server untuk menulis seminimal mungkin). */\n  var KUNCI_TAB = { Kontrak: 'KontrakID', BAST: 'BASTID', OrderInternal: 'OrderID', Kendala: 'KendalaID' };\n  var TAB_BUNDLE = { Kontrak: 'k', BAST: 'bast', OrderInternal: 'order', Kendala: 'kend' };\n  function beda(lama, baru) {\n    var out = { tambah: {}, ubah: {} };\n    Object.keys(TAB_BUNDLE).forEach(function (tab) {\n      var key = KUNCI_TAB[tab], a = lama ? lama[TAB_BUNDLE[tab]] : null, z = baru[TAB_BUNDLE[tab]];\n      if (tab === 'Kontrak') { a = a ? [a] : []; z = z ? [z] : []; }\n      var peta = {}; (a || []).forEach(function (r) { peta[r[key]] = JSON.stringify(r); });\n      (z || []).forEach(function (r) {\n        if (!(r[key] in peta)) (out.tambah[tab] = out.tambah[tab] || []).push(r);\n        else if (peta[r[key]] !== JSON.stringify(r)) (out.ubah[tab] = out.ubah[tab] || []).push(r);\n      });\n    });\n    return out;\n  }\n\n  // ------------------------------------------------------------------ upload Excel (§11.0)\n  var KOL_UPLOAD = { no: ['no kontrak', 'nomor kontrak', 'no wo/spk/kl'], judul: ['judul kontrak', 'judul'], jenis: ['jenis dok'], tahun: ['tahun project', 'tahun'],\n    pop: ['populasi', 'pop'], pel: ['customer', 'direct customer'], end: ['end customer', 'nama pelanggan', 'pelanggan'], seg: ['segment', 'seg'], nilai: ['nilai kontrak', 'nilai'],\n    lok: ['jumlah lokasi'], pic: ['pic'], doc: ['dok tagih bast-1', 'dok tagih'], tahap: ['tahap awal bast-1', 'tahap awal', 'tahap'], tgl: ['tgl masuk tahap', 'tanggal masuk tahap'],\n    kend: ['kendala'], ket: ['keterangan kendala'], cat: ['catatan'], so: ['no so', 'so'], mi: ['no mi', 'mi'] };\n  var KOL_SO = { no: ['no kontrak', 'nomor kontrak'], j: ['jenis'], ono: ['no order'], lay: ['jenis layanan'], pek: ['jenis pekerjaan'], lok: ['jumlah lokasi'], ket: ['keterangan'] };\n  function hNorm(h) { return s(h).toLowerCase().replace(/\\*/g, '').replace(/\\./g, '').replace(/[^a-z0-9\\/-]+/g, ' ').trim(); }\n  function petaKolom(header, def) {\n    var m = {}, hs = header.map(hNorm);\n    Object.keys(def).forEach(function (f) { var i = hs.findIndex(function (h) { return def[f].map(hNorm).indexOf(h) >= 0; }); if (i >= 0) m[f] = i; });\n    return m;\n  }\n  /** aoa (baris pertama = header) → objek per baris dengan nomor baris Excel. */\n  function barisDariAoa(aoa, def) {\n    var m = petaKolom(aoa[0] || [], def);\n    if (m.no === undefined) return null;\n    var out = [];\n    for (var i = 1; i < aoa.length; i++) {\n      var row = aoa[i] || [], o = { baris: i + 1 }, isi = false;\n      Object.keys(m).forEach(function (f) { var v = row[m[f]]; o[f] = v === undefined || v === null ? '' : v; if (s(v).trim() !== '') isi = true; });\n      if (isi) out.push(o);\n    }\n    return out;\n  }\n  function cariRef(list, v) { v = t(v).toLowerCase(); return (list || []).filter(function (x) { return x.Aktif && (x.Kode.toLowerCase() === v || x.Label.toLowerCase() === v); })[0] || null; }\n\n  /**\n   * Periksa baris upload. ctx: {ref, cfg, cariNomor(normKey) → {KontrakID, NoKontrak, viaAlias, lokasi} | null, pic[] (alias PIC aktif),\n   *   bolehPic, alias (PIC user), hariIni ('yyyy-MM-dd')}\n   */\n  /** \"SO-1, SO-2; SO-3\" → ['SO-1','SO-2','SO-3'] (koma, titik koma, atau baris baru). */\n  function pecahNomor(v) { return s(v).split(/[,;\\n]+/).map(t).filter(Boolean); }\n  function periksaUpload(rows, ctx) {\n    var seen = {}, seenOrder = {};\n    return rows.map(function (r) {\n      var o = { baris: r.baris, err: [], warn: [], info: [], st: 'baru' }, v = function (f) { return t(r[f]); };\n      o.no = v('no'); o.judul = v('judul');\n      if (!o.no) { o.err.push('No. kontrak kosong'); o.st = 'error'; return o; }\n      var nk = normKey(o.no);\n      if (seen[nk]) o.err.push('Nomor sama dengan baris ' + seen[nk] + ' di file ini'); else seen[nk] = r.baris;\n      var ada = ctx.cariNomor(nk);\n      o.ada = ada || null;\n      if (ada && ada.lokasi && ada.lokasi !== 'AKTIF') o.info.push('Kontrak ini sudah CLOSE dan tersimpan di arsip ' + ada.lokasi.replace('ARSIP_', '') + '; tidak diubah lewat upload');\n      if (!ada && !o.judul) o.err.push('Judul kontrak wajib diisi');\n      o.jenis = v('jenis');\n      if (o.jenis) { var jd = cariRef(ctx.ref.jenisDok, o.jenis); if (!jd) { o.warn.push('Jenis dok \"' + o.jenis + '\" tidak dikenal, ditebak dari nomor'); o.jenis = ''; } else o.jenis = jd.Kode; }\n      if (!o.jenis && !ada) { o.jenis = tebakJenisDok(o.no); if (o.jenis) o.info.push('Jenis dok ditebak: ' + o.jenis); else o.warn.push('Jenis dok tidak bisa ditebak, dikosongkan'); }\n      o.tahun = v('tahun'); if (/^\\d{4}\\.0+$/.test(o.tahun)) o.tahun = o.tahun.slice(0, 4);\n      if (o.tahun && !/^(19|20)\\d\\d$/.test(o.tahun)) { o.warn.push('Tahun \"' + o.tahun + '\" tidak valid, dikosongkan'); o.tahun = ''; }\n      ['pop:populasi:Populasi', 'seg:segment:Segment'].forEach(function (x) {\n        var p = x.split(':'), val = v(p[0]);\n        if (!val) { o[p[0]] = ''; return; }\n        var rf = cariRef(ctx.ref[p[1]], val);\n        if (!rf) { o.warn.push(p[2] + ' \"' + val + '\" belum ada di Referensi, dikosongkan'); o[p[0]] = ''; } else o[p[0]] = rf.Kode;\n      });\n      o.pel = v('pel'); o.end = v('end');\n      var n = bacaRupiah(r.nilai); if (n.e) o.err.push('Nilai kontrak \"' + v('nilai') + '\" bukan angka'); else o.nilai = n.v;\n      o.lok = v('lok'); if (/^\\d+\\.0+$/.test(o.lok)) o.lok = o.lok.split('.')[0];\n      if (o.lok !== '' && !(/^\\d+$/.test(o.lok) && +o.lok >= 1)) o.err.push('Jumlah lokasi \"' + o.lok + '\" harus bilangan bulat ≥ 1');\n      o.pic = v('pic');\n      if (!ctx.bolehPic) { if (o.pic && o.pic !== ctx.alias) o.warn.push('Kolom PIC diabaikan (butuh izin pic.atur); PIC sementara = Anda'); o.pic = ada ? '' : t(ctx.alias); }\n      else if (o.pic) { var pc = (ctx.pic || []).filter(function (x) { return x.toLowerCase() === o.pic.toLowerCase(); })[0]; if (!pc) { o.warn.push('PIC \"' + o.pic + '\" tidak ada di Users → kontrak tanpa PIC'); o.pic = ''; } else o.pic = pc; }\n      o.doc = v('doc').toUpperCase();\n      if (o.doc && !cariRef(ctx.ref.dokTagih, o.doc) && o.doc !== 'BAST' && o.doc !== 'BAA') o.err.push('Dok tagih \"' + v('doc') + '\" tidak dikenal (BAST atau BAA)');\n      var tv = v('tahap'), tp = tv ? ctx.ref.tahap.filter(function (x) { return x.Aktif && (x.Label.toLowerCase() === tv.toLowerCase() || x.Kode.toLowerCase() === tv.toLowerCase()); })[0] : ctx.ref.T[tahapPertama(ctx.ref)];\n      if (!tp) o.err.push('Tahap \"' + tv + '\" tidak ada. Pilihan: ' + ctx.ref.tahap.filter(function (x) { return x.Aktif; }).map(function (x) { return x.Label; }).join(', ')); else o.tahap = tp.Kode;\n      var tg = bacaTanggal(r.tgl);\n      if (tg.e) o.err.push('Tgl masuk tahap \"' + v('tgl') + '\" tidak terbaca');\n      else if (tg.v && ctx.hariIni && tg.v > ctx.hariIni) o.err.push('Tgl masuk tahap tidak boleh di masa depan');\n      else o.tgl = tg.v;\n      var kv = v('kend'); o.ket = v('ket');\n      if (kv) {\n        var kj = ctx.ref.kendala.filter(function (x) { return x.Aktif && (x.Label.toLowerCase() === kv.toLowerCase() || x.Kode.toLowerCase() === kv.toLowerCase()); })[0];\n        if (!kj) o.err.push('Kendala \"' + kv + '\" tidak ada. Pilihan: ' + ctx.ref.kendala.filter(function (x) { return x.Aktif; }).map(function (x) { return x.Label; }).join(', '));\n        else { o.kend = kj.Kode; if (kj.WajibKeterangan && !o.ket) o.err.push('Keterangan kendala wajib diisi bila Kendala diisi'); }\n      }\n      o.cat = v('cat');\n      // SO/MI ditulis di tab Kontrak, banyak nomor dipisah koma (C18)\n      o.orders = [];\n      [['so', 'SO'], ['mi', 'MI']].forEach(function (x) {\n        var dalam = {};\n        pecahNomor(r[x[0]]).forEach(function (no) {\n          var on = normKey(no);\n          if (dalam[on]) return; dalam[on] = 1;\n          if (seenOrder[on] && seenOrder[on] !== r.baris) o.err.push('No. ' + x[1] + ' ' + no + ' juga ada di baris ' + seenOrder[on]); else seenOrder[on] = r.baris;\n          o.orders.push({ JenisOrder: x[1], NoOrder: no });\n        });\n      });\n      if (!ada) {\n        o.jc = jenisCustomer(o.pel, o.end);\n        if (!o.pel) o.warn.push('Customer kosong → jenis customer BELUM TERDEFINISI (masuk \"Data belum lengkap\")');\n        if (!o.end) o.warn.push('End customer kosong → jenis customer BELUM TERDEFINISI');\n        o.docFinal = o.doc || dokDefault(o.jc, ctx.cfg);\n      }\n      o.st = o.err.length ? 'error' : ada ? 'ada' : o.warn.length ? 'peringatan' : 'baru';\n      return o;\n    });\n  }\n  var LABEL_UP = { judul: 'JudulKontrak', jenis: 'JenisDok', tahun: 'TahunProject', pop: 'Populasi', pel: 'NamaPelanggan', end: 'EndCustomer', seg: 'Segment', nilai: 'NilaiKontrak', lok: 'JumlahLokasi', pic: 'PIC' };\n  /** Mode \"Perbarui\": kolom yang diisi dan berbeda saja. */\n  function perubahanUpload(o, k) {\n    if (!k) return [];\n    var ch = [];\n    Object.keys(LABEL_UP).forEach(function (f) { var v = o[f]; if (v === '' || v === undefined || v === null) return; var c = LABEL_UP[f]; if (s(v) !== s(k[c])) ch.push([c, s(k[c]), s(v)]); });\n    return ch;\n  }\n  function periksaSO(so, rows, cariNomor) {\n    var ok = {}, err = {}, seenO = {};\n    rows.forEach(function (o) { var nk = normKey(o.no); if (o.st !== 'error') ok[nk] = o; });\n    rows.forEach(function (o) { var nk = normKey(o.no); if (o.st === 'error' && o.no && !ok[nk] && !err[nk]) err[nk] = o.baris; });\n    return so.map(function (r) {\n      var x = { baris: r.baris, no: t(r.no), j: t(r.j).toUpperCase(), ono: t(r.ono), lay: t(r.lay), pek: t(r.pek), lok: t(r.lok).replace(/\\.0+$/, ''), ket: t(r.ket), err: [] }, nk = normKey(x.no);\n      if (!x.no) x.err.push('No. kontrak kosong');\n      else if (err[nk]) x.err.push('Kontraknya error di baris ' + err[nk] + ' tab Kontrak, ikut tidak disimpan');\n      else if (!ok[nk] && !cariNomor(nk)) x.err.push('No. kontrak tidak ada di tab Kontrak maupun di SKM');\n      if (x.j !== 'SO' && x.j !== 'MI') x.err.push('Jenis \"' + t(r.j) + '\" harus SO atau MI');\n      if (!x.ono) x.err.push('No. order kosong');\n      else { var on = normKey(x.ono); if (seenO[on]) x.err.push('No. order sama dengan baris ' + seenO[on]); else seenO[on] = x.baris; }\n      if (x.lok !== '' && !/^\\d+$/.test(x.lok)) x.err.push('Jumlah lokasi harus angka');\n      x.st = x.err.length ? 'error' : 'ok'; x.kontrak = ok[nk] || null;\n      return x;\n    });\n  }\n\n  // ------------------------------------------------------------------ import sheet FF format lama (§11.1, F3)\n  var KOL_IMPORT = [['no', 'No. kontrak', ['no wo/spk/kl', 'no kontrak', 'nomor kontrak', 'no wo spk kl']], ['judul', 'Judul kontrak', ['judul kontrak', 'judul']],\n    ['tahun', 'Tahun project', ['tahun project', 'tahun']], ['pop', 'Populasi', ['populasi', 'pop']], ['end', 'End customer', ['nama pelanggan', 'end customer', 'pelanggan']],\n    ['pel', 'Customer (direct)', ['customer', 'nama customer', 'direct customer']], ['seg', 'Segment', ['segment tsat', 'segment', 'seg']], ['nilai', 'Nilai kontrak', ['nilai kontrak', 'nilai']],\n    ['pic', 'PIC', ['pic']], ['status', 'Status awal', ['status awal', 'status']], ['ku', 'Kendala umum (lama)', ['kendala umum']], ['detil', 'Kendala detil', ['kendala detil', 'kendala detail']]];\n  /** Header file → { field: indeks kolom } (dikenali dari judul; -1 = tidak ada). */\n  function petaImport(header) {\n    var hs = (header || []).map(hNorm), m = {};\n    KOL_IMPORT.forEach(function (x) { var al = x[2].map(hNorm); m[x[0]] = hs.findIndex(function (h) { return al.indexOf(h) >= 0; }); });\n    return m;\n  }\n  /** Usulan arti nilai STATUS AWAL / KENDALA UMUM lama (tabel §11.1). tebak = di luar tabel, perlu dicek. */\n  function tebakNilaiLama(v, ref) {\n    var u = t(v).toUpperCase().replace(/\\s+/g, ' '), ada = function (k) { return ref && ref.T && ref.T[k] && ref.T[k].Aktif; };\n    var th = function (k, tebak) { return ada(k) ? { jenis: 'tahap', kode: k, tebak: !!tebak } : { jenis: 'lain' }; };\n    if (!u) return { jenis: 'abaikan' };\n    if (/PARSIAL/.test(u)) return { jenis: 'parsial' };\n    if (/REVISI/.test(u)) return ref && ref.KD && ref.KD.REV_DOKUMEN ? { jenis: 'kendala', kode: 'REV_DOKUMEN' } : { jenis: 'lain' };\n    if (/TAKEOUT|SERTIM/.test(u)) { var pt = penutup(ref || { tahap: [] }); return pt ? { jenis: 'tahap', kode: pt.Kode } : { jenis: 'lain' }; }\n    if (/BAST DONE/.test(u)) return th('BAST_DONE');\n    if (/ON REVIEW/.test(u)) return th('REVIEW_CUST');\n    if (/KOMPULIR/.test(u)) return th('KOMPULIR');\n    if (/SIRKULIR/.test(u)) return th('SIRKULIR', true);\n    if (/REVIEW/.test(u)) return th('REVIEW_CUST', true);\n    if (/DRAFT/.test(u)) return th('DRAFTING', true);\n    return { jenis: 'lain' };\n  }\n  /** Nilai unik STATUS AWAL & KENDALA UMUM + PIC + referensi baru, untuk layar pemetaan. */\n  function ringkasImport(rows, map, ref) {\n    var nilai = {}, pic = {}, refBaru = {};\n    var v = function (r, f) { return map[f] >= 0 ? t(r[map[f]]) : ''; };\n    rows.forEach(function (r) {\n      [v(r, 'status'), v(r, 'ku')].forEach(function (x) { if (!x) return; var k = x.toUpperCase().replace(/\\s+/g, ' '); nilai[k] = (nilai[k] || 0) + 1; });\n      var p = v(r, 'pic'); if (p) pic[p] = (pic[p] || 0) + 1;\n      [['pop', 'populasi', 'Populasi'], ['seg', 'segment', 'Segment']].forEach(function (x) { var val = v(r, x[0]); if (val && !cariRef(ref[x[1]], val)) refBaru[x[2] + ':' + val] = (refBaru[x[2] + ':' + val] || 0) + 1; });\n    });\n    return { nilai: nilai, pic: pic, refBaru: refBaru };\n  }\n  /**\n   * Periksa baris import. rows: [{baris, r:[sel...]}]. o: {map, nilai{NILAI: {jenis,kode}}, pic{nama: alias}, refBaru{'Populasi:X': true}, ref, cfg,\n   *   cariNomor(normKey)}. Hasil per baris: st baru | peringatan | ada | error.\n   */\n  function periksaImport(rows, o) {\n    var seen = {}, ref = o.ref, map = o.map || {};\n    return rows.map(function (row) {\n      var r = row.r || [], v = function (f) { return map[f] >= 0 ? t(r[map[f]]) : ''; };\n      var x = { baris: row.baris, err: [], warn: [], info: [], asal: [], kend: [], parsial: false, st: 'baru' };\n      x.no = v('no').replace(/\\.+$/, ''); x.judul = v('judul'); x.end = v('end'); x.pel = v('pel'); x.detil = v('detil');\n      if (!x.no) { x.err.push('No. kontrak kosong'); x.st = 'error'; return x; }\n      var nk = normKey(x.no);\n      if (seen[nk]) { x.err.push('Nomor sama dengan baris ' + seen[nk] + ' di file ini'); x.st = 'error'; return x; }\n      seen[nk] = row.baris;\n      var ada = o.cariNomor ? o.cariNomor(nk) : null;\n      if (ada) {\n        x.ada = ada; x.st = 'ada';\n        x.info.push('Sudah terdaftar sebagai ' + ada.KontrakID + (ada.viaAlias ? ' (lewat nomor lama)' : '') + (ada.lokasi && ada.lokasi !== 'AKTIF' ? ' di arsip ' + ada.lokasi.replace('ARSIP_', '') : '') + ' · dilewati');\n        return x;\n      }\n      if (!x.judul) { x.judul = x.end ? 'Kontrak ' + x.end : x.no; x.warn.push('Judul kosong → diisi \"' + x.judul + '\", lengkapi saat verifikasi'); }\n      x.jenis = tebakJenisDok(x.no);\n      x.tahun = v('tahun').replace(/\\.0+$/, '');\n      if (x.tahun && !/^(19|20)\\d\\d$/.test(x.tahun)) { x.warn.push('Tahun \"' + x.tahun + '\" tidak valid, dikosongkan'); x.tahun = ''; }\n      var n = bacaRupiah(map.nilai >= 0 ? r[map.nilai] : '');\n      if (n.e) { x.warn.push('Nilai \"' + v('nilai') + '\" tidak terbaca, dikosongkan'); x.nilai = ''; } else x.nilai = n.v;\n      [['pop', 'populasi', 'Populasi'], ['seg', 'segment', 'Segment']].forEach(function (q) {\n        var val = v(q[0]); x[q[0]] = '';\n        if (!val) return;\n        var rf = cariRef(ref[q[1]], val);\n        if (rf) x[q[0]] = rf.Kode;\n        else if ((o.refBaru || {})[q[2] + ':' + val]) { x[q[0]] = val; x.info.push(q[2] + ' baru \"' + val + '\" ditambahkan ke Referensi'); }\n        else x.warn.push(q[2] + ' \"' + val + '\" belum ada di Referensi, dikosongkan');\n      });\n      var p = v('pic'); x.pic = p ? t((o.pic || {})[p]) : '';\n      if (o.bolehPic === false) { if (p && x.pic !== t(o.alias)) x.warn.push('Kolom PIC diabaikan (butuh izin pic.atur); PIC = Anda'); x.pic = t(o.alias); }\n      else if (p && !x.pic) x.warn.push('PIC \"' + p + '\" tidak dipetakan → tanpa PIC');\n      var tahap = null;\n      [v('status'), v('ku')].forEach(function (val) {\n        if (!val) return;\n        var key = val.toUpperCase().replace(/\\s+/g, ' '), m = (o.nilai || {})[key] || tebakNilaiLama(key, ref);\n        if (m.jenis === 'tahap' && ref.T[m.kode]) { if (!tahap || ref.T[m.kode].Urutan > ref.T[tahap].Urutan) tahap = m.kode; x.asal.push(val + ' → tahap ' + ref.T[m.kode].Label); }\n        else if (m.jenis === 'kendala' && ref.KD[m.kode]) { x.kend.push({ Jenis: m.kode, Keterangan: x.detil || val }); x.asal.push(val + ' → kendala ' + ref.KD[m.kode].Label); }\n        else if (m.jenis === 'parsial') { x.parsial = true; x.asal.push(val + ' → ditandai BAST parsial'); }\n        else if (m.jenis === 'abaikan') x.asal.push(val + ' → diabaikan');\n        else { var kl = ref.KD.LAINNYA ? 'LAINNYA' : (ref.kendala.filter(function (k) { return k.Aktif; })[0] || {}).Kode; if (kl) { x.kend.push({ Jenis: kl, Keterangan: val }); x.asal.push(val + ' → kendala ' + ref.KD[kl].Label); } }\n      });\n      x.tahap = tahap || tahapPertama(ref);\n      var dk = {}; x.kend = x.kend.filter(function (k) { if (dk[k.Jenis]) return false; dk[k.Jenis] = 1; return true; });\n      if (ref.T[x.tahap] && ref.T[x.tahap].Penutup) {\n        x.info.push('Langsung CLOSE saat diimport · tanggal close = tanggal import');\n        if (x.kend.length) { x.warn.push('Kendala tidak dibuka karena kontrak langsung CLOSE: ' + x.kend.map(function (k) { return ref.KD[k.Jenis].Label; }).join(', ')); x.kend = []; }\n      }\n      x.ketBast = x.parsial ? 'BAST parsial (dari data lama): lengkapi cakupan lokasi & BAST berikutnya saat verifikasi' + (x.kend.length || !x.detil ? '' : ' · ' + x.detil) : (x.kend.length ? '' : x.detil);\n      x.jc = jenisCustomer(x.pel, x.end);\n      if (!x.pel) x.info.push('Customer kosong → jenis customer BELUM TERDEFINISI');\n      x.doc = dokDefault(x.jc, o.cfg);\n      x.st = x.err.length ? 'error' : x.warn.length ? 'peringatan' : 'baru';\n      return x;\n    });\n  }\n  /** Data operasi kontrak.buat untuk satu baris hasil periksaImport. */\n  function dataImport(x, file) {\n    return { f: { NoKontrak: x.no, JudulKontrak: x.judul, JenisDok: x.jenis, TahunProject: x.tahun, Populasi: x.pop, NamaPelanggan: x.pel, EndCustomer: x.end,\n                  Segment: x.seg, NilaiKontrak: x.nilai, PIC: x.pic },\n             orders: [], dokTagih: x.doc, tahapAwal: x.tahap, ketBast: x.ketBast, kendala: x.kend, verifikasi: true, sumber: 'IMPORT',\n             catatan: 'import data lama ' + file + ' baris ' + x.baris + (x.asal.length ? ' (' + x.asal.join('; ') + ')' : '') };\n  }\n\n  return {\n    KOL_IMPORT: KOL_IMPORT, petaImport: petaImport, tebakNilaiLama: tebakNilaiLama, ringkasImport: ringkasImport, periksaImport: periksaImport, dataImport: dataImport,\n    s: s, t: t, bool: bool, num: num, salin: salin, galat: galat, normKey: normKey, normCust: normCust, jenisCustomer: jenisCustomer, LABEL_JC: LABEL_JC,\n    dokDefault: dokDefault, siapkanRef: siapkanRef, tahapPertama: tahapPertama, penutup: penutup, bastClose: bastClose, hidup: hidup, cakupan: cakupan,\n    statusKontrak: statusKontrak, tahapKontrak: tahapKontrak, bastOpen: bastOpen, hariSejak: hariSejak, bucket: bucket, kendalaAktif: kendalaAktif,\n    evalPush: evalPush, celahAturan: celahAturan, turunan: turunan, terapkanTurunan: terapkanTurunan, KOL_TURUNAN: KOL_TURUNAN, fieldKurang: fieldKurang,\n    bacaRupiah: bacaRupiah, bacaTanggal: bacaTanggal, tebakJenisDok: tebakJenisDok, FIELD_KONTRAK: FIELD_KONTRAK, LABEL: LABEL,\n    jalankan: jalankan, beda: beda, KUNCI_TAB: KUNCI_TAB, TAB_BUNDLE: TAB_BUNDLE,\n    KOL_UPLOAD: KOL_UPLOAD, KOL_SO: KOL_SO, pecahNomor: pecahNomor, petaKolom: petaKolom, barisDariAoa: barisDariAoa, periksaUpload: periksaUpload, perubahanUpload: perubahanUpload, periksaSO: periksaSO\n  };\n})();\nif (typeof module !== 'undefined') module.exports = KD;\n/* ================= Status Kontrak Manager · UI (F1 fondasi + F2 kontrak + F3 dashboard & import) ================= */\n'use strict';\n\nconst S = {\n  token: null, me: null, app: null, katalog: [], theme: 'system', page: 'beranda',\n  users: null, roles: null, uf: '', uq: '', logF: { user: '', aksi: '', hasil: '', bulan: '', q: '' }, roleDraft: null,\n  form: null, formOrig: null, formErr: '', permAnim: false, loginErr: null, gantiErr: '', pw1: '', pw2: '', pwLama: ''\n};\nconst store = {\n  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },\n  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }\n};\nS.token = store.get('skm-token');\nS.theme = store.get('skm-theme') || 'system';\n// menu samping ringkas (hanya ikon): disimpan per browser; bawaan ringkas bila layar < 1200px\nS.mini = store.get('skm-side-mini') === null ? window.innerWidth < 1200 : store.get('skm-side-mini') === '1';\nfunction applyTheme() { const r = document.documentElement; S.theme === 'system' ? r.removeAttribute('data-theme') : r.setAttribute('data-theme', S.theme); }\napplyTheme();\n\nconst can = p => !!(S.me && S.me.izin && S.me.izin.indexOf(p) >= 0);\nconst $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);\n\n/* ---------------- panggilan server ---------------- */\nfunction call(aksi, payload) {\n  return new Promise((resolve, reject) => {\n    if (!window.google || !google.script || !google.script.run) {\n      reject({ kode: 'TANPA_SERVER', pesan: 'Halaman ini harus dibuka lewat URL web app.' }); return;\n    }\n    google.script.run\n      .withSuccessHandler(r => {\n        if (r && r.ok) { resolve(r.data); return; }\n        r = r || { kode: 'ERROR', pesan: 'Tidak ada jawaban dari server.' };\n        if (r.kode === 'SESI_HABIS' && S.me) sesiHabis(r.pesan);\n        else if (r.kode === 'WAJIB_GANTI' && S.me) { S.me.wajibGanti = true; go('ganti'); }\n        reject(r);\n      })\n      .withFailureHandler(e => reject({ kode: 'JARINGAN', pesan: 'Tidak bisa menghubungi server: ' + (e && e.message || e) }))\n      .api(S.token, aksi, payload || {});\n  });\n}\n/** Tombol sibuk: label diganti \"Menyimpan…\" + putaran kecil, supaya jelas permintaan sedang diproses. */\nfunction busy(btn, on, teks) {\n  if (!btn) return;\n  if (on && !btn.classList.contains('busy')) { btn.dataset.lbl = btn.innerHTML; btn.innerHTML = `<span class=\"bspin\" aria-hidden=\"true\"></span>${teks || 'Menyimpan…'}`; }\n  if (!on && btn.classList.contains('busy') && btn.dataset.lbl !== undefined) btn.innerHTML = btn.dataset.lbl;\n  btn.classList.toggle('busy', on); btn.disabled = on;\n}\nfunction gagal(e) { if (e && e.kode !== 'SESI_HABIS' && e.kode !== 'WAJIB_GANTI') toast(e.pesan || String(e), true); }\nfunction sesiHabis(pesan) {\n  resetData();\n  S.me = null; S.token = null; store.set('skm-token', null); closeSheet(true); closeMenu();\n  document.getElementById('overlay-root').innerHTML = '';\n  S.loginErr = { msg: esc(pesan || 'Sesi Anda berakhir. Silakan masuk lagi.'), kind: 'info' };\n  go('login');\n}\n\nfunction keluar() {\n  if (D.antre.length && !confirm(D.antre.length + ' perubahan belum tersimpan akan hilang. Tetap keluar?')) return;\n  call('logout').catch(() => {}); resetData(); S.me = null; S.token = null; store.set('skm-token', null); S.loginErr = null; go('login');\n}\nfunction resetData() {\n  clearTimeout(tarikT); closeDrawer(true); closeKForm();\n  Object.assign(D, { siap: false, memuat: null, seq: 0, base: {}, view: {}, antre: [], kirim: false, flash: {} });\n  S.sel = new Set(); S.riw = {}; S.lama = null; S.arsQ = ''; S.arsHasil = null; S.dash7 = null; S.scopeUser = null;\n}\n/** Setelah masuk: muat data aktif sekali dengan layar progres (bila boleh melihat kontrak). */\nfunction mulaiData() { if (S.me && !S.me.wajibGanti && can('kontrak.lihat') && !D.siap && !D.memuat) muatData(true).then(() => segarkanTampilan()).catch(e => { if (e.kode !== 'SESI_HABIS') toast(e.pesan || String(e), true); }); }\n\n/* ---------------- boot & navigasi ---------------- */\nasync function boot() {\n  try {\n    const b = await call('boot', { data: true });   // satu panggilan: status + profil (bila token masih sah) + katalog + data aktif\n    S.app = b.app; S.katalog = b.katalog;\n    if (!b.siap) { renderBelumSetup(); return; }\n    S.me = b.user || null;\n    if (!S.me && S.token) { S.token = null; store.set('skm-token', null); }\n    if (b.data) muatData(false, b.data);\n    if (b.dash7) S.dash7 = b.dash7;\n    go(S.me ? (S.me.wajibGanti ? 'ganti' : 'beranda') : 'login');\n    mulaiData();\n  } catch (e) { renderFatal(e.pesan || String(e)); }\n}\nfunction go(page) { S.page = page; closeMenu(); closeDrawer(true); render(); window.scrollTo(0, 0); }\n/** Profil terbaru dari jawaban server. Bila izin user.kelola hilang, pindah ke beranda. */\nfunction pakaiMe(me) {\n  if (!me) return;\n  S.me = me;\n  const P = PAGES[S.page];\n  if (P && P.izin && !can(P.izin)) { go('beranda'); return; }\n  // perbarui menu samping & nama di header saja; isi halaman tidak dimuat ulang\n  const side = $('#side'), meBtn = $('#meBtn');\n  if (!side || !meBtn) return;\n  const t = document.createElement('div'); t.innerHTML = shell('', '');\n  side.replaceWith(t.querySelector('#side')); meBtn.replaceWith(t.querySelector('#meBtn'));\n  bindShell();\n}\n\nconst PAGES = {\n  beranda: { title: () => salam() + ', ' + S.me.nama, crumb: () => new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + (S.dMine ? 'kontrak milik Anda' : 'ringkasan tim FF') },\n  perhatian: { title: () => 'Perlu Perhatian', crumb: 'Hal yang perlu ditindaklanjuti · dihitung dari data aktif', izin: 'kontrak.lihat' },\n  kontrak: { title: () => 'Kontrak', crumb: () => D.siap ? semuaKontrak().filter(b => !KD.bool(b.k.Arsip)).length.toLocaleString('id-ID') + ' kontrak aktif · kontrak lama di arsip ikut dicari' : 'Memuat data aktif…', izin: 'kontrak.lihat' },\n  upload: { title: () => 'Upload Excel', crumb: 'Kontrak · tambah banyak kontrak sekaligus', izin: 'kontrak.import', nav: 'kontrak' },\n  import: { title: () => 'Import data lama', crumb: 'Kontrak · sheet FF format lama → SKM', izin: 'kontrak.import', nav: 'kontrak' },\n  pengaturan: { title: () => 'Pengaturan', crumb: 'Tahap, kendala, Nilai Push, referensi, config', izin: 'pengaturan.kelola' },\n  users: { title: () => 'Users', crumb: 'Akun tim FF', izin: 'user.kelola' },\n  role: { title: () => 'Role & izin', crumb: 'Hak akses berupa data, bisa diubah tanpa ubah kode', izin: 'user.kelola' },\n  sistem: { title: () => 'Sistem', crumb: 'Database, skema, dan kesehatan aplikasi', izin: 'user.kelola' },\n  log: { title: () => 'Log audit', crumb: 'Catatan teknis semua aksi (hanya ditambah). Riwayat per kontrak ada di tab Riwayat kontrak.', izin: 'log.semua', nav: 'sistem' }\n};\nconst SOON = [['antrian', 'Antrian', 'inbox', 'F4b'], ['gsheet', 'Google Sheet', 'sync', 'F4a']];\nfunction salam() { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam'; }\n\nfunction render() {\n  const root = document.getElementById('root');\n  if (S.page === 'login' || !S.me) { root.innerHTML = viewLogin(); bindLogin(); return; }\n  if (S.page === 'ganti' || S.me.wajibGanti) { S.page = 'ganti'; root.innerHTML = viewGanti(); bindGanti(); return; }\n  const P = PAGES[S.page] || PAGES.beranda;\n  if (S.page === 'beranda' || S.page === 'perhatian') siapkanLingkup();\n  root.innerHTML = shell(P.title(), typeof P.crumb === 'function' ? P.crumb() : P.crumb);\n  bindShell();\n  loadPage(S.page);\n}\nasync function loadPage(page) {\n  const c = document.getElementById('content');\n  const show = html => {\n    if (S.page !== page || !c.isConnected) return;\n    c.innerHTML = html; [...c.children].forEach((el, i) => el.style.setProperty('--i', i));\n    if (!REDUCED) { c.classList.add('enter'); setTimeout(() => c.classList.remove('enter'), 1400); }\n  };\n  try {\n    // halaman yang dibangun dari data di browser: cek izin di sini (aksi simpannya tetap dicek server)\n    const P = PAGES[page] || {};\n    if (P.izin && !can(P.izin) && ['kontrak', 'perhatian', 'upload', 'import', 'pengaturan'].indexOf(page) >= 0) { show(viewDenied('Halaman ini butuh izin ' + P.izin + '.').replace(' Kejadian ini tercatat di Log.', '')); return; }\n    if (page === 'beranda') { show(viewDash()); bindDash(); return; }\n    if (page === 'perhatian') { show(viewPerhatian()); bindPerhatian(); return; }\n    if (page === 'import') { if (S.imp.step === 4) resetImport(); show(viewImport()); bindImport(); return; }\n    if (page === 'kontrak') { show(viewKontrak()); bindKontrak(); if (S.kf.q) cariArsip(); return; }\n    if (page === 'upload') { show(viewUpload()); bindUpload(); return; }\n    if (page === 'pengaturan') { show(viewPengaturan()); bindPengaturan(); return; }\n    // halaman admin tampil langsung dari data terakhir, lalu diperbarui di latar (C26)\n    const latar = async (key, aksi, payload, view, bind, sebelum) => {\n      const ada = S[key];\n      if (ada) { if (sebelum) sebelum(); show(view()); bind(); } else c.innerHTML = '<div class=\"loading\"><div class=\"spinner\"></div>Memuat…</div>';\n      const r = await call(aksi, payload);\n      if (S.page !== page) return;\n      const beda = JSON.stringify(r) !== JSON.stringify(ada);\n      S[key] = r;\n      if (!ada) { if (sebelum) sebelum(); show(view()); bind(); return; }\n      const sibuk = document.querySelector('#sheet-root .drawer, #overlay-root .scrim, .menu') || (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName));\n      if (beda && !sibuk) { c.innerHTML = view(); [...c.children].forEach((el, i) => el.style.setProperty('--i', i)); bind(); }\n    };\n    if (page === 'users') await latar('users', 'users.list', {}, viewUsers, bindUsers);\n    else if (page === 'role') await latar('roles', 'roles.list', {}, viewRole, bindRole, () => { S.roleDraft = null; });\n    else if (page === 'sistem') await latar('sistem', 'sistem.info', {}, viewSistem, bindSistem);\n    else if (page === 'log') { c.innerHTML = '<div class=\"loading\"><div class=\"spinner\"></div>Memuat…</div>'; S.log = await call('log.list', S.logF); show(viewLog()); bindLog(); }\n  } catch (e) {\n    if (e.kode === 'IZIN_DITOLAK') show(viewDenied(e.pesan));\n    else if (e.kode !== 'SESI_HABIS' && e.kode !== 'WAJIB_GANTI') show(`<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(e.pesan || String(e))}</span></div>`);\n  }\n}\n\n/* ---------------- layar khusus ---------------- */\nfunction renderBelumSetup() {\n  document.getElementById('root').innerHTML = `<div class=\"boot\"><div class=\"card\" style=\"max-width:520px;text-align:left;display:flex;flex-direction:column;gap:12px\">\n    <div class=\"brand\" style=\"padding:0\">${LOGO}<div><b>${esc(S.app ? S.app.nama : 'Status Kontrak Manager')}</b><span>Belum siap dipakai</span></div></div>\n    <div class=\"note warn\">${ic('db', 's')}<span class=\"tx\">Database belum dibuat. Buka editor Apps Script, pilih fungsi <span class=\"mono\">setup</span>, lalu klik <b>Run</b>. Setelah selesai, muat ulang halaman ini.</span></div></div></div>`;\n}\nfunction renderFatal(msg) {\n  document.getElementById('root').innerHTML = `<div class=\"boot\"><div class=\"card\" style=\"max-width:520px;text-align:left\"><h2>Aplikasi tidak bisa dimuat</h2><div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(msg)}</span></div><button class=\"btn\" onclick=\"location.reload()\" style=\"margin-top:12px\">Coba lagi</button></div></div>`;\n}\n\n/* ---------------- shell ---------------- */\nconst avatarOf = u => `<span class=\"av\">${esc(String(u.nama || u.username || '?')[0].toUpperCase())}</span>`;\nfunction shell(title, crumb) {\n  const navOn = (PAGES[S.page] || {}).nav || S.page;\n  const a = (h, l, i, cnt) => `<a href=\"#\" data-go=\"${h}\" title=\"${l}\" class=\"${navOn === h ? 'on' : ''}\">${ic(i)}<span>${l}</span>${cnt ? `<span class=\"cnt\" data-cnt=\"${h}\" hidden></span>` : ''}</a>`;\n  const soon = ([h, l, i, f]) => `<a class=\"soon\" aria-disabled=\"true\" title=\"Dibangun di ${f}\">${ic(i)}<span>${l}</span><span class=\"cnt\">${f}</span></a>`;\n  return `<div class=\"app ${S.mini ? 'mini' : ''}\">\n   <aside class=\"side\" id=\"side\">\n    <div class=\"brand\">${LOGO}<div><b>Status Kontrak<br>Manager</b><span>Unit Fulfillment</span></div></div>\n    <nav class=\"nav\">${a('beranda', 'Dashboard', 'dash')}${can('kontrak.lihat') ? a('kontrak', 'Kontrak', 'doc') + a('perhatian', 'Perlu Perhatian', 'warn', 1) : ''}\n     ${can('user.kelola') || can('pengaturan.kelola') ? `<div class=\"eyebrow\" style=\"padding:16px 12px 6px;font-size:10.5px\">Pengaturan</div>${can('pengaturan.kelola') ? a('pengaturan', 'Tahap & aturan', 'gear') : ''}${can('user.kelola') ? a('users', 'Users', 'users') + a('role', 'Role & izin', 'shield') + a('sistem', 'Sistem', 'db') : ''}` : ''}\n     <div class=\"eyebrow\" style=\"padding:16px 12px 6px;font-size:10.5px\">Fase berikutnya</div>${SOON.map(soon).join('')}</nav>\n    <div class=\"side-foot\"><span class=\"live\"><span class=\"pulse\"></span>Versi ${esc(S.app.versi)} · ${esc(S.app.fase)}</span><span>Skema database v${S.app.skema}</span><span class=\"dim\">Menu redup dibangun di fase berikutnya</span></div>\n   </aside>\n   <div class=\"main\">\n    <header class=\"top\">\n     <button class=\"iconbtn burger\" id=\"burger\" aria-label=\"Buka/ringkas menu samping\" title=\"Buka/ringkas menu samping\">${ic('menu')}</button>\n     <div style=\"min-width:0\"><h1>${esc(title)}</h1><div class=\"crumb\">${esc(crumb)}</div></div>\n     <div class=\"sp\"></div>\n     ${can('kontrak.lihat') ? `<button class=\"cmdk\" id=\"palBtn\" aria-label=\"Cari (Ctrl+K)\">${ic('search', 's')}<span>Cari kontrak, perintah…</span><kbd>Ctrl K</kbd></button>` : ''}\n     <button class=\"syncchip\" id=\"syncChip\" hidden aria-live=\"polite\" title=\"Cara data tersimpan\"></button>\n     <button class=\"iconbtn\" id=\"themeBtn\" aria-label=\"Ganti tema\" title=\"Ganti tema\">${ic({ system: 'auto', light: 'sun', dark: 'moon' }[S.theme])}</button>\n     <button class=\"me\" id=\"meBtn\">${avatarOf(S.me)}<span class=\"nm\">${esc(S.me.nama)} · ${esc(S.me.role)}</span></button>\n    </header>\n    <main class=\"content\" id=\"content\"></main>\n   </div></div>`;\n}\nfunction bindShell() {\n  $('#burger').onclick = e => {\n    e.stopPropagation();\n    if (window.innerWidth <= 900) { $('#side').classList.toggle('open'); return; }\n    S.mini = !S.mini; store.set('skm-side-mini', S.mini ? '1' : '0');\n    const app = document.querySelector('.app'); if (app) app.classList.toggle('mini', S.mini);\n  };\n  $('#themeBtn').onclick = e => cycleTheme(e);\n  $('#syncChip').onclick = infoSync; syncChip();\n  if ($('#palBtn')) $('#palBtn').onclick = e => { e.stopPropagation(); openPalette(); };\n  perbaruiBadge();\n  $$('[data-go]').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.go); });\n  $('#meBtn').onclick = () => modal(esc(S.me.nama) + ' · ' + esc(S.me.role),\n    `<dl class=\"kv\"><dt>Username</dt><dd class=\"mono\">${esc(S.me.username)}</dd><dt>Alias PIC</dt><dd>${esc(S.me.alias) || '—'}</dd><dt>Sesi</dt><dd>berakhir setelah ${S.app.sesiJam} jam tanpa aktivitas</dd></dl>`,\n    [{ l: 'Ganti password', fn: () => { S.pw1 = S.pw2 = S.pwLama = ''; S.gantiErr = ''; go('ganti'); } },\n     { l: 'Keluar', pri: true, fn: () => keluar() }]);\n}\nfunction cycleTheme(e) {\n  const order = ['system', 'light', 'dark'], next = order[(order.indexOf(S.theme) + 1) % 3];\n  const apply = () => { S.theme = next; applyTheme(); store.set('skm-theme', next); const b = $('#themeBtn'); if (b) b.innerHTML = ic({ system: 'auto', light: 'sun', dark: 'moon' }[next]); };\n  if (!document.startViewTransition || REDUCED) { apply(); return; }\n  const x = e.clientX, y = e.clientY, r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));\n  document.startViewTransition(apply).ready.then(() => document.documentElement.animate(\n    { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },\n    { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});\n}\n\n/* ---------------- login & ganti password ---------------- */\nfunction orbit() {\n  const ts = ['Kompulir', 'Drafting', 'Review', 'Sirkulir', 'BAST Done', 'Takeout'], cx = 310, cy = 300, rx = 250, ry = 96;\n  const ep = `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0`;\n  return `<svg class=\"orb\" viewBox=\"0 0 620 600\" aria-hidden=\"true\"><defs><radialGradient id=\"pl\" cx=\".35\" cy=\".3\"><stop offset=\"0\" stop-color=\"var(--accent-hi)\"/><stop offset=\".6\" stop-color=\"var(--accent)\"/><stop offset=\"1\" stop-color=\"var(--violet)\"/></radialGradient></defs><g transform=\"rotate(-12 ${cx} ${cy})\"><ellipse class=\"ring\" cx=\"${cx}\" cy=\"${cy}\" rx=\"${rx}\" ry=\"${ry}\"/><ellipse class=\"ring d\" cx=\"${cx}\" cy=\"${cy}\" rx=\"${rx * .66}\" ry=\"${ry * .62}\"/><circle cx=\"${cx}\" cy=\"${cy}\" r=\"52\" fill=\"url(#pl)\" style=\"filter:drop-shadow(0 0 40px var(--glow))\"/>${ts.map((t, i) => { const a = Math.PI * (1 + i * 1.9 / 5), x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a); return `<circle class=\"nd ${i === 5 ? 'ok' : ''}\" cx=\"${x.toFixed(1)}\" cy=\"${y.toFixed(1)}\" r=\"7\"/><text x=\"${x.toFixed(1)}\" y=\"${(y + (Math.sin(a) > 0.05 ? 26 : -16)).toFixed(1)}\" text-anchor=\"middle\">${t}</text>`; }).join('')}${REDUCED ? '' : `<circle class=\"sat\" r=\"4.5\"><animateMotion dur=\"16s\" repeatCount=\"indefinite\" path=\"${ep}\"/></circle>`}</g></svg>`;\n}\nconst art = () => `<div class=\"login-art\"><div class=\"brand\" style=\"padding:0;position:relative\">${LOGO}<div><b>${esc(S.app.nama)}</b><span>Unit Fulfillment</span></div></div>${orbit()}<h2>Status BAST di satu tempat. <em>Semua sheet unit ikut seragam.</em></h2></div>`;\n\nfunction viewLogin() {\n  const e = S.loginErr;\n  return `<div class=\"login\">${art()}<div class=\"login-form\"><form class=\"box\" id=\"lform\" novalidate>\n   <div><div class=\"eyebrow\">Masuk</div><h3>Selamat datang</h3></div>\n   ${e ? `<div class=\"note ${e.kind}\">${ic(e.kind === 'crit' ? 'lock' : e.kind === 'info' ? 'person' : 'warn', 's')}<span class=\"tx\">${e.msg}</span></div>` : ''}\n   <label class=\"of\"><span>Username</span><input class=\"inp\" id=\"lu\" value=\"${esc(e && e.u || '')}\" autocomplete=\"username\" autocapitalize=\"none\" spellcheck=\"false\"></label>\n   <label class=\"of\"><span>Password</span><input class=\"inp\" id=\"lp\" type=\"password\" autocomplete=\"current-password\"><small>Lupa password? Minta admin FF untuk mereset.</small></label>\n   <button class=\"btn pri\" type=\"submit\" id=\"lbtn\" style=\"justify-content:center;padding:12px\">Masuk</button>\n   <div class=\"row\" style=\"justify-content:space-between\"><span class=\"dim\" style=\"font-size:12px\">v${esc(S.app.versi)}</span><button type=\"button\" class=\"iconbtn\" id=\"lgTheme\" aria-label=\"Ganti tema\">${ic({ system: 'auto', light: 'sun', dark: 'moon' }[S.theme])}</button></div>\n  </form></div></div>`;\n}\nfunction bindLogin() {\n  setTimeout(() => (($('#lu').value ? $('#lp') : $('#lu')) || {}).focus && ($('#lu').value ? $('#lp') : $('#lu')).focus(), 50);\n  $('#lgTheme').onclick = e => { cycleTheme(e); setTimeout(() => { const b = $('#lgTheme'); if (b) b.innerHTML = ic({ system: 'auto', light: 'sun', dark: 'moon' }[S.theme]); }, 30); };\n  $('#lform').onsubmit = async ev => {\n    ev.preventDefault();\n    const u = $('#lu').value.trim(), p = $('#lp').value, btn = $('#lbtn');\n    if (!u || !p) { S.loginErr = { msg: 'Isi username dan password.', kind: 'warn', u }; render(); return; }\n    busy(btn, true, 'Masuk…');\n    try {\n      const r = await call('login', { username: u, password: p });\n      S.token = r.token; store.set('skm-token', r.token); S.me = r.user; S.app = r.app; S.katalog = r.katalog; S.loginErr = null;\n      S.pw1 = S.pw2 = S.pwLama = ''; S.gantiErr = '';\n      go(r.user.wajibGanti ? 'ganti' : 'beranda');\n      mulaiData();\n    } catch (e) {\n      S.loginErr = { msg: esc(e.pesan || String(e)), kind: e.kode === 'TERKUNCI' || e.kode === 'AKUN_NONAKTIF' ? 'crit' : 'warn', u };\n      render();\n    }\n  };\n}\n\nfunction pwRules() {\n  const a = S.pw1, b = S.pw2, min = S.app.passwordMin || 8;\n  const r = [[a.length >= min, 'Minimal ' + min + ' karakter'], [/[A-Za-z]/.test(a) && /\\d/.test(a), 'Berisi huruf dan angka'], [!!a && a === b, 'Kedua isian sama']];\n  if (!S.me.wajibGanti) r.splice(2, 0, [!!a && a !== S.pwLama, 'Berbeda dari password lama']);\n  return r;\n}\nfunction rulesHtml() { return pwRules().map(([y, t]) => `<span class=\"${y ? 'ok' : ''}\"><i>${y ? '✓' : ''}</i>${t}</span>`).join(''); }\nfunction viewGanti() {\n  const wajib = S.me.wajibGanti, ok = pwRules().every(x => x[0]);\n  return `<div class=\"login\">${art()}<div class=\"login-form\"><form class=\"box\" id=\"gform\" novalidate>\n   <div><div class=\"eyebrow\">${wajib ? 'Login pertama' : 'Ganti password'}</div><h3>Buat password baru</h3></div>\n   ${wajib ? `<div class=\"note info\">${ic('key', 's')}<span class=\"tx\">Halo <b>${esc(S.me.nama)}</b>, password sementara harus diganti sebelum masuk ke aplikasi.</span></div>` : ''}\n   ${S.gantiErr ? `<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(S.gantiErr)}</span></div>` : ''}\n   ${wajib ? '' : `<label class=\"of\"><span>Password lama</span><input class=\"inp\" type=\"password\" id=\"pw0\" value=\"${esc(S.pwLama)}\" autocomplete=\"current-password\"></label>`}\n   <label class=\"of\"><span>Password baru</span><input class=\"inp\" type=\"password\" id=\"pw1\" value=\"${esc(S.pw1)}\" autocomplete=\"new-password\"></label>\n   <label class=\"of\"><span>Ulangi password baru</span><input class=\"inp\" type=\"password\" id=\"pw2\" value=\"${esc(S.pw2)}\" autocomplete=\"new-password\"></label>\n   <div class=\"rules\" id=\"rules\">${rulesHtml()}</div>\n   <button class=\"btn pri\" type=\"submit\" id=\"gsave\" style=\"justify-content:center;padding:12px\" ${ok ? '' : 'disabled'}>${wajib ? 'Simpan &amp; masuk' : 'Simpan password'}</button>\n   ${wajib ? `<button type=\"button\" class=\"btn ghost sm\" id=\"gout\" style=\"align-self:flex-start\">Keluar</button>` : `<button type=\"button\" class=\"btn ghost sm\" id=\"gback\" style=\"align-self:flex-start\">Batal</button>`}\n  </form></div></div>`;\n}\nfunction bindGanti() {\n  const upd = () => {\n    S.pw1 = $('#pw1').value; S.pw2 = $('#pw2').value; if ($('#pw0')) S.pwLama = $('#pw0').value;\n    $('#rules').innerHTML = rulesHtml(); $('#gsave').disabled = !pwRules().every(x => x[0]);\n  };\n  ['pw0', 'pw1', 'pw2'].forEach(id => { const el = document.getElementById(id); if (el) el.oninput = upd; });\n  setTimeout(() => ($('#pw0') || $('#pw1')).focus(), 50);\n  if ($('#gback')) $('#gback').onclick = () => go('beranda');\n  if ($('#gout')) $('#gout').onclick = () => keluar();\n  $('#gform').onsubmit = async ev => {\n    ev.preventDefault();\n    if (!pwRules().every(x => x[0])) return;\n    const btn = $('#gsave'); busy(btn, true);\n    try {\n      const r = await call('gantiPassword', { lama: S.pwLama, baru: S.pw1 });\n      S.me = Object.assign(S.me, r.user); S.pw1 = S.pw2 = S.pwLama = ''; S.gantiErr = '';\n      go('beranda'); toast('Password diganti. Password lama tidak berlaku lagi.'); mulaiData();\n    } catch (e) { S.gantiErr = e.pesan || String(e); render(); }\n  };\n}\n\ndocument.addEventListener('click', e => { const b = e.target.closest('[data-go2]'); if (b) go(b.dataset.go2); });\n\n/* ---------------- users ---------------- */\nconst ROLE_META = { ADMIN: ['shield', 'Akses penuh'], STAFF: ['person', 'Isi & kelola'], VIEWER: ['eye', 'Hanya melihat'] };\nconst roleMeta = r => ROLE_META[r] || ['users', 'Role khusus'];\nconst initials = n => String(n || '').trim().split(/\\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';\nconst RING = { AKTIF: 'on', WAJIB_GANTI: 'pw', TERKUNCI: 'lock', NONAKTIF: 'off' };\nconst stLabel = u => ({ AKTIF: 'Aktif', WAJIB_GANTI: 'Wajib ganti password', TERKUNCI: 'Terkunci s/d ' + u.terkunciSampai, NONAKTIF: 'Nonaktif' })[u.status];\nconst ava = (u, size) => `<span class=\"ava ${RING[u.status] || 'on'}\" ${size ? `style=\"--s:${size}px\"` : ''} title=\"${esc(stLabel(u))}\">${esc(initials(u.nama || u.username))}</span>`;\nconst rbadge = r => `<span class=\"rbadge ${esc(r)}\">${ic(roleMeta(r)[0])}${esc(r)}</span>`;\nfunction stPill(u) { const k = RING[u.status]; return `<span class=\"pill ${{ on: 'p-ok', pw: 'p-warn', lock: 'p-crit', off: 'p-dim' }[k]}\">${k === 'lock' ? ic('lock', 's') : '<span class=\"dot\"></span>'}${esc(stLabel(u))}</span>`; }\nconst UF = [['', 'Semua', u => true], ['ADMIN', 'Admin', u => u.role === 'ADMIN' && u.aktif], ['STAFF', 'Staff', u => u.role === 'STAFF' && u.aktif], ['VIEWER', 'Viewer', u => u.role === 'VIEWER' && u.aktif],\n  ['pw', 'Wajib ganti password', u => u.status === 'WAJIB_GANTI'], ['lock', 'Terkunci', u => u.status === 'TERKUNCI'], ['off', 'Nonaktif', u => !u.aktif]];\nfunction viewUsers() {\n  const list = S.users.users, f = UF.find(x => x[0] === S.uf) || UF[0], q = S.uq.toLowerCase();\n  const rows = list.filter(f[2]).filter(u => !q || (u.username + ' ' + u.nama + ' ' + u.alias).toLowerCase().includes(q));\n  return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:14px\">\n   <div class=\"row\"><div class=\"search\">${ic('search', 's')}<input id=\"uq\" placeholder=\"Cari username, nama, alias PIC…\" aria-label=\"Cari user\" value=\"${esc(S.uq)}\"></div><span class=\"sp\"></span><button class=\"btn pri\" id=\"addUser\">${ic('add', 's')}Tambah user</button></div>\n   <div class=\"row\">${UF.map(([k, l, t]) => `<button class=\"chipf ${S.uf === k ? 'on' : ''}\" data-uf=\"${k}\">${l} <b>${list.filter(t).length}</b></button>`).join('')}</div>\n   <div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>User</th><th>Alias PIC</th><th>Role</th><th>Status</th><th>Login terakhir</th><th style=\"width:48px\"></th></tr></thead><tbody>\n   ${rows.map(u => `<tr class=\"click\" data-row=\"${esc(u.username)}\"><td><div class=\"row\" style=\"flex-wrap:nowrap;gap:12px\">${ava(u)}<div style=\"min-width:0\"><b>${esc(u.nama)}</b>${u.username === S.me.username ? ' <span class=\"pill p-acc\" style=\"font-size:10.5px;padding:0 7px\">Anda</span>' : ''}<div class=\"mono dim\" style=\"font-size:11.5px\">${esc(u.username)}</div></div></div></td>\n    <td>${u.alias ? `<span class=\"pill p-dim\">${esc(u.alias)}</span>` : '<span class=\"dim\">—</span>'}</td><td>${rbadge(u.role)}${(u.izinTambahan || []).length ? `<div style=\"margin-top:4px\">${u.izinTambahan.map(i => `<span class=\"pill p-info\" style=\"font-size:10.5px;padding:0 7px\" title=\"Izin tambahan di luar role\">+ ${esc(labelIzin(i))}</span>`).join(' ')}</div>` : ''}</td><td>${stPill(u)}</td>\n    <td class=\"tnum muted\">${esc(u.loginTerakhir ? u.loginTerakhir.slice(0, 16) : '—')}</td><td><button class=\"iconbtn\" data-kebab=\"${esc(u.username)}\" aria-label=\"Aksi untuk ${esc(u.nama)}\">${ic('more')}</button></td></tr>`).join('') || '<tr><td colspan=\"6\" class=\"muted\" style=\"text-align:center;padding:28px\">Tidak ada user yang cocok.</td></tr>'}\n   </tbody></table></div>\n   <div class=\"muted\" style=\"font-size:12px\">Username bebas (NIK, nama, atau apa pun) dan menjadi ID tetap. Cincin avatar: hijau aktif, kuning wajib ganti password, merah terkunci, abu-abu nonaktif.</div></div>`;\n}\nfunction rerenderUsers() { const c = document.getElementById('content'); if (!c || S.page !== 'users') return; c.innerHTML = viewUsers(); bindUsers(); }\nasync function reloadUsers() { try { S.users = await call('users.list'); rerenderUsers(); } catch (e) { gagal(e); } }\n/** Pakai daftar user + profil yang dibawa jawaban server (tanpa panggilan tambahan). */\nfunction pakaiDaftarUser(r) { if (r && r.daftar) { S.users = r.daftar; rerenderUsers(); } if (r && r.me) pakaiMe(r.me); }\nfunction bindUsers() {\n  const q = $('#uq');\n  q.oninput = () => { S.uq = q.value; const pos = q.selectionStart; rerenderUsers(); const n = $('#uq'); n.focus(); n.setSelectionRange(pos, pos); };\n  $$('[data-uf]').forEach(b => b.onclick = () => { S.uf = b.dataset.uf; rerenderUsers(); });\n  $('#addUser').onclick = () => openUserSheet(null);\n  const find = un => S.users.users.find(u => u.username === un);\n  $$('[data-kebab]').forEach(b => b.onclick = e => { e.stopPropagation(); openMenu(b, find(b.dataset.kebab)); });\n  $$('tr[data-row]').forEach(tr => tr.onclick = e => { if (e.target.closest('[data-kebab]')) return; openUserSheet(find(tr.dataset.row)); });\n}\nfunction showTempPw(u, pw, judul) {\n  modal(judul, `<div>Berikan password sementara ini ke <b>${esc(u.nama)}</b> (<span class=\"mono\">${esc(u.username)}</span>). Password <b>tidak ditampilkan lagi</b> setelah jendela ini ditutup, dan wajib diganti saat login.</div>\n   <div class=\"secret\"><span id=\"tpw\" style=\"flex:1\">${esc(pw)}</span><button class=\"btn sm ton\" id=\"cpw\">${ic('copy', 's')}Salin</button></div>\n   <div class=\"muted\" style=\"font-size:12px\">Yang disimpan di database hanya hash + salt, bukan passwordnya.</div>`, [{ l: 'Selesai', pri: true }]);\n  setTimeout(() => { const b = document.getElementById('cpw'); if (b) b.onclick = () => copyText(pw, 'Password sementara disalin.', document.getElementById('tpw')); }, 60);\n}\nfunction copyText(t, msg, el) {\n  const pilih = () => { if (!el) { toast('Salin manual: ' + t); return; } const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Teks sudah dipilih, tekan Ctrl+C.'); };\n  try { navigator.clipboard.writeText(t).then(() => toast(msg), pilih); } catch (e) { pilih(); }\n}\n\n/* menu ⋮ */\nfunction closeMenu() { const m = document.querySelector('.menu'); if (m) m.remove(); }\nfunction openMenu(btn, u) {\n  closeMenu();\n  const r = btn.getBoundingClientRect(), m = document.createElement('div'); m.className = 'menu'; m.setAttribute('role', 'menu');\n  const items = [['edit', 'Ubah data & role', '', () => openUserSheet(u)], ['key', 'Reset password', 'Password sementara baru, wajib diganti', () => openUserSheet(u, { reset: true })]];\n  if (u.status === 'TERKUNCI') items.push(['lock', 'Buka kunci', 'Terkunci sampai ' + u.terkunciSampai, () => simple('users.bukaKunci', { username: u.username }, `Kunci akun ${u.username} dibuka.`)]);\n  items.push(['block', u.aktif ? 'Nonaktifkan' : 'Aktifkan lagi', u.aktif ? 'Tidak bisa login; riwayat tetap ada' : '', () => simple('users.aktif', { username: u.username, aktif: !u.aktif }, u.aktif ? `${u.nama} dinonaktifkan. Riwayatnya tetap tersimpan.` : `${u.nama} bisa login lagi.`)]);\n  m.innerHTML = items.map((it, i) => `<button data-mi=\"${i}\" role=\"menuitem\">${ic(it[0])}<span>${it[1]}${it[2] ? `<small>${esc(it[2])}</small>` : ''}</span></button>`).join('') +\n    `<hr><button class=\"danger\" data-mi=\"del\" role=\"menuitem\" ${u.bisaDihapus ? '' : 'disabled'}>${ic('trash')}<span>Hapus user<small>${u.bisaDihapus ? 'Belum pernah beraktivitas' : 'Sudah punya riwayat. Nonaktifkan saja.'}</small></span></button>`;\n  document.getElementById('overlay-root').appendChild(m);\n  m.style.top = Math.max(12, Math.min(r.bottom + 6, innerHeight - m.offsetHeight - 12)) + 'px';\n  m.style.left = Math.max(12, r.right - m.offsetWidth) + 'px';\n  m.addEventListener('click', e => { e.stopPropagation(); const b = e.target.closest('[data-mi]'); if (!b || b.disabled) return; closeMenu(); b.dataset.mi === 'del' ? confirmDelete(u) : items[+b.dataset.mi][3](); });\n  const first = m.querySelector('button'); if (first) first.focus();\n}\nasync function simple(aksi, payload, okMsg) {\n  try { const r = await call(aksi, payload); toast(okMsg); pakaiDaftarUser(r); } catch (e) { modalGagal(e); }\n}\nfunction modalGagal(e) {\n  if (e.kode === 'SESI_HABIS' || e.kode === 'WAJIB_GANTI') return;\n  modal(e.kode === 'ADMIN_TERAKHIR' || e.kode === 'IZIN_DITOLAK' || e.kode === 'PUNYA_RIWAYAT' ? 'Ditolak server' : 'Gagal', `<div class=\"note crit\">${ic('shield', 's')}<span class=\"tx\">${esc(e.pesan || String(e))}</span></div>`, [{ l: 'Mengerti', pri: true }]);\n}\nfunction confirmDelete(u) {\n  modal('Hapus user?', `<div class=\"row\" style=\"flex-wrap:nowrap;gap:14px\">${ava(u, 44)}<div><b>${esc(u.nama)}</b><div class=\"mono dim\">${esc(u.username)}</div></div></div><div class=\"muted\">User ini belum pernah login atau melakukan aksi apa pun, jadi aman dihapus. Pembuatan dan penghapusannya tetap tercatat di Log.</div>`,\n    [{ l: 'Batal' }, { l: 'Hapus', pri: true, fn: () => { closeSheet(true); simple('users.hapus', { username: u.username }, `User ${u.username} dihapus.`); } }]);\n}\n\n/* panel tambah/ubah user */\nfunction openUserSheet(u, opt) {\n  opt = opt || {};\n  S.form = u ? { username: u.username, nama: u.nama, alias: u.alias, role: u.role, aktif: u.aktif, pwOn: !!opt.reset, pwMode: 'acak', pwTyped: '', pwShow: false, version: u.version, ekstra: (u.izinTambahan || []).slice() }\n             : { username: '', nama: '', alias: '', role: 'STAFF', aktif: true, pwOn: true, pwMode: 'acak', pwTyped: '', pwShow: false, ekstra: [] };\n  S.formOrig = u || null; S.formErr = ''; renderSheet(true);\n  setTimeout(() => { const el = document.querySelector(opt.reset ? '#sheet-root [data-pwmode=\"acak\"]' : u ? '#fn' : '#fu'); if (el) el.focus(); }, 80);\n}\nfunction closeSheet(instant) {\n  const r = document.getElementById('sheet-root'); if (!r.firstChild) return;\n  if (instant || REDUCED) { r.innerHTML = ''; return; }\n  r.firstElementChild.classList.add('closing'); setTimeout(() => { r.innerHTML = ''; }, 300);\n}\nfunction idcardHtml() {\n  const F = S.form, fake = { nama: F.nama || 'Nama user', username: F.username, status: !F.aktif ? 'NONAKTIF' : (F.pwOn || (S.formOrig && S.formOrig.status === 'WAJIB_GANTI')) ? 'WAJIB_GANTI' : (S.formOrig ? S.formOrig.status : 'AKTIF'), terkunciSampai: S.formOrig ? S.formOrig.terkunciSampai : '' };\n  return `${ava(fake, 64)}<div class=\"who\"><b>${esc(F.nama || 'Nama user')}</b><div class=\"mono\" style=\"font-size:12.5px\">${esc(F.username || 'username')}</div>\n   <div class=\"row\" style=\"margin-top:8px;gap:6px\">${rbadge(F.role)}${F.alias ? `<span class=\"pill p-dim\">PIC: ${esc(F.alias)}</span>` : ''}${stPill(fake)}</div></div>`;\n}\nfunction rolePeta() { const m = {}; (S.users.roles || []).forEach(r => { m[r.role] = r.izin; }); return m; }\nfunction permsHtml() { const R = (rolePeta()[S.form.role] || []).concat(S.form.ekstra || []); return (S.users.katalog || []).map(([p, d], i) => `<span class=\"${R.indexOf(p) >= 0 ? '' : 'no'}\" style=\"--i:${i}\" title=\"${p}\">${esc(d)}</span>`).join(''); }\nconst labelIzin = p => ((S.users && S.users.katalog) || S.katalog || []).reduce((a, x) => x[0] === p ? x[1] : a, p);\n/** Izin tambahan per user (di luar role), saat ini kontrak.import (§6, D19). */\nfunction ekstraHtml() {\n  const R = rolePeta()[S.form.role] || [], daftar = (S.users && S.users.izinTambahan) || [];\n  if (!daftar.length) return '';\n  return `<div><div class=\"muted\" style=\"font-size:12px;margin:4px 0 8px\">Izin tambahan <b>di luar role</b>:</div><div style=\"display:flex;flex-direction:column;gap:8px\">${daftar.map(p => { const dariRole = R.indexOf(p) >= 0, on = dariRole || (S.form.ekstra || []).indexOf(p) >= 0;\n    return `<label class=\"swrow\" style=\"cursor:${dariRole ? 'default' : 'pointer'}\"><input type=\"checkbox\" class=\"chk\" data-ekstra=\"${esc(p)}\" ${on ? 'checked' : ''} ${dariRole ? 'disabled' : ''}><div style=\"flex:1\"><b>${esc(labelIzin(p))}</b> <span class=\"mono dim\" style=\"font-size:11px\">${esc(p)}</span><small>${dariRole ? 'Sudah termasuk role ' + esc(S.form.role) + '.' : p === 'kontrak.import' ? 'Menambah banyak kontrak sekaligus dari file (Upload Excel & Import data lama). Bawaan hanya ADMIN.' : 'Diberikan khusus ke user ini.'}</small></div></label>`; }).join('')}</div></div>`;\n}\nconst pwScore = p => { let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return Math.min(4, s); };\nconst SCOL = ['var(--crit)', 'var(--crit)', 'var(--warn)', 'var(--ok)', 'var(--ok)'], SLBL = ['lemah', 'lemah', 'cukup', 'kuat', 'sangat kuat'];\nfunction renderSheet(opening) {\n  const F = S.form, O = S.formOrig, isNew = !O, root = document.getElementById('sheet-root');\n  const sc = root.querySelector('.dbody') ? root.querySelector('.dbody').scrollTop : 0, peta = rolePeta(), sco = pwScore(F.pwTyped);\n  root.innerHTML = `<div><div class=\"dscrim\" id=\"sscrim\" style=\"${opening ? '' : 'animation:none'}\"></div>\n  <aside class=\"drawer ussheet\" role=\"dialog\" aria-modal=\"true\" aria-label=\"${isNew ? 'Tambah user' : 'Ubah user'}\" style=\"width:min(580px,100vw);${opening ? '' : 'animation:none'}\">\n   <div class=\"dhead\" style=\"padding-bottom:14px\"><div class=\"dtop\"><button class=\"iconbtn\" id=\"sclose\" aria-label=\"Tutup\">${ic('x')}</button><div><div class=\"eyebrow\">${isNew ? 'User baru' : 'Ubah user'}</div><div style=\"font-weight:800;font-size:18px\">${isNew ? 'Tambah anggota tim' : esc(O.nama)}</div></div></div></div>\n   <div class=\"dbody\">\n    <div class=\"idcard\" id=\"idcard\">${idcardHtml()}</div>\n    <div class=\"sect\"><div class=\"eyebrow\">Identitas</div>\n     <label class=\"of\"><span>Username</span><input class=\"inp mono\" id=\"fu\" value=\"${esc(F.username)}\" ${isNew ? '' : 'disabled'} autocomplete=\"off\" autocapitalize=\"none\" spellcheck=\"false\" placeholder=\"mis. 95210101 atau dina.lestari\"><small>${isNew ? 'NIK, nama, atau apa pun · 3–32 karakter: huruf, angka, titik, garis bawah, strip. Menjadi ID tetap.' : 'ID tetap, tidak bisa diganti.'}</small></label>\n     <div class=\"grid g2\" style=\"gap:14px\"><label class=\"of\"><span>Nama lengkap</span><input class=\"inp\" id=\"fn\" value=\"${esc(F.nama)}\" autocomplete=\"off\" maxlength=\"80\"></label>\n      <label class=\"of\"><span>Alias PIC</span><input class=\"inp\" id=\"fa\" value=\"${esc(F.alias)}\" autocomplete=\"off\" maxlength=\"40\" placeholder=\"mis. Dina\"><small>Nama di kolom PIC sheet lama. Kosongkan bila bukan PIC.</small></label></div></div>\n    <div class=\"sect\"><div class=\"eyebrow\">Role & akses</div>\n     <div class=\"rcards\" role=\"radiogroup\" aria-label=\"Role\">${Object.keys(peta).map(r => { const m = roleMeta(r); return `<button type=\"button\" class=\"rcard ${F.role === r ? 'on' : ''}\" data-role=\"${esc(r)}\" role=\"radio\" aria-checked=\"${F.role === r}\">${ic(m[0])}<b>${esc(r)}</b><small>${m[1]} · ${peta[r].length} izin</small></button>`; }).join('')}</div>\n     <div><div class=\"muted\" style=\"font-size:12px;margin-bottom:8px\">User ini bisa:</div><div class=\"perms ${S.permAnim ? 'anim' : ''}\" id=\"perms\">${permsHtml()}</div></div>${ekstraHtml()}</div>\n    <div class=\"sect\"><div class=\"eyebrow\">Password</div>\n     ${isNew ? '' : `<div class=\"swrow\"><div style=\"flex:1\"><b>Reset password</b><small>Biarkan mati bila password tidak diganti</small></div><button type=\"button\" class=\"toggle ${F.pwOn ? 'on' : ''}\" id=\"pwOn\" aria-label=\"Reset password\" aria-pressed=\"${F.pwOn}\"></button></div>`}\n     ${F.pwOn ? `<div class=\"seg\" role=\"group\" aria-label=\"Cara membuat password\"><button type=\"button\" data-pwmode=\"acak\" class=\"${F.pwMode === 'acak' ? 'on' : ''}\">Buat acak</button><button type=\"button\" data-pwmode=\"ketik\" class=\"${F.pwMode === 'ketik' ? 'on' : ''}\">Ketik sendiri</button></div>\n      ${F.pwMode === 'acak' ? `<div class=\"note ok\">${ic('key', 's')}<span class=\"tx\">Password acak dibuat server saat disimpan, lalu <b>ditampilkan sekali</b> untuk Anda sampaikan ke user.</span></div>`\n      : `<div><label class=\"of\"><span>Password</span><div style=\"position:relative\"><input class=\"inp mono\" id=\"fpw\" type=\"${F.pwShow ? 'text' : 'password'}\" value=\"${esc(F.pwTyped)}\" autocomplete=\"new-password\" style=\"width:100%;padding:12px 44px 10px 12px\"><button type=\"button\" class=\"iconbtn\" id=\"pwEye\" aria-label=\"${F.pwShow ? 'Sembunyikan' : 'Tampilkan'} password\" style=\"position:absolute;right:2px;top:2px\">${ic('eye', 's')}</button></div></label>\n        <div class=\"strength\"><i id=\"pwBar\" style=\"width:${sco * 25}%;background:${SCOL[sco]}\"></i></div>\n        <div class=\"muted\" style=\"font-size:12px;margin-top:6px\" id=\"pwHint\">Minimal ${S.app.passwordMin} karakter, berisi huruf dan angka.</div></div>`}\n      <div class=\"note info\">${ic('key', 's')}<span class=\"tx\">User <b>wajib mengganti</b> password ini saat login berikutnya${isNew ? '' : ', dan sesi aktifnya diakhiri'}.</span></div>` : ''}\n    </div>\n    ${isNew ? '' : `<div class=\"sect\"><div class=\"eyebrow\">Status</div><div class=\"swrow\"><div style=\"flex:1\"><b>Akun aktif</b><small>User bisa login selama akun aktif</small></div><button type=\"button\" class=\"toggle ${F.aktif ? 'on' : ''}\" id=\"stOn\" aria-label=\"Akun aktif\" aria-pressed=\"${F.aktif}\"></button></div>\n      <div class=\"danger-zone\"><div style=\"flex:1;min-width:200px\"><b style=\"color:var(--crit)\">Hapus user</b><div class=\"muted\" style=\"font-size:12px\">${O.bisaDihapus ? 'Tersedia karena user ini belum pernah login atau melakukan aksi.' : 'Tidak tersedia: user ini sudah punya riwayat. Nonaktifkan saja supaya Log tetap utuh.'}</div></div><button type=\"button\" class=\"btn sm danger\" id=\"delUser\" ${O.bisaDihapus ? '' : 'disabled'}>${ic('trash', 's')}Hapus</button></div></div>`}\n    <div id=\"ferr\">${S.formErr ? `<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(S.formErr)}</span></div>` : ''}</div>\n   </div>\n   <div class=\"sfoot\"><button class=\"btn\" id=\"scancel\">Batal</button><button class=\"btn pri\" id=\"ssave\">${ic('check', 's')}${isNew ? 'Buat user' : 'Simpan'}</button></div>\n  </aside></div>`;\n  root.querySelector('.dbody').scrollTop = sc;\n  bindSheet();\n}\nfunction bindSheet() {\n  const q = s => document.querySelector('#sheet-root ' + s), F = S.form, refresh = () => { q('#idcard').innerHTML = idcardHtml(); };\n  q('#sclose').onclick = q('#scancel').onclick = () => closeSheet();\n  q('#sscrim').onclick = () => goyang(document.querySelector('#sheet-root .drawer'));\n  q('#fu').oninput = e => { F.username = e.target.value.trim().toLowerCase(); refresh(); };\n  q('#fn').oninput = e => { F.nama = e.target.value; refresh(); };\n  q('#fa').oninput = e => { F.alias = e.target.value.trim(); refresh(); };\n  document.querySelectorAll('#sheet-root [data-role]').forEach(b => b.onclick = () => { F.role = b.dataset.role; S.permAnim = true; renderSheet(false); S.permAnim = false; });\n  document.querySelectorAll('#sheet-root [data-ekstra]').forEach(c => c.onchange = () => { const p = c.dataset.ekstra; F.ekstra = (F.ekstra || []).filter(x => x !== p); if (c.checked) F.ekstra.push(p); q('#perms').innerHTML = permsHtml(); });\n  if (q('#pwOn')) q('#pwOn').onclick = () => { F.pwOn = !F.pwOn; renderSheet(false); };\n  if (q('#stOn')) q('#stOn').onclick = () => { F.aktif = !F.aktif; renderSheet(false); };\n  document.querySelectorAll('#sheet-root [data-pwmode]').forEach(b => b.onclick = () => { F.pwMode = b.dataset.pwmode; renderSheet(false); if (F.pwMode === 'ketik') setTimeout(() => q('#fpw') && q('#fpw').focus(), 30); });\n  if (q('#pwEye')) q('#pwEye').onclick = () => { F.pwShow = !F.pwShow; renderSheet(false); setTimeout(() => { const i = q('#fpw'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 20); };\n  if (q('#fpw')) q('#fpw').oninput = e => {\n    F.pwTyped = e.target.value; const s = pwScore(F.pwTyped), ok = F.pwTyped.length >= S.app.passwordMin && /[A-Za-z]/.test(F.pwTyped) && /\\d/.test(F.pwTyped);\n    q('#pwBar').style.width = s * 25 + '%'; q('#pwBar').style.background = SCOL[s];\n    q('#pwHint').textContent = ok ? 'Memenuhi syarat · kekuatan: ' + SLBL[s] : `Minimal ${S.app.passwordMin} karakter, berisi huruf dan angka.`; q('#pwHint').style.color = ok ? 'var(--ok)' : '';\n  };\n  if (q('#delUser')) q('#delUser').onclick = () => confirmDelete(S.formOrig);\n  q('#ssave').onclick = saveUser;\n}\nasync function saveUser() {\n  const F = S.form, O = S.formOrig, btn = document.querySelector('#sheet-root #ssave');\n  const err = m => { S.formErr = m; renderSheet(false); const b = document.querySelector('#sheet-root .dbody'); b.scrollTop = 1e5; };\n  if (!F.nama.trim()) return err('Nama lengkap wajib diisi.');\n  const R = rolePeta()[F.role] || [];\n  const payload = { baru: !O, username: F.username, nama: F.nama.trim(), alias: F.alias, role: F.role, aktif: F.aktif, version: F.version, izinTambahan: (F.ekstra || []).filter(p => R.indexOf(p) < 0),\n                    password: F.pwOn ? { mode: F.pwMode, nilai: F.pwMode === 'ketik' ? F.pwTyped : '' } : null };\n  busy(btn, true);\n  try {\n    const r = await call('users.simpan', payload);\n    closeSheet(); pakaiDaftarUser(r);\n    const target = { username: r.username, nama: F.nama.trim() };\n    if (r.passwordAcak) setTimeout(() => showTempPw(target, r.passwordAcak, O ? 'Password direset' : 'User dibuat'), 320);\n    else toast(!O ? `User ${r.username} dibuat. Wajib ganti password saat login pertama.` : F.pwOn ? 'Disimpan. Password baru wajib diganti saat login.' : 'Perubahan disimpan dan dicatat di Log.');\n  } catch (e) {\n    if (e.kode === 'SESI_HABIS' || e.kode === 'WAJIB_GANTI') return;\n    if (e.kode === 'KONFLIK') { await reloadUsers(); }\n    busy(btn, false); err(e.pesan || String(e));\n  }\n}\n\n/* ---------------- role & izin ---------------- */\nfunction viewRole() {\n  const base = {}; S.roles.roles.forEach(r => { base[r.role] = r.izin; });\n  const R = S.roleDraft || base, roles = Object.keys(base), dirty = !!S.roleDraft;\n  return `<div class=\"card\"><h2>Matriks izin<small>${roles.length} role · ${S.roles.katalog.length} izin</small><span class=\"sp\"></span><button class=\"btn sm\" id=\"addRole\">${ic('add', 's')}Role baru</button></h2>\n   <div class=\"tbl-wrap\"><table class=\"t matrix\"><thead><tr><th>Izin</th>${S.roles.roles.map(r => `<th>${esc(r.role)}<div class=\"dim\" style=\"font-size:10.5px;text-transform:none;letter-spacing:0\">${r.jumlahUser} user aktif</div></th>`).join('')}</tr></thead><tbody>\n   ${S.roles.katalog.map(([p, d]) => `<tr><td><span class=\"mono\" style=\"font-size:12px\">${p}</span><div class=\"muted\" style=\"font-size:12px\">${esc(d)}</div></td>${roles.map(r => { const on = R[r].indexOf(p) >= 0, orig = base[r].indexOf(p) >= 0; return `<td style=\"${dirty && on !== orig ? 'background:var(--accent-bg)' : ''}\"><input type=\"checkbox\" class=\"chk\" data-perm=\"${esc(r)}|${p}\" aria-label=\"${esc(r)} ${p}\" ${on ? 'checked' : ''}></td>`; }).join('')}</tr>`).join('')}\n   </tbody></table></div>\n   ${dirty ? `<div class=\"bulk\" style=\"margin-top:14px\"><b>Ada perubahan belum disimpan</b><span class=\"sp\"></span><button class=\"btn sm\" id=\"roleCancel\">Batal</button><button class=\"btn sm pri\" id=\"roleSave\">Simpan izin</button></div>` : ''}\n  </div>\n  <div class=\"note info\">${ic('shield', 's')}<span class=\"tx\">Setiap permintaan dicek izinnya di server, bukan hanya disembunyikan di layar. Permintaan tanpa izin ditolak dan tercatat sebagai <b>IZIN_DITOLAK</b> di Log. Perubahan izin berlaku pada permintaan berikutnya setiap user, tanpa login ulang.</span></div>`;\n}\nfunction rerenderRole() { const c = document.getElementById('content'); c.innerHTML = viewRole(); bindRole(); }\nfunction bindRole() {\n  $$('[data-perm]').forEach(c => c.onchange = () => {\n    const [role, p] = c.dataset.perm.split('|');\n    if (!S.roleDraft) { S.roleDraft = {}; S.roles.roles.forEach(r => { S.roleDraft[r.role] = r.izin.slice(); }); }\n    const l = S.roleDraft[role]; if (c.checked) l.push(p); else l.splice(l.indexOf(p), 1);\n    rerenderRole();\n  });\n  if ($('#roleCancel')) $('#roleCancel').onclick = () => { S.roleDraft = null; rerenderRole(); };\n  if ($('#roleSave')) $('#roleSave').onclick = async () => {\n    const btn = $('#roleSave'); busy(btn, true);\n    try {\n      const r = await call('roles.simpan', { peta: S.roleDraft });\n      toast(`${r.diubah} izin diubah. Berlaku di permintaan berikutnya.`);\n      S.roles = r.daftar; S.roleDraft = null;\n      if (r.me && JSON.stringify(r.me.izin) !== JSON.stringify(S.me.izin)) pakaiMe(r.me); else { S.me = r.me || S.me; rerenderRole(); }\n    }\n    catch (e) { busy(btn, false); modalGagal(e); }\n  };\n  $('#addRole').onclick = () => modal('Role baru', `<label class=\"of\"><span>Nama role</span><input class=\"inp mono\" id=\"rn\" placeholder=\"mis. KOORDINATOR\"></label><label class=\"of\"><span>Salin izin dari</span><select class=\"inp\" id=\"rc\"><option value=\"\">— tanpa izin —</option>${S.roles.roles.map(r => `<option>${esc(r.role)}</option>`).join('')}</select></label>`,\n    [{ l: 'Batal' }, { l: 'Buat', pri: true, fn: d => {\n      const nama = d.querySelector('#rn').value, dari = d.querySelector('#rc').value;\n      call('roles.buat', { nama, salinDari: dari }).then(r => { toast(`Role ${r.role} dibuat. Atur izinnya di tabel.`); S.roles = r.daftar; S.roleDraft = null; rerenderRole(); }).catch(modalGagal);\n    } }]);\n}\n\n/* ---------------- log ---------------- */\nfunction viewLog() {\n  const L = S.log, f = S.logF;\n  const sel = (id, lbl, opts, v) => `<select class=\"inp\" id=\"${id}\" aria-label=\"${lbl}\"><option value=\"\">${lbl}: semua</option>${opts.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;\n  const bln = b => new Date(b + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });\n  return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:14px\"><div class=\"row\">\n   <select class=\"inp\" id=\"lfb\" aria-label=\"Periode\"><option value=\"\">30 hari terakhir</option>${(L.daftarBulan || []).map(b => `<option value=\"${esc(b)}\" ${b === f.bulan ? 'selected' : ''}>${esc(bln(b))}</option>`).join('')}</select>\n   <div class=\"search\" style=\"max-width:260px\">${ic('search', 's')}<input id=\"lfq\" placeholder=\"Cari ID, nilai, catatan…\" value=\"${esc(f.q || '')}\"></div>\n   ${L.semua ? sel('lfu', 'User', L.users, f.user) : ''}${sel('lfa', 'Aksi', L.aksi, f.aksi)}${sel('lfr', 'Hasil', ['BERHASIL', 'GAGAL', 'DITOLAK'], f.hasil)}\n   <span class=\"sp\"></span><span class=\"muted tnum\">${L.entri.length < L.total ? `${L.entri.length} terbaru dari ${L.total}` : L.total + ' entri'}</span><button class=\"btn sm\" data-go2=\"sistem\">Kembali ke Sistem</button></div>\n   <div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Entitas</th><th>Detail</th><th>Hasil</th></tr></thead><tbody>\n   ${L.entri.map(l => `<tr><td class=\"tnum\" style=\"white-space:nowrap\">${esc(l.waktu)}</td><td class=\"mono\">${esc(l.user)}</td><td><span class=\"pill p-dim\">${esc(l.aksi)}</span></td><td>${esc(l.entitas)} <span class=\"mono\" style=\"font-size:12px\">${esc(l.id)}</span></td>\n     <td class=\"muted\">${l.field ? `<span class=\"mono\">${esc(l.field)}</span>: ${esc(l.lama)} → ${esc(l.baru)} ` : ''}${esc(l.catatan)}</td><td class=\"${l.hasil === 'BERHASIL' ? 'res-ok' : 'res-no'}\">${esc(l.hasil)}</td></tr>`).join('') || '<tr><td colspan=\"6\" class=\"muted\" style=\"text-align:center;padding:24px\">Tidak ada entri.</td></tr>'}\n   </tbody></table></div>\n   <div class=\"muted\" style=\"font-size:12px\">Log disimpan per bulan (file per tahun, tab per bulan) supaya tetap cepat. Log hanya bisa ditambah; tidak ada yang bisa mengubah atau menghapus entri, termasuk admin. Password tidak pernah dicatat.</div></div>`;\n}\nfunction bindLog() {\n  const q = document.getElementById('lfq'); let lt = null;\n  if (q) q.oninput = () => { clearTimeout(lt); lt = setTimeout(() => { S.logF.q = q.value; loadPage('log'); }, 500); };\n  [['lfb', 'bulan'], ['lfu', 'user'], ['lfa', 'aksi'], ['lfr', 'hasil']].forEach(([id, k]) => { const el = document.getElementById(id); if (el) el.onchange = () => { S.logF[k] = el.value; loadPage('log'); }; });\n}\n\n/* ---------------- sistem ---------------- */\nfunction viewSistem() {\n  const I = S.sistem, daftar = I.db.akses || [], akses = daftar.length;\n  return `<div class=\"grid g2\">\n   <div class=\"card\"><h2>${ic('db', 's')} Database</h2><dl class=\"kv\"><dt>File</dt><dd class=\"mono\">${esc(I.db.nama)}</dd><dt>Pemilik</dt><dd>${esc(I.akunFF) || 'akun FF'}</dd><dt>Akses file</dt><dd>${akses <= 2 ? '<span class=\"pill p-ok\">aman</span>' : '<span class=\"pill p-crit\">terlalu banyak</span>'} <span class=\"muted\" style=\"font-size:12px\">${akses} akun</span><div class=\"mono dim\" style=\"font-size:11.5px;margin-top:4px\">${daftar.map(esc).join('<br>')}</div></dd><dt>Versi aplikasi</dt><dd>${esc(I.app.versi)} (${esc(I.app.fase)})</dd><dt>Versi skema</dt><dd>v${esc(I.skemaDb)}</dd><dt>Dibuat</dt><dd>${esc(I.dibuat)}</dd></dl></div>\n   <div class=\"card\"><h2>${ic('check', 's')} Pemeriksaan kesehatan<span class=\"sp\"></span><button class=\"btn sm\" id=\"health\">Jalankan</button></h2><div id=\"hres\"><div class=\"muted\" style=\"font-size:13px\">Klik <b>Jalankan</b> untuk memeriksa database, skema, admin, role, config, dan akses file.</div></div></div>\n   <div class=\"card\"><h2>${ic('log', 's')} Arsip tahunan</h2><dl class=\"kv\"><dt>Pemicu bulanan</dt><dd>${I.arsip.pemicu ? '<span class=\"pill p-ok\">terpasang</span> <span class=\"muted\" style=\"font-size:12px\">tanggal 1 tiap bulan ±01.00</span>' : I.arsip.pemicu === null ? '<span class=\"pill p-crit\">izin belum lengkap</span> <span class=\"muted\" style=\"font-size:12px\">jalankan mintaIzin di editor</span>' : '<span class=\"pill p-warn\">belum terpasang</span>'}</dd>\n     <dt>Pindah setelah</dt><dd>${esc(I.arsip.setelahHari)} hari sejak CLOSE</dd><dt>Terakhir jalan</dt><dd>${esc(I.arsip.terakhir) || '<span class=\"muted\">belum pernah</span>'}</dd>\n     <dt>File arsip & log</dt><dd>${(I.db.files || []).map(f => `<div class=\"mono\" style=\"font-size:11.5px\">${esc(f.nama)} ${f.hilang ? '<span class=\"pill p-crit\">tidak bisa dibuka</span>' : f.akses.length > 2 ? '<span class=\"pill p-crit\">' + f.akses.length + ' akun</span>' : ''}</div>`).join('') || '<span class=\"muted\">belum ada</span>'}</dd></dl>\n    ${can('pengaturan.kelola') ? `<div class=\"row\" style=\"margin-top:12px\">${I.arsip.pemicu ? '' : '<button class=\"btn sm pri\" id=\"arsPemicu\">Pasang pemicu arsip</button>'}<button class=\"btn sm\" id=\"arsJalan\">Jalankan pindah arsip sekarang</button></div>` : ''}</div>\n   ${can('log.semua') ? `<div class=\"card\"><h2>${ic('log', 's')} Log audit</h2><p class=\"muted\" style=\"margin:0 0 12px\">Semua aksi tetap dicatat (login, perubahan, penolakan izin) di file <span class=\"mono\">SKM_LOG_&lt;tahun&gt;</span> sebagai bukti bila diperlukan. Untuk kerja harian, riwayat siapa mengubah apa ada di tab <b>Riwayat</b> setiap kontrak.</p><button class=\"btn sm\" data-go2=\"log\">Buka log audit</button></div>` : ''}\n   <div class=\"card\"><h2>Tab di database</h2><div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Tab</th><th class=\"num\">Baris data</th></tr></thead><tbody>${I.db.tabs.map(t => `<tr><td class=\"mono\">${esc(t.tab)}</td><td class=\"num\">${t.baris}</td></tr>`).join('')}</tbody></table></div>\n    <div class=\"muted\" style=\"font-size:12px;margin-top:8px\">Tab baru ditambahkan otomatis oleh migrasi. Log ada di file SKM_LOG_&lt;tahun&gt;; kontrak lama di SKM_ARSIP_&lt;tahun&gt;.</div></div>\n   <div class=\"card\"><h2>Riwayat migrasi</h2><div class=\"tl\">${I.riwayat.slice().reverse().map(e => `<div class=\"e\"><span class=\"b\"></span><span class=\"w\">${esc(e.waktu)}</span><span><b>v${e.dari} → v${e.ke}</b> · ${esc(e.oleh)}<br><span class=\"muted\" style=\"font-size:12px\">${esc(e.langkah.join(' · '))}</span></span></div>`).join('')}</div>\n    <div class=\"muted\" style=\"font-size:12px;margin-top:8px\">Migrasi hanya menambah tab/kolom, tidak pernah menghapus data.</div></div>\n   <div class=\"card\" style=\"grid-column:1/-1\"><h2>Config</h2><div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Key</th><th>Nilai</th><th>Arti</th><th></th></tr></thead><tbody>${I.config.map(c => `<tr><td class=\"mono\" style=\"font-size:12px\">${esc(c.key)}</td><td><input class=\"inp\" data-cfg=\"${esc(c.key)}\" value=\"${esc(c.nilai)}\" aria-label=\"${esc(c.key)}\" style=\"max-width:240px\" ${can('pengaturan.kelola') ? '' : 'disabled'}></td><td class=\"muted\" style=\"font-size:12.5px\">${esc(c.ket)}</td><td>${can('pengaturan.kelola') ? `<button class=\"btn sm\" data-cfgsave=\"${esc(c.key)}\">Simpan</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>\n  </div>`;\n}\nfunction bindSistem() {\n  $('#health').onclick = async () => {\n    const btn = $('#health'); busy(btn, true, 'Memeriksa…');\n    try { const r = await call('sistem.cek'); $('#hres').innerHTML = r.hasil.map(h => `<div class=\"check\"><span class=\"d ${h.ok ? 'y' : ''}\" style=\"${h.ok ? '' : 'background:var(--crit);color:#fff'}\">${h.ok ? '✓' : '!'}</span><span>${esc(h.nama)}${h.catatan ? `<br><span class=\"muted\" style=\"font-size:12px\">${esc(h.catatan)}</span>` : ''}</span></div>`).join(''); toast(`Pemeriksaan selesai: ${r.hasil.filter(h => h.ok).length} dari ${r.hasil.length} OK.`); }\n    catch (e) { gagal(e); } finally { busy(btn, false); }\n  };\n  if ($('#arsPemicu')) $('#arsPemicu').onclick = async () => { const b = $('#arsPemicu'); busy(b, true); try { const r = await call('arsip.pemicu'); toast(r.aktif ? 'Pemicu arsip bulanan terpasang.' : 'Pemicu belum terpasang.'); loadPage('sistem'); } catch (e) { busy(b, false); modalGagal(e); } };\n  if ($('#arsJalan')) $('#arsJalan').onclick = async () => { const b = $('#arsJalan'); busy(b, true, 'Memindahkan…'); try { const r = await call('arsip.jalankan'); toast(r.dipindah ? `${r.dipindah} kontrak dipindah ke arsip${r.sisa ? ', ' + r.sisa + ' sisa (jalankan lagi)' : ''}.` : 'Tidak ada kontrak yang perlu dipindah.'); if (r.dipindah) muatUlangDiam(); loadPage('sistem'); } catch (e) { busy(b, false); modalGagal(e); } };\n  $$('[data-cfgsave]').forEach(b => b.onclick = async () => {\n    const key = b.dataset.cfgsave, nilai = document.querySelector(`[data-cfg=\"${key}\"]`).value; busy(b, true);\n    try { const r = await call('config.simpan', { key, nilai }); toast(r.berubah ? `${key} disimpan.` : 'Tidak ada perubahan.'); S.app = Object.assign(S.app, r.app); }\n    catch (e) { modalGagal(e); } finally { busy(b, false); }\n  });\n}\nfunction viewDenied(pesan) {\n  return `<div class=\"card denied\"><div class=\"big\">${ic('shield')}</div><h2 style=\"margin:0;font-size:20px\">Anda tidak punya izin untuk halaman ini</h2>\n  <p class=\"muted\" style=\"margin:0;max-width:52ch\">${esc(pesan)} Kejadian ini tercatat di Log.</p><button class=\"btn\" data-go2=\"beranda\">Kembali ke beranda</button></div>`;\n}\n\n/* ---------------- modal & toast ---------------- */\nfunction modal(title, body, acts) {\n  const d = document.createElement('div'); d.className = 'scrim';\n  d.innerHTML = `<div class=\"modal\" role=\"dialog\" aria-modal=\"true\"><h3>${title}</h3>${body}<div class=\"acts\">${acts.map((a, i) => `<button class=\"btn ${a.pri ? 'pri' : ''}\" data-a=\"${i}\">${a.l}</button>`).join('')}</div></div>`;\n  document.getElementById('overlay-root').appendChild(d);\n  const close = () => { d.classList.add('closing'); setTimeout(() => d.remove(), 200); };\n  // jendela berisi isian: klik di luar tidak menutup; Esc/Batal minta konfirmasi bila isian sudah diubah (C12)\n  const isian = () => [...d.querySelectorAll('input:not([type=checkbox]):not([type=radio]),select,textarea')].map(x => x.value).join('\\u0001');\n  const awal = isian(), adaIsian = !!d.querySelector('input,select,textarea'), berubah = () => adaIsian && isian() !== awal;\n  d._close = () => { if (berubah() && !confirm('Isian di jendela ini belum disimpan. Tutup dan buang isian?')) return; close(); };\n  d.addEventListener('click', e => {\n    if (e.target === d) { if (adaIsian) { const m = d.querySelector('.modal'); m.classList.remove('goyang'); void m.offsetWidth; m.classList.add('goyang'); } else close(); return; }\n    const b = e.target.closest('[data-a]'); if (!b) return;\n    const a = acts[+b.dataset.a];\n    if (!a.fn && !a.pri && berubah() && !confirm('Isian di jendela ini belum disimpan. Tutup dan buang isian?')) return;\n    if (!a.fn || a.fn(d) !== false) close();\n  });\n  setTimeout(() => { const f = d.querySelector('input:not([disabled]),select,.btn.pri'); if (f) f.focus(); }, 60);\n}\nlet toastT;\nfunction toast(m, isErr) {\n  const old = document.querySelector('.toast'); if (old) old.remove();\n  const t = document.createElement('div'); t.className = 'toast' + (isErr ? ' err' : ''); t.setAttribute('role', 'status');\n  t.innerHTML = ic(isErr ? 'warn' : 'check', 's') + '<span>' + esc(m) + '</span>'; document.body.appendChild(t);\n  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), isErr ? 6000 : 3400);\n}\ndocument.addEventListener('keydown', e => {\n  if (e.key !== 'Escape') return;\n  if (document.querySelector('.menu')) { closeMenu(); return; }\n  const m = [...document.querySelectorAll('#overlay-root .scrim:not(.closing)')].pop(); if (m) { m._close(); return; }\n  if (document.getElementById('kform-root')) { tutupKFormTanya(); return; }\n  if (S.drawer) { closeDrawer(); return; }\n  closeSheet();\n});\ndocument.addEventListener('click', () => { closeMenu(); const s = $('#side'); if (s) s.classList.remove('open'); });\nwindow.addEventListener('resize', closeMenu);\n\n\n/* ================= F2 · data aktif di browser, antrean simpan, tarik perubahan (§4.4) ================= */\nconst D = { siap: false, memuat: null, seq: 0, base: {}, view: {}, antre: [], kirim: false, refRaw: null, ref: null, cfg: {}, users: [], hariIni: '',\n            tersimpan: 0, terakhirTarik: 0, gagalKirim: 0, flash: {}, tempN: 0, dibuka: {}, petaTemp: {} };\n\nconst pad2 = n => (n < 10 ? '0' : '') + n;\nfunction sekarangStr() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }\nfunction hariIniStr() { return sekarangStr().slice(0, 10); }\nfunction agingBatas() { const a = String(D.cfg.AGING_BATAS || '7,14,30').split(',').map(Number); return a.length === 3 && a.every(isFinite) ? a : [7, 14, 30]; }\n\nfunction terimaRef(refRaw, cfg, users) {\n  if (refRaw) { D.refRaw = refRaw; D.ref = KD.siapkanRef(refRaw); }\n  if (cfg) D.cfg = cfg;\n  if (users) D.users = users;\n}\nfunction dariKompak(t) { return (t.r || []).map(r => { const o = {}; t.c.forEach((c, i) => { o[c] = r[i]; }); return o; }); }\nfunction bundleDariSnapshot(tabs) {\n  const m = {};\n  dariKompak(tabs.Kontrak).forEach(k => { m[k.KontrakID] = { k, bast: [], order: [], kend: [], alias: [] }; });\n  [['BAST', 'bast'], ['OrderInternal', 'order'], ['Kendala', 'kend'], ['KontrakAlias', 'alias']].forEach(([tab, key]) => {\n    if (tabs[tab]) dariKompak(tabs[tab]).forEach(r => { if (m[r.KontrakID]) m[r.KontrakID][key].push(r); });\n  });\n  return m;\n}\nfunction ctxKlien(a) {\n  return { user: S.me.username, nama: S.me.nama, alias: S.me.alias || '', now: (a && a.now) || sekarangStr(), ref: D.ref, cfg: D.cfg, izin: S.me.izin || [],\n           idKontrak: () => (a && a.kid) || ('K-BARU-' + (++D.tempN)) };\n}\nfunction hitungView(kid) {\n  let b = D.base[kid] ? D.base[kid] : null, ada = false;\n  D.antre.forEach(a => {\n    if (a.kid !== kid) return;\n    try { b = KD.jalankan(a.op, b, a.data, ctxKlien(a)).bundle; a.err = null; ada = true; } catch (e) { a.err = e; }\n  });\n  if (b) D.view[kid] = ada ? b : D.base[kid]; else delete D.view[kid];\n}\nfunction hitungSemuaView() { D.view = {}; Object.keys(D.base).forEach(k => { D.view[k] = D.base[k]; }); new Set(D.antre.map(a => a.kid)).forEach(hitungView); }\nconst semuaKontrak = () => Object.values(D.view);\nconst idAsli = kid => D.petaTemp[kid] || kid;\nconst kontrak = kid => D.view[kid] || D.view[D.petaTemp[kid]] || null;\n\n/** Terapkan entri feed perubahan ke data dasar. Mengembalikan {orangLain[], muatUlang, muatRef}. */\nfunction terapkanFeed(entri) {\n  const out = { orangLain: [], muatUlang: false, muatRef: false };\n  (entri || []).forEach(e => {\n    if (e.muatUlang) out.muatUlang = true;\n    if (e.muatRef) out.muatRef = true;\n    (e.bundle ? [e.bundle] : (e.bundles || [])).forEach(b => {\n      const kid = b.k.KontrakID, lama = D.base[kid];\n      if (lama && Number(lama.k.Version) > Number(b.k.Version)) return;\n      D.base[kid] = b;\n      if (b.k.UpdatedBy && S.me && b.k.UpdatedBy !== S.me.username && (!lama || lama.k.Version !== b.k.Version)) { out.orangLain.push(b); D.flash[kid] = Date.now(); }\n    });\n  });\n  return out;\n}\n/** Pasang hasil data.muat (atau data yang ikut di boot). */\nfunction pasangData(r) {\n  terimaRef(r.ref, r.cfg, r.users);\n  D.base = bundleDariSnapshot(r.snap.tabs); D.seq = r.snap.seq; D.hariIni = r.hariIni || hariIniStr();\n  if (r.feed && !r.feed.muatUlang) { terapkanFeed(r.feed.entri); D.seq = r.feed.seq; }\n  hitungSemuaView(); D.siap = true; D.terakhirTarik = Date.now();\n  return !!(r.feed && r.feed.muatUlang);\n}\n/** Muat data aktif. tampil=true memunculkan layar progres (saat aplikasi dibuka). pre = data yang sudah ikut di boot. */\nfunction muatData(tampil, pre) {\n  if (D.memuat) return D.memuat;\n  if (pre) { const ulang = pasangData(pre); jadwalTarik(); syncChip(); return ulang ? muatUlangDiam() : Promise.resolve(); }\n  const ov = tampil ? layarProgres('Memuat data aktif', ['Menghubungi server', 'Kontrak aktif', 'BAST, SO/MI, kendala', 'Siap: daftar, filter, cari & detail kini instan']) : null;\n  if (ov) ov.langkah(0);\n  D.memuat = call('data.muat').then(r => {\n    if (ov) ov.langkah(1, 'Kontrak aktif · ' + r.snap.tabs.Kontrak.r.length.toLocaleString('id-ID') + ' kontrak');\n    const ulang = pasangData(r);\n    if (ov) { ov.langkah(3); ov.selesai(); }\n    jadwalTarik(); syncChip();\n    if (ulang) return muatUlangDiam();\n  }).catch(e => { if (ov) ov.selesai(); throw e; }).finally(() => { D.memuat = null; });\n  return D.memuat;\n}\n\n/* ---------- tarik perubahan dari anggota tim lain ---------- */\nlet tarikT = null;\nfunction jadwalTarik() {\n  clearTimeout(tarikT);\n  const det = Math.max(15, Number(D.cfg.SINKRON_KLIEN_DETIK) || 30);\n  tarikT = setTimeout(() => { if (!S.me) return; if (document.hidden) { jadwalTarik(); return; } tarik().finally(jadwalTarik); }, det * 1000);\n}\ndocument.addEventListener('visibilitychange', () => { if (!document.hidden && D.siap && S.me && Date.now() - D.terakhirTarik > 20000) tarik().finally(jadwalTarik); });\nasync function tarik(diam) {\n  if (!D.siap || !S.me) return;\n  let r;\n  try { r = await call('data.perubahan', { sejak: D.seq }); } catch (e) { return; }\n  D.terakhirTarik = Date.now();\n  if (r.hariIni) D.hariIni = r.hariIni;\n  if (r.muatUlang) { await muatUlangDiam(); return; }\n  const hasil = terapkanFeed(r.entri), diubahOrangLain = hasil.orangLain, perluRef = hasil.muatRef, perluMuat = hasil.muatUlang;\n  D.seq = r.seq;\n  if (perluMuat) { await muatUlangDiam(); return; }\n  if (perluRef) { try { const x = await call('data.ref'); terimaRef(x.ref, x.cfg, x.users); } catch (e) { /* coba lagi nanti */ } }\n  if ((r.entri || []).length) {\n    hitungSemuaView();\n    segarkanTampilan();\n    if (!diam && diubahOrangLain.length) {\n      const b = diubahOrangLain[0], nama = namaUser(b.k.UpdatedBy);\n      toast(diubahOrangLain.length === 1 ? `${nama} mengubah ${b.k.KontrakID}. Tampilan diperbarui otomatis.` : `${diubahOrangLain.length} kontrak diubah anggota tim lain. Tampilan diperbarui otomatis.`);\n    }\n  }\n  syncChip();\n}\nasync function muatUlangDiam() {\n  try {\n    const r = await call('data.muat');\n    pasangData(r);\n    segarkanTampilan();\n  } catch (e) { /* coba lagi pada tarikan berikutnya */ }\n}\nfunction namaUser(u) { const x = D.users.find(z => z.username === u); return x ? (x.alias || x.nama || u) : u; }\n\n/* ---------- antrean simpan (optimis) ---------- */\n/** Jalankan operasi: tampilan langsung berubah, server menyusul di latar. Mengembalikan false bila ditolak aturan. */\nfunction jalankanOp(op, kid, data, opt) {\n  opt = opt || {};\n  const a = { id: Math.random().toString(36).slice(2), op, kid, data: KD.salin(data || {}), now: sekarangStr() };\n  if (op === 'kontrak.buat') { a.kid = 'K-BARU-' + (++D.tempN); a.data.KontrakID = a.kid; a.tempKid = a.kid; }\n  try { KD.jalankan(op, op === 'kontrak.buat' ? null : kontrak(a.kid), a.data, ctxKlien(a)); }\n  catch (e) { if (opt.lempar) throw e; modalGagal({ kode: e.kode, pesan: e.message }); return false; }\n  D.antre.push(a);\n  hitungView(a.kid);\n  syncChip(); segarkanTampilan();\n  prosesAntre();\n  return a.kid;\n}\nfunction gantiTemp(temp, real) {\n  D.petaTemp[temp] = real;\n  D.antre.forEach(a => { if (a.kid === temp) { a.kid = real; a.data = JSON.parse(JSON.stringify(a.data).split(temp).join(real)); } });\n  delete D.view[temp];\n  if (S.drawer === temp) S.drawer = real;\n  if (S.sel && S.sel.has(temp)) { S.sel.delete(temp); S.sel.add(real); }\n}\nasync function prosesAntre() {\n  if (D.kirim || !D.antre.length || !S.me) return;\n  D.kirim = true; syncChip();\n  const a = D.antre[0], b0 = D.base[a.kid];\n  try {\n    const kirimData = KD.salin(a.data); delete kirimData.KontrakID;\n    const r = await call('kontrak.op', { op: a.op, kid: a.op === 'kontrak.buat' ? '' : a.kid, versi: b0 ? b0.k.Version : '', tempKid: a.tempKid || '',\n      bundle: b0 ? { bast: b0.bast, order: b0.order, kend: b0.kend, alias: b0.alias } : null, data: kirimData });\n    D.antre.shift(); D.gagalKirim = 0;\n    const real = r.bundle.k.KontrakID;\n    if (a.op === 'kontrak.buat') { gantiTemp(a.kid, real); }\n    D.base[real] = r.bundle;\n    hitungView(real);\n    D.tersimpan = Date.now();\n  } catch (e) {\n    if ((e.kode === 'JARINGAN' || e.kode === 'SIBUK') && D.gagalKirim < 6) {\n      D.gagalKirim++; D.kirim = false; syncChip();\n      setTimeout(prosesAntre, Math.min(30000, 2000 * Math.pow(2, D.gagalKirim)));\n      return;\n    }\n    D.antre.shift(); D.gagalKirim = 0;\n    hitungView(a.kid);\n    if (e.kode !== 'SESI_HABIS') {\n      modal('Perubahan tidak tersimpan', `<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(e.pesan || String(e))}</span></div><div class=\"muted\" style=\"font-size:12.5px\">Tampilan dikembalikan ke data terakhir di server.</div>`, [{ l: 'Mengerti', pri: true }]);\n      if (e.kode === 'KONFLIK' || e.kode === 'DI_ARSIP') tarik(true);\n    }\n  }\n  D.kirim = false;\n  syncChip(); segarkanTampilan();\n  if (D.antre.length) prosesAntre();\n}\nwindow.addEventListener('beforeunload', e => { if (D.antre.length) { e.preventDefault(); e.returnValue = ''; } });\n\n/* ---------- tanda simpan/sinkron di bilah atas ---------- */\nfunction syncChip() {\n  const el = document.getElementById('syncChip'); if (!el) return;\n  if (!D.siap) { el.hidden = true; return; }\n  el.hidden = false;\n  const n = D.antre.length, now = Date.now();\n  if (n) { el.className = 'syncchip busy'; el.innerHTML = `<span class=\"bspin\"></span>Menyimpan ${n} perubahan…`; return; }\n  if (D.gagalKirim) { el.className = 'syncchip warn'; el.innerHTML = `${ic('warn', 's')}Mencoba lagi…`; return; }\n  if (now - D.tersimpan < 8000) { el.className = 'syncchip ok'; el.innerHTML = `${ic('check', 's')}Tersimpan ${new Date(D.tersimpan).toTimeString().slice(0, 5)}`; return; }\n  const d = Math.round((now - D.terakhirTarik) / 1000);\n  el.className = 'syncchip'; el.innerHTML = `<span class=\"pulse\"></span>Data terbaru · ${d < 10 ? 'baru saja' : d < 120 ? d + ' dtk lalu' : Math.round(d / 60) + ' mnt lalu'}`;\n}\nsetInterval(syncChip, 5000);\nfunction infoSync() {\n  modal('Cara data tersimpan', `<div style=\"display:grid;gap:10px\">\n   <div class=\"note info\">${ic('sync', 's')}<span class=\"tx\"><b>Data kontrak aktif ada di browser</b> sejak aplikasi dibuka, jadi daftar, filter, cari, dan detail langsung tampil tanpa menunggu server.</span></div>\n   <div class=\"note info\">${ic('check', 's')}<span class=\"tx\"><b>Setiap perubahan langsung tampil</b>, lalu disimpan ke server di latar (±3–4 dtk). Tanda di bilah atas: <i>Menyimpan…</i> → <i>Tersimpan</i>. Bila ditolak (mis. bentrok dengan perubahan orang lain), tampilan dikembalikan dan muncul pesan.</span></div>\n   <div class=\"note info\">${ic('person', 's')}<span class=\"tx\"><b>Perubahan anggota tim lain</b> masuk otomatis tiap ±${Number(D.cfg.SINKRON_KLIEN_DETIK) || 30} detik.</span></div>\n   <div class=\"muted\" style=\"font-size:12px\">Jangan tutup tab saat tanda <i>Menyimpan…</i> masih tampil; browser akan mengingatkan.</div></div>`,\n   [{ l: 'Tarik sekarang', fn: () => { tarik(); } }, { l: 'Mengerti', pri: true }]);\n}\n\n/* ---------- layar progres ---------- */\nfunction layarProgres(judul, langkah) {\n  const ov = document.createElement('div'); ov.className = 'loadov';\n  ov.innerHTML = `<div class=\"loadbox\" role=\"status\" aria-live=\"polite\"><div class=\"uic big\">${ic('sync')}</div><h3>${esc(judul)}</h3><ol class=\"lsteps\">${langkah.map(l => `<li>${esc(l)}</li>`).join('')}</ol></div>`;\n  document.body.appendChild(ov);\n  const li = [...ov.querySelectorAll('li')];\n  return {\n    el: ov,\n    langkah(i, teks) { li.forEach((x, j) => { x.className = j < i ? 'done' : j === i ? 'on' : ''; }); if (teks && li[i]) li[i].textContent = teks; },\n    selesai() { li.forEach(x => { x.className = 'done'; }); ov.classList.add('out'); setTimeout(() => ov.remove(), REDUCED ? 0 : 450); }\n  };\n}\n\n/* ---------- unduh file dari base64 ---------- */\nfunction unduhBase64(nama, b64, mime) {\n  const bin = atob(b64), u = new Uint8Array(bin.length);\n  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);\n  const url = URL.createObjectURL(new Blob([u], { type: mime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));\n  const a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click();\n  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);\n}\n\n/* ================= Pembaca .xlsx tanpa pustaka luar (jaringan kantor memblokir CDN, §4.1) =================\n * File .xlsx = zip berisi XML. Zip dibaca manual, isi dideflate dengan DecompressionStream bawaan browser,\n * lalu XML dibaca dengan DOMParser. Hasil: [{nama, aoa}] (baris pertama = header). Angka tetap angka (tanggal = nomor seri Excel).\n */\nconst XLSXR = (function () {\n  const td = new TextDecoder();\n  async function inflate(u8) {\n    if (typeof DecompressionStream === 'undefined') throw new Error('Browser ini belum bisa membaca file Excel. Pakai Chrome atau Edge versi terbaru.');\n    const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));\n    return new Uint8Array(await new Response(s).arrayBuffer());\n  }\n  function daftarZip(buf) {\n    const dv = new DataView(buf), n = buf.byteLength;\n    let eocd = -1;\n    for (let i = n - 22; i >= Math.max(0, n - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }\n    if (eocd < 0) throw new Error('File ini bukan .xlsx. Simpan ulang dari Excel sebagai \"Excel Workbook (.xlsx)\".');\n    const jumlah = dv.getUint16(eocd + 10, true), out = {};\n    let p = dv.getUint32(eocd + 16, true);\n    for (let k = 0; k < jumlah; k++) {\n      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Isi file .xlsx rusak.');\n      const metode = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);\n      out[td.decode(new Uint8Array(buf, p + 46, nlen))] = { metode, csize, off };\n      p += 46 + nlen + xlen + clen;\n    }\n    return out;\n  }\n  async function bacaEntri(buf, e) {\n    if (!e) return null;\n    const dv = new DataView(buf), nlen = dv.getUint16(e.off + 26, true), xlen = dv.getUint16(e.off + 28, true);\n    const data = new Uint8Array(buf, e.off + 30 + nlen + xlen, e.csize);\n    if (e.metode === 0) return td.decode(data);\n    if (e.metode === 8) return td.decode(await inflate(data));\n    throw new Error('Kompresi file .xlsx tidak didukung.');\n  }\n  const xml = s => new DOMParser().parseFromString(s, 'application/xml');\n  const tag = (el, n) => [...el.getElementsByTagNameNS('*', n)];\n  function kolom(ref) { const m = /^([A-Z]+)/.exec(ref || ''); if (!m) return -1; let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; }\n  function teks(si) { return tag(si, 't').map(t => t.textContent).join(''); }\n\n  async function baca(arrayBuffer) {\n    const z = daftarZip(arrayBuffer);\n    const wb = xml(await bacaEntri(arrayBuffer, z['xl/workbook.xml']) || '<x/>');\n    const rels = xml(await bacaEntri(arrayBuffer, z['xl/_rels/workbook.xml.rels']) || '<x/>'), target = {};\n    tag(rels, 'Relationship').forEach(r => { let t = r.getAttribute('Target') || ''; t = t.replace(/^\\//, ''); target[r.getAttribute('Id')] = t.indexOf('xl/') === 0 ? t : 'xl/' + t; });\n    const ssTxt = await bacaEntri(arrayBuffer, z['xl/sharedStrings.xml']), shared = ssTxt ? tag(xml(ssTxt), 'si').map(teks) : [];\n    const out = [];\n    for (const sh of tag(wb, 'sheet')) {\n      const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');\n      const path = target[rid]; if (!path || !z[path]) continue;\n      const doc = xml(await bacaEntri(arrayBuffer, z[path])), aoa = [];\n      tag(doc, 'row').forEach(row => {\n        const ri = Number(row.getAttribute('r')) - 1, arr = [];\n        tag(row, 'c').forEach((c, idx) => {\n          const ci = c.getAttribute('r') ? kolom(c.getAttribute('r')) : idx, t = c.getAttribute('t') || 'n', v = tag(c, 'v')[0];\n          let val = '';\n          if (t === 's') val = v ? (shared[Number(v.textContent)] || '') : '';\n          else if (t === 'inlineStr') val = tag(c, 'is').map(teks).join('');\n          else if (t === 'str' || t === 'e') val = v ? v.textContent : '';\n          else if (t === 'b') val = v ? v.textContent === '1' : '';\n          else val = v && v.textContent !== '' ? Number(v.textContent) : '';\n          arr[ci] = val;\n        });\n        for (let i = 0; i < arr.length; i++) if (arr[i] === undefined) arr[i] = '';\n        aoa[isFinite(ri) && ri >= 0 ? ri : aoa.length] = arr;\n      });\n      for (let i = 0; i < aoa.length; i++) if (!aoa[i]) aoa[i] = [];\n      out.push({ nama: sh.getAttribute('name'), aoa });\n    }\n    return out;\n  }\n  return { baca };\n})();\n\n/* ================= F2 · Kontrak: daftar, kontrak lama (arsip), panel detail, form ================= */\nObject.assign(S, { sel: new Set(), kf: { q: '', st: 'OPEN', quick: '', tahap: '', ku: '', pic: '', pop: '', seg: '', cust: '' }, batas: 200, drawer: null, dtab: 'proses', dlist: [],\n                   lama: null, arsQ: '', arsHasil: null, arsMemuat: false, riw: {}, prog: {} });\n\n/* ---------- penyaji kecil ---------- */\n// rp() dari icons.js\nconst T = kode => (D.ref && D.ref.T[kode]) || null;\nconst labelTahap = kode => (T(kode) || {}).Label || kode || '—';\nconst labelKendala = kode => ((D.ref && D.ref.KD[kode]) || {}).Label || kode;\nconst custName = k => k.EndCustomer || k.NamaPelanggan || '(nama belum diisi)';\nconst jc = k => KD.jenisCustomer(k.NamaPelanggan, k.EndCustomer);\nfunction tahapPill(kode) { if (!kode) return '<span class=\"pill p-dim\">Belum ada BAST</span>'; const t = T(kode); return `<span class=\"pill ${t && t.Penutup ? 'p-ok' : 'p-acc'}\"><span class=\"dot\"></span>${esc(labelTahap(kode))}</span>`; }\nfunction kuChip(b) {\n  const p = KD.evalPush(b, D.ref), k = p.kondisi;\n  const c = !p.cocok ? 'p-crit' : k === 'CLOSE' ? 'p-ok' : k.indexOf('KENDALA') === 0 ? 'p-crit' : k === 'SISA_LOKASI' ? 'p-warn' : k === 'BELUM_ADA_BAST' ? 'p-dim' : 'p-info';\n  return `<span class=\"ku ${c}\">${esc(p.cocok ? p.nilai : 'TANPA ATURAN')}</span>`;\n}\nfunction statusPill(b) {\n  const s = KD.statusKontrak(b, D.ref);\n  if (KD.bool(b.k.Arsip)) return '<span class=\"pill p-dim\">Diarsipkan</span>';\n  if (s.status === 'CLOSE') return '<span class=\"pill p-ok\"><span class=\"dot\"></span>CLOSE</span>';\n  if (s.menunggu) return '<span class=\"pill p-warn\"><span class=\"dot\"></span>Menunggu BAST lanjutan</span>';\n  const h = hitungBast(b);\n  if (h.close > 0) return `<span class=\"pill p-info\" title=\"${h.close} dari ${h.n} BAST sudah close\"><span class=\"dot\"></span>Parsial ${h.close}/${h.n} close</span>`;\n  return '<span class=\"pill p-dim\">OPEN</span>';\n}\nfunction custPill(k) { const j = jc(k); return `<span class=\"pill ${j === 'DIRECT' ? 'p-dim' : j === 'INDIRECT' ? 'p-vio' : 'p-warn'}\">${KD.LABEL_JC[j]}</span>`; }\nfunction avatarPic(n, sm) { return n ? `<span class=\"av ${sm ? 'sm' : ''}\">${esc(String(n)[0].toUpperCase())}</span>` : `<span class=\"av none ${sm ? 'sm' : ''}\">?</span>`; }\nfunction bottleneck(b) {\n  const o = KD.bastOpen(b, D.ref);\n  o.sort((x, y) => (T(x.KodeTahap) || { Urutan: 999 }).Urutan - (T(y.KodeTahap) || { Urutan: 999 }).Urutan);\n  return o[0] || null;\n}\nfunction agingKontrak(b) { const x = bottleneck(b); return x ? KD.hariSejak(x.TglTahapMulai, D.hariIni || hariIniStr()) : null; }\nfunction ageChip(h, batas) { if (h === null || h === undefined) return '<span class=\"dim\">—</span>'; const bk = KD.bucket(h, agingBatas()); return `<span class=\"age a-${bk}\" title=\"Hari di tahap sekarang. Aging terus bertambah${batas ? '; batas tahap ' + batas + ' hari' : ''}.\">${h} hr</span>`; }\nconst picList = () => D.users.filter(u => u.aktif && u.alias).map(u => u.alias).sort((a, b) => a.localeCompare(b));\nfunction opsi(list, val, kosong) { return (kosong !== undefined ? `<option value=\"\">${esc(kosong)}</option>` : '') + list.map(o => { const v = typeof o === 'string' ? o : o[0], l = typeof o === 'string' ? o : o[1]; return `<option value=\"${esc(v)}\" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`; }).join(''); }\nconst aktifRef = list => (list || []).filter(x => x.Aktif);\nconst tandai = (t, q) => { const i = String(t).toLowerCase().indexOf(q.toLowerCase()); return i < 0 || !q ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)); };\nconst SUMBER_ALIAS = { KOREKSI: 'koreksi nomor', ANTRIAN: 'dialiaskan dari Antrian', UPLOAD: 'dari upload Excel' };\n\n/* ---------- filter & pencarian (di browser, §4.4) ---------- */\nfunction aliasCocok(b, q) {\n  if (!q || !(b.alias || []).length) return null;\n  const ql = q.toLowerCase(), qn = KD.normKey(q), k = b.k;\n  if ((k.NoKontrak + ' ' + k.NamaPelanggan + ' ' + k.EndCustomer + ' ' + k.JudulKontrak + ' ' + k.KontrakID).toLowerCase().indexOf(ql) >= 0) return null;\n  return b.alias.find(a => String(a.NoAsli).toLowerCase().indexOf(ql) >= 0 || (qn.length >= 4 && String(a.AliasNorm).indexOf(qn) >= 0)) || null;\n}\nfunction cocokCari(b, q) {\n  const k = b.k, ql = q.toLowerCase(), qn = KD.normKey(q);\n  if ((k.NoKontrak + ' ' + k.NamaPelanggan + ' ' + k.EndCustomer + ' ' + k.JudulKontrak + ' ' + k.KontrakID + ' ' + k.PIC).toLowerCase().indexOf(ql) >= 0) return true;\n  if (qn.length >= 4 && String(k.NoKontrakNorm).indexOf(qn) >= 0) return true;\n  if (KD.hidup(b.order).some(o => String(o.NoOrder).toLowerCase().indexOf(ql) >= 0)) return true;\n  return !!aliasCocok(b, q);\n}\nconst QUICK = [\n  ['kend', 'Ada kendala', b => KD.kendalaAktif(b).length > 0],\n  ['lewat', 'Lewat batas aging', b => KD.bastOpen(b, D.ref).some(x => { const h = KD.hariSejak(x.TglTahapMulai, D.hariIni); return h !== null && h > ((T(x.KodeTahap) || {}).BatasAgingHari || 14); })],\n  ['nopic', 'Tanpa PIC', b => !b.k.PIC],\n  ['kurang', 'Data belum lengkap', b => KD.fieldKurang(b, D.cfg).length > 0],\n  ['parsial', 'Parsial', b => KD.hidup(b.bast).length > 1 || KD.statusKontrak(b, D.ref).menunggu],\n  ['verif', 'Perlu verifikasi', b => KD.bool(b.k.PerluVerifikasi)]\n];\n/** Jumlah BAST close & total (BAST yang dihapus tidak dihitung). */\nfunction hitungBast(b) { const l = KD.hidup(b.bast); return { n: l.length, close: l.filter(x => KD.bastClose(x, D.ref)).length }; }\n/** Parsial berjalan: kontrak masih OPEN tetapi sudah ada BAST yang close (C10). */\nconst parsialJalan = b => { const h = hitungBast(b); return b.k.StatusKontrak === 'OPEN' && h.close > 0; };\nfunction lolosStatus(b, st) {\n  if (st === 'ARSIP') return KD.bool(b.k.Arsip);\n  if (KD.bool(b.k.Arsip)) return false;\n  if (st === 'CLOSE') return b.k.StatusKontrak === 'CLOSE' || parsialJalan(b);   // parsial tampil di OPEN dan CLOSE\n  return !st || b.k.StatusKontrak === st;\n}\n/** Kolom Tahap: satu kontrak banyak BAST → status setiap BAST terlihat tanpa diklik (C10). */\nfunction tahapSel(b) {\n  const l = KD.hidup(b.bast).slice().sort((x, y) => Number(x.Urutan) - Number(y.Urutan));\n  if (l.length <= 1) return tahapPill(b.k.TahapKontrak);\n  return `<div class=\"bchips\">${l.map(x => { const c = KD.bastClose(x, D.ref); return `<span class=\"bchip ${c ? 'cl' : ''}\" title=\"${esc(x.BASTID)} · ${esc(x.DokTagih)} · ${esc(labelTahap(x.KodeTahap))}${x.CakupanLokasi !== '' ? ' · ' + esc(x.CakupanLokasi) + ' lokasi' : ''}\"><b>B${esc(x.Urutan)}</b>${c ? '✓ close' : esc(labelTahap(x.KodeTahap))}</span>`; }).join('')}</div>`;\n}\nfunction terfilter() {\n  const f = S.kf, q = f.q.trim();\n  return semuaKontrak().filter(b => {\n    const k = b.k;\n    if (!lolosStatus(b, f.st)) return false;\n    if (f.tahap && k.TahapKontrak !== f.tahap) return false;\n    if (f.ku && k.KendalaUmum !== f.ku) return false;\n    if (f.pic === '__none' && k.PIC) return false;\n    if (f.pic && f.pic !== '__none' && k.PIC !== f.pic) return false;\n    if (f.pop && k.Populasi !== f.pop) return false;\n    if (f.seg && k.Segment !== f.seg) return false;\n    if (f.cust && jc(k) !== f.cust) return false;\n    if (f.quick) { const x = QUICK.find(z => z[0] === f.quick); if (x && !x[2](b)) return false; }\n    if (q && !cocokCari(b, q)) return false;\n    return true;\n  }).sort((a, b) => (a.k.UpdatedAt < b.k.UpdatedAt ? 1 : a.k.UpdatedAt > b.k.UpdatedAt ? -1 : 0));\n}\nfunction aliasHit(b) {\n  const a = aliasCocok(b, S.kf.q.trim()); if (!a) return '';\n  return `<span class=\"ahit\">${ic('sync', 's')}<span>Ditemukan lewat <b>nomor lama</b> <span class=\"mono\">${tandai(a.NoAsli, S.kf.q.trim())}</span> · ${SUMBER_ALIAS[a.Sumber] || a.Sumber} ${esc(String(a.CreatedAt).slice(0, 16))} oleh ${esc(namaUser(a.CreatedBy))}</span></span>`;\n}\n\n/* ---------- halaman Kontrak ---------- */\nfunction viewKontrak() {\n  if (!D.siap) return '<div class=\"loading\"><div class=\"spinner\"></div>Memuat data aktif…</div>';\n  const f = S.kf, rows = terfilter(), base = semuaKontrak().filter(b => lolosStatus(b, f.st)), tampil = rows.slice(0, S.batas);\n  const uniq = key => [...new Set(semuaKontrak().map(b => b.k[key]).filter(Boolean))].sort();\n  const sel = (id, lbl, list, v) => `<select class=\"inp\" id=\"${id}\" aria-label=\"${lbl}\">${opsi(list, v, lbl + ': semua')}</select>`;\n  const bolehPilih = can('pic.atur');\n  return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:14px\">\n   <div class=\"row\">\n    <div class=\"search\">${ic('search', 's')}<input id=\"kq\" placeholder=\"Cari nomor kontrak, SO/MI, pelanggan, judul…\" value=\"${esc(f.q)}\" autocomplete=\"off\"></div>\n    <div class=\"seg\" role=\"group\" aria-label=\"Status\">${[['OPEN', 'OPEN'], ['CLOSE', 'CLOSE'], ['', 'Semua']].concat(can('kontrak.arsip') ? [['ARSIP', 'Diarsipkan']] : []).map(([v, l]) => `<button data-kst=\"${v}\" class=\"${f.st === v ? 'on' : ''}\">${l}</button>`).join('')}</div>\n    <span class=\"sp\"></span>\n    ${can('kontrak.daftar') ? `<button class=\"btn pri\" id=\"addK\">${ic('add', 's')}Tambah kontrak</button>` : ''}${can('kontrak.import') ? `<button class=\"btn ton\" data-go2=\"upload\">${ic('up2', 's')}Upload Excel</button>` : ''}\n   </div>\n   <div class=\"row\">${QUICK.map(([k, l, fn]) => `<button class=\"chipf ${f.quick === k ? 'on' : ''}\" data-kq=\"${k}\">${l} <b>${base.filter(fn).length}</b></button>`).join('')}</div>\n   <div class=\"filters\">\n    ${sel('kft', 'Tahap', D.ref.tahap.map(t => [t.Kode, t.Label]), f.tahap)}\n    ${sel('kfku', 'Kendala Umum', [...new Set(D.ref.push.filter(p => p.Aktif).map(p => p.Nilai))], f.ku)}\n    <select class=\"inp\" id=\"kfp\" aria-label=\"PIC\">${opsi(picList().concat([['__none', '(Tanpa PIC)']]), f.pic, 'PIC: semua')}</select>\n    ${sel('kfc', 'Jenis customer', [['DIRECT', 'DIRECT'], ['INDIRECT', 'INDIRECT'], ['BELUM', 'BELUM TERDEFINISI']], f.cust)}\n    ${sel('kfpop', 'Populasi', uniq('Populasi'), f.pop)}${sel('kfseg', 'Segment', uniq('Segment'), f.seg)}\n   </div>\n   <div class=\"row\" style=\"margin-top:-4px\">${Object.keys(S.kf).some(x => x !== 'st' && S.kf[x]) ? '<button class=\"btn sm ghost\" id=\"kreset\">Hapus semua filter</button>' : ''}<span class=\"sp\"></span><span class=\"muted tnum\" style=\"font-weight:600\" id=\"kcount\">${rows.length.toLocaleString('id-ID')} kontrak</span></div>\n   <div class=\"tbl-wrap\"><table class=\"t\"><thead><tr>${bolehPilih ? '<th style=\"width:30px\"><input type=\"checkbox\" class=\"chk\" id=\"kselAll\" aria-label=\"Pilih semua yang tampil\"></th>' : ''}<th>Kontrak</th><th>Tahap</th><th>Kendala Umum (di sheet)</th><th>PIC</th><th>Aging</th><th class=\"num\">Nilai</th><th>Status</th></tr></thead><tbody>\n   ${tampil.map(b => { const k = b.k, nb = KD.hidup(b.bast).length, j = jc(k), pending = D.antre.some(a => a.kid === k.KontrakID);\n     return `<tr class=\"click ${S.drawer === k.KontrakID ? 'sel' : ''} ${D.flash[k.KontrakID] && Date.now() - D.flash[k.KontrakID] < 4000 ? 'flash' : ''}\" data-k=\"${esc(k.KontrakID)}\">\n     ${bolehPilih ? `<td><input type=\"checkbox\" class=\"chk rowchk\" data-id=\"${esc(k.KontrakID)}\" ${S.sel.has(k.KontrakID) ? 'checked' : ''} aria-label=\"Pilih ${esc(k.KontrakID)}\"></td>` : ''}\n     <td><span class=\"no\">${esc(k.NoKontrak)}${pending ? ' <span class=\"bspin\" title=\"Sedang disimpan\" style=\"width:10px;height:10px\"></span>' : ''}</span><span class=\"sub\"><b style=\"color:var(--fg);font-weight:600\">${esc(custName(k))}</b>${j === 'INDIRECT' ? ' <span class=\"pill p-vio\" style=\"font-size:10.5px;padding:0 7px\">INDIRECT</span>' : j === 'BELUM' ? ' <span class=\"pill p-warn\" style=\"font-size:10.5px;padding:0 7px\">jenis belum terdefinisi</span>' : ''} · ${esc(k.JudulKontrak)}</span>${aliasHit(b)}</td>\n     <td>${tahapSel(b)}</td>\n     <td>${kuChip(b)}</td>\n     <td><div class=\"row\" style=\"flex-wrap:nowrap;gap:6px\">${avatarPic(k.PIC, 1)}<span>${k.PIC ? esc(k.PIC) : '<span style=\"color:var(--warn)\">—</span>'}</span></div></td>\n     <td>${ageChip(agingKontrak(b))}</td><td class=\"num\">${rp(k.NilaiKontrak)}</td>\n     <td><div class=\"row\" style=\"flex-wrap:nowrap;gap:4px\">${statusPill(b)}${KD.bool(k.PerluVerifikasi) ? '<span class=\"pill p-info\" title=\"Hasil import, perlu diverifikasi\">verif</span>' : ''}</div></td></tr>`; }).join('') ||\n     `<tr><td colspan=\"${bolehPilih ? 8 : 7}\" class=\"muted\" style=\"text-align:center;padding:32px\">${semuaKontrak().length ? 'Tidak ada kontrak yang cocok. Coba hapus filter.' : 'Belum ada kontrak. ' + (can('kontrak.import') ? 'Klik <b>Tambah kontrak</b>, <b>Upload Excel</b>, atau Import data lama dari halaman Upload.' : can('kontrak.daftar') ? 'Klik <b>Tambah kontrak</b>.' : '')}</td></tr>`}\n   </tbody></table></div>\n   ${rows.length > tampil.length ? `<div class=\"row\" style=\"justify-content:center\"><button class=\"btn\" id=\"kmore\">Tampilkan ${Math.min(200, rows.length - tampil.length)} lagi <span class=\"muted\">(${tampil.length} dari ${rows.length.toLocaleString('id-ID')})</span></button></div>` : ''}\n  </div>\n  ${S.sel.size ? `<div class=\"bulk\"><b class=\"tnum\">${S.sel.size} kontrak dipilih</b><span class=\"sp\"></span><select class=\"inp\" id=\"bulkPic\" aria-label=\"PIC baru\">${opsi(picList(), '', 'Pilih PIC…')}</select><button class=\"btn pri sm\" id=\"bulkGo\">Atur PIC</button><button class=\"btn sm\" id=\"bulkClr\">Batal</button></div>` : ''}\n  ${diarsipCocok(S.kf.q.trim())}\n  <div id=\"arsipSlot\">${arsipSection()}</div>`;\n}\nfunction rerenderKontrak() {\n  const c = document.getElementById('content'); if (!c || S.page !== 'kontrak') return;\n  const a = document.activeElement, isQ = a && a.id === 'kq', pos = isQ ? a.selectionStart : null, sc = window.scrollY;\n  c.innerHTML = viewKontrak(); bindKontrak();\n  if (isQ) { const n = document.getElementById('kq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }\n  window.scrollTo(0, sc);\n}\nfunction segarkanTampilan() {\n  if (S.page === 'kontrak') rerenderKontrak();\n  else if ((S.page === 'beranda' || S.page === 'perhatian') && D.siap) {\n    const c = document.getElementById('content'), sc = window.scrollY;\n    const sibuk = document.activeElement && /SELECT|INPUT/.test(document.activeElement.tagName) && c && c.contains(document.activeElement);\n    if (c && !sibuk) { if (S.page === 'beranda') { c.innerHTML = viewDash(); bindDash(); const cr = document.querySelector('.top .crumb'); if (cr) cr.textContent = PAGES.beranda.crumb(); } else { c.innerHTML = viewPerhatian(); bindPerhatian(); } window.scrollTo(0, sc); }\n  }\n  perbaruiBadge();\n  if (S.drawer) renderDrawer(false);\n}\nlet cariT = null;\nfunction bindKontrak() {\n  const $c = s => document.querySelector('#content ' + s), $$c = s => document.querySelectorAll('#content ' + s);\n  if (!D.siap) { muatData(false).then(rerenderKontrak).catch(gagal); return; }\n  const q = $c('#kq');\n  q.oninput = () => { S.kf.q = q.value; S.batas = 200; clearTimeout(cariT); cariT = setTimeout(() => { rerenderKontrak(); cariArsip(); }, 160); };\n  $$c('[data-kst]').forEach(b => b.onclick = () => { S.kf.st = b.dataset.kst; S.batas = 200; rerenderKontrak(); });\n  $$c('[data-kq]').forEach(b => b.onclick = () => { S.kf.quick = S.kf.quick === b.dataset.kq ? '' : b.dataset.kq; rerenderKontrak(); });\n  [['kft', 'tahap'], ['kfku', 'ku'], ['kfp', 'pic'], ['kfc', 'cust'], ['kfpop', 'pop'], ['kfseg', 'seg']].forEach(([id, key]) => { const el = $c('#' + id); if (el) el.onchange = () => { S.kf[key] = el.value; rerenderKontrak(); }; });\n  if ($c('#addK')) $c('#addK').onclick = () => openKontrakForm(null);\n  if ($c('#kreset')) $c('#kreset').onclick = () => { Object.assign(S.kf, { q: '', quick: '', tahap: '', ku: '', pic: '', pop: '', seg: '', cust: '' }); S.arsQ = ''; rerenderKontrak(); };\n  if ($c('#kmore')) $c('#kmore').onclick = () => { S.batas += 200; rerenderKontrak(); };\n  $$c('tr[data-k]').forEach(tr => tr.onclick = e => { if (e.target.closest('input')) return; openDrawer(tr.dataset.k, terfilter().map(b => b.k.KontrakID)); });\n  $$c('.rowchk').forEach(c => c.onchange = () => { c.checked ? S.sel.add(c.dataset.id) : S.sel.delete(c.dataset.id); rerenderKontrak(); });\n  if ($c('#kselAll')) $c('#kselAll').onchange = e => { terfilter().slice(0, S.batas).forEach(b => e.target.checked ? S.sel.add(b.k.KontrakID) : S.sel.delete(b.k.KontrakID)); rerenderKontrak(); };\n  if ($c('#bulkClr')) $c('#bulkClr').onclick = () => { S.sel.clear(); rerenderKontrak(); };\n  if ($c('#bulkGo')) $c('#bulkGo').onclick = () => {\n    const pic = $c('#bulkPic').value; if (!pic) { toast('Pilih PIC dulu.'); return; }\n    const ids = [...S.sel].filter(id => kontrak(id) && kontrak(id).k.PIC !== pic);\n    ids.forEach(id => jalankanOp('kontrak.pic', id, { PIC: pic, massal: true }));\n    S.sel.clear(); rerenderKontrak(); toast(`${ids.length} kontrak diatur ke PIC ${pic}.`);\n  };\n  bindArsip();\n}\n\n/* ---------- kontrak lama di arsip (cari lewat Indeks di server) ---------- */\nfunction diarsipCocok(q) {\n  if (q.length < 3 || S.kf.st === 'ARSIP') return '';\n  const xs = semuaKontrak().filter(b => KD.bool(b.k.Arsip) && cocokCari(b, q));\n  if (!xs.length) return '';\n  return `<div class=\"card arsres\"><h2>${ic('log', 's')} Kontrak diarsipkan <small>${xs.length} cocok · diarsipkan manual (mis. dobel/batal), tidak ikut daftar &amp; sinkron${can('kontrak.arsip') ? ' · bisa dikembalikan dari panel detail' : ''}</small></h2>\n   <div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Kontrak</th><th>Status</th><th>Alasan arsip</th><th>PIC</th></tr></thead><tbody>\n   ${xs.slice(0, 30).map(b => `<tr class=\"click\" data-k=\"${esc(b.k.KontrakID)}\"><td><span class=\"no\">${esc(b.k.NoKontrak)}</span><span class=\"sub\"><b style=\"color:var(--fg);font-weight:600\">${esc(custName(b.k))}</b> · ${esc(b.k.JudulKontrak)}</span>${aliasHit(b)}</td><td>${statusPill(b)}</td><td class=\"muted\">${esc(b.k.AlasanArsip || '—')}</td><td>${esc(b.k.PIC || '—')}</td></tr>`).join('')}</tbody></table></div></div>`;\n}\nfunction arsipSection() {\n  const q = S.kf.q.trim();\n  if (q.length < 3 || S.kf.st === 'ARSIP') return '';\n  if (S.arsMemuat || S.arsQ !== q) return `<div class=\"card arsres\"><div class=\"row\"><span class=\"bspin\" style=\"color:var(--accent)\"></span><b>Mencari juga di kontrak lama…</b><span class=\"muted\" style=\"font-size:12.5px\">indeks semua kontrak · ±1–3 dtk</span></div></div>`;\n  const h = S.arsHasil || [];\n  return `<div class=\"card arsres\"><h2>${ic('log', 's')} Kontrak lama <small>${h.length} cocok · CLOSE lebih dari ${esc(D.cfg.ARSIP_SETELAH_HARI || '90')} hari, disimpan di arsip per tahun · tetap bisa dibuka &amp; dibuka kembali</small></h2>\n   ${h.length ? `<div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Kontrak</th><th>Status</th><th>Arsip</th><th>Close</th><th>PIC</th></tr></thead><tbody>\n   ${h.map(r => `<tr class=\"click\" data-lama=\"${esc(r.KontrakID)}\"><td><span class=\"no\">${esc(r.NoKontrak)}</span><span class=\"sub\"><b style=\"color:var(--fg);font-weight:600\">${esc(r.EndCustomer || r.NamaPelanggan || '')}</b> · ${esc(r.JudulKontrak)}</span>\n     ${r.aliasCocok ? `<span class=\"ahit\">${ic('sync', 's')}<span>Ditemukan lewat <b>nomor lama</b> <span class=\"mono\">${tandai(r.aliasCocok.NoAsli, q)}</span> · ${SUMBER_ALIAS[r.aliasCocok.Sumber] || r.aliasCocok.Sumber} ${esc(String(r.aliasCocok.CreatedAt).slice(0, 16))} oleh ${esc(namaUser(r.aliasCocok.CreatedBy))}</span></span>` : ''}</td>\n     <td><span class=\"pill p-dim\">${esc(r.StatusKontrak || 'CLOSE')}</span></td><td class=\"tnum\">${esc(String(r.Lokasi).replace('ARSIP_', ''))}</td><td class=\"tnum muted\">${esc(String(r.TglClose).slice(0, 10))}</td><td>${esc(r.PIC)}</td></tr>`).join('')}</tbody></table></div>`\n   : '<div class=\"muted\">Tidak ada kontrak lama yang cocok.</div>'}</div>`;\n}\nlet arsT = null;\nfunction cariArsip() {\n  const q = S.kf.q.trim();\n  clearTimeout(arsT);\n  if (q.length < 3) { S.arsQ = ''; S.arsHasil = null; return; }\n  if (q === S.arsQ) return;\n  S.arsMemuat = true; const slot = document.getElementById('arsipSlot'); if (slot) slot.innerHTML = arsipSection();\n  arsT = setTimeout(async () => {\n    try { const r = await call('arsip.cari', { q }); if (S.kf.q.trim() === q) { S.arsQ = q; S.arsHasil = r.hasil; } }\n    catch (e) { S.arsQ = q; S.arsHasil = []; }\n    S.arsMemuat = false;\n    const s2 = document.getElementById('arsipSlot'); if (s2) { s2.innerHTML = arsipSection(); bindArsip(); }\n  }, 500);\n}\nfunction bindArsip() { document.querySelectorAll('#content [data-lama]').forEach(tr => tr.onclick = () => bukaLama(tr.dataset.lama)); }\nasync function bukaLama(kid) {\n  S.drawer = kid; S.dlist = [kid]; S.dtab = 'proses'; S.lama = { kid, memuat: true };\n  renderDrawer(true);\n  try {\n    const r = await call('arsip.buka', { kid });\n    if (r.lokasi === 'AKTIF') { S.lama = null; await tarik(true); if (kontrak(kid)) renderDrawer(false); else closeDrawer(true); return; }\n    S.lama = { kid, lokasi: r.lokasi, bundle: r.bundle, riwayat: r.riwayat };\n    S.riw[kid] = { riwayat: r.riwayat, log: null };\n  } catch (e) { S.lama = null; closeDrawer(true); gagal(e); return; }\n  if (S.drawer === kid) renderDrawer(false);\n}\n\n/* ---------- panel detail ---------- */\nfunction bundleDrawer() { if (S.lama && S.lama.kid === S.drawer) return S.lama.bundle || null; return kontrak(S.drawer); }\nfunction openDrawer(kid, list) { kid = idAsli(kid); S.lama = null; S.drawer = kid; S.dlist = list && list.indexOf(kid) >= 0 ? list : [kid]; S.dtab = 'proses'; renderDrawer(true); markSel(); }\nfunction closeDrawer(instant) {\n  const root = document.getElementById('sheet-root'); if (!S.drawer) return;\n  S.drawer = null; S.lama = null; markSel();\n  if (instant || REDUCED || !root.firstElementChild) { root.innerHTML = ''; return; }\n  root.firstElementChild.classList.add('closing'); setTimeout(() => { if (!S.drawer) root.innerHTML = ''; }, 300);\n}\nfunction markSel() { document.querySelectorAll('tr[data-k]').forEach(tr => tr.classList.toggle('sel', tr.dataset.k === S.drawer)); }\nfunction stepDrawer(d) { const i = S.dlist.indexOf(S.drawer), j = i + d; if (i < 0 || j < 0 || j >= S.dlist.length) return; S.drawer = S.dlist[j]; S.lama = null; renderDrawer(false, true); markSel(); }\nfunction renderDrawer(opening, swap) {\n  const root = document.getElementById('sheet-root');\n  if (!S.drawer) return;\n  const lamaMemuat = S.lama && S.lama.memuat, b = bundleDrawer();\n  if (!b && !lamaMemuat) { closeDrawer(true); return; }\n  const prevScroll = root.querySelector('.dbody') ? root.querySelector('.dbody').scrollTop : 0, idx = S.dlist.indexOf(S.drawer);\n  if (lamaMemuat) {\n    root.innerHTML = `<div class=\"dwrap\"><div class=\"dscrim\" id=\"dscrim\"></div><aside class=\"drawer\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Detail kontrak\"><div class=\"dhead\"><div class=\"dtop\"><button class=\"iconbtn\" id=\"dclose\" aria-label=\"Tutup\">${ic('x')}</button></div></div>\n     <div class=\"dbody\"><div class=\"lamaload\"><span class=\"bspin\"></span><div><b>Mengambil dari arsip…</b><div class=\"muted\">Cari di indeks · buka file arsip tahunnya · ±3–4 dtk</div></div></div></div></aside></div>`;\n    root.querySelector('#dclose').onclick = root.querySelector('#dscrim').onclick = () => closeDrawer(true);\n    return;\n  }\n  const k = b.k, lama = !!(S.lama && S.lama.bundle), ro = lama || !can('kontrak.update') || KD.bool(k.Arsip), pending = D.antre.some(a => a.kid === k.KontrakID);\n  root.innerHTML = `<div class=\"dwrap\"><div class=\"dscrim\" id=\"dscrim\" style=\"${opening ? '' : 'animation:none'}\"></div>\n   <aside class=\"drawer\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Detail kontrak\" style=\"${opening ? '' : 'animation:none'}\">\n    <div class=\"dhead\">\n     <div class=\"dtop\"><button class=\"iconbtn\" id=\"dclose\" aria-label=\"Tutup\">${ic('x')}</button>${S.dlist.length > 1 ? `<span class=\"muted tnum\" style=\"font-size:12px\">${idx + 1} / ${S.dlist.length}</span>\n      <button class=\"iconbtn\" id=\"dprev\" ${idx <= 0 ? 'disabled' : ''} aria-label=\"Sebelumnya\" title=\"Sebelumnya (K)\">${ic('chevL')}</button><button class=\"iconbtn\" id=\"dnext\" ${idx >= S.dlist.length - 1 ? 'disabled' : ''} aria-label=\"Berikutnya\" title=\"Berikutnya (J)\">${ic('chevL')}</button>\n      <span class=\"dim dkeys\" style=\"font-size:11.5px\"><kbd>J</kbd> <kbd>K</kbd> pindah · <kbd>Esc</kbd> tutup</span>` : ''}<span class=\"sp\"></span>\n      ${pending ? '<span class=\"pill p-dim\"><span class=\"bspin\" style=\"width:10px;height:10px\"></span>Menyimpan…</span>' : ''}\n      ${!ro && KD.bool(k.PerluVerifikasi) ? `<button class=\"btn sm ton\" id=\"dverif\">${ic('check', 's')}Tandai terverifikasi</button>` : ''}\n      ${!lama && can('kontrak.arsip') ? (KD.bool(k.Arsip) ? '<button class=\"btn sm\" id=\"dunarsip\">Kembalikan dari arsip</button>' : '<button class=\"btn sm\" id=\"darsip\">Arsipkan</button>') : ''}</div>\n     <div class=\"dtitle\"><div style=\"flex:1 1 360px;min-width:0\">\n       <div class=\"no\">${esc(k.NoKontrak)} <button class=\"iconbtn\" style=\"width:28px;height:28px\" id=\"dcopy\" aria-label=\"Salin nomor\">${ic('copy', 's')}</button> <span class=\"mono dim\" style=\"font-size:11.5px\">${esc(k.KontrakID)}</span></div>\n       <h2>${esc(custName(k))}</h2><div class=\"muted\">${esc(k.JudulKontrak)}${jc(k) === 'INDIRECT' ? ` · customer: ${esc(k.NamaPelanggan)}` : ''}</div>\n       <div class=\"row\" style=\"margin-top:10px\">${statusPill(b)} ${tahapPill(k.TahapKontrak)} ${kuChip(b)} ${custPill(k)} ${KD.bool(k.PerluVerifikasi) ? '<span class=\"pill p-info\">Hasil import · perlu verifikasi</span>' : ''}</div></div>\n      <label class=\"of\" style=\"min-width:210px;margin-top:8px\"><span>PIC</span><select class=\"inp\" id=\"dpic\" ${!lama && can('pic.atur') && !KD.bool(k.Arsip) ? '' : 'disabled'}>${opsi(picList().concat(k.PIC && picList().indexOf(k.PIC) < 0 ? [k.PIC] : []), k.PIC, '— Tanpa PIC —')}</select><small>${can('pic.atur') ? 'Siapa pun boleh update; non-PIC dicatat \"bantu\".' : 'PIC diatur admin.'}</small></label></div>\n     ${aliasBanner(b)}${lamaBanner(b)}${KD.bool(k.Arsip) ? `<div class=\"note warn\" style=\"margin-top:12px\">${ic('warn', 's')}<span class=\"tx\"><b>Diarsipkan</b>: ${esc(k.AlasanArsip)}. Kontrak ini tidak tampil di daftar dan tidak bisa diubah sampai dikembalikan.</span></div>` : ''}\n     <div class=\"dtabs\" role=\"tablist\">${[['proses', 'Proses'], ['data', 'Data kontrak'], ['riwayat', 'Riwayat']].map(([v, l]) => `<button role=\"tab\" data-dtab=\"${v}\" class=\"${S.dtab === v ? 'on' : ''}\">${l}</button>`).join('')}<button disabled style=\"opacity:.4;cursor:not-allowed\" title=\"Dibangun di F4b\">Sheet unit · F4b</button></div>\n    </div>\n    <div class=\"dbody ${swap ? 'swap' : ''}\" id=\"dbody\">${S.dtab === 'proses' ? dProses(b, ro) : S.dtab === 'data' ? dData(b, ro) : dRiwayat(b)}</div>\n   </aside></div>`;\n  root.querySelector('.dbody').scrollTop = swap ? 0 : prevScroll;\n  requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll('.prog').forEach(el => { el.style.width = el.dataset.w; S.prog[el.dataset.key] = el.dataset.w; })));\n  bindDrawer(b, ro, lama);\n  if (S.dtab === 'riwayat') muatRiwayat(k.KontrakID, lama ? S.lama.lokasi : 'AKTIF');\n}\nfunction aliasBanner(b) {\n  const a = aliasCocok(b, S.kf.q.trim()); if (!a) return '';\n  return `<div class=\"note info\" style=\"margin-top:12px\">${ic('sync', 's')}<span class=\"tx\">Anda mencari <span class=\"mono\"><b>${esc(a.NoAsli)}</b></span>. Itu <b>nomor lama</b> kontrak ini, sudah ${a.Sumber === 'KOREKSI' ? 'dikoreksi' : 'dicatat'} menjadi <span class=\"mono\"><b>${esc(b.k.NoKontrak)}</b></span>\n   (${SUMBER_ALIAS[a.Sumber] || a.Sumber}, ${esc(String(a.CreatedAt).slice(0, 16))} oleh ${esc(namaUser(a.CreatedBy))})${a.Catatan ? '. Alasan: ' + esc(a.Catatan) : ''}. Sheet unit yang masih memakai nomor lama tetap dikenali sebagai kontrak ini.</span></div>`;\n}\nfunction lamaBanner(b) {\n  if (!(S.lama && S.lama.bundle)) return '';\n  return `<div class=\"note warn\" style=\"margin-top:12px\">${ic('log', 's')}<span class=\"tx\"><b>Kontrak lama</b> · tersimpan di arsip ${esc(String(S.lama.lokasi).replace('ARSIP_', ''))} (close ${esc(String(b.k.TglClose).slice(0, 10))}). Hanya bisa dilihat. Bila ada return/revisi, buka kembali: kontrak dipindah ke data aktif dengan ID yang sama, riwayatnya ikut (±5 dtk).</span>\n   ${can('kontrak.update') ? `<button class=\"btn sm pri\" id=\"reopenLama\" style=\"flex:none\">Buka kembali (reopen)</button>` : ''}</div>`;\n}\nfunction dProses(b, ro) {\n  const k = b.k, s = KD.statusKontrak(b, D.ref), tl = D.ref.tahap.filter(t => t.Aktif), n = tl.length, basts = KD.hidup(b.bast), cak = KD.cakupan(b), lok = k.JumlahLokasi;\n  const bastHtml = basts.length ? basts.map(x => {\n    const ci = tl.findIndex(t => t.Kode === x.KodeTahap), cur = T(x.KodeTahap) || {}, key = x.BASTID, close = KD.bastClose(x, D.ref);\n    const w = `calc((100% - 100% / ${n}) * ${(Math.max(ci, 0) / Math.max(n - 1, 1)).toFixed(4)})`, from = S.prog[key] || '0px', h = KD.hariSejak(x.TglTahapMulai, D.hariIni);\n    const usul = KD.dokDefault(jc(k), D.cfg), dk = (D.ref.dokTagih.find(d => d.Kode === x.DokTagih) || {}).Label || '';\n    return `<div class=\"bast\">\n     <div class=\"bast-h\"><b class=\"mono\">${esc(x.BASTID)}</b><span class=\"pill ${x.DokTagih === 'BAA' ? 'p-vio' : 'p-dim'}\" title=\"${esc(dk)}\">${esc(x.DokTagih)}</span>${close ? '<span class=\"pill p-ok\"><span class=\"dot\"></span>CLOSE</span>' : '<span class=\"pill p-dim\">OPEN</span>'}${Number(x.Siklus) > 1 ? `<span class=\"pill p-warn\">Siklus ${esc(x.Siklus)} · reopen</span>` : ''}<span class=\"sp\"></span>${close ? '' : ageChip(h, cur.BatasAgingHari)}<span class=\"muted\" style=\"font-size:12px\">${close ? 'close ' + esc(String(x.TglTahapMulai).slice(0, 10)) : 'di tahap ini · batas ' + (cur.BatasAgingHari || 14) + ' hari'}</span>${ro ? '' : `<button class=\"btn sm\" data-editb=\"${esc(x.BASTID)}\">${ic('edit', 's')}Ubah</button>`}</div>\n     <div class=\"otrack\" style=\"--half:calc(100% / ${n} / 2)\"><div class=\"rail\"></div><div class=\"prog\" data-key=\"${esc(key)}\" data-w=\"${w}\" style=\"width:${from}\"></div>\n      ${tl.map((t, i) => `<button class=\"ost ${t.Penutup ? 'closer' : ''} ${i < ci ? 'done' : ''} ${i === ci ? 'cur' : ''}\" data-b=\"${esc(x.BASTID)}\" data-t=\"${esc(t.Kode)}\" ${ro || close ? 'disabled' : ''} title=\"${i === ci ? 'Tahap sekarang' : close ? 'BAST sudah close' : 'Pindah ke ' + esc(t.Label)}\"><span class=\"d\">${i < ci ? '✓' : i + 1}</span><span class=\"l\">${esc(t.Label)}</span></button>`).join('')}</div>\n     <dl class=\"kv\"><dt>Dokumen tagih</dt><dd>${esc(x.DokTagih)} <span class=\"muted\">· ${esc(dk)}${x.DokTagih === usul ? '' : ` · berbeda dari usulan ${usul}`}</span></dd><dt>Cakupan order</dt><dd class=\"mono\">${esc(x.CakupanOrder) || '<span class=\"muted\">—</span>'}</dd><dt>Cakupan lokasi</dt><dd>${x.CakupanLokasi !== '' ? esc(x.CakupanLokasi) : '<span class=\"muted\">' + (basts.length === 1 ? 'semua lokasi (tidak diisi)' : 'tidak diisi') + '</span>'}</dd><dt>No. dokumen</dt><dd class=\"mono\">${esc(x.NoDokBAST) || '<span class=\"muted\">—</span>'}</dd><dt>Keterangan</dt><dd>${esc(x.Keterangan) || '<span class=\"muted\">—</span>'}</dd></dl>\n    </div>`;\n  }).join('') : `<div class=\"note info\">${ic('doc', 's')}<span class=\"tx\">Kontrak ini belum punya BAST, jadi di sheet unit tampil <b class=\"mono\">${esc(KD.evalPush(b, D.ref).nilai || 'BELUM DIPROSES')}</b>. Tambahkan BAST/BAA untuk mulai memproses.</span></div>`;\n  const p = KD.evalPush(b, D.ref), kend = (b.kend || []).slice().sort((x, y) => (x.Status === y.Status ? (x.Mulai < y.Mulai ? 1 : -1) : x.Status === 'AKTIF' ? -1 : 1)), batasK = Number(D.cfg.KENDALA_BATAS_HARI) || 14;\n  return `<div class=\"grid g64\">\n   <div style=\"display:flex;flex-direction:column;gap:16px;min-width:0\">\n    <div class=\"row\"><div><div class=\"eyebrow\">Dokumen tagih</div><div style=\"font-weight:700;font-size:15px\">${basts.length} BAST/BAA${lok !== '' ? ` · cakupan ${cak}/${esc(lok)} lokasi` : ''}</div></div><span class=\"sp\"></span>${ro ? '' : `<button class=\"btn sm ton\" id=\"addBast\">${ic('add', 's')}Tambah BAST/BAA${basts.length ? ' parsial' : ''}</button>`}</div>\n    ${s.menunggu ? `<div class=\"note warn\">${ic('warn', 's')}<span class=\"tx\">Semua dokumen sudah close, tapi masih ada <b>${esc(s.sisa)} lokasi</b> tersisa. Kontrak tetap OPEN sampai BAST lanjutan dibuat.</span></div>` : ''}\n    ${bastHtml}\n    <div class=\"row\" style=\"margin-top:6px\"><div><div class=\"eyebrow\">Kendala</div><div style=\"font-weight:700;font-size:15px\">${KD.kendalaAktif(b).length} aktif</div></div><span class=\"sp\"></span>${ro ? '' : `<button class=\"btn sm ton\" id=\"addKend\" ${basts.length ? '' : 'disabled title=\"Tambahkan BAST dulu\"'}>${ic('flag', 's')}Buka kendala</button>`}</div>\n    ${kend.length ? kend.map(x => { const r = (D.ref.KD[x.Jenis] || {}), h = KD.hariSejak(x.Mulai, D.hariIni);\n      return `<div class=\"kend ${x.Status === 'AKTIF' ? '' : 'done'}\"><div style=\"flex:1;min-width:0\"><div class=\"row\"><b>${esc(r.Label || x.Jenis)}</b><span class=\"muted\" style=\"font-size:12px\">${esc(String(x.BASTID).replace(k.KontrakID + '-', ''))} · ${x.Status === 'AKTIF' ? `aktif ${h} hari` : 'selesai ' + esc(String(x.Selesai).slice(0, 10))} · oleh ${esc(namaUser(x.DibuatOleh))}</span>${x.Status === 'AKTIF' && h > batasK ? `<span class=\"pill p-crit\">&gt; ${batasK} hari</span>` : ''}${r.MemicuReopen ? '<span class=\"pill p-dim\">memicu reopen</span>' : ''}</div><div style=\"margin-top:4px\">${esc(x.Keterangan) || '<span class=\"muted\">—</span>'}${x.CatatanSelesai ? `<div class=\"muted\" style=\"font-size:12px\">Catatan selesai: ${esc(x.CatatanSelesai)}</div>` : ''}</div></div>${x.Status === 'AKTIF' && !ro ? `<button class=\"btn sm\" data-tutup=\"${esc(x.KendalaID)}\">${ic('check', 's')}Selesai</button>` : ''}</div>`; }).join('') : '<div class=\"muted\" style=\"font-size:13px\">Tidak ada kendala.</div>'}\n   </div>\n   <div style=\"display:flex;flex-direction:column;gap:16px;min-width:0\">\n    <div class=\"card\"><h2>Tampil di sheet unit <small>pratinjau</small></h2>\n     <div class=\"push\">\n      <div class=\"pushrow main\"><span class=\"k\">KENDALA_UMUM</span><span class=\"v\">${p.cocok ? esc(p.nilai) : '<span style=\"color:var(--crit)\">(tidak diubah · alarm TANPA_ATURAN)</span>'}</span></div>\n      <div class=\"pushrow\"><span class=\"k\">KENDALA_DETIL</span><span class=\"v\">${esc(p.detil) || '—'}</span></div>\n      <div class=\"pushrow\"><span class=\"k\">TAHAP</span><span class=\"v\">${k.TahapKontrak ? esc(labelTahap(k.TahapKontrak)) : '—'}</span></div>\n      <div class=\"pushrow\"><span class=\"k\">PARSIAL</span><span class=\"v\">${basts.length > 1 || lok !== '' ? esc(basts.filter(x => KD.bastClose(x, D.ref)).length + '/' + basts.length + ' BAST' + (lok !== '' ? ' · ' + cak + '/' + lok + ' lokasi' : '')) : '—'}</span></div>\n      <div class=\"pushrow\"><span class=\"k\">PIC</span><span class=\"v\">${esc(k.PIC) || '—'}</span></div>\n     </div>\n     <div class=\"note info\" style=\"margin-top:10px;font-size:12px\">${ic('sync', 's')}<span class=\"tx\">Belum dikirim: sinkron ke sheet unit mulai <b>F4a</b>. Nilai di atas sudah dihitung sekarang supaya bisa dicek.</span></div>\n     <div class=\"muted\" style=\"font-size:12px;margin-top:10px\">${p.cocok ? `Cocok dengan aturan Nilai Push <b>#${p.urutan}</b> <span class=\"mono\">${esc(p.kondisi)}</span>.` : 'Tidak ada aturan Nilai Push yang cocok. Periksa Pengaturan › Nilai Push.'}</div></div>\n   </div></div>`;\n}\nfunction dData(b, ro) {\n  const k = b.k, kurang = KD.fieldKurang(b, D.cfg), wajib = String(D.cfg.FIELD_WAJIB || '').split(',').filter(Boolean), ok = wajib.length - kurang.length;\n  const NAMA = { Customer: 'Customer', EndCustomer: 'End customer', NilaiKontrak: 'Nilai kontrak', Segment: 'Segment', Populasi: 'Populasi', OrderInternal: 'SO/MI', JumlahLokasi: 'Jumlah lokasi', PIC: 'PIC', TahunProject: 'Tahun project', JenisDok: 'Jenis dok' };\n  const orders = KD.hidup(b.order);\n  return `<div class=\"grid g2\">\n   <div class=\"card\" style=\"grid-column:1/-1\"><h2>Kelengkapan data <small>${ok}/${wajib.length} field wajib terisi</small><span class=\"sp\"></span>${kurang.length ? `<span class=\"pill p-warn\">${kurang.length} belum lengkap</span>` : '<span class=\"pill p-ok\">lengkap</span>'}</h2>\n    <div class=\"agebar\" style=\"height:8px;margin-bottom:12px\"><i style=\"flex:${ok};background:var(--ok)\"></i>${kurang.length ? `<i style=\"flex:${kurang.length};background:transparent\"></i>` : ''}</div>\n    ${kurang.length ? `<div class=\"row\">${kurang.map(m => `<span class=\"pill p-warn\">${esc(NAMA[m] || m)}</span>`).join('')}</div>` : '<div class=\"muted\" style=\"font-size:13px\">Semua field wajib sudah terisi. Daftar field wajib diatur di Config (FIELD_WAJIB).</div>'}</div>\n   <div class=\"card\"><h2>Data kontrak <span class=\"sp\"></span>${ro ? '' : `<button class=\"btn sm\" id=\"editK\">${ic('edit', 's')}Ubah</button>`}</h2>\n    <dl class=\"kv\"><dt>ID</dt><dd class=\"mono\">${esc(k.KontrakID)}</dd><dt>No. kontrak</dt><dd class=\"mono\" style=\"font-size:12px\">${esc(k.NoKontrak)}</dd><dt>Jenis dok</dt><dd>${esc(k.JenisDok) || '—'}</dd><dt>Tahun project</dt><dd>${esc(k.TahunProject) || '—'}</dd><dt>Populasi</dt><dd>${esc(k.Populasi) || '—'}</dd><dt>Segment</dt><dd>${esc(k.Segment) || '—'}</dd><dt>Nilai</dt><dd class=\"tnum\">${rp(k.NilaiKontrak)}</dd><dt>Jumlah lokasi</dt><dd>${esc(k.JumlahLokasi) || '<span class=\"muted\">tidak diisi</span>'}</dd><dt>Sumber</dt><dd>${esc(k.SumberAwal)} · ${esc(String(k.CreatedAt).slice(0, 10))} oleh ${esc(namaUser(k.CreatedBy))}</dd>\n     <dt>Nomor lama</dt><dd>${(b.alias || []).length ? b.alias.map(a => `<div style=\"margin-bottom:6px\"><span class=\"mono\" style=\"font-size:12px\">${esc(a.NoAsli)}</span><div class=\"muted\" style=\"font-size:11.5px\">${SUMBER_ALIAS[a.Sumber] || a.Sumber} · ${esc(String(a.CreatedAt).slice(0, 16))} · ${esc(namaUser(a.CreatedBy))}${a.Catatan ? ' · ' + esc(a.Catatan) : ''}</div></div>`).join('') : '<span class=\"muted\">—</span>'}</dd></dl></div>\n   <div class=\"card\"><h2>Customer</h2>\n    <dl class=\"kv\"><dt>Customer</dt><dd>${k.NamaPelanggan ? esc(k.NamaPelanggan) + ' <span class=\"muted\">(direct customer)</span>' : '<span style=\"color:var(--warn)\">belum diisi</span>'}</dd><dt>End customer</dt><dd>${k.EndCustomer ? esc(k.EndCustomer) : '<span style=\"color:var(--warn)\">belum diisi</span>'}</dd><dt>Jenis customer</dt><dd>${custPill(k)}</dd><dt>Dokumen tagih usulan</dt><dd>${KD.dokDefault(jc(k), D.cfg)} <span class=\"muted\">· bisa diganti per BAST</span></dd></dl>\n    <div class=\"note info\" style=\"margin-top:12px\">${ic('person', 's')}<span class=\"tx\"><b>DIRECT</b> bila customer = end customer, <b>INDIRECT</b> bila berbeda (huruf besar/kecil, spasi, tanda baca, \"PT\", \"Tbk\", \"Persero\" diabaikan). Selama salah satunya kosong: <b>BELUM TERDEFINISI</b>.</span></div></div>\n   <div class=\"card\" style=\"grid-column:1/-1\"><h2>SO / MI <small>order internal${ro ? '' : ' · klik baris untuk ubah'}</small><span class=\"sp\"></span>${ro ? '' : `<button class=\"btn sm\" id=\"addSO\">${ic('add', 's')}Tambah</button>`}</h2>\n    <div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Jenis</th><th>No. order</th><th>Layanan</th><th>Pekerjaan</th><th class=\"num\">Lokasi</th><th>Keterangan</th></tr></thead><tbody>\n    ${orders.map(o => `<tr class=\"${ro ? '' : 'click'}\" data-so=\"${esc(o.OrderID)}\"><td><span class=\"pill p-dim\">${esc(o.JenisOrder)}</span></td><td class=\"no\">${esc(o.NoOrder)}</td><td>${esc(o.JenisLayanan)}</td><td>${esc(o.JenisPekerjaan)}</td><td class=\"num\">${esc(o.JumlahLokasi)}</td><td class=\"muted\">${esc(o.Keterangan)}</td></tr>`).join('') || '<tr><td colspan=\"6\" class=\"muted\">Belum ada SO/MI.</td></tr>'}</tbody></table></div></div></div>`;\n}\nfunction dRiwayat(b) {\n  const r = S.riw[b.k.KontrakID];\n  if (!r || !r.log) return '<div class=\"loading\"><div class=\"spinner\"></div>Memuat riwayat…</div>';\n  const riw = r.riwayat.slice().sort((x, y) => (x.Masuk < y.Masuk ? 1 : -1));\n  return `<div class=\"grid g2\"><div class=\"card\"><h2>Riwayat tahap <small>${riw.length} perpindahan</small></h2><div class=\"tl\">${riw.map(e => `<div class=\"e\"><span class=\"b\"></span><span class=\"w\">${esc(String(e.Masuk).slice(0, 16))}</span><span><b>${esc(String(e.BASTID).replace(b.k.KontrakID + '-', ''))}</b> masuk <b>${esc(labelTahap(e.KodeTahap))}</b>${Number(e.Siklus) > 1 ? ` · siklus ${esc(e.Siklus)}` : ''} · ${esc(namaUser(e.Oleh))}${e.Keterangan ? `<br><span class=\"muted\" style=\"font-size:12px\">${esc(e.Keterangan)}</span>` : ''}</span></div>`).join('') || '<div class=\"muted\">Belum ada.</div>'}</div></div>\n   <div class=\"card\"><h2>Log perubahan <small>${r.bulan ? '3 bulan terakhir' : ''}</small></h2><div class=\"tl\">${r.log.map(l => `<div class=\"e\"><span class=\"b\"></span><span class=\"w\">${esc(String(l.waktu).slice(0, 16))}</span><span><b>${esc(namaUser(l.user))}</b> · <span class=\"pill p-dim\" style=\"font-size:10.5px\">${esc(l.aksi)}</span> ${l.field ? `<span class=\"mono\" style=\"font-size:11.5px\">${esc(l.field)}</span>: ${esc(l.lama) || '—'} → ${esc(l.baru) || '—'}` : ''}${l.catatan ? `<br><span class=\"muted\" style=\"font-size:12px\">${esc(l.catatan)}</span>` : ''}</span></div>`).join('') || '<div class=\"muted\">Belum ada log dalam 3 bulan terakhir.</div>'}</div></div></div>`;\n}\nasync function muatRiwayat(kid, lokasi) {\n  const ada = S.riw[kid];\n  if (ada && ada.log && Date.now() - (ada.t || 0) < 60000) return;\n  try { const r = await call('kontrak.riwayat', { kid, lokasi }); S.riw[kid] = { riwayat: r.riwayat, log: r.log, bulan: r.bulan, t: Date.now() }; }\n  catch (e) { S.riw[kid] = { riwayat: [], log: [], t: Date.now() }; gagal(e); }\n  if (S.drawer === kid && S.dtab === 'riwayat') { const body = document.getElementById('dbody'); const b = bundleDrawer(); if (body && b) body.innerHTML = dRiwayat(b); }\n}\nfunction bindDrawer(b, ro, lama) {\n  const root = document.getElementById('sheet-root'), $d = s => root.querySelector(s), $$d = s => root.querySelectorAll(s), k = b.k, kid = k.KontrakID;\n  $d('#dclose').onclick = $d('#dscrim').onclick = () => closeDrawer();\n  if ($d('#dprev')) $d('#dprev').onclick = () => stepDrawer(-1);\n  if ($d('#dnext')) { $d('#dnext').onclick = () => stepDrawer(1); $d('#dnext').style.transform = 'scaleX(-1)'; }\n  $d('#dcopy').onclick = () => copyText(k.NoKontrak, 'Nomor kontrak disalin.');\n  $$d('[data-dtab]').forEach(t => t.onclick = () => { S.dtab = t.dataset.dtab; renderDrawer(false, true); });\n  const ps = $d('#dpic'); if (ps && !ps.disabled) ps.onchange = () => { if (jalankanOp('kontrak.pic', kid, { PIC: ps.value })) toast(ps.value ? `PIC diatur ke ${ps.value}.` : 'PIC dikosongkan.'); };\n  if ($d('#dverif')) $d('#dverif').onclick = () => { if (jalankanOp('kontrak.verif', kid, {})) toast('Ditandai terverifikasi.'); };\n  if ($d('#darsip')) $d('#darsip').onclick = () => modal('Arsipkan kontrak?', `<div class=\"muted\">Kontrak yang diarsipkan tidak tampil di daftar dan tidak bisa diubah. Data tetap tersimpan dan bisa dikembalikan dari filter <b>Diarsipkan</b>. Pakai untuk kontrak dobel atau batal; kontrak yang sudah selesai cukup CLOSE.</div><label class=\"of\"><span>Alasan (wajib)</span><input class=\"inp\" id=\"mAr\" placeholder=\"mis. kontrak dobel / dibatalkan customer\" maxlength=\"200\"></label>`,\n    [{ l: 'Batal' }, { l: 'Arsipkan', pri: true, fn: d => { const a = d.querySelector('#mAr').value.trim(); if (!a) { toast('Alasan wajib diisi.'); return false; } if (jalankanOp('kontrak.arsip', kid, { alasan: a })) { closeDrawer(); toast('Kontrak diarsipkan.'); } } }]);\n  if ($d('#dunarsip')) $d('#dunarsip').onclick = () => { if (jalankanOp('kontrak.unarsip', kid, {})) toast('Kontrak dikembalikan dari arsip.'); };\n  if ($d('#reopenLama')) $d('#reopenLama').onclick = () => reopenModal(b, true);\n  if (ro) return;\n  $$d('.ost').forEach(btn => btn.onclick = () => pindahTahap(b, btn.dataset.b, btn.dataset.t));\n  if ($d('#addBast')) $d('#addBast').onclick = () => bastModal(b, null);\n  $$d('[data-editb]').forEach(x => x.onclick = () => bastModal(b, x.dataset.editb));\n  if ($d('#addKend')) $d('#addKend').onclick = () => kendalaModal(b);\n  $$d('[data-tutup]').forEach(x => x.onclick = () => modal('Kendala selesai?', `<label class=\"of\"><span>Catatan (opsional)</span><input class=\"inp\" id=\"mCat\" maxlength=\"200\" placeholder=\"mis. dokumen revisi sudah diterima\"></label>`,\n    [{ l: 'Batal' }, { l: 'Tandai selesai', pri: true, fn: d => { if (jalankanOp('kendala.tutup', kid, { id: x.dataset.tutup, catatan: d.querySelector('#mCat').value })) toast('Kendala ditandai selesai.'); } }]));\n  if ($d('#editK')) $d('#editK').onclick = () => openKontrakForm(b);\n  if ($d('#addSO')) $d('#addSO').onclick = () => orderModal(b, null);\n  $$d('[data-so]').forEach(tr => tr.onclick = () => orderModal(b, tr.dataset.so));\n}\ndocument.addEventListener('keydown', e => {\n  if (!S.drawer || e.target.closest('input,select,textarea') || document.querySelector('#overlay-root .scrim')) return;\n  if (e.key === 'j' || e.key === 'J') stepDrawer(1); else if (e.key === 'k' || e.key === 'K') stepDrawer(-1);\n});\n\n/* ---------- aksi detail ---------- */\nfunction pindahTahap(b, bastId, ke) {\n  const x = b.bast.find(z => z.BASTID === bastId), dari = T(x.KodeTahap), t = T(ke);\n  if (!x || x.KodeTahap === ke) return;\n  const mundur = dari && t.Urutan < dari.Urutan;\n  modal(`${mundur ? 'Mundur' : 'Pindah'} ke ${esc(t.Label)}?`, `<div class=\"muted\">${esc(x.BASTID)}: ${esc(dari ? dari.Label : x.KodeTahap)} → <b>${esc(t.Label)}</b>${t.Penutup ? '. Ini tahap penutup: BAST menjadi <b>CLOSE</b>.' : ''}</div>\n    <label class=\"of\"><span>Keterangan${mundur ? ' (wajib saat mundur)' : ' (opsional)'}</span><input class=\"inp\" id=\"mKet\" maxlength=\"200\" placeholder=\"${mundur ? 'mis. eviden kurang, kembali dikompulir' : 'mis. sudah diterima customer'}\"></label>`,\n    [{ l: 'Batal' }, { l: mundur ? 'Mundur' : 'Pindah', pri: true, fn: d => {\n      const ket = d.querySelector('#mKet').value.trim();\n      if (mundur && !ket) { toast('Mundur tahap wajib disertai keterangan.'); return false; }\n      if (jalankanOp('bast.tahap', b.k.KontrakID, { id: bastId, ke, ket })) toast(`${x.BASTID} → ${t.Label}${b.k.PIC && b.k.PIC !== S.me.alias ? ' (dicatat \"bantu\")' : ''}.`);\n    } }]);\n}\nfunction bastModal(b, id) {\n  const k = b.k, x = id ? b.bast.find(z => z.BASTID === id) : null, orders = KD.hidup(b.order), usul = KD.dokDefault(jc(k), D.cfg);\n  const dipilih = x ? String(x.CakupanOrder).split(',').map(s => s.trim()).filter(Boolean) : orders.map(o => o.NoOrder);\n  const sisa = k.JumlahLokasi !== '' ? Math.max(0, Number(k.JumlahLokasi) - KD.hidup(b.bast).filter(z => !x || z.BASTID !== x.BASTID).reduce((a, z) => a + (Number(z.CakupanLokasi) || 0), 0)) : '';\n  modal(x ? 'Ubah ' + esc(x.BASTID) : 'Tambah BAST/BAA', `<div class=\"grid g2\" style=\"gap:12px\">\n    <label class=\"of\"><span>Dokumen tagih</span><select class=\"inp\" id=\"bDok\">${opsi(aktifRef(D.ref.dokTagih).map(d => [d.Kode, d.Kode + ' · ' + d.Label]), x ? x.DokTagih : usul)}</select><small>Usulan untuk customer ${KD.LABEL_JC[jc(k)]}: ${usul}</small></label>\n    <label class=\"of\"><span>Cakupan lokasi</span><input class=\"inp tnum\" id=\"bCak\" type=\"number\" min=\"0\" value=\"${esc(x ? x.CakupanLokasi : (b.bast.length ? sisa : ''))}\" placeholder=\"${k.JumlahLokasi !== '' ? 'sisa ' + sisa + ' dari ' + esc(k.JumlahLokasi) : 'opsional'}\"><small>${k.JumlahLokasi !== '' ? 'Total semua BAST tidak boleh melebihi ' + esc(k.JumlahLokasi) + ' lokasi.' : 'Jumlah lokasi kontrak belum diisi.'}</small></label></div>\n    ${orders.length ? `<div class=\"of\"><span>Cakupan order</span><div class=\"row\" style=\"gap:6px\">${orders.map(o => `<label class=\"chipf ${dipilih.indexOf(o.NoOrder) >= 0 ? 'on' : ''}\" style=\"cursor:pointer\"><input type=\"checkbox\" class=\"bOrd\" value=\"${esc(o.NoOrder)}\" ${dipilih.indexOf(o.NoOrder) >= 0 ? 'checked' : ''} style=\"display:none\">${esc(o.JenisOrder)} ${esc(o.NoOrder)}</label>`).join('')}</div></div>` : '<div class=\"muted\" style=\"font-size:12.5px\">Belum ada SO/MI di kontrak ini.</div>'}\n    ${x ? `<label class=\"of\"><span>No. dokumen BAST/BAA</span><input class=\"inp mono\" id=\"bNo\" value=\"${esc(x.NoDokBAST)}\" maxlength=\"80\"></label>` : ''}\n    <label class=\"of\"><span>Keterangan</span><input class=\"inp\" id=\"bKet\" value=\"${esc(x ? x.Keterangan : '')}\" maxlength=\"200\" placeholder=\"mis. lokasi tahap 1\"></label>`,\n    [{ l: 'Batal' }, { l: x ? 'Simpan' : 'Tambah', pri: true, fn: d => {\n      const data = { DokTagih: d.querySelector('#bDok').value, CakupanLokasi: d.querySelector('#bCak').value.trim(), Keterangan: d.querySelector('#bKet').value,\n                     CakupanOrder: [...d.querySelectorAll('.bOrd:checked')].map(c => c.value).join(', ') };\n      if (x) { data.id = x.BASTID; data.NoDokBAST = d.querySelector('#bNo').value; }\n      if (!jalankanOp(x ? 'bast.ubah' : 'bast.tambah', k.KontrakID, data)) return false;\n      toast(x ? 'BAST diperbarui.' : 'BAST ditambahkan.');\n    } }]);\n  setTimeout(() => document.querySelectorAll('.bOrd').forEach(c => c.parentElement.onclick = ev => { ev.preventDefault(); c.checked = !c.checked; c.parentElement.classList.toggle('on', c.checked); }), 50);\n}\nfunction kendalaModal(b) {\n  const basts = KD.hidup(b.bast), def = (bottleneck(b) || basts[basts.length - 1]).BASTID;\n  const isi = bid => {\n    const x = basts.find(z => z.BASTID === bid), close = KD.bastClose(x, D.ref), jenis = aktifRef(D.ref.kendala).filter(j => !close || j.MemicuReopen);\n    return `<label class=\"of\"><span>Jenis kendala</span><select class=\"inp\" id=\"kJ\">${opsi(jenis.map(j => [j.Kode, j.Label + (j.MemicuReopen ? ' · memicu reopen' : '')]))}</select></label>\n     ${close ? `<div class=\"note warn\">${ic('warn', 's')}<span class=\"tx\">${esc(bid)} sudah <b>CLOSE</b>. Kendala ini akan <b>membuka kembali (reopen)</b> BAST: siklus bertambah dan kontrak kembali OPEN.</span></div>\n       <label class=\"of\"><span>Kembali ke tahap</span><select class=\"inp\" id=\"kT\">${opsi(D.ref.tahap.filter(t => t.Aktif && !t.Penutup).map(t => [t.Kode, t.Label]), D.cfg.TAHAP_REOPEN || 'DRAFTING')}</select></label>` : ''}\n     <label class=\"of\"><span>Keterangan</span><input class=\"inp\" id=\"kKet\" maxlength=\"300\" placeholder=\"mis. PIC customer cuti s.d. 25 Nov\"><small>Masuk ke kolom KENDALA DETIL di sheet unit.</small></label>`;\n  };\n  modal('Buka kendala', `<label class=\"of\"><span>BAST</span><select class=\"inp\" id=\"kB\">${opsi(basts.map(x => [x.BASTID, x.BASTID + ' · ' + labelTahap(x.KodeTahap) + (KD.bastClose(x, D.ref) ? ' (CLOSE)' : '')]), def)}</select></label><div id=\"kIsi\">${isi(def)}</div>`,\n    [{ l: 'Batal' }, { l: 'Buka kendala', pri: true, fn: d => {\n      const data = { bastId: d.querySelector('#kB').value, Jenis: d.querySelector('#kJ').value, Keterangan: d.querySelector('#kKet').value.trim() };\n      const kt = d.querySelector('#kT'); if (kt) data.tahapReopen = kt.value;\n      if (!jalankanOp('kendala.buka', b.k.KontrakID, data)) return false;\n      toast(kt ? 'Kendala dibuka dan BAST di-reopen.' : 'Kendala dibuka.');\n    } }]);\n  setTimeout(() => { const s = document.getElementById('kB'); if (s) s.onchange = () => { document.getElementById('kIsi').innerHTML = isi(s.value); }; }, 50);\n}\nfunction reopenModal(b) {\n  const jenis = aktifRef(D.ref.kendala).filter(j => j.MemicuReopen), basts = KD.hidup(b.bast);\n  modal('Buka kembali ' + esc(b.k.KontrakID), `<div class=\"muted\">Reopen terjadi karena return atau revisi. Kontrak dipindah dari arsip ke data aktif dengan ID yang sama; BAST masuk siklus baru dan kendalanya dicatat.</div>\n   ${basts.length > 1 ? `<label class=\"of\"><span>BAST</span><select class=\"inp\" id=\"roB\">${opsi(basts.map(x => [x.BASTID, x.BASTID + ' · ' + x.DokTagih]), basts[basts.length - 1].BASTID)}</select></label>` : ''}\n   <label class=\"of\"><span>Alasan (kendala pemicu reopen)</span><select class=\"inp\" id=\"roK\">${opsi(jenis.map(j => [j.Kode, j.Label]))}</select></label>\n   <label class=\"of\"><span>Keterangan (wajib)</span><input class=\"inp\" id=\"roKet\" maxlength=\"300\" placeholder=\"mis. customer minta revisi nilai di BAST\"></label>\n   <label class=\"of\"><span>Kembali ke tahap</span><select class=\"inp\" id=\"roT\">${opsi(D.ref.tahap.filter(t => t.Aktif && !t.Penutup).map(t => [t.Kode, t.Label]), D.cfg.TAHAP_REOPEN || 'DRAFTING')}</select></label>`,\n   [{ l: 'Batal' }, { l: 'Buka kembali', pri: true, fn: d => {\n     const ket = d.querySelector('#roKet').value.trim();\n     if (!ket) { toast('Keterangan wajib diisi.'); return false; }\n     prosesReopenArsip(b.k.KontrakID, { bastId: d.querySelector('#roB') ? d.querySelector('#roB').value : '', Jenis: d.querySelector('#roK').value, Keterangan: ket, tahapReopen: d.querySelector('#roT').value });\n   } }]);\n}\nasync function prosesReopenArsip(kid, data) {\n  const lp = layarProgres('Membuka kembali ' + kid, ['Memindah kontrak, BAST, SO/MI & riwayat dari arsip', 'Membuka kendala & siklus baru BAST', 'Memperbarui indeks']);\n  lp.langkah(0);\n  const t = setTimeout(() => lp.langkah(1), 1500);\n  try {\n    const r = await call('arsip.reopen', Object.assign({ kid }, data));\n    clearTimeout(t); lp.langkah(2);\n    D.base[kid] = r.bundle; hitungView(kid); S.lama = null; S.arsQ = ''; delete S.riw[kid];\n    lp.selesai();\n    S.dlist = [kid]; renderDrawer(false); segarkanTampilan(); toast(`${kid} dibuka kembali dan kembali ke data aktif.`);\n  } catch (e) { clearTimeout(t); lp.selesai(); modalGagal(e); }\n}\nfunction orderModal(b, id) {\n  const o = id ? b.order.find(z => z.OrderID === id) : { JenisOrder: 'SO', NoOrder: '', JenisLayanan: '', JenisPekerjaan: '', JumlahLokasi: '', Keterangan: '' };\n  const acts = [{ l: 'Batal' }];\n  if (id) acts.push({ l: 'Hapus', fn: () => { modal('Hapus ' + esc(o.NoOrder) + '?', '<div class=\"muted\">SO/MI ditandai terhapus (tetap tercatat di Log).</div>', [{ l: 'Batal' }, { l: 'Hapus', pri: true, fn: () => { if (jalankanOp('order.hapus', b.k.KontrakID, { id })) toast('SO/MI dihapus.'); } }]); } });\n  acts.push({ l: id ? 'Simpan' : 'Tambah', pri: true, fn: d => {\n    const v = s => d.querySelector(s).value.trim();\n    const data = { o: { OrderID: id || '', JenisOrder: v('#oJ'), NoOrder: v('#oNo'), JenisLayanan: v('#oLay'), JenisPekerjaan: v('#oPek'), JumlahLokasi: v('#oLok'), Keterangan: v('#oKet') } };\n    if (!jalankanOp('order.simpan', b.k.KontrakID, data)) return false;\n    toast(id ? 'SO/MI diperbarui.' : 'SO/MI ditambahkan.');\n  } });\n  modal(id ? 'Ubah ' + esc(o.JenisOrder + ' ' + o.NoOrder) : 'Tambah SO/MI', `<div class=\"grid g2\" style=\"gap:12px\"><label class=\"of\"><span>Jenis</span><select class=\"inp\" id=\"oJ\">${opsi(['SO', 'MI'], o.JenisOrder)}</select></label><label class=\"of\"><span>No. order *</span><input class=\"inp mono\" id=\"oNo\" value=\"${esc(o.NoOrder)}\" maxlength=\"60\"></label>\n   <label class=\"of\"><span>Jenis layanan</span><input class=\"inp\" id=\"oLay\" value=\"${esc(o.JenisLayanan)}\" maxlength=\"60\"></label><label class=\"of\"><span>Jenis pekerjaan</span><input class=\"inp\" id=\"oPek\" value=\"${esc(o.JenisPekerjaan)}\" maxlength=\"60\"></label>\n   <label class=\"of\"><span>Jumlah lokasi</span><input class=\"inp tnum\" id=\"oLok\" type=\"number\" min=\"0\" value=\"${esc(o.JumlahLokasi)}\"></label><label class=\"of\"><span>Keterangan</span><input class=\"inp\" id=\"oKet\" value=\"${esc(o.Keterangan)}\" maxlength=\"200\"></label></div>`, acts);\n}\n\n/* ---------- form tambah / ubah kontrak (panel geser) ---------- */\nfunction openKontrakForm(b) {\n  const k = b ? b.k : null;\n  S.kfm = k ? { NoKontrak: k.NoKontrak, JenisDok: k.JenisDok, NamaPelanggan: k.NamaPelanggan, EndCustomer: k.EndCustomer, JudulKontrak: k.JudulKontrak, TahunProject: k.TahunProject,\n               Populasi: k.Populasi, Segment: k.Segment, NilaiKontrak: k.NilaiKontrak, JumlahLokasi: k.JumlahLokasi, PIC: k.PIC, alasan: '' }\n            : { NoKontrak: '', JenisDok: '', NamaPelanggan: '', EndCustomer: '', JudulKontrak: '', TahunProject: String(new Date().getFullYear()), Populasi: '', Segment: '', NilaiKontrak: '', JumlahLokasi: '',\n                PIC: can('pic.atur') ? '' : (S.me.alias || ''), orders: [{ JenisOrder: 'SO', NoOrder: '', JenisLayanan: '', JenisPekerjaan: '', JumlahLokasi: '' }], buatBast: true, dokTagih: '' };\n  S.kfmAwal = isiKForm(S.kfm);\n  if (!b && S.kfmDraft) { S.kfm = S.kfmDraft; S.kfmDraft = null; setTimeout(() => toast('Melanjutkan isian kontrak baru yang belum disimpan.'), 200); }\n  S.kfmOrig = b || null; S.kfmErr = '';\n  const keep = S.drawer; S.drawerSimpan = keep;\n  renderKForm(true);\n  setTimeout(() => { const el = document.querySelector('#overlay-root #fNo'); if (el) el.focus(); }, 80);\n}\nfunction closeKForm() { const r = document.getElementById('kform-root'); if (r) r.remove(); }\nfunction goyang(el) { if (!el) return; el.classList.remove('goyang'); void el.offsetWidth; el.classList.add('goyang'); toast('Klik Batal atau ✕ untuk menutup. Isian tidak hilang bila diklik di luar.'); }\nconst isiKForm = F => JSON.stringify(F);\n/** Tutup form kontrak: konfirmasi bila isian berubah; isian kontrak BARU yang belum disimpan diingat untuk dibuka lagi (C12). */\nfunction tutupKFormTanya() {\n  const F = S.kfm; if (!F) { closeKForm(); return; }\n  const berubah = isiKForm(F) !== S.kfmAwal;\n  if (berubah && !S.kfmOrig) { S.kfmDraft = KD.salin(F); closeKForm(); toast('Isian kontrak baru disimpan sementara. Klik Tambah kontrak untuk melanjutkan.'); return; }\n  if (berubah && !confirm('Perubahan data kontrak belum disimpan. Tutup dan buang perubahan?')) return;\n  closeKForm();\n}\nfunction dupeLokal(no) {\n  const nk = KD.normKey(no); if (!nk) return null;\n  const own = S.kfmOrig ? S.kfmOrig.k.KontrakID : null;\n  return semuaKontrak().find(b => b.k.KontrakID !== own && (b.k.NoKontrakNorm === nk || (b.alias || []).some(a => a.AliasNorm === nk))) || null;\n}\nfunction renderKForm(opening) {\n  const F = S.kfm, O = S.kfmOrig, baru = !O;\n  let root = document.getElementById('kform-root');\n  if (!root) { root = document.createElement('div'); root.id = 'kform-root'; document.getElementById('overlay-root').appendChild(root); }\n  const sc = root.querySelector('.dbody') ? root.querySelector('.dbody').scrollTop : 0, d = dupeLokal(F.NoKontrak), jcF = KD.jenisCustomer(F.NamaPelanggan, F.EndCustomer), usul = KD.dokDefault(jcF, D.cfg);\n  const nomorBerubah = O && KD.normKey(F.NoKontrak) !== O.k.NoKontrakNorm && F.NoKontrak.trim();\n  const nilai = KD.bacaRupiah(F.NilaiKontrak);\n  root.innerHTML = `<div><div class=\"dscrim\" id=\"kfScrim\" style=\"z-index:60;${opening ? '' : 'animation:none'}\"></div>\n  <aside class=\"drawer\" role=\"dialog\" aria-modal=\"true\" aria-label=\"${baru ? 'Tambah kontrak' : 'Ubah kontrak'}\" style=\"width:min(680px,100vw);z-index:61;${opening ? '' : 'animation:none'}\">\n   <div class=\"dhead\" style=\"padding-bottom:14px\"><div class=\"dtop\"><button class=\"iconbtn\" id=\"kfClose\" aria-label=\"Tutup\">${ic('x')}</button><div><div class=\"eyebrow\">${baru ? 'Kontrak baru' : 'Ubah data kontrak'}</div><div style=\"font-weight:800;font-size:18px\">${baru ? 'Tambah kontrak' : esc(O.k.KontrakID)}</div></div></div></div>\n   <div class=\"dbody\">\n    <div class=\"sect\"><div class=\"eyebrow\">Identitas</div>\n     <label class=\"of\"><span>No. kontrak *</span><input class=\"inp mono\" id=\"fNo\" value=\"${esc(F.NoKontrak)}\" maxlength=\"120\" autocomplete=\"off\" spellcheck=\"false\"></label>\n     <div id=\"fDupe\">${d ? `<div class=\"dupe\">${ic('warn', 's')} Nomor ini sudah terdaftar sebagai <b>${esc(d.k.KontrakID)}</b> (${esc(custName(d.k))}). <button type=\"button\" class=\"btn sm ghost\" data-buka=\"${esc(d.k.KontrakID)}\">Buka</button></div>` : F.NoKontrak ? `<div class=\"muted\" style=\"font-size:11.5px;margin-top:4px\">Kunci pencocokan: <span class=\"mono\">${esc(KD.normKey(F.NoKontrak))}</span>. Kontrak lama di arsip dicek saat menyimpan.</div>` : ''}</div>\n     ${nomorBerubah ? `<label class=\"of\"><span>Alasan koreksi nomor</span><input class=\"inp\" id=\"fAlasan\" value=\"${esc(F.alasan)}\" maxlength=\"200\" placeholder=\"mis. salah ketik, sesuai dokumen kontrak\"><small>Nomor lama <span class=\"mono\">${esc(O.k.NoKontrak)}</span> disimpan sebagai <b>nomor lama</b>, supaya baris di sheet unit tetap dikenali. ID ${esc(O.k.KontrakID)} tidak berubah.</small></label>` : ''}\n     <label class=\"of\"><span>Judul kontrak *</span><input class=\"inp\" id=\"fJudul\" value=\"${esc(F.JudulKontrak)}\" maxlength=\"200\"></label>\n     <div class=\"grid g2\" style=\"gap:12px\"><label class=\"of\"><span>Jenis dok</span><select class=\"inp\" id=\"fJenis\">${opsi(aktifRef(D.ref.jenisDok).map(x => [x.Kode, x.Label]).concat(F.JenisDok && !aktifRef(D.ref.jenisDok).some(x => x.Kode === F.JenisDok) ? [[F.JenisDok, F.JenisDok]] : []), F.JenisDok, baru ? '(tebak dari nomor)' : '—')}</select></label>\n      <label class=\"of\"><span>Tahun project</span><input class=\"inp tnum\" id=\"fTahun\" value=\"${esc(F.TahunProject)}\" maxlength=\"4\" inputmode=\"numeric\"></label></div></div>\n    <div class=\"sect\"><div class=\"eyebrow\">Customer</div>\n     <div class=\"grid g2\" style=\"gap:12px\"><label class=\"of\"><span>Customer (direct)</span><input class=\"inp\" id=\"fPel\" value=\"${esc(F.NamaPelanggan)}\" maxlength=\"120\"></label><label class=\"of\"><span>End customer</span><input class=\"inp\" id=\"fEnd\" value=\"${esc(F.EndCustomer)}\" maxlength=\"120\"></label></div>\n     <div id=\"fJc\">${custPill({ NamaPelanggan: F.NamaPelanggan, EndCustomer: F.EndCustomer })} <span class=\"muted\" style=\"font-size:12px\">· usulan dokumen tagih <b>${usul}</b></span></div></div>\n    <div class=\"sect\"><div class=\"eyebrow\">Nilai & referensi</div>\n     <div class=\"grid g2\" style=\"gap:12px\"><label class=\"of\"><span>Nilai kontrak</span><input class=\"inp tnum\" id=\"fNilai\" value=\"${esc(F.NilaiKontrak)}\" placeholder=\"mis. 1.250.000.000\"><small id=\"fRp\">${F.NilaiKontrak !== '' ? (nilai.e ? '<span style=\"color:var(--crit)\">bukan angka</span>' : rp(nilai.v)) : ''}</small></label>\n      <label class=\"of\"><span>Jumlah lokasi</span><input class=\"inp tnum\" id=\"fLok\" type=\"number\" min=\"1\" value=\"${esc(F.JumlahLokasi)}\" placeholder=\"opsional\"></label>\n      <label class=\"of\"><span>Populasi</span><select class=\"inp\" id=\"fPop\">${opsi(aktifRef(D.ref.populasi).map(x => [x.Kode, x.Label]), F.Populasi, '—')}</select></label>\n      <label class=\"of\"><span>Segment</span><select class=\"inp\" id=\"fSeg\">${opsi(aktifRef(D.ref.segment).map(x => [x.Kode, x.Label]), F.Segment, '—')}</select></label>\n      <label class=\"of\"><span>PIC</span><select class=\"inp\" id=\"fPic\" ${can('pic.atur') ? '' : 'disabled'}>${opsi(picList().concat(F.PIC && picList().indexOf(F.PIC) < 0 ? [F.PIC] : []), F.PIC, '— Tanpa PIC —')}</select><small>${can('pic.atur') ? '' : 'PIC sementara = Anda; admin bisa menggantinya.'}</small></label></div></div>\n    ${baru ? `<div class=\"sect\"><div class=\"eyebrow\">SO / MI</div>\n     ${F.orders.map((o, i) => `<div class=\"orow\"><select class=\"inp\" data-o=\"${i}\" data-f=\"JenisOrder\" aria-label=\"Jenis order\">${opsi(['SO', 'MI'], o.JenisOrder)}</select><input class=\"inp mono\" data-o=\"${i}\" data-f=\"NoOrder\" value=\"${esc(o.NoOrder)}\" placeholder=\"No. SO/MI\" aria-label=\"No. order\"><input class=\"inp\" data-o=\"${i}\" data-f=\"JenisLayanan\" value=\"${esc(o.JenisLayanan)}\" placeholder=\"Layanan\" aria-label=\"Layanan\"><input class=\"inp\" data-o=\"${i}\" data-f=\"JenisPekerjaan\" value=\"${esc(o.JenisPekerjaan)}\" placeholder=\"Pekerjaan\" aria-label=\"Pekerjaan\"><input class=\"inp tnum\" data-o=\"${i}\" data-f=\"JumlahLokasi\" value=\"${esc(o.JumlahLokasi)}\" placeholder=\"Lok.\" aria-label=\"Lokasi\"><button type=\"button\" class=\"iconbtn\" data-odel=\"${i}\" aria-label=\"Hapus baris\">${ic('x', 's')}</button></div>`).join('')}\n     <button type=\"button\" class=\"btn sm ghost\" id=\"fAddO\" style=\"align-self:flex-start\">${ic('add', 's')}Tambah SO/MI</button></div>\n    <div class=\"sect\"><div class=\"eyebrow\">BAST pertama</div>\n     <div class=\"swrow\"><div style=\"flex:1\"><b>Buat BAST-1 sekarang</b><small>Masuk tahap ${esc(labelTahap(KD.tahapPertama(D.ref)))} dengan cakupan semua SO/MI di atas.</small></div><button type=\"button\" class=\"toggle ${F.buatBast ? 'on' : ''}\" id=\"fBast\" aria-pressed=\"${F.buatBast}\" aria-label=\"Buat BAST-1\"></button></div>\n     ${F.buatBast ? `<label class=\"of\"><span>Dokumen tagih</span><select class=\"inp\" id=\"fDok\">${opsi(aktifRef(D.ref.dokTagih).map(x => [x.Kode, x.Kode + ' · ' + x.Label]), F.dokTagih || usul)}</select><small>Usulan mengikuti jenis customer; bisa diganti per BAST kapan saja.</small></label>` : ''}</div>` : ''}\n    <div id=\"fErr\">${S.kfmErr ? `<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(S.kfmErr)}</span></div>` : ''}</div>\n   </div>\n   <div class=\"sfoot\"><button class=\"btn\" id=\"kfCancel\">Batal</button><button class=\"btn pri\" id=\"kfSave\">${ic('check', 's')}${baru ? 'Simpan kontrak' : 'Simpan perubahan'}</button></div>\n  </aside></div>`;\n  root.querySelector('.dbody').scrollTop = sc;\n  bindKForm();\n}\nfunction bindKForm() {\n  const root = document.getElementById('kform-root'), q = s => root.querySelector(s), F = S.kfm;\n  q('#kfClose').onclick = q('#kfCancel').onclick = tutupKFormTanya;\n  q('#kfScrim').onclick = () => goyang(root.querySelector('.drawer'));\n  const upd = (sel, key, render) => { const el = q(sel); if (!el) return; el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { F[key] = el.value; if (render) render(); }); };\n  const segarJc = () => { const j = KD.jenisCustomer(F.NamaPelanggan, F.EndCustomer); q('#fJc').innerHTML = `${custPill({ NamaPelanggan: F.NamaPelanggan, EndCustomer: F.EndCustomer })} <span class=\"muted\" style=\"font-size:12px\">· usulan dokumen tagih <b>${KD.dokDefault(j, D.cfg)}</b></span>`; };\n  const segarNo = () => { const pos = q('#fNo').selectionStart; const berubah = S.kfmOrig && (KD.normKey(F.NoKontrak) !== S.kfmOrig.k.NoKontrakNorm) !== !!q('#fAlasan'); if (berubah) { renderKForm(false); const n = q('#fNo'); n.focus(); n.setSelectionRange(pos, pos); return; } const d = dupeLokal(F.NoKontrak); q('#fDupe').innerHTML = d ? `<div class=\"dupe\">${ic('warn', 's')} Nomor ini sudah terdaftar sebagai <b>${esc(d.k.KontrakID)}</b> (${esc(custName(d.k))}). <button type=\"button\" class=\"btn sm ghost\" data-buka=\"${esc(d.k.KontrakID)}\">Buka</button></div>` : F.NoKontrak ? `<div class=\"muted\" style=\"font-size:11.5px;margin-top:4px\">Kunci pencocokan: <span class=\"mono\">${esc(KD.normKey(F.NoKontrak))}</span>. Kontrak lama di arsip dicek saat menyimpan.</div>` : ''; bindBuka(); };\n  const bindBuka = () => root.querySelectorAll('[data-buka]').forEach(b => b.onclick = () => { closeKForm(); openDrawer(b.dataset.buka); });\n  upd('#fNo', 'NoKontrak', segarNo); upd('#fJudul', 'JudulKontrak'); upd('#fJenis', 'JenisDok'); upd('#fTahun', 'TahunProject'); upd('#fPel', 'NamaPelanggan', segarJc); upd('#fEnd', 'EndCustomer', segarJc);\n  upd('#fNilai', 'NilaiKontrak', () => { const n = KD.bacaRupiah(F.NilaiKontrak); q('#fRp').innerHTML = F.NilaiKontrak !== '' ? (n.e ? '<span style=\"color:var(--crit)\">bukan angka</span>' : rp(n.v)) : ''; });\n  upd('#fLok', 'JumlahLokasi'); upd('#fPop', 'Populasi'); upd('#fSeg', 'Segment'); upd('#fPic', 'PIC'); upd('#fAlasan', 'alasan'); upd('#fDok', 'dokTagih');\n  bindBuka();\n  root.querySelectorAll('[data-o]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { F.orders[+el.dataset.o][el.dataset.f] = el.value; }));\n  root.querySelectorAll('[data-odel]').forEach(b => b.onclick = () => { F.orders.splice(+b.dataset.odel, 1); renderKForm(false); });\n  if (q('#fAddO')) q('#fAddO').onclick = () => { F.orders.push({ JenisOrder: 'SO', NoOrder: '', JenisLayanan: '', JenisPekerjaan: '', JumlahLokasi: '' }); renderKForm(false); };\n  if (q('#fBast')) q('#fBast').onclick = () => { F.buatBast = !F.buatBast; renderKForm(false); };\n  q('#kfSave').onclick = simpanKontrak;\n}\nfunction simpanKontrak() {\n  const F = S.kfm, O = S.kfmOrig, err = m => { S.kfmErr = m; renderKForm(false); const b = document.querySelector('#kform-root .dbody'); if (b) b.scrollTop = 1e5; };\n  const d = dupeLokal(F.NoKontrak);\n  if (d) return err(`No. kontrak sudah terdaftar sebagai ${d.k.KontrakID}. Buka kontrak itu, atau bila penulisannya berbeda, koreksi nomornya di sana.`);\n  const f = {}; KD.FIELD_KONTRAK.forEach(c => { if (c in F) f[c] = F[c]; });\n  try {\n    if (!O) {\n      const kid = jalankanOp('kontrak.buat', null, { f, orders: F.orders, buatBast: F.buatBast, dokTagih: F.buatBast ? (F.dokTagih || '') : '' }, { lempar: true });\n      closeKForm(); S.kfmDraft = null; S.kf.st = 'OPEN'; S.kf.q = ''; if (S.page !== 'kontrak') go('kontrak'); else rerenderKontrak();\n      setTimeout(() => openDrawer(kid), 320); toast('Kontrak didaftarkan. Nomor kontrak lama di arsip dicek server; bila dobel, Anda diberi tahu.');\n    } else {\n      const ch = KD.FIELD_KONTRAK.filter(c => String(f[c] ?? '') !== String(O.k[c] ?? ''));\n      if (!ch.length) { closeKForm(); toast('Tidak ada perubahan.'); return; }\n      const patch = {}; ch.forEach(c => { patch[c] = f[c]; });\n      jalankanOp('kontrak.ubah', O.k.KontrakID, { f: patch, alasan: F.alasan }, { lempar: true });\n      closeKForm(); toast(ch.indexOf('NoKontrak') >= 0 ? 'Disimpan. Nomor lama disimpan sebagai alias.' : 'Data kontrak disimpan.');\n    }\n  } catch (e) { err(e.message || String(e)); }\n}\n\n/* ================= F2 · Upload Excel dengan template SKM (§11.0) ================= */\nS.up = { step: 1, file: '', rowsRaw: [], soRaw: [], rows: [], so: [], mode: 'lewati', f: 'all', tab: 'kontrak', hasil: null, ada: {}, progres: null };\nconst BAGIAN = 150;\nconst ST_UP = { baru: ['p-ok', 'Baru'], peringatan: ['p-warn', 'Baru · peringatan'], ada: ['p-dim', 'Sudah ada'], error: ['p-crit', 'Error'] };\nconst LBL_KOL = { JudulKontrak: 'Judul', JenisDok: 'Jenis dok', TahunProject: 'Tahun', Populasi: 'Populasi', NamaPelanggan: 'Customer', EndCustomer: 'End customer', Segment: 'Segment', NilaiKontrak: 'Nilai', JumlahLokasi: 'Jumlah lokasi', PIC: 'PIC' };\n\nfunction resetUpload() { S.up = { step: 1, file: '', rowsRaw: [], soRaw: [], rows: [], so: [], mode: 'lewati', f: 'all', tab: 'kontrak', hasil: null, ada: {}, progres: null }; }\nfunction cariNomorUpload(nk) {\n  const lokal = semuaKontrak().find(b => b.k.NoKontrakNorm === nk || (b.alias || []).some(a => a.AliasNorm === nk));\n  if (lokal) return { KontrakID: lokal.k.KontrakID, NoKontrak: lokal.k.NoKontrak, lokasi: 'AKTIF', viaAlias: lokal.k.NoKontrakNorm !== nk };\n  return S.up.ada[nk] || null;\n}\nfunction periksaUlang() {\n  const U = S.up;\n  U.rows = KD.periksaUpload(U.rowsRaw, { ref: D.ref, cfg: D.cfg, pic: picList(), bolehPic: can('pic.atur'), alias: S.me.alias || '', hariIni: D.hariIni || hariIniStr(), cariNomor: cariNomorUpload });\n  U.so = KD.periksaSO(U.soRaw, U.rows, cariNomorUpload);\n}\nfunction ringkasUpload() {\n  const U = S.up, r = U.rows, c = st => r.filter(o => o.st === st).length, ada = r.filter(o => o.st === 'ada');\n  const bisaUbah = o => o.ada && o.ada.lokasi === 'AKTIF' && KD.perubahanUpload(o, (kontrak(o.ada.KontrakID) || {}).k).length > 0;\n  const upd = U.mode === 'perbarui' ? ada.filter(bisaUbah).length : 0;\n  return { total: r.length, baru: c('baru'), warn: c('peringatan'), ada: ada.length, upd, lewat: ada.length - upd, err: c('error'),\n           soOk: U.so.filter(s => s.st === 'ok').length + r.filter(o => o.st !== 'error').reduce((a, o) => a + (o.orders || []).length, 0), soErr: U.so.filter(s => s.st === 'error').length };\n}\nasync function bacaFileUpload(file) {\n  const U = S.up;\n  if (!/\\.xlsx$/i.test(file.name)) { modal('Bukan file .xlsx', `<div class=\"note warn\">${ic('warn', 's')}<span class=\"tx\">Pilih file Excel berakhiran <b>.xlsx</b>. File .xls lama: buka di Excel lalu <i>Save As → Excel Workbook (.xlsx)</i>.</span></div>`, [{ l: 'Mengerti', pri: true }]); return; }\n  const lp = layarProgres('Membaca ' + file.name, ['Membuka file Excel', 'Mengenali kolom', 'Mencocokkan nomor dengan semua kontrak (termasuk arsip)', 'Memeriksa setiap baris']);\n  try {\n    lp.langkah(0);\n    const sheets = await XLSXR.baca(await file.arrayBuffer());\n    lp.langkah(1);\n    const cari = (nama, def) => { const s = sheets.find(x => x.nama.toLowerCase() === nama) || sheets.find(x => KD.barisDariAoa(x.aoa, def)); return s ? KD.barisDariAoa(s.aoa, def) : null; };\n    const rows = cari('kontrak', KD.KOL_UPLOAD);\n    if (!rows) { lp.selesai(); modal('Bukan template SKM', `<div class=\"note warn\">${ic('warn', 's')}<span class=\"tx\">Tidak ada tab <b>Kontrak</b> dengan kolom <b>No. Kontrak</b> di file <span class=\"mono\">${esc(file.name)}</span>. Unduh template dari halaman ini, isi, lalu upload lagi.</span></div><div class=\"muted\" style=\"font-size:12px\">Sheet FF format lama (kolom NO WO/SPK/KL, STATUS AWAL, …) dibaca lewat <b>Import data lama</b>.</div>`, [{ l: 'Tutup' }, { l: 'Buka Import data lama', pri: true, fn: () => go('import') }]); return; }\n    if (!rows.length) { lp.selesai(); toast('Tab Kontrak masih kosong.', true); return; }\n    if (rows.length > 1000) { lp.selesai(); toast(`File berisi ${rows.length} baris. Maksimal 1.000 per upload; pecah jadi beberapa file.`, true); return; }\n    const soSheet = sheets.find(x => /^so[_ ]?mi$/i.test(x.nama)), so = soSheet ? (KD.barisDariAoa(soSheet.aoa, KD.KOL_SO) || []) : [];\n    lp.langkah(2);\n    const nomor = [...new Set(rows.map(r => KD.normKey(r.no)).concat(so.map(r => KD.normKey(r.no))).filter(Boolean))];\n    const ada = {};\n    for (let i = 0; i < nomor.length; i += 500) Object.assign(ada, (await call('upload.cekNomor', { nomor: nomor.slice(i, i + 500) })).ada);\n    lp.langkah(3);\n    Object.assign(U, { file: file.name, rowsRaw: rows, soRaw: so, ada, step: 3, f: 'all', tab: 'kontrak' });\n    periksaUlang();\n    lp.selesai();\n    renderUpload();\n  } catch (e) { lp.selesai(); modalGagal({ kode: e.kode, pesan: e.pesan || e.message || String(e) }); }\n}\nfunction stepperUpload(cur) {\n  return `<div class=\"ustep\">${['Unduh template', 'Pilih file', 'Periksa', 'Selesai'].map((s, i) => `<div class=\"${i + 1 < cur ? 'done' : (i + 1 === cur || (cur === 1 && i === 1)) ? 'on' : ''}\"><i>${i + 1 < cur ? '✓' : i + 1}</i><span>${s}</span></div>`).join('<b></b>')}</div>`;\n}\nfunction viewUpload() {\n  if (!D.siap) return '<div class=\"loading\"><div class=\"spinner\"></div>Memuat data aktif…</div>';\n  const U = S.up;\n  if (U.step === 1) return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:16px\">${stepperUpload(1)}\n   <div class=\"grid g2\">\n    <div class=\"ucard\"><div class=\"uic\">${ic('doc')}</div><div><h3>1. Unduh template</h3><div class=\"muted\">Satu baris = satu kontrak, termasuk kolom <b>No. SO</b> dan <b>No. MI</b> (banyak nomor dipisah koma). Dropdown Populasi, Segment, PIC, Tahap, Kendala mengikuti Pengaturan saat diunduh. Kolom merah wajib.</div>\n      <div class=\"row\" style=\"margin-top:12px\"><button class=\"btn pri\" id=\"upTpl\">${ic('dl', 's')}Unduh template</button></div></div></div>\n    <label class=\"drop\" id=\"upDrop\" tabindex=\"0\"><input type=\"file\" id=\"upFile\" accept=\".xlsx\" hidden>\n      <div class=\"uic big\">${ic('up2')}</div><h3>2. Upload file yang sudah diisi</h3><div class=\"muted\">Tarik file .xlsx ke sini, atau <b style=\"color:var(--accent)\">klik untuk memilih</b>.</div>\n      <div class=\"dim\" style=\"font-size:12px\">Belum ada yang disimpan sampai Anda menekan <b>Simpan</b> di langkah berikutnya.</div></label>\n   </div>\n   <div class=\"ucard\" style=\"align-items:center\"><div class=\"uic\">${ic('dl')}</div><div style=\"flex:1\"><h3>Punya sheet FF format lama?</h3><div class=\"muted\">Untuk memindahkan data lama sekali jalan (kolom STATUS AWAL, KENDALA UMUM, dst.) tidak perlu menyalin ke template. Pakai <b>Import data lama</b>.</div></div><button class=\"btn ton\" data-go2=\"import\">Import sheet FF lama ${ic('chevR', 's')}</button></div>\n   <div class=\"note info\">${ic('shield', 's')}<span class=\"tx\">Aturan: nomor yang sudah ada di SKM (termasuk <b>nomor lama</b> dan kontrak di arsip) dilewati atau diperbarui sesuai pilihan Anda; baris error tidak disimpan; setiap kontrak dapat BAST-1 otomatis; semua tercatat di Log atas nama <b>${esc(S.me.nama)}</b>. Maksimal 1.000 kontrak per file.</span></div>\n  </div>`;\n  if (U.step === 3) {\n    const R = ringkasUpload(), flt = U.rows.filter(o => U.f === 'all' || o.st === U.f), simpanN = R.baru + R.warn + R.upd, sib = !!U.progres;\n    const tile = (f, n, l, cls) => `<button class=\"utile ${cls} ${U.f === f ? 'on' : ''}\" data-uf=\"${f}\" ${sib ? 'disabled' : ''}><b class=\"tnum\">${n}</b><span>${l}</span></button>`;\n    return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:14px\">${stepperUpload(3)}\n     <div class=\"row\"><span class=\"pill p-dim\">${ic('doc', 's')} ${esc(U.file)}</span><span class=\"muted\">${R.total} baris kontrak · ${U.rows.reduce((a, o) => a + (o.orders || []).length, 0) + U.so.length} SO/MI</span><span class=\"sp\"></span><button class=\"btn sm\" id=\"upGanti\" ${sib ? 'disabled' : ''}>Ganti file</button></div>\n     <div class=\"utiles\">${tile('all', R.total, 'Semua baris', '')}${tile('baru', R.baru, 'Siap dibuat', 'ok')}${tile('peringatan', R.warn, 'Dibuat dengan peringatan', 'warn')}${tile('ada', R.ada, U.mode === 'perbarui' ? `Sudah ada · ${R.upd} diperbarui` : 'Sudah ada · dilewati', 'dim')}${tile('error', R.err, 'Error · tidak disimpan', 'crit')}</div>\n     <div class=\"row\"><span style=\"font-weight:600\">Bila nomor sudah ada di SKM:</span>\n      <div class=\"seg\" role=\"group\">${[['lewati', 'Lewati'], ['perbarui', 'Perbarui kolom yang diisi']].map(([v, l]) => `<button data-umode=\"${v}\" class=\"${U.mode === v ? 'on' : ''}\" ${sib ? 'disabled' : ''}>${l}</button>`).join('')}</div>\n      <span class=\"muted\" style=\"font-size:12px\">${U.mode === 'perbarui' ? 'Sel kosong di Excel tidak menghapus data. Tahap &amp; kendala kontrak lama tidak diubah. Kontrak di arsip tidak diubah.' : 'Data kontrak lama tidak disentuh.'}</span></div>\n     ${U.soRaw.length ? `<div class=\"dtabs\" style=\"margin:0\"><button data-utab=\"kontrak\" class=\"${U.tab === 'kontrak' ? 'on' : ''}\">Tab Kontrak <span class=\"pill p-dim\">${R.total}</span></button><button data-utab=\"so\" class=\"${U.tab === 'so' ? 'on' : ''}\">Tab SO_MI (template lama) <span class=\"pill ${R.soErr ? 'p-crit' : 'p-dim'}\">${U.so.length}${R.soErr ? ' · ' + R.soErr + ' error' : ''}</span></button></div>` : ''}\n     ${U.tab === 'kontrak' ? `<div class=\"tbl-wrap\"><table class=\"t utbl\"><thead><tr><th>Baris</th><th>Hasil</th><th style=\"min-width:260px\">Kontrak</th><th style=\"min-width:280px\">Catatan pemeriksaan</th><th class=\"num\">Nilai</th><th>BAST-1 &amp; PIC</th></tr></thead><tbody>\n      ${flt.map(o => { const kAda = o.ada && kontrak(o.ada.KontrakID), ch = U.mode === 'perbarui' && o.ada && o.ada.lokasi === 'AKTIF' ? KD.perubahanUpload(o, kAda ? kAda.k : null) : [];\n        return `<tr class=\"u-${o.st}\"><td class=\"tnum muted\">${o.baris}</td><td><span class=\"pill ${ST_UP[o.st][0]}\">${o.st === 'ada' && ch.length ? 'Diperbarui' : o.st === 'ada' ? 'Dilewati' : ST_UP[o.st][1]}</span></td>\n        <td><span class=\"no\">${esc(o.no) || '<span class=\"muted\">(kosong)</span>'}</span><span class=\"sub\">${esc(o.judul) || (kAda ? esc(kAda.k.JudulKontrak) : '')}</span><span class=\"sub\">${o.ada ? esc(kAda ? custName(kAda.k) : (o.ada.NoKontrak || '')) : `${esc(o.end || o.pel || '—')} ${custPill({ NamaPelanggan: o.pel, EndCustomer: o.end })}`}</span>${(o.orders || []).length ? `<span class=\"sub mono\" style=\"font-size:11.5px\">${o.orders.map(x => esc(x.JenisOrder + ' ' + x.NoOrder)).join(', ')}</span>` : ''}\n         ${o.ada ? `<span class=\"ahit\">${ic('link', 's')}<span>${o.ada.viaAlias ? `Nomor lama dari <b>${esc(o.ada.KontrakID)}</b>; nomor sekarang <span class=\"mono\">${esc(o.ada.NoKontrak)}</span>` : `Sudah terdaftar sebagai <b>${esc(o.ada.KontrakID)}</b>`}${o.ada.lokasi && o.ada.lokasi !== 'AKTIF' ? ' · di arsip ' + esc(o.ada.lokasi.replace('ARSIP_', '')) : ''}</span></span>` : ''}</td>\n        <td><ul class=\"umsg\">${o.err.map(e => `<li class=\"e\">${esc(e)}</li>`).join('')}${o.warn.map(e => `<li class=\"w\">${esc(e)}</li>`).join('')}${o.info.map(e => `<li>${esc(e)}</li>`).join('')}\n          ${ch.map(([c, a, b]) => `<li>${LBL_KOL[c] || c}: <s class=\"muted\">${esc(a === '' ? '(kosong)' : c === 'NilaiKontrak' ? rp(a) : a)}</s> → <b>${esc(c === 'NilaiKontrak' ? rp(b) : b)}</b></li>`).join('')}\n          ${o.st === 'ada' && U.mode === 'perbarui' && !ch.length && (!o.ada || o.ada.lokasi === 'AKTIF') ? '<li>Tidak ada perbedaan</li>' : ''}${!o.err.length && !o.warn.length && !o.info.length && o.st === 'baru' ? '<li class=\"ok\">Lengkap</li>' : ''}</ul></td>\n        <td class=\"num\">${o.nilai ? rp(o.nilai) : '<span class=\"muted\">—</span>'}</td>\n        <td>${o.ada ? '<span class=\"muted\">tidak diubah</span>' : o.st === 'error' ? '<span class=\"muted\">—</span>' : `${tahapPill(o.tahap)}<div class=\"muted\" style=\"font-size:11.5px;margin-top:3px\">${esc(o.docFinal || '')}${o.tgl ? ' · sejak ' + esc(o.tgl) + ' (' + KD.hariSejak(o.tgl, D.hariIni || hariIniStr()) + ' hr)' : ''}${o.kend ? ` · <span style=\"color:var(--crit)\">${esc(labelKendala(o.kend))}</span>` : ''}</div>`}<div style=\"font-size:12px;margin-top:3px\">PIC: ${o.pic ? esc(o.pic) : '<span class=\"muted\">—</span>'}</div></td></tr>`; }).join('') || '<tr><td colspan=\"6\" class=\"muted\" style=\"text-align:center;padding:28px\">Tidak ada baris di kategori ini.</td></tr>'}\n      </tbody></table></div>`\n     : `<div class=\"tbl-wrap\"><table class=\"t utbl\"><thead><tr><th>Baris</th><th>Hasil</th><th>No. kontrak</th><th>Jenis</th><th>No. order</th><th>Layanan</th><th class=\"num\">Lokasi</th><th>Catatan pemeriksaan</th></tr></thead><tbody>\n      ${U.so.map(s => `<tr class=\"u-${s.st}\"><td class=\"tnum muted\">${s.baris}</td><td><span class=\"pill ${s.st === 'ok' ? 'p-ok' : 'p-crit'}\">${s.st === 'ok' ? 'OK' : 'Error'}</span></td><td class=\"mono\" style=\"font-size:12px\">${esc(s.no)}</td><td>${esc(s.j)}</td><td class=\"mono\" style=\"font-size:12px\">${esc(s.ono)}</td><td>${esc(s.lay)}</td><td class=\"num\">${esc(s.lok)}</td><td><ul class=\"umsg\">${s.err.map(e => `<li class=\"e\">${esc(e)}</li>`).join('') || '<li class=\"ok\">Ikut disimpan bersama kontraknya</li>'}</ul></td></tr>`).join('') || '<tr><td colspan=\"8\" class=\"muted\" style=\"text-align:center;padding:28px\">Tab SO_MI kosong (boleh).</td></tr>'}\n      </tbody></table></div>`}\n     ${U.progres ? `<div class=\"bulk\" style=\"position:sticky;bottom:12px\"><span class=\"bspin\"></span><b>Menyimpan bagian ${U.progres.ke} dari ${U.progres.dari}…</b><div class=\"upbar\"><i style=\"width:${Math.round((U.progres.ke - 1) / U.progres.dari * 100)}%\"></i></div><span class=\"muted\" style=\"font-size:12.5px\">Jangan tutup halaman ini.</span></div>`\n     : `<div class=\"bulk\" style=\"position:sticky;bottom:12px\"><b>${simpanN} kontrak akan ${R.upd ? 'dibuat/diperbarui' : 'dibuat'}</b><span class=\"muted\" style=\"font-size:12.5px\">${R.err ? R.err + ' error dilewati · ' : ''}${R.lewat ? R.lewat + ' sudah ada dilewati · ' : ''}${R.soOk} SO/MI ikut</span><span class=\"sp\"></span>\n      ${R.err + R.soErr ? `<button class=\"btn sm\" id=\"upLap\">${ic('dl', 's')}Unduh laporan error</button>` : ''}<button class=\"btn sm pri\" id=\"upSave\" ${simpanN ? '' : 'disabled'}>Simpan ${simpanN} kontrak</button></div>`}\n     ${R.err ? `<div class=\"note warn\">${ic('warn', 's')}<span class=\"tx\">Baris error tidak disimpan. Perbaiki di Excel lalu upload file yang sama lagi: baris yang sudah tersimpan akan terbaca <b>Sudah ada</b> sehingga tidak dobel.</span></div>` : ''}\n    </div>`;\n  }\n  const H = U.hasil;\n  return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:16px\">${stepperUpload(4)}\n   <div class=\"udone\"><div class=\"uic big ok\">${ic('check')}</div><div><h3>Upload selesai</h3><div class=\"muted\">${esc(U.file)} · disimpan atas nama ${esc(S.me.nama)} · tercatat di Log</div></div></div>\n   <div class=\"utiles\">${[['ok', H.dibuat.length, 'Kontrak dibuat'], ['dim', H.diperbarui.length, 'Diperbarui'], ['dim', H.dilewati, 'Sudah ada, dilewati'], ['crit', H.gagal.length, 'Error, tidak disimpan'], ['', H.so, 'SO/MI ditambahkan']].map(([c, n, l]) => `<div class=\"utile ${c}\"><b class=\"tnum\">${n}</b><span>${l}</span></div>`).join('')}</div>\n   ${H.dibuat.length ? `<div><div class=\"eyebrow\" style=\"margin-bottom:6px\">Kontrak baru</div><div class=\"row\">${H.dibuat.slice(0, 60).map(x => `<button class=\"chipf\" data-openk=\"${esc(x.KontrakID)}\"><b class=\"mono\" style=\"font-size:11.5px\">${esc(x.KontrakID)}</b> ${esc(x.no)}</button>`).join('')}${H.dibuat.length > 60 ? `<span class=\"muted\">… dan ${H.dibuat.length - 60} lainnya</span>` : ''}</div></div>` : ''}\n   ${H.gagal.length ? `<div class=\"note warn\">${ic('warn', 's')}<span class=\"tx\">${H.gagal.length} baris tidak disimpan: ${H.gagal.slice(0, 5).map(g => 'baris ' + g.baris + ' (' + esc(g.err[0]) + ')').join('; ')}${H.gagal.length > 5 ? '; …' : ''}</span></div>` : ''}\n   <div class=\"row\"><button class=\"btn pri\" id=\"upList\">Lihat daftar kontrak</button><button class=\"btn\" id=\"upLagi\">Upload file lain</button>${H.gagal.length ? `<button class=\"btn ghost\" id=\"upLap\">${ic('dl', 's')}Unduh laporan error</button>` : ''}</div>\n  </div>`;\n}\nfunction renderUpload() { const c = document.getElementById('content'); if (!c || S.page !== 'upload') return; c.innerHTML = viewUpload(); bindUpload(); }\nfunction bindUpload() {\n  const U = S.up, $u = s => document.querySelector('#content ' + s), $$u = s => document.querySelectorAll('#content ' + s);\n  if (!D.siap) { muatData(false).then(renderUpload).catch(gagal); return; }\n  const f = $u('#upFile'), drop = $u('#upDrop');\n  if (f) f.onchange = () => { if (f.files[0]) bacaFileUpload(f.files[0]); };\n  if (drop) {\n    ['dragenter', 'dragover'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add('over'); }));\n    ['dragleave', 'drop'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove('over'); }));\n    drop.addEventListener('drop', ev => { const x = ev.dataTransfer.files[0]; if (x) bacaFileUpload(x); });\n    drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.click(); } };\n  }\n  if ($u('#upTpl')) $u('#upTpl').onclick = async () => {\n    const b = $u('#upTpl'); busy(b, true, 'Membuat template…');\n    try { const r = await call('upload.template'); unduhBase64(r.nama, r.base64); toast('Template diunduh. Cek folder Downloads.'); }\n    catch (e) { modalGagal(e); } finally { busy(b, false); }\n  };\n  $$u('[data-uf]').forEach(b => b.onclick = () => { U.f = b.dataset.uf; U.tab = 'kontrak'; renderUpload(); });\n  $$u('[data-umode]').forEach(b => b.onclick = () => { U.mode = b.dataset.umode; renderUpload(); });\n  $$u('[data-utab]').forEach(b => b.onclick = () => { U.tab = b.dataset.utab; renderUpload(); });\n  $$u('[data-openk]').forEach(b => b.onclick = () => openDrawer(b.dataset.openk));\n  if ($u('#upGanti')) $u('#upGanti').onclick = () => { resetUpload(); renderUpload(); };\n  if ($u('#upLagi')) $u('#upLagi').onclick = () => { resetUpload(); renderUpload(); };\n  if ($u('#upList')) $u('#upList').onclick = () => { S.kf.st = 'OPEN'; S.kf.q = ''; resetUpload(); go('kontrak'); };\n  if ($u('#upLap')) $u('#upLap').onclick = unduhLaporanUpload;\n  if ($u('#upSave')) $u('#upSave').onclick = () => {\n    const R = ringkasUpload(), n = R.baru + R.warn + R.upd;\n    modal('Simpan hasil upload?', `<div>${R.baru + R.warn} kontrak baru${R.upd ? `, ${R.upd} kontrak diperbarui` : ''}, ${R.soOk} SO/MI.${R.err ? ` <b>${R.err}</b> baris error tidak disimpan.` : ''}</div><div class=\"muted\" style=\"font-size:12px\">Disimpan bertahap per ${BAGIAN} baris. Bila koneksi terputus di tengah, upload file yang sama lagi: yang sudah tersimpan terbaca \"Sudah ada\".</div>`,\n      [{ l: 'Batal' }, { l: `Simpan ${n} kontrak`, pri: true, fn: () => { simpanUpload(); } }]);\n  };\n}\nasync function simpanUpload() {\n  const U = S.up, kirim = U.rows.filter(o => o.st !== 'error').map(o => U.rowsRaw.find(r => r.baris === o.baris)), bagian = [];\n  for (let i = 0; i < kirim.length; i += BAGIAN) bagian.push(kirim.slice(i, i + BAGIAN));\n  const H = { dibuat: [], diperbarui: [], dilewati: 0, gagal: U.rows.filter(o => o.st === 'error').map(o => ({ baris: o.baris, no: o.no, err: o.err })), so: 0 };\n  for (let i = 0; i < bagian.length; i++) {\n    U.progres = { ke: i + 1, dari: bagian.length }; renderUpload();\n    const nos = new Set(bagian[i].map(r => KD.normKey(r.no))), so = U.soRaw.filter(s => nos.has(KD.normKey(s.no)));\n    try {\n      const r = await call('upload.simpan', { mode: U.mode, file: U.file, rows: bagian[i], so, bagian: (i + 1) + '/' + bagian.length });\n      H.dibuat = H.dibuat.concat(r.dibuat); H.diperbarui = H.diperbarui.concat(r.diperbarui); H.dilewati += r.dilewati; H.gagal = H.gagal.concat(r.gagal); H.so += r.so;\n      (r.bundles || []).forEach(b => { D.base[b.k.KontrakID] = b; });\n      hitungSemuaView();\n    } catch (e) {\n      bagian.slice(i).forEach(bg => bg.forEach(x => H.gagal.push({ baris: x.baris, no: x.no, err: ['Tidak tersimpan: ' + (e.pesan || e)] })));\n      if (e.kode !== 'SESI_HABIS') modal('Upload terhenti', `<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(e.pesan || String(e))}</span></div><div class=\"muted\" style=\"font-size:12.5px\">${H.dibuat.length + H.diperbarui.length} kontrak sudah tersimpan. Upload file yang sama lagi untuk melanjutkan; yang sudah tersimpan terbaca \"Sudah ada\".</div>`, [{ l: 'Mengerti', pri: true }]);\n      break;\n    }\n  }\n  H.gagal.sort((a, b) => a.baris - b.baris);\n  U.progres = null; U.hasil = H; U.step = 4; renderUpload();\n  toast(`${H.dibuat.length} kontrak dibuat${H.diperbarui.length ? ', ' + H.diperbarui.length + ' diperbarui' : ''}.`);\n}\nasync function unduhLaporanUpload() {\n  const U = S.up, gagal = U.hasil ? U.hasil.gagal : U.rows.filter(o => o.st === 'error').map(o => ({ baris: o.baris, no: o.no, err: o.err }));\n  const tabs = [{ nama: 'Kontrak error', aoa: [['Baris', 'No. Kontrak', 'Masalah']].concat(gagal.map(g => [g.baris, g.no, g.err.join('; ')])) },\n                { nama: 'SO_MI error', aoa: [['Baris', 'No. Kontrak', 'No. Order', 'Masalah']].concat(U.so.filter(s => s.st === 'error').map(s => [s.baris, s.no, s.ono, s.err.join('; ')])) }];\n  const b = document.querySelector('#upLap'); busy(b, true, 'Membuat…');\n  try { const r = await call('upload.laporan', { tabs }); unduhBase64(r.nama, r.base64); } catch (e) { modalGagal(e); } finally { busy(b, false); }\n}\n\n/* ================= F2 · Pengaturan: tahap, kendala, Nilai Push, referensi, config (§5.1, §5.2, §5.5) ================= */\nS.set = { tab: 'tahap', draft: null, refJenis: 'populasi', cfg: null };\nconst TAB_SET = [['tahap', 'Tahap'], ['kendala', 'Kendala'], ['push', 'Nilai Push'], ['ref', 'Referensi'], ['config', 'Config']];\nconst NAMA_REF = { jenisDok: 'Jenis dok', populasi: 'Populasi', segment: 'Segment', dokTagih: 'Dokumen tagih' };\nconst salinList = l => (l || []).map(x => Object.assign({}, x));\nfunction draftAwal() {\n  const r = D.refRaw, t = S.set.tab;\n  if (t === 'tahap') return salinList(r.tahap).sort((a, b) => Number(a.Urutan) - Number(b.Urutan));\n  if (t === 'kendala') return salinList(r.kendala).sort((a, b) => Number(a.Urutan) - Number(b.Urutan));\n  if (t === 'push') return salinList(r.push).sort((a, b) => Number(a.Urutan) - Number(b.Urutan));\n  if (t === 'ref') return salinList(r[S.set.refJenis]).sort((a, b) => Number(a.Urutan) - Number(b.Urutan));\n  return null;\n}\nconst bersihDraft = l => JSON.stringify((l || []).map(x => { const o = Object.assign({}, x); delete o.UpdatedAt; delete o.UpdatedBy; delete o.Urutan; delete o._baru; return o; }));\nfunction dirtySet() { return S.set.draft && bersihDraft(S.set.draft) !== bersihDraft(draftAwal()); }\nconst tog = (attr, i, on, label) => `<button type=\"button\" class=\"toggle ${KD.bool(on) ? 'on' : ''}\" data-${attr}=\"${i}\" aria-pressed=\"${KD.bool(on)}\" aria-label=\"${esc(label)}\"></button>`;\nconst geser = (i, n) => `<span class=\"row\" style=\"gap:2px;flex-wrap:nowrap\"><button type=\"button\" class=\"iconbtn\" data-naik=\"${i}\" ${i === 0 ? 'disabled' : ''} aria-label=\"Naik\">${ic('up', 's')}</button><button type=\"button\" class=\"iconbtn\" data-turun=\"${i}\" ${i === n - 1 ? 'disabled' : ''} aria-label=\"Turun\" style=\"transform:scaleY(-1)\">${ic('up', 's')}</button></span>`;\n\nfunction viewPengaturan() {\n  if (!D.siap) return '<div class=\"loading\"><div class=\"spinner\"></div>Memuat…</div>';\n  if (!S.set.draft && S.set.tab !== 'config') S.set.draft = draftAwal();\n  const t = S.set.tab, dirty = t !== 'config' && dirtySet();\n  return `<div class=\"dtabs\" role=\"tablist\" style=\"margin-bottom:4px\">${TAB_SET.map(([v, l]) => `<button role=\"tab\" data-stab=\"${v}\" class=\"${t === v ? 'on' : ''}\">${l}</button>`).join('')}</div>\n   ${t === 'tahap' ? setTahap() : t === 'kendala' ? setKendala() : t === 'push' ? setPush() : t === 'ref' ? setRef() : setConfig()}\n   ${t !== 'config' ? `<div class=\"bulk\" id=\"setBar\" style=\"position:sticky;bottom:12px\" ${dirty ? '' : 'hidden'}><b>Ada perubahan belum disimpan</b><span class=\"sp\"></span><button class=\"btn sm\" id=\"setBatal\">Batal</button><button class=\"btn sm pri\" id=\"setSimpan\">Simpan</button></div>` : ''}`;\n}\nfunction jumlahOpenPerTahap() { const n = {}; semuaKontrak().forEach(b => KD.bastOpen(b, D.ref).forEach(x => { n[x.KodeTahap] = (n[x.KodeTahap] || 0) + 1; })); return n; }\nfunction setTahap() {\n  const L = S.set.draft, open = jumlahOpenPerTahap(), celah = KD.celahAturan(KD.siapkanRef(Object.assign({}, D.refRaw, { tahap: L.map((x, i) => Object.assign({}, x, { Urutan: String(i + 1) })) })));\n  return `<div class=\"card\"><h2>Tahapan BAST/BAA <small>urutan menentukan maju/mundur · ${L.length} tahap</small><span class=\"sp\"></span><button class=\"btn sm\" id=\"tAdd\">${ic('add', 's')}Tahap baru</button></h2>\n   <div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Urutan</th><th>Kode</th><th>Label</th><th>Batas aging (hari)</th><th>Penutup</th><th>Aktif</th><th class=\"num\">BAST OPEN</th></tr></thead><tbody>\n   ${L.map((x, i) => `<tr><td>${geser(i, L.length)}</td><td>${x._baru ? `<input class=\"inp mono\" data-tf=\"Kode\" data-i=\"${i}\" value=\"${esc(x.Kode)}\" style=\"max-width:150px\" placeholder=\"KODE_BARU\">` : `<span class=\"mono\" style=\"font-size:12px\">${esc(x.Kode)}</span>`}</td>\n     <td><input class=\"inp\" data-tf=\"Label\" data-i=\"${i}\" value=\"${esc(x.Label)}\" maxlength=\"60\"></td><td><input class=\"inp tnum\" data-tf=\"BatasAgingHari\" data-i=\"${i}\" value=\"${esc(x.BatasAgingHari)}\" style=\"max-width:90px\" inputmode=\"numeric\"></td>\n     <td><input type=\"radio\" name=\"penutup\" data-pen=\"${i}\" ${KD.bool(x.Penutup) ? 'checked' : ''} aria-label=\"Penutup\"></td><td>${tog('aktif', i, x.Aktif, 'Aktif')}</td>\n     <td class=\"num\">${open[x.Kode] ? `<button class=\"btn sm ghost\" data-pindah=\"${esc(x.Kode)}\" title=\"Pindahkan BAST OPEN ke tahap lain\">${open[x.Kode]} · pindahkan</button>` : '<span class=\"muted\">0</span>'}</td></tr>`).join('')}\n   </tbody></table></div>\n   <div class=\"muted\" style=\"font-size:12px;margin-top:10px\">Kode tidak bisa diubah setelah dibuat. Tahap tidak dihapus, hanya dinonaktifkan (ditolak selama masih ada BAST OPEN di tahap itu). Harus ada tepat satu tahap penutup aktif. Mengubah urutan atau penutup menghitung ulang semua kontrak.</div>\n   ${celah.length ? `<div class=\"note warn\" style=\"margin-top:12px\">${ic('warn', 's')}<span class=\"tx\">Belum ada aturan Nilai Push untuk: <b>${esc(celah.join(', '))}</b>. Kontrak di tahap itu tidak akan mengubah sel Kendala Umum. Tambahkan aturannya di tab <b>Nilai Push</b>.</span></div>` : ''}</div>`;\n}\nfunction setKendala() {\n  const L = S.set.draft, aktif = {}; semuaKontrak().forEach(b => KD.kendalaAktif(b).forEach(k => { aktif[k.Jenis] = (aktif[k.Jenis] || 0) + 1; }));\n  return `<div class=\"card\"><h2>Jenis kendala <small>kendala tidak mengubah tahap; pemicu reopen membuka lagi BAST yang sudah close</small><span class=\"sp\"></span><button class=\"btn sm\" id=\"kAdd\">${ic('add', 's')}Jenis baru</button></h2>\n   <div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Urutan</th><th>Kode</th><th>Label</th><th>Wajib keterangan</th><th>Memicu reopen</th><th>Aktif</th><th class=\"num\">Aktif di kontrak</th></tr></thead><tbody>\n   ${L.map((x, i) => `<tr><td>${geser(i, L.length)}</td><td>${x._baru ? `<input class=\"inp mono\" data-tf=\"Kode\" data-i=\"${i}\" value=\"${esc(x.Kode)}\" style=\"max-width:150px\" placeholder=\"KODE_BARU\">` : `<span class=\"mono\" style=\"font-size:12px\">${esc(x.Kode)}</span>`}</td>\n     <td><input class=\"inp\" data-tf=\"Label\" data-i=\"${i}\" value=\"${esc(x.Label)}\" maxlength=\"60\"></td><td>${tog('wajib', i, x.WajibKeterangan, 'Wajib keterangan')}</td><td>${tog('reopen', i, x.MemicuReopen, 'Memicu reopen')}</td><td>${tog('aktif', i, x.Aktif, 'Aktif')}</td><td class=\"num\">${aktif[x.Kode] || 0}</td></tr>`).join('')}\n   </tbody></table></div><div class=\"muted\" style=\"font-size:12px;margin-top:10px\">Jenis lama tidak dihapus, hanya dinonaktifkan, supaya riwayat tetap terbaca. Jenis baru otomatis tercakup aturan <span class=\"mono\">KENDALA:*</span> bila aturan itu ada.</div></div>`;\n}\nfunction opsiKondisi() {\n  const o = [['CLOSE', 'CLOSE · kontrak close'], ['SISA_LOKASI', 'SISA_LOKASI · menunggu BAST lanjutan'], ['BELUM_ADA_BAST', 'BELUM_ADA_BAST · belum punya BAST'], ['KENDALA:*', 'KENDALA:* · kendala apa pun']];\n  D.ref.kendala.forEach(k => o.push(['KENDALA:' + k.Kode, 'KENDALA:' + k.Kode + ' · ' + k.Label]));\n  D.ref.tahap.forEach(t => o.push(['TAHAP:' + t.Kode, 'TAHAP:' + t.Kode + ' · ' + t.Label]));\n  return o;\n}\nfunction hitungPush(L) {\n  const refUji = KD.siapkanRef(Object.assign({}, D.refRaw, { push: L.map((x, i) => Object.assign({}, x, { Urutan: String(i + 1) })) })), hit = {}, tanpa = [];\n  semuaKontrak().filter(b => !KD.bool(b.k.Arsip)).forEach(b => { const p = KD.evalPush(b, refUji); if (p.cocok) hit[p.kondisi] = (hit[p.kondisi] || 0) + 1; else tanpa.push(b); });\n  return { hit, tanpa, celah: KD.celahAturan(refUji) };\n}\nfunction catatanCelahPush(c) {\n  return c.celah.length ? `<div class=\"note warn\" style=\"margin-top:12px\">${ic('warn', 's')}<span class=\"tx\">Tidak tercakup aturan mana pun: <b>${esc(c.celah.join(', '))}</b>. Sel Kendala Umum kontrak seperti itu tidak diubah dan muncul alarm <span class=\"mono\">TANPA_ATURAN</span>.</span></div>` : `<div class=\"note ok\" style=\"margin-top:12px\">${ic('check', 's')}<span class=\"tx\">Semua tahap dan kendala aktif tercakup.${c.tanpa.length ? ' ' + c.tanpa.length + ' kontrak tetap tanpa aturan.' : ''}</span></div>`;\n}\n/** Perbarui angka \"Kontrak terkena\" & catatan celah tanpa menggambar ulang (supaya kursor tidak hilang). */\nfunction segarHitungPush() {\n  const L = S.set.draft, c = hitungPush(L);\n  document.querySelectorAll('#content [data-hit]').forEach(td => { const x = L[+td.dataset.hit]; td.innerHTML = x && KD.bool(x.Aktif) ? String(c.hit[x.Kondisi] || 0) : '<span class=\"muted\">—</span>'; });\n  const n = document.getElementById('pushCelah'); if (n) n.innerHTML = catatanCelahPush(c);\n}\nfunction setPush() {\n  const L = S.set.draft, refUji = KD.siapkanRef(Object.assign({}, D.refRaw, { push: L.map((x, i) => Object.assign({}, x, { Urutan: String(i + 1) })) })), celah = KD.celahAturan(refUji), hit = {}, tanpa = [];\n  semuaKontrak().filter(b => !KD.bool(b.k.Arsip)).forEach(b => { const p = KD.evalPush(b, refUji); if (p.cocok) hit[p.kondisi] = (hit[p.kondisi] || 0) + 1; else tanpa.push(b); });\n  const ops = opsiKondisi();\n  return `<div class=\"card\"><h2>Nilai Push · Kendala Umum <small>dibaca dari atas; aturan pertama yang cocok dipakai</small><span class=\"sp\"></span><button class=\"btn sm\" id=\"pAdd\">${ic('add', 's')}Aturan</button></h2>\n   <div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>#</th><th>Kondisi</th><th>Teks di sheet unit (Kendala Umum)</th><th>Aktif</th><th class=\"num\">Kontrak terkena</th><th></th></tr></thead><tbody>\n   ${L.map((x, i) => `<tr><td class=\"row\" style=\"gap:6px;flex-wrap:nowrap\"><b class=\"tnum\" style=\"width:20px\">${i + 1}</b>${geser(i, L.length)}</td><td><select class=\"inp\" data-tf=\"Kondisi\" data-i=\"${i}\" style=\"max-width:330px\">${opsi(ops, x.Kondisi)}</select></td>\n     <td><input class=\"inp mono\" data-tf=\"Nilai\" data-i=\"${i}\" value=\"${esc(x.Nilai)}\" maxlength=\"80\" style=\"font-size:12.5px\"></td><td>${tog('aktif', i, x.Aktif, 'Aktif')}</td><td class=\"num tnum\" data-hit=\"${i}\">${KD.bool(x.Aktif) ? (hit[x.Kondisi] || 0) : '<span class=\"muted\">—</span>'}</td>\n     <td><button class=\"iconbtn\" data-phapus=\"${i}\" aria-label=\"Hapus aturan\">${ic('x', 's')}</button></td></tr>`).join('')}\n   </tbody></table></div>\n   <div id=\"pushCelah\">${catatanCelahPush({ celah, tanpa })}</div>\n   <div class=\"muted\" style=\"font-size:12px;margin-top:10px\">Kolom \"Kontrak terkena\" dihitung langsung dari draft di layar. Menyimpan aturan menghitung ulang Kendala Umum semua kontrak aktif; sinkron berikutnya (F4a) menyeragamkan semua sheet unit.</div></div>`;\n}\nfunction setRef() {\n  const L = S.set.draft, j = S.set.refJenis;\n  return `<div class=\"card\"><h2>Referensi <span class=\"sp\"></span><div class=\"seg\" role=\"group\">${Object.keys(NAMA_REF).map(k => `<button data-rj=\"${k}\" class=\"${j === k ? 'on' : ''}\">${NAMA_REF[k]}</button>`).join('')}</div></h2>\n   <div class=\"tbl-wrap\" style=\"margin-top:12px\"><table class=\"t\"><thead><tr><th>Urutan</th><th>Kode</th><th>Label</th><th>Aktif</th></tr></thead><tbody>\n   ${L.map((x, i) => `<tr><td>${geser(i, L.length)}</td><td>${x._baru ? `<input class=\"inp mono\" data-tf=\"Kode\" data-i=\"${i}\" value=\"${esc(x.Kode)}\" style=\"max-width:180px\">` : `<span class=\"mono\" style=\"font-size:12px\">${esc(x.Kode)}</span>`}</td>\n     <td><input class=\"inp\" data-tf=\"Label\" data-i=\"${i}\" value=\"${esc(x.Label)}\" maxlength=\"80\"></td><td>${tog('aktif', i, x.Aktif, 'Aktif')}</td></tr>`).join('')}</tbody></table></div>\n   <div class=\"row\" style=\"margin-top:10px\"><button class=\"btn sm\" id=\"rAdd\">${ic('add', 's')}Tambah ${NAMA_REF[j]}</button><span class=\"sp\"></span><span class=\"muted\" style=\"font-size:12px\">Kode tidak dihapus, hanya dinonaktifkan. Daftar ini dipakai dropdown form dan template upload.</span></div></div>`;\n}\nfunction setConfig() {\n  if (!S.set.cfg) { call('sistem.info').then(r => { S.set.cfg = r.config; rerenderSet(); }).catch(gagal); return '<div class=\"loading\"><div class=\"spinner\"></div>Memuat config…</div>'; }\n  return `<div class=\"card\"><h2>Config</h2><div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Key</th><th>Nilai</th><th>Arti</th><th></th></tr></thead><tbody>${S.set.cfg.map(c => `<tr><td class=\"mono\" style=\"font-size:12px\">${esc(c.key)}</td><td><input class=\"inp\" data-cfg=\"${esc(c.key)}\" value=\"${esc(c.nilai)}\" aria-label=\"${esc(c.key)}\" style=\"max-width:280px\"></td><td class=\"muted\" style=\"font-size:12.5px\">${esc(c.ket)}</td><td><button class=\"btn sm\" data-cfgsave=\"${esc(c.key)}\">Simpan</button></td></tr>`).join('')}</tbody></table></div></div>`;\n}\nfunction rerenderSet() {\n  const c = document.getElementById('content'); if (!c || S.page !== 'pengaturan') return;\n  const sc = window.scrollY, a = document.activeElement, fokus = a && a.dataset && a.dataset.tf ? [a.dataset.tf, a.dataset.i, a.selectionStart] : null;\n  c.innerHTML = viewPengaturan(); bindPengaturan(); window.scrollTo(0, sc);\n  if (fokus) { const el = c.querySelector(`[data-tf=\"${fokus[0]}\"][data-i=\"${fokus[1]}\"]`); if (el) { el.focus({ preventScroll: true }); if (el.setSelectionRange && fokus[2] != null) try { el.setSelectionRange(fokus[2], fokus[2]); } catch (e) { /* select */ } } }\n}\nfunction perbaruiBarSet() { const bar = document.getElementById('setBar'); if (bar) bar.hidden = !dirtySet(); }\nfunction bindPengaturan() {\n  const $p = s => document.querySelector('#content ' + s), $$p = s => document.querySelectorAll('#content ' + s), L = S.set.draft;\n  if (!D.siap) { muatData(false).then(rerenderSet).catch(gagal); return; }\n  $$p('[data-stab]').forEach(b => b.onclick = () => {\n    if (dirtySet() && !confirm('Perubahan belum disimpan akan dibuang. Lanjut?')) return;\n    S.set.tab = b.dataset.stab; S.set.draft = null; rerenderSet();\n  });\n  $$p('[data-rj]').forEach(b => b.onclick = () => { if (dirtySet() && !confirm('Perubahan belum disimpan akan dibuang. Lanjut?')) return; S.set.refJenis = b.dataset.rj; S.set.draft = null; rerenderSet(); });\n  // mengetik TIDAK menggambar ulang halaman (C23): data draft diubah, bilah Simpan & angka diperbarui di tempat\n  $$p('[data-tf]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {\n    if (el.dataset.tf === 'Kode') { const pos = el.selectionStart, v = el.value.toUpperCase().replace(/\\s+/g, '_'); if (v !== el.value) { el.value = v; try { el.setSelectionRange(pos, pos); } catch (e) { /* abaikan */ } } }\n    L[+el.dataset.i][el.dataset.tf] = el.value;\n    perbaruiBarSet();\n    if (S.set.tab === 'push') segarHitungPush();\n  }));\n  const flip = (attr, key) => $$p(`[data-${attr}]`).forEach(b => b.onclick = () => { const x = L[+b.dataset[attr]]; x[key] = KD.bool(x[key]) ? 'FALSE' : 'TRUE'; rerenderSet(); });\n  flip('aktif', 'Aktif'); flip('wajib', 'WajibKeterangan'); flip('reopen', 'MemicuReopen');\n  $$p('[data-pen]').forEach(r => r.onchange = () => { L.forEach((x, i) => { x.Penutup = i === +r.dataset.pen ? 'TRUE' : 'FALSE'; }); rerenderSet(); });\n  $$p('[data-naik]').forEach(b => b.onclick = () => { const i = +b.dataset.naik; [L[i - 1], L[i]] = [L[i], L[i - 1]]; rerenderSet(); });\n  $$p('[data-turun]').forEach(b => b.onclick = () => { const i = +b.dataset.turun; [L[i + 1], L[i]] = [L[i], L[i + 1]]; rerenderSet(); });\n  $$p('[data-phapus]').forEach(b => b.onclick = () => { L.splice(+b.dataset.phapus, 1); rerenderSet(); });\n  if ($p('#tAdd')) $p('#tAdd').onclick = () => { const i = L.findIndex(x => KD.bool(x.Penutup)); L.splice(i < 0 ? L.length : i, 0, { Kode: '', Label: '', Penutup: 'FALSE', BatasAgingHari: '14', Aktif: 'TRUE', _baru: true }); rerenderSet(); };\n  if ($p('#kAdd')) $p('#kAdd').onclick = () => { L.push({ Kode: '', Label: '', WajibKeterangan: 'TRUE', MemicuReopen: 'FALSE', Aktif: 'TRUE', _baru: true }); rerenderSet(); };\n  if ($p('#pAdd')) $p('#pAdd').onclick = () => { L.push({ Kondisi: 'KENDALA:*', Nilai: '', Aktif: 'TRUE' }); rerenderSet(); };\n  if ($p('#rAdd')) $p('#rAdd').onclick = () => { L.push({ Kode: '', Label: '', Aktif: 'TRUE', _baru: true }); rerenderSet(); };\n  if ($p('#setBatal')) $p('#setBatal').onclick = () => { S.set.draft = null; rerenderSet(); };\n  if ($p('#setSimpan')) $p('#setSimpan').onclick = simpanPengaturan;\n  $$p('[data-pindah]').forEach(b => b.onclick = () => pindahTahapMassal(b.dataset.pindah));\n  $$p('[data-cfgsave]').forEach(b => b.onclick = async () => {\n    const key = b.dataset.cfgsave, nilai = document.querySelector(`[data-cfg=\"${key}\"]`).value; busy(b, true);\n    try { const r = await call('config.simpan', { key, nilai }); toast(r.berubah ? `${key} disimpan.` : 'Tidak ada perubahan.'); S.app = Object.assign(S.app, r.app); S.set.cfg = null; const x = await call('data.ref'); terimaRef(x.ref, x.cfg, x.users); rerenderSet(); }\n    catch (e) { modalGagal(e); } finally { busy(b, false); }\n  });\n}\nasync function simpanPengaturan() {\n  const t = S.set.tab, list = S.set.draft.map(x => { const o = Object.assign({}, x); delete o._baru; delete o.UpdatedAt; delete o.UpdatedBy; return o; });\n  const aksi = { tahap: 'pengaturan.tahap', kendala: 'pengaturan.kendala', push: 'pengaturan.push', ref: 'pengaturan.ref' }[t];\n  const b = document.getElementById('setSimpan'); busy(b, true);\n  try {\n    const r = await call(aksi, t === 'ref' ? { jenis: S.set.refJenis, list } : { list });\n    terimaRef(r.ref); S.set.draft = null;\n    if (r.dihitungUlang !== undefined) await muatUlangDiam();\n    rerenderSet();\n    toast(r.berubah ? 'Pengaturan disimpan' + (r.dihitungUlang ? ` · ${r.dihitungUlang} kontrak dihitung ulang` : '') + '.' : 'Tidak ada perubahan.');\n  } catch (e) {\n    busy(b, false);\n    if (e.kode === 'MASIH_DIPAKAI') { const m = /Tahap (.+?) masih/.exec(e.pesan || ''); const x = m && D.ref.tahap.find(z => z.Label === m[1]); modal('Tahap masih dipakai', `<div class=\"note warn\">${ic('warn', 's')}<span class=\"tx\">${esc(e.pesan)}</span></div>`, [{ l: 'Tutup' }].concat(x ? [{ l: 'Pindahkan BAST', pri: true, fn: () => { pindahTahapMassal(x.Kode); } }] : [])); }\n    else modalGagal(e);\n  }\n}\nfunction pindahTahapMassal(dari) {\n  const n = jumlahOpenPerTahap()[dari] || 0, tujuan = D.ref.tahap.filter(t => t.Aktif && !t.Penutup && t.Kode !== dari);\n  modal('Pindahkan BAST dari ' + esc(labelTahap(dari)), `<div class=\"muted\">${n} BAST OPEN di tahap ini dipindahkan sekaligus. Setiap perpindahan tercatat di riwayat & Log.</div>\n   <label class=\"of\"><span>Ke tahap</span><select class=\"inp\" id=\"ptKe\">${opsi(tujuan.map(t => [t.Kode, t.Label]))}</select></label>\n   <label class=\"of\"><span>Keterangan</span><input class=\"inp\" id=\"ptKet\" maxlength=\"200\" placeholder=\"mis. tahap digabung\"></label>`,\n   [{ l: 'Batal' }, { l: 'Pindahkan', pri: true, fn: d => {\n     const ke = d.querySelector('#ptKe').value, ket = d.querySelector('#ptKet').value;\n     const lp = layarProgres('Memindahkan BAST', ['Memindahkan ' + n + ' BAST', 'Menghitung ulang kontrak']); lp.langkah(0);\n     call('pengaturan.pindahTahap', { dari, ke, ket }).then(async r => { lp.langkah(1); await muatUlangDiam(); lp.selesai(); S.set.draft = null; rerenderSet(); toast(`${r.dipindah} BAST dipindahkan.`); })\n       .catch(e => { lp.selesai(); modalGagal(e); });\n   } }]);\n}\n\n/* ================= F3: Dashboard, Perlu Perhatian, Ctrl+K ================= */\nObject.assign(S, { dMine: false, pMine: false, scopeUser: null, dash7: null, dash7Memuat: false });\n\n/** STAFF (punya Alias PIC, tidak mengatur PIC orang lain) dibuka dengan \"Milik saya\"; ADMIN dengan Tim FF. */\nfunction siapkanLingkup() {\n  if (!S.me || S.scopeUser === S.me.username) return;\n  S.scopeUser = S.me.username; S.dMine = S.pMine = !!S.me.alias && !can('pic.atur');\n}\nconst kontrakAktif = () => semuaKontrak().filter(b => !KD.bool(b.k.Arsip));\nconst hariTahap = x => KD.hariSejak(x.TglTahapMulai, D.hariIni || hariIniStr());\nconst batasTahap = kode => Number((T(kode) || {}).BatasAgingHari) || 14;\nconst kendBatas = () => Number(D.cfg.KENDALA_BATAS_HARI) || 14;\nconst bastLewat = b => KD.bastOpen(b, D.ref).filter(x => { const h = hariTahap(x); return h !== null && h > batasTahap(x.KodeTahap); });\nconst PARSIAL_IMPORT = 'BAST parsial (dari data lama)';\nconst parsialImport = b => KD.hidup(b.bast).some(x => String(x.Keterangan).indexOf(PARSIAL_IMPORT) === 0);\nfunction goKontrak(patch) { Object.assign(S.kf, { q: '', st: 'OPEN', quick: '', tahap: '', ku: '', pic: '', pop: '', seg: '', cust: '' }, patch); S.batas = 200; go('kontrak'); }\n\n/* ---------------- Dashboard (§10) ---------------- */\nfunction smoothPath(p) {\n  let d = `M${p[0].x},${p[0].y}`;\n  for (let i = 0; i < p.length - 1; i++) {\n    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;\n    d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x},${p2.y}`;\n  }\n  return d;\n}\nfunction pipelineSvg(list) {\n  const st = D.ref.tahap.filter(t => t.Aktif), open = list.filter(b => b.k.StatusKontrak === 'OPEN'), bulan = (D.hariIni || hariIniStr()).slice(0, 7);\n  if (!st.length) return '';\n  const n = st.length, x0 = 95, x1 = 905;\n  const pts = st.map((t, i) => ({ t, x: n === 1 ? 500 : Math.round(x0 + (x1 - x0) * i / (n - 1)), y: i % 2 ? 92 : 132 }));\n  const path = smoothPath([{ x: 10, y: 124 }].concat(pts, [{ x: 990, y: 106 }]));\n  const nodes = pts.map((p, i) => {\n    const t = p.t;\n    const cnt = t.Penutup ? list.filter(b => b.k.StatusKontrak === 'CLOSE' && String(b.k.TglClose).slice(0, 7) === bulan).length : open.filter(b => b.k.TahapKontrak === t.Kode).length;\n    const od = open.reduce((a, b) => a + bastLewat(b).filter(x => x.KodeTahap === t.Kode).length, 0);\n    const r = 24 + Math.min(14, cnt * 2), ly = p.y + r + 22, parts = String(t.Label).split(' / ');\n    return `<g class=\"pnode ${t.Penutup ? 'closer' : ''}\" data-tahap=\"${esc(t.Kode)}\" style=\"--d:${i}\" tabindex=\"0\" role=\"button\" aria-label=\"${esc(t.Label)}: ${cnt} kontrak\">\n      <circle class=\"halo\" cx=\"${p.x}\" cy=\"${p.y}\" r=\"${r + 10}\"/>${od ? `<circle class=\"ring\" cx=\"${p.x}\" cy=\"${p.y}\" r=\"${r + 6}\"/>` : ''}\n      <circle class=\"body\" cx=\"${p.x}\" cy=\"${p.y}\" r=\"${r}\"/><text class=\"cnt\" x=\"${p.x}\" y=\"${p.y + 8}\" text-anchor=\"middle\">${cnt}</text>\n      <text class=\"lbl\" x=\"${p.x}\" y=\"${ly}\" text-anchor=\"middle\">${esc(parts[0])}</text>${parts[1] ? `<text class=\"lbl\" x=\"${p.x}\" y=\"${ly + 16}\" text-anchor=\"middle\">/ ${esc(parts[1])}</text>` : ''}\n      <text class=\"sub ${od ? 'w' : ''}\" x=\"${p.x}\" y=\"${ly + (parts[1] ? 33 : 17)}\" text-anchor=\"middle\">${t.Penutup ? 'close bulan ini' : od ? od + ' lewat batas' : 'kontrak'}</text></g>`;\n  }).join('');\n  const bo = open.reduce((a, b) => a + KD.bastOpen(b, D.ref).length, 0), np = Math.max(6, Math.min(16, bo * 2)), dur = 18;\n  const dots = REDUCED ? '' : Array.from({ length: np }, (_, i) => `<circle class=\"pt\" r=\"${i % 3 ? 2.2 : 3.2}\" opacity=\"${i % 3 ? .55 : .95}\"><animateMotion dur=\"${dur}s\" begin=\"-${(i * dur / np).toFixed(2)}s\" repeatCount=\"indefinite\" path=\"${path}\"/></circle>`).join('');\n  return `<svg class=\"pipe\" viewBox=\"0 0 1000 250\" role=\"img\" aria-label=\"Alur BAST per tahap\"><defs><linearGradient id=\"gTrail\" x1=\"0\" x2=\"1\"><stop offset=\"0\" stop-color=\"var(--accent)\" stop-opacity=\"0\"/><stop offset=\".25\" stop-color=\"var(--accent)\" stop-opacity=\".55\"/><stop offset=\".85\" stop-color=\"var(--violet)\" stop-opacity=\".55\"/><stop offset=\"1\" stop-color=\"var(--ok)\" stop-opacity=\".2\"/></linearGradient></defs>\n   <path class=\"track\" d=\"${path}\"/><path class=\"trail\" d=\"${path}\"/>${dots}${nodes}</svg>`;\n}\nfunction muatDash7(segarkan) {\n  if (S.dash7Memuat || !can('dashboard.lihat')) return;\n  S.dash7Memuat = true;\n  call('dashboard.ringkas', segarkan ? { segarkan: true } : {}).then(r => { S.dash7 = r; }).catch(() => { S.dash7 = S.dash7 || { hari: [], user: [], gagal: true }; })\n    .then(() => { S.dash7Memuat = false; const el = document.getElementById('timTbl'); if (el && S.page === 'beranda') { el.outerHTML = timTabel(); bindDash(); } });\n}\nfunction timTabel() {\n  siapkanLingkup();\n  const list = kontrakAktif(), open = list.filter(b => b.k.StatusKontrak === 'OPEN');\n  const pics = picList().filter(p => !S.dMine || p === S.me.alias);\n  const r7 = S.dash7, per = {}; ((r7 && r7.user) || []).forEach(u => { if (u.alias) per[u.alias] = u; });\n  const team = pics.map(p => {\n    const mine = open.filter(b => b.k.PIC === p), ag = { fresh: 0, warm: 0, stale: 0, cold: 0 };\n    mine.forEach(b => { const h = agingKontrak(b); if (h !== null) ag[KD.bucket(h, agingBatas())]++; });\n    return { p, open: mine.length, kend: mine.reduce((a, b) => a + KD.kendalaAktif(b).length, 0), lewat: mine.filter(b => bastLewat(b).length).length, ag, u: per[p] };\n  });\n  const noPic = S.dMine ? 0 : open.filter(b => !b.k.PIC).length;\n  const upd = t => !r7 ? '<span class=\"bspin\" style=\"width:12px;height:12px;color:var(--accent)\"></span>' : !t.u ? '<span class=\"dim\">0</span>'\n    : `<div class=\"row\" style=\"flex-wrap:nowrap;gap:10px\"><span class=\"spark\" title=\"Perubahan per hari, 7 hari terakhir\">${t.u.n.map(v => `<i style=\"height:${4 + Math.min(18, v * 2)}px\"></i>`).join('')}</span><b class=\"tnum\">${t.u.n.reduce((a, b) => a + b, 0)}</b>${t.u.bantu ? `<span class=\"muted\" style=\"font-size:12px;white-space:nowrap\">· ${t.u.bantu} bantu</span>` : ''}</div>`;\n  return `<div id=\"timTbl\"><div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>PIC</th><th class=\"num\">Open</th><th class=\"num\">Kendala</th><th class=\"num\">Lewat batas</th><th>Aging</th><th>Update 7 hari</th></tr></thead><tbody>\n    ${team.map(t => `<tr class=\"click\" data-dpic=\"${esc(t.p)}\"><td><div class=\"row\" style=\"flex-wrap:nowrap\">${avatarPic(t.p, 1)}<b>${esc(t.p)}</b></div></td><td class=\"num\"><b>${t.open}</b></td>\n      <td class=\"num\">${t.kend ? `<span class=\"pill p-crit\">${t.kend}</span>` : '<span class=\"dim\">0</span>'}</td><td class=\"num\">${t.lewat ? `<span class=\"pill p-warn\">${t.lewat}</span>` : '<span class=\"dim\">0</span>'}</td>\n      <td><div class=\"agebar\" title=\"≤${agingBatas()[0]}: ${t.ag.fresh} · ≤${agingBatas()[1]}: ${t.ag.warm} · ≤${agingBatas()[2]}: ${t.ag.stale} · lebih: ${t.ag.cold}\">${['fresh', 'warm', 'stale', 'cold'].map(k => t.ag[k] ? `<i style=\"flex:${t.ag[k]};background:var(--${k})\"></i>` : '').join('')}</div></td>\n      <td>${upd(t)}</td></tr>`).join('') || `<tr><td colspan=\"6\" class=\"muted\" style=\"text-align:center;padding:20px\">${S.dMine ? 'Akun Anda tidak punya Alias PIC, jadi tidak ada kontrak milik Anda.' : 'Belum ada user dengan Alias PIC.'}</td></tr>`}\n    ${noPic ? `<tr class=\"click\" data-dpic=\"__none\"><td><div class=\"row\" style=\"flex-wrap:nowrap\">${avatarPic('', 1)}<b style=\"color:var(--warn)\">Tanpa PIC</b></div></td><td class=\"num\"><b>${noPic}</b></td><td></td><td></td><td></td><td class=\"muted\" style=\"font-size:12px\">Perlu ditugaskan</td></tr>` : ''}\n   </tbody></table></div>\n   <div class=\"row muted\" style=\"font-size:11.5px;margin-top:8px\">\"Update 7 hari\" diringkas server dari Log sekali per jam${r7 && r7.dibuat ? ' · terakhir ' + esc(String(r7.dibuat).slice(11, 16)) : ''}.<span class=\"sp\"></span>${r7 ? '<button class=\"btn sm ghost\" id=\"d7seg\">Segarkan</button>' : ''}</div></div>`;\n}\nfunction viewDash() {\n  if (!can('kontrak.lihat')) return `<div class=\"card\"><h2>Belum ada menu untuk role Anda</h2><p class=\"muted\">Hubungi admin bila Anda perlu melihat kontrak.</p></div>`;\n  if (!D.siap) return '<div class=\"loading\"><div class=\"spinner\"></div>Memuat data aktif…</div>';\n  siapkanLingkup();\n  const mine = b => !S.dMine || b.k.PIC === S.me.alias;\n  const AK = kontrakAktif().filter(mine), open = AK.filter(b => b.k.StatusKontrak === 'OPEN'), bulan = (D.hariIni || hariIniStr()).slice(0, 7);\n  const bastOpen = open.reduce((a, b) => a + KD.bastOpen(b, D.ref).length, 0) + AK.filter(b => b.k.StatusKontrak !== 'OPEN').reduce((a, b) => a + KD.bastOpen(b, D.ref).length, 0);\n  const nilai = open.reduce((a, b) => a + (Number(b.k.NilaiKontrak) || 0), 0);\n  const kend = AK.reduce((a, b) => a + KD.kendalaAktif(b).length, 0), kendLama = AK.reduce((a, b) => a + KD.kendalaAktif(b).filter(x => (KD.hariSejak(x.Mulai, D.hariIni) || 0) > kendBatas()).length, 0);\n  const closeN = AK.filter(b => b.k.StatusKontrak === 'CLOSE' && String(b.k.TglClose).slice(0, 7) === bulan).length;\n  const ku = {}; open.forEach(b => { if (b.k.KendalaUmum) ku[b.k.KendalaUmum] = (ku[b.k.KendalaUmum] || 0) + 1; });\n  const kuArr = Object.keys(ku).sort((a, b) => ku[b] - ku[a]), maxK = Math.max(1, ...kuArr.map(x => ku[x]));\n  const warnaKu = v => { const r = D.ref.push.find(p => p.Nilai === v); const k = r ? r.Kondisi : ''; return k === 'CLOSE' ? 'var(--ok)' : k.indexOf('KENDALA') === 0 ? 'var(--crit)' : k === 'SISA_LOKASI' ? 'var(--warn)' : k === 'BELUM_ADA_BAST' ? 'var(--dim)' : 'var(--info)'; };\n  const belum = open.filter(b => !KD.hidup(b.bast).length).length, sisa = open.filter(b => KD.statusKontrak(b, D.ref).menunggu).length;\n  const kpi = (l, v, s, g, col) => `<div class=\"kpi\"><svg class=\"glyph\" viewBox=\"0 0 24 24\"><path d=\"${IC[g] || IC.doc}\"/></svg><div class=\"l\">${l}</div><div class=\"v tnum\" ${col ? `style=\"color:${col}\"` : ''}>${v}</div><div class=\"s\">${s}</div></div>`;\n  const q = id => QUICK.find(x => x[0] === id)[2];\n  const kual = [['nopic', 'Tanpa PIC', open.filter(q('nopic')).length, 'var(--warn)'], ['kurang', 'Data belum lengkap', open.filter(q('kurang')).length, 'var(--warn)'],\n    ['verif', 'Perlu verifikasi (hasil import)', AK.filter(q('verif')).length, 'var(--info)'], ['lewat', 'BAST lewat batas aging', open.filter(b => bastLewat(b).length).length, 'var(--stale)'],\n    ['kend', 'Ada kendala aktif', open.filter(q('kend')).length, 'var(--crit)']];\n  if (!S.dash7 && !S.dash7Memuat) setTimeout(() => muatDash7(false), 0);\n  return `<div class=\"row\"><div class=\"seg\" role=\"group\" aria-label=\"Lingkup\">${[[false, 'Tim FF'], [true, 'Milik saya']].map(([v, l]) => `<button data-dmine=\"${v}\" class=\"${S.dMine === v ? 'on' : ''}\">${l}</button>`).join('')}</div>\n    ${S.dMine && !S.me.alias ? '<span class=\"pill p-warn\">Akun ini tidak punya Alias PIC</span>' : ''}<span class=\"sp\"></span><span class=\"muted\" style=\"font-size:12px\">Dihitung di browser dari data aktif · ikut berubah saat ada simpan/sinkron</span></div>\n  <div class=\"kpis\">\n   ${kpi('Kontrak OPEN', open.length.toLocaleString('id-ID'), `dari ${AK.length.toLocaleString('id-ID')} kontrak aktif`, 'doc')}\n   ${kpi('BAST OPEN', bastOpen.toLocaleString('id-ID'), 'termasuk BAST/BAA parsial', 'flag')}\n   ${kpi('Nilai kontrak OPEN', rpShort(nilai), `<span class=\"tnum\">${rp(nilai)}</span>`, 'dash')}\n   ${kpi('Kendala aktif', kend.toLocaleString('id-ID'), `${kendLama} lebih dari ${kendBatas()} hari`, 'warn', kend ? 'var(--crit)' : '')}\n   ${kpi('Close bulan ini', closeN.toLocaleString('id-ID'), new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }), 'check', 'var(--ok)')}\n  </div>\n  <div class=\"card hero\"><div class=\"row\" style=\"position:relative\"><div><div class=\"eyebrow\">Alur BAST</div><h2 style=\"margin:4px 0 0\">Kontrak OPEN per tahap</h2></div><span class=\"sp\"></span>\n   <span class=\"legend\"><span><i style=\"background:var(--accent)\"></i>klik tahap untuk melihat kontraknya</span><span><i style=\"background:transparent;border:2px dashed var(--warn);width:12px;height:12px;border-radius:50%\"></i>ada BAST lewat batas</span></span></div>\n   <div class=\"pipe-wrap\">${pipelineSvg(AK)}</div>\n   <div class=\"row\" style=\"position:relative\"><button class=\"chipf\" data-dku=\"${esc((D.ref.push.find(p => p.Kondisi === 'BELUM_ADA_BAST') || {}).Nilai || '')}\">Belum ada BAST <b>${belum}</b></button><button class=\"chipf\" data-dku=\"${esc((D.ref.push.find(p => p.Kondisi === 'SISA_LOKASI') || {}).Nilai || '')}\">Menunggu BAST lanjutan <b>${sisa}</b></button><span class=\"sp\"></span><span class=\"muted\" style=\"font-size:12px\">Tahap kontrak = tahap BAST OPEN paling awal</span></div>\n  </div>\n  <div class=\"grid g64\">\n   <div class=\"card\"><h2>Tim <small>kontrak OPEN per PIC</small><span class=\"sp\"></span><span class=\"legend\"><span><i style=\"background:var(--fresh)\"></i>≤${agingBatas()[0]}</span><span><i style=\"background:var(--warm)\"></i>≤${agingBatas()[1]}</span><span><i style=\"background:var(--stale)\"></i>≤${agingBatas()[2]}</span><span><i style=\"background:var(--cold)\"></i>&gt;${agingBatas()[2]} hari</span></span></h2>${timTabel()}</div>\n   <div class=\"card\"><h2>Kendala Umum <small>nilai yang akan tampil di sheet unit · kontrak OPEN</small></h2>\n    <div class=\"hbars\">${kuArr.map(v => `<div class=\"hb\" data-dku=\"${esc(v)}\" title=\"Lihat kontrak dengan nilai ini\" role=\"button\" tabindex=\"0\"><span class=\"lbl mono\" style=\"font-size:11px;font-weight:600\">${esc(v)}</span><div class=\"track\"><div class=\"fill\" style=\"width:${ku[v] / maxK * 100}%;background:${warnaKu(v)}\"></div></div><span class=\"n\">${ku[v]}</span></div>`).join('') || '<div class=\"muted\">Belum ada kontrak OPEN.</div>'}</div></div>\n  </div>\n  <div class=\"grid g2\">\n   <div class=\"card\"><h2>Kualitas data <small>klik untuk membuka daftar terfilter</small><span class=\"sp\"></span><button class=\"btn sm\" data-go2=\"perhatian\">Perlu Perhatian ${ic('chevR', 's')}</button></h2>\n    <div class=\"utiles\">${kual.map(([qk, l, n, c]) => `<button class=\"utile\" data-dq=\"${qk}\"><b class=\"tnum\" style=\"color:${n ? c : 'var(--ok)'}\">${n.toLocaleString('id-ID')}</b><span>${l}</span></button>`).join('')}</div></div>\n   <div class=\"card\" style=\"opacity:.65\"><h2>Status sinkron ke sheet unit<span class=\"sp\"></span><span class=\"pill p-dim\">F4a</span></h2><div class=\"muted\" style=\"font-size:13px\">Setelah sinkron dibangun di F4a, kartu ini menampilkan setiap target Google Sheet: cek &amp; update terakhir, dan error.</div></div>\n  </div>`;\n}\nfunction bindDash() {\n  const $$c = s => document.querySelectorAll('#content ' + s);\n  const pic = () => (S.dMine ? S.me.alias || '' : '');\n  $$c('[data-dmine]').forEach(b => b.onclick = () => { S.dMine = b.dataset.dmine === 'true'; segarkanTampilan(); });\n  $$c('[data-dq]').forEach(b => b.onclick = () => goKontrak({ quick: b.dataset.dq, pic: pic(), st: b.dataset.dq === 'verif' ? '' : 'OPEN' }));\n  $$c('[data-dku]').forEach(b => { const fn = () => goKontrak({ ku: b.dataset.dku, pic: pic() }); b.onclick = fn; b.onkeydown = e => { if (e.key === 'Enter') fn(); }; });\n  $$c('[data-dpic]').forEach(tr => tr.onclick = () => goKontrak({ pic: tr.dataset.dpic }));\n  $$c('.pnode').forEach(g => { const fn = () => { const t = T(g.dataset.tahap); goKontrak(t && t.Penutup ? { st: 'CLOSE', pic: pic() } : { tahap: g.dataset.tahap, pic: pic() }); }; g.onclick = fn; g.onkeydown = e => { if (e.key === 'Enter') fn(); }; });\n  const sg = document.getElementById('d7seg'); if (sg) sg.onclick = () => { const el = document.getElementById('timTbl'); S.dash7 = null; if (el) { el.outerHTML = timTabel(); } muatDash7(true); };\n}\n\n/* ---------------- Perlu Perhatian (§5.6) ---------------- */\nfunction perhatianItems(milikSaya) {\n  const it = [], mine = b => !milikSaya || b.k.PIC === S.me.alias;\n  kontrakAktif().filter(mine).forEach(b => {\n    const k = b.k, open = k.StatusKontrak === 'OPEN';\n    bastLewat(b).forEach(x => it.push({ g: 'aging', b, txt: `${esc(x.BASTID)} di <b>${esc(labelTahap(x.KodeTahap))}</b> sudah <b>${hariTahap(x)} hari</b> (batas ${batasTahap(x.KodeTahap)})` }));\n    KD.kendalaAktif(b).forEach(x => { const h = KD.hariSejak(x.Mulai, D.hariIni) || 0; if (h > kendBatas()) it.push({ g: 'kend', b, txt: `${esc(labelKendala(x.Jenis))} aktif <b>${h} hari</b>: ${esc(x.Keterangan)}` }); });\n    if (!k.PIC && open) it.push({ g: 'pic', b, txt: 'Kontrak OPEN tanpa PIC', aksi: 'pic' });\n    if (KD.bool(k.PerluVerifikasi)) it.push({ g: 'verif', b, txt: parsialImport(b) ? 'Hasil import · <b>BAST parsial</b>: lengkapi cakupan & BAST berikutnya saat verifikasi' : 'Data hasil import belum diverifikasi' + (k.StatusKontrak === 'CLOSE' ? ' · sudah CLOSE' : ''), aksi: 'verif' });\n    const m = KD.fieldKurang(b, D.cfg); if (m.length && open) it.push({ g: 'lengkap', b, txt: 'Belum diisi: ' + m.map(f => ({ Customer: 'Customer', EndCustomer: 'End customer', NilaiKontrak: 'Nilai kontrak', OrderInternal: 'SO/MI' })[f] || f).join(', '), aksi: 'lengkapi' });\n  });\n  return it;\n}\nfunction jumlahPerhatian() { if (!D.siap || !S.me) return 0; siapkanLingkup(); return perhatianItems(S.pMine).length; }\nfunction viewPerhatian() {\n  if (!D.siap) return '<div class=\"loading\"><div class=\"spinner\"></div>Memuat data aktif…</div>';\n  siapkanLingkup();\n  const it = perhatianItems(S.pMine), G = [['aging', 'BAST melewati batas aging tahap', 'var(--stale)'], ['kend', `Kendala aktif lebih dari ${kendBatas()} hari`, 'var(--crit)'], ['pic', 'Kontrak tanpa PIC', 'var(--warn)'],\n    ['verif', 'Data import belum diverifikasi', 'var(--info)'], ['lengkap', 'Data kontrak belum lengkap', 'var(--warn)']];\n  const tombol = x => x.aksi === 'pic' && can('pic.atur') ? `<select class=\"inp\" data-ppic=\"${esc(x.b.k.KontrakID)}\" aria-label=\"Atur PIC\" style=\"padding:4px 8px;font-size:12.5px;width:auto\">${opsi(picList(), '', 'Atur PIC…')}</select>`\n    : x.aksi === 'verif' && can('kontrak.update') ? `<button class=\"btn sm ton\" data-pverif=\"${esc(x.b.k.KontrakID)}\">${ic('check', 's')}Periksa</button>`\n    : x.aksi === 'lengkapi' && can('kontrak.update') ? `<button class=\"btn sm\" data-plengkap=\"${esc(x.b.k.KontrakID)}\">${ic('edit', 's')}Lengkapi</button>` : '';\n  const MAKS = 50;\n  return `<div class=\"row\"><div class=\"seg\" role=\"group\" aria-label=\"Lingkup\">${[[false, 'Semua'], [true, 'Milik saya']].map(([v, l]) => `<button data-pmine=\"${v}\" class=\"${S.pMine === v ? 'on' : ''}\">${l}</button>`).join('')}</div>\n    <span class=\"muted\" style=\"font-size:12.5px\">${it.length.toLocaleString('id-ID')} hal perlu ditindaklanjuti${S.pMine ? ' untuk PIC ' + esc(S.me.alias || '(Anda bukan PIC)') : ''}</span></div>\n  <div class=\"note info\">${ic('warn', 's')}<span class=\"tx\">Aging tidak pernah berhenti: hari terus bertambah selama BAST belum pindah tahap. Batas (per tahap, dan ${kendBatas()} hari untuk kendala) hanya menentukan kapan kontrak muncul di halaman ini.</span></div>\n  <div class=\"grid g2\">${G.map(([g, l, c]) => { const xs = it.filter(x => x.g === g); return `<div class=\"card\"><h2><span style=\"width:10px;height:10px;border-radius:50%;background:${c};box-shadow:0 0 10px ${c};flex:none\"></span>${l}<span class=\"sp\"></span><span class=\"pill p-dim tnum\">${xs.length}</span></h2>\n   <div style=\"display:flex;flex-direction:column;gap:8px\">${xs.slice(0, MAKS).map(x => `<div class=\"attn\" data-pk=\"${esc(x.b.k.KontrakID)}\" tabindex=\"0\" role=\"button\"><span class=\"bar\" style=\"background:${c}\"></span><div style=\"min-width:0;flex:1\"><span class=\"mono\" style=\"font-size:11.5px;overflow-wrap:anywhere\">${esc(x.b.k.NoKontrak)}</span><div style=\"font-weight:600\">${esc(custName(x.b.k))} <span class=\"muted\" style=\"font-weight:400\">· PIC ${esc(x.b.k.PIC || '—')}</span></div><div class=\"muted\" style=\"font-size:12.5px\">${x.txt}</div></div>${tombol(x)}</div>`).join('') || '<div class=\"muted\" style=\"font-size:13px\">Tidak ada.</div>'}\n   ${xs.length > MAKS ? `<button class=\"btn sm ghost\" data-pall=\"${g}\">Lihat semua ${xs.length} di daftar kontrak</button>` : ''}</div></div>`; }).join('')}\n   <div class=\"card\" style=\"opacity:.6\"><h2><span style=\"width:10px;height:10px;border-radius:50%;background:var(--dim)\"></span>Beda data dengan sheet unit<span class=\"sp\"></span><span class=\"pill p-dim\">F4b</span></h2><div class=\"muted\" style=\"font-size:13px\">Muncul setelah koneksi ke sheet unit dibangun.</div></div>\n   <div class=\"card\" style=\"opacity:.6\"><h2><span style=\"width:10px;height:10px;border-radius:50%;background:var(--dim)\"></span>Target error / sel diubah di luar SKM<span class=\"sp\"></span><span class=\"pill p-dim\">F4a</span></h2><div class=\"muted\" style=\"font-size:13px\">Muncul setelah sinkron ke sheet unit dibangun.</div></div></div>`;\n}\nfunction bindPerhatian() {\n  const $$c = s => document.querySelectorAll('#content ' + s), ids = () => [...new Set([...$$c('[data-pk]')].map(e => e.dataset.pk))];\n  $$c('[data-pmine]').forEach(b => b.onclick = () => { S.pMine = b.dataset.pmine === 'true'; segarkanTampilan(); perbaruiBadge(); });\n  $$c('[data-pk]').forEach(el => { const fn = e => { if (e && e.target.closest('select,button')) return; openDrawer(el.dataset.pk, ids()); }; el.onclick = fn; el.onkeydown = e => { if (e.key === 'Enter') fn(e); }; });\n  $$c('[data-ppic]').forEach(s => { s.onclick = e => e.stopPropagation(); s.onchange = () => { if (!s.value) return; jalankanOp('kontrak.pic', s.dataset.ppic, { PIC: s.value }); toast(`${s.dataset.ppic} → PIC ${s.value}.`); segarkanTampilan(); perbaruiBadge(); }; });\n  $$c('[data-pverif]').forEach(b => b.onclick = e => { e.stopPropagation(); openDrawer(b.dataset.pverif, ids()); S.dtab = 'data'; renderDrawer(false); toast('Periksa datanya, lengkapi bila perlu, lalu klik \"Tandai terverifikasi\".'); });\n  $$c('[data-plengkap]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = kontrak(b.dataset.plengkap); if (k) openKontrakForm(k); });\n  $$c('[data-pall]').forEach(b => b.onclick = () => goKontrak({ quick: { aging: 'lewat', kend: 'kend', pic: 'nopic', verif: 'verif', lengkap: 'kurang' }[b.dataset.pall], st: b.dataset.pall === 'verif' ? '' : 'OPEN', pic: S.pMine ? S.me.alias || '' : '' }));\n}\nfunction perbaruiBadge() { const c = document.querySelector('[data-cnt=\"perhatian\"]'); if (!c) return; const n = jumlahPerhatian(); c.hidden = !n; c.textContent = n > 999 ? '999+' : n; }\n\n/* ---------------- Ctrl+K: kontrak aktif, kontrak lama (arsip), perintah ---------------- */\nlet palT = null;\nfunction openPalette() {\n  if (!S.me || S.page === 'login' || S.page === 'ganti' || document.querySelector('.pal')) return;\n  const d = document.createElement('div'); d.className = 'scrim pal'; let idx = 0, items = [], lama = { q: '', hasil: [], memuat: false };\n  d.innerHTML = `<div class=\"modal\" role=\"dialog\" aria-label=\"Cari\"><div class=\"ps\">${ic('search')}<input id=\"palq\" placeholder=\"Nomor kontrak, nomor lama, SO/MI, pelanggan, atau perintah…\" autocomplete=\"off\" aria-label=\"Cari\"><kbd>Esc</kbd></div><div class=\"pr\" id=\"palr\"></div><div class=\"pf\"><span><kbd>↑</kbd><kbd>↓</kbd> pilih</span><span><kbd>Enter</kbd> buka</span><span>kontrak diarsipkan &amp; kontrak lama ikut dicari</span></div></div>`;\n  document.getElementById('overlay-root').appendChild(d);\n  const q = d.querySelector('#palq'), r = d.querySelector('#palr');\n  const close = () => { clearTimeout(palT); d.classList.add('closing'); setTimeout(() => d.remove(), 200); }; d._close = close;\n  const CMD = [['tambah', 'Tambah kontrak', 'add', () => { go('kontrak'); openKontrakForm(null); }, 'kontrak.daftar'], ['upload', 'Upload Excel (template SKM)', 'up2', null, 'kontrak.import'],\n    ['import', 'Import data lama (sheet FF)', 'dl', null, 'kontrak.import'], ['beranda', 'Dashboard', 'dash'], ['kontrak', 'Kontrak', 'doc', null, 'kontrak.lihat'], ['perhatian', 'Perlu Perhatian', 'warn', null, 'kontrak.lihat'],\n    ['pengaturan', 'Tahap & aturan', 'gear', null, 'pengaturan.kelola'], ['users', 'Users', 'users', null, 'user.kelola'], ['sistem', 'Sistem', 'db', null, 'user.kelola']].filter(c => !c[4] || can(c[4]));\n  const pick = () => { const it = items[idx]; if (!it) return; close(); if (it.type === 'k') { if (S.page !== 'kontrak' && S.page !== 'perhatian' && S.page !== 'beranda') go('kontrak'); openDrawer(it.id); } else if (it.type === 'lama') bukaLama(it.id); else if (it.fn) it.fn(); else go(it.id); };\n  const cariLama = s => {\n    clearTimeout(palT);\n    if (s.length < 3 || !can('kontrak.lihat')) { lama = { q: '', hasil: [], memuat: false }; return; }\n    if (lama.q === s) return;\n    lama = { q: s, hasil: [], memuat: true };\n    palT = setTimeout(async () => {\n      try { const res = await call('arsip.cari', { q: s }); if (lama.q === s) lama = { q: s, hasil: res.hasil || [], memuat: false }; } catch (e) { lama = { q: s, hasil: [], memuat: false }; }\n      if (d.isConnected) draw(true);\n    }, 400);\n  };\n  const draw = keep => {\n    const s = q.value.trim(), sl = s.toLowerCase();\n    if (!keep) cariLama(s);\n    const ks = D.siap && can('kontrak.lihat') ? (s ? kontrakAktif().filter(b => cocokCari(b, s)) : kontrakAktif().slice().sort((a, b) => (a.k.UpdatedAt < b.k.UpdatedAt ? 1 : -1))).slice(0, 6).map(b => ({ type: 'k', id: b.k.KontrakID, b })) : [];\n    // kontrak yang diarsipkan manual (Arsip = ya) tetap di data aktif: ikut dicari, diberi label (D16)\n    const ds = D.siap && can('kontrak.lihat') && s.length >= 2 ? semuaKontrak().filter(b => KD.bool(b.k.Arsip) && cocokCari(b, s)).slice(0, 3).map(b => ({ type: 'k', id: b.k.KontrakID, b, diarsip: true })) : [];\n    const aktifId = {}; semuaKontrak().forEach(b => { aktifId[b.k.KontrakID] = 1; });\n    const ls = (lama.hasil || []).filter(h => !aktifId[h.KontrakID]).slice(0, 4).map(h => ({ type: 'lama', id: h.KontrakID, h }));\n    const cs = CMD.filter(c => !s || c[1].toLowerCase().indexOf(sl) >= 0).slice(0, 4).map(c => ({ type: 'cmd', id: c[0], t: c[1], ic: c[2], fn: c[3] }));\n    items = ks.concat(ds, ls, cs); idx = Math.max(0, Math.min(idx, items.length - 1));\n    r.innerHTML = items.map((it, i) => it.type === 'k' ? `<div class=\"pi ${i === idx ? 'on' : ''}\" data-i=\"${i}\">${avatarPic(it.b.k.PIC, 1)}<div style=\"min-width:0;flex:1\"><div style=\"font-weight:700\">${esc(custName(it.b.k))}${it.diarsip ? ` <span class=\"pill p-warn\" style=\"font-size:10.5px\" title=\"${esc(it.b.k.AlasanArsip || '')}\">diarsipkan</span>` : ''}</div><div class=\"mono\" style=\"overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">${esc(it.b.k.NoKontrak)}${s && aliasCocok(it.b, s) ? ' · nomor lama ' + esc(aliasCocok(it.b, s).NoAsli) : ''}</div></div>${tahapPill(it.b.k.TahapKontrak)}</div>`\n      : it.type === 'lama' ? `<div class=\"pi ${i === idx ? 'on' : ''}\" data-i=\"${i}\">${avatarPic(it.h.PIC, 1)}<div style=\"min-width:0;flex:1\"><div style=\"font-weight:700\">${esc(it.h.EndCustomer || it.h.NamaPelanggan || '')} <span class=\"pill p-dim\" style=\"font-size:10.5px\">arsip ${esc(String(it.h.Lokasi).replace('ARSIP_', ''))}</span></div><div class=\"mono\" style=\"overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">${esc(it.h.NoKontrak)}${it.h.aliasCocok ? ' · nomor lama ' + esc(it.h.aliasCocok.NoAsli) : ''}</div></div><span class=\"pill p-dim\">${esc(it.h.StatusKontrak || 'CLOSE')}</span></div>`\n      : `<div class=\"pi ${i === idx ? 'on' : ''}\" data-i=\"${i}\">${ic(it.ic)}<div style=\"flex:1;font-weight:600\">${esc(it.t)}</div><span class=\"muted\" style=\"font-size:11.5px\">${it.fn || ['upload', 'import'].indexOf(it.id) >= 0 ? 'perintah' : 'halaman'}</span></div>`).join('')\n      + (lama.memuat ? '<div class=\"pi muted\" style=\"cursor:default\"><span class=\"bspin\" style=\"color:var(--accent)\"></span>Mencari juga di kontrak lama…</div>' : '')\n      || '<div class=\"muted\" style=\"padding:14px\">Tidak ada yang cocok.</div>';\n    r.querySelectorAll('[data-i]').forEach(el => { el.onmouseenter = () => { idx = +el.dataset.i; r.querySelectorAll('.pi').forEach((x, j) => x.classList.toggle('on', j === idx)); }; el.onclick = pick; });\n  };\n  q.oninput = () => { idx = 0; draw(); };\n  q.onkeydown = e => { if (e.key === 'ArrowDown') { idx = Math.min(items.length - 1, idx + 1); draw(true); e.preventDefault(); } else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); draw(true); e.preventDefault(); } else if (e.key === 'Enter') { e.preventDefault(); pick(); } };\n  d.addEventListener('click', e => { if (e.target === d) close(); });\n  draw(); setTimeout(() => q.focus(), 30);\n}\ndocument.addEventListener('keydown', e => {\n  if ((e.ctrlKey || e.metaKey) && !e.altKey && String(e.key).toLowerCase() === 'k') { e.preventDefault(); openPalette(); }\n});\n\n/* ================= F3 · Import sheet FF format lama (§11.1) ================= */\nconst IMP_MAKS = 3000, IMP_BAGIAN = 150;\nfunction resetImport() { S.imp = { step: 1, file: '', h: [], rows: [], map: {}, nilai: {}, pic: {}, refBaru: {}, ada: {}, f: 'all', batas: 300, hasil: null, progres: null, ringkas: null }; }\nresetImport();\nconst ST_IMP = { baru: ['p-ok', 'Baru'], peringatan: ['p-warn', 'Baru · catatan'], ada: ['p-dim', 'Dilewati'], error: ['p-crit', 'Error'] };\n\nfunction cariNomorImport(nk) {\n  const lokal = semuaKontrak().find(b => b.k.NoKontrakNorm === nk || (b.alias || []).some(a => a.AliasNorm === nk));\n  if (lokal) return { KontrakID: lokal.k.KontrakID, NoKontrak: lokal.k.NoKontrak, lokasi: 'AKTIF', viaAlias: lokal.k.NoKontrakNorm !== nk };\n  return S.imp.ada[nk] || null;\n}\nfunction hitungRingkasImport() {\n  const I = S.imp;\n  I.ringkas = KD.ringkasImport(I.rows.map(x => x.r), I.map, D.ref);\n  Object.keys(I.ringkas.nilai).forEach(k => { if (!I.nilai[k]) I.nilai[k] = KD.tebakNilaiLama(k, D.ref); });\n  Object.keys(I.ringkas.pic).forEach(p => { if (!(p in I.pic)) I.pic[p] = picList().find(x => x.toLowerCase() === p.toLowerCase()) || ''; });\n  Object.keys(I.ringkas.refBaru).forEach(k => { if (!(k in I.refBaru)) I.refBaru[k] = true; });\n}\nfunction hasilImportKlien() {\n  const I = S.imp;\n  return KD.periksaImport(I.rows, { map: I.map, nilai: I.nilai, pic: I.pic, refBaru: I.refBaru, ref: D.ref, cfg: D.cfg, bolehPic: can('pic.atur'), alias: S.me.alias || '', cariNomor: cariNomorImport });\n}\nasync function bacaFileImport(file) {\n  if (!/\\.xlsx$/i.test(file.name)) { modal('Bukan file .xlsx', `<div class=\"note warn\">${ic('warn', 's')}<span class=\"tx\">Pilih file Excel berakhiran <b>.xlsx</b>. File .xls lama: buka di Excel lalu <i>Save As → Excel Workbook (.xlsx)</i>. Google Sheet: <i>File → Download → Microsoft Excel</i>.</span></div>`, [{ l: 'Mengerti', pri: true }]); return; }\n  const lp = layarProgres('Membaca ' + file.name, ['Membuka file Excel', 'Mencari baris judul kolom', 'Mencocokkan nomor dengan semua kontrak (termasuk arsip)', 'Menyiapkan pemetaan']);\n  try {\n    lp.langkah(0);\n    const sheets = await XLSXR.baca(await file.arrayBuffer());\n    lp.langkah(1);\n    let pilih = null;\n    sheets.some(sh => { for (let i = 0; i < Math.min(15, sh.aoa.length); i++) { const m = KD.petaImport(sh.aoa[i] || []); if (m.no >= 0) { pilih = { sh, i, m }; return true; } } return false; });\n    if (!pilih) { lp.selesai(); modal('Kolom nomor kontrak tidak ditemukan', `<div class=\"note warn\">${ic('warn', 's')}<span class=\"tx\">Tidak ada baris judul dengan kolom <b>NO WO/SPK/KL</b> (atau No. Kontrak) di 15 baris pertama setiap tab file <span class=\"mono\">${esc(file.name)}</span>.</span></div><div class=\"muted\" style=\"font-size:12px\">File template SKM (tab Kontrak) diunggah lewat <b>Upload Excel</b>.</div>`, [{ l: 'Mengerti', pri: true }]); return; }\n    const h = (pilih.sh.aoa[pilih.i] || []).map(x => String(x == null ? '' : x).trim());\n    const rows = [];\n    for (let j = pilih.i + 1; j < pilih.sh.aoa.length; j++) { const r = pilih.sh.aoa[j] || []; if (r.some(v => String(v == null ? '' : v).trim() !== '')) rows.push({ baris: j + 1, r: h.map((_, c) => r[c] == null ? '' : r[c]) }); }\n    if (!rows.length) { lp.selesai(); toast('Tidak ada baris data di bawah judul kolom.', true); return; }\n    if (rows.length > IMP_MAKS) { lp.selesai(); toast(`File berisi ${rows.length} baris. Maksimal ${IMP_MAKS} per import; pecah jadi beberapa file.`, true); return; }\n    lp.langkah(2);\n    const nomor = [...new Set(rows.map(x => KD.normKey(String(x.r[pilih.m.no] || '').replace(/\\.+$/, ''))).filter(Boolean))], ada = {};\n    for (let i = 0; i < nomor.length; i += 500) Object.assign(ada, (await call('upload.cekNomor', { nomor: nomor.slice(i, i + 500) })).ada);\n    lp.langkah(3);\n    resetImport();\n    Object.assign(S.imp, { step: 2, file: file.name, tab: pilih.sh.nama, barisJudul: pilih.i + 1, h, rows, map: pilih.m, ada });\n    hitungRingkasImport();\n    lp.selesai(); renderImport();\n  } catch (e) { lp.selesai(); modalGagal({ kode: e.kode, pesan: e.pesan || e.message || String(e) }); }\n}\nfunction stepperImport(cur) {\n  return `<div class=\"ustep\">${['Pilih file', 'Pemetaan', 'Pratinjau', 'Selesai'].map((s, i) => `<div class=\"${i + 1 < cur ? 'done' : i + 1 === cur ? 'on' : ''}\"><i>${i + 1 < cur ? '✓' : i + 1}</i><span>${s}</span></div>`).join('<b></b>')}</div>`;\n}\nconst nilaiKey = m => m.jenis === 'tahap' || m.jenis === 'kendala' ? m.jenis + ':' + m.kode : m.jenis;\nfunction viewImport() {\n  if (!D.siap) return '<div class=\"loading\"><div class=\"spinner\"></div>Memuat data aktif…</div>';\n  const I = S.imp;\n  if (I.step === 1) return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:16px\">${stepperImport(1)}\n    <label class=\"drop\" id=\"impDrop\" tabindex=\"0\"><input type=\"file\" id=\"impFile\" accept=\".xlsx\" hidden><div class=\"uic big\">${ic('dl')}</div><h3>Upload sheet FF lama (.xlsx)</h3>\n     <div class=\"muted\">Sheet dengan kolom seperti <span class=\"mono\">NO WO/SPK/KL</span>, <span class=\"mono\">STATUS AWAL</span>, <span class=\"mono\">KENDALA UMUM</span>, <span class=\"mono\">KENDALA DETIL</span>, <span class=\"mono\">PIC</span>. Tarik file ke sini atau <b style=\"color:var(--accent)\">klik untuk memilih</b>.</div>\n     <div class=\"dim\" style=\"font-size:12px\">Kolom dikenali dari judulnya lalu bisa dicocokkan manual. Belum ada yang disimpan sampai Anda menekan <b>Import</b>.</div></label>\n    <div class=\"note info\">${ic('shield', 's')}<span class=\"tx\">Beda dengan <b>Upload Excel</b> (template SKM): import membaca format sheet FF lama apa adanya. Semua hasil import ditandai <b>perlu verifikasi</b> dan muncul di Perlu Perhatian sampai diperiksa PIC. Nomor yang sudah ada (termasuk nomor lama dan kontrak di arsip) dilewati. Aging BAST hasil import dihitung mulai tanggal import. Maksimal ${IMP_MAKS.toLocaleString('id-ID')} baris per file.</span></div>\n    <div class=\"row\"><span class=\"sp\"></span><button class=\"btn ghost sm\" data-go2=\"upload\">Kembali ke Upload Excel</button></div></div>`;\n  if (I.step === 2) {\n    const R = I.ringkas, opsiNilai = D.ref.tahap.filter(t => t.Aktif).map(t => ['tahap:' + t.Kode, 'Tahap · ' + t.Label]).concat(D.ref.kendala.filter(k => k.Aktif).map(k => ['kendala:' + k.Kode, 'Kendala · ' + k.Label]),\n      [['parsial', 'Tandai BAST parsial'], ['lain', 'Kendala Lainnya (keterangan = nilai asli)'], ['abaikan', 'Abaikan']]);\n    const F = KD.KOL_IMPORT;\n    return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:16px\">${stepperImport(2)}\n     <div class=\"row\"><span class=\"pill p-dim\">${ic('doc', 's')} ${esc(I.file)}</span><span class=\"muted\">tab ${esc(I.tab)} · judul kolom di baris ${I.barisJudul} · ${I.rows.length.toLocaleString('id-ID')} baris data</span><span class=\"sp\"></span><button class=\"btn sm\" id=\"impGanti\">Ganti file</button></div>\n     <div class=\"grid g2\">\n      <div class=\"card\"><h2>1. Kolom <small>dikenali dari judul; ubah bila salah</small></h2><div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Di SKM</th><th>Kolom di file</th></tr></thead><tbody>\n       ${F.map(([f, l]) => `<tr><td><b>${esc(l)}</b>${f === 'no' ? ' <span class=\"pill p-crit\" style=\"font-size:10px\">wajib</span>' : ''}${f === 'end' ? '<div class=\"muted\" style=\"font-size:11.5px\">NAMA PELANGGAN = End customer</div>' : f === 'judul' ? '<div class=\"muted\" style=\"font-size:11.5px\">kosong → \"Kontrak &lt;end customer&gt;\"</div>' : ''}</td>\n        <td><select class=\"inp\" data-imap=\"${f}\" style=\"width:100%;min-width:150px\"><option value=\"-1\">— tidak ada —</option>${I.h.map((x, i) => `<option value=\"${i}\" ${I.map[f] === i ? 'selected' : ''}>${esc(x || '(kolom ' + (i + 1) + ')')}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></div>\n      <div style=\"display:flex;flex-direction:column;gap:16px\">\n       <div class=\"card\"><h2>2. Nilai status lama <small>STATUS AWAL &amp; KENDALA UMUM</small></h2>${Object.keys(R.nilai).length ? `<div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Nilai di file</th><th class=\"num\">Baris</th><th>Jadi di SKM</th></tr></thead><tbody>\n        ${Object.keys(R.nilai).sort((a, b) => R.nilai[b] - R.nilai[a]).map(k => { const m = I.nilai[k]; return `<tr><td class=\"mono\" style=\"font-size:12px;overflow-wrap:anywhere\">${esc(k)}${m.tebak ? ' <span class=\"pill p-warn\" style=\"font-size:10px\">tebakan, cek</span>' : m.jenis === 'lain' ? ' <span class=\"pill p-dim\" style=\"font-size:10px\">tidak dikenal</span>' : ''}</td><td class=\"num\">${R.nilai[k]}</td>\n         <td><select class=\"inp\" data-inil=\"${esc(k)}\" style=\"width:100%;min-width:190px\">${opsiNilai.map(([v, l]) => `<option value=\"${esc(v)}\" ${nilaiKey(m) === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></td></tr>`; }).join('')}</tbody></table></div>` : '<div class=\"muted\">Kolom status belum dipetakan atau kosong.</div>'}\n        <div class=\"muted\" style=\"font-size:12px;margin-top:8px\">Bila status awal dan kendala umum menunjuk tahap berbeda, dipakai tahap yang paling maju. Keterangan kendala diambil dari KENDALA DETIL. Tahap penutup (Takeout / Sertim AR) → kontrak langsung CLOSE.</div></div>\n       <div class=\"card\"><h2>3. PIC <small>dicocokkan dengan Alias PIC di Users</small></h2>${!can('pic.atur') ? `<div class=\"note info\" style=\"margin-bottom:8px\">${ic('person', 's')}<span class=\"tx\">Anda tidak punya izin atur PIC, jadi semua kontrak hasil import ber-PIC <b>${esc(S.me.alias || '(kosong)')}</b>.</span></div>` : ''}\n        ${Object.keys(R.pic).map(p => `<div class=\"row\" style=\"margin-bottom:8px\"><span class=\"mono\" style=\"min-width:90px;overflow-wrap:anywhere\">${esc(p)}</span><span class=\"muted\" style=\"white-space:nowrap\">${R.pic[p]} baris →</span><select class=\"inp\" data-ipic=\"${esc(p)}\" ${can('pic.atur') ? '' : 'disabled'} style=\"width:auto;min-width:150px\">${opsi(picList(), I.pic[p], '— tanpa PIC —')}</select>${I.pic[p] ? '<span class=\"pill p-ok\">cocok</span>' : '<span class=\"pill p-warn\">tidak dikenal</span>'}</div>`).join('') || '<div class=\"muted\">Kolom PIC belum dipetakan atau kosong.</div>'}</div>\n       ${Object.keys(R.refBaru).length ? `<div class=\"card\"><h2>4. Referensi baru <small>nilai belum ada di Pengaturan</small></h2>${Object.keys(R.refBaru).map(k => `<label class=\"row\" style=\"margin-bottom:6px;cursor:pointer;flex-wrap:nowrap\"><input type=\"checkbox\" class=\"chk\" data-iref=\"${esc(k)}\" ${I.refBaru[k] ? 'checked' : ''}><span>Tambahkan <b>${esc(k.slice(k.indexOf(':') + 1))}</b> ke ${esc(k.split(':')[0])} <span class=\"muted\">(${R.refBaru[k]} baris)</span></span></label>`).join('')}<div class=\"muted\" style=\"font-size:12px\">Tidak dicentang → kolom itu dikosongkan pada kontrak terkait.</div></div>` : ''}\n      </div></div>\n     <div class=\"row\"><span class=\"sp\"></span><button class=\"btn pri\" id=\"impLanjut\" ${I.map.no >= 0 ? '' : 'disabled'}>Lihat pratinjau ${ic('chevR', 's')}</button></div></div>`;\n  }\n  if (I.step === 3) {\n    const H = hasilImportKlien(), c = s => H.filter(o => o.st === s).length, flt = H.filter(o => I.f === 'all' || o.st === I.f), simpanN = c('baru') + c('peringatan'), sib = !!I.progres;\n    const closeN = H.filter(o => (o.st === 'baru' || o.st === 'peringatan') && T(o.tahap) && T(o.tahap).Penutup).length;\n    const tanpaCust = H.filter(o => (o.st === 'baru' || o.st === 'peringatan') && !o.pel).length, infoBaris = o => o.info.filter(x => x.indexOf('Customer kosong') !== 0);\n    const tile = (f, n, l, cls) => `<button class=\"utile ${cls} ${I.f === f ? 'on' : ''}\" data-if=\"${f}\" ${sib ? 'disabled' : ''}><b class=\"tnum\">${n.toLocaleString('id-ID')}</b><span>${l}</span></button>`;\n    return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:14px\">${stepperImport(3)}\n     <div class=\"utiles\">${tile('all', H.length, 'Semua baris', '')}${tile('baru', c('baru'), 'Siap diimport', 'ok')}${tile('peringatan', c('peringatan'), 'Diimport dengan catatan', 'warn')}${tile('ada', c('ada'), 'Sudah ada · dilewati', 'dim')}${tile('error', c('error'), 'Error · tidak disimpan', 'crit')}</div>\n     <div class=\"note info\">${ic('log', 's')}<span class=\"tx\">Sheet lama tidak punya tanggal masuk tahap, jadi <b>aging BAST hasil import dimulai hari ini</b>. ${closeN ? `<b>${closeN}</b> kontrak langsung CLOSE (status Takeout / Sertim AR). ` : ''}${tanpaCust ? `${tanpaCust} kontrak tanpa Customer (direct): jenis customer BELUM TERDEFINISI sampai dilengkapi saat verifikasi.` : ''}</span></div>\n     <div class=\"tbl-wrap\"><table class=\"t utbl\"><thead><tr><th>Baris</th><th>Hasil</th><th style=\"min-width:200px;max-width:300px\">Kontrak</th><th style=\"min-width:170px\">Dari status lama</th><th style=\"min-width:170px\">Jadi di SKM</th><th style=\"min-width:220px\">Catatan</th></tr></thead><tbody>\n      ${flt.slice(0, I.batas).map(o => `<tr class=\"u-${o.st}\"><td class=\"tnum muted\">${o.baris}</td><td><span class=\"pill ${ST_IMP[o.st][0]}\">${ST_IMP[o.st][1]}</span></td>\n        <td style=\"max-width:300px\"><span class=\"no\" style=\"overflow-wrap:anywhere\">${esc(o.no) || '<span class=\"muted\">(kosong)</span>'}</span><span class=\"sub\">${esc(o.end || '')}${o.judul ? ' · ' + esc(o.judul) : ''}</span>${o.pic ? `<span class=\"sub\">PIC ${esc(o.pic)}</span>` : ''}</td>\n        <td class=\"muted\" style=\"font-size:12px\">${(o.asal || []).map(esc).join('<br>')}</td>\n        <td>${o.st === 'error' || o.st === 'ada' ? '<span class=\"muted\">—</span>' : `${tahapPill(o.tahap)}${o.parsial ? ' <span class=\"pill p-warn\">parsial</span>' : ''}${o.kend.length ? `<div style=\"font-size:11.5px;margin-top:3px;color:var(--crit)\">${o.kend.map(k => esc(labelKendala(k.Jenis)) + ': ' + esc(k.Keterangan)).join('<br>')}</div>` : ''}`}</td>\n        <td><ul class=\"umsg\">${o.err.map(e => `<li class=\"e\">${esc(e)}</li>`).join('')}${o.warn.map(e => `<li class=\"w\">${esc(e)}</li>`).join('')}${infoBaris(o).map(e => `<li>${esc(e)}</li>`).join('')}${!o.err.length && !o.warn.length && !infoBaris(o).length && o.st === 'baru' ? '<li class=\"ok\">Lengkap</li>' : ''}</ul></td></tr>`).join('') || '<tr><td colspan=\"6\" class=\"muted\" style=\"text-align:center;padding:28px\">Tidak ada baris di kategori ini.</td></tr>'}\n     </tbody></table></div>\n     ${flt.length > I.batas ? `<div class=\"row\" style=\"justify-content:center\"><button class=\"btn\" id=\"impMore\">Tampilkan 300 lagi <span class=\"muted\">(${I.batas} dari ${flt.length.toLocaleString('id-ID')})</span></button></div>` : ''}\n     ${I.progres ? `<div class=\"bulk\" style=\"position:sticky;bottom:12px\"><span class=\"bspin\"></span><b>Mengimport bagian ${I.progres.ke} dari ${I.progres.dari}…</b><div class=\"upbar\"><i style=\"width:${Math.round((I.progres.ke - 1) / I.progres.dari * 100)}%\"></i></div><span class=\"muted\" style=\"font-size:12.5px\">Jangan tutup halaman ini.</span></div>`\n     : `<div class=\"bulk\" style=\"position:sticky;bottom:12px\"><b>${simpanN.toLocaleString('id-ID')} kontrak akan diimport</b><span class=\"muted\" style=\"font-size:12.5px\">semua ditandai perlu verifikasi · ${c('ada')} dilewati · ${c('error')} error</span><span class=\"sp\"></span><button class=\"btn sm\" id=\"impKembali\">Kembali ke pemetaan</button><button class=\"btn sm pri\" id=\"impSimpan\" ${simpanN ? '' : 'disabled'}>Import ${simpanN.toLocaleString('id-ID')} kontrak</button></div>`}\n    </div>`;\n  }\n  const R = I.hasil, closeN = R.dibuat.filter(x => x.status === 'CLOSE').length;\n  return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:16px\">${stepperImport(4)}\n   <div class=\"udone\"><div class=\"uic big ok\">${ic('check')}</div><div><h3>Import selesai</h3><div class=\"muted\">${esc(I.file)} · atas nama ${esc(S.me.nama)} · tercatat di Log</div></div></div>\n   <div class=\"utiles\">${[['ok', R.dibuat.length, 'Kontrak masuk · perlu verifikasi'], ['', closeN, 'Di antaranya langsung CLOSE'], ['dim', R.dilewati, 'Sudah ada, dilewati'], ['crit', R.gagal.length, 'Error, tidak disimpan'], ['', R.refBaru.length, 'Referensi baru ditambahkan']].map(([cl, n, l]) => `<div class=\"utile ${cl}\"><b class=\"tnum\">${n.toLocaleString('id-ID')}</b><span>${l}</span></div>`).join('')}</div>\n   ${R.dibuat.length ? `<div class=\"row\">${R.dibuat.slice(0, 60).map(x => `<button class=\"chipf\" data-openk=\"${esc(x.KontrakID)}\"><b class=\"mono\" style=\"font-size:11.5px\">${esc(x.KontrakID)}</b> ${esc(x.no)}</button>`).join('')}${R.dibuat.length > 60 ? `<span class=\"muted\">… dan ${R.dibuat.length - 60} lainnya</span>` : ''}</div>` : ''}\n   ${R.gagal.length ? `<div class=\"note warn\">${ic('warn', 's')}<span class=\"tx\">${R.gagal.length} baris tidak disimpan: ${R.gagal.slice(0, 5).map(g => 'baris ' + g.baris + ' (' + esc(g.err[0]) + ')').join('; ')}${R.gagal.length > 5 ? '; …' : ''}</span></div>` : ''}\n   <div class=\"row\"><button class=\"btn pri\" data-go2=\"perhatian\">Buka Perlu Perhatian (verifikasi)</button><button class=\"btn\" id=\"impLagi\">Import file lain</button></div></div>`;\n}\nfunction renderImport() { const c = document.getElementById('content'); if (!c || S.page !== 'import') return; const sc = window.scrollY; c.innerHTML = viewImport(); bindImport(); window.scrollTo(0, sc); }\nfunction bindImport() {\n  const I = S.imp, $i = s => document.querySelector('#content ' + s), $$i = s => document.querySelectorAll('#content ' + s);\n  if (!D.siap) { muatData(false).then(renderImport).catch(gagal); return; }\n  const f = $i('#impFile'), drop = $i('#impDrop');\n  if (f) f.onchange = () => { if (f.files[0]) bacaFileImport(f.files[0]); };\n  if (drop) {\n    ['dragenter', 'dragover'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add('over'); }));\n    ['dragleave', 'drop'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove('over'); }));\n    drop.addEventListener('drop', ev => { const x = ev.dataTransfer.files[0]; if (x) bacaFileImport(x); });\n    drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.click(); } };\n  }\n  if ($i('#impGanti')) $i('#impGanti').onclick = () => { resetImport(); renderImport(); };\n  if ($i('#impLagi')) $i('#impLagi').onclick = () => { resetImport(); renderImport(); };\n  $$i('[data-imap]').forEach(s => s.onchange = () => { I.map[s.dataset.imap] = +s.value; hitungRingkasImport(); renderImport(); });\n  $$i('[data-inil]').forEach(s => s.onchange = () => { const v = s.value, i = v.indexOf(':'); I.nilai[s.dataset.inil] = i > 0 ? { jenis: v.slice(0, i), kode: v.slice(i + 1) } : { jenis: v }; renderImport(); });\n  $$i('[data-ipic]').forEach(s => s.onchange = () => { I.pic[s.dataset.ipic] = s.value; renderImport(); });\n  $$i('[data-iref]').forEach(c => c.onchange = () => { I.refBaru[c.dataset.iref] = c.checked; });\n  if ($i('#impLanjut')) $i('#impLanjut').onclick = () => { I.step = 3; I.f = 'all'; I.batas = 300; renderImport(); window.scrollTo(0, 0); };\n  if ($i('#impKembali')) $i('#impKembali').onclick = () => { I.step = 2; renderImport(); };\n  if ($i('#impMore')) $i('#impMore').onclick = () => { I.batas += 300; renderImport(); };\n  $$i('[data-if]').forEach(b => b.onclick = () => { I.f = b.dataset.if; I.batas = 300; renderImport(); });\n  $$i('[data-openk]').forEach(b => b.onclick = () => openDrawer(b.dataset.openk));\n  if ($i('#impSimpan')) $i('#impSimpan').onclick = () => {\n    const H = hasilImportKlien(), n = H.filter(o => o.st === 'baru' || o.st === 'peringatan').length, closeN = H.filter(o => (o.st === 'baru' || o.st === 'peringatan') && T(o.tahap) && T(o.tahap).Penutup).length;\n    const ref = Object.keys(I.refBaru).filter(k => I.refBaru[k]);\n    modal('Import data lama?', `<div><b>${n}</b> kontrak baru, semua ditandai <b>perlu verifikasi</b>${closeN ? `; ${closeN} langsung CLOSE` : ''}.</div>${ref.length ? `<div class=\"muted\" style=\"font-size:12.5px\">Referensi baru ditambahkan: ${ref.map(esc).join(', ')}.</div>` : ''}<div class=\"muted\" style=\"font-size:12px\">Disimpan bertahap per ${IMP_BAGIAN} baris. Bila koneksi terputus, import file yang sama lagi: yang sudah tersimpan terbaca \"Sudah ada\".</div>`,\n      [{ l: 'Batal' }, { l: `Import ${n} kontrak`, pri: true, fn: () => { simpanImport(); } }]);\n  };\n}\nasync function simpanImport() {\n  const I = S.imp, H0 = hasilImportKlien(), kirimBaris = {}; H0.forEach(o => { if (o.st === 'baru' || o.st === 'peringatan') kirimBaris[o.baris] = 1; });\n  const kirim = I.rows.filter(x => kirimBaris[x.baris]), bagian = [];\n  for (let i = 0; i < kirim.length; i += IMP_BAGIAN) bagian.push(kirim.slice(i, i + IMP_BAGIAN));\n  const R = { dibuat: [], dilewati: H0.filter(o => o.st === 'ada').length, gagal: H0.filter(o => o.st === 'error').map(o => ({ baris: o.baris, no: o.no, err: o.err })), refBaru: [] };\n  for (let i = 0; i < bagian.length; i++) {\n    I.progres = { ke: i + 1, dari: bagian.length }; renderImport();\n    try {\n      const r = await call('import.simpan', { file: I.file, map: I.map, nilai: I.nilai, pic: I.pic, refBaru: I.refBaru, rows: bagian[i], bagian: (i + 1) + '/' + bagian.length });\n      R.dibuat = R.dibuat.concat(r.dibuat); R.dilewati += r.dilewati; R.gagal = R.gagal.concat(r.gagal); R.refBaru = R.refBaru.concat(r.refBaru || []);\n      if (r.ref) terimaRef(r.ref, D.cfg, D.users);\n      (r.bundles || []).forEach(b => { D.base[b.k.KontrakID] = b; });\n      hitungSemuaView();\n    } catch (e) {\n      bagian.slice(i).forEach(bg => bg.forEach(x => R.gagal.push({ baris: x.baris, no: String(x.r[I.map.no] || ''), err: ['Tidak tersimpan: ' + (e.pesan || e)] })));\n      if (e.kode !== 'SESI_HABIS') modal('Import terhenti', `<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(e.pesan || String(e))}</span></div><div class=\"muted\" style=\"font-size:12.5px\">${R.dibuat.length} kontrak sudah tersimpan. Import file yang sama lagi untuk melanjutkan; yang sudah tersimpan terbaca \"Sudah ada\".</div>`, [{ l: 'Mengerti', pri: true }]);\n      break;\n    }\n  }\n  R.gagal.sort((a, b) => a.baris - b.baris);\n  I.progres = null; I.hasil = R; I.step = 4; renderImport(); perbaruiBadge();\n  toast(`${R.dibuat.length} kontrak diimport dan ditandai perlu verifikasi.`);\n}\n\nboot();\n</script>\n";
