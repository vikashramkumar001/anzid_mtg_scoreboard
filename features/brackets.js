import { promises as fs } from 'fs';
import { bracketDataPath } from '../config/constants.js';
import { RoomUtils } from '../utils/room-utils.js';

let bracketData = {};

// Load bracket data from file
export async function loadBracketData() {
  try {
    const data = await fs.readFile(bracketDataPath, 'utf8');
    bracketData = JSON.parse(data);
    console.log('Bracket data loaded.');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No bracket data file found. Starting fresh.');
      bracketData = {};
    } else {
      console.error('Error loading bracket data:', error);
      bracketData = {};
    }
  }
}

// Save bracket data to file
export async function saveBracketData() {
  try {
    await fs.writeFile(bracketDataPath, JSON.stringify(bracketData, null, 2));
    console.log('Bracket data saved.');
  } catch (error) {
    console.error('Error saving bracket data:', error);
  }
}

// Get current bracket data
export function getBracketData() {
  return bracketData;
}

// Update bracket data from socket, save, and emit
export async function handleBracketUpdate(bracketValues, io) {
  bracketData = bracketValues;
  await saveBracketData();
  RoomUtils.emitWithRoomMapping(io, 'bracket-data', { bracketData });
}

export function emitBracketData(io) {
  RoomUtils.emitWithRoomMapping(io, 'bracket-data', { bracketData });
}
