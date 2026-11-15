#!/usr/bin/env node
// Membuat halaman instalasi bertombol "Salin" dari file Apps Script.
// Pemakaian: node tools/build-install.js f0   → install/install-f0.html
const fs = require('fs');
const path = require('path');

const phase = process.argv[2] || 'f0';
const root = path.join(__dirname, '..');
const src = path.join(root, phase);
const code = fs.readFileSync(path.join(src, 'Code.gs'), 'utf8');
const manifest = fs.readFileSync(path.join(src, 'appsscript.json'), 'utf8');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const STEPS = [
  ['Buka project baru', 'Login dengan <b>akun Gmail khusus FF</b>, buka <b>script.google.com</b> → <b>New project</b>. Ganti nama project (kiri atas) menjadi <b>Status Kontrak Manager</b>.'],
  ['Tampilkan file manifest', 'Klik ikon roda gigi <b>Project Settings</b> → centang <b>Show "appsscript.json" manifest file in editor</b>.'],
  ['Tempel 2 file', 'Kembali ke <b>Editor</b> (ikon &lt;&gt;). Buka <span class="mono">appsscript.json</span>, hapus semua isinya, tempel dari tombol <b>Salin</b> di bawah. Lakukan hal yang sama untuk <span class="mono">Code.gs</span>. Tekan <kbd>Ctrl</kbd> + <kbd>S</kbd>.'],
  ['Deploy sebagai Web app', '<b>Deploy › New deployment</b> → ikon roda gigi → <b>Web app</b>. Description: <span class="mono">F0</span> · Execute as: <b>Me</b> · Who has access: <b>Anyone with Google account</b> → <b>Deploy</b>.'],
  ['Izinkan akses', 'Klik <b>Authorize access</b> → pilih akun FF → <b>Advanced</b> → <b>Go to Status Kontrak Manager (unsafe)</b> → <b>Allow</b>. Peringatan ini normal untuk script buatan sendiri.'],
  ['Uji dari PC kantor', 'Salin <b>Web app URL</b> (berakhiran <span class="mono">/exec</span>). Buka di Chrome atau Edge di PC kantor, memakai jaringan kantor. Tunggu semua baris selesai, klik <b>Salin hasil</b>, lalu tempel di chat.'],
];

