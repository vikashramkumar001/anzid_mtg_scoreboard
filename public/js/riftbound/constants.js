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
    'Abandoned Hall', 'Altar of Blood', 'Amateur Recital', 'Baron Pit',
    'Black Flame Altar', 'Brush', 'Dusk Rose Lab', 'Forbidding Waste',
    'Forgotten Library', 'Frozen Fortress', 'Gardens of Becoming',
    'Ripper\'s Bay', 'Star Spring', 'The Academy', 'Trapping Grounds',
    'Valley of Idols', 'Vaults of Helia',
    // Vendetta
    'Dragon Roost', 'Heisho, Shell of the World', 'Kinkou Temple',
    'Mystic Vortex', 'Piltovan Forge', 'Protective Sands', 'Risen Altar',
    'Sandswept Tomb', 'Shadow Temple', 'Threshold of the Gray'
];

// ── BATTLEFIELD PATHS: SCOREBOARD & BROADCAST ───────────────────────────────
// Both scoreboard and broadcast-round-main-deck use battlefields-default-1v1/{name}.png
export const RIFTBOUND_BATTLEFIELDS_BASE = '/assets/images/riftbound/shared/battlefields';

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
    // Vendetta (assets pending)
    'Akali, Rogue Assassin': null,
    'Ambessa, Matriarch of War': null,
    'Jayce, Defender of Tomorrow': null,
    'Kennen, Heart of the Tempest': null,
    'Mel, Soul\'s Reflection': null,
    'Nasus, Curator of the Sands': null,
    'Renekton, Butcher of the Sands': null,
    'Shen, Eye of Twilight': null,
    'Zed, Master of Shadows': null,
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
    "LeBlanc, Everywhere at Once", "LeBlanc, Fragmented",
    "Lillia, Protector of Dreams", "Lillia, Fae Fawn",
    "Master Yi, Tempered", "Master Yi, Unstoppable",
    "Pyke, Dockside Butcher", "Pyke, Returned",
    "Rengar, Trophy Hunter", "Rengar, Unseen", "Rengar, Pouncing",
    "Vi, Hotheaded", "Vi, Peacekeeper", "Vi, Destructive",
    "Poppy, Defender of the Meek", "Poppy, Paragon",
    "Vex, Cheerless", "Vex, Apathetic", "Vex, Mocking",
    // Vendetta
    "Akali, Deadly Weapon", "Akali, Silent",
    "Ambessa, Respected and Feared", "Ambessa, The Wolf",
    "Jayce, Brilliant Inventor", "Jayce, Hammer in Hand",
    "Kennen, Keeper of Balance", "Kennen, Storm of Shuriken",
    "Mel, Defiant Soul", "Mel, Newly Awakened",
    "Nasus, Ascended", "Nasus, Guardian of Knowledge",
    "Renekton, Brute", "Renekton, Rage Fueled",
    "Shen, Leader of the Kinkou Order", "Shen, Scourge of Shadows",
    "Zed, From the Shadows", "Zed, Without a Sound",
].map(name => ({name}));

// ── LEGEND CARD FRAMES (mp4) ────────────────────────────────────────────────
export const RIFTBOUND_LEGENDS_CARD_FRAMES = {
    'Kai\'Sa, Daughter of the Void': '/assets/animations/riftbound/cards/Kai\'Sa, Daughter of the Void - Card Frame.mp4',
    'Draven, Glorious Executioner': '/assets/animations/riftbound/cards/draven.mp4',
    'Ezreal, Prodigal Explorer': '/assets/animations/riftbound/cards/EZREAL.mp4',
    'Fiora, Grand Duelist': '/assets/animations/riftbound/cards/fiora.mp4',
    'Irelia, Blade Dancer': '/assets/animations/riftbound/cards/irelia.mp4',
};

// ── LEGEND PORTRAITS (scoreboard + standings) ──────────────────────────────
const PORTRAIT_BASE = '/assets/images/riftbound/shared/legend-portraits/legend-portraits-251x124';

const _RB_PORTRAIT = (num, legendName) => {
    const p = `${PORTRAIT_BASE}/251x124_${num}_${legendName}.png`;
    return { left: p, right: p };
};

export const RIFTBOUND_LEGENDS_DEFAULT = {
    left: '/assets/images/riftbound/shared/legend-portraits/legend-portraits-tes-1v1/LegendPortrait_0000_Default.png',
    right: '/assets/images/riftbound/shared/legend-portraits/legend-portraits-tes-1v1/LegendPortrait_0000_F_Default.png'
};

