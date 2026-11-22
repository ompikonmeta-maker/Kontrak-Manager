/* ================= F2 · data aktif di browser, antrean simpan, tarik perubahan (§4.4) ================= */
const D = { siap: false, memuat: null, seq: 0, base: {}, view: {}, antre: [], kirim: false, refRaw: null, ref: null, cfg: {}, users: [], hariIni: '',
            tersimpan: 0, terakhirTarik: 0, gagalKirim: 0, flash: {}, tempN: 0, dibuka: {} };

const pad2 = n => (n < 10 ? '0' : '') + n;
function sekarangStr() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }
function hariIniStr() { return sekarangStr().slice(0, 10); }
function agingBatas() { const a = String(D.cfg.AGING_BATAS || '7,14,30').split(',').map(Number); return a.length === 3 && a.every(isFinite) ? a : [7, 14, 30]; }

function terimaRef(refRaw, cfg, users) {
  if (refRaw) { D.refRaw = refRaw; D.ref = KD.siapkanRef(refRaw); }
  if (cfg) D.cfg = cfg;
  if (users) D.users = users;
}
function dariKompak(t) { return (t.r || []).map(r => { const o = {}; t.c.forEach((c, i) => { o[c] = r[i]; }); return o; }); }
function bundleDariSnapshot(tabs) {
  const m = {};
  dariKompak(tabs.Kontrak).forEach(k => { m[k.KontrakID] = { k, bast: [], order: [], kend: [], alias: [] }; });
  [['BAST', 'bast'], ['OrderInternal', 'order'], ['Kendala', 'kend'], ['KontrakAlias', 'alias']].forEach(([tab, key]) => {
    if (tabs[tab]) dariKompak(tabs[tab]).forEach(r => { if (m[r.KontrakID]) m[r.KontrakID][key].push(r); });
  });
  return m;
}
function ctxKlien(a) {
  return { user: S.me.username, nama: S.me.nama, alias: S.me.alias || '', now: (a && a.now) || sekarangStr(), ref: D.ref, cfg: D.cfg, izin: S.me.izin || [],
           idKontrak: () => (a && a.kid) || ('K-BARU-' + (++D.tempN)) };
}
function hitungView(kid) {
  let b = D.base[kid] ? D.base[kid] : null, ada = false;
  D.antre.forEach(a => {
    if (a.kid !== kid) return;
    try { b = KD.jalankan(a.op, b, a.data, ctxKlien(a)).bundle; a.err = null; ada = true; } catch (e) { a.err = e; }
  });
  if (b) D.view[kid] = ada ? b : D.base[kid]; else delete D.view[kid];
}
function hitungSemuaView() { D.view = {}; Object.keys(D.base).forEach(k => { D.view[k] = D.base[k]; }); new Set(D.antre.map(a => a.kid)).forEach(hitungView); }
const semuaKontrak = () => Object.values(D.view);
const kontrak = kid => D.view[kid] || null;

/** Muat data aktif. tampil=true memunculkan layar progres (saat aplikasi dibuka). */
function muatData(tampil) {
  if (D.memuat) return D.memuat;
  const ov = tampil ? layarProgres('Memuat data aktif', ['Menghubungi server', 'Kontrak aktif', 'BAST, SO/MI, kendala', 'Siap: daftar, filter, cari & detail kini instan']) : null;
  if (ov) ov.langkah(0);
  D.memuat = call('data.muat').then(r => {
    if (ov) ov.langkah(1, 'Kontrak aktif · ' + r.snap.tabs.Kontrak.r.length.toLocaleString('id-ID') + ' kontrak');
    terimaRef(r.ref, r.cfg, r.users);
    D.base = bundleDariSnapshot(r.snap.tabs); D.seq = r.snap.seq; D.hariIni = r.hariIni || hariIniStr();
    if (ov) ov.langkah(2);
    hitungSemuaView(); D.siap = true; D.terakhirTarik = Date.now();
    return tarik(true).then(() => { if (ov) { ov.langkah(3); ov.selesai(); } jadwalTarik(); syncChip(); });
  }).catch(e => { if (ov) ov.selesai(); throw e; }).finally(() => { D.memuat = null; });
  return D.memuat;
}

/* ---------- tarik perubahan dari anggota tim lain ---------- */
let tarikT = null;
function jadwalTarik() {
  clearTimeout(tarikT);
  const det = Math.max(15, Number(D.cfg.SINKRON_KLIEN_DETIK) || 30);
  tarikT = setTimeout(() => { if (!S.me) return; if (document.hidden) { jadwalTarik(); return; } tarik().finally(jadwalTarik); }, det * 1000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && D.siap && S.me && Date.now() - D.terakhirTarik > 20000) tarik().finally(jadwalTarik); });
