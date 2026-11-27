// F4a: target, wizard (tes koneksi, header), Cek saja, Update ke GSheet, pengaman kolom — dengan script penerima asli di sheet tiruan.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGas } = require('./helpers/fakegas');
const { createUnit } = require('./helpers/fakeunit');

const URL = 'https://script.google.com/macros/s/AKfycbUNIT_BILLCOM/exec';
const ok = r => { assert.equal(r.ok, true, JSON.stringify(r)); return r.data; };
function billcom() {
  return createUnit({ url: URL, secret: 'rahasia-billcom', nama: 'Billcom Telkomsat 2026', tabs: {
    'OKT 2026': [['LAPORAN'], [], ['NO', 'NO KONTRAK', 'NAMA CUSTOMER', 'STATUS BAST FF', 'KETERANGAN FF', 'TGL UPDATE FF']],
    'NOV 2026': [['LAPORAN BILLCOM NOVEMBER'], ['posisi data'], ['NO', 'NO KONTRAK', 'NAMA CUSTOMER', 'STATUS BAST FF', 'KETERANGAN FF', 'TGL UPDATE FF'],
      [1, 'KL.0001/TSAT/2026', 'PT Telkom', 'BAST ON REVIEW', 'lama', '01/11/2026'],
      [2, 'KL.0002/TSAT/2026', 'Bank BRI', '', '', ''],
      [3, 'kl.0001/tsat/2026 ', 'PT Telkom', 'BAST ON REVIEW', '', ''],
      [4, 'KL.0099/TSAT/2026', 'PT Baru', '', '', ''],
      [5, 'WO-2026-0118 / WO-2026-0119', 'PT Dua', '', '', ''],
      [6, 'KL.0003/TSAT/2026', 'PT Rumus', '', '', ''],
      ['', 'TOTAL', '', '', '', '']],
    REKAP: [['rekap']] } });
}
function siapkan() {
  const unit = billcom();
  const g = createGas({ units: [unit] }); g.ctx.setup();
  const pw = g.logs.join('\n').match(/password sementara: (\S+)/)[1];
  const t = g.api(null, 'login', { username: 'admin', password: pw }).data.token;
  ok(g.api(t, 'gantiPassword', { baru: 'Rahasia2026' }));
  ok(g.api(t, 'users.simpan', { username: 'admin', nama: 'Admin', alias: 'omPik', role: 'ADMIN' }));
  for (let i = 1; i <= 3; i++) ok(g.api(t, 'kontrak.op', { op: 'kontrak.buat', data: { f: { NoKontrak: 'KL.000' + i + '/TSAT/2026', JudulKontrak: 'Kontrak ' + i, NamaPelanggan: 'PT Telkom', EndCustomer: 'Bank BRI', PIC: 'omPik' }, tahapAwal: i === 1 ? 'REVIEW_CUST' : 'KOMPULIR', ketBast: i === 1 ? 'review admin' : '' } }));
  unit.tab('NOV 2026').f['9,4'] = '=VLOOKUP(B9;REF!A:C;3;0)';   // baris KL.0003: kolom STATUS BAST FF berisi rumus
  return { g, t, unit };
}
const KOLOM = [{ Field: 'KUNCI', Arah: 'KUNCI', JudulHeader: 'NO KONTRAK' }, { Field: 'KENDALA_UMUM', Arah: 'TULIS', JudulHeader: 'STATUS BAST FF' },
  { Field: 'KENDALA_DETIL', Arah: 'TULIS', JudulHeader: 'KETERANGAN FF' }, { Field: 'TGL_UPDATE', Arah: 'TULIS', JudulHeader: 'TGL UPDATE FF' }, { Field: 'PELANGGAN', Arah: 'BACA', JudulHeader: 'NAMA CUSTOMER' }];
