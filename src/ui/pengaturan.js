/* ================= F2 · Pengaturan: tahap, kendala, Nilai Push, referensi, config (§5.1, §5.2, §5.5) ================= */
S.set = { tab: 'tahap', draft: null, refJenis: 'populasi', cfg: null };
const TAB_SET = [['tahap', 'Tahap'], ['kendala', 'Kendala'], ['push', 'Nilai Push'], ['ref', 'Referensi'], ['config', 'Config']];
const NAMA_REF = { jenisDok: 'Jenis dok', populasi: 'Populasi', segment: 'Segment', dokTagih: 'Dokumen tagih' };
const salinList = l => (l || []).map(x => Object.assign({}, x));
function draftAwal() {
  const r = D.refRaw, t = S.set.tab;
  if (t === 'tahap') return salinList(r.tahap).sort((a, b) => Number(a.Urutan) - Number(b.Urutan));
  if (t === 'kendala') return salinList(r.kendala).sort((a, b) => Number(a.Urutan) - Number(b.Urutan));
  if (t === 'push') return salinList(r.push).sort((a, b) => Number(a.Urutan) - Number(b.Urutan));
  if (t === 'ref') return salinList(r[S.set.refJenis]).sort((a, b) => Number(a.Urutan) - Number(b.Urutan));
  return null;
}
const bersihDraft = l => JSON.stringify((l || []).map(x => { const o = Object.assign({}, x); delete o.UpdatedAt; delete o.UpdatedBy; delete o.Urutan; delete o._baru; return o; }));
function dirtySet() { return S.set.draft && bersihDraft(S.set.draft) !== bersihDraft(draftAwal()); }
const tog = (attr, i, on, label) => `<button type="button" class="toggle ${KD.bool(on) ? 'on' : ''}" data-${attr}="${i}" aria-pressed="${KD.bool(on)}" aria-label="${esc(label)}"></button>`;
const geser = (i, n) => `<span class="row" style="gap:2px;flex-wrap:nowrap"><button type="button" class="iconbtn" data-naik="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Naik">${ic('up', 's')}</button><button type="button" class="iconbtn" data-turun="${i}" ${i === n - 1 ? 'disabled' : ''} aria-label="Turun" style="transform:scaleY(-1)">${ic('up', 's')}</button></span>`;

