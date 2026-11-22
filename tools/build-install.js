#!/usr/bin/env node
// Membuat halaman instalasi bertombol "Salin" dari file Apps Script.
// Pemakaian: node tools/build-install.js f0   → install/install-f0.html (dari f0/)
//            node tools/build-install.js f1   → install/install-f1.html (dari dist/, jalankan tools/build.js dulu)
const fs = require('fs');
const path = require('path');

const phase = process.argv[2] || 'f0';
const root = path.join(__dirname, '..');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MOCK_F0 = 'https://claude.ai/artifact/1FfXMRSWQ9Taa9f54uACLn';
const INSTALL_F0 = 'https://claude.ai/artifact/LLpsSLLDSBvuWoAjSsmk74';

const S_BARU = ['Buka project baru', 'Login dengan <b>akun Gmail khusus FF</b>, buka <b>script.google.com</b> → <b>New project</b>. Ganti nama project (kiri atas) menjadi <b>Status Kontrak Manager</b>.'];
const S_MANIFEST = ['Tampilkan file manifest', 'Klik ikon roda gigi <b>Project Settings</b> → centang <b>Show "appsscript.json" manifest file in editor</b>.'];
const S_TEMPEL = ['Tempel ke 2 file terpisah', 'Kembali ke <b>Editor</b> (ikon &lt;&gt;). Di panel kiri ada dua file. Klik <span class="mono">appsscript.json</span> → <kbd>Ctrl</kbd>+<kbd>A</kbd> → hapus → tempel hasil <b>Salin appsscript.json</b>. Lalu klik <span class="mono">Code.gs</span> → <kbd>Ctrl</kbd>+<kbd>A</kbd> → hapus → tempel hasil <b>Salin Code.gs</b>. Simpan dengan <kbd>Ctrl</kbd>+<kbd>S</kbd>. <b>Jangan digabung dalam satu file.</b>'];
const S_IZIN = 'Bila diminta: <b>Review permissions</b> → pilih akun FF → <b>Advanced</b> → <b>Go to Status Kontrak Manager (unsafe)</b>. Bila muncul daftar izin dengan kotak centang, pilih <b>Select all</b> (semua izin harus tercentang) → <b>Allow</b>. Peringatan ini normal untuk script buatan sendiri.';
const S_SETUP = ['Jalankan setup()', 'Di toolbar editor, pilih fungsi <span class="mono">setup</span> lalu klik <b>Run</b>. ' + S_IZIN];
const S_CATAT = ['Catat password admin', 'Di <b>Execution log</b> muncul baris <span class="mono">username: admin &nbsp; password sementara: xxx-xxx-xxx</span>. Catat sekarang; password ini tidak ditampilkan lagi.'];

