import {getControlData, emitControlData, saveControlData} from './control.js';
import {getSortedArchetypes} from './archetypes.js';
import {DEFAULT_INITIAL_TIME, getInitialTime, setInitialTime} from "../config/constants.js";

let globalMatchData = {
    'global-commentator-one': null,
    'global-commentator-one-subtext': null,
    'global-commentator-two': null,
    'global-commentator-two-subtext': null,
    'global-event-name': 'Event',
    'global-event-format': 'Format',
    'global-event-miscellaneous-details': null,
    'global-event-base-life-points': '20',
    'global-event-base-timer': '50'
};

// Get current global data
export function getGlobalMatchData() {
    return globalMatchData;
}

export function getInitialTimer() {
    return DEFAULT_INITIAL_TIME;
}

// Emit global data
export function emitGlobalMatchData(io) {
    io.emit('update-match-global-data', {globalData: globalMatchData});
}

// Update commentator data and broadcast it
export function updateCommentators(commentatorData, io) {
    Object.entries(commentatorData).forEach(([key, val]) => {
        if (key in globalMatchData) globalMatchData[key] = val;
    });
    emitGlobalMatchData(io);
}

export function updateBaseTimerDefault(eventInfo, timerState) {
    // Update DEFAULT_INITIAL_TIME if base timer changed
    const baseMinutes = parseInt(eventInfo['global-event-base-timer']);
    if (!isNaN(baseMinutes) && baseMinutes * 60 * 1000 !== DEFAULT_INITIAL_TIME) {

        const newInitialTime = baseMinutes * 60 * 1000;
        setInitialTime(newInitialTime);

        // Update non-running timers with new DEFAULT_INITIAL_TIME
        Object.entries(timerState).forEach(([round_id, roundMatches]) => {
            Object.entries(roundMatches).forEach(([match_id, timer]) => {
                if (timer.status !== 'running') {
                    timer.time = newInitialTime;
                }
            });
        });
    }
}

// Update event info (event name, format, base timer), sync with control data
export async function updateEventInformation(eventInfo, io, timerState) {
    // Update global object
    Object.entries(eventInfo).forEach(([key, val]) => {
        if (key in globalMatchData) globalMatchData[key] = val;
    });

    // emit global event data update
    emitGlobalMatchData(io);

    // Update control data (event-name and event-format) per match
    const controlData = getControlData();

    Object.entries(controlData).forEach(([round_id, roundData]) => {
        Object.entries(roundData).forEach(([match_id, matchData]) => {
            if ('event-name' in matchData)
                matchData['event-name'] = eventInfo['global-event-name'] || matchData['event-name'];
            if ('event-format' in matchData)
                matchData['event-format'] = eventInfo['global-event-format'] || matchData['event-format'];

            // Emit updated match data
            Object.entries(timerState.controlsTracker || {}).forEach(([control_id, ctrl]) => {
                if (ctrl.round_id === round_id && ctrl.match_id === match_id) {
                    io.emit(`control-${control_id}-saved-state`, {
                        data: matchData,
                        round_id,
                        match_id,
                        archetypeList: getSortedArchetypes()
                    });
                    io.emit(`scoreboard-${control_id}-saved-state`, {
                        data: matchData,
                        round_id,
                        match_id,
                        archetypeList: getSortedArchetypes()
                    });
                }
            });
        });
    });

    // Update DEFAULT_INITIAL_TIME if base timer changed
    updateBaseTimerDefault(eventInfo, timerState);

    await saveControlData();
    emitControlData(io);
}
