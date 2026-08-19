// Topdeck.gg v2 API client — backs the tournament-platform "Fetch" flow
// (features/tournament-platforms.js → fetchMatchByTable, platform 'topdeck').
//
// fetchTopdeckTable(tid, roundNumber, tableNumber) → one pod:
//   { tableNumber, roundLabel, swissNum, tournamentName,
//     players: [{ name, commander, colors, record }] }   // seat order 1..4
//
// - commander: parsed from deckObj.Commanders (canonical) or the text
//   decklist's ~~Commanders~~ section (API sends newlines as LITERAL "\n").
//   Partners join with " / ".
// - colors: WUBRG-ordered color identity via Scryfall (batched + cached).
// - record: W-L(-D) from the tournament standings.
//
// Auth: platformConfig.topdeckApiKey (seeded from TOPDECK_API_KEY in .env);
// plain key in the Authorization header. Topdeck requires a visible
// "powered by TopDeck.gg" credit in projects using the API.
const TOPDECK_API = 'https://topdeck.gg/api';

async function tdFetch(path, apiKey, opts = {}) {
    const res = await fetch(TOPDECK_API + path, {
        ...opts,
        headers: {
            'Authorization': apiKey,
            ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        },
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Topdeck ${res.status}: ${body.slice(0, 140) || res.statusText}`);
    }
    return res.json();
}

// "~~Commanders~~\n1 Kinnan, Bonder Prodigy\n…" → "Kinnan, Bonder Prodigy"
export function commanderFromDecklist(decklist) {
    if (!decklist || typeof decklist !== 'string') return '';
    const text = decklist.replace(/\\n/g, '\n');   // literal \n → newline
    const m = text.match(/~~\s*Commanders?\s*~~\s*([\s\S]*?)(?:~~|$)/i);
    if (!m) return '';
    return m[1]
        .split(/\r?\n/)
        .map(l => l.trim().replace(/^\d+x?\s+/i, ''))
        .filter(Boolean)
        .join(' / ');
}

function commanderNames(standing) {
    if (standing?.deckObj?.Commanders) return Object.keys(standing.deckObj.Commanders);
    const joined = commanderFromDecklist(standing?.decklist || '');
    return joined ? joined.split(' / ') : [];
}

// ── Scryfall color identity (batched, cached across fetches) ─────────────
const colorCache = new Map();   // commander name → ['W','U',...]
const WUBRG = ['W', 'U', 'B', 'R', 'G'];

async function resolveColorIdentities(names) {
    const missing = [...new Set(names)].filter(n => n && !colorCache.has(n));
    if (missing.length) {
        try {
            const res = await fetch('https://api.scryfall.com/cards/collection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifiers: missing.map(n => ({ name: n })) }),
            });
            if (res.ok) {
                const data = await res.json();
                for (const card of (data.data || [])) {
                    // front-face name matches how deckObj keys single-faced names
                    colorCache.set(card.name, card.color_identity || []);
                    colorCache.set(card.name.split(' // ')[0], card.color_identity || []);
                }
            }
        } catch (e) {
            console.warn('[topdeck] Scryfall color lookup failed:', e.message);
        }
    }
}

function colorsFor(cmdNames) {
    const set = new Set();
    for (const n of cmdNames) {
        for (const c of (colorCache.get(n) || colorCache.get(n.split(' // ')[0]) || [])) set.add(c);
    }
    return WUBRG.filter(c => set.has(c)).join('');
}

export async function fetchTopdeckTable(tid, roundNumber, tableNumber, apiKey) {
    if (!apiKey) throw new Error('Topdeck API key not configured (TOPDECK_API_KEY in .env, or set it in the platform panel)');
    const cleanTid = String(tid || '').trim();
    if (!cleanTid) throw new Error('No tournament ID set in Global Settings');

    // Full object ({data, standings, rounds}) + search-by-TID in parallel.
    // The search shape is the ONLY source of swissNum, and its standings
    // columns supply per-player W/L/D (the full object's standings omit
    // them on some events, e.g. EDH points-based ones).
    const [t, search] = await Promise.all([
        tdFetch(`/v2/tournaments/${encodeURIComponent(cleanTid)}`, apiKey),
        tdFetch('/v2/tournaments', apiKey, {
            method: 'POST',
            body: JSON.stringify({ TID: cleanTid, columns: ['id', 'wins', 'losses', 'draws'] }),
        }).catch(() => []),
    ]);
    const searchHit = Array.isArray(search) ? search[0] : null;
    const recordById = new Map((searchHit?.standings || [])
        .filter(s => s && s.id)
        .map(s => [s.id, s]));

    const rounds = Array.isArray(t.rounds) ? t.rounds : [];
    const round = rounds.find(r => String(r.round) === String(roundNumber))
        || null;
    if (!round) {
        const avail = rounds.map(r => r.round).join(', ') || 'none';
        throw new Error(`Round ${roundNumber} not found. Available: ${avail}`);
    }

    const table = (round.tables || []).find(tb => String(tb.table) === String(tableNumber));
    if (!table) {
        const avail = (round.tables || []).map(tb => tb.table).slice(0, 30).join(', ') || 'none';
        throw new Error(`Table ${tableNumber} not in round ${roundNumber}. Tables: ${avail}`);
    }

    const byId = new Map((t.standings || []).filter(s => s && s.id).map(s => [s.id, s]));

    const seats = (table.players || []).map(p => {
        const standing = byId.get(p.id) || {};
        const cmds = (p.decklist ? commanderFromDecklist(p.decklist).split(' / ').filter(Boolean) : null)
            || [];
        return { p, standing, cmds: cmds.length ? cmds : commanderNames(standing) };
    });

    await resolveColorIdentities(seats.flatMap(s => s.cmds));

    const players = seats.map(({ p, standing, cmds }) => {
        const rec = recordById.get(p.id) || standing;
        const wins = rec.wins ?? null, losses = rec.losses ?? null, draws = rec.draws ?? 0;
        const record = (wins === null || losses === null) ? ''
            : (draws > 0 ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`);
        return {
            name: (p.name || '').trim(),
            commander: cmds.join(' / '),
            colors: colorsFor(cmds),
            record,
        };
    });

    return {
        tableNumber: table.table,
        roundLabel: round.round,
        swissNum: searchHit?.swissNum ?? null,
        tournamentName: t.data?.name || searchHit?.tournamentName || cleanTid,
        players,
    };
}
