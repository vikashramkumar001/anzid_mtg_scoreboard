import {promises as fs} from 'fs';
import {controlDataPath, DEFAULT_GAME_SELECTION, setGameSelection, getGameSelection, getVendorSelection, setVendorSelection, getPlayerCount, setPlayerCount} from '../config/constants.js';
import {getSortedArchetypes} from './archetypes.js';
import {emitBroadcastStandings} from "./standings.js";
import { RoomUtils } from '../utils/room-utils.js';

let controlData = {};
let controlsTracker = {
    '1': {round_id: '1', match_id: 'match1'},
    '2': {round_id: '1', match_id: 'match2'},
    '3': {round_id: '1', match_id: 'match3'},
    '4': {round_id: '1', match_id: 'match4'}
};
let broadcastTracker = {
    round_id: null
};

// Write lock to prevent concurrent file writes that corrupt JSON
let isWriting = false;
let pendingWrite = false;

// make scoreboard state tracker - wins show/hide for now - can take other things later
let scoreboardState = Object.fromEntries(Array.from({length: 20}, (_, i) => [i + 1, {
    match1: {showWins: true},
    match2: {showWins: true},
    match3: {showWins: true},
    match4: {showWins: true}
}]));


// Load control data from file
export async function loadControlData() {
    try {
        const data = await fs.readFile(controlDataPath, 'utf8');
        controlData = JSON.parse(data);
        console.log('Control data loaded.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No control data found. Starting fresh.');
            controlData = {};
        } else {
            console.error('Error loading control data:', error);
            controlData = {};
        }
    }
}

// Save control data to file with write lock to prevent concurrent writes
export async function saveControlData() {
    if (isWriting) {
        pendingWrite = true;
        return;
    }

    isWriting = true;
    try {
        await fs.writeFile(controlDataPath, JSON.stringify(controlData, null, 2));
        // console.log('Control data saved.');
    } catch (error) {
        console.error('Error saving control data:', error);
    } finally {
        isWriting = false;
        if (pendingWrite) {
            pendingWrite = false;
            await saveControlData();
        }
    }
}

// Get trackers
export function getControlData() {
    return controlData;
}

export function getControlsTracker() {
    return controlsTracker;
}

export function getBroadcastTracker() {
    return broadcastTracker;
}

export function getScoreboardState() {
    return scoreboardState;
}

export function updateBroadcastTracker(round_id) {
    broadcastTracker.round_id = round_id;
}

// Emit control data update - master-control listening to update matches
export function emitControlData(io) {
    RoomUtils.emitWithRoomMapping(io, 'control-data-updated', controlData);
}

// Update server with control data from control - goes to scoreboard / master-control
export async function updateFromControl(round_id, match_id, newState, io) {
    if (!controlData[round_id]) controlData[round_id] = {};
    controlData[round_id][match_id] = newState;
    await saveControlData();

    Object.entries(controlsTracker).forEach(([control_id, control]) => {
        if (control.round_id === round_id && control.match_id === match_id) {
            RoomUtils.emitToRoom(io, `scoreboard-${control_id}`, `scoreboard-${control_id}-saved-state`, {
                data: controlData[round_id][match_id],
                round_id,
                match_id,
                archetypeList: getSortedArchetypes()
            });
        }
    });
    // send update to master-control
    emitControlData(io);
}

