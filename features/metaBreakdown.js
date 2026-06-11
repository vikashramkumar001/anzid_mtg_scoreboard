import {getCardListData as mtgGetCardListData} from "./mtg/cards.js";
import {getCardListData as riftboundGetCardListData} from "./riftbound/cards.js";
import {getCardListData as vibesGetCardListData} from "./vibes/cards.js";
import { loadCachedDecklist, getPlatformConfig, fetchTournamentStandings } from "./tournament-platforms.js";
import { RoomUtils } from '../utils/room-utils.js';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARDEIO_DIR = path.join(__dirname, '../data/cardeio');

function getCardListForGame(gameType) {
    switch (gameType) {
        case 'riftbound': return riftboundGetCardListData();
        case 'vibes': return vibesGetCardListData();
        case 'mtg':
        default: return mtgGetCardListData();
    }
}

let cachedBroadcastData = null;

export function emitMetaBreakdownData(io, data) {
    cachedBroadcastData = data;
    RoomUtils.emitWithRoomMapping(io, 'receive-meta-breakdown-data', data);
}

export function getCachedBroadcastData() {
    return cachedBroadcastData;
}

// Convert calculateMetagame result into the flat field format that the broadcast page expects
export function metagameResultToBroadcastData(result, gameType, showCount) {
    const count = showCount || 7;
    const allSorted = result.allArchetypesSorted || [];
    const displayed = allSorted.slice(0, count);
    const day1Total = result.day1Total || 0;
    const day2Total = result.day2Total || null;
    // Skip "Other" if all archetypes fit within the count
    const needsOther = allSorted.length > count;

    const data = {};
    for (let i = 0; i < displayed.length; i++) {
        const a = displayed[i];
        const idx = i + 1;
        data[`meta-breakdown-archetype-${idx}`] = a.name;
        data[`meta-breakdown-day-1-count-${idx}`] = String(a.day1Count);
        data[`meta-breakdown-day-1-percent-${idx}`] = String(a.day1Percent);
        data[`meta-breakdown-day-2-count-${idx}`] = a.day2Count !== null && a.day2Count !== undefined ? String(a.day2Count) : '';
        data[`meta-breakdown-day-2-percent-${idx}`] = a.day2Percent !== null && a.day2Percent !== undefined ? String(a.day2Percent) : '';
        data[`meta-breakdown-conversion-${idx}`] = a.conversion !== null && a.conversion !== undefined ? a.conversion + '%' : '';
    }

    // Other row — only if there are more archetypes than the display count
    if (needsOther) {
        const otherIdx = displayed.length + 1;
        const otherDay1Count = day1Total - displayed.reduce((sum, a) => sum + a.day1Count, 0);
        const otherDay1Percent = day1Total > 0 ? ((otherDay1Count / day1Total) * 100).toFixed(1) : '0';
        const otherDay2Count = day2Total ? (day2Total - displayed.reduce((sum, a) => sum + (a.day2Count || 0), 0)) : null;
        const otherDay2Percent = day2Total && day2Total > 0 ? ((otherDay2Count / day2Total) * 100).toFixed(1) : null;
        const otherConversion = day2Total && otherDay1Count > 0 ? ((otherDay2Count / otherDay1Count) * 100).toFixed(0) : null;

        data[`meta-breakdown-archetype-${otherIdx}`] = 'Other';
        data[`meta-breakdown-day-1-count-${otherIdx}`] = String(otherDay1Count);
        data[`meta-breakdown-day-1-percent-${otherIdx}`] = String(otherDay1Percent);
        data[`meta-breakdown-day-2-count-${otherIdx}`] = otherDay2Count !== null ? String(otherDay2Count) : '';
        data[`meta-breakdown-day-2-percent-${otherIdx}`] = otherDay2Percent !== null ? String(otherDay2Percent) : '';
        data[`meta-breakdown-conversion-${otherIdx}`] = otherConversion !== null ? otherConversion + '%' : '';
    }

    // Include full archetype list for side panel (independent of showCount)
    data._allArchetypes = allSorted;
    data._day1Total = day1Total;
    data._day2Total = day2Total;
    data._gameType = gameType || 'mtg';
    return data;
}

