// Room Manager - handles automatic room joining based on current page
class RoomManager {
    constructor(socket) {
        this.socket = socket;
        this.currentRooms = new Set();
        this.init();
    }
    
    init() {
        // Join rooms based on current page
        this.joinRoomsForCurrentPage();
        
        // Handle socket reconnection
        this.socket.on('connect', () => {
            console.log('[ROOM] Socket reconnected, rejoining rooms');
            this.joinRoomsForCurrentPage();
        });
        
        // Handle socket disconnect
        this.socket.on('disconnect', () => {
            console.log('[ROOM] Socket disconnected');
            this.currentRooms.clear();
        });
    }
    
    joinRoomsForCurrentPage() {
        const currentPage = this.getCurrentPage();
        const roomsToJoin = this.getRoomsForPage(currentPage);
        
        if (roomsToJoin.length > 0) {
            console.log(`[ROOM] Current page: ${currentPage}`);
            console.log(`[ROOM] Joining rooms:`, roomsToJoin);
        }
        
        roomsToJoin.forEach(room => {
            if (!this.currentRooms.has(room)) {
                this.socket.emit('join-room', room);
                this.currentRooms.add(room);
                console.log(`[ROOM] Joined room: ${room}`);
            }
        });
    }
    
    getCurrentPage() {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        
        // Handle different page types based on actual URL structure
        
        // Master control
        if (path.includes('/master-control') || path.endsWith('master-control.html')) return 'master-control';
        
        // Vibes master control
        if (path.includes('/vibes-master-control') || path.includes('vibes/master-control.html')) return 'master-control';
        
        // Admin control pages (/admin-control/N/delay) — join the SAME
        // control-{id} room as the regular control page so the admin board
        // is a co-equal control client for that match (receives the same
        // control-{id}-saved-state, and its field-updated reaches the
        // scoreboard + the control page + master-control). Checked BEFORE
        // the /control/ branch.
        if (path.includes('/admin-control/')) {
            const match = path.match(/\/admin-control\/(\d+)/);
            const controlId = match ? match[1] : '1';
            return `control-${controlId}`;
        }

        // Control pages - check for /control/ in path
        if (path.includes('/control/')) {
            // Extract control ID from path (e.g., /control/1/1000)
            const match = path.match(/\/control\/(\d+)/);
            const controlId = match ? match[1] : '1';
            return `control-${controlId}`;
        }
        
        // Draftlist scoreboard
        if (path.includes('/broadcast/round/draftlist/scoreboard/')) return 'broadcast-draft-list';

        // Broadcast scoreboard pages (/broadcast/round/scoreboard/matchN).
        // These are REPLAY views of whatever round is in broadcastTracker — so
        // they must only listen to the broadcast-scoreboard room (for the
        // gated broadcast-round-data event) plus global. They intentionally do
        // NOT join scoreboard-{N}, which carries live per-slot updates that
        // would clobber the replay. Check BEFORE the /scoreboard/ branch
        // since the broadcast URL also contains /scoreboard/.
        if (path.includes('/broadcast/round/scoreboard/')) {
            const m = path.match(/\/scoreboard\/match(\d+)/);
            const n = m ? m[1] : '1';
            return `broadcast-scoreboard-${n}`;
        }

        // Per-match scoreboard pages (/scoreboard/matchN/variant).
        if (path.includes('/scoreboard/')) {
            const m = path.match(/\/scoreboard\/match(\d+)/);
            const n = m ? m[1] : '1';
            return `scoreboard-${n}`;
        }

        // Event-info scenes — mostly image-only, but the dynamic
        // "battlefields" scene needs broadcast-round-data live updates.
        // Joining the dedicated 'event-info' room (added to the
        // broadcast-round-data emit list in utils/room-utils.js) gets us
        // those updates without coupling to broadcast-scoreboard's other
        // (irrelevant-to-us) traffic.
        if (path.includes('/event-info/')) return 'event-info';

        // VS PiP split-screen (broadcast-vs-pip.html?match=N) — mirrors the
        // match-N control data (names + battlefields), so it joins the same
        // scoreboard-{N} room the /scoreboard page uses (default match 1).
        if (path.includes('broadcast-vs-pip')) {
            const n = params.get('match') || '1';
            return `scoreboard-${n}`;
        }

        // Timer - check for /timer/ in path
        if (path.includes('/timer/')) {
            const match = path.match(/\/timer\/(\d+)/);
            const timerId = match ? match[1] : '1';
            return `timer-${timerId}`;
        }
        
        // Card views
        if (path.includes('/mtg/display/card/view/')) return 'mtg-card-view';
        if (path.includes('/vibes/display/card/view/')) return 'vibes-card-view';
        if (path.includes('/riftbound/display/card/view/')) return 'riftbound-card-view';
        if (path.includes('/starwars/display/card/view/')) return 'starwars-card-view';
        // Unified card view (no game prefix)
        if (path.includes('/display/card/view/')) return 'unified-card-view';
        
        // Deck displays
        if (path.includes('/vibes/display/main/deck/')) return 'vibes-deck-display';
        if (path.includes('/riftbound/display/main/deck/')) {
            const segs = path.split('/').filter(Boolean);
            if (segs.length >= 6) return 'riftbound-deck-display-broadcast'; // matchID + sideID format
            return 'riftbound-deck-display';
        }
        
        // Animation display - check for /riftbound/animation-display/ in path
        if (path.includes('/riftbound/animation-display/')) {
            const match = path.match(/\/riftbound\/animation-display\/[^/]+\/[^/]+\/(\d+)/);
            const animationId = match ? match[1] : '1';
            return `riftbound-animation-display-${animationId}`;
        }
        
        // Broadcast pages - new URL structure
        if (path.includes('/broadcast/round/standings')) return 'broadcast-standings';
        if (path.includes('/broadcast/round/details/')) return 'broadcast-details';
        if (path.includes('/broadcast/round/maindeck/')) return 'broadcast-main-deck';
        if (path.includes('/broadcast/round/sidedeck/')) return 'broadcast-side-deck';
        if (path.includes('/broadcast/round/draftlist/')) return 'broadcast-draft-list';

        // Bracket
        if (path.includes('/display/bracket/top8')) return 'brackets';
        if (path.includes('/display/bracket/details/') || path.includes('bracket-individual-display.html')) return 'brackets';
        
        // Meta breakdown
        if (path.includes('/meta/breakdown/') || path.includes('meta-breakdown') || path.includes('/broadcast/metagame')) return 'meta-breakdown';
        
        // Update global details
        if (path.includes('/update/global/details/') || path.includes('update-global-details.html')) return 'global';
        
        // Fallback for HTML files directly opened
        if (path.endsWith('master-control.html')) return 'master-control';
        if (path.endsWith('control.html')) {
            const controlId = params.get('control') || '1';
            return `control-${controlId}`;
        }
        if (path.endsWith('timer.html')) {
            const timerId = params.get('timer') || '1';
            return `timer-${timerId}`;
        }
        if (path.endsWith('dedicated-card-view.html')) {
            const game = params.get('game') || 'mtg';
            return `${game}-card-view`;
        }
        return 'global'; // Default to global instead of 'unknown'
    }
    
