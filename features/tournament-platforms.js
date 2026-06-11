import axios from 'axios';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { fileURLToPath } from 'url';
import { RoomUtils } from '../utils/room-utils.js';
import { RIFTBOUND_CHAMPIONS } from '../config/riftbound/constants.js';

// Hoisted to the top so persistPlatformConfig() / PLATFORM_CONFIG_PATH
// (defined further down) can reference it without TDZ violations.
const __filename_tp = fileURLToPath(import.meta.url);
const __dirname_tp = path.dirname(__filename_tp);

// Browser-like headers to help bypass Cloudflare
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"'
};

// Paginated fetch helper for Spicerack API endpoints (ported from anu-api/src/lib/fetch-all-pages.ts)
async function fetchAllSpicerackPages(url, token) {
    const pageSize = 200;
    let currentPage = 1;
    let allResults = [];

    for (;;) {
        const separator = url.includes('?') ? '&' : '?';
        const pageUrl = `${url}${separator}page=${currentPage}&page_size=${pageSize}`;
        const response = await axios.get(pageUrl, {
            headers: {
                ...BROWSER_HEADERS,
                'Authorization': `Token ${token}`,
                'Origin': 'https://admin.carde.io',
                'Referer': 'https://admin.carde.io/'
            }
        });
        const data = response.data;
        allResults = allResults.concat(data.results || []);

        if (data.next == null && data.next_page_number == null) break;
        currentPage++;
    }
    return allResults;
}

// Tournament platform configuration
let platformConfig = {
    platform: 'manual',  // 'melee', 'topdeck', 'cardeio', 'manual'
    tournamentId: '',
    // API keys from environment variables
    meleeApiKey: process.env.MELEE_API_KEY || '',
    meleeClientId: process.env.MELEE_CLIENT_ID || '',
    meleeClientSecret: process.env.MELEE_CLIENT_SECRET || '',
    topdeckApiKey: process.env.TOPDECK_API_KEY || '',
    cardeioToken: process.env.CARDEIO_TOKEN || '',
    cardeioRoundMap: {}  // { roundNumber: roundId } from event detail API
};

// Get current platform config
export function getPlatformConfig() {
    return {
        platform: platformConfig.platform,
        tournamentId: platformConfig.tournamentId,
        // Don't expose API keys to frontend
        hasMeleeKey: !!(platformConfig.meleeApiKey || platformConfig.meleeClientId),
        hasTopdeckKey: !!platformConfig.topdeckApiKey,
        cardeioRoundMap: platformConfig.cardeioRoundMap
    };
}

// Update platform config
export function setPlatformConfig(config) {
    if (config.platform) platformConfig.platform = config.platform;
    if (config.tournamentId !== undefined) platformConfig.tournamentId = config.tournamentId;
    // Allow setting API keys from UI if needed
    if (config.meleeApiKey) platformConfig.meleeApiKey = config.meleeApiKey;
    if (config.meleeClientId) platformConfig.meleeClientId = config.meleeClientId;
    if (config.meleeClientSecret) platformConfig.meleeClientSecret = config.meleeClientSecret;
    if (config.topdeckApiKey) platformConfig.topdeckApiKey = config.topdeckApiKey;
    // Persist operator-set fields so the active event survives server
    // restarts. Fire-and-forget — error logged but not propagated, since
    // this is a "nice to have" save and the in-memory update has already
    // taken effect for any caller awaiting setPlatformConfig.
    persistPlatformConfig().catch(e => {
        console.error('[Platform] Failed to persist platform config:', e.message);
    });
}

// Path for the persisted operator-set platform config. Lives next to
// other operator state under data/. API keys are NOT persisted (they
// stay in .env / process.env), only platform + tournamentId.
const PLATFORM_CONFIG_PATH = path.join(__dirname_tp, '..', 'data', 'platformConfig.json');

async function persistPlatformConfig() {
    const persistable = {
        platform: platformConfig.platform,
        tournamentId: platformConfig.tournamentId
    };
    await fsPromises.mkdir(path.dirname(PLATFORM_CONFIG_PATH), { recursive: true });
    await fsPromises.writeFile(PLATFORM_CONFIG_PATH, JSON.stringify(persistable, null, 2));
}

// Boot loader — restores the operator's last saved platform + tournament
// ID. Missing file is fine (first boot); we just leave defaults and the
// operator can configure via Global Settings. Called from server.js
// during initialize().
export async function loadPlatformConfig() {
    try {
        const raw = await fsPromises.readFile(PLATFORM_CONFIG_PATH, 'utf8');
        const saved = JSON.parse(raw);
        if (saved.platform) platformConfig.platform = saved.platform;
        if (saved.tournamentId) platformConfig.tournamentId = saved.tournamentId;
        console.log(`[Platform] Restored config — platform=${platformConfig.platform} tournamentId=${platformConfig.tournamentId}`);
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log('[Platform] No saved config — starting with defaults.');
            return;
        }
        console.error('[Platform] Failed to load saved config:', e.message);
    }
}

// Emit platform config to clients
export function emitPlatformConfig(io) {
    RoomUtils.emitWithRoomMapping(io, 'tournament-platform-config', getPlatformConfig());
}

// --- Carde.io / Riftbound support ---
const CARDEIO_DIR = path.join(__dirname_tp, '../data/cardeio');

const RUNE_NAME_TO_LETTER = { calm: 'g', chaos: 'p', fury: 'r', mind: 'b', order: 'y', body: 'o' };

function cardeioGetDeckCards(deckDetail, sectionType) {
    if (!deckDetail?.sections) return [];
    const section = deckDetail.sections.find(s => s.section_type === sectionType);
    return section ? section.cards.map(c => `${c.quantity} ${c.name}`) : [];
}

const RUNE_ORDER = ['r', 'g', 'b', 'o', 'p', 'y'];

function cardeioGetRuneLetters(deckDetail) {
    if (!deckDetail?.sections) return '';
    const section = deckDetail.sections.find(s => s.section_type === 'rune_pool' || s.section_key === 'rune_pool');
    if (!section) return '';
    const letters = section.cards.map(c => {
        const n = c.name.toLowerCase();
        for (const [rune, letter] of Object.entries(RUNE_NAME_TO_LETTER)) {
            if (n.includes(rune)) return letter;
        }
        return '';
    }).filter(Boolean);
    return RUNE_ORDER.filter(l => letters.includes(l)).join('');
}

function cardeioGetRuneQuantities(deckDetail) {
    if (!deckDetail?.sections) return '';
    const section = deckDetail.sections.find(s => s.section_type === 'rune_pool' || s.section_key === 'rune_pool');
    if (!section) return '';
    const letterQty = {};
    for (const c of section.cards) {
        const n = c.name.toLowerCase();
        for (const [rune, letter] of Object.entries(RUNE_NAME_TO_LETTER)) {
            if (n.includes(rune)) { letterQty[letter] = (letterQty[letter] || 0) + c.quantity; break; }
        }
    }
    return RUNE_ORDER.filter(l => l in letterQty).map(l => letterQty[l]).join('');
}

function cardeioGetChampion(deckDetail, legend) {
    if (!deckDetail?.sections) return '';
    const section = deckDetail.sections.find(s => s.section_type === 'main');
    if (!section) return '';
    const firstName = legend ? legend.split(',')[0].trim().toLowerCase() : '';
    const found = section.cards.filter(c =>
        RIFTBOUND_CHAMPIONS.has(c.name) &&
        (!firstName || c.name.toLowerCase().startsWith(firstName))
    );
    return found.length === 1 ? found[0].name : '';
}

function cardeioFormatRecord(record) {
    if (!record) return '';
    const parts = record.split('-');
    if (parts.length === 3 && parts[2] === '0') return `${parts[0]}-${parts[1]}`;
    return record;
}

function cardeioMapPlayer(entry, side, enteringRecord = '') {
    const deckDetail = entry[`P${side} Deck Detail`];
    return {
        name:       entry[`Player ${side}`] || '',
        pronouns:   '',
        record:     enteringRecord,
        archetype:  '',
        decklistId: null,
        legend:     entry[`P${side} Deck`] || '',
        champion:   cardeioGetChampion(deckDetail, entry[`P${side} Deck`]),
        runes:    cardeioGetRuneLetters(deckDetail),
        runeList: (() => {
            const letters = cardeioGetRuneLetters(deckDetail).split('');
            const qtys = cardeioGetRuneQuantities(deckDetail).split('');
            return letters.map((l, i) => ({ letter: l, qty: qtys[i] || '' }));
        })(),
        mainDeck:       cardeioGetDeckCards(deckDetail, 'main'),
        sideboard:  cardeioGetDeckCards(deckDetail, 'sideboard'),
    };
}

