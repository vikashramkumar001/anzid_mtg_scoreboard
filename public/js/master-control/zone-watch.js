// Master-control toggle for the card recognizer.
//
// The recognizer is the most expensive process on the box (~1.5 cores
// constrained, ~6.7 if it falls back to an open search), so the button reports
// which of those two states it is in — not just on/off. An operator about to go
// live needs to see "open search" as a warning, not discover it as dropped
// frames.

export function initZoneWatch(socket) {
    const btn = document.getElementById('zone-watch-toggle');
    if (!btn) return;
    let status = { running: false, installed: false };
    // Only the colour variant changes; size/layout classes come from the markup.
    const variant = (v) => { btn.classList.remove('btn-outline-secondary', 'btn-success', 'btn-warning'); btn.classList.add(v); };

    function render() {
        if (!status.installed) {
            btn.textContent = 'Card Vision: n/a';
            variant('btn-outline-secondary');
            btn.disabled = true;
            btn.title = status.lastError || 'recognizer not installed on this machine';
            return;
        }
        btn.disabled = false;
        if (!status.running) {
            btn.textContent = 'Card Vision: off';
            variant('btn-outline-secondary');
            btn.title = status.lastError ? `last error: ${status.lastError}` : 'click to start the card recognizer';
            return;
        }
        // Running. Warn loudly when it is in the expensive mode.
        const mins = Math.floor((status.uptimeMs || 0) / 60000);
        btn.textContent = status.openSearch ? 'Card Vision: OPEN SEARCH' : `Card Vision: on (${mins}m)`;
        variant(status.openSearch ? 'btn-warning' : 'btn-success');
        btn.title = status.openSearch
            ? 'No decklist loaded — searching all 1190 cards, ~6.7 cores. Load a decklist or turn this off.'
            : `pool: ${status.pool || 'starting…'}`;
    }

    socket.on('zone-watch-updated', (s) => { status = s || status; render(); });

    btn.addEventListener('click', () => {
        const wasRunning = status.running;
        btn.disabled = true;
        socket.emit(wasRunning ? 'stop-zone-watch' : 'start-zone-watch', {}, (res) => {
            btn.disabled = false;
            if (res && !res.ok) alert(`Card Vision: ${res.error}`);
        });
    });

    // Uptime and pool are only refreshed by events, so poll slowly to keep the
    // label honest while nothing is happening.
    setInterval(() => socket.emit('get-zone-watch'), 15000);
    socket.emit('get-zone-watch');
    render();
}
