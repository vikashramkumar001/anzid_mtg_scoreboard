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
            { value: 'flyquest', label: 'FlyQuest' },
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
                '--mtg-lt-bg-image': "url('/assets/images/mtg/lower-third/mtg-lower-third.png')",
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
                '--mtg-lt-bg-image': "url('/assets/images/mtg/lower-third/mtg-lower-third.png')",
                // Bracket
                '--bracket-text-color': 'rgba(255,255,255, 1)',
                '--bracket-text-color-faded': 'rgba(255,255,255, 0.5)',
                '--slot-points-width': '70px',
            },
            flyquest: {
                // Scoreboard — font
                '--mtg-font': "'CARBON', sans-serif",
                '--mtg-font-weight': 'normal',

                // Scoreboard — hide header/footer backgrounds (keep children visible)
                '--mtg-header-bg': 'none',
                '--mtg-header-height': '0px',
                '--mtg-footer-bg': 'none',
                '--mtg-footer-height': '0px',

                // Scoreboard — scorebug absolute positioning (break out of header flow)
                '--mtg-scorebug-position': 'absolute',
                '--mtg-scorebug-width': '1920px',
                '--mtg-scorebug-height': '1080px',
                '--mtg-scorebug-top': '0',
                '--mtg-scorebug-left': '0',
                '--mtg-scorebug-flex-direction': 'column',
                '--mtg-scorebug-justify': 'flex-start',
                '--mtg-scorebug-align': 'flex-start',

                // Scoreboard — life totals (125x75 containers, text centered)
                '--mtg-life-position': 'absolute',
                '--mtg-left-life-top': '225px',
                '--mtg-left-life-left': '602px',
                '--mtg-right-life-top': '866px',
                '--mtg-right-life-left': '602px',
                '--mtg-life-width': '125px',
                '--mtg-life-height': '75px',
                '--mtg-life-font-size': '50px',
                '--mtg-life-padding-top': '0px',

                // Scoreboard — player names on right side (537x30 containers, text centered)
                '--mtg-name-position': 'absolute',
                '--mtg-left-name-top': '306px',
                '--mtg-left-name-left': '1339px',
                '--mtg-right-name-top': '1006px',
                '--mtg-right-name-left': '1339px',
                '--mtg-name-width': '537px',
                '--mtg-name-height': '30px',
                '--mtg-name-font-size': '24px',
                '--mtg-name-color': 'white',
                '--mtg-name-text-align': 'center',
                '--mtg-name-align': 'center',
                '--mtg-right-name-align': 'center',
                '--mtg-name-max-font': '24',
                '--mtg-name-max-width': '537',
                '--mtg-name-padding-top': '0px',
                '--mtg-name-title-padding-top': '0px',
                '--mtg-p2-display': 'inline',
                '--mtg-lt-p2-gap': '40px',

                // Scoreboard — hide archetype, mana, records, wins dots, timer spacer
                '--mtg-data-display': 'none',
                '--mtg-record-display': 'none',
                '--mtg-wins-display': 'none',
                '--mtg-timer-spacer-display': 'none',

                // Scoreboard — chyron (hidden, using timer wrapper instead)
                '--mtg-chyron-display': 'none',

                // Scoreboard — timer wrapper repositioned to lower third bar (1260x53)
                '--mtg-timer-top': '993px',
                '--mtg-timer-left': '34px',
                '--mtg-timer-width': '1260px',
                '--mtg-timer-height': '53px',
                '--mtg-timer-flex-direction': 'row',
                '--mtg-timer-justify': 'space-between',
                '--mtg-timer-padding-top': '0px',
                '--mtg-timer-padding-left': '20px',
                '--mtg-timer-padding-right': '20px',
                '--mtg-timer-font-size': '22px',
                '--mtg-event-name-font-size': '22px',
                '--mtg-event-name-width': '200px',
                '--mtg-event-name-overflow': 'visible',
                '--mtg-event-name-text-align': 'left',
                '--mtg-event-round-width': 'auto',
                '--mtg-event-round-flex': '1',
                '--mtg-event-round-margin-top': '0px',
                '--mtg-timer-container-margin-top': '0px',
                '--mtg-timer-container-width': '200px',
                '--mtg-timer-container-align': 'flex-end',
                '--mtg-event-round-font-size': '22px',

                // Scoreboard — hide chyron (using timer wrapper instead)
                '--mtg-chyron-display': 'none',

                // Decklist
                '--mtg-dl-font': "'CARBON', sans-serif",
                '--mtg-dl-name-font-size': '115px',
                '--mtg-dl-name-font-weight': 'normal',
                '--mtg-dl-archetype-font-size': '45px',
                '--mtg-dl-archetype-font-weight': 'normal',

                // Lower third
                '--mtg-lt-bg-image': "url('/assets/images/mtg/lower-third/mtg-lower-third-commentator.png')",
                '--mtg-lt-player-bg-image': "url('/assets/images/mtg/lower-third/mtg-lower-third-player.png')",
                '--mtg-lt-font': "'Beni', sans-serif",
                '--mtg-lt-name-font-weight': '700',
                '--mtg-lt-name-line-height': '0.8',
                '--mtg-lt-winner-max-font': '72',
                '--mtg-lt-winner-max-width': '580',
                '--mtg-lt-subtext-font': "'CARBON', sans-serif",
                '--mtg-lt-subtext-font-weight': 'normal',
                '--mtg-lt-mana-offset-y': '0px',

                // Commentator L3
                '--comm-lt-font': "'Beni', sans-serif",
                '--comm-lt-font-weight': '700',
                '--comm-lt-social-font': "'CARBON', sans-serif",
                '--comm-lt-social-font-weight': 'normal',
                '--comm-lt-name-font-size': '72px',
                '--comm-lt-name-line-height': '0.8',
                '--comm-lt-bg-image': "url('/assets/images/mtg/lower-third/mtg-lower-third-commentator.png')",
                // --comm-lt-width / --comm-lt-height are now set at runtime by
                // broadcast-commentators.js → sizeAndScale() based on the PNG's
                // natural dimensions. Do not hardcode here.
                '--comm-lt-gap': '40px',
                '--comm-lt-bottom': '40px',

                // Scoreboard-overlay (used by /scoreboard/:matchID/:variant on
                // hand-left & hand-right only — CSS gates which team panel shows).
                // Positions below are placeholders; tune visually against the
                // actual hand-left/hand-right frame PNGs.
                '--sb-name-opacity':     '1',
                '--sb-life-opacity':     '1',
                '--sb-name-color':       '#fff',
                '--sb-life-color':       '#fff',
                '--sb-name-font-size':   '42px',
                '--sb-life-font-size':   '140px',
                '--sb-name-font-weight': '700',
                '--sb-life-font-weight': '900',
                // Hand-left — team 1 (P1 + P2 + team 1 life)
                '--sb-p1-name-top':  '820px', '--sb-p1-name-left': '120px',
                '--sb-p2-name-top':  '880px', '--sb-p2-name-left': '120px',
                '--sb-t1-life-top':  '780px', '--sb-t1-life-left': '720px',
                // Hand-right — team 2 (P3 + P4 + team 2 life)
                '--sb-p3-name-top':  '820px', '--sb-p3-name-left': '1400px',
                '--sb-p4-name-top':  '880px', '--sb-p4-name-left': '1400px',
                '--sb-t2-life-top':  '780px', '--sb-t2-life-left': '1100px',
                // Player icons intentionally omitted — deferred. DOM stubs in
                // scoreboard.html are always hidden (--sb-icon-opacity default: 0).
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
                '--rb-lt-bg-image': "url('/assets/images/riftbound/lower-third/riftbound-lower-third-commentator.png')",
                '--rb-lt-player-bg-image': "url('/assets/images/riftbound/lower-third/riftbound-lower-third-player.png')",
                // Winner overrides
                '--rb-lt-winner-img-left': '140px',
                '--rb-lt-winner-img-top': '877px',
                '--rb-lt-winner-width': '611px',
                '--rb-lt-winner-height': '100px',
                '--rb-lt-winner-text-left': '61px',
                '--rb-lt-winner-text-top': '916px',
                '--rb-lt-winner-text-width': '400px',
                // Head-to-head overrides
                // Base path only — broadcast-round-details.js updateTheme()
                // appends -{vendor}-{playerCount} via vc.getAssetPath().
                // Resolves at runtime to riftbound-lower-third-player-tes-1v1.png.
                '--rb-h2h-bg-image': "url('/assets/images/riftbound/lower-third/riftbound-lower-third-player.png')",
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
                // Broadcast Commentator L3
                '--comm-lt-font': "'Akzidenz-Grotesk Next', sans-serif",
                '--comm-lt-font-weight': '700',
                '--comm-lt-name-font-size': '48px',
                '--comm-lt-name-line-height': '35px',
                '--comm-lt-social-font-size': '20px',
                '--comm-lt-social-font-weight': '300',
                '--comm-lt-social-color': '#1ae930',
                // Standings
                '--archetype-font-style': 'italic',
                '--archetype-font-weight': '300',
                '--standings-row-width': '740px',
                '--standings-text-width': '392px',
                '--standings-text-left': '0',
                '--standings-text-margin': '0 22px 0 15px',
                '--standings-text-top': '3px',
                '--standings-text-height': '83px',
                '--standings-rank-align': 'flex-start',
                '--standings-rank-top': '2px',
                '--standings-rank-left': '1.25px',
                '--standings-rank-font-size': '20px',
                '--standings-rank-font-weight': '900',
                '--standings-rank-color': '#fff',
                '--standings-name-font-size': '48px',
                '--standings-name-line-height': '.8',
                '--standings-name-font-weight': '900',
                '--standings-name-color': '#000',
                '--standings-archetype-font-size': '20px',
                '--standings-archetype-color': '#000',
                '--standings-record-font-size': '40px',
                '--standings-record-width': '145px',
                '--standings-record-font-weight': '900',
                '--standings-portrait-display': 'block',
                '--standings-portrait-margin': '0 5px 0 2px',
                '--standings-portrait-width': '118px',
                '--standings-portrait-height': '83px',
                '--standings-rank-width': '34px',
                '--standings-rank-height': '31px',
                '--standings-rank-margin': '0 5px 0 0',
                '--standings-record-color': '#fff',
                '--standings-wrapper-margin-top': '307px',
                '--standings-wrapper-margin-left': '150px',
                '--standings-event-round-display': 'block',
                '--standings-event-round-top': '235px',
                '--standings-event-round-left': '162px',
                '--standings-event-round-font-size': '28px',
                '--standings-event-round-font-weight': '300',
                '--standings-event-round-color': '#fff',
                // Metagame overrides
                '--meta-pie-size': '525px',
                '--meta-pie-y': '110px',
                '--meta-pie-x-final': '-435px',
                '--meta-slice-stroke': '#fff',
                '--meta-card-border': '#fff',
                '--meta-subtitle-day1-visible': 'none',
                '--meta-panel-top': '288px',
                '--meta-panel-right': '102px',
                '--meta-panel-width': '750px',
                '--meta-panel-max-height': '940px',
                '--meta-panel-gap': '4px',
                '--meta-card-padding': '6px',
                '--meta-card-gap': '6px',
                '--meta-card-radius': '6px',
                '--meta-card-portrait-width': '49px',
                '--meta-card-portrait-height': '69px',
                '--meta-card-name-font-size': '28px',
                '--meta-card-counts-font-size': '20px',
                '--meta-panel-header-height': '50px',
                '--meta-subtitle-font-weight': '900',
                '--meta-subtitle-color': '#fff',
                '--meta-subtitle-font-size': '56px',
                '--meta-subtitle-top': '200px',
                '--meta-subtitle-left': '101px',
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