// NEW: Update a single field from control - granular updates
export async function updateFieldFromControl(round_id, match_id, field, value, timestamp, io) {
    if (!controlData[round_id]) controlData[round_id] = {};
    if (!controlData[round_id][match_id]) controlData[round_id][match_id] = {};
    if (!controlData[round_id][match_id]._timestamps) {
        controlData[round_id][match_id]._timestamps = {};
    }
    
    // Conflict resolution: only update if newer timestamp
    const currentTimestamp = controlData[round_id][match_id]._timestamps[field] || 0;
    if (timestamp > currentTimestamp) {
        controlData[round_id][match_id][field] = value;
        controlData[round_id][match_id]._timestamps[field] = timestamp;
        await saveControlData();
        
        // Emit granular update to master-control
        RoomUtils.emitWithRoomMapping(io, 'field-updated', {
            round_id,
            match_id,
            field,
            value,
            timestamp
        });

        // Also emit full state to scoreboard(s) tracking this round/match
        Object.entries(controlsTracker).forEach(([control_id, control]) => {
            if (control.round_id === round_id && control.match_id === match_id) {
                RoomUtils.emitToRoom(io, `scoreboard-${control_id}`, `scoreboard-${control_id}-saved-state`, {
                    data: controlData[round_id][match_id],
                    round_id,
                    match_id,
                    archetypeList: getSortedArchetypes()
                });
            }
        });
    }
}

// Emit a control's saved state - called by scoreboard
export function emitSavedStateForControl(control_id, io) {
    let {round_id = '1', match_id = 'match1'} = controlsTracker[control_id] || {};
    if (!controlsTracker[control_id]) {
        controlsTracker[control_id] = {round_id, match_id};
    }

    RoomUtils.emitToRoom(io, `control-${control_id}`, `control-${control_id}-saved-state`, {
        data: controlData[round_id]?.[match_id] || {},
        round_id,
        match_id,
        archetypeList: getSortedArchetypes()
    });
    RoomUtils.emitToRoom(io, `scoreboard-${control_id}`, `scoreboard-${control_id}-saved-state`, {
        data: controlData[round_id]?.[match_id] || {},
        round_id,
        match_id,
        archetypeList: getSortedArchetypes()
    });
}

// Update control mapping
export function updateControlMapping(controlId, round_id, match_id, io) {
    controlsTracker[controlId] = {round_id, match_id};

    RoomUtils.emitToRoom(io, `control-${controlId}`, `control-${controlId}-saved-state`, {
        data: controlData[round_id]?.[match_id] || {},
        round_id,
        match_id,
        archetypeList: getSortedArchetypes()
    });
    RoomUtils.emitToRoom(io, `scoreboard-${controlId}`, `scoreboard-${controlId}-saved-state`, {
        data: controlData[round_id]?.[match_id] || {},
        round_id,
        match_id,
        archetypeList: getSortedArchetypes()
    });
}

// Emit control & broadcast trackers
export function emitControlTrackers(io) {
    RoomUtils.emitWithRoomMapping(io, 'control-broadcast-trackers', {
        broadcastTracker,
        controlsTracker
    });
}

