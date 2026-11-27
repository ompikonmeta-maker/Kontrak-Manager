// F4a: uji UI — wizard target (koneksi, tab, pemetaan, Cek saja, simpan + Update), halaman Google Sheet, status di Dashboard/Perlu Perhatian/detail.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGas } = require('./helpers/fakegas');
const { createUnit } = require('./helpers/fakeunit');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { chromium = null; }

const BRIDGE = `<script>window.google={script:{get run(){let s,f;const p=new Proxy({},{get(t,k){if(k==='withSuccessHandler')return h=>{s=h;return p;};if(k==='withFailureHandler')return h=>{f=h;return p;};return(...a)=>{window.__gas(k,JSON.stringify(a)).then(r=>s&&s(JSON.parse(r)),e=>f&&f(e));};}});return p;}}};</script>`;
const URL = 'https://script.google.com/macros/s/AKfycbUNIT_BILLCOM/exec';
function siapkan() {
  const unit = createUnit({ url: URL, secret: 'rahasia-billcom', nama: 'Billcom Telkomsat 2026', tabs: {
    'OKT 2026': [['LAPORAN'], [], ['NO', 'NO KONTRAK', 'NAMA CUSTOMER', 'STATUS BAST FF', 'KETERANGAN FF', 'TGL UPDATE FF']],
    'NOV 2026': [['LAPORAN BILLCOM NOVEMBER'], ['posisi data'], ['NO', 'NO KONTRAK', 'NAMA CUSTOMER', 'STATUS BAST FF', 'KETERANGAN FF', 'TGL UPDATE FF'],
      [1, 'KL.0001/TSAT/2026', 'PT Telkom', 'BAST ON REVIEW', '', ''], [2, 'KL.0002/TSAT/2026', 'Bank BRI', '', '', ''], [3, 'KL.0001/TSAT/2026', 'PT Telkom', '', '', ''], [4, 'KL.0099/TSAT/2026', 'PT Baru', '', '', '']],
    REKAP: [['rekap']] } });
  const g = createGas({ units: [unit] }); g.ctx.setup();
  const pw = g.logs.join('\n').match(/password sementara: (\S+)/)[1];
  const t = g.api(null, 'login', { username: 'admin', password: pw }).data.token; g.api(t, 'gantiPassword', { baru: 'Rahasia2026' });
  g.api(t, 'users.simpan', { username: 'admin', nama: 'Admin awal', alias: 'omPik', role: 'ADMIN' });
  const r = g.api(t, 'users.simpan', { baru: true, username: 'edo01', nama: 'Edo', alias: 'Edo', role: 'STAFF' }).data;
  const te = g.api(null, 'login', { username: 'edo01', password: r.passwordAcak }).data.token; g.api(te, 'gantiPassword', { baru: 'Staf2026x' });
  for (let i = 1; i <= 2; i++) g.api(t, 'kontrak.op', { op: 'kontrak.buat', data: { f: { NoKontrak: 'KL.000' + i + '/TSAT/2026', JudulKontrak: 'Kontrak ' + i, NamaPelanggan: 'PT Telkom', EndCustomer: 'Bank BRI', PIC: 'Edo' }, tahapAwal: i === 1 ? 'REVIEW_CUST' : 'KOMPULIR' } });
  return { g, unit };
}
async function buka(g, viewport) {
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: viewport || { width: 1400, height: 900 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.exposeFunction('__gas', async (k, a) => { const args = JSON.parse(a); await new Promise(r => setTimeout(r, 20)); return JSON.stringify(g.api(...args)); });
  const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + BRIDGE + g.ctx.UI_HTML;
  await page.route('http://skm.test/**', r => r.fulfill({ body: html, contentType: 'text/html; charset=utf-8' }));
  await page.goto('http://skm.test/');
  return { browser, page, errors };
}
const tunggu = (page, fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 15000 });
async function masuk(page, u, p) { await page.waitForSelector('#lform'); await page.fill('#lu', u); await page.fill('#lp', p); await page.click('#lbtn'); await page.waitForSelector('.kpis', { timeout: 20000 }); }

