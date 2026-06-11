import { RIFTBOUND_LEGENDS, RIFTBOUND_PORTRAIT_FOCUS } from './riftbound/constants.js';

const socket = io();
window.roomManager = new RoomManager(socket);

let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

const TOTAL_STANDINGS = 16;
const slider = document.getElementById('standings-slider');

// ── Per-legend portrait positioning (riftbound default 1v1 layout) ───────────
// Reuses the metagame's RIFTBOUND_PORTRAIT_FOCUS data — single source of
// truth, tuned once via the metagame's `debugFocus()` overlay. The source
// image is the same 1200×1200 master portrait the metagame consumes
// (URL transformed from /legend-portraits-251x124/ → 1200×1200 at render).
//
// To align the focus point (the dot at focus.left%, focus.top% in the
// 1200×1200) with the column center, we render the image larger than the
// 251×50 frame, wrap it in a frame div with overflow:hidden, then position
// the image absolutely so the focus pixel lands at the frame's center.
//
// At RENDER_PX = 150 with a 45×45 circular frame, the face dot from
// RIFTBOUND_PORTRAIT_FOCUS lands at the frame center for every legend.
// Math:
//   - Image: 150×150 (1200 → 150 = scale 0.125)
//   - Frame: 45×45
//   - Slack: 105 horizontal, 105 vertical
//   - For face at (focus.left%, focus.top%): faceX/Y = (pct/100) × 150
//   - Centerable range: pct must put face in [22.5, 127.5] of image
//     (= [15%, 85%] of source). Every legend in the focus map fits;
//     a few with focus.top under 15% (Lux 9, Diana 11) hit the clamp
//     and pin the image's top edge to the frame top — face appears
//     slightly above center but no gaps.
//
// Want a tighter / looser zoom on the face? Bump RENDER_PX (bigger = more
// zoom + bigger face + tighter frame fit; smaller = less zoom but more
// legends hit the clamp).
const STANDINGS_PORTRAIT_RENDER_PX = 150;
const STANDINGS_FRAME_W = 45;
const STANDINGS_FRAME_H = 45;

function applyStandingsPortraitFocus(imgEl, legendName) {
    const focus = RIFTBOUND_PORTRAIT_FOCUS[legendName] || { top: 30, left: 50 };
    const W = STANDINGS_PORTRAIT_RENDER_PX;
    const faceX = (focus.left / 100) * W;
    const faceY = (focus.top  / 100) * W;
    // Ideal positions: face at frame center.
    const idealLeft = STANDINGS_FRAME_W / 2 - faceX;
    const idealTop  = STANDINGS_FRAME_H / 2 - faceY;
    // Clamp so the image always fills the frame (no transparent gaps at
    // the edges). With image W wide and frame FW wide:
    //   image left edge ≤ 0      (image's left at-or-past frame's left)
    //   image right edge ≥ FW    (image's right at-or-past frame's right)
    //                            → idealLeft ≥ FW - W
    const left = Math.min(0, Math.max(STANDINGS_FRAME_W - W, idealLeft));
    const top  = Math.min(0, Math.max(STANDINGS_FRAME_H - W, idealTop));
    imgEl.style.width  = W + 'px';
    imgEl.style.height = W + 'px';
    imgEl.style.left   = left + 'px';
    imgEl.style.top    = top  + 'px';
}

// Debug logging
const DEBUG_OBS = true;
function obsLog(...args) {
    if (DEBUG_OBS) console.log('[OBS Standings]', ...args);
}

// ── Font Size Calculation ────────────────────────────────────────────────────
function calculateFontSize(element, maxFontSize, minFontSize, maxWidth) {
    if (!element || !element.innerHTML) return maxFontSize;

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

    document.body.removeChild(temp);
    return currentSize;
}

