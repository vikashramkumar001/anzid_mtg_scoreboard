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
import { resolveCardName } from './chat/resolve.js';
import { createPendingStore } from './chat/pending.js';

const CARD_SLOT = '3';
const DEFAULTS = {
    cooldownMs: 18000,      // global gap between on-air cards
    dwellMs: 8000,          // how long a chat card stays up
    promptWindowMs: 5000,   // wait for a disambiguation reply
    maxPerStream: 200,      // hard ceiling for one session
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
    const say = opts.say || (async () => {});   // no-op until Helix creds exist
    let lastShownAt = 0, shownThisStream = 0, live = true;

    const clearSlot = () => emitCardView(io, {
        'game-id': getGameSelection(), 'card-selected': '', 'card-id': CARD_SLOT,
    });

    let dwellTimer = null;
    function show(card, who) {
        // Only ever pass a canonical key that came out of our own card map —
        // raw chat text must never reach emitCardView. variant-url is left
        // unset on purpose: features/cards.js feeds it straight to img.src.
        emitCardView(io, {
            'game-id': getGameSelection(), 'card-selected': card.name, 'card-id': CARD_SLOT,
        });
        lastShownAt = Date.now();
        shownThisStream++;
        log(`showing "${card.name}" (${who})`);
        io.emit('chat-card-shown', { name: card.name, requestedBy: who, at: lastShownAt });
        clearTimeout(dwellTimer);
        dwellTimer = setTimeout(clearSlot, cfg.dwellMs);
        dwellTimer.unref?.();
    }

    const pending = createPendingStore({
        windowMs: cfg.promptWindowMs,
        onResolve: (card, meta) => {
            if (!card) return;
            if (card.contentWarning) { log(`blocked (content warning): ${card.name}`); return; }
            show(card, meta.displayName);
        },
    });

    function handle(msg) {
        if (!live) return;
        // A bare number resolves this user's own open prompt, and is never
        // treated as a card name.
        if (pending.tryPick(msg.userId, msg.text)) return;

        const query = parseCommand(msg.text);
        if (!query) return;
        if (msg.firstMsg) return;                               // drop brand-new accounts silently
        if (shownThisStream >= cfg.maxPerStream) return;

        const since = Date.now() - lastShownAt;
        if (since < cfg.cooldownMs) return;                     // silent: never argue with chat

        const game = getGameSelection();
        const hit = resolveCardName(game, query);
        if (!hit) return;                                       // unknown name -> no-op, no reply
        if (hit.contentWarning) { log(`blocked (content warning): ${hit.name}`); return; }

        if (hit.ambiguous && Array.isArray(hit.alternatives) && hit.alternatives.length > 1) {
            const opts = hit.alternatives
                .map(n => resolveCardName(game, n))
                .filter(c => c && !c.contentWarning);
            if (opts.length > 1) {
                const listed = pending.open(msg.userId, msg.displayName, opts);
                const menu = listed.map((c, i) => `${i + 1}) ${c.name}`).join('  ');
                say(`@${msg.displayName} did you mean: ${menu}`).catch(() => {});
                return;
            }
        }
        show(hit, msg.displayName);
    }

    // opts.connect === false lets tests drive handle() directly without a
    // live socket. Production never passes it.
    const conn = opts.connect === false
        ? { stop() {}, isConnected: () => false }
        : connectTwitchChat({ channel, onMessage: handle, onStatus: (m) => log(m) });

    app.get('/api/chat-bridge/status', (_req, res) => res.json({
        enabled: true, live, channel,
        connected: conn.isConnected(),
        shownThisStream, cooldownMs: cfg.cooldownMs,
        cooldownRemainingMs: Math.max(0, cfg.cooldownMs - (Date.now() - lastShownAt)),
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
        stop() { conn.stop(); pending.shutdown(); clearTimeout(dwellTimer); },
        _test: { handle, parseCommand, status: () => ({ shownThisStream, lastShownAt }) },
    };
}

export const _internal = { parseCommand };
