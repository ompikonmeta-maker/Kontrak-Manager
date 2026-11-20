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
- Checklist Bagian B (akun, izin, kunci akun, reset, Log): menunggu laporan.

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
