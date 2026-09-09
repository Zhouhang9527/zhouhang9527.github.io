'use strict';

const fs = require('node:fs');
const path = require('node:path');

const staticAssets = [
  ['vendor/animejs/3.2.1/lib/anime.min.js', 'animejs/lib/anime.min.js'],
  ['vendor/@next-theme/pjax/0.6.0/pjax.min.js', '@next-theme/pjax/pjax.min.js'],
  [
    'vendor/@fancyapps/ui/5.0.31/dist/fancybox/fancybox.umd.js',
    '@fancyapps/ui/dist/fancybox/fancybox.umd.js'
  ],
  [
    'vendor/@fancyapps/ui/5.0.31/dist/fancybox/fancybox.css',
    '@fancyapps/ui/dist/fancybox/fancybox.css'
  ],
  ['vendor/lozad/1.16.0/dist/lozad.min.js', 'lozad/dist/lozad.min.js'],
  [
    'vendor/hexo-generator-searchdb/1.5.0/dist/search.js',
    'hexo-generator-searchdb/dist/search.js'
  ],
  ['vendor/animate.css/3.1.1/animate.min.css', 'animate.css/animate.min.css'],
  ['vendor/gsap/3.12.5/gsap.min.js', 'gsap/dist/gsap.min.js'],
  ['vendor/gsap/3.12.5/ScrollTrigger.min.js', 'gsap/dist/ScrollTrigger.min.js'],
  [
    'vendor/canvas-nest/1.0.1/canvas-nest.min.js',
    'canvas-nest.js/dist/canvas-nest.min.js'
  ]
];

function resolveAsset(source) {
  try {
    return require.resolve(source);
  } catch (error) {
    throw new Error(`[local-assets] Missing npm asset: ${source}`, { cause: error });
  }
}

function fileRoute(route, sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`[local-assets] Missing file: ${sourcePath}`);
  }
  return {
    path: route,
    data: () => fs.createReadStream(sourcePath)
  };
}

function packageRoute(route, source) {
  return fileRoute(route, resolveAsset(source));
}

function referencedCssRoutes(route, source) {
  const cssPath = resolveAsset(source);
  const css = fs.readFileSync(cssPath, 'utf8');
  const references = [...css.matchAll(/url\((?:['"])?([^)'"?#]+)(?:[?#][^)'\"]*)?/g)]
    .map(match => match[1])
    .filter(reference => !/^(?:data:|https?:|\/)/i.test(reference));
  const uniqueReferences = [...new Set(references)];

  if (!uniqueReferences.length) {
    throw new Error(`[local-assets] No local files referenced by ${source}`);
  }

  return [
    packageRoute(route, source),
    ...uniqueReferences.map(reference => {
      const normalizedReference = reference.replaceAll('\\', '/');
      const outputPath = path.posix.normalize(
        path.posix.join(path.posix.dirname(route), normalizedReference)
      );
      const sourcePath = path.resolve(path.dirname(cssPath), reference);
      return fileRoute(outputPath, sourcePath);
    })
  ];
}

function fontRoutes(name, packageName) {
  return referencedCssRoutes(
    `vendor/fonts/${name}/wght.css`,
    `${packageName}/wght.css`
  );
}

hexo.extend.generator.register('local-vendor-assets', () => [
  ...staticAssets.map(([route, source]) => packageRoute(route, source)),
  ...referencedCssRoutes(
    'vendor/@fortawesome/fontawesome-free/7.0.0/css/all.min.css',
    '@fortawesome/fontawesome-free/css/all.min.css'
  ),
  ...fontRoutes('noto-serif-sc', '@fontsource-variable/noto-serif-sc'),
  ...fontRoutes('jetbrains-mono', '@fontsource-variable/jetbrains-mono')
]);
