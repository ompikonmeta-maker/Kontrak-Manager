# SPEC — Status Kontrak Manager

Versi 1.3 · 15 Nov 2026 · Pemilik: omPik (Unit Fulfillment)
Referensi konsep: BAA.flow (BAA Generator).

**Prinsip utama: sederhana dulu, tapi bisa dipakai selamanya.** v1 hanya berisi inti. Tambahan dibuat belakangan, mengikuti kondisi lapangan (daftar "Nanti" di §15). Supaya tidak perlu bongkar kode, semua isi yang mungkin berubah (tahap, kendala, nilai push, role, target) **diatur dari aplikasi, bukan ditulis di kode**.

---

## 0. Prompt pembuka untuk Claude Code

> Baca `SPEC.md` sampai habis. Bangun **hanya cakupan v1** (§14), satu fase per sesi. Jangan membangun item di daftar "Nanti" (§15), tapi jangan juga menutup jalannya. Di akhir setiap fase, jalankan unit test dan tunjukkan checklist kriteria uji fase itu. Patuhi §3. Kalau ada hal yang bertentangan dengan spec, berhenti dan tanyakan.

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
| BAST | Dibuat sekali di depan untuk OTC + MTC. Normalnya 1 per kontrak. |
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
                           └──► Sheet target unit A..E (hanya kolom milik FF yang ditulis)
