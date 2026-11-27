/* ================= F4a: sinkron ke sheet unit (script penerima, wizard, Cek saja, Update, pengaman kolom) ================= */
const HARI_INI = '27-Nov-2026';
const FIELD_LBL = { KENDALA_UMUM: 'Kendala Umum', KENDALA_DETIL: 'Kendala Detil', TAHAP: 'Tahap', TGL_UPDATE: 'Tgl update', PIC: 'PIC', PARSIAL: 'Parsial', DOK_TAGIH: 'Dok tagih', NO_BAST: 'No. BAST' };
// Sheet tiruan per target: header (huruf → judul), tab, baris (nomor + nilai kolom FF saat ini), jejak = nilai terakhir yang ditulis SKM.
const SIM = {
  T01: { tabs: ['JAN 2026', 'FEB 2026', 'MAR 2026', 'APR 2026', 'MEI 2026', 'JUN 2026', 'JUL 2026', 'AGU 2026', 'SEP 2026', 'OKT 2026', 'NOV 2026', 'REKAP', 'REF'],
    hdrRow: 3, kunci: ['B', 'NO KONTRAK'], tulis: { KENDALA_UMUM: ['R', 'STATUS BAST FF'], KENDALA_DETIL: ['S', 'KETERANGAN FF'], TGL_UPDATE: ['T', 'TGL UPDATE FF'] },
    baca: { PELANGGAN: ['C', 'NAMA CUSTOMER'], JUDUL: ['E', 'NAMA LAYANAN'], NILAI: ['F', 'NILAI KONTRAK'], 'INFO:Periode tagih': ['G', 'PERIODE TAGIH'] },
    rows: [
      { b: 118, raw: 'TEL.0719-0488/HK.810/DES-A1000000/2020', v: { KENDALA_UMUM: 'BAST ON REVIEW', KENDALA_DETIL: 'REVIEW ADMIN PRM', TGL_UPDATE: '14-Nov-2026' } },
      { b: 119, raw: 'TEL.0719-0488/HK.810/DES-A1000000/2020 ', v: { KENDALA_UMUM: 'BAST ON REVIEW', KENDALA_DETIL: 'REVIEW ADMIN PRM', TGL_UPDATE: '14-Nov-2026' }, ket: 'periode tagih OKT' },
      { b: 120, raw: 'TEL.0521-0102/HK.810/DES-A1000000/2021', v: { KENDALA_UMUM: 'BAST DONE', KENDALA_DETIL: 'Menunggu TTD GM', TGL_UPDATE: '20-Nov-2026' } },
      { b: 121, raw: 'SPK.0088/LG.270/2026', v: { KENDALA_UMUM: 'BAST TAKEOUT/SERTIM AR', KENDALA_DETIL: 'Diserahkan ke AR', TGL_UPDATE: '03-Nov-2026' } },
      { b: 122, raw: 'PO 4500031277', v: { KENDALA_UMUM: '=VLOOKUP(B122;REF!A:C;3;0)', KENDALA_DETIL: '', TGL_UPDATE: '' }, formula: { KENDALA_UMUM: true } },
      { b: 123, raw: 'TEL.0622-0311/HK.810/DES-A1000000/2022', v: { KENDALA_UMUM: '', KENDALA_DETIL: '', TGL_UPDATE: '' } },
      { b: 124, raw: 'WO-2026-0118 / WO-2026-0119', v: { KENDALA_UMUM: '', KENDALA_DETIL: '', TGL_UPDATE: '' } },
      { b: 125, raw: 'tel.0418-0152/p8/lg.270/des-a2020000/2018.', v: { KENDALA_UMUM: '', KENDALA_DETIL: '', TGL_UPDATE: '' } },
      { b: 126, raw: 'WO/0912/TSAT/X/2026', v: { KENDALA_UMUM: 'KOMPULIR EVIDEN', KENDALA_DETIL: '', TGL_UPDATE: '10-Nov-2026' } }],
    jejak: {} },
  T02: { tabs: ['DATA TELKOMSAT', 'REKAP', 'PIVOT'], hdrRow: 1, kunci: ['B', 'NO KONTRAK'],
    tulis: { KENDALA_UMUM: ['M', 'KENDALA UMUM'], KENDALA_DETIL: ['N', 'KENDALA DETIL'], TAHAP: ['O', 'PROGRESS BAST'] },
    baca: { PELANGGAN: ['C', 'PELANGGAN'] },
    rows: [
      { b: 14, raw: 'TEL.0317-0016/P8/LG.270/DES-A2027000/2017', v: { KENDALA_UMUM: 'BAST REVISI', KENDALA_DETIL: '', TAHAP: '' } },
      { b: 15, raw: 'TEL.0219-0003/P8/LG.270/DES-A2020000/2019', v: { KENDALA_UMUM: 'KOMPULIR EVIDEN', KENDALA_DETIL: 'KOMPULIR EVIDENCE', TAHAP: 'Kompulir Eviden' } },
      { b: 16, raw: 'WO/0912/TSAT/X/2026', v: { KENDALA_UMUM: 'DRAFTING DOKUMEN', KENDALA_DETIL: '', TAHAP: 'Drafting Dokumen' } },
      { b: 17, raw: 'TEL.0145-0021/HK.810/DES-A1000000/2024', v: { KENDALA_UMUM: 'BAST TAKEOUT/SERTIM AR', KENDALA_DETIL: '', TAHAP: 'BAST Takeout / Sertim AR' } },
      { b: 91, raw: 'TOTAL', v: { KENDALA_UMUM: '', KENDALA_DETIL: '', TAHAP: '' } }],
    jejak: {} }
};
// jejak awal: dua target sudah pernah di-update (titik awal + tulis sebelumnya)
SIM.T01.jejak = { 'TEL.0521-0102/HK.810/DES-A1000000/2021|KENDALA_UMUM': 'SIRKULIR DOKUMEN', 'SPK.0088/LG.270/2026|KENDALA_UMUM': 'BAST TAKEOUT/SERTIM AR' };
SIM.T02.jejak = { 'TEL.0219-0003/P8/LG.270/DES-A2020000/2019|KENDALA_UMUM': 'KOMPULIR EVIDEN', 'WO/0912/TSAT/X/2026|KENDALA_UMUM': 'DRAFTING DOKUMEN', 'TEL.0145-0021/HK.810/DES-A1000000/2024|KENDALA_UMUM': 'BAST TAKEOUT/SERTIM AR' };
Object.assign(TARGETS[0], { mode: 'TERBARU', tab: 'NOV 2026', pola: 'MMM YYYY', baru: null, st: 'OK', pesan: '9 baris cocok · 6 sel ditulis', cek: '27 Nov 08:40', upd: '27 Nov 08:41', ver: 1, aktif: true, owner: 'Rina (Billcom)' });
Object.assign(TARGETS[1], { st: 'OK', pesan: '4 baris cocok · 3 sel ditulis', cek: '27 Nov 08:42', upd: '27 Nov 08:42', ver: 1, aktif: true, owner: 'Dimas (Mansol)' });
const SIMF = { sisip: false, judul: false, urut: false };
let SYNCLOG = [['27 Nov 08:42', 'ompik', 'UPDATE', 'T02', 'DATA TELKOMSAT', 4, 3, 0, 0, ''], ['27 Nov 08:41', 'ompik', 'UPDATE', 'T01', 'NOV 2026', 9, 6, 0, 2, ''], ['27 Nov 08:40', 'ompik', 'CEK', 'T01', 'NOV 2026', 9, 0, 0, 2, '']];
let RPUSH = [];
const NOW = () => '27 Nov ' + new Date().toTimeString().slice(0, 5);
const nilaiPush = (k, f) => { const p = evalPush(k); return f === 'KENDALA_UMUM' ? (p.umum || '') : f === 'KENDALA_DETIL' ? (p.detil || '') : f === 'TAHAP' ? (tahapK(k) ? tahLabel(tahapK(k)) : '') : f === 'PIC' ? (k.pic || '') : f === 'PARSIAL' ? parsialTxt(k) : f === 'DOK_TAGIH' ? ((k.bast[0] || {}).doc || '') : ''; };
const hurufTulis = (t, f) => { const x = SIM[t.id].tulis[f]; if (!x) return '?'; if (t.id === 'T01' && SIMF.sisip) return String.fromCharCode(x[0].charCodeAt(0) + 1); return x[0]; };

