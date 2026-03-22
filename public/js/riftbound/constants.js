// Riftbound Shared Constants
// Single source of truth for all Riftbound dictionaries across views.
// Data only — no utility/lookup functions.

// ── RUNE NAMES ──────────────────────────────────────────────────────────────
export const RIFTBOUND_RUNE_NAMES = {
    'r': 'Fury', 'g': 'Calm', 'b': 'Mind', 'o': 'Body', 'p': 'Chaos', 'y': 'Order'
};

// ── RUNE ICON SETS ──────────────────────────────────────────────────────────
// Three icon styles used by different views
export const RIFTBOUND_RUNES_FILLED = {
    'r': '/assets/images/riftbound/icons/runes/Fury2.png',
    'g': '/assets/images/riftbound/icons/runes/Calm2.png',
    'b': '/assets/images/riftbound/icons/runes/Mind.png',
    'o': '/assets/images/riftbound/icons/runes/Body2.png',
    'p': '/assets/images/riftbound/icons/runes/Chaos2.png',
    'y': '/assets/images/riftbound/icons/runes/Order2.png'
};

export const RIFTBOUND_RUNES_OUTLINED = {
    'r': '/assets/images/riftbound/icons/runes-outlined/Fury-outlined.png',
    'g': '/assets/images/riftbound/icons/runes-outlined/Calm-outlined.png',
    'b': '/assets/images/riftbound/icons/runes-outlined/Mind-outlined.png',
    'o': '/assets/images/riftbound/icons/runes-outlined/Body-outlined.png',
    'p': '/assets/images/riftbound/icons/runes-outlined/Chaos-outlined.png',
    'y': '/assets/images/riftbound/icons/runes-outlined/Order-outlined.png'
};

export const RIFTBOUND_RUNES_BG = {
    'r': '/assets/images/riftbound/icons/runes-bg/Fury-bg.png',
    'g': '/assets/images/riftbound/icons/runes-bg/Calm-bg.png',
    'b': '/assets/images/riftbound/icons/runes-bg/Mind-bg.png',
    'o': '/assets/images/riftbound/icons/runes-bg/Body-bg.png',
    'p': '/assets/images/riftbound/icons/runes-bg/Chaos-bg.png',
    'y': '/assets/images/riftbound/icons/runes-bg/Order-bg.png'
};

// ── BATTLEFIELD NAMES ───────────────────────────────────────────────────────
export const RIFTBOUND_BATTLEFIELD_NAMES = [
    'Altar to Unity', 'Aspirant\'s Climb', 'Back-Alley Bar', 'Bandle Tree',
    'Emperor\'s Dais', 'Forge of the Fluft', 'Forgotten Monument', 'Fortified Position',
    'Grove of the God-Willow', 'Hall of Legends', 'Hallowed Tomb', 'Marai Spire',
    'Minefield', 'Monastery of Hirana', 'Navori Fighting Pit', 'Obelisk of Power',
    'Orin\'s Forge', 'Power Nexus', 'Ravenbloom Conservatory', 'Reaver\'s Row',
    'Reckoner\'s Arena', 'Rockfall Path', 'Seat of Power', 'Sigil of the Storm',
    'Startipped Peak', 'Sunken Temple', 'Targon\'s Peak', 'The Arena\'s Greatest',
    'The Candlelit Sanctum', 'The Dreaming Tree', 'The Grand Plaza', 'The Papertree',
    'Treasure Hoard', 'Trifarian War Camp', 'Veiled Temple', 'Vilemaw\'s Lair',
    'Void Gate', 'Windswept Hillock', 'Zaun Warrens'
];

// ── BATTLEFIELD PATHS: SCOREBOARD & BROADCAST ───────────────────────────────
// Both scoreboard and broadcast-round-main-deck use battlefields-default-1v1/{name}.png
export const RIFTBOUND_BATTLEFIELDS_BASE = '/assets/images/riftbound/battlefields/battlefields-default-1v1';

// ── BATTLEFIELD PATHS: DECK DISPLAY (numbered-prefix format) ────────────────
export const RIFTBOUND_BATTLEFIELDS_DEFAULT_DECK_DISPLAY = {
    left: '/assets/images/riftbound/battlefields/_0000_Default180.png',
    right: '/assets/images/riftbound/battlefields/_0000_Default.png',
};

