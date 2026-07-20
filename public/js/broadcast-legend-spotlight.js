// UNLEASHED "Legend Spotlight" (L3) — lower-third over live camera.
// Legend comes from ?legend=<slug> or the trailing path segment
// (/broadcast/legend-spotlight/<slug>); default from the content JSON.
//
// The page renders its scene UNCONDITIONALLY (it IS the uvs-unleashed skin):
// socket hydration only stamps body dataset attrs and must never crash the
// page if the server / socket.io is unavailable.

import { RIFTBOUND_LEGENDS, RIFTBOUND_PORTRAIT_FOCUS } from './riftbound/constants.js';

const CARD_FALLBACK = '/assets/images/riftbound/cards/riftbound-card-back.png';

// ── Central-figure framing ───────────────────────────────────────────────────
// Reuses the metagame legend-art pipeline: animated legends play the transparent
// VP9 webm, the rest fall back to the square 1200² PNG portrait. Both anchor the
// FACE to a fixed target so every legend lands consistently on the plate.
const HERO_FACE = { x: 866, y: 840 };   // spotlight face target = truth LeBlanc face (NCC-fit vs truth composite)
const HERO_ANIM_SCALE = 0.227;          // NCC-fit against the truth PSD (was 0.21 ≈ eyeballed)
const HERO_PNG_BASE = 324;              // kept in sync with HERO_ANIM_SCALE (300 × 1.08)
const META_FACE = { x: 910, y: 274 };   // the face target the metagame numbers were tuned to

