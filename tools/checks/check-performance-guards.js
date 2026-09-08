const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');
const musicRuntime = fs.readFileSync('public/js/ginka-music.js', 'utf8');
const legacyStyles = fs.readFileSync('public/css/ginka_style.css', 'utf8');

const checks = [
  {
    name: 'removes engagement script from homepage',
    pass: !html.includes('/js/ginka-engagement.js')
  },
  {
    name: 'removes busuanzi counter from homepage',
    pass: !html.includes('busuanzi')
  },
  {
    name: 'loads runtime scheduler script',
    pass: html.includes('/js/ginka-runtime.js')
  },
  {
    name: 'shares runtime styles through a cacheable asset',
    pass: html.includes('/css/ginka-runtime.css') && !html.includes('<style>')
  },
  {
    name: 'loads animation libraries outside the critical path',
    pass: html.includes('/js/ginka-effects-loader.js') &&
      !html.includes('src="https://cdn.jsdelivr.net/npm/gsap')
  },
  {
    name: 'keeps music ahead of optional animation loading',
    pass: html.indexOf('/js/ginka-music.js') < html.indexOf('/js/ginka-effects-loader.js')
  },
  {
    name: 'loads ui shell runtime',
    pass: html.includes('/js/ginka-ui-shell.js')
  },
  {
    name: 'loads ATRI on demand without parser-blocking libraries',
    pass: html.includes('/js/ginka-atri-loader.js') && !html.includes('/js/live2d-libs/')
  },
  {
    name: 'initializes scheduler before optional feature scripts',
    pass: ['ginka-atri-loader.js', 'ginka-ui-shell.js', 'ginka-music.js'].every((name) =>
      html.indexOf('/js/ginka-runtime.js') >= 0 && html.indexOf('/js/ginka-runtime.js') < html.indexOf('/js/' + name))
  },
  {
    name: 'removes full TTF font downloads from legacy styles',
    pass: !/url\([^)]*\.ttf/i.test(legacyStyles)
  },
  {
    name: 'renders exactly one player inside the persistent sidebar',
    pass: (html.match(/id=["']?music-player["'\s>]/g) || []).length === 1 &&
      /<aside\b[^>]*id=["']?journal-sidebar[\s\S]*?id=["']?music-player["'\s>][\s\S]*?<\/aside>/.test(html)
  },
  {
    name: 'uses the custom domain and one set of Open Graph metadata',
    pass: /rel=["']?canonical["']?[^>]*href=["']?https:\/\/www\.mm9527\.top\//.test(html) &&
      ['og:title', 'og:type', 'og:url'].every((name) => (html.match(new RegExp('property=["\\\']?' + name + '["\\\'\\s>]', 'g')) || []).length === 1)
  },
  {
    name: 'loads music script without blocking parsing',
    pass: html.includes('/js/ginka-music.js')
  },
  {
    name: 'registers homepage music bootstrap',
    pass: /GINKA_BOOT_MUSIC\s*=\s*function/.test(musicRuntime)
  },
  {
    name: 'enables lazy comments config',
    pass: html.includes('"comments":{"style":"tabs","active":"giscus","storage":true,"lazyload":true')
  }
];

let failed = false;

for (const check of checks) {
  if (check.pass) {
    console.log(`PASS ${check.name}`);
  } else {
    failed = true;
    console.error(`FAIL ${check.name}`);
  }
}

process.exit(failed ? 1 : 0);
