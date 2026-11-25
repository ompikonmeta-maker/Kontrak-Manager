// F3: izin kontrak.import + izin tambahan per user, migrasi skema 3, import data lama (Lampiran A), ringkasan dashboard.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGas } = require('./helpers/fakegas');
const KD = require('../src/shared/kd.js');

function siapkan() {
  const g = createGas();
  g.ctx.setup();
  const pw = g.logs.join('\n').match(/password sementara: (\S+)/)[1];
  const t = g.api(null, 'login', { username: 'admin', password: pw }).data.token;
  assert.equal(g.api(t, 'gantiPassword', { baru: 'Rahasia2026' }).ok, true);
  assert.equal(g.api(t, 'users.simpan', { username: 'admin', nama: 'Admin awal', alias: 'omPik', role: 'ADMIN' }).ok, true);
  return { g, t };
}
const ok = r => { assert.equal(r.ok, true, JSON.stringify(r)); return r.data; };
function userBaru(g, t, username, role, alias, ekstra) {
  const r = ok(g.api(t, 'users.simpan', { baru: true, username, nama: username, alias, role, izinTambahan: ekstra }));
  const tk = g.api(null, 'login', { username, password: r.passwordAcak }).data.token;
  assert.equal(g.api(tk, 'gantiPassword', { baru: 'Rahasia2026x' }).ok, true);
  return tk;
}

// Lampiran A SPEC (tanpa kolom JUDUL) + kasus tambahan
const LAMPIRAN_A = [
  ['NO WO/SPK/KL', 'TAHUN', 'POP', 'PELANGGAN', 'SEG', 'STATUS AWAL', 'NILAI', 'KENDALA UMUM', 'KENDALA DETIL', 'PIC'],
  ['TEL.0317-0016/P8/LG.270/DES-A2027000/2017', 2017, 'TREG', 'BANK PERMATA', 'LBCS', 'BAST PARSIAL', 'Rp 95,352,000.00', 'BAST REVISI', 'BAST Revisi, hanya dua lokasi diproses, 4 lokasi belum', 'Edo'],
  ['TEL.0719-0488/HK.810/DES-A1000000/2020', 2020, 'SDA', 'BANK DANAMON INDONESIA Tbk', 'GOS', 'KOMPULIR EVIDENCE', 'Rp 29,730,240,000.00', 'BAST ON REVIEW', 'REVIEW ADMIN PRM', 'Unggul'],
  ['TEL.0219-0003/P8/LG.270/DES-A2020000/2019', 2019, 'PRM', 'PT HEXINDO ADI PERKASA', 'ENS', 'KOMPULIR EVIDENCE', 'Rp 206,952,000.00', 'KOMPULIR EVIDEN', 'KOMPULIR EVIDENCE', 'Baim'],
  ['TEL.0418-0152/P8/LG.270/DES-A2020000/2018', 2018, 'DIRECT', 'PT Wananugraha Bima Lestari', 'OLOS', 'KOMPULIR EVIDENCE', 'Rp 152,294,500.00', 'BAST DONE', 'Belum takeout menunggu AO SID', 'Alif'],
  ['WO/0188/TSAT/IX/2025', 2025, 'TELKOMSEL', 'PT Telkomsel', 'LBCS', 'KOMPULIR EVIDENCE', '780.000.000', 'SERTIM AR', 'sudah sertim', 'Rina'],
  ['', 2024, 'TREG', 'Pemkab Alor', 'GOS', 'NUNGGU TTD', 'Rp 120,000,000.00', '', '', 'Baim'],
  ['TEL.0820-0311/HK.810/DES-A1000000/2023', 2023, 'MARITIM', 'PT Samudera Nusantara', 'OLOS', 'NUNGGU TTD', 'Rp 410,000,000.00', '', 'Menunggu TTD direksi', 'Edo']
];
const rowsDari = aoa => aoa.slice(1).map((r, i) => ({ baris: i + 2, r }));

function payloadImport(g, t, aoa, ekstra = {}) {
  const map = KD.petaImport(aoa[0]);
  return Object.assign({ file: 'FF_lama.xlsx', map, nilai: {}, pic: { Edo: 'Edo', Unggul: 'Unggul', Baim: 'Baim', Alif: 'Alif' }, refBaru: { 'Populasi:TELKOMSEL': true }, rows: rowsDari(aoa) }, ekstra);
}

