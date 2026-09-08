// Decklist parsing, shared by master-control and admin-control.
//
// Lifted verbatim out of master-control/matches.js so the iPad board can apply
// a saved deck without a second copy of the rules drifting from the first.
// Pure functions only — no DOM, no sockets — so either page can import it.

// Known section headers (normalized) → canonical section name
const KNOWN_HEADERS = {
    'maindeck':       'maindeck',
    'main':           'maindeck',
    'sideboard':      'sideboard',
    'side':           'sideboard',
    'legend':         'legend',
    'champion':       'champion',
    'chosenchampion': 'champion',
    'runepool':       'runepool',
    'runes':          'runepool',
    'rune':           'runepool',
    'battlefield':    'battlefield',
    'battlefields':   'battlefield',
    'units':          'maindeck',
    'spells':         'maindeck',
    'leader':         'leader',
    'base':           'base',
};

export function parseDeckString(decklist) {
    const result = {};
    let currentSection = null;

    const lines = String(decklist ?? '').split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Normalize for header matching: strip colon, "(N)", non-alphanumeric
        const normalized = trimmed
            .replace(/:$/, '')
            .replace(/\s*\(\d+\)\s*$/, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');

        // A line is a header if it matches a known header AND doesn't start
        // with a number (which would make it a card quantity).
        const isHeader = KNOWN_HEADERS[normalized] !== undefined
            || (normalized.includes('rune') && !trimmed.match(/^\d/));

        if (isHeader && !trimmed.match(/^\d/)) {
            let sectionName = KNOWN_HEADERS[normalized];
            if (!sectionName && normalized.includes('rune')) sectionName = 'runepool';
            currentSection = sectionName;
            if (!result[currentSection]) result[currentSection] = [];
            continue;
        }

        // " | " separator → ", " (SWU paste format → melee.gg convention)
        const cardLine = trimmed.replace(/\s*\|\s*/g, ', ');

        if (currentSection) {
            if (!result[currentSection]) result[currentSection] = [];
            result[currentSection].push(cardLine);
        } else {
            // Cards before any header go to 'maindeck'
            if (!result['maindeck']) result['maindeck'] = [];
            result['maindeck'].push(cardLine);
        }
    }
    return result;
}

// ── Riftbound field mapping ─────────────────────────────────────────────────
// master-control applies a parsed deck by writing DOM fields and firing input
// events. admin-control has no deck fields at all — it emits 'field-updated'
// per field — so the mapping from parsed deck to field NAMES lives here, and
// each page applies it in whatever way suits it.

const RUNE_NAME_TO_LETTER = { Fury: 'r', Calm: 'g', Mind: 'b', Body: 'o', Chaos: 'p', Order: 'y' };
const RUNE_ORDER = ['r', 'g', 'b', 'o', 'p', 'y'];

// Strips the "3 " quantity prefix off a card line.
const stripQty = (line) => String(line ?? '').substring(2);

/**
 * Turn a parsed riftbound deck into { fieldName: value } for one side.
 * Field names are UNPREFIXED (no round/match), matching what admin-control
 * sends in 'field-updated'. Only sections present in the deck produce fields,
 * so a partial list never blanks out something the operator set by hand.
 */
export function riftboundDeckFields(parsed, side) {
    const fields = {};
    if (!parsed || !side) return fields;

    if (parsed['legend']?.length) fields[`player-legend-${side}`] = stripQty(parsed['legend'][0]);
    if (parsed['champion']?.length) fields[`player-champion-${side}`] = stripQty(parsed['champion'][0]);

    if (parsed['battlefield']?.length) {
        const bf = parsed['battlefield'].slice(0, 3);
        for (let i = 0; i < 3; i++) {
            fields[`player-battlefield-${i + 1}-${side}`] = bf[i] ? stripQty(bf[i]) : '';
        }
        // master-control also ticks battlefield 1 as the active one on import.
        fields[`player-battlefield-${side}`] = bf[0] ? stripQty(bf[0]) : '';
    }

    if (parsed['runepool']?.length) {
        const runes = parsed['runepool']
            .map((entry) => {
                const parts = entry.split(' ');
                return { qty: parts[0], letter: RUNE_NAME_TO_LETTER[parts[1]] || '' };
            })
            .filter((r) => r.letter)
            .sort((a, b) => RUNE_ORDER.indexOf(a.letter) - RUNE_ORDER.indexOf(b.letter));
        for (let i = 0; i < 2; i++) {
            fields[`player-rune-color-${i + 1}-${side}`] = runes[i]?.letter || '';
            fields[`player-rune-qty-${i + 1}-${side}`] = runes[i]?.qty || '';
        }
    }

    if (parsed['maindeck']?.length) fields[`player-main-deck-${side}`] = parsed['maindeck'].join('\n');
    if (parsed['sideboard']?.length) fields[`player-side-deck-${side}`] = parsed['sideboard'].join('\n');

    return fields;
}
