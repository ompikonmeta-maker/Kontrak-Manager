# Hasil uji di lingkungan asli

Catatan hasil uji yang dijalankan pemilik di akun Google dan jaringan kantor (bukan simulasi).

## F0 · uji koneksi — LULUS (19 Nov 2026)

| Pemeriksaan | Hasil |
|---|---|
| Halaman terbuka dari jaringan kantor | OK |
| Server menjawab (google.script.run) | OK · 954 ms |
| Font Google (Plus Jakarta Sans) | OK · termuat |
| Server memanggil Web App lain (UrlFetch) | OK · status 302 |
| Browser | OK · Chrome 157, transisi tema didukung |

Catatan: percobaan pertama UrlFetch gagal karena izin `script.external_request` tidak tercentang di
layar izin Google (granular consent). Setelah izin diberikan ulang, lulus. Sejak itu ditambahkan fungsi
`mintaIzin()` (F0 v1.2, F1 v1.0.1) dan langkah "Select all" di halaman pasang.

## F0 · ulang di akun FF (serviceintegrasi@gmail.com) — LULUS (20 Nov 2026)

F0 v1.2: halaman OK · server 677 ms · font termuat · UrlFetch status 302 · Chrome 157. Izin lengkap sejak awal.

## F1 · fondasi

**Akun pribadi (19 Nov 2026, kini tidak dipakai):** `setup()` berhasil, kesehatan 6/6. Temuan "Akses file: 2 akun"
→ diperbaiki di v1.0.2 (daftar akses unik + email ditampilkan).

**Akun FF (20 Nov 2026), v1.0.2 — terpasang:**
- `SKM_DB` dibuat 10:46:08 oleh `setup()`, pemilik serviceintegrasi@gmail.com, migrasi v0 → v1, 5 tab.
- Pemeriksaan kesehatan 6/6 hijau; akses file **1 akun** (perbaikan v1.0.2 terkonfirmasi).
- Checklist Bagian B (akun, izin, kunci akun, reset, Log): **lulus**, lihat di bawah.

**Laporan pengguna (20 Nov 2026), v1.0.2:** langkah B12 (Simpan izin) terasa lama; refresh halaman
sempat menggantung (juga di Incognito).
→ diperbaiki di **v1.0.3** (diukur dengan Apps Script tiruan, `test/f1.perf.test.js`):

| Alur | v1.0.2 | v1.0.3 |
|---|---|---|
| Simpan izin (B12) | 3 panggilan server, 23 operasi Sheet | 1 panggilan, 6 operasi |
| Ubah user | 3 panggilan, 13 operasi | 1 panggilan, 4 operasi |
| Buka / refresh halaman | 3 panggilan berurutan | 1 panggilan (`boot`), 0 operasi Sheet |

Caranya: judul kolom diingat (memo + cache), format teks diatur sekali saat baris sheet ditambah,
Log ditulis sekaligus di akhir permintaan, cache diperbarui setelah menulis (bukan dibuang), dan jawaban
server membawa data terbaru. Sekalian diperbaiki: tab (termasuk Log) gagal ditulis setelah 1.000 baris.
Jeda "cold start" Apps Script 1–3 detik pada panggilan pertama setelah lama tidak dipakai tetap ada.

**Checklist lengkap (20 Nov 2026), akun FF — LULUS 26/26:**
- F0: A1 pasang, A2 buka dari PC kantor, A3 salin hasil — OK.
- F1: B1–B23 semua OK (setup & ulang setup, login salah/benar, wajib ganti password, buat akun ADMIN pribadi
  & staff uji, login staff di Incognito, izin berlaku tanpa login ulang, izin ditolak di server, kunci & buka
  kunci akun, reset password mengakhiri sesi, pengaman admin terakhir, hapus hanya tanpa aktivitas, Log lengkap,
  pemeriksaan sistem, login akun pribadi, admin awal dinonaktifkan, tema & ponsel).
- Catatan: judul laporan masih tertulis "F0 v1.0 + F1 v1.0.0" karena teks tetap di halaman uji (sudah
  dibetulkan). Uji dijalankan di v1.0.2; v1.0.3 hanya mengubah kecepatan, perilaku sama (55 tes otomatis lulus).

**Kesimpulan: F0 & F1 selesai. F2 boleh dibangun setelah mockup F2 disetujui dan pengguna menulis "build".**

## Uji beban (22 Nov 2026, akun FF, uji/Code.gs v1.0, browser dari rumah)

Data tiruan ±3 tahun: DB aktif 3.000 kontrak, indeks 18.000, arsip 2024/2025/2026, pembanding tanpa arsip 18.000, Log 300.000 baris.
Tulis massal: 19.283 sel/dtk.

