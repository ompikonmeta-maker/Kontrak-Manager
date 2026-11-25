/* ================= F2 · Upload Excel dengan template SKM (§11.0) ================= */
S.up = { step: 1, file: '', rowsRaw: [], soRaw: [], rows: [], so: [], mode: 'lewati', f: 'all', tab: 'kontrak', hasil: null, ada: {}, progres: null };
const BAGIAN = 150;
const ST_UP = { baru: ['p-ok', 'Baru'], peringatan: ['p-warn', 'Baru · peringatan'], ada: ['p-dim', 'Sudah ada'], error: ['p-crit', 'Error'] };
const LBL_KOL = { JudulKontrak: 'Judul', JenisDok: 'Jenis dok', TahunProject: 'Tahun', Populasi: 'Populasi', NamaPelanggan: 'Customer', EndCustomer: 'End customer', Segment: 'Segment', NilaiKontrak: 'Nilai', JumlahLokasi: 'Jumlah lokasi', PIC: 'PIC' };

function resetUpload() { S.up = { step: 1, file: '', rowsRaw: [], soRaw: [], rows: [], so: [], mode: 'lewati', f: 'all', tab: 'kontrak', hasil: null, ada: {}, progres: null }; }
function cariNomorUpload(nk) {
  const lokal = semuaKontrak().find(b => b.k.NoKontrakNorm === nk || (b.alias || []).some(a => a.AliasNorm === nk));
  if (lokal) return { KontrakID: lokal.k.KontrakID, NoKontrak: lokal.k.NoKontrak, lokasi: 'AKTIF', viaAlias: lokal.k.NoKontrakNorm !== nk };
  return S.up.ada[nk] || null;
}
function periksaUlang() {
  const U = S.up;
  U.rows = KD.periksaUpload(U.rowsRaw, { ref: D.ref, cfg: D.cfg, pic: picList(), bolehPic: can('pic.atur'), alias: S.me.alias || '', hariIni: D.hariIni || hariIniStr(), cariNomor: cariNomorUpload });
  U.so = KD.periksaSO(U.soRaw, U.rows, cariNomorUpload);
}
function ringkasUpload() {
  const U = S.up, r = U.rows, c = st => r.filter(o => o.st === st).length, ada = r.filter(o => o.st === 'ada');
  const bisaUbah = o => o.ada && o.ada.lokasi === 'AKTIF' && KD.perubahanUpload(o, (kontrak(o.ada.KontrakID) || {}).k).length > 0;
  const upd = U.mode === 'perbarui' ? ada.filter(bisaUbah).length : 0;
  return { total: r.length, baru: c('baru'), warn: c('peringatan'), ada: ada.length, upd, lewat: ada.length - upd, err: c('error'),
           soOk: U.so.filter(s => s.st === 'ok').length + r.filter(o => o.st !== 'error').reduce((a, o) => a + (o.orders || []).length, 0), soErr: U.so.filter(s => s.st === 'error').length };
}
async function bacaFileUpload(file) {
  const U = S.up;
  if (!/\.xlsx$/i.test(file.name)) { modal('Bukan file .xlsx', `<div class="note warn">${ic('warn', 's')}<span class="tx">Pilih file Excel berakhiran <b>.xlsx</b>. File .xls lama: buka di Excel lalu <i>Save As → Excel Workbook (.xlsx)</i>.</span></div>`, [{ l: 'Mengerti', pri: true }]); return; }
  const lp = layarProgres('Membaca ' + file.name, ['Membuka file Excel', 'Mengenali kolom', 'Mencocokkan nomor dengan semua kontrak (termasuk arsip)', 'Memeriksa setiap baris']);
  try {
    lp.langkah(0);
    const sheets = await XLSXR.baca(await file.arrayBuffer());
    lp.langkah(1);
    const cari = (nama, def) => { const s = sheets.find(x => x.nama.toLowerCase() === nama) || sheets.find(x => KD.barisDariAoa(x.aoa, def)); return s ? KD.barisDariAoa(s.aoa, def) : null; };
    const rows = cari('kontrak', KD.KOL_UPLOAD);
    if (!rows) { lp.selesai(); modal('Bukan template SKM', `<div class="note warn">${ic('warn', 's')}<span class="tx">Tidak ada tab <b>Kontrak</b> dengan kolom <b>No. Kontrak</b> di file <span class="mono">${esc(file.name)}</span>. Unduh template dari halaman ini, isi, lalu upload lagi.</span></div><div class="muted" style="font-size:12px">Sheet FF format lama (kolom NO WO/SPK/KL, STATUS AWAL, …) dibaca lewat <b>Import data lama</b>.</div>`, [{ l: 'Tutup' }, { l: 'Buka Import data lama', pri: true, fn: () => go('import') }]); return; }
    if (!rows.length) { lp.selesai(); toast('Tab Kontrak masih kosong.', true); return; }
    if (rows.length > 1000) { lp.selesai(); toast(`File berisi ${rows.length} baris. Maksimal 1.000 per upload; pecah jadi beberapa file.`, true); return; }
    const soSheet = sheets.find(x => /^so[_ ]?mi$/i.test(x.nama)), so = soSheet ? (KD.barisDariAoa(soSheet.aoa, KD.KOL_SO) || []) : [];
    lp.langkah(2);
    const nomor = [...new Set(rows.map(r => KD.normKey(r.no)).concat(so.map(r => KD.normKey(r.no))).filter(Boolean))];
    const ada = {};
    for (let i = 0; i < nomor.length; i += 500) Object.assign(ada, (await call('upload.cekNomor', { nomor: nomor.slice(i, i + 500) })).ada);
    lp.langkah(3);
    Object.assign(U, { file: file.name, rowsRaw: rows, soRaw: so, ada, step: 3, f: 'all', tab: 'kontrak' });
    periksaUlang();
    lp.selesai();
    renderUpload();
  } catch (e) { lp.selesai(); modalGagal({ kode: e.kode, pesan: e.pesan || e.message || String(e) }); }
}
function stepperUpload(cur) {
  return `<div class="ustep">${['Unduh template', 'Pilih file', 'Periksa', 'Selesai'].map((s, i) => `<div class="${i + 1 < cur ? 'done' : (i + 1 === cur || (cur === 1 && i === 1)) ? 'on' : ''}"><i>${i + 1 < cur ? '✓' : i + 1}</i><span>${s}</span></div>`).join('<b></b>')}</div>`;
}
function viewUpload() {
  if (!D.siap) return '<div class="loading"><div class="spinner"></div>Memuat data aktif…</div>';
  const U = S.up;
  if (U.step === 1) return `<div class="card" style="display:flex;flex-direction:column;gap:16px">${stepperUpload(1)}
   <div class="grid g2">
    <div class="ucard"><div class="uic">${ic('doc')}</div><div><h3>1. Unduh template</h3><div class="muted">Satu baris = satu kontrak, termasuk kolom <b>No. SO</b> dan <b>No. MI</b> (banyak nomor dipisah koma). Dropdown Populasi, Segment, PIC, Tahap, Kendala mengikuti Pengaturan saat diunduh. Kolom merah wajib.</div>
      <div class="row" style="margin-top:12px"><button class="btn pri" id="upTpl">${ic('dl', 's')}Unduh template</button></div></div></div>
    <label class="drop" id="upDrop" tabindex="0"><input type="file" id="upFile" accept=".xlsx" hidden>
      <div class="uic big">${ic('up2')}</div><h3>2. Upload file yang sudah diisi</h3><div class="muted">Tarik file .xlsx ke sini, atau <b style="color:var(--accent)">klik untuk memilih</b>.</div>
      <div class="dim" style="font-size:12px">Belum ada yang disimpan sampai Anda menekan <b>Simpan</b> di langkah berikutnya.</div></label>
   </div>
   <div class="ucard" style="align-items:center"><div class="uic">${ic('dl')}</div><div style="flex:1"><h3>Punya sheet FF format lama?</h3><div class="muted">Untuk memindahkan data lama sekali jalan (kolom STATUS AWAL, KENDALA UMUM, dst.) tidak perlu menyalin ke template. Pakai <b>Import data lama</b>.</div></div><button class="btn ton" data-go2="import">Import sheet FF lama ${ic('chevR', 's')}</button></div>
   <div class="note info">${ic('shield', 's')}<span class="tx">Aturan: nomor yang sudah ada di SKM (termasuk <b>nomor lama</b> dan kontrak di arsip) dilewati atau diperbarui sesuai pilihan Anda; baris error tidak disimpan; setiap kontrak dapat BAST-1 otomatis; semua tercatat di Log atas nama <b>${esc(S.me.nama)}</b>. Maksimal 1.000 kontrak per file.</span></div>
  </div>`;
  if (U.step === 3) {
    const R = ringkasUpload(), flt = U.rows.filter(o => U.f === 'all' || o.st === U.f), simpanN = R.baru + R.warn + R.upd, sib = !!U.progres;
    const tile = (f, n, l, cls) => `<button class="utile ${cls} ${U.f === f ? 'on' : ''}" data-uf="${f}" ${sib ? 'disabled' : ''}><b class="tnum">${n}</b><span>${l}</span></button>`;
    return `<div class="card" style="display:flex;flex-direction:column;gap:14px">${stepperUpload(3)}
     <div class="row"><span class="pill p-dim">${ic('doc', 's')} ${esc(U.file)}</span><span class="muted">${R.total} baris kontrak · ${U.rows.reduce((a, o) => a + (o.orders || []).length, 0) + U.so.length} SO/MI</span><span class="sp"></span><button class="btn sm" id="upGanti" ${sib ? 'disabled' : ''}>Ganti file</button></div>
     <div class="utiles">${tile('all', R.total, 'Semua baris', '')}${tile('baru', R.baru, 'Siap dibuat', 'ok')}${tile('peringatan', R.warn, 'Dibuat dengan peringatan', 'warn')}${tile('ada', R.ada, U.mode === 'perbarui' ? `Sudah ada · ${R.upd} diperbarui` : 'Sudah ada · dilewati', 'dim')}${tile('error', R.err, 'Error · tidak disimpan', 'crit')}</div>
     <div class="row"><span style="font-weight:600">Bila nomor sudah ada di SKM:</span>
      <div class="seg" role="group">${[['lewati', 'Lewati'], ['perbarui', 'Perbarui kolom yang diisi']].map(([v, l]) => `<button data-umode="${v}" class="${U.mode === v ? 'on' : ''}" ${sib ? 'disabled' : ''}>${l}</button>`).join('')}</div>
      <span class="muted" style="font-size:12px">${U.mode === 'perbarui' ? 'Sel kosong di Excel tidak menghapus data. Tahap &amp; kendala kontrak lama tidak diubah. Kontrak di arsip tidak diubah.' : 'Data kontrak lama tidak disentuh.'}</span></div>
     ${U.soRaw.length ? `<div class="dtabs" style="margin:0"><button data-utab="kontrak" class="${U.tab === 'kontrak' ? 'on' : ''}">Tab Kontrak <span class="pill p-dim">${R.total}</span></button><button data-utab="so" class="${U.tab === 'so' ? 'on' : ''}">Tab SO_MI (template lama) <span class="pill ${R.soErr ? 'p-crit' : 'p-dim'}">${U.so.length}${R.soErr ? ' · ' + R.soErr + ' error' : ''}</span></button></div>` : ''}
     ${U.tab === 'kontrak' ? `<div class="tbl-wrap"><table class="t utbl"><thead><tr><th>Baris</th><th>Hasil</th><th style="min-width:260px">Kontrak</th><th style="min-width:280px">Catatan pemeriksaan</th><th class="num">Nilai</th><th>BAST-1 &amp; PIC</th></tr></thead><tbody>
      ${flt.map(o => { const kAda = o.ada && kontrak(o.ada.KontrakID), ch = U.mode === 'perbarui' && o.ada && o.ada.lokasi === 'AKTIF' ? KD.perubahanUpload(o, kAda ? kAda.k : null) : [];
        return `<tr class="u-${o.st}"><td class="tnum muted">${o.baris}</td><td><span class="pill ${ST_UP[o.st][0]}">${o.st === 'ada' && ch.length ? 'Diperbarui' : o.st === 'ada' ? 'Dilewati' : ST_UP[o.st][1]}</span></td>
        <td><span class="no">${esc(o.no) || '<span class="muted">(kosong)</span>'}</span><span class="sub">${esc(o.judul) || (kAda ? esc(kAda.k.JudulKontrak) : '')}</span><span class="sub">${o.ada ? esc(kAda ? custName(kAda.k) : (o.ada.NoKontrak || '')) : `${esc(o.end || o.pel || '—')} ${custPill({ NamaPelanggan: o.pel, EndCustomer: o.end })}`}</span>${(o.orders || []).length ? `<span class="sub mono" style="font-size:11.5px">${o.orders.map(x => esc(x.JenisOrder + ' ' + x.NoOrder)).join(', ')}</span>` : ''}
         ${o.ada ? `<span class="ahit">${ic('link', 's')}<span>${o.ada.viaAlias ? `Nomor lama dari <b>${esc(o.ada.KontrakID)}</b>; nomor sekarang <span class="mono">${esc(o.ada.NoKontrak)}</span>` : `Sudah terdaftar sebagai <b>${esc(o.ada.KontrakID)}</b>`}${o.ada.lokasi && o.ada.lokasi !== 'AKTIF' ? ' · di arsip ' + esc(o.ada.lokasi.replace('ARSIP_', '')) : ''}</span></span>` : ''}</td>
        <td><ul class="umsg">${o.err.map(e => `<li class="e">${esc(e)}</li>`).join('')}${o.warn.map(e => `<li class="w">${esc(e)}</li>`).join('')}${o.info.map(e => `<li>${esc(e)}</li>`).join('')}
          ${ch.map(([c, a, b]) => `<li>${LBL_KOL[c] || c}: <s class="muted">${esc(a === '' ? '(kosong)' : c === 'NilaiKontrak' ? rp(a) : a)}</s> → <b>${esc(c === 'NilaiKontrak' ? rp(b) : b)}</b></li>`).join('')}
          ${o.st === 'ada' && U.mode === 'perbarui' && !ch.length && (!o.ada || o.ada.lokasi === 'AKTIF') ? '<li>Tidak ada perbedaan</li>' : ''}${!o.err.length && !o.warn.length && !o.info.length && o.st === 'baru' ? '<li class="ok">Lengkap</li>' : ''}</ul></td>
        <td class="num">${o.nilai ? rp(o.nilai) : '<span class="muted">—</span>'}</td>
        <td>${o.ada ? '<span class="muted">tidak diubah</span>' : o.st === 'error' ? '<span class="muted">—</span>' : `${tahapPill(o.tahap)}<div class="muted" style="font-size:11.5px;margin-top:3px">${esc(o.docFinal || '')}${o.tgl ? ' · sejak ' + esc(o.tgl) + ' (' + KD.hariSejak(o.tgl, D.hariIni || hariIniStr()) + ' hr)' : ''}${o.kend ? ` · <span style="color:var(--crit)">${esc(labelKendala(o.kend))}</span>` : ''}</div>`}<div style="font-size:12px;margin-top:3px">PIC: ${o.pic ? esc(o.pic) : '<span class="muted">—</span>'}</div></td></tr>`; }).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:28px">Tidak ada baris di kategori ini.</td></tr>'}
      </tbody></table></div>`
     : `<div class="tbl-wrap"><table class="t utbl"><thead><tr><th>Baris</th><th>Hasil</th><th>No. kontrak</th><th>Jenis</th><th>No. order</th><th>Layanan</th><th class="num">Lokasi</th><th>Catatan pemeriksaan</th></tr></thead><tbody>
      ${U.so.map(s => `<tr class="u-${s.st}"><td class="tnum muted">${s.baris}</td><td><span class="pill ${s.st === 'ok' ? 'p-ok' : 'p-crit'}">${s.st === 'ok' ? 'OK' : 'Error'}</span></td><td class="mono" style="font-size:12px">${esc(s.no)}</td><td>${esc(s.j)}</td><td class="mono" style="font-size:12px">${esc(s.ono)}</td><td>${esc(s.lay)}</td><td class="num">${esc(s.lok)}</td><td><ul class="umsg">${s.err.map(e => `<li class="e">${esc(e)}</li>`).join('') || '<li class="ok">Ikut disimpan bersama kontraknya</li>'}</ul></td></tr>`).join('') || '<tr><td colspan="8" class="muted" style="text-align:center;padding:28px">Tab SO_MI kosong (boleh).</td></tr>'}
      </tbody></table></div>`}
     ${U.progres ? `<div class="bulk" style="position:sticky;bottom:12px"><span class="bspin"></span><b>Menyimpan bagian ${U.progres.ke} dari ${U.progres.dari}…</b><div class="upbar"><i style="width:${Math.round((U.progres.ke - 1) / U.progres.dari * 100)}%"></i></div><span class="muted" style="font-size:12.5px">Jangan tutup halaman ini.</span></div>`
     : `<div class="bulk" style="position:sticky;bottom:12px"><b>${simpanN} kontrak akan ${R.upd ? 'dibuat/diperbarui' : 'dibuat'}</b><span class="muted" style="font-size:12.5px">${R.err ? R.err + ' error dilewati · ' : ''}${R.lewat ? R.lewat + ' sudah ada dilewati · ' : ''}${R.soOk} SO/MI ikut</span><span class="sp"></span>
      ${R.err + R.soErr ? `<button class="btn sm" id="upLap">${ic('dl', 's')}Unduh laporan error</button>` : ''}<button class="btn sm pri" id="upSave" ${simpanN ? '' : 'disabled'}>Simpan ${simpanN} kontrak</button></div>`}
     ${R.err ? `<div class="note warn">${ic('warn', 's')}<span class="tx">Baris error tidak disimpan. Perbaiki di Excel lalu upload file yang sama lagi: baris yang sudah tersimpan akan terbaca <b>Sudah ada</b> sehingga tidak dobel.</span></div>` : ''}
    </div>`;
  }
  const H = U.hasil;
  return `<div class="card" style="display:flex;flex-direction:column;gap:16px">${stepperUpload(4)}
   <div class="udone"><div class="uic big ok">${ic('check')}</div><div><h3>Upload selesai</h3><div class="muted">${esc(U.file)} · disimpan atas nama ${esc(S.me.nama)} · tercatat di Log</div></div></div>
   <div class="utiles">${[['ok', H.dibuat.length, 'Kontrak dibuat'], ['dim', H.diperbarui.length, 'Diperbarui'], ['dim', H.dilewati, 'Sudah ada, dilewati'], ['crit', H.gagal.length, 'Error, tidak disimpan'], ['', H.so, 'SO/MI ditambahkan']].map(([c, n, l]) => `<div class="utile ${c}"><b class="tnum">${n}</b><span>${l}</span></div>`).join('')}</div>
   ${H.dibuat.length ? `<div><div class="eyebrow" style="margin-bottom:6px">Kontrak baru</div><div class="row">${H.dibuat.slice(0, 60).map(x => `<button class="chipf" data-openk="${esc(x.KontrakID)}"><b class="mono" style="font-size:11.5px">${esc(x.KontrakID)}</b> ${esc(x.no)}</button>`).join('')}${H.dibuat.length > 60 ? `<span class="muted">… dan ${H.dibuat.length - 60} lainnya</span>` : ''}</div></div>` : ''}
   ${H.gagal.length ? `<div class="note warn">${ic('warn', 's')}<span class="tx">${H.gagal.length} baris tidak disimpan: ${H.gagal.slice(0, 5).map(g => 'baris ' + g.baris + ' (' + esc(g.err[0]) + ')').join('; ')}${H.gagal.length > 5 ? '; …' : ''}</span></div>` : ''}
   <div class="row"><button class="btn pri" id="upList">Lihat daftar kontrak</button><button class="btn" id="upLagi">Upload file lain</button>${H.gagal.length ? `<button class="btn ghost" id="upLap">${ic('dl', 's')}Unduh laporan error</button>` : ''}</div>
  </div>`;
}
function renderUpload() { const c = document.getElementById('content'); if (!c || S.page !== 'upload') return; c.innerHTML = viewUpload(); bindUpload(); }
function bindUpload() {
  const U = S.up, $u = s => document.querySelector('#content ' + s), $$u = s => document.querySelectorAll('#content ' + s);
  if (!D.siap) { muatData(false).then(renderUpload).catch(gagal); return; }
  const f = $u('#upFile'), drop = $u('#upDrop');
  if (f) f.onchange = () => { if (f.files[0]) bacaFileUpload(f.files[0]); };
  if (drop) {
    ['dragenter', 'dragover'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', ev => { const x = ev.dataTransfer.files[0]; if (x) bacaFileUpload(x); });
    drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.click(); } };
  }
  if ($u('#upTpl')) $u('#upTpl').onclick = async () => {
    const b = $u('#upTpl'); busy(b, true, 'Membuat template…');
    try { const r = await call('upload.template'); unduhBase64(r.nama, r.base64); toast('Template diunduh. Cek folder Downloads.'); }
    catch (e) { modalGagal(e); } finally { busy(b, false); }
  };
  $$u('[data-uf]').forEach(b => b.onclick = () => { U.f = b.dataset.uf; U.tab = 'kontrak'; renderUpload(); });
  $$u('[data-umode]').forEach(b => b.onclick = () => { U.mode = b.dataset.umode; renderUpload(); });
  $$u('[data-utab]').forEach(b => b.onclick = () => { U.tab = b.dataset.utab; renderUpload(); });
  $$u('[data-openk]').forEach(b => b.onclick = () => openDrawer(b.dataset.openk));
  if ($u('#upGanti')) $u('#upGanti').onclick = () => { resetUpload(); renderUpload(); };
  if ($u('#upLagi')) $u('#upLagi').onclick = () => { resetUpload(); renderUpload(); };
  if ($u('#upList')) $u('#upList').onclick = () => { S.kf.st = 'OPEN'; S.kf.q = ''; resetUpload(); go('kontrak'); };
  if ($u('#upLap')) $u('#upLap').onclick = unduhLaporanUpload;
  if ($u('#upSave')) $u('#upSave').onclick = () => {
    const R = ringkasUpload(), n = R.baru + R.warn + R.upd;
    modal('Simpan hasil upload?', `<div>${R.baru + R.warn} kontrak baru${R.upd ? `, ${R.upd} kontrak diperbarui` : ''}, ${R.soOk} SO/MI.${R.err ? ` <b>${R.err}</b> baris error tidak disimpan.` : ''}</div><div class="muted" style="font-size:12px">Disimpan bertahap per ${BAGIAN} baris. Bila koneksi terputus di tengah, upload file yang sama lagi: yang sudah tersimpan terbaca "Sudah ada".</div>`,
      [{ l: 'Batal' }, { l: `Simpan ${n} kontrak`, pri: true, fn: () => { simpanUpload(); } }]);
  };
}
async function simpanUpload() {
  const U = S.up, kirim = U.rows.filter(o => o.st !== 'error').map(o => U.rowsRaw.find(r => r.baris === o.baris)), bagian = [];
  for (let i = 0; i < kirim.length; i += BAGIAN) bagian.push(kirim.slice(i, i + BAGIAN));
  const H = { dibuat: [], diperbarui: [], dilewati: 0, gagal: U.rows.filter(o => o.st === 'error').map(o => ({ baris: o.baris, no: o.no, err: o.err })), so: 0 };
  for (let i = 0; i < bagian.length; i++) {
    U.progres = { ke: i + 1, dari: bagian.length }; renderUpload();
    const nos = new Set(bagian[i].map(r => KD.normKey(r.no))), so = U.soRaw.filter(s => nos.has(KD.normKey(s.no)));
    try {
      const r = await call('upload.simpan', { mode: U.mode, file: U.file, rows: bagian[i], so, bagian: (i + 1) + '/' + bagian.length });
      H.dibuat = H.dibuat.concat(r.dibuat); H.diperbarui = H.diperbarui.concat(r.diperbarui); H.dilewati += r.dilewati; H.gagal = H.gagal.concat(r.gagal); H.so += r.so;
      (r.bundles || []).forEach(b => { D.base[b.k.KontrakID] = b; });
      hitungSemuaView();
    } catch (e) {
      bagian.slice(i).forEach(bg => bg.forEach(x => H.gagal.push({ baris: x.baris, no: x.no, err: ['Tidak tersimpan: ' + (e.pesan || e)] })));
      if (e.kode !== 'SESI_HABIS') modal('Upload terhenti', `<div class="note crit">${ic('warn', 's')}<span class="tx">${esc(e.pesan || String(e))}</span></div><div class="muted" style="font-size:12.5px">${H.dibuat.length + H.diperbarui.length} kontrak sudah tersimpan. Upload file yang sama lagi untuk melanjutkan; yang sudah tersimpan terbaca "Sudah ada".</div>`, [{ l: 'Mengerti', pri: true }]);
      break;
    }
  }
  H.gagal.sort((a, b) => a.baris - b.baris);
  U.progres = null; U.hasil = H; U.step = 4; renderUpload();
  toast(`${H.dibuat.length} kontrak dibuat${H.diperbarui.length ? ', ' + H.diperbarui.length + ' diperbarui' : ''}.`);
}
async function unduhLaporanUpload() {
  const U = S.up, gagal = U.hasil ? U.hasil.gagal : U.rows.filter(o => o.st === 'error').map(o => ({ baris: o.baris, no: o.no, err: o.err }));
  const tabs = [{ nama: 'Kontrak error', aoa: [['Baris', 'No. Kontrak', 'Masalah']].concat(gagal.map(g => [g.baris, g.no, g.err.join('; ')])) },
                { nama: 'SO_MI error', aoa: [['Baris', 'No. Kontrak', 'No. Order', 'Masalah']].concat(U.so.filter(s => s.st === 'error').map(s => [s.baris, s.no, s.ono, s.err.join('; ')])) }];
  const b = document.querySelector('#upLap'); busy(b, true, 'Membuat…');
  try { const r = await call('upload.laporan', { tabs }); unduhBase64(r.nama, r.base64); } catch (e) { modalGagal(e); } finally { busy(b, false); }
}
