/* global NexT, CONFIG, Pjax */

const pjax = new Pjax({
  selectors: [
    'head title',
    // Metadata counts can differ between pages (for example an article may have
    // several og:image tags). syncHeadAfterPjax updates those nodes separately.
    // Precede .main-inner to prevent placeholder TOC changes asap
    '.post-toc-wrap',
    '.main-inner',
    '.languages',
    '.pjax'
  ],
  switches: {
    '.post-toc-wrap'(oldWrap, newWrap) {
      if (newWrap.querySelector('.post-toc')) {
        Pjax.switches.outerHTML.call(this, oldWrap, newWrap);
      } else {
        const curTOC = oldWrap.querySelector('.post-toc');
        if (curTOC) {
          curTOC.classList.add('placeholder-toc');
        }
        this.onSwitch();
      }
    }
  },
  analytics: false,
  cacheBust: false,
  scrollTo : !CONFIG.bookmark.enable
});

const managedHeadSelectors = [
  'meta[name="description"]',
  'link[rel="canonical"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
  'script[type="application/ld+json"][data-ginka-page-meta]'
];

function getHeadKey(node) {
  const tagName = node.tagName.toLowerCase();
  if (tagName === 'meta') {
    return `meta:${node.getAttribute('property') || node.getAttribute('name') || ''}`;
  }
  if (tagName === 'link') {
    return `link:${node.getAttribute('rel') || ''}`;
  }
  if (tagName === 'script') {
    return `script:${node.getAttribute('type') || ''}:${node.getAttribute('data-ginka-page-meta') !== null ? 'page-meta' : ''}`;
  }
  return tagName;
}

function syncManagedHead(newHead) {
  if (!newHead) return;

  const currentNodes = managedHeadSelectors.flatMap(selector => Array.from(document.head.querySelectorAll(selector)));
  const nextNodes = managedHeadSelectors.flatMap(selector => Array.from(newHead.querySelectorAll(selector)));
  const nextBuckets = new Map();

  nextNodes.forEach(node => {
    const key = getHeadKey(node);
    if (!nextBuckets.has(key)) nextBuckets.set(key, []);
    nextBuckets.get(key).push(node);
  });

  currentNodes.forEach(node => {
    const key = getHeadKey(node);
    const bucket = nextBuckets.get(key);
    if (bucket && bucket.length) {
      node.replaceWith(bucket.shift().cloneNode(true));
      return;
    }
    node.remove();
  });

  for (const bucket of nextBuckets.values()) {
    bucket.forEach(node => {
      document.head.appendChild(node.cloneNode(true));
    });
  }
}

function getPjaxResponseText(event) {
  const detail = event && event.detail;
  if (!detail) return '';
  if (typeof detail.responseText === 'string') return detail.responseText;
  if (detail.request && typeof detail.request.responseText === 'string') return detail.request.responseText;
  if (detail.response && typeof detail.response.text === 'function') return '';
  return '';
}

async function syncHeadAfterPjax(event) {
  let html = getPjaxResponseText(event);
  if (!html) {
    try {
      const response = await fetch(window.location.href, {
        credentials: 'same-origin',
        cache: 'force-cache',
        headers: { 'X-GINKA-Head-Sync': '1' }
      });
      if (response.ok) html = await response.text();
    } catch (error) {
      console.warn('[GINKA PJAX] Unable to fetch page head:', error);
    }
  }

  if (!html) return;
  try {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    syncManagedHead(parsed.head);
  } catch (error) {
    console.warn('[GINKA PJAX] Unable to sync page metadata:', error);
  }
}

document.addEventListener('pjax:success', event => {
  syncHeadAfterPjax(event);
  pjax.executeScripts(document.querySelectorAll('script[data-pjax]'));
  NexT.boot.refresh();
  // Define Motion Sequence & Bootstrap Motion.
  if (CONFIG.motion.enable) {
    NexT.motion.integrator
      .init()
      .add(NexT.motion.middleWares.subMenu)
      // Add sidebar-post-related transition.
      .add(NexT.motion.middleWares.sidebar)
      .add(NexT.motion.middleWares.postList)
      .bootstrap();
  }
  if (CONFIG.sidebar.display !== 'remove') {
    const hasTOC = document.querySelector('.post-toc:not(.placeholder-toc)');
    document.querySelector('.sidebar-inner').classList.toggle('sidebar-nav-active', hasTOC);
    NexT.utils.activateSidebarPanel(hasTOC ? 0 : 1);
    NexT.utils.updateSidebarPosition();
  }
});

if (!window.pjax) window.pjax = pjax;
