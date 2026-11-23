/* ================= Status Kontrak Manager · UI (F1 fondasi + F2 kontrak) ================= */
'use strict';

const S = {
  token: null, me: null, app: null, katalog: [], theme: 'system', page: 'beranda',
  users: null, roles: null, uf: '', uq: '', logF: { user: '', aksi: '', hasil: '', bulan: '', q: '' }, roleDraft: null,
  form: null, formOrig: null, formErr: '', permAnim: false, loginErr: null, gantiErr: '', pw1: '', pw2: '', pwLama: ''
};
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }
};
S.token = store.get('skm-token');
S.theme = store.get('skm-theme') || 'system';
function applyTheme() { const r = document.documentElement; S.theme === 'system' ? r.removeAttribute('data-theme') : r.setAttribute('data-theme', S.theme); }
applyTheme();

const can = p => !!(S.me && S.me.izin && S.me.izin.indexOf(p) >= 0);
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);

/* ---------------- panggilan server ---------------- */
function call(aksi, payload) {
  return new Promise((resolve, reject) => {
    if (!window.google || !google.script || !google.script.run) {
      reject({ kode: 'TANPA_SERVER', pesan: 'Halaman ini harus dibuka lewat URL web app.' }); return;
    }
    google.script.run
      .withSuccessHandler(r => {
        if (r && r.ok) { resolve(r.data); return; }
        r = r || { kode: 'ERROR', pesan: 'Tidak ada jawaban dari server.' };
        if (r.kode === 'SESI_HABIS' && S.me) sesiHabis(r.pesan);
        else if (r.kode === 'WAJIB_GANTI' && S.me) { S.me.wajibGanti = true; go('ganti'); }
        reject(r);
      })
      .withFailureHandler(e => reject({ kode: 'JARINGAN', pesan: 'Tidak bisa menghubungi server: ' + (e && e.message || e) }))
      .api(S.token, aksi, payload || {});
  });
}
/** Tombol sibuk: label diganti "Menyimpan…" + putaran kecil, supaya jelas permintaan sedang diproses. */
function busy(btn, on, teks) {
  if (!btn) return;
  if (on && !btn.classList.contains('busy')) { btn.dataset.lbl = btn.innerHTML; btn.innerHTML = `<span class="bspin" aria-hidden="true"></span>${teks || 'Menyimpan…'}`; }
  if (!on && btn.classList.contains('busy') && btn.dataset.lbl !== undefined) btn.innerHTML = btn.dataset.lbl;
  btn.classList.toggle('busy', on); btn.disabled = on;
}
function gagal(e) { if (e && e.kode !== 'SESI_HABIS' && e.kode !== 'WAJIB_GANTI') toast(e.pesan || String(e), true); }
function sesiHabis(pesan) {
  resetData();
  S.me = null; S.token = null; store.set('skm-token', null); closeSheet(true); closeMenu();
  document.getElementById('overlay-root').innerHTML = '';
  S.loginErr = { msg: esc(pesan || 'Sesi Anda berakhir. Silakan masuk lagi.'), kind: 'info' };
  go('login');
}

function keluar() {
  if (D.antre.length && !confirm(D.antre.length + ' perubahan belum tersimpan akan hilang. Tetap keluar?')) return;
  call('logout').catch(() => {}); resetData(); S.me = null; S.token = null; store.set('skm-token', null); S.loginErr = null; go('login');
}
function resetData() {
  clearTimeout(tarikT); closeDrawer(true); closeKForm();
  Object.assign(D, { siap: false, memuat: null, seq: 0, base: {}, view: {}, antre: [], kirim: false, flash: {} });
  S.sel = new Set(); S.riw = {}; S.lama = null; S.arsQ = ''; S.arsHasil = null;
}
/** Setelah masuk: muat data aktif sekali dengan layar progres (bila boleh melihat kontrak). */
function mulaiData() { if (S.me && !S.me.wajibGanti && can('kontrak.lihat') && !D.siap && !D.memuat) muatData(true).then(() => segarkanTampilan()).catch(e => { if (e.kode !== 'SESI_HABIS') toast(e.pesan || String(e), true); }); }

/* ---------------- boot & navigasi ---------------- */
async function boot() {
  try {
    const b = await call('boot', { data: true });   // satu panggilan: status + profil (bila token masih sah) + katalog + data aktif
    S.app = b.app; S.katalog = b.katalog;
    if (!b.siap) { renderBelumSetup(); return; }
    S.me = b.user || null;
    if (!S.me && S.token) { S.token = null; store.set('skm-token', null); }
    if (b.data) muatData(false, b.data);
    go(S.me ? (S.me.wajibGanti ? 'ganti' : 'beranda') : 'login');
    mulaiData();
  } catch (e) { renderFatal(e.pesan || String(e)); }
}
function go(page) { S.page = page; closeMenu(); closeDrawer(true); render(); window.scrollTo(0, 0); }
/** Profil terbaru dari jawaban server. Bila izin user.kelola hilang, pindah ke beranda. */
function pakaiMe(me) {
  if (!me) return;
  S.me = me;
  const P = PAGES[S.page];
  if (P && P.izin && !can(P.izin)) { go('beranda'); return; }
  // perbarui menu samping & nama di header saja; isi halaman tidak dimuat ulang
  const side = $('#side'), meBtn = $('#meBtn');
  if (!side || !meBtn) return;
  const t = document.createElement('div'); t.innerHTML = shell('', '');
  side.replaceWith(t.querySelector('#side')); meBtn.replaceWith(t.querySelector('#meBtn'));
  bindShell();
}

