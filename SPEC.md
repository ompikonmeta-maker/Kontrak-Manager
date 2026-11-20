# SPEC — Status Kontrak Manager

Versi 1.12 · 20 Nov 2026 · Pemilik: omPik (Unit Fulfillment)
Referensi konsep: BAA.flow (BAA Generator). Mockup UI yang disetujui: `mockup/mockup.html` (desain "Orbit").

**Perubahan v1.12** (review mockup F2)
- **Upload Excel** masuk F2 (§11.0, D13): template SKM (tab Kontrak + SO_MI, dropdown dari Referensi) → pratinjau & periksa per baris → simpan. Import sheet FF format lama tetap F3.
- Kontrak tidak bisa dihapus, hanya diarsipkan dengan alasan; PIC sementara kontrak dari STAFF = staff itu; BAST-1 dibuat otomatis; koreksi nomor → nomor lama menjadi alias.
- Nomor lama (alias) tidak tampil sebagai kolom, tetapi ikut dicari. Hasil yang cocok lewat nomor lama diberi keterangan "Ditemukan lewat nomor lama …" beserta asal (koreksi/antrian/upload), waktu, pelaku, dan alasan; panel detail menampilkan penjelasan yang sama di atas (D14).

**Perubahan v1.11**
- Login tetap **username + password SKM** (tanpa login Google). Akuntabilitas dijamin lewat aturan di §6.2 (D11).

**Perubahan v1.10** (build F1)
- Tab `Log` menambah kolom `Hasil` (BERHASIL/GAGAL/DITOLAK); tab `Users` menambah `SesiVersi` (reset password, nonaktif, atau ganti role mengakhiri sesi aktif) dan `Version`; tab `_Meta` menyimpan versi skema dan riwayat migrasi.
- Izin Google (OAuth scope) dideteksi otomatis dari kode; manifest tidak mendaftarkan scope manual.
- Fungsi darurat `pulihkanAdmin()` dijalankan dari editor bila tidak ada admin yang bisa login.

**Perubahan v1.9**
- Aturan akun (§6.1): username bebas (NIK, nama, dll.), password diketik admin atau dibuat acak lalu wajib diganti, hapus user hanya bila belum ada aktivitas.

**Perubahan v1.8**
- Fase menjadi 7: F0, F1, F2, F3 (import dimajukan), F4a, F4b, F5 (§14).
- Cara kerja per fase: **mockup fase → disetujui → build hanya setelah pemilik bilang "build"** (§0).

**Perubahan v1.7**
- Jenis customer **BELUM TERDEFINISI** selama customer atau end customer masih kosong; kontrak masuk "data belum lengkap" (§5.7).
- Kolom NAMA PELANGGAN di sheet FF lama = **End customer** (§11).

**Perubahan v1.6**
- **Info selengkap mungkin:** SKM membaca kolom-kolom info dari setiap sheet unit (standar + kolom bebas) dan menampilkannya per kontrak di tab "Sheet unit". Beda data dan data kontrak yang belum lengkap masuk Perlu Perhatian (§8.7, §5.6).
- **Pengaman kolom:** setiap penulisan membawa judul header yang diharapkan; script penerima menolak bila judul kolom tujuan berubah (§8.4, §8.6).

**Perubahan v1.5**
- Jenis customer dihitung dari **Customer vs End customer** (bukan dari Populasi). Dokumen tagih usulan: BAA untuk DIRECT, BAST untuk INDIRECT, bisa diganti per BAST (§5.7).

**Perubahan v1.4** (hasil review mockup bersama FF)
- Koneksi ke sheet unit memakai **script penerima** yang dipasang pemilik sheet (§4.1, §8.0). Mode "langsung" pindah ke daftar Nanti.
- **BAA** bisa menjadi dokumen tagih, setara BAST (§2, §5.1). Teks Nilai Push tetap sama, misalnya tetap "BAST DONE".
- **Jenis customer** DIRECT/INDIRECT (§5.7).
- Kontrak tanpa BAST tidak pernah CLOSE (§5.4). Batas kendala menjadi Config, dan aging tidak pernah berhenti (§5.6).
- Tema terang + gelap, detail kontrak sebagai panel geser, pencarian Ctrl+K (§10).
- Instalasi cukup menyalin `Code.gs` + `appsscript.json` dari halaman instalasi bertombol Salin (§12).

**Prinsip utama: sederhana dulu, tapi bisa dipakai selamanya.** v1 hanya berisi inti. Tambahan dibuat belakangan, mengikuti kondisi lapangan (daftar "Nanti" di §15). Supaya tidak perlu bongkar kode, semua isi yang mungkin berubah (tahap, kendala, nilai push, role, target) **diatur dari aplikasi, bukan ditulis di kode**.

---

## 0. Prompt pembuka untuk Claude Code

> Baca `SPEC.md` sampai habis. Bangun **hanya cakupan v1** (§14), satu fase per sesi. Jangan membangun item di daftar "Nanti" (§15), tapi jangan juga menutup jalannya. Di akhir setiap fase, jalankan unit test dan tunjukkan checklist kriteria uji fase itu. Patuhi §3. Kalau ada hal yang bertentangan dengan spec, berhenti dan tanyakan.
>
> **Urutan kerja setiap fase:** (1) buat mockup fase itu, (2) tunggu persetujuan pemilik, (3) bangun kode **hanya setelah pemilik menulis "build"**, (4) jalankan unit test + checklist, (5) terbitkan halaman instalasi bertombol Salin.

---

## 1. Masalah dan tujuan

**Masalah**
- FF bertanggung jawab memproses dan meng-update status BAST, tetapi daftar kontraknya ada di 4–5 GSheet milik unit lain, dan ada juga sheet permintaan dari customer.
- Status yang sama harus di-update manual ke banyak sheet, dengan istilah yang tidak seragam. Human error terus terjadi.

**Tujuan v1**
1. **Status Kontrak Manager (SKM) menjadi master.** Status BAST di-update **hanya di aplikasi**.
2. Aplikasi meng-update otomatis kolom milik FF di sheet unit lain, dengan **istilah baku yang sama di semua sheet**.
3. Kontrak baru yang muncul di sheet unit terdeteksi otomatis dan masuk antrian untuk didaftarkan.
4. Tim FF login, setiap kontrak punya PIC, dan admin bisa memantau progres serta aging.

**Bukan cakupan:** BAPL, invoice, dan proses setelah BAST diserahterimakan ke AR.

---

## 2. Istilah

| Istilah | Arti |
|---|---|
| Kontrak | KL, WO, SPK, PO, Nota Pesanan, Surat Pesanan, dll. Satu kontrak = satu periode kontrak. |
| Order Internal | SO atau MI. Satu kontrak punya 1..N (dibagi per jenis layanan/pekerjaan). Dipakai untuk menentukan eviden dasar BAST. |
| BAST | Dokumen tagih, berupa **BAST atau BAA**. Dibuat sekali di depan untuk OTC + MTC. Normalnya 1 per kontrak. |
| Dokumen tagih | BAST atau BAA (`Ref_DokTagih`). Kontrak DIRECT umumnya selesai di BAA. Keduanya memakai tahapan dan teks Nilai Push yang sama. |
| Customer / End customer | Customer (direct customer) = pihak yang berkontrak. End customer = pengguna akhir layanan. |
| Jenis customer | DIRECT bila customer = end customer, INDIRECT bila berbeda, BELUM TERDEFINISI bila salah satunya kosong (§5.7). |
| Script penerima | Apps Script kecil buatan SKM yang dipasang pemilik di tiap sheet target. SKM membaca dan menulis sheet lewat script ini (§8.0). |
| BAST parsial | Kontrak dengan beberapa BAST, karena penagihan dilakukan berangsur ketika sebagian node belum online. Ini **mekanisme biasa**, bukan status khusus. |
| Periode tagih | Untuk BAPL unit lain, **tidak memengaruhi BAST**. Karena periode ini, satu kontrak bisa muncul berulang di sheet unit. |
| Kendala Umum / Kendala Detil | Nilai baku dan keterangan yang di-push ke sheet unit (§5.5). |
| Sheet target | GSheet unit lain yang kolom BAST-nya di-update SKM. |
| Alarm | Temuan saat sinkron yang perlu dilihat manusia, tapi tidak menghentikan proses. |

