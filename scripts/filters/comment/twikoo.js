/* global hexo */

'use strict';

const path = require('path');

// Add comment
hexo.extend.filter.register('theme_inject', injects => {
  const config = hexo.theme.config;

  if (!config.twikoo || !config.twikoo.enable) return;

  injects.comment.raw('twikoo', '<div class="comments twikoo-container"></div>', {}, { cache: true });

  injects.bodyEnd.file('twikoo', path.join(hexo.theme_dir, 'layout/_third-party/comments/twikoo.njk'));

});
