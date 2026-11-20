# Membuat contoh template upload kontrak SKM (mockup F2).
# Di aplikasi nanti template dibuat oleh SKM sendiri saat tombol "Unduh template" diklik,
# sehingga daftar dropdown (Populasi, Segment, Tahap, Kendala, PIC, …) selalu sama dengan Pengaturan.
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.comments import Comment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter
import datetime

ROOT = '/home/user/Kontrak-Manager/mockup/'
VERSI_TEMPLATE = 'SKM-UPLOAD-1'

REF = {
    'Jenis Dok': ['KL', 'WO', 'SPK', 'PO', 'Nota Pesanan', 'Surat Pesanan'],
    'Populasi': ['TREG', 'SDA', 'PRM', 'DIRECT'],
    'Segment': ['LBCS', 'GOS', 'ENS', 'OLOS'],
    'Dok Tagih': ['BAST', 'BAA'],
    'Tahap': ['Kompulir Eviden', 'Drafting Dokumen', 'Draft Review Customer', 'Sirkulir Dokumen', 'BAST Done', 'BAST Takeout / Sertim AR'],
    'Kendala': ['Revisi Kontrak', 'Revisi Dokumen', 'Return Customer', 'Kendala Sisi Customer', 'Kendala Lainnya'],
    'PIC': ['Edo', 'Unggul', 'Baim', 'Alif', 'omPik'],
    'Jenis Order': ['SO', 'MI'],
}

# (judul, wajib, lebar, catatan, referensi dropdown, format)
KOLOM = [
    ('No. Kontrak', True, 40, 'Nomor KL/WO/SPK persis seperti di dokumen. Menjadi kunci pencocokan; tidak boleh dobel.', None, '@'),
    ('Judul Kontrak', True, 40, 'Judul/nama pekerjaan.', None, '@'),
    ('Jenis Dok', False, 12, 'Kosongkan bila ingin ditebak dari nomor (KL/WO/SPK/…).', 'Jenis Dok', '@'),
    ('Tahun Project', False, 12, 'Angka 4 digit, mis. 2026.', None, '0'),
    ('Populasi', False, 12, 'Pilih dari daftar.', 'Populasi', '@'),
    ('Customer', False, 32, 'Direct customer (yang berkontrak dengan TSAT). Sama dengan End customer → DIRECT; beda → INDIRECT; kosong → BELUM TERDEFINISI.', None, '@'),
    ('End Customer', False, 32, 'Pengguna akhir / nama pelanggan.', None, '@'),
    ('Segment', False, 11, 'Pilih dari daftar.', 'Segment', '@'),
    ('Nilai Kontrak', False, 18, 'Angka rupiah tanpa desimal. Teks seperti "Rp 95,352,000.00" atau "1.250.000.000" juga dibaca.', None, '#,##0'),
    ('Jumlah Lokasi', False, 12, 'Total lokasi di kontrak.', None, '0'),
    ('PIC', False, 12, 'Alias PIC (sesuai menu Users). Kosong = tanpa PIC.', 'PIC', '@'),
    ('Dok Tagih BAST-1', False, 14, 'BAST atau BAA. Kosong = otomatis (DIRECT → BAA, lainnya → BAST).', 'Dok Tagih', '@'),
    ('Tahap Awal BAST-1', False, 24, 'Kosong = Kompulir Eviden.', 'Tahap', '@'),
    ('Tgl Masuk Tahap', False, 15, 'Tanggal mulai tahap (aging dihitung dari sini). Kosong = tanggal upload.', None, 'dd/mm/yyyy'),
    ('Kendala', False, 22, 'Bila ada kendala aktif saat ini. Kosong = tidak ada.', 'Kendala', '@'),
    ('Keterangan Kendala', False, 36, 'Wajib diisi bila kolom Kendala diisi.', None, '@'),
    ('Catatan', False, 32, 'Keterangan bebas untuk BAST-1.', None, '@'),
]
KOLOM_SO = [
    ('No. Kontrak', True, 40, 'Harus sama dengan No. Kontrak di tab Kontrak, atau kontrak yang sudah ada di SKM.', None, '@'),
    ('Jenis', True, 8, 'SO atau MI.', 'Jenis Order', '@'),
    ('No. Order', True, 22, 'Nomor SO / MI.', None, '@'),
    ('Jenis Layanan', False, 20, 'mis. VSAT IP, Backhaul.', None, '@'),
    ('Jenis Pekerjaan', False, 20, 'mis. Instalasi, Sewa.', None, '@'),
    ('Jumlah Lokasi', False, 12, '', None, '0'),
    ('Keterangan', False, 32, '', None, '@'),
]