```
- Aplikasi berjalan di server Google. Tidak ada instalasi di Windows kantor dan tidak ada PC yang harus selalu menyala.
- Deploy: **Execute as Me (akun FF)** · **Access: Anyone with Google account**, ditambah **login username + password milik aplikasi**. Staff tidak butuh akses ke file apa pun.
- Akun FF diberi akses **Editor** di setiap sheet target. Pemilik sheet tidak perlu memasang apa-apa.
- **Nol CDN dan nol request ke luar Google**, karena jaringan kantor memblokir CDN.

### 4.2 Penyimpanan: aplikasi adalah master (keputusan D1, §16)
Aplikasi tetap membutuhkan tempat menyimpan data. Yang jadi master adalah **aplikasinya**. File penyimpanan hanyalah "mesin" di belakangnya, sama seperti `app.db` di BAA.flow, dan tidak dibuka atau diedit manusia.

| | **A. Apps Script + file DB (default spec ini)** | **B. Server ala BAA.flow (FastAPI + SQLite)** |
|---|---|---|
| Infrastruktur | Tidak ada, berjalan di Google | PC/server harus selalu hidup |
| Akses | Dari mana saja via URL Google | Sejauh jaringan server bisa dijangkau |
| Mesin DB | File Google Sheet tersembunyi milik akun FF | File SQLite |
| Kecepatan | ±1–3 detik per aksi | Cepat |
| Kapasitas nyaman | ±10.000 kontrak | Praktis tak terbatas |
| Menulis ke GSheet unit | Langsung, karena akun FF sudah Editor | Butuh service account Google Cloud (diberi akses Editor di tiap sheet) atau script penerima di tiap sheet |
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
  - `CLOSE` bila semua BAST sudah close **dan** (JumlahLokasi kosong **atau** Σ cakupan ≥ JumlahLokasi).
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

### 5.6 Aging dan "Perlu Perhatian"
- Bucket aging: Fresh ≤ 7 hari · Warm 8–14 · Stale 15–30 · Cold > 30. Batasnya diatur di Config.
- Daftar Perlu Perhatian:
  - BAST melewati batas aging tahapnya.
  - Kendala aktif lebih dari 14 hari.
  - Kontrak tanpa PIC.
  - Data hasil import yang belum diverifikasi.
  - Target dengan error, atau sel yang diubah di luar aplikasi (§8.5).

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
- Semua pengecekan izin dilakukan di server.

---

## 7. Model data (tab di DB aplikasi)

Aturan umum: baris 1 berisi header. ID dibuat server dan tidak pernah berubah. Timestamp memakai zona `Asia/Jakarta`. `Version` dipakai untuk mencegah dua orang saling timpa.

| Tab | Kolom |
|---|---|
| `Kontrak` | KontrakID, NoKontrak, NoKontrakNorm, JenisDok, TahunProject, Populasi, NamaPelanggan, JudulKontrak, Segment, NilaiKontrak, JumlahLokasi, PIC, **turunan:** TahapKontrak, StatusKontrak, SisaLokasi, KendalaUmum, KendalaDetil, TglStatusBerubah · PerluVerifikasi, Arsip, SumberAwal, Created/UpdatedAt/By, Version |
| `KontrakAlias` | AliasNorm, KontrakID, Sumber, CreatedAt/By |
| `OrderInternal` | OrderID, KontrakID, JenisOrder (SO/MI), NoOrder, NoOrderNorm, JenisLayanan, JenisPekerjaan, JumlahLokasi, Keterangan, Created/UpdatedAt/By, Version |
| `BAST` | BASTID (`K-000001-B1`), KontrakID, Urutan, KodeTahap, Siklus, CakupanOrder, CakupanLokasi, DaftarLokasi, NoDokBAST, TglTahapMulai, Keterangan, Status (OPEN/CLOSE), Created/UpdatedAt/By, Version |
| `RiwayatTahap` | BASTID, Siklus, KodeTahap, Masuk, Keluar, Oleh, Keterangan |
| `Kendala` | KendalaID, BASTID, KontrakID, Jenis, Keterangan, Status, Mulai, DibuatOleh, Selesai, DiselesaikanOleh |
| `Log` | Timestamp, Username, Aksi, Entitas, EntitasID, Field, NilaiLama, NilaiBaru, Catatan *(hanya ditambah)* |
| `Users` | Username, Nama, AliasPIC, Role, PasswordHash, Salt, Aktif, WajibGantiPassword, GagalLogin, TerkunciSampai, LoginTerakhir |
| `Ref_Role` | Role, Izin (dipisah koma) |
| `Ref_Tahap`, `Ref_Kendala`, `Ref_NilaiPush` | §5 |
| `Ref_JenisDok`, `Ref_Populasi`, `Ref_Segment` | Kode, Label, Aktif |
| `Target` | TargetID, Nama, SpreadsheetID, ModeTab (`FIXED`/`TERBARU`), TabNama atau pola, CaraTerbaru (`TANGGAL_DI_NAMA`/`POSISI_TERAKHIR`), TabTerakhirDipakai, AliasHeaderKunci, FormatTanggal, Aktif, TerakhirCek, TerakhirUpdate, StatusTerakhir, PesanTerakhir |
| `TargetKolom` | TargetID, Field, Arah (`TULIS`/`BACA`), AliasHeader |
| `JejakSel` | TargetID, Tab, NoKontrakNorm, Field, NilaiDitulis, WaktuTulis *(nilai terakhir yang ditulis SKM, §8.5)* |
| `RiwayatPush` | Waktu, Oleh (user/`trigger`), Jenis (`TULIS`/`DIUBAH_LUAR`), TargetID, Tab, Baris, NoKontrak, Field, NilaiLama, NilaiBaru *(hanya ditambah)* |
| `SyncLog` | Waktu, Oleh, Jenis (`CEK`/`UPDATE`), TargetID, Tab, BarisCocok, SelDitulis, Gagal, Alarm, Detail |
| `Notifikasi` | NotifID, Untuk (username), Jenis (`DIUBAH_LUAR`/`SINKRON_ERROR`/`TAB_BERGANTI`/`ANTRIAN_BARU`/`PIC_DITUGASKAN`), Pesan, KontrakID, TargetID, Dibaca, Waktu |
| `Antrian` | AntrianID, TargetID, Tab, Baris, NoKontrakAsli, NoKontrakNorm, Prefill, Status (`BARU`/`DIDAFTARKAN`/`DIALIASKAN`/`DIABAIKAN`), DiprosesOleh, DiprosesPada |
| `Config` | key–value: APP_NAMA = "Status Kontrak Manager", SYNC_INTERVAL_MENIT = 15, TAHAP_REOPEN = DRAFTING, AGING_BATAS = 7,14,30, KONFIRMASI_TAB_BARU = TRUE, BACKUP_SIMPAN = 8, SKEMA_VERSI |

---

## 8. Sinkron ke sheet unit

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

### 8.4 Field yang bisa dipetakan
- **TULIS**: `KENDALA_UMUM`, `KENDALA_DETIL`, `TAHAP`, `TGL_UPDATE`, `TGL_TAHAP:<kode>` (mis. tanggal BAST Done), `PIC`, `NO_BAST`, `PARSIAL` (contoh isi: "2/3 BAST · 40/60 lokasi").
- **BACA** (untuk prefill Antrian): `PELANGGAN`, `JUDUL`, `NILAI`, `TAHUN`, `POPULASI`, `SEGMENT`.
- Nilainya sama untuk semua target. Per target, admin hanya memetakan header mana yang menerima field mana.

### 8.5 Jejak perubahan sel (jawaban pertanyaan no. 5)
**Fakta teknis:** Google Sheets **tidak menyediakan** tanggal atau pelaku terakhir per sel lewat API. Riwayat edit per sel ("Show edit history") hanya ada di tampilan web. Yang tersedia lewat API hanya level file: waktu ubah terakhir file dan siapa yang mengubahnya.

**Solusi di SKM**, supaya log perubahan per sel tetap ada:
1. Setiap sel yang ditulis SKM dicatat di `RiwayatPush`: waktu, oleh siapa, sheet, tab, baris, kontrak, field, nilai lama → nilai baru. Riwayat ini tampil di detail kontrak sebagai "Riwayat di sheet unit".
2. Nilai terakhir yang ditulis disimpan di `JejakSel`. Setiap kali cek, nilai sel sekarang dibandingkan dengan `JejakSel`. Kalau berbeda, berarti **ada yang mengubah di luar aplikasi**. Hasilnya:
   - temuan `DIUBAH_LUAR` (nilai SKM vs nilai sekarang),
   - rentang waktu kejadian (antara cek terakhir dan sekarang),
   - petunjuk dari level file (waktu ubah terakhir dan nama pengubah terakhir file),
   - catatan di `RiwayatPush` dengan jenis `DIUBAH_LUAR`.
3. **Perubahan dari luar hanya dilaporkan sebagai notifikasi, tidak dilawan.** Kalau sel diubah orang lain, itu adalah mekanisme manual unit tersebut di luar SKM. Aturannya:
   - Kontrak **OPEN**:
     - SKM **tidak menimpa** sel itu saat sinkron rutin, dan mengirim notifikasi ke PIC kontrak serta admin: *"Kolom KENDALA UMUM kontrak X di sheet Billcom (tab NOV 2026, baris 120) diubah di luar SKM: 'DRAFTING DOKUMEN' → 'BAST DONE'"*.
     - Begitu status kontrak itu di-update lagi di SKM sehingga nilai push-nya berubah, SKM menulis nilai baru seperti biasa, karena update dari FF selalu menang.
   - Kontrak **CLOSE**: perubahan dari luar hanya dicatat di `RiwayatPush`, **tanpa notifikasi**, karena tugas FF untuk kontrak itu sudah selesai.
   - Kontrak yang **reopen**: SKM langsung menulis nilai terbaru pada sinkron berikutnya.
4. Ketika tab pertama kali dipakai, termasuk tab bulan baru Billcom, nilai yang ada dianggap titik awal, sehingga tidak muncul notifikasi.

### 8.6 Keamanan penulisan
- Sebelum menulis, kolom kunci dibaca ulang. Kalau urutan baris berubah sejak dibaca (karena pemilik sheet menyisipkan atau mengurutkan), tab itu dibatalkan dan dicoba lagi di siklus berikutnya.
- Semua perubahan pada satu tab ditulis dalam satu panggilan batch.
- File target yang besar (>10 MB) dibaca **hanya kolom yang dibutuhkan**.

---

## 9. Antrian kontrak baru
- Nomor kontrak di sheet unit yang belum terdaftar masuk ke Antrian (sekali per nomor), dengan data prefill dari field BACA.
- Tindakan yang tersedia:
  - **Daftarkan** (pilih PIC),
  - **Aliaskan** ke kontrak yang sudah ada (karena penulisannya berbeda),
  - **Abaikan** (dengan alasan).

---

## 10. Halaman v1

Tampilannya mengikuti gaya BAA.flow (Material Design 3, tema gelap, aksen teal, sidebar, kartu), tanpa CDN: font sistem, ikon inline SVG, dan chart SVG buatan sendiri. Bahasa UI: Indonesia.

1. **Login.** Username + password. Password wajib diganti saat login pertama.
2. **Dashboard**
   - KPI: kontrak OPEN, BAST OPEN, nilai kontrak OPEN, kendala aktif, close bulan ini.
   - Jumlah kontrak per tahap dan per Kendala Umum.
   - **Tabel tim** per PIC: open, kendala, bar aging Fresh/Warm/Stale/Cold, jumlah update 7 hari (termasuk yang "bantu"), dan perubahan terakhir.
   - Status sinkron per target.
3. **Kontrak**
   - Tabel dengan filter (tahap, Kendala Umum, PIC, populasi, segment, pelanggan, status) dan pencarian.
   - **Detail**: data kontrak, SO/MI, daftar BAST (tambah BAST parsial, ubah tahap, cakupan), kendala (buka/tutup), pratinjau nilai yang akan muncul di sheet unit, riwayat perubahan, dan riwayat di sheet unit.
   - Aksi massal: atur PIC.
4. **Perlu Perhatian** (§5.6).
5. **Antrian** (§9).
6. **Google Sheet**
   - Daftar target, tombol **Cek saja** dan **Update ke GSheet**, alarm, dan tabel Update log.
   - **Wizard target**: tempel URL → pilih tab atau pola → pilih header untuk setiap field dari dropdown → Cek saja → aktifkan.
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
Alurnya: unggah sheet FF lama (xlsx) → pemetaan kolom → **pratinjau + validasi per baris** → simpan. Semua hasil import diberi `PerluVerifikasi = TRUE`.

| Kolom lama | Ke SKM |
|---|---|
| NO WO/SPK/KL | NoKontrak. JenisDok ditebak dari teksnya |
| TAHUN PROJECT, POPULASI, NAMA PELANGGAN, JUDUL KONTRAK, SEGMENT TSAT | kolom sejenis. Nilai referensi baru otomatis ditambahkan |
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
├─ appsscript.json   # Asia/Jakarta, V8, webapp executeAs USER_DEPLOYING + access ANYONE, Sheets API v4, Drive API v3
├─ src/
│  ├─ Code.gs        # doGet, api(token, action, payload) — satu pintu
│  ├─ Auth.gs        # login, sesi, hash password, cek izin
│  ├─ Repo.gs        # satu-satunya yang menyentuh DB; migrasi skema; cache
│  ├─ Domain.gs      # aturan §5 (fungsi murni)
│  ├─ Sheet.gs       # normKey, deteksi header/tab (fungsi murni)
│  ├─ Sync.gs        # cek, update, jejak sel, antrian, trigger
│  ├─ Import.gs · Export.gs · Backup.gs · Setup.gs
│  ├─ Index.html · Styles.html · Icons.html · App.js.html
└─ test/             # node --test: domain, sheet, import
```
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
2. Minta setiap pemilik sheet target memberi akses **Editor** ke akun tersebut.
3. Pasang kode lewat `clasp push` atau copy-paste di script.google.com.
4. Aktifkan Sheets API dan Drive API.
5. Jalankan `setup()` sekali. Fungsi ini membuat file DB, isi awal referensi, admin awal, dan trigger.
6. Deploy sebagai Web app: Execute as Me, Anyone with Google account.
7. Admin login, lalu:
   1. buat user (isi AliasPIC: Edo, Unggul, Baim, Alif, …),
   2. finalkan Nilai Push,
   3. import data FF lama,
   4. tambah target lewat wizard → Cek saja → Update → aktifkan.

