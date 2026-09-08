'use strict';

const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public');
const forbidden = [
  { path: 'images/background.mp4', reason: 'legacy video background' },
  { path: 'images/ginka-static-background.webp', reason: 'removed opening background' },
  { path: 'fonts/LxgwWenKai.ttf', reason: 'full TTF font download' },
  { path: 'fonts/OppoSans.ttf', reason: 'full TTF font download' },
  { path: 'fonts/OppoSans-Bold.ttf', reason: 'full TTF font download' },
  { path: 'live2d/ATRI/ATRI.cmo3', reason: 'Cubism editor source file' },
  { path: 'live2d/ATRI/ATRI.psd', reason: 'layered source artwork' },
  { path: 'live2d/ATRI/ATRI.4096/texture_00.png', reason: 'unused high-resolution texture' }
];

let failed = false;

if (!fs.existsSync(publicDir)) {
  console.error('FAIL public directory does not exist; run a build first');
  process.exit(1);
}

for (const item of forbidden) {
  const file = path.join(publicDir, item.path);
  if (fs.existsSync(file)) {
    failed = true;
    const sizeMiB = fs.statSync(file).size / 1024 / 1024;
    console.error(`FAIL forbidden publish asset: ${item.path} (${sizeMiB.toFixed(2)} MiB, ${item.reason})`);
  } else {
    console.log(`PASS excluded ${item.path}`);
  }
}

const required = [
  'live2d/ATRI/ATRI.model3.json',
  'live2d/ATRI/ATRI.moc3',
  'live2d/ATRI/ATRI.physics3.json',
  'live2d/ATRI/ATRI.cdi3.json',
  'live2d/ATRI/ATRI.2048/texture_00.png',
  'music/s0rrow - unhappy.mp3',
  'music/unhappy.jpg',
  'css/ginka-runtime.css',
  'js/ginka-effects-loader.js',
  'js/ginka-music.js',
  'js/ginka-atri-loader.js'
];

for (const rel of required) {
  const file = path.join(publicDir, rel);
  if (fs.existsSync(file)) {
    console.log(`PASS retained ${rel}`);
  } else {
    failed = true;
    console.error(`FAIL missing runtime asset: ${rel}`);
  }
}

process.exit(failed ? 1 : 0);