const TARGET = { Nama: 'Billcom Telkomsat 2026', WebAppUrl: URL, ModeTab: 'TERBARU', TabNama: 'MMM YYYY', FormatTanggal: 'dd/MM/yyyy' };
function buatTarget(g, t) { return ok(g.api(t, 'target.simpan', { target: TARGET, kolom: KOLOM, rahasia: 'rahasia-billcom' })).id; }
const sel = (unit, r, c) => unit.tab('NOV 2026').sel(r, c);
const bundle = (g, kid) => { const k = g.tab('Kontrak').find(x => x.KontrakID === kid); return { k, bast: g.tab('BAST').filter(b => b.KontrakID === kid), order: [], kend: g.tab('Kendala').filter(x => x.KontrakID === kid), alias: [] }; };
const op = (g, t, kid, nama, data) => { const b = bundle(g, kid); return ok(g.api(t, 'kontrak.op', { op: nama, kid, versi: b.k.Version, bundle: { bast: b.bast, order: [], kend: b.kend, alias: [] }, data })); };

test('wizard: script penerima, kode rahasia, tes koneksi, judul kolom; simpan target divalidasi; rahasia tidak di DB', () => {
  const { g, t, unit } = siapkan();
  const s = ok(g.api(t, 'target.script'));
  assert.match(s.kode, /var SECRET = 'ISI-KODE-RAHASIA';/); assert.equal(s.versi, 1);
  assert.equal(ok(g.api(t, 'target.rahasiaBaru')).rahasia.length, 24);
  assert.equal(g.api(t, 'target.tes', { url: 'https://contoh.com/exec', rahasia: 'x' }).kode, 'VALIDASI');
  assert.equal(g.api(t, 'target.tes', { url: URL, rahasia: 'salah' }).kode, 'KODE_RAHASIA');
  const i = ok(g.api(t, 'target.tes', { url: URL, rahasia: 'rahasia-billcom' }));
  assert.equal(i.nama, 'Billcom Telkomsat 2026'); assert.deepEqual(i.tabs.map(x => x.nama), ['OKT 2026', 'NOV 2026', 'REKAP']); assert.equal(i.pencatat, false);
  const h = ok(g.api(t, 'target.header', { url: URL, rahasia: 'rahasia-billcom', tab: 'NOV 2026' }));
  assert.equal(h.header[2][3], 'STATUS BAST FF');
  // validasi
  assert.match(g.api(t, 'target.simpan', { target: TARGET, kolom: KOLOM.filter(k => k.Arah !== 'TULIS'), rahasia: 'r' }).pesan, /minimal satu kolom TULIS/);
  assert.match(g.api(t, 'target.simpan', { target: TARGET, kolom: KOLOM.concat([{ Field: 'TAHAP', Arah: 'TULIS', JudulHeader: 'status bast ff' }]), rahasia: 'r' }).pesan, /lebih dari satu field/);
  assert.match(g.api(t, 'target.simpan', { target: TARGET, kolom: KOLOM }).pesan, /Kode rahasia wajib/);
  const id = buatTarget(g, t);
  assert.equal(id, 'T01');
  assert.equal(g.tab('Target')[0].Nama, 'Billcom Telkomsat 2026');
  assert.equal(g.tab('TargetKolom').length, 5);
  assert.equal(g.props.RAHASIA_T01, 'rahasia-billcom');
  assert.ok(!JSON.stringify(g.db().sheets.map(s2 => s2.data)).includes('rahasia-billcom'), 'kode rahasia tidak tersimpan di SKM_DB');
  assert.ok(!g.tab('Log').some(l => JSON.stringify(l).includes('rahasia-billcom')), 'kode rahasia tidak masuk Log');
  assert.ok(g.tab('Log').some(l => l.Aksi === 'BUAT_TARGET'));
  assert.equal(unit.tab('NOV 2026').sel(4, 4), 'BAST ON REVIEW', 'wizard tidak menulis apa pun');
  // status target ikut ke browser, tanpa URL & rahasia
  const ref = ok(g.api(t, 'data.ref'));
  assert.equal(ref.targets[0].Nama, 'Billcom Telkomsat 2026'); assert.equal(ref.targets[0].WebAppUrl, undefined);
});

