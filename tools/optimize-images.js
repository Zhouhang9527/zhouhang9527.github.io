'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = process.cwd();
const cacheDir = path.join(root, '.tmp_run', 'image-cache');
const manifestPath = path.join(cacheDir, 'manifest.json');
const imageRoots = [
  path.join(root, 'source', 'images'),
  path.join(root, 'source', '_posts'),
  path.join(root, 'themes', 'next', 'source', 'images'),
  path.join(root, 'themes', 'next', 'source', 'live2d', 'ATRI', 'ATRI.2048')
];
const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico']);
const toolVersion = 'ginka-image-cache-v1';

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (_error) {
    return {};
  }
}

function writeManifest(data) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2) + '\n');
}

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listImages(full);
    if (!entry.isFile()) return [];
    return extensions.has(path.extname(entry.name).toLowerCase()) ? [full] : [];
  });
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const manifest = readManifest();
const nextManifest = {};
let changed = 0;
let unchanged = 0;

for (const file of imageRoots.flatMap(listImages)) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const stat = fs.statSync(file);
  const key = crypto
    .createHash('sha256')
    .update(`${toolVersion}\0${rel}\0${stat.size}\0${hashFile(file)}`)
    .digest('hex');

  nextManifest[rel] = { key, size: stat.size, toolVersion };
  if (manifest[rel] && manifest[rel].key === key) {
    unchanged += 1;
    continue;
  }
  changed += 1;
}

writeManifest(nextManifest);

console.log(`Image cache scan complete: ${changed} changed, ${unchanged} unchanged.`);
console.log('No lossy rewrite was performed; this cache gates explicit image optimization work and keeps originals intact.');

