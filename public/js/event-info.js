const socket = io();
window.roomManager = new RoomManager(socket);

// Parse scene from URL: /event-info/{identifier}
// This page handles intermission/branding scenes (starting-soon,
// be-right-back, ending, schedule, prizes, head-to-head, commentators,
// pack-opening, casters-1, casters-2, etc.). Each scene maps to a
// dedicated subfolder under /assets/images/{game}/ (PNG) and
// /assets/animations/{game}/ (MP4). Video is optional; missing MP4 → PNG.
//
// Match-specific scenes (overview, hand-left/right, player-left/right)
// live at /scoreboard/:matchID/:variant instead — they need live match
// data overlays (names, life totals, game-wins pips) on top of the frame
// PNG, which this page doesn't render. Stray `match-*` scene slugs here
// trigger a console warning pointing operators at the correct path.
//
// History: this page used to live at /background/:identifier before the
// /event-info/ rename; the old prefix was removed as a hard break so stale
// OBS sources surface immediately instead of silently drifting.
const pathSegments = window.location.pathname.split('/');
const scene = pathSegments[2] || '';

// Stamp the scene slug on <body> once at load so CSS can branch per-scene
// (e.g. `body[data-scene="pack-opening"] .ei-text { ... }`). Scene never
// changes for a given page load — OBS re-navigates to switch scenes.
document.body.dataset.scene = scene;

// URL scene → { folder, filename } under /assets/{images|animations}/{game}/.
// Filename is the stem (no extension, no vendor/playerCount suffix — those
// get appended by vc.getAssetPath).
//
// Examples for game=riftbound, vendor=tes, playerCount=1v1:
//   /event-info/head-to-head  → /head-to-head/riftbound-head-to-head-frame-tes-1v1.png
//   /event-info/commentators  → /commentator/riftbound-commentator-frame-tes-1v1.png
//   /event-info/starting-soon → /event-info/riftbound-starting-soon-tes-1v1.png
//   (.mp4 animations live under the matching path in /assets/animations/.)
function resolveSceneParts(s, game) {
    if (s === 'head-to-head') return { folder: 'head-to-head', filename: `${game}-head-to-head-frame` };
    if (s === 'commentators') return { folder: 'commentator',  filename: `${game}-commentator-frame` };
    // event-info scenes: starting-soon, be-right-back, ending, schedule
    // (and any future intermission scene — defaults here so adding a new
    // URL just means dropping an asset in the event-info folder).
    return { folder: 'event-info', filename: `${game}-${s}` };
}

// ── Layered-scene registry ─────────────────────────────────────────────
// Scenes that use the multi-layer PNG architecture (bg / frame / data /
// char) under the `default` vendor. For these scenes:
//   - bg PNG path uses an explicit `-bg-` suffix
//     (e.g. riftbound-schedule-bg-default-1v1.png)
//   - frame, data, and char layers load as separate transparent PNGs
//     via HEAD-probe in updateBackground(). Missing files hide their
//     layer gracefully (no broken-image icon).
//
// Each scene has a `stack` array that defines per-scene z-order for
// the three image layers (frame / data / char). The bg div sits below
// these via static stacking — it's never in the array. The array is
// bottom-up: the FIRST entry gets the lowest z-index, the LAST entry
// gets the highest. JS applies the z-indexes inline in
// updateBackground() so the stack flip happens automatically when the
// scene changes (e.g. ending → schedule swaps from char-buried to
// char-on-top with no manual style toggling).
//
// To register a new layered scene: add an entry here, drop the per-
// layer PNGs in /assets/images/{game}/event-info/{game}-{scene}-{bg|
// frame|data|char}-{vendor}-{playerCount}.png, and (optionally) add a
// body-scoped CSS animation block keyed on `body[data-scene="{scene}"]`
// in event-info.css.
//
// Other vendors (TES, etc.) ignore this registry entirely — for them
// every scene is a single PNG and the file IS the whole scene.
const LAYERED_SCENES = new Map([
    // Schedule: Yasuo (char) sits ON TOP of the day blocks (data) and
    // any frame chrome. Default stacking, char wins.
    ['schedule',      { stack: ['frame', 'data', 'char'] }],
    // Starting-soon: same default stack — character on top.
    ['starting-soon', { stack: ['frame', 'data', 'char'] }],
    // Ending: Jinx (char) is BEHIND the QR codes / text (data) per
    // the PSD layer order. Char goes to the bottom of the layered
    // stack so the data layer covers her where they overlap.
    ['ending',        { stack: ['char', 'frame', 'data'] }],
]);

