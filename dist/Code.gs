// ===== 00_Config.js =====
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
        if (data.kendala) {
          var kj = ctx.ref.KD[data.kendala.Jenis];
          wajib(kj && kj.Aktif, 'Jenis kendala tidak dikenal.');
          if (kj.WajibKeterangan) wajib(t(data.kendala.Keterangan), 'Keterangan kendala wajib diisi.');
          b.kend.push({ KendalaID: nb.BASTID + '-K1', BASTID: nb.BASTID, KontrakID: kid, Jenis: kj.Kode, Keterangan: t(data.kendala.Keterangan), Status: 'AKTIF',
                        Mulai: data.tglTahap || ctx.now, DibuatOleh: ctx.user, Selesai: '', DiselesaikanOleh: '', CatatanSelesai: '', Version: '1' });
          lg('BUKA_KENDALA', 'Kendala', nb.BASTID + '-K1', 'Jenis', '', kj.Kode, t(data.kendala.Keterangan));
        }
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
    kend: ['kendala'], ket: ['keterangan kendala'], cat: ['catatan'] };
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
  function periksaUpload(rows, ctx) {
    var seen = {};
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

  return {
    s: s, t: t, bool: bool, num: num, salin: salin, galat: galat, normKey: normKey, normCust: normCust, jenisCustomer: jenisCustomer, LABEL_JC: LABEL_JC,
    dokDefault: dokDefault, siapkanRef: siapkanRef, tahapPertama: tahapPertama, penutup: penutup, bastClose: bastClose, hidup: hidup, cakupan: cakupan,
    statusKontrak: statusKontrak, tahapKontrak: tahapKontrak, bastOpen: bastOpen, hariSejak: hariSejak, bucket: bucket, kendalaAktif: kendalaAktif,
    evalPush: evalPush, celahAturan: celahAturan, turunan: turunan, terapkanTurunan: terapkanTurunan, KOL_TURUNAN: KOL_TURUNAN, fieldKurang: fieldKurang,
    bacaRupiah: bacaRupiah, bacaTanggal: bacaTanggal, tebakJenisDok: tebakJenisDok, FIELD_KONTRAK: FIELD_KONTRAK, LABEL: LABEL,
    jalankan: jalankan, beda: beda, KUNCI_TAB: KUNCI_TAB, TAB_BUNDLE: TAB_BUNDLE,
    KOL_UPLOAD: KOL_UPLOAD, KOL_SO: KOL_SO, petaKolom: petaKolom, barisDariAoa: barisDariAoa, periksaUpload: periksaUpload, perubahanUpload: perubahanUpload, periksaSO: periksaSO
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
  function izinUser(user, peta) { return (peta && user && peta[user.Role]) ? peta[user.Role].slice() : []; }

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
            'TerkunciSampai', 'LoginTerakhir', 'PunyaAktivitas', 'SesiVersi', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'Version'],
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
    var out = [];
    semua('_Meta').forEach(function (m) {
      if (!/^FILE_LOG_\d{4}$/.test(m.Key)) return;
      try { SpreadsheetApp.openById(m.Nilai).getSheets().forEach(function (sh) { var n = sh.getName(); if (/^Log-\d{4}-\d{2}$/.test(n)) out.push(n.slice(4)); }); } catch (e) { /* file hilang */ }
    });
    return out.sort().reverse();
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
    }
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
  function infoDatabase() {
    var f = ss(), tabs = f.getSheets().map(function (sh) { return { tab: sh.getName(), baris: Math.max(sh.getLastRow() - 1, 0) }; });
    var a = aksesFile(f), files = [];
    semua('_Meta').forEach(function (m) {
      if (!/^FILE_/.test(m.Key)) return;
      var info = { kunci: m.Key.slice(5), nama: 'SKM_' + m.Key.slice(5), akses: [] };
      try { var g = SpreadsheetApp.openById(m.Nilai); info.nama = g.getName(); info.akses = aksesFile(g).akses; } catch (e) { info.hilang = true; }
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
      username: u.Username, nama: u.Nama, alias: u.AliasPIC, role: u.Role,
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
  return { users: Repo.semua('Users').map(function (u) { return Auth.profil(u); }), roles: daftarRole_(peta), katalog: IZIN };
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
    return { app: infoApp_(), skemaDb: Repo.meta('SKEMA_VERSI'), dibuat: Repo.meta('DB_DIBUAT'), riwayat: riwayat, db: Repo.infoDatabase(),
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
AKSI['data.muat'] = { izin: 'kontrak.lihat', fn: function () {
  return { snap: Repo.snapshot(), ref: refRaw_(), cfg: cfgKlien_(), users: daftarUserPic_(), hariIni: hariIni_(), sekarang: Repo.sekarang() };
} };
AKSI['data.ref'] = { izin: 'kontrak.lihat', fn: function () { return { ref: refRaw_(), cfg: cfgKlien_(), users: daftarUserPic_() }; } };
AKSI['data.perubahan'] = { izin: 'kontrak.lihat', fn: function (ctx) { var r = Repo.feedAmbil(ctx.payload.sejak); r.hariIni = hariIni_(); return r; } };

AKSI['kontrak.op'] = { izin: 'kontrak.lihat', ubah: true, fn: function (ctx) {
  var p = ctx.payload, op = String(p.op || ''), c = ctxKD_(ctx), lama = null, hasil;
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
var UI_HTML = "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap\">\n<style>\n/* Gaya bersama (sumber: mockup \"Orbit\"). */\n/* Layout: \"Orbit\" — rail kaca di kiri, langit berbintang tipis di belakang, kartu melayang. Alur BAST digambar sebagai lintasan orbit\n   (subjek: layanan satelit/VSAT). Detail kontrak = panel geser dari kanan, jadi daftar tetap terlihat. Tema terang + gelap. */\n:root{\n  --bg:#edf2f5; --surface:#ffffff; --surface2:#f3f7f9; --surface3:#e5edf1; --glass:rgba(255,255,255,.74);\n  --line:#d9e3e9; --line2:#c3d1d9; --fg:#0c1a24; --muted:#4d606d; --dim:#7b8d99;\n  --accent:#07857b; --accent-hi:#05a394; --on-accent:#ffffff; --accent-bg:rgba(7,133,123,.10); --glow:rgba(7,133,123,.28);\n  --violet:#5559e8; --violet-bg:rgba(85,89,232,.10);\n  --ok:#14905a; --ok-bg:rgba(20,144,90,.11); --warn:#9c6205; --warn-bg:rgba(214,150,30,.15);\n  --crit:#cc3b3b; --crit-bg:rgba(204,59,59,.10); --info:#3a58d6; --info-bg:rgba(58,88,214,.10);\n  --fresh:#0ea494; --warm:#c59c00; --stale:#df6f1f; --cold:#d23f3f;\n  --halo1:rgba(5,163,148,.16); --halo2:rgba(85,89,232,.11); --star:rgba(12,26,36,.08);\n  --shadow:0 1px 2px rgba(12,26,36,.05),0 10px 30px rgba(12,26,36,.06); --shadow-lg:0 30px 80px rgba(12,26,36,.22);\n  --scrim:rgba(10,22,32,.32);\n  --font:\"Plus Jakarta Sans\",\"Segoe UI\",system-ui,-apple-system,Roboto,Arial,sans-serif;\n  --mono:\"JetBrains Mono\",Consolas,\"Cascadia Mono\",Menlo,monospace;\n  --r:18px; --r-sm:11px; --ease:cubic-bezier(.2,.8,.2,1); --spring:cubic-bezier(.34,1.45,.64,1);\n}\n@media (prefers-color-scheme:dark){:root:not([data-theme=\"light\"]){\n  --bg:#060b14; --surface:#0d1522; --surface2:#121d2e; --surface3:#1a283e; --glass:rgba(12,20,33,.72);\n  --line:#1b293d; --line2:#2a3c57; --fg:#e4edf6; --muted:#93a6bb; --dim:#617490;\n  --accent:#37e2cb; --accent-hi:#86f2e2; --on-accent:#022320; --accent-bg:rgba(55,226,203,.12); --glow:rgba(55,226,203,.42);\n  --violet:#9ca2ff; --violet-bg:rgba(156,162,255,.13);\n  --ok:#4fd897; --ok-bg:rgba(79,216,151,.12); --warn:#f4c552; --warn-bg:rgba(244,197,82,.12);\n  --crit:#ff7c78; --crit-bg:rgba(255,124,120,.12); --info:#92a8ff; --info-bg:rgba(146,168,255,.12);\n  --fresh:#37e2cb; --warm:#f4d250; --stale:#ff9e4e; --cold:#ff7c78;\n  --halo1:rgba(55,226,203,.10); --halo2:rgba(120,110,255,.12); --star:rgba(220,235,255,.13);\n  --shadow:0 1px 0 rgba(255,255,255,.03) inset,0 12px 34px rgba(0,0,0,.38); --shadow-lg:0 30px 90px rgba(0,0,0,.65);\n  --scrim:rgba(2,6,12,.58); color-scheme:dark;\n}}\n:root[data-theme=\"dark\"]{\n  --bg:#060b14; --surface:#0d1522; --surface2:#121d2e; --surface3:#1a283e; --glass:rgba(12,20,33,.72);\n  --line:#1b293d; --line2:#2a3c57; --fg:#e4edf6; --muted:#93a6bb; --dim:#617490;\n  --accent:#37e2cb; --accent-hi:#86f2e2; --on-accent:#022320; --accent-bg:rgba(55,226,203,.12); --glow:rgba(55,226,203,.42);\n  --violet:#9ca2ff; --violet-bg:rgba(156,162,255,.13);\n  --ok:#4fd897; --ok-bg:rgba(79,216,151,.12); --warn:#f4c552; --warn-bg:rgba(244,197,82,.12);\n  --crit:#ff7c78; --crit-bg:rgba(255,124,120,.12); --info:#92a8ff; --info-bg:rgba(146,168,255,.12);\n  --fresh:#37e2cb; --warm:#f4d250; --stale:#ff9e4e; --cold:#ff7c78;\n  --halo1:rgba(55,226,203,.10); --halo2:rgba(120,110,255,.12); --star:rgba(220,235,255,.13);\n  --shadow:0 1px 0 rgba(255,255,255,.03) inset,0 12px 34px rgba(0,0,0,.38); --shadow-lg:0 30px 90px rgba(0,0,0,.65);\n  --scrim:rgba(2,6,12,.58); color-scheme:dark;\n}\n*{box-sizing:border-box}\nhtml,body{height:100%}\nbody{background:var(--bg);color:var(--fg);font-family:var(--font);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}\nbutton,input,select,textarea{font:inherit;color:inherit}\na{color:var(--accent)}\n:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}\n::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}\n.tnum{font-variant-numeric:tabular-nums}\n.mono{font-family:var(--mono);font-size:12.5px;font-variant-ligatures:none}\n.code,.ku,kbd,.t .no{font-variant-ligatures:none}\n.muted{color:var(--muted)} .dim{color:var(--dim)}\nsvg.i{width:20px;height:20px;fill:currentColor;flex:none}\nsvg.i.s{width:16px;height:16px}\n.sky{position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(1100px 620px at 88% -12%,var(--halo1),transparent 62%),radial-gradient(900px 600px at -8% 112%,var(--halo2),transparent 62%)}\n.sky::after{content:\"\";position:absolute;inset:0;background-image:radial-gradient(var(--star) 1px,transparent 1.4px);background-size:30px 30px;-webkit-mask-image:linear-gradient(to bottom,#000 0,transparent 75%);mask-image:linear-gradient(to bottom,#000 0,transparent 75%)}\nbody::before{content:\"\";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:30;background:var(--bg)}\n\n/* ---------- shell ---------- */\n.app{display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100%}\n.side{background:var(--glass);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-right:1px solid var(--line);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;padding-block:18px 14px;padding-left:max(12px,env(safe-area-inset-left,0px));padding-right:12px;z-index:25}\n.brand{display:flex;gap:11px;align-items:center;padding:2px 8px 22px}\n.brand svg{width:40px;height:40px;flex:none}\n.brand b{display:block;font-size:14.5px;line-height:1.15;font-weight:800;letter-spacing:-.01em}\n.brand span{font-size:11.5px;color:var(--muted)}\n.orbit-sat{transform-origin:20px 20px;animation:spin 7s linear infinite}\n@keyframes spin{to{transform:rotate(360deg)}}\n.nav{display:flex;flex-direction:column;gap:3px;position:relative}\n.nav-ind{position:absolute;left:0;right:0;top:0;height:42px;border-radius:13px;background:var(--accent-bg);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 22%,transparent);transition:transform .5s var(--spring);z-index:0}\n.nav a{position:relative;z-index:1;display:flex;align-items:center;gap:12px;height:42px;padding:0 12px;border-radius:13px;color:var(--muted);text-decoration:none;font-weight:600;font-size:13.5px;transition:color .2s}\n.nav a:hover{color:var(--fg)}\n.nav a.on{color:var(--accent)}\n.nav .cnt{margin-left:auto;font-size:11px;font-weight:700;min-width:22px;text-align:center;background:var(--surface3);color:var(--fg);border-radius:999px;padding:1px 7px}\n.nav a.on .cnt{background:var(--accent);color:var(--on-accent)}\n.side-foot{margin-top:auto;padding:12px;border-radius:14px;background:var(--surface2);border:1px solid var(--line);font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:4px}\n.live{display:inline-flex;align-items:center;gap:8px;color:var(--fg);font-weight:600}\n.pulse{width:8px;height:8px;border-radius:50%;background:var(--ok);position:relative;flex:none}\n.pulse::after{content:\"\";position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--ok);opacity:0;animation:ping 2.2s var(--ease) infinite}\n.pulse.warn{background:var(--warn)} .pulse.warn::after{border-color:var(--warn)}\n@keyframes ping{0%{transform:scale(.4);opacity:.9}100%{transform:scale(1.6);opacity:0}}\n\n.main{min-width:0;display:flex;flex-direction:column}\n.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px;padding-block:12px;padding-left:max(24px,env(safe-area-inset-left,0px));padding-right:max(24px,env(safe-area-inset-right,0px))}\n.top h1{font-size:20px;margin:0;font-weight:800;letter-spacing:-.02em;text-wrap:balance;line-height:1.2}\n.top .crumb{color:var(--muted);font-size:12.5px}\n.top .sp{flex:1}\n.cmdk{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:7px 8px 7px 14px;color:var(--muted);cursor:pointer;min-width:250px;box-shadow:var(--shadow);transition:border-color .2s}\n.cmdk:hover{border-color:var(--accent)}\n.cmdk span{flex:1;text-align:left}\nkbd{font-family:var(--mono);font-size:11px;border:1px solid var(--line2);border-bottom-width:2px;border-radius:6px;padding:0 6px;color:var(--muted);background:var(--surface2)}\n.mock{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;border:1px dashed var(--warn);color:var(--warn);padding:3px 8px;border-radius:7px;white-space:nowrap;font-weight:700}\n.iconbtn{background:none;border:0;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:var(--muted);cursor:pointer;position:relative;transition:background .2s,color .2s}\n.iconbtn:hover{background:var(--surface3);color:var(--fg)}\n.iconbtn[disabled]{opacity:.35;cursor:default}\n.badge{position:absolute;top:4px;right:4px;min-width:17px;height:17px;border-radius:9px;background:var(--crit);color:#fff;font-size:10.5px;font-weight:800;display:grid;place-items:center;padding:0 4px;box-shadow:0 0 0 2px var(--bg)}\n.me{display:flex;align-items:center;gap:8px;padding:4px 12px 4px 4px;border-radius:999px;background:var(--surface);border:1px solid var(--line);cursor:pointer;font-weight:600;font-size:13px}\n.av{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;color:var(--on-accent);background:linear-gradient(135deg,var(--accent),var(--violet));flex:none}\n.av.sm{width:26px;height:26px;font-size:11px}\n.av.none{background:var(--warn-bg);color:var(--warn)}\n.burger{display:none}\n.content{padding-block:24px 64px;padding-left:max(24px,env(safe-area-inset-left,0px));padding-right:max(24px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:20px;min-width:0;max-width:1480px;width:100%}\n.content.enter>*{animation:rise .55s var(--ease) both;animation-delay:calc(var(--i,0)*55ms)}\n@keyframes rise{from{opacity:0;transform:translateY(12px)}}\n\n/* ---------- building blocks ---------- */\n.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:18px;min-width:0;box-shadow:var(--shadow)}\n.card h2{font-size:15px;margin:0 0 14px;font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap;letter-spacing:-.01em}\n.card h2 small{font-weight:500;color:var(--muted);font-size:12.5px}\n.eyebrow{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700}\n.grid{display:grid;gap:20px}\n.g2{grid-template-columns:repeat(2,minmax(0,1fr))}\n.g3{grid-template-columns:repeat(3,minmax(0,1fr))}\n.g64{grid-template-columns:minmax(0,1.45fr) minmax(0,1fr)}\n.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n.sp{flex:1}\n.kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}\n.kpi{position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:16px 18px;box-shadow:var(--shadow)}\n.kpi .l{font-size:12px;color:var(--muted);font-weight:600}\n.kpi .v{font-size:30px;font-weight:800;margin-top:6px;letter-spacing:-.03em;line-height:1.05}\n.kpi .s{font-size:12px;color:var(--dim);margin-top:4px}\n.kpi .glyph{position:absolute;right:-8px;top:-8px;width:64px;height:64px;opacity:.07;fill:var(--fg)}\n.btn{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:8px 16px;border:1px solid var(--line2);background:var(--surface);color:var(--fg);cursor:pointer;font-weight:600;font-size:13px;white-space:nowrap;text-decoration:none;transition:transform .15s,background .2s,border-color .2s,box-shadow .2s}\n.btn:hover{border-color:var(--accent)}\n.btn:active{transform:scale(.97)}\n.btn.pri{background:var(--accent);border-color:var(--accent);color:var(--on-accent);box-shadow:0 6px 18px -6px var(--glow)}\n.btn.pri:hover{background:var(--accent-hi);border-color:var(--accent-hi)}\n.btn.ton{background:var(--accent-bg);border-color:transparent;color:var(--accent)}\n.btn.ghost{background:transparent;border-color:transparent;color:var(--accent)}\n.btn.ghost:hover{background:var(--accent-bg)}\n.btn.sm{padding:5px 12px;font-size:12.5px}\n.btn[disabled]{opacity:.45;cursor:not-allowed;box-shadow:none}\n.inp,select.inp,textarea.inp{background:var(--surface);border:1px solid var(--line2);border-radius:var(--r-sm);padding:8px 11px;min-width:0;transition:border-color .2s,box-shadow .2s}\ntextarea.inp{width:100%;min-height:76px;resize:vertical}\n.inp:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-bg)}\n.of{position:relative;display:flex;flex-direction:column;min-width:0}\n.of>span{position:absolute;top:-8px;left:10px;padding:0 5px;font-size:11px;font-weight:600;color:var(--accent);background:var(--surface);line-height:16px;z-index:1}\n.of>.inp{padding:12px 12px 10px;width:100%}\n.of>small{font-size:11.5px;color:var(--dim);margin-top:4px;padding-left:4px}\n.search{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line2);border-radius:999px;padding:7px 14px;flex:1 1 260px;min-width:0;transition:border-color .2s,box-shadow .2s}\n.search:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-bg)}\n.search input{background:none;border:0;outline:0;flex:1;min-width:0}\n.seg{display:inline-flex;background:var(--surface2);border:1px solid var(--line);border-radius:999px;padding:3px}\n.seg button{border:0;background:none;padding:5px 14px;border-radius:999px;cursor:pointer;color:var(--muted);font-weight:600;font-size:12.5px;transition:background .25s,color .25s}\n.seg button.on{background:var(--surface);color:var(--fg);box-shadow:var(--shadow)}\n.chipf{border:1px dashed var(--line2);background:transparent;border-radius:999px;padding:5px 12px;font-size:12.5px;cursor:pointer;color:var(--muted);font-weight:600;display:inline-flex;gap:6px;align-items:center;transition:all .2s}\n.chipf.on{border-style:solid;border-color:var(--accent);color:var(--accent);background:var(--accent-bg)}\n.chipf b{font-variant-numeric:tabular-nums}\n\n.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;white-space:nowrap;background:var(--surface3);color:var(--fg)}\n.pill .dot{width:7px;height:7px;border-radius:50%;background:currentColor}\n.p-ok{background:var(--ok-bg);color:var(--ok)} .p-warn{background:var(--warn-bg);color:var(--warn)}\n.p-crit{background:var(--crit-bg);color:var(--crit)} .p-info{background:var(--info-bg);color:var(--info)}\n.p-acc{background:var(--accent-bg);color:var(--accent)} .p-dim{background:var(--surface2);color:var(--muted);box-shadow:inset 0 0 0 1px var(--line)}\n.p-vio{background:var(--violet-bg);color:var(--violet)}\n.ku{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.02em;border-radius:7px;padding:3px 8px;white-space:nowrap;display:inline-block}\n\n.tbl-wrap{overflow-x:auto;border-radius:var(--r-sm)}\ntable.t{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}\n.t th{text-align:left;font-weight:600;color:var(--dim);font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;padding:9px 12px;border-bottom:1px solid var(--line);white-space:nowrap}\n.t td{padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:middle}\n.t tr:last-child td{border-bottom:0}\n.t tbody tr.click{cursor:pointer;transition:background .15s}\n.t tbody tr.click:hover td{background:var(--surface2)}\n.t tbody tr.sel td{background:var(--accent-bg)}\n.t td.num,.t th.num{text-align:right;font-variant-numeric:tabular-nums}\n.t .no{font-family:var(--mono);font-size:12px;font-weight:500}\n.t .sub{display:block;font-size:12px;color:var(--muted);max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n\n.agebar{display:flex;height:10px;border-radius:6px;overflow:hidden;background:var(--surface3);min-width:120px;gap:2px}\n.agebar i{display:block;height:100%;border-radius:3px}\n.age{font-size:11.5px;border-radius:7px;padding:2px 8px;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}\n.a-fresh{background:color-mix(in srgb,var(--fresh) 15%,transparent);color:var(--fresh)} .a-warm{background:color-mix(in srgb,var(--warm) 16%,transparent);color:var(--warm)}\n.a-stale{background:color-mix(in srgb,var(--stale) 15%,transparent);color:var(--stale)} .a-cold{background:color-mix(in srgb,var(--cold) 15%,transparent);color:var(--cold)}\n.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);font-weight:500}\n.legend span{display:inline-flex;align-items:center;gap:6px}\n.legend i{width:10px;height:10px;border-radius:3px;display:inline-block}\n.spark{display:inline-flex;align-items:flex-end;gap:2px;height:22px}\n.spark i{width:5px;border-radius:2px;background:var(--accent);opacity:.75}\n.spark i:last-child{opacity:1;box-shadow:0 0 8px var(--glow)}\n\n.hbars{display:flex;flex-direction:column;gap:10px}\n.hb{display:grid;grid-template-columns:minmax(0,210px) minmax(0,1fr) 30px;gap:12px;align-items:center;font-size:13px;cursor:pointer;border-radius:8px}\n.hb:hover .lbl{color:var(--accent)}\n.hb .lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .2s}\n.hb .track{height:12px;background:var(--surface2);border-radius:6px;overflow:hidden}\n.hb .fill{height:100%;border-radius:6px;transform-origin:left}\n.enter .hb .fill{animation:grow 1s var(--ease) both;animation-delay:.25s}\n@keyframes grow{from{transform:scaleX(0)}}\n.hb .n{text-align:right;font-variant-numeric:tabular-nums;color:var(--muted);font-weight:700}\n\n.hero{position:relative;overflow:hidden;padding:20px 22px 14px}\n.hero::before{content:\"\";position:absolute;inset:0;background:radial-gradient(600px 220px at 50% 120%,var(--halo1),transparent 70%);pointer-events:none}\n.pipe-wrap{overflow-x:auto;margin:0 -8px}\n.pipe{display:block;width:100%;min-width:760px;height:auto}\n.pipe .track{fill:none;stroke:var(--line2);stroke-width:2;stroke-dasharray:2 7;stroke-linecap:round}\n.pipe .trail{fill:none;stroke:url(#gTrail);stroke-width:3;stroke-linecap:round}\n.pipe .pt{fill:var(--accent);filter:drop-shadow(0 0 4px var(--glow))}\n.pnode{cursor:pointer;outline:none}\n.pnode .body{fill:var(--surface);stroke:var(--accent);stroke-width:2;transition:stroke-width .2s}\n.pnode:hover .body,.pnode:focus-visible .body{stroke-width:4}\n.pnode .halo{fill:var(--accent);opacity:.10}\n.pnode.closer .body{stroke:var(--ok)} .pnode.closer .halo{fill:var(--ok)}\n.pnode .ring{fill:none;stroke:var(--warn);stroke-width:2;stroke-dasharray:4 5;transform-box:fill-box;transform-origin:center;animation:spin 12s linear infinite}\n.pnode .cnt{fill:var(--fg);font-weight:800;font-size:22px;font-family:var(--font)}\n.pnode .lbl{fill:var(--fg);font-size:12.5px;font-weight:600;font-family:var(--font)}\n.pnode .sub{fill:var(--muted);font-size:11.5px;font-family:var(--font)}\n.pnode .sub.w{fill:var(--warn);font-weight:700}\n.enter .pnode{animation:popin .6s var(--spring) both;animation-delay:calc(.15s + var(--d)*70ms);transform-box:fill-box;transform-origin:center}\n@keyframes popin{from{opacity:0;transform:scale(.6)}}\n\n.syncs{display:grid;gap:10px}\n.sync{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:14px;background:var(--surface2);border:1px solid var(--line)}\n\n/* drawer */\n.dscrim{position:fixed;inset:0;background:var(--scrim);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:40;animation:fade .35s var(--ease) both}\n.drawer{position:fixed;top:0;right:0;bottom:0;width:min(1080px,100vw);background:var(--bg);border-left:1px solid var(--line);z-index:41;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);animation:slidein .5s var(--ease) both;padding-top:env(safe-area-inset-top,0px)}\n.drawer::before{content:\"\";position:absolute;inset:0;z-index:-1;background:radial-gradient(700px 300px at 100% 0,var(--halo1),transparent 70%)}\n.closing .drawer{animation:slideout .3s ease-in both}\n.closing .dscrim{animation:fadeout .3s ease-in both}\n@keyframes slidein{from{transform:translateX(70px);opacity:0}}\n@keyframes slideout{to{transform:translateX(70px);opacity:0}}\n@keyframes fade{from{opacity:0}} @keyframes fadeout{to{opacity:0}}\n.dhead{padding-block:14px 0;padding-left:24px;padding-right:max(24px,env(safe-area-inset-right,0px));border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:12px}\n.dtop{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n.dtitle{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}\n.dtitle .no{font-family:var(--mono);font-size:13px;color:var(--muted);display:flex;align-items:center;gap:6px;overflow-wrap:anywhere}\n.dtitle h2{margin:4px 0 2px;font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.2}\n.dtabs{display:flex;gap:4px;position:relative;overflow-x:auto}\n.dtabs button{background:none;border:0;padding:10px 16px;cursor:pointer;font-weight:700;color:var(--muted);font-size:13.5px;position:relative;white-space:nowrap}\n.dtabs button.on{color:var(--fg)}\n.dtabs button.on::after{content:\"\";position:absolute;left:12px;right:12px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:var(--accent);box-shadow:0 0 12px var(--glow)}\n.dbody{flex:1;overflow:auto;padding-block:20px 48px;padding-left:24px;padding-right:max(24px,env(safe-area-inset-right,0px))}\n.dbody.swap>*{animation:rise .4s var(--ease) both}\n\n.bast{border:1px solid var(--line);border-radius:var(--r);padding:16px 18px 18px;display:flex;flex-direction:column;gap:16px;background:var(--surface);box-shadow:var(--shadow)}\n.bast-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n.bast-h b{font-family:var(--mono);font-size:13px}\n.otrack{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(78px,1fr);overflow-x:auto;padding:6px 0 2px}\n.otrack .rail,.otrack .prog{position:absolute;top:19px;height:3px;border-radius:3px}\n.otrack .rail{left:var(--half);right:var(--half);background:var(--surface3)}\n.otrack .prog{left:var(--half);background:linear-gradient(90deg,var(--accent),var(--violet));box-shadow:0 0 12px var(--glow);transition:width .8s var(--ease)}\n.ost{position:relative;z-index:1;background:none;border:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 4px;color:var(--muted);font-size:11.5px;font-weight:600;line-height:1.25;text-align:center}\n.ost .d{width:28px;height:28px;border-radius:50%;background:var(--surface);border:2px solid var(--line2);display:grid;place-items:center;font-size:11px;font-weight:800;transition:all .3s var(--spring)}\n.ost:hover .d{border-color:var(--accent);transform:scale(1.12)}\n.ost:hover{color:var(--fg)}\n.ost.done .d{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}\n.ost.done{color:var(--fg)}\n.ost.cur .d{width:34px;height:34px;margin-top:-3px;margin-bottom:-3px;background:var(--surface);border:3px solid var(--accent);color:var(--accent);box-shadow:0 0 0 6px var(--accent-bg),0 0 22px var(--glow)}\n.ost.cur{color:var(--accent);font-weight:800}\n.ost.closer.done .d,.ost.closer.cur .d{background:var(--ok);border-color:var(--ok);color:var(--on-accent);box-shadow:0 0 0 6px var(--ok-bg)}\n.ost.closer.cur{color:var(--ok)}\ndl.kv{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:8px 18px;margin:0;font-size:13px}\ndl.kv dt{color:var(--muted)} dl.kv dd{margin:0;min-width:0;overflow-wrap:anywhere}\n.push{display:flex;flex-direction:column;gap:2px;border-radius:14px;overflow:hidden;border:1px solid var(--line)}\n.pushrow{display:grid;grid-template-columns:118px minmax(0,1fr);gap:10px;align-items:baseline;font-size:13px;padding:10px 12px;background:var(--surface2)}\n.pushrow .k{font-family:var(--mono);font-size:10.5px;color:var(--dim);font-weight:600}\n.pushrow .v{font-family:var(--mono);font-size:12.5px;font-weight:600;overflow-wrap:anywhere}\n.pushrow.main .v{color:var(--accent);font-size:13.5px}\n.sheetprev{border-radius:14px;overflow:hidden;border:1px solid var(--line);font-size:12px;background:var(--surface)}\n.sheetprev .sh{display:flex;gap:6px;align-items:center;padding:8px 10px;background:var(--surface3);font-weight:600;color:var(--muted)}\n.sheetprev .sh i{width:10px;height:10px;border-radius:50%;background:var(--ok);display:inline-block}\n.tl{display:flex;flex-direction:column;font-size:13px;position:relative}\n.tl .e{display:grid;grid-template-columns:18px 96px minmax(0,1fr);gap:10px;padding:9px 0;align-items:start}\n.tl .e .b{width:10px;height:10px;border-radius:50%;background:var(--accent);margin-top:5px;box-shadow:0 0 0 4px var(--accent-bg)}\n.tl .w{color:var(--dim);font-size:12px}\n.kend{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--crit-bg);border:1px solid color-mix(in srgb,var(--crit) 25%,transparent)}\n.kend.done{background:var(--surface2);border-color:var(--line);opacity:.75}\n.note{padding:11px 14px;border-radius:14px;font-size:13px;display:flex;gap:10px;align-items:flex-start;border:1px solid transparent}\n.note.warn{background:var(--warn-bg);color:var(--warn)} .note.info{background:var(--info-bg);color:var(--info)}\n.note.ok{background:var(--ok-bg);color:var(--ok)} .note.crit{background:var(--crit-bg);color:var(--crit)}\n.note .tx{color:var(--fg)} .note b{color:inherit}\n\n.tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);overflow-x:auto}\n.tabs a{padding:10px 16px;color:var(--muted);text-decoration:none;white-space:nowrap;font-weight:700;position:relative;transition:color .2s}\n.tabs a:hover{color:var(--fg)}\n.tabs a.on{color:var(--fg)}\n.tabs a.on::after{content:\"\";position:absolute;left:12px;right:12px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:var(--accent);box-shadow:0 0 12px var(--glow)}\n.bulk{position:sticky;bottom:16px;background:var(--surface);border:1px solid var(--accent);border-radius:999px;padding:8px 10px 8px 20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;box-shadow:var(--shadow-lg),0 0 0 4px var(--accent-bg);animation:rise .35s var(--spring) both}\n.wiz-steps{display:flex;gap:6px;flex-wrap:wrap}\n.wiz-steps span{display:flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:999px;background:var(--surface2);color:var(--muted);font-size:12.5px;font-weight:600;border:1px solid var(--line)}\n.wiz-steps span i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--surface3);font-style:normal;font-size:11.5px;font-weight:800}\n.wiz-steps span.on{color:var(--accent);background:var(--accent-bg);border-color:transparent}\n.wiz-steps span.on i{background:var(--accent);color:var(--on-accent)}\n.wiz-steps span.done i{background:var(--ok);color:var(--on-accent)}\n.choice{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n.choice label{display:flex;gap:12px;align-items:flex-start;padding:14px;border-radius:14px;border:1.5px solid var(--line2);cursor:pointer;transition:all .2s;background:var(--surface)}\n.choice label.on{border-color:var(--accent);background:var(--accent-bg);box-shadow:0 0 0 4px var(--accent-bg)}\n.choice input{accent-color:var(--accent);margin-top:3px}\n.choice b{display:block;margin-bottom:2px}\n.chk{width:16px;height:16px;accent-color:var(--accent)}\n.toggle{width:38px;height:22px;border-radius:11px;background:var(--surface3);border:1px solid var(--line2);position:relative;cursor:pointer;flex:none;transition:background .25s}\n.toggle::after{content:\"\";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dim);transition:left .3s var(--spring),background .25s}\n.toggle.on{background:var(--accent);border-color:var(--accent)}\n.toggle.on::after{left:18px;background:var(--on-accent)}\n.matrix td,.matrix th{text-align:center} .matrix td:first-child,.matrix th:first-child{text-align:left}\n.attn{display:flex;gap:12px;padding:12px 14px;border-radius:14px;background:var(--surface2);border:1px solid var(--line);cursor:pointer;transition:transform .2s var(--ease),border-color .2s;align-items:center}\n.attn:hover{transform:translateX(3px);border-color:var(--accent)}\n.attn .bar{width:4px;border-radius:4px;flex:none;align-self:stretch}\n.qcard{display:flex;flex-direction:column;gap:12px}\n.diff-old{text-decoration:line-through;color:var(--dim)}\n.diff-new{color:var(--accent);font-weight:700}\n.code{font-family:var(--mono);font-size:11.5px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px;white-space:pre;overflow-x:auto;max-height:180px;color:var(--muted)}\n\n/* overlays */\n.scrim{position:fixed;inset:0;background:var(--scrim);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);z-index:60;display:grid;place-items:center;padding:16px;animation:fade .25s var(--ease) both}\n.modal{background:var(--surface);border:1px solid var(--line);border-radius:22px;width:min(540px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:22px;display:flex;flex-direction:column;gap:16px;box-shadow:var(--shadow-lg);animation:pop .45s var(--spring) both}\n.scrim.closing{animation:fadeout .2s ease-in both} .scrim.closing .modal{animation:popout .2s ease-in both}\n@keyframes pop{from{opacity:0;transform:translateY(10px) scale(.95)}}\n@keyframes popout{to{opacity:0;transform:translateY(6px) scale(.97)}}\n.modal h3{margin:0;font-size:18px;font-weight:800;letter-spacing:-.01em}\n.modal .acts{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}\n.pal{place-items:start center;padding-top:12vh}\n.pal .modal{padding:0;gap:0;width:min(640px,100%)}\n.pal .ps{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--line)}\n.pal .ps input{flex:1;background:none;border:0;outline:0;font-size:16px;min-width:0}\n.pal .pr{max-height:50vh;overflow:auto;padding:8px}\n.pal .pi{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:12px;cursor:pointer}\n.pal .pi.on{background:var(--accent-bg)}\n.pal .pi .mono{font-size:11.5px;color:var(--muted)}\n.pal .pf{display:flex;gap:14px;padding:10px 18px;border-top:1px solid var(--line);font-size:11.5px;color:var(--dim)}\n.notif{position:absolute;right:max(16px,env(safe-area-inset-right,0px));top:62px;width:min(420px,calc(100vw - 32px));background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow-lg);overflow:hidden;transform-origin:top right;transition:opacity .25s var(--ease),transform .35s var(--spring),visibility .35s;opacity:0;transform:scale(.94) translateY(-6px);pointer-events:none;visibility:hidden}\n.notif.open{opacity:1;transform:none;pointer-events:auto;visibility:visible}\n.notif-h{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line)}\n.notif-i{display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);cursor:pointer;font-size:13px;transition:background .15s}\n.notif-i:hover{background:var(--surface2)}\n.notif-i.read{opacity:.5}\n.notif-i .w{font-size:11.5px;color:var(--dim);margin-top:3px}\n.toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));background:var(--fg);color:var(--bg);padding:11px 18px;border-radius:14px;z-index:70;font-size:13px;font-weight:600;box-shadow:var(--shadow-lg);max-width:calc(100vw - 32px);display:flex;gap:10px;align-items:center;animation:toastin .45s var(--spring) both;transform:translateX(-50%)}\n@keyframes toastin{from{opacity:0;transform:translate(-50%,16px) scale(.96)}}\n\n/* login */\n.login{min-height:100%;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)}\n.login-art{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;gap:24px;padding:40px;padding-left:max(40px,env(safe-area-inset-left,0px));border-right:1px solid var(--line);background:radial-gradient(700px 500px at 40% 45%,var(--halo1),transparent 70%),radial-gradient(500px 400px at 80% 90%,var(--halo2),transparent 70%)}\n.login-art svg.orb{position:absolute;left:50%;top:50%;width:min(620px,95%);transform:translate(-50%,-50%);overflow:visible}\n.orb .ring{fill:none;stroke:var(--line2);stroke-width:1.2}\n.orb .ring.d{stroke-dasharray:3 8}\n.orb .nd{fill:var(--surface);stroke:var(--accent);stroke-width:2}\n.orb .nd.ok{stroke:var(--ok)}\n.orb text{fill:var(--muted);font-size:12px;font-weight:600;font-family:var(--font)}\n.orb .sat{fill:var(--accent);filter:drop-shadow(0 0 6px var(--glow))}\n.login-art h2{position:relative;font-size:clamp(26px,3.2vw,40px);line-height:1.1;letter-spacing:-.03em;margin:0;font-weight:800;max-width:15ch;text-wrap:balance}\n.login-art h2 em{font-style:normal;background:linear-gradient(90deg,var(--accent),var(--violet));-webkit-background-clip:text;background-clip:text;color:transparent}\n.login-form{display:grid;place-items:center;padding-block:32px;padding-left:24px;padding-right:max(24px,env(safe-area-inset-right,0px))}\n.login-form .box{width:min(380px,100%);display:flex;flex-direction:column;gap:18px}\n.login-form h3{font-size:24px;margin:0;font-weight:800;letter-spacing:-.02em}\n\n@media (max-width:1180px){.kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.g64,.g3{grid-template-columns:minmax(0,1fr)}}\n@media (max-width:900px){\n  .app{grid-template-columns:minmax(0,1fr)}\n  .side{position:fixed;left:0;top:0;bottom:0;width:264px;transform:translateX(-105%);transition:transform .35s var(--ease);background:var(--surface)}\n  .side.open{transform:none;box-shadow:var(--shadow-lg)}\n  .burger{display:grid}\n  .g2,.choice{grid-template-columns:minmax(0,1fr)}\n  .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}\n  .top{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));gap:4px}\n  .content{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}\n  .top .crumb,.me .nm,.mock,.cmdk span,.cmdk kbd{display:none}\n  .top h1{font-size:17px}\n  .cmdk{min-width:0;padding:9px;border-radius:50%}\n  .hb{grid-template-columns:minmax(0,120px) minmax(0,1fr) 26px}\n  .login{grid-template-columns:minmax(0,1fr)}\n  .login-art{min-height:320px;border-right:0;border-bottom:1px solid var(--line);padding:24px}\n  .dtitle h2{font-size:20px}\n  .dhead,.dbody{padding-left:16px;padding-right:max(16px,env(safe-area-inset-right,0px))}\n  .dkeys{display:none}\n}\n@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.pipe .pt,.orb .sat{display:none}}\n\n/* ---- tambahan F1 ---- */\n/* Tambahan khusus mockup F1 */\n.mpanel{position:fixed;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:55;background:var(--surface);border:1px dashed var(--warn);border-radius:16px;box-shadow:var(--shadow-lg);width:min(300px,calc(100vw - 32px));font-size:12.5px;overflow:hidden}\n.mpanel summary{list-style:none;cursor:pointer;padding:10px 14px;font-weight:800;color:var(--warn);display:flex;align-items:center;gap:8px;letter-spacing:.04em;text-transform:uppercase;font-size:11px}\n.mpanel summary::-webkit-details-marker{display:none}\n.mpanel .mb{padding:0 14px 14px;display:flex;flex-direction:column;gap:10px}\n.mpanel .mb .lbl{font-weight:700;color:var(--muted);font-size:11px;letter-spacing:.06em;text-transform:uppercase}\n.mpanel .chips{display:flex;flex-wrap:wrap;gap:6px}\n.mpanel .chips button{font:inherit;font-size:12px;font-weight:600;border:1px solid var(--line2);background:var(--surface);color:var(--fg);border-radius:999px;padding:4px 10px;cursor:pointer}\n.mpanel .chips button.on{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}\n.term{font-family:var(--mono);font-variant-ligatures:none;font-size:12.5px;line-height:1.75;background:#0b1220;color:#cfe3f0;border-radius:14px;padding:16px 18px;overflow-x:auto;white-space:pre}\n.term .t{color:#6f8aa3} .term .ok{color:#5fe0a0} .term .k{color:#ffd479;font-weight:700} .term .c{color:#8fb3ff}\n.nav a.soon{opacity:.45;cursor:not-allowed}\n.nav a.soon .cnt{background:transparent;border:1px solid var(--line2);color:var(--muted);font-weight:600}\n.rules{display:flex;flex-direction:column;gap:6px;font-size:12.5px}\n.rules span{display:flex;gap:8px;align-items:center;color:var(--muted)}\n.rules span.ok{color:var(--ok)}\n.rules i{width:16px;height:16px;border-radius:50%;border:1.5px solid currentColor;display:grid;place-items:center;font-style:normal;font-size:10px;font-weight:800}\n.secret{display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:14px;background:var(--surface2);border:1px dashed var(--accent);font-family:var(--mono);font-size:20px;font-weight:600;letter-spacing:.08em;font-variant-ligatures:none}\n.secret .btn{font-family:var(--font);letter-spacing:0;font-size:12.5px}\n.denied{display:grid;place-items:center;text-align:center;padding:60px 20px;gap:10px}\n.denied .big{width:64px;height:64px;border-radius:20px;background:var(--crit-bg);color:var(--crit);display:grid;place-items:center}\n.denied .big svg{width:32px;height:32px}\n.res-ok{color:var(--ok);font-weight:700} .res-no{color:var(--crit);font-weight:700}\n.check{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line);font-size:13px}\n.check:last-child{border-bottom:0}\n.check .d{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;flex:none}\n.check .d.y{background:var(--ok);color:var(--on-accent)} .check .d.n{background:var(--surface3);color:var(--muted)}\n/* Users: avatar status, menu ⋮, panel user */\n.ava{--s:34px;width:var(--s);height:var(--s);border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:calc(var(--s)*.36);color:var(--on-accent);background:linear-gradient(135deg,var(--accent),var(--violet));box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--ring,transparent);flex:none;letter-spacing:.02em}\n.ava.on{--ring:var(--ok)} .ava.pw{--ring:var(--warn)} .ava.lock{--ring:var(--crit)} .ava.off{--ring:var(--line2);filter:grayscale(1);opacity:.55}\n.rbadge{display:inline-flex;gap:6px;align-items:center;font-size:12px;font-weight:700;padding:3px 10px 3px 7px;border-radius:999px;background:var(--surface2);box-shadow:inset 0 0 0 1px var(--line)}\n.rbadge svg{width:15px;height:15px;fill:currentColor}\n.rbadge.ADMIN{background:var(--accent-bg);color:var(--accent);box-shadow:none} .rbadge.VIEWER{color:var(--muted)}\n.menu{position:fixed;z-index:65;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg);padding:6px;width:250px;animation:pop .25s var(--spring) both}\n.menu button{display:flex;gap:10px;align-items:flex-start;width:100%;border:0;background:none;padding:9px 12px;border-radius:10px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;color:var(--fg);text-align:left}\n.menu button:hover:not([disabled]){background:var(--surface2)} .menu button.danger{color:var(--crit)} .menu button[disabled]{opacity:.5;cursor:not-allowed}\n.menu button svg{width:18px;height:18px;fill:currentColor;flex:none;margin-top:1px}\n.menu small{display:block;color:var(--muted);font-size:11.5px;font-weight:500}\n.menu hr{border:0;border-top:1px solid var(--line);margin:4px 6px}\n.idcard{position:relative;overflow:hidden;border-radius:20px;padding:20px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 15%,var(--surface)),color-mix(in srgb,var(--violet) 13%,var(--surface)));border:1px solid var(--line);display:flex;gap:16px;align-items:center;min-height:118px}\n.idcard::before,.idcard::after{content:\"\";position:absolute;border-radius:50%;border:1.5px dashed color-mix(in srgb,var(--accent) 35%,transparent);pointer-events:none}\n.idcard::before{width:240px;height:240px;right:-90px;top:-110px} .idcard::after{width:150px;height:150px;right:-30px;top:-55px;border-style:solid;border-color:color-mix(in srgb,var(--violet) 25%,transparent)}\n.idcard .who{min-width:0;position:relative;z-index:1}\n.idcard .who b{display:block;font-size:19px;font-weight:800;letter-spacing:-.02em;overflow-wrap:anywhere}\n.idcard .who .mono{color:var(--muted)}\n.rcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}\n.rcard{border:1.5px solid var(--line2);border-radius:14px;padding:12px;background:var(--surface);cursor:pointer;text-align:left;font:inherit;color:var(--fg);display:flex;flex-direction:column;gap:3px;transition:border-color .2s,background .2s,box-shadow .2s,transform .15s}\n.rcard:hover{transform:translateY(-1px)}\n.rcard.on{border-color:var(--accent);background:var(--accent-bg);box-shadow:0 0 0 4px var(--accent-bg)}\n.rcard svg{width:22px;height:22px;fill:var(--accent);margin-bottom:4px}\n.rcard b{font-size:14px} .rcard small{color:var(--muted);font-size:11.5px;line-height:1.35}\n.perms{display:flex;flex-wrap:wrap;gap:6px}\n.perms span{font-size:11.5px;padding:3px 9px;border-radius:999px;background:var(--surface2);border:1px solid var(--line)}\n.perms.anim span:not(.no){animation:rise .3s var(--ease) both;animation-delay:calc(var(--i)*22ms)}\n.perms span.no{opacity:.4;text-decoration:line-through;animation:none}\n.strength{height:6px;border-radius:3px;background:var(--surface3);overflow:hidden;margin-top:8px}\n.strength i{display:block;height:100%;border-radius:3px;transition:width .3s,background .3s}\n.sect{display:flex;flex-direction:column;gap:12px}\n.sect>.eyebrow{margin-bottom:-2px}\n.swrow{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:14px;background:var(--surface2);border:1px solid var(--line)}\n.swrow b{display:block;font-size:13.5px} .swrow small{color:var(--muted);font-size:12px}\n.danger-zone{border:1px solid color-mix(in srgb,var(--crit) 35%,transparent);border-radius:14px;padding:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}\n.btn.danger{border-color:var(--crit);color:var(--crit);background:transparent}\n.sfoot{display:flex;gap:8px;justify-content:flex-end;padding-block:14px;padding-left:24px;padding-right:max(24px,env(safe-area-inset-right,0px));border-top:1px solid var(--line);background:var(--surface)}\n.ussheet .dbody{display:flex;flex-direction:column;gap:22px}\n\n/* tombol sibuk */\n.btn.busy { cursor: progress; opacity: .85; }\n.bspin { width: 13px; height: 13px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; display: inline-block; animation: bspin .7s linear infinite; flex: none; }\n@keyframes bspin { to { transform: rotate(360deg); } }\n@media (prefers-reduced-motion: reduce) { .bspin { animation-duration: 2s; } }\n\n/* ---- aplikasi ---- */\n.boot{min-height:100vh;display:grid;place-items:center;gap:14px;text-align:center;padding:24px}\n.spinner{width:34px;height:34px;border-radius:50%;border:3px solid var(--line2);border-top-color:var(--accent);animation:spin 1s linear infinite}\n.loading{display:flex;gap:12px;align-items:center;justify-content:center;padding:48px;color:var(--muted)}\n.toast.err{background:var(--crit);color:#fff}\n.btn.busy{opacity:.6;pointer-events:none}\n</style>\n<div class=\"sky\" aria-hidden=\"true\"></div>\n<div id=\"root\"><div class=\"boot\"><div><div class=\"spinner\" style=\"margin:0 auto 12px\"></div><div style=\"color:#7b8d99;font:14px system-ui\">Memuat Status Kontrak Manager…</div></div></div></div>\n<div id=\"sheet-root\"></div>\n<div id=\"overlay-root\"></div>\n<script>\n/* Ikon inline SVG (tanpa CDN). */\nconst IC={\ndash:\"M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z\",\ndoc:\"M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z\",\nwarn:\"M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z\",\ninbox:\"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.34 3-3 3s-3-1.34-3-3H5V5h14v10z\",\nsync:\"M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z\",\ngear:\"M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z\",\nlog:\"M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z\",\nbell:\"M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z\",\nsearch:\"M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z\",\ndl:\"M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z\",\nadd:\"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z\",\nmenu:\"M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z\",\nx:\"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\",\ncheck:\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z\",\nup:\"M7 14l5-5 5 5z\", down:\"M7 10l5 5 5-5z\",\nchevL:\"M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z\", chevR:\"M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z\",\neye:\"M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z\",\nup2:\"M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z\",\nflag:\"M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z\",\nperson:\"M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\",\nsun:\"M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z\",\nmoon:\"M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z\",\nauto:\"M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm1-17.93c3.94.49 7 3.85 7 7.93s-3.05 7.44-7 7.93V4.07z\",\ncopy:\"M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z\",\nlink:\"M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z\"\n};\nconst ic=(n,c='')=>`<svg class=\"i ${c}\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"${IC[n]}\"/></svg>`;\nconst esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\nconst rp=n=>n==null?'—':'Rp '+Number(n).toLocaleString('id-ID');\nconst rpShort=n=>n>=1e12?'Rp '+(n/1e12).toLocaleString('id-ID',{maximumFractionDigits:1})+' T':n>=1e9?'Rp '+(n/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M':'Rp '+Math.round(n/1e6).toLocaleString('id-ID')+' jt';\nconst REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;\nconst LOGO=`<svg viewBox=\"0 0 40 40\" aria-hidden=\"true\"><defs><linearGradient id=\"lg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"var(--accent)\"/><stop offset=\"1\" stop-color=\"var(--violet)\"/></linearGradient></defs><rect width=\"40\" height=\"40\" rx=\"12\" fill=\"url(#lg)\"/><circle cx=\"20\" cy=\"20\" r=\"11\" fill=\"none\" stroke=\"var(--on-accent)\" stroke-opacity=\".45\" stroke-width=\"1.5\"/><circle cx=\"20\" cy=\"20\" r=\"4.5\" fill=\"var(--on-accent)\"/><g class=\"orbit-sat\"><circle cx=\"31\" cy=\"20\" r=\"2.6\" fill=\"var(--on-accent)\"/></g></svg>`;\nIC.lock=\"M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z\";\nIC.users=\"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z\";\nIC.shield=\"M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z\";\nIC.db=\"M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.59 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2-6-1.5-6-2 2.13-2 6-2zm6 12c0 .5-2.13 2-6 2s-6-1.5-6-2v-2.23c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V17zm0-4c0 .5-2.13 2-6 2s-6-1.5-6-2v-2.23c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V13z\";\nIC.more=\"M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z\";\nIC.trash=\"M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z\";\nIC.edit=\"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z\";\nIC.block=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z\";\nIC.home=\"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z\";\nIC.key=\"M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z\";\n\n/**\n * KD — aturan kontrak yang dipakai BERSAMA oleh server (Apps Script) dan browser.\n * Browser menjalankan operasi yang sama untuk tampilan instan (simpan optimis, §4.4);\n * server menjalankannya ulang sebagai keputusan akhir. Fungsi murni: tanpa Google API, tanpa DOM.\n */\nvar KD = (function () {\n\n  // ------------------------------------------------------------------ dasar\n  function s(v) { return v === undefined || v === null ? '' : String(v); }\n  function t(v) { return s(v).trim(); }\n  function bool(v) { return v === true || s(v).toUpperCase() === 'TRUE'; }\n  function num(v, d) { var n = Number(v); return s(v) !== '' && isFinite(n) ? n : (d === undefined ? 0 : d); }\n  function salin(o) { return JSON.parse(JSON.stringify(o)); }\n  function galat(kode, pesan) { var e = new Error(pesan); e.kode = kode; return e; }\n  function wajib(c, pesan, kode) { if (!c) throw galat(kode || 'VALIDASI', pesan); }\n\n  /** Kunci pencocokan nomor (§8.2). */\n  function normKey(x) {\n    return s(x).normalize('NFKC').toUpperCase().replace(/[‐-―−]/g, '-').replace(/\\s+/g, '').replace(/\\.+$/, '');\n  }\n  /** Nama customer untuk perbandingan DIRECT/INDIRECT (§5.7). */\n  function normCust(x) {\n    return s(x).toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\\b(PT|TBK|PERSERO|CV)\\b/g, ' ').replace(/\\s+/g, '');\n  }\n  function jenisCustomer(cust, end) {\n    if (!t(cust) || !t(end)) return 'BELUM';\n    return normCust(cust) === normCust(end) ? 'DIRECT' : 'INDIRECT';\n  }\n  var LABEL_JC = { DIRECT: 'DIRECT', INDIRECT: 'INDIRECT', BELUM: 'BELUM TERDEFINISI' };\n  function dokDefault(jc, cfg) {\n    cfg = cfg || {};\n    return t(cfg['DOKTAGIH_DEFAULT_' + (jc === 'BELUM' ? 'BELUM' : jc)]) || (jc === 'DIRECT' ? 'BAA' : 'BAST');\n  }\n\n  // ------------------------------------------------------------------ referensi\n  /** ref mentah (baris tab) → bentuk siap pakai. */\n  function siapkanRef(raw) {\n    var tahap = (raw.tahap || []).map(function (r) {\n      return { Kode: s(r.Kode), Urutan: num(r.Urutan), Label: s(r.Label) || s(r.Kode), Penutup: bool(r.Penutup), BatasAgingHari: num(r.BatasAgingHari, 14), Aktif: bool(r.Aktif) };\n    }).sort(function (a, b) { return a.Urutan - b.Urutan; });\n    var kendala = (raw.kendala || []).map(function (r) {\n      return { Kode: s(r.Kode), Label: s(r.Label) || s(r.Kode), WajibKeterangan: bool(r.WajibKeterangan), MemicuReopen: bool(r.MemicuReopen), Aktif: bool(r.Aktif), Urutan: num(r.Urutan) };\n    }).sort(function (a, b) { return a.Urutan - b.Urutan; });\n    var push = (raw.push || []).map(function (r) {\n      return { Urutan: num(r.Urutan), Kondisi: s(r.Kondisi), Nilai: s(r.Nilai), Aktif: bool(r.Aktif) };\n    }).sort(function (a, b) { return a.Urutan - b.Urutan; });\n    var peta = function (l) { var m = {}; l.forEach(function (x) { m[x.Kode] = x; }); return m; };\n    var daftar = function (l) { return (l || []).map(function (r) { return { Kode: s(r.Kode), Label: s(r.Label) || s(r.Kode), Aktif: bool(r.Aktif), Urutan: num(r.Urutan) }; }).sort(function (a, b) { return a.Urutan - b.Urutan; }); };\n    return { tahap: tahap, kendala: kendala, push: push, T: peta(tahap), KD: peta(kendala),\n             jenisDok: daftar(raw.jenisDok), populasi: daftar(raw.populasi), segment: daftar(raw.segment), dokTagih: daftar(raw.dokTagih) };\n  }\n  function tahapPertama(ref) { var a = ref.tahap.filter(function (x) { return x.Aktif && !x.Penutup; }); return a.length ? a[0].Kode : (ref.tahap[0] || {}).Kode; }\n  function penutup(ref) { return ref.tahap.filter(function (x) { return x.Aktif && x.Penutup; })[0] || ref.tahap.filter(function (x) { return x.Penutup; })[0] || null; }\n  function bastClose(b, ref) { var x = ref.T[b.KodeTahap]; return !!(x && x.Penutup); }\n  function hidup(rows) { return (rows || []).filter(function (r) { return !bool(r.Dihapus); }); }\n\n  // ------------------------------------------------------------------ status, tahap, aging (§5.4, §5.6)\n  function cakupan(bundle) {\n    var b = hidup(bundle.bast);\n    if (b.length === 1 && t(b[0].CakupanLokasi) === '') return num(bundle.k.JumlahLokasi, 0);   // satu BAST tanpa isian = seluruh lokasi\n    return b.reduce(function (a, x) { return a + num(x.CakupanLokasi, 0); }, 0);\n  }\n  function statusKontrak(bundle, ref) {\n    var b = hidup(bundle.bast), lok = t(bundle.k.JumlahLokasi), tot = cakupan(bundle);\n    var semuaClose = b.length > 0 && b.every(function (x) { return bastClose(x, ref); });\n    var sisa = lok === '' ? '' : Math.max(0, num(lok) - tot);\n    if (semuaClose && (lok === '' || tot >= num(lok))) return { status: 'CLOSE', menunggu: false, sisa: sisa === '' ? '' : 0 };\n    return { status: 'OPEN', menunggu: semuaClose && lok !== '' && tot < num(lok), sisa: sisa };\n  }\n  function bastOpen(bundle, ref) { return hidup(bundle.bast).filter(function (x) { return !bastClose(x, ref); }); }\n  /** Tahap kontrak = tahap BAST OPEN dengan urutan terendah (bottleneck). */\n  function tahapKontrak(bundle, ref) {\n    var o = bastOpen(bundle, ref);\n    if (o.length) {\n      o.sort(function (a, b) { return num((ref.T[a.KodeTahap] || {}).Urutan, 999) - num((ref.T[b.KodeTahap] || {}).Urutan, 999); });\n      return o[0].KodeTahap;\n    }\n    var b = hidup(bundle.bast);\n    return b.length ? (penutup(ref) || {}).Kode || b[0].KodeTahap : '';\n  }\n  function tanggal(x) { var m = s(x).match(/^(\\d{4})-(\\d{2})-(\\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; }\n  /** Hari sejak tanggal (yyyy-MM-dd…) sampai hari ini (yyyy-MM-dd). Tidak pernah berhenti (§5.6). */\n  function hariSejak(dari, hariIni) { var a = tanggal(dari), b = tanggal(hariIni); return a === null || b === null ? null : Math.max(0, Math.round((b - a) / 864e5)); }\n  function bucket(h, batas) { batas = batas || [7, 14, 30]; return h === null ? '' : h <= batas[0] ? 'fresh' : h <= batas[1] ? 'warm' : h <= batas[2] ? 'stale' : 'cold'; }\n  function kendalaAktif(bundle) { return (bundle.kend || []).filter(function (x) { return x.Status === 'AKTIF'; }); }\n\n  // ------------------------------------------------------------------ Nilai Push (§5.5)\n  function cocokKondisi(kond, st, tahap, aktif, adaBast) {\n    if (kond === 'CLOSE') return st.status === 'CLOSE';\n    if (kond === 'SISA_LOKASI') return st.menunggu;\n    if (kond === 'BELUM_ADA_BAST') return !adaBast;\n    if (kond === 'KENDALA:*') return aktif.length > 0;\n    if (kond.indexOf('KENDALA:') === 0) return aktif.some(function (x) { return x.Jenis === kond.slice(8); });\n    if (kond.indexOf('TAHAP:') === 0) return st.status !== 'CLOSE' && tahap === kond.slice(6);\n    return false;\n  }\n  function evalPush(bundle, ref, st, tahap) {\n    st = st || statusKontrak(bundle, ref); tahap = tahap === undefined ? tahapKontrak(bundle, ref) : tahap;\n    var aktif = kendalaAktif(bundle).slice().sort(function (a, b) { return s(a.Mulai) < s(b.Mulai) ? -1 : 1; });\n    var b = hidup(bundle.bast), aturan = ref.push.filter(function (r) { return r.Aktif; });\n    for (var i = 0; i < aturan.length; i++) {\n      var r = aturan[i];\n      if (!cocokKondisi(r.Kondisi, st, tahap, aktif, b.length > 0)) continue;\n      var detil = '', lain = aktif.length;\n      if (r.Kondisi.indexOf('KENDALA:') === 0) {\n        var k = r.Kondisi === 'KENDALA:*' ? aktif[0] : aktif.filter(function (x) { return x.Jenis === r.Kondisi.slice(8); })[0];\n        detil = s(k && k.Keterangan); lain = aktif.length - 1;\n      } else if (b.length) {\n        var terbaru = b.slice().sort(function (x, y) { return s(x.UpdatedAt) < s(y.UpdatedAt) ? 1 : -1; })[0];\n        detil = s(terbaru.Keterangan);\n      }\n      if (lain > 0) detil = (detil ? detil + ' ' : '') + '(+' + lain + ')';\n      return { nilai: r.Nilai, detil: detil, kondisi: r.Kondisi, urutan: r.Urutan, cocok: true };\n    }\n    return { nilai: '', detil: '', kondisi: '', cocok: false };\n  }\n  /** Tahap & kendala aktif yang tidak tercakup aturan mana pun (peringatan halaman pengaturan). */\n  function celahAturan(ref) {\n    var kond = ref.push.filter(function (r) { return r.Aktif; }).map(function (r) { return r.Kondisi; }), out = [];\n    var adaKendalaUmum = kond.indexOf('KENDALA:*') >= 0;\n    ref.tahap.forEach(function (x) { if (x.Aktif && !x.Penutup && kond.indexOf('TAHAP:' + x.Kode) < 0) out.push('Tahap ' + x.Label + ' (' + x.Kode + ')'); });\n    if (penutup(ref) && kond.indexOf('CLOSE') < 0) out.push('Kontrak CLOSE');\n    if (!adaKendalaUmum) ref.kendala.forEach(function (x) { if (x.Aktif && kond.indexOf('KENDALA:' + x.Kode) < 0) out.push('Kendala ' + x.Label + ' (' + x.Kode + ')'); });\n    if (kond.indexOf('BELUM_ADA_BAST') < 0) out.push('Kontrak tanpa BAST');\n    return out;\n  }\n\n  // ------------------------------------------------------------------ turunan kontrak\n  var KOL_TURUNAN = ['JenisCustomer', 'TahapKontrak', 'StatusKontrak', 'SisaLokasi', 'KendalaUmum', 'KendalaDetil', 'TglStatusBerubah', 'TglClose'];\n  function turunan(bundle, ref, now) {\n    var k = bundle.k, st = statusKontrak(bundle, ref), tahap = tahapKontrak(bundle, ref), p = evalPush(bundle, ref, st, tahap);\n    var o = { JenisCustomer: jenisCustomer(k.NamaPelanggan, k.EndCustomer), TahapKontrak: tahap, StatusKontrak: st.status,\n              SisaLokasi: s(st.sisa), KendalaUmum: p.nilai, KendalaDetil: p.detil, TglStatusBerubah: s(k.TglStatusBerubah), TglClose: s(k.TglClose) };\n    if (o.StatusKontrak !== s(k.StatusKontrak)) { o.TglStatusBerubah = now; o.TglClose = o.StatusKontrak === 'CLOSE' ? now : ''; }\n    return o;\n  }\n  function terapkanTurunan(bundle, ref, now) { var o = turunan(bundle, ref, now); for (var c in o) bundle.k[c] = o[c]; return bundle; }\n  /** Field wajib yang masih kosong (§5.6, Config.FIELD_WAJIB). */\n  function fieldKurang(bundle, cfg) {\n    var k = bundle.k, daftar = s((cfg || {}).FIELD_WAJIB || 'Customer,EndCustomer,NilaiKontrak,Segment,Populasi,OrderInternal').split(',').map(t).filter(Boolean);\n    var isi = { Customer: k.NamaPelanggan, EndCustomer: k.EndCustomer, NilaiKontrak: k.NilaiKontrak, Segment: k.Segment, Populasi: k.Populasi,\n                JumlahLokasi: k.JumlahLokasi, PIC: k.PIC, TahunProject: k.TahunProject, JenisDok: k.JenisDok,\n                OrderInternal: hidup(bundle.order).length ? 'ada' : '' };\n    return daftar.filter(function (f) { return f in isi && !t(isi[f]); });\n  }\n\n  // ------------------------------------------------------------------ nilai & tanggal\n  function bacaRupiah(v) {\n    if (v === '' || v === null || v === undefined) return { v: '' };\n    if (typeof v === 'number') return isFinite(v) && v >= 0 ? { v: String(Math.round(v)) } : { e: 1 };\n    var x = String(v).replace(/rp/i, '').replace(/\\s/g, '');\n    if (x === '') return { v: '' };\n    if (!/^[\\d.,]+$/.test(x)) return { e: 1 };\n    if (/,\\d{1,2}$/.test(x) && x.indexOf('.') >= 0) x = x.replace(/\\./g, '').replace(',', '.');\n    else if (/\\.\\d{1,2}$/.test(x) && x.indexOf(',') >= 0) x = x.replace(/,/g, '');\n    else if (/^\\d+,\\d{1,2}$/.test(x)) x = x.replace(',', '.');\n    else if (/^\\d+\\.\\d{1,2}$/.test(x)) { /* desimal biasa */ }\n    else x = x.replace(/[.,]/g, '');\n    var n = Number(x);\n    return isFinite(n) ? { v: String(Math.round(n)) } : { e: 1 };\n  }\n  function pad(n) { return (n < 10 ? '0' : '') + n; }\n  /** Tanggal dari Excel (nomor seri), teks dd/mm/yyyy, atau yyyy-mm-dd → 'yyyy-MM-dd'. */\n  function bacaTanggal(v) {\n    if (v === '' || v === null || v === undefined) return { v: '' };\n    var y, m, d;\n    if (typeof v === 'number' || /^\\d{5}(\\.\\d+)?$/.test(s(v))) {\n      var dt = new Date(Math.round((Number(v) - 25569) * 864e5));\n      y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();\n    } else {\n      var a = s(v).trim().match(/^(\\d{1,2})[\\/\\-.](\\d{1,2})[\\/\\-.](\\d{4})$/), b = s(v).trim().match(/^(\\d{4})-(\\d{1,2})-(\\d{1,2})/);\n      if (a) { d = +a[1]; m = +a[2]; y = +a[3]; } else if (b) { y = +b[1]; m = +b[2]; d = +b[3]; } else return { e: 1 };\n    }\n    var c = new Date(Date.UTC(y, m - 1, d));\n    if (c.getUTCMonth() !== m - 1 || y < 2000 || y > 2100) return { e: 1 };\n    return { v: y + '-' + pad(m) + '-' + pad(d) };\n  }\n  function tebakJenisDok(no) {\n    var u = s(no).toUpperCase().trim();\n    return /^TEL\\./.test(u) || /^KL[.\\-\\/ ]/.test(u) ? 'KL' : /^WO[.\\-\\/ ]/.test(u) ? 'WO' : /^SPK/.test(u) ? 'SPK' : /^PO[.\\-\\/ ]/.test(u) ? 'PO' : '';\n  }\n\n  // ------------------------------------------------------------------ operasi kontrak\n  var FIELD_KONTRAK = ['NoKontrak', 'JenisDok', 'TahunProject', 'Populasi', 'NamaPelanggan', 'EndCustomer', 'JudulKontrak', 'Segment', 'NilaiKontrak', 'JumlahLokasi', 'PIC'];\n  var LABEL = { NoKontrak: 'No. kontrak', JenisDok: 'Jenis dok', TahunProject: 'Tahun', Populasi: 'Populasi', NamaPelanggan: 'Customer', EndCustomer: 'End customer',\n                JudulKontrak: 'Judul', Segment: 'Segment', NilaiKontrak: 'Nilai', JumlahLokasi: 'Jumlah lokasi', PIC: 'PIC',\n                DokTagih: 'Dok tagih', CakupanOrder: 'Cakupan order', CakupanLokasi: 'Cakupan lokasi', NoDokBAST: 'No. dokumen', Keterangan: 'Keterangan' };\n  function punya(ctx, izin) { return (ctx.izin || []).indexOf(izin) >= 0; }\n  function cekIzin(ctx, izin) { if (!punya(ctx, izin)) throw galat('IZIN_DITOLAK', 'Anda tidak punya izin untuk aksi ini (' + izin + ').'); }\n\n  function rapikanKontrak(f) {\n    var o = {};\n    FIELD_KONTRAK.forEach(function (c) { if (c in f) o[c] = t(f[c]); });\n    if ('NilaiKontrak' in o) { var r = bacaRupiah(o.NilaiKontrak); wajib(!r.e, 'Nilai kontrak harus angka.'); o.NilaiKontrak = r.v; }\n    if ('JumlahLokasi' in o && o.JumlahLokasi !== '') wajib(/^\\d+$/.test(o.JumlahLokasi) && +o.JumlahLokasi >= 1, 'Jumlah lokasi harus bilangan bulat ≥ 1, atau kosong.');\n    if ('TahunProject' in o && o.TahunProject !== '') wajib(/^(19|20)\\d\\d$/.test(o.TahunProject), 'Tahun project harus 4 digit, mis. 2026.');\n    if ('NoKontrak' in o) { wajib(o.NoKontrak, 'No. kontrak wajib diisi.'); wajib(o.NoKontrak.length <= 120, 'No. kontrak terlalu panjang.'); }\n    if ('JudulKontrak' in o) wajib(o.JudulKontrak, 'Judul kontrak wajib diisi.');\n    return o;\n  }\n  function barisOrder(kid, n, o, ctx) {\n    var j = t(o.JenisOrder).toUpperCase(), no = t(o.NoOrder);\n    wajib(j === 'SO' || j === 'MI', 'Jenis order harus SO atau MI.');\n    wajib(no, 'No. order wajib diisi.');\n    if (t(o.JumlahLokasi) !== '') wajib(/^\\d+$/.test(t(o.JumlahLokasi)), 'Jumlah lokasi order harus angka.');\n    return { OrderID: kid + '-O' + n, KontrakID: kid, JenisOrder: j, NoOrder: no, NoOrderNorm: normKey(no), JenisLayanan: t(o.JenisLayanan), JenisPekerjaan: t(o.JenisPekerjaan),\n             JumlahLokasi: t(o.JumlahLokasi), Keterangan: t(o.Keterangan), Dihapus: 'FALSE', CreatedAt: ctx.now, CreatedBy: ctx.user, UpdatedAt: ctx.now, UpdatedBy: ctx.user, Version: '1' };\n  }\n  function riwayat(b, kode, ctx, ket) {\n    return { BASTID: b.BASTID, KontrakID: b.KontrakID, Siklus: s(b.Siklus || '1'), KodeTahap: kode, Masuk: ctx.now, Oleh: ctx.user, Keterangan: s(ket) };\n  }\n  function bastBaru(bundle, ctx, data) {\n    var k = bundle.k, urut = 1;\n    (bundle.bast || []).forEach(function (b) { urut = Math.max(urut, num(b.Urutan) + 1); });\n    var jc = jenisCustomer(k.NamaPelanggan, k.EndCustomer), doc = t(data.DokTagih) || dokDefault(jc, ctx.cfg);\n    wajib(doc === 'BAST' || doc === 'BAA' || (ctx.ref.dokTagih || []).some(function (d) { return d.Kode === doc; }), 'Dokumen tagih tidak dikenal.');\n    var tahap = t(data.KodeTahap) || tahapPertama(ctx.ref), x = ctx.ref.T[tahap];\n    wajib(x && x.Aktif, 'Tahap awal tidak dikenal atau nonaktif.');\n    var b = { BASTID: k.KontrakID + '-B' + urut, KontrakID: k.KontrakID, Urutan: String(urut), DokTagih: doc, KodeTahap: tahap, Siklus: '1',\n              CakupanOrder: s(data.CakupanOrder), CakupanLokasi: t(data.CakupanLokasi), DaftarLokasi: '', NoDokBAST: '', TglTahapMulai: data.TglTahapMulai || ctx.now,\n              Keterangan: t(data.Keterangan), Status: x.Penutup ? 'CLOSE' : 'OPEN', Dihapus: 'FALSE', CreatedAt: ctx.now, CreatedBy: ctx.user, UpdatedAt: ctx.now, UpdatedBy: ctx.user, Version: '1' };\n    if (b.CakupanLokasi !== '') wajib(/^\\d+$/.test(b.CakupanLokasi), 'Cakupan lokasi harus angka.');\n    return b;\n  }\n  function cariBaris(list, kunci, nilai, nama) { var r = (list || []).filter(function (x) { return x[kunci] === nilai; })[0]; wajib(r, nama + ' tidak ditemukan. Muat ulang data.', 'TIDAK_ADA'); return r; }\n  function catatBantu(bundle, ctx) { var pic = t(bundle.k.PIC); return pic && ctx.alias !== pic ? 'bantu (PIC ' + pic + ')' : ''; }\n\n  /**\n   * Jalankan operasi pada bundle kontrak {k, bast[], order[], kend[], alias[]}.\n   * ctx: {user, nama, alias, now ('yyyy-MM-dd HH:mm:ss'), ref (siapkanRef), cfg, izin[], idKontrak()}\n   * Hasil: {bundle, log[], riwayat[], alias[]} — bundle baru (salinan), daftar log, baris riwayat & alias baru.\n   */\n  function jalankan(op, bundleLama, data, ctx) {\n    data = data || {};\n    var b = bundleLama ? salin(bundleLama) : { k: null, bast: [], order: [], kend: [], alias: [] };\n    ['bast', 'order', 'kend', 'alias'].forEach(function (x) { b[x] = b[x] || []; });\n    var out = { bundle: b, log: [], riwayat: [], alias: [] }, k = b.k;\n    var lg = function (aksi, entitas, id, field, lama, baru, cat) {\n      out.log.push({ aksi: aksi, entitas: entitas, id: id, field: field || '', lama: s(lama), baru: s(baru), catatan: [cat || '', catatBantu(b, ctx)].filter(Boolean).join(' · ') });\n    };\n    if (op !== 'kontrak.buat') { wajib(k, 'Kontrak tidak ditemukan.', 'TIDAK_ADA'); wajib(!bool(k.Arsip) || op === 'kontrak.unarsip', 'Kontrak ini diarsipkan. Kembalikan dari arsip dulu untuk mengubahnya.', 'DIARSIPKAN'); }\n\n    if (op === 'kontrak.buat') {\n      cekIzin(ctx, 'kontrak.daftar');\n      var f = rapikanKontrak(data.f || {});\n      wajib('NoKontrak' in f, 'No. kontrak wajib diisi.'); wajib('JudulKontrak' in f, 'Judul kontrak wajib diisi.');\n      if (!punya(ctx, 'pic.atur')) f.PIC = t(ctx.alias);\n      if (!f.JenisDok) f.JenisDok = tebakJenisDok(f.NoKontrak);\n      var kid = data.KontrakID || ctx.idKontrak();\n      k = b.k = { KontrakID: kid, NoKontrak: f.NoKontrak, NoKontrakNorm: normKey(f.NoKontrak), JenisDok: s(f.JenisDok), TahunProject: s(f.TahunProject), Populasi: s(f.Populasi),\n        NamaPelanggan: s(f.NamaPelanggan), EndCustomer: s(f.EndCustomer), JudulKontrak: f.JudulKontrak, Segment: s(f.Segment), NilaiKontrak: s(f.NilaiKontrak), JumlahLokasi: s(f.JumlahLokasi),\n        PIC: s(f.PIC), JenisCustomer: '', TahapKontrak: '', StatusKontrak: '', SisaLokasi: '', KendalaUmum: '', KendalaDetil: '', TglStatusBerubah: ctx.now,\n        PerluVerifikasi: data.verifikasi ? 'TRUE' : 'FALSE', Arsip: 'FALSE', AlasanArsip: '', SumberAwal: t(data.sumber) || 'MANUAL', TglClose: '',\n        CreatedAt: ctx.now, CreatedBy: ctx.user, UpdatedAt: ctx.now, UpdatedBy: ctx.user, Version: '0' };\n      var seen = {};\n      (data.orders || []).filter(function (o) { return t(o.NoOrder); }).forEach(function (o, i) {\n        var r = barisOrder(kid, i + 1, o, ctx); wajib(!seen[r.NoOrderNorm], 'Ada nomor SO/MI yang dobel: ' + r.NoOrder + '.'); seen[r.NoOrderNorm] = 1; b.order.push(r);\n      });\n      lg('BUAT_KONTRAK', 'Kontrak', kid, '', '', f.NoKontrak, (data.catatan || 'input manual') + (f.PIC ? '; PIC ' + f.PIC : ''));\n      if (data.buatBast !== false) {\n        var nb = bastBaru(b, ctx, { DokTagih: data.dokTagih, KodeTahap: data.tahapAwal, TglTahapMulai: data.tglTahap, Keterangan: data.ketBast,\n          CakupanOrder: b.order.map(function (o) { return o.NoOrder; }).join(', ') });\n        b.bast.push(nb); out.riwayat.push(riwayat(nb, nb.KodeTahap, ctx, 'BAST dibuat'));\n        lg('BUAT_BAST', 'BAST', nb.BASTID, 'DokTagih', '', nb.DokTagih, 'dibuat bersama kontrak');\n        if (data.kendala) {\n          var kj = ctx.ref.KD[data.kendala.Jenis];\n          wajib(kj && kj.Aktif, 'Jenis kendala tidak dikenal.');\n          if (kj.WajibKeterangan) wajib(t(data.kendala.Keterangan), 'Keterangan kendala wajib diisi.');\n          b.kend.push({ KendalaID: nb.BASTID + '-K1', BASTID: nb.BASTID, KontrakID: kid, Jenis: kj.Kode, Keterangan: t(data.kendala.Keterangan), Status: 'AKTIF',\n                        Mulai: data.tglTahap || ctx.now, DibuatOleh: ctx.user, Selesai: '', DiselesaikanOleh: '', CatatanSelesai: '', Version: '1' });\n          lg('BUKA_KENDALA', 'Kendala', nb.BASTID + '-K1', 'Jenis', '', kj.Kode, t(data.kendala.Keterangan));\n        }\n      }\n    } else if (op === 'kontrak.ubah') {\n      cekIzin(ctx, 'kontrak.update');\n      var p = rapikanKontrak(data.f || {});\n      if ('PIC' in p && p.PIC !== s(k.PIC)) cekIzin(ctx, 'pic.atur');\n      var ubah = Object.keys(p).filter(function (c) { return s(p[c]) !== s(k[c]); });\n      if ('NoKontrak' in p && normKey(p.NoKontrak) !== s(k.NoKontrakNorm) && ubah.indexOf('NoKontrak') >= 0) {\n        var lama = k.NoKontrak;\n        if (!(b.alias || []).some(function (a) { return a.AliasNorm === normKey(lama); })) {\n          var al = { AliasNorm: normKey(lama), NoAsli: lama, KontrakID: k.KontrakID, Sumber: 'KOREKSI', Catatan: t(data.alasan), CreatedAt: ctx.now, CreatedBy: ctx.user };\n          b.alias.push(al); out.alias.push(al);\n        }\n        k.NoKontrakNorm = normKey(p.NoKontrak);\n      }\n      ubah.forEach(function (c) { lg(c === 'PIC' ? 'ATUR_PIC' : 'UBAH_KONTRAK', 'Kontrak', k.KontrakID, LABEL[c] || c, k[c], p[c], c === 'NoKontrak' ? 'nomor lama disimpan sebagai alias' : ''); k[c] = p[c]; });\n      if (!ubah.length) out.kosong = true;\n    } else if (op === 'kontrak.pic') {\n      cekIzin(ctx, 'pic.atur');\n      var pic = t(data.PIC);\n      if (pic === s(k.PIC)) out.kosong = true; else { lg('ATUR_PIC', 'Kontrak', k.KontrakID, 'PIC', k.PIC, pic, data.massal ? 'atur PIC massal' : ''); k.PIC = pic; }\n    } else if (op === 'kontrak.arsip') {\n      cekIzin(ctx, 'kontrak.arsip');\n      wajib(t(data.alasan), 'Alasan wajib diisi.');\n      k.Arsip = 'TRUE'; k.AlasanArsip = t(data.alasan); lg('ARSIP_KONTRAK', 'Kontrak', k.KontrakID, 'Arsip', 'tidak', 'ya', t(data.alasan));\n    } else if (op === 'kontrak.unarsip') {\n      cekIzin(ctx, 'kontrak.arsip');\n      k.Arsip = 'FALSE'; k.AlasanArsip = ''; lg('ARSIP_KONTRAK', 'Kontrak', k.KontrakID, 'Arsip', 'ya', 'tidak', 'dikembalikan dari arsip');\n    } else if (op === 'kontrak.verif') {\n      cekIzin(ctx, 'kontrak.update');\n      k.PerluVerifikasi = 'FALSE'; lg('VERIFIKASI', 'Kontrak', k.KontrakID, 'PerluVerifikasi', 'ya', 'tidak', '');\n    } else if (op === 'order.simpan') {\n      cekIzin(ctx, 'kontrak.update');\n      var o = data.o || {}, ada = o.OrderID ? cariBaris(b.order, 'OrderID', o.OrderID, 'SO/MI') : null;\n      var n = ada ? null : b.order.length + 1, r = barisOrder(k.KontrakID, n || 0, o, ctx);\n      var dobel = hidup(b.order).some(function (x) { return x.NoOrderNorm === r.NoOrderNorm && (!ada || x.OrderID !== ada.OrderID); });\n      wajib(!dobel, 'No. order ' + r.NoOrder + ' sudah ada di kontrak ini.');\n      if (ada) {\n        ['JenisOrder', 'NoOrder', 'NoOrderNorm', 'JenisLayanan', 'JenisPekerjaan', 'JumlahLokasi', 'Keterangan'].forEach(function (c) {\n          if (s(ada[c]) !== s(r[c])) { if (c !== 'NoOrderNorm') lg('UBAH_ORDER', 'OrderInternal', ada.OrderID, c, ada[c], r[c]); ada[c] = r[c]; } });\n        ada.UpdatedAt = ctx.now; ada.UpdatedBy = ctx.user; ada.Version = s(num(ada.Version) + 1);\n      } else { b.order.push(r); lg('TAMBAH_ORDER', 'OrderInternal', r.OrderID, 'NoOrder', '', r.NoOrder, r.JenisOrder); }\n    } else if (op === 'order.hapus') {\n      cekIzin(ctx, 'kontrak.update');\n      var oh = cariBaris(b.order, 'OrderID', data.id, 'SO/MI');\n      oh.Dihapus = 'TRUE'; oh.UpdatedAt = ctx.now; oh.UpdatedBy = ctx.user; oh.Version = s(num(oh.Version) + 1);\n      lg('HAPUS_ORDER', 'OrderInternal', oh.OrderID, 'NoOrder', oh.NoOrder, '', '');\n    } else if (op === 'bast.tambah') {\n      cekIzin(ctx, 'kontrak.update');\n      var bb = bastBaru(b, ctx, data);\n      cekCakupan(b, bb, ctx);\n      b.bast.push(bb); out.riwayat.push(riwayat(bb, bb.KodeTahap, ctx, 'BAST dibuat'));\n      lg('BUAT_BAST', 'BAST', bb.BASTID, 'DokTagih', '', bb.DokTagih, bb.CakupanLokasi ? bb.CakupanLokasi + ' lokasi' : '');\n    } else if (op === 'bast.ubah') {\n      cekIzin(ctx, 'kontrak.update');\n      var bu = cariBaris(b.bast, 'BASTID', data.id, 'BAST'), baru = {};\n      ['DokTagih', 'CakupanOrder', 'CakupanLokasi', 'NoDokBAST', 'Keterangan'].forEach(function (c) { if (c in data) baru[c] = t(data[c]); });\n      if ('DokTagih' in baru) wajib(baru.DokTagih === 'BAST' || baru.DokTagih === 'BAA' || (ctx.ref.dokTagih || []).some(function (d) { return d.Kode === baru.DokTagih; }), 'Dokumen tagih tidak dikenal.');\n      if ('CakupanLokasi' in baru && baru.CakupanLokasi !== '') wajib(/^\\d+$/.test(baru.CakupanLokasi), 'Cakupan lokasi harus angka.');\n      var uji = salin(bu); for (var c2 in baru) uji[c2] = baru[c2];\n      cekCakupan(b, uji, ctx, bu.BASTID);\n      var adaUbah = false;\n      Object.keys(baru).forEach(function (c) { if (s(bu[c]) !== baru[c]) { adaUbah = true; lg(c === 'DokTagih' ? 'UBAH_DOKTAGIH' : 'UBAH_BAST', 'BAST', bu.BASTID, LABEL[c] || c, bu[c], baru[c]); bu[c] = baru[c]; } });\n      if (adaUbah) { bu.UpdatedAt = ctx.now; bu.UpdatedBy = ctx.user; bu.Version = s(num(bu.Version) + 1); } else out.kosong = true;\n    } else if (op === 'bast.tahap') {\n      cekIzin(ctx, 'kontrak.update');\n      var bt = cariBaris(b.bast, 'BASTID', data.id, 'BAST'), ke = ctx.ref.T[data.ke], dari = ctx.ref.T[bt.KodeTahap];\n      wajib(ke && ke.Aktif, 'Tahap tujuan tidak dikenal atau nonaktif.');\n      wajib(!bastClose(bt, ctx.ref), 'BAST ini sudah close. Untuk membukanya lagi, buka kendala pemicu reopen (mis. Revisi Dokumen).', 'SUDAH_CLOSE');\n      if (bt.KodeTahap === ke.Kode) { out.kosong = true; }\n      else {\n        var mundur = dari && ke.Urutan < dari.Urutan;\n        if (mundur) wajib(t(data.ket), 'Mundur tahap wajib disertai keterangan.');\n        lg('UBAH_TAHAP', 'BAST', bt.BASTID, 'KodeTahap', bt.KodeTahap, ke.Kode, t(data.ket) + (mundur ? (t(data.ket) ? ' ' : '') + '(mundur)' : ''));\n        bt.KodeTahap = ke.Kode; bt.TglTahapMulai = ctx.now; bt.Status = ke.Penutup ? 'CLOSE' : 'OPEN';\n        bt.UpdatedAt = ctx.now; bt.UpdatedBy = ctx.user; bt.Version = s(num(bt.Version) + 1);\n        out.riwayat.push(riwayat(bt, ke.Kode, ctx, data.ket));\n      }\n    } else if (op === 'kendala.buka') {\n      cekIzin(ctx, 'kontrak.update');\n      var bk = cariBaris(b.bast, 'BASTID', data.bastId, 'BAST'), jk = ctx.ref.KD[data.Jenis], ket = t(data.Keterangan);\n      wajib(jk && jk.Aktif, 'Jenis kendala tidak dikenal atau nonaktif.');\n      if (jk.WajibKeterangan) wajib(ket, 'Keterangan kendala wajib diisi.');\n      if (bastClose(bk, ctx.ref)) {\n        wajib(jk.MemicuReopen, 'BAST ini sudah close. Hanya kendala pemicu reopen (mis. Revisi Dokumen, Return Customer) yang bisa dibuka.', 'SUDAH_CLOSE');\n        var tr = ctx.ref.T[t(data.tahapReopen) || s(ctx.cfg.TAHAP_REOPEN) || 'DRAFTING'];\n        wajib(tr && tr.Aktif && !tr.Penutup, 'Tahap reopen tidak dikenal, nonaktif, atau tahap penutup.');\n        bk.Siklus = s(num(bk.Siklus, 1) + 1); bk.KodeTahap = tr.Kode; bk.TglTahapMulai = ctx.now; bk.Status = 'OPEN';\n        bk.UpdatedAt = ctx.now; bk.UpdatedBy = ctx.user; bk.Version = s(num(bk.Version) + 1);\n        out.riwayat.push(riwayat(bk, tr.Kode, ctx, 'Reopen: ' + jk.Label + (ket ? ' — ' + ket : '')));\n        lg('REOPEN', 'BAST', bk.BASTID, 'Siklus', num(bk.Siklus) - 1, bk.Siklus, jk.Label + ' → ' + tr.Label + (data.dariArsip ? '; dari arsip ' + data.dariArsip : ''));\n      }\n      var nk = b.kend.filter(function (x) { return x.BASTID === bk.BASTID; }).length + 1;\n      var kr = { KendalaID: bk.BASTID + '-K' + nk, BASTID: bk.BASTID, KontrakID: k.KontrakID, Jenis: jk.Kode, Keterangan: ket, Status: 'AKTIF', Mulai: ctx.now,\n                 DibuatOleh: ctx.user, Selesai: '', DiselesaikanOleh: '', CatatanSelesai: '', Version: '1' };\n      b.kend.push(kr); lg('BUKA_KENDALA', 'Kendala', kr.KendalaID, 'Jenis', '', jk.Kode, ket);\n    } else if (op === 'kendala.tutup') {\n      cekIzin(ctx, 'kontrak.update');\n      var kt = cariBaris(b.kend, 'KendalaID', data.id, 'Kendala');\n      wajib(kt.Status === 'AKTIF', 'Kendala ini sudah selesai.');\n      kt.Status = 'SELESAI'; kt.Selesai = ctx.now; kt.DiselesaikanOleh = ctx.user; kt.CatatanSelesai = t(data.catatan); kt.Version = s(num(kt.Version) + 1);\n      lg('TUTUP_KENDALA', 'Kendala', kt.KendalaID, 'Status', 'AKTIF', 'SELESAI', t(data.catatan));\n    } else {\n      throw galat('AKSI_TIDAK_DIKENAL', 'Operasi \"' + op + '\" tidak dikenal.');\n    }\n\n    terapkanTurunan(b, ctx.ref, ctx.now);\n    if (!out.kosong) { b.k.UpdatedAt = ctx.now; b.k.UpdatedBy = ctx.user; b.k.Version = s(num(b.k.Version) + 1); }\n    return out;\n  }\n  function cekCakupan(bundle, bastUji, ctx, gantiId) {\n    var lok = t(bundle.k.JumlahLokasi);\n    if (lok === '') return;\n    var lain = hidup(bundle.bast).filter(function (x) { return x.BASTID !== (gantiId || bastUji.BASTID); });\n    var jumlah = lain.reduce(function (a, x) { return a + num(x.CakupanLokasi, 0); }, 0) + num(bastUji.CakupanLokasi, 0);\n    wajib(jumlah <= num(lok), 'Total cakupan semua BAST (' + jumlah + ') melebihi jumlah lokasi kontrak (' + lok + ').');\n  }\n\n  /** Bandingkan dua bundle → baris yang ditambah/diubah per tab (dipakai server untuk menulis seminimal mungkin). */\n  var KUNCI_TAB = { Kontrak: 'KontrakID', BAST: 'BASTID', OrderInternal: 'OrderID', Kendala: 'KendalaID' };\n  var TAB_BUNDLE = { Kontrak: 'k', BAST: 'bast', OrderInternal: 'order', Kendala: 'kend' };\n  function beda(lama, baru) {\n    var out = { tambah: {}, ubah: {} };\n    Object.keys(TAB_BUNDLE).forEach(function (tab) {\n      var key = KUNCI_TAB[tab], a = lama ? lama[TAB_BUNDLE[tab]] : null, z = baru[TAB_BUNDLE[tab]];\n      if (tab === 'Kontrak') { a = a ? [a] : []; z = z ? [z] : []; }\n      var peta = {}; (a || []).forEach(function (r) { peta[r[key]] = JSON.stringify(r); });\n      (z || []).forEach(function (r) {\n        if (!(r[key] in peta)) (out.tambah[tab] = out.tambah[tab] || []).push(r);\n        else if (peta[r[key]] !== JSON.stringify(r)) (out.ubah[tab] = out.ubah[tab] || []).push(r);\n      });\n    });\n    return out;\n  }\n\n  // ------------------------------------------------------------------ upload Excel (§11.0)\n  var KOL_UPLOAD = { no: ['no kontrak', 'nomor kontrak', 'no wo/spk/kl'], judul: ['judul kontrak', 'judul'], jenis: ['jenis dok'], tahun: ['tahun project', 'tahun'],\n    pop: ['populasi', 'pop'], pel: ['customer', 'direct customer'], end: ['end customer', 'nama pelanggan', 'pelanggan'], seg: ['segment', 'seg'], nilai: ['nilai kontrak', 'nilai'],\n    lok: ['jumlah lokasi'], pic: ['pic'], doc: ['dok tagih bast-1', 'dok tagih'], tahap: ['tahap awal bast-1', 'tahap awal', 'tahap'], tgl: ['tgl masuk tahap', 'tanggal masuk tahap'],\n    kend: ['kendala'], ket: ['keterangan kendala'], cat: ['catatan'] };\n  var KOL_SO = { no: ['no kontrak', 'nomor kontrak'], j: ['jenis'], ono: ['no order'], lay: ['jenis layanan'], pek: ['jenis pekerjaan'], lok: ['jumlah lokasi'], ket: ['keterangan'] };\n  function hNorm(h) { return s(h).toLowerCase().replace(/\\*/g, '').replace(/\\./g, '').replace(/[^a-z0-9\\/-]+/g, ' ').trim(); }\n  function petaKolom(header, def) {\n    var m = {}, hs = header.map(hNorm);\n    Object.keys(def).forEach(function (f) { var i = hs.findIndex(function (h) { return def[f].map(hNorm).indexOf(h) >= 0; }); if (i >= 0) m[f] = i; });\n    return m;\n  }\n  /** aoa (baris pertama = header) → objek per baris dengan nomor baris Excel. */\n  function barisDariAoa(aoa, def) {\n    var m = petaKolom(aoa[0] || [], def);\n    if (m.no === undefined) return null;\n    var out = [];\n    for (var i = 1; i < aoa.length; i++) {\n      var row = aoa[i] || [], o = { baris: i + 1 }, isi = false;\n      Object.keys(m).forEach(function (f) { var v = row[m[f]]; o[f] = v === undefined || v === null ? '' : v; if (s(v).trim() !== '') isi = true; });\n      if (isi) out.push(o);\n    }\n    return out;\n  }\n  function cariRef(list, v) { v = t(v).toLowerCase(); return (list || []).filter(function (x) { return x.Aktif && (x.Kode.toLowerCase() === v || x.Label.toLowerCase() === v); })[0] || null; }\n\n  /**\n   * Periksa baris upload. ctx: {ref, cfg, cariNomor(normKey) → {KontrakID, NoKontrak, viaAlias, lokasi} | null, pic[] (alias PIC aktif),\n   *   bolehPic, alias (PIC user), hariIni ('yyyy-MM-dd')}\n   */\n  function periksaUpload(rows, ctx) {\n    var seen = {};\n    return rows.map(function (r) {\n      var o = { baris: r.baris, err: [], warn: [], info: [], st: 'baru' }, v = function (f) { return t(r[f]); };\n      o.no = v('no'); o.judul = v('judul');\n      if (!o.no) { o.err.push('No. kontrak kosong'); o.st = 'error'; return o; }\n      var nk = normKey(o.no);\n      if (seen[nk]) o.err.push('Nomor sama dengan baris ' + seen[nk] + ' di file ini'); else seen[nk] = r.baris;\n      var ada = ctx.cariNomor(nk);\n      o.ada = ada || null;\n      if (ada && ada.lokasi && ada.lokasi !== 'AKTIF') o.info.push('Kontrak ini sudah CLOSE dan tersimpan di arsip ' + ada.lokasi.replace('ARSIP_', '') + '; tidak diubah lewat upload');\n      if (!ada && !o.judul) o.err.push('Judul kontrak wajib diisi');\n      o.jenis = v('jenis');\n      if (o.jenis) { var jd = cariRef(ctx.ref.jenisDok, o.jenis); if (!jd) { o.warn.push('Jenis dok \"' + o.jenis + '\" tidak dikenal, ditebak dari nomor'); o.jenis = ''; } else o.jenis = jd.Kode; }\n      if (!o.jenis && !ada) { o.jenis = tebakJenisDok(o.no); if (o.jenis) o.info.push('Jenis dok ditebak: ' + o.jenis); else o.warn.push('Jenis dok tidak bisa ditebak, dikosongkan'); }\n      o.tahun = v('tahun'); if (/^\\d{4}\\.0+$/.test(o.tahun)) o.tahun = o.tahun.slice(0, 4);\n      if (o.tahun && !/^(19|20)\\d\\d$/.test(o.tahun)) { o.warn.push('Tahun \"' + o.tahun + '\" tidak valid, dikosongkan'); o.tahun = ''; }\n      ['pop:populasi:Populasi', 'seg:segment:Segment'].forEach(function (x) {\n        var p = x.split(':'), val = v(p[0]);\n        if (!val) { o[p[0]] = ''; return; }\n        var rf = cariRef(ctx.ref[p[1]], val);\n        if (!rf) { o.warn.push(p[2] + ' \"' + val + '\" belum ada di Referensi, dikosongkan'); o[p[0]] = ''; } else o[p[0]] = rf.Kode;\n      });\n      o.pel = v('pel'); o.end = v('end');\n      var n = bacaRupiah(r.nilai); if (n.e) o.err.push('Nilai kontrak \"' + v('nilai') + '\" bukan angka'); else o.nilai = n.v;\n      o.lok = v('lok'); if (/^\\d+\\.0+$/.test(o.lok)) o.lok = o.lok.split('.')[0];\n      if (o.lok !== '' && !(/^\\d+$/.test(o.lok) && +o.lok >= 1)) o.err.push('Jumlah lokasi \"' + o.lok + '\" harus bilangan bulat ≥ 1');\n      o.pic = v('pic');\n      if (!ctx.bolehPic) { if (o.pic && o.pic !== ctx.alias) o.warn.push('Kolom PIC diabaikan (butuh izin pic.atur); PIC sementara = Anda'); o.pic = ada ? '' : t(ctx.alias); }\n      else if (o.pic) { var pc = (ctx.pic || []).filter(function (x) { return x.toLowerCase() === o.pic.toLowerCase(); })[0]; if (!pc) { o.warn.push('PIC \"' + o.pic + '\" tidak ada di Users → kontrak tanpa PIC'); o.pic = ''; } else o.pic = pc; }\n      o.doc = v('doc').toUpperCase();\n      if (o.doc && !cariRef(ctx.ref.dokTagih, o.doc) && o.doc !== 'BAST' && o.doc !== 'BAA') o.err.push('Dok tagih \"' + v('doc') + '\" tidak dikenal (BAST atau BAA)');\n      var tv = v('tahap'), tp = tv ? ctx.ref.tahap.filter(function (x) { return x.Aktif && (x.Label.toLowerCase() === tv.toLowerCase() || x.Kode.toLowerCase() === tv.toLowerCase()); })[0] : ctx.ref.T[tahapPertama(ctx.ref)];\n      if (!tp) o.err.push('Tahap \"' + tv + '\" tidak ada. Pilihan: ' + ctx.ref.tahap.filter(function (x) { return x.Aktif; }).map(function (x) { return x.Label; }).join(', ')); else o.tahap = tp.Kode;\n      var tg = bacaTanggal(r.tgl);\n      if (tg.e) o.err.push('Tgl masuk tahap \"' + v('tgl') + '\" tidak terbaca');\n      else if (tg.v && ctx.hariIni && tg.v > ctx.hariIni) o.err.push('Tgl masuk tahap tidak boleh di masa depan');\n      else o.tgl = tg.v;\n      var kv = v('kend'); o.ket = v('ket');\n      if (kv) {\n        var kj = ctx.ref.kendala.filter(function (x) { return x.Aktif && (x.Label.toLowerCase() === kv.toLowerCase() || x.Kode.toLowerCase() === kv.toLowerCase()); })[0];\n        if (!kj) o.err.push('Kendala \"' + kv + '\" tidak ada. Pilihan: ' + ctx.ref.kendala.filter(function (x) { return x.Aktif; }).map(function (x) { return x.Label; }).join(', '));\n        else { o.kend = kj.Kode; if (kj.WajibKeterangan && !o.ket) o.err.push('Keterangan kendala wajib diisi bila Kendala diisi'); }\n      }\n      o.cat = v('cat');\n      if (!ada) {\n        o.jc = jenisCustomer(o.pel, o.end);\n        if (!o.pel) o.warn.push('Customer kosong → jenis customer BELUM TERDEFINISI (masuk \"Data belum lengkap\")');\n        if (!o.end) o.warn.push('End customer kosong → jenis customer BELUM TERDEFINISI');\n        o.docFinal = o.doc || dokDefault(o.jc, ctx.cfg);\n      }\n      o.st = o.err.length ? 'error' : ada ? 'ada' : o.warn.length ? 'peringatan' : 'baru';\n      return o;\n    });\n  }\n  var LABEL_UP = { judul: 'JudulKontrak', jenis: 'JenisDok', tahun: 'TahunProject', pop: 'Populasi', pel: 'NamaPelanggan', end: 'EndCustomer', seg: 'Segment', nilai: 'NilaiKontrak', lok: 'JumlahLokasi', pic: 'PIC' };\n  /** Mode \"Perbarui\": kolom yang diisi dan berbeda saja. */\n  function perubahanUpload(o, k) {\n    if (!k) return [];\n    var ch = [];\n    Object.keys(LABEL_UP).forEach(function (f) { var v = o[f]; if (v === '' || v === undefined || v === null) return; var c = LABEL_UP[f]; if (s(v) !== s(k[c])) ch.push([c, s(k[c]), s(v)]); });\n    return ch;\n  }\n  function periksaSO(so, rows, cariNomor) {\n    var ok = {}, err = {}, seenO = {};\n    rows.forEach(function (o) { var nk = normKey(o.no); if (o.st !== 'error') ok[nk] = o; });\n    rows.forEach(function (o) { var nk = normKey(o.no); if (o.st === 'error' && o.no && !ok[nk] && !err[nk]) err[nk] = o.baris; });\n    return so.map(function (r) {\n      var x = { baris: r.baris, no: t(r.no), j: t(r.j).toUpperCase(), ono: t(r.ono), lay: t(r.lay), pek: t(r.pek), lok: t(r.lok).replace(/\\.0+$/, ''), ket: t(r.ket), err: [] }, nk = normKey(x.no);\n      if (!x.no) x.err.push('No. kontrak kosong');\n      else if (err[nk]) x.err.push('Kontraknya error di baris ' + err[nk] + ' tab Kontrak, ikut tidak disimpan');\n      else if (!ok[nk] && !cariNomor(nk)) x.err.push('No. kontrak tidak ada di tab Kontrak maupun di SKM');\n      if (x.j !== 'SO' && x.j !== 'MI') x.err.push('Jenis \"' + t(r.j) + '\" harus SO atau MI');\n      if (!x.ono) x.err.push('No. order kosong');\n      else { var on = normKey(x.ono); if (seenO[on]) x.err.push('No. order sama dengan baris ' + seenO[on]); else seenO[on] = x.baris; }\n      if (x.lok !== '' && !/^\\d+$/.test(x.lok)) x.err.push('Jumlah lokasi harus angka');\n      x.st = x.err.length ? 'error' : 'ok'; x.kontrak = ok[nk] || null;\n      return x;\n    });\n  }\n\n  return {\n    s: s, t: t, bool: bool, num: num, salin: salin, galat: galat, normKey: normKey, normCust: normCust, jenisCustomer: jenisCustomer, LABEL_JC: LABEL_JC,\n    dokDefault: dokDefault, siapkanRef: siapkanRef, tahapPertama: tahapPertama, penutup: penutup, bastClose: bastClose, hidup: hidup, cakupan: cakupan,\n    statusKontrak: statusKontrak, tahapKontrak: tahapKontrak, bastOpen: bastOpen, hariSejak: hariSejak, bucket: bucket, kendalaAktif: kendalaAktif,\n    evalPush: evalPush, celahAturan: celahAturan, turunan: turunan, terapkanTurunan: terapkanTurunan, KOL_TURUNAN: KOL_TURUNAN, fieldKurang: fieldKurang,\n    bacaRupiah: bacaRupiah, bacaTanggal: bacaTanggal, tebakJenisDok: tebakJenisDok, FIELD_KONTRAK: FIELD_KONTRAK, LABEL: LABEL,\n    jalankan: jalankan, beda: beda, KUNCI_TAB: KUNCI_TAB, TAB_BUNDLE: TAB_BUNDLE,\n    KOL_UPLOAD: KOL_UPLOAD, KOL_SO: KOL_SO, petaKolom: petaKolom, barisDariAoa: barisDariAoa, periksaUpload: periksaUpload, perubahanUpload: perubahanUpload, periksaSO: periksaSO\n  };\n})();\nif (typeof module !== 'undefined') module.exports = KD;\n/* ================= Status Kontrak Manager · UI F1 ================= */\n'use strict';\n\nconst S = {\n  token: null, me: null, app: null, katalog: [], theme: 'system', page: 'beranda',\n  users: null, roles: null, uf: '', uq: '', logF: { user: '', aksi: '', hasil: '' }, roleDraft: null,\n  form: null, formOrig: null, formErr: '', permAnim: false, loginErr: null, gantiErr: '', pw1: '', pw2: '', pwLama: ''\n};\nconst store = {\n  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },\n  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }\n};\nS.token = store.get('skm-token');\nS.theme = store.get('skm-theme') || 'system';\nfunction applyTheme() { const r = document.documentElement; S.theme === 'system' ? r.removeAttribute('data-theme') : r.setAttribute('data-theme', S.theme); }\napplyTheme();\n\nconst can = p => !!(S.me && S.me.izin && S.me.izin.indexOf(p) >= 0);\nconst $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);\n\n/* ---------------- panggilan server ---------------- */\nfunction call(aksi, payload) {\n  return new Promise((resolve, reject) => {\n    if (!window.google || !google.script || !google.script.run) {\n      reject({ kode: 'TANPA_SERVER', pesan: 'Halaman ini harus dibuka lewat URL web app.' }); return;\n    }\n    google.script.run\n      .withSuccessHandler(r => {\n        if (r && r.ok) { resolve(r.data); return; }\n        r = r || { kode: 'ERROR', pesan: 'Tidak ada jawaban dari server.' };\n        if (r.kode === 'SESI_HABIS' && S.me) sesiHabis(r.pesan);\n        else if (r.kode === 'WAJIB_GANTI' && S.me) { S.me.wajibGanti = true; go('ganti'); }\n        reject(r);\n      })\n      .withFailureHandler(e => reject({ kode: 'JARINGAN', pesan: 'Tidak bisa menghubungi server: ' + (e && e.message || e) }))\n      .api(S.token, aksi, payload || {});\n  });\n}\n/** Tombol sibuk: label diganti \"Menyimpan…\" + putaran kecil, supaya jelas permintaan sedang diproses. */\nfunction busy(btn, on, teks) {\n  if (!btn) return;\n  if (on && !btn.classList.contains('busy')) { btn.dataset.lbl = btn.innerHTML; btn.innerHTML = `<span class=\"bspin\" aria-hidden=\"true\"></span>${teks || 'Menyimpan…'}`; }\n  if (!on && btn.classList.contains('busy') && btn.dataset.lbl !== undefined) btn.innerHTML = btn.dataset.lbl;\n  btn.classList.toggle('busy', on); btn.disabled = on;\n}\nfunction gagal(e) { if (e && e.kode !== 'SESI_HABIS' && e.kode !== 'WAJIB_GANTI') toast(e.pesan || String(e), true); }\nfunction sesiHabis(pesan) {\n  S.me = null; S.token = null; store.set('skm-token', null); closeSheet(true); closeMenu();\n  document.getElementById('overlay-root').innerHTML = '';\n  S.loginErr = { msg: esc(pesan || 'Sesi Anda berakhir. Silakan masuk lagi.'), kind: 'info' };\n  go('login');\n}\n\n/* ---------------- boot & navigasi ---------------- */\nasync function boot() {\n  try {\n    const b = await call('boot');   // satu panggilan: status + profil (bila token masih sah) + katalog\n    S.app = b.app; S.katalog = b.katalog;\n    if (!b.siap) { renderBelumSetup(); return; }\n    S.me = b.user || null;\n    if (!S.me && S.token) { S.token = null; store.set('skm-token', null); }\n    go(S.me ? (S.me.wajibGanti ? 'ganti' : 'beranda') : 'login');\n  } catch (e) { renderFatal(e.pesan || String(e)); }\n}\nfunction go(page) { S.page = page; closeMenu(); render(); window.scrollTo(0, 0); }\n/** Profil terbaru dari jawaban server. Bila izin user.kelola hilang, pindah ke beranda. */\nfunction pakaiMe(me) {\n  if (!me) return;\n  S.me = me;\n  const P = PAGES[S.page];\n  if (P && P.izin && !can(P.izin)) { go('beranda'); return; }\n  // perbarui menu samping & nama di header saja; isi halaman tidak dimuat ulang\n  const side = $('#side'), meBtn = $('#meBtn');\n  if (!side || !meBtn) return;\n  const t = document.createElement('div'); t.innerHTML = shell('', '');\n  side.replaceWith(t.querySelector('#side')); meBtn.replaceWith(t.querySelector('#meBtn'));\n  bindShell();\n}\n\nconst PAGES = {\n  beranda: { title: () => 'Selamat datang, ' + S.me.nama, crumb: 'Fondasi aplikasi (F1)' },\n  users: { title: () => 'Users', crumb: 'Akun tim FF', izin: 'user.kelola' },\n  role: { title: () => 'Role & izin', crumb: 'Hak akses berupa data, bisa diubah tanpa ubah kode', izin: 'user.kelola' },\n  sistem: { title: () => 'Sistem', crumb: 'Database, skema, dan kesehatan aplikasi', izin: 'user.kelola' },\n  log: { title: () => can('log.semua') ? 'Log' : 'Log saya', crumb: () => can('log.semua') ? 'Semua aksi, hanya ditambah' : 'Aksi yang Anda lakukan' }\n};\nconst SOON = [['dashboard', 'Dashboard', 'dash', 'F3'], ['kontrak', 'Kontrak', 'doc', 'F2'], ['perhatian', 'Perlu Perhatian', 'warn', 'F3'], ['antrian', 'Antrian', 'inbox', 'F4b'], ['gsheet', 'Google Sheet', 'sync', 'F4a']];\n\nfunction render() {\n  const root = document.getElementById('root');\n  if (S.page === 'login' || !S.me) { root.innerHTML = viewLogin(); bindLogin(); return; }\n  if (S.page === 'ganti' || S.me.wajibGanti) { S.page = 'ganti'; root.innerHTML = viewGanti(); bindGanti(); return; }\n  const P = PAGES[S.page] || PAGES.beranda;\n  root.innerHTML = shell(P.title(), typeof P.crumb === 'function' ? P.crumb() : P.crumb);\n  bindShell();\n  loadPage(S.page);\n}\nasync function loadPage(page) {\n  const c = document.getElementById('content');\n  const show = html => {\n    if (S.page !== page || !c.isConnected) return;\n    c.innerHTML = html; [...c.children].forEach((el, i) => el.style.setProperty('--i', i));\n    if (!REDUCED) { c.classList.add('enter'); setTimeout(() => c.classList.remove('enter'), 1400); }\n  };\n  try {\n    if (page === 'beranda') { show(viewHome()); return; }\n    c.innerHTML = '<div class=\"loading\"><div class=\"spinner\"></div>Memuat…</div>';\n    if (page === 'users') { S.users = await call('users.list'); show(viewUsers()); bindUsers(); }\n    else if (page === 'role') { S.roles = await call('roles.list'); S.roleDraft = null; show(viewRole()); bindRole(); }\n    else if (page === 'sistem') { S.sistem = await call('sistem.info'); show(viewSistem()); bindSistem(); }\n    else if (page === 'log') { S.log = await call('log.list', S.logF); show(viewLog()); bindLog(); }\n  } catch (e) {\n    if (e.kode === 'IZIN_DITOLAK') show(viewDenied(e.pesan));\n    else if (e.kode !== 'SESI_HABIS' && e.kode !== 'WAJIB_GANTI') show(`<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(e.pesan || String(e))}</span></div>`);\n  }\n}\n\n/* ---------------- layar khusus ---------------- */\nfunction renderBelumSetup() {\n  document.getElementById('root').innerHTML = `<div class=\"boot\"><div class=\"card\" style=\"max-width:520px;text-align:left;display:flex;flex-direction:column;gap:12px\">\n    <div class=\"brand\" style=\"padding:0\">${LOGO}<div><b>${esc(S.app ? S.app.nama : 'Status Kontrak Manager')}</b><span>Belum siap dipakai</span></div></div>\n    <div class=\"note warn\">${ic('db', 's')}<span class=\"tx\">Database belum dibuat. Buka editor Apps Script, pilih fungsi <span class=\"mono\">setup</span>, lalu klik <b>Run</b>. Setelah selesai, muat ulang halaman ini.</span></div></div></div>`;\n}\nfunction renderFatal(msg) {\n  document.getElementById('root').innerHTML = `<div class=\"boot\"><div class=\"card\" style=\"max-width:520px;text-align:left\"><h2>Aplikasi tidak bisa dimuat</h2><div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(msg)}</span></div><button class=\"btn\" onclick=\"location.reload()\" style=\"margin-top:12px\">Coba lagi</button></div></div>`;\n}\n\n/* ---------------- shell ---------------- */\nconst avatarOf = u => `<span class=\"av\">${esc(String(u.nama || u.username || '?')[0].toUpperCase())}</span>`;\nfunction shell(title, crumb) {\n  const a = (h, l, i) => `<a href=\"#\" data-go=\"${h}\" class=\"${S.page === h ? 'on' : ''}\">${ic(i)}<span>${l}</span></a>`;\n  const soon = ([h, l, i, f]) => `<a class=\"soon\" aria-disabled=\"true\" title=\"Dibangun di ${f}\">${ic(i)}<span>${l}</span><span class=\"cnt\">${f}</span></a>`;\n  return `<div class=\"app\">\n   <aside class=\"side\" id=\"side\">\n    <div class=\"brand\">${LOGO}<div><b>Status Kontrak<br>Manager</b><span>Unit Fulfillment</span></div></div>\n    <nav class=\"nav\">${a('beranda', 'Beranda', 'home')}${SOON.map(soon).join('')}\n     ${can('user.kelola') ? `<div class=\"eyebrow\" style=\"padding:16px 12px 6px;font-size:10.5px\">Pengaturan</div>${a('users', 'Users', 'users')}${a('role', 'Role & izin', 'shield')}${a('sistem', 'Sistem', 'db')}` : ''}\n     <div style=\"height:8px\"></div>${a('log', can('log.semua') ? 'Log' : 'Log saya', 'log')}</nav>\n    <div class=\"side-foot\"><span class=\"live\"><span class=\"pulse\"></span>Versi ${esc(S.app.versi)} · ${esc(S.app.fase)}</span><span>Skema database v${S.app.skema}</span><span class=\"dim\">Menu redup dibangun di fase berikutnya</span></div>\n   </aside>\n   <div class=\"main\">\n    <header class=\"top\">\n     <button class=\"iconbtn burger\" id=\"burger\" aria-label=\"Menu\">${ic('menu')}</button>\n     <div style=\"min-width:0\"><h1>${esc(title)}</h1><div class=\"crumb\">${esc(crumb)}</div></div>\n     <div class=\"sp\"></div>\n     <button class=\"iconbtn\" id=\"themeBtn\" aria-label=\"Ganti tema\" title=\"Ganti tema\">${ic({ system: 'auto', light: 'sun', dark: 'moon' }[S.theme])}</button>\n     <button class=\"me\" id=\"meBtn\">${avatarOf(S.me)}<span class=\"nm\">${esc(S.me.nama)} · ${esc(S.me.role)}</span></button>\n    </header>\n    <main class=\"content\" id=\"content\"></main>\n   </div></div>`;\n}\nfunction bindShell() {\n  $('#burger').onclick = e => { e.stopPropagation(); $('#side').classList.toggle('open'); };\n  $('#themeBtn').onclick = e => cycleTheme(e);\n  $$('[data-go]').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.go); });\n  $('#meBtn').onclick = () => modal(esc(S.me.nama) + ' · ' + esc(S.me.role),\n    `<dl class=\"kv\"><dt>Username</dt><dd class=\"mono\">${esc(S.me.username)}</dd><dt>Alias PIC</dt><dd>${esc(S.me.alias) || '—'}</dd><dt>Sesi</dt><dd>berakhir setelah ${S.app.sesiJam} jam tanpa aktivitas</dd></dl>`,\n    [{ l: 'Ganti password', fn: () => { S.pw1 = S.pw2 = S.pwLama = ''; S.gantiErr = ''; go('ganti'); } },\n     { l: 'Keluar', pri: true, fn: () => { call('logout').catch(() => {}); S.me = null; S.token = null; store.set('skm-token', null); S.loginErr = null; go('login'); } }]);\n}\nfunction cycleTheme(e) {\n  const order = ['system', 'light', 'dark'], next = order[(order.indexOf(S.theme) + 1) % 3];\n  const apply = () => { S.theme = next; applyTheme(); store.set('skm-theme', next); const b = $('#themeBtn'); if (b) b.innerHTML = ic({ system: 'auto', light: 'sun', dark: 'moon' }[next]); };\n  if (!document.startViewTransition || REDUCED) { apply(); return; }\n  const x = e.clientX, y = e.clientY, r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));\n  document.startViewTransition(apply).ready.then(() => document.documentElement.animate(\n    { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },\n    { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});\n}\n\n/* ---------------- login & ganti password ---------------- */\nfunction orbit() {\n  const ts = ['Kompulir', 'Drafting', 'Review', 'Sirkulir', 'BAST Done', 'Takeout'], cx = 310, cy = 300, rx = 250, ry = 96;\n  const ep = `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0`;\n  return `<svg class=\"orb\" viewBox=\"0 0 620 600\" aria-hidden=\"true\"><defs><radialGradient id=\"pl\" cx=\".35\" cy=\".3\"><stop offset=\"0\" stop-color=\"var(--accent-hi)\"/><stop offset=\".6\" stop-color=\"var(--accent)\"/><stop offset=\"1\" stop-color=\"var(--violet)\"/></radialGradient></defs><g transform=\"rotate(-12 ${cx} ${cy})\"><ellipse class=\"ring\" cx=\"${cx}\" cy=\"${cy}\" rx=\"${rx}\" ry=\"${ry}\"/><ellipse class=\"ring d\" cx=\"${cx}\" cy=\"${cy}\" rx=\"${rx * .66}\" ry=\"${ry * .62}\"/><circle cx=\"${cx}\" cy=\"${cy}\" r=\"52\" fill=\"url(#pl)\" style=\"filter:drop-shadow(0 0 40px var(--glow))\"/>${ts.map((t, i) => { const a = Math.PI * (1 + i * 1.9 / 5), x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a); return `<circle class=\"nd ${i === 5 ? 'ok' : ''}\" cx=\"${x.toFixed(1)}\" cy=\"${y.toFixed(1)}\" r=\"7\"/><text x=\"${x.toFixed(1)}\" y=\"${(y + (Math.sin(a) > 0.05 ? 26 : -16)).toFixed(1)}\" text-anchor=\"middle\">${t}</text>`; }).join('')}${REDUCED ? '' : `<circle class=\"sat\" r=\"4.5\"><animateMotion dur=\"16s\" repeatCount=\"indefinite\" path=\"${ep}\"/></circle>`}</g></svg>`;\n}\nconst art = () => `<div class=\"login-art\"><div class=\"brand\" style=\"padding:0;position:relative\">${LOGO}<div><b>${esc(S.app.nama)}</b><span>Unit Fulfillment</span></div></div>${orbit()}<h2>Status BAST di satu tempat. <em>Semua sheet unit ikut seragam.</em></h2></div>`;\n\nfunction viewLogin() {\n  const e = S.loginErr;\n  return `<div class=\"login\">${art()}<div class=\"login-form\"><form class=\"box\" id=\"lform\" novalidate>\n   <div><div class=\"eyebrow\">Masuk</div><h3>Selamat datang</h3></div>\n   ${e ? `<div class=\"note ${e.kind}\">${ic(e.kind === 'crit' ? 'lock' : e.kind === 'info' ? 'person' : 'warn', 's')}<span class=\"tx\">${e.msg}</span></div>` : ''}\n   <label class=\"of\"><span>Username</span><input class=\"inp\" id=\"lu\" value=\"${esc(e && e.u || '')}\" autocomplete=\"username\" autocapitalize=\"none\" spellcheck=\"false\"></label>\n   <label class=\"of\"><span>Password</span><input class=\"inp\" id=\"lp\" type=\"password\" autocomplete=\"current-password\"><small>Lupa password? Minta admin FF untuk mereset.</small></label>\n   <button class=\"btn pri\" type=\"submit\" id=\"lbtn\" style=\"justify-content:center;padding:12px\">Masuk</button>\n   <div class=\"row\" style=\"justify-content:space-between\"><span class=\"dim\" style=\"font-size:12px\">v${esc(S.app.versi)}</span><button type=\"button\" class=\"iconbtn\" id=\"lgTheme\" aria-label=\"Ganti tema\">${ic({ system: 'auto', light: 'sun', dark: 'moon' }[S.theme])}</button></div>\n  </form></div></div>`;\n}\nfunction bindLogin() {\n  setTimeout(() => (($('#lu').value ? $('#lp') : $('#lu')) || {}).focus && ($('#lu').value ? $('#lp') : $('#lu')).focus(), 50);\n  $('#lgTheme').onclick = e => { cycleTheme(e); setTimeout(() => { const b = $('#lgTheme'); if (b) b.innerHTML = ic({ system: 'auto', light: 'sun', dark: 'moon' }[S.theme]); }, 30); };\n  $('#lform').onsubmit = async ev => {\n    ev.preventDefault();\n    const u = $('#lu').value.trim(), p = $('#lp').value, btn = $('#lbtn');\n    if (!u || !p) { S.loginErr = { msg: 'Isi username dan password.', kind: 'warn', u }; render(); return; }\n    busy(btn, true, 'Masuk…');\n    try {\n      const r = await call('login', { username: u, password: p });\n      S.token = r.token; store.set('skm-token', r.token); S.me = r.user; S.app = r.app; S.katalog = r.katalog; S.loginErr = null;\n      S.pw1 = S.pw2 = S.pwLama = ''; S.gantiErr = '';\n      go(r.user.wajibGanti ? 'ganti' : 'beranda');\n    } catch (e) {\n      S.loginErr = { msg: esc(e.pesan || String(e)), kind: e.kode === 'TERKUNCI' || e.kode === 'AKUN_NONAKTIF' ? 'crit' : 'warn', u };\n      render();\n    }\n  };\n}\n\nfunction pwRules() {\n  const a = S.pw1, b = S.pw2, min = S.app.passwordMin || 8;\n  const r = [[a.length >= min, 'Minimal ' + min + ' karakter'], [/[A-Za-z]/.test(a) && /\\d/.test(a), 'Berisi huruf dan angka'], [!!a && a === b, 'Kedua isian sama']];\n  if (!S.me.wajibGanti) r.splice(2, 0, [!!a && a !== S.pwLama, 'Berbeda dari password lama']);\n  return r;\n}\nfunction rulesHtml() { return pwRules().map(([y, t]) => `<span class=\"${y ? 'ok' : ''}\"><i>${y ? '✓' : ''}</i>${t}</span>`).join(''); }\nfunction viewGanti() {\n  const wajib = S.me.wajibGanti, ok = pwRules().every(x => x[0]);\n  return `<div class=\"login\">${art()}<div class=\"login-form\"><form class=\"box\" id=\"gform\" novalidate>\n   <div><div class=\"eyebrow\">${wajib ? 'Login pertama' : 'Ganti password'}</div><h3>Buat password baru</h3></div>\n   ${wajib ? `<div class=\"note info\">${ic('key', 's')}<span class=\"tx\">Halo <b>${esc(S.me.nama)}</b>, password sementara harus diganti sebelum masuk ke aplikasi.</span></div>` : ''}\n   ${S.gantiErr ? `<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(S.gantiErr)}</span></div>` : ''}\n   ${wajib ? '' : `<label class=\"of\"><span>Password lama</span><input class=\"inp\" type=\"password\" id=\"pw0\" value=\"${esc(S.pwLama)}\" autocomplete=\"current-password\"></label>`}\n   <label class=\"of\"><span>Password baru</span><input class=\"inp\" type=\"password\" id=\"pw1\" value=\"${esc(S.pw1)}\" autocomplete=\"new-password\"></label>\n   <label class=\"of\"><span>Ulangi password baru</span><input class=\"inp\" type=\"password\" id=\"pw2\" value=\"${esc(S.pw2)}\" autocomplete=\"new-password\"></label>\n   <div class=\"rules\" id=\"rules\">${rulesHtml()}</div>\n   <button class=\"btn pri\" type=\"submit\" id=\"gsave\" style=\"justify-content:center;padding:12px\" ${ok ? '' : 'disabled'}>${wajib ? 'Simpan &amp; masuk' : 'Simpan password'}</button>\n   ${wajib ? `<button type=\"button\" class=\"btn ghost sm\" id=\"gout\" style=\"align-self:flex-start\">Keluar</button>` : `<button type=\"button\" class=\"btn ghost sm\" id=\"gback\" style=\"align-self:flex-start\">Batal</button>`}\n  </form></div></div>`;\n}\nfunction bindGanti() {\n  const upd = () => {\n    S.pw1 = $('#pw1').value; S.pw2 = $('#pw2').value; if ($('#pw0')) S.pwLama = $('#pw0').value;\n    $('#rules').innerHTML = rulesHtml(); $('#gsave').disabled = !pwRules().every(x => x[0]);\n  };\n  ['pw0', 'pw1', 'pw2'].forEach(id => { const el = document.getElementById(id); if (el) el.oninput = upd; });\n  setTimeout(() => ($('#pw0') || $('#pw1')).focus(), 50);\n  if ($('#gback')) $('#gback').onclick = () => go('beranda');\n  if ($('#gout')) $('#gout').onclick = () => { call('logout').catch(() => {}); S.me = null; S.token = null; store.set('skm-token', null); go('login'); };\n  $('#gform').onsubmit = async ev => {\n    ev.preventDefault();\n    if (!pwRules().every(x => x[0])) return;\n    const btn = $('#gsave'); busy(btn, true);\n    try {\n      const r = await call('gantiPassword', { lama: S.pwLama, baru: S.pw1 });\n      S.me = Object.assign(S.me, r.user); S.pw1 = S.pw2 = S.pwLama = ''; S.gantiErr = '';\n      go('beranda'); toast('Password diganti. Password lama tidak berlaku lagi.');\n    } catch (e) { S.gantiErr = e.pesan || String(e); render(); }\n  };\n}\n\n/* ---------------- beranda ---------------- */\nfunction viewHome() {\n  const done = ['Database & migrasi skema otomatis', 'Login, sesi ' + S.app.sesiJam + ' jam, kunci akun setelah salah password berulang', 'Users, Role & izin (dicek di server)', 'Log semua aksi', 'Tema terang/gelap'];\n  const next = [['F2', 'Kontrak, BAST/BAA, tahap, kendala, Nilai Push'], ['F3', 'Import data lama, Dashboard, Perlu Perhatian'], ['F4a', 'Script penerima & update ke sheet unit'], ['F4b', 'Jejak sel, notifikasi, Antrian, sinkron otomatis'], ['F5', 'Export & backup']];\n  return `<div class=\"card hero\" style=\"padding:24px\"><div class=\"row\" style=\"position:relative;align-items:flex-start\"><div style=\"flex:1 1 320px\"><div class=\"eyebrow\">Versi ${esc(S.app.versi)} · fase ${esc(S.app.fase)}</div><h2 style=\"font-size:22px;margin:6px 0\">Fondasi aplikasi sudah berjalan</h2>\n    <p class=\"muted\" style=\"margin:0;max-width:60ch\">${can('user.kelola') ? 'Buat akun untuk setiap anggota tim di menu <b>Users</b>, lalu cek hak aksesnya di <b>Role &amp; izin</b>.' : 'Menu lain akan aktif bertahap sesuai fase.'}</p></div>\n    ${can('user.kelola') ? `<button class=\"btn pri\" data-go2=\"users\">${ic('users', 's')}Kelola users</button>` : ''}</div></div>\n   <div class=\"grid g2\">\n    <div class=\"card\"><h2>Sudah tersedia</h2>${done.map(t => `<div class=\"check\"><span class=\"d y\">✓</span><span>${t}</span></div>`).join('')}</div>\n    <div class=\"card\"><h2>Berikutnya</h2>${next.map(([f, t]) => `<div class=\"check\"><span class=\"d n\">${f}</span><span>${t}</span></div>`).join('')}</div>\n   </div>`;\n}\ndocument.addEventListener('click', e => { const b = e.target.closest('[data-go2]'); if (b) go(b.dataset.go2); });\n\n/* ---------------- users ---------------- */\nconst ROLE_META = { ADMIN: ['shield', 'Akses penuh'], STAFF: ['person', 'Isi & kelola'], VIEWER: ['eye', 'Hanya melihat'] };\nconst roleMeta = r => ROLE_META[r] || ['users', 'Role khusus'];\nconst initials = n => String(n || '').trim().split(/\\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';\nconst RING = { AKTIF: 'on', WAJIB_GANTI: 'pw', TERKUNCI: 'lock', NONAKTIF: 'off' };\nconst stLabel = u => ({ AKTIF: 'Aktif', WAJIB_GANTI: 'Wajib ganti password', TERKUNCI: 'Terkunci s/d ' + u.terkunciSampai, NONAKTIF: 'Nonaktif' })[u.status];\nconst ava = (u, size) => `<span class=\"ava ${RING[u.status] || 'on'}\" ${size ? `style=\"--s:${size}px\"` : ''} title=\"${esc(stLabel(u))}\">${esc(initials(u.nama || u.username))}</span>`;\nconst rbadge = r => `<span class=\"rbadge ${esc(r)}\">${ic(roleMeta(r)[0])}${esc(r)}</span>`;\nfunction stPill(u) { const k = RING[u.status]; return `<span class=\"pill ${{ on: 'p-ok', pw: 'p-warn', lock: 'p-crit', off: 'p-dim' }[k]}\">${k === 'lock' ? ic('lock', 's') : '<span class=\"dot\"></span>'}${esc(stLabel(u))}</span>`; }\nconst UF = [['', 'Semua', u => true], ['ADMIN', 'Admin', u => u.role === 'ADMIN' && u.aktif], ['STAFF', 'Staff', u => u.role === 'STAFF' && u.aktif], ['VIEWER', 'Viewer', u => u.role === 'VIEWER' && u.aktif],\n  ['pw', 'Wajib ganti password', u => u.status === 'WAJIB_GANTI'], ['lock', 'Terkunci', u => u.status === 'TERKUNCI'], ['off', 'Nonaktif', u => !u.aktif]];\nfunction viewUsers() {\n  const list = S.users.users, f = UF.find(x => x[0] === S.uf) || UF[0], q = S.uq.toLowerCase();\n  const rows = list.filter(f[2]).filter(u => !q || (u.username + ' ' + u.nama + ' ' + u.alias).toLowerCase().includes(q));\n  return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:14px\">\n   <div class=\"row\"><div class=\"search\">${ic('search', 's')}<input id=\"uq\" placeholder=\"Cari username, nama, alias PIC…\" aria-label=\"Cari user\" value=\"${esc(S.uq)}\"></div><span class=\"sp\"></span><button class=\"btn pri\" id=\"addUser\">${ic('add', 's')}Tambah user</button></div>\n   <div class=\"row\">${UF.map(([k, l, t]) => `<button class=\"chipf ${S.uf === k ? 'on' : ''}\" data-uf=\"${k}\">${l} <b>${list.filter(t).length}</b></button>`).join('')}</div>\n   <div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>User</th><th>Alias PIC</th><th>Role</th><th>Status</th><th>Login terakhir</th><th style=\"width:48px\"></th></tr></thead><tbody>\n   ${rows.map(u => `<tr class=\"click\" data-row=\"${esc(u.username)}\"><td><div class=\"row\" style=\"flex-wrap:nowrap;gap:12px\">${ava(u)}<div style=\"min-width:0\"><b>${esc(u.nama)}</b>${u.username === S.me.username ? ' <span class=\"pill p-acc\" style=\"font-size:10.5px;padding:0 7px\">Anda</span>' : ''}<div class=\"mono dim\" style=\"font-size:11.5px\">${esc(u.username)}</div></div></div></td>\n    <td>${u.alias ? `<span class=\"pill p-dim\">${esc(u.alias)}</span>` : '<span class=\"dim\">—</span>'}</td><td>${rbadge(u.role)}</td><td>${stPill(u)}</td>\n    <td class=\"tnum muted\">${esc(u.loginTerakhir ? u.loginTerakhir.slice(0, 16) : '—')}</td><td><button class=\"iconbtn\" data-kebab=\"${esc(u.username)}\" aria-label=\"Aksi untuk ${esc(u.nama)}\">${ic('more')}</button></td></tr>`).join('') || '<tr><td colspan=\"6\" class=\"muted\" style=\"text-align:center;padding:28px\">Tidak ada user yang cocok.</td></tr>'}\n   </tbody></table></div>\n   <div class=\"muted\" style=\"font-size:12px\">Username bebas (NIK, nama, atau apa pun) dan menjadi ID tetap. Cincin avatar: hijau aktif, kuning wajib ganti password, merah terkunci, abu-abu nonaktif.</div></div>`;\n}\nfunction rerenderUsers() { const c = document.getElementById('content'); if (!c || S.page !== 'users') return; c.innerHTML = viewUsers(); bindUsers(); }\nasync function reloadUsers() { try { S.users = await call('users.list'); rerenderUsers(); } catch (e) { gagal(e); } }\n/** Pakai daftar user + profil yang dibawa jawaban server (tanpa panggilan tambahan). */\nfunction pakaiDaftarUser(r) { if (r && r.daftar) { S.users = r.daftar; rerenderUsers(); } if (r && r.me) pakaiMe(r.me); }\nfunction bindUsers() {\n  const q = $('#uq');\n  q.oninput = () => { S.uq = q.value; const pos = q.selectionStart; rerenderUsers(); const n = $('#uq'); n.focus(); n.setSelectionRange(pos, pos); };\n  $$('[data-uf]').forEach(b => b.onclick = () => { S.uf = b.dataset.uf; rerenderUsers(); });\n  $('#addUser').onclick = () => openUserSheet(null);\n  const find = un => S.users.users.find(u => u.username === un);\n  $$('[data-kebab]').forEach(b => b.onclick = e => { e.stopPropagation(); openMenu(b, find(b.dataset.kebab)); });\n  $$('tr[data-row]').forEach(tr => tr.onclick = e => { if (e.target.closest('[data-kebab]')) return; openUserSheet(find(tr.dataset.row)); });\n}\nfunction showTempPw(u, pw, judul) {\n  modal(judul, `<div>Berikan password sementara ini ke <b>${esc(u.nama)}</b> (<span class=\"mono\">${esc(u.username)}</span>). Password <b>tidak ditampilkan lagi</b> setelah jendela ini ditutup, dan wajib diganti saat login.</div>\n   <div class=\"secret\"><span id=\"tpw\" style=\"flex:1\">${esc(pw)}</span><button class=\"btn sm ton\" id=\"cpw\">${ic('copy', 's')}Salin</button></div>\n   <div class=\"muted\" style=\"font-size:12px\">Yang disimpan di database hanya hash + salt, bukan passwordnya.</div>`, [{ l: 'Selesai', pri: true }]);\n  setTimeout(() => { const b = document.getElementById('cpw'); if (b) b.onclick = () => copyText(pw, 'Password sementara disalin.', document.getElementById('tpw')); }, 60);\n}\nfunction copyText(t, msg, el) {\n  const pilih = () => { if (!el) { toast('Salin manual: ' + t); return; } const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Teks sudah dipilih, tekan Ctrl+C.'); };\n  try { navigator.clipboard.writeText(t).then(() => toast(msg), pilih); } catch (e) { pilih(); }\n}\n\n/* menu ⋮ */\nfunction closeMenu() { const m = document.querySelector('.menu'); if (m) m.remove(); }\nfunction openMenu(btn, u) {\n  closeMenu();\n  const r = btn.getBoundingClientRect(), m = document.createElement('div'); m.className = 'menu'; m.setAttribute('role', 'menu');\n  const items = [['edit', 'Ubah data & role', '', () => openUserSheet(u)], ['key', 'Reset password', 'Password sementara baru, wajib diganti', () => openUserSheet(u, { reset: true })]];\n  if (u.status === 'TERKUNCI') items.push(['lock', 'Buka kunci', 'Terkunci sampai ' + u.terkunciSampai, () => simple('users.bukaKunci', { username: u.username }, `Kunci akun ${u.username} dibuka.`)]);\n  items.push(['block', u.aktif ? 'Nonaktifkan' : 'Aktifkan lagi', u.aktif ? 'Tidak bisa login; riwayat tetap ada' : '', () => simple('users.aktif', { username: u.username, aktif: !u.aktif }, u.aktif ? `${u.nama} dinonaktifkan. Riwayatnya tetap tersimpan.` : `${u.nama} bisa login lagi.`)]);\n  m.innerHTML = items.map((it, i) => `<button data-mi=\"${i}\" role=\"menuitem\">${ic(it[0])}<span>${it[1]}${it[2] ? `<small>${esc(it[2])}</small>` : ''}</span></button>`).join('') +\n    `<hr><button class=\"danger\" data-mi=\"del\" role=\"menuitem\" ${u.bisaDihapus ? '' : 'disabled'}>${ic('trash')}<span>Hapus user<small>${u.bisaDihapus ? 'Belum pernah beraktivitas' : 'Sudah punya riwayat. Nonaktifkan saja.'}</small></span></button>`;\n  document.getElementById('overlay-root').appendChild(m);\n  m.style.top = Math.max(12, Math.min(r.bottom + 6, innerHeight - m.offsetHeight - 12)) + 'px';\n  m.style.left = Math.max(12, r.right - m.offsetWidth) + 'px';\n  m.addEventListener('click', e => { e.stopPropagation(); const b = e.target.closest('[data-mi]'); if (!b || b.disabled) return; closeMenu(); b.dataset.mi === 'del' ? confirmDelete(u) : items[+b.dataset.mi][3](); });\n  const first = m.querySelector('button'); if (first) first.focus();\n}\nasync function simple(aksi, payload, okMsg) {\n  try { const r = await call(aksi, payload); toast(okMsg); pakaiDaftarUser(r); } catch (e) { modalGagal(e); }\n}\nfunction modalGagal(e) {\n  if (e.kode === 'SESI_HABIS' || e.kode === 'WAJIB_GANTI') return;\n  modal(e.kode === 'ADMIN_TERAKHIR' || e.kode === 'IZIN_DITOLAK' || e.kode === 'PUNYA_RIWAYAT' ? 'Ditolak server' : 'Gagal', `<div class=\"note crit\">${ic('shield', 's')}<span class=\"tx\">${esc(e.pesan || String(e))}</span></div>`, [{ l: 'Mengerti', pri: true }]);\n}\nfunction confirmDelete(u) {\n  modal('Hapus user?', `<div class=\"row\" style=\"flex-wrap:nowrap;gap:14px\">${ava(u, 44)}<div><b>${esc(u.nama)}</b><div class=\"mono dim\">${esc(u.username)}</div></div></div><div class=\"muted\">User ini belum pernah login atau melakukan aksi apa pun, jadi aman dihapus. Pembuatan dan penghapusannya tetap tercatat di Log.</div>`,\n    [{ l: 'Batal' }, { l: 'Hapus', pri: true, fn: () => { closeSheet(true); simple('users.hapus', { username: u.username }, `User ${u.username} dihapus.`); } }]);\n}\n\n/* panel tambah/ubah user */\nfunction openUserSheet(u, opt) {\n  opt = opt || {};\n  S.form = u ? { username: u.username, nama: u.nama, alias: u.alias, role: u.role, aktif: u.aktif, pwOn: !!opt.reset, pwMode: 'acak', pwTyped: '', pwShow: false, version: u.version }\n             : { username: '', nama: '', alias: '', role: 'STAFF', aktif: true, pwOn: true, pwMode: 'acak', pwTyped: '', pwShow: false };\n  S.formOrig = u || null; S.formErr = ''; renderSheet(true);\n  setTimeout(() => { const el = document.querySelector(opt.reset ? '#sheet-root [data-pwmode=\"acak\"]' : u ? '#fn' : '#fu'); if (el) el.focus(); }, 80);\n}\nfunction closeSheet(instant) {\n  const r = document.getElementById('sheet-root'); if (!r.firstChild) return;\n  if (instant || REDUCED) { r.innerHTML = ''; return; }\n  r.firstElementChild.classList.add('closing'); setTimeout(() => { r.innerHTML = ''; }, 300);\n}\nfunction idcardHtml() {\n  const F = S.form, fake = { nama: F.nama || 'Nama user', username: F.username, status: !F.aktif ? 'NONAKTIF' : (F.pwOn || (S.formOrig && S.formOrig.status === 'WAJIB_GANTI')) ? 'WAJIB_GANTI' : (S.formOrig ? S.formOrig.status : 'AKTIF'), terkunciSampai: S.formOrig ? S.formOrig.terkunciSampai : '' };\n  return `${ava(fake, 64)}<div class=\"who\"><b>${esc(F.nama || 'Nama user')}</b><div class=\"mono\" style=\"font-size:12.5px\">${esc(F.username || 'username')}</div>\n   <div class=\"row\" style=\"margin-top:8px;gap:6px\">${rbadge(F.role)}${F.alias ? `<span class=\"pill p-dim\">PIC: ${esc(F.alias)}</span>` : ''}${stPill(fake)}</div></div>`;\n}\nfunction rolePeta() { const m = {}; (S.users.roles || []).forEach(r => { m[r.role] = r.izin; }); return m; }\nfunction permsHtml() { const R = rolePeta()[S.form.role] || []; return (S.users.katalog || []).map(([p, d], i) => `<span class=\"${R.indexOf(p) >= 0 ? '' : 'no'}\" style=\"--i:${i}\" title=\"${p}\">${esc(d)}</span>`).join(''); }\nconst pwScore = p => { let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return Math.min(4, s); };\nconst SCOL = ['var(--crit)', 'var(--crit)', 'var(--warn)', 'var(--ok)', 'var(--ok)'], SLBL = ['lemah', 'lemah', 'cukup', 'kuat', 'sangat kuat'];\nfunction renderSheet(opening) {\n  const F = S.form, O = S.formOrig, isNew = !O, root = document.getElementById('sheet-root');\n  const sc = root.querySelector('.dbody') ? root.querySelector('.dbody').scrollTop : 0, peta = rolePeta(), sco = pwScore(F.pwTyped);\n  root.innerHTML = `<div><div class=\"dscrim\" id=\"sscrim\" style=\"${opening ? '' : 'animation:none'}\"></div>\n  <aside class=\"drawer ussheet\" role=\"dialog\" aria-modal=\"true\" aria-label=\"${isNew ? 'Tambah user' : 'Ubah user'}\" style=\"width:min(580px,100vw);${opening ? '' : 'animation:none'}\">\n   <div class=\"dhead\" style=\"padding-bottom:14px\"><div class=\"dtop\"><button class=\"iconbtn\" id=\"sclose\" aria-label=\"Tutup\">${ic('x')}</button><div><div class=\"eyebrow\">${isNew ? 'User baru' : 'Ubah user'}</div><div style=\"font-weight:800;font-size:18px\">${isNew ? 'Tambah anggota tim' : esc(O.nama)}</div></div></div></div>\n   <div class=\"dbody\">\n    <div class=\"idcard\" id=\"idcard\">${idcardHtml()}</div>\n    <div class=\"sect\"><div class=\"eyebrow\">Identitas</div>\n     <label class=\"of\"><span>Username</span><input class=\"inp mono\" id=\"fu\" value=\"${esc(F.username)}\" ${isNew ? '' : 'disabled'} autocomplete=\"off\" autocapitalize=\"none\" spellcheck=\"false\" placeholder=\"mis. 95210101 atau dina.lestari\"><small>${isNew ? 'NIK, nama, atau apa pun · 3–32 karakter: huruf, angka, titik, garis bawah, strip. Menjadi ID tetap.' : 'ID tetap, tidak bisa diganti.'}</small></label>\n     <div class=\"grid g2\" style=\"gap:14px\"><label class=\"of\"><span>Nama lengkap</span><input class=\"inp\" id=\"fn\" value=\"${esc(F.nama)}\" autocomplete=\"off\" maxlength=\"80\"></label>\n      <label class=\"of\"><span>Alias PIC</span><input class=\"inp\" id=\"fa\" value=\"${esc(F.alias)}\" autocomplete=\"off\" maxlength=\"40\" placeholder=\"mis. Dina\"><small>Nama di kolom PIC sheet lama. Kosongkan bila bukan PIC.</small></label></div></div>\n    <div class=\"sect\"><div class=\"eyebrow\">Role & akses</div>\n     <div class=\"rcards\" role=\"radiogroup\" aria-label=\"Role\">${Object.keys(peta).map(r => { const m = roleMeta(r); return `<button type=\"button\" class=\"rcard ${F.role === r ? 'on' : ''}\" data-role=\"${esc(r)}\" role=\"radio\" aria-checked=\"${F.role === r}\">${ic(m[0])}<b>${esc(r)}</b><small>${m[1]} · ${peta[r].length} izin</small></button>`; }).join('')}</div>\n     <div><div class=\"muted\" style=\"font-size:12px;margin-bottom:8px\">User ini bisa:</div><div class=\"perms ${S.permAnim ? 'anim' : ''}\" id=\"perms\">${permsHtml()}</div></div></div>\n    <div class=\"sect\"><div class=\"eyebrow\">Password</div>\n     ${isNew ? '' : `<div class=\"swrow\"><div style=\"flex:1\"><b>Reset password</b><small>Biarkan mati bila password tidak diganti</small></div><button type=\"button\" class=\"toggle ${F.pwOn ? 'on' : ''}\" id=\"pwOn\" aria-label=\"Reset password\" aria-pressed=\"${F.pwOn}\"></button></div>`}\n     ${F.pwOn ? `<div class=\"seg\" role=\"group\" aria-label=\"Cara membuat password\"><button type=\"button\" data-pwmode=\"acak\" class=\"${F.pwMode === 'acak' ? 'on' : ''}\">Buat acak</button><button type=\"button\" data-pwmode=\"ketik\" class=\"${F.pwMode === 'ketik' ? 'on' : ''}\">Ketik sendiri</button></div>\n      ${F.pwMode === 'acak' ? `<div class=\"note ok\">${ic('key', 's')}<span class=\"tx\">Password acak dibuat server saat disimpan, lalu <b>ditampilkan sekali</b> untuk Anda sampaikan ke user.</span></div>`\n      : `<div><label class=\"of\"><span>Password</span><div style=\"position:relative\"><input class=\"inp mono\" id=\"fpw\" type=\"${F.pwShow ? 'text' : 'password'}\" value=\"${esc(F.pwTyped)}\" autocomplete=\"new-password\" style=\"width:100%;padding:12px 44px 10px 12px\"><button type=\"button\" class=\"iconbtn\" id=\"pwEye\" aria-label=\"${F.pwShow ? 'Sembunyikan' : 'Tampilkan'} password\" style=\"position:absolute;right:2px;top:2px\">${ic('eye', 's')}</button></div></label>\n        <div class=\"strength\"><i id=\"pwBar\" style=\"width:${sco * 25}%;background:${SCOL[sco]}\"></i></div>\n        <div class=\"muted\" style=\"font-size:12px;margin-top:6px\" id=\"pwHint\">Minimal ${S.app.passwordMin} karakter, berisi huruf dan angka.</div></div>`}\n      <div class=\"note info\">${ic('key', 's')}<span class=\"tx\">User <b>wajib mengganti</b> password ini saat login berikutnya${isNew ? '' : ', dan sesi aktifnya diakhiri'}.</span></div>` : ''}\n    </div>\n    ${isNew ? '' : `<div class=\"sect\"><div class=\"eyebrow\">Status</div><div class=\"swrow\"><div style=\"flex:1\"><b>Akun aktif</b><small>User bisa login selama akun aktif</small></div><button type=\"button\" class=\"toggle ${F.aktif ? 'on' : ''}\" id=\"stOn\" aria-label=\"Akun aktif\" aria-pressed=\"${F.aktif}\"></button></div>\n      <div class=\"danger-zone\"><div style=\"flex:1;min-width:200px\"><b style=\"color:var(--crit)\">Hapus user</b><div class=\"muted\" style=\"font-size:12px\">${O.bisaDihapus ? 'Tersedia karena user ini belum pernah login atau melakukan aksi.' : 'Tidak tersedia: user ini sudah punya riwayat. Nonaktifkan saja supaya Log tetap utuh.'}</div></div><button type=\"button\" class=\"btn sm danger\" id=\"delUser\" ${O.bisaDihapus ? '' : 'disabled'}>${ic('trash', 's')}Hapus</button></div></div>`}\n    <div id=\"ferr\">${S.formErr ? `<div class=\"note crit\">${ic('warn', 's')}<span class=\"tx\">${esc(S.formErr)}</span></div>` : ''}</div>\n   </div>\n   <div class=\"sfoot\"><button class=\"btn\" id=\"scancel\">Batal</button><button class=\"btn pri\" id=\"ssave\">${ic('check', 's')}${isNew ? 'Buat user' : 'Simpan'}</button></div>\n  </aside></div>`;\n  root.querySelector('.dbody').scrollTop = sc;\n  bindSheet();\n}\nfunction bindSheet() {\n  const q = s => document.querySelector('#sheet-root ' + s), F = S.form, refresh = () => { q('#idcard').innerHTML = idcardHtml(); };\n  q('#sclose').onclick = q('#scancel').onclick = q('#sscrim').onclick = () => closeSheet();\n  q('#fu').oninput = e => { F.username = e.target.value.trim().toLowerCase(); refresh(); };\n  q('#fn').oninput = e => { F.nama = e.target.value; refresh(); };\n  q('#fa').oninput = e => { F.alias = e.target.value.trim(); refresh(); };\n  document.querySelectorAll('#sheet-root [data-role]').forEach(b => b.onclick = () => { F.role = b.dataset.role; S.permAnim = true; renderSheet(false); S.permAnim = false; });\n  if (q('#pwOn')) q('#pwOn').onclick = () => { F.pwOn = !F.pwOn; renderSheet(false); };\n  if (q('#stOn')) q('#stOn').onclick = () => { F.aktif = !F.aktif; renderSheet(false); };\n  document.querySelectorAll('#sheet-root [data-pwmode]').forEach(b => b.onclick = () => { F.pwMode = b.dataset.pwmode; renderSheet(false); if (F.pwMode === 'ketik') setTimeout(() => q('#fpw') && q('#fpw').focus(), 30); });\n  if (q('#pwEye')) q('#pwEye').onclick = () => { F.pwShow = !F.pwShow; renderSheet(false); setTimeout(() => { const i = q('#fpw'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 20); };\n  if (q('#fpw')) q('#fpw').oninput = e => {\n    F.pwTyped = e.target.value; const s = pwScore(F.pwTyped), ok = F.pwTyped.length >= S.app.passwordMin && /[A-Za-z]/.test(F.pwTyped) && /\\d/.test(F.pwTyped);\n    q('#pwBar').style.width = s * 25 + '%'; q('#pwBar').style.background = SCOL[s];\n    q('#pwHint').textContent = ok ? 'Memenuhi syarat · kekuatan: ' + SLBL[s] : `Minimal ${S.app.passwordMin} karakter, berisi huruf dan angka.`; q('#pwHint').style.color = ok ? 'var(--ok)' : '';\n  };\n  if (q('#delUser')) q('#delUser').onclick = () => confirmDelete(S.formOrig);\n  q('#ssave').onclick = saveUser;\n}\nasync function saveUser() {\n  const F = S.form, O = S.formOrig, btn = document.querySelector('#sheet-root #ssave');\n  const err = m => { S.formErr = m; renderSheet(false); const b = document.querySelector('#sheet-root .dbody'); b.scrollTop = 1e5; };\n  if (!F.nama.trim()) return err('Nama lengkap wajib diisi.');\n  const payload = { baru: !O, username: F.username, nama: F.nama.trim(), alias: F.alias, role: F.role, aktif: F.aktif, version: F.version,\n                    password: F.pwOn ? { mode: F.pwMode, nilai: F.pwMode === 'ketik' ? F.pwTyped : '' } : null };\n  busy(btn, true);\n  try {\n    const r = await call('users.simpan', payload);\n    closeSheet(); pakaiDaftarUser(r);\n    const target = { username: r.username, nama: F.nama.trim() };\n    if (r.passwordAcak) setTimeout(() => showTempPw(target, r.passwordAcak, O ? 'Password direset' : 'User dibuat'), 320);\n    else toast(!O ? `User ${r.username} dibuat. Wajib ganti password saat login pertama.` : F.pwOn ? 'Disimpan. Password baru wajib diganti saat login.' : 'Perubahan disimpan dan dicatat di Log.');\n  } catch (e) {\n    if (e.kode === 'SESI_HABIS' || e.kode === 'WAJIB_GANTI') return;\n    if (e.kode === 'KONFLIK') { await reloadUsers(); }\n    busy(btn, false); err(e.pesan || String(e));\n  }\n}\n\n/* ---------------- role & izin ---------------- */\nfunction viewRole() {\n  const base = {}; S.roles.roles.forEach(r => { base[r.role] = r.izin; });\n  const R = S.roleDraft || base, roles = Object.keys(base), dirty = !!S.roleDraft;\n  return `<div class=\"card\"><h2>Matriks izin<small>${roles.length} role · ${S.roles.katalog.length} izin</small><span class=\"sp\"></span><button class=\"btn sm\" id=\"addRole\">${ic('add', 's')}Role baru</button></h2>\n   <div class=\"tbl-wrap\"><table class=\"t matrix\"><thead><tr><th>Izin</th>${S.roles.roles.map(r => `<th>${esc(r.role)}<div class=\"dim\" style=\"font-size:10.5px;text-transform:none;letter-spacing:0\">${r.jumlahUser} user aktif</div></th>`).join('')}</tr></thead><tbody>\n   ${S.roles.katalog.map(([p, d]) => `<tr><td><span class=\"mono\" style=\"font-size:12px\">${p}</span><div class=\"muted\" style=\"font-size:12px\">${esc(d)}</div></td>${roles.map(r => { const on = R[r].indexOf(p) >= 0, orig = base[r].indexOf(p) >= 0; return `<td style=\"${dirty && on !== orig ? 'background:var(--accent-bg)' : ''}\"><input type=\"checkbox\" class=\"chk\" data-perm=\"${esc(r)}|${p}\" aria-label=\"${esc(r)} ${p}\" ${on ? 'checked' : ''}></td>`; }).join('')}</tr>`).join('')}\n   </tbody></table></div>\n   ${dirty ? `<div class=\"bulk\" style=\"margin-top:14px\"><b>Ada perubahan belum disimpan</b><span class=\"sp\"></span><button class=\"btn sm\" id=\"roleCancel\">Batal</button><button class=\"btn sm pri\" id=\"roleSave\">Simpan izin</button></div>` : ''}\n  </div>\n  <div class=\"note info\">${ic('shield', 's')}<span class=\"tx\">Setiap permintaan dicek izinnya di server, bukan hanya disembunyikan di layar. Permintaan tanpa izin ditolak dan tercatat sebagai <b>IZIN_DITOLAK</b> di Log. Perubahan izin berlaku pada permintaan berikutnya setiap user, tanpa login ulang.</span></div>`;\n}\nfunction rerenderRole() { const c = document.getElementById('content'); c.innerHTML = viewRole(); bindRole(); }\nfunction bindRole() {\n  $$('[data-perm]').forEach(c => c.onchange = () => {\n    const [role, p] = c.dataset.perm.split('|');\n    if (!S.roleDraft) { S.roleDraft = {}; S.roles.roles.forEach(r => { S.roleDraft[r.role] = r.izin.slice(); }); }\n    const l = S.roleDraft[role]; if (c.checked) l.push(p); else l.splice(l.indexOf(p), 1);\n    rerenderRole();\n  });\n  if ($('#roleCancel')) $('#roleCancel').onclick = () => { S.roleDraft = null; rerenderRole(); };\n  if ($('#roleSave')) $('#roleSave').onclick = async () => {\n    const btn = $('#roleSave'); busy(btn, true);\n    try {\n      const r = await call('roles.simpan', { peta: S.roleDraft });\n      toast(`${r.diubah} izin diubah. Berlaku di permintaan berikutnya.`);\n      S.roles = r.daftar; S.roleDraft = null;\n      if (r.me && JSON.stringify(r.me.izin) !== JSON.stringify(S.me.izin)) pakaiMe(r.me); else { S.me = r.me || S.me; rerenderRole(); }\n    }\n    catch (e) { busy(btn, false); modalGagal(e); }\n  };\n  $('#addRole').onclick = () => modal('Role baru', `<label class=\"of\"><span>Nama role</span><input class=\"inp mono\" id=\"rn\" placeholder=\"mis. KOORDINATOR\"></label><label class=\"of\"><span>Salin izin dari</span><select class=\"inp\" id=\"rc\"><option value=\"\">— tanpa izin —</option>${S.roles.roles.map(r => `<option>${esc(r.role)}</option>`).join('')}</select></label>`,\n    [{ l: 'Batal' }, { l: 'Buat', pri: true, fn: d => {\n      const nama = d.querySelector('#rn').value, dari = d.querySelector('#rc').value;\n      call('roles.buat', { nama, salinDari: dari }).then(r => { toast(`Role ${r.role} dibuat. Atur izinnya di tabel.`); S.roles = r.daftar; S.roleDraft = null; rerenderRole(); }).catch(modalGagal);\n    } }]);\n}\n\n/* ---------------- log ---------------- */\nfunction viewLog() {\n  const L = S.log, f = S.logF;\n  const sel = (id, lbl, opts, v) => `<select class=\"inp\" id=\"${id}\" aria-label=\"${lbl}\"><option value=\"\">${lbl}: semua</option>${opts.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;\n  return `<div class=\"card\" style=\"display:flex;flex-direction:column;gap:14px\"><div class=\"row\">\n   ${L.semua ? sel('lfu', 'User', L.users, f.user) : ''}${sel('lfa', 'Aksi', L.aksi, f.aksi)}${sel('lfr', 'Hasil', ['BERHASIL', 'GAGAL', 'DITOLAK'], f.hasil)}\n   <span class=\"sp\"></span><span class=\"muted tnum\">${L.entri.length < L.total ? `${L.entri.length} terbaru dari ${L.total}` : L.total + ' entri'}</span><button class=\"btn\" disabled title=\"Dibangun di F5\">${ic('dl', 's')}Export xlsx · F5</button></div>\n   <div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Entitas</th><th>Detail</th><th>Hasil</th></tr></thead><tbody>\n   ${L.entri.map(l => `<tr><td class=\"tnum\" style=\"white-space:nowrap\">${esc(l.waktu)}</td><td class=\"mono\">${esc(l.user)}</td><td><span class=\"pill p-dim\">${esc(l.aksi)}</span></td><td>${esc(l.entitas)} <span class=\"mono\" style=\"font-size:12px\">${esc(l.id)}</span></td>\n     <td class=\"muted\">${l.field ? `<span class=\"mono\">${esc(l.field)}</span>: ${esc(l.lama)} → ${esc(l.baru)} ` : ''}${esc(l.catatan)}</td><td class=\"${l.hasil === 'BERHASIL' ? 'res-ok' : 'res-no'}\">${esc(l.hasil)}</td></tr>`).join('') || '<tr><td colspan=\"6\" class=\"muted\" style=\"text-align:center;padding:24px\">Tidak ada entri.</td></tr>'}\n   </tbody></table></div>\n   <div class=\"muted\" style=\"font-size:12px\">Log hanya bisa ditambah; tidak ada yang bisa mengubah atau menghapus entri, termasuk admin. Password tidak pernah dicatat.</div></div>`;\n}\nfunction bindLog() {\n  [['lfu', 'user'], ['lfa', 'aksi'], ['lfr', 'hasil']].forEach(([id, k]) => { const el = document.getElementById(id); if (el) el.onchange = () => { S.logF[k] = el.value; loadPage('log'); }; });\n}\n\n/* ---------------- sistem ---------------- */\nfunction viewSistem() {\n  const I = S.sistem, daftar = I.db.akses || [], akses = daftar.length;\n  return `<div class=\"grid g2\">\n   <div class=\"card\"><h2>${ic('db', 's')} Database</h2><dl class=\"kv\"><dt>File</dt><dd class=\"mono\">${esc(I.db.nama)}</dd><dt>Pemilik</dt><dd>${esc(I.akunFF) || 'akun FF'}</dd><dt>Akses file</dt><dd>${akses <= 2 ? '<span class=\"pill p-ok\">aman</span>' : '<span class=\"pill p-crit\">terlalu banyak</span>'} <span class=\"muted\" style=\"font-size:12px\">${akses} akun</span><div class=\"mono dim\" style=\"font-size:11.5px;margin-top:4px\">${daftar.map(esc).join('<br>')}</div></dd><dt>Versi aplikasi</dt><dd>${esc(I.app.versi)} (${esc(I.app.fase)})</dd><dt>Versi skema</dt><dd>v${esc(I.skemaDb)}</dd><dt>Dibuat</dt><dd>${esc(I.dibuat)}</dd></dl></div>\n   <div class=\"card\"><h2>${ic('check', 's')} Pemeriksaan kesehatan<span class=\"sp\"></span><button class=\"btn sm\" id=\"health\">Jalankan</button></h2><div id=\"hres\"><div class=\"muted\" style=\"font-size:13px\">Klik <b>Jalankan</b> untuk memeriksa database, skema, admin, role, config, dan akses file.</div></div></div>\n   <div class=\"card\"><h2>Tab di database</h2><div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Tab</th><th class=\"num\">Baris data</th></tr></thead><tbody>${I.db.tabs.map(t => `<tr><td class=\"mono\">${esc(t.tab)}</td><td class=\"num\">${t.baris}</td></tr>`).join('')}</tbody></table></div>\n    <div class=\"muted\" style=\"font-size:12px;margin-top:8px\">Tab untuk kontrak, BAST, dan lainnya ditambahkan otomatis oleh migrasi di fase berikutnya.</div></div>\n   <div class=\"card\"><h2>Riwayat migrasi</h2><div class=\"tl\">${I.riwayat.slice().reverse().map(e => `<div class=\"e\"><span class=\"b\"></span><span class=\"w\">${esc(e.waktu)}</span><span><b>v${e.dari} → v${e.ke}</b> · ${esc(e.oleh)}<br><span class=\"muted\" style=\"font-size:12px\">${esc(e.langkah.join(' · '))}</span></span></div>`).join('')}</div>\n    <div class=\"muted\" style=\"font-size:12px;margin-top:8px\">Migrasi hanya menambah tab/kolom, tidak pernah menghapus data.</div></div>\n   <div class=\"card\" style=\"grid-column:1/-1\"><h2>Config</h2><div class=\"tbl-wrap\"><table class=\"t\"><thead><tr><th>Key</th><th>Nilai</th><th>Arti</th><th></th></tr></thead><tbody>${I.config.map(c => `<tr><td class=\"mono\" style=\"font-size:12px\">${esc(c.key)}</td><td><input class=\"inp\" data-cfg=\"${esc(c.key)}\" value=\"${esc(c.nilai)}\" aria-label=\"${esc(c.key)}\" style=\"max-width:240px\" ${can('pengaturan.kelola') ? '' : 'disabled'}></td><td class=\"muted\" style=\"font-size:12.5px\">${esc(c.ket)}</td><td>${can('pengaturan.kelola') ? `<button class=\"btn sm\" data-cfgsave=\"${esc(c.key)}\">Simpan</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>\n  </div>`;\n}\nfunction bindSistem() {\n  $('#health').onclick = async () => {\n    const btn = $('#health'); busy(btn, true, 'Memeriksa…');\n    try { const r = await call('sistem.cek'); $('#hres').innerHTML = r.hasil.map(h => `<div class=\"check\"><span class=\"d ${h.ok ? 'y' : ''}\" style=\"${h.ok ? '' : 'background:var(--crit);color:#fff'}\">${h.ok ? '✓' : '!'}</span><span>${esc(h.nama)}${h.catatan ? `<br><span class=\"muted\" style=\"font-size:12px\">${esc(h.catatan)}</span>` : ''}</span></div>`).join(''); toast(`Pemeriksaan selesai: ${r.hasil.filter(h => h.ok).length} dari ${r.hasil.length} OK.`); }\n    catch (e) { gagal(e); } finally { busy(btn, false); }\n  };\n  $$('[data-cfgsave]').forEach(b => b.onclick = async () => {\n    const key = b.dataset.cfgsave, nilai = document.querySelector(`[data-cfg=\"${key}\"]`).value; busy(b, true);\n    try { const r = await call('config.simpan', { key, nilai }); toast(r.berubah ? `${key} disimpan.` : 'Tidak ada perubahan.'); S.app = Object.assign(S.app, r.app); }\n    catch (e) { modalGagal(e); } finally { busy(b, false); }\n  });\n}\nfunction viewDenied(pesan) {\n  return `<div class=\"card denied\"><div class=\"big\">${ic('shield')}</div><h2 style=\"margin:0;font-size:20px\">Anda tidak punya izin untuk halaman ini</h2>\n  <p class=\"muted\" style=\"margin:0;max-width:52ch\">${esc(pesan)} Kejadian ini tercatat di Log.</p><button class=\"btn\" data-go2=\"beranda\">Kembali ke beranda</button></div>`;\n}\n\n/* ---------------- modal & toast ---------------- */\nfunction modal(title, body, acts) {\n  const d = document.createElement('div'); d.className = 'scrim';\n  d.innerHTML = `<div class=\"modal\" role=\"dialog\" aria-modal=\"true\"><h3>${title}</h3>${body}<div class=\"acts\">${acts.map((a, i) => `<button class=\"btn ${a.pri ? 'pri' : ''}\" data-a=\"${i}\">${a.l}</button>`).join('')}</div></div>`;\n  document.getElementById('overlay-root').appendChild(d);\n  const close = () => { d.classList.add('closing'); setTimeout(() => d.remove(), 200); }; d._close = close;\n  d.addEventListener('click', e => { if (e.target === d) { close(); return; } const b = e.target.closest('[data-a]'); if (b) { const a = acts[+b.dataset.a]; if (!a.fn || a.fn(d) !== false) close(); } });\n  setTimeout(() => { const f = d.querySelector('input:not([disabled]),select,.btn.pri'); if (f) f.focus(); }, 60);\n}\nlet toastT;\nfunction toast(m, isErr) {\n  const old = document.querySelector('.toast'); if (old) old.remove();\n  const t = document.createElement('div'); t.className = 'toast' + (isErr ? ' err' : ''); t.setAttribute('role', 'status');\n  t.innerHTML = ic(isErr ? 'warn' : 'check', 's') + '<span>' + esc(m) + '</span>'; document.body.appendChild(t);\n  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), isErr ? 6000 : 3400);\n}\ndocument.addEventListener('keydown', e => {\n  if (e.key !== 'Escape') return;\n  if (document.querySelector('.menu')) { closeMenu(); return; }\n  const m = [...document.querySelectorAll('#overlay-root .scrim:not(.closing)')].pop(); if (m) { m._close(); return; }\n  closeSheet();\n});\ndocument.addEventListener('click', () => { closeMenu(); const s = $('#side'); if (s) s.classList.remove('open'); });\nwindow.addEventListener('resize', closeMenu);\n\nboot();\n\n</script>\n";
