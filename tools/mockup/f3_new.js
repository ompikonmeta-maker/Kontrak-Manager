/* ================= F3: Import data lama, Perlu Perhatian, Ctrl+K ================= */

IC.shield = 'M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z';

/* ---------- Perlu Perhatian (§5.6) — fungsi ini menggantikan versi mockup awal ---------- */
S.pMine = false;
function perhatianItems() {
  const it = [], mine = k => !S.pMine || k.pic === meAlias();
  K.filter(k => !k.arsip && mine(k)).forEach(k => {
    const open = statusK(k).st === 'OPEN';
    k.bast.forEach(b => { if (!bastClose(b) && b.hari > tah(b.t).batas) it.push({ g: 'aging', k, txt: `${k.id}-B${b.n} di <b>${esc(tahLabel(b.t))}</b> sudah <b>${b.hari} hari</b> (batas ${tah(b.t).batas})`, aksi: 'buka' }); });
    activeKend(k).forEach(x => { if (x.hari > KBATAS) it.push({ g: 'kend', k, txt: `${esc((KREF.find(r => r.kode === x.j) || {}).label || x.j)} aktif <b>${x.hari} hari</b>: ${esc(x.ket)}`, aksi: 'buka' }); });
    if (!k.pic && open) it.push({ g: 'pic', k, txt: 'Kontrak OPEN tanpa PIC', aksi: 'pic' });
    if (k.verif) it.push({ g: 'verif', k, txt: k.parsialImport ? 'Hasil import · <b>BAST parsial</b> perlu dilengkapi saat verifikasi' : 'Data hasil import belum diverifikasi', aksi: 'verif' });
    const m = missingFields(k); if (m.length && open) it.push({ g: 'lengkap', k, txt: 'Belum diisi: ' + m.map(x => x[1]).join(', '), aksi: 'lengkapi' });
  });
  return it;
}
function viewPerhatian() {
  const it = perhatianItems();
  const G = [['aging', 'BAST melewati batas aging tahap', 'var(--stale)'], ['kend', `Kendala aktif lebih dari ${KBATAS} hari`, 'var(--crit)'], ['pic', 'Kontrak tanpa PIC', 'var(--warn)'],
             ['verif', 'Data import belum diverifikasi', 'var(--info)'], ['lengkap', 'Data kontrak belum lengkap', 'var(--warn)']];
  const tombol = x => x.aksi === 'pic' && can('pic.atur') ? `<select class="inp" data-ppic="${x.k.id}" aria-label="Atur PIC" style="padding:4px 8px;font-size:12.5px"><option value="">Atur PIC…</option>${PICS.map(p => `<option>${p}</option>`).join('')}</select>`
    : x.aksi === 'verif' && can('kontrak.update') ? `<button class="btn sm ton" data-pverif="${x.k.id}">${ic('check', 's')}Terverifikasi</button>`
    : x.aksi === 'lengkapi' && can('kontrak.update') ? `<button class="btn sm" data-plengkap="${x.k.id}">${ic('edit', 's')}Lengkapi</button>` : '';
  return `<div class="row"><div class="seg" role="group" aria-label="Lingkup">${[[false, 'Semua'], [true, 'Milik saya']].map(([v, l]) => `<button data-pmine="${v}" class="${S.pMine === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <span class="muted" style="font-size:12.5px">${it.length} hal perlu ditindaklanjuti${S.pMine ? ' untuk PIC ' + esc(meAlias() || '(Anda bukan PIC)') : ''}</span></div>
  <div class="note info">${ic('warn', 's')}<span class="tx">Aging tidak pernah berhenti: hari terus bertambah selama BAST belum pindah tahap. Batas (per tahap, dan ${KBATAS} hari untuk kendala) hanya menentukan kapan kontrak muncul di halaman ini. Semua dihitung di browser dari data aktif: instan.</span></div>
  <div class="grid g2">${G.map(([g, l, c]) => { const xs = it.filter(x => x.g === g); return `<div class="card"><h2><span style="width:10px;height:10px;border-radius:50%;background:${c};box-shadow:0 0 10px ${c}"></span>${l}<span class="sp"></span><span class="pill p-dim tnum">${xs.length}</span></h2>
   <div style="display:flex;flex-direction:column;gap:8px">${xs.map(x => `<div class="attn" data-open="${x.k.id}" tabindex="0" role="button"><span class="bar" style="background:${c}"></span><div style="min-width:0;flex:1"><span class="mono" style="font-size:11.5px">${esc(x.k.no)}</span><div style="font-weight:600">${esc(custName(x.k))} <span class="muted" style="font-weight:400">· PIC ${esc(x.k.pic || '—')}</span></div><div class="muted" style="font-size:12.5px">${x.txt}</div></div>${tombol(x)}</div>`).join('') || '<div class="muted" style="font-size:13px">Tidak ada. 👍</div>'}</div></div>`; }).join('')}
   <div class="card" style="opacity:.6"><h2><span style="width:10px;height:10px;border-radius:50%;background:var(--dim)"></span>Beda data dengan sheet unit<span class="sp"></span><span class="pill p-dim">F4b</span></h2><div class="muted" style="font-size:13px">Muncul setelah koneksi ke sheet unit dibangun.</div></div>
   <div class="card" style="opacity:.6"><h2><span style="width:10px;height:10px;border-radius:50%;background:var(--dim)"></span>Target error / sel diubah di luar SKM<span class="sp"></span><span class="pill p-dim">F4a</span></h2><div class="muted" style="font-size:13px">Muncul setelah sinkron ke sheet unit dibangun.</div></div></div>`;
}
function bindPerhatian() {
  const $$ = s => document.querySelectorAll('#content ' + s);
  $$('[data-pmine]').forEach(b => b.onclick = () => { S.pMine = b.dataset.pmine === 'true'; renderPage(false); });
  $$('[data-open]').forEach(el => { const go = e => { if (e && e.target.closest('select,button')) return; openDrawer(el.dataset.open); }; el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter') go(e); }; });
  $$('[data-ppic]').forEach(s => s.onchange = e => { e.stopPropagation(); const k = K.find(x => x.id === s.dataset.ppic); if (!s.value) return; k.pic = s.value; log(me(), 'ATUR_PIC', 'Kontrak', k.id, 'PIC', '', s.value, 'dari Perlu Perhatian'); renderPage(false); toast(`${k.id} → PIC ${s.value}.`); });
  $$('[data-pverif]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = K.find(x => x.id === b.dataset.pverif); openDrawer(k.id); S.dtab = 'data'; renderDrawer(false); toast('Periksa datanya, lalu klik "Tandai terverifikasi" di panel.'); });
  $$('[data-plengkap]').forEach(b => b.onclick = e => { e.stopPropagation(); openDrawer(b.dataset.plengkap); S.dtab = 'data'; renderDrawer(false); });
}

/* ---------- Ctrl+K: kontrak aktif, kontrak lama, perintah ---------- */
function openPalette() {
  if (document.querySelector('.pal')) return;
  const d = document.createElement('div'); d.className = 'scrim pal'; let idx = 0, items = [];
  d.innerHTML = `<div class="modal" role="dialog" aria-label="Cari"><div class="ps">${ic('search')}<input id="palq" placeholder="Nomor kontrak, nomor lama, SO/MI, pelanggan, atau perintah…" autocomplete="off" aria-label="Cari"><kbd>Esc</kbd></div><div class="pr" id="palr"></div><div class="pf"><span><kbd>↑</kbd><kbd>↓</kbd> pilih</span><span><kbd>Enter</kbd> buka</span><span>kontrak lama ikut dicari</span></div></div>`;
  document.getElementById('overlay-root').appendChild(d); const q = d.querySelector('#palq'), r = d.querySelector('#palr');
  const close = () => { d.classList.add('closing'); setTimeout(() => d.remove(), 200); }; d._close = close;
  const CMD = [['cmd-add', 'Tambah kontrak', 'add', () => openKontrakForm(null), 'kontrak.daftar'], ['cmd-up', 'Upload Excel (template SKM)', 'up2', () => { location.hash = '#kontrak-upload'; }, 'kontrak.daftar'],
    ['cmd-imp', 'Import data lama (sheet FF)', 'dl', () => { location.hash = '#kontrak-import'; }, 'kontrak.daftar'], ['dashboard', 'Dashboard', 'dash'], ['kontrak', 'Kontrak', 'doc'], ['perhatian', 'Perlu Perhatian', 'warn'],
    ['pengaturan', 'Pengaturan', 'gear', null, 'pengaturan.kelola']].filter(c => !c[4] || can(c[4]));
  const pick = () => { const it = items[idx]; if (!it) return; close(); if (it.type === 'k') openDrawer(it.id); else if (it.type === 'lama') openLama(it.id); else if (it.fn) it.fn(); else location.hash = '#' + it.id; };
  const draw = () => {
    const s = q.value.trim(), sl = s.toLowerCase();
    const cocok = k => !s || cocokCari(k, s) || k.orders.some(o => o.no.toLowerCase().includes(sl));
    const ks = K.filter(k => !k.arsip && cocok(k)).slice(0, 6).map(k => ({ type: 'k', id: k.id, k }));
    const ls = s.length >= 3 ? ARS.filter(cocok).slice(0, 3).map(k => ({ type: 'lama', id: k.id, k })) : [];
    const cs = CMD.filter(c => !s || c[1].toLowerCase().includes(sl)).slice(0, s ? 4 : 4).map(c => ({ type: 'cmd', id: c[0], t: c[1], ic: c[2], fn: c[3] }));
    items = [...ks, ...ls, ...cs]; idx = Math.max(0, Math.min(idx, items.length - 1));
    r.innerHTML = items.map((it, i) => it.type !== 'cmd' ? `<div class="pi ${i === idx ? 'on' : ''}" data-i="${i}">${avatar(it.k.pic, 1)}<div style="min-width:0;flex:1"><div style="font-weight:700">${esc(custName(it.k))}${it.type === 'lama' ? ` <span class="pill p-dim" style="font-size:10.5px">arsip ${it.k.lama}</span>` : ''}</div><div class="mono" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px">${esc(it.k.no)}${aliasCocok(it.k, s) ? ` · nomor lama ${esc(aliasCocok(it.k, s))}` : ''}</div></div>${tahapPill(tahapK(it.k))}</div>`
      : `<div class="pi ${i === idx ? 'on' : ''}" data-i="${i}">${ic(it.ic)}<div style="flex:1;font-weight:600">${esc(it.t)}</div><span class="muted" style="font-size:11.5px">${it.fn ? 'perintah' : 'halaman'}</span></div>`).join('') || '<div class="muted" style="padding:14px">Tidak ada yang cocok.</div>';
    r.querySelectorAll('[data-i]').forEach(el => { el.onmouseenter = () => { idx = +el.dataset.i; r.querySelectorAll('.pi').forEach((x, j) => x.classList.toggle('on', j === idx)); }; el.onclick = pick; });
  };
  q.oninput = () => { idx = 0; draw(); };
  q.onkeydown = e => { if (e.key === 'ArrowDown') { idx = Math.min(items.length - 1, idx + 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); draw(); e.preventDefault(); } else if (e.key === 'Enter') pick(); };
  d.addEventListener('click', e => { if (e.target === d) close(); });
  draw(); setTimeout(() => q.focus(), 30);
}

