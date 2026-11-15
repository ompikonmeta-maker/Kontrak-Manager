/**
 * Status Kontrak Manager — F0: uji web app dari jaringan kantor.
 * Halaman ini hanya mengecek 4 hal, lalu menampilkan hasil yang bisa disalin.
 * Di F1 file ini diganti dengan aplikasi lengkap.
 */

function doGet() {
  return HtmlService.createHtmlOutput(PAGE_HTML)
    .setTitle('SKM · Uji F0')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Dipanggil dari browser lewat google.script.run. */
function ping() {
  return {
    ok: true,
    waktuServer: Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd MMM yyyy HH:mm:ss'),
    zona: Session.getScriptTimeZone(),
    akunEksekusi: Session.getEffectiveUser().getEmail()
  };
}

/** Cek apakah server bisa memanggil Web App lain (dipakai untuk script penerima di F4). */
function cekFetch() {
  try {
    var r = UrlFetchApp.fetch('https://script.google.com/home', { muteHttpExceptions: true, followRedirects: false });
    return { ok: r.getResponseCode() < 500, status: r.getResponseCode() };
  } catch (err) {
    return { ok: false, status: String(err) };
  }
}

var PAGE_HTML = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap">
<style>
  :root{--bg:#edf2f5;--surface:#fff;--line:#d9e3e9;--fg:#0c1a24;--muted:#4d606d;--accent:#07857b;--ok:#14905a;--warn:#9c6205;--crit:#cc3b3b;color-scheme:light}
  @media (prefers-color-scheme:dark){:root{--bg:#060b14;--surface:#0d1522;--line:#1b293d;--fg:#e4edf6;--muted:#93a6bb;--accent:#37e2cb;--ok:#4fd897;--warn:#f4c552;--crit:#ff7c78;color-scheme:dark}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 "Plus Jakarta Sans","Segoe UI",system-ui,sans-serif;padding:32px 16px}
  .wrap{max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
  h1{margin:0;font-size:24px;font-weight:800;letter-spacing:-.02em}
  .muted{color:var(--muted)}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:6px 18px}
  .row{display:flex;gap:12px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--line)}
  .row:last-child{border-bottom:0}
  .ic{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-weight:800;flex:none;background:var(--line);color:var(--muted)}
  .ic.ok{background:var(--ok);color:var(--bg)} .ic.warn{background:var(--warn);color:var(--bg)} .ic.crit{background:var(--crit);color:var(--bg)}
  .row b{display:block} .row small{color:var(--muted);font-size:12.5px;overflow-wrap:anywhere}
  button{font:inherit;font-weight:700;border:0;border-radius:999px;padding:10px 18px;background:var(--accent);color:var(--bg);cursor:pointer}
  pre{font-variant-ligatures:none;white-space:pre-wrap;font:12px/1.5 Consolas,monospace;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px;margin:0}
</style>
<div class="wrap">
  <div><div class="muted" style="font-size:12px;font-weight:700;letter-spacing:.1em">STATUS KONTRAK MANAGER · F0</div><h1>Uji koneksi dari jaringan ini</h1>
  <div class="muted">Tunggu semua baris selesai, lalu klik <b>Salin hasil</b> dan tempel di chat.</div></div>
  <div class="card" id="list"></div>
  <div><button id="copy">Salin hasil</button> <span class="muted" id="msg"></span></div>
  <pre id="out" hidden></pre>
</div>
<script>
  var hasil = {};
  var ITEMS = [
    ['halaman', 'Halaman terbuka dari jaringan ini'],
    ['server',  'Server menjawab (google.script.run)'],
    ['font',    'Font Google (Plus Jakarta Sans)'],
    ['fetch',   'Server bisa memanggil Web App lain (untuk script penerima)'],
    ['browser', 'Browser']
  ];
  var list = document.getElementById('list');
  ITEMS.forEach(function (it) {
    list.insertAdjacentHTML('beforeend', '<div class="row" id="r-' + it[0] + '"><span class="ic">…</span><div><b>' + it[1] + '</b><small>memeriksa…</small></div></div>');
  });
  function set(key, status, text) {
    var row = document.getElementById('r-' + key), ic = row.querySelector('.ic');
    ic.className = 'ic ' + status; ic.textContent = status === 'ok' ? '✓' : status === 'warn' ? '!' : '✕';
    row.querySelector('small').textContent = text; hasil[key] = (status === 'ok' ? 'OK' : status.toUpperCase()) + ' — ' + text;
  }
  set('halaman', 'ok', 'Terbuka ' + new Date().toLocaleString('id-ID'));

  var t0 = Date.now();
  google.script.run
    .withSuccessHandler(function (r) { set('server', 'ok', (Date.now() - t0) + ' ms · waktu server ' + r.waktuServer + ' (' + r.zona + ') · berjalan sebagai ' + r.akunEksekusi); })
    .withFailureHandler(function (e) { set('server', 'crit', String(e && e.message || e)); })
    .ping();

  google.script.run
    .withSuccessHandler(function (r) { set('fetch', r.ok ? 'ok' : 'crit', 'Status ' + r.status); })
    .withFailureHandler(function (e) { set('fetch', 'crit', String(e && e.message || e)); })
    .cekFetch();

  var fontDone = false;
  function cekFont() {
    if (fontDone) return; fontDone = true;
    var ok = document.fonts && document.fonts.check('16px "Plus Jakarta Sans"');
    set('font', ok ? 'ok' : 'warn', ok ? 'Termuat' : 'Diblokir atau lambat. Aplikasi akan memakai Segoe UI (tetap berfungsi).');
  }
  if (document.fonts) { document.fonts.load('16px "Plus Jakarta Sans"').then(cekFont, cekFont); }
  setTimeout(cekFont, 5000);

  var ua = navigator.userAgent, m = ua.match(/(Edg|Chrome|Firefox|Safari)\\/([\\d.]+)/);
  set('browser', 'ok', (m ? m[1].replace('Edg', 'Edge') + ' ' + m[2] : ua) + ' · transisi tema ' + (document.startViewTransition ? 'didukung' : 'tidak didukung (tema tetap bisa diganti)'));

  document.getElementById('copy').onclick = function () {
    var txt = 'Hasil uji F0 SKM\\n' + ITEMS.map(function (it) { return '- ' + it[1] + ': ' + (hasil[it[0]] || 'belum selesai'); }).join('\\n');
    var out = document.getElementById('out'); out.textContent = txt; out.hidden = false;
    var done = function () { document.getElementById('msg').textContent = 'Tersalin. Tempel di chat.'; };
    var fallback = function () { var r = document.createRange(); r.selectNodeContents(out); getSelection().removeAllRanges(); getSelection().addRange(r); document.getElementById('msg').textContent = 'Teks sudah dipilih, tekan Ctrl+C.'; };
    try { navigator.clipboard.writeText(txt).then(done, fallback); } catch (e) { fallback(); }
  };
</script>
`;
