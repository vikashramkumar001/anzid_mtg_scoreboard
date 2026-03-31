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
    // Origins
    'Altar to Unity', 'Aspirant\'s Climb', 'Back-Alley Bar', 'Bandle Tree',
    'Fortified Position', 'Grove of the God-Willow', 'Hallowed Tomb',
    'Monastery of Hirana', 'Navori Fighting Pit', 'Obelisk of Power',
    'Reaver\'s Row', 'Reckoner\'s Arena', 'Sigil of the Storm',
    'Startipped Peak', 'Targon\'s Peak', 'The Arena\'s Greatest',
    'The Candlelit Sanctum', 'The Dreaming Tree', 'The Grand Plaza',
    'Trifarian War Camp', 'Vilemaw\'s Lair', 'Void Gate',
    'Windswept Hillock', 'Zaun Warrens',
    // Spiritforged
    'Emperor\'s Dais', 'Forge of the Fluft', 'Forgotten Monument',
    'Hall of Legends', 'Marai Spire', 'Minefield',
    'Ornn\'s Forge', 'Power Nexus', 'Ravenbloom Conservatory',
    'Rockfall Path', 'Seat of Power', 'Sunken Temple',
    'The Papertree', 'Treasure Hoard', 'Veiled Temple',
    // Unleashed
    'Baron Pit', 'Black Flame Altar', 'Brush', 'Dusk Rose Lab',
    'Forbidding Waste', 'Forgotten Library', 'Frozen Fortress', 'Gardens of Becoming',
    'Ripper\'s Bay', 'The Academy', 'Trapping Grounds', 'Vaults of Helia'
];

// ── BATTLEFIELD PATHS: SCOREBOARD & BROADCAST ───────────────────────────────
// Both scoreboard and broadcast-round-main-deck use battlefields-default-1v1/{name}.png
export const RIFTBOUND_BATTLEFIELDS_BASE = '/assets/images/riftbound/battlefields/battlefields-default-1v1';

// ── LEGEND DESCRIPTIONS ─────────────────────────────────────────────────────
export const RIFTBOUND_LEGENDS_DESCRIPTIONS = {
    'default': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0000_default.png',
    // Origins
    'Kai\'Sa, Daughter of the Void': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0001_Kaisa, Daughter of the Void.png',
    'Volibear, Relentless Storm': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0002_Volibear, Relentless Storm.png',
    'Sett, The Boss': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0003_Sett, The Boss.png',
    'Viktor, Herald of the Arcane': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0004_Viktor, Herald of the Arcane.png',
    'Teemo, Swift Scout': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0005_Teemo, Swift Scout.png',
    'Leona, Radiant Dawn': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0006_Leona, Radiant Dawn.png',
    'Yasuo, Unforgiven': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0007_Yasuo, Unforgiven.png',
    'Lee Sin, Blind Monk': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0008_Lee Sin, Blind Monk.png',
    'Ahri, Nine-Tailed Fox': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0009_Ahri, Nine-Tailed Fox.png',
    'Darius, Hand of Noxus': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0010_Darius, Hand of Noxus.png',
    'Jinx, Loose Cannon': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0011_Jinx, Loose Cannon.png',
    'Miss Fortune, Bounty Hunter': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0012_Miss Fortune, Bounty Hunter.png',
    'Garen, Might of Demacia': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0013_Garen, Might of Demacia.png',
    'Lux, Lady of Luminosity': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0014_Lux, Lady of Luminosity.png',
    'Annie, Dark Child': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0015_Annie, Dark Child.png',
    'Master Yi, Wuju Bladesman': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0016_Master Yi, Wuju Bladesman.png',
    // Spiritforged
    'Rumble, Mechanized Menace': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0017_Rumble, Mechanized Menace.png',
    'Lucian, Purifier': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0018_Lucian, Purifier.png',
    'Draven, Glorious Executioner': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0019_Draven, Glorious Executioner.png',
    'Rek\'Sai, Void Burrower': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0020_Reksai, Void Burrower.png',
    'Ornn, Fire Below the Mountain': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0021_Ornn, Fire Below the Mountain.png',
    'Jax, Grandmaster at Arms': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0022_Jax, Grandmaster at Arms.png',
    'Irelia, Blade Dancer': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0023_Irelia, Blade Dancer.png',
    'Azir, Emperor of the Sands': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0024_Azir, Emperor of the Sands.png',
    'Ezreal, Prodigal Explorer': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0025_Ezreal, Prodigal Explorer.png',
    'Renata Glasc, Chem-Baroness': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0026_Renata Glasc, Chem-Baroness.png',
    'Sivir, Battle Mistress': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0027_Sivir, Battle Mistress.png',
    'Fiora, Grand Duelist': '/assets/images/riftbound/decklist/legend-descriptions/LegendText_0028_Fiora, Grand Duelist.png',
    // Unleashed (assets pending)
    'Diana, Scorn of the Moon': null,
    'Ivern, Green Father': null,
    'Jhin, Virtuoso': null,
    'Kha\'Zix, Voidreaver': null,
    'LeBlanc, Deceiver': null,
    'Lillia, Bashful Bloom': null,
    'Master Yi, Wuju Master': null,
    'Poppy, Keeper of the Hammer': null,
    'Pyke, Bloodharbor Ripper': null,
    'Rengar, Pridestalker': null,
    'Vex, Gloomist': null,
    'Vi, Piltover Enforcer': null,
};

