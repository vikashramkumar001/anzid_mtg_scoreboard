// admin-control.js — clone of control.js (the base per-match control board)
// plus a Riftbound-only admin section (battlefield selection, brush override,
// baron pit, full showdown might). Every riftbound control writes through the
// SAME per-field `field-updated` path as the base board, so the server's
// updateFieldFromControl persists it and fans the full match state to the
// scoreboard — no heavy master-control-matches-updated emit.
import { RIFTBOUND_BATTLEFIELD_NAMES, RIFTBOUND_LEGENDS_LIST, RIFTBOUND_CHAMPIONS_LIST } from '/js/riftbound/constants.js';

// Battlefield dropdowns (the 3 per-side slots + the override picker) list every
// battlefield, so alphabetical order makes a name easy to find. The source
// constant is grouped by set; sort a copy here rather than mutate it (the sort
// is admin-control-only — master-control keeps its own ordering).
const SORTED_BATTLEFIELD_NAMES = [...RIFTBOUND_BATTLEFIELD_NAMES].sort((a, b) => a.localeCompare(b));

let baseLifePoints = '20';
let currentGame = '';   // tracked from game-selection; drives reset value + legend/champion vs archetype

function scale_element(element, reset = false) {
    element.style.maxWidth = "";
    element.style.transform = "scale(1)";
    let max_width = element.dataset.maxWidth;
    let current_width = element.scrollWidth;
    if (current_width > max_width) {
        let scale = max_width / current_width;
        // scale = 1 - scale;
        // scale = scale * 1;
        // scale = 1 - scale;
        element.style.transform = "scale(" + scale + ",1)";
    }
    if ("maxWidthOrigin" in element.dataset) {
        element.style.transformOrigin = element.dataset.maxWidthOrigin;
    }
    // element.style.maxWidth = max_width + "px";
}

Array.from(document.getElementsByClassName("has-maximum-width")).forEach((element) => {
    scale_element(element);
});

function onLifeTotalChange(element, modifier) {
    let div = document.getElementById(element);
    div.innerHTML = parseInt(div.innerHTML) + modifier;
    armTimeout(div);
}

function resetLifeTotals() {
    // Riftbound "life" is the shared score (starts at 0), not an MTG life total.
    const resetVal = currentGame === 'riftbound' ? '0' : baseLifePoints;
    const divs = ['player-life-left', 'player-life-right'].map(e => {
        const div = document.getElementById(e);
        div.innerHTML = resetVal;
        return div;
    });
    armTimeout(divs[0]);
    armTimeout(divs[1]);
}

// Reset the whole match: wins + XP → 0, life → the game's base (riftbound 0,
// else 20). Name / record / battlefields are left alone.
function resetMatch() {
    const lifeVal = currentGame === 'riftbound' ? '0' : baseLifePoints;
    const resets = [
        ['player-wins-left', '0'], ['player-wins-right', '0'],
        ['player-xp-left', '0'], ['player-xp-right', '0'],
        ['player-life-left', lifeVal], ['player-life-right', lifeVal],
    ];
    resets.forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = val; armTimeout(el); }
    });
}

// Add event listeners after DOM is fully loaded
function setupLifeUpdateListeners() {
    // Unified stepper for the base-board counters (wins / xp / poison / life).
    // Each +/- button carries data-target (the value div id), data-delta, and
    // optional data-min (clamp floor). We update the value div and armTimeout
    // to debounce the emit through the standard field-updated path.
    document.addEventListener('click', (e) => {
        const btn = e.target.closest?.('.abv2-step');
        if (!btn) return;
        const target = document.getElementById(btn.dataset.target);
        if (!target) return;
        let v = parseInt((target.textContent || '').trim(), 10);
        if (isNaN(v)) v = 0;
        v += parseInt(btn.dataset.delta, 10) || 0;
        if (btn.dataset.min !== undefined) v = Math.max(parseInt(btn.dataset.min, 10), v);
        target.textContent = String(v);
        armTimeout(target);
    });

    // Reset Life
    document.querySelector('.reset-life-btn')?.addEventListener('click', resetLifeTotals);
    // Reset Match — wins + XP + life
    document.querySelector('.reset-match-btn')?.addEventListener('click', resetMatch);
}

setupLifeUpdateListeners();