// ── Generate Rows for Both Pages ─────────────────────────────────────────────
function generateStandingsRows(wrapperId, startRank) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    wrapper.innerHTML = '';
    for (let i = 1; i <= TOTAL_STANDINGS; i++) {
        const row = document.createElement('div');
        row.className = 'round-standings-container';
        row.id = `${wrapperId}-row-${i}`;
        row.innerHTML = `
            <div class="standings-rank" id="${wrapperId}-rank-${i}"></div>
            <div class="standings-portrait-frame" id="${wrapperId}-portrait-frame-${i}">
                <img class="standings-portrait" id="${wrapperId}-portrait-${i}" src="" alt="">
            </div>
            <div class="player-name-archetype">
                <div class="standings-name" id="${wrapperId}-name-${i}"></div>
                <div class="standings-archetype" id="${wrapperId}-archetype-${i}"></div>
            </div>
            <div class="standings-record" id="${wrapperId}-record-${i}"></div>
        `;
        wrapper.appendChild(row);
    }
}

generateStandingsRows('standings-wrapper-1', 1);
generateStandingsRows('standings-wrapper-2', 17);
generateStandingsRows('standings-wrapper-3', 33);
generateStandingsRows('standings-wrapper-4', 49);

// ── Socket Setup ─────────────────────────────────────────────────────────────
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');
socket.emit('get-broadcast-standings');
socket.emit('get-broadcast-scoreboard-data');

// Event round info. Some layouts (riftbound default 1v1) want a
// shorter form — "Round 8 of 15" → "Round 8" — to fit the narrower
// header pill. Vendor-config opts in via
// `--standings-event-round-strip-suffix: yes`. Default behavior
// (var unset / set to anything else) preserves the full string.
//
// Also captures the current round number and (when available) total
// rounds for the live-for-top-8 logic — see refreshTop8Highlights below.
let currentRoundNum = null;
let totalRoundsFromData = null;
socket.on('broadcast-round-data', (data) => {
    const eventRound = data?.match1?.['event-round'] || '';
    const el = document.getElementById('standings-event-round');
    if (el) {
        const stripSuffix = getComputedStyle(document.documentElement)
            .getPropertyValue('--standings-event-round-strip-suffix')
            .trim() === 'yes';
        el.textContent = stripSuffix
            ? eventRound.replace(/\s*of\s+\d+\s*$/i, '').trim()
            : eventRound;
    }
    // Parse "Round 8 of 13" → currentRoundNum=8, totalRoundsFromData=13.
    // Total rounds in the data takes precedence over the vendor-config
    // `--standings-total-rounds` fallback (handles events with non-13
    // round counts without needing a config edit).
    const m = eventRound.match(/Round\s+(\d+)(?:\s+of\s+(\d+))?/i);
    if (m) {
        currentRoundNum = parseInt(m[1], 10);
        totalRoundsFromData = m[2] ? parseInt(m[2], 10) : null;
    }
    refreshTop8Highlights();
    // Dynamic round number for the branded footer (riftbound default
    // 1v1 / CSL Bologna). The static prefix ("AFTER ROUND ") is set
    // via CSS ::before; this just sets the round number itself. No-op
    // for layouts that don't render the footer (CSS hides it).
    const afterRoundEl = document.getElementById('standings-footer-after-round');
    if (afterRoundEl && currentRoundNum != null) {
        afterRoundEl.textContent = currentRoundNum;
    }
});

// ── Live-for-top-8 highlight ────────────────────────────────────────────────
// A player is "live" if their max possible win count (current_wins +
// remaining_rounds) meets or exceeds the cut threshold. Visually the
// CSS adds a gold pulsing glow to the portrait frame of every alive row.
//
// Early rounds: most players are alive, so most rows glow — quietly
// signals "this is the contender pool." Late rounds: alive set narrows
// naturally, glow distinguishes the actual top-8 race in real time.
function parseRecord(recordStr) {
    if (typeof recordStr !== 'string') return { wins: 0, losses: 0, draws: 0 };
    const parts = recordStr.trim().split('-').map(s => parseInt(s, 10));
    return {
        wins:   Number.isFinite(parts[0]) ? parts[0] : 0,
        losses: Number.isFinite(parts[1]) ? parts[1] : 0,
        draws:  Number.isFinite(parts[2]) ? parts[2] : 0,
    };
}

function isLiveForTop8(recordStr) {
    if (currentRoundNum === null) return false; // no round info yet
    const root = getComputedStyle(document.documentElement);
    const totalRounds = totalRoundsFromData
        || parseInt(root.getPropertyValue('--standings-total-rounds'), 10)
        || 13;
    const cutWins = parseInt(root.getPropertyValue('--standings-top8-cut-wins'), 10) || 10;
    const { wins } = parseRecord(recordStr);
    const remaining = Math.max(0, totalRounds - currentRoundNum);
    return (wins + remaining) >= cutWins;
}

