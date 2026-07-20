import { RIFTBOUND_LEGENDS, RIFTBOUND_PORTRAIT_FOCUS } from './riftbound/constants.js';

const socket = io();
window.roomManager = new RoomManager(socket);

let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';
let metagameData = null;
let _bgToken = 0;   // invalidates a pending async bg-image load when the theme changes again

// Color palette for pie slices (will be overridable per vendor)
const DEFAULT_COLORS = [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
    '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
    '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
    '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9'
];

// ── Socket Setup ─────────────────────────────────────────────────────────────
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');
socket.emit('get-broadcast-scoreboard-data');
socket.emit('get-meta-breakdown-data');

// ── Theme ────────────────────────────────────────────────────────────────────
let _initGame = false, _initVendor = false, _initPlayer = false;
function tryInitialTheme() {
    if (_initGame && _initVendor && _initPlayer) {
        updateTheme(currentGame, currentVendor, currentPlayerCount);
        // Re-render: metagame data may have arrived before game/vendor/count were
        // known, and the layout gate (pie vs Most Played Decks) depends on all three.
        if (metagameData) renderMetagame();
    }
}

socket.on('server-current-game-selection', ({gameSelection}) => {
    currentGame = gameSelection;
    _initGame = true;
    tryInitialTheme();
});
socket.on('game-selection-updated', ({gameSelection}) => {
    currentGame = gameSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
    if (metagameData) renderMetagame();
});
socket.on('server-current-vendor-selection', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    _initVendor = true;
    tryInitialTheme();
});
socket.on('vendor-selection-updated', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
    if (metagameData) renderMetagame();
});
socket.on('server-current-player-count', ({playerCount}) => {
    currentPlayerCount = playerCount;
    _initPlayer = true;
    tryInitialTheme();
});
socket.on('player-count-updated', ({playerCount}) => {
    currentPlayerCount = playerCount;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
    if (metagameData) renderMetagame();
});


function updateTheme(game, vendor, playerCount) {
    const vc = window.VENDOR_CONFIG;
    // The "Most Played Decks" layout (CSL default + uvs-unleashed, riftbound 1v1)
    // owns its own background: uvs uses a baked jungle+character video, default
    // uses its bg PNG. Skip the shared event-bg-video load for both (handled at
    // the end of this fn), and skip the shared PNG-bg load for uvs only (it uses
    // the video) — avoids an async src race that would clobber the MPD background.
    const isMPD = (game === 'riftbound' && (vendor === 'uvs-unleashed' || vendor === 'default') && playerCount === '1v1');
    const bgToken = ++_bgToken;   // a later updateTheme() bumps _bgToken, invalidating this call's async bg load
    if (vc) {
        vc.getAllOverrideProperties().forEach(prop => {
            document.documentElement.style.removeProperty(prop);
        });
        const overrides = vc.getOverrides(game, vendor, playerCount);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });

        // Background image
        const bgPath = vc.getAssetPath(
            `/assets/images/${game}/metagame/${game}-metagame-bg.png`,
            vendor, playerCount
        );
        const bgEl = document.getElementById('metagame-bg');
        if (bgEl && !(isMPD && vendor === 'uvs-unleashed')) {
            const img = new Image();
            img.onload = () => { if (bgToken === _bgToken) bgEl.src = bgPath; };
            img.onerror = () => { if (bgToken === _bgToken) bgEl.src = ''; };
            img.src = bgPath;
        }

        // Event-wide video background (optional — drops on top of PNG bg
        // when the file exists for current game/vendor/playerCount).
        // Pattern: /assets/animations/{game}/shared/{game}-event-bg-{vendor}-{playerCount}.mp4
        const videoPath = vc.getAssetPath(
            `/assets/animations/${game}/shared/${game}-event-bg.mp4`,
            vendor, playerCount
        );
        const videoEl = document.getElementById('metagame-bg-video');
        if (videoEl && !isMPD) {
            fetch(videoPath, { method: 'HEAD' })
                .then(r => {
                    if (r.ok) {
                        videoEl.src = videoPath;
                        videoEl.load();
                        videoEl.play().catch(() => {});
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
    }

    // Game defaults — only for games whose `default` vendor doesn't yet
    // declare a metagame font. Riftbound's font now comes from
    // riftbound.default's --metagame-font (Beaufort), with TES overriding
    // explicitly to Akzidenz. MTG and Starwars still need the JS fallback
    // because their `default` vendor blocks don't (yet) set the font.
    if (game === 'mtg') {
        document.documentElement.style.setProperty('--metagame-font', 'Gotham Narrow');
        document.documentElement.style.setProperty('--metagame-font-weight', '700');
    } else if (game === 'starwars') {
        document.documentElement.style.setProperty('--metagame-font', 'Bebas Neue');
        document.documentElement.style.setProperty('--metagame-font-weight', 'bold');
    }
    // Riftbound: font comes from vendor-config (default = Beaufort,
    // tes = Akzidenz, etc.). Removed the hardcoded Akzidenz default
    // here since it was effectively making TES's font the riftbound
    // baseline — wrong now that the `default` vendor IS the baseline.

    // Re-apply vendor overrides
    if (vc) {
        const overrides = vc.getOverrides(game, vendor, playerCount);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });
    }

    // ── "Most Played Decks" chrome (CSL default + uvs) ────────────────────────
    // Chrome is CSS now; the only images are the corner leaves + the event logo,
    // both per-vendor (uvs has Sydney art; default falls back to none → 404 hides
    // the element). Background is per-vendor too: uvs = baked jungle+character
    // video; default = its bg PNG (loaded by the shared block above).
    const leavesEl = document.getElementById('metagame-leaves');
    const logoEl = document.querySelector('.mpd-footer-logo');
    if (isMPD) {
        const leavesPath = `/assets/images/${game}/metagame/${game}-metagame-leaves-${vendor}-1v1.png`;
        if (leavesEl) { const im = new Image(); im.onload = () => { leavesEl.src = leavesPath; }; im.onerror = () => { leavesEl.src = ''; }; im.src = leavesPath; }
        const logoPath = `/assets/images/${game}/metagame/${game}-metagame-logo-${vendor}-1v1.png`;
        if (logoEl) { const im = new Image(); im.onload = () => { logoEl.src = logoPath; }; im.onerror = () => { logoEl.src = ''; }; im.src = logoPath; }
        const vid = document.getElementById('metagame-bg-video');
        if (vendor === 'uvs-unleashed') {
            const bgImg = document.getElementById('metagame-bg');
            if (bgImg) bgImg.src = '';                                    // the video is the background
            if (vid) {
                const mpdBg = `/assets/animations/${game}/metagame/${game}-metagame-bg-uvs-unleashed-1v1.mp4`;
                if (!vid.src.endsWith(mpdBg)) { vid.src = mpdBg; vid.load(); }
                vid.play().catch(() => {});
            }
        } else if (vid && vid.getAttribute('src')) {
            vid.removeAttribute('src'); vid.load();                       // default uses the PNG bg
        }
    } else {
        if (leavesEl) leavesEl.src = '';
        if (logoEl) logoEl.src = '';
    }
}

// ── Metagame Data ────────────────────────────────────────────────────────────
socket.on('receive-meta-breakdown-data', (data) => {
    console.log('[Metagame] Received breakdown data', data);
    metagameData = data;
    renderMetagame();
});

// ── Portrait Lookup (1200x1200 for metagame) ────────────────────────────────
// Face focus points moved to riftbound/constants.js as RIFTBOUND_PORTRAIT_FOCUS
// so the standings page can consume the same tuning data — one debug pass
// in `debugFocus()` below propagates to both views. Aliased here for the
// existing local references.
const PORTRAIT_FOCUS = RIFTBOUND_PORTRAIT_FOCUS;

function getPortraitUrl(archetypeName) {
    if (archetypeName === 'Other') {
        return `/assets/images/${currentGame}/shared/legend-portraits/legend-portraits-1200x1200/1200x1200_0000_Other.png`;
    }
    const legendData = RIFTBOUND_LEGENDS[archetypeName];
    if (legendData) {
        return legendData.left.replace('legend-portraits-251x124/251x124_', 'legend-portraits-1200x1200/1200x1200_');
    }
    return '';
}

function getBgPortraitUrl(archetypeName) {
    const legendData = RIFTBOUND_LEGENDS[archetypeName];
    if (legendData) {
        return legendData.left.replace(
            'legend-portraits/legend-portraits-251x124/251x124_',
            'legend-portrait-bgs/legend-portrait-with-bgs-744x1039/744x1039_'
        );
    }
    return '';
}

function getPortraitFocus(archetypeName) {
    const entry = PORTRAIT_FOCUS[archetypeName] || { top: 20, left: 50 };
    return { top: entry.top, left: entry.left, scale: entry.scale || 1.0, heroScale: entry.heroScale || 1.0 };
}

