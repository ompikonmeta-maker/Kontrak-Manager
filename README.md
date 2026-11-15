# Status Kontrak Manager (SKM)

Aplikasi Apps Script untuk Unit Fulfillment: status BAST diperbarui di satu tempat, lalu kolom milik FF di sheet unit lain ikut seragam lewat script penerima.

| Folder | Isi |
|---|---|
| `SPEC.md` | Spesifikasi (sumber kebenaran). Versi terbaru v1.4. |
| `mockup/mockup.html` | Mockup interaktif tampilan yang disetujui (desain "Orbit"). |
| `f0/` | Fase F0: web app uji koneksi dari jaringan kantor. |
| `install/` | Halaman instalasi bertombol Salin, dibuat oleh `tools/build-install.js`. |
| `tools/` | Skrip build. |

Membuat ulang halaman instalasi:

```bash
node tools/build-install.js f0
```
