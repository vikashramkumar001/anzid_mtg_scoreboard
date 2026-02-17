export function initMatches(socket) {

    const broadcastDisplay = document.getElementById('broadcasting-now-round-display');
    let currentGameSelection = 'mtg'; // Default to mtg
    let currentVendor = 'default';
    let currentPlayerCount = '1v1';
    const control1Display = document.getElementById('control-1-round-match-display');
    const control2Display = document.getElementById('control-2-round-match-display');
    const control3Display = document.getElementById('control-3-round-match-display');
    const control4Display = document.getElementById('control-4-round-match-display');
    const updateEventInformation = document.querySelector(`#global-update-event-information.update-button`);
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
    const matchEventNumberOfRounds = document.querySelector(`#global-event-number-of-rounds`);
    let allControlData = {};
    let allTimerStates = {};
    let allStandingsData = {};
    let baseLifePoints = '20';
    let baseTimer = '50';
    let currentArchetypeList = [];
    let swuLeadersList = [];
    let swuBasesList = [];
    let commentatorData = {};
    
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
                <div class="col-4 d-flex flex-row justify-content-start align-items-center" style="position: relative; z-index: 1;">
                    <h3 class="match-id-name mb-0">${roundId}-${matchId}</h3>
                    <div class="ms-3 d-flex align-items-center">
                        <label class="form-label me-2 mb-0" style="white-space: nowrap;">Table #</label>
                        <input type="number" id="table-number-${roundId}-${matchId}"
                               class="form-control form-control-sm" style="width: 70px;"
                               placeholder="1" min="1">
                        <button class="btn btn-sm btn-info ms-2 fetch-table-btn"
                                id="fetch-table-${roundId}-${matchId}"
                                data-round-id="${roundId}" data-match-id="${matchId}">
                            Fetch
                        </button>
                    </div>
                </div>
                <div class="col-8 d-flex flex-row justify-content-end flex-wrap">
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
                                    <label class="ms-3">
                                        <input type="checkbox" id="timer-count-up-${roundId}-${matchId}"> Count Up
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
                            <div class="mb-3 life-points-field">
                                <label class="form-label">LifePoints</label>
                                <div class="d-flex align-items-center">
                                    <button class="btn btn-sm btn-outline-danger mtg-only-field life-btn-5" data-life-target="${roundId}-${matchId}-player-life-left" data-life-delta="-5">-5</button>
                                    <button class="btn btn-sm btn-outline-secondary life-btn" data-life-target="${roundId}-${matchId}-player-life-left" data-life-delta="-1">-1</button>
                                    <div id="${roundId}-${matchId}-player-life-left" class="editable form-control text-center mx-1" contenteditable="true"></div>
                                    <button class="btn btn-sm btn-outline-secondary life-btn" data-life-target="${roundId}-${matchId}-player-life-left" data-life-delta="1">+1</button>
                                    <button class="btn btn-sm btn-outline-success mtg-only-field life-btn-5" data-life-target="${roundId}-${matchId}-player-life-left" data-life-delta="5">+5</button>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Pronouns</label>
                                <div id="${roundId}-${matchId}-player-pronouns-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 archetype-field">
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
                                <div class="d-flex align-items-center">
                                    <button class="btn btn-sm btn-outline-secondary wins-minus-btn" data-target="${roundId}-${matchId}-player-wins-left">-</button>
                                    <div id="${roundId}-${matchId}-player-wins-left" class="editable form-control text-center mx-1" contenteditable="false" style="width: 50px;">0</div>
                                    <button class="btn btn-sm btn-outline-secondary wins-plus-btn" data-target="${roundId}-${matchId}-player-wins-left">+</button>
                                </div>
                            </div>
                            <div class="mb-3 mtg-only-field">
                                <label class="form-label">Poison</label>
                                <div id="${roundId}-${matchId}-player-poison-left" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3" style="display: none;">
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
                                <div class="d-flex align-items-center mb-1">
                                    <input type="radio" name="${roundId}-${matchId}-bf-left-select" class="form-check-input me-2 battlefield-radio" data-side="left" data-round="${roundId}" data-match="${matchId}" data-bf="1" value="1" checked>
                                    <div id="${roundId}-${matchId}-player-battlefield-1-left" class="editable form-control battlefield-input" contenteditable="true"></div>
                                </div>
                                <div class="d-flex align-items-center mb-1">
                                    <input type="radio" name="${roundId}-${matchId}-bf-left-select" class="form-check-input me-2 battlefield-radio" data-side="left" data-round="${roundId}" data-match="${matchId}" data-bf="2" value="2">
                                    <div id="${roundId}-${matchId}-player-battlefield-2-left" class="editable form-control battlefield-input" contenteditable="true"></div>
                                </div>
                                <div class="d-flex align-items-center">
                                    <input type="radio" name="${roundId}-${matchId}-bf-left-select" class="form-check-input me-2 battlefield-radio" data-side="left" data-round="${roundId}" data-match="${matchId}" data-bf="3" value="3">
                                    <div id="${roundId}-${matchId}-player-battlefield-3-left" class="editable form-control battlefield-input" contenteditable="true"></div>
                                </div>
                            </div>
                            <div id="${roundId}-${matchId}-player-battlefield-left" class="editable" style="display:none;"></div>
                            <div class="mb-3 starwars-only-field" style="display: none;">
                                <label class="form-label">Leader & Aspects</label>
                                <div id="${roundId}-${matchId}-player-leader-left" class="editable form-control" contenteditable="true"></div>
                                <div class="d-flex gap-2 mt-1">
                                    <div id="${roundId}-${matchId}-player-leader-aspect-1-left" class="editable form-control" contenteditable="true" placeholder="aspect 1" style="flex: 1;"></div>
                                    <div id="${roundId}-${matchId}-player-leader-aspect-2-left" class="editable form-control" contenteditable="true" placeholder="aspect 2" style="flex: 1;"></div>
                                </div>
                            </div>
                            <div class="mb-3 starwars-only-field" style="display: none;">
                                <label class="form-label">Base & Aspect</label>
                                <div class="d-flex gap-2">
                                    <div id="${roundId}-${matchId}-player-base-left" class="editable form-control" contenteditable="true" style="flex: 1;"></div>
                                    <div id="${roundId}-${matchId}-player-base-aspects-left" class="editable form-control" contenteditable="true" placeholder="aspect" style="width: 120px; flex-shrink: 0;"></div>
                                </div>
                            </div>
                            <div class="mb-3 starwars-only-field" style="display: none;">
                                <div class="d-flex gap-3 swu-base-stats-container">
                                    <div>
                                        <label class="form-label">Base HP</label>
                                        <div class="d-flex align-items-center">
                                            <button class="btn btn-sm btn-outline-secondary life-btn" data-life-target="${roundId}-${matchId}-player-base-hp-left" data-life-delta="-1">-1</button>
                                            <div id="${roundId}-${matchId}-player-base-hp-left" class="editable form-control text-center mx-1" contenteditable="true" style="width: 60px;">30</div>
                                            <button class="btn btn-sm btn-outline-secondary life-btn" data-life-target="${roundId}-${matchId}-player-base-hp-left" data-life-delta="1">+1</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Player Information -->
                        <div class="col-md-6">
                            <h5 class="card-title">Right Player</h5>
                            <div class="mb-3">
                                <label class="form-label">Player Name</label>
                                <div id="${roundId}-${matchId}-player-name-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 life-points-field">
                                <label class="form-label">LifePoints</label>
                                <div class="d-flex align-items-center">
                                    <button class="btn btn-sm btn-outline-danger mtg-only-field life-btn-5" data-life-target="${roundId}-${matchId}-player-life-right" data-life-delta="-5">-5</button>
                                    <button class="btn btn-sm btn-outline-secondary life-btn" data-life-target="${roundId}-${matchId}-player-life-right" data-life-delta="-1">-1</button>
                                    <div id="${roundId}-${matchId}-player-life-right" class="editable form-control text-center mx-1" contenteditable="true"></div>
                                    <button class="btn btn-sm btn-outline-secondary life-btn" data-life-target="${roundId}-${matchId}-player-life-right" data-life-delta="1">+1</button>
                                    <button class="btn btn-sm btn-outline-success mtg-only-field life-btn-5" data-life-target="${roundId}-${matchId}-player-life-right" data-life-delta="5">+5</button>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Pronouns</label>
                                <div id="${roundId}-${matchId}-player-pronouns-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3 archetype-field">
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
                                <div class="d-flex align-items-center">
                                    <button class="btn btn-sm btn-outline-secondary wins-minus-btn" data-target="${roundId}-${matchId}-player-wins-right">-</button>
                                    <div id="${roundId}-${matchId}-player-wins-right" class="editable form-control text-center mx-1" contenteditable="false" style="width: 50px;">0</div>
                                    <button class="btn btn-sm btn-outline-secondary wins-plus-btn" data-target="${roundId}-${matchId}-player-wins-right">+</button>
                                </div>
                            </div>
                            <div class="mb-3 mtg-only-field">
                                <label class="form-label">Poison</label>
                                <div id="${roundId}-${matchId}-player-poison-right" class="editable form-control" contenteditable="true"></div>
                            </div>
                            <div class="mb-3" style="display: none;">
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
                                <div class="d-flex align-items-center mb-1">
                                    <input type="radio" name="${roundId}-${matchId}-bf-right-select" class="form-check-input me-2 battlefield-radio" data-side="right" data-round="${roundId}" data-match="${matchId}" data-bf="1" value="1" checked>
                                    <div id="${roundId}-${matchId}-player-battlefield-1-right" class="editable form-control battlefield-input" contenteditable="true"></div>
                                </div>
                                <div class="d-flex align-items-center mb-1">
                                    <input type="radio" name="${roundId}-${matchId}-bf-right-select" class="form-check-input me-2 battlefield-radio" data-side="right" data-round="${roundId}" data-match="${matchId}" data-bf="2" value="2">
                                    <div id="${roundId}-${matchId}-player-battlefield-2-right" class="editable form-control battlefield-input" contenteditable="true"></div>
                                </div>
                                <div class="d-flex align-items-center">
                                    <input type="radio" name="${roundId}-${matchId}-bf-right-select" class="form-check-input me-2 battlefield-radio" data-side="right" data-round="${roundId}" data-match="${matchId}" data-bf="3" value="3">
                                    <div id="${roundId}-${matchId}-player-battlefield-3-right" class="editable form-control battlefield-input" contenteditable="true"></div>
                                </div>
                            </div>
                            <div id="${roundId}-${matchId}-player-battlefield-right" class="editable" style="display:none;"></div>
                            <div class="mb-3 starwars-only-field" style="display: none;">
                                <label class="form-label">Leader & Aspects</label>
                                <div id="${roundId}-${matchId}-player-leader-right" class="editable form-control" contenteditable="true"></div>
                                <div class="d-flex gap-2 mt-1">
                                    <div id="${roundId}-${matchId}-player-leader-aspect-1-right" class="editable form-control" contenteditable="true" placeholder="aspect 1" style="flex: 1;"></div>
                                    <div id="${roundId}-${matchId}-player-leader-aspect-2-right" class="editable form-control" contenteditable="true" placeholder="aspect 2" style="flex: 1;"></div>
                                </div>
                            </div>
                            <div class="mb-3 starwars-only-field" style="display: none;">
                                <label class="form-label">Base & Aspect</label>
                                <div class="d-flex gap-2">
                                    <div id="${roundId}-${matchId}-player-base-right" class="editable form-control" contenteditable="true" style="flex: 1;"></div>
                                    <div id="${roundId}-${matchId}-player-base-aspects-right" class="editable form-control" contenteditable="true" placeholder="aspect" style="width: 120px; flex-shrink: 0;"></div>
                                </div>
                            </div>
                            <div class="mb-3 starwars-only-field" style="display: none;">
                                <div class="d-flex gap-3 swu-base-stats-container">
                                    <div>
                                        <label class="form-label">Base HP</label>
                                        <div class="d-flex align-items-center">
                                            <button class="btn btn-sm btn-outline-secondary life-btn" data-life-target="${roundId}-${matchId}-player-base-hp-right" data-life-delta="-1">-1</button>
                                            <div id="${roundId}-${matchId}-player-base-hp-right" class="editable form-control text-center mx-1" contenteditable="true" style="width: 60px;">30</div>
                                            <button class="btn btn-sm btn-outline-secondary life-btn" data-life-target="${roundId}-${matchId}-player-base-hp-right" data-life-delta="1">+1</button>
                                        </div>
                                    </div>
                                </div>
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
            // Attach fetch table button listener
            attachFetchTableButtonListener(roundId, matchId);
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
                const fieldKey = field.id.replace(`${roundId}-${matchId}-`, '');
                if (fieldKey.includes('leader') || fieldKey.includes('base')) {
                    console.log('[SWU DEBUG MC] General input handler fired:', fieldKey, '=', value);
                }
                updateControlData(roundId, matchId, fieldKey, value);
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

    function renderSWUDropdownList(dropdownList, items, field, onSelect, nameTransform) {
        dropdownList.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.classList.add('dropdown-item', 'd-flex', 'align-items-center');
            // Render aspect icons to the left
            (item.aspects || []).forEach(aspect => {
                const img = document.createElement('img');
                img.src = `/assets/images/starwars/icons/${aspect}.png`;
                img.alt = aspect;
                img.style.width = '20px';
                img.style.height = '20px';
                img.style.marginRight = '4px';
                div.appendChild(img);
            });
            // Card name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = item.name;
            div.appendChild(nameSpan);
            div.addEventListener('click', () => {
                console.log('[SWU DEBUG MC] Dropdown click:', item.name, '→ field:', field.id);
                field.textContent = nameTransform ? nameTransform(item.name) : item.name;
                dropdownList.style.display = 'none';
                field.dispatchEvent(new Event('input'));
                field.dispatchEvent(new Event('change'));
                if (onSelect) onSelect(item);
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

        // Setup SWU Leader autocomplete dropdowns
        const swuLeaderFields = document.querySelectorAll('[id$="-player-leader-left"], [id$="-player-leader-right"]');
        swuLeaderFields.forEach(field => {
            if (field.parentNode.classList.contains('custom-dropdown')) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-dropdown';
            field.parentNode.insertBefore(wrapper, field);
            wrapper.appendChild(field);
            const dropdownList = document.createElement('div');
            dropdownList.className = 'dropdown-list';
            wrapper.appendChild(dropdownList);

            const onSelect = (item) => {
                // Auto-fill leader aspect boxes (two separate fields)
                const aspects = (item.aspects || []).map(a => a.toLowerCase());
                const aspect1Id = field.id.replace('player-leader-', 'player-leader-aspect-1-');
                const aspect2Id = field.id.replace('player-leader-', 'player-leader-aspect-2-');
                const aspect1Field = document.getElementById(aspect1Id);
                const aspect2Field = document.getElementById(aspect2Id);
                if (aspect1Field) {
                    aspect1Field.textContent = aspects[0] || '';
                    aspect1Field.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (aspect2Field) {
                    aspect2Field.textContent = aspects[1] || '';
                    aspect2Field.dispatchEvent(new Event('input', { bubbles: true }));
                }
            };

            field.addEventListener('input', function () {
                const value = this.textContent.trim().toLowerCase();
                const filtered = swuLeadersList
                    .filter(l => l.name.toLowerCase().includes(value))
                    .slice(0, 10);
                renderSWUDropdownList(dropdownList, filtered, field, onSelect);
            });
            field.addEventListener('focus', function () {
                renderSWUDropdownList(dropdownList, swuLeadersList.slice(0, 10), field, onSelect);
            });
            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) dropdownList.style.display = 'none';
            });
        });

        // Setup SWU Base autocomplete dropdowns
        const stripBaseTrait = (name) => name.split(' - ')[0].trim();
        const swuBaseFields = document.querySelectorAll('[id$="-player-base-left"], [id$="-player-base-right"]');
        swuBaseFields.forEach(field => {
            if (field.parentNode.classList.contains('custom-dropdown')) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-dropdown';
            field.parentNode.insertBefore(wrapper, field);
            wrapper.appendChild(field);
            const dropdownList = document.createElement('div');
            dropdownList.className = 'dropdown-list';
            wrapper.appendChild(dropdownList);

            const onSelect = (item) => {
                // Auto-fill base aspects field
                const aspectsFieldId = field.id.replace('player-base-', 'player-base-aspects-');
                const aspectsField = document.getElementById(aspectsFieldId);
                if (aspectsField) {
                    aspectsField.textContent = (item.aspects || []).join(', ').toLowerCase();
                    aspectsField.dispatchEvent(new Event('input', { bubbles: true }));
                }
                // Auto-fill base HP
                if (item.hp) {
                    const hpFieldId = field.id.replace('player-base-', 'player-base-hp-');
                    const hpField = document.getElementById(hpFieldId);
                    if (hpField) {
                        hpField.textContent = item.hp;
                        hpField.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            };

            field.addEventListener('input', function () {
                const value = this.textContent.trim().toLowerCase();
                const filtered = swuBasesList
                    .filter(b => b.name.toLowerCase().includes(value))
                    .slice(0, 10);
                renderSWUDropdownList(dropdownList, filtered, field, onSelect, stripBaseTrait);
            });
            field.addEventListener('focus', function () {
                renderSWUDropdownList(dropdownList, swuBasesList.slice(0, 10), field, onSelect, stripBaseTrait);
            });
            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) dropdownList.style.display = 'none';
            });
        });

        // Setup SWU Aspect autocomplete dropdowns (leader aspects + base aspects)
        const swuAspectOptions = ['Aggression', 'Command', 'Cunning', 'Heroism', 'Vigilance', 'Villainy'];
        const swuAspectFields = document.querySelectorAll(
            '[id$="-player-leader-aspect-1-left"], [id$="-player-leader-aspect-1-right"], ' +
            '[id$="-player-leader-aspect-2-left"], [id$="-player-leader-aspect-2-right"], ' +
            '[id$="-player-base-aspects-left"], [id$="-player-base-aspects-right"]'
        );
        swuAspectFields.forEach(field => {
            if (field.parentNode.classList.contains('custom-dropdown')) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-dropdown';
            // Transfer flex styling from field to wrapper so flex layout is preserved
            if (field.style.flex) {
                wrapper.style.flex = field.style.flex;
                field.style.flex = '';
            }
            if (field.style.width && field.style.flexShrink) {
                wrapper.style.width = field.style.width;
                wrapper.style.flexShrink = field.style.flexShrink;
                field.style.width = '100%';
                field.style.flexShrink = '';
            }
            field.parentNode.insertBefore(wrapper, field);
            wrapper.appendChild(field);
            const dropdownList = document.createElement('div');
            dropdownList.className = 'dropdown-list';
            wrapper.appendChild(dropdownList);

            const renderAspectDropdown = (filter) => {
                dropdownList.innerHTML = '';
                const filtered = swuAspectOptions.filter(a => a.toLowerCase().includes(filter.toLowerCase()));
                filtered.forEach(aspect => {
                    const div = document.createElement('div');
                    div.classList.add('dropdown-item', 'd-flex', 'align-items-center');
                    const img = document.createElement('img');
                    img.src = `/assets/images/starwars/icons/${aspect}.png`;
                    img.alt = aspect;
                    img.style.width = '20px';
                    img.style.height = '20px';
                    img.style.marginRight = '6px';
                    div.appendChild(img);
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = aspect;
                    div.appendChild(nameSpan);
                    div.addEventListener('click', () => {
                        field.textContent = aspect.toLowerCase();
                        dropdownList.style.display = 'none';
                        field.dispatchEvent(new Event('input', { bubbles: true }));
                        field.dispatchEvent(new Event('change'));
                    });
                    dropdownList.appendChild(div);
                });
                dropdownList.style.display = filtered.length > 0 ? 'block' : 'none';
            };

            field.addEventListener('input', function () {
                renderAspectDropdown(this.textContent.trim());
            });
            field.addEventListener('focus', function () {
                renderAspectDropdown('');
            });
            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) dropdownList.style.display = 'none';
            });
        });
    }

    // Add these functions to your existing script section
    function renderRoundTabs(allData) {
        const roundTabs = document.getElementById('roundTabs');
        const roundContent = document.getElementById('roundTabsContent');

        if (roundTabs.children.length === 0 && roundContent.children.length === 0) {
            // Create tabs and content for each round
            Object.keys(allData).filter(roundId => !isNaN(roundId)).forEach((roundId, index) => {
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
        Object.keys(allData).filter(roundId => !isNaN(roundId)).forEach((roundId) => {
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
            // Also reset Star Wars base HP if in Star Wars mode
            if (currentGameSelection === 'starwars') {
                const bhl = document.querySelector(`[id="${round_id}-${match_id}-player-base-hp-left"]`);
                const bhr = document.querySelector(`[id="${round_id}-${match_id}-player-base-hp-right"]`);
                if (bhl) { bhl.innerText = '30'; allControlData[round_id][match_id]['player-base-hp-left'] = '30'; }
                if (bhr) { bhr.innerText = '30'; allControlData[round_id][match_id]['player-base-hp-right'] = '30'; }
            }
            // update server since control data changed
            socket.emit('master-control-matches-updated', allControlData);
        })
    }

    // Delegated click handler for life +/- buttons
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.life-btn, .life-btn-5');
        if (!btn) return;
        const targetId = btn.dataset.lifeTarget;
        const delta = parseInt(btn.dataset.lifeDelta);
        const lifeEl = document.getElementById(targetId);
        if (!lifeEl) return;
        let current = parseInt(lifeEl.innerText) || 0;
        lifeEl.innerText = current + delta;
        lifeEl.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Delegated change handler for battlefield radio buttons
    // When a radio is selected, copy that battlefield's text into the hidden player-battlefield field
    document.addEventListener('change', (e) => {
        if (!e.target.classList.contains('battlefield-radio')) return;
        const radio = e.target;
        const { side, round, match, bf } = radio.dataset;
        const sourceEl = document.getElementById(`${round}-${match}-player-battlefield-${bf}-${side}`);
        const mainField = document.getElementById(`${round}-${match}-player-battlefield-${side}`);
        if (sourceEl && mainField) {
            mainField.innerText = sourceEl.innerText;
            mainField.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    // Delegated input handler for battlefield text fields
    // When editing a battlefield input, sync to the hidden field if this battlefield's radio is selected
    document.addEventListener('input', (e) => {
        if (!e.target.classList.contains('battlefield-input')) return;
        const fieldId = e.target.id; // e.g. "1-match1-player-battlefield-2-left"
        const match = fieldId.match(/^(.+)-player-battlefield-(\d)-(left|right)$/);
        if (!match) return;
        const [, prefix, bfNum, side] = match;
        const radioName = `${prefix}-bf-${side}-select`;
        const selectedRadio = document.querySelector(`input[name="${radioName}"]:checked`);
        if (selectedRadio && selectedRadio.dataset.bf === bfNum) {
            const mainField = document.getElementById(`${prefix}-player-battlefield-${side}`);
            if (mainField) {
                mainField.innerText = e.target.innerText;
                mainField.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    });

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
                'global-event-base-timer': matchEventBaseTimer.innerText,
                'global-event-number-of-rounds': matchEventNumberOfRounds.innerText
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
        const timerCountUpCheck = document.querySelector(`#timer-count-up-${round_id}-${match_id}`);
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
        timerCountUpCheck.addEventListener('change', function () {
            console.log('count up / count down clicked', round_id, match_id, timerCountUpCheck.checked);
            if (timerCountUpCheck.checked) {
                updateTimerState(round_id, match_id, 'count-up');
            } else {
                updateTimerState(round_id, match_id, 'count-down');
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

    // FETCH TABLE DATA

    // Add event listener for fetch table button
    function attachFetchTableButtonListener(round_id, match_id) {
        const fetchButton = document.querySelector(`#fetch-table-${round_id}-${match_id}`);
        const tableInput = document.querySelector(`#table-number-${round_id}-${match_id}`);

        fetchButton.addEventListener('click', () => {
            const platform = document.getElementById('tournament-platform-select')?.value;
            const tournamentId = document.getElementById('tournament-id-input')?.value?.trim();
            const tableNumber = tableInput.value;

            if (!platform || platform === 'manual') {
                alert('Please select a platform (Melee.gg or TopDeck.gg) in Global Settings.');
                return;
            }

            if (!tournamentId) {
                alert('Please enter a tournament ID in Global Settings.');
                return;
            }

            if (!tableNumber) {
                alert('Please enter a table number.');
                return;
            }

            // Show loading state
            const originalText = fetchButton.textContent;
            fetchButton.disabled = true;
            fetchButton.textContent = 'Fetching...';
            fetchButton.dataset.fetching = 'true';
            fetchButton.dataset.roundId = round_id;
            fetchButton.dataset.matchId = match_id;

            // Emit fetch request
            socket.emit('fetch-match-by-table', {
                tournamentId,
                roundNumber: round_id,
                tableNumber,
                platform
            });
        });
    }

    // WINS +/- BUTTONS (event delegation)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('wins-plus-btn') || e.target.classList.contains('wins-minus-btn')) {
            const targetId = e.target.dataset.target;
            const winsEl = document.getElementById(targetId);
            if (!winsEl) return;
            let current = parseInt(winsEl.textContent) || 0;
            if (e.target.classList.contains('wins-plus-btn')) {
                current++;
            } else {
                current = Math.max(0, current - 1);
            }
            winsEl.textContent = current.toString();
            winsEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    // END FETCH TABLE DATA

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
        matchEventNumberOfRounds.innerText = data['globalData']['global-event-number-of-rounds'] ? data['globalData']['global-event-number-of-rounds'] : '15';
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
                    // For count up mode, always show the time (never show TURNS)
                    // For count down mode, show TURNS when time reaches 0
                    if (matchState.countUp) {
                        timerElement.innerText = formatTime(matchState.time);
                    } else {
                        timerElement.innerText = matchState.time > 0 ? formatTime(matchState.time) : 'TURNS';
                    }
                }
                const timerShowCheck = document.querySelector(`#timer-display-scoreboard-${roundId}-${matchId}`);
                if (timerShowCheck) {
                    timerShowCheck.checked = matchState.show;
                }
                const timerCountUpCheck = document.querySelector(`#timer-count-up-${roundId}-${matchId}`);
                if (timerCountUpCheck) {
                    timerCountUpCheck.checked = matchState.countUp;
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
        const showStarwars = gameSelection === 'starwars';
        const showArchetype = showMtg || gameSelection === 'vibes';

        document.querySelectorAll('.riftbound-only-field').forEach(field => {
            field.style.display = showRiftbound ? 'block' : 'none';
        });

        document.querySelectorAll('.mtg-only-field').forEach(field => {
            field.style.display = showMtg ? 'block' : 'none';
        });

        document.querySelectorAll('.starwars-only-field').forEach(field => {
            field.style.display = showStarwars ? 'block' : 'none';
        });

        document.querySelectorAll('.archetype-field').forEach(field => {
            field.style.display = showArchetype ? 'block' : 'none';
        });

        document.querySelectorAll('.life-points-field').forEach(field => {
            if (showStarwars) {
                // Save original position for moving back later
                if (!field._originalParent) {
                    field._originalParent = field.parentElement;
                    field._originalNextSibling = field.nextElementSibling;
                }
                // Move into the Star Wars base stats container (before Base HP)
                const matchCol = field.closest('.col-md-6');
                const statsContainer = matchCol?.querySelector('.swu-base-stats-container');
                if (statsContainer) {
                    statsContainer.insertBefore(field, statsContainer.firstChild);
                }
                field.querySelector('.form-label').textContent = 'Base Damage';
                field.style.display = 'block';
            } else {
                // Move back to original position
                if (field._originalParent) {
                    field._originalParent.insertBefore(field, field._originalNextSibling);
                }
                field.querySelector('.form-label').textContent = 'LifePoints';
                field.style.display = 'block';
            }
        });
    }

    // Function to update theme with vendor overrides
    function updateTheme(game, vendor, playerCount) {
        toggleGameFields(game);
        // Apply vendor overrides
        const vc = window.VENDOR_CONFIG;
        if (vc) {
            vc.getAllOverrideProperties().forEach(prop => {
                document.documentElement.style.removeProperty(prop);
            });
            const overrides = vc.getOverrides(game, vendor);
            Object.entries(overrides).forEach(([prop, value]) => {
                document.documentElement.style.setProperty(prop, value);
            });
        }
    }

    // Listen for game selection changes
    socket.on('server-current-game-selection', ({gameSelection}) => {
        currentGameSelection = gameSelection?.toLowerCase() || 'mtg';
        updateTheme(currentGameSelection, currentVendor, currentPlayerCount);
    });
    socket.on('game-selection-updated', ({gameSelection}) => {
        currentGameSelection = gameSelection?.toLowerCase() || 'mtg';
        updateTheme(currentGameSelection, currentVendor, currentPlayerCount);
    });
    socket.on('server-current-vendor-selection', ({vendorSelection}) => {
        currentVendor = vendorSelection;
        updateTheme(currentGameSelection, currentVendor, currentPlayerCount);
    });
    socket.on('vendor-selection-updated', ({vendorSelection}) => {
        currentVendor = vendorSelection;
        updateTheme(currentGameSelection, currentVendor, currentPlayerCount);
    });
    socket.on('server-current-player-count', ({playerCount}) => {
        currentPlayerCount = playerCount;
        updateTheme(currentGameSelection, currentVendor, currentPlayerCount);
    });
    socket.on('player-count-updated', ({playerCount}) => {
        currentPlayerCount = playerCount;
        updateTheme(currentGameSelection, currentVendor, currentPlayerCount);
    });

    // Initial fetch of game selection, vendor, and player count
    socket.emit('get-game-selection');
    socket.emit('get-vendor-selection');
    socket.emit('get-player-count');

    // Listen for updated archetype list from server
    socket.on('archetypeListUpdated', (archetypes) => {
        currentArchetypeList = archetypes; // Update the current archetype list
    });

    // Fetch SWU leaders and bases for dropdowns
    socket.emit('starwars-get-leaders-and-bases');
    socket.on('starwars-leaders-and-bases', ({ leaders, bases }) => {
        swuLeadersList = leaders;
        swuBasesList = bases;
        setupCustomDropdowns(); // Re-run to set up SWU dropdowns
    });

    // Listen for match-by-table fetch response
    socket.on('match-by-table-fetched', (result) => {
        // Find the button that was fetching and reset it
        const fetchingButton = document.querySelector('.fetch-table-btn[data-fetching="true"]');
        if (fetchingButton) {
            fetchingButton.disabled = false;
            fetchingButton.textContent = 'Fetch';
            delete fetchingButton.dataset.fetching;

            const roundId = fetchingButton.dataset.roundId;
            const matchId = fetchingButton.dataset.matchId;

            if (result.error) {
                alert('Error fetching match data: ' + result.error);
                return;
            }

            if (result.matchData) {
                const { player1, player2 } = result.matchData;

                // Populate left player fields
                const nameLeft = document.getElementById(`${roundId}-${matchId}-player-name-left`);
                const archetypeLeft = document.getElementById(`${roundId}-${matchId}-player-archetype-left`);
                const pronounsLeft = document.getElementById(`${roundId}-${matchId}-player-pronouns-left`);
                const recordLeft = document.getElementById(`${roundId}-${matchId}-player-record-left`);
                if (nameLeft) {
                    nameLeft.textContent = player1.name || '';
                    nameLeft.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (archetypeLeft) {
                    archetypeLeft.textContent = player1.archetype || '';
                    archetypeLeft.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (pronounsLeft) {
                    pronounsLeft.textContent = player1.pronouns || '';
                    pronounsLeft.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (recordLeft) {
                    recordLeft.textContent = player1.record || '';
                    recordLeft.dispatchEvent(new Event('input', { bubbles: true }));
                }

                // Populate right player fields
                const nameRight = document.getElementById(`${roundId}-${matchId}-player-name-right`);
                const archetypeRight = document.getElementById(`${roundId}-${matchId}-player-archetype-right`);
                const pronounsRight = document.getElementById(`${roundId}-${matchId}-player-pronouns-right`);
                const recordRight = document.getElementById(`${roundId}-${matchId}-player-record-right`);
                if (nameRight) {
                    nameRight.textContent = player2.name || '';
                    nameRight.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (archetypeRight) {
                    archetypeRight.textContent = player2.archetype || '';
                    archetypeRight.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (pronounsRight) {
                    pronounsRight.textContent = player2.pronouns || '';
                    pronounsRight.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (recordRight) {
                    recordRight.textContent = player2.record || '';
                    recordRight.dispatchEvent(new Event('input', { bubbles: true }));
                }

                console.log('Match data populated for table', result.matchData.tableNumber);

                // Auto-fetch decklists if decklistIds are available
                if (player1.decklistId) {
                    socket.emit('fetch-decklist-by-id', {
                        decklistId: player1.decklistId,
                        side: 'left',
                        matchId,
                        roundId,
                        game: currentGameSelection
                    });
                }
                if (player2.decklistId) {
                    socket.emit('fetch-decklist-by-id', {
                        decklistId: player2.decklistId,
                        side: 'right',
                        matchId,
                        roundId,
                        game: currentGameSelection
                    });
                }
            }
        }
    });

    // Listen for decklist fetch response (auto-populate main-deck textarea and leader/base fields)
    socket.on('decklist-fetched', ({ side, matchId, roundId, mainDeck, sideboard, leader, base, error }) => {
        if (error) {
            console.warn('Decklist fetch error:', error);
            return;
        }

        // Populate main-deck textarea with card lines
        const deckTextarea = document.getElementById(`${roundId}-${matchId}-player-main-deck-${side}`);
        if (deckTextarea) {
            const lines = [...(mainDeck || [])];
            if (sideboard && sideboard.length > 0) {
                lines.push('');
                lines.push('Sideboard');
                lines.push(...sideboard);
            }
            deckTextarea.value = lines.join('\n');
            deckTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Populate leader field and aspects
        if (leader) {
            const leaderField = document.getElementById(`${roundId}-${matchId}-player-leader-${side}`);
            if (leaderField) {
                leaderField.textContent = leader.name || '';
                leaderField.dispatchEvent(new Event('input', { bubbles: true }));
            }
            // Auto-fill leader aspects
            if (leader.aspects && leader.aspects.length > 0) {
                const aspects = leader.aspects.map(a => a.toLowerCase());
                const aspect1Field = document.getElementById(`${roundId}-${matchId}-player-leader-aspect-1-${side}`);
                const aspect2Field = document.getElementById(`${roundId}-${matchId}-player-leader-aspect-2-${side}`);
                if (aspect1Field) {
                    aspect1Field.textContent = aspects[0] || '';
                    aspect1Field.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (aspect2Field) {
                    aspect2Field.textContent = aspects[1] || '';
                    aspect2Field.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }

        // Populate base field, aspects, and HP
        if (base) {
            const baseField = document.getElementById(`${roundId}-${matchId}-player-base-${side}`);
            if (baseField) {
                baseField.textContent = base.name || '';
                baseField.dispatchEvent(new Event('input', { bubbles: true }));
            }
            // Auto-fill base aspects
            if (base.aspects && base.aspects.length > 0) {
                const aspectsField = document.getElementById(`${roundId}-${matchId}-player-base-aspects-${side}`);
                if (aspectsField) {
                    aspectsField.textContent = base.aspects.map(a => a.toLowerCase()).join(', ');
                    aspectsField.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            // Auto-fill base HP
            if (base.hp) {
                const hpField = document.getElementById(`${roundId}-${matchId}-player-base-hp-${side}`);
                if (hpField) {
                    hpField.textContent = base.hp;
                    hpField.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }

        console.log(`Decklist populated for ${side} player in ${roundId}-${matchId}`);
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