// ── Parse metagame data from the flat field format ───────────────────────────
function parseMetagameFields(data) {
    const archetypes = [];
    for (let i = 1; i <= 30; i++) {
        const name = data[`meta-breakdown-archetype-${i}`];
        if (!name || (typeof name === 'string' && name.trim() === '')) break;
        const day1Count = parseInt(data[`meta-breakdown-day-1-count-${i}`]) || 0;
        const day1Percent = parseFloat(data[`meta-breakdown-day-1-percent-${i}`]) || 0;
        const day2Count = data[`meta-breakdown-day-2-count-${i}`] !== undefined && data[`meta-breakdown-day-2-count-${i}`] !== ''
            ? parseInt(data[`meta-breakdown-day-2-count-${i}`]) : null;
        const day2Percent = data[`meta-breakdown-day-2-percent-${i}`] !== undefined && data[`meta-breakdown-day-2-percent-${i}`] !== ''
            ? parseFloat(data[`meta-breakdown-day-2-percent-${i}`]) : null;
        const convStr = data[`meta-breakdown-conversion-${i}`] || '';
        const conversion = convStr ? parseFloat(convStr.replace('%', '')) : null;

        archetypes.push({
            name: typeof name === 'string' ? name : name,
            day1Count, day1Percent, day2Count, day2Percent, conversion,
            portrait: getPortraitUrl(typeof name === 'string' ? name : '')
        });
    }
    return archetypes;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderMetagame() {
    if (!metagameData) return;

    const archetypes = parseMetagameFields(metagameData);
    if (archetypes.length === 0) return;

    // Use day2Percent if available, otherwise day1Percent for pie sizing
    const hasDay2 = archetypes.some(a => a.day2Count !== null);

    // ── UVS Unleashed: render the 8-card "Most Played Decks" layout instead of
    // the pie chart + side panel. Structural swap (fixed card positions), so the
    // gate is JS-driven rather than a CSS body class. Toggle visibility, dispatch,
    // and bail before any pie/panel work.
    const isMPD = (currentGame === 'riftbound' && (currentVendor === 'uvs-unleashed' || currentVendor === 'default') && currentPlayerCount === '1v1');
    const mpdEl = document.getElementById('most-played-decks');
    const pieEl = document.getElementById('pie-chart-container');
    const panelEl = document.getElementById('archetype-cards-panel');
    const headerEl = document.getElementById('metagame-header');
    if (isMPD) {
        if (pieEl) pieEl.style.display = 'none';
        if (panelEl) panelEl.style.display = 'none';
        if (headerEl) headerEl.style.display = 'none';            // METAGAME/DAY live in the baked footer
        renderMostPlayedDecks(hasDay2);
        return;
    }
    // Non-uvs: ensure the MPD layout is hidden and pie/panel restored.
    if (mpdEl) mpdEl.classList.remove('active');
    if (pieEl) pieEl.style.display = '';
    if (panelEl) panelEl.style.display = '';
    if (headerEl) headerEl.style.display = '';

    const pieData = archetypes.map((a, i) => ({
        ...a,
        value: hasDay2 ? (a.day2Count || 0) : a.day1Count,
        percent: hasDay2 ? (a.day2Percent || 0) : a.day1Percent,
        color: DEFAULT_COLORS[i % DEFAULT_COLORS.length]
    }));

    // Title stays as the static "METAGAME" string from the HTML — no
    // longer cleared here. Layouts that bake the title into the bg PNG
    // (TES) hide it via --meta-title-display: none in CSS.

    const rootStyle = getComputedStyle(document.documentElement);
    const subtitleEl = document.getElementById('metagame-subtitle');
    if (hasDay2) {
        const day2Visible = rootStyle.getPropertyValue('--meta-subtitle-day2-visible').trim() || 'block';
        subtitleEl.style.display = day2Visible;
        subtitleEl.textContent = 'DAY 2';
    } else {
        const day1Visible = rootStyle.getPropertyValue('--meta-subtitle-day1-visible').trim() || 'block';
        subtitleEl.style.display = day1Visible;
        subtitleEl.textContent = 'DAY 1';
    }

    // Iterative pie sizing — shrink if labels get nudged too far from their slices
    const rootStyleInit = getComputedStyle(document.documentElement);
    const configuredSize = parseInt(rootStyleInit.getPropertyValue('--meta-pie-size')) || 500;
    const minSize = Math.round(configuredSize * 0.7);
    let currentSize = null; // null = use configured size
    for (let attempt = 0; attempt < 5; attempt++) {
        const result = renderPieChart(pieData, currentSize);
        if (!result.nudgeExceeded) break;
        // Shrink and retry
        currentSize = (currentSize || result.size) - 10;
        if (currentSize < minSize) break;
    }

    // Side panel: always top 15 + Other (independent of pie showCount)
    const allArchetypes = metagameData._allArchetypes || [];
    const day1Total = metagameData._day1Total || 0;
    const day2Total = metagameData._day2Total || null;
    const activeTotal = hasDay2 ? (day2Total || 0) : day1Total;
    const panelMax = 15;

    let panelData;
    if (allArchetypes.length <= panelMax + 1) {
        // 16 or fewer archetypes — show all, no Other
        panelData = allArchetypes.map((a, i) => ({
            name: a.name,
            day1Count: a.day1Count,
            day1Percent: parseFloat(a.day1Percent) || 0,
            day2Count: a.day2Count !== null && a.day2Count !== undefined ? parseInt(a.day2Count) : null,
            day2Percent: a.day2Percent !== null && a.day2Percent !== undefined ? parseFloat(a.day2Percent) : null,
            conversion: a.conversion !== null && a.conversion !== undefined ? parseFloat(a.conversion) : null,
            percent: hasDay2 ? (parseFloat(a.day2Percent) || 0) : (parseFloat(a.day1Percent) || 0),
            portrait: getPortraitUrl(a.name),
            color: DEFAULT_COLORS[i % DEFAULT_COLORS.length]
        }));
    } else {
        // More than 16 — show top 15 + Other
        const top15 = allArchetypes.slice(0, panelMax);
        const otherDay1Count = day1Total - top15.reduce((sum, a) => sum + a.day1Count, 0);
        const otherDay1Pct = day1Total > 0 ? (otherDay1Count / day1Total * 100) : 0;
        const otherDay2Count = day2Total ? (day2Total - top15.reduce((sum, a) => sum + (parseInt(a.day2Count) || 0), 0)) : null;
        const otherDay2Pct = day2Total && day2Total > 0 ? (otherDay2Count / day2Total * 100) : null;
        const otherConv = day2Total && otherDay1Count > 0 ? (otherDay2Count / otherDay1Count * 100) : null;

        panelData = top15.map((a, i) => ({
            name: a.name,
            day1Count: a.day1Count,
            day1Percent: parseFloat(a.day1Percent) || 0,
            day2Count: a.day2Count !== null && a.day2Count !== undefined ? parseInt(a.day2Count) : null,
            day2Percent: a.day2Percent !== null && a.day2Percent !== undefined ? parseFloat(a.day2Percent) : null,
            conversion: a.conversion !== null && a.conversion !== undefined ? parseFloat(a.conversion) : null,
            percent: hasDay2 ? (parseFloat(a.day2Percent) || 0) : (parseFloat(a.day1Percent) || 0),
            portrait: getPortraitUrl(a.name),
            color: DEFAULT_COLORS[i % DEFAULT_COLORS.length]
        }));
        panelData.push({
            name: 'Other',
            day1Count: otherDay1Count,
            day1Percent: otherDay1Pct,
            day2Count: otherDay2Count,
            day2Percent: otherDay2Pct,
            conversion: otherConv,
            percent: hasDay2 ? (otherDay2Pct || 0) : otherDay1Pct,
            portrait: '',
            color: DEFAULT_COLORS[panelMax % DEFAULT_COLORS.length]
        });
    }

    renderSidePanel(panelData, hasDay2, activeTotal);
}

// ── "Most Played Decks" — 8-card render (CSL default + uvs) ───────────────────
// Card origins (= portrait-box top-left) in PSD/page px, in rank order:
// left column ranks 1-4 (top→bottom), then right column ranks 5-8 (top→bottom).
const MPD_SLOTS = [
    { x: 236,  y: 137 }, { x: 236,  y: 318 }, { x: 236,  y: 502 }, { x: 236,  y: 688 },
    { x: 1276, y: 137 }, { x: 1276, y: 318 }, { x: 1276, y: 502 }, { x: 1276, y: 688 },
];

// Animated legend art (transparent VP9-alpha webm) for the central figure.
// Each animation has its OWN canvas/framing (unlike the square 1200² PNGs), so the
// face focus (left/top %) + render height live here PER-ANIMATION, not in
// RIFTBOUND_PORTRAIT_FOCUS. Legends absent from this map fall back to their PNG.
const RIFTBOUND_LEGEND_ART_ANIM = {
    // All 32 animated legends, face-anchored to a shared target (face lands at ~950,275 on the
    // 1920×1080 stage, rendered ~210px tall) so every figure's face sits in the same spot at the
    // same apparent size regardless of how each .mov is cropped. Tags: KEEP = hand-locked (Yi is
    // the reference pose/size); det(score) = YuNet auto-detected face; HAND = eye-marked (mask or
    // monster YuNet can't see). All values are absolute px — nudge left/top/height with heroDebug()
    // then re-bake. (Source aspect kept as a decimal so width = round(height × aspect).)
    "Ahri, Nine-Tailed Fox": { src: '/assets/animations/riftbound/legend-art/ahri-nine-tailed-fox.webm', aspect: 1.7778, height: 2104, width: 3741, left: -900, top: -265 },  // det(0.91)
    "Annie, Dark Child": { src: '/assets/animations/riftbound/legend-art/annie-dark-child.webm', aspect: 0.55, height: 1744, width: 959, left: 445, top: -109 },  // det(0.93)
    "Darius, Hand of Noxus": { src: '/assets/animations/riftbound/legend-art/darius-hand-of-noxus.webm', aspect: 1.3924, height: 1383, width: 1926, left: -104, top: -132 },  // det(0.91)
    "Diana, Scorn of the Moon": { src: '/assets/animations/riftbound/legend-art/diana-scorn-of-the-moon.webm', aspect: 1.0825, height: 2688, width: 2910, left: -1000, top: 63 },  // KEEP
    "Draven, Glorious Executioner": { src: '/assets/animations/riftbound/legend-art/draven-glorious-executioner.webm', aspect: 1.0, height: 1989, width: 1989, left: -219, top: -176 },  // det(0.83)
    "Ezreal, Prodigal Explorer": { src: '/assets/animations/riftbound/legend-art/ezreal-prodigal-explorer.webm', aspect: 0.8, height: 2199, width: 1759, left: 206, top: -118 },  // det(0.93)
    "Fiora, Grand Duelist": { src: '/assets/animations/riftbound/legend-art/fiora-grand-duelist.webm', aspect: 0.774, height: 2354, width: 1822, left: -20, top: -629 },  // det(0.91)
    "Garen, Might of Demacia": { src: '/assets/animations/riftbound/legend-art/garen-might-of-demacia.webm', aspect: 0.9768, height: 2010, width: 1963, left: 537, top: -315 },  // det(0.92)
    "Irelia, Blade Dancer": { src: '/assets/animations/riftbound/legend-art/irelia-blade-dancer.webm', aspect: 1.0, height: 2893, width: 2893, left: -448, top: -209 },  // det(0.92)
    "Ivern, Green Father": { src: '/assets/animations/riftbound/legend-art/ivern-green-father.webm', aspect: 0.8639, height: 2333, width: 2016, left: -18, top: -192 },  // HAND
    "Jhin, Virtuoso": { src: '/assets/animations/riftbound/legend-art/jhin-virtuoso.webm', aspect: 0.7778, height: 2846, width: 2213, left: -175, top: -167 },  // det(0.83)
    "Jinx, Loose Cannon": { src: '/assets/animations/riftbound/legend-art/jinx-loose-cannon.webm', aspect: 1.1788, height: 1899, width: 2238, left: 3, top: -40 },  // det(0.89)
    "Kai'Sa, Daughter of the Void": { src: '/assets/animations/riftbound/legend-art/kaisa-daughter-of-the-void.webm', aspect: 1.263, height: 1886, width: 2382, left: -448, top: -189 },  // KEEP
    "Kha'Zix, Voidreaver": { src: '/assets/animations/riftbound/legend-art/khazix-voidreaver.webm', aspect: 0.7159, height: 2100, width: 1503, left: 198, top: -416 },  // HAND (real-page corrected)
    "LeBlanc, Deceiver": { src: '/assets/animations/riftbound/legend-art/leblanc-deceiver.webm', aspect: 1.0, height: 3448, width: 3448, left: -674, top: -659 },  // det(0.92)
    "Lee Sin, Blind Monk": { src: '/assets/animations/riftbound/legend-art/lee-sin-blind-monk.webm', aspect: 0.9316, height: 2100, width: 1956, left: -67, top: -368 },  // HAND (real-page corrected)
    "Leona, Radiant Dawn": { src: '/assets/animations/riftbound/legend-art/leona-radiant-dawn.webm', aspect: 1.0, height: 2143, width: 2143, left: -38, top: -40 },  // det(0.9)
    "Lillia, Bashful Bloom": { src: '/assets/animations/riftbound/legend-art/lillia-bashful-bloom.webm', aspect: 0.7168, height: 3393, width: 2432, left: -71, top: -615 },  // det(0.89)
    "Lux, Lady of Luminosity": { src: '/assets/animations/riftbound/legend-art/lux-lady-of-luminosity.webm', aspect: 0.7368, height: 2529, width: 1863, left: -158, top: -2 },  // KEEP
    "Master Yi, Wuju Bladesman": { src: '/assets/animations/riftbound/legend-art/master-yi-wuju-bladesman.webm', aspect: 0.61, height: 3200, width: 1952, left: 126, top: -1264 },  // KEEP (reference)
    "Master Yi, Wuju Master": { src: '/assets/animations/riftbound/legend-art/master-yi-wuju-master.webm', aspect: 1.25, height: 2100, width: 2625, left: -362, top: -126 },  // HAND (real-page corrected)
    "Miss Fortune, Bounty Hunter": { src: '/assets/animations/riftbound/legend-art/miss-fortune-bounty-hunter.webm', aspect: 0.9406, height: 2349, width: 2209, left: -217, top: -335 },  // det(0.91)
    "Poppy, Keeper of the Hammer": { src: '/assets/animations/riftbound/legend-art/poppy-keeper-of-the-hammer.webm', aspect: 1.0417, height: 2333, width: 2431, left: -168, top: -663 },  // HAND (real-page corrected)
    "Pyke, Bloodharbor Ripper": { src: '/assets/animations/riftbound/legend-art/pyke-bloodharbor-ripper.webm', aspect: 0.8284, height: 2333, width: 1933, left: -94, top: -345 },  // HAND (real-page corrected)
    "Rengar, Pridestalker": { src: '/assets/animations/riftbound/legend-art/rengar-pridestalker.webm', aspect: 1.1812, height: 1750, width: 2067, left: 20, top: -110 },  // HAND
    "Sett, The Boss": { src: '/assets/animations/riftbound/legend-art/sett-the-boss.webm', aspect: 1.044, height: 2433, width: 2540, left: -121, top: -174 },  // det(0.91)
    "Teemo, Swift Scout": { src: '/assets/animations/riftbound/legend-art/teemo-swift-scout.webm', aspect: 0.7521, height: 1909, width: 1436, left: 261, top: -489 },  // HAND
    "Vex, Gloomist": { src: '/assets/animations/riftbound/legend-art/vex-gloomist.webm', aspect: 0.7979, height: 3000, width: 2394, left: 749, top: -418 },  // HAND (real-page corrected; small char beside big companion — may want manual love)
    "Vi, Piltover Enforcer": { src: '/assets/animations/riftbound/legend-art/vi-piltover-enforcer.webm', aspect: 0.7727, height: 2253, width: 1741, left: 197, top: -80 },  // det(0.9)
    "Viktor, Herald of the Arcane": { src: '/assets/animations/riftbound/legend-art/viktor-herald-of-the-arcane.webm', aspect: 1.0, height: 2100, width: 2100, left: 47, top: -376 },  // HAND
    "Volibear, Relentless Storm": { src: '/assets/animations/riftbound/legend-art/volibear-relentless-storm.webm', aspect: 0.8348, height: 2389, width: 1994, left: -29, top: -148 },  // KEEP
    "Yasuo, Unforgiven": { src: '/assets/animations/riftbound/legend-art/yasuo-unforgiven.webm', aspect: 0.9836, height: 3349, width: 3294, left: -788, top: -692 },  // det(0.9)
};

// ── Dev helper: precisely position the animated central figure from DevTools.
// On the metagame page open the Console and run:
//   tuneHero({ x: -50 })   move 50px  (x: +right / -left)
//   tuneHero({ y: 30 })    move 30px  (y: +down / -up)
//   tuneHero({ h: 200 })   200px taller, scaled around its centre  (negative = smaller)
//   tuneHero({ left: 300, top: -1200, height: 3000 })   set exact values
//   tuneHero()             just print the current numbers
// It logs { left, top, height, width } — paste those back to me and I'll bake them in.
window.tuneHero = (p = {}) => {
    const v = document.getElementById('mpd-character-video');
    if (!v || v.style.display === 'none' || !v.style.height) {
        console.warn('[tuneHero] no animated figure on screen — make an animated legend the #1 card first');
        return null;
    }
    const px = k => parseFloat(v.style[k]) || 0;
    const aspect = (v.videoWidth && v.videoHeight) ? v.videoWidth / v.videoHeight : 0.61;
    if (p.h != null || p.height != null) {
        // resize around the current centre so the figure doesn't jump
        const oH = px('height'), oW = px('width');
        const cx = px('left') + oW / 2, cy = px('top') + oH / 2;
        const nH = p.height != null ? p.height : oH + p.h;
        const nW = Math.round(nH * aspect);
        v.style.height = nH + 'px'; v.style.width = nW + 'px';
        v.style.left = Math.round(cx - nW / 2) + 'px';
        v.style.top  = Math.round(cy - nH / 2) + 'px';
    }
    if (p.x != null)    v.style.left = Math.round(px('left') + p.x) + 'px';
    if (p.left != null) v.style.left = p.left + 'px';
    if (p.y != null)    v.style.top  = Math.round(px('top') + p.y) + 'px';
    if (p.top != null)  v.style.top  = p.top + 'px';
    const out = { left: px('left'), top: px('top'), height: px('height'), width: px('width') };
    console.log('%c[tuneHero] ' + JSON.stringify(out) + '  ← paste these to me to bake', 'color:#d7a63f;font-weight:bold');
    return out;
};

// ── Hero positioning DEBUG MENU — toggle in the console with heroDebug() ──────────
// On the metagame page with an animated legend as #1: drag the figure to move it,
// arrow keys nudge (Shift = 10px), [ and ] resize (Shift = 100px). A green crosshair
// marks the shared face target. "💾 Save to code" writes the position straight into
// RIFTBOUND_LEGEND_ART_ANIM (POST /save-hero-position) so it persists across reloads and to
// every client; "Copy config" just copies the numbers. (Sibling of debugFocus() for the PNGs.)
let _heroDebugCleanup = null;
window.heroDebug = function () {
    if (_heroDebugCleanup) { _heroDebugCleanup(); console.log('[heroDebug] off'); return; }
    const v = document.getElementById('mpd-character-video');
    if (!v || getComputedStyle(v).display === 'none' || !v.style.height) {
        console.warn('[heroDebug] make an animated legend the #1 figure first'); return;
    }
    const px = k => parseFloat(v.style[k]) || 0;
    const aspect = (v.videoWidth && v.videoHeight) ? v.videoWidth / v.videoHeight : (px('width') / px('height')) || 0.61;
    const scale = () => (v.getBoundingClientRect().width / (px('width') || 1)) || 1;
    v.style.pointerEvents = 'auto';
    v.style.outline = '2px dashed rgba(215,166,63,.7)';

    const cross = document.createElement('div'); cross.id = 'hero-debug-cross';
    Object.assign(cross.style, { position: 'absolute', left: 0, top: 0, width: '1920px', height: '1080px', pointerEvents: 'none', zIndex: 60 });
    cross.innerHTML =
        '<div style="position:absolute;left:910px;top:0;width:1px;height:1080px;background:rgba(60,180,75,.7)"></div>' +
        '<div style="position:absolute;left:0;top:274px;width:1920px;height:1px;background:rgba(60,180,75,.7)"></div>' +
        '<div style="position:absolute;left:910px;top:274px;width:16px;height:16px;border:2px solid #3cb44b;border-radius:50%;transform:translate(-50%,-50%)"></div>';
    document.getElementById('most-played-decks').appendChild(cross);

    const panel = document.createElement('div'); panel.id = 'hero-debug-panel';
    Object.assign(panel.style, { position: 'fixed', top: '10px', right: '10px', zIndex: 99999,
        background: 'rgba(13,10,26,.94)', color: '#fff', font: '12px/1.5 monospace',
        padding: '10px 12px', borderRadius: '8px', border: '1px solid #d7a63f', width: '240px' });
    document.body.appendChild(panel);

    const apply = o => { for (const k in o) v.style[k] = Math.round(o[k]) + 'px'; render(); };
    const nudge = (dx, dy) => apply({ left: px('left') + dx, top: px('top') + dy });
    const resize = dh => { const oH = px('height'), oW = px('width'), cx = px('left') + oW / 2, cy = px('top') + oH / 2, nH = oH + dh, nW = nH * aspect; apply({ height: nH, width: nW, left: cx - nW / 2, top: cy - nH / 2 }); };
    function render() {
        const r = { left: px('left'), top: px('top'), height: px('height'), width: px('width') };
        panel.innerHTML = `<b style="color:#d7a63f">heroDebug · ${(window.__heroName || '').split(',')[0]}</b><br>` +
            `left ${r.left}&nbsp; top ${r.top}<br>height ${r.height}&nbsp; width ${r.width}<br>` +
            `<span style="opacity:.7">drag · arrows (⇧10) · [ ] size</span>`;
        const mk = (t, fn, col) => { const b = document.createElement('button'); b.textContent = t; Object.assign(b.style, { marginTop: '6px', width: '100%', cursor: 'pointer', padding: '4px', background: col || '', color: col ? '#fff' : '', border: col ? 'none' : '', borderRadius: '4px' }); b.onclick = () => fn(b); panel.appendChild(b); };
        mk('💾 Save to code', async (b) => {
            const cur = { left: px('left'), top: px('top'), width: px('width'), height: px('height') };
            const nm = window.__heroName; b.textContent = 'Saving…';
            try {
                const res = await fetch('/save-hero-position', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nm, ...cur }) });
                const j = await res.json();
                if (j.ok) { if (RIFTBOUND_LEGEND_ART_ANIM[nm]) Object.assign(RIFTBOUND_LEGEND_ART_ANIM[nm], cur); b.textContent = '✓ saved'; console.log('[heroDebug] saved to broadcast-metagame.js:', nm, cur); }
                else { b.textContent = '✗ ' + (j.error || 'error'); console.warn('[heroDebug] save failed:', j); }
            } catch (e) { b.textContent = '✗ ' + e.message; console.warn('[heroDebug] save failed:', e); }
        }, '#3cb44b');
        mk('Copy config', () => { const s = `left: ${r.left}, top: ${r.top}, width: ${r.width}, height: ${r.height}`; navigator.clipboard && navigator.clipboard.writeText(s); console.log('[heroDebug]', window.__heroName, '→', s); });
        mk('Close', () => window.heroDebug());
    }
    render();

    let drag = false, sx = 0, sy = 0, sl = 0, st = 0;
    const md = e => { drag = true; sx = e.clientX; sy = e.clientY; sl = px('left'); st = px('top'); e.preventDefault(); };
    const mm = e => { if (!drag) return; const s = scale(); apply({ left: sl + (e.clientX - sx) / s, top: st + (e.clientY - sy) / s }); };
    const mu = () => { drag = false; };
    const kd = e => { const s = e.shiftKey ? 10 : 1, k = e.key;
        if (k === 'ArrowLeft') nudge(-s, 0); else if (k === 'ArrowRight') nudge(s, 0); else if (k === 'ArrowUp') nudge(0, -s); else if (k === 'ArrowDown') nudge(0, s);
        else if (k === ']' || k === '=' || k === '+') resize(e.shiftKey ? 100 : 20); else if (k === '[' || k === '-' || k === '_') resize(e.shiftKey ? -100 : -20); else return;
        e.preventDefault(); };
    v.addEventListener('mousedown', md);
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
    document.addEventListener('keydown', kd);

    _heroDebugCleanup = () => {
        panel.remove(); cross.remove();
        v.removeEventListener('mousedown', md);
        document.removeEventListener('mousemove', mm);
        document.removeEventListener('mouseup', mu);
        document.removeEventListener('keydown', kd);
        v.style.pointerEvents = 'none'; v.style.outline = '';
        _heroDebugCleanup = null;
    };
    console.log('[heroDebug] on — drag the figure, arrows nudge, [ ] resize, "Save to code" to persist. heroDebug() again to close.');
};

