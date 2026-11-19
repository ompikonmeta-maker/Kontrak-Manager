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

## F1 · fondasi — terpasang, uji berjalan (19 Nov 2026)

- `setup()` berhasil di akun asli: `SKM_DB` dibuat 16:48:47, migrasi v0 → v1, 5 tab, isi awal role & config.
- Halaman Sistem: pemeriksaan kesehatan 6/6 hijau.
- Temuan: "Akses file: 2 akun" — penghitungan editor + viewer bisa menghitung pemilik dua kali. Diperbaiki di
  v1.0.2 (daftar unik + tampilkan email). Menunggu checklist Bagian B lengkap.