function sendData(eventTarget) {
    let field, value;
    
    if (eventTarget) {
        // Send individual field update
        field = eventTarget.id;
        if (eventTarget.tagName === "SELECT") {
            value = eventTarget.value.trim();
        } else {
            value = eventTarget.innerHTML.trim();
        }
        
        const timestamp = Date.now();
        console.log('emitting field update', field, '=', value);
        
        socket.emit('field-updated', {
            round_id, 
            match_id, 
            field: field,
            value: value,
            timestamp: timestamp
        });
        
        // Also update local current_state
        current_state[field] = value;
    } else {
        // Fallback: send all data (for compatibility)
        document.querySelectorAll(".dynamic").forEach(element => {
            if (element.tagName === "SELECT") {
                current_state[element.id] = element.value.trim();
            } else {
                current_state[element.id] = element.innerHTML.trim();
            }
        });
        console.log('emitting updated content', match_id, current_state);
        socket.emit('control-data-updated', {round_id, match_id, current_state});
    }
}

const fieldTimeouts = {};
function armTimeout(targetElement) {
    if (targetElement) {
        const key = targetElement.id;
        clearTimeout(fieldTimeouts[key]);
        fieldTimeouts[key] = setTimeout(() => sendData(targetElement), delay_value);
    } else {
        // No element — fallback to send all fields
        clearTimeout(timeout);
        timeout = setTimeout(() => sendData(undefined), delay_value);
    }
}

document.querySelectorAll(".editable").forEach(editable => 
    editable.addEventListener("input", (e) => armTimeout(e.target))
);
document.querySelectorAll(".editable").forEach(editable => editable.addEventListener('keypress', (evt) => {
    if (evt.which === 13) {
        evt.preventDefault();
    }
}));

// Wins +/- buttons
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('wins-plus-btn') || e.target.classList.contains('wins-minus-btn')) {
        const targetId = e.target.dataset.target;
        const winsEl = document.getElementById(targetId);
        if (!winsEl) return;
        let current = parseInt(winsEl.textContent) || 0;
        if (e.target.classList.contains('wins-plus-btn')) {
            current++;
        } else {
            current = Math.max(0, current - 1);
        }
        winsEl.textContent = current.toString();
        winsEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
});

function loadSavedState(data) {
    Object.entries(data).forEach((element) => {
        let [key, value] = element;
        if (document.getElementById(key) != null) {
            let el = document.getElementById(key);
            if (el.tagName === "SELECT") {
                let idx = [...el.options].findIndex(option => option.text === value);
                // A stored value not in the option list (e.g. a battlefield name
                // that isn't in RIFTBOUND_BATTLEFIELD_NAMES) would otherwise show
                // blank — add it so the select always reflects the saved value.
                if (idx === -1 && value) {
                    const opt = document.createElement('option');
                    opt.value = value; opt.textContent = value;
                    el.appendChild(opt);
                    idx = el.options.length - 1;
                }
                el.selectedIndex = idx;
            } else {
                document.getElementById(key).innerHTML = value;
            }
        }
    });
    setupCustomDropdowns(); // Set up dropdowns after loading saved state
}

function setupCustomDropdowns() {
    // Archetype fields (existing behavior)
    const archetypeFields = document.querySelectorAll('[id$="player-archetype-left"], [id$="player-archetype-right"]');
    archetypeFields.forEach(field => attachDropdown(field, () => currentArchetypeList));

    // Player-name fields (new — backed by currentPlayerRoster from
    // `playerRosterUpdated`). Matches both the 1v1 primaries
    // (#player-name-left, #player-name-right) and any 2v2 partner fields
    // that may land here via the match-control UI (#...-left-2 / -right-2).
    const playerNameFields = document.querySelectorAll(
        '[id$="player-name-left"], [id$="player-name-right"], [id$="player-name-left-2"], [id$="player-name-right-2"]'
    );
    playerNameFields.forEach(field => attachDropdown(field, () => currentPlayerRoster));

    // Riftbound Legend + Champion fields — touch-friendly autocomplete
    // (attachDropdown selects on `click`, which fires on iPad, unlike the
    // battlefield override picker's old mousedown).
    document.querySelectorAll('[id$="player-legend-left"], [id$="player-legend-right"]')
        .forEach(field => attachDropdown(field, () => RIFTBOUND_LEGENDS_LIST));
    document.querySelectorAll('[id$="player-champion-left"], [id$="player-champion-right"]')
        .forEach(field => attachDropdown(field, () => RIFTBOUND_CHAMPIONS_LIST));
}