---

## 14. Cakupan v1 dan fase

| Fase | Isi | Selesai bila |
|---|---|---|
| F0 | Web app "hello" dari jaringan kantor | Bisa dibuka dan memanggil server. **Wajib lulus dulu** |
| F1 | Setup, Repo + migrasi skema, login, Users, Role & izin, Log | Izin ditolak di server, semua aksi tercatat |
| F2 | Kontrak, SO/MI, BAST, tahap fleksibel, kendala, reopen, parsial, Nilai Push | Semua aturan §5 lulus unit test, termasuk tambah/urut ulang/nonaktifkan tahap |
| F3 | Dashboard, Perlu Perhatian, atur PIC | Angka cocok dengan hitungan manual |
| F4 | Google Sheet: wizard, header & tab TERBARU, Cek saja, Update, jejak sel, notifikasi, Antrian | Uji dengan sheet tiruan lulus: kolom disisipkan, header hilang, sel berformula, kontrak berulang, tab bulan baru, baris diurutkan ulang · sel kontrak OPEN diubah manual → notifikasi + tidak ditimpa, lalu ditulis lagi setelah status di SKM berubah · kontrak CLOSE tidak ditulis lagi dan perubahan luar tanpa notifikasi · saat kontrak close, notifikasinya yang belum dibaca hilang dari lonceng · reopen → ditulis lagi |
| F5 | Import data lama, Export, Backup | 4 baris contoh (Lampiran A) ter-import sesuai §11 |

