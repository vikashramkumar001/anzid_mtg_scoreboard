export function initGameSelection(socket) {
    const gameSelect = document.querySelector('#global-game-selection');
    const vendorSelect = document.querySelector('#global-vendor-selection');
    const playerCountSelect = document.querySelector('#global-player-count');
    const vc = window.VENDOR_CONFIG;

    // --- Populate vendor dropdown for a given game ---
    function populateVendorDropdown(game) {
        const vendors = vc.getVendorsForGame(game);
        vendorSelect.innerHTML = '';
        vendors.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.value;
            opt.textContent = v.label;
            vendorSelect.appendChild(opt);
        });
    }

    // --- Populate player count dropdown ---
    function populatePlayerCountDropdown() {
        playerCountSelect.innerHTML = '';
        vc.playerCounts.forEach(pc => {
            const opt = document.createElement('option');
            opt.value = pc.value;
            opt.textContent = pc.label;
            playerCountSelect.appendChild(opt);
        });
    }

    // --- Game selection change ---
    gameSelect.addEventListener('change', () => {
        const selectedGame = gameSelect.value.toLowerCase();
        console.log('Game selected:', selectedGame);

        socket.emit('update-game-selection', {
            gameSelection: selectedGame
        });

        // Reset vendor to default when game changes
        populateVendorDropdown(selectedGame);
        vendorSelect.value = 'default';
        socket.emit('update-vendor-selection', {
            vendorSelection: 'default'
        });
    });

    // --- Vendor selection change ---
    vendorSelect.addEventListener('change', () => {
        const selectedVendor = vendorSelect.value.toLowerCase();
        console.log('Vendor selected:', selectedVendor);

        socket.emit('update-vendor-selection', {
            vendorSelection: selectedVendor
        });
    });

    // --- Player count change ---
    playerCountSelect.addEventListener('change', () => {
        const selectedPlayerCount = playerCountSelect.value.toLowerCase();
        console.log('Player count selected:', selectedPlayerCount);

        socket.emit('update-player-count', {
            playerCount: selectedPlayerCount
        });
    });

    // --- Server initial state ---
    socket.on('server-current-game-selection', ({gameSelection}) => {
        console.log('Initial game selection received from server:', gameSelection);
        gameSelect.value = gameSelection?.toLowerCase();
        populateVendorDropdown(gameSelection);
    });

    socket.on('server-current-vendor-selection', ({vendorSelection}) => {
        console.log('Initial vendor selection received from server:', vendorSelection);
        vendorSelect.value = vendorSelection?.toLowerCase();
    });

    socket.on('server-current-player-count', ({playerCount}) => {
        console.log('Initial player count received from server:', playerCount);
        playerCountSelect.value = playerCount?.toLowerCase();
    });

    // --- Initialize ---
    populatePlayerCountDropdown();
    socket.emit('get-game-selection');
    socket.emit('get-vendor-selection');
    socket.emit('get-player-count');
}
