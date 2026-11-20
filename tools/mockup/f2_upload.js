/* ================= F2: nomor lama (alias) di pencarian ================= */
IC.hist="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z";
IC.up2="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z";
IC.xls="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8.5 18l2-3.2-1.9-3h1.6l1.1 1.9 1.1-1.9H14l-1.9 3 2 3.2h-1.6l-1.2-2.1-1.2 2.1H8.5z";
// keterangan setiap nomor lama: dari koreksi nomor, antrian, atau upload
const AMETA={};
const ameta=(k,a)=>AMETA[normKey(a)]||{sumber:'KOREKSI',waktu:'—',oleh:'—',catatan:''};
AMETA[normKey(K[0].alias[0])]={sumber:'KOREKSI',waktu:'12 Nov 2026 10:14',oleh:'omPik',catatan:'Nomor di sheet lama tertulis dengan spasi, di dokumen kontrak memakai titik'};
const SUMBER_ALIAS={KOREKSI:'koreksi nomor',ANTRIAN:'dialiaskan dari Antrian',UPLOAD:'dari upload Excel'};

/** Nomor lama yang cocok dengan kata pencarian (null bila cocok lewat nomor/judul biasa). */
function aliasCocok(k,q){
  if(!q||!(k.alias||[]).length)return null;
  const ql=q.toLowerCase(),qn=normKey(q);
  if((k.no+' '+k.pel+' '+k.end+' '+k.judul+' '+k.id).toLowerCase().includes(ql))return null;
  return k.alias.find(a=>a.toLowerCase().includes(ql)||(qn.length>=4&&normKey(a).includes(qn)))||null;
}
function cocokCari(k,q){
  const ql=q.toLowerCase(),qn=normKey(q);
  if((k.no+' '+k.pel+' '+k.end+' '+k.judul+' '+k.id).toLowerCase().includes(ql))return true;
  if(qn.length>=4&&normKey(k.no).includes(qn))return true;
  return !!aliasCocok(k,q);
}
const tandai=(t,q)=>{const i=t.toLowerCase().indexOf(q.toLowerCase());return i<0?esc(t):esc(t.slice(0,i))+'<mark>'+esc(t.slice(i,i+q.length))+'</mark>'+esc(t.slice(i+q.length));};
/** Baris tabel: keterangan kecil di bawah nomor bila kontrak ditemukan lewat nomor lama. */
function aliasHit(k){
  const a=aliasCocok(k,S.f.q);if(!a)return '';const m=ameta(k,a);
  return `<span class="ahit">${ic('hist','s')}<span>Ditemukan lewat <b>nomor lama</b> <span class="mono">${tandai(a,S.f.q)}</span> · ${SUMBER_ALIAS[m.sumber]||m.sumber} ${esc(m.waktu)} oleh ${esc(m.oleh)}</span></span>`;
}
/** Detail kontrak: penjelasan di atas bila dibuka dari hasil pencarian nomor lama. */
function aliasBanner(k){
  const a=aliasCocok(k,S.f.q);if(!a)return '';const m=ameta(k,a);
  return `<div class="note info" style="margin-top:12px">${ic('hist','s')}<span class="tx">Anda mencari <span class="mono"><b>${esc(a)}</b></span>. Itu <b>nomor lama</b> kontrak ini, sudah ${m.sumber==='KOREKSI'?'dikoreksi':'dicatat'} menjadi <span class="mono"><b>${esc(k.no)}</b></span>
   (${SUMBER_ALIAS[m.sumber]||m.sumber}, ${esc(m.waktu)} oleh ${esc(m.oleh)})${m.catatan?`. Alasan: ${esc(m.catatan)}`:''}. Sheet unit yang masih memakai nomor lama tetap dikenali sebagai kontrak ini.</span></div>`;
}
/** Tab Data kontrak: daftar nomor lama lengkap dengan asal-usulnya. */
function aliasList(k){
  if(!(k.alias||[]).length)return '<span class="muted">—</span>';
  return k.alias.map(a=>{const m=ameta(k,a);return `<div style="margin-bottom:6px"><span class="mono">${esc(a)}</span><div class="muted" style="font-size:11.5px;font-family:'Plus Jakarta Sans',system-ui,sans-serif">${SUMBER_ALIAS[m.sumber]||m.sumber} · ${esc(m.waktu)} · ${esc(m.oleh)}${m.catatan?' · '+esc(m.catatan):''}</div></div>`;}).join('');
}