// ── Scene-keyed L3 overlay registry ─────────────────────────────────────
// Scene slug → function returning HTML for #event-info-overlay. The
// renderer receives the current globalData so dynamic scenes can read live
// event-info fields (global-event-name, global-event-current-round,
// global-commentator-*, etc.). Static scenes ignore the argument. To add
// a new overlay: register the scene here, add a CSS block in
// event-info.css gated by `body[data-scene="..."]`, and (optionally) add
// per-vendor positioning vars in vendor-config.js. No new files, no new
// routes. Scenes without an entry render PNG only (backward-compat).
//
// History: the 'battlefields' scene used to live here, rendering the four
// 2v2 battlefield cards on /event-info/battlefields. It moved to
// /scoreboard/match1's lower-third strip — see .riftbound-bf-row in
// scoreboard.html / scoreboard.css and updateRiftboundBattlefieldsRow()
// in scoreboard.js. /event-info/battlefields still resolves (PNG only).
const SCENE_OVERLAYS = {
    'pack-opening': () => `<div class="ei-text">Pack Opening</div>`,
    // /event-info/schedule uses a PNG-based "data" layer (see
    // #event-info-data img element + updateBackground()), not HTML
    // overlays. SCENE_OVERLAYS entry intentionally omitted.
};

// Cached most-recent globalData so vendor/playerCount commits can re-render
// the overlay without waiting for the next socket push.
let latestGlobalData = {};

function renderOverlay() {
    const overlay = document.getElementById('event-info-overlay');
    if (!overlay) return;
    const renderer = SCENE_OVERLAYS[scene];
    overlay.innerHTML = renderer ? renderer(latestGlobalData) : '';
}

let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