// Shared wiring between archetype + player-name dropdowns. Takes a getter so
// the dropdown always reads the latest list (socket updates mutate the
// module-level arrays in place, not the reference we'd close over).
function attachDropdown(field, getItems) {
    if (!field || field.parentNode.classList.contains('custom-dropdown')) {
        return; // missing or already wired
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-dropdown';
    field.parentNode.insertBefore(wrapper, field);
    wrapper.appendChild(field);

    const dropdownList = document.createElement('div');
    dropdownList.className = 'dropdown-list';
    wrapper.appendChild(dropdownList);

    // Clear (×) button — tap to empty the field in one go instead of
    // backspacing, then reopen the full list to pick a new value. Only shown
    // when the field has content; the MutationObserver keeps that in sync
    // across typing, dropdown picks, and programmatic loadSavedState writes.
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'dropdown-clear';
    clearBtn.textContent = '×';
    clearBtn.setAttribute('aria-label', 'Clear');
    clearBtn.tabIndex = -1;
    wrapper.appendChild(clearBtn);

    const syncClear = () => { clearBtn.style.display = field.textContent.trim() ? '' : 'none'; };
    new MutationObserver(syncClear).observe(field, { childList: true, characterData: true, subtree: true });
    syncClear();

    clearBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        field.textContent = '';
        armTimeout(field);                                    // emit the cleared value
        field.focus();
        renderDropdownList(dropdownList, getItems(), field);  // reopen the full list
    });

    field.addEventListener('input', function () {
        const value = this.textContent.trim().toLowerCase();
        const filtered = getItems()
            .filter(item => item.name.toLowerCase().includes(value))
            .slice(0, 5);
        renderDropdownList(dropdownList, filtered, field);
    });

    field.addEventListener('focus', function () {
        renderDropdownList(dropdownList, getItems(), field);
    });

    document.addEventListener('click', function (e) {
        if (!wrapper.contains(e.target)) {
            dropdownList.style.display = 'none';
        }
    });
}

// Clear (×) button for plain editable cells that aren't dropdown-backed
// (pronouns + record). Mirrors the .dropdown-clear affordance the archetype /
// name / legend / champion fields get from attachDropdown: tap to empty the
// field and emit the cleared value. Wraps the field once (guarded) and keeps
// the × visible only when the field has content.
function attachFieldClear(field) {
    if (!field || field.parentNode.classList.contains('abv2-val-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'abv2-val-wrap';
    field.parentNode.insertBefore(wrap, field);
    wrap.appendChild(field);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'abv2-clear';
    clearBtn.textContent = '×';
    clearBtn.setAttribute('aria-label', 'Clear');
    clearBtn.tabIndex = -1;
    wrap.appendChild(clearBtn);

    const syncClear = () => { clearBtn.style.display = field.textContent.trim() ? 'flex' : 'none'; };
    new MutationObserver(syncClear).observe(field, { childList: true, characterData: true, subtree: true });
    syncClear();

    clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        field.textContent = '';
        armTimeout(field);   // emit the cleared value through the standard path
        field.focus();
    });
}

// Wire the × onto both players' pronouns + record cells (static fields, so
// once is enough; the guard makes repeat calls no-ops).
function setupFieldClears() {
    ['pronouns', 'record'].forEach(kind => {
        ['left', 'right'].forEach(side => {
            attachFieldClear(document.getElementById(`player-${kind}-${side}`));
        });
    });
}

function renderDropdownList(dropdownList, items, field) {
    dropdownList.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.textContent = item.name;
        div.classList.add('dropdown-item');
        div.addEventListener('click', function () {
            field.textContent = item.name;
            dropdownList.style.display = 'none';
            field.dispatchEvent(new Event('input'));
            field.dispatchEvent(new Event('change')); // Trigger change event
        });
        dropdownList.appendChild(div);
    });
    dropdownList.style.display = items.length > 0 ? 'block' : 'none';
}

// start

const socket = io();
// Initialize Room Manager
window.roomManager = new RoomManager(socket);
let timeout = null;
let current_state = {};
// Get match name from the URL
const pathSegments = window.location.pathname.split('/');
const control_id = pathSegments[2];
let round_id = '1';
let match_id = 'match1';
const delay_value = Number(pathSegments[3]) || 1000;        // Debounce delay in ms

console.log('from url - control id - delay', control_id, delay_value);

// Send the match ID to the server when the client connects - will send back saved data if control already exists
socket.emit('getSavedControlState', {control_id});

