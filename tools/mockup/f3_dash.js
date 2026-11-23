/* ---------- Dashboard (§5.5) — dihitung di browser dari data aktif ---------- */
S.dMine = false;
QUICK.push(['kurang', 'Data belum lengkap', k => missingFields(k).length > 0]);
function viewDash() {
  const mineF = k => !S.dMine || k.pic === meAlias();
  const AK = K.filter(k => !k.arsip && mineF(k)), open = AK.filter(k => statusK(k).st === 'OPEN');
  const bastOpen = AK.reduce((a, k) => a + k.bast.filter(b => !bastClose(b)).length, 0);
  const nilai = open.reduce((a, k) => a + (k.nilai || 0), 0);
  const kend = AK.reduce((a, k) => a + activeKend(k).length, 0), kendLama = AK.reduce((a, k) => a + activeKend(k).filter(x => x.hari > KBATAS).length, 0);
  const closeN = AK.filter(k => statusK(k).st === 'CLOSE').length, verifN = AK.filter(k => k.verif).length;
  const ku = {}; AK.forEach(k => { const p = evalPush(k); ku[p.umum] = (ku[p.umum] || 0) + 1; });
  const kuArr = RULES.filter(r => ku[r.v]).map(r => ({ r, n: ku[r.v] })), maxK = Math.max(1, ...kuArr.map(x => x.n));
  const sisa = open.filter(k => statusK(k).sisa).length, belum = open.filter(k => !k.bast.length).length;
  const lewatK = k => k.bast.some(b => !bastClose(b) && b.hari > tah(b.t).batas);
  const SP = { Edo: [2, 3, 1, 4, 2, 0, 2], Unggul: [1, 2, 2, 1, 3, 0, 0], Baim: [0, 1, 2, 0, 2, 0, 1], Alif: [2, 1, 3, 2, 1, 0, 2] };
  const team = PICS.filter(p => !S.dMine || p === meAlias()).map(p => {
    const mine = open.filter(k => k.pic === p); const ag = { fresh: 0, warm: 0, stale: 0, cold: 0 }; mine.forEach(k => { const h = agingK(k); if (h != null) ag[bucket(h)]++; });
    const sp = SP[p] || [0, 0, 0, 0, 0, 0, 0];
    return { p, open: mine.length, kend: mine.reduce((a, k) => a + activeKend(k).length, 0), lewat: mine.filter(lewatK).length, ag, sp, upd: sp.reduce((a, b) => a + b, 0) };
  });
  const noPic = S.dMine ? 0 : open.filter(k => !k.pic).length;
  const COL = { 'p-ok': 'var(--ok)', 'p-crit': 'var(--crit)', 'p-warn': 'var(--warn)', 'p-dim': 'var(--dim)', 'p-info': 'var(--info)' };
  const kpi = (l, v, s, g, fmt, col) => `<div class="kpi"><svg class="glyph" viewBox="0 0 24 24"><path d="${IC[g]}"/></svg><div class="l">${l}</div><div class="v tnum" ${col ? `style="color:${col}"` : ''} data-count="${v}" ${fmt ? `data-fmt="${fmt}"` : ''}>${fmt === 'rp' ? rpShort(v) : v}</div><div class="s">${s}</div></div>`;
  const kual = [['nopic', 'Tanpa PIC', open.filter(k => !k.pic).length, 'var(--warn)'], ['kurang', 'Data belum lengkap', open.filter(k => missingFields(k).length).length, 'var(--warn)'],
    ['verif', 'Perlu verifikasi (hasil import)', verifN, 'var(--info)'], ['lewat', 'BAST lewat batas aging', open.filter(lewatK).length, 'var(--stale)'], ['kend', `Ada kendala aktif`, open.filter(k => activeKend(k).length).length, 'var(--crit)']];
  return `<div class="row"><div class="seg" role="group" aria-label="Lingkup">${[[false, 'Tim FF'], [true, 'Milik saya']].map(([v, l]) => `<button data-dmine="${v}" class="${S.dMine === v ? 'on' : ''}">${l}</button>`).join('')}</div>${S.dMine && !meAlias() ? '<span class="pill p-warn">Akun ini tidak punya Alias PIC, jadi tidak ada kontrak milik Anda</span>' : ''}<span class="sp"></span><span class="muted" style="font-size:12px">Dihitung di browser dari data aktif · langsung berubah saat ada simpan/sinkron</span></div>
  <div class="kpis">
   ${kpi('Kontrak OPEN', open.length, `dari ${AK.length} kontrak aktif`, 'doc')}
   ${kpi('BAST OPEN', bastOpen, 'termasuk BAST/BAA parsial', 'flag')}
   ${kpi('Nilai kontrak OPEN', nilai, `<span class="tnum">${rp(nilai)}</span>`, 'dash', 'rp')}
   ${kpi('Kendala aktif', kend, `${kendLama} lebih dari ${KBATAS} hari`, 'warn', '', 'var(--crit)')}
   ${kpi('Close bulan ini', closeN, 'November 2026', 'check', '', 'var(--ok)')}
  </div>
  <div class="card hero"><div class="row" style="position:relative"><div><div class="eyebrow">Alur BAST</div><h2 style="margin:4px 0 0">Kontrak OPEN per tahap</h2></div><span class="sp"></span>
   <span class="legend"><span><i style="background:var(--accent)"></i>klik tahap untuk melihat kontraknya</span><span><i style="background:transparent;border:2px dashed var(--warn);width:12px;height:12px;border-radius:50%"></i>ada BAST lewat batas</span></span></div>
   <div class="pipe-wrap">${pipeline()}</div>
   <div class="row" style="position:relative"><button class="chipf" data-goku="BELUM DIPROSES">Belum ada BAST <b>${belum}</b></button><button class="chipf" data-goku="BAST PARSIAL - MENUNGGU SISA LOKASI">Menunggu BAST lanjutan <b>${sisa}</b></button><span class="sp"></span><span class="muted" style="font-size:12px">Tahap kontrak = tahap BAST OPEN paling awal (bottleneck)</span></div>
  </div>
  <div class="grid g64">
   <div class="card"><h2>Tim <small>kontrak OPEN per PIC</small><span class="sp"></span><span class="legend"><span><i style="background:var(--fresh)"></i>≤7</span><span><i style="background:var(--warm)"></i>8–14</span><span><i style="background:var(--stale)"></i>15–30</span><span><i style="background:var(--cold)"></i>&gt;30 hari</span></span></h2>
    <div class="tbl-wrap"><table class="t"><thead><tr><th>PIC</th><th class="num">Open</th><th class="num">Kendala</th><th class="num">Lewat batas</th><th>Aging</th><th>Update 7 hari</th></tr></thead><tbody>
    ${team.map(t => `<tr class="click" data-pic="${t.p}"><td><div class="row" style="flex-wrap:nowrap">${avatar(t.p, 1)}<b>${t.p}</b></div></td><td class="num"><b>${t.open}</b></td><td class="num">${t.kend ? `<span class="pill p-crit">${t.kend}</span>` : '<span class="dim">0</span>'}</td><td class="num">${t.lewat ? `<span class="pill p-warn">${t.lewat}</span>` : '<span class="dim">0</span>'}</td>
      <td><div class="agebar" title="≤7: ${t.ag.fresh} · 8–14: ${t.ag.warm} · 15–30: ${t.ag.stale} · >30: ${t.ag.cold}">${['fresh', 'warm', 'stale', 'cold'].map(b => t.ag[b] ? `<i style="flex:${t.ag[b]};background:var(--${b})"></i>` : '').join('')}</div></td>
      <td><div class="row" style="flex-wrap:nowrap;gap:10px"><span class="spark" title="Perubahan per hari, 7 hari terakhir (dari Log)">${t.sp.map(v => `<i style="height:${4 + v * 4.5}px"></i>`).join('')}</span><b class="tnum">${t.upd}</b></div></td></tr>`).join('')}
    ${noPic ? `<tr class="click" data-pic="__none"><td><div class="row" style="flex-wrap:nowrap">${avatar('', 1)}<b style="color:var(--warn)">Tanpa PIC</b></div></td><td class="num"><b>${noPic}</b></td><td></td><td></td><td></td><td class="muted" style="font-size:12px">Perlu ditugaskan</td></tr>` : ''}
    </tbody></table></div><div class="muted" style="font-size:11.5px;margin-top:8px">"Update 7 hari" diringkas server dari Log sekali per jam, jadi tidak memperlambat buka halaman.</div></div>
   <div class="card"><h2>Kendala Umum <small>nilai yang akan tampil di sheet unit</small></h2>
    <div class="hbars">${kuArr.map(x => `<div class="hb" data-goku="${esc(x.r.v)}" title="Lihat kontrak dengan nilai ini"><span class="lbl mono" style="font-size:11px;font-weight:600">${esc(x.r.v)}</span><div class="track"><div class="fill" style="width:${x.n / maxK * 100}%;background:${COL[kuClass({ r: x.r })]}"></div></div><span class="n">${x.n}</span></div>`).join('')}</div></div>
  </div>
  <div class="grid g2">
   <div class="card"><h2>Kualitas data <small>klik untuk membuka daftar terfilter</small><span class="sp"></span><a class="btn sm" href="#perhatian">Perlu Perhatian ${ic('chevR', 's')}</a></h2>
    <div class="utiles">${kual.map(([q, l, n, c]) => `<button class="utile" data-goq="${q}"><b class="tnum" style="color:${n ? c : 'var(--ok)'}">${n}</b><span>${l}</span></button>`).join('')}</div></div>
   <div class="card" style="opacity:.65"><h2>Status sinkron ke sheet unit<span class="sp"></span><span class="pill p-dim">F4a</span></h2><div class="muted" style="font-size:13px">Setelah sinkron dibangun di F4a, kartu ini menampilkan setiap target Google Sheet: cek & update terakhir, dan error.</div></div>
  </div>`;
}
function bindDash() {
  const $$ = s => document.querySelectorAll('#content ' + s);
  const goKontrak = patch => { S.f = { q: '', tahap: '', ku: '', pic: '', pop: '', seg: '', cust: '', st: 'OPEN', quick: '', ...patch }; location.hash = '#kontrak'; };
  $$('[data-dmine]').forEach(b => b.onclick = () => { S.dMine = b.dataset.dmine === 'true'; renderPage(false); });
  $$('[data-goq]').forEach(el => el.onclick = () => goKontrak({ quick: el.dataset.goq, pic: S.dMine ? meAlias() : '' }));
}
