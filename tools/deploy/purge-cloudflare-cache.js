'use strict';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const BLOG_HOSTS = ['mm9527.top', 'www.mm9527.top'];

const purgeBlogCache = async ({
  env = process.env,
  fetchImpl = globalThis.fetch,
  logger = console
} = {}) => {
  const token = String(env.CLOUDFLARE_API_TOKEN || '').trim();
  const zoneId = String(env.CLOUDFLARE_ZONE_ID || '').trim();

  if (!token || !zoneId) {
    logger.warn(
      '[warning] Skipped Cloudflare cache purge: set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID.'
    );
    return { purged: false, skipped: true };
  }

  try {
    const response = await fetchImpl(
      `${API_BASE}/zones/${encodeURIComponent(zoneId)}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hosts: BLOG_HOSTS })
      }
    );

    let payload = null;
    try {
      payload = await response.json();
    } catch {}

    if (!response.ok || payload?.success !== true) {
      logger.warn(
        `[warning] Cloudflare cache purge failed with HTTP ${response.status}; the GitHub Pages deployment was kept.`
      );
      return { purged: false, skipped: false };
    }

    logger.log(`[cloudflare] Purged cache for ${BLOG_HOSTS.join(', ')}.`);
    return { purged: true, skipped: false };
  } catch {
    logger.warn(
      '[warning] Cloudflare cache purge failed due to a network error; the GitHub Pages deployment was kept.'
    );
    return { purged: false, skipped: false };
  }
};

if (require.main === module) {
  purgeBlogCache().catch(() => {
    console.warn(
      '[warning] Cloudflare cache purge ended unexpectedly; the GitHub Pages deployment was kept.'
    );
  });
}

module.exports = { BLOG_HOSTS, purgeBlogCache };