// Wire the × clear buttons onto the (static) pronouns + record fields.
setupFieldClears();

let currentArchetypeList = []; // To store the current archetype list
let currentPlayerRoster = [];  // To store the current player roster (for name autocomplete)

// Request the archetype list + player roster from the server when the page loads
socket.emit('getArchetypeList');
socket.emit('getPlayerRoster');

// listen for saved state from server
socket.on('control-' + control_id + '-saved-state', (data) => {
    console.log('got saved state from server', data);
    round_id = data['round_id'];
    match_id = data['match_id'];
    current_state = data['data'];
    loadSavedState(data['data']);
    hydrateRiftboundControls(data['data']);   // radio/checkbox/toggle states
})

// Listen for the archetype list from the server
socket.on('archetypeListUpdated', (archetypes) => {
    currentArchetypeList = archetypes;
    setupCustomDropdowns(); // Set up dropdowns after receiving the archetype list
});

// Listen for the player roster from the server (autocomplete for name fields)
socket.on('playerRosterUpdated', (roster) => {
    currentPlayerRoster = roster;
    setupCustomDropdowns(); // safe to call — attachDropdown short-circuits
                            // any field already wrapped in .custom-dropdown
});

// Initial setup when the page loads
document.addEventListener('DOMContentLoaded', () => {
    setupCustomDropdowns();
});

// Poison is now one of the unified base-board steppers (.abv2-step targeting
// player-poison-{side}, with data-min="0"), so it no longer needs its own
// wiring. The XP ↔ Poison slot swap is handled by updateCounterVisibility().

// START TIMER FUNCTIONS

// at the start, ask for all timer states from the server
socket.emit('get-all-timer-states');

// handle getting all timer states
socket.on('current-all-timer-states', ({timerState}) => {
    // console.log('got all timer states', timerState);
    const matchState = timerState[round_id][match_id];
    // console.log(matchState)
    if (matchState) {
        const timerElement = document.querySelector(`#timer`);
        const inTurns = matchState.time === 0;
        timerElement.innerText = inTurns ? `TURN ${matchState.turnCount ?? 0}` : formatTime(matchState.time);
        document.querySelector('#timer-turn-plus').style.display = inTurns ? 'inline-block' : 'none';
        document.querySelector('#timer-turn-minus').style.display = inTurns ? 'inline-block' : 'none';
    }
});