---

## 3. Prinsip (future-proof)

1. **Tidak ada nilai bisnis di kode.** Tahap, kendala, nilai push, role/hak akses, referensi, dan target semuanya berupa data yang dikelola admin.
2. **ID internal adalah kunci.** ID tidak pernah berubah. Nomor kontrak, label, dan nama boleh dikoreksi. Data yang lain mereferensi kode/ID, bukan label.
3. **Skema hanya bertambah.** Migrasi otomatis hanya menambah kolom/tab dan tidak pernah menghapus data. Fitur baru default-nya mati.
4. **Lapisan penyimpanan terisolasi.** Semua akses data lewat `Repo`, supaya mesin penyimpanan bisa diganti tanpa mengubah logika (§4.2).
5. **Logika bisnis berupa fungsi murni + unit test**, terpisah dari UI dan dari Google API.
6. **"Cek saja" sebelum "Update".** Setiap penulisan ke sheet luar punya pratinjau tanpa menulis.
7. **Log semua perubahan.** Siapa mengubah apa dan kapan, baik di aplikasi maupun di sheet unit.

---

## 4. Arsitektur

### 4.1 Gambaran
```
 Browser (PC kantor) ──► Status Kontrak Manager (Apps Script Web App, akun Gmail khusus FF)
                           │  logika, login, dashboard, sinkron terjadwal
                           ├──► DB aplikasi (file internal, tidak dibuka/diedit manusia)
                           └──► (UrlFetch + kode rahasia) ──► Script penerima di sheet unit A..E
                                                             └─ baca/tulis kolom milik FF, catat edit manual
```
- Aplikasi berjalan di server Google. Tidak ada instalasi di Windows kantor dan tidak ada PC yang harus selalu menyala.
- Deploy: **Execute as Me (akun FF)** · **Access: Anyone with Google account**, ditambah **login username + password milik aplikasi**. Staff tidak butuh akses ke file apa pun.
- Setiap pemilik sheet target memasang **script penerima** sekali (disalin dari wizard SKM, deploy sebagai Web app: Execute as Me · Who has access: Anyone). Akun FF **tidak** perlu akses ke sheet itu. Setiap permintaan dilindungi kode rahasia per target.
- **Nol CDN dan nol request ke luar Google**, karena jaringan kantor memblokir CDN. Font dari Google Fonts (domain Google) boleh dipakai dengan cadangan font sistem bila diblokir; dicek di F0.

### 4.2 Penyimpanan: aplikasi adalah master (keputusan D1, §16)
Aplikasi tetap membutuhkan tempat menyimpan data. Yang jadi master adalah **aplikasinya**. File penyimpanan hanyalah "mesin" di belakangnya, sama seperti `app.db` di BAA.flow, dan tidak dibuka atau diedit manusia.

| | **A. Apps Script + file DB (default spec ini)** | **B. Server ala BAA.flow (FastAPI + SQLite)** |
|---|---|---|
| Infrastruktur | Tidak ada, berjalan di Google | PC/server harus selalu hidup |
| Akses | Dari mana saja via URL Google | Sejauh jaringan server bisa dijangkau |
| Mesin DB | File Google Sheet tersembunyi milik akun FF | File SQLite |
| Kecepatan | ±1–3 detik per aksi | Cepat |
| Kapasitas nyaman | ±10.000 kontrak | Praktis tak terbatas |
| Menulis ke GSheet unit | Lewat script penerima (UrlFetch) | Lewat script penerima yang sama |
| Biaya | Gratis | Gratis (listrik/PC) |

Spec ini ditulis untuk **A**. Kalau nanti dipilih B, aturan bisnis (§5), model data (§7), dan sinkron (§8) tetap berlaku. Yang berubah hanya §12–§13.

---

## 5. Aturan bisnis

### 5.1 Tahapan BAST (fleksibel, dikelola admin)
Tahapan disimpan sebagai data di `Ref_Tahap`:

| Kolom | Arti |
|---|---|
| Kode | ID tetap (huruf kapital, tidak bisa diubah setelah dibuat) |
| Urutan | Posisi dalam alur. Boleh diatur ulang kapan saja |
| Label | Teks tampilan. Boleh diubah |
| Penutup | TRUE = masuk tahap ini berarti BAST **close**. Harus ada tepat satu tahap penutup yang aktif |
| BatasAgingHari | Default 14 |
| Aktif | Tahap yang dinonaktifkan tidak bisa dipilih lagi. Histori tetap aman |

Isi awal:

| Urutan | Kode | Label | Penutup |
|---|---|---|---|
| 1 | KOMPULIR | Kompulir Eviden | |
| 2 | DRAFTING | Drafting Dokumen | |
| 3 | REVIEW_CUST | Draft Review Customer | |
| 4 | SIRKULIR | Sirkulir Dokumen | |
| 5 | BAST_DONE | BAST Done | |
| 6 | TAKEOUT | BAST Takeout / BAST Sertim AR | ✓ |

Aturan:
- Tahap boleh **ditambah**, **diurutkan ulang**, dan **dinonaktifkan**. Penonaktifan ditolak selama masih ada BAST OPEN di tahap itu, dan aplikasi menawarkan untuk memindahkan BAST-BAST tersebut ke tahap lain terlebih dulu.
- Maju dan mundur ditentukan oleh `Urutan`. Mundur wajib disertai keterangan.
- Setiap perpindahan tahap dicatat di `RiwayatTahap` (masuk, keluar, oleh siapa). Tanggal per tahap, misalnya kapan BAST Done atau kapan Takeout, diambil dari riwayat ini, sehingga tidak ada kolom tanggal yang di-hardcode.
- Setiap tahap baru langsung ditawarkan untuk dibuatkan aturan Nilai Push-nya (§5.5).
- Tahapan berlaku sama untuk BAST maupun BAA. Label tahap (mis. "BAST Done") tidak berubah walaupun dokumennya BAA.

### 5.2 Kendala (fleksibel, tidak mengubah tahap)
`Ref_Kendala`: Kode, Label, WajibKeterangan, MemicuReopen, Aktif, Urutan.

| Kode | Label | WajibKet | MemicuReopen |
|---|---|---|---|
| REV_KONTRAK | Revisi Kontrak | ✓ | ✓ |
| REV_DOKUMEN | Revisi Dokumen | ✓ | ✓ |
| RETURN_CUST | Return Customer | ✓ | ✓ |
| KENDALA_CUST | Kendala Sisi Customer | ✓ | |
| LAINNYA | Kendala Lainnya | ✓ | |

- Satu BAST bisa punya beberapa kendala aktif sekaligus. Siklus hidup kendala: AKTIF → SELESAI.
- Admin bisa menambah jenis kendala baru. Jenis lama hanya dinonaktifkan, tidak dihapus.

### 5.3 Close dan reopen
- **Close berarti tugas FF selesai.** Begitu kontrak mencapai tahap penutup (BAST Takeout / Sertim AR) dan memenuhi syarat close di §5.4, kontrak dianggap selesai bagi FF. Setelah nilai penutupnya berhasil ditulis ke sheet unit, SKM berhenti menulis untuk kontrak itu (§8.5).
- **Reopen** terjadi kalau ada return karena revisi, yaitu kendala dengan `MemicuReopen` dibuka pada BAST yang sudah close. Akibatnya: `Siklus + 1`, BAST kembali OPEN di tahap yang dipilih user (default diambil dari `Config.TAHAP_REOPEN` = DRAFTING), kontrak kembali OPEN, dan push ke sheet unit berjalan lagi.

### 5.4 BAST parsial dan status kontrak
- Satu kontrak bisa punya beberapa BAST. Setiap BAST mencatat cakupan: SO/MI mana dan berapa lokasi.
- `JumlahLokasi` di kontrak bersifat opsional.
- **Status kontrak**:
  - `CLOSE` bila kontrak punya **minimal 1 BAST**, semua BAST sudah close, **dan** (JumlahLokasi kosong **atau** Σ cakupan ≥ JumlahLokasi). Kontrak tanpa BAST selalu OPEN.
  - Bila semua BAST close tapi masih ada sisa lokasi, kontrak tetap **OPEN** dengan penanda **"Menunggu BAST lanjutan"**.
  - Selain itu, `OPEN`.
