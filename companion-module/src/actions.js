import { GAMES, VENDORS, PLAYER_COUNTS, TIMER_ACTIONS, MATCHES, CARD_SLOTS, MATCH_FEATURES, SLOT_CHOICES } from './constants.js'

export function buildActions(self) {
	return {
		// ── Commentator lower thirds ────────────────────────────────────────
		comm_l3_toggle: {
			name: 'Commentator L3: show / hide',
			options: [
				{
					type: 'dropdown', id: 'mode', label: 'Mode', default: 'toggle',
					choices: [{ id: 'toggle', label: 'Toggle' }, { id: 'on', label: 'Show (auto-hides after 5s)' }, { id: 'off', label: 'Hide' }],
				},
			],
			callback: ({ options }) => {
				if (options.mode === 'toggle') return self.send('toggle-commentator-l3')
				self.send('update-comm-l3-visible', { visible: options.mode === 'on' })
			},
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

		// ── Scoreboard decklists ────────────────────────────────────────────
		// Slides both players' vertical decklists over the riftbound
		// scoreboard's side panels (and back out). Same flag master control's
		// "Scoreboard Decklists" button drives.
		scoreboard_decklists: {
			name: 'Scoreboard decklists: slide in / out',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'on', label: 'Show (slide in)' },
						{ id: 'off', label: 'Hide (slide out)' },
					],
				},
			],
			callback: ({ options }) => {
				const visible = options.mode === 'toggle' ? !self.state.scoreboardDecklists : options.mode === 'on'
				self.send('update-scoreboard-decklists-visible', { scoreboardDecklistsVisible: visible })
			},
		},

		// ── Show sideboard ──────────────────────────────────────────────────
		// Global flag: the decklist scenes, the vertical lists and the scoreboard
		// panels all include/exclude the sideboard together.
		sideboard: {
			name: 'Sideboard: show / hide',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'on', label: 'Show' },
						{ id: 'off', label: 'Hide' },
					],
				},
			],
			callback: ({ options }) => {
				const visible = options.mode === 'toggle' ? !self.state.sideboard : options.mode === 'on'
				self.send('update-sideboard-visible', { sideboardVisible: visible })
			},
		},

		// ── Card vision (zone_watch recognizer on the server's machine) ─────
		card_vision: {
			name: 'Card vision: start / stop',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'on', label: 'Start' },
						{ id: 'off', label: 'Stop' },
					],
				},
			],
			callback: ({ options }) => {
				const running = self.state.cardVision?.running === true
				const start = options.mode === 'toggle' ? !running : options.mode === 'on'
				self.send(start ? 'start-zone-watch' : 'stop-zone-watch', {})
			},
		},

		// ── Per-match scoreboard flags (Show Timer / Count Up / Show Wins) ──
		// Same state the Matches tab checkboxes and the Controls tab pills
		// drive. Round "live" = the last round Broadcast was pressed on.
		// "Slot" = Control 1-4 = the round/match each scoreboard page is mapped
		// to on the Matches tab (what the clock/wins/turns render on), not the
		// broadcast round.
		match_feature: {
			name: 'Scoreboard slot: show timer / count up / show wins',
			options: [
				{ type: 'dropdown', id: 'feature', label: 'Feature', default: 'show_timer', choices: MATCH_FEATURES },
				{ type: 'dropdown', id: 'slot', label: 'Scoreboard slot', default: 'all', choices: SLOT_CHOICES },
				{
					type: 'dropdown', id: 'mode', label: 'Mode', default: 'toggle',
					choices: [{ id: 'toggle', label: 'Toggle' }, { id: 'on', label: 'On' }, { id: 'off', label: 'Off' }],
				},
			],
			callback: ({ options }) => {
				const targets = self.slotTargets(options.slot)
				if (!targets.length) { self.log('warn', 'slot feature skipped — slot not mapped yet'); return }
				const allOn = targets.every(({ round_id, match_id }) => self.matchFeatureOn(options.feature, round_id, match_id))
				const on = options.mode === 'toggle' ? !allOn : options.mode === 'on'
				for (const { round_id, match_id } of targets) self.sendMatchFeature(options.feature, round_id, match_id, on)
			},
		},
		reset_life: {
			name: 'Scoreboard slot: reset life',
			options: [{ type: 'dropdown', id: 'slot', label: 'Scoreboard slot', default: '1', choices: SLOT_CHOICES }],
			callback: ({ options }) => { for (const t of self.slotTargets(options.slot)) self.resetLife(t) },
		},
		reset_match: {
			name: 'Scoreboard slot: reset match (life, wins, XP/poison, clock)',
			options: [{ type: 'dropdown', id: 'slot', label: 'Scoreboard slot', default: '1', choices: SLOT_CHOICES }],
			callback: ({ options }) => { for (const t of self.slotTargets(options.slot)) self.resetMatch(t) },
		},
		turn_counter: {
			name: 'Scoreboard slot: turn counter +1 / -1',
			options: [
				{ type: 'dropdown', id: 'slot', label: 'Scoreboard slot', default: '1', choices: SLOT_CHOICES.filter((s) => s.id !== 'all') },
				{ type: 'dropdown', id: 'dir', label: 'Direction', default: 'plus', choices: [{ id: 'plus', label: '+1' }, { id: 'minus', label: '-1' }] },
			],
			callback: ({ options }) => {
				const [t] = self.slotTargets(options.slot)
				if (!t) return
				self.send('update-timer-state', { round_id: t.round_id, match_id: t.match_id, action: options.dir === 'plus' ? 'turn-plus' : 'turn-minus' })
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
