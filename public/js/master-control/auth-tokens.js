export function initAuthTokens(socket) {
    const webSessionInput = document.getElementById('auth-web-session');
    const webSessionTokenInput = document.getElementById('auth-web-session-token');
    const sessionIdInput = document.getElementById('auth-session-id');
    const saveButton = document.getElementById('auth-tokens-save');
    const statusIndicator = document.getElementById('auth-token-status');

    // Request current status on load
    socket.emit('get-auth-tokens');

    socket.on('auth-token-status', (status) => {
        updateStatusDisplay(status);
    });

    saveButton.addEventListener('click', () => {
        const tokens = {};
        const ws = webSessionInput.value.trim();
        const wst = webSessionTokenInput.value.trim();
        const sid = sessionIdInput.value.trim();
        if (ws) tokens.webSession = ws;
        if (wst) tokens.webSessionToken = wst;
        if (sid) tokens.sessionId = sid;

        if (Object.keys(tokens).length === 0) {
            alert('Paste at least one token before saving.');
            return;
        }

        socket.emit('set-auth-tokens', tokens);

        // Clear inputs after saving (tokens are sensitive)
        webSessionInput.value = '';
        webSessionTokenInput.value = '';
        sessionIdInput.value = '';
    });

    // Carde.io shared inputs
    const cardeioEventIdInput = document.getElementById('cardeio-event-id');
    const cardeioGameSlugInput = document.getElementById('cardeio-game-slug');
    const cardeioStatus = document.getElementById('cardeio-fetch-status');

    // Carde.io decklist fetch
    const fetchCardeioBtn = document.getElementById('fetch-cardeio-decklists');

    fetchCardeioBtn.addEventListener('click', () => {
        const eventId = cardeioEventIdInput.value.trim();
        if (!eventId) {
            alert('Enter a Carde.io Event ID.');
            return;
        }

        fetchCardeioBtn.disabled = true;
        fetchCardeioBtn.textContent = 'Fetching...';
        cardeioStatus.textContent = '';

        socket.emit('fetch-cardeio-decklists', { eventId });
    });

    socket.on('cardeio-decklists-result', (result) => {
        fetchCardeioBtn.disabled = false;
        fetchCardeioBtn.textContent = 'Fetch Decklists';

        if (!result.success) {
            cardeioStatus.textContent = 'Error: ' + result.error;
            cardeioStatus.className = 'mb-3 text-danger';
            return;
        }

        cardeioStatus.className = 'mb-3 text-success';

        if (result.type === 'text') {
            // CSV — trigger download in browser
            const blob = new Blob([result.data], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cardeio-decklists-${cardeioEventIdInput.value.trim()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            cardeioStatus.textContent = 'CSV downloaded.';
        } else {
            // JSON — log and download as JSON
            console.log('Carde.io decklists:', result.data);
            const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cardeio-decklists-${cardeioEventIdInput.value.trim()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            cardeioStatus.textContent = `Fetched ${Array.isArray(result.data) ? result.data.length + ' entries' : 'data'}. Downloaded.`;
        }
    });

    // Carde.io registrations fetch
    const fetchRegsBtn = document.getElementById('fetch-cardeio-registrations');

    fetchRegsBtn.addEventListener('click', () => {
        const eventId = cardeioEventIdInput.value.trim();
        const gameSlug = cardeioGameSlugInput.value.trim();
        if (!eventId) {
            alert('Enter a Carde.io Event ID.');
            return;
        }
        if (!gameSlug) {
            alert('Enter a Game Slug.');
            return;
        }

        fetchRegsBtn.disabled = true;
        fetchRegsBtn.textContent = 'Fetching...';
        cardeioStatus.textContent = '';

        socket.emit('fetch-cardeio-registrations', { eventId, gameSlug });
    });

    socket.on('cardeio-registrations-result', (result) => {
        fetchRegsBtn.disabled = false;
        fetchRegsBtn.textContent = 'Fetch Registrations';

        if (!result.success) {
            cardeioStatus.textContent = 'Error: ' + result.error;
            cardeioStatus.className = 'mb-3 text-danger';
            return;
        }

        cardeioStatus.className = 'mb-3 text-success';
        const eventId = cardeioEventIdInput.value.trim();

        if (result.type === 'text') {
            const blob = new Blob([result.data], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cardeio-registrations-${eventId}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            cardeioStatus.textContent = 'Registrations CSV downloaded.';
        } else {
            console.log('Carde.io registrations:', result.data);
            const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cardeio-registrations-${eventId}.json`;
            a.click();
            URL.revokeObjectURL(url);
            cardeioStatus.textContent = `Fetched ${Array.isArray(result.data) ? result.data.length + ' entries' : 'data'}. Downloaded.`;
        }
    });

    // Carde.io standings fetch
    const fetchStandingsBtn = document.getElementById('fetch-cardeio-standings');
    const cardeioRoundIdInput = document.getElementById('cardeio-round-id');
    const standingsStatus = document.getElementById('cardeio-standings-status');

    fetchStandingsBtn.addEventListener('click', () => {
        const roundId = cardeioRoundIdInput.value.trim();
        if (!roundId) {
            alert('Enter a Round ID.');
            return;
        }

        fetchStandingsBtn.disabled = true;
        fetchStandingsBtn.textContent = 'Fetching...';
        standingsStatus.textContent = '';

        socket.emit('fetch-cardeio-standings', { roundId });
    });

    socket.on('cardeio-standings-result', (result) => {
        fetchStandingsBtn.disabled = false;
        fetchStandingsBtn.textContent = 'Fetch Standings';

        if (!result.success) {
            standingsStatus.textContent = 'Error: ' + result.error;
            standingsStatus.className = 'mb-3 text-danger';
            return;
        }

        standingsStatus.className = 'mb-3 text-success';
        const roundId = cardeioRoundIdInput.value.trim();

        if (result.type === 'text') {
            const blob = new Blob([result.data], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cardeio-standings-round-${roundId}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            standingsStatus.textContent = 'Standings CSV downloaded.';
        } else {
            console.log('Carde.io standings:', result.data);
            const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cardeio-standings-round-${roundId}.json`;
            a.click();
            URL.revokeObjectURL(url);
            standingsStatus.textContent = `Fetched ${Array.isArray(result.data) ? result.data.length + ' entries' : 'data'}. Downloaded.`;
        }
    });

    function updateStatusDisplay(status) {
        const parts = [];
        if (status.hasWebSession) parts.push('web_session');
        if (status.hasWebSessionToken) parts.push('web_sessionToken');
        if (status.hasSessionId) parts.push('sessionid');

        if (parts.length === 3) {
            statusIndicator.textContent = 'All tokens set';
            statusIndicator.className = 'badge bg-success';
        } else if (parts.length > 0) {
            statusIndicator.textContent = `Set: ${parts.join(', ')}`;
            statusIndicator.className = 'badge bg-warning text-dark';
        } else {
            statusIndicator.textContent = 'No tokens set';
            statusIndicator.className = 'badge bg-secondary';
        }
    }
}