function updateBackground() {
    if (!scene) {
        console.warn('[EventInfo] No scene identifier in URL:', window.location.pathname);
        return;
    }
    // Catch stale OBS sources still pointed at the deprecated match-* URLs.
    if (scene.startsWith('match-')) {
        const variant = scene.replace(/^match-/, '');
        console.warn(
            `[EventInfo] match-* scenes live at /scoreboard/matchN/${variant}, not on /event-info/ ` +
            `— update your OBS source (defaulting to match1 would still be wrong for multi-match layouts).`
        );
        return;
    }
    const vc = window.VENDOR_CONFIG;
    const bgEl = document.getElementById('background');
    const videoEl = document.getElementById('background-video');
    const frameEl = document.getElementById('event-info-frame');
    const dataEl = document.getElementById('event-info-data');
    const charEl = document.getElementById('event-info-character');

    // ── PNG (always applied — acts as fallback when MP4 is missing) ─────
    // Vendor-aware lookup for layered scenes: under the `default` vendor
    // (CSL Bologna), specific scenes split their canvas into 4 layers —
    // bg / frame / data / char — each loaded as a separate transparent
    // PNG. The bg PNG path uses an explicit `-bg-` suffix
    // (e.g. riftbound-schedule-bg-default-1v1.png) so it doesn't collide
    // with the frame/data/char layers in the same folder. Frame, data,
    // and character render on top via the loadLayer() helper below.
    //
    // For TES (and any other vendor) every scene uses the single-PNG
    // path — the file IS the whole scene — so we keep the existing
    // resolveSceneParts mapping unchanged.
    const layeredConfig = LAYERED_SCENES.get(scene);
    const isLayered = !!layeredConfig && currentVendor === 'default';
    const { folder, filename } = isLayered
        ? { folder: 'event-info', filename: `${currentGame}-${scene}-bg` }
        : resolveSceneParts(scene, currentGame);
    const pngBase = `/assets/images/${currentGame}/${folder}/${filename}.png`;
    const pngPath = vc ? vc.getAssetPath(pngBase, currentVendor, currentPlayerCount) : pngBase;
    bgEl.style.backgroundImage = `url("${pngPath}")`;
    console.log('[EventInfo] Scene:', scene, '→', pngPath);

    // ── Per-scene z-order ───────────────────────────────────────────────
    // The CSS file has sane defaults (frame=1, data=2, char=3 — char on
    // top) but layered scenes can override the stack order via their
    // entry in LAYERED_SCENES. Apply the stack as inline z-indexes so
    // the per-scene order wins over the CSS defaults; reset on every
    // rerender so navigating ending → schedule restores the default
    // stack instead of inheriting ending's char-buried order.
    const layerEls = { frame: frameEl, data: dataEl, char: charEl };
    if (isLayered && Array.isArray(layeredConfig.stack)) {
        // Clear any previous scene's inline z-indexes first so layers
        // not in this scene's stack revert to CSS defaults rather than
        // keeping a stale inline value.
        Object.values(layerEls).forEach(el => { if (el) el.style.zIndex = ''; });
        layeredConfig.stack.forEach((layerKey, i) => {
            const el = layerEls[layerKey];
            if (el) el.style.zIndex = String(i + 1);
        });
    } else {
        // Non-layered scene — clear any inline z-indexes so the CSS
        // base rules apply. (Layers are display:none here anyway, but
        // this keeps state hygienic for the next layered visit.)
        Object.values(layerEls).forEach(el => { if (el) el.style.zIndex = ''; });
    }

    // ── Helper: load a transparent layer PNG via HEAD-probe ─────────────
    // Hides the element on 404 so missing files don't show a broken-
    // image icon. Sets display:'block' explicitly to override the
    // `display: none` base rule in event-info.css. The optional
    // onLoadCb runs after the layer is shown — used by the schedule
    // scene's data layer to fire the entrance animation once the PNG
    // is in place.
    function loadLayer(el, layerSuffix, onLoadCb) {
        if (!el) return;
        if (!isLayered) {
            el.removeAttribute('src');
            el.style.display = 'none';
            return;
        }
        const base = `/assets/images/${currentGame}/event-info/${currentGame}-${scene}-${layerSuffix}.png`;
        const path = vc ? vc.getAssetPath(base, currentVendor, currentPlayerCount) : base;
        const probe = new Image();
        probe.onload  = () => {
            el.src = path;
            el.style.display = 'block';
            if (onLoadCb) onLoadCb();
        };
        probe.onerror = () => { el.removeAttribute('src'); el.style.display = 'none'; };
        probe.src = path;
    }

    // ── Frame PNG (z=1) ─────────────────────────────────────────────────
    // Decorative chrome / borders / static branding overlay. Sits above
    // the bg and below the data layer. Schedule currently has no frame
    // PNG (placeholder) and gracefully hides; starting-soon under
    // default expects one.
    loadLayer(frameEl, 'frame');

    // ── Data PNG (z=2) ──────────────────────────────────────────────────
    // Dynamic-looking content (e.g. day blocks for schedule). Schedule
    // additionally gets the entrance animation re-triggered after load.
    loadLayer(
        dataEl,
        'data',
        scene === 'schedule' ? () => triggerScheduleAnimation('initial-load') : null
    );

    // ── Character PNG (z=3, top) ────────────────────────────────────────
    // Foreground character art (e.g. Yasuo for Bologna schedule).
    loadLayer(charEl, 'char');

    // ── MP4 (optional replacement) ──────────────────────────────────────
    if (!videoEl) return;
    const videoBase = `/assets/animations/${currentGame}/${folder}/${filename}.mp4`;
    const videoPath = vc ? vc.getAssetPath(videoBase, currentVendor, currentPlayerCount) : videoBase;
    fetch(videoPath, { method: 'HEAD' })
        .then(r => {
            if (r.ok) {
                videoEl.src = videoPath;
                videoEl.load();
                videoEl.play().catch(() => {});
                console.log('[EventInfo] Video:', videoPath);
            } else {
                videoEl.removeAttribute('src');
                videoEl.load();
            }
        })
        .catch(() => {
            videoEl.removeAttribute('src');
            videoEl.load();
        });
}