/* ================= F2: Upload Excel ================= */
S.up={step:1,file:'',rows:[],so:[],mode:'lewati',f:'all',tab:'kontrak',hasil:null};
const KOL_UP={no:['no kontrak','no. kontrak','nomor kontrak','no wo/spk/kl'],judul:['judul kontrak','judul'],jenis:['jenis dok'],tahun:['tahun project','tahun'],pop:['populasi','pop'],
  pel:['customer','direct customer'],end:['end customer','nama pelanggan','pelanggan'],seg:['segment','seg'],nilai:['nilai kontrak','nilai'],lok:['jumlah lokasi'],pic:['pic'],
  doc:['dok tagih bast-1','dok tagih'],tahap:['tahap awal bast-1','tahap awal','tahap'],tgl:['tgl masuk tahap','tanggal masuk tahap'],kend:['kendala'],ket:['keterangan kendala'],cat:['catatan']};
const KOL_SO={no:['no kontrak','no. kontrak'],j:['jenis'],ono:['no order','no. order'],lay:['jenis layanan'],pek:['jenis pekerjaan'],lok:['jumlah lokasi'],ket:['keterangan']};
const hNorm=h=>String(h||'').toLowerCase().replace(/\*/g,'').replace(/[^a-z0-9\/-]+/g,' ').trim();
function petaKolom(header,def){const m={},hs=header.map(hNorm);Object.keys(def).forEach(f=>{const i=hs.findIndex(h=>def[f].map(hNorm).includes(h));if(i>=0)m[f]=i;});return m;}
const cari=(arr,v,lbl)=>arr.find(x=>(lbl?lbl(x):x).toLowerCase()===String(v).trim().toLowerCase());
const tebakJenis=no=>{const u=no.toUpperCase();return u.startsWith('TEL.')||/^KL[.\-\/ ]/.test(u)?'KL':/^WO[.\-\/ ]/.test(u)?'WO':/^SPK/.test(u)?'SPK':/^PO[.\-\/ ]/.test(u)?'PO':'';};
function bacaRupiah(v){
  if(v===''||v==null)return {v:null};
  if(typeof v==='number')return Number.isFinite(v)&&v>=0?{v:Math.round(v)}:{e:1};
  let s=String(v).replace(/rp/i,'').replace(/\s/g,'');
  if(!/^[\d.,]+$/.test(s))return {e:1};
  if(/,\d{2}$/.test(s)&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');          // 1.250.000,00
  else if(/\.\d{2}$/.test(s)&&s.includes(','))s=s.replace(/,/g,'');                         // 95,352,000.00
  else s=s.replace(/[.,]/g,'');                                                             // 1.250.000.000 / 1,250,000,000
  const n=Number(s);return Number.isFinite(n)?{v:Math.round(n)}:{e:1};
}
function bacaTgl(v){
  if(v===''||v==null)return {v:null};
  let d=null;
  if(v instanceof Date)d=v;else if(typeof v==='number')d=new Date(Math.round((v-25569)*864e5));
  else{const m=String(v).trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);if(m)d=new Date(+m[3],+m[2]-1,+m[1]);}
  if(!d||isNaN(d))return {e:1};
  const hari=Math.floor((new Date('2026-11-19')-d)/864e5);
  return hari<0?{e:2}:{v:d,hari};
}
const fmtTgl=d=>d?d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'';

