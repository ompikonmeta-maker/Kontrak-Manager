# Status Kontrak Manager (SKM)

Aplikasi Apps Script untuk Unit Fulfillment: status BAST diperbarui di satu tempat, lalu kolom milik FF di sheet unit lain ikut seragam lewat script penerima.

| Folder | Isi |
|---|---|
| `SPEC.md` | Spesifikasi (sumber kebenaran). Versi terbaru v1.4. |
| `mockup/mockup.html` | Mockup interaktif tampilan yang disetujui (desain "Orbit"). |
| `f0/` | Fase F0: web app uji koneksi dari jaringan kantor. |
| `src/server/` | Kode server Apps Script per modul (Config, Domain, Repo, Auth, Api, Setup). |
| `src/ui/` | Tampilan web app (HTML, CSS, JS) yang disematkan ke `Code.gs` saat build. |
| `dist/` | Hasil build untuk dipasang: `Code.gs` + `appsscript.json`. Jangan diedit langsung. |
| `install/` | Halaman instalasi bertombol Salin (dibuat oleh `tools/build-install.js`) dan `uji-f0-f1.html` (panduan uji F0 & F1). |
| `tools/` | Skrip build. |
| `test/` | Unit test (`npm test`). Layanan Apps Script ditiru; halaman diuji di Chromium headless. |

Build (gabungkan sumber jadi `dist/Code.gs` + halaman instalasi F1):

```bash
npm run build
```

Menjalankan test (build dulu, lalu unit test, uji server dengan Apps Script tiruan, dan uji UI di Chromium headless):

```bash
npm test
```

Membuat ulang halaman instalasi:

```bash
node tools/build-install.js f0
node tools/build-install.js f1
```
