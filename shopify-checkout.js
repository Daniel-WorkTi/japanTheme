/**
 * Spicy Cubes — Vercel landing → Shopify Checkout only
 * Cart permalink: https://{shop}/cart/{variantId}:{qty}
 * Preserves campaign attribution via KenkoTrack.
 */
(function () {
  'use strict';

  var CFG = window.SPICY_CHECKOUT || {
    shop: 'https://www.aunox.store',
    packs: {
      subM: { variantId: '59391495864694', qty: 1, sellingPlanId: '692534870382', label: '定期購入', value: 2990 },
      RLZx: { variantId: '59391495864694', qty: 1, label: '1袋', value: 3527 },
      fOkv: { variantId: '59391495897462', qty: 1, label: '2袋セット', value: 5047 },
      hQS1: { variantId: '59391495930230', qty: 1, label: '5袋セット', value: 9220 }
    },
    defaultPack: 'subM'
  };

  function selectedPackId() {
    var selected =
      document.querySelector('.kaching-bundles__bar.is-selected[data-deal-bar-id]') ||
      document.querySelector('.kaching-bundles__bar--selected[data-deal-bar-id]') ||
      document.querySelector('.kaching-bundles__bar[aria-checked="true"][data-deal-bar-id]') ||
      document.querySelector('.kb-mirror__clone .kaching-bundles__bar.is-selected');
    if (selected) {
      var id = selected.getAttribute('data-deal-bar-id');
      if (id && CFG.packs[id]) return id;
    }
    var checked = document.querySelector(
      '.kaching-bundles__bar input[type="radio"]:checked, .kaching-bundles input[type="radio"]:checked'
    );
    if (checked) {
      var bar = checked.closest('[data-deal-bar-id]');
      if (bar) {
        var bid = bar.getAttribute('data-deal-bar-id');
        if (bid && CFG.packs[bid]) return bid;
      }
    }
    return CFG.defaultPack;
  }

  function checkoutUrl(packId) {
    var pack = CFG.packs[packId] || CFG.packs[CFG.defaultPack];
    var base = String(CFG.shop).replace(/\/$/, '');
    var url = base + '/cart/' + pack.variantId + ':' + (pack.qty || 1);
    var params = [
      'locale=ja',
      'country=JP',
      'currency=JPY'
    ];
    if (pack.sellingPlanId) params.push('selling_plan=' + encodeURIComponent(pack.sellingPlanId));
    url += '?' + params.join('&');
    if (window.KenkoTrack && typeof window.KenkoTrack.appendAttribution === 'function') {
      url = window.KenkoTrack.appendAttribution(url);
    }
    return url;
  }

  function fireCheckoutEvents(packId) {
    try {
      if (!window.KenkoTrack) return;
      if (typeof window.KenkoTrack.addToCart === 'function') window.KenkoTrack.addToCart(packId);
      if (typeof window.KenkoTrack.initiateCheckout === 'function') window.KenkoTrack.initiateCheckout(packId);
    } catch (e) {}
  }

  function goCheckout(packId) {
    var id = packId || selectedPackId();
    fireCheckoutEvents(id);
    var url = checkoutUrl(id);
    // short delay so pixels can flush beacons before navigation
    setTimeout(function () {
      window.location.assign(url);
    }, 180);
  }

  function isBuyControl(el) {
    if (!el || el.nodeType !== 1) return false;
    var t = el;
    for (var i = 0; i < 6 && t; i++) {
      if (t.matches) {
        if (
          t.matches(
            '.shop-add-to-cart-button, .kaching-bundles__add-button, [data-kb-checkout], .kb-mirror__cta, button[name="add"], form[action*="/cart/add"] button, .product-form__submit, .sticky-add-to-cart__button'
          )
        ) {
          return true;
        }
        var txt = (t.textContent || '').replace(/\s+/g, '');
        if (
          t.tagName === 'BUTTON' &&
          (txt.indexOf('カート') !== -1 ||
            txt.indexOf('購入') !== -1 ||
            txt.indexOf('今すぐ') !== -1 ||
            txt.indexOf('注文') !== -1)
        ) {
          return true;
        }
      }
      t = t.parentElement;
    }
    return false;
  }

  document.addEventListener(
    'click',
    function (e) {
      if (!isBuyControl(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      goCheckout(selectedPackId());
    },
    true
  );

  document.addEventListener(
    'submit',
    function (e) {
      var form = e.target;
      if (!form || !form.action) return;
      if (String(form.action).indexOf('/cart/add') === -1) return;
      e.preventDefault();
      e.stopPropagation();
      goCheckout(selectedPackId());
    },
    true
  );

  window.SpicyCheckout = { go: goCheckout, selectedPackId: selectedPackId, url: checkoutUrl };
})();
