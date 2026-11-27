R = '/home/user/Kontrak-Manager/'
s = open(R + 'install/uji-f3.html', encoding='utf-8').read()
INSTALL = 'https://claude.ai/artifact/3YSq8XodkSaXEY5g86M1Dr'
MOCK = 'https://claude.ai/artifact/S78caHr3CxHrdGYtdsFCWq'


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)


rep('<title>Panduan Uji F3</title>', '<title>Panduan Uji F4a</title>')
i = s.index('<div class="eyebrow">Status Kontrak Manager'); j = s.index('</h1>', i) + 5
s = s[:i] + '<div class="eyebrow">Status Kontrak Manager · F4a v4.0.0</div><h1>Panduan uji F4a</h1>' + s[j:]
i = s.index(' <div class="card"><h2>Persiapan</h2>')
j = s.index(' <section class="sec" id="secF3"></section>')
s = s[:i] + f''' <div class="card"><h2>Persiapan</h2>
  <div class="prep">
   <div><b>Akun Gmail khusus FF</b>Project Status Kontrak Manager yang sudah lulus F3.</div>
   <div><b>Salinan sheet unit</b>Akses baca ke Billcom (atau Mansol) supaya bisa <i>File → Make a copy</i>. Salinan itu milik akun FF, jadi akun FF bertindak sebagai "pemilik sheet".</div>
   <div><b>±60 menit</b>Pasang ±10 menit, siapkan salinan + script penerima ±15 menit, uji ±35 menit. Centang tersimpan di browser ini.</div>
  </div>
  <div class="links">
   <a class="lk main" href="{INSTALL}" target="_blank" rel="noopener"><b>① Halaman pasang F4a →</b><span>Update project + tombol Salin untuk 2 file F4a</span></a>
   <a class="lk" href="{MOCK}" target="_blank" rel="noopener"><b>Mockup F4a →</b><span>Pembanding tampilan</span></a>
  </div>
  <p class="muted" style="font-size:12.5px;margin-top:12px"><b>Jangan</b> menghubungkan sheet asli selama uji. Pastikan beberapa nomor kontrak di salinan sudah terdaftar di SKM (mis. dari import data lama F3); nomor yang belum terdaftar hanya dilaporkan, tidak ditulis. Kolom milik FF di salinan (mis. <span class="mono">STATUS BAST FF</span>, <span class="mono">KETERANGAN FF</span>) boleh terisi atau kosong.</p>
 </div>

''' + s[j:]
rep(' <section class="sec" id="secF3"></section>', ' <section class="sec" id="secF4a"></section>')
i = s.index('var F3=[')
j = s.index("var KEY='skm-uji-f3';")
langkah = r"""var F4=[
 ['Pasang F4a','Buka halaman pasang <b>①</b>, pilih <b>Update project yang sudah ada</b>, ikuti 5 langkahnya.','Log setup menulis migrasi <span class="mono">v3 → v4</span> (tab Target, TargetKolom, JejakSel). Kiri bawah <b>Versi 4.0.0 · F4a</b>; menu kiri punya <b>Google Sheet</b>. Dashboard menampilkan kartu "Status sinkron" berisi <i>Belum ada sheet unit yang terhubung</i>.'],
 ['Buat salinan sheet unit','Di Google Drive akun FF buka Billcom (atau Mansol) → <b>File › Make a copy</b> → beri nama mis. <i>UJI SKM Billcom</i>.','Salinan terbuka dan pemiliknya akun FF. Catat nama tab yang dipakai (mis. <span class="mono">NOV 2026</span>) dan judul kolom milik FF.'],
 ['Wizard: script & kode','SKM › Google Sheet › <b>Tambah target</b>. Isi nama, klik <b>Salin script penerima</b>, lalu <b>Buat kode acak</b> dan <b>Salin kode</b>.','Script tersalin (±150 baris, diawali <span class="mono">SKM · Script Penerima</span>). Kode rahasia 24 karakter muncul.'],
 ['Pasang script penerima','Di salinan: <b>Extensions › Apps Script</b> → hapus isi Code.gs → tempel script. Ganti <span class="mono">ISI-KODE-RAHASIA</span> dengan kode tadi, simpan. Pilih fungsi <span class="mono">pasang</span> → <b>Run</b> → izinkan. Lalu <b>Deploy › New deployment › Web app</b> · Execute as <b>Me</b> · Who has access <b>Anyone</b> → salin Web app URL.','Log Apps Script menulis <i>Pencatat edit manual terpasang…</i>. Ada URL berakhiran <span class="mono">/exec</span>.'],
 ['Tes koneksi','Tempel URL di wizard → <b>Tes koneksi</b>.','Muncul catatan hijau: <i>Terhubung ke UJI SKM Billcom · N tab · script v1 · pencatat edit terpasang</i>. Tombol Lanjut aktif. (Coba juga satu huruf kode salah → pesan "Kode rahasia tidak cocok", lalu betulkan.)'],
 ['Tab','Billcom: pilih <b>Tab berganti tiap bulan</b>, pola <span class="mono">MMM YYYY</span> (sesuaikan dengan nama tab). Mansol: <b>Tab tetap</b> → pilih tab.','Pratinjau menandai tab bulan terbaru <i>· terbaru</i>; tab lain (REKAP dll.) masuk daftar "Tidak cocok".'],
 ['Pemetaan kolom','Lanjut. Periksa baris judul dan kolom yang terpilih otomatis; betulkan bila perlu. Coba pilih kolom yang sama untuk dua field TULIS.','Baris judul terdeteksi benar; kolom kunci = kolom nomor kontrak; contoh isi masuk akal. Saat dua field memakai kolom sama muncul error merah dan Lanjut terkunci.'],
 ['Cek saja di wizard','Lanjut ke langkah 4.','Muncul jumlah baris dibaca, cocok, sel akan ditulis, alarm, nomor belum terdaftar, dan catatan "titik awal". Buka salinan: <b>tidak ada sel yang berubah</b>.'],
 ['Simpan & Update','Langkah 5: biarkan centang <b>Jalankan Update ke GSheet sekarang</b> → <b>Simpan &amp; aktifkan</b>.','Kartu target muncul dengan "Hasil Update · N sel ditulis". Di salinan, kolom FF baris kontrak terdaftar berisi nilai SKM (mis. DRAFT REVIEW CUSTOMER). Kolom lain, format, dan baris lain tidak berubah. Kontrak yang muncul di beberapa baris mendapat nilai sama.'],
 ['Cek saja lagi','Klik <b>Cek saja</b> pada kartu target.','"0 sel akan ditulis"; baris yang tadi ditulis berstatus <b>Sudah sama</b>. Riwayat sinkron menampilkan baris CEK dan UPDATE.'],
 ['Edit manual tidak ditimpa','Di salinan, ketik nilai lain di kolom FF satu kontrak (mis. BAST DONE). Di SKM klik <b>Cek saja</b>, lalu <b>Update ke GSheet</b>.','Baris itu berstatus <b>Diubah di luar SKM · tidak ditimpa</b> + alarm DIUBAH_LUAR. Setelah Update, nilai ketikan tetap ada.'],
 ['Update FF menang','Di SKM pindahkan tahap kontrak tadi (panel detail). Lalu <b>Update ke GSheet</b>.','Nilai baru dari SKM tertulis di salinan, menggantikan ketikan manual (karena status di SKM berubah).'],
 ['Kolom disisipkan','Di salinan, sisipkan satu kolom kosong di sebelah kiri kolom FF. Di SKM klik <b>Cek saja</b> lalu ubah satu kontrak dan <b>Update</b>.','Huruf kolom di kartu/hasil bergeser (mis. R → S) dan nilai tetap masuk ke kolom FF yang benar, bukan kolom sisipan.'],
 ['Judul kolom berubah','Di salinan ganti judul kolom FF (mis. tambahkan "X"). Di SKM klik <b>Cek saja</b>, lalu <b>Update</b>.','Alarm <b>KOLOM_BERUBAH</b> "tidak ditemukan… tab dilewati"; Update ditahan dan tidak ada yang ditulis. Kembalikan judulnya, Cek saja lagi → normal.'],
 ['Sel berisi rumus','Di salinan isi satu sel kolom FF (baris kontrak terdaftar) dengan rumus, mis. <span class="mono">=A1</span>. Ubah kontrak itu di SKM lalu <b>Update</b>.','Baris itu <b>Berisi rumus · tidak ditimpa</b>; rumus di salinan tetap utuh.'],
 ['Baris diurutkan','Di salinan urutkan data (Data › Sort range) berdasarkan kolom lain. Ubah satu kontrak di SKM lalu <b>Update</b>.','Nilai masuk ke baris kontrak yang benar (SKM membaca ulang urutan baris sebelum menulis).'],
 ['Tab bulan baru','(Mode tab bulanan) Di salinan duplikat tab bulan terbaru dan beri nama bulan berikutnya (mis. <span class="mono">DES 2026</span>). Di SKM klik <b>Cek saja</b>, lalu <b>Update</b>.','Alarm <b>TAB_BERGANTI</b>; Update ditahan. Klik <b>Pakai tab baru</b> → Cek saja menyebut "titik awal" → Update menulis ke tab DES 2026; tab NOV tidak diubah lagi.'],
 ['Kontrak CLOSE','Pindahkan satu kontrak di salinan ke tahap BAST Takeout di SKM → <b>Update</b>. Lalu ketik nilai lain di sel itu → <b>Update</b> lagi.','Update pertama menulis <span class="mono">BAST TAKEOUT/SERTIM AR</span>. Setelah itu baris berstatus <b>CLOSE · tidak ditulis lagi</b>; ketikan manual dibiarkan.'],
 ['Dashboard & Perlu Perhatian','Buka Dashboard, lalu Perlu Perhatian.','Kartu <b>Status sinkron</b> menampilkan target, tab, hasil terakhir, waktu cek & update. Perlu Perhatian punya kelompok <b>Target error / sel diubah di luar SKM</b> berisi alarm terakhir.'],
 ['Detail kontrak','Buka panel detail kontrak yang ditulis ke salinan → tab Proses → kartu "Tampil di sheet unit".','Tertulis <i>Nama target · tab … · baris …</i> dan "Riwayat di sheet unit bulan ini" (lama → baru).'],
 ['Izin','Di Incognito login sebagai STAFF; lalu admin memberi izin tambahan <b>Jalankan Cek saja / Update ke GSheet</b> di Users, STAFF muat ulang.','Awalnya STAFF tidak melihat menu Google Sheet. Setelah izin tambahan, menu muncul dan Cek saja bisa, tetapi tombol <b>Tambah target</b> dan menu ⋮ (ubah/kode rahasia) tidak ada.'],
 ['Log','Sistem › Buka log audit bulan ini. Buka juga file <span class="mono">SKM_LOG_2026</span> di Drive.','Log berisi <span class="mono">BUAT_TARGET</span>, <span class="mono">SINKRON_UPDATE</span>, <span class="mono">TAB_BARU</span>. File log punya tab <span class="mono">Sinkron-2026-11</span> (riwayat cek/update) dan <span class="mono">Push-2026-11</span> (setiap sel yang ditulis). Kode rahasia tidak muncul di mana pun.']
];
"""
s = s[:i] + langkah + s[j:]
rep("var KEY='skm-uji-f3';", "var KEY='skm-uji-f4a';")
i = s.index("sec('secF3'"); j = s.index('\n', i)
s = s[:i] + "sec('secF4a','E','Uji F4a: sinkron ke salinan sheet unit','Pakai SALINAN sheet unit, bukan aslinya. E21 butuh akun STAFF di jendela Incognito.',F4);" + s[j:]
rep("[['D',F3]].forEach(", "[['E',F4]].forEach(")
i = s.index("var lines=['Laporan uji SKM F3"); j = s.index("];", i) + 2
s = s[:i] + "var lines=['Laporan uji SKM F4a v4.0.0'];" + s[j:]
rep("[['D','F3',F3]].forEach(", "[['E','F4a',F4]].forEach(")
open(R + 'install/uji-f4a.html', 'w', encoding='utf-8').write(s)
print('ok')