test('Cek saja tidak menulis; Update menulis hanya kolom FF; titik awal; jejak sel & riwayat push; Cek ulang → sudah sama', () => {
  const { g, t, unit } = siapkan(), id = buatTarget(g, t);
  const sebelum = JSON.stringify(unit.tab('NOV 2026').data);
  const c = ok(g.api(t, 'target.cek', { id }));
  assert.equal(c.tab, 'NOV 2026'); assert.equal(c.hdrRow, 3); assert.equal(c.titikAwal, true);
  assert.deepEqual(c.huruf, { KUNCI: 'B', KENDALA_UMUM: 'D', KENDALA_DETIL: 'E', TGL_UPDATE: 'F', PELANGGAN: 'C' });
  const st = Object.fromEntries(c.rows.map(r => [r.r, r.st]));
  assert.deepEqual(st, { 4: 'TULIS', 5: 'TULIS', 6: 'TULIS', 7: 'BARU', 8: 'MULTI', 9: 'FORMULA', 10: 'BUKAN' });
  assert.ok(c.alarm.some(a => a.j === 'FORMULA') && c.alarm.some(a => a.j === 'MULTI_NOMOR'));
  assert.equal(JSON.stringify(unit.tab('NOV 2026').data), sebelum, 'Cek saja tidak mengubah sheet');
  assert.equal(g.logTab('Sinkron').slice(-1)[0].Jenis, 'CEK');
  // Update
  const u = ok(g.api(t, 'target.update', { id }));
  const hariIni = g.ctx.Repo.sekarang().slice(0, 10).split('-').reverse().join('/');
  assert.equal(sel(unit, 4, 4), 'DRAFT REVIEW CUSTOMER'); assert.equal(sel(unit, 6, 4), 'DRAFT REVIEW CUSTOMER', 'baris berulang (periode tagih) dapat nilai sama');
  assert.equal(sel(unit, 4, 5), 'review admin'); assert.equal(sel(unit, 4, 6), hariIni);
  assert.equal(sel(unit, 5, 4), 'KOMPULIR EVIDEN');
  assert.equal(sel(unit, 4, 3), 'PT Telkom', 'kolom BACA tidak pernah ditulis');
  assert.equal(unit.tab('NOV 2026').f['9,4'], '=VLOOKUP(B9;REF!A:C;3;0)', 'sel berformula tidak ditimpa');
  assert.equal(sel(unit, 7, 4), '', 'nomor belum terdaftar tidak ditulis');
  assert.equal(u.ditulis, 8);
  assert.equal(g.tab('Target')[0].TabTerakhirDipakai, 'NOV 2026');
  const jj = g.tab('JejakSel');
  assert.ok(jj.some(j => j.NoKontrakNorm === 'KL.0001/TSAT/2026' && j.Field === 'KENDALA_UMUM' && j.NilaiDitulis === 'DRAFT REVIEW CUSTOMER' && j.Baris));
  assert.ok(!jj.some(j => j.Field === 'TGL_UPDATE'), 'tanggal update tidak dijejak');
  const push = g.logTab('Push');
  assert.equal(push.length, 8); assert.ok(push.some(p => p.Baris === '4' && p.Field === 'KENDALA_UMUM' && p.NilaiLama === 'BAST ON REVIEW' && p.NilaiBaru === 'DRAFT REVIEW CUSTOMER'));
  assert.equal(g.logTab('Sinkron').slice(-1)[0].SelDitulis, '8');
  assert.ok(g.tab('Log').some(l => l.Aksi === 'SINKRON_UPDATE'));
  // pencatat edit dikirimi daftar kolom FF
  assert.deepEqual(JSON.parse(unit.props.PANTAU).judul, ['STATUS BAST FF', 'KETERANGAN FF', 'TGL UPDATE FF']);
  // cek ulang: tidak ada yang ditulis lagi
  const c2 = ok(g.api(t, 'target.cek', { id }));
  assert.equal(c2.n.tulis, 0); assert.equal(c2.titikAwal, false);
  // posisi kontrak untuk panel detail
  const p = ok(g.api(t, 'target.posisi', { kid: 'K-000001' }));
  assert.deepEqual(p.posisi[0].Baris, ['4', '6']); assert.equal(p.posisi[0].Nilai.KENDALA_UMUM, 'DRAFT REVIEW CUSTOMER'); assert.ok(p.push.length >= 3);
});

