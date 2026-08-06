// Piltover Archive deck-import proxy (riftbound).
//
// Master-control's "Add Decklist" modal posts a pasted PA deck link here; we
// pull the deck UUID out of it, call Piltover Archive's export/text endpoint
// with our API key, and hand back the human-readable decklist string. That
// string is already in the exact section format master-control's
// parseDeckString understands — Legend / Champion / MainDeck / Battlefields /
// Runes ("N <Color> Rune") / Sideboard — so the operator can review it in the
// textarea and Submit as normal, no client-side mapping required.
//
// Doing the call server-side keeps the API key out of the browser (it lives in
// the gitignored .env as PILTOVER_API_KEY, never in client code) and dodges the
// browser CORS wall on the PA host.
import axios from 'axios';

// api2 is the host that actually resolves; the *declared* production host
// (https://api.piltoverarchive.com/) did NOT resolve as of 2026-08-06. Override
// via PILTOVER_API_HOST in .env if/when the canonical host comes online.
const PA_HOST = (process.env.PILTOVER_API_HOST || 'https://api2.piltoverarchive.com').replace(/\/+$/, '');

// Deck links carry the deck UUID somewhere in the path/query. Pull the first
// UUID we see; also lets an operator paste a bare deck id.
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function extractDeckId(link) {
    if (typeof link !== 'string') return null;
    const m = link.match(UUID_RE);
    return m ? m[0].toLowerCase() : null;
}

// Fetch a PA deck as a decklist string. Resolves to { deckId, text }.
// Throws Error with a `.status` for client-facing failures (bad link, missing
// key); surfaces PA's own status/message for upstream failures.
export async function fetchPiltoverDeckText(link) {
    const apiKey = process.env.PILTOVER_API_KEY || '';
    if (!apiKey) {
        const e = new Error('PILTOVER_API_KEY not set in .env');
        e.status = 500;
        throw e;
    }

    const deckId = extractDeckId(link);
    if (!deckId) {
        const e = new Error('Could not find a deck ID in that link');
        e.status = 400;
        throw e;
    }

    const res = await axios.post(
        `${PA_HOST}/v1/decks/export/text`,
        { deckId },
        {
            headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
            timeout: 15000,
        }
    );

    const text = res.data?.text;
    if (!text || typeof text !== 'string') {
        const e = new Error('Piltover Archive returned no decklist text');
        e.status = 502;
        throw e;
    }
    return { deckId, text };
}
