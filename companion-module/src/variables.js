export function buildVariables() {
	return [
		{ variableId: 'game', name: 'Current game' },
		{ variableId: 'vendor', name: 'Current vendor' },
		{ variableId: 'player_count', name: 'Current player count' },
		{ variableId: 'comm_l3_mode', name: 'Commentator L3 mode (remote / in person)' },
		{ variableId: 'chat_bridge_state', name: 'Chat bridge state (live / paused / off)' },
		{ variableId: 'chat_cards_shown', name: 'Cards shown by chat this stream' },
		{ variableId: 'chat_cooldown_remaining', name: 'Chat cooldown remaining (seconds)' },
		{ variableId: 'chat_queued', name: 'Chat requests parked waiting for a slot' },
	]
}

// Formats a millisecond clock as m:ss for button text.
export function formatClock(ms) {
	if (typeof ms !== 'number' || !isFinite(ms)) return '--:--'
	const total = Math.max(0, Math.round(ms / 1000))
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function pushVariables(self) {
	const cb = self.state.chatBridge
	self.setVariableValues({
		game: self.state.game || '—',
		vendor: self.state.vendor || '—',
		player_count: self.state.playerCount || '—',
		comm_l3_mode: self.state.commL3Remote ? 'remote' : 'in person',
		chat_bridge_state: cb ? (cb.enabled === false ? 'off' : cb.live ? 'live' : 'paused') : 'unreachable',
		chat_cards_shown: cb?.shownThisStream ?? 0,
		chat_cooldown_remaining: cb ? Math.ceil((cb.cooldownRemainingMs || 0) / 1000) : 0,
		chat_queued: Array.isArray(cb?.queued) ? cb.queued.length : 0,
	})
}