function renderMostPlayedDecks(hasDay2) {
    const root = document.getElementById('most-played-decks');
    const cards = document.getElementById('mpd-cards');
    if (!root || !cards) return;
    // Cards + central figure follow the operator's EDITED archetype cards
    // (parseMetagameFields reads the flat meta-breakdown-archetype-N fields the
    // master-control sends), so renaming card #1 changes the #1 figure live —
    // not just whatever Calculate Metagame computed. Pad any unfilled slots from
    // the calculated sorted list (_allArchetypes) so all 8 cards stay populated
    // when the operator displays fewer than 8.
    const edited = parseMetagameFields(metagameData);
    const sorted = metagameData._allArchetypes || [];
    const all = edited.length ? edited.slice() : sorted.slice();
    if (sorted.length) {
        const have = new Set(all.map(a => a.name));
        for (const a of sorted) {
            if (all.length >= MPD_SLOTS.length) break;
            if (!have.has(a.name)) all.push(a);
        }
    }
    const top = all.slice(0, MPD_SLOTS.length);

    // Central figure = the #1 most-played legend, over the portal. Animated legends
    // play the transparent webm <video>; the rest show the static PNG <img>. Both
    // anchor the FACE to a fixed point (centred, just above the headline) so the
    // figure lands consistently regardless of pose/framing.
    const charEl = document.getElementById('mpd-character');
    const vidEl  = document.getElementById('mpd-character-video');
    if (charEl && vidEl) {
        const topName = (all[0] && all[0].name) || '';
        window.__heroName = topName;   // for the heroDebug() positioning menu
        const anim = RIFTBOUND_LEGEND_ART_ANIM[topName];
        const FACE_X = 960, FACE_Y = 250;
        if (anim) {
            charEl.style.display = 'none'; charEl.src = '';
            vidEl.style.display = 'block';   // explicit — '' would revert to the CSS display:none
            if (!vidEl.src || vidEl.src.indexOf(anim.src) === -1) { vidEl.src = anim.src; vidEl.play().catch(() => {}); }
            const vH = anim.height, vW = anim.width || Math.round(vH * anim.aspect);
            const vFaceY = (anim.faceY != null) ? anim.faceY : FACE_Y;   // animations sit higher than the PNG default
            vidEl.style.height = vH + 'px';
            vidEl.style.width  = vW + 'px';   // explicit — <video> width:auto won't scale to the intrinsic aspect like <img>
            // Explicit left/top (hand-tuned via tuneHero) win; otherwise face-anchor math.
            vidEl.style.left = (anim.left != null ? anim.left : Math.round(FACE_X - (anim.faceLeft / 100) * vW)) + 'px';
            vidEl.style.top  = (anim.top  != null ? anim.top  : Math.round(vFaceY - (anim.faceTop  / 100) * vH)) + 'px';
        } else {
            vidEl.style.display = 'none'; vidEl.removeAttribute('src'); vidEl.load();
            charEl.style.display = '';
            charEl.src = (topName && getPortraitUrl(topName)) || '';
            // heroScale normalises apparent size: a full-body pose (small face in a
            // tall frame, e.g. Lux) scales UP so its face matches a tight crouch.
            const cf = getPortraitFocus(topName);
            const charH = Math.round(1050 * cf.heroScale);
            charEl.style.height = charH + 'px';
            charEl.style.left = Math.round(FACE_X - (cf.left / 100) * charH) + 'px';
            charEl.style.top  = Math.round(FACE_Y - (cf.top  / 100) * charH) + 'px';
        }
    }

    cards.innerHTML = '';
    top.forEach((a, i) => {
        const slot = MPD_SLOTS[i];
        if (!slot) return;
        const total = hasDay2 ? (parseInt(a.day2Count) || 0) : (parseInt(a.day1Count) || 0);
        const pct   = hasDay2 ? (parseFloat(a.day2Percent) || 0) : (parseFloat(a.day1Percent) || 0);
        const portraitUrl = getPortraitUrl(a.name) || '';
        const focus = getPortraitFocus(a.name);
        // Headshot framing into the 147×127 portrait area (matches .mpd-portrait):
        // scale the square source to 3× the area width, then place the face (focus
        // left/top %) centred horizontally and TGT_Y down. px-based so the landscape
        // area keeps the source square. (%27-encode apostrophes — e.g. "Kai'Sa" —
        // so they can't terminate the url('…') string.)
        const PW = 150, PH = 150, Z = 3.0, TGT_Y = 0.40;
        const imgPx = Math.round(Z * PW);
        const bgX = Math.round(PW * 0.5 - (focus.left / 100) * imgPx);
        const bgY = Math.round(PH * TGT_Y - (focus.top / 100) * imgPx);
        const portraitStyle = portraitUrl
            ? `background-image:url('${portraitUrl.replace(/'/g, '%27')}');background-size:${imgPx}px ${imgPx}px;background-position:${bgX}px ${bgY}px`
            : '';

        // Full CSS chrome: box + panel are the navy/gold frame; the portrait
        // headshot sits in the box; name/divider/labels/value-pills in the panel.
        // DOM order = paint order — divider BEFORE name so the centred name paints
        // on top of (not cut by) the divider.
        const card = document.createElement('div');
        card.className = 'mpd-card';
        card.style.left = slot.x + 'px';
        card.style.top  = slot.y + 'px';
        // Box / panel / borders / divider / TOTAL+SHARE labels / pills all live in
        // the pixel-perfect #mpd-chrome PSD image; only the dynamic data is here.
        // The hexagon gem (.mpd-hex) sits on top of the portrait corner.
        card.innerHTML = `
            <div class="mpd-portrait" style="${portraitStyle}"></div>
            <div class="mpd-hex"></div>
            <div class="mpd-name">${(a.name || '').split(',')[0].trim()}</div>
            <div class="mpd-pill mpd-pill-total">${total}</div>
            <div class="mpd-pill mpd-pill-share">${Math.round(pct)}%</div>
        `;
        cards.appendChild(card);
    });

    // Dynamic DAY label in the footer (replaces the old baked "DAY 1").
    const dayEl = root.querySelector('.mpd-footer-day');
    if (dayEl) dayEl.textContent = hasDay2 ? 'DAY 2' : 'DAY 1';

    root.classList.add('active');

    // Shrink any over-long legend name to fit its info-panel column. Re-run after
    // the font loads — Beaufort is async, and measuring against a fallback font
    // under-shrinks, so the name overflows once the real (wider) font swaps in.
    const fitNames = () => cards.querySelectorAll('.mpd-name').forEach(el => {
        el.style.fontSize = '';
        let size = 28;
        while (el.scrollWidth > el.clientWidth && size > 12) { size -= 1; el.style.fontSize = size + 'px'; }
    });
    fitNames();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNames);
}