const IZIN_UJI = 'Bila diminta: <b>Review permissions</b> → pilih akun FF → <b>Advanced</b> → <b>Go to SKM Uji Beban (unsafe)</b> → <b>Select all</b> → <b>Allow</b>. Izinnya: membuat file Sheet, memindahkan file uji ke folder & ke Sampah, dan membuat pemicu waktu untuk melanjutkan otomatis.';
const PHASES = {
  uji: {
    dir: 'uji', judul: 'Uji Beban SKM', h1: 'Uji beban: seberapa cepat Google Sheet di akun FF',
    versi: code => (code.match(/UJI_VERSI = '([^']+)'/) || [])[1],
    intro: 'Membuat database tiruan setara ±3 tahun data (18.000 kontrak, 300.000 baris Log) lalu mengukur waktu nyata: buka daftar, cari, simpan, buka arsip, pindah ke arsip, dan 15 orang bersamaan. Kerja Anda ±15 menit; sisanya menunggu. <b>Tidak menyentuh SKM_DB maupun project SKM.</b>',
    pre: `<div class="card warn"><h2>Sebelum mulai</h2><p class="muted" style="margin-top:8px">Pakai <b>akun Gmail khusus FF</b> (supaya kuota dan kecepatannya sama dengan SKM nanti), tetapi buat <b>project baru terpisah</b> bernama <b>SKM Uji Beban</b>. Data uji (±7 juta sel di 6 file) dibuat di folder Drive <span class="mono">SKM_UJI_BEBAN</span> dan dihapus di langkah terakhir. Drive akun FF butuh ruang kosong ±200 MB.</p></div>
     <div class="card"><h2>Yang diukur</h2><div class="checks">
      <div><i></i><span>Kerja harian di DB aktif kecil (3.000 kontrak) vs satu file besar tanpa arsip (18.000 kontrak)</span></div>
      <div><i></i><span>Cari nomor di indeks 18.000 kontrak, lalu buka detail kontrak di file arsip tahunnya</span></div>
      <div><i></i><span>Simpan perubahan status (kunci + kontrak + riwayat + Log 300.000 baris)</span></div>
      <div><i></i><span>Pindah 300 kontrak ke arsip, reopen kontrak dari arsip</span></div>
      <div><i></i><span>Dari browser PC kantor: waktu sampai layar, dan 15 orang membuka/menyimpan bersamaan</span></div>
      <div><i></i><span>Kecepatan tulis massal (untuk upload/import)</span></div></div></div>`,
    steps: { utama: [
      ['Buat project terpisah', 'Login dengan <b>akun Gmail khusus FF</b>, buka <b>script.google.com</b> → <b>New project</b>. Ganti nama project menjadi <b>SKM Uji Beban</b>. <b>Jangan</b> memakai project Status Kontrak Manager.'],
      S_MANIFEST, S_TEMPEL,
      ['Siapkan data (siapkanData)', 'Pilih fungsi <span class="mono">siapkanData</span> → <b>Run</b>. ' + IZIN_UJI + ' Satu kali jalan ±4,5 menit, lalu otomatis berlanjut sendiri tiap ±1 menit sampai selesai (perkiraan 10–40 menit total). Editor boleh ditutup.'],
      ['Tunggu sampai SIAP', 'Sesekali pilih fungsi <span class="mono">status</span> → <b>Run</b>. Execution log menampilkan persentase. Lanjut bila tertulis <span class="mono">Data uji SIAP (100%)</span>. Folder <span class="mono">SKM_UJI_BEBAN</span> di My Drive boleh dibuka untuk melihat filenya.'],
      ['Ukur di server (ukurServer)', 'Pilih fungsi <span class="mono">ukurServer</span> → <b>Run</b> (±3–6 menit). Bila log menulis <span class="mono">Jalankan ukurServer sekali lagi</span>, klik Run lagi sampai tertulis <span class="mono">Selesai</span>.'],
      ['Deploy sebagai Web app', '<b>Deploy › New deployment</b> → ikon roda gigi → <b>Web app</b>. Execute as: <b>Me</b> · Who has access: <b>Only myself</b> → <b>Deploy</b> → salin <b>Web app URL</b>.'],
      ['Uji dari PC kantor', 'Buka Web app URL di Chrome/Edge di PC kantor (jaringan kantor), login dengan akun FF. Klik <b>1. Uji berurutan</b>, tunggu selesai, lalu <b>2. Uji 15 orang bersamaan</b>. Klik <b>Salin laporan</b> dan tempel di chat.'],
      ['Bersihkan', 'Setelah laporan terkirim, pilih fungsi <span class="mono">bersihkan</span> → <b>Run</b>. Semua file uji pindah ke Sampah Drive. Project <b>SKM Uji Beban</b> boleh dihapus.']] },
    fileDesc: ['Pengaturan project: zona Asia/Jakarta, izin (Sheet, Drive, pemicu), Web app hanya untuk Anda.', 'Pembuat data tiruan, pengukur, dan halaman uji browser.'],
    post: `<div class="card"><h2>Kalau ada masalah</h2><div class="checks one">
      <div><i></i><span><b>status</b> tidak bertambah lebih dari 5 menit → jalankan <span class="mono">siapkanData</span> lagi; ia melanjutkan dari posisi terakhir, tidak mengulang dari awal.</span></div>
      <div><i></i><span>Error <b>"limit of 10000000 cells"</b> atau <b>kuota</b> → kirim screenshot-nya; itu juga hasil uji yang penting.</span></div>
      <div><i></i><span>Halaman Web app menulis <b>"Data belum siap"</b> atau <b>"hasil server belum ada"</b> → selesaikan langkah siapkanData / ukurServer dulu, lalu muat ulang halaman.</span></div>
      <div><i></i><span>Laporan di Execution log juga bisa dicetak ulang dengan fungsi <span class="mono">laporan</span>.</span></div></div></div>`
  },
  f0: {
    dir: 'f0', judul: 'Instalasi SKM F0', h1: 'Pasang web app uji',
    versi: code => (code.match(/F0_VERSI = '([^']+)'/) || [])[1],
    intro: 'F0 hanya memastikan aplikasi bisa dibuka dari jaringan kantor sebelum fitur dibangun. Butuh sekitar 10 menit. Setelah lulus, file ini diganti dengan aplikasi lengkap di F1 dengan cara yang sama.',
    pre: `<div class="card"><h2>Yang dicek halaman uji</h2><div class="checks">
      <div><i></i><span>Halaman Google Apps Script terbuka dari jaringan kantor</span></div>
      <div><i></i><span>Browser bisa memanggil server (google.script.run)</span></div>
      <div><i></i><span>Font Google termuat, atau aplikasi perlu memakai font sistem</span></div>
      <div><i></i><span>Server bisa memanggil Web App lain, syarat script penerima di F4</span></div></div></div>`,
    steps: { utama: [S_BARU, S_MANIFEST, S_TEMPEL,
      ['Deploy sebagai Web app', '<b>Deploy › New deployment</b> → ikon roda gigi → <b>Web app</b>. Description: <span class="mono">F0</span> · Execute as: <b>Me</b> · Who has access: <b>Anyone with Google account</b> → <b>Deploy</b>.'],
      ['Izinkan akses', 'Klik <b>Authorize access</b> → pilih akun FF → <b>Advanced</b> → <b>Go to Status Kontrak Manager (unsafe)</b>. Bila muncul daftar izin dengan kotak centang, pilih <b>Select all</b> (semua izin harus tercentang) → <b>Allow</b>. Peringatan ini normal untuk script buatan sendiri.'],
      ['Uji dari PC kantor', 'Salin <b>Web app URL</b> (berakhiran <span class="mono">/exec</span>). Buka di Chrome atau Edge di PC kantor, memakai jaringan kantor. Tunggu semua baris selesai, klik <b>Salin hasil</b>, lalu tempel di chat.']] },
    fileDesc: ['Pengaturan project: zona Asia/Jakarta, izin, dan mode Web app.', 'Kode server + halaman uji.'],
    post: `<div class="card"><h2>Bila baris "panggil Web App lain" merah karena izin</h2><p class="muted" style="margin-top:8px">Di editor pilih fungsi <span class="mono">mintaIzin</span> → <b>Run</b> → <b>Select all</b> → <b>Allow</b>, lalu muat ulang halaman uji. Bila layar izin tetap tidak muncul: buka <b>myaccount.google.com/connections</b>, pilih <b>Status Kontrak Manager</b> → hapus aksesnya, lalu ulangi.</p></div>
    <div class="card"><h2>Setelah hasil keluar</h2><p class="muted" style="margin-top:8px">Klik <b>Salin hasil</b> dan tempel di chat, apa pun hasilnya. Arti setiap hasil dan langkah berikutnya ada di tabel <a href="${MOCK_F0}" target="_blank" rel="noopener">Kalau hasilnya… di mockup F0</a>. Kalau ada langkah yang berbeda dari layar Anda, kirim screenshot-nya.</p></div>`
  },
  f1: {
    dir: 'dist', judul: 'Instalasi SKM F1', h1: 'Pasang fondasi aplikasi',
    versi: code => (code.match(/VERSI: '([^']+)'/) || [])[1],
    intro: 'F1 memasang aplikasi sungguhan: database, login, Users, Role &amp; izin, Log, dan halaman Sistem. Butuh sekitar 15 menit. Data yang dibuat di F1 tetap dipakai di fase berikutnya.',
    pre: `<div class="card warn"><h2>Sebelum mulai</h2><p class="muted" style="margin-top:8px">Pasang di <b>akun Gmail khusus FF</b>, karena akun yang menjalankan <span class="mono">setup()</span> menjadi pemilik database. Pilih <b>Akun ini belum punya project SKM</b> bila akun tersebut belum pernah dipasangi SKM (uji F0 tidak perlu diulang; hasil jaringan kantor tetap berlaku). Pilih <b>Update project yang sudah ada</b> untuk memperbarui ke versi baru.</p></div>`,
    steps: {
      'Akun ini belum punya project SKM': [S_BARU, S_MANIFEST, S_TEMPEL, S_SETUP, S_CATAT,
        ['Deploy sebagai Web app', '<b>Deploy › New deployment</b> → ikon roda gigi → <b>Web app</b>. Description: <span class="mono">F1</span> · Execute as: <b>Me</b> · Who has access: <b>Anyone with Google account</b> → <b>Deploy</b> → salin <b>Web app URL</b>.'],
        ['Login pertama', 'Buka Web app URL → masuk dengan <span class="mono">admin</span> + password sementara → buat password baru.']],
      'Update project yang sudah ada': [
        ['Buka project yang sama', 'Login dengan <b>akun Gmail khusus FF</b>, buka <b>script.google.com</b> → project <b>Status Kontrak Manager</b> yang dipakai untuk F0.'],
        ['Ganti isi 2 file terpisah', 'Di panel kiri editor, klik <span class="mono">appsscript.json</span> → <kbd>Ctrl</kbd>+<kbd>A</kbd> → hapus → tempel hasil <b>Salin appsscript.json</b>. Lalu klik <span class="mono">Code.gs</span> → <kbd>Ctrl</kbd>+<kbd>A</kbd> → hapus → tempel hasil <b>Salin Code.gs</b>. Simpan dengan <kbd>Ctrl</kbd>+<kbd>S</kbd>. <b>Jangan digabung dalam satu file.</b>'],
        S_SETUP, S_CATAT,
        ['Perbarui deployment', '<b>Deploy › Manage deployments</b> → pilih deployment F0 → ikon pensil (<b>Edit</b>) → Version: <b>New version</b> → Description <span class="mono">F1</span> → <b>Deploy</b>. URL web app tetap sama.'],
        ['Login pertama', 'Buka Web app URL → masuk dengan <span class="mono">admin</span> + password sementara → buat password baru.']]
    },
    fileDesc: ['Pengaturan project: zona Asia/Jakarta dan mode Web app. Izin dideteksi otomatis oleh Google.', 'Seluruh aplikasi (server + tampilan) dalam satu file.'],
    post: `<div class="card"><h2>Setelah login pertama</h2><div class="checks one">
      <div><i></i><span><b>Users → Tambah user</b>: buat akun pribadi Anda dengan role <b>ADMIN</b>, lalu akun anggota tim (username bebas, mis. NIK). Isi <b>Alias PIC</b> sesuai nama di kolom PIC sheet lama.</span></div>
      <div><i></i><span>Sampaikan password sementara ke tiap orang; mereka wajib menggantinya saat login pertama.</span></div>
      <div><i></i><span>Setelah akun pribadi Anda jalan, akun <span class="mono">admin</span> awal boleh dinonaktifkan.</span></div>
      <div><i></i><span><b>Sistem → Jalankan</b> pemeriksaan kesehatan. Semua harus centang hijau.</span></div></div></div>
     <div class="card"><h2>Kalau ada masalah</h2><div class="checks one">
      <div><i></i><span>Halaman menulis <b>"Database belum dibuat"</b> → jalankan <span class="mono">setup</span> di editor (langkah setup()).</span></div>
      <div><i></i><span>Halaman menulis <b>"Izin Google untuk aplikasi belum lengkap"</b> → di editor jalankan <span class="mono">mintaIzin</span> → <b>Select all</b> → <b>Allow</b>.</span></div>
      <div><i></i><span><b>Lupa password admin / semua admin terkunci</b> → di editor pilih fungsi <span class="mono">pulihkanAdmin</span> → Run. Password sementara baru muncul di Execution log.</span></div>
      <div><i></i><span>Ada error merah saat <b>Run</b> atau halaman tidak tampil → kirim screenshot-nya di chat.</span></div></div></div>`
  }
};