test('edit manual tidak ditimpa sampai status SKM berubah; kontrak CLOSE tidak ditulis lagi; reopen ditulis lagi', () => {
  const { g, t, unit } = siapkan(), id = buatTarget(g, t);
  ok(g.api(t, 'target.update', { id }));
  unit.edit('NOV 2026', 5, 4, 'BAST DONE', 'rina@contoh.id');          // KL.0002 diubah orang unit
  const c = ok(g.api(t, 'target.cek', { id }));
  assert.equal(c.rows.find(r => r.r === 5).st, 'LUAR');
  assert.ok(c.alarm.some(a => a.j === 'DIUBAH_LUAR' && /"KOMPULIR EVIDEN" → "BAST DONE"/.test(a.txt)));
  ok(g.api(t, 'target.update', { id }));
  assert.equal(sel(unit, 5, 4), 'BAST DONE', 'tidak ditimpa');
  // status di SKM berubah → update FF menang
  const b2 = bundle(g, 'K-000002');
  op(g, t, 'K-000002', 'bast.tahap', { id: b2.bast[0].BASTID, ke: 'SIRKULIR' });
  ok(g.api(t, 'target.update', { id }));
  assert.equal(sel(unit, 5, 4), 'SIRKULIR DOKUMEN');
  // CLOSE: ditulis sekali, lalu berhenti
  op(g, t, 'K-000002', 'bast.tahap', { id: b2.bast[0].BASTID, ke: 'TAKEOUT' });
  ok(g.api(t, 'target.update', { id }));
  assert.equal(sel(unit, 5, 4), 'BAST TAKEOUT/SERTIM AR');
  assert.equal(ok(g.api(t, 'target.cek', { id })).rows.find(r => r.r === 5).st, 'SELESAI');
  unit.edit('NOV 2026', 5, 4, 'LUNAS', 'ar@contoh.id');
  ok(g.api(t, 'target.update', { id }));
  assert.equal(sel(unit, 5, 4), 'LUNAS', 'kontrak CLOSE: perubahan luar dibiarkan');
  // reopen → ditulis lagi
  const b3 = bundle(g, 'K-000002');
  op(g, t, 'K-000002', 'kendala.buka', { bastId: b3.bast[0].BASTID, Jenis: 'REV_DOKUMEN', Keterangan: 'Revisi lokasi' });
  ok(g.api(t, 'target.update', { id }));
  assert.equal(sel(unit, 5, 4), 'REVISI DOKUMEN');
  assert.equal(sel(unit, 5, 5), 'Revisi lokasi');
});

test('pengaman kolom: kolom disisipkan tetap benar; judul diganti → tab dilewati; urutan berubah saat menulis → batal; Web app tanpa akses', () => {
  const { g, t, unit } = siapkan(), id = buatTarget(g, t), sh = unit.tab('NOV 2026');
  // pemilik menyisipkan kolom sebelum kolom FF
  sh.data.forEach(r => r.splice(2, 0, r === sh.data[2] ? 'AM' : ''));
  delete sh.f['9,4']; sh.f['9,5'] = '=VLOOKUP(B9;REF!A:C;3;0)';
  const c = ok(g.api(t, 'target.cek', { id }));
  assert.equal(c.huruf.KENDALA_UMUM, 'E');
  ok(g.api(t, 'target.update', { id }));
  assert.equal(sh.sel(4, 5), 'DRAFT REVIEW CUSTOMER'); assert.equal(sh.sel(4, 3), '', 'kolom sisipan tidak tersentuh');
  // judul diganti → tab dilewati, Update ditahan
  sh.set(3, 5, 'STATUS BAST');
  const c2 = ok(g.api(t, 'target.cek', { id }));
  assert.equal(c2.batal, true); assert.equal(c2.alarm[0].j, 'KOLOM_BERUBAH'); assert.match(c2.alarm[0].txt, /STATUS BAST FF/);
  const u2 = ok(g.api(t, 'target.update', { id }));
  assert.equal(u2.ditahan, true);
  assert.equal(g.tab('Target')[0].StatusTerakhir, 'ALARM');
  assert.equal(g.logTab('Sinkron').slice(-1)[0].Jenis, 'BATAL');
  sh.set(3, 5, 'STATUS BAST FF');
  // urutan baris berubah tepat sebelum menulis → penerima membatalkan seluruh tab
  const b2 = bundle(g, 'K-000002'); op(g, t, 'K-000002', 'bast.tahap', { id: b2.bast[0].BASTID, ke: 'DRAFTING' });
  const asli = unit.post;
  unit.post = body => { if (JSON.parse(body).aksi === 'tulis') { const a = sh.data[3]; sh.data[3] = sh.data[4]; sh.data[4] = a; } return asli(body); };
  const u3 = ok(g.api(t, 'target.update', { id }));
  unit.post = asli;
  assert.equal(u3.batalTulis.kode, 'URUTAN_BERUBAH');
  assert.ok(!sh.data.some(r => r[4] === 'DRAFTING DOKUMEN'), 'tidak ada yang ditulis');
  assert.equal(g.logTab('Sinkron').slice(-1)[0].Jenis, 'BATAL');
  // web app tidak bisa diakses
  unit.mati = 403;
  assert.match(g.api(t, 'target.cek', { id }).pesan, /Who has access: Anyone/);
  assert.equal(g.tab('Target')[0].StatusTerakhir, 'ERROR');
  unit.mati = 0;
});

