import { RIFTBOUND_LEGENDS } from './riftbound/constants.js';

const socket = io();
window.roomManager = new RoomManager(socket);

let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

const TOTAL_STANDINGS = 16;
const slider = document.getElementById('standings-slider');

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
            <img class="standings-portrait" id="${wrapperId}-portrait-${i}" src="" alt="">
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

// Event round info
socket.on('broadcast-round-data', (data) => {
    const eventRound = data?.match1?.['event-round'] || '';
    const el = document.getElementById('standings-event-round');
    if (el) el.textContent = eventRound;
});

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
    } else {
        document.documentElement.style.setProperty('--standings-font', 'Bebas Neue');
        document.documentElement.style.setProperty('--standings-font-weight', 'bold');
        document.documentElement.style.setProperty('--archetype-font-style', 'italic');
        document.documentElement.style.setProperty('--archetype-font-weight', 'bold');
    }

    if (vc) {
        const overrides = vc.getOverrides(game, vendor);
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

            // Legend portrait
            const legendName = rowData['archetype'] || '';
            const legendData = RIFTBOUND_LEGENDS[legendName];
            if (portraitEl) {
                portraitEl.src = legendData?.left || '';
            }

            // Hide empty archetype
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
        wrapper.querySelectorAll('.standings-archetype').forEach(el => {
            if (el.innerText) {
                el.style.fontSize = calculateFontSize(el, maxArchetypeSize, 10, textWidth) + 'px';
            }
        });
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

socket.on('broadcast-round-standings-data', (incoming) => {
    console.log('standings data', incoming);
    const data = incoming.standings || incoming;
    lastStandings = data || {};

    populatePage('standings-wrapper-1', data, 1);
    populatePage('standings-wrapper-2', data, 17);
    populatePage('standings-wrapper-3', data, 33);
    populatePage('standings-wrapper-4', data, 49);

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
//   window.dispatchEvent(new CustomEvent('obsSceneChanged', { detail: { name: 'Standings - Current Round 49-64' } }));
