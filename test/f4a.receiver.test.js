// F4a: script penerima (dijalankan apa adanya di sheet tiruan) + aturan sinkron bersama (SKD).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createUnit } = require('./helpers/fakeunit');
const SKD = require('../src/shared/sync.js');

const BILLCOM = () => ({
  'OKT 2026': [['LAPORAN'], [], ['NO', 'NO KONTRAK', 'NAMA CUSTOMER', 'STATUS BAST FF']],
  'NOV 2026': [['LAPORAN BILLCOM'], ['posisi 27 Nov'], ['NO', 'NO KONTRAK', 'NAMA CUSTOMER', 'STATUS BAST FF', 'KETERANGAN FF', 'TGL UPDATE FF'],
    [1, 'KL.0001/TSAT/2026', 'PT Telkom', 'BAST ON REVIEW', 'x', ''], [2, 'KL.0002/TSAT/2026', 'Bank BRI', '', '', ''], [3, 'KL.0001/TSAT/2026 ', 'PT Telkom', 'BAST ON REVIEW', '', '']],
  REKAP: [['ringkasan']]
});
const minta = (u, o) => u.post(JSON.stringify(Object.assign({ secret: 'rahasia-1' }, o)));

test('penerima: kode rahasia wajib & harus cocok; info berisi versi, tab, status pencatat', () => {
  const kosong = createUnit({ tabs: BILLCOM() });
  assert.equal(kosong.post(JSON.stringify({ secret: 'x', aksi: 'info' })).kode, 'BELUM_DIISI');
  const u = createUnit({ tabs: BILLCOM(), secret: 'rahasia-1', nama: 'Billcom Telkomsat 2026' });
  assert.equal(minta(u, { secret: 'salah', aksi: 'info' }).kode, 'KODE_SALAH');
  assert.equal(u.post('bukan json').kode, 'FORMAT');
  let i = minta(u, { aksi: 'info' });
  assert.equal(i.ok, true); assert.equal(i.versi, 1); assert.equal(i.nama, 'Billcom Telkomsat 2026');
  assert.deepEqual(i.tabs.map(x => x.nama), ['OKT 2026', 'NOV 2026', 'REKAP']);
  assert.equal(i.pencatat, false);
  u.ctx.pasang(); u.ctx.pasang();
  i = minta(u, { aksi: 'info' });
  assert.equal(i.pencatat, true); assert.equal(u.triggers.length, 1, 'pasang() aman dijalankan ulang');
  assert.equal(minta(u, { aksi: 'hapusSemua' }).kode, 'AKSI');
});

test('penerima: baca header & kolom yang diminta saja, plus posisi sel berformula', () => {
  const u = createUnit({ tabs: BILLCOM(), secret: 'rahasia-1' });
  u.tab('NOV 2026').f['5,4'] = '=VLOOKUP(B5;REF!A:C;3;0)';
  const r = minta(u, { aksi: 'baca', tab: 'NOV 2026', header: 15, dari: 4, kolom: [2, 4], formula: [4] });
  assert.equal(r.header.length, 6); assert.equal(r.header[2][3], 'STATUS BAST FF');
  assert.deepEqual(r.kolom[2], ['KL.0001/TSAT/2026', 'KL.0002/TSAT/2026', 'KL.0001/TSAT/2026 ']);
  assert.deepEqual(r.formula[4], [5]);
  assert.equal(r.kolom[3], undefined, 'kolom lain tidak dikirim');
  assert.match(minta(u, { aksi: 'baca', tab: 'DES 2026', header: 15 }).pesan, /Tab "DES 2026" tidak ada/);
});

