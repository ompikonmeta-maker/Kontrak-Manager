// F2: aturan kontrak bersama (src/shared/kd.js) — status, tahap, Nilai Push, operasi, upload.
const test = require('node:test');
const assert = require('node:assert/strict');
const KD = require('../src/shared/kd.js');

const RAW = {
  tahap: [['KOMPULIR', 'Kompulir Eviden'], ['DRAFTING', 'Drafting Dokumen'], ['REVIEW_CUST', 'Draft Review Customer'], ['SIRKULIR', 'Sirkulir Dokumen'], ['BAST_DONE', 'BAST Done'], ['TAKEOUT', 'BAST Takeout / BAST Sertim AR']]
    .map(([Kode, Label], i) => ({ Kode, Label, Urutan: String(i + 1), Penutup: Kode === 'TAKEOUT' ? 'TRUE' : 'FALSE', BatasAgingHari: '14', Aktif: 'TRUE' })),
  kendala: [['REV_KONTRAK', 'Revisi Kontrak', 1], ['REV_DOKUMEN', 'Revisi Dokumen', 1], ['RETURN_CUST', 'Return Customer', 1], ['KENDALA_CUST', 'Kendala Sisi Customer', 0], ['LAINNYA', 'Kendala Lainnya', 0]]
    .map(([Kode, Label, r], i) => ({ Kode, Label, WajibKeterangan: 'TRUE', MemicuReopen: r ? 'TRUE' : 'FALSE', Aktif: 'TRUE', Urutan: String(i + 1) })),
  push: [['CLOSE', 'BAST TAKEOUT/SERTIM AR'], ['KENDALA:REV_KONTRAK', 'REVISI KONTRAK'], ['KENDALA:REV_DOKUMEN', 'REVISI DOKUMEN'], ['KENDALA:RETURN_CUST', 'RETURN CUSTOMER'],
    ['KENDALA:KENDALA_CUST', 'KENDALA CUSTOMER'], ['KENDALA:*', 'KENDALA LAINNYA'], ['SISA_LOKASI', 'BAST PARSIAL - MENUNGGU SISA LOKASI'], ['TAHAP:BAST_DONE', 'BAST DONE'],
    ['TAHAP:SIRKULIR', 'SIRKULIR DOKUMEN'], ['TAHAP:REVIEW_CUST', 'DRAFT REVIEW CUSTOMER'], ['TAHAP:DRAFTING', 'DRAFTING DOKUMEN'], ['TAHAP:KOMPULIR', 'KOMPULIR EVIDEN'], ['BELUM_ADA_BAST', 'BELUM DIPROSES']]
    .map(([Kondisi, Nilai], i) => ({ Urutan: String(i + 1), Kondisi, Nilai, Aktif: 'TRUE' })),
  jenisDok: ['KL', 'WO', 'SPK', 'PO'].map((Kode, i) => ({ Kode, Label: Kode, Aktif: 'TRUE', Urutan: String(i + 1) })),
  populasi: ['TREG', 'SDA', 'PRM', 'DIRECT'].map((Kode, i) => ({ Kode, Label: Kode, Aktif: 'TRUE', Urutan: String(i + 1) })),
  segment: ['LBCS', 'GOS', 'ENS', 'OLOS'].map((Kode, i) => ({ Kode, Label: Kode, Aktif: 'TRUE', Urutan: String(i + 1) })),
  dokTagih: [{ Kode: 'BAST', Label: 'BAST', Aktif: 'TRUE', Urutan: '1' }, { Kode: 'BAA', Label: 'BAA', Aktif: 'TRUE', Urutan: '2' }]
};
const ref = KD.siapkanRef(RAW);
const cfg = { TAHAP_REOPEN: 'DRAFTING', DOKTAGIH_DEFAULT_DIRECT: 'BAA', DOKTAGIH_DEFAULT_INDIRECT: 'BAST', DOKTAGIH_DEFAULT_BELUM: 'BAST' };
let seq = 0;
const ctx = (o = {}) => ({ user: 'edo', nama: 'Edo', alias: 'Edo', now: '2026-11-20 10:00:00', ref, cfg, izin: ['kontrak.lihat', 'kontrak.update', 'kontrak.daftar', 'kontrak.arsip', 'pic.atur'],
  idKontrak: () => 'K-' + String(++seq).padStart(6, '0'), ...o });