function updateTimerState(round_id, match_id, action) {
    console.log('update time state', round_id, match_id, action)
    socket.emit('update-timer-state', {round_id, match_id, action});
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

// Add event listeners for reset life buttons
function attachMatchTimerButtonListeners() {
    const startButton = document.querySelector(`#timer-start`);
    const addButton = document.querySelector(`#timer-add`);
    const minusButton = document.querySelector(`#timer-minus`);
    const pauseButton = document.querySelector(`#timer-pause`);
    const resetButton = document.querySelector(`#timer-reset`);
    startButton.addEventListener('click', () => {
        updateTimerState(round_id, match_id, 'start');
    });
    addButton.addEventListener('click', () => {
        updateTimerState(round_id, match_id, 'add');
    });
    minusButton.addEventListener('click', () => {
        updateTimerState(round_id, match_id, 'minus');
    });
    pauseButton.addEventListener('click', () => {
        updateTimerState(round_id, match_id, 'pause');
    });
    resetButton.addEventListener('click', () => {
        updateTimerState(round_id, match_id, 'reset');
    });
    document.querySelector(`#timer-turn-plus`)?.addEventListener('click', () => {
        updateTimerState(round_id, match_id, 'turn-plus');
    });
    document.querySelector(`#timer-turn-minus`)?.addEventListener('click', () => {
        updateTimerState(round_id, match_id, 'turn-minus');
    });
}


// attach button listeners for timers
attachMatchTimerButtonListeners();

// END TIMER FUNCTIONS

// HANDLE GLOBAL DATA

// request global data on start up
socket.emit('get-match-global-data');

// listen for global event details update from server
socket.on('update-match-global-data', (data) => {
    // let globalMatchData = {'global-commentator-one': null, 'global-commentator-one-subtext': null,...}
    console.log('got global event data from server', data);
    // update the base life points from server
    if ('global-event-base-life-points' in data['globalData']) {
        baseLifePoints = data['globalData']['global-event-base-life-points'] ? data['globalData']['global-event-base-life-points'] : '20';
    }

    const globalData = data.globalData || {};

    const eventFormatText = globalData['global-event-format'];
    const eventNameText = globalData['global-event-name'];
    const globalBaseLifePoints = globalData['global-event-base-life-points'];

    const eventFormatElement = document.getElementById('event-format');
    if (eventFormatElement && eventFormatText) {
        eventFormatElement.innerText = eventFormatText;
    }

    const eventNameElement = document.getElementById('event-name');
    if (eventNameElement && eventNameText) {
        eventNameElement.innerText = eventNameText;
    }

    if (globalBaseLifePoints) {
        baseLifePoints = globalBaseLifePoints;
    }

})

// END HANDLE GLOBAL DATA

// GAME SELECTION — the second per-player counter swaps by game:
//   riftbound → XP, mtg → Poison, anything else → neither.
function updateCounterVisibility(game) {
    const showXp = game === 'riftbound';
    const showPoison = game === 'mtg';
    document.querySelectorAll('.counter-xp').forEach(el => { el.style.display = showXp ? '' : 'none'; });
    document.querySelectorAll('.counter-poison').forEach(el => { el.style.display = showPoison ? '' : 'none'; });
}

socket.on('server-current-game-selection', ({gameSelection}) => {
    updateCounterVisibility(gameSelection?.toLowerCase());
    updateRiftboundVisibility(gameSelection?.toLowerCase());
});
socket.on('game-selection-updated', ({gameSelection}) => {
    updateCounterVisibility(gameSelection?.toLowerCase());
    updateRiftboundVisibility(gameSelection?.toLowerCase());
});
socket.emit('get-game-selection');

// ============================================================
// RIFTBOUND ADMIN TOOLS
// Shown only when game === 'riftbound'. Battlefield selection (3 radios +
// searchable override picker + brush override), Baron Pit enable/brush, and
// the full Showdown Might tracker (BF1/2/3 name + L/R might + active radio +
// show toggle). Replicates master-control/matches.js behavior but emits
// per-field via the same `field-updated` path the base board uses.
// ============================================================

// Show/hide the whole riftbound section based on the active game.
function updateRiftboundVisibility(game) {
    currentGame = game || '';
    const isRb = game === 'riftbound';
    const el = document.getElementById('riftbound-admin');
    if (el) el.style.display = isRb ? '' : 'none';
    // Riftbound shows Legend + Champion; other games show Archetype.
    document.querySelectorAll('.abv2-archetype-cell').forEach(c => { c.style.display = isRb ? 'none' : ''; });
    document.querySelectorAll('.abv2-rb-cell').forEach(c => { c.style.display = isRb ? '' : 'none'; });
}

// Emit a single field through the same timestamped path sendData uses, for
// values that aren't backed by an .editable element (the hidden active
// battlefield field + the radio/checkbox/toggle-derived showdown-* keys).
function emitField(field, value) {
    const timestamp = Date.now();
    console.log('emitting field update', field, '=', value);
    socket.emit('field-updated', {round_id, match_id, field, value, timestamp});
    current_state[field] = value;
}

// Set a player's active battlefield: writes the hidden field the scoreboard
// reads (player-battlefield-{side}), updates the "Active:" label, and emits.
function setActiveBattlefield(side, text) {
    const hidden = document.getElementById(`player-battlefield-${side}`);
    if (hidden) hidden.textContent = text;
    const label = document.querySelector(`.ra-active-name[data-side="${side}"]`);
    if (label) label.textContent = text || '—';
    emitField(`player-battlefield-${side}`, text);
    // Mirror into the matching showdown BF name (left→BF1, right→BF2), like
    // master-control — so the showdown popup tracks the active battlefield,
    // including "Brush" from the brush override. BF3 (Baron Pit) is independent.
    const bfNum = side === 'left' ? '1' : '2';
    const sdName = document.getElementById(`showdown-bf-${bfNum}-name`);
    if (sdName && sdName.textContent !== text) {
        sdName.textContent = text;
        emitField(`showdown-bf-${bfNum}-name`, text);
    }
}

function setupRiftboundAdminControls() {
    const root = document.getElementById('riftbound-admin');
    if (!root) return;

    // ── Battlefield radios (per side) ─────────────────────────────────
    // Selecting a radio copies that slot's text into the active field —
    // unless Brush override is on (then the selection is muted).
    root.querySelectorAll('.ra-bf-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            if (!radio.checked) return;
            const { side, bf } = radio.dataset;
            const brushBtn = root.querySelector(`.ra-brush-btn[data-side="${side}"]`);
            if (brushBtn?.classList.contains('active')) return; // brush locked
            const slot = document.getElementById(`player-battlefield-${bf}-${side}`);
            setActiveBattlefield(side, (slot?.value || '').trim());
        });
    });

    // ── Battlefield slots (native <select> per slot) ──────────────────
    // Each slot is a native dropdown of RIFTBOUND_BATTLEFIELD_NAMES (iPad shows
    // its own picker wheel). Populate the options, then on change emit the slot
    // field (player-battlefield-{n}-{side}) AND mirror into the active field
    // when this slot is the currently-selected radio (brush off) — like MC.
    root.querySelectorAll('.ra-bf-slot').forEach(slot => {
        if (slot.tagName === 'SELECT' && slot.options.length === 0) {
            const blank = document.createElement('option');
            blank.value = ''; blank.textContent = '— battlefield —';
            slot.appendChild(blank);
            SORTED_BATTLEFIELD_NAMES.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name; opt.textContent = name;
                slot.appendChild(opt);
            });
        }
        slot.addEventListener('change', () => {
            armTimeout(slot);   // emit player-battlefield-{n}-{side} = slot.value
            const m = slot.id.match(/^player-battlefield-(\d)-(left|right)$/);
            if (!m) return;
            const [, bf, side] = m;
            const checked = root.querySelector(`input[name="bf-${side}-select"]:checked`);
            if (!checked || checked.dataset.bf !== bf) return;
            const brushBtn = root.querySelector(`.ra-brush-btn[data-side="${side}"]`);
            if (brushBtn?.classList.contains('active')) return;
            setActiveBattlefield(side, slot.value.trim());
        });
    });

    // ── Brush override toggle (per side) ──────────────────────────────
    // Pressed → active field = "Brush". Released → restore from the
    // currently-checked radio's slot. (aria-pressed + .active, like MC.)
    root.querySelectorAll('.ra-brush-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const side = btn.dataset.side;
            const nowPressed = btn.getAttribute('aria-pressed') !== 'true';
            btn.setAttribute('aria-pressed', String(nowPressed));
            btn.classList.toggle('active', nowPressed);
            if (nowPressed) {
                setActiveBattlefield(side, 'Brush');
            } else {
                const checked = root.querySelector(`input[name="bf-${side}-select"]:checked`);
                const bf = checked?.dataset?.bf || '1';
                const slot = document.getElementById(`player-battlefield-${bf}-${side}`);
                setActiveBattlefield(side, (slot?.value || '').trim());
            }
        });
    });

    // ── Searchable override picker (per side) ─────────────────────────
    // Sets the active field to ANY battlefield (independent of the 3 radios).
    ['left', 'right'].forEach(side => setupBattlefieldPicker(side));

    // ── Baron Pit enable ──────────────────────────────────────────────
    const baronToggle = document.getElementById('showdown-bf-3-enabled-toggle');
    baronToggle?.addEventListener('change', () => {
        const enabled = baronToggle.checked;
        const bf3Row = root.querySelector('.ra-bf3-row');
        if (bf3Row) bf3Row.style.display = enabled ? '' : 'none';
        const nameEl = document.getElementById('showdown-bf-3-name');
        if (enabled && nameEl && !nameEl.textContent.trim()) {
            nameEl.textContent = 'Baron Pit';
            emitField('showdown-bf-3-name', 'Baron Pit');
        }
        emitField('showdown-bf-3-enabled', enabled ? 'true' : 'false');
    });

    // ── Baron Pit brush override ──────────────────────────────────────
    const baronBrush = root.querySelector('.ra-baron-brush-btn');
    baronBrush?.addEventListener('click', () => {
        const nameEl = document.getElementById('showdown-bf-3-name');
        if (!nameEl) return;
        const nowPressed = baronBrush.getAttribute('aria-pressed') !== 'true';
        baronBrush.setAttribute('aria-pressed', String(nowPressed));
        baronBrush.classList.toggle('active', nowPressed);
        if (nowPressed) {
            baronBrush._priorName = nameEl.textContent.trim() || 'Baron Pit';
            nameEl.textContent = 'Brush';
        } else {
            nameEl.textContent = baronBrush._priorName || 'Baron Pit';
        }
        emitField('showdown-bf-3-name', nameEl.textContent.trim());
    });

    // ── Showdown might steppers (+/-) ─────────────────────────────────
    // The value divs are .editable too, so manual edits auto-emit; the
    // buttons nudge the value and re-use the debounced armTimeout emit.
    root.querySelectorAll('.ra-might-plus, .ra-might-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            if (!target) return;
            let v = parseInt(target.innerText, 10);
            if (isNaN(v)) v = 0;
            v += btn.classList.contains('ra-might-plus') ? 1 : -1;
            if (v < 0) v = 0;
            target.innerText = String(v);
            armTimeout(target);
        });
    });

    // ── Active battlefield radio (showdown-active-bf) ─────────────────
    root.querySelectorAll('.ra-active-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            if (!radio.checked) return;
            emitField('showdown-active-bf', radio.dataset.bf);
        });
    });

    // ── Show on Scoreboard toggle (showdown-visible) ──────────────────
    const showBtn = root.querySelector('.ra-show-btn');
    showBtn?.addEventListener('click', () => {
        const nowPressed = showBtn.getAttribute('aria-pressed') !== 'true';
        showBtn.setAttribute('aria-pressed', String(nowPressed));
        showBtn.classList.toggle('active', nowPressed);
        showBtn.textContent = nowPressed ? 'Hide from Scoreboard' : 'Show on Scoreboard';
        emitField('showdown-visible', nowPressed ? 'true' : 'false');
    });
}