function periksa(rows){
  const tahapL=TAHAP.map(t=>t.label),kendL=KREF.filter(x=>x.aktif).map(x=>x.label),seen={};
  const picBoleh=can('pic.atur');
  return rows.map(r=>{
    const o={baris:r.baris,raw:r,err:[],warn:[],info:[],st:'baru'};
    const v=f=>r[f]===undefined||r[f]===null?'':(r[f] instanceof Date?r[f]:String(r[f]).trim());
    o.no=v('no');o.judul=v('judul');
    if(!o.no){o.err.push('No. kontrak kosong');o.st='error';return o;}
    const nk=normKey(o.no);
    if(seen[nk]){o.err.push(`Nomor sama dengan baris ${seen[nk]} di file ini`);}else seen[nk]=r.baris;
    const ada=K.find(k=>normKey(k.no)===nk),lewatAlias=!ada&&K.find(k=>(k.alias||[]).some(a=>normKey(a)===nk));
    o.ada=ada||lewatAlias||null;o.viaAlias=!!lewatAlias;
    if(!o.ada&&!o.judul)o.err.push('Judul kontrak wajib diisi');
    // referensi
    o.jenis=v('jenis');if(o.jenis&&!cari(JENIS_DOK,o.jenis)){o.warn.push(`Jenis dok "${o.jenis}" tidak dikenal, ditebak dari nomor`);o.jenis='';}
    if(!o.jenis&&!o.ada){o.jenis=tebakJenis(o.no);if(o.jenis)o.info.push('Jenis dok ditebak: '+o.jenis);else o.warn.push('Jenis dok tidak bisa ditebak, dikosongkan');}
    o.tahun=v('tahun');if(o.tahun&&!/^(19|20)\d\d$/.test(o.tahun)){o.warn.push(`Tahun "${o.tahun}" tidak valid, dikosongkan`);o.tahun='';}
    o.pop=v('pop');if(o.pop&&!cari(POPS,o.pop)){o.warn.push(`Populasi "${o.pop}" belum ada di Referensi, dikosongkan`);o.pop='';}else if(o.pop)o.pop=cari(POPS,o.pop);
    o.seg=v('seg');if(o.seg&&!cari(SEGS,o.seg)){o.warn.push(`Segment "${o.seg}" belum ada di Referensi, dikosongkan`);o.seg='';}else if(o.seg)o.seg=cari(SEGS,o.seg);
    o.pel=v('pel');o.end=v('end');
    const n=bacaRupiah(r.nilai);if(n.e)o.err.push(`Nilai kontrak "${v('nilai')}" bukan angka`);else o.nilai=n.v;
    o.lok=v('lok');if(o.lok!==''&&!(Number(o.lok)>=1&&Number.isInteger(Number(o.lok))))o.err.push(`Jumlah lokasi "${o.lok}" harus bilangan bulat ≥ 1`);
    o.pic=v('pic');
    if(!picBoleh){if(o.pic&&o.pic!==meAlias())o.warn.push(`Kolom PIC diabaikan (butuh izin pic.atur); PIC sementara = Anda`);o.pic=o.ada?null:meAlias();}
    else if(o.pic&&!cari(PICS.concat(['omPik']),o.pic)){o.warn.push(`PIC "${o.pic}" tidak ada di Users → kontrak tanpa PIC`);o.pic='';}
    else if(o.pic)o.pic=cari(PICS.concat(['omPik']),o.pic);
    // BAST-1
    o.doc=v('doc');if(o.doc&&!cari(['BAST','BAA'],o.doc))o.err.push(`Dok tagih "${o.doc}" harus BAST atau BAA`);
    o.tahap=v('tahap');const t=o.tahap?cari(TAHAP,o.tahap,x=>x.label)||cari(TAHAP,o.tahap,x=>x.kode):TAHAP[0];
    if(!t)o.err.push(`Tahap "${o.tahap}" tidak ada. Pilihan: ${tahapL.join(', ')}`);else o.t=t;
    const tg=bacaTgl(r.tgl);if(tg.e)o.err.push(tg.e===2?'Tgl masuk tahap tidak boleh di masa depan':`Tgl masuk tahap "${v('tgl')}" tidak terbaca`);else{o.tgl=tg.v;o.hari=tg.v?tg.hari:0;}
    o.kend=v('kend');o.ket=v('ket');
    if(o.kend){const kd=cari(KREF,o.kend,x=>x.label)||cari(KREF,o.kend,x=>x.kode);if(!kd)o.err.push(`Kendala "${o.kend}" tidak ada. Pilihan: ${kendL.join(', ')}`);else{o.kd=kd;if(!o.ket)o.err.push('Keterangan kendala wajib diisi bila Kendala diisi');}}
    o.cat=v('cat');
    if(!o.ada){
      const jc=jenisCust({pel:o.pel,end:o.end});o.jc=jc;
      if(!o.pel)o.warn.push('Customer kosong → jenis customer BELUM TERDEFINISI (masuk "Data belum lengkap")');
      if(!o.end)o.warn.push('End customer kosong → jenis customer BELUM TERDEFINISI');
      o.docFinal=o.doc?o.doc.toUpperCase():({DIRECT:'BAA',INDIRECT:'BAST',BELUM:'BAST'})[jc];
    }
    o.st=o.err.length?'error':o.ada?'ada':o.warn.length?'peringatan':'baru';
    return o;
  });
}
const LBL_UP={no:'No. kontrak',judul:'Judul',jenis:'Jenis dok',tahun:'Tahun',pop:'Populasi',pel:'Customer',end:'End customer',seg:'Segment',nilai:'Nilai',lok:'Jumlah lokasi',pic:'PIC'};
/** Mode "Perbarui": hanya kolom yang diisi dan berbeda yang menimpa data SKM. */
function perubahan(o){
  if(!o.ada)return [];const k=o.ada,ch=[];
  ['judul','jenis','tahun','pop','pel','end','seg','nilai','lok','pic'].forEach(f=>{
    const baru=o[f];if(baru===''||baru==null)return;
    if(String(baru)!==String(k[f]??''))ch.push([f,k[f]??'',baru]);});
  return ch;
}
function periksaSO(so,rows){
  const okNo={},seenO={};rows.forEach(o=>{if(o.st!=='error')okNo[normKey(o.no)]=o;});
  const errNo={};rows.forEach(o=>{const nk=normKey(o.no);if(o.st==='error'&&o.no&&!okNo[nk]&&!errNo[nk])errNo[nk]=o.baris;});
  return so.map(r=>{
    const s={baris:r.baris,no:String(r.no||'').trim(),j:String(r.j||'').trim().toUpperCase(),ono:String(r.ono||'').trim(),lay:r.lay||'',pek:r.pek||'',lok:r.lok||'',ket:r.ket||'',err:[]};
    const nk=normKey(s.no);
    if(!s.no)s.err.push('No. kontrak kosong');
    else if(errNo[nk])s.err.push(`Kontraknya error di baris ${errNo[nk]} tab Kontrak, ikut tidak disimpan`);
    else if(!okNo[nk]&&!K.some(k=>normKey(k.no)===nk||(k.alias||[]).some(a=>normKey(a)===nk)))s.err.push('No. kontrak tidak ada di tab Kontrak maupun di SKM');
    if(!['SO','MI'].includes(s.j))s.err.push(`Jenis "${r.j||''}" harus SO atau MI`);
    if(!s.ono)s.err.push('No. order kosong');
    else{const ok=normKey(s.ono);if(seenO[ok])s.err.push(`No. order sama dengan baris ${seenO[ok]}`);else seenO[ok]=s.baris;
      const pemilik=K.find(k=>k.orders.some(x=>normKey(x.no)===ok));if(pemilik&&normKey(pemilik.no)!==nk)s.err.push(`No. order sudah dipakai ${pemilik.id}`);}
    s.st=s.err.length?'error':'ok';s.k=okNo[nk];return s;
  });
}

