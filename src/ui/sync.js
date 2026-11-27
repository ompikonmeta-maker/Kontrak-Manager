/* ================= F4a · Google Sheet: target, wizard, Cek saja, Update (§8) ================= */
Object.assign(S, { gs: null, gsCek: {}, gsF: {}, gsSibuk: {}, wz: null, posisi: {} });
const ACT_GS = { TULIS: ['p-acc', 'Tulis'], SAMA: ['p-dim', 'Sudah sama'], SELESAI: ['p-ok', 'CLOSE · tidak ditulis lagi'], LUAR: ['p-warn', 'Diubah di luar SKM · tidak ditimpa'],
  FORMULA: ['p-crit', 'Berisi rumus · tidak ditimpa'], TANPA_ATURAN: ['p-crit', 'Tanpa aturan Nilai Push'], MULTI: ['p-crit', 'Lebih dari satu nomor'], BARU: ['p-info', 'Belum terdaftar di SKM'],
  BUKAN: ['p-dim', 'Bukan nomor kontrak'], ARSIP: ['p-dim', 'Kontrak lama (arsip) · dilewati'], DIARSIPKAN: ['p-dim', 'Diarsipkan · dilewati'] };
const labelField = f => SKD.infoField(f)[1];
const statusPillGs = t => { const m = { OK: ['p-ok', 'OK'], PERINGATAN: ['p-warn', 'Ada alarm'], ALARM: ['p-crit', 'Perlu dicek'], ERROR: ['p-crit', 'Error'], BARU: ['p-dim', 'Belum dicek'] }[t.StatusTerakhir] || ['p-dim', t.StatusTerakhir || '—']; return `<span class="pill ${m[0]}">${m[1]}</span>`; };
const waktuPendek = w => w ? String(w).slice(5, 16).replace(/^(\d\d)-(\d\d)/, (_, m, d) => d + '/' + m) : '—';

/* ---------------- ringkasan untuk Dashboard, Perlu Perhatian, panel detail ---------------- */
function syncKartu() {
  const ts = (D.targets || []).filter(t => t.Aktif);
  return `<div class="card"><h2>Status sinkron ke sheet unit<span class="sp"></span>${can('sinkron.jalankan') ? `<button class="btn sm" data-go2="gsheet">Google Sheet ${ic('chevR', 's')}</button>` : ''}</h2>
   ${ts.length ? `<div class="syncs">${ts.map(t => `<div class="sync"><span class="pulse ${t.StatusTerakhir === 'OK' ? '' : 'warn'}"></span><div style="min-width:0;flex:1"><b>${esc(t.Nama)}</b> <span class="pill p-dim" style="margin-left:4px">${t.ModeTab === 'TERBARU' ? 'tab terbaru' : 'tab'} · ${esc(t.Tab || t.TabNama)}</span><div class="muted" style="font-size:12.5px;margin-top:2px">${esc(t.PesanTerakhir || '')}</div></div><div class="muted tnum" style="font-size:12px;text-align:right;white-space:nowrap">Cek ${waktuPendek(t.TerakhirCek)}<br>Update ${waktuPendek(t.TerakhirUpdate)}</div></div>`).join('')}</div>
   <div class="muted" style="font-size:12px;margin-top:8px">Sinkron dijalankan manual dari menu Google Sheet; otomatis tiap 15 menit mulai F4b.</div>`
   : `<div class="muted" style="font-size:13px">Belum ada sheet unit yang terhubung.${can('target.kelola') ? ' Tambahkan dari menu <b>Google Sheet</b>.' : ''}</div>`}</div>`;
}
function syncPerhatianItems() {
  const it = [];
  (D.targets || []).filter(t => t.Aktif).forEach(t => (t.alarm || []).forEach(a => it.push({ t, a })));
  return it;
}
function syncPerhatian() {
  const it = syncPerhatianItems();
  return `<div class="card"><h2><span style="width:10px;height:10px;border-radius:50%;background:var(--violet);box-shadow:0 0 10px var(--violet);flex:none"></span>Target error / sel diubah di luar SKM<span class="sp"></span><span class="pill p-dim tnum">${it.length}</span></h2>
   <div style="display:flex;flex-direction:column;gap:8px">${it.slice(0, 50).map(x => `<div class="attn" ${x.a.kid ? `data-pk="${esc(x.a.kid)}"` : 'data-gs="1"'} tabindex="0" role="button"><span class="bar" style="background:var(--violet)"></span><div style="min-width:0;flex:1"><b>${esc(x.t.Nama)}</b> <span class="pill ${x.a.j === 'DIUBAH_LUAR' ? 'p-warn' : 'p-crit'}" style="font-size:10.5px">${esc(x.a.j)}</span><div class="muted" style="font-size:12.5px">${x.a.r ? 'baris ' + esc(x.a.r) + ' · ' : ''}${esc(x.a.txt)}</div></div>${ic('chevR', 's')}</div>`).join('') || '<div class="muted" style="font-size:13px">Tidak ada.</div>'}</div>
   <div class="muted" style="font-size:12px;margin-top:8px">Diperbarui setiap Cek saja / Update.</div></div>`;
}
function posisiSheetHtml(kid) {
  if (!(D.targets || []).length) return `<div class="note info" style="margin-top:10px;font-size:12px">${ic('sync', 's')}<span class="tx">Belum ada sheet unit yang terhubung. Nilai di atas akan dikirim setelah target ditambahkan di menu Google Sheet.</span></div>`;
  const p = S.posisi[kid];
  if (!p) return `<div id="posSheet" class="muted" style="font-size:12px;margin-top:10px"><span class="bspin" style="width:10px;height:10px"></span> Memuat posisi di sheet unit…</div>`;
  return `<div id="posSheet" style="margin-top:10px;display:flex;flex-direction:column;gap:8px">${p.posisi.length ? p.posisi.map(x => `<div class="note info" style="font-size:12px">${ic('sync', 's')}<span class="tx"><b>${esc(x.Nama)}</b> · tab ${esc(x.Tab)} · baris ${x.Baris.map(esc).join(', ') || '—'} · terakhir ditulis ${esc(waktuPendek(x.Waktu))}${x.Nilai.KENDALA_UMUM ? ` · <span class="mono">${esc(x.Nilai.KENDALA_UMUM)}</span>` : ''}</span></div>`).join('')
    : `<div class="note warn" style="font-size:12px">${ic('warn', 's')}<span class="tx">Belum ditemukan di sheet unit yang sudah di-update (biasanya penulisan nomor berbeda → aliaskan, atau belum ada Update).</span></div>`}
   ${p.push.length ? `<details><summary class="muted" style="cursor:pointer;font-size:12px;font-weight:600">Riwayat di sheet unit bulan ini (${p.push.length})</summary><div class="tbl-wrap" style="margin-top:6px"><table class="t" style="font-size:12px"><thead><tr><th>Waktu</th><th>Sheet · baris</th><th>Kolom</th><th>Lama → baru</th></tr></thead><tbody>
     ${p.push.map(r => `<tr><td class="tnum">${esc(waktuPendek(r.Waktu))}</td><td>${esc((p.nama[r.TargetID] || r.TargetID).split(' ')[0])} · ${esc(r.Baris)}</td><td>${esc(labelField(r.Field))}</td><td class="mono" style="font-size:11px"><span class="diff-old">${esc(r.NilaiLama) || '(kosong)'}</span> → <span class="diff-new">${esc(r.NilaiBaru) || '(kosong)'}</span></td></tr>`).join('')}</tbody></table></div></details>` : ''}</div>`;
}
async function muatPosisi(kid) {
  if (!(D.targets || []).length || (S.posisi[kid] && Date.now() - S.posisi[kid].t < 60000)) return;
  try { const r = await call('target.posisi', { kid }); S.posisi[kid] = Object.assign(r, { t: Date.now() }); }
  catch (e) { S.posisi[kid] = { posisi: [], push: [], nama: {}, t: Date.now() }; }
  const el = document.getElementById('posSheet'); if (el && S.drawer === kid) el.outerHTML = posisiSheetHtml(kid);
}