test('izin kontrak.import: katalog 13, ADMIN punya, STAFF tidak; upload & import ditolak untuk STAFF', () => {
  const { g, t } = siapkan();
  const kat = ok(g.api(t, 'boot')).katalog.map(x => x[0]);
  assert.ok(kat.includes('kontrak.import'));
  const peta = Object.fromEntries(ok(g.api(t, 'roles.list')).roles.map(r => [r.role, r.izin]));
  assert.ok(peta.ADMIN.includes('kontrak.import'));
  assert.ok(!peta.STAFF.includes('kontrak.import'));
  ['Edo', 'Unggul', 'Baim', 'Alif'].forEach((a, i) => userBaru(g, t, 'staf' + i, 'STAFF', a));
  const ts = g.api(null, 'login', { username: 'staf0', password: 'Rahasia2026x' }).data.token;
  assert.equal(g.api(ts, 'upload.template').kode, 'IZIN_DITOLAK');
  assert.equal(g.api(ts, 'import.simpan', payloadImport(g, ts, LAMPIRAN_A)).kode, 'IZIN_DITOLAK');
  // STAFF tetap boleh membuat kontrak satu per satu
  assert.equal(g.api(ts, 'kontrak.op', { op: 'kontrak.buat', data: { f: { NoKontrak: 'KL.9/2026', JudulKontrak: 'Satu' } } }).ok, true);
});

test('izin tambahan per user: diberikan, dipakai di server, tercatat di Log; izin dari role tidak disimpan; izin lain ditolak', () => {
  const { g, t } = siapkan();
  const ts = userBaru(g, t, 'edo', 'STAFF', 'Edo');
  assert.equal(g.api(ts, 'upload.cekNomor', { nomor: [] }).kode, 'IZIN_DITOLAK');
  const r = ok(g.api(t, 'users.simpan', { username: 'edo', nama: 'Edo', alias: 'Edo', role: 'STAFF', izinTambahan: ['kontrak.import'] }));
  assert.deepEqual(r.daftar.users.find(u => u.username === 'edo').izinTambahan, ['kontrak.import']);
  assert.deepEqual(r.daftar.izinTambahan, ['kontrak.import']);
  assert.equal(g.tab('Users').find(u => u.Username === 'edo').IzinTambahan, 'kontrak.import');
  assert.ok(g.tab('Log').some(l => l.Aksi === 'UBAH_USER' && /izin tambahan — → kontrak.import/.test(l.Catatan)));
  // sesi tidak diakhiri, izin langsung berlaku di permintaan berikutnya
  assert.equal(g.api(ts, 'upload.cekNomor', { nomor: [] }).ok, true);
  assert.ok(ok(g.api(ts, 'boot')).user.izin.includes('kontrak.import'));
  // izin yang tidak boleh diberikan per user
  assert.equal(g.api(t, 'users.simpan', { username: 'edo', nama: 'Edo', alias: 'Edo', role: 'STAFF', izinTambahan: ['user.kelola'] }).kode, 'VALIDASI');
  // role ADMIN sudah punya → tidak disimpan sebagai tambahan
  ok(g.api(t, 'users.simpan', { username: 'edo', nama: 'Edo', alias: 'Edo', role: 'ADMIN', izinTambahan: ['kontrak.import'] }));
  assert.equal(g.tab('Users').find(u => u.Username === 'edo').IzinTambahan, '');
  // tanpa field izinTambahan → tidak diubah
  ok(g.api(t, 'users.simpan', { username: 'edo', nama: 'Edo', alias: 'Edo', role: 'STAFF', izinTambahan: ['kontrak.import'] }));
  ok(g.api(t, 'users.simpan', { username: 'edo', nama: 'Edo P', alias: 'Edo', role: 'STAFF' }));
  assert.equal(g.tab('Users').find(u => u.Username === 'edo').IzinTambahan, 'kontrak.import');
});

