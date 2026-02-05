export function initTournamentPlatform(socket) {
    const platformSelect = document.getElementById('tournament-platform-select');
    const tournamentIdInput = document.getElementById('tournament-id-input');
    const saveButton = document.getElementById('tournament-platform-save');

    // Request current platform config on load
    socket.emit('get-tournament-platform');

    // Handle platform config response
    socket.on('tournament-platform-config', (config) => {
        if (config.platform) {
            platformSelect.value = config.platform;
        }
        if (config.tournamentId) {
            tournamentIdInput.value = config.tournamentId;
        }
        updateAllFetchButtons(config.platform);
    });

    // Update all fetch buttons state based on platform
    function updateAllFetchButtons(platform) {
        const fetchButtons = document.querySelectorAll('.fetch-standings-btn');
        fetchButtons.forEach(btn => {
            if (platform === 'manual') {
                btn.disabled = true;
                btn.title = 'Select a platform in Global Settings to fetch standings';
            } else {
                btn.disabled = false;
                btn.title = 'Fetch standings from ' + platform;
            }
        });

    }

    // Platform select change handler
    platformSelect.addEventListener('change', () => {
        updateAllFetchButtons(platformSelect.value);
    });

    // Save button handler
    saveButton.addEventListener('click', () => {
        const config = {
            platform: platformSelect.value,
            tournamentId: tournamentIdInput.value.trim()
        };
        socket.emit('set-tournament-platform', config);
        updateAllFetchButtons(config.platform);
    });

    // Delegate click handler for fetch standings buttons (since they're dynamically created)
    document.addEventListener('click', async (e) => {
        if (!e.target.classList.contains('fetch-standings-btn')) return;

        const button = e.target;
        const roundId = button.dataset.roundId;
        const platform = platformSelect.value;
        const tournamentId = tournamentIdInput.value.trim();

        if (platform === 'manual') {
            alert('Please select a platform (Melee.gg or TopDeck.gg) in Global Settings to fetch standings.');
            return;
        }

        if (!tournamentId) {
            alert('Please enter a tournament ID in Global Settings.');
            return;
        }

        // Show loading state
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Fetching...';

        // Store the target round ID for when results come back
        button.dataset.fetching = 'true';

        // Emit fetch request
        socket.emit('fetch-tournament-standings', { platform, tournamentId, roundId });
    });

    // Handle fetch standings response
    socket.on('tournament-standings-fetched', (result) => {
        // Find the button that was fetching and reset it
        const fetchingButton = document.querySelector('.fetch-standings-btn[data-fetching="true"]');
        if (fetchingButton) {
            fetchingButton.disabled = false;
            fetchingButton.textContent = 'Fetch Standings';
            delete fetchingButton.dataset.fetching;

            const roundId = fetchingButton.dataset.roundId;
            const standingsTextarea = document.getElementById(`standings-${roundId}`);

            if (result.error) {
                alert('Error fetching standings: ' + result.error);
                return;
            }

            if (result.standings && standingsTextarea) {
                // Convert normalized standings to text format for the textarea
                const textLines = [];
                Object.keys(result.standings)
                    .map(k => parseInt(k))
                    .sort((a, b) => a - b)
                    .forEach(rank => {
                        const player = result.standings[rank];
                        if (player.rank && player.name) {
                            textLines.push(rank.toString());
                            textLines.push(player.name);
                            textLines.push(player.archetype || '');
                            textLines.push(player.record || '0-0-0');
                        }
                    });

                // Populate the standings textarea
                standingsTextarea.value = textLines.join('\n');

                // Trigger input event to save the data
                standingsTextarea.dispatchEvent(new Event('input', { bubbles: true }));

                alert('Standings fetched successfully! Use the Broadcast button to send to displays.');
            }
        }
    });

    // Update fetch buttons when rounds are created (use MutationObserver)
    const observer = new MutationObserver(() => {
        updateAllFetchButtons(platformSelect.value);
    });

    // Start observing when the round tabs content area exists
    const roundTabsContent = document.getElementById('roundTabsContent');
    if (roundTabsContent) {
        observer.observe(roundTabsContent, { childList: true, subtree: true });
    }
}