test('penerima: tulis hanya sel yang diminta; judul/urutan berubah → dibatalkan seluruhnya; rumus tidak ditimpa', () => {
  const u = createUnit({ tabs: BILLCOM(), secret: 'rahasia-1' }), sh = u.tab('NOV 2026');
  const req = sel => ({ aksi: 'tulis', tab: 'NOV 2026', hdrRow: 3, harap: [{ c: 2, judul: 'NO KONTRAK' }, { c: 4, judul: 'STATUS BAST FF' }],
    kunci: { c: 2, baris: { 4: 'KL.0001/TSAT/2026', 6: 'KL.0001/TSAT/2026' } }, sel, pantau: { judul: ['STATUS BAST FF'], hdr: { 'NOV 2026': 3 } } });
  let r = minta(u, req([{ r: 4, c: 4, v: 'DRAFT REVIEW CUSTOMER' }, { r: 6, c: 4, v: 'DRAFT REVIEW CUSTOMER' }]));
  assert.equal(r.ok, true); assert.equal(r.ditulis, 2);
  assert.equal(sh.sel(4, 4), 'DRAFT REVIEW CUSTOMER'); assert.equal(sh.sel(6, 4), 'DRAFT REVIEW CUSTOMER'); assert.equal(sh.sel(4, 5), 'x', 'kolom lain tidak disentuh');
  // sel berformula dilewati
  sh.f['6,4'] = '=A1';
  r = minta(u, req([{ r: 4, c: 4, v: 'BAST DONE' }, { r: 6, c: 4, v: 'BAST DONE' }]));
  assert.equal(r.ditulis, 1); assert.deepEqual(r.dilewati, [{ r: 6, c: 4, alasan: 'FORMULA' }]); assert.equal(sh.f['6,4'], '=A1');
  delete sh.f['6,4'];
  // judul kolom diganti → batal, tidak ada yang ditulis
  sh.set(3, 4, 'STATUS BAST');
  r = minta(u, req([{ r: 4, c: 4, v: 'SIRKULIR DOKUMEN' }]));
  assert.equal(r.kode, 'KOLOM_BERUBAH'); assert.equal(sh.sel(4, 4), 'BAST DONE');
  sh.set(3, 4, 'STATUS BAST FF');
  // urutan baris berubah → batal
  const a = sh.data[3]; sh.data[3] = sh.data[4]; sh.data[4] = a;
  r = minta(u, req([{ r: 4, c: 4, v: 'SIRKULIR DOKUMEN' }]));
  assert.equal(r.kode, 'URUTAN_BERUBAH'); assert.equal(sh.sel(5, 4), 'BAST DONE');
});

test('penerima: pencatat edit manual mencatat kolom milik FF saja, dengan pelaku & waktu', () => {
  const u = createUnit({ tabs: BILLCOM(), secret: 'rahasia-1' });
  u.ctx.pasang();
  minta(u, { aksi: 'tulis', tab: 'NOV 2026', hdrRow: 3, harap: [], kunci: { c: 2, baris: {} }, sel: [], pantau: { judul: ['STATUS BAST FF', 'KETERANGAN FF'], hdr: { 'NOV 2026': 3 } } });
  u.edit('NOV 2026', 4, 4, 'BAST DONE', 'rina@contoh.id');
  u.edit('NOV 2026', 4, 3, 'PT Telkom Indonesia', 'rina@contoh.id');   // kolom BACA: tidak dicatat
  u.edit('NOV 2026', 3, 4, 'STATUS', 'rina@contoh.id');                // baris judul: tidak dicatat
  const e = minta(u, { aksi: 'edit', sejak: '' }).edit;
  assert.equal(e.length, 1);
  assert.deepEqual([e[0].tab, e[0].r, e[0].c, e[0].lama, e[0].baru, e[0].oleh], ['NOV 2026', 4, 4, 'DRAFT REVIEW CUSTOMER'.length ? 'BAST ON REVIEW' : '', 'BAST DONE', 'rina@contoh.id']);
  assert.equal(minta(u, { aksi: 'edit', sejak: e[0].w }).edit.length, 0);
});

