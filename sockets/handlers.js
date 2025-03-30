import {
    emitCardList,
    emitCardView
} from '../features/cards.js';

import {
    updateMatchState,
    emitSavedStateForControl,
    updateControlMapping,
    emitControlTrackers,
    updateFromMaster,
    emitControlData,
    getControlData, updateBroadcastTracker
} from '../features/control.js';

import {
    emitGlobalMatchData,
    updateCommentators,
    updateEventInformation
} from '../features/globalData.js';

import {
    emitTimerState,
    getTimerState,
    updateTimerAction
} from '../features/timers.js';

import {
    emitStandings,
    updateStandings,
    emitBroadcastStandings
} from '../features/standings.js';

import {
    emitBracketData,
    handleBracketUpdate
} from '../features/brackets.js';
import {
    updateDeckDisplay
} from "../features/decks.js";
import {
    emitOverlayBackgrounds
} from "../features/overlays.js";
import {
    getSortedArchetypes,
    saveArchetypeList,
    addArchetype,
    addMultipleArchetypes,
    deleteArchetype,
    updateArchetypeImage
} from "../features/archetypes.js";

export default function registerSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Send the current overlay background images to the newly connected client
        emitOverlayBackgrounds(io);

        // emit full control data
        emitControlData(io);

        // Scoreboard: match state updates
        socket.on('updateScoreboard', ({round_id, match_id, current_state}) => {
            updateMatchState(round_id, match_id, current_state, io);
        });

        socket.on('getSavedControlState', ({control_id}) => {
            emitSavedStateForControl(control_id, io);
        });

        socket.on('master-control-matches-updated', (allControlData) => {
            updateFromMaster(allControlData, io);
        });

        socket.on('control-mapping-update', ({controlId, round_id, match_id}) => {
            updateControlMapping(controlId, round_id, match_id, io);
        });

        socket.on('get-control-broadcast-trackers', () => {
            emitControlTrackers(io);
        });

        // Timer control
        socket.on('update-timer-state', ({round_id, match_id, action}) => {
            updateTimerAction(io, round_id, match_id, action);
        });

        socket.on('get-all-timer-states', () => {
            emitTimerState(io);
        });

        // Archetype list
        socket.on('getArchetypeList', () => {
            io.emit('archetypeListUpdated', getSortedArchetypes());
        });

        socket.on('addArchetype', (name) => {
            if (addArchetype(name)) {
                io.emit('archetypeListUpdated', getSortedArchetypes());
            }
        });

        socket.on('addArchetypes', async (names) => {
            if (addMultipleArchetypes(names)) {
                await saveArchetypeList();
                io.emit('archetypeListUpdated', getSortedArchetypes());
            }
        });

        socket.on('deleteArchetype', async (name) => {
            if (deleteArchetype(name)) {
                await saveArchetypeList();
                io.emit('archetypeListUpdated', getSortedArchetypes());
            }
        });

        socket.on('upload-archetype-image', async (name, url) => {
            if (updateArchetypeImage(name, url)) {
                await saveArchetypeList();
                io.emit('archetypeListUpdated', getSortedArchetypes());
            }
        });

        // Global match data
        socket.on('get-match-global-data', () => {
            emitGlobalMatchData(io);
        });

        socket.on('update-commentators-requested', ({commentatorData}) => {
            updateCommentators(commentatorData, io);
        });

        socket.on('update-event-information-requested', ({eventInformationData}) => {
            updateEventInformation(eventInformationData, io, getTimerState());
        });

        // Card viewer
        socket.on('get-card-list-data', () => {
            emitCardList(io);
        });

        socket.on('card-view-view-card', ({cardSelected}) => {
            emitCardView(io, cardSelected);
        });

        // Standings
        socket.on('get-all-standings', () => {
            emitStandings(io);
        });

        socket.on('standings-updated', async ({round_id, textData}) => {
            await updateStandings(round_id, textData);
        });

        // Broadcast
        socket.on('broadcast-requested', async ({round_id}) => {
            const controlData = getControlData();
            if (controlData[round_id]) {
                updateBroadcastTracker(round_id);
                io.emit('broadcast-round-data', controlData[round_id]);
            }
            emitBroadcastStandings(io, round_id);
        });

        // Bracket
        socket.on('get-bracket-data', () => {
            emitBracketData(io);
        });

        socket.on('bracket-updated', async ({bracketValues}) => {
            await handleBracketUpdate(bracketValues, io);
        });

        // Decks
        socket.on('display-deck', (payload) => {
            updateDeckDisplay(io, payload);
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
}