// Animated legend art — copied VERBATIM from broadcast-metagame.js
// RIFTBOUND_LEGEND_ART_ANIM (the numbers are metagame-stage positions, hand-tuned
// so the face lands at META_FACE; this page derives face fractions from them and
// rescales to HERO_FACE/HERO_ANIM_SCALE). Legends absent here use their PNG.
const LEGEND_ART_ANIM = {
    "Ahri, Nine-Tailed Fox": { src: '/assets/animations/riftbound/legend-art/ahri-nine-tailed-fox.webm', height: 2104, width: 3741, left: -900, top: -265 },
    "Annie, Dark Child": { src: '/assets/animations/riftbound/legend-art/annie-dark-child.webm', height: 1744, width: 959, left: 445, top: -109 },
    "Darius, Hand of Noxus": { src: '/assets/animations/riftbound/legend-art/darius-hand-of-noxus.webm', height: 1383, width: 1926, left: -104, top: -132 },
    "Diana, Scorn of the Moon": { src: '/assets/animations/riftbound/legend-art/diana-scorn-of-the-moon.webm', height: 2688, width: 2910, left: -1000, top: 63 },
    "Draven, Glorious Executioner": { src: '/assets/animations/riftbound/legend-art/draven-glorious-executioner.webm', height: 1989, width: 1989, left: -219, top: -176 },
    "Ezreal, Prodigal Explorer": { src: '/assets/animations/riftbound/legend-art/ezreal-prodigal-explorer.webm', height: 2199, width: 1759, left: 206, top: -118 },
    "Fiora, Grand Duelist": { src: '/assets/animations/riftbound/legend-art/fiora-grand-duelist.webm', height: 2354, width: 1822, left: -20, top: -629 },
    "Garen, Might of Demacia": { src: '/assets/animations/riftbound/legend-art/garen-might-of-demacia.webm', height: 2010, width: 1963, left: 537, top: -315 },
    "Irelia, Blade Dancer": { src: '/assets/animations/riftbound/legend-art/irelia-blade-dancer.webm', height: 2893, width: 2893, left: -448, top: -209 },
    "Ivern, Green Father": { src: '/assets/animations/riftbound/legend-art/ivern-green-father.webm', height: 2333, width: 2016, left: -18, top: -192 },
    "Jhin, Virtuoso": { src: '/assets/animations/riftbound/legend-art/jhin-virtuoso.webm', height: 2846, width: 2213, left: -175, top: -167 },
    "Jinx, Loose Cannon": { src: '/assets/animations/riftbound/legend-art/jinx-loose-cannon.webm', height: 1899, width: 2238, left: 3, top: -40 },
    "Kai'Sa, Daughter of the Void": { src: '/assets/animations/riftbound/legend-art/kaisa-daughter-of-the-void.webm', height: 1886, width: 2382, left: -448, top: -189 },
    "Kha'Zix, Voidreaver": { src: '/assets/animations/riftbound/legend-art/khazix-voidreaver.webm', height: 2100, width: 1503, left: 198, top: -416 },
    "LeBlanc, Deceiver": { src: '/assets/animations/riftbound/legend-art/leblanc-deceiver.webm', height: 3448, width: 3448, left: -674, top: -659 },
    "Lee Sin, Blind Monk": { src: '/assets/animations/riftbound/legend-art/lee-sin-blind-monk.webm', height: 2100, width: 1956, left: -67, top: -368 },
    "Leona, Radiant Dawn": { src: '/assets/animations/riftbound/legend-art/leona-radiant-dawn.webm', height: 2143, width: 2143, left: -38, top: -40 },
    "Lillia, Bashful Bloom": { src: '/assets/animations/riftbound/legend-art/lillia-bashful-bloom.webm', height: 3393, width: 2432, left: -71, top: -615 },
    "Lux, Lady of Luminosity": { src: '/assets/animations/riftbound/legend-art/lux-lady-of-luminosity.webm', height: 2529, width: 1863, left: -158, top: -2 },
    "Master Yi, Wuju Bladesman": { src: '/assets/animations/riftbound/legend-art/master-yi-wuju-bladesman.webm', height: 3200, width: 1952, left: 126, top: -1264 },
    "Master Yi, Wuju Master": { src: '/assets/animations/riftbound/legend-art/master-yi-wuju-master.webm', height: 2100, width: 2625, left: -362, top: -126 },
    "Miss Fortune, Bounty Hunter": { src: '/assets/animations/riftbound/legend-art/miss-fortune-bounty-hunter.webm', height: 2349, width: 2209, left: -217, top: -335 },
    "Poppy, Keeper of the Hammer": { src: '/assets/animations/riftbound/legend-art/poppy-keeper-of-the-hammer.webm', height: 2333, width: 2431, left: -168, top: -663 },
    "Pyke, Bloodharbor Ripper": { src: '/assets/animations/riftbound/legend-art/pyke-bloodharbor-ripper.webm', height: 2333, width: 1933, left: -94, top: -345 },
    "Rengar, Pridestalker": { src: '/assets/animations/riftbound/legend-art/rengar-pridestalker.webm', height: 1750, width: 2067, left: 20, top: -110 },
    "Sett, The Boss": { src: '/assets/animations/riftbound/legend-art/sett-the-boss.webm', height: 2433, width: 2540, left: -121, top: -174 },
    "Teemo, Swift Scout": { src: '/assets/animations/riftbound/legend-art/teemo-swift-scout.webm', height: 1909, width: 1436, left: 261, top: -489 },
    "Vex, Gloomist": { src: '/assets/animations/riftbound/legend-art/vex-gloomist.webm', height: 3000, width: 2394, left: 749, top: -418 },
    "Vi, Piltover Enforcer": { src: '/assets/animations/riftbound/legend-art/vi-piltover-enforcer.webm', height: 2253, width: 1741, left: 197, top: -80 },
    "Viktor, Herald of the Arcane": { src: '/assets/animations/riftbound/legend-art/viktor-herald-of-the-arcane.webm', height: 2100, width: 2100, left: 47, top: -376 },
    "Volibear, Relentless Storm": { src: '/assets/animations/riftbound/legend-art/volibear-relentless-storm.webm', height: 2389, width: 1994, left: -29, top: -148 },
    "Yasuo, Unforgiven": { src: '/assets/animations/riftbound/legend-art/yasuo-unforgiven.webm', height: 3349, width: 3294, left: -788, top: -692 },
};

