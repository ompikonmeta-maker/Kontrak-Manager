// F0: test fungsi server (tiruan Apps Script) dan halaman uji (Chromium headless, google.script.run tiruan).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadGs } = require('./helpers/gas');

// ---------- server ----------
test('doGet: menyajikan halaman uji dengan judul, viewport, dan versi terisi di semua tempat', () => {
  const { ctx, htmlOutput } = loadGs('f0/Code.gs');
  ctx.doGet();
  assert.equal(htmlOutput.title, 'SKM · Uji F0');
  assert.deepEqual(htmlOutput.meta[0], ['viewport', 'width=device-width, initial-scale=1']);
  assert.ok(!htmlOutput.content.includes('{{VERSI}}'), 'placeholder versi masih tersisa');
  assert.equal(htmlOutput.content.split('v' + ctx.F0_VERSI).length - 1, 2);
});

test('ping: mengembalikan waktu Asia/Jakarta, zona, dan akun yang menjalankan', () => {
  const { ctx } = loadGs('f0/Code.gs');
  const r = ctx.ping();
  assert.equal(r.ok, true);
  assert.equal(r.zona, 'Asia/Jakarta');
  assert.equal(r.akunEksekusi, 'ff.unit@gmail.com');
  assert.match(r.waktuServer, /Asia\/Jakarta/);
});

test('cekFetch: memanggil script.google.com tanpa mengikuti redirect, status < 500 dianggap OK', () => {
  const { ctx, calls } = loadGs('f0/Code.gs');
  const r = ctx.cekFetch();
  assert.deepEqual({ ok: r.ok, status: r.status }, { ok: true, status: 302 });
  assert.equal(calls[0].url, 'https://script.google.com/home');
  assert.equal(calls[0].opts.followRedirects, false);
  assert.equal(calls[0].opts.muteHttpExceptions, true);
});

test('cekFetch: error izin/kuota dilaporkan sebagai gagal, bukan exception', () => {
  const { ctx } = loadGs('f0/Code.gs', {
    UrlFetchApp: { fetch() { throw new Error('You do not have permission to call UrlFetchApp.fetch'); } },
  });
  const r = ctx.cekFetch();
  assert.equal(r.ok, false);
  assert.match(r.status, /Select all/, 'beri petunjuk cara memberi izin');
});

test('cekFetch: status 5xx dianggap gagal', () => {
  const { ctx } = loadGs('f0/Code.gs', { UrlFetchApp: { fetch: () => ({ getResponseCode: () => 503 }) } });
  assert.equal(ctx.cekFetch().ok, false);
});

test('appsscript.json: zona, V8, web app USER_DEPLOYING + ANYONE (akun Google), scope minimal', () => {
  const m = JSON.parse(fs.readFileSync(__dirname + '/../f0/appsscript.json', 'utf8'));
  assert.equal(m.timeZone, 'Asia/Jakarta');
  assert.equal(m.runtimeVersion, 'V8');
  assert.deepEqual(m.webapp, { executeAs: 'USER_DEPLOYING', access: 'ANYONE' });
  assert.deepEqual([...m.oauthScopes].sort(), [
    'https://www.googleapis.com/auth/script.external_request',
    'https://www.googleapis.com/auth/userinfo.email',
  ]);
});

// ---------- halaman uji di browser ----------
const LOCAL_TTF = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
let chromium = null;
try { ({ chromium } = require('playwright')); } catch (e) { /* tanpa browser: test halaman dilewati */ }

function pageHtml(serverMode) {
  const { ctx, htmlOutput } = loadGs('f0/Code.gs');
  ctx.doGet();
  // google.script.run tiruan: tiap pemanggilan punya handler sendiri, seperti aslinya
  const mock = `<script>
    var MODE=${JSON.stringify(serverMode)};
    function runner(){var s=null,f=null,api={
      withSuccessHandler:function(fn){s=fn;return api},withFailureHandler:function(fn){f=fn;return api},
      ping:function(){if(MODE==='diam')return; setTimeout(function(){MODE==='gagal'?f(new Error('NetworkError: Connection failure due to HTTP 0')):s({waktuServer:'19 Nov 2026 09:12:04',zona:'Asia/Jakarta',akunEksekusi:'ff.unit@gmail.com'})},30)},
      cekFetch:function(){if(MODE==='diam')return; setTimeout(function(){MODE==='gagal'?f(new Error('NetworkError')):s({ok:true,status:302})},50)}};return api}
    var google={script:{get run(){return runner()}}};
  </script>`;
  return '<!doctype html><meta charset="utf-8">' + mock + htmlOutput.content;
}

