// Deck Library editor (master-control).
//
// Builds the set of Piltover deck links the operator picks from on the iPad.
// Populated before a stream on the laptop; admin-control reads the same store
// live, so an edit here shows up on a running board without a reload.
//
// Only links are stored, never the resolved decklist — players keep editing
// their decks on Piltover, and a cached copy would put a stale list on air.

import { RIFTBOUND_LEGENDS_LIST } from '/js/riftbound/constants.js';

export function initDeckLibrary(socket) {
    let library = { decks: [] };
    let editingId = null;

    const modalHTML = `
    <div class="modal fade" id="deck-library-modal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Deck Library</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small">
              Saved Piltover Archive links, grouped by legend. On admin-control these appear
              under <strong>Saved Deck</strong> for whichever legend that side is playing.
              Links are resolved fresh on every load, so edits made on Piltover are picked up.
            </p>
            <div class="row g-2 align-items-end mb-2">
              <div class="col-md-4">
                <label class="form-label mb-1 small">Legend</label>
                <input list="deck-library-legends" id="dl-legend" class="form-control form-control-sm" placeholder="Kennen, Heart of the Tempest">
                <datalist id="deck-library-legends"></datalist>
              </div>
              <div class="col-md-3">
                <label class="form-label mb-1 small">Label</label>
                <input id="dl-label" class="form-control form-control-sm" placeholder="e.g. Chaos/Order build">
              </div>
              <div class="col-md-5">
                <label class="form-label mb-1 small">Piltover Archive link</label>
                <input id="dl-link" class="form-control form-control-sm" placeholder="https://piltoverarchive.com/decks/…">
              </div>
            </div>
            <div class="d-flex gap-2 align-items-center mb-1">
              <button id="dl-save" class="btn btn-sm btn-primary">Add deck</button>
              <button id="dl-cancel" class="btn btn-sm btn-outline-secondary" style="display:none;">Cancel edit</button>
              <span id="dl-status" class="small"></span>
            </div>
            <hr>
            <div id="dl-list"></div>
          </div>
        </div>
      </div>
    </div>`;

    const wrap = document.createElement('div');
    wrap.innerHTML = modalHTML;
    document.body.appendChild(wrap.firstElementChild);

    const modal = new bootstrap.Modal(document.getElementById('deck-library-modal'));
    const $ = (id) => document.getElementById(id);
    const legendInput = $('dl-legend'), labelInput = $('dl-label'), linkInput = $('dl-link');
    const saveBtn = $('dl-save'), cancelBtn = $('dl-cancel'), statusEl = $('dl-status'), listEl = $('dl-list');

    // Legend suggestions come from the same constant the board dropdowns use,
    // so a saved deck's legend always matches what admin-control compares against.
    $('deck-library-legends').innerHTML = (RIFTBOUND_LEGENDS_LIST || [])
        .map((l) => `<option value="${(l.name || l).toString().replace(/"/g, '&quot;')}"></option>`)
        .join('');

    function setStatus(msg, kind) {
        statusEl.textContent = msg || '';
        statusEl.className = `small text-${kind || 'muted'}`;
    }

    function resetForm() {
        editingId = null;
        legendInput.value = ''; labelInput.value = ''; linkInput.value = '';
        saveBtn.textContent = 'Add deck';
        cancelBtn.style.display = 'none';
    }

    function render() {
        const decks = library.decks.slice().sort((a, b) =>
            (a.legend || '').localeCompare(b.legend || '') || (a.label || '').localeCompare(b.label || ''));
        if (!decks.length) {
            listEl.innerHTML = '<p class="text-muted small mb-0">Nothing saved yet. Add a deck above.</p>';
            return;
        }
        const byLegend = {};
        for (const d of decks) (byLegend[d.legend] = byLegend[d.legend] || []).push(d);

        listEl.innerHTML = Object.entries(byLegend).map(([legend, entries]) => `
            <div class="mb-3">
              <div class="fw-bold small mb-1">${escapeHtml(legend)}</div>
              <ul class="list-group list-group-flush">
                ${entries.map((d) => `
                  <li class="list-group-item d-flex justify-content-between align-items-center px-2 py-1">
                    <div class="text-truncate me-2">
                      <div class="small">${escapeHtml(d.label)}</div>
                      <a class="text-muted" style="font-size:11px" href="${escapeHtml(d.link)}" target="_blank" rel="noopener">${escapeHtml(d.link)}</a>
                    </div>
                    <div class="flex-shrink-0">
                      <button class="btn btn-sm btn-outline-secondary dl-edit" data-id="${d.id}">Edit</button>
                      <button class="btn btn-sm btn-outline-danger dl-del" data-id="${d.id}">Delete</button>
                    </div>
                  </li>`).join('')}
              </ul>
            </div>`).join('');
    }

    const escapeHtml = (v) => String(v ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    socket.on('deck-library-updated', (lib) => {
        library = lib && Array.isArray(lib.decks) ? lib : { decks: [] };
        render();
    });

    saveBtn.addEventListener('click', () => {
        const entry = {
            id: editingId || undefined,
            legend: legendInput.value.trim(),
            label: labelInput.value.trim(),
            link: linkInput.value.trim(),
        };
        setStatus('Saving…');
        socket.emit('save-deck-library-entry', entry, (res) => {
            if (!res?.ok) { setStatus(res?.error || 'Save failed', 'danger'); return; }
            setStatus(editingId ? 'Updated' : 'Added', 'success');
            resetForm();
        });
    });

    cancelBtn.addEventListener('click', () => { resetForm(); setStatus(''); });

    listEl.addEventListener('click', (e) => {
        const edit = e.target.closest('.dl-edit');
        if (edit) {
            const d = library.decks.find((x) => x.id === edit.dataset.id);
            if (!d) return;
            editingId = d.id;
            legendInput.value = d.legend; labelInput.value = d.label; linkInput.value = d.link;
            saveBtn.textContent = 'Save changes';
            cancelBtn.style.display = '';
            setStatus(`Editing "${d.label}"`, 'muted');
            return;
        }
        const del = e.target.closest('.dl-del');
        if (del) {
            const d = library.decks.find((x) => x.id === del.dataset.id);
            if (!d || !confirm(`Delete "${d.label}"?`)) return;
            socket.emit('delete-deck-library-entry', { id: d.id }, (res) => {
                setStatus(res?.ok ? 'Deleted' : (res?.error || 'Delete failed'), res?.ok ? 'success' : 'danger');
                if (editingId === d.id) resetForm();
            });
        }
    });

    document.getElementById('open-deck-library')?.addEventListener('click', () => {
        resetForm(); setStatus('');
        socket.emit('get-deck-library');
        modal.show();
    });

    socket.emit('get-deck-library');
}
