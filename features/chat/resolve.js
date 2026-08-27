// Chat-side card-name resolution.
//
// The operator picks cards from a dropdown, so features/cards.js only ever
// needed an exact, case-insensitive match. Chat types "kennen", "master yi",
// "Ral Monsoon Mage" — so this module turns loose human input into a CANONICAL
// key that already exists in the local card map, or nothing at all.
//
// Nothing here does I/O: both corpora are parsed into memory before
// server.listen (server.js), so resolution is synchronous and works offline.
//
// It never returns a string that didn't come out of our own card list. That is
// deliberate — raw chat text must not reach emitCardView().

import { getCardListData as mtgCards } from '../mtg/cards.js';
import { getCardListData as riftboundCards } from '../riftbound/cards.js';
import { getCardListData as vibesCards } from '../vibes/cards.js';

// NFKD + strip diacritics + lowercase + drop non-alphanumerics. Folding this
// hard also defuses homoglyph tricks: fullwidth "Ｃleanse" and "C l e a n s e"
// both land on "cleanse", and "<script>" collapses to "script" which matches
// nothing.
export function normalize(s) {
    return String(s ?? '')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

const SOURCES = { mtg: mtgCards, riftbound: riftboundCards, vibes: vibesCards };
const indexes = new Map();   // game -> {exact, base, names}

// Built once per game on first use, like codeIndex() in card-vision.js.
function indexFor(game) {
    if (indexes.has(game)) return indexes.get(game);
    const load = SOURCES[game];
    const data = (load && load()) || {};
    const names = Object.keys(data);

    const exact = new Map();   // normalized full name -> canonical
    const base = new Map();    // normalized text before the first comma -> [canonical]
    for (const name of names) {
        exact.set(normalize(name), name);
        const head = name.split(',')[0];
        if (head !== name) {
            const k = normalize(head);
            if (!base.has(k)) base.set(k, []);
            base.get(k).push(name);
        }
    }
    // Ambiguous base names ("kennen", "master yi") should land on the LEGEND —
    // that's the card a viewer means when they type a champion's short name;
    // the Unit/Spell printings share the same base. Starter-deck reprints lose
    // to the regular printing.
    const rank = (name) => {
        const e = data[name];
        let r = 0;
        if (e && typeof e === 'object' && e.type === 'Legend') r += 100;
        if (!/ - /.test(name)) r += 10;
        return r;
    };
    for (const list of base.values()) {
        list.sort((a, b) => rank(b) - rank(a) || a.localeCompare(b));
    }

    const idx = { exact, base, names, data };
    indexes.set(game, idx);
    return idx;
}

// Cheap subsequence score: every query char must appear in order. Rewards
// matches that start at a word boundary so "yi" prefers "Yi, ..." over
// "Yordle Captain". Good enough for 935 Riftbound names; MTG relies on the
// exact/base/prefix passes above it far more often.
function looseScore(queryN, nameN) {
    let qi = 0;
    for (let i = 0; i < nameN.length && qi < queryN.length; i++) {
        if (nameN[i] === queryN[qi]) qi++;
    }
    if (qi !== queryN.length) return 0;
    let score = queryN.length / nameN.length;
    if (nameN.startsWith(queryN)) score += 0.5;
    return score;
}

/**
 * Resolve loose chat input to a canonical card name for `game`.
 * Returns { name, ambiguous?, contentWarning? } or null when nothing matches.
 *
 * "ambiguous" means the query hit a base name shared by several cards
 * (e.g. "master yi" → 6 Riftbound variants); the caller decides whether to
 * show the first or ignore it.
 */
export function resolveCardName(game, query) {
    const raw = String(query ?? '').trim();
    if (!raw || raw.length > 80) return null;
    const q = normalize(raw);
    if (q.length < 2) return null;

    const { exact, base, names, data } = indexFor(game);
    const decorate = (name, extra = {}) => {
        const entry = data[name];
        const cw = !!(entry && typeof entry === 'object' && entry.contentWarning);
        return { name, contentWarning: cw, ...extra };
    };

    // 1. exact (case/punctuation-insensitive)
    if (exact.has(q)) return decorate(exact.get(q));

    // 2. base name before the comma — "kennen" -> "Kennen, Heart of the Tempest"
    if (base.has(q)) {
        const list = base.get(q);
        return decorate(list[0], { ambiguous: list.length > 1, alternatives: list });
    }

    // 3. double-faced input: take the front face, which is what the viewer sees
    if (raw.includes('//')) {
        const front = normalize(raw.split('//')[0]);
        if (exact.has(front)) return decorate(exact.get(front));
        if (base.has(front)) {
            const list = base.get(front);
            return decorate(list[0], { ambiguous: list.length > 1, alternatives: list });
        }
    }

    // 4. unique prefix
    const prefix = names.filter(n => normalize(n).startsWith(q));
    if (prefix.length === 1) return decorate(prefix[0]);
    if (prefix.length > 1) {
        const shortest = prefix.reduce((a, b) => (a.length <= b.length ? a : b));
        return decorate(shortest, { ambiguous: true, alternatives: prefix.slice(0, 5) });
    }

    // 5. loose subsequence, best score, with a floor so "aaa" doesn't match
    let best = null, bestScore = 0;
    for (const n of names) {
        const s = looseScore(q, normalize(n));
        if (s > bestScore) { bestScore = s; best = n; }
    }
    if (best && bestScore >= 0.34) return decorate(best, { fuzzy: true });

    return null;
}

export function _resetIndexes() { indexes.clear(); }   // tests only
