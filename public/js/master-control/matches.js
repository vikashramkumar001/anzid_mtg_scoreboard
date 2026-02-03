export function initMatches(socket) {

    const broadcastDisplay = document.getElementById('broadcasting-now-round-display');
    let currentGameSelection = 'mtg'; // Default to mtg
    const control1Display = document.getElementById('control-1-round-match-display');
    const control2Display = document.getElementById('control-2-round-match-display');
    const control3Display = document.getElementById('control-3-round-match-display');
    const control4Display = document.getElementById('control-4-round-match-display');
    const updateEventInformation = document.querySelector(`#global-update-event-information.update-button`);
    const updateMiscellaneousInformation = document.querySelector(`#global-update-misc-information.update-button`);
    const updateEventInformationBaseTimer = document.querySelector(`#global-update-event-information-base-timer.update-button`);
    const updateCommentators = document.querySelector(`#global-update-commentators.update-button`);
    const commentator1 = () => document.querySelector(`#global-commentator-1`);
    const commentator1_subtext = () =>  document.querySelector(`#global-commentator-subtext-1`);
    const commentator2 = () =>  document.querySelector(`#global-commentator-2`);
    const commentator2_subtext = () =>  document.querySelector(`#global-commentator-subtext-2`);
    const commentator3 = () =>  document.querySelector(`#global-commentator-3`);
    const commentator3_subtext = () =>  document.querySelector(`#global-commentator-subtext-3`);
    const commentator4 = () =>  document.querySelector(`#global-commentator-4`);
    const commentator4_subtext = () =>  document.querySelector(`#global-commentator-subtext-4`);
    const matchEventName = document.querySelector(`#global-event-name`);
    const matchEventFormat = document.querySelector(`#global-event-format`);
    const matchEventMiscDetails = document.querySelector(`#global-event-miscellaneous-details`);
    const matchEventBaseLifePoints = document.querySelector(`#global-event-base-life-points`);
    const matchEventBaseLifePointsCurrent = document.querySelector(`#global-event-base-life-points-current`);
    const matchEventBaseTimer = document.querySelector(`#global-event-base-timer`);
    const matchEventBaseTimerCurrent = document.querySelector(`#global-event-base-timer-current`);
    const miscellaneousFontFamily = document.querySelector(`#global-misc-font-family`);
    let allControlData = {};
    let allTimerStates = {};
    let allStandingsData = {};
    let baseLifePoints = '20';
    let baseTimer = '50';
    let currentArchetypeList = [];
    let commentatorData = {};
    const fontFamilies = [
        {name: "Alverata", value: "'Alverata', sans-serif"},
        {name: "Alverata Informal", value: "'AlverataInformal', sans-serif"},
        {name: "Alverata Irregular", value: "'AlverataIrregular', sans-serif"},
        {name: "Bebas Neue", value: "'Bebas Neue', sans-serif"},
        {name: "Bebas Neue Pro", value: "'Bebas Neue Pro', sans-serif"}
    ];
    
    // Riftbound Legends List
    const riftboundLegendsList = [
        {name: "Kai'sa, Daughter of the Void"},
        {name: "Volibear, Relentless Storm"},
        {name: "Jinx, Loose Cannon"},
        {name: "Darius, Hand of Noxus"},
        {name: "Ahri, Nine-Tailed Fox"},
        {name: "Lee Sin, Blind Monk"},
        {name: "Yasuo, Unforgiven"},
        {name: "Leona, Radiant Dawn"},
        {name: "Teemo, Swift Scout"},
        {name: "Viktor, Herald of the Arcane"},
        {name: "Miss Fortune, Bounty Hunter"},
        {name: "Sett, The Boss"},
        {name: "Annie, Dark Child"},
        {name: "Master Yi, Wuju Bladesman"},
        {name: "Lux, Lady of Luminosity"},
        {name: "Garen, Might of Demacia"},
		{name: "Rumble, Mechanized Menace"},
		{name: "Lucian, Purifier"},
		{name: "Draven, Glorious Executioner"},
		{name: "Rek'sai, Void Burrower"},
		{name: "Ornn, Fire Below the Mountain"},
		{name: "Jax, Grandmaster at Arms"},
		{name: "Irelia, Blade Dancer"},
		{name: "Azir, Emperor of the Sands"},
		{name: "Ezreal, Prodigal Explorer"}, 
		{name: "Renata Glasc, Chem-Baroness"},
		{name: "Sivir, Battle Mistress"}, 
		{name: "Fiora, Grand Duelist"}
    ];
    
    // Riftbound Champions List
    const riftboundChampionsList = [
        {name: "Kai'sa, Survivor"},
        {name: "Volibear, Furious"},
        {name: "Jinx, Demolitionist"},
        {name: "Darius, Trifarian"},
        {name: "Ahri, Alluring"},
        {name: "Lee Sin, Ascetic"},
        {name: "Yasuo, Remorseful"},
        {name: "Leona, Determined"},
        {name: "Teemo, Strategist"},
        {name: "Viktor, Innovator"},
        {name: "Miss Fortune, Captain"},
        {name: "Sett, Brawler"},
        {name: "Annie, Fiery"},
        {name: "Master Yi, Meditative"},
        {name: "Lux, Illuminated"},
        {name: "Garen, Rugged"},
        {name: "Kai'sa, Evolutionary"},
        {name: "Volibear, Imposing"},
        {name: "Jinx, Rebel"},
        {name: "Darius, Executioner"},
        {name: "Ahri, Inquisitive"},
        {name: "Lee Sin, Centered"},
        {name: "Yasuo, Windrider"},
        {name: "Leona, Zealot"},
        {name: "Teemo, Scout"},
        {name: "Viktor, Leader"},
        {name: "Miss Fortune, Buccaneer"},
        {name: "Sett, Kingpin"},
        {name: "Annie, Stubborn"},
        {name: "Master Yi, Honed"},
        {name: "Lux, Crownguard"},
        {name: "Garen, Commander"},
		{name: "Rumble, Hotheaded"},
		{name: "Rumble, Scrapper"},
		{name: "Lucian, Gunslinger"},
		{name: "Lucian, Merciless"},
		{name: "Draven, Vanquisher"},
		{name: "Draven, Audacious"},
		{name: "Draven, Showboat"},
		{name: "Rek'sai, Breacher"},
		{name: "Rek'sai, Swarm Queen"},
		{name: "Ornn, Blacksmith"},
		{name: "Ornn, Forge God"},
		{name: "Jax, Unrelenting"},
		{name: "Jax, Unmatched"},
		{name: "Irelia, Graceful"},
		{name: "Irelia, Fervent"},
		{name: "Azir, Ascendant"},
		{name: "Azir, Sovereign"},
		{name: "Ezreal, Prodigy"},
		{name: "Ezreal, Dashing"},
		{name: "Renata Glasc, Mastermind"},
		{name: "Renata Glasc, Industrialist"},
		{name: "Sivir, Ambitious"},
		{name: "Sivir, Mercenary"},
		{name: "Fiora, Worthy"},
		{name: "Fiora, Peerless"},
		{name: "Fiora, Victorious"}
    ];
    
    // Riftbound Battlefields List
    const riftboundBattlefieldsList = [
        {name: "Altar to Unity"},
        {name: "Aspirant's Climb"},
        {name: "Back Alley Bar"},
        {name: "Bandle Tree"},
        {name: "Fortified Position"},
        {name: "Grove of the God Willow"},
        {name: "Hallowed Tomb"},
        {name: "Monastery of Hirana"},
        {name: "Navori Fighting Pit"},
        {name: "Obelisk of Power"},
        {name: "Reaver's Row"},
        {name: "Reckoner's Arena"},
        {name: "Sigil of the Storm"},
        {name: "Startipped Peak"},
        {name: "Targon's Peak"},
        {name: "The Arena's Greatest"},
        {name: "The Dreaming Tree"},
        {name: "The Grand Plaza"},
        {name: "Trifarian War Camp"},
        {name: "Vilemaw's Lair"},
        {name: "Void Gate"},
        {name: "Windswept Hillock"},
        {name: "Zaun Warrens"},
        {name: "The Candlelit Sanctum"},
		{name: "Emperor's Dais"},
		{name: "Forge of the Fluft"},
		{name: "Forgotten Monument"},
		{name: "Hall of Legends"},
		{name: "Marai Spire"},
		{name: "Minefield"},
		{name: "Ornn's Forge"},
		{name: "Power Nexus"},
		{name: "Ravenbloom Conservatory"},
		{name: "Rockfall Path"},
		{name: "Seat of Power"},
		{name: "Sunken Temple"},
		{name: "The Papertree"},
		{name: "Treasure Hoard"},
		{name: "Veiled Temple"}
    ];

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
                                <div class="col-12 text-center">
                                    <label>
                                        <input type="checkbox" id="wins-display-scoreboard-${roundId}-${matchId}"> Show Wins on Scoreboard
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
                            <div class="mb-3 mtg-only-field">
                                <label class="form-label">Mana Symbols</label>
                                <div id="${roundId}-${matchId}-player-mana-symbols-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Record</label>
                                <div id="${roundId}-${matchId}-player-record-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Wins</label>
                                <div id="${roundId}-${matchId}-player-wins-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 mtg-only-field">
                                <label class="form-label">Poison</label>
                                <div id="${roundId}-${matchId}-player-poison-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Mulligan</label>
                                <div id="${roundId}-${matchId}-player-mulligan-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 riftbound-only-field" style="display: none;">
                                <label class="form-label">Legend</label>
                                <div id="${roundId}-${matchId}-player-legend-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 riftbound-only-field" style="display: none;">
                                <label class="form-label">Champion</label>
                                <div id="${roundId}-${matchId}-player-champion-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 riftbound-only-field" style="display: none;">
                                <label class="form-label">Runes</label>
                                <div id="${roundId}-${matchId}-player-runes-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 riftbound-only-field" style="display: none;">
                                <label class="form-label">Battlefield</label>
                                <div id="${roundId}-${matchId}-player-battlefield-left" class="editable form-control" contenteditable="true"></div>
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
                            <div class="mb-3 mtg-only-field">
                                <label class="form-label">Mana Symbols</label>
                                <div id="${roundId}-${matchId}-player-mana-symbols-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Record</label>
                                <div id="${roundId}-${matchId}-player-record-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Wins</label>
                                <div id="${roundId}-${matchId}-player-wins-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 mtg-only-field">
                                <label class="form-label">Poison</label>
                                <div id="${roundId}-${matchId}-player-poison-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Mulligan</label>
                                <div id="${roundId}-${matchId}-player-mulligan-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 riftbound-only-field" style="display: none;">
                                <label class="form-label">Legend</label>
                                <div id="${roundId}-${matchId}-player-legend-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 riftbound-only-field" style="display: none;">
                                <label class="form-label">Champion</label>
                                <div id="${roundId}-${matchId}-player-champion-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 riftbound-only-field" style="display: none;">
                                <label class="form-label">Runes</label>
                                <div id="${roundId}-${matchId}-player-runes-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 riftbound-only-field" style="display: none;">
                                <label class="form-label">Battlefield</label>
                                <div id="${roundId}-${matchId}-player-battlefield-right" class="editable form-control" contenteditable="true"></div>
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
            // Toggle Riftbound fields visibility based on current game selection
            toggleGameFields(currentGameSelection);
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
            // Attach show wins listener
            attachMatchShowWinsCheckboxListener(roundId, matchId);
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
            field.addEventListener('input', (e) => {
                let value;

                // Handle deck lists as arrays
                if (field.tagName.toLowerCase() === 'textarea' &&
                    (field.id.includes('main-deck') || field.id.includes('side-deck'))) {
                    // Split by newlines and/or commas, trim whitespace, and filter empty strings
                    let parsedDeck = parseDeckString(field.value);

                    // Update various fields as needed (Legend, Champion, etc.) (Currently only needed for Riftbound, but who knows?)
                    let sideId = e.target['id'].split('-')[5]
                    if (currentGameSelection === 'riftbound') {
                        updateRiftboundFields(parsedDeck, roundId, matchId, sideId);
                    }
                    
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

    // parse deck string into an object of multiple array categories
    function parseDeckString(decklist) {
        const result = {};
        let currentSection = null;

        const lines = decklist.split("\n");

        for (const line of lines) {
            const trimmed = line.trim();

            // skip empty lines
            if (!trimmed) continue;

            // section header
            if (trimmed.endsWith(":")) {
                const rawHeader = trimmed.slice(0, -1);

                let normalizedHeader = rawHeader
                    .replace(/\s*\(\d+\)\s*$/, "") // remove "(number)"
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "");    // remove spaces & symbols

                // game-specific normalization
                // RIFTBOUND
                // normalize any rune-related header to "runepool"
                if (normalizedHeader.includes("rune")) {
                    normalizedHeader = "runepool";
                }

                // units / spells → maindeck
                if (normalizedHeader === "units" || normalizedHeader === "spells") {
                    normalizedHeader = "maindeck";
                }

                currentSection = normalizedHeader;
                result[currentSection] = [];
                continue;
            }

            // card line
            if (currentSection) {
                result[currentSection].push(trimmed);
            }
        }
      return result;
    }

    // Function to update Riftbound-specific fields based on parsed deck data
    function updateRiftboundFields(parsedDeck, roundId, matchId, sideId) {
        // Legend
        let legendField = document.getElementById(`${roundId}-${matchId}-player-legend-${sideId}`);
        let legendName = parsedDeck['legend'] ? parsedDeck['legend'][0] : '';
        legendName = legendName.substring(2, legendName.length); // remove quantity prefix
        legendField.innerText = legendName;

        // Champion
        let championField = document.getElementById(`${roundId}-${matchId}-player-champion-${sideId}`);
        let championName = parsedDeck['champion'] ? parsedDeck['champion'][0] : '';
        championName = championName.substring(2, championName.length); // remove quantity prefix
        championField.innerText = championName;

        // Battlefield


        // Runes
        const runeLetterToName = {
            'r': 'Fury',
            'g': 'Calm',
            'b': 'Mind',
            'o': 'Body',
            'p': 'Chaos',
            'y': 'Order'
        };

        const nameToLetter = Object.fromEntries(Object.entries(runeLetterToName).map(([k, v]) => [v, k.toUpperCase()]));
        const order = ['R', 'G', 'B', 'O', 'P', 'Y'];

        let runeField = document.getElementById(`${roundId}-${matchId}-player-runes-${sideId}`);
        if (parsedDeck['runepool']) {
            const runeNames = parsedDeck['runepool'].map(r => r.split(' ')[1]);
            const letters = runeNames.map(name => nameToLetter[name]).filter(Boolean);
            letters.sort((a, b) => order.indexOf(a) - order.indexOf(b));
            runeField.innerText = letters.join('');
        } else {
            runeField.innerText = '';
        }
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

        const fontFamilyFields = document.querySelectorAll('[id="global-misc-font-family"]');
        fontFamilyFields.forEach(field => {
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
                renderDropdownList(dropdownList, fontFamilies, field);
            });

            field.addEventListener('focus', function () {
                renderDropdownList(dropdownList, fontFamilies, field);
            });

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });

        // Setup legend autocomplete dropdowns
        const legendFields = document.querySelectorAll('[id$="-player-legend-left"], [id$="-player-legend-right"]');
        legendFields.forEach(field => {
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
                const filteredLegends = riftboundLegendsList.filter(legend => legend.name.toLowerCase().includes(value))
                    .slice(0, 5); // Limit to top 5 results
                renderDropdownList(dropdownList, filteredLegends, field);
            });

            field.addEventListener('focus', function () {
                renderDropdownList(dropdownList, riftboundLegendsList, field);
            });

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });

        // Setup champion autocomplete dropdowns
        const championFields = document.querySelectorAll('[id$="-player-champion-left"], [id$="-player-champion-right"]');
        championFields.forEach(field => {
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
                const filteredChampions = riftboundChampionsList.filter(champion => champion.name.toLowerCase().includes(value))
                    .slice(0, 5); // Limit to top 5 results
                renderDropdownList(dropdownList, filteredChampions, field);
            });

            field.addEventListener('focus', function () {
                renderDropdownList(dropdownList, riftboundChampionsList, field);
            });

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });

        // Setup battlefield autocomplete dropdowns
        const battlefieldFields = document.querySelectorAll('[id$="-player-battlefield-left"], [id$="-player-battlefield-right"]');
        battlefieldFields.forEach(field => {
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
                const filteredBattlefields = riftboundBattlefieldsList.filter(battlefield => battlefield.name.toLowerCase().includes(value))
                    .slice(0, 5); // Limit to top 5 results
                renderDropdownList(dropdownList, filteredBattlefields, field);
            });

            field.addEventListener('focus', function () {
                renderDropdownList(dropdownList, riftboundBattlefieldsList, field);
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

    // add click handler for commentator data
    function attachCommentatorDataUpdateClickListener() {
        const commentatorDataUpdateButton = document.querySelector(`#update-commentator-dropdowns`);

        commentatorDataUpdateButton.addEventListener('click', () => {
            commentatorData = extractCommentatorData();
            // send update to server to handle storage - unsure if this is needed?
            //socket.emit('bracket-updated', {bracketValues});
        });
    }

    // add click handlers for update global buttons
    function attachGlobalCommentatorsListener() {
        updateCommentators.addEventListener('click', () => {
            const data2send = {
                'global-commentator-1': commentator1().innerText,
                'global-commentator-1-subtext': commentator1_subtext().innerText,
                'global-commentator-2': commentator2().innerText,
                'global-commentator-2-subtext': commentator2_subtext().innerText,
                'global-commentator-3': commentator3().innerText,
                'global-commentator-3-subtext': commentator3_subtext().innerText,
                'global-commentator-4': commentator4().innerText,
                'global-commentator-4-subtext': commentator4_subtext().innerText
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

    // add click handlers for update event base timer button
    function attachGlobalBaseTimerUpdateListener() {
        updateEventInformationBaseTimer.addEventListener('click', () => {
            const data2send = {
                'global-event-base-timer': matchEventBaseTimer.innerText
            }
            console.log(data2send)
            socket.emit('update-event-information-base-timer-requested', {eventInformationData: data2send});
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

    // add click handlers for update event on miscellaneous global information
    function attachGlobalMiscellaneousInformationUpdateListener() {
        updateMiscellaneousInformation.addEventListener('click', () => {
            const fontFamilySelected = miscellaneousFontFamily.innerText;
            let fontFamilySelectedValue = null;
            if (fontFamilySelected) {
                const font = fontFamilies.find(f => f.name === fontFamilySelected);
                fontFamilySelectedValue = font ? font.value : null;
            }
            const data2send = {
                'global-font-family': fontFamilySelectedValue
            }
            console.log(data2send)
            socket.emit('update-global-miscellaneous-information', {miscellaneousData: data2send});
        })
    }

    // Commentator Data Function
    function extractCommentatorData() {
        // Select the parent container
        const commentatorDataText = document.getElementById('commentators-input').value;
        
        // Update commentatorData to be an object w/ pairs
        commentatorData = [];
        // split into array
        let comData = commentatorDataText.split(/\r?\n/);
        for (let i = 0; i < comData.length; i+=2) {
            if (i+1 < comData.length){
                let o = {
                    name: comData[i],
                    social: comData[i+1]
                }
                commentatorData.push(o);
            }
        }
        //console.log('commentatorData set', commentatorData);
        autoPopulateCommentatorDropdowns(commentatorData);
    }

    function autoPopulateCommentatorDropdowns(commentatorData) {
        //console.log('APCD - entered autopopulate comdata');

        // delete all pre-existing wrappers/dropdowns, we want to start from scratch each time
        // delete all wrappers
        document.querySelectorAll('.custom-dropdown.global-commentator').forEach(e => e.replaceWith(...e.childNodes));
        // delete all children dropdown lists
        document.querySelectorAll('.dropdown-list.global-commentator').forEach(e => e.remove());


        // grab name dropdown inputs
        let nameInputsForDeletion = document.querySelectorAll('[id^="global-commentator-"]:not([id^="global-commentator-subtext-"]).editable');
        // delete and remake all old nameInputs so that we can remove existing listeners
        nameInputsForDeletion.forEach(node => {
            const clone = node.cloneNode();
            node.replaceWith(clone);
        });

        // also clear all socials text
        document.querySelectorAll('[id^="global-commentator-subtext-"]').forEach(e => { e.innerText = '' })

        // grab name dropdown inputs
        let nameInputs = document.querySelectorAll('[id^="global-commentator-"]:not([id^="global-commentator-subtext-"]).editable');
        //console.log('APCD - ', nameInputs);

        // use commentatorData to populate dropdowns
        let namesFromComData = [...new Set(Object.values(commentatorData).map(commentator => commentator.name))];
        //console.log('APCD - ', namesFromComData);

        nameInputs.forEach(field => {
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-dropdown global-commentator';
            field.parentNode.insertBefore(wrapper, field);
            wrapper.appendChild(field);

            const dropdownList = document.createElement('div');
            dropdownList.className = 'dropdown-list global-commentator';
            wrapper.appendChild(dropdownList);

            field.addEventListener('input', function () {
                const value = this.textContent.trim().toLowerCase();
                const filteredNames = namesFromComData.filter(name => name.toLowerCase().includes(value));
                renderCommentatorDropdownList(dropdownList, filteredNames, field);
            });

            field.addEventListener('focus', function () {
                renderCommentatorDropdownList(dropdownList, namesFromComData, field);
            });

            field.addEventListener('change', function (e) {
                let s = commentatorData.find(n => n.name === e.target.innerText).social
                let subtext = document.getElementById('global-commentator-subtext-' + e.target.id.split('-')[2])
                subtext.innerText = s;
            })

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });
    }

    function renderCommentatorDropdownList(dropdownList, names, field) {
        dropdownList.innerHTML = '';
        names.forEach(name => {
            const div = document.createElement('div');
            div.textContent = name;
            div.classList.add('dropdown-item');
            div.addEventListener('click', function () {
                field.textContent = name;
                dropdownList.style.display = 'none';
                field.dispatchEvent(new Event('input'));
                field.dispatchEvent(new Event('change')); // Trigger change event
            });
            dropdownList.appendChild(div);
        });
        dropdownList.style.display = names.length > 0 ? 'block' : 'none';
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
            console.log('show / no show timer clicked', round_id, match_id, timerShowCheck.checked);
            if (timerShowCheck.checked) {
                updateTimerState(round_id, match_id, 'show');
            } else {
                updateTimerState(round_id, match_id, 'no-show');
            }
        });
    }

    // END TIMER FUNCTIONS

    // HIDE / SHOW WINS

    // attach listener for show wins checkbox on each match
    function attachMatchShowWinsCheckboxListener(round_id, match_id) {
        const winsShowCheck = document.querySelector(`#wins-display-scoreboard-${round_id}-${match_id}`);
        winsShowCheck.addEventListener('change', function () {
            console.log('show / no show wins clicked', round_id, match_id, winsShowCheck.checked);
            const data2send = {
                round_id: round_id,
                match_id: match_id,
                action: 'showWins',
                value: winsShowCheck.checked
            }
            console.log('sending scoreboard wins data', data2send);
            socket.emit('update-scoreboard-state', data2send);
        });
    }

    function updateMatchShowWinsCheckBox() {

    }

    // END HIDE / SHOW WINS

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
                                <div class="col-12 d-flex justify-content-between align-items-center">
                                    <h5 class="card-title mb-0">Standings</h5>
                                    <button class="btn btn-sm btn-secondary fetch-standings-btn" data-round-id="${roundId}">
                                        Fetch Standings
                                    </button>
                                </div>
                                <div class="col-12 mt-2">
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
    // attach global base timer update button lister
    attachGlobalBaseTimerUpdateListener();
    // attach global miscellaneous update button listener
    attachGlobalMiscellaneousInformationUpdateListener();
    // attach commentator data update button listener
    attachCommentatorDataUpdateClickListener();

    // setup sockets emitters

    // call for control data
    socket.emit('get-all-control-data');

    // call for control broadcast trackers data
    socket.emit('get-control-broadcast-trackers');

    // call for global data at start up
    socket.emit('get-match-global-data');

    // at the start, ask for all timer states from the server
    socket.emit('get-all-timer-states');

    // call for scoreboard state - for now its wins show check
    socket.emit('get-scoreboard-state');

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
        commentator1().innerText = data['globalData']['global-commentator-1'] ? data['globalData']['global-commentator-1'] : '';
        commentator1_subtext().innerText = data['globalData']['global-commentator-1-subtext'] ? data['globalData']['global-commentator-1-subtext'] : '';
        commentator2().innerText = data['globalData']['global-commentator-2'] ? data['globalData']['global-commentator-2'] : '';
        commentator2_subtext().innerText = data['globalData']['global-commentator-2-subtext'] ? data['globalData']['global-commentator-2-subtext'] : '';
        commentator3().innerText = data['globalData']['global-commentator-3'] ? data['globalData']['global-commentator-3'] : '';
        commentator3_subtext().innerText = data['globalData']['global-commentator-3-subtext'] ? data['globalData']['global-commentator-3-subtext'] : '';
        commentator4().innerText = data['globalData']['global-commentator-4'] ? data['globalData']['global-commentator-4'] : '';
        commentator4_subtext().innerText = data['globalData']['global-commentator-4-subtext'] ? data['globalData']['global-commentator-4-subtext'] : '';
        matchEventName.innerText = data['globalData']['global-event-name'] ? data['globalData']['global-event-name'] : '';
        matchEventFormat.innerText = data['globalData']['global-event-format'] ? data['globalData']['global-event-format'] : '';
        matchEventMiscDetails.innerText = data['globalData']['global-event-miscellaneous-details'] ? data['globalData']['global-event-miscellaneous-details'] : '';
        matchEventBaseLifePoints.innerText = data['globalData']['global-event-base-life-points'] ? data['globalData']['global-event-base-life-points'] : '20';
        matchEventBaseLifePointsCurrent.innerText = data['globalData']['global-event-base-life-points'] ? data['globalData']['global-event-base-life-points'] : '20';
        baseLifePoints = data['globalData']['global-event-base-life-points'] ? data['globalData']['global-event-base-life-points'] : '20';
        matchEventBaseTimer.innerText = data['globalData']['global-event-base-timer'] ? data['globalData']['global-event-base-timer'] : '50';
        matchEventBaseTimerCurrent.innerText = data['globalData']['global-event-base-timer'] ? data['globalData']['global-event-base-timer'] : '50';
        baseTimer = data['globalData']['global-event-base-timer'] ? data['globalData']['global-event-base-timer'] : '50';
        // try to set the font family
        if (data['globalData']['global-font-family']) {
            const font = fontFamilies.find(f => f.value === data['globalData']['global-font-family']);
            miscellaneousFontFamily.innerText = font ? font.name : null;
        } else {
            miscellaneousFontFamily.innerText = null;
        }
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

    // handle updates to full control data to update the page (initial load)
    socket.on('control-data-updated', (allData) => {
        console.log('Control data was updated', allData);
        // save to local object
        allControlData = allData;

        // Render the round tabs
        renderRoundTabs(allData);

        // Set up custom dropdowns after rendering
        setupCustomDropdowns();
    });

    // NEW: Granular field updates from control pages (real-time editing)
    socket.on('field-updated', ({round_id, match_id, field, value, timestamp}) => {
        console.log('Field updated', field, '=', value);
        
        // Ensure nested structure exists
        if (!allControlData[round_id]) allControlData[round_id] = {};
        if (!allControlData[round_id][match_id]) allControlData[round_id][match_id] = {};
        if (!allControlData[round_id][match_id]._timestamps) {
            allControlData[round_id][match_id]._timestamps = {};
        }
        
        // Conflict resolution: only update if newer timestamp
        const currentTimestamp = allControlData[round_id][match_id]._timestamps[field] || 0;
        if (timestamp > currentTimestamp) {
            allControlData[round_id][match_id][field] = value;
            allControlData[round_id][match_id]._timestamps[field] = timestamp;
            
            // Update ONLY the specific field in DOM
            const fieldElement = document.getElementById(`${round_id}-${match_id}-${field}`);
            if (fieldElement) {
                fieldElement.textContent = value;
            }
        }
    });

    // Function to toggle visibility of game-specific fields
    function toggleGameFields(gameSelection) {
        const showRiftbound = gameSelection === 'riftbound';
        const showMtg = gameSelection === 'mtg';

        const riftboundFields = document.querySelectorAll('.riftbound-only-field');
        riftboundFields.forEach(field => {
            field.style.display = showRiftbound ? 'block' : 'none';
        });

        const mtgFields = document.querySelectorAll('.mtg-only-field');
        mtgFields.forEach(field => {
            field.style.display = showMtg ? 'block' : 'none';
        });
    }

    // Listen for game selection changes
    socket.on('game-selection-updated', ({gameSelection}) => {
        currentGameSelection = gameSelection?.toLowerCase() || 'mtg';
        toggleGameFields(currentGameSelection);
    });

    socket.on('server-current-game-selection', ({gameSelection}) => {
        currentGameSelection = gameSelection?.toLowerCase() || 'mtg';
        toggleGameFields(currentGameSelection);
    });

    // Initial fetch of game selection
    socket.emit('get-game-selection');

    // Listen for updated archetype list from server
    socket.on('archetypeListUpdated', (archetypes) => {
        currentArchetypeList = archetypes; // Update the current archetype list
    });

    // Listen for updated scoreboard state from server
    socket.on('scoreboard-state-data', ({scoreboardState}) => {
        console.log('got server scoreboard state', scoreboardState);
        Object.keys(scoreboardState).forEach((roundId) => {
            Object.keys(scoreboardState[roundId]).forEach((matchId) => {
                const matchState = scoreboardState[roundId][matchId];
                const winsShowCheck = document.querySelector(`#wins-display-scoreboard-${roundId}-${matchId}`);
                if (winsShowCheck) {
                    winsShowCheck.checked = matchState.showWins;
                }
            });
        });
    })

    // end setup socket listeners

    // END START UP

}