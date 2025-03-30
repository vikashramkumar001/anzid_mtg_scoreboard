export function initMatches(socket) {

    const broadcastDisplay = document.getElementById('broadcasting-now-round-display');
    const control1Display = document.getElementById('control-1-round-match-display');
    const control2Display = document.getElementById('control-2-round-match-display');
    const control3Display = document.getElementById('control-3-round-match-display');
    const control4Display = document.getElementById('control-4-round-match-display');
    const updateEventInformation = document.querySelector(`#global-update-event-information.update-button`);
    const updateCommentators = document.querySelector(`#global-update-commentators.update-button`);
    const commentator1 = document.querySelector(`#global-commentator-one`);
    const commentator1_subtext = document.querySelector(`#global-commentator-one-subtext`);
    const commentator2 = document.querySelector(`#global-commentator-two`);
    const commentator2_subtext = document.querySelector(`#global-commentator-two-subtext`);
    const matchEventName = document.querySelector(`#global-event-name`);
    const matchEventFormat = document.querySelector(`#global-event-format`);
    const matchEventMiscDetails = document.querySelector(`#global-event-miscellaneous-details`);
    const matchEventBaseLifePoints = document.querySelector(`#global-event-base-life-points`);
    const matchEventBaseLifePointsCurrent = document.querySelector(`#global-event-base-life-points-current`);
    const matchEventBaseTimer = document.querySelector(`#global-event-base-timer`);
    const matchEventBaseTimerCurrent = document.querySelector(`#global-event-base-timer-current`);
    let allControlData = {};
    let allTimerStates = {};
    let allStandingsData = {};
    let baseLifePoints = '20';
    let baseTimer = '50';
    let currentArchetypeList = [];

    // Function to render or update a match card
    function renderMatch(roundId, matchId, matchData) {
        // Check if a card for this match already exists
        let matchContainer = document.getElementById(`round-${roundId}-matches`);
        let matchCard = document.getElementById(`match-card-${roundId}-${matchId}`);

        if (!matchCard) {
            // Create new card (use your existing card HTML structure)
            matchCard = document.createElement('div');
            matchCard.classList.add('col-6', 'mb-3', 'match-card-container');
            matchCard.id = `match-card-${roundId}-${matchId}`;
            matchCard.innerHTML = `
            <div class="row mb-2">
                <div class="col-3 d-flex flex-row justify-content-start align-items-center">
                    <h3 class="match-id-name mb-0">${roundId}-${matchId}</h3>
                </div>
                <div class="col-9 d-flex flex-row justify-content-end">
                    <button id="reset-life-${roundId}-${matchId}" class="btn btn-warning reset-life-button me-2" data-match-id="${matchId}"
                            data-round-id="${roundId}">Reset Life
                    </button>
                    <button id="control-1-${roundId}-${matchId}" class="btn btn-secondary control-button me-2" data-match-id="${matchId}"
                            data-round-id="${roundId}" data-control-id="1">Control 1
                    </button>
                    <button id="control-2-${roundId}-${matchId}" class="btn btn-secondary control-button me-2" data-match-id="${matchId}"
                            data-round-id="${roundId}" data-control-id="2">Control 2
                    </button>
                    <button id="control-3-${roundId}-${matchId}" class="btn btn-secondary control-button me-2" data-match-id="${matchId}"
                            data-round-id="${roundId}" data-control-id="3">Control 3
                    </button>
                    <button id="control-4-${roundId}-${matchId}" class="btn btn-secondary control-button" data-match-id="${matchId}"
                            data-round-id="${roundId}" data-control-id="4">Control 4
                    </button>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="row mb-4">
                        <!-- Event Information -->
                        <div class="col-12">
                            <div class="row">
                                <div class="col-12">
                                    <div class="timer-container">
                                        <div id="timer-${roundId}-${matchId}" class="timer-text">50:00</div>
                                        <button id="timer-add-${roundId}-${matchId}" class="btn timer-button font-40" >+</button>
                                        <button id="timer-minus-${roundId}-${matchId}" class="btn timer-button font-40" >-</button>
                                        <button id="timer-start-${roundId}-${matchId}" class="btn timer-button">▶</button>
                                        <button id="timer-pause-${roundId}-${matchId}" class="btn timer-button">⏸</button>
                                        <button id="timer-reset-${roundId}-${matchId}" class="btn timer-button">⭮</button>
                                    </div>
                                </div>
                                <div class="col-12 text-center">
                                    <label>
                                        <input type="checkbox" id="timer-display-scoreboard-${roundId}-${matchId}"> Show Timer on Scoreboard
                                    </label>
                                </div>
                                <div class="col-12">
                                    <h5 class="card-title">Event Information</h5>
                                </div>
                                <div class="col-4">
                                    <div class="mb-3">
                                        <label class="form-label">Event Name</label>
                                        <div id="${roundId}-${matchId}-event-name" class="editable form-control" contenteditable="false"></div>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="mb-3">
                                        <label class="form-label">Event Round</label>
                                        <div id="${roundId}-${matchId}-event-round" class="editable form-control" contenteditable="true"></div>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="mb-3">
                                        <label class="form-label">Event Format</label>
                                        <div id="${roundId}-${matchId}-event-format" class="editable form-control" contenteditable="false"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <hr>
                        <!-- Left Player Information -->
                        <div class="col-md-6">
                            <h5 class="card-title">Left Player</h5>
                            <div class="mb-3">
                                <label class="form-label">Player Name</label>
                                <div id="${roundId}-${matchId}-player-name-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">LifePoints</label>
                                <div id="${roundId}-${matchId}-player-life-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Pronouns</label>
                                <div id="${roundId}-${matchId}-player-pronouns-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Archetype</label>
                                <div id="${roundId}-${matchId}-player-archetype-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Record</label>
                                <div id="${roundId}-${matchId}-player-record-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Wins</label>
                                <div id="${roundId}-${matchId}-player-wins-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Poison</label>
                                <div id="${roundId}-${matchId}-player-poison-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Mulligan</label>
                                <div id="${roundId}-${matchId}-player-mulligan-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                        </div>

                        <!-- Right Player Information -->
                        <div class="col-md-6">
                            <h5 class="card-title">Right Player</h5>
                            <div class="mb-3">
                                <label class="form-label">Player Name</label>
                                <div id="${roundId}-${matchId}-player-name-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">LifePoints</label>
                                <div id="${roundId}-${matchId}-player-life-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Pronouns</label>
                                <div id="${roundId}-${matchId}-player-pronouns-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Archetype</label>
                                <div id="${roundId}-${matchId}-player-archetype-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Record</label>
                                <div id="${roundId}-${matchId}-player-record-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Wins</label>
                                <div id="${roundId}-${matchId}-player-wins-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Poison</label>
                                <div id="${roundId}-${matchId}-player-poison-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Mulligan</label>
                                <div id="${roundId}-${matchId}-player-mulligan-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                        </div>
                    </div>

                    <!-- New row for deck information -->
                    <div class="row">
                        <!-- Left Player Deck Information -->
                        <div class="col-md-6">
                            <h5 class="card-title">Left Player Deck</h5>
                            <div class="mb-3">
                                <label class="form-label">Main Deck</label>
                                <textarea id="${roundId}-${matchId}-player-main-deck-left" 
                                        class="editable form-control" 
                                        rows="5" 
                                        placeholder="Enter main deck cards (separated by commas or new lines)"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Side Deck</label>
                                <textarea id="${roundId}-${matchId}-player-side-deck-left" 
                                        class="editable form-control" 
                                        rows="3" 
                                        placeholder="Enter side deck cards (separated by commas or new lines)"></textarea>
                            </div>
                            <div class="my-3">
                                <button class="btn btn-primary" id="display-deck-left-${roundId}-${matchId}">Display Deck</button>
                            </div>
                        </div>
                        <!-- Right Player Deck Information -->
                        <div class="col-md-6">
                            <h5 class="card-title">Right Player Deck</h5>
                            <div class="mb-3">
                                <label class="form-label">Main Deck</label>
                                <textarea id="${roundId}-${matchId}-player-main-deck-right" 
                                        class="editable form-control" 
                                        rows="5" 
                                        placeholder="Enter main deck cards (separated by new lines)"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Side Deck</label>
                                <textarea id="${roundId}-${matchId}-player-side-deck-right" 
                                        class="editable form-control" 
                                        rows="3" 
                                        placeholder="Enter side deck cards (separated by new lines)"></textarea>
                            </div>
                            <div class="my-3">
                                <button class="btn btn-primary" id="display-deck-right-${roundId}-${matchId}">Display Deck</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;
            // Add the new card to the round's match container
            matchContainer.appendChild(matchCard);
            // Attach change listeners
            attachChangeListeners(roundId, matchId);
            // Attach the deck display listeners after rendering
            attachDeckDisplayListeners(roundId, matchId);
            // Attach control mapping listeners
            attachControlMappingButtonListeners(roundId, matchId);
            // Attach reset life listener
            attachMatchResetLifeButtonListeners(roundId, matchId);
            // Attach timer listeners
            attachMatchTimerButtonListeners(roundId, matchId);
        }

        // Update the fields with the match data
        Object.keys(matchData).forEach(key => {
            const fieldElement = document.getElementById(`${roundId}-${matchId}-${key}`);
            if (fieldElement) {
                if (fieldElement.tagName.toLowerCase() === 'textarea') {
                    if (key.includes('main-deck') || key.includes('side-deck')) {
                        // Join array elements with newlines for deck lists
                        fieldElement.value = Array.isArray(matchData[key])
                            ? matchData[key].join('\n')
                            : matchData[key];
                    } else {
                        fieldElement.value = matchData[key];
                    }
                } else {
                    fieldElement.textContent = matchData[key];
                }
            }
        });
    }

    // Function to attach change listeners to all editable fields for a given match ID
    function attachChangeListeners(roundId, matchId) {
        const editableFields = document.querySelectorAll(`#match-card-${roundId}-${matchId} .editable`);
        editableFields.forEach(field => {
            field.addEventListener('input', () => {
                let value;

                // Handle deck lists as arrays
                if (field.tagName.toLowerCase() === 'textarea' &&
                    (field.id.includes('main-deck') || field.id.includes('side-deck'))) {
                    // Split by newlines and/or commas, trim whitespace, and filter empty strings
                    value = field.value
                        .split(/\n+/)
                        .map(card => card.trim())
                        .filter(card => card !== '');
                } else {
                    // Handle other fields normally
                    value = field.tagName.toLowerCase() === 'textarea' ? field.value : field.textContent;
                }

                // check if event round is being updated
                if (field.id.includes('event-round')) {
                    // Dynamically select all event-round fields for this round and matches
                    const eventFields = document.querySelectorAll(`[id^="${roundId}-match"][id$="-event-round"]`);
                    eventFields.forEach(eventField => {
                        // Avoid updating the field currently being edited
                        if (eventField !== field) {
                            eventField.innerText = value;
                        }
                    });
                    // Update control data for all matches in this round
                    Object.keys(allControlData[roundId]).forEach(matchId => {
                        allControlData[roundId][matchId]['event-round'] = value;
                    });
                }

                // Update the local control data when a field changes
                updateControlData(roundId, matchId, field.id.replace(`${roundId}-${matchId}-`, ''), value);
                // Emit the updated control data to the backend
                console.log('updated all data', allControlData);
                socket.emit('master-control-matches-updated', allControlData);
            });
        });
    }

    // Function to update the control data for a specific match
    function updateControlData(roundId, matchId, key, value) {
        if (!allControlData[roundId]) {
            allControlData[roundId] = {};
        }
        if (!allControlData[roundId][matchId]) {
            allControlData[roundId][matchId] = {};
        }
        console.log(roundId, matchId, key, value)
        allControlData[roundId][matchId][key] = value;
    }

    function renderDropdownList(dropdownList, items, field) {
        dropdownList.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.textContent = item.name;
            div.classList.add('dropdown-item');
            div.addEventListener('click', function () {
                field.textContent = item.name;
                dropdownList.style.display = 'none';
                field.dispatchEvent(new Event('input'));
                field.dispatchEvent(new Event('change')); // Trigger change event
            });
            dropdownList.appendChild(div);
        });
        dropdownList.style.display = items.length > 0 ? 'block' : 'none';
    }

    function setupCustomDropdowns() {
        const archetypeFields = document.querySelectorAll('[id$="-player-archetype-left"], [id$="-player-archetype-right"], [id^="bracket-"][id$="-archetype"]');

        archetypeFields.forEach(field => {
            if (field.parentNode.classList.contains('custom-dropdown')) {
                return; // Skip if already set up
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'custom-dropdown';
            field.parentNode.insertBefore(wrapper, field);
            wrapper.appendChild(field);

            const dropdownList = document.createElement('div');
            dropdownList.className = 'dropdown-list';
            wrapper.appendChild(dropdownList);

            field.addEventListener('input', function () {
                const value = this.textContent.trim().toLowerCase();
                const filteredArchetypes = currentArchetypeList.filter(archetype => archetype.name.toLowerCase().includes(value))
                    .slice(0, 5); // Limit to top 5 results
                renderDropdownList(dropdownList, filteredArchetypes, field);
            });

            field.addEventListener('focus', function () {
                renderDropdownList(dropdownList, currentArchetypeList, field);
            });

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });
    }

    // Add these functions to your existing script section
    function renderRoundTabs(allData) {
        const roundTabs = document.getElementById('roundTabs');
        const roundContent = document.getElementById('roundTabsContent');

        if (roundTabs.children.length === 0 && roundContent.children.length === 0) {
            // Create tabs and content for each round
            Object.keys(allData).forEach((roundId, index) => {
                // Create tab
                const tab = document.createElement('li');
                tab.className = 'nav-item';
                tab.innerHTML = `
                <button class="nav-link ${index === 0 ? 'active' : ''}"
                        id="round-${roundId}-tab"
                        data-bs-toggle="tab"
                        data-bs-target="#round-${roundId}-content"
                        type="button"
                        role="tab"
                        aria-controls="round-${roundId}"
                        aria-selected="${index === 0}">
                    Round ${roundId}
                </button>
            `;
                roundTabs.appendChild(tab);

                // Create content
                const content = document.createElement('div');
                content.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
                content.id = `round-${roundId}-content`;
                content.role = 'tabpanel';
                content.setAttribute('aria-labelledby', `round-${roundId}-tab`);

                // create container for round actions
                const roundActions = document.createElement('div');
                roundActions.className = 'col-12 d-flex flex-row justify-content-center my-3 round-broadcast-container';
                roundActions.innerHTML = `<button class="btn btn-primary broadcast-button" id="broadcast-${roundId}" data-round-id="${roundId}">Broadcast</button>`;
                content.appendChild(roundActions);

                const divider = document.createElement('hr');
                content.appendChild(divider);

                // Create container for match cards
                const matchContainer = document.createElement('div');
                matchContainer.id = `round-${roundId}-matches`;
                matchContainer.className = 'mt-3 row';
                content.appendChild(matchContainer);

                roundContent.appendChild(content);

                attachBroadcastButtonListeners(roundId);

            });
        }

        // update content in round / matches
        Object.keys(allData).forEach((roundId, index) => {
            // Render all matches for this round
            Object.entries(allData[roundId]).forEach(([matchId, matchData]) => {
                renderMatch(roundId, matchId, matchData);
            });
        })

        // matches are rendered - now ask server for standings
        socket.emit('get-all-standings');
    }

    // Add click handlers for the Display Deck buttons
    function attachDeckDisplayListeners(round_id, match_id) {
        const leftDeckButton = document.querySelector(`#display-deck-left-${round_id}-${match_id}`);
        const rightDeckButton = document.querySelector(`#display-deck-right-${round_id}-${match_id}`);

        leftDeckButton.addEventListener('click', () => {
            socket.emit('display-deck', {
                round_id,
                match_id,
                side: 'left'
            });
        });

        rightDeckButton.addEventListener('click', () => {
            socket.emit('display-deck', {
                round_id,
                match_id,
                side: 'right'
            });
        });
    }

    // add event listeners for broadcast buttons
    function attachBroadcastButtonListeners(round_id) {
        const broadcast = document.querySelector(`#broadcast-${round_id}`);
        broadcast.addEventListener('click', () => {
            console.log(`broadcast clicked for round ${round_id}`);
            broadcastDisplay.innerText = `Round ${round_id}`;
            socket.emit('broadcast-requested', {
                round_id
            });
        });
    }

    // Add event listeners for control buttons
    function attachControlMappingButtonListeners(round_id, match_id) {
        const control1 = document.querySelector(`#control-1-${round_id}-${match_id}.control-button`);
        const control2 = document.querySelector(`#control-2-${round_id}-${match_id}.control-button`);
        const control3 = document.querySelector(`#control-3-${round_id}-${match_id}.control-button`);
        const control4 = document.querySelector(`#control-4-${round_id}-${match_id}.control-button`);
        control1.addEventListener('click', () => {
            console.log('click from', round_id, match_id);
            control1Display.innerText = `${round_id}-${match_id}`;
            socket.emit('control-mapping-update', {controlId: '1', round_id, match_id});
        })
        control2.addEventListener('click', () => {
            console.log('click from', round_id, match_id);
            control2Display.innerText = `${round_id}-${match_id}`;
            socket.emit('control-mapping-update', {controlId: '2', round_id, match_id});
        })
        control3.addEventListener('click', () => {
            console.log('click from', round_id, match_id);
            control3Display.innerText = `${round_id}-${match_id}`;
            socket.emit('control-mapping-update', {controlId: '3', round_id, match_id});
        })
        control4.addEventListener('click', () => {
            console.log('click from', round_id, match_id);
            control4Display.innerText = `${round_id}-${match_id}`;
            socket.emit('control-mapping-update', {controlId: '4', round_id, match_id});
        })
    }

    // Add event listeners for reset life buttons
    function attachMatchResetLifeButtonListeners(round_id, match_id) {
        const resetLifeButton = document.querySelector(`#reset-life-${round_id}-${match_id}.reset-life-button`);
        resetLifeButton.addEventListener('click', () => {
            console.log('click reset life', round_id, match_id);
            // update life points for left and right of round / match
            document.querySelector(`[id="${round_id}-${match_id}-player-life-left"]`).innerText = baseLifePoints;
            document.querySelector(`[id="${round_id}-${match_id}-player-life-right"]`).innerText = baseLifePoints;
            // update controlData
            allControlData[round_id][match_id]['player-life-left'] = baseLifePoints;
            allControlData[round_id][match_id]['player-life-right'] = baseLifePoints;
            // update server since control data changed
            socket.emit('master-control-matches-updated', allControlData);
        })
    }

    // add click handlers for update global buttons
    function attachGlobalCommentatorsListener() {
        updateCommentators.addEventListener('click', () => {
            const data2send = {
                'global-commentator-one': commentator1.innerText,
                'global-commentator-one-subtext': commentator1_subtext.innerText,
                'global-commentator-two': commentator2.innerText,
                'global-commentator-two-subtext': commentator2_subtext.innerText
            }
            console.log(data2send)
            socket.emit('update-commentators-requested', {commentatorData: data2send});
        })
    }

    // add click handlers for update event name and event format button
    function attachGlobalEventInformationUpdateListener() {
        updateEventInformation.addEventListener('click', () => {
            const data2send = {
                'global-event-name': matchEventName.innerText,
                'global-event-format': matchEventFormat.innerText,
                'global-event-miscellaneous-details': matchEventMiscDetails.innerText,
                'global-event-base-life-points': matchEventBaseLifePoints.innerText,
                'global-event-base-timer': matchEventBaseTimer.innerText
            }
            console.log(data2send)
            socket.emit('update-event-information-requested', {eventInformationData: data2send});
        })
    }

    // add input / keypress handlers for base timer global update
    function attachGlobalBaseTimerInputListener() {
        // Allow only number keys
        matchEventBaseTimer.addEventListener('keydown', function (e) {
            const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'];
            if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
                e.preventDefault();
            }
        });

        // Sanitize pasted input
        matchEventBaseTimer.addEventListener('paste', function (e) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            const digitsOnly = text.replace(/\D/g, '');

            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            selection.deleteFromDocument();
            selection.getRangeAt(0).insertNode(document.createTextNode(digitsOnly));
        });
    }


    // START TIMER FUNCTIONS

    function updateTimerState(round_id, match_id, action) {
        socket.emit('update-timer-state', {round_id, match_id, action});
    }

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    // Add event listeners for reset life buttons
    function attachMatchTimerButtonListeners(round_id, match_id) {
        const startButton = document.querySelector(`#timer-start-${round_id}-${match_id}`);
        const addButton = document.querySelector(`#timer-add-${round_id}-${match_id}`);
        const minusButton = document.querySelector(`#timer-minus-${round_id}-${match_id}`);
        const pauseButton = document.querySelector(`#timer-pause-${round_id}-${match_id}`);
        const resetButton = document.querySelector(`#timer-reset-${round_id}-${match_id}`);
        const timerShowCheck = document.querySelector(`#timer-display-scoreboard-${round_id}-${match_id}`);
        startButton.addEventListener('click', () => {
            console.log('start clicked', round_id, match_id)
            updateTimerState(round_id, match_id, 'start');
        });
        addButton.addEventListener('click', () => {
            console.log('add clicked', round_id, match_id)
            updateTimerState(round_id, match_id, 'add');
        });
        minusButton.addEventListener('click', () => {
            console.log('minus clicked', round_id, match_id)
            updateTimerState(round_id, match_id, 'minus');
        });
        pauseButton.addEventListener('click', () => {
            console.log('pause clicked', round_id, match_id)
            updateTimerState(round_id, match_id, 'pause');
        });
        resetButton.addEventListener('click', () => {
            console.log('reset clicked', round_id, match_id)
            updateTimerState(round_id, match_id, 'reset');
        });
        timerShowCheck.addEventListener('change', function () {
            console.log('show / no show clicked', round_id, match_id, timerShowCheck.checked);
            if (timerShowCheck.checked) {
                updateTimerState(round_id, match_id, 'show');
            } else {
                updateTimerState(round_id, match_id, 'no-show');
            }
        });
    }

    // END TIMER FUNCTIONS

    // STANDINGS DATA

    function populateStandingsData() {
        Object.keys(allStandingsData).forEach((round_id) => {
            renderStandings(round_id);
        })
    }

    function renderStandings(roundId) {
        // Check if a card for this match already exists
        let standingsContainer = document.getElementById(`round-${roundId}-matches`);
        let standingsCard = document.getElementById(`standings-card-${roundId}`);

        if (!standingsCard) {
            // make standings card
            // Create new card (use your existing card HTML structure)
            standingsCard = document.createElement('div');
            standingsCard.classList.add('col-6', 'mb-3', 'standings-card-container');
            standingsCard.id = `standings-card-${roundId}`;
            standingsCard.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="row mb-4">
                        <!-- Event Information -->
                        <div class="col-12">
                            <div class="row">
                                <div class="col-12">
                                    <h5 class="card-title">Standings</h5>
                                </div>
                                <div class="col-12">
                                    <div class="mb-3">
                                        <label class="form-label">Round Standings</label>
                                        <textarea id="standings-${roundId}" class="editable form-control" rows="5"
                                        placeholder="Paste standings here..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
            // Add the new card to the round's match container
            standingsContainer.appendChild(standingsCard);
            // Attach change listeners
            attachStandingsChangeListeners(roundId);
        }

        // Update the fields with the match data
        const standingsTextbox = document.getElementById(`standings-${roundId}`);
        standingsTextbox.value = allStandingsData[roundId];
    }

    // Function to attach change listeners to all editable fields for a given match ID
    function attachStandingsChangeListeners(roundId) {
        const standingsTextbox = document.querySelector(`#standings-${roundId}.editable`);

        standingsTextbox.addEventListener('input', () => {
            let value = standingsTextbox.value;

            // Update the local standings data when a field changes
            updateStandingsData(roundId, value);
            // Emit the updated standings data to the backend
            console.log('updated standings data', allStandingsData);
            socket.emit('standings-updated', {round_id: roundId, textData: value});
        });
    }

    function updateStandingsData(roundId, value) {
        if (!allStandingsData[roundId]) {
            allStandingsData[roundId] = {};
        }
        console.log(roundId, value)
        allStandingsData[roundId] = value;
    }


    // END STANDINGS DATA

    // START UP

    // Initial setup when the page loads
    // setup custom dropdowns
    setupCustomDropdowns();
    // attach on startup
    attachGlobalCommentatorsListener();
    // attach global event information update button listener on start up
    attachGlobalEventInformationUpdateListener();
    // attach global base timer input listener
    attachGlobalBaseTimerInputListener();

    // setup sockets emitters

    // call for control broadcast trackers data
    socket.emit('get-control-broadcast-trackers');

    // call for global data at start up
    socket.emit('get-match-global-data');

    // at the start, ask for all timer states from the server
    socket.emit('get-all-timer-states');

    // end setup socket emitters

    // setup sockets listeners

    // handle response for control broadcast trackers data
    socket.on('control-broadcast-trackers', (data) => {
        console.log('control and broadcast tracking update', data);
        // update broadcast and control displays
        broadcastDisplay.innerText = data['broadcastTracker']['round_id'] ? `Round ${data['broadcastTracker']['round_id']}` : 'None';
        control1Display.innerText = `${data['controlsTracker']['1']['round_id']}-${data['controlsTracker']['1']['match_id']}`;
        control2Display.innerText = `${data['controlsTracker']['2']['round_id']}-${data['controlsTracker']['2']['match_id']}`;
        control3Display.innerText = `${data['controlsTracker']['3']['round_id']}-${data['controlsTracker']['3']['match_id']}`;
        control4Display.innerText = `${data['controlsTracker']['4']['round_id']}-${data['controlsTracker']['4']['match_id']}`;
    })

    // handle response for global data
    socket.on('update-match-global-data', (data) => {
        // update match global fields
        console.log('got global data', data['globalData'])
        commentator1.innerText = data['globalData']['global-commentator-one'] ? data['globalData']['global-commentator-one'] : '';
        commentator1_subtext.innerText = data['globalData']['global-commentator-one-subtext'] ? data['globalData']['global-commentator-one-subtext'] : '';
        commentator2.innerText = data['globalData']['global-commentator-two'] ? data['globalData']['global-commentator-two'] : '';
        commentator2_subtext.innerText = data['globalData']['global-commentator-two-subtext'] ? data['globalData']['global-commentator-two-subtext'] : '';
        matchEventName.innerText = data['globalData']['global-event-name'] ? data['globalData']['global-event-name'] : '';
        matchEventFormat.innerText = data['globalData']['global-event-format'] ? data['globalData']['global-event-format'] : '';
        matchEventMiscDetails.innerText = data['globalData']['global-event-miscellaneous-details'] ? data['globalData']['global-event-miscellaneous-details'] : '';
        matchEventBaseLifePoints.innerText = data['globalData']['global-event-base-life-points'] ? data['globalData']['global-event-base-life-points'] : '20';
        matchEventBaseLifePointsCurrent.innerText = data['globalData']['global-event-base-life-points'] ? data['globalData']['global-event-base-life-points'] : '20';
        baseLifePoints = data['globalData']['global-event-base-life-points'] ? data['globalData']['global-event-base-life-points'] : '20';
        matchEventBaseTimer.innerText = data['globalData']['global-event-base-timer'] ? data['globalData']['global-event-base-timer'] : '50';
        matchEventBaseTimerCurrent.innerText = data['globalData']['global-event-base-timer'] ? data['globalData']['global-event-base-timer'] : '50';
        baseTimer = data['globalData']['global-event-base-timer'] ? data['globalData']['global-event-base-timer'] : '50';
    })

    // handle getting all timer states
    socket.on('current-all-timer-states', ({timerState}) => {
        // save all timer states
        allTimerStates = timerState;
        // Iterate through all rounds and matches
        Object.keys(timerState).forEach((roundId) => {
            Object.keys(timerState[roundId]).forEach((matchId) => {
                const matchState = timerState[roundId][matchId];
                const timerElement = document.querySelector(`#timer-${roundId}-${matchId}`);
                if (timerElement) {
                    timerElement.innerText = matchState.time > 0 ? formatTime(matchState.time) : 'TURNS';
                }
                const timerShowCheck = document.querySelector(`#timer-display-scoreboard-${roundId}-${matchId}`);
                if (timerShowCheck) {
                    timerShowCheck.checked = matchState.show;
                }
            });
        });
    });

    // handle standing data
    socket.on('standings-data', ({standingsData}) => {
        console.log('got standings data', standingsData);
        allStandingsData = standingsData;
        // populate all standings text boxes per round
        populateStandingsData();
    })

    // handle updates to full control data to update the page
    socket.on('control-data-updated', (allData) => {
        console.log('Control data was updated', allData);
        // save to local object
        allControlData = allData;

        // Render the round tabs
        renderRoundTabs(allData);

        // Set up custom dropdowns after rendering
        setupCustomDropdowns();
    });

    // Listen for updated archetype list from server
    socket.on('archetypeListUpdated', (archetypes) => {
        currentArchetypeList = archetypes; // Update the current archetype list
    });

    // end setup socket listeners

    // END START UP

}