test('migrasi v2 → v3: kolom IzinTambahan ditambah, kontrak.import diberikan ke role ber-user.kelola saja (sekali)', () => {
  const { g, t } = siapkan();
  // tiru database F2: role tanpa kontrak.import, Users tanpa kolom IzinTambahan
  const strip = r => g.ctx.Repo.ubah('Ref_Role', r, { Izin: g.tab('Ref_Role').find(x => x.Role === r).Izin.split(',').filter(i => i !== 'kontrak.import').join(',') });
  strip('ADMIN');
  g.ctx.Repo.tambah('Ref_Role', { Role: 'KOORD', Izin: 'dashboard.lihat,kontrak.lihat,user.kelola' });
  const sh = g.db().getSheetByName('Users'), h = sh.data[0], ci = h.indexOf('IzinTambahan');
  sh.data = sh.data.map(r => r.filter((_, i) => i !== ci));
  g.ctx.Repo.ubah('_Meta', 'IZIN_IMPORT_F3', { Nilai: '' });
  g.props.SKEMA_TERPASANG = '2';
  g.baru(); g.ctx.doGet();
  assert.equal(g.props.SKEMA_TERPASANG, '3');
  assert.ok(g.db().getSheetByName('Users').data[0].includes('IzinTambahan'));
  const izin = r => g.tab('Ref_Role').find(x => x.Role === r).Izin.split(',');
  assert.ok(izin('ADMIN').includes('kontrak.import'));
  assert.ok(izin('KOORD').includes('kontrak.import'));
  assert.ok(!izin('STAFF').includes('kontrak.import'));
  // admin tetap bisa login & bekerja
  assert.equal(g.api(t, 'boot').ok, true);
});

test('KD import: pemetaan kolom & nilai Lampiran A sesuai §11.1', () => {
  const ref = KD.siapkanRef({
    tahap: [['KOMPULIR', 1], ['DRAFTING', 2], ['REVIEW_CUST', 3], ['SIRKULIR', 4], ['BAST_DONE', 5], ['TAKEOUT', 6]].map(([k, u]) => ({ Kode: k, Urutan: String(u), Label: k, Penutup: k === 'TAKEOUT' ? 'TRUE' : 'FALSE', BatasAgingHari: '14', Aktif: 'TRUE' })),
    kendala: ['REV_KONTRAK', 'REV_DOKUMEN', 'RETURN_CUST', 'KENDALA_CUST', 'LAINNYA'].map((k, i) => ({ Kode: k, Label: k, WajibKeterangan: 'TRUE', MemicuReopen: 'FALSE', Aktif: 'TRUE', Urutan: String(i + 1) })),
    push: [], populasi: ['TREG', 'SDA', 'PRM', 'DIRECT'].map((k, i) => ({ Kode: k, Label: k, Aktif: 'TRUE', Urutan: String(i) })),
    segment: ['LBCS', 'GOS', 'ENS', 'OLOS'].map((k, i) => ({ Kode: k, Label: k, Aktif: 'TRUE', Urutan: String(i) }))
  });
  const map = KD.petaImport(LAMPIRAN_A[0]);
  assert.deepEqual([map.no, map.tahun, map.pop, map.end, map.seg, map.status, map.nilai, map.ku, map.detil, map.pic, map.judul, map.pel], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, -1, -1]);
  assert.deepEqual(KD.tebakNilaiLama('BAST ON REVIEW', ref), { jenis: 'tahap', kode: 'REVIEW_CUST', tebak: false });
  assert.deepEqual(KD.tebakNilaiLama('KOMPULIR EVIDEN', ref).kode, 'KOMPULIR');
  assert.deepEqual(KD.tebakNilaiLama('SERTIM AR', ref), { jenis: 'tahap', kode: 'TAKEOUT' });
  assert.equal(KD.tebakNilaiLama('NUNGGU TTD', ref).jenis, 'lain');
  assert.equal(KD.tebakNilaiLama('SIRKULIR', ref).tebak, true);
  const rk = KD.ringkasImport(rowsDari(LAMPIRAN_A).map(x => x.r), map, ref);
  assert.equal(rk.nilai['KOMPULIR EVIDENCE'], 4);
  assert.deepEqual(Object.keys(rk.refBaru).sort(), ['Populasi:MARITIM', 'Populasi:TELKOMSEL']);
  const H = KD.periksaImport(rowsDari(LAMPIRAN_A), { map, nilai: {}, pic: { Edo: 'Edo', Unggul: 'Unggul', Baim: 'Baim', Alif: 'Alif' }, refBaru: { 'Populasi:TELKOMSEL': true }, ref, cfg: {}, cariNomor: () => null });
  const [permata, danamon, hexindo, wana, tsel, kosong, samudera] = H;
  assert.equal(permata.tahap, 'KOMPULIR'); assert.equal(permata.parsial, true);
  assert.deepEqual(permata.kend, [{ Jenis: 'REV_DOKUMEN', Keterangan: 'BAST Revisi, hanya dua lokasi diproses, 4 lokasi belum' }]);
  assert.equal(permata.nilai, '95352000'); assert.equal(permata.end, 'BANK PERMATA'); assert.equal(permata.pel, ''); assert.equal(permata.jc, 'BELUM');
  assert.equal(permata.judul, 'Kontrak BANK PERMATA'); assert.equal(permata.st, 'peringatan');
  assert.equal(danamon.tahap, 'REVIEW_CUST'); assert.equal(danamon.nilai, '29730240000'); assert.equal(danamon.ketBast, 'REVIEW ADMIN PRM');
  assert.equal(hexindo.tahap, 'KOMPULIR'); assert.equal(hexindo.kend.length, 0);
  assert.equal(wana.tahap, 'BAST_DONE', 'tahap paling maju');
  assert.equal(tsel.tahap, 'TAKEOUT'); assert.equal(tsel.pop, 'TELKOMSEL'); assert.equal(tsel.pic, ''); assert.equal(tsel.nilai, '780000000');
  assert.ok(tsel.info.some(x => /Langsung CLOSE/.test(x)));
  assert.equal(kosong.st, 'error');
  assert.deepEqual(samudera.kend, [{ Jenis: 'LAINNYA', Keterangan: 'NUNGGU TTD' }]); assert.equal(samudera.tahap, 'KOMPULIR'); assert.equal(samudera.pop, '');
  assert.ok(samudera.warn.some(x => /MARITIM/.test(x)));
  // pemetaan nilai bisa diubah di layar
  const H2 = KD.periksaImport(rowsDari(LAMPIRAN_A).slice(6), { map, nilai: { 'NUNGGU TTD': { jenis: 'tahap', kode: 'SIRKULIR' } }, pic: {}, ref, cfg: {}, cariNomor: () => null });
  assert.equal(H2[0].tahap, 'SIRKULIR'); assert.equal(H2[0].kend.length, 0);
});

