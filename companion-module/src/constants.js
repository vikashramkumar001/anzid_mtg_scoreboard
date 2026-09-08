// Values mirrored from the scoreboard app. Kept in one place so a rename in
// the app is a one-line change here rather than a hunt through dropdowns.
export const GAMES = [
	{ id: 'riftbound', label: 'Riftbound' },
	{ id: 'mtg', label: 'Magic: The Gathering' },
	{ id: 'vibes', label: 'Vibes' },
	{ id: 'starwars', label: 'Star Wars Unlimited' },
]

export const VENDORS = [
	{ id: 'default', label: 'Default' },
	{ id: 'anu', label: 'AnziD (anu)' },
	{ id: 'dsg', label: 'DSG' },
	{ id: 'tes', label: 'TES' },
	{ id: 'flyquest', label: 'FlyQuest' },
	{ id: 'merlion', label: 'Merlion' },
	{ id: 'uvs-unleashed', label: 'UVS Unleashed' },
]

export const PLAYER_COUNTS = [
	{ id: '1v1', label: '1v1' },
	{ id: '2v2', label: '2v2' },
	{ id: 'ffa', label: 'FFA (4 player)' },
]

// features/timers.js: timerState[round][matchN], status stopped|running|paused
export const TIMER_ACTIONS = [
	{ id: 'start', label: 'Start' },
	{ id: 'pause', label: 'Pause' },
	{ id: 'reset', label: 'Reset' },
	{ id: 'add', label: 'Add 1 minute' },
	{ id: 'minus', label: 'Subtract 1 minute' },
]

export const MATCHES = [1, 2, 3, 4].map((n) => ({ id: `match${n}`, label: `Match ${n}` }))

// scoreboard.js routes card-id '1' to the LEFT viewer and anything else to the
// RIGHT one — it is not a 1/2 whitelist. Slot 3 is what the chat bridge uses.
export const CARD_SLOTS = [
	{ id: '1', label: 'Slot 1 (left viewer)' },
	{ id: '2', label: 'Slot 2 (right viewer)' },
	{ id: '3', label: 'Slot 3 (right viewer — shared with chat)' },
]
