'use strict';

const { execSync } = require('child_process');

// 构建版本：优先用 git 短哈希，退化为时间戳。写进 <meta name="ginka-build">，
// 同时生成 /site-version.json，供前端做「有新版本」提示与缓存校验。
hexo.extend.filter.register('before_generate', function () {
  let commit = '';
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: hexo.base_dir, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch (error) {
    commit = '';
  }
  hexo.config.ginka_build_id = commit || `t${Date.now()}`;
});

hexo.extend.generator.register('site-version', function (locals) {
  const data = {
    version: hexo.config.ginka_build_id,
    generatedAt: new Date().toISOString()
  };
  return {
    path: 'site-version.json',
    data: JSON.stringify(data)
  };
});
