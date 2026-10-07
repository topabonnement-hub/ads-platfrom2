/**
 * AdPlatform - Universal Self-Hosted Ad Embed Tag (adslot.js)
 * Lightweight, high-performance, privacy-focused ad delivery and viewability tracking.
 * Compatible with WordPress (WP Kads shortcodes), React, Vue, HTML5, and static sites.
 * License: MIT
 */
(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.__AdPlatform_Loaded) return;
  window.__AdPlatform_Loaded = true;

  // Determine current script host
  var scriptTag = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('adslot.js') !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  var defaultEndpoint = '';
  if (scriptTag && scriptTag.src) {
    var parser = document.createElement('a');
    parser.href = scriptTag.src;
    defaultEndpoint = parser.protocol + '//' + parser.host;
  } else {
    defaultEndpoint = window.location.origin;
  }

  var scriptPlatformKey = scriptTag ? (scriptTag.getAttribute('data-platform-key') || scriptTag.getAttribute('data-public-key')) : null;

  var renderedSlots = new WeakSet();
  var observedSlots = new WeakSet();

  /**
   * Safe JSON fetch utility
   */
  function fetchAd(slotKey, siteKey, callback) {
    var host = window.__AdPlatform_Host || defaultEndpoint;
    var url = host + '/api/v1/slot/' + encodeURIComponent(slotKey);
    if (siteKey || scriptPlatformKey) {
      url += '?siteKey=' + encodeURIComponent(siteKey || scriptPlatformKey);
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          callback(null, data);
        } catch (e) {
          callback(e);
        }
      } else {
        callback(new Error('HTTP status ' + xhr.status));
      }
    };
    xhr.onerror = function() {
      callback(new Error('Network error fetching ad slot'));
    };
    xhr.send();
  }

  /**
   * Track Impression via Beacon or XHR
   */
  function trackImpression(slotId, siteId) {
    var host = window.__AdPlatform_Host || defaultEndpoint;
    var url = host + '/api/v1/track/impression';
    var payload = JSON.stringify({
      slotId: slotId,
      siteId: siteId,
      timestamp: new Date().toISOString(),
      referer: window.location.href,
    });

    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(payload);
    }
  }

  /**
   * Track Click
   */
  function trackClick(slotId, siteId, targetUrl) {
    var host = window.__AdPlatform_Host || defaultEndpoint;
    var url = host + '/api/v1/track/click';
    var payload = JSON.stringify({
      slotId: slotId,
      siteId: siteId,
      targetUrl: targetUrl,
      referer: window.location.href,
    });

    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(payload);
    }
  }

  /**
   * Load Google AdSense library only once if needed
   */
  var adsenseLoaded = false;
  function ensureAdsenseLoaded(clientId) {
    if (adsenseLoaded || window.adsbygoogle) {
      adsenseLoaded = true;
      return;
    }
    adsenseLoaded = true;
    var script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(clientId);
    document.head.appendChild(script);
  }

  /**
   * Setup Viewability & Impression Observer (IAB 50% visibility rule)
   */
  function setupImpressionObserver(element, slotId, siteId) {
    if (observedSlots.has(element)) return;
    observedSlots.add(element);

    if ('IntersectionObserver' in window) {
      var timer = null;
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Visible for at least 500ms
            if (!timer) {
              timer = setTimeout(function() {
                trackImpression(slotId, siteId);
                observer.unobserve(element);
                observer.disconnect();
              }, 500);
            }
          } else {
            if (timer) {
              clearTimeout(timer);
              timer = null;
            }
          }
        });
      }, { threshold: [0, 0.5, 1.0] });

      observer.observe(element);
    } else {
      // Fallback: immediate tracking
      setTimeout(function() {
        trackImpression(slotId, siteId);
      }, 1000);
    }
  }

  /**
   * Safely execute scripts inside injected HTML
   */
  function executeScriptsInContainer(container) {
    var scripts = container.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var oldScript = scripts[i];
      var newScript = document.createElement('script');
      for (var j = 0; j < oldScript.attributes.length; j++) {
        var attr = oldScript.attributes[j];
        newScript.setAttribute(attr.name, attr.value);
      }
      newScript.textContent = oldScript.textContent;
      if (oldScript.parentNode) {
        oldScript.parentNode.replaceChild(newScript, oldScript);
      }
    }
  }

  /**
   * Render single ad slot
   */
  function processSlotElement(el) {
    if (renderedSlots.has(el)) return;

    var slotKey = el.getAttribute('data-ad-slot') || el.getAttribute('data-wp-kads') || el.getAttribute('data-slot-id');
    var siteKey = el.getAttribute('data-ad-platform') || el.getAttribute('data-platform-key') || scriptPlatformKey;

    if (!slotKey) return;

    renderedSlots.add(el);

    // Apply baseline style
    el.classList.add('adplatform-rendered');

    fetchAd(slotKey, siteKey, function(err, response) {
      if (err || !response || !response.slot) {
        return;
      }

      var slot = response.slot;
      if (!slot.isActive) return;

      var type = slot.type;
      var config = slot.config || {};

      if (type === 'adsense') {
        var clientId = config.adsenseClientId || '';
        var slotId = config.adsenseSlotId || '';
        var format = config.adsenseFormat || 'auto';
        var responsive = config.responsive !== false;

        ensureAdsenseLoaded(clientId);

        var ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.setAttribute('data-ad-client', clientId);
        ins.setAttribute('data-ad-slot', slotId);
        ins.setAttribute('data-ad-format', format);
        if (responsive) {
          ins.setAttribute('data-full-width-responsive', 'true');
        }

        el.innerHTML = '';
        el.appendChild(ins);

        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
          // AdSense queue error
        }

        setupImpressionObserver(el, slot.id, slot.siteId);
      } else if (type === 'html') {
        var htmlContent = config.htmlContent || '';
        el.innerHTML = htmlContent;

        // Attach click listener for links
        el.addEventListener('click', function(e) {
          var target = e.target;
          var anchor = target.closest ? target.closest('a') : null;
          if (anchor) {
            trackClick(slot.id, slot.siteId, anchor.href);
          }
        });

        executeScriptsInContainer(el);
        setupImpressionObserver(el, slot.id, slot.siteId);
      } else if (type === 'custom_js') {
        var jsCode = config.jsCode || '';
        if (jsCode) {
          try {
            window.__ad_target_el = el;
            var script = document.createElement('script');
            script.textContent = jsCode;
            el.appendChild(script);
          } catch (e) {
            console.error('[AdPlatform] Custom JS Error:', e);
          }
        }
        setupImpressionObserver(el, slot.id, slot.siteId);
      }
    });
  }

  /**
   * Scan entire page for ad slot elements
   */
  function scanAndRender() {
    var selectors = [
      '[data-ad-slot]',
      '[data-wp-kads]',
      '.adplatform-slot',
      '[data-adplatform-id]'
    ];
    var elements = document.querySelectorAll(selectors.join(','));
    for (var i = 0; i < elements.length; i++) {
      processSlotElement(elements[i]);
    }
  }

  // Initial scan when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndRender);
  } else {
    scanAndRender();
  }

  // MutationObserver for dynamic page frameworks (React, Next.js, Vue, Infinite scroll, etc.)
  if ('MutationObserver' in window) {
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var addedNodes = mutations[i].addedNodes;
        for (var j = 0; j < addedNodes.length; j++) {
          var node = addedNodes[j];
          if (node.nodeType === 1) { // ELEMENT_NODE
            if (node.hasAttribute && (node.hasAttribute('data-ad-slot') || node.hasAttribute('data-wp-kads') || node.classList.contains('adplatform-slot'))) {
              processSlotElement(node);
            }
            if (node.querySelectorAll) {
              var nested = node.querySelectorAll('[data-ad-slot], [data-wp-kads], .adplatform-slot');
              for (var k = 0; k < nested.length; k++) {
                processSlotElement(nested[k]);
              }
            }
          }
        }
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }

  // Public API helper on window
  window.AdPlatform = {
    scan: scanAndRender,
    renderSlot: processSlotElement,
    version: '1.0.0'
  };
})();
