/* Riftbound Card Lens — video overlay logic.
 *
 * Receives card-recognition state from the backend via Twitch Extension
 * PubSub (target "broadcast", pushed through helix /extensions/pubsub by
 * features/card-vision.js -> compactState()).
 *
 * Message shape:
 *   { "u": <cycle int>,
 *     "cards": [ [code, confirmed(1|0), score, x0, y0, x1, y1,
 *                 (optional) nx0, ny0, nx1, ny1], ... ] }
 *
 * - x0..y1 are in 3840x2160 camera-frame pixels (legacy).
 * - nx0..ny1, when present (array length >= 11), are normalized 0..1
 *   coordinates relative to the video player and are PREFERRED.
 */

'use strict';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

// Public HTTPS base URL for card images, e.g.
//   "https://cards.example.com/riftbound/"
// Card image URL = IMAGE_BASE + publicCode + ".png".
//
// Leave "" to hide images (the panel shows text only).
//
// NOTE for the operator: Twitch extensions run under a strict CSP.
// The image host must be added to the extension's "Image Domain
// Allowlist" in the Twitch developer console (Extension -> Version ->
// Capabilities / Allowlist for Image Domains), and it must be HTTPS.
const IMAGE_BASE = '';

// Camera-frame dimensions used when normalized coords are absent.
const CAM_W = 3840;
const CAM_H = 2160;

// Twitch overlay UX: the top-center of the video is a reserved zone
// (stream info, extensions menu). Suppress hotspots whose center falls
// in the top 30% vertical band AND the middle 50% horizontal band.
const RESERVED_TOP = 0.30;
const RESERVED_X_MIN = 0.25;
const RESERVED_X_MAX = 0.75;

// Hide everything after this long without a PubSub update (backend gone
// quiet / recognition stopped).
const STALE_MS = 15000;

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

var cardsDb = null;          // publicCode -> {n, t, d, e, r}
var lastUpdate = 0;          // Date.now() of last broadcast message
var lastCycle = -1;          // "u" from the last applied message
var hotspotsEnabled = true;  // viewer toggle
var currentCards = [];       // parsed cards from the latest message

var hotspotLayer = document.getElementById('hotspot-layer');
var panel = document.getElementById('card-panel');
var toggleBtn = document.getElementById('toggle-btn');

/* ------------------------------------------------------------------ */
/* Card metadata (bundled cards.json, built by build-cards-json.mjs)   */
/* ------------------------------------------------------------------ */

fetch('cards.json')
  .then(function (res) { return res.ok ? res.json() : null; })
  .then(function (json) { cardsDb = json || {}; })
  .catch(function () { cardsDb = {}; });

/**
 * Look up a card by public code with variant fallback:
 * if "UNL-131a" or "UNL-131_" is missing, retry as "UNL-131".
 */
function lookupCard(code) {
  if (!cardsDb || !code) return null;
  if (cardsDb[code]) return cardsDb[code];
  var stripped = code.replace(/[a_]$/, '');
  if (stripped !== code && cardsDb[stripped]) return cardsDb[stripped];
  return null;
}

/* ------------------------------------------------------------------ */
/* Twitch Extension helper wiring                                      */
/* ------------------------------------------------------------------ */

if (window.Twitch && window.Twitch.ext) {
  window.Twitch.ext.onAuthorized(function (auth) {
    // No EBS calls needed yet; auth.token is available for future use.
  });

  window.Twitch.ext.listen('broadcast', function (target, contentType, message) {
    var payload;
    try {
      payload = JSON.parse(message);
    } catch (e) {
      return;
    }
    if (!payload || !Array.isArray(payload.cards)) return;

    // Drop stale/out-of-order cycles (PubSub delivery is not ordered).
    if (typeof payload.u === 'number') {
      if (payload.u <= lastCycle && lastCycle - payload.u < 1000) return;
      lastCycle = payload.u;
    }

    lastUpdate = Date.now();
    currentCards = payload.cards.map(parseCard).filter(Boolean);
    render();
  });

  // Re-render on player size changes so % positions stay correct.
  window.Twitch.ext.onContext(function () { render(); });
} else {
  // Not running inside Twitch (local file preview) — stay dormant.
  console.warn('[card-lens] Twitch extension helper not found; overlay idle.');
}

window.addEventListener('resize', render);

// Stale sweep: hide overlay if the backend stops broadcasting.
setInterval(function () {
  if (currentCards.length && Date.now() - lastUpdate > STALE_MS) {
    currentCards = [];
    render();
  }
}, 2000);

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse one compact card array into
 *   { code, confirmed, score, nx0, ny0, nx1, ny1 }
 * with all coords normalized 0..1 relative to the video player.
 *
 * Prefers normalized coords (length >= 11); otherwise scales the
 * 3840x2160 camera-frame bbox, assuming the camera frame fills the
 * 16:9 video.
 */
