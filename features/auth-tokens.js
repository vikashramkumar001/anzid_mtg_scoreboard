import { RoomUtils } from '../utils/room-utils.js';

// Auth token storage (in-memory only, never persisted to disk)
let authTokens = {
    webSession: '',
    webSessionToken: '',
    sessionId: ''
};

export function getAuthTokens() {
    return {
        hasWebSession: !!authTokens.webSession,
        hasWebSessionToken: !!authTokens.webSessionToken,
        hasSessionId: !!authTokens.sessionId
    };
}

export function getRawAuthTokens() {
    return { ...authTokens };
}

export function setAuthTokens(tokens) {
    if (tokens.webSession !== undefined) authTokens.webSession = tokens.webSession;
    if (tokens.webSessionToken !== undefined) authTokens.webSessionToken = tokens.webSessionToken;
    if (tokens.sessionId !== undefined) authTokens.sessionId = tokens.sessionId;
}

export function emitAuthTokenStatus(io) {
    RoomUtils.emitWithRoomMapping(io, 'auth-token-status', getAuthTokens());
}

function getCardeioHeaders() {
    return {
        'Cookie': `web_sessionToken=${authTokens.webSessionToken}; web_session=${authTokens.webSession}; sessionid=${authTokens.sessionId}`,
        'Accept': '*/*',
        'Referer': 'https://admin.carde.io/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'DNT': '1',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
    };
}

export async function fetchCardeioDecklists(eventId) {
    if (!authTokens.webSessionToken) {
        throw new Error('web_sessionToken is not set. Save your tokens first.');
    }

    const url = `https://api.admin.carde.io/api/v2/deckbuilder/deck-submissions/events/${eventId}/export/?download=true`;
    console.log(`Fetching Carde.io decklists from: ${url}`);

    const response = await fetch(url, { headers: getCardeioHeaders() });

    if (!response.ok) {
        const text = await response.text();
        console.error('Carde.io fetch error:', response.status, text.substring(0, 500));
        throw new Error(`Carde.io API returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return { type: 'json', data: await response.json() };
    }

    return { type: 'text', data: await response.text() };
}

export async function fetchCardeioStandings(roundId) {
    if (!authTokens.webSessionToken) {
        throw new Error('web_sessionToken is not set. Save your tokens first.');
    }

    const url = `https://admin.carde.io/api/csv-export/organize/standings?round_id=${encodeURIComponent(roundId)}&`;
    console.log(`Fetching Carde.io standings from: ${url}`);

    const response = await fetch(url, { headers: getCardeioHeaders() });

    if (!response.ok) {
        const text = await response.text();
        console.error('Carde.io standings fetch error:', response.status, text.substring(0, 500));
        throw new Error(`Carde.io API returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return { type: 'json', data: await response.json() };
    }

    return { type: 'text', data: await response.text() };
}

export async function fetchCardeioRegistrations(eventId, gameSlug) {
    if (!authTokens.webSessionToken) {
        throw new Error('web_sessionToken is not set. Save your tokens first.');
    }

    const url = `https://admin.carde.io/api/csv-export/event-registrations?game_slug=${encodeURIComponent(gameSlug)}&event_id=${encodeURIComponent(eventId)}`;
    console.log(`Fetching Carde.io registrations from: ${url}`);

    const response = await fetch(url, { headers: getCardeioHeaders() });

    if (!response.ok) {
        const text = await response.text();
        console.error('Carde.io registrations fetch error:', response.status, text.substring(0, 500));
        throw new Error(`Carde.io API returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return { type: 'json', data: await response.json() };
    }

    return { type: 'text', data: await response.text() };
}
