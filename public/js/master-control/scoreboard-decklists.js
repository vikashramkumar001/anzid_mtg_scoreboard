// Master-control toggle: slide both players' vertical decklists onto the
// riftbound scoreboard (in from the panel edges), and back out.
//
// Server-side flag (config/constants.js, in-memory, off after restart). The
// button never guesses: it paints from the server's answer, so every
// master-control tab and every scoreboard page agree.

export function initScoreboardDecklists(socket) {
    const btn = document.getElementById('scoreboard-decklists-toggle');
    if (!btn) return;
    let visible = false;

    function render() {
        btn.textContent = visible ? 'Scoreboard Decklists: on' : 'Scoreboard Decklists: off';
        btn.classList.remove('btn-outline-secondary', 'btn-success');
        btn.classList.add(visible ? 'btn-success' : 'btn-outline-secondary');   // size/layout classes stay as marked up
        btn.title = visible
            ? 'Decklists are on the scoreboard — click to slide them out'
            : 'Slide both players\' decklists onto the riftbound scoreboard';
        document.body.dataset.scoreboardDecklistsVisible = visible ? 'true' : 'false';
    }

    const apply = ({ scoreboardDecklistsVisible } = {}) => { visible = !!scoreboardDecklistsVisible; render(); };
    socket.on('server-current-scoreboard-decklists-visible', apply);
    socket.on('scoreboard-decklists-visible-updated', apply);

    btn.addEventListener('click', () => {
        socket.emit('update-scoreboard-decklists-visible', { scoreboardDecklistsVisible: !visible });
    });

    socket.emit('get-scoreboard-decklists-visible');
    render();
}
