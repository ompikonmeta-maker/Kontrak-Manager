/* ---------- Izin tambahan per user (keputusan F3: kontrak.import) ---------- */
const IZIN_TAMBAHAN = [['kontrak.import', 'Upload Excel & import data lama', 'Menambah banyak kontrak sekaligus dari file. Bawaan hanya ADMIN.']];
const izinUser = u => [...new Set(ROLES[u.role].concat(u.extra || []))];
// Dashboard & Perlu Perhatian: user yang punya Alias PIC dan tidak mengatur PIC orang lain dibuka dengan "Milik saya"
S.scopeRole = null;
function syncScope() { if (S.scopeRole !== S.role) { S.scopeRole = S.role; S.dMine = S.pMine = !!meAlias() && !can('pic.atur'); } }
function viewUsersF3() {
  return `<div class="card"><h2>Users<span class="sp"></span><button class="btn sm pri">${ic('add', 's')}Tambah user</button></h2><div class="tbl-wrap"><table class="t"><thead><tr><th>User</th><th>Alias PIC</th><th>Role</th><th>Izin tambahan</th><th>Status</th><th></th></tr></thead><tbody>
    ${USERS.map((u, i) => `<tr><td><div class="row" style="flex-wrap:nowrap">${avatar(u.nama, 1)}<div><b>${esc(u.nama)}</b><div class="mono dim" style="font-size:11px">${u.u}</div></div></div></td><td>${esc(u.alias) || '<span class="dim">—</span>'}</td><td><span class="pill ${u.role === 'ADMIN' ? 'p-acc' : 'p-dim'}">${u.role}</span></td>
     <td>${(u.extra || []).filter(p => !ROLES[u.role].includes(p)).map(p => `<span class="pill p-info">${esc(IZIN_TAMBAHAN.find(x => x[0] === p)[1])}</span>`).join(' ') || '<span class="dim">—</span>'}</td>
     <td>${u.ganti ? '<span class="pill p-warn">Wajib ganti password</span>' : '<span class="pill p-ok">Aktif</span>'}</td><td><button class="btn sm" data-uedit="${i}">${ic('edit', 's')}Ubah</button></td></tr>`).join('')}</tbody></table></div>
    <div class="muted" style="font-size:12px;margin-top:10px">Izin user = izin role-nya + izin tambahan yang dicentang di panel user. Izin tambahan dipakai untuk pengecualian satu-dua orang tanpa membuat role baru.</div></div>`;
}
function bindUsersF3() {
  document.querySelectorAll('#content [data-uedit]').forEach(b => b.onclick = () => {
    const u = USERS[+b.dataset.uedit];
    const baris = () => IZIN_TAMBAHAN.map(([p, l, d]) => { const dariRole = ROLES[u.role].includes(p); return `<label class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:10px;cursor:${dariRole ? 'default' : 'pointer'};padding:10px 12px;border:1px solid var(--line);border-radius:12px">
      <input type="checkbox" class="chk" data-ux="${p}" ${dariRole || (u.extra || []).includes(p) ? 'checked' : ''} ${dariRole ? 'disabled' : ''} style="margin-top:2px"><span><b>${l}</b> <span class="mono dim" style="font-size:11px">${p}</span><div class="muted" style="font-size:12.5px">${dariRole ? 'Sudah termasuk role ' + u.role + '.' : d}</div></span></label>`; }).join('');
    modal('Ubah user · ' + esc(u.nama), `<div class="grid g2"><label class="of"><span>Nama</span><input class="inp" value="${esc(u.nama)}"></label><label class="of"><span>Alias PIC</span><input class="inp" value="${esc(u.alias)}"></label></div>
      <label class="of"><span>Role</span><select class="inp" id="mRole">${Object.keys(ROLES).map(r => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <div class="lbl" style="margin-top:6px">Izin tambahan <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">di luar role</span></div><div id="mX" style="display:flex;flex-direction:column;gap:8px">${baris()}</div>`,
      [{ l: 'Batal' }, { l: 'Simpan', pri: true, fn: d => {
        const lama = (u.extra || []).join(',');
        u.role = d.querySelector('#mRole').value;
        u.extra = [...d.querySelectorAll('[data-ux]')].filter(c => c.checked && !c.disabled).map(c => c.dataset.ux);
        log(me(), 'UBAH_USER', 'Users', u.u, 'IzinTambahan', lama, u.extra.join(','));
        if (u.u === me()) shellBuilt = false;
        renderPage(false); toast(`${u.nama}: izin tersimpan. Berlaku saat ${u.u === me() ? 'ini juga' : 'user itu memuat ulang / sinkron berikutnya'}.`);
      } }]);
    const rs = document.querySelector('#overlay-root #mRole');
    rs.onchange = () => { const r = u.role; u.role = rs.value; document.querySelector('#overlay-root #mX').innerHTML = baris(); u.role = r; };
  });
}
