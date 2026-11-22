/* ================= Pembaca .xlsx tanpa pustaka luar (jaringan kantor memblokir CDN, §4.1) =================
 * File .xlsx = zip berisi XML. Zip dibaca manual, isi dideflate dengan DecompressionStream bawaan browser,
 * lalu XML dibaca dengan DOMParser. Hasil: [{nama, aoa}] (baris pertama = header). Angka tetap angka (tanggal = nomor seri Excel).
 */
const XLSXR = (function () {
  const td = new TextDecoder();
  async function inflate(u8) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Browser ini belum bisa membaca file Excel. Pakai Chrome atau Edge versi terbaru.');
    const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  function daftarZip(buf) {
    const dv = new DataView(buf), n = buf.byteLength;
    let eocd = -1;
    for (let i = n - 22; i >= Math.max(0, n - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('File ini bukan .xlsx. Simpan ulang dari Excel sebagai "Excel Workbook (.xlsx)".');
    const jumlah = dv.getUint16(eocd + 10, true), out = {};
    let p = dv.getUint32(eocd + 16, true);
    for (let k = 0; k < jumlah; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Isi file .xlsx rusak.');
      const metode = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      out[td.decode(new Uint8Array(buf, p + 46, nlen))] = { metode, csize, off };
      p += 46 + nlen + xlen + clen;
    }
    return out;
  }
  async function bacaEntri(buf, e) {
    if (!e) return null;
    const dv = new DataView(buf), nlen = dv.getUint16(e.off + 26, true), xlen = dv.getUint16(e.off + 28, true);
    const data = new Uint8Array(buf, e.off + 30 + nlen + xlen, e.csize);
    if (e.metode === 0) return td.decode(data);
    if (e.metode === 8) return td.decode(await inflate(data));
    throw new Error('Kompresi file .xlsx tidak didukung.');
  }
  const xml = s => new DOMParser().parseFromString(s, 'application/xml');
  const tag = (el, n) => [...el.getElementsByTagNameNS('*', n)];
  function kolom(ref) { const m = /^([A-Z]+)/.exec(ref || ''); if (!m) return -1; let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; }
  function teks(si) { return tag(si, 't').map(t => t.textContent).join(''); }

  async function baca(arrayBuffer) {
    const z = daftarZip(arrayBuffer);
    const wb = xml(await bacaEntri(arrayBuffer, z['xl/workbook.xml']) || '<x/>');
    const rels = xml(await bacaEntri(arrayBuffer, z['xl/_rels/workbook.xml.rels']) || '<x/>'), target = {};
    tag(rels, 'Relationship').forEach(r => { let t = r.getAttribute('Target') || ''; t = t.replace(/^\//, ''); target[r.getAttribute('Id')] = t.indexOf('xl/') === 0 ? t : 'xl/' + t; });
    const ssTxt = await bacaEntri(arrayBuffer, z['xl/sharedStrings.xml']), shared = ssTxt ? tag(xml(ssTxt), 'si').map(teks) : [];
    const out = [];
    for (const sh of tag(wb, 'sheet')) {
      const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      const path = target[rid]; if (!path || !z[path]) continue;
      const doc = xml(await bacaEntri(arrayBuffer, z[path])), aoa = [];
      tag(doc, 'row').forEach(row => {
        const ri = Number(row.getAttribute('r')) - 1, arr = [];
        tag(row, 'c').forEach((c, idx) => {
          const ci = c.getAttribute('r') ? kolom(c.getAttribute('r')) : idx, t = c.getAttribute('t') || 'n', v = tag(c, 'v')[0];
          let val = '';
          if (t === 's') val = v ? (shared[Number(v.textContent)] || '') : '';
          else if (t === 'inlineStr') val = tag(c, 'is').map(teks).join('');
          else if (t === 'str' || t === 'e') val = v ? v.textContent : '';
          else if (t === 'b') val = v ? v.textContent === '1' : '';
          else val = v && v.textContent !== '' ? Number(v.textContent) : '';
          arr[ci] = val;
        });
        for (let i = 0; i < arr.length; i++) if (arr[i] === undefined) arr[i] = '';
        aoa[isFinite(ri) && ri >= 0 ? ri : aoa.length] = arr;
      });
      for (let i = 0; i < aoa.length; i++) if (!aoa[i]) aoa[i] = [];
      out.push({ nama: sh.getAttribute('name'), aoa });
    }
    return out;
  }
  return { baca };
})();
