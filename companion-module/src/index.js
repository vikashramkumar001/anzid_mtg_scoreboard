// Companion connection for the AnziD coverage hub scoreboard server.
//
// The app is driven almost entirely by Socket.IO (79 server-side handlers, only
// a handful of REST endpoints), so this module speaks Socket.IO directly rather
// than going through a REST shim. That means:
//   * zero changes to the broadcast server — this connects the same way the
//     master-control page already does;
//   * feedback is PUSHED, not polled. The server already broadcasts
//     'game-selection-updated', 'comm-l3-remote-updated', 'current-all-timer-states'
//     and friends, so buttons light up the instant the operator changes
//     something in master control, not on a poll interval.
//
// The chat bridge is the one exception: its kill switch is REST
// (POST /api/chat-bridge/live/:state), so that action uses fetch().

import { InstanceBase, InstanceStatus, Regex, runEntrypoint } from '@companion-module/base'
import { io } from 'socket.io-client'

import { buildActions } from './actions.js'
import { buildFeedbacks } from './feedbacks.js'
import { buildVariables, pushVariables } from './variables.js'
import { buildPresets } from './presets.js'

class CoverageHubInstance extends InstanceBase {
	async init(config) {
		this.config = config
		// Everything feedbacks and variables read. Populated by the server's own
		// broadcasts; never guessed.
		this.state = {
			game: '',
			vendor: '',
			playerCount: '',
			commL3Remote: false,
			sideboard: false,
			cardVision: null,
			timerState: {},
			scoreboardState: {},
			liveRound: '',
			slots: {},              // controlsTracker: { '1': {round_id, match_id}, ... }
			commL3Visible: false,
			chatBridge: null,
		}
		this.updateStatus(InstanceStatus.Connecting)
		this.buildDefinitions()
		this.connectSocket()
		this.startChatBridgePoll()
	}

	async destroy() {
		this.teardownSocket()
		if (this.chatPoll) {
			clearInterval(this.chatPoll)
			this.chatPoll = undefined
		}
	}

