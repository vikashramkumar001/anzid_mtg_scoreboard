// Chat-triggered card viewer.
//
//   viewer:  !card kennen
//   bot:     @viewer did you mean: 1) Kennen, Heart of the Tempest
//            2) Kennen, Storm of Shuriken  3) Kennen, Keeper of Balance
//   viewer:  2            -> Storm of Shuriken goes on air
//   (or 5s passes)        -> option 1 goes on air, so the stream never waits
//
// Policy is auto-show for everyone, rate-limited by ONE global cooldown. That
// is the knob that actually stops a raid: per-user limits are useless when 200
// throwaway accounts each send a single request.
//
// Cards go to slot 3 (/display/card/view/3). That slot is deliberately NOT
// mapped onto the main scoreboard overlay (public/js/scoreboard.js only wires
// 1 -> left and 2 -> right), so chat can never paint over the live scoreboard.
// It gets its own OBS browser source the operator can hide instantly.
//
// Reading uses anonymous IRC (features/chat/twitch-irc.js). Sending prompts is
// injected as `say` so this module stays testable and works read-only when no
// Twitch credentials are configured.

import { emitCardView } from './cards.js';
import { getGameSelection } from '../config/constants.js';
import { connectTwitchChat } from './chat/twitch-irc.js';
import { connectYouTubeChat } from './chat/youtube-live.js';
import { resolveCardName } from './chat/resolve.js';
import { createPendingStore } from './chat/pending.js';
import { createTwitchSender } from './chat/twitch-send.js';
import { claimSlot, releaseSlot, slotOwner } from './card-slot-owner.js';

const CARD_SLOT = '3';
const DEFAULTS = {
    cooldownMs: 18000,      // global gap between on-air cards
    dwellMs: 8000,          // how long a chat card stays up
    promptWindowMs: 5000,   // wait for a disambiguation reply
    maxPerStream: 200,      // hard ceiling for one session
    announceCooldown: true, // reply once per cooldown window, not per request
};

const log = (m) => console.log(`[chat-bridge] ${m}`);

// "!card kennen" | "!c kennen" | "[[kennen]]"
function parseCommand(text) {
    const s = String(text ?? '').trim();
    const bang = s.match(/^!(?:card|c)\s+(.{2,80})$/i);
    if (bang) return bang[1].trim();
    const brackets = s.match(/\[\[\s*(.{2,80}?)\s*\]\]/);
    if (brackets) return brackets[1].trim();
    return null;
}

