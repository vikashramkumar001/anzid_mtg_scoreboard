// Controls tab — per-match scoreboard flags for the LIVE round: Show Timer,
// Count Up, Show Wins. Same server state the Matches-tab checkboxes drive
// (timerState / scoreboardState), so the two views can never disagree.
//
// Layout per feature: one "all" pill on top, M1–M4 pills underneath. The
// state is per match; the "all" pill is a convenience that sets all four
// (all on → all off, anything else → all on) and paints on / off / mixed.

const MATCHES = ['match1', 'match2', 'match3', 'match4'];

const FEATURES = [
    {
        key: 'show_timer', label: 'Show Timer',
        get: (s, r, m) => s.timerState[r]?.[m]?.show !== false,            // server default: shown
        set: (socket, r, m, on) => socket.emit('update-timer-state', { round_id: r, match_id: m, action: on ? 'show' : 'no-show' }),
    },
    {
        key: 'count_up', label: 'Count Up',
        get: (s, r, m) => !!s.timerState[r]?.[m]?.countUp,
        set: (socket, r, m, on) => socket.emit('update-timer-state', { round_id: r, match_id: m, action: on ? 'count-up' : 'count-down' }),
    },
    {
        key: 'show_wins', label: 'Show Wins',
        get: (s, r, m) => s.scoreboardState[r]?.[m]?.showWins !== false,   // server default: shown
        set: (socket, r, m, on) => socket.emit('update-scoreboard-state', { round_id: r, match_id: m, action: 'showWins', value: on }),
    },
];

export function initMatchControls(socket) {
    const host = document.getElementById('match-controls');
    if (!host) return;
    const roundEl = document.getElementById('mc-live-round');
    const state = { timerState: {}, scoreboardState: {}, round: '' };

    // Build once; paint on every state change.
    host.innerHTML = FEATURES.map(f => `
        <div class="col-12 col-md-4">
            <div class="mc-feature" data-feature="${f.key}">
                <button type="button" class="btn w-100 py-2 mc-all btn-outline-secondary">${f.label}: all</button>
                <div class="btn-group w-100 mt-2" role="group" aria-label="${f.label} per match">
                    ${MATCHES.map((m, i) => `<button type="button" class="btn mc-match btn-outline-secondary" data-match="${m}">M${i + 1}</button>`).join('')}
                </div>
            </div>
        </div>`).join('');

    const variant = (btn, cls) => { btn.classList.remove('btn-outline-secondary', 'btn-success', 'btn-warning'); btn.classList.add(cls); };

    function paint() {
        const r = state.round;
        if (roundEl) roundEl.textContent = r || '—';
        for (const f of FEATURES) {
            const block = host.querySelector(`.mc-feature[data-feature="${f.key}"]`);
            const all = block.querySelector('.mc-all');
            const perMatch = MATCHES.map(m => r ? f.get(state, r, m) : false);
            const onCount = perMatch.filter(Boolean).length;
            block.querySelectorAll('.mc-match').forEach((btn, i) => {
                variant(btn, perMatch[i] ? 'btn-success' : 'btn-outline-secondary');
                btn.disabled = !r;
            });
            all.disabled = !r;
            if (!r) { all.textContent = `${f.label}: all`; variant(all, 'btn-outline-secondary'); continue; }
            if (onCount === MATCHES.length) { all.textContent = `${f.label}: all on`; variant(all, 'btn-success'); }
            else if (onCount === 0)         { all.textContent = `${f.label}: all off`; variant(all, 'btn-outline-secondary'); }
            else                            { all.textContent = `${f.label}: mixed (${onCount}/4)`; variant(all, 'btn-warning'); }
        }
    }

    host.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !state.round) return;
        const f = FEATURES.find(x => x.key === btn.closest('.mc-feature')?.dataset.feature);
        if (!f) return;
        const r = state.round;
        if (btn.classList.contains('mc-match')) {
            const m = btn.dataset.match;
            f.set(socket, r, m, !f.get(state, r, m));
        } else if (btn.classList.contains('mc-all')) {
            const allOn = MATCHES.every(m => f.get(state, r, m));
            for (const m of MATCHES) f.set(socket, r, m, !allOn);
        }
    });

    socket.on('current-all-timer-states', ({ timerState } = {}) => { state.timerState = timerState || {}; paint(); });
    socket.on('scoreboard-state-data', ({ scoreboardState } = {}) => { state.scoreboardState = scoreboardState || {}; paint(); });
    socket.on('broadcast-scoreboard-round-id', ({ round_id } = {}) => { if (round_id) { state.round = String(round_id); paint(); } });

    socket.emit('get-all-timer-states');
    socket.emit('get-scoreboard-state');
    socket.emit('get-broadcast-scoreboard-data');   // answers with broadcast-scoreboard-round-id when a round is live
    paint();
}