test('import.simpan: Lampiran A → kontrak perlu verifikasi, tahap/kendala/parsial, CLOSE langsung, aging dari tanggal import, ref baru, nomor ada dilewati', () => {
  const { g, t } = siapkan();
  ['Edo', 'Unggul', 'Baim', 'Alif'].forEach((a, i) => userBaru(g, t, 'staf' + i, 'STAFF', a));
  // nomor Danamon sudah ada (beda penulisan)
  ok(g.api(t, 'kontrak.op', { op: 'kontrak.buat', data: { f: { NoKontrak: 'tel.0719-0488/hk.810/des-a1000000/2020 ', JudulKontrak: 'Sudah ada' } } }));
  const r = ok(g.api(t, 'import.simpan', payloadImport(g, t, LAMPIRAN_A)));
  assert.equal(r.dibuat.length, 5);
  assert.equal(r.dilewati, 1);
  assert.equal(r.gagal.length, 1);
  assert.deepEqual(r.refBaru, ['Populasi:TELKOMSEL']);
  assert.ok(r.ref, 'referensi terbaru ikut dikirim');
  assert.ok(g.tab('Ref_Populasi').some(x => x.Kode === 'TELKOMSEL'));
  assert.ok(!g.tab('Ref_Populasi').some(x => x.Kode === 'MARITIM'));
  const K = no => g.tab('Kontrak').find(k => k.NoKontrak === no);
  const B = kid => g.tab('BAST').filter(b => b.KontrakID === kid);
  const permata = K('TEL.0317-0016/P8/LG.270/DES-A2027000/2017');
  assert.equal(permata.PerluVerifikasi, 'TRUE'); assert.equal(permata.SumberAwal, 'IMPORT'); assert.equal(permata.PIC, 'Edo');
  assert.equal(permata.EndCustomer, 'BANK PERMATA'); assert.equal(permata.JenisCustomer, 'BELUM'); assert.equal(permata.JenisDok, 'KL');
  assert.equal(permata.TahapKontrak, 'KOMPULIR'); assert.equal(permata.KendalaUmum, 'REVISI DOKUMEN');
  assert.match(B(permata.KontrakID)[0].Keterangan, /^BAST parsial \(dari data lama\)/);
  assert.equal(g.tab('Kendala').find(x => x.KontrakID === permata.KontrakID).Jenis, 'REV_DOKUMEN');
  // aging mulai tanggal import
  const hariIni = g.ctx.Repo.sekarang().slice(0, 10);
  assert.equal(B(permata.KontrakID)[0].TglTahapMulai.slice(0, 10), hariIni);
  const tsel = K('WO/0188/TSAT/IX/2025');
  assert.equal(tsel.StatusKontrak, 'CLOSE'); assert.equal(tsel.TglClose.slice(0, 10), hariIni); assert.equal(tsel.PerluVerifikasi, 'TRUE');
  assert.equal(tsel.Populasi, 'TELKOMSEL'); assert.equal(tsel.PIC, ''); assert.equal(tsel.JenisDok, 'WO');
  assert.equal(K('TEL.0418-0152/P8/LG.270/DES-A2020000/2018').TahapKontrak, 'BAST_DONE');
  assert.equal(K('TEL.0820-0311/HK.810/DES-A1000000/2023').KendalaUmum, 'KENDALA LAINNYA');
  assert.equal(g.tab('Indeks').length, 6);
  const logImp = g.tab('Log').filter(l => l.Aksi === 'IMPORT_DATA_LAMA');
  assert.equal(logImp.length, 1); assert.match(logImp[0].Catatan, /5 diimport \(perlu verifikasi\), 1 dilewati, 1 error/);
  assert.ok(g.tab('Log').some(l => l.Aksi === 'BUAT_KONTRAK' && /import data lama FF_lama.xlsx baris 2/.test(l.Catatan)));
  // impor ulang file yang sama aman: semua terbaca sudah ada
  const r2 = ok(g.api(t, 'import.simpan', payloadImport(g, t, LAMPIRAN_A)));
  assert.equal(r2.dibuat.length, 0); assert.equal(r2.dilewati, 6);
  assert.equal(g.tab('Ref_Populasi').filter(x => x.Kode === 'TELKOMSEL').length, 1);
  // verifikasi lewat operasi biasa
  const kv = g.tab('Kontrak').find(k => k.KontrakID === permata.KontrakID);
  assert.equal(g.api(t, 'kontrak.op', { op: 'kontrak.verif', kid: kv.KontrakID, versi: kv.Version, bundle: { bast: B(kv.KontrakID), order: [], kend: g.tab('Kendala').filter(x => x.KontrakID === kv.KontrakID), alias: [] }, data: {} }).ok, true);
});

