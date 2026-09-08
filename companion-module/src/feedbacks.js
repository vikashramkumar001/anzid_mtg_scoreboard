import { combineRgb } from '@companion-module/base'
import { GAMES, VENDORS, PLAYER_COUNTS, MATCHES } from './constants.js'

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const GREEN = combineRgb(0, 150, 60)
const AMBER = combineRgb(200, 130, 0)
const BLUE = combineRgb(0, 90, 180)

// All of these are driven by broadcasts the server already sends, so a change
// made in master control lights the button up without Companion polling.
export function buildFeedbacks(self) {
	return {
		game_is: {
			type: 'boolean',
			name: 'Game is selected',
			defaultStyle: { bgcolor: BLUE, color: WHITE },
			options: [{ type: 'dropdown', id: 'game', label: 'Game', default: 'riftbound', choices: GAMES }],
			callback: ({ options }) => self.state.game === options.game,
		},
		vendor_is: {
			type: 'boolean',
			name: 'Vendor is selected',
			defaultStyle: { bgcolor: BLUE, color: WHITE },
			options: [{ type: 'dropdown', id: 'vendor', label: 'Vendor', default: 'default', choices: VENDORS }],
			callback: ({ options }) => self.state.vendor === options.vendor,
		},
		player_count_is: {
			type: 'boolean',
			name: 'Player count is selected',
			defaultStyle: { bgcolor: BLUE, color: WHITE },
			options: [{ type: 'dropdown', id: 'count', label: 'Player count', default: '1v1', choices: PLAYER_COUNTS }],
			callback: ({ options }) => self.state.playerCount === options.count,
		},
		comm_l3_remote: {
			type: 'boolean',
			name: 'Commentator L3 is in remote mode',
			defaultStyle: { bgcolor: AMBER, color: BLACK },
			options: [],
			callback: () => self.state.commL3Remote === true,
		},
		timer_running: {
			type: 'boolean',
			name: 'Timer is running',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [
				{ type: 'textinput', id: 'round', label: 'Round (1-16)', default: '1', useVariables: true },
				{ type: 'dropdown', id: 'match', label: 'Match', default: 'match1', choices: MATCHES },
			],
			callback: async ({ options }) => {
				const round = (await self.parseVariablesInString(options.round)).trim()
				return self.state.timerState?.[round]?.[options.match]?.status === 'running'
			},
		},
		chat_bridge_live: {
			type: 'boolean',
			name: 'Chat bridge is live',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [],
			callback: () => self.state.chatBridge?.live === true,
		},
	}
}
