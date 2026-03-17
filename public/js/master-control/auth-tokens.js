export function initAuthTokens(socket) {
    const webSessionInput = document.getElementById('auth-web-session');
    const webSessionTokenInput = document.getElementById('auth-web-session-token');
    const saveButton = document.getElementById('auth-tokens-save');
    const statusIndicator = document.getElementById('auth-token-status');

    // Request current status on load
    socket.emit('get-auth-tokens');

    socket.on('auth-token-status', (status) => {
        updateStatusDisplay(status);
    });

    saveButton.addEventListener('click', () => {
        const tokens = {
            webSession: webSessionInput.value.trim(),
            webSessionToken: webSessionTokenInput.value.trim()
        };
        socket.emit('set-auth-tokens', tokens);

        // Clear inputs after saving (tokens are sensitive)
        webSessionInput.value = '';
        webSessionTokenInput.value = '';
    });

    // Carde.io decklist fetch
    const fetchCardeioBtn = document.getElementById('fetch-cardeio-decklists');
    const cardeioEventIdInput = document.getElementById('cardeio-event-id');
    const cardeioStatus = document.getElementById('cardeio-fetch-status');

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

    function updateStatusDisplay(status) {
        const parts = [];
        if (status.hasWebSession) parts.push('web_session');
        if (status.hasWebSessionToken) parts.push('web_sessionToken');

        if (parts.length === 2) {
            statusIndicator.textContent = 'Both tokens set';
            statusIndicator.className = 'badge bg-success';
        } else if (parts.length === 1) {
            statusIndicator.textContent = `Only ${parts[0]} set`;
            statusIndicator.className = 'badge bg-warning text-dark';
        } else {
            statusIndicator.textContent = 'No tokens set';
            statusIndicator.className = 'badge bg-secondary';
        }
    }
}
