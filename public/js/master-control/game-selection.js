export function initGameSelection(socket) {
    const gameSelect = document.querySelector('#global-game-selection');

    function attachGameSelectionChangeListener() {
        gameSelect.addEventListener('change', () => {
            const selectedGame = gameSelect.value;
            console.log('Game selected:', selectedGame);

            socket.emit('update-game-selection', {
                gameSelection: selectedGame.toLowerCase()
            });
        });
    }

    // Set the dropdown value once on init
    socket.on('server-current-game-selection', ({gameSelection}) => {
        console.log('Initial game selection received from server:', gameSelection);
        gameSelect.value = gameSelection?.toLowerCase();
    });

    attachGameSelectionChangeListener();

    // Initial fetch
    socket.emit('get-game-selection');
}
