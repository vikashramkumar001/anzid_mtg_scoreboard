// broadcast-upcoming-events.js — UNLEASHED "Upcoming Events" scene (riftbound,
// uvs-unleashed, 1v1). The page IS the uvs-unleashed skin and renders
// unconditionally; socket hydration only stamps body data-attrs and must not
// crash if the server never answers.
//
// DEFAULTS replicate the PSD's own sample data verbatim (Summoner Skirmish +
// Nexus Night lockups, QR codes at the PSD coords) so the truth-overlay
// comparison is meaningful; override via /data/scene-content/upcoming-events.json:
//   { "events": [ { "name":  "Summoner Skirmish",     // used as text if no logo
//                   "logo":  "/assets/...png",        // lockup image (optional)
//                   "logoRect": { "left":82, "top":28, "width":178, "height":139 },
//                                                     // card-relative px (optional
//                                                     //  — omit to auto-center)
//                   "qr":    "/assets/...png",        // QR image (optional)
//                   "qrLeft": 81,                     // card-relative x (default 80)
//                   "date":  "" } ] }                 // gold caption under the QR
//
// The two navy plates are BAKED into the bg at x=613/x=965 — exactly two events
// overlay them 1:1. Any other count re-centers the row and gives each card its
// own CSS plate (the two baked plates stay visible behind; the PSD only ever
// shows two).

// ── Socket hydration (theme attrs only) ──────────────────────────────────────
const socket = (typeof io !== 'undefined') ? io() : null;
if (socket && typeof RoomManager !== 'undefined') {
    window.roomManager = new RoomManager(socket);
}

let currentGame = 'riftbound';
let currentVendor = 'uvs-unleashed';
let currentPlayerCount = '1v1';

function applyBodyAttrs() {
    document.body.dataset.game = currentGame;
    document.body.dataset.vendor = currentVendor;
    document.body.dataset.playerCount = currentPlayerCount;
}

if (socket) {
    socket.emit('get-game-selection');
    socket.emit('get-vendor-selection');
    socket.emit('get-player-count');

    socket.on('server-current-game-selection', ({ gameSelection }) => {
        currentGame = gameSelection;
        applyBodyAttrs();
    });
    socket.on('game-selection-updated', ({ gameSelection }) => {
        currentGame = gameSelection;
        applyBodyAttrs();
    });
    socket.on('server-current-vendor-selection', ({ vendorSelection }) => {
        currentVendor = vendorSelection;
        applyBodyAttrs();
    });
    socket.on('vendor-selection-updated', ({ vendorSelection }) => {
        currentVendor = vendorSelection;
        applyBodyAttrs();
    });
    socket.on('server-current-player-count', ({ playerCount }) => {
        currentPlayerCount = playerCount;
        applyBodyAttrs();
    });
    socket.on('player-count-updated', ({ playerCount }) => {
        currentPlayerCount = playerCount;
        applyBodyAttrs();
    });
}
applyBodyAttrs();

// ── Event data ───────────────────────────────────────────────────────────────
const ASSET = '/assets/images/riftbound/upcoming-events';

// PSD sample data verbatim (layer bounds from RFB_Upcoming_Events_UNL.psd):
//   card 1 lockup "Summoner Skirmish" 178x139 @ 695,675 -> card-rel 82,28
//   card 2 lockup "Nexus Night"       287x31  @ 992,757 -> card-rel 27,110
//   QRs 181x181 @ 694,846 / 1045,846 -> card-rel left 81 / 80, top 199
const DEFAULTS = {
    events: [
        {
            name: 'Summoner Skirmish',
            logo: `${ASSET}/riftbound-upcoming-events-logo-summoner-skirmish-uvs-unleashed-1v1.png`,
            logoRect: { left: 82, top: 28, width: 178, height: 139 },
            qr: `${ASSET}/riftbound-upcoming-events-qr-uvs-unleashed-1v1.png`,
            qrLeft: 81,
            date: ''
        },
        {
            name: 'Nexus Night',
            logo: `${ASSET}/riftbound-upcoming-events-logo-nexus-night-uvs-unleashed-1v1.png`,
            logoRect: { left: 27, top: 110, width: 287, height: 31 },
            qr: `${ASSET}/riftbound-upcoming-events-qr-uvs-unleashed-1v1.png`,
            qrLeft: 80,
            date: ''
        }
    ]
};

