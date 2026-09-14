// Riftbound vertical decklist — one column of [slot | name | cost] rows over
// card-art strips: legend, champion, battlefields, main deck, runes, and the
// sideboard when master control's toggle is on. Shared by the vertical
// main-deck page and the scoreboard's slide-in decklists. Rows are sized to
// the height the host gives, so the column always fits its box.
//
// Styles: /css/riftbound/vertical-decklist.css (scoped to .rbv-container).
import {
    RIFTBOUND_RUNES_FILLED as RIFTBOUND_RUNES,
    RIFTBOUND_RUNE_NAMES,
    RIFTBOUND_BATTLEFIELD_NAMES,
    RIFTBOUND_BATTLEFIELDS_BASE,
} from './constants.js';

// ── Riftbound vertical decklist ───────────────────────────────────────────
// One column on the normal 1920x1080 canvas. Every row is the same shape —
// [slot | name | cost] over a strip of the card's art — so the legend,
// champion, battlefields, main deck, runes and sideboard read as one list.
// Row height is computed from how many rows there are, so the column always
// fits the 1080 canvas instead of scrolling off the bottom.
export const RBV = {
    CANVAS_H: 1080,   // default column height (the main-deck page is a full 1080 canvas)
    WIDTH: 460,       // default column width
    PAD: 24,          // column top/bottom padding
    GAP: 3,           // between rows (drops to 1 if the list is very long)
    DIVIDER_H: 26,    // "SIDEBOARD" heading row
    ROW_MIN: 22,
    ROW_MAX: 46,
    SIDEBOARD_MAX: 10, // same cap the horizontal layout uses
    ICON: {
        legend:      '/assets/images/riftbound/icons/Legend.png',
        champion:    '/assets/images/riftbound/icons/ChampionUnit.png',
        battlefield: '/assets/images/riftbound/icons/Battlefield.png',
    },
};
// Domain label (as stored on the card DB entry) → rune letter used by RIFTBOUND_RUNES
const RBV_DOMAIN_LETTER = Object.fromEntries(Object.entries(RIFTBOUND_RUNE_NAMES).map(([l, n]) => [n, l]));
// Official domain colours (Riot asset kit "Domain Colors.png")
const RBV_DOMAIN_COLOR = { Fury: '#E1282D', Calm: '#51913D', Body: '#E3710E', Chaos: '#6F4790', Mind: '#2974A3', Order: '#CEAE0B' };
// Two-domain pips use the rainbow rune glyph over a plate split left/right
// between the two domain colours (same plate + ring as a single pip).
const RBV_RAINBOW_GLYPH = '/assets/images/riftbound/icons/runes/RainbowRune.png';
// Per-card vertical art crop, as "% down the image" — where the head is.
// Defaults (CSS): card scans 24%, 251x124 legend bands 36%, battlefields 40%.
// Add an entry when a specific card's face sits higher/lower than that;
// keyed by the exact card/legend name as it appears in the list.
export const RBV_ART_Y = {
    // Measured on the rendered rows (3x crops), 2026-09-13:
    'Sivir, Battle Mistress': 16,   // official SFD portrait band frames her high — 36% showed the scarf
    'Sivir, Mercenary': 19,         // head at the top of the art; 24% cut at the nose
    'Darius, Trifarian': 20,        // 24% landed on the open mouth
    'Draven, Glorious Executioner': 50,  // his band frames him LOW — 36% showed the top of his head
    'Draven, Vanquisher': 16,       // head at the very top of the art; 24% showed his chest
};