/** Cek saja: apa yang akan ditulis per baris, tanpa menulis. */
function cekTarget(t) {
  const sm = SIM[t.id], out = { rows: [], alarms: [], tab: t.tab, batal: false };
  if (t.id === 'T01' && SIMF.judul) { out.batal = true; out.alarms.push({ j: 'KOLOM_BERUBAH', txt: 'Header "STATUS BAST FF" tidak ditemukan di baris 3 (sekarang tertulis "STATUS BAST"). Seluruh tab dilewati; SKM tidak menebak kolom. Perbaiki judul di sheet, atau ubah pemetaan di wizard.' }); return out; }
  if (t.baru) out.alarms.push({ j: 'TAB_BERGANTI', txt: `Tab baru "${t.baru}" terdeteksi. Sampai dikonfirmasi, target ini hanya berjalan mode Cek saja pada tab ${t.tab}.` });
  const fields = Object.keys(sm.tulis).filter(f => f !== 'TGL_UPDATE');
  sm.rows.forEach(r => {
    const row = { b: r.b, raw: r.raw, ket: r.ket, cells: [], st: '' };
    if (/\s\/\s/.test(r.raw)) { row.st = 'MULTI'; out.alarms.push({ j: 'MULTI_NOMOR', b: r.b, txt: `Sel kunci berisi lebih dari satu nomor: "${r.raw}". Baris ini tidak ditulis.` }); out.rows.push(row); return; }
    const nk = normKey(r.raw), k = K.find(x => normKey(x.no) === nk || (x.alias || []).some(a => normKey(a) === nk));
    if (!k) { row.st = r.raw === 'TOTAL' ? 'BUKAN' : 'BARU'; out.rows.push(row); return; }
    row.k = k; const close = statusK(k).st === 'CLOSE';
    fields.forEach(f => {
      const now = r.v[f] || '', next = nilaiPush(k, f), jk = k.no + '|' + f, jj = sm.jejak[jk];
      let act;
      if (r.formula && r.formula[f]) { act = 'FORMULA'; out.alarms.push({ j: 'FORMULA', b: r.b, txt: `Sel ${FIELD_LBL[f]} baris ${r.b} berisi rumus (${now}). Tidak ditimpa.` }); }
      else if (close && jj && jj === now && jj === next) act = 'SELESAI';
      else if (jj !== undefined && now !== jj && next === jj) { act = 'LUAR'; out.alarms.push({ j: 'DIUBAH_LUAR', b: r.b, k, txt: `${FIELD_LBL[f]} ${k.no} diubah di luar SKM: "${jj}" → "${now}". Tidak ditimpa sampai status di SKM berubah.` }); }
      else act = now === next ? 'SAMA' : 'TULIS';
      row.cells.push({ f, now, next, act, why: jj !== undefined && now !== jj && act === 'TULIS' ? 'status di SKM sudah berubah · update FF menang' : '' });
    });
    if (sm.tulis.TGL_UPDATE) { const ada = row.cells.some(c => c.act === 'TULIS'); row.cells.push({ f: 'TGL_UPDATE', now: r.v.TGL_UPDATE || '', next: ada ? HARI_INI : r.v.TGL_UPDATE || '', act: ada ? 'TULIS' : 'SAMA' }); }
    row.st = row.cells.some(c => c.act === 'TULIS') ? 'TULIS' : row.cells.some(c => c.act === 'LUAR') ? 'LUAR' : row.cells.some(c => c.act === 'FORMULA') ? 'FORMULA' : row.cells.every(c => c.act === 'SELESAI' || c.f === 'TGL_UPDATE') && row.cells.some(c => c.act === 'SELESAI') ? 'SELESAI' : 'SAMA';
    out.rows.push(row);
  });
  out.nTulis = out.rows.reduce((a, r) => a + r.cells.filter(c => c.act === 'TULIS').length, 0);
  out.nCocok = out.rows.filter(r => r.k).length;
  return out;
}
function jalankanUpdate(t) {
  const res = cekTarget(t), sm = SIM[t.id], oleh = me();
  if (res.batal || t.baru) return;
  if (SIMF.urut && t.id === 'T01') { SIMF.urut = false; SYNCLOG.unshift([NOW(), oleh, 'BATAL', t.id, t.tab, res.nCocok, 0, 0, 1, 'Urutan baris berubah saat akan ditulis (pemilik mengurutkan ulang). Tidak ada sel ditulis; coba lagi.']); t.st = 'ALARM'; t.pesan = 'Update dibatalkan: urutan baris berubah'; renderPage(false); toast('Update dibatalkan: urutan baris di sheet berubah. Tidak ada yang ditulis.'); return; }
  let n = 0;
  res.rows.forEach(r => r.cells.forEach(c => { if (c.act !== 'TULIS') return; const row = sm.rows.find(x => x.b === r.b); row.v[c.f] = c.next; if (c.f !== 'TGL_UPDATE') sm.jejak[r.k.no + '|' + c.f] = c.next; n++;
    RPUSH.unshift({ w: NOW(), oleh, t: t.id, tab: t.tab, b: r.b, kid: r.k.id, f: c.f, lama: c.now, baru: c.next }); }));
  t.upd = NOW(); t.cek = t.upd; t.st = res.alarms.length ? 'ALARM' : 'OK'; t.pesan = `${res.nCocok} baris cocok · ${n} sel ditulis` + (res.alarms.length ? ` · ${res.alarms.length} alarm` : '');
  SYNCLOG.unshift([t.upd, oleh, 'UPDATE', t.id, t.tab, res.nCocok, n, 0, res.alarms.length, '']);
  log(oleh, 'SINKRON_UPDATE', 'Target', t.id, t.tab, '', n + ' sel', 'Update ke GSheet manual');
  S.cek[t.id] = true; renderPage(false); toast(`${n} sel ditulis ke ${t.nama} dalam satu batch. Tercatat di Riwayat push.`);
}
const ACT = { TULIS: ['p-acc', 'Tulis'], SAMA: ['p-dim', 'Sudah sama'], SELESAI: ['p-ok', 'CLOSE · tidak ditulis lagi'], LUAR: ['p-warn', 'Diubah di luar SKM · tidak ditimpa'], FORMULA: ['p-crit', 'Berisi rumus · tidak ditimpa'],
  MULTI: ['p-crit', 'Lebih dari satu nomor'], BARU: ['p-info', 'Belum terdaftar di SKM'], BUKAN: ['p-dim', 'Bukan nomor kontrak'] };