function viewPengaturan() {
  if (!D.siap) return '<div class="loading"><div class="spinner"></div>Memuat…</div>';
  if (!S.set.draft && S.set.tab !== 'config') S.set.draft = draftAwal();
  const t = S.set.tab, dirty = t !== 'config' && dirtySet();
  return `<div class="dtabs" role="tablist" style="margin-bottom:4px">${TAB_SET.map(([v, l]) => `<button role="tab" data-stab="${v}" class="${t === v ? 'on' : ''}">${l}</button>`).join('')}</div>
   ${t === 'tahap' ? setTahap() : t === 'kendala' ? setKendala() : t === 'push' ? setPush() : t === 'ref' ? setRef() : setConfig()}
   ${dirty ? `<div class="bulk" style="position:sticky;bottom:12px"><b>Ada perubahan belum disimpan</b><span class="sp"></span><button class="btn sm" id="setBatal">Batal</button><button class="btn sm pri" id="setSimpan">Simpan</button></div>` : ''}`;
}
function jumlahOpenPerTahap() { const n = {}; semuaKontrak().forEach(b => KD.bastOpen(b, D.ref).forEach(x => { n[x.KodeTahap] = (n[x.KodeTahap] || 0) + 1; })); return n; }
function setTahap() {
  const L = S.set.draft, open = jumlahOpenPerTahap(), celah = KD.celahAturan(KD.siapkanRef(Object.assign({}, D.refRaw, { tahap: L.map((x, i) => Object.assign({}, x, { Urutan: String(i + 1) })) })));
  return `<div class="card"><h2>Tahapan BAST/BAA <small>urutan menentukan maju/mundur · ${L.length} tahap</small><span class="sp"></span><button class="btn sm" id="tAdd">${ic('add', 's')}Tahap baru</button></h2>
   <div class="tbl-wrap"><table class="t"><thead><tr><th>Urutan</th><th>Kode</th><th>Label</th><th>Batas aging (hari)</th><th>Penutup</th><th>Aktif</th><th class="num">BAST OPEN</th></tr></thead><tbody>
   ${L.map((x, i) => `<tr><td>${geser(i, L.length)}</td><td>${x._baru ? `<input class="inp mono" data-tf="Kode" data-i="${i}" value="${esc(x.Kode)}" style="max-width:150px" placeholder="KODE_BARU">` : `<span class="mono" style="font-size:12px">${esc(x.Kode)}</span>`}</td>
     <td><input class="inp" data-tf="Label" data-i="${i}" value="${esc(x.Label)}" maxlength="60"></td><td><input class="inp tnum" data-tf="BatasAgingHari" data-i="${i}" value="${esc(x.BatasAgingHari)}" style="max-width:90px" inputmode="numeric"></td>
     <td><input type="radio" name="penutup" data-pen="${i}" ${KD.bool(x.Penutup) ? 'checked' : ''} aria-label="Penutup"></td><td>${tog('aktif', i, x.Aktif, 'Aktif')}</td>
     <td class="num">${open[x.Kode] ? `<button class="btn sm ghost" data-pindah="${esc(x.Kode)}" title="Pindahkan BAST OPEN ke tahap lain">${open[x.Kode]} · pindahkan</button>` : '<span class="muted">0</span>'}</td></tr>`).join('')}
   </tbody></table></div>
   <div class="muted" style="font-size:12px;margin-top:10px">Kode tidak bisa diubah setelah dibuat. Tahap tidak dihapus, hanya dinonaktifkan (ditolak selama masih ada BAST OPEN di tahap itu). Harus ada tepat satu tahap penutup aktif. Mengubah urutan atau penutup menghitung ulang semua kontrak.</div>
   ${celah.length ? `<div class="note warn" style="margin-top:12px">${ic('warn', 's')}<span class="tx">Belum ada aturan Nilai Push untuk: <b>${esc(celah.join(', '))}</b>. Kontrak di tahap itu tidak akan mengubah sel Kendala Umum. Tambahkan aturannya di tab <b>Nilai Push</b>.</span></div>` : ''}</div>`;
}
function setKendala() {
  const L = S.set.draft, aktif = {}; semuaKontrak().forEach(b => KD.kendalaAktif(b).forEach(k => { aktif[k.Jenis] = (aktif[k.Jenis] || 0) + 1; }));
  return `<div class="card"><h2>Jenis kendala <small>kendala tidak mengubah tahap; pemicu reopen membuka lagi BAST yang sudah close</small><span class="sp"></span><button class="btn sm" id="kAdd">${ic('add', 's')}Jenis baru</button></h2>
   <div class="tbl-wrap"><table class="t"><thead><tr><th>Urutan</th><th>Kode</th><th>Label</th><th>Wajib keterangan</th><th>Memicu reopen</th><th>Aktif</th><th class="num">Aktif di kontrak</th></tr></thead><tbody>
   ${L.map((x, i) => `<tr><td>${geser(i, L.length)}</td><td>${x._baru ? `<input class="inp mono" data-tf="Kode" data-i="${i}" value="${esc(x.Kode)}" style="max-width:150px" placeholder="KODE_BARU">` : `<span class="mono" style="font-size:12px">${esc(x.Kode)}</span>`}</td>
     <td><input class="inp" data-tf="Label" data-i="${i}" value="${esc(x.Label)}" maxlength="60"></td><td>${tog('wajib', i, x.WajibKeterangan, 'Wajib keterangan')}</td><td>${tog('reopen', i, x.MemicuReopen, 'Memicu reopen')}</td><td>${tog('aktif', i, x.Aktif, 'Aktif')}</td><td class="num">${aktif[x.Kode] || 0}</td></tr>`).join('')}
   </tbody></table></div><div class="muted" style="font-size:12px;margin-top:10px">Jenis lama tidak dihapus, hanya dinonaktifkan, supaya riwayat tetap terbaca. Jenis baru otomatis tercakup aturan <span class="mono">KENDALA:*</span> bila aturan itu ada.</div></div>`;
}
function opsiKondisi() {
  const o = [['CLOSE', 'CLOSE · kontrak close'], ['SISA_LOKASI', 'SISA_LOKASI · menunggu BAST lanjutan'], ['BELUM_ADA_BAST', 'BELUM_ADA_BAST · belum punya BAST'], ['KENDALA:*', 'KENDALA:* · kendala apa pun']];
  D.ref.kendala.forEach(k => o.push(['KENDALA:' + k.Kode, 'KENDALA:' + k.Kode + ' · ' + k.Label]));
  D.ref.tahap.forEach(t => o.push(['TAHAP:' + t.Kode, 'TAHAP:' + t.Kode + ' · ' + t.Label]));
  return o;
}
function setPush() {
  const L = S.set.draft, refUji = KD.siapkanRef(Object.assign({}, D.refRaw, { push: L.map((x, i) => Object.assign({}, x, { Urutan: String(i + 1) })) })), celah = KD.celahAturan(refUji), hit = {}, tanpa = [];
  semuaKontrak().filter(b => !KD.bool(b.k.Arsip)).forEach(b => { const p = KD.evalPush(b, refUji); if (p.cocok) hit[p.kondisi] = (hit[p.kondisi] || 0) + 1; else tanpa.push(b); });
  const ops = opsiKondisi();
  return `<div class="card"><h2>Nilai Push · Kendala Umum <small>dibaca dari atas; aturan pertama yang cocok dipakai</small><span class="sp"></span><button class="btn sm" id="pAdd">${ic('add', 's')}Aturan</button></h2>
   <div class="tbl-wrap"><table class="t"><thead><tr><th>#</th><th>Kondisi</th><th>Teks di sheet unit (Kendala Umum)</th><th>Aktif</th><th class="num">Kontrak terkena</th><th></th></tr></thead><tbody>
   ${L.map((x, i) => `<tr><td class="row" style="gap:6px;flex-wrap:nowrap"><b class="tnum" style="width:20px">${i + 1}</b>${geser(i, L.length)}</td><td><select class="inp" data-tf="Kondisi" data-i="${i}" style="max-width:330px">${opsi(ops, x.Kondisi)}</select></td>
     <td><input class="inp mono" data-tf="Nilai" data-i="${i}" value="${esc(x.Nilai)}" maxlength="80" style="font-size:12.5px"></td><td>${tog('aktif', i, x.Aktif, 'Aktif')}</td><td class="num tnum">${KD.bool(x.Aktif) ? (hit[x.Kondisi] || 0) : '<span class="muted">—</span>'}</td>
     <td><button class="iconbtn" data-phapus="${i}" aria-label="Hapus aturan">${ic('x', 's')}</button></td></tr>`).join('')}
   </tbody></table></div>
   ${celah.length ? `<div class="note warn" style="margin-top:12px">${ic('warn', 's')}<span class="tx">Tidak tercakup aturan mana pun: <b>${esc(celah.join(', '))}</b>. Sel Kendala Umum kontrak seperti itu tidak diubah dan muncul alarm <span class="mono">TANPA_ATURAN</span>.</span></div>` : `<div class="note ok" style="margin-top:12px">${ic('check', 's')}<span class="tx">Semua tahap dan kendala aktif tercakup.${tanpa.length ? ' ' + tanpa.length + ' kontrak tetap tanpa aturan.' : ''}</span></div>`}
   <div class="muted" style="font-size:12px;margin-top:10px">Kolom "Kontrak terkena" dihitung langsung dari draft di layar. Menyimpan aturan menghitung ulang Kendala Umum semua kontrak aktif; sinkron berikutnya (F4a) menyeragamkan semua sheet unit.</div></div>`;
}
function setRef() {
  const L = S.set.draft, j = S.set.refJenis;
  return `<div class="card"><h2>Referensi <span class="sp"></span><div class="seg" role="group">${Object.keys(NAMA_REF).map(k => `<button data-rj="${k}" class="${j === k ? 'on' : ''}">${NAMA_REF[k]}</button>`).join('')}</div></h2>
   <div class="tbl-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>Urutan</th><th>Kode</th><th>Label</th><th>Aktif</th></tr></thead><tbody>
   ${L.map((x, i) => `<tr><td>${geser(i, L.length)}</td><td>${x._baru ? `<input class="inp mono" data-tf="Kode" data-i="${i}" value="${esc(x.Kode)}" style="max-width:180px">` : `<span class="mono" style="font-size:12px">${esc(x.Kode)}</span>`}</td>
     <td><input class="inp" data-tf="Label" data-i="${i}" value="${esc(x.Label)}" maxlength="80"></td><td>${tog('aktif', i, x.Aktif, 'Aktif')}</td></tr>`).join('')}</tbody></table></div>
   <div class="row" style="margin-top:10px"><button class="btn sm" id="rAdd">${ic('add', 's')}Tambah ${NAMA_REF[j]}</button><span class="sp"></span><span class="muted" style="font-size:12px">Kode tidak dihapus, hanya dinonaktifkan. Daftar ini dipakai dropdown form dan template upload.</span></div></div>`;
}
function setConfig() {
  if (!S.set.cfg) { call('sistem.info').then(r => { S.set.cfg = r.config; rerenderSet(); }).catch(gagal); return '<div class="loading"><div class="spinner"></div>Memuat config…</div>'; }
  return `<div class="card"><h2>Config</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>Key</th><th>Nilai</th><th>Arti</th><th></th></tr></thead><tbody>${S.set.cfg.map(c => `<tr><td class="mono" style="font-size:12px">${esc(c.key)}</td><td><input class="inp" data-cfg="${esc(c.key)}" value="${esc(c.nilai)}" aria-label="${esc(c.key)}" style="max-width:280px"></td><td class="muted" style="font-size:12.5px">${esc(c.ket)}</td><td><button class="btn sm" data-cfgsave="${esc(c.key)}">Simpan</button></td></tr>`).join('')}</tbody></table></div></div>`;
}
function rerenderSet() { const c = document.getElementById('content'); if (!c || S.page !== 'pengaturan') return; const sc = window.scrollY; c.innerHTML = viewPengaturan(); bindPengaturan(); window.scrollTo(0, sc); }
function bindPengaturan() {
  const $p = s => document.querySelector('#content ' + s), $$p = s => document.querySelectorAll('#content ' + s), L = S.set.draft;
  if (!D.siap) { muatData(false).then(rerenderSet).catch(gagal); return; }
  $$p('[data-stab]').forEach(b => b.onclick = () => {
    if (dirtySet() && !confirm('Perubahan belum disimpan akan dibuang. Lanjut?')) return;
    S.set.tab = b.dataset.stab; S.set.draft = null; rerenderSet();
  });
  $$p('[data-rj]').forEach(b => b.onclick = () => { if (dirtySet() && !confirm('Perubahan belum disimpan akan dibuang. Lanjut?')) return; S.set.refJenis = b.dataset.rj; S.set.draft = null; rerenderSet(); });
  $$p('[data-tf]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
    L[+el.dataset.i][el.dataset.tf] = el.dataset.tf === 'Kode' ? el.value.toUpperCase().replace(/\s+/g, '_') : el.value;
    if (el.tagName === 'SELECT' || S.set.tab === 'push') rerenderSet(); else { const bar = document.querySelector('#content .bulk'); if (!bar && dirtySet()) rerenderSet(); }
  }));
  const flip = (attr, key) => $$p(`[data-${attr}]`).forEach(b => b.onclick = () => { const x = L[+b.dataset[attr]]; x[key] = KD.bool(x[key]) ? 'FALSE' : 'TRUE'; rerenderSet(); });
  flip('aktif', 'Aktif'); flip('wajib', 'WajibKeterangan'); flip('reopen', 'MemicuReopen');
  $$p('[data-pen]').forEach(r => r.onchange = () => { L.forEach((x, i) => { x.Penutup = i === +r.dataset.pen ? 'TRUE' : 'FALSE'; }); rerenderSet(); });
  $$p('[data-naik]').forEach(b => b.onclick = () => { const i = +b.dataset.naik; [L[i - 1], L[i]] = [L[i], L[i - 1]]; rerenderSet(); });
  $$p('[data-turun]').forEach(b => b.onclick = () => { const i = +b.dataset.turun; [L[i + 1], L[i]] = [L[i], L[i + 1]]; rerenderSet(); });
  $$p('[data-phapus]').forEach(b => b.onclick = () => { L.splice(+b.dataset.phapus, 1); rerenderSet(); });
  if ($p('#tAdd')) $p('#tAdd').onclick = () => { const i = L.findIndex(x => KD.bool(x.Penutup)); L.splice(i < 0 ? L.length : i, 0, { Kode: '', Label: '', Penutup: 'FALSE', BatasAgingHari: '14', Aktif: 'TRUE', _baru: true }); rerenderSet(); };
  if ($p('#kAdd')) $p('#kAdd').onclick = () => { L.push({ Kode: '', Label: '', WajibKeterangan: 'TRUE', MemicuReopen: 'FALSE', Aktif: 'TRUE', _baru: true }); rerenderSet(); };
  if ($p('#pAdd')) $p('#pAdd').onclick = () => { L.push({ Kondisi: 'KENDALA:*', Nilai: '', Aktif: 'TRUE' }); rerenderSet(); };
  if ($p('#rAdd')) $p('#rAdd').onclick = () => { L.push({ Kode: '', Label: '', Aktif: 'TRUE', _baru: true }); rerenderSet(); };
  if ($p('#setBatal')) $p('#setBatal').onclick = () => { S.set.draft = null; rerenderSet(); };
  if ($p('#setSimpan')) $p('#setSimpan').onclick = simpanPengaturan;
  $$p('[data-pindah]').forEach(b => b.onclick = () => pindahTahapMassal(b.dataset.pindah));
  $$p('[data-cfgsave]').forEach(b => b.onclick = async () => {
    const key = b.dataset.cfgsave, nilai = document.querySelector(`[data-cfg="${key}"]`).value; busy(b, true);
    try { const r = await call('config.simpan', { key, nilai }); toast(r.berubah ? `${key} disimpan.` : 'Tidak ada perubahan.'); S.app = Object.assign(S.app, r.app); S.set.cfg = null; const x = await call('data.ref'); terimaRef(x.ref, x.cfg, x.users); rerenderSet(); }
    catch (e) { modalGagal(e); } finally { busy(b, false); }
  });
}
async function simpanPengaturan() {
  const t = S.set.tab, list = S.set.draft.map(x => { const o = Object.assign({}, x); delete o._baru; delete o.UpdatedAt; delete o.UpdatedBy; return o; });
  const aksi = { tahap: 'pengaturan.tahap', kendala: 'pengaturan.kendala', push: 'pengaturan.push', ref: 'pengaturan.ref' }[t];
  const b = document.getElementById('setSimpan'); busy(b, true);
  try {
    const r = await call(aksi, t === 'ref' ? { jenis: S.set.refJenis, list } : { list });
    terimaRef(r.ref); S.set.draft = null;
    if (r.dihitungUlang !== undefined) await muatUlangDiam();
    rerenderSet();
    toast(r.berubah ? 'Pengaturan disimpan' + (r.dihitungUlang ? ` · ${r.dihitungUlang} kontrak dihitung ulang` : '') + '.' : 'Tidak ada perubahan.');
  } catch (e) {
    busy(b, false);
    if (e.kode === 'MASIH_DIPAKAI') { const m = /Tahap (.+?) masih/.exec(e.pesan || ''); const x = m && D.ref.tahap.find(z => z.Label === m[1]); modal('Tahap masih dipakai', `<div class="note warn">${ic('warn', 's')}<span class="tx">${esc(e.pesan)}</span></div>`, [{ l: 'Tutup' }].concat(x ? [{ l: 'Pindahkan BAST', pri: true, fn: () => { pindahTahapMassal(x.Kode); } }] : [])); }
    else modalGagal(e);
  }
}
function pindahTahapMassal(dari) {
  const n = jumlahOpenPerTahap()[dari] || 0, tujuan = D.ref.tahap.filter(t => t.Aktif && !t.Penutup && t.Kode !== dari);
  modal('Pindahkan BAST dari ' + esc(labelTahap(dari)), `<div class="muted">${n} BAST OPEN di tahap ini dipindahkan sekaligus. Setiap perpindahan tercatat di riwayat & Log.</div>
   <label class="of"><span>Ke tahap</span><select class="inp" id="ptKe">${opsi(tujuan.map(t => [t.Kode, t.Label]))}</select></label>
   <label class="of"><span>Keterangan</span><input class="inp" id="ptKet" maxlength="200" placeholder="mis. tahap digabung"></label>`,
   [{ l: 'Batal' }, { l: 'Pindahkan', pri: true, fn: d => {
     const ke = d.querySelector('#ptKe').value, ket = d.querySelector('#ptKet').value;
     const lp = layarProgres('Memindahkan BAST', ['Memindahkan ' + n + ' BAST', 'Menghitung ulang kontrak']); lp.langkah(0);
     call('pengaturan.pindahTahap', { dari, ke, ket }).then(async r => { lp.langkah(1); await muatUlangDiam(); lp.selesai(); S.set.draft = null; rerenderSet(); toast(`${r.dipindah} BAST dipindahkan.`); })
       .catch(e => { lp.selesai(); modalGagal(e); });
   } }]);
}