async function bacaFile(buf,nama){
  if(!window.XLSX){toast('Pustaka pembaca Excel belum termuat. Periksa koneksi internet lalu coba lagi.');return;}
  let wb;try{wb=XLSX.read(buf,{type:'array',cellDates:true});}catch(e){toast('File tidak bisa dibaca sebagai Excel (.xlsx).');return;}
  const ambil=(nama,def,wajib)=>{
    const sn=wb.SheetNames.find(n=>n.toLowerCase()===nama)||(nama==='kontrak'?wb.SheetNames.find(n=>{const h=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1})[0]||[];return petaKolom(h,def).no!==undefined;}):null);
    if(!sn)return null;
    const aoa=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:''}),m=petaKolom(aoa[0]||[],def);
    if(wajib&&(m.no===undefined))return {salah:true};
    return aoa.slice(1).map((row,i)=>{const o={baris:i+2};Object.keys(m).forEach(f=>o[f]=row[m[f]]);return o;}).filter(o=>Object.keys(def).some(f=>o[f]!==''&&o[f]!==undefined));
  };
  const rows=ambil('kontrak',KOL_UP,true);
  if(!rows||rows.salah){modal('Bukan template SKM',`<div class="note warn">${ic('warn','s')}<span class="tx">Tidak ada tab <b>Kontrak</b> dengan kolom <b>No. Kontrak</b> di file <span class="mono">${esc(nama)}</span>. Unduh template dari halaman ini, isi, lalu upload lagi.</span></div><div class="muted" style="font-size:12px">Sheet FF format lama (kolom NO WO/SPK/KL, STATUS AWAL, …) dibaca lewat Import data lama di F3.</div>`,[{l:'Mengerti',pri:true}]);return;}
  if(!rows.length){toast('Tab Kontrak masih kosong.');return;}
  if(rows.length>1000){toast(`File berisi ${rows.length} baris. Maksimal 1.000 per upload; pecah jadi beberapa file.`);return;}
  const so=ambil('so_mi',KOL_SO,false)||[];
  const U=S.up;U.file=nama;U.rowsRaw=rows;U.soRaw=so;U.step=3;U.f='all';U.tab='kontrak';hitungUlang();renderPage(false);
}
function hitungUlang(){const U=S.up;U.rows=periksa(U.rowsRaw);U.so=periksaSO(U.soRaw,U.rows);}
function ringkas(){
  const U=S.up,r=U.rows,c=st=>r.filter(o=>o.st===st).length,ada=r.filter(o=>o.st==='ada');
  const upd=U.mode==='perbarui'?ada.filter(o=>perubahan(o).length).length:0;
  return {total:r.length,baru:c('baru'),warn:c('peringatan'),ada:ada.length,upd,lewat:ada.length-upd,err:c('error'),
    soOk:U.so.filter(s=>s.st==='ok').length,soErr:U.so.filter(s=>s.st==='error').length};
}
const ST_UP={baru:['p-ok','Baru'],peringatan:['p-warn','Baru · peringatan'],ada:['p-dim','Sudah ada'],error:['p-crit','Error']};

