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
// Cards go to slot 3 (/display/card/view/3), which has its own OBS browser
// source the operator can hide instantly. Note that slot 3 ALSO lands on the
// main scoreboard's right-hand viewer: scoreboard.js:1868 routes by
// `card-id === '1' ? left : right`, so anything that is not 1 renders right —
// it is not a 1/2 whitelist. That is why the operator-yield guard below keys
// on the SIDE rather than the card id.
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
    // Deliberately equal: the card comes down exactly when the next one is
    // allowed up, so the viewer is never sitting on the card back waiting out a
    // cooldown nobody can see. At 18s/8s there was a 10s dead gap after every
    // card. Keep these in step if you change either.
    cooldownMs: 10000,      // global gap between on-air cards
    dwellMs: 10000,         // how long a chat card stays up
    promptWindowMs: 5000,   // wait for a disambiguation reply
    maxPerStream: 200,      // hard ceiling for one session
    announceCooldown: true, // reply once per cooldown window, not per request
    maxHoldMs: 30000,       // drop a queued request older than this
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
    // Can we actually put a numbered menu in front of THIS viewer? Only on a
    // platform we can post to. YouTube is read-only by design (sending costs
    // ~50 quota units a message and needs OAuth), so a YouTube viewer must
    // never be made to wait on a prompt they cannot see — and their menu must
    // not be dumped into Twitch chat, where it is noise addressed to someone
    // who is not there.
    const canSend = !!opts.say || !!(sender && sender.configured);
    const canPromptOn = (platform) => platform === 'twitch' && canSend;
    if (sender) {
        if (sender.configured) sender.warmup().then(r => log(r.ok ? 'chat sending ready' : `chat sending unavailable: ${r.reason}`));
        else log('chat sending not configured — prompts disabled, timeout auto-pick still works');
    }
    let lastShownAt = 0, shownThisStream = 0, live = true;
    let lastCooldownNoticeAt = 0;

    // ── Cross-platform fairness ──────────────────────────────────────────────
    // The cooldown is global, so whoever lands first takes the slot and locks
    // everyone else out for a full window. Twitch arrives instantly while
    // YouTube arrives on a poll, so on a busy Twitch chat YouTube would lose
    // essentially every race — not on latency, on volume — and the loss is
    // invisible there because we cannot post to YouTube.
    //
    // So a request that arrives during a cooldown is PARKED instead of dropped,
    // one slot per platform (most recent wins), and when the window expires the
    // platform that was NOT served last goes first. Twitch still gets every
    // slot nobody else is waiting for.
    const waiting = new Map();      // platform -> { card, who, at }
    let lastServedPlatform = null;
    let drainTimer = null;

    const clearSlot = () => {
        try {
            emitCardView(io, { 'game-id': getGameSelection(), 'card-selected': '', 'card-id': CARD_SLOT });
        } catch (e) { log(`clear failed: ${e && e.message}`); }
    };

    let dwellTimer = null;
    // "Chat yields": the operator owns the viewer. On the anu scoreboard the
    // left overlay is hidden, so the operator's card-id 2 and our card-id 3
    // land on the SAME right-hand viewer — without this guard a viewer could
    // stomp a card the operator just put up.
    function operatorHasSlot() { return slotOwner(CARD_SLOT) === 'operator'; }

    function show(card, who, platform = null) {
        // Only ever pass a canonical key that came out of our own card map —
        // raw chat text must never reach emitCardView. variant-url is left
        // unset on purpose: features/cards.js feeds it straight to img.src.
        try {
            emitCardView(io, {
                'game-id': getGameSelection(), 'card-selected': card.name, 'card-id': CARD_SLOT,
            });
        } catch (e) {
            log(`emit failed (card not shown): ${e && e.message}`);
            return;
        }
        claimSlot(CARD_SLOT, 'chat');
        lastShownAt = Date.now();
        if (platform) lastServedPlatform = platform;
        shownThisStream++;
        scheduleDrain();                 // anyone parked gets the next window
        log(`showing "${card.name}" (${who})`);
        io.emit('chat-card-shown', { name: card.name, requestedBy: who, at: lastShownAt });
        clearTimeout(dwellTimer);
        dwellTimer = setTimeout(() => {
            // Dwell and cooldown are equal, so this fires at the same instant a
            // parked request becomes eligible. Hand straight over rather than
            // clearing first — otherwise the viewer blinks back to the card back
            // for the few ms between the two timers, and with a 400ms crossfade
            // that reads as a visible stutter between cards.
            if (waiting.size && Date.now() - lastShownAt >= cfg.cooldownMs && drain()) return;
            // Only clear if the card up there is still OURS — the operator may
            // have taken the slot back in the meantime.
            if (releaseSlot(CARD_SLOT, 'chat')) clearSlot();
        }, cfg.dwellMs);
        dwellTimer.unref?.();
    }

    function scheduleDrain() {
        if (drainTimer || !waiting.size) return;
        const wait = Math.max(0, cfg.cooldownMs - (Date.now() - lastShownAt));
        drainTimer = setTimeout(() => { drainTimer = null; drain(); }, wait + 25);
        drainTimer.unref?.();
    }

    // Returns true when it actually put a card on air.
    function drain() {
        if (!live || !waiting.size) return false;
        if (Date.now() - lastShownAt < cfg.cooldownMs) { scheduleDrain(); return false; }
        // The operator owns the viewer — parked chat requests are stale by the
        // time they would land, and chat yields to the operator either way.
        if (operatorHasSlot()) { waiting.clear(); return false; }
        for (const [p, e] of [...waiting]) {
            if (Date.now() - e.at > cfg.maxHoldMs) waiting.delete(p);
        }
        if (!waiting.size) return false;
        const platforms = [...waiting.keys()];
        const pick = platforms.find(p => p !== lastServedPlatform) ?? platforms[0];
        const entry = waiting.get(pick);
        waiting.delete(pick);
        log(`serving parked ${pick} request "${entry.card.name}"`);
        show(entry.card, entry.who, pick);
        return true;
    }

    const pending = createPendingStore({
        windowMs: cfg.promptWindowMs,
        onResolve: (card, meta) => {
            if (!card) return;
            if (operatorHasSlot()) return;   // operator took the slot while we waited
            // An UNANSWERED prompt must not fire into a screen that has moved on.
            // Without this, a viewer who opened a prompt and then asked for
            // something else got the abandoned pick slapped over the card they
            // actually wanted five seconds later. An explicit numeric reply is
            // still honoured — that is a current request, not a stale one.
            if (meta.reason === 'timeout' && lastShownAt > (meta.requestedAt || 0)) {
                log(`dropping stale auto-pick "${card.name}" — screen moved on`);
                return;
            }
            if (card.contentWarning) { log(`blocked (content warning): ${card.name}`); return; }
            // The pending store keys by "<platform>:<userId>", which is the only
            // place the platform survives a parked prompt.
            show(card, meta.displayName, String(meta.userId || '').split(':')[0] || null);
        },
    });

    function handle(msg) {
        // NEVER throw back into the transport. This runs inside the IRC socket's
        // message loop; an exception here would abort the rest of that frame and
        // can surface as an uncaughtException that kills the whole server —
        // taking the scoreboard down with it. A chat command failing must cost
        // one message, not the broadcast.
        try { handleInner(msg); }
        catch (e) { log(`handler error (ignored): ${e && e.message}`); }
    }

    function handleInner(msg) {
        if (!live) return;
        if (!msg || typeof msg !== 'object') return;
        if (typeof msg.text !== 'string' || !msg.userId) return;
        // A bare number resolves this user's own open prompt, and is never
        // treated as a card name.
        // Key by platform+id: a Twitch id and a YouTube id could otherwise
        // collide and let one viewer resolve another's prompt.
        const key = `${msg.platform}:${msg.userId}`;
        if (pending.tryPick(key, msg.text)) return;

        const query = parseCommand(msg.text);
        if (!query) return;
        // A new command from this viewer supersedes any prompt they left open,
        // whatever happens to the new request below.
        pending.clear(key);
        if (msg.firstMsg) return;                               // drop brand-new accounts silently
        if (shownThisStream >= cfg.maxPerStream) return;

        if (operatorHasSlot()) return;      // operator's card is up — chat yields, silently

        // Resolve BEFORE the cooldown check so a request that has to wait can be
        // parked as a real card rather than as raw text to re-parse later.
        const game = getGameSelection();
        const hit = resolveCardName(game, query);
        if (!hit) return;                                       // unknown name -> no-op, no reply
        if (hit.contentWarning) { log(`blocked (content warning): ${hit.name}`); return; }

        const since = Date.now() - lastShownAt;
        if (since < cfg.cooldownMs) {
            // Park it for the next window instead of dropping it. One slot per
            // platform: the most recent request from a platform replaces that
            // platform's parked one, so a busy chat cannot build a backlog.
            // Ambiguous names park as the top-ranked printing — a prompt whose
            // answer could not be shown for another 18s is worse than no prompt.
            waiting.set(msg.platform, { card: hit, who: msg.displayName, at: Date.now() });
            scheduleDrain();
            // Tell chat once per cooldown window, not once per request — 30
            // people typing during an 18s cooldown must not become 30 bot
            // messages. Everyone after the first is parked silently.
            if (cfg.announceCooldown && canPromptOn(msg.platform) && lastCooldownNoticeAt <= lastShownAt) {
                lastCooldownNoticeAt = Date.now();
                const wait = Math.ceil((cfg.cooldownMs - since) / 1000);
                say(`@${msg.displayName} card viewer is busy — yours is queued (${wait}s)`).catch(() => {});
            }
            return;
        }

        if (hit.ambiguous && Array.isArray(hit.alternatives) && hit.alternatives.length > 1) {
            const opts = hit.alternatives
                .map(n => resolveCardName(game, n))
                .filter(c => c && !c.contentWarning);
            if (opts.length > 1 && canPromptOn(msg.platform)) {
                const listed = pending.open(key, msg.displayName, opts);
                const menu = listed.map((c, i) => `${i + 1}) ${c.name}`).join('  ');
                say(`@${msg.displayName} did you mean: ${menu}`).catch(() => {});
                return;
            }
            // No way to ask: show the top-ranked printing straight away rather
            // than stalling for a reply that was never invited.
            if (opts.length > 1) { show(opts[0], msg.displayName, msg.platform); return; }
        }
        show(hit, msg.displayName, msg.platform);
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
                    pollMs: Number(process.env.YOUTUBE_POLL_MS) || undefined,
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
        queued: [...waiting.entries()].map(([p, e]) => ({ platform: p, card: e.card.name, waitingMs: Date.now() - e.at })),
        lastServedPlatform,
    }));

    // Kill switch — flip without restarting the server mid-show.
    app.post('/api/chat-bridge/live/:state', (req, res) => {
        live = req.params.state === 'on';
        log(`kill switch: ${live ? 'LIVE' : 'PAUSED'}`);
        if (!live) { pending.shutdown(); waiting.clear(); clearTimeout(drainTimer); drainTimer = null; clearSlot(); }
        res.json({ live });
    });

    log(`live on #${channel} — cooldown ${cfg.cooldownMs}ms, dwell ${cfg.dwellMs}ms, slot ${CARD_SLOT}`);
    return {
        enabled: true,
        stop() { for (const s of sources) s.conn.stop(); pending.shutdown(); clearTimeout(dwellTimer); clearTimeout(drainTimer); waiting.clear(); },
        addSource(name, conn) { sources.push({ name, conn }); },
        handle,
        _test: { handle, parseCommand, status: () => ({ shownThisStream, lastShownAt }) },
    };
}

export const _internal = { parseCommand };
