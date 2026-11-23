/**
 * Kenko Lab — campaign attribution + ad pixels
 * Captures UTMs / click IDs, persists 90 days, fires Meta / GA4 / Google Ads / TikTok.
 */
(function () {
  'use strict';

  var CFG = Object.assign(
    {
      currency: 'JPY',
      contentName: 'Kenko Lab Spicy Cubes',
      contentIds: ['spicy-cubes'],
      metaPixelId: '',
      ga4Id: '',
      googleAdsId: '',
      googleAdsPurchaseLabel: '',
      googleAdsCheckoutLabel: '',
      tiktokPixelId: '',
      debug: false
    },
    window.KENKO_TRACKING || {}
  );

  var STORAGE_KEY = 'kenko_attr_v1';
  var ATTR_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'utm_id',
    'gclid',
    'gbraid',
    'wbraid',
    'fbclid',
    'ttclid',
    'msclkid',
    'li_fat_id',
    'ref'
  ];

  var PACK_VALUE = {
    subM: 2990,
    RLZx: 3527,
    fOkv: 5047,
    hQS1: 9220
  };

  function log() {
    if (!CFG.debug) return;
    try {
      console.log.apply(console, ['[KenkoTrack]'].concat([].slice.call(arguments)));
    } catch (e) {}
  }

  function now() {
    return Date.now();
  }

  function readStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.attrs) return null;
      if (parsed.expires && parsed.expires < now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeStore(attrs, firstTouch) {
    try {
      var prev = readStore();
      var payload = {
        attrs: attrs,
        firstTouch: firstTouch || (prev && prev.firstTouch) || attrs,
        updatedAt: now(),
        expires: now() + 90 * 24 * 60 * 60 * 1000
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return payload;
    } catch (e) {
      return { attrs: attrs, firstTouch: firstTouch || attrs };
    }
  }

  function qs() {
    try {
      return new URLSearchParams(window.location.search || '');
    } catch (e) {
      return new URLSearchParams();
    }
  }

  function captureFromUrl() {
    var params = qs();
    var found = {};
    var hit = false;
    for (var i = 0; i < ATTR_KEYS.length; i++) {
      var k = ATTR_KEYS[i];
      var v = params.get(k);
      if (v && String(v).trim()) {
        found[k] = String(v).trim().slice(0, 200);
        hit = true;
      }
    }
    if (!hit) return readStore();

    var prev = readStore();
    var first = (prev && prev.firstTouch) || found;
    // last-touch for campaign attrs when new UTMs arrive
    var merged = Object.assign({}, (prev && prev.attrs) || {}, found);
    return writeStore(merged, first);
  }

  function getAttrs() {
    var store = readStore() || captureFromUrl();
    return (store && store.attrs) || {};
  }

  function getFirstTouch() {
    var store = readStore();
    return (store && store.firstTouch) || getAttrs();
  }

  function appendAttribution(url) {
    try {
      var u = new URL(url, window.location.origin);
      var attrs = getAttrs();
      Object.keys(attrs).forEach(function (k) {
        if (!u.searchParams.has(k)) u.searchParams.set(k, attrs[k]);
      });
      // Shopify order note attributes via cart permalink
      Object.keys(attrs).forEach(function (k) {
        u.searchParams.set('attributes[' + k + ']', attrs[k]);
      });
      u.searchParams.set('attributes[landing]', 'kenko-lab');
      u.searchParams.set('attributes[landing_host]', window.location.hostname || '');
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  function packValue(packId) {
    return PACK_VALUE[packId] || PACK_VALUE.RLZx || 0;
  }

  function productPayload(packId, extra) {
    var value = packValue(packId);
    return Object.assign(
      {
        content_name: CFG.contentName,
        content_ids: CFG.contentIds,
        content_type: 'product',
        content_category: 'supplements',
        currency: CFG.currency,
        value: value,
        num_items: 1,
        pack_id: packId || ''
      },
      extra || {}
    );
  }

  /* ---------- Pixel loaders ---------- */

  function loadMeta(id) {
    if (!id || window.fbq) return;
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', id);
    fbq('track', 'PageView');
    log('Meta Pixel init', id);
  }

  function loadGtag() {
    var ga4 = CFG.ga4Id;
    var ads = CFG.googleAdsId;
    if (!ga4 && !ads) return;
    if (!window.dataLayer) window.dataLayer = [];
    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4 || ads);
      document.head.appendChild(s);
      gtag('js', new Date());
    }
    if (ga4) {
      gtag('config', ga4, { send_page_view: true, currency: CFG.currency });
      log('GA4 init', ga4);
    }
    if (ads) {
      gtag('config', ads);
      log('Google Ads init', ads);
    }
  }

  function loadTikTok(id) {
    if (!id || window.ttq) return;
    !(function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = (w[t] = w[t] || []);
      ttq.methods = [
        'page',
        'track',
        'identify',
        'instances',
        'debug',
        'on',
        'off',
        'once',
        'ready',
        'alias',
        'group',
        'enableCookie',
        'disableCookie'
      ];
      ttq.setAndDefer = function (t, e) {
        t[e] = function () {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) {
        var e = ttq._i[t] || [];
        for (var n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
        return e;
      };
      ttq.load = function (e, n) {
        var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = i;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        var o = d.createElement('script');
        o.type = 'text/javascript';
        o.async = true;
        o.src = i + '?sdkid=' + e + '&lib=' + t;
        var a = d.getElementsByTagName('script')[0];
        a.parentNode.insertBefore(o, a);
      };
      ttq.load(id);
      ttq.page();
    })(window, document, 'ttq');
    log('TikTok Pixel init', id);
  }

  /* ---------- Events ---------- */

  function trackMeta(eventName, params, eventId) {
    if (!CFG.metaPixelId || typeof window.fbq !== 'function') return;
    try {
      if (eventId) fbq('track', eventName, params || {}, { eventID: eventId });
      else fbq('track', eventName, params || {});
    } catch (e) {}
  }

  function trackGa4(eventName, params) {
    if (typeof window.gtag !== 'function') return;
    try {
      gtag('event', eventName, params || {});
    } catch (e) {}
  }

  function trackGoogleAds(sendTo) {
    if (!sendTo || typeof window.gtag !== 'function') return;
    try {
      gtag('event', 'conversion', { send_to: sendTo });
    } catch (e) {}
  }

  function trackTikTok(eventName, params) {
    if (!CFG.tiktokPixelId || !window.ttq || typeof window.ttq.track !== 'function') return;
    try {
      window.ttq.track(eventName, params || {});
    } catch (e) {}
  }

  function eventId(prefix) {
    return (
      prefix +
      '_' +
      now().toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 10)
    );
  }

  function viewContent(packId) {
    var p = productPayload(packId);
    var eid = eventId('vc');
    trackMeta('ViewContent', p, eid);
    trackGa4('view_item', {
      currency: p.currency,
      value: p.value,
      items: [{ item_id: p.content_ids[0], item_name: p.content_name, price: p.value, quantity: 1 }]
    });
    trackTikTok('ViewContent', {
      content_type: 'product',
      content_id: p.content_ids[0],
      content_name: p.content_name,
      currency: p.currency,
      value: p.value
    });
    log('ViewContent', p);
  }

  function addToCart(packId) {
    var p = productPayload(packId);
    var eid = eventId('atc');
    trackMeta('AddToCart', p, eid);
    trackGa4('add_to_cart', {
      currency: p.currency,
      value: p.value,
      items: [{ item_id: p.content_ids[0], item_name: p.content_name, price: p.value, quantity: 1 }]
    });
    trackTikTok('AddToCart', {
      content_type: 'product',
      content_id: p.content_ids[0],
      content_name: p.content_name,
      currency: p.currency,
      value: p.value
    });
    log('AddToCart', p);
  }

  function initiateCheckout(packId) {
    var p = productPayload(packId);
    var eid = eventId('ic');
    trackMeta('InitiateCheckout', p, eid);
    trackGa4('begin_checkout', {
      currency: p.currency,
      value: p.value,
      items: [{ item_id: p.content_ids[0], item_name: p.content_name, price: p.value, quantity: 1 }]
    });
    if (CFG.googleAdsId && CFG.googleAdsCheckoutLabel) {
      trackGoogleAds(CFG.googleAdsId + '/' + CFG.googleAdsCheckoutLabel);
    }
    trackTikTok('InitiateCheckout', {
      content_type: 'product',
      content_id: p.content_ids[0],
      content_name: p.content_name,
      currency: p.currency,
      value: p.value
    });
    log('InitiateCheckout', p);
    return eid;
  }

  function lead() {
    trackMeta('Lead', { content_name: CFG.contentName });
    trackGa4('generate_lead', { currency: CFG.currency });
    trackTikTok('SubmitForm', { content_name: CFG.contentName });
  }

  /* ---------- Boot ---------- */

  function boot() {
    captureFromUrl();
    loadMeta(CFG.metaPixelId);
    loadGtag();
    loadTikTok(CFG.tiktokPixelId);

    // Product LP → ViewContent once per session path
    try {
      var vcKey = 'kenko_vc_' + (window.location.pathname || '/');
      if (!sessionStorage.getItem(vcKey)) {
        sessionStorage.setItem(vcKey, '1');
        setTimeout(function () {
          viewContent((window.SpicyCheckout && window.SpicyCheckout.selectedPackId && window.SpicyCheckout.selectedPackId()) || 'subM');
        }, 800);
      }
    } catch (e) {
      viewContent('subM');
    }

    log('attrs', getAttrs());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.KenkoTrack = {
    getAttrs: getAttrs,
    getFirstTouch: getFirstTouch,
    appendAttribution: appendAttribution,
    viewContent: viewContent,
    addToCart: addToCart,
    initiateCheckout: initiateCheckout,
    lead: lead,
    packValue: packValue,
    config: CFG
  };
})();
