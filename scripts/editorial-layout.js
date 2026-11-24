'use strict';

const fs = require('fs');
const path = require('path');

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