export const RIFTBOUND_LEGENDS = {
    // Origins Starter (OGS)
    'Annie, Dark Child':               _RB_PORTRAIT('0001', 'Annie, Dark Child'),
    'Master Yi, Wuju Bladesman':       _RB_PORTRAIT('0002', 'Master Yi, Wuju Bladesman'),
    'Lux, Lady of Luminosity':         _RB_PORTRAIT('0003', 'Lux, Lady of Luminosity'),
    'Garen, Might of Demacia':         _RB_PORTRAIT('0004', 'Garen, Might of Demacia'),
    // Origins (OGN)
    'Kai\'Sa, Daughter of the Void':   _RB_PORTRAIT('0005', "Kai'Sa, Daughter of the Void"),
    'Volibear, Relentless Storm':      _RB_PORTRAIT('0006', 'Volibear, Relentless Storm'),
    'Jinx, Loose Cannon':              _RB_PORTRAIT('0007', 'Jinx, Loose Cannon'),
    'Darius, Hand of Noxus':           _RB_PORTRAIT('0008', 'Darius, Hand of Noxus'),
    'Ahri, Nine-Tailed Fox':           _RB_PORTRAIT('0009', 'Ahri, Nine-Tailed Fox'),
    'Lee Sin, Blind Monk':             _RB_PORTRAIT('0010', 'Lee Sin, Blind Monk'),
    'Yasuo, Unforgiven':               _RB_PORTRAIT('0011', 'Yasuo, Unforgiven'),
    'Leona, Radiant Dawn':             _RB_PORTRAIT('0012', 'Leona, Radiant Dawn'),
    'Teemo, Swift Scout':              _RB_PORTRAIT('0013', 'Teemo, Swift Scout'),
    'Viktor, Herald of the Arcane':    _RB_PORTRAIT('0014', 'Viktor, Herald of the Arcane'),
    'Miss Fortune, Bounty Hunter':     _RB_PORTRAIT('0015', 'Miss Fortune, Bounty Hunter'),
    'Sett, The Boss':                  _RB_PORTRAIT('0016', 'Sett, The Boss'),
    // Spiritforged (SFD)
    'Rumble, Mechanized Menace':       _RB_PORTRAIT('0017', 'Rumble, Mechanized Menace'),
    'Lucian, Purifier':                _RB_PORTRAIT('0018', 'Lucian, Purifier'),
    'Draven, Glorious Executioner':    _RB_PORTRAIT('0019', 'Draven, Glorious Executioner'),
    'Rek\'Sai, Void Burrower':         _RB_PORTRAIT('0020', "Rek'Sai, Void Burrower"),
    'Ornn, Fire Below the Mountain':   _RB_PORTRAIT('0021', 'Ornn, Fire Below the Mountain'),
    'Jax, Grandmaster at Arms':        _RB_PORTRAIT('0022', 'Jax, Grandmaster at Arms'),
    'Irelia, Blade Dancer':            _RB_PORTRAIT('0023', 'Irelia, Blade Dancer'),
    'Azir, Emperor of the Sands':      _RB_PORTRAIT('0024', 'Azir, Emperor of the Sands'),
    'Ezreal, Prodigal Explorer':       _RB_PORTRAIT('0025', 'Ezreal, Prodigal Explorer'),
    'Renata Glasc, Chem-Baroness':     _RB_PORTRAIT('0026', 'Renata Glasc, Chem-Baroness'),
    'Sivir, Battle Mistress':          _RB_PORTRAIT('0027', 'Sivir, Battle Mistress'),
    'Fiora, Grand Duelist':            _RB_PORTRAIT('0028', 'Fiora, Grand Duelist'),
    // Unleashed (UNL)
    'Jhin, Virtuoso':                  _RB_PORTRAIT('0029', 'Jhin, Virtuoso'),
    'Rengar, Pridestalker':            _RB_PORTRAIT('0030', 'Rengar, Pridestalker'),
    'Pyke, Bloodharbor Ripper':        _RB_PORTRAIT('0031', 'Pyke, Bloodharbor Ripper'),
    'Vi, Piltover Enforcer':           _RB_PORTRAIT('0032', 'Vi, Piltover Enforcer'),
    'Lillia, Bashful Bloom':           _RB_PORTRAIT('0033', 'Lillia, Bashful Bloom'),
    'Master Yi, Wuju Master':          _RB_PORTRAIT('0034', 'Master Yi, Wuju Master'),
    'Vex, Gloomist':                   _RB_PORTRAIT('0035', 'Vex, Gloomist'),
    'Ivern, Green Father':             _RB_PORTRAIT('0036', 'Ivern, Green Father'),
    'Diana, Scorn of the Moon':        _RB_PORTRAIT('0037', 'Diana, Scorn of the Moon'),
    'LeBlanc, Deceiver':               _RB_PORTRAIT('0038', 'LeBlanc, Deceiver'),
    'Kha\'Zix, Voidreaver':            _RB_PORTRAIT('0039', "Kha'Zix, Voidreaver"),
    'Poppy, Keeper of the Hammer':     _RB_PORTRAIT('0040', 'Poppy, Keeper of the Hammer'),
    // Vendetta (VEN) — indexes 0041-0049 in collector order (VEN-139..155)
    'Akali, Rogue Assassin':           _RB_PORTRAIT('0041', 'Akali, Rogue Assassin'),
    'Renekton, Butcher of the Sands':  _RB_PORTRAIT('0042', 'Renekton, Butcher of the Sands'),
    'Zed, Master of Shadows':          _RB_PORTRAIT('0043', 'Zed, Master of Shadows'),
    'Nasus, Curator of the Sands':     _RB_PORTRAIT('0044', 'Nasus, Curator of the Sands'),
    'Shen, Eye of Twilight':           _RB_PORTRAIT('0045', 'Shen, Eye of Twilight'),
    'Jayce, Defender of Tomorrow':     _RB_PORTRAIT('0046', 'Jayce, Defender of Tomorrow'),
    'Mel, Soul\'s Reflection':         _RB_PORTRAIT('0047', "Mel, Soul's Reflection"),
    'Ambessa, Matriarch of War':       _RB_PORTRAIT('0048', 'Ambessa, Matriarch of War'),
    'Kennen, Heart of the Tempest':    _RB_PORTRAIT('0049', 'Kennen, Heart of the Tempest'),
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

// ── PORTRAIT FOCUS ──────────────────────────────────────────────────────────
// Per-legend focus point — where the face sits within the 1200×1200 master
// portrait, expressed as percentages from the top-left corner. This is the
// SHARED tuning data: the metagame pie chart and the standings row portraits
// both consume these values so faces stay framed the same way across views.
//
// Tune via `debugFocus()` in the broadcast-metagame.js page (drag/click the
// crosshair overlay). Whatever you save here propagates to:
//   - Metagame pie portraits (via getPortraitFocus in broadcast-metagame.js)
//   - Standings row portraits (via PORTRAIT_FOCUS import in
//     broadcast-round-standings-combined.js — it converts top% to a 251×50
//     object-position based on the cover-fit math)
//
// Adding a new legend? Tune once in the metagame debug overlay and paste
// the resulting line into this map. Both views pick it up automatically.
//
// Format: top% / left% are 0-100 (image coordinates). scale (optional)
// is a metagame-only zoom factor — the standings ignore it because the
// row's 251×50 box has fixed dimensions. heroScale (optional, default 1.0)
// sizes the metagame CENTRAL figure only — bump it above 1 for full-body
// poses (small face in a tall frame, e.g. Lux) so the #1 legend's face
// matches a tight crouch like Master Yi; nothing else uses it.
export const RIFTBOUND_PORTRAIT_FOCUS = {
    'Annie, Dark Child':                       { top: 18, left: 51, heroScale: 1.2 },
    'Master Yi, Wuju Bladesman':               { top: 17, left: 40, heroScale: 1.6 },
    'Lux, Lady of Luminosity':                 { top: 9,  left: 59, heroScale: 2.0 },
    'Garen, Might of Demacia':                 { top: 36, left: 37, heroScale: 1.6 },
    "Kai'Sa, Daughter of the Void":            { top: 21, left: 71, heroScale: 1.7 },
    'Volibear, Relentless Storm':              { top: 12, left: 50, heroScale: 1.7 },
    'Jinx, Loose Cannon':                      { top: 15, left: 52, heroScale: 1.4 },
    'Darius, Hand of Noxus':                   { top: 25, left: 46, heroScale: 1.3 },
    'Ahri, Nine-Tailed Fox':                   { top: 30, left: 48, heroScale: 1.9 },
    'Lee Sin, Blind Monk':                     { top: 23, left: 49, heroScale: 1.5 },
    'Yasuo, Unforgiven':                       { top: 19, left: 55, heroScale: 1.45 },
    'Leona, Radiant Dawn':                     { top: 14, left: 38, heroScale: 1.45 },
    'Teemo, Swift Scout':                      { top: 35, left: 41, heroScale: 1.7 },
    'Viktor, Herald of the Arcane':            { top: 37, left: 46, heroScale: 1.9 },
    'Miss Fortune, Bounty Hunter':             { top: 24, left: 60, heroScale: 1.45 },
    'Sett, The Boss':                          { top: 14, left: 50, heroScale: 1.5 },
    'Rumble, Mechanized Menace':               { top: 39, left: 51, heroScale: 1.6 },
    'Lucian, Purifier':                        { top: 13, left: 43, heroScale: 2.0 },
    'Draven, Glorious Executioner':            { top: 20, left: 55, heroScale: 1.3 },
    "Rek'Sai, Void Burrower":                  { top: 16, left: 51, heroScale: 1.4 },
    'Ornn, Fire Below the Mountain':           { top: 26, left: 55, heroScale: 1.15 },
    'Jax, Grandmaster at Arms':                { top: 52, left: 61, heroScale: 1.5 },
    'Irelia, Blade Dancer':                    { top: 24, left: 49, heroScale: 1.7 },
    'Azir, Emperor of the Sands':              { top: 21, left: 51, heroScale: 1.45 },
    'Ezreal, Prodigal Explorer':               { top: 21, left: 49, heroScale: 1.45 },
    'Renata Glasc, Chem-Baroness':             { top: 20, left: 50, heroScale: 1.5 },
    'Sivir, Battle Mistress':                  { top: 19, left: 53, heroScale: 1.45 },
    'Fiora, Grand Duelist':                    { top: 28, left: 53, heroScale: 1.9 },
    'Jhin, Virtuoso':                          { top: 13, left: 51, heroScale: 2.0 },
    'Rengar, Pridestalker':                    { top: 31, left: 36, heroScale: 1.2 },
    'Pyke, Bloodharbor Ripper':                { top: 33, left: 58, heroScale: 1.6 },
    'Vi, Piltover Enforcer':                   { top: 12, left: 47, heroScale: 1.6 },
    'Lillia, Bashful Bloom':                   { top: 18, left: 41, heroScale: 1.7 },
    'Master Yi, Wuju Master':                  { top: 18, left: 59, heroScale: 1.5 },
    'Vex, Gloomist':                           { top: 49, left: 56, heroScale: 1.7 },
    'Ivern, Green Father':                     { top: 22, left: 50, heroScale: 1.2 },
    'Diana, Scorn of the Moon':                { top: 11, left: 70, heroScale: 2.0 },
    'LeBlanc, Deceiver':                       { top: 16, left: 46, heroScale: 1.8 },
    "Kha'Zix, Voidreaver":                     { top: 37, left: 42, heroScale: 1.15 },
    'Poppy, Keeper of the Hammer':             { top: 46, left: 59, heroScale: 1.6 },
    // Vendetta — starting estimates from the 1200 crops; fine-tune with
    // heroDebug() on the metagame page (saves via POST /save-hero-position)
    'Akali, Rogue Assassin':                   { top: 18, left: 46, heroScale: 1.4 },
    'Renekton, Butcher of the Sands':          { top: 20, left: 48, heroScale: 1.15 },
    'Zed, Master of Shadows':                  { top: 16, left: 50, heroScale: 1.4 },
    'Nasus, Curator of the Sands':             { top: 12, left: 50, heroScale: 1.6 },
    'Shen, Eye of Twilight':                   { top: 14, left: 50, heroScale: 1.7 },
    'Jayce, Defender of Tomorrow':             { top: 16, left: 44, heroScale: 1.5 },
    "Mel, Soul's Reflection":                  { top: 12, left: 52, heroScale: 1.8 },
    'Ambessa, Matriarch of War':               { top: 12, left: 50, heroScale: 1.6 },
    'Kennen, Heart of the Tempest':            { top: 22, left: 50, heroScale: 1.3 },
    'Other':                                   { top: 40, left: 48 },
};