export function handleMetaBreakdownCard(cardName, gameType) {
    const cardList = getCardListForGame(gameType);
    // For double-faced cards, use only the first face name before the "//"
    const singleFace = cardName.includes('//')
        ? cardName.split('//')[0].trim()
        : cardName.trim();

    // Remove leading/trailing quotes and sanitize
    const cleanedName = singleFace.replace(/^"+|"+$/g, '').replace(/&/g, 'and');

    // Set the card URL
    const cardURL = cardList[cleanedName]?.imageUrl;

    return {
        name: cardName,
        url: cardURL
    }
}

export function handleIncomingMetaBreakdownData(io, data) {
    const gameType = data._gameType || 'mtg';
    // Remove the gameType from the data before processing
    delete data._gameType;

    // handle adding card urls
    Object.keys(data).forEach(function(key){
       if (key && key.includes('meta-breakdown-key-card')){
           data[key] = handleMetaBreakdownCard(data[key], gameType);
       }
    });

    // Include gameType in emitted data so broadcast pages know which game
    data._gameType = gameType;

    // emit to listeners
    emitMetaBreakdownData(io, data);
}

// ── Auto-calculate metagame from tournament data ─────────────────────────────

function getLegendFromDecklistEntry(dl) {
    const aux = dl.auxiliary_sections || [];
    const legendSection = aux.find(s => s.type_code === 'legend');
    return legendSection?.cards?.[0]?.name || '';
}