// --- Carde.io event detail (round ID mapping) ---

// Fetch event detail from Carde API and extract round number → round ID mapping
export async function fetchCardeioEventDetail(eventId) {
    const token = platformConfig.cardeioToken;
    if (!token) throw new Error('CARDEIO_TOKEN not set in .env');

    const url = `https://api.admin.carde.io/api/v2/organize/events/${eventId}/detail/`;
    const response = await axios.get(url, {
        headers: {
            ...BROWSER_HEADERS,
            'Authorization': `Token ${token}`,
            'Origin': 'https://admin.carde.io',
            'Referer': 'https://admin.carde.io/'
        }
    });

    // Flatten all phases' rounds into a single roundNumber → roundId map
    const roundMap = {};
    const phases = response.data?.tournament_phases || [];
    for (const phase of phases) {
        const rounds = phase.rounds || [];
        for (const round of rounds) {
            if (round.round_number && round.id) {
                roundMap[round.round_number] = round.id;
            }
        }
    }

    platformConfig.cardeioRoundMap = roundMap;
    console.log(`[Carde] Event ${eventId} round map:`, roundMap);
    return roundMap;
}

// Look up the Carde.io round ID for a given round number
export function getCardeioRoundId(roundNumber) {
    return platformConfig.cardeioRoundMap[roundNumber] || null;
}

// --- Carde.io decklist export (event-level, one-time fetch) ---

const CARDEIO_CACHE_DIR = path.join(CARDEIO_DIR, 'cache');

// Fetch decklist export from Carde API and cache to disk
export async function fetchCardeioDecklist(eventId) {
    const token = platformConfig.cardeioToken;
    if (!token) throw new Error('CARDEIO_TOKEN not set in .env');

    const url = `https://api.admin.carde.io/api/v2/deckbuilder/deck-submissions/events/${eventId}/export/?download=true`;
    const response = await axios.get(url, {
        headers: {
            ...BROWSER_HEADERS,
            'Authorization': `Token ${token}`,
            'Origin': 'https://admin.carde.io',
            'Referer': 'https://admin.carde.io/'
        }
    });

    // Ensure extra directory exists
    await fsPromises.mkdir(CARDEIO_CACHE_DIR, { recursive: true });
    const filePath = path.join(CARDEIO_CACHE_DIR, `event-${eventId}-decklists.json`);
    await fsPromises.writeFile(filePath, JSON.stringify(response.data, null, 2));
    console.log(`[Carde] Cached ${response.data?.decklists?.length || 0} decklists to ${filePath}`);
    return response.data;
}

// Load cached decklist export from disk (returns null if not cached)
export async function loadCachedDecklist(eventId) {
    const filePath = path.join(CARDEIO_CACHE_DIR, `event-${eventId}-decklists.json`);
    try {
        const raw = await fsPromises.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

// Build a player object from the decklist export data (same shape as cardeioMapPlayer)
function cardeioMapPlayerFromExport(playerName, record, decklistEntry, fullName = null) {
    const displayName = fullName || playerName;
    if (!decklistEntry) {
        return { name: displayName, pronouns: '', record, archetype: '', decklistId: null, legend: '', champion: '', runes: '', runeList: [], battlefields: [], mainDeck: [], sideboard: [] };
    }

    const aux = decklistEntry.auxiliary_sections || [];
    const sections = decklistEntry.sections || [];

    // Legend from auxiliary_sections
    const legendSection = aux.find(s => s.type_code === 'legend');
    const legend = legendSection?.cards?.[0]?.name || '';

    // Champion from auxiliary_sections
    const championSection = aux.find(s => s.type_code === 'champion');
    const champion = championSection?.cards?.[0]?.name || '';

    // Battlefields from auxiliary_sections
    const bfSection = aux.find(s => s.type_code === 'battlefield');
    const battlefields = (bfSection?.cards || []).map(c => c.name);

    // Runes from sections.rune_pool
    const runePoolSection = sections.find(s => s.section_key === 'rune_pool');
    const runeLetters = cardeioGetRuneLetters({ sections });
    const runeQtys = cardeioGetRuneQuantities({ sections });
    const runeLetterArr = runeLetters.split('');
    const runeQtyArr = runeQtys.split('');
    const runeList = runeLetterArr.map((l, i) => ({ letter: l, qty: runeQtyArr[i] || '' }));

    // Main deck from sections.main
    const mainSection = sections.find(s => s.section_key === 'main');
    const mainDeck = mainSection ? mainSection.cards.map(c => `${c.quantity} ${c.name}`) : [];

    // Sideboard from sections.sideboard
    const sideSection = sections.find(s => s.section_key === 'sideboard');
    const sideboard = sideSection ? sideSection.cards.map(c => `${c.quantity} ${c.name}`) : [];

    return {
        name: displayName,
        pronouns: '',
        record,
        archetype: '',
        decklistId: null,
        legend,
        champion,
        battlefields,
        runes: runeLetters,
        runeList,
        mainDeck,
        sideboard
    };
}

// Find a player's decklist entry by name match (case-insensitive)
function findDecklistByName(playerName, cachedData) {
    if (!cachedData?.decklists || !playerName) return null;
    const lower = playerName.trim().toLowerCase();
    return cachedData.decklists.find(d =>
        (d.user?.best_identifier || '').trim().toLowerCase() === lower
    ) || null;
}

// --- Carde.io registrations (event-level, one-time fetch) ---

// Simple CSV parser (no external deps) — handles quoted fields with commas
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCSVLine(lines[0]);
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h.trim()] = (values[i] || '').trim(); });
        return obj;
    });
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

// Fetch registrations CSV from Carde API and cache as JSON
export async function fetchCardeioRegistrations(eventId, gameSlug = 'riftbound') {
    const token = process.env.CARDEIO_TOKEN || '';
    const session = process.env.CARDEIO_SESSION || '';
    if (!token) throw new Error('CARDEIO_TOKEN not set in .env');

    const url = `https://admin.carde.io/api/csv-export/event-registrations?game_slug=${encodeURIComponent(gameSlug)}&event_id=${encodeURIComponent(eventId)}`;
    const response = await axios.get(url, {
        headers: {
            ...BROWSER_HEADERS,
            'Cookie': `web_sessionToken=${token}; web_session=${session}`,
            'Referer': 'https://admin.carde.io/'
        }
    });

    const csvText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const registrations = parseCSV(csvText);

    await fsPromises.mkdir(CARDEIO_CACHE_DIR, { recursive: true });
    const filePath = path.join(CARDEIO_CACHE_DIR, `event-${eventId}-registrations.json`);
    await fsPromises.writeFile(filePath, JSON.stringify(registrations, null, 2));
    console.log(`[Carde] Cached ${registrations.length} registrations to ${filePath}`);
    return { count: registrations.length };
}

