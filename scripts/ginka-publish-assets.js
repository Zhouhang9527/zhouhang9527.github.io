'use strict';

const path = require('path');

const excludedRoutes = new Set([
  'images/background.mp4',
  'images/ginka-static-background.webp',
  'fonts/LxgwWenKai.ttf',
  'fonts/OppoSans.ttf',
  'fonts/OppoSans-Bold.ttf',
  'live2d/ATRI/ATRI.cmo3',
  'live2d/ATRI/ATRI.psd',
  'live2d/ATRI/ATRI.4096/texture_00.png'
]);

function normalizeRoute(route) {
  return String(route || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

hexo.extend.filter.register('after_generate', function() {
  const removed = [];

  for (const route of hexo.route.list()) {
    const normalized = normalizeRoute(route);
    if (!excludedRoutes.has(normalized)) continue;
    hexo.route.remove(route);
    removed.push(normalized);
  }

  if (removed.length) {
    hexo.log.info(`[ginka] excluded publish-only assets: ${removed.join(', ')}`);
  }
});