// ── DROPDOWN LISTS (for master control) ────────────────────────────────────
// Derived from existing constants — single source of truth
export const RIFTBOUND_LEGENDS_LIST = Object.keys(RIFTBOUND_LEGENDS_DESCRIPTIONS)
    .filter(k => k !== 'default')
    .map(name => ({name}));

export const RIFTBOUND_BATTLEFIELDS_LIST = RIFTBOUND_BATTLEFIELD_NAMES.map(name => ({name}));

export const RIFTBOUND_CHAMPIONS_LIST = [
    // Origins
    "Kai'sa, Survivor", "Kai'sa, Evolutionary",
    "Volibear, Furious", "Volibear, Imposing",
    "Jinx, Demolitionist", "Jinx, Rebel",
    "Darius, Trifarian", "Darius, Executioner",
    "Ahri, Alluring", "Ahri, Inquisitive",
    "Lee Sin, Ascetic", "Lee Sin, Centered",
    "Yasuo, Remorseful", "Yasuo, Windrider",
    "Leona, Determined", "Leona, Zealot",
    "Teemo, Strategist", "Teemo, Scout",
    "Viktor, Innovator", "Viktor, Leader",
    "Miss Fortune, Captain", "Miss Fortune, Buccaneer",
    "Sett, Brawler", "Sett, Kingpin",
    // Proving Grounds
    "Annie, Fiery", "Annie, Stubborn",
    "Master Yi, Meditative", "Master Yi, Honed",
    "Lux, Illuminated", "Lux, Crownguard",
    "Garen, Rugged", "Garen, Commander",
    // Spiritforged
    "Rumble, Hotheaded", "Rumble, Scrapper",
    "Lucian, Gunslinger", "Lucian, Merciless",
    "Draven, Vanquisher", "Draven, Audacious", "Draven, Showboat",
    "Rek'sai, Breacher", "Rek'sai, Swarm Queen",
    "Ornn, Blacksmith", "Ornn, Forge God",
    "Jax, Unrelenting", "Jax, Unmatched",
    "Irelia, Graceful", "Irelia, Fervent",
    "Azir, Ascendant", "Azir, Sovereign",
    "Ezreal, Prodigy", "Ezreal, Dashing",
    "Renata Glasc, Mastermind", "Renata Glasc, Industrialist",
    "Sivir, Ambitious", "Sivir, Mercenary",
    "Fiora, Worthy", "Fiora, Peerless", "Fiora, Victorious",
    // Unleashed
    "Diana, Lunari", "Diana, No Longer Human",
    "Ivern, Friend to All", "Ivern, Nurturer",
    "Jhin, Meticulous Killer", "Jhin, Murderous Artist",
    "Kha'Zix, Evolving Hunter", "Kha'Zix, Mutating Horror",
    "LeBlanc, Everywhere at Once",
    "Lillia, Protector of Dreams",
    "Master Yi, Tempered", "Master Yi, Unstoppable",
    "Pyke, Dockside Butcher", "Pyke, Returned",
    "Rengar, Trophy Hunter", "Rengar, Unseen", "Rengar, Pouncing",
    "Vi, Hotheaded", "Vi, Peacekeeper", "Vi, Destructive",
    "Poppy, Defender of the Meek", "Poppy, Paragon",
    "Vex, Cheerless",
].map(name => ({name}));

