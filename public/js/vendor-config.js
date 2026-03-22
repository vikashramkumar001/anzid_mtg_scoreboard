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
            tes: {
                '--dynamic-font': 'Akzidenz-Grotesk Next',
                '--dynamic-font-weight': 'bold',
                // Position overrides — adjust to match TES frame
                '--rb-name-top': '13.5px',
                '--rb-name-side': '391px',
                '--rb-name-width': '346px',
                '--rb-name-height': '70px',
                '--rb-name-max-font': '30',
                '--rb-name-max-width': '320',
                '--scoreboard-name-color': '#000000',
                '--rb-name-shadow': 'none',
                '--rb-text-align-left': 'left',
                '--rb-text-align-right': 'right',
                '--rb-detail-font-style': 'italic',
                '--rb-detail-shadow': 'none',
                // '--rb-detail-font-weight': 'normal',
                '--rb-bg-brightness': 'brightness(0.5)',
                '--rb-detail-overflow': 'visible',
                '--rb-life-top': '15px',
                '--rb-life-side': '736.5px',
                '--rb-life-height': '68px',
                '--rb-life-width': '64px',
                '--rb-record-top': '37px',
                '--rb-record-left-side': '341px',
                '--rb-record-right-side': '341px',
                '--rb-record-width': '69px',
                '--rb-record-left-rotate': 'rotate(-90deg)',
                '--rb-record-right-rotate': 'rotate(90deg)',
                '--rb-record-font-size': '20px',
                '--rb-record-max-font': '20',
                '--rb-record-min-font': '15',
                '--rb-record-max-width': '54',
                '--rb-record-left-color': '#1ec9ff',
                '--rb-record-right-color': '#1eff47',
                '--rb-points-font-size': '56px',
                '--rb-points-font': 'Akzidenz-Grotesk Next',
                '--rb-points-max-font': '56',
                '--rb-points-min-font': '36',
                '--rb-points-max-width': '30',
                '--rb-points-left-color': '#1ec9ff',
                '--rb-points-right-color': '#1eff47',
                '--rb-wins-top': '23px',
                '--rb-wins-left-side': '815px',
                '--rb-wins-right-side': '815px',
                '--rb-wins-direction': 'column',
                '--rb-wins-gap': '8.5px',
                '--rb-wins-height': '50px',
                '--rb-wins-right-align': 'flex-end',
                '--rb-card-overlay-z': '3',
                '--rb-card-overlay-top': '542px',
                '--rb-card-overlay-width': '314px',
                '--rb-card-overlay-left': '1584px',
                '--rb-round-top': '829px',
                '--rb-round-shadow': 'none',
                '--rb-timer-top': '869px',
                '--rb-timer-color': '#1ec9ff',
                '--rb-timer-font-size': '72px',
                '--rb-timer-max-width': '140',
                '--rb-event-name-display': 'flex',
                '--rb-event-name-top': '935px',
                '--rb-event-name-height': '44px',
                '--rb-event-name-color': '#000000',
                '--rb-event-name-font-size': '22px',
                '--rb-event-name-left': '0px',
                '--rb-event-name-width': '354px',
                '--rb-legend-bg-top': '14px',
                '--rb-legend-bg-side': '19px',
                '--rb-legend-bg-width': '321px',
                '--rb-legend-bg-height': '83px',
                '--rb-legend-bg-size': 'cover',
                '--rb-legend-bg-pos': 'center 30%',
                '--rb-legend-top': '21px',
                '--rb-legend-side': '60px',
                '--rb-champion-top': '46px',
                '--rb-champion-side': '60px',
                '--rb-bf-bg-top': '100px',
                '--rb-bf-bg-side': '19px',
                '--rb-bf-bg-width': '321px',
                '--rb-bf-top': '93px',
                '--rb-bf-side': '60px',
                '--rb-bf-width': '321px',
                '--rb-runes-display': 'none',
                // '--rb-round-top': '950px',
                // '--rb-round-left': '0px',
                // '--rb-timer-top': '987px',
                // '--rb-timer-left': '103px',
            },
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
