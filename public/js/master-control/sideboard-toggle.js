// Controls tab — Show Sideboard. The same global flag the per-round switches
// on the Matches tab drive (update-sideboard-visible); paints only from the
// server's answer so every tab and every decklist surface agree.
export function initSideboardToggle(socket) {
    const btn = document.getElementById('controls-sideboard-toggle');
    if (!btn) return;
    let visible = false;
    const render = () => {
        btn.textContent = visible ? 'Show Sideboard: on' : 'Show Sideboard: off';
        btn.classList.remove('btn-outline-secondary', 'btn-success');
        btn.classList.add(visible ? 'btn-success' : 'btn-outline-secondary');
    };
    const apply = ({ sideboardVisible } = {}) => { visible = !!sideboardVisible; render(); };
    socket.on('server-current-sideboard-visible', apply);
    socket.on('sideboard-visible-updated', apply);
    btn.addEventListener('click', () => socket.emit('update-sideboard-visible', { sideboardVisible: !visible }));
    socket.emit('get-sideboard-visible');
    render();
}