test('tab bulan baru: Update ditahan sampai "Pakai tab baru", lalu nilai di tab baru jadi titik awal', () => {
  const { g, t, unit } = siapkan(), id = buatTarget(g, t);
  ok(g.api(t, 'target.update', { id }));
  unit.ss.tambahTab('DES 2026', [['LAPORAN DESEMBER'], [], ['NO', 'NO KONTRAK', 'NAMA CUSTOMER', 'STATUS BAST FF', 'KETERANGAN FF', 'TGL UPDATE FF'],
    [1, 'KL.0001/TSAT/2026', 'PT Telkom', 'DRAFT REVIEW CUSTOMER', 'review admin', ''], [2, 'KL.0002/TSAT/2026', 'Bank BRI', 'BAST DONE', '', '']]);
  const c = ok(g.api(t, 'target.cek', { id }));
  assert.equal(c.tab, 'NOV 2026'); assert.equal(c.tabBaru, 'DES 2026'); assert.ok(c.alarm.some(a => a.j === 'TAB_BERGANTI'));
  assert.equal(g.tab('Target')[0].TabBaru, 'DES 2026');
  assert.equal(ok(g.api(t, 'target.update', { id })).ditahan, true);
  ok(g.api(t, 'target.tabBaru', { id }));
  const c2 = ok(g.api(t, 'target.cek', { id }));
  assert.equal(c2.tab, 'DES 2026'); assert.equal(c2.titikAwal, true);
  assert.equal(c2.rows.find(r => r.r === 5).st, 'TULIS', 'nilai lama di tab baru = titik awal (bukan "diubah luar"), tetap ditimpa nilai SKM');
  assert.ok(!c2.alarm.some(a => a.j === 'DIUBAH_LUAR'));
  ok(g.api(t, 'target.update', { id }));
  assert.equal(unit.tab('DES 2026').sel(5, 4), 'KOMPULIR EVIDEN');
  assert.ok(!g.tab('JejakSel').some(j => j.Tab === 'NOV 2026'), 'jejak tab lama dibuang');
});

test('izin: STAFF ditolak; izin tambahan sinkron.jalankan boleh Cek/Update tapi tidak mengubah target', () => {
  const { g, t } = siapkan(), id = buatTarget(g, t);
  const r = ok(g.api(t, 'users.simpan', { baru: true, username: 'edo', nama: 'Edo', alias: 'Edo', role: 'STAFF' }));
  const ts = g.api(null, 'login', { username: 'edo', password: r.passwordAcak }).data.token; ok(g.api(ts, 'gantiPassword', { baru: 'Staf2026x' }));
  assert.equal(g.api(ts, 'target.cek', { id }).kode, 'IZIN_DITOLAK');
  ok(g.api(t, 'users.simpan', { username: 'edo', nama: 'Edo', alias: 'Edo', role: 'STAFF', izinTambahan: ['sinkron.jalankan'] }));
  assert.equal(g.api(ts, 'target.cek', { id }).ok, true);
  assert.equal(g.api(ts, 'target.update', { id }).ok, true);
  assert.equal(g.api(ts, 'target.simpan', { target: TARGET, kolom: KOLOM, rahasia: 'x' }).kode, 'IZIN_DITOLAK');
  assert.equal(g.api(ts, 'target.rahasia', { id }).kode, 'IZIN_DITOLAK');
});
