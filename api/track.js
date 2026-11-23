'use strict';

const { getTrackInfo, normalizeTrack } = require('../lib/cj');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function isTooEarlyMessage(msg) {
  const s = String(msg || '').toLowerCase();
  return (
    s.includes('no tracking') ||
    s.includes('not found') ||
    s.includes('no data') ||
    s.includes('does not exist') ||
    s.includes('unavailable') ||
    s.includes('preparing') ||
    s.includes('pending')
  );
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return send(res, 204, {});
  }

  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, reason: 'method', error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const trackNumber = String(url.searchParams.get('trackNumber') || '').trim();
    if (!trackNumber || trackNumber.length < 5 || trackNumber.length > 64) {
      return send(res, 400, {
        ok: false,
        reason: 'invalid',
        error: '追跡番号を入力してください'
      });
    }
    if (!/^[A-Za-z0-9\-]+$/.test(trackNumber)) {
      return send(res, 400, {
        ok: false,
        reason: 'invalid',
        error: '追跡番号の形式が正しくありません'
      });
    }

    const raw = await getTrackInfo(trackNumber);
    const msg = (raw && raw.message) || '';

    // CJ: success but empty / "no info yet" → still early (not shipped or not synced)
    if (raw && raw.code === 200) {
      const data = normalizeTrack(raw);
      if (!data) {
        return send(res, 200, {
          ok: false,
          reason: 'too_early',
          error:
            'まだ配送データが反映されていません。発送前、または発送直後の可能性があります。'
        });
      }
      const st = String(data.trackingStatus || '').toLowerCase();
      if (st.includes('no tracking information') || st === 'pending' || st === 'preparing') {
        return send(res, 200, {
          ok: true,
          reason: 'preparing',
          data: Object.assign({}, data, { trackingStatus: 'pending' })
        });
      }
      return send(res, 200, { ok: true, reason: 'ok', data });
    }

    if (isTooEarlyMessage(msg) || (raw && (raw.code === 404 || raw.code === 1600200))) {
      return send(res, 200, {
        ok: false,
        reason: 'too_early',
        error:
          'この追跡番号では、まだ配送情報が見つかりません。発送前、または反映待ちの可能性があります。'
      });
    }

    return send(res, 404, {
      ok: false,
      reason: 'not_found',
      error: msg || '追跡情報が見つかりませんでした'
    });
  } catch (err) {
    console.error('[api/track]', err && err.message);
    return send(res, 500, {
      ok: false,
      reason: 'server',
      error: 'しばらくしてから再度お試しください'
    });
  }
};