// ── Vendor-config overrides ─────────────────────────────────────────────
// Apply the current game/vendor's CSS custom properties to :root, and
// mirror game/vendor/playerCount onto <body> data-attributes so CSS can
// scope overlay positioning per combo. Pattern borrowed from
// commentator-lower-third.js:157-209 — simplified here because event-info
// pages have no per-game DOM to toggle (all scenes are a single PNG + a
// single overlay container). Bg-image overrides go through vc.getAssetPath
// so per-vendor/playerCount asset suffixes resolve correctly.
function updateTheme() {
    document.body.dataset.game = currentGame;
    document.body.dataset.vendor = currentVendor;
    document.body.dataset.playerCount = currentPlayerCount;

    const vc = window.VENDOR_CONFIG;
    if (!vc) return;
    vc.getAllOverrideProperties().forEach(prop => {
        document.documentElement.style.removeProperty(prop);
    });
    const overrides = vc.getOverrides(currentGame, currentVendor, currentPlayerCount);
    Object.entries(overrides).forEach(([prop, value]) => {
        if (prop.endsWith('-bg-image') && value.includes('/assets/')) {
            const match = value.match(/url\(['"]?(.+?)['"]?\)/);
            if (match) {
                const resolved = vc.getAssetPath(match[1], currentVendor, currentPlayerCount);
                value = `url('${resolved}')`;
            }
        }
        document.documentElement.style.setProperty(prop, value);
    });
}

// Convenience: every selection-change handler needs to refresh the PNG,
// the CSS vars, and the overlay together. Keep them in lockstep so vendor
// switches don't leave the overlay positioned against the old frame.
function rerender() {
    updateBackground();
    updateTheme();
    renderOverlay();
}

// Re-trigger the schedule data layer's entrance animation. CSS animations
// only fire once per element load — to replay (e.g. when OBS cuts back to
// the schedule scene without refreshing the browser source) we strip the
// `.animating` class, force a layout reflow so the browser flushes the
// previous animation state, then re-apply the class. Reflow trick from
// https://css-tricks.com/restart-css-animation/.
//
// Why offsetWidth (synchronous) rather than rAF (async): OBS browser
// sources can be in a "throttled" state (e.g. when the operator's
// monitor is asleep, when the source is hidden, or when the host tab
// is backgrounded) where requestAnimationFrame fires very slowly or
// not at all. The offsetWidth reflow happens immediately on the JS
// thread regardless of paint cadence, so the class flip + animation
// restart works even on a hidden source.
//
// Safe to call when the element is hidden — the next show + class flip
// will replay cleanly.
function triggerScheduleAnimation(source = 'unknown') {
    const el = document.getElementById('event-info-data');
    if (!el) {
        console.warn('[EventInfo] triggerScheduleAnimation called but #event-info-data missing');
        return;
    }
    console.log(`[EventInfo] triggerScheduleAnimation(source=${source}) — restarting`);
    el.classList.remove('animating');
    // Force a synchronous reflow — reading offsetWidth makes the browser
    // commit the class removal (and any consequent style invalidation)
    // before the next line re-adds the class. Without this, the browser
    // may batch remove+add into a single style recalc, producing no
    // visible animation restart.
    void el.offsetWidth;
    el.classList.add('animating');
}

// Diagnostic: log when the CSS animation actually starts/ends. If the
// trigger was called but no animationstart fires, the CSS rule isn't
// matching (check body data-attrs + the .animating class). If start
// fires but the user reports "no animation visible", check the OBS
// browser source isn't caching a stale frame.
const _scheduleDataEl = document.getElementById('event-info-data');
if (_scheduleDataEl) {
    _scheduleDataEl.addEventListener('animationstart', (e) => {
        console.log(`[EventInfo] animationstart: ${e.animationName}`);
    });
    _scheduleDataEl.addEventListener('animationend', (e) => {
        console.log(`[EventInfo] animationend: ${e.animationName}`);
    });
}

// OBS scene-cut trigger — fires when the operator cuts to the scene
// in OBS even if the browser source has been loaded the whole time.
// Server emits this from features/obs-websocket.js when the program
// scene name matches the schedule scene. Same pattern as
// obs-animate-metagame / obs-animate-bracket.
socket.on('obs-animate-schedule', () => {
    triggerScheduleAnimation('obs-animate-schedule');
});

// OBS scene-leave reset — fires the moment the operator cuts AWAY
// from the schedule scene. Server emits this from
// features/obs-websocket.js when the program scene transitions out of
// SCHEDULE_SCENE. Removing `.animating` on leave puts the data layer
// back at its CSS default (opacity 0 + translateY(40px) — see
// event-info.css schedule scene block) WHILE the scene is off-screen,
// so the next cut back TO schedule starts from a hidden data layer
// and animate-schedule can fade it in cleanly with no visible "snap
// from opacity 1 to opacity 0" flash that we'd otherwise see if the
// reset happened inside the trigger function after the cut completes.
socket.on('obs-leave-schedule', () => {
    const el = document.getElementById('event-info-data');
    if (!el) return;
    console.log('[EventInfo] obs-leave-schedule received → clearing .animating to reset data layer to hidden start state');
    el.classList.remove('animating');
});

// Page Visibility API fallback — fires when the OBS browser source
// becomes visible to the operator's program output. Useful when "Refresh
// browser when scene becomes active" is enabled in OBS source settings:
// the page reload itself triggers the initial onload animation, but the
// visibilitychange handler also covers cases where OBS keeps the source
// loaded but toggles its visibility flag. Belt-and-suspenders alongside
// the obs-animate-schedule socket event so the animation still fires
// when the OBS WebSocket integration is misconfigured/disconnected.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && scene === 'schedule' && currentVendor === 'default') {
        triggerScheduleAnimation('visibilitychange');
    }
});

