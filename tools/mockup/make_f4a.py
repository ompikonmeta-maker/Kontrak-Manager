"""Mockup F4a: dibangun dari mockup/f3.html (jalankan make_f3.py dulu bila f3 berubah).
Isi baru: halaman Google Sheet (Cek saja, Update, riwayat sinkron), wizard target, script penerima, pengaman kolom (simulasi)."""
ROOT = '/home/user/Kontrak-Manager/'
s = open(ROOT + 'mockup/f3.html', encoding='utf-8').read()


def rep(a, b, count=1):
    global s
    n = s.count(a)
    assert n == count, (n, a[:90])
    s = s.replace(a, b)


rep('<title>Mockup F3 Dashboard</title>', '<title>Mockup F4a Sinkron</title>')
rep('<span class="mock">Mockup F3</span>', '<span class="mock">Mockup F4a</span>')
rep('F3 menambah Dashboard, Perlu Perhatian, Ctrl+K, dan Import data lama (Kontrak → Upload Excel → Import sheet FF lama). Sinkron ke sheet unit tetap mulai F4a.',
    'F4a menambah menu <b>Google Sheet</b>: wizard target, script penerima, Cek saja, Update ke GSheet. Coba tombol simulasi di bawah untuk melihat pengaman kolom bekerja.')
rep('<span class="dim">Versi 1.1 · F3 mockup</span>', '<span class="dim">Versi 1.1 · F4a mockup</span>')

# ---------- navigasi ----------
rep("const NAV=[['dashboard','Dashboard','dash'],['kontrak','Kontrak','doc'],['perhatian','Perlu Perhatian','warn'],['pengaturan','Pengaturan','gear'],['log','Log','log']];",
    "const NAV=[['dashboard','Dashboard','dash'],['kontrak','Kontrak','doc'],['perhatian','Perlu Perhatian','warn'],['gsheet','Google Sheet','sync'],['pengaturan','Pengaturan','gear'],['log','Log','log']];")
rep("const SOON=[['Antrian','inbox','F4b'],['Google Sheet','sync','F4a']];", "const SOON=[['Antrian','inbox','F4b']];")
rep("NAV.filter(([h])=>h!=='pengaturan'||can('pengaturan.kelola'))", "NAV.filter(([h])=>(h!=='pengaturan'||can('pengaturan.kelola'))&&(h!=='gsheet'||can('sinkron.jalankan')))")
rep("if(['antrian','gsheet','wizard'].includes(base)||", "if(base==='antrian'||(base==='gsheet'&&!can('sinkron.jalankan'))||(base==='wizard'&&!can('target.kelola'))||")
rep('<span class="live"><span class="pulse warn"></span>Belum sinkron ke sheet unit</span><span>Sinkron mulai F4a</span>', '<span class="live"><span class="pulse"></span>Sinkron manual aktif</span><span>Otomatis tiap 15 menit mulai F4b</span>')
rep("if(base==='dashboard')bindDash();", "if(base==='dashboard')bindDash();if(base==='gsheet')bindGsheet();if(base==='perhatian')document.querySelectorAll('#content [data-gs]').forEach(e=>e.onclick=()=>{location.hash='#gsheet';});")
rep("else if(base==='gsheet'){title='Google Sheet';crumb='Sinkron ke sheet unit';body=viewGsheet();}", "else if(base==='gsheet'){title='Google Sheet';crumb='Sinkron ke sheet unit · Cek saja & Update';body=viewGsheet();}")

# ---------- Dashboard & Perlu Perhatian ----------
rep('<div class="card" style="opacity:.65"><h2>Status sinkron ke sheet unit<span class="sp"></span><span class="pill p-dim">F4a</span></h2><div class="muted" style="font-size:13px">Setelah sinkron dibangun di F4a, kartu ini menampilkan setiap target Google Sheet: cek & update terakhir, dan error.</div></div>', '${syncKartu()}')
rep('<div class="card" style="opacity:.6"><h2><span style="width:10px;height:10px;border-radius:50%;background:var(--dim)"></span>Target error / sel diubah di luar SKM<span class="sp"></span><span class="pill p-dim">F4a</span></h2><div class="muted" style="font-size:13px">Muncul setelah sinkron ke sheet unit dibangun.</div></div>', '${syncPerhatian()}')

