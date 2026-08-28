// Disambiguation state for chat-triggered card lookups.
//
// When a viewer types a name that maps to several cards ("kennen" -> 3 Kennen
// printings), the bridge posts the numbered options back to chat and parks the
// request here. The SAME viewer can reply with a number to pick; if nobody
// replies within the window, the top-ranked option (a Legend, per resolve.js)
// shows anyway so the stream never stalls waiting on chat.
//
// Only the original requester may resolve their own prompt — otherwise a troll
// could hijack every disambiguation by racing a number into chat.

const DEFAULT_WINDOW_MS = 5000;

export function createPendingStore({ windowMs = DEFAULT_WINDOW_MS, onResolve } = {}) {
    // userId -> { options, timer, requestedAt, displayName }
    const byUser = new Map();

    function clear(userId) {
        const p = byUser.get(userId);
        if (p) { clearTimeout(p.timer); byUser.delete(userId); }
    }

    /**
     * Park an ambiguous request. Fires onResolve(choice, {reason, userId,
     * displayName}) either when the user picks or when the window lapses.
     * Returns the options so the caller can announce them.
     */
    function open(userId, displayName, options) {
        clear(userId);                       // a new request supersedes the old
        const list = options.slice(0, 5);    // never offer more than fits one chat line
        const requestedAt = Date.now();
        const timer = setTimeout(() => {
            byUser.delete(userId);
            onResolve?.(list[0], { reason: 'timeout', userId, displayName, requestedAt });
        }, windowMs);
        timer.unref?.();
        byUser.set(userId, { options: list, timer, displayName, requestedAt });
        return list;
    }

    /**
     * Feed every chat line here. If this user has a prompt open and the message
     * is just a number in range, resolve it. Returns true when consumed, so the
     * caller knows not to treat "2" as a card name.
     */
    function tryPick(userId, text) {
        const p = byUser.get(userId);
        if (!p) return false;
        const m = String(text ?? '').trim().match(/^([1-9])$/);
        if (!m) return false;
        const idx = Number(m[1]) - 1;
        if (idx < 0 || idx >= p.options.length) return false;
        clearTimeout(p.timer);
        byUser.delete(userId);
        onResolve?.(p.options[idx], { reason: 'picked', userId, displayName: p.displayName, requestedAt: p.requestedAt });
        return true;
    }

    function has(userId) { return byUser.has(userId); }
    function size() { return byUser.size; }
    function shutdown() { for (const id of [...byUser.keys()]) clear(id); }

    return { open, tryPick, has, size, clear, shutdown };
}
