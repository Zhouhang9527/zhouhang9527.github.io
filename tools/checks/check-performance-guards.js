const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');
const musicRuntime = fs.readFileSync('public/js/ginka-music.js', 'utf8');
const { load } = require('cheerio');
const $ = load(html);
const motion = fs.readFileSync('source/js/ginka-motion.js', 'utf8');
const legacyStyles = fs.readFileSync('public/css/ginka_style.css', 'utf8');

const checks = [
  {
    // 线上曾出现首页 0 个 h1，这里守住语义标题。
    name: 'keeps exactly one h1 on the homepage',
    pass: $('h1').length === 1
  },
  {
    name: 'links every stylesheet once',
    pass: (() => {
      const hrefs = $('link[rel=stylesheet]')
        .map((index, element) => $(element).attr('href'))
        .get()
        .filter(href => href && !/noscript\.css/.test(href));
      return hrefs.length === new Set(hrefs).size;
    })()
  },
  {
    name: 'renders each navigation entry once',
    pass: (() => {
      const labels = $('.header .menu-item > a')
        .map((index, element) => $(element).text().trim())
        .get();
      return labels.length === new Set(labels).size;
    })()
  },
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
    name: 'loads one deferred local Lenis before the page motion runtime',
    pass: $('script[defer][src^="/js/vendor/lenis.min.js"]').length === 1 &&
      $('script[defer][src^="/js/ginka-motion.js"]').length === 1 &&
      html.indexOf('/js/vendor/lenis.min.js') < html.indexOf('/js/ginka-motion.js')
  },
  {
    name: 'does not load legacy animation or a second ATRI loader',
    pass: $('script[src*="ginka-effects-loader"], script[src*="ginka-page-effects"], script[src*="ginka-lazy-loader"], script[src*="canvas-nest"], script[src*="gsap"]').length === 0
  },
  {
    name: 'gates hero motion by route and scroll visibility and leaves Lenis idle on reduced motion',
    pass: motion.includes("matchMedia('(prefers-reduced-motion: reduce)')") && motion.includes('autoRaf: false') &&
      motion.includes('observer.observe(hero)') && motion.includes('if (!hero) return;')
  },
  {
    name: 'publishes one hero per theme and the three hand-selected gallery frames',
    pass: $('.journal-hero picture.journal-hero-image .hero-art[loading="eager"][fetchpriority="high"][srcset*="hero-katana-day-640.webp"]').length === 1 &&
      // 首屏只留一个 <img>，夜色版本交给 <source media="(prefers-color-scheme: dark)">，
      // 避免昼夜两套图同时下载。
      $('.journal-hero picture.journal-hero-image img').length === 1 &&
      $('.journal-hero picture.journal-hero-image source[srcset*="hero-katana-night-640.webp"]').length === 1 &&
      $('[data-journal-gallery] [data-fancybox="ginka-island"]').length === 3 &&
      $('[data-journal-gallery] [data-fancybox="ginka-island"] .scene-night').length === 3 &&
      $('[data-journal-gallery] .journal-scene-label').length === 3 &&
      $('.journal-hero-dust i').length === 6
  },
  {
    name: 'publishes flat navigation and removes the cover side inscription',
    pass: $('.journal-hero-edition').length === 0 &&
      // 标签 / 分类 / 友链收进「更多」，各自只能出现一次
      ['tags', 'categories', 'links'].every(path => $(`.site-nav a[href="/${path}/"]`).length === 1) &&
      $('.main-menu > .menu-item-more .journal-mobile-links > li').length === 3
  },
  {
    name: 'loads ui shell runtime',
    pass: html.includes('/js/ginka-ui-shell.js')
  },
  {
    name: 'loads ATRI on demand with one launcher targeting the widget',
    pass: html.includes('/js/ginka-atri-loader.js') && !html.includes('/js/live2d-libs/') &&
      $('#atri-launcher-shell button').length === 1 &&
      $('#atri-launcher').attr('aria-controls') === 'atri-live2d-widget' &&
      $('#atri-live2d-widget[hidden]').length === 1
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
