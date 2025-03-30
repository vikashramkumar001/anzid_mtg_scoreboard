import { promises as fs } from 'fs';
import { cardListDataPath } from '../config/constants.js';

let cardListData = [];

// Load card list from file
export async function loadCardListData() {
  try {
    const data = await fs.readFile(cardListDataPath, 'utf8');
    cardListData = JSON.parse(data);
    console.log('Card list data loaded.');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Card list file not found. Starting with empty list.');
      cardListData = [];
    } else {
      console.error('Error loading card list data:', error);
      cardListData = [];
    }
  }
}

// Get the current card list
export function getCardListData() {
  return cardListData;
}

// Emit full card list to clients
export function emitCardList(io) {
  io.emit('card-list-data', { cardListData });
}

// Emit selected card for viewing
export function emitCardView(io, cardSelected) {
  io.emit('card-view-card-selected', cardSelected);
}
