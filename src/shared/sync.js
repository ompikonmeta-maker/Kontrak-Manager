/**
 * SKD: aturan sinkron ke sheet unit (§8), fungsi murni — dipakai server (Cek saja / Update) dan browser (wizard).
 */
var SKD = (function () {
  function s(v) { return v === undefined || v === null ? '' : String(v); }
  function t(v) { return s(v).trim(); }
  /** Judul header dibandingkan tanpa peduli huruf besar/kecil, spasi, dan tanda baca (§8.3). */
  function normHeader(v) { return s(v).normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]+/g, ''); }
  function normKey(x) { return s(x).normalize('NFKC').toUpperCase().replace(/[‐-―−]/g, '-').replace(/\s+/g, '').replace(/\.+$/, ''); }
  function huruf(c) { var r = ''; while (c > 0) { var m = (c - 1) % 26; r = String.fromCharCode(65 + m) + r; c = Math.floor((c - 1) / 26); } return r; }

  // field, arah, label, alias header bawaan
  var FIELD = [
    ['KUNCI', 'KUNCI', 'No. kontrak (kunci)', ['NO KONTRAK', 'NOMOR KONTRAK', 'NO KL', 'NO WO/SPK/KL', 'NOMOR KL', 'NO WO SPK KL', 'NO. KONTRAK']],
    ['KENDALA_UMUM', 'TULIS', 'Kendala Umum', ['KENDALA UMUM', 'STATUS BAST FF', 'STATUS BAST']],
    ['KENDALA_DETIL', 'TULIS', 'Kendala Detil', ['KENDALA DETIL', 'KETERANGAN FF', 'KENDALA DETAIL']],
    ['TAHAP', 'TULIS', 'Tahap', ['TAHAP', 'PROGRESS BAST', 'TAHAP BAST']],
    ['TGL_UPDATE', 'TULIS', 'Tanggal update', ['TGL UPDATE', 'TGL UPDATE FF', 'TANGGAL UPDATE']],
    ['PIC', 'TULIS', 'PIC', ['PIC', 'PIC FF']],
    ['NO_BAST', 'TULIS', 'No. dokumen BAST/BAA', ['NO BAST', 'NOMOR BAST', 'NO BAA']],
    ['DOK_TAGIH', 'TULIS', 'Dokumen tagih (BAST/BAA)', ['DOK TAGIH', 'DOKUMEN TAGIH']],
    ['PARSIAL', 'TULIS', 'Info parsial', ['PARSIAL', 'INFO PARSIAL']],
    ['PELANGGAN', 'BACA', 'Customer', ['NAMA CUSTOMER', 'CUSTOMER', 'NAMA PELANGGAN', 'PELANGGAN']],
    ['END_CUSTOMER', 'BACA', 'End customer', ['END CUSTOMER', 'END USER']],
    ['JUDUL', 'BACA', 'Judul', ['JUDUL', 'JUDUL KONTRAK', 'NAMA LAYANAN']],
    ['NILAI', 'BACA', 'Nilai kontrak', ['NILAI KONTRAK', 'NILAI']],
    ['TAHUN', 'BACA', 'Tahun', ['TAHUN', 'TAHUN PROJECT']],
    ['POPULASI', 'BACA', 'Populasi', ['POPULASI', 'POP']],
    ['SEGMENT', 'BACA', 'Segment', ['SEGMENT', 'SEGMENT TSAT', 'SEG']],
    ['NO_ORDER', 'BACA', 'No. SO/MI', ['NO SO', 'NO ORDER', 'SO', 'NO MI']],
    ['JUMLAH_LOKASI', 'BACA', 'Jumlah lokasi', ['JUMLAH LOKASI', 'JML LOKASI']]
  ];
  function infoField(f) {
    if (f.indexOf('TGL_TAHAP:') === 0) return ['TULIS', 'Tanggal masuk tahap ' + f.slice(10), []];
    if (f.indexOf('INFO:') === 0) return ['BACA', 'Info · ' + f.slice(5), []];
    var x = FIELD.filter(function (r) { return r[0] === f; })[0];
    return x ? [x[1], x[2], x[3]] : ['BACA', f, []];
  }
  function arahField(f) { return infoField(f)[0]; }

  /** Usulan pemetaan dari satu baris header: { field: indeks kolom (1-based) }. */
  function sarankan(header) {
    var hs = (header || []).map(normHeader), out = {};
    FIELD.forEach(function (f) {
      var al = f[3].map(normHeader);
      for (var i = 0; i < hs.length; i++) if (hs[i] && al.indexOf(hs[i]) >= 0) { out[f[0]] = i + 1; break; }
    });
    return out;
  }
  /** Baris header (1-based) di antara baris teratas: baris pertama yang memuat judul kunci tepat sekali. */
  function cariBarisHeader(rows, judulKunci, aliasKunci) {
    var cari = [normHeader(judulKunci)].concat((aliasKunci || []).map(normHeader)).filter(Boolean);
    for (var r = 0; r < (rows || []).length; r++) {
      var n = (rows[r] || []).filter(function (v) { return cari.indexOf(normHeader(v)) >= 0; }).length;
      if (n === 1) return r + 1;
    }
    return 0;
  }
  /**
   * Posisi setiap kolom terpetakan di baris header, berdasarkan JUDUL (bukan huruf).
   * kolom: [{Field, Arah, JudulHeader, AliasHeader}]. Hasil: {pos: {field: c}, err: [], warn: []}
   * KUNCI/TULIS yang hilang atau ganda → err (tab dilewati, tidak menebak). BACA yang hilang → warn.
   */
  function petakan(header, kolom) {
    var hs = (header || []).map(normHeader), out = { pos: {}, err: [], warn: [] };
    (kolom || []).forEach(function (k) {
      var cari = [normHeader(k.JudulHeader)].concat(s(k.AliasHeader).split(',').map(normHeader)).filter(Boolean), cs = [];
      hs.forEach(function (h, i) { if (h && cari.indexOf(h) >= 0) cs.push(i + 1); });
      if (cs.length === 1) { out.pos[k.Field] = cs[0]; return; }
      var pesan = cs.length ? 'Header "' + k.JudulHeader + '" ditemukan lebih dari sekali (kolom ' + cs.map(huruf).join(', ') + ')' : 'Header "' + k.JudulHeader + '" tidak ditemukan';
      (k.Arah === 'BACA' ? out.warn : out.err).push(pesan + ' · ' + infoField(k.Field)[1]);
    });
    return out;
  }
  /** Aturan wizard §8.4: kunci wajib, minimal satu TULIS, satu header untuk satu field KUNCI/TULIS, TULIS ≠ kunci/BACA. */
  function validasi(kolom) {
    var e = [], k = kolom || [], by = {};
    if (!k.some(function (x) { return x.Arah === 'KUNCI' && t(x.JudulHeader); })) e.push('Kolom kunci (no. kontrak) wajib dipilih.');
    if (!k.some(function (x) { return x.Arah === 'TULIS' && t(x.JudulHeader); })) e.push('Pilih minimal satu kolom TULIS.');
    k.forEach(function (x) { if (!t(x.JudulHeader)) return; var h = normHeader(x.JudulHeader); (by[h] = by[h] || []).push(x); });
    Object.keys(by).forEach(function (h) {
      var xs = by[h], tk = xs.filter(function (x) { return x.Arah !== 'BACA'; });
      if (tk.length > 1) e.push('Header "' + xs[0].JudulHeader + '" dipakai oleh lebih dari satu field (' + tk.map(function (x) { return infoField(x.Field)[1]; }).join(', ') + '). Satu kolom hanya boleh untuk satu field.');
      if (xs.some(function (x) { return x.Arah === 'TULIS'; }) && xs.some(function (x) { return x.Arah === 'BACA' || x.Arah === 'KUNCI'; }))
        e.push('Header "' + xs[0].JudulHeader + '" dipakai untuk TULIS sekaligus kunci/BACA. Pilih kolom lain.');
    });
    var f = {}; k.forEach(function (x) { if (f[x.Field]) e.push('Field ' + infoField(x.Field)[1] + ' dipetakan dua kali.'); f[x.Field] = 1; });
    return e;
  }

  // ---------------- tab bulanan (ModeTab TERBARU, §8.3)
  var BULAN = { JAN: 1, JANUARI: 1, JANUARY: 1, FEB: 2, FEBRUARI: 2, FEBRUARY: 2, MAR: 3, MARET: 3, MARCH: 3, APR: 4, APRIL: 4, MEI: 5, MAY: 5, JUN: 6, JUNI: 6, JUNE: 6,
    JUL: 7, JULI: 7, JULY: 7, AGU: 8, AGS: 8, AGT: 8, AGUSTUS: 8, AUG: 8, AUGUST: 8, SEP: 9, SEPT: 9, SEPTEMBER: 9, OKT: 10, OKTOBER: 10, OCT: 10, OCTOBER: 10,
    NOV: 11, NOVEMBER: 11, DES: 12, DESEMBER: 12, DEC: 12, DECEMBER: 12 };
  /** Pola nama tab: MMM/MMMM (nama bulan), MM (angka), YYYY, YY. Contoh "MMM YYYY" → NOV 2026. */
  function polaRegex(pola) {
    var p = s(pola).trim(), re = '', urut = [], i = 0;
    while (i < p.length) {
      if (/^MMMM?/i.test(p.slice(i)) && p.slice(i, i + 3).toUpperCase() === 'MMM') { var len = p.slice(i, i + 4).toUpperCase() === 'MMMM' ? 4 : 3; re += '([A-Za-z]{3,9})'; urut.push('bln'); i += len; }
      else if (p.slice(i, i + 2).toUpperCase() === 'MM') { re += '(\\d{1,2})'; urut.push('bln#'); i += 2; }
      else if (p.slice(i, i + 4).toUpperCase() === 'YYYY') { re += '(\\d{4})'; urut.push('thn'); i += 4; }
      else if (p.slice(i, i + 2).toUpperCase() === 'YY') { re += '(\\d{2})'; urut.push('thn2'); i += 2; }
      else if (/\s/.test(p[i])) { re += '\\s*'; i++; }
      else { re += p[i].replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&'); i++; }
    }
    return { re: new RegExp('^\\s*' + re + '\\s*$', 'i'), urut: urut };
  }
  /** Tab yang cocok dengan pola, beserta tahun & bulannya. */
  function tabCocok(tabs, pola) {
    var p = polaRegex(pola), out = [];
    (tabs || []).forEach(function (nama, idx) {
      var m = s(nama).match(p.re); if (!m) return;
      var y = 0, b = 0, ok = true;
      p.urut.forEach(function (u, i) {
        var v = m[i + 1];
        if (u === 'bln') { b = BULAN[v.toUpperCase()] || 0; if (!b) ok = false; }
        else if (u === 'bln#') { b = +v; if (b < 1 || b > 12) ok = false; }
        else if (u === 'thn') y = +v; else if (u === 'thn2') y = 2000 + (+v);
      });
      if (ok) out.push({ nama: nama, y: y, m: b, idx: idx });
    });
    return out;
  }
  /** Tab yang dipakai: FIXED → nama tab; TERBARU → bulan terbaru dari nama (atau tab cocok paling kanan). */
  function pilihTab(tabs, target) {
    if (target.ModeTab !== 'TERBARU') return (tabs || []).indexOf(target.TabNama) >= 0 ? target.TabNama : '';
    var c = tabCocok(tabs, target.TabNama);
    if (!c.length) return '';
    if (target.CaraTerbaru === 'POSISI_TERAKHIR') return c[c.length - 1].nama;
    c.sort(function (a, b) { return (a.y * 13 + a.m) - (b.y * 13 + b.m) || a.idx - b.idx; });
    return c[c.length - 1].nama;
  }

  // ---------------- nilai yang ditulis
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  /** 'yyyy-MM-dd…' → teks sesuai format (dd/MM/yyyy, dd-MMM-yyyy, yyyy-MM-dd). */
  function fmtTanggal(tgl, fmt) {
    var m = s(tgl).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return '';
    var f = s(fmt) || 'dd/MM/yyyy';
    return f.replace('yyyy', m[1]).replace('MMM', BLN[+m[2] - 1]).replace('MM', m[2]).replace('dd', m[3]);
  }
  function hidup(r) { return (r || []).filter(function (x) { return s(x.Dihapus).toUpperCase() !== 'TRUE'; }); }
  /** Nilai satu field TULIS untuk satu kontrak (sama untuk semua target, §8.4). null = jangan tulis (alarm). */
  function nilaiField(b, field, ref, o) {
    o = o || {};
    var k = b.k, bast = hidup(b.bast).slice().sort(function (x, y) { return Number(x.Urutan) - Number(y.Urutan); });
    if (field === 'KENDALA_UMUM') return k.KendalaUmum ? s(k.KendalaUmum) : null;
    if (field === 'KENDALA_DETIL') return s(k.KendalaDetil);
    if (field === 'TAHAP') { var tt = ref && ref.T && ref.T[k.TahapKontrak]; return tt ? tt.Label : s(k.TahapKontrak); }
    if (field === 'PIC') return s(k.PIC);
    if (field === 'DOK_TAGIH') return bast.length ? s(bast[bast.length - 1].DokTagih) : '';
    if (field === 'NO_BAST') return bast.map(function (x) { return t(x.NoDokBAST); }).filter(Boolean).join(', ');
    if (field === 'PARSIAL') {
      var lok = Number(k.JumlahLokasi) || 0;
      if (bast.length < 2 && !lok) return '';
      var cl = bast.filter(function (x) { return ref && ref.T && ref.T[x.KodeTahap] && ref.T[x.KodeTahap].Penutup; });
      var cak = cl.reduce(function (a, x) { return a + (Number(x.CakupanLokasi) || (bast.length === 1 ? lok : 0)); }, 0);
      return cl.length + '/' + bast.length + ' BAST' + (lok ? ' · ' + cak + '/' + lok + ' lokasi' : '');
    }
    if (field.indexOf('TGL_TAHAP:') === 0) {
      var kode = field.slice(10), rw = (o.riwayat || []).filter(function (r) { return r.KontrakID === k.KontrakID && r.KodeTahap === kode; }).map(function (r) { return s(r.Masuk); }).sort();
      return rw.length ? fmtTanggal(rw[rw.length - 1], o.fmtTgl) : '';
    }
    return '';
  }
  /** Sel kunci berisi lebih dari satu nomor kontrak? (pisah baris baru, koma, titik koma, atau " / "). */
  function multiNomor(raw) {
    var p = s(raw).split(/\n|;|,|\s+\/\s+/).map(t).filter(function (x) { return x.length >= 5 && /\d/.test(x); });
    return p.length > 1;
  }

  /**
   * Rencana Cek saja / Update untuk satu tab (§8.1, §8.5).
   * o: {baris: [{r, kunci, sel: {field: {v, formula}}}], tulis: [field...], cari(normKey) → {status: AKTIF|ARSIP|DIARSIPKAN, bundle?} | null,
   *     jejak: {'normKey|field': nilai}, ref, riwayat, fmtTgl, hariIni ('yyyy-MM-dd')}
   * Hasil: {rows: [{r, raw, kid, st, sel: [{field, now, next, act, why}]}], tulis: [{r, field, v, kid, nk, now}], alarm: [...], n: {...}}
   */
  function rencana(o) {
    var out = { rows: [], tulis: [], alarm: [], n: { baris: 0, cocok: 0, tulis: 0, sama: 0, selesai: 0, luar: 0, formula: 0, baru: 0, multi: 0, arsip: 0 } };
    var fields = (o.tulis || []).filter(function (f) { return f !== 'TGL_UPDATE'; }), adaTgl = (o.tulis || []).indexOf('TGL_UPDATE') >= 0;
    (o.baris || []).forEach(function (b) {
      var raw = t(b.kunci); if (!raw) return;
      out.n.baris++;
      var row = { r: b.r, raw: raw, sel: [], st: '' };
      if (multiNomor(raw)) { row.st = 'MULTI'; out.n.multi++; out.alarm.push({ j: 'MULTI_NOMOR', r: b.r, txt: 'Sel kunci berisi lebih dari satu nomor: "' + raw + '". Baris ini tidak ditulis.' }); out.rows.push(row); return; }
      if (!/\d/.test(raw)) { row.st = 'BUKAN'; out.rows.push(row); return; }
      var nk = normKey(raw), hit = o.cari(nk);
      if (!hit) { row.st = 'BARU'; out.n.baru++; out.rows.push(row); return; }
      row.kid = hit.kid || (hit.bundle && hit.bundle.k.KontrakID);
      if (hit.status !== 'AKTIF') { row.st = hit.status; out.n.arsip++; out.rows.push(row); return; }
      out.n.cocok++;
      var k = hit.bundle.k, close = s(k.StatusKontrak) === 'CLOSE', nkK = s(k.NoKontrakNorm) || nk;
      fields.forEach(function (f) {
        var cur = (b.sel || {})[f] || {}, now = t(cur.v), next = nilaiField(hit.bundle, f, o.ref, o), jj = (o.jejak || {})[nkK + '|' + f], c = { field: f, now: now, next: next };
        if (next === null) { c.act = 'TANPA_ATURAN'; out.alarm.push({ j: 'TANPA_ATURAN', r: b.r, kid: row.kid, txt: k.NoKontrak + ': tidak ada aturan Nilai Push yang cocok; ' + f + ' tidak ditulis.' }); }
        else if (cur.formula) { c.act = 'FORMULA'; out.n.formula++; out.alarm.push({ j: 'FORMULA', r: b.r, kid: row.kid, txt: 'Sel ' + f + ' baris ' + b.r + ' berisi rumus. Tidak ditimpa.' }); }
        else if (close && jj !== undefined && jj === now && jj === next) c.act = 'SELESAI';
        else if (jj !== undefined && now !== jj && next === jj) { c.act = 'LUAR'; out.n.luar++; out.alarm.push({ j: 'DIUBAH_LUAR', r: b.r, kid: row.kid, txt: f + ' ' + k.NoKontrak + ' diubah di luar SKM: "' + jj + '" → "' + now + '". Tidak ditimpa sampai status di SKM berubah.' }); }
        else if (now === next) c.act = 'SAMA';
        else { c.act = 'TULIS'; if (jj !== undefined && now !== jj) c.why = 'status di SKM berubah · update FF menang'; }
        row.sel.push(c);
      });
      var adaTulis = row.sel.some(function (c) { return c.act === 'TULIS'; });
      if (adaTgl) { var cur2 = (b.sel || {}).TGL_UPDATE || {}, nowT = t(cur2.v); row.sel.push({ field: 'TGL_UPDATE', now: nowT, next: adaTulis && !cur2.formula ? fmtTanggal(o.hariIni, o.fmtTgl) : nowT, act: adaTulis && !cur2.formula ? 'TULIS' : 'SAMA' }); }
      row.sel.forEach(function (c) { if (c.act === 'TULIS') out.tulis.push({ r: b.r, field: c.field, v: c.next, now: c.now, kid: row.kid, nk: nkK, no: k.NoKontrak }); });
      var acts = row.sel.map(function (c) { return c.act; });
      row.st = acts.indexOf('TULIS') >= 0 ? 'TULIS' : acts.indexOf('LUAR') >= 0 ? 'LUAR' : acts.indexOf('FORMULA') >= 0 ? 'FORMULA' : acts.indexOf('TANPA_ATURAN') >= 0 ? 'TANPA_ATURAN' : acts.indexOf('SELESAI') >= 0 ? 'SELESAI' : 'SAMA';
      if (row.st === 'SAMA') out.n.sama++; if (row.st === 'SELESAI') out.n.selesai++;
      out.rows.push(row);
    });
    out.n.tulis = out.tulis.length;
    return out;
  }

  return { normHeader: normHeader, normKey: normKey, huruf: huruf, FIELD: FIELD, infoField: infoField, arahField: arahField, sarankan: sarankan,
           cariBarisHeader: cariBarisHeader, petakan: petakan, validasi: validasi, polaRegex: polaRegex, tabCocok: tabCocok, pilihTab: pilihTab,
           fmtTanggal: fmtTanggal, nilaiField: nilaiField, multiNomor: multiNomor, rencana: rencana };
})();
if (typeof module !== 'undefined') module.exports = SKD;