const P = PHASES[phase];
if (!P) { console.error('Fase tidak dikenal: ' + phase); process.exit(1); }
const src = path.join(root, P.dir);
const code = fs.readFileSync(path.join(src, 'Code.gs'), 'utf8');
const manifest = fs.readFileSync(path.join(src, 'appsscript.json'), 'utf8');
const versi = P.versi(code) || '-';
const tabs = Object.keys(P.steps);
const olHtml = (list, i) => `<ol class="steps" data-tab="${i}" ${i ? 'hidden' : ''}>${list.map(([t, d]) => `<li><div><b class="t">${t}</b><span class="muted">${d}</span></div></li>`).join('')}</ol>`;

const html = `<title>${P.judul}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* Layout: satu kolom panduan; langkah bernomor karena urutannya memang wajib; kartu file dengan tombol Salin. */
:root{--bg:#edf2f5;--surface:#fff;--surface2:#f3f7f9;--line:#d9e3e9;--fg:#0c1a24;--muted:#4d606d;--accent:#07857b;--on-accent:#fff;--accent-bg:rgba(7,133,123,.10);--violet:#5559e8;--ok:#14905a;--warn:#9c6205;--warn-bg:rgba(214,150,30,.15);
  --font:"Plus Jakarta Sans","Segoe UI",system-ui,sans-serif;--mono:"JetBrains Mono",Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#060b14;--surface:#0d1522;--surface2:#121d2e;--line:#1b293d;--fg:#e4edf6;--muted:#93a6bb;--accent:#37e2cb;--on-accent:#022320;--accent-bg:rgba(55,226,203,.12);--violet:#9ca2ff;--ok:#4fd897;--warn:#f4c552;--warn-bg:rgba(244,197,82,.12);color-scheme:dark}}
:root[data-theme="dark"]{--bg:#060b14;--surface:#0d1522;--surface2:#121d2e;--line:#1b293d;--fg:#e4edf6;--muted:#93a6bb;--accent:#37e2cb;--on-accent:#022320;--accent-bg:rgba(55,226,203,.12);--violet:#9ca2ff;--ok:#4fd897;--warn:#f4c552;--warn-bg:rgba(244,197,82,.12);color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--fg);font-family:var(--font);line-height:1.55}
.wrap{max-width:860px;margin:0 auto;padding-block:36px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:22px}
.eyebrow{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--accent)}
h1{font-size:clamp(26px,4vw,36px);margin:4px 0 6px;font-weight:800;letter-spacing:-.03em;line-height:1.1;text-wrap:balance}
h2{font-size:17px;margin:0;font-weight:800;letter-spacing:-.01em}
p{margin:0;max-width:68ch}
a{color:var(--accent)}
.muted{color:var(--muted)}
.mono{font-family:var(--mono);font-size:.9em;font-variant-ligatures:none}
kbd{font-family:var(--mono);font-size:11px;border:1px solid var(--line);border-bottom-width:2px;border-radius:6px;padding:0 6px;background:var(--surface2)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px}
.card.warn{background:var(--warn-bg);border-color:transparent}
.checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.checks.one{grid-template-columns:minmax(0,1fr)}
.checks div{display:flex;gap:10px;align-items:flex-start;font-size:13.5px}
.checks i{width:8px;height:8px;border-radius:50%;background:var(--accent);margin-top:7px;flex:none}
.seg{display:inline-flex;flex-wrap:wrap;background:var(--surface2);border:1px solid var(--line);border-radius:999px;padding:3px;gap:2px;margin-top:12px}
.seg button{font:inherit;border:0;background:none;padding:6px 14px;border-radius:999px;cursor:pointer;color:var(--muted);font-weight:700;font-size:12.5px}
.seg button.on{background:var(--surface);color:var(--fg);box-shadow:0 1px 4px rgba(0,0,0,.12)}
ol.steps{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:14px;counter-reset:s}
ol.steps[hidden]{display:none}
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
 <div><div class="eyebrow">Status Kontrak Manager · ${phase === 'uji' ? 'Uji beban' : 'Fase ' + phase.toUpperCase()} · v${esc(versi)}</div><h1>${P.h1}</h1>
  <p class="muted">${P.intro}</p></div>
 ${P.pre}
 <div class="card"><h2>Langkah</h2>${tabs.length > 1 ? `<div class="seg" role="group" aria-label="Kondisi">${tabs.map((t, i) => `<button type="button" data-seg="${i}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div>` : ''}
  ${tabs.map((t, i) => olHtml(P.steps[t], i)).join('')}</div>
 ${[['appsscript.json', manifest, P.fileDesc[0]], ['Code.gs', code, P.fileDesc[1]]].map(([n, c, d], i) => `
 <div class="card file"><div class="fh"><h2 class="mono" style="font-family:var(--mono)">${n}</h2><span class="muted" style="font-size:13px">${d}</span><span class="sp"></span><span class="ok" id="ok${i}" hidden>Tersalin</span><button class="btn" data-i="${i}">Salin ${n}</button></div>
 <pre id="f${i}">${esc(c)}</pre></div>`).join('')}
 ${P.post}
</div>
<script>
document.querySelectorAll('[data-i]').forEach(function(b){b.addEventListener('click',function(){
  var i=b.dataset.i,pre=document.getElementById('f'+i),ok=document.getElementById('ok'+i);
  var sel=function(){var r=document.createRange();r.selectNodeContents(pre);getSelection().removeAllRanges();getSelection().addRange(r);ok.textContent='Teks dipilih, tekan Ctrl+C';ok.hidden=false;};
  try{navigator.clipboard.writeText(pre.textContent).then(function(){ok.textContent='Tersalin';ok.hidden=false;setTimeout(function(){ok.hidden=true},2500);},sel);}catch(e){sel();}
});});
document.querySelectorAll('[data-seg]').forEach(function(b){b.addEventListener('click',function(){
  document.querySelectorAll('[data-seg]').forEach(function(x){x.classList.toggle('on',x===b);});
  document.querySelectorAll('ol[data-tab]').forEach(function(o){o.hidden=o.dataset.tab!==b.dataset.seg;});
});});
</script>
`;
fs.mkdirSync(path.join(root, 'install'), { recursive: true });
const outFile = path.join(root, 'install', `install-${phase}.html`);
fs.writeFileSync(outFile, html);
console.log('ditulis:', path.relative(root, outFile));