function parseCard(arr) {
  if (!Array.isArray(arr) || arr.length < 7) return null;

  var code = String(arr[0]);
  var confirmed = arr[1] === 1;
  var score = Number(arr[2]) || 0;

  var nx0, ny0, nx1, ny1;
  if (arr.length >= 11) {
    // Backend-supplied normalized video coords — preferred.
    nx0 = Number(arr[7]);
    ny0 = Number(arr[8]);
    nx1 = Number(arr[9]);
    ny1 = Number(arr[10]);
  } else {
    // Legacy camera-frame pixels; camera fills the 16:9 video 1:1.
    nx0 = Number(arr[3]) / CAM_W;
    ny0 = Number(arr[4]) / CAM_H;
    nx1 = Number(arr[5]) / CAM_W;
    ny1 = Number(arr[6]) / CAM_H;
  }

  if (!isFinite(nx0) || !isFinite(ny0) || !isFinite(nx1) || !isFinite(ny1)) {
    return null;
  }

  // Clamp into view.
  nx0 = Math.max(0, Math.min(1, nx0));
  ny0 = Math.max(0, Math.min(1, ny0));
  nx1 = Math.max(0, Math.min(1, nx1));
  ny1 = Math.max(0, Math.min(1, ny1));
  if (nx1 <= nx0 || ny1 <= ny0) return null;

  return { code: code, confirmed: confirmed, score: score, nx0: nx0, ny0: ny0, nx1: nx1, ny1: ny1 };
}

/** True if the hotspot center falls inside the reserved top-center zone. */
function inReservedZone(c) {
  var cx = (c.nx0 + c.nx1) / 2;
  var cy = (c.ny0 + c.ny1) / 2;
  return cy < RESERVED_TOP && cx > RESERVED_X_MIN && cx < RESERVED_X_MAX;
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function render() {
  // Rebuild hotspot layer from scratch each cycle (few elements; cheap).
  hotspotLayer.innerHTML = '';

  var visible = currentCards.filter(function (c) { return !inReservedZone(c); });
  var haveCards = visible.length > 0 && hotspotsEnabled;

  // Auto-hide chrome when nothing is recognized; also make sure the
  // overlay never intercepts pointer events unless hotspots exist.
  toggleBtn.style.display = currentCards.length ? '' : 'none';
  if (!haveCards) hidePanel();

  visible.forEach(function (c) {
    var el = document.createElement('div');
    el.className = 'hotspot' + (c.confirmed ? '' : ' pending');
    el.style.left = (c.nx0 * 100) + '%';
    el.style.top = (c.ny0 * 100) + '%';
    el.style.width = ((c.nx1 - c.nx0) * 100) + '%';
    el.style.height = ((c.ny1 - c.ny0) * 100) + '%';
    // pointer-events only while cards exist, so the overlay never
    // blocks the Twitch player controls otherwise.
    el.style.pointerEvents = haveCards ? 'auto' : 'none';

    el.addEventListener('mouseenter', function () {
      el.classList.add('active');
      showPanel(c);
    });
    el.addEventListener('mouseleave', function () {
      el.classList.remove('active');
      hidePanel();
    });

    hotspotLayer.appendChild(el);
  });
}

function showPanel(c) {
  var meta = lookupCard(c.code);
  var html = '';

  if (IMAGE_BASE) {
    html += '<img src="' + IMAGE_BASE + encodeURIComponent(c.code) + '.png"' +
            ' alt="" onerror="this.remove()">';
  }

  html += '<div class="card-name">' + escapeHtml(meta ? meta.n : c.code) + '</div>';

  if (meta) {
    if (meta.t) html += row('Type', meta.t);
    if (meta.d) html += row('Domain', meta.d);
    if (meta.e) html += row('Energy', meta.e);
    if (meta.r) html += row('Rarity', meta.r);
  }

  html += '<div class="card-code">' + escapeHtml(c.code) + '</div>';
  html += '<span class="card-status' + (c.confirmed ? '' : ' pending') + '">' +
          (c.confirmed ? 'Confirmed' : 'Detecting…') + '</span>';

  panel.innerHTML = html;
  panel.classList.remove('hidden');
}

function hidePanel() {
  panel.classList.add('hidden');
}

function row(label, val) {
  return '<div class="card-row"><span>' + escapeHtml(label) +
         '</span><span class="val">' + escapeHtml(String(val)) + '</span></div>';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

/* ------------------------------------------------------------------ */
/* Viewer toggle                                                       */
/* ------------------------------------------------------------------ */

toggleBtn.addEventListener('click', function () {
  hotspotsEnabled = !hotspotsEnabled;
  toggleBtn.textContent = hotspotsEnabled ? 'Cards: ON' : 'Cards: OFF';
  toggleBtn.classList.toggle('off', !hotspotsEnabled);
  document.body.classList.toggle('hotspots-off', !hotspotsEnabled);
  if (!hotspotsEnabled) hidePanel();
  render();
});