/* ---------- Import data lama (§11.1) ---------- */
const CONTOH_LAMA = [
  ['NO', 'NO WO/SPK/KL', 'TAHUN PROJECT', 'POPULASI', 'NAMA PELANGGAN', 'JUDUL KONTRAK', 'SEGMENT TSAT', 'STATUS AWAL', 'NILAI KONTRAK', 'KENDALA UMUM', 'KENDALA DETIL', 'PIC'],
  [1, 'TEL.0322-0041/P8/LG.270/DES-A2027000/2022.', 2022, 'TREG', 'BANK MEGA', 'Pengadaan VSAT IP 6 Lokasi', 'LBCS', 'BAST PARSIAL', 'Rp 95,352,000.00', 'BAST REVISI', 'BAST Revisi, hanya dua lokasi diproses, 4 lokasi belum', 'Edo'],
  [2, 'TEL.0623-0217/HK.810/DES-A1000000/2023 ', 2023, 'SDA', 'BANK TABUNGAN NEGARA Tbk', 'Komunikasi Data Satelit', 'GOS', 'KOMPULIR EVIDENCE', 'Rp 29,730,240,000.00', 'BAST ON REVIEW', 'REVIEW ADMIN PRM', 'Unggul'],
  [3, 'TEL.0224-0009/P8/LG.270/DES-A2020000/2024 ', 2024, 'PRM', 'PT ADARO LOGISTICS', 'Link Satelit Site Tambang', 'ENS', 'KOMPULIR EVIDENCE', 'Rp 206,952,000.00', 'KOMPULIR EVIDEN', 'KOMPULIR EVIDENCE', 'Baim'],
  [4, 'TEL.0424-0160/P8/LG.270/DES-A2020000/2024', 2024, 'DIRECT', 'PT Sawit Makmur Lestari', 'Internet Satelit Kebun', 'OLOS', 'KOMPULIR EVIDENCE', 'Rp 152,294,500.00', 'BAST DONE', 'Belum takeout menunggu AO SID', 'Alif'],
  [5, 'TEL.0525-0177/HK.810/DES-A1000000/2025', 2021, 'SDA', 'PT Mitra Energi Persada', 'VSAT Remote Wellsite', 'ENS', 'KOMPULIR EVIDENCE', 'Rp 1,840,500,000.00', 'SIRKULIR', '', 'Edo'],
  [6, 'WO/0188/TSAT/IX/2025', 2025, 'TELKOMSEL', 'PT Telkomsel', 'Backhaul 4 Site Sumbar', 'LBCS', 'KOMPULIR EVIDENCE', '780.000.000', 'SERTIM AR', 'sudah sertim', 'Rina'],
  [7, '', 2024, 'TREG', 'Pemkab Alor', 'Internet Kantor Desa', 'GOS', 'NUNGGU TTD', 'Rp 120,000,000.00', '', '', 'Baim'],
  [8, 'WO-0221/TSAT/IV/2025', 2025, 'TREG', 'Bank Rakyat Indonesia', 'Backup Link Satelit Kanca Papua', 'LBCS', 'BAST DONE', 'Rp 980,000,000.00', 'SERTIM AR', '', 'Edo'],
  [9, 'TEL.0820-0311/HK.810/DES-A1000000/2023', 2023, 'MARITIM', 'PT Samudera Nusantara', 'Maritime VSAT 4 Kapal', 'OLOS', 'NUNGGU TTD', 'Rp 410,000,000.00', '', 'Menunggu TTD direksi customer', 'Rizal'],
  [10, 'TEL.0719-0488/HK.810/DES-A1000000/2020', 2020, 'SDA', 'BANK DANAMON INDONESIA Tbk', 'Komunikasi Data Satelit', 'GOS', 'KOMPULIR EVIDENCE', 'Rp 29,730,240,000.00', 'BAST ON REVIEW', 'REVIEW ADMIN PRM', 'Unggul']
];
const F_IMP = [['no', 'No. kontrak', ['NO WO/SPK/KL', 'NO KONTRAK'], true], ['judul', 'Judul kontrak', ['JUDUL KONTRAK', 'JUDUL'], false], ['tahun', 'Tahun project', ['TAHUN PROJECT', 'TAHUN']],
  ['pop', 'Populasi', ['POPULASI', 'POP']], ['end', 'End customer', ['NAMA PELANGGAN', 'END CUSTOMER', 'PELANGGAN']], ['pel', 'Customer (direct)', ['CUSTOMER', 'NAMA CUSTOMER']],
  ['seg', 'Segment', ['SEGMENT TSAT', 'SEGMENT', 'SEG']], ['nilai', 'Nilai kontrak', ['NILAI KONTRAK', 'NILAI']], ['pic', 'PIC', ['PIC']],
  ['status', 'Status awal', ['STATUS AWAL', 'STATUS']], ['ku', 'Kendala umum (lama)', ['KENDALA UMUM']], ['detil', 'Kendala detil', ['KENDALA DETIL']]];
