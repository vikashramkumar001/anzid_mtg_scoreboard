// features/group-assignment.js
// Team→group mapping for the flyquest 2v2 standings layout. The standings
// page shows GROUP 1 and GROUP 2 side-by-side; incoming Melee standings
// (flat ranked list) need a lookup to decide which bracket a team belongs
// in. Unlike roster.js there's no auto-seed — operators set this up once at
// the start of an event from master-control and it doesn't change.
//
// Storage shape (data/groupAssignment.json):
//   {
//     "group1": ["Team Alice", "Team Bob", ...],
//     "group2": ["Team Carol", "Team Dan", ...]
//   }
//
// Names here MUST match the `name` field produced by normalizeStandings
// (i.e. the concatenated "FirstName LastName" Melee returns). The
// renderer matches case-insensitively so minor casing drift between the
// operator's paste and Melee's canonical spelling doesn't break things.

import { promises as fs } from 'fs';
import { groupAssignmentPath } from '../config/constants.js';

// In-memory mirror of the on-disk mapping. `null` = not loaded yet. Empty
// groups are the normal "unconfigured" state and render as empty brackets
// downstream (no error — the operator just hasn't set it up yet).
let groupAssignment = { group1: [], group2: [] };

// Load from disk. Missing file = first boot, start empty. Malformed file is
// logged and treated as empty so a bad JSON doesn't prevent server startup.
export async function loadGroupAssignment() {
    try {
        const data = await fs.readFile(groupAssignmentPath, 'utf8');
        const parsed = JSON.parse(data);
        groupAssignment = {
            group1: Array.isArray(parsed.group1) ? parsed.group1 : [],
            group2: Array.isArray(parsed.group2) ? parsed.group2 : [],
        };
        console.log('Group assignment loaded.');
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('No group assignment found. Starting with empty groups.');
            groupAssignment = { group1: [], group2: [] };
        } else {
            console.error('Error loading group assignment:', err);
            groupAssignment = { group1: [], group2: [] };
        }
    }
}

// Persist to disk. Pretty-printed so a human can eyeball/edit the JSON.
export async function saveGroupAssignment() {
    try {
        await fs.writeFile(
            groupAssignmentPath,
            JSON.stringify(groupAssignment, null, 2)
        );
        console.log('Group assignment saved.');
    } catch (err) {
        console.error('Error saving group assignment:', err);
    }
}

// Returns a defensive copy so callers can't mutate the in-memory state.
export function getGroupAssignment() {
    return {
        group1: [...groupAssignment.group1],
        group2: [...groupAssignment.group2],
    };
}

// Replace the entire mapping in one call. The master-control UI is a pair
// of textareas — operators paste/edit the whole list at once, so this
// matches how they'll interact with it. Strings get trimmed + deduped
// (case-insensitively) before storage so accidental whitespace and
// dupes don't pollute the JSON.
export function setGroupAssignment({ group1 = [], group2 = [] } = {}) {
    const clean = (list) => {
        const seen = new Set();
        const out = [];
        for (const raw of list) {
            if (typeof raw !== 'string') continue;
            const trimmed = raw.trim();
            if (!trimmed) continue;
            const key = trimmed.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(trimmed);
        }
        return out;
    };
    groupAssignment = {
        group1: clean(group1),
        group2: clean(group2),
    };
    return getGroupAssignment();
}
