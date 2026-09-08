import { GAMES, VENDORS, PLAYER_COUNTS, TIMER_ACTIONS, MATCHES, CARD_SLOTS } from './constants.js'

export function buildActions(self) {
	return {
		// ── Commentator lower thirds ────────────────────────────────────────
		comm_l3_toggle: {
			name: 'Commentator L3: toggle on/off',
			options: [],
			callback: () => self.send('toggle-commentator-l3'),
		},
		comm_l3_remote: {
			name: 'Commentator L3: remote mode',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'on', label: 'Remote (one L3 per cam segment)' },
						{ id: 'off', label: 'In person (bottom row)' },
					],
				},
			],
			callback: ({ options }) => {
				const remote = options.mode === 'toggle' ? !self.state.commL3Remote : options.mode === 'on'
				self.send('update-comm-l3-remote', { remote })
			},
		},

		// ── Timers ──────────────────────────────────────────────────────────
		// round_id and match_id address one match's clock, so these are text
		// fields with variable support rather than a fixed dropdown — the same
		// button can follow a "current round" custom variable.
		timer: {
			name: 'Timer: start / pause / reset / adjust',
			options: [
				{
					type: 'dropdown',
					id: 'action',
					label: 'Action',
					default: 'start',
					choices: TIMER_ACTIONS,
				},
				{ type: 'textinput', id: 'round', label: 'Round (1-16)', default: '1', useVariables: true },
				{ type: 'dropdown', id: 'match', label: 'Match', default: 'match1', choices: MATCHES },
			],
			callback: async ({ options }) => {
				const round = await self.parseVariablesInString(options.round)
				self.send('update-timer-state', {
					round_id: round.trim(),
					match_id: options.match,
					action: options.action,
				})
			},
		},

		// ── Show selection ──────────────────────────────────────────────────
		game_selection: {
			name: 'Set game',
			options: [{ type: 'dropdown', id: 'game', label: 'Game', default: 'riftbound', choices: GAMES }],
			callback: ({ options }) => self.send('update-game-selection', { gameSelection: options.game }),
		},
		vendor_selection: {
			name: 'Set vendor',
			options: [{ type: 'dropdown', id: 'vendor', label: 'Vendor', default: 'default', choices: VENDORS }],
			callback: ({ options }) => self.send('update-vendor-selection', { vendorSelection: options.vendor }),
		},
		player_count: {
			name: 'Set player count',
			options: [{ type: 'dropdown', id: 'count', label: 'Player count', default: '1v1', choices: PLAYER_COUNTS }],
			callback: ({ options }) => self.send('update-player-count', { playerCount: options.count }),
		},

		// ── Card viewer ─────────────────────────────────────────────────────
		card_view: {
			name: 'Card viewer: show card',
			options: [
				{ type: 'dropdown', id: 'slot', label: 'Slot', default: '1', choices: CARD_SLOTS },
				{
					type: 'textinput',
					id: 'card',
					label: 'Card name (exact, as printed)',
					default: '',
					useVariables: true,
				},
			],
			callback: async ({ options }) => {
				const card = (await self.parseVariablesInString(options.card)).trim()
				if (!card) return
				self.send('riftbound-card-view-view-card', {
					cardSelected: { 'game-id': 'riftbound', 'card-selected': card, 'card-id': options.slot },
				})
			},
		},
		card_clear: {
			name: 'Card viewer: clear slot',
			options: [{ type: 'dropdown', id: 'slot', label: 'Slot', default: '1', choices: CARD_SLOTS }],
			callback: ({ options }) =>
				self.send('riftbound-card-view-view-card', {
					cardSelected: { 'game-id': 'riftbound', 'card-selected': '', 'card-id': options.slot },
				}),
		},

		// ── OBS layout preset ───────────────────────────────────────────────
		obs_preset_restore: {
			name: 'OBS: restore scene preset',
			options: [
				{
					type: 'checkbox',
					id: 'useCurrent',
					label: 'Use the show selection that is live right now',
					default: true,
				},
				{ type: 'dropdown', id: 'game', label: 'Game (if not using current)', default: 'riftbound', choices: GAMES, isVisible: (o) => !o.useCurrent },
				{ type: 'dropdown', id: 'vendor', label: 'Vendor (if not using current)', default: 'default', choices: VENDORS, isVisible: (o) => !o.useCurrent },
				{ type: 'dropdown', id: 'count', label: 'Player count (if not using current)', default: '1v1', choices: PLAYER_COUNTS, isVisible: (o) => !o.useCurrent },
			],
			callback: ({ options }) => {
				const game = options.useCurrent ? self.state.game : options.game
				const vendor = options.useCurrent ? self.state.vendor : options.vendor
				const playerCount = options.useCurrent ? self.state.playerCount : options.count
				if (!game || !vendor || !playerCount) {
					self.log('warn', 'preset restore skipped — show selection not known yet')
					return
				}
				// Repositions existing sources only; it cannot add or remove them.
				self.send('restore-obs-preset', { game, vendor, playerCount })
			},
		},

		// ── Chat-driven card viewer kill switch (REST, not socket) ──────────
		chat_bridge_live: {
			name: 'Chat bridge: live / paused',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'on', label: 'Live' },
						{ id: 'off', label: 'Paused' },
					],
				},
			],
			callback: async ({ options }) => {
				const live = self.state.chatBridge?.live === true
				const target = options.mode === 'toggle' ? !live : options.mode === 'on'
				await self.setChatBridgeLive(target)
				self.startChatBridgePoll() // reflect it on the button immediately
			},
		},
	}
}
