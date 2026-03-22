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
        if (config.cardeioRoundMap) {
            window.cardeioRoundMap = config.cardeioRoundMap;
            updateRoundTabIndicators(config.platform);
        }
        updateAllFetchButtons(config.platform);
        updateFetchDecklistsVisibility(config.platform);
    });

    // Fetch Event Data button (Carde only) — fetches decklists + registrations
    const fetchEventDataBtn = document.getElementById('fetch-cardeio-decklists-btn');

    function updateFetchDecklistsVisibility(platform) {
        if (fetchEventDataBtn) {
            fetchEventDataBtn.style.display = platform === 'cardeio' ? 'inline-block' : 'none';
        }
    }

    // Track results from both fetches
    let eventDataResults = { decklists: null, registrations: null };

    function checkEventDataComplete() {
        const { decklists, registrations } = eventDataResults;
        if (decklists === null || registrations === null) return; // still waiting

        if (fetchEventDataBtn) {
            fetchEventDataBtn.disabled = false;
            fetchEventDataBtn.textContent = 'Fetch Event Data';
        }

        const parts = [];
        if (decklists.success) parts.push(`Decklists: ${decklists.count} cached`);
        else parts.push(`Decklists error: ${decklists.error}`);
        if (registrations.success) parts.push(`Registrations: ${registrations.count} cached`);
        else parts.push(`Registrations error: ${registrations.error}`);

        alert(parts.join('\n'));
        eventDataResults = { decklists: null, registrations: null };
    }

    if (fetchEventDataBtn) {
        fetchEventDataBtn.addEventListener('click', () => {
            const eventId = tournamentIdInput.value.trim();
            if (!eventId) {
                alert('Please enter an event ID in the Tournament ID field.');
                return;
            }
            fetchEventDataBtn.disabled = true;
            fetchEventDataBtn.textContent = 'Fetching...';
            eventDataResults = { decklists: null, registrations: null };
            socket.emit('fetch-cardeio-decklists', { eventId });
            socket.emit('fetch-cardeio-registrations', { eventId, gameSlug: 'riftbound' });
        });
    }

    socket.on('cardeio-decklists-fetched', (result) => {
        eventDataResults.decklists = result;
        checkEventDataComplete();
    });

    socket.on('cardeio-registrations-fetched', (result) => {
        eventDataResults.registrations = result;
        checkEventDataComplete();
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
        updateFetchDecklistsVisibility(platformSelect.value);
    });

    // Save button handler
    saveButton.addEventListener('click', () => {
        const config = {
            platform: platformSelect.value,
            tournamentId: tournamentIdInput.value.trim()
        };
        socket.emit('set-tournament-platform', config);
        updateAllFetchButtons(config.platform);
        updateFetchDecklistsVisibility(config.platform);

        // Auto-fetch event detail (round IDs) for carde.io
        if (config.platform === 'cardeio' && config.tournamentId) {
            socket.emit('fetch-cardeio-event-detail', { eventId: config.tournamentId });
        }
    });

    // Handle event detail response (round ID mapping)
    socket.on('cardeio-event-detail-fetched', (result) => {
        if (result.success && result.roundMap) {
            window.cardeioRoundMap = result.roundMap;
            const count = Object.keys(result.roundMap).length;
            console.log(`[Carde] Round map loaded: ${count} rounds`);
            updateRoundTabIndicators(platformSelect.value);
        } else {
            console.error('[Carde] Failed to fetch event detail:', result.error);
            alert('Failed to fetch event round IDs: ' + (result.error || 'Unknown error'));
        }
    });

    // Update round tab indicators to show which rounds have a mapped carde.io round ID
    function updateRoundTabIndicators(platform) {
        const roundTabs = document.querySelectorAll('#roundTabs .nav-link');
        roundTabs.forEach(tab => {
            // Remove existing indicator
            const existing = tab.querySelector('.round-mapped-indicator');
            if (existing) existing.remove();

            if (platform !== 'cardeio' || !window.cardeioRoundMap) return;

            // Extract round number from tab id (e.g., "round-1-tab" → "1")
            const match = tab.id?.match(/^round-(\d+)-tab$/);
            if (!match) return;
            const roundNumber = match[1];

            if (window.cardeioRoundMap[roundNumber]) {
                const indicator = document.createElement('span');
                indicator.className = 'round-mapped-indicator';
                indicator.title = `Carde Round ID: ${window.cardeioRoundMap[roundNumber]}`;
                indicator.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:#28a745;margin-left:6px;vertical-align:middle;';
                tab.appendChild(indicator);
            }
        });
    }

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
