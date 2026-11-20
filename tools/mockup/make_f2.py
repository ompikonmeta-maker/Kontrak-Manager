import re
ROOT='/home/user/Kontrak-Manager/'
s=open(ROOT+'mockup/mockup.html',encoding='utf-8').read()
extra=open(ROOT+'src/ui/styles.css',encoding='utf-8').read()
extra=extra[extra.index('/* ---- tambahan F1 ---- */'):]

def rep(a,b,count=1):
    global s
    n=s.count(a); assert n==count,(n,a[:90]); s=s.replace(a,b)

rep('<title>Status Kontrak Manager</title>','<title>Mockup F2 Kontrak</title>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>')
rep('</style>\n\n<div class="sky"', extra+'\n.nav a.soon{opacity:.45;cursor:not-allowed}\n.nav a.soon .cnt{background:transparent;border:1px solid var(--line2);color:var(--muted);font-weight:600}\n.orow{display:grid;grid-template-columns:90px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) 80px 36px;gap:8px;align-items:center}\n@media (max-width:700px){.orow{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}\n.dupe{font-size:12.5px;color:var(--crit);margin-top:4px}\n.ahit{display:flex;gap:6px;align-items:flex-start;margin-top:6px;font-size:12px;color:var(--fg2,var(--muted));background:var(--accent-bg);border-radius:8px;padding:4px 8px;width:fit-content;max-width:100%}.ahit .ic{flex:none;margin-top:1px;color:var(--accent)}.ahit .mono{font-size:11.5px;word-break:break-all}\nmark{background:color-mix(in oklab,var(--warn) 35%,transparent);color:inherit;border-radius:3px;padding:0 1px}\n.ustep{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ustep>div{display:flex;align-items:center;gap:8px;color:var(--muted);font-weight:600;font-size:13px}.ustep i{font-style:normal;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;border:1.5px solid var(--line2);font-size:12px}.ustep .on{color:var(--fg)}.ustep .on i{background:var(--accent);border-color:var(--accent);color:#fff}.ustep .done i{background:var(--ok);border-color:var(--ok);color:#fff}.ustep b{flex:0 1 40px;height:1.5px;background:var(--line2)}\n.ucard,.drop{display:flex;gap:16px;padding:20px;border-radius:16px;border:1px solid var(--line);background:var(--bg2,transparent)}.ucard h3,.drop h3{margin:0 0 6px;font-size:15.5px}\n.drop{flex-direction:column;align-items:center;justify-content:center;text-align:center;border:2px dashed var(--line2);cursor:pointer;transition:border-color .2s,background .2s,transform .2s;min-height:200px}.drop:hover,.drop:focus-visible,.drop.over{border-color:var(--accent);background:var(--accent-bg);outline:none}.drop.over{transform:scale(1.01)}\n.uic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--accent-bg);color:var(--accent);flex:none}.uic.big{width:56px;height:56px;border-radius:16px}.uic.ok{background:color-mix(in oklab,var(--ok) 15%,transparent);color:var(--ok)}\n.utiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.utile{display:flex;flex-direction:column;gap:2px;text-align:left;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--fg);font:inherit;cursor:pointer}.utile b{font-size:24px;line-height:1.1}.utile span{font-size:12.5px;color:var(--muted)}div.utile{cursor:default}\n.utile.ok b{color:var(--ok)}.utile.warn b{color:var(--warn)}.utile.crit b{color:var(--crit)}.utile.on{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-bg)}\n.umsg{margin:0;padding:0;list-style:none;font-size:12.5px;display:flex;flex-direction:column;gap:3px;min-width:220px}.umsg li{padding-left:16px;position:relative}.umsg li:before{content:'';position:absolute;left:3px;top:7px;width:6px;height:6px;border-radius:50%;background:var(--muted)}.umsg li.e{color:var(--crit)}.umsg li.e:before{background:var(--crit)}.umsg li.w{color:var(--warn)}.umsg li.w:before{background:var(--warn)}.umsg li.ok:before{background:var(--ok)}\n.utbl tr.u-error td{background:color-mix(in oklab,var(--crit) 5%,transparent)}.utbl tr.u-ada td{opacity:.85}.udone{display:flex;gap:16px;align-items:center}.udone h3{margin:0;font-size:18px}\n@media (max-width:700px){.ucard{flex-direction:column}.ustep span{display:none}}\n</style>\n\n<div class="sky"')
rep('<div id="overlay-root"></div>','<div id="sheet-root"></div>\n<div id="overlay-root"></div>\n<details class="mpanel" id="mpanel" open><summary>⚙ Panel mockup <span style="margin-left:auto;font-weight:600;text-transform:none;letter-spacing:0;color:var(--muted)">tidak ada di aplikasi</span></summary><div class="mb"><div><div class="lbl">Login sebagai</div><div class="chips" id="asRole"></div></div><div class="muted" style="font-size:12px">Ganti peran untuk melihat apa yang bisa dilakukan ADMIN, STAFF, dan VIEWER. Di F2 belum ada sinkron ke sheet unit; pratinjau menunjukkan nilai yang akan dikirim mulai F4a.</div></div></details>')

