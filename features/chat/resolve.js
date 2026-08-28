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

// Damerau-Levenshtein (optimal string alignment). Plain subsequence matching
// cannot see typos: an inserted letter ("kennnen") or two swapped letters
// ("ierlia") breaks the in-order requirement outright, so every one of those
// silently found nothing. Edit distance catches exactly those cases.
function editDistance(a, b, cap) {
    const al = a.length, bl = b.length;
    if (Math.abs(al - bl) > cap) return cap + 1;      // cheap reject
    let prev2 = [], prev = [], cur = [];
    for (let j = 0; j <= bl; j++) prev[j] = j;
    for (let i = 1; i <= al; i++) {
        cur = [i];
        let best = i;
        for (let j = 1; j <= bl; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                v = Math.min(v, prev2[j - 2] + 1);     // adjacent transposition
            }
            cur[j] = v;
            if (v < best) best = v;
        }
        if (best > cap) return cap + 1;               // whole row already too far
        prev2 = prev; prev = cur;
    }
    return prev[bl];
}

// Function words that carry no request on their own. Only ever applied when
// the WHOLE query is made of them.
const STOPWORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'if',
    'in', 'into', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our', 'so',
    'that', 'the', 'their', 'them', 'then', 'these', 'they', 'this', 'those',
    'to', 'up', 'was', 'were', 'when', 'with', 'you', 'your',
]);

// How wrong a name may be before we refuse it. Short names get almost no
// slack — one edit on a 4-letter word is a different word — while longer
// names tolerate a couple of slips.
function typoBudget(len) {
    if (len <= 3) return 0;
    if (len <= 7) return 1;
    if (len <= 12) return 2;
    return 3;
}

