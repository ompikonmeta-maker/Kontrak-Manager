/**
 * Status Kontrak Manager — F0: uji web app dari jaringan kantor.
 * Halaman ini mengecek koneksi, lalu menampilkan hasil yang bisa disalin ke chat.
 * Di F1 file ini diganti dengan aplikasi lengkap.
 */
var F0_VERSI = '1.2';

function doGet() {
  return HtmlService.createHtmlOutput(PAGE_HTML.split('{{VERSI}}').join(F0_VERSI))
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

/**
 * Jalankan dari editor bila ada izin yang belum diberikan. Memunculkan layar izin Google
 * untuk izin yang masih kurang (layar izin ber-kotak-centang tidak muncul otomatis lagi).
 */
function mintaIzin() {
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  console.log('Semua izin sudah diberikan. Muat ulang halaman web app.');
}

/** Cek apakah server bisa memanggil Web App lain (syarat script penerima di F4a). */
function cekFetch() {
  try {
    var r = UrlFetchApp.fetch('https://script.google.com/home', { muteHttpExceptions: true, followRedirects: false });
    var code = r.getResponseCode();
    return { ok: code < 500, status: code };
  } catch (err) {
    var pesan = String(err && err.message || err);
    if (/permission|external_request/i.test(pesan)) {
      return { ok: false, status: 'Izin "terhubung ke layanan eksternal" belum diberikan. Di editor: pilih fungsi mintaIzin → Run → centang semua izin (Select all) → Allow, lalu muat ulang halaman ini.' };
    }
    return { ok: false, status: pesan };
  }
}

var PAGE_HTML = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" id="gfont" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap">
<style>
  :root{--bg:#edf2f5;--surface:#fff;--surface2:#f3f7f9;--line:#d9e3e9;--fg:#0c1a24;--muted:#4d606d;--accent:#07857b;--on-accent:#fff;
    --ok:#14905a;--ok-bg:rgba(20,144,90,.11);--warn:#9c6205;--warn-bg:rgba(214,150,30,.15);--crit:#cc3b3b;--crit-bg:rgba(204,59,59,.10);color-scheme:light}
  @media (prefers-color-scheme:dark){:root{--bg:#060b14;--surface:#0d1522;--surface2:#121d2e;--line:#1b293d;--fg:#e4edf6;--muted:#93a6bb;--accent:#37e2cb;--on-accent:#022320;
    --ok:#4fd897;--ok-bg:rgba(79,216,151,.12);--warn:#f4c552;--warn-bg:rgba(244,197,82,.12);--crit:#ff7c78;--crit-bg:rgba(255,124,120,.12);color-scheme:dark}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 "Plus Jakarta Sans","Segoe UI",system-ui,sans-serif;padding:32px 16px}
  .wrap{max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
  .eyebrow{font-size:11.5px;font-weight:700;letter-spacing:.1em;color:var(--muted)}
  h1{margin:2px 0 4px;font-size:24px;font-weight:800;letter-spacing:-.02em}
  .muted{color:var(--muted)}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:4px 18px}
  .row{display:flex;gap:12px;align-items:flex-start;padding:13px 0;border-bottom:1px solid var(--line)}
  .row:last-child{border-bottom:0}
  .ic{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-weight:800;flex:none;font-size:13px}
  .ic.wait{border:2px solid var(--line);border-top-color:var(--accent);animation:sp 1s linear infinite}
  .ic.ok{background:var(--ok);color:var(--bg)} .ic.warn{background:var(--warn);color:var(--bg)} .ic.crit{background:var(--crit);color:var(--bg)}
  @keyframes sp{to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion:reduce){.ic.wait{animation:none}}
  .row b{display:block} .row small{color:var(--muted);font-size:12.5px;overflow-wrap:anywhere}
  .verdict{border-radius:14px;padding:13px 16px;font-size:13.5px}
  .verdict.ok{background:var(--ok-bg)} .verdict.warn{background:var(--warn-bg)} .verdict.crit{background:var(--crit-bg)}
  .verdict b{display:block}
  button{font:inherit;font-weight:700;border:0;border-radius:999px;padding:10px 18px;background:var(--accent);color:var(--on-accent);cursor:pointer}
  button[disabled]{opacity:.45;cursor:not-allowed}
  pre{font-variant-ligatures:none;white-space:pre-wrap;font:12px/1.55 Consolas,monospace;background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:12px;margin:0;overflow-wrap:anywhere}
</style>
<div class="wrap">
  <div><div class="eyebrow">STATUS KONTRAK MANAGER · F0 · v{{VERSI}}</div><h1>Uji koneksi dari jaringan ini</h1>
  <div class="muted">Tunggu semua baris selesai, lalu klik <b>Salin hasil</b> dan tempel di chat.</div></div>
  <div class="card" id="list"></div>
  <div class="verdict" id="verdict" hidden></div>
  <div><button id="copy" disabled>Salin hasil</button> <span class="muted" id="msg"></span></div>
  <pre id="out" hidden></pre>
</div>
<script>
(function () {   // dibungkus supaya tidak bentrok dengan variabel bawaan browser (mis. window.status)
  var BATAS_MS = 20000;
  var ITEMS = [
    ['halaman', 'Halaman terbuka dari jaringan ini'],
    ['server',  'Server menjawab (google.script.run)'],
    ['font',    'Font Google (Plus Jakarta Sans)'],
    ['fetch',   'Server bisa memanggil Web App lain (untuk script penerima)'],
    ['browser', 'Browser']
  ];
  var hasil = {}, statusCek = {};
  var list = document.getElementById('list');
  ITEMS.forEach(function (it) {
    list.insertAdjacentHTML('beforeend', '<div class="row" id="r-' + it[0] + '"><span class="ic wait"></span><div><b>' + it[1] + '</b><small>memeriksa…</small></div></div>');
  });

  function set(key, st, text) {
    if (statusCek[key]) return;                       // hasil pertama yang dipakai
    statusCek[key] = st;
    var row = document.getElementById('r-' + key), ic = row.querySelector('.ic');
    ic.className = 'ic ' + st; ic.textContent = st === 'ok' ? '✓' : st === 'warn' ? '!' : '✕';
    row.querySelector('small').textContent = text;
    hasil[key] = (st === 'ok' ? 'OK' : st.toUpperCase()) + ' — ' + text;
    if (ITEMS.every(function (it) { return statusCek[it[0]]; })) selesai();
  }

  function selesai() {
    var vals = ITEMS.map(function (it) { return statusCek[it[0]]; });
    var v = vals.indexOf('crit') >= 0 ? ['crit', 'Belum lulus', 'Ada pemeriksaan yang gagal. Salin hasil ini ke chat supaya kita bahas jalan keluarnya.']
          : vals.indexOf('warn') >= 0 ? ['warn', 'Lulus dengan catatan', 'Aplikasi bisa dipakai dari jaringan ini. Font Google diblokir, jadi aplikasi memakai font sistem.']
          : ['ok', 'Lulus', 'Semua pemeriksaan hijau. Aplikasi bisa dipakai dari jaringan ini.'];
    var el = document.getElementById('verdict');
    el.className = 'verdict ' + v[0]; el.hidden = false;
    el.innerHTML = '<b>' + v[1] + '</b>' + v[2];
    hasil._kesimpulan = v[1];
    document.getElementById('copy').disabled = false;
  }

  // 1. Halaman
  set('halaman', 'ok', 'Terbuka ' + new Date().toLocaleString('id-ID'));

  // 2. Server
  var t0 = Date.now();
  google.script.run
    .withSuccessHandler(function (r) { set('server', 'ok', (Date.now() - t0) + ' ms · waktu server ' + r.waktuServer + ' (' + r.zona + ') · berjalan sebagai ' + r.akunEksekusi); })
    .withFailureHandler(function (e) { set('server', 'crit', String(e && e.message || e)); })
    .ping();

  // 3. UrlFetch dari server
  google.script.run
    .withSuccessHandler(function (r) { set('fetch', r.ok ? 'ok' : 'crit', 'Status ' + r.status); })
    .withFailureHandler(function (e) { set('fetch', 'crit', String(e && e.message || e)); })
    .cekFetch();

  setTimeout(function () {
    set('server', 'crit', 'Tidak ada jawaban dalam ' + (BATAS_MS / 1000) + ' detik');
    set('fetch', 'crit', 'Tidak ada jawaban dalam ' + (BATAS_MS / 1000) + ' detik');
  }, BATAS_MS);

  // 4. Font: dianggap termuat hanya bila ada FontFace "Plus Jakarta Sans" berstatus loaded
  function fontTermuat() {
    var ok = false;
    if (document.fonts && document.fonts.forEach) {
      document.fonts.forEach(function (f) { if (/Plus Jakarta Sans/i.test(f.family) && f.status === 'loaded') ok = true; });
    }
    return ok;
  }
  function cekFont() {
    set('font', fontTermuat() ? 'ok' : 'warn', fontTermuat() ? 'Termuat' : 'Diblokir atau lambat. Aplikasi akan memakai Segoe UI (tetap berfungsi).');
  }
  document.getElementById('gfont').addEventListener('error', cekFont);
  if (document.fonts && document.fonts.load) {
    document.fonts.load('16px "Plus Jakarta Sans"').then(function () { if (fontTermuat()) cekFont(); }, function () {});
  }
  setTimeout(cekFont, 6000);

  // 5. Browser
  var ua = navigator.userAgent, m = ua.match(/(Edg|OPR|Chrome|Firefox|Safari)\\/([\\d.]+)/);
  set('browser', 'ok', (m ? m[1].replace('Edg', 'Edge').replace('OPR', 'Opera') + ' ' + m[2] : ua) +
      ' · transisi tema ' + (document.startViewTransition ? 'didukung' : 'tidak didukung (tema tetap bisa diganti)'));

  // Salin hasil
  document.getElementById('copy').onclick = function () {
    var txt = 'Hasil uji F0 SKM (v{{VERSI}}): ' + (hasil._kesimpulan || '-') + '\\n' +
      ITEMS.map(function (it) { return '- ' + it[1] + ': ' + (hasil[it[0]] || 'belum selesai'); }).join('\\n');
    var out = document.getElementById('out'); out.textContent = txt; out.hidden = false;
    var msg = document.getElementById('msg');
    var pilih = function () { var r = document.createRange(); r.selectNodeContents(out); getSelection().removeAllRanges(); getSelection().addRange(r); msg.textContent = 'Teks sudah dipilih, tekan Ctrl+C.'; };
    try { navigator.clipboard.writeText(txt).then(function () { msg.textContent = 'Tersalin. Tempel di chat.'; }, pilih); } catch (e) { pilih(); }
  };
})();
</script>
`;