---

## 15. Nanti (sesuai kondisi lapangan, sengaja tidak dibangun di v1)
- Export ke **template customer** (unggah template → petakan kolom → isi) beserta preset per customer.
- Mode koneksi **RECEIVER** (script penerima di sheet pemilik, pola BAA.flow), untuk pemilik sheet yang tidak mau memberi akses edit. Bisa dipakai juga untuk mencatat edit manual per sel lewat `onEdit`.
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
| D1 | Penyimpanan: A (Apps Script + file DB) atau B (server ala BAA.flow) | Default A, diputuskan sebelum F1 |
| D2 | Hak akses final | Draft §6, didiskusikan lagi. Karena berupa data, perubahannya tidak perlu ubah kode |
| D3 | Teks final Nilai Push | ✔ Disetujui (§5.5), tetap bisa diubah dari aplikasi |
| D4 | Pola nama tab bulanan Billcom | Diatur lewat wizard saat konfigurasi |
| D5 | Nama kolom milik FF di tiap sheet target | Dipetakan lewat wizard. Kalau kolomnya belum ada, pemilik sheet yang menambahkan |

Sudah dikonfirmasi:
- BAST ON REVIEW → tahap Draft Review Customer.
- Billcom hanya meng-update tab bulan terbaru.

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

## Lampiran B — Sheet target yang sudah diketahui

| Nama | Spreadsheet ID | Tab | Catatan |
|---|---|---|---|
| Billcom Telkomsat 2026 | `1YtV-hUyijt-dDQCHUtDNrbswtIq_2caWx2bRsnfYaO8` | TERBARU (pindah tab tiap bulan) | ±12 MB, baca per kolom |
| Populasi Outstanding Mansol TELKOMSAT-NEW | `1pLbTdFZE6rSh_HAyXXRmF_L3nb6JSK6rMmnZ_fOFx6Q` | FIXED: `DATA TELKOMSAT` | ±8 MB |