export const RIFTBOUND_BATTLEFIELDS_DECK_DISPLAY = {
    'default': { left: '/assets/images/riftbound/battlefields/_0000_Default180.png', right: '/assets/images/riftbound/battlefields/_0000_Default.png' },
    'Altar to Unity': { left: '/assets/images/riftbound/battlefields/_0000_Altar-to-Unity180.png', right: '/assets/images/riftbound/battlefields/_0024_Altar-to-Unity.png' },
    'Aspirant\'s Climb': { left: '/assets/images/riftbound/battlefields/_0001_Aspirant_s-Climb180.png', right: '/assets/images/riftbound/battlefields/_0025_Aspirant_s-Climb.png' },
    'Back-Alley Bar': { left: '/assets/images/riftbound/battlefields/_0002_Back-Alley-Bar180.png', right: '/assets/images/riftbound/battlefields/_0026_Back-Alley-Bar.png' },
    'Bandle Tree': { left: '/assets/images/riftbound/battlefields/_0003_Bandle-Tree180.png', right: '/assets/images/riftbound/battlefields/_0027_Bandle-Tree.png' },
    'Fortified Position': { left: '/assets/images/riftbound/battlefields/_0004_Fortified-Position180.png', right: '/assets/images/riftbound/battlefields/_0028_Fortified-Position.png' },
    'Grove of the God-Willow': { left: '/assets/images/riftbound/battlefields/_0005_Grove-of-the-God-Willow180.png', right: '/assets/images/riftbound/battlefields/_0029_Grove-of-the-God-Willow.png' },
    'Hallowed Tomb': { left: '/assets/images/riftbound/battlefields/_0006_Hallowed-Tomb180.png', right: '/assets/images/riftbound/battlefields/_0030_Hallowed-Tomb.png' },
    'Monastery of Hirana': { left: '/assets/images/riftbound/battlefields/_0007_Monastery-of-Hirana180.png', right: '/assets/images/riftbound/battlefields/_0031_Monastery-of-Hirana.png' },
    'Navori Fighting Pit': { left: '/assets/images/riftbound/battlefields/_0008_Navori-Fighting-Pit180.png', right: '/assets/images/riftbound/battlefields/_0032_Navori-Fighting-Pit.png' },
    'Obelisk of Power': { left: '/assets/images/riftbound/battlefields/_0009_Obelisk-of-Power180.png', right: '/assets/images/riftbound/battlefields/_0033_Obelisk-of-Power.png' },
    'Reaver\'s Row': { left: '/assets/images/riftbound/battlefields/_0010_Reaver_s-Row180.png', right: '/assets/images/riftbound/battlefields/_0034_Reaver_s-Row.png' },
    'Reckoner\'s Arena': { left: '/assets/images/riftbound/battlefields/_0011_Reckoner_s-Arena180.png', right: '/assets/images/riftbound/battlefields/_0035_Reckoner_s-Arena.png' },
    'Sigil of the Storm': { left: '/assets/images/riftbound/battlefields/_0012_Sigil-of-the-Storm180.png', right: '/assets/images/riftbound/battlefields/_0036_Sigil-of-the-Storm.png' },
    'Startipped Peak': { left: '/assets/images/riftbound/battlefields/_0013_Startipped-Peak180.png', right: '/assets/images/riftbound/battlefields/_0037_Startipped-Peak.png' },
    'Targon\'s Peak': { left: '/assets/images/riftbound/battlefields/_0014_Targon_s-Peak180.png', right: '/assets/images/riftbound/battlefields/_0038_Targon_s-Peak.png' },
    'The Arena\'s Greatest': { left: '/assets/images/riftbound/battlefields/_0015_The-Arena_s-Greatest180.png', right: '/assets/images/riftbound/battlefields/_0039_The-Arena_s-Greatest.png' },
    'The Dreaming Tree': { left: '/assets/images/riftbound/battlefields/_0016_The-Dreaming-Tree180.png', right: '/assets/images/riftbound/battlefields/_0040_The-Dreaming-Tree.png' },
    'The Grand Plaza': { left: '/assets/images/riftbound/battlefields/_0017_The-Grand-Plaza180.png', right: '/assets/images/riftbound/battlefields/_0041_The-Grand-Plaza.png' },
    'Trifarian War Camp': { left: '/assets/images/riftbound/battlefields/_0018_Trifarian-War-Camp180.png', right: '/assets/images/riftbound/battlefields/_0042_Trifarian-War-Camp.png' },
    'Vilemaw\'s Lair': { left: '/assets/images/riftbound/battlefields/_0019_Vilemaw_s-Lair180.png', right: '/assets/images/riftbound/battlefields/_0043_Vilemaw_s-Lair.png' },
    'Void Gate': { left: '/assets/images/riftbound/battlefields/_0020_Void-Gate180.png', right: '/assets/images/riftbound/battlefields/_0044_Void-Gate.png' },
    'Windswept Hillock': { left: '/assets/images/riftbound/battlefields/_0021_Windswept-Hillock180.png', right: '/assets/images/riftbound/battlefields/_0045_Windswept-Hillock.png' },
    'Zaun Warrens': { left: '/assets/images/riftbound/battlefields/_0022_Zaun-Warrens180.png', right: '/assets/images/riftbound/battlefields/_0046_Zaun-Warrens.png' },
    'The Candlelit Sanctum': { left: '/assets/images/riftbound/battlefields/_0023_The-Candlelit-Sanctum180.png', right: '/assets/images/riftbound/battlefields/_0047_The-Candlelit-Sanctum.png' },
    'Emperor\'s Dais': { left: '/assets/images/riftbound/battlefields/_0048_Emperor_s-Dais180.png', right: '/assets/images/riftbound/battlefields/_0072_Emperor_s-Dais.png' },
    'Forge of the Fluft': { left: '/assets/images/riftbound/battlefields/_0049_Forge-of-the-Fluft180.png', right: '/assets/images/riftbound/battlefields/_0073_Forge-of-the-Fluft.png' },
    'Forgotten Monument': { left: '/assets/images/riftbound/battlefields/_0050_Forgotten-Monument180.png', right: '/assets/images/riftbound/battlefields/_0074_Forgotten-Monument.png' },
    'Hall of Legends': { left: '/assets/images/riftbound/battlefields/_0051_Hall-of-Legends180.png', right: '/assets/images/riftbound/battlefields/_0075_Hall-of-Legends.png' },
    'Marai Spire': { left: '/assets/images/riftbound/battlefields/_0052_Marai-Spire180.png', right: '/assets/images/riftbound/battlefields/_0076_Marai-Spire.png' },
    'Minefield': { left: '/assets/images/riftbound/battlefields/_0053_Minefield180.png', right: '/assets/images/riftbound/battlefields/_0077_Minefield.png' },
    'Ornn\'s Forge': { left: '/assets/images/riftbound/battlefields/_0054_Ornn_s-Forge180.png', right: '/assets/images/riftbound/battlefields/_0078_Ornn_s-Forge.png' },
    'Power Nexus': { left: '/assets/images/riftbound/battlefields/_0055_Power-Nexus180.png', right: '/assets/images/riftbound/battlefields/_0079_Power-Nexus.png' },
    'Ravenbloom Conservatory': { left: '/assets/images/riftbound/battlefields/_0056_Ravenbloom-Conservatory180.png', right: '/assets/images/riftbound/battlefields/_0080_Ravenbloom-Conservatory.png' },
    'Rockfall Path': { left: '/assets/images/riftbound/battlefields/_0057_Rockfall-Path180.png', right: '/assets/images/riftbound/battlefields/_0081_Rockfall-Path.png' },
    'Seat of Power': { left: '/assets/images/riftbound/battlefields/_0058_Seat-of-Power180.png', right: '/assets/images/riftbound/battlefields/_0082_Seat-of-Power.png' },
    'Sunken Temple': { left: '/assets/images/riftbound/battlefields/_0059_Sunken-Temple180.png', right: '/assets/images/riftbound/battlefields/_0083_Sunken-Temple.png' },
    'The Papertree': { left: '/assets/images/riftbound/battlefields/_0060_The-Papertree180.png', right: '/assets/images/riftbound/battlefields/_0084_The-Papertree.png' },
    'Treasure Hoard': { left: '/assets/images/riftbound/battlefields/_0061_Treasure-Hoard180.png', right: '/assets/images/riftbound/battlefields/_0085_Treasure-Hoard.png' },
    'Veiled Temple': { left: '/assets/images/riftbound/battlefields/_0062_Veiled-Temple180.png', right: '/assets/images/riftbound/battlefields/_0086_Veiled-Temple.png' },
};

