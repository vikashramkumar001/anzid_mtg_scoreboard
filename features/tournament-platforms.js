import axios from 'axios';
import { RoomUtils } from '../utils/room-utils.js';

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

// Tournament platform configuration
let platformConfig = {
    platform: 'manual',  // 'melee', 'topdeck', 'cardeio', 'manual'
    tournamentId: '',
    // API keys from environment variables
    meleeApiKey: process.env.MELEE_API_KEY || '',
    meleeClientId: process.env.MELEE_CLIENT_ID || '',
    meleeClientSecret: process.env.MELEE_CLIENT_SECRET || '',
    topdeckApiKey: process.env.TOPDECK_API_KEY || ''
};

// Get current platform config
export function getPlatformConfig() {
    return {
        platform: platformConfig.platform,
        tournamentId: platformConfig.tournamentId,
        // Don't expose API keys to frontend
        hasMeleeKey: !!(platformConfig.meleeApiKey || platformConfig.meleeClientId),
        hasTopdeckKey: !!platformConfig.topdeckApiKey
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
}

// Emit platform config to clients
export function emitPlatformConfig(io) {
    RoomUtils.emitWithRoomMapping(io, 'tournament-platform-config', getPlatformConfig());
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

    for (let i = 1; i <= 32; i++) {
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
        if (rank > 32) return;

        let name = '';
        let archetype = '';
        let record = '';

        if (platform === 'melee') {
            // Melee.gg nests player info inside Team.Players[0]
            const player = entry.Team?.Players?.[0] || entry;
            const playerId = player.ID || player.Id || player.id;

            name = normalizeName(player.Name || player.name || player.DisplayName || player.displayName || '');

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
                record = `${wins}-${losses}-${draws}`;
            }
        } else if (platform === 'topdeck') {
            name = normalizeName(player.name || '');
            // TopDeck may have decklist name as archetype
            archetype = player.decklist || player.deckName || '';
            const wins = player.wins || 0;
            const losses = player.losses || 0;
            const draws = player.draws || 0;
            record = `${wins}-${losses}-${draws}`;
        }

        normalized[rank.toString()] = {
            rank: parseInt(rank, 10),
            name,
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

// Fetch standings from Carde.io (placeholder)
async function fetchCardeioStandings(tournamentId) {
    throw new Error('Carde.io integration is not yet implemented. Please use manual input or another platform.');
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
            return await fetchCardeioStandings(tournamentId);
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
                return `${wins}-${losses}-${draws}`;
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
                archetype: player1Decklist?.DecklistName || '',
                pronouns: player1.PronounsDescription || '',
                record: player1Record,
                decklistId: player1Decklist?.DecklistId || null
            },
            player2: {
                name: player2Name,
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