- **Tahap kontrak** = tahap dengan `Urutan` terendah di antara BAST yang OPEN (yang menjadi bottleneck).

### 5.5 Nilai Push: Kendala Umum yang seragam di semua sheet
Satu daftar aturan global (`Ref_NilaiPush`) yang **dibaca dari atas, aturan pertama yang cocok dipakai**, seperti "Values written" di BAA.flow.

| Kondisi | Cocok bila |
|---|---|
| `CLOSE` | Status kontrak CLOSE |
| `SISA_LOKASI` | Menunggu BAST lanjutan |
| `KENDALA:<kode>` / `KENDALA:*` | Ada kendala aktif jenis itu / jenis apa pun |
| `TAHAP:<kode>` | Tahap kontrak = kode itu |
| `BELUM_ADA_BAST` | Kontrak belum punya BAST |

Isi awal (**sudah disetujui FF**). Teks, urutan, dan jumlah aturan tetap bisa diubah admin kapan saja tanpa ubah kode:

| # | Kondisi | Kendala Umum |
|---|---|---|
| 1 | CLOSE | BAST TAKEOUT/SERTIM AR |
| 2 | KENDALA:REV_KONTRAK | REVISI KONTRAK |
| 3 | KENDALA:REV_DOKUMEN | REVISI DOKUMEN |
| 4 | KENDALA:RETURN_CUST | RETURN CUSTOMER |
| 5 | KENDALA:KENDALA_CUST | KENDALA CUSTOMER |
| 6 | KENDALA:* | KENDALA LAINNYA |
| 7 | SISA_LOKASI | BAST PARSIAL - MENUNGGU SISA LOKASI |
| 8 | TAHAP:BAST_DONE | BAST DONE |
| 9 | TAHAP:SIRKULIR | SIRKULIR DOKUMEN |
| 10 | TAHAP:REVIEW_CUST | DRAFT REVIEW CUSTOMER |
| 11 | TAHAP:DRAFTING | DRAFTING DOKUMEN |
| 12 | TAHAP:KOMPULIR | KOMPULIR EVIDEN |
| 13 | BELUM_ADA_BAST | BELUM DIPROSES |

- **Kendala Detil** diisi dari keterangan kendala yang membuat aturan cocok. Kalau aturan yang cocok adalah aturan tahap/close, diisi keterangan BAST terbaru. Kalau ada kendala lain yang juga aktif, ditambah ` (+n)`.
- Kalau tidak ada aturan yang cocok, sel tidak diubah dan muncul alarm `TANPA_ATURAN`. Halaman pengaturan juga memperingatkan bila ada tahap atau kendala aktif yang tidak tercakup aturan mana pun.
- Mengubah aturan otomatis menghitung ulang semua kontrak. Sinkron berikutnya kemudian menyeragamkan semua sheet.
- Teks yang sama dipakai untuk BAST maupun BAA (tetap "BAST DONE" dst.), karena kontrak DIRECT umumnya selesai di BAA.

### 5.6 Aging dan "Perlu Perhatian"
- Bucket aging: Fresh ≤ 7 hari · Warm 8–14 · Stale 15–30 · Cold > 30. Batasnya diatur di Config.
- **Aging tidak pernah berhenti.** Hari terus bertambah selama BAST belum pindah tahap atau kendala belum selesai. Batas hanya menentukan kapan item masuk Perlu Perhatian.
- Daftar Perlu Perhatian:
  - BAST melewati batas aging tahapnya.
  - Kendala aktif lebih lama dari `Config.KENDALA_BATAS_HARI` (default 14).
  - Kontrak tanpa PIC.
  - Data hasil import yang belum diverifikasi.
  - Data kontrak belum lengkap: field di `Config.FIELD_WAJIB` masih kosong (kontrak OPEN).
  - Beda data dengan sheet unit (§8.7).
  - Target dengan error, atau sel yang diubah di luar aplikasi (§8.5).

### 5.7 Jenis customer dan dokumen tagih
- Kontrak menyimpan dua nama: **Customer** (direct customer, pihak yang berkontrak) dan **End customer** (pengguna akhir layanan).
- **Jenis customer** dihitung otomatis, tidak diisi manual:
  - `DIRECT` bila customer = end customer. Perbandingan mengabaikan huruf besar/kecil, spasi, tanda baca, serta kata "PT", "Tbk", "Persero", "CV".
  - `INDIRECT` bila keduanya berbeda.
  - `BELUM TERDEFINISI` bila customer atau end customer masih kosong. Kontrak ini masuk Perlu Perhatian sebagai data belum lengkap.
- Alasannya: pada pelanggan DIRECT, BAA sering sudah berfungsi sebagai BAST, sehingga proses berhenti di BAA. Tidak selalu, jadi aplikasi tidak memaksakan.
- **Dokumen tagih usulan** untuk BAST baru mengikuti jenis customer: `Config.DOKTAGIH_DEFAULT_DIRECT` = BAA, `Config.DOKTAGIH_DEFAULT_INDIRECT` = BAST, `Config.DOKTAGIH_DEFAULT_BELUM` = BAST (selama jenis customer belum terdefinisi).
- Usulan ini bisa diganti per BAST kapan saja. BAA maupun BAST sama-sama bisa menutup kontrak (tahapan dan tahap penutup sama). Penggantian dicatat di Log.
- Populasi tetap kolom referensi tersendiri dan tidak dipakai untuk menghitung jenis customer.
- Jenis customer dipakai untuk filter dan dashboard. Tidak memengaruhi tahapan maupun Nilai Push.

---

## 6. User dan hak akses (draft, didiskusikan lagi, D2)

- **Semua staff boleh meng-update kontrak mana pun**, karena tim saling membantu. Tidak ada mekanisme request edit.
- **PIC** berfungsi sebagai penanggung jawab untuk delegasi dan pemantauan, bukan pembatas edit. Log mencatat siapa yang benar-benar meng-update. Dashboard menampilkan berapa update yang dilakukan seseorang pada kontrak di luar PIC-nya, dengan label "bantu".
- Hak akses berupa **data**: tab `Ref_Role` memetakan role ke daftar izin, dan admin bisa mengubahnya tanpa ubah kode.

Daftar izin: `dashboard.lihat`, `kontrak.lihat`, `kontrak.update`, `kontrak.daftar` (buat kontrak, proses antrian, import), `kontrak.arsip`, `pic.atur`, `sinkron.jalankan`, `target.kelola`, `pengaturan.kelola` (tahap, kendala, nilai push, referensi, config), `user.kelola`, `log.semua`, `export`.

| Izin | ADMIN | STAFF | VIEWER |
|---|:-:|:-:|:-:|
| dashboard.lihat, kontrak.lihat, export | ✓ | ✓ | ✓ |
| kontrak.update, kontrak.daftar | ✓ | ✓ | |
| kontrak.arsip, pic.atur, sinkron.jalankan, target.kelola, pengaturan.kelola, user.kelola, log.semua | ✓ | | |

- Sistem menolak perubahan yang membuat tidak ada lagi admin dengan `user.kelola`.

### 6.1 Akun (pola mirip BAA.flow)
- Akun milik aplikasi, bukan akun Google. **Username bebas**: NIK, nama, atau apa pun; 3–32 karakter (huruf, angka, titik, garis bawah, strip), disimpan huruf kecil, dan menjadi ID tetap yang tidak bisa diganti.
- `setup()` membuat admin awal `admin` dengan password sementara yang tampil sekali di Execution log. Admin awal boleh dinonaktifkan setelah ada admin lain.
- **Password baru atau reset**: admin memilih **buat acak** (ditampilkan sekali setelah disimpan) atau **ketik sendiri**. Keduanya membuat user **wajib mengganti password** saat login berikutnya. Syarat: minimal `Config.PASSWORD_MIN` (8) karakter, berisi huruf dan angka, berbeda dari password lama. Reset mengakhiri sesi aktif user itu.
- Lupa password diselesaikan dengan reset oleh admin; tidak ada reset lewat email.
- Salah password `Config.LOGIN_GAGAL_MAKS` (5) kali → akun terkunci `Config.KUNCI_MENIT` (15) menit. Admin bisa membuka kunci lebih cepat.
- **Hapus user hanya bila user itu belum pernah beraktivitas** (belum pernah login dan tidak punya entri Log sebagai pelaku). User yang sudah punya riwayat hanya bisa **dinonaktifkan**, supaya Log tetap utuh.
- User tanpa `log.semua` hanya melihat "Log saya".
- Tampilan: daftar user dengan filter status/role dan menu ⋮ per baris; form tambah/ubah berupa panel geser dengan kartu role yang menampilkan izin yang didapat.