// ── Render ───────────────────────────────────────────────────────────────────
const CARD_W = 341;
const CARD_GAP = 11;                 // 965 - (613 + 341)
const CARD_X = [613, 965];           // the two baked plate slots
const MAX_CARDS = 5;

// Entrance choreography (unleashed-motion.css): per card, logo/name fade-rise
// first, then the QR scales in, then the date line — left card leads the right
// by 150ms. First render animates; later re-renders paint at rest (.unl-still).
let ueEntrancePlayed = false;

function render(events) {
    const host = document.getElementById('ue-cards');
    if (!host) return;
    if (ueEntrancePlayed) host.classList.add('unl-still');
    ueEntrancePlayed = true;
    host.innerHTML = '';

    const n = Math.min(events.length, MAX_CARDS);
    for (let i = 0; i < n; i++) {
        const ev = events[i] || {};
        const base = 0.10 + i * 0.15;          // per-card stagger, left → right
        const card = document.createElement('div');
        card.className = 'ue-card';

        if (n === 2) {
            card.style.left = `${CARD_X[i]}px`;    // exactly the baked plates
        } else {
            const total = n * CARD_W + (n - 1) * CARD_GAP;
            card.style.left = `${Math.round((1920 - total) / 2 + i * (CARD_W + CARD_GAP))}px`;
            card.classList.add('own-plate');
        }

        // Logo lockup (image) — or the event name as styled text.
        if (ev.logo) {
            const img = document.createElement('img');
            img.className = 'ue-logo';
            img.src = ev.logo;
            img.alt = ev.name || '';
            const r = ev.logoRect;
            if (r) {
                img.style.left = `${r.left}px`;
                img.style.top = `${r.top}px`;
                img.style.width = `${r.width}px`;
                img.style.height = `${r.height}px`;
                img.classList.add('unl-fade-rise');
                img.style.setProperty('--unl-d', `${base.toFixed(2)}s`);
                card.appendChild(img);
            } else {
                // .centered carries its own translate(-50%,-50%) — animate a
                // wrapper spanning the logo zone instead of the img itself.
                img.classList.add('centered');
                const wrap = document.createElement('div');
                wrap.className = 'ue-logo-wrap unl-fade-rise';
                wrap.style.setProperty('--unl-d', `${base.toFixed(2)}s`);
                wrap.appendChild(img);
                card.appendChild(wrap);
            }
        } else if (ev.name) {
            const nameEl = document.createElement('div');
            nameEl.className = 'ue-name unl-fade-rise';
            nameEl.style.setProperty('--unl-d', `${base.toFixed(2)}s`);
            nameEl.textContent = ev.name;
            card.appendChild(nameEl);
        }

        if (ev.qr) {
            const qr = document.createElement('img');
            qr.className = 'ue-qr unl-scale-in';
            qr.src = ev.qr;
            qr.alt = '';
            qr.style.left = `${ev.qrLeft != null ? ev.qrLeft : 80}px`;
            qr.style.setProperty('--unl-d', `${(base + 0.08).toFixed(2)}s`);
            card.appendChild(qr);
        }

        if (ev.date) {
            const dateEl = document.createElement('div');
            dateEl.className = 'ue-date unl-fade-rise';
            dateEl.style.setProperty('--unl-d', `${(base + 0.16).toFixed(2)}s`);
            dateEl.textContent = ev.date;
            card.appendChild(dateEl);
        }

        host.appendChild(card);
    }
}

// JSON override mirrors DEFAULTS; 404 / no server → defaults. (The HTML ships
// with the default cards hardcoded, so the page is correct before this runs —
// render() simply rebuilds the same DOM.)
fetch('/data/scene-content/upcoming-events.json')
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(json => {
        const cfg = { ...DEFAULTS, ...(json || {}) };
        const events = (Array.isArray(cfg.events) && cfg.events.length > 0)
            ? cfg.events
            : DEFAULTS.events;
        render(events);
    });