// ── Pie Chart (D3.js) ────────────────────────────────────────────────────────
function renderPieChart(data, sizeOverride) {
    const svg = d3.select('#pie-chart');
    svg.selectAll('*').remove();

    const rootStyle = getComputedStyle(document.documentElement);
    const size = sizeOverride || parseInt(rootStyle.getPropertyValue('--meta-pie-size')) || 500;
    let _labelNudgeExceeded = false;
    const radius = size / 2;
    const innerRadius = radius * 0.15; // Small donut hole

    const viewBoxSize = 1080;
    svg.attr('viewBox', `${-viewBoxSize/2} ${-viewBoxSize/2} ${viewBoxSize} ${viewBoxSize}`)
       .style('overflow', 'visible');

    const g = svg.append('g');

    const pie = d3.pie()
        .value(d => d.value)
        .sort(null); // Keep order as-is (already sorted)

    const outerRadius = radius - 10;
    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const labelArc = d3.arc()
        .innerRadius(radius * 0.55)
        .outerRadius(radius * 0.55);

    const arcs = pie(data);

    // Determine top 3 slices by value for growth effect (exclude "Other")
    const sortedByValue = [...arcs]
        .filter(d => d.data.name !== 'Other')
        .sort((a, b) => b.data.value - a.data.value);
    const growthRanks = new Map();
    sortedByValue.slice(0, 3).forEach((d, rank) => {
        growthRanks.set(d.index, rank);
    });
    const GROWTH_EXTRA = [
        parseInt(rootStyle.getPropertyValue('--meta-explode-1')) || 60,
        parseInt(rootStyle.getPropertyValue('--meta-explode-2')) || 40,
        parseInt(rootStyle.getPropertyValue('--meta-explode-3')) || 25,
    ];

    // Per-slice arc generators for the grown state
    // Top 3 get larger outerRadius, "Other" gets smaller
    const OTHER_SHRINK = 40;
    const sliceArcs = arcs.map(d => {
        const rank = growthRanks.get(d.index);
        if (d.data.name === 'Other') {
            return d3.arc().innerRadius(innerRadius).outerRadius(outerRadius - OTHER_SHRINK);
        }
        const extra = rank !== undefined ? GROWTH_EXTRA[rank] : 0;
        return d3.arc().innerRadius(innerRadius).outerRadius(outerRadius + extra);
    });

    // Draw image-filled slices (all start at base outerRadius)
    arcs.forEach((d, i) => {
        const midAngle = (d.startAngle + d.endAngle) / 2;
        const rank = growthRanks.get(d.index);
        const grownOuterRadius = outerRadius + (rank !== undefined ? GROWTH_EXTRA[rank] : 0);

        const sliceGroup = g.append('g').attr('class', 'slice-group');

        // Clip path — starts at base size, will grow during animation
        sliceGroup.append('clipPath')
            .attr('id', `slice-clip-${i}`)
            .append('path')
            .attr('d', arc(d));

        // Black background behind portrait
        sliceGroup.append('path')
            .attr('class', 'slice-bg')
            .attr('fill', '#000')
            .each(function() {
                this._target = { startAngle: d.startAngle, endAngle: d.endAngle };
                this._sliceArcIndex = i;
            })
            .attr('d', arc({ startAngle: d.startAngle, endAngle: d.startAngle }));

        // Portrait image clipped to slice shape
        // Position based on grown radius so face is correct after growth
        if (d.data.portrait) {
            const focus = getPortraitFocus(d.data.name);
            const slicePercent = (d.endAngle - d.startAngle) / (2 * Math.PI) * 100;
            const centroidR = innerRadius + (grownOuterRadius - innerRadius) * (slicePercent <= 6 ? 0.6 : 0.5);
            const cx = Math.cos(midAngle - Math.PI / 2) * centroidR;
            const cy = Math.sin(midAngle - Math.PI / 2) * centroidR;

            const sliceAngle = d.endAngle - d.startAngle;
            const angleFactor = Math.sqrt(sliceAngle / Math.PI);
            const imgSize = grownOuterRadius * (1.0 + 2.5 * angleFactor) * focus.scale;

            const faceOffsetX = (focus.left / 100 - 0.5) * imgSize;
            const faceOffsetY = (focus.top / 100 - 0.5) * imgSize;

            sliceGroup.append('image')
                .attr('class', 'slice-image')
                .attr('data-slice', i)
                .attr('href', d.data.portrait)
                .attr('x', cx - imgSize / 2 - faceOffsetX)
                .attr('y', cy - imgSize / 2 - faceOffsetY)
                .attr('width', imgSize)
                .attr('height', imgSize)
                .attr('preserveAspectRatio', 'xMidYMid slice')
                .attr('clip-path', `url(#slice-clip-${i})`)
                .style('opacity', 0);
        }

        // Colored slice on top — starts at base arc size
        sliceGroup.append('path')
            .attr('class', 'slice')
            .attr('fill', d.data.portrait ? 'rgba(0,0,0,0.1)' : '#000')
            .attr('stroke', rootStyle.getPropertyValue('--meta-slice-stroke') || '#000')
            .attr('stroke-width', 0)
            .each(function() {
                this._target = { startAngle: d.startAngle, endAngle: d.endAngle };
                this._targetStrokeWidth = rootStyle.getPropertyValue('--meta-slice-stroke-width') || 2;
                this._sliceArcIndex = i;
            })
            .attr('d', arc({ startAngle: d.startAngle, endAngle: d.startAngle }));
    });

    // Re-select all slices for animation
    const slices = g.selectAll('.slice');

    // Outside labels
    const outerLabelRadius = outerRadius + (GROWTH_EXTRA[0] || 0) + 50;
    const labelLineInner = outerRadius + 5;
    const labelLineOuter = outerRadius + 15;

    const outerLabelArc = d3.arc()
        .innerRadius(outerLabelRadius)
        .outerRadius(outerLabelRadius);

    const lineInnerArc = d3.arc()
        .innerRadius(labelLineInner)
        .outerRadius(labelLineInner);

    const lineOuterArc = d3.arc()
        .innerRadius(labelLineOuter)
        .outerRadius(labelLineOuter);

    let leaderLines = g.selectAll('.leader-line'); // initially empty, populated after labels

    // Pass 1: Initial label positions at generous radius for collision avoidance
    const maxGrowth = GROWTH_EXTRA[0] || 0;
    const initialLabelR = outerRadius + maxGrowth + 200;
    const labelPositions = arcs.map(d => {
        const midAngle = (d.startAngle + d.endAngle) / 2;
        const rank = growthRanks.get(d.index);
        const isOther = d.data.name === 'Other';
        let sliceOuter = outerRadius;
        if (isOther) sliceOuter = outerRadius - OTHER_SHRINK;
        else if (rank !== undefined) sliceOuter = outerRadius + GROWTH_EXTRA[rank];
        const x = Math.cos(midAngle - Math.PI / 2) * initialLabelR;
        const y = Math.sin(midAngle - Math.PI / 2) * initialLabelR;
        return { x, y, midAngle, _targetR: initialLabelR, sliceOuter };
    });

    // Push overlapping labels apart (dynamic spacing based on slice count)
    const sliceCount = labelPositions.length;
    const minSpacing = Math.max(40, 80 - sliceCount * 3);
    const maxIterations = Math.max(20, sliceCount * 5);
    const maxLabelR = initialLabelR + 100;
    for (let pass = 0; pass < maxIterations; pass++) {
        for (let i = 0; i < labelPositions.length; i++) {
            for (let j = i + 1; j < labelPositions.length; j++) {
                const a = labelPositions[i];
                const b = labelPositions[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minSpacing) {
                    const push = (minSpacing - dist) / 2;
                    const angle = Math.atan2(dy, dx);
                    a.x -= Math.cos(angle) * push;
                    a.y -= Math.sin(angle) * push;
                    b.x += Math.cos(angle) * push;
                    b.y += Math.sin(angle) * push;
                }
            }
        }
        // After each pass, clamp labels to valid radius range
        labelPositions.forEach(pos => {
            const currentR = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
            if (currentR < 1) return;
            const clampedR = Math.min(Math.max(currentR, pos._targetR), maxLabelR);
            const scale = clampedR / currentR;
            pos.x *= scale;
            pos.y *= scale;
        });
    }

    // Percentage labels (hidden, kept for animation reference)
    const percentLabels = g.selectAll('.slice-percent')
        .data(arcs)
        .enter()
        .append('text')
        .attr('class', 'slice-percent')
        .style('opacity', 0);

    // Combined name + percent labels with background rectangles
    const LABEL_PAD_X = 10, LABEL_PAD_Y = 6;
    const LABEL_GAP = 30; // desired gap from slice edge to nearest rect edge
    const labelGroups = arcs.map((d, i) => {
        if (d.data.percent < 1) return null;
        const pos = labelPositions[i];
        const isRight = pos.midAngle < Math.PI;
        const name = d.data.name.split(',')[0];
        const labelText = `${name} — ${d.data.percent.toFixed(1)}%`;

        const labelG = g.append('g')
            .attr('class', 'label-group')
            .style('opacity', 0);

        // Background rect (sized after text is rendered).
        // Fill / stroke / stroke-width are driven by the .label-bg CSS
        // rule via vars (--meta-label-bg, --meta-label-stroke,
        // --meta-label-stroke-width) so each layout can theme without
        // JS changes. Only the geometric attrs (rx/ry) stay here.
        const rect = labelG.append('rect')
            .attr('class', 'label-bg')
            .attr('rx', 4)
            .attr('ry', 4);

        // Text
        const anchor = isRight ? 'start' : 'end';
        const text = labelG.append('text')
            .attr('class', 'slice-label')
            .attr('text-anchor', anchor)
            .attr('dy', '0.35em')
            .text(labelText);

        // Size rect to fit text, shrink font if too wide
        const maxLabelWidth = parseInt(rootStyle.getPropertyValue('--meta-label-max-width')) || 220;
        let bbox = text.node().getBBox();
        if (bbox.width + LABEL_PAD_X * 2 > maxLabelWidth) {
            console.log(`[LabelCap] ${name}: ${(bbox.width + LABEL_PAD_X * 2).toFixed(0)}px → capped at ${maxLabelWidth}px`);
            const currentFontSize = parseFloat(rootStyle.getPropertyValue('--meta-label-font-size')) || 24;
            const newFontSize = currentFontSize * (maxLabelWidth / (bbox.width + LABEL_PAD_X * 2));
            text.style('font-size', `${newFontSize}px`);
            bbox = text.node().getBBox();
        }
        const rectX = bbox.x - LABEL_PAD_X;
        const rectY = bbox.y - LABEL_PAD_Y;
        const rectW = bbox.width + LABEL_PAD_X * 2;
        const rectH = bbox.height + LABEL_PAD_Y * 2;
        rect.attr('x', rectX).attr('y', rectY)
            .attr('width', rectW).attr('height', rectH);

        // Position label at a given angle, maintaining gap from slice edge
        function positionAtAngle(angle) {
            const targetR = pos.sliceOuter + LABEL_GAP;
            const anchorX = Math.cos(angle - Math.PI / 2) * targetR;
            const anchorY = Math.sin(angle - Math.PI / 2) * targetR;
            const onRight = angle < Math.PI;
            const goingDown = Math.sin(angle - Math.PI / 2) > 0;

            let ncX, ncY;
            if (onRight) {
                ncX = rectX;
                ncY = goingDown ? rectY : rectY + rectH;
            } else {
                ncX = rectX + rectW;
                ncY = goingDown ? rectY : rectY + rectH;
            }
            return { tx: anchorX - ncX, ty: anchorY - ncY };
        }

        // Pass 2: Initial position along slice midpoint angle
        let currentAngle = pos.midAngle;
        let { tx, ty } = positionAtAngle(currentAngle);

        // Pass 3: Slide along arc if label exceeds bounding box
        const BOUND_RIGHT = 490;
        const BOUND_LEFT = -750;
        const BOUND_BOTTOM = 470;
        const BOUND_TOP = -470;
        const ANGLE_STEP = 0.03;
        const MAX_ITER = 30;

        for (let iter = 0; iter < MAX_ITER; iter++) {
            const rRight = tx + rectX + rectW;
            const rLeft = tx + rectX;
            const rBottom = ty + rectY + rectH;
            const rTop = ty + rectY;

            let nudge = 0;
            if (rRight > BOUND_RIGHT) nudge = -ANGLE_STEP;
            else if (rLeft < BOUND_LEFT) nudge = ANGLE_STEP;
            else if (rBottom > BOUND_BOTTOM) nudge = -ANGLE_STEP;
            else if (rTop < BOUND_TOP) nudge = ANGLE_STEP;
            else break; // within bounds

            currentAngle += nudge;
            ({ tx, ty } = positionAtAngle(currentAngle));
        }

        // Track nudge for iterative sizing
        const sliceSpan = d.endAngle - d.startAngle;
        const nudgeAmount = Math.abs(currentAngle - pos.midAngle);
        if (nudgeAmount > sliceSpan / 2) {
            _labelNudgeExceeded = true;
        }

        labelG.attr('transform', `translate(${tx}, ${ty})`);

        return labelG;
    });

    // Post-placement collision resolution on actual label positions
    const placedLabels = labelGroups.filter(lg => lg !== null);
    const labelRects = placedLabels.map(lg => {
        const node = lg.node();
        const rect = node.querySelector('rect');
        const transform = lg.attr('transform');
        const match = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
        const tx = match ? parseFloat(match[1]) : 0;
        const ty = match ? parseFloat(match[2]) : 0;
        const rx = parseFloat(rect.getAttribute('x'));
        const ry = parseFloat(rect.getAttribute('y'));
        const rw = parseFloat(rect.getAttribute('width'));
        const rh = parseFloat(rect.getAttribute('height'));
        return { lg, tx, ty, origTy: ty, rx, ry, rw, rh, left: tx + rx, top: ty + ry, right: tx + rx + rw, bottom: ty + ry + rh };
    });

    const COLLISION_PAD = 4;
    for (let pass = 0; pass < 30; pass++) {
        let anyOverlap = false;
        for (let i = 0; i < labelRects.length; i++) {
            for (let j = i + 1; j < labelRects.length; j++) {
                const a = labelRects[i];
                const b = labelRects[j];
                const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
                const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
                if (overlapX > 0 && overlapY > 0) {
                    anyOverlap = true;
                    const pushY = (overlapY + COLLISION_PAD) / 2;
                    if (a.origTy < b.origTy) {
                        a.ty -= pushY; a.top -= pushY; a.bottom -= pushY;
                        b.ty += pushY; b.top += pushY; b.bottom += pushY;
                    } else {
                        a.ty += pushY; a.top += pushY; a.bottom += pushY;
                        b.ty -= pushY; b.top -= pushY; b.bottom -= pushY;
                    }
                }
            }
        }
        if (!anyOverlap) break;
    }

    // Apply adjusted positions
    labelRects.forEach(({ lg, tx, ty }) => {
        lg.attr('transform', `translate(${tx}, ${ty})`);
    });

    const nameLabels = g.selectAll('.label-group');

    leaderLines = g.selectAll('.leader-line');

    // Store references for animation
    window._pieElements = { slices, percentLabels, nameLabels, leaderLines, arc, sliceArcs, growthRanks, arcs, data, g, radius, innerRadius, outerRadius, OTHER_SHRINK };

    return { nudgeExceeded: _labelNudgeExceeded, size };
}