// ── LEGEND DESCRIPTIONS ─────────────────────────────────────────────────────
export const RIFTBOUND_LEGENDS_DESCRIPTIONS = {
    'default': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0000_default.png',
    'Kai\'sa': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0001_Kaisa, Daughter of the Void.png',
    'Volibear': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0002_Volibear, Relentless Storm.png',
    'Sett': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0003_Sett, The Boss.png',
    'Viktor': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0004_Viktor, Herald of the Arcane.png',
    'Teemo': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0005_Teemo, Swift Scout.png',
    'Leona': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0006_Leona, Radiant Dawn.png',
    'Yasuo': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0007_Yasuo, Unforgiven.png',
    'Yas': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0007_Yasuo, Unforgiven.png',
    'Lee Sin': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0008_Lee Sin, Blind Monk.png',
    'Ahri': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0009_Ahri, Nine-Tailed Fox.png',
    'Darius': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0010_Darius, Hand of Noxus.png',
    'Jinx': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0011_Jinx, Loose Cannon.png',
    'Miss Fortune': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0012_Miss Fortune, Bounty Hunter.png',
    'Garen': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0013_Garen, Might of Demacia.png',
    'Lux': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0014_Lux, Lady of Luminosity.png',
    'Annie': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0015_Annie, Dark Child.png',
    'Master Yi': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0016_Master Yi, Wuju Bladesman.png',
    'Rumble': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0017_Rumble, Mechanized Menace.png',
    'Lucian': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0018_Lucian, Purifier.png',
    'Draven': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0019_Draven, Glorious Executioner.png',
    'Rek\'Sai': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0020_Reksai, Void Burrower.png',
    'Ornn': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0021_Ornn, Fire Below the Mountain.png',
    'Jax': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0022_Jax, Grandmaster at Arms.png',
    'Irelia': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0023_Irelia, Blade Dancer.png',
    'Azir': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0024_Azir, Emperor of the Sands.png',
    'Ezreal': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0025_Ezreal, Prodigal Explorer.png',
    'Renata Glasc': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0026_Renata Glasc, Chem-Baroness.png',
    'Sivir': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0027_Sivir, Battle Mistress.png',
    'Fiora': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0028_Fiora, Grand Duelist.png',
};

