/* ================= F2 · Kontrak: daftar, kontrak lama (arsip), panel detail, form ================= */
Object.assign(S, { sel: new Set(), kf: { q: '', st: 'OPEN', quick: '', tahap: '', ku: '', pic: '', pop: '', seg: '', cust: '' }, batas: 200, drawer: null, dtab: 'proses', dlist: [],
                   lama: null, arsQ: '', arsHasil: null, arsMemuat: false, riw: {}, prog: {} });

/* ---------- penyaji kecil ---------- */
// rp() dari icons.js
const T = kode => (D.ref && D.ref.T[kode]) || null;
const labelTahap = kode => (T(kode) || {}).Label || kode || '—';
const labelKendala = kode => ((D.ref && D.ref.KD[kode]) || {}).Label || kode;
const custName = k => k.EndCustomer || k.NamaPelanggan || '(nama belum diisi)';
const jc = k => KD.jenisCustomer(k.NamaPelanggan, k.EndCustomer);
function tahapPill(kode) { if (!kode) return '<span class="pill p-dim">Belum ada BAST</span>'; const t = T(kode); return `<span class="pill ${t && t.Penutup ? 'p-ok' : 'p-acc'}"><span class="dot"></span>${esc(labelTahap(kode))}</span>`; }
function kuChip(b) {
  const p = KD.evalPush(b, D.ref), k = p.kondisi;
  const c = !p.cocok ? 'p-crit' : k === 'CLOSE' ? 'p-ok' : k.indexOf('KENDALA') === 0 ? 'p-crit' : k === 'SISA_LOKASI' ? 'p-warn' : k === 'BELUM_ADA_BAST' ? 'p-dim' : 'p-info';
  return `<span class="ku ${c}">${esc(p.cocok ? p.nilai : 'TANPA ATURAN')}</span>`;
}
function statusPill(b) {
  const s = KD.statusKontrak(b, D.ref);
  if (KD.bool(b.k.Arsip)) return '<span class="pill p-dim">Diarsipkan</span>';
  if (s.status === 'CLOSE') return '<span class="pill p-ok"><span class="dot"></span>CLOSE</span>';
  if (s.menunggu) return '<span class="pill p-warn"><span class="dot"></span>Menunggu BAST lanjutan</span>';
  return '<span class="pill p-dim">OPEN</span>';
}
function custPill(k) { const j = jc(k); return `<span class="pill ${j === 'DIRECT' ? 'p-dim' : j === 'INDIRECT' ? 'p-vio' : 'p-warn'}">${KD.LABEL_JC[j]}</span>`; }
function avatarPic(n, sm) { return n ? `<span class="av ${sm ? 'sm' : ''}">${esc(String(n)[0].toUpperCase())}</span>` : `<span class="av none ${sm ? 'sm' : ''}">?</span>`; }
function bottleneck(b) {
  const o = KD.bastOpen(b, D.ref);
  o.sort((x, y) => (T(x.KodeTahap) || { Urutan: 999 }).Urutan - (T(y.KodeTahap) || { Urutan: 999 }).Urutan);
  return o[0] || null;
}
function agingKontrak(b) { const x = bottleneck(b); return x ? KD.hariSejak(x.TglTahapMulai, D.hariIni || hariIniStr()) : null; }
function ageChip(h, batas) { if (h === null || h === undefined) return '<span class="dim">—</span>'; const bk = KD.bucket(h, agingBatas()); return `<span class="age a-${bk}" title="Hari di tahap sekarang. Aging terus bertambah${batas ? '; batas tahap ' + batas + ' hari' : ''}.">${h} hr</span>`; }
const picList = () => D.users.filter(u => u.aktif && u.alias).map(u => u.alias).sort((a, b) => a.localeCompare(b));
function opsi(list, val, kosong) { return (kosong !== undefined ? `<option value="">${esc(kosong)}</option>` : '') + list.map(o => { const v = typeof o === 'string' ? o : o[0], l = typeof o === 'string' ? o : o[1]; return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`; }).join(''); }
const aktifRef = list => (list || []).filter(x => x.Aktif);
const tandai = (t, q) => { const i = String(t).toLowerCase().indexOf(q.toLowerCase()); return i < 0 || !q ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)); };
const SUMBER_ALIAS = { KOREKSI: 'koreksi nomor', ANTRIAN: 'dialiaskan dari Antrian', UPLOAD: 'dari upload Excel' };

/* ---------- filter & pencarian (di browser, §4.4) ---------- */
function aliasCocok(b, q) {
  if (!q || !(b.alias || []).length) return null;
  const ql = q.toLowerCase(), qn = KD.normKey(q), k = b.k;
  if ((k.NoKontrak + ' ' + k.NamaPelanggan + ' ' + k.EndCustomer + ' ' + k.JudulKontrak + ' ' + k.KontrakID).toLowerCase().indexOf(ql) >= 0) return null;
  return b.alias.find(a => String(a.NoAsli).toLowerCase().indexOf(ql) >= 0 || (qn.length >= 4 && String(a.AliasNorm).indexOf(qn) >= 0)) || null;
}
function cocokCari(b, q) {
  const k = b.k, ql = q.toLowerCase(), qn = KD.normKey(q);
  if ((k.NoKontrak + ' ' + k.NamaPelanggan + ' ' + k.EndCustomer + ' ' + k.JudulKontrak + ' ' + k.KontrakID + ' ' + k.PIC).toLowerCase().indexOf(ql) >= 0) return true;
  if (qn.length >= 4 && String(k.NoKontrakNorm).indexOf(qn) >= 0) return true;
  if (KD.hidup(b.order).some(o => String(o.NoOrder).toLowerCase().indexOf(ql) >= 0)) return true;
  return !!aliasCocok(b, q);
}
const QUICK = [
  ['kend', 'Ada kendala', b => KD.kendalaAktif(b).length > 0],
  ['lewat', 'Lewat batas aging', b => KD.bastOpen(b, D.ref).some(x => { const h = KD.hariSejak(x.TglTahapMulai, D.hariIni); return h !== null && h > ((T(x.KodeTahap) || {}).BatasAgingHari || 14); })],
  ['nopic', 'Tanpa PIC', b => !b.k.PIC],
  ['kurang', 'Data belum lengkap', b => KD.fieldKurang(b, D.cfg).length > 0],
  ['verif', 'Perlu verifikasi', b => KD.bool(b.k.PerluVerifikasi)]
];
function lolosStatus(b, st) {
  if (st === 'ARSIP') return KD.bool(b.k.Arsip);
  if (KD.bool(b.k.Arsip)) return false;
  return !st || b.k.StatusKontrak === st;
}
function terfilter() {
  const f = S.kf, q = f.q.trim();
  return semuaKontrak().filter(b => {
    const k = b.k;
    if (!lolosStatus(b, f.st)) return false;
    if (f.tahap && k.TahapKontrak !== f.tahap) return false;
    if (f.ku && k.KendalaUmum !== f.ku) return false;
    if (f.pic === '__none' && k.PIC) return false;
    if (f.pic && f.pic !== '__none' && k.PIC !== f.pic) return false;
    if (f.pop && k.Populasi !== f.pop) return false;
    if (f.seg && k.Segment !== f.seg) return false;
    if (f.cust && jc(k) !== f.cust) return false;
    if (f.quick) { const x = QUICK.find(z => z[0] === f.quick); if (x && !x[2](b)) return false; }
    if (q && !cocokCari(b, q)) return false;
    return true;
  }).sort((a, b) => (a.k.UpdatedAt < b.k.UpdatedAt ? 1 : a.k.UpdatedAt > b.k.UpdatedAt ? -1 : 0));
}
function aliasHit(b) {
  const a = aliasCocok(b, S.kf.q.trim()); if (!a) return '';
  return `<span class="ahit">${ic('sync', 's')}<span>Ditemukan lewat <b>nomor lama</b> <span class="mono">${tandai(a.NoAsli, S.kf.q.trim())}</span> · ${SUMBER_ALIAS[a.Sumber] || a.Sumber} ${esc(String(a.CreatedAt).slice(0, 16))} oleh ${esc(namaUser(a.CreatedBy))}</span></span>`;
}

/* ---------- halaman Kontrak ---------- */
function viewKontrak() {
  if (!D.siap) return '<div class="loading"><div class="spinner"></div>Memuat data aktif…</div>';
  const f = S.kf, rows = terfilter(), base = semuaKontrak().filter(b => lolosStatus(b, f.st)), tampil = rows.slice(0, S.batas);
  const uniq = key => [...new Set(semuaKontrak().map(b => b.k[key]).filter(Boolean))].sort();
  const sel = (id, lbl, list, v) => `<select class="inp" id="${id}" aria-label="${lbl}">${opsi(list, v, lbl + ': semua')}</select>`;
  const bolehPilih = can('pic.atur');
  return `<div class="card" style="display:flex;flex-direction:column;gap:14px">
   <div class="row">
    <div class="search">${ic('search', 's')}<input id="kq" placeholder="Cari nomor kontrak, SO/MI, pelanggan, judul…" value="${esc(f.q)}" autocomplete="off"></div>
    <div class="seg" role="group" aria-label="Status">${[['OPEN', 'OPEN'], ['CLOSE', 'CLOSE'], ['', 'Semua']].concat(can('kontrak.arsip') ? [['ARSIP', 'Diarsipkan']] : []).map(([v, l]) => `<button data-kst="${v}" class="${f.st === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <span class="sp"></span>
    ${can('kontrak.daftar') ? `<button class="btn pri" id="addK">${ic('add', 's')}Tambah kontrak</button><button class="btn ton" data-go2="upload">${ic('up2', 's')}Upload Excel</button>` : ''}
   </div>
   <div class="row">${QUICK.map(([k, l, fn]) => `<button class="chipf ${f.quick === k ? 'on' : ''}" data-kq="${k}">${l} <b>${base.filter(fn).length}</b></button>`).join('')}</div>
   <div class="row">
    ${sel('kft', 'Tahap', D.ref.tahap.map(t => [t.Kode, t.Label]), f.tahap)}
    ${sel('kfku', 'Kendala Umum', [...new Set(D.ref.push.filter(p => p.Aktif).map(p => p.Nilai))], f.ku)}
    <select class="inp" id="kfp" aria-label="PIC">${opsi(picList().concat([['__none', '(Tanpa PIC)']]), f.pic, 'PIC: semua')}</select>
    ${sel('kfc', 'Jenis customer', [['DIRECT', 'DIRECT'], ['INDIRECT', 'INDIRECT'], ['BELUM', 'BELUM TERDEFINISI']], f.cust)}
    ${sel('kfpop', 'Populasi', uniq('Populasi'), f.pop)}${sel('kfseg', 'Segment', uniq('Segment'), f.seg)}
    <span class="sp"></span><span class="muted tnum" style="font-weight:600" id="kcount">${rows.length.toLocaleString('id-ID')} kontrak</span>
   </div>
   <div class="tbl-wrap"><table class="t"><thead><tr>${bolehPilih ? '<th style="width:30px"><input type="checkbox" class="chk" id="kselAll" aria-label="Pilih semua yang tampil"></th>' : ''}<th>Kontrak</th><th>Tahap</th><th>Kendala Umum (di sheet)</th><th>PIC</th><th>Aging</th><th class="num">Nilai</th><th>Status</th></tr></thead><tbody>
   ${tampil.map(b => { const k = b.k, nb = KD.hidup(b.bast).length, j = jc(k), pending = D.antre.some(a => a.kid === k.KontrakID);
     return `<tr class="click ${S.drawer === k.KontrakID ? 'sel' : ''} ${D.flash[k.KontrakID] && Date.now() - D.flash[k.KontrakID] < 4000 ? 'flash' : ''}" data-k="${esc(k.KontrakID)}">
     ${bolehPilih ? `<td><input type="checkbox" class="chk rowchk" data-id="${esc(k.KontrakID)}" ${S.sel.has(k.KontrakID) ? 'checked' : ''} aria-label="Pilih ${esc(k.KontrakID)}"></td>` : ''}
     <td><span class="no">${esc(k.NoKontrak)}${pending ? ' <span class="bspin" title="Sedang disimpan" style="width:10px;height:10px"></span>' : ''}</span><span class="sub"><b style="color:var(--fg);font-weight:600">${esc(custName(k))}</b>${j === 'INDIRECT' ? ' <span class="pill p-vio" style="font-size:10.5px;padding:0 7px">INDIRECT</span>' : j === 'BELUM' ? ' <span class="pill p-warn" style="font-size:10.5px;padding:0 7px">jenis belum terdefinisi</span>' : ''} · ${esc(k.JudulKontrak)}</span>${aliasHit(b)}</td>
     <td>${tahapPill(k.TahapKontrak)}${nb > 1 ? ` <span class="pill p-dim">${nb}×</span>` : ''}</td>
     <td>${kuChip(b)}</td>
     <td><div class="row" style="flex-wrap:nowrap;gap:6px">${avatarPic(k.PIC, 1)}<span>${k.PIC ? esc(k.PIC) : '<span style="color:var(--warn)">—</span>'}</span></div></td>
     <td>${ageChip(agingKontrak(b))}</td><td class="num">${rp(k.NilaiKontrak)}</td>
     <td><div class="row" style="flex-wrap:nowrap;gap:4px">${statusPill(b)}${KD.bool(k.PerluVerifikasi) ? '<span class="pill p-info" title="Hasil import, perlu diverifikasi">verif</span>' : ''}</div></td></tr>`; }).join('') ||
     `<tr><td colspan="${bolehPilih ? 8 : 7}" class="muted" style="text-align:center;padding:32px">${semuaKontrak().length ? 'Tidak ada kontrak yang cocok. Coba hapus filter.' : 'Belum ada kontrak. ' + (can('kontrak.daftar') ? 'Klik <b>Tambah kontrak</b> atau <b>Upload Excel</b>.' : '')}</td></tr>`}
   </tbody></table></div>
   ${rows.length > tampil.length ? `<div class="row" style="justify-content:center"><button class="btn" id="kmore">Tampilkan ${Math.min(200, rows.length - tampil.length)} lagi <span class="muted">(${tampil.length} dari ${rows.length.toLocaleString('id-ID')})</span></button></div>` : ''}
  </div>
  ${S.sel.size ? `<div class="bulk"><b class="tnum">${S.sel.size} kontrak dipilih</b><span class="sp"></span><select class="inp" id="bulkPic" aria-label="PIC baru">${opsi(picList(), '', 'Pilih PIC…')}</select><button class="btn pri sm" id="bulkGo">Atur PIC</button><button class="btn sm" id="bulkClr">Batal</button></div>` : ''}
  <div id="arsipSlot">${arsipSection()}</div>`;
}
function rerenderKontrak() {
  const c = document.getElementById('content'); if (!c || S.page !== 'kontrak') return;
  const a = document.activeElement, isQ = a && a.id === 'kq', pos = isQ ? a.selectionStart : null, sc = window.scrollY;
  c.innerHTML = viewKontrak(); bindKontrak();
  if (isQ) { const n = document.getElementById('kq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
  window.scrollTo(0, sc);
}
function segarkanTampilan() {
  if (S.page === 'kontrak') rerenderKontrak();
  else if (S.page === 'beranda' && D.siap) { const c = document.getElementById('content'); if (c) { c.innerHTML = viewHome(); } }
  if (S.drawer) renderDrawer(false);
}
let cariT = null;
function bindKontrak() {
  const $c = s => document.querySelector('#content ' + s), $$c = s => document.querySelectorAll('#content ' + s);
  if (!D.siap) { muatData(false).then(rerenderKontrak).catch(gagal); return; }
  const q = $c('#kq');
  q.oninput = () => { S.kf.q = q.value; S.batas = 200; clearTimeout(cariT); cariT = setTimeout(() => { rerenderKontrak(); cariArsip(); }, 160); };
  $$c('[data-kst]').forEach(b => b.onclick = () => { S.kf.st = b.dataset.kst; S.batas = 200; rerenderKontrak(); });
  $$c('[data-kq]').forEach(b => b.onclick = () => { S.kf.quick = S.kf.quick === b.dataset.kq ? '' : b.dataset.kq; rerenderKontrak(); });
  [['kft', 'tahap'], ['kfku', 'ku'], ['kfp', 'pic'], ['kfc', 'cust'], ['kfpop', 'pop'], ['kfseg', 'seg']].forEach(([id, key]) => { const el = $c('#' + id); if (el) el.onchange = () => { S.kf[key] = el.value; rerenderKontrak(); }; });
  if ($c('#addK')) $c('#addK').onclick = () => openKontrakForm(null);
  if ($c('#kmore')) $c('#kmore').onclick = () => { S.batas += 200; rerenderKontrak(); };
  $$c('tr[data-k]').forEach(tr => tr.onclick = e => { if (e.target.closest('input')) return; openDrawer(tr.dataset.k, terfilter().map(b => b.k.KontrakID)); });
  $$c('.rowchk').forEach(c => c.onchange = () => { c.checked ? S.sel.add(c.dataset.id) : S.sel.delete(c.dataset.id); rerenderKontrak(); });
  if ($c('#kselAll')) $c('#kselAll').onchange = e => { terfilter().slice(0, S.batas).forEach(b => e.target.checked ? S.sel.add(b.k.KontrakID) : S.sel.delete(b.k.KontrakID)); rerenderKontrak(); };
  if ($c('#bulkClr')) $c('#bulkClr').onclick = () => { S.sel.clear(); rerenderKontrak(); };
  if ($c('#bulkGo')) $c('#bulkGo').onclick = () => {
    const pic = $c('#bulkPic').value; if (!pic) { toast('Pilih PIC dulu.'); return; }
    const ids = [...S.sel].filter(id => kontrak(id) && kontrak(id).k.PIC !== pic);
    ids.forEach(id => jalankanOp('kontrak.pic', id, { PIC: pic, massal: true }));
    S.sel.clear(); rerenderKontrak(); toast(`${ids.length} kontrak diatur ke PIC ${pic}.`);
  };
  bindArsip();
}

/* ---------- kontrak lama di arsip (cari lewat Indeks di server) ---------- */
function arsipSection() {
  const q = S.kf.q.trim();
  if (q.length < 3 || S.kf.st === 'ARSIP') return '';
  if (S.arsMemuat || S.arsQ !== q) return `<div class="card arsres"><div class="row"><span class="bspin" style="color:var(--accent)"></span><b>Mencari juga di kontrak lama…</b><span class="muted" style="font-size:12.5px">indeks semua kontrak · ±1–3 dtk</span></div></div>`;
  const h = S.arsHasil || [];
  return `<div class="card arsres"><h2>${ic('log', 's')} Kontrak lama <small>${h.length} cocok · CLOSE lebih dari ${esc(D.cfg.ARSIP_SETELAH_HARI || '90')} hari, disimpan di arsip per tahun · tetap bisa dibuka &amp; dibuka kembali</small></h2>
   ${h.length ? `<div class="tbl-wrap"><table class="t"><thead><tr><th>Kontrak</th><th>Status</th><th>Arsip</th><th>Close</th><th>PIC</th></tr></thead><tbody>
   ${h.map(r => `<tr class="click" data-lama="${esc(r.KontrakID)}"><td><span class="no">${esc(r.NoKontrak)}</span><span class="sub"><b style="color:var(--fg);font-weight:600">${esc(r.EndCustomer || r.NamaPelanggan || '')}</b> · ${esc(r.JudulKontrak)}</span>
     ${r.aliasCocok ? `<span class="ahit">${ic('sync', 's')}<span>Ditemukan lewat <b>nomor lama</b> <span class="mono">${tandai(r.aliasCocok.NoAsli, q)}</span> · ${SUMBER_ALIAS[r.aliasCocok.Sumber] || r.aliasCocok.Sumber} ${esc(String(r.aliasCocok.CreatedAt).slice(0, 16))} oleh ${esc(namaUser(r.aliasCocok.CreatedBy))}</span></span>` : ''}</td>
     <td><span class="pill p-dim">${esc(r.StatusKontrak || 'CLOSE')}</span></td><td class="tnum">${esc(String(r.Lokasi).replace('ARSIP_', ''))}</td><td class="tnum muted">${esc(String(r.TglClose).slice(0, 10))}</td><td>${esc(r.PIC)}</td></tr>`).join('')}</tbody></table></div>`
   : '<div class="muted">Tidak ada kontrak lama yang cocok.</div>'}</div>`;
}
let arsT = null;
function cariArsip() {
  const q = S.kf.q.trim();
  clearTimeout(arsT);
  if (q.length < 3) { S.arsQ = ''; S.arsHasil = null; return; }
  if (q === S.arsQ) return;
  S.arsMemuat = true; const slot = document.getElementById('arsipSlot'); if (slot) slot.innerHTML = arsipSection();
  arsT = setTimeout(async () => {
    try { const r = await call('arsip.cari', { q }); if (S.kf.q.trim() === q) { S.arsQ = q; S.arsHasil = r.hasil; } }
    catch (e) { S.arsQ = q; S.arsHasil = []; }
    S.arsMemuat = false;
    const s2 = document.getElementById('arsipSlot'); if (s2) { s2.innerHTML = arsipSection(); bindArsip(); }
  }, 500);
}
function bindArsip() { document.querySelectorAll('#content [data-lama]').forEach(tr => tr.onclick = () => bukaLama(tr.dataset.lama)); }
async function bukaLama(kid) {
  S.drawer = kid; S.dlist = [kid]; S.dtab = 'proses'; S.lama = { kid, memuat: true };
  renderDrawer(true);
  try {
    const r = await call('arsip.buka', { kid });
    if (r.lokasi === 'AKTIF') { S.lama = null; await tarik(true); if (kontrak(kid)) renderDrawer(false); else closeDrawer(true); return; }
    S.lama = { kid, lokasi: r.lokasi, bundle: r.bundle, riwayat: r.riwayat };
    S.riw[kid] = { riwayat: r.riwayat, log: null };
  } catch (e) { S.lama = null; closeDrawer(true); gagal(e); return; }
  if (S.drawer === kid) renderDrawer(false);
}

/* ---------- panel detail ---------- */
function bundleDrawer() { if (S.lama && S.lama.kid === S.drawer) return S.lama.bundle || null; return kontrak(S.drawer); }
function openDrawer(kid, list) { kid = idAsli(kid); S.lama = null; S.drawer = kid; S.dlist = list && list.indexOf(kid) >= 0 ? list : [kid]; S.dtab = 'proses'; renderDrawer(true); markSel(); }
function closeDrawer(instant) {
  const root = document.getElementById('sheet-root'); if (!S.drawer) return;
  S.drawer = null; S.lama = null; markSel();
  if (instant || REDUCED || !root.firstElementChild) { root.innerHTML = ''; return; }
  root.firstElementChild.classList.add('closing'); setTimeout(() => { if (!S.drawer) root.innerHTML = ''; }, 300);
}
function markSel() { document.querySelectorAll('tr[data-k]').forEach(tr => tr.classList.toggle('sel', tr.dataset.k === S.drawer)); }
function stepDrawer(d) { const i = S.dlist.indexOf(S.drawer), j = i + d; if (i < 0 || j < 0 || j >= S.dlist.length) return; S.drawer = S.dlist[j]; S.lama = null; renderDrawer(false, true); markSel(); }
function renderDrawer(opening, swap) {
  const root = document.getElementById('sheet-root');
  if (!S.drawer) return;
  const lamaMemuat = S.lama && S.lama.memuat, b = bundleDrawer();
  if (!b && !lamaMemuat) { closeDrawer(true); return; }
  const prevScroll = root.querySelector('.dbody') ? root.querySelector('.dbody').scrollTop : 0, idx = S.dlist.indexOf(S.drawer);
  if (lamaMemuat) {
    root.innerHTML = `<div class="dwrap"><div class="dscrim" id="dscrim"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Detail kontrak"><div class="dhead"><div class="dtop"><button class="iconbtn" id="dclose" aria-label="Tutup">${ic('x')}</button></div></div>
     <div class="dbody"><div class="lamaload"><span class="bspin"></span><div><b>Mengambil dari arsip…</b><div class="muted">Cari di indeks · buka file arsip tahunnya · ±3–4 dtk</div></div></div></div></aside></div>`;
    root.querySelector('#dclose').onclick = root.querySelector('#dscrim').onclick = () => closeDrawer(true);
    return;
  }
  const k = b.k, lama = !!(S.lama && S.lama.bundle), ro = lama || !can('kontrak.update') || KD.bool(k.Arsip), pending = D.antre.some(a => a.kid === k.KontrakID);
  root.innerHTML = `<div class="dwrap"><div class="dscrim" id="dscrim" style="${opening ? '' : 'animation:none'}"></div>
   <aside class="drawer" role="dialog" aria-modal="true" aria-label="Detail kontrak" style="${opening ? '' : 'animation:none'}">
    <div class="dhead">
     <div class="dtop"><button class="iconbtn" id="dclose" aria-label="Tutup">${ic('x')}</button>${S.dlist.length > 1 ? `<span class="muted tnum" style="font-size:12px">${idx + 1} / ${S.dlist.length}</span>
      <button class="iconbtn" id="dprev" ${idx <= 0 ? 'disabled' : ''} aria-label="Sebelumnya" title="Sebelumnya (K)">${ic('chevL')}</button><button class="iconbtn" id="dnext" ${idx >= S.dlist.length - 1 ? 'disabled' : ''} aria-label="Berikutnya" title="Berikutnya (J)">${ic('chevL')}</button>
      <span class="dim dkeys" style="font-size:11.5px"><kbd>J</kbd> <kbd>K</kbd> pindah · <kbd>Esc</kbd> tutup</span>` : ''}<span class="sp"></span>
      ${pending ? '<span class="pill p-dim"><span class="bspin" style="width:10px;height:10px"></span>Menyimpan…</span>' : ''}
      ${!ro && KD.bool(k.PerluVerifikasi) ? `<button class="btn sm ton" id="dverif">${ic('check', 's')}Tandai terverifikasi</button>` : ''}
      ${!lama && can('kontrak.arsip') ? (KD.bool(k.Arsip) ? '<button class="btn sm" id="dunarsip">Kembalikan dari arsip</button>' : '<button class="btn sm" id="darsip">Arsipkan</button>') : ''}</div>
     <div class="dtitle"><div style="flex:1 1 360px;min-width:0">
       <div class="no">${esc(k.NoKontrak)} <button class="iconbtn" style="width:28px;height:28px" id="dcopy" aria-label="Salin nomor">${ic('copy', 's')}</button> <span class="mono dim" style="font-size:11.5px">${esc(k.KontrakID)}</span></div>
       <h2>${esc(custName(k))}</h2><div class="muted">${esc(k.JudulKontrak)}${jc(k) === 'INDIRECT' ? ` · customer: ${esc(k.NamaPelanggan)}` : ''}</div>
       <div class="row" style="margin-top:10px">${statusPill(b)} ${tahapPill(k.TahapKontrak)} ${kuChip(b)} ${custPill(k)} ${KD.bool(k.PerluVerifikasi) ? '<span class="pill p-info">Hasil import · perlu verifikasi</span>' : ''}</div></div>
      <label class="of" style="min-width:210px;margin-top:8px"><span>PIC</span><select class="inp" id="dpic" ${!lama && can('pic.atur') && !KD.bool(k.Arsip) ? '' : 'disabled'}>${opsi(picList().concat(k.PIC && picList().indexOf(k.PIC) < 0 ? [k.PIC] : []), k.PIC, '— Tanpa PIC —')}</select><small>${can('pic.atur') ? 'Siapa pun boleh update; non-PIC dicatat "bantu".' : 'PIC diatur admin.'}</small></label></div>
     ${aliasBanner(b)}${lamaBanner(b)}${KD.bool(k.Arsip) ? `<div class="note warn" style="margin-top:12px">${ic('warn', 's')}<span class="tx"><b>Diarsipkan</b>: ${esc(k.AlasanArsip)}. Kontrak ini tidak tampil di daftar dan tidak bisa diubah sampai dikembalikan.</span></div>` : ''}
     <div class="dtabs" role="tablist">${[['proses', 'Proses'], ['data', 'Data kontrak'], ['riwayat', 'Riwayat']].map(([v, l]) => `<button role="tab" data-dtab="${v}" class="${S.dtab === v ? 'on' : ''}">${l}</button>`).join('')}<button disabled style="opacity:.4;cursor:not-allowed" title="Dibangun di F4b">Sheet unit · F4b</button></div>
    </div>
    <div class="dbody ${swap ? 'swap' : ''}" id="dbody">${S.dtab === 'proses' ? dProses(b, ro) : S.dtab === 'data' ? dData(b, ro) : dRiwayat(b)}</div>
   </aside></div>`;
  root.querySelector('.dbody').scrollTop = swap ? 0 : prevScroll;
  requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll('.prog').forEach(el => { el.style.width = el.dataset.w; S.prog[el.dataset.key] = el.dataset.w; })));
  bindDrawer(b, ro, lama);
  if (S.dtab === 'riwayat') muatRiwayat(k.KontrakID, lama ? S.lama.lokasi : 'AKTIF');
}
function aliasBanner(b) {
  const a = aliasCocok(b, S.kf.q.trim()); if (!a) return '';
  return `<div class="note info" style="margin-top:12px">${ic('sync', 's')}<span class="tx">Anda mencari <span class="mono"><b>${esc(a.NoAsli)}</b></span>. Itu <b>nomor lama</b> kontrak ini, sudah ${a.Sumber === 'KOREKSI' ? 'dikoreksi' : 'dicatat'} menjadi <span class="mono"><b>${esc(b.k.NoKontrak)}</b></span>
   (${SUMBER_ALIAS[a.Sumber] || a.Sumber}, ${esc(String(a.CreatedAt).slice(0, 16))} oleh ${esc(namaUser(a.CreatedBy))})${a.Catatan ? '. Alasan: ' + esc(a.Catatan) : ''}. Sheet unit yang masih memakai nomor lama tetap dikenali sebagai kontrak ini.</span></div>`;
}
function lamaBanner(b) {
  if (!(S.lama && S.lama.bundle)) return '';
  return `<div class="note warn" style="margin-top:12px">${ic('log', 's')}<span class="tx"><b>Kontrak lama</b> · tersimpan di arsip ${esc(String(S.lama.lokasi).replace('ARSIP_', ''))} (close ${esc(String(b.k.TglClose).slice(0, 10))}). Hanya bisa dilihat. Bila ada return/revisi, buka kembali: kontrak dipindah ke data aktif dengan ID yang sama, riwayatnya ikut (±5 dtk).</span>
   ${can('kontrak.update') ? `<button class="btn sm pri" id="reopenLama" style="flex:none">Buka kembali (reopen)</button>` : ''}</div>`;
}
function dProses(b, ro) {
  const k = b.k, s = KD.statusKontrak(b, D.ref), tl = D.ref.tahap.filter(t => t.Aktif), n = tl.length, basts = KD.hidup(b.bast), cak = KD.cakupan(b), lok = k.JumlahLokasi;
  const bastHtml = basts.length ? basts.map(x => {
    const ci = tl.findIndex(t => t.Kode === x.KodeTahap), cur = T(x.KodeTahap) || {}, key = x.BASTID, close = KD.bastClose(x, D.ref);
    const w = `calc((100% - 100% / ${n}) * ${(Math.max(ci, 0) / Math.max(n - 1, 1)).toFixed(4)})`, from = S.prog[key] || '0px', h = KD.hariSejak(x.TglTahapMulai, D.hariIni);
    const usul = KD.dokDefault(jc(k), D.cfg), dk = (D.ref.dokTagih.find(d => d.Kode === x.DokTagih) || {}).Label || '';
    return `<div class="bast">
     <div class="bast-h"><b class="mono">${esc(x.BASTID)}</b><span class="pill ${x.DokTagih === 'BAA' ? 'p-vio' : 'p-dim'}" title="${esc(dk)}">${esc(x.DokTagih)}</span>${close ? '<span class="pill p-ok"><span class="dot"></span>CLOSE</span>' : '<span class="pill p-dim">OPEN</span>'}${Number(x.Siklus) > 1 ? `<span class="pill p-warn">Siklus ${esc(x.Siklus)} · reopen</span>` : ''}<span class="sp"></span>${close ? '' : ageChip(h, cur.BatasAgingHari)}<span class="muted" style="font-size:12px">${close ? 'close ' + esc(String(x.TglTahapMulai).slice(0, 10)) : 'di tahap ini · batas ' + (cur.BatasAgingHari || 14) + ' hari'}</span>${ro ? '' : `<button class="btn sm" data-editb="${esc(x.BASTID)}">${ic('edit', 's')}Ubah</button>`}</div>
     <div class="otrack" style="--half:calc(100% / ${n} / 2)"><div class="rail"></div><div class="prog" data-key="${esc(key)}" data-w="${w}" style="width:${from}"></div>
      ${tl.map((t, i) => `<button class="ost ${t.Penutup ? 'closer' : ''} ${i < ci ? 'done' : ''} ${i === ci ? 'cur' : ''}" data-b="${esc(x.BASTID)}" data-t="${esc(t.Kode)}" ${ro || close ? 'disabled' : ''} title="${i === ci ? 'Tahap sekarang' : close ? 'BAST sudah close' : 'Pindah ke ' + esc(t.Label)}"><span class="d">${i < ci ? '✓' : i + 1}</span><span class="l">${esc(t.Label)}</span></button>`).join('')}</div>
     <dl class="kv"><dt>Dokumen tagih</dt><dd>${esc(x.DokTagih)} <span class="muted">· ${esc(dk)}${x.DokTagih === usul ? '' : ` · berbeda dari usulan ${usul}`}</span></dd><dt>Cakupan order</dt><dd class="mono">${esc(x.CakupanOrder) || '<span class="muted">—</span>'}</dd><dt>Cakupan lokasi</dt><dd>${x.CakupanLokasi !== '' ? esc(x.CakupanLokasi) : '<span class="muted">' + (basts.length === 1 ? 'semua lokasi (tidak diisi)' : 'tidak diisi') + '</span>'}</dd><dt>No. dokumen</dt><dd class="mono">${esc(x.NoDokBAST) || '<span class="muted">—</span>'}</dd><dt>Keterangan</dt><dd>${esc(x.Keterangan) || '<span class="muted">—</span>'}</dd></dl>
    </div>`;
  }).join('') : `<div class="note info">${ic('doc', 's')}<span class="tx">Kontrak ini belum punya BAST, jadi di sheet unit tampil <b class="mono">${esc(KD.evalPush(b, D.ref).nilai || 'BELUM DIPROSES')}</b>. Tambahkan BAST/BAA untuk mulai memproses.</span></div>`;
  const p = KD.evalPush(b, D.ref), kend = (b.kend || []).slice().sort((x, y) => (x.Status === y.Status ? (x.Mulai < y.Mulai ? 1 : -1) : x.Status === 'AKTIF' ? -1 : 1)), batasK = Number(D.cfg.KENDALA_BATAS_HARI) || 14;
  return `<div class="grid g64">
   <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
    <div class="row"><div><div class="eyebrow">Dokumen tagih</div><div style="font-weight:700;font-size:15px">${basts.length} BAST/BAA${lok !== '' ? ` · cakupan ${cak}/${esc(lok)} lokasi` : ''}</div></div><span class="sp"></span>${ro ? '' : `<button class="btn sm ton" id="addBast">${ic('add', 's')}Tambah BAST/BAA${basts.length ? ' parsial' : ''}</button>`}</div>
    ${s.menunggu ? `<div class="note warn">${ic('warn', 's')}<span class="tx">Semua dokumen sudah close, tapi masih ada <b>${esc(s.sisa)} lokasi</b> tersisa. Kontrak tetap OPEN sampai BAST lanjutan dibuat.</span></div>` : ''}
    ${bastHtml}
    <div class="row" style="margin-top:6px"><div><div class="eyebrow">Kendala</div><div style="font-weight:700;font-size:15px">${KD.kendalaAktif(b).length} aktif</div></div><span class="sp"></span>${ro ? '' : `<button class="btn sm ton" id="addKend" ${basts.length ? '' : 'disabled title="Tambahkan BAST dulu"'}>${ic('flag', 's')}Buka kendala</button>`}</div>
    ${kend.length ? kend.map(x => { const r = (D.ref.KD[x.Jenis] || {}), h = KD.hariSejak(x.Mulai, D.hariIni);
      return `<div class="kend ${x.Status === 'AKTIF' ? '' : 'done'}"><div style="flex:1;min-width:0"><div class="row"><b>${esc(r.Label || x.Jenis)}</b><span class="muted" style="font-size:12px">${esc(String(x.BASTID).replace(k.KontrakID + '-', ''))} · ${x.Status === 'AKTIF' ? `aktif ${h} hari` : 'selesai ' + esc(String(x.Selesai).slice(0, 10))} · oleh ${esc(namaUser(x.DibuatOleh))}</span>${x.Status === 'AKTIF' && h > batasK ? `<span class="pill p-crit">&gt; ${batasK} hari</span>` : ''}${r.MemicuReopen ? '<span class="pill p-dim">memicu reopen</span>' : ''}</div><div style="margin-top:4px">${esc(x.Keterangan) || '<span class="muted">—</span>'}${x.CatatanSelesai ? `<div class="muted" style="font-size:12px">Catatan selesai: ${esc(x.CatatanSelesai)}</div>` : ''}</div></div>${x.Status === 'AKTIF' && !ro ? `<button class="btn sm" data-tutup="${esc(x.KendalaID)}">${ic('check', 's')}Selesai</button>` : ''}</div>`; }).join('') : '<div class="muted" style="font-size:13px">Tidak ada kendala.</div>'}
   </div>
   <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
    <div class="card"><h2>Tampil di sheet unit <small>pratinjau</small></h2>
     <div class="push">
      <div class="pushrow main"><span class="k">KENDALA_UMUM</span><span class="v">${p.cocok ? esc(p.nilai) : '<span style="color:var(--crit)">(tidak diubah · alarm TANPA_ATURAN)</span>'}</span></div>
      <div class="pushrow"><span class="k">KENDALA_DETIL</span><span class="v">${esc(p.detil) || '—'}</span></div>
      <div class="pushrow"><span class="k">TAHAP</span><span class="v">${k.TahapKontrak ? esc(labelTahap(k.TahapKontrak)) : '—'}</span></div>
      <div class="pushrow"><span class="k">PARSIAL</span><span class="v">${basts.length > 1 || lok !== '' ? esc(basts.filter(x => KD.bastClose(x, D.ref)).length + '/' + basts.length + ' BAST' + (lok !== '' ? ' · ' + cak + '/' + lok + ' lokasi' : '')) : '—'}</span></div>
      <div class="pushrow"><span class="k">PIC</span><span class="v">${esc(k.PIC) || '—'}</span></div>
     </div>
     <div class="note info" style="margin-top:10px;font-size:12px">${ic('sync', 's')}<span class="tx">Belum dikirim: sinkron ke sheet unit mulai <b>F4a</b>. Nilai di atas sudah dihitung sekarang supaya bisa dicek.</span></div>
     <div class="muted" style="font-size:12px;margin-top:10px">${p.cocok ? `Cocok dengan aturan Nilai Push <b>#${p.urutan}</b> <span class="mono">${esc(p.kondisi)}</span>.` : 'Tidak ada aturan Nilai Push yang cocok. Periksa Pengaturan › Nilai Push.'}</div></div>
   </div></div>`;
}
function dData(b, ro) {
  const k = b.k, kurang = KD.fieldKurang(b, D.cfg), wajib = String(D.cfg.FIELD_WAJIB || '').split(',').filter(Boolean), ok = wajib.length - kurang.length;
  const NAMA = { Customer: 'Customer', EndCustomer: 'End customer', NilaiKontrak: 'Nilai kontrak', Segment: 'Segment', Populasi: 'Populasi', OrderInternal: 'SO/MI', JumlahLokasi: 'Jumlah lokasi', PIC: 'PIC', TahunProject: 'Tahun project', JenisDok: 'Jenis dok' };
  const orders = KD.hidup(b.order);
  return `<div class="grid g2">
   <div class="card" style="grid-column:1/-1"><h2>Kelengkapan data <small>${ok}/${wajib.length} field wajib terisi</small><span class="sp"></span>${kurang.length ? `<span class="pill p-warn">${kurang.length} belum lengkap</span>` : '<span class="pill p-ok">lengkap</span>'}</h2>
    <div class="agebar" style="height:8px;margin-bottom:12px"><i style="flex:${ok};background:var(--ok)"></i>${kurang.length ? `<i style="flex:${kurang.length};background:transparent"></i>` : ''}</div>
    ${kurang.length ? `<div class="row">${kurang.map(m => `<span class="pill p-warn">${esc(NAMA[m] || m)}</span>`).join('')}</div>` : '<div class="muted" style="font-size:13px">Semua field wajib sudah terisi. Daftar field wajib diatur di Config (FIELD_WAJIB).</div>'}</div>
   <div class="card"><h2>Data kontrak <span class="sp"></span>${ro ? '' : `<button class="btn sm" id="editK">${ic('edit', 's')}Ubah</button>`}</h2>
    <dl class="kv"><dt>ID</dt><dd class="mono">${esc(k.KontrakID)}</dd><dt>No. kontrak</dt><dd class="mono" style="font-size:12px">${esc(k.NoKontrak)}</dd><dt>Jenis dok</dt><dd>${esc(k.JenisDok) || '—'}</dd><dt>Tahun project</dt><dd>${esc(k.TahunProject) || '—'}</dd><dt>Populasi</dt><dd>${esc(k.Populasi) || '—'}</dd><dt>Segment</dt><dd>${esc(k.Segment) || '—'}</dd><dt>Nilai</dt><dd class="tnum">${rp(k.NilaiKontrak)}</dd><dt>Jumlah lokasi</dt><dd>${esc(k.JumlahLokasi) || '<span class="muted">tidak diisi</span>'}</dd><dt>Sumber</dt><dd>${esc(k.SumberAwal)} · ${esc(String(k.CreatedAt).slice(0, 10))} oleh ${esc(namaUser(k.CreatedBy))}</dd>
     <dt>Nomor lama</dt><dd>${(b.alias || []).length ? b.alias.map(a => `<div style="margin-bottom:6px"><span class="mono" style="font-size:12px">${esc(a.NoAsli)}</span><div class="muted" style="font-size:11.5px">${SUMBER_ALIAS[a.Sumber] || a.Sumber} · ${esc(String(a.CreatedAt).slice(0, 16))} · ${esc(namaUser(a.CreatedBy))}${a.Catatan ? ' · ' + esc(a.Catatan) : ''}</div></div>`).join('') : '<span class="muted">—</span>'}</dd></dl></div>
   <div class="card"><h2>Customer</h2>
    <dl class="kv"><dt>Customer</dt><dd>${k.NamaPelanggan ? esc(k.NamaPelanggan) + ' <span class="muted">(direct customer)</span>' : '<span style="color:var(--warn)">belum diisi</span>'}</dd><dt>End customer</dt><dd>${k.EndCustomer ? esc(k.EndCustomer) : '<span style="color:var(--warn)">belum diisi</span>'}</dd><dt>Jenis customer</dt><dd>${custPill(k)}</dd><dt>Dokumen tagih usulan</dt><dd>${KD.dokDefault(jc(k), D.cfg)} <span class="muted">· bisa diganti per BAST</span></dd></dl>
    <div class="note info" style="margin-top:12px">${ic('person', 's')}<span class="tx"><b>DIRECT</b> bila customer = end customer, <b>INDIRECT</b> bila berbeda (huruf besar/kecil, spasi, tanda baca, "PT", "Tbk", "Persero" diabaikan). Selama salah satunya kosong: <b>BELUM TERDEFINISI</b>.</span></div></div>
   <div class="card" style="grid-column:1/-1"><h2>SO / MI <small>order internal${ro ? '' : ' · klik baris untuk ubah'}</small><span class="sp"></span>${ro ? '' : `<button class="btn sm" id="addSO">${ic('add', 's')}Tambah</button>`}</h2>
    <div class="tbl-wrap"><table class="t"><thead><tr><th>Jenis</th><th>No. order</th><th>Layanan</th><th>Pekerjaan</th><th class="num">Lokasi</th><th>Keterangan</th></tr></thead><tbody>
    ${orders.map(o => `<tr class="${ro ? '' : 'click'}" data-so="${esc(o.OrderID)}"><td><span class="pill p-dim">${esc(o.JenisOrder)}</span></td><td class="no">${esc(o.NoOrder)}</td><td>${esc(o.JenisLayanan)}</td><td>${esc(o.JenisPekerjaan)}</td><td class="num">${esc(o.JumlahLokasi)}</td><td class="muted">${esc(o.Keterangan)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Belum ada SO/MI.</td></tr>'}</tbody></table></div></div></div>`;
}
function dRiwayat(b) {
  const r = S.riw[b.k.KontrakID];
  if (!r || !r.log) return '<div class="loading"><div class="spinner"></div>Memuat riwayat…</div>';
  const riw = r.riwayat.slice().sort((x, y) => (x.Masuk < y.Masuk ? 1 : -1));
  return `<div class="grid g2"><div class="card"><h2>Riwayat tahap <small>${riw.length} perpindahan</small></h2><div class="tl">${riw.map(e => `<div class="e"><span class="b"></span><span class="w">${esc(String(e.Masuk).slice(0, 16))}</span><span><b>${esc(String(e.BASTID).replace(b.k.KontrakID + '-', ''))}</b> masuk <b>${esc(labelTahap(e.KodeTahap))}</b>${Number(e.Siklus) > 1 ? ` · siklus ${esc(e.Siklus)}` : ''} · ${esc(namaUser(e.Oleh))}${e.Keterangan ? `<br><span class="muted" style="font-size:12px">${esc(e.Keterangan)}</span>` : ''}</span></div>`).join('') || '<div class="muted">Belum ada.</div>'}</div></div>
   <div class="card"><h2>Log perubahan <small>${r.bulan ? '3 bulan terakhir' : ''}</small></h2><div class="tl">${r.log.map(l => `<div class="e"><span class="b"></span><span class="w">${esc(String(l.waktu).slice(0, 16))}</span><span><b>${esc(namaUser(l.user))}</b> · <span class="pill p-dim" style="font-size:10.5px">${esc(l.aksi)}</span> ${l.field ? `<span class="mono" style="font-size:11.5px">${esc(l.field)}</span>: ${esc(l.lama) || '—'} → ${esc(l.baru) || '—'}` : ''}${l.catatan ? `<br><span class="muted" style="font-size:12px">${esc(l.catatan)}</span>` : ''}</span></div>`).join('') || '<div class="muted">Belum ada log dalam 3 bulan terakhir.</div>'}</div></div></div>`;
}
async function muatRiwayat(kid, lokasi) {
  const ada = S.riw[kid];
  if (ada && ada.log && Date.now() - (ada.t || 0) < 60000) return;
  try { const r = await call('kontrak.riwayat', { kid, lokasi }); S.riw[kid] = { riwayat: r.riwayat, log: r.log, bulan: r.bulan, t: Date.now() }; }
  catch (e) { S.riw[kid] = { riwayat: [], log: [], t: Date.now() }; gagal(e); }
  if (S.drawer === kid && S.dtab === 'riwayat') { const body = document.getElementById('dbody'); const b = bundleDrawer(); if (body && b) body.innerHTML = dRiwayat(b); }
}
function bindDrawer(b, ro, lama) {
  const root = document.getElementById('sheet-root'), $d = s => root.querySelector(s), $$d = s => root.querySelectorAll(s), k = b.k, kid = k.KontrakID;
  $d('#dclose').onclick = $d('#dscrim').onclick = () => closeDrawer();
  if ($d('#dprev')) $d('#dprev').onclick = () => stepDrawer(-1);
  if ($d('#dnext')) { $d('#dnext').onclick = () => stepDrawer(1); $d('#dnext').style.transform = 'scaleX(-1)'; }
  $d('#dcopy').onclick = () => copyText(k.NoKontrak, 'Nomor kontrak disalin.');
  $$d('[data-dtab]').forEach(t => t.onclick = () => { S.dtab = t.dataset.dtab; renderDrawer(false, true); });
  const ps = $d('#dpic'); if (ps && !ps.disabled) ps.onchange = () => { if (jalankanOp('kontrak.pic', kid, { PIC: ps.value })) toast(ps.value ? `PIC diatur ke ${ps.value}.` : 'PIC dikosongkan.'); };
  if ($d('#dverif')) $d('#dverif').onclick = () => { if (jalankanOp('kontrak.verif', kid, {})) toast('Ditandai terverifikasi.'); };
  if ($d('#darsip')) $d('#darsip').onclick = () => modal('Arsipkan kontrak?', `<div class="muted">Kontrak yang diarsipkan tidak tampil di daftar dan tidak bisa diubah. Data tetap tersimpan dan bisa dikembalikan dari filter <b>Diarsipkan</b>. Pakai untuk kontrak dobel atau batal; kontrak yang sudah selesai cukup CLOSE.</div><label class="of"><span>Alasan (wajib)</span><input class="inp" id="mAr" placeholder="mis. kontrak dobel / dibatalkan customer" maxlength="200"></label>`,
    [{ l: 'Batal' }, { l: 'Arsipkan', pri: true, fn: d => { const a = d.querySelector('#mAr').value.trim(); if (!a) { toast('Alasan wajib diisi.'); return false; } if (jalankanOp('kontrak.arsip', kid, { alasan: a })) { closeDrawer(); toast('Kontrak diarsipkan.'); } } }]);
  if ($d('#dunarsip')) $d('#dunarsip').onclick = () => { if (jalankanOp('kontrak.unarsip', kid, {})) toast('Kontrak dikembalikan dari arsip.'); };
  if ($d('#reopenLama')) $d('#reopenLama').onclick = () => reopenModal(b, true);
  if (ro) return;
  $$d('.ost').forEach(btn => btn.onclick = () => pindahTahap(b, btn.dataset.b, btn.dataset.t));
  if ($d('#addBast')) $d('#addBast').onclick = () => bastModal(b, null);
  $$d('[data-editb]').forEach(x => x.onclick = () => bastModal(b, x.dataset.editb));
  if ($d('#addKend')) $d('#addKend').onclick = () => kendalaModal(b);
  $$d('[data-tutup]').forEach(x => x.onclick = () => modal('Kendala selesai?', `<label class="of"><span>Catatan (opsional)</span><input class="inp" id="mCat" maxlength="200" placeholder="mis. dokumen revisi sudah diterima"></label>`,
    [{ l: 'Batal' }, { l: 'Tandai selesai', pri: true, fn: d => { if (jalankanOp('kendala.tutup', kid, { id: x.dataset.tutup, catatan: d.querySelector('#mCat').value })) toast('Kendala ditandai selesai.'); } }]));
  if ($d('#editK')) $d('#editK').onclick = () => openKontrakForm(b);
  if ($d('#addSO')) $d('#addSO').onclick = () => orderModal(b, null);
  $$d('[data-so]').forEach(tr => tr.onclick = () => orderModal(b, tr.dataset.so));
}
document.addEventListener('keydown', e => {
  if (!S.drawer || e.target.closest('input,select,textarea') || document.querySelector('#overlay-root .scrim')) return;
  if (e.key === 'j' || e.key === 'J') stepDrawer(1); else if (e.key === 'k' || e.key === 'K') stepDrawer(-1);
});

/* ---------- aksi detail ---------- */
function pindahTahap(b, bastId, ke) {
  const x = b.bast.find(z => z.BASTID === bastId), dari = T(x.KodeTahap), t = T(ke);
  if (!x || x.KodeTahap === ke) return;
  const mundur = dari && t.Urutan < dari.Urutan;
  modal(`${mundur ? 'Mundur' : 'Pindah'} ke ${esc(t.Label)}?`, `<div class="muted">${esc(x.BASTID)}: ${esc(dari ? dari.Label : x.KodeTahap)} → <b>${esc(t.Label)}</b>${t.Penutup ? '. Ini tahap penutup: BAST menjadi <b>CLOSE</b>.' : ''}</div>
    <label class="of"><span>Keterangan${mundur ? ' (wajib saat mundur)' : ' (opsional)'}</span><input class="inp" id="mKet" maxlength="200" placeholder="${mundur ? 'mis. eviden kurang, kembali dikompulir' : 'mis. sudah diterima customer'}"></label>`,
    [{ l: 'Batal' }, { l: mundur ? 'Mundur' : 'Pindah', pri: true, fn: d => {
      const ket = d.querySelector('#mKet').value.trim();
      if (mundur && !ket) { toast('Mundur tahap wajib disertai keterangan.'); return false; }
      if (jalankanOp('bast.tahap', b.k.KontrakID, { id: bastId, ke, ket })) toast(`${x.BASTID} → ${t.Label}${b.k.PIC && b.k.PIC !== S.me.alias ? ' (dicatat "bantu")' : ''}.`);
    } }]);
}
function bastModal(b, id) {
  const k = b.k, x = id ? b.bast.find(z => z.BASTID === id) : null, orders = KD.hidup(b.order), usul = KD.dokDefault(jc(k), D.cfg);
  const dipilih = x ? String(x.CakupanOrder).split(',').map(s => s.trim()).filter(Boolean) : orders.map(o => o.NoOrder);
  const sisa = k.JumlahLokasi !== '' ? Math.max(0, Number(k.JumlahLokasi) - KD.hidup(b.bast).filter(z => !x || z.BASTID !== x.BASTID).reduce((a, z) => a + (Number(z.CakupanLokasi) || 0), 0)) : '';
  modal(x ? 'Ubah ' + esc(x.BASTID) : 'Tambah BAST/BAA', `<div class="grid g2" style="gap:12px">
    <label class="of"><span>Dokumen tagih</span><select class="inp" id="bDok">${opsi(aktifRef(D.ref.dokTagih).map(d => [d.Kode, d.Kode + ' · ' + d.Label]), x ? x.DokTagih : usul)}</select><small>Usulan untuk customer ${KD.LABEL_JC[jc(k)]}: ${usul}</small></label>
    <label class="of"><span>Cakupan lokasi</span><input class="inp tnum" id="bCak" type="number" min="0" value="${esc(x ? x.CakupanLokasi : (b.bast.length ? sisa : ''))}" placeholder="${k.JumlahLokasi !== '' ? 'sisa ' + sisa + ' dari ' + esc(k.JumlahLokasi) : 'opsional'}"><small>${k.JumlahLokasi !== '' ? 'Total semua BAST tidak boleh melebihi ' + esc(k.JumlahLokasi) + ' lokasi.' : 'Jumlah lokasi kontrak belum diisi.'}</small></label></div>
    ${orders.length ? `<div class="of"><span>Cakupan order</span><div class="row" style="gap:6px">${orders.map(o => `<label class="chipf ${dipilih.indexOf(o.NoOrder) >= 0 ? 'on' : ''}" style="cursor:pointer"><input type="checkbox" class="bOrd" value="${esc(o.NoOrder)}" ${dipilih.indexOf(o.NoOrder) >= 0 ? 'checked' : ''} style="display:none">${esc(o.JenisOrder)} ${esc(o.NoOrder)}</label>`).join('')}</div></div>` : '<div class="muted" style="font-size:12.5px">Belum ada SO/MI di kontrak ini.</div>'}
    ${x ? `<label class="of"><span>No. dokumen BAST/BAA</span><input class="inp mono" id="bNo" value="${esc(x.NoDokBAST)}" maxlength="80"></label>` : ''}
    <label class="of"><span>Keterangan</span><input class="inp" id="bKet" value="${esc(x ? x.Keterangan : '')}" maxlength="200" placeholder="mis. lokasi tahap 1"></label>`,
    [{ l: 'Batal' }, { l: x ? 'Simpan' : 'Tambah', pri: true, fn: d => {
      const data = { DokTagih: d.querySelector('#bDok').value, CakupanLokasi: d.querySelector('#bCak').value.trim(), Keterangan: d.querySelector('#bKet').value,
                     CakupanOrder: [...d.querySelectorAll('.bOrd:checked')].map(c => c.value).join(', ') };
      if (x) { data.id = x.BASTID; data.NoDokBAST = d.querySelector('#bNo').value; }
      if (!jalankanOp(x ? 'bast.ubah' : 'bast.tambah', k.KontrakID, data)) return false;
      toast(x ? 'BAST diperbarui.' : 'BAST ditambahkan.');
    } }]);
  setTimeout(() => document.querySelectorAll('.bOrd').forEach(c => c.parentElement.onclick = ev => { ev.preventDefault(); c.checked = !c.checked; c.parentElement.classList.toggle('on', c.checked); }), 50);
}
function kendalaModal(b) {
  const basts = KD.hidup(b.bast), def = (bottleneck(b) || basts[basts.length - 1]).BASTID;
  const isi = bid => {
    const x = basts.find(z => z.BASTID === bid), close = KD.bastClose(x, D.ref), jenis = aktifRef(D.ref.kendala).filter(j => !close || j.MemicuReopen);
    return `<label class="of"><span>Jenis kendala</span><select class="inp" id="kJ">${opsi(jenis.map(j => [j.Kode, j.Label + (j.MemicuReopen ? ' · memicu reopen' : '')]))}</select></label>
     ${close ? `<div class="note warn">${ic('warn', 's')}<span class="tx">${esc(bid)} sudah <b>CLOSE</b>. Kendala ini akan <b>membuka kembali (reopen)</b> BAST: siklus bertambah dan kontrak kembali OPEN.</span></div>
       <label class="of"><span>Kembali ke tahap</span><select class="inp" id="kT">${opsi(D.ref.tahap.filter(t => t.Aktif && !t.Penutup).map(t => [t.Kode, t.Label]), D.cfg.TAHAP_REOPEN || 'DRAFTING')}</select></label>` : ''}
     <label class="of"><span>Keterangan</span><input class="inp" id="kKet" maxlength="300" placeholder="mis. PIC customer cuti s.d. 25 Nov"><small>Masuk ke kolom KENDALA DETIL di sheet unit.</small></label>`;
  };
  modal('Buka kendala', `<label class="of"><span>BAST</span><select class="inp" id="kB">${opsi(basts.map(x => [x.BASTID, x.BASTID + ' · ' + labelTahap(x.KodeTahap) + (KD.bastClose(x, D.ref) ? ' (CLOSE)' : '')]), def)}</select></label><div id="kIsi">${isi(def)}</div>`,
    [{ l: 'Batal' }, { l: 'Buka kendala', pri: true, fn: d => {
      const data = { bastId: d.querySelector('#kB').value, Jenis: d.querySelector('#kJ').value, Keterangan: d.querySelector('#kKet').value.trim() };
      const kt = d.querySelector('#kT'); if (kt) data.tahapReopen = kt.value;
      if (!jalankanOp('kendala.buka', b.k.KontrakID, data)) return false;
      toast(kt ? 'Kendala dibuka dan BAST di-reopen.' : 'Kendala dibuka.');
    } }]);
  setTimeout(() => { const s = document.getElementById('kB'); if (s) s.onchange = () => { document.getElementById('kIsi').innerHTML = isi(s.value); }; }, 50);
}
function reopenModal(b) {
  const jenis = aktifRef(D.ref.kendala).filter(j => j.MemicuReopen), basts = KD.hidup(b.bast);
  modal('Buka kembali ' + esc(b.k.KontrakID), `<div class="muted">Reopen terjadi karena return atau revisi. Kontrak dipindah dari arsip ke data aktif dengan ID yang sama; BAST masuk siklus baru dan kendalanya dicatat.</div>
   ${basts.length > 1 ? `<label class="of"><span>BAST</span><select class="inp" id="roB">${opsi(basts.map(x => [x.BASTID, x.BASTID + ' · ' + x.DokTagih]), basts[basts.length - 1].BASTID)}</select></label>` : ''}
   <label class="of"><span>Alasan (kendala pemicu reopen)</span><select class="inp" id="roK">${opsi(jenis.map(j => [j.Kode, j.Label]))}</select></label>
   <label class="of"><span>Keterangan (wajib)</span><input class="inp" id="roKet" maxlength="300" placeholder="mis. customer minta revisi nilai di BAST"></label>
   <label class="of"><span>Kembali ke tahap</span><select class="inp" id="roT">${opsi(D.ref.tahap.filter(t => t.Aktif && !t.Penutup).map(t => [t.Kode, t.Label]), D.cfg.TAHAP_REOPEN || 'DRAFTING')}</select></label>`,
   [{ l: 'Batal' }, { l: 'Buka kembali', pri: true, fn: d => {
     const ket = d.querySelector('#roKet').value.trim();
     if (!ket) { toast('Keterangan wajib diisi.'); return false; }
     prosesReopenArsip(b.k.KontrakID, { bastId: d.querySelector('#roB') ? d.querySelector('#roB').value : '', Jenis: d.querySelector('#roK').value, Keterangan: ket, tahapReopen: d.querySelector('#roT').value });
   } }]);
}
async function prosesReopenArsip(kid, data) {
  const lp = layarProgres('Membuka kembali ' + kid, ['Memindah kontrak, BAST, SO/MI & riwayat dari arsip', 'Membuka kendala & siklus baru BAST', 'Memperbarui indeks']);
  lp.langkah(0);
  const t = setTimeout(() => lp.langkah(1), 1500);
  try {
    const r = await call('arsip.reopen', Object.assign({ kid }, data));
    clearTimeout(t); lp.langkah(2);
    D.base[kid] = r.bundle; hitungView(kid); S.lama = null; S.arsQ = ''; delete S.riw[kid];
    lp.selesai();
    S.dlist = [kid]; renderDrawer(false); segarkanTampilan(); toast(`${kid} dibuka kembali dan kembali ke data aktif.`);
  } catch (e) { clearTimeout(t); lp.selesai(); modalGagal(e); }
}
function orderModal(b, id) {
  const o = id ? b.order.find(z => z.OrderID === id) : { JenisOrder: 'SO', NoOrder: '', JenisLayanan: '', JenisPekerjaan: '', JumlahLokasi: '', Keterangan: '' };
  const acts = [{ l: 'Batal' }];
  if (id) acts.push({ l: 'Hapus', fn: () => { modal('Hapus ' + esc(o.NoOrder) + '?', '<div class="muted">SO/MI ditandai terhapus (tetap tercatat di Log).</div>', [{ l: 'Batal' }, { l: 'Hapus', pri: true, fn: () => { if (jalankanOp('order.hapus', b.k.KontrakID, { id })) toast('SO/MI dihapus.'); } }]); } });
  acts.push({ l: id ? 'Simpan' : 'Tambah', pri: true, fn: d => {
    const v = s => d.querySelector(s).value.trim();
    const data = { o: { OrderID: id || '', JenisOrder: v('#oJ'), NoOrder: v('#oNo'), JenisLayanan: v('#oLay'), JenisPekerjaan: v('#oPek'), JumlahLokasi: v('#oLok'), Keterangan: v('#oKet') } };
    if (!jalankanOp('order.simpan', b.k.KontrakID, data)) return false;
    toast(id ? 'SO/MI diperbarui.' : 'SO/MI ditambahkan.');
  } });
  modal(id ? 'Ubah ' + esc(o.JenisOrder + ' ' + o.NoOrder) : 'Tambah SO/MI', `<div class="grid g2" style="gap:12px"><label class="of"><span>Jenis</span><select class="inp" id="oJ">${opsi(['SO', 'MI'], o.JenisOrder)}</select></label><label class="of"><span>No. order *</span><input class="inp mono" id="oNo" value="${esc(o.NoOrder)}" maxlength="60"></label>
   <label class="of"><span>Jenis layanan</span><input class="inp" id="oLay" value="${esc(o.JenisLayanan)}" maxlength="60"></label><label class="of"><span>Jenis pekerjaan</span><input class="inp" id="oPek" value="${esc(o.JenisPekerjaan)}" maxlength="60"></label>
   <label class="of"><span>Jumlah lokasi</span><input class="inp tnum" id="oLok" type="number" min="0" value="${esc(o.JumlahLokasi)}"></label><label class="of"><span>Keterangan</span><input class="inp" id="oKet" value="${esc(o.Keterangan)}" maxlength="200"></label></div>`, acts);
}

/* ---------- form tambah / ubah kontrak (panel geser) ---------- */
function openKontrakForm(b) {
  const k = b ? b.k : null;
  S.kfm = k ? { NoKontrak: k.NoKontrak, JenisDok: k.JenisDok, NamaPelanggan: k.NamaPelanggan, EndCustomer: k.EndCustomer, JudulKontrak: k.JudulKontrak, TahunProject: k.TahunProject,
               Populasi: k.Populasi, Segment: k.Segment, NilaiKontrak: k.NilaiKontrak, JumlahLokasi: k.JumlahLokasi, PIC: k.PIC, alasan: '' }
            : { NoKontrak: '', JenisDok: '', NamaPelanggan: '', EndCustomer: '', JudulKontrak: '', TahunProject: String(new Date().getFullYear()), Populasi: '', Segment: '', NilaiKontrak: '', JumlahLokasi: '',
                PIC: can('pic.atur') ? '' : (S.me.alias || ''), orders: [{ JenisOrder: 'SO', NoOrder: '', JenisLayanan: '', JenisPekerjaan: '', JumlahLokasi: '' }], buatBast: true, dokTagih: '' };
  S.kfmOrig = b || null; S.kfmErr = '';
  const keep = S.drawer; S.drawerSimpan = keep;
  renderKForm(true);
  setTimeout(() => { const el = document.querySelector('#overlay-root #fNo'); if (el) el.focus(); }, 80);
}
function closeKForm() { const r = document.getElementById('kform-root'); if (r) r.remove(); }
function dupeLokal(no) {
  const nk = KD.normKey(no); if (!nk) return null;
  const own = S.kfmOrig ? S.kfmOrig.k.KontrakID : null;
  return semuaKontrak().find(b => b.k.KontrakID !== own && (b.k.NoKontrakNorm === nk || (b.alias || []).some(a => a.AliasNorm === nk))) || null;
}
function renderKForm(opening) {
  const F = S.kfm, O = S.kfmOrig, baru = !O;
  let root = document.getElementById('kform-root');
  if (!root) { root = document.createElement('div'); root.id = 'kform-root'; document.getElementById('overlay-root').appendChild(root); }
  const sc = root.querySelector('.dbody') ? root.querySelector('.dbody').scrollTop : 0, d = dupeLokal(F.NoKontrak), jcF = KD.jenisCustomer(F.NamaPelanggan, F.EndCustomer), usul = KD.dokDefault(jcF, D.cfg);
  const nomorBerubah = O && KD.normKey(F.NoKontrak) !== O.k.NoKontrakNorm && F.NoKontrak.trim();
  const nilai = KD.bacaRupiah(F.NilaiKontrak);
  root.innerHTML = `<div><div class="dscrim" id="kfScrim" style="z-index:60;${opening ? '' : 'animation:none'}"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="${baru ? 'Tambah kontrak' : 'Ubah kontrak'}" style="width:min(680px,100vw);z-index:61;${opening ? '' : 'animation:none'}">
   <div class="dhead" style="padding-bottom:14px"><div class="dtop"><button class="iconbtn" id="kfClose" aria-label="Tutup">${ic('x')}</button><div><div class="eyebrow">${baru ? 'Kontrak baru' : 'Ubah data kontrak'}</div><div style="font-weight:800;font-size:18px">${baru ? 'Tambah kontrak' : esc(O.k.KontrakID)}</div></div></div></div>
   <div class="dbody">
    <div class="sect"><div class="eyebrow">Identitas</div>
     <label class="of"><span>No. kontrak *</span><input class="inp mono" id="fNo" value="${esc(F.NoKontrak)}" maxlength="120" autocomplete="off" spellcheck="false"></label>
     <div id="fDupe">${d ? `<div class="dupe">${ic('warn', 's')} Nomor ini sudah terdaftar sebagai <b>${esc(d.k.KontrakID)}</b> (${esc(custName(d.k))}). <button type="button" class="btn sm ghost" data-buka="${esc(d.k.KontrakID)}">Buka</button></div>` : F.NoKontrak ? `<div class="muted" style="font-size:11.5px;margin-top:4px">Kunci pencocokan: <span class="mono">${esc(KD.normKey(F.NoKontrak))}</span>. Kontrak lama di arsip dicek saat menyimpan.</div>` : ''}</div>
     ${nomorBerubah ? `<label class="of"><span>Alasan koreksi nomor</span><input class="inp" id="fAlasan" value="${esc(F.alasan)}" maxlength="200" placeholder="mis. salah ketik, sesuai dokumen kontrak"><small>Nomor lama <span class="mono">${esc(O.k.NoKontrak)}</span> disimpan sebagai <b>nomor lama</b>, supaya baris di sheet unit tetap dikenali. ID ${esc(O.k.KontrakID)} tidak berubah.</small></label>` : ''}
     <label class="of"><span>Judul kontrak *</span><input class="inp" id="fJudul" value="${esc(F.JudulKontrak)}" maxlength="200"></label>
     <div class="grid g2" style="gap:12px"><label class="of"><span>Jenis dok</span><select class="inp" id="fJenis">${opsi(aktifRef(D.ref.jenisDok).map(x => [x.Kode, x.Label]).concat(F.JenisDok && !aktifRef(D.ref.jenisDok).some(x => x.Kode === F.JenisDok) ? [[F.JenisDok, F.JenisDok]] : []), F.JenisDok, baru ? '(tebak dari nomor)' : '—')}</select></label>
      <label class="of"><span>Tahun project</span><input class="inp tnum" id="fTahun" value="${esc(F.TahunProject)}" maxlength="4" inputmode="numeric"></label></div></div>
    <div class="sect"><div class="eyebrow">Customer</div>
     <div class="grid g2" style="gap:12px"><label class="of"><span>Customer (direct)</span><input class="inp" id="fPel" value="${esc(F.NamaPelanggan)}" maxlength="120"></label><label class="of"><span>End customer</span><input class="inp" id="fEnd" value="${esc(F.EndCustomer)}" maxlength="120"></label></div>
     <div id="fJc">${custPill({ NamaPelanggan: F.NamaPelanggan, EndCustomer: F.EndCustomer })} <span class="muted" style="font-size:12px">· usulan dokumen tagih <b>${usul}</b></span></div></div>
    <div class="sect"><div class="eyebrow">Nilai & referensi</div>
     <div class="grid g2" style="gap:12px"><label class="of"><span>Nilai kontrak</span><input class="inp tnum" id="fNilai" value="${esc(F.NilaiKontrak)}" placeholder="mis. 1.250.000.000"><small id="fRp">${F.NilaiKontrak !== '' ? (nilai.e ? '<span style="color:var(--crit)">bukan angka</span>' : rp(nilai.v)) : ''}</small></label>
      <label class="of"><span>Jumlah lokasi</span><input class="inp tnum" id="fLok" type="number" min="1" value="${esc(F.JumlahLokasi)}" placeholder="opsional"></label>
      <label class="of"><span>Populasi</span><select class="inp" id="fPop">${opsi(aktifRef(D.ref.populasi).map(x => [x.Kode, x.Label]), F.Populasi, '—')}</select></label>
      <label class="of"><span>Segment</span><select class="inp" id="fSeg">${opsi(aktifRef(D.ref.segment).map(x => [x.Kode, x.Label]), F.Segment, '—')}</select></label>
      <label class="of"><span>PIC</span><select class="inp" id="fPic" ${can('pic.atur') ? '' : 'disabled'}>${opsi(picList().concat(F.PIC && picList().indexOf(F.PIC) < 0 ? [F.PIC] : []), F.PIC, '— Tanpa PIC —')}</select><small>${can('pic.atur') ? '' : 'PIC sementara = Anda; admin bisa menggantinya.'}</small></label></div></div>
    ${baru ? `<div class="sect"><div class="eyebrow">SO / MI</div>
     ${F.orders.map((o, i) => `<div class="orow"><select class="inp" data-o="${i}" data-f="JenisOrder" aria-label="Jenis order">${opsi(['SO', 'MI'], o.JenisOrder)}</select><input class="inp mono" data-o="${i}" data-f="NoOrder" value="${esc(o.NoOrder)}" placeholder="No. SO/MI" aria-label="No. order"><input class="inp" data-o="${i}" data-f="JenisLayanan" value="${esc(o.JenisLayanan)}" placeholder="Layanan" aria-label="Layanan"><input class="inp" data-o="${i}" data-f="JenisPekerjaan" value="${esc(o.JenisPekerjaan)}" placeholder="Pekerjaan" aria-label="Pekerjaan"><input class="inp tnum" data-o="${i}" data-f="JumlahLokasi" value="${esc(o.JumlahLokasi)}" placeholder="Lok." aria-label="Lokasi"><button type="button" class="iconbtn" data-odel="${i}" aria-label="Hapus baris">${ic('x', 's')}</button></div>`).join('')}
     <button type="button" class="btn sm ghost" id="fAddO" style="align-self:flex-start">${ic('add', 's')}Tambah SO/MI</button></div>
    <div class="sect"><div class="eyebrow">BAST pertama</div>
     <div class="swrow"><div style="flex:1"><b>Buat BAST-1 sekarang</b><small>Masuk tahap ${esc(labelTahap(KD.tahapPertama(D.ref)))} dengan cakupan semua SO/MI di atas.</small></div><button type="button" class="toggle ${F.buatBast ? 'on' : ''}" id="fBast" aria-pressed="${F.buatBast}" aria-label="Buat BAST-1"></button></div>
     ${F.buatBast ? `<label class="of"><span>Dokumen tagih</span><select class="inp" id="fDok">${opsi(aktifRef(D.ref.dokTagih).map(x => [x.Kode, x.Kode + ' · ' + x.Label]), F.dokTagih || usul)}</select><small>Usulan mengikuti jenis customer; bisa diganti per BAST kapan saja.</small></label>` : ''}</div>` : ''}
    <div id="fErr">${S.kfmErr ? `<div class="note crit">${ic('warn', 's')}<span class="tx">${esc(S.kfmErr)}</span></div>` : ''}</div>
   </div>
   <div class="sfoot"><button class="btn" id="kfCancel">Batal</button><button class="btn pri" id="kfSave">${ic('check', 's')}${baru ? 'Simpan kontrak' : 'Simpan perubahan'}</button></div>
  </aside></div>`;
  root.querySelector('.dbody').scrollTop = sc;
  bindKForm();
}
function bindKForm() {
  const root = document.getElementById('kform-root'), q = s => root.querySelector(s), F = S.kfm;
  q('#kfClose').onclick = q('#kfCancel').onclick = q('#kfScrim').onclick = closeKForm;
  const upd = (sel, key, render) => { const el = q(sel); if (!el) return; el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { F[key] = el.value; if (render) render(); }); };
  const segarJc = () => { const j = KD.jenisCustomer(F.NamaPelanggan, F.EndCustomer); q('#fJc').innerHTML = `${custPill({ NamaPelanggan: F.NamaPelanggan, EndCustomer: F.EndCustomer })} <span class="muted" style="font-size:12px">· usulan dokumen tagih <b>${KD.dokDefault(j, D.cfg)}</b></span>`; };
  const segarNo = () => { const pos = q('#fNo').selectionStart; const berubah = S.kfmOrig && (KD.normKey(F.NoKontrak) !== S.kfmOrig.k.NoKontrakNorm) !== !!q('#fAlasan'); if (berubah) { renderKForm(false); const n = q('#fNo'); n.focus(); n.setSelectionRange(pos, pos); return; } const d = dupeLokal(F.NoKontrak); q('#fDupe').innerHTML = d ? `<div class="dupe">${ic('warn', 's')} Nomor ini sudah terdaftar sebagai <b>${esc(d.k.KontrakID)}</b> (${esc(custName(d.k))}). <button type="button" class="btn sm ghost" data-buka="${esc(d.k.KontrakID)}">Buka</button></div>` : F.NoKontrak ? `<div class="muted" style="font-size:11.5px;margin-top:4px">Kunci pencocokan: <span class="mono">${esc(KD.normKey(F.NoKontrak))}</span>. Kontrak lama di arsip dicek saat menyimpan.</div>` : ''; bindBuka(); };
  const bindBuka = () => root.querySelectorAll('[data-buka]').forEach(b => b.onclick = () => { closeKForm(); openDrawer(b.dataset.buka); });
  upd('#fNo', 'NoKontrak', segarNo); upd('#fJudul', 'JudulKontrak'); upd('#fJenis', 'JenisDok'); upd('#fTahun', 'TahunProject'); upd('#fPel', 'NamaPelanggan', segarJc); upd('#fEnd', 'EndCustomer', segarJc);
  upd('#fNilai', 'NilaiKontrak', () => { const n = KD.bacaRupiah(F.NilaiKontrak); q('#fRp').innerHTML = F.NilaiKontrak !== '' ? (n.e ? '<span style="color:var(--crit)">bukan angka</span>' : rp(n.v)) : ''; });
  upd('#fLok', 'JumlahLokasi'); upd('#fPop', 'Populasi'); upd('#fSeg', 'Segment'); upd('#fPic', 'PIC'); upd('#fAlasan', 'alasan'); upd('#fDok', 'dokTagih');
  bindBuka();
  root.querySelectorAll('[data-o]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { F.orders[+el.dataset.o][el.dataset.f] = el.value; }));
  root.querySelectorAll('[data-odel]').forEach(b => b.onclick = () => { F.orders.splice(+b.dataset.odel, 1); renderKForm(false); });
  if (q('#fAddO')) q('#fAddO').onclick = () => { F.orders.push({ JenisOrder: 'SO', NoOrder: '', JenisLayanan: '', JenisPekerjaan: '', JumlahLokasi: '' }); renderKForm(false); };
  if (q('#fBast')) q('#fBast').onclick = () => { F.buatBast = !F.buatBast; renderKForm(false); };
  q('#kfSave').onclick = simpanKontrak;
}
function simpanKontrak() {
  const F = S.kfm, O = S.kfmOrig, err = m => { S.kfmErr = m; renderKForm(false); const b = document.querySelector('#kform-root .dbody'); if (b) b.scrollTop = 1e5; };
  const d = dupeLokal(F.NoKontrak);
  if (d) return err(`No. kontrak sudah terdaftar sebagai ${d.k.KontrakID}. Buka kontrak itu, atau bila penulisannya berbeda, koreksi nomornya di sana.`);
  const f = {}; KD.FIELD_KONTRAK.forEach(c => { if (c in F) f[c] = F[c]; });
  try {
    if (!O) {
      const kid = jalankanOp('kontrak.buat', null, { f, orders: F.orders, buatBast: F.buatBast, dokTagih: F.buatBast ? (F.dokTagih || '') : '' }, { lempar: true });
      closeKForm(); S.kf.st = 'OPEN'; S.kf.q = ''; if (S.page !== 'kontrak') go('kontrak'); else rerenderKontrak();
      setTimeout(() => openDrawer(kid), 320); toast('Kontrak didaftarkan. Nomor kontrak lama di arsip dicek server; bila dobel, Anda diberi tahu.');
    } else {
      const ch = KD.FIELD_KONTRAK.filter(c => String(f[c] ?? '') !== String(O.k[c] ?? ''));
      if (!ch.length) { closeKForm(); toast('Tidak ada perubahan.'); return; }
      const patch = {}; ch.forEach(c => { patch[c] = f[c]; });
      jalankanOp('kontrak.ubah', O.k.KontrakID, { f: patch, alasan: F.alasan }, { lempar: true });
      closeKForm(); toast(ch.indexOf('NoKontrak') >= 0 ? 'Disimpan. Nomor lama disimpan sebagai alias.' : 'Data kontrak disimpan.');
    }
  } catch (e) { err(e.message || String(e)); }
}