NAVY = '1E2A4A'; MERAH = 'B4232F'; ABU = 'F2F4F8'; GARIS = 'D5DAE5'
tipis = Side(style='thin', color=GARIS)


def ref_sheet(wb):
    ws = wb.create_sheet('Referensi')
    ws['A1'] = 'Daftar pilihan untuk dropdown. Dibuat ulang setiap template diunduh dari SKM; jangan diubah.'
    ws['A1'].font = Font(italic=True, color='666666')
    rng = {}
    for i, (nama, nilai) in enumerate(REF.items()):
        col = get_column_letter(i + 1)
        c = ws[f'{col}3']; c.value = nama; c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=NAVY)
        for j, v in enumerate(nilai):
            ws[f'{col}{4 + j}'] = v
        ws.column_dimensions[col].width = max(14, max(len(v) for v in nilai) + 2)
        rng[nama] = f"Referensi!${col}$4:${col}${3 + len(nilai)}"
    ws.sheet_properties.tabColor = '8892A6'
    return rng


def tabel(ws, kolom, rng, baris_maks=1000):
    for i, (judul, wajib, lebar, catatan, ref, fmt) in enumerate(kolom):
        col = get_column_letter(i + 1)
        c = ws[f'{col}1']
        c.value = judul + (' *' if wajib else '')
        c.font = Font(bold=True, color='FFFFFF')
        c.fill = PatternFill('solid', fgColor=MERAH if wajib else NAVY)
        c.alignment = Alignment(vertical='center', wrap_text=True)
        c.border = Border(bottom=tipis)
        if catatan:
            c.comment = Comment(catatan, 'SKM'); c.comment.width = 260; c.comment.height = 90
        ws.column_dimensions[col].width = lebar
        for r in range(2, baris_maks + 2):
            ws[f'{col}{r}'].number_format = fmt
        if ref:
            dv = DataValidation(type='list', formula1='=' + rng[ref], allow_blank=True, showErrorMessage=True,
                                errorTitle='Pilihan tidak dikenal', error='Pilih dari daftar. Nilai baru bisa ditambahkan admin di Pengaturan SKM.')
            dv.add(f'{col}2:{col}{baris_maks + 1}')
            ws.add_data_validation(dv)
        if fmt == 'dd/mm/yyyy':
            dv = DataValidation(type='date', operator='greaterThan', formula1='DATE(2010,1,1)', allow_blank=True,
                                showErrorMessage=True, error='Isi tanggal, mis. 15/11/2026.')
            dv.add(f'{col}2:{col}{baris_maks + 1}'); ws.add_data_validation(dv)
    ws.row_dimensions[1].height = 32
    ws.freeze_panes = 'B2'
    ws.auto_filter.ref = f'A1:{get_column_letter(len(kolom))}1'