	async configUpdated(config) {
		this.config = config
		this.teardownSocket()
		this.updateStatus(InstanceStatus.Connecting)
		this.connectSocket()
		this.startChatBridgePoll()
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Coverage hub',
				value:
					'Connects to the scoreboard server over Socket.IO — the same connection master control uses. ' +
					'Point this at the machine running <code>npm start</code>.',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Host / IP',
				width: 8,
				default: '127.0.0.1',
				regex: Regex.SOMETHING,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Port',
				width: 4,
				default: '1378',
				regex: Regex.PORT,
			},
		]
	}

	baseUrl() {
		const host = (this.config?.host || '127.0.0.1').trim()
		const port = (this.config?.port || '1378').toString().trim()
		return `http://${host}:${port}`
	}

	buildDefinitions() {
		this.setActionDefinitions(buildActions(this))
		this.setFeedbackDefinitions(buildFeedbacks(this))
		this.setVariableDefinitions(buildVariables())
		this.setPresetDefinitions(buildPresets())
		pushVariables(this)
	}

	// ── Socket.IO ───────────────────────────────────────────────────────────
	connectSocket() {
		const url = this.baseUrl()
		this.log('debug', `connecting to ${url}`)
		this.socket = io(url, {
			transports: ['websocket', 'polling'],
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 10000,
			timeout: 8000,
		})

		this.socket.on('connect', () => {
			this.updateStatus(InstanceStatus.Ok)
			this.log('info', `connected to ${url}`)
			// Most broadcasts are room-scoped (utils/room-utils.js), NOT global —
			// 'current-all-timer-states' goes to master-control and friends, the
			// card-view confirmation to riftbound-card-view. A socket that has
			// not joined a room silently receives neither, so join first: this
			// module is acting as another master-control client.
			this.socket.emit('join-room', 'master-control')
			this.socket.emit('join-room', 'riftbound-card-view')
			// Prime state: the server answers each of these with the current
			// value, so buttons are correct immediately rather than after the
			// operator's next change.
			this.socket.emit('get-game-selection')
			this.socket.emit('get-vendor-selection')
			this.socket.emit('get-player-count')
			this.socket.emit('get-comm-l3-remote')
			this.socket.emit('get-scoreboard-decklists-visible')
			this.socket.emit('get-sideboard-visible')
			this.socket.emit('get-zone-watch')
			this.socket.emit('get-all-timer-states')
			this.socket.emit('get-scoreboard-state')
			this.socket.emit('get-control-broadcast-trackers')
			this.socket.emit('get-comm-l3-visible')
			this.socket.emit('get-broadcast-scoreboard-data')   // answers with the live round id
		})

		this.socket.on('disconnect', (reason) => {
			this.updateStatus(InstanceStatus.Disconnected, reason)
		})
		this.socket.on('connect_error', (err) => {
			this.updateStatus(InstanceStatus.ConnectionFailure, err?.message)
		})

		// The server emits both a "here is the current value" event and an
		// "it changed" event for each of these; treat them identically.
		const setGame = ({ gameSelection } = {}) => this.apply({ game: gameSelection }, ['game_is'])
		const setVendor = ({ vendorSelection } = {}) => this.apply({ vendor: vendorSelection }, ['vendor_is'])
		const setCount = ({ playerCount } = {}) => this.apply({ playerCount }, ['player_count_is'])
		const setRemote = ({ remote } = {}) => this.apply({ commL3Remote: !!remote }, ['comm_l3_remote'])

		this.socket.on('server-current-game-selection', setGame)
		this.socket.on('game-selection-updated', setGame)
		this.socket.on('server-current-vendor-selection', setVendor)
		this.socket.on('vendor-selection-updated', setVendor)
		this.socket.on('server-current-player-count', setCount)
		this.socket.on('player-count-updated', setCount)
		this.socket.on('server-comm-l3-remote', setRemote)
		this.socket.on('comm-l3-remote-updated', setRemote)
		const setDecklists = ({ scoreboardDecklistsVisible } = {}) =>
			this.apply({ scoreboardDecklists: !!scoreboardDecklistsVisible }, ['scoreboard_decklists'])
		this.socket.on('server-current-scoreboard-decklists-visible', setDecklists)
		this.socket.on('scoreboard-decklists-visible-updated', setDecklists)
		const setSideboard = ({ sideboardVisible } = {}) => this.apply({ sideboard: !!sideboardVisible }, ['sideboard'])
		this.socket.on('server-current-sideboard-visible', setSideboard)
		this.socket.on('sideboard-visible-updated', setSideboard)
		// zone-watch-updated is a global emit (not room-scoped) carrying { running, ... }
		this.socket.on('zone-watch-updated', (status) => this.apply({ cardVision: status || null }, ['card_vision_running']))

		this.socket.on('current-all-timer-states', ({ timerState } = {}) => {
			this.apply({ timerState: timerState || {} }, ['timer_running', 'match_feature'])
		})
		this.socket.on('scoreboard-state-data', ({ scoreboardState } = {}) => {
			this.apply({ scoreboardState: scoreboardState || {} }, ['match_feature'])
		})
		this.socket.on('broadcast-scoreboard-round-id', ({ round_id } = {}) => {
			if (round_id) this.apply({ liveRound: String(round_id) }, ['timer_running'])
		})
		this.socket.on('control-broadcast-trackers', ({ controlsTracker } = {}) => {
			this.apply({ slots: controlsTracker || {} }, ['match_feature'])
		})
		const setL3 = ({ visible } = {}) => this.apply({ commL3Visible: !!visible }, ['comm_l3_visible'])
		this.socket.on('server-comm-l3-visible', setL3)
		this.socket.on('comm-l3-visible-updated', setL3)
	}

	teardownSocket() {
		if (!this.socket) return
		this.socket.removeAllListeners()
		this.socket.disconnect()
		this.socket = undefined
	}

	// Merge state, refresh the named feedbacks, and republish variables. One
	// place so no caller can update state and forget to redraw the buttons.
	// "live" → the last round Broadcast was pressed on; anything else is a round number.
	async resolveRound(text) {
		const v = (await this.parseVariablesInString(String(text ?? 'live'))).trim().toLowerCase()
		return v === 'live' || v === '' ? this.state.liveRound : v
	}

	// 'all' → every mapped slot; '1'..'4' → that slot if mapped
	slotTargets(slot) {
		const ids = slot === 'all' ? ['1', '2', '3', '4'] : [String(slot)]
		return ids.map((n) => this.state.slots?.[n]).filter((t) => t && t.round_id && t.match_id)
	}

	matchFeatureOn(feature, round, match) {
		const t = this.state.timerState?.[round]?.[match]
		const s = this.state.scoreboardState?.[round]?.[match]
		if (feature === 'show_timer') return t ? t.show !== false : true   // server default: shown
		if (feature === 'count_up') return !!t?.countUp
		if (feature === 'show_wins') return s ? s.showWins !== false : true
		return false
	}

	sendMatchFeature(feature, round, match, on) {
		if (feature === 'show_wins') return this.send('update-scoreboard-state', { round_id: round, match_id: match, action: 'showWins', value: on })
		const action = feature === 'count_up' ? (on ? 'count-up' : 'count-down') : (on ? 'show' : 'no-show')
		return this.send('update-timer-state', { round_id: round, match_id: match, action })
	}

	apply(patch, feedbackIds = []) {
		Object.assign(this.state, patch)
		pushVariables(this)
		for (const id of feedbackIds) this.checkFeedbacks(id)
	}

	// Emits are fire-and-forget by design: a dropped button press must never
	// take Companion's action queue down mid-show.
	send(event, payload) {
		if (!this.socket?.connected) {
			this.log('warn', `not connected — dropped "${event}"`)
			return false
		}
		try {
			if (payload === undefined) this.socket.emit(event)
			else this.socket.emit(event, payload)
			return true
		} catch (e) {
			this.log('error', `emit "${event}" failed: ${e?.message}`)
			return false
		}
	}

	// ── Chat bridge (REST) ──────────────────────────────────────────────────
	startChatBridgePoll() {
		if (this.chatPoll) clearInterval(this.chatPoll)
		const tick = async () => {
			try {
				const res = await fetch(`${this.baseUrl()}/api/chat-bridge/status`, { signal: AbortSignal.timeout(4000) })
				this.apply({ chatBridge: res.ok ? await res.json() : null }, ['chat_bridge_live'])
			} catch {
				this.apply({ chatBridge: null }, ['chat_bridge_live'])
			}
		}
		tick()
		this.chatPoll = setInterval(tick, 5000)
	}

	async setChatBridgeLive(on) {
		try {
			await fetch(`${this.baseUrl()}/api/chat-bridge/live/${on ? 'on' : 'off'}`, {
				method: 'POST',
				signal: AbortSignal.timeout(4000),
			})
		} catch (e) {
			this.log('error', `chat bridge toggle failed: ${e?.message}`)
		}
	}
}

runEntrypoint(CoverageHubInstance, [])
