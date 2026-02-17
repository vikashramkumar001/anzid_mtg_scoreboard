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
        
        // Control pages - check for /control/ in path
        if (path.includes('/control/')) {
            // Extract control ID from path (e.g., /control/1/1000)
            const match = path.match(/\/control\/(\d+)/);
            const controlId = match ? match[1] : '1';
            return `control-${controlId}`;
        }
        
        // Draftlist scoreboard - check before generic scoreboard
        if (path.includes('/broadcast/round/draftlist/scoreboard/')) return 'broadcast-draft-list';

        // Scoreboard - check for /scoreboard/ in path
        if (path.includes('/scoreboard/')) {
            // Extract control ID from path (e.g., /control/1/1000)
            const match = path.match(/\/scoreboard\/(\d+)/);
            const scoreboardId = match ? match[1] : '1';
            return `scoreboard-${scoreboardId}`;
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
        if (path.includes('/riftbound/display/main/deck/')) return 'riftbound-deck-display';
        if (path.includes('/deck-display') || path.endsWith('deck-display.html')) return 'deck-display';
        if (path.includes('/side-deck-display') || path.endsWith('side-deck-display.html')) return 'deck-display';
        
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
        if (path.includes('/meta/breakdown/') || path.includes('meta-breakdown')) return 'meta-breakdown';
        
        // Update global details
        if (path.includes('/update/global/details/') || path.includes('update-global-details.html')) return 'global';
        
        // Fallback for HTML files directly opened
        if (path.endsWith('master-control.html')) return 'master-control';
        if (path.endsWith('control.html')) {
            const controlId = params.get('control') || '1';
            return `control-${controlId}`;
        }
        if (path.endsWith('scoreboard.html')) {
            const scoreboardId = params.get('scoreboard') || '1';
            return `scoreboard-${scoreboardId}`;
        }
        if (path.endsWith('timer.html')) {
            const timerId = params.get('timer') || '1';
            return `timer-${timerId}`;
        }
        if (path.endsWith('dedicated-card-view.html')) {
            const game = params.get('game') || 'mtg';
            return `${game}-card-view`;
        }
        if (path.endsWith('deck-display.html')) {
            const game = params.get('game') || 'mtg';
            return `${game}-deck-display`;
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
            'riftbound-animation-display-1': ['riftbound-animation-display-1', 'scoreboard-1', 'global'],
            'riftbound-animation-display-2': ['riftbound-animation-display-2', 'scoreboard-2', 'global'],
            'riftbound-animation-display-3': ['riftbound-animation-display-3', 'scoreboard-3', 'global'],
            'riftbound-animation-display-4': ['riftbound-animation-display-4', 'scoreboard-4', 'global'],
            'broadcast-standings': ['broadcast-standings', 'global'],
            'broadcast-details': ['broadcast-details', 'global'],
            'broadcast-main-deck': ['broadcast-main-deck', 'global'],
            'broadcast-side-deck': ['broadcast-side-deck', 'global'],
            'broadcast-draft-list': ['broadcast-draft-list', 'global'],
            'brackets': ['brackets', 'global'],
            'meta-breakdown': ['meta-breakdown', 'global']
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

