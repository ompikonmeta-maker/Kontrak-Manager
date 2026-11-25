// F1: uji server dari ujung ke ujung memakai dist/Code.gs + Apps Script tiruan.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGas } = require('./helpers/fakegas');

function siapkan() {
  const g = createGas();
  g.ctx.setup();
  const pw = (g.logs.join('\n').match(/password sementara: (\S+)/) || [])[1];
  return { g, pwAdmin: pw };
}
function adminLogin(g, pw) {
  const r = g.api(null, 'login', { username: 'admin', password: pw });
  assert.equal(r.ok, true, JSON.stringify(r));
  const t = r.data.token;
  assert.equal(g.api(t, 'gantiPassword', { baru: 'Rahasia2026' }).ok, true);
  return t;
}
function buatUser(g, t, data) {
  const r = g.api(t, 'users.simpan', { baru: true, role: 'STAFF', nama: 'Staf', alias: '', ...data });
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.data;
}
function loginBaru(g, username, pwSementara, pwBaru = 'Staff2026x') {
  const r = g.api(null, 'login', { username, password: pwSementara });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(g.api(r.data.token, 'gantiPassword', { baru: pwBaru }).ok, true);
  return r.data.token;
}

// ---------------------------------------------------------------- setup & migrasi
test('setup: membuat database, tab skema v2, isi awal, admin awal; Sheet1 bawaan dibuang', () => {
  const { g, pwAdmin } = siapkan();
  const names = g.db().getSheets().map(s => s.getName()).sort();
  assert.deepEqual(names, ['BAST', 'Config', 'Indeks', 'Kendala', 'Kontrak', 'KontrakAlias', 'OrderInternal', 'Ref_DokTagih', 'Ref_JenisDok', 'Ref_Kendala',
    'Ref_NilaiPush', 'Ref_Populasi', 'Ref_Role', 'Ref_Segment', 'Ref_Tahap', 'RiwayatTahap', 'Users', '_Meta']);
  assert.equal(g.tab('Ref_Tahap').length, 6);
  assert.equal(g.tab('Ref_NilaiPush').length, 13);
  assert.ok(g.fileBernama('SKM_LOG_' + new Date().getFullYear()), 'Log ditulis ke file Log per tahun');
  assert.equal(g.triggers.filter(t => t.fn === 'pindahArsipTerjadwal' && t.hari === 1).length, 1, 'pemicu arsip bulanan terpasang');
  assert.match(pwAdmin, /^[A-Za-z0-9]{3}-[A-Za-z0-9]{3}-[A-Za-z0-9]{3}$/);
  assert.deepEqual(g.tab('Ref_Role').map(r => [r.Role, r.Izin.split(',').length]), [['ADMIN', 13], ['STAFF', 5], ['VIEWER', 3]]);
  assert.equal(g.tab('Config').length, 14);
  const admin = g.tab('Users')[0];
  assert.equal(admin.Username, 'admin');
  assert.equal(admin.WajibGantiPassword, 'TRUE');
  assert.match(admin.PasswordHash, /^sha256\$500\$[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(g.tab('Users')).includes(pwAdmin), 'password tersimpan polos');
  assert.deepEqual(g.tab('Log').map(l => l.Aksi), ['MIGRASI_SKEMA', 'SETUP']);
  assert.equal(g.tab('_Meta').find(m => m.Key === 'SKEMA_VERSI').Nilai, '3');
  assert.ok(g.db().getSheetByName('Users').frozen === 1);
});

test('izin Google: setup() memastikan izin dulu; error izin dari Google diterjemahkan jadi petunjuk mintaIzin', () => {
  const { g } = siapkan();
  assert.ok(g.logs.includes('requireAllScopes FULL'));
  g.ctx.AKSI.status.fn = () => { throw new Error('You do not have permission to call SpreadsheetApp.openById. Required permissions: https://www.googleapis.com/auth/spreadsheets'); };
  const r = g.api(null, 'status');
  assert.equal(r.kode, 'IZIN_GOOGLE');
  assert.match(r.pesan, /mintaIzin/);
});

test('setup: aman diulang — tidak membuat admin/tab baru dan tidak menyentuh data', () => {
  const { g } = siapkan();
  const sebelum = JSON.stringify(g.tab('Users'));
  g.logs.length = 0;
  g.ctx.setup();
  assert.equal(JSON.stringify(g.tab('Users')), sebelum);
  assert.equal(g.db().getSheets().length, 18);
  assert.equal(g.triggers.filter(t => t.fn === 'pindahArsipTerjadwal').length, 1, 'pemicu tidak dobel');
  assert.match(g.logs.join('\n'), /User sudah ada; admin awal tidak dibuat ulang/);
});

test('migrasi: kolom baru ditambahkan di akhir tanpa menghapus data lama; berjalan otomatis saat doGet', () => {
  const { g } = siapkan();
  const users = g.db().getSheetByName('Users');
  const iSesi = users.data[0].indexOf('SesiVersi');
  users.data.forEach(r => r.splice(iSesi, 1));                // simulasi database lama tanpa kolom SesiVersi
  g.props.SKEMA_TERPASANG = '0';
  const sebelum = users.data[1].slice();
  g.baru(); g.ctx.doGet();
  assert.equal(users.data[0][users.data[0].length - 1], 'SesiVersi');
  assert.deepEqual(users.data[1].slice(0, sebelum.length), sebelum);
  assert.equal(g.props.SKEMA_TERPASANG, '3');
  assert.match(g.tab('Log').at(-1).Catatan, /kolom ditambah SesiVersi/);
});

test('doGet: menyajikan UI dengan judul aplikasi dan viewport', () => {
  const { g } = siapkan();
  const out = g.ctx.doGet();
  assert.equal(out.title, 'Status Kontrak Manager');
  assert.deepEqual(out.meta[0], ['viewport', 'width=device-width, initial-scale=1']);
});

test('sebelum setup: status siap=false, login ditolak dengan petunjuk setup()', () => {
  const g = createGas();
  assert.equal(g.api(null, 'status').data.siap, false);
  const r = g.api(null, 'login', { username: 'admin', password: 'x' });
  assert.equal(r.kode, 'BELUM_SETUP');
  assert.match(r.pesan, /setup\(\)/);
});

// ---------------------------------------------------------------- login
test('login: salah 5× → terkunci 15 menit; terbuka sendiri setelah waktunya; semua tercatat', () => {
  const { g, pwAdmin } = siapkan();
  for (let i = 1; i <= 4; i++) {
    const r = g.api(null, 'login', { username: 'admin', password: 'salah' });
    assert.equal(r.kode, 'LOGIN_GAGAL');
    assert.match(r.pesan, new RegExp('Sisa ' + (5 - i) + ' percobaan'));
  }
  assert.equal(g.api(null, 'login', { username: 'admin', password: 'salah' }).kode, 'TERKUNCI');
  assert.equal(g.api(null, 'login', { username: 'admin', password: pwAdmin }).kode, 'TERKUNCI', 'password benar pun ditolak selama terkunci');
  g.clock.tambah(16 * 60000);
  assert.equal(g.api(null, 'login', { username: ' ADMIN ', password: pwAdmin }).ok, true, 'username tidak peka huruf besar/spasi');
  const aksi = g.tab('Log').map(l => l.Aksi + ':' + l.Hasil);
  assert.equal(aksi.filter(a => a === 'LOGIN:GAGAL').length, 5);
  assert.ok(aksi.includes('AKUN_TERKUNCI:BERHASIL') && aksi.includes('LOGIN:DITOLAK') && aksi.includes('LOGIN:BERHASIL'));
});

test('login: username tidak dikenal → pesan umum; akun nonaktif → ditolak', () => {
  const { g, pwAdmin } = siapkan();
  assert.equal(g.api(null, 'login', { username: 'tidakada', password: 'x' }).pesan, 'Username atau password salah.');
  const t = adminLogin(g, pwAdmin);
  const u = buatUser(g, t, { username: '95210101' });
  g.api(t, 'users.aktif', { username: '95210101', aktif: false });
  assert.equal(g.api(null, 'login', { username: '95210101', password: u.passwordAcak }).kode, 'AKUN_NONAKTIF');
});

test('wajib ganti password: aksi lain ditolak sampai password diganti; aturan password dicek di server', () => {
  const { g, pwAdmin } = siapkan();
  const t = g.api(null, 'login', { username: 'admin', password: pwAdmin }).data.token;
  assert.equal(g.api(t, 'users.list').kode, 'WAJIB_GANTI');
  assert.equal(g.api(t, 'me').ok, true);
  assert.equal(g.api(t, 'gantiPassword', { baru: 'pendek1' }).kode, 'PASSWORD_LEMAH');
  assert.equal(g.api(t, 'gantiPassword', { baru: 'hanyahurufsaja' }).kode, 'PASSWORD_LEMAH');
  assert.match(g.api(t, 'gantiPassword', { baru: pwAdmin }).pesan, /berbeda dari password lama/);
  assert.equal(g.api(t, 'gantiPassword', { baru: 'Rahasia2026' }).ok, true);
  assert.equal(g.api(t, 'users.list').ok, true);
  assert.equal(g.api(t, 'gantiPassword', { lama: 'keliru', baru: 'Rahasia2027' }).kode, 'PASSWORD_LAMA', 'ganti sukarela wajib password lama');
});

test('sesi: berakhir setelah 6 jam tanpa aktivitas, diperpanjang setiap permintaan, logout menghapus sesi', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  g.clock.tambah(5 * 3600000); assert.equal(g.api(t, 'me').ok, true);
  g.clock.tambah(5 * 3600000); assert.equal(g.api(t, 'me').ok, true, 'diperpanjang oleh permintaan sebelumnya');
  g.clock.tambah(6 * 3600000 + 1000); assert.equal(g.api(t, 'me').kode, 'SESI_HABIS');
  const t2 = g.api(null, 'login', { username: 'admin', password: 'Rahasia2026' }).data.token;
  assert.equal(g.api(t2, 'logout').ok, true);
  assert.equal(g.api(t2, 'me').kode, 'SESI_HABIS');
});

