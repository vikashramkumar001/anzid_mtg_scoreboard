// public/js/master-control/roster.js
// Editor UI for the player roster sub-section of the Archetypes tab.
// Mirrors public/js/master-control/archetypes.js 1:1 so anyone who
// already knows the archetype editor can operate this without retraining.
// Data shape: [{ name, portraitUrl }]. Upload endpoint: POST /upload-player-portrait.

export function initRoster(socket) {

    const playerRosterList = document.getElementById('playerRosterList');
    const addPlayerForm = document.getElementById('addPlayerForm');
    const newPlayerInput = document.getElementById('newPlayerInput');

    // Gracefully no-op if the roster markup isn't in the DOM (e.g. a
    // future master-control variant that omits the Archetypes tab).
    if (!playerRosterList || !addPlayerForm || !newPlayerInput) {
        console.warn('[Roster] markup missing — initRoster() aborted.');
        return;
    }

    // Render the roster list with portrait preview + upload/delete buttons.
    function renderPlayerRoster(players) {
        playerRosterList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.className = 'list-group-item archetype-item';

            if (player.portraitUrl) {
                const img = document.createElement('img');
                const cacheBuster = new Date().getTime();
                img.className = 'archetype-image-preview';
                img.src = player.portraitUrl + '?v=' + cacheBuster;
                img.alt = player.name;
                li.appendChild(img);
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'archetype-name';
            nameSpan.textContent = player.name;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'archetype-actions';

            const uploadLabel = document.createElement('label');
            uploadLabel.className = 'btn btn-secondary btn-sm';
            uploadLabel.textContent = player.portraitUrl ? 'Change Portrait' : 'Upload Portrait';

            const uploadInput = document.createElement('input');
            uploadInput.type = 'file';
            uploadInput.accept = 'image/*';
            uploadInput.style.display = 'none';
            uploadInput.addEventListener('change', (e) => uploadPlayerPortrait(player.name, e.target.files[0]));

            uploadLabel.appendChild(uploadInput);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-danger btn-sm';
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deletePlayer(player.name);

            actionsDiv.appendChild(uploadLabel);
            actionsDiv.appendChild(deleteButton);

            li.appendChild(nameSpan);
            li.appendChild(actionsDiv);

            playerRosterList.appendChild(li);
        });
    }

    // Multipart POST to /upload-player-portrait. The server slugifies
    // `playerName` to derive the on-disk filename, then patches the matching
    // roster entry's portraitUrl and persists the JSON.
    function uploadPlayerPortrait(playerName, file) {
        const formData = new FormData();
        formData.append('playerName', playerName);
        formData.append('portrait', file);

        fetch('/upload-player-portrait', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Portrait uploaded successfully');
                    // Re-request so the UI shows the new image (and every
                    // other open master-control tab syncs via the broadcast).
                    socket.emit('getPlayerRoster');
                } else {
                    console.error('Failed to upload portrait:', data.message);
                    alert('Failed to upload portrait: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error uploading portrait:', error);
                alert('Error uploading portrait. Please try again.');
            });
    }

    function deletePlayer(playerName) {
        socket.emit('deletePlayer', playerName);
    }

    function addPlayers(playerNames) {
        // Strip anything already in the roster so the server-side dedupe
        // doesn't silently swallow the add + broadcast nothing.
        const newPlayerNames = playerNames.filter(name =>
            !currentPlayerRoster.some(p => p.name === name)
        );
        if (newPlayerNames.length > 0) {
            socket.emit('addPlayers', newPlayerNames);
        }
    }

    let currentPlayerRoster = [];

    addPlayerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = newPlayerInput.value.trim();
        if (input) {
            // Same bulk-add ergonomics as the archetype form: comma or newline separated.
            const playerNames = [...new Set(
                input.split(/[,\n]+/).map(name => name.trim()).filter(name => name !== '')
            )];
            addPlayers(playerNames);
            newPlayerInput.value = '';
        }
    });

    socket.on('playerRosterUpdated', (players) => {
        currentPlayerRoster = players;
        renderPlayerRoster(players);
    });

    // Kick off the initial fetch.
    socket.emit('getPlayerRoster');
}