async function runPage(serverMode, { blockFont = true, clockMs = 0 } = {}) {
  const browser = await chromium.launch();
  try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (blockFont) await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  else {   // Google Fonts tiruan: CSS + file font lokal, supaya tes tidak bergantung internet
    await page.route(/fonts\.googleapis\.com/, r => r.fulfill({ contentType: 'text/css',
      body: "@font-face{font-family:'Plus Jakarta Sans';font-weight:400;src:url(https://fonts.gstatic.com/pjs.ttf) format('truetype')}" }));
    await page.route(/fonts\.gstatic\.com/, r => r.fulfill({ contentType: 'font/ttf', body: require('fs').readFileSync(LOCAL_TTF) }));
  }
  if (clockMs) await page.clock.install();
  await page.setContent(pageHtml(serverMode));
  await page.waitForTimeout(300);                       // beri waktu event nyata (mis. font gagal dimuat)
  if (clockMs) await page.clock.runFor(clockMs);        // percepat timer halaman (batas font 6 dtk, batas server 20 dtk)
  assert.equal(await page.evaluate(() => document.getElementById('copy').disabled), false, 'pemeriksaan belum selesai');
  const state = await page.evaluate(() => ({
    status: Object.fromEntries([...document.querySelectorAll('.row')].map(r => [r.id.slice(2), r.querySelector('.ic').className.replace('ic ', '')])),
    verdict: document.getElementById('verdict').querySelector('b').textContent,
  }));
  await page.evaluate(() => document.getElementById('copy').click());   // page.click butuh rAF, yang ikut dibekukan jam tiruan
  state.copied = await page.evaluate(() => document.getElementById('out').textContent);
  return { ...state, errors };
  } finally { await browser.close(); }          // selalu tutup browser, juga saat assert gagal
}

test('halaman: server menjawab, font diblokir → "Lulus dengan catatan"', { skip: !chromium }, async () => {
  const r = await runPage('ok', { clockMs: 7000 });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.status, { halaman: 'ok', server: 'ok', font: 'warn', fetch: 'ok', browser: 'ok' });
  assert.equal(r.verdict, 'Lulus dengan catatan');
  assert.match(r.copied, /^Hasil uji F0 SKM \(v1\.1\): Lulus dengan catatan\n/);
  assert.equal(r.copied.split('\n').length, 6);
});

test('halaman: semua lulus termasuk font termuat → "Lulus"', { skip: !chromium || !fs.existsSync(LOCAL_TTF) }, async () => {
  const r = await runPage('ok', { blockFont: false, clockMs: 7000 });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.status, { halaman: 'ok', server: 'ok', font: 'ok', fetch: 'ok', browser: 'ok' });
  assert.equal(r.verdict, 'Lulus');
});

test('halaman: server gagal → baris server & fetch merah, "Belum lulus"', { skip: !chromium }, async () => {
  const r = await runPage('gagal', { clockMs: 7000 });
  assert.deepEqual(r.errors, []);
  assert.equal(r.status.server, 'crit');
  assert.equal(r.status.fetch, 'crit');
  assert.equal(r.verdict, 'Belum lulus');
  assert.match(r.copied, /NetworkError/);
});

test('halaman: server tidak menjawab sama sekali → batas waktu 20 detik, tidak berputar selamanya', { skip: !chromium }, async () => {
  const r = await runPage('diam', { clockMs: 21000 });
  assert.equal(r.status.server, 'crit');
  assert.match(r.copied, /Tidak ada jawaban dalam 20 detik/);
  assert.equal(r.verdict, 'Belum lulus');
});
