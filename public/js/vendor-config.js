// Vendor/Show + Player Count configuration
// Loaded by all display pages and master control
window.VENDOR_CONFIG = {
    // Game-specific vendor lists (Default is always first)
    gameVendors: {
        mtg: [
            { value: 'default', label: 'Default' },
            { value: 'f2f-legacy', label: 'F2F Legacy' },
            { value: 'f2f', label: 'F2F' },
            { value: 'ldxp', label: 'LDXP' },
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
        mtg: {
            f2f: {
                // Scoreboard
                '--mtg-font': "'Gotham Narrow', sans-serif",
                '--mtg-font-weight': '700',
                '--mtg-name-font-size': '53px',
                '--mtg-name-color': 'white',
                '--mtg-life-font-size': '80px',
                '--mtg-record-font-size': '34px',
                '--mtg-data-font-size': '27px',
                '--mtg-chyron-font-size': '22px',
                // Decklist
                '--mtg-dl-font': "'Gotham Narrow', sans-serif",
                '--mtg-dl-name-font-size': '115px',
                '--mtg-dl-name-font-weight': '700',
                '--mtg-dl-archetype-font-size': '45px',
                '--mtg-dl-archetype-font-weight': '400',
                // Lower third
                '--mtg-lt-bg-image': "url('/assets/images/mtg/lower-third/mtg-lower-third-f2f-1v1.png')",
            },
            ldxp: {
                // Scoreboard
                '--mtg-font': "'Gotham Narrow', sans-serif",
                '--mtg-font-weight': '700',
                '--mtg-name-font-size': '53px',
                '--mtg-name-color': 'white',
                '--mtg-life-font-size': '80px',
                '--mtg-record-font-size': '34px',
                '--mtg-data-font-size': '27px',
                '--mtg-chyron-font-size': '22px',
                // Decklist
                '--mtg-dl-font': "'Gotham Narrow', sans-serif",
                '--mtg-dl-name-font-size': '115px',
                '--mtg-dl-name-font-weight': '700',
                '--mtg-dl-archetype-font-size': '45px',
                '--mtg-dl-archetype-font-weight': '400',
                // Lower third
                '--mtg-lt-bg-image': "url('/assets/images/mtg/lower-third/mtg-lower-third-ldxp-1v1.png')",
                // Bracket
                '--bracket-text-color': 'rgba(255,255,255, 1)',
                '--bracket-text-color-faded': 'rgba(255,255,255, 0.5)',
                '--slot-points-width': '70px',
            },
        },
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
                '--dynamic-font-weight': '900',
                // Position overrides — adjust to match TES frame
                '--rb-name-top': '13.5px',
                '--rb-name-side': '391px',
                '--rb-name-width': '346px',
                '--rb-name-height': '70px',
                '--rb-name-max-font': '48',
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

                // === Decklist overrides ===
                // Background video
                '--rb-dl-font': "'Akzidenz-Grotesk Next'",
                '--rb-dl-bg-video-display': 'none',
                // Frame (side-specific)
                '--rb-dl-frame-left': "url('/assets/images/riftbound/decklist/frame/riftbound-decklist-frame-tes-1v1-left.png')",
                '--rb-dl-frame-right': "url('/assets/images/riftbound/decklist/frame/riftbound-decklist-frame-tes-1v1-right.png')",
                // Container (no offset — old deck-display didn't have one)
                '--rb-dl-container-top': '0px',
                '--rb-dl-container-left': '0px',
                // Player name
                '--rb-dl-name-top': '619px',
                '--rb-dl-name-left': '85px',
                '--rb-dl-name-right': 'auto',
                '--rb-dl-name-align': 'left',
                '--rb-dl-name-font-size': '32px',
                '--rb-dl-name-width': '500px',
                '--rb-dl-name-height': '35px',
                '--rb-dl-name-font-weight': 'bold',
                '--rb-dl-name-color': 'white',
                // Legend name (below player name)
                '--rb-dl-legend-name-display': 'block',
                '--rb-dl-legend-name-top': '650px',
                '--rb-dl-legend-name-left': '85px',
                '--rb-dl-legend-name-right': 'auto',
                '--rb-dl-legend-name-align': 'left',
                '--rb-dl-legend-name-font-size': '20px',
                '--rb-dl-legend-name-font-weight': 'normal',
                '--rb-dl-legend-name-color': 'white',
                '--rb-dl-legend-name-color-left': '#1ec9ff',
                '--rb-dl-legend-name-color-right': '#1ae930',
                // Legend card
                '--rb-dl-legend-top': '40px',
                '--rb-dl-legend-left': '24px',
                '--rb-dl-legend-width': '605px',
                '--rb-dl-legend-height': '831px',
                '--rb-dl-legend-display': 'block',
                '--rb-dl-legend-z': '5',
                // Legend description
                '--rb-dl-legend-desc-top': '270px',
                '--rb-dl-legend-desc-left': '7px',
                '--rb-dl-legend-desc-width': '128px',
                '--rb-dl-legend-desc-height': '170px',
                '--rb-dl-legend-desc-display': 'block',
                // Champion card (hidden — champion goes in grid instead)
                '--rb-dl-champion-display': 'none',
                // Main deck (6 per row × 3 rows = 18 max)
                '--rb-dl-main-top': '39px',
                '--rb-dl-main-left': '661px',
                '--rb-dl-main-width': '1225px',
                '--rb-dl-main-height': '600px',
                '--rb-dl-main-row-gap': '20px',
                '--rb-dl-main-col-gap': '12px',
                '--rb-dl-card-width': '185px',
                // Sideboard (below main deck, horizontal row, smaller cards)
                '--rb-dl-side-top': '887px',
                '--rb-dl-side-left': '703px',
                '--rb-dl-side-width': '1060px',
                '--rb-dl-side-height': '112px',
                '--rb-dl-side-display': 'flex',
                '--rb-dl-side-row-gap': '4px',
                '--rb-dl-side-col-gap': '4px',
                '--rb-dl-side-card-width': '111px',
                '--rb-dl-side-wrap': 'nowrap',
                // Battlefields (under legend, left column)
                '--rb-dl-bf-top': '897px',
                '--rb-dl-bf-left': '52px',
                '--rb-dl-bf-width': '355px',
                '--rb-dl-bf-height': '180px',
                '--rb-dl-bf-display': 'flex',
                '--rb-dl-bf-z': '5',
                '--rb-dl-bf-direction': 'column',
                '--rb-dl-bf-gap': '9px',
                '--rb-dl-bf-card-width': '100%',
                '--rb-dl-bf-card-height': '40px',
                '--rb-dl-bf-img-fit': 'cover',
                '--rb-dl-bf-img-position': 'center',
                '--rb-dl-bf-img-brightness': 'brightness(0.5)',
                '--rb-dl-bf-label-display': 'flex',
                '--rb-dl-bf-label-color': 'white',
                '--rb-dl-bf-label-font': "'Akzidenz-Grotesk Next', sans-serif",
                '--rb-dl-bf-label-font-size': '14px',
                '--rb-dl-bf-label-justify': 'flex-start',
                '--rb-dl-bf-label-align': 'left',
                '--rb-dl-bf-label-left': '59px',
                '--rb-dl-bf-label-shadow': 'none',
                '--rb-dl-count-bottom': '-10px',
                '--rb-dl-count-font-size': '20px',
                '--rb-dl-side-count-font-size': '20px',
                '--rb-dl-side-count-bottom': '-56px',
                // Runes (under battlefields, left column)
                '--rb-dl-runes-top': '860px',
                '--rb-dl-runes-left': '460px',
                '--rb-dl-runes-width': '130px',
                '--rb-dl-runes-height': '200px',
                '--rb-dl-runes-display': 'flex',
                '--rb-dl-rune-badge': 'true',
                '--rb-dl-rune-icon-size': '107px',
                '--rb-dl-rune-badge-size': '28px',
                '--rb-dl-rune-font-size': '22px',
                // Layout behavior
                '--rb-dl-champion-in-grid': 'true',
                '--rb-dl-main-max-cards': '18',

                // === Lower third overrides ===
                '--rb-lt-img-left': '140px',
                '--rb-lt-img-top': '877px',
                '--rb-lt-text-left': '61px',
                '--rb-lt-text-top': '916px',
                '--rb-lt-width': '611px',
                '--rb-lt-height': '100px',
                '--rb-lt-commentator-width': '724px',
                '--rb-lt-commentator-height': '241px',
                '--rb-lt-commentator-text-left': '265px',
                '--rb-lt-commentator-text-top': '924px',
                '--rb-lt-bg-image': "url('/assets/images/riftbound/lower-third/riftbound-lower-third-tes-1v1-commentator.png')",
                '--rb-lt-player-bg-image': "url('/assets/images/riftbound/lower-third/riftbound-lower-third-tes-1v1-player.png')",
                // Winner overrides
                '--rb-lt-winner-img-left': '140px',
                '--rb-lt-winner-img-top': '877px',
                '--rb-lt-winner-width': '611px',
                '--rb-lt-winner-height': '100px',
                '--rb-lt-winner-text-left': '61px',
                '--rb-lt-winner-text-top': '916px',
                '--rb-lt-winner-text-width': '400px',
                // Head-to-head overrides
                '--rb-h2h-bg-image': "url('/assets/images/riftbound/lower-third/riftbound-lower-third-tes-1v1-player.png')",
                '--rb-h2h-img-left': '140px',
                '--rb-h2h-img-top': '877px',
                '--rb-h2h-width': '611px',
                '--rb-h2h-height': '100px',
                '--rb-h2h-text-left': '61px',
                '--rb-h2h-text-top': '916px',
                '--rb-h2h-text-width': '400px',
                '--rb-lt-font': "'Akzidenz-Grotesk Next', sans-serif",
                '--rb-lt-name-font-size': '48px',
                '--rb-lt-name-font-weight': '700',
                '--rb-lt-name-padding-left': '125px',
                '--rb-lt-name-padding-top': '20px',
                '--rb-lt-name-line-height': '35px',
                '--rb-lt-subtext-font-size': '20px',
                '--rb-lt-subtext-font-weight': '300',
                '--rb-lt-subtext-padding-left': '125px',
                '--rb-lt-subtext-color': '#1ae930',
                '--rb-lt-subtext-font-style': 'italic',
                '--rb-lt-text-width': '550px',
                // Standings
                '--archetype-font-style': 'italic',
                '--archetype-font-weight': '400',
                '--standings-text-left': '-25px',
                '--standings-text-top': '3px',
                '--standings-text-height': '83px',
                '--standings-rank-top': '-24px',
                '--standings-rank-left': '-24px',
                '--standings-rank-font-size': '20px',
                '--standings-rank-color': '#fff',
                '--standings-name-font-size': '48px',
                '--standings-name-line-height': '.8',
                '--standings-name-color': '#000',
                '--standings-archetype-font-size': '20px',
                '--standings-archetype-color': '#000',
                '--standings-record-font-size': '40px',
                '--standings-record-color': '#fff',
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
