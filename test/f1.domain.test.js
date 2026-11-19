// F1: unit test fungsi murni Domain (tanpa Apps Script).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'server', '10_Domain.js'), 'utf8'), ctx);
const D = ctx.Domain;
const plain = x => JSON.parse(JSON.stringify(x));

test('cekUsername: NIK, nama dengan titik, minimal 3 karakter, tanpa spasi', () => {
  for (const ok of ['95210101', 'ompik', 'dina.lestari', 'a_b', 'x-9z', '0012345']) assert.equal(D.cekUsername(ok), '', ok);
  for (const no of ['ab', 'pakai spasi', '.awaltitik', 'x'.repeat(33), '', 'émoji']) assert.notEqual(D.cekUsername(no), '', no);
  assert.equal(D.normUsername('  OmPik '), 'ompik');
});

test('cekPassword: panjang minimal, huruf+angka, berbeda dari lama', () => {
  assert.deepEqual(plain(D.cekPassword('Rahasia2026')), []);
  assert.equal(D.cekPassword('Ab1', { min: 8 }).length, 1);
  assert.equal(D.cekPassword('abcdefghij').length, 1);
  assert.equal(D.cekPassword('Rahasia2026', { samaDenganLama: true }).length, 1);
  assert.equal(D.cekPassword('Abcdefg1', { min: 10 })[0], 'Minimal 10 karakter');
});

test('passwordAcak: format xxx-xxx-xxx, selalu ada huruf dan angka, tanpa karakter mirip (0/O/1/l/I)', () => {
  for (let n = 0; n < 300; n++) {
    const bytes = Array.from({ length: 9 }, () => Math.floor(Math.random() * 256));
    const p = D.passwordAcak(bytes);
    assert.match(p, /^[^-]{3}-[^-]{3}-[^-]{3}$/);
    assert.ok(/\d/.test(p) && /[A-Za-z]/.test(p), p);
    assert.ok(!/[0O1lI]/.test(p), p);
  }
  assert.ok(/[A-Za-z]/.test(D.passwordAcak([48, 49, 50, 51, 52, 53, 54, 55, 47].map(x => 47 + (x % 8)))));
});

test('petaRole & izinUser: dari baris Ref_Role (teks dipisah koma)', () => {
  const peta = D.petaRole([{ Role: 'ADMIN', Izin: 'a, b ,c' }, { Role: 'STAFF', Izin: '' }, { Role: '', Izin: 'x' }]);
  assert.deepEqual(plain(peta), { ADMIN: ['a', 'b', 'c'], STAFF: [] });
  assert.deepEqual(plain(D.izinUser({ Role: 'ADMIN' }, peta)), ['a', 'b', 'c']);
  assert.deepEqual(plain(D.izinUser({ Role: 'HILANG' }, peta)), []);
});

test('hilangkanAdminTerakhir: menolak perubahan yang menyisakan nol admin aktif', () => {
  const peta = { ADMIN: ['user.kelola'], STAFF: [] };
  const users = [{ Username: 'a', Role: 'ADMIN', Aktif: 'TRUE' }, { Username: 'b', Role: 'STAFF', Aktif: 'TRUE' }];
  assert.equal(D.hilangkanAdminTerakhir(users, peta, { username: 'a', aktif: 'FALSE' }), true);
  assert.equal(D.hilangkanAdminTerakhir(users, peta, { username: 'a', role: 'STAFF' }), true);
  assert.equal(D.hilangkanAdminTerakhir(users, peta, { username: 'a', hapus: true }), true);
  assert.equal(D.hilangkanAdminTerakhir(users, peta, { petaBaru: { ADMIN: [], STAFF: [] } }), true);
  assert.equal(D.hilangkanAdminTerakhir(users, peta, { username: 'b', role: 'ADMIN' }), false);
  assert.equal(D.hilangkanAdminTerakhir(users, peta, { petaBaru: { ADMIN: [], STAFF: ['user.kelola'] } }), false, 'admin pindah ke role lain tetap ada');
  const dua = users.concat([{ Username: 'c', Role: 'ADMIN', Aktif: 'TRUE' }]);
  assert.equal(D.hilangkanAdminTerakhir(dua, peta, { username: 'a', aktif: 'FALSE' }), false);
});

test('cekPetaRole: nama role dan izin harus valid terhadap katalog', () => {
  const kat = [['x', ''], ['y', '']];
  assert.deepEqual(plain(D.cekPetaRole({ ADMIN: ['x'], KOORDINATOR_2: ['y'] }, kat)), []);
  assert.equal(D.cekPetaRole({ admin: ['x'] }, kat).length, 1);
  assert.equal(D.cekPetaRole({ ADMIN: ['z'] }, kat).length, 1);
});

test('catatGagal & terkunci: hitung mundur lalu kunci N menit', () => {
  const now = 1_000_000;
  let u = { GagalLogin: '0', TerkunciSampai: '' };
  for (let i = 1; i <= 4; i++) { const g = D.catatGagal(u, now, 5, 15); assert.equal(g.sisa, 5 - i); u = { ...u, ...g }; }
  const g = D.catatGagal(u, now, 5, 15);
  assert.equal(g.terkunci, true);
  assert.equal(D.terkunci({ TerkunciSampai: g.TerkunciSampai }, now + 14 * 60000) > 0, true);
  assert.equal(D.terkunci({ TerkunciSampai: g.TerkunciSampai }, now + 15 * 60000 + 1), 0);
});

test('statusUser & bolehHapus', () => {
  assert.equal(D.statusUser({ Aktif: 'FALSE' }, 0), 'NONAKTIF');
  assert.equal(D.statusUser({ Aktif: 'TRUE', TerkunciSampai: '100' }, 50), 'TERKUNCI');
  assert.equal(D.statusUser({ Aktif: 'TRUE', WajibGantiPassword: 'TRUE' }, 0), 'WAJIB_GANTI');
  assert.equal(D.statusUser({ Aktif: true }, 0), 'AKTIF');
  assert.equal(D.bolehHapus({ PunyaAktivitas: 'FALSE', LoginTerakhir: '' }), true);
  assert.equal(D.bolehHapus({ PunyaAktivitas: 'FALSE', LoginTerakhir: '2026-11-19 09:00:00' }), false);
  assert.equal(D.bolehHapus({ PunyaAktivitas: 'TRUE', LoginTerakhir: '' }), false);
});

test('rencanaMigrasi: hanya menambah tab/kolom, tidak pernah menghapus atau mengurutkan ulang', () => {
  const skema = { A: ['x', 'y', 'z'], B: ['k'] };
  assert.deepEqual(plain(D.rencanaMigrasi(skema, {})), [{ op: 'buatTab', tab: 'A', kolom: ['x', 'y', 'z'] }, { op: 'buatTab', tab: 'B', kolom: ['k'] }]);
  assert.deepEqual(plain(D.rencanaMigrasi(skema, { A: ['y', 'x', 'lama'], B: ['k', 'tambahan'] })), [{ op: 'tambahKolom', tab: 'A', kolom: ['z'] }]);
  assert.deepEqual(plain(D.rencanaMigrasi(skema, { A: ['x', 'y', 'z'], B: ['k'], C: ['bebas'] })), []);
});
