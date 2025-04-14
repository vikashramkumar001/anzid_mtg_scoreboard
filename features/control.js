import { promises as fs } from 'fs';
import { controlDataPath } from '../config/constants.js';
import { getSortedArchetypes } from './archetypes.js';

let controlData = {};
let controlsTracker = {
  '1': { round_id: '1', match_id: 'match1' },
  '2': { round_id: '1', match_id: 'match2' },
  '3': { round_id: '1', match_id: 'match3' },
  '4': { round_id: '1', match_id: 'match4' }
};
let broadcastTracker = {
  round_id: null
};

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

// Save control data to file
export async function saveControlData() {
  try {
    await fs.writeFile(controlDataPath, JSON.stringify(controlData, null, 2));
    console.log('Control data saved.');
  } catch (error) {
    console.error('Error saving control data:', error);
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

export function updateBroadcastTracker(round_id) {
  broadcastTracker.round_id = round_id;
}

// Emit control data update - master-control listening to update matches
export function emitControlData(io) {
  io.emit('control-data-updated', controlData);
}

// Update server with control data from control - goes to scoreboard / master-control
export async function updateFromControl(round_id, match_id, newState, io) {
  if (!controlData[round_id]) controlData[round_id] = {};
  controlData[round_id][match_id] = newState;
  await saveControlData();

  Object.entries(controlsTracker).forEach(([control_id, control]) => {
    if (control.round_id === round_id && control.match_id === match_id) {
      io.emit(`scoreboard-${control_id}-saved-state`, {
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

// Emit a control's saved state
export function emitSavedStateForControl(control_id, io) {
  let { round_id = '1', match_id = 'match1' } = controlsTracker[control_id] || {};
  if (!controlsTracker[control_id]) {
    controlsTracker[control_id] = { round_id, match_id };
  }

  io.emit(`control-${control_id}-saved-state`, {
    data: controlData[round_id]?.[match_id] || {},
    round_id,
    match_id,
    archetypeList: getSortedArchetypes()
  });
}

// Update control mapping
export function updateControlMapping(controlId, round_id, match_id, io) {
  controlsTracker[controlId] = { round_id, match_id };

  io.emit(`control-${controlId}-saved-state`, {
    data: controlData[round_id]?.[match_id] || {},
    round_id,
    match_id,
    archetypeList: getSortedArchetypes()
  });
}

// Emit control & broadcast trackers
export function emitControlTrackers(io) {
  io.emit('control-broadcast-trackers', {
    broadcastTracker,
    controlsTracker
  });
}

// Emit a full update from master control - goes to control / scoreboard
export async function updateFromMaster(allControlData, io) {
  controlData = allControlData;
  await saveControlData();

  Object.entries(allControlData).forEach(([round_id, roundData]) => {
    Object.entries(roundData).forEach(([match_id, matchData]) => {
      Object.entries(controlsTracker).forEach(([control_id, ctrl]) => {
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
}