test('SKD: judul header, pemetaan, validasi wizard, pola tab bulanan', () => {
  const hdr = ['NO', 'No. Kontrak', 'NAMA CUSTOMER', 'STATUS BAST FF', 'KETERANGAN FF', 'TGL UPDATE FF'];
  assert.equal(SKD.cariBarisHeader(BILLCOM()['NOV 2026'], 'NO KONTRAK', []), 3);
  const kol = [{ Field: 'KUNCI', Arah: 'KUNCI', JudulHeader: 'NO KONTRAK' }, { Field: 'KENDALA_UMUM', Arah: 'TULIS', JudulHeader: 'STATUS BAST FF' }, { Field: 'PELANGGAN', Arah: 'BACA', JudulHeader: 'NAMA PELANGGAN', AliasHeader: 'NAMA CUSTOMER' }];
  assert.deepEqual(SKD.petakan(hdr, kol).pos, { KUNCI: 2, KENDALA_UMUM: 4, PELANGGAN: 3 });
  // kolom disisipkan: tetap ketemu lewat judul
  assert.equal(SKD.petakan(['NO', 'BARU', 'NO KONTRAK', 'X', 'STATUS BAST FF'], kol).pos.KENDALA_UMUM, 5);
  // judul hilang / ganda → error (tab dilewati)
  assert.match(SKD.petakan(['NO KONTRAK', 'STATUS BAST'], kol).err[0], /tidak ditemukan/);
  assert.match(SKD.petakan(['NO KONTRAK', 'STATUS BAST FF', 'Status BAST FF'], kol).err[0], /lebih dari sekali/);
  assert.match(SKD.petakan(['NO KONTRAK', 'STATUS BAST FF'], kol).warn[0], /NAMA PELANGGAN/);
  // validasi wizard
  assert.deepEqual(SKD.validasi(kol), []);
  assert.ok(SKD.validasi([{ Field: 'KENDALA_UMUM', Arah: 'TULIS', JudulHeader: 'X' }]).some(e => /kunci/.test(e)));
  assert.ok(SKD.validasi([{ Field: 'KUNCI', Arah: 'KUNCI', JudulHeader: 'NO' }]).some(e => /minimal satu kolom TULIS/.test(e)));
  assert.ok(SKD.validasi(kol.concat([{ Field: 'KENDALA_DETIL', Arah: 'TULIS', JudulHeader: 'status bast ff' }])).some(e => /lebih dari satu field/.test(e)));
  assert.ok(SKD.validasi(kol.concat([{ Field: 'KENDALA_DETIL', Arah: 'TULIS', JudulHeader: 'NAMA PELANGGAN' }])).some(e => /TULIS sekaligus/.test(e)));
  // tab bulanan
  const tabs = ['JAN 2026', 'NOV 2026', 'DES 2025', 'REKAP', 'Mei 2026'];
  assert.equal(SKD.pilihTab(tabs, { ModeTab: 'TERBARU', TabNama: 'MMM YYYY' }), 'NOV 2026');
  assert.equal(SKD.pilihTab(tabs, { ModeTab: 'TERBARU', TabNama: 'MMM YYYY', CaraTerbaru: 'POSISI_TERAKHIR' }), 'Mei 2026');
  assert.equal(SKD.pilihTab(tabs.concat(['DES 2026']), { ModeTab: 'TERBARU', TabNama: 'MMM YYYY' }), 'DES 2026');
  assert.equal(SKD.pilihTab(tabs, { ModeTab: 'FIXED', TabNama: 'REKAP' }), 'REKAP');
  assert.equal(SKD.pilihTab(tabs, { ModeTab: 'FIXED', TabNama: 'HILANG' }), '');
  assert.deepEqual(SKD.tabCocok(['11-2026', '13-2026', 'NOV 26'], 'MM-YYYY').map(x => x.nama), ['11-2026']);
});

