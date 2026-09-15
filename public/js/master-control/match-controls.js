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
    const state = { timerState: {}, scoreboardState: {}, slots: {}, game: '' };   // slots[n] = {round_id, match_id}

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
        </div>
        <div class="col-12 col-md-6">
            <div class="mc-resets" data-kind="life">
                <button type="button" class="btn btn-outline-warning w-100 py-2 mc-reset" data-slot="all">Reset Life: all slots</button>
                <div class="btn-group w-100 mt-2" role="group" aria-label="Reset life per control slot">
                    ${SLOTS.map(n => `<button type="button" class="btn btn-outline-warning mc-reset" data-slot="${n}">C${n}</button>`).join('')}
                </div>
                <div class="form-text mt-1">Life back to the event base (2v2: 30). Press twice — the first press arms it.</div>
            </div>
        </div>
        <div class="col-12 col-md-6">
            <div class="mc-resets" data-kind="match">
                <button type="button" class="btn btn-outline-danger w-100 py-2 mc-reset" data-slot="all">Reset Match: all slots</button>
                <div class="btn-group w-100 mt-2" role="group" aria-label="Reset match per control slot">
                    ${SLOTS.map(n => `<button type="button" class="btn btn-outline-danger mc-reset" data-slot="${n}">C${n}</button>`).join('')}
                </div>
                <div class="form-text mt-1">Life, wins, XP / poison and the clock (turns too). Press twice.</div>
            </div>
        </div>`;

    // ── Resets: the same fields the Matches-tab Reset Life button writes, sent
    // through the granular field-updated path the iPads use (persists, echoes
    // to master control, refreshes the scoreboard slot). Reset Match adds
    // wins, XP (riftbound) / poison (mtg) and a timer reset (which also zeroes
    // turns). Two presses: the first arms the button for 3s.
    const baseLife = () => (document.querySelector('#global-event-base-life-points')?.innerText || '20').trim();
    const sidesFor = () => {
        const pc = document.body.dataset.playerCount;
        return (pc === '2v2' || pc === 'ffa') ? ['left', 'right', 'left-2', 'right-2'] : ['left', 'right'];
    };
    const sendField = (rm, field, value) => socket.emit('field-updated', { round_id: rm.round_id, match_id: rm.match_id, field, value, timestamp: Date.now() });
    function resetLife(rm) {
        const pc = document.body.dataset.playerCount;
        const life = pc === '2v2' ? '30' : baseLife();
        for (const side of sidesFor()) sendField(rm, `player-life-${side}`, life);
        if (state.game === 'starwars') for (const side of sidesFor()) sendField(rm, `player-base-hp-${side}`, '30');
    }
    function resetMatch(rm) {
        resetLife(rm);
        for (const side of sidesFor()) sendField(rm, `player-wins-${side}`, '0');
        if (state.game === 'riftbound') for (const side of ['left', 'right']) sendField(rm, `player-xp-${side}`, '0');
        if (state.game === 'mtg') for (const side of ['left', 'right']) sendField(rm, `player-poison-${side}`, '0');
        socket.emit('update-timer-state', { round_id: rm.round_id, match_id: rm.match_id, action: 'reset' });
    }
    const armTimers = new WeakMap();
    function disarm(btn) {
        clearTimeout(armTimers.get(btn));
        btn.classList.remove('btn-danger', 'btn-warning', 'mc-armed');
        btn.classList.add(btn.closest('.mc-resets').dataset.kind === 'life' ? 'btn-outline-warning' : 'btn-outline-danger');
        btn.textContent = btn.dataset.label;
    }
    host.querySelectorAll('.mc-reset').forEach(btn => { btn.dataset.label = btn.textContent; });

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
        host.querySelectorAll('.mc-reset').forEach(btn => {
            btn.disabled = btn.dataset.slot === 'all' ? !SLOTS.some(slotRM) : !slotRM(btn.dataset.slot);
        });
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
        if (btn.classList.contains('mc-reset')) {
            const kind = btn.closest('.mc-resets').dataset.kind;
            if (!btn.classList.contains('mc-armed')) {
                btn.classList.add('mc-armed', kind === 'life' ? 'btn-warning' : 'btn-danger');
                btn.classList.remove('btn-outline-warning', 'btn-outline-danger');
                btn.textContent = `Confirm ${kind === 'life' ? 'reset life' : 'RESET MATCH'}${btn.dataset.slot === 'all' ? ' (all)' : ' C' + btn.dataset.slot}`;
                armTimers.set(btn, setTimeout(() => disarm(btn), 3000));
                return;
            }
            disarm(btn);
            const targets = btn.dataset.slot === 'all' ? SLOTS.map(slotRM).filter(Boolean) : [slotRM(btn.dataset.slot)].filter(Boolean);
            for (const rm of targets) (kind === 'life' ? resetLife : resetMatch)(rm);
            return;
        }
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
    socket.on('server-current-game-selection', ({ gameSelection } = {}) => { state.game = gameSelection || ''; });
    socket.on('game-selection-updated', ({ gameSelection } = {}) => { state.game = gameSelection || ''; });

    socket.emit('get-all-timer-states');
    socket.emit('get-scoreboard-state');
    socket.emit('get-control-broadcast-trackers');
    socket.emit('get-game-selection');
    paint();
}
