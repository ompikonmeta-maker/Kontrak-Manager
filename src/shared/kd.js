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

  return {
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