// ── LEGEND CARD FRAMES (mp4) ────────────────────────────────────────────────
export const RIFTBOUND_LEGENDS_CARD_FRAMES = {
    'Kai\'sa': '/assets/animations/riftbound/cards/kaisa-card-frame.mp4',
};

// ── LEGEND PORTRAITS (scoreboard) ───────────────────────────────────────────
const _RB_PORTRAIT = (filename) => {
    const p = `/assets/images/riftbound/scoreboard/legend-portraits/legend-portraits-default-1v1/${filename}`;
    return { left: p, right: p };
};

export const RIFTBOUND_LEGENDS_DEFAULT = {
    left: '/assets/images/riftbound/scoreboard/legend-portraits/legend-portraits-tes-1v1/LegendPortrait_0000_Default.png',
    right: '/assets/images/riftbound/scoreboard/legend-portraits/legend-portraits-tes-1v1/LegendPortrait_0000_F_Default.png'
};

export const RIFTBOUND_LEGENDS = {
    'Ahri':          _RB_PORTRAIT('In-Game_0026_Ahri.png'),
    'Annie':         _RB_PORTRAIT('In-Game_0027_Annie.png'),
    'Azir':          _RB_PORTRAIT('In-Game_0002_Azir.png'),
    'Darius':        _RB_PORTRAIT('In-Game_0024_Darius.png'),
    'Draven':        _RB_PORTRAIT('In-Game_0005_Draven.png'),
    'Ezreal':        _RB_PORTRAIT('In-Game_0004_Ezreal.png'),
    'Fiora':         _RB_PORTRAIT('In-Game_0006_Fiora.png'),
    'Garen':         _RB_PORTRAIT('In-Game_0023_Garen.png'),
    'Irelia':        _RB_PORTRAIT('In-Game_0007_Irelia.png'),
    'Jax':           _RB_PORTRAIT('In-Game_0009_Jax.png'),
    'Jinx':          _RB_PORTRAIT('In-Game_0022_Jinx.png'),
    'Kai\'sa':       _RB_PORTRAIT("In-Game_0021_Kai'sa.png"),
    'Lee Sin':       _RB_PORTRAIT('In-Game_0020_Lee-Sin.png'),
    'Leona':         _RB_PORTRAIT('In-Game_0025_Leona.png'),
    'Lucian':        _RB_PORTRAIT('In-Game_0011_Lucian.png'),
    'Lux':           _RB_PORTRAIT('In-Game_0017_Lux.png'),
    'Master Yi':     _RB_PORTRAIT('In-Game_0019_Master-Yi.png'),
    'Miss Fortune':  _RB_PORTRAIT('In-Game_0018_Miss-Fortune.png'),
    'Ornn':          _RB_PORTRAIT('In-Game_0001_Ornn.png'),
    'Rek\'Sai':      _RB_PORTRAIT('In-Game_0003_Reksai.png'),
    'Renata Glasc':  _RB_PORTRAIT('In-Game_0008_Renata-Glasc.png'),
    'Rumble':        _RB_PORTRAIT('In-Game_0000_Rumble.png'),
    'Sett':          _RB_PORTRAIT('In-Game_0016_Sett.png'),
    'Sivir':         _RB_PORTRAIT('In-Game_0010_Sivir.png'),
    'Teemo':         _RB_PORTRAIT('In-Game_0015_Teemo.png'),
    'Viktor':        _RB_PORTRAIT('In-Game_0013_Viktor.png'),
    'Volibear':      _RB_PORTRAIT('In-Game_0012_Volibear.png'),
    'Yasuo':         _RB_PORTRAIT('In-Game_0014_Yasuo.png'),
};

