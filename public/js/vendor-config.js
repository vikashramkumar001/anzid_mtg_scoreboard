// Vendor/Show + Player Count configuration
// Loaded by all display pages and master control
window.VENDOR_CONFIG = {
    // Game-specific vendor lists (Default is always first)
    gameVendors: {
        mtg: [
            { value: 'default', label: 'Default' },
            { value: 'f2f', label: 'F2F' },
        ],
        riftbound: [
            { value: 'default', label: 'Default' },
            { value: 'dsg', label: 'DSG' },
            { value: 'tes', label: 'TES' },
        ],
        vibes: [
            { value: 'default', label: 'Default' },
        ],
        starwars: [
            { value: 'default', label: 'Default' },
        ],
    },

    // Player count options (same for all games)
    playerCounts: [
        { value: '1v1', label: '1v1' },
        { value: '2v2', label: '2v2' },
        { value: 'ffa', label: 'FFA' },
    ],

    // game -> vendor -> CSS custom property overrides (only non-default combos)
    overrides: {
        riftbound: {
            dsg: {
                '--dynamic-font': 'Garamond',
                '--dynamic-font-weight': '400',
                '--scoreboard-name-color': '#111826',
                '--scoreboard-record-color': '#111826',
                '--scoreboard-points-color': '#f0ebdf',
            },
            tes: { '--dynamic-font': 'Akzidenz', '--dynamic-font-weight': 'bold' },
        },
    },

    // Get vendor list for a game (always includes Default)
    getVendorsForGame(game) {
        return this.gameVendors[game] || [{ value: 'default', label: 'Default' }];
    },

    // Returns the asset path with vendor + player count suffix
    // e.g., getAssetPath('/assets/images/mtg/bracket/bracket-frame.png', 'dsg', '1v1')
    //     → '/assets/images/mtg/bracket/bracket-frame-dsg-1v1.png'
    getAssetPath(basePath, vendor, playerCount) {
        const v = vendor || 'default';
        const p = playerCount || '1v1';
        const suffix = '-' + v + '-' + p;
        const lastDot = basePath.lastIndexOf('.');
        if (lastDot === -1) return basePath + suffix;
        return basePath.slice(0, lastDot) + suffix + basePath.slice(lastDot);
    },

    // Returns all CSS custom property names used by any vendor override
    getAllOverrideProperties() {
        const props = new Set();
        for (const game in this.overrides) {
            for (const vendor in this.overrides[game]) {
                Object.keys(this.overrides[game][vendor]).forEach(p => props.add(p));
            }
        }
        return [...props];
    },

    // Returns style override object for a game+vendor combo (empty if none)
    getOverrides(game, vendor) {
        if (!vendor || vendor === 'default') return {};
        return (this.overrides[game] && this.overrides[game][vendor]) || {};
    },
};