// Fetch matches + standings CSVs for a specific Carde round ID, save as pairings/standings JSON
export async function fetchCardeioRoundData(roundId, roundNumber) {
    const token = process.env.CARDEIO_TOKEN || '';
    const session = process.env.CARDEIO_SESSION || '';
    if (!token) throw new Error('CARDEIO_TOKEN not set in .env');

    const cookieHeader = `web_sessionToken=${token}; web_session=${session}`;
    const headers = {
        ...BROWSER_HEADERS,
        'Cookie': cookieHeader,
        'Referer': 'https://admin.carde.io/'
    };

    await fsPromises.mkdir(CARDEIO_DIR, { recursive: true });
    const results = { matches: null, standings: null };

    // Fetch matches (pairings) CSV
    try {
        const matchesUrl = `https://admin.carde.io/api/csv-export/organize/matches?round_id=${encodeURIComponent(roundId)}`;
        const matchesRes = await axios.get(matchesUrl, { headers });
        const matchesCsv = typeof matchesRes.data === 'string' ? matchesRes.data : JSON.stringify(matchesRes.data);
        const rawMatches = parseCSV(matchesCsv);
        // Normalize CSV columns to match expected pairings format
        const matches = rawMatches.map(row => {
            const players = (row['Players'] || '').split(' vs ');
            const isBye = row['Is Bye'] === 'True' || players.length < 2;
            return {
                Table: parseInt(row['Table Number']) || -1,
                'Player 1': (players[0] || '').trim(),
                'Player 2': isBye ? '—' : (players[1] || '').trim(),
                Status: row['Status'] || '',
                Result: '',
                'P1 Record': '',
                'P2 Record': isBye ? '—' : '',
                'P1 Deck': '',
                'P2 Deck': '',
                Winner: row['Winner'] || '',
                'Is Bye': isBye ? 'Yes' : 'No'
            };
        });
        const filePath = path.join(CARDEIO_DIR, `pairings-round-${roundNumber}.json`);
        await fsPromises.writeFile(filePath, JSON.stringify(matches, null, 2));
        console.log(`[Carde] Cached ${matches.length} pairings to ${filePath}`);
        results.matches = { success: true, count: matches.length };
    } catch (e) {
        const msg = e.response?.status === 401
            ? 'Auth failed — CARDEIO_TOKEN/SESSION may be expired'
            : e.message;
        console.error(`[Carde] Matches fetch failed: ${msg}`);
        results.matches = { success: false, error: msg };
    }

    // Fetch standings CSV
    try {
        const standingsUrl = `https://admin.carde.io/api/csv-export/organize/standings?round_id=${encodeURIComponent(roundId)}`;
        const standingsRes = await axios.get(standingsUrl, { headers });
        const standingsCsv = typeof standingsRes.data === 'string' ? standingsRes.data : JSON.stringify(standingsRes.data);
        const standings = parseCSV(standingsCsv);
        const filePath = path.join(CARDEIO_DIR, `standings-round-${roundNumber}.json`);
        await fsPromises.writeFile(filePath, JSON.stringify(standings, null, 2));
        console.log(`[Carde] Cached ${standings.length} standings to ${filePath}`);
        results.standings = { success: true, count: standings.length };
    } catch (e) {
        const msg = e.response?.status === 401
            ? 'Auth failed — CARDEIO_TOKEN/SESSION may be expired'
            : e.message;
        console.error(`[Carde] Standings fetch failed: ${msg}`);
        results.standings = { success: false, error: msg };
    }

    return results;
}

// Fetch match data from Spicerack matches API (has user_id per player per table)
export async function fetchSpicerackMatches(roundId, roundNumber) {
    const token = platformConfig.cardeioToken;
    if (!token) throw new Error('CARDEIO_TOKEN not set in .env');

    const url = `https://api.admin.carde.io/api/v2/organize/tournament-rounds/${roundId}/matches-list/`;
    const matches = await fetchAllSpicerackPages(url, token);

    await fsPromises.mkdir(CARDEIO_DIR, { recursive: true });
    const filePath = path.join(CARDEIO_DIR, `matches-api-round-${roundNumber}.json`);
    await fsPromises.writeFile(filePath, JSON.stringify(matches, null, 2));
    console.log(`[Carde] Cached ${matches.length} match API results to ${filePath}`);
    return { success: true, count: matches.length };
}

