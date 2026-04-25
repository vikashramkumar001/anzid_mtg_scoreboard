// public/js/master-control/groups.js
// Editor UI for the Groups tab — one-time team→group assignment for the
// flyquest 2v2 standings layout. Two textareas, one per bracket. The
// operator pastes / edits both at once and hits Save. Stored on the server
// via groupAssignment.json; broadcast as `groupAssignmentUpdated` so the
// standings renderer re-splits its columns live.
//
// Shape wire format: { group1: string[], group2: string[] }
// UI form: newline-separated textareas → arrays via splitLines().

export function initGroups(socket) {

    const form        = document.getElementById('groupAssignmentForm');
    const group1Input = document.getElementById('group1Input');
    const group2Input = document.getElementById('group2Input');
    const statusEl    = document.getElementById('groupAssignmentStatus');

    // Gracefully no-op if the Groups tab markup isn't in the DOM (e.g. a
    // future master-control variant that omits this tab).
    if (!form || !group1Input || !group2Input) {
        console.warn('[Groups] markup missing — initGroups() aborted.');
        return;
    }

    // Split textarea content into a trimmed list. Empty lines are dropped.
    // Server also trims + dedupes, so the UI doesn't need to be defensive —
    // this is just the minimum to produce a clean array over the wire.
    function splitLines(raw) {
        return (raw || '')
            .split(/\r?\n/)
            .map(s => s.trim())
            .filter(Boolean);
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
            group1: splitLines(group1Input.value),
            group2: splitLines(group2Input.value),
        };
        socket.emit('setGroupAssignment', payload);
        // Visual ack — cleared as soon as the round-trip lands.
        if (statusEl) statusEl.textContent = 'Saving…';
    });

    socket.on('groupAssignmentUpdated', (assignment) => {
        // Populate textareas only if the user hasn't been editing (avoid
        // clobbering in-flight edits when another tab broadcasts). Cheap
        // heuristic: only repopulate when the field isn't focused.
        if (document.activeElement !== group1Input) {
            group1Input.value = (assignment.group1 || []).join('\n');
        }
        if (document.activeElement !== group2Input) {
            group2Input.value = (assignment.group2 || []).join('\n');
        }
        if (statusEl) {
            statusEl.textContent = 'Saved';
            setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 1500);
        }
    });

    // Kick off the initial fetch so the textareas show current state.
    socket.emit('getGroupAssignment');
}
