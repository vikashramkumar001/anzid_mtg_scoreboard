import {
    emitMTGCardList,
    emitCardView,
    transformSideDeck,
    transformMainDeck,
    transformDraftList
} from '../features/cards.js';

import {
    emitVibesCardList,
    emitVibesCardView,
    handleVibesIncomingDeckData
} from '../features/vibes/cards.js';

import {
    updateFromControl,
    updateFieldFromControl,
    emitSavedStateForControl,
    updateControlMapping,
    emitControlTrackers,
    updateFromMaster,
    emitControlData,
    getControlData,
    saveControlData,
    updateBroadcastTracker,
    emitScoreboardState,
    updateScoreboardSate, emitCurrentGameSelection, updateGameSelection, emitUpdatedGameSelection,
    emitCurrentVendorSelection, updateVendorSelection,
    emitCurrentPlayerCount, updatePlayerCount
} from '../features/control.js';

import {
    emitGlobalMatchData,
    updateBaseTimerDefault,
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
    emitBroadcastStandings,
    getCurrentBroadcastStandings
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
import {
    handleIncomingMetaBreakdownData
} from "../features/metaBreakdown.js";
import {
    emitRiftboundCardList,
    emitRiftboundCardView,
    handleRiftboundIncomingDeckData
} from "../features/riftbound/cards.js";

import {
    emitStarWarsCardList,
    emitStarWarsCardView,
    handleStarWarsIncomingDeckData,
    emitSWULeadersAndBases
} from "../features/starwars/cards.js";

import { RoomUtils } from '../utils/room-utils.js';
import {
    getPlatformConfig,
    setPlatformConfig,
    emitPlatformConfig,
    fetchTournamentStandings,
    fetchMatchByTable,
    fetchMeleeDecklists,
    fetchMeleePairings
} from '../features/tournament-platforms.js';

export default function registerSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Room management handlers
        socket.on('join-room', (roomName) => {
            socket.join(roomName);
            console.log(`[ROOM] Client ${socket.id} joined room: ${roomName}`);
        });
        
        socket.on('leave-room', (roomName) => {
            socket.leave(roomName);
            console.log(`[ROOM] Client ${socket.id} left room: ${roomName}`);
        });

        // Send the current overlay background images to the newly connected client
        emitOverlayBackgrounds(io);

        // emit full control data
        emitControlData(io);

        // Scoreboard: match state updates - comes from control - use to update master-control / scoreboard
        socket.on('control-data-updated', ({round_id, match_id, current_state}) => {
            updateFromControl(round_id, match_id, current_state, io);
        });

        // NEW: Granular field updates from control
        socket.on('field-updated', ({round_id, match_id, field, value, timestamp}) => {
            updateFieldFromControl(round_id, match_id, field, value, timestamp, io);
        });

        socket.on('getSavedControlState', ({control_id}) => {
            emitSavedStateForControl(control_id, io);
        });

        // comes from master control - use to update control / scoreboard
        socket.on('master-control-matches-updated', (allControlData) => {
            updateFromMaster(allControlData, io);
        });

        socket.on('control-mapping-update', ({controlId, round_id, match_id}) => {
            updateControlMapping(controlId, round_id, match_id, io);
        });

        socket.on('get-control-broadcast-trackers', () => {
            emitControlTrackers(io);
        });

        // Control data
        socket.on('get-all-control-data', () => {
            emitControlData(io);
        })

        // Scoreboard state (wins only for now)
        socket.on('get-scoreboard-state', () => {
            emitScoreboardState(io);
        })

        socket.on('update-scoreboard-state', ({round_id, match_id, action, value}) => {
            updateScoreboardSate(io, round_id, match_id, action, value);
        })

        // Timer control
        socket.on('update-timer-state', ({round_id, match_id, action}) => {
            updateTimerAction(io, round_id, match_id, action);
        });

        socket.on('get-all-timer-states', () => {
            emitTimerState(io);
        });

        // Overlays
        socket.on('getOverlays', () => {
            emitOverlayBackgrounds(io);
        })

        // Archetype list
        socket.on('getArchetypeList', () => {
            RoomUtils.emitWithRoomMapping(io, 'archetypeListUpdated', getSortedArchetypes());
        });

        socket.on('addArchetype', (name) => {
            if (addArchetype(name)) {
                RoomUtils.emitWithRoomMapping(io, 'archetypeListUpdated', getSortedArchetypes());
            }
        });

        socket.on('addArchetypes', async (names) => {
            if (addMultipleArchetypes(names)) {
                await saveArchetypeList();
                RoomUtils.emitWithRoomMapping(io, 'archetypeListUpdated', getSortedArchetypes());
            }
        });

        socket.on('deleteArchetype', async (name) => {
            if (deleteArchetype(name)) {
                await saveArchetypeList();
                RoomUtils.emitWithRoomMapping(io, 'archetypeListUpdated', getSortedArchetypes());
            }
        });

        socket.on('upload-archetype-image', async (name, url) => {
            if (updateArchetypeImage(name, url)) {
                await saveArchetypeList();
                RoomUtils.emitWithRoomMapping(io, 'archetypeListUpdated', getSortedArchetypes());
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


        // Global base timer
        socket.on('update-event-information-base-timer-requested', ({eventInformationData}) => {
            updateBaseTimerDefault(eventInformationData, getTimerState());
        });

        // Global game selection
        socket.on('update-game-selection', ({gameSelection}) => {
            updateGameSelection(gameSelection, io);
        })

        socket.on('get-game-selection', () => {
            emitCurrentGameSelection(io);
        })

        // Global vendor selection
        socket.on('update-vendor-selection', ({vendorSelection}) => {
            updateVendorSelection(vendorSelection, io);
        })

        socket.on('get-vendor-selection', () => {
            emitCurrentVendorSelection(io);
        })

        // Global player count
        socket.on('update-player-count', ({playerCount}) => {
            updatePlayerCount(playerCount, io);
        })

        socket.on('get-player-count', () => {
            emitCurrentPlayerCount(io);
        })

        // Card viewer
        socket.on('mtg-get-card-list-data', () => {
            emitMTGCardList(io);
        });

        socket.on('view-selected-card', ({cardSelected}) => {
            console.log('[VIEW] view-selected-card from', socket.id, cardSelected);
            emitCardView(io, cardSelected);
        });

        // VIBES

        // Vibes - Card viewer
        socket.on('vibes-get-card-list-data', () => {
            emitVibesCardList(io);
        });

        socket.on('vibes-card-view-view-card', ({cardSelected}) => {
            emitVibesCardView(io, cardSelected);
        });

        // Vibes - Deck Display
        socket.on('vibes-main-deck-display-clicked', (deckListData) => {
            handleVibesIncomingDeckData(io, deckListData)
        })

        // END VIBES

        // RIFTBOUND

        // riftbound - Card viewer
        socket.on('riftbound-get-card-list-data', () => {
            emitRiftboundCardList(io);
        });

        socket.on('riftbound-card-view-view-card', ({cardSelected}) => {
            emitRiftboundCardView(io, cardSelected);
        });

        // riftbound - Deck Display
        socket.on('riftbound-main-deck-display-clicked', (deckListData) => {
            handleRiftboundIncomingDeckData(io, deckListData)
        })

        // END RIFTBOUND

        // STARWARS

        // starwars - Card list
        socket.on('starwars-get-card-list-data', () => {
            emitStarWarsCardList(io);
        });

        // starwars - Deck Display
        socket.on('starwars-main-deck-display-clicked', (deckListData) => {
            handleStarWarsIncomingDeckData(io, deckListData)
        })

        // starwars - Leaders and Bases list for dropdowns
        socket.on('starwars-get-leaders-and-bases', () => {
            emitSWULeadersAndBases(io);
        });

        // END STARWARS

        // Standings
        socket.on('get-all-standings', () => {
            emitStandings(io);
        });

        socket.on('standings-updated', async ({round_id, textData}) => {
            await updateStandings(round_id, textData);
        });

        socket.on('get-broadcast-standings', () => {
            const standings = getCurrentBroadcastStandings();
            if (standings) {
                socket.emit('broadcast-round-standings-data', standings);
            }
        });

        // Broadcast
        socket.on('broadcast-requested', async ({round_id}) => {
            const controlData = getControlData();
            console.log('haha');
            if (controlData[round_id]) {
                updateBroadcastTracker(round_id);
                RoomUtils.emitWithRoomMapping(io, 'broadcast-round-data', controlData[round_id]);
                console.log('haha again');
            }
            emitBroadcastStandings(io, round_id);
        });

        // Broadcast deck data to be transformed
        socket.on('transform-main-deck-data', (data) => {
            transformMainDeck(data, io);
        });

        socket.on('transform-side-deck-data', (data) => {
            transformSideDeck(data, io);
        });

        socket.on('transform-draft-list', (data) => {
            transformDraftList(data, io);
        });

        // Request current draft list data (for page refresh)
        socket.on('get-draft-list-data', ({ slotId }) => {
            console.log('[DraftList] Data requested for slot:', slotId);
            const controlData = getControlData();

            if (controlData.draftLists && controlData.draftLists[slotId]) {
                const data = controlData.draftLists[slotId];
                socket.emit('draft-list-data', {
                    slotId,
                    playerName: data.playerName || '',
                    playerPronouns: data.playerPronouns || '',
                    playerArchetype: data.playerArchetype || '',
                    playerManaSymbols: data.playerManaSymbols || '',
                    cards: data.cards || []
                });
            }
        });

        // Draft list update from master control (real-time)
        // Stored separately from match data - completely independent
        socket.on('update-draft-list', async ({ slotId, playerName, playerPronouns, playerArchetype, playerManaSymbols, draftList }) => {
            console.log('[DraftList] Update received for slot:', slotId, playerName, draftList?.length, 'cards');

            // Get current control data
            const controlData = getControlData();

            // Store draft lists in separate 'draftLists' structure
            if (!controlData.draftLists) controlData.draftLists = {};
            controlData.draftLists[slotId] = {
                playerName: playerName || '',
                playerPronouns: playerPronouns || '',
                playerArchetype: playerArchetype || '',
                playerManaSymbols: playerManaSymbols || '',
                cards: draftList
            };

            // Save to persist the data
            await saveControlData();

            // Emit dedicated draft list event (not broadcast-round-data)
            RoomUtils.emitWithRoomMapping(io, 'draft-list-data', {
                slotId,
                playerName: playerName || '',
                playerPronouns: playerPronouns || '',
                playerArchetype: playerArchetype || '',
                playerManaSymbols: playerManaSymbols || '',
                cards: draftList
            });
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

        // Meta Breakdown
        socket.on('send-meta-breakdown-data', (payload) => {
            handleIncomingMetaBreakdownData(io, payload);
        });

        // Tournament Platform
        socket.on('get-tournament-platform', () => {
            socket.emit('tournament-platform-config', getPlatformConfig());
        });

        socket.on('set-tournament-platform', (config) => {
            setPlatformConfig(config);
            emitPlatformConfig(io);
        });

        socket.on('fetch-tournament-standings', async ({ platform, tournamentId, roundId }) => {
            try {
                // Update config before fetching
                setPlatformConfig({ platform, tournamentId });
                // Pass roundId to fetch standings for that specific round
                const standings = await fetchTournamentStandings(roundId);
                socket.emit('tournament-standings-fetched', { standings });
            } catch (error) {
                socket.emit('tournament-standings-fetched', { error: error.message });
            }
        });

        // Fetch match data by table number
        socket.on('fetch-match-by-table', async ({ tournamentId, roundNumber, tableNumber, platform }) => {
            try {
                const matchData = await fetchMatchByTable(tournamentId, roundNumber, tableNumber, platform);
                socket.emit('match-by-table-fetched', { matchData });
            } catch (error) {
                socket.emit('match-by-table-fetched', { error: error.message });
            }
        });

        // Fetch all decklists for a tournament (for debugging/exploration)
        socket.on('fetch-decklists', async ({ tournamentId }) => {
            try {
                const decklists = await fetchMeleeDecklists(tournamentId);
                socket.emit('decklists-fetched', { decklists });
            } catch (error) {
                socket.emit('decklists-fetched', { error: error.message });
            }
        });

        // Fetch pairings for a round (for debugging/exploration)
        socket.on('fetch-pairings', async ({ tournamentId, roundNumber }) => {
            try {
                const pairings = await fetchMeleePairings(tournamentId, roundNumber);
                socket.emit('pairings-fetched', { pairings });
            } catch (error) {
                socket.emit('pairings-fetched', { error: error.message });
            }
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
}
