// F2: uji server dari ujung ke ujung (dist/Code.gs + Apps Script tiruan).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGas } = require('./helpers/fakegas');

function siapkan() {
  const g = createGas();
  g.ctx.setup();
  const pw = g.logs.join('\n').match(/password sementara: (\S+)/)[1];
  const t = g.api(null, 'login', { username: 'admin', password: pw }).data.token;
  assert.equal(g.api(t, 'gantiPassword', { baru: 'Rahasia2026' }).ok, true);
  assert.equal(g.api(t, 'users.simpan', { username: 'admin', nama: 'Admin awal', alias: 'omPik', role: 'ADMIN' }).ok, true);
  return { g, t };
}
function userBaru(g, t, username, role, alias) {
  const r = g.api(t, 'users.simpan', { baru: true, username, nama: username, alias, role });
  assert.equal(r.ok, true, JSON.stringify(r));
  const tk = g.api(null, 'login', { username, password: r.data.passwordAcak }).data.token;
  assert.equal(g.api(tk, 'gantiPassword', { baru: 'Rahasia2026x' }).ok, true);
  return tk;
}
const ok = r => { assert.equal(r.ok, true, JSON.stringify(r)); return r.data; };
function bundle(g, t, kid) {
  const snap = ok(g.api(t, 'data.muat')).snap, obj = (tab) => snap.tabs[tab].r.map(r => Object.fromEntries(snap.tabs[tab].c.map((c, i) => [c, r[i]])));
  const k = obj('Kontrak').find(x => x.KontrakID === kid);
  const feed = ok(g.api(t, 'data.perubahan', { sejak: snap.seq }));
  let b = k ? { k, bast: obj('BAST').filter(x => x.KontrakID === kid), order: obj('OrderInternal').filter(x => x.KontrakID === kid), kend: obj('Kendala').filter(x => x.KontrakID === kid), alias: obj('KontrakAlias').filter(x => x.KontrakID === kid) } : null;
  (feed.entri || []).forEach(e => { if (e.bundle && e.kid === kid) b = e.bundle; (e.bundles || []).forEach(x => { if (x.k.KontrakID === kid) b = x; }); });
  return b;
}
const op = (g, t, b, nama, data) => g.api(t, 'kontrak.op', { op: nama, kid: b.k.KontrakID, versi: b.k.Version, bundle: { bast: b.bast, order: b.order, kend: b.kend, alias: b.alias }, data });
const buat = (g, t, f = {}, extra = {}) => g.api(t, 'kontrak.op', { op: 'kontrak.buat', data: { f: { NoKontrak: 'KL.0001/TSAT/2026', JudulKontrak: 'Internet 10 titik', ...f }, ...extra } });

test('kontrak: buat → tersimpan di semua tab + Indeks + Log + feed; nomor dobel ditolak (juga nomor lama)', () => {
  const { g, t } = siapkan();
  const r = ok(buat(g, t, { NamaPelanggan: 'PT Telkom Indonesia', EndCustomer: 'Pemkab Sorong', NilaiKontrak: '1.250.000.000', JumlahLokasi: '10' },
    { orders: [{ JenisOrder: 'SO', NoOrder: 'SO-2026-1', JumlahLokasi: '10' }] }));
  const kid = r.bundle.k.KontrakID;
  assert.equal(kid, 'K-000001');
  assert.equal(g.tab('Kontrak')[0].JenisCustomer, 'INDIRECT');
  assert.equal(g.tab('Kontrak')[0].NilaiKontrak, '1250000000');
  assert.equal(g.tab('BAST')[0].BASTID, 'K-000001-B1');
  assert.equal(g.tab('BAST')[0].DokTagih, 'BAST');
  assert.equal(g.tab('OrderInternal')[0].NoOrder, 'SO-2026-1');
  assert.equal(g.tab('RiwayatTahap')[0].KodeTahap, 'KOMPULIR');
  assert.deepEqual([g.tab('Indeks')[0].KontrakID, g.tab('Indeks')[0].Lokasi, g.tab('Indeks')[0].StatusKontrak], [kid, 'AKTIF', 'OPEN']);
  assert.ok(g.tab('Log').some(l => l.Aksi === 'BUAT_KONTRAK' && l.EntitasID === kid));
  assert.ok(r.seq >= 1);
  // dobel (beda penulisan spasi/huruf)
  const d = buat(g, t, { NoKontrak: 'kl.0001/tsat/2026 ' });
  assert.equal(d.kode, 'DOBEL'); assert.match(d.pesan, /K-000001/);
  // koreksi nomor → nomor lama tetap dianggap dobel
  const b = bundle(g, t, kid);
  ok(op(g, t, b, 'kontrak.ubah', { f: { NoKontrak: 'KL.0001/TSAT/2026-R' }, alasan: 'salah ketik' }));
  assert.equal(g.tab('KontrakAlias')[0].AliasNorm, 'KL.0001/TSAT/2026');
  assert.equal(g.tab('Indeks')[0].NoKontrak, 'KL.0001/TSAT/2026-R');
  const d2 = buat(g, t, { NoKontrak: 'KL.0001/TSAT/2026' });
  assert.equal(d2.kode, 'DOBEL'); assert.match(d2.pesan, /nomor lama/);
});