// Re-evaluate the highlight on every visible row. Called when the round
// changes (broadcast-round-data) AND when standings repopulate
// (populatePage sets the attribute per row directly, but this catches
// edge cases like round arriving after standings).
function refreshTop8Highlights() {
    if (currentGame !== 'riftbound') return;
    document.querySelectorAll('.round-standings-container').forEach(rowEl => {
        const recordEl = rowEl.querySelector('.standings-record');
        const record = recordEl?.textContent || '';
        rowEl.dataset.liveTop8 = isLiveForTop8(record) ? 'true' : 'false';
    });
}

// ── Theme ────────────────────────────────────────────────────────────────────
let _initGame = false, _initVendor = false, _initPlayer = false;
function tryInitialTheme() {
    if (_initGame && _initVendor && _initPlayer) {
        updateTheme(currentGame, currentVendor, currentPlayerCount);
        // Initial render after theme — auxiliary data (roster/groups/
        // standings) may already have arrived before selections did, in
        // which case this is the first chance to paint the flyquest-2v2
        // overlay correctly.
        rerenderFlyquest2v2IfActive();
    }
}

// Body data-attrs gate the flyquest-2v2 overlay in CSS. Kept in sync on
// every selection update so vendor/player-count changes flip the layout
// live without a reload.
function applyBodyAttrs() {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.dataset.game        = currentGame        || '';
    document.body.dataset.vendor      = currentVendor      || '';
    document.body.dataset.playerCount = currentPlayerCount || '';
}

socket.on('server-current-game-selection', ({gameSelection}) => {
    currentGame = gameSelection;
    _initGame = true;
    applyBodyAttrs();
    tryInitialTheme();
});
socket.on('game-selection-updated', ({gameSelection}) => {
    currentGame = gameSelection;
    applyBodyAttrs();
    updateTheme(currentGame, currentVendor, currentPlayerCount);
    // Game change toggles riftbound default 1v1's 10-per-page mode
    // on/off — re-populate to match.
    repopulateAllPages();
    rerenderFlyquest2v2IfActive();
});
socket.on('server-current-vendor-selection', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    _initVendor = true;
    applyBodyAttrs();
    tryInitialTheme();
});
socket.on('vendor-selection-updated', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    applyBodyAttrs();
    updateTheme(currentGame, currentVendor, currentPlayerCount);
    // Vendor change can flip the per-page rank count (e.g. default 1v1
    // → 10, anything else → 16). Re-populate so pages 2-4 show the
    // right rank windows without waiting for the next data push.
    repopulateAllPages();
    rerenderFlyquest2v2IfActive();
});
socket.on('server-current-player-count', ({playerCount}) => {
    currentPlayerCount = playerCount;
    _initPlayer = true;
    applyBodyAttrs();
    tryInitialTheme();
});
socket.on('player-count-updated', ({playerCount}) => {
    currentPlayerCount = playerCount;
    applyBodyAttrs();
    updateTheme(currentGame, currentVendor, currentPlayerCount);
    // Same as the vendor branch above — playerCount change can flip
    // the per-page rank count, so re-populate against the cached
    // standings data.
    repopulateAllPages();
    rerenderFlyquest2v2IfActive();
});