// ---------------------------------------------------------------- users
test('users: buat user dengan username NIK (nol di depan tetap utuh), password acak & diketik, wajib ganti', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  const a = buatUser(g, t, { username: '0095210101', nama: 'Edo Pratama', alias: 'Edo' });
  assert.match(a.passwordAcak, /^\S{3}-\S{3}-\S{3}$/);
  const b = buatUser(g, t, { username: 'Dina.Lestari', nama: 'Dina', password: { mode: 'ketik', nilai: 'Mulai2026' } });
  assert.equal(b.username, 'dina.lestari');
  assert.equal(b.passwordAcak, '', 'password ketik tidak dikirim balik');
  assert.equal(g.tab('Users').find(u => u.Nama === 'Edo Pratama').Username, '0095210101');
  const l = g.api(null, 'login', { username: '0095210101', password: a.passwordAcak });
  assert.equal(l.data.user.wajibGanti, true);
  assert.equal(g.api(null, 'login', { username: 'dina.lestari', password: 'Mulai2026' }).ok, true);
  assert.deepEqual(g.tab('Log').filter(x => x.Aksi === 'BUAT_USER').map(x => x.Catatan.split(' · ')[1]), ['password acak', 'password diketik admin']);
});

test('users: validasi username, duplikat, nama, role, dan password ketik yang lemah', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  const s = p => g.api(t, 'users.simpan', { baru: true, role: 'STAFF', nama: 'X', ...p });
  assert.equal(s({ username: 'ab' }).kode, 'VALIDASI');
  assert.equal(s({ username: 'pakai spasi' }).kode, 'VALIDASI');
  assert.equal(s({ username: 'admin' }).pesan, 'Username "admin" sudah dipakai.');
  assert.equal(s({ username: 'okeuser', nama: '  ' }).kode, 'VALIDASI');
  assert.equal(s({ username: 'okeuser', role: 'BOS' }).kode, 'VALIDASI');
  assert.equal(s({ username: 'okeuser', password: { mode: 'ketik', nilai: 'abc' } }).kode, 'PASSWORD_LEMAH');
});

