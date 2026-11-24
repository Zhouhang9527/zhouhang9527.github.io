const fs = require('fs');
const path = require('path');
const vm = require('vm');

const publicDir = 'public';
const htmlFiles = [];

function collectHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectHtmlFiles(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      htmlFiles.push(fullPath);
    }
  }
}

function getScriptType(attrs) {
  const match = attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)["']?/i);
  return match ? String(match[1]).toLowerCase() : '';
}

function isJavascriptType(type) {
  return !type || type === 'module' || type.includes('javascript') || type.includes('ecmascript');
}

collectHtmlFiles(publicDir);

const inlineScriptRe = /<script\b(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
let ok = true;
let totalInlineScripts = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  let match;
  let index = 0;

  while ((match = inlineScriptRe.exec(html)) !== null) {
    const attrs = match[1] || '';
    const body = match[2] || '';
    const type = getScriptType(attrs);
    if (isJavascriptType(type) && body.trim()) {
      const label = `${file}#inline_${index}`;

      totalInlineScripts += 1;
      ok = false;
      console.log(`INLINE ${label}${type ? ` [type=${type}]` : ''}`);

      try {
        new vm.Script(body, { filename: label });
      } catch (e) {
        console.log(`SYNTAX ${label} ${e.message}`);
        console.log(String(e.stack || '').split('\n').slice(0, 5).join('\n'));
      }
    }

    index += 1;
  }
}

console.log('html files checked:', htmlFiles.length);
console.log('inline scripts:', totalInlineScripts);

process.exit(ok ? 0 : 1);