// Battlefield override — a NATIVE <select>. The previous custom dropdown
// rendered a div list below the input, which on iPad sat BELOW the on-screen
// keyboard (this section is low on the page) and so was invisible. A native
// <select> makes iOS pop its own always-visible picker wheel. Picks any of
// RIFTBOUND_BATTLEFIELD_NAMES and sets it as the active battlefield.
function setupBattlefieldPicker(side) {
    const select = document.querySelector(`.ra-picker-select[data-side="${side}"]`);
    if (!select) return;
    if (select.options.length <= 1) {
        SORTED_BATTLEFIELD_NAMES.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = name;
            select.appendChild(opt);
        });
    }
    select.addEventListener('change', () => {
        const name = select.value;
        if (!name) return;
        const brushBtn = document.querySelector(`.ra-brush-btn[data-side="${side}"]`);
        if (brushBtn?.classList.contains('active')) {
            brushBtn.setAttribute('aria-pressed', 'false');
            brushBtn.classList.remove('active');
        }
        setActiveBattlefield(side, name);
        // Free-form override (not one of the 3 preset slots): clear the radio
        // group so it honestly shows "no preset selected".
        document.querySelectorAll(`.ra-bf-radio[data-side="${side}"]`).forEach(r => { r.checked = false; });
        select.value = '';   // reset to the "Override…" placeholder
    });
}