// ── LEGEND CARD FRAMES (mp4) ────────────────────────────────────────────────
export const RIFTBOUND_LEGENDS_CARD_FRAMES = {
    'Kai\'Sa, Daughter of the Void': '/assets/animations/riftbound/cards/Kai\'Sa, Daughter of the Void - Card Frame.mp4',
    'Draven, Glorious Executioner': '/assets/animations/riftbound/cards/Draven, Glorious Executioner - Card Frame.mp4',
    'Ezreal, Prodigal Explorer': '/assets/animations/riftbound/cards/Ezreal, Prodigal Explorer - Card Frame.mp4',
    'Fiora, Grand Duelist': '/assets/animations/riftbound/cards/Fiora, Grand Duelist - Card Frame.mp4',
    'Irelia, Blade Dancer': '/assets/animations/riftbound/cards/Irelia, Blade Dancer - Card Frame.mp4',
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
    // Origins
    'Ahri, Nine-Tailed Fox':           _RB_PORTRAIT('In-Game_0026_Ahri.png'),
    'Annie, Dark Child':               _RB_PORTRAIT('In-Game_0027_Annie.png'),
    'Darius, Hand of Noxus':           _RB_PORTRAIT('In-Game_0024_Darius.png'),
    'Garen, Might of Demacia':         _RB_PORTRAIT('In-Game_0023_Garen.png'),
    'Jinx, Loose Cannon':              _RB_PORTRAIT('In-Game_0022_Jinx.png'),
    'Kai\'Sa, Daughter of the Void':   _RB_PORTRAIT("In-Game_0021_Kai'sa.png"),
    'Lee Sin, Blind Monk':             _RB_PORTRAIT('In-Game_0020_Lee-Sin.png'),
    'Leona, Radiant Dawn':             _RB_PORTRAIT('In-Game_0025_Leona.png'),
    'Lux, Lady of Luminosity':         _RB_PORTRAIT('In-Game_0017_Lux.png'),
    'Master Yi, Wuju Bladesman':       _RB_PORTRAIT('In-Game_0019_Master-Yi.png'),
    'Miss Fortune, Bounty Hunter':     _RB_PORTRAIT('In-Game_0018_Miss-Fortune.png'),
    'Sett, The Boss':                  _RB_PORTRAIT('In-Game_0016_Sett.png'),
    'Teemo, Swift Scout':              _RB_PORTRAIT('In-Game_0015_Teemo.png'),
    'Viktor, Herald of the Arcane':    _RB_PORTRAIT('In-Game_0013_Viktor.png'),
    'Volibear, Relentless Storm':      _RB_PORTRAIT('In-Game_0012_Volibear.png'),
    'Yasuo, Unforgiven':               _RB_PORTRAIT('In-Game_0014_Yasuo.png'),
    // Spiritforged
    'Azir, Emperor of the Sands':      _RB_PORTRAIT('In-Game_0002_Azir.png'),
    'Draven, Glorious Executioner':    _RB_PORTRAIT('In-Game_0005_Draven.png'),
    'Ezreal, Prodigal Explorer':       _RB_PORTRAIT('In-Game_0004_Ezreal.png'),
    'Fiora, Grand Duelist':            _RB_PORTRAIT('In-Game_0006_Fiora.png'),
    'Irelia, Blade Dancer':            _RB_PORTRAIT('In-Game_0007_Irelia.png'),
    'Jax, Grandmaster at Arms':        _RB_PORTRAIT('In-Game_0009_Jax.png'),
    'Lucian, Purifier':                _RB_PORTRAIT('In-Game_0011_Lucian.png'),
    'Ornn, Fire Below the Mountain':   _RB_PORTRAIT('In-Game_0001_Ornn.png'),
    'Rek\'Sai, Void Burrower':         _RB_PORTRAIT('In-Game_0003_Reksai.png'),
    'Renata Glasc, Chem-Baroness':     _RB_PORTRAIT('In-Game_0008_Renata-Glasc.png'),
    'Rumble, Mechanized Menace':       _RB_PORTRAIT('In-Game_0000_Rumble.png'),
    'Sivir, Battle Mistress':          _RB_PORTRAIT('In-Game_0010_Sivir.png'),
    // Unleashed (assets pending)
    'Diana, Scorn of the Moon':        null,
    'Ivern, Green Father':             null,
    'Jhin, Virtuoso':                  null,
    'Kha\'Zix, Voidreaver':            null,
    'LeBlanc, Deceiver':               null,
    'Lillia, Bashful Bloom':           null,
    'Master Yi, Wuju Master':          null,
    'Poppy, Keeper of the Hammer':     null,
    'Pyke, Bloodharbor Ripper':        null,
    'Rengar, Pridestalker':            null,
    'Vex, Gloomist':                   null,
    'Vi, Piltover Enforcer':           null,
};