S.imp = { step: 1 };
function tebakNilaiLama(v) {
  const u = v.toUpperCase();
  if (/PARSIAL/.test(u)) return { jenis: 'parsial' };
  if (/REVISI/.test(u)) return { jenis: 'kendala', kode: 'REV_DOKUMEN' };
  if (/TAKEOUT|SERTIM/.test(u)) return { jenis: 'tahap', kode: 'TAKEOUT' };
  if (/BAST DONE/.test(u)) return { jenis: 'tahap', kode: 'BAST_DONE' };
  if (/SIRKULIR/.test(u)) return { jenis: 'tahap', kode: 'SIRKULIR', tebak: true };
  if (/REVIEW/.test(u)) return { jenis: 'tahap', kode: 'REVIEW_CUST' };
  if (/DRAFT/.test(u)) return { jenis: 'tahap', kode: 'DRAFTING', tebak: true };
  if (/KOMPULIR/.test(u)) return { jenis: 'tahap', kode: 'KOMPULIR' };
  return { jenis: 'lain' };
}
function mulaiImport(aoa, nama) {
  const h = aoa[0].map(x => String(x).trim()), map = {};
  F_IMP.forEach(([f, , al]) => { const i = h.findIndex(x => al.includes(x.toUpperCase())); map[f] = i; });
  const rows = aoa.slice(1).filter(r => r.some(v => String(v).trim() !== ''));
  S.imp = { step: 2, file: nama, h, rows, map, nilai: {}, pic: {}, ref: {}, f: 'all' };
  siapkanPeta();
  renderPage(false);
}
function siapkanPeta() {
  const I = S.imp, v = (r, f) => I.map[f] >= 0 ? String(r[I.map[f]] ?? '').trim() : '';
  const nilai = {}, pic = {}, pop = {}, seg = {};
  I.rows.forEach(r => {
    [v(r, 'status'), v(r, 'ku')].filter(Boolean).forEach(x => { const k = x.toUpperCase(); if (!(k in I.nilai)) I.nilai[k] = tebakNilaiLama(k); nilai[k] = (nilai[k] || 0) + 1; });
    const p = v(r, 'pic'); if (p) { if (!(p in I.pic)) I.pic[p] = PICS.find(x => x.toLowerCase() === p.toLowerCase()) || ''; pic[p] = (pic[p] || 0) + 1; }
    const po = v(r, 'pop'); if (po && !POPS.includes(po)) pop[po] = 1;
    const sg = v(r, 'seg'); if (sg && !SEGS.includes(sg)) seg[sg] = 1;
  });
  I.hitNilai = nilai; I.hitPic = pic;
  Object.keys(pop).forEach(x => { if (!(('Populasi:' + x) in I.ref)) I.ref['Populasi:' + x] = true; });
  Object.keys(seg).forEach(x => { if (!(('Segment:' + x) in I.ref)) I.ref['Segment:' + x] = true; });
}
function hasilImport() {
  const I = S.imp, v = (r, f) => I.map[f] >= 0 ? String(r[I.map[f]] ?? '').trim() : '', seen = {};
  return I.rows.map((r, i) => {
    const o = { baris: i + 2, err: [], warn: [], info: [], kend: [], parsial: false };
    o.no = v(r, 'no').replace(/\s+$/, ''); o.judul = v(r, 'judul'); o.end = v(r, 'end'); o.pel = v(r, 'pel'); o.detil = v(r, 'detil');
    if (!o.no) { o.err.push('No. kontrak kosong'); o.st = 'error'; return o; }
    const nk = normKey(o.no);
    if (seen[nk]) o.err.push('Nomor sama dengan baris ' + seen[nk]); else seen[nk] = o.baris;
    const ada = K.find(k => normKey(k.no) === nk || (k.alias || []).some(a => normKey(a) === nk)) || ARS.find(k => normKey(k.no) === nk || (k.alias || []).some(a => normKey(a) === nk));
    if (ada) { o.st = 'ada'; o.ada = ada; o.info.push(`Sudah terdaftar sebagai ${ada.id}${ada.lama ? ' (arsip ' + ada.lama + ')' : ''} · dilewati`); return o; }
    if (!o.judul) { o.judul = o.end ? 'Kontrak ' + o.end : o.no; o.warn.push('Judul kosong → diisi otomatis, lengkapi saat verifikasi'); }
    const n = String(v(r, 'nilai')).replace(/rp|\s/gi, ''); o.nilai = /^[\d.,]+$/.test(n) ? Number(/\.\d{2}$/.test(n) ? n.replace(/,/g, '').replace(/\.\d{2}$/, '') : n.replace(/[.,]/g, '')) : null;
    if (n && o.nilai === null) o.warn.push('Nilai "' + v(r, 'nilai') + '" tidak terbaca, dikosongkan');
    o.tahun = v(r, 'tahun'); o.pop = v(r, 'pop'); o.seg = v(r, 'seg');
    if (o.pop && !POPS.includes(o.pop)) { if (I.ref['Populasi:' + o.pop]) o.info.push('Populasi baru "' + o.pop + '" ditambahkan ke Referensi'); else { o.warn.push('Populasi "' + o.pop + '" dikosongkan'); o.pop = ''; } }
    if (o.seg && !SEGS.includes(o.seg)) { if (I.ref['Segment:' + o.seg]) o.info.push('Segment baru "' + o.seg + '" ditambahkan'); else { o.warn.push('Segment "' + o.seg + '" dikosongkan'); o.seg = ''; } }
    const p = v(r, 'pic'); o.pic = p ? I.pic[p] || '' : ''; if (p && !o.pic) o.warn.push('PIC "' + p + '" tidak dipetakan → tanpa PIC');
    o.jenis = /^TEL\.|^KL/i.test(o.no) ? 'KL' : /^WO/i.test(o.no) ? 'WO' : /^SPK/i.test(o.no) ? 'SPK' : '';
    // status awal + kendala umum lama → tahap (paling maju), kendala, parsial
    let tahap = null; const asal = [];
    [v(r, 'status'), v(r, 'ku')].filter(Boolean).forEach(x => {
      const m = I.nilai[x.toUpperCase()] || { jenis: 'lain' };
      if (m.jenis === 'tahap') { if (!tahap || tah(m.kode).urut > tah(tahap).urut) tahap = m.kode; asal.push(x + ' → ' + tahLabel(m.kode)); }
      else if (m.jenis === 'kendala') { o.kend.push({ j: m.kode, ket: o.detil || x }); asal.push(x + ' → kendala ' + KREF.find(k => k.kode === m.kode).label); }
      else if (m.jenis === 'parsial') { o.parsial = true; asal.push(x + ' → ditandai parsial'); }
      else if (m.jenis === 'lain') { o.kend.push({ j: 'LAINNYA', ket: x }); asal.push(x + ' → kendala lainnya'); }
    });
    o.tahap = tahap || TAHAP[0].kode; o.asal = asal;
    o.kAda = { id: 'BARU', no: o.no, pel: o.pel, end: o.end, judul: o.judul, lok: null, pic: o.pic, nilai: o.nilai, orders: [], verif: true,
      bast: [{ n: 1, doc: jenisCust({ pel: o.pel, end: o.end }) === 'DIRECT' ? 'BAA' : 'BAST', t: o.tahap, s: 1, cak: null, order: '', hari: 0, ket: o.kend.length ? '' : o.detil, dok: '' }],
      kend: o.kend.map((x, j) => ({ id: 'KD-I' + i + j, b: 1, j: x.j, ket: x.ket, st: 'AKTIF', hari: 0, oleh: 'import' })) };
    o.push = evalPush(o.kAda);
    if (!o.pel) o.info.push('Customer kosong → jenis customer BELUM TERDEFINISI');
    o.st = o.err.length ? 'error' : o.warn.length ? 'peringatan' : 'baru';
    return o;
  });
}
function viewImport() {
  const I = S.imp, step = I.step, st = n => `<div class="ustep">${['Pilih file', 'Pemetaan', 'Pratinjau', 'Selesai'].map((s, i) => `<div class="${i + 1 < n ? 'done' : i + 1 === n ? 'on' : ''}"><i>${i + 1 < n ? '✓' : i + 1}</i><span>${s}</span></div>`).join('<b></b>')}</div>`;
  if (step === 1) return `<div class="card" style="display:flex;flex-direction:column;gap:16px">${st(1)}
    <div class="grid g2"><label class="drop" id="impDrop" tabindex="0"><input type="file" id="impFile" accept=".xlsx" hidden><div class="uic big">${ic('dl')}</div><h3>Upload sheet FF lama (.xlsx)</h3><div class="muted">Sheet dengan kolom seperti <span class="mono">NO WO/SPK/KL</span>, <span class="mono">STATUS AWAL</span>, <span class="mono">KENDALA UMUM</span>, <span class="mono">PIC</span>. Kolom dikenali dari judulnya, lalu bisa dicocokkan manual.</div></label>
     <div class="ucard"><div class="uic">${ic('eye')}</div><div><h3>Coba dengan contoh</h3><div class="muted">Baris 1–4 memakai pola status Lampiran A (parsial + revisi, on review, kompulir, BAST done) dengan nomor baru, ditambah kasus khusus: langsung CLOSE (Sertim AR), nomor kosong, nomor lama di arsip, nomor yang sudah aktif, status tidak dikenal, populasi & PIC tidak dikenal.</div><div class="row" style="margin-top:12px"><button class="btn pri" id="impContoh">Pakai contoh Lampiran A</button></div></div></div></div>
    <div class="note info">${ic('shield', 's')}<span class="tx">Beda dengan <b>Upload Excel</b> (template SKM): import membaca format sheet FF lama apa adanya. Semua hasil import ditandai <b>perlu verifikasi</b> dan muncul di Perlu Perhatian sampai diperiksa PIC. Nomor yang sudah ada (termasuk arsip & nomor lama) dilewati.</span></div></div>`;
  if (step === 2) {
    const tahapOpt = TAHAP.map(t => [`tahap:${t.kode}`, 'Tahap · ' + t.label]), kendOpt = KREF.map(k => [`kendala:${k.kode}`, 'Kendala · ' + k.label]);
    const opsiNilai = [...tahapOpt, ...kendOpt, ['parsial', 'Tandai BAST parsial'], ['lain', 'Kendala Lainnya (keterangan = nilai asli)'], ['abaikan', 'Abaikan']];
    const nilaiKey = m => m.jenis === 'tahap' ? 'tahap:' + m.kode : m.jenis === 'kendala' ? 'kendala:' + m.kode : m.jenis;
    return `<div class="card" style="display:flex;flex-direction:column;gap:16px">${st(2)}<div class="row"><span class="pill p-dim">${ic('doc', 's')} ${esc(I.file)}</span><span class="muted">${I.rows.length} baris · ${I.h.length} kolom</span><span class="sp"></span><button class="btn sm" id="impGanti">Ganti file</button></div>
     <div class="grid g2">
      <div class="card"><h2>1. Kolom <small>dikenali dari judul; ubah bila salah</small></h2><div class="tbl-wrap"><table class="t"><thead><tr><th>Di SKM</th><th>Kolom di file</th></tr></thead><tbody>
       ${F_IMP.map(([f, l, , wajib]) => `<tr><td><b>${l}</b>${wajib ? ' <span class="pill p-crit" style="font-size:10px">wajib</span>' : ''}${f === 'end' ? '<div class="muted" style="font-size:11.5px">NAMA PELANGGAN = End customer (§11)</div>' : ''}</td><td><select class="inp" data-imap="${f}" style="width:100%"><option value="-1">— tidak ada —</option>${I.h.map((x, i) => `<option value="${i}" ${I.map[f] === i ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></div>
      <div style="display:flex;flex-direction:column;gap:16px">
       <div class="card"><h2>2. Nilai status lama <small>STATUS AWAL & KENDALA UMUM</small></h2><div class="tbl-wrap"><table class="t"><thead><tr><th>Nilai di file</th><th class="num">Baris</th><th>Jadi di SKM</th></tr></thead><tbody>
        ${Object.keys(I.hitNilai).map(k => `<tr><td class="mono" style="font-size:12px">${esc(k)}${I.nilai[k].tebak ? ' <span class="pill p-warn" style="font-size:10px">tebakan, cek</span>' : I.nilai[k].jenis === 'lain' ? ' <span class="pill p-dim" style="font-size:10px">tidak dikenal</span>' : ''}</td><td class="num">${I.hitNilai[k]}</td><td><select class="inp" data-inil="${esc(k)}" style="width:100%">${opsiNilai.map(([v, l]) => `<option value="${v}" ${nilaiKey(I.nilai[k]) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
        <div class="muted" style="font-size:12px;margin-top:8px">Bila status awal dan kendala umum menunjuk tahap berbeda, dipakai tahap yang paling maju. Keterangan kendala diambil dari KENDALA DETIL.</div></div>
       <div class="card"><h2>3. PIC <small>dicocokkan dengan Alias PIC di Users</small></h2>${Object.keys(I.hitPic).map(p => `<div class="row" style="margin-bottom:6px"><span class="mono" style="min-width:90px">${esc(p)}</span><span class="muted">${I.hitPic[p]} baris →</span><select class="inp" data-ipic="${esc(p)}"><option value="">— tanpa PIC —</option>${PICS.map(x => `<option ${I.pic[p] === x ? 'selected' : ''}>${x}</option>`).join('')}</select>${I.pic[p] ? '<span class="pill p-ok">cocok</span>' : '<span class="pill p-warn">tidak dikenal</span>'}</div>`).join('')}</div>
       ${Object.keys(I.ref).length ? `<div class="card"><h2>4. Referensi baru <small>nilai belum ada di Pengaturan</small></h2>${Object.keys(I.ref).map(k => `<label class="row" style="margin-bottom:6px;cursor:pointer"><input type="checkbox" class="chk" data-iref="${esc(k)}" ${I.ref[k] ? 'checked' : ''}><span>Tambahkan <b>${esc(k.split(':')[1])}</b> ke ${esc(k.split(':')[0])}</span></label>`).join('')}<div class="muted" style="font-size:12px">Tidak dicentang → kolom itu dikosongkan pada kontrak terkait.</div></div>` : ''}
      </div></div>
     <div class="row"><span class="sp"></span><button class="btn pri" id="impLanjut" ${I.map.no >= 0 ? '' : 'disabled'}>Lihat pratinjau ${ic('chevR', 's')}</button></div></div>`;
  }
  if (step === 3) {
    const H = hasilImport(), c = s => H.filter(o => o.st === s).length, flt = H.filter(o => I.f === 'all' || o.st === I.f), simpanN = c('baru') + c('peringatan');
    const tile = (f, n, l, cls) => `<button class="utile ${cls} ${I.f === f ? 'on' : ''}" data-if="${f}"><b class="tnum">${n}</b><span>${l}</span></button>`;
    return `<div class="card" style="display:flex;flex-direction:column;gap:14px">${st(3)}
     <div class="utiles">${tile('all', H.length, 'Semua baris', '')}${tile('baru', c('baru'), 'Siap diimport', 'ok')}${tile('peringatan', c('peringatan'), 'Diimport dengan catatan', 'warn')}${tile('ada', c('ada'), 'Sudah ada · dilewati', 'dim')}${tile('error', c('error'), 'Error', 'crit')}</div>
     <div class="tbl-wrap"><table class="t utbl"><thead><tr><th>Baris</th><th>Hasil</th><th style="min-width:240px">Kontrak</th><th>Dari status lama</th><th>Jadi di SKM</th><th style="min-width:220px">Catatan</th></tr></thead><tbody>
      ${flt.map(o => `<tr class="u-${o.st}"><td class="tnum muted">${o.baris}</td><td><span class="pill ${{ baru: 'p-ok', peringatan: 'p-warn', ada: 'p-dim', error: 'p-crit' }[o.st]}">${{ baru: 'Baru', peringatan: 'Baru · catatan', ada: 'Dilewati', error: 'Error' }[o.st]}</span></td>
        <td><span class="no">${esc(o.no) || '<span class="muted">(kosong)</span>'}</span><span class="sub">${esc(o.end || '')} · ${esc(o.judul || '')}</span>${o.pic ? `<span class="sub">PIC ${esc(o.pic)}</span>` : ''}</td>
        <td class="muted" style="font-size:12px">${(o.asal || []).map(esc).join('<br>')}</td>
        <td>${o.st === 'error' || o.st === 'ada' ? '<span class="muted">—</span>' : `${tahapPill(o.tahap)}${o.parsial ? ' <span class="pill p-warn">parsial</span>' : ''}<div style="margin-top:4px">${kuChip(o.push)}</div>${o.kend.length ? `<div class="muted" style="font-size:11.5px;margin-top:3px">${o.kend.map(k => esc(KREF.find(x => x.kode === k.j).label) + ': ' + esc(k.ket)).join('<br>')}</div>` : ''}`}</td>
        <td><ul class="umsg">${o.err.map(e => `<li class="e">${esc(e)}</li>`).join('')}${o.warn.map(e => `<li class="w">${esc(e)}</li>`).join('')}${o.info.map(e => `<li>${esc(e)}</li>`).join('')}</ul></td></tr>`).join('')}
     </tbody></table></div>
     <div class="bulk" style="position:sticky;bottom:12px"><b>${simpanN} kontrak akan diimport</b><span class="muted" style="font-size:12.5px">semua ditandai perlu verifikasi · ${c('ada')} dilewati · ${c('error')} error</span><span class="sp"></span><button class="btn sm" id="impKembali">Kembali ke pemetaan</button><button class="btn sm pri" id="impSimpan" ${simpanN ? '' : 'disabled'}>Import ${simpanN} kontrak</button></div></div>`;
  }
  const R = I.hasil;
  return `<div class="card" style="display:flex;flex-direction:column;gap:16px">${st(4)}
   <div class="udone"><div class="uic big ok">${ic('check')}</div><div><h3>Import selesai</h3><div class="muted">${esc(I.file)} · ${R.dibuat.length} kontrak masuk, semua <b>perlu verifikasi</b> · ${R.lewat} dilewati · ${R.err} error</div></div></div>
   <div class="row">${R.dibuat.map(id => { const k = K.find(x => x.id === id); return `<button class="chipf" data-openk="${id}"><b class="mono" style="font-size:11.5px">${id}</b> ${esc(custName(k))}</button>`; }).join('')}</div>
   <div class="row"><a class="btn pri" href="#perhatian">Buka Perlu Perhatian (verifikasi)</a><button class="btn" id="impLagi">Import file lain</button></div></div>`;
}
function bindImport() {
  const I = S.imp, $ = s => document.querySelector('#content ' + s), $$ = s => document.querySelectorAll('#content ' + s);
  if ($('#impContoh')) $('#impContoh').onclick = () => mulaiImport(CONTOH_LAMA, 'Contoh_Lampiran_A.xlsx');
  const f = $('#impFile'), drop = $('#impDrop');
  if (f) f.onchange = async () => { const x = f.files[0]; if (!x) return; if (!window.XLSX) { toast('Di mockup, pakai tombol contoh.'); return; } const wb = XLSX.read(await x.arrayBuffer(), { type: 'array' }); mulaiImport(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }), x.name); };
  if (drop) drop.onkeydown = e => { if (e.key === 'Enter') f.click(); };
  if ($('#impGanti')) $('#impGanti').onclick = () => { S.imp = { step: 1 }; renderPage(false); };
  $$('[data-imap]').forEach(s => s.onchange = () => { I.map[s.dataset.imap] = +s.value; I.nilai = {}; I.pic = {}; siapkanPeta(); renderPage(false); });
  $$('[data-inil]').forEach(s => s.onchange = () => { const v = s.value; I.nilai[s.dataset.inil] = v.indexOf(':') > 0 ? { jenis: v.split(':')[0], kode: v.split(':')[1] } : { jenis: v }; });
  $$('[data-ipic]').forEach(s => s.onchange = () => { I.pic[s.dataset.ipic] = s.value; renderPage(false); });
  $$('[data-iref]').forEach(c => c.onchange = () => { I.ref[c.dataset.iref] = c.checked; });
  if ($('#impLanjut')) $('#impLanjut').onclick = () => { I.step = 3; I.f = 'all'; renderPage(false); };
  if ($('#impKembali')) $('#impKembali').onclick = () => { I.step = 2; renderPage(false); };
  $$('[data-if]').forEach(b => b.onclick = () => { I.f = b.dataset.if; renderPage(false); });
  $$('[data-openk]').forEach(b => b.onclick = () => openDrawer(b.dataset.openk));
  if ($('#impLagi')) $('#impLagi').onclick = () => { S.imp = { step: 1 }; renderPage(false); };
  if ($('#impSimpan')) $('#impSimpan').onclick = () => {
    const H = hasilImport(), ok = H.filter(o => o.st === 'baru' || o.st === 'peringatan');
    langkahProgres('Mengimport ' + ok.length + ' kontrak', ['Menambah referensi baru', 'Membuat kontrak & BAST-1', 'Membuka kendala dari status lama', 'Menandai perlu verifikasi'], () => {
      Object.keys(I.ref).forEach(k => { if (!I.ref[k]) return; const [t, v] = k.split(':'); if (t === 'Populasi' && !POPS.includes(v)) POPS.push(v); if (t === 'Segment' && !SEGS.includes(v)) SEGS.push(v); });
      const dibuat = [];
      ok.forEach(o => {
        const id = 'K-' + String(K.length + 1).padStart(6, '0');
        K.push({ id, no: o.no, jenis: o.jenis, tahun: o.tahun ? Number(o.tahun) : null, pop: o.pop, pel: o.pel, end: o.end, judul: o.judul, seg: o.seg, nilai: o.nilai, lok: null, pic: o.pic,
          verif: true, sumber: 'IMPORT', parsialImport: o.parsial, alias: [], orders: [], bast: o.kAda.bast, kend: o.kAda.kend.map((k, j) => ({ ...k, id: 'KD-' + id.slice(-4) + j })),
          hist: [['baru saja', `<b>${esc(meName())}</b> mengimport dari ${esc(I.file)} baris ${o.baris}${o.asal.length ? ' · ' + esc(o.asal.join('; ')) : ''}`]] });
        dibuat.push(id);
      });
      log(me(), 'IMPORT_DATA_LAMA', 'Kontrak', '—', '', '', '', `${I.file}: ${dibuat.length} diimport, ${H.filter(o => o.st === 'ada').length} dilewati, ${H.filter(o => o.st === 'error').length} error`);
      I.hasil = { dibuat, lewat: H.filter(o => o.st === 'ada').length, err: H.filter(o => o.st === 'error').length }; I.step = 4; renderPage(false);
      toast(`${dibuat.length} kontrak diimport dan ditandai perlu verifikasi.`);
    });
  };
}