const html = `<title>Instalasi SKM F0</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* Layout: satu kolom panduan; langkah bernomor karena urutannya memang wajib; kartu file dengan tombol Salin. */
:root{--bg:#edf2f5;--surface:#fff;--surface2:#f3f7f9;--line:#d9e3e9;--fg:#0c1a24;--muted:#4d606d;--accent:#07857b;--on-accent:#fff;--accent-bg:rgba(7,133,123,.10);--violet:#5559e8;--ok:#14905a;
  --font:"Plus Jakarta Sans","Segoe UI",system-ui,sans-serif;--mono:"JetBrains Mono",Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#060b14;--surface:#0d1522;--surface2:#121d2e;--line:#1b293d;--fg:#e4edf6;--muted:#93a6bb;--accent:#37e2cb;--on-accent:#022320;--accent-bg:rgba(55,226,203,.12);--violet:#9ca2ff;--ok:#4fd897;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#060b14;--surface:#0d1522;--surface2:#121d2e;--line:#1b293d;--fg:#e4edf6;--muted:#93a6bb;--accent:#37e2cb;--on-accent:#022320;--accent-bg:rgba(55,226,203,.12);--violet:#9ca2ff;--ok:#4fd897;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--fg);font-family:var(--font);line-height:1.55}
.wrap{max-width:860px;margin:0 auto;padding-block:36px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:22px}
.eyebrow{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--accent)}
h1{font-size:clamp(26px,4vw,36px);margin:4px 0 6px;font-weight:800;letter-spacing:-.03em;line-height:1.1;text-wrap:balance}
h2{font-size:17px;margin:0;font-weight:800;letter-spacing:-.01em}
p{margin:0;max-width:68ch}
.muted{color:var(--muted)}
.mono{font-family:var(--mono);font-size:.9em}
kbd{font-family:var(--mono);font-size:11px;border:1px solid var(--line);border-bottom-width:2px;border-radius:6px;padding:0 6px;background:var(--surface2)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px}
.checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.checks div{display:flex;gap:10px;align-items:flex-start;font-size:13.5px}
.checks i{width:8px;height:8px;border-radius:50%;background:var(--accent);margin-top:7px;flex:none}
ol.steps{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:14px;counter-reset:s}
ol.steps li{display:grid;grid-template-columns:34px minmax(0,1fr);gap:12px;counter-increment:s}
ol.steps li::before{content:counter(s);width:30px;height:30px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:grid;place-items:center;font-weight:800;font-size:13px}
ol.steps b.t{display:block;margin-bottom:2px}
.file{display:flex;flex-direction:column;gap:10px}
.fh{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.fh .sp{flex:1}
.btn{font:inherit;font-weight:700;font-size:13px;border:0;border-radius:999px;padding:8px 16px;background:var(--accent);color:var(--on-accent);cursor:pointer}
.btn:active{transform:scale(.97)}
pre{font-variant-ligatures:none;margin:0;max-height:260px;overflow:auto;background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:14px;font:12px/1.55 var(--mono);color:var(--muted)}
.ok{color:var(--ok);font-size:12.5px;font-weight:700}
@media (max-width:620px){.checks{grid-template-columns:minmax(0,1fr)}}
</style>
<div class="wrap">
 <div><div class="eyebrow">Status Kontrak Manager · Fase F0</div><h1>Pasang web app uji</h1>
  <p class="muted">F0 hanya memastikan aplikasi bisa dibuka dari jaringan kantor sebelum fitur dibangun. Butuh sekitar 10 menit. Setelah lulus, file ini diganti dengan aplikasi lengkap di F1 dengan cara yang sama.</p></div>
 <div class="card"><h2>Yang dicek halaman uji</h2><div class="checks">
  <div><i></i><span>Halaman Google Apps Script terbuka dari jaringan kantor</span></div>
  <div><i></i><span>Browser bisa memanggil server (google.script.run)</span></div>
  <div><i></i><span>Font Google termuat, atau aplikasi perlu memakai font sistem</span></div>
  <div><i></i><span>Server bisa memanggil Web App lain, syarat script penerima di F4</span></div></div></div>
 <div class="card"><h2>Langkah</h2><ol class="steps">${STEPS.map(([t, d]) => `<li><div><b class="t">${t}</b><span class="muted">${d}</span></div></li>`).join('')}</ol></div>
 ${[['appsscript.json', manifest, 'Pengaturan project: zona Asia/Jakarta, izin, dan mode Web app.'], ['Code.gs', code, 'Kode server + halaman uji.']].map(([n, c, d], i) => `
 <div class="card file"><div class="fh"><h2 class="mono" style="font-family:var(--mono)">${n}</h2><span class="muted" style="font-size:13px">${d}</span><span class="sp"></span><span class="ok" id="ok${i}" hidden>Tersalin</span><button class="btn" data-i="${i}">Salin ${n}</button></div>
 <pre id="f${i}">${esc(c)}</pre></div>`).join('')}
 <p class="muted" style="font-size:13px">Kalau ada langkah yang berbeda dari layar Anda, kirim screenshot-nya di chat.</p>
</div>
<script>
document.querySelectorAll('[data-i]').forEach(function(b){b.addEventListener('click',function(){
  var i=b.dataset.i,pre=document.getElementById('f'+i),ok=document.getElementById('ok'+i);
  var sel=function(){var r=document.createRange();r.selectNodeContents(pre);getSelection().removeAllRanges();getSelection().addRange(r);ok.textContent='Teks dipilih, tekan Ctrl+C';ok.hidden=false;};
  try{navigator.clipboard.writeText(pre.textContent).then(function(){ok.textContent='Tersalin';ok.hidden=false;setTimeout(function(){ok.hidden=true},2500);},sel);}catch(e){sel();}
});});
</script>
`;
fs.mkdirSync(path.join(root, 'install'), { recursive: true });
const outFile = path.join(root, 'install', `install-${phase}.html`);
fs.writeFileSync(outFile, html);
console.log('ditulis:', path.relative(root, outFile));
