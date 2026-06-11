// public/js/master-control/roster.js
// Editor UI for the player roster sub-section of the Archetypes tab.
// Mirrors public/js/master-control/archetypes.js 1:1 so anyone who
// already knows the archetype editor can operate this without retraining.
// Data shape: [{ name, portraitUrl? }]. Upload endpoint: POST /upload-player-portrait.
//
// Preview thumbnails derive their src from the current selections — same
// convention as scoreboard.js / scoreboard-scene.js applyIcon():
//   /assets/images/{game}/shared/player-portraits/{vendor}-{count}/{slug}.png
// The roster JSON's `portraitUrl` field is no longer authoritative for
// display (kept on existing entries for backward-compat). Switching vendor
// in master-control swaps every preview in place via a re-render.

// Per-vendor portrait pool state. Synced from the server via the same six
// selection events scoreboard.js uses; defaults match the server's defaults
// in config/constants.js so the first paint before events arrive is sane.
let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';

// Cache-buster version for portrait <img src> URLs. Module-stable so swapping
// vendors or replaying selection-sync events reuses the same URL — browser
// cache hits, no 404 storm. Only bumped after a successful portrait upload
// (where the file at the same URL has actually changed) so the next render
// fetches the fresh bytes.
let portraitCacheVersion = Date.now();

// "Rob Stanley" → "rob-stanley". Matches the on-disk slug convention and
// is identical to the helper in scoreboard.js / scoreboard-scene.js.
function nameToSlug(name) {
    return (name || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function initRoster(socket) {

    const playerRosterList = document.getElementById('playerRosterList');
    const addPlayerForm = document.getElementById('addPlayerForm');
    const newPlayerInput = document.getElementById('newPlayerInput');
    const deleteAllBtn = document.getElementById('deleteAllPlayersBtn');

    // Gracefully no-op if the roster markup isn't in the DOM (e.g. a
    // future master-control variant that omits the Archetypes tab).
    if (!playerRosterList || !addPlayerForm || !newPlayerInput) {
        console.warn('[Roster] markup missing — initRoster() aborted.');
        return;
    }

    // Render-coalescing guard. Each Apply click in master-control fires up to
    // four events the roster cares about (game/vendor/count + playerRosterUpdated),
    // and they arrive back-to-back. Without this, every vendor flip rebuilt the
    // 18-item list 4 times — destroying and recreating the <img> elements each
    // time, which forced fresh HTTP fetches for every portrait (the static
    // server's `cache-control: max-age=0` defeats in-memory cache reuse for
    // recreated nodes). The signature is everything that affects DOM output.
    let lastRenderSig = null;

    // Render the roster list with portrait preview + upload/delete buttons.
    function renderPlayerRoster(players) {
        const sig = JSON.stringify({
            game: currentGame,
            vendor: currentVendor,
            count: currentPlayerCount,
            ver: portraitCacheVersion,
            names: players.map(p => p.name),
        });
        if (sig === lastRenderSig) return;
        lastRenderSig = sig;

        playerRosterList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.className = 'list-group-item archetype-item';

            // Derive preview src from current selections. Default vendor →
            // no preview (matches scoreboard's behavior — operators on the
            // default vendor don't have portrait pools). onerror hides the
            // <img> when the file doesn't exist for the current vendor so
            // mixed-vendor rosters don't show broken-image icons.
            if (currentVendor && currentVendor !== 'default') {
                const slug = nameToSlug(player.name);
                const url = `/assets/images/${currentGame}/shared/player-portraits/${currentVendor}-${currentPlayerCount}/${slug}.png?v=${portraitCacheVersion}`;
                const img = document.createElement('img');
                img.className = 'archetype-image-preview';
                img.alt = player.name;
                img.src = url;
                img.onerror = () => { img.style.display = 'none'; };
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
                    // Bump the cache version so the next render fetches the
                    // freshly-uploaded bytes instead of serving the cached
                    // (now stale) copy from the same URL.
                    portraitCacheVersion = Date.now();
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

    // "Delete All" — guarded by a confirm() so an accidental click can't wipe
    // the roster. Server (sockets/handlers.js clearPlayerRoster) is no-op-safe
    // when the roster is already empty.
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            if (!confirm('Delete the entire player roster? This cannot be undone.')) return;
            socket.emit('clearPlayerRoster');
        });
    }

    socket.on('playerRosterUpdated', (players) => {
        currentPlayerRoster = players;
        scheduleRender();
    });

    // Selection sync — six events, same pattern as scoreboard.js. Each one
    // updates the local cache + re-renders so preview thumbnails swap to the
    // new vendor's portrait pool. Initial three emits arm the server-current-*
    // replies for first-paint hydration.
    //
    // Renders are coalesced to the end of the current event loop tick because
    // the server emits game/vendor/count selection events separately (and
    // Apply often touches all three at once) — without this, every Apply
    // click triggered 3-4 renders, each with a transiently-wrong selection
    // state. That fired dozens of extra HTTP requests against the wrong
    // vendor's portrait folder (the static server's `cache-control: max-age=0`
    // defeats in-memory cache reuse for recreated <img> nodes, so each
    // redundant render is a full re-download).
    //
    // setTimeout(0) instead of requestAnimationFrame — rAF doesn't fire when
    // the tab is hidden, and master-control commonly sits in a backgrounded
    // tab while operators work elsewhere.
    let renderQueued = false;
    const scheduleRender = () => {
        if (renderQueued) return;
        renderQueued = true;
        setTimeout(() => {
            renderQueued = false;
            renderPlayerRoster(currentPlayerRoster);
        }, 0);
    };

    const reRender = () => {
        scheduleRender();
    };

    socket.on('server-current-game-selection', ({ gameSelection }) => {
        currentGame = gameSelection;
        reRender();
    });
    socket.on('game-selection-updated', ({ gameSelection }) => {
        currentGame = gameSelection;
        reRender();
    });
    socket.on('server-current-vendor-selection', ({ vendorSelection }) => {
        currentVendor = vendorSelection;
        reRender();
    });
    socket.on('vendor-selection-updated', ({ vendorSelection }) => {
        currentVendor = vendorSelection;
        reRender();
    });
    socket.on('server-current-player-count', ({ playerCount }) => {
        currentPlayerCount = playerCount;
        reRender();
    });
    socket.on('player-count-updated', ({ playerCount }) => {
        currentPlayerCount = playerCount;
        reRender();
    });

    // Kick off the initial fetches.
    socket.emit('getPlayerRoster');
    socket.emit('get-game-selection');
    socket.emit('get-vendor-selection');
    socket.emit('get-player-count');
}
