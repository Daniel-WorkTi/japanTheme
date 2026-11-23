'use strict';

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

let tokenCache = {
  accessToken: null,
  refreshToken: null,
  accessExpiry: 0,
  refreshExpiry: 0
};

function apiKey() {
  const key = process.env.CJ_API_KEY || '';
  if (!key) throw new Error('CJ_API_KEY missing');
  return key;
}

async function cjFetch(path, options = {}) {
  const res = await fetch(CJ_BASE + path, options);
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function getAccessToken(force) {
  const now = Date.now();
  if (!force && tokenCache.accessToken && tokenCache.accessExpiry > now + 60_000) {
    return tokenCache.accessToken;
  }

  if (!force && tokenCache.refreshToken && tokenCache.refreshExpiry > now + 60_000) {
    const refreshed = await cjFetch('/authentication/refreshAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokenCache.refreshToken })
    });
    if (refreshed.json && refreshed.json.code === 200 && refreshed.json.data) {
      saveTokens(refreshed.json.data);
      return tokenCache.accessToken;
    }
  }

  const got = await cjFetch('/authentication/getAccessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: apiKey() })
  });

  if (!got.json || got.json.code !== 200 || !got.json.data) {
    const msg = (got.json && got.json.message) || 'CJ auth failed';
    const err = new Error(msg);
    err.code = got.json && got.json.code;
    throw err;
  }

  saveTokens(got.json.data);
  return tokenCache.accessToken;
}

function saveTokens(data) {
  tokenCache.accessToken = data.accessToken;
  tokenCache.refreshToken = data.refreshToken;
  tokenCache.accessExpiry = Date.parse(data.accessTokenExpiryDate) || Date.now() + 180 * 864e5;
  tokenCache.refreshExpiry = Date.parse(data.refreshTokenExpiryDate) || Date.now() + 180 * 864e5;
}

async function getTrackInfo(trackNumber) {
  const token = await getAccessToken(false);
  let result = await cjFetch(
    '/logistic/trackInfo?trackNumber=' + encodeURIComponent(trackNumber),
    { method: 'GET', headers: { 'CJ-Access-Token': token } }
  );

  if (result.json && result.json.code === 1600001) {
    await getAccessToken(true);
    result = await cjFetch(
      '/logistic/trackInfo?trackNumber=' + encodeURIComponent(trackNumber),
      { method: 'GET', headers: { 'CJ-Access-Token': tokenCache.accessToken } }
    );
  }

  return result.json;
}

function normalizeTrack(raw) {
  if (!raw || !Array.isArray(raw.data) || !raw.data.length) return null;
  const d = raw.data[0];
  return {
    trackingNumber: d.trackingNumber || '',
    logisticName: d.logisticName || '',
    trackingFrom: d.trackingFrom || '',
    trackingTo: d.trackingTo || '',
    deliveryDay: d.deliveryDay || '',
    deliveryTime: d.deliveryTime || '',
    trackingStatus: d.trackingStatus || '',
    lastMileCarrier: d.lastMileCarrier || '',
    lastMileCarrierPhone: d.lastMileCarrierPhone || '',
    lastMileCarrierEmail: d.lastMileCarrierEmail || '',
    lastTrackNumber: d.lastTrackNumber || ''
  };
}

module.exports = { getTrackInfo, normalizeTrack };