test('operasi: tahap, kendala, reopen; versi lama → KONFLIK; data.perubahan membawa bundle terbaru', () => {
  const { g, t } = siapkan();
  const kid = ok(buat(g, t)).bundle.k.KontrakID;
  let b = bundle(g, t, kid);
  const seq0 = ok(g.api(t, 'data.perubahan', { sejak: 0 })).seq;
  const r1 = ok(op(g, t, b, 'bast.tahap', { id: kid + '-B1', ke: 'SIRKULIR' }));
  assert.equal(g.tab('BAST')[0].KodeTahap, 'SIRKULIR');
  assert.equal(g.tab('Kontrak')[0].KendalaUmum, 'SIRKULIR DOKUMEN');
  assert.equal(g.tab('Indeks')[0].TahapKontrak, 'SIRKULIR');
  // versi lama
  const k = op(g, t, b, 'bast.tahap', { id: kid + '-B1', ke: 'BAST_DONE' });
  assert.equal(k.kode, 'KONFLIK');
  // feed
  const f = ok(g.api(t, 'data.perubahan', { sejak: seq0 }));
  assert.equal(f.entri.length, 1); assert.equal(f.entri[0].bundle.bast[0].KodeTahap, 'SIRKULIR');
  b = r1.bundle;
  b = ok(op(g, t, b, 'kendala.buka', { bastId: kid + '-B1', Jenis: 'KENDALA_CUST', Keterangan: 'PIC cuti' })).bundle;
  assert.equal(g.tab('Kendala')[0].KendalaID, kid + '-B1-K1');
  assert.equal(g.tab('Kontrak')[0].KendalaUmum, 'KENDALA CUSTOMER');
  b = ok(op(g, t, b, 'kendala.tutup', { id: kid + '-B1-K1' })).bundle;
  b = ok(op(g, t, b, 'bast.tahap', { id: kid + '-B1', ke: 'TAKEOUT' })).bundle;
  assert.equal(g.tab('Kontrak')[0].StatusKontrak, 'CLOSE');
  assert.equal(g.tab('Indeks')[0].StatusKontrak, 'CLOSE');
  b = ok(op(g, t, b, 'kendala.buka', { bastId: kid + '-B1', Jenis: 'REV_DOKUMEN', Keterangan: 'revisi nilai' })).bundle;
  assert.equal(g.tab('BAST')[0].Siklus, '2');
  assert.equal(g.tab('BAST')[0].KodeTahap, 'DRAFTING');
  assert.equal(g.tab('Kontrak')[0].StatusKontrak, 'OPEN');
  assert.equal(g.tab('RiwayatTahap').length, 4);
  // riwayat + log per kontrak
  const rw = ok(g.api(t, 'kontrak.riwayat', { kid }));
  assert.equal(rw.riwayat.length, 4);
  assert.ok(rw.log.some(l => l.aksi === 'REOPEN'));
});