// Load cached Spicerack match API data from disk
async function loadCachedSpicerackMatches(roundNumber) {
    const filePath = path.join(CARDEIO_DIR, `matches-api-round-${roundNumber}.json`);
    try {
        const raw = await fsPromises.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

// Load cached registrations from disk
export async function loadCachedRegistrations(eventId) {
    const filePath = path.join(CARDEIO_CACHE_DIR, `event-${eventId}-registrations.json`);
    try {
        const raw = await fsPromises.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

// Build fullName → [{userId, firstName, lastName}] lookup from registrations
function buildFullNameToUserIds(registrations) {
    const map = new Map();
    for (const r of registrations) {
        const first = (r['First Name'] || '').trim();
        const last = (r['Last Name'] || '').trim();
        const fullName = (`${first} ${last}`).trim().toLowerCase();
        if (!fullName || !r['User ID']) continue;
        if (!map.has(fullName)) map.set(fullName, []);
        map.get(fullName).push({
            userId: parseInt(r['User ID'], 10),
            firstName: first,
            lastName: last,
            displayName: (r['Display Name'] || '').trim()
        });
    }
    return map;
}

// Build bestIdentifier → [{userId, firstName, lastName}] lookup from registrations
function buildBestIdToUserIds(registrations) {
    const map = new Map();
    for (const r of registrations) {
        const first = (r['First Name'] || '').trim();
        const last = (r['Last Name'] || '').trim();
        const bestId = last ? `${first} ${last[0]}`.toLowerCase() : first.toLowerCase();
        if (!bestId || !r['User ID']) continue;
        if (!map.has(bestId)) map.set(bestId, []);
        map.get(bestId).push({
            userId: parseInt(r['User ID'], 10),
            firstName: first,
            lastName: last,
            displayName: (r['Display Name'] || '').trim()
        });
    }
    return map;
}

// Resolve player display name from Spicerack match API data (ported from anu-api pairings-columns.tsx)
// Priority: registration Display Name > first_name + last_name > best_identifier
function resolvePlayerNameFromMatchAPI(playerRelationship, registrations) {
    const player = playerRelationship?.player;
    const userId = playerRelationship?.user_event_status?.user?.id;

    // Priority 1: Display Name from registration (keyed by user_id)
    if (userId && registrations) {
        const reg = registrations.find(r => String(r['User ID']) === String(userId));
        if (reg?.['Display Name']) return reg['Display Name'];
    }

    // Priority 2: first_name + last_name from player object
    if (player) {
        const full = `${player.first_name || ''} ${player.last_name || ''}`.trim();
        if (full) return full;
    }

    // Priority 3: best_identifier
    return player?.best_identifier || 'Unknown';
}

// Find decklist by User ID (exact match)
function findDecklistByUserId(userId, cachedDecklists) {
    if (!cachedDecklists?.decklists || !userId) return null;
    return cachedDecklists.decklists.find(d => d.user?.id === userId) || null;
}

// Get legend name from a decklist entry's auxiliary_sections
function getLegendFromDecklist(decklistEntry) {
    if (!decklistEntry) return '';
    const aux = decklistEntry.auxiliary_sections || [];
    const legendSection = aux.find(s => s.type_code === 'legend');
    return legendSection?.cards?.[0]?.name || '';
}

// Multi-level player → decklist resolution
// Returns { decklist, fullName, userId, matchMethod }
function resolvePlayerDecklist(realName, bestId, legendName, cachedDecklists, registrations) {
    if (!cachedDecklists?.decklists) {
        return { decklist: null, fullName: null, userId: null, matchMethod: 'no-decklists' };
    }

    // Helper: try to resolve from a list of userId candidates, with legend tiebreaker
    function resolveFromCandidates(candidates, method) {
        if (candidates.length === 1) {
            const decklist = findDecklistByUserId(candidates[0].userId, cachedDecklists);
            const full = `${candidates[0].firstName} ${candidates[0].lastName}`.trim();
            return { decklist, fullName: full, userId: candidates[0].userId, matchMethod: method };
        }
        // Multiple candidates — legend tiebreaker
        if (legendName) {
            for (const c of candidates) {
                const dl = findDecklistByUserId(c.userId, cachedDecklists);
                if (dl && getLegendFromDecklist(dl).toLowerCase() === legendName.toLowerCase()) {
                    const full = `${c.firstName} ${c.lastName}`.trim();
                    return { decklist: dl, fullName: full, userId: c.userId, matchMethod: `${method}+legend` };
                }
            }
        }
        // No legend match — just use first candidate
        const decklist = findDecklistByUserId(candidates[0].userId, cachedDecklists);
        const full = `${candidates[0].firstName} ${candidates[0].lastName}`.trim();
        return { decklist, fullName: full, userId: candidates[0].userId, matchMethod: `${method}+first` };
    }

    if (registrations && registrations.length > 0) {
        // Tier 1: Real Name → fullName map → userId(s)
        if (realName) {
            const fullNameMap = buildFullNameToUserIds(registrations);
            const candidates = fullNameMap.get(realName.trim().toLowerCase());
            if (candidates && candidates.length > 0) {
                return resolveFromCandidates(candidates, 'realName');
            }
        }

        // Tier 2: bestId → bestId map → userId(s)
        if (bestId) {
            const bestIdMap = buildBestIdToUserIds(registrations);
            const candidates = bestIdMap.get(bestId.trim().toLowerCase());
            if (candidates && candidates.length > 0) {
                return resolveFromCandidates(candidates, 'bestId');
            }
        }
    }

    // Tier 3: name-only fallback
    const decklist = findDecklistByName(bestId, cachedDecklists);
    return { decklist, fullName: null, userId: null, matchMethod: 'nameOnly' };
}

// Normalize player name from various formats
function normalizeName(rawName) {
    if (!rawName) return '';

    // Remove pronouns and N/A placeholders
    let name = rawName
        .replace(/\b(he\/him|she\/her|they\/them|he\/they|she\/they|it\/its)\b/gi, '')
        .replace(/\bN\/A\b/gi, '')
        .trim();

    // Handle "Last, First" format
    if (name.includes(',')) {
        const [lastName, firstName] = name.split(',').map(s => s.trim());
        const firstNameOnly = firstName.split(' ')[0];
        return `${firstNameOnly} ${lastName}`;
    }

    // Handle "First Last" format - take first and last word
    const parts = name.split(/\s+/).filter(p => p.length > 0);
    if (parts.length > 1) {
        return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return parts[0] || '';
}

// Normalize standings data to common format
function normalizeStandings(rawStandings, platform) {
    const normalized = {};

    for (let i = 1; i <= 64; i++) {
        normalized[i.toString()] = {
            rank: '',
            name: '',
            archetype: '',
            record: ''
        };
    }

    if (!rawStandings || !Array.isArray(rawStandings)) {
        return normalized;
    }

    // Log first entry to see field names
    if (rawStandings.length > 0) {
        console.log('Sample standings entry TOP-LEVEL fields:', Object.keys(rawStandings[0]));
        // Log just the top-level fields (not nested) to see rank/record fields
        const topLevelData = {};
        for (const key of Object.keys(rawStandings[0])) {
            const val = rawStandings[0][key];
            if (typeof val !== 'object' || val === null) {
                topLevelData[key] = val;
            } else {
                topLevelData[key] = `[${typeof val}]`;
            }
        }
        console.log('Sample standings entry top-level values:', JSON.stringify(topLevelData, null, 2));
    }

    rawStandings.forEach((entry, index) => {
        // Handle both uppercase (Melee API) and lowercase field names
        const rank = entry.Rank || entry.rank || entry.Standing || entry.standing || (index + 1);
        if (rank > 64) return;

        let name = '';
        let archetype = '';
        let record = '';
        // For 2v2 vendors (flyquest), operators enter a team as a single Melee
        // "player" with FirstName=playerA, LastName=playerB. Expose both halves
        // so downstream consumers (standings layouts, roster portrait lookups)
        // can treat them as individual players. Populated in the melee branch
        // only; left blank for solo formats / other platforms.
        let player1 = '';
        let player2 = '';

        if (platform === 'melee') {
            // Melee.gg nests player info inside Team.Players[0]
            const player = entry.Team?.Players?.[0] || entry;
            const playerId = player.ID || player.Id || player.id;

            name = normalizeName(player.Name || player.name || player.DisplayName || player.displayName || '');

            // 2v2 workaround split — FirstName/LastName carry the two player
            // names instead of a real first/last. See comment above.
            player1 = normalizeName(player.FirstName || player.firstName || '');
            player2 = normalizeName(player.LastName  || player.lastName  || '');

            // Archetype/deck name - find decklist matching this player's ID
            const decklists = entry.Decklists || [];

            // Debug: log first entry's decklist structure
            if (index === 0 && decklists.length > 0) {
                console.log('DEBUG - Player ID:', playerId);
                console.log('DEBUG - Decklists array length:', decklists.length);
                console.log('DEBUG - First decklist keys:', Object.keys(decklists[0]));
                console.log('DEBUG - First decklist:', JSON.stringify(decklists[0], null, 2));
            }

            const playerDecklist = decklists.find(d =>
                d.PlayerId === playerId || d.playerId === playerId ||
                d.PlayerID === playerId || d.playerID === playerId
            );
            archetype = playerDecklist?.DecklistName || playerDecklist?.decklistName || '';

            // Match record is at the entry level, not player level
            const matchRecord = entry.MatchRecord || entry.matchRecord;
            if (matchRecord) {
                record = matchRecord;
            } else {
                const wins = entry.MatchWins || entry.matchWins || entry.Wins || entry.wins || 0;
                const losses = entry.MatchLosses || entry.matchLosses || entry.Losses || entry.losses || 0;
                const draws = entry.MatchDraws || entry.matchDraws || entry.Draws || entry.draws || 0;
                // Convention: hide the draws segment when there are 0 draws
                // ("3-0" reads cleaner than "3-0-0"). Matches the Carde API
                // branch below at line ~1276 which already does this.
                record = draws > 0 ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`;
            }
        } else if (platform === 'topdeck') {
            name = normalizeName(player.name || '');
            // TopDeck may have decklist name as archetype
            archetype = player.decklist || player.deckName || '';
            const wins = player.wins || 0;
            const losses = player.losses || 0;
            const draws = player.draws || 0;
            record = draws > 0 ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`;
        }

        normalized[rank.toString()] = {
            rank: parseInt(rank, 10),
            name,
            player1,
            player2,
            archetype,
            record
        };
    });

    return normalized;
}

// Build auth headers for Melee.gg API (direct Basic auth, no token exchange)
function getMeleeAuthHeaders() {
    console.log('Melee credentials - Client ID:', platformConfig.meleeClientId ? platformConfig.meleeClientId.substring(0, 8) + '...' : 'MISSING');
    console.log('Melee credentials - Client Secret:', platformConfig.meleeClientSecret ? 'SET' : 'MISSING');
    const basicAuth = Buffer.from(`${platformConfig.meleeClientId}:${platformConfig.meleeClientSecret}`).toString('base64');
    return {
        ...BROWSER_HEADERS,
        'Authorization': `Basic ${basicAuth}`
    };
}

// Fetch standings from Melee.gg
async function fetchMeleeStandings(tournamentId, roundNumber) {
    try {
        const authHeaders = getMeleeAuthHeaders();
        console.log('Using Basic auth for Melee.gg API');

        // Step 1: Fetch tournament info to get round IDs
        const tournamentUrl = `https://melee.gg/api/tournament/${tournamentId}`;
        console.log(`Fetching tournament info from: ${tournamentUrl}`);

        const tournamentResponse = await fetch(tournamentUrl, { headers: authHeaders });

        if (!tournamentResponse.ok) {
            console.error('Tournament fetch error:', tournamentResponse.status, tournamentResponse.statusText);
            throw new Error(`Tournament fetch failed: ${tournamentResponse.status}`);
        }

        const tournament = await tournamentResponse.json();
        console.log('Tournament:', tournament.Name);

        // Step 2: Find the round ID for the requested round number
        // Round N tab shows standings after round N-1
        // So if roundNumber is "2", we want standings after round 1
        const targetRoundNumber = parseInt(roundNumber) - 1;

        if (targetRoundNumber < 1) {
            throw new Error('Cannot fetch standings before round 1.');
        }

        // Rounds are in tournament.Phases[].Rounds[] (uppercase)
        let rounds = [];
        if (tournament.Phases && Array.isArray(tournament.Phases)) {
            tournament.Phases.forEach(phase => {
                if (phase.Rounds && Array.isArray(phase.Rounds)) {
                    rounds = rounds.concat(phase.Rounds);
                }
            });
        }

        console.log(`Found ${rounds.length} rounds`);

        // Find the round with matching SortOrder
        const targetRound = rounds.find(r => r.SortOrder === targetRoundNumber);

        if (!targetRound) {
            // If we can't find by SortOrder, try by index
            if (rounds.length >= targetRoundNumber) {
                const roundByIndex = rounds[targetRoundNumber - 1];
                if (roundByIndex) {
                    console.log(`Using round by index: ${roundByIndex.ID}`);
                    return await fetchStandingsForRound(roundByIndex.ID, authHeaders);
                }
            }
            throw new Error(`Round ${targetRoundNumber} not found in tournament.`);
        }

        const roundId = targetRound.ID;
        console.log(`Fetching standings for round ${targetRoundNumber} (ID: ${roundId})...`);

        return await fetchStandingsForRound(roundId, authHeaders);

    } catch (error) {
        console.error('Melee.gg API error:', error.message);
        throw new Error(`Failed to fetch from Melee.gg: ${error.message}`);
    }
}

// Fetch standings for a specific round ID
async function fetchStandingsForRound(roundId, authHeaders) {
    const standingsUrl = `https://melee.gg/api/standing/list/round/${roundId}?pageSize=32`;
    console.log(`Fetching standings from: ${standingsUrl}`);

    const standingsResponse = await fetch(standingsUrl, { headers: authHeaders });

    if (!standingsResponse.ok) {
        throw new Error(`Standings fetch failed: ${standingsResponse.status}`);
    }

    const data = await standingsResponse.json();
    console.log('Melee.gg standings response type:', typeof data);
    console.log('Melee.gg standings is array:', Array.isArray(data));
    console.log('Melee.gg standings keys:', data ? Object.keys(data) : 'null');
    console.log('Melee.gg standings raw:', JSON.stringify(data, null, 2).substring(0, 1000));

    // Handle case where data is wrapped in a paginated response object
    let standingsArray = data;
    if (data && !Array.isArray(data)) {
        // Melee.gg returns { Content: [...], PageSize: 25, RecordsTotal: N, ... }
        standingsArray = data.Content || data.Standings || data.standings || data.Data || data.data || [];
        console.log('Extracted standings array length:', standingsArray?.length || 0);
        console.log('Total records available:', data.RecordsTotal || 'unknown');
    }

    console.log('Melee.gg standings fetched:', standingsArray?.length || 0, 'entries');
    return normalizeStandings(standingsArray, 'melee');
}

// Fetch standings from TopDeck.gg
async function fetchTopdeckStandings(tournamentId) {
    if (!platformConfig.topdeckApiKey) {
        throw new Error('TopDeck.gg API key not configured. Set TOPDECK_API_KEY environment variable.');
    }

    try {
        const response = await axios.get(
            `https://topdeck.gg/api/v2/tournaments/${tournamentId}/standings`,
            {
                headers: {
                    'Authorization': platformConfig.topdeckApiKey
                }
            }
        );

        return normalizeStandings(response.data, 'topdeck');
    } catch (error) {
        console.error('TopDeck.gg API error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch from TopDeck.gg: ${error.response?.data?.message || error.message}`);
    }
}

// Fetch pairings (matches) for a specific round from Carde.io v2 API.
//
// Uses the same paginated Spicerack endpoint as standings; the URL just
// flips from /standings/ → /matches-list/. Auth is Token-only (no cookie
// session needed) — verified against anu-api's generated SDK at
// `~/Desktop/dev/anu-api/src/client/sdk.gen.ts:16306`. Caches the raw
// paginated response to disk under
// data/cardeio/pairings-api-event-{eventId}-round-{N}.json
// so reconnects + page reloads don't need to refetch.
//
// `roundNumber` is the master-control round (1..N); the function looks
// up the Carde-internal round ID via cardeioRoundMap, which must be
// populated first via fetchCardeioEventDetail() (the master-control
// "Save tournament config" flow does this automatically).
export async function fetchCardeioPairings(roundNumber) {
    const token = platformConfig.cardeioToken;
    if (!token) throw new Error('CARDEIO_TOKEN not set in .env');

    const tournamentId = platformConfig.tournamentId;
    if (!tournamentId) {
        throw new Error('No tournament ID set. Configure platform tournament ID first.');
    }

    const cardeRoundId = platformConfig.cardeioRoundMap?.[roundNumber]
        || platformConfig.cardeioRoundMap?.[String(roundNumber)]
        || platformConfig.cardeioRoundMap?.[Number(roundNumber)];
    if (!cardeRoundId) {
        throw new Error(`No Carde round ID for round ${roundNumber}. Save tournament config first to populate the round map.`);
    }

    const url = `https://api.admin.carde.io/api/v2/organize/tournament-rounds/${cardeRoundId}/matches-list/`;
    console.log(`[Carde] Fetching pairings for round ${roundNumber} (carde id ${cardeRoundId}, event ${tournamentId})`);

    let allMatches;
    try {
        allMatches = await fetchAllSpicerackPages(url, token);
    } catch (e) {
        if (e.response?.status === 401) {
            throw new Error('Authentication failed — CARDEIO_TOKEN may be expired. Update .env and restart.');
        }
        throw e;
    }

    console.log(`[Carde] Fetched ${allMatches.length} pairings entries for round ${roundNumber}`);

    // Cache raw response — scoped by event ID so switching tournaments
    // doesn't pollute the new event with stale data from the old one.
    await fsPromises.mkdir(CARDEIO_DIR, { recursive: true });
    const cachePath = path.join(CARDEIO_DIR, `pairings-api-event-${tournamentId}-round-${roundNumber}.json`);
    await fsPromises.writeFile(cachePath, JSON.stringify(allMatches, null, 2));
    console.log(`[Carde] Cached ${allMatches.length} pairings to ${cachePath}`);

    return allMatches;
}

// Fetch standings from Carde.io via Spicerack JSON API
// Auto-pulls previous round's standings to avoid spoilers
async function fetchCardeioStandings(tournamentId, roundId) {
    const token = platformConfig.cardeioToken;
    if (!token) throw new Error('CARDEIO_TOKEN not set in .env');

    const roundNum = parseInt(roundId, 10);
    if (roundNum <= 1) {
        throw new Error('No standings available before round 1.');
    }

    const prevRound = String(roundNum - 1);
    console.log(`[Carde] Round map:`, JSON.stringify(platformConfig.cardeioRoundMap));
    console.log(`[Carde] Looking up prevRound: "${prevRound}" (type: ${typeof prevRound})`);
    const cardeRoundId = platformConfig.cardeioRoundMap?.[prevRound] || platformConfig.cardeioRoundMap?.[roundNum - 1];
    if (!cardeRoundId) {
        throw new Error(`No Carde.io round ID found for round ${prevRound}. Please save tournament config first to fetch round IDs.`);
    }

    console.log(`[Carde] Fetching standings for round ${prevRound} (previous round) to avoid spoilers`);

    const url = `https://api.admin.carde.io/api/v2/organize/tournament-rounds/${cardeRoundId}/standings/`;
    console.log(`[Carde] Standings URL: ${url}`);

    let allStandings;
    try {
        allStandings = await fetchAllSpicerackPages(url, token);
    } catch (e) {
        if (e.response?.status === 401) {
            throw new Error('Authentication failed — CARDEIO_TOKEN may be expired. Update .env and restart.');
        }
        throw e;
    }

    console.log(`[Carde] Fetched ${allStandings.length} standings entries`);
    if (allStandings.length === 0) {
        throw new Error(`No standings data returned for round ${prevRound}. Standings may not be published yet.`);
    }
    if (allStandings.length > 0) {
        console.log(`[Carde] Sample standings entry keys:`, Object.keys(allStandings[0]));
        console.log(`[Carde] Sample standings entry:`, JSON.stringify(allStandings[0], null, 2).substring(0, 500));
    }

    // Cache raw API response for debugging/reference — scoped by event ID
    // so switching tournaments doesn't pollute the new event with stale
    // data from the old one.
    await fsPromises.mkdir(CARDEIO_DIR, { recursive: true });
    const cachePath = path.join(CARDEIO_DIR, `standings-api-event-${tournamentId}-round-${prevRound}.json`);
    await fsPromises.writeFile(cachePath, JSON.stringify(allStandings, null, 2));
    console.log(`[Carde] Cached ${allStandings.length} standings entries to ${cachePath}`);

    // Enrich with display names from registrations and legends from decklists
    const cachedRegistrations = await loadCachedRegistrations(tournamentId);
    const cachedDecklists = await loadCachedDecklist(tournamentId);

    const standings = {};
    allStandings.forEach((row, index) => {
        const rank = row.rank || index + 1;
        if (rank > 64) return;

        const userId = row.user_event_status?.user?.id || row.player?.id;

        // Resolve display name: registration Display Name → best_identifier → first_last
        let name = '';
        if (userId && cachedRegistrations) {
            const reg = cachedRegistrations.find(r => String(r['User ID']) === String(userId));
            if (reg?.['Display Name']) name = reg['Display Name'];
        }
        if (!name) {
            name = row.user_event_status?.best_identifier
                || row.player?.best_identifier
                || row.user_event_status?.user?.first_last
                || '';
        }

        // Resolve legend from decklist export
        const decklist = findDecklistByUserId(userId, cachedDecklists);
        const legend = getLegendFromDecklist(decklist);

        // Format record: omit draws if 0 (e.g. "3-0" not "3-0-0")
        let record = row.record
            || `${row.user_event_status?.matches_won ?? 0}-${row.user_event_status?.matches_lost ?? 0}-${row.user_event_status?.matches_drawn ?? 0}`;
        const recordParts = record.split('-');
        if (recordParts.length === 3 && recordParts[2] === '0') {
            record = `${recordParts[0]}-${recordParts[1]}`;
        }

        standings[rank] = {
            rank,
            name,
            archetype: legend,
            record
        };
    });

    return standings;
}

// Main fetch function - delegates to appropriate platform
export async function fetchTournamentStandings(roundId) {
    const { platform, tournamentId } = platformConfig;

    if (!tournamentId && platform !== 'manual') {
        throw new Error('Tournament ID is required');
    }

    if (!roundId) {
        throw new Error('Round ID is required');
    }

    switch (platform) {
        case 'melee':
            return await fetchMeleeStandings(tournamentId, roundId);
        case 'topdeck':
            return await fetchTopdeckStandings(tournamentId, roundId);
        case 'cardeio':
            return await fetchCardeioStandings(tournamentId, roundId);
        case 'manual':
            throw new Error('Manual mode selected - use the text input to enter standings');
        default:
            throw new Error(`Unknown platform: ${platform}`);
    }
}

// Fetch all decklists for a tournament from Melee.gg
export async function fetchMeleeDecklists(tournamentId) {
    const authHeaders = getMeleeAuthHeaders();
    const url = `https://melee.gg/api/decklist/list/${tournamentId}?pageSize=500`;
    console.log(`Fetching decklists from: ${url}`);

    const response = await fetch(url, { headers: authHeaders });

    if (!response.ok) {
        const text = await response.text();
        console.error('Decklists fetch error response:', text.substring(0, 500));
        throw new Error(`Decklists fetch failed: ${response.status}`);
    }

    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error('Decklists response is not JSON:', text.substring(0, 500));
        throw new Error(`Decklists API returned non-JSON response`);
    }
    console.log('Decklists response keys:', data ? Object.keys(data) : 'null');

    // Handle paginated response
    let decklistsArray = data;
    if (data && !Array.isArray(data)) {
        decklistsArray = data.Content || data.Decklists || data.Data || [];
        console.log('Extracted decklists array length:', decklistsArray?.length || 0);
    }

    // Log first decklist structure for debugging
    if (decklistsArray && decklistsArray.length > 0) {
        console.log('Sample decklist keys:', Object.keys(decklistsArray[0]));
        console.log('Sample decklist:', JSON.stringify(decklistsArray[0], null, 2).substring(0, 2000));
    }

    return decklistsArray;
}

// Fetch a single decklist by ID from Melee.gg
export async function fetchMeleeDecklist(decklistId) {
    const authHeaders = getMeleeAuthHeaders();
    const url = `https://melee.gg/api/decklist/${decklistId}`;
    console.log(`Fetching decklist from: ${url}`);

    const response = await fetch(url, { headers: authHeaders });

    if (!response.ok) {
        const text = await response.text();
        console.error('Decklist fetch error response:', text.substring(0, 500));
        throw new Error(`Decklist fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

// Parse a Melee.gg decklist response into categorized card lists
// Records fields: n=name, s=subtitle, q=quantity, c=category (0=main, 6=leader, 7=base, 99=sideboard), l=slug, t=type
export function parseMeleeDecklist(data, game = 'starwars') {
    if (game === 'starwars') {
        return parseMeleeDecklistSWU(data);
    }
    // MTG and Vibes share the same structure (no leader/base)
    return parseMeleeDecklistGeneric(data);
}

// Star Wars Unlimited: leader (cat 6), base (cat 7), mainDeck, sideboard (cat 99)
function parseMeleeDecklistSWU(data) {
    const result = { leader: null, base: null, mainDeck: [], sideboard: [] };
    for (const r of (data.Records || [])) {
        const name = r.n || '';
        const subtitle = r.s || '';
        // Use ", " separator to match melee.gg naming convention (e.g., "Han Solo, Worth the Risk")
        const displayName = subtitle ? `${name}, ${subtitle}` : name;
        const qty = r.q || 1;
        const category = r.c;
        const line = `${qty} ${displayName}`;

        if (category === 6) result.leader = { name: displayName, qty };
        else if (category === 7) result.base = { name: displayName, qty };
        else if (category === 99) result.sideboard.push(line);
        else result.mainDeck.push(line);
    }
    return result;
}

// MTG / Vibes: mainDeck and sideboard only (no leader/base)
function parseMeleeDecklistGeneric(data) {
    const result = { mainDeck: [], sideboard: [] };
    for (const r of (data.Records || [])) {
        const name = r.n || '';
        const qty = r.q || 1;
        const category = r.c;
        const line = `${qty} ${name}`;

        if (category === 99) result.sideboard.push(line);
        else result.mainDeck.push(line);
    }
    return result;
}

// Fetch pairings for a specific round from Melee.gg
export async function fetchMeleePairings(tournamentId, roundNumber) {
    const authHeaders = getMeleeAuthHeaders();

    // First get tournament info to find round ID
    const tournamentUrl = `https://melee.gg/api/tournament/${tournamentId}`;
    const tournamentResponse = await fetch(tournamentUrl, { headers: authHeaders });

    if (!tournamentResponse.ok) {
        throw new Error(`Tournament fetch failed: ${tournamentResponse.status}`);
    }

    const tournament = await tournamentResponse.json();

    // Find the round
    let rounds = [];
    if (tournament.Phases && Array.isArray(tournament.Phases)) {
        tournament.Phases.forEach(phase => {
            if (phase.Rounds && Array.isArray(phase.Rounds)) {
                rounds = rounds.concat(phase.Rounds);
            }
        });
    }

    const targetRound = rounds.find(r => r.SortOrder === parseInt(roundNumber)) || rounds[parseInt(roundNumber) - 1];

    if (!targetRound) {
        throw new Error(`Round ${roundNumber} not found`);
    }

    // Fetch pairings for this round
    const pairingsUrl = `https://melee.gg/api/pairing/list/round/${targetRound.ID}?pageSize=500`;
    console.log(`Fetching pairings from: ${pairingsUrl}`);

    const pairingsResponse = await fetch(pairingsUrl, { headers: authHeaders });

    if (!pairingsResponse.ok) {
        const text = await pairingsResponse.text();
        console.error('Pairings fetch error response:', text.substring(0, 500));
        throw new Error(`Pairings fetch failed: ${pairingsResponse.status}`);
    }

    const pairingsText = await pairingsResponse.text();
    let data;
    try {
        data = JSON.parse(pairingsText);
    } catch (e) {
        console.error('Pairings response is not JSON:', pairingsText.substring(0, 500));
        throw new Error(`Pairings API returned non-JSON response`);
    }
    console.log('Pairings response keys:', data ? Object.keys(data) : 'null');

    // Handle paginated response
    let pairingsArray = data;
    if (data && !Array.isArray(data)) {
        pairingsArray = data.Content || data.Pairings || data.Data || [];
        console.log('Extracted pairings array length:', pairingsArray?.length || 0);
    }

    // Log first pairing structure for debugging
    if (pairingsArray && pairingsArray.length > 0) {
        console.log('Sample pairing keys:', Object.keys(pairingsArray[0]));
        console.log('Sample pairing:', JSON.stringify(pairingsArray[0], null, 2).substring(0, 2000));
    }

    return pairingsArray;
}

// Helper function to fetch player record from standings
async function fetchPlayerRecordFromStandings(tournamentId, roundNumber, playerName, authHeaders) {
    // For round 1, there are no prior standings
    if (parseInt(roundNumber) <= 1) {
        return '0-0';
    }

    try {
        // Get tournament info to find round ID for round N-1
        const tournamentUrl = `https://melee.gg/api/tournament/${tournamentId}`;
        const tournamentResponse = await fetch(tournamentUrl, { headers: authHeaders });

        if (!tournamentResponse.ok) {
            console.error('Tournament fetch failed for standings lookup');
            return '0-0';
        }

        const tournament = await tournamentResponse.json();

        // Find all rounds
        let rounds = [];
        if (tournament.Phases && Array.isArray(tournament.Phases)) {
            tournament.Phases.forEach(phase => {
                if (phase.Rounds && Array.isArray(phase.Rounds)) {
                    rounds = rounds.concat(phase.Rounds);
                }
            });
        }

        // We want standings after round N-1 (for players going into round N)
        const targetRoundNumber = parseInt(roundNumber) - 1;
        const targetRound = rounds.find(r => r.SortOrder === targetRoundNumber) || rounds[targetRoundNumber - 1];

        if (!targetRound) {
            console.error(`Round ${targetRoundNumber} not found for standings lookup`);
            return '0-0';
        }

        // Fetch standings for that round (with large page size to find all players)
        const standingsUrl = `https://melee.gg/api/standing/list/round/${targetRound.ID}?pageSize=500`;
        const standingsResponse = await fetch(standingsUrl, { headers: authHeaders });

        if (!standingsResponse.ok) {
            console.error('Standings fetch failed');
            return '0-0';
        }

        const standingsData = await standingsResponse.json();
        const standings = standingsData.Content || standingsData;

        // Search for player by normalized name
        const normalizedSearchName = playerName.toLowerCase();

        for (const entry of standings) {
            const player = entry.Team?.Players?.[0] || entry;
            const entryName = normalizeName(player.Name || player.name || player.DisplayName || player.displayName || '');

            if (entryName.toLowerCase() === normalizedSearchName) {
                // Found the player - extract record
                const matchRecord = entry.MatchRecord || entry.matchRecord;
                if (matchRecord) {
                    return matchRecord;
                }
                const wins = entry.MatchWins || entry.matchWins || entry.Wins || entry.wins || 0;
                const losses = entry.MatchLosses || entry.matchLosses || entry.Losses || entry.losses || 0;
                const draws = entry.MatchDraws || entry.matchDraws || entry.Draws || entry.draws || 0;
                // Omit draws segment when 0 — consistent with normalizeStandings
                // and the Carde API path (hides the "-0" on "3-0-0").
                return draws > 0 ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`;
            }
        }

        console.log(`Player "${playerName}" not found in standings`);
        return '0-0';
    } catch (error) {
        console.error('Error fetching player record:', error.message);
        return '0-0';
    }
}

// Fetch match data by table number
export async function fetchMatchByTable(tournamentId, roundNumber, tableNumber, platform = 'melee') {
    // Carde.io: prefer Spicerack match API (has user_id), fall back to CSV pairings
    if (platform === 'cardeio') {
        const emptyPlayer = { name: '', pronouns: '', record: '', archetype: '', decklistId: null, legend: '', champion: '', runes: '', runeList: [], battlefields: [], mainDeck: [], sideboard: [] };

        // === Try Spicerack match API data first (has user_id per player — no name guessing) ===
        const spicerackMatches = await loadCachedSpicerackMatches(roundNumber);
        if (spicerackMatches) {
            const apiMatch = spicerackMatches.find(m => m.table_number === parseInt(tableNumber));
            if (apiMatch) {
                const cachedDecklists = await loadCachedDecklist(tournamentId);
                const cachedRegistrations = await loadCachedRegistrations(tournamentId);
                const rels = apiMatch.player_match_relationships || [];
                const isBye = apiMatch.match_is_bye || rels.length < 2;

                function buildPlayerFromAPI(rel) {
                    const userId = rel?.user_event_status?.user?.id;
                    const ues = rel?.user_event_status;
                    // Use registration Display Name (handle), fall back to first+last or best_identifier
                    const name = resolvePlayerNameFromMatchAPI(rel, cachedRegistrations);
                    const won = ues?.matches_won ?? 0;
                    const lost = ues?.matches_lost ?? 0;
                    const drawn = ues?.matches_drawn ?? 0;
                    const record = drawn > 0 ? `${won}-${lost}-${drawn}` : `${won}-${lost}`;
                    const decklist = userId ? findDecklistByUserId(userId, cachedDecklists) : null;
                    return cardeioMapPlayerFromExport(name, record, decklist, name);
                }

                const player1 = buildPlayerFromAPI(rels[0]);
                const player2 = isBye ? emptyPlayer : buildPlayerFromAPI(rels[1]);

                console.log(`[Carde] Table ${tableNumber} via match API: P1="${player1.name}" (userId=${rels[0]?.user_event_status?.user?.id || 'N/A'}), P2="${player2.name}" (userId=${rels[1]?.user_event_status?.user?.id || 'N/A'})`);

                return { tableNumber: parseInt(tableNumber), player1, player2 };
            }
            console.warn(`[Carde] Table ${tableNumber} not found in match API data, falling back to CSV`);
        }

        // === Fallback: CSV-based pairings + 3-tier name matching ===
        // Load all available data sources in parallel
        const cachedDecklists = await loadCachedDecklist(tournamentId);
        const cachedRegistrations = await loadCachedRegistrations(tournamentId);

        // Try to load both pairings AND overview (overview has Real Name for better matching)
        let pairingsEntries = null, overviewEntries = null;
        try {
            const raw = await fsPromises.readFile(path.join(CARDEIO_DIR, `pairings-round-${roundNumber}.json`), 'utf8');
            pairingsEntries = JSON.parse(raw);
        } catch (e) { /* pairings not available */ }
        try {
            const raw = await fsPromises.readFile(path.join(CARDEIO_DIR, `overview-round-${roundNumber}.json`), 'utf8');
            overviewEntries = JSON.parse(raw);
        } catch (e) { /* overview not available */ }

        if (!pairingsEntries && !overviewEntries) {
            throw new Error(`Neither pairings-round-${roundNumber}.json nor overview-round-${roundNumber}.json found in data/cardeio/`);
        }

        // Find table entry from whichever source(s) are available
        const pairingsEntry = pairingsEntries?.find(e => e.Table === parseInt(tableNumber));
        const overviewEntry = overviewEntries?.find(e => e.Table === parseInt(tableNumber));
        const entry = pairingsEntry || overviewEntry;
        if (!entry) throw new Error(`Table ${tableNumber} not found in Round ${roundNumber}`);

        // Cross-validate if both sources available
        if (pairingsEntry && overviewEntry && pairingsEntry['Player 1'] !== overviewEntry['Player 1']) {
            console.warn(`[Carde] Table ${tableNumber} P1 mismatch: pairings="${pairingsEntry['Player 1']}" vs overview="${overviewEntry['Player 1']}"`);
        }

        // Build record maps from standings file (same round)
        // recordByUserId is unique and reliable; recordByName is a fallback (can have duplicates)
        const recordByUserId = new Map();
        const recordByName = new Map();
        try {
            const standingsRaw = await fsPromises.readFile(path.join(CARDEIO_DIR, `standings-round-${roundNumber}.json`), 'utf8');
            const standings = JSON.parse(standingsRaw);
            for (const s of standings) {
                const record = cardeioFormatRecord(s['Record (W-L-D)'] || '');
                if (s['User ID']) {
                    recordByUserId.set(String(s['User ID']), record);
                }
                if (s['Player']) {
                    const key = s['Player'].toLowerCase();
                    // Keep first entry (highest ranked) for name-based fallback
                    if (!recordByName.has(key)) {
                        recordByName.set(key, record);
                    }
                }
            }
        } catch (e) { /* standings not available */ }

        const recordFallback = parseInt(roundNumber) === 1 ? '0-0' : '';

        // Helper: look up record by userId first, fall back to name
        function getRecord(userId, playerName) {
            if (userId && recordByUserId.has(String(userId))) {
                return recordByUserId.get(String(userId));
            }
            return recordByName.get((playerName || '').toLowerCase()) ?? recordFallback;
        }

        const isBye = entry['Player 2'] === '—' || !entry['Player 2'];

        let player1, player2;
        if (cachedDecklists) {
            // Extract matching data from overview (Real Name) and pairings/overview (bestId, legend)
            const p1RealName = overviewEntry?.['P1 Real Name'] || null;
            const p1BestId = entry['Player 1'];
            const p1Legend = overviewEntry?.['P1 Deck'] || pairingsEntry?.['P1 Deck'] || '';
            const p2RealName = overviewEntry?.['P2 Real Name'] || null;
            const p2BestId = entry['Player 2'];
            const p2Legend = overviewEntry?.['P2 Deck'] || pairingsEntry?.['P2 Deck'] || '';

            // Resolve decklists using 3-tier matching (also gives us userId)
            const p1Result = resolvePlayerDecklist(p1RealName, p1BestId, p1Legend, cachedDecklists, cachedRegistrations);
            const p2Result = !isBye ? resolvePlayerDecklist(p2RealName, p2BestId, p2Legend, cachedDecklists, cachedRegistrations) : null;

            // Look up records by User ID (unique) with name-based fallback
            const p1Record = getRecord(p1Result.userId, p1BestId);
            const p2Record = !isBye ? getRecord(p2Result.userId, p2BestId) : '';

            player1 = cardeioMapPlayerFromExport(p1BestId, p1Record, p1Result.decklist, p1Result.fullName);
            player2 = isBye ? emptyPlayer : cardeioMapPlayerFromExport(p2BestId, p2Record, p2Result.decklist, p2Result.fullName);

            console.log(`[Carde] Table ${tableNumber} P1: "${p1BestId}" realName="${p1RealName || 'N/A'}" → ${p1Result.matchMethod} (userId=${p1Result.userId || 'N/A'}, record=${p1Record}, decklist=${p1Result.decklist ? 'found' : 'NOT FOUND'})`);
            if (!isBye) {
                console.log(`[Carde] Table ${tableNumber} P2: "${p2BestId}" realName="${p2RealName || 'N/A'}" → ${p2Result.matchMethod} (userId=${p2Result.userId || 'N/A'}, record=${p2Record}, decklist=${p2Result.decklist ? 'found' : 'NOT FOUND'})`);
            }
        } else if (overviewEntries) {
            // No cached decklists — fall back to overview's Deck Detail (no userId available, use name lookup)
            const p1Record = getRecord(null, entry['Player 1']);
            const p2Record = getRecord(null, entry['Player 2']);
            player1 = cardeioMapPlayer(overviewEntry || entry, 1, p1Record);
            player2 = isBye ? emptyPlayer : cardeioMapPlayer(overviewEntry || entry, 2, p2Record);
            console.log(`[Carde] Table ${tableNumber}: no cached decklists, using overview Deck Detail`);
        } else {
            // Only pairings, no decklists — minimal data (no userId available, use name lookup)
            const p1Record = getRecord(null, entry['Player 1']);
            const p2Record = getRecord(null, entry['Player 2']);
            player1 = { name: entry['Player 1'], pronouns: '', record: p1Record, archetype: '', decklistId: null, legend: '', champion: '', runes: '', runeList: [], battlefields: [], mainDeck: [], sideboard: [] };
            player2 = isBye ? emptyPlayer : { name: entry['Player 2'], pronouns: '', record: p2Record, archetype: '', decklistId: null, legend: '', champion: '', runes: '', runeList: [], battlefields: [], mainDeck: [], sideboard: [] };
            console.log(`[Carde] Table ${tableNumber}: pairings only, no decklists or overview`);
        }

        return {
            tableNumber: parseInt(tableNumber),
            player1,
            player2
        };
    }

    // Validate platform
    if (platform !== 'melee') {
        throw new Error(`Platform "${platform}" is not yet supported for fetching match data. Only Melee.gg is currently implemented.`);
    }

    try {
        const authHeaders = getMeleeAuthHeaders();

        // Fetch matches with pagination until we find the one we need
        let allMatches = [];
        let page = 1;
        const pageSize = 250;
        let hasMore = true;

        while (hasMore) {
            const url = `https://melee.gg/api/match/list/${tournamentId}?pageSize=${pageSize}&page=${page}`;
            console.log(`Fetching matches page ${page} from: ${url}`);

            const response = await fetch(url, { headers: authHeaders });

            if (!response.ok) {
                const text = await response.text();
                console.error('Match list fetch error response:', text.substring(0, 500));
                throw new Error(`Match list fetch failed: ${response.status}`);
            }

            const data = await response.json();
            const matches = data.Content || data;
            const totalRecords = data.RecordsTotal || 0;

            console.log(`Page ${page}: got ${matches.length} matches (total: ${totalRecords})`);

            // Check if our match is in this page
            const match = matches.find(m =>
                m.RoundNumber === parseInt(roundNumber) &&
                m.TableNumber === parseInt(tableNumber)
            );

            if (match) {
                console.log('Found match:', JSON.stringify(match, null, 2).substring(0, 1000));
                allMatches = [match]; // Only keep the match we found
                hasMore = false;
            } else {
                allMatches = allMatches.concat(matches);
                // Check if there are more pages
                if (matches.length < pageSize || allMatches.length >= totalRecords) {
                    hasMore = false;
                } else {
                    page++;
                }
            }
        }

        // Find the match by round number and table number
        const match = allMatches.find(m =>
            m.RoundNumber === parseInt(roundNumber) &&
            m.TableNumber === parseInt(tableNumber)
        );

        if (!match) {
            throw new Error(`No match found at table ${tableNumber} for round ${roundNumber}`);
        }

        // Extract player info from Competitors array
        // Each competitor has Team.Players[0] for player info and Decklists[0] for archetype
        const competitor1 = match.Competitors?.[0];
        const competitor2 = match.Competitors?.[1];

        const player1 = competitor1?.Team?.Players?.[0] || {};
        const player2 = competitor2?.Team?.Players?.[0] || {};

        // Decklists are embedded in each competitor
        const player1Decklist = competitor1?.Decklists?.[0];
        const player2Decklist = competitor2?.Decklists?.[0];

        // Get player names for record lookup
        const player1Name = normalizeName(player1.Name || player1.DisplayName || '');
        const player2Name = normalizeName(player2.Name || player2.DisplayName || '');

        // 2v2 workaround split — same convention as normalizeStandings() above:
        // Melee stores 2v2 teams as a single pseudo-player with
        //   FirstName = playerA,  LastName = playerB,  Name = "playerA playerB"
        // Expose both halves so the client can populate both teammate slots
        // (left + left-2, right + right-2) on 2v2 match cards. For 1v1 these
        // stay blank and the client falls back to `name` unchanged.
        const player1First = normalizeName(player1.FirstName || player1.firstName || '');
        const player1Last  = normalizeName(player1.LastName  || player1.lastName  || '');
        const player2First = normalizeName(player2.FirstName || player2.firstName || '');
        const player2Last  = normalizeName(player2.LastName  || player2.lastName  || '');

        // Fetch records from standings (round N-1, or 0-0 for round 1)
        console.log(`Fetching records for round ${roundNumber} (will use round ${parseInt(roundNumber) - 1} standings)`);
        const [player1Record, player2Record] = await Promise.all([
            fetchPlayerRecordFromStandings(tournamentId, roundNumber, player1Name, authHeaders),
            fetchPlayerRecordFromStandings(tournamentId, roundNumber, player2Name, authHeaders)
        ]);

        console.log(`Player records: ${player1Name} = ${player1Record}, ${player2Name} = ${player2Record}`);

        return {
            tableNumber: parseInt(tableNumber),
            player1: {
                name: player1Name,
                player1: player1First, // 2v2: first teammate (empty for 1v1)
                player2: player1Last,  // 2v2: second teammate (empty for 1v1)
                archetype: player1Decklist?.DecklistName || '',
                pronouns: player1.PronounsDescription || '',
                record: player1Record,
                decklistId: player1Decklist?.DecklistId || null
            },
            player2: {
                name: player2Name,
                player1: player2First, // 2v2: first teammate (empty for 1v1)
                player2: player2Last,  // 2v2: second teammate (empty for 1v1)
                archetype: player2Decklist?.DecklistName || '',
                pronouns: player2.PronounsDescription || '',
                record: player2Record,
                decklistId: player2Decklist?.DecklistId || null
            }
        };
    } catch (error) {
        console.error('Error fetching match by table:', error.message);
        throw error;
    }
}

// Export platform types for UI
export const PLATFORM_TYPES = {
    MANUAL: 'manual',
    MELEE: 'melee',
    TOPDECK: 'topdeck',
    CARDEIO: 'cardeio'
};