### 6.2 Akuntabilitas (keputusan D11)
- Login memakai username + password SKM. Login dengan akun Google tidak dipakai: untuk Gmail biasa, Google menyembunyikan email pengunjung web app yang berjalan sebagai akun FF.
- **Satu orang satu akun**; akun tidak boleh dipinjamkan. Password sementara dari admin wajib diganti, jadi admin tidak mengetahui password akhir user. Reset password tercatat (`RESET_PASSWORD`) dan mengakhiri sesi user tersebut.
- Setiap aksi yang mengubah data mencatat username, waktu (Asia/Jakarta), nilai lama → baru, dan keterangan di `Log` yang hanya bisa ditambah. Tidak ada fitur ubah/hapus Log, termasuk untuk admin. User yang punya riwayat tidak bisa dihapus.
- Perpindahan tahap tercatat di `RiwayatTahap` (oleh siapa, kapan, keterangan; mundur wajib keterangan) dan tampil di tab Riwayat detail kontrak, termasuk penanda "bantu" bila dilakukan non-PIC (§6).
- Risiko sisa: pemilik akun FF bisa mengedit `SKM_DB` langsung. Mitigasi: file tidak dibagikan (dicek di halaman Sistem), password akun FF dipegang maks. 2 orang, riwayat versi Google Drive, dan backup mingguan (F5).
- Semua pengecekan izin dilakukan di server.

---

## 7. Model data (tab di DB aplikasi)

Aturan umum: baris 1 berisi header. ID dibuat server dan tidak pernah berubah. Timestamp memakai zona `Asia/Jakarta`. `Version` dipakai untuk mencegah dua orang saling timpa.

| Tab | Kolom |
|---|---|
| `Kontrak` | KontrakID, NoKontrak, NoKontrakNorm, JenisDok, TahunProject, Populasi, NamaPelanggan (customer), EndCustomer, JudulKontrak, Segment, NilaiKontrak, JumlahLokasi, PIC, **turunan:** JenisCustomer, TahapKontrak, StatusKontrak, SisaLokasi, KendalaUmum, KendalaDetil, TglStatusBerubah · PerluVerifikasi, Arsip, SumberAwal, Created/UpdatedAt/By, Version |
| `KontrakAlias` | AliasNorm, NoAsli, KontrakID, Sumber (`KOREKSI`/`ANTRIAN`/`UPLOAD`), Catatan, CreatedAt/By |
| `OrderInternal` | OrderID, KontrakID, JenisOrder (SO/MI), NoOrder, NoOrderNorm, JenisLayanan, JenisPekerjaan, JumlahLokasi, Keterangan, Created/UpdatedAt/By, Version |
| `BAST` | BASTID (`K-000001-B1`), KontrakID, Urutan, DokTagih (BAST/BAA), KodeTahap, Siklus, CakupanOrder, CakupanLokasi, DaftarLokasi, NoDokBAST, TglTahapMulai, Keterangan, Status (OPEN/CLOSE), Created/UpdatedAt/By, Version |
| `RiwayatTahap` | BASTID, Siklus, KodeTahap, Masuk, Keluar, Oleh, Keterangan |
| `Kendala` | KendalaID, BASTID, KontrakID, Jenis, Keterangan, Status, Mulai, DibuatOleh, Selesai, DiselesaikanOleh |
| `Log` | Timestamp, Username, Aksi, Entitas, EntitasID, Field, NilaiLama, NilaiBaru, Catatan, Hasil (`BERHASIL`/`GAGAL`/`DITOLAK`) *(hanya ditambah)* |
| `_Meta` | Key, Nilai *(SKEMA_VERSI, DB_DIBUAT, RIWAYAT_MIGRASI)* |
| `Users` | Username, Nama, AliasPIC, Role, PasswordHash, Salt, Aktif, WajibGantiPassword, GagalLogin, TerkunciSampai, LoginTerakhir, PunyaAktivitas, SesiVersi, CreatedAt/By, UpdatedAt/By, Version *(PasswordHash = `sha256$<iterasi>$<hex>`)* |
| `Ref_Role` | Role, Izin (dipisah koma) |
| `Ref_Tahap`, `Ref_Kendala`, `Ref_NilaiPush` | §5 |
| `Ref_JenisDok`, `Ref_Populasi`, `Ref_Segment`, `Ref_DokTagih` | Kode, Label, Aktif |
| `Target` | TargetID, Nama, ModeKoneksi (`RECEIVER`; `LANGSUNG` disiapkan untuk nanti), WebAppUrl, VersiScript, SpreadsheetID (diisi dari info script), ModeTab (`FIXED`/`TERBARU`), TabNama atau pola, CaraTerbaru (`TANGGAL_DI_NAMA`/`POSISI_TERAKHIR`), TabTerakhirDipakai, AliasHeaderKunci, FormatTanggal, Aktif, TerakhirCek, TerakhirUpdate, StatusTerakhir, PesanTerakhir *(kode rahasia disimpan di Script Properties, tidak di DB)* |
| `TargetKolom` | TargetID, Field (standar atau `INFO:<label>`), Arah (`KUNCI`/`TULIS`/`BACA`), JudulHeader, AliasHeader, KolomTerakhir (huruf, catatan saja) |
| `DataUnit` | TargetID, Tab, Baris, KontrakID, Field (field BACA standar atau `INFO:<label>`), Nilai, DiambilPada *(snapshot hasil cek terakhir; ditimpa setiap cek, bukan riwayat)* |
| `JejakSel` | TargetID, Tab, NoKontrakNorm, Field, NilaiDitulis, WaktuTulis *(nilai terakhir yang ditulis SKM, §8.5)* |
| `RiwayatPush` | Waktu, Oleh (user/`trigger`), Jenis (`TULIS`/`DIUBAH_LUAR`), TargetID, Tab, Baris, NoKontrak, Field, NilaiLama, NilaiBaru, Pelaku, WaktuKejadian *(hanya ditambah; Pelaku dan WaktuKejadian dari pencatat edit script penerima)* |
| `SyncLog` | Waktu, Oleh, Jenis (`CEK`/`UPDATE`), TargetID, Tab, BarisCocok, SelDitulis, Gagal, Alarm, Detail |
| `Notifikasi` | NotifID, Untuk (username), Jenis (`DIUBAH_LUAR`/`SINKRON_ERROR`/`TAB_BERGANTI`/`ANTRIAN_BARU`/`PIC_DITUGASKAN`), Pesan, KontrakID, TargetID, Dibaca, Waktu |
| `Antrian` | AntrianID, TargetID, Tab, Baris, NoKontrakAsli, NoKontrakNorm, Prefill, Status (`BARU`/`DIDAFTARKAN`/`DIALIASKAN`/`DIABAIKAN`), DiprosesOleh, DiprosesPada |
| `Config` | key–value: APP_NAMA = "Status Kontrak Manager", SESI_JAM = 6, LOGIN_GAGAL_MAKS = 5, KUNCI_MENIT = 15, PASSWORD_MIN = 8, SYNC_INTERVAL_MENIT = 15, TAHAP_REOPEN = DRAFTING, AGING_BATAS = 7,14,30, KENDALA_BATAS_HARI = 14, FIELD_WAJIB = Customer,EndCustomer,NilaiKontrak,Segment,Populasi,OrderInternal, DOKTAGIH_DEFAULT_DIRECT = BAA, DOKTAGIH_DEFAULT_INDIRECT = BAST, DOKTAGIH_DEFAULT_BELUM = BAST, KONFIRMASI_TAB_BARU = TRUE, BACKUP_SIMPAN = 8, SKEMA_VERSI |

