// Run through Playwright's browser_run_code_unsafe with this file as filename.
// The open page must point to the local preview. Every run uses fresh contexts.
async (page) => {
  const origin = new URL(page.url()).origin;
  const budget = await (await page.request.get(origin + '/reports/performance-budget.json')).json();
  const results = [];
  for (const width of [390, 1440]) {
    const context = await page.context().browser().newContext({
      viewport: { width, height: 1000 }, serviceWorkers: 'block'
    });
    const testPage = await context.newPage();
    const errors = [];
    testPage.on('pageerror', error => errors.push(error.message));
    await testPage.addInitScript(() => {
      window.__audit = { cls: 0, lcp: 0, longTasks: 0 };
      for (const type of ['layout-shift', 'largest-contentful-paint', 'longtask']) {
        try {
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (type === 'layout-shift' && !entry.hadRecentInput) window.__audit.cls += entry.value;
              if (type === 'largest-contentful-paint') window.__audit.lcp = entry.startTime;
              if (type === 'longtask') window.__audit.longTasks += entry.duration;
            }
          }).observe({ type, buffered: true });
        } catch (_) { /* The metric remains unavailable in older browsers. */ }
      }
    });
    try {
      await testPage.goto(origin + '/');
      await testPage.waitForTimeout(budget.observationMs);
      results.push(await testPage.evaluate(() => {
        const resources = performance.getEntriesByType('resource').filter(entry => new URL(entry.name).origin === location.origin);
        return {
          width: innerWidth,
          metrics: window.__audit,
          requests: resources.length,
          bytes: resources.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
          scriptBytes: resources.filter(entry => entry.initiatorType === 'script').reduce((sum, entry) => sum + entry.encodedBodySize, 0),
          resourcePaths: resources.map(entry => new URL(entry.name).pathname),
          navigation: performance.getEntriesByType('navigation').map(entry => ({ dom: entry.domContentLoadedEventEnd, load: entry.loadEventEnd }))
        };
      }));
      results[results.length - 1].errors = errors;
      const result = results[results.length - 1];
      result.checks = {
        payload: result.bytes <= (width < 768 ? budget.mobileMaxBytes : budget.desktopMaxBytes),
        scripts: result.scriptBytes <= budget.maxScriptBytes,
        requests: result.requests <= budget.maxRequests,
        layoutShift: result.metrics.cls <= budget.maxCls,
        deferredFeatures: !result.resourcePaths.some(path => budget.deferredPathPatterns.some(pattern => path.startsWith(pattern))),
        pageErrors: errors.length === 0
      };
    } finally { await context.close(); }
  }
  return { capturedAt: new Date().toISOString(), observationMs: budget.observationMs,
    cache: 'fresh browser context; service worker blocked', passed: results.every(result => Object.values(result.checks).every(Boolean)), results };
}
