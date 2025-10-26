import {DEFAULT_INITIAL_TIME} from "../config/constants.js";
import { RoomUtils } from '../utils/room-utils.js';

// Create timerState structure for 16 rounds with 4 matches each
let timerState = Array.from({length: 16}, (_, i) => ({
    [i + 1]: {
        match1: {time: DEFAULT_INITIAL_TIME, status: 'stopped', show: true},
        match2: {time: DEFAULT_INITIAL_TIME, status: 'stopped', show: true},
        match3: {time: DEFAULT_INITIAL_TIME, status: 'stopped', show: true},
        match4: {time: DEFAULT_INITIAL_TIME, status: 'stopped', show: true}
    }
})).reduce((acc, round) => ({...acc, ...round}), {});

// Get timerState
export function getTimerState() {
    return timerState;
}

// Get current DEFAULT_INITIAL_TIME
export function getInitialTime() {
    return DEFAULT_INITIAL_TIME;
}

// Update DEFAULT_INITIAL_TIME globally
export function setInitialTime(ms) {
    DEFAULT_INITIAL_TIME = ms;
}

// Handle control actions from clients
export function updateTimerAction(io, round_id, match_id, action) {
    const match = timerState[round_id]?.[match_id];
    if (!match) return;

    switch (action) {
        case 'start':
            if (match.status !== 'running') match.status = 'running';
            break;
        case 'pause':
            match.status = 'paused';
            break;
        case 'add':
            match.time += 60000; // +1 min
            break;
        case 'minus':
            match.time = Math.max(0, match.time - 60000); // -1 min, min 0
            break;
        case 'reset':
            match.status = 'stopped';
            match.time = DEFAULT_INITIAL_TIME;
            break;
        case 'show':
            match.show = true;
            break;
        case 'no-show':
            match.show = false;
            break;
    }
}

// Emit full timer state
export function emitTimerState(io) {
    RoomUtils.emitWithRoomMapping(io, 'current-all-timer-states', {timerState});
}

// Set up timer interval to decrement running timers
export function startTimerBroadcast(io) {
    setInterval(() => {

        Object.keys(timerState).forEach(roundId => {
            Object.keys(timerState[roundId]).forEach(matchId => {
                const match = timerState[roundId][matchId];
                if (match.status === 'running' && match.time > 0) {
                    match.time -= 1000;
                }
                if (match.status === 'running' && match.time <= 0) {
                    match.time = 0;
                    match.status = 'stopped';
                }
            });
        });

        emitTimerState(io);
    }, 1000);
}
