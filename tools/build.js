#!/usr/bin/env node
// Menggabungkan src/server/*.js + UI (src/ui) menjadi satu dist/Code.gs, plus dist/appsscript.json.
// Pemakaian: node tools/build.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srv = path.join(root, 'src', 'server');
const ui = path.join(root, 'src', 'ui');
const shared = path.join(root, 'src', 'shared');
const sharedCode = fs.readdirSync(shared).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(shared, f), 'utf8').trim()).join('\n');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

// ---------- UI ----------
function buildUi() {
  const tpl = path.join(ui, 'index.html');
  if (!fs.existsSync(tpl)) return '<p>UI belum dibuat.</p>';
  const read = f => fs.readFileSync(path.join(ui, f), 'utf8');
  let html = read('index.html');
  for (const [ph, file] of [['/*STYLES*/', 'styles.css'], ['/*ICONS*/', 'icons.js'], ['/*APP*/', 'app.js']]) {
    if (html.includes(ph)) html = html.split(ph).join(read(file));
  }
  html = html.split('/*SHARED*/').join(sharedCode);
  html = html.split('/*F2*/').join(['data.js', 'xlsx.js', 'kontrak.js', 'upload.js', 'pengaturan.js', 'dashboard.js', 'import.js'].map(read).join('\n'));
  return html;
}

// ---------- server ----------
const files = fs.readdirSync(srv).filter(f => f.endsWith('.js')).sort();
const versi = (fs.readFileSync(path.join(srv, '00_Config.js'), 'utf8').match(/VERSI:\s*'([^']+)'/) || [])[1] || '?';
let code = files.map(f => `// ===== ${f} =====\n` + fs.readFileSync(path.join(srv, f), 'utf8').trim() + '\n' +
  (f === '00_Config.js' ? `\n// ===== src/shared (dipakai server dan browser) =====\n${sharedCode}\n` : '')).join('\n');
code += `\n// ===== UI (src/ui, disematkan saat build) =====\nvar UI_HTML = ${JSON.stringify(buildUi())};\n`;
fs.writeFileSync(path.join(dist, 'Code.gs'), code);

const manifest = {
  timeZone: 'Asia/Jakarta',
  runtimeVersion: 'V8',
  exceptionLogging: 'STACKDRIVER',
  webapp: { executeAs: 'USER_DEPLOYING', access: 'ANYONE' }
};
fs.writeFileSync(path.join(dist, 'appsscript.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`dist/Code.gs (${(code.length / 1024).toFixed(0)} KB, v${versi}) dan dist/appsscript.json ditulis`);
