// Watches the card recognizer for the moment a player's chosen champion hits
// the table, and tells the operator.
//
// Why this is the easy case for the recognizer, unlike open card ID:
//   * We know exactly which card to look for. The champion is on the board
//     already (player-champion-{side}), so this is a single-code comparison,
//     not a search.
//   * A champion STAYS in play. live_loop.py cycles every ~3s and only marks a
//     track "confirmed" after CONFIRM_SIGHTINGS(3) independent sightings, so a
//     card that sits on the mat gets many chances. Per-frame reliability does
//     not have to be good; eventual detection does.
//
// Deliberately does NOT fire a graphic. It raises a prompt the operator
// acknowledges — a late or wrong auto-trigger on air is far worse than the
// operator pressing a button two seconds later. Promote it once it has been
// watched being right for a few events.

import { onCardVisionState } from '../card-vision.js';
import { getControlData, getControlsTracker } from '../control.js';
import { getCardListData } from './cards.js';

const SIDES = ['left', 'right'];

// Recognizer codes carry variant suffixes (OGN-089a is the showcase print of
// OGN-089). The champion is the same card either way.
const baseCode = (code) => {
    const c = String(code || '').trim().toUpperCase();
    const m = c.match(/^([A-Z]{2,4}-\d+)[A-Z]?$/);
    return m ? m[1] : c;
};

function championCodeFor(name) {
    if (!name) return null;
    const data = getCardListData();
    const entry = data?.[String(name).trim()];
    return entry?.publicCode ? baseCode(entry.publicCode) : null;
}

let detections = {};        // "round:match:side" -> { code, name, side, at, acknowledged }
let unsubscribe = null;

const keyFor = (r, m, side) => `${r}:${m}:${side}`;

export function getChampionDetections() {
    return detections;
}

export function acknowledgeChampion(key) {
    if (!detections[key]) return false;
    detections[key].acknowledged = true;
    return true;
}

export function clearChampionDetections() {
    detections = {};
}

export function initChampionWatch(io, opts = {}) {
    // The recognizer watches ONE table. Which control board that is depends on
    // the rig; the overhead cam is "BMD - Match 1 Gameplay" by default.
    const controlId = String(opts.controlId || process.env.CARD_VISION_CONTROL_ID || '1');

    const emitState = () => io.emit('champion-watch-updated', { detections });

    unsubscribe = onCardVisionState((state) => {
        const mapping = getControlsTracker()?.[controlId];
        if (!mapping) return;
        const { round_id, match_id } = mapping;
        const match = getControlData()?.[round_id]?.[match_id];
        if (!match) return;

        // Only the codes the recognizer is confident about. live_loop marks a
        // track 'confirmed' after 3 sightings; 'pending' and 'covered' are not
        // good enough to interrupt an operator with.
        const confirmed = new Set(
            (state?.cards || [])
                .filter((c) => c.status === 'confirmed')
                .map((c) => baseCode(c.code))
        );
        if (!confirmed.size) return;

        let changed = false;
        for (const side of SIDES) {
            const name = match[`player-champion-${side}`];
            const code = championCodeFor(name);
            if (!code || !confirmed.has(code)) continue;

            const key = keyFor(round_id, match_id, side);
            // Fire once. Re-detecting the same champion on the same board is
            // the normal case (it stays on the table for the rest of the game)
            // and must not re-prompt.
            if (detections[key] && detections[key].code === code) continue;

            detections[key] = {
                key, side, code, name,
                round_id, match_id,
                at: Date.now(),
                acknowledged: false,
            };
            changed = true;
            console.log(`[champion-watch] ${side}: "${name}" (${code}) is on the table`);
        }
        if (changed) emitState();
    });

    io.on('connection', (socket) => {
        socket.on('get-champion-watch', () => socket.emit('champion-watch-updated', { detections }));
        socket.on('acknowledge-champion', ({ key } = {}) => {
            if (acknowledgeChampion(key)) emitState();
        });
        // New game on the same board — let the next champion re-prompt.
        socket.on('reset-champion-watch', () => {
            clearChampionDetections();
            emitState();
        });
    });

    // Say plainly when this can never fire. The watcher is only as live as the
    // recognizer feeding it, and "armed" in the log while card-vision is off
    // would read as working.
    const cvFlag = (process.env.CARD_VISION_ENABLED || '').trim().toLowerCase();
    if (['false', '0', 'off', 'no'].includes(cvFlag)) {
        console.log('[champion-watch] INERT — card-vision is disabled, so no champion will ever be detected');
    } else {
        console.log(`[champion-watch] armed on control ${controlId} (needs card-vision/live_loop.py running)`);
    }
    return { stop() { unsubscribe?.(); unsubscribe = null; } };
}