// ── Side Panel ───────────────────────────────────────────────────────────────
function renderSidePanel(data, hasDay2, activeTotal) {
    const panel = document.getElementById('archetype-cards-panel');
    panel.innerHTML = '';

    // Panel header — total player count
    const header = document.createElement('div');
    header.id = 'panel-header';
    header.textContent = `Total Players: ${activeTotal}`;
    panel.appendChild(header);

    // Show up to 16 items (15 archetypes + Other, or all if ≤15)
    const maxItems = 16;
    const items = data.slice(0, maxItems);

    items.forEach((archetype, i) => {
        const card = document.createElement('div');
        card.className = 'archetype-card';

        const shortName = archetype.name.split(',')[0];
        const count = hasDay2 ? (archetype.day2Count || 0) : archetype.day1Count;
        const displayName = `${shortName} (${count})`;
        const bgPortrait = archetype.name === 'Other'
            ? '/assets/images/riftbound/cards/riftbound-card-back.png'
            : getBgPortraitUrl(archetype.name);
        const portrait = bgPortrait
            ? `<img class="archetype-card-portrait" src="${bgPortrait}" alt="${shortName}">`
            : `<div class="archetype-card-portrait" style="background:#333;"></div>`;

        let countsText;
        if (hasDay2) {
            const d1Pct = archetype.day1Percent !== null ? `Day 1: ${parseFloat(archetype.day1Percent).toFixed(1)}%` : '';
            const d2Pct = archetype.day2Percent !== null ? `Day 2: ${parseFloat(archetype.day2Percent).toFixed(1)}%` : '';
            countsText = [d1Pct, d2Pct].filter(Boolean).join(' · ');
        } else {
            countsText = `Day 1: ${archetype.percent.toFixed(1)}%`;
        }

        card.innerHTML = `
            ${portrait}
            <div class="archetype-card-info">
                <div class="archetype-card-name">${displayName}</div>
                <div class="archetype-card-counts">${countsText}</div>
            </div>
        `;

        panel.appendChild(card);
    });

    // Store cards for animation
    window._cardElements = panel.querySelectorAll('#panel-header, .archetype-card');
}