test('import oleh STAFF dengan izin tambahan: PIC = dirinya (tanpa pic.atur)', () => {
  const { g, t } = siapkan();
  userBaru(g, t, 'baim', 'STAFF', 'Baim');
  const ts = userBaru(g, t, 'edo', 'STAFF', 'Edo', ['kontrak.import']);
  const r = ok(g.api(ts, 'import.simpan', payloadImport(g, ts, LAMPIRAN_A.slice(0, 4), { refBaru: {} })));
  assert.equal(r.dibuat.length, 3);
  assert.deepEqual(g.tab('Kontrak').map(k => k.PIC), ['Edo', 'Edo', 'Edo']);
  assert.equal(g.tab('Ref_Populasi').length, 4);
});

test('dashboard.ringkas: update 7 hari per user dari Log, termasuk bantu; disimpan di cache 1 jam', () => {
  const { g, t } = siapkan();
  const ts = userBaru(g, t, 'edo', 'STAFF', 'Edo');
  const k = ok(g.api(t, 'kontrak.op', { op: 'kontrak.buat', data: { f: { NoKontrak: 'KL.1/2026', JudulKontrak: 'Satu', PIC: 'omPik' } } })).bundle;
  ok(g.api(ts, 'kontrak.op', { op: 'kontrak.ubah', kid: k.k.KontrakID, versi: k.k.Version, bundle: { bast: k.bast, order: k.order, kend: k.kend, alias: [] }, data: { f: { JudulKontrak: 'Satu!' } } }));
  const d = ok(g.api(ts, 'dashboard.ringkas'));
  assert.equal(d.hari.length, 7);
  const admin = d.user.find(u => u.username === 'admin'), edo = d.user.find(u => u.username === 'edo');
  assert.ok(admin.n[6] >= 2, 'buat kontrak + BAST hari ini');
  assert.equal(edo.alias, 'Edo'); assert.equal(edo.n[6], 1); assert.equal(edo.bantu, 1);
  assert.equal(edo.terakhir.aksi, 'UBAH_KONTRAK');
  assert.ok(!d.user.some(u => u.n.reduce((a, b) => a + b, 0) === 0));
  // dari cache: perubahan baru belum terlihat sampai disegarkan
  ok(g.api(ts, 'kontrak.op', { op: 'kontrak.buat', data: { f: { NoKontrak: 'KL.2/2026', JudulKontrak: 'Dua' } } }));
  assert.equal(ok(g.api(ts, 'dashboard.ringkas')).user.find(u => u.username === 'edo').n[6], 1);
  assert.ok(ok(g.api(ts, 'dashboard.ringkas', { segarkan: true })).user.find(u => u.username === 'edo').n[6] >= 3);
});
