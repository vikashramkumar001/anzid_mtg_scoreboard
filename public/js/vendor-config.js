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
            { value: 'default', label: 'Default (CSL)' },
            { value: 'uvs-unleashed', label: 'UVS - Unleashed' },
            { value: 'anu', label: 'Anu' },
            { value: 'atomic-legacy', label: 'Atomic Legacy' },
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
                // FlyQuest is a 2v2-only show right now. All overrides nest
                // under '2v2' so getOverrides() only returns them when the
                // page's data-player-count matches.
                '2v2': {
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
                // from the per-vendor portrait pool on disk
                // (features/roster.js walks /assets/images/{game}/shared/
                // player-portraits/{vendor}-{count}/ at sync time).
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
                }, // end flyquest['2v2']
            },
        },
        riftbound: {
            // 'uvs-unleashed' = UVS - Unleashed look. Identical to the default
            // layout (same grid, sections and corner ornaments) — it only swaps
            // the decklist background to the Unleashed motion loop. Everything
            // else inherits from `default` via getOverrides()'s fallback merge.
            // The bg video is applied by broadcast-round-main-deck.js, which
            // reads --rb-dl-bg-video and sets #riftbound-dl-video.src.
            'uvs-unleashed': {
                '--rb-dl-bg-video': '/assets/animations/riftbound/decklist/frame/riftbound-decklist-bg-uvs-unleashed-1v1.mp4',

                '1v1': {
                    // ── Top-8 bracket (/display/bracket/top8) ─────────
                    // RQ Sydney UNLEASHED reskin of bracket-full-display.
                    // Source PSD: RFB_Bracket_UNL.psd. All chrome is baked
                    // into the full-page #bracket-frame PNG
                    // (bracket/riftbound-bracket-frame-uvs-unleashed-1v1.png,
                    // see assetVendorOwns); these vars position the DOM
                    // slots over the baked 555x124 match boxes. Inner slot
                    // layout (name/legend/runes/score offsets) lives in the
                    // body-attr-gated block in bracket-full-display.css.
                    //
                    // PSD match boxes (Base 555x124): QF column x=65 at
                    // y 200/350/500/650, SF column x=710 at y 275/575,
                    // GF x=1319 y 425. Player row 2 = row 1 top + 62.
                    '--bracket-font':              "'Beaufort for LoL'",
                    '--bracket-font-weight':       '700',
                    '--archetype-font-style':      'normal',
                    '--archetype-font-weight':     '500',
                    '--bracket-text-color':        'rgba(255, 255, 255, 1)',
                    '--bracket-text-color-faded':  'rgba(255, 255, 255, 0.5)',
                    // Navy digits on the baked gold score box (sampled
                    // from the PSD composite at the GF score digits).
                    '--bracket-score-color':       '#161f30',

                    '--bracket-slot-width':        '555px',
                    '--bracket-slot-height':       '56px',

                    // QF Match 1 (seeds 1 v 8) — box 65,200
                    '--slot-bracket-quarterfinal-1-top':  '200px',
                    '--slot-bracket-quarterfinal-1-left': '65px',
                    '--slot-bracket-quarterfinal-8-top':  '262px',
                    '--slot-bracket-quarterfinal-8-left': '65px',
                    // QF Match 2 (4 v 5) — box 65,350
                    '--slot-bracket-quarterfinal-4-top':  '350px',
                    '--slot-bracket-quarterfinal-4-left': '65px',
                    '--slot-bracket-quarterfinal-5-top':  '412px',
                    '--slot-bracket-quarterfinal-5-left': '65px',
                    // QF Match 3 (2 v 7) — box 65,500
                    '--slot-bracket-quarterfinal-2-top':  '500px',
                    '--slot-bracket-quarterfinal-2-left': '65px',
                    '--slot-bracket-quarterfinal-7-top':  '562px',
                    '--slot-bracket-quarterfinal-7-left': '65px',
                    // QF Match 4 (3 v 6) — box 65,650
                    '--slot-bracket-quarterfinal-3-top':  '650px',
                    '--slot-bracket-quarterfinal-3-left': '65px',
                    '--slot-bracket-quarterfinal-6-top':  '712px',
                    '--slot-bracket-quarterfinal-6-left': '65px',
                    // SF — boxes 710,275 and 710,575
                    '--slot-bracket-semifinal-1a-top':    '275px',
                    '--slot-bracket-semifinal-1a-left':   '710px',
                    '--slot-bracket-semifinal-1b-top':    '337px',
                    '--slot-bracket-semifinal-1b-left':   '710px',
                    '--slot-bracket-semifinal-2a-top':    '575px',
                    '--slot-bracket-semifinal-2a-left':   '710px',
                    '--slot-bracket-semifinal-2b-top':    '637px',
                    '--slot-bracket-semifinal-2b-left':   '710px',
                    // GF — box 1319,425
                    '--slot-bracket-final-1a-top':        '425px',
                    '--slot-bracket-final-1a-left':       '1319px',
                    '--slot-bracket-final-1b-top':        '487px',
                    '--slot-bracket-final-1b-left':       '1319px',
                },
            },
            // ── riftbound + 'anu' vendor (personal) ───────────────────────
            // The UVS Unleashed look, but every animation VIDEO comes from CSL
            // default. Inherits uvs-unleashed's CSS overrides via `_extends`,
            // and its static reskin assets via assetVendorAlias (anu →
            // uvs-unleashed → default). Only the decklist wallpaper video is
            // repointed to default here; the metagame + standings bg videos are
            // gated on vendor==='uvs-unleashed' in their scene JS, so anu already
            // falls back to default's shared/static motion for those.
            'anu': {
                _extends: 'uvs-unleashed',
                '--rb-dl-bg-video': '/assets/animations/riftbound/decklist/frame/riftbound-scoreboard-frame-default-1v1.mp4',
            },
            // ── riftbound + default vendor ────────────────────────────────
            // 'default' = current active layout (CSL Bologna event).
            // Single column of 10 rows, large character art on left,
            // gold-bordered legend rectangles, branded footer with
            // dynamic round number. Source: CSL Bologna PSD.
            //
            // Other riftbound vendors (DSG, TES) inherit from this
            // 'default' block via the default-as-fallback merge in
            // getOverrides(). If the inheritance regresses their
            // standings (because they had no explicit standings
            // overrides and were implicitly using the previous default),
            // add explicit overrides to their vendor blocks pointing
            // back at atomic-legacy values.
            default: {
                '1v1': {
                    // ── Standings (/broadcast/round/standings-combined) ───
                    // CSL Bologna layout — single panel, 10 rows, character
                    // art on left, gold-bordered legend rectangles, branded
                    // footer. Source PSD: 1920×1080, "Leaderboard" group at
                    // x=749 width=1078, rows step y=153 → 783 (pitch 70).
                    //
                    // Background image: bake all event-specific art
                    // (character + gradient + bottom bar + regional logo)
                    // into a single PNG at
                    //   /assets/images/riftbound/standings/riftbound-standings-bg-default-1v1.png
                    // Row dividers + legend rectangles + headers + footer
                    // text are browser-rendered via CSS and the vars below
                    // (so updating per-event copy doesn't require new bg
                    // exports).

                    // ── Panel + row geometry ──────────────────────────
                    '--rb-stand-row-1-top':       '153px',
                    '--rb-stand-row-pitch':       '70px',
                    '--rb-stand-row-height':      '72px',
                    '--rb-stand-row-width':       '1078px',
                    '--rb-stand-panel-left-x':    '749px',
                    // Single panel — no panel-right-x. Rows 11-16 are
                    // hidden via CSS so we don't need a second column.

                    // ── Per-row internal columns (row-relative) ───────
                    '--rb-stand-rank-left':            '20px',
                    '--rb-stand-rank-width':           '80px',
                    '--rb-stand-name-left':            '153px',
                    '--rb-stand-name-width':           '400px',
                    '--rb-stand-record-left':          '970px',
                    '--rb-stand-record-width':         '61px',

                    // Legend rectangle — gold border + translucent fill.
                    // Centered around row-rel x=741 (matches PSD
                    // Rectangle 9 layers at left=1325 width=331 abs).
                    '--rb-stand-legend-rect-left':       '576px',
                    '--rb-stand-legend-rect-width':      '331px',
                    '--rb-stand-legend-rect-height':     '42px',
                    '--rb-stand-legend-rect-top':        '15px',  // PSD: Rectangle 9 top=168, row1 top=153 → 15px row-relative
                    // Bologna's frame PNG has solid gold rectangles baked
                    // in at every legend-pill position, so the CSS pill
                    // is now bg-only-positioning (no fill, no border).
                    // Text renders directly over the frame's gold. If
                    // the frame is ever re-exported without those gold
                    // rectangles, swap these back to:
                    //   bg:           rgba(0, 30, 80, 0.5)
                    //   border:       #c9a557
                    //   border-width: 1px
                    '--rb-stand-legend-rect-bg':           'transparent',
                    '--rb-stand-legend-rect-border':       'transparent',
                    '--rb-stand-legend-rect-border-width': '0',
                    '--rb-stand-legend-rect-radius':       '0',

                    // ── Column headers (absolute, y=113) ──────────────
                    // Top sits 10px above row 1 (top=153), matching the
                    // PSD's original 10px header→row1 gap proportion (PSD:
                    // 22px header at y=122, row1 at y=153 → 10px gap).
                    // With line-height:1 (in CSS) and 30px text height,
                    // header bottom = 113+30 = 143 → 10px gap before
                    // row 1 starts. Earlier 95px was too far from the
                    // rows; original 122px overlapped with row 1.
                    '--rb-stand-dynamic-headers':         'block',
                    '--rb-stand-header-top':              '113px',
                    '--rb-stand-header-font-size':        '30px',
                    '--rb-stand-header-letter-spacing':   '1.5px',
                    '--rb-stand-header-rank-left':        '766px',
                    '--rb-stand-header-name-left':        '903px',
                    '--rb-stand-header-legend-left':      '1432px',
                    '--rb-stand-header-record-left':      '1690px',
                    // Header widths follow PSD source.
                    '--rb-stand-header-rank-width':       '87px',
                    '--rb-stand-header-name-width':       '114px',
                    '--rb-stand-header-legend-width':     '116px',
                    '--rb-stand-header-record-width':     '122px',

                    // ── Title — Bologna PSD has no big "STANDINGS" title
                    '--rb-stand-title-display':           'none',
                    '--standings-event-round-display':    'none',

                    // ── Hide rows 11-16 (Bologna shows top 10 only) ───
                    // TOTAL_STANDINGS in the JS stays at 16; CSS hides
                    // the overflow rows. Avoids JS branching.
                    '--rb-stand-rows-overflow-display':   'none',

                    // ── Player-name autosizing ────────────────────────
                    // The CSS sets `.standings-name { font-size: 22px }`
                    // but the autosizing pass in
                    // broadcast-round-standings-{all,combined}.js reads
                    // `--standings-name-font-size` from :root as the
                    // MAX font (default 36px) and applies the result as
                    // an inline style — which overrides the CSS rule.
                    // Without this var explicitly set for Bologna, short
                    // names render at 36px while long ones shrink, giving
                    // the visible variance (NEMO huge / ANNA MARGARET
                    // medium / PERSEPHONE VALEN... ellipsized at 16px).
                    //
                    // 22px matches the PSD's player-name layer heights
                    // (22-26px) and hard-caps the autosizing so short
                    // names render at the same size as medium-length ones.
                    // `--standings-text-width` mirrors the Bologna name
                    // column (400px = `--rb-stand-name-width`) so the
                    // shrink-to-fit fence aligns with the actual layout
                    // (default was 428px, slightly wider than the column).
                    // `--standings-archetype-font-size` matches name so
                    // legend pills render at the same visual size as
                    // player names (CSS sets it on .standings-archetype
                    // too, but the autosize JS overrides via inline style
                    // using THIS var as the max — defaults to 24px
                    // otherwise, which would bump the legend pill text
                    // larger than the name).
                    '--standings-name-font-size':         '30px',
                    '--standings-archetype-font-size':    '24px',
                    '--standings-text-width':             '400px',

                    // ── Footer (browser-rendered, dynamic round) ──────
                    // Coords pulled from RFB_Standings.psd:
                    //   Rectangle 6 (yellow pill): top=1009 left=142 309×49
                    //     → contains "swiss standings" centered
                    //       (PSD text top=1023 left=168 258×22)
                    //   "after round 7" (now ROUND N): top=1025 left=469 176×17
                    //   "share your story":            top=1010 left=1269 219×17
                    //   "#boundforglory":              top=1036 left=1248 265×22
                    // Font sizes were bumped from PSD-precise (17/22) to
                    // a slightly larger broadcast-friendly scale per
                    // operator request (20/26). Default-font fallback
                    // is the smaller (20px); per-element overrides bump
                    // SWISS STANDINGS + #BOUND/FORGLORY to 26px.
                    '--rb-stand-footer-display':            'flex',
                    '--rb-stand-footer-font':               "'Beaufort for LoL', serif",
                    '--rb-stand-footer-font-size':          '20px',
                    '--rb-stand-footer-font-weight':        '700',
                    '--rb-stand-footer-color':              '#ffffff',
                    // Letter-spacing removed (was 1.5px). Beaufort already
                    // has comfortable native tracking — adding 1.5px on
                    // top at 24-30px font size pushes characters apart
                    // visibly ("S P A C E D" look).
                    '--rb-stand-footer-letter-spacing':     'normal',

                    // SWISS STANDINGS — positioned to the YELLOW RECTANGLE
                    // dimensions (Rectangle 6 in PSD), with the text flex-
                    // centered inside. CSS in broadcast-round-standings-all.css
                    // reads width/height vars + applies flex centering when
                    // they're set, so horizontal/vertical alignment of the
                    // text against the rectangle is automatic regardless of
                    // font-size tweaks.
                    '--rb-stand-footer-label-left-text':         '"SWISS STANDINGS"',
                    '--rb-stand-footer-label-left-top':          '1009px',
                    '--rb-stand-footer-label-left-left':         '142px',
                    '--rb-stand-footer-label-left-width':        '309px',
                    '--rb-stand-footer-label-left-height':       '49px',
                    '--rb-stand-footer-label-left-font-size':    '30px',
                    '--rb-stand-footer-label-left-font-weight':  '700',
                    '--rb-stand-footer-label-left-color':        '#000',

                    // ROUND N — drop the "AFTER " prefix per user. Uses the
                    // SAME rectangle-flex-center pattern as SWISS STANDINGS
                    // (top=1009, height=49) so the two text baselines
                    // visually share the rectangle's vertical center
                    // (y=1033.5). Without the rectangle pattern, default
                    // line-height padding pushes the text visual center
                    // ~1-2px below SWISS STANDINGS, reading as misaligned.
                    '--rb-stand-footer-after-round-prefix':      '"ROUND "',
                    '--rb-stand-footer-after-round-top':         '1009px',
                    '--rb-stand-footer-after-round-left':        '469px',
                    '--rb-stand-footer-after-round-height':      '49px',
                    '--rb-stand-footer-after-round-font-size':   '24px',
                    '--rb-stand-footer-after-round-font-weight': '500',

                    // SHARE YOUR STORY + #BOUND/FORGLORY — stacked pair on
                    // the right of the footer. Tops chosen so the visual
                    // stack center lands at y=1033.5 (matching SWISS
                    // STANDINGS rectangle center) with a 4px gap:
                    //   share:   top=1004, height=24, bottom=1028
                    //   gap:     4px
                    //   hashtag: top=1032, height=30, bottom=1062
                    //   stack center = (1004 + 1062) / 2 = 1033 ✓
                    // Re-derived after font sizes bumped 20→24 / 26→30.
                    //
                    // Horizontal centering: both elements get the SAME
                    // `left` (= the shared center X) and the CSS applies
                    // `transform: translateX(-50%)` so they align around
                    // the same vertical axis regardless of their
                    // individual text widths. PSD's averaged center x is
                    // ~1380 (share centered at 1378.5, hashtag at 1380.5).
                    '--rb-stand-footer-share-text':              '"SHARE YOUR STORY"',
                    '--rb-stand-footer-share-top':               '1004px',
                    '--rb-stand-footer-share-left':              '1380px',
                    '--rb-stand-footer-share-font-size':         '24px',
                    '--rb-stand-footer-share-font-weight':       '500',

                    // #BOUND/FORGLORY — split into two color segments via
                    // the hashtag-text-prefix + hashtag-text-suffix vars
                    // (CSS uses ::before for prefix, ::after for suffix).
                    // "#BOUND" renders gold (matching the frame PNG's pill
                    // rectangles, sampled at #D7A63F); "FORGLORY" renders
                    // white. Italic both for visual punch against the
                    // upright SHARE YOUR STORY above.
                    '--rb-stand-footer-hashtag-text-prefix':     '"#BOUND"',
                    '--rb-stand-footer-hashtag-prefix-color':    '#D7A63F',
                    '--rb-stand-footer-hashtag-text-suffix':     '"FORGLORY"',
                    '--rb-stand-footer-hashtag-suffix-color':    '#FFFFFF',
                    '--rb-stand-footer-hashtag-top':             '1032px',
                    '--rb-stand-footer-hashtag-left':            '1380px',
                    '--rb-stand-footer-hashtag-font-size':       '30px',
                    '--rb-stand-footer-hashtag-font-style':      'italic',

                    // ── In-game scoreboard (/scoreboard/:matchID) ────────
                    // Byte-for-byte port of RFB_Ingame_UNL_og.psd layout.
                    // Chrome PNG: /assets/images/riftbound/scoreboard/frame/
                    //   riftbound-scoreboard-frame-default-1v1.png
                    //
                    // PSD layer → CSS slot mapping (left column shown,
                    // right column mirrors via *-right-side offsets):
                    //
                    //   Name group        (36, 29)→(318, 69)   282×40   → player name banner
                    //     PLAYERNAME txt  (75, 39)→(279, 61)   204×22
                    //   Legend group      (31, 87)→(324, 236)  293×149  → legend container
                    //     Portrait        (38, 89)→(316, 227)  278×138  → 251×124 thumbnail
                    //     Champion txt    (119,182)→(236,191)  117×9    → champion name
                    //     Legend txt      (84, 208)→(270,219)  186×11   → legend name
                    //   Cam Frame         (36, 246)→(320,637)  284×391  → webcam slot
                    //   Battlefield       (37, 544)→(319,636)  282×92   → battlefield strip
                    //     bf name txt     (78, 586)→(278,595)  200×9
                    //   Tournament Score  (36, 533)→(102,559)  66×26    → record (W-L-D) badge
                    //   XP Count          (244,532)→(320,559)  76×27    → XP badge (hidden)
                    //   P1_Score          (127,612)→(228,657)  101×45   → game-score pips
                    //     pip A           (127,612)→(172,657)  45×45
                    //     pip B           (183,612)→(228,657)  45×45    (11px gap)
                    //
                    // Top center (round counter): chrome PNG only —
                    // active-round highlight at (938, 7)→(982, 51) 44×44
                    // is statically baked into the PNG today.
                    //
                    // Bottom-left badge:
                    //   Rectangle 11 (pill) (102, 967)→(255,1020) 153×53
                    //   SEMI FINALS  txt    (99, 940)→(258, 959) 159×19  ← above pill
                    //   42:19        txt    (118,974)→(240,1010) 122×36  ← inside pill
                    //
                    // Bottom-right highlight card slot:
                    //   P2_Highlight Card  (1600,681)→(1886,1063) 286×382

                    // ── PLAYER NAME — top scrollwork banner ──────────
                    //    Font: PSD 30pt → 30px ceiling. Max-width is the
                    //    legend portrait width (278px = PSD smartobject)
                    //    so longer names can use the full banner width
                    //    before the autoscaler kicks in to shrink them.
                    //
                    //    Wrapper top shifted -1px from PSD-true (29 → 28)
                    //    to optically center the all-caps text between
                    //    the gold trim lines (y=29-34 + y=64-69). All-caps
                    //    text bbox includes empty descender space, so the
                    //    visual glyph center sits ~1px ABOVE the bbox
                    //    center; shifting the wrapper up compensates.
                    '--rb-name-top':           '28px',
                    '--rb-name-side':          '36px',
                    '--rb-name-width':         '282px',
                    '--rb-name-height':        '40px',
                    '--rb-name-shadow':        'none',
                    '--rb-name-max-font':      '30',
                    '--rb-name-max-width':     '278',

                    // ── LEGEND PORTRAIT BG → snapped to the chrome PNG's
                    //    gold border (verified via alpha scan — the gold
                    //    is 2px wide on every edge):
                    //      Left player:  gold L=x38-39, R=x316-317
                    //      Right player: gold L=x1603-1604, R=x1881-1882
                    //      Both: gold T=y88-89, B=y228-229
                    //    Navy bg sized to wrap BOTH pixels of each gold
                    //    stroke so the gold border visually bisects the
                    //    navy edge (sits centered on it), not painted
                    //    outside the navy fill.
                    //
                    //    Math: width=280 → covers x=38..317 (incl. both
                    //    gold pixels at left + both at right). Same for
                    //    right player via right-edge mirror.
                    //    Height=142 → covers y=88..229 incl. all gold.
                    //
                    //    Portrait image at PSD-true 278×138 (the PSD
                    //    smartobject's display size for the 251×124
                    //    source) centered inside — no cropping.
                    //    z-index 2 so chrome (z=5) paints on top.
                    '--rb-legend-bg-z':        '2',
                    // Operator-dialed values (DevTools live-tweaked) so
                    // the portrait sits exactly inside the gold border
                    // on every side without any visible navy gap or
                    // gold/portrait overlap. LEFT-side at x=39 (1px
                    // inside the leftmost gold pixel at x=38), width
                    // 277.7 ends at x=316.7 (just before the right gold
                    // at x=316-317). Mirror RIGHT-side at 39 puts the
                    // box from x=1603.3 to x=1881 — symmetric.
                    '--rb-legend-bg-top':        '89px',
                    '--rb-legend-bg-left-side':  '39px',
                    // Right side dialed 0.7px tighter than left so the
                    // portrait's left edge lands precisely on the inner
                    // gold border at x=1604 (mirror of left=1604 anchor).
                    '--rb-legend-bg-right-side': '38.3px',
                    '--rb-legend-bg-side':       '39px',   // fallback
                    '--rb-legend-bg-width':      '277.7px',
                    '--rb-legend-bg-height':     '139px',
                    // Portrait fills the container exactly (no buffer).
                    // Slight ~10% horizontal aspect stretch from the
                    // 251×124 source to 277.7×139 — imperceptible.
                    '--rb-legend-bg-size':       '277.7px 139px',
                    '--rb-legend-bg-pos':        'center center',

                    // ── CHAMPION NAME → top text row, PSD-true position
                    //    (PSD "volibear furious" text bbox y=182-191,
                    //     center 186.5). Wrapper flex-centers child, so
                    //    top = 186.5 − height/2 = 186.5 − 5.5 = 181.
                    //    Font: PSD 12pt → 12px (shared with legend name).
                    '--rb-champion-display':   'flex',
                    '--rb-champion-top':       '207px',   // BOTTOM row (legend/champion rows swapped 2026-06 to match frame icons)
                    '--rb-champion-side':      '36px',
                    '--rb-champion-width':     '282px',
                    '--rb-champion-height':    '11px',

                    // ── LEGEND NAME → bottom text row, PSD-true position
                    //    (PSD "volibear, relentless storm" bbox y=208-219,
                    //     center 213.5). top = 213.5 − 6.5 = 207.
                    //    Font: PSD 12pt → 12px.
                    '--rb-legend-top':         '179px',   // TOP row (legend/champion rows swapped 2026-06; nudged -2px per user)
                    '--rb-legend-side':        '36px',
                    '--rb-legend-width':       '282px',
                    '--rb-legend-height':      '13px',

                    // ── Legend/Champion font autoscale ceiling — 12pt
                    //    from PSD. autoScaleRiftboundDetails() shrinks
                    //    to --rb-details-min-font if text overflows
                    //    --rb-details-max-width.
                    '--rb-details-max-font':   '12',
                    '--rb-details-min-font':   '9',
                    '--rb-details-max-width':  '282',

                    // ── RECORD (W-L-D) → Tournament Score badge ──────
                    //    PSD: 66×26 badge at (36, 533), "10-0-2" text in
                    //    dark navy (#161f30) at 18pt → 18px font.
                    //    Wrapper top shifted -1px (533 → 532) to optically
                    //    center digits inside the gold pill — numerics
                    //    have no descenders, so their visual center sits
                    //    above the bbox center.
                    '--rb-record-display':     'flex',
                    '--rb-record-top':         '532px',
                    '--rb-record-left-side':   '36px',
                    '--rb-record-right-side':  '253px',  // 1920 - 1667 = right offset
                    '--rb-record-width':       '66px',
                    '--rb-record-height':      '26px',
                    '--rb-record-font-size':   '18px',
                    '--rb-record-max-font':    '18',
                    '--rb-record-min-font':    '12',
                    '--rb-record-max-width':   '51',
                    '--rb-record-left-color':  '#161f30',
                    '--rb-record-right-color': '#161f30',

                    // ── SHARED SCORE TRACKER → 1-2-...-MAX-...-2-1 bubble
                    //    row at top of bar. Left's life fills from left,
                    //    right's life fills from right. Aspirant's Climb
                    //    extends MAX from 8 to 9 or 10. JS renders bubbles
                    //    dynamically; default vendor opts in via display.
                    '--rb-score-display':              'flex',
                    // PSD wrapper (Counter group): (557, -1, 1363, 63) =
                    // 806×64. Top=-1 extends 1px above canvas. Bubbles
                    // inside at canvas y=12-49 (37×37 regular, 33×34 center).
                    '--rb-score-top':                  '-1px',
                    '--rb-score-width':                '806px',
                    '--rb-score-height':               '64px',
                    // Dimensions derived from PIXEL-PRECISE PSD render scan
                    // (not raw bbox). PSD bubbles use a soft anti-aliased
                    // gold ring that fades ~2px on each edge — bbox is 37
                    // but the VISIBLE bubble width is 33px. Gap appears
                    // wider (5px) because each bubble's fade eats 2px
                    // into the gap. CSS renders crisp edges, so to match
                    // the perceived PSD visual we use the VISIBLE values.
                    '--rb-score-gap':                  '5px',
                    '--rb-score-bubble-row-padding-bottom': '1px',
                    '--rb-score-bubble-size':          '33px',
                    '--rb-score-bubble-center-size':   '44px',
                    '--rb-score-bubble-center-size-h': '44px',
                    // Font sizes derived from PSD text bbox heights:
                    //   regular "1" cap height 15px → font ≈ 22px
                    //   center "8" cap height 17px → font ≈ 24px
                    '--rb-score-bubble-font-size':     '22px',
                    '--rb-score-bubble-center-font-size': '24px',
                    // 3px center margin + 5px flex gap = 8px total spacing
                    // each side around center (matches PSD visible scan).
                    // Total row: 7×33 + 6×5 + 8 + 44 + 8 + 7×33 + 6×5 = 582.
                    '--rb-score-bubble-center-gap':    '3px',
                    // Bubble interior = solid dark navy (#161f30, PSD-exact).
                    '--rb-score-bubble-bg':            '#161f30',
                    '--rb-score-bubble-color':         '#ffffff',
                    '--rb-score-bubble-border':        '1.5px solid #d7a63f',
                    '--rb-score-bubble-fill':          '#d7a63f',
                    // Pure black for the active-score number — sits on
                    // the gold-filled bubble. Was #161f30 (dark navy);
                    // black reads stronger against the gold.
                    '--rb-score-bubble-fill-color':    '#000000',
                    // Backdrop strip: dark navy with horizontal gradient
                    // mask (fades to transparent at the ends).
                    '--rb-score-strip-bg':             '#161f30',
                    '--rb-score-strip-bottom-offset':  '2px',
                    // Gold accent line below bubbles (PSD's "Divider").
                    '--rb-score-accent-left':          '8.3%',
                    '--rb-score-accent-right':         '8.2%',
                    // PSD bbox is 4px but the visible solid gold line is
                    // ~2px (rest is anti-alias fade). 2px matches the
                    // perceived PSD render.
                    '--rb-score-accent-height':        '2px',
                    '--rb-score-accent-bg':            '#d7a63f',

                    // ── SHOWDOWN MIGHT TRACKER → center-bottom slide-in
                    //    overlay. PSD bbox (678, 879) to (1243, 1218) =
                    //    565×339, x-centered at 960. Hidden until operator
                    //    triggers from master-control (showdown-visible
                    //    flips to 'true').
                    // PSD-true Showdown tracker. Only the BOTTOM portion of
                    // the PSD's tall battlefield card shows in the canvas
                    // (canvas y=1006-1080 ≈ 74-100px tall, anchored bottom).
                    // Hextech corner frames extend slightly below canvas.
                    '--rb-showdown-display':              'flex',
                    '--rb-showdown-bottom':               '0px',
                    '--rb-showdown-width':                '565px',
                    // 102px wraps: bottom 62px BF strip + 24px showdown
                    // pill above it + ~16px breathing room at top.
                    '--rb-showdown-height':               '102px',
                    // Slide-in duration; eased-out (decelerate) via
                    // --rb-showdown-anim-ease below.
                    '--rb-showdown-anim-ms':              '625ms',
                    '--rb-showdown-anim-ease':           'ease-out',
                    // Navy backing — a frame-SHAPED PNG (565×74) extracted
                    // straight from the PSD: navy (#1f3548) fills only the
                    // two shield side-zones, with the TOP EDGE OF THE NAVY
                    // FOLLOWING THE GOLD BRACKET per-column (the bracket
                    // corner curves/notches, so a plain rectangle can't
                    // match it). Center is transparent (BF strip + art
                    // cover it). Positioned at the tracker's bottom, full
                    // width, native size — so the navy is strictly inside
                    // the gold frame and never juts above the bracket.
                    '--rb-showdown-panel-bg':
                        'url("/assets/images/riftbound/scoreboard/frame/showdown-panel-backing-default-1v1.png") no-repeat center bottom / 565px 74px',
                    // BF strip — 435×62 (PSD's Rectangle 19 copy 3).
                    // Shifted DOWN 2px so the strip's top edge aligns
                    // with the hextech's horizontal gold bar (the art
                    // was previously peeking 2px above the gold line).
                    // Bottom 2px extend past canvas — clipped by
                    // `body { overflow: hidden }`.
                    '--rb-showdown-bf-width':             '435px',
                    '--rb-showdown-bf-height':            '62px',
                    '--rb-showdown-bf-bottom':            '-3px',
                    '--rb-showdown-bf-darken':            '0.35',
                    '--rb-showdown-bf-name-font-size':    '14px',
                    // SHOWDOWN gold pill — 117×24, straddles the TOP edge
                    // of the BF strip (PSD pill y=1008-1032 overlaps BF
                    // strip y=1019-1081 by ~13px). Pill bottom needs to
                    // sit at canvas y=1032 = 48px from tracker bottom (1080).
                    // Font tuned so rendered "SHOWDOWN" text width matches
                    // PSD bbox 102×11. 15px font + 1px letter-spacing fits
                    // cleanly within the 117px pill (8 chars at ~12.5px each
                    // = ~100 total + 7px tracking = ~107, leaves comfortable
                    // margins inside the pill).
                    '--rb-showdown-label-bottom':         '48px',
                    '--rb-showdown-label-width':          '117px',
                    '--rb-showdown-label-height':         '24px',
                    '--rb-showdown-label-font-size':      '15px',
                    '--rb-showdown-label-spacing':        '1px',
                    '--rb-showdown-label-color':          '#161f30',
                    // Hextech corner frames — 204×92, anchored to bottom,
                    // extending 30px below canvas (PSD: y=1017-1109).
                    '--rb-showdown-hextech-width':        '204px',
                    '--rb-showdown-hextech-height':       '92px',
                    '--rb-showdown-hextech-bottom':       '-30px',
                    '--rb-showdown-hextech-left-side':    '0px',
                    '--rb-showdown-hextech-right-side':   '0px',
                    // Might L/R — PIXEL-EXACT. The shield PNG is the FULL
                    // PSD "Might L/R" group (shield frame + blue fill,
                    // number hidden) baked at native 72×88. PSD group
                    // bbox: x=678-750 / x=1171-1243, y=1006-1094. Placed
                    // at native pixel size (no scaling) so it's a 1:1
                    // reproduction. bottom:-14 → element bottom at canvas
                    // 1094 (14px below the 1080 canvas edge); element top
                    // at 1006. Shield CONTENT (alpha bbox y=14-74) lands
                    // at canvas y=1020-1080 — flush to the canvas bottom.
                    '--rb-showdown-might-width':          '72px',
                    '--rb-showdown-might-height':         '88px',
                    '--rb-showdown-might-bottom':         '-14px',
                    '--rb-showdown-might-left-side':      '0px',
                    '--rb-showdown-might-right-side':     '0px',
                    // Might number — PSD font BeaufortProHeavy 30px (engine
                    // 34.88 × 0.86 transform = 30). '12' bbox 33×21 centered
                    // at canvas (714.5, 1052.5); element center is (714, 1050)
                    // so the number sits ~2.5px below element vertical center.
                    '--rb-showdown-might-value-font-size': '30px',
                    '--rb-showdown-might-value-color':    '#ffffff',
                    // 5px = PSD-true 2px + operator's +3px nudge down.
                    '--rb-showdown-might-value-offset':   '5px',
                    '--rb-showdown-text-color':           '#ffffff',

                    // ── XP TRACKER → mirrors the record position at PSD
                    //    coords (244, 532) for left + (1809, 532) for
                    //    right (right-offset = 1920 - 1885 = 35). 76×27px.
                    //    Hidden by default; only shown when XP > 0 (toggled
                    //    via inline style in scoreboard.js updateState).
                    // PSD-true two-tone layout: 40px navy "XP" half +
                    // 36px gold value half = 76px total. Thin gold edge
                    // stripe (3px wide × 25px tall) on the far left.
                    // Position shifted 3px inward from PSD coords so the
                    // right edge of the rectangle hugs the inner edge of
                    // the chrome's gold border (x=1882 / x=317), instead
                    // of jutting 3px past it as the raw PSD has.
                    '--rb-xp-top':                  '532px',
                    '--rb-xp-left-side':            '241px',
                    '--rb-xp-right-side':           '38px',
                    '--rb-xp-width':                '76px',
                    '--rb-xp-height':               '27px',
                    // PSD: gold layer sits ON TOP of navy in the 4px
                    // overlap zone (x=1845-1849), so VISIBLE navy is
                    // 36px (1809-1845) and visible gold is 40px
                    // (1845-1885). Seam at 47% from left.
                    '--rb-xp-label-width':          '36px',
                    '--rb-xp-value-width':          '40px',
                    '--rb-xp-label-font-size':      '18px',
                    '--rb-xp-value-font-size':      '18px',
                    '--rb-xp-line-height':          '27px',
                    '--rb-xp-label-bg':             '#161f30',
                    '--rb-xp-label-color':          '#ffffff',
                    '--rb-xp-value-bg':             '#d7a63f',
                    '--rb-xp-value-color':          '#161f30',
                    '--rb-xp-edge-stripe-bg':       '#d7a63f',
                    '--rb-xp-edge-stripe-width':    '3px',
                    '--rb-xp-edge-stripe-left':     '1px',
                    '--rb-xp-edge-stripe-top':      '1px',

                    // ── GAME-COUNT PIPS → P1_Score group ─────────────
                    //    PSD: 2× 45×45 pips at (127, 612) + (183, 612) with
                    //    11px gap — wrapper 101×45 at (127, 612).
                    //    Right side mirror: P2_Score at (1692, 612), so
                    //    right-offset = 1920 - 1793 = 127 (perfect mirror).
                    '--rb-wins-display':       'flex',
                    '--rb-wins-top':           '612px',
                    '--rb-wins-left-side':     '127px',
                    '--rb-wins-right-side':    '127px',
                    '--rb-wins-width':         '101px',
                    '--rb-wins-height':        '45px',
                    // justify-center + 31px gap lands 25px pips centered
                    // inside the chrome's pre-drawn 45px ring slots.
                    // Right side has its own align-items var that must
                    // be set separately (overrides the parent wrapper's).
                    '--rb-wins-justify':       'center',
                    '--rb-wins-align':         'center',
                    '--rb-wins-right-align':   'center',
                    '--rb-wins-gap':           '31px',
                    '--rb-pip-fill':           'transparent',
                    '--rb-pip-size':           '25px',

                    // ── BATTLEFIELD STRIP → image + name slot ────────
                    //    PSD: Rectangle 19 copy 2 at (37, 544) 282×92
                    //    (image fills here, may overflow per the SFD-215
                    //    smartobject), name text "ravenbloom conservatory"
                    //    at (78, 586) 200×9 — white text, very small.
                    '--rb-bf-bg-display':      'block',
                    // Operator-dialed (DevTools live-tweaked) so the
                    // image fills exactly inside the gold strip and
                    // aligns with the legend portrait's left edge.
                    // Right side dialed 1px tighter so the image hugs
                    // the inner gold border on both sides symmetrically.
                    '--rb-bf-bg-top':          '545px',
                    '--rb-bf-bg-left-side':    '39px',
                    '--rb-bf-bg-right-side':   '38px',
                    '--rb-bf-bg-side':         '39px',   // fallback
                    '--rb-bf-bg-width':        '278px',
                    '--rb-bf-bg-height':       '89px',
                    // Dark overlay on top of battlefield image (0..1 alpha)
                    // → improves contrast for the white battlefield name
                    // text. 0.4 = subtle 40% black tint.
                    '--rb-bf-bg-darken':       '0.4',
                    // Battlefield name text — PSD-true 13pt (displayed
                    // value in Photoshop type panel; the internal 5.26pt
                    // engine FontSize is post-scale-transform). Bbox
                    // matches: 13pt font has ~9px cap-height which
                    // matches the PSD layer's 9px bbox height.
                    '--rb-bf-text-display':    'flex',
                    // top=582 centers the 15px text wrapper vertically
                    // within the 89px-tall bf-bg (bg center y=589.5,
                    // wrapper center 582+7.5=589.5).
                    '--rb-bf-top':             '582px',
                    '--rb-bf-side':            '78px',
                    '--rb-bf-width':           '200px',
                    '--rb-bf-height':          '15px',
                    '--rb-bf-font-size':       '13px',
                    '--rb-bf-max-font':        '13',
                    '--rb-bf-min-font':        '9',
                    '--rb-bf-max-width':       '200',
                    // Drop shadow — copied from the legend/champion
                    // text shadow (--rb-detail-shadow default) for a
                    // consistent look across all detail text.
                    '--rb-bf-shadow': '1px 1px 3px rgba(0, 0, 0, 0.8)',

                    // ── STAGE LABEL (event-round element) → ABOVE the
                    //    gold pill (PSD: SEMI FINALS text at y=940-959,
                    //    bbox 159×19, white, 26pt → 26px font).
                    '--rb-round-display':      'flex',
                    '--rb-round-top':          '937px',
                    '--rb-round-left':         '99px',
                    '--rb-round-width':        '159px',
                    '--rb-round-height':       '19px',
                    '--rb-round-font-size':    '28px',
                    '--rb-round-color':        '#ffffff',
                    '--rb-round-shadow':       'none',
                    '--rb-round-font-weight':  '700',

                    // ── TIMER ("MM:SS") → INSIDE the gold pill ───────
                    //    PSD: 42:19 text at (118, 974) bbox 122×36,
                    //    dark navy (#161f30 same as record), 48pt → 48px.
                    '--rb-timer-display':      'flex',
                    '--rb-timer-top':          '974px',
                    '--rb-timer-left':         '118px',
                    '--rb-timer-width':        '122px',
                    '--rb-timer-height':       '36px',
                    '--rb-timer-font-size':    '48px',
                    '--rb-timer-color':        '#161f30',

                    // ── CARD OVERLAY (Scryfall preview slot above webcam)
                    //    Operator-dialed so the card sits at the correct
                    //    spot under the chrome's card preview area.
                    //    Right=51.5px centers the card in the right-side
                    //    camera frame. UNL chrome has a SINGLE card slot
                    //    (right side only), so hide the left overlay to
                    //    avoid the duplicate stationary card-back showing
                    //    underneath the right one.
                    '--rb-card-overlay-top':         '697px',
                    '--rb-card-overlay-right':       '51.5px',
                    '--rb-card-overlay-left-display': 'none',

                    // Hide the legacy legend-over-frame overlay (a white→gray
                    // gradient PNG painted at z=6, above the chrome) — it
                    // tints the chrome's L-Baked icon corners. UNL chrome
                    // doesn't need it; readability comes from the PSD's
                    // Name Gradient layer already baked into the chrome PNG.
                    '--rb-legend-over-frame-display': 'none',

                    // Elements with no slot in the new chrome (per PSD)
                    '--rb-life-display':       'none',
                    '--rb-runes-display':      'none',
                },
            },

            // 'atomic-legacy' = the previous default (Vancouver event /
            // Atomic). Preserved here as a selectable vendor so we can
            // switch back to that layout if needed; the new active
            // default lives in the 'default' block above.
            'atomic-legacy': {
                '1v1': {
                    // ── Standings (/broadcast/round/standings-combined) ───
                    // Vancouver event layout — two 8-row panels side-by-side.
                    // All static chrome (frame ornaments, "STANDINGS" title,
                    // Vancouver regional logo, header column labels, alt-row
                    // backgrounds) is BAKED into:
                    //   /assets/images/riftbound/standings/
                    //     riftbound-standings-bg-default-1v1.png  (1920×1080 backdrop)
                    //     riftbound-standings-frame-default-1v1.png  (1920×1080 transparent overlay)
                    //
                    // Source PSD: ~/Desktop/mtg mobile coverage/coverage
                    //   overlay/info slides/20260529 riftbound vancouver/
                    //   RQ Vancouver Graphic Assets.psd → group "010 - Standings 16".
                    //
                    // Layout itself is gated by
                    //   body[data-game="riftbound"][data-vendor="default"][data-player-count="1v1"]
                    // in broadcast-round-standings-all.css. These vars supply
                    // pixel positions + typography tokens — change values
                    // here, not in the CSS.

                    // Dynamic round number text ("round N") — sits directly
                    // beneath "STANDINGS" with a tight gap (was 212 with
                    // a ~22px gap from the title's bottom edge). Weight
                    // not set here — inherits 700 from the page-wide
                    // riftbound branch in updateTheme().
                    // Round text recentered with the title — same overall
                    // center 950.5 between the new panels.
                    //   width 212 → left = 950.5 - 106 = 844.5 → 844
                    '--standings-event-round-display':     'block',
                    '--standings-event-round-top':         '195px',
                    '--standings-event-round-left':        '844px',
                    '--standings-event-round-width':       '212px',
                    '--standings-event-round-font-size':   '32px',
                    '--standings-event-round-color':       '#ffffff',
                    '--standings-event-round-text-align':  'center',
                    '--standings-event-round-letter-spacing': '4px',

                    // ── Dynamic title + column headers (opt-in) ──────
                    // Browser-rendered text stays crisp at any scale,
                    // unlike the PSD-baked text in the frame PNG which
                    // softens when scaled. Set --rb-stand-dynamic-headers
                    // to 'block' AFTER re-exporting the frame PNG without
                    // the "STANDINGS" title and column header text layers
                    // — then the dynamic versions take over without
                    // overlapping the baked ones.
                    //
                    // Default 'none' means dynamic headers stay hidden,
                    // letting the existing PSD-baked text show through.
                    // Keep the dynamic-chrome wrapper rendering so the
                    // STANDINGS title shows. The NAME/RECORD/LEGEND
                    // column labels inside it are hidden by a separate
                    // body-scoped CSS rule (see broadcast-round-standings-all.css)
                    // because column labels don't apply to the
                    // TES-style card layout.
                    '--rb-stand-dynamic-headers':         'block',
                    // Title + round-text vertical balance — title bottom
                    // (top + font-size at line-height 1) lands at ~200,
                    // round text sits 5px below it. Group center ≈ y=160,
                    // sitting roughly in the middle of the 0–320 header
                    // band above the data panels.
                    // Page slide animation —
                    //   In: page itself doesn't animate (`none`); the
                    //       per-row stagger cascade handles the visual
                    //       (rowReveal keyframe in CSS, with nth-child
                    //       delays).
                    //   Out: page fades out as a single block via
                    //        fadeOut keyframe — softer than the default
                    //        slideOutToRight which felt jarring with
                    //        the cascade-in entry.
                    // Net effect during a transition (slideTo): outgoing
                    // page dissolves while incoming page's rows wave in
                    // top-to-bottom, creating a clean crossfade with
                    // motion focus on the new content.
                    '--standings-page-anim-in':           'none',
                    '--standings-page-anim-out':          'fadeOut',
                    '--standings-page-anim-duration':     '0.5s',
                    '--standings-page-anim-easing':       'ease-out',

                    // Live-for-top-8 highlight — every player whose
                    // current_wins + remaining_rounds ≥ cut_wins gets a
                    // soft glow on their portrait + record. By round
                    // 10+ of a 13-round event this naturally narrows to
                    // the actual contenders, telling viewers at a glance
                    // who's still alive for the bracket.
                    //
                    // 13 rounds × top-8 cut typically lands at 10-3
                    // (10 wins). Adjust per event if the format differs.
                    '--standings-total-rounds':           '13',
                    '--standings-top8-cut-wins':          '10',

                    // Title centered between the new panel positions:
                    //   left panel midpoint  = 249 + 677/2 = 587.5
                    //   right panel midpoint = 975 + 677/2 = 1313.5
                    //   overall center       = 950.5
                    //   title width 827      → left = 950.5 - 413.5 = 537
                    '--rb-stand-title-top':               '80px',
                    '--rb-stand-title-left':              '537px',
                    '--rb-stand-title-width':             '827px',
                    '--rb-stand-title-font-size':         '120px',
                    '--rb-stand-title-letter-spacing':    '10px',
                    // Beaufort for LoL Heavy (900) — no 800 weight
                    // available, so 900 is the closest "extra bold"
                    // match. Loaded via fonts.css @font-face rule.
                    '--rb-stand-title-font-weight':       '900',
                    // Column-header band — names appear above each
                    // panel's data rows. PSD Y=359-360, height 22.
                    '--rb-stand-header-top':              '355px',
                    '--rb-stand-header-font-size':        '20px',
                    // Half the original 3px letter-spacing — keeps the
                    // broadcast-y wide-tracked feel while keeping the
                    // centering offset small (~0.75px, imperceptible).
                    '--rb-stand-header-letter-spacing':   '1.5px',
                    // NAME column — left-aligned with the row name+legend
                    // stack which starts at row-relative x=195. Absolute:
                    //   left panel:  panel-x 249 + 195 = 444
                    //   right panel: panel-x 975 + 195 = 1170
                    '--rb-stand-header-name-left':        '444px',
                    '--rb-stand-header-name-right-left':  '1170px',
                    // RECORD column — center-aligned with the row record
                    // value at row-relative x=525.
                    //   left panel:  panel-x 249 + 525 = 774
                    //   right panel: panel-x 975 + 525 = 1500
                    '--rb-stand-header-record-left':       '774px',
                    '--rb-stand-header-record-right-left': '1500px',
                    '--rb-stand-header-record-width':      '87px',
                    // LEGEND column header — sized + positioned to match
                    // the portrait below it (same row-relative left=526,
                    // same width=251). With text-align: center applied
                    // in CSS, the "LEGEND" word renders centered in the
                    // 251px box so it sits directly above the portrait's
                    // horizontal center. Absolute positions:
                    //   left panel:  panel-x 71 + 526 = 597
                    //   right panel: panel-x 995 + 526 = 1521
                    '--rb-stand-header-legend-left':       '597px',
                    '--rb-stand-header-legend-right-left': '1521px',
                    '--rb-stand-header-legend-width':      '251px',

                    // Per-row geometry — 8 rows per panel, row pitch 52px.
                    // Updated 2026-05-02: PSB frame shrunk both panels
                    // from 854 → 677 wide. Left panel's left edge moved
                    // 71 → 249 (178px right); right panel's left edge
                    // shifted 995 → 975 (20px left). Row top + height
                    // nudged by 1px. Source: "010 - Standings 16" group
                    // in RQ Vancouver Graphic Assets.psb.
                    '--rb-stand-row-1-top':       '394px',
                    '--rb-stand-row-pitch':       '52px',
                    '--rb-stand-row-height':      '55px',
                    '--rb-stand-row-width':       '677px',
                    '--rb-stand-panel-left-x':    '249px',
                    '--rb-stand-panel-right-x':   '975px',

                    // Column offsets WITHIN a row (relative to row left=0).
                    // TES-inspired card layout — each row reads as
                    //   [rank] [circular portrait] [name + legend stack] [record]
                    // The stack is sized for the longest expected legend
                    // ("Ornn, Fire Below the Mountain" ≈ 261px @ 14px font)
                    // — 340 leaves comfortable room without trailing
                    // whitespace pushing record off to the right.
                    //
                    // Whole content shifted +25 from prior baseline so the
                    // left margin (panel edge → rank, 65px) equals the
                    // right margin (record end → panel edge, 65px).
                    // 65px is the average of the prior asymmetric
                    // 40 / 90 split — comfortable breathing room on
                    // both sides without crowding the data.
                    '--rb-stand-text-top':         '17px',  // text top within 54px row
                    '--rb-stand-rank-left':        '65px',
                    '--rb-stand-rank-width':       '50px',
                    '--rb-stand-name-left':        '195px',
                    '--rb-stand-name-width':       '340px',
                    // Record + legend column shifted left 75px from prior
                    // position. Within the legend column, the order is
                    // [archetype text] [portrait] — text first, image
                    // second (swapped from the original portrait-first
                    // arrangement). Text is right-aligned against the
                    // portrait via `justify-content: flex-end` in CSS
                    // so short legend names ("Yasuo") snug up against
                    // the portrait instead of floating on the left.
                    //
                    // Layout (TES-inspired card): rank (30-80) → portrait
                    // thumbnail (95-140) → name+legend stack (160-500) →
                    // record (510-590). Content packs into the left ~590
                    // px of the 854-wide row so the visual card reads as
                    // compact (no large gap between legend and record).
                    // The remaining ~265px to the panel right edge is
                    // empty stripe, transparent against the frame.
                    //
                    // Portrait is a 45×45 circular thumbnail centered
                    // vertically in the 54px row (top: 4.5 = (54-45)/2).
                    '--rb-stand-record-left':      '525px',
                    '--rb-stand-record-width':     '87px',
                    // Portrait left = 132.5 puts equal 17.5px gaps on
                    //   both sides of the circle:
                    //     rank ends at 115 → 17.5 → portrait at 132.5
                    //     portrait ends at 177.5 → 17.5 → name at 195
                    // Portrait top = 6 — slightly below the geometric
                    //   center (5) to compensate for the row's visual
                    //   weight bias (frame stripe sits a couple px low).
                    '--rb-stand-portrait-left':    '132.5px',
                    '--rb-stand-portrait-top':     '6px',
                    '--rb-stand-portrait-width':   '45px',
                    '--rb-stand-portrait-height':  '45px',
                    // Legend name (archetype) is now a flex-flow subtitle
                    // INSIDE the .player-name-archetype wrapper — so its
                    // left/width are determined by the wrapper, not by
                    // these vars. Kept here for backward compat with the
                    // CSS fallback values (which are unused by this
                    // layout's relative-positioned archetype).
                    '--rb-stand-archetype-left':       '0px',
                    '--rb-stand-archetype-width':      'auto',
                    // Auto-fit's max width = full name+legend stack width
                    // (340px). Long legends ellipsize via CSS overflow.
                    '--standings-text-width':          '340px',
                    // Subtitle font size — smaller than NAME (22px) since
                    // the legend reads as secondary info below the player
                    // name. The auto-fit JS uses this as the max; with
                    // 600px stack width and 14px font, every legend fits
                    // without shrinking.
                    '--standings-archetype-font-size': '14px',

                    // Typography — Beaufort for LoL Bold (700) is now the
                    // game-wide default for riftbound, set by
                    // standings-combined.js's updateTheme() riftbound
                    // branch. We don't need to repeat --standings-font /
                    // --standings-font-weight / --*-font-weight here —
                    // they cascade from the page-wide setProperty calls.
                    // Only the per-element font SIZES + COLORS are
                    // overridden (the page-wide defaults are 36px which
                    // is too tall for our 54px rows).
                    '--standings-name-font-size':       '22px',
                    '--standings-name-color':           '#ffffff',
                    '--standings-rank-font-size':       '22px',
                    '--standings-rank-color':           '#ffffff',
                    '--standings-record-font-size':     '22px',
                    '--standings-record-color':         '#ffffff',
                    // Tell standings-combined.js to strip the "of N"
                    // suffix from the event-round text so "Round 8 of 15"
                    // renders as "Round 8" on this layout. Other layouts
                    // keep the full string by default (this var unset).
                    '--standings-event-round-strip-suffix': 'yes',

                    // Circular portrait thumbnail — 45×45 between rank
                    // and the name+legend stack. The 1200×1200 source
                    // (same as the metagame's pie chart) is rendered at
                    // 150×150 by JS (see applyStandingsPortraitFocus) and
                    // positioned so the focus dot from RIFTBOUND_PORTRAIT_FOCUS
                    // lands at the frame center. border-radius: 50% on the
                    // frame gives the circular crop. The fit/position vars
                    // below are unused for this layout (JS controls IMG
                    // sizing inline) but preserved for the global
                    // .standings-portrait fallback in non-riftbound layouts.
                    '--standings-portrait-display':     'block',
                    '--standings-portrait-fit':         'cover',
                    '--standings-portrait-position':    'center 30%',

                    // ── Metagame ───────────────────────────────────────
                    // Reuses the standings background image (set via
                    // file-system copy at
                    // /assets/images/riftbound/metagame/riftbound-metagame-bg-default-1v1.png).
                    //
                    // Title "METAGAME" + subtitle "DAY 1" are styled to
                    // match the standings page chrome — same big bold
                    // title with letter-spacing + the smaller round-text
                    // pattern below it. Wheel + panel + card dimensions
                    // are copied from the TES metagame for visual parity
                    // (TES already had a polished pie + side-panel
                    // arrangement worth reusing).
                    //
                    // Page-wide font: Beaufort for LoL. Overrides the JS
                    // game-default (Akzidenz-Grotesk Next) which ran
                    // earlier in updateTheme() so everything — title,
                    // subtitle, pie labels, slice percentages, archetype
                    // cards — renders in Beaufort, matching the
                    // standings page's typography end to end.
                    '--metagame-font':                "'Beaufort for LoL', serif",
                    '--metagame-font-weight':         '700',
                    '--meta-title-display':           'block',
                    '--meta-title-font':              "'Beaufort for LoL', serif",
                    '--meta-title-top':               '80px',
                    '--meta-title-left':              '537px',
                    '--meta-title-width':             '827px',
                    '--meta-title-font-size':         '120px',
                    '--meta-title-font-weight':       '900',
                    '--meta-title-letter-spacing':    '10px',
                    '--meta-title-color':             '#ffffff',
                    '--meta-title-text-align':        'center',

                    // Subtitle = DAY 1 / DAY 2 — mirrors the standings'
                    // round-text positioning + treatment. JS sets the
                    // text content based on whether day-2 data exists.
                    '--meta-subtitle-font':           "'Beaufort for LoL', serif",
                    '--meta-subtitle-top':            '195px',
                    '--meta-subtitle-left':           '844px',
                    '--meta-subtitle-width':          '212px',
                    '--meta-subtitle-font-size':      '32px',
                    '--meta-subtitle-font-weight':    '700',
                    '--meta-subtitle-color':          '#ffffff',
                    '--meta-subtitle-letter-spacing': '4px',
                    '--meta-subtitle-text-align':     'center',
                    '--meta-subtitle-day1-visible':   'block',
                    '--meta-subtitle-day2-visible':   'block',

                    // Pie + side panel — sized + colored for the
                    // riftbound default 1v1 aesthetic:
                    //   • Pie size + position copied from TES (proven to
                    //     fit the bg's left half).
                    //   • Cards + label boxes use semi-transparent dark
                    //     purple fills with gold accents — pairs with
                    //     the gold-on-purple frame ornaments in the bg.
                    //   • Panel pushed down 50px (288 → 340) to give the
                    //     DAY 1 subtitle more breathing room.
                    //   • Cards shrunk modestly so the panel feels less
                    //     dense:
                    //       portrait 49×69 → 45×63
                    //       name font 28 → 24
                    //       counts font 20 → 16
                    '--meta-pie-size':                '525px',
                    '--meta-pie-y':                   '110px',
                    '--meta-pie-x-final':             '-435px',
                    '--meta-slice-stroke':            '#fff',

                    // Color palette: dark-purple semi-transparent fill,
                    // gold border. Same treatment for cards, panel
                    // header, and pie label boxes — visually cohesive.
                    '--meta-card-bg':                 'rgba(35, 10, 60, 0.85)',
                    '--meta-card-border':             '#c9a557',
                    '--meta-label-bg':                'rgba(35, 10, 60, 0.85)',
                    '--meta-label-stroke':            '#c9a557',
                    '--meta-label-stroke-width':      '1.5',

                    // Hextech border frame — applied to .archetype-card
                    // and #panel-header via CSS border-image. Source PNG
                    // is 1008×992 with a thin gold double-line frame +
                    // decorative corner cuts + subtle side-arch notches
                    // and a transparent middle. The card's --meta-card-bg
                    // (purple) shows through the transparent center.
                    //
                    // Slice = 80 means the corner art occupies the outer
                    // 80px of each side of the source. Tune up/down by
                    // measuring where the corner detail ends in the PSD/AI.
                    // Border-width = 15px is the on-screen thickness — pick
                    // based on how chunky vs delicate the frame should
                    // read at the card's actual size.
                    //
                    // border-image-repeat: stretch keeps the side-arch
                    // decorations centered on each edge but DOES distort
                    // their proportions when the box aspect differs from
                    // the source (e.g. cards are ~5:1 horizontal but the
                    // source is square — vertical edges get heavily
                    // compressed). Acceptable for the slim card height;
                    // if the panel header looks off, we can switch to
                    // 'round' to preserve aspect at the cost of edge tiling.
                    '--meta-frame-img':               "url('/assets/images/riftbound/metagame/riftbound-metagame-frame-default-1v1.png')",
                    '--meta-frame-slice':             '80',
                    '--meta-frame-border-width':      '15px',
                    '--meta-frame-outset':            '0',
                    '--meta-frame-repeat':            'stretch',
                    // Silhouette mask matching the frame's outer chamfered
                    // outline. Trims the card's bg + border so they don't
                    // extend past the hextech corner cuts. Same dimensions
                    // as the frame PNG; opaque inside the chamfer,
                    // transparent outside. Authored alongside the frame
                    // PNG so they stay aligned.
                    '--meta-frame-mask':              "url('/assets/images/riftbound/metagame/riftbound-metagame-frame-default-1v1-mask.png')",

                    // Panel height = 700px (8 cards × ~78 + 44 header + 32
                    // gaps = 700). Gives each card ~78px so the hextech
                    // frame (15px border on top + bottom) leaves ~48px
                    // of interior content area — enough room for the
                    // 53px portrait without it cramping against the
                    // frame edges.
                    '--meta-panel-top':               '320px',
                    '--meta-panel-right':             '102px',
                    '--meta-panel-width':             '750px',
                    '--meta-panel-max-height':        '700px',
                    '--meta-panel-gap':               '4px',
                    '--meta-panel-header-height':     '44px',
                    '--meta-card-padding':            '6px',
                    '--meta-card-gap':                '6px',
                    '--meta-card-radius':             '6px',
                    '--meta-card-portrait-width':     '45px',
                    '--meta-card-portrait-height':    '63px',
                    '--meta-card-name-font-size':     '24px',
                    '--meta-card-counts-font-size':   '16px',
                },
            },
            dsg: {
                // ── DSG shared brand identity (applies to all player counts) ──
                // These vars define the DSG brand voice and override anything
                // from the per-count blocks below. EB Garamond + dark navy +
                // cream is the DSG palette.
                //
                // EB Garamond is self-hosted (see scoreboard.css @font-face
                // declarations) so Windows OBS boxes — which don't ship
                // Garamond by default — render the intended typeface instead
                // of silently falling back to default serif.
                '--rb-font': "'EB Garamond', serif",
                '--rb-font-weight': '400',
                // The five specific font vars below are consolidated to the
                // shared block (instead of duplicated in '1v1' / '2v2') because
                // DSG uses EB Garamond uniformly across player counts. If a
                // future per-count divergence needs a different typeface for
                // one element, push that var into the nested block — Option 3's
                // shallow merge will let the nested value override.
                '--rb-points-font': "'EB Garamond', serif",
                '--rb-dl-font': "'EB Garamond', serif",
                '--rb-dl-bf-label-font': "'EB Garamond', serif",
                '--rb-lt-font': "'EB Garamond', serif",
                '--comm-lt-font': "'EB Garamond', serif",
                // Pack-opening scene's L3 text. Same EB Garamond brand voice
                // as the rest of DSG; @font-face for this declaration lives
                // in event-info.css (see the comment there for why).
                '--ei-pack-opening-text-font': "'EB Garamond', serif",
                '--scoreboard-name-color': '#111826',
                '--scoreboard-record-color': '#111826',
                '--scoreboard-points-color': '#f0ebdf',

                // ── DSG 1v1 ─────────────────────────────────────────────────
                // Scoreboard view (/scoreboard/match1) intentionally renders
                // with the riftbound *default* look — no DSG-specific
                // positions, fonts, or colors. The shared DSG block above sets
                // Garamond + dark-navy text + cream points for the brand
                // identity, but those are scoreboard-affecting; we null them
                // out below so the scoreboard falls back to the CSS defaults
                // (Beaufort + white names + #161f30 records). Everything past
                // the scoreboard section keeps DSG branding (decklist, lower
                // third, standings, metagame).
                //
                // Net effect: vendor='dsg' + count='1v1' yields the same
                // /scoreboard/match1 visual as vendor='default' + count='1v1'.
                '1v1': {
                    // Reset the shared DSG scoreboard branding back to the
                    // riftbound default fallbacks. (CSS defaults: --rb-font →
                    // 'Beaufort for LoL', --scoreboard-name-color → #ffffff,
                    // --scoreboard-record-color → #161f30, --rb-font-weight
                    // → 900. See scoreboard.css L1020/1113/1160 etc.)
                    '--rb-font':                 "'Beaufort for LoL'",
                    '--rb-font-weight':          '900',
                    '--rb-points-font':          "'Beaufort for LoL'",
                    '--scoreboard-name-color':   '#ffffff',
                    '--scoreboard-record-color': '#161f30',

                    // Hide event-name, event-round, and timer wrappers in
                    // DSG 1v1. Each var directly gates its own wrapper's
                    // display in scoreboard.css (rules around L1408–L1462).
                    // Hiding via the wrapper rather than the inner content
                    // means the wrapper takes no space and contributes
                    // nothing to layout.
                    '--rb-event-name-display':   'none',
                    '--rb-round-display':        'none',
                    '--rb-timer-display':        'none',
                    // Runes wrapper hidden too — DSG 1v1 doesn't use the
                    // rune-pip strip. Gates `.riftbound-player-runes-wrapper`
                    // in scoreboard.css (~L1294).
                    '--rb-runes-display':        'none',

                    // Legend / champion / battlefield positions all inherit
                    // riftbound CSS defaults — no overrides here. Defaults:
                    // legend bg top:428 side:53 251×124 (scoreboard.css L913),
                    // champion top:521 side:52 251×30 (L1248),
                    // bf top:581 side:53 250×60 (L1355).
                    // Legend bg z-index also inherits default (5, post-bump).
                    //
                    // DSG-purple plate behind the legend portrait — overrides
                    // the post-bump CSS default (#161f30 dark navy) with the
                    // DSG brand purple. Fills the box if the photo is
                    // transparent / slow / missing.
                    '--rb-legend-bg-color': '#431a6b',
                    //
                    // `over_frame-dsg-1v1.png` doesn't exist on disk so it
                    // 404s silently — equivalent to no over-frame, which is
                    // fine. `frame-dsg-1v1.png` does exist; it provides the
                    // DSG-styled full-screen background.

                    // Decklist — frame asset paths re-suffixed for DSG 1v1.
                    // (Files need to be added at the corresponding paths
                    // before DSG 1v1 decklist pages will render correctly.)
                    '--rb-dl-bg-video-display': 'none',
                    '--rb-dl-frame-left': "url('/assets/images/riftbound/decklist/frame/riftbound-decklist-frame-dsg-1v1-left.png')",
                    '--rb-dl-frame-right': "url('/assets/images/riftbound/decklist/frame/riftbound-decklist-frame-dsg-1v1-right.png')",
                    '--rb-dl-container-top': '0px',
                    '--rb-dl-container-left': '0px',
                    '--rb-dl-name-top': '619px',
                    '--rb-dl-name-left': '85px',
                    '--rb-dl-name-right': 'auto',
                    '--rb-dl-name-align': 'left',
                    '--rb-dl-name-font-size': '32px',
                    '--rb-dl-name-width': '500px',
                    '--rb-dl-name-height': '35px',
                    '--rb-dl-name-font-weight': 'bold',
                    '--rb-dl-name-color': 'white',
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
                    '--rb-dl-legend-top': '40px',
                    '--rb-dl-legend-left': '24px',
                    '--rb-dl-legend-width': '605px',
                    '--rb-dl-legend-height': '831px',
                    '--rb-dl-legend-display': 'block',
                    '--rb-dl-legend-z': '5',
                    '--rb-dl-champion-display': 'none',
                    '--rb-dl-main-top': '39px',
                    '--rb-dl-main-left': '661px',
                    '--rb-dl-main-width': '1225px',
                    '--rb-dl-sb-off-shift': '0px',
                    '--rb-dl-main-height': '600px',
                    '--rb-dl-main-row-gap': '20px',
                    '--rb-dl-main-col-gap': '12px',
                    '--rb-dl-card-width': '185px',
                    '--rb-dl-side-top': '887px',
                    '--rb-dl-side-left': '703px',
                    '--rb-dl-side-width': '1060px',
                    '--rb-dl-side-height': '112px',
                    '--rb-dl-side-display': 'flex',
                    '--rb-dl-side-row-gap': '4px',
                    '--rb-dl-side-col-gap': '4px',
                    '--rb-dl-side-card-width': '111px',
                    '--rb-dl-side-wrap': 'nowrap',
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
                    '--rb-dl-bf-label-font-size': '14px',
                    '--rb-dl-bf-label-justify': 'flex-start',
                    '--rb-dl-bf-label-align': 'left',
                    '--rb-dl-bf-label-left': '59px',
                    '--rb-dl-bf-label-shadow': 'none',
                    '--rb-dl-count-bottom': '-10px',
                    '--rb-dl-count-font-size': '20px',
                    '--rb-dl-side-count-font-size': '20px',
                    '--rb-dl-side-count-bottom': '-56px',
                    '--rb-dl-runes-top': '860px',
                    '--rb-dl-runes-left': '460px',
                    '--rb-dl-runes-width': '130px',
                    '--rb-dl-runes-height': '200px',
                    '--rb-dl-runes-display': 'flex',
                    '--rb-dl-rune-badge': 'true',
                    '--rb-dl-rune-icon-size': '107px',
                    '--rb-dl-rune-badge-size': '28px',
                    '--rb-dl-rune-font-size': '22px',
                    '--rb-dl-champion-in-grid': 'true',
                    '--rb-dl-main-max-cards': '18',

                    // Lower third (DSG-suffixed paths)
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
                    '--rb-lt-winner-img-left': '140px',
                    '--rb-lt-winner-img-top': '877px',
                    '--rb-lt-winner-width': '611px',
                    '--rb-lt-winner-height': '100px',
                    '--rb-lt-winner-text-left': '61px',
                    '--rb-lt-winner-text-top': '916px',
                    '--rb-lt-winner-text-width': '400px',
                    '--rb-h2h-bg-image': "url('/assets/images/riftbound/lower-third/riftbound-lower-third-player.png')",
                    '--rb-h2h-img-left': '140px',
                    '--rb-h2h-img-top': '877px',
                    '--rb-h2h-width': '611px',
                    '--rb-h2h-height': '100px',
                    '--rb-h2h-text-left': '61px',
                    '--rb-h2h-text-top': '916px',
                    '--rb-h2h-text-width': '400px',
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
                    // Metagame
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

                // ── DSG 2v2 ─────────────────────────────────────────────────
                // Initial scaffold cloned from DSG 1v1 (same TES-derived
                // values) with asset paths re-suffixed -dsg-2v2. Positional
                // values will need 2v2 layout adjustments once the DSG 2v2
                // PSDs are in place — same workflow as the FlyQuest 2v2
                // build-out. CSS scope blocks (body[data-player-count="2v2"])
                // can layer on top of these vars.
                '2v2': {
                    // Scoreboard — positional / typography (TES-derived;
                    // tune for 2v2 layout once DSG 2v2 PSDs land)
                    '--rb-name-top': '13.5px',
                    '--rb-name-side': '391px',
                    '--rb-name-width': '346px',
                    '--rb-name-height': '70px',
                    '--rb-name-max-font': '48',
                    '--rb-name-max-width': '320',
                    '--rb-name-shadow': 'none',
                    '--rb-text-align-left': 'left',
                    '--rb-text-align-right': 'right',
                    '--rb-detail-font-style': 'italic',
                    '--rb-detail-shadow': 'none',
                    // Legend portrait filter cleared for DSG 2v2 — the
                    // player-info hub overlays legend art directly on the L3
                    // strip and brightness(0.5) reads muddy against the bright
                    // frame. Other DSG combos (1v1) still dim for full-frame
                    // legend art.
                    '--rb-bg-brightness': 'none',
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

                    // ── Card view (2v2 animated path) ──
                    // Coords cloned from the MTG flyquest 2v2 block — the DSG
                    // 2v2 frame is a visual clone of FQ (same camera columns
                    // on the right side of the layout), so the same numbers
                    // land card-id 1 (left DOM) and card-id 2 (right DOM)
                    // centered in the mid cam frames. The 2v2 CSS scope in
                    // scoreboard.css drives the slide+fade+tilt-in animation,
                    // sequenced two-slot crossfade, and drop-shadow halo
                    // pipeline (mirrors showRiftboundCardOverlay in
                    // scoreboard.js, which mirrors showMtgCardOverlay).
                    '--rb-card-overlay-top':    '249px',
                    '--rb-card-overlay-width':  '414px',
                    '--rb-card-overlay-left':   '1400px',  // card-id 1 → mid cam center
                    '--rb-card-overlay-right':  '106px',   // card-id 2 → same center
                    '--rb-card-overlay-z':      '25',
                    '--rb-card-slide-offset':   '60px',
                    '--rb-card-slide-duration': '350ms',
                    '--rb-card-fade-duration':  '350ms',
                    '--rb-card-slide-easing':   'ease-out',
                    '--rb-card-perspective':    '1500px',
                    '--rb-card-tilt':           '-12deg',
                    // Dim layer disabled (transparent + 0px blur). The card's
                    // drop shadow alone reads cleanly against the dark cam
                    // columns — same call as FQ 2v2 after testing. Vars left
                    // in place so re-enabling is a one-line flip on
                    // --rb-card-dim-color (raise alpha) without touching CSS.
                    '--rb-card-dim-color':         'rgba(0, 0, 0, 0)',
                    '--rb-card-blur-amount':       '0px',
                    '--rb-card-saturate':          '100%',
                    '--rb-card-dim-feather-start': '65.2%',
                    '--rb-card-dim-feather-end':   '69.2%',
                    '--rb-card-dim-z':             '22',
                    // Card drop shadow — soft halo behind the card to lift it
                    // off the cam. Renders as opaque-ish pixels in the browser
                    // layer that OBS composites over cam sources, so the
                    // shadow visibly darkens the cam area immediately around
                    // the card. Format: x y blur spread color.
                    '--rb-card-shadow':            '0 0 80px 10px rgba(0, 0, 0, 0.75)',

                    '--rb-round-top': '829px',
                    '--rb-round-shadow': 'none',
                    '--rb-timer-top': '869px',
                    '--rb-timer-color': '#1ec9ff',
                    '--rb-timer-font-size': '72px',
                    '--rb-timer-max-width': '140',
                    // Event name hidden in DSG 2v2 — the L3 strip is reserved
                    // for battlefield text (see bf-positioning block below).
                    // Position vars left in place so re-enabling is a one-line
                    // flip back to 'flex'.
                    '--rb-event-name-display': 'none',
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

                    // ── DSG 2v2 hides — elements not in this vendor's design ──
                    // The five wrappers below are var-gated in scoreboard.css
                    // (display: var(--rb-{record|legend|champion|round|timer}-display, flex))
                    // so DSG 2v2 hides them while TES + other vendors keep the
                    // default `flex`. Hides only — no positional / color side
                    // effects.
                    '--rb-record-display': 'none',
                    '--rb-legend-display': 'none',
                    '--rb-champion-display': 'none',
                    '--rb-round-display': 'none',
                    '--rb-timer-display': 'none',
                    // Battlefield-bg images have no slot in the DSG 2v2 frame
                    // (PSD has bf TEXT only, no card art). Hide the bg layer
                    // here; the text stays and gets repositioned in the layout
                    // block below to land inside the L3 strip.
                    '--rb-bf-bg-display': 'none',

                    // ── DSG 2v2 color / weight overrides ──
                    // Override the shared DSG block (which uses dark navy +
                    // cream for DSG 1v1's lighter frame). DSG 2v2's frame is
                    // dark, so names + life totals render white. Medium
                    // (500) is one step up from regular — readable at 24px
                    // against the dark frame without the heaviness of
                    // SemiBold. DSG 1v1 stays at shared 400. EB Garamond
                    // ships the 500 face (see scoreboard.css @font-face
                    // block) so this resolves to the real Medium, not a
                    // synthesized weight.
                    '--scoreboard-name-color': '#ffffff',
                    '--rb-font-weight': '500',
                    '--rb-points-left-color': '#ffffff',
                    '--rb-points-right-color': '#ffffff',

                    // ── DSG 2v2 layout — stacked-on-right + center info hub ──
                    // Both name strips sit on the right side of the screen
                    // (top team y≈305, bot team y≈1004). The player info hub
                    // is a single horizontal cluster at the screen's left-of-
                    // center, mirrored top/bottom for the two teams. Per the
                    // updated PSD layer geometry (left→right within each team):
                    //     legend (78×78) | portrait (78×78) | life (102×78) |
                    //     portrait (78×78) | legend (78×78)
                    //   row anchors: y=223 (top team), y=864 (bot team)
                    //   x anchors:   467 (legend),  539 (portrait),
                    //                614 (life),    713 (portrait),  784 (legend)
                    //   top name label: top=305 left=1338  539×32
                    //   bot name label: top=1004 left=1338 539×34
                    //
                    // Riftbound CSS is mirror-symmetric by default; the per-side
                    // vars below break out of that. The right-side rules need
                    // --rb-{X}-right-side: 'auto' so the right-edge offset
                    // stops fighting --rb-{X}-right-left's absolute placement.
                    '--rb-name-left-top': '305px',
                    '--rb-name-left-side': '1338px',
                    '--rb-name-right-top': '1004px',
                    '--rb-name-right-side': 'auto',
                    '--rb-name-right-left': '1338px',
                    '--rb-name-width': '539px',
                    '--rb-name-height': '32px',
                    // Life total — narrower box (102×78, was 127×78 in the
                    // earlier PSD revision) shifted right to land between the
                    // two portrait slots. left side x=614, right side mirrored
                    // via auto-left toggle to the same absolute x=614.
                    '--rb-life-left-top': '223px',
                    '--rb-life-left-side': '614px',
                    '--rb-life-right-top': '864px',
                    '--rb-life-right-side': 'auto',
                    '--rb-life-right-left': '614px',
                    '--rb-life-width': '102px',
                    '--rb-life-height': '78px',
                    // Legend backgrounds — placed in the OUTER legend slots
                    // (P1 for team 1, P3 for team 2; both at slot x=467). The
                    // PSD layer bounds read 77–79px wide because of layer
                    // effects (drop shadow / outer glow); the actual painted
                    // square is 67×67. Top-left coords below center the
                    // 67-wide content inside the 78-wide PSD slot:
                    //     left = 467 + (78-67)/2 = 472
                    //     top  = 223 + (78-67)/2 ≈ 228 (top team)
                    //     top  = 864 + (79-67)/2 ≈ 870 (bot team)
                    // Inner P2/P4 slots are wired separately below
                    // (--rb-legend-bg-left-2-* / -right-2-*) once the
                    // legend-left-2 / legend-right-2 data fields are
                    // populated by control.html.
                    // Top-team y nudged 228→229 (operator visual correction —
                    // top row reads 1px high relative to the L3 strip baseline).
                    '--rb-legend-bg-left-top': '229px',
                    '--rb-legend-bg-left-side': '472px',
                    '--rb-legend-bg-right-top': '870px',
                    '--rb-legend-bg-right-side': 'auto',
                    '--rb-legend-bg-right-left': '472px',
                    '--rb-legend-bg-width': '67px',
                    '--rb-legend-bg-height': '67px',
                    // Inner team-A / team-B legend slots (P2 / P4). PSD inner
                    // legend layer sits at x=784 79×78. Same 67×67 visible
                    // content centered → left = 784 + (79-67)/2 ≈ 790.
                    // Top tracks the team's outer slot (229 top, 870 bot).
                    // --rb-legend-2-display: block reveals the .background-left-2
                    // / -right-2 elements (default CSS keeps them display:none
                    // so 1v1 + non-DSG vendors aren't affected).
                    '--rb-legend-2-display': 'block',
                    '--rb-legend-bg-left-2-top':  '229px',
                    '--rb-legend-bg-left-2-left': '790px',
                    '--rb-legend-bg-right-2-top':  '870px',
                    '--rb-legend-bg-right-2-left': '790px',
                    // Champion-art bg-position tuned for the square crop —
                    // default 45% pulls a face-frame from the legend art that
                    // was sized for the 251×124 rectangle; in a 67×67 square
                    // we want center-center to keep the subject centered.
                    '--rb-legend-bg-pos': 'center',
                    '--rb-legend-bg-size': 'cover',
                    // Player portraits — enable the 4 rb-p{1..4}-icon <img>
                    // slots that scoreboard.js already stamps from the global
                    // roster. opacity:1 turns them on (default 0 hides them
                    // for vendors without portrait slots in their frame).
                    // Same 67×67 visible-content size as the legend boxes;
                    // top/left center the 67px square inside the 77–79px
                    // PSD slot bounds (10–12px of effect inflation absorbed):
                    //     P1/P3 column: left = 539 + 5 = 544
                    //     P2/P4 column: left = 713 + 6 = 719
                    //     top team y    = 223 + 5 = 228
                    //     bot team y    = 864 + 6 = 870
                    '--rb-icon-opacity': '1',
                    '--rb-icon-width': '67px',
                    '--rb-icon-height': '67px',
                    // Top-team y nudged 228→229 to match the legend slots above.
                    '--rb-p1-icon-top':  '229px',
                    '--rb-p1-icon-left': '544px',
                    '--rb-p2-icon-top':  '229px',
                    '--rb-p2-icon-left': '719px',
                    '--rb-p3-icon-top':  '870px',
                    '--rb-p3-icon-left': '544px',
                    '--rb-p4-icon-top':  '870px',
                    '--rb-p4-icon-left': '719px',

                    // 2v2 name layout — both team-mate names render inside one
                    // strip joined by " & " (non-breaking spaces — regular
                    // spaces collapse at flex-leading edges; same fix used in
                    // FQ's --mtg-2v2-name-separator). justify-content: center
                    // centers the joined run inside the 539px strip.
                    '--rb-2v2-name-direction': 'row',
                    '--rb-2v2-name-gap': '0px',
                    '--rb-2v2-name-justify': 'center',
                    '--rb-2v2-name-separator': '"\u00a0&\u00a0"',
                    // Static 19px name font (24px ÷ 1.25 — 20% smaller per
                    // operator preference for DSG 2v2 readability). The 2v2
                    // hook sets font-size on .riftbound-player-name so both
                    // primary AND secondary spans render uniformly. autoScale
                    // only touches the primary, so the static font-size and
                    // max-font ceiling stay in lockstep — drop one, drop both
                    // to keep primary + secondary aligned at the same starting
                    // size. (max-font is parseInt'd in scoreboard.js, hence
                    // integer 19, not 19.2.)
                    '--2v2-name-font-size': '19px',
                    '--rb-name-max-font': '19',
                    '--rb-name-max-width': '539',
                    // Life/points font tuned to the 102×78 life-total box.
                    // 50px starting size still fits two-digit life totals
                    // (most common case); autoScale shrinks toward
                    // max-width=90 — i.e. 102 box minus ~12px of internal
                    // padding — for three-digit totals like "100".
                    '--rb-points-font-size': '50px',
                    '--rb-points-max-font': '50',
                    '--rb-points-max-width': '90',

                    // ── Battlefields row in the L3 strip ──
                    // DSG 2v2 replaces the per-side battlefield text wrappers
                    // (--rb-bf-text-display: none) with the full 4-card
                    // .riftbound-bf-row strip — a flex-row of cropped card
                    // images + overlaid name labels. Positional defaults in
                    // scoreboard.css already match the L3 PSD's BG layer
                    // (top=992 left=33 1263×55), so we only need to flip the
                    // display var and supply DSG's brand typography.
                    //
                    // EB Garamond is the DSG voice (same as pack-opening text);
                    // the cream / black-shadow combo reads cleanly against the
                    // dark blue card-mid bands. Slot dimensions and row
                    // geometry come from the defaults — no per-vendor tuning
                    // required while the DSG 2v2 PSD strip layout is unchanged.
                    '--rb-bf-text-display': 'none',
                    '--rb-battlefields-row-display': 'flex',
                    '--rb-battlefields-label-font':        "'EB Garamond', serif",
                    '--rb-battlefields-label-font-size':   '20px',
                    '--rb-battlefields-label-font-weight': 'bold',
                    '--rb-battlefields-label-color':       '#f0ebdf',
                    '--rb-battlefields-label-text-shadow': '0 0 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.95)',

                    // Decklist — frame asset paths re-suffixed for DSG 2v2.
                    '--rb-dl-bg-video-display': 'none',
                    '--rb-dl-frame-left': "url('/assets/images/riftbound/decklist/frame/riftbound-decklist-frame-dsg-2v2-left.png')",
                    '--rb-dl-frame-right': "url('/assets/images/riftbound/decklist/frame/riftbound-decklist-frame-dsg-2v2-right.png')",
                    '--rb-dl-container-top': '0px',
                    '--rb-dl-container-left': '0px',
                    '--rb-dl-name-top': '619px',
                    '--rb-dl-name-left': '85px',
                    '--rb-dl-name-right': 'auto',
                    '--rb-dl-name-align': 'left',
                    '--rb-dl-name-font-size': '32px',
                    '--rb-dl-name-width': '500px',
                    '--rb-dl-name-height': '35px',
                    '--rb-dl-name-font-weight': 'bold',
                    '--rb-dl-name-color': 'white',
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
                    '--rb-dl-legend-top': '40px',
                    '--rb-dl-legend-left': '24px',
                    '--rb-dl-legend-width': '605px',
                    '--rb-dl-legend-height': '831px',
                    '--rb-dl-legend-display': 'block',
                    '--rb-dl-legend-z': '5',
                    '--rb-dl-champion-display': 'none',
                    '--rb-dl-main-top': '39px',
                    '--rb-dl-main-left': '661px',
                    '--rb-dl-main-width': '1225px',
                    '--rb-dl-sb-off-shift': '0px',
                    '--rb-dl-main-height': '600px',
                    '--rb-dl-main-row-gap': '20px',
                    '--rb-dl-main-col-gap': '12px',
                    '--rb-dl-card-width': '185px',
                    '--rb-dl-side-top': '887px',
                    '--rb-dl-side-left': '703px',
                    '--rb-dl-side-width': '1060px',
                    '--rb-dl-side-height': '112px',
                    '--rb-dl-side-display': 'flex',
                    '--rb-dl-side-row-gap': '4px',
                    '--rb-dl-side-col-gap': '4px',
                    '--rb-dl-side-card-width': '111px',
                    '--rb-dl-side-wrap': 'nowrap',
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
                    '--rb-dl-bf-label-font-size': '14px',
                    '--rb-dl-bf-label-justify': 'flex-start',
                    '--rb-dl-bf-label-align': 'left',
                    '--rb-dl-bf-label-left': '59px',
                    '--rb-dl-bf-label-shadow': 'none',
                    '--rb-dl-count-bottom': '-10px',
                    '--rb-dl-count-font-size': '20px',
                    '--rb-dl-side-count-font-size': '20px',
                    '--rb-dl-side-count-bottom': '-56px',
                    '--rb-dl-runes-top': '860px',
                    '--rb-dl-runes-left': '460px',
                    '--rb-dl-runes-width': '130px',
                    '--rb-dl-runes-height': '200px',
                    '--rb-dl-runes-display': 'flex',
                    '--rb-dl-rune-badge': 'true',
                    '--rb-dl-rune-icon-size': '107px',
                    '--rb-dl-rune-badge-size': '28px',
                    '--rb-dl-rune-font-size': '22px',
                    '--rb-dl-champion-in-grid': 'true',
                    '--rb-dl-main-max-cards': '18',

                    // Lower third
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
                    '--rb-lt-winner-img-left': '140px',
                    '--rb-lt-winner-img-top': '877px',
                    '--rb-lt-winner-width': '611px',
                    '--rb-lt-winner-height': '100px',
                    '--rb-lt-winner-text-left': '61px',
                    '--rb-lt-winner-text-top': '916px',
                    '--rb-lt-winner-text-width': '400px',
                    '--rb-h2h-bg-image': "url('/assets/images/riftbound/lower-third/riftbound-lower-third-player.png')",
                    '--rb-h2h-img-left': '140px',
                    '--rb-h2h-img-top': '877px',
                    '--rb-h2h-width': '611px',
                    '--rb-h2h-height': '100px',
                    '--rb-h2h-text-left': '61px',
                    '--rb-h2h-text-top': '916px',
                    '--rb-h2h-text-width': '400px',
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
                    // Metagame
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
            tes: {
                // SCOREBOARD: inherits the default (CSL) riftbound 1v1 layout
                // verbatim (2026-07-22) — TES supplies only the branded frame
                // PNG (riftbound-scoreboard-frame-tes-1v1.png). --rb-font /
                // --rb-font-weight are intentionally NOT set here: they are
                // consumed ONLY by scoreboard.css, so omitting them reverts the
                // board to CSL's Beaufort. (Decklist keeps --rb-dl-font;
                // standings keeps --standings-font below — both unaffected.)

                // Standings page font — override the page-wide
                // 'Beaufort for LoL' that broadcast-round-standings-*.js
                // sets for game === 'riftbound', so TES standings render in
                // its Akzidenz-Grotesk Next brand voice at weight 900.
                '--standings-font':        "'Akzidenz-Grotesk Next', sans-serif",
                '--standings-font-weight': '900',

                // Hide Bologna's browser-rendered column header chrome.
                // Without this protective override, TES inherits
                // `--rb-stand-dynamic-headers: 'block'` from default
                // (via the default-as-fallback merge) and the four
                // dynamic RANK/PLAYER/LEGEND/RECORD column headers
                // render on top of TES's baked-in PNG headers.
                '--rb-stand-dynamic-headers':         'none',

                // Hide Bologna's branded footer (SWISS STANDINGS / ROUND
                // N / SHARE YOUR STORY / #BOUNDFORGLORY). Same protective
                // override pattern — without it TES inherits default's
                // `--rb-stand-footer-display: 'flex'` and renders the
                // Bologna footer on top of TES's standings.
                '--rb-stand-footer-display':          'none',

                // Live-for-top-8 highlight — every player whose
                // current_wins + remaining_rounds ≥ cut_wins gets a
                // soft glow on their portrait + record. Adjust per event.
                '--standings-total-rounds':           '13',
                '--standings-top8-cut-wins':          '10',

                // Scoreboard geometry / colors / fonts: NONE. Stripped
                // 2026-07-22 so TES inherits the default (CSL) riftbound 1v1
                // board verbatim through the getOverrides default-as-fallback
                // merge — positions, gold/slate palette and Beaufort type all
                // come from default. Inherited display gates land correctly:
                // life-plate = none, score-tracker / showdown / champion =
                // flex, event-name / points hidden. The old horizontal-chrome
                // overrides (name/life/record/points/wins/card-overlay/round/
                // timer/event-name/legend/battlefield positions + cyan/green
                // accents) are gone. TES branding lives only in the frame PNG.
                '--rb-runes-display': 'none',   // (default is also none; kept explicit)

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
                '--rb-dl-sb-off-shift': '0px',
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
                // Standings — TES's original design (committed HEAD,
                // pre-2026-05). Name renders 48px bold black on the
                // baked yellow row strip in TES's bg PNG; portrait is
                // a 118×83 rectangular card (NOT circular); 740-wide
                // row with the rank as a small 20px badge upper-left.
                // Different from the Bologna single-column design and
                // from atomic-legacy's circular-portrait card layout.
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
                '--standings-wrapper-margin-top': '287px',  // was 307px — shifted up 20px per operator
                '--standings-wrapper-margin-left': '150px',
                '--standings-event-round-display': 'block',
                '--standings-event-round-top': '235px',
                '--standings-event-round-left': '162px',
                '--standings-event-round-font-size': '28px',
                '--standings-event-round-font-weight': '300',
                '--standings-event-round-color': '#fff',
                // Metagame overrides — TES keeps its original
                // black + white/green palette. Explicit overrides for
                // --meta-card-bg + label colors so TES doesn't inherit
                // riftbound default's new dark-purple/gold scheme via
                // the default-as-fallback merge.
                '--meta-card-bg':           '#000',
                '--meta-label-bg':          '#000',
                '--meta-label-stroke':      '#1ae930',
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
                // TES has "METAGAME" baked into the bg PNG — hide the
                // dynamic browser-rendered title to avoid doubling.
                '--meta-title-display':         'none',
                // Explicit font override of the riftbound.default vendor's
                // Beaufort. TES branding is Akzidenz-Grotesk Next (matches
                // its scoreboard typography); without this explicit override
                // TES would inherit default's Beaufort via the merge.
                '--metagame-font':              "'Akzidenz-Grotesk Next', sans-serif",
                '--metagame-font-weight':       '900',
            },
        },
    },

    // Get vendor list for a game (always includes Default)
    getVendorsForGame(game) {
        return this.gameVendors[game] || [{ value: 'default', label: 'Default' }];
    },

    // Some vendors ship NO image/video/mask asset FILES of their own and
    // reuse another vendor's. Their on-screen look can still differ via the
    // CSS-var overrides in `overrides`; only the underlying asset files are
    // shared. e.g. 'uvs-unleashed' is a clone of 'default' that swaps just
    // the decklist background video (a CSS var, --rb-dl-bg-video) — every
    // other asset must resolve to 'default' so it doesn't 404 on
    // `…-uvs-unleashed-1v1.*` files that were never created.
    assetVendorAlias: {
        'uvs-unleashed': 'default',
        // 'anu' is a personal clone of uvs-unleashed — it reuses uvs-unleashed's
        // reskin files (which themselves fall through to default). getAssetPath +
        // resolveAssetVendor walk the whole chain: anu → uvs-unleashed → default.
        'anu': 'uvs-unleashed',
    },

    // Assets an aliased vendor has RESKINNED with its own files. Matched as
    // substrings of the asset path passed to getAssetPath(). As each scene is
    // reskinned, add its asset-path fragments here — the vendor then uses its
    // own UNLEASHED art for those, and still falls back to default everywhere
    // else (so nothing 404s mid-migration).
    assetVendorOwns: {
        'uvs-unleashed': [
            'standings/riftbound-standings-bg',
            'standings/riftbound-standings-char',
            'standings/riftbound-standings-frame',
            'bracket/riftbound-bracket-bg',
            'bracket/riftbound-bracket-frame',
        ],
        // 'anu' reskins just the scoreboard frame PNG with its own art
        // (riftbound-scoreboard-frame-anu-1v1.png); everything else still
        // chains anu → uvs-unleashed → default.
        'anu': [
            'scoreboard/frame/riftbound-scoreboard-frame',
        ],
    },

    // Resolve a vendor to the vendor whose asset FILES should be used.
    // Use this anywhere an asset path is built from the vendor name. NOTE: this
    // path-less form always falls back to the alias; getAssetPath() does the
    // per-asset owns-list check (since it has the path).
    resolveAssetVendor(vendor) {
        let v = vendor || 'default';
        const seen = new Set();
        while (this.assetVendorAlias[v] && !seen.has(v)) { seen.add(v); v = this.assetVendorAlias[v]; }
        return v;
    },

    // Returns the asset path with vendor + player count suffix
    // e.g., getAssetPath('/assets/images/mtg/bracket/bracket-frame.png', 'dsg', '1v1')
    //     → '/assets/images/mtg/bracket/bracket-frame-dsg-1v1.png'
    // The vendor is run through resolveAssetVendor() first, so asset-aliased
    // vendors (e.g. uvs-unleashed → default) point at files that exist.
    getAssetPath(basePath, vendor, playerCount) {
        // Aliased vendors borrow their alias's files UNLESS they own this
        // specific asset (reskinned) — see assetVendorOwns. Walk the whole
        // alias chain (e.g. anu → uvs-unleashed → default), stopping at the
        // first vendor in the chain that owns this asset.
        let v = vendor || 'default';
        const seen = new Set();
        while (this.assetVendorAlias[v] && !seen.has(v)) {
            const owns = (this.assetVendorOwns[v] || []).some(frag => basePath.includes(frag));
            if (owns) break;
            seen.add(v);
            v = this.assetVendorAlias[v];
        }
        const p = playerCount || '1v1';
        const suffix = '-' + v + '-' + p;
        const lastDot = basePath.lastIndexOf('.');
        if (lastDot === -1) return basePath + suffix;
        return basePath.slice(0, lastDot) + suffix + basePath.slice(lastDot);
    },

    // Recognized per-playerCount keys that may nest inside a vendor block.
    // Any other key starting with `--` is treated as a flat (shared) CSS var.
    _playerCountKeys: ['1v1', '2v2', 'ffa'],

    // Returns all CSS custom property names used by any vendor override.
    // Recurses into per-playerCount nested blocks so the master `style.cssText`
    // wipe in display pages (`updateTheme()`) clears every potential var name.
    getAllOverrideProperties() {
        const props = new Set();
        const pcKeys = this._playerCountKeys;
        const collect = (obj) => {
            for (const k in obj) {
                if (pcKeys.includes(k) && obj[k] && typeof obj[k] === 'object') {
                    collect(obj[k]);
                } else if (k.startsWith('--')) {
                    props.add(k);
                }
            }
        };
        for (const game in this.overrides) {
            for (const vendor in this.overrides[game]) {
                collect(this.overrides[game][vendor]);
            }
        }
        return [...props];
    },

    // Returns style override object for a game+vendor+playerCount combo.
    // Vendor blocks may be:
    //   - flat: { '--var': 'val', ... }                       — applies to all counts
    //   - nested: { '1v1': {...}, '2v2': {...}, 'ffa': {...} } — per-count only
    //   - mixed: { '--shared': 'val', '1v1': {...}, '2v2': {...} } — shared + per-count
    //
    // Resolution order (most specific wins):
    //   1. <vendor>[<playerCount>]   — vendor's per-count overrides
    //   2. <vendor> flat vars        — vendor's shared overrides
    //   3. default[<playerCount>]    — default vendor's per-count baseline
    //   4. default flat vars         — default vendor's shared baseline
    //
    // The `default` vendor acts as the fallback for every other vendor
    // in the same game. A vendor only needs to declare the vars where
    // it diverges from default; everything else inherits. Adding a new
    // var to default automatically propagates to TES / DSG / FlyQuest /
    // etc. unless they explicitly override.
    //
    // When `vendor === 'default'`, only the default-tier merges run
    // (no double-application of the same vars).
    getOverrides(game, vendor, playerCount) {
        const gameOverrides = this.overrides[game] || {};
        const v = vendor || 'default';
        const pcKeys = this._playerCountKeys;

        function flatten(base) {
            if (!base) return {};
            const out = {};
            for (const k of Object.keys(base)) {
                if (!pcKeys.includes(k) && k !== '_extends') out[k] = base[k];
            }
            return out;
        }

        const defaultBase = gameOverrides['default'] || {};
        const defaultFlat = flatten(defaultBase);
        const defaultPC = (playerCount && defaultBase[playerCount]) || {};

        if (v === 'default') {
            return { ...defaultFlat, ...defaultPC };
        }

        const vendorBase = gameOverrides[v] || {};
        const vendorFlat = flatten(vendorBase);
        const vendorPC = (playerCount && vendorBase[playerCount]) || {};

        // Optional single-vendor inheritance: `_extends: 'otherVendor'` pulls
        // that vendor's overrides in between the default tier and this vendor's
        // own (this vendor still wins). Lets a personal clone (e.g. 'anu')
        // reuse another vendor's overrides and change only a few vars.
        let parentFlat = {}, parentPC = {};
        if (vendorBase._extends) {
            const parentBase = gameOverrides[vendorBase._extends] || {};
            parentFlat = flatten(parentBase);
            parentPC = (playerCount && parentBase[playerCount]) || {};
        }

        // Merge default-tier first, then parent (_extends), then vendor-tier on
        // top. Within each tier, per-count overrides flat. Later tiers win.
        return {
            ...defaultFlat,
            ...defaultPC,
            ...parentFlat,
            ...parentPC,
            ...vendorFlat,
            ...vendorPC,
        };
    },
};
