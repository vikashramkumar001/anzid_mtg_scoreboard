// Room utilities for server-side room management
export class RoomUtils {
    /**
     * Emit event to a specific room
     * @param {Object} io - Socket.IO server instance
     * @param {string} roomName - Name of the room
     * @param {string} eventName - Name of the event
     * @param {any} data - Data to send
     */
    static emitToRoom(io, roomName, eventName, data) {
        io.to(roomName).emit(eventName, data);
        // console.log(`[ROOM] Emitted ${eventName} to room: ${roomName}`);
    }
    
    /**
     * Emit event to multiple rooms
     * @param {Object} io - Socket.IO server instance
     * @param {string[]} roomNames - Array of room names
     * @param {string} eventName - Name of the event
     * @param {any} data - Data to send
     */
    static emitToMultipleRooms(io, roomNames, eventName, data) {
        roomNames.forEach(roomName => {
            this.emitToRoom(io, roomName, eventName, data);
        });
    }
    
    /**
     * Emit event to all clients (global broadcast)
     * @param {Object} io - Socket.IO server instance
     * @param {string} eventName - Name of the event
     * @param {any} data - Data to send
     */
    static emitToGlobal(io, eventName, data) {
        io.emit(eventName, data);
        // console.log(`[ROOM] Emitted ${eventName} to all clients (global)`);
    }
    
    /**
     * Get rooms for a specific event
     * @param {string} eventName - Name of the event
     * @returns {string[]} Array of room names
     */
    static getRoomsForEvent(eventName) {
        const eventRoomMapping = {
            // Control events
            'control-data-updated': ['master-control', 'control-1', 'control-2', 'control-3', 'control-4', 'scoreboard-1', 'scoreboard-2', 'scoreboard-3', 'scoreboard-4'],
            'field-updated': ['master-control'],  // NEW granular update event
            'master-control-matches-updated': ['master-control', 'control-1', 'control-2', 'control-3', 'control-4', 'scoreboard-1', 'scoreboard-2', 'scoreboard-3', 'scoreboard-4'],
            'control-mapping-update': ['master-control', 'control-1', 'control-2', 'control-3', 'control-4'],
            'control-broadcast-trackers': ['master-control'],
            'control-1-saved-state': ['control-1', 'scoreboard-1'],
            'control-2-saved-state': ['control-2', 'scoreboard-2'],
            'control-3-saved-state': ['control-3', 'scoreboard-3'],
            'control-4-saved-state': ['control-4', 'scoreboard-4'],
            'scoreboard-1-saved-state': ['scoreboard-1'],
            'scoreboard-2-saved-state': ['scoreboard-2'],
            'scoreboard-3-saved-state': ['scoreboard-3'],
            'scoreboard-4-saved-state': ['scoreboard-4'],
            
            // Timer events
            'update-timer-state': ['master-control', 'control-1', 'control-2', 'control-3', 'control-4', 'timer-1', 'timer-2', 'timer-3', 'timer-4', 'scoreboard-1', 'scoreboard-2', 'scoreboard-3', 'scoreboard-4'],
            'current-all-timer-states': ['master-control', 'control-1', 'control-2', 'control-3', 'control-4', 'timer-1', 'timer-2', 'timer-3', 'timer-4', 'scoreboard-1', 'scoreboard-2', 'scoreboard-3', 'scoreboard-4'],
            
            // Card view events
            'mtg-card-list-data': ['mtg-card-view', 'master-control'],
            'card-view-card-selected': ['mtg-card-view'],
            'vibes-card-list-data': ['vibes-card-view', 'master-control'],
            'vibes-card-view-card-selected': ['vibes-card-view'],
            'riftbound-card-list-data': ['riftbound-card-view', 'master-control'],
            'riftbound-card-view-card-selected': ['riftbound-card-view'],
            'starwars-card-view-card-selected': ['starwars-card-view'],
            
            // Deck events
            'deck-display-update': ['deck-display'],
            'vibes-deck-data-from-server': ['vibes-deck-display'],
            'riftbound-deck-data-from-server': ['riftbound-deck-display'],
            'transformed-main-deck-data': ['broadcast-main-deck'],
            'transformed-side-deck-data': ['broadcast-side-deck', 'broadcast-main-deck'],
            
            // Standings events
            'standings-data': ['master-control', 'standings', 'broadcast-standings'],
            'standings-updated': ['master-control', 'standings', 'broadcast-standings'],
            'broadcast-round-standings-data': ['broadcast-standings'],
            
            // Bracket events
            'bracket-data': ['master-control', 'brackets'],
            'bracket-updated': ['master-control', 'brackets'],
            
            // Meta breakdown events
            'receive-meta-breakdown-data': ['meta-breakdown'],
            
            // Broadcast events
            'broadcast-round-data': ['broadcast-details', 'broadcast-main-deck', 'broadcast-side-deck', 'broadcast-standings', 'riftbound-animation-display-1', 'riftbound-animation-display-2', 'riftbound-animation-display-3', 'riftbound-animation-display-4'],
            
            // Overlay events
            'overlayHeaderBackgroundUpdate': ['global'],
            'overlayFooterBackgroundUpdate': ['global'],
            
            // Global events (need to go to all rooms)
            'archetypeListUpdated': ['global'],
            'server-current-game-selection': ['global'],
            'game-selection-updated': ['global'],
            'update-match-global-data': ['global'],
            'scoreboard-state-data': ['master-control', 'scoreboard-1', 'scoreboard-2', 'scoreboard-3', 'scoreboard-4']
        };
        
        return eventRoomMapping[eventName] || ['global'];
    }
    
