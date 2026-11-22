// Uji beban (uji/Code.gs): penyiapan data bisa dilanjutkan, data sesuai rencana, semua pengukuran jalan tanpa merusak data.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { createGas } = require('./helpers/fakegas');

const FILE = path.join(__dirname, '..', 'uji', 'Code.gs');
const baris = (g, key, tab) => g.files[g.props['ID_' + key]].getSheetByName(tab).data.filter((r, i) => i > 0 && r && r.some(v => v !== '')).length;

test('uji beban: siapkan data (berlanjut lewat pemicu) → ukurServer → web app → bersihkan', { timeout: 600000 }, () => {
  const g = createGas({ file: FILE });
  const c = g.ctx;
  // kolom sesuai generator
  ['Kontrak', 'BAST', 'Orders', 'Riwayat', 'Indeks', 'Log'].forEach(t => assert.ok(c.KOL[t].length > 0));
  assert.equal(c.barisKontrak_(0).length, c.KOL.Kontrak.length);
  assert.equal(c.barisBast_(1)[0].length, c.KOL.BAST.length);
  assert.equal(c.barisOrder_(1)[0].length, c.KOL.Orders.length);
  assert.equal(c.barisRiwayat_(1)[0].length, c.KOL.Riwayat.length);
  assert.equal(c.barisIndeks_(1).length, c.KOL.Indeks.length);
  assert.equal(c.barisLog_(1).length, c.KOL.Log.length);

  // batas waktu dibuat sangat pendek supaya penyiapan terpotong-potong seperti di Apps Script asli
  g.props.UJI_BATAS_DETIK = '0.05';
  c.siapkanData();
  assert.ok(g.logs.includes('requireAllScopes FULL'));
  let n = 0;
  while (g.props.SIAP !== '1') {
    assert.equal(g.triggers.length, 1, 'harus ada tepat satu pemicu lanjutan');
    assert.equal(g.triggers[0].fn, 'lanjutkanData');
    g.baru(); c.lanjutkanData();
    assert.ok(++n < 2000, 'penyiapan tidak selesai');
  }
  assert.ok(n > 5, 'penyiapan seharusnya terpotong beberapa kali (n=' + n + ')');
  assert.equal(g.triggers.length, 0, 'pemicu dihapus setelah selesai');
  assert.ok(g.logs.some(l => /SELESAI/.test(l)));

  // jumlah baris sesuai rencana
  assert.equal(baris(g, 'AKTIF', 'Kontrak'), 3000);
  assert.equal(baris(g, 'AKTIF', 'Indeks'), 18000);
  assert.equal(baris(g, 'A2024', 'Kontrak'), 6000);
  assert.equal(baris(g, 'A2025', 'Kontrak'), 6000);
  assert.equal(baris(g, 'A2026', 'Kontrak'), 3000);
  assert.equal(baris(g, 'SATU', 'Kontrak'), 18000);
  assert.equal(baris(g, 'LOG', 'Log'), 300000);
  assert.equal(baris(g, 'AKTIF', 'BAST'), 4500);
  assert.equal(baris(g, 'AKTIF', 'Orders'), 6000);
  assert.equal(baris(g, 'AKTIF', 'Riwayat'), 18000);
  // tidak ada baris dobel / terlewat saat dilanjutkan
  const ids = g.files[g.props.ID_AKTIF].getSheetByName('Indeks').data.slice(1).map(r => r[1]);
  assert.equal(new Set(ids).size, 18000);
  assert.equal(ids[0], 'K-000001'); assert.equal(ids[17999], 'K-018000');
  // tidak ada sel kosong berlebih: ukuran grid = baris data + header
  const sh = g.files[g.props.ID_LOG].getSheetByName('Log');
  assert.equal(sh.maxRows, 300001); assert.equal(sh.maxCols, 10);
  assert.equal(sh.frozen, 1);
  // semua file di folder uji
  Object.keys(g.props).filter(k => k.startsWith('ID_') && k !== 'ID_FOLDER').forEach(k => assert.equal(g.drive[g.props[k]].folder, g.props.ID_FOLDER));
  assert.match(g.logs.find(l => /SELESAI/.test(l)), /sel\/dtk/);

  // siapkanData lagi tidak membuat ulang
  c.siapkanData();
  assert.ok(g.logs.some(l => /sudah siap/.test(l)));

  // ukurServer: semua uji jalan tanpa GAGAL dan data kembali seperti semula
  g.baru(); c.ukurServer();
  while (g.props.UKUR_I && g.props.UKUR_I !== '0') { g.baru(); c.ukurServer(); }
  c.UJI.forEach(x => {
    const h = JSON.parse(g.props['H_' + x[0]]);
    assert.ok(h.ms.length >= 1, x[0]);
    assert.ok(!/GAGAL|TIDAK/.test(h.info), x[0] + ': ' + h.info);
  });
  assert.match(JSON.parse(g.props.H_cache).info, /utuh/);
  assert.match(JSON.parse(g.props.H_pindah300).info, /baris dipindah/);
  assert.equal(baris(g, 'AKTIF', 'Kontrak'), 3000, 'kontrak aktif kembali 3.000');
  assert.equal(baris(g, 'A2026', 'Kontrak'), 3000);
  assert.equal(baris(g, 'A2025', 'Kontrak'), 6000, 'kontrak yang di-reopen sudah diarsipkan lagi');
  const lok = g.files[g.props.ID_AKTIF].getSheetByName('Indeks').data.slice(1).map(r => r[6]);
  assert.equal(lok.filter(l => l === 'AKTIF').length, 3000);
  assert.equal(lok.filter(l => l === 'ARSIP_2025').length, 6000);
  assert.ok(!g.props.IDS300, 'catatan pindah 300 dibersihkan');
  assert.equal(JSON.parse(g.props.REOPEN).length, 0);
  // indeks tetap menunjuk file yang benar: setiap kontrak aktif ada di DB aktif
  const aktif = new Set(g.files[g.props.ID_AKTIF].getSheetByName('Kontrak').data.slice(1).filter(r => r[0]).map(r => r[0]));
  g.files[g.props.ID_AKTIF].getSheetByName('Indeks').data.slice(1).forEach(r => { if (r[6] === 'AKTIF') assert.ok(aktif.has(r[1]), r[1]); });
  assert.match(c.laporanServer_(), /Hasil uji beban SKM v1\.0/);

  // web app
  const html = c.doGet().getContent();
  assert.match(html, /uji beban v1\.0/);
  assert.ok(!html.includes('{{VERSI}}'));
  const info = c.wInfo(); assert.equal(info.siap, true); assert.equal(info.sudahUkur, true);
  const hal = c.wHalaman(); assert.equal(hal.n, 50); assert.equal(hal.rows[0].length, 9);
  assert.ok(c.wDetailAktif().n > 0);
  assert.match(String(c.wDetailArsip().n), /baris dari SKM_UJI_ARSIP_2025/);
  const s = c.wSimpan(); assert.ok(s.tunggu >= 0 && s.kerja >= 0);
  JSON.stringify([info, hal]);   // bisa dikirim ke browser

  // bersihkan
  c.bersihkan();
  assert.equal(Object.keys(g.props).length, 0);
  assert.ok(Object.values(g.drive).every(d => d.trashed));
});

test('uji beban: ukurServer sebelum data siap memberi petunjuk, tidak error', () => {
  const g = createGas({ file: FILE });
  g.ctx.ukurServer();
  assert.ok(g.logs.some(l => /Tunggu sampai data SIAP/.test(l)));
});