async function loadCachedStandingsApi(roundNumber) {
    const tournamentId = getPlatformConfig().tournamentId;
    if (!tournamentId) return null;
    const filePath = path.join(CARDEIO_DIR, `standings-api-event-${tournamentId}-round-${roundNumber}.json`);
    try {
        const raw = await fsPromises.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

// Scan the cardeio dir for every cached
// pairings-api-event-{currentEventId}-round-N.json file and load it
// into memory. Returns a sorted array of { round, matches } pairs.
// Older unscoped files (pairings-api-round-N.json) AND files for other
// events are ignored — this is what prevents the matchup matrix from
// silently inheriting matches from a previous tournament. Missing
// rounds are simply absent — the caller can ignore them.
async function loadAllCachedPairingsRounds() {
    const tournamentId = getPlatformConfig().tournamentId;
    if (!tournamentId) return [];

    let entries;
    try {
        entries = await fsPromises.readdir(CARDEIO_DIR);
    } catch (e) {
        return [];
    }
    const idEsc = String(tournamentId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fileRe = new RegExp(`^pairings-api-event-${idEsc}-round-(\\d+)\\.json$`);
    const rounds = [];
    for (const fname of entries) {
        const m = fname.match(fileRe);
        if (!m) continue;
        const round = parseInt(m[1], 10);
        try {
            const raw = await fsPromises.readFile(path.join(CARDEIO_DIR, fname), 'utf8');
            const matches = JSON.parse(raw);
            rounds.push({ round, matches: Array.isArray(matches) ? matches : [] });
        } catch (e) {
            // Skip malformed file
        }
    }
    rounds.sort((a, b) => a.round - b.round);
    return rounds;
}

// Build a per-player-id → legend map from a cached decklists payload.
// Reuses the same auxiliary_sections legend extraction the Day 1 path
// uses (getLegendFromDecklistEntry). Returns Map<userId(number), legend(string)>.
function buildLegendByUserId(cachedDecklists) {
    const map = new Map();
    if (!cachedDecklists?.decklists) return map;
    for (const dl of cachedDecklists.decklists) {
        const uid = dl?.user?.id;
        if (uid == null) continue;
        const legend = getLegendFromDecklistEntry(dl);
        if (legend) map.set(Number(uid), legend);
    }
    return map;
}

// Walk every cached pairings round and tally legend-vs-legend records.
// For each non-bye match:
//   - look up both players' legends from the per-user map
//   - identify winner via match.winning_player_id matching rel.player.id
//   - bump { wins, losses } on the (winnerLegend, loserLegend) pair AND
//     the mirror entry (loserLegend, winnerLegend) so the matrix reads
//     correctly in both directions
//   - draws (match_is_intentional_draw / unintentional_draw) bump
//     { draws } on both pairs
// Mirror matches (same legend both sides) increment a games-counter
// on the diagonal but no W-L since both sides are the same legend.
//
// Returns:
//   {
//     all:   { [legendA]: { [legendB]: { wins, losses, draws } } },
//     day2:  { [legendA]: { [legendB]: { wins, losses, draws } } }
//   }
// day2 sub-matrix tallies only matches in rounds >= day2Round.
async function computeMatchupMatrix({ legendByUserId, day2Round }) {
    const all = {};
    const day2 = {};
    const day2Cutoff = parseInt(day2Round, 10);
    const hasDay2 = Number.isFinite(day2Cutoff) && day2Cutoff > 0;

    function bumpPair(target, a, b, field) {
        if (!target[a]) target[a] = {};
        if (!target[a][b]) target[a][b] = { wins: 0, losses: 0, draws: 0 };
        target[a][b][field]++;
    }

    const rounds = await loadAllCachedPairingsRounds();
    for (const { round, matches } of rounds) {
        const includeInDay2 = hasDay2 && round >= day2Cutoff;
        for (const match of matches) {
            if (match.match_is_bye) continue;
            if (match.match_is_ghost_match) continue;
            const rels = match.player_match_relationships || [];
            if (rels.length < 2) continue;

            const rel1 = rels[0];
            const rel2 = rels[1];
            const uid1 = rel1?.user_event_status?.user?.id;
            const uid2 = rel2?.user_event_status?.user?.id;
            if (uid1 == null || uid2 == null) continue;

            const legend1 = legendByUserId.get(Number(uid1));
            const legend2 = legendByUserId.get(Number(uid2));
            if (!legend1 || !legend2) continue;

            const isDraw = !!(match.match_is_intentional_draw || match.match_is_unintentional_draw);
            const winnerPlayerId = match.winning_player_id;
            const player1Id = rel1?.player?.id ?? uid1;
            const player2Id = rel2?.player?.id ?? uid2;

            if (isDraw) {
                bumpPair(all, legend1, legend2, 'draws');
                bumpPair(all, legend2, legend1, 'draws');
                if (includeInDay2) {
                    bumpPair(day2, legend1, legend2, 'draws');
                    bumpPair(day2, legend2, legend1, 'draws');
                }
                continue;
            }

            // Mirror matches still count for the diagonal but the
            // legend-vs-legend W-L is ambiguous (both sides same
            // legend). Record as games played so the diagonal cell
            // can show total mirror games. We use wins on the
            // diagonal as the count (losses stay 0).
            if (legend1 === legend2) {
                bumpPair(all, legend1, legend2, 'wins');
                if (includeInDay2) bumpPair(day2, legend1, legend2, 'wins');
                continue;
            }

            let winnerLegend = null;
            let loserLegend = null;
            if (winnerPlayerId === player1Id) {
                winnerLegend = legend1;
                loserLegend = legend2;
            } else if (winnerPlayerId === player2Id) {
                winnerLegend = legend2;
                loserLegend = legend1;
            } else {
                // No clear winner reported — skip rather than guess.
                continue;
            }

            bumpPair(all, winnerLegend, loserLegend, 'wins');
            bumpPair(all, loserLegend, winnerLegend, 'losses');
            if (includeInDay2) {
                bumpPair(day2, winnerLegend, loserLegend, 'wins');
                bumpPair(day2, loserLegend, winnerLegend, 'losses');
            }
        }
    }

    return { all, day2 };
}

function countArchetypes(items) {
    const counts = {};
    for (const item of items) {
        const name = item.trim();
        if (!name) continue;
        counts[name] = (counts[name] || 0) + 1;
    }
    return counts;
}

export async function calculateMetagame({ day1Round, day2Round, day2Cutoff, gameType }) {
    const config = getPlatformConfig();
    const platform = config.platform || 'manual';
    const tournamentId = config.tournamentId;

    if (platform === 'manual' || !tournamentId) {
        return { error: 'No tournament platform configured. Enter metagame data manually.' };
    }

    if (platform !== 'cardeio') {
        return { error: `Auto-calculate not yet supported for platform: ${platform}. Enter data manually.` };
    }

    // ── Day 1: Count legends from decklist export ──
    const cachedDecklists = await loadCachedDecklist(tournamentId);
    if (!cachedDecklists?.decklists?.length) {
        return { error: 'No cached decklists found. Fetch decklists first in the Tournament Platform tab.' };
    }

    const day1Legends = [];
    const day1Unmatched = [];
    for (const dl of cachedDecklists.decklists) {
        const legend = getLegendFromDecklistEntry(dl);
        if (legend) {
            day1Legends.push(legend);
        } else {
            const uid = dl.user?.id;
            const bestId = dl.user?.best_identifier || '';
            day1Unmatched.push({ name: bestId, displayId: bestId, uid, record: '', points: '', reason: 'No legend in decklist' });
        }
    }
    const day1Counts = countArchetypes(day1Legends);
    const day1Total = day1Legends.length;
    const day1Registered = cachedDecklists.decklists.length;

    // ── Day 2: Count legends from standings at specified round ──
    let day2Counts = null;
    let day2Total = 0;
    let day2Qualified = 0;
    let day2Unmatched = [];

    if (day2Round && day2Cutoff) {
        // Load standings from round N-1 (end of Day 1) to determine who made the cut
        const cutoffRound = parseInt(day2Round) - 1;
        if (cutoffRound < 1) {
            return { error: 'Day 2 round must be greater than 1.' };
        }

        let rawStandings = await loadCachedStandingsApi(cutoffRound);

        if (!rawStandings) {
            // Fetch fresh — fetchTournamentStandings has previous-round offset built in
            try {
                await fetchTournamentStandings(String(cutoffRound + 1));
                rawStandings = await loadCachedStandingsApi(cutoffRound);
            } catch (e) {
                return { error: `Failed to fetch standings for round ${cutoffRound}: ${e.message}` };
            }
        }

        if (rawStandings && rawStandings.length > 0) {
            // Filter to players who met the point cutoff
            const cutoffPoints = parseInt(day2Cutoff);
            const qualifiedPlayers = rawStandings.filter(row => {
                const pts = row.match_points || row.points || 0;
                return pts >= cutoffPoints;
            });

            console.log(`[Metagame] Round ${cutoffRound} standings: ${rawStandings.length} total, ${qualifiedPlayers.length} qualified (>= ${cutoffPoints} pts)`);

            // Look up legends for qualified players
            const day2Legends = [];
            const unmatchedPlayers = [];
            for (const row of qualifiedPlayers) {
                const userId = row.user_event_status?.user?.id || row.player?.id;
                const bestId = row.player?.best_identifier || '';
                const firstLast = row.user_event_status?.user?.first_last || '';
                const record = row.record || '';
                const pts = row.match_points || row.points || 0;

                if (userId && cachedDecklists) {
                    const dl = cachedDecklists.decklists.find(d => d.user?.id === userId);
                    const legend = getLegendFromDecklistEntry(dl || {});
                    if (legend) {
                        day2Legends.push(legend);
                    } else {
                        unmatchedPlayers.push({ name: firstLast || bestId, displayId: bestId, uid: userId, record, points: pts, reason: dl ? 'No legend in decklist' : 'No decklist found' });
                    }
                } else {
                    unmatchedPlayers.push({ name: firstLast || bestId, displayId: bestId, uid: userId, record, points: pts, reason: 'No decklist found' });
                }
            }
            day2Counts = countArchetypes(day2Legends);
            day2Total = day2Legends.length;
            day2Qualified = qualifiedPlayers.length;
            day2Unmatched = unmatchedPlayers;
        }
    }

    // ── Build sorted archetype list ──
    const allArchetypes = new Set([...Object.keys(day1Counts), ...(day2Counts ? Object.keys(day2Counts) : [])]);

    let archetypes = [...allArchetypes].map(name => {
        const d1 = day1Counts[name] || 0;
        const d1pct = day1Total > 0 ? ((d1 / day1Total) * 100).toFixed(1) : '0';
        const d2 = day2Counts ? (day2Counts[name] || 0) : null;
        const d2pct = day2Counts && day2Total > 0 ? ((d2 / day2Total) * 100).toFixed(1) : null;
        const conversion = day2Counts && d1 > 0 ? ((d2 / d1) * 100).toFixed(0) : null;

        return { name, day1Count: d1, day1Percent: d1pct, day2Count: d2, day2Percent: d2pct, conversion };
    });

    // Sort: by Day 2 count if present, otherwise Day 1 count
    archetypes.sort((a, b) => {
        if (day2Counts) {
            if (b.day2Count !== a.day2Count) return b.day2Count - a.day2Count;
        }
        return b.day1Count - a.day1Count;
    });

    // Default top 15 + "Other" remainder (client can re-slice from allArchetypesSorted)
    const topN = archetypes.slice(0, 15);
    const needsOther = archetypes.length > 15;

    const otherDay1Count = day1Total - topN.reduce((sum, a) => sum + a.day1Count, 0);
    const otherDay1Percent = day1Total > 0 ? ((otherDay1Count / day1Total) * 100).toFixed(1) : '0';
    const otherDay2Count = day2Counts ? (day2Total - topN.reduce((sum, a) => sum + (a.day2Count || 0), 0)) : null;
    const otherDay2Percent = day2Counts && day2Total > 0 ? ((otherDay2Count / day2Total) * 100).toFixed(1) : null;
    const otherConversion = day2Counts && otherDay1Count > 0 ? ((otherDay2Count / otherDay1Count) * 100).toFixed(0) : null;

    const other = needsOther ? {
        name: 'Other',
        day1Count: otherDay1Count,
        day1Percent: otherDay1Percent,
        day2Count: otherDay2Count,
        day2Percent: otherDay2Percent,
        conversion: otherConversion
    } : null;

    // Legend-vs-legend matchup matrix — computed from cached pairings
    // joined against the same decklist payload we already loaded for
    // Day 1. Returns both "all rounds" and "day 2 only" sub-matrices
    // so the master-control Matrix sub-tab's day-2-toggle pill can
    // flip client-side without a server round-trip.
    let matchupMatrix = null;
    try {
        const legendByUserId = buildLegendByUserId(cachedDecklists);
        matchupMatrix = await computeMatchupMatrix({
            legendByUserId,
            day2Round
        });
    } catch (e) {
        console.error('[Metagame] computeMatchupMatrix failed:', e);
        matchupMatrix = { all: {}, day2: {} };
    }

    const result = {
        archetypes: topN,
        allArchetypesSorted: archetypes,
        other,
        day1Total,
        day1Registered,
        day1Unmatched,
        day2Total: day2Total || null,
        day2Qualified: day2Qualified || null,
        day2Unmatched,
        matchupMatrix
    };

    // Cache to disk
    const game = gameType || 'unknown';
    const cacheDir = path.join(__dirname, '../data/metagame');
    await fsPromises.mkdir(cacheDir, { recursive: true });
    const cacheName = `metagame-${game}-${platform}-${tournamentId}.json`;
    const cachePath = path.join(cacheDir, cacheName);
    await fsPromises.writeFile(cachePath, JSON.stringify(result, null, 2));
    console.log(`[Metagame] Cached to ${cachePath}`);

    return result;
}