# ---------- panel detail: status di sheet unit ----------
rep('<div class="note info" style="margin-top:10px;font-size:12px">${ic(\'sync\',\'s\')}<span class="tx">Belum dikirim: sinkron ke sheet unit mulai <b>F4a</b>. Nilai di atas sudah dihitung sekarang supaya bisa dicek.</span></div>', '${riwayatPushKontrak(k)}')

# ---------- wizard ----------
rep("// SKM · Script Penerima v1 — CONTOH (versi final disediakan aplikasi di F4)", "// SKM · Script Penerima v1 — ringkasan (teks lengkap ±250 baris disalin dari aplikasi)")
rep("const WFIELDS=[['KUNCI','KUNCI','No. kontrak (kunci)'],['KENDALA_UMUM','TULIS','Kendala Umum'],['KENDALA_DETIL','TULIS','Kendala Detil'],['TGL_UPDATE','TULIS','Tanggal update'],['TAHAP','TULIS','Tahap'],['PIC','TULIS','PIC'],['DOK_TAGIH','TULIS','Dokumen tagih (BAST/BAA)'],['PARSIAL','TULIS','Info parsial'],",
    "const WFIELDS=[['KUNCI','KUNCI','No. kontrak (kunci)'],['KENDALA_UMUM','TULIS','Kendala Umum'],['KENDALA_DETIL','TULIS','Kendala Detil'],['TGL_UPDATE','TULIS','Tanggal update'],['TAHAP','TULIS','Tahap'],['TGL_TAHAP:BAST_DONE','TULIS','Tanggal BAST Done'],['PIC','TULIS','PIC'],['NO_BAST','TULIS','No. dokumen BAST/BAA'],['DOK_TAGIH','TULIS','Dokumen tagih (BAST/BAA)'],['PARSIAL','TULIS','Info parsial'],")
rep("if(!['KENDALA_UMUM','KENDALA_DETIL','TGL_UPDATE','TAHAP','PIC','DOK_TAGIH','PARSIAL'].some(f=>S.map[f]))", "if(!['KENDALA_UMUM','KENDALA_DETIL','TGL_UPDATE','TAHAP','TGL_TAHAP:BAST_DONE','PIC','NO_BAST','DOK_TAGIH','PARSIAL'].some(f=>S.map[f]))")
rep('<span class="pill p-info">21 ke Antrian</span>', '<span class="pill p-info">21 nomor belum terdaftar</span>')
rep('<div class="note ok">${ic(\'check\',\'s\')}<span class="tx">Konfigurasi siap. Setelah diaktifkan, target ikut sinkron terjadwal tiap 15 menit (hanya bila ada perubahan).</span></div>',
    '<div class="note ok">${ic(\'check\',\'s\')}<span class="tx">Konfigurasi siap. Di F4a sinkron dijalankan manual dari halaman Google Sheet (Cek saja → Update). Mulai F4b target ini ikut sinkron otomatis tiap 15 menit.</span></div>')
rep('<div class="muted" style="font-size:12.5px">Kolom apa pun dari sheet ini yang ingin ikut tampil di detail kontrak. Tidak pernah ditulis SKM.</div>',
    '<div class="muted" style="font-size:12.5px">Kolom apa pun dari sheet ini yang ingin ikut tampil di detail kontrak. Tidak pernah ditulis SKM. Pemetaan BACA disimpan sekarang; datanya dipakai mulai F4b (tab Sheet unit, saran melengkapi, Antrian).</div>')
rep("· pencatat edit <b>aktif</b> · dipasang oleh rina.billcom@gmail.com.", "· pencatat edit <b>terpasang</b> (catatannya dipakai mulai F4b) · dipasang oleh rina.billcom@gmail.com.")

rep("'Ditulis ke 2 target pada sinkron berikutnya.'", "'Ditulis ke sheet unit saat Update ke GSheet dijalankan.'")
NEW = open(ROOT + 'tools/mockup/f4a_new.js', encoding='utf-8').read()
rep("\nrenderPage(true);layarBuka();\n</script>", "\n" + NEW + "\npanelSimulasi();\nrenderPage(true);layarBuka();\n</script>")
open(ROOT + 'mockup/f4a.html', 'w', encoding='utf-8').write(s)
print('ok', len(s))
