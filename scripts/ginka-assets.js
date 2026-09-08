'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const cache = new Map();

function resolveSourcePath(hexo, assetPath) {
  const cleanPath = String(assetPath || '').replace(/^\/+/, '');
  const candidates = [
    path.join(hexo.source_dir, cleanPath),
    path.join(hexo.theme_dir, 'source', cleanPath)
  ];
  return candidates.find(file => fs.existsSync(file) && fs.statSync(file).isFile()) || null;
}

function digestFile(file) {
  const stat = fs.statSync(file);
  const key = `${file}:${stat.size}:${stat.mtimeMs}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
  cache.set(key, hash);
  return hash;
}

function ginkaAsset(assetPath) {
  const cleanPath = String(assetPath || '').replace(/^\/+/, '');
  const baseUrl = hexo.extend.helper.get('url_for').call({ config: hexo.config }, '/' + cleanPath);
  const file = resolveSourcePath(hexo, cleanPath);
  if (!file) return baseUrl;
  return `${baseUrl}?v=${digestFile(file)}`;
}

hexo.extend.helper.register('ginka_asset', ginkaAsset);

hexo.extend.filter.register('template_locals', function(locals) {
  locals.ginka_asset = ginkaAsset;
  return locals;
});
