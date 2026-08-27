// Twitch chat READER — anonymous IRC over WebSocket.
//
// Reading needs no credentials: connect as "justinfan<random>" with no PASS.
// Verified working 2026-08-27 (001 Welcome + CAP ACK + tagged PRIVMSGs).
// Sending is a separate concern and goes through the Helix API — an app token
// there avoids the user-token refresh dance entirely, so this socket stays
// read-only and can reconnect freely without ever touching auth.
//
// The adapter deliberately exposes one normalized shape:
//   onMessage({ platform, userId, login, displayName, text, roles:Set, firstMsg })
// so a YouTube or Restream adapter can be dropped in later without the bridge,
// resolver, or policy code knowing the difference.

import WebSocket from 'ws';

const ENDPOINT = 'wss://irc-ws.chat.twitch.tv:443';
const CAPS = 'twitch.tv/tags twitch.tv/commands';

// IRCv3 tag values escape ; \ space and CR/LF. Unescaping matters: a display
// name or message containing "\s" would otherwise carry the escape through.
const TAG_ESCAPES = { s: ' ', ':': ';', r: '\r', n: '\n', '\\': '\\' };
function unescapeTag(v) {
    // ONE pass. Chained .replace() calls are wrong here: "\\s" (an escaped
    // backslash followed by a literal s) would have its backslash consumed by
    // the \s rule and turn into a space.
    return String(v ?? '').replace(/\\(.)/g, (_, c) => (c in TAG_ESCAPES ? TAG_ESCAPES[c] : c));
}

function parseTags(raw) {
    const out = {};
    for (const pair of String(raw || '').split(';')) {
        const i = pair.indexOf('=');
        if (i < 0) { out[pair] = ''; continue; }
        out[pair.slice(0, i)] = unescapeTag(pair.slice(i + 1));
    }
    return out;
}

function rolesFrom(tags) {
    const roles = new Set();
    const badges = String(tags.badges || '');
    if (/(^|,)broadcaster\//.test(badges)) roles.add('broadcaster');
    if (tags.mod === '1' || /(^|,)moderator\//.test(badges)) roles.add('moderator');
    if (tags.subscriber === '1' || /(^|,)(subscriber|founder)\//.test(badges)) roles.add('subscriber');
    if (/(^|,)vip\//.test(badges)) roles.add('vip');
    return roles;
}

/**
 * Connect to a channel's chat, read-only. Returns { stop, isConnected }.
 * Reconnects with capped exponential backoff; because there is no auth, a
 * reconnect can never fail on a stale token — the classic chat-bot outage.
 */
export function connectTwitchChat({ channel, onMessage, onStatus = () => {} }) {
    const chan = '#' + String(channel).toLowerCase().replace(/^#/, '');
    let ws = null, stopped = false, attempt = 0, pingTimer = null, watchdog = null;

    const say = (msg) => onStatus(msg);

    function reconnectDelay() {
        attempt++;
        return Math.min(30000, 1000 * Math.pow(2, Math.min(attempt, 5))) + Math.random() * 500;
    }

    function cleanup() {
        clearInterval(pingTimer); pingTimer = null;
        clearTimeout(watchdog); watchdog = null;
        if (ws) { try { ws.removeAllListeners(); ws.close(); } catch {} ws = null; }
    }

    function armWatchdog() {
        clearTimeout(watchdog);
        // Twitch pings roughly every 5 min; if nothing arrives in 7, the socket
        // is a zombie — kill it rather than sit silently dead for a whole show.
        watchdog = setTimeout(() => { say('no traffic for 7m — recycling socket'); cleanup(); open(); }, 7 * 60 * 1000);
        watchdog.unref?.();
    }

    function open() {
        if (stopped) return;
        ws = new WebSocket(ENDPOINT);

        ws.on('open', () => {
            ws.send(`CAP REQ :${CAPS}`);
            ws.send(`NICK justinfan${Math.floor(Math.random() * 1e5)}`);
            ws.send(`JOIN ${chan}`);
            armWatchdog();
        });

        ws.on('message', (data) => {
            armWatchdog();
            for (const line of data.toString().split('\r\n')) {
                if (!line) continue;
                if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
                if (/ RECONNECT$/.test(line)) { say('server asked us to reconnect'); cleanup(); open(); return; }
                if (/ 001 /.test(line)) { attempt = 0; say(`connected to ${chan}`); continue; }

                const m = line.match(/^@(\S+) :(\w+)!\S+ PRIVMSG (#\S+) :(.*)$/);
                if (!m) continue;
                const tags = parseTags(m[1]);
                onMessage({
                    platform: 'twitch',
                    userId: tags['user-id'] || m[2],
                    login: m[2],
                    displayName: tags['display-name'] || m[2],
                    text: m[4],
                    roles: rolesFrom(tags),
                    firstMsg: tags['first-msg'] === '1',
                });
            }
        });

        const retry = (why) => {
            if (stopped) return;
            cleanup();
            const d = reconnectDelay();
            say(`${why} — reconnecting in ${Math.round(d / 1000)}s`);
            setTimeout(open, d).unref?.();
        };
        ws.on('close', () => retry('socket closed'));
        ws.on('error', (e) => retry(`socket error: ${e.message}`));
    }

    open();
    return {
        stop() { stopped = true; cleanup(); say('stopped'); },
        isConnected: () => !!ws && ws.readyState === WebSocket.OPEN,
    };
}

export const _internal = { parseTags, rolesFrom, unescapeTag };