test('izin dicek di server: STAFF memanggil aksi admin → IZIN_DITOLAK dan tercatat di Log', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  const u = buatUser(g, t, { username: '95210101' });
  const ts = loginBaru(g, '95210101', u.passwordAcak);
  for (const aksi of ['users.list', 'users.simpan', 'roles.simpan', 'sistem.info', 'config.simpan']) {
    const r = g.api(ts, aksi, {});
    assert.equal(r.kode, 'IZIN_DITOLAK', aksi);
  }
  const ditolak = g.tab('Log').filter(l => l.Aksi === 'IZIN_DITOLAK');
  assert.equal(ditolak.length, 5);
  assert.ok(ditolak.every(l => l.Username === '95210101' && l.Hasil === 'DITOLAK'));
  assert.equal(g.api(ts, 'nyasar.aksi').kode, 'AKSI_TIDAK_DIKENAL');
  assert.equal(g.api('token-palsu', 'me').kode, 'SESI_HABIS');
});

test('pengaman admin terakhir: nonaktifkan / turunkan role / cabut user.kelola ditolak', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  assert.equal(g.api(t, 'users.aktif', { username: 'admin', aktif: false }).kode, 'ADMIN_TERAKHIR');
  assert.equal(g.api(t, 'users.simpan', { username: 'admin', nama: 'Admin', role: 'STAFF' }).kode, 'ADMIN_TERAKHIR');
  const peta = Object.fromEntries(g.api(t, 'roles.list').data.roles.map(r => [r.role, r.izin]));
  peta.ADMIN = peta.ADMIN.filter(i => i !== 'user.kelola');
  assert.equal(g.api(t, 'roles.simpan', { peta }).kode, 'ADMIN_TERAKHIR');
  // setelah ada admin kedua, admin awal boleh dinonaktifkan
  const o = buatUser(g, t, { username: 'ompik', role: 'ADMIN', nama: 'omPik' });
  const to = loginBaru(g, 'ompik', o.passwordAcak);
  assert.equal(g.api(to, 'users.aktif', { username: 'admin', aktif: false }).ok, true);
  assert.equal(g.api(t, 'me').kode, 'SESI_HABIS', 'sesi admin yang dinonaktifkan berakhir');
});