# ---------- peran & identitas ----------
rep("const NAV=[['dashboard','Dashboard','dash'],['kontrak','Kontrak','doc'],['perhatian','Perlu Perhatian','warn'],['antrian','Antrian','inbox'],['gsheet','Google Sheet','sync'],['pengaturan','Pengaturan','gear'],['log','Log','log']];",
"""const NAV=[['kontrak','Kontrak','doc'],['pengaturan','Pengaturan','gear'],['log','Log','log']];
const SOON=[['Dashboard','dash','F3'],['Perlu Perhatian','warn','F3'],['Antrian','inbox','F4b'],['Google Sheet','sync','F4a']];
const AKUN={ADMIN:{u:'ompik',nama:'omPik',alias:'omPik'},STAFF:{u:'95210101',nama:'Edo Pratama',alias:'Edo'},VIEWER:{u:'manajer.ff',nama:'Manajer FF',alias:''}};
S.role='ADMIN';
const can=p=>ROLES[S.role].includes(p);
const me=()=>AKUN[S.role].u, meName=()=>AKUN[S.role].nama, meAlias=()=>AKUN[S.role].alias;""")
rep("const route=()=>(location.hash||'#dashboard').slice(1);","const route=()=>(location.hash||'#kontrak').slice(1);")
rep("""    <nav class="nav" id="nav"><div class="nav-ind" id="navInd"></div>${NAV.map(([h,l,i])=>`<a href="#${h}" data-nav="${h}">${ic(i)}<span>${l}</span><span class="cnt" data-cnt="${h}" hidden></span></a>`).join('')}</nav>
    <div class="side-foot"><span class="live"><span class="pulse"></span>Sinkron aktif</span><span>Otomatis tiap 15 menit</span><span class="dim">Terakhir 09:02 · v1 mockup</span></div>""",
"""    <nav class="nav" id="nav"><div class="nav-ind" id="navInd"></div>${NAV.filter(([h])=>h!=='pengaturan'||can('pengaturan.kelola')).map(([h,l,i])=>`<a href="#${h}" data-nav="${h}">${ic(i)}<span>${h==='log'&&!can('log.semua')?'Log saya':l}</span><span class="cnt" data-cnt="${h}" hidden></span></a>`).join('')}
     <div class="eyebrow" style="padding:16px 12px 6px;font-size:10.5px">Fase berikutnya</div>${SOON.map(([l,i,f])=>`<a class="soon" aria-disabled="true" title="Dibangun di ${f}">${ic(i)}<span>${l}</span><span class="cnt">${f}</span></a>`).join('')}</nav>
    <div class="side-foot"><span class="live"><span class="pulse warn"></span>Belum sinkron ke sheet unit</span><span>Sinkron mulai F4a</span><span class="dim">Versi 1.1 · F2 mockup</span></div>""")
rep('<span class="mock">Mockup · data contoh</span>','<span class="mock">Mockup F2</span>')
rep("""<button class="me" id="me">${avatar('omPik')}<span class="nm">omPik</span></button>""","""<button class="me" id="me">${avatar(meName())}<span class="nm">${esc(meName())} · ${S.role}</span></button>""")
rep("""  g('me').onclick=()=>modal('omPik · ADMIN',""","""  g('me').onclick=()=>modal(esc(meName())+' · '+S.role,""")

