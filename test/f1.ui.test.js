// F1: uji UI dari ujung ke ujung. Halaman = UI_HTML dari dist/Code.gs; google.script.run diteruskan ke api() di server tiruan.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGas } = require('./helpers/fakegas');

let chromium = null;
try { ({ chromium } = require('playwright')); } catch (e) { /* tanpa browser: dilewati */ }

const BRIDGE = `<script>
window.google = { script: { get run() {
  let s = null, f = null;
  const p = new Proxy({}, { get(_, name) {
    if (name === 'withSuccessHandler') return fn => { s = fn; return p; };
    if (name === 'withFailureHandler') return fn => { f = fn; return p; };
    return (...args) => { window.__gas(name, JSON.stringify(args)).then(r => s && s(JSON.parse(r)), e => f && f(e)); };
  } });
  return p;
} } };
</script>`;

async function bukaApp(g, viewport = { width: 1366, height: 860 }) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.exposeFunction('__gas', (name, argsJson) => {
    const args = JSON.parse(argsJson);
    if (name !== 'api') throw new Error('fungsi server tidak dikenal: ' + name);
    (g.panggilan = g.panggilan || []).push(args[1]);
    return JSON.stringify(g.api(...args));
  });
  // disajikan dari alamat http tiruan (bukan about:blank) supaya localStorage & muat ulang halaman bekerja seperti aslinya
  const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + BRIDGE + g.ctx.UI_HTML;
  await page.route('http://skm.test/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto('http://skm.test/');
  return { browser, page, errors };
}
const teks = (page, sel) => page.$eval(sel, e => e.textContent.trim());