test('izin: VIEWER tidak bisa mengubah; STAFF membuat kontrak dengan PIC = dirinya', () => {
  const { g, t } = siapkan();
  const ts = userBaru(g, t, 'staf01', 'STAFF', 'Edo'), tv = userBaru(g, t, 'lihat01', 'VIEWER', '');
  const r = ok(buat(g, ts, { PIC: 'Unggul' }));
  assert.equal(r.bundle.k.PIC, 'Edo');
  const b = bundle(g, tv, r.bundle.k.KontrakID);
  assert.ok(b, 'viewer bisa memuat data');
  assert.equal(op(g, tv, b, 'bast.tahap', { id: b.bast[0].BASTID, ke: 'DRAFTING' }).kode, 'IZIN_DITOLAK');
  assert.equal(op(g, ts, b, 'kontrak.pic', { PIC: 'Baim' }).kode, 'IZIN_DITOLAK');
  assert.equal(op(g, ts, b, 'kontrak.arsip', { alasan: 'x' }).kode, 'IZIN_DITOLAK');
});

test('jumlah panggilan Sheet: pindah tahap ≤ 14 operasi; muat data dari cache tanpa membaca sheet', () => {
  const { g, t } = siapkan();
  const kid = ok(buat(g, t)).bundle.k.KontrakID;
  const b = bundle(g, t, kid);
  const o = g.ops.n;
  ok(op(g, t, b, 'bast.tahap', { id: kid + '-B1', ke: 'DRAFTING' }));
  const n = g.ops.n - o;
  assert.ok(n <= 14, 'pindah tahap memakai ' + n + ' operasi Sheet');
  ok(g.api(t, 'data.muat'));
  const o2 = g.ops.n; ok(g.api(t, 'data.muat')); assert.equal(g.ops.n - o2, 0, 'snapshot dari cache');
});

test('indeks baris pulih sendiri bila baris di sheet bergeser (mis. diedit manual)', () => {
  const { g, t } = siapkan();
  ok(buat(g, t, { NoKontrak: 'A-1' })); ok(buat(g, t, { NoKontrak: 'A-2' }));
  const sh = g.db().getSheetByName('Kontrak');
  sh.data.splice(1, 0, sh.data[0].map(() => ''));   // sisipkan baris kosong di atas: semua baris turun satu
  sh.maxRows++;
  const b = bundle(g, t, 'K-000002');
  ok(op(g, t, b, 'kontrak.ubah', { f: { JudulKontrak: 'Judul baru' } }));
  assert.equal(g.tab('Kontrak').find(k => k.KontrakID === 'K-000002').JudulKontrak, 'Judul baru');
  assert.equal(g.tab('Kontrak').find(k => k.KontrakID === 'K-000001').JudulKontrak, 'Internet 10 titik', 'baris lain tidak tertimpa');
});