export function initChatBridge(app, io, opts = {}) {
    const flag = (process.env.CHAT_BRIDGE_ENABLED || '').trim().toLowerCase();
    if (!['1', 'true', 'on', 'yes'].includes(flag)) {
        log('disabled (set CHAT_BRIDGE_ENABLED=true to turn on)');
        return { enabled: false };
    }
    const channel = (process.env.TWITCH_CHANNEL || '').trim();
    if (!channel) { log('TWITCH_CHANNEL not set — not starting'); return { enabled: false }; }

    const cfg = { ...DEFAULTS, ...opts };
    // Sending is optional: with no Twitch app credentials the bridge still
    // reads chat and shows cards, it just can't post disambiguation prompts
    // (ambiguous names then fall through to the timeout auto-pick).
    const sender = opts.say ? null : createTwitchSender();
    const say = opts.say || (sender ? sender.say : async () => {});
    if (sender) {
        if (sender.configured) sender.warmup().then(r => log(r.ok ? 'chat sending ready' : `chat sending unavailable: ${r.reason}`));
        else log('chat sending not configured — prompts disabled, timeout auto-pick still works');
    }
    let lastShownAt = 0, shownThisStream = 0, live = true;
    let lastCooldownNoticeAt = 0;

    const clearSlot = () => emitCardView(io, {
        'game-id': getGameSelection(), 'card-selected': '', 'card-id': CARD_SLOT,
    });

    let dwellTimer = null;
    // "Chat yields": the operator owns the viewer. On the anu scoreboard the
    // left overlay is hidden, so the operator's card-id 2 and our card-id 3
    // land on the SAME right-hand viewer — without this guard a viewer could
    // stomp a card the operator just put up.
    function operatorHasSlot() { return slotOwner(CARD_SLOT) === 'operator'; }

    function show(card, who) {
        // Only ever pass a canonical key that came out of our own card map —
        // raw chat text must never reach emitCardView. variant-url is left
        // unset on purpose: features/cards.js feeds it straight to img.src.
        emitCardView(io, {
            'game-id': getGameSelection(), 'card-selected': card.name, 'card-id': CARD_SLOT,
        });
        claimSlot(CARD_SLOT, 'chat');
        lastShownAt = Date.now();
        shownThisStream++;
        log(`showing "${card.name}" (${who})`);
        io.emit('chat-card-shown', { name: card.name, requestedBy: who, at: lastShownAt });
        clearTimeout(dwellTimer);
        dwellTimer = setTimeout(() => {
            // Only clear if the card up there is still OURS — the operator may
            // have taken the slot back in the meantime.
            if (releaseSlot(CARD_SLOT, 'chat')) clearSlot();
        }, cfg.dwellMs);
        dwellTimer.unref?.();
    }

    const pending = createPendingStore({
        windowMs: cfg.promptWindowMs,
        onResolve: (card, meta) => {
            if (!card) return;
            if (operatorHasSlot()) return;   // operator took the slot while we waited
            if (card.contentWarning) { log(`blocked (content warning): ${card.name}`); return; }
            show(card, meta.displayName);
        },
    });

    function handle(msg) {
        if (!live) return;
        // A bare number resolves this user's own open prompt, and is never
        // treated as a card name.
        // Key by platform+id: a Twitch id and a YouTube id could otherwise
        // collide and let one viewer resolve another's prompt.
        const key = `${msg.platform}:${msg.userId}`;
        if (pending.tryPick(key, msg.text)) return;

        const query = parseCommand(msg.text);
        if (!query) return;
        if (msg.firstMsg) return;                               // drop brand-new accounts silently
        if (shownThisStream >= cfg.maxPerStream) return;

        if (operatorHasSlot()) return;      // operator's card is up — chat yields, silently

        const since = Date.now() - lastShownAt;
        if (since < cfg.cooldownMs) {
            // Tell chat once per cooldown window, not once per request — 30
            // people typing during an 18s cooldown must not become 30 bot
            // messages. Everyone after the first is dropped silently.
            if (cfg.announceCooldown && lastCooldownNoticeAt <= lastShownAt) {
                lastCooldownNoticeAt = Date.now();
                const wait = Math.ceil((cfg.cooldownMs - since) / 1000);
                say(`@${msg.displayName} card viewer is cooling down — ${wait}s`).catch(() => {});
            }
            return;
        }

        const game = getGameSelection();
        const hit = resolveCardName(game, query);
        if (!hit) return;                                       // unknown name -> no-op, no reply
        if (hit.contentWarning) { log(`blocked (content warning): ${hit.name}`); return; }

        if (hit.ambiguous && Array.isArray(hit.alternatives) && hit.alternatives.length > 1) {
            const opts = hit.alternatives
                .map(n => resolveCardName(game, n))
                .filter(c => c && !c.contentWarning);
            if (opts.length > 1) {
                const listed = pending.open(key, msg.displayName, opts);
                const menu = listed.map((c, i) => `${i + 1}) ${c.name}`).join('  ');
                say(`@${msg.displayName} did you mean: ${menu}`).catch(() => {});
                return;
            }
        }
        show(hit, msg.displayName);
    }

    // One bridge, many chat sources. Each adapter only has to call handle()
    // with { platform, userId, displayName, text, firstMsg }; resolution,
    // cooldown, disambiguation and the denylist are transport-agnostic.
    // opts.connect === false lets tests drive handle() directly. Production
    // never passes it.
    const sources = [];
    if (opts.connect !== false) {
        sources.push({
            name: 'twitch',
            conn: connectTwitchChat({ channel, onMessage: handle, onStatus: (m) => log(`twitch: ${m}`) }),
        });
        // YouTube is optional and read-only: an API key is all it needs, but
        // sending would cost ~50 quota units a message AND drag in OAuth, so
        // YouTube viewers get the card on screen rather than a chat reply.
        const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
        const ytVideo = (process.env.YOUTUBE_VIDEO_ID || '').trim();
        const ytChannel = (process.env.YOUTUBE_CHANNEL_ID || '').trim();
        if (ytKey && (ytVideo || ytChannel)) {
            sources.push({
                name: 'youtube',
                conn: connectYouTubeChat({
                    apiKey: ytKey, videoId: ytVideo || undefined, channelId: ytChannel || undefined,
                    onMessage: handle, onStatus: (m) => log(`youtube: ${m}`),
                }),
            });
        } else if (ytKey) {
            log('youtube: YOUTUBE_API_KEY set but no YOUTUBE_VIDEO_ID / YOUTUBE_CHANNEL_ID — skipping');
        }
    }

    app.get('/api/chat-bridge/status', (_req, res) => res.json({
        enabled: true, live, channel,
        sources: sources.map(s => ({
            name: s.name,
            connected: s.conn.isConnected(),
            ...(s.conn.quotaUsed ? { quotaUsed: s.conn.quotaUsed() } : {}),
        })),
        connected: sources.some(s => s.conn.isConnected()),
        shownThisStream, cooldownMs: cfg.cooldownMs,
        cooldownRemainingMs: Math.max(0, cfg.cooldownMs - (Date.now() - lastShownAt)),
        slotOwner: slotOwner(CARD_SLOT),
        pendingPrompts: pending.size(),
    }));

    // Kill switch — flip without restarting the server mid-show.
    app.post('/api/chat-bridge/live/:state', (req, res) => {
        live = req.params.state === 'on';
        log(`kill switch: ${live ? 'LIVE' : 'PAUSED'}`);
        if (!live) { pending.shutdown(); clearSlot(); }
        res.json({ live });
    });

    log(`live on #${channel} — cooldown ${cfg.cooldownMs}ms, dwell ${cfg.dwellMs}ms, slot ${CARD_SLOT}`);
    return {
        enabled: true,
        stop() { for (const s of sources) s.conn.stop(); pending.shutdown(); clearTimeout(dwellTimer); },
        addSource(name, conn) { sources.push({ name, conn }); },
        handle,
        _test: { handle, parseCommand, status: () => ({ shownThisStream, lastShownAt }) },
    };
}

export const _internal = { parseCommand };
