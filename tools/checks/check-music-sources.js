'use strict';

const fs = require('fs');

const config = fs.readFileSync('_config.yml', 'utf8');
const runtime = fs.readFileSync('source/js/ginka-music.js', 'utf8');
const layout = fs.readFileSync('layouts/music.njk', 'utf8');

const checks = [
  ['central online config', /ginka_music:[\s\S]*?online:[\s\S]*?platform: netease[\s\S]*?playlist_id: '5190514967'[\s\S]*?timeout_ms: 8000/.test(config)],
  ['four local fallback tracks', ['hikari-hanate', 'yumeukihashi', 'id: air', 'id: unhappy'].every((id) => config.includes(id))],
  ['single persistent audio markup', (layout.match(/id="bg-music"/g) || []).length === 1],
  ['audio markup has no eager local source', !/<source\s+src=.*?music\//.test(layout)],
  ['source and track identity restore', /music_current_source/.test(runtime) && /music_current_track_id/.test(runtime)],
  ['signed Meting resolver URLs are retained', /secureMetingResource\(value\.url, 'url'\)/.test(runtime) && /resolverUrl: playbackUrl/.test(runtime)],
  ['playlist uses safe text nodes', /title\.textContent = music\.title/.test(runtime) && !/item\.innerHTML =/.test(runtime)],
  ['online requests have abort and timeout', /new AbortController\(\)/.test(runtime) && /controller\.abort\(\)/.test(runtime)],
  ['manual refresh bypasses metadata caches', /_refresh/.test(runtime) && /opt\.force \? 'no-store' : 'default'/.test(runtime)],
  ['online retry and bounded fallback', /onlineRetryForTrack/.test(runtime) && /onlineFailureCount >= 3/.test(runtime)],
  ['autoplay policy is not a media fallback', /error\.name === 'NotAllowedError'/.test(runtime)],
  ['native audio fallback removes CORS before src', /audio\.removeAttribute\('crossorigin'\)[\s\S]*?audio\.src = music\.src/.test(runtime)],
  ['persistent audio is not routed through Web Audio', !/createMediaElementSource\(/.test(runtime)],
  ['online is selected before local fallback', /Online is the default source[\s\S]*?tryOnlinePlaylist\([\s\S]*?if \(!loaded\)[\s\S]*?activateLocalFallback/.test(runtime)],
  ['playlist metadata boots with the page', /Fetch playlist metadata alongside the page[\s\S]*?bootMusic\(\)/.test(runtime)],
  ['icon-only online refresh control', /id="music-source-retry"/.test(layout) && /fa-refresh/.test(layout) && !/music-source-status/.test(layout)]
];

let failed = false;
for (const [name, pass] of checks) {
  console[pass ? 'log' : 'error'](`${pass ? 'PASS' : 'FAIL'} ${name}`);
  failed ||= !pass;
}
process.exit(failed ? 1 : 0);