test('UI F1: login pertama → ganti password → kelola user → role → log → sistem → staff ditolak → sesi habis', { skip: !chromium, timeout: 120000 }, async () => {
  const g = createGas();
  g.ctx.setup();
  const pwAdmin = g.logs.join('\n').match(/password sementara: (\S+)/)[1];
  const { browser, page, errors } = await bukaApp(g);
  try {
    // --- login salah lalu benar
    await page.waitForSelector('#lform');
    await page.fill('#lu', 'admin'); await page.fill('#lp', 'salah'); await page.click('#lbtn');
    await page.waitForSelector('.note.warn');
    assert.match(await teks(page, '.note.warn'), /Sisa 4 percobaan/);
    await page.fill('#lp', pwAdmin); await page.click('#lbtn');

    // --- wajib ganti password
    await page.waitForSelector('#gform');
    assert.equal(await page.$eval('#gsave', b => b.disabled), true);
    await page.fill('#pw1', 'Rahasia2026'); await page.fill('#pw2', 'Rahasia2026');
    assert.equal(await page.$eval('#gsave', b => b.disabled), false);
    await page.click('#gsave');
    await page.waitForSelector('.top h1');
    assert.match(await teks(page, '.top h1'), /Selamat (pagi|siang|sore|malam), Admin awal/);

    // --- users: tambah user NIK dengan password acak
    await page.click('[data-go="users"]');
    await page.waitForSelector('#addUser');
    await page.click('#addUser'); await page.waitForSelector('#sheet-root #fu');
    await page.fill('#fu', '95210101'); await page.fill('#fn', 'Edo Pratama'); await page.fill('#fa', 'Edo');
    assert.equal(await teks(page, '#idcard .who b'), 'Edo Pratama');
    await page.click('#ssave');
    await page.waitForSelector('#tpw');
    const pwEdo = await teks(page, '#tpw');
    assert.match(pwEdo, /^\S{3}-\S{3}-\S{3}$/);
    await page.click('.modal [data-a="0"]'); await page.waitForTimeout(250);

    // --- tambah user dengan password diketik, role VIEWER
    await page.click('#addUser'); await page.waitForSelector('#sheet-root #fu');
    await page.fill('#fu', 'tamu.audit'); await page.fill('#fn', 'Tamu Audit');
    await page.click('#sheet-root [data-role="VIEWER"]');
    await page.click('#sheet-root [data-pwmode="ketik"]'); await page.fill('#fpw', 'Lihat2026');
    await page.click('#ssave'); await page.waitForTimeout(500);
    assert.ok(g.tab('Users').some(u => u.Username === 'tamu.audit' && u.Role === 'VIEWER'));

    // --- hapus user tanpa aktivitas via menu ⋮
    await page.click('[data-kebab="tamu.audit"]');
    assert.equal(await page.$eval('.menu [data-mi="del"]', b => b.disabled), false);
    await page.click('.menu [data-mi="del"]'); await page.click('.modal [data-a="1"]'); await page.waitForTimeout(500);
    assert.ok(!g.tab('Users').some(u => u.Username === 'tamu.audit'));
    await page.click('[data-kebab="admin"]');
    assert.equal(await page.$eval('.menu [data-mi="del"]', b => b.disabled), true, 'admin punya riwayat → tidak bisa dihapus');
    await page.keyboard.press('Escape');

    // --- pengaman admin terakhir dari UI
    await page.click('tr[data-row="admin"] td:nth-child(2)'); await page.waitForSelector('#stOn');
    await page.click('#stOn'); await page.click('#ssave'); await page.waitForTimeout(300);
    assert.match(await teks(page, '#ferr'), /minimal satu admin aktif/);
    await page.keyboard.press('Escape'); await page.waitForTimeout(350);

    // --- role & izin: centang lalu simpan
    await page.click('[data-go="role"]'); await page.waitForSelector('[data-perm="STAFF|pic.atur"]');
    g.panggilan = [];
    await page.click('[data-perm="STAFF|pic.atur"]'); await page.click('#roleSave'); await page.waitForTimeout(400);
    assert.ok(g.tab('Ref_Role').find(r => r.Role === 'STAFF').Izin.includes('pic.atur'));
    assert.deepEqual(g.panggilan, ['roles.simpan'], 'simpan izin cukup satu panggilan server');
    assert.equal(await page.$eval('[data-perm="STAFF|pic.atur"]', c => c.checked), true);
    assert.equal(await page.$$eval('#roleSave', e => e.length), 0);

    // --- muat ulang halaman: cukup satu panggilan (boot), tetap masuk
    g.panggilan = [];
    await page.reload(); await page.waitForSelector('.top h1');
    assert.deepEqual(g.panggilan, ['boot'], 'membuka halaman cukup satu panggilan');
    assert.match(await teks(page, '.top h1'), /Selamat (pagi|siang|sore|malam)/);
    await page.click('[data-go="role"]'); await page.waitForSelector('[data-perm="STAFF|pic.atur"]');

    // --- log & sistem
    assert.equal(await page.$$eval('.nav [data-go="log"]', e => e.length), 0, 'Log tidak lagi di menu utama');
    await page.click('[data-go="sistem"]'); await page.waitForSelector('[data-go2="log"]'); await page.click('[data-go2="log"]'); await page.waitForSelector('#lfr');
    const aksiLog = await page.$$eval('tbody .pill', els => els.map(e => e.textContent));
    for (const a of ['UBAH_IZIN', 'HAPUS_USER', 'BUAT_USER', 'GANTI_PASSWORD', 'LOGIN']) assert.ok(aksiLog.includes(a), 'log berisi ' + a);
    await page.selectOption('#lfr', 'GAGAL'); await page.waitForTimeout(300);
    assert.deepEqual([...new Set(await page.$$eval('tbody td:last-child', els => els.map(e => e.textContent)))], ['GAGAL']);
    await page.click('[data-go="sistem"]'); await page.waitForSelector('#health');
    await page.click('#health'); await page.waitForSelector('#hres .check');
    const cekTotal = await page.$$eval('#hres .check', e => e.length);
    assert.ok(cekTotal >= 10, 'pemeriksaan F2 ikut tampil');
    assert.equal(await page.$$eval('#hres .d.y', e => e.length), cekTotal, 'semua pemeriksaan hijau');

    // --- keluar, login sebagai staff
    await page.click('#meBtn'); await page.click('.modal [data-a="1"]');
    await page.waitForSelector('#lform');
    await page.fill('#lu', '95210101'); await page.fill('#lp', pwEdo); await page.click('#lbtn');
    await page.waitForSelector('#gform');
    await page.fill('#pw1', 'Edo2026ok'); await page.fill('#pw2', 'Edo2026ok'); await page.click('#gsave');
    await page.waitForSelector('.top h1');
    assert.equal(await page.$$eval('[data-go="users"]', e => e.length), 0, 'menu Pengaturan tidak tampil untuk STAFF');
    assert.equal(await page.$$eval('[data-go="log"]', e => e.length), 0, 'STAFF tidak melihat menu Log');

    // --- staff memaksa membuka Users → ditolak server
    await page.evaluate(() => go('users'));
    await page.waitForSelector('.denied');
    assert.ok(g.tab('Log').some(l => l.Aksi === 'IZIN_DITOLAK' && l.Username === '95210101'));

    // --- sesi habis
    g.clock.tambah(7 * 3600000);
    await page.evaluate(() => go('log'));
    await page.waitForSelector('#lform .note.info');
    assert.match(await teks(page, '#lform .note'), /Sesi Anda berakhir/);

    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('UI F1: belum setup → petunjuk setup(); layar ponsel tidak melebar; tema gelap', { skip: !chromium, timeout: 60000 }, async () => {
  const kosong = createGas();
  let { browser, page, errors } = await bukaApp(kosong);
  try {
    await page.waitForSelector('.boot .note.warn');
    assert.match(await teks(page, '.boot .note.warn'), /setup/);
  } finally { await browser.close(); }

  const g = createGas(); g.ctx.setup();
  const pw = g.logs.join('\n').match(/password sementara: (\S+)/)[1];
  ({ browser, page, errors } = await bukaApp(g, { width: 400, height: 860 }));
  try {
    await page.waitForSelector('#lform');
    const lebar = () => page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(await lebar() <= 400, 'login');
    await page.fill('#lu', 'admin'); await page.fill('#lp', pw); await page.click('#lbtn');
    await page.waitForSelector('#gform'); assert.ok(await lebar() <= 400, 'ganti');
    await page.fill('#pw1', 'Rahasia2026'); await page.fill('#pw2', 'Rahasia2026'); await page.click('#gsave');
    await page.waitForSelector('.top h1');
    for (const p of ['users', 'role', 'log', 'sistem', 'beranda']) {
      await page.evaluate(x => go(x), p); await page.waitForTimeout(250);
      assert.ok(await lebar() <= 400, p);
    }
    await page.evaluate(() => go('users')); await page.waitForSelector('#addUser');
    await page.click('#addUser'); await page.waitForSelector('#sheet-root .dbody');
    assert.ok(await page.$eval('#sheet-root .dbody', e => e.scrollWidth) <= 400, 'panel user');
    await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