function rbvEscape(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function rbvRuneIcon(letter) {
    return RIFTBOUND_RUNES[letter] || '';
}

// One power pip, drawn the way the card draws it: a white domain glyph on a
// plate in the domain colour with a thin gold ring. CSS plate + the 1000px
// glyph used as a mask, so it stays crisp at the 4K OBS zoom. Two-domain
// cards: plate split left/right between the two colours, rainbow glyph.
function rbvPipHtml(domains) {
    if (domains.length >= 2) {
        const [a, b] = domains;
        const plate = `linear-gradient(to right, ${RBV_DOMAIN_COLOR[a]} 0 50%, ${RBV_DOMAIN_COLOR[b]} 50% 100%)`;
        return `<span class="rbv-pip rbv-pip-solid" style="--rbv-dc:${plate};--rbv-glyph:url('${RBV_RAINBOW_GLYPH}')"></span>`;
    }
    const d = domains[0];
    const letter = RBV_DOMAIN_LETTER[d];
    return `<span class="rbv-pip rbv-pip-solid" style="--rbv-dc:${RBV_DOMAIN_COLOR[d]};--rbv-glyph:url('${rbvRuneIcon(letter)}')"></span>`;
}

function rbvKnownDomains(domain) {
    return (Array.isArray(domain) ? domain : [domain]).filter(d => RBV_DOMAIN_COLOR[d] && rbvRuneIcon(RBV_DOMAIN_LETTER[d]));
}

// "10 ●●●" — energy in the card's white/gold badge, then `power` pips.
function rbvCostHtml(energy, power, domain) {
    const e = parseInt(energy, 10);
    const p = parseInt(power, 10) || 0;
    const domains = rbvKnownDomains(domain);
    if (Number.isNaN(e) && !(p && domains.length)) return '';
    let html = '<span class="rbv-cost">';
    if (!Number.isNaN(e)) html += `<span class="rbv-energy">${e}</span>`;
    if (domains.length) for (let i = 0; i < p; i++) html += rbvPipHtml(domains);
    return html + '</span>';
}

// Legend row: one pip per domain, no energy (legends aren't cast).
function rbvDomainIconsHtml(domain) {
    const domains = rbvKnownDomains(domain);
    if (!domains.length) return '';
    return '<span class="rbv-cost">' + domains.map(d => rbvPipHtml([d])).join('') + '</span>';
}

const RIFTBOUND_BATTLEFIELDS_DEFAULT = `${RIFTBOUND_BATTLEFIELDS_BASE}/Altar to Unity.png`;
const RIFTBOUND_BATTLEFIELDS = {};
for (const name of RIFTBOUND_BATTLEFIELD_NAMES) RIFTBOUND_BATTLEFIELDS[name] = `${RIFTBOUND_BATTLEFIELDS_BASE}/${name}.png`;

function rbvBattlefieldArt(name) {
    const bfName = (name || '').trim();
    let url = RIFTBOUND_BATTLEFIELDS[bfName];
    if (!url) {
        const lower = bfName.toLowerCase();
        for (const key in RIFTBOUND_BATTLEFIELDS) {
            if (key.toLowerCase() === lower) { url = RIFTBOUND_BATTLEFIELDS[key]; break; }
        }
    }
    return url || RIFTBOUND_BATTLEFIELDS_DEFAULT;
}

// Build one row element. `slot` is the left box: a count, or an icon URL.
function rbvRow({ kind, count, icon, name, nameIcon, art, cost, band }) {
    const el = document.createElement('div');
    el.className = `rbv-row rbv-${kind}${band ? ' rbv-band' : ''}`;
    const artY = RBV_ART_Y[name];
    const artStyle = art
        ? ` style="background-image:url('${art}')${Number.isFinite(artY) ? `;--rbv-art-y:${artY}%` : ''}"`
        : '';
    const slot = icon
        ? `<div class="rbv-slot rbv-slot-icon"><img src="${icon}" alt=""></div>`
        : `<div class="rbv-slot">${rbvEscape(count ?? '')}</div>`;
    const nameIconHtml = nameIcon ? `<img class="rbv-name-icon" src="${nameIcon}" alt="">` : '';
    el.innerHTML = `
        <div class="rbv-art"${artStyle}></div>
        ${slot}
        <div class="rbv-name">${nameIconHtml}<span>${rbvEscape(name)}</span></div>
        ${cost || ''}
    `;
    return el;
}

/**
 * Render a riftbound decklist as one vertical column into `container`.
 * @param {HTMLElement} container  host element; gets class .rbv-container
 * @param {object} opts
 *   main          transformed main deck (categorizedDeck from the server)
 *   side          transformed sideboard array (optional)
 *   showSideboard include the sideboard rows (master control's toggle)
 *   legendName / championName  fallbacks when the transform lacks them
 *   height        px available for the column (rows are sized to fit)
 *   width         px column width
 *   pad           px top/bottom padding inside the container
 */
export function renderVerticalDecklist(container, opts = {}) {
    if (!container) return;
    const deckObj = opts.main || {};
    const height = Number.isFinite(opts.height) ? opts.height : RBV.CANVAS_H;
    const width = Number.isFinite(opts.width) ? opts.width : RBV.WIDTH;
    const pad = Number.isFinite(opts.pad) ? opts.pad : RBV.PAD;

    // ── Collect rows in display order ──
    const rows = [];
    const legendName = (deckObj.legendName || opts.legendName || '').trim();
    if (legendName) {
        // Prefer the 251x124 face-band portrait: a row-height strip of the full
        // card lands on the frame/energy badge, not the face.
        rows.push({ kind: 'legend', icon: RBV.ICON.legend, name: legendName,
            art: deckObj.legendPortraitUrl || deckObj.legendImageUrl || '',
            band: !!deckObj.legendPortraitUrl,
            cost: rbvDomainIconsHtml(deckObj.legendDomain) });
    }
    const champ = deckObj.champion;
    const championName = (champ?.name || opts.championName || '').trim();
    if (championName) {
        rows.push({ kind: 'champion', icon: RBV.ICON.champion, name: championName,
            art: champ?.url || deckObj.championImageUrl || '',
            cost: champ ? rbvCostHtml(champ.energy, champ.power, champ.domain) : '' });
    }
    for (const bf of (deckObj.battlefields || []).slice(0, 3)) {
        const bfName = (bf.name || bf['card-name'] || '').trim();
        if (!bfName) continue;
        rows.push({ kind: 'battlefield', icon: RBV.ICON.battlefield, name: bfName, art: rbvBattlefieldArt(bfName) });
    }
    for (const card of (deckObj.other || [])) {
        rows.push({ kind: 'card', count: card['card-count'], name: card['card-name'], art: card['card-url'] || '',
            cost: rbvCostHtml(card.energy, card.power, card.domain) });
    }
    for (const rune of (deckObj.runes || [])) {
        if (!rune.letter || !rbvRuneIcon(rune.letter)) continue;
        const runeName = rune.name || `${RIFTBOUND_RUNE_NAMES[rune.letter] || ''} Rune`;
        rows.push({ kind: 'rune', count: rune.count, name: runeName, nameIcon: rbvRuneIcon(rune.letter), art: rune.url || '' });
    }
    // Sideboard follows master control's Show Sideboard toggle. It's part of
    // the row count (so hiding it gives the main list taller rows), which is
    // why applySideboardVisibility() re-renders rather than just toggling CSS.
    const side = Array.isArray(opts.side) ? opts.side.slice(0, RBV.SIDEBOARD_MAX) : [];
    const showSide = !!opts.showSideboard && side.length > 0;
    if (showSide) {
        rows.push({ kind: 'divider', name: 'Sideboard' });
        for (const card of side) {
            rows.push({ kind: 'card', sideboard: true, count: card['card-count'], name: card['card-name'],
                art: card['card-url'] || '', cost: rbvCostHtml(card.energy, card.power, card.domain) });
        }
    }

    // ── Size rows to fit the canvas ──
    const dividers = rows.filter(r => r.kind === 'divider').length;
    const n = rows.length - dividers;
    let gap = RBV.GAP;
    const fit = () => Math.floor((height - 2 * pad - gap * (rows.length - 1) - dividers * RBV.DIVIDER_H) / Math.max(n, 1));
    let rowH = fit();
    if (rowH < RBV.ROW_MIN) { gap = 1; rowH = fit(); }   // very long list: tighten before shrinking further
    if (rowH < RBV.ROW_MIN) console.warn(`[Riftbound vertical] ${rows.length} rows won't fit at ${RBV.ROW_MIN}px — the tail will clip`);
    rowH = Math.max(RBV.ROW_MIN, Math.min(RBV.ROW_MAX, rowH));
    // Text is 60% of the row (was 46%): a 26px row carries 16px, and short lists
    // still stop at the 21px ceiling. Floor 13px.
    const fontPx = Math.max(13, Math.min(21, Math.round(rowH * 0.60)));
    const pipPx  = Math.max(13, Math.min(22, Math.round(rowH * 0.5)));

    // ── Build ──
    container.classList.add('rbv-container');
    container.innerHTML = '';
    container.style.setProperty('--rbv-h', `${height}px`);
    container.style.setProperty('--rbv-pad', `${pad}px`);
    const col = document.createElement('div');
    col.className = 'rbv-column';
    col.style.setProperty('--rbv-w', `${width}px`);
    col.style.setProperty('--rbv-row-h', `${rowH}px`);
    col.style.setProperty('--rbv-gap', `${gap}px`);
    col.style.setProperty('--rbv-font', `${fontPx}px`);
    col.style.setProperty('--rbv-pip', `${pipPx}px`);
    col.style.setProperty('--rbv-divider-h', `${RBV.DIVIDER_H}px`);

    let target = col;
    for (const r of rows) {
        if (r.kind === 'divider') {
            // Sideboard rows live in their own wrapper so the CSS toggle can
            // also hide them if the attribute flips before a re-render lands.
            target = document.createElement('div');
            target.className = 'rbv-sideboard';
            col.appendChild(target);
            const d = document.createElement('div');
            d.className = 'rbv-divider';
            d.textContent = r.name;
            target.appendChild(d);
            continue;
        }
        target.appendChild(rbvRow(r));
    }
    container.appendChild(col);
}
