const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('public/index.html', 'utf8');
const parts = html.split('<script>');
const scripts = [];
for (let i = 1; i < parts.length; i++) {
  const end = parts[i].indexOf('</script>');
  if (end !== -1) scripts.push(parts[i].slice(0, end));
}

console.log('inline scripts:', scripts.length);

let ok = true;
for (let i = 0; i < scripts.length; i++) {
  try {
    new vm.Script(scripts[i], { filename: `inline_${i}.js` });
  } catch (e) {
    ok = false;
    console.log(`SCRIPT ${i} SYNTAX ${e.message}`);
    console.log(String(e.stack || '').split('\n').slice(0, 5).join('\n'));
  }
}

process.exit(ok ? 0 : 1);
