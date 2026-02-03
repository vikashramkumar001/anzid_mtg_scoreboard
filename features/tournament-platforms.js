import axios from 'axios';
import { RoomUtils } from '../utils/room-utils.js';

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

    // Remove pronouns
    let name = rawName
        .replace(/\b(he\/him|she\/her|they\/them|he\/they|she\/they)\b/gi, '')
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

    rawStandings.forEach((player, index) => {
        const rank = player.rank || player.standing || (index + 1);
        if (rank > 32) return;

        let name = '';
        let archetype = '';
        let record = '';

        if (platform === 'melee') {
            name = normalizeName(player.name || player.displayName || '');
            archetype = player.deckArchetype || player.archetype || '';
            // Melee uses wins/losses/draws or matchRecord
            if (player.matchRecord) {
                record = player.matchRecord;
            } else {
                const wins = player.wins || player.matchWins || 0;
                const losses = player.losses || player.matchLosses || 0;
                const draws = player.draws || player.matchDraws || 0;
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

// Get Melee.gg access token
async function getMeleeAccessToken() {
    if (!platformConfig.meleeClientId || !platformConfig.meleeClientSecret) {
        throw new Error('Melee.gg API credentials not configured. Set MELEE_CLIENT_ID and MELEE_CLIENT_SECRET environment variables.');
    }

    const tokenResponse = await axios.post(
        'https://melee.gg/connect/token',
        new URLSearchParams({
            client_id: platformConfig.meleeClientId,
            client_secret: platformConfig.meleeClientSecret,
            grant_type: 'client_credentials',
            scope: 'TournamentApi'
        }).toString(),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    );

    console.log('Melee.gg token obtained successfully');
    return tokenResponse.data.access_token;
}

// Fetch standings from Melee.gg
async function fetchMeleeStandings(tournamentId, roundNumber) {
    try {
        const accessToken = await getMeleeAccessToken();
        const authHeaders = { 'Authorization': `Bearer ${accessToken}` };

        // Step 1: Fetch tournament info to get round GUIDs
        console.log(`Fetching tournament info for ${tournamentId}...`);
        const tournamentResponse = await axios.get(
            `https://melee.gg/api/tournament/${tournamentId}`,
            { headers: authHeaders }
        );

        const tournament = tournamentResponse.data;
        console.log('Tournament:', tournament.name);

        // Step 2: Find the round GUID for the requested round number
        // Round N tab shows standings after round N-1
        // So if roundNumber is "2", we want standings after round 1
        const targetRoundNumber = parseInt(roundNumber) - 1;

        if (targetRoundNumber < 1) {
            throw new Error('Cannot fetch standings before round 1.');
        }

        // Rounds may be in tournament.phases[].rounds[] or tournament.rounds[]
        let rounds = [];
        if (tournament.phases && Array.isArray(tournament.phases)) {
            tournament.phases.forEach(phase => {
                if (phase.rounds && Array.isArray(phase.rounds)) {
                    rounds = rounds.concat(phase.rounds);
                }
            });
        } else if (tournament.rounds && Array.isArray(tournament.rounds)) {
            rounds = tournament.rounds;
        }

        console.log(`Found ${rounds.length} rounds`);

        // Find the round with matching number
        const targetRound = rounds.find(r => r.roundNumber === targetRoundNumber || r.number === targetRoundNumber);

        if (!targetRound) {
            // If we can't find by number, try by index
            if (rounds.length >= targetRoundNumber) {
                const roundByIndex = rounds[targetRoundNumber - 1];
                if (roundByIndex) {
                    console.log(`Using round by index: ${roundByIndex.id || roundByIndex.guid}`);
                    return await fetchStandingsForRound(roundByIndex.id || roundByIndex.guid, authHeaders);
                }
            }
            throw new Error(`Round ${targetRoundNumber} not found in tournament.`);
        }

        const roundGuid = targetRound.id || targetRound.guid;
        console.log(`Fetching standings for round ${targetRoundNumber} (GUID: ${roundGuid})...`);

        return await fetchStandingsForRound(roundGuid, authHeaders);

    } catch (error) {
        const status = error.response?.status;
        const data = error.response?.data;
        console.error('Melee.gg API error:', { status, data, message: error.message });

        if (status === 401) {
            throw new Error('Invalid Melee.gg credentials. Check your MELEE_CLIENT_ID and MELEE_CLIENT_SECRET.');
        } else if (status === 403) {
            throw new Error('Access denied. Your API credentials may not have access to this tournament.');
        } else if (status === 404) {
            throw new Error(`Tournament ${tournamentId} not found on Melee.gg.`);
        }

        throw new Error(`Failed to fetch from Melee.gg: ${data?.error_description || data?.message || error.message}`);
    }
}

// Fetch standings for a specific round GUID
async function fetchStandingsForRound(roundGuid, authHeaders) {
    const standingsResponse = await axios.get(
        `https://melee.gg/api/standing/list/round/${roundGuid}`,
        { headers: authHeaders }
    );

    console.log('Melee.gg standings fetched:', standingsResponse.data?.length || 0, 'entries');
    return normalizeStandings(standingsResponse.data, 'melee');
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

// Export platform types for UI
export const PLATFORM_TYPES = {
    MANUAL: 'manual',
    MELEE: 'melee',
    TOPDECK: 'topdeck',
    CARDEIO: 'cardeio'
};
