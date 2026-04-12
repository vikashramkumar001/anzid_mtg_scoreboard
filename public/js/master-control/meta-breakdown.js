import {getAllCardsByGenre} from "./indexeddb-init.js";
import { RIFTBOUND_LEGENDS_LIST } from '../riftbound/constants.js';

export function initMetaBreakdown(socket) {

    let currentArchetypeList = [];
    let currentGame = 'mtg';
    let cards = {};
    let cardListData = [];
    const metaBreakdownDisplayButton = document.querySelector('#meta-breakdown-control #meta-breakdown-display-button');

    function extractMetaBreakdownFromInputs() {
        const metaBreakdownInputs = document.querySelectorAll('#meta-breakdown-control [id^="meta-breakdown-"].editable');
        let metaBreakdownData = {};
        metaBreakdownInputs.forEach(function (div) {
            // use id of div as key
            metaBreakdownData[div.id] = div.textContent.trim();
        })
        // Include game type so backend uses correct card lookup
        metaBreakdownData._gameType = currentGame;
        return metaBreakdownData;
    }

    function attachMetaBreakdownDisplayButtonListener() {
        metaBreakdownDisplayButton.addEventListener('click', function () {
            // get data from all inputs
            const metaBreakdownData = extractMetaBreakdownFromInputs();
            // Attach full archetype list for side panel if available
            if (cachedMetagameResult) {
                metaBreakdownData._allArchetypes = cachedMetagameResult.allArchetypesSorted || [];
                metaBreakdownData._day1Total = cachedMetagameResult.day1Total || 0;
                metaBreakdownData._day2Total = cachedMetagameResult.day2Total || null;
            }
            console.log(metaBreakdownData);
            // emit data
            socket.emit('send-meta-breakdown-data', metaBreakdownData);
        })
    }

    function renderDropdownList(dropdownList, items, field, type) {
        dropdownList.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            let itemName = '';
            if (type === 'archetype') {
                itemName = typeof item === 'string' ? item : item.name;
            }
            if (type === 'card') {
                itemName = item;
            }
            div.textContent = itemName;
            div.classList.add('dropdown-item');
            div.addEventListener('click', function () {
                field.textContent = itemName;
                dropdownList.style.display = 'none';
                field.dispatchEvent(new Event('input'));
                field.dispatchEvent(new Event('change'));
            });
            dropdownList.appendChild(div);
        });
        dropdownList.style.display = items.length > 0 ? 'block' : 'none';
    }

    // set up for dropdowns - archetype / cards
    function setupArchetypeDropdowns() {
        const archetypeFields = document.querySelectorAll('#meta-breakdown-control [id^="meta-breakdown-archetype-"]');

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
                const filtered = currentArchetypeList
                    .filter(item => {
                        const name = typeof item === 'string' ? item : item.name;
                        return name.toLowerCase().includes(value);
                    })
                    .slice(0, 5);
                renderDropdownList(dropdownList, filtered, field, 'archetype');
            });

            field.addEventListener('focus', function () {
                renderDropdownList(dropdownList, currentArchetypeList, field, 'archetype');
            });

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });
    }

    function setupCardDropdown() {
        const cardViewFields = document.querySelectorAll('#meta-breakdown-control [id^="meta-breakdown-key-card-"]');

        cardViewFields.forEach(field => {
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

                if (value.length >= 2) {
                    const filteredCardsList = cardListData.filter(card => card.toLowerCase().includes(value))
                        .slice(0, 5);
                    renderDropdownList(dropdownList, filteredCardsList, field, 'card');
                } else {
                    dropdownList.style.display = 'none';
                }
            });

            field.addEventListener('focus', function () {
                const value = this.textContent.trim().toLowerCase();

                if (value.length >= 2) {
                    const filteredCardsList = cardListData.filter(card => card.toLowerCase().includes(value))
                        .slice(0, 5);
                    renderDropdownList(dropdownList, filteredCardsList, field, 'card');
                } else {
                    dropdownList.style.display = 'none';
                }
            });

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });
    }

    // setup numbers only for inputs - decimals only
    function attachCountInputsListener() {
        const countInputsFields = document.querySelectorAll('[id^="meta-breakdown-day"][id*="-percent-"], [id^="meta-breakdown-day"][id*="-count-"]');
        countInputsFields.forEach(function (div) {
            div.addEventListener('keydown', function (e) {
                const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
                const isNumber = /^[0-9]$/.test(e.key);
                const isDecimal = e.key === '.';

                if (!isNumber && !allowedKeys.includes(e.key) && !isDecimal) {
                    e.preventDefault();
                }

                if (isDecimal) {
                    const currentText = (e.target.innerText || '').trim();
                    if (currentText.includes('.')) {
                        e.preventDefault();
                    }
                }
            });

            div.addEventListener('paste', function (e) {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text');

                let digitsOnly = text.replace(/[^0-9.]/g, '');
                const firstDotIndex = digitsOnly.indexOf('.');
                if (firstDotIndex !== -1) {
                    digitsOnly = digitsOnly.slice(0, firstDotIndex + 1) +
                        digitsOnly.slice(firstDotIndex + 1).replace(/\./g, '');
                }

                const selection = window.getSelection();
                if (!selection.rangeCount) return;
                selection.deleteFromDocument();
                selection.getRangeAt(0).insertNode(document.createTextNode(digitsOnly));
            });
        })
    }

    // Toggle key card fields visibility based on game
    function toggleKeyCards(game) {
        const showKeyCards = game !== 'riftbound';
        document.querySelectorAll('#meta-breakdown-control [id^="meta-breakdown-key-card-"]').forEach(el => {
            const wrapper = el.closest('.col-2') || el.closest('.custom-dropdown')?.parentElement;
            if (wrapper) wrapper.style.display = showKeyCards ? 'block' : 'none';
        });
    }

    // Update archetype list based on current game
    function updateArchetypeListForGame(game) {
        if (game === 'riftbound') {
            currentArchetypeList = [...RIFTBOUND_LEGENDS_LIST];
        } else {
            // For MTG/vibes, request fresh archetype list from server
            currentArchetypeList = [];
            socket.emit('getArchetypeList');
        }
        setupArchetypeDropdowns();
    }

    // Load card list from IndexedDB for current game
    async function getCardList() {
        cards = await getAllCardsByGenre(currentGame);
        cardListData = Object.keys(cards);
        setupCardDropdown();
    }

    // Listen for updated archetype list from server (MTG/vibes)
    socket.on('archetypeListUpdated', (archetypes) => {
        if (currentGame === 'mtg' || currentGame === 'vibes') {
            currentArchetypeList = archetypes;
            setupArchetypeDropdowns();
        }
    });

    // Listen for game selection changes
    socket.on('server-current-game-selection', ({gameSelection}) => {
        currentGame = gameSelection;
        updateArchetypeListForGame(currentGame);
        toggleKeyCards(currentGame);
        getCardList().then(() => console.log(`[MetaBreakdown] Card list loaded for ${currentGame}`));
    });

    socket.on('game-selection-updated', ({gameSelection}) => {
        currentGame = gameSelection;
        updateArchetypeListForGame(currentGame);
        toggleKeyCards(currentGame);
        getCardList().then(() => console.log(`[MetaBreakdown] Card list reloaded for ${currentGame}`));
    });

    // ── Calculate Metagame Button ───────────────────────────────────────────────
    const calculateButton = document.getElementById('meta-calculate-button');
    const statusEl = document.getElementById('meta-calculate-status');

    function showStatus(message, isError = false) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.style.display = 'block';
        statusEl.style.color = isError ? '#ff6b6b' : '#69db7c';
        if (!isError) {
            setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        }
    }

    if (calculateButton) {
        calculateButton.addEventListener('click', () => {
            const day1Round = document.getElementById('meta-day1-round')?.value || '';
            const day2Round = document.getElementById('meta-day2-round')?.value || '';
            const day2Cutoff = document.getElementById('meta-day2-cutoff')?.value || '';

            calculateButton.disabled = true;
            calculateButton.textContent = 'Calculating...';
            showStatus('');

            const showCount = parseInt(document.getElementById('meta-archetype-count')?.value) || 7;
            socket.emit('calculate-metagame', {
                day1Round,
                day2Round: day2Round || null,
                day2Cutoff: day2Cutoff || null,
                gameType: currentGame,
                showCount
            });
        });
    }

    // Cache the full result for re-slicing when archetype count changes
    let cachedMetagameResult = null;

    socket.on('metagame-calculated', (result) => {
        if (calculateButton) {
            calculateButton.disabled = false;
            calculateButton.textContent = 'Calculate Metagame';
        }

        if (result.error) {
            showStatus(result.error, true);
            return;
        }

        cachedMetagameResult = result;
        showStatus(`Metagame calculated — ${result.allArchetypesSorted?.length || 0} unique archetypes`);

        // Show totals
        const totalsEl = document.getElementById('meta-totals');
        const day1TotalEl = document.getElementById('meta-day1-total');
        const day2TotalEl = document.getElementById('meta-day2-total');
        if (totalsEl) {
            totalsEl.style.display = 'flex';
            if (day1TotalEl) {
                const d1unmatched = result.day1Unmatched?.length || 0;
                day1TotalEl.textContent = d1unmatched > 0
                    ? `Day 1: ${result.day1Total} matched / ${result.day1Registered} registered (${d1unmatched} unmatched)`
                    : `Day 1: ${result.day1Total} players`;
            }
            if (day2TotalEl) {
                if (result.day2Qualified) {
                    day2TotalEl.textContent = `Day 2: ${result.day2Total} matched / ${result.day2Qualified} qualified (${result.day2Unmatched?.length || 0} unmatched)`;
                } else {
                    day2TotalEl.textContent = '';
                }
            }
        }

        // Show/hide unmatched download button
        const unmatchedBtn = document.getElementById('meta-download-unmatched');
        if (unmatchedBtn) {
            unmatchedBtn.style.display = result.day2Unmatched?.length > 0 ? 'inline-block' : 'none';
        }

        populateMetagameCards();
    });

    function renderArchetypeCard(index, data, isOther = false) {
        const showKeyCards = currentGame !== 'riftbound' && !isOther;
        const editable = isOther ? 'false' : 'true';
        const bgStyle = isOther ? 'style="background: #333;"' : '';

        return `
        <div class="col-12 mb-3 meta-archetype-card">
            <div class="card">
                <div class="card-body">
                    <div class="row">
                        <div class="meta-breakdown-index">${index}</div>
                        <div class="col-2">
                            <label class="form-label">Archetype</label>
                            <div id="meta-breakdown-archetype-${index}" class="editable form-control"
                                contenteditable="${editable}" ${bgStyle}>${data?.name || ''}</div>
                        </div>
                        <div class="col-1">
                            <label class="form-label">Day 1 Count</label>
                            <div id="meta-breakdown-day-1-count-${index}" class="editable form-control"
                                contenteditable="${editable}" ${bgStyle}>${data?.day1Count ?? ''}</div>
                        </div>
                        <div class="col-1">
                            <label class="form-label">Day 1 %</label>
                            <div id="meta-breakdown-day-1-percent-${index}" class="editable form-control"
                                contenteditable="${editable}" ${bgStyle}>${data?.day1Percent ?? ''}</div>
                        </div>
                        <div class="col-1">
                            <label class="form-label">Day 2 Count</label>
                            <div id="meta-breakdown-day-2-count-${index}" class="editable form-control"
                                contenteditable="${editable}" ${bgStyle}>${data?.day2Count !== null && data?.day2Count !== undefined ? data.day2Count : ''}</div>
                        </div>
                        <div class="col-1">
                            <label class="form-label">Day 2 %</label>
                            <div id="meta-breakdown-day-2-percent-${index}" class="editable form-control"
                                contenteditable="${editable}" ${bgStyle}>${data?.day2Percent !== null && data?.day2Percent !== undefined ? data.day2Percent : ''}</div>
                        </div>
                        <div class="col-1">
                            <label class="form-label">Conv %</label>
                            <div id="meta-breakdown-conversion-${index}" class="editable form-control"
                                contenteditable="${editable}" ${bgStyle}>${data?.conversion !== null && data?.conversion !== undefined ? data.conversion + '%' : ''}</div>
                        </div>
                        ${showKeyCards ? `
                        <div class="col-2">
                            <label class="form-label">Key Card 1</label>
                            <div id="meta-breakdown-key-card-1-${index}" class="editable form-control"
                                contenteditable="true"></div>
                        </div>
                        <div class="col-2">
                            <label class="form-label">Key Card 2</label>
                            <div id="meta-breakdown-key-card-2-${index}" class="editable form-control"
                                contenteditable="true"></div>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
    }

    function populateMetagameCards() {
        if (!cachedMetagameResult) return;
        const showCount = parseInt(document.getElementById('meta-archetype-count')?.value) || 7;
        const allSorted = cachedMetagameResult.allArchetypesSorted || [];
        const displayed = allSorted.slice(0, showCount);
        const day1Total = cachedMetagameResult.day1Total || 0;
        const day2Total = cachedMetagameResult.day2Total || null;

        const container = document.getElementById('meta-breakdown-cards-container');
        if (!container) return;
        container.innerHTML = '';

        // Render archetype cards
        for (let i = 0; i < displayed.length; i++) {
            container.innerHTML += renderArchetypeCard(i + 1, displayed[i]);
        }

        // Calculate "Other"
        const otherDay1Count = day1Total - displayed.reduce((sum, a) => sum + a.day1Count, 0);
        const otherDay1Percent = day1Total > 0 ? ((otherDay1Count / day1Total) * 100).toFixed(1) : '0';
        const otherDay2Count = day2Total ? (day2Total - displayed.reduce((sum, a) => sum + (a.day2Count || 0), 0)) : null;
        const otherDay2Percent = day2Total && day2Total > 0 ? ((otherDay2Count / day2Total) * 100).toFixed(1) : null;
        const otherConversion = day2Total && otherDay1Count > 0 ? ((otherDay2Count / otherDay1Count) * 100).toFixed(0) : null;

        const otherData = {
            name: 'Other',
            day1Count: otherDay1Count,
            day1Percent: otherDay1Percent,
            day2Count: otherDay2Count,
            day2Percent: otherDay2Percent,
            conversion: otherConversion
        };
        container.innerHTML += renderArchetypeCard(displayed.length + 1, otherData, true);

        // Re-setup dropdowns and input listeners for the new elements
        setupArchetypeDropdowns();
        if (currentGame !== 'riftbound') setupCardDropdown();
        attachCountInputsListener();
        attachOtherAutoUpdate();
    }

    // ── Live count/percent sync + Other recalculation ─────────────────────────
    // Flag to prevent infinite loops when syncing count↔percent
    let _syncing = false;

    function syncCountPercent(sourceField) {
        if (_syncing || !cachedMetagameResult) return;
        _syncing = true;

        const id = sourceField.id;
        // Parse which day and row index: meta-breakdown-day-{day}-{type}-{index}
        const countMatch = id.match(/^meta-breakdown-day-(\d)-count-(\d+)$/);
        const percentMatch = id.match(/^meta-breakdown-day-(\d)-percent-(\d+)$/);

        if (countMatch) {
            const day = countMatch[1];
            const index = countMatch[2];
            const total = day === '1' ? cachedMetagameResult.day1Total : cachedMetagameResult.day2Total;
            if (total) {
                const count = parseInt(sourceField.textContent) || 0;
                const percent = ((count / total) * 100).toFixed(1);
                const percentEl = document.getElementById(`meta-breakdown-day-${day}-percent-${index}`);
                if (percentEl) percentEl.textContent = percent;
            }
        } else if (percentMatch) {
            const day = percentMatch[1];
            const index = percentMatch[2];
            const total = day === '1' ? cachedMetagameResult.day1Total : cachedMetagameResult.day2Total;
            if (total) {
                const percent = parseFloat(sourceField.textContent) || 0;
                const count = Math.round((percent / 100) * total);
                const countEl = document.getElementById(`meta-breakdown-day-${day}-count-${index}`);
                if (countEl) countEl.textContent = count;
            }
        }

        _syncing = false;
    }

    function recalculateOther() {
        const container = document.getElementById('meta-breakdown-cards-container');
        if (!container) return;

        const cards = container.querySelectorAll('.meta-archetype-card');
        if (cards.length < 2) return;

        const otherIndex = cards.length;
        const day1Total = cachedMetagameResult?.day1Total || 0;
        const day2Total = cachedMetagameResult?.day2Total || null;

        let day1CountSum = 0;
        let day1PercentSum = 0;
        let day2CountSum = 0;
        let day2PercentSum = 0;
        let hasDay2 = false;

        for (let i = 1; i < otherIndex; i++) {
            day1CountSum += parseInt(document.getElementById(`meta-breakdown-day-1-count-${i}`)?.textContent) || 0;
            day1PercentSum += parseFloat(document.getElementById(`meta-breakdown-day-1-percent-${i}`)?.textContent) || 0;
            const d2c = parseInt(document.getElementById(`meta-breakdown-day-2-count-${i}`)?.textContent);
            const d2p = parseFloat(document.getElementById(`meta-breakdown-day-2-percent-${i}`)?.textContent);
            if (!isNaN(d2c)) { day2CountSum += d2c; hasDay2 = true; }
            if (!isNaN(d2p)) { day2PercentSum += d2p; }
        }

        const otherDay1Count = Math.max(0, day1Total - day1CountSum);
        const otherDay1Percent = Math.max(0, 100 - day1PercentSum).toFixed(1);
        const otherDay2Count = hasDay2 && day2Total ? Math.max(0, day2Total - day2CountSum) : '';
        const otherDay2Percent = hasDay2 ? Math.max(0, 100 - day2PercentSum).toFixed(1) : '';
        const otherConversion = otherDay1Count > 0 && otherDay2Count !== ''
            ? ((otherDay2Count / otherDay1Count) * 100).toFixed(0) + '%' : '';

        const d1cEl = document.getElementById(`meta-breakdown-day-1-count-${otherIndex}`);
        const d1pEl = document.getElementById(`meta-breakdown-day-1-percent-${otherIndex}`);
        const d2cEl = document.getElementById(`meta-breakdown-day-2-count-${otherIndex}`);
        const d2pEl = document.getElementById(`meta-breakdown-day-2-percent-${otherIndex}`);
        const convEl = document.getElementById(`meta-breakdown-conversion-${otherIndex}`);
        if (d1cEl) d1cEl.textContent = otherDay1Count;
        if (d1pEl) d1pEl.textContent = otherDay1Percent;
        if (d2cEl) d2cEl.textContent = otherDay2Count;
        if (d2pEl) d2pEl.textContent = otherDay2Percent;
        if (convEl) convEl.textContent = otherConversion;
    }

    function onFieldEdit(e) {
        syncCountPercent(e.target);
        recalculateOther();
    }

    function attachOtherAutoUpdate() {
        const fields = document.querySelectorAll(
            '[id^="meta-breakdown-day-1-count-"], [id^="meta-breakdown-day-1-percent-"], [id^="meta-breakdown-day-2-count-"], [id^="meta-breakdown-day-2-percent-"]'
        );
        const container = document.getElementById('meta-breakdown-cards-container');
        const otherIndex = container?.querySelectorAll('.meta-archetype-card').length;
        fields.forEach(field => {
            if (field.id.endsWith(`-${otherIndex}`)) return;
            field.addEventListener('input', onFieldEdit);
        });
    }

    // Archetype count change handler
    const archetypeCountInput = document.getElementById('meta-archetype-count');
    if (archetypeCountInput) {
        archetypeCountInput.addEventListener('change', () => {
            if (cachedMetagameResult) {
                populateMetagameCards();
            } else {
                renderEmptyCards();
            }
        });
    }

    // Download unmatched players
    const unmatchedBtn = document.getElementById('meta-download-unmatched');
    if (unmatchedBtn) {
        unmatchedBtn.addEventListener('click', () => {
            if (!cachedMetagameResult?.day2Unmatched?.length) return;
            const rows = [['Name', 'Display ID', 'User ID', 'Record', 'Points', 'Reason']];
            for (const p of cachedMetagameResult.day2Unmatched) {
                rows.push([p.name, p.displayId, p.uid, p.record, p.points, p.reason]);
            }
            const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'unmatched-players.csv';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // Generate initial empty cards
    function renderEmptyCards() {
        const count = parseInt(document.getElementById('meta-archetype-count')?.value) || 7;
        const container = document.getElementById('meta-breakdown-cards-container');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            container.innerHTML += renderArchetypeCard(i, null);
        }
        container.innerHTML += renderArchetypeCard(count + 1, { name: 'Other' }, true);
        setupArchetypeDropdowns();
        if (currentGame !== 'riftbound') setupCardDropdown();
        attachCountInputsListener();
        attachOtherAutoUpdate();
    }

    // Initial load
    socket.emit('get-game-selection');
    getCardList().then(() => console.log('[MetaBreakdown] Initial card list loaded'));
    renderEmptyCards();

    // attach all listeners
    attachMetaBreakdownDisplayButtonListener();

}