const buat = (f, extra = {}, c = ctx()) => KD.jalankan('kontrak.buat', null, { f: { NoKontrak: 'KL.1/2026', JudulKontrak: 'Uji', ...f }, ...extra }, c);

test('normKey & jenis customer (§5.7, §8.2)', () => {
  assert.equal(KD.normKey(' tel.0317 – 0016/P8. '), 'TEL.0317-0016/P8');
  assert.equal(KD.jenisCustomer('PT Telkom Indonesia (Persero) Tbk', 'telkom indonesia'), 'DIRECT');
  assert.equal(KD.jenisCustomer('PT Telkom Indonesia', 'Pemkab Sorong'), 'INDIRECT');
  assert.equal(KD.jenisCustomer('', 'Pemkab Sorong'), 'BELUM');
  assert.equal(KD.dokDefault('DIRECT', cfg), 'BAA');
  assert.equal(KD.dokDefault('BELUM', cfg), 'BAST');
});

test('buat kontrak: BAST-1 otomatis, dok tagih usulan, turunan & Nilai Push', () => {
  const r = buat({ NamaPelanggan: 'Bank Permata', EndCustomer: 'PT Bank Permata Tbk', NilaiKontrak: 'Rp 95,352,000.00', JumlahLokasi: '6' }, { orders: [{ JenisOrder: 'so', NoOrder: 'SO-1', JumlahLokasi: '6' }] });
  const b = r.bundle;
  assert.equal(b.k.NilaiKontrak, '95352000');
  assert.equal(b.k.JenisCustomer, 'DIRECT');
  assert.equal(b.k.JenisDok, 'KL');
  assert.equal(b.bast.length, 1);
  assert.equal(b.bast[0].BASTID, b.k.KontrakID + '-B1');
  assert.equal(b.bast[0].DokTagih, 'BAA');
  assert.equal(b.bast[0].KodeTahap, 'KOMPULIR');
  assert.equal(b.bast[0].CakupanOrder, 'SO-1');
  assert.equal(b.order[0].OrderID, b.k.KontrakID + '-O1');
  assert.equal(b.k.StatusKontrak, 'OPEN');
  assert.equal(b.k.TahapKontrak, 'KOMPULIR');
  assert.equal(b.k.KendalaUmum, 'KOMPULIR EVIDEN');
  assert.equal(b.k.Version, '1');
  assert.equal(r.riwayat.length, 1);
  assert.deepEqual(r.log.map(l => l.aksi), ['BUAT_KONTRAK', 'BUAT_BAST']);
});

test('validasi buat: nomor & judul wajib, nilai harus angka, SO dobel ditolak', () => {
  assert.throws(() => buat({ NoKontrak: '' }), /No. kontrak wajib/);
  assert.throws(() => buat({ JudulKontrak: ' ' }), /Judul kontrak wajib/);
  assert.throws(() => buat({ NilaiKontrak: 'sembilan juta' }), /harus angka/);
  assert.throws(() => buat({ JumlahLokasi: '0' }), /bilangan bulat/);
  assert.throws(() => buat({}, { orders: [{ JenisOrder: 'SO', NoOrder: 'A' }, { JenisOrder: 'SO', NoOrder: 'a ' }] }), /dobel/);
  assert.throws(() => buat({}, {}, ctx({ izin: ['kontrak.lihat'] })), e => e.kode === 'IZIN_DITOLAK');
});

test('STAFF tanpa pic.atur: PIC sementara = dirinya; ubah PIC ditolak', () => {
  const c = ctx({ izin: ['kontrak.update', 'kontrak.daftar'], alias: 'Edo' });
  const b = buat({ PIC: 'Unggul' }, {}, c).bundle;
  assert.equal(b.k.PIC, 'Edo');
  assert.throws(() => KD.jalankan('kontrak.pic', b, { PIC: 'Baim' }, c), e => e.kode === 'IZIN_DITOLAK');
  assert.throws(() => KD.jalankan('kontrak.ubah', b, { f: { PIC: 'Baim' } }, c), e => e.kode === 'IZIN_DITOLAK');
});

