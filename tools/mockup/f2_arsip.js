/* ================= F2 (hasil uji beban): data aktif di browser, simpan di latar, arsip tahunan ================= */
const cariK=id=>K.find(x=>x.id===id)||ARS.find(x=>x.id===id);

/* ---------- kontrak lama: CLOSE > 90 hari, disimpan di file arsip per tahun; tetap bisa dicari lewat indeks ---------- */
const ARS=[
 {id:'K-000188',no:'TEL.0611-0044/HK.810/DES-A1000000/2025',jenis:'KL',tahun:2025,pop:'SDA',pel:'Bank Rakyat Indonesia',end:'Bank Rakyat Indonesia',judul:'Layanan VSAT IP 120 Unit Kerja',seg:'GOS',nilai:4120000000,lok:120,pic:'Unggul',verif:false,sumber:'MANUAL',alias:[],
  orders:[{j:'SO',no:'SO-2025-01120',lay:'VSAT IP',pek:'Instalasi + Sewa',lok:120}],bast:[{n:1,doc:'BAA',t:'TAKEOUT',s:1,cak:null,order:'SO-2025-01120',hari:0,ket:'Selesai BAA',dok:'BAA/TSAT/0611/2025'}],kend:[],lama:2025,closeTgl:'14 Mar 2025'},
 {id:'K-000203',no:'WO/0221/TSAT/IV/2025',jenis:'WO',tahun:2025,pop:'TREG',pel:'PT Telkom Indonesia (Persero) Tbk',end:'Bank Rakyat Indonesia',judul:'Backup Link Satelit Kanca Papua',seg:'LBCS',nilai:980000000,lok:14,pic:'Edo',verif:false,sumber:'ANTRIAN',alias:['WO-0221/TSAT/IV/2025'],
  orders:[{j:'SO',no:'SO-2025-01402',lay:'VSAT IP',pek:'Sewa',lok:14}],bast:[{n:1,doc:'BAST',t:'TAKEOUT',s:1,cak:null,order:'SO-2025-01402',hari:0,ket:'',dok:'BAST/TSAT/0221/2025'}],kend:[],lama:2025,closeTgl:'2 Jun 2025'},
 {id:'K-000057',no:'TEL.0117-0090/HK.810/DES-A2027000/2024',jenis:'KL',tahun:2024,pop:'PRM',pel:'Pertamina Hulu Energi',end:'Pertamina Hulu Energi',judul:'Jaringan VSAT Remote Wellsite 30 Titik',seg:'ENS',nilai:7350000000,lok:30,pic:'Baim',verif:false,sumber:'IMPORT',alias:[],
  orders:[{j:'SO',no:'SO-2024-00317',lay:'VSAT IP',pek:'Instalasi + Sewa',lok:30}],bast:[{n:1,doc:'BAA',t:'TAKEOUT',s:2,cak:null,order:'SO-2024-00317',hari:0,ket:'Reopen 1× (revisi dokumen) lalu close',dok:'BAA/TSAT/0117/2024'}],kend:[],lama:2024,closeTgl:'28 Nov 2024'},
 {id:'K-000301',no:'SPK-0012/TSAT/2025',jenis:'SPK',tahun:2025,pop:'DIRECT',pel:'PT Armada Bahari',end:'PT Armada Bahari',judul:'Maritime VSAT 6 Kapal',seg:'OLOS',nilai:640000000,lok:6,pic:'Alif',verif:false,sumber:'UPLOAD',alias:[],
  orders:[{j:'SO',no:'SO-2025-02210',lay:'Maritime VSAT',pek:'Sewa',lok:6}],bast:[{n:1,doc:'BAA',t:'TAKEOUT',s:1,cak:null,order:'SO-2025-02210',hari:0,ket:'',dok:'BAA/TSAT/0012/2025'}],kend:[],lama:2025,closeTgl:'19 Jul 2025'},
 {id:'K-000412',no:'KL.0230/TSAT/V/2026',jenis:'KL',tahun:2026,pop:'DIRECT',pel:'Bank Permata',end:'Bank Permata',judul:'Internet Satelit ATM 18 Lokasi',seg:'LBCS',nilai:512000000,lok:18,pic:'Edo',verif:false,sumber:'MANUAL',alias:[],
  orders:[{j:'SO',no:'SO-2026-00918',lay:'VSAT Broadband',pek:'Sewa',lok:18}],bast:[{n:1,doc:'BAA',t:'TAKEOUT',s:1,cak:null,order:'SO-2026-00918',hari:0,ket:'',dok:'BAA/TSAT/0230/2026'}],kend:[],lama:2026,closeTgl:'11 Jul 2026'},
];
ARS.forEach(k=>k.bast.forEach(b=>{b.cak=k.lok;}));   // kontrak lama sudah lengkap semua lokasinya
AMETA[normKey('WO-0221/TSAT/IV/2025')]={sumber:'ANTRIAN',waktu:'3 Apr 2025 09:12',oleh:'Edo Pratama',catatan:'Sheet unit menulis nomor dengan strip'};

