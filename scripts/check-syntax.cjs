const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'live2d-libs') return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? files(full) : /\.(?:js|cjs)$/.test(entry.name) ? [full] : [];
  });
}
const sources = [...files(path.join(root, 'js')), ...files(path.join(root, 'scripts')), path.join(root, 'sw.js')];
for (const file of sources) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`${sources.length} JavaScript files passed syntax checks.`);
