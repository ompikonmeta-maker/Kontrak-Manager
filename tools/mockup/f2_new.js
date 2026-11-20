/* ================= F2: peran, form kontrak, SO/MI, BAST ================= */
IC.edit="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z";
IC.trash="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z";
K[0].alias=['TEL 0317-0016/P8/LG.270/DES-A2027000/2017'];
const JENIS_DOK=['KL','WO','SPK','PO','Nota Pesanan','Surat Pesanan'],POPS=['TREG','SDA','PRM','DIRECT'],SEGS=['LBCS','GOS','ENS','OLOS'];
const nowTxt=()=>'19 Nov '+new Date().toTimeString().slice(0,5);

function renderRoleChips(){
  const el=document.getElementById('asRole');
  el.innerHTML=Object.keys(AKUN).map(r=>`<button data-r="${r}" class="${S.role===r?'on':''}">${AKUN[r].u} · ${r}</button>`).join('');
  el.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{
    S.role=b.dataset.r;closeDrawer(true);closeKForm(true);shellBuilt=false;S.sel.clear();renderRoleChips();
    if(S.f.st==='ARSIP'&&!can('kontrak.arsip'))S.f.st='OPEN';
    if(route().startsWith('pengaturan')&&!can('pengaturan.kelola'))location.hash='#kontrak';else renderPage(true);
    toast('Masuk sebagai '+AKUN[S.role].u+' ('+S.role+')');
  });
}
renderRoleChips();
if(innerWidth<760)document.getElementById('mpanel').open=false;