function arsipSection(){
  const q=(S.f.q||'').trim();if(q.length<3||S.f.st==='ARSIP')return '';
  if(S.arsDone!==q){S.arsPending=q;return `<div class="card arsres"><div class="row"><span class="bspin" style="color:var(--accent)"></span><b>Mencari juga di kontrak lama…</b><span class="muted" style="font-size:12.5px">indeks semua kontrak · ±1–3 dtk</span></div></div>`;}
  const hits=ARS.filter(k=>cocokCari(k,q));
  return `<div class="card arsres"><h2>${ic('hist','s')} Kontrak lama <small>${hits.length} cocok · CLOSE lebih dari 90 hari, disimpan di arsip per tahun · tetap bisa dibuka &amp; dibuka kembali</small></h2>
   ${hits.length?`<div class="tbl-wrap"><table class="t"><thead><tr><th>Kontrak</th><th>Status</th><th>Arsip</th><th>Close</th><th>PIC</th></tr></thead><tbody>
   ${hits.map(k=>`<tr class="click" data-openlama="${k.id}"><td><span class="no">${esc(k.no)}</span><span class="sub"><b style="color:var(--fg);font-weight:600">${esc(custName(k))}</b> · ${esc(k.judul)}</span>${aliasHit(k)}</td>
     <td><span class="pill p-dim">CLOSE</span></td><td class="tnum">${k.lama}</td><td class="tnum muted">${esc(k.closeTgl)}</td><td>${esc(k.pic)}</td></tr>`).join('')}</tbody></table></div>`
   :'<div class="muted">Tidak ada kontrak lama yang cocok.</div>'}</div>`;
}
function rerenderKontrakJaga(){
  const a=document.activeElement,isQ=a&&a.id==='q',pos=isQ?a.selectionStart:null;
  renderPage(false);
  if(isQ){const n=document.getElementById('q');if(n){n.focus();n.setSelectionRange(pos,pos);}}
}
function bindArsip(){
  if(S.arsPending&&S.arsDone!==S.arsPending){const q=S.arsPending;clearTimeout(S._arsT);
    S._arsT=setTimeout(()=>{if((S.f.q||'').trim()===q&&route()==='kontrak'){S.arsDone=q;S.arsPending=null;rerenderKontrakJaga();}},900);}
  document.querySelectorAll('#content [data-openlama]').forEach(tr=>tr.onclick=()=>openLama(tr.dataset.openlama));
}
function openLama(id){
  const k=cariK(id);S.drawer=id;S.dlist=[id];S.dtab='proses';
  document.getElementById('drawer-root').innerHTML=`<div class="dwrap"><div class="dscrim" id="dscrim0"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Detail kontrak">
   <div class="dhead"><div class="dtop"><button class="iconbtn" id="dclose0" aria-label="Tutup">${ic('x')}</button></div></div>
   <div class="dbody"><div class="lamaload"><span class="bspin"></span><div><b>Mengambil dari arsip ${k.lama}…</b><div class="muted">Cari di indeks ✓ · buka file arsip ${k.lama} · ±3–4 dtk</div></div></div></div></aside></div>`;
  ['dclose0','dscrim0'].forEach(x=>document.getElementById(x).onclick=()=>closeDrawer(true));
  setTimeout(()=>{if(S.drawer===id)renderDrawer(false);},1100);
}
function lamaBanner(k){
  if(!k.lama)return '';
  return `<div class="note warn" style="margin-top:12px">${ic('hist','s')}<span class="tx"><b>Kontrak lama</b> · tersimpan di arsip ${k.lama} (close ${esc(k.closeTgl)}). Hanya bisa dilihat. Bila ada return/revisi, buka kembali: kontrak dipindah ke data aktif dengan ID yang sama, riwayatnya ikut (±5 dtk).</span>
   ${can('kontrak.update')?`<button class="btn sm pri" id="reopenLama" style="flex:none">Buka kembali (reopen)</button>`:''}</div>`;
}
function reopenModal(k){
  const opts=KREF.filter(x=>x.reopen&&x.aktif);
  modal('Buka kembali '+k.id,`<div class="muted">Reopen terjadi karena return atau revisi. Kontrak dipindah dari arsip ${k.lama} ke data aktif; BAST-1 masuk siklus baru dan kendalanya dicatat.</div>
   <label class="of"><span>Alasan (kendala pemicu reopen)</span><select class="inp" id="roK">${opts.map(o=>`<option value="${o.kode}">${esc(o.label)}</option>`).join('')}</select></label>
   <label class="of"><span>Keterangan (wajib)</span><input class="inp" id="roKet" placeholder="mis. customer minta revisi nilai di BAST"></label>
   <label class="of"><span>Kembali ke tahap</span><select class="inp" id="roT">${TAHAP.filter(t=>!t.penutup&&t.aktif).map(t=>`<option value="${t.kode}" ${t.kode==='DRAFTING'?'selected':''}>${esc(t.label)}</option>`).join('')}</select></label>`,
   [{l:'Batal'},{l:'Buka kembali',pri:true,fn:d=>{const j=d.querySelector('#roK').value,ket=d.querySelector('#roKet').value.trim(),t=d.querySelector('#roT').value;
     if(!ket){toast('Keterangan wajib diisi.');return false;}prosesReopen(k,j,ket,t);}}]);
}
function langkahProgres(judul,langkah,selesai){
  const ov=document.createElement('div');ov.className='loadov';
  ov.innerHTML=`<div class="loadbox"><div class="uic big">${ic('sync')}</div><h3>${judul}</h3><ol class="lsteps">${langkah.map(l=>`<li>${l}</li>`).join('')}</ol></div>`;
  document.body.appendChild(ov);const li=[...ov.querySelectorAll('li')];let i=0;
  const step=()=>{li.forEach((x,j)=>{x.className=j<i?'done':j===i?'on':'';});if(i>li.length){ov.classList.add('out');setTimeout(()=>ov.remove(),350);selesai&&selesai();return;}i++;setTimeout(step,REDUCED?120:420);};
  step();
}
function prosesReopen(k,j,ket,t){
  const thn=k.lama;
  langkahProgres('Membuka kembali '+k.id,['Memindah kontrak, BAST, SO/MI &amp; riwayat dari arsip '+thn,'Membuka kendala &amp; siklus baru BAST-1','Memperbarui indeks'],()=>{
    ARS.splice(ARS.indexOf(k),1);delete k.lama;
    const b=k.bast[0];b.s=(b.s||1)+1;b.t=t;b.hari=0;
    k.kend.push({id:'KD-R'+k.id.slice(-4),b:1,j,ket,st:'AKTIF',hari:0,oleh:meName()});
    K.push(k);S.dlist=K.map(x=>x.id);
    hist(k,`<b>${esc(meName())}</b> membuka kembali kontrak dari arsip ${thn}: ${esc(KREF.find(x=>x.kode===j).label)} — ${esc(ket)} · BAST-1 siklus ${b.s} di ${esc(tah(t).label)}`);
    log(me(),'REOPEN_KONTRAK','Kontrak',k.id,'Status','CLOSE','OPEN','dari arsip '+thn+'; '+ket);
    renderPage(false);renderDrawer(false);toast(`${k.id} dibuka kembali dan kembali ke data aktif.`);
  });
}