// ── Animation ────────────────────────────────────────────────────────────────
function animateIn() {
    if (!window._pieElements) return;
    const { slices, percentLabels, nameLabels, leaderLines, arc, sliceArcs, growthRanks, arcs, data, g, radius, innerRadius, outerRadius, OTHER_SHRINK } = window._pieElements;

    const SLICE_DURATION = 1000;
    const SLICE_STAGGER = 0;
    const CARD_STAGGER = 80;

    // Animate each slice overlay + background + clip path simultaneously
    // Phase 1: Grow all slices using base arc (uniform outerRadius)
    const sliceBgs = g.selectAll('.slice-bg');

    slices.each(function(d, i) {
        const element = d3.select(this);
        const target = this._target;

        element.transition()
            .delay(i * SLICE_STAGGER)
            .duration(SLICE_DURATION)
            .ease(d3.easeCubicOut)
            .on('start', function() { d3.select(this).attr('stroke-width', this._targetStrokeWidth); })
            .attrTween('d', function() {
                const interpolate = d3.interpolate(
                    { startAngle: target.startAngle, endAngle: target.startAngle },
                    { startAngle: target.startAngle, endAngle: target.endAngle }
                );
                return t => {
                    const angles = interpolate(t);
                    const clipPath = g.select(`#slice-clip-${i} path`);
                    if (!clipPath.empty()) {
                        clipPath.attr('d', arc(angles));
                    }
                    return arc(angles);
                };
            });

        // Animate background path in sync
        const bg = sliceBgs.filter((_, idx) => idx === i);
        if (!bg.empty()) {
            bg.transition()
                .delay(i * SLICE_STAGGER)
                .duration(SLICE_DURATION)
                .ease(d3.easeCubicOut)
                .attrTween('d', function() {
                    const interpolate = d3.interpolate(
                        { startAngle: target.startAngle, endAngle: target.startAngle },
                        { startAngle: target.startAngle, endAngle: target.endAngle }
                    );
                    return t => arc(interpolate(t));
                });
        }

        // Fade in the image/video as the slice grows
        const sliceImage = g.selectAll('.slice-image').filter(function() { return +this.getAttribute('data-slice') === i; });
        if (!sliceImage.empty()) {
            sliceImage.transition()
                .delay(i * SLICE_STAGGER)
                .duration(SLICE_DURATION * 0.5)
                .style('opacity', 1);
        }
    });

    // Phase 2: Grow top 3 slices one at a time (biggest first), shrink "Other"
    const growDelay = arcs.length * SLICE_STAGGER + SLICE_DURATION;
    const GROW_DURATION = 800;
    const GROW_STAGGER = 200;

    slices.each(function(d, i) {
        const idx = this._sliceArcIndex;
        const targetArc = sliceArcs[idx];
        const rank = growthRanks.get(arcs[idx]?.index);
        const isOther = arcs[idx]?.data.name === 'Other';
        if (rank === undefined && !isOther) return;

        const target = this._target;
        const thisDelay = growDelay;

        const element = d3.select(this);
        element.transition()
            .delay(thisDelay)
            .duration(GROW_DURATION)
            .ease(d3.easeCubicOut)
            .attrTween('d', function() {
                return d3.interpolate(arc(target), targetArc(target));
            });

        // Also grow the clip path
        const clipPath = g.select(`#slice-clip-${i} path`);
        if (!clipPath.empty()) {
            clipPath.transition()
                .delay(thisDelay)
                .duration(GROW_DURATION)
                .ease(d3.easeCubicOut)
                .attrTween('d', function() {
                    return d3.interpolate(arc(target), targetArc(target));
                });
        }

        // Also grow the background
        const bg = sliceBgs.filter((_, bgIdx) => bgIdx === i);
        if (!bg.empty()) {
            bg.transition()
                .delay(thisDelay)
                .duration(GROW_DURATION)
                .ease(d3.easeCubicOut)
                .attrTween('d', function() {
                    return d3.interpolate(arc(target), targetArc(target));
                });
        }

        // Animate "Other" image to match shrunk radius
        if (isOther) {
            const sliceImage = g.selectAll('.slice-image').filter(function() { return +this.getAttribute('data-slice') === idx; });
            if (!sliceImage.empty()) {
                const sliceData = arcs[idx];
                const midAngle = (sliceData.startAngle + sliceData.endAngle) / 2;
                const focus = getPortraitFocus(sliceData.data.name);
                const sliceAngle = sliceData.endAngle - sliceData.startAngle;
                const angleFactor = Math.sqrt(sliceAngle / Math.PI);
                const shrunkR = outerRadius - OTHER_SHRINK;
                const slicePercent = sliceAngle / (2 * Math.PI) * 100;
                const newCentroidR = innerRadius + (shrunkR - innerRadius) * (slicePercent <= 6 ? 0.6 : 0.5);
                const newCx = Math.cos(midAngle - Math.PI / 2) * newCentroidR;
                const newCy = Math.sin(midAngle - Math.PI / 2) * newCentroidR;
                const newImgSize = shrunkR * (1.0 + 2.5 * angleFactor) * focus.scale;
                const newFaceOffsetX = (focus.left / 100 - 0.5) * newImgSize;
                const newFaceOffsetY = (focus.top / 100 - 0.5) * newImgSize;

                sliceImage.transition()
                    .delay(thisDelay)
                    .duration(GROW_DURATION)
                    .ease(d3.easeCubicOut)
                    .attr('x', newCx - newImgSize / 2 - newFaceOffsetX)
                    .attr('y', newCy - newImgSize / 2 - newFaceOffsetY)
                    .attr('width', newImgSize)
                    .attr('height', newImgSize);
            }
        }
    });

    // Fade in labels at the same time as growth starts
    const labelsDelay = growDelay;

    leaderLines.transition()
        .delay(labelsDelay)
        .duration(300)
        .style('opacity', 0.7);

    percentLabels.transition()
        .delay(labelsDelay + 100)
        .duration(300)
        .style('opacity', 1);

    nameLabels.transition()
        .delay(labelsDelay + 200)
        .duration(300)
        .style('opacity', 1);

    // Slide pie chart left at the same time as growth
    const slideDelay = growDelay;
    setTimeout(() => {
        const container = document.getElementById('pie-chart-container');
        const rootStyle = getComputedStyle(document.documentElement);
        const finalX = rootStyle.getPropertyValue('--meta-pie-x-final').trim() || '-280px';
        const currentY = rootStyle.getPropertyValue('--meta-pie-y').trim() || '0px';
        container.style.transform = `translate(${finalX}, ${currentY})`;
    }, slideDelay);

    // Show side panel after slide completes
    const panelDelay = slideDelay + 700;
    setTimeout(() => {
        document.getElementById('archetype-cards-panel')?.classList.add('active');
    }, panelDelay);

    // Animate side panel cards
    if (window._cardElements) {
        const cardsDelay = panelDelay + 100;
        window._cardElements.forEach((card, i) => {
            setTimeout(() => {
                card.classList.add('visible');
            }, cardsDelay + i * CARD_STAGGER);
        });
    }
}