/* ---------- form tambah / ubah kontrak (panel geser) ---------- */
function closeKForm(instant){const r=document.getElementById('sheet-root');if(!r.firstChild)return;if(instant||REDUCED){r.innerHTML='';return;}r.firstElementChild.classList.add('closing');setTimeout(()=>{r.innerHTML='';},300);}
function openKontrakForm(k){
  S.kf=k?{no:k.no,jenis:k.jenis,pel:k.pel,end:k.end,judul:k.judul,tahun:k.tahun,pop:k.pop,seg:k.seg,nilai:k.nilai??'',lok:k.lok??'',pic:k.pic}
        :{no:'',jenis:'KL',pel:'',end:'',judul:'',tahun:2026,pop:'DIRECT',seg:'GOS',nilai:'',lok:'',pic:can('pic.atur')?'':meAlias(),orders:[{j:'SO',no:'',lay:'',pek:'',lok:''}],buatBast:true,doc:''};
  S.kfOrig=k||null;S.kfErr='';renderKForm(true);
  setTimeout(()=>{const el=document.querySelector('#sheet-root #kno');if(el)el.focus();},80);
}
const jcOf=f=>jenisCust({pel:f.pel,end:f.end});
const dupeOf=f=>{const nk=normKey(f.no);if(!nk)return null;return K.find(x=>x!==S.kfOrig&&(normKey(x.no)===nk||(x.alias||[]).some(a=>normKey(a)===nk)));};
function dupeHtml(){const d=dupeOf(S.kf);return d?`<div class="dupe">${ic('warn','s')} Nomor ini sudah terdaftar sebagai <b>${d.id}</b> (${esc(custName(d))}). <button type="button" class="btn sm ghost" data-opendupe="${d.id}">Buka</button></div>`:(S.kf.no?`<div class="muted" style="font-size:11.5px;margin-top:4px">Kunci pencocokan: <span class="mono">${esc(normKey(S.kf.no))}</span></div>`:'');}
function jcHtml(){const j=jcOf(S.kf),u=({DIRECT:'BAA',INDIRECT:'BAST',BELUM:'BAST'})[j];return `${custPill({pel:S.kf.pel,end:S.kf.end})} <span class="muted" style="font-size:12px">· usulan dokumen tagih <b>${u}</b></span>`;}
function rpHtml(){const n=Number(String(S.kf.nilai).replace(/[^\d]/g,''));return S.kf.nilai===''?'':`<div class="muted" style="font-size:11.5px;margin-top:4px">${rp(n)}</div>`;}
function renderKForm(opening){
  const F=S.kf,O=S.kfOrig,isNew=!O,root=document.getElementById('sheet-root'),sc=root.querySelector('.dbody')?root.querySelector('.dbody').scrollTop:0;
  const opt=(arr,v)=>arr.map(x=>`<option ${String(x)===String(v)?'selected':''}>${esc(x)}</option>`).join('');
  root.innerHTML=`<div><div class="dscrim" id="kscrim" style="${opening?'':'animation:none'}"></div>
  <aside class="drawer ussheet" role="dialog" aria-modal="true" aria-label="${isNew?'Tambah kontrak':'Ubah data kontrak'}" style="width:min(640px,100vw);z-index:45;${opening?'':'animation:none'}">
   <div class="dhead" style="padding-bottom:14px"><div class="dtop"><button class="iconbtn" id="kclose" aria-label="Tutup">${ic('x')}</button><div><div class="eyebrow">${isNew?'Kontrak baru · input manual':'Ubah data kontrak'}</div><div style="font-weight:800;font-size:18px">${isNew?'Tambah kontrak':esc(O.id+' · '+custName(O))}</div></div></div></div>
   <div class="dbody">
    ${isNew?`<div class="note info">${ic('doc','s')}<span class="tx">Di F2 kontrak didaftarkan manual. Mulai F3 bisa lewat <b>import</b> sheet FF lama, dan mulai F4b otomatis masuk <b>Antrian</b> dari sheet unit.</span></div>`:''}
    <div class="sect"><div class="eyebrow">Identitas</div>
     <label class="of"><span>No. kontrak *</span><input class="inp mono" id="kno" value="${esc(F.no)}" autocomplete="off" spellcheck="false" placeholder="mis. TEL.0521-0102/HK.810/DES-A1000000/2021"></label>
     <div id="kdupe">${dupeHtml()}</div>
     ${!isNew?`<div class="muted" style="font-size:12px">Bila nomor dikoreksi, nomor lama disimpan sebagai <b>alias</b> supaya baris di sheet unit tetap dikenali. ID <span class="mono">${O.id}</span> tidak berubah.</div>`:''}
     <div class="grid g2" style="gap:14px"><label class="of"><span>Jenis dokumen</span><select class="inp" id="kjenis">${opt(JENIS_DOK,F.jenis)}</select></label><label class="of"><span>Tahun project</span><input class="inp tnum" id="ktahun" type="number" value="${esc(F.tahun)}"></label></div></div>
    <div class="sect"><div class="eyebrow">Customer</div>
     <div class="grid g2" style="gap:14px"><label class="of"><span>Customer (direct)</span><input class="inp" id="kpel" value="${esc(F.pel)}" placeholder="pihak yang berkontrak"></label><label class="of"><span>End customer</span><input class="inp" id="kend" value="${esc(F.end)}" placeholder="pengguna akhir"></label></div>
     <div id="kjc">${jcHtml()}</div></div>
    <div class="sect"><div class="eyebrow">Kontrak</div>
     <label class="of"><span>Judul kontrak *</span><input class="inp" id="kjudul" value="${esc(F.judul)}"></label>
     <div class="grid g2" style="gap:14px"><label class="of"><span>Populasi</span><select class="inp" id="kpop">${opt(POPS,F.pop)}</select></label><label class="of"><span>Segment</span><select class="inp" id="kseg">${opt(SEGS,F.seg)}</select></label>
      <label class="of"><span>Nilai kontrak (Rp)</span><input class="inp tnum" id="knilai" inputmode="numeric" value="${esc(F.nilai)}" placeholder="mis. 95352000"><div id="krp">${rpHtml()}</div></label>
      <label class="of"><span>Jumlah lokasi (opsional)</span><input class="inp tnum" id="klok" type="number" min="1" value="${esc(F.lok)}"><small>Diisi bila BAST bisa parsial per lokasi</small></label></div>
     <label class="of"><span>PIC</span><select class="inp" id="kpic" ${can('pic.atur')?'':'disabled title="Hanya admin (izin pic.atur)"'}><option value="">— Tanpa PIC —</option>${opt(PICS,F.pic)}</select>${can('pic.atur')?'':'<small>PIC diatur admin; kontrak baru sementara dicatat atas nama Anda.</small>'}</label></div>
    ${isNew?`<div class="sect"><div class="eyebrow">SO / MI (opsional)</div>
     ${F.orders.map((o,i)=>`<div class="orow"><select class="inp" data-o="${i}" data-f="j">${opt(['SO','MI'],o.j)}</select><input class="inp mono" data-o="${i}" data-f="no" value="${esc(o.no)}" placeholder="No. SO/MI" aria-label="No order ${i+1}"><input class="inp" data-o="${i}" data-f="lay" value="${esc(o.lay)}" placeholder="Layanan" aria-label="Layanan ${i+1}"><input class="inp" data-o="${i}" data-f="pek" value="${esc(o.pek)}" placeholder="Pekerjaan" aria-label="Pekerjaan ${i+1}"><input class="inp tnum" data-o="${i}" data-f="lok" value="${esc(o.lok)}" placeholder="Lokasi" aria-label="Lokasi ${i+1}"><button type="button" class="iconbtn" data-odel="${i}" aria-label="Hapus baris">${ic('trash','s')}</button></div>`).join('')}
     <button type="button" class="btn sm ton" id="oadd" style="align-self:flex-start">${ic('add','s')}Tambah SO/MI</button></div>
    <div class="sect"><div class="eyebrow">BAST awal</div>
     <div class="swrow"><div style="flex:1"><b>Buat BAST-1 sekarang</b><small>Tanpa BAST, di sheet unit tampil "BELUM DIPROSES"</small></div><button type="button" class="toggle ${F.buatBast?'on':''}" id="kbast" aria-label="Buat BAST-1" aria-pressed="${F.buatBast}"></button></div>
     ${F.buatBast?`<label class="of" style="max-width:280px"><span>Dokumen tagih</span><select class="inp" id="kdoc">${DOKTAGIH.map(d=>`<option value="${d.kode}" ${d.kode===(F.doc||({DIRECT:'BAA',INDIRECT:'BAST',BELUM:'BAST'})[jcOf(F)])?'selected':''}>${d.label}</option>`).join('')}</select><small>Mulai di tahap ${esc(tahLabel(TAHAP.slice().sort((a,b)=>a.urut-b.urut)[0].kode))}</small></label>`:''}</div>`:''}
    <div id="kerr">${S.kfErr?`<div class="note crit">${ic('warn','s')}<span class="tx">${S.kfErr}</span></div>`:''}</div>
   </div>
   <div class="sfoot"><button class="btn" id="kcancel">Batal</button><button class="btn pri" id="ksave">${ic('check','s')}${isNew?'Daftarkan kontrak':'Simpan'}</button></div>
  </aside></div>`;
  root.querySelector('.dbody').scrollTop=sc;bindKForm();
}
function bindKForm(){
  const q=s=>document.querySelector('#sheet-root '+s),F=S.kf;
  q('#kclose').onclick=q('#kcancel').onclick=q('#kscrim').onclick=()=>closeKForm();
  q('#kno').oninput=e=>{F.no=e.target.value;q('#kdupe').innerHTML=dupeHtml();bindDupe();};
  const bindDupe=()=>document.querySelectorAll('#sheet-root [data-opendupe]').forEach(b=>b.onclick=()=>{closeKForm(true);openDrawer(b.dataset.opendupe);});bindDupe();
  ['pel','end'].forEach(f=>q('#k'+f).oninput=e=>{F[f]=e.target.value;q('#kjc').innerHTML=jcHtml();if(q('#kdoc')&&!F.doc){q('#kdoc').value=({DIRECT:'BAA',INDIRECT:'BAST',BELUM:'BAST'})[jcOf(F)];}});
  q('#knilai').oninput=e=>{F.nilai=e.target.value;q('#krp').innerHTML=rpHtml();};
  [['jenis','change'],['tahun','input'],['judul','input'],['pop','change'],['seg','change'],['lok','input'],['pic','change']].forEach(([f,ev])=>{const el=q('#k'+f);if(el)el.addEventListener(ev,e=>{F[f]=e.target.value;});});
  document.querySelectorAll('#sheet-root [data-o]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{F.orders[+el.dataset.o][el.dataset.f]=el.value;}));
  document.querySelectorAll('#sheet-root [data-odel]').forEach(b=>b.onclick=()=>{F.orders.splice(+b.dataset.odel,1);renderKForm(false);});
  if(q('#oadd'))q('#oadd').onclick=()=>{F.orders.push({j:'SO',no:'',lay:'',pek:'',lok:''});renderKForm(false);};
  if(q('#kbast'))q('#kbast').onclick=()=>{F.buatBast=!F.buatBast;renderKForm(false);};
  if(q('#kdoc'))q('#kdoc').onchange=e=>{F.doc=e.target.value;};
  q('#ksave').onclick=saveKontrak;
}
function saveKontrak(){
  const F=S.kf,O=S.kfOrig,isNew=!O,err=m=>{S.kfErr=m;renderKForm(false);document.querySelector('#sheet-root .dbody').scrollTop=1e5;};
  F.no=F.no.trim();F.judul=String(F.judul).trim();
  if(!F.no)return err('No. kontrak wajib diisi.');
  const d=dupeOf(F);if(d)return err(`No. kontrak sudah terdaftar sebagai <b>${d.id}</b>. Buka kontrak itu, atau aliaskan bila penulisannya berbeda.`);
  if(!F.judul)return err('Judul kontrak wajib diisi.');
  const nilai=String(F.nilai).replace(/[^\d]/g,'');if(F.nilai!==''&&!nilai)return err('Nilai kontrak harus angka.');
  if(F.lok!==''&&!(Number(F.lok)>=1&&Number.isInteger(Number(F.lok))))return err('Jumlah lokasi harus bilangan bulat ≥ 1, atau kosongkan.');
  if(!(Number(F.tahun)>=2000&&Number(F.tahun)<=2100))return err('Tahun project tidak valid.');
  const orders=isNew?F.orders.filter(o=>o.no.trim()).map(o=>({j:o.j,no:o.no.trim(),lay:o.lay,pek:o.pek,lok:Number(o.lok)||0})):null;
  if(isNew&&new Set(orders.map(o=>normKey(o.no))).size!==orders.length)return err('Ada nomor SO/MI yang dobel.');
  const data={no:F.no,jenis:F.jenis,tahun:Number(F.tahun),pop:F.pop,pel:F.pel.trim(),end:F.end.trim(),judul:F.judul,seg:F.seg,nilai:nilai===''?null:Number(nilai),lok:F.lok===''?null:Number(F.lok),pic:F.pic};
  if(isNew){
    const id='K-'+String(K.length+1).padStart(6,'0'),first=TAHAP.slice().sort((a,b)=>a.urut-b.urut)[0].kode;
    const doc=F.doc||({DIRECT:'BAA',INDIRECT:'BAST',BELUM:'BAST'})[jenisCust(data)];
    K.push({id,...data,verif:false,sumber:'MANUAL',alias:[],orders,kend:[],
      bast:F.buatBast?[{n:1,doc,t:first,s:1,cak:null,order:orders.map(o=>o.no).join(', '),hari:0,ket:'Dibuat bersama kontrak',dok:''}]:[],
      hist:[[nowTxt(),`<b>${esc(meName())}</b> mendaftarkan kontrak (input manual)${F.buatBast?' dan membuat BAST-1 ('+doc+')':''}`]]});
    log(me(),'BUAT_KONTRAK','Kontrak',id,'','',F.no,'input manual'+(F.pic?'; PIC '+F.pic:''));
    closeKForm();S.f.st='OPEN';renderPage(false);setTimeout(()=>openDrawer(id),320);toast(`Kontrak ${id} didaftarkan.`);
  }else{
    const label={no:'No. kontrak',jenis:'Jenis dok',tahun:'Tahun',pop:'Populasi',pel:'Customer',end:'End customer',judul:'Judul',seg:'Segment',nilai:'Nilai',lok:'Jumlah lokasi',pic:'PIC'};
    const ch=Object.keys(data).filter(f=>String(data[f]??'')!==String(O[f]??''));
    if(!ch.length){closeKForm();toast('Tidak ada perubahan.');return;}
    if(ch.includes('no')){O.alias=O.alias||[];if(!O.alias.includes(O.no))O.alias.push(O.no);AMETA[normKey(O.no)]={sumber:'KOREKSI',waktu:nowTxt().replace(' Nov',' Nov 2026'),oleh:meName(),catatan:''};}
    const jc0=jenisCust(O);
    ch.forEach(f=>log(me(),'UBAH_KONTRAK','Kontrak',O.id,label[f],O[f]??'',data[f]??''));
    Object.assign(O,data);
    hist(O,`<b>${esc(meName())}</b> mengubah ${ch.map(f=>label[f]).join(', ')}${jc0!==jenisCust(O)?` · jenis customer ${jc0} → ${jenisCust(O)}`:''}`);
    closeKForm();refresh();toast('Data kontrak disimpan.');
  }
}

/* ---------- SO / MI ---------- */
function orderModal(k,idx){
  const o=idx==null?{j:'SO',no:'',lay:'',pek:'',lok:'',ket:''}:k.orders[idx];
  modal(idx==null?'Tambah SO/MI':'Ubah '+o.j+' '+esc(o.no),`<div class="grid g2"><label class="of"><span>Jenis</span><select class="inp" id="oj"><option ${o.j==='SO'?'selected':''}>SO</option><option ${o.j==='MI'?'selected':''}>MI</option></select></label><label class="of"><span>No. order *</span><input class="inp mono" id="ono" value="${esc(o.no)}"></label>
   <label class="of"><span>Jenis layanan</span><input class="inp" id="olay" value="${esc(o.lay)}"></label><label class="of"><span>Jenis pekerjaan</span><input class="inp" id="opek" value="${esc(o.pek)}"></label>
   <label class="of"><span>Jumlah lokasi</span><input class="inp tnum" id="olok" type="number" min="0" value="${esc(o.lok)}"></label></div>
   <label class="of"><span>Keterangan</span><input class="inp" id="oket" value="${esc(o.ket||'')}"></label>
   <div class="muted" style="font-size:12px">SO/MI menentukan eviden dasar BAST. Cakupan order tiap BAST dipilih di tombol <b>Ubah</b> pada kartu BAST.</div>`,
   [{l:'Batal'},{l:idx==null?'Tambah':'Simpan',pri:true,fn:d=>{
     const v=f=>d.querySelector(f).value.trim(),no=v('#ono');
     if(!no){toast('No. order wajib diisi.');return false;}
     if(k.orders.some((x,i)=>i!==idx&&normKey(x.no)===normKey(no))){toast('No. order sudah ada di kontrak ini.');return false;}
     const baru={j:v('#oj'),no,lay:v('#olay'),pek:v('#opek'),lok:Number(v('#olok'))||0,ket:v('#oket')};
     if(idx==null){k.orders.push(baru);log(me(),'TAMBAH_ORDER','OrderInternal',k.id,'',  '',baru.j+' '+no);hist(k,`<b>${esc(meName())}</b> menambah ${baru.j} <span class="mono">${esc(no)}</span>`);}
     else{log(me(),'UBAH_ORDER','OrderInternal',k.id,'Order',o.j+' '+o.no,baru.j+' '+no);k.orders[idx]=baru;hist(k,`<b>${esc(meName())}</b> mengubah ${baru.j} <span class="mono">${esc(no)}</span>`);}
     refresh();toast(idx==null?'SO/MI ditambahkan.':'SO/MI disimpan.');}}]);
}

/* ---------- ubah detail BAST ---------- */
function bastModal(k,n){
  const b=k.bast.find(x=>x.n===n),dipilih=String(b.order||'').split(',').map(x=>x.trim()).filter(Boolean);
  const lain=k.bast.filter(x=>x!==b).reduce((a,x)=>a+(x.cak||0),0);
  modal(`Ubah ${k.id}-B${n}`,`<label class="of"><span>No. dokumen ${esc(b.doc)}</span><input class="inp mono" id="bdok" value="${esc(b.dok)}" placeholder="mis. BAST/TSAT/0418/2026"></label>
   <div><div class="eyebrow" style="margin-bottom:8px">Cakupan order</div>${k.orders.length?k.orders.map(o=>`<label class="row" style="gap:8px;font-size:13px;padding:3px 0"><input type="checkbox" class="chk" data-bo="${esc(o.no)}" ${dipilih.includes(o.no)?'checked':''}><span class="mono">${esc(o.j)} ${esc(o.no)}</span><span class="muted">${esc(o.lay)} · ${o.lok} lokasi</span></label>`).join(''):'<div class="muted" style="font-size:13px">Kontrak ini belum punya SO/MI. Tambahkan di tab Data kontrak.</div>'}</div>
   <div class="grid g2"><label class="of"><span>Cakupan lokasi</span><input class="inp tnum" id="bcak" type="number" min="0" value="${b.cak??''}"><small>${k.lok?`Kontrak ${k.lok} lokasi; BAST lain ${lain}`:'Kosongkan bila mencakup semua'}</small></label></div>
   <label class="of"><span>Daftar lokasi (opsional)</span><textarea class="inp" id="blist" placeholder="Satu lokasi per baris">${esc(b.lokasi||'')}</textarea></label>
   <label class="of"><span>Keterangan</span><input class="inp" id="bket" value="${esc(b.ket)}"><small>Keterangan BAST terbaru menjadi Kendala Detil bila tidak ada kendala aktif</small></label>`,
   [{l:'Batal'},{l:'Simpan',pri:true,fn:d=>{
     const cakRaw=d.querySelector('#bcak').value,cak=cakRaw===''?null:Number(cakRaw);
     if(cak!=null&&!(cak>=0&&Number.isInteger(cak))){toast('Cakupan lokasi harus bilangan bulat.');return false;}
     if(cak!=null&&k.lok&&lain+cak>k.lok){toast(`Total cakupan ${lain+cak} melebihi jumlah lokasi kontrak (${k.lok}).`);return false;}
     const order=[...d.querySelectorAll('[data-bo]:checked')].map(c=>c.dataset.bo).join(', ');
     const baru={dok:d.querySelector('#bdok').value.trim(),order,cak,lokasi:d.querySelector('#blist').value.trim(),ket:d.querySelector('#bket').value.trim()};
     const ch=Object.keys(baru).filter(f=>String(baru[f]??'')!==String(b[f]??''));
     if(!ch.length){toast('Tidak ada perubahan.');return;}
     const L={dok:'No. dokumen',order:'Cakupan order',cak:'Cakupan lokasi',lokasi:'Daftar lokasi',ket:'Keterangan'};
     ch.forEach(f=>log(me(),'UBAH_BAST','BAST',k.id+'-B'+n,L[f],b[f]??'',baru[f]??''));
     Object.assign(b,baru);hist(k,`<b>${esc(meName())}</b> mengubah ${ch.map(f=>L[f]).join(', ')} pada B${n}`);
     refresh();toast('BAST disimpan.');}}]);
}
