import re
R = '/home/user/Kontrak-Manager/install/'
s = open(R + 'uji-f0-f1.html', encoding='utf-8').read()
INSTALL_F2 = 'https://claude.ai/artifact/KP7aNGYNYAGYncv2xtyhox'
MOCK_F2 = 'https://claude.ai/artifact/BE7n6ZYyC2LWxb2UZiX6qN'


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)


rep('<title>Panduan Uji F0 F1</title>', '<title>Panduan Uji F2</title>')
s = re.sub(r'<div class="eyebrow">Status Kontrak Manager · F0 v1\.2 \+ F1 v1\.0\.3</div><h1>Panduan uji F0 &amp; F1</h1>',
           '<div class="eyebrow">Status Kontrak Manager · F2 v2.0.0</div><h1>Panduan uji F2</h1>', s)
i = s.index(' <div class="card"><h2>Persiapan</h2>')
j = s.index(' <section class="sec" id="secF0"></section>')
s = s[:i] + f''' <div class="card"><h2>Persiapan</h2>
  <div class="prep">
   <div><b>Akun Gmail khusus FF</b>Project Status Kontrak Manager yang sudah lulus F1.</div>
   <div><b>Akun admin + akun staff uji</b>Siapkan satu jendela <i>Incognito</i> untuk akun staff (uji dua orang sekaligus).</div>
   <div><b>±60 menit</b>Pasang ±15 menit, uji ±45 menit. Boleh dicicil; centang tersimpan di browser ini.</div>
  </div>
  <div class="links">
   <a class="lk main" href="{INSTALL_F2}" target="_blank" rel="noopener"><b>① Halaman pasang F2 →</b><span>Update project + tombol Salin untuk 2 file F2</span></a>
   <a class="lk" href="{MOCK_F2}" target="_blank" rel="noopener"><b>Mockup F2 →</b><span>Pembanding tampilan yang disetujui</span></a>
  </div>
  <p class="muted" style="font-size:12.5px;margin-top:12px">Pindah ke arsip tahunan hanya terjadi untuk kontrak yang CLOSE lebih dari 90 hari, jadi belum bisa dicoba langsung sekarang. Alurnya (pindah, cari, buka, reopen dari arsip) sudah diuji otomatis; di sini cukup dicek bahwa pemicunya terpasang (C25).</p>
 </div>

''' + s[j:]
rep(' <section class="sec" id="secF0"></section>\n <section class="sec" id="secF1"></section>', ' <section class="sec" id="secF2"></section>')
i = s.index('var F0=[')
j = s.index("var KEY='skm-uji-f0f1';")
langkah = r"""var F2=[
 ['Pasang F2','Buka halaman pasang <b>①</b>, pilih <b>Update project yang sudah ada</b>, ikuti 6 langkahnya (ganti 2 file, mintaIzin, setup, New version).','Log setup menulis migrasi <span class="mono">v1 → v2</span>, <span class="mono">Log F1 disalin…</span>, dan <span class="mono">Pemicu pindah arsip bulanan dipasang</span>. Tidak ada error merah.'],
 ['Cek Drive','Buka Google Drive akun FF. <b>Jangan mengubah isi file.</b>','<span class="mono">SKM_DB</span> punya tab baru (Kontrak, BAST, Indeks, Ref_Tahap, …). Ada file baru <span class="mono">SKM_LOG_2026</span> berisi tab <span class="mono">Log-2026-11</span>. Tab Log lama di SKM_DB masih ada.'],
 ['Buka aplikasi','Buka Web app URL dan login sebagai admin.','Muncul layar <b>Memuat data aktif</b>, lalu Beranda dengan kotak angka. Kiri bawah: <b>Versi 2.0.0 · F2</b>. Menu: Beranda, <b>Kontrak</b>, Pengaturan › <b>Tahap &amp; aturan</b>.'],
 ['Pengaturan awal','Menu <b>Tahap &amp; aturan</b>: buka tab Tahap, Kendala, Nilai Push.','6 tahap (penutup: BAST Takeout), 5 jenis kendala, 13 aturan Nilai Push. Tidak ada peringatan kuning.'],
 ['Tambah kontrak','Kontrak → <b>Tambah kontrak</b>. Isi nomor, judul, Customer = End customer (mis. sama-sama "Bank BRI"), nilai, 1 SO → Simpan kontrak.','Panel detail kontrak baru terbuka. Pill <b>DIRECT</b>, BAST-1 dokumen tagih <b>BAA</b>, tahap Kompulir Eviden. Bilah atas: <i>Menyimpan…</i> lalu <i>Tersimpan</i>.'],
 ['Cek nomor dobel','Tambah kontrak lagi dengan nomor yang sama tapi beda huruf besar/kecil atau spasi.','Langsung muncul peringatan merah "Nomor ini sudah terdaftar sebagai K-…" dan tidak bisa disimpan.'],
 ['Pindah tahap','Di panel detail, klik tahap berikutnya → Pindah. Lalu klik tahap sebelumnya (mundur) tanpa keterangan, lalu dengan keterangan.','Maju langsung berubah di layar. Mundur tanpa keterangan ditolak; dengan keterangan berhasil. Kotak "Tampil di sheet unit" ikut berubah.'],
 ['Kendala','<b>Buka kendala</b> → Kendala Sisi Customer + keterangan → simpan. Lalu klik <b>Selesai</b>.','Saat aktif, Kendala Umum = <span class="mono">KENDALA CUSTOMER</span> dan Kendala Detil = keterangan Anda. Setelah selesai, kembali mengikuti tahap.'],
 ['Close & reopen','Pindahkan BAST ke tahap terakhir (BAST Takeout). Lalu <b>Buka kendala</b> → Revisi Dokumen + keterangan.','Setelah tahap terakhir: BAST & kontrak <b>CLOSE</b>. Setelah kendala revisi: BAST <b>Siklus 2 · reopen</b> di Drafting Dokumen, kontrak OPEN lagi.'],
 ['BAST parsial','Kontrak baru dengan Jumlah lokasi 10. Ubah BAST-1 → cakupan lokasi 4 → pindahkan ke tahap terakhir. Lalu <b>Tambah BAST/BAA parsial</b> (cakupan 6) → tahap terakhir.','Setelah BAST-1 close: kontrak tetap OPEN dengan <b>Menunggu BAST lanjutan</b> (sisa 6). Mencoba cakupan 7 ditolak. Setelah BAST-2 close: kontrak CLOSE.'],
 ['Koreksi nomor','Tab <b>Data kontrak</b> → Ubah → ganti nomor, isi alasan → simpan. Lalu cari nomor lama di kotak pencarian daftar.','Kontrak tetap ditemukan dengan keterangan "Ditemukan lewat <b>nomor lama</b> …"; panel detail menampilkan penjelasan nomor lama.'],
 ['SO/MI','Tab Data kontrak → SO/MI: tambah, klik baris untuk ubah, lalu hapus satu.','Tersimpan dan tercatat di Riwayat › Log perubahan.'],
 ['Arsipkan & kembalikan','Tombol <b>Arsipkan</b> di panel detail (alasan wajib). Lalu filter <b>Diarsipkan</b> → buka → <b>Kembalikan dari arsip</b>.','Kontrak hilang dari daftar OPEN, muncul di filter Diarsipkan, tidak bisa diubah sampai dikembalikan.'],
 ['Dua orang sekaligus','Login staff di Incognito. Staff mengubah tahap sebuah kontrak. Di jendela admin, tunggu ±30 detik tanpa memuat ulang.','Di layar admin kontrak itu ikut berubah, barisnya disorot sebentar, dan muncul pesan "… mengubah K-…".'],
 ['Bentrok perubahan','Admin dan staff membuka kontrak yang sama. Staff pindah tahap. Sebelum 30 detik, admin juga pindah tahap kontrak itu.','Salah satu mendapat jendela <b>Perubahan tidak tersimpan</b>: "baru saja diubah orang lain", dan tampilannya kembali ke data terbaru.'],
 ['Izin STAFF','Staff menambah kontrak (isi PIC orang lain bila bisa). Coba ganti PIC dan cari tombol Arsipkan.','PIC kontrak baru = staff itu sendiri. Pilihan PIC terkunci; tidak ada tombol Arsipkan.'],
 ['PIC massal','Admin: centang beberapa kontrak di daftar → pilih PIC → <b>Atur PIC</b>.','Semua kontrak terpilih ganti PIC; tercatat ATUR_PIC di Log.'],
 ['Unduh template','Kontrak → <b>Upload Excel</b> → <b>Unduh template</b>.','File <span class="mono">Template_Upload_Kontrak_SKM.xlsx</span> terunduh. Di Excel ada tab Petunjuk, Kontrak, SO_MI, Referensi; kolom Populasi/PIC/Tahap punya dropdown.'],
 ['Pratinjau upload','Isi template: 3 kontrak baru, 1 baris tanpa judul, 1 nomor yang sudah ada di SKM, 1 SO untuk salah satu kontrak baru. Upload.','Pratinjau: 3 Baru (atau peringatan), 1 Error "Judul kontrak wajib diisi", 1 Sudah ada. Belum ada yang tersimpan.'],
 ['Simpan upload','Klik <b>Simpan</b>. Lalu upload file yang sama sekali lagi.','Selesai: 3 dibuat, kontrak langsung muncul di daftar dengan BAST-1. Upload kedua: semuanya "Sudah ada", tidak dobel.'],
 ['Laporan error','Di pratinjau atau layar selesai, klik <b>Unduh laporan error</b>.','File Excel berisi baris yang error beserta alasannya.',true],
 ['Ubah Nilai Push','Tahap &amp; aturan → Nilai Push → ubah teks aturan <span class="mono">TAHAP:KOMPULIR</span> → Simpan. Kembalikan seperti semula setelahnya.','Kolom "Kontrak terkena" menghitung di layar. Setelah simpan: kontrak di Kompulir menampilkan teks baru di daftar.'],
 ['Tahap baru','Tab Tahap → <b>Tahap baru</b> (mis. VERIF_AR) → Simpan. Lalu coba nonaktifkan tahap yang masih dipakai BAST OPEN.','Muncul peringatan kuning "belum ada aturan Nilai Push untuk …". Menonaktifkan tahap yang dipakai ditolak dengan tawaran <b>Pindahkan BAST</b>. (Nonaktifkan tahap uji setelahnya.)'],
 ['Log per bulan','Buka <b>Log</b>. Coba pilihan periode dan kotak cari.','Default 30 hari terakhir; ada pilihan bulan. Semua aksi di atas tercatat (BUAT_KONTRAK, UBAH_TAHAP, BUKA_KENDALA, REOPEN, UPLOAD_EXCEL, …).'],
 ['Sistem','<b>Sistem → Jalankan</b>. Lalu di kartu Arsip tahunan klik <b>Jalankan pindah arsip sekarang</b>.','Semua pemeriksaan hijau (±10). Pemicu bulanan <b>terpasang</b>. Pindah arsip: "Tidak ada kontrak yang perlu dipindah".'],
 ['Rasa kecepatan','Catat di kolom catatan: berapa detik buka aplikasi sampai Beranda? Apakah klik kontrak, filter, dan simpan terasa langsung?','Daftar/filter/detail instan; simpan langsung berubah di layar, tersimpan ±3–4 detik kemudian.'],
 ['Ponsel','Buka di ponsel: daftar kontrak, panel detail, form tambah.','Tidak ada yang terpotong; menu di tombol ☰.',true]
];
"""
s = s[:i] + langkah + s[j:]
rep("var KEY='skm-uji-f0f1';", "var KEY='skm-uji-f2';")
i = s.index("sec('secF0'")
j = s.index("function paint(){")
s = s[:i] + "sec('secF2','C','Uji F2: kontrak, BAST/BAA, upload, pengaturan','Jalankan setelah F2 terpasang. Langkah C14–C16 butuh akun staff di jendela Incognito.',F2);\n" + s[j:]
rep("[['A',F0],['B',F1]].forEach(", "[['C',F2]].forEach(")
rep("var lines=['Laporan uji SKM F0 v1.2 + F1 v1.0.3'];", "var lines=['Laporan uji SKM F2 v2.0.0'];")
rep("[['A','F0',F0],['B','F1',F1]].forEach(", "[['C','F2',F2]].forEach(")
open(R + 'uji-f2.html', 'w', encoding='utf-8').write(s)
print('ok')
