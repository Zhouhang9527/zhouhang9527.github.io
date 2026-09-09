'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const config = read('_config.next.yml');
const head = read('source/_data/head.njk');
const debugPage = read('source/debug-test.html');
const effects = read('source/js/ginka-effects-loader.js');
const shell = read('source/js/ginka-ui-shell.js');

for (const [name, version] of Object.entries({
  '@fancyapps/ui': '5.0.31',
  '@fontsource-variable/jetbrains-mono': '5.3.0',
  '@fontsource-variable/noto-serif-sc': '5.3.0',
  '@fortawesome/fontawesome-free': '7.0.0',
  '@next-theme/pjax': '0.6.0',
  'animate.css': '3.1.1',
  animejs: '3.2.1',
  'canvas-nest.js': '1.0.1',
  gsap: '3.12.5',
  lozad: '1.16.0'
})) assert.equal(packageJson.dependencies[name], version, `${name} must be pinned`);

const generator = read('scripts/local-vendor-assets.js');
for (const expected of [
  'animejs/lib/anime.min.js',
  '@next-theme/pjax/pjax.min.js',
  '@fancyapps/ui/dist/fancybox/fancybox.umd.js',
  '@fortawesome/fontawesome-free/css/all.min.css',
  'lozad/dist/lozad.min.js',
  'hexo-generator-searchdb/dist/search.js',
  'animate.css/animate.min.css',
  'gsap/dist/gsap.min.js',
  'gsap/dist/ScrollTrigger.min.js',
  'canvas-nest.js/dist/canvas-nest.min.js'
]) assert.ok(generator.includes(expected), `missing generator asset: ${expected}`);

const registrations = new Map();
global.hexo = {
  extend: {
    generator: {
      register(name, createRoutes) {
        registrations.set(name, createRoutes);
      }
    }
  }
};
require(path.join(root, 'scripts', 'local-vendor-assets.js'));
delete global.hexo;

assert.ok(registrations.has('local-vendor-assets'));
const routes = registrations.get('local-vendor-assets')();
const routePaths = new Set(routes.map(route => route.path));
for (const expected of [
  'vendor/animejs/3.2.1/lib/anime.min.js',
  'vendor/@next-theme/pjax/0.6.0/pjax.min.js',
  'vendor/@fancyapps/ui/5.0.31/dist/fancybox/fancybox.umd.js',
  'vendor/@fancyapps/ui/5.0.31/dist/fancybox/fancybox.css',
  'vendor/@fortawesome/fontawesome-free/7.0.0/css/all.min.css',
  'vendor/@fortawesome/fontawesome-free/7.0.0/webfonts/fa-solid-900.woff2',
  'vendor/lozad/1.16.0/dist/lozad.min.js',
  'vendor/hexo-generator-searchdb/1.5.0/dist/search.js',
  'vendor/animate.css/3.1.1/animate.min.css',
  'vendor/gsap/3.12.5/gsap.min.js',
  'vendor/gsap/3.12.5/ScrollTrigger.min.js',
  'vendor/canvas-nest/1.0.1/canvas-nest.min.js',
  'vendor/fonts/noto-serif-sc/wght.css',
  'vendor/fonts/jetbrains-mono/wght.css'
]) assert.ok(routePaths.has(expected), `missing generated route: ${expected}`);
assert.ok(
  [...routePaths].some(route => /^vendor\/fonts\/noto-serif-sc\/files\/.+\.woff2$/.test(route)),
  'Noto Serif SC WOFF2 routes must be generated'
);
assert.ok(
  [...routePaths].some(route => /^vendor\/fonts\/jetbrains-mono\/files\/.+\.woff2$/.test(route)),
  'JetBrains Mono WOFF2 routes must be generated'
);

assert.match(config, /vendors:\s*[\s\S]*?plugins:\s*custom/);
assert.match(config, /custom_cdn_url:\s*["']?\/vendor\/\$\{npm_name\}\/\$\{version\}\/\$\{minified\}/);
assert.doesNotMatch(config, /host:\s*https:\/\/fonts\./);
assert.match(config, /font:\s*[\s\S]*?host:\s*https:\/\/www\.mm9527\.top/);
assert.doesNotMatch(head, /cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.loli\.net/);
assert.doesNotMatch(head, /\burl_for\s*\(/);
assert.match(head, /\/vendor\/fonts\/noto-serif-sc\/wght\.css/);
assert.match(head, /\/vendor\/fonts\/jetbrains-mono\/wght\.css/);
assert.doesNotMatch(debugPage, /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/);
assert.match(debugPage, /\/vendor\/@fortawesome\/fontawesome-free\/7\.0\.0\/css\/all\.min\.css/);
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