// ── Defaults: the PSD's own example data, verbatim (Vex is the group left
// visible in the PSD; the other three replicate their PSD groups so the truth
// composite — saved with LeBlanc visible — stays comparable via ?legend=leblanc).
const DEFAULTS = {
    default: 'vex',
    legends: {
        'vex': {
            legend: 'Vex, Gloomist',
            name: 'Vex',
            subtitle: 'Apathetic',
            cards: [
                { label: 'Vex - Apathetic', name: 'Vex, Apathetic' },
                { label: 'Back Off', name: 'Back Off' },
                { label: 'Boots of Swiftness', name: 'Boots of Swiftness' }
            ],
            bullets: [
                'Vex uses the Calm defensive cards to be a Holding POWERHOUSE.',
                'Stun spells can also be used offensively.',
                'Boots of Swiftness or Vilemaw can give you offensive pushes, whilst controlling the game.'
            ]
        },
        'leblanc': {
            legend: 'LeBlanc, Deceiver',
            name: 'LeBlanc',
            subtitle: 'Deceiver',
            cards: [
                { label: 'Leblanc - Fragmented', name: 'LeBlanc, Fragmented' },
                { label: 'Karthus - Eternal', name: 'Karthus, Eternal' },
                { label: 'Rift- Herald', name: 'Rift Herald' }
            ],
            bullets: [
                'Gains advantage through reflection unit tokens of deathknell units.',
                'Multiple high-cost units and a lot of ramp can give the deck early power turns.',
                'Gets consistency from sacrifce-type spells and stacking deathknells with Karthus Eternal.'
            ]
        },
        'master-yi': {
            legend: 'Master Yi, Wuju Bladesman',
            name: 'Master Yi',
            subtitle: 'Wuju Bladesman',
            cards: [
                { label: 'Master Yi - Tempered', name: 'Master Yi, Tempered' },
                { label: 'Rengar - Trophy Hunter', name: 'Rengar, Trophy Hunter' },
                { label: 'Ruin Runner', name: 'Ruin Runner' }
            ],
            bullets: [
                'Overpower battlefields with combat tricks and then hold from the defensive Legend ability.',
                'Can use high Might units with Trinity Force to accelerate points.',
                'When you conquer a Battlefield with Rengar Trophy Hunter it effectively becomes an 8 might unit for 5 Energy 1 Power.'
            ]
        },
        'lucian': {
            legend: 'Lucian, Purifier',
            name: 'Lucian',
            subtitle: 'Merciless',
            cards: [
                { label: 'Lucian - Merciless', name: 'Lucian, Merciless' },
                { label: 'Skyfall of Areion', name: 'Skyfall of Areion' },
                { label: 'Ruin Runner', name: 'Ruin Runner' }
            ],
            bullets: [
                'Aggressive combo deck that excels in combat with fewer units.',
                'Skyfall of Areion and Trinity Force make you catch up easily when behind.',
                'An equipped Ruin Runner that can dodge showdowns can auto-win a lot of Matchups'
            ]
        }
    }
};

let content = DEFAULTS;
let cardIndex = null;   // name (lowercased) → imageUrl, from riftboundCardNames.json

// ── Legend selection ─────────────────────────────────────────────────────────
const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function requestedSlug() {
    const q = new URLSearchParams(window.location.search).get('legend');
    if (q) return slugify(q);
    const seg = window.location.pathname.replace(/\/+$/, '').split('/').pop();
    const s = slugify(seg);
    if (s && s !== 'broadcast-legend-spotlight-html' && s !== 'legend-spotlight') return s;
    return '';
}

function pickLegend() {
    const legends = content.legends || {};
    const want = requestedSlug();
    if (want) {
        if (legends[want]) return legends[want];
        // prefix / champion-first-name match ("vex-gloomist", "masteryi", …)
        for (const [key, val] of Object.entries(legends)) {
            if (want.startsWith(key) || key.startsWith(want)) return val;
            if (slugify(val.legend).startsWith(want) || slugify(val.name) === want) return val;
        }
    }
    return legends[content.default] || Object.values(legends)[0] || null;
}

function resolveCardImage(entry) {
    if (entry && entry.image) return entry.image;
    if (entry && entry.name && cardIndex) {
        const hit = cardIndex[entry.name.toLowerCase()];
        if (hit) return hit;
    }
    return CARD_FALLBACK;
}

function getPortraitUrl(legendKey) {
    const legendData = RIFTBOUND_LEGENDS[legendKey];
    if (legendData) {
        return legendData.left.replace('legend-portraits-251x124/251x124_', 'legend-portraits-1200x1200/1200x1200_');
    }
    return '';
}