S.cekF = {};
function viewGsheet() {
  const bolehUbah = can('target.kelola');
  return `<div class="row"><span class="muted" style="max-width:70ch">Setiap sheet unit memasang <b>script penerima SKM</b> sekali, oleh pemilik sheetnya. SKM hanya menulis kolom milik FF yang dipetakan, mengikuti <b>judul header</b> (bukan huruf kolom), dan membatalkan seluruh tab bila judul atau urutan baris berubah.</span><span class="sp"></span>${bolehUbah ? `<a class="btn pri" href="#wizard">${ic('add', 's')}Tambah target</a>` : ''}</div>
  <div class="note info">${ic('sync', 's')}<span class="tx">Di F4a sinkron dijalankan <b>manual</b>: <b>Cek saja</b> (pratinjau, tidak menulis) lalu <b>Update ke GSheet</b>. Sinkron otomatis tiap 15 menit, notifikasi, dan Antrian nomor baru menyusul di F4b.</span></div>
  ${TARGETS.map(t => { const res = S.cek[t.id] ? cekTarget(t) : null, sm = SIM[t.id], f = S.cekF[t.id] || 'semua';
    const rowsF = res ? res.rows.filter(r => f === 'semua' || (f === 'tulis' ? r.st === 'TULIS' : f === 'alarm' ? ['LUAR', 'FORMULA', 'MULTI'].includes(r.st) : f === 'baru' ? r.st === 'BARU' : r.st === 'SAMA' || r.st === 'SELESAI')) : [];
    const kolTulis = Object.keys(sm.tulis);
    return `<div class="card" style="display:flex;flex-direction:column;gap:14px">
   <h2><span class="pulse ${t.st === 'OK' ? '' : 'warn'}"></span>${esc(t.nama)}<span class="pill ${t.st === 'OK' ? 'p-ok' : 'p-warn'}">${t.st === 'OK' ? 'OK' : 'Perlu dicek'}</span><span class="pill p-dim">script penerima v${t.ver}</span><span class="sp"></span>
    ${can('sinkron.jalankan') ? `<button class="btn sm ghost" data-tes="${t.id}">${ic('link', 's')}Tes koneksi</button><button class="btn sm" data-cek="${t.id}">${ic('eye', 's')}Cek saja</button><button class="btn sm pri" data-upd="${t.id}" ${t.baru || (t.id === 'T01' && SIMF.judul) ? 'disabled title="Selesaikan alarm dulu"' : ''}>${ic('up2', 's')}Update ke GSheet</button>` : ''}${bolehUbah ? `<button class="btn sm ghost" data-ubah="${t.id}">${ic('edit', 's')}Pemetaan</button>` : ''}</h2>
   <div class="grid g3" style="gap:12px 24px">
    <dl class="kv"><dt>Mode tab</dt><dd>${t.mode === 'TERBARU' ? `Tab terbaru · pola <span class="mono">${t.pola}</span>` : 'Tab tetap'}</dd><dt>Tab dipakai</dt><dd class="mono">${esc(t.tab)}</dd><dt>Judul kolom</dt><dd>baris ${sm.hdrRow}</dd></dl>
    <dl class="kv"><dt>Cek terakhir</dt><dd class="tnum">${t.cek}</dd><dt>Update terakhir</dt><dd class="tnum">${t.upd}</dd><dt>Pemilik sheet</dt><dd>${esc(t.owner)}</dd><dt>Hasil terakhir</dt><dd>${esc(t.pesan)}</dd></dl>
    <div><div class="muted" style="font-size:12px;margin-bottom:6px">Kolom</div><div style="display:flex;flex-direction:column;gap:5px;font-size:12.5px">
     <div><span class="pill p-warn" style="font-size:10.5px">KUNCI</span> ${esc(sm.kunci[1])} <span class="mono dim">· ${sm.kunci[0]}</span></div>
     ${kolTulis.map(k => `<div><span class="pill p-acc" style="font-size:10.5px">TULIS</span> ${esc(FIELD_LBL[k])} → <b>${esc(t.id === 'T01' && SIMF.judul && k === 'KENDALA_UMUM' ? 'STATUS BAST' : sm.tulis[k][1])}</b> <span class="mono dim">· ${hurufTulis(t, k)}${t.id === 'T01' && SIMF.sisip ? ' (tadinya ' + sm.tulis[k][0] + ')' : ''}</span>${t.id === 'T01' && SIMF.judul && k === 'KENDALA_UMUM' ? ' <span class="pill p-crit" style="font-size:10px">judul berubah</span>' : ''}</div>`).join('')}
     ${Object.keys(sm.baca).map(k => `<div class="muted"><span class="pill p-dim" style="font-size:10.5px">BACA</span> ${esc(k.replace('INFO:', 'Info · '))} ← ${esc(sm.baca[k][1])}</div>`).join('')}</div></div></div>
   ${t.id === 'T01' && SIMF.sisip && !SIMF.judul ? `<div class="note ok">${ic('check', 's')}<span class="tx">Pemilik sheet menyisipkan kolom sebelum kolom FF. Huruf kolom bergeser (R → S), tetapi SKM mengikuti <b>judul header</b>, jadi tetap menulis ke kolom yang benar.</span></div>` : ''}
   ${t.baru ? `<div class="note warn">${ic('warn', 's')}<span class="tx" style="flex:1"><b>TAB_BERGANTI</b> · Tab baru <b class="mono">${t.baru}</b> terdeteksi (sekarang <span class="mono">${t.tab}</span>). Update ditahan sampai dikonfirmasi. Saat dipakai, nilai yang sudah ada di tab baru dianggap titik awal.</span>${bolehUbah ? '<button class="btn sm pri" data-tabbaru="' + t.id + '">Pakai tab baru</button>' : ''}</div>` : ''}
   ${res ? `<div style="display:flex;flex-direction:column;gap:10px;animation:rise .45s var(--ease) both">
     <div class="row"><b>Hasil Cek saja</b><span class="muted">· tab ${esc(res.tab)} · tidak ada yang ditulis</span></div>
     ${res.batal ? '' : `<div class="utiles">${[['semua', res.rows.length, 'Baris dibaca', ''], ['tulis', res.nTulis, 'Sel akan ditulis', 'ok'], ['sama', res.rows.filter(r => r.st === 'SAMA' || r.st === 'SELESAI').length, 'Sudah sama / selesai', 'dim'], ['alarm', res.rows.filter(r => ['LUAR', 'FORMULA', 'MULTI'].includes(r.st)).length, 'Tidak ditulis (alarm)', 'warn'], ['baru', res.rows.filter(r => r.st === 'BARU').length, 'Nomor belum terdaftar', 'crit']].map(([k, n, l, c]) => `<button class="utile ${c} ${f === k ? 'on' : ''}" data-cf="${t.id}|${k}"><b class="tnum">${n}</b><span>${l}</span></button>`).join('')}</div>`}
     ${res.alarms.filter(a => a.j === 'KOLOM_BERUBAH' || a.j === 'TAB_BERGANTI').map(a => `<div class="note crit">${ic('warn', 's')}<span class="tx"><b>${a.j}</b> · ${esc(a.txt)}</span></div>`).join('')}
     ${res.batal ? '' : `<div class="tbl-wrap"><table class="t"><thead><tr><th class="num">Baris</th><th style="min-width:220px">Kontrak</th>${kolTulis.map(k => `<th style="min-width:170px">${esc(FIELD_LBL[k])} <span class="mono dim" style="font-weight:500">· ${hurufTulis(t, k)}</span></th>`).join('')}<th>Hasil</th></tr></thead><tbody>
     ${rowsF.map(r => `<tr><td class="num">${r.b}</td><td><span class="no" style="overflow-wrap:anywhere">${esc(r.raw)}</span>${r.k ? `<span class="sub">${esc(r.k.id)} · ${esc(custName(r.k))}${r.ket ? ' · ' + esc(r.ket) : ''}</span>` : ''}</td>
       ${r.cells.length ? r.cells.map(c => `<td class="mono" style="font-size:11.5px">${c.act === 'TULIS' ? `<span class="diff-old">${esc(c.now) || '(kosong)'}</span><br>→ <span class="diff-new">${esc(c.next) || '(kosong)'}</span>${c.why ? `<div class="muted" style="font-family:var(--font);font-size:11px">${c.why}</div>` : ''}` : c.act === 'LUAR' ? `<span style="color:var(--warn)">${esc(c.now)}</span><div class="muted" style="font-family:var(--font);font-size:11px">SKM menulis: ${esc(c.next)}</div>` : c.act === 'FORMULA' ? `<span style="color:var(--crit)">${esc(c.now)}</span><div class="muted" style="font-family:var(--font);font-size:11px">rumus · tidak ditimpa</div>` : c.act === 'SELESAI' ? `${esc(c.now)}<div class="muted" style="font-family:var(--font);font-size:11px">CLOSE · sudah tertulis</div>` : esc(c.now) || '<span class="dim">(kosong)</span>'}</td>`).join('') : `<td colspan="${kolTulis.length}" class="muted" style="font-size:12px">${r.st === 'BARU' ? 'Tidak ditulis. Daftarkan di SKM (atau aliaskan bila beda penulisan); Antrian otomatis menyusul di F4b.' : r.st === 'MULTI' ? 'Sel kunci berisi dua nomor; tidak ditulis.' : 'Baris total / bukan kontrak; dilewati.'}</td>`}
       <td style="min-width:150px"><span class="pill ${ACT[r.st][0]}" style="white-space:normal">${ACT[r.st][1]}</span></td></tr>`).join('') || `<tr><td colspan="${kolTulis.length + 3}" class="muted" style="text-align:center;padding:20px">Tidak ada baris di kategori ini.</td></tr>`}</tbody></table></div>`}
     ${res.alarms.filter(a => !['KOLOM_BERUBAH', 'TAB_BERGANTI'].includes(a.j)).map(a => `<div class="note ${a.j === 'DIUBAH_LUAR' ? 'warn' : 'crit'}">${ic('warn', 's')}<span class="tx"><b>${a.j}</b> · baris ${a.b} · ${esc(a.txt)}</span></div>`).join('')}
    </div>` : ''}
  </div>`; }).join('')}
  <div class="card"><h2>Riwayat sinkron <small>Cek saja & Update · disimpan per bulan di file Log</small></h2><div class="tbl-wrap"><table class="t"><thead><tr><th>Waktu</th><th>Oleh</th><th>Jenis</th><th>Target · tab</th><th class="num">Cocok</th><th class="num">Ditulis</th><th class="num">Alarm</th><th>Catatan</th></tr></thead><tbody>
   ${SYNCLOG.slice(0, 12).map(x => `<tr><td class="tnum">${x[0]}</td><td>${esc(x[1])}</td><td><span class="pill ${x[2] === 'UPDATE' ? 'p-acc' : x[2] === 'BATAL' ? 'p-crit' : 'p-dim'}">${x[2]}</span></td><td>${esc(TARGETS.find(t => t.id === x[3]).nama.split(' ')[0])} · ${esc(x[4])}</td><td class="num">${x[5]}</td><td class="num">${x[6]}</td><td class="num">${x[8]}</td><td class="muted" style="font-size:12px">${esc(x[9])}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function bindGsheet() {
  const $$ = s => document.querySelectorAll('#content ' + s);
  $$('[data-tes]').forEach(b => b.onclick = () => { const t = TARGETS.find(x => x.id === b.dataset.tes), sm = SIM[t.id]; langkahProgres('Tes koneksi ' + t.nama, ['Memanggil script penerima', 'Memeriksa kode rahasia & versi script', 'Membaca daftar tab & judul kolom'], () => toast(`Terhubung · script v${t.ver} (terbaru) · ${sm.tabs.length} tab · tab dipakai ${t.tab}`)); });
  $$('[data-cek]').forEach(b => b.onclick = () => { const t = TARGETS.find(x => x.id === b.dataset.cek); langkahProgres('Cek saja · ' + t.nama, ['Membaca judul kolom & kolom kunci', 'Mencocokkan nomor kontrak', 'Menghitung nilai yang akan ditulis'], () => { S.cek[t.id] = true; const r = cekTarget(t); t.cek = NOW(); SYNCLOG.unshift([t.cek, me(), 'CEK', t.id, t.tab, r.nCocok || 0, 0, 0, r.alarms.length, r.batal ? 'Tab dilewati: ' + r.alarms[0].j : '']); if (r.batal) { t.st = 'ALARM'; t.pesan = 'KOLOM_BERUBAH: tab dilewati'; } renderPage(false); toast('Cek saja selesai. Tidak ada yang ditulis.'); }); });
  $$('[data-cf]').forEach(b => b.onclick = () => { const [id, k] = b.dataset.cf.split('|'); S.cekF[id] = k; renderPage(false); });
  $$('[data-upd]').forEach(b => b.onclick = () => { const t = TARGETS.find(x => x.id === b.dataset.upd), res = cekTarget(t);
    modal('Update ke GSheet?', `<div>Akan menulis <b>${res.nTulis} sel</b> ke <b>${esc(t.nama)}</b>, tab <span class="mono">${esc(t.tab)}</span>, dalam satu panggilan.</div><div class="muted" style="font-size:12.5px">Script penerima mengunci sheet, membaca ulang judul kolom dan kolom kunci, lalu menulis. Bila judul berubah atau urutan baris bergeser, seluruh tab dibatalkan dan tidak ada yang ditulis. Sel berisi rumus, sel yang diubah di luar SKM, dan kontrak CLOSE yang sudah tertulis dilewati.</div>`,
      [{ l: 'Batal' }, { l: `Update ${res.nTulis} sel`, pri: true, fn: () => langkahProgres('Update ke ' + t.nama, ['Mengunci sheet unit', 'Membaca ulang judul kolom & kolom kunci', 'Menulis dalam satu batch', 'Mencatat riwayat push & jejak sel'], () => jalankanUpdate(t)) }]); });
  $$('[data-tabbaru]').forEach(b => b.onclick = () => { const t = TARGETS.find(x => x.id === b.dataset.tabbaru); const lama = t.tab; t.tab = t.baru; t.baru = null; t.st = 'OK'; t.pesan = 'Tab ' + t.tab + ' dipakai mulai ' + NOW(); SIM.T01.rows.forEach(r => { Object.keys(r.v).forEach(f => { if (f !== 'TGL_UPDATE') { const k = K.find(x => normKey(x.no) === normKey(r.raw)); if (k) SIM.T01.jejak[k.no + '|' + f] = r.v[f]; } }); });
    log(me(), 'TAB_BARU', 'Target', t.id, 'Tab', lama, t.tab, 'dikonfirmasi admin'); renderPage(false); toast('Tab ' + t.tab + ' dipakai. Nilai yang sudah ada dijadikan titik awal.'); });
  $$('[data-ubah]').forEach(b => b.onclick = () => { S.wiz = 3; S.tested = true; location.hash = '#wizard'; });
}
/* panel simulasi (hanya di mockup) */
function panelSimulasi() {
  const mb = document.querySelector('#mpanel .mb'); if (!mb || document.getElementById('simSheet')) return;
  const d = document.createElement('div'); d.id = 'simSheet';
  d.innerHTML = `<div class="lbl">Simulasi sheet Billcom</div><div class="chips" style="flex-wrap:wrap">
    <button data-sim="sisip">Sisipkan kolom</button><button data-sim="judul">Ganti judul kolom FF</button><button data-sim="urut">Urutkan ulang saat menulis</button>
    <button data-sim="tab">Tab bulan baru</button><button data-sim="manual">Edit manual sel</button><button data-sim="reset">Reset</button></div>`;
  mb.appendChild(d);
  d.querySelectorAll('[data-sim]').forEach(b => b.onclick = () => {
    const t = TARGETS[0], s = b.dataset.sim;
    if (s === 'sisip') { SIMF.sisip = !SIMF.sisip; toast(SIMF.sisip ? 'Pemilik sheet menyisipkan kolom sebelum kolom FF.' : 'Kolom sisipan dihapus.'); }
    if (s === 'judul') { SIMF.judul = !SIMF.judul; toast(SIMF.judul ? 'Judul "STATUS BAST FF" diganti menjadi "STATUS BAST".' : 'Judul dikembalikan.'); }
    if (s === 'urut') { SIMF.urut = true; toast('Update berikutnya ke Billcom akan menemukan urutan baris berubah.'); }
    if (s === 'tab') { t.baru = 'DES 2026'; t.st = 'ALARM'; t.pesan = 'Tab baru DES 2026 menunggu konfirmasi'; SIM.T01.tabs.splice(11, 0, 'DES 2026'); toast('Tab DES 2026 muncul di sheet Billcom.'); }
    if (s === 'manual') { SIM.T01.rows[0].v.KENDALA_UMUM = 'BAST DONE'; SIM.T01.rows[1].v.KENDALA_UMUM = 'BAST DONE'; SIM.T01.jejak['TEL.0719-0488/HK.810/DES-A1000000/2020|KENDALA_UMUM'] = SIM.T01.jejak['TEL.0719-0488/HK.810/DES-A1000000/2020|KENDALA_UMUM'] || nilaiPush(K.find(k => k.id === 'K-000002'), 'KENDALA_UMUM'); toast('Seseorang mengetik "BAST DONE" di kolom STATUS BAST FF baris 118–119.'); }
    if (s === 'reset') { location.reload(); return; }
    if (route() !== 'gsheet') location.hash = '#gsheet'; else renderPage(false);
  });
}
/* status sinkron di Dashboard & Perlu Perhatian */
function syncKartu() {
  return `<div class="card"><h2>Status sinkron ke sheet unit<span class="sp"></span>${can('sinkron.jalankan') ? `<a class="btn sm" href="#gsheet">Google Sheet ${ic('chevR', 's')}</a>` : ''}</h2><div class="syncs">${TARGETS.map(t => `<div class="sync"><span class="pulse ${t.st === 'OK' ? '' : 'warn'}"></span><div style="min-width:0;flex:1"><b>${esc(t.nama)}</b> <span class="pill p-dim" style="margin-left:4px">${t.mode === 'TERBARU' ? 'tab terbaru · ' : 'tab · '}${esc(t.tab)}</span><div class="muted" style="font-size:12.5px;margin-top:2px">${esc(t.pesan)}</div></div><div class="muted tnum" style="font-size:12px;text-align:right;white-space:nowrap">Cek ${t.cek}<br>Update ${t.upd}</div></div>`).join('')}</div><div class="muted" style="font-size:12px;margin-top:8px">Sinkron manual di F4a; otomatis tiap 15 menit mulai F4b.</div></div>`;
}
function syncPerhatian() {
  const it = [];
  TARGETS.forEach(t => { const r = cekTarget(t); r.alarms.forEach(a => it.push({ t, a })); });
  return `<div class="card"><h2><span style="width:10px;height:10px;border-radius:50%;background:var(--violet);box-shadow:0 0 10px var(--violet)"></span>Target error / sel diubah di luar SKM<span class="sp"></span><span class="pill p-dim tnum">${it.length}</span></h2>
   <div style="display:flex;flex-direction:column;gap:8px">${it.map(x => `<div class="attn" data-gs="1" tabindex="0" role="button"><span class="bar" style="background:var(--violet)"></span><div style="min-width:0;flex:1"><b>${esc(x.t.nama)}</b> <span class="pill ${x.a.j === 'DIUBAH_LUAR' ? 'p-warn' : 'p-crit'}" style="font-size:10.5px">${x.a.j}</span><div class="muted" style="font-size:12.5px">${x.a.b ? 'baris ' + x.a.b + ' · ' : ''}${esc(x.a.txt)}</div></div>${ic('chevR', 's')}</div>`).join('') || '<div class="muted" style="font-size:13px">Tidak ada.</div>'}</div></div>`;
}
/* Riwayat push di panel detail kontrak */
function riwayatPushKontrak(k) {
  const xs = RPUSH.filter(r => r.kid === k.id);
  const rows = TARGETS.map(t => ({ t, rs: SIM[t.id].rows.filter(r => normKey(r.raw) === normKey(k.no)) })).filter(x => x.rs.length);
  return `<div class="note ${rows.length ? 'info' : 'warn'}" style="margin-top:10px;font-size:12px">${ic('sync', 's')}<span class="tx">${rows.length ? rows.map(x => `<b>${esc(x.t.nama.split(' ')[0])}</b> tab ${esc(x.t.tab)} baris ${x.rs.map(r => r.b).join(', ')}`).join(' · ') + ' · ditulis lewat Update ke GSheet.' : 'Belum ditemukan di sheet unit mana pun (biasanya penulisan nomor berbeda → alias).'}</span></div>
   ${xs.length ? `<div class="tbl-wrap" style="margin-top:8px"><table class="t" style="font-size:12px"><thead><tr><th>Waktu</th><th>Sheet · baris</th><th>Kolom</th><th>Lama → baru</th></tr></thead><tbody>${xs.slice(0, 8).map(r => `<tr><td class="tnum">${r.w}</td><td>${esc(TARGETS.find(t => t.id === r.t).nama.split(' ')[0])} · ${r.b}</td><td>${esc(FIELD_LBL[r.f])}</td><td class="mono" style="font-size:11px"><span class="diff-old">${esc(r.lama) || '(kosong)'}</span> → <span class="diff-new">${esc(r.baru)}</span></td></tr>`).join('')}</tbody></table></div>` : ''}`;
}