// Hydrate radio/checkbox/toggle states from saved control data. The text
// fields (slots, names, might values, hidden active field) are already
// populated by loadSavedState; this restores the derived UI states.
function hydrateRiftboundControls(data) {
    if (!data) return;

    ['left', 'right'].forEach(side => {
        const active = (data[`player-battlefield-${side}`] || '').trim();
        const label = document.querySelector(`.ra-active-name[data-side="${side}"]`);
        if (label) label.textContent = active || '—';

        const brushBtn = document.querySelector(`.ra-brush-btn[data-side="${side}"]`);
        const isBrush = active === 'Brush';
        if (brushBtn) {
            brushBtn.setAttribute('aria-pressed', String(isBrush));
            brushBtn.classList.toggle('active', isBrush);
        }
        // Reflect the persisted active battlefield in the radio group: check
        // the matching preset slot, or leave all unchecked for a free-form
        // override. Skipped entirely when Brush is active — brush keeps the
        // prior radio so releasing it restores the right preset.
        if (!isBrush) {
            document.querySelectorAll(`.ra-bf-radio[data-side="${side}"]`).forEach(r => { r.checked = false; });
            if (active) {
                for (const bf of ['1', '2', '3']) {
                    const slot = (data[`player-battlefield-${bf}-${side}`] || '').trim();
                    if (slot && slot === active) {
                        const radio = document.querySelector(`.ra-bf-radio[data-side="${side}"][data-bf="${bf}"]`);
                        if (radio) radio.checked = true;
                        break;
                    }
                }
            }
        }
    });

    // Baron Pit enable + BF3 row visibility
    const baronEnabled = data['showdown-bf-3-enabled'] === 'true';
    const baronToggle = document.getElementById('showdown-bf-3-enabled-toggle');
    if (baronToggle) baronToggle.checked = baronEnabled;
    const bf3Row = document.querySelector('.ra-bf3-row');
    if (bf3Row) bf3Row.style.display = baronEnabled ? '' : 'none';

    // Baron brush override
    const baronBrush = document.querySelector('.ra-baron-brush-btn');
    const baronIsBrush = (data['showdown-bf-3-name'] || '').trim() === 'Brush';
    if (baronBrush) {
        baronBrush.setAttribute('aria-pressed', String(baronIsBrush));
        baronBrush.classList.toggle('active', baronIsBrush);
    }

    // Active battlefield radio
    const activeBf = data['showdown-active-bf'] || '1';
    const activeRadio = document.querySelector(`.ra-active-radio[data-bf="${activeBf}"]`);
    if (activeRadio) activeRadio.checked = true;

    // Show-on-scoreboard toggle
    const showVisible = data['showdown-visible'] === 'true';
    const showBtn = document.querySelector('.ra-show-btn');
    if (showBtn) {
        showBtn.setAttribute('aria-pressed', String(showVisible));
        showBtn.classList.toggle('active', showVisible);
        showBtn.textContent = showVisible ? 'Hide from Scoreboard' : 'Show on Scoreboard';
    }
}

