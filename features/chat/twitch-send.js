// Twitch chat SENDER — Helix POST /helix/chat/messages with an APP token.
//
// Why not IRC for sending: IRC needs a *user* token, which expires in ~4h and
// must be refreshed with a rotating refresh token. The failure mode is chat
// silently dying at hour two of an event day. An app access token is minted
// server-to-server from client_id + client_secret, lasts ~58 days, has no
// refresh token to lose, and is re-minted with one call. Twitch also names the
// Helix path the preferred one and it's the only route to the Chat Bot badge.
//
// One-time setup (see DEPLOY.md): register an app, then grant the BOT account
// `user:write:chat user:bot` once. Make the bot a moderator in the channel and
// the broadcaster's `channel:bot` grant is unnecessary — that also lifts the
// send limit from 20 to 100 messages / 30s.

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const SEND_URL = 'https://api.twitch.tv/helix/chat/messages';
const USERS_URL = 'https://api.twitch.tv/helix/users';

const log = (m) => console.log(`[twitch-send] ${m}`);

export function createTwitchSender({
    clientId = process.env.TWITCH_CLIENT_ID,
    clientSecret = process.env.TWITCH_CLIENT_SECRET,
    channel = process.env.TWITCH_CHANNEL,
    botLogin = process.env.TWITCH_BOT_LOGIN,
} = {}) {
    const configured = !!(clientId && clientSecret && channel && botLogin);
    if (!configured) {
        // Read-only mode: the bridge still works, it just can't post prompts.
        return { configured: false, async say() {}, async warmup() { return { ok: false, reason: 'not configured' }; } };
    }

    let token = null, tokenExpiresAt = 0;
    let broadcasterId = null, senderId = null;
    let lastSentAt = 0;

    async function getToken() {
        // Re-mint a day early rather than racing the expiry mid-show.
        if (token && Date.now() < tokenExpiresAt - 86400000) return token;
        const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' });
        const r = await fetch(TOKEN_URL, { method: 'POST', body, signal: AbortSignal.timeout(15000) });
        if (!r.ok) throw new Error(`token mint failed: ${r.status} ${(await r.text()).slice(0, 120)}`);
        const j = await r.json();
        token = j.access_token;
        tokenExpiresAt = Date.now() + (j.expires_in || 0) * 1000;
        log(`app token minted, valid ~${Math.round((j.expires_in || 0) / 86400)}d`);
        return token;
    }

    async function resolveIds() {
        if (broadcasterId && senderId) return;
        const t = await getToken();
        const url = `${USERS_URL}?login=${encodeURIComponent(channel)}&login=${encodeURIComponent(botLogin)}`;
        const r = await fetch(url, {
            headers: { Authorization: `Bearer ${t}`, 'Client-Id': clientId },
            signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) throw new Error(`user lookup failed: ${r.status} ${(await r.text()).slice(0, 120)}`);
        const { data = [] } = await r.json();
        broadcasterId = data.find(u => u.login === channel.toLowerCase())?.id || null;
        senderId = data.find(u => u.login === botLogin.toLowerCase())?.id || null;
        if (!broadcasterId || !senderId) throw new Error(`could not resolve ids (channel=${broadcasterId}, bot=${senderId})`);
        log(`ids resolved — channel ${broadcasterId}, bot ${senderId}`);
    }

    /**
     * Post one message. Never throws: a chat prompt failing must not take the
     * card viewer down with it.
     */
    async function say(message) {
        try {
            const text = String(message ?? '').replace(/\s+/g, ' ').trim().slice(0, 480);
            if (!text) return { ok: false, reason: 'empty' };

            // Twitch allows 1 msg/sec/channel for a non-mod account; space sends.
            const gap = Date.now() - lastSentAt;
            if (gap < 1100) await new Promise(r => setTimeout(r, 1100 - gap));

            await resolveIds();
            const t = await getToken();
            const r = await fetch(SEND_URL, {
                method: 'POST',
                headers: { Authorization: `Bearer ${t}`, 'Client-Id': clientId, 'Content-Type': 'application/json' },
                body: JSON.stringify({ broadcaster_id: broadcasterId, sender_id: senderId, message: text }),
                signal: AbortSignal.timeout(15000),
            });
            lastSentAt = Date.now();

            if (r.status === 401) { token = null; log('401 — token rejected, will re-mint next send'); return { ok: false, reason: '401' }; }
            if (!r.ok) { log(`send failed: ${r.status} ${(await r.text()).slice(0, 160)}`); return { ok: false, reason: String(r.status) }; }

            // A 200 does NOT mean delivered — AutoMod and followers-only mode
            // drop messages silently, reported in the body.
            const j = await r.json();
            const d = (j.data || [])[0] || {};
            if (d.is_sent === false) {
                log(`dropped by Twitch: ${d.drop_reason?.code || '?'} ${d.drop_reason?.message || ''}`);
                return { ok: false, reason: d.drop_reason?.code || 'dropped' };
            }
            return { ok: true };
        } catch (e) {
            log(`send error: ${e.message}`);
            return { ok: false, reason: e.message };
        }
    }

    // Called once at startup so credential problems surface in the boot log
    // rather than the first time chat needs a disambiguation prompt.
    async function warmup() {
        try { await resolveIds(); return { ok: true, broadcasterId, senderId }; }
        catch (e) { log(`warmup failed: ${e.message}`); return { ok: false, reason: e.message }; }
    }

    return { configured: true, say, warmup, _state: () => ({ broadcasterId, senderId, tokenExpiresAt }) };
}
