// F1 v1.0.3: hemat panggilan Sheet, satu panggilan saat buka halaman, jawaban simpan membawa data terbaru, tab > 1.000 baris.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGas } = require('./helpers/fakegas');

function siapkan() {
  const g = createGas();
  g.ctx.setup();
  const pw = g.logs.join('\n').match(/password sementara: (\S+)/)[1];
  const t = g.api(null, 'login', { username: 'admin', password: pw }).data.token;
  assert.equal(g.api(t, 'gantiPassword', { baru: 'Rahasia2026' }).ok, true);
  return { g, t };
}
const ops = (g, fn) => { const o = g.ops.n; const r = fn(); return { r, n: g.ops.n - o }; };

test('boot: satu panggilan berisi status, profil dan katalog; token rusak → user null tanpa error', () => {
  const { g, t } = siapkan();
  const b = g.api(t, 'boot');
  assert.equal(b.ok, true);
  assert.equal(b.data.siap, true);
  assert.equal(b.data.user.username, 'admin');
  assert.ok(b.data.user.izin.includes('user.kelola'));
  assert.equal(b.data.katalog.length, 12);
  assert.equal(b.data.app.versi, '1.0.3');
  const x = g.api('token-palsu', 'boot');
  assert.equal(x.ok, true);
  assert.equal(x.data.user, null);
  assert.equal(g.api(null, 'boot').data.user, null);
});

test('boot sebelum setup: siap=false, tanpa error', () => {
  const g = createGas();
  const b = g.api(null, 'boot');
  assert.equal(b.ok, true);
  assert.equal(b.data.siap, false);
});

test('login membawa katalog izin (layar tidak perlu memanggil "me" lagi)', () => {
  const g = createGas(); g.ctx.setup();
  const pw = g.logs.join('\n').match(/password sementara: (\S+)/)[1];
  const r = g.api(null, 'login', { username: 'admin', password: pw });
  assert.equal(r.data.katalog.length, 12);
});

test('roles.simpan & users.* mengembalikan daftar terbaru + profil sendiri', () => {
  const { g, t } = siapkan();
  const peta = Object.fromEntries(g.api(t, 'roles.list').data.roles.map(r => [r.role, r.izin]));
  peta.STAFF = peta.STAFF.concat(['log.semua']);
  const r = g.api(t, 'roles.simpan', { peta }).data;
  assert.equal(r.diubah, 1);
  assert.ok(r.daftar.roles.find(x => x.role === 'STAFF').izin.includes('log.semua'));
  assert.equal(r.me.username, 'admin');
  // data balikan sama persis dengan memuat ulang
  assert.deepEqual(r.daftar, g.api(t, 'roles.list').data);

  const u = g.api(t, 'users.simpan', { baru: true, username: 'staf1', nama: 'Staf', role: 'STAFF' }).data;
  assert.ok(u.passwordAcak);
  assert.ok(u.daftar.users.some(x => x.username === 'staf1'));
  assert.deepEqual(u.daftar, g.api(t, 'users.list').data);
  const a = g.api(t, 'users.aktif', { username: 'staf1', aktif: false }).data;
  assert.equal(a.daftar.users.find(x => x.username === 'staf1').aktif, false);
  const h = g.api(t, 'users.hapus', { username: 'staf1' }).data;
  assert.ok(!h.daftar.users.some(x => x.username === 'staf1'));
  assert.ok(g.api(t, 'roles.buat', { nama: 'KOORD' }).data.daftar.roles.some(x => x.role === 'KOORD'));
});

test('jumlah panggilan Sheet: buka halaman 0, simpan izin & ubah user ≤ 8 (dulu 23 & 13)', () => {
  const { g, t } = siapkan();
  g.api(t, 'users.simpan', { baru: true, username: 'staf1', nama: 'Staf', role: 'STAFF' });
  assert.equal(ops(g, () => g.ctx.doGet()).n, 0);
  assert.equal(ops(g, () => g.api(t, 'boot')).n, 0);
  const peta = Object.fromEntries(g.api(t, 'roles.list').data.roles.map(r => [r.role, r.izin]));
  peta.STAFF = peta.STAFF.concat(['user.kelola', 'pic.atur', 'log.semua']);
  const s = ops(g, () => g.api(t, 'roles.simpan', { peta }));
  assert.equal(s.r.ok, true);
  assert.ok(s.n <= 8, 'roles.simpan memakai ' + s.n + ' panggilan Sheet');
  const u = ops(g, () => g.api(t, 'users.simpan', { username: 'staf1', nama: 'Staf Satu', role: 'STAFF' }));
  assert.ok(u.n <= 8, 'users.simpan memakai ' + u.n + ' panggilan Sheet');
  // 3 entri log dari roles.simpan ditulis dalam satu kali tulis
  const logs = g.tab('Log').filter(l => l.Aksi === 'UBAH_IZIN');
  assert.equal(logs.length, 3);
});