// Emit a full update from master control - goes to control / scoreboard
export async function updateFromMaster(allControlData, io) {
    console.log('[SWU DEBUG SERVER] updateFromMaster called, controlsTracker:', JSON.stringify(controlsTracker));
    // Merge incoming data with existing data to preserve draft list fields
    Object.entries(allControlData).forEach(([round_id, roundData]) => {
        if (isNaN(round_id)) return; // Skip non-round keys like "draftLists"
        if (!controlData[round_id]) controlData[round_id] = {};
        Object.entries(roundData).forEach(([match_id, matchData]) => {
            if (!controlData[round_id][match_id]) controlData[round_id][match_id] = {};
            // Preserve existing draft list fields
            const existingDraftListLeft = controlData[round_id][match_id]['player-draft-list-left'];
            const existingDraftListRight = controlData[round_id][match_id]['player-draft-list-right'];
            // Merge new data
            controlData[round_id][match_id] = { ...controlData[round_id][match_id], ...matchData };
            // Restore draft list fields if they existed and weren't in incoming data
            if (existingDraftListLeft && !matchData['player-draft-list-left']) {
                controlData[round_id][match_id]['player-draft-list-left'] = existingDraftListLeft;
            }
            if (existingDraftListRight && !matchData['player-draft-list-right']) {
                controlData[round_id][match_id]['player-draft-list-right'] = existingDraftListRight;
            }
        });
    });
    await saveControlData();

    Object.entries(allControlData).forEach(([round_id, roundData]) => {
        if (isNaN(round_id)) return; // Skip non-round keys like "draftLists"
        Object.entries(roundData).forEach(([match_id]) => {
            Object.entries(controlsTracker).forEach(([control_id, ctrl]) => {
                if (ctrl.round_id === round_id && ctrl.match_id === match_id) {
                    // Use merged controlData (not incoming data) to avoid async race condition
                    // where saveControlData delay causes stale data to be emitted last
                    const mergedData = controlData[round_id]?.[match_id] || {};
                    console.log(`[SWU DEBUG SERVER] Emitting to scoreboard-${control_id}, leader-left:`, mergedData['player-leader-left'], 'leader-right:', mergedData['player-leader-right']);
                    RoomUtils.emitToRoom(io, `control-${control_id}`, `control-${control_id}-saved-state`, {
                        data: mergedData,
                        round_id,
                        match_id,
                        archetypeList: getSortedArchetypes()
                    });
                    RoomUtils.emitToRoom(io, `scoreboard-${control_id}`, `scoreboard-${control_id}-saved-state`, {
                        data: mergedData,
                        round_id,
                        match_id,
                        archetypeList: getSortedArchetypes()
                    });
                }
            });
        });
        // emit round data to live broadcast changes using broadcastTracker
        // Use merged controlData (not incoming roundData) to include preserved draft list fields
        if (broadcastTracker.round_id && broadcastTracker.round_id === round_id) {
            RoomUtils.emitWithRoomMapping(io, 'broadcast-round-data', controlData[round_id]);
            // emit standings as well
            emitBroadcastStandings(io, round_id);
        }
    });
}

// emit scoreboardState
export function emitScoreboardState(io) {
    RoomUtils.emitWithRoomMapping(io, 'scoreboard-state-data', {scoreboardState});
}

// update scoreboard states from incoming data
export function updateScoreboardSate(io, round_id, match_id, action, value) {
    // console.log(round_id, match_id, action, value);
    if (action === 'showWins') {
        if (!scoreboardState[round_id]) {
            scoreboardState[round_id] = { match1: {showWins: true}, match2: {showWins: true}, match3: {showWins: true}, match4: {showWins: true} };
        }
        scoreboardState[round_id][match_id]['showWins'] = value;
        // emit updated scoreboard state
        emitScoreboardState(io);
    }
}

// game selection handlers
export function emitCurrentGameSelection(io) {
    RoomUtils.emitWithRoomMapping(io, 'server-current-game-selection', {gameSelection: getGameSelection()})
}

export function emitUpdatedGameSelection(io) {
    RoomUtils.emitWithRoomMapping(io, 'game-selection-updated', {gameSelection: getGameSelection()})
}

export function updateGameSelection(gameSelection, io) {
    setGameSelection(gameSelection);
    emitUpdatedGameSelection(io);
}

// vendor selection handlers
export function emitCurrentVendorSelection(io) {
    RoomUtils.emitWithRoomMapping(io, 'server-current-vendor-selection', {vendorSelection: getVendorSelection()})
}

export function emitUpdatedVendorSelection(io) {
    RoomUtils.emitWithRoomMapping(io, 'vendor-selection-updated', {vendorSelection: getVendorSelection()})
}

export function updateVendorSelection(vendorSelection, io) {
    setVendorSelection(vendorSelection);
    emitUpdatedVendorSelection(io);
}

// player count handlers
export function emitCurrentPlayerCount(io) {
    RoomUtils.emitWithRoomMapping(io, 'server-current-player-count', {playerCount: getPlayerCount()})
}

export function emitUpdatedPlayerCount(io) {
    RoomUtils.emitWithRoomMapping(io, 'player-count-updated', {playerCount: getPlayerCount()})
}

export function updatePlayerCount(playerCount, io) {
    setPlayerCount(playerCount);
    emitUpdatedPlayerCount(io);
}


