export function initBrackets(socket) {

    let bracketData = {};
    let standingsDataRaw = '';
    let standingsDataParsed = {};
    let namesFromStandings = [];

    const standingsSubmitButton = document.getElementById('bracket-standings-update-button');
    const standingsInput = document.getElementById('brackets-standings-input');

    // send request for bracket data - we can do this because the html for bracket is hardcoded at start
    socket.emit('get-bracket-data');

    socket.on('bracket-data', ({bracketData: bracketDataFromServer}) => {
        console.log('got bracket data', bracketDataFromServer);
        bracketData = bracketDataFromServer;
        // populate all standings text boxes per round
        populateBracketData();
    })

    function populateBracketData() {
        Object.keys(bracketData).forEach((bracket_id) => {
            renderBracket(bracket_id);
        })
    }

    function renderBracket(bracket_id) {
        let bracketField = document.getElementById(`${bracket_id}`);
        bracketField.innerHTML = bracketData[bracket_id];
    }

    // function to gather bracket data when update is clicked
    function attachBracketUpdateClickListener() {
        const bracketUpdateButton = document.querySelector(`#bracket-update-button`);

        bracketUpdateButton.addEventListener('click', () => {
            const bracketValues = extractBracketData();
            // send update to server to handle storage
            socket.emit('bracket-updated', {bracketValues});
        });
    }

    // actually call the attach button listener
    attachBracketUpdateClickListener();

    function extractBracketData() {
        // Select the parent container
        const bracketControl = document.querySelector('#bracket-control');

        // Select all child divs within the container with class 'editable' and IDs starting with 'bracket-'
        const bracketFields = bracketControl.querySelectorAll('[id^="bracket-"].editable');

        // Create a structure to hold the ID-value pairs
        const bracketValues = {};

        // Loop through each selected element
        bracketFields.forEach(div => {
            const id = div.id; // Get the id of the div
            // Get the content of the div (editable input)
            bracketValues[id] = div.textContent.trim(); // Add the id-value pair to the structure
        });
        return bracketValues
    }

    // STANDINGS HANDLING

    standingsInput.textContent = '';

    function attachSubmitStandingsClickListener() {
        standingsSubmitButton.addEventListener('click', function () {
            // reset
            resetStandingsData();
            // grab data from input
            standingsDataRaw = standingsInput.value;
            // process raw standings data into structured object
            processStandingsData();
            // now auto-populate brackets 1-8
            autoPopulateBrackets();
            // setup custom name dropdowns using names from standings
            setupCustomNameDropdowns();
        })
    }

    attachSubmitStandingsClickListener();

    function resetStandingsData() {
        standingsDataRaw = '';
        standingsDataParsed = {};
        namesFromStandings = [];
    }

    // True when the committed broadcast mode is FlyQuest + 2v2. Body
    // data-attrs are maintained by game-selection.js::syncBodyDataAttrs()
    // on every server-confirmed selection update, so this stays in sync
    // with whatever the display pages see.
    function isFlyquest2v2() {
        return document.body.dataset.vendor === 'flyquest'
            && document.body.dataset.playerCount === '2v2';
    }

    function processStandingsData() {
        // Branch on the committed broadcast mode so the 4-line payload the
        // operator pastes is parsed using the same rules the standings
        // pipeline uses (see features/standings.js::parseStandingsRawData2v2).
        // Keeping the two parsers in lock-step is important: otherwise one
        // code path populates the bracket with the wrong shape and the
        // display page silently renders blank portraits.
        if (isFlyquest2v2()) {
            processStandingsData2v2();
        } else {
            processStandingsData1v1();
        }
        console.log('standings obj', standingsDataParsed);
    }

    function processStandingsData1v1() {
        // 1v1 format: 4 lines per entry — rank / name / archetype / record.
        standingsDataParsed = {};

        if (typeof standingsDataRaw !== 'string' || standingsDataRaw.trim() === '') {
            return;
        }

        // Split the input into lines
        const lines = standingsDataRaw
            .split('\n')
            .map(line => line.trim());

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!line) continue; // Skip empty lines

            // Check if the line starts with a number (Rank)
            if (/^\d+/.test(line)) {
                const rank = line.split(' ')[0]; // The rank is the first part of the line
                if (i + 3 >= lines.length) break; // Not enough lines for a complete entry
                const playerInfo = lines[++i].trim(); // The next line contains the player's name
                const archetype = lines[++i].trim(); // The next line contains the archetype
                const record = lines[++i].trim().split(/\s+/)[0]; // First space-delimited entry in the next line
                let firstName = '', lastName = '';
                if (playerInfo.includes(',')) {
                    // "Last, First [optional extra]"
                    [lastName, firstName] = playerInfo.split(',').map(part => part.trim());
                    firstName = firstName.split(' ')[0]; // Only take the first word of firstName
                } else {
                    // "First Last [optional extra]"
                    [firstName, lastName] = playerInfo.trim().split(' ');
                }
                const name = `${firstName} ${lastName}`;

                standingsDataParsed[rank] = {
                    rank: parseInt(rank, 10),
                    name: name,
                    archetype: archetype,
                    record: record
                };
            }
        }
    }

    function processStandingsData2v2() {
        // 2v2 format: 4 lines per entry — rank / player1 / player2 / record.
        // No archetype line (FQ 2v2 bracket doesn't render archetype). Keep
        // `name` populated with the concatenated "P1 P2" label so any
        // name-based matching downstream (e.g. setupCustomNameDropdowns)
        // keeps working, same as the standings pipeline does.
        standingsDataParsed = {};

        if (typeof standingsDataRaw !== 'string' || standingsDataRaw.trim() === '') {
            return;
        }

        const lines = standingsDataRaw
            .split('\n')
            .map(line => line.trim());

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;

            if (/^\d+/.test(line)) {
                const rank = line.split(' ')[0];
                if (i + 3 >= lines.length) break; // need 4 lines for an entry
                const player1 = lines[++i].trim();
                const player2 = lines[++i].trim();
                const record  = lines[++i].trim().split(/\s+/)[0];

                standingsDataParsed[rank] = {
                    rank: parseInt(rank, 10),
                    name: `${player1} ${player2}`.trim(),
                    player1,
                    player2,
                    archetype: '',
                    record: record,
                };
            }
        }
    }

    // ── FQ 2v2 seeding map ──────────────────────────────────────────────
    // Standard single-elim 1v4 / 2v3 pairing. Keys are rank; values are
    // the *existing* 1v1 QF slot IDs (repositioned in CSS to the FQ 2v2
    // bracket coordinates via vendor-config custom properties — see
    // public/js/vendor-config.js → overrides.mtg.flyquest).
    const FQ2V2_RANK_TO_QF_SLOT = {
        1: 'bracket-quarterfinal-1',
        4: 'bracket-quarterfinal-4',
        2: 'bracket-quarterfinal-2',
        3: 'bracket-quarterfinal-3',
    };

    function clearAutoPopulatedBrackets() {
        if (isFlyquest2v2()) {
            // 2v2 only auto-fills the 4 QF slots the seeding map points
            // at. Clear name / player2 / rank on those four — leave SF
            // and F slots alone (operator fills those manually, same as
            // 1v1). The 4 non-shown QF slots (5/6/7/8) are hidden via
            // .fq2v2-hidden-slot in the editor, but their DOM still
            // exists so clearing them here isn't strictly required.
            Object.values(FQ2V2_RANK_TO_QF_SLOT).forEach((slotId) => {
                const nameInput    = document.getElementById(`${slotId}-player-1-name`);
                const player2Input = document.getElementById(`${slotId}-player-2-name`);
                const rankInput    = document.getElementById(`${slotId}-rank`);
                if (nameInput)    nameInput.textContent    = '';
                if (player2Input) player2Input.textContent = '';
                if (rankInput)    rankInput.textContent    = '';
            });
            return;
        }

        const startingID = 'bracket-quarterfinal';
        for (let x = 0; x < 8; x++) {
            let nameInput = document.getElementById(`${startingID}-${x + 1}-player-1-name`);
            let archetypeInput = document.getElementById(`${startingID}-${x + 1}-archetype`);
            let rankInput = document.getElementById(`${startingID}-${x + 1}-rank`);
            nameInput.textContent = '';
            archetypeInput.textContent = '';
            rankInput.textContent = '';
        }
    }

    function autoPopulateBrackets() {
        // use the structured standings to populate brackets 1-8
        // clear previous values auto-populated
        clearAutoPopulatedBrackets();

        if (isFlyquest2v2()) {
            // Seed exactly 4 QF slots per the 1v4 / 2v3 map. Only ranks
            // present in the parsed standings get populated — if the
            // operator pastes a partial list we simply leave the missing
            // slots blank (they can still type in manually).
            Object.entries(FQ2V2_RANK_TO_QF_SLOT).forEach(([rankStr, slotId]) => {
                const row = standingsDataParsed[rankStr];
                if (!row) return;

                const nameInput    = document.getElementById(`${slotId}-player-1-name`);
                const player2Input = document.getElementById(`${slotId}-player-2-name`);
                const rankInput    = document.getElementById(`${slotId}-rank`);
                if (nameInput)    nameInput.textContent    = row.player1 || '';
                if (player2Input) player2Input.textContent = row.player2 || '';
                if (rankInput)    rankInput.textContent    = row.rank != null ? String(row.rank) : '';
            });
            return;
        }

        // name, archetype, rank
        const maxEntries = Math.min(8, Object.keys(standingsDataParsed).length);
        const startingID = 'bracket-quarterfinal';
        for (let x = 0; x < maxEntries; x++) {
            let nameInput = document.getElementById(`${startingID}-${x + 1}-player-1-name`);
            let archetypeInput = document.getElementById(`${startingID}-${x + 1}-archetype`);
            let rankInput = document.getElementById(`${startingID}-${x + 1}-rank`);
            nameInput.textContent = standingsDataParsed[x + 1]['name'];
            archetypeInput.textContent = standingsDataParsed[x + 1]['archetype'];
            rankInput.textContent = standingsDataParsed[x + 1]['rank'];
        }
    }

    function setupCustomNameDropdowns() {
        const nameInputs = document.querySelectorAll('#bracket-control [id^="bracket-"][id$="-name"].editable');
        // Build the autocomplete source list. In 2v2, `player.name` is the
        // concatenated "p1 p2" team label — serving that as a single
        // dropdown option means operators get "peterpark atrioc" instead
        // of two distinct picks. Split on player1/player2 so each teammate
        // appears separately (mirrors how features/standings.js and the
        // QF auto-populate path already treat the pair). 1v1 keeps the
        // single-name list.
        if (isFlyquest2v2()) {
            namesFromStandings = [...new Set(
                Object.values(standingsDataParsed)
                    .flatMap(row => [row.player1, row.player2])
                    .filter(Boolean)
            )];
        } else {
            namesFromStandings = [...new Set(
                Object.values(standingsDataParsed)
                    .map(row => row.name)
                    .filter(Boolean)
            )];
        }
        console.log(namesFromStandings)
        nameInputs.forEach(field => {
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
                const filteredNames = namesFromStandings.filter(name => name.toLowerCase().includes(value))
                    .slice(0, 5); // Limit to top 5 results
                renderDropdownList(dropdownList, filteredNames, field);
            });

            field.addEventListener('focus', function () {
                renderDropdownList(dropdownList, namesFromStandings, field);
            });

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });
    }

    function renderDropdownList(dropdownList, names, field) {
        dropdownList.innerHTML = '';
        names.forEach(name => {
            const div = document.createElement('div');
            div.textContent = name;
            div.classList.add('dropdown-item');
            div.addEventListener('click', function () {
                field.textContent = name;
                dropdownList.style.display = 'none';
                autoFillCompanionFields(field, name);
                field.dispatchEvent(new Event('input'));
                field.dispatchEvent(new Event('change')); // Trigger change event
            });
            dropdownList.appendChild(div);
        });
        dropdownList.style.display = names.length > 0 ? 'block' : 'none';
    }

    // When the operator picks a name from a bracket slot's autocomplete,
    // fill in the slot's companion field(s) from the parsed standings so
    // SF/F rows get populated with one click instead of three:
    //   • 1v1: copy the standings archetype into the slot's `-archetype`
    //     field. QF already gets this via autoPopulateBrackets; this
    //     extends the same behavior to SF/F where slots are filled by
    //     hand.
    //   • 2v2: copy the teammate into the slot's sibling name field
    //     (picking in `-player-1-name` fills `-player-2-name` and vice versa).
    //     Mirrors the standings-side player1/player2 pairing so selecting
    //     "peterpark" auto-completes "atrioc" as their partner.
    // Either direction overwrites — if the operator wants a mismatched
    // archetype/teammate they can retype after picking.
    function autoFillCompanionFields(pickedField, pickedName) {
        // Slot ID is the field ID minus its trailing `-player-1-name` or
        // `-player-2-name` segment. Single regex handles both variants —
        // the `[12]` character class matches either player digit in one pass.
        const slotId = pickedField.id
            .replace(/-player-[12]-name$/, '');

        if (isFlyquest2v2()) {
            const team = Object.values(standingsDataParsed).find(
                row => row.player1 === pickedName || row.player2 === pickedName
            );
            if (!team) return;
            const teammate = team.player1 === pickedName ? team.player2 : team.player1;
            if (!teammate) return;
            const pickedIsPlayer1 = pickedField.id.endsWith('-player-1-name');
            const siblingId = pickedIsPlayer1
                ? `${slotId}-player-2-name`
                : `${slotId}-player-1-name`;
            const sibling = document.getElementById(siblingId);
            if (sibling) sibling.textContent = teammate;
        } else {
            const match = Object.values(standingsDataParsed).find(row => row.name === pickedName);
            if (!match || !match.archetype) return;
            const archetypeField = document.getElementById(`${slotId}-archetype`);
            if (archetypeField) archetypeField.textContent = match.archetype;
        }
    }

    // END STANDINGS HANDLING

}