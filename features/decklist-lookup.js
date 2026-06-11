// Cached decklist lookup — joins player IDs to legends/champions for the
// pairings table.
//
// Reads every `data/cardeio/cache/event-{eventId}-decklists.json` file
// at boot and builds a per-event Map<userId, { legend }>. The pairings
// emit in sockets/handlers.js calls `getLegendForPlayer(eventId, userId)`
// to attach the right legend per relationship.
//
// The cached decklist file format is the raw Carde decklist export
// (same shape `loadCachedDecklist()` in features/tournament-platforms.js
// reads). Each `decklists[]` entry has:
//   { user: { id, ... }, sections: [...], auxiliary_sections: [...] }
// Legend lives in auxiliary_sections (type_code: 'legend'), card name.

import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.join(__dirname, '..', 'data', 'cardeio', 'cache');

// Map<eventIdString, Map<userIdNumber, { legend: string }>>.
// Two-level so different events can have the same user with different
// legend choices.
const decklistsByEvent = new Map();

// Boot scan — load every event-{N}-decklists.json into memory. Missing
// dir is fine (operator may not have any cached decklists yet).
export async function loadAllCachedDecklists() {
    decklistsByEvent.clear();
    let entries;
    try {
        entries = await fs.readdir(CACHE_DIR);
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log('[DecklistLookup] No data/cardeio/cache/ dir — starting empty.');
            return;
        }
        console.error('[DecklistLookup] Error reading cache dir:', e);
        return;
    }

    const decklistFiles = entries.filter(f => /^event-\d+-decklists\.json$/.test(f));
    if (decklistFiles.length === 0) {
        console.log('[DecklistLookup] No cached decklist files found.');
        return;
    }

    let totalEntries = 0;
    for (const file of decklistFiles) {
        const m = file.match(/^event-(\d+)-decklists\.json$/);
        if (!m) continue;
        const eventId = m[1];
        try {
            const raw = await fs.readFile(path.join(CACHE_DIR, file), 'utf8');
            const data = JSON.parse(raw);
            const decklists = Array.isArray(data) ? data : (data?.decklists || []);
            const playerMap = new Map();
            for (const dl of decklists) {
                const userId = dl?.user?.id;
                if (userId == null) continue;
                playerMap.set(Number(userId), { legend: extractLegend(dl) });
            }
            decklistsByEvent.set(eventId, playerMap);
            totalEntries += playerMap.size;
        } catch (e) {
            console.error(`[DecklistLookup] Failed to load ${file}:`, e.message);
        }
    }
    console.log(`[DecklistLookup] Loaded ${decklistsByEvent.size} event(s), ${totalEntries} total decklists into memory: ${[...decklistsByEvent.keys()].sort().join(', ')}`);
}

// Pull the legend card name out of one decklist entry. Same logic as
// `getLegendFromDecklist` in features/tournament-platforms.js — kept
// here so this module stays self-contained.
function extractLegend(decklistEntry) {
    if (!decklistEntry) return '';
    const aux = decklistEntry.auxiliary_sections || [];
    const legendSection = aux.find(s => s?.type_code === 'legend');
    return legendSection?.cards?.[0]?.name || '';
}

// Lookup: legend for a given player in a specific event. Returns ''
// if we have no decklist data for that event/player. Caller should
// treat empty as "unknown" and render an em-dash or similar.
export function getLegendForPlayer(eventId, userId) {
    if (eventId == null || userId == null) return '';
    const eventMap = decklistsByEvent.get(String(eventId));
    if (!eventMap) return '';
    const entry = eventMap.get(Number(userId));
    return entry?.legend || '';
}

// Whether we have decklist data for a given event id — lets the
// pairings augment skip the per-relationship lookup loop entirely
// when no decklists are cached for the active event.
export function hasDecklistsForEvent(eventId) {
    if (eventId == null) return false;
    return decklistsByEvent.has(String(eventId));
}