function viewUpload(){
  const U=S.up;
  const steps=['Unduh template','Pilih file','Periksa','Selesai'],cur=U.step===1?1:U.step;
  const stepper=`<div class="ustep">${steps.map((s,i)=>`<div class="${i+1<cur?'done':i+1===cur||(cur===1&&i===1)?'on':''}"><i>${i+1<cur?'✓':i+1}</i><span>${s}</span></div>`).join('<b></b>')}</div>`;
  if(U.step===1)return `<div class="card" style="display:flex;flex-direction:column;gap:16px">${stepper}
   <div class="grid g2">
    <div class="ucard"><div class="uic">${ic('xls')}</div><div><h3>1. Unduh template</h3><div class="muted">Excel berisi tab <b>Kontrak</b> dan <b>SO_MI</b>, dengan dropdown Populasi, Segment, PIC, Tahap, Kendala yang sama dengan Pengaturan saat ini. Kolom merah wajib.</div>
      <div class="row" style="margin-top:12px"><a class="btn pri" href="#" data-dlmock="Template_Upload_Kontrak_SKM.xlsx" id="dlT">${ic('dl','s')}Template kosong</a><a class="btn" href="#" data-dlmock="Contoh_Upload_Kontrak.xlsx">${ic('dl','s')}Contoh terisi</a></div></div></div>
    <label class="drop" id="drop" tabindex="0"><input type="file" id="upFile" accept=".xlsx,.xls" hidden>
      <div class="uic big">${ic('up2')}</div><h3>2. Upload file yang sudah diisi</h3><div class="muted">Tarik file .xlsx ke sini, atau <b style="color:var(--accent)">klik untuk memilih</b>.</div>
      <div class="dim" style="font-size:12px">Belum ada yang disimpan sampai Anda menekan <b>Simpan</b> di langkah berikutnya.</div></label>
   </div>
   <div class="row"><button class="btn ghost sm" id="coba">${ic('eye','s')}Coba dengan file contoh</button><span class="sp"></span><a class="btn ghost sm" href="#kontrak">Kembali ke daftar kontrak</a></div>
   <div class="note info">${ic('shield','s')}<span class="tx">Aturan: nomor yang sudah ada di SKM (termasuk <b>nomor lama</b>) dilewati atau diperbarui sesuai pilihan Anda; baris error tidak disimpan; setiap kontrak dapat BAST-1 otomatis; semua tercatat di Log atas nama <b>${esc(meName())}</b>. Maksimal 1.000 kontrak per file.</span></div>
  </div>`;
  if(U.step===3){
    const R=ringkas(),flt=U.rows.filter(o=>U.f==='all'||o.st===U.f||(U.f==='baru'&&o.st==='peringatan'&&false));
    const simpanN=R.baru+R.warn+R.upd;
    const tile=(f,n,l,cls)=>`<button class="utile ${cls} ${U.f===f?'on':''}" data-uf="${f}"><b class="tnum">${n}</b><span>${l}</span></button>`;
    return `<div class="card" style="display:flex;flex-direction:column;gap:14px">${stepper}
     <div class="row"><span class="pill p-dim">${ic('xls','s')} ${esc(U.file)}</span><span class="muted">${R.total} baris kontrak · ${U.so.length} baris SO/MI</span><span class="sp"></span><button class="btn sm" id="ganti">Ganti file</button></div>
     <div class="utiles">${tile('all',R.total,'Semua baris','')}${tile('baru',R.baru,'Siap dibuat','ok')}${tile('peringatan',R.warn,'Dibuat dengan peringatan','warn')}${tile('ada',R.ada,U.mode==='perbarui'?`Sudah ada · ${R.upd} diperbarui`:'Sudah ada · dilewati','dim')}${tile('error',R.err,'Error · tidak disimpan','crit')}</div>
     <div class="row"><span style="font-weight:600">Bila nomor sudah ada di SKM:</span>
      <div class="seg" role="group">${[['lewati','Lewati'],['perbarui','Perbarui kolom yang diisi']].map(([v,l])=>`<button data-mode="${v}" class="${U.mode===v?'on':''}">${l}</button>`).join('')}</div>
      <span class="muted" style="font-size:12px">${U.mode==='perbarui'?'Sel kosong di Excel tidak menghapus data. Tahap &amp; kendala kontrak lama tidak diubah.':'Data kontrak lama tidak disentuh.'}</span></div>
     <div class="dtabs" style="margin:0"><button data-utab="kontrak" class="${U.tab==='kontrak'?'on':''}">Tab Kontrak <span class="pill p-dim">${R.total}</span></button><button data-utab="so" class="${U.tab==='so'?'on':''}">Tab SO_MI <span class="pill ${R.soErr?'p-crit':'p-dim'}">${U.so.length}${R.soErr?' · '+R.soErr+' error':''}</span></button></div>
     ${U.tab==='kontrak'?`<div class="tbl-wrap"><table class="t utbl"><thead><tr><th>Baris</th><th>Hasil</th><th style="min-width:260px">Kontrak</th><th style="min-width:280px">Catatan pemeriksaan</th><th class="num">Nilai</th><th>BAST-1 &amp; PIC</th></tr></thead><tbody>
      ${flt.map(o=>{const ch=U.mode==='perbarui'?perubahan(o):[];return `<tr class="u-${o.st}"><td class="tnum muted">${o.baris}</td><td><span class="pill ${ST_UP[o.st][0]}">${o.st==='ada'&&U.mode==='perbarui'&&ch.length?'Diperbarui':o.st==='ada'?'Dilewati':ST_UP[o.st][1]}</span></td>
        <td><span class="no">${esc(o.no)||'<span class="muted">(kosong)</span>'}</span><span class="sub">${esc(o.judul)||(o.ada?esc(o.ada.judul):'')}</span><span class="sub">${o.ada?esc(custName(o.ada)):`${esc(o.end||o.pel||'—')} ${custPill({pel:o.pel,end:o.end})}`}</span>
         ${o.ada?`<span class="ahit">${ic(o.viaAlias?'hist':'link','s')}<span>${o.viaAlias?`Nomor lama dari <b>${o.ada.id}</b>; nomor sekarang <span class="mono">${esc(o.ada.no)}</span>`:`Sudah terdaftar sebagai <b>${o.ada.id}</b>`} <button class="btn ghost sm" data-openk="${o.ada.id}" style="padding:0 6px">Buka</button></span></span>`:''}</td>
        <td><ul class="umsg">${o.err.map(e=>`<li class="e">${esc(e)}</li>`).join('')}${o.warn.map(e=>`<li class="w">${esc(e)}</li>`).join('')}${o.info.map(e=>`<li>${esc(e)}</li>`).join('')}
          ${ch.map(([f,a,b])=>`<li>${LBL_UP[f]}: <s class="muted">${esc(a===''?'(kosong)':f==='nilai'?rp(a):a)}</s> → <b>${esc(f==='nilai'?rp(b):b)}</b></li>`).join('')}
          ${o.st==='ada'&&U.mode==='perbarui'&&!ch.length?'<li>Tidak ada perbedaan</li>':''}${!o.err.length&&!o.warn.length&&!o.info.length&&o.st==='baru'?'<li class="ok">Lengkap</li>':''}</ul></td>
        <td class="num">${o.nilai!=null?rp(o.nilai):'<span class="muted">—</span>'}</td>
        <td>${o.ada?'<span class="muted">tidak diubah</span>':o.st==='error'?'<span class="muted">—</span>':o.t?`${tahapPill(o.t.kode)}<div class="muted" style="font-size:11.5px;margin-top:3px">${o.docFinal||''}${o.tgl?' · sejak '+fmtTgl(o.tgl)+' ('+o.hari+' hr)':''}${o.kd?` · <span style="color:var(--crit)">${esc(o.kd.label)}</span>`:''}</div>`:''}<div style="font-size:12px;margin-top:3px">PIC: ${o.pic?esc(o.pic):'<span class="muted">—</span>'}</div></td></tr>`;}).join('')||'<tr><td colspan="6" class="muted" style="text-align:center;padding:28px">Tidak ada baris di kategori ini.</td></tr>'}
      </tbody></table></div>`
     :`<div class="tbl-wrap"><table class="t utbl"><thead><tr><th>Baris</th><th>Hasil</th><th>No. kontrak</th><th>Jenis</th><th>No. order</th><th>Layanan</th><th class="num">Lokasi</th><th>Catatan pemeriksaan</th></tr></thead><tbody>
      ${U.so.map(s=>`<tr class="u-${s.st}"><td class="tnum muted">${s.baris}</td><td><span class="pill ${s.st==='ok'?'p-ok':'p-crit'}">${s.st==='ok'?'OK':'Error'}</span></td><td class="mono" style="font-size:12px">${esc(s.no)}</td><td>${esc(s.j)}</td><td class="mono" style="font-size:12px">${esc(s.ono)}</td><td>${esc(s.lay)}</td><td class="num">${esc(s.lok)}</td><td><ul class="umsg">${s.err.map(e=>`<li class="e">${esc(e)}</li>`).join('')||'<li class="ok">Ikut disimpan bersama kontraknya</li>'}</ul></td></tr>`).join('')||'<tr><td colspan="8" class="muted" style="text-align:center;padding:28px">Tab SO_MI kosong (boleh).</td></tr>'}
      </tbody></table></div>`}
     <div class="bulk" style="position:sticky;bottom:12px"><b>${simpanN} kontrak akan ${R.upd?'dibuat/diperbarui':'dibuat'}</b><span class="muted" style="font-size:12.5px">${R.err?R.err+' error dilewati · ':''}${R.lewat?R.lewat+' sudah ada dilewati · ':''}${R.soOk} SO/MI ikut</span><span class="sp"></span>
      ${R.err+R.soErr?`<button class="btn sm" id="dlErr">${ic('dl','s')}Unduh laporan error</button>`:''}<button class="btn sm pri" id="upSave" ${simpanN?'':'disabled'}>Simpan ${simpanN} kontrak</button></div>
     ${R.err?`<div class="note warn">${ic('warn','s')}<span class="tx">Baris error tidak disimpan. Perbaiki di Excel lalu upload file yang sama lagi: baris yang sudah tersimpan akan terbaca <b>Sudah ada</b> sehingga tidak dobel.</span></div>`:''}
    </div>`;
  }
  const H=U.hasil;
  return `<div class="card" style="display:flex;flex-direction:column;gap:16px">${stepper}
   <div class="udone"><div class="uic big ok">${ic('check')}</div><div><h3>Upload selesai</h3><div class="muted">${esc(U.file)} · disimpan atas nama ${esc(meName())} · tercatat di Log</div></div></div>
   <div class="utiles">${[['ok',H.dibuat.length,'Kontrak dibuat'],['dim',H.diperbarui.length,'Diperbarui'],['dim',H.dilewati,'Sudah ada, dilewati'],['crit',H.gagal,'Error, tidak disimpan'],['',H.so,'SO/MI ditambahkan']].map(([c,n,l])=>`<div class="utile ${c}"><b class="tnum">${n}</b><span>${l}</span></div>`).join('')}</div>
   ${H.dibuat.length?`<div><div class="eyebrow" style="margin-bottom:6px">Kontrak baru</div><div class="row">${H.dibuat.map(id=>{const k=K.find(x=>x.id===id);return `<button class="chipf" data-openk="${id}"><b class="mono" style="font-size:11.5px">${id}</b> ${esc(custName(k))}</button>`;}).join('')}</div></div>`:''}
   <div class="row"><button class="btn pri" id="toList">Lihat daftar kontrak</button><button class="btn" id="lagi">Upload file lain</button>${H.gagal?`<button class="btn ghost" id="dlErr">${ic('dl','s')}Unduh laporan error</button>`:''}</div>
  </div>`;
}