// Offsets (in normalized space) at which each word of a name begins. Used to
// reject mid-word coincidences like "script" inside "Conscription".
const wordBoundCache = new Map();
function wordBounds(name) {
    let b = wordBoundCache.get(name);
    if (b) return b;
    const starts = new Set(), ends = new Set();
    let pos = 0;
    for (const word of String(name).split(/[^A-Za-z0-9]+/)) {
        if (!word) continue;
        starts.add(pos);
        pos += normalize(word).length;
        ends.add(pos);
    }
    b = { starts, ends };
    wordBoundCache.set(name, b);
    return b;
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

    // A query made only of function words is not a request. Without this,
    // "!card the" prompted with five "The ..." cards and auto-picked one, and
    // "of the" put Eye of the Herald on air — free airtime for anyone bored
    // enough to type it every cooldown. Placed AFTER the exact/base passes, so
    // a card genuinely named one of these still resolves when typed in full.
    if (raw.split(/[^A-Za-z0-9']+/).filter(Boolean).every(w => STOPWORDS.has(w.toLowerCase()))) return null;

    // Every card in which the query appears as a WHOLE word — the span must
    // begin and end on word boundaries at BOTH ends. A plain substring test is
    // far too loose: "<script>" normalizes to "script", which really does sit
    // inside "Con|script|ion", so a troll typing markup put a random card on
    // air. This is gathered BEFORE any decision because it is the strongest
    // evidence there is short of an exact hit — the viewer typed a real word of
    // a real card name, with zero edits — and the passes below defer to it.
    const wordHits = [];
    if (q.length >= 4) {
        for (const n of names) {
            const nn = normalize(n);
            const at = nn.indexOf(q);
            if (at < 0) continue;
            const { starts, ends } = wordBounds(n);
            if (!starts.has(at) || !ends.has(at + q.length)) continue;
            wordHits.push({ name: n, at, score: q.length / nn.length });
        }
    }
    const wordHitNames = new Set(wordHits.map(h => h.name));
    // One card shows; several offer chat a numbered choice.
    const fromWordHits = () => {
        const uniq = [...new Set(wordHits.slice().sort((a, b) => b.score - a.score).map(h => h.name))];
        if (uniq.length === 1) return decorate(uniq[0], { fuzzy: true });
        const top = uniq.slice(0, 5);
        return decorate(top[0], { fuzzy: true, ambiguous: true, alternatives: top });
    };

    // 4. prefix. A prefix that stops in the MIDDLE of a word is weak evidence:
    // "mage" prefixes "Mageseeker Warden", but "Mageseeker" is simply a
    // different word, and meanwhile "Apprentice Mage" contains the actual word.
    // Prefer prefixes that end on a word boundary; when none do, yield to the
    // whole-word hits rather than showing a card that merely starts the same.
    const prefix = names.filter(n => normalize(n).startsWith(q));
    if (prefix.length) {
        const aligned = prefix.filter(n => wordBounds(n).ends.has(q.length));
        const pick = aligned.length ? aligned : (wordHits.length ? null : prefix);
        if (pick) {
            if (pick.length === 1) return decorate(pick[0]);
            // When every candidate is the same champion ("kenn"), defer to the
            // ranked base list so the Legend leads, exactly as "kennen" does —
            // otherwise the shortest NAME led, which is arbitrary.
            const heads = new Set(pick.map(n => normalize(n.split(',')[0])));
            if (heads.size === 1) {
                const head = [...heads][0];
                if (base.has(head)) {
                    const list = base.get(head);
                    return decorate(list[0], { ambiguous: list.length > 1, alternatives: list });
                }
            }
            // Rank shortest-first (the tightest match leads) and take the head
            // from that same list, so the returned name is always option 1 —
            // otherwise the prompt led with one card and `name` held another.
            const ranked = pick.slice().sort((a, b) => normalize(a).length - normalize(b).length).slice(0, 5);
            return decorate(ranked[0], { ambiguous: true, alternatives: ranked });
        }
    }

    // 5. a whole-word hit that covers enough of the name to stand on its own.
    if (wordHits.length) {
        // Several real cards contain the word — "Insight" is in both Decree of
        // Insight and Seal of Insight. Picking the one that happens to score
        // highest is a silent guess between equals; ask instead.
        if (wordHitNames.size > 1) return fromWordHits();
        const best = wordHits.reduce((a, b) => (b.score > a.score ? b : a));
        if (best.score >= 0.45) {
            // Only redirect to the ranked variant when the match falls inside
            // the BASE name. A hit in the subtitle — "storm of shuriken",
            // "fervent" — names exactly one card, and redirecting it to the
            // base list's first entry put the WRONG Kennen on air.
            const head = normalize(best.name.split(',')[0]);
            const inHead = best.at + q.length <= head.length;
            if (inHead && base.has(head) && normalize(best.name) !== q) {
                const list = base.get(head);
                return decorate(list[0], { fuzzy: true, ambiguous: list.length > 1, alternatives: list });
            }
            return decorate(best.name, { fuzzy: true });
        }
    }

    // 6. typo tolerance — the pass that rescues "kennnen", "ierlia", "rekssai".
    // Compared against BASE names too, so a misspelt champion short name still
    // lands on the Legend. Length pre-filter keeps this cheap over MTG's ~32k.
    const cap = typoBudget(q.length);
    if (cap > 0) {
        let bestDist = cap + 1;
        let winners = new Map();          // canonical name -> its base list (or null)
        const consider = (candidateKey, canonical, list) => {
            if (Math.abs(candidateKey.length - q.length) > cap) return;
            // On a short query one edit reaches an unrelated word — "null"
            // became "Cull". Typos almost never change the FIRST letter, so
            // require it to agree; "jnix" -> Jinx and "temo" -> Teemo survive.
            if (q.length <= 5 && candidateKey[0] !== q[0]) return;
            const d = editDistance(q, candidateKey, cap);
            if (d > cap) return;
            if (d < bestDist) { bestDist = d; winners = new Map(); }
            if (d === bestDist && !winners.has(canonical)) winners.set(canonical, list);
        };
        // Keep the whole base list, not just its first card: "irleia" is the
        // same intent as "irelia", so it must offer the same three Irelias
        // rather than silently forcing the Legend.
        for (const [k, list] of base) consider(k, list[0], list);
        for (const [k, canonical] of exact) consider(k, canonical, null);
        // A tie between DIFFERENT cards at the same distance is a coin flip, and
        // a coin flip puts the wrong card on air. Refuse instead. This is what
        // makes a 1-edit budget safe on four-letter names: "bard"/"bird" is the
        // only colliding short pair in Riftbound, and it now resolves to neither.
        if (winners.size === 1) {
            const [bestName, bestList] = [...winners][0];
            // Zero edits beats one. When the query is a whole word of some real
            // card and the typo winner is NOT that card, the winner is a guess
            // dressed as a match: "smith" -> Smite over Apprentice Smith,
            // "cone" -> Yone over Blast Cone, "dust" -> Gust over Turn to Dust.
            if (wordHits.length && !wordHitNames.has(bestName)) return fromWordHits();
            const multi = !!(bestList && bestList.length > 1);
            return decorate(bestName, {
                fuzzy: true, typo: true, distance: bestDist,
                ...(multi ? { ambiguous: true, alternatives: bestList } : {}),
            });
        }
    }

    // 7. no exact, prefix or typo reading — a weak whole-word hit is still a
    // real word of a real card, and beats showing nothing.
    if (wordHits.length) return fromWordHits();

    return null;
}

export function _resetIndexes() { indexes.clear(); }   // tests only
