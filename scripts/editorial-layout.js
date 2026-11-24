'use strict';

const fs = require('fs');
const path = require('path');
const sceneMap = require('./ginka-scene-map.json');

function routeKind(page) {
  page = page || {};
  const p = String(page.path || '').replace(/^\/+/, '');
  if (page.tag || page.type === 'tags' || /^tags(?:\/|$)/.test(p)) return 'tags';
  if (page.category || page.type === 'categories' || /^categories(?:\/|$)/.test(p)) return 'categories';
  if (page.type === 'links' || /^links(?:\/|$)/.test(p)) return 'links';
  if (page.source === 'about/index.md' || /^about(?:\/|$)/.test(p)) return 'about';
  if (/^archives(?:\/|$)/.test(p) || page.archive) return 'archive';
  if (!p || p === 'index.html' || /^page\//.test(p)) return 'home';
  return 'post';
}

function ginkaScene(page, slot) {
  const pair = sceneMap.routes[routeKind(page)][slot === 'sidebar' ? 'sidebar' : 'masthead'];
  const width = slot === 'sidebar' ? 640 : routeKind(page) === 'about' ? 1280 : 960;
  // Extra extracted art is only for the opt-in local server, never a production build.
  const preview = hexo.env.cmd === 'server' && process.env.GINKA_LOCAL_SCENES === '1';
  const candidates = preview ? ['local-preview/' + pair[0], pair[1]] : [pair[1]];
  const prefix = 'images/ginka/scenes/';
  const selected = candidates.find(slug => ['day', 'night'].every(mode =>
    fs.existsSync(path.join(hexo.source_dir, prefix + slug + '-' + mode + '-' + width + '.webp'))
  )) || 'panorama';
  const url = mode => hexo.extend.helper.get('url_for').call({ config: hexo.config }, '/' + prefix + selected + '-' + mode + '-' + width + '.webp');
  return {day: url('day'), night: url('night'), kind: routeKind(page), slug: selected};
}
function ginkaDialogueSkin() {
  if (hexo.env.cmd !== 'server' || process.env.GINKA_LOCAL_SCENES !== '1') return null;
  const prefix = 'images/ginka/scenes/local-preview/';
  const need = ['dialogue-frame.webp', 'dialogue-butterfly.webp', 'dialogue-name-line.webp'];
  if (!need.every(name => fs.existsSync(path.join(hexo.source_dir, prefix + name)))) return null;
  const url = name => hexo.extend.helper.get('url_for').call(
    { config: hexo.config }, '/' + prefix + name);
  return {frame: url(need[0]), butterfly: url(need[1]), line: url(need[2])};
}
hexo.extend.helper.register('ginka_dialogue_skin', ginkaDialogueSkin);
hexo.extend.helper.register('ginka_scene', ginkaScene);
hexo.extend.filter.register('template_locals', function (locals) {
  locals.ginka_scene = ginkaScene;
  locals.ginka_dialogue_skin = ginkaDialogueSkin;
  return locals;
});

// Keep the custom homepage in the project, outside the NexT submodule.
hexo.extend.filter.register('before_generate', function () {
  // Hexo 8 watch() skips the relation-index initialization performed by load().
  // Refresh it before generators read cached tag/category locals in preview mode.
  if (hexo.env.cmd === 'server' && hexo._binaryRelationIndex) {
    hexo._binaryRelationIndex.post_tag.load();
    hexo._binaryRelationIndex.post_category.load();
    hexo.locals.invalidate();
  }
  const views = {
    '_partials/post-like.njk': 'post-feedback.njk',
    '_partials/post-views.njk': 'post-views.njk',
    '_layout.njk': '_layout.njk',
    '_partials/header/menu.njk': 'header-menu.njk',
    'index.njk': 'home.njk',
    'archive.njk': 'collection.njk',
    'tag.njk': 'collection.njk',
    'category.njk': 'collection.njk',
    'page.njk': 'page.njk',
    'post.njk': 'post.njk',
    'journal-sidebar.njk': 'sidebar.njk',
    'journal-music.njk': 'music.njk'
  };
  for (const [view, file] of Object.entries(views)) {
    hexo.theme.setView(view, fs.readFileSync(path.join(hexo.base_dir, 'layouts', file), 'utf8'));
  }
});