test('reset password & ganti role mengakhiri sesi aktif user itu', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  const u = buatUser(g, t, { username: 'staf1' });
  let ts = loginBaru(g, 'staf1', u.passwordAcak);
  assert.equal(g.api(ts, 'me').ok, true);
  const r = g.api(t, 'users.simpan', { username: 'staf1', nama: 'Staf', role: 'STAFF', password: { mode: 'acak' } });
  assert.match(r.data.passwordAcak, /-/);
  assert.equal(g.api(ts, 'me').kode, 'SESI_HABIS');
  ts = loginBaru(g, 'staf1', r.data.passwordAcak, 'Baru12345');
  g.api(t, 'users.simpan', { username: 'staf1', nama: 'Staf', role: 'VIEWER' });
  assert.equal(g.api(ts, 'me').kode, 'SESI_HABIS');
  const ts2 = g.api(null, 'login', { username: 'staf1', password: 'Baru12345' }).data.token;
  assert.equal(g.api(t, 'users.simpan', { username: 'staf1', nama: 'Staf Satu', role: 'VIEWER', alias: 'S1' }).ok, true);
  assert.equal(g.api(ts2, 'me').ok, true, 'ubah nama/alias tidak mengakhiri sesi');
});

test('hapus user hanya bila belum beraktivitas; selain itu ditolak dan tercatat', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  buatUser(g, t, { username: 'salahketik' });
  const b = buatUser(g, t, { username: 'pernahlogin' });
  g.api(null, 'login', { username: 'pernahlogin', password: b.passwordAcak });
  const list = g.api(t, 'users.list').data.users;
  assert.equal(list.find(u => u.username === 'salahketik').bisaDihapus, true);
  assert.equal(list.find(u => u.username === 'pernahlogin').bisaDihapus, false);
  assert.equal(g.api(t, 'users.hapus', { username: 'salahketik' }).ok, true);
  assert.equal(g.api(t, 'users.hapus', { username: 'pernahlogin' }).kode, 'PUNYA_RIWAYAT');
  assert.equal(g.api(t, 'users.hapus', { username: 'admin' }).kode, 'PUNYA_RIWAYAT');
  assert.ok(!g.tab('Users').some(u => u.Username === 'salahketik'));
  assert.deepEqual(g.tab('Log').filter(l => l.Aksi === 'HAPUS_USER').map(l => l.Hasil), ['BERHASIL', 'DITOLAK', 'DITOLAK']);
});