---

## 8. Sinkron ke sheet unit

### 8.0 Script penerima (keputusan D6)
- SKM tidak membuka sheet unit secara langsung. Setiap sheet target memasang **script penerima** (satu file `.gs` yang disalin dari wizard), lalu di-deploy sebagai Web app: *Execute as: Me (pemilik sheet) · Who has access: Anyone*.
- SKM memanggilnya lewat `UrlFetchApp` (POST JSON) dengan **kode rahasia** per target. Permintaan tanpa kode yang benar ditolak.
- Aksi yang tersedia:

  | Aksi | Isi |
  |---|---|
  | `info` | versi script, nama file, daftar tab, waktu ubah terakhir, status pencatat edit |
  | `baca` | 15 baris teratas (untuk deteksi header) + kolom yang diminta saja |
  | `tulis` | daftar sel `{baris, kolom, nilai}` + **judul header yang diharapkan untuk setiap kolom** + nilai kolom kunci yang diharapkan per baris. Script mengunci (`LockService`), membaca ulang baris header dan kolom kunci, menolak seluruh tab bila ada judul yang berubah/hilang atau urutan baris bergeser, lalu menulis dalam satu batch. Sel berformula tidak ditimpa |
  | `edit` | edit manual yang tercatat di kolom milik FF sejak waktu tertentu |
- **Pencatat edit manual:** pemilik menjalankan fungsi `pasang()` sekali untuk memasang trigger `onEdit` (installable). Trigger mencatat setiap edit pada kolom yang dipetakan sebagai TULIS: tab, baris, kolom, nilai lama, nilai baru, waktu, dan email pelaku. Catatan disimpan di Script Properties milik script penerima (dibatasi N catatan terakhir) dan diambil SKM setiap cek. Email pelaku bisa kosong untuk sebagian akun Gmail biasa; dalam hal itu yang tampil hanya waktunya.
- Script penerima punya `VERSI`. Bila versi di sheet lebih lama dari versi yang disediakan SKM, target ditandai "Script perlu diperbarui" dan tetap berjalan selama masih kompatibel.
- File besar (Billcom ±12 MB) bukan masalah, karena pembacaan dilakukan di dalam sheet itu sendiri dan hanya kolom yang dibutuhkan yang dikirim.

### 8.1 Cara kerja
- Trigger tiap 15 menit menjalankan sinkron, tapi **hanya untuk target yang datanya berubah** sejak update terakhir, atau minimal sekali tiap 6 jam untuk mendeteksi kontrak baru.
- Admin bisa menjalankan secara manual per target: **Cek saja** (pratinjau perubahan + alarm, tidak menulis) atau **Update ke GSheet**.
- Yang ditulis hanya kolom milik FF. Script tidak pernah menambah/menghapus baris atau kolom, tidak mengubah format, dan tidak menimpa sel berformula (sel itu menjadi alarm).
- Semua baris yang memuat kontrak yang sama (karena periode tagih) menerima nilai yang sama.
- Kontrak CLOSE yang nilai penutupnya sudah berhasil ditulis **tidak ditulis lagi** (§8.5).

### 8.2 Pencocokan nomor kontrak
```js
normKey(s) = String(s ?? '').normalize('NFKC').toUpperCase()
             .replace(/[‐-―−]/g, '-').replace(/\s+/g, '').replace(/\.+$/, '')
```
- Hasil `normKey` dicari di `Kontrak.NoKontrakNorm`, lalu di `KontrakAlias`.
- Nomor yang tidak dikenal masuk Antrian (§9).
- Sel yang berisi lebih dari satu nomor tidak ditulis, dan menjadi alarm.

### 8.3 Header dan tab
- Kolom dicari berdasarkan **judul header** (perbandingan tanpa peduli huruf besar/kecil, spasi, dan tanda baca), di 15 baris teratas, dengan daftar alias per field. Ini menyelesaikan masalah `IMPORTRANGE` yang meleset ketika ada kolom disisipkan.
- Kalau header kunci atau header tujuan tidak ditemukan, atau ditemukan lebih dari satu, **tab dilewati** dan dicatat sebagai error. Script tidak pernah menebak kolom.
- **ModeTab `TERBARU`** dipakai untuk sheet yang datanya pindah tab tiap bulan (Billcom):
  - Pola nama tab diatur lewat wizard, dengan pratinjau daftar tab yang cocok.
  - Hanya tab bulan terbaru yang di-update. Tab bulan lalu tidak, karena datanya sudah terbawa ke tab baru.
  - Saat tab baru terdeteksi, muncul alarm `TAB_BERGANTI`. Bila `KONFIRMASI_TAB_BARU`, target itu hanya berjalan dalam mode Cek saja sampai admin menekan "Pakai tab baru".

### 8.4 Pemetaan kolom per target
Setiap target punya pemetaannya sendiri (`TargetKolom`), dibuat di wizard dari dropdown header yang terdeteksi. Wizard menampilkan huruf kolom dan contoh isinya supaya admin yakin memilih kolom yang benar.

| Jenis | Field | Dipakai untuk |
|---|---|---|
| KUNCI | nomor kontrak | Mencocokkan baris dengan kontrak (§8.2). Wajib |
| TULIS | `KENDALA_UMUM`, `KENDALA_DETIL`, `TAHAP`, `TGL_UPDATE`, `TGL_TAHAP:<kode>` (mis. tanggal BAST Done), `PIC`, `NO_BAST`, `DOK_TAGIH` (BAST/BAA), `PARSIAL` (contoh: "2/3 BAST · 40/60 lokasi") | Kolom milik FF yang diisi SKM. Nilainya sama untuk semua target |
| BACA standar | `PELANGGAN`, `END_CUSTOMER`, `JUDUL`, `NILAI`, `TAHUN`, `POPULASI`, `SEGMENT`, `NO_ORDER` (SO/MI), `JUMLAH_LOKASI` | Prefill Antrian, melengkapi data kontrak, dan cek beda data (§8.7) |
| BACA bebas | `INFO:<label>` untuk kolom apa pun (mis. Periode tagih, AM, Status penagihan) | Ditampilkan di detail kontrak sebagai info tambahan |

Aturan validasi (wizard menolak simpan bila dilanggar):
- Satu header hanya boleh dipakai oleh satu field KUNCI/TULIS.
- Kolom TULIS tidak boleh sama dengan kolom KUNCI atau kolom BACA mana pun.
- Minimal ada kolom KUNCI dan satu kolom TULIS.
- Pemetaan disimpan sebagai **judul header** (plus alias), dengan huruf kolom terakhir sebagai catatan. Saat sheet berubah, SKM mengikuti judulnya, bukan hurufnya.
- SKM **tidak pernah menulis** kolom BACA atau kolom yang tidak dipetakan.

### 8.5 Jejak perubahan sel (jawaban pertanyaan no. 5)
**Fakta teknis:** Google Sheets **tidak menyediakan** tanggal atau pelaku terakhir per sel lewat API. Riwayat edit per sel ("Show edit history") hanya ada di tampilan web. Yang tersedia lewat API hanya level file: waktu ubah terakhir file dan siapa yang mengubahnya.

Dengan script penerima (§8.0), edit manual di kolom milik FF **bisa** dicatat per sel lewat trigger `onEdit`, termasuk waktu dan (bila tersedia) pelaku. Mekanisme di bawah tetap dipakai sebagai lapisan kedua, misalnya untuk perubahan lewat rumus, tempel massal, atau saat pencatat belum dipasang.

**Solusi di SKM**, supaya log perubahan per sel tetap ada:
1. Setiap sel yang ditulis SKM dicatat di `RiwayatPush`: waktu, oleh siapa, sheet, tab, baris, kontrak, field, nilai lama → nilai baru. Riwayat ini tampil di detail kontrak sebagai "Riwayat di sheet unit".
2. Nilai terakhir yang ditulis disimpan di `JejakSel`. Setiap kali cek, nilai sel sekarang dibandingkan dengan `JejakSel`. Kalau berbeda, berarti **ada yang mengubah di luar aplikasi**. Hasilnya:
   - temuan `DIUBAH_LUAR` (nilai SKM vs nilai sekarang),
   - rentang waktu kejadian (antara cek terakhir dan sekarang),
   - pelaku dan waktu persis dari pencatat edit bila ada; bila tidak, petunjuk level file (waktu ubah terakhir file),
   - catatan di `RiwayatPush` dengan jenis `DIUBAH_LUAR`.