def petunjuk(ws):
    ws.sheet_view.showGridLines = False
    ws.column_dimensions['A'].width = 3; ws.column_dimensions['B'].width = 26; ws.column_dimensions['C'].width = 92
    ws['B2'] = 'Template upload kontrak — Status Kontrak Manager'; ws['B2'].font = Font(bold=True, size=16, color=NAVY)
    ws['B3'] = f'Versi template {VERSI_TEMPLATE} · diunduh {datetime.date.today():%d %b %Y} · jangan ubah judul kolom (baris 1)'
    ws['B3'].font = Font(color='666666')
    baris = [
        ('Langkah', None),
        ('1. Isi tab Kontrak', 'Satu baris = satu kontrak. Kolom berjudul merah (*) wajib diisi: No. Kontrak dan Judul Kontrak. Kolom lain boleh menyusul.'),
        ('2. Isi tab SO_MI (opsional)', 'Satu baris = satu SO/MI. Satu kontrak boleh punya banyak SO/MI; hubungkan lewat No. Kontrak.'),
        ('3. Upload di SKM', 'Menu Kontrak → Upload Excel → pilih file ini. SKM menampilkan pratinjau dan memeriksa setiap baris SEBELUM ada data yang disimpan.'),
        ('4. Periksa pratinjau', 'Baris Error tidak disimpan (alasan ditampilkan). Baris Peringatan tetap disimpan, mis. Customer kosong → jenis customer BELUM TERDEFINISI.'),
        ('5. Simpan', 'Kontrak dibuat dengan BAST-1 otomatis. Semua tercatat di Log atas nama Anda. Laporan baris yang gagal bisa diunduh sebagai Excel.'),
        ('Aturan', None),
        ('Nomor sudah ada di SKM', 'Default: dilewati. Bisa dipilih "Perbarui": hanya kolom yang DIISI di file yang menimpa data SKM; sel kosong tidak menghapus apa pun.'),
        ('Nomor lama (alias)', 'Bila nomor di file adalah nomor lama yang sudah dikoreksi, SKM mengenalinya dan memperlakukannya sebagai kontrak yang sudah ada.'),
        ('Penulisan nomor', 'Beda spasi, huruf besar/kecil, jenis tanda strip, atau titik di akhir dianggap nomor yang sama (TEL.0317-0016 = tel.0317 – 0016). Beda titik/garis miring di tengah dianggap nomor lain.'),
        ('Dropdown', 'Populasi, Segment, Jenis Dok, PIC, Tahap, Kendala, Dok Tagih memakai daftar di tab Referensi (sama dengan Pengaturan SKM saat template diunduh).'),
        ('Tahap & kendala', 'Hanya untuk BAST-1. Bila tagihan bertahap (BAST-2, dst.), tambahkan di SKM setelah upload.'),
        ('Batas', 'Maksimal 1.000 kontrak per file. Hanya user dengan izin kontrak.daftar yang bisa upload.'),
    ]
    r = 5
    for a, b in baris:
        if b is None:
            ws[f'B{r}'] = a; ws[f'B{r}'].font = Font(bold=True, size=12, color=NAVY); r += 1; continue
        ws[f'B{r}'] = a; ws[f'B{r}'].font = Font(bold=True)
        ws[f'C{r}'] = b; ws[f'C{r}'].alignment = Alignment(wrap_text=True, vertical='top')
        ws[f'B{r}'].alignment = Alignment(vertical='top')
        for col in 'BC':
            ws[f'{col}{r}'].fill = PatternFill('solid', fgColor=ABU); ws[f'{col}{r}'].border = Border(bottom=Side(style='thin', color='FFFFFF'))
        ws.row_dimensions[r].height = 34
        r += 1
    r += 1
    ws[f'B{r}'] = 'Warna judul kolom'; ws[f'B{r}'].font = Font(bold=True, size=12, color=NAVY)
    ws[f'B{r+1}'] = 'Wajib *'; ws[f'B{r+1}'].fill = PatternFill('solid', fgColor=MERAH); ws[f'B{r+1}'].font = Font(bold=True, color='FFFFFF')
    ws[f'C{r+1}'] = 'Harus diisi.'
    ws[f'B{r+2}'] = 'Opsional'; ws[f'B{r+2}'].fill = PatternFill('solid', fgColor=NAVY); ws[f'B{r+2}'].font = Font(bold=True, color='FFFFFF')
    ws[f'C{r+2}'] = 'Boleh kosong; arahkan kursor ke judul kolom untuk melihat penjelasannya.'
    # penanda versi untuk dikenali SKM saat upload
    ws['Z1'] = VERSI_TEMPLATE; ws['Z1'].font = Font(color='FFFFFF')
    ws.sheet_properties.tabColor = '2F6FED'


def buat(nama_file, kontrak=(), so=()):
    wb = Workbook()
    petunjuk(wb.active); wb.active.title = 'Petunjuk'
    wk = wb.create_sheet('Kontrak'); wk.sheet_properties.tabColor = MERAH
    ws = wb.create_sheet('SO_MI'); ws.sheet_properties.tabColor = '1F9D6B'
    rng = ref_sheet(wb)
    tabel(wk, KOLOM, rng); tabel(ws, KOLOM_SO, rng)
    for i, row in enumerate(kontrak):
        for j, v in enumerate(row):
            if v not in (None, ''):
                wk.cell(row=i + 2, column=j + 1, value=v)
    for i, row in enumerate(so):
        for j, v in enumerate(row):
            if v not in (None, ''):
                ws.cell(row=i + 2, column=j + 1, value=v)
    wb.active = 1 if kontrak else 0
    wb.save(ROOT + nama_file)
    print('ditulis', ROOT + nama_file)


