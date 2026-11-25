/* ================= F3 · Import sheet FF format lama (§11.1) ================= */
const IMP_MAKS = 3000, IMP_BAGIAN = 150;
function resetImport() { S.imp = { step: 1, file: '', h: [], rows: [], map: {}, nilai: {}, pic: {}, refBaru: {}, ada: {}, f: 'all', batas: 300, hasil: null, progres: null, ringkas: null }; }
resetImport();
const ST_IMP = { baru: ['p-ok', 'Baru'], peringatan: ['p-warn', 'Baru · catatan'], ada: ['p-dim', 'Dilewati'], error: ['p-crit', 'Error'] };

function cariNomorImport(nk) {
  const lokal = semuaKontrak().find(b => b.k.NoKontrakNorm === nk || (b.alias || []).some(a => a.AliasNorm === nk));
  if (lokal) return { KontrakID: lokal.k.KontrakID, NoKontrak: lokal.k.NoKontrak, lokasi: 'AKTIF', viaAlias: lokal.k.NoKontrakNorm !== nk };
  return S.imp.ada[nk] || null;
}
function hitungRingkasImport() {
  const I = S.imp;
  I.ringkas = KD.ringkasImport(I.rows.map(x => x.r), I.map, D.ref);
  Object.keys(I.ringkas.nilai).forEach(k => { if (!I.nilai[k]) I.nilai[k] = KD.tebakNilaiLama(k, D.ref); });
  Object.keys(I.ringkas.pic).forEach(p => { if (!(p in I.pic)) I.pic[p] = picList().find(x => x.toLowerCase() === p.toLowerCase()) || ''; });
  Object.keys(I.ringkas.refBaru).forEach(k => { if (!(k in I.refBaru)) I.refBaru[k] = true; });
}
function hasilImportKlien() {
  const I = S.imp;
  return KD.periksaImport(I.rows, { map: I.map, nilai: I.nilai, pic: I.pic, refBaru: I.refBaru, ref: D.ref, cfg: D.cfg, bolehPic: can('pic.atur'), alias: S.me.alias || '', cariNomor: cariNomorImport });
}
async function bacaFileImport(file) {
  if (!/\.xlsx$/i.test(file.name)) { modal('Bukan file .xlsx', `<div class="note warn">${ic('warn', 's')}<span class="tx">Pilih file Excel berakhiran <b>.xlsx</b>. File .xls lama: buka di Excel lalu <i>Save As → Excel Workbook (.xlsx)</i>. Google Sheet: <i>File → Download → Microsoft Excel</i>.</span></div>`, [{ l: 'Mengerti', pri: true }]); return; }
  const lp = layarProgres('Membaca ' + file.name, ['Membuka file Excel', 'Mencari baris judul kolom', 'Mencocokkan nomor dengan semua kontrak (termasuk arsip)', 'Menyiapkan pemetaan']);
  try {
    lp.langkah(0);
    const sheets = await XLSXR.baca(await file.arrayBuffer());
    lp.langkah(1);
    let pilih = null;
    sheets.some(sh => { for (let i = 0; i < Math.min(15, sh.aoa.length); i++) { const m = KD.petaImport(sh.aoa[i] || []); if (m.no >= 0) { pilih = { sh, i, m }; return true; } } return false; });
    if (!pilih) { lp.selesai(); modal('Kolom nomor kontrak tidak ditemukan', `<div class="note warn">${ic('warn', 's')}<span class="tx">Tidak ada baris judul dengan kolom <b>NO WO/SPK/KL</b> (atau No. Kontrak) di 15 baris pertama setiap tab file <span class="mono">${esc(file.name)}</span>.</span></div><div class="muted" style="font-size:12px">File template SKM (tab Kontrak) diunggah lewat <b>Upload Excel</b>.</div>`, [{ l: 'Mengerti', pri: true }]); return; }
    const h = (pilih.sh.aoa[pilih.i] || []).map(x => String(x == null ? '' : x).trim());
    const rows = [];
    for (let j = pilih.i + 1; j < pilih.sh.aoa.length; j++) { const r = pilih.sh.aoa[j] || []; if (r.some(v => String(v == null ? '' : v).trim() !== '')) rows.push({ baris: j + 1, r: h.map((_, c) => r[c] == null ? '' : r[c]) }); }
    if (!rows.length) { lp.selesai(); toast('Tidak ada baris data di bawah judul kolom.', true); return; }
    if (rows.length > IMP_MAKS) { lp.selesai(); toast(`File berisi ${rows.length} baris. Maksimal ${IMP_MAKS} per import; pecah jadi beberapa file.`, true); return; }
    lp.langkah(2);
    const nomor = [...new Set(rows.map(x => KD.normKey(String(x.r[pilih.m.no] || '').replace(/\.+$/, ''))).filter(Boolean))], ada = {};
    for (let i = 0; i < nomor.length; i += 500) Object.assign(ada, (await call('upload.cekNomor', { nomor: nomor.slice(i, i + 500) })).ada);
    lp.langkah(3);
    resetImport();
    Object.assign(S.imp, { step: 2, file: file.name, tab: pilih.sh.nama, barisJudul: pilih.i + 1, h, rows, map: pilih.m, ada });
    hitungRingkasImport();
    lp.selesai(); renderImport();
  } catch (e) { lp.selesai(); modalGagal({ kode: e.kode, pesan: e.pesan || e.message || String(e) }); }
}
function stepperImport(cur) {
  return `<div class="ustep">${['Pilih file', 'Pemetaan', 'Pratinjau', 'Selesai'].map((s, i) => `<div class="${i + 1 < cur ? 'done' : i + 1 === cur ? 'on' : ''}"><i>${i + 1 < cur ? '✓' : i + 1}</i><span>${s}</span></div>`).join('<b></b>')}</div>`;
}
const nilaiKey = m => m.jenis === 'tahap' || m.jenis === 'kendala' ? m.jenis + ':' + m.kode : m.jenis;
function viewImport() {
  if (!D.siap) return '<div class="loading"><div class="spinner"></div>Memuat data aktif…</div>';
  const I = S.imp;
  if (I.step === 1) return `<div class="card" style="display:flex;flex-direction:column;gap:16px">${stepperImport(1)}
    <label class="drop" id="impDrop" tabindex="0"><input type="file" id="impFile" accept=".xlsx" hidden><div class="uic big">${ic('dl')}</div><h3>Upload sheet FF lama (.xlsx)</h3>
     <div class="muted">Sheet dengan kolom seperti <span class="mono">NO WO/SPK/KL</span>, <span class="mono">STATUS AWAL</span>, <span class="mono">KENDALA UMUM</span>, <span class="mono">KENDALA DETIL</span>, <span class="mono">PIC</span>. Tarik file ke sini atau <b style="color:var(--accent)">klik untuk memilih</b>.</div>
     <div class="dim" style="font-size:12px">Kolom dikenali dari judulnya lalu bisa dicocokkan manual. Belum ada yang disimpan sampai Anda menekan <b>Import</b>.</div></label>
    <div class="note info">${ic('shield', 's')}<span class="tx">Beda dengan <b>Upload Excel</b> (template SKM): import membaca format sheet FF lama apa adanya. Semua hasil import ditandai <b>perlu verifikasi</b> dan muncul di Perlu Perhatian sampai diperiksa PIC. Nomor yang sudah ada (termasuk nomor lama dan kontrak di arsip) dilewati. Aging BAST hasil import dihitung mulai tanggal import. Maksimal ${IMP_MAKS.toLocaleString('id-ID')} baris per file.</span></div>
    <div class="row"><span class="sp"></span><button class="btn ghost sm" data-go2="upload">Kembali ke Upload Excel</button></div></div>`;
  if (I.step === 2) {
    const R = I.ringkas, opsiNilai = D.ref.tahap.filter(t => t.Aktif).map(t => ['tahap:' + t.Kode, 'Tahap · ' + t.Label]).concat(D.ref.kendala.filter(k => k.Aktif).map(k => ['kendala:' + k.Kode, 'Kendala · ' + k.Label]),
      [['parsial', 'Tandai BAST parsial'], ['lain', 'Kendala Lainnya (keterangan = nilai asli)'], ['abaikan', 'Abaikan']]);
    const F = KD.KOL_IMPORT;
    return `<div class="card" style="display:flex;flex-direction:column;gap:16px">${stepperImport(2)}
     <div class="row"><span class="pill p-dim">${ic('doc', 's')} ${esc(I.file)}</span><span class="muted">tab ${esc(I.tab)} · judul kolom di baris ${I.barisJudul} · ${I.rows.length.toLocaleString('id-ID')} baris data</span><span class="sp"></span><button class="btn sm" id="impGanti">Ganti file</button></div>
     <div class="grid g2">
      <div class="card"><h2>1. Kolom <small>dikenali dari judul; ubah bila salah</small></h2><div class="tbl-wrap"><table class="t"><thead><tr><th>Di SKM</th><th>Kolom di file</th></tr></thead><tbody>
       ${F.map(([f, l]) => `<tr><td><b>${esc(l)}</b>${f === 'no' ? ' <span class="pill p-crit" style="font-size:10px">wajib</span>' : ''}${f === 'end' ? '<div class="muted" style="font-size:11.5px">NAMA PELANGGAN = End customer</div>' : f === 'judul' ? '<div class="muted" style="font-size:11.5px">kosong → "Kontrak &lt;end customer&gt;"</div>' : ''}</td>
        <td><select class="inp" data-imap="${f}" style="width:100%;min-width:150px"><option value="-1">— tidak ada —</option>${I.h.map((x, i) => `<option value="${i}" ${I.map[f] === i ? 'selected' : ''}>${esc(x || '(kolom ' + (i + 1) + ')')}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></div>
      <div style="display:flex;flex-direction:column;gap:16px">
       <div class="card"><h2>2. Nilai status lama <small>STATUS AWAL &amp; KENDALA UMUM</small></h2>${Object.keys(R.nilai).length ? `<div class="tbl-wrap"><table class="t"><thead><tr><th>Nilai di file</th><th class="num">Baris</th><th>Jadi di SKM</th></tr></thead><tbody>
        ${Object.keys(R.nilai).sort((a, b) => R.nilai[b] - R.nilai[a]).map(k => { const m = I.nilai[k]; return `<tr><td class="mono" style="font-size:12px;overflow-wrap:anywhere">${esc(k)}${m.tebak ? ' <span class="pill p-warn" style="font-size:10px">tebakan, cek</span>' : m.jenis === 'lain' ? ' <span class="pill p-dim" style="font-size:10px">tidak dikenal</span>' : ''}</td><td class="num">${R.nilai[k]}</td>
         <td><select class="inp" data-inil="${esc(k)}" style="width:100%;min-width:190px">${opsiNilai.map(([v, l]) => `<option value="${esc(v)}" ${nilaiKey(m) === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="muted">Kolom status belum dipetakan atau kosong.</div>'}
        <div class="muted" style="font-size:12px;margin-top:8px">Bila status awal dan kendala umum menunjuk tahap berbeda, dipakai tahap yang paling maju. Keterangan kendala diambil dari KENDALA DETIL. Tahap penutup (Takeout / Sertim AR) → kontrak langsung CLOSE.</div></div>
       <div class="card"><h2>3. PIC <small>dicocokkan dengan Alias PIC di Users</small></h2>${!can('pic.atur') ? `<div class="note info" style="margin-bottom:8px">${ic('person', 's')}<span class="tx">Anda tidak punya izin atur PIC, jadi semua kontrak hasil import ber-PIC <b>${esc(S.me.alias || '(kosong)')}</b>.</span></div>` : ''}
        ${Object.keys(R.pic).map(p => `<div class="row" style="margin-bottom:8px"><span class="mono" style="min-width:90px;overflow-wrap:anywhere">${esc(p)}</span><span class="muted" style="white-space:nowrap">${R.pic[p]} baris →</span><select class="inp" data-ipic="${esc(p)}" ${can('pic.atur') ? '' : 'disabled'} style="width:auto;min-width:150px">${opsi(picList(), I.pic[p], '— tanpa PIC —')}</select>${I.pic[p] ? '<span class="pill p-ok">cocok</span>' : '<span class="pill p-warn">tidak dikenal</span>'}</div>`).join('') || '<div class="muted">Kolom PIC belum dipetakan atau kosong.</div>'}</div>
       ${Object.keys(R.refBaru).length ? `<div class="card"><h2>4. Referensi baru <small>nilai belum ada di Pengaturan</small></h2>${Object.keys(R.refBaru).map(k => `<label class="row" style="margin-bottom:6px;cursor:pointer;flex-wrap:nowrap"><input type="checkbox" class="chk" data-iref="${esc(k)}" ${I.refBaru[k] ? 'checked' : ''}><span>Tambahkan <b>${esc(k.slice(k.indexOf(':') + 1))}</b> ke ${esc(k.split(':')[0])} <span class="muted">(${R.refBaru[k]} baris)</span></span></label>`).join('')}<div class="muted" style="font-size:12px">Tidak dicentang → kolom itu dikosongkan pada kontrak terkait.</div></div>` : ''}
      </div></div>
     <div class="row"><span class="sp"></span><button class="btn pri" id="impLanjut" ${I.map.no >= 0 ? '' : 'disabled'}>Lihat pratinjau ${ic('chevR', 's')}</button></div></div>`;
  }
  if (I.step === 3) {
    const H = hasilImportKlien(), c = s => H.filter(o => o.st === s).length, flt = H.filter(o => I.f === 'all' || o.st === I.f), simpanN = c('baru') + c('peringatan'), sib = !!I.progres;
    const closeN = H.filter(o => (o.st === 'baru' || o.st === 'peringatan') && T(o.tahap) && T(o.tahap).Penutup).length;
    const tanpaCust = H.filter(o => (o.st === 'baru' || o.st === 'peringatan') && !o.pel).length, infoBaris = o => o.info.filter(x => x.indexOf('Customer kosong') !== 0);
    const tile = (f, n, l, cls) => `<button class="utile ${cls} ${I.f === f ? 'on' : ''}" data-if="${f}" ${sib ? 'disabled' : ''}><b class="tnum">${n.toLocaleString('id-ID')}</b><span>${l}</span></button>`;
    return `<div class="card" style="display:flex;flex-direction:column;gap:14px">${stepperImport(3)}
     <div class="utiles">${tile('all', H.length, 'Semua baris', '')}${tile('baru', c('baru'), 'Siap diimport', 'ok')}${tile('peringatan', c('peringatan'), 'Diimport dengan catatan', 'warn')}${tile('ada', c('ada'), 'Sudah ada · dilewati', 'dim')}${tile('error', c('error'), 'Error · tidak disimpan', 'crit')}</div>
     <div class="note info">${ic('log', 's')}<span class="tx">Sheet lama tidak punya tanggal masuk tahap, jadi <b>aging BAST hasil import dimulai hari ini</b>. ${closeN ? `<b>${closeN}</b> kontrak langsung CLOSE (status Takeout / Sertim AR). ` : ''}${tanpaCust ? `${tanpaCust} kontrak tanpa Customer (direct): jenis customer BELUM TERDEFINISI sampai dilengkapi saat verifikasi.` : ''}</span></div>
     <div class="tbl-wrap"><table class="t utbl"><thead><tr><th>Baris</th><th>Hasil</th><th style="min-width:200px;max-width:300px">Kontrak</th><th style="min-width:170px">Dari status lama</th><th style="min-width:170px">Jadi di SKM</th><th style="min-width:220px">Catatan</th></tr></thead><tbody>
      ${flt.slice(0, I.batas).map(o => `<tr class="u-${o.st}"><td class="tnum muted">${o.baris}</td><td><span class="pill ${ST_IMP[o.st][0]}">${ST_IMP[o.st][1]}</span></td>
        <td style="max-width:300px"><span class="no" style="overflow-wrap:anywhere">${esc(o.no) || '<span class="muted">(kosong)</span>'}</span><span class="sub">${esc(o.end || '')}${o.judul ? ' · ' + esc(o.judul) : ''}</span>${o.pic ? `<span class="sub">PIC ${esc(o.pic)}</span>` : ''}</td>
        <td class="muted" style="font-size:12px">${(o.asal || []).map(esc).join('<br>')}</td>
        <td>${o.st === 'error' || o.st === 'ada' ? '<span class="muted">—</span>' : `${tahapPill(o.tahap)}${o.parsial ? ' <span class="pill p-warn">parsial</span>' : ''}${o.kend.length ? `<div style="font-size:11.5px;margin-top:3px;color:var(--crit)">${o.kend.map(k => esc(labelKendala(k.Jenis)) + ': ' + esc(k.Keterangan)).join('<br>')}</div>` : ''}`}</td>
        <td><ul class="umsg">${o.err.map(e => `<li class="e">${esc(e)}</li>`).join('')}${o.warn.map(e => `<li class="w">${esc(e)}</li>`).join('')}${infoBaris(o).map(e => `<li>${esc(e)}</li>`).join('')}${!o.err.length && !o.warn.length && !infoBaris(o).length && o.st === 'baru' ? '<li class="ok">Lengkap</li>' : ''}</ul></td></tr>`).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:28px">Tidak ada baris di kategori ini.</td></tr>'}
     </tbody></table></div>
     ${flt.length > I.batas ? `<div class="row" style="justify-content:center"><button class="btn" id="impMore">Tampilkan 300 lagi <span class="muted">(${I.batas} dari ${flt.length.toLocaleString('id-ID')})</span></button></div>` : ''}
     ${I.progres ? `<div class="bulk" style="position:sticky;bottom:12px"><span class="bspin"></span><b>Mengimport bagian ${I.progres.ke} dari ${I.progres.dari}…</b><div class="upbar"><i style="width:${Math.round((I.progres.ke - 1) / I.progres.dari * 100)}%"></i></div><span class="muted" style="font-size:12.5px">Jangan tutup halaman ini.</span></div>`
     : `<div class="bulk" style="position:sticky;bottom:12px"><b>${simpanN.toLocaleString('id-ID')} kontrak akan diimport</b><span class="muted" style="font-size:12.5px">semua ditandai perlu verifikasi · ${c('ada')} dilewati · ${c('error')} error</span><span class="sp"></span><button class="btn sm" id="impKembali">Kembali ke pemetaan</button><button class="btn sm pri" id="impSimpan" ${simpanN ? '' : 'disabled'}>Import ${simpanN.toLocaleString('id-ID')} kontrak</button></div>`}
    </div>`;
  }
  const R = I.hasil, closeN = R.dibuat.filter(x => x.status === 'CLOSE').length;
  return `<div class="card" style="display:flex;flex-direction:column;gap:16px">${stepperImport(4)}
   <div class="udone"><div class="uic big ok">${ic('check')}</div><div><h3>Import selesai</h3><div class="muted">${esc(I.file)} · atas nama ${esc(S.me.nama)} · tercatat di Log</div></div></div>
   <div class="utiles">${[['ok', R.dibuat.length, 'Kontrak masuk · perlu verifikasi'], ['', closeN, 'Di antaranya langsung CLOSE'], ['dim', R.dilewati, 'Sudah ada, dilewati'], ['crit', R.gagal.length, 'Error, tidak disimpan'], ['', R.refBaru.length, 'Referensi baru ditambahkan']].map(([cl, n, l]) => `<div class="utile ${cl}"><b class="tnum">${n.toLocaleString('id-ID')}</b><span>${l}</span></div>`).join('')}</div>
   ${R.dibuat.length ? `<div class="row">${R.dibuat.slice(0, 60).map(x => `<button class="chipf" data-openk="${esc(x.KontrakID)}"><b class="mono" style="font-size:11.5px">${esc(x.KontrakID)}</b> ${esc(x.no)}</button>`).join('')}${R.dibuat.length > 60 ? `<span class="muted">… dan ${R.dibuat.length - 60} lainnya</span>` : ''}</div>` : ''}
   ${R.gagal.length ? `<div class="note warn">${ic('warn', 's')}<span class="tx">${R.gagal.length} baris tidak disimpan: ${R.gagal.slice(0, 5).map(g => 'baris ' + g.baris + ' (' + esc(g.err[0]) + ')').join('; ')}${R.gagal.length > 5 ? '; …' : ''}</span></div>` : ''}
   <div class="row"><button class="btn pri" data-go2="perhatian">Buka Perlu Perhatian (verifikasi)</button><button class="btn" id="impLagi">Import file lain</button></div></div>`;
}
function renderImport() { const c = document.getElementById('content'); if (!c || S.page !== 'import') return; const sc = window.scrollY; c.innerHTML = viewImport(); bindImport(); window.scrollTo(0, sc); }
function bindImport() {
  const I = S.imp, $i = s => document.querySelector('#content ' + s), $$i = s => document.querySelectorAll('#content ' + s);
  if (!D.siap) { muatData(false).then(renderImport).catch(gagal); return; }
  const f = $i('#impFile'), drop = $i('#impDrop');
  if (f) f.onchange = () => { if (f.files[0]) bacaFileImport(f.files[0]); };
  if (drop) {
    ['dragenter', 'dragover'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', ev => { const x = ev.dataTransfer.files[0]; if (x) bacaFileImport(x); });
    drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.click(); } };
  }
  if ($i('#impGanti')) $i('#impGanti').onclick = () => { resetImport(); renderImport(); };
  if ($i('#impLagi')) $i('#impLagi').onclick = () => { resetImport(); renderImport(); };
  $$i('[data-imap]').forEach(s => s.onchange = () => { I.map[s.dataset.imap] = +s.value; hitungRingkasImport(); renderImport(); });
  $$i('[data-inil]').forEach(s => s.onchange = () => { const v = s.value, i = v.indexOf(':'); I.nilai[s.dataset.inil] = i > 0 ? { jenis: v.slice(0, i), kode: v.slice(i + 1) } : { jenis: v }; renderImport(); });
  $$i('[data-ipic]').forEach(s => s.onchange = () => { I.pic[s.dataset.ipic] = s.value; renderImport(); });
  $$i('[data-iref]').forEach(c => c.onchange = () => { I.refBaru[c.dataset.iref] = c.checked; });
  if ($i('#impLanjut')) $i('#impLanjut').onclick = () => { I.step = 3; I.f = 'all'; I.batas = 300; renderImport(); window.scrollTo(0, 0); };
  if ($i('#impKembali')) $i('#impKembali').onclick = () => { I.step = 2; renderImport(); };
  if ($i('#impMore')) $i('#impMore').onclick = () => { I.batas += 300; renderImport(); };
  $$i('[data-if]').forEach(b => b.onclick = () => { I.f = b.dataset.if; I.batas = 300; renderImport(); });
  $$i('[data-openk]').forEach(b => b.onclick = () => openDrawer(b.dataset.openk));
  if ($i('#impSimpan')) $i('#impSimpan').onclick = () => {
    const H = hasilImportKlien(), n = H.filter(o => o.st === 'baru' || o.st === 'peringatan').length, closeN = H.filter(o => (o.st === 'baru' || o.st === 'peringatan') && T(o.tahap) && T(o.tahap).Penutup).length;
    const ref = Object.keys(I.refBaru).filter(k => I.refBaru[k]);
    modal('Import data lama?', `<div><b>${n}</b> kontrak baru, semua ditandai <b>perlu verifikasi</b>${closeN ? `; ${closeN} langsung CLOSE` : ''}.</div>${ref.length ? `<div class="muted" style="font-size:12.5px">Referensi baru ditambahkan: ${ref.map(esc).join(', ')}.</div>` : ''}<div class="muted" style="font-size:12px">Disimpan bertahap per ${IMP_BAGIAN} baris. Bila koneksi terputus, import file yang sama lagi: yang sudah tersimpan terbaca "Sudah ada".</div>`,
      [{ l: 'Batal' }, { l: `Import ${n} kontrak`, pri: true, fn: () => { simpanImport(); } }]);
  };
}
async function simpanImport() {
  const I = S.imp, H0 = hasilImportKlien(), kirimBaris = {}; H0.forEach(o => { if (o.st === 'baru' || o.st === 'peringatan') kirimBaris[o.baris] = 1; });
  const kirim = I.rows.filter(x => kirimBaris[x.baris]), bagian = [];
  for (let i = 0; i < kirim.length; i += IMP_BAGIAN) bagian.push(kirim.slice(i, i + IMP_BAGIAN));
  const R = { dibuat: [], dilewati: H0.filter(o => o.st === 'ada').length, gagal: H0.filter(o => o.st === 'error').map(o => ({ baris: o.baris, no: o.no, err: o.err })), refBaru: [] };
  for (let i = 0; i < bagian.length; i++) {
    I.progres = { ke: i + 1, dari: bagian.length }; renderImport();
    try {
      const r = await call('import.simpan', { file: I.file, map: I.map, nilai: I.nilai, pic: I.pic, refBaru: I.refBaru, rows: bagian[i], bagian: (i + 1) + '/' + bagian.length });
      R.dibuat = R.dibuat.concat(r.dibuat); R.dilewati += r.dilewati; R.gagal = R.gagal.concat(r.gagal); R.refBaru = R.refBaru.concat(r.refBaru || []);
      if (r.ref) terimaRef(r.ref, D.cfg, D.users);
      (r.bundles || []).forEach(b => { D.base[b.k.KontrakID] = b; });
      hitungSemuaView();
    } catch (e) {
      bagian.slice(i).forEach(bg => bg.forEach(x => R.gagal.push({ baris: x.baris, no: String(x.r[I.map.no] || ''), err: ['Tidak tersimpan: ' + (e.pesan || e)] })));
      if (e.kode !== 'SESI_HABIS') modal('Import terhenti', `<div class="note crit">${ic('warn', 's')}<span class="tx">${esc(e.pesan || String(e))}</span></div><div class="muted" style="font-size:12.5px">${R.dibuat.length} kontrak sudah tersimpan. Import file yang sama lagi untuk melanjutkan; yang sudah tersimpan terbaca "Sudah ada".</div>`, [{ l: 'Mengerti', pri: true }]);
      break;
    }
  }
  R.gagal.sort((a, b) => a.baris - b.baris);
  I.progres = null; I.hasil = R; I.step = 4; renderImport(); perbaruiBadge();
  toast(`${R.dibuat.length} kontrak diimport dan ditandai perlu verifikasi.`);
}