const PAGES = {
  beranda: { title: () => 'Selamat datang, ' + S.me.nama, crumb: () => 'Ringkasan hari ini · ' + new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
  kontrak: { title: () => 'Kontrak', crumb: () => D.siap ? semuaKontrak().filter(b => !KD.bool(b.k.Arsip)).length.toLocaleString('id-ID') + ' kontrak aktif · kontrak lama di arsip ikut dicari' : 'Memuat data aktif…', izin: 'kontrak.lihat' },
  upload: { title: () => 'Upload Excel', crumb: 'Kontrak · tambah banyak kontrak sekaligus', izin: 'kontrak.daftar', nav: 'kontrak' },
  pengaturan: { title: () => 'Pengaturan', crumb: 'Tahap, kendala, Nilai Push, referensi, config', izin: 'pengaturan.kelola' },
  users: { title: () => 'Users', crumb: 'Akun tim FF', izin: 'user.kelola' },
  role: { title: () => 'Role & izin', crumb: 'Hak akses berupa data, bisa diubah tanpa ubah kode', izin: 'user.kelola' },
  sistem: { title: () => 'Sistem', crumb: 'Database, skema, dan kesehatan aplikasi', izin: 'user.kelola' },
  log: { title: () => 'Log audit', crumb: 'Catatan teknis semua aksi (hanya ditambah). Riwayat per kontrak ada di tab Riwayat kontrak.', izin: 'log.semua', nav: 'sistem' }
};
const SOON = [['dashboard', 'Dashboard', 'dash', 'F3'], ['perhatian', 'Perlu Perhatian', 'warn', 'F3'], ['antrian', 'Antrian', 'inbox', 'F4b'], ['gsheet', 'Google Sheet', 'sync', 'F4a']];

function render() {
  const root = document.getElementById('root');
  if (S.page === 'login' || !S.me) { root.innerHTML = viewLogin(); bindLogin(); return; }
  if (S.page === 'ganti' || S.me.wajibGanti) { S.page = 'ganti'; root.innerHTML = viewGanti(); bindGanti(); return; }
  const P = PAGES[S.page] || PAGES.beranda;
  root.innerHTML = shell(P.title(), typeof P.crumb === 'function' ? P.crumb() : P.crumb);
  bindShell();
  loadPage(S.page);
}
async function loadPage(page) {
  const c = document.getElementById('content');
  const show = html => {
    if (S.page !== page || !c.isConnected) return;
    c.innerHTML = html; [...c.children].forEach((el, i) => el.style.setProperty('--i', i));
    if (!REDUCED) { c.classList.add('enter'); setTimeout(() => c.classList.remove('enter'), 1400); }
  };
  try {
    if (page === 'beranda') { show(viewHome()); return; }
    if (page === 'kontrak') { show(viewKontrak()); bindKontrak(); if (S.kf.q) cariArsip(); return; }
    if (page === 'upload') { show(viewUpload()); bindUpload(); return; }
    if (page === 'pengaturan') { show(viewPengaturan()); bindPengaturan(); return; }
    // halaman admin tampil langsung dari data terakhir, lalu diperbarui di latar (C26)
    const latar = async (key, aksi, payload, view, bind, sebelum) => {
      const ada = S[key];
      if (ada) { if (sebelum) sebelum(); show(view()); bind(); } else c.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat…</div>';
      const r = await call(aksi, payload);
      if (S.page !== page) return;
      const beda = JSON.stringify(r) !== JSON.stringify(ada);
      S[key] = r;
      if (!ada) { if (sebelum) sebelum(); show(view()); bind(); return; }
      const sibuk = document.querySelector('#sheet-root .drawer, #overlay-root .scrim, .menu') || (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName));
      if (beda && !sibuk) { c.innerHTML = view(); [...c.children].forEach((el, i) => el.style.setProperty('--i', i)); bind(); }
    };
    if (page === 'users') await latar('users', 'users.list', {}, viewUsers, bindUsers);
    else if (page === 'role') await latar('roles', 'roles.list', {}, viewRole, bindRole, () => { S.roleDraft = null; });
    else if (page === 'sistem') await latar('sistem', 'sistem.info', {}, viewSistem, bindSistem);
    else if (page === 'log') { c.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat…</div>'; S.log = await call('log.list', S.logF); show(viewLog()); bindLog(); }
  } catch (e) {
    if (e.kode === 'IZIN_DITOLAK') show(viewDenied(e.pesan));
    else if (e.kode !== 'SESI_HABIS' && e.kode !== 'WAJIB_GANTI') show(`<div class="note crit">${ic('warn', 's')}<span class="tx">${esc(e.pesan || String(e))}</span></div>`);
  }
}

/* ---------------- layar khusus ---------------- */
function renderBelumSetup() {
  document.getElementById('root').innerHTML = `<div class="boot"><div class="card" style="max-width:520px;text-align:left;display:flex;flex-direction:column;gap:12px">
    <div class="brand" style="padding:0">${LOGO}<div><b>${esc(S.app ? S.app.nama : 'Status Kontrak Manager')}</b><span>Belum siap dipakai</span></div></div>
    <div class="note warn">${ic('db', 's')}<span class="tx">Database belum dibuat. Buka editor Apps Script, pilih fungsi <span class="mono">setup</span>, lalu klik <b>Run</b>. Setelah selesai, muat ulang halaman ini.</span></div></div></div>`;
}
function renderFatal(msg) {
  document.getElementById('root').innerHTML = `<div class="boot"><div class="card" style="max-width:520px;text-align:left"><h2>Aplikasi tidak bisa dimuat</h2><div class="note crit">${ic('warn', 's')}<span class="tx">${esc(msg)}</span></div><button class="btn" onclick="location.reload()" style="margin-top:12px">Coba lagi</button></div></div>`;
}

/* ---------------- shell ---------------- */
const avatarOf = u => `<span class="av">${esc(String(u.nama || u.username || '?')[0].toUpperCase())}</span>`;
function shell(title, crumb) {
  const navOn = (PAGES[S.page] || {}).nav || S.page;
  const a = (h, l, i) => `<a href="#" data-go="${h}" class="${navOn === h ? 'on' : ''}">${ic(i)}<span>${l}</span></a>`;
  const soon = ([h, l, i, f]) => `<a class="soon" aria-disabled="true" title="Dibangun di ${f}">${ic(i)}<span>${l}</span><span class="cnt">${f}</span></a>`;
  return `<div class="app">
   <aside class="side" id="side">
    <div class="brand">${LOGO}<div><b>Status Kontrak<br>Manager</b><span>Unit Fulfillment</span></div></div>
    <nav class="nav">${a('beranda', 'Beranda', 'home')}${can('kontrak.lihat') ? a('kontrak', 'Kontrak', 'doc') : ''}
     ${can('user.kelola') || can('pengaturan.kelola') ? `<div class="eyebrow" style="padding:16px 12px 6px;font-size:10.5px">Pengaturan</div>${can('pengaturan.kelola') ? a('pengaturan', 'Tahap & aturan', 'gear') : ''}${can('user.kelola') ? a('users', 'Users', 'users') + a('role', 'Role & izin', 'shield') + a('sistem', 'Sistem', 'db') : ''}` : ''}
     <div class="eyebrow" style="padding:16px 12px 6px;font-size:10.5px">Fase berikutnya</div>${SOON.map(soon).join('')}</nav>
    <div class="side-foot"><span class="live"><span class="pulse"></span>Versi ${esc(S.app.versi)} · ${esc(S.app.fase)}</span><span>Skema database v${S.app.skema}</span><span class="dim">Menu redup dibangun di fase berikutnya</span></div>
   </aside>
   <div class="main">
    <header class="top">
     <button class="iconbtn burger" id="burger" aria-label="Menu">${ic('menu')}</button>
     <div style="min-width:0"><h1>${esc(title)}</h1><div class="crumb">${esc(crumb)}</div></div>
     <div class="sp"></div>
     <button class="syncchip" id="syncChip" hidden aria-live="polite" title="Cara data tersimpan"></button>
     <button class="iconbtn" id="themeBtn" aria-label="Ganti tema" title="Ganti tema">${ic({ system: 'auto', light: 'sun', dark: 'moon' }[S.theme])}</button>
     <button class="me" id="meBtn">${avatarOf(S.me)}<span class="nm">${esc(S.me.nama)} · ${esc(S.me.role)}</span></button>
    </header>
    <main class="content" id="content"></main>
   </div></div>`;
}
function bindShell() {
  $('#burger').onclick = e => { e.stopPropagation(); $('#side').classList.toggle('open'); };
  $('#themeBtn').onclick = e => cycleTheme(e);
  $('#syncChip').onclick = infoSync; syncChip();
  $$('[data-go]').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.go); });
  $('#meBtn').onclick = () => modal(esc(S.me.nama) + ' · ' + esc(S.me.role),
    `<dl class="kv"><dt>Username</dt><dd class="mono">${esc(S.me.username)}</dd><dt>Alias PIC</dt><dd>${esc(S.me.alias) || '—'}</dd><dt>Sesi</dt><dd>berakhir setelah ${S.app.sesiJam} jam tanpa aktivitas</dd></dl>`,
    [{ l: 'Ganti password', fn: () => { S.pw1 = S.pw2 = S.pwLama = ''; S.gantiErr = ''; go('ganti'); } },
     { l: 'Keluar', pri: true, fn: () => keluar() }]);
}
function cycleTheme(e) {
  const order = ['system', 'light', 'dark'], next = order[(order.indexOf(S.theme) + 1) % 3];
  const apply = () => { S.theme = next; applyTheme(); store.set('skm-theme', next); const b = $('#themeBtn'); if (b) b.innerHTML = ic({ system: 'auto', light: 'sun', dark: 'moon' }[next]); };
  if (!document.startViewTransition || REDUCED) { apply(); return; }
  const x = e.clientX, y = e.clientY, r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.startViewTransition(apply).ready.then(() => document.documentElement.animate(
    { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
    { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
}

/* ---------------- login & ganti password ---------------- */
function orbit() {
  const ts = ['Kompulir', 'Drafting', 'Review', 'Sirkulir', 'BAST Done', 'Takeout'], cx = 310, cy = 300, rx = 250, ry = 96;
  const ep = `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0`;
  return `<svg class="orb" viewBox="0 0 620 600" aria-hidden="true"><defs><radialGradient id="pl" cx=".35" cy=".3"><stop offset="0" stop-color="var(--accent-hi)"/><stop offset=".6" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--violet)"/></radialGradient></defs><g transform="rotate(-12 ${cx} ${cy})"><ellipse class="ring" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/><ellipse class="ring d" cx="${cx}" cy="${cy}" rx="${rx * .66}" ry="${ry * .62}"/><circle cx="${cx}" cy="${cy}" r="52" fill="url(#pl)" style="filter:drop-shadow(0 0 40px var(--glow))"/>${ts.map((t, i) => { const a = Math.PI * (1 + i * 1.9 / 5), x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a); return `<circle class="nd ${i === 5 ? 'ok' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7"/><text x="${x.toFixed(1)}" y="${(y + (Math.sin(a) > 0.05 ? 26 : -16)).toFixed(1)}" text-anchor="middle">${t}</text>`; }).join('')}${REDUCED ? '' : `<circle class="sat" r="4.5"><animateMotion dur="16s" repeatCount="indefinite" path="${ep}"/></circle>`}</g></svg>`;
}
const art = () => `<div class="login-art"><div class="brand" style="padding:0;position:relative">${LOGO}<div><b>${esc(S.app.nama)}</b><span>Unit Fulfillment</span></div></div>${orbit()}<h2>Status BAST di satu tempat. <em>Semua sheet unit ikut seragam.</em></h2></div>`;

function viewLogin() {
  const e = S.loginErr;
  return `<div class="login">${art()}<div class="login-form"><form class="box" id="lform" novalidate>
   <div><div class="eyebrow">Masuk</div><h3>Selamat datang</h3></div>
   ${e ? `<div class="note ${e.kind}">${ic(e.kind === 'crit' ? 'lock' : e.kind === 'info' ? 'person' : 'warn', 's')}<span class="tx">${e.msg}</span></div>` : ''}
   <label class="of"><span>Username</span><input class="inp" id="lu" value="${esc(e && e.u || '')}" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
   <label class="of"><span>Password</span><input class="inp" id="lp" type="password" autocomplete="current-password"><small>Lupa password? Minta admin FF untuk mereset.</small></label>
   <button class="btn pri" type="submit" id="lbtn" style="justify-content:center;padding:12px">Masuk</button>
   <div class="row" style="justify-content:space-between"><span class="dim" style="font-size:12px">v${esc(S.app.versi)}</span><button type="button" class="iconbtn" id="lgTheme" aria-label="Ganti tema">${ic({ system: 'auto', light: 'sun', dark: 'moon' }[S.theme])}</button></div>
  </form></div></div>`;
}
function bindLogin() {
  setTimeout(() => (($('#lu').value ? $('#lp') : $('#lu')) || {}).focus && ($('#lu').value ? $('#lp') : $('#lu')).focus(), 50);
  $('#lgTheme').onclick = e => { cycleTheme(e); setTimeout(() => { const b = $('#lgTheme'); if (b) b.innerHTML = ic({ system: 'auto', light: 'sun', dark: 'moon' }[S.theme]); }, 30); };
  $('#lform').onsubmit = async ev => {
    ev.preventDefault();
    const u = $('#lu').value.trim(), p = $('#lp').value, btn = $('#lbtn');
    if (!u || !p) { S.loginErr = { msg: 'Isi username dan password.', kind: 'warn', u }; render(); return; }
    busy(btn, true, 'Masuk…');
    try {
      const r = await call('login', { username: u, password: p });
      S.token = r.token; store.set('skm-token', r.token); S.me = r.user; S.app = r.app; S.katalog = r.katalog; S.loginErr = null;
      S.pw1 = S.pw2 = S.pwLama = ''; S.gantiErr = '';
      go(r.user.wajibGanti ? 'ganti' : 'beranda');
      mulaiData();
    } catch (e) {
      S.loginErr = { msg: esc(e.pesan || String(e)), kind: e.kode === 'TERKUNCI' || e.kode === 'AKUN_NONAKTIF' ? 'crit' : 'warn', u };
      render();
    }
  };
}

function pwRules() {
  const a = S.pw1, b = S.pw2, min = S.app.passwordMin || 8;
  const r = [[a.length >= min, 'Minimal ' + min + ' karakter'], [/[A-Za-z]/.test(a) && /\d/.test(a), 'Berisi huruf dan angka'], [!!a && a === b, 'Kedua isian sama']];
  if (!S.me.wajibGanti) r.splice(2, 0, [!!a && a !== S.pwLama, 'Berbeda dari password lama']);
  return r;
}
function rulesHtml() { return pwRules().map(([y, t]) => `<span class="${y ? 'ok' : ''}"><i>${y ? '✓' : ''}</i>${t}</span>`).join(''); }
function viewGanti() {
  const wajib = S.me.wajibGanti, ok = pwRules().every(x => x[0]);
  return `<div class="login">${art()}<div class="login-form"><form class="box" id="gform" novalidate>
   <div><div class="eyebrow">${wajib ? 'Login pertama' : 'Ganti password'}</div><h3>Buat password baru</h3></div>
   ${wajib ? `<div class="note info">${ic('key', 's')}<span class="tx">Halo <b>${esc(S.me.nama)}</b>, password sementara harus diganti sebelum masuk ke aplikasi.</span></div>` : ''}
   ${S.gantiErr ? `<div class="note crit">${ic('warn', 's')}<span class="tx">${esc(S.gantiErr)}</span></div>` : ''}
   ${wajib ? '' : `<label class="of"><span>Password lama</span><input class="inp" type="password" id="pw0" value="${esc(S.pwLama)}" autocomplete="current-password"></label>`}
   <label class="of"><span>Password baru</span><input class="inp" type="password" id="pw1" value="${esc(S.pw1)}" autocomplete="new-password"></label>
   <label class="of"><span>Ulangi password baru</span><input class="inp" type="password" id="pw2" value="${esc(S.pw2)}" autocomplete="new-password"></label>
   <div class="rules" id="rules">${rulesHtml()}</div>
   <button class="btn pri" type="submit" id="gsave" style="justify-content:center;padding:12px" ${ok ? '' : 'disabled'}>${wajib ? 'Simpan &amp; masuk' : 'Simpan password'}</button>
   ${wajib ? `<button type="button" class="btn ghost sm" id="gout" style="align-self:flex-start">Keluar</button>` : `<button type="button" class="btn ghost sm" id="gback" style="align-self:flex-start">Batal</button>`}
  </form></div></div>`;
}
function bindGanti() {
  const upd = () => {
    S.pw1 = $('#pw1').value; S.pw2 = $('#pw2').value; if ($('#pw0')) S.pwLama = $('#pw0').value;
    $('#rules').innerHTML = rulesHtml(); $('#gsave').disabled = !pwRules().every(x => x[0]);
  };
  ['pw0', 'pw1', 'pw2'].forEach(id => { const el = document.getElementById(id); if (el) el.oninput = upd; });
  setTimeout(() => ($('#pw0') || $('#pw1')).focus(), 50);
  if ($('#gback')) $('#gback').onclick = () => go('beranda');
  if ($('#gout')) $('#gout').onclick = () => keluar();
  $('#gform').onsubmit = async ev => {
    ev.preventDefault();
    if (!pwRules().every(x => x[0])) return;
    const btn = $('#gsave'); busy(btn, true);
    try {
      const r = await call('gantiPassword', { lama: S.pwLama, baru: S.pw1 });
      S.me = Object.assign(S.me, r.user); S.pw1 = S.pw2 = S.pwLama = ''; S.gantiErr = '';
      go('beranda'); toast('Password diganti. Password lama tidak berlaku lagi.'); mulaiData();
    } catch (e) { S.gantiErr = e.pesan || String(e); render(); }
  };
}

/* ---------------- beranda ---------------- */
function viewHome() {
  const next = [['F3', 'Import data lama, Dashboard, Perlu Perhatian, Ctrl+K'], ['F4a', 'Script penerima & update ke sheet unit'], ['F4b', 'Jejak sel, notifikasi, Antrian, sinkron otomatis'], ['F5', 'Export & backup']];
  if (!can('kontrak.lihat')) return `<div class="card"><h2>Belum ada menu untuk role Anda</h2><p class="muted">Hubungi admin bila Anda perlu melihat kontrak.</p></div>`;
  if (!D.siap) return '<div class="loading"><div class="spinner"></div>Memuat data aktif…</div>';
  const all = semuaKontrak().filter(b => !KD.bool(b.k.Arsip)), open = all.filter(b => b.k.StatusKontrak === 'OPEN'), saya = S.me.alias ? open.filter(b => b.k.PIC === S.me.alias) : [];
  const q = id => QUICK.find(x => x[0] === id)[2], kpi = [['OPEN', open.length, 'kontrak OPEN', '', ''], ['kend', open.filter(q('kend')).length, 'ada kendala aktif', 'crit', 'kend'], ['lewat', open.filter(q('lewat')).length, 'lewat batas aging', 'warn', 'lewat'],
    ['nopic', open.filter(q('nopic')).length, 'tanpa PIC', 'warn', 'nopic'], ['kurang', open.filter(q('kurang')).length, 'data belum lengkap', 'warn', 'kurang']];
  const nilai = open.reduce((a, b) => a + (Number(b.k.NilaiKontrak) || 0), 0);
  return `<div class="card hero" style="padding:24px"><div class="row" style="position:relative;align-items:flex-start"><div style="flex:1 1 320px"><div class="eyebrow">Versi ${esc(S.app.versi)} · fase ${esc(S.app.fase)}</div><h2 style="font-size:22px;margin:6px 0">${saya.length ? `Anda PIC untuk ${saya.length} kontrak OPEN` : 'Kontrak siap diproses'}</h2>
    <p class="muted" style="margin:0;max-width:60ch">Nilai kontrak OPEN ${rp(nilai)}. Dashboard lengkap dan daftar Perlu Perhatian hadir di F3.</p></div>
    <div class="row">${saya.length ? `<button class="btn" id="hSaya">${ic('person', 's')}Kontrak saya</button>` : ''}<button class="btn pri" data-go2="kontrak">${ic('doc', 's')}Buka kontrak</button></div></div></div>
   <div class="utiles">${kpi.map(([id, n, l, cls, quick]) => `<button class="utile ${cls}" data-hq="${quick}"><b class="tnum">${n.toLocaleString('id-ID')}</b><span>${l}</span></button>`).join('')}</div>
   <div class="card"><h2>Berikutnya</h2>${next.map(([f, t]) => `<div class="check"><span class="d n">${f}</span><span>${t}</span></div>`).join('')}</div>`;
}
document.addEventListener('click', e => {
  const h = e.target.closest('[data-hq]'); if (h && S.page === 'beranda') { Object.assign(S.kf, { st: 'OPEN', quick: h.dataset.hq, q: '', pic: '' }); go('kontrak'); return; }
  if (e.target.closest('#hSaya')) { Object.assign(S.kf, { st: 'OPEN', quick: '', q: '', pic: S.me.alias }); go('kontrak'); }
});
document.addEventListener('click', e => { const b = e.target.closest('[data-go2]'); if (b) go(b.dataset.go2); });

/* ---------------- users ---------------- */
const ROLE_META = { ADMIN: ['shield', 'Akses penuh'], STAFF: ['person', 'Isi & kelola'], VIEWER: ['eye', 'Hanya melihat'] };
const roleMeta = r => ROLE_META[r] || ['users', 'Role khusus'];
const initials = n => String(n || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
const RING = { AKTIF: 'on', WAJIB_GANTI: 'pw', TERKUNCI: 'lock', NONAKTIF: 'off' };
const stLabel = u => ({ AKTIF: 'Aktif', WAJIB_GANTI: 'Wajib ganti password', TERKUNCI: 'Terkunci s/d ' + u.terkunciSampai, NONAKTIF: 'Nonaktif' })[u.status];
const ava = (u, size) => `<span class="ava ${RING[u.status] || 'on'}" ${size ? `style="--s:${size}px"` : ''} title="${esc(stLabel(u))}">${esc(initials(u.nama || u.username))}</span>`;
const rbadge = r => `<span class="rbadge ${esc(r)}">${ic(roleMeta(r)[0])}${esc(r)}</span>`;
function stPill(u) { const k = RING[u.status]; return `<span class="pill ${{ on: 'p-ok', pw: 'p-warn', lock: 'p-crit', off: 'p-dim' }[k]}">${k === 'lock' ? ic('lock', 's') : '<span class="dot"></span>'}${esc(stLabel(u))}</span>`; }
const UF = [['', 'Semua', u => true], ['ADMIN', 'Admin', u => u.role === 'ADMIN' && u.aktif], ['STAFF', 'Staff', u => u.role === 'STAFF' && u.aktif], ['VIEWER', 'Viewer', u => u.role === 'VIEWER' && u.aktif],
  ['pw', 'Wajib ganti password', u => u.status === 'WAJIB_GANTI'], ['lock', 'Terkunci', u => u.status === 'TERKUNCI'], ['off', 'Nonaktif', u => !u.aktif]];
function viewUsers() {
  const list = S.users.users, f = UF.find(x => x[0] === S.uf) || UF[0], q = S.uq.toLowerCase();
  const rows = list.filter(f[2]).filter(u => !q || (u.username + ' ' + u.nama + ' ' + u.alias).toLowerCase().includes(q));
  return `<div class="card" style="display:flex;flex-direction:column;gap:14px">
   <div class="row"><div class="search">${ic('search', 's')}<input id="uq" placeholder="Cari username, nama, alias PIC…" aria-label="Cari user" value="${esc(S.uq)}"></div><span class="sp"></span><button class="btn pri" id="addUser">${ic('add', 's')}Tambah user</button></div>
   <div class="row">${UF.map(([k, l, t]) => `<button class="chipf ${S.uf === k ? 'on' : ''}" data-uf="${k}">${l} <b>${list.filter(t).length}</b></button>`).join('')}</div>
   <div class="tbl-wrap"><table class="t"><thead><tr><th>User</th><th>Alias PIC</th><th>Role</th><th>Status</th><th>Login terakhir</th><th style="width:48px"></th></tr></thead><tbody>
   ${rows.map(u => `<tr class="click" data-row="${esc(u.username)}"><td><div class="row" style="flex-wrap:nowrap;gap:12px">${ava(u)}<div style="min-width:0"><b>${esc(u.nama)}</b>${u.username === S.me.username ? ' <span class="pill p-acc" style="font-size:10.5px;padding:0 7px">Anda</span>' : ''}<div class="mono dim" style="font-size:11.5px">${esc(u.username)}</div></div></div></td>
    <td>${u.alias ? `<span class="pill p-dim">${esc(u.alias)}</span>` : '<span class="dim">—</span>'}</td><td>${rbadge(u.role)}</td><td>${stPill(u)}</td>
    <td class="tnum muted">${esc(u.loginTerakhir ? u.loginTerakhir.slice(0, 16) : '—')}</td><td><button class="iconbtn" data-kebab="${esc(u.username)}" aria-label="Aksi untuk ${esc(u.nama)}">${ic('more')}</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:28px">Tidak ada user yang cocok.</td></tr>'}
   </tbody></table></div>
   <div class="muted" style="font-size:12px">Username bebas (NIK, nama, atau apa pun) dan menjadi ID tetap. Cincin avatar: hijau aktif, kuning wajib ganti password, merah terkunci, abu-abu nonaktif.</div></div>`;
}
function rerenderUsers() { const c = document.getElementById('content'); if (!c || S.page !== 'users') return; c.innerHTML = viewUsers(); bindUsers(); }
async function reloadUsers() { try { S.users = await call('users.list'); rerenderUsers(); } catch (e) { gagal(e); } }
/** Pakai daftar user + profil yang dibawa jawaban server (tanpa panggilan tambahan). */
function pakaiDaftarUser(r) { if (r && r.daftar) { S.users = r.daftar; rerenderUsers(); } if (r && r.me) pakaiMe(r.me); }
function bindUsers() {
  const q = $('#uq');
  q.oninput = () => { S.uq = q.value; const pos = q.selectionStart; rerenderUsers(); const n = $('#uq'); n.focus(); n.setSelectionRange(pos, pos); };
  $$('[data-uf]').forEach(b => b.onclick = () => { S.uf = b.dataset.uf; rerenderUsers(); });
  $('#addUser').onclick = () => openUserSheet(null);
  const find = un => S.users.users.find(u => u.username === un);
  $$('[data-kebab]').forEach(b => b.onclick = e => { e.stopPropagation(); openMenu(b, find(b.dataset.kebab)); });
  $$('tr[data-row]').forEach(tr => tr.onclick = e => { if (e.target.closest('[data-kebab]')) return; openUserSheet(find(tr.dataset.row)); });
}
function showTempPw(u, pw, judul) {
  modal(judul, `<div>Berikan password sementara ini ke <b>${esc(u.nama)}</b> (<span class="mono">${esc(u.username)}</span>). Password <b>tidak ditampilkan lagi</b> setelah jendela ini ditutup, dan wajib diganti saat login.</div>
   <div class="secret"><span id="tpw" style="flex:1">${esc(pw)}</span><button class="btn sm ton" id="cpw">${ic('copy', 's')}Salin</button></div>
   <div class="muted" style="font-size:12px">Yang disimpan di database hanya hash + salt, bukan passwordnya.</div>`, [{ l: 'Selesai', pri: true }]);
  setTimeout(() => { const b = document.getElementById('cpw'); if (b) b.onclick = () => copyText(pw, 'Password sementara disalin.', document.getElementById('tpw')); }, 60);
}
function copyText(t, msg, el) {
  const pilih = () => { if (!el) { toast('Salin manual: ' + t); return; } const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Teks sudah dipilih, tekan Ctrl+C.'); };
  try { navigator.clipboard.writeText(t).then(() => toast(msg), pilih); } catch (e) { pilih(); }
}

/* menu ⋮ */
function closeMenu() { const m = document.querySelector('.menu'); if (m) m.remove(); }
function openMenu(btn, u) {
  closeMenu();
  const r = btn.getBoundingClientRect(), m = document.createElement('div'); m.className = 'menu'; m.setAttribute('role', 'menu');
  const items = [['edit', 'Ubah data & role', '', () => openUserSheet(u)], ['key', 'Reset password', 'Password sementara baru, wajib diganti', () => openUserSheet(u, { reset: true })]];
  if (u.status === 'TERKUNCI') items.push(['lock', 'Buka kunci', 'Terkunci sampai ' + u.terkunciSampai, () => simple('users.bukaKunci', { username: u.username }, `Kunci akun ${u.username} dibuka.`)]);
  items.push(['block', u.aktif ? 'Nonaktifkan' : 'Aktifkan lagi', u.aktif ? 'Tidak bisa login; riwayat tetap ada' : '', () => simple('users.aktif', { username: u.username, aktif: !u.aktif }, u.aktif ? `${u.nama} dinonaktifkan. Riwayatnya tetap tersimpan.` : `${u.nama} bisa login lagi.`)]);
  m.innerHTML = items.map((it, i) => `<button data-mi="${i}" role="menuitem">${ic(it[0])}<span>${it[1]}${it[2] ? `<small>${esc(it[2])}</small>` : ''}</span></button>`).join('') +
    `<hr><button class="danger" data-mi="del" role="menuitem" ${u.bisaDihapus ? '' : 'disabled'}>${ic('trash')}<span>Hapus user<small>${u.bisaDihapus ? 'Belum pernah beraktivitas' : 'Sudah punya riwayat. Nonaktifkan saja.'}</small></span></button>`;
  document.getElementById('overlay-root').appendChild(m);
  m.style.top = Math.max(12, Math.min(r.bottom + 6, innerHeight - m.offsetHeight - 12)) + 'px';
  m.style.left = Math.max(12, r.right - m.offsetWidth) + 'px';
  m.addEventListener('click', e => { e.stopPropagation(); const b = e.target.closest('[data-mi]'); if (!b || b.disabled) return; closeMenu(); b.dataset.mi === 'del' ? confirmDelete(u) : items[+b.dataset.mi][3](); });
  const first = m.querySelector('button'); if (first) first.focus();
}
async function simple(aksi, payload, okMsg) {
  try { const r = await call(aksi, payload); toast(okMsg); pakaiDaftarUser(r); } catch (e) { modalGagal(e); }
}
function modalGagal(e) {
  if (e.kode === 'SESI_HABIS' || e.kode === 'WAJIB_GANTI') return;
  modal(e.kode === 'ADMIN_TERAKHIR' || e.kode === 'IZIN_DITOLAK' || e.kode === 'PUNYA_RIWAYAT' ? 'Ditolak server' : 'Gagal', `<div class="note crit">${ic('shield', 's')}<span class="tx">${esc(e.pesan || String(e))}</span></div>`, [{ l: 'Mengerti', pri: true }]);
}
function confirmDelete(u) {
  modal('Hapus user?', `<div class="row" style="flex-wrap:nowrap;gap:14px">${ava(u, 44)}<div><b>${esc(u.nama)}</b><div class="mono dim">${esc(u.username)}</div></div></div><div class="muted">User ini belum pernah login atau melakukan aksi apa pun, jadi aman dihapus. Pembuatan dan penghapusannya tetap tercatat di Log.</div>`,
    [{ l: 'Batal' }, { l: 'Hapus', pri: true, fn: () => { closeSheet(true); simple('users.hapus', { username: u.username }, `User ${u.username} dihapus.`); } }]);
}

/* panel tambah/ubah user */
function openUserSheet(u, opt) {
  opt = opt || {};
  S.form = u ? { username: u.username, nama: u.nama, alias: u.alias, role: u.role, aktif: u.aktif, pwOn: !!opt.reset, pwMode: 'acak', pwTyped: '', pwShow: false, version: u.version }
             : { username: '', nama: '', alias: '', role: 'STAFF', aktif: true, pwOn: true, pwMode: 'acak', pwTyped: '', pwShow: false };
  S.formOrig = u || null; S.formErr = ''; renderSheet(true);
  setTimeout(() => { const el = document.querySelector(opt.reset ? '#sheet-root [data-pwmode="acak"]' : u ? '#fn' : '#fu'); if (el) el.focus(); }, 80);
}
function closeSheet(instant) {
  const r = document.getElementById('sheet-root'); if (!r.firstChild) return;
  if (instant || REDUCED) { r.innerHTML = ''; return; }
  r.firstElementChild.classList.add('closing'); setTimeout(() => { r.innerHTML = ''; }, 300);
}
function idcardHtml() {
  const F = S.form, fake = { nama: F.nama || 'Nama user', username: F.username, status: !F.aktif ? 'NONAKTIF' : (F.pwOn || (S.formOrig && S.formOrig.status === 'WAJIB_GANTI')) ? 'WAJIB_GANTI' : (S.formOrig ? S.formOrig.status : 'AKTIF'), terkunciSampai: S.formOrig ? S.formOrig.terkunciSampai : '' };
  return `${ava(fake, 64)}<div class="who"><b>${esc(F.nama || 'Nama user')}</b><div class="mono" style="font-size:12.5px">${esc(F.username || 'username')}</div>
   <div class="row" style="margin-top:8px;gap:6px">${rbadge(F.role)}${F.alias ? `<span class="pill p-dim">PIC: ${esc(F.alias)}</span>` : ''}${stPill(fake)}</div></div>`;
}
function rolePeta() { const m = {}; (S.users.roles || []).forEach(r => { m[r.role] = r.izin; }); return m; }
function permsHtml() { const R = rolePeta()[S.form.role] || []; return (S.users.katalog || []).map(([p, d], i) => `<span class="${R.indexOf(p) >= 0 ? '' : 'no'}" style="--i:${i}" title="${p}">${esc(d)}</span>`).join(''); }
const pwScore = p => { let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return Math.min(4, s); };
const SCOL = ['var(--crit)', 'var(--crit)', 'var(--warn)', 'var(--ok)', 'var(--ok)'], SLBL = ['lemah', 'lemah', 'cukup', 'kuat', 'sangat kuat'];
function renderSheet(opening) {
  const F = S.form, O = S.formOrig, isNew = !O, root = document.getElementById('sheet-root');
  const sc = root.querySelector('.dbody') ? root.querySelector('.dbody').scrollTop : 0, peta = rolePeta(), sco = pwScore(F.pwTyped);
  root.innerHTML = `<div><div class="dscrim" id="sscrim" style="${opening ? '' : 'animation:none'}"></div>
  <aside class="drawer ussheet" role="dialog" aria-modal="true" aria-label="${isNew ? 'Tambah user' : 'Ubah user'}" style="width:min(580px,100vw);${opening ? '' : 'animation:none'}">
   <div class="dhead" style="padding-bottom:14px"><div class="dtop"><button class="iconbtn" id="sclose" aria-label="Tutup">${ic('x')}</button><div><div class="eyebrow">${isNew ? 'User baru' : 'Ubah user'}</div><div style="font-weight:800;font-size:18px">${isNew ? 'Tambah anggota tim' : esc(O.nama)}</div></div></div></div>
   <div class="dbody">
    <div class="idcard" id="idcard">${idcardHtml()}</div>
    <div class="sect"><div class="eyebrow">Identitas</div>
     <label class="of"><span>Username</span><input class="inp mono" id="fu" value="${esc(F.username)}" ${isNew ? '' : 'disabled'} autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="mis. 95210101 atau dina.lestari"><small>${isNew ? 'NIK, nama, atau apa pun · 3–32 karakter: huruf, angka, titik, garis bawah, strip. Menjadi ID tetap.' : 'ID tetap, tidak bisa diganti.'}</small></label>
     <div class="grid g2" style="gap:14px"><label class="of"><span>Nama lengkap</span><input class="inp" id="fn" value="${esc(F.nama)}" autocomplete="off" maxlength="80"></label>
      <label class="of"><span>Alias PIC</span><input class="inp" id="fa" value="${esc(F.alias)}" autocomplete="off" maxlength="40" placeholder="mis. Dina"><small>Nama di kolom PIC sheet lama. Kosongkan bila bukan PIC.</small></label></div></div>
    <div class="sect"><div class="eyebrow">Role & akses</div>
     <div class="rcards" role="radiogroup" aria-label="Role">${Object.keys(peta).map(r => { const m = roleMeta(r); return `<button type="button" class="rcard ${F.role === r ? 'on' : ''}" data-role="${esc(r)}" role="radio" aria-checked="${F.role === r}">${ic(m[0])}<b>${esc(r)}</b><small>${m[1]} · ${peta[r].length} izin</small></button>`; }).join('')}</div>
     <div><div class="muted" style="font-size:12px;margin-bottom:8px">User ini bisa:</div><div class="perms ${S.permAnim ? 'anim' : ''}" id="perms">${permsHtml()}</div></div></div>
    <div class="sect"><div class="eyebrow">Password</div>
     ${isNew ? '' : `<div class="swrow"><div style="flex:1"><b>Reset password</b><small>Biarkan mati bila password tidak diganti</small></div><button type="button" class="toggle ${F.pwOn ? 'on' : ''}" id="pwOn" aria-label="Reset password" aria-pressed="${F.pwOn}"></button></div>`}
     ${F.pwOn ? `<div class="seg" role="group" aria-label="Cara membuat password"><button type="button" data-pwmode="acak" class="${F.pwMode === 'acak' ? 'on' : ''}">Buat acak</button><button type="button" data-pwmode="ketik" class="${F.pwMode === 'ketik' ? 'on' : ''}">Ketik sendiri</button></div>
      ${F.pwMode === 'acak' ? `<div class="note ok">${ic('key', 's')}<span class="tx">Password acak dibuat server saat disimpan, lalu <b>ditampilkan sekali</b> untuk Anda sampaikan ke user.</span></div>`
      : `<div><label class="of"><span>Password</span><div style="position:relative"><input class="inp mono" id="fpw" type="${F.pwShow ? 'text' : 'password'}" value="${esc(F.pwTyped)}" autocomplete="new-password" style="width:100%;padding:12px 44px 10px 12px"><button type="button" class="iconbtn" id="pwEye" aria-label="${F.pwShow ? 'Sembunyikan' : 'Tampilkan'} password" style="position:absolute;right:2px;top:2px">${ic('eye', 's')}</button></div></label>
        <div class="strength"><i id="pwBar" style="width:${sco * 25}%;background:${SCOL[sco]}"></i></div>
        <div class="muted" style="font-size:12px;margin-top:6px" id="pwHint">Minimal ${S.app.passwordMin} karakter, berisi huruf dan angka.</div></div>`}
      <div class="note info">${ic('key', 's')}<span class="tx">User <b>wajib mengganti</b> password ini saat login berikutnya${isNew ? '' : ', dan sesi aktifnya diakhiri'}.</span></div>` : ''}
    </div>
    ${isNew ? '' : `<div class="sect"><div class="eyebrow">Status</div><div class="swrow"><div style="flex:1"><b>Akun aktif</b><small>User bisa login selama akun aktif</small></div><button type="button" class="toggle ${F.aktif ? 'on' : ''}" id="stOn" aria-label="Akun aktif" aria-pressed="${F.aktif}"></button></div>
      <div class="danger-zone"><div style="flex:1;min-width:200px"><b style="color:var(--crit)">Hapus user</b><div class="muted" style="font-size:12px">${O.bisaDihapus ? 'Tersedia karena user ini belum pernah login atau melakukan aksi.' : 'Tidak tersedia: user ini sudah punya riwayat. Nonaktifkan saja supaya Log tetap utuh.'}</div></div><button type="button" class="btn sm danger" id="delUser" ${O.bisaDihapus ? '' : 'disabled'}>${ic('trash', 's')}Hapus</button></div></div>`}
    <div id="ferr">${S.formErr ? `<div class="note crit">${ic('warn', 's')}<span class="tx">${esc(S.formErr)}</span></div>` : ''}</div>
   </div>
   <div class="sfoot"><button class="btn" id="scancel">Batal</button><button class="btn pri" id="ssave">${ic('check', 's')}${isNew ? 'Buat user' : 'Simpan'}</button></div>
  </aside></div>`;
  root.querySelector('.dbody').scrollTop = sc;
  bindSheet();
}
function bindSheet() {
  const q = s => document.querySelector('#sheet-root ' + s), F = S.form, refresh = () => { q('#idcard').innerHTML = idcardHtml(); };
  q('#sclose').onclick = q('#scancel').onclick = () => closeSheet();
  q('#sscrim').onclick = () => goyang(document.querySelector('#sheet-root .drawer'));
  q('#fu').oninput = e => { F.username = e.target.value.trim().toLowerCase(); refresh(); };
  q('#fn').oninput = e => { F.nama = e.target.value; refresh(); };
  q('#fa').oninput = e => { F.alias = e.target.value.trim(); refresh(); };
  document.querySelectorAll('#sheet-root [data-role]').forEach(b => b.onclick = () => { F.role = b.dataset.role; S.permAnim = true; renderSheet(false); S.permAnim = false; });
  if (q('#pwOn')) q('#pwOn').onclick = () => { F.pwOn = !F.pwOn; renderSheet(false); };
  if (q('#stOn')) q('#stOn').onclick = () => { F.aktif = !F.aktif; renderSheet(false); };
  document.querySelectorAll('#sheet-root [data-pwmode]').forEach(b => b.onclick = () => { F.pwMode = b.dataset.pwmode; renderSheet(false); if (F.pwMode === 'ketik') setTimeout(() => q('#fpw') && q('#fpw').focus(), 30); });
  if (q('#pwEye')) q('#pwEye').onclick = () => { F.pwShow = !F.pwShow; renderSheet(false); setTimeout(() => { const i = q('#fpw'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 20); };
  if (q('#fpw')) q('#fpw').oninput = e => {
    F.pwTyped = e.target.value; const s = pwScore(F.pwTyped), ok = F.pwTyped.length >= S.app.passwordMin && /[A-Za-z]/.test(F.pwTyped) && /\d/.test(F.pwTyped);
    q('#pwBar').style.width = s * 25 + '%'; q('#pwBar').style.background = SCOL[s];
    q('#pwHint').textContent = ok ? 'Memenuhi syarat · kekuatan: ' + SLBL[s] : `Minimal ${S.app.passwordMin} karakter, berisi huruf dan angka.`; q('#pwHint').style.color = ok ? 'var(--ok)' : '';
  };
  if (q('#delUser')) q('#delUser').onclick = () => confirmDelete(S.formOrig);
  q('#ssave').onclick = saveUser;
}
async function saveUser() {
  const F = S.form, O = S.formOrig, btn = document.querySelector('#sheet-root #ssave');
  const err = m => { S.formErr = m; renderSheet(false); const b = document.querySelector('#sheet-root .dbody'); b.scrollTop = 1e5; };
  if (!F.nama.trim()) return err('Nama lengkap wajib diisi.');
  const payload = { baru: !O, username: F.username, nama: F.nama.trim(), alias: F.alias, role: F.role, aktif: F.aktif, version: F.version,
                    password: F.pwOn ? { mode: F.pwMode, nilai: F.pwMode === 'ketik' ? F.pwTyped : '' } : null };
  busy(btn, true);
  try {
    const r = await call('users.simpan', payload);
    closeSheet(); pakaiDaftarUser(r);
    const target = { username: r.username, nama: F.nama.trim() };
    if (r.passwordAcak) setTimeout(() => showTempPw(target, r.passwordAcak, O ? 'Password direset' : 'User dibuat'), 320);
    else toast(!O ? `User ${r.username} dibuat. Wajib ganti password saat login pertama.` : F.pwOn ? 'Disimpan. Password baru wajib diganti saat login.' : 'Perubahan disimpan dan dicatat di Log.');
  } catch (e) {
    if (e.kode === 'SESI_HABIS' || e.kode === 'WAJIB_GANTI') return;
    if (e.kode === 'KONFLIK') { await reloadUsers(); }
    busy(btn, false); err(e.pesan || String(e));
  }
}

/* ---------------- role & izin ---------------- */
function viewRole() {
  const base = {}; S.roles.roles.forEach(r => { base[r.role] = r.izin; });
  const R = S.roleDraft || base, roles = Object.keys(base), dirty = !!S.roleDraft;
  return `<div class="card"><h2>Matriks izin<small>${roles.length} role · ${S.roles.katalog.length} izin</small><span class="sp"></span><button class="btn sm" id="addRole">${ic('add', 's')}Role baru</button></h2>
   <div class="tbl-wrap"><table class="t matrix"><thead><tr><th>Izin</th>${S.roles.roles.map(r => `<th>${esc(r.role)}<div class="dim" style="font-size:10.5px;text-transform:none;letter-spacing:0">${r.jumlahUser} user aktif</div></th>`).join('')}</tr></thead><tbody>
   ${S.roles.katalog.map(([p, d]) => `<tr><td><span class="mono" style="font-size:12px">${p}</span><div class="muted" style="font-size:12px">${esc(d)}</div></td>${roles.map(r => { const on = R[r].indexOf(p) >= 0, orig = base[r].indexOf(p) >= 0; return `<td style="${dirty && on !== orig ? 'background:var(--accent-bg)' : ''}"><input type="checkbox" class="chk" data-perm="${esc(r)}|${p}" aria-label="${esc(r)} ${p}" ${on ? 'checked' : ''}></td>`; }).join('')}</tr>`).join('')}
   </tbody></table></div>
   ${dirty ? `<div class="bulk" style="margin-top:14px"><b>Ada perubahan belum disimpan</b><span class="sp"></span><button class="btn sm" id="roleCancel">Batal</button><button class="btn sm pri" id="roleSave">Simpan izin</button></div>` : ''}
  </div>
  <div class="note info">${ic('shield', 's')}<span class="tx">Setiap permintaan dicek izinnya di server, bukan hanya disembunyikan di layar. Permintaan tanpa izin ditolak dan tercatat sebagai <b>IZIN_DITOLAK</b> di Log. Perubahan izin berlaku pada permintaan berikutnya setiap user, tanpa login ulang.</span></div>`;
}
function rerenderRole() { const c = document.getElementById('content'); c.innerHTML = viewRole(); bindRole(); }
function bindRole() {
  $$('[data-perm]').forEach(c => c.onchange = () => {
    const [role, p] = c.dataset.perm.split('|');
    if (!S.roleDraft) { S.roleDraft = {}; S.roles.roles.forEach(r => { S.roleDraft[r.role] = r.izin.slice(); }); }
    const l = S.roleDraft[role]; if (c.checked) l.push(p); else l.splice(l.indexOf(p), 1);
    rerenderRole();
  });
  if ($('#roleCancel')) $('#roleCancel').onclick = () => { S.roleDraft = null; rerenderRole(); };
  if ($('#roleSave')) $('#roleSave').onclick = async () => {
    const btn = $('#roleSave'); busy(btn, true);
    try {
      const r = await call('roles.simpan', { peta: S.roleDraft });
      toast(`${r.diubah} izin diubah. Berlaku di permintaan berikutnya.`);
      S.roles = r.daftar; S.roleDraft = null;
      if (r.me && JSON.stringify(r.me.izin) !== JSON.stringify(S.me.izin)) pakaiMe(r.me); else { S.me = r.me || S.me; rerenderRole(); }
    }
    catch (e) { busy(btn, false); modalGagal(e); }
  };
  $('#addRole').onclick = () => modal('Role baru', `<label class="of"><span>Nama role</span><input class="inp mono" id="rn" placeholder="mis. KOORDINATOR"></label><label class="of"><span>Salin izin dari</span><select class="inp" id="rc"><option value="">— tanpa izin —</option>${S.roles.roles.map(r => `<option>${esc(r.role)}</option>`).join('')}</select></label>`,
    [{ l: 'Batal' }, { l: 'Buat', pri: true, fn: d => {
      const nama = d.querySelector('#rn').value, dari = d.querySelector('#rc').value;
      call('roles.buat', { nama, salinDari: dari }).then(r => { toast(`Role ${r.role} dibuat. Atur izinnya di tabel.`); S.roles = r.daftar; S.roleDraft = null; rerenderRole(); }).catch(modalGagal);
    } }]);
}

/* ---------------- log ---------------- */
function viewLog() {
  const L = S.log, f = S.logF;
  const sel = (id, lbl, opts, v) => `<select class="inp" id="${id}" aria-label="${lbl}"><option value="">${lbl}: semua</option>${opts.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const bln = b => new Date(b + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  return `<div class="card" style="display:flex;flex-direction:column;gap:14px"><div class="row">
   <select class="inp" id="lfb" aria-label="Periode"><option value="">30 hari terakhir</option>${(L.daftarBulan || []).map(b => `<option value="${esc(b)}" ${b === f.bulan ? 'selected' : ''}>${esc(bln(b))}</option>`).join('')}</select>
   <div class="search" style="max-width:260px">${ic('search', 's')}<input id="lfq" placeholder="Cari ID, nilai, catatan…" value="${esc(f.q || '')}"></div>
   ${L.semua ? sel('lfu', 'User', L.users, f.user) : ''}${sel('lfa', 'Aksi', L.aksi, f.aksi)}${sel('lfr', 'Hasil', ['BERHASIL', 'GAGAL', 'DITOLAK'], f.hasil)}
   <span class="sp"></span><span class="muted tnum">${L.entri.length < L.total ? `${L.entri.length} terbaru dari ${L.total}` : L.total + ' entri'}</span><button class="btn sm" data-go2="sistem">Kembali ke Sistem</button></div>
   <div class="tbl-wrap"><table class="t"><thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Entitas</th><th>Detail</th><th>Hasil</th></tr></thead><tbody>
   ${L.entri.map(l => `<tr><td class="tnum" style="white-space:nowrap">${esc(l.waktu)}</td><td class="mono">${esc(l.user)}</td><td><span class="pill p-dim">${esc(l.aksi)}</span></td><td>${esc(l.entitas)} <span class="mono" style="font-size:12px">${esc(l.id)}</span></td>
     <td class="muted">${l.field ? `<span class="mono">${esc(l.field)}</span>: ${esc(l.lama)} → ${esc(l.baru)} ` : ''}${esc(l.catatan)}</td><td class="${l.hasil === 'BERHASIL' ? 'res-ok' : 'res-no'}">${esc(l.hasil)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Tidak ada entri.</td></tr>'}
   </tbody></table></div>
   <div class="muted" style="font-size:12px">Log disimpan per bulan (file per tahun, tab per bulan) supaya tetap cepat. Log hanya bisa ditambah; tidak ada yang bisa mengubah atau menghapus entri, termasuk admin. Password tidak pernah dicatat.</div></div>`;
}
function bindLog() {
  const q = document.getElementById('lfq'); let lt = null;
  if (q) q.oninput = () => { clearTimeout(lt); lt = setTimeout(() => { S.logF.q = q.value; loadPage('log'); }, 500); };
  [['lfb', 'bulan'], ['lfu', 'user'], ['lfa', 'aksi'], ['lfr', 'hasil']].forEach(([id, k]) => { const el = document.getElementById(id); if (el) el.onchange = () => { S.logF[k] = el.value; loadPage('log'); }; });
}

/* ---------------- sistem ---------------- */
function viewSistem() {
  const I = S.sistem, daftar = I.db.akses || [], akses = daftar.length;
  return `<div class="grid g2">
   <div class="card"><h2>${ic('db', 's')} Database</h2><dl class="kv"><dt>File</dt><dd class="mono">${esc(I.db.nama)}</dd><dt>Pemilik</dt><dd>${esc(I.akunFF) || 'akun FF'}</dd><dt>Akses file</dt><dd>${akses <= 2 ? '<span class="pill p-ok">aman</span>' : '<span class="pill p-crit">terlalu banyak</span>'} <span class="muted" style="font-size:12px">${akses} akun</span><div class="mono dim" style="font-size:11.5px;margin-top:4px">${daftar.map(esc).join('<br>')}</div></dd><dt>Versi aplikasi</dt><dd>${esc(I.app.versi)} (${esc(I.app.fase)})</dd><dt>Versi skema</dt><dd>v${esc(I.skemaDb)}</dd><dt>Dibuat</dt><dd>${esc(I.dibuat)}</dd></dl></div>
   <div class="card"><h2>${ic('check', 's')} Pemeriksaan kesehatan<span class="sp"></span><button class="btn sm" id="health">Jalankan</button></h2><div id="hres"><div class="muted" style="font-size:13px">Klik <b>Jalankan</b> untuk memeriksa database, skema, admin, role, config, dan akses file.</div></div></div>
   <div class="card"><h2>${ic('log', 's')} Arsip tahunan</h2><dl class="kv"><dt>Pemicu bulanan</dt><dd>${I.arsip.pemicu ? '<span class="pill p-ok">terpasang</span> <span class="muted" style="font-size:12px">tanggal 1 tiap bulan ±01.00</span>' : I.arsip.pemicu === null ? '<span class="pill p-crit">izin belum lengkap</span> <span class="muted" style="font-size:12px">jalankan mintaIzin di editor</span>' : '<span class="pill p-warn">belum terpasang</span>'}</dd>
     <dt>Pindah setelah</dt><dd>${esc(I.arsip.setelahHari)} hari sejak CLOSE</dd><dt>Terakhir jalan</dt><dd>${esc(I.arsip.terakhir) || '<span class="muted">belum pernah</span>'}</dd>
     <dt>File arsip & log</dt><dd>${(I.db.files || []).map(f => `<div class="mono" style="font-size:11.5px">${esc(f.nama)} ${f.hilang ? '<span class="pill p-crit">tidak bisa dibuka</span>' : f.akses.length > 2 ? '<span class="pill p-crit">' + f.akses.length + ' akun</span>' : ''}</div>`).join('') || '<span class="muted">belum ada</span>'}</dd></dl>
    ${can('pengaturan.kelola') ? `<div class="row" style="margin-top:12px">${I.arsip.pemicu ? '' : '<button class="btn sm pri" id="arsPemicu">Pasang pemicu arsip</button>'}<button class="btn sm" id="arsJalan">Jalankan pindah arsip sekarang</button></div>` : ''}</div>
   ${can('log.semua') ? `<div class="card"><h2>${ic('log', 's')} Log audit</h2><p class="muted" style="margin:0 0 12px">Semua aksi tetap dicatat (login, perubahan, penolakan izin) di file <span class="mono">SKM_LOG_&lt;tahun&gt;</span> sebagai bukti bila diperlukan. Untuk kerja harian, riwayat siapa mengubah apa ada di tab <b>Riwayat</b> setiap kontrak.</p><button class="btn sm" data-go2="log">Buka log audit</button></div>` : ''}
   <div class="card"><h2>Tab di database</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>Tab</th><th class="num">Baris data</th></tr></thead><tbody>${I.db.tabs.map(t => `<tr><td class="mono">${esc(t.tab)}</td><td class="num">${t.baris}</td></tr>`).join('')}</tbody></table></div>
    <div class="muted" style="font-size:12px;margin-top:8px">Tab baru ditambahkan otomatis oleh migrasi. Log ada di file SKM_LOG_&lt;tahun&gt;; kontrak lama di SKM_ARSIP_&lt;tahun&gt;.</div></div>
   <div class="card"><h2>Riwayat migrasi</h2><div class="tl">${I.riwayat.slice().reverse().map(e => `<div class="e"><span class="b"></span><span class="w">${esc(e.waktu)}</span><span><b>v${e.dari} → v${e.ke}</b> · ${esc(e.oleh)}<br><span class="muted" style="font-size:12px">${esc(e.langkah.join(' · '))}</span></span></div>`).join('')}</div>
    <div class="muted" style="font-size:12px;margin-top:8px">Migrasi hanya menambah tab/kolom, tidak pernah menghapus data.</div></div>
   <div class="card" style="grid-column:1/-1"><h2>Config</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>Key</th><th>Nilai</th><th>Arti</th><th></th></tr></thead><tbody>${I.config.map(c => `<tr><td class="mono" style="font-size:12px">${esc(c.key)}</td><td><input class="inp" data-cfg="${esc(c.key)}" value="${esc(c.nilai)}" aria-label="${esc(c.key)}" style="max-width:240px" ${can('pengaturan.kelola') ? '' : 'disabled'}></td><td class="muted" style="font-size:12.5px">${esc(c.ket)}</td><td>${can('pengaturan.kelola') ? `<button class="btn sm" data-cfgsave="${esc(c.key)}">Simpan</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>
  </div>`;
}
function bindSistem() {
  $('#health').onclick = async () => {
    const btn = $('#health'); busy(btn, true, 'Memeriksa…');
    try { const r = await call('sistem.cek'); $('#hres').innerHTML = r.hasil.map(h => `<div class="check"><span class="d ${h.ok ? 'y' : ''}" style="${h.ok ? '' : 'background:var(--crit);color:#fff'}">${h.ok ? '✓' : '!'}</span><span>${esc(h.nama)}${h.catatan ? `<br><span class="muted" style="font-size:12px">${esc(h.catatan)}</span>` : ''}</span></div>`).join(''); toast(`Pemeriksaan selesai: ${r.hasil.filter(h => h.ok).length} dari ${r.hasil.length} OK.`); }
    catch (e) { gagal(e); } finally { busy(btn, false); }
  };
  if ($('#arsPemicu')) $('#arsPemicu').onclick = async () => { const b = $('#arsPemicu'); busy(b, true); try { const r = await call('arsip.pemicu'); toast(r.aktif ? 'Pemicu arsip bulanan terpasang.' : 'Pemicu belum terpasang.'); loadPage('sistem'); } catch (e) { busy(b, false); modalGagal(e); } };
  if ($('#arsJalan')) $('#arsJalan').onclick = async () => { const b = $('#arsJalan'); busy(b, true, 'Memindahkan…'); try { const r = await call('arsip.jalankan'); toast(r.dipindah ? `${r.dipindah} kontrak dipindah ke arsip${r.sisa ? ', ' + r.sisa + ' sisa (jalankan lagi)' : ''}.` : 'Tidak ada kontrak yang perlu dipindah.'); if (r.dipindah) muatUlangDiam(); loadPage('sistem'); } catch (e) { busy(b, false); modalGagal(e); } };
  $$('[data-cfgsave]').forEach(b => b.onclick = async () => {
    const key = b.dataset.cfgsave, nilai = document.querySelector(`[data-cfg="${key}"]`).value; busy(b, true);
    try { const r = await call('config.simpan', { key, nilai }); toast(r.berubah ? `${key} disimpan.` : 'Tidak ada perubahan.'); S.app = Object.assign(S.app, r.app); }
    catch (e) { modalGagal(e); } finally { busy(b, false); }
  });
}
function viewDenied(pesan) {
  return `<div class="card denied"><div class="big">${ic('shield')}</div><h2 style="margin:0;font-size:20px">Anda tidak punya izin untuk halaman ini</h2>
  <p class="muted" style="margin:0;max-width:52ch">${esc(pesan)} Kejadian ini tercatat di Log.</p><button class="btn" data-go2="beranda">Kembali ke beranda</button></div>`;
}

/* ---------------- modal & toast ---------------- */
function modal(title, body, acts) {
  const d = document.createElement('div'); d.className = 'scrim';
  d.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>${title}</h3>${body}<div class="acts">${acts.map((a, i) => `<button class="btn ${a.pri ? 'pri' : ''}" data-a="${i}">${a.l}</button>`).join('')}</div></div>`;
  document.getElementById('overlay-root').appendChild(d);
  const close = () => { d.classList.add('closing'); setTimeout(() => d.remove(), 200); };
  // jendela berisi isian: klik di luar tidak menutup; Esc/Batal minta konfirmasi bila isian sudah diubah (C12)
  const isian = () => [...d.querySelectorAll('input:not([type=checkbox]):not([type=radio]),select,textarea')].map(x => x.value).join('\u0001');
  const awal = isian(), adaIsian = !!d.querySelector('input,select,textarea'), berubah = () => adaIsian && isian() !== awal;
  d._close = () => { if (berubah() && !confirm('Isian di jendela ini belum disimpan. Tutup dan buang isian?')) return; close(); };
  d.addEventListener('click', e => {
    if (e.target === d) { if (adaIsian) { const m = d.querySelector('.modal'); m.classList.remove('goyang'); void m.offsetWidth; m.classList.add('goyang'); } else close(); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = acts[+b.dataset.a];
    if (!a.fn && !a.pri && berubah() && !confirm('Isian di jendela ini belum disimpan. Tutup dan buang isian?')) return;
    if (!a.fn || a.fn(d) !== false) close();
  });
  setTimeout(() => { const f = d.querySelector('input:not([disabled]),select,.btn.pri'); if (f) f.focus(); }, 60);
}
let toastT;
function toast(m, isErr) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const t = document.createElement('div'); t.className = 'toast' + (isErr ? ' err' : ''); t.setAttribute('role', 'status');
  t.innerHTML = ic(isErr ? 'warn' : 'check', 's') + '<span>' + esc(m) + '</span>'; document.body.appendChild(t);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), isErr ? 6000 : 3400);
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.querySelector('.menu')) { closeMenu(); return; }
  const m = [...document.querySelectorAll('#overlay-root .scrim:not(.closing)')].pop(); if (m) { m._close(); return; }
  if (document.getElementById('kform-root')) { tutupKFormTanya(); return; }
  if (S.drawer) { closeDrawer(); return; }
  closeSheet();
});
document.addEventListener('click', () => { closeMenu(); const s = $('#side'); if (s) s.classList.remove('open'); });
window.addEventListener('resize', closeMenu);

