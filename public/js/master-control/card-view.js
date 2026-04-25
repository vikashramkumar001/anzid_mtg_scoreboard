import {getAllCardsByGenre} from './indexeddb-init.js';

export function initCardView(socket) {

    const viewButton1 = document.getElementById('card-view-display-button-1');
    const viewButton2 = document.getElementById('card-view-display-button-2');
    const resetButton1 = document.getElementById('card-view-reset-button-1');
    const resetButton2 = document.getElementById('card-view-reset-button-2');
    const gameLabel = document.getElementById('card-view-game-label');

    let currentGame = 'mtg';
    let cardNames = [];      // flat list of display names for autocomplete
    let cardLookup = {};     // displayName -> { url, name, set?, variants? }
    const selectedVariantUrl = {}; // slotId -> selected variant imageUrl (or empty)
    const lastRenderedName = {};   // slotId -> displayName last passed to renderPreview

    // MTG print (variant artwork) cache — populated lazily per card name from
    // Scryfall. Unlike Riftbound (which pre-bakes variants in the local JSON),
    // MTG has too many prints (~135k+ across the corpus) to pre-build. We
    // fetch on first preview of each card and keep results for the session.
    //   mtgPrintsData[name]    : { variants: [...] } once resolved (empty
    //                            array if fetch failed or card has no prints).
    //   mtgPrintsInflight[name]: Promise while a fetch is in flight. Repeat
    //                            callers share the same Promise.
    const mtgPrintsData = {};
    const mtgPrintsInflight = {};

    // Game display names
    const GAME_LABELS = {
        mtg: 'MTG',
        vibes: 'Vibes',
        riftbound: 'Riftbound',
        starwars: 'Star Wars'
    };

    // ─── Card data loading per game ───

    async function loadMTGCards() {
        const cards = await getAllCardsByGenre('mtg');
        // Build a case-insensitive lookup map once (O(n) instead of O(n²))
        const lowerMap = {};
        for (const k of Object.keys(cards)) {
            lowerMap[k.toLowerCase()] = k;
        }
        cardNames = Object.keys(cards);
        cardLookup = {};
        for (const name of cardNames) {
            const singleFace = name.includes('//')
                ? name.split('//')[0].trim()
                : name.trim();
            const cleanedName = singleFace.replace(/^"+|"+$/g, '').replace(/&/g, 'and');
            const matchedKey = lowerMap[cleanedName.toLowerCase()];
            cardLookup[name] = { url: matchedKey ? cards[matchedKey]?.imageUrl : '', name };
        }
    }

    function loadVibesCards(cardListDataFromServer) {
        cardLookup = {};
        cardNames = Object.keys(cardListDataFromServer || {});
        for (const name of cardNames) {
            cardLookup[name] = { url: cardListDataFromServer[name], name };
        }
    }

    function loadRiftboundCards(cardListDataFromServer) {
        cardLookup = {};
        cardNames = Object.keys(cardListDataFromServer || {});
        for (const name of cardNames) {
            cardLookup[name] = {
                url: cardListDataFromServer[name]?.imageUrl || '',
                name,
                variants: cardListDataFromServer[name]?.variants || null
            };
        }
    }

    function loadStarWarsCards(cardListDataFromServer) {
        cardLookup = {};
        for (const set of Object.keys(cardListDataFromServer || {})) {
            const setMap = cardListDataFromServer[set] || {};
            for (const key of Object.keys(setMap)) {
                const entry = setMap[key];
                const baseRaw = (entry.image || key).split(/\\|\//).pop();
                const base = baseRaw.split('?')[0].split('#')[0];
                const filename = /\.[a-z0-9]+$/i.test(base) ? base : base + '.png';
                const url = `/assets/images/starwars/cards/${set}/${filename}`;
                const display = `${set}:${entry.name}`;
                cardLookup[display] = { set, name: entry.name, url };
            }
        }
        cardNames = Object.keys(cardLookup);
    }

    // ─── MTG prints (Scryfall artwork variants) ───

    // Fetch all unique artworks for an MTG card name from Scryfall. Dedupes
    // concurrent requests for the same name and caches the resolved result so
    // repeated previews of the same card don't re-hit the API. Returns an
    // object with a `variants` array; on error, resolves to `{variants: []}`
    // (never throws — callers render "no variants" UI gracefully).
    //
    // Scryfall query details:
    //   `!"Name"`       — exact-name match (handles dual-faced front side)
    //   `unique=art`    — one result per distinct artwork (dedupes reprints
    //                     that share art; gives the operator one tile per
    //                     visual variant rather than per set release)
    //   `order=released,dir=asc` — chronological, oldest first
    function fetchMtgPrints(displayName) {
        if (mtgPrintsData[displayName]) return Promise.resolve(mtgPrintsData[displayName]);
        if (mtgPrintsInflight[displayName]) return mtgPrintsInflight[displayName];

        // Dual-faced cards carry a combined name like "Front // Back"; Scryfall's
        // exact-match needs just the front face.
        const singleFace = displayName.includes('//')
            ? displayName.split('//')[0].trim()
            : displayName.trim();
        const q = `!"${singleFace}"`;
        const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=art&order=released&dir=asc`;

        const p = fetch(url)
            .then(r => {
                if (r.status === 404) return { data: [] }; // Scryfall returns 404 when 0 hits
                if (!r.ok) throw new Error(`Scryfall ${r.status}`);
                return r.json();
            })
            .then(json => {
                const variants = (json.data || [])
                    .map(c => {
                        // Single-faced cards have image_uris at the root; dual-faced
                        // expose it under card_faces[0] for the front.
                        const img = c.image_uris || c.card_faces?.[0]?.image_uris;
                        if (!img) return null;
                        return {
                            broadcastUrl: img.png || img.large || img.normal,
                            thumbUrl:     img.normal || img.large || img.png,
                            setCode:      c.set,
                            setName:      c.set_name
                        };
                    })
                    .filter(Boolean);
                return { variants };
            })
            .catch(err => {
                console.warn(`[mtg prints] fetch failed for "${displayName}":`, err);
                return { variants: [] };
            })
            .then(result => {
                // Cache under both data + clear inflight so future calls hit the
                // resolved cache path synchronously.
                mtgPrintsData[displayName] = result;
                delete mtgPrintsInflight[displayName];
                return result;
            });

        mtgPrintsInflight[displayName] = p;
        return p;
    }

    // Build the thumbnail grid HTML for MTG variant prints. Mirrors the
    // Riftbound variant block inline in renderPreview but uses set code as
    // the label (with full set name on hover) and distinct thumb/broadcast
    // URLs so the operator sees fast-loading thumbnails while the selected
    // broadcast URL is always full-resolution PNG.
    function buildMtgVariantsHtml(slotId, displayName, variants, currentUrl) {
        const thumbs = variants.map(v => {
            const selected = v.broadcastUrl === currentUrl;
            const border = selected ? 'border: 3px solid #00bfff;' : 'border: 2px solid transparent;';
            const label = (v.setCode || '').toUpperCase();
            const escapedTitle = (v.setName || '').replace(/"/g, '&quot;');
            return `<div class="variant-thumb" data-variant-url="${v.broadcastUrl}" data-slot="${slotId}" data-card="${displayName}"
                title="${escapedTitle}"
                style="display:inline-block; cursor:pointer; margin:3px; text-align:center; ${border} border-radius:6px; padding:2px;">
                <img src="${v.thumbUrl}" alt="${label}" style="height:100px; object-fit:contain; border-radius:4px;" loading="lazy">
                <div style="font-size:10px;">${label}</div>
            </div>`;
        }).join('');
        return `<div style="margin-top:8px; display:flex; flex-wrap:wrap; justify-content:center; max-height:240px; overflow-y:auto;">${thumbs}</div>`;
    }

    // ─── Socket listeners for card data ───

    socket.on('vibes-card-list-data', ({cardListData: data}) => {
        if (currentGame === 'vibes') {
            loadVibesCards(data);
        }
    });

    socket.on('riftbound-card-list-data', ({cardListData: data}) => {
        if (currentGame === 'riftbound') {
            loadRiftboundCards(data);
        }
    });

    socket.on('starwars-card-list-data', ({cardListData: data}) => {
        if (currentGame === 'starwars') {
            loadStarWarsCards(data);
        }
    });

    // ─── Game switching ───

    async function switchGame(game) {
        if (currentGame === game && cardNames.length > 0) return;
        currentGame = game;
        gameLabel.textContent = `${GAME_LABELS[game] || game} Card View`;

        // Clear inputs and previews
        clearAll();

        // Load card data for the new game
        cardNames = [];
        cardLookup = {};

        if (game === 'mtg') {
            await loadMTGCards();
        } else if (game === 'vibes') {
            socket.emit('vibes-get-card-list-data');
        } else if (game === 'riftbound') {
            socket.emit('riftbound-get-card-list-data');
        } else if (game === 'starwars') {
            socket.emit('starwars-get-card-list-data');
        }
    }

    socket.on('server-current-game-selection', ({gameSelection}) => {
        switchGame(gameSelection);
    });

    socket.on('game-selection-updated', ({gameSelection}) => {
        switchGame(gameSelection);
    });

    // ─── Autocomplete dropdown (set up once, not rebuilt) ───

    function renderDropdownList(dropdownList, items, field) {
        dropdownList.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.textContent = item;
            div.classList.add('dropdown-item');
            div.addEventListener('click', function () {
                field.textContent = item;
                dropdownList.style.display = 'none';
                field.dispatchEvent(new Event('input'));
            });
            dropdownList.appendChild(div);
        });
        dropdownList.style.display = items.length > 0 ? 'block' : 'none';
    }

    // Store dropdown list elements for each slot
    const dropdownLists = {};

    function setupDropdowns() {
        const fields = document.querySelectorAll('#unified-card-view [id^="card-view-input-autocomplete-"]');

        fields.forEach(field => {
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-dropdown';
            field.parentNode.insertBefore(wrapper, field);
            wrapper.appendChild(field);

            const dropdownList = document.createElement('div');
            dropdownList.className = 'dropdown-list';
            wrapper.appendChild(dropdownList);

            const slotId = field.id === 'card-view-input-autocomplete-1' ? 1 : 2;
            dropdownLists[slotId] = dropdownList;

            function filterAndRender() {
                const minChars = currentGame === 'mtg' ? 2 : 1;
                const maxResults = currentGame === 'starwars' ? 10 : 5;
                const value = field.textContent.trim().toLowerCase();
                if (value.length >= minChars) {
                    const filtered = cardNames
                        .filter(name => name.toLowerCase().includes(value))
                        .slice(0, maxResults);
                    renderDropdownList(dropdownList, filtered, field);

                    const exact = cardNames.find(name => name.toLowerCase() === value);
                    renderPreview(slotId, exact || '');
                } else {
                    dropdownList.style.display = 'none';
                    renderPreview(slotId, '');
                }
            }

            field.addEventListener('input', filterAndRender);
            field.addEventListener('focus', filterAndRender);

            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdownList.style.display = 'none';
                }
            });
        });
    }

    // ─── Preview rendering ───

    function renderPreview(slotId, displayName) {
        const previewEl = document.getElementById(`card-preview-${slotId}`);
        if (!displayName) {
            previewEl.innerHTML = '';
            delete selectedVariantUrl[slotId];
            delete lastRenderedName[slotId];
            return;
        }

        const entry = cardLookup[displayName];
        if (!entry || !entry.url) {
            previewEl.innerHTML = '';
            delete selectedVariantUrl[slotId];
            delete lastRenderedName[slotId];
            return;
        }

        // If the card name changed since the last render for this slot, any
        // previously-clicked variant URL belongs to the old card — drop it so
        // we don't use (or emit) stale art for the new card.
        if (lastRenderedName[slotId] !== displayName) {
            delete selectedVariantUrl[slotId];
            lastRenderedName[slotId] = displayName;
        }

        // Default to standard art
        const currentUrl = selectedVariantUrl[slotId] || entry.url;

        let extraInfo = '';
        if (entry.set) {
            extraInfo = `<div>${entry.set}</div>`;
        }

        // Build variant thumbnails — Riftbound uses pre-baked local variants,
        // MTG fetches from Scryfall on demand (with a "Loading…" placeholder
        // on first preview of each card).
        let variantsHtml = '';
        if (currentGame === 'riftbound' && entry.variants && entry.variants.length > 1) {
            const thumbs = entry.variants.map(v => {
                const selected = v.imageUrl === currentUrl;
                const border = selected ? 'border: 3px solid #00bfff;' : 'border: 2px solid transparent;';
                const label = v.standard ? 'Standard' : v.code;
                return `<div class="variant-thumb" data-variant-url="${v.imageUrl}" data-slot="${slotId}" data-card="${displayName}"
                    style="display:inline-block; cursor:pointer; margin:3px; text-align:center; ${border} border-radius:6px; padding:2px;">
                    <img src="${v.imageUrl}" alt="${label}" style="height:100px; object-fit:contain; border-radius:4px;">
                    <div style="font-size:10px;">${label}</div>
                </div>`;
            }).join('');
            variantsHtml = `<div style="margin-top:8px; display:flex; flex-wrap:wrap; justify-content:center;">${thumbs}</div>`;
        } else if (currentGame === 'mtg') {
            // Synchronous path: prints already fetched and in cache → render
            // inline with no flash. Async path: show placeholder and kick off
            // the fetch below, which re-enters renderPreview on resolve.
            const cached = mtgPrintsData[displayName];
            if (cached && cached.variants.length > 1) {
                variantsHtml = buildMtgVariantsHtml(slotId, displayName, cached.variants, currentUrl);
            } else if (!cached) {
                variantsHtml = `<div style="margin-top:8px; text-align:center; font-size:12px; color:#888;">Loading variants…</div>`;
            }
            // If cached with ≤1 variant, variantsHtml stays empty — no UI needed.
        }

        previewEl.innerHTML = `
            <div class="card mt-2">
                <img src="${currentUrl}" alt="${entry.name}" class="card-img-top" style="max-height:300px; object-fit:contain;">
                <div class="card-body text-center">
                    <strong>${entry.name}</strong>
                    ${extraInfo}
                </div>
                ${variantsHtml}
            </div>
        `;

        // Attach click handlers to variant thumbnails (both Riftbound + MTG)
        previewEl.querySelectorAll('.variant-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const url = thumb.dataset.variantUrl;
                const sid = parseInt(thumb.dataset.slot, 10);
                const cardName = thumb.dataset.card;
                selectedVariantUrl[sid] = url;
                renderPreview(sid, cardName);
            });
        });

        // MTG async fetch — only kick off if prints aren't already cached for
        // this name. On resolve, re-render this slot if it still shows the
        // same card (operator may have typed something else in the meantime).
        if (currentGame === 'mtg' && !mtgPrintsData[displayName]) {
            fetchMtgPrints(displayName).then(() => {
                const field = document.getElementById(`card-view-input-autocomplete-${slotId}`);
                if (field && field.textContent.trim() === displayName) {
                    renderPreview(slotId, displayName);
                }
            });
        }
    }

    // ─── Button handlers ───

    function emitViewCard(slotId) {
        const field = document.getElementById(`card-view-input-autocomplete-${slotId}`);
        const data2send = {
            'card-selected': field.innerText,
            'card-id': slotId,
            'game-id': currentGame,
            'variant-url': selectedVariantUrl[slotId] || ''
        };
        socket.emit('view-selected-card', {cardSelected: data2send});
    }

    // Game-specific card back images
    const CARD_BACKS = {
        mtg: '/assets/images/mtg/cards/magic-card-back.jpg',
        vibes: '/assets/images/vibes/cards/vibes-card-back.png',
        riftbound: '/assets/images/riftbound/cards/riftbound-card-back.jpg',
        starwars: '/assets/images/starwars/cards/starwars-card-back.png'
    };

    function emitReset(slotId) {
        delete selectedVariantUrl[slotId];
        delete lastRenderedName[slotId];
        const data2send = {
            'card-selected': '',
            'card-id': slotId,
            'game-id': currentGame
        };
        socket.emit('view-selected-card', {cardSelected: data2send});
        document.getElementById(`card-view-input-autocomplete-${slotId}`).innerText = '';
        // Show game-specific card back in preview
        const cardBackUrl = CARD_BACKS[currentGame] || CARD_BACKS.mtg;
        document.getElementById(`card-preview-${slotId}`).innerHTML = `
            <div class="card mt-2">
                <img src="${cardBackUrl}" alt="Card Back" class="card-img-top" style="max-height:300px; object-fit:contain;">
            </div>
        `;
    }

    function clearAll() {
        for (const slotId of [1, 2]) {
            document.getElementById(`card-preview-${slotId}`).innerHTML = '';
            document.getElementById(`card-view-input-autocomplete-${slotId}`).innerText = '';
            delete selectedVariantUrl[slotId];
            delete lastRenderedName[slotId];
        }
    }

    viewButton1.addEventListener('click', () => emitViewCard(1));
    viewButton2.addEventListener('click', () => emitViewCard(2));
    resetButton1.addEventListener('click', () => emitReset(1));
    resetButton2.addEventListener('click', () => emitReset(2));

    // ─── Init: set up dropdowns once, then request game selection ───
    setupDropdowns();
    socket.emit('get-game-selection');
}
