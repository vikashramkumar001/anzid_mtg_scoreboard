// Player View — search players in the active event and inspect their
// full decklist. Roster comes from the server's `event-player-roster`
// emit (joined registrations + decklists for the current Carde event);
// per-player decklist details are fetched on demand via
// `get-player-decklist` so the initial payload stays small (~1500 rows
// × ~200 bytes = under 300 KB).
//
// Layout:
//   - Left: search input + roster table (player / legend / deck name)
//   - Right: detailed decklist view for the selected player
//
// Auto-loads the roster:
//   - on tab activation (first time + every time)
//   - after the operator runs Fetch Decklists (the server's
//     `cardeio-decklists-fetched` emit refreshes the in-memory cache,
//     so a roster refetch picks up newly-submitted decklists)
//
// All filtering is client-side string contains across name, display
// name, best identifier, legend, champion, battlefield, and deck name.

export function initPlayerView(socket) {
    let roster = [];
    let filteredRoster = [];
    let selectedUserId = null;
    let rosterLoaded = false;

    const tabBtn = document.getElementById('player-view-tab');
    const searchInput = document.getElementById('player-view-search');
    const countEl = document.getElementById('player-view-count');
    const statusEl = document.getElementById('player-view-status');
    const tbody = document.getElementById('player-view-tbody');
    const decklistEl = document.getElementById('player-view-decklist');

    if (!tabBtn || !searchInput || !tbody || !decklistEl) {
        // Page didn't render the Player View tab — nothing to do.
        return;
    }

    // ── Roster load + render ────────────────────────────────────────
    function requestRoster() {
        setStatus('Loading player roster…');
        socket.emit('get-event-player-roster');
    }

    function setStatus(msg) {
        if (statusEl) statusEl.textContent = msg || '';
    }

    socket.on('event-player-roster', (payload) => {
        if (!payload) return;
        if (payload.error) {
            setStatus(`Error: ${payload.error}`);
            roster = [];
            applyFilter();
            return;
        }
        roster = payload.players || [];
        rosterLoaded = true;
        const withDeck = roster.filter(p => p.hasDecklist).length;
        setStatus(`${roster.length} registered · ${withDeck} with decklist · event ${payload.eventId || '(unknown)'}`);
        applyFilter();
    });

    // ── Search filter ───────────────────────────────────────────────
    // Plain case-insensitive substring match across the visible columns
    // plus best identifier + display name + champion + battlefield so
    // operators can search by anything they remember.
    function applyFilter() {
        const q = (searchInput.value || '').trim().toLowerCase();
        if (!q) {
            filteredRoster = roster.slice();
        } else {
            filteredRoster = roster.filter(p => {
                const hay = [
                    p.realName, p.displayName, p.bestIdentifier,
                    p.legend, p.champion, p.battlefield, p.deckName
                ].filter(Boolean).join(' ').toLowerCase();
                return hay.includes(q);
            });
        }
        if (countEl) countEl.textContent = q ? `${filteredRoster.length} / ${roster.length}` : `${roster.length}`;
        renderRoster();
    }

    searchInput.addEventListener('input', applyFilter);

    // ── Roster table render ─────────────────────────────────────────
    function renderRoster() {
        if (filteredRoster.length === 0) {
            const emptyMsg = rosterLoaded
                ? (roster.length === 0 ? 'No registrations cached for the active event.' : 'No players match the search.')
                : 'Loading…';
            tbody.innerHTML = `<tr><td colspan="3" class="text-muted text-center">${escapeHtml(emptyMsg)}</td></tr>`;
            return;
        }
        // Cap rendering to first 500 rows for responsiveness. The
        // search filter narrows things fast for any non-trivial query;
        // this cap only kicks in on the unfiltered view.
        const SHOW_CAP = 500;
        const rows = filteredRoster.slice(0, SHOW_CAP);
        const truncated = filteredRoster.length - rows.length;
        tbody.innerHTML = rows.map(p => {
            const name = p.displayName || p.realName || p.bestIdentifier || '(unknown)';
            const subtitle = p.displayName && p.realName && p.displayName !== p.realName
                ? `<div class="player-view-subname text-muted small">${escapeHtml(p.realName)}</div>`
                : '';
            const legend = p.legend ? shortLegend(p.legend) : (p.hasDecklist ? '—' : '<span class="text-muted">(no deck)</span>');
            const deckCell = p.hasDecklist
                ? `<span class="text-muted small">${escapeHtml(p.deckName || '')}</span>`
                : '<span class="text-muted">—</span>';
            const selected = String(p.userId) === String(selectedUserId) ? ' table-active' : '';
            return `
                <tr class="player-view-row${selected}" data-user-id="${escapeAttr(String(p.userId))}" data-has-deck="${p.hasDecklist ? '1' : '0'}">
                    <td>
                        <div class="player-view-name">${escapeHtml(name)}</div>
                        ${subtitle}
                    </td>
                    <td>${legend}</td>
                    <td>${deckCell}</td>
                </tr>
            `;
        }).join('') + (truncated > 0
            ? `<tr><td colspan="3" class="text-muted text-center small">… ${truncated} more — refine search to see them.</td></tr>`
            : '');
    }

    // Row click → request that player's decklist.
    tbody.addEventListener('click', (e) => {
        const tr = e.target.closest?.('.player-view-row');
        if (!tr) return;
        const userId = tr.dataset.userId;
        const hasDeck = tr.dataset.hasDeck === '1';
        selectedUserId = userId;
        renderRoster();
        if (!hasDeck) {
            renderDecklistMessage('This player has no decklist cached — they may not have submitted one.');
            return;
        }
        renderDecklistMessage('Loading decklist…');
        socket.emit('get-player-decklist', { userId: Number(userId) });
    });

    // ── Decklist render ─────────────────────────────────────────────
    socket.on('player-decklist', (payload) => {
        if (!payload) return;
        if (payload.error) {
            renderDecklistMessage(`Error: ${payload.error}`);
            return;
        }
        if (!payload.decklist) {
            renderDecklistMessage('No decklist data returned.');
            return;
        }
        renderDecklist(payload.decklist);
    });

    function renderDecklistMessage(msg) {
        decklistEl.innerHTML = `<p class="text-muted">${escapeHtml(msg)}</p>`;
    }

    function renderDecklist(dl) {
        // Find the originating roster entry so we can show the real
        // player name (decklist payload only has best_identifier).
        const rosterEntry = roster.find(p => String(p.userId) === String(dl.userId)) || {};
        const name = rosterEntry.displayName || rosterEntry.realName || rosterEntry.bestIdentifier || dl.bestIdentifier || `User ${dl.userId}`;
        const subtitle = [];
        if (rosterEntry.realName && rosterEntry.realName !== name) subtitle.push(rosterEntry.realName);
        if (rosterEntry.bestIdentifier && rosterEntry.bestIdentifier !== name && rosterEntry.bestIdentifier !== rosterEntry.realName) {
            subtitle.push(rosterEntry.bestIdentifier);
        }

        // Legend + Champion are single cards; Battlefields is an array
        // of up to 3 cards (riftbound's pre-game battlefield pool).
        const battlefieldList = Array.isArray(dl.battlefields) ? dl.battlefields.filter(Boolean) : [];
        const headerCards = [
            ['Legend', dl.legend, false],
            ['Champion', dl.champion, false],
            // Pluralize the label when there's more than one, and pass
            // the array through so the renderer can stack the names.
            [battlefieldList.length > 1 ? 'Battlefields' : 'Battlefield', battlefieldList, true]
        ].filter(([, v]) => Array.isArray(v) ? v.length > 0 : !!v);

        const sectionTotalsHtml = dl.sections.map(sec => {
            const totalQty = (sec.cards || []).reduce((sum, c) => sum + (c.quantity || 0), 0);
            return `<span class="player-view-section-summary"><strong>${escapeHtml(sec.label || sec.key)}:</strong> ${totalQty}</span>`;
        }).join('');

        const sectionsHtml = dl.sections.map(sec => {
            if (!sec.cards || sec.cards.length === 0) return '';
            const totalQty = sec.cards.reduce((sum, c) => sum + (c.quantity || 0), 0);
            const cardsHtml = sec.cards
                .slice()
                .sort((a, b) => (b.quantity || 0) - (a.quantity || 0) || a.name.localeCompare(b.name))
                .map(c => `
                    <li class="player-view-card">
                        <span class="player-view-card-qty">${c.quantity || 1}</span>
                        <span class="player-view-card-name">${escapeHtml(c.name)}</span>
                        ${c.domains?.length ? `<span class="player-view-card-domains text-muted small">${escapeHtml(c.domains.join(' / '))}</span>` : ''}
                    </li>
                `).join('');
            return `
                <div class="player-view-section mb-3">
                    <h6 class="player-view-section-title">${escapeHtml(sec.label || sec.key)} <span class="text-muted small">(${totalQty})</span></h6>
                    <ul class="player-view-card-list">${cardsHtml}</ul>
                </div>
            `;
        }).join('');

        decklistEl.innerHTML = `
            <div class="player-view-header mb-3">
                <h4 class="mb-1">${escapeHtml(name)}</h4>
                ${subtitle.length ? `<div class="text-muted small">${escapeHtml(subtitle.join(' · '))}</div>` : ''}
                ${dl.deckName ? `<div class="text-muted small mt-1">${escapeHtml(dl.deckName)}</div>` : ''}
            </div>
            ${headerCards.length ? `
                <div class="player-view-key-cards mb-3">
                    ${headerCards.map(([label, value, isMulti]) => {
                        // Battlefields render as a stacked list inside
                        // the same key-card box. Legend/Champion stay
                        // as a single line of text.
                        const valueHtml = isMulti
                            ? value.map(v => `<div>${escapeHtml(v)}</div>`).join('')
                            : escapeHtml(value);
                        return `
                            <div class="player-view-key-card">
                                <div class="player-view-key-label text-muted small">${escapeHtml(label)}</div>
                                <div class="player-view-key-value">${valueHtml}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : ''}
            ${sectionTotalsHtml ? `<div class="player-view-totals mb-3">${sectionTotalsHtml}</div>` : ''}
            ${sectionsHtml || '<p class="text-muted">Decklist has no listed sections.</p>'}
            ${dl.domainIdentity?.length ? `<div class="text-muted small mt-3">Domain identity: ${escapeHtml(dl.domainIdentity.join(' / '))}</div>` : ''}
        `;
    }

    // ── Auto-load triggers ──────────────────────────────────────────
    // On tab activation. Bootstrap fires `shown.bs.tab` when the tab
    // becomes visible; refresh every time so newly-submitted decklists
    // surface without needing a page reload.
    tabBtn.addEventListener('shown.bs.tab', () => requestRoster());

    // After Fetch Decklists — server reloads the cache, so refresh
    // the roster too in case any new submissions came in.
    socket.on('cardeio-decklists-fetched', (result) => {
        if (result?.success && rosterLoaded) requestRoster();
    });

    // After event switch — platform config reload triggers a fresh roster.
    socket.on('tournament-platform-config', () => {
        if (rosterLoaded) requestRoster();
    });

    // First load if the operator opens the page already on the Player View tab.
    if (tabBtn.classList.contains('active')) requestRoster();
}

// "Diana, Scorn of the Moon" → "Diana" — matrix uses the same shortening.
function shortLegend(name) {
    if (typeof name !== 'string') return '';
    const i = name.indexOf(',');
    return i === -1 ? name : name.slice(0, i).trim();
}

function escapeHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
