/* The gallery library is loaded only when a reader opens an article image. */
(function () {
  'use strict';
  let pending = null;
  function loadGallery() {
    if (pending) return pending;
    const runtime = window.GINKA_RUNTIME;
    pending = Promise.all([
      runtime.loadStylesheet('/vendor/@fancyapps/ui/5.0.31/dist/fancybox/fancybox.css'),
      runtime.loadScript('/vendor/@fancyapps/ui/5.0.31/dist/fancybox/fancybox.umd.js')
    ]).catch(error => { pending = null; throw error; });
    return pending;
  }
  function prepare() {
    document.querySelectorAll('.post-body :not(a) > img, .post-body > img').forEach(img => {
      const link = document.createElement('a');
      link.className = 'fancybox';
      link.href = img.currentSrc || img.src;
      link.dataset.fancybox = img.closest('.post-gallery') ? 'gallery' : 'default';
      if (img.title || img.alt) link.dataset.caption = img.title || img.alt;
      img.before(link); link.append(img);
    });
  }
  document.addEventListener('click', async event => {
    const link = event.target.closest('a.fancybox');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const path = location.pathname;
    try {
      await loadGallery();
      if (!link.isConnected || path !== location.pathname) return;
      const nodes = [...document.querySelectorAll('a.fancybox')].filter(node => node.dataset.fancybox === link.dataset.fancybox);
      window.Fancybox.fromNodes(nodes, { startIndex: nodes.indexOf(link), triggerEl: link });
    } catch (_) { if (link.isConnected) location.assign(link.href); }
  }, true);
  document.addEventListener('page:loaded', prepare);
  if (document.readyState !== 'loading') prepare();
})();