test('upload: buat banyak, SO ikut, peringatan & error, ulang = sudah ada, mode perbarui', () => {
  const { g, t } = siapkan();
  ok(buat(g, t, { NoKontrak: 'TEL.0219-0003/2019', NamaPelanggan: '' }));
  const rows = [
    { baris: 2, no: 'KL.0112/TSAT/I/2026', judul: 'Puskesmas', pel: 'Dinkes NTT', end: 'Dinkes NTT', nilai: 2480000000, lok: 40, pic: 'omPik', tahap: 'Kompulir Eviden', tgl: 46329 },
    { baris: 3, no: 'WO/0377/TSAT/X/2026', judul: 'Backhaul', pel: 'PT Telkom Indonesia', end: 'PT Telkomsel', nilai: 'Rp 5,940,000,000.00', lok: 12, tahap: 'Draft Review Customer', kend: 'Kendala Sisi Customer', ket: 'PIC cuti' },
    { baris: 4, no: 'SPK-0045/TSAT/2026', judul: 'Sawit', end: 'PT Sawit', nilai: '1.250.000.000' },
    { baris: 5, no: 'TEL.0219-0003/2019', judul: 'lama', pel: 'PT HEXINDO' },
    { baris: 6, no: 'KL.0118/TSAT/II/2026', judul: '' },
    { baris: 7, no: 'kl.0112/tsat/i/2026', judul: 'dobel' }
  ];
  const so = [{ baris: 2, no: 'KL.0112/TSAT/I/2026', j: 'SO', ono: 'SO-7310', lok: 40 }, { baris: 3, no: 'WO/0377/TSAT/X/2026', j: 'MI', ono: 'MI-1' }, { baris: 4, no: 'X', j: 'SO', ono: 'S' }];
  const r = ok(g.api(t, 'upload.simpan', { mode: 'lewati', file: 'uji.xlsx', rows, so }));
  assert.deepEqual(r.dibuat.map(x => x.baris), [2, 3, 4]);
  assert.equal(r.dilewati, 1);
  assert.deepEqual(r.gagal.map(x => x.baris), [6, 7]);
  assert.equal(r.so, 2);
  assert.equal(r.bundles.length, 3);
  const k = g.tab('Kontrak').find(x => x.NoKontrak === 'WO/0377/TSAT/X/2026');
  assert.equal(k.SumberAwal, 'UPLOAD'); assert.equal(k.KendalaUmum, 'KENDALA CUSTOMER'); assert.equal(k.TahapKontrak, 'REVIEW_CUST');
  assert.equal(g.tab('BAST').find(b => b.KontrakID === k.KontrakID).DokTagih, 'BAST');
  const kp = g.tab('Kontrak').find(x => x.NoKontrak === 'KL.0112/TSAT/I/2026');
  assert.equal(g.tab('BAST').find(b => b.KontrakID === kp.KontrakID).TglTahapMulai, '2026-11-03 08:00:00');
  assert.equal(kp.PIC, 'omPik');
  assert.equal(g.tab('Indeks').length, 4);
  assert.ok(g.tab('Log').some(l => l.Aksi === 'UPLOAD_EXCEL'));
  // ulang: semua yang tadi dibuat sekarang "sudah ada"
  const r2 = ok(g.api(t, 'upload.simpan', { mode: 'lewati', file: 'uji.xlsx', rows: rows.slice(0, 3), so: [] }));
  assert.equal(r2.dibuat.length, 0); assert.equal(r2.dilewati, 3);
  // perbarui: hanya kolom yang diisi
  const r3 = ok(g.api(t, 'upload.simpan', { mode: 'perbarui', file: 'uji.xlsx', rows: [rows[3]], so: [{ baris: 2, no: 'TEL.0219-0003/2019', j: 'SO', ono: 'SO-BARU' }] }));
  assert.equal(r3.diperbarui.length, 1);
  const kh = g.tab('Kontrak').find(x => x.NoKontrak === 'TEL.0219-0003/2019');
  assert.equal(kh.NamaPelanggan, 'PT HEXINDO'); assert.equal(kh.JudulKontrak, 'lama');
  assert.ok(g.tab('OrderInternal').some(o => o.NoOrder === 'SO-BARU' && o.KontrakID === kh.KontrakID));
  // SO/MI di kolom tab Kontrak (C18)
  const r4 = ok(g.api(t, 'upload.simpan', { mode: 'lewati', file: 'baru.xlsx', rows: [{ baris: 2, no: 'KL.SOMI/2026', judul: 'SO MI', so: 'SO-A, SO-B', mi: 'MI-A' }], so: [] }));
  assert.equal(r4.so, 3);
  assert.deepEqual(g.tab('OrderInternal').filter(o => o.KontrakID === r4.dibuat[0].KontrakID).map(o => o.JenisOrder + ' ' + o.NoOrder), ['SO SO-A', 'SO SO-B', 'MI MI-A']);
  assert.equal(g.tab('BAST').find(b => b.KontrakID === r4.dibuat[0].KontrakID).CakupanOrder, 'SO-A, SO-B, MI-A');
  // cek nomor untuk pratinjau browser
  const c = ok(g.api(t, 'upload.cekNomor', { nomor: ['WO/0377/TSAT/X/2026', 'TIDAK/ADA'] }));
  assert.deepEqual(Object.keys(c.ada), ['WO/0377/TSAT/X/2026']);
});

