// Controls tab — per-slot scoreboard flags: Show Timer, Count Up, Show Wins,
// plus the turn counter. "Slot" = Control 1-4, i.e. the round+match each
// scoreboard page (/scoreboard/N) is mapped to — NOT the broadcast round.
// The broadcast round feeds the content overlays (decklists, L3, details);
// the clock, wins and turns render on the scoreboard, which follows the slot
// mapping, so that is what these pills address. Same server state the
// Matches-tab checkboxes drive (timerState / scoreboardState).
//
// Layout per feature: one "all" pill on top, C1–C4 pills underneath. State is
// per match; the "all" pill sets all four mapped matches (all on → all off,
// anything else → all on) and paints on / off / mixed.

const SLOTS = ['1', '2', '3', '4'];

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
    const state = { timerState: {}, scoreboardState: {}, slots: {} };   // slots[n] = {round_id, match_id}

    host.innerHTML = FEATURES.map(f => `
        <div class="col-12 col-md-4">
            <div class="mc-feature" data-feature="${f.key}">
                <button type="button" class="btn w-100 py-2 mc-all btn-outline-secondary">${f.label}: all</button>
                <div class="btn-group w-100 mt-2" role="group" aria-label="${f.label} per control slot">
                    ${SLOTS.map(n => `<button type="button" class="btn mc-slot btn-outline-secondary" data-slot="${n}">C${n}</button>`).join('')}
                </div>
            </div>
        </div>`).join('') + `
        <div class="col-12">
            <div class="mc-turns d-flex flex-wrap gap-3 align-items-center">
                <span class="small text-muted">Turns</span>
                ${SLOTS.map(n => `
                <div class="btn-group" role="group" aria-label="Turn counter, control ${n}" data-slot="${n}">
                    <button type="button" class="btn btn-outline-secondary mc-turn" data-dir="minus" title="Turn −1">−</button>
                    <button type="button" class="btn btn-outline-secondary mc-turn-label" disabled>C${n} · 0</button>
                    <button type="button" class="btn btn-outline-secondary mc-turn" data-dir="plus" title="Turn +1">+</button>
                </div>`).join('')}
                <span class="form-text m-0">Shown on the scoreboard only once a count-down clock hits 0:00.</span>
            </div>
        </div>`;

    const variant = (btn, cls) => { btn.classList.remove('btn-outline-secondary', 'btn-success', 'btn-warning'); btn.classList.add(cls); };
    const slotRM = (n) => state.slots[n] && state.slots[n].round_id && state.slots[n].match_id ? state.slots[n] : null;
    const short = (rm) => rm ? `R${rm.round_id} ${String(rm.match_id).replace('match', 'M')}` : '—';

    function paint() {
        for (const f of FEATURES) {
            const block = host.querySelector(`.mc-feature[data-feature="${f.key}"]`);
            const all = block.querySelector('.mc-all');
            const mapped = SLOTS.map(slotRM);
            const on = mapped.map(rm => rm ? f.get(state, rm.round_id, rm.match_id) : false);
            block.querySelectorAll('.mc-slot').forEach((btn, i) => {
                const rm = mapped[i];
                btn.disabled = !rm;
                btn.title = rm ? `Control ${SLOTS[i]} → ${short(rm)}` : `Control ${SLOTS[i]} is not mapped`;
                btn.innerHTML = `C${SLOTS[i]}<br><small>${short(rm)}</small>`;
                variant(btn, on[i] ? 'btn-success' : 'btn-outline-secondary');
            });
            const live = mapped.filter(Boolean).length;
            const onCount = on.filter(Boolean).length;
            all.disabled = live === 0;
            if (live === 0)            { all.textContent = `${f.label}: all`; variant(all, 'btn-outline-secondary'); }
            else if (onCount === live) { all.textContent = `${f.label}: all on`; variant(all, 'btn-success'); }
            else if (onCount === 0)    { all.textContent = `${f.label}: all off`; variant(all, 'btn-outline-secondary'); }
            else                       { all.textContent = `${f.label}: mixed (${onCount}/${live})`; variant(all, 'btn-warning'); }
        }
        host.querySelectorAll('.mc-turns [data-slot]').forEach(group => {
            const rm = slotRM(group.dataset.slot);
            const t = rm ? state.timerState[rm.round_id]?.[rm.match_id] : null;
            const inTurns = !!t && !t.countUp && t.time === 0;
            group.querySelector('.mc-turn-label').textContent = `C${group.dataset.slot} · ${t ? (t.turnCount ?? 0) : '—'}`;
            group.querySelectorAll('.mc-turn').forEach(b => { b.disabled = !rm; variant(b, inTurns ? 'btn-success' : 'btn-outline-secondary'); });
        });
    }

    host.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || btn.disabled) return;
        if (btn.classList.contains('mc-turn')) {
            const rm = slotRM(btn.closest('[data-slot]').dataset.slot);
            if (rm) socket.emit('update-timer-state', { round_id: rm.round_id, match_id: rm.match_id, action: btn.dataset.dir === 'plus' ? 'turn-plus' : 'turn-minus' });
            return;
        }
        const f = FEATURES.find(x => x.key === btn.closest('.mc-feature')?.dataset.feature);
        if (!f) return;
        if (btn.classList.contains('mc-slot')) {
            const rm = slotRM(btn.dataset.slot);
            if (rm) f.set(socket, rm.round_id, rm.match_id, !f.get(state, rm.round_id, rm.match_id));
        } else if (btn.classList.contains('mc-all')) {
            const mapped = SLOTS.map(slotRM).filter(Boolean);
            const allOn = mapped.every(rm => f.get(state, rm.round_id, rm.match_id));
            for (const rm of mapped) f.set(socket, rm.round_id, rm.match_id, !allOn);
        }
    });

    socket.on('current-all-timer-states', ({ timerState } = {}) => { state.timerState = timerState || {}; paint(); });
    socket.on('scoreboard-state-data', ({ scoreboardState } = {}) => { state.scoreboardState = scoreboardState || {}; paint(); });
    socket.on('control-broadcast-trackers', ({ controlsTracker } = {}) => { state.slots = controlsTracker || {}; paint(); });

    socket.emit('get-all-timer-states');
    socket.emit('get-scoreboard-state');
    socket.emit('get-control-broadcast-trackers');
    paint();
}