# ---------- router: halaman fase lain dialihkan ----------
rep("""  const base=r.split('-')[0];
  let title='',crumb='',body='';""","""  let base=r.split('-')[0];
  if(['dashboard','perhatian','antrian','gsheet','wizard'].includes(base)||(base==='pengaturan'&&!can('pengaturan.kelola'))){location.hash='#kontrak';return;}
  let title='',crumb='',body='';""")
rep("else if(base==='log'){title='Log';crumb='Semua perubahan, hanya ditambah';body=viewLog();}","else if(base==='log'){title=can('log.semua')?'Log':'Log saya';crumb='Semua perubahan, hanya ditambah';body=viewLog();}")

# ---------- daftar kontrak ----------
rep("""    <a class="btn ton" href="#antrian">${ic('add','s')}Kontrak baru</a>
    <button class="btn" id="exp">${ic('dl','s')}Export xlsx</button>""","""    ${can('kontrak.daftar')?`<button class="btn pri" id="addK">${ic('add','s')}Tambah kontrak</button>`:''}
    <button class="btn" disabled title="Dibangun di F5">${ic('dl','s')}Export · F5</button>""")
rep("""${[['OPEN','OPEN'],['CLOSE','CLOSE'],['','Semua']].map(([v,l])=>""","""${[['OPEN','OPEN'],['CLOSE','CLOSE'],['','Semua'],...(can('kontrak.arsip')?[['ARSIP','Arsip']]:[])].map(([v,l])=>""")
rep("""  return K.filter(k=>{const p=evalPush(k),s=statusK(k);
    if(f.st&&s.st!==f.st)return false;""","""  return K.filter(k=>{const p=evalPush(k),s=statusK(k);
    if(f.st==='ARSIP')return !!k.arsip; if(k.arsip)return false;
    if(f.st&&s.st!==f.st)return false;""")
rep("    $('#exp').onclick=()=>toast(`Export ${filtered().length} kontrak terfilter → Kontrak_2026-11-15.xlsx (dibuat di server)`);",
    "    $('#addK')&&($('#addK').onclick=()=>openKontrakForm(null));\n    if(!can('pic.atur'))$$('.rowchk,#selAll').forEach(c=>{c.closest('td,th').innerHTML='';});")

# ---------- drawer ----------
rep("""${[['proses','Proses'],['data','Data kontrak'],['unit','Sheet unit'],['riwayat','Riwayat']].map(([v,l])=>`<button role="tab" data-dtab="${v}" class="${S.dtab===v?'on':''}">${l}</button>`).join('')}</div>""",
    """${[['proses','Proses'],['data','Data kontrak'],['riwayat','Riwayat']].map(([v,l])=>`<button role="tab" data-dtab="${v}" class="${S.dtab===v?'on':''}">${l}</button>`).join('')}<button disabled style="opacity:.4;cursor:not-allowed" title="Dibangun di F4b">Sheet unit · F4b</button></div>""")