test('arsip tahunan: CLOSE > 90 hari dipindah; tetap bisa dicari, dibuka, dan di-reopen', () => {
  let { g, t } = siapkan();
  ok(buat(g, t, { NoKontrak: 'KL.LAMA/2026', NamaPelanggan: 'Bank Rakyat Indonesia', EndCustomer: 'Bank Rakyat Indonesia' }));
  ok(buat(g, t, { NoKontrak: 'KL.AKTIF/2026' }));
  let b = bundle(g, t, 'K-000001');
  b = ok(op(g, t, b, 'bast.tahap', { id: 'K-000001-B1', ke: 'TAKEOUT' })).bundle;
  b = ok(op(g, t, b, 'kontrak.ubah', { f: { NoKontrak: 'KL.LAMA/2026-R' } })).bundle;   // punya nomor lama
  const tahunClose = g.tab('Kontrak')[0].TglClose.slice(0, 4);
  // belum 90 hari: tidak dipindah
  assert.equal(ok(g.api(t, 'arsip.jalankan')).dipindah, 0);
  g.clock.tambah(95 * 864e5);
  t = g.api(null, 'login', { username: 'admin', password: 'Rahasia2026' }).data.token;   // sesi lama sudah habis
  const seqSebelum = ok(g.api(t, 'data.perubahan', { sejak: 0 })).seq;
  const r = ok(g.api(t, 'arsip.jalankan'));
  assert.equal(r.dipindah, 1);
  assert.equal(g.tab('Kontrak').length, 1, 'tinggal kontrak aktif');
  assert.equal(g.tab('BAST').length, 1);
  const arsip = g.fileBernama('SKM_ARSIP_' + tahunClose);
  assert.ok(arsip, 'file arsip per tahun dibuat');
  assert.equal(arsip.getSheetByName('Kontrak').data.length, 2);
  assert.equal(g.tab('Indeks').find(x => x.KontrakID === 'K-000001').Lokasi, 'ARSIP_' + tahunClose);
  assert.ok(ok(g.api(t, 'data.perubahan', { sejak: seqSebelum })).entri.some(e => e.muatUlang), 'browser diminta memuat ulang');
  assert.equal(ok(g.api(t, 'data.muat')).snap.tabs.Kontrak.r.length, 1);
  // operasi pada kontrak arsip → diarahkan
  assert.equal(op(g, t, b, 'kontrak.verif', {}).kode, 'DI_ARSIP');
  // cari: teks, dan nomor lama
  assert.deepEqual(ok(g.api(t, 'arsip.cari', { q: 'rakyat' })).hasil.map(x => x.KontrakID), ['K-000001']);
  const viaAlias = ok(g.api(t, 'arsip.cari', { q: 'KL.LAMA/2026' })).hasil;
  assert.equal(viaAlias.length, 1); assert.equal(viaAlias[0].aliasCocok.NoAsli, 'KL.LAMA/2026');
  // buka
  const o = ok(g.api(t, 'arsip.buka', { kid: 'K-000001' }));
  assert.equal(o.bundle.k.StatusKontrak, 'CLOSE'); assert.equal(o.bundle.bast.length, 1); assert.equal(o.bundle.alias.length, 1); assert.equal(o.riwayat.length, 2);
  // reopen: tanpa keterangan ditolak, data arsip tetap utuh
  assert.equal(g.api(t, 'arsip.reopen', { kid: 'K-000001', Jenis: 'REV_DOKUMEN', Keterangan: '' }).ok, false);
  assert.equal(arsip.getSheetByName('Kontrak').data.filter(r => r[0]).length, 2);
  const ro = ok(g.api(t, 'arsip.reopen', { kid: 'K-000001', Jenis: 'RETURN_CUST', Keterangan: 'dikembalikan customer', tahapReopen: 'REVIEW_CUST' }));
  assert.equal(ro.bundle.k.StatusKontrak, 'OPEN');
  assert.equal(ro.bundle.bast[0].Siklus, '2');
  assert.equal(ro.bundle.bast[0].KodeTahap, 'REVIEW_CUST');
  assert.equal(g.tab('Kontrak').length, 2);
  assert.equal(g.tab('Indeks').find(x => x.KontrakID === 'K-000001').Lokasi, 'AKTIF');
  assert.equal(arsip.getSheetByName('Kontrak').data.filter(r => r && r[0]).length, 1, 'baris di arsip dihapus (tinggal header)');
  assert.equal(g.tab('RiwayatTahap').filter(x => x.KontrakID === 'K-000001').length, 3);
  assert.ok(g.tab('Log').some(l => l.Aksi === 'REOPEN_DARI_ARSIP'));
  // bisa diubah lagi seperti biasa
  const b2 = bundle(g, t, 'K-000001');
  ok(op(g, t, b2, 'kendala.tutup', { id: b2.kend[0].KendalaID }));
});