D = datetime.date
buat('Template_Upload_Kontrak_SKM.xlsx')
# Contoh terisi: sengaja berisi kasus yang lolos, peringatan, dan error supaya pratinjau bisa dicoba.
buat('Contoh_Upload_Kontrak.xlsx', kontrak=[
    # No, Judul, JenisDok, Tahun, Pop, Customer, End, Seg, Nilai, Lok, PIC, DokTagih, Tahap, Tgl, Kendala, KetKendala, Catatan
    ['KL.0112/TSAT/I/2026', 'Internet Satelit 40 Puskesmas', 'KL', 2026, 'DIRECT', 'Dinas Kesehatan Prov. NTT', 'Dinas Kesehatan Prov. NTT', 'GOS', 2480000000, 40, 'Edo', '', 'Kompulir Eviden', D(2026, 11, 3), '', '', ''],
    ['WO/0377/TSAT/X/2026', 'Backhaul BTS Remote Papua 12 Site', '', 2026, 'TREG', 'PT Telkom Indonesia (Persero) Tbk', 'PT Telkomsel', 'LBCS', 'Rp 5,940,000,000.00', 12, 'Unggul', 'BAST', 'Draft Review Customer', D(2026, 10, 28), 'Kendala Sisi Customer', 'PIC customer cuti s.d. 25 Nov', ''],
    ['SPK-0045/TSAT/2026', 'Sewa VSAT Kebun Sawit 8 Titik', '', 2026, 'SDA', '', 'PT Sawit Nusantara Raya', 'ENS', '1.250.000.000', 8, 'Baim', '', '', '', '', '', 'Customer belum dipastikan'],
    ['TEL.0219-0003/P8/LG.270/DES-A2020000/2019', 'Sewa Link Satelit Site Tambang', 'KL', 2019, 'PRM', 'PT HEXINDO ADI PERKASA', 'PT HEXINDO ADI PERKASA', 'ENS', 206952000, 3, 'Baim', '', '', '', '', '', ''],
    ['TEL 0317-0016/P8/LG.270/DES-A2027000/2017', 'Pengadaan Layanan VSAT IP 6 Lokasi', 'KL', 2017, 'TREG', 'BANK PERMATA', 'BANK PERMATA', 'LBCS', '', 6, 'Edo', '', '', '', '', '', ''],
    ['KL.0118/TSAT/II/2026', '', 'KL', 2026, 'DIRECT', 'PT Pelayaran Samudra', 'PT Pelayaran Samudra', 'OLOS', 780000000, 5, 'Alif', '', '', '', '', '', 'judul lupa diisi'],
    ['KL.0121/TSAT/II/2026', 'Maritime VSAT 3 Kapal', 'KL', 2026, 'DIRECT', 'PT Armada Bahari', 'PT Armada Bahari', 'OLOS', 'sekitar 900 juta', 3, 'Budi', '', '', '', '', '', ''],
    ['kl.0112/tsat/i/2026 ', 'Internet Satelit 40 Puskesmas (dobel)', 'KL', 2026, 'DIRECT', '', '', 'GOS', '', '', '', '', '', '', '', '', ''],
    ['WO/0391/TSAT/XI/2026', 'Internet Desa 10 Titik Maluku', 'WO', 2026, 'TREG', 'PT Telkom Indonesia (Persero) Tbk', 'Pemprov Maluku', 'GOS', 1150000000, 10, 'Unggul', '', 'Selesai', '', 'Revisi Dokumen', '', ''],
], so=[
    ['KL.0112/TSAT/I/2026', 'SO', 'SO-2026-07310', 'VSAT IP', 'Instalasi + Sewa', 40, ''],
    ['WO/0377/TSAT/X/2026', 'SO', 'SO-2026-03122', 'Backhaul', 'Instalasi', 8, 'tahap 1'],
    ['WO/0377/TSAT/X/2026', 'MI', 'MI-2026-0187', 'Backhaul', 'Instalasi', 4, 'tahap 2'],
    ['SPK-0045/TSAT/2026', 'SO', 'SO-2026-07401', 'VSAT Broadband', 'Sewa', 8, ''],
    ['KL.9999/TIDAK/ADA/2026', 'SO', 'SO-2026-09999', 'VSAT IP', 'Sewa', 1, 'kontraknya tidak ada'],
    ['WO/0391/TSAT/XI/2026', 'XO', 'XO-2026-0001', '', '', 10, 'jenis salah'],
])