async function tarik(diam) {
  if (!D.siap || !S.me) return;
  let r;
  try { r = await call('data.perubahan', { sejak: D.seq }); } catch (e) { return; }
  D.terakhirTarik = Date.now();
  if (r.hariIni) D.hariIni = r.hariIni;
  if (r.muatUlang) { await muatUlangDiam(); return; }
  const diubahOrangLain = [];
  let perluRef = false, perluMuat = false;
  (r.entri || []).forEach(e => {
    if (e.muatUlang) perluMuat = true;
    if (e.muatRef) perluRef = true;
    const list = e.bundle ? [e.bundle] : (e.bundles || []);
    list.forEach(b => {
      const kid = b.k.KontrakID, lama = D.base[kid];
      if (lama && Number(lama.k.Version) > Number(b.k.Version)) return;
      D.base[kid] = b;
      if (b.k.UpdatedBy && b.k.UpdatedBy !== S.me.username && (!lama || lama.k.Version !== b.k.Version)) { diubahOrangLain.push(b); D.flash[kid] = Date.now(); }
    });
  });
  D.seq = r.seq;
  if (perluMuat) { await muatUlangDiam(); return; }
  if (perluRef) { try { const x = await call('data.ref'); terimaRef(x.ref, x.cfg, x.users); } catch (e) { /* coba lagi nanti */ } }
  if ((r.entri || []).length) {
    hitungSemuaView();
    segarkanTampilan();
    if (!diam && diubahOrangLain.length) {
      const b = diubahOrangLain[0], nama = namaUser(b.k.UpdatedBy);
      toast(diubahOrangLain.length === 1 ? `${nama} mengubah ${b.k.KontrakID}. Tampilan diperbarui otomatis.` : `${diubahOrangLain.length} kontrak diubah anggota tim lain. Tampilan diperbarui otomatis.`);
    }
  }
  syncChip();
}
async function muatUlangDiam() {
  try {
    const r = await call('data.muat');
    terimaRef(r.ref, r.cfg, r.users);
    D.base = bundleDariSnapshot(r.snap.tabs); D.seq = r.snap.seq;
    hitungSemuaView();
    await tarik(true);
    segarkanTampilan();
  } catch (e) { /* coba lagi pada tarikan berikutnya */ }
}
function namaUser(u) { const x = D.users.find(z => z.username === u); return x ? (x.alias || x.nama || u) : u; }

