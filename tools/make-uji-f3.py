import base64
R = '/home/user/Kontrak-Manager/'
s = open(R + 'install/uji-f2.html', encoding='utf-8').read()
INSTALL_F3 = 'https://claude.ai/artifact/KV4Jym4MJjuFpKSCb5ZszB'
MOCK_F3 = 'https://claude.ai/artifact/FEw7zDeptPgLgBLUcLskeT'
FF = base64.b64encode(open(R + 'mockup/Contoh_Data_FF_Lama.xlsx', 'rb').read()).decode()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)


rep('<title>Panduan Uji F2</title>', '<title>Panduan Uji F3</title>')
i = s.index('<div class="eyebrow">Status Kontrak Manager'); j = s.index('</h1>', i) + 5
s = s[:i] + '<div class="eyebrow">Status Kontrak Manager · F3 v3.0.0</div><h1>Panduan uji F3</h1>' + s[j:]
i = s.index(' <div class="card"><h2>Persiapan</h2>')
j = s.index(' <section class="sec" id="secF2"></section>')
s = s[:i] + f''' <div class="card"><h2>Persiapan</h2>
  <div class="prep">
   <div><b>Akun Gmail khusus FF</b>Project Status Kontrak Manager yang sudah lulus F2.</div>
   <div><b>Akun admin + 1 akun STAFF</b>Akun STAFF dengan Alias PIC terisi (mis. Edo). Siapkan jendela <i>Incognito</i> untuk akun STAFF.</div>
   <div><b>±40 menit</b>Pasang ±10 menit, uji ±30 menit. Boleh dicicil; centang tersimpan di browser ini.</div>
  </div>
  <div class="links">
   <a class="lk main" href="{INSTALL_F3}" target="_blank" rel="noopener"><b>① Halaman pasang F3 →</b><span>Update project + tombol Salin untuk 2 file F3</span></a>
   <div class="lk"><b>② Contoh sheet FF lama</b><span>File <span class="mono">Contoh_Data_FF_Lama.xlsx</span> dikirim di chat. 9 baris: Lampiran A + kasus khusus, untuk langkah D9–D14</span></div>
   <a class="lk" href="{MOCK_F3}" target="_blank" rel="noopener"><b>Mockup F3 →</b><span>Pembanding tampilan yang disetujui</span></a>
  </div>
  <p class="muted" style="font-size:12.5px;margin-top:12px">Contoh sheet FF lama berisi nomor kontrak dari Lampiran A SPEC. Bila nomor-nomor itu sudah Anda masukkan sebelumnya, barisnya terbaca <b>Sudah ada · dilewati</b>; itu juga perilaku yang benar. Kontrak hasil uji bisa diarsipkan setelah selesai (Kontrak → detail → Arsipkan).</p>
 </div>

''' + s[j:]
rep(' <section class="sec" id="secF2"></section>', ' <section class="sec" id="secF3"></section>')
i = s.index('var F2=[')
j = s.index("var KEY='skm-uji-f2';")
langkah = r"""var F3=[
 ['Pasang F3','Buka halaman pasang <b>①</b>, pilih <b>Update project yang sudah ada</b>, ikuti 5 langkahnya (ganti 2 file, setup, New version).','Log setup menulis migrasi <span class="mono">v2 → v3</span>, <span class="mono">Tab Users: kolom ditambah IzinTambahan</span>, dan <span class="mono">Role ADMIN: izin kontrak.import ditambahkan</span>. Bila aplikasi sudah dibuka duluan, migrasi sudah berjalan otomatis dan log setup boleh menulis "tidak ada perubahan". Tidak ada error merah.'],
 ['Buka aplikasi (ADMIN)','Buka Web app URL dan login sebagai admin.','Muncul <b>Dashboard</b> berjudul <i>Selamat pagi/siang/sore/malam, nama Anda</i>. Kiri bawah <b>Versi 3.0.0 · F3</b>. Menu: Dashboard, Kontrak, <b>Perlu Perhatian</b> (dengan angka), Pengaturan. Antrian & Google Sheet masih redup.'],
 ['Angka Dashboard','Bandingkan kotak angka dengan menu Kontrak (tab OPEN).','<b>Kontrak OPEN</b> sama dengan jumlah di tab OPEN. Pilihan <b>Tim FF</b> menyala untuk admin. Nilai kontrak OPEN, kendala aktif, close bulan ini masuk akal.'],
 ['Alur per tahap','Klik salah satu lingkaran tahap di "Kontrak OPEN per tahap".','Pindah ke Kontrak dengan filter Tahap terisi tahap itu. Jumlah baris sama dengan angka di lingkaran.'],
 ['Tabel Tim','Lihat kartu Tim di Dashboard, lalu klik satu baris PIC.','Setiap PIC tampil dengan Open, Kendala, Lewat batas, bar aging, dan <b>Update 7 hari</b> (grafik kecil + angka; bisa berputar sebentar saat pertama). Klik baris → daftar Kontrak terfilter PIC itu.'],
 ['Kualitas data','Klik kotak <b>Tanpa PIC</b> atau <b>Data belum lengkap</b> di kartu Kualitas data.','Pindah ke Kontrak dengan tombol cepat yang sama menyala; jumlahnya sama dengan angka di kotak.'],
 ['Perlu Perhatian','Buka menu <b>Perlu Perhatian</b>.','Kartu: BAST lewat batas aging, Kendala aktif > 14 hari, Kontrak tanpa PIC, Data import belum diverifikasi, Data kontrak belum lengkap. Angka di menu = jumlah semua hal. Klik satu baris → panel detail kontrak terbuka.'],
 ['Aksi cepat','Di kartu <b>Kontrak tanpa PIC</b>, pilih PIC di dropdown <b>Atur PIC…</b> pada satu kontrak.','Kontrak hilang dari kartu, tanda di bilah atas jadi <b>Tersimpan</b>, dan di Kontrak kolom PIC sudah terisi. Tombol <b>Lengkapi</b> membuka form ubah kontrak.'],
 ['Import: pilih file','Kontrak → <b>Upload Excel</b> → kartu <b>Import sheet FF lama</b>. Pilih file contoh <b>②</b>.','Muncul layar Pemetaan: <i>tab STATUS FF · judul kolom di baris 3 · 9 baris data</i>. Kolom dikenali otomatis (NAMA PELANGGAN → End customer).'],
 ['Import: pemetaan nilai','Lihat kartu <b>2. Nilai status lama</b>, <b>3. PIC</b>, <b>4. Referensi baru</b>.','BAST ON REVIEW → Tahap Draft Review Customer · BAST REVISI → Kendala Revisi Dokumen · BAST PARSIAL → Tandai BAST parsial · SERTIM AR → Tahap BAST Takeout · SIRKULIR bertanda <i>tebakan, cek</i> · NUNGGU TTD bertanda <i>tidak dikenal</i>. PIC Rina <i>tidak dikenal</i>. TELKOMSEL dan MARITIM tercentang di Referensi baru.'],
 ['Import: pratinjau','Hilangkan centang <b>MARITIM</b>, lalu klik <b>Lihat pratinjau</b>.','Kotak angka: 9 baris · 4 siap · 3 dengan catatan · 0 sudah ada · 2 error (nomor kosong, nomor dobel). Catatan biru: aging dimulai hari ini, <b>1 kontrak langsung CLOSE</b>. Baris Permata: Kompulir Eviden + <i>parsial</i> + Revisi Dokumen. Baris Wananugraha: BAST Done (tahap paling maju).'],
 ['Import: simpan','Klik <b>Import 7 kontrak</b> → konfirmasi.','Layar Selesai: 7 kontrak masuk · 1 langsung CLOSE · 2 error · 1 referensi baru. Di Kontrak, kontrak hasil import bertanda <b>verif</b>; WO/0188/TSAT/IX/2025 berstatus CLOSE.'],
 ['Import: verifikasi','Klik <b>Buka Perlu Perhatian</b>. Di kartu Data import belum diverifikasi, klik <b>Periksa</b> pada kontrak Permata, lalu di panel klik <b>Tandai terverifikasi</b>.','Baris Permata menulis <i>BAST parsial: lengkapi cakupan…</i>. Setelah ditandai, kontrak hilang dari kartu dan angka menu berkurang 1.'],
 ['Import ulang','Import file contoh yang sama sekali lagi sampai pratinjau.','Kotak angka: 0 siap · 7 sudah ada · 2 error. Tidak ada kontrak dobel. Di Pengaturan › Referensi, Populasi TELKOMSEL ada, MARITIM tidak.'],
 ['Ctrl+K','Di halaman mana pun tekan <kbd>Ctrl</kbd>+<kbd>K</kbd> (atau klik kotak <b>Cari kontrak, perintah…</b> di atas). Ketik sebagian nomor kontrak, lalu Enter.','Daftar muncul seketika; Enter membuka panel detail kontrak itu. Ketik <i>import</i> → muncul perintah <b>Import data lama</b>.'],
 ['Ctrl+K: kontrak lama','Tekan Ctrl+K lalu ketik nomor kontrak yang sudah di arsip (bila ada) atau nomor lama/alias.','Setelah ±1–3 dtk muncul baris berlabel <b>arsip 20xx</b>; Enter membuka kontrak lama hanya-baca. Bila belum ada arsip, cukup pastikan tulisan <i>Mencari juga di kontrak lama…</i> muncul lalu hilang tanpa error.'],
 ['Izin tambahan','Menu <b>Users</b> → klik akun STAFF → bagian <b>Izin tambahan di luar role</b>: centang <b>Upload Excel &amp; import data lama</b> → <b>Simpan</b>.','Di daftar Users, akun itu bertanda <b>+ Upload Excel &amp; import data lama</b>. Buka akun ADMIN: centang yang sama tampil tercentang dan terkunci (sudah termasuk role).'],
 ['STAFF: Milik saya','Di jendela Incognito, login sebagai STAFF itu.','Dashboard dan Perlu Perhatian langsung dibuka dengan <b>Milik saya</b>; judul kecil menulis <i>kontrak milik Anda</i>; tabel Tim hanya baris PIC-nya. Pilihan Tim FF tetap bisa diklik.'],
 ['STAFF: upload','Masih sebagai STAFF, buka menu Kontrak.','Tombol <b>Upload Excel</b> tampil (karena izin tambahan). Di Users (admin), hilangkan centangnya lalu muat ulang jendela STAFF: tombol Upload Excel hilang, <b>Tambah kontrak</b> tetap ada.'],
 ['Ponsel','Buka Web app URL di HP (atau perkecil jendela).','Dashboard, Perlu Perhatian, dan Import tampil rapi tanpa geser ke samping (kecuali alur tahap dan tabel yang memang bisa digeser). Kotak Cari menjadi ikon kaca pembesar.'],
 ['Log','Pengaturan › Sistem › <b>Buka log audit</b>, pilih bulan ini.','Ada baris <span class="mono">IMPORT_DATA_LAMA</span> (7 diimport, 2 error), <span class="mono">BUAT_KONTRAK</span> dengan catatan <i>import data lama … baris …</i>, dan <span class="mono">UBAH_USER</span> dengan catatan <i>izin tambahan</i>.']
];
"""
s = s[:i] + langkah + s[j:]
rep("var KEY='skm-uji-f2';", "var KEY='skm-uji-f3';")
i = s.index("sec('secF2'"); j = s.index('\n', i)
s = s[:i] + "sec('secF3','D','Uji F3: dashboard, perlu perhatian, Ctrl+K, import data lama','Jalankan setelah F3 terpasang. D18–D19 butuh akun STAFF di jendela Incognito.',F3);" + s[j:]
rep("[['C',F2]].forEach(", "[['D',F3]].forEach(")
i = s.index("var lines=['Laporan uji SKM F2"); j = s.index("];", i) + 2
s = s[:i] + "var lines=['Laporan uji SKM F3 v3.0.0'];" + s[j:]
rep("[['C','F2',F2]].forEach(", "[['D','F3',F3]].forEach(")
open(R + 'install/uji-f3.html', 'w', encoding='utf-8').write(s)
print('ok')