test('pindah tahap: riwayat, mundur wajib keterangan, penutup → CLOSE, close tidak bisa digeser', () => {
  let b = buat({}).bundle;
  const id = b.bast[0].BASTID;
  let r = KD.jalankan('bast.tahap', b, { id, ke: 'REVIEW_CUST' }, ctx());
  b = r.bundle;
  assert.equal(b.bast[0].KodeTahap, 'REVIEW_CUST');
  assert.equal(b.k.KendalaUmum, 'DRAFT REVIEW CUSTOMER');
  assert.equal(r.riwayat[0].KodeTahap, 'REVIEW_CUST');
  assert.throws(() => KD.jalankan('bast.tahap', b, { id, ke: 'KOMPULIR' }, ctx()), /keterangan/);
  b = KD.jalankan('bast.tahap', b, { id, ke: 'KOMPULIR', ket: 'eviden kurang' }, ctx()).bundle;
  b = KD.jalankan('bast.tahap', b, { id, ke: 'TAKEOUT' }, ctx({ now: '2026-11-25 09:00:00' })).bundle;
  assert.equal(b.bast[0].Status, 'CLOSE');
  assert.equal(b.k.StatusKontrak, 'CLOSE');
  assert.equal(b.k.TglClose, '2026-11-25 09:00:00');
  assert.equal(b.k.KendalaUmum, 'BAST TAKEOUT/SERTIM AR');
  assert.throws(() => KD.jalankan('bast.tahap', b, { id, ke: 'DRAFTING', ket: 'x' }, ctx()), e => e.kode === 'SUDAH_CLOSE');
});

test('parsial: CLOSE hanya bila cakupan ≥ jumlah lokasi; satu BAST tanpa cakupan = semua lokasi', () => {
  let b = buat({ JumlahLokasi: '6' }).bundle;
  const b1 = b.bast[0].BASTID;
  let x = KD.jalankan('bast.tahap', b, { id: b1, ke: 'TAKEOUT' }, ctx()).bundle;
  assert.equal(x.k.StatusKontrak, 'CLOSE', 'satu BAST tanpa cakupan menutup semua lokasi');
  b = KD.jalankan('bast.ubah', b, { id: b1, CakupanLokasi: '2' }, ctx()).bundle;
  b = KD.jalankan('bast.tahap', b, { id: b1, ke: 'TAKEOUT' }, ctx()).bundle;
  assert.equal(b.k.StatusKontrak, 'OPEN');
  assert.equal(b.k.SisaLokasi, '4');
  assert.equal(b.k.KendalaUmum, 'BAST PARSIAL - MENUNGGU SISA LOKASI');
  assert.throws(() => KD.jalankan('bast.tambah', b, { CakupanLokasi: '5' }, ctx()), /melebihi/);
  b = KD.jalankan('bast.tambah', b, { CakupanLokasi: '4' }, ctx()).bundle;
  assert.equal(b.bast[1].BASTID, b.k.KontrakID + '-B2');
  assert.equal(b.k.StatusKontrak, 'OPEN');
  assert.equal(b.k.TahapKontrak, 'KOMPULIR');
  b = KD.jalankan('bast.tahap', b, { id: b.bast[1].BASTID, ke: 'TAKEOUT' }, ctx()).bundle;
  assert.equal(b.k.StatusKontrak, 'CLOSE');
  // tanpa BAST selalu OPEN
  const nb = buat({}, { buatBast: false }).bundle;
  assert.equal(nb.k.StatusKontrak, 'OPEN');
  assert.equal(nb.k.KendalaUmum, 'BELUM DIPROSES');
});