function updateTheme(game, vendor, playerCount) {
    const vc = window.VENDOR_CONFIG;
    if (vc) {
        vc.getAllOverrideProperties().forEach(prop => {
            document.documentElement.style.removeProperty(prop);
        });
    }

    document.documentElement.style.setProperty('--standings-color', '#000');

    if (game === 'mtg') {
        document.documentElement.style.setProperty('--standings-font', 'Gotham Narrow');
        document.documentElement.style.setProperty('--standings-font-weight', '700');
        document.documentElement.style.setProperty('--archetype-font-style', 'normal');
        document.documentElement.style.setProperty('--archetype-font-weight', '400');
    } else if (game === 'starwars') {
        document.documentElement.style.setProperty('--standings-font', 'Barlow');
        document.documentElement.style.setProperty('--standings-font-weight', '600');
        document.documentElement.style.setProperty('--archetype-font-style', 'normal');
        document.documentElement.style.setProperty('--archetype-font-weight', '600');
        document.documentElement.style.setProperty('--standings-color', '#fff');
    } else if (game === 'riftbound') {
        // Riftbound brand voice — Beaufort for LoL Bold (700). Loaded
        // via fonts.css. Vendor-config blocks under riftbound can still
        // override per-vendor (e.g. flyquest standings continues to use
        // Carbon via its own block) — these page-wide values are
        // applied first, then vc.getOverrides() spreads on top.
        document.documentElement.style.setProperty('--standings-font', "'Beaufort for LoL', serif");
        document.documentElement.style.setProperty('--standings-font-weight', '700');
        document.documentElement.style.setProperty('--archetype-font-style', 'normal');
        document.documentElement.style.setProperty('--archetype-font-weight', '700');
    } else {
        document.documentElement.style.setProperty('--standings-font', 'Bebas Neue');
        document.documentElement.style.setProperty('--standings-font-weight', 'bold');
        document.documentElement.style.setProperty('--archetype-font-style', 'italic');
        document.documentElement.style.setProperty('--archetype-font-weight', 'bold');
    }

    if (vc) {
        const overrides = vc.getOverrides(game, vendor, playerCount);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });
    }

    // Update frame images for both pages. FlyQuest 2v2 uses the
    // bracket-groups layout (no per-row chrome), so there's no frame PNG
    // to load — skipping avoids a 404 for mtg-standings-frame-flyquest-2v2.png.
    if (vc) {
        const skipFrame = vendor === 'flyquest' && playerCount === '2v2';
        if (skipFrame) {
            document.querySelectorAll('.round-standings-container').forEach(el => {
                el.style.backgroundImage = '';
            });
        } else {
            const framePath = vc.getAssetPath(
                `/assets/images/${game}/standings/${game}-standings-frame.png`,
                vendor, playerCount
            );
            document.querySelectorAll('.round-standings-container').forEach(el => {
                el.style.backgroundImage = `url("${framePath}")`;
            });
        }

        // Update bg image
        const bgPath = vc.getAssetPath(
            `/assets/images/${game}/standings/${game}-standings-bg.png`,
            vendor, playerCount
        );
        const bgEl = document.getElementById('standings-bg');
        if (bgEl) {
            const img = new Image();
            img.onload = () => { bgEl.src = bgPath; };
            img.onerror = () => { bgEl.src = ''; };
            img.src = bgPath;
        }

        // Optional character layer — same HEAD-probe pattern as bg.
        // Sits above bg/video, below data rows + panel chrome. Mirrors
        // the loader in broadcast-round-standings-all.js.
        const charPath = vc.getAssetPath(
            `/assets/images/${game}/standings/${game}-standings-char.png`,
            vendor, playerCount
        );
        const charEls = document.querySelectorAll('#standings-character, .standings-character-img');
        if (charEls.length) {
            const img = new Image();
            img.onload = () => { charEls.forEach(el => { el.src = charPath; }); };
            img.onerror = () => { charEls.forEach(el => { el.src = ''; }); };
            img.src = charPath;
        }

        // Event-wide video background (optional — drops on top of PNG bg
        // when the file exists for current game/vendor/playerCount).
        // Pattern: /assets/animations/{game}/shared/{game}-event-bg-{vendor}-{playerCount}.mp4
        const videoPath = vc.getAssetPath(
            `/assets/animations/${game}/shared/${game}-event-bg.mp4`,
            vendor, playerCount
        );
        const videoEl = document.getElementById('standings-bg-video');
        if (videoEl) {
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
}

// ── Populate Standings Data ──────────────────────────────────────────────────
function populatePage(wrapperId, data, startRank) {
    for (let i = 1; i <= TOTAL_STANDINGS; i++) {
        const dataRank = startRank + i - 1;
        const rowData = data[dataRank];
        const rankEl = document.getElementById(`${wrapperId}-rank-${i}`);
        const nameEl = document.getElementById(`${wrapperId}-name-${i}`);
        const archetypeEl = document.getElementById(`${wrapperId}-archetype-${i}`);
        const recordEl = document.getElementById(`${wrapperId}-record-${i}`);
        const portraitEl = document.getElementById(`${wrapperId}-portrait-${i}`);
        const rowEl = document.getElementById(`${wrapperId}-row-${i}`);

        if (rowData) {
            rankEl.innerHTML = rowData['rank'] || '';
            nameEl.innerHTML = rowData['name'] || '';
            archetypeEl.innerHTML = rowData['archetype'] || '';
            recordEl.innerHTML = rowData['record'] || '';
            rowEl.style.display = 'flex';

            // Mark row as still alive for the top-8 cut. CSS in
            // broadcast-round-standings-all.css (riftbound block) renders
            // a gold pulsing glow on the portrait frame for live rows.
            // Inert for non-riftbound games (the CSS rule is body-scoped).
            rowEl.dataset.liveTop8 = isLiveForTop8(rowData['record'] || '') ? 'true' : 'false';

            // Legend portrait
            const legendName = rowData['archetype'] || '';
            const legendData = RIFTBOUND_LEGENDS[legendName];
            if (portraitEl) {
                // The focus-centered 1200×1200 portrait approach is
                // specific to the riftbound DEFAULT vendor (Bologna)
                // layout, where the IMG is sized 150×150 with negative
                // offsets to land a per-legend focus dot at the frame
                // center. Other riftbound vendors (TES, atomic-legacy,
                // DSG, FlyQuest) use simpler CSS-only positioning
                // (object-fit: cover on a 45×45 frame), so they fall
                // through to the else branch. Earlier this gate was
                // `currentGame === 'riftbound'` — too broad, caused
                // TES portraits to get default's 1200×1200 URL plus
                // JS-set width:150/height:150/left:-XX/top:-XX inline
                // styles that prevented .standings-portrait's CSS
                // width:100% from applying.
                if (currentGame === 'riftbound' && currentVendor === 'default' && legendData?.left) {
                    portraitEl.src = legendData.left.replace(
                        'legend-portraits-251x124/251x124_',
                        'legend-portraits-1200x1200/1200x1200_'
                    );
                    applyStandingsPortraitFocus(portraitEl, legendName);
                } else {
                    portraitEl.src = legendData?.left || '';
                    // Clear only the riftbound-specific inline style we set
                    // (width/height/left/top) so other layouts can rely on
                    // the global .standings-portrait CSS rule.
                    portraitEl.style.width = '';
                    portraitEl.style.height = '';
                    portraitEl.style.left = '';
                    portraitEl.style.top = '';
                }
            }

            // Hide empty archetype. NOTE: the riftbound default 1v1 layout
            // hides .standings-archetype globally via CSS (portrait-only
            // legend column) so this `display: block` toggle is overridden
            // by `display: none !important` in the body-scoped CSS. Other
            // layouts use this branch to show/hide the archetype text.
            if (legendName.trim() === '') {
                archetypeEl.style.display = 'none';
            } else {
                archetypeEl.style.display = 'block';
            }
        } else {
            rankEl.innerHTML = '';
            nameEl.innerHTML = '';
            archetypeEl.innerHTML = '';
            recordEl.innerHTML = '';
            if (portraitEl) portraitEl.src = '';
            rowEl.style.display = 'none';
        }
    }

    // Auto-size
    document.fonts.ready.then(() => {
        const rootStyle = getComputedStyle(document.documentElement);
        const maxNameSize = parseInt(rootStyle.getPropertyValue('--standings-name-font-size')) || 36;
        const maxArchetypeSize = parseInt(rootStyle.getPropertyValue('--standings-archetype-font-size')) || 24;
        const textWidth = parseInt(rootStyle.getPropertyValue('--standings-text-width')) || 428;

        const wrapper = document.getElementById(wrapperId);
        wrapper.querySelectorAll('.standings-name').forEach(el => {
            if (el.innerText) {
                el.style.fontSize = calculateFontSize(el, maxNameSize, 16, textWidth) + 'px';
            }
        });
        // Uniform legend sizing: pick the smallest size needed across all
        // archetype rows, then apply it to every row. Keeps the legend column
        // visually consistent (no row-by-row size drift) while still
        // accommodating the longest name in the set.
        const archetypeEls = Array.from(wrapper.querySelectorAll('.standings-archetype'))
            .filter(el => el.innerText);
        if (archetypeEls.length > 0) {
            const sizes = archetypeEls.map(el =>
                calculateFontSize(el, maxArchetypeSize, 10, textWidth)
            );
            const minSize = Math.min(...sizes);
            archetypeEls.forEach(el => {
                el.style.fontSize = minSize + 'px';
            });
        }
    });
}

// ── FlyQuest 2v2 state ──────────────────────────────────────────────────────
// Three inputs feed the groups layout:
//   1. groupAssignment — { group1: [teamName...], group2: [teamName...] }
//      set once per event from master-control Groups tab.
//   2. playerRoster — [{ name, portraitUrl }] — the portrait lookup source.
//      Incoming name is normalized lowercase for a case-insensitive match
//      (same pattern used in scoreboard-scene.js).
//   3. Standings rows (from broadcast-round-standings-data) — includes
//      `player1` / `player2` (2v2 workaround: FirstName/LastName split) +
//      `name` / `record`.
// Any one of the three changing re-renders the overlay. Stored rawStandings
// here so downstream renders don't require re-emitting data.
let lastStandings = {};
let groupAssignment = { group1: [], group2: [] };
let playerRoster = [];

// Normalize for case-insensitive Map lookups across roster + group lists.
function normalizeKey(s) {
    return (s || '').trim().toLowerCase();
}

// Build a Map from lowercased player name → portraitUrl. Rebuilt on every
// playerRosterUpdated so portrait edits in master-control show up live.
let rosterByName = new Map();
function rebuildRosterIndex() {
    rosterByName = new Map();
    playerRoster.forEach(p => {
        if (p && p.name) rosterByName.set(normalizeKey(p.name), p.portraitUrl || '');
    });
}

// True when the flyquest-2v2 layout should drive rendering. JS doesn't need
// to toggle display (CSS handles that via body data-attrs) — this just
// skips re-render work for non-flyquest vendors.
function isFlyquest2v2() {
    return currentVendor === 'flyquest' && currentPlayerCount === '2v2';
}

function rerenderFlyquest2v2IfActive() {
    if (isFlyquest2v2()) renderFlyquest2v2();
}

// Split the flat standings dict into two ordered arrays — one per group —
// preserving standings rank order. Teams not in either list are dropped
// (the layout only has room for 4 per bracket = 8 total). Case-insensitive
// match against `name` field.
function splitStandingsByGroup(standings) {
    const group1Set = new Set(groupAssignment.group1.map(normalizeKey));
    const group2Set = new Set(groupAssignment.group2.map(normalizeKey));
    const sortedRanks = Object.keys(standings)
        .map(k => parseInt(k, 10))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

    const out = { group1: [], group2: [] };
    for (const rank of sortedRanks) {
        const row = standings[rank];
        if (!row) continue;
        const key = normalizeKey(row.name);
        if (group1Set.has(key)) out.group1.push(row);
        else if (group2Set.has(key)) out.group2.push(row);
    }
    return out;
}

// Build the label that goes in the team-name bar. Prefer `player1 & player2`
// because the Melee workaround concatenates them into `team.name` with a space
// (e.g. "Persephone Valentine Gavin Verhey") — the ampersand form reads as an
// actual team. Fall back to `team.name` if either player field is missing
// (non-Melee path, dummy payloads pre-player-split, etc.).
function formatTeamLabel(team) {
    if (team.player1 && team.player2) return `${team.player1} & ${team.player2}`;
    return team.name || '';
}

// Shrink font-size on `el` until its text stops overflowing horizontally, down
// to `minPx`. The name bars have fixed widths (677px spotlight, 530px compact)
// so long team labels like "Persephone Valentine & Gavin Verhey" clip. We
// re-measure after each step, and reset inline font-size first so a prior
// (smaller) run doesn't lock us into a smaller size when a shorter name is
// later rendered in the same slot.
function autoFitText(el, minPx = 14) {
    if (!el) return;
    el.style.fontSize = ''; // reset so CSS-driven size applies first
    const startPx = parseFloat(getComputedStyle(el).fontSize);
    if (!startPx) return;
    let size = startPx;
    // guard bound so a weird layout (clientWidth=0) can't infinite-loop
    let guard = 60;
    while (el.scrollWidth > el.clientWidth && size > minPx && guard-- > 0) {
        size -= 1;
        el.style.fontSize = size + 'px';
    }
}

// Write the incoming `row` (or blank) into the overlay DOM slots under the
// given bracket root. Captains fill from row 1's player1/player2; row 1's
// spotlight block shows team name + record (no thumbs); rows 2-4 fill
// thumbs + name + record. Empty slots get blanked so stale prev-round
// data doesn't linger.
function fillBracket(bracketEl, teams) {
    const rows = bracketEl.querySelectorAll('.fq-team-row');
    const captainImgs = bracketEl.querySelectorAll('.fq-captain-img');

    // Captains come from the top team (rank 1 within the group).
    const topTeam = teams[0];
    const captain1Url = topTeam ? (rosterByName.get(normalizeKey(topTeam.player1)) || '') : '';
    const captain2Url = topTeam ? (rosterByName.get(normalizeKey(topTeam.player2)) || '') : '';
    if (captainImgs[0]) captainImgs[0].src = captain1Url;
    if (captainImgs[1]) captainImgs[1].src = captain2Url;

    rows.forEach((rowEl, idx) => {
        const team = teams[idx]; // idx 0 = row 1 (spotlight)
        const nameEl = rowEl.querySelector('.fq-row-name-text');
        const recordEl = rowEl.querySelector('.fq-row-record-text');
        const thumbs = rowEl.querySelectorAll('.fq-row-thumb img');

        if (team) {
            if (nameEl) {
                nameEl.textContent = formatTeamLabel(team);
                autoFitText(nameEl);
            }
            if (recordEl) recordEl.textContent = team.record || '';
            // Compact rows only — thumbs follow player1/player2 roster match.
            if (thumbs.length) {
                const t1 = rosterByName.get(normalizeKey(team.player1)) || '';
                const t2 = rosterByName.get(normalizeKey(team.player2)) || '';
                if (thumbs[0]) thumbs[0].src = t1;
                if (thumbs[1]) thumbs[1].src = t2;
            }
        } else {
            if (nameEl) {
                nameEl.textContent = '';
                nameEl.style.fontSize = ''; // reset shrink from prior render
            }
            if (recordEl) recordEl.textContent = '';
            thumbs.forEach(t => { t.src = ''; });
        }
    });
}

function renderFlyquest2v2() {
    const overlay = document.getElementById('fq-standings-overlay');
    if (!overlay) return;
    const { group1, group2 } = splitStandingsByGroup(lastStandings);
    const leftBracket  = overlay.querySelector('.fq-bracket-left');
    const rightBracket = overlay.querySelector('.fq-bracket-right');
    if (leftBracket)  fillBracket(leftBracket,  group1);
    if (rightBracket) fillBracket(rightBracket, group2);
}

// Push initial requests for both auxiliary data streams. These are passive
// — server emits back whatever it has; if nothing yet, renderFlyquest2v2
// simply runs with empty arrays.
socket.emit('getGroupAssignment');
socket.emit('getPlayerRoster');

socket.on('groupAssignmentUpdated', (assignment) => {
    groupAssignment = {
        group1: Array.isArray(assignment?.group1) ? assignment.group1 : [],
        group2: Array.isArray(assignment?.group2) ? assignment.group2 : [],
    };
    rerenderFlyquest2v2IfActive();
});

socket.on('playerRosterUpdated', (roster) => {
    playerRoster = Array.isArray(roster) ? roster : [];
    rebuildRosterIndex();
    rerenderFlyquest2v2IfActive();
});

// ── Vendor-aware pagination ─────────────────────────────────────────
// Default vendor 1v1 (CSL Bologna) renders top-10 standings only — its
// layout has a single panel with 10 visible rows (rows 11-16 hidden
// via --rb-stand-rows-overflow-display). Pages cover ranks 1-10,
// 11-20, 21-30, 31-40.
// Every other vendor/playerCount uses the classic 8-left + 8-right
// double-panel layout, 16 ranks per page → 1-16, 17-32, 33-48, 49-64.
function getRanksPerPage() {
    return (currentGame === 'riftbound' &&
            currentVendor === 'default' &&
            currentPlayerCount === '1v1')
        ? 10 : 16;
}

// Re-populates all 4 pages from the cached `lastStandings` using the
// current vendor's perPage. Called from both the data-arrival handler
// AND vendor/playerCount-change handlers so a live vendor swap
// refreshes the rank windows without requiring a fresh standings
// push.
function repopulateAllPages() {
    if (!lastStandings) return;
    const perPage = getRanksPerPage();
    populatePage('standings-wrapper-1', lastStandings, 1);
    populatePage('standings-wrapper-2', lastStandings, 1 + perPage);
    populatePage('standings-wrapper-3', lastStandings, 1 + 2 * perPage);
    populatePage('standings-wrapper-4', lastStandings, 1 + 3 * perPage);
}

socket.on('broadcast-round-standings-data', (incoming) => {
    console.log('standings data', incoming);
    const data = incoming.standings || incoming;
    lastStandings = data || {};

    repopulateAllPages();

    rerenderFlyquest2v2IfActive();
});

// ── OBS Scene Slide Animation ────────────────────────────────────────────────
let currentPage = 1;

obsLog('Combined page initialized');

let isAnimating = false;
let wasAway = false;

function jumpTo(targetPage) {
    if (targetPage === currentPage) return;
    obsLog(`Jumping from page ${currentPage} to page ${targetPage}`);

    document.getElementById(`standings-page-${currentPage}`).classList.remove('active', 'slide-out', 'slide-in');
    const incoming = document.getElementById(`standings-page-${targetPage}`);
    incoming.classList.remove('slide-out', 'slide-in');
    incoming.classList.add('active');
    currentPage = targetPage;
}

function slideTo(targetPage) {
    if (targetPage === currentPage || isAnimating) return;
    isAnimating = true;

    obsLog(`Sliding from page ${currentPage} to page ${targetPage}`);

    const outgoing = document.getElementById(`standings-page-${currentPage}`);
    const incoming = document.getElementById(`standings-page-${targetPage}`);

    outgoing.classList.remove('active');
    outgoing.classList.add('slide-out');
    incoming.classList.add('slide-in');

    setTimeout(() => {
        outgoing.classList.remove('slide-out');
        incoming.classList.remove('slide-in');
        incoming.classList.add('active');
        currentPage = targetPage;
        isAnimating = false;
        obsLog(`Now on page ${currentPage}`);
    }, 1000);
}

// ── OBS Scene Detection (via server obs-websocket) ──────────────────────────
socket.on('obs-standings-page', ({ page }) => {
    obsLog(`Server says go to page ${page} | currentPage: ${currentPage}`);
    if (page && page !== currentPage) {
        if (wasAway) {
            jumpTo(page);
        } else {
            slideTo(page);
        }
        wasAway = false;
    } else if (page) {
        wasAway = false;
    }
});

socket.on('obs-left-standings', () => {
    wasAway = true;
    jumpTo(1);
    obsLog('Left standings scenes — reset to page 1');
});

// Manual page navigation via keyboard — for testing the URL directly
// (e.g. http://localhost:1378/broadcast/round/standings-combined) where
// no OBS scene-change event is driving the slider. Inert during real
// broadcasts since OBS browser sources don't receive keyboard input.
//   ← / →     : previous / next page (slide animation)
//   1 / 2 / 3 / 4 : jump directly to that page (no animation)
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
        const next = (currentPage % 4) + 1;
        slideTo(next);
    } else if (e.key === 'ArrowLeft') {
        const prev = ((currentPage - 2 + 4) % 4) + 1;
        slideTo(prev);
    } else if (['1', '2', '3', '4'].includes(e.key)) {
        jumpTo(parseInt(e.key, 10));
    }
});
//   window.dispatchEvent(new CustomEvent('obsSceneChanged', { detail: { name: 'Standings - Current Round P4' } }));

// Standings-specific debug overlay removed — face positioning is now driven
// by RIFTBOUND_PORTRAIT_FOCUS (in riftbound/constants.js), which is tuned
// via the metagame page's `debugFocus()` overlay. Single config, both views.
