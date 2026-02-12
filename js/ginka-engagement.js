(function () {
  'use strict';

  const REQUEST_TIMEOUT_MS = 4500;
  const STAT_CACHE_TTL_MS = 2 * 60 * 1000;

  const meta = document.querySelector('meta[name="ginka-api-base"]');
  const apiBase = meta && typeof meta.content === 'string'
    ? meta.content.trim().replace(/\/+$/, '')
    : '';

  if (!apiBase) return;

  function normalizePath(raw) {
    const value = (raw || '/').replace(/\/+$/, '');
    return value || '/';
  }

  function getPageConfig() {
    try {
      const node = document.querySelector('.next-config[data-name="page"]');
      if (!node) return {};
      return JSON.parse(node.textContent || '{}');
    } catch (_error) {
      return {};
    }
  }

  function statCacheKey(pathname) {
    return `ginka:stat:${normalizePath(pathname)}`;
  }

  function toStatSnapshot(raw, fallbackPath) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      ok: true,
      path: normalizePath(raw.path || fallbackPath || '/'),
      views: Number(raw.views) || 0,
      likes: Number(raw.likes) || 0,
      updatedAt: raw.updatedAt || null
    };
  }

  function readCachedStat(pathname) {
    try {
      const raw = sessionStorage.getItem(statCacheKey(pathname));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.data || !parsed.time) return null;
      if (Date.now() - Number(parsed.time) > STAT_CACHE_TTL_MS) {
        sessionStorage.removeItem(statCacheKey(pathname));
        return null;
      }
      return toStatSnapshot(parsed.data, pathname);
    } catch (_error) {
      return null;
    }
  }

  function writeCachedStat(pathname, stat) {
    const snapshot = toStatSnapshot(stat, pathname);
    if (!snapshot) return;
    try {
      sessionStorage.setItem(statCacheKey(pathname), JSON.stringify({
        time: Date.now(),
        data: snapshot
      }));
    } catch (_error) {
      // keep silent
    }
  }

  async function callApi(path, options) {
    const controller = new AbortController();
    const timeoutMs = Math.max(800, Number(options && options.timeoutMs) || REQUEST_TIMEOUT_MS);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(`${apiBase}${path}`, {
        method: (options && options.method) || 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        body: options && options.body ? JSON.stringify(options.body) : undefined,
        credentials: 'omit',
        signal: controller.signal
      });
    } catch (error) {
      if (error && error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout');
        timeoutError.code = 'ETIMEDOUT';
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function renderStatPair(stats, viewNode, likeNode) {
    if (!stats) return;
    viewNode.textContent = `👀 ${Number(stats.views) || 0}`;
    likeNode.textContent = `👍 ${Number(stats.likes) || 0}`;
  }

  async function bindPostDetail(pathname) {
    const postBody = document.querySelector('.post-body');
    if (!postBody) return;

    const mountTarget = document.querySelector('.post-meta-container') || document.querySelector('.post-meta') || document.querySelector('.post-header');
    if (!mountTarget) return;
    if (mountTarget.querySelector('.ginka-engagement--detail')) return;

    const panel = document.createElement('div');
    panel.className = 'ginka-engagement ginka-engagement--detail';
    panel.innerHTML = [
      '<span class="ginka-engagement-title">阅读数据</span>',
      '<span class="ginka-stat" data-role="views" title="阅读量">👀 --</span>',
      '<button class="ginka-like-btn" type="button" title="点赞">👍 --</button>'
    ].join('');

    mountTarget.insertAdjacentElement('beforeend', panel);

    const viewsNode = panel.querySelector('[data-role="views"]');
    const likeButton = panel.querySelector('.ginka-like-btn');
    let likeCooldownTimer = 0;
    let likeCooldownUntil = 0;
    const cachedStat = readCachedStat(pathname);
    if (cachedStat) {
      renderStatPair(cachedStat, viewsNode, likeButton);
    }

    function inLikeCooldown() {
      return Date.now() < likeCooldownUntil;
    }

    function clearLikeCooldown() {
      likeCooldownUntil = 0;
      if (likeCooldownTimer) {
        clearInterval(likeCooldownTimer);
        likeCooldownTimer = 0;
      }
    }

    function startLikeCooldown(retryAfterMs) {
      const cooldownMs = Math.max(1000, Number(retryAfterMs) || 3000);
      likeCooldownUntil = Date.now() + cooldownMs;
      if (likeCooldownTimer) {
        clearInterval(likeCooldownTimer);
      }

      const tick = () => {
        const remain = Math.ceil((likeCooldownUntil - Date.now()) / 1000);
        if (remain <= 0) {
          clearLikeCooldown();
          likeButton.disabled = false;
          refreshStats();
          return;
        }
        likeButton.disabled = true;
        likeButton.textContent = `👍 ${remain}s`;
      };

      tick();
      likeCooldownTimer = setInterval(tick, 1000);
    }

    async function refreshStats() {
      try {
        const data = await callApi(`/api/post-stats?path=${encodeURIComponent(pathname)}`);
        if (data && data.ok) {
          renderStatPair(data, viewsNode, likeButton);
          writeCachedStat(pathname, data);
          if (!inLikeCooldown()) likeButton.disabled = false;
        }
      } catch (_error) {
        panel.classList.add('is-offline');
      }
    }

    async function reportViewOnce() {
      const sessionKey = `ginka:viewed:${pathname}`;
      if (sessionStorage.getItem(sessionKey)) return;

      try {
        const data = await callApi('/api/post-view', {
          method: 'POST',
          body: { path: pathname }
        });
        if (data && data.ok) {
          writeCachedStat(pathname, data);
        }
        sessionStorage.setItem(sessionKey, '1');
      } catch (_error) {
        // keep silent
      }
    }

    likeButton.addEventListener('click', async function () {
      if (inLikeCooldown()) return;
      likeButton.disabled = true;
      try {
        const data = await callApi('/api/post-like', {
          method: 'POST',
          body: { path: pathname, delta: 1 }
        });
        if (data && data.ok) {
          renderStatPair(data, viewsNode, likeButton);
          writeCachedStat(pathname, data);
        }
      } catch (error) {
        if (error && Number(error.status) === 429) {
          const retryAfterMs = Number(error.payload && error.payload.retryAfterMs) || 3000;
          startLikeCooldown(retryAfterMs);
        } else {
          panel.classList.add('is-offline');
        }
      } finally {
        if (!inLikeCooldown()) {
          likeButton.disabled = false;
        }
      }
    });

    reportViewOnce().finally(refreshStats);
  }

  async function bindHomeCards() {
    const cards = Array.from(document.querySelectorAll('.post-block'));
    if (!cards.length) return;

    const entries = [];

    for (const card of cards) {
      const link = card.querySelector('.post-title-link');
      const mount = card.querySelector('.post-meta-container') || card.querySelector('.post-meta');
      if (!link || !mount) continue;
      if (mount.querySelector('.ginka-engagement--card')) continue;

      let postPath = '/';
      try {
        postPath = normalizePath(new URL(link.getAttribute('href') || '/', window.location.origin).pathname);
      } catch (_error) {
        continue;
      }

      const panel = document.createElement('div');
      panel.className = 'ginka-engagement ginka-engagement--card';
      panel.innerHTML = [
        '<span class="ginka-stat" data-role="views" title="阅读量">👀 --</span>',
        '<span class="ginka-like-static" data-role="likes" title="点赞">👍 --</span>'
      ].join('');
      mount.insertAdjacentElement('beforeend', panel);

      entries.push({
        path: postPath,
        panel,
        viewNode: panel.querySelector('[data-role="views"]'),
        likeNode: panel.querySelector('[data-role="likes"]')
      });
    }

    if (!entries.length) return;

    const uniquePaths = Array.from(new Set(entries.map(item => item.path)));
    const statMap = {};

    for (const path of uniquePaths) {
      const cached = readCachedStat(path);
      if (cached) {
        statMap[path] = cached;
      }
    }

    const pendingPaths = uniquePaths.filter(path => !statMap[path]);

    if (pendingPaths.length) {
      try {
        const batch = await callApi('/api/post-stats/batch', {
          method: 'POST',
          body: { paths: pendingPaths }
        });
        if (batch && batch.ok && batch.stats && typeof batch.stats === 'object') {
          for (const [path, data] of Object.entries(batch.stats)) {
            const normalizedPath = normalizePath(path);
            statMap[normalizedPath] = toStatSnapshot(data, normalizedPath);
            writeCachedStat(normalizedPath, data);
          }
        }
      } catch (_error) {
        // fallback below
      }
    }

    const fallbackPaths = pendingPaths.filter(path => !statMap[path]);
    if (fallbackPaths.length) {
      const tasks = fallbackPaths.map(async path => {
        const single = await callApi(`/api/post-stats?path=${encodeURIComponent(path)}`);
        if (single && single.ok) {
          statMap[path] = single;
          writeCachedStat(path, single);
        }
      });

      const results = await Promise.allSettled(tasks);
      for (const result of results) {
        if (result.status === 'rejected') {
          // keep silent
        }
      }
    }

    for (const item of entries) {
      const stats = statMap[item.path];
      if (!stats) {
        item.panel.classList.add('is-offline');
        continue;
      }
      renderStatPair(stats, item.viewNode, item.likeNode);
    }
  }

  const page = getPageConfig();
  const pathname = normalizePath(window.location && window.location.pathname ? window.location.pathname : '/');

  if (page.isHome) {
    bindHomeCards();
    return;
  }

  if (page.isPost) {
    bindPostDetail(pathname);
    return;
  }

  bindPostDetail(pathname);
})();