// ── LEGEND ANIMATIONS ───────────────────────────────────────────────────────
export const RIFTBOUND_LEGEND_ANIMATIONS = {
    // Origins
    'Kai\'Sa, Daughter of the Void': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0001_P_Kai_sa, Daughter of the Void.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0001_L_Kai_sa, Daughter of the Void.mp4'
    },
    'Volibear, Relentless Storm': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0002_P_Volibear, Relentless Storm.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0002_L_Volibear, Relentless Storm.mp4'
    },
    'Sett, The Boss': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0003_P_Sett, The Boss.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0003_L_Sett, The Boss.mp4'
    },
    'Viktor, Herald of the Arcane': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0004_P_Viktor, Herald of the Arcane.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0004_L_Viktor, Herald of the Arcane.mp4'
    },
    'Teemo, Swift Scout': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0005_P_Teemo, Swift Scout.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0005_L_Teemo, Swift Scout.mp4'
    },
    'Leona, Radiant Dawn': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0006_P_Leona, Radiant Dawn.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0006_L_Leona, Radiant Dawn.mp4'
    },
    'Yasuo, Unforgiven': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0007_P_Yasuo, Unforgiven.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0007_L_Yasuo, Unforgiven.mp4'
    },
    'Lee Sin, Blind Monk': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0008_P_Lee Sin, Blind Monk.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0008_L_Lee Sin, Blind Monk.mp4'
    },
    'Ahri, Nine-Tailed Fox': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0009_P_Ahri, Nine-Tailed Fox.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0009_L_Ahri, Nine-Tailed Fox.mp4'
    },
    'Darius, Hand of Noxus': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0010_P_Darius, Hand of Noxus.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0010_L_Darius, Hand of Noxus.mp4'
    },
    'Jinx, Loose Cannon': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0011_P_Jinx, Loose Cannon.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0011_L_Jinx, Loose Cannon.mp4'
    },
    'Miss Fortune, Bounty Hunter': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0012_P_Miss Fortune, Bounty Hunter.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0012_L_Miss Fortune, Bounty Hunter.mp4'
    },
    'Garen, Might of Demacia': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0013_P_Garen, Might of Demacia.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0013_L_Garen, Might of Demacia.mp4'
    },
    'Lux, Lady of Luminosity': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0014_P_Lux, Lady of Luminosity.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0014_L_Lux, Lady of Luminosity.mp4'
    },
    'Annie, Dark Child': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0015_P_Annie, Dark Child.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0015_L_Annie, Dark Child.mp4'
    },
    'Master Yi, Wuju Bladesman': {
        portrait: '/assets/animations/riftbound/6-Animations/LegendAnimation_0016_P_Master Yi, Wuju Bladesman.mp4',
        landscape: '/assets/animations/riftbound/6-Animations/LegendAnimation_0016_L_Master Yi, Wuju Bladesman.mp4'
    },
};
