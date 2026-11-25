import {comparePublicationDates, postTimestamps} from './post-dates.mjs';

const xml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const uri = route => '/' + route.split('/').map(encodeURIComponent).join('/');

/** Render in memory: no filesystem access, asset staging or build-time clock. */
export function renderAtomFeed(posts, site) {
  if (!posts.length) throw new Error('Cannot generate Atom feed without dated posts');
  const ordered = [...posts].sort((a, b) => comparePublicationDates(a.date, b.date) || a.route.localeCompare(b.route));
  const entries = ordered.map(post => ({post, ...postTimestamps(post)}));
  // An older article can be updated after the newest article was published.
  const latest = entries.reduce((a, b) => Date.parse(a.modified) >= Date.parse(b.modified) ? a : b).modified;
  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<feed xmlns="http://www.w3.org/2005/Atom"><title>GINKA</title><id>' + xml(site + '/') +
    '</id><link href="' + xml(site + '/atom.xml') + '" rel="self"/><updated>' + latest +
    '</updated><author><name>mm9527</name></author><generator uri="https://astro.build/">Astro</generator>' +
    entries.map(({post, published, modified}) => '<entry><title>' + xml(post.title) + '</title><id>' +
      xml(site + uri(post.route)) + '</id><link href="' + xml(site + uri(post.route)) + '"/><published>' +
      published + '</published><updated>' + modified + '</updated><summary>' + xml(post.description) +
      '</summary></entry>').join('') + '</feed>';
}
