// Card-vision EBS layer: bridges the Python recognizer (card-vision/live_loop.py
// -> state.json) to consumers.
//
//   state.json (file, atomic-replaced by the loop)
//      └─ watcher (1s poll; fs.watch misses os.replace on some platforms)
//           ├─ socket.io broadcast 'card-vision-state'   (local/dev overlay)
//           └─ Twitch PubSub push                        (dormant until the
//              extension is registered; needs TWITCH_EXT_* env vars)
//
// HTTP endpoints (the "EBS" the Twitch extension iframe will call):
//   GET /api/card-vision/state        current cards-in-play
//   GET /api/card-vision/card/:code   card detail for the hover panel
//   GET /api/card-vision/frame        latest downscaled table frame (test page bg)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getCardListData } from './riftbound/cards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, '../card-vision/state.json');
const FRAME_PATH = path.join(__dirname, '../card-vision/samples/latest.jpg');

let state = { updated: null, cycle: 0, cards: [] };
let lastRaw = '';
let byCode = null;   // publicCode -> card metadata (built lazily after card list loads)

function log(msg) {
    console.log(`[card-vision] ${msg}`);
}

// ---------------------------------------------------------------------------
// card metadata lookup (variant-aware: OGN-089a falls back to OGN-089)
// ---------------------------------------------------------------------------
function codeIndex() {
    if (byCode) return byCode;
    const list = getCardListData();
    if (!list || !Object.keys(list).length) return null;   // not loaded yet
    byCode = {};
    for (const [name, entry] of Object.entries(list)) {
        if (entry && entry.publicCode) byCode[entry.publicCode] = { name, ...entry };
    }
    return byCode;
}

export function lookupCard(code) {
    const idx = codeIndex();
    if (!idx) return null;
    if (idx[code]) return idx[code];
    // variant prints: trailing "a" (alt-art) or "_" (showcase) map to the base
    const base = code.replace(/(a|_)$/, '');
    if (base !== code && idx[base]) return { ...idx[base], variantOf: base, code };
    return null;
}

// ---------------------------------------------------------------------------
// Twitch PubSub transport (dormant until env vars exist)
//   TWITCH_EXT_CLIENT_ID   extension client id
//   TWITCH_EXT_SECRET      extension secret (base64, from the Twitch console)
//   TWITCH_BROADCASTER_ID  numeric channel id to push to
// ---------------------------------------------------------------------------
function b64url(buf) {
    return Buffer.from(buf).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function extensionJwt(secretB64, channelId) {
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = b64url(JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 60,
        user_id: channelId,
        role: 'external',
        channel_id: channelId,
        pubsub_perms: { send: ['broadcast'] },
    }));
    const sig = crypto.createHmac('sha256', Buffer.from(secretB64, 'base64'))
        .update(`${header}.${payload}`).digest();
    return `${header}.${payload}.${b64url(sig)}`;
}

async function pushTwitchPubsub(payload) {
    const clientId = process.env.TWITCH_EXT_CLIENT_ID;
    const secret = process.env.TWITCH_EXT_SECRET;
    const channelId = process.env.TWITCH_BROADCASTER_ID;
    if (!clientId || !secret || !channelId) return;   // extension not registered yet
    try {
        const res = await fetch('https://api.twitch.tv/helix/extensions/pubsub', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${extensionJwt(secret, channelId)}`,
                'Client-Id': clientId,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                broadcaster_id: channelId,
                target: ['broadcast'],
                message: JSON.stringify(payload),
            }),
        });
        if (!res.ok) log(`PubSub push failed: ${res.status} ${await res.text()}`);
    } catch (err) {
        log(`PubSub push error: ${err.message}`);
    }
}

// Compact payload for PubSub's 5KB cap: codes + status flag + score + bbox.
function compactState() {
    return {
        u: state.cycle,
        cards: state.cards.map(c => [
            c.code, c.status === 'confirmed' ? 1 : 0, c.score,
            ...(c.bbox || []),
        ]),
    };
}

// ---------------------------------------------------------------------------
// state watcher + broadcast
// ---------------------------------------------------------------------------
function readState(io) {
    let raw;
    try {
        raw = fs.readFileSync(STATE_PATH, 'utf8');
    } catch {
        return;   // loop not running / file not there yet
    }
    if (raw === lastRaw) return;
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return;   // partial write (shouldn't happen — loop atomic-replaces)
    }
    lastRaw = raw;
    state = parsed;
    const enriched = enrichedState();
    io.emit('card-vision-state', enriched);
    pushTwitchPubsub(compactState());
}

function enrichedState() {
    return {
        ...state,
        cards: state.cards.map(c => {
            const meta = lookupCard(c.code);
            return {
                ...c,
                name: meta ? meta.name : c.name,
                imageUrl: meta ? meta.imageUrl : `/assets/images/riftbound/cards/${c.code}.png`,
            };
        }),
    };
}

// ---------------------------------------------------------------------------
export function initCardVision(app, io) {
    app.get('/api/card-vision/state', (req, res) => {
        res.json(enrichedState());
    });

    app.get('/api/card-vision/card/:code', (req, res) => {
        const meta = lookupCard(req.params.code);
        if (!meta) return res.status(404).json({ error: 'unknown card code' });
        res.json(meta);
    });

    app.get('/api/card-vision/frame', (req, res) => {
        res.sendFile(FRAME_PATH, err => {
            if (err && !res.headersSent) res.status(404).end();
        });
    });

    setInterval(() => readState(io), 1000);
    log(`watching ${STATE_PATH}`);
    log(process.env.TWITCH_EXT_CLIENT_ID
        ? 'Twitch PubSub transport ACTIVE'
        : 'Twitch PubSub transport dormant (set TWITCH_EXT_CLIENT_ID / TWITCH_EXT_SECRET / TWITCH_BROADCASTER_ID)');
}