function resetAnimation() {
    if (window._pieElements) {
        const { slices, percentLabels, nameLabels, leaderLines, g, arc } = window._pieElements;

        // Reset slices to zero (base arc, not grown)
        slices.each(function(d, i) {
            const target = this._target;
            d3.select(this)
                .attr('d', arc({ startAngle: target.startAngle, endAngle: target.startAngle }))
                .attr('stroke-width', 0);
        });
        percentLabels.style('opacity', 0);
        nameLabels.style('opacity', 0);
        leaderLines.style('opacity', 0);

        // Reset backgrounds to zero
        g.selectAll('.slice-bg').each(function(d, i) {
            const target = slices.nodes()[i]?._target;
            if (target) {
                d3.select(this).attr('d', arc({ startAngle: target.startAngle, endAngle: target.startAngle }));
            }
        });

        // Reset images to hidden
        g.selectAll('.slice-image').style('opacity', 0);


        // Reset clip paths to zero (base arc)
        g.selectAll('[id^="slice-clip-"] path').each(function(d, i) {
            const target = slices.nodes()[i]?._target;
            if (target) {
                d3.select(this).attr('d',
                    arc({ startAngle: target.startAngle, endAngle: target.startAngle })
                );
            }
        });
    }

    // Reset pie chart position (disable transition to avoid visible slide-right)
    const container = document.getElementById('pie-chart-container');
    if (container) {
        container.style.transition = 'none';
        container.style.transform = '';
        // Re-enable transition after a frame
        requestAnimationFrame(() => {
            container.style.transition = '';
        });
    }

    // Reset side panel
    document.getElementById('archetype-cards-panel')?.classList.remove('active');

    // Reset cards
    if (window._cardElements) {
        window._cardElements.forEach(card => card.classList.remove('visible'));
    }
}

