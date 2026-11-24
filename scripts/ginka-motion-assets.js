'use strict';
const fs = require('fs');
const path = require('path');

function effects() {
  if (hexo.env.cmd !== 'server' || process.env.GINKA_LOCAL_SCENES !== '1') return null;
  const prefix = 'images/ginka/scenes/local-preview/';
  const names = ['hero-streak.webp', 'hero-glint.webp', 'hero-bokeh.webp'];
  if (!names.every(name => fs.existsSync(path.join(hexo.source_dir, prefix + name)))) return null;
  const url = name => hexo.extend.helper.get('url_for').call({ config: hexo.config }, '/' + prefix + name);
  return {streak: url(names[0]), glint: url(names[1]), bokeh: url(names[2])};
}
hexo.extend.helper.register('ginka_hero_effects', effects);
hexo.extend.filter.register('template_locals', locals => {
  locals.ginka_hero_effects = effects;
  return locals;
});