| Ukuran (server) | Waktu |
|---|---|
| Baca kontrak aktif 3.000 × 36 | 1,16 dtk |
| Baca 18.000 × 36 (tanpa arsip) | 5,1 dtk |
| Cari nomor di indeks (TextFinder) | 0,44 dtk |
| Detail kontrak aktif (TextFinder 4 tab) | 1,76 dtk |
| Cari + detail kontrak arsip | 3,2 dtk |
| Simpan 1 perubahan (kunci + kontrak + riwayat + 3 log) | 2,8 dtk |
| Tambah 1 baris ke Log 300.000 | 1,5 dtk |
| Baca 300 log terakhir | 0,12 dtk |
| Filter Log setahun per user | 18,4 dtk |
| Cache 1,6 MB (19 potong) simpan + ambil | 1,45 dtk, utuh |
| Pindah 300 kontrak ke arsip / kembali | 28,8 / 26,7 dtk |
| Reopen 1 kontrak dari arsip | 5,0 dtk |

| Dari browser | Median |
|---|---|
| Panggilan kosong | 0,91 dtk |
| Halaman daftar | 2,3 dtk |
| Detail aktif | 3,0 dtk |
| Cari & buka arsip | 4,1 dtk |
| Simpan | 3,8 dtk |
| 15 buka daftar di detik yang sama | median 4,2 · maks 7,2 dtk |
| 15 simpan di detik yang sama | median 15,0 · maks 29,8 dtk (antre maks 26 dtk) |

Kesimpulan: arsip per tahun terbukti perlu (baca 4× lebih cepat). Platform lebih lambat dari perkiraan awal bila setiap
klik memanggil server, sehingga diusulkan: data aktif dimuat sekali ke browser, simpan optimis di latar, Log per bulan,
bagian simpan yang dikunci dipersingkat.

## F2 v2.0.0–2.0.2 — dibangun 22 Nov 2026, diuji di akun FF (C1–C27 OK, termasuk C24 log audit)

- Tes otomatis: aturan bersama (`f2.kd`), server dari ujung ke ujung (`f2.server`: kontrak, konflik versi, feed, izin,
  indeks pulih sendiri, upload, arsip/reopen, pengaturan, template Excel, migrasi Log F1), UI browser (`f2.ui`).
- Pindah tahap ≤ 14 operasi Sheet; membuka/memuat ulang halaman = 1 panggilan server (`boot` membawa data aktif).
- Panduan uji: install/uji-f2.html (27 langkah). Halaman pasang: install/install-f2.html.

## F3 v3.0.0 — dibangun 25 Nov 2026, diuji di akun FF 27 Nov 2026 (D1–D21 OK kecuali D16)

- Fitur: Dashboard (angka utama, alur per tahap, tim per PIC + update 7 hari, Kendala Umum, kualitas data), Perlu Perhatian
  (5 kelompok + aksi cepat), Tim FF / Milik saya (STAFF dibuka Milik saya), Ctrl+K (kontrak aktif, kontrak lama di arsip, perintah),
  Import data lama (§11.1), izin `kontrak.import` + izin tambahan per user (D19), migrasi skema v2 → v3.
- Tes otomatis: `f3.server` (izin & izin tambahan, migrasi v2→v3, pemetaan Lampiran A, import langsung CLOSE + aging dari tanggal import,
  impor ulang aman, PIC untuk STAFF, ringkasan dashboard + cache), `f3.ui` (alur lengkap admin & STAFF, ponsel). Semua 91 tes lulus.
- Membuka halaman tetap 1 panggilan yang ditunggu (`boot`); ringkasan "update 7 hari" ikut di `boot` bila ada di cache 1 jam,
  bila belum diminta di latar.
- Contoh file: mockup/Contoh_Data_FF_Lama.xlsx (tools/mockup/make_ff_lama.py).
- Panduan uji: install/uji-f3.html (21 langkah). Halaman pasang: install/install-f3.html.

### F3 v3.0.1 (27 Nov 2026) — perbaikan dari uji
- D16: kontrak yang **diarsipkan manual** (Arsip = ya, tetap di data aktif) tidak muncul di Ctrl+K. Sekarang ikut dicari di Ctrl+K
  (label "diarsipkan") dan di pencarian halaman Kontrak (kartu "Kontrak diarsipkan" dengan alasannya). Kontrak lama di arsip tahunan
  (CLOSE > 90 hari) tetap dicari lewat Indeks seperti sebelumnya.
- Menu samping bisa diringkas jadi ikon saja (tombol ☰ di kiri atas), diingat per browser; bawaan ringkas bila layar < 1200 px.