3. **Perubahan dari luar hanya dilaporkan sebagai notifikasi, tidak dilawan.** Kalau sel diubah orang lain, itu adalah mekanisme manual unit tersebut di luar SKM. Aturannya:
   - Kontrak **OPEN**:
     - SKM **tidak menimpa** sel itu saat sinkron rutin, dan mengirim notifikasi ke PIC kontrak serta admin: *"Kolom KENDALA UMUM kontrak X di sheet Billcom (tab NOV 2026, baris 120) diubah di luar SKM: 'DRAFTING DOKUMEN' → 'BAST DONE'"*.
     - Begitu status kontrak itu di-update lagi di SKM sehingga nilai push-nya berubah, SKM menulis nilai baru seperti biasa, karena update dari FF selalu menang.
   - Kontrak **CLOSE**: perubahan dari luar hanya dicatat di `RiwayatPush`, **tanpa notifikasi**, karena tugas FF untuk kontrak itu sudah selesai.
   - Kontrak yang **reopen**: SKM langsung menulis nilai terbaru pada sinkron berikutnya.
4. Ketika tab pertama kali dipakai, termasuk tab bulan baru Billcom, nilai yang ada dianggap titik awal, sehingga tidak muncul notifikasi.

### 8.6 Keamanan penulisan
- Setiap permintaan tulis membawa judul header yang diharapkan untuk tiap kolom tujuan. Script penerima membaca ulang baris header; bila ada judul yang berubah, hilang, atau ganda, seluruh tab dibatalkan dengan alarm `KOLOM_BERUBAH` dan notifikasi `SINKRON_ERROR` ke admin.
- Sebelum menulis, script penerima membaca ulang kolom kunci di dalam `LockService`. Kalau urutan baris berubah sejak dibaca (karena pemilik sheet menyisipkan atau mengurutkan), tab itu dibatalkan dan dicoba lagi di siklus berikutnya.
- Semua perubahan pada satu tab ditulis dalam satu panggilan batch.
- Hanya kolom yang dibutuhkan yang dibaca dan dikirim balik ke SKM.

### 8.7 Data dari sheet unit (info selengkap mungkin)
- Setiap cek, nilai kolom BACA (standar dan bebas) untuk setiap baris yang cocok disimpan ke `DataUnit` sebagai snapshot terbaru.
- Detail kontrak punya tab **Sheet unit**: per target ditampilkan tab dan nomor baris (bisa lebih dari satu karena periode tagih), nilai kolom BACA dibandingkan dengan data di SKM, info tambahan, serta isi kolom milik FF saat ini vs nilai yang akan ditulis SKM.
- Perbandingan dengan data SKM:
  - SKM kosong, sheet terisi → **saran melengkapi** (tombol "Pakai nilai sheet").
  - Keduanya terisi tapi berbeda → **beda data**, masuk Perlu Perhatian. Tidak ada yang ditimpa otomatis; user memilih nilai mana yang dipakai, dan pilihan itu dicatat di Log.
  - Bila dua sheet unit memberi nilai berbeda untuk field yang sama, keduanya ditampilkan.
- Perubahan Customer/End customer dari sini otomatis menghitung ulang jenis customer (§5.7).
- Kontrak yang tidak ditemukan di sheet unit mana pun diberi keterangan "belum ditemukan di sheet unit" (biasanya penulisan nomor berbeda → alias).

---

## 9. Antrian kontrak baru
- Nomor kontrak di sheet unit yang belum terdaftar masuk ke Antrian (sekali per nomor), dengan data prefill dari field BACA.
- Tindakan yang tersedia:
  - **Daftarkan** (pilih PIC),
  - **Aliaskan** ke kontrak yang sudah ada (karena penulisannya berbeda),
  - **Abaikan** (dengan alasan).

---

## 10. Halaman v1

Tampilan mengikuti mockup `mockup/mockup.html` (desain "Orbit"): **tema terang dan gelap** (ikut sistem atau dipilih user, disimpan per browser), aksen teal, sidebar kaca, kartu, dan animasi transisi yang menghormati *reduced motion*. Tanpa CDN: ikon inline SVG, chart SVG buatan sendiri, font Plus Jakarta Sans + JetBrains Mono dengan cadangan font sistem. Bahasa UI: Indonesia.

1. **Login.** Username + password. Password wajib diganti saat login pertama.
2. **Dashboard**
   - KPI: kontrak OPEN, BAST OPEN, nilai kontrak OPEN, kendala aktif, close bulan ini.
   - Jumlah kontrak per tahap dan per Kendala Umum.
   - **Tabel tim** per PIC: open, kendala, bar aging Fresh/Warm/Stale/Cold, jumlah update 7 hari (termasuk yang "bantu"), dan perubahan terakhir.
   - Status sinkron per target.
3. **Kontrak**
   - Tabel dengan filter (tahap, Kendala Umum, PIC, populasi, segment, pelanggan, status) dan pencarian.
   - **Detail** dibuka sebagai panel geser dari kanan (daftar tetap terlihat; pindah kontrak dengan panah atau J/K; Esc menutup) dengan tab Proses · Data kontrak · Sheet unit · Riwayat. Isinya: data kontrak beserta kelengkapannya, SO/MI, daftar BAST (tambah BAST parsial, ubah tahap, cakupan), kendala (buka/tutup), pratinjau nilai yang akan muncul di sheet unit, data dari setiap sheet unit (§8.7), riwayat perubahan, dan riwayat di sheet unit.
   - Aksi massal: atur PIC.
   - Pencarian cepat **Ctrl+K** dari halaman mana pun.
4. **Perlu Perhatian** (§5.6).
5. **Antrian** (§9).
6. **Google Sheet**
   - Daftar target, tombol **Tes koneksi**, **Cek saja**, dan **Update ke GSheet**, alarm, dan tabel Update log.
   - **Wizard target**: salin script penerima + kode rahasia untuk pemilik sheet → tempel Web App URL dari pemilik → Tes koneksi → pilih tab atau pola → pilih header untuk setiap field dari dropdown → Cek saja → aktifkan.
7. **Pengaturan**: Tahap, Kendala, Nilai Push (urutkan, tambah, aktif/nonaktif, pratinjau "berapa kontrak terkena"), Referensi, Role & izin, Users, Config, Import, Backup.
8. **Log**, dengan filter dan export xlsx.
9. **Notifikasi**: ikon lonceng dengan jumlah belum dibaca di topbar. Klik notifikasi membuka kontrak atau target terkait, dan ada tombol "tandai sudah dibaca".
   - **Kontrak CLOSE tidak memunculkan notifikasi apa pun.**
     - Saat kontrak close, semua notifikasi miliknya yang belum dibaca otomatis ditutup dan hilang dari lonceng (kolom `Dibaca` diisi `AUTO_CLOSE`).
     - Selama kontrak berstatus CLOSE, tidak ada notifikasi baru untuk kontrak itu, dari jenis apa pun.
   - Saat kontrak reopen, notifikasi berjalan lagi, tapi hanya untuk kejadian baru. Notifikasi lama tidak dimunculkan kembali.
   - Notifikasi yang tidak terkait kontrak tertentu (error sinkron, tab berganti) tetap berjalan normal.
10. **Export**: daftar kontrak terfilter sebagai xlsx dengan kolom standar, dikerjakan di server.

---

## 11. Import data awal

