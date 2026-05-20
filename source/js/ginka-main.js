// ===================================================
// GINKA Blog Custom Scripts
// ===================================================

(function() {
  'use strict';

  // ---------------------------------------------------------------
  // Utility Functions
  // ---------------------------------------------------------------
  const Utils = {
    // Debounce function
    debounce: function(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // Throttle function
    throttle: function(func, limit) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    // Get scroll position
    getScrollTop: function() {
      return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    },

    // Smooth scroll to element
    smoothScrollTo: function(target, duration = 800) {
      const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
      if (!targetElement) return;

      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      let startTime = null;

      function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
      }

      function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
      }

      requestAnimationFrame(animation);
    }
  };

  // ---------------------------------------------------------------
  // Reading Progress Bar
  // ---------------------------------------------------------------
  const ReadingProgress = {
    init: function() {
      const progressBar = document.querySelector('.reading-progress-bar');
      if (!progressBar) return;

      const updateProgress = Utils.throttle(function() {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = Utils.getScrollTop();
        const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
        progressBar.style.width = Math.min(progress, 100) + '%';
      }, 100);

      window.addEventListener('scroll', updateProgress);
      updateProgress();
    }
  };

  // ---------------------------------------------------------------
  // Code Block Enhancements
  // ---------------------------------------------------------------
  const CodeBlockEnhancer = {
    init: function() {
      this.addCopyButtons();
      this.addLanguageLabels();
    },

    addCopyButtons: function() {
      const codeBlocks = document.querySelectorAll('pre code');
      codeBlocks.forEach(function(codeBlock) {
        const pre = codeBlock.parentElement;
        if (pre.querySelector('.copy-btn')) return; // Already has button

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-btn';
        copyButton.textContent = '复制';
        copyButton.setAttribute('aria-label', '复制代码');

        copyButton.addEventListener('click', function() {
          const code = codeBlock.textContent;
          navigator.clipboard.writeText(code).then(function() {
            copyButton.textContent = '已复制!';
            copyButton.classList.add('copied');
            setTimeout(function() {
              copyButton.textContent = '复制';
              copyButton.classList.remove('copied');
            }, 2000);
          }).catch(function(err) {
            console.error('复制失败:', err);
            copyButton.textContent = '失败';
          });
        });

        pre.style.position = 'relative';
        pre.appendChild(copyButton);
      });
    },

    addLanguageLabels: function() {
      const codeBlocks = document.querySelectorAll('pre code[class*="language-"]');
      codeBlocks.forEach(function(codeBlock) {
        const className = codeBlock.className;
        const match = className.match(/language-(\w+)/);
        if (!match) return;

        const language = match[1];
        const pre = codeBlock.parentElement;
        
        if (pre.querySelector('.code-language')) return; // Already has label

        const langLabel = document.createElement('span');
        langLabel.className = 'code-language';
        langLabel.textContent = language.toUpperCase();
        pre.insertBefore(langLabel, pre.firstChild);
      });
    }
  };

  // ---------------------------------------------------------------
  // External Links Handler
  // ---------------------------------------------------------------
  const ExternalLinks = {
    init: function() {
      const links = document.querySelectorAll('a[href^="http"]');
      links.forEach(function(link) {
        if (link.hostname !== window.location.hostname) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
          link.classList.add('external-link');
        }
      });
    }
  };

  // ---------------------------------------------------------------
  // Image Lazy Loading & Lightbox
  // ---------------------------------------------------------------
  const ImageHandler = {
    init: function() {
      this.lazyLoad();
      this.addLightbox();
    },

    lazyLoad: function() {
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver(function(entries, observer) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              const img = entry.target;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
              }
            }
          });
        });

        const lazyImages = document.querySelectorAll('img.lazy');
        lazyImages.forEach(function(img) {
          imageObserver.observe(img);
        });
      }
    },

    addLightbox: function() {
      const postImages = document.querySelectorAll('.post-body img');
      postImages.forEach(function(img) {
        if (!img.parentElement.classList.contains('lightbox-wrapper')) {
          img.style.cursor = 'zoom-in';
          img.addEventListener('click', function() {
            ImageHandler.openLightbox(this);
          });
        }
      });
    },

    openLightbox: function(img) {
      const lightbox = document.createElement('div');
      lightbox.className = 'image-lightbox';
      lightbox.innerHTML = `
        <div class="lightbox-content">
          <img src="${img.src}" alt="${img.alt || ''}">
          <button class="lightbox-close" aria-label="关闭">&times;</button>
        </div>
      `;

      document.body.appendChild(lightbox);
      document.body.style.overflow = 'hidden';

      setTimeout(() => lightbox.classList.add('active'), 10);

      const closeBtn = lightbox.querySelector('.lightbox-close');
      const closeLightbox = () => {
        lightbox.classList.remove('active');
        setTimeout(() => {
          document.body.removeChild(lightbox);
          document.body.style.overflow = '';
        }, 300);
      };

      closeBtn.addEventListener('click', closeLightbox);
      lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) closeLightbox();
      });
    }
  };

  // ---------------------------------------------------------------
  // Back to Top Button
  // ---------------------------------------------------------------
  const BackToTop = {
    init: function() {
      const button = document.querySelector('.back-to-top');
      if (!button) return;

      const toggleButton = Utils.throttle(function() {
        if (Utils.getScrollTop() > 300) {
          button.classList.add('visible');
        } else {
          button.classList.remove('visible');
        }
      }, 100);

      window.addEventListener('scroll', toggleButton);
      
      button.addEventListener('click', function(e) {
        e.preventDefault();
        Utils.smoothScrollTo(document.body);
      });
    }
  };

  // ---------------------------------------------------------------
  // TOC (Table of Contents) Active State
  // ---------------------------------------------------------------
  const TOCHighlight = {
    init: function() {
      const tocLinks = document.querySelectorAll('.toc-link');
      if (tocLinks.length === 0) return;

      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .filter(h => h.id);

      const updateActiveLink = Utils.throttle(function() {
        const scrollTop = Utils.getScrollTop();
        let activeHeading = null;

        for (let i = headings.length - 1; i >= 0; i--) {
          const heading = headings[i];
          if (heading.offsetTop <= scrollTop + 100) {
            activeHeading = heading;
            break;
          }
        }

        tocLinks.forEach(link => link.classList.remove('active'));
        
        if (activeHeading) {
          const activeLink = document.querySelector(`.toc-link[href="#${activeHeading.id}"]`);
          if (activeLink) activeLink.classList.add('active');
        }
      }, 100);

      window.addEventListener('scroll', updateActiveLink);
      updateActiveLink();
    }
  };

  // ---------------------------------------------------------------
  // Search Enhancement
  // ---------------------------------------------------------------
  const SearchEnhancer = {
    init: function() {
      const searchInput = document.querySelector('.search-input');
      if (!searchInput) return;

      searchInput.addEventListener('input', Utils.debounce(function(e) {
        const query = e.target.value.trim();
        if (query.length >= 2) {
          SearchEnhancer.highlightResults(query);
        }
      }, 300));
    },

    highlightResults: function(query) {
      // Implementation depends on your search plugin
      console.log('Searching for:', query);
    }
  };

  // ---------------------------------------------------------------
  // Performance Monitor (Development Only)
  // ---------------------------------------------------------------
  const PerformanceMonitor = {
    init: function() {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.addEventListener('load', function() {
          const perfData = window.performance.timing;
          const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
          console.log('📊 Page Load Time:', pageLoadTime + 'ms');
        });
      }
    }
  };

  // ---------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAll);
    } else {
      initAll();
    }
  }

  function initAll() {
    ReadingProgress.init();
    CodeBlockEnhancer.init();
    ExternalLinks.init();
    ImageHandler.init();
    BackToTop.init();
    TOCHighlight.init();
    SearchEnhancer.init();
    PerformanceMonitor.init();
    
    console.log('✨ GINKA Blog scripts initialized');
  }

  // Start initialization
  init();

  // Expose utilities globally (optional)
  window.GINKA = {
    Utils: Utils,
    version: '2.0.0'
  };

})();
