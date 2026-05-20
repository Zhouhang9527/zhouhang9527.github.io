'use strict';

hexo.extend.filter.register('before_generate', function() {
  if (!hexo || !hexo.env || hexo.env.cmd !== 'server') {
    return;
  }

  if (String(process.env.GINKA_DEV_MINIFY || '0') === '1') {
    hexo.log.info('[ginka] dev minify override enabled by env');
    return;
  }

  hexo.config.all_minifier = false;

  const sections = ['html_minifier', 'css_minifier', 'js_minifier', 'image_minifier'];
  sections.forEach(section => {
    const cfg = hexo.config[section];
    if (cfg && typeof cfg === 'object') {
      cfg.enable = false;
    }
  });

  hexo.log.info('[ginka] server mode: disabled heavy minify/image optimize for faster startup');
});