/* ---------------- halaman Google Sheet ---------------- */
async function muatGs() { S.gs = await call('target.list'); }
function viewGsheet() {
  if (!S.gs) return '<div class="loading"><div class="spinner"></div>Memuat target…</div>';
  const G = S.gs, bolehUbah = can('target.kelola');
  return `<div class="row"><span class="muted" style="max-width:72ch">Setiap sheet unit memasang <b>script penerima SKM</b> sekali, oleh pemilik sheetnya. SKM hanya menulis kolom milik FF yang dipetakan, mengikuti <b>judul kolom</b> (bukan hurufnya), dan membatalkan seluruh tab bila judul atau urutan baris berubah.</span><span class="sp"></span>${bolehUbah ? `<button class="btn pri" id="gsAdd">${ic('add', 's')}Tambah target</button>` : ''}</div>
  <div class="note info">${ic('sync', 's')}<span class="tx">Di F4a sinkron dijalankan <b>manual</b>: <b>Cek saja</b> (pratinjau, tidak menulis) lalu <b>Update ke GSheet</b>. Sinkron otomatis tiap 15 menit, notifikasi, dan Antrian nomor baru menyusul di F4b.</span></div>
  ${G.targets.length ? G.targets.map(kartuTarget).join('') : `<div class="card" style="text-align:center;padding:36px"><div class="uic big" style="margin:0 auto 12px">${ic('sync')}</div><h3 style="margin:0 0 6px">Belum ada sheet unit</h3><div class="muted">Mulai dengan <b>Tambah target</b>: kirim script penerima ke pemilik sheet, lalu petakan kolomnya.</div></div>`}
  <div class="card"><h2>Riwayat sinkron <small>Cek saja &amp; Update · disimpan per bulan di file Log</small></h2>${G.log.length ? `<div class="tbl-wrap"><table class="t"><thead><tr><th>Waktu</th><th>Oleh</th><th>Jenis</th><th>Target · tab</th><th class="num">Cocok</th><th class="num">Ditulis</th><th class="num">Alarm</th><th>Catatan</th></tr></thead><tbody>
   ${G.log.map(x => { const t = G.targets.find(y => y.TargetID === x.TargetID); return `<tr><td class="tnum">${esc(waktuPendek(x.Waktu))}</td><td>${esc(namaUser(x.Oleh))}</td><td><span class="pill ${x.Jenis === 'UPDATE' ? 'p-acc' : x.Jenis === 'BATAL' ? 'p-crit' : 'p-dim'}">${esc(x.Jenis)}</span></td><td>${esc(t ? t.Nama : x.TargetID)} · ${esc(x.Tab)}</td><td class="num">${esc(x.BarisCocok)}</td><td class="num">${esc(x.SelDitulis)}</td><td class="num">${esc(x.Alarm)}</td><td class="muted" style="font-size:12px;max-width:340px">${esc(x.Detail)}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="muted">Belum ada.</div>'}</div>`;
}
function kartuTarget(t) {
  const res = S.gsCek[t.TargetID], f = S.gsF[t.TargetID] || 'semua', sib = S.gsSibuk[t.TargetID], tulis = t.kolom.filter(k => k.Arah === 'TULIS'), bolehUbah = can('target.kelola');
  const lama = t.VersiScript && Number(t.VersiScript) < S.gs.versiScript;
  return `<div class="card" style="display:flex;flex-direction:column;gap:14px;${t.Aktif ? '' : 'opacity:.6'}">
   <h2 style="flex-wrap:wrap"><span class="pulse ${t.StatusTerakhir === 'OK' ? '' : 'warn'}"></span>${esc(t.Nama)}${statusPillGs(t)}<span class="pill ${lama ? 'p-warn' : 'p-dim'}">script penerima v${esc(t.VersiScript || '?')}${lama ? ' · perlu diperbarui' : ''}</span>${t.Aktif ? '' : '<span class="pill p-dim">nonaktif</span>'}<span class="sp"></span>
    <button class="btn sm ghost" data-gtes="${t.TargetID}" ${sib ? 'disabled' : ''}>${ic('link', 's')}Tes koneksi</button><button class="btn sm" data-gcek="${t.TargetID}" ${sib ? 'disabled' : ''}>${sib === 'cek' ? '<span class="bspin"></span>Memeriksa…' : ic('eye', 's') + 'Cek saja'}</button>
    <button class="btn sm pri" data-gupd="${t.TargetID}" ${sib || !t.Aktif || t.TabBaru ? 'disabled' : ''} ${t.TabBaru ? 'title="Konfirmasi tab baru dulu"' : ''}>${sib === 'update' ? '<span class="bspin"></span>Menulis…' : ic('up2', 's') + 'Update ke GSheet'}</button>
    ${bolehUbah ? `<button class="iconbtn" data-gmenu="${t.TargetID}" aria-label="Aksi lain untuk ${esc(t.Nama)}">${ic('more')}</button>` : ''}</h2>
   <div class="grid g3" style="gap:12px 24px">
    <dl class="kv"><dt>Mode tab</dt><dd>${t.ModeTab === 'TERBARU' ? `Tab terbaru · pola <span class="mono">${esc(t.TabNama)}</span>` : 'Tab tetap'}</dd><dt>Tab dipakai</dt><dd class="mono">${esc(t.Tab || (t.ModeTab === 'FIXED' ? t.TabNama : '(ditentukan saat cek)'))}</dd><dt>File</dt><dd>${esc(t.NamaFile || '—')}</dd></dl>
    <dl class="kv"><dt>Cek terakhir</dt><dd class="tnum">${esc(waktuPendek(t.TerakhirCek))}</dd><dt>Update terakhir</dt><dd class="tnum">${esc(waktuPendek(t.TerakhirUpdate))}</dd><dt>Hasil terakhir</dt><dd>${esc(t.PesanTerakhir || '—')}</dd></dl>
    <div><div class="muted" style="font-size:12px;margin-bottom:6px">Kolom</div><div style="display:flex;flex-direction:column;gap:5px;font-size:12.5px">
     ${t.kolom.map(k => `<div${k.Arah === 'BACA' ? ' class="muted"' : ''}><span class="pill ${k.Arah === 'TULIS' ? 'p-acc' : k.Arah === 'KUNCI' ? 'p-warn' : 'p-dim'}" style="font-size:10.5px">${k.Arah}</span> ${esc(labelField(k.Field))} ${k.Arah === 'BACA' ? '←' : k.Arah === 'TULIS' ? '→' : '·'} <b>${esc(k.JudulHeader)}</b>${res && res.huruf && res.huruf[k.Field] ? ` <span class="mono dim">· ${res.huruf[k.Field]}</span>` : k.KolomTerakhir ? ` <span class="mono dim">· ${esc(k.KolomTerakhir)}</span>` : ''}</div>`).join('')}</div></div></div>
   ${t.TabBaru ? `<div class="note warn">${ic('warn', 's')}<span class="tx" style="flex:1"><b>TAB_BERGANTI</b> · Tab baru <b class="mono">${esc(t.TabBaru)}</b> terdeteksi (sekarang <span class="mono">${esc(t.Tab)}</span>). Update ditahan sampai dikonfirmasi. Saat dipakai, nilai yang sudah ada di tab baru dianggap titik awal.</span>${bolehUbah ? `<button class="btn sm pri" data-gtab="${t.TargetID}">Pakai tab baru</button>` : ''}</div>` : ''}
   ${res ? hasilCekHtml(t, res, f) : ''}
  </div>`;
}
function hasilCekHtml(t, res, f) {
  const tulis = res.tulis || [], n = res.n || {};
  const rowsF = res.rows.filter(r => f === 'semua' || (f === 'tulis' ? r.st === 'TULIS' : f === 'alarm' ? ['LUAR', 'FORMULA', 'MULTI', 'TANPA_ATURAN'].includes(r.st) : f === 'baru' ? r.st === 'BARU' : ['SAMA', 'SELESAI', 'ARSIP', 'DIARSIPKAN', 'BUKAN'].includes(r.st)));
  const besar = ['KOLOM_BERUBAH', 'TAB_BERGANTI'];
  return `<div style="display:flex;flex-direction:column;gap:10px;animation:rise .45s var(--ease) both">
   <div class="row"><b>${res.ditulis !== undefined ? 'Hasil Update' : 'Hasil Cek saja'}</b><span class="muted">· tab ${esc(res.tab || '—')}${res.hdrRow ? ' · judul di baris ' + res.hdrRow : ''}${res.ditulis !== undefined ? ' · <b>' + res.ditulis + ' sel ditulis</b>' : ' · tidak ada yang ditulis'}${res.titikAwal && res.ditulis === undefined ? ' · tab pertama kali dipakai: nilai yang ada jadi titik awal' : ''}</span><span class="sp"></span><button class="btn sm ghost" data-gtutup="${t.TargetID}">Tutup</button></div>
   ${res.batalTulis ? `<div class="note crit">${ic('warn', 's')}<span class="tx"><b>${esc(res.batalTulis.kode)}</b> · ${esc(res.batalTulis.pesan)}</span></div>` : ''}
   ${res.batal ? '' : `<div class="utiles">${[['semua', n.baris || 0, 'Baris dibaca', ''], ['tulis', res.ditulis !== undefined ? res.ditulis : n.tulis || 0, res.ditulis !== undefined ? 'Sel ditulis' : 'Sel akan ditulis', 'ok'], ['sama', (n.sama || 0) + (n.selesai || 0) + (n.arsip || 0), 'Sudah sama / selesai', 'dim'], ['alarm', (n.luar || 0) + (n.formula || 0) + (n.multi || 0), 'Tidak ditulis (alarm)', 'warn'], ['baru', n.baru || 0, 'Nomor belum terdaftar', 'crit']].map(([k, v, l, c]) => `<button class="utile ${c} ${f === k ? 'on' : ''}" data-gf="${t.TargetID}|${k}"><b class="tnum">${v}</b><span>${l}</span></button>`).join('')}</div>`}
   ${res.alarm.filter(a => besar.includes(a.j)).map(a => `<div class="note crit">${ic('warn', 's')}<span class="tx"><b>${esc(a.j)}</b> · ${esc(a.txt)}</span></div>`).join('')}
   ${(res.warn || []).length ? `<div class="note warn">${ic('warn', 's')}<span class="tx">Kolom BACA tidak ditemukan: ${res.warn.map(esc).join('; ')}. Tidak mengganggu penulisan.</span></div>` : ''}
   ${res.batal ? '' : `<div class="tbl-wrap"><table class="t"><thead><tr><th class="num">Baris</th><th style="min-width:220px">Kontrak</th>${tulis.map(fl => `<th style="min-width:160px">${esc(labelField(fl))}${res.huruf[fl] ? ` <span class="mono dim" style="font-weight:500">· ${res.huruf[fl]}</span>` : ''}</th>`).join('')}<th style="min-width:150px">Hasil</th></tr></thead><tbody>
    ${rowsF.slice(0, 300).map(r => { const k = r.kid && kontrak(r.kid); return `<tr><td class="num">${r.r}</td><td><span class="no" style="overflow-wrap:anywhere">${esc(r.raw)}</span>${r.kid ? `<span class="sub"><a href="#" data-gk="${esc(r.kid)}">${esc(r.kid)}</a>${k ? ' · ' + esc(custName(k.k)) : ''}</span>` : ''}</td>
     ${r.sel.length ? r.sel.map(c => `<td class="mono" style="font-size:11.5px">${c.act === 'TULIS' ? `<span class="diff-old">${esc(c.now) || '(kosong)'}</span><br>→ <span class="diff-new">${esc(c.next) || '(kosong)'}</span>${c.why ? `<div class="muted" style="font-family:var(--font);font-size:11px">${esc(c.why)}</div>` : ''}`
       : c.act === 'LUAR' ? `<span style="color:var(--warn)">${esc(c.now)}</span><div class="muted" style="font-family:var(--font);font-size:11px">SKM: ${esc(c.next)}</div>` : c.act === 'FORMULA' ? `<span style="color:var(--crit)">${esc(c.now) || '(rumus)'}</span><div class="muted" style="font-family:var(--font);font-size:11px">rumus · tidak ditimpa</div>` : esc(c.now) || '<span class="dim">(kosong)</span>'}</td>`).join('')
       : `<td colspan="${tulis.length}" class="muted" style="font-size:12px">${r.st === 'BARU' ? 'Tidak ditulis. Daftarkan di SKM atau aliaskan bila beda penulisan; Antrian otomatis menyusul di F4b.' : r.st === 'MULTI' ? 'Sel kunci berisi dua nomor; tidak ditulis.' : r.st === 'BUKAN' ? 'Bukan nomor kontrak; dilewati.' : 'Tidak ditulis.'}</td>`}
     <td><span class="pill ${(ACT_GS[r.st] || ['p-dim'])[0]}" style="white-space:normal">${(ACT_GS[r.st] || [0, r.st])[1]}</span></td></tr>`; }).join('') || `<tr><td colspan="${tulis.length + 3}" class="muted" style="text-align:center;padding:20px">Tidak ada baris di kategori ini.</td></tr>`}
    </tbody></table></div>${rowsF.length > 300 ? `<div class="muted" style="font-size:12px">Menampilkan 300 dari ${rowsF.length} baris.</div>` : ''}`}
   ${res.alarm.filter(a => !besar.includes(a.j)).slice(0, 30).map(a => `<div class="note ${a.j === 'DIUBAH_LUAR' ? 'warn' : 'crit'}">${ic('warn', 's')}<span class="tx"><b>${esc(a.j)}</b>${a.r ? ' · baris ' + a.r : ''} · ${esc(a.txt)}</span></div>`).join('')}
  </div>`;
}
function renderGs() { const c = document.getElementById('content'); if (!c || S.page !== 'gsheet') return; const sc = window.scrollY; c.innerHTML = viewGsheet(); bindGsheet(); window.scrollTo(0, sc); }
function bindGsheet() {
  const $$g = s => document.querySelectorAll('#content ' + s), cariT = id => S.gs.targets.find(t => t.TargetID === id);
  const jalan = async (id, jenis, fn) => { S.gsSibuk[id] = jenis; renderGs(); try { await fn(); } catch (e) { modalGagal(e); } finally { delete S.gsSibuk[id]; try { await muatGs(); } catch (e) { /* biarkan */ } renderGs(); muatUlangRefDiam(); } };
  if (document.getElementById('gsAdd')) document.getElementById('gsAdd').onclick = () => bukaWizard(null);
  $$g('[data-gtes]').forEach(b => b.onclick = () => jalan(b.dataset.gtes, 'tes', async () => { const i = await call('target.tes', { id: b.dataset.gtes });
    modal('Tes koneksi berhasil', `<dl class="kv"><dt>File</dt><dd>${esc(i.nama)}</dd><dt>Script penerima</dt><dd>v${i.versi}${i.versi < i.versiTerbaru ? ` <span class="pill p-warn">versi terbaru v${i.versiTerbaru}</span>` : ' · terbaru'}</dd><dt>Pencatat edit</dt><dd>${i.pencatat ? 'terpasang' : '<span style="color:var(--warn)">belum dipasang (minta pemilik menjalankan fungsi pasang)</span>'}</dd><dt>Tab</dt><dd>${i.tabs.map(x => esc(x.nama)).join(', ')}</dd></dl>`, [{ l: 'Tutup', pri: true }]); }));
  $$g('[data-gcek]').forEach(b => b.onclick = () => jalan(b.dataset.gcek, 'cek', async () => { S.gsCek[b.dataset.gcek] = await call('target.cek', { id: b.dataset.gcek }); S.gsF[b.dataset.gcek] = 'semua'; toast('Cek saja selesai. Tidak ada yang ditulis.'); }));
  $$g('[data-gupd]').forEach(b => b.onclick = () => { const t = cariT(b.dataset.gupd), res = S.gsCek[t.TargetID];
    modal('Update ke GSheet?', `<div>SKM memeriksa ulang <b>${esc(t.Nama)}</b>, lalu menulis kolom milik FF dalam satu kali kirim${res && res.n && res.ditulis === undefined ? ` (Cek saja terakhir: <b>${res.n.tulis} sel</b>)` : ''}.</div><div class="muted" style="font-size:12.5px">Script penerima mengunci sheet, membaca ulang judul kolom dan kolom nomor kontrak, lalu menulis. Bila judul berubah atau urutan baris bergeser, seluruh tab dibatalkan dan tidak ada yang ditulis. Sel berisi rumus, sel yang diubah di luar SKM, dan kontrak CLOSE yang sudah tertulis dilewati.</div>`,
      [{ l: 'Batal' }, { l: 'Update ke GSheet', pri: true, fn: () => { jalan(t.TargetID, 'update', async () => { const r = await call('target.update', { id: t.TargetID }); S.gsCek[t.TargetID] = r; S.gsF[t.TargetID] = 'tulis';
        toast(r.ditahan ? 'Update ditahan: ' + (r.alarm[0] ? r.alarm[0].j : 'alarm') + '. Tidak ada yang ditulis.' : r.batalTulis ? 'Update dibatalkan: ' + r.batalTulis.kode + '. Tidak ada yang ditulis.' : r.ditulis + ' sel ditulis ke ' + t.Nama + '.', !!(r.ditahan || r.batalTulis)); }); } }]); });
  $$g('[data-gtab]').forEach(b => b.onclick = () => { const t = cariT(b.dataset.gtab); modal('Pakai tab baru?', `<div>Mulai sekarang <b>${esc(t.Nama)}</b> memakai tab <b class="mono">${esc(t.TabBaru)}</b>. Nilai yang sudah ada di tab itu dianggap titik awal (tidak dianggap "diubah di luar SKM").</div>`,
    [{ l: 'Batal' }, { l: 'Pakai tab baru', pri: true, fn: () => { jalan(t.TargetID, 'tab', async () => { await call('target.tabBaru', { id: t.TargetID }); delete S.gsCek[t.TargetID]; toast('Tab ' + t.TabBaru + ' dipakai. Jalankan Cek saja lalu Update.'); }); } }]); });
  $$g('[data-gf]').forEach(b => b.onclick = () => { const [id, k] = b.dataset.gf.split('|'); S.gsF[id] = k; renderGs(); });
  $$g('[data-gtutup]').forEach(b => b.onclick = () => { delete S.gsCek[b.dataset.gtutup]; renderGs(); });
  $$g('[data-gk]').forEach(a => a.onclick = e => { e.preventDefault(); if (kontrak(a.dataset.gk)) openDrawer(a.dataset.gk); else bukaLama(a.dataset.gk); });
  $$g('[data-gmenu]').forEach(b => b.onclick = e => { e.stopPropagation(); closeMenu(); const t = cariT(b.dataset.gmenu), r = b.getBoundingClientRect(), m = document.createElement('div'); m.className = 'menu';
    m.style.cssText = `position:fixed;top:${r.bottom + 6}px;right:${Math.max(8, innerWidth - r.right)}px;z-index:60`;
    m.innerHTML = `<button data-m="ubah">${ic('edit', 's')}Ubah pemetaan & koneksi</button><button data-m="kode">${ic('key', 's')}Tampilkan kode rahasia</button><button data-m="aktif">${ic(t.Aktif ? 'x' : 'check', 's')}${t.Aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>`;
    document.body.appendChild(m);
    m.onclick = async ev => { const x = ev.target.closest('[data-m]'); if (!x) return; closeMenu();
      if (x.dataset.m === 'ubah') bukaWizard(t);
      if (x.dataset.m === 'kode') { try { const k = await call('target.rahasia', { id: t.TargetID }); modal('Kode rahasia · ' + esc(t.Nama), `<div class="code" id="kodeR" style="white-space:normal;max-height:none;font-size:14px">${esc(k.rahasia)}</div><div class="muted" style="font-size:12px">Hanya untuk pemilik sheet (diisi di baris SECRET script penerima). Melihat kode ini tercatat di Log.</div>`, [{ l: 'Salin', fn: () => { copyText(k.rahasia, 'Kode rahasia disalin.', document.getElementById('kodeR')); return false; } }, { l: 'Tutup', pri: true }]); } catch (e2) { modalGagal(e2); } }
      if (x.dataset.m === 'aktif') jalan(t.TargetID, 'aktif', async () => { await call('target.aktif', { id: t.TargetID, aktif: !t.Aktif }); toast(t.Aktif ? 'Target dinonaktifkan.' : 'Target diaktifkan.'); });
    }; });
}
function muatUlangRefDiam() { call('data.ref').then(x => { terimaRef(x.ref, x.cfg, x.users, x.targets); perbaruiBadge(); }).catch(() => {}); }

/* ---------------- wizard tambah / ubah target ---------------- */
const FMT_TGL = ['dd/MM/yyyy', 'dd-MMM-yyyy', 'yyyy-MM-dd'];
function bukaWizard(t) {
  S.wz = { step: 1, edit: t ? t.TargetID : '', version: t ? t.Version : '', rahasia: '', script: null, tes: null, header: null, hdrRow: Number(t && t.BarisHeader) || 0, cek: null, sibuk: '', jalankanUpdate: !t,
    t: t ? { Nama: t.Nama, WebAppUrl: t.WebAppUrl, ModeTab: t.ModeTab, TabNama: t.TabNama, CaraTerbaru: t.CaraTerbaru || 'TANGGAL_DI_NAMA', FormatTanggal: t.FormatTanggal || 'dd/MM/yyyy', AliasHeaderKunci: t.AliasHeaderKunci || '' }
      : { Nama: '', WebAppUrl: '', ModeTab: 'FIXED', TabNama: '', CaraTerbaru: 'TANGGAL_DI_NAMA', FormatTanggal: 'dd/MM/yyyy', AliasHeaderKunci: '' },
    map: {}, info: [] };
  if (t) t.kolom.forEach(k => { if (k.Field.indexOf('INFO:') === 0) S.wz.info.push([k.Field.slice(5), k.JudulHeader]); else S.wz.map[k.Field] = k.JudulHeader; });
  go('wizard');
}
const wzKoneksi = () => S.wz.edit && !S.wz.rahasia && !S.wz.t.WebAppUrlBaru ? { id: S.wz.edit } : { url: S.wz.t.WebAppUrl, rahasia: S.wz.rahasia, id: S.wz.edit || undefined };
function wzTab() { const W = S.wz; if (!W.tes) return ''; const tabs = W.tes.tabs.map(x => x.nama); return W.t.ModeTab === 'FIXED' ? (tabs.indexOf(W.t.TabNama) >= 0 ? W.t.TabNama : '') : SKD.pilihTab(tabs, W.t); }
function wzFields() {
  const tahap = (D.ref ? D.ref.tahap.filter(x => x.Aktif && !x.Penutup) : []).map(x => ['TGL_TAHAP:' + x.Kode, 'TULIS', 'Tanggal masuk ' + x.Label]);
  const base = SKD.FIELD.map(f => [f[0], f[1], f[2]]), i = base.findIndex(f => f[0] === 'PIC');
  return base.slice(0, i).concat(tahap, base.slice(i));
}
function wzKolom() {
  const W = S.wz, hdr = W.header && W.hdrRow ? W.header[W.hdrRow - 1] || [] : [], letter = j => { const i = hdr.findIndex(h => SKD.normHeader(h) === SKD.normHeader(j)); return i >= 0 ? SKD.huruf(i + 1) : ''; };
  const k = wzFields().filter(f => W.map[f[0]]).map(f => ({ Field: f[0], Arah: f[1], JudulHeader: W.map[f[0]], AliasHeader: f[0] === 'KUNCI' ? W.t.AliasHeaderKunci : '', KolomTerakhir: letter(W.map[f[0]]) }));
  return k.concat(W.info.filter(x => x[0] && x[1]).map(x => ({ Field: 'INFO:' + x[0], Arah: 'BACA', JudulHeader: x[1], AliasHeader: '', KolomTerakhir: letter(x[1]) })));
}
function viewWizard() {
  const W = S.wz; if (!W) return '<div class="muted">Tidak ada wizard yang terbuka.</div>';
  const L = ['Sheet & koneksi', 'Tab', 'Petakan kolom', 'Cek saja', 'Simpan'], st = W.step, sib = !!W.sibuk;
  let body = '', bisaLanjut = true;
  if (st === 1) {
    bisaLanjut = !!W.tes;
    body = `<label class="of"><span>Nama target</span><input class="inp" id="wNama" value="${esc(W.t.Nama)}" placeholder="mis. Billcom Telkomsat 2026" maxlength="80"></label>
    <div class="card" style="background:var(--surface2);box-shadow:none;display:flex;flex-direction:column;gap:16px">
     <div><b>Kirim ke pemilik sheet (sekali saja)</b><ol class="muted" style="font-size:12.5px;margin:6px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li>Buka sheet unit → <b>Extensions › Apps Script</b> → hapus isi Code.gs → tempel script dari tombol <b>Salin script penerima</b>.</li>
      <li>Isi <span class="mono">SECRET</span> di baris atas dengan kode rahasia di bawah. Simpan.</li>
      <li>Pilih fungsi <span class="mono">pasang</span> → <b>Run</b> → izinkan akses (memasang pencatat edit manual).</li>
      <li><b>Deploy › New deployment › Web app</b> · Execute as: <b>Me</b> · Who has access: <b>Anyone</b> → kirim URL berakhiran <span class="mono">/exec</span> ke FF.</li></ol></div>
     <div class="row"><button class="btn ton sm" id="wScript" ${sib ? 'disabled' : ''}>${ic('copy', 's')}Salin script penerima</button><span class="muted" style="font-size:12px">${W.script ? 'Script versi ' + W.script.versi + ' · ' + W.script.kode.split('\n').length + ' baris' : ''}</span></div>
     <div class="row" style="align-items:flex-end"><label class="of" style="flex:1 1 260px"><span>Kode rahasia</span><input class="inp mono" id="wRahasia" value="${esc(W.rahasia)}" placeholder="${W.edit ? '(tidak diubah — kosongkan untuk tetap memakai kode lama)' : 'klik Buat kode acak'}" autocomplete="off"></label>
      <button class="btn sm" id="wGen" ${sib ? 'disabled' : ''}>Buat kode acak</button>${W.rahasia ? `<button class="btn sm ghost" id="wCopyKode">${ic('copy', 's')}Salin kode</button>` : ''}</div>
     <label class="of"><span>Web App URL dari pemilik sheet</span><input class="inp mono" id="wUrl" value="${esc(W.t.WebAppUrl)}" placeholder="https://script.google.com/macros/s/…/exec" style="font-size:12.5px"></label>
     <div class="row"><button class="btn pri sm" id="wTes" ${sib ? 'disabled' : ''}>${W.sibuk === 'tes' ? '<span class="bspin"></span>Menghubungi…' : ic('link', 's') + 'Tes koneksi'}</button>${W.tes ? '' : '<span class="muted" style="font-size:12px">Wajib berhasil sebelum lanjut.</span>'}</div>
     ${W.tes ? `<div class="note ok">${ic('check', 's')}<span class="tx">Terhubung ke <b>${esc(W.tes.nama)}</b> · ${W.tes.tabs.length} tab · script v${W.tes.versi}${W.tes.versi < W.tes.versiTerbaru ? ' (versi terbaru v' + W.tes.versiTerbaru + ')' : ''} · pencatat edit ${W.tes.pencatat ? '<b>terpasang</b>' : '<b style="color:var(--warn)">belum dipasang</b>'}.</span></div>` : ''}
    </div>`;
  }
  if (st === 2) {
    const tabs = W.tes.tabs.map(x => x.nama), cocok = W.t.ModeTab === 'TERBARU' && W.t.TabNama ? SKD.tabCocok(tabs, W.t.TabNama) : [], dipakai = wzTab();
    bisaLanjut = !!dipakai;
    body = `<div class="choice"><label class="${W.t.ModeTab === 'FIXED' ? 'on' : ''}"><input type="radio" name="wm" value="FIXED" ${W.t.ModeTab === 'FIXED' ? 'checked' : ''}><span><b>Tab tetap</b><span class="muted" style="font-size:12.5px">Data selalu di tab yang sama.</span></span></label>
     <label class="${W.t.ModeTab === 'TERBARU' ? 'on' : ''}"><input type="radio" name="wm" value="TERBARU" ${W.t.ModeTab === 'TERBARU' ? 'checked' : ''}><span><b>Tab berganti tiap bulan</b><span class="muted" style="font-size:12.5px">Hanya tab bulan terbaru yang di-update.</span></span></label></div>
    ${W.t.ModeTab === 'TERBARU' ? `<div class="grid g2"><label class="of"><span>Pola nama tab</span><input class="inp mono" id="wPola" value="${esc(W.t.TabNama)}" placeholder="MMM YYYY"><small>MMM = nama bulan (NOV/Nov), MM = angka bulan, YYYY/YY = tahun. Contoh: <span class="mono">MMM YYYY</span> → NOV 2026.</small></label>
      <label class="of"><span>Cara menentukan terbaru</span><select class="inp" id="wCara"><option value="TANGGAL_DI_NAMA" ${W.t.CaraTerbaru !== 'POSISI_TERAKHIR' ? 'selected' : ''}>Baca bulan &amp; tahun dari nama tab</option><option value="POSISI_TERAKHIR" ${W.t.CaraTerbaru === 'POSISI_TERAKHIR' ? 'selected' : ''}>Tab cocok paling kanan</option></select></label></div>
     <div><div class="muted" style="font-size:12px;margin-bottom:8px">Tab yang cocok: ${cocok.length} dari ${tabs.length}</div><div class="row">${cocok.map(x => `<span class="pill ${x.nama === dipakai ? 'p-acc' : 'p-dim'} mono">${esc(x.nama)}${x.nama === dipakai ? ' · terbaru' : ''}</span>`).join('') || '<span class="muted">Belum ada tab yang cocok dengan pola.</span>'}</div>
      <div class="muted" style="font-size:12px;margin-top:8px">Tidak cocok: ${tabs.filter(n => !cocok.some(x => x.nama === n)).map(n => `<span class="mono">${esc(n)}</span>`).join(', ') || '—'}</div></div>`
    : `<label class="of"><span>Pilih tab</span><select class="inp" id="wTab">${opsi(tabs, W.t.TabNama, '— pilih tab —')}</select></label>`}`;
  }
  if (st === 3) {
    const H = W.header || [], hdr = W.hdrRow ? H[W.hdrRow - 1] || [] : [], cols = hdr.map((h, i) => [i, String(h || '').trim()]).filter(x => x[1]);
    const sample = j => { const i = hdr.findIndex(h => SKD.normHeader(h) === SKD.normHeader(j)); if (i < 0) return ''; return H.slice(W.hdrRow).map(r => r[i]).filter(Boolean).slice(0, 2).map(esc).join(' · '); };
    const sel = (attr, val) => `<select class="inp" ${attr} style="min-width:190px;width:100%"><option value="">— tidak dipakai —</option>${cols.map(([i, h]) => `<option value="${esc(h)}" ${SKD.normHeader(h) === SKD.normHeader(val) && val ? 'selected' : ''}>${SKD.huruf(i + 1)} · ${esc(h)}</option>`).join('')}</select>`;
    const kol = wzKolom(), err = SKD.validasi(kol);
    bisaLanjut = !err.length;
    body = `<div class="row"><span class="muted" style="font-size:13px;flex:1 1 300px">Judul kolom dibaca dari 15 baris teratas tab <span class="mono">${esc(wzTab())}</span>. Kolom dikenali dari <b>judul</b>, bukan dari hurufnya, jadi tetap benar walau pemilik sheet menyisipkan kolom.</span>
     <label class="of" style="width:170px"><span>Baris judul kolom</span><select class="inp" id="wHdr">${H.map((r, i) => `<option value="${i + 1}" ${W.hdrRow === i + 1 ? 'selected' : ''}>Baris ${i + 1}${(r || []).filter(Boolean).length ? '' : ' (kosong)'}</option>`).join('')}</select></label></div>
    <div class="tbl-wrap"><table class="t wzmap"><thead><tr><th>Field SKM</th><th>Arah</th><th style="min-width:200px">Kolom di sheet</th><th>Contoh isi</th></tr></thead><tbody>
     ${wzFields().map(([f, a, l]) => `<tr><td><b style="font-size:13px">${esc(l)}</b><div class="mono dim" style="font-size:11px">${esc(f)}</div></td><td><span class="pill ${a === 'TULIS' ? 'p-acc' : a === 'KUNCI' ? 'p-warn' : 'p-dim'}">${a}</span></td><td>${sel(`data-wmap="${esc(f)}" aria-label="Kolom untuk ${esc(l)}"`, W.map[f] || '')}</td><td class="muted" style="font-size:12px;max-width:260px">${W.map[f] ? sample(W.map[f]) : ''}</td></tr>`).join('')}
    </tbody></table></div>
    <div><div class="row"><div><div class="eyebrow">Info tambahan (BACA bebas)</div><div class="muted" style="font-size:12.5px">Kolom apa pun dari sheet ini yang ingin ikut tampil di detail kontrak (mis. Periode tagih, AM). Tidak pernah ditulis SKM; dipakai mulai F4b.</div></div><span class="sp"></span><button class="btn sm ton" id="wInfoAdd">${ic('add', 's')}Tambah kolom info</button></div>
     <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">${W.info.map(([l, h], i) => `<div class="row" style="flex-wrap:nowrap"><label class="of" style="flex:1"><span>Label di SKM</span><input class="inp" data-winfol="${i}" value="${esc(l)}"></label><div style="flex:1">${sel(`data-winfoh="${i}" aria-label="Kolom info ${i + 1}"`, h)}</div><button class="iconbtn" data-winfox="${i}" aria-label="Hapus">${ic('x', 's')}</button></div>`).join('')}</div></div>
    ${err.length ? err.map(e => `<div class="note crit">${ic('warn', 's')}<span class="tx">${esc(e)}</span></div>`).join('') : `<div class="note ok">${ic('check', 's')}<span class="tx">Pemetaan valid: ${kol.filter(k => k.Arah === 'TULIS').length} kolom TULIS, masing-masing ke judul kolom yang berbeda.</span></div>`}
    <div class="note info">${ic('link', 's')}<span class="tx"><b>Pengaman saat menulis:</b> setiap permintaan tulis membawa judul kolom yang diharapkan. Script penerima membaca ulang judul dan kolom nomor kontrak; kalau judul berubah, hilang, atau baris bergeser, seluruh penulisan tab dibatalkan (alarm <b>KOLOM_BERUBAH</b>).</span></div>
    <div class="grid g2"><label class="of"><span>Judul lain untuk kolom kunci (pisah koma, opsional)</span><input class="inp" id="wAlias" value="${esc(W.t.AliasHeaderKunci)}" placeholder="NO KL, NOMOR KONTRAK"></label>
     <label class="of"><span>Format tanggal yang ditulis</span><select class="inp" id="wFmt">${FMT_TGL.map(x => `<option ${W.t.FormatTanggal === x ? 'selected' : ''}>${x}</option>`).join('')}</select><small>Contoh hari ini: ${esc(SKD.fmtTanggal(D.hariIni || hariIniStr(), W.t.FormatTanggal))}</small></label></div>`;
  }
  if (st === 4) {
    const r = W.cek;
    body = !r ? `<div class="loading"><div class="spinner"></div>Menjalankan Cek saja…</div>` : `<div class="note info">${ic('eye', 's')}<span class="tx">Cek saja membaca sheet dan menunjukkan apa yang akan ditulis, <b>tanpa menulis apa pun</b>.</span></div>
     ${r.batal ? '' : `<div class="row"><span class="pill p-dim">${r.n.baris} baris dibaca</span><span class="pill p-ok">${r.n.cocok} cocok</span><span class="pill p-acc">${r.n.tulis} sel akan ditulis</span><span class="pill p-warn">${r.alarm.length} alarm</span><span class="pill p-info">${r.n.baru} nomor belum terdaftar</span></div>`}
     ${r.alarm.slice(0, 12).map(a => `<div class="note ${a.j === 'DIUBAH_LUAR' ? 'warn' : 'crit'}">${ic('warn', 's')}<span class="tx"><b>${esc(a.j)}</b>${a.r ? ' · baris ' + a.r : ''} · ${esc(a.txt)}</span></div>`).join('')}
     ${r.titikAwal && !r.batal ? `<div class="note ok">${ic('check', 's')}<span class="tx">Tab pertama kali dipakai: nilai yang ada dijadikan titik awal, tidak dianggap "diubah di luar SKM".</span></div>` : ''}
     ${r.batal ? `<div class="muted">Perbaiki pemetaan (Kembali) atau judul di sheet, lalu ulangi.</div>` : hasilCekHtml({ TargetID: 'WZ', kolom: wzKolom() }, r, S.gsF.WZ || 'tulis')}`;
    bisaLanjut = !!r && !r.batal;
  }
  if (st === 5) body = `<div class="note ok">${ic('check', 's')}<span class="tx">Konfigurasi siap: <b>${esc(W.t.Nama)}</b> · ${W.t.ModeTab === 'TERBARU' ? 'tab terbaru pola ' + esc(W.t.TabNama) : 'tab ' + esc(W.t.TabNama)} · ${wzKolom().filter(k => k.Arah === 'TULIS').length} kolom TULIS.</span></div>
    <label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" class="chk" id="wUpd" ${W.jalankanUpdate ? 'checked' : ''}> Jalankan <b>Update ke GSheet</b> sekarang juga</label>
    <div class="muted" style="font-size:12.5px">Di F4a sinkron berikutnya dijalankan manual dari halaman Google Sheet. Mulai F4b target ikut sinkron otomatis tiap 15 menit.</div>`;
  return `<div class="card" style="display:flex;flex-direction:column;gap:18px;max-width:980px">
   <div class="wiz-steps">${L.map((l, i) => `<span class="${i + 1 === st ? 'on' : i + 1 < st ? 'done' : ''}"><i>${i + 1 < st ? '✓' : i + 1}</i>${l}</span>`).join('')}</div>
   <div style="display:flex;flex-direction:column;gap:18px">${body}</div>
   <div class="row"><button class="btn" id="wBatal">Batal</button><span class="sp"></span>${st > 1 ? `<button class="btn" id="wPrev" ${sib ? 'disabled' : ''}>Kembali</button>` : ''}<button class="btn pri" id="wNext" ${!bisaLanjut || sib ? 'disabled' : ''}>${W.sibuk && W.sibuk !== 'tes' ? '<span class="bspin"></span>Memproses…' : st === 5 ? (W.edit ? 'Simpan perubahan' : 'Simpan & aktifkan') : 'Lanjut'}</button></div></div>`;
}
function renderWz() { const c = document.getElementById('content'); if (!c || S.page !== 'wizard') return; const sc = window.scrollY, a = document.activeElement, id = a && a.id, pos = a && a.selectionStart; c.innerHTML = viewWizard(); bindWizard(); window.scrollTo(0, sc); if (id) { const n = document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* select */ } } } }
function bindWizard() {
  const W = S.wz; if (!W) return;
  const $w = s => document.querySelector('#content ' + s), $$w = s => document.querySelectorAll('#content ' + s);
  const sibuk = async (jenis, fn) => { W.sibuk = jenis; renderWz(); try { await fn(); } catch (e) { modalGagal(e); } finally { W.sibuk = ''; renderWz(); } };
  $w('#wBatal').onclick = () => { S.wz = null; go('gsheet'); };
  if ($w('#wPrev')) $w('#wPrev').onclick = () => { W.step--; renderWz(); };
  if ($w('#wNama')) $w('#wNama').oninput = e => { W.t.Nama = e.target.value; };
  if ($w('#wUrl')) $w('#wUrl').oninput = e => { W.t.WebAppUrl = e.target.value.trim(); W.t.WebAppUrlBaru = true; W.tes = null; const n = $w('#wNext'); if (n) n.disabled = true; };
  if ($w('#wRahasia')) $w('#wRahasia').oninput = e => { W.rahasia = e.target.value.trim(); W.tes = null; const n = $w('#wNext'); if (n) n.disabled = true; };
  if ($w('#wScript')) $w('#wScript').onclick = () => sibuk('script', async () => { W.script = W.script || await call('target.script'); copyText(W.script.kode, 'Script penerima disalin. Tempel di Apps Script sheet unit.', null); });
  if ($w('#wGen')) $w('#wGen').onclick = () => sibuk('gen', async () => { W.rahasia = (await call('target.rahasiaBaru')).rahasia; W.tes = null; toast('Kode rahasia dibuat. Kirim ke pemilik sheet bersama script.'); });
  if ($w('#wCopyKode')) $w('#wCopyKode').onclick = () => copyText(W.rahasia, 'Kode rahasia disalin.', $w('#wRahasia'));
  if ($w('#wTes')) $w('#wTes').onclick = () => sibuk('tes', async () => { if (!W.t.Nama.trim()) throw { pesan: 'Isi nama target dulu.' }; W.tes = await call('target.tes', wzKoneksi()); toast('Koneksi berhasil.'); });
  $$w('input[name=wm]').forEach(x => x.onchange = () => { W.t.ModeTab = x.value; W.t.TabNama = x.value === 'TERBARU' ? (W.t.TabNama && /M/.test(W.t.TabNama) ? W.t.TabNama : 'MMM YYYY') : ''; W.header = null; renderWz(); });
  if ($w('#wPola')) $w('#wPola').oninput = e => { W.t.TabNama = e.target.value; W.header = null; clearTimeout(W.tm); W.tm = setTimeout(renderWz, 300); };
  if ($w('#wCara')) $w('#wCara').onchange = e => { W.t.CaraTerbaru = e.target.value; W.header = null; renderWz(); };
  if ($w('#wTab')) $w('#wTab').onchange = e => { W.t.TabNama = e.target.value; W.header = null; renderWz(); };
  if ($w('#wHdr')) $w('#wHdr').onchange = e => { W.hdrRow = +e.target.value; renderWz(); };
  $$w('[data-wmap]').forEach(s => s.onchange = () => { W.map[s.dataset.wmap] = s.value; renderWz(); });
  $$w('[data-winfoh]').forEach(s => s.onchange = () => { W.info[+s.dataset.winfoh][1] = s.value; renderWz(); });
  $$w('[data-winfol]').forEach(s => s.oninput = () => { W.info[+s.dataset.winfol][0] = s.value.trim(); });
  $$w('[data-winfox]').forEach(b => b.onclick = () => { W.info.splice(+b.dataset.winfox, 1); renderWz(); });
  if ($w('#wInfoAdd')) $w('#wInfoAdd').onclick = () => { W.info.push(['', '']); renderWz(); };
  if ($w('#wAlias')) $w('#wAlias').oninput = e => { W.t.AliasHeaderKunci = e.target.value; };
  if ($w('#wFmt')) $w('#wFmt').onchange = e => { W.t.FormatTanggal = e.target.value; renderWz(); };
  if ($w('#wUpd')) $w('#wUpd').onchange = e => { W.jalankanUpdate = e.target.checked; };
  $$w('[data-gf]').forEach(b => b.onclick = () => { S.gsF.WZ = b.dataset.gf.split('|')[1]; renderWz(); });
  $$w('[data-gk]').forEach(a => a.onclick = e => { e.preventDefault(); if (kontrak(a.dataset.gk)) openDrawer(a.dataset.gk); });
  $w('#wNext').onclick = () => {
    if (W.step === 1) { W.step = 2; renderWz(); return; }
    if (W.step === 2) return sibuk('header', async () => {
      const r = await call('target.header', Object.assign(wzKoneksi(), { tab: wzTab() }));
      W.header = r.header;
      // baris judul: pakai yang tersimpan, atau baris dengan judul kunci yang dikenali
      if (!W.hdrRow || !r.header[W.hdrRow - 1]) { let best = 0, skor = -1; r.header.forEach((row, i) => { const s = Object.keys(SKD.sarankan(row)).length + (SKD.sarankan(row).KUNCI ? 5 : 0); if (s > skor) { skor = s; best = i + 1; } }); W.hdrRow = best || 1; }
      if (!Object.keys(W.map).length) { const sg = SKD.sarankan(r.header[W.hdrRow - 1]); Object.keys(sg).forEach(f => { W.map[f] = String(r.header[W.hdrRow - 1][sg[f] - 1]).trim(); }); }
      W.step = 3;
    });
    if (W.step === 3) { W.step = 4; W.cek = null; S.gsF.WZ = 'tulis'; renderWz(); return sibuk('cek', async () => {
      const konfig = { target: Object.assign({}, W.t, { TargetID: W.edit, BarisHeader: String(W.hdrRow), TabTerakhirDipakai: '' }), kolom: wzKolom(), rahasia: W.rahasia };
      W.cek = await call('target.cek', W.edit ? { konfig: Object.assign(konfig, { rahasia: W.rahasia || undefined }) } : { konfig }); }); }
    if (W.step === 4) { W.step = 5; renderWz(); return; }
    if (W.step === 5) return sibuk('simpan', async () => {
      const r = await call('target.simpan', { target: Object.assign({}, W.t, { TargetID: W.edit, BarisHeader: String(W.hdrRow), VersiScript: W.tes && String(W.tes.versi), SpreadsheetID: W.tes && W.tes.id, NamaFile: W.tes && W.tes.nama }), kolom: wzKolom(), rahasia: W.rahasia || undefined, version: W.version });
      const jalan = W.jalankanUpdate; S.wz = null; S.gs = null; muatUlangRefDiam();
      toast(W.edit ? 'Perubahan target disimpan.' : 'Target disimpan.');
      go('gsheet');
      if (jalan) { S.gsSibuk[r.id] = 'update'; try { await muatGs(); renderGs(); S.gsCek[r.id] = await call('target.update', { id: r.id }); S.gsF[r.id] = 'tulis'; toast(S.gsCek[r.id].ditulis !== undefined ? S.gsCek[r.id].ditulis + ' sel ditulis ke sheet unit.' : 'Update ditahan, lihat alarm.'); } catch (e) { modalGagal(e); } finally { delete S.gsSibuk[r.id]; try { await muatGs(); } catch (e2) { /* biarkan */ } renderGs(); muatUlangRefDiam(); } }
    });
  };
}