test('Log & tab tetap bisa ditulis melewati 1.000 baris bawaan sheet', () => {
  const { g, t } = siapkan();
  g.baru();
  for (let i = 0; i < 1100; i++) g.ctx.Repo.tulisLog({ aksi: 'UJI', catatan: String(i) });
  g.ctx.Repo.flushLog();
  const log = g.tab('Log');
  assert.ok(log.length > 1100);
  assert.equal(log[log.length - 1].Catatan, '1099');
  // baris tambahan berformat teks
  const sh = g.db().getSheetByName('Log');
  assert.ok(sh.maxRows > 1000);
  assert.ok(sh.formats.some(f => f[0] === 1001 && f[4] === '@'));
  // aksi biasa masih jalan & tercatat setelah melewati batas
  assert.equal(g.api(t, 'sistem.cek').ok, true);
  assert.equal(g.tab('Log').slice(-1)[0].Aksi, 'CEK_SISTEM');
  // tabel Users juga
  g.baru();
  g.ctx.Repo.kunci(() => { for (let i = 0; i < 1005; i++) g.ctx.Repo.tambah('Users', { Username: 'u' + i, Nama: 'U', Role: 'VIEWER', Aktif: 'TRUE' }); });
  assert.equal(g.tab('Users').length, 1006);
  g.baru();
  assert.equal(g.ctx.Repo.semua('Users').length, 1006);
});

test('log tetap tertulis walau aksi gagal / ditolak', () => {
  const { g, t } = siapkan();
  assert.equal(g.api(null, 'login', { username: 'admin', password: 'salah' }).ok, false);
  assert.equal(g.tab('Log').slice(-1)[0].Hasil, 'GAGAL');
  const s = g.api(t, 'users.simpan', { baru: true, username: 'viewer1', nama: 'V', role: 'VIEWER' }).data;
  const tv = g.api(null, 'login', { username: 'viewer1', password: s.passwordAcak }).data.token;
  g.api(tv, 'gantiPassword', { baru: 'Viewer2026' });
  assert.equal(g.api(tv, 'users.list').kode, 'IZIN_DITOLAK');
  assert.equal(g.tab('Log').slice(-1)[0].Aksi, 'IZIN_DITOLAK');
});

test('cache diperbarui setelah menulis: permintaan berikutnya melihat data baru tanpa membaca sheet', () => {
  const { g, t } = siapkan();
  g.api(t, 'users.simpan', { baru: true, username: 'staf1', nama: 'Staf', role: 'STAFF' });
  g.api(t, 'users.simpan', { username: 'staf1', nama: 'Nama Baru', role: 'VIEWER' });
  const l = ops(g, () => g.api(t, 'users.list'));
  assert.equal(l.n, 0);
  assert.equal(l.r.data.users.find(u => u.username === 'staf1').nama, 'Nama Baru');
  // isi cache sama dengan isi sheet
  assert.deepEqual(l.r.data.users.map(u => [u.username, u.nama, u.role]), g.tab('Users').map(u => [u.Username, u.Nama, u.Role]));
  // hapus baris tengah: nomor baris di cache ikut bergeser
  g.api(t, 'users.simpan', { baru: true, username: 'staf2', nama: 'Dua', role: 'STAFF' });
  g.api(t, 'users.simpan', { baru: true, username: 'staf3', nama: 'Tiga', role: 'STAFF' });
  g.api(t, 'users.hapus', { username: 'staf2' });
  assert.equal(g.api(t, 'users.simpan', { username: 'staf3', nama: 'Tiga!', role: 'STAFF' }).ok, true);
  assert.equal(g.tab('Users').find(u => u.Username === 'staf3').Nama, 'Tiga!');
  assert.equal(g.tab('Users').length, 3);
});
