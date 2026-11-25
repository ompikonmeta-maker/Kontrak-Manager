/* ================= F3: Dashboard, Perlu Perhatian, Ctrl+K ================= */
Object.assign(S, { dMine: false, pMine: false, scopeUser: null, dash7: null, dash7Memuat: false });

/** STAFF (punya Alias PIC, tidak mengatur PIC orang lain) dibuka dengan "Milik saya"; ADMIN dengan Tim FF. */
function siapkanLingkup() {
  if (!S.me || S.scopeUser === S.me.username) return;
  S.scopeUser = S.me.username; S.dMine = S.pMine = !!S.me.alias && !can('pic.atur');
}
const kontrakAktif = () => semuaKontrak().filter(b => !KD.bool(b.k.Arsip));
const hariTahap = x => KD.hariSejak(x.TglTahapMulai, D.hariIni || hariIniStr());
const batasTahap = kode => Number((T(kode) || {}).BatasAgingHari) || 14;
const kendBatas = () => Number(D.cfg.KENDALA_BATAS_HARI) || 14;
const bastLewat = b => KD.bastOpen(b, D.ref).filter(x => { const h = hariTahap(x); return h !== null && h > batasTahap(x.KodeTahap); });
const PARSIAL_IMPORT = 'BAST parsial (dari data lama)';
const parsialImport = b => KD.hidup(b.bast).some(x => String(x.Keterangan).indexOf(PARSIAL_IMPORT) === 0);
function goKontrak(patch) { Object.assign(S.kf, { q: '', st: 'OPEN', quick: '', tahap: '', ku: '', pic: '', pop: '', seg: '', cust: '' }, patch); S.batas = 200; go('kontrak'); }