test('kendala: Nilai Push urutan atas menang, detil + (+n); kendala biasa di BAST close ditolak; reopen', () => {
  let b = buat({}).bundle;
  const id = b.bast[0].BASTID;
  assert.throws(() => KD.jalankan('kendala.buka', b, { bastId: id, Jenis: 'LAINNYA' }, ctx()), /Keterangan/);
  b = KD.jalankan('kendala.buka', b, { bastId: id, Jenis: 'KENDALA_CUST', Keterangan: 'PIC customer cuti' }, ctx()).bundle;
  assert.equal(b.k.KendalaUmum, 'KENDALA CUSTOMER');
  assert.equal(b.k.KendalaDetil, 'PIC customer cuti');
  b = KD.jalankan('kendala.buka', b, { bastId: id, Jenis: 'REV_DOKUMEN', Keterangan: 'salah nilai' }, ctx({ now: '2026-11-20 11:00:00' })).bundle;
  assert.equal(b.k.KendalaUmum, 'REVISI DOKUMEN');
  assert.equal(b.k.KendalaDetil, 'salah nilai (+1)');
  assert.equal(b.kend[1].KendalaID, id + '-K2');
  b = KD.jalankan('kendala.tutup', b, { id: id + '-K2' }, ctx()).bundle;
  b = KD.jalankan('kendala.tutup', b, { id: id + '-K1', catatan: 'beres' }, ctx()).bundle;
  assert.equal(b.k.KendalaUmum, 'KOMPULIR EVIDEN');
  assert.throws(() => KD.jalankan('kendala.tutup', b, { id: id + '-K1' }, ctx()), /sudah selesai/);
  // close lalu reopen
  b = KD.jalankan('bast.tahap', b, { id, ke: 'TAKEOUT' }, ctx()).bundle;
  assert.throws(() => KD.jalankan('kendala.buka', b, { bastId: id, Jenis: 'KENDALA_CUST', Keterangan: 'x' }, ctx()), e => e.kode === 'SUDAH_CLOSE');
  const r = KD.jalankan('kendala.buka', b, { bastId: id, Jenis: 'RETURN_CUST', Keterangan: 'dikembalikan customer' }, ctx());
  b = r.bundle;
  assert.equal(b.bast[0].Siklus, '2');
  assert.equal(b.bast[0].KodeTahap, 'DRAFTING');
  assert.equal(b.k.StatusKontrak, 'OPEN');
  assert.equal(b.k.TglClose, '');
  assert.equal(b.k.KendalaUmum, 'RETURN CUSTOMER');
  assert.ok(r.log.some(l => l.aksi === 'REOPEN'));
});

test('koreksi nomor → alias KOREKSI; arsip butuh alasan & mengunci perubahan; log "bantu"', () => {
  let b = buat({ NoKontrak: 'KL-0555/TSAT/2026', PIC: 'Unggul' }).bundle;
  const r = KD.jalankan('kontrak.ubah', b, { f: { NoKontrak: 'KL-0555/TSAT/2026-REV' }, alasan: 'salah ketik' }, ctx());
  assert.equal(r.alias.length, 1);
  assert.equal(r.alias[0].AliasNorm, 'KL-0555/TSAT/2026');
  assert.equal(r.alias[0].Sumber, 'KOREKSI');
  assert.equal(r.bundle.k.NoKontrakNorm, 'KL-0555/TSAT/2026-REV');
  assert.match(r.log[0].catatan, /bantu \(PIC Unggul\)/);
  b = r.bundle;
  assert.throws(() => KD.jalankan('kontrak.arsip', b, {}, ctx()), /Alasan/);
  b = KD.jalankan('kontrak.arsip', b, { alasan: 'dobel' }, ctx()).bundle;
  assert.throws(() => KD.jalankan('bast.tahap', b, { id: b.bast[0].BASTID, ke: 'DRAFTING' }, ctx()), e => e.kode === 'DIARSIPKAN');
  b = KD.jalankan('kontrak.unarsip', b, {}, ctx()).bundle;
  assert.equal(b.k.Arsip, 'FALSE');
  const kosong = KD.jalankan('kontrak.ubah', b, { f: { JudulKontrak: b.k.JudulKontrak } }, ctx());
  assert.equal(kosong.kosong, true);
  assert.equal(kosong.bundle.k.Version, b.k.Version, 'tanpa perubahan, versi tetap');
});

test('beda(): hanya baris yang berubah', () => {
  const b = buat({}).bundle;
  const b2 = KD.jalankan('kendala.buka', b, { bastId: b.bast[0].BASTID, Jenis: 'LAINNYA', Keterangan: 'x' }, ctx()).bundle;
  const d = KD.beda(b, b2);
  assert.deepEqual(Object.keys(d.tambah), ['Kendala']);
  assert.deepEqual(Object.keys(d.ubah), ['Kontrak']);
  const d0 = KD.beda(null, b);
  assert.deepEqual(Object.keys(d0.tambah).sort(), ['BAST', 'Kontrak']);
});