test('SKD.rencana: tulis, sama, rumus, diubah luar, update FF menang, CLOSE selesai, multi nomor, belum terdaftar, tanggal update', () => {
  const ref = { T: { REVIEW_CUST: { Label: 'Draft Review Customer', Penutup: false }, TAKEOUT: { Label: 'BAST Takeout', Penutup: true } } };
  const B = (no, ku, det, st, tahap) => ({ k: { KontrakID: 'K-' + no, NoKontrak: no, NoKontrakNorm: SKD.normKey(no), KendalaUmum: ku, KendalaDetil: det, StatusKontrak: st || 'OPEN', TahapKontrak: tahap || 'REVIEW_CUST' }, bast: [] });
  const DB = { 'KL.1': B('KL.1', 'DRAFT REVIEW CUSTOMER', 'review'), 'KL.2': B('KL.2', 'BAST DONE', ''), 'KL.3': B('KL.3', 'BAST TAKEOUT/SERTIM AR', '', 'CLOSE', 'TAKEOUT'),
              'KL.4': B('KL.4', 'SIRKULIR DOKUMEN', ''), 'KL.5': B('KL.5', null, '') };
  const cari = nk => { const b = Object.values(DB).find(x => x.k.NoKontrakNorm === nk); return b ? { status: 'AKTIF', bundle: b } : nk === 'KL.9' ? { status: 'ARSIP', kid: 'K-9' } : null; };
  const baris = [
    { r: 4, kunci: 'KL.1', sel: { KENDALA_UMUM: { v: 'BAST ON REVIEW' }, KENDALA_DETIL: { v: 'review' }, TGL_UPDATE: { v: '01/11/2026' } } },
    { r: 5, kunci: 'kl.1 ', sel: { KENDALA_UMUM: { v: 'DRAFT REVIEW CUSTOMER' }, KENDALA_DETIL: { v: 'review' }, TGL_UPDATE: { v: '20/11/2026' } } },
    { r: 6, kunci: 'KL.2', sel: { KENDALA_UMUM: { v: '#N/A', formula: true }, KENDALA_DETIL: { v: '' } } },
    { r: 7, kunci: 'KL.3', sel: { KENDALA_UMUM: { v: 'BAST TAKEOUT/SERTIM AR' }, KENDALA_DETIL: { v: '' } } },
    { r: 8, kunci: 'KL.4', sel: { KENDALA_UMUM: { v: 'BAST DONE' }, KENDALA_DETIL: { v: '' } } },
    { r: 9, kunci: 'WO-2026-0118 / WO-2026-0119', sel: {} }, { r: 10, kunci: 'KL.77', sel: {} }, { r: 11, kunci: 'TOTAL', sel: {} }, { r: 12, kunci: '', sel: {} },
    { r: 13, kunci: 'KL.9', sel: {} }, { r: 14, kunci: 'KL.5', sel: { KENDALA_UMUM: { v: '' }, KENDALA_DETIL: { v: '' } } }];
  const jejak = { 'KL.3|KENDALA_UMUM': 'BAST TAKEOUT/SERTIM AR', 'KL.3|KENDALA_DETIL': '', 'KL.4|KENDALA_UMUM': 'SIRKULIR DOKUMEN' };
  const R = SKD.rencana({ baris, tulis: ['KENDALA_UMUM', 'KENDALA_DETIL', 'TGL_UPDATE'], cari, jejak, ref, hariIni: '2026-11-27', fmtTgl: 'dd/MM/yyyy' });
  const st = Object.fromEntries(R.rows.map(r => [r.r, r.st]));
  assert.deepEqual(st, { 4: 'TULIS', 5: 'SAMA', 6: 'FORMULA', 7: 'SELESAI', 8: 'LUAR', 9: 'MULTI', 10: 'BARU', 11: 'BUKAN', 13: 'ARSIP', 14: 'TANPA_ATURAN' });
  assert.deepEqual(R.tulis.map(x => [x.r, x.field, x.v]), [[4, 'KENDALA_UMUM', 'DRAFT REVIEW CUSTOMER'], [4, 'TGL_UPDATE', '27/11/2026']]);
  assert.deepEqual(R.alarm.map(a => a.j).sort(), ['DIUBAH_LUAR', 'FORMULA', 'MULTI_NOMOR', 'TANPA_ATURAN']);
  // status di SKM berubah setelah diubah luar → update FF menang
  DB['KL.4'].k.KendalaUmum = 'BAST DONE KE AR';
  const R2 = SKD.rencana({ baris: [baris[4]], tulis: ['KENDALA_UMUM'], cari, jejak, ref, hariIni: '2026-11-27' });
  assert.equal(R2.rows[0].st, 'TULIS'); assert.match(R2.rows[0].sel[0].why, /update FF menang/);
  // kontrak reopen (CLOSE → OPEN): ditulis lagi
  DB['KL.3'].k.StatusKontrak = 'OPEN'; DB['KL.3'].k.KendalaUmum = 'REVISI DOKUMEN';
  assert.equal(SKD.rencana({ baris: [baris[3]], tulis: ['KENDALA_UMUM'], cari, jejak, ref }).rows[0].st, 'TULIS');
});
