export function initGameSelection(socket) {
    const gameSelect = document.querySelector('#global-game-selection');
    const vendorSelect = document.querySelector('#global-vendor-selection');
    const playerCountSelect = document.querySelector('#global-player-count');
    const applyBtn = document.querySelector('#apply-broadcast-settings');
    const vc = window.VENDOR_CONFIG;

    // Tracks the last values the server confirmed. Dropdown values ≠ tracker = "dirty"
    // (staged but not committed). Apply-click emits only the events whose dropdown
    // diverges from this tracker, and the round-tripped `*-updated` events refresh it.
    const lastCommitted = { game: null, vendor: null, playerCount: null };

    // Mirror the committed selection onto <body data-*> attributes so CSS can
    // gate tab sub-sections by vendor/playerCount (e.g. the Config tab's
    // .fq-groups-section only shows for flyquest + 2v2). Called after every
    // server-confirmed update so the page reflects the actual broadcast state,
    // not the staged dropdown value.
    function syncBodyDataAttrs() {
        const body = document.body;
        if (lastCommitted.game)        body.dataset.game        = lastCommitted.game;
        if (lastCommitted.vendor)      body.dataset.vendor      = lastCommitted.vendor;
        if (lastCommitted.playerCount) body.dataset.playerCount = lastCommitted.playerCount;
    }

    // After a vendor/playerCount commit, clear the FQ-2v2-specific fetch round
    // inputs if we're no longer in FQ 2v2 mode. Otherwise a value typed during
    // a previous 2v2 session would get silently re-used when the operator
    // swings back to FQ 2v2, potentially sending a stale platform round to the
    // standings fetch. `.fetch-round-input` is hidden outside FQ 2v2 so the
    // operator never sees the stale value until it fires.
    function clearStaleFetchRoundInputs() {
        const body = document.body;
        const inFq2v2 =
            body.dataset.vendor === 'flyquest' &&
            body.dataset.playerCount === '2v2';
        if (inFq2v2) return;
        document.querySelectorAll('.fetch-round-input').forEach(el => {
            el.value = '';
        });
    }

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

    // --- Dirty-state reconciliation ---
    // Compares each dropdown to its lastCommitted counterpart, toggles classes
    // on the dropdowns + Apply button so the operator can see staged vs committed.
    function refreshDirtyState() {
        const gameDirty        = gameSelect.value.toLowerCase()        !== (lastCommitted.game        ?? '');
        const vendorDirty      = vendorSelect.value.toLowerCase()      !== (lastCommitted.vendor      ?? '');
        const playerCountDirty = playerCountSelect.value.toLowerCase() !== (lastCommitted.playerCount ?? '');

        gameSelect.classList.toggle('dropdown-dirty', gameDirty);
        vendorSelect.classList.toggle('dropdown-dirty', vendorDirty);
        playerCountSelect.classList.toggle('dropdown-dirty', playerCountDirty);

        const anyDirty = gameDirty || vendorDirty || playerCountDirty;
        if (applyBtn) {
            applyBtn.classList.toggle('is-dirty', anyDirty);
            applyBtn.classList.toggle('is-clean', !anyDirty);
        }
    }

    // --- Game selection change (local only — no emit until Apply) ---
    gameSelect.addEventListener('change', () => {
        const selectedGame = gameSelect.value.toLowerCase();
        console.log('Game staged:', selectedGame);

        // Vendor dropdown options depend on game → repopulate UI immediately so
        // the operator can pick a vendor from the new game's list before Apply.
        // This is local DOM only; no socket emit.
        populateVendorDropdown(selectedGame);
        vendorSelect.value = 'default';

        refreshDirtyState();
    });

    // --- Vendor selection change (local only) ---
    vendorSelect.addEventListener('change', () => {
        const selectedVendor = vendorSelect.value.toLowerCase();
        console.log('Vendor staged:', selectedVendor);
        refreshDirtyState();
    });

    // --- Player count change (local only) ---
    playerCountSelect.addEventListener('change', () => {
        const selectedPlayerCount = playerCountSelect.value.toLowerCase();
        console.log('Player count staged:', selectedPlayerCount);
        refreshDirtyState();
    });

    // --- Apply button: commit staged changes ---
    // Sole entry point to the three server selection setters. Emits only the
    // events whose dropdown value differs from lastCommitted; server broadcasts
    // *-updated back to all clients (including us) which refreshes lastCommitted
    // and clears the dirty state via the handlers below.
    //
    // Because the OBS preset key is game-vendor-playerCount, switching any of
    // them silently abandons unsaved OBS positioning for the CURRENT setup —
    // so a selection change first prompts: save the outgoing preset (Yes),
    // switch without saving (No), or abort the switch (Cancel).
    function buildObsSavePromptModal() {
        let modalEl = document.getElementById('obs-save-prompt-modal');
        if (modalEl) return modalEl;
        modalEl = document.createElement('div');
        modalEl.className = 'modal fade';
        modalEl.id = 'obs-save-prompt-modal';
        modalEl.tabIndex = -1;
        modalEl.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Save OBS settings first?</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p id="obs-save-prompt-text" class="mb-1"></p>
                        <p class="text-muted small mb-0">"Save &amp; Switch" writes the current OBS scene
                        positions to the outgoing preset so nothing is lost.</p>
                        <p id="obs-save-prompt-error" class="text-danger small mt-2 mb-0" style="display:none;"></p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-outline-warning" id="obs-prompt-skip">Switch Without Saving</button>
                        <button type="button" class="btn btn-primary" id="obs-prompt-save">Save &amp; Switch</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modalEl);
        return modalEl;
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const game        = gameSelect.value.toLowerCase();
            const vendor      = vendorSelect.value.toLowerCase();
            const playerCount = playerCountSelect.value.toLowerCase();

            const commit = () => {
                if (game        !== lastCommitted.game)        socket.emit('update-game-selection',   { gameSelection: game });
                if (vendor      !== lastCommitted.vendor)      socket.emit('update-vendor-selection', { vendorSelection: vendor });
                if (playerCount !== lastCommitted.playerCount) socket.emit('update-player-count',     { playerCount });
            };

            const changed = game !== lastCommitted.game
                || vendor !== lastCommitted.vendor
                || playerCount !== lastCommitted.playerCount;
            if (!changed) return;

            const modalEl = buildObsSavePromptModal();
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            const from = `${lastCommitted.game} / ${lastCommitted.vendor} / ${lastCommitted.playerCount}`;
            const to = `${game} / ${vendor} / ${playerCount}`;
            modalEl.querySelector('#obs-save-prompt-text').innerHTML =
                `Switching <b>${from}</b> &rarr; <b>${to}</b>.<br>Save OBS settings for <b>${from}</b> before switching?`;
            const errEl = modalEl.querySelector('#obs-save-prompt-error');
            errEl.style.display = 'none';

            const saveBtn = modalEl.querySelector('#obs-prompt-save');
            const skipBtn = modalEl.querySelector('#obs-prompt-skip');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save & Switch';

            // fresh one-shot handlers per open (clone to drop stale listeners)
            const freshSave = saveBtn.cloneNode(true); saveBtn.replaceWith(freshSave);
            const freshSkip = skipBtn.cloneNode(true); skipBtn.replaceWith(freshSkip);

            freshSkip.addEventListener('click', () => { modal.hide(); commit(); });
            freshSave.addEventListener('click', () => {
                freshSave.disabled = true;
                freshSave.textContent = 'Saving…';
                let done = false;
                const onSaved = (result) => {
                    if (done) return;
                    done = true;
                    socket.off('obs-preset-saved', onSaved);
                    clearTimeout(timer);
                    if (result && result.success) {
                        modal.hide();
                        commit();
                    } else {
                        // Keep the outgoing setup — nothing switched, retry or
                        // choose "Switch Without Saving" deliberately.
                        errEl.textContent = 'OBS save failed: ' + (result && result.error || 'unknown error');
                        errEl.style.display = 'block';
                        freshSave.disabled = false;
                        freshSave.textContent = 'Save & Switch';
                    }
                };
                const timer = setTimeout(() => onSaved({ success: false, error: 'timed out (is OBS running?)' }), 12000);
                socket.on('obs-preset-saved', onSaved);
                socket.emit('save-obs-preset');
            });

            modal.show();
        });
    }

    // --- Server initial state ---
    socket.on('server-current-game-selection', ({gameSelection}) => {
        console.log('Initial game selection received from server:', gameSelection);
        gameSelect.value = gameSelection?.toLowerCase();
        populateVendorDropdown(gameSelection);
        lastCommitted.game = gameSelect.value;
        syncBodyDataAttrs();
        refreshDirtyState();
    });

    socket.on('server-current-vendor-selection', ({vendorSelection}) => {
        console.log('Initial vendor selection received from server:', vendorSelection);
        vendorSelect.value = vendorSelection?.toLowerCase();
        lastCommitted.vendor = vendorSelect.value;
        syncBodyDataAttrs();
        refreshDirtyState();
    });

    socket.on('server-current-player-count', ({playerCount}) => {
        console.log('Initial player count received from server:', playerCount);
        playerCountSelect.value = playerCount?.toLowerCase();
        lastCommitted.playerCount = playerCountSelect.value;
        syncBodyDataAttrs();
        refreshDirtyState();
    });

    // --- Round-tripped commits from the server ---
    // These fire in response to Apply-click emits (and also if another MC tab
    // commits elsewhere). They refresh the dropdown + lastCommitted together so
    // dirty state clears once the server confirms our change.
    socket.on('game-selection-updated', ({gameSelection}) => {
        gameSelect.value = gameSelection?.toLowerCase();
        populateVendorDropdown(gameSelection);
        lastCommitted.game = gameSelect.value;
        syncBodyDataAttrs();
        refreshDirtyState();
    });

    socket.on('vendor-selection-updated', ({vendorSelection}) => {
        vendorSelect.value = vendorSelection?.toLowerCase();
        lastCommitted.vendor = vendorSelect.value;
        syncBodyDataAttrs();
        clearStaleFetchRoundInputs();
        refreshDirtyState();
    });

    socket.on('player-count-updated', ({playerCount}) => {
        playerCountSelect.value = playerCount?.toLowerCase();
        lastCommitted.playerCount = playerCountSelect.value;
        syncBodyDataAttrs();
        clearStaleFetchRoundInputs();
        refreshDirtyState();
    });

    // --- Sideboard visibility (immediate toggle; NOT gated behind Apply) ---
    // Flipping this shows/hides the sideboard on the decklist broadcast right
    // away. The switch lives on each round's broadcast strip
    // (.round-sideboard-toggle, rendered by matches.js) — there's one per round
    // tab but only one is visible at a time. They all drive a single global
    // state, so we keep every copy in sync and stash the current value on
    // body.dataset.sideboardVisible (matches.js reads it to seed strips that
    // render after the first sync). Server broadcasts the change to all clients
    // (incl. us) to keep tabs in sync.
    const syncSideboardToggles = (visible) => {
        document.body.dataset.sideboardVisible = visible ? 'true' : 'false';
        document.querySelectorAll('.round-sideboard-toggle').forEach(t => { t.checked = visible; });
    };
    // Delegated so it works for the per-round toggles rendered later.
    document.addEventListener('change', (e) => {
        if (!e.target.classList || !e.target.classList.contains('round-sideboard-toggle')) return;
        const visible = e.target.checked;
        syncSideboardToggles(visible);
        socket.emit('update-sideboard-visible', { sideboardVisible: visible });
    });
    socket.on('server-current-sideboard-visible', ({sideboardVisible}) => syncSideboardToggles(!!sideboardVisible));
    socket.on('sideboard-visible-updated', ({sideboardVisible}) => syncSideboardToggles(!!sideboardVisible));

    // --- Save OBS Preset ---
    // --- Toggle Commentator L3 ---
    const commL3Btn = document.querySelector('#toggle-commentator-l3');
    if (commL3Btn) {
        commL3Btn.addEventListener('click', () => {
            socket.emit('toggle-commentator-l3');
        });
    }

    const savePresetBtn = document.querySelector('#save-obs-preset');
    if (savePresetBtn) {
        savePresetBtn.addEventListener('click', () => {
            savePresetBtn.disabled = true;
            savePresetBtn.textContent = 'Saving...';
            socket.emit('save-obs-preset');
        });

        socket.on('obs-preset-saved', (result) => {
            savePresetBtn.disabled = false;
            if (result.success) {
                savePresetBtn.textContent = `Saved: ${result.file}`;
                setTimeout(() => { savePresetBtn.textContent = 'Save OBS Preset'; }, 3000);
            } else {
                savePresetBtn.textContent = `Error: ${result.error}`;
                setTimeout(() => { savePresetBtn.textContent = 'Save OBS Preset'; }, 3000);
            }
        });
    }

    // --- Load OBS Preset ---
    const loadPresetBtn = document.querySelector('#load-obs-preset');
    if (loadPresetBtn) {
        loadPresetBtn.addEventListener('click', () => {
            loadPresetBtn.disabled = true;
            loadPresetBtn.textContent = 'Loading...';
            socket.emit('restore-obs-preset', {
                game: gameSelect.value.toLowerCase(),
                vendor: vendorSelect.value.toLowerCase(),
                playerCount: playerCountSelect.value.toLowerCase()
            });
            // No server response event for restore, just re-enable after a delay
            setTimeout(() => {
                loadPresetBtn.disabled = false;
                loadPresetBtn.textContent = 'Load OBS Preset';
            }, 2000);
        });
    }

    // --- Initialize ---
    populatePlayerCountDropdown();
    socket.emit('get-game-selection');
    socket.emit('get-vendor-selection');
    socket.emit('get-player-count');
    socket.emit('get-sideboard-visible');
}