test('celah aturan & field kurang', () => {
  assert.deepEqual(KD.celahAturan(ref), []);
  const r2 = KD.siapkanRef({ ...RAW, push: RAW.push.filter(p => p.Kondisi !== 'TAHAP:SIRKULIR') });
  assert.deepEqual(KD.celahAturan(r2), ['Tahap Sirkulir Dokumen (SIRKULIR)']);
  const b = buat({ NamaPelanggan: 'A' }).bundle;
  assert.deepEqual(KD.fieldKurang(b, {}), ['EndCustomer', 'NilaiKontrak', 'Segment', 'Populasi', 'OrderInternal']);
});

test('baca rupiah & tanggal Excel', () => {
  assert.equal(KD.bacaRupiah('Rp 95,352,000.00').v, '95352000');
  assert.equal(KD.bacaRupiah('1.250.000.000').v, '1250000000');
  assert.equal(KD.bacaRupiah('1.250.000,50').v, '1250001');
  assert.equal(KD.bacaRupiah(2480000000).v, '2480000000');
  assert.ok(KD.bacaRupiah('sekitar 900 juta').e);
  assert.equal(KD.bacaTanggal(46329).v, '2026-11-03');
  assert.equal(KD.bacaTanggal('03/11/2026').v, '2026-11-03');
  assert.equal(KD.bacaTanggal('2026-11-03').v, '2026-11-03');
  assert.ok(KD.bacaTanggal('31/02/2026').e);
  assert.equal(KD.hariSejak('2026-11-03 08:00:00', '2026-11-19'), 16);
  assert.equal(KD.bucket(16), 'stale');
});

test('periksa upload: baru, peringatan, sudah ada (termasuk nomor lama), error', () => {
  const aoa = [['No. Kontrak *', 'Judul Kontrak *', 'Customer', 'End Customer', 'Nilai Kontrak', 'Jumlah Lokasi', 'PIC', 'Tahap Awal BAST-1', 'Tgl Masuk Tahap', 'Kendala', 'Keterangan Kendala'],
    ['KL.1/2026', 'A', 'X', 'X', 1000, 2, 'Edo', 'Kompulir Eviden', 46329, '', ''],
    ['KL.2/2026', 'B', '', 'Y', '', '', 'Budi', '', '', '', ''],
    ['TEL 0317-0016', 'C', '', '', '', '', '', '', '', '', ''],
    ['KL.3/2026', '', '', '', '', '', '', '', '', '', ''],
    ['kl.1/2026 ', 'D', '', '', 'banyak', '', '', 'Selesai', '01/01/2099', 'Revisi Dokumen', '']];
  const rows = KD.barisDariAoa(aoa, KD.KOL_UPLOAD);
  assert.equal(rows.length, 5);
  const hasil = KD.periksaUpload(rows, { ref, cfg, pic: ['Edo', 'Unggul'], bolehPic: true, alias: 'omPik', hariIni: '2026-11-20',
    cariNomor: nk => nk === 'TEL0317-0016' ? { KontrakID: 'K-000001', NoKontrak: 'TEL.0317-0016', viaAlias: true, lokasi: 'AKTIF' } : null });
  assert.deepEqual(hasil.map(o => o.st), ['baru', 'peringatan', 'ada', 'error', 'error']);
  assert.equal(hasil[0].tgl, '2026-11-03');
  assert.equal(hasil[0].docFinal, 'BAA');
  assert.match(hasil[1].warn.join('|'), /PIC "Budi"/);
  assert.match(hasil[3].err[0], /Judul/);
  assert.equal(hasil[4].err.length, 5, hasil[4].err.join('|'));
  const so = KD.periksaSO([{ baris: 2, no: 'KL.1/2026', j: 'SO', ono: 'SO-9' }, { baris: 3, no: 'KL.9', j: 'XO', ono: '' }], hasil, () => null);
  assert.deepEqual(so.map(x => x.st), ['ok', 'error']);
  assert.equal(so[1].err.length, 3);
  assert.deepEqual(KD.perubahanUpload({ pel: 'BANK', judul: 'C', nilai: '' }, { NamaPelanggan: '', JudulKontrak: 'C' }), [['NamaPelanggan', '', 'BANK']]);
});
