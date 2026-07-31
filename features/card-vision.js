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
import OBSWebSocket from 'obs-websocket-js';
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

// ---------------------------------------------------------------------------
// camera-space -> program-canvas coordinate mapping. The recognizer's bboxes
// are in the 4K camera frame; viewers watch that source COMPOSITED into the
// 1080p program scene. OBS knows the placement — read the scene-item
// transform and refresh it periodically so overlay hotspots can be expressed
// in normalized video coordinates (0..1 of the program canvas).
// ---------------------------------------------------------------------------
const CV_SOURCE = process.env.CARD_VISION_SOURCE || 'BMD - Match 1 Gameplay';
const OBS_URL = process.env.OBS_WS_URL || 'ws://localhost:4455';
const OBS_PASSWORD = process.env.OBS_WS_PASSWORD || 'RRWtUPVpGf6myRvx';
let transform = null;   // {posX, posY, scaleX, scaleY, cropL, cropT, canvasW, canvasH}
const cvObs = new OBSWebSocket();
let cvObsReady = false;

async function refreshTransform() {
    try {
        if (!cvObsReady) {
            await cvObs.connect(OBS_URL, OBS_PASSWORD);
            cvObsReady = true;
            log(`transform: connected to OBS at ${OBS_URL}`);
        }
        const { baseWidth, baseHeight } = await cvObs.call('GetVideoSettings');
        const { currentProgramSceneName } = await cvObs.call('GetCurrentProgramScene');
        const getT = async (scene, id) =>
            (await cvObs.call('GetSceneItemTransform',
                { sceneName: scene, sceneItemId: id })).sceneItemTransform;
        const pick = items => {
            const matches = items.filter(i => i.sourceName === CV_SOURCE);
            return matches.find(i => i.sceneItemEnabled) || matches[0] || null;
        };
        const { sceneItems } = await cvObs.call('GetSceneItemList',
            { sceneName: currentProgramSceneName });
        let combined = null;
        const direct = pick(sceneItems);
        if (direct) {
            const t = await getT(currentProgramSceneName, direct.sceneItemId);
            combined = {
                posX: t.positionX, posY: t.positionY,
                scaleX: t.scaleX, scaleY: t.scaleY,
                cropL: t.cropLeft || 0, cropT: t.cropTop || 0,
            };
        } else {
            // one level of nesting: production wraps the camera in a scene
            // (e.g. "Camera - Match 1 Gameplay") that sits in the program
            // scene — compose inner (source-in-wrapper) with outer
            // (wrapper-in-program) transforms
            for (const outerItem of sceneItems) {
                let children;
                try {
                    ({ sceneItems: children } = await cvObs.call('GetSceneItemList',
                        { sceneName: outerItem.sourceName }));
                } catch { continue; }        // not a scene
                const inner = pick(children);
                if (!inner) continue;
                const o = await getT(currentProgramSceneName, outerItem.sceneItemId);
                const i = await getT(outerItem.sourceName, inner.sceneItemId);
                combined = {
                    // canvas(x) = posO + (posI + (x - cropIL)*scaleI - cropOL)*scaleO
                    posX: o.positionX + (i.positionX - (o.cropLeft || 0)) * o.scaleX,
                    posY: o.positionY + (i.positionY - (o.cropTop || 0)) * o.scaleY,
                    scaleX: i.scaleX * o.scaleX,
                    scaleY: i.scaleY * o.scaleY,
                    cropL: i.cropLeft || 0, cropT: i.cropTop || 0,
                };
                break;
            }
        }
        transform = combined ? { ...combined, canvasW: baseWidth, canvasH: baseHeight } : null;
    } catch (err) {
        cvObsReady = false;
        transform = null;
    }
}

function toVideoBox(bbox) {
    // camera px -> normalized 0..1 of the program canvas; null when the
    // source isn't in the current program scene (overlay should hide)
    if (!transform || !bbox) return null;
    const { posX, posY, scaleX, scaleY, cropL, cropT, canvasW, canvasH } = transform;
    const map = (x, y) => [
        (posX + (x - cropL) * scaleX) / canvasW,
        (posY + (y - cropT) * scaleY) / canvasH,
    ];
    const [nx0, ny0] = map(bbox[0], bbox[1]);
    const [nx1, ny1] = map(bbox[2], bbox[3]);
    const clamp = v => Math.max(0, Math.min(1, Math.round(v * 1000) / 1000));
    return [clamp(nx0), clamp(ny0), clamp(nx1), clamp(ny1)];
}

const STATUS_FLAG = { confirmed: 1, pending: 0, covered: 2 };

// Compact payload for PubSub's 5KB cap: code, status flag, score, camera bbox,
// then normalized video coords when the OBS transform is known.
function compactState() {
    return {
        u: state.cycle,
        cards: state.cards.map(c => {
            const row = [c.code, STATUS_FLAG[c.status] ?? 0, c.score, ...(c.bbox || [])];
            const v = toVideoBox(c.bbox);
            if (v) row.push(...v);
            return row;
        }),
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
    io.emit('card-vision-state', enriched);          // local overlay: no delay
    // viewer-facing push is buffered by the measured stream delay so hotspots
    // land when VIEWERS see the card, not seconds early
    const delayMs = parseInt(process.env.CARD_VISION_DELAY_MS || '0', 10);
    const payload = compactState();
    if (delayMs > 0) setTimeout(() => pushTwitchPubsub(payload), delayMs);
    else pushTwitchPubsub(payload);
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
                vbox: toVideoBox(c.bbox),   // normalized program-canvas coords (or null)
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
    refreshTransform();
    setInterval(refreshTransform, 10_000);
    log(`watching ${STATE_PATH}`);
    log(`mapping transform of '${CV_SOURCE}' via ${OBS_URL} (refresh 10s)`);
    log(process.env.TWITCH_EXT_CLIENT_ID
        ? 'Twitch PubSub transport ACTIVE'
        : 'Twitch PubSub transport dormant (set TWITCH_EXT_CLIENT_ID / TWITCH_EXT_SECRET / TWITCH_BROADCASTER_ID)');
}
