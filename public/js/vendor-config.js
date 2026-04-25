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

                // Scoreboard — player portrait icons (classic /scoreboard page).
                // Flanks each life-total row with two 78×78 borders baked into
                // the flyquest-2v2 frame PNG. Coords from the PSD
                // (scripts/inspect-psd.mjs → mtg-scoreboard-frame-flyquest-2v2.psd):
                //   top player left border:  top=223 left=526
                //   top life total bg:       top=223 left=600  (129×79)
                //   top player right border: top=223 left=726
                //   bot player left border:  top=864 left=526
                //   bot life total bg:       top=865 left=600  (129×77)
                //   bot player right border: top=864 left=726
                // Icons inset 2px inside the borders so the baked outline
                // still shows around each portrait. P1/P2 = team 1 (top),
                // P3/P4 = team 2 (bottom) — same team→row convention used
                // above for --mtg-left-life (team 1) vs --mtg-right-life (team 2).
                '--mtg-icon-opacity':  '1',
                '--mtg-icon-width':    '67px',
                '--mtg-icon-height':   '67px',
                '--mtg-p1-icon-top':   '229px',
                '--mtg-p1-icon-left':  '531px',
                '--mtg-p2-icon-top':   '229px',
                '--mtg-p2-icon-left':  '731px',
                '--mtg-p3-icon-top':   '870px',
                '--mtg-p3-icon-left':  '531px',
                '--mtg-p4-icon-top':   '870px',
                '--mtg-p4-icon-left':  '731px',

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

                // 2v2 — shared 537×30 strip: both names render side-by-side
                // inside the one strip joined by " & " (hooked in scoreboard.css
                // "2v2 MTG: vendor hook" block). font-size kept at 24px so two
                // names + separator fit inside the strip.
                '--2v2-name-font-size':       '24px',
                '--mtg-2v2-name-direction':   'row',
                '--mtg-2v2-name-gap':         '0px',
                '--mtg-2v2-name-align':       'center',
                '--mtg-2v2-name-align-right': 'center',
                // Non-breaking spaces (U+00A0) on both sides — regular spaces
                // at the start of generated `::before` content collapse when
                // laid out as the leading edge of a flex child, which showed
                // up as "P1& P2" instead of "P1 & P2".
                '--mtg-2v2-name-separator':   '"\u00a0&\u00a0"',

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

                // Scoreboard — card-view overlay (FlyQuest 2v2 positioning +
                // animation). Card is centered on the middle cam frame (PSD
                // "mid cam frame" layer: x=1327-1887, y=381-697 → center
                // 1607, 539). Card size is 414×580 (MTG 5:7 aspect; +15% over
                // the 360×504 pass, which was +20% over the 300×420 first pass;
                // cumulative ≈ +38% vs. first pass). Both card-id 1 and
                // card-id 2 resolve to the same center — in FQ 2v2 only one
                // slot shows at a time on the mid cam.
                //   left overlay positioning:  left = 1607 − 414/2 = 1400
                //   right overlay positioning: right = 1920 − 1400 − 414 = 106
                //   top (shared):              top  = 539  − 580/2 = 249
                // Animation (View): slide up 60px + fade 0→1 + rotateY 0→-15°
                // over 350ms (3D tilt toward the board — negative rotateY means
                // the right edge rotates forward / toward the viewer, the left
                // edge recedes; a 15° tilt is a pronounced tilt, larger than
                // the 7° used on standings). Dim layer fades in parallel on
                // the same duration.
                // Animation (Reset): rotateY -15°→0° + fade 1→0 + dim fade
                // over 350ms; NO vertical slide (scoreboard.js pins translateY
                // during reset, then silently re-cocks to --slide-offset for
                // the next view).
                '--mtg-card-overlay-top':    '249px',
                '--mtg-card-overlay-width':  '414px',
                '--mtg-card-overlay-left':   '1400px',  // card-id 1 (left DOM) → mid cam center
                '--mtg-card-overlay-right':  '106px',   // card-id 2 (right DOM) → same center
                '--mtg-card-overlay-z':      '25',
                '--mtg-card-slide-offset':   '60px',
                '--mtg-card-slide-duration': '350ms',
                '--mtg-card-fade-duration':  '350ms',
                '--mtg-card-slide-easing':   'ease-out',
                '--mtg-card-perspective':    '1500px',
                '--mtg-card-tilt':           '-12deg',

                // Scoreboard — card-view dim layer (full-viewport top→bottom,
                // but bounded LEFT by the camera frame border so the dim never
                // bleeds onto the board / lower-third / event logo on the left
                // side of the scoreboard). Gradient math (% of 1920px viewport):
                //   0%    → 69.1%  : transparent (everything left of cam frame)
                //   69.1% → 72.0%  : feather transparent → dim color
                //   72.0% → 100%   : solid dim color (covers the camera column)
                // PSD layout anchors (FQ 2v2 frame):
                //   cam frames (top/mid/bot): x = 1327 - 1887
                //   1327 / 1920 = 69.1% ← left feather edge (cam border)
                //   card left edge: 1400 / 1920 = 72.9% (card sits in full dim)
                // Tune feather-start/end to nudge the blend line if the frame
                // asset changes; keep feather-start ≥ 69.1% so dim never
                // extends past the camera border.
                //
                // IMPORTANT — why dim is opaque (not backdrop-filter blur):
                // backdrop-filter is a *browser* effect: it blurs pixels that
                // Chrome has rendered behind the element. In the broadcast, the
                // cam feeds are OBS sources composited BEHIND the scoreboard
                // browser-source — they never enter Chrome's compositor, so
                // backdrop-filter cannot see or blur them. To visibly fog /
                // darken the cams we have to render an *opaque* layer in the
                // browser; OBS then composites that layer on top of the cams,
                // which blends the tint into the final broadcast output.
                // A white-tint opaque dim gives the "frosted glass" LOOK in the
                // broadcast (soft fog over the cams) — at the cost of no true
                // blur. True blur would require the cams to be rendered IN the
                // browser (WebRTC / <video>), which is a different architecture.
                '--mtg-card-dim-color':         'rgba(0, 0, 0, 0)',     // dim disabled (shadow-only test)
                '--mtg-card-blur-amount':       '0px',                   // disabled (see note above)
                '--mtg-card-saturate':          '100%',                  // no-op without blur
                '--mtg-card-dim-feather-start': '65.2%',   // = 1252px
                '--mtg-card-dim-feather-end':   '69.2%',   // = 1329px (just past cam border at 1327)
                '--mtg-card-dim-z':             '22',

                // Card drop shadow — soft halo behind the card to lift it off the
                // cam without a global dim. Renders as opaque-ish pixels in the
                // browser layer, which OBS composites on top of cam sources, so
                // the shadow visibly darkens the cam area immediately around the
                // card. Format: offset-x offset-y blur spread color.
                //   0 0          : no directional offset (symmetric halo)
                //   80px blur    : soft falloff
                //   10px spread  : shadow extends 10px beyond card bounds before blur
                //   rgba 0.75    : strong enough to read over bright cam content
                '--mtg-card-shadow':            '0 0 80px 10px rgba(0, 0, 0, 0.75)',

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
                // hand-left & hand-right). In 2v2 both team panels render so
                // both name pairs are visible; only the active team's life
                // shows (CSS gates this — see scoreboard-scene.css).
                //
                // hand-left-fq-2v2 PSD positions:
                //   • Top life total bg:    x=896-1021, y=64-139   (125×75)
                //   • Left cam name strip:  x=132-931,  y=1002-1032 (799×30)  → Team 1 (P1 & P2)
                //   • Right cam name strip: x=987-1787, y=1002-1032 (800×30)  → Team 2 (P3 & P4)
                '--sb-name-opacity':     '1',
                '--sb-life-opacity':     '1',
                '--sb-name-color':       '#fff',
                '--sb-life-color':       '#fff',
                '--sb-name-font-size':   '24px',
                '--sb-life-font-size':   '50px',
                '--sb-name-font-weight': '700',
                '--sb-life-font-weight': '900',
                '--sb-font':             "'CARBON', sans-serif",
                // Life total: 125×75 box, text centered via flex.
                '--sb-life-width':       '125px',
                '--sb-life-height':      '75px',
                '--sb-life-align':       'center',
                '--sb-life-display':     'flex',
                '--sb-life-items':       'center',
                '--sb-life-justify':     'center',
                // 2v2 name strips — wrapper positioned per team, names
                // flow inline inside and are joined by " & ". PSD strip is
                // 30px tall, so pin the wrapper height and center vertically.
                '--sb-names-separator':  '" & "',
                '--sb-names-justify':    'center',
                '--sb-names-height':     '30px',
                '--sb-t1-names-top':     '1002px',
                '--sb-t1-names-left':    '132px',
                '--sb-t1-names-width':   '800px',
                '--sb-t2-names-top':     '1002px',
                '--sb-t2-names-left':    '987px',
                '--sb-t2-names-width':   '800px',
                // Life total positions (only the active team's renders).
                '--sb-t1-life-top':      '64px',
                '--sb-t1-life-left':     '896px',
                // NOTE: hand-right PSD not yet provided; mirrored from hand-left
                // on the assumption that the frame is symmetric. Confirm against
                // hand-right-fq-2v2.psd when available.
                '--sb-t2-life-top':      '64px',
                '--sb-t2-life-left':     '896px',
                // Player icons — src is stamped per-match by scoreboard-scene.js
                // from the global roster (features/roster.js, playerRoster.json).
                // Any icon whose name has no roster match is hidden via
                // display:none by scoreboard-scene.js, so these positions only
                // affect matched players.
                //
                // Coords derived from the hand-left-flyquest-2v2 PSD layers
                // (scripts/inspect-psd.mjs):
                //   • player left border:  top=62 left=819  79×78
                //   • top life total bg:   top=63 left=895  127×77
                //   • player right border: top=62 left=1019 79×78
                // Icon is inset 2px from the border so the baked-in frame
                // outline on the PNG stays visible around the portrait.
                // P3/P4 use the same slots on hand-right (mirrored — hand-right
                // PSD not yet supplied, matching the t2-life mirror assumption
                // a few lines above). The CSS in scoreboard-scene.css hides
                // the inactive-team icons per variant in 2v2.
                '--sb-icon-opacity':  '1',
                '--sb-icon-width':    '67px',
                '--sb-icon-height':   '67px',
                '--sb-p1-icon-top':   '68px',
                '--sb-p1-icon-left':  '825px',
                '--sb-p2-icon-top':   '68px',
                '--sb-p2-icon-left':  '1025px',
                '--sb-p3-icon-top':   '68px',
                '--sb-p3-icon-left':  '825px',
                '--sb-p4-icon-top':   '68px',
                '--sb-p4-icon-left':  '1025px',

                // ── Standings (/broadcast/round/standings-combined) ───────
                // FlyQuest 2v2 "Idea 1" groups layout. The layout itself is
                // gated by body[data-vendor="flyquest"][data-player-count="2v2"]
                // in broadcast-round-standings-all.css; these vars just skin
                // the chrome.
                '--stand-pill-color':              '#00705a', // FlyQuest Green
                '--stand-pill-radius':             '6px',
                '--stand-portrait-radius':         '4px',
                '--stand-thumb-radius':            '4px',
                '--stand-captain-border':          '4px',
                '--stand-thumb-border':            '2px',
                '--stand-text-color':              '#fff',
                '--stand-font':                    "'CARBON', sans-serif",
                '--stand-font-weight':             'normal',
                '--stand-header-font-size':        '72px',
                '--stand-header-letter-spacing':   '2px',
                '--stand-group-pill-font-size':    '22px',
                '--stand-group-pill-letter-spacing': '2px',
                '--stand-row-name-font-size':      '28px',
                '--stand-row-name-padding':        '20px',
                '--stand-row-record-font-size':    '32px',
                '--stand-captain-object-position': 'center 20%',
                '--stand-thumb-object-position':   'center 20%',
                // Perspective — group 1 (left bracket) fans toward camera on
                // its right edge, group 2 (right bracket) on its left edge.
                // Origins are set in broadcast-round-standings-all.css so the
                // two fan symmetrically. CSS rotateY is a lot flatter than
                // Photoshop's perspective warp at the same angle, so we push
                // harder here: bigger rotation + closer camera (smaller
                // perspective distance) = more prominent foreshortening.
                // Dial the angle for "how much it turns"; dial the distance
                // for "how strong the depth cue reads".
                '--stand-perspective':             '1200px',
                '--stand-group1-tilt':             '7deg',
                '--stand-group2-tilt':             '-7deg',
                // Uniform scale applied to both bracket-tilt layers. Shrinks
                // toward the inward pivot, so the outer edges pull in toward
                // center while the inner edges stay anchored to the header.
                '--stand-bracket-scale':           '0.9',
                // Horizontal gap between the two brackets — pushes each
                // bracket outward by this amount (so total extra air =
                // 2 × this value). Gets visually multiplied by
                // --stand-bracket-scale. Dial for the "even T" header/
                // brackets alignment.
                '--stand-bracket-gap':             '30px',

                // ── Bracket (/display/bracket-full) ──────────────────────
                // FlyQuest 2v2 bracket: 4 teams, single-elim. Reuses the
                // existing 1v1 slot IDs — only the 7 slots mapped in the
                // seeding table below are shown; the other 7 are hidden
                // via per-slot `--slot-{id}-display: none` overrides.
                //
                // Seeding (standard single-elim 1v4, 2v3):
                //   rank 1 → QF 1   (PSD position QF A)
                //   rank 4 → QF 4   (PSD position QF B)
                //   rank 2 → QF 2   (PSD position QF C)
                //   rank 3 → QF 3   (PSD position QF D)
                //
                // Slot geometry comes from mtg-bracket-frame-flyquest-2v2.psd
                // "Group 11" — see scripts/inspect-psd.mjs output. The
                // display-page CSS consumes these via
                // `top: var(--slot-{id}-top, <1v1-default>)` so vendors
                // opting out of this block keep their 1v1 positions.
                '--bracket-text-color':            '#fff',
                '--bracket-text-color-faded':      'rgba(255,255,255, 0.5)',
                '--bracket-font':                  "'CARBON', sans-serif",
                '--bracket-font-weight':           'normal',
                // SVG connector line stroke color — FlyQuest 2v2 brand
                // dark-teal instead of the 1v1 default white.
                '--bracket-line-color':            '#151f21',
                // Slot footprint — 307×205 composite (two 145×145 portraits
                // + 15px gap + 307×45 name bar). Matches PSD "Group 11 > QF A"
                // bbox exactly. 1v1 default is 424×56.
                '--bracket-slot-width':            '307px',
                '--bracket-slot-height':           '205px',
                // Name bar font size. Auto-scale helper runs per-slot in 2v2
                // using this as the max (see bracket-full-display.js ::
                // renderAllSlots). Tune this if names routinely clip.
                '--fq2v2-bracket-name-font-size':  '24px',

                // Per-slot positions (top-left corner in 1920×1080 canvas).
                '--slot-bracket-quarterfinal-1-top':  '708px',
                '--slot-bracket-quarterfinal-1-left': '214px',
                '--slot-bracket-quarterfinal-4-top':  '709px',
                '--slot-bracket-quarterfinal-4-left': '574px',
                '--slot-bracket-quarterfinal-2-top':  '708px',
                '--slot-bracket-quarterfinal-2-left': '1040px',
                '--slot-bracket-quarterfinal-3-top':  '709px',
                '--slot-bracket-quarterfinal-3-left': '1400px',
                '--slot-bracket-semifinal-1a-top':    '443px',
                '--slot-bracket-semifinal-1a-left':   '394px',
                '--slot-bracket-semifinal-2a-top':    '443px',
                '--slot-bracket-semifinal-2a-left':   '1220px',
                '--slot-bracket-final-1a-top':        '263px',
                '--slot-bracket-final-1a-left':       '806px',

                // Per-slot hide — the 7 slots that 1v1 uses but 2v2 doesn't.
                '--slot-bracket-quarterfinal-5-display': 'none',
                '--slot-bracket-quarterfinal-6-display': 'none',
                '--slot-bracket-quarterfinal-7-display': 'none',
                '--slot-bracket-quarterfinal-8-display': 'none',
                '--slot-bracket-semifinal-1b-display':   'none',
                '--slot-bracket-semifinal-2b-display':   'none',
                '--slot-bracket-final-1b-display':       'none',

                // Event-info L3 overlays — pack-opening scene. Emulates the
                // scoreboard timer wrapper (same 1260×53 lower-third bar at
                // top=993, left=34 — matches --mtg-timer-top/left/width/height
                // above). Text centers horizontally/vertically via flex in
                // event-info.css. Tune height if the PSD bar geometry shifts.
                '--ei-pack-opening-text-top':         '993px',
                '--ei-pack-opening-text-left':        '34px',
                '--ei-pack-opening-text-width':       '1260px',
                '--ei-pack-opening-text-height':      '53px',
                '--ei-pack-opening-text-font-size':   '22px',
                '--ei-pack-opening-text-font':        "'CARBON', sans-serif",
                '--ei-pack-opening-text-font-weight': 'normal',
                '--ei-pack-opening-text-color':       '#fff',
            },
        },
        riftbound: {
            dsg: {
                '--rb-font': 'Garamond',
                '--rb-font-weight': '400',
                '--scoreboard-name-color': '#111826',
                '--scoreboard-record-color': '#111826',
                '--scoreboard-points-color': '#f0ebdf',
            },
            tes: {
                '--rb-font': 'Akzidenz-Grotesk Next',
                '--rb-font-weight': '900',
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