/* ---------- layar saat aplikasi dibuka: data aktif dimuat sekali ke browser ---------- */
function layarBuka(){
  const n=K.length;
  langkahProgres('Memuat data aktif',['Menghubungi server','Kontrak aktif · '+n+' kontrak (di aplikasi asli ±3.000)','BAST, SO/MI, kendala &amp; riwayat','Siap: daftar, filter, cari &amp; detail kini instan'],()=>{S.sync.last=Date.now();syncChip();});
}

/* ---------- simpan di latar + sinkron perubahan orang lain ---------- */
S.sync={pending:0,last:Date.now(),saved:0,batch:null};
const _log0=log;
log=function(user){_log0.apply(null,arguments);if(user===me())simpanLatar();};
function simpanLatar(){
  if(S.sync.batch)return;   // beberapa log dari satu aksi = satu simpan
  S.sync.batch=setTimeout(()=>{S.sync.batch=null;},60);
  S.sync.pending++;syncChip();
  setTimeout(()=>{S.sync.pending--;if(!S.sync.pending){S.sync.saved=Date.now();S.sync.last=Date.now();}syncChip();setTimeout(syncChip,8200);},REDUCED?400:2600);
}
function syncChip(){
  const el=document.getElementById('syncChip');if(!el)return;const s=S.sync,now=Date.now();
  if(s.pending){el.className='syncchip busy';el.innerHTML=`<span class="bspin"></span>Menyimpan ${s.pending} perubahan…`;return;}
  if(now-s.saved<8000){el.className='syncchip ok';el.innerHTML=`${ic('check','s')}Tersimpan ${new Date(s.saved).toTimeString().slice(0,5)}`;return;}
  const d=Math.round((now-s.last)/1000);
  el.className='syncchip';el.innerHTML=`<span class="pulse"></span>Data terbaru · ${d<10?'baru saja':d+' dtk lalu'}`;
}
setInterval(()=>{if(Date.now()-S.sync.last>30000)S.sync.last=Date.now();syncChip();},5000);   // tarik perubahan tiap ±30 dtk
function infoSync(){
  modal('Cara data tersimpan',`<div class="grid" style="gap:10px">
   <div class="note info">${ic('sync','s')}<span class="tx"><b>Data kontrak aktif ada di browser</b> sejak aplikasi dibuka, jadi daftar, filter, cari, dan detail langsung tampil tanpa menunggu server.</span></div>
   <div class="note info">${ic('check','s')}<span class="tx"><b>Setiap perubahan langsung tampil</b>, lalu disimpan ke server di latar (±3–4 dtk). Tanda di bilah atas: <i>Menyimpan…</i> → <i>Tersimpan</i>. Bila gagal (mis. bentrok dengan perubahan orang lain), tampilan dikembalikan dan muncul pesan.</span></div>
   <div class="note info">${ic('person','s')}<span class="tx"><b>Perubahan dari anggota tim lain</b> masuk otomatis tiap ±30 dtk.</span></div>
   <div class="muted" style="font-size:12px">Jangan tutup tab saat tanda <i>Menyimpan…</i> masih tampil; browser akan mengingatkan.</div></div>`,[{l:'Mengerti',pri:true}]);
}
function ubahanLain(){
  const kand=K.filter(k=>!k.arsip&&k.id!==S.drawer&&k.bast.length&&!tah(k.bast[0].t).penutup&&statusK(k).st==='OPEN');if(!kand.length)return;
  const k=kand[Math.floor(Math.random()*kand.length)],b=k.bast[0],urut=TAHAP.filter(t=>t.aktif).sort((x,y)=>x.urut-y.urut),i=urut.findIndex(t=>t.kode===b.t),nx=urut[Math.min(i+1,urut.length-2)];
  if(!nx||nx.kode===b.t)return;
  const lama=b.t;b.t=nx.kode;b.hari=0;
  hist(k,`<b>Unggul Wicaksono</b> memindah BAST-1 ke ${esc(nx.label)}`);_log0('unggul','UBAH_TAHAP','BAST',k.id+'-B1','KodeTahap',lama,nx.kode,'');
  S.flash=k.id;S.sync.last=Date.now();syncChip();
  const a=document.activeElement;if(route()==='kontrak'&&!(a&&/INPUT|SELECT|TEXTAREA/.test(a.tagName)))renderPage(false);
  toast(`Unggul memindah ${k.id} ke ${nx.label}. Masuk otomatis, tanpa muat ulang.`);
  setTimeout(()=>{S.flash=null;},3000);
}
setTimeout(ubahanLain,25000);
window.addEventListener('beforeunload',e=>{if(S.sync.pending){e.preventDefault();e.returnValue='';}});
(function(){
  const mb=document.querySelector('#mpanel .mb');if(!mb)return;const d=document.createElement('div');
  d.innerHTML='<div class="lbl">Simulasi</div><div class="chips"><button id="mpBuka">Layar buka aplikasi</button><button id="mpLain">Perubahan dari user lain</button></div><div class="muted" style="font-size:12px;margin-top:6px">Coba juga: cari <b>Rakyat</b> atau <b>WO-0221</b> untuk melihat kontrak lama di arsip.</div>';
  mb.appendChild(d);document.getElementById('mpBuka').onclick=layarBuka;document.getElementById('mpLain').onclick=ubahanLain;
})();
