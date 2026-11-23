"""Mockup F3: dibangun dari mockup/f2.html (jalankan make_f2.py dulu bila f2 berubah).
Isi baru: Dashboard, Perlu Perhatian, Ctrl+K (termasuk kontrak lama & perintah), Import data lama (§11.1)."""
ROOT = '/home/user/Kontrak-Manager/'
s = open(ROOT + 'mockup/f2.html', encoding='utf-8').read()


def rep(a, b, count=1):
    global s
    n = s.count(a)
    assert n == count, (n, a[:90])
    s = s.replace(a, b)


rep('<title>Mockup F2 Kontrak</title>', '<title>Mockup F3 Dashboard</title>')
rep('<span class="mock">Mockup F2</span>', '<span class="mock">Mockup F3</span>')
rep('Di F2 belum ada sinkron ke sheet unit; pratinjau menunjukkan nilai yang akan dikirim mulai F4a.',
    'F3 menambah Dashboard, Perlu Perhatian, Ctrl+K, dan Import data lama (Kontrak → Upload Excel → Import sheet FF lama). Sinkron ke sheet unit tetap mulai F4a.')

# ---------- navigasi ----------
rep("const NAV=[['kontrak','Kontrak','doc'],['pengaturan','Pengaturan','gear'],['log','Log','log']];",
    "const NAV=[['dashboard','Dashboard','dash'],['kontrak','Kontrak','doc'],['perhatian','Perlu Perhatian','warn'],['pengaturan','Pengaturan','gear'],['log','Log','log']];")
rep("const SOON=[['Dashboard','dash','F3'],['Perlu Perhatian','warn','F3'],['Antrian','inbox','F4b'],['Google Sheet','sync','F4a']];",
    "const SOON=[['Antrian','inbox','F4b'],['Google Sheet','sync','F4a']];")
rep("const route=()=>(location.hash||'#kontrak').slice(1);", "const route=()=>(location.hash||'#dashboard').slice(1);")
rep('<span class="dim">Versi 1.1 · F2 mockup</span>', '<span class="dim">Versi 1.1 · F3 mockup</span>')

# ---------- router ----------
rep("if(['dashboard','perhatian','antrian','gsheet','wizard'].includes(base)||", "if(['antrian','gsheet','wizard'].includes(base)||")
rep("if(base==='dashboard'){title='Selamat pagi, omPik';crumb='Sabtu, 15 November 2026 · ringkasan tim FF';body=viewDash();}",
    "if(base==='dashboard'){title='Selamat pagi, '+meName();crumb='Senin, 23 November 2026 · ringkasan tim FF';body=viewDash();}\n"
    "  else if(base==='kontrak'&&r==='kontrak-import'&&can('kontrak.daftar')){base='import';title='Import data lama';crumb='Kontrak · sheet FF format lama → SKM';body=viewImport();}")
rep("const navBase=base==='wizard'?'gsheet':base==='upload'?'kontrak':base;",
    "const navBase=base==='wizard'?'gsheet':(base==='upload'||base==='import')?'kontrak':base;")
rep("bindView(base);if(base==='upload')bindUpload();",
    "bindView(base);if(base==='upload')bindUpload();if(base==='import')bindImport();if(base==='perhatian')bindPerhatian();if(base==='dashboard')bindDash();")

# ---------- pintu masuk import dari halaman Upload ----------
rep('<div class="row"><button class="btn ghost sm" id="coba">${ic(\'eye\',\'s\')}Coba dengan file contoh</button><span class="sp"></span><a class="btn ghost sm" href="#kontrak">Kembali ke daftar kontrak</a></div>',
    '<div class="row"><button class="btn ghost sm" id="coba">${ic(\'eye\',\'s\')}Coba dengan file contoh</button><span class="sp"></span><a class="btn ghost sm" href="#kontrak">Kembali ke daftar kontrak</a></div>\n'
    '   <div class="ucard" style="align-items:center"><div class="uic">${ic(\'dl\')}</div><div style="flex:1"><h3>Punya sheet FF format lama?</h3><div class="muted">Untuk memindahkan data lama sekali jalan (kolom STATUS AWAL, KENDALA UMUM, dst.) tidak perlu menyalin ke template. Pakai <b>Import data lama</b>.</div></div><a class="btn ton" href="#kontrak-import">Import sheet FF lama ${ic(\'chevR\',\'s\')}</a></div>')

NEW = open(ROOT + 'tools/mockup/f3_new.js', encoding='utf-8').read()
DASH = open(ROOT + 'tools/mockup/f3_dash.js', encoding='utf-8').read()
rep("\nrenderPage(true);layarBuka();\n</script>", "\n" + NEW + "\n" + DASH + "\nrenderPage(true);layarBuka();\n</script>")
open(ROOT + 'mockup/f3.html', 'w', encoding='utf-8').write(s)
print('ok', len(s))