    /**
     * Emit event using room mapping
     * @param {Object} io - Socket.IO server instance
     * @param {string} eventName - Name of the event
     * @param {any} data - Data to send
     */
    static emitWithRoomMapping(io, eventName, data) {
        const rooms = this.getRoomsForEvent(eventName);
        
        if (rooms.includes('global')) {
            this.emitToGlobal(io, eventName, data);
        } else {
            this.emitToMultipleRooms(io, rooms, eventName, data);
        }
    }
    
    /**
     * Get room name for a specific page
     * @param {string} pagePath - Path of the page
     * @param {Object} params - URL parameters
     * @returns {string} Room name
     */
    static getRoomForPage(pagePath, params = {}) {
        // Master control
        if (pagePath.includes('/master-control') || pagePath.includes('master-control.html')) return 'master-control';
        
        // Vibes master control
        if (pagePath.includes('/vibes-master-control') || pagePath.includes('vibes/master-control.html')) return 'master-control';
        
        // Control pages
        if (pagePath.includes('/control/')) {
            const match = pagePath.match(/\/control\/(\d+)/);
            const controlId = match ? match[1] : '1';
            return `control-${controlId}`;
        }
        
        // Scoreboard
        if (pagePath.includes('/scoreboard/')) {
            const match = pagePath.match(/\/scoreboard\/(\d+)/);
            const scoreboardId = match ? match[1] : '1';
            return `scoreboard-${scoreboardId}`;
        }
        if (pagePath.includes('scoreboard.html')) {
            const scoreboardId = params.scoreboard || '1';
            return `scoreboard-${scoreboardId}`;
        }
        
        // Timer
        if (pagePath.includes('/timer/')) {
            const match = pagePath.match(/\/timer\/(\d+)/);
            const timerId = match ? match[1] : '1';
            return `timer-${timerId}`;
        }
        if (pagePath.includes('timer.html')) {
            const timerId = params.timer || '1';
            return `timer-${timerId}`;
        }
        
        // Card views
        if (pagePath.includes('/vibes/display/card/view/')) return 'vibes-card-view';
        if (pagePath.includes('/riftbound/display/card/view/')) return 'riftbound-card-view';
        // Star Wars dedicated card view
        if (pagePath.includes('/starwars/display/card/view/')) return 'starwars-card-view';
        if (pagePath.includes('/display/card/view/')) return 'mtg-card-view';
        
        // Deck displays
        if (pagePath.includes('/vibes/display/main/deck/')) return 'vibes-deck-display';
        if (pagePath.includes('/riftbound/display/main/deck/')) return 'riftbound-deck-display';
        if (pagePath.includes('/deck-display') || pagePath.includes('deck-display.html')) return 'deck-display';
        if (pagePath.includes('/side-deck-display') || pagePath.includes('side-deck-display.html')) return 'deck-display';
        
        // Broadcast pages
        if (pagePath.includes('/broadcast/round/standings/')) return 'broadcast-standings';
        if (pagePath.includes('/broadcast/round/details/')) return 'broadcast-details';
        if (pagePath.includes('/broadcast/round/maindeck/')) return 'broadcast-main-deck';
        if (pagePath.includes('/broadcast/round/sidedeck/')) return 'broadcast-side-deck';
        
        // Bracket
        if (pagePath.includes('/display/bracket/details/') || pagePath.includes('bracket-individual-display.html')) return 'brackets';
        
        // Meta breakdown
        if (pagePath.includes('/meta/breakdown/') || pagePath.includes('meta-breakdown')) return 'meta-breakdown';
        
        // Update global details
        if (pagePath.includes('/update/global/details/') || pagePath.includes('update-global-details.html')) return 'global';
        
        // Fallback for HTML files
        if (pagePath.endsWith('control.html')) {
            const controlId = params.control || '1';
            return `control-${controlId}`;
        }
        
        return 'global';
    }
}