function unduhLaporan(){
  const U=S.up;if(!window.XLSX){toast('Pustaka Excel belum termuat.');return;}
  const wb=XLSX.utils.book_new();
  const a=[['Baris','No. Kontrak','Judul','Masalah']].concat(U.rows.filter(o=>o.st==='error').map(o=>[o.baris,o.no,o.judul,o.err.join('; ')]));
  const b=[['Baris','No. Kontrak','No. Order','Masalah']].concat(U.so.filter(s=>s.st==='error').map(s=>[s.baris,s.no,s.ono,s.err.join('; ')]));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(a),'Kontrak error');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(b),'SO_MI error');
  XLSX.writeFile(wb,'Laporan_error_'+U.file.replace(/\.xlsx?$/i,'')+'.xlsx');
}
function simpanUpload(){
  const U=S.up,hasil={dibuat:[],diperbarui:[],dilewati:0,gagal:0,so:0},sumberTxt=`upload Excel ${U.file}`;
  U.rows.forEach(o=>{
    if(o.st==='error'){hasil.gagal++;return;}
    if(o.st==='ada'){
      const ch=U.mode==='perbarui'?perubahan(o):[];if(!ch.length){hasil.dilewati++;return;}
      const k=o.ada,jc0=jenisCust(k);ch.forEach(([f,a,b])=>{log(me(),'UBAH_KONTRAK','Kontrak',k.id,LBL_UP[f],a,b,sumberTxt+' baris '+o.baris);k[f]=f==='nilai'||f==='lok'||f==='tahun'?Number(b):b;});
      hist(k,`<b>${esc(meName())}</b> memperbarui ${ch.map(c=>LBL_UP[c[0]]).join(', ')} lewat ${esc(sumberTxt)}${jc0!==jenisCust(k)?` · jenis customer ${jc0} → ${jenisCust(k)}`:''}`);
      hasil.diperbarui.push(k.id);return;
    }
    const id='K-'+String(K.length+1).padStart(6,'0'),orders=U.so.filter(s=>s.st==='ok'&&s.k===o).map(s=>({j:s.j,no:s.ono,lay:s.lay,pek:s.pek,lok:Number(s.lok)||0}));
    hasil.so+=orders.length;
    const k={id,no:o.no,jenis:o.jenis,tahun:o.tahun?Number(o.tahun):null,pop:o.pop,pel:o.pel,end:o.end,judul:o.judul,seg:o.seg,nilai:o.nilai??null,lok:o.lok===''?null:Number(o.lok),pic:o.pic||'',verif:false,sumber:'UPLOAD',alias:[],orders,
      bast:[{n:1,doc:o.docFinal,t:o.t.kode,s:1,cak:null,order:orders.map(x=>x.no).join(', '),hari:o.hari||0,ket:o.cat||'Dibuat dari upload Excel',dok:''}],
      kend:o.kd?[{id:'KD-U'+id.slice(-4),b:1,j:o.kd.kode,ket:o.ket,st:'AKTIF',hari:o.hari||0,oleh:meName()}]:[],
      hist:[[nowTxt(),`<b>${esc(meName())}</b> mendaftarkan kontrak lewat ${esc(sumberTxt)} (baris ${o.baris}) dan membuat BAST-1 (${o.docFinal})`]]};
    K.push(k);hasil.dibuat.push(id);
    log(me(),'BUAT_KONTRAK','Kontrak',id,'','',o.no,sumberTxt+' baris '+o.baris+(o.warn.length?'; '+o.warn.length+' peringatan':''));
  });
  // SO/MI untuk kontrak yang sudah ada
  U.so.filter(s=>s.st==='ok'&&!s.k).forEach(s=>{const k=K.find(x=>normKey(x.no)===normKey(s.no)||(x.alias||[]).some(a=>normKey(a)===normKey(s.no)));if(k&&U.mode==='perbarui'){k.orders.push({j:s.j,no:s.ono,lay:s.lay,pek:s.pek,lok:Number(s.lok)||0});hasil.so++;}});
  log(me(),'UPLOAD_EXCEL','Kontrak','—','','','',`${U.file}: ${hasil.dibuat.length} dibuat, ${hasil.diperbarui.length} diperbarui, ${hasil.dilewati} dilewati, ${hasil.gagal} error`);
  U.hasil=hasil;U.step=4;renderPage(false);toast(`${hasil.dibuat.length} kontrak dibuat${hasil.diperbarui.length?', '+hasil.diperbarui.length+' diperbarui':''}.`);
}
function bindUpload(){
  const U=S.up,$=s=>document.querySelector('#content '+s),$$=s=>document.querySelectorAll('#content '+s);
  const f=$('#upFile'),drop=$('#drop');
  if(f)f.onchange=async()=>{const x=f.files[0];if(x)bacaFile(await x.arrayBuffer(),x.name);};
  if(drop){['dragenter','dragover'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add('over');}));
    ['dragleave','drop'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove('over');}));
    drop.addEventListener('drop',async ev=>{const x=ev.dataTransfer.files[0];if(x)bacaFile(await x.arrayBuffer(),x.name);});
    drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f.click();}};}
  if($('#coba'))$('#coba').onclick=()=>{const bin=atob(CONTOH_B64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);bacaFile(u.buffer,'Contoh_Upload_Kontrak.xlsx');};
  $$('[data-dlmock]').forEach(a=>a.onclick=e=>{e.preventDefault();toast('(Mockup) File '+a.dataset.dlmock+' dikirim terpisah di chat. Di aplikasi, tombol ini langsung mengunduh template terbaru.');});
  $$('[data-uf]').forEach(b=>b.onclick=()=>{U.f=b.dataset.uf;U.tab='kontrak';renderPage(false);});
  $$('[data-mode]').forEach(b=>b.onclick=()=>{U.mode=b.dataset.mode;renderPage(false);});
  $$('[data-utab]').forEach(b=>b.onclick=()=>{U.tab=b.dataset.utab;renderPage(false);});
  $$('[data-openk]').forEach(b=>b.onclick=e=>{e.stopPropagation();openDrawer(b.dataset.openk);});
  if($('#ganti'))$('#ganti').onclick=()=>{U.step=1;renderPage(false);};
  if($('#lagi'))$('#lagi').onclick=()=>{S.up={step:1,file:'',rows:[],so:[],mode:'lewati',f:'all',tab:'kontrak',hasil:null};renderPage(false);};
  if($('#toList'))$('#toList').onclick=()=>{S.f.st='OPEN';S.f.q='';location.hash='#kontrak';};
  if($('#dlErr'))$('#dlErr').onclick=unduhLaporan;
  if($('#upSave'))$('#upSave').onclick=()=>{
    const R=ringkas(),n=R.baru+R.warn+R.upd,b=$('#upSave');
    modal('Simpan hasil upload?',`<div>${R.baru+R.warn} kontrak baru${R.upd?`, ${R.upd} kontrak diperbarui`:''}, ${R.soOk} SO/MI.${R.err?` <b>${R.err}</b> baris error tidak disimpan.`:''}</div><div class="muted" style="font-size:12px">Disimpan bertahap per 50 baris. Bila koneksi terputus di tengah, upload file yang sama lagi: yang sudah tersimpan terbaca "Sudah ada".</div>`,
      [{l:'Batal'},{l:`Simpan ${n} kontrak`,pri:true,fn:()=>{b.disabled=true;b.innerHTML='<span class="bspin"></span>Menyimpan…';setTimeout(simpanUpload,900);}}]);
  };
}