### 11.0 Upload Excel dengan template SKM (F2, D13)
- **Unduh template**: dibuat SKM saat diklik, berisi tab Petunjuk, `Kontrak` (satu baris = satu kontrak), `SO_MI` (satu baris = satu order, dihubungkan lewat No. Kontrak), dan `Referensi` (daftar dropdown sesuai Pengaturan saat itu). Kolom wajib: No. Kontrak, Judul Kontrak. Kolom opsional: Jenis Dok, Tahun, Populasi, Customer, End Customer, Segment, Nilai, Jumlah Lokasi, PIC, Dok Tagih BAST-1, Tahap Awal BAST-1, Tgl Masuk Tahap, Kendala, Keterangan Kendala, Catatan. Contoh: `mockup/Template_Upload_Kontrak_SKM.xlsx`.
- **Baca**: kolom dikenali dari judul header; file dibaca di browser, lalu **server memeriksa ulang semuanya** sebelum menyimpan.
- **Pratinjau** per baris: Baru, Baru dengan peringatan (tetap disimpan, mis. Customer kosong → BELUM TERDEFINISI, PIC tidak dikenal → tanpa PIC, referensi tidak dikenal → dikosongkan), Sudah ada (cocok lewat nomor atau nomor lama), Error (tidak disimpan: nomor/judul kosong, nomor dobel di file, nilai/lokasi/tanggal tidak terbaca, tanggal masa depan, tahap/kendala/dok tagih tidak dikenal, kendala tanpa keterangan). Baris SO_MI diperiksa juga (kontrak harus ada, jenis SO/MI, nomor order tidak dobel/terpakai).
- **Nomor sudah ada**: pilihan *Lewati* (default) atau *Perbarui kolom yang diisi* (sel kosong tidak menghapus; tahap & kendala kontrak lama tidak diubah).
- **Simpan**: bertahap per 50 baris di dalam kunci; upload ulang file yang sama aman (yang sudah tersimpan terbaca Sudah ada). Setiap kontrak baru mendapat BAST-1 (tahap & tanggal dari file, dok tagih dari file atau usulan otomatis), `SumberAwal = UPLOAD`, tidak diberi PerluVerifikasi. Log: `BUAT_KONTRAK`/`UBAH_KONTRAK` per baris + satu `UPLOAD_EXCEL` ringkasan. Laporan baris error bisa diunduh (.xlsx).
- Izin `kontrak.daftar`. User tanpa `pic.atur`: kolom PIC diabaikan, PIC = dirinya. Maksimal 1.000 baris per file.

### 11.1 Import sheet FF format lama (F3)
Alurnya: unggah sheet FF lama (xlsx) → pemetaan kolom → **pratinjau + validasi per baris** → simpan. Semua hasil import diberi `PerluVerifikasi = TRUE`.

| Kolom lama | Ke SKM |
|---|---|
| NO WO/SPK/KL | NoKontrak. JenisDok ditebak dari teksnya |
| TAHUN PROJECT, POPULASI, NAMA PELANGGAN, JUDUL KONTRAK, SEGMENT TSAT | kolom sejenis. Nilai referensi baru otomatis ditambahkan. NAMA PELANGGAN = **End customer** (pemetaan default). Customer dilengkapi saat verifikasi atau dari tab Sheet unit; sampai terisi, jenis customer BELUM TERDEFINISI |
| NILAI KONTRAK | `"Rp 95,352,000.00"` → 95352000 |
| PIC | dicocokkan dengan `Users.AliasPIC` |
| STATUS AWAL + KENDALA UMUM + KENDALA DETIL | tabel pemetaan di bawah (bisa diedit di layar import) |

| Nilai lama | Hasil |
|---|---|
| KOMPULIR EVIDENCE / KOMPULIR EVIDEN | BAST-1 tahap KOMPULIR |
| BAST ON REVIEW | tahap REVIEW_CUST ✔ (sudah dikonfirmasi) |
| BAST DONE | tahap BAST_DONE |
| BAST TAKEOUT / SERTIM AR | tahap TAKEOUT |
| BAST REVISI | kendala REV_DOKUMEN, keterangan = KENDALA DETIL |
| BAST PARSIAL | kontrak ditandai parsial, detail BAST dilengkapi PIC saat verifikasi |
| nilai lain | tahap KOMPULIR + kendala LAINNYA (keterangan = nilai asli) |

- Kalau STATUS AWAL dan KENDALA UMUM menunjuk tahap yang berbeda, pakai tahap yang paling maju.
- Nomor yang sudah ada dilewati dan dilaporkan.

---

## 12. Ketentuan teknis (opsi A)

**Struktur proyek (clasp)**
```
status-kontrak-manager/
├─ SPEC.md
├─ appsscript.json   # Asia/Jakarta, V8, webapp executeAs USER_DEPLOYING + access ANYONE, Drive API v3, scope script.external_request
├─ src/
│  ├─ Code.gs        # doGet, api(token, action, payload) — satu pintu
│  ├─ Auth.gs        # login, sesi, hash password, cek izin
│  ├─ Repo.gs        # satu-satunya yang menyentuh DB; migrasi skema; cache
│  ├─ Domain.gs      # aturan §5 (fungsi murni)
│  ├─ Sheet.gs       # normKey, deteksi header/tab (fungsi murni)
│  ├─ Sync.gs        # cek, update, jejak sel, antrian, trigger
│  ├─ Import.gs · Export.gs · Backup.gs · Setup.gs
│  ├─ Index.html · Styles.html · Icons.html · App.js.html
├─ receiver/Receiver.gs  # script penerima untuk pemilik sheet (ditandai VERSI)
├─ tools/               # build: gabungkan src/ menjadi dist/Code.gs + halaman instalasi
├─ dist/                # hasil build: Code.gs, appsscript.json, install.html
└─ test/             # node --test: domain, sheet, import
```
- **Distribusi**: user cukup menyalin 2 file (`Code.gs` + `appsscript.json`) dari halaman instalasi bertombol Salin. HTML UI disematkan di dalam `Code.gs`. Update versi = salin ulang `Code.gs`, lalu *Deploy › Manage deployments › Edit › New version*. Migrasi skema berjalan otomatis saat versi baru pertama kali dibuka.
- **Konkurensi**: `LockService` untuk setiap penulisan, plus `Version` per baris. Kalau ada konflik, user diminta memuat ulang.
- **Performa**: data dibaca sekali per request dan di-cache 5 menit. Penulisan hanya pada baris yang berubah.
- **Kuota akun gratis**: runtime trigger 90 menit per hari. Karena sinkron hanya jalan saat ada perubahan, pemakaian diperkirakan di bawah 30 menit per hari.
- **Keamanan**:
  - Password di-hash (SHA-256 berulang + salt), akun dikunci 15 menit setelah 5 kali gagal login.
  - Sesi berupa token di CacheService dengan masa berlaku 6 jam yang diperpanjang setiap request.
  - Semua output di-escape.
  - File DB tidak dibagikan ke siapa pun selain akun FF dan maksimal 1 admin cadangan.
- **Backup**: salinan file DB mingguan ke folder Drive, menyimpan 8 salinan terakhir, plus tombol backup manual.

---

## 13. Setup
1. Buat **Gmail khusus unit FF**.
2. (Per target, saat F4) Kirim script penerima + kode rahasia ke pemilik sheet. Pemilik memasang, menjalankan `pasang()`, men-deploy, lalu mengirim balik Web App URL.
3. Buka halaman instalasi, salin `Code.gs` dan `appsscript.json` ke project baru di script.google.com.
4. Aktifkan Drive API (Services › Drive API).
5. Jalankan `setup()` sekali. Fungsi ini membuat file DB, isi awal referensi, admin awal, dan trigger.
6. Deploy sebagai Web app: Execute as Me, Anyone with Google account.
7. Admin login, lalu:
   1. buat user (isi AliasPIC: Edo, Unggul, Baim, Alif, …),
   2. finalkan Nilai Push,
   3. import data FF lama,
   4. tambah target lewat wizard (script penerima) → Tes koneksi → Cek saja → Update → aktifkan.

---

## 14. Cakupan v1 dan fase

Setiap fase: mockup → disetujui → **build** (atas perintah pemilik) → unit test + checklist → halaman instalasi. Update ke versi baru = salin ulang `Code.gs` + *New version*; data tetap aman karena migrasi hanya menambah.

