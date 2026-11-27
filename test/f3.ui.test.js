// F3: uji UI — Dashboard, Perlu Perhatian, Ctrl+K, Import data lama, izin tambahan per user, default "Milik saya".
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { createGas } = require('./helpers/fakegas');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { chromium = null; }

const BRIDGE = `<script>window.google={script:{get run(){let s,f;const p=new Proxy({},{get(t,k){if(k==='withSuccessHandler')return h=>{s=h;return p;};if(k==='withFailureHandler')return h=>{f=h;return p;};return(...a)=>{window.__gas(k,JSON.stringify(a)).then(r=>s&&s(JSON.parse(r)),e=>f&&f(e));};}});return p;}}};</script>`;
const FF_LAMA = path.join(__dirname, '..', 'mockup', 'Contoh_Data_FF_Lama.xlsx');

function siapkan() {
  const g = createGas(); g.ctx.setup();
  const pw = g.logs.join('\n').match(/password sementara: (\S+)/)[1];
  const t = g.api(null, 'login', { username: 'admin', password: pw }).data.token; g.api(t, 'gantiPassword', { baru: 'Rahasia2026' });
  g.api(t, 'users.simpan', { username: 'admin', nama: 'Admin awal', alias: 'omPik', role: 'ADMIN' });
  [['edo01', 'Edo'], ['unggul', 'Unggul'], ['baim', 'Baim'], ['alif', 'Alif']].forEach(([u, a]) => {
    const r = g.api(t, 'users.simpan', { baru: true, username: u, nama: a, alias: a, role: 'STAFF' }).data;
    const tk = g.api(null, 'login', { username: u, password: r.passwordAcak }).data.token; g.api(tk, 'gantiPassword', { baru: 'Staf2026x' });
  });
  for (let i = 1; i <= 6; i++) {
    g.api(t, 'kontrak.op', { op: 'kontrak.buat', data: { f: { NoKontrak: 'KL.000' + i + '/TSAT/2026', JudulKontrak: 'Internet ' + i + ' titik', NamaPelanggan: 'PT Telkom', EndCustomer: 'Bank BRI',
      NilaiKontrak: String(i * 1e8), JumlahLokasi: String(i), Populasi: 'TREG', Segment: 'GOS', PIC: i % 3 ? 'Edo' : '' }, orders: [{ JenisOrder: 'SO', NoOrder: 'SO-' + i }],
      tglTahap: i === 1 ? '2026-01-05 08:00:00' : '', kendala: i === 2 ? { Jenis: 'KENDALA_CUST', Keterangan: 'Menunggu PIC customer' } : null } });
  }
  return { g, t };
}
async function buka(g, viewport) {
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: viewport || { width: 1400, height: 900 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  g.panggilan = [];
  await page.exposeFunction('__gas', async (k, a) => { const args = JSON.parse(a); g.panggilan.push(args[1]); await new Promise(r => setTimeout(r, 30)); return JSON.stringify(g.api(...args)); });
  const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + BRIDGE + g.ctx.UI_HTML;
  await page.route('http://skm.test/**', r => r.fulfill({ body: html, contentType: 'text/html; charset=utf-8' }));
  await page.goto('http://skm.test/');
  return { browser, page, errors };
}
const tunggu = (page, fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 10000 });
async function masuk(page, u, p) {
  await page.waitForSelector('#lform');
  await page.fill('#lu', u); await page.fill('#lp', p); await page.click('#lbtn');
  await page.waitForSelector('.kpis', { timeout: 20000 });
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

test('UI F3: dashboard → perlu perhatian → Ctrl+K → import data lama → izin tambahan → staff "Milik saya"', { skip: !chromium, timeout: 240000 }, async () => {
  const { g } = siapkan();
  const { browser, page, errors } = await buka(g);
  try {
    await masuk(page, 'admin', 'Rahasia2026');
    // --- dashboard (ADMIN: Tim FF)
    assert.match(await page.textContent('.top h1'), /^Selamat (pagi|siang|sore|malam), Admin awal/);
    assert.equal(await page.$eval('[data-dmine].on', b => b.dataset.dmine), 'false');
    assert.equal(await page.$eval('.kpi .v', e => e.textContent), '6');
    assert.equal(await page.$$eval('.pnode', e => e.length), 6);
    await tunggu(page, () => document.querySelector('#timTbl .spark'));
    assert.ok(await page.$('[data-dpic="Edo"]'));
    assert.ok(await page.$('[data-dpic="__none"]'), 'baris tanpa PIC');
    // kualitas data → daftar terfilter
    await page.click('[data-dq="nopic"]'); await page.waitForSelector('tr[data-k]');
    assert.equal(await page.$$eval('tr[data-k]', e => e.length), 2);
    assert.equal(await page.evaluate(() => S.kf.quick), 'nopic');
    await page.click('[data-go="beranda"]'); await page.waitForSelector('.pnode');
    await page.click('.pnode[data-tahap="KOMPULIR"]'); await page.waitForSelector('tr[data-k]');
    assert.equal(await page.evaluate(() => S.kf.tahap), 'KOMPULIR');

    // --- Perlu Perhatian: badge, kelompok, atur PIC cepat
    const badge = await page.textContent('[data-cnt="perhatian"]');
    assert.ok(Number(badge) >= 3, 'badge Perlu Perhatian: ' + badge);
    await page.click('[data-go="perhatian"]'); await page.waitForSelector('.attn');
    const isi = await page.textContent('#content');
    assert.match(isi, /BAST melewati batas aging tahap/);
    assert.match(isi, /K-000001-B1 di Kompulir Eviden sudah \d+ hari/);
    assert.match(isi, /Kontrak OPEN tanpa PIC/);
    const kid = await page.$eval('[data-ppic]', s => s.dataset.ppic);
    await page.selectOption(`[data-ppic="${kid}"]`, 'Baim');
    await tunggu(page, () => !D.antre.length);
    assert.equal(g.tab('Kontrak').find(k => k.KontrakID === kid).PIC, 'Baim');
    await page.click('[data-pmine="true"]');
    assert.match(await page.textContent('#content'), /untuk PIC omPik/);
    await page.click('[data-pmine="false"]');

    // --- Ctrl+K: kontrak, perintah
    await page.keyboard.press('Control+k'); await page.waitForSelector('#palq');
    await page.fill('#palq', 'KL.0003'); await tunggu(page, () => document.querySelectorAll('#palr .pi').length >= 1);
    assert.match(await page.textContent('#palr'), /KL\.0003\/TSAT\/2026/);
    await page.keyboard.press('Enter'); await page.waitForSelector('.drawer');
    assert.equal(await page.evaluate(() => S.drawer), 'K-000003');
    await page.keyboard.press('Escape'); await tunggu(page, () => !S.drawer);
    await page.click('#palBtn'); await page.waitForSelector('#palq');
    await page.fill('#palq', 'import'); await tunggu(page, () => /Import data lama/.test(document.querySelector('#palr').textContent));
    await page.keyboard.press('Enter');

    // --- Import data lama
    await page.waitForSelector('#impFile', { state: 'attached' });
    assert.equal(await page.evaluate(() => S.page), 'import');
    await page.setInputFiles('#impFile', FF_LAMA); await page.waitForSelector('[data-imap="no"]', { timeout: 15000 });
    assert.match(await page.textContent('#content'), /judul kolom di baris 3 · 9 baris data/);
    assert.equal(await page.$eval('[data-imap="end"]', s => s.selectedOptions[0].textContent), 'NAMA PELANGGAN');
    assert.equal(await page.$eval('[data-inil="BAST ON REVIEW"]', s => s.value), 'tahap:REVIEW_CUST');
    assert.equal(await page.$eval('[data-inil="BAST REVISI"]', s => s.value), 'kendala:REV_DOKUMEN');
    assert.equal(await page.$eval('[data-inil="BAST PARSIAL"]', s => s.value), 'parsial');
    assert.equal(await page.$eval('[data-inil="NUNGGU TTD"]', s => s.value), 'lain');
    assert.match(await page.textContent('#content'), /SIRKULIR tebakan, cek/);
    await page.uncheck('[data-iref="Populasi:MARITIM"]');
    await page.click('#impLanjut'); await page.waitForSelector('.utbl');
    const tiles = await page.$$eval('.utile b', e => e.map(x => x.textContent));
    assert.deepEqual(tiles, ['9', '4', '3', '0', '2'], 'semua / baru / catatan / ada / error');
    assert.match(await page.textContent('#content'), /1 kontrak langsung CLOSE/);
    await page.click('#impSimpan'); await page.waitForSelector('#overlay-root .scrim');
    await page.click('#overlay-root .acts .btn.pri');
    await page.waitForSelector('.udone', { timeout: 20000 });
    assert.equal(g.tab('Kontrak').length, 13);
    assert.equal(g.tab('Kontrak').filter(k => k.PerluVerifikasi === 'TRUE').length, 7);
    assert.ok(g.tab('Ref_Populasi').some(r => r.Kode === 'TELKOMSEL'));
    assert.ok(!g.tab('Ref_Populasi').some(r => r.Kode === 'MARITIM'));
    assert.equal(g.tab('Kontrak').find(k => k.NoKontrak === 'WO/0188/TSAT/IX/2025').StatusKontrak, 'CLOSE');
    assert.ok(await page.evaluate(() => semuaKontrak().length === 13), 'hasil import langsung ada di browser');
    await page.click('[data-go2="perhatian"]'); await page.waitForSelector('[data-pverif]');
    assert.match(await page.textContent('#content'), /BAST parsial: lengkapi cakupan/);
    // impor ulang file yang sama: semua terbaca sudah ada
    await page.click('[data-go="kontrak"]'); await page.waitForSelector('[data-go2="upload"]'); await page.click('[data-go2="upload"]');
    await page.click('[data-go2="import"]'); await page.waitForSelector('#impFile', { state: 'attached' });
    await page.setInputFiles('#impFile', FF_LAMA); await page.waitForSelector('#impLanjut', { timeout: 15000 });
    await page.click('#impLanjut'); await page.waitForSelector('.utbl');
    assert.deepEqual(await page.$$eval('.utile b', e => e.map(x => x.textContent)), ['9', '0', '0', '7', '2']);

    // --- Users: izin tambahan untuk Edo
    await page.click('[data-go="users"]'); await page.waitForSelector('[data-row="edo01"]');
    await page.click('[data-row="edo01"]'); await page.waitForSelector('#sheet-root [data-ekstra="kontrak.import"]');
    assert.match(await page.textContent('#sheet-root'), /Izin tambahan di luar role/);
    await page.check('#sheet-root [data-ekstra="kontrak.import"]');
    assert.match(await page.textContent('#perms'), /Upload Excel & import data lama/);
    await page.click('#ssave'); await tunggu(page, () => !document.querySelector('#sheet-root .drawer'));
    assert.equal(g.tab('Users').find(u => u.Username === 'edo01').IzinTambahan, 'kontrak.import');
    await tunggu(page, () => /\+ Upload Excel/.test(document.querySelector('[data-row="edo01"]').textContent));
    // role ADMIN: centang terkunci (sudah termasuk role)
    await page.click('[data-row="admin"]'); await page.waitForSelector('#sheet-root [data-ekstra]');
    assert.equal(await page.$eval('#sheet-root [data-ekstra]', c => c.disabled && c.checked), true);
    await page.click('#scancel');

    // --- staff: dashboard & perhatian dibuka "Milik saya"; Upload Excel tampil karena izin tambahan
    await page.evaluate(() => keluar()); await page.waitForSelector('#lform');
    await masuk(page, 'edo01', 'Staf2026x');
    assert.equal(await page.$eval('[data-dmine].on', b => b.dataset.dmine), 'true');
    assert.match(await page.textContent('.top .crumb'), /kontrak milik Anda/);
    assert.equal(await page.$$eval('#timTbl [data-dpic]', e => e.map(x => x.dataset.dpic).join()), 'Edo');
    await page.click('[data-go="perhatian"]'); await page.waitForSelector('[data-pmine].on');
    assert.equal(await page.$eval('[data-pmine].on', b => b.dataset.pmine), 'true');
    await page.click('[data-go="kontrak"]'); await page.waitForSelector('[data-go2="upload"]');
    assert.ok(!(await page.$('[data-ppic]')), 'staff tanpa pic.atur tidak bisa atur PIC dari daftar');

    // --- tampilan ponsel: tidak ada scroll menyamping
    await page.setViewportSize({ width: 390, height: 844 });
    for (const p of ['beranda', 'perhatian', 'import']) { await page.evaluate(x => go(x), p); await page.waitForTimeout(300); assert.ok(await overflow(page) <= 1, p + ' melebar di ponsel'); }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('UI F3: STAFF tanpa izin tambahan tidak melihat Upload/Import; Ctrl+K tanpa perintah import; kontrak diarsipkan tetap bisa dicari', { skip: !chromium, timeout: 120000 }, async () => {
  const { g, t } = siapkan();
  // admin mengarsipkan K-000004 secara manual
  const k4 = g.tab('Kontrak').find(k => k.KontrakID === 'K-000004');
  assert.equal(g.api(t, 'kontrak.op', { op: 'kontrak.arsip', kid: 'K-000004', versi: k4.Version, bundle: { bast: g.tab('BAST').filter(b => b.KontrakID === 'K-000004'), order: g.tab('OrderInternal').filter(o => o.KontrakID === 'K-000004'), kend: [], alias: [] }, data: { alasan: 'Kontrak dobel' } }).ok, true);
  const { browser, page, errors } = await buka(g, { width: 1400, height: 900 });
  try {
    await masuk(page, 'baim', 'Staf2026x');
    // menu samping bisa diringkas (hanya ikon) dan diingat
    assert.equal(await page.evaluate(() => document.querySelector('.app').classList.contains('mini')), false);
    await page.click('#burger'); await page.waitForTimeout(450);
    assert.ok(await page.evaluate(() => document.querySelector('.app').classList.contains('mini') && document.querySelector('#side').getBoundingClientRect().width < 100));
    assert.equal(await page.evaluate(() => localStorage.getItem('skm-side-mini')), '1');
    await page.click('#burger');
    // kontrak diarsipkan manual: muncul di Ctrl+K dan di pencarian Kontrak
    await page.keyboard.press('Control+k'); await page.waitForSelector('#palq');
    await page.fill('#palq', 'KL.0004'); await tunggu(page, () => /diarsipkan/.test(document.querySelector('#palr').textContent));
    await page.keyboard.press('Enter'); await page.waitForSelector('.drawer');
    assert.equal(await page.evaluate(() => S.drawer), 'K-000004');
    await page.keyboard.press('Escape'); await tunggu(page, () => !S.drawer);
    assert.equal(await page.$eval('[data-dmine].on', b => b.dataset.dmine), 'true');
    await page.click('[data-go="kontrak"]'); await page.waitForSelector('tr[data-k]');
    await page.fill('#kq', 'KL.0004'); await tunggu(page, () => /Kontrak diarsipkan/.test(document.querySelector('#content').textContent));
    assert.match(await page.textContent('#content'), /Kontrak dobel/);
    await page.fill('#kq', ''); await page.waitForTimeout(300);
    assert.ok(await page.$('#addK'), 'tambah kontrak satu per satu tetap boleh');
    assert.ok(!(await page.$('[data-go2="upload"]')));
    await page.keyboard.press('Control+k'); await page.waitForSelector('#palq');
    await page.fill('#palq', 'import'); await page.waitForTimeout(200);
    assert.doesNotMatch(await page.textContent('#palr'), /Import data lama/);
    await page.keyboard.press('Escape');
    await page.evaluate(() => go('import')); await page.waitForTimeout(400);
    assert.ok(!(await page.$('#impFile')), 'halaman import tidak terbuka');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
