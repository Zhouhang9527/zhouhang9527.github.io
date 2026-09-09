'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const config = read('_config.next.yml');
const head = read('source/_data/head.njk');
const effects = read('source/js/ginka-effects-loader.js');
const shell = read('source/js/ginka-ui-shell.js');

assert.equal(packageJson.dependencies['@next-theme/plugins'], '8.25.0');
assert.equal(packageJson.dependencies.gsap, '3.12.5');
assert.equal(packageJson.dependencies['canvas-nest.js'], '1.0.1');
assert.equal(packageJson.dependencies['@fontsource-variable/noto-serif-sc'], '5.3.0');
assert.equal(packageJson.dependencies['@fontsource-variable/jetbrains-mono'], '5.3.0');
assert.match(config, /vendors:\s*[\s\S]*?plugins:\s*local/);
assert.doesNotMatch(config, /host:\s*https:\/\/fonts\./);
assert.doesNotMatch(head, /cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.loli\.net/);
assert.match(head, /\/vendor\/fonts\/noto-serif-sc\/wght\.css/);
assert.match(head, /\/vendor\/fonts\/jetbrains-mono\/wght\.css/);
assert.doesNotMatch(effects, /cdn\.jsdelivr\.net/);
assert.match(effects, /\/vendor\/gsap\/3\.12\.5\//);
assert.doesNotMatch(shell, /cdn\.jsdelivr\.net\/npm\/canvas-nest/);
assert.match(shell, /\/vendor\/canvas-nest\/1\.0\.1\/canvas-nest\.min\.js/);

const publicIndex = path.join(root, 'public', 'index.html');
if (fs.existsSync(publicIndex)) {
  const html = fs.readFileSync(publicIndex, 'utf8');
  assert.doesNotMatch(
    html,
    /(?:src|href)=["'][^"']*(?:cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.loli\.net)/
  );
}

console.log('PASS local asset regression checks');