test('UI F4a: wizard → simpan & Update → Cek saja, diubah luar, judul berubah → status di dashboard, perhatian, detail', { skip: !chromium, timeout: 240000 }, async () => {
  const { g, unit } = siapkan();
  const { browser, page, errors } = await buka(g);
  try {
    await masuk(page, 'admin', 'Rahasia2026');
    assert.match(await page.textContent('.kpis ~ .grid.g2'), /Belum ada sheet unit yang terhubung/);
    await page.click('[data-go="gsheet"]'); await page.waitForSelector('#gsAdd');
    assert.match(await page.textContent('#content'), /Belum ada sheet unit/);
    // --- wizard 1: koneksi
    await page.click('#gsAdd'); await page.waitForSelector('#wNama');
    await page.fill('#wNama', 'Billcom Telkomsat 2026');
    await page.click('#wGen'); await tunggu(page, () => document.querySelector('#wRahasia').value.length === 24);
    await page.fill('#wRahasia', 'rahasia-billcom');
    await page.fill('#wUrl', URL);
    assert.equal(await page.$eval('#wNext', b => b.disabled), true, 'lanjut dikunci sebelum tes koneksi');
    await page.click('#wTes'); await page.waitForSelector('.note.ok');
    assert.match(await page.textContent('#content'), /Terhubung ke Billcom Telkomsat 2026 · 3 tab · script v1/);
    await page.click('#wNext');
    // --- wizard 2: tab terbaru
    await page.check('input[name=wm][value=TERBARU]'); await page.waitForSelector('#wPola');
    await tunggu(page, () => /NOV 2026 · terbaru/.test(document.querySelector('#content').textContent));
    assert.match(await page.textContent('#content'), /Tidak cocok: REKAP/);
    await page.click('#wNext');
    // --- wizard 3: pemetaan otomatis dari judul
    await page.waitForSelector('[data-wmap="KUNCI"]');
    assert.equal(await page.$eval('#wHdr', s => s.value), '3');
    assert.equal(await page.$eval('[data-wmap="KUNCI"]', s => s.value), 'NO KONTRAK');
    assert.equal(await page.$eval('[data-wmap="KENDALA_UMUM"]', s => s.value), 'STATUS BAST FF');
    assert.equal(await page.$eval('[data-wmap="TGL_UPDATE"]', s => s.value), 'TGL UPDATE FF');
    assert.equal(await page.$eval('[data-wmap="PELANGGAN"]', s => s.value), 'NAMA CUSTOMER');
    await page.selectOption('[data-wmap="TAHAP"]', 'STATUS BAST FF');
    await tunggu(page, () => /lebih dari satu field/.test(document.querySelector('#content').textContent));
    assert.equal(await page.$eval('#wNext', b => b.disabled), true);
    await page.selectOption('[data-wmap="TAHAP"]', '');
    await page.click('#wNext');
    // --- wizard 4: Cek saja (belum disimpan, tidak menulis)
    await page.waitForSelector('.utbl, .utiles', { timeout: 15000 });
    await tunggu(page, () => /sel akan ditulis/.test(document.querySelector('#content').textContent));
    assert.equal(unit.tab('NOV 2026').sel(4, 4), 'BAST ON REVIEW');
    assert.match(await page.textContent('#content'), /titik awal/);
    await page.click('#wNext');
    // --- wizard 5: simpan + Update sekarang
    assert.equal(await page.$eval('#wUpd', c => c.checked), true);
    await page.click('#wNext');
    await page.waitForSelector('[data-gcek]');
    await tunggu(page, () => /Hasil Update/.test(document.querySelector('#content').textContent), null, 20000);
    assert.equal(unit.tab('NOV 2026').sel(4, 4), 'DRAFT REVIEW CUSTOMER');
    assert.equal(unit.tab('NOV 2026').sel(6, 4), 'DRAFT REVIEW CUSTOMER');
    assert.equal(unit.tab('NOV 2026').sel(5, 4), 'KOMPULIR EVIDEN');
    assert.equal(g.tab('Target').length, 1);
    assert.match(await page.textContent('#content'), /Riwayat sinkron[\s\S]*UPDATE/);
    // --- diubah di luar SKM → Cek saja menandai, tidak ditimpa
    unit.edit('NOV 2026', 5, 4, 'BAST DONE', 'rina@contoh.id');
    await page.click('[data-gcek="T01"]');
    await tunggu(page, () => /Hasil Cek saja/.test(document.querySelector('#content').textContent));
    assert.match(await page.textContent('#content'), /DIUBAH_LUAR/);
    // --- judul kolom diganti → tab dilewati; Update ditahan
    unit.tab('NOV 2026').set(3, 4, 'STATUS BAST');
    await page.click('[data-gcek="T01"]');
    await tunggu(page, () => /KOLOM_BERUBAH/.test(document.querySelector('#content').textContent));
    await page.click('[data-gupd="T01"]'); await page.click('#overlay-root .acts .btn.pri');
    await tunggu(page, () => /Update ditahan/.test((document.querySelector('.toast') || {}).textContent || ''));
    assert.equal(unit.tab('NOV 2026').sel(5, 4), 'BAST DONE');
    // --- status di Dashboard & Perlu Perhatian
    await page.click('[data-go="beranda"]'); await page.waitForSelector('.kpis');
    await tunggu(page, () => /Billcom Telkomsat 2026/.test(document.querySelector('#content').textContent));
    assert.match(await page.textContent('#content'), /Update ditahan: KOLOM_BERUBAH/);
    await page.click('[data-go="perhatian"]'); await page.waitForSelector('.attn');
    assert.match(await page.textContent('#content'), /Target error \/ sel diubah di luar SKM[\s\S]*KOLOM_BERUBAH/);
    // --- detail kontrak: posisi di sheet unit
    await page.click('[data-go="kontrak"]'); await page.waitForSelector('tr[data-k="K-000001"]');
    await page.click('tr[data-k="K-000001"]'); await page.waitForSelector('.drawer');
    await tunggu(page, () => /tab NOV 2026 · baris 4, 6/.test(document.querySelector('#sheet-root').textContent));
    await page.keyboard.press('Escape');
    // --- Ctrl+K memuat perintah Google Sheet
    await page.keyboard.press('Control+k'); await page.fill('#palq', 'google'); await tunggu(page, () => /Google Sheet/.test(document.querySelector('#palr').textContent));
    await page.keyboard.press('Enter'); await page.waitForSelector('[data-gcek]');
    // --- ponsel
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, 'Google Sheet melebar di ponsel');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('UI F4a: STAFF tidak melihat menu Google Sheet; dengan izin tambahan bisa Cek tapi tidak menambah target', { skip: !chromium, timeout: 120000 }, async () => {
  const { g } = siapkan();
  const { browser, page, errors } = await buka(g);
  try {
    await masuk(page, 'edo01', 'Staf2026x');
    assert.equal(await page.$$eval('[data-go="gsheet"]', e => e.length), 0);
    await page.evaluate(() => go('wizard')); await page.waitForTimeout(300);
    assert.ok(!(await page.$('#wNama')));
    const ta = g.api(null, 'login', { username: 'admin', password: 'Rahasia2026' }).data.token;
    g.api(ta, 'users.simpan', { username: 'edo01', nama: 'Edo', alias: 'Edo', role: 'STAFF', izinTambahan: ['sinkron.jalankan'] });
    await page.reload(); await page.waitForSelector('.kpis');
    await page.click('[data-go="gsheet"]'); await page.waitForSelector('#content .note.info');
    assert.ok(!(await page.$('#gsAdd')), 'tanpa target.kelola tidak bisa menambah target');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
