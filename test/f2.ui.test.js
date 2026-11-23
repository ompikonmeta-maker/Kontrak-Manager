// F2: uji UI dari ujung ke ujung — data aktif di browser, simpan optimis, form, feed, upload Excel, pengaturan, arsip.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { createGas } = require('./helpers/fakegas');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { chromium = null; }

const BRIDGE = `<script>window.google={script:{get run(){let s,f;const p=new Proxy({},{get(t,k){if(k==='withSuccessHandler')return h=>{s=h;return p;};if(k==='withFailureHandler')return h=>{f=h;return p;};return(...a)=>{window.__gas(k,JSON.stringify(a)).then(r=>s&&s(JSON.parse(r)),e=>f&&f(e));};}});return p;}}};</script>`;
const CONTOH = path.join(__dirname, '..', 'mockup', 'Contoh_Upload_Kontrak.xlsx');

function siapkan() {
  const g = createGas(); g.ctx.setup();
  const pw = g.logs.join('\n').match(/password sementara: (\S+)/)[1];
  const t = g.api(null, 'login', { username: 'admin', password: pw }).data.token; g.api(t, 'gantiPassword', { baru: 'Rahasia2026' });
  g.api(t, 'users.simpan', { username: 'admin', nama: 'Admin awal', alias: 'omPik', role: 'ADMIN' });
  g.api(t, 'users.simpan', { baru: true, username: 'edo01', nama: 'Edo', alias: 'Edo', role: 'STAFF' });
  for (let i = 1; i <= 6; i++) {
    g.api(t, 'kontrak.op', { op: 'kontrak.buat', data: { f: { NoKontrak: 'KL.000' + i + '/TSAT/2026', JudulKontrak: 'Internet ' + i + ' titik', NamaPelanggan: i % 2 ? 'PT Telkom' : 'Bank BRI',
      EndCustomer: 'Bank BRI', NilaiKontrak: String(i * 1e8), JumlahLokasi: String(i), PIC: i % 3 ? 'Edo' : '' }, orders: [{ JenisOrder: 'SO', NoOrder: 'SO-' + i }] } });
  }
  return { g, t };
}
async function buka(g, viewport) {
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: viewport || { width: 1400, height: 900 }, acceptDownloads: true }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  g.panggilan = [];
  await page.exposeFunction('__gas', async (k, a) => { const args = JSON.parse(a); g.panggilan.push(args[1]); await new Promise(r => setTimeout(r, 40)); return JSON.stringify(g.api(...args)); });
  const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + BRIDGE + g.ctx.UI_HTML;
  await page.route('http://skm.test/**', r => r.fulfill({ body: html, contentType: 'text/html; charset=utf-8' }));
  await page.goto('http://skm.test/');
  return { browser, page, errors };
}
const tunggu = (page, fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 10000 });

