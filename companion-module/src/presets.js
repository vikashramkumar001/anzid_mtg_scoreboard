import { combineRgb } from '@companion-module/base'
import { GAMES, PLAYER_COUNTS, MATCH_FEATURES } from './constants.js'

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const DARK = combineRgb(20, 20, 20)

const base = (text, size = '14') => ({
	text,
	size,
	color: WHITE,
	bgcolor: DARK,
})

// Ready-made buttons so the deck can be laid out by dragging rather than
// configuring each action by hand.
export function buildPresets() {
	const presets = {}

	presets['comm_l3_toggle'] = {
		type: 'button',
		category: 'Commentators',
		name: 'Toggle commentator L3',
		style: base('CASTER\\nL3'),
		steps: [{ down: [{ actionId: 'comm_l3_toggle', options: { mode: 'toggle' } }], up: [] }],
		feedbacks: [{ feedbackId: 'comm_l3_visible', options: {}, style: { bgcolor: combineRgb(40, 160, 70), color: WHITE } }],
	}

	presets['comm_l3_remote'] = {
		type: 'button',
		category: 'Commentators',
		name: 'Remote caster mode',
		style: base('REMOTE\\nL3'),
		steps: [{ down: [{ actionId: 'comm_l3_remote', options: { mode: 'toggle' } }], up: [] }],
		feedbacks: [{ feedbackId: 'comm_l3_remote', options: {}, style: { bgcolor: combineRgb(200, 130, 0), color: BLACK } }],
	}

	presets['scoreboard_decklists'] = {
		type: 'button',
		category: 'Decklists',
		name: 'Scoreboard decklists (slide in / out)',
		style: base('DECK\\nLISTS'),
		steps: [{ down: [{ actionId: 'scoreboard_decklists', options: { mode: 'toggle' } }], up: [] }],
		feedbacks: [{ feedbackId: 'scoreboard_decklists', options: {}, style: { bgcolor: combineRgb(40, 160, 70), color: combineRgb(255, 255, 255) } }],
	}

	presets['sideboard'] = {
		type: 'button',
		category: 'Decklists',
		name: 'Show / hide sideboard',
		style: base('SIDE\\nBOARD'),
		steps: [{ down: [{ actionId: 'sideboard', options: { mode: 'toggle' } }], up: [] }],
		feedbacks: [{ feedbackId: 'sideboard', options: {}, style: { bgcolor: combineRgb(40, 160, 70), color: WHITE } }],
	}

	presets['card_vision'] = {
		type: 'button',
		category: 'Card vision',
		name: 'Card vision start / stop',
		style: base('CARD\\nVISION'),
		steps: [{ down: [{ actionId: 'card_vision', options: { mode: 'toggle' } }], up: [] }],
		feedbacks: [{ feedbackId: 'card_vision_running', options: {}, style: { bgcolor: combineRgb(40, 160, 70), color: WHITE } }],
	}

	// Per-match flags, live round: one "all" button + M1-M4 per feature.
	for (const f of MATCH_FEATURES) {
		for (const target of [{ id: 'all', text: 'ALL' }, { id: '1', text: 'C1' }, { id: '2', text: 'C2' }, { id: '3', text: 'C3' }, { id: '4', text: 'C4' }]) {
			presets[`slot_${f.id}_${target.id}`] = {
				type: 'button',
				category: 'Scoreboard slots',
				name: `${f.label}: ${target.id === 'all' ? 'all slots' : 'control ' + target.id}`,
				style: base(`${f.short}\\n${target.text}`),
				steps: [{ down: [{ actionId: 'match_feature', options: { feature: f.id, slot: target.id, mode: 'toggle' } }], up: [] }],
				feedbacks: [{ feedbackId: 'match_feature', options: { feature: f.id, slot: target.id }, style: { bgcolor: combineRgb(40, 160, 70), color: WHITE } }],
			}
		}
	}
	for (const n of ['1', '2', '3', '4']) {
		presets[`reset_life_${n}`] = {
			type: 'button', category: 'Scoreboard slots', name: `Reset life, control ${n}`,
			style: { ...base(`RESET\\nLIFE C${n}`), bgcolor: combineRgb(110, 70, 0) },
			steps: [{ down: [{ actionId: 'reset_life', options: { slot: n } }], up: [] }], feedbacks: [],
		}
		presets[`reset_match_${n}`] = {
			type: 'button', category: 'Scoreboard slots', name: `Reset match, control ${n}`,
			style: { ...base(`RESET\\nMATCH C${n}`), bgcolor: combineRgb(120, 20, 20) },
			steps: [{ down: [{ actionId: 'reset_match', options: { slot: n } }], up: [] }], feedbacks: [],
		}
		for (const d of [{ id: 'plus', text: '+' }, { id: 'minus', text: '−' }]) {
			presets[`turn_${n}_${d.id}`] = {
				type: 'button',
				category: 'Scoreboard slots',
				name: `Turn ${d.text}1, control ${n}`,
				style: base(`TURN ${d.text}\\nC${n}`),
				steps: [{ down: [{ actionId: 'turn_counter', options: { slot: n, dir: d.id } }], up: [] }],
				feedbacks: [],
			}
		}
	}

	for (const action of [
		{ id: 'start', label: 'START' },
		{ id: 'pause', label: 'PAUSE' },
		{ id: 'reset', label: 'RESET' },
	]) {
		presets[`timer_${action.id}`] = {
			type: 'button',
			category: 'Timer (round 1, match 1)',
			name: `Timer ${action.label}`,
			style: base(`${action.label}\\nR1 M1`),
			steps: [{ down: [{ actionId: 'timer', options: { action: action.id, round: '1', match: 'match1' } }], up: [] }],
			feedbacks:
				action.id === 'start'
					? [{ feedbackId: 'timer_running', options: { round: '1', match: 'match1' }, style: { bgcolor: combineRgb(0, 150, 60), color: WHITE } }]
					: [],
		}
	}

	for (const g of GAMES) {
		presets[`game_${g.id}`] = {
			type: 'button',
			category: 'Show selection',
			name: `Game: ${g.label}`,
			style: base(g.label.split(':')[0].toUpperCase()),
			steps: [{ down: [{ actionId: 'game_selection', options: { game: g.id } }], up: [] }],
			feedbacks: [{ feedbackId: 'game_is', options: { game: g.id }, style: { bgcolor: combineRgb(0, 90, 180), color: WHITE } }],
		}
	}

	for (const c of PLAYER_COUNTS) {
		presets[`count_${c.id}`] = {
			type: 'button',
			category: 'Show selection',
			name: `Player count: ${c.label}`,
			style: base(c.label.toUpperCase()),
			steps: [{ down: [{ actionId: 'player_count', options: { count: c.id } }], up: [] }],
			feedbacks: [{ feedbackId: 'player_count_is', options: { count: c.id }, style: { bgcolor: combineRgb(0, 90, 180), color: WHITE } }],
		}
	}

	presets['obs_preset_restore'] = {
		type: 'button',
		category: 'OBS',
		name: 'Restore layout preset for the live show selection',
		style: base('OBS\\nLAYOUT'),
		steps: [{ down: [{ actionId: 'obs_preset_restore', options: { useCurrent: true, game: 'riftbound', vendor: 'default', count: '1v1' } }], up: [] }],
		feedbacks: [],
	}

	presets['card_clear_1'] = {
		type: 'button',
		category: 'Card viewer',
		name: 'Clear left card viewer',
		style: base('CLEAR\\nCARD L'),
		steps: [{ down: [{ actionId: 'card_clear', options: { slot: '1' } }], up: [] }],
		feedbacks: [],
	}

	presets['card_clear_3'] = {
		type: 'button',
		category: 'Card viewer',
		name: 'Clear chat card slot',
		style: base('CLEAR\\nCHAT'),
		steps: [{ down: [{ actionId: 'card_clear', options: { slot: '3' } }], up: [] }],
		feedbacks: [],
	}

	presets['chat_bridge_live'] = {
		type: 'button',
		category: 'Chat bridge',
		name: 'Chat bridge live / paused',
		style: base('CHAT\\n$(coverage-hub:chat_bridge_state)', '14'),
		steps: [{ down: [{ actionId: 'chat_bridge_live', options: { mode: 'toggle' } }], up: [] }],
		feedbacks: [{ feedbackId: 'chat_bridge_live', options: {}, style: { bgcolor: combineRgb(0, 150, 60), color: WHITE } }],
	}

	return presets
}
