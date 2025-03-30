import {promises as fs} from 'fs';
import {standingsDataPath} from '../config/constants.js';

let standingsData = {};

// Load standings from file
export async function loadStandingsData() {
    try {
        const data = await fs.readFile(standingsDataPath, 'utf8');
        standingsData = JSON.parse(data);
        console.log('Standings data loaded.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No standings data file found. Starting with empty data.');
            standingsData = {};
        } else {
            console.error('Error loading standings data:', error);
            standingsData = {};
        }
    }
}

// Save standings to file
export async function saveStandingsData() {
    try {
        await fs.writeFile(standingsDataPath, JSON.stringify(standingsData, null, 2));
        console.log('Standings data saved.');
    } catch (error) {
        console.error('Error saving standings data:', error);
    }
}

// Get current raw standings
export function getStandingsData() {
    return standingsData;
}

// Update standings for a round
export async function updateStandings(round_id, textData) {
    standingsData[round_id] = textData;
    await saveStandingsData();
}

// Parse raw text standings into objects
export function parseStandingsRawData(input) {
    let ret = {};
    for (let i = 1; i <= 15; i++) {
        ret[i.toString()] = {
            rank: "",
            name: "",
            archetype: "",
            record: ""
        };
    }

    if (typeof input !== 'string' || input.trim() === '') {
        return ret;
    }

    // Split the input into lines
    const lines = input
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0); // removes blank lines up front

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) continue; // Skip empty lines

        // Check if the line starts with a number (Rank)
        if (/^\d+/.test(line)) {
            const rank = line.split(' ')[0]; // The rank is the first part of the line
            const playerInfo = lines[++i].trim(); // The next line contains the player's name
            const archetype = lines[++i].trim(); // The next line contains the archetype
            const record = lines[++i].trim().split(/\s+/)[0]; // First space-delimited entry in the next line
            let firstName = '', lastName = '';
            if (playerInfo.includes(',')) {
                // "Last, First [optional extra]"
                [lastName, firstName] = playerInfo.split(',').map(part => part.trim());
                firstName = firstName.split(' ')[0]; // Only take the first word of firstName
            } else {
                // "First Last [optional extra]"
                const parts = playerInfo.trim().split(' ');
                [firstName, lastName] = parts;
            }
            const name = `${firstName} ${lastName}`;

            ret[rank] = {
                rank: parseInt(rank, 10),
                name: name,
                archetype: archetype,
                record: record
            };
        }
    }

    return ret;
}

// Emit full standings
export function emitStandings(io) {
    io.emit('standings-data', {standingsData});
}

// Emit parsed standings for broadcast
export function emitBroadcastStandings(io, round_id) {
    const raw = standingsData[round_id];
    // if (!raw) return;
    const parsed = parseStandingsRawData(raw);
    io.emit('broadcast-round-standings-data', parsed);
}