/* ---------- antrean simpan (optimis) ---------- */
/** Jalankan operasi: tampilan langsung berubah, server menyusul di latar. Mengembalikan false bila ditolak aturan. */
function jalankanOp(op, kid, data, opt) {
  opt = opt || {};
  const a = { id: Math.random().toString(36).slice(2), op, kid, data: KD.salin(data || {}), now: sekarangStr() };
  if (op === 'kontrak.buat') { a.kid = 'K-BARU-' + (++D.tempN); a.data.KontrakID = a.kid; a.tempKid = a.kid; }
  try { KD.jalankan(op, op === 'kontrak.buat' ? null : kontrak(a.kid), a.data, ctxKlien(a)); }
  catch (e) { if (opt.lempar) throw e; modalGagal({ kode: e.kode, pesan: e.message }); return false; }
  D.antre.push(a);
  hitungView(a.kid);
  syncChip(); segarkanTampilan();
  prosesAntre();
  return a.kid;
}
function gantiTemp(temp, real) {
  D.antre.forEach(a => { if (a.kid === temp) { a.kid = real; a.data = JSON.parse(JSON.stringify(a.data).split(temp).join(real)); } });
  delete D.view[temp];
  if (S.drawer === temp) S.drawer = real;
  if (S.sel && S.sel.has(temp)) { S.sel.delete(temp); S.sel.add(real); }
}
async function prosesAntre() {
  if (D.kirim || !D.antre.length || !S.me) return;
  D.kirim = true; syncChip();
  const a = D.antre[0], b0 = D.base[a.kid];
  try {
    const kirimData = KD.salin(a.data); delete kirimData.KontrakID;
    const r = await call('kontrak.op', { op: a.op, kid: a.op === 'kontrak.buat' ? '' : a.kid, versi: b0 ? b0.k.Version : '', tempKid: a.tempKid || '',
      bundle: b0 ? { bast: b0.bast, order: b0.order, kend: b0.kend, alias: b0.alias } : null, data: kirimData });
    D.antre.shift(); D.gagalKirim = 0;
    const real = r.bundle.k.KontrakID;
    if (a.op === 'kontrak.buat') { gantiTemp(a.kid, real); }
    D.base[real] = r.bundle;
    hitungView(real);
    D.tersimpan = Date.now();
  } catch (e) {
    if ((e.kode === 'JARINGAN' || e.kode === 'SIBUK') && D.gagalKirim < 6) {
      D.gagalKirim++; D.kirim = false; syncChip();
      setTimeout(prosesAntre, Math.min(30000, 2000 * Math.pow(2, D.gagalKirim)));
      return;
    }
    D.antre.shift(); D.gagalKirim = 0;
    hitungView(a.kid);
    if (e.kode !== 'SESI_HABIS') {
      modal('Perubahan tidak tersimpan', `<div class="note crit">${ic('warn', 's')}<span class="tx">${esc(e.pesan || String(e))}</span></div><div class="muted" style="font-size:12.5px">Tampilan dikembalikan ke data terakhir di server.</div>`, [{ l: 'Mengerti', pri: true }]);
      if (e.kode === 'KONFLIK' || e.kode === 'DI_ARSIP') tarik(true);
    }
  }
  D.kirim = false;
  syncChip(); segarkanTampilan();
  if (D.antre.length) prosesAntre();
}
window.addEventListener('beforeunload', e => { if (D.antre.length) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- tanda simpan/sinkron di bilah atas ---------- */
function syncChip() {
  const el = document.getElementById('syncChip'); if (!el) return;
  if (!D.siap) { el.hidden = true; return; }
  el.hidden = false;
  const n = D.antre.length, now = Date.now();
  if (n) { el.className = 'syncchip busy'; el.innerHTML = `<span class="bspin"></span>Menyimpan ${n} perubahan…`; return; }
  if (D.gagalKirim) { el.className = 'syncchip warn'; el.innerHTML = `${ic('warn', 's')}Mencoba lagi…`; return; }
  if (now - D.tersimpan < 8000) { el.className = 'syncchip ok'; el.innerHTML = `${ic('check', 's')}Tersimpan ${new Date(D.tersimpan).toTimeString().slice(0, 5)}`; return; }
  const d = Math.round((now - D.terakhirTarik) / 1000);
  el.className = 'syncchip'; el.innerHTML = `<span class="pulse"></span>Data terbaru · ${d < 10 ? 'baru saja' : d < 120 ? d + ' dtk lalu' : Math.round(d / 60) + ' mnt lalu'}`;
}
setInterval(syncChip, 5000);
function infoSync() {
  modal('Cara data tersimpan', `<div style="display:grid;gap:10px">
   <div class="note info">${ic('sync', 's')}<span class="tx"><b>Data kontrak aktif ada di browser</b> sejak aplikasi dibuka, jadi daftar, filter, cari, dan detail langsung tampil tanpa menunggu server.</span></div>
   <div class="note info">${ic('check', 's')}<span class="tx"><b>Setiap perubahan langsung tampil</b>, lalu disimpan ke server di latar (±3–4 dtk). Tanda di bilah atas: <i>Menyimpan…</i> → <i>Tersimpan</i>. Bila ditolak (mis. bentrok dengan perubahan orang lain), tampilan dikembalikan dan muncul pesan.</span></div>
   <div class="note info">${ic('person', 's')}<span class="tx"><b>Perubahan anggota tim lain</b> masuk otomatis tiap ±${Number(D.cfg.SINKRON_KLIEN_DETIK) || 30} detik.</span></div>
   <div class="muted" style="font-size:12px">Jangan tutup tab saat tanda <i>Menyimpan…</i> masih tampil; browser akan mengingatkan.</div></div>`,
   [{ l: 'Tarik sekarang', fn: () => { tarik(); } }, { l: 'Mengerti', pri: true }]);
}

/* ---------- layar progres ---------- */
function layarProgres(judul, langkah) {
  const ov = document.createElement('div'); ov.className = 'loadov';
  ov.innerHTML = `<div class="loadbox" role="status" aria-live="polite"><div class="uic big">${ic('sync')}</div><h3>${esc(judul)}</h3><ol class="lsteps">${langkah.map(l => `<li>${esc(l)}</li>`).join('')}</ol></div>`;
  document.body.appendChild(ov);
  const li = [...ov.querySelectorAll('li')];
  return {
    el: ov,
    langkah(i, teks) { li.forEach((x, j) => { x.className = j < i ? 'done' : j === i ? 'on' : ''; }); if (teks && li[i]) li[i].textContent = teks; },
    selesai() { li.forEach(x => { x.className = 'done'; }); ov.classList.add('out'); setTimeout(() => ov.remove(), REDUCED ? 0 : 450); }
  };
}

/* ---------- unduh file dari base64 ---------- */
function unduhBase64(nama, b64, mime) {
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([u], { type: mime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
}