// ── Central figure (face-anchored; optional per-legend `hero` override in the
// content JSON: { left, top, width, height } in stage px wins over the math). ─
function renderHero(entry) {
    const img = document.getElementById('ls-character');
    const vid = document.getElementById('ls-character-video');
    if (!img || !vid) return;
    const key = entry.legend || '';
    const anim = LEGEND_ART_ANIM[key];
    const override = entry.hero || {};

    if (anim) {
        img.style.display = 'none';
        img.removeAttribute('src');
        const w = override.width != null ? override.width : Math.round(anim.width * HERO_ANIM_SCALE);
        const h = override.height != null ? override.height : Math.round(anim.height * HERO_ANIM_SCALE);
        const fx = (META_FACE.x - anim.left) / anim.width;
        const fy = (META_FACE.y - anim.top) / anim.height;
        vid.style.display = 'block';   // explicit — '' would revert to the CSS display:none
        vid.style.width = w + 'px';    // explicit — <video> won't scale to intrinsic aspect like <img>
        vid.style.height = h + 'px';
        vid.style.left = (override.left != null ? override.left : Math.round(HERO_FACE.x - fx * w)) + 'px';
        vid.style.top = (override.top != null ? override.top : Math.round(HERO_FACE.y - fy * h)) + 'px';
        if (!vid.src || vid.src.indexOf(anim.src) === -1) {
            vid.src = anim.src;
            vid.play().catch(() => {});
        }
    } else {
        vid.style.display = 'none';
        vid.removeAttribute('src');
        vid.load();
        const url = getPortraitUrl(key);
        if (!url) { img.style.display = 'none'; img.removeAttribute('src'); return; }
        const f = RIFTBOUND_PORTRAIT_FOCUS[key] || { top: 20, left: 50 };
        const h = override.height != null ? override.height : Math.round(HERO_PNG_BASE * (f.heroScale || 1.0));
        img.style.display = 'block';
        img.style.height = h + 'px';   // square source — width follows
        img.style.left = (override.left != null ? override.left : Math.round(HERO_FACE.x - (f.left / 100) * h)) + 'px';
        img.style.top = (override.top != null ? override.top : Math.round(HERO_FACE.y - (f.top / 100) * h)) + 'px';
        if (img.getAttribute('src') !== url) img.src = url;
    }
}

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
    const entry = pickLegend();
    if (!entry) return;

    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`ls-card-${i + 1}`);
        const card = (entry.cards || [])[i];
        const art = slot.querySelector('.ls-card-art');
        const label = slot.querySelector('.ls-card-label');
        if (!card) {
            art.removeAttribute('src');
            art.style.display = 'none';
            label.textContent = '';
            continue;
        }
        art.style.display = '';
        const src = resolveCardImage(card);
        if (art.getAttribute('src') !== src) {
            art.onerror = () => { art.onerror = null; art.src = CARD_FALLBACK; };
            art.src = src;
        }
        label.textContent = (card.label || card.name || '').trim();
    }

    (entry.bullets || []).concat(['', '', '']).slice(0, 3).forEach((text, i) => {
        document.getElementById(`ls-bullet-${i + 1}`).textContent = text;
    });

    document.getElementById('ls-name-main').textContent = entry.name || '';
    document.getElementById('ls-name-sub').textContent = entry.subtitle || '';

    renderHero(entry);
}
render();

// ── Content override: /data/scene-content/legend-spotlight.json mirrors
// DEFAULTS ({ default, legends: { slug: {...} } }); 404 → defaults. ──────────
fetch('/data/scene-content/legend-spotlight.json')
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
        if (!json || !json.legends) return;
        content = {
            default: json.default || content.default,
            legends: { ...content.legends, ...json.legends }
        };
        render();
    })
    .catch(() => {});

// Card-name → image index (same file master-control uses). Best-effort: lets the
// content JSON reference cards by name alone; entries with an explicit `image`
// never need it.
fetch('/data/riftbound/riftboundCardNames.json')
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
        if (!json) return;
        cardIndex = {};
        Object.entries(json).forEach(([cardName, info]) => {
            if (info && info.imageUrl) cardIndex[cardName.toLowerCase()] = info.imageUrl;
        });
        render();
    })
    .catch(() => {});

// ── Socket hydration (body attrs only — rendering never depends on it) ───────
let currentGame = 'riftbound';
let currentVendor = 'uvs-unleashed';
let currentPlayerCount = '1v1';

function applyBodyAttrs() {
    document.body.dataset.game = currentGame;
    document.body.dataset.vendor = currentVendor;
    document.body.dataset.playerCount = currentPlayerCount;
}
applyBodyAttrs();

try {
    const socket = io();
    window.roomManager = new RoomManager(socket);

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
} catch (err) {
    console.warn('[LegendSpotlight] socket unavailable — rendering with defaults', err);
}