// Wire up the riftbound controls once at load (elements are static markup).
setupRiftboundAdminControls();

// ============================================================
// NUMBER INPUTS — drag-to-scrub + tap-to-type (so you don't spam +/-)
// Each numeric value (life / wins / xp / poison + showdown might) supports:
//   • drag up/down on the number to spin it quickly (no keyboard)
//   • tap the number to type an exact value
//   • the +/- steppers still work for fine ±1
// Every path commits through the same debounced field-updated emit (armTimeout).
// ============================================================
function attachNumberInput(valueEl, { min } = {}) {
    if (!valueEl || valueEl._numInputWired) return;
    valueEl._numInputWired = true;
    valueEl.setAttribute('contenteditable', 'false');
    valueEl.classList.add('ac-num-input');

    const readVal = () => { const v = parseInt((valueEl.textContent || '').trim(), 10); return isNaN(v) ? 0 : v; };
    const clamp = v => (min !== undefined ? Math.max(min, v) : v);

    let startY = 0, startVal = 0, moved = false, dragging = false;

    const onMove = (e) => {
        if (!dragging) return;
        const dy = startY - e.clientY;                 // drag up = increase
        if (Math.abs(dy) > 4) moved = true;
        if (moved) {
            e.preventDefault();
            const v = clamp(startVal + Math.round(dy / 7));   // ~1 unit per 7px
            if (String(v) !== valueEl.textContent.trim()) valueEl.textContent = String(v);
        }
    };
    const onUp = () => {
        if (!dragging) return;
        dragging = false;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        if (moved) {
            armTimeout(valueEl);                       // emit scrubbed value
        } else {
            // a clean tap → enter edit mode, select all so typing replaces
            valueEl.setAttribute('contenteditable', 'true');
            valueEl.focus();
            const range = document.createRange();
            range.selectNodeContents(valueEl);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    };
    valueEl.addEventListener('pointerdown', (e) => {
        if (valueEl.getAttribute('contenteditable') === 'true') return; // already editing
        e.preventDefault();                            // suppress default focus/text-selection
        dragging = true; moved = false; startY = e.clientY; startVal = readVal();
        // Track on the document so the drag keeps working even when the pointer
        // leaves the small number box — more reliable than setPointerCapture.
        document.addEventListener('pointermove', onMove, { passive: false });
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
    });

    // Commit the typed value: clamp, leave edit mode, emit. Guarded so the
    // Enter-key path and the blur path don't double-fire.
    const commit = () => {
        if (valueEl.getAttribute('contenteditable') !== 'true') return;
        valueEl.setAttribute('contenteditable', 'false');
        valueEl.textContent = String(clamp(readVal()));   // sanitize + clamp
        armTimeout(valueEl);                               // emit typed value
    };

    valueEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); valueEl.blur(); }
    });
    valueEl.addEventListener('blur', commit);
}

function setupNumberInputs() {
    document.querySelectorAll('#control-base .abv2-num').forEach(el => attachNumberInput(el, { min: 0 }));
    document.querySelectorAll('#riftbound-admin .ra-might-val').forEach(el => attachNumberInput(el, { min: 0 }));
}
setupNumberInputs();