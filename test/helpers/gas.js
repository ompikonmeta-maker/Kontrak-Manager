// Memuat file .gs ke sandbox Node dengan tiruan layanan Apps Script yang dipakai.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadGs(relPath, overrides = {}) {
  const calls = [];
  const htmlOutput = {
    content: null, title: null, meta: [],
    setTitle(t) { this.title = t; return this; },
    addMetaTag(n, c) { this.meta.push([n, c]); return this; },
  };
  const ctx = {
    ScriptApp: { AuthMode: { FULL: 'FULL' }, requireAllScopes(m) { calls.push({ requireAllScopes: m }); } },
    HtmlService: { createHtmlOutput(html) { htmlOutput.content = html; return htmlOutput; } },
    Session: {
      getScriptTimeZone: () => 'Asia/Jakarta',
      getEffectiveUser: () => ({ getEmail: () => 'ff.unit@gmail.com' }),
    },
    Utilities: { formatDate: (d, tz, fmt) => `formatted(${tz},${fmt})` },
    UrlFetchApp: {
      fetch(url, opts) { calls.push({ url, opts }); return { getResponseCode: () => 302 }; },
    },
    ...overrides,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', relPath), 'utf8'), ctx);
  return { ctx, htmlOutput, calls };
}

module.exports = { loadGs };