// ── LEGEND ANIMATIONS ───────────────────────────────────────────────────────
export const RIFTBOUND_LEGEND_ANIMATIONS = {
    'Kai\'sa': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0001_P_Kai_sa, Daughter of the Void.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0001_L_Kai_sa, Daughter of the Void.mp4'
    },
    'Volibear': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0002_P_Volibear, Relentless Storm.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0002_L_Volibear, Relentless Storm.mp4'
    },
    'Viktor': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0004_P_Viktor, Herald of the Arcane.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0004_L_Viktor, Herald of the Arcane.mp4'
    },
    'Leona': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0006_P_Leona, Radiant Dawn.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0006_L_Leona, Radiant Dawn.mp4'
    },
    'Lee Sin': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0008_P_Lee Sin, Blind Monk.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0008_L_Lee Sin, Blind Monk.mp4'
    },
    'Ahri': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0009_P_Ahri, Nine-Tailed Fox.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0009_L_Ahri, Nine-Tailed Fox.mp4'
    },
    'Darius': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0010_P_Darius, Hand of Noxus.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0010_L_Darius, Hand of Noxus.mp4'
    },
    'Jinx': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0011_P_Jinx, Loose Cannon.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0011_L_Jinx, Loose Cannon.mp4'
    },
    'Miss Fortune': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0012_P_Miss Fortune, Bounty Hunter.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0012_L_Miss Fortune, Bounty Hunter.mp4'
    },
    'Garen': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0013_P_Garen, Might of Demacia.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0013_L_Garen, Might of Demacia.mp4'
    },
    'Lux': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0014_P_Lux, Lady of Luminosity.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0014_L_Lux, Lady of Luminosity.mp4'
    },
    'Annie': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0015_P_Annie, Dark Child.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0015_L_Annie, Dark Child.mp4'
    },
    'Yi': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0016_P_Master Yi, Wuju Bladesman.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0016_L_Master Yi, Wuju Bladesman.mp4'
    },
    'Yasuo': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0007_P_Yasuo, Unforgiven.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0007_L_Yasuo, Unforgiven.mp4'
    },
    'Sett': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0003_P_Sett, The Boss.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0003_L_Sett, The Boss.mp4'
    },
    'Teemo': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0005_P_Teemo, Swift Scout.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0005_L_Teemo, Swift Scout.mp4'
    }
};