test('buka kunci oleh admin; list tidak pernah mengirim hash/salt', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  const u = buatUser(g, t, { username: 'staf2' });
  for (let i = 0; i < 5; i++) g.api(null, 'login', { username: 'staf2', password: 'x' });
  let row = g.api(t, 'users.list').data.users.find(x => x.username === 'staf2');
  assert.equal(row.status, 'TERKUNCI');
  assert.match(row.terkunciSampai, /^\d{2}:\d{2}$/);
  assert.equal(g.api(t, 'users.bukaKunci', { username: 'staf2' }).ok, true);
  assert.equal(g.api(null, 'login', { username: 'staf2', password: u.passwordAcak }).ok, true);
  const raw = JSON.stringify(g.api(t, 'users.list'));
  assert.ok(!/PasswordHash|Salt|sha256\$/.test(raw));
});

test('konflik versi: dua admin mengubah user yang sama → yang kedua diminta memuat ulang', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  buatUser(g, t, { username: 'staf3' });
  const v = g.api(t, 'users.list').data.users.find(x => x.username === 'staf3').version;
  assert.equal(g.api(t, 'users.simpan', { username: 'staf3', nama: 'A', role: 'STAFF', version: v }).ok, true);
  assert.equal(g.api(t, 'users.simpan', { username: 'staf3', nama: 'B', role: 'STAFF', version: v }).kode, 'KONFLIK');
});

// ---------------------------------------------------------------- role, log, sistem, config
test('role: ubah izin tercatat per izin, role baru bisa dibuat dan disalin', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  assert.equal(g.api(t, 'roles.buat', { nama: 'koordinator', salinDari: 'STAFF' }).data.role, 'KOORDINATOR');
  assert.equal(g.api(t, 'roles.buat', { nama: 'KOORDINATOR' }).kode, 'VALIDASI');
  const peta = Object.fromEntries(g.api(t, 'roles.list').data.roles.map(r => [r.role, r.izin]));
  peta.KOORDINATOR.push('pic.atur'); peta.VIEWER = peta.VIEWER.filter(i => i !== 'export');
  assert.equal(g.api(t, 'roles.simpan', { peta }).data.diubah, 2);
  const log = g.tab('Log').filter(l => l.Aksi === 'UBAH_IZIN').map(l => `${l.EntitasID}:${l.Field}:${l.NilaiLama}→${l.NilaiBaru}`);
  assert.deepEqual(log.sort(), ['KOORDINATOR:pic.atur:tidak→ya', 'VIEWER:export:ya→tidak']);
  peta.VIEWER.push('izin.palsu');
  assert.equal(g.api(t, 'roles.simpan', { peta }).kode, 'VALIDASI');
});

test('izin baru langsung berlaku di permintaan berikutnya tanpa login ulang', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  const u = buatUser(g, t, { username: 'staf4' });
  const ts = loginBaru(g, 'staf4', u.passwordAcak);
  assert.equal(g.api(ts, 'sistem.info').kode, 'IZIN_DITOLAK');
  const peta = Object.fromEntries(g.api(t, 'roles.list').data.roles.map(r => [r.role, r.izin]));
  peta.STAFF.push('user.kelola');
  g.api(t, 'roles.simpan', { peta });
  assert.equal(g.api(ts, 'sistem.info').ok, true);
});

test('log: non-admin hanya melihat log miliknya; admin melihat semua dan bisa memfilter', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  const u = buatUser(g, t, { username: 'staf5' });
  const ts = loginBaru(g, 'staf5', u.passwordAcak);
  g.api(ts, 'users.list');
  const own = g.api(ts, 'log.list').data;
  assert.equal(own.semua, false);
  assert.ok(own.entri.length >= 3 && own.entri.every(e => e.user === 'staf5'));
  const all = g.api(t, 'log.list').data;
  assert.ok(all.semua && all.users.includes('admin') && all.users.includes('staf5'));
  const f = g.api(t, 'log.list', { hasil: 'DITOLAK' }).data;
  assert.deepEqual([...new Set(f.entri.map(e => e.aksi))], ['IZIN_DITOLAK']);
  assert.ok(all.entri[0].waktu >= all.entri.at(-1).waktu, 'terbaru di atas');
});