// Surface the trigger for manual testing from DevTools console:
//   window._triggerScheduleAnimation()
window._triggerScheduleAnimation = (src = 'manual') => triggerScheduleAnimation(src);

// Request initial state from server on connect
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');
socket.emit('get-match-global-data');

// Initial render — fire all three (bg, theme, overlay) so body data-attrs
// get set with the default game/vendor/playerCount values immediately,
// not just on socket-driven selection changes. Critical for body-scoped
// CSS blocks (like the schedule scene's day blocks, gated on
// `[data-vendor="default"]`) to apply on first page load before the
// socket round-trip completes.
rerender();

// Listen for selection changes and re-render
socket.on('server-current-game-selection', ({ gameSelection }) => {
    currentGame = gameSelection;
    rerender();
});
socket.on('game-selection-updated', ({ gameSelection }) => {
    currentGame = gameSelection;
    rerender();
});
socket.on('server-current-vendor-selection', ({ vendorSelection }) => {
    currentVendor = vendorSelection;
    rerender();
});
socket.on('vendor-selection-updated', ({ vendorSelection }) => {
    currentVendor = vendorSelection;
    rerender();
});
socket.on('server-current-player-count', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    rerender();
});
socket.on('player-count-updated', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    rerender();
});

// Live event-info fields for dynamic overlay scenes. Static scenes
// (pack-opening) ignore the payload; the subscription is wired now so
// future scenes that read globalData don't need new plumbing.
socket.on('update-match-global-data', (data) => {
    latestGlobalData = data?.globalData || {};
    renderOverlay();
});