test('pengaturan: aturan Nilai Push dihitung ulang; tahap aktif dengan BAST OPEN tidak bisa dinonaktifkan; pindah massal', () => {
  const { g, t } = siapkan();
  ok(buat(g, t, { NoKontrak: 'P-1' })); ok(buat(g, t, { NoKontrak: 'P-2' }));
  const ref = ok(g.api(t, 'data.ref')).ref;
  const push = ref.push.map(p => p.Kondisi === 'TAHAP:KOMPULIR' ? { ...p, Nilai: 'KOMPULIR EVIDENCE' } : p);
  const r = ok(g.api(t, 'pengaturan.push', { list: push }));
  assert.equal(r.berubah, true); assert.equal(r.dihitungUlang, 2);
  assert.ok(g.tab('Kontrak').every(k => k.KendalaUmum === 'KOMPULIR EVIDENCE'));
  assert.equal(g.api(t, 'pengaturan.push', { list: [...push, { Kondisi: 'TAHAP:TIDAKADA', Nilai: 'X', Aktif: 'TRUE' }] }).kode, 'VALIDASI');
  // tahap baru + nonaktifkan KOMPULIR (masih dipakai)
  const tahap = ref.tahap.map(x => ({ ...x }));
  const nonaktif = tahap.map(x => x.Kode === 'KOMPULIR' ? { ...x, Aktif: 'FALSE' } : x);
  assert.equal(g.api(t, 'pengaturan.tahap', { list: nonaktif }).kode, 'MASIH_DIPAKAI');
  assert.equal(g.api(t, 'pengaturan.tahap', { list: tahap.map(x => ({ ...x, Penutup: 'FALSE' })) }).kode, 'VALIDASI');
  assert.match(g.api(t, 'pengaturan.tahap', { list: tahap.slice(1) }).pesan, /tidak boleh dihapus/);
  const tambah = [...tahap.slice(0, 1), { Kode: 'VERIF_AR', Label: 'Verifikasi AR', Penutup: 'FALSE', BatasAgingHari: '7', Aktif: 'TRUE' }, ...tahap.slice(1)];
  ok(g.api(t, 'pengaturan.tahap', { list: tambah }));
  assert.equal(g.tab('Ref_Tahap')[1].Kode, 'VERIF_AR'); assert.equal(g.tab('Ref_Tahap')[1].Urutan, '2');
  const pindah = ok(g.api(t, 'pengaturan.pindahTahap', { dari: 'KOMPULIR', ke: 'VERIF_AR' }));
  assert.equal(pindah.dipindah, 2);
  assert.ok(g.tab('BAST').every(b => b.KodeTahap === 'VERIF_AR'));
  ok(g.api(t, 'pengaturan.tahap', { list: tambah.map(x => x.Kode === 'KOMPULIR' ? { ...x, Aktif: 'FALSE' } : x) }));
  // celah aturan: VERIF_AR belum punya aturan → sistem.cek memperingatkan
  const cek = ok(g.api(t, 'sistem.cek')).hasil.find(h => /Nilai Push/.test(h.nama));
  assert.equal(cek.ok, false); assert.match(cek.catatan, /Verifikasi AR/);
  // referensi & kendala
  const pop = ref.populasi.concat([{ Kode: 'TELKOMSEL', Label: 'Telkomsel', Aktif: 'TRUE' }]);
  ok(g.api(t, 'pengaturan.ref', { jenis: 'populasi', list: pop }));
  assert.equal(g.tab('Ref_Populasi').length, 5);
  assert.match(g.api(t, 'pengaturan.ref', { jenis: 'dokTagih', list: ref.dokTagih.map(d => ({ ...d, Aktif: d.Kode === 'BAA' ? 'FALSE' : 'TRUE' })) }).pesan, /BAST dan BAA/);
  ok(g.api(t, 'pengaturan.kendala', { list: ref.kendala.concat([{ Kode: 'IZIN_LOKASI', Label: 'Izin lokasi', WajibKeterangan: 'TRUE', MemicuReopen: 'FALSE', Aktif: 'TRUE' }]) }));
  assert.equal(g.tab('Ref_Kendala').length, 6);
  // config baru divalidasi
  assert.equal(g.api(t, 'config.simpan', { key: 'TAHAP_REOPEN', nilai: 'TAKEOUT' }).kode, 'VALIDASI');
  assert.equal(g.api(t, 'config.simpan', { key: 'AGING_BATAS', nilai: '14,7,30' }).kode, 'VALIDASI');
  ok(g.api(t, 'config.simpan', { key: 'AGING_BATAS', nilai: '5, 10, 20' }));
  assert.equal(g.tab('Config').find(c => c.Key === 'AGING_BATAS').Nilai, '5,10,20');
});

