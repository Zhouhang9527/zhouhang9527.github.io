/* Accurate, local-only diagnostics. The official SDK owns metric calculation. */
(function () {
  'use strict';
  if (window.GinkaPerformanceMonitor) return;
  const documentUrl = location.href;
  const measurements = {};
  const metrics = {};
  const navigations = [];
  let navigationStart = null;
  let pending = null;
  const round = value => Math.round(value * 1000) / 1000;
  function record(metric) {
    metrics[metric.name] = round(metric.value);
    measurements[metric.name] = {
      value: round(metric.value), rating: metric.rating, id: metric.id,
      navigationType: metric.navigationType, url: metric.navigationURL || documentUrl
    };
    if (document.hidden) generateReport();
  }
  function resources() {
    const entries = performance.getEntriesByType('resource');
    return { requests: entries.length, transferredBytes: entries.reduce((sum, entry) => sum + entry.transferSize, 0),
      encodedBytes: entries.reduce((sum, entry) => sum + entry.encodedBodySize, 0) };
  }
  function generateReport() {
    const report = { timestamp: new Date().toISOString(), url: documentUrl,
      navigationScope: 'document', metrics: { ...metrics }, measurements: { ...measurements },
      resources: resources(), navigations: navigations.map(entry => ({ ...entry })) };
    try { sessionStorage.setItem('ginka_performance_report', JSON.stringify(report)); } catch (_) {}
    return report;
  }
  const api = {
    state: 'idle', metrics, generateReport,
    evaluateMetrics: () => Object.fromEntries(Object.entries(measurements).map(([name, value]) => [name, value.rating])),
    start() {
      if (pending) return pending;
      api.state = 'loading';
      pending = window.GINKA_RUNTIME.loadScript('/vendor/web-vitals/6.2.3/web-vitals.iife.js').then(() => {
        for (const name of ['CLS', 'INP', 'LCP', 'FCP', 'TTFB']) window.webVitals['on' + name](record, { reportAllChanges: true });
        api.state = 'ready';
      }).catch(() => { api.state = 'error'; pending = null; });
      return pending;
    }
  };
  window.GinkaPerformanceMonitor = api;
  window.getPerformanceReport = generateReport;
  document.addEventListener('pjax:send', () => { navigationStart = performance.now(); });
  document.addEventListener('pjax:complete', () => {
    if (navigationStart === null) return;
    navigations.push({ url: location.href, duration: round(performance.now() - navigationStart), type: 'pjax' });
    navigationStart = null;
    if (navigations.length > 30) navigations.shift();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) generateReport(); });
  window.addEventListener('pagehide', generateReport);
  window.GINKA_RUNTIME.scheduleBackgroundTask('web-vitals', () => api.start(), { timeout: 2000 });
})();
