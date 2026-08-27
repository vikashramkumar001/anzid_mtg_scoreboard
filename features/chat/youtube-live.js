// YouTube live chat READER — API key only, no OAuth.
//
// Reading needs nothing but an API key: no consent screen, no refresh tokens,
// no 7-day expiry, no app verification. (Sending would need OAuth AND costs
// ~50 quota units per message, so this adapter is read-only by design — the
// card appearing on stream IS the feedback for YouTube viewers.)
//
// QUOTA IS THE REAL CONSTRAINT. Default is 10,000 units/day, resetting at
// midnight Pacific, and liveChatMessages.list costs ~1 unit per call:
//
//   interval   6h stream    12h stream   % of daily quota (12h)
//   1s         21,600       43,200       432%   <- what the API asks for
//   5s          4,320        8,640        86%
//   6s          3,600        7,200        72%   <- our floor
//
// The API's own pollingIntervalMillis drops to ~1s on a busy chat, which would
// burn the entire day's quota in under three hours and kill the feature
// mid-show. So we honour that hint only when it is SLOWER than our floor.
// 6s of latency on a !card request is imperceptible on a broadcast.

const API = 'https://www.googleapis.com/youtube/v3';
const POLL_FLOOR_MS = 6000;
const DAILY_BUDGET = 9000;      // leave headroom under the 10k default

const log = (m) => console.log(`[youtube-live] ${m}`);

async function api(path, params, key) {
    const qs = new URLSearchParams({ ...params, key }).toString();
    const r = await fetch(`${API}/${path}?${qs}`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) {
        const body = await r.text().catch(() => '');
        const err = new Error(`${path} ${r.status}: ${body.slice(0, 200)}`);
        err.status = r.status;
        err.quotaExceeded = /quotaExceeded|dailyLimitExceeded/.test(body);
        throw err;
    }
    return r.json();
}

/**
 * Read the live chat of a broadcast.
 *
 *   videoId   pin a specific broadcast (1 quota unit to resolve — cheapest)
 *   channelId auto-discover the live video (search.list, its own 100/day bucket)
 *
 * Returns { stop, isConnected, quotaUsed }.
 */
export function connectYouTubeChat({ apiKey, videoId, channelId, onMessage, onStatus = () => {} }) {
    let stopped = false, liveChatId = null, pageToken = null;
    let connected = false, timer = null;
    let used = 0, day = new Date().toDateString();
    const seen = new Set();          // liveChatMessageId, guards the first-page backlog

    const spend = (n) => {
        const today = new Date().toDateString();
        if (today !== day) { day = today; used = 0; log('quota counter reset (new Pacific day may differ)'); }
        used += n;
        return used;
    };

    async function findVideoId() {
        if (videoId) return videoId;
        if (!channelId) throw new Error('set YOUTUBE_VIDEO_ID or YOUTUBE_CHANNEL_ID');
        // search.list has had its own 100-calls/day bucket since June 2026, so
        // discovery no longer competes with the chat budget.
        const j = await api('search', { part: 'id', channelId, eventType: 'live', type: 'video', maxResults: '1' }, apiKey);
        const id = j.items?.[0]?.id?.videoId;
        if (!id) throw new Error('no live broadcast found on that channel');
        return id;
    }

    async function resolveChat() {
        const vid = await findVideoId();
        const j = await api('videos', { part: 'liveStreamingDetails', id: vid }, apiKey);
        spend(1);
        const id = j.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
        if (!id) throw new Error(`video ${vid} has no active live chat (not live, or chat disabled)`);
        liveChatId = id;
        connected = true;
        onStatus(`reading chat for video ${vid}`);
    }

    async function poll() {
        if (stopped) return;
        let waitMs = POLL_FLOOR_MS;
        try {
            if (!liveChatId) await resolveChat();

            if (used >= DAILY_BUDGET) {
                connected = false;
                onStatus(`daily quota budget reached (${used}) — pausing until reset`);
                waitMs = 15 * 60 * 1000;
            } else {
                const j = await api('liveChat/messages', {
                    liveChatId, part: 'snippet,authorDetails', maxResults: '200',
                    ...(pageToken ? { pageToken } : {}),
                }, apiKey);
                spend(1);
                pageToken = j.nextPageToken || pageToken;
                connected = true;

                const first = seen.size === 0;
                for (const it of j.items || []) {
                    const id = it.id;
                    if (!id || seen.has(id)) continue;
                    seen.add(id);
                    if (first) continue;        // don't replay backlog on connect
                    const s = it.snippet || {}, a = it.authorDetails || {};
                    if (s.type !== 'textMessageEvent') continue;
                    const roles = new Set();
                    if (a.isChatOwner) roles.add('broadcaster');
                    if (a.isChatModerator) roles.add('moderator');
                    if (a.isChatSponsor) roles.add('subscriber');
                    onMessage({
                        platform: 'youtube',
                        userId: a.channelId || id,
                        login: a.channelId || '',
                        displayName: a.displayName || 'viewer',
                        text: s.displayMessage || s.textMessageDetails?.messageText || '',
                        roles,
                        firstMsg: false,     // YouTube exposes no first-message flag
                    });
                }
                if (seen.size > 5000) for (const k of [...seen].slice(0, 2500)) seen.delete(k);

                // Honour the API's hint only when it asks us to go SLOWER.
                waitMs = Math.max(POLL_FLOOR_MS, Number(j.pollingIntervalMillis) || 0);
            }
        } catch (e) {
            connected = false;
            if (e.quotaExceeded) { onStatus('QUOTA EXCEEDED — backing off 30m'); waitMs = 30 * 60 * 1000; }
            else if (/no active live chat|no live broadcast/.test(e.message)) { liveChatId = null; onStatus(`${e.message} — retrying in 60s`); waitMs = 60000; }
            else { onStatus(`error: ${e.message}`); waitMs = 30000; }
        }
        if (!stopped) { timer = setTimeout(poll, waitMs); timer.unref?.(); }
    }

    poll();
    return {
        stop() { stopped = true; clearTimeout(timer); connected = false; onStatus('stopped'); },
        isConnected: () => connected,
        quotaUsed: () => used,
    };
}