/* ---------------- Dashboard (§10) ---------------- */
function smoothPath(p) {
  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x},${p2.y}`;
  }
  return d;
}
function pipelineSvg(list) {
  const st = D.ref.tahap.filter(t => t.Aktif), open = list.filter(b => b.k.StatusKontrak === 'OPEN'), bulan = (D.hariIni || hariIniStr()).slice(0, 7);
  if (!st.length) return '';
  const n = st.length, x0 = 95, x1 = 905;
  const pts = st.map((t, i) => ({ t, x: n === 1 ? 500 : Math.round(x0 + (x1 - x0) * i / (n - 1)), y: i % 2 ? 92 : 132 }));
  const path = smoothPath([{ x: 10, y: 124 }].concat(pts, [{ x: 990, y: 106 }]));
  const nodes = pts.map((p, i) => {
    const t = p.t;
    const cnt = t.Penutup ? list.filter(b => b.k.StatusKontrak === 'CLOSE' && String(b.k.TglClose).slice(0, 7) === bulan).length : open.filter(b => b.k.TahapKontrak === t.Kode).length;
    const od = open.reduce((a, b) => a + bastLewat(b).filter(x => x.KodeTahap === t.Kode).length, 0);
    const r = 24 + Math.min(14, cnt * 2), ly = p.y + r + 22, parts = String(t.Label).split(' / ');
    return `<g class="pnode ${t.Penutup ? 'closer' : ''}" data-tahap="${esc(t.Kode)}" style="--d:${i}" tabindex="0" role="button" aria-label="${esc(t.Label)}: ${cnt} kontrak">
      <circle class="halo" cx="${p.x}" cy="${p.y}" r="${r + 10}"/>${od ? `<circle class="ring" cx="${p.x}" cy="${p.y}" r="${r + 6}"/>` : ''}
      <circle class="body" cx="${p.x}" cy="${p.y}" r="${r}"/><text class="cnt" x="${p.x}" y="${p.y + 8}" text-anchor="middle">${cnt}</text>
      <text class="lbl" x="${p.x}" y="${ly}" text-anchor="middle">${esc(parts[0])}</text>${parts[1] ? `<text class="lbl" x="${p.x}" y="${ly + 16}" text-anchor="middle">/ ${esc(parts[1])}</text>` : ''}
      <text class="sub ${od ? 'w' : ''}" x="${p.x}" y="${ly + (parts[1] ? 33 : 17)}" text-anchor="middle">${t.Penutup ? 'close bulan ini' : od ? od + ' lewat batas' : 'kontrak'}</text></g>`;
  }).join('');
  const bo = open.reduce((a, b) => a + KD.bastOpen(b, D.ref).length, 0), np = Math.max(6, Math.min(16, bo * 2)), dur = 18;
  const dots = REDUCED ? '' : Array.from({ length: np }, (_, i) => `<circle class="pt" r="${i % 3 ? 2.2 : 3.2}" opacity="${i % 3 ? .55 : .95}"><animateMotion dur="${dur}s" begin="-${(i * dur / np).toFixed(2)}s" repeatCount="indefinite" path="${path}"/></circle>`).join('');
  return `<svg class="pipe" viewBox="0 0 1000 250" role="img" aria-label="Alur BAST per tahap"><defs><linearGradient id="gTrail" x1="0" x2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0"/><stop offset=".25" stop-color="var(--accent)" stop-opacity=".55"/><stop offset=".85" stop-color="var(--violet)" stop-opacity=".55"/><stop offset="1" stop-color="var(--ok)" stop-opacity=".2"/></linearGradient></defs>
   <path class="track" d="${path}"/><path class="trail" d="${path}"/>${dots}${nodes}</svg>`;
}
function muatDash7(segarkan) {
  if (S.dash7Memuat || !can('dashboard.lihat')) return;
  S.dash7Memuat = true;
  call('dashboard.ringkas', segarkan ? { segarkan: true } : {}).then(r => { S.dash7 = r; }).catch(() => { S.dash7 = S.dash7 || { hari: [], user: [], gagal: true }; })
    .then(() => { S.dash7Memuat = false; const el = document.getElementById('timTbl'); if (el && S.page === 'beranda') { el.outerHTML = timTabel(); bindDash(); } });
}
function timTabel() {
  siapkanLingkup();
  const list = kontrakAktif(), open = list.filter(b => b.k.StatusKontrak === 'OPEN');
  const pics = picList().filter(p => !S.dMine || p === S.me.alias);
  const r7 = S.dash7, per = {}; ((r7 && r7.user) || []).forEach(u => { if (u.alias) per[u.alias] = u; });
  const team = pics.map(p => {
    const mine = open.filter(b => b.k.PIC === p), ag = { fresh: 0, warm: 0, stale: 0, cold: 0 };
    mine.forEach(b => { const h = agingKontrak(b); if (h !== null) ag[KD.bucket(h, agingBatas())]++; });
    return { p, open: mine.length, kend: mine.reduce((a, b) => a + KD.kendalaAktif(b).length, 0), lewat: mine.filter(b => bastLewat(b).length).length, ag, u: per[p] };
  });
  const noPic = S.dMine ? 0 : open.filter(b => !b.k.PIC).length;
  const upd = t => !r7 ? '<span class="bspin" style="width:12px;height:12px;color:var(--accent)"></span>' : !t.u ? '<span class="dim">0</span>'
    : `<div class="row" style="flex-wrap:nowrap;gap:10px"><span class="spark" title="Perubahan per hari, 7 hari terakhir">${t.u.n.map(v => `<i style="height:${4 + Math.min(18, v * 2)}px"></i>`).join('')}</span><b class="tnum">${t.u.n.reduce((a, b) => a + b, 0)}</b>${t.u.bantu ? `<span class="muted" style="font-size:12px;white-space:nowrap">· ${t.u.bantu} bantu</span>` : ''}</div>`;
  return `<div id="timTbl"><div class="tbl-wrap"><table class="t"><thead><tr><th>PIC</th><th class="num">Open</th><th class="num">Kendala</th><th class="num">Lewat batas</th><th>Aging</th><th>Update 7 hari</th></tr></thead><tbody>
    ${team.map(t => `<tr class="click" data-dpic="${esc(t.p)}"><td><div class="row" style="flex-wrap:nowrap">${avatarPic(t.p, 1)}<b>${esc(t.p)}</b></div></td><td class="num"><b>${t.open}</b></td>
      <td class="num">${t.kend ? `<span class="pill p-crit">${t.kend}</span>` : '<span class="dim">0</span>'}</td><td class="num">${t.lewat ? `<span class="pill p-warn">${t.lewat}</span>` : '<span class="dim">0</span>'}</td>
      <td><div class="agebar" title="≤${agingBatas()[0]}: ${t.ag.fresh} · ≤${agingBatas()[1]}: ${t.ag.warm} · ≤${agingBatas()[2]}: ${t.ag.stale} · lebih: ${t.ag.cold}">${['fresh', 'warm', 'stale', 'cold'].map(k => t.ag[k] ? `<i style="flex:${t.ag[k]};background:var(--${k})"></i>` : '').join('')}</div></td>
      <td>${upd(t)}</td></tr>`).join('') || `<tr><td colspan="6" class="muted" style="text-align:center;padding:20px">${S.dMine ? 'Akun Anda tidak punya Alias PIC, jadi tidak ada kontrak milik Anda.' : 'Belum ada user dengan Alias PIC.'}</td></tr>`}
    ${noPic ? `<tr class="click" data-dpic="__none"><td><div class="row" style="flex-wrap:nowrap">${avatarPic('', 1)}<b style="color:var(--warn)">Tanpa PIC</b></div></td><td class="num"><b>${noPic}</b></td><td></td><td></td><td></td><td class="muted" style="font-size:12px">Perlu ditugaskan</td></tr>` : ''}
   </tbody></table></div>
   <div class="row muted" style="font-size:11.5px;margin-top:8px">"Update 7 hari" diringkas server dari Log sekali per jam${r7 && r7.dibuat ? ' · terakhir ' + esc(String(r7.dibuat).slice(11, 16)) : ''}.<span class="sp"></span>${r7 ? '<button class="btn sm ghost" id="d7seg">Segarkan</button>' : ''}</div></div>`;
}
function viewDash() {
  if (!can('kontrak.lihat')) return `<div class="card"><h2>Belum ada menu untuk role Anda</h2><p class="muted">Hubungi admin bila Anda perlu melihat kontrak.</p></div>`;
  if (!D.siap) return '<div class="loading"><div class="spinner"></div>Memuat data aktif…</div>';
  siapkanLingkup();
  const mine = b => !S.dMine || b.k.PIC === S.me.alias;
  const AK = kontrakAktif().filter(mine), open = AK.filter(b => b.k.StatusKontrak === 'OPEN'), bulan = (D.hariIni || hariIniStr()).slice(0, 7);
  const bastOpen = open.reduce((a, b) => a + KD.bastOpen(b, D.ref).length, 0) + AK.filter(b => b.k.StatusKontrak !== 'OPEN').reduce((a, b) => a + KD.bastOpen(b, D.ref).length, 0);
  const nilai = open.reduce((a, b) => a + (Number(b.k.NilaiKontrak) || 0), 0);
  const kend = AK.reduce((a, b) => a + KD.kendalaAktif(b).length, 0), kendLama = AK.reduce((a, b) => a + KD.kendalaAktif(b).filter(x => (KD.hariSejak(x.Mulai, D.hariIni) || 0) > kendBatas()).length, 0);
  const closeN = AK.filter(b => b.k.StatusKontrak === 'CLOSE' && String(b.k.TglClose).slice(0, 7) === bulan).length;
  const ku = {}; open.forEach(b => { if (b.k.KendalaUmum) ku[b.k.KendalaUmum] = (ku[b.k.KendalaUmum] || 0) + 1; });
  const kuArr = Object.keys(ku).sort((a, b) => ku[b] - ku[a]), maxK = Math.max(1, ...kuArr.map(x => ku[x]));
  const warnaKu = v => { const r = D.ref.push.find(p => p.Nilai === v); const k = r ? r.Kondisi : ''; return k === 'CLOSE' ? 'var(--ok)' : k.indexOf('KENDALA') === 0 ? 'var(--crit)' : k === 'SISA_LOKASI' ? 'var(--warn)' : k === 'BELUM_ADA_BAST' ? 'var(--dim)' : 'var(--info)'; };
  const belum = open.filter(b => !KD.hidup(b.bast).length).length, sisa = open.filter(b => KD.statusKontrak(b, D.ref).menunggu).length;
  const kpi = (l, v, s, g, col) => `<div class="kpi"><svg class="glyph" viewBox="0 0 24 24"><path d="${IC[g] || IC.doc}"/></svg><div class="l">${l}</div><div class="v tnum" ${col ? `style="color:${col}"` : ''}>${v}</div><div class="s">${s}</div></div>`;
  const q = id => QUICK.find(x => x[0] === id)[2];
  const kual = [['nopic', 'Tanpa PIC', open.filter(q('nopic')).length, 'var(--warn)'], ['kurang', 'Data belum lengkap', open.filter(q('kurang')).length, 'var(--warn)'],
    ['verif', 'Perlu verifikasi (hasil import)', AK.filter(q('verif')).length, 'var(--info)'], ['lewat', 'BAST lewat batas aging', open.filter(b => bastLewat(b).length).length, 'var(--stale)'],
    ['kend', 'Ada kendala aktif', open.filter(q('kend')).length, 'var(--crit)']];
  if (!S.dash7 && !S.dash7Memuat) setTimeout(() => muatDash7(false), 0);
  return `<div class="row"><div class="seg" role="group" aria-label="Lingkup">${[[false, 'Tim FF'], [true, 'Milik saya']].map(([v, l]) => `<button data-dmine="${v}" class="${S.dMine === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${S.dMine && !S.me.alias ? '<span class="pill p-warn">Akun ini tidak punya Alias PIC</span>' : ''}<span class="sp"></span><span class="muted" style="font-size:12px">Dihitung di browser dari data aktif · ikut berubah saat ada simpan/sinkron</span></div>
  <div class="kpis">
   ${kpi('Kontrak OPEN', open.length.toLocaleString('id-ID'), `dari ${AK.length.toLocaleString('id-ID')} kontrak aktif`, 'doc')}
   ${kpi('BAST OPEN', bastOpen.toLocaleString('id-ID'), 'termasuk BAST/BAA parsial', 'flag')}
   ${kpi('Nilai kontrak OPEN', rpShort(nilai), `<span class="tnum">${rp(nilai)}</span>`, 'dash')}
   ${kpi('Kendala aktif', kend.toLocaleString('id-ID'), `${kendLama} lebih dari ${kendBatas()} hari`, 'warn', kend ? 'var(--crit)' : '')}
   ${kpi('Close bulan ini', closeN.toLocaleString('id-ID'), new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }), 'check', 'var(--ok)')}
  </div>
  <div class="card hero"><div class="row" style="position:relative"><div><div class="eyebrow">Alur BAST</div><h2 style="margin:4px 0 0">Kontrak OPEN per tahap</h2></div><span class="sp"></span>
   <span class="legend"><span><i style="background:var(--accent)"></i>klik tahap untuk melihat kontraknya</span><span><i style="background:transparent;border:2px dashed var(--warn);width:12px;height:12px;border-radius:50%"></i>ada BAST lewat batas</span></span></div>
   <div class="pipe-wrap">${pipelineSvg(AK)}</div>
   <div class="row" style="position:relative"><button class="chipf" data-dku="${esc((D.ref.push.find(p => p.Kondisi === 'BELUM_ADA_BAST') || {}).Nilai || '')}">Belum ada BAST <b>${belum}</b></button><button class="chipf" data-dku="${esc((D.ref.push.find(p => p.Kondisi === 'SISA_LOKASI') || {}).Nilai || '')}">Menunggu BAST lanjutan <b>${sisa}</b></button><span class="sp"></span><span class="muted" style="font-size:12px">Tahap kontrak = tahap BAST OPEN paling awal</span></div>
  </div>
  <div class="grid g64">
   <div class="card"><h2>Tim <small>kontrak OPEN per PIC</small><span class="sp"></span><span class="legend"><span><i style="background:var(--fresh)"></i>≤${agingBatas()[0]}</span><span><i style="background:var(--warm)"></i>≤${agingBatas()[1]}</span><span><i style="background:var(--stale)"></i>≤${agingBatas()[2]}</span><span><i style="background:var(--cold)"></i>&gt;${agingBatas()[2]} hari</span></span></h2>${timTabel()}</div>
   <div class="card"><h2>Kendala Umum <small>nilai yang akan tampil di sheet unit · kontrak OPEN</small></h2>
    <div class="hbars">${kuArr.map(v => `<div class="hb" data-dku="${esc(v)}" title="Lihat kontrak dengan nilai ini" role="button" tabindex="0"><span class="lbl mono" style="font-size:11px;font-weight:600">${esc(v)}</span><div class="track"><div class="fill" style="width:${ku[v] / maxK * 100}%;background:${warnaKu(v)}"></div></div><span class="n">${ku[v]}</span></div>`).join('') || '<div class="muted">Belum ada kontrak OPEN.</div>'}</div></div>
  </div>
  <div class="grid g2">
   <div class="card"><h2>Kualitas data <small>klik untuk membuka daftar terfilter</small><span class="sp"></span><button class="btn sm" data-go2="perhatian">Perlu Perhatian ${ic('chevR', 's')}</button></h2>
    <div class="utiles">${kual.map(([qk, l, n, c]) => `<button class="utile" data-dq="${qk}"><b class="tnum" style="color:${n ? c : 'var(--ok)'}">${n.toLocaleString('id-ID')}</b><span>${l}</span></button>`).join('')}</div></div>
   <div class="card" style="opacity:.65"><h2>Status sinkron ke sheet unit<span class="sp"></span><span class="pill p-dim">F4a</span></h2><div class="muted" style="font-size:13px">Setelah sinkron dibangun di F4a, kartu ini menampilkan setiap target Google Sheet: cek &amp; update terakhir, dan error.</div></div>
  </div>`;
}
function bindDash() {
  const $$c = s => document.querySelectorAll('#content ' + s);
  const pic = () => (S.dMine ? S.me.alias || '' : '');
  $$c('[data-dmine]').forEach(b => b.onclick = () => { S.dMine = b.dataset.dmine === 'true'; segarkanTampilan(); });
  $$c('[data-dq]').forEach(b => b.onclick = () => goKontrak({ quick: b.dataset.dq, pic: pic(), st: b.dataset.dq === 'verif' ? '' : 'OPEN' }));
  $$c('[data-dku]').forEach(b => { const fn = () => goKontrak({ ku: b.dataset.dku, pic: pic() }); b.onclick = fn; b.onkeydown = e => { if (e.key === 'Enter') fn(); }; });
  $$c('[data-dpic]').forEach(tr => tr.onclick = () => goKontrak({ pic: tr.dataset.dpic }));
  $$c('.pnode').forEach(g => { const fn = () => { const t = T(g.dataset.tahap); goKontrak(t && t.Penutup ? { st: 'CLOSE', pic: pic() } : { tahap: g.dataset.tahap, pic: pic() }); }; g.onclick = fn; g.onkeydown = e => { if (e.key === 'Enter') fn(); }; });
  const sg = document.getElementById('d7seg'); if (sg) sg.onclick = () => { const el = document.getElementById('timTbl'); S.dash7 = null; if (el) { el.outerHTML = timTabel(); } muatDash7(true); };
}

/* ---------------- Perlu Perhatian (§5.6) ---------------- */
function perhatianItems(milikSaya) {
  const it = [], mine = b => !milikSaya || b.k.PIC === S.me.alias;
  kontrakAktif().filter(mine).forEach(b => {
    const k = b.k, open = k.StatusKontrak === 'OPEN';
    bastLewat(b).forEach(x => it.push({ g: 'aging', b, txt: `${esc(x.BASTID)} di <b>${esc(labelTahap(x.KodeTahap))}</b> sudah <b>${hariTahap(x)} hari</b> (batas ${batasTahap(x.KodeTahap)})` }));
    KD.kendalaAktif(b).forEach(x => { const h = KD.hariSejak(x.Mulai, D.hariIni) || 0; if (h > kendBatas()) it.push({ g: 'kend', b, txt: `${esc(labelKendala(x.Jenis))} aktif <b>${h} hari</b>: ${esc(x.Keterangan)}` }); });
    if (!k.PIC && open) it.push({ g: 'pic', b, txt: 'Kontrak OPEN tanpa PIC', aksi: 'pic' });
    if (KD.bool(k.PerluVerifikasi)) it.push({ g: 'verif', b, txt: parsialImport(b) ? 'Hasil import · <b>BAST parsial</b>: lengkapi cakupan & BAST berikutnya saat verifikasi' : 'Data hasil import belum diverifikasi' + (k.StatusKontrak === 'CLOSE' ? ' · sudah CLOSE' : ''), aksi: 'verif' });
    const m = KD.fieldKurang(b, D.cfg); if (m.length && open) it.push({ g: 'lengkap', b, txt: 'Belum diisi: ' + m.map(f => ({ Customer: 'Customer', EndCustomer: 'End customer', NilaiKontrak: 'Nilai kontrak', OrderInternal: 'SO/MI' })[f] || f).join(', '), aksi: 'lengkapi' });
  });
  return it;
}
function jumlahPerhatian() { if (!D.siap || !S.me) return 0; siapkanLingkup(); return perhatianItems(S.pMine).length; }
function viewPerhatian() {
  if (!D.siap) return '<div class="loading"><div class="spinner"></div>Memuat data aktif…</div>';
  siapkanLingkup();
  const it = perhatianItems(S.pMine), G = [['aging', 'BAST melewati batas aging tahap', 'var(--stale)'], ['kend', `Kendala aktif lebih dari ${kendBatas()} hari`, 'var(--crit)'], ['pic', 'Kontrak tanpa PIC', 'var(--warn)'],
    ['verif', 'Data import belum diverifikasi', 'var(--info)'], ['lengkap', 'Data kontrak belum lengkap', 'var(--warn)']];
  const tombol = x => x.aksi === 'pic' && can('pic.atur') ? `<select class="inp" data-ppic="${esc(x.b.k.KontrakID)}" aria-label="Atur PIC" style="padding:4px 8px;font-size:12.5px;width:auto">${opsi(picList(), '', 'Atur PIC…')}</select>`
    : x.aksi === 'verif' && can('kontrak.update') ? `<button class="btn sm ton" data-pverif="${esc(x.b.k.KontrakID)}">${ic('check', 's')}Periksa</button>`
    : x.aksi === 'lengkapi' && can('kontrak.update') ? `<button class="btn sm" data-plengkap="${esc(x.b.k.KontrakID)}">${ic('edit', 's')}Lengkapi</button>` : '';
  const MAKS = 50;
  return `<div class="row"><div class="seg" role="group" aria-label="Lingkup">${[[false, 'Semua'], [true, 'Milik saya']].map(([v, l]) => `<button data-pmine="${v}" class="${S.pMine === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <span class="muted" style="font-size:12.5px">${it.length.toLocaleString('id-ID')} hal perlu ditindaklanjuti${S.pMine ? ' untuk PIC ' + esc(S.me.alias || '(Anda bukan PIC)') : ''}</span></div>
  <div class="note info">${ic('warn', 's')}<span class="tx">Aging tidak pernah berhenti: hari terus bertambah selama BAST belum pindah tahap. Batas (per tahap, dan ${kendBatas()} hari untuk kendala) hanya menentukan kapan kontrak muncul di halaman ini.</span></div>
  <div class="grid g2">${G.map(([g, l, c]) => { const xs = it.filter(x => x.g === g); return `<div class="card"><h2><span style="width:10px;height:10px;border-radius:50%;background:${c};box-shadow:0 0 10px ${c};flex:none"></span>${l}<span class="sp"></span><span class="pill p-dim tnum">${xs.length}</span></h2>
   <div style="display:flex;flex-direction:column;gap:8px">${xs.slice(0, MAKS).map(x => `<div class="attn" data-pk="${esc(x.b.k.KontrakID)}" tabindex="0" role="button"><span class="bar" style="background:${c}"></span><div style="min-width:0;flex:1"><span class="mono" style="font-size:11.5px;overflow-wrap:anywhere">${esc(x.b.k.NoKontrak)}</span><div style="font-weight:600">${esc(custName(x.b.k))} <span class="muted" style="font-weight:400">· PIC ${esc(x.b.k.PIC || '—')}</span></div><div class="muted" style="font-size:12.5px">${x.txt}</div></div>${tombol(x)}</div>`).join('') || '<div class="muted" style="font-size:13px">Tidak ada.</div>'}
   ${xs.length > MAKS ? `<button class="btn sm ghost" data-pall="${g}">Lihat semua ${xs.length} di daftar kontrak</button>` : ''}</div></div>`; }).join('')}
   <div class="card" style="opacity:.6"><h2><span style="width:10px;height:10px;border-radius:50%;background:var(--dim)"></span>Beda data dengan sheet unit<span class="sp"></span><span class="pill p-dim">F4b</span></h2><div class="muted" style="font-size:13px">Muncul setelah koneksi ke sheet unit dibangun.</div></div>
   <div class="card" style="opacity:.6"><h2><span style="width:10px;height:10px;border-radius:50%;background:var(--dim)"></span>Target error / sel diubah di luar SKM<span class="sp"></span><span class="pill p-dim">F4a</span></h2><div class="muted" style="font-size:13px">Muncul setelah sinkron ke sheet unit dibangun.</div></div></div>`;
}
function bindPerhatian() {
  const $$c = s => document.querySelectorAll('#content ' + s), ids = () => [...new Set([...$$c('[data-pk]')].map(e => e.dataset.pk))];
  $$c('[data-pmine]').forEach(b => b.onclick = () => { S.pMine = b.dataset.pmine === 'true'; segarkanTampilan(); perbaruiBadge(); });
  $$c('[data-pk]').forEach(el => { const fn = e => { if (e && e.target.closest('select,button')) return; openDrawer(el.dataset.pk, ids()); }; el.onclick = fn; el.onkeydown = e => { if (e.key === 'Enter') fn(e); }; });
  $$c('[data-ppic]').forEach(s => { s.onclick = e => e.stopPropagation(); s.onchange = () => { if (!s.value) return; jalankanOp('kontrak.pic', s.dataset.ppic, { PIC: s.value }); toast(`${s.dataset.ppic} → PIC ${s.value}.`); segarkanTampilan(); perbaruiBadge(); }; });
  $$c('[data-pverif]').forEach(b => b.onclick = e => { e.stopPropagation(); openDrawer(b.dataset.pverif, ids()); S.dtab = 'data'; renderDrawer(false); toast('Periksa datanya, lengkapi bila perlu, lalu klik "Tandai terverifikasi".'); });
  $$c('[data-plengkap]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = kontrak(b.dataset.plengkap); if (k) openKontrakForm(k); });
  $$c('[data-pall]').forEach(b => b.onclick = () => goKontrak({ quick: { aging: 'lewat', kend: 'kend', pic: 'nopic', verif: 'verif', lengkap: 'kurang' }[b.dataset.pall], st: b.dataset.pall === 'verif' ? '' : 'OPEN', pic: S.pMine ? S.me.alias || '' : '' }));
}
function perbaruiBadge() { const c = document.querySelector('[data-cnt="perhatian"]'); if (!c) return; const n = jumlahPerhatian(); c.hidden = !n; c.textContent = n > 999 ? '999+' : n; }

/* ---------------- Ctrl+K: kontrak aktif, kontrak lama (arsip), perintah ---------------- */
let palT = null;
function openPalette() {
  if (!S.me || S.page === 'login' || S.page === 'ganti' || document.querySelector('.pal')) return;
  const d = document.createElement('div'); d.className = 'scrim pal'; let idx = 0, items = [], lama = { q: '', hasil: [], memuat: false };
  d.innerHTML = `<div class="modal" role="dialog" aria-label="Cari"><div class="ps">${ic('search')}<input id="palq" placeholder="Nomor kontrak, nomor lama, SO/MI, pelanggan, atau perintah…" autocomplete="off" aria-label="Cari"><kbd>Esc</kbd></div><div class="pr" id="palr"></div><div class="pf"><span><kbd>↑</kbd><kbd>↓</kbd> pilih</span><span><kbd>Enter</kbd> buka</span><span>kontrak lama di arsip ikut dicari</span></div></div>`;
  document.getElementById('overlay-root').appendChild(d);
  const q = d.querySelector('#palq'), r = d.querySelector('#palr');
  const close = () => { clearTimeout(palT); d.classList.add('closing'); setTimeout(() => d.remove(), 200); }; d._close = close;
  const CMD = [['tambah', 'Tambah kontrak', 'add', () => { go('kontrak'); openKontrakForm(null); }, 'kontrak.daftar'], ['upload', 'Upload Excel (template SKM)', 'up2', null, 'kontrak.import'],
    ['import', 'Import data lama (sheet FF)', 'dl', null, 'kontrak.import'], ['beranda', 'Dashboard', 'dash'], ['kontrak', 'Kontrak', 'doc', null, 'kontrak.lihat'], ['perhatian', 'Perlu Perhatian', 'warn', null, 'kontrak.lihat'],
    ['pengaturan', 'Tahap & aturan', 'gear', null, 'pengaturan.kelola'], ['users', 'Users', 'users', null, 'user.kelola'], ['sistem', 'Sistem', 'db', null, 'user.kelola']].filter(c => !c[4] || can(c[4]));
  const pick = () => { const it = items[idx]; if (!it) return; close(); if (it.type === 'k') { if (S.page !== 'kontrak' && S.page !== 'perhatian' && S.page !== 'beranda') go('kontrak'); openDrawer(it.id); } else if (it.type === 'lama') bukaLama(it.id); else if (it.fn) it.fn(); else go(it.id); };
  const cariLama = s => {
    clearTimeout(palT);
    if (s.length < 3 || !can('kontrak.lihat')) { lama = { q: '', hasil: [], memuat: false }; return; }
    if (lama.q === s) return;
    lama = { q: s, hasil: [], memuat: true };
    palT = setTimeout(async () => {
      try { const res = await call('arsip.cari', { q: s }); if (lama.q === s) lama = { q: s, hasil: res.hasil || [], memuat: false }; } catch (e) { lama = { q: s, hasil: [], memuat: false }; }
      if (d.isConnected) draw(true);
    }, 400);
  };
  const draw = keep => {
    const s = q.value.trim(), sl = s.toLowerCase();
    if (!keep) cariLama(s);
    const ks = D.siap && can('kontrak.lihat') ? (s ? kontrakAktif().filter(b => cocokCari(b, s)) : kontrakAktif().slice().sort((a, b) => (a.k.UpdatedAt < b.k.UpdatedAt ? 1 : -1))).slice(0, 6).map(b => ({ type: 'k', id: b.k.KontrakID, b })) : [];
    const aktifId = {}; kontrakAktif().forEach(b => { aktifId[b.k.KontrakID] = 1; });
    const ls = (lama.hasil || []).filter(h => !aktifId[h.KontrakID]).slice(0, 4).map(h => ({ type: 'lama', id: h.KontrakID, h }));
    const cs = CMD.filter(c => !s || c[1].toLowerCase().indexOf(sl) >= 0).slice(0, 4).map(c => ({ type: 'cmd', id: c[0], t: c[1], ic: c[2], fn: c[3] }));
    items = ks.concat(ls, cs); idx = Math.max(0, Math.min(idx, items.length - 1));
    r.innerHTML = items.map((it, i) => it.type === 'k' ? `<div class="pi ${i === idx ? 'on' : ''}" data-i="${i}">${avatarPic(it.b.k.PIC, 1)}<div style="min-width:0;flex:1"><div style="font-weight:700">${esc(custName(it.b.k))}</div><div class="mono" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.b.k.NoKontrak)}${s && aliasCocok(it.b, s) ? ' · nomor lama ' + esc(aliasCocok(it.b, s).NoAsli) : ''}</div></div>${tahapPill(it.b.k.TahapKontrak)}</div>`
      : it.type === 'lama' ? `<div class="pi ${i === idx ? 'on' : ''}" data-i="${i}">${avatarPic(it.h.PIC, 1)}<div style="min-width:0;flex:1"><div style="font-weight:700">${esc(it.h.EndCustomer || it.h.NamaPelanggan || '')} <span class="pill p-dim" style="font-size:10.5px">arsip ${esc(String(it.h.Lokasi).replace('ARSIP_', ''))}</span></div><div class="mono" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.h.NoKontrak)}${it.h.aliasCocok ? ' · nomor lama ' + esc(it.h.aliasCocok.NoAsli) : ''}</div></div><span class="pill p-dim">${esc(it.h.StatusKontrak || 'CLOSE')}</span></div>`
      : `<div class="pi ${i === idx ? 'on' : ''}" data-i="${i}">${ic(it.ic)}<div style="flex:1;font-weight:600">${esc(it.t)}</div><span class="muted" style="font-size:11.5px">${it.fn || ['upload', 'import'].indexOf(it.id) >= 0 ? 'perintah' : 'halaman'}</span></div>`).join('')
      + (lama.memuat ? '<div class="pi muted" style="cursor:default"><span class="bspin" style="color:var(--accent)"></span>Mencari juga di kontrak lama…</div>' : '')
      || '<div class="muted" style="padding:14px">Tidak ada yang cocok.</div>';
    r.querySelectorAll('[data-i]').forEach(el => { el.onmouseenter = () => { idx = +el.dataset.i; r.querySelectorAll('.pi').forEach((x, j) => x.classList.toggle('on', j === idx)); }; el.onclick = pick; });
  };
  q.oninput = () => { idx = 0; draw(); };
  q.onkeydown = e => { if (e.key === 'ArrowDown') { idx = Math.min(items.length - 1, idx + 1); draw(true); e.preventDefault(); } else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); draw(true); e.preventDefault(); } else if (e.key === 'Enter') { e.preventDefault(); pick(); } };
  d.addEventListener('click', e => { if (e.target === d) close(); });
  draw(); setTimeout(() => q.focus(), 30);
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && String(e.key).toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
});