test('template & laporan Excel dibuat lewat Google Sheet sementara yang langsung dibuang', () => {
  const { g, t } = siapkan();
  const r = ok(g.api(t, 'upload.template'));
  assert.equal(r.nama, 'Template_Upload_Kontrak_SKM.xlsx');
  assert.match(Buffer.from(r.base64, 'base64').toString(), /^XLSX:https:\/\/docs\.google\.com\/spreadsheets\/d\/.+\/export\?format=xlsx$/);
  assert.equal(g.fetches[0][1].headers.Authorization, 'Bearer token-uji');
  const tmp = Object.values(g.files).find(f => /^SKM_sementara_template/.test(f.name));
  assert.deepEqual(tmp.sheets.map(s => s.name), ['Petunjuk', 'Kontrak', 'Referensi'], 'SO/MI ada di tab Kontrak, bukan tab sendiri');
  assert.ok(tmp.getSheetByName('Kontrak').validations >= 8, 'dropdown terpasang');
  assert.equal(g.drive[tmp.id].trashed, true);
  const l = ok(g.api(t, 'upload.laporan', { tabs: [{ nama: 'Kontrak error', aoa: [['Baris', 'Masalah'], [6, 'Judul kosong']] }] }));
  assert.ok(l.base64);
});

test('log per bulan & migrasi Log F1 ke file Log', () => {
  const { g, t } = siapkan();
  const l = ok(g.api(t, 'log.list', {}));
  assert.ok(l.entri.some(e => e.aksi === 'LOGIN'));
  assert.ok(l.daftarBulan.length >= 1);
  assert.equal(ok(g.api(t, 'log.list', { bulan: '2020-01' })).entri.length, 0);
  // simulasi database F1: ada tab Log lama di SKM_DB
  const db = g.db(), lama = db.insertSheet('Log');
  lama.data = [g.ctx.Repo.KOL_LOG, ['2026-10-05 08:00:00', 'admin', 'LOGIN', 'Users', 'admin', '', '', '', '', 'BERHASIL'], ['2026-11-01 09:00:00', 'admin', 'UBAH_IZIN', 'Ref_Role', 'STAFF', '', '', '', '', 'BERHASIL']];
  g.props.SKEMA_TERPASANG = '1';
  g.ctx.Repo.ubah('_Meta', 'SKEMA_VERSI', { Nilai: '1' });
  g.baru(); g.ctx.doGet();
  assert.equal(g.props.SKEMA_TERPASANG, '3');
  const f = g.fileBernama('SKM_LOG_2026');
  assert.ok(f.getSheetByName('Log-2026-10').data.some(r => r[2] === 'LOGIN'));
  assert.ok(db.getSheetByName('Log'), 'tab Log lama dibiarkan sebagai cadangan');
  assert.match(g.tab('_Meta').find(m => m.Key === 'LOG_F1_DISALIN').Nilai, /2 baris/);
  assert.equal(ok(g.api(t, 'log.list', { bulan: '2026-10' })).entri.length >= 1, true);
});