    getRoomsForPage(pageType) {
        const roomMapping = {
            'master-control': ['master-control', 'global'],
            'control-1': ['control-1', 'global'],
            'control-2': ['control-2', 'global'],
            'control-3': ['control-3', 'global'],
            'control-4': ['control-4', 'global'],
            'scoreboard-1': ['scoreboard-1', 'global'],
            'scoreboard-2': ['scoreboard-2', 'global'],
            'scoreboard-3': ['scoreboard-3', 'global'],
            'scoreboard-4': ['scoreboard-4', 'global'],
            // Broadcast scoreboard pages are REPLAY views gated by
            // broadcastTracker.round_id — they must NOT join scoreboard-{N},
            // which carries live per-slot data for whichever round is
            // currently playing. Keeping them isolated to broadcast-scoreboard
            // + global ensures the replay can't be clobbered by live updates.
            'broadcast-scoreboard-1': ['broadcast-scoreboard', 'global'],
            'broadcast-scoreboard-2': ['broadcast-scoreboard', 'global'],
            'broadcast-scoreboard-3': ['broadcast-scoreboard', 'global'],
            'broadcast-scoreboard-4': ['broadcast-scoreboard', 'global'],
            'timer-1': ['timer-1', 'global'],
            'timer-2': ['timer-2', 'global'],
            'timer-3': ['timer-3', 'global'],
            'timer-4': ['timer-4', 'global'],
            'mtg-card-view': ['mtg-card-view', 'global'],
            'vibes-card-view': ['vibes-card-view', 'global'],
            'riftbound-card-view': ['riftbound-card-view', 'global'],
            'starwars-card-view': ['starwars-card-view', 'global'],
            'unified-card-view': ['mtg-card-view', 'vibes-card-view', 'riftbound-card-view', 'starwars-card-view', 'global'],
            'mtg-deck-display': ['deck-display', 'global'],
            'vibes-deck-display': ['vibes-deck-display', 'global'],
            'riftbound-deck-display': ['riftbound-deck-display', 'global'],
            'riftbound-deck-display-broadcast': ['broadcast-main-deck', 'global'],
            'riftbound-animation-display-1': ['riftbound-animation-display-1', 'scoreboard-1', 'global'],
            'riftbound-animation-display-2': ['riftbound-animation-display-2', 'scoreboard-2', 'global'],
            'riftbound-animation-display-3': ['riftbound-animation-display-3', 'scoreboard-3', 'global'],
            'riftbound-animation-display-4': ['riftbound-animation-display-4', 'scoreboard-4', 'global'],
            'broadcast-standings': ['broadcast-standings', 'global'],
            'broadcast-details': ['broadcast-details', 'global'],
            'broadcast-main-deck': ['broadcast-main-deck', 'global'],
            'broadcast-side-deck': ['broadcast-side-deck', 'global'],
            'broadcast-draft-list': ['broadcast-draft-list', 'global'],
            'broadcast-scoreboard': ['broadcast-scoreboard', 'global'],
            'brackets': ['brackets', 'global'],
            'meta-breakdown': ['meta-breakdown', 'global'],
            // Event-info pages are PNG/MP4 image scenes only — no live
            // round data needed since the battlefields scene moved to
            // /scoreboard's L3 strip. The dedicated room is retained
            // (rather than collapsed to ['global']) so future scenes can
            // be wired without changing room-manager.
            'event-info': ['event-info', 'global']
        };
        
        return roomMapping[pageType] || ['global'];
    }
    
    leaveAllRooms() {
        this.currentRooms.forEach(room => {
            this.socket.emit('leave-room', room);
            console.log(`[ROOM] Left room: ${room}`);
        });
        this.currentRooms.clear();
    }
    
    // Method to manually join a room (for dynamic content)
    joinRoom(roomName) {
        if (!this.currentRooms.has(roomName)) {
            this.socket.emit('join-room', roomName);
            this.currentRooms.add(roomName);
            console.log(`[ROOM] Manually joined room: ${roomName}`);
        }
    }
    
    // Method to manually leave a room
    leaveRoom(roomName) {
        if (this.currentRooms.has(roomName)) {
            this.socket.emit('leave-room', roomName);
            this.currentRooms.delete(roomName);
            console.log(`[ROOM] Manually left room: ${roomName}`);
        }
    }
    
    // Get current rooms (for debugging)
    getCurrentRooms() {
        return Array.from(this.currentRooms);
    }
}

// Initialize room manager when socket is available
window.RoomManager = RoomManager;