test('config: divalidasi dan langsung dipakai (PASSWORD_MIN, LOGIN_GAGAL_MAKS)', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  assert.equal(g.api(t, 'config.simpan', { key: 'SESI_JAM', nilai: '7' }).kode, 'VALIDASI');
  assert.equal(g.api(t, 'config.simpan', { key: 'TIDAK_ADA', nilai: '1' }).kode, 'VALIDASI');
  assert.equal(g.api(t, 'config.simpan', { key: 'PASSWORD_MIN', nilai: '10' }).ok, true);
  assert.equal(g.api(t, 'config.simpan', { key: 'LOGIN_GAGAL_MAKS', nilai: '3' }).ok, true);
  assert.equal(g.api(t, 'users.simpan', { baru: true, username: 'staf6', nama: 'S', role: 'STAFF', password: { mode: 'ketik', nilai: 'Abcdef12' } }).kode, 'PASSWORD_LEMAH');
  buatUser(g, t, { username: 'staf6' });
  g.api(null, 'login', { username: 'staf6', password: 'x' }); g.api(null, 'login', { username: 'staf6', password: 'x' });
  assert.equal(g.api(null, 'login', { username: 'staf6', password: 'x' }).kode, 'TERKUNCI');
  assert.ok(g.tab('Log').some(l => l.Aksi === 'UBAH_CONFIG' && l.EntitasID === 'PASSWORD_MIN' && l.NilaiLama === '8' && l.NilaiBaru === '10'));
});

test('sistem: info & pemeriksaan kesehatan; file database dibagikan ke banyak orang → tidak lulus', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  const info = g.api(t, 'sistem.info').data;
  assert.equal(info.skemaDb, '3');
  assert.equal(info.riwayat.length, 1);
  assert.equal(info.akunFF, 'ff.unit@gmail.com');
  assert.ok(g.api(t, 'sistem.cek').data.hasil.every(h => h.ok));
  g.db().viewers.push('ff.unit@gmail.com');     // pemilik muncul di dua daftar → tetap dihitung 1
  assert.match(g.api(t, 'sistem.cek').data.hasil.find(h => /dibagikan/.test(h.nama)).catatan, /^1 akun punya akses: ff\.unit@gmail\.com$/);
  g.db().editors.push('a@x.com', 'b@x.com');
  const cek = g.api(t, 'sistem.cek').data.hasil;
  assert.equal(cek.find(h => /dibagikan/.test(h.nama)).ok, false);
});

test('pulihkanAdmin: memulihkan akses bila admin tidak bisa login', () => {
  const { g, pwAdmin } = siapkan();
  adminLogin(g, pwAdmin);
  for (let i = 0; i < 5; i++) g.api(null, 'login', { username: 'admin', password: 'x' });
  g.logs.length = 0; g.baru();
  g.ctx.pulihkanAdmin();
  const pw = g.logs.join('\n').match(/password sementara: (\S+)/)[1];
  const r = g.api(null, 'login', { username: 'admin', password: pw });
  assert.equal(r.ok, true);
  assert.equal(r.data.user.wajibGanti, true);
});

test('setiap aksi yang mengubah data meninggalkan jejak di Log', () => {
  const { g, pwAdmin } = siapkan();
  const t = adminLogin(g, pwAdmin);
  const n0 = g.tab('Log').length;
  buatUser(g, t, { username: 'jejak1' });
  g.api(t, 'users.simpan', { username: 'jejak1', nama: 'Jejak', role: 'VIEWER' });
  g.api(t, 'users.bukaKunci', { username: 'jejak1' });
  g.api(t, 'users.aktif', { username: 'jejak1', aktif: false });
  g.api(t, 'users.hapus', { username: 'jejak1' });
  g.api(t, 'roles.buat', { nama: 'TAMU' });
  g.api(t, 'config.simpan', { key: 'KUNCI_MENIT', nilai: '20' });
  const baru = g.tab('Log').slice(n0).map(l => l.Aksi);
  assert.deepEqual(baru, ['BUAT_USER', 'UBAH_USER', 'BUKA_KUNCI', 'NONAKTIFKAN_USER', 'HAPUS_USER', 'BUAT_ROLE', 'UBAH_CONFIG']);
});