// ── OBS Scene Detection (via server obs-websocket) ──────────────────────────
socket.on('obs-animate-metagame', () => {
    console.log('[Metagame] OBS transition to metagame — animating');
    resetAnimation();
    setTimeout(animateIn, 1000);
});

// Auto-animate on data load
socket.on('receive-meta-breakdown-data', () => {
    setTimeout(() => {
        resetAnimation();
        setTimeout(animateIn, 100);
    }, 200);
});

// ── Debug Focus Overlay ─────────────────────────────────────────────────────
// Toggle with: debugFocus()
// Shows each portrait unclipped with a crosshair at its focus point.
// Click a portrait to log its name + current focus for easy copy-paste.
let _debugOverlayActive = false;
window.debugFocus = function () {
    if (_debugOverlayActive) {
        document.getElementById('debug-focus-overlay')?.remove();
        _debugOverlayActive = false;
        console.log('[Debug] Focus overlay removed');
        return;
    }
    if (!window._pieElements) { console.warn('[Debug] No pie data yet'); return; }
    _debugOverlayActive = true;

    const overlay = document.createElement('div');
    overlay.id = 'debug-focus-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(0,0,0,0.85)', zIndex: 9999, overflow: 'hidden',
    });

    // Top toolbar
    const toolbar = document.createElement('div');
    Object.assign(toolbar.style, {
        display: 'flex', gap: '8px', padding: '8px 12px',
        background: 'rgba(0,0,0,0.95)', flexShrink: 0,
    });
    overlay.appendChild(toolbar);

    // Card grid container
    const grid = document.createElement('div');
    Object.assign(grid.style, {
        display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px',
        overflow: 'auto', flex: 1, alignContent: 'flex-start',
    });

    const { data } = window._pieElements;
    // Active legend names from current pie data
    const activeNames = new Set(data.filter(d => d.portrait).map(d => d.name));

    // Iterate ALL legends + "Other", not just active ones
    const allLegends = [
        ...Object.entries(RIFTBOUND_LEGENDS)
            .filter(([name, val]) => val !== null)
            .map(([name, val]) => ({ name, portrait: getPortraitUrl(name) })),
        { name: 'Other', portrait: getPortraitUrl('Other') },
    ].filter(l => l.portrait);

    allLegends.forEach(d => {
        const isActive = activeNames.has(d.name);
        const focus = getPortraitFocus(d.name);
        let currentScale = focus.scale;
        const card = document.createElement('div');
        Object.assign(card.style, {
            position: 'relative', width: '160px', height: '160px',
            border: isActive ? '3px solid #3cb44b' : '2px solid #555',
            borderRadius: '6px', overflow: 'hidden',
            cursor: 'pointer', flexShrink: 0,
            opacity: isActive ? '1' : '0.6',
        });

        const img = document.createElement('img');
        img.src = d.portrait;
        Object.assign(img.style, {
            width: '100%', height: '100%', objectFit: 'cover',
        });
        card.appendChild(img);

        // Crosshair at focus point
        const crossV = document.createElement('div');
        Object.assign(crossV.style, {
            position: 'absolute', top: 0, left: `${focus.left}%`,
            width: '2px', height: '100%', background: 'rgba(255,0,0,0.8)',
            pointerEvents: 'none',
        });
        card.appendChild(crossV);

        const crossH = document.createElement('div');
        Object.assign(crossH.style, {
            position: 'absolute', top: `${focus.top}%`, left: 0,
            width: '100%', height: '2px', background: 'rgba(255,0,0,0.8)',
            pointerEvents: 'none',
        });
        card.appendChild(crossH);

        // Dot at intersection
        const dot = document.createElement('div');
        Object.assign(dot.style, {
            position: 'absolute',
            top: `${focus.top}%`, left: `${focus.left}%`,
            width: '10px', height: '10px', borderRadius: '50%',
            background: 'red', border: '2px solid white',
            transform: 'translate(-50%, -50%)', pointerEvents: 'none',
        });
        card.appendChild(dot);

        // Label
        const updateLabel = () => {
            const f = PORTRAIT_FOCUS[d.name] || { top: focus.top, left: focus.left };
            const scaleStr = currentScale !== 1.0 ? ` s:${currentScale}` : '';
            label.textContent = `${d.name.split(',')[0]}  t:${f.top} l:${f.left}${scaleStr}`;
        };
        const label = document.createElement('div');
        Object.assign(label.style, {
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(0,0,0,0.7)', color: '#fff',
            fontSize: '11px', padding: '4px 6px', textAlign: 'center',
            fontFamily: 'monospace',
        });
        card.appendChild(label);
        updateLabel();

        // Click to log
        card.addEventListener('click', () => {
            const f = PORTRAIT_FOCUS[d.name] || { top: focus.top, left: focus.left };
            const scaleStr = currentScale !== 1.0 ? `, scale: ${currentScale}` : '';
            console.log(`'${d.name}': { top: ${f.top}, left: ${f.left}${scaleStr} },`);
        });

        // Right-click to reposition focus point
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = card.getBoundingClientRect();
            const newLeft = Math.round(((e.clientX - rect.left) / rect.width) * 100);
            const newTop = Math.round(((e.clientY - rect.top) / rect.height) * 100);
            PORTRAIT_FOCUS[d.name] = { top: newTop, left: newLeft, scale: currentScale };
            crossV.style.left = `${newLeft}%`;
            crossH.style.top = `${newTop}%`;
            dot.style.left = `${newLeft}%`;
            dot.style.top = `${newTop}%`;
            updateLabel();
            const scaleStr = currentScale !== 1.0 ? `, scale: ${currentScale}` : '';
            console.log(`'${d.name}': { top: ${newTop}, left: ${newLeft}${scaleStr} },`);
        });

        // Scroll wheel to adjust scale
        card.addEventListener('wheel', (e) => {
            e.preventDefault();
            currentScale = Math.round((currentScale + (e.deltaY < 0 ? 0.1 : -0.1)) * 10) / 10;
            currentScale = Math.max(0.5, Math.min(3.0, currentScale));
            const f = PORTRAIT_FOCUS[d.name] || { top: focus.top, left: focus.left };
            PORTRAIT_FOCUS[d.name] = { top: f.top, left: f.left, scale: currentScale };
            updateLabel();
            console.log(`'${d.name}': scale ${currentScale}`);
        });

        grid.appendChild(card);
    });
    overlay.appendChild(grid);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close & Re-render Pie';
    Object.assign(closeBtn.style, {
        padding: '8px 16px', fontSize: '14px', cursor: 'pointer',
        background: '#e6194b', color: '#fff', border: 'none', borderRadius: '6px',
    });
    closeBtn.addEventListener('click', () => {
        overlay.remove();
        _debugOverlayActive = false;
        // Re-render pie with updated focus values
        renderMetagame();
        setTimeout(() => {
            resetAnimation();
            setTimeout(animateIn, 100);
        }, 100);
    });
    toolbar.appendChild(closeBtn);

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save All Focus Values';
    Object.assign(saveBtn.style, {
        padding: '8px 16px', fontSize: '14px', cursor: 'pointer',
        background: '#3cb44b', color: '#fff', border: 'none', borderRadius: '6px',
    });
    saveBtn.addEventListener('click', async () => {
        // Build full focus map: merge current PORTRAIT_FOCUS (includes debug edits)
        // with any characters from the current data set
        const focusMap = { ...PORTRAIT_FOCUS };
        try {
            const res = await fetch('/save-portrait-focus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ focusMap }),
            });
            const result = await res.json();
            if (result.ok) {
                saveBtn.textContent = `✓ Saved ${result.count} values!`;
                console.log(`[Debug] Saved ${result.count} portrait focus values to file`);
            } else {
                saveBtn.textContent = '✗ Error!';
                console.error('[Debug] Save failed:', result.error);
            }
        } catch (err) {
            saveBtn.textContent = '✗ Error!';
            console.error('[Debug] Save failed:', err);
        }
        setTimeout(() => { saveBtn.textContent = 'Save All Focus Values'; }, 2000);
    });
    toolbar.appendChild(saveBtn);

    document.body.appendChild(overlay);
    console.log('[Debug] Focus overlay active. Right-click portraits to reposition focus. Close to re-render pie.');
};
