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
    const fetchCardeioSection = document.getElementById('fetch-cardeio-section');

    function updateFetchDecklistsVisibility(platform) {
        if (fetchCardeioSection) {
            fetchCardeioSection.style.display = platform === 'cardeio' ? 'block' : 'none';
        }
    }

    // Track results from both fetches
    let eventDataResults = { decklists: null, registrations: null, eventDetail: null };

    function checkEventDataComplete() {
        const { decklists, registrations, eventDetail } = eventDataResults;
        if (decklists === null || registrations === null || eventDetail === null) return; // still waiting

        if (fetchEventDataBtn) {
            fetchEventDataBtn.disabled = false;
            fetchEventDataBtn.textContent = 'Fetch Event Data';
        }

        const parts = [];
        if (!decklists.skipped) {
            if (decklists.success) parts.push(`Decklists: ${decklists.count} fetched`);
            else parts.push(`Decklists error: ${decklists.error}`);
        }
        if (!registrations.skipped) {
            if (registrations.success) parts.push(`Registrations: ${registrations.count} fetched`);
            else parts.push(`Registrations error: ${registrations.error}`);
        }
        if (!eventDetail.skipped) {
            if (eventDetail.success) parts.push(`Rounds: ${Object.keys(eventDetail.roundMap).length} mapped`);
            else parts.push(`Event detail error: ${eventDetail.error}`);
        }

        if (parts.length > 0) alert(parts.join('\n'));
        eventDataResults = { decklists: null, registrations: null, eventDetail: null };
    }

    if (fetchEventDataBtn) {
        fetchEventDataBtn.addEventListener('click', () => {
            const eventId = tournamentIdInput.value.trim();
            if (!eventId) {
                alert('Please enter an event ID in the Tournament ID field.');
                return;
            }
            const fetchDecklists = document.getElementById('fetch-opt-decklists')?.checked;
            const fetchRegistrations = document.getElementById('fetch-opt-registrations')?.checked;
            const fetchRounds = document.getElementById('fetch-opt-rounds')?.checked;

            if (!fetchDecklists && !fetchRegistrations && !fetchRounds) {
                alert('Please select at least one option to fetch.');
                return;
            }

            fetchEventDataBtn.disabled = true;
            fetchEventDataBtn.textContent = 'Fetching...';
            eventDataResults = {
                decklists: fetchDecklists ? null : { skipped: true },
                registrations: fetchRegistrations ? null : { skipped: true },
                eventDetail: fetchRounds ? null : { skipped: true }
            };
            if (fetchDecklists) socket.emit('fetch-cardeio-decklists', { eventId });
            if (fetchRegistrations) socket.emit('fetch-cardeio-registrations', { eventId, gameSlug: 'riftbound' });
            if (fetchRounds) socket.emit('fetch-cardeio-event-detail', { eventId });
            checkEventDataComplete();
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
        }
        eventDataResults.eventDetail = result;
        checkEventDataComplete();
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

        // FQ 2v2 round-ID decoupling: the broadcast-side round advances twice
        // as fast as the platform round (4 matches per Melee round, only 2
        // played concurrently — one per group). So the internal round ID
        // isn't a valid index into the platform. If the operator has typed a
        // value into any `.fetch-round-input` (either the global one or a
        // per-round one, they mirror each other), use that as the roundId we
        // send to the platform. The button's own data-round-id stays the
        // internal round — the response handler uses it to locate the right
        // textarea, so don't mutate it.
        const is2v2Flyquest =
            document.body.dataset.vendor === 'flyquest' &&
            document.body.dataset.playerCount === '2v2';
        const override = document.querySelector('.fetch-round-input')?.value?.trim();
        const fetchRoundId = (is2v2Flyquest && override) ? override : roundId;

        // Emit fetch request
        socket.emit('fetch-tournament-standings', { platform, tournamentId, roundId: fetchRoundId });
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
                // FlyQuest 2v2 uses a different textarea shape — 4 lines per
                // entry as rank / player1 / player2 / record. The 2v2 parser
                // (features/standings.js:parseStandingsRawData2v2) reads this
                // format and keeps player1/player2 separate for captain
                // portrait + thumb lookup on the combined broadcast page.
                // For every other vendor/count we stay on the long-standing
                // rank / name / archetype / record format.
                const is2v2Flyquest =
                    document.body.dataset.vendor === 'flyquest' &&
                    document.body.dataset.playerCount === '2v2';

                const textLines = [];
                Object.keys(result.standings)
                    .map(k => parseInt(k))
                    .sort((a, b) => a - b)
                    .forEach(rank => {
                        const player = result.standings[rank];
                        if (!player.rank || !player.name) return;

                        if (is2v2Flyquest) {
                            // normalizeStandings already populates player1/player2
                            // for 2v2 payloads (features/tournament-platforms.js).
                            // Fall back to splitting `name` on the first space
                            // if an older payload reaches us without the pair.
                            let p1 = player.player1 || '';
                            let p2 = player.player2 || '';
                            if (!p1 && !p2 && player.name) {
                                const parts = player.name.split(' ');
                                p1 = parts[0] || '';
                                p2 = parts.slice(1).join(' ');
                            }
                            textLines.push(rank.toString());
                            textLines.push(p1);
                            textLines.push(p2);
                            // Fallback to W-L form (no draws segment) to match
                            // the server's new record convention — draws are
                            // only rendered when > 0. Using '0-0-0' here would
                            // leak a stale 3-segment record into the textarea
                            // for rows the platform hasn't produced data for.
                            textLines.push(player.record || '0-0');
                        } else {
                            textLines.push(rank.toString());
                            textLines.push(player.name);
                            textLines.push(player.archetype || '');
                            textLines.push(player.record || '0-0');
                        }
                    });

                // Populate the standings textarea
                standingsTextarea.value = textLines.join('\n');

                // Trigger input event to save the data
                standingsTextarea.dispatchEvent(new Event('input', { bubbles: true }));

                // FQ 2v2: also mirror the fetched W/L/D into the manual
                // override panel so the operator can make minute tweaks
                // (e.g. Melee hasn't registered the last match yet) and
                // click "Update Standings" to rewrite the textarea with
                // the corrected values. Without this the panel would stay
                // blank after a fetch and the operator would have to
                // retype every row to adjust a single number.
                if (is2v2Flyquest) {
                    populateOverridePanelFromFetch(roundId, result.standings);
                }

                // Best of Legend refresh (riftbound only) — recompute the
                // per-round legend leaderboard from the freshly-fetched
                // standings. The server's `get-best-of-legend` handler
                // reads standings JSON fresh from disk and joins against
                // cached decklists, so we fire it AFTER the textarea's
                // input event above (which saves the new standings to
                // disk via the existing standings-save handler). Result:
                // operator clicks Fetch Standings once, gets both the
                // standings + the updated BoL cards for every round.
                // Gated on game=riftbound because BoL is riftbound-only
                // (the cards themselves are hidden via .riftbound-only
                // CSS for other games, but emitting needlessly would
                // still hit the server).
                if (document.body.dataset.game === 'riftbound') {
                    socket.emit('get-best-of-legend');
                }

                alert('Standings fetched successfully! Use the Broadcast button to send to displays.');
            }
        }
    });

    // FQ 2v2: after a successful fetch, mirror each team's record into the
    // override panel W/L/D inputs for that round. Case-insensitive match
    // against the `data-team-name` each panel row was rendered with (which
    // itself came from groupAssignment.json entries). Unmatched rows are
    // left alone, not zeroed, so a partial-roster fetch doesn't nuke
    // previously-typed corrections.
    function populateOverridePanelFromFetch(roundId, standings) {
        const panel = document.getElementById(`override-panel-${roundId}`);
        if (!panel) return;

        // Build a lowercase-name → record lookup from the normalized fetch.
        const byName = {};
        Object.values(standings).forEach(row => {
            if (row && row.name) {
                byName[row.name.toLowerCase().trim()] = row.record || '';
            }
        });

        // Parse a record string like "6-1-0", "6-1", or "" into {w, l, d}.
        // TopDeck sometimes omits draws in the string ("6-1"), in which case
        // d defaults to 0.
        function parseRecord(rec) {
            if (typeof rec !== 'string' || !rec.trim()) return { w: 0, l: 0, d: 0 };
            const parts = rec.split('-').map(p => parseInt(p, 10));
            return {
                w: Number.isFinite(parts[0]) ? parts[0] : 0,
                l: Number.isFinite(parts[1]) ? parts[1] : 0,
                d: Number.isFinite(parts[2]) ? parts[2] : 0,
            };
        }

        const unmatched = [];
        panel.querySelectorAll('.override-row').forEach(row => {
            const teamName = (row.dataset.teamName || '').toLowerCase().trim();
            if (!teamName) return;
            const rec = byName[teamName];
            if (rec === undefined) {
                // No match in fetched standings → leave the row alone (don't
                // zero it out, operator may have typed a correction), but
                // surface it so typos in groupAssignment.json vs. the Melee
                // player list don't go silently unmatched round after round.
                unmatched.push(row.dataset.teamName);
                return;
            }
            const { w, l, d } = parseRecord(rec);
            const wEl = row.querySelector('.override-w');
            const lEl = row.querySelector('.override-l');
            const dEl = row.querySelector('.override-d');
            if (wEl) wEl.value = w;
            if (lEl) lEl.value = l;
            if (dEl) dEl.value = d;
        });

        if (unmatched.length > 0) {
            console.warn(
                `[override-panel] Round ${roundId}: no standings match for ` +
                `${unmatched.length} team(s): ${unmatched.join(', ')}. ` +
                `Check groupAssignment.json team names against platform player names.`
            );
        }
    }

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