rep("""<button class="btn sm" id="arsip">Arsipkan</button></div>""","""${can('kontrak.arsip')?(k.arsip?'<button class="btn sm" id="unarsip">Kembalikan dari arsip</button>':'<button class="btn sm" id="arsip">Arsipkan</button>'):''}</div>""")
rep("""  $('#arsip').onclick=()=>modal('Arsipkan kontrak?','<div class="muted">Kontrak yang diarsipkan tidak tampil di daftar dan tidak disinkron. Data tetap tersimpan dan bisa dikembalikan. Hanya admin (izin <span class="mono">kontrak.arsip</span>).</div>',[{l:'Batal'},{l:'Arsipkan',pri:true,fn:()=>toast('(Mockup) Kontrak diarsipkan.')}]);""",
"""  $('#arsip')&&($('#arsip').onclick=()=>modal('Arsipkan kontrak?','<div class="muted">Kontrak yang diarsipkan tidak tampil di daftar dan tidak disinkron. Data tetap tersimpan dan bisa dikembalikan dari filter <b>Arsip</b>. Hanya admin (izin <span class="mono">kontrak.arsip</span>).</div><label class="of"><span>Alasan (wajib)</span><input class="inp" id="mAr" placeholder="mis. kontrak dobel / dibatalkan customer"></label>',[{l:'Batal'},{l:'Arsipkan',pri:true,fn:d=>{const a=d.querySelector('#mAr').value.trim();if(!a){toast('Alasan wajib diisi.');return false;}k.arsip=true;hist(k,`<b>${esc(meName())}</b> mengarsipkan kontrak: ${esc(a)}`);log(me(),'ARSIP_KONTRAK','Kontrak',k.id,'Arsip','','ya',a);closeDrawer();renderPage(false);toast('Kontrak diarsipkan.');}}]));
  $('#unarsip')&&($('#unarsip').onclick=()=>{k.arsip=false;hist(k,`<b>${esc(meName())}</b> mengembalikan kontrak dari arsip`);log(me(),'ARSIP_KONTRAK','Kontrak',k.id,'Arsip','ya','tidak');refresh();toast('Kontrak dikembalikan dari arsip.');});
  $('#editK')&&($('#editK').onclick=()=>openKontrakForm(k));
  $('#addSO')&&($('#addSO').onclick=()=>orderModal(k,null));
  $$('[data-so]').forEach(tr=>tr.onclick=()=>{if(can('kontrak.update'))orderModal(k,+tr.dataset.so);});
  $$('[data-editb]').forEach(b=>b.onclick=()=>bastModal(k,+b.dataset.editb));
  const ro=!can('kontrak.update');
  if(ro)$$('.ost,#addBast,#addKend,[data-tutup],[data-doc],#verif,#editK,#addSO,[data-editb]').forEach(el=>{el.disabled=true;el.title='Role '+S.role+' hanya bisa melihat';});
  if(!can('pic.atur')){const ps=$('#picSel');if(ps){ps.disabled=true;ps.title='Hanya admin (izin pic.atur)';}}""")
rep("""<button class="btn sm">Ubah</button></h2>
    <dl class="kv"><dt>ID</dt>""","""<button class="btn sm" id="editK">${ic('edit','s')}Ubah</button></h2>
    <dl class="kv"><dt>ID</dt>""")
rep("""<h2>SO / MI <small>order internal</small><span class="sp"></span><button class="btn sm">${ic('add','s')}Tambah</button></h2>""","""<h2>SO / MI <small>order internal · klik baris untuk ubah</small><span class="sp"></span><button class="btn sm" id="addSO">${ic('add','s')}Tambah</button></h2>""")
rep("""${k.orders.map(o=>`<tr><td><span class="pill p-dim">${o.j}</span>""","""${k.orders.map((o,oi)=>`<tr class="click" data-so="${oi}"><td><span class="pill p-dim">${o.j}</span>""")
rep("sug=unitDiffs(k).filter(d=>d.kind==='kosong');","sug=[];   // saran dari sheet unit tersedia di F4b")
rep("""<span class="muted" style="font-size:12px">di tahap ini · batas ${cur.batas} hari</span></div>""","""<span class="muted" style="font-size:12px">di tahap ini · batas ${cur.batas} hari</span><button class="btn sm" data-editb="${b.n}">${ic('edit','s')}Ubah</button></div>""")
rep("""<div class="muted" style="font-size:12px;margin-top:10px">Cocok dengan aturan Nilai Push""","""<div class="note info" style="margin-top:10px;font-size:12px">${ic('sync','s')}<span class="tx">Belum dikirim: sinkron ke sheet unit mulai <b>F4a</b>. Nilai di atas sudah dihitung sekarang supaya bisa dicek.</span></div><div class="muted" style="font-size:12px;margin-top:10px">Cocok dengan aturan Nilai Push""")
rep("""<div class="sheetprev"><div class="sh"><i></i>Billcom Telkomsat 2026 · NOV 2026 · baris 118</div>""","""<div class="sheetprev" hidden><div class="sh"><i></i>Billcom Telkomsat 2026 · NOV 2026 · baris 118</div>""")
rep("""<div class="card"><h2>Riwayat di sheet unit</h2>""","""<div class="card" hidden><h2>Riwayat di sheet unit</h2>""")