test('UI F2: muat data → daftar → detail → simpan optimis → form → feed → PIC massal → upload → pengaturan → arsip/reopen', { skip: !chromium, timeout: 180000 }, async () => {
  const { g } = siapkan();
  const { browser, page, errors } = await buka(g);
  try {
    await page.waitForSelector('#lform');
    await page.fill('#lu', 'admin'); await page.fill('#lp', 'Rahasia2026'); await page.click('#lbtn');
    await page.waitForSelector('.loadov');
    await page.waitForSelector('.loadov', { state: 'detached', timeout: 15000 });
    await page.waitForSelector('.utiles');
    assert.equal(await page.$eval('.utile b', e => e.textContent), '6', 'beranda menghitung kontrak OPEN');

    // daftar kontrak dari data di browser
    await page.click('[data-go="kontrak"]'); await page.waitForSelector('tr[data-k]');
    assert.equal(await page.$$eval('tr[data-k]', e => e.length), 6);
    g.panggilan = [];
    await page.click('[data-kq="nopic"]'); await page.waitForTimeout(100);
    assert.equal(await page.$$eval('tr[data-k]', e => e.length), 2, 'filter Tanpa PIC');
    assert.deepEqual(g.panggilan, [], 'filter tidak memanggil server');
    await page.click('[data-kq="nopic"]');

    // detail + pindah tahap: tampilan dulu, server menyusul
    await page.click('tr[data-k="K-000002"] td:nth-child(2)'); await page.waitForSelector('.drawer .ost');
    await page.click('.ost[data-t="REVIEW_CUST"]'); await page.waitForSelector('.modal'); await page.click('.modal [data-a="1"]');
    assert.equal(await page.evaluate(() => kontrak('K-000002').k.TahapKontrak), 'REVIEW_CUST', 'langsung berubah di layar');
    await tunggu(page, () => D.antre.length === 0);
    assert.equal(g.tab('Kontrak').find(k => k.KontrakID === 'K-000002').TahapKontrak, 'REVIEW_CUST');
    assert.match(await page.textContent('#syncChip'), /Tersimpan/);
    // mundur tanpa keterangan ditolak di layar
    await page.click('.ost[data-t="KOMPULIR"]'); await page.waitForSelector('.modal'); await page.click('.modal [data-a="1"]');
    assert.match(await page.textContent('.toast'), /keterangan/);
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    // kendala
    await page.click('#addKend'); await page.waitForSelector('#kJ'); await page.selectOption('#kJ', 'KENDALA_CUST'); await page.fill('#kKet', 'PIC cuti'); await page.click('.modal [data-a="1"]');
    await tunggu(page, () => D.antre.length === 0);
    assert.equal(g.tab('Kontrak').find(k => k.KontrakID === 'K-000002').KendalaUmum, 'KENDALA CUSTOMER');
    assert.match(await page.textContent('.drawer .push'), /PIC cuti/);
    await page.click('[data-dtab="riwayat"]'); await page.waitForSelector('.drawer .tl .e');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);

    // form tambah kontrak: cek dobel, simpan, panel detail kontrak baru terbuka
    await page.click('#addK'); await page.waitForSelector('#fNo');
    await page.fill('#fNo', 'kl.0001/tsat/2026'); await page.waitForTimeout(50);
    assert.match(await page.textContent('#fDupe'), /K-000001/);
    await page.fill('#fNo', 'KL.0099/TSAT/2026'); await page.fill('#fJudul', 'Baru dari form'); await page.fill('#fPel', 'PT A'); await page.fill('#fEnd', 'PT A');
    await page.fill('#fNilai', '1.250.000.000'); await page.fill('[data-o="0"][data-f="NoOrder"]', 'SO-99');
    assert.match(await page.textContent('#fRp'), /1\.250\.000\.000/);
    await page.click('#kfSave');
    await tunggu(page, () => D.antre.length === 0 && S.drawer === 'K-000007');
    const kb = g.tab('Kontrak').find(k => k.KontrakID === 'K-000007');
    assert.equal(kb.JenisCustomer, 'DIRECT');
    assert.equal(g.tab('BAST').find(x => x.KontrakID === 'K-000007').DokTagih, 'BAA', 'DIRECT → usulan BAA');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);

    // perubahan dari user lain masuk lewat feed
    const t2 = g.api(null, 'login', { username: 'admin', password: 'Rahasia2026' }).data.token;
    const snap = g.api(t2, 'data.muat').data.snap, obj = (tab, r) => Object.fromEntries(snap.tabs[tab].c.map((c, i) => [c, r[i]]));
    const k3 = obj('Kontrak', snap.tabs.Kontrak.r.find(r => r[0] === 'K-000003')), b3 = snap.tabs.BAST.r.filter(r => r[1] === 'K-000003').map(r => obj('BAST', r));
    g.ctx.Repo._reset();
    assert.equal(g.api(t2, 'kontrak.op', { op: 'bast.tahap', kid: 'K-000003', versi: k3.Version, bundle: { bast: b3, order: [], kend: [], alias: [] }, data: { id: 'K-000003-B1', ke: 'SIRKULIR' } }).ok, true);
    await page.evaluate(() => tarik());
    await tunggu(page, () => kontrak('K-000003').k.TahapKontrak === 'SIRKULIR');

    // PIC massal
    await page.click('.rowchk[data-id="K-000003"]'); await page.click('.rowchk[data-id="K-000006"]');
    await page.selectOption('#bulkPic', 'omPik'); await page.click('#bulkGo');
    await tunggu(page, () => D.antre.length === 0);
    assert.equal(g.tab('Kontrak').find(k => k.KontrakID === 'K-000006').PIC, 'omPik');

    // upload Excel: file dibaca di browser tanpa pustaka luar
    await page.click('[data-go2="upload"]'); await page.waitForSelector('#upFile', { state: 'attached' });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#upTpl')]);
    assert.equal(dl.suggestedFilename(), 'Template_Upload_Kontrak_SKM.xlsx');
    await page.setInputFiles('#upFile', CONTOH); await page.waitForSelector('.utiles', { timeout: 15000 });
    const st = await page.evaluate(() => S.up.rows.map(o => o.st));
    assert.equal(st.length, 9);
    assert.equal(st.filter(x => x === 'error').length, 4);
    assert.ok(g.panggilan.includes('upload.cekNomor'), 'nomor dicek ke server (termasuk arsip)');
    await page.click('#upSave'); await page.click('.modal [data-a="1"]'); await page.waitForSelector('.udone', { timeout: 20000 });
    const h = await page.evaluate(() => S.up.hasil);
    assert.equal(h.dibuat.length, 5); assert.equal(h.gagal.length, 4);
    assert.equal(g.tab('Kontrak').length, 12);
    assert.ok(await page.evaluate(() => semuaKontrak().length === 12), 'kontrak hasil upload langsung ada di browser');

    // pengaturan Nilai Push: draft dihitung di layar, simpan → semua kontrak dihitung ulang
    await page.click('[data-go="pengaturan"]'); await page.click('[data-stab="push"]'); await page.waitForSelector('[data-tf="Nilai"]');
    const idx = await page.evaluate(() => S.set.draft.findIndex(x => x.Kondisi === 'TAHAP:KOMPULIR'));
    await page.fill(`[data-tf="Nilai"][data-i="${idx}"]`, 'KOMPULIR EVIDENCE');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.tf), 'Nilai', 'kursor tetap di kolom saat mengetik (C23)');
    await page.waitForSelector('#setBar:not([hidden])'); await page.click('#setSimpan');
    await tunggu(page, () => document.getElementById('setBar') && document.getElementById('setBar').hidden, null, 15000);
    assert.equal(g.tab('Ref_NilaiPush')[idx].Nilai, 'KOMPULIR EVIDENCE');
    assert.ok(g.tab('Kontrak').filter(k => k.KendalaUmum === 'KOMPULIR EVIDENCE').length >= 5);
    assert.ok(await page.evaluate(() => semuaKontrak().some(b => b.k.KendalaUmum === 'KOMPULIR EVIDENCE')));

    // arsip tahunan: CLOSE > 90 hari dipindah, dicari, dibuka hanya-baca, reopen
    let b1 = await page.evaluate(() => KD.salin(kontrak('K-000001')));
    g.ctx.Repo._reset();
    assert.equal(g.api(t2, 'kontrak.op', { op: 'bast.tahap', kid: 'K-000001', versi: b1.k.Version, bundle: { bast: b1.bast, order: b1.order, kend: b1.kend, alias: b1.alias }, data: { id: 'K-000001-B1', ke: 'TAKEOUT' } }).ok, true);
    g.clock.tambah(95 * 864e5);
    const t3 = g.api(null, 'login', { username: 'admin', password: 'Rahasia2026' }).data.token;
    assert.equal(g.api(t3, 'arsip.jalankan').data.dipindah, 1);
    await page.evaluate(t => { S.token = t; store.set('skm-token', t); }, t3);
    await page.evaluate(() => tarik()); await tunggu(page, () => !kontrak('K-000001'));
    await page.evaluate(() => go('kontrak')); await page.waitForSelector('#kq');
    await page.fill('#kq', 'KL.0001'); await page.waitForSelector('[data-lama="K-000001"]', { timeout: 10000 });
    await page.click('[data-lama="K-000001"]'); await page.waitForSelector('#reopenLama', { timeout: 10000 });
    assert.equal(await page.$eval('#dpic', e => e.disabled), true, 'kontrak lama hanya-baca');
    await page.click('#reopenLama'); await page.waitForSelector('#roKet'); await page.fill('#roKet', 'customer minta revisi'); await page.click('.modal [data-a="1"]');
    await tunggu(page, () => kontrak('K-000001') && kontrak('K-000001').k.StatusKontrak === 'OPEN', null, 15000);
    assert.equal(g.tab('Indeks').find(x => x.KontrakID === 'K-000001').Lokasi, 'AKTIF');
    assert.equal(await page.$$eval('#reopenLama', e => e.length), 0);

    // muat ulang halaman: satu panggilan saja (boot membawa data aktif)
    g.panggilan = [];
    await page.reload(); await page.waitForSelector('.utiles');
    assert.deepEqual(g.panggilan, ['boot']);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('UI F2: STAFF & VIEWER — tombol sesuai izin; layar ponsel tidak melebar', { skip: !chromium, timeout: 90000 }, async () => {
  const { g, t } = siapkan();
  const s = g.api(t, 'users.simpan', { baru: true, username: 'lihat01', nama: 'Manajer', alias: '', role: 'VIEWER' }).data;
  const tv = g.api(null, 'login', { username: 'lihat01', password: s.passwordAcak }).data.token; g.api(tv, 'gantiPassword', { baru: 'Viewer2026x' });
  const { browser, page, errors } = await buka(g, { width: 400, height: 860 });
  try {
    await page.waitForSelector('#lform');
    await page.fill('#lu', 'lihat01'); await page.fill('#lp', 'Viewer2026x'); await page.click('#lbtn');
    await page.waitForSelector('.utiles', { timeout: 15000 });
    await page.evaluate(() => go('kontrak')); await page.waitForSelector('tr[data-k]');
    assert.equal(await page.$$eval('#addK', e => e.length), 0, 'viewer tidak bisa menambah');
    assert.equal(await page.$$eval('.rowchk', e => e.length), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 400);
    await page.click('tr[data-k] td'); await page.waitForSelector('.drawer');
    assert.equal(await page.$$eval('#addBast,#addKend', e => e.length), 0);
    assert.equal(await page.$eval('.ost', e => e.disabled), true);
    assert.equal(await page.$$eval('[data-go="pengaturan"]', e => e.length), 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