| Fase | Isi | Setelah fase ini | Selesai bila |
|---|---|---|---|
| F0 | Web app uji dari jaringan kantor | – | Halaman terbuka, server menjawab, font Google & UrlFetch dicek. **Wajib lulus dulu** |
| F1 | Setup, Repo + migrasi skema, login + ganti password, Users, Role & izin, Log, kerangka UI (sidebar, tema terang/gelap) | Admin login dan membuat akun tim | Izin ditolak di server, semua aksi tercatat |
| F2 | Kontrak, Customer/End customer, SO/MI, BAST/BAA, tahap fleksibel, kendala, reopen, parsial, Nilai Push, panel detail, **Upload Excel template SKM (§11.0)**, pencarian nomor lama, arsip, Pengaturan (tahap, kendala, nilai push, referensi, config) | Tim input dan update status di SKM (belum sinkron) | Semua aturan §5 lulus unit test, termasuk tambah/urut ulang/nonaktifkan tahap |
| F3 | **Import data lama** (§11), Dashboard, Perlu Perhatian, atur PIC massal, Ctrl+K | Data riil masuk; admin memantau | 4 baris Lampiran A ter-import sesuai §11 · angka dashboard cocok dengan hitungan manual |
| F4a | Script penerima, wizard target (koneksi, tab TERBARU, pemetaan + validasi), Cek saja, Update, pengaman kolom | Status terkirim ke sheet unit dengan istilah seragam | Uji di **salinan** sheet lulus: kolom disisipkan, judul header diganti/hilang → ditolak, header dipakai ganda → wizard menolak, sel berformula, kontrak berulang, tab bulan baru, baris diurutkan ulang |
| F4b | Pencatat edit manual, jejak sel, notifikasi lengkap + tutup otomatis, Antrian, tab Sheet unit (§8.7), beda data & kelengkapan, sinkron terjadwal | Sistem berjalan sendiri tiap 15 menit | Sel kontrak OPEN diubah manual → notifikasi (dengan pelaku bila ada) + tidak ditimpa, lalu ditulis lagi setelah status di SKM berubah · kontrak CLOSE tidak ditulis lagi dan perubahan luar tanpa notifikasi · saat kontrak close, notifikasinya yang belum dibaca hilang dari lonceng · reopen → ditulis lagi · nomor baru masuk Antrian sekali |
| F5 | Export xlsx, Backup mingguan + manual | v1 lengkap | Export sesuai filter; backup tersimpan dan maksimal 8 salinan |

## 15. Nanti (sesuai kondisi lapangan, sengaja tidak dibangun di v1)
- Export ke **template customer** (unggah template → petakan kolom → isi) beserta preset per customer.
- Mode koneksi **LANGSUNG** (akun FF diberi akses Editor, tanpa script di sheet pemilik), sebagai alternatif script penerima.
- Mode tab `SEMUA` (update banyak tab sekaligus).
- Email ringkasan harian (notifikasi di aplikasi sudah masuk v1).
- Target & pace, serta indikator online/idle di dashboard.
- Saran alias otomatis untuk nomor yang mirip.
- Export/import pengaturan (JSON), panduan dan intro di aplikasi, tema terang.
- Pindah ke opsi B (server sendiri) bila volume atau kebutuhan bertambah.

---

## 16. Keputusan terbuka

| # | Hal | Status |
|---|---|---|
| D1 | Penyimpanan: A (Apps Script + file DB) atau B (server ala BAA.flow) | ✔ A (Apps Script + file DB) |
| D2 | Hak akses final | Draft §6, didiskusikan lagi. Karena berupa data, perubahannya tidak perlu ubah kode |
| D3 | Teks final Nilai Push | ✔ Disetujui (§5.5), tetap bisa diubah dari aplikasi |
| D4 | Pola nama tab bulanan Billcom | Diatur lewat wizard saat konfigurasi |
| D5 | Nama kolom milik FF di tiap sheet target | Dipetakan lewat wizard. Kalau kolomnya belum ada, pemilik sheet yang menambahkan |
| D6 | Cara koneksi ke sheet unit | ✔ Script penerima (§8.0) |
| D7 | BAA sebagai dokumen tagih | ✔ Setara BAST, teks Nilai Push tetap sama |
| D8 | Jenis customer & dokumen tagih | ✔ Customer vs End customer (salah satu kosong = BELUM TERDEFINISI); usulan BAA untuk DIRECT, BAST untuk INDIRECT/belum terdefinisi, bisa diganti per BAST (§5.7) |
| D9 | Tampilan | ✔ Desain "Orbit" (mockup), tema terang + gelap, detail = panel geser |
| D10 | Cara pasang | ✔ Salin 2 file dari halaman instalasi |
| D11 | Cara login | ✔ Username + password SKM; akuntabilitas lewat Log & riwayat (§6.2) |
| D12 | Akun pemilik | ✔ Gmail khusus FF menjadi pemilik project & `SKM_DB` (pasang baru); akses web app "Anyone with Google account" + login SKM |
| D13 | Input banyak kontrak | ✔ Upload Excel dengan template SKM di F2; import format FF lama di F3 |
| D14 | Nomor lama (alias) | ✔ Tidak tampil di tabel, ikut dicari; hasil diberi keterangan asal, waktu, pelaku, alasan |

Sudah dikonfirmasi:
- BAST ON REVIEW → tahap Draft Review Customer.
- Billcom hanya meng-update tab bulan terbaru.
- Kontrak tanpa BAST tidak pernah CLOSE.
- Aging tidak berhenti; batas hanya untuk Perlu Perhatian.
- NAMA PELANGGAN di sheet FF lama adalah end customer.

---

## Lampiran A — Contoh data FF (fixture uji)

| NO WO/SPK/KL | TAHUN | POP | PELANGGAN | SEG | STATUS AWAL | NILAI | KENDALA UMUM | KENDALA DETIL | PIC |
|---|---|---|---|---|---|---|---|---|---|
| TEL.0317-0016/P8/LG.270/DES-A2027000/2017 | 2017 | TREG | BANK PERMATA | LBCS | BAST PARSIAL | Rp 95,352,000.00 | BAST REVISI | BAST Revisi, hanya dua lokasi diproses, 4 lokasi belum | Edo |
| TEL.0719-0488/HK.810/DES-A1000000/2020 | 2020 | SDA | BANK DANAMON INDONESIA Tbk | GOS | KOMPULIR EVIDENCE | Rp 29,730,240,000.00 | BAST ON REVIEW | REVIEW ADMIN PRM | Unggul |
| TEL.0219-0003/P8/LG.270/DES-A2020000/2019 | 2019 | PRM | PT HEXINDO ADI PERKASA | ENS | KOMPULIR EVIDENCE | Rp 206,952,000.00 | KOMPULIR EVIDEN | KOMPULIR EVIDENCE | Baim |
| TEL.0418-0152/P8/LG.270/DES-A2020000/2018 | 2018 | DIRECT | PT Wananugraha Bima Lestari | OLOS | KOMPULIR EVIDENCE | Rp 152,294,500.00 | BAST DONE | Belum takeout menunggu AO SID | Alif |

Hasil yang diharapkan:

| Kontrak | Tahap | Kendala Umum (push) | Kendala Detil |
|---|---|---|---|
| Permata | KOMPULIR, parsial, kendala REV_DOKUMEN | REVISI DOKUMEN | BAST Revisi, hanya dua lokasi … |
| Danamon | REVIEW_CUST | DRAFT REVIEW CUSTOMER | REVIEW ADMIN PRM |
| Hexindo | KOMPULIR | KOMPULIR EVIDEN | KOMPULIR EVIDENCE |
| Wananugraha | BAST_DONE | BAST DONE | Belum takeout menunggu AO SID |

Keempatnya: NAMA PELANGGAN masuk ke End customer, Customer kosong → jenis customer BELUM TERDEFINISI dan muncul di "data belum lengkap".

## Lampiran B — Sheet target yang sudah diketahui

| Nama | Spreadsheet ID | Tab | Catatan |
|---|---|---|---|
| Billcom Telkomsat 2026 | `1YtV-hUyijt-dDQCHUtDNrbswtIq_2caWx2bRsnfYaO8` | TERBARU (pindah tab tiap bulan) | ±12 MB · pasang script penerima |
| Populasi Outstanding Mansol TELKOMSAT-NEW | `1pLbTdFZE6rSh_HAyXXRmF_L3nb6JSK6rMmnZ_fOFx6Q` | FIXED: `DATA TELKOMSAT` | ±8 MB · pasang script penerima |