# ---------- identitas pelaku ----------
s=s.replace("hist(k,`<b>omPik</b>","hist(k,`<b>${esc(meName())}</b>")
s=s.replace("log('ompik',","log(me(),")
rep("""${k.pic?' <span class="pill p-dim">bantu</span>':''}""","""${k.pic&&k.pic!==meAlias()?' <span class="pill p-dim">bantu</span>':''}""")
rep("st:'AKTIF',hari:0,oleh:'omPik'}","st:'AKTIF',hari:0,oleh:meName()}")

# ---------- pengaturan ----------
rep("const T=[['tahap','Tahap'],['kendala','Kendala'],['push','Nilai Push'],['ref','Referensi'],['role','Role & izin'],['users','Users'],['config','Config'],['import','Import'],['backup','Backup']];",
    "const T=[['tahap','Tahap'],['kendala','Kendala'],['push','Nilai Push'],['ref','Referensi'],['config','Config']];   // Users, Role, Sistem sudah di F1; Import F3; Backup F5")

rep("""${k.id==='K-000001'?'TEL 0317-0016/P8/LG.270/DES-A2027000/2017':'<span class="muted">—</span>'}""","""${aliasList(k)}""")
# ---------- F2: pencarian nomor lama & upload Excel ----------
rep("    if(q&&!(k.no+' '+k.pel+' '+k.end+' '+k.judul+' '+k.id).toLowerCase().includes(q))return false;return true;});}",
    "    if(q&&!cocokCari(k,f.q))return false;return true;});}")
rep("· ${esc(k.judul)}</span></td>","· ${esc(k.judul)}</span>${aliasHit(k)}</td>")
rep('<div class="dtabs" role="tablist">${[[\'proses\'','${aliasBanner(k)}<div class="dtabs" role="tablist">${[[\'proses\'')
rep("else if(base==='kontrak'){title='Kontrak';crumb=K.length+' kontrak terdaftar';body=viewKontrak();}",
    "else if(base==='kontrak'&&r==='kontrak-upload'&&can('kontrak.daftar')){base='upload';title='Upload Excel';crumb='Kontrak · tambah banyak kontrak sekaligus';body=viewUpload();}\n  else if(base==='kontrak'){title='Kontrak';crumb=K.length+' kontrak terdaftar';body=viewKontrak();}")
rep("const navBase=base==='wizard'?'gsheet':base;","const navBase=base==='wizard'?'gsheet':base==='upload'?'kontrak':base;")
rep("  bindView(base);\n  requestAnimationFrame(placeInd);","  bindView(base);if(base==='upload')bindUpload();\n  requestAnimationFrame(placeInd);")
s=s.replace("<button class=\"btn pri\" id=\"addK\">${ic('add','s')}Tambah kontrak</button>`:''}","<button class=\"btn pri\" id=\"addK\">${ic('add','s')}Tambah kontrak</button><a class=\"btn ton\" href=\"#kontrak-upload\" id=\"upK\">${ic('up2','s')}Upload Excel</a>`:''}")

# ---------- kode baru: form kontrak, SO/MI, BAST ----------
NEW=open(ROOT+'tools/mockup/f2_new.js',encoding='utf-8').read()
rep('<dt>Alias</dt><dd class="mono" style="font-size:12px">','<dt>Nomor lama</dt><dd class="mono" style="font-size:12px">')
UP=open(ROOT+'tools/mockup/f2_upload.js',encoding='utf-8').read()
import base64
UP='const CONTOH_B64="'+base64.b64encode(open(ROOT+'mockup/Contoh_Upload_Kontrak.xlsx','rb').read()).decode()+'";\n'+UP
rep("\nrenderPage(true);\n</script>","\n"+NEW+"\n"+UP+"\nrenderPage(true);\n</script>")
open(ROOT+'mockup/f2.html','w',encoding='utf-8').write(s)
print('ok', len(s))
