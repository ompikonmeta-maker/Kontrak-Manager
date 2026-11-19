/**
 * Auth: hash password, sesi, dan profil izin. Pengecekan izin dilakukan di gerbang api() (40_Api.js).
 */
var Auth = (function () {
  var ITERASI = 500;   // SHA-256 berulang + salt (§12). Jumlah iterasi ikut disimpan supaya bisa dinaikkan nanti.

  function hex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) { var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i]; s += (b < 16 ? '0' : '') + b.toString(16); }
    return s;
  }
  function sha(s) { return hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }

  function hash(pw, salt, iterasi) {
    iterasi = iterasi || ITERASI;
    var h = salt + ':' + pw;
    for (var i = 0; i < iterasi; i++) h = sha(h + ':' + salt);
    return 'sha256$' + iterasi + '$' + h;
  }
  function cocok(pw, salt, tersimpan) {
    var p = String(tersimpan || '').split('$');
    if (p.length !== 3 || p[0] !== 'sha256') return false;
    var h = hash(pw, salt, Number(p[1]));
    var beda = h.length ^ tersimpan.length;                 // bandingkan tanpa berhenti di karakter pertama yang beda
    for (var i = 0; i < h.length && i < tersimpan.length; i++) beda |= h.charCodeAt(i) ^ tersimpan.charCodeAt(i);
    return beda === 0;
  }
  function saltBaru() { return Utilities.getUuid().replace(/-/g, ''); }
  function bytesAcak(n) {
    var hx = '', out = [];
    while (hx.length < n * 2) hx += Utilities.getUuid().replace(/-/g, '');
    for (var i = 0; i < n; i++) out.push(parseInt(hx.substr(i * 2, 2), 16));
    return out;
  }
  function passwordAcak() { return Domain.passwordAcak(bytesAcak(9)); }

  // ---------- sesi (token di CacheService, diperpanjang tiap permintaan) ----------
  function detikSesi() { return Math.min(21600, Math.max(600, Domain.num(Repo.config('SESI_JAM', '6'), 6) * 3600)); }
  function buatSesi(user) {
    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    CacheService.getScriptCache().put('sesi:' + token, JSON.stringify({ u: user.Username, v: Domain.num(user.SesiVersi, 0) }), detikSesi());
    return token;
  }
  function ambilSesi(token) {
    if (!token) throw Repo.galat('SESI_HABIS', 'Silakan masuk dulu.');
    var c = CacheService.getScriptCache(), s = c.get('sesi:' + token);
    if (!s) throw Repo.galat('SESI_HABIS', 'Sesi Anda berakhir. Silakan masuk lagi.');
    c.put('sesi:' + token, s, detikSesi());                // perpanjang
    return JSON.parse(s);
  }
  function hapusSesi(token) { if (token) CacheService.getScriptCache().remove('sesi:' + token); }

  /** Data user yang aman dikirim ke browser (tanpa hash & salt). */
  function profil(u, peta) {
    var now = Date.now(), kunci = Domain.terkunci(u, now);
    return {
      username: u.Username, nama: u.Nama, alias: u.AliasPIC, role: u.Role,
      aktif: Domain.bool(u.Aktif), wajibGanti: Domain.bool(u.WajibGantiPassword),
      status: Domain.statusUser(u, now),
      terkunciSampai: kunci ? Utilities.formatDate(new Date(kunci), APP.TZ, 'HH:mm') : '',
      loginTerakhir: u.LoginTerakhir || '', bisaDihapus: Domain.bolehHapus(u),
      dibuatOleh: u.CreatedBy || '', version: u.Version || '',
      izin: peta ? Domain.izinUser(u, peta) : undefined
    };
  }

  return { hash: hash, cocok: cocok, saltBaru: saltBaru, passwordAcak: passwordAcak,
           buatSesi: buatSesi, ambilSesi: ambilSesi, hapusSesi: hapusSesi, profil: profil };
})();
