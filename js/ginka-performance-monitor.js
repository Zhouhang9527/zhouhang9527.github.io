// ===================================================
// GINKA Blog - 性能监控
// 监控 Core Web Vitals 和关键性能指标
// ===================================================

(function() {
  'use strict';

  const PerformanceMonitor = {
    metrics: {},
    
    /**
     * 监控 First Contentful Paint (FCP)
     */
    measureFCP: function() {
      const perfEntries = performance.getEntriesByType('paint');
      const fcpEntry = perfEntries.find(entry => entry.name === 'first-contentful-paint');
      
      if (fcpEntry) {
        this.metrics.FCP = Math.round(fcpEntry.startTime);
        console.log(`[Performance] FCP: ${this.metrics.FCP}ms`);
        this.reportMetric('FCP', this.metrics.FCP);
      }
    },

    /**
     * 监控 Largest Contentful Paint (LCP)
     */
    measureLCP: function() {
      if (!('PerformanceObserver' in window)) return;

      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.LCP = Math.round(lastEntry.startTime);
          console.log(`[Performance] LCP: ${this.metrics.LCP}ms`);
          this.reportMetric('LCP', this.metrics.LCP);
        });

        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('[Performance] LCP measurement not supported:', e);
      }
    },

    /**
     * 监控 First Input Delay (FID)
     */
    measureFID: function() {
      if (!('PerformanceObserver' in window)) return;

      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.metrics.FID = Math.round(entry.processingStart - entry.startTime);
            console.log(`[Performance] FID: ${this.metrics.FID}ms`);
            this.reportMetric('FID', this.metrics.FID);
          });
        });

        observer.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('[Performance] FID measurement not supported:', e);
      }
    },

    /**
     * 监控 Cumulative Layout Shift (CLS)
     */
    measureCLS: function() {
      if (!('PerformanceObserver' in window)) return;

      let clsScore = 0;
      
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
            }
          });
          
          this.metrics.CLS = Math.round(clsScore * 1000) / 1000;
          console.log(`[Performance] CLS: ${this.metrics.CLS}`);
          this.reportMetric('CLS', this.metrics.CLS);
        });

        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('[Performance] CLS measurement not supported:', e);
      }
    },

    /**
     * 监控页面加载时间
     */
    measurePageLoad: function() {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = performance.timing;
          const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
          const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
          
          this.metrics.PageLoad = pageLoadTime;
          this.metrics.DOMReady = domReadyTime;
          
          console.log(`[Performance] Page Load: ${pageLoadTime}ms`);
          console.log(`[Performance] DOM Ready: ${domReadyTime}ms`);
          
          this.reportMetric('PageLoad', pageLoadTime);
          this.reportMetric('DOMReady', domReadyTime);
          
          // 输出完整报告
          this.generateReport();
        }, 0);
      });
    },

    /**
     * 监控资源加载
     */
    measureResources: function() {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const resources = performance.getEntriesByType('resource');
          
          let totalSize = 0;
          const resourceTypes = {
            script: { count: 0, size: 0 },
            stylesheet: { count: 0, size: 0 },
            img: { count: 0, size: 0 },
            other: { count: 0, size: 0 }
          };

          resources.forEach(resource => {
            const size = resource.transferSize || 0;
            totalSize += size;

            if (resource.initiatorType === 'script' || resource.name.includes('.js')) {
              resourceTypes.script.count++;
              resourceTypes.script.size += size;
            } else if (resource.initiatorType === 'link' || resource.name.includes('.css')) {
              resourceTypes.stylesheet.count++;
              resourceTypes.stylesheet.size += size;
            } else if (resource.initiatorType === 'img' || /\.(jpg|jpeg|png|gif|webp|svg)/.test(resource.name)) {
              resourceTypes.img.count++;
              resourceTypes.img.size += size;
            } else {
              resourceTypes.other.count++;
              resourceTypes.other.size += size;
            }
          });

          console.log('[Performance] Resources:', {
            total: `${Math.round(totalSize / 1024)}KB`,
            scripts: `${resourceTypes.script.count} files, ${Math.round(resourceTypes.script.size / 1024)}KB`,
            stylesheets: `${resourceTypes.stylesheet.count} files, ${Math.round(resourceTypes.stylesheet.size / 1024)}KB`,
            images: `${resourceTypes.img.count} files, ${Math.round(resourceTypes.img.size / 1024)}KB`,
            other: `${resourceTypes.other.count} files, ${Math.round(resourceTypes.other.size / 1024)}KB`
          });

          this.metrics.resources = resourceTypes;
          this.metrics.totalResourceSize = totalSize;
        }, 1000);
      });
    },

    /**
     * 生成性能报告
     */
    generateReport: function() {
      const report = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        metrics: this.metrics,
        evaluations: this.evaluateMetrics()
      };

      console.group('[Performance] Complete Report');
      console.table(this.metrics);
      console.log('Evaluations:', report.evaluations);
      console.groupEnd();

      // 保存到 sessionStorage 供开发者查看
      try {
        sessionStorage.setItem('ginka_performance_report', JSON.stringify(report));
      } catch (e) {
        console.warn('[Performance] Failed to save report:', e);
      }

      return report;
    },

    /**
     * 评估性能指标
     */
    evaluateMetrics: function() {
      const evaluations = {};

      // FCP 评估
      if (this.metrics.FCP) {
        if (this.metrics.FCP < 1800) {
          evaluations.FCP = '✓ Good';
        } else if (this.metrics.FCP < 3000) {
          evaluations.FCP = '⚠ Needs Improvement';
        } else {
          evaluations.FCP = '✗ Poor';
        }
      }

      // LCP 评估
      if (this.metrics.LCP) {
        if (this.metrics.LCP < 2500) {
          evaluations.LCP = '✓ Good';
        } else if (this.metrics.LCP < 4000) {
          evaluations.LCP = '⚠ Needs Improvement';
        } else {
          evaluations.LCP = '✗ Poor';
        }
      }

      // FID 评估
      if (this.metrics.FID !== undefined) {
        if (this.metrics.FID < 100) {
          evaluations.FID = '✓ Good';
        } else if (this.metrics.FID < 300) {
          evaluations.FID = '⚠ Needs Improvement';
        } else {
          evaluations.FID = '✗ Poor';
        }
      }

      // CLS 评估
      if (this.metrics.CLS !== undefined) {
        if (this.metrics.CLS < 0.1) {
          evaluations.CLS = '✓ Good';
        } else if (this.metrics.CLS < 0.25) {
          evaluations.CLS = '⚠ Needs Improvement';
        } else {
          evaluations.CLS = '✗ Poor';
        }
      }

      return evaluations;
    },

    /**
     * 上报指标（可对接百度统计或自定义分析）
     */
    reportMetric: function(name, value) {
      // 如果有百度统计，上报自定义事件
      if (window._hmt) {
        try {
          window._hmt.push(['_trackEvent', 'Performance', name, window.location.pathname, value]);
        } catch (e) {
          console.warn('[Performance] Failed to report to Baidu Analytics:', e);
        }
      }

      // 可以在这里添加其他分析服务的上报逻辑
    },

    /**
     * 初始化性能监控
     */
    init: function() {
      console.log('[Performance] Monitoring started');

      // 监控各项指标
      this.measureFCP();
      this.measureLCP();
      this.measureFID();
      this.measureCLS();
      this.measurePageLoad();
      this.measureResources();

      // 暴露获取报告的方法到控制台
      window.getPerformanceReport = () => this.generateReport();
      
      console.log('[Performance] Run window.getPerformanceReport() to view full report');
    }
  };

  // 页面加载完成后启动监控
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      PerformanceMonitor.init();
    });
  } else {
    PerformanceMonitor.init();
  }

  // 暴露到全局
  window.GinkaPerformanceMonitor = PerformanceMonitor;

})();
