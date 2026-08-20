const socket = io();
window.roomManager = new RoomManager(socket);

let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';
let commentators = [];
let isVisible = false;
let autoHideTimer = null;

const AUTO_HIDE_MS = 5000;

// ── Natural image dimensions cache ──────────────────────────────────────────
// Preload the L3 background image once per URL and cache its naturalWidth/Height.
// Lets us size each .commentator-l3 to the PNG's intrinsic dimensions instead
// of a hardcoded 400x80, so the bar fills edge-to-edge at the right aspect.
const naturalDimsCache = new Map();
function getNaturalDims(url) {
    if (naturalDimsCache.has(url)) return Promise.resolve(naturalDimsCache.get(url));
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const d = { w: img.naturalWidth, h: img.naturalHeight };
            naturalDimsCache.set(url, d);
            resolve(d);
        };
        img.onerror = () => resolve({ w: 400, h: 80 }); // fallback to legacy size
        img.src = url;
    });
}

// ── Theme ───────────────────────────────────────────────────────────────────
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');

function updateTheme(game, vendor, playerCount) {
    document.body.classList.remove('mtg', 'riftbound', 'vibes', 'starwars');
    if (game) document.body.classList.add(game);

    const vc = window.VENDOR_CONFIG;
    if (vc) {
        vc.getAllOverrideProperties().forEach(prop => {
            document.documentElement.style.removeProperty(prop);
        });
        const overrides = vc.getOverrides(game, vendor, playerCount);
        Object.entries(overrides).forEach(([prop, value]) => {
            if (prop.endsWith('-bg-image') && value.includes('/assets/')) {
                const match = value.match(/url\(['"]?(.+?)['"]?\)/);
                if (match) {
                    const resolved = vc.getAssetPath(match[1], vendor, playerCount);
                    value = `url('${resolved}')`;
                }
            }
            document.documentElement.style.setProperty(prop, value);
        });
    }

    // Vendor/playerCount changes swap --comm-lt-bg-image to a different PNG
    // with different natural dims — re-run sizeAndScale so bars resize to
    // the new image. No-op if there are no commentators rendered yet.
    sizeAndScale();
}

socket.on('server-current-game-selection', ({ gameSelection }) => {
    currentGame = gameSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('game-selection-updated', ({ gameSelection }) => {
    currentGame = gameSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('server-current-vendor-selection', ({ vendorSelection }) => {
    currentVendor = vendorSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('vendor-selection-updated', ({ vendorSelection }) => {
    currentVendor = vendorSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('server-current-player-count', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('player-count-updated', ({ playerCount }) => {
    currentPlayerCount = playerCount;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});

// ── Commentator Data ────────────────────────────────────────────────────────
socket.on('update-match-global-data', (data) => {
    console.log('[CommL3] Received global data:', data);
    const g = data?.globalData || {};
    commentators = [];
    for (let i = 1; i <= 4; i++) {
        const name = (g[`global-commentator-${i}`] || '').trim();
        const social = (g[`global-commentator-${i}-subtext`] || '').trim();
        if (name) {
            commentators.push({ name, social });
        }
    }
    console.log('[CommL3] Parsed commentators:', commentators);
    renderCommentators();
});

// Request initial data
socket.emit('get-match-global-data');

// ── Auto-scale text to fit container width ─────────────────────────────────
function autoScaleText(element, maxFontSize, minFontSize, maxWidth) {
    if (!element || !element.innerHTML) return;

    element.style.whiteSpace = 'nowrap';
    element.style.fontSize = maxFontSize + 'px';

    const temp = document.createElement('span');
    temp.style.visibility = 'hidden';
    temp.style.position = 'absolute';
    temp.style.whiteSpace = 'nowrap';
    temp.style.font = window.getComputedStyle(element).font;
    temp.innerHTML = element.innerHTML;
    document.body.appendChild(temp);

    let currentSize = maxFontSize;
    temp.style.fontSize = currentSize + 'px';

    while (temp.offsetWidth > maxWidth && currentSize > minFontSize) {
        currentSize -= 1;
        temp.style.fontSize = currentSize + 'px';
    }

    element.style.fontSize = currentSize + 'px';
    document.body.removeChild(temp);
}

// ── Size cards to PNG natural dims, scale down if overflow ─────────────────
// Reads the resolved --comm-lt-bg-image, gets its natural pixel dimensions,
// writes them into --comm-lt-width/--comm-lt-height so each card matches the
// PNG exactly. Then, if N cards + gaps exceed the 1920 canvas, sets a single
// --comm-lt-scale multiplier that the stylesheet applies via calc() to every
// scalable property (card width/height, gap, font sizes, line heights,
// slide-up offset). The container stays a static 1920px so flex centering
// keeps content anchored to the canvas center without manual offsets.
async function sizeAndScale() {
    const container = document.getElementById('commentator-l3-container');
    if (!container || commentators.length === 0) return;

    const rootStyle = getComputedStyle(document.documentElement);
    const bgVar = rootStyle.getPropertyValue('--comm-lt-bg-image').trim();
    const match = bgVar.match(/url\(['"]?(.+?)['"]?\)/);
    if (!match) {
        document.documentElement.style.setProperty('--comm-lt-scale', 1);
        return;
    }

    const { w, h } = await getNaturalDims(match[1]);
    document.documentElement.style.setProperty('--comm-lt-width', w + 'px');
    document.documentElement.style.setProperty('--comm-lt-height', h + 'px');

    // Layout budget: 1920 canvas minus 100px safe-area margin on each side.
    // Gap stays fixed (not scaled) so bars absorb all overflow themselves.
    const SIDE_MARGIN = 100;
    const budget = 1920 - 2 * SIDE_MARGIN; // 1720
    const N = commentators.length;
    const gap = parseInt(rootStyle.getPropertyValue('--comm-lt-gap')) || 40;
    const totalNatural = N * w + (N - 1) * gap;
    const barBudget = budget - (N - 1) * gap;
    // When natural width exceeds the budget, scale only the bars (not gaps).
    // Math.max(0, ...) guards against gaps alone exceeding budget.
    const scale = totalNatural > budget
        ? Math.max(0, barBudget / (N * w))
        : 1;
    document.documentElement.style.setProperty('--comm-lt-scale', scale);

    // Clear legacy inline styles from prior implementations (zoom + manual
    // left offset). Container must stay at its CSS-declared left: 0.
    container.style.zoom = '';
    container.style.transform = '';
    container.style.left = '';
}

// ── Remote-caster mode ──────────────────────────────────────────────────────
// Server-held flag (master-control "Remote L3" toggle). When on, the screen
// divides into equal cam segments and each card is absolutely positioned
// bottom-centered in its segment: 1 full / 2 halves / 3 thirds / 4 = 2x2.
let remoteMode = false;

function remoteSegments(n) {
    if (n <= 1) return [[0, 0, 1920, 1080]];
    if (n === 2) return [[0, 0, 960, 1080], [960, 0, 1920, 1080]];
    if (n === 3) return [[0, 0, 640, 1080], [640, 0, 1280, 1080], [1280, 0, 1920, 1080]];
    return [[0, 0, 960, 540], [960, 0, 1920, 540], [0, 540, 960, 1080], [960, 540, 1920, 1080]];
}

function applyRemoteLayout() {
    document.body.classList.toggle('comm-remote', remoteMode);
    if (!remoteMode) {
        document.querySelectorAll('.commentator-l3').forEach(card => {
            card.style.left = ''; card.style.top = '';
        });
        return;
    }
    const rootStyle = getComputedStyle(document.documentElement);
    // 2x2 quadrants are tighter — shrink the plates so they don't crowd
    const scale = commentators.length >= 4 ? 0.82 : 1;
    document.documentElement.style.setProperty('--comm-lt-scale', scale);
    const w = (parseFloat(rootStyle.getPropertyValue('--comm-lt-width')) || 400) * scale;
    const h = (parseFloat(rootStyle.getPropertyValue('--comm-lt-height')) || 80) * scale;
    // Match the in-person row's FINAL resting height: container bottom
    // (--comm-lt-bottom) + the slide-up travel — so toggling remote on/off
    // keeps the cards at the same altitude (per segment) and the entrance
    // travels the same distance.
    const bottomOff = parseFloat(rootStyle.getPropertyValue('--comm-lt-bottom')) || 40;
    const slideUp = Math.abs(parseFloat(rootStyle.getPropertyValue('--comm-lt-slide-up')) || 200) * scale;
    const segs = remoteSegments(commentators.length);
    document.querySelectorAll('.commentator-l3').forEach((card, i) => {
        const [x0, , x1, y1] = segs[Math.min(i, segs.length - 1)];
        card.style.left = Math.round((x0 + x1) / 2 - w / 2) + 'px';
        card.style.top = Math.round(y1 - bottomOff - slideUp - h) + 'px';
    });
}

socket.on('server-comm-l3-remote', ({ remote }) => { remoteMode = !!remote; renderCommentators(); });
socket.on('comm-l3-remote-updated', ({ remote }) => { remoteMode = !!remote; renderCommentators(); });
socket.emit('get-comm-l3-remote');

// ── Render ──────────────────────────────────────────────────────────────────
function renderCommentators() {
    const container = document.getElementById('commentator-l3-container');
    container.innerHTML = '';

    commentators.forEach((c, i) => {
        const l3 = document.createElement('div');
        l3.className = 'commentator-l3';
        if (isVisible) l3.classList.add('active');

        const nameEl = document.createElement('div');
        nameEl.className = 'commentator-l3-name';
        nameEl.textContent = c.name;
        l3.appendChild(nameEl);

        if (c.social) {
            const socialEl = document.createElement('div');
            socialEl.className = 'commentator-l3-social';
            socialEl.textContent = c.social;
            l3.appendChild(socialEl);
        }

        container.appendChild(l3);
    });

    // Size cards to natural PNG dims + scale for overflow, then fit text
    // once fonts are ready. Await sizeAndScale so card dims are finalized
    // before autoScaleText measures. Measure card.offsetWidth directly so
    // we get the post-scale rendered width (CSS calc already applied).
    sizeAndScale().then(() => { applyRemoteLayout(); return document.fonts.ready; }).then(() => {
        document.querySelectorAll('.commentator-l3').forEach(card => {
            const nameEl = card.querySelector('.commentator-l3-name');
            if (!nameEl) return;
            const maxWidth = Math.floor(card.offsetWidth * 0.85);
            const maxFontSize = parseInt(window.getComputedStyle(nameEl).fontSize);
            autoScaleText(nameEl, maxFontSize, Math.floor(maxFontSize / 2), maxWidth);
        });
    });
}

// ── Toggle ──────────────────────────────────────────────────────────────────
function showL3s() {
    isVisible = true;
    document.querySelectorAll('.commentator-l3').forEach(el => {
        el.classList.add('active');
    });
    // Start auto-hide timer
    if (autoHideTimer) clearTimeout(autoHideTimer);
    autoHideTimer = setTimeout(hideL3s, AUTO_HIDE_MS);
}

function hideL3s() {
    isVisible = false;
    document.querySelectorAll('.commentator-l3').forEach(el => {
        el.classList.remove('active');
    });
    if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        autoHideTimer = null;
    }
}

socket.on('toggle-commentator-l3', () => {
    console.log('[CommL3] Toggle received, currently visible:', isVisible, 'commentators:', commentators.length);
    if (isVisible) {
        hideL3s();
    } else {
        showL3s();
    }
});
