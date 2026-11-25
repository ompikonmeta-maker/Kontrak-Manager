# Contoh sheet FF format lama untuk mencoba "Import data lama" (F3, SPEC §11.1).
# Baris 1-2 judul laporan (SKM mencari baris judul kolom sendiri), baris 3 judul kolom.
# Isi: 4 baris Lampiran A + kasus khusus (langsung CLOSE, nomor kosong, nomor dobel di file,
# status tidak dikenal, populasi & PIC tidak dikenal).
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill

OUT = '/home/user/Kontrak-Manager/mockup/Contoh_Data_FF_Lama.xlsx'
H = ['NO', 'NO WO/SPK/KL', 'TAHUN PROJECT', 'POPULASI', 'NAMA PELANGGAN', 'JUDUL KONTRAK', 'SEGMENT TSAT', 'STATUS AWAL', 'NILAI KONTRAK',
     'KENDALA UMUM', 'KENDALA DETIL', 'PIC']
ROWS = [
    [1, 'TEL.0317-0016/P8/LG.270/DES-A2027000/2017', 2017, 'TREG', 'BANK PERMATA', '', 'LBCS', 'BAST PARSIAL', 'Rp 95,352,000.00', 'BAST REVISI', 'BAST Revisi, hanya dua lokasi diproses, 4 lokasi belum', 'Edo'],
    [2, 'TEL.0719-0488/HK.810/DES-A1000000/2020', 2020, 'SDA', 'BANK DANAMON INDONESIA Tbk', 'Komunikasi Data Satelit', 'GOS', 'KOMPULIR EVIDENCE', 'Rp 29,730,240,000.00', 'BAST ON REVIEW', 'REVIEW ADMIN PRM', 'Unggul'],
    [3, 'TEL.0219-0003/P8/LG.270/DES-A2020000/2019', 2019, 'PRM', 'PT HEXINDO ADI PERKASA', 'Link Satelit Site Tambang', 'ENS', 'KOMPULIR EVIDENCE', 'Rp 206,952,000.00', 'KOMPULIR EVIDEN', 'KOMPULIR EVIDENCE', 'Baim'],
    [4, 'TEL.0418-0152/P8/LG.270/DES-A2020000/2018', 2018, 'DIRECT', 'PT Wananugraha Bima Lestari', 'Internet Satelit Kebun', 'OLOS', 'KOMPULIR EVIDENCE', 'Rp 152,294,500.00', 'BAST DONE', 'Belum takeout menunggu AO SID', 'Alif'],
    [5, 'WO/0188/TSAT/IX/2025', 2025, 'TELKOMSEL', 'PT Telkomsel', 'Backhaul 4 Site Sumbar', 'LBCS', 'KOMPULIR EVIDENCE', '780.000.000', 'SERTIM AR', 'sudah sertim', 'Rina'],
    [6, '', 2024, 'TREG', 'Pemkab Alor', 'Internet Kantor Desa', 'GOS', 'NUNGGU TTD', 'Rp 120,000,000.00', '', '', 'Baim'],
    [7, 'TEL.0820-0311/HK.810/DES-A1000000/2023', 2023, 'MARITIM', 'PT Samudera Nusantara', 'Maritime VSAT 4 Kapal', 'OLOS', 'NUNGGU TTD', 'Rp 410,000,000.00', '', 'Menunggu TTD direksi customer', 'Edo'],
    [8, 'TEL.0525-0177/HK.810/DES-A1000000/2025', 2025, 'SDA', 'PT Mitra Energi Persada', 'VSAT Remote Wellsite', 'ENS', 'KOMPULIR EVIDENCE', 'Rp 1,840,500,000.00', 'SIRKULIR', '', 'Edo'],
    [9, 'TEL.0719-0488/HK.810/DES-A1000000/2020', 2020, 'SDA', 'BANK DANAMON INDONESIA Tbk', 'Baris dobel', 'GOS', 'KOMPULIR EVIDENCE', '', 'BAST ON REVIEW', '', 'Unggul'],
]
wb = Workbook(); ws = wb.active; ws.title = 'STATUS FF'
ws.append(['LAPORAN STATUS BAST UNIT FULFILLMENT'])
ws.append(['posisi data: contoh untuk uji import SKM'])
ws.append(H)
for r in ROWS: ws.append(r)
for c in ws[3]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='1F6F78')
ws['A1'].font = Font(bold=True, size=13)
for col, w in zip('ABCDEFGHIJKL', [5, 44, 9, 11, 30, 30, 10, 20, 22, 18, 46, 9]): ws.column_dimensions[col].width = w
wb.save(OUT)
print('ok', OUT)
