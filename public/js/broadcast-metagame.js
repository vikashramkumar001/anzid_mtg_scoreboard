import { RIFTBOUND_LEGENDS } from './riftbound/constants.js';

const socket = io();
window.roomManager = new RoomManager(socket);

let currentGame = 'mtg';
let currentVendor = 'default';
let currentPlayerCount = '1v1';
let metagameData = null;

// Color palette for pie slices (will be overridable per vendor)
const DEFAULT_COLORS = [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
    '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
    '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
    '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9'
];

// ── Socket Setup ─────────────────────────────────────────────────────────────
socket.emit('get-game-selection');
socket.emit('get-vendor-selection');
socket.emit('get-player-count');
socket.emit('get-broadcast-scoreboard-data');
socket.emit('get-meta-breakdown-data');

// ── Theme ────────────────────────────────────────────────────────────────────
let _initGame = false, _initVendor = false, _initPlayer = false;
function tryInitialTheme() {
    if (_initGame && _initVendor && _initPlayer) {
        updateTheme(currentGame, currentVendor, currentPlayerCount);
    }
}

socket.on('server-current-game-selection', ({gameSelection}) => {
    currentGame = gameSelection;
    _initGame = true;
    tryInitialTheme();
});
socket.on('game-selection-updated', ({gameSelection}) => {
    currentGame = gameSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('server-current-vendor-selection', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    _initVendor = true;
    tryInitialTheme();
});
socket.on('vendor-selection-updated', ({vendorSelection}) => {
    currentVendor = vendorSelection;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});
socket.on('server-current-player-count', ({playerCount}) => {
    currentPlayerCount = playerCount;
    _initPlayer = true;
    tryInitialTheme();
});
socket.on('player-count-updated', ({playerCount}) => {
    currentPlayerCount = playerCount;
    updateTheme(currentGame, currentVendor, currentPlayerCount);
});


function updateTheme(game, vendor, playerCount) {
    const vc = window.VENDOR_CONFIG;
    if (vc) {
        vc.getAllOverrideProperties().forEach(prop => {
            document.documentElement.style.removeProperty(prop);
        });
        const overrides = vc.getOverrides(game, vendor);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });

        // Background image
        const bgPath = vc.getAssetPath(
            `/assets/images/${game}/metagame/${game}-metagame-bg.png`,
            vendor, playerCount
        );
        const bgEl = document.getElementById('metagame-bg');
        if (bgEl) {
            const img = new Image();
            img.onload = () => { bgEl.src = bgPath; };
            img.onerror = () => { bgEl.src = ''; };
            img.src = bgPath;
        }
    }

    // Game defaults
    if (game === 'mtg') {
        document.documentElement.style.setProperty('--dynamic-font', 'Gotham Narrow');
        document.documentElement.style.setProperty('--dynamic-font-weight', '700');
    } else if (game === 'riftbound') {
        document.documentElement.style.setProperty('--dynamic-font', 'Akzidenz-Grotesk Next');
        document.documentElement.style.setProperty('--dynamic-font-weight', '900');
    } else {
        document.documentElement.style.setProperty('--dynamic-font', 'Bebas Neue');
        document.documentElement.style.setProperty('--dynamic-font-weight', 'bold');
    }

    // Re-apply vendor overrides
    if (vc) {
        const overrides = vc.getOverrides(game, vendor);
        Object.entries(overrides).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });
    }
}

// ── Metagame Data ────────────────────────────────────────────────────────────
socket.on('receive-meta-breakdown-data', (data) => {
    console.log('[Metagame] Received breakdown data', data);
    metagameData = data;
    renderMetagame();
});

// ── Portrait Lookup (1200x1200 for metagame) ────────────────────────────────
// Face focus points: { top%, left% } — where the face is in the 1200x1200 image
const PORTRAIT_FOCUS = {
    'Annie, Dark Child':                       { top: 18, left: 51 },
    'Master Yi, Wuju Bladesman':               { top: 17, left: 40 },
    'Lux, Lady of Luminosity':                 { top: 9, left: 59 },
    'Garen, Might of Demacia':                 { top: 36, left: 37 },
    "Kai'Sa, Daughter of the Void":            { top: 21, left: 71 },
    'Volibear, Relentless Storm':              { top: 12, left: 50 },
    'Jinx, Loose Cannon':                      { top: 15, left: 52 },
    'Darius, Hand of Noxus':                   { top: 25, left: 46 },
    'Ahri, Nine-Tailed Fox':                   { top: 30, left: 48 },
    'Lee Sin, Blind Monk':                     { top: 23, left: 49 },
    'Yasuo, Unforgiven':                       { top: 19, left: 55 },
    'Leona, Radiant Dawn':                     { top: 14, left: 38 },
    'Teemo, Swift Scout':                      { top: 35, left: 41 },
    'Viktor, Herald of the Arcane':            { top: 37, left: 46 },
    'Miss Fortune, Bounty Hunter':             { top: 24, left: 60 },
    'Sett, The Boss':                          { top: 14, left: 50 },
    'Rumble, Mechanized Menace':               { top: 39, left: 51 },
    'Lucian, Purifier':                        { top: 13, left: 43 },
    'Draven, Glorious Executioner':            { top: 20, left: 55 },
    "Rek'Sai, Void Burrower":                  { top: 16, left: 51 },
    'Ornn, Fire Below the Mountain':           { top: 26, left: 55 },
    'Jax, Grandmaster at Arms':                { top: 52, left: 61 },
    'Irelia, Blade Dancer':                    { top: 24, left: 49 },
    'Azir, Emperor of the Sands':              { top: 21, left: 51 },
    'Ezreal, Prodigal Explorer':               { top: 21, left: 49 },
    'Renata Glasc, Chem-Baroness':             { top: 20, left: 50 },
    'Sivir, Battle Mistress':                  { top: 19, left: 53 },
    'Fiora, Grand Duelist':                    { top: 28, left: 53 },
    'Jhin, Virtuoso':                          { top: 13, left: 51 },
    'Rengar, Pridestalker':                    { top: 31, left: 36 },
    'Pyke, Bloodharbor Ripper':                { top: 33, left: 58 },
    'Vi, Piltover Enforcer':                   { top: 12, left: 47 },
    'Lillia, Bashful Bloom':                   { top: 18, left: 41 },
    'Master Yi, Wuju Master':                  { top: 18, left: 59 },
    'Vex, Gloomist':                           { top: 49, left: 56 },
    'Ivern, Green Father':                     { top: 22, left: 50 },
    'Diana, Scorn of the Moon':                { top: 11, left: 70 },
    'LeBlanc, Deceiver':                       { top: 16, left: 46 },
    "Kha'Zix, Voidreaver":                     { top: 37, left: 42 },
    'Poppy, Keeper of the Hammer':             { top: 46, left: 59 },
    'Other':                                   { top: 40, left: 48 },
};

function getPortraitUrl(archetypeName) {
    if (archetypeName === 'Other') {
        return `/assets/images/${currentGame}/shared/legend-portraits/legend-portraits-1200x1200/1200x1200_0000_Other.png`;
    }
    const legendData = RIFTBOUND_LEGENDS[archetypeName];
    if (legendData) {
        return legendData.left.replace('legend-portraits-251x124/251x124_', 'legend-portraits-1200x1200/1200x1200_');
    }
    return '';
}

function getBgPortraitUrl(archetypeName) {
    const legendData = RIFTBOUND_LEGENDS[archetypeName];
    if (legendData) {
        return legendData.left.replace(
            'legend-portraits/legend-portraits-251x124/251x124_',
            'legend-portrait-bgs/legend-portrait-with-bgs-744x1039/744x1039_'
        );
    }
    return '';
}

function getPortraitFocus(archetypeName) {
    const entry = PORTRAIT_FOCUS[archetypeName] || { top: 20, left: 50 };
    return { top: entry.top, left: entry.left, scale: entry.scale || 1.0 };
}

// ── Parse metagame data from the flat field format ───────────────────────────
function parseMetagameFields(data) {
    const archetypes = [];
    for (let i = 1; i <= 30; i++) {
        const name = data[`meta-breakdown-archetype-${i}`];
        if (!name || (typeof name === 'string' && name.trim() === '')) break;
        const day1Count = parseInt(data[`meta-breakdown-day-1-count-${i}`]) || 0;
        const day1Percent = parseFloat(data[`meta-breakdown-day-1-percent-${i}`]) || 0;
        const day2Count = data[`meta-breakdown-day-2-count-${i}`] !== undefined && data[`meta-breakdown-day-2-count-${i}`] !== ''
            ? parseInt(data[`meta-breakdown-day-2-count-${i}`]) : null;
        const day2Percent = data[`meta-breakdown-day-2-percent-${i}`] !== undefined && data[`meta-breakdown-day-2-percent-${i}`] !== ''
            ? parseFloat(data[`meta-breakdown-day-2-percent-${i}`]) : null;
        const convStr = data[`meta-breakdown-conversion-${i}`] || '';
        const conversion = convStr ? parseFloat(convStr.replace('%', '')) : null;

        archetypes.push({
            name: typeof name === 'string' ? name : name,
            day1Count, day1Percent, day2Count, day2Percent, conversion,
            portrait: getPortraitUrl(typeof name === 'string' ? name : '')
        });
    }
    return archetypes;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderMetagame() {
    if (!metagameData) return;

    const archetypes = parseMetagameFields(metagameData);
    if (archetypes.length === 0) return;

    // Use day2Percent if available, otherwise day1Percent for pie sizing
    const hasDay2 = archetypes.some(a => a.day2Count !== null);
    const pieData = archetypes.map((a, i) => ({
        ...a,
        value: hasDay2 ? (a.day2Count || 0) : a.day1Count,
        percent: hasDay2 ? (a.day2Percent || 0) : a.day1Percent,
        color: DEFAULT_COLORS[i % DEFAULT_COLORS.length]
    }));

    document.getElementById('metagame-title').textContent = '';

    const rootStyle = getComputedStyle(document.documentElement);
    const subtitleEl = document.getElementById('metagame-subtitle');
    if (hasDay2) {
        const day2Visible = rootStyle.getPropertyValue('--meta-subtitle-day2-visible').trim() || 'block';
        subtitleEl.style.display = day2Visible;
        subtitleEl.textContent = 'DAY 2';
    } else {
        const day1Visible = rootStyle.getPropertyValue('--meta-subtitle-day1-visible').trim() || 'block';
        subtitleEl.style.display = day1Visible;
        subtitleEl.textContent = 'DAY 1';
    }

    // Iterative pie sizing — shrink if labels get nudged too far from their slices
    const rootStyleInit = getComputedStyle(document.documentElement);
    const configuredSize = parseInt(rootStyleInit.getPropertyValue('--meta-pie-size')) || 500;
    const minSize = Math.round(configuredSize * 0.7);
    let currentSize = null; // null = use configured size
    for (let attempt = 0; attempt < 5; attempt++) {
        const result = renderPieChart(pieData, currentSize);
        if (!result.nudgeExceeded) break;
        // Shrink and retry
        currentSize = (currentSize || result.size) - 10;
        if (currentSize < minSize) break;
    }

    // Side panel: always top 15 + Other (independent of pie showCount)
    const allArchetypes = metagameData._allArchetypes || [];
    const day1Total = metagameData._day1Total || 0;
    const day2Total = metagameData._day2Total || null;
    const activeTotal = hasDay2 ? (day2Total || 0) : day1Total;
    const panelMax = 15;

    let panelData;
    if (allArchetypes.length <= panelMax + 1) {
        // 16 or fewer archetypes — show all, no Other
        panelData = allArchetypes.map((a, i) => ({
            name: a.name,
            day1Count: a.day1Count,
            day1Percent: parseFloat(a.day1Percent) || 0,
            day2Count: a.day2Count !== null && a.day2Count !== undefined ? parseInt(a.day2Count) : null,
            day2Percent: a.day2Percent !== null && a.day2Percent !== undefined ? parseFloat(a.day2Percent) : null,
            conversion: a.conversion !== null && a.conversion !== undefined ? parseFloat(a.conversion) : null,
            percent: hasDay2 ? (parseFloat(a.day2Percent) || 0) : (parseFloat(a.day1Percent) || 0),
            portrait: getPortraitUrl(a.name),
            color: DEFAULT_COLORS[i % DEFAULT_COLORS.length]
        }));
    } else {
        // More than 16 — show top 15 + Other
        const top15 = allArchetypes.slice(0, panelMax);
        const otherDay1Count = day1Total - top15.reduce((sum, a) => sum + a.day1Count, 0);
        const otherDay1Pct = day1Total > 0 ? (otherDay1Count / day1Total * 100) : 0;
        const otherDay2Count = day2Total ? (day2Total - top15.reduce((sum, a) => sum + (parseInt(a.day2Count) || 0), 0)) : null;
        const otherDay2Pct = day2Total && day2Total > 0 ? (otherDay2Count / day2Total * 100) : null;
        const otherConv = day2Total && otherDay1Count > 0 ? (otherDay2Count / otherDay1Count * 100) : null;

        panelData = top15.map((a, i) => ({
            name: a.name,
            day1Count: a.day1Count,
            day1Percent: parseFloat(a.day1Percent) || 0,
            day2Count: a.day2Count !== null && a.day2Count !== undefined ? parseInt(a.day2Count) : null,
            day2Percent: a.day2Percent !== null && a.day2Percent !== undefined ? parseFloat(a.day2Percent) : null,
            conversion: a.conversion !== null && a.conversion !== undefined ? parseFloat(a.conversion) : null,
            percent: hasDay2 ? (parseFloat(a.day2Percent) || 0) : (parseFloat(a.day1Percent) || 0),
            portrait: getPortraitUrl(a.name),
            color: DEFAULT_COLORS[i % DEFAULT_COLORS.length]
        }));
        panelData.push({
            name: 'Other',
            day1Count: otherDay1Count,
            day1Percent: otherDay1Pct,
            day2Count: otherDay2Count,
            day2Percent: otherDay2Pct,
            conversion: otherConv,
            percent: hasDay2 ? (otherDay2Pct || 0) : otherDay1Pct,
            portrait: '',
            color: DEFAULT_COLORS[panelMax % DEFAULT_COLORS.length]
        });
    }

    renderSidePanel(panelData, hasDay2, activeTotal);
}

// ── Pie Chart (D3.js) ────────────────────────────────────────────────────────
function renderPieChart(data, sizeOverride) {
    const svg = d3.select('#pie-chart');
    svg.selectAll('*').remove();

    const rootStyle = getComputedStyle(document.documentElement);
    const size = sizeOverride || parseInt(rootStyle.getPropertyValue('--meta-pie-size')) || 500;
    let _labelNudgeExceeded = false;
    const radius = size / 2;
    const innerRadius = radius * 0.15; // Small donut hole

    const viewBoxSize = 1080;
    svg.attr('viewBox', `${-viewBoxSize/2} ${-viewBoxSize/2} ${viewBoxSize} ${viewBoxSize}`)
       .style('overflow', 'visible');

    const g = svg.append('g');

    const pie = d3.pie()
        .value(d => d.value)
        .sort(null); // Keep order as-is (already sorted)

    const outerRadius = radius - 10;
    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const labelArc = d3.arc()
        .innerRadius(radius * 0.55)
        .outerRadius(radius * 0.55);

    const arcs = pie(data);

    // Determine top 3 slices by value for growth effect (exclude "Other")
    const sortedByValue = [...arcs]
        .filter(d => d.data.name !== 'Other')
        .sort((a, b) => b.data.value - a.data.value);
    const growthRanks = new Map();
    sortedByValue.slice(0, 3).forEach((d, rank) => {
        growthRanks.set(d.index, rank);
    });
    const GROWTH_EXTRA = [
        parseInt(rootStyle.getPropertyValue('--meta-explode-1')) || 60,
        parseInt(rootStyle.getPropertyValue('--meta-explode-2')) || 40,
        parseInt(rootStyle.getPropertyValue('--meta-explode-3')) || 25,
    ];

    // Per-slice arc generators for the grown state
    // Top 3 get larger outerRadius, "Other" gets smaller
    const OTHER_SHRINK = 40;
    const sliceArcs = arcs.map(d => {
        const rank = growthRanks.get(d.index);
        if (d.data.name === 'Other') {
            return d3.arc().innerRadius(innerRadius).outerRadius(outerRadius - OTHER_SHRINK);
        }
        const extra = rank !== undefined ? GROWTH_EXTRA[rank] : 0;
        return d3.arc().innerRadius(innerRadius).outerRadius(outerRadius + extra);
    });

    // Draw image-filled slices (all start at base outerRadius)
    arcs.forEach((d, i) => {
        const midAngle = (d.startAngle + d.endAngle) / 2;
        const rank = growthRanks.get(d.index);
        const grownOuterRadius = outerRadius + (rank !== undefined ? GROWTH_EXTRA[rank] : 0);

        const sliceGroup = g.append('g').attr('class', 'slice-group');

        // Clip path — starts at base size, will grow during animation
        sliceGroup.append('clipPath')
            .attr('id', `slice-clip-${i}`)
            .append('path')
            .attr('d', arc(d));

        // Black background behind portrait
        sliceGroup.append('path')
            .attr('class', 'slice-bg')
            .attr('fill', '#000')
            .each(function() {
                this._target = { startAngle: d.startAngle, endAngle: d.endAngle };
                this._sliceArcIndex = i;
            })
            .attr('d', arc({ startAngle: d.startAngle, endAngle: d.startAngle }));

        // Portrait image clipped to slice shape
        // Position based on grown radius so face is correct after growth
        if (d.data.portrait) {
            const focus = getPortraitFocus(d.data.name);
            const slicePercent = (d.endAngle - d.startAngle) / (2 * Math.PI) * 100;
            const centroidR = innerRadius + (grownOuterRadius - innerRadius) * (slicePercent <= 6 ? 0.6 : 0.5);
            const cx = Math.cos(midAngle - Math.PI / 2) * centroidR;
            const cy = Math.sin(midAngle - Math.PI / 2) * centroidR;

            const sliceAngle = d.endAngle - d.startAngle;
            const angleFactor = Math.sqrt(sliceAngle / Math.PI);
            const imgSize = grownOuterRadius * (1.0 + 2.5 * angleFactor) * focus.scale;

            const faceOffsetX = (focus.left / 100 - 0.5) * imgSize;
            const faceOffsetY = (focus.top / 100 - 0.5) * imgSize;

            sliceGroup.append('image')
                .attr('class', 'slice-image')
                .attr('data-slice', i)
                .attr('href', d.data.portrait)
                .attr('x', cx - imgSize / 2 - faceOffsetX)
                .attr('y', cy - imgSize / 2 - faceOffsetY)
                .attr('width', imgSize)
                .attr('height', imgSize)
                .attr('preserveAspectRatio', 'xMidYMid slice')
                .attr('clip-path', `url(#slice-clip-${i})`)
                .style('opacity', 0);
        }

        // Colored slice on top — starts at base arc size
        sliceGroup.append('path')
            .attr('class', 'slice')
            .attr('fill', d.data.portrait ? 'rgba(0,0,0,0.1)' : '#000')
            .attr('stroke', rootStyle.getPropertyValue('--meta-slice-stroke') || '#000')
            .attr('stroke-width', 0)
            .each(function() {
                this._target = { startAngle: d.startAngle, endAngle: d.endAngle };
                this._targetStrokeWidth = rootStyle.getPropertyValue('--meta-slice-stroke-width') || 2;
                this._sliceArcIndex = i;
            })
            .attr('d', arc({ startAngle: d.startAngle, endAngle: d.startAngle }));
    });

    // Re-select all slices for animation
    const slices = g.selectAll('.slice');

    // Outside labels
    const outerLabelRadius = outerRadius + (GROWTH_EXTRA[0] || 0) + 50;
    const labelLineInner = outerRadius + 5;
    const labelLineOuter = outerRadius + 15;

    const outerLabelArc = d3.arc()
        .innerRadius(outerLabelRadius)
        .outerRadius(outerLabelRadius);

    const lineInnerArc = d3.arc()
        .innerRadius(labelLineInner)
        .outerRadius(labelLineInner);

    const lineOuterArc = d3.arc()
        .innerRadius(labelLineOuter)
        .outerRadius(labelLineOuter);

    let leaderLines = g.selectAll('.leader-line'); // initially empty, populated after labels

    // Pass 1: Initial label positions at generous radius for collision avoidance
    const maxGrowth = GROWTH_EXTRA[0] || 0;
    const initialLabelR = outerRadius + maxGrowth + 200;
    const labelPositions = arcs.map(d => {
        const midAngle = (d.startAngle + d.endAngle) / 2;
        const rank = growthRanks.get(d.index);
        const isOther = d.data.name === 'Other';
        let sliceOuter = outerRadius;
        if (isOther) sliceOuter = outerRadius - OTHER_SHRINK;
        else if (rank !== undefined) sliceOuter = outerRadius + GROWTH_EXTRA[rank];
        const x = Math.cos(midAngle - Math.PI / 2) * initialLabelR;
        const y = Math.sin(midAngle - Math.PI / 2) * initialLabelR;
        return { x, y, midAngle, _targetR: initialLabelR, sliceOuter };
    });

    // Push overlapping labels apart (dynamic spacing based on slice count)
    const sliceCount = labelPositions.length;
    const minSpacing = Math.max(40, 80 - sliceCount * 3);
    const maxIterations = Math.max(20, sliceCount * 5);
    const maxLabelR = initialLabelR + 100;
    for (let pass = 0; pass < maxIterations; pass++) {
        for (let i = 0; i < labelPositions.length; i++) {
            for (let j = i + 1; j < labelPositions.length; j++) {
                const a = labelPositions[i];
                const b = labelPositions[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minSpacing) {
                    const push = (minSpacing - dist) / 2;
                    const angle = Math.atan2(dy, dx);
                    a.x -= Math.cos(angle) * push;
                    a.y -= Math.sin(angle) * push;
                    b.x += Math.cos(angle) * push;
                    b.y += Math.sin(angle) * push;
                }
            }
        }
        // After each pass, clamp labels to valid radius range
        labelPositions.forEach(pos => {
            const currentR = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
            if (currentR < 1) return;
            const clampedR = Math.min(Math.max(currentR, pos._targetR), maxLabelR);
            const scale = clampedR / currentR;
            pos.x *= scale;
            pos.y *= scale;
        });
    }

    // Percentage labels (hidden, kept for animation reference)
    const percentLabels = g.selectAll('.slice-percent')
        .data(arcs)
        .enter()
        .append('text')
        .attr('class', 'slice-percent')
        .style('opacity', 0);

    // Combined name + percent labels with background rectangles
    const LABEL_PAD_X = 10, LABEL_PAD_Y = 6;
    const LABEL_GAP = 30; // desired gap from slice edge to nearest rect edge
    const labelGroups = arcs.map((d, i) => {
        if (d.data.percent < 1) return null;
        const pos = labelPositions[i];
        const isRight = pos.midAngle < Math.PI;
        const name = d.data.name.split(',')[0];
        const labelText = `${name} — ${d.data.percent.toFixed(1)}%`;

        const labelG = g.append('g')
            .attr('class', 'label-group')
            .style('opacity', 0);

        // Background rect (sized after text is rendered)
        const rect = labelG.append('rect')
            .attr('class', 'label-bg')
            .attr('fill', '#000')
            .attr('stroke', '#1ae930')
            .attr('stroke-width', 1.5)
            .attr('rx', 4)
            .attr('ry', 4);

        // Text
        const anchor = isRight ? 'start' : 'end';
        const text = labelG.append('text')
            .attr('class', 'slice-label')
            .attr('text-anchor', anchor)
            .attr('dy', '0.35em')
            .text(labelText);

        // Size rect to fit text, shrink font if too wide
        const maxLabelWidth = parseInt(rootStyle.getPropertyValue('--meta-label-max-width')) || 220;
        let bbox = text.node().getBBox();
        if (bbox.width + LABEL_PAD_X * 2 > maxLabelWidth) {
            console.log(`[LabelCap] ${name}: ${(bbox.width + LABEL_PAD_X * 2).toFixed(0)}px → capped at ${maxLabelWidth}px`);
            const currentFontSize = parseFloat(rootStyle.getPropertyValue('--meta-label-font-size')) || 24;
            const newFontSize = currentFontSize * (maxLabelWidth / (bbox.width + LABEL_PAD_X * 2));
            text.style('font-size', `${newFontSize}px`);
            bbox = text.node().getBBox();
        }
        const rectX = bbox.x - LABEL_PAD_X;
        const rectY = bbox.y - LABEL_PAD_Y;
        const rectW = bbox.width + LABEL_PAD_X * 2;
        const rectH = bbox.height + LABEL_PAD_Y * 2;
        rect.attr('x', rectX).attr('y', rectY)
            .attr('width', rectW).attr('height', rectH);

        // Position label at a given angle, maintaining gap from slice edge
        function positionAtAngle(angle) {
            const targetR = pos.sliceOuter + LABEL_GAP;
            const anchorX = Math.cos(angle - Math.PI / 2) * targetR;
            const anchorY = Math.sin(angle - Math.PI / 2) * targetR;
            const onRight = angle < Math.PI;
            const goingDown = Math.sin(angle - Math.PI / 2) > 0;

            let ncX, ncY;
            if (onRight) {
                ncX = rectX;
                ncY = goingDown ? rectY : rectY + rectH;
            } else {
                ncX = rectX + rectW;
                ncY = goingDown ? rectY : rectY + rectH;
            }
            return { tx: anchorX - ncX, ty: anchorY - ncY };
        }

        // Pass 2: Initial position along slice midpoint angle
        let currentAngle = pos.midAngle;
        let { tx, ty } = positionAtAngle(currentAngle);

        // Pass 3: Slide along arc if label exceeds bounding box
        const BOUND_RIGHT = 490;
        const BOUND_LEFT = -750;
        const BOUND_BOTTOM = 470;
        const BOUND_TOP = -470;
        const ANGLE_STEP = 0.03;
        const MAX_ITER = 30;

        for (let iter = 0; iter < MAX_ITER; iter++) {
            const rRight = tx + rectX + rectW;
            const rLeft = tx + rectX;
            const rBottom = ty + rectY + rectH;
            const rTop = ty + rectY;

            let nudge = 0;
            if (rRight > BOUND_RIGHT) nudge = -ANGLE_STEP;
            else if (rLeft < BOUND_LEFT) nudge = ANGLE_STEP;
            else if (rBottom > BOUND_BOTTOM) nudge = -ANGLE_STEP;
            else if (rTop < BOUND_TOP) nudge = ANGLE_STEP;
            else break; // within bounds

            currentAngle += nudge;
            ({ tx, ty } = positionAtAngle(currentAngle));
        }

        // Track nudge for iterative sizing
        const sliceSpan = d.endAngle - d.startAngle;
        const nudgeAmount = Math.abs(currentAngle - pos.midAngle);
        if (nudgeAmount > sliceSpan / 2) {
            _labelNudgeExceeded = true;
        }

        labelG.attr('transform', `translate(${tx}, ${ty})`);

        return labelG;
    });

    // Post-placement collision resolution on actual label positions
    const placedLabels = labelGroups.filter(lg => lg !== null);
    const labelRects = placedLabels.map(lg => {
        const node = lg.node();
        const rect = node.querySelector('rect');
        const transform = lg.attr('transform');
        const match = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
        const tx = match ? parseFloat(match[1]) : 0;
        const ty = match ? parseFloat(match[2]) : 0;
        const rx = parseFloat(rect.getAttribute('x'));
        const ry = parseFloat(rect.getAttribute('y'));
        const rw = parseFloat(rect.getAttribute('width'));
        const rh = parseFloat(rect.getAttribute('height'));
        return { lg, tx, ty, origTy: ty, rx, ry, rw, rh, left: tx + rx, top: ty + ry, right: tx + rx + rw, bottom: ty + ry + rh };
    });

    const COLLISION_PAD = 4;
    for (let pass = 0; pass < 30; pass++) {
        let anyOverlap = false;
        for (let i = 0; i < labelRects.length; i++) {
            for (let j = i + 1; j < labelRects.length; j++) {
                const a = labelRects[i];
                const b = labelRects[j];
                const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
                const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
                if (overlapX > 0 && overlapY > 0) {
                    anyOverlap = true;
                    const pushY = (overlapY + COLLISION_PAD) / 2;
                    if (a.origTy < b.origTy) {
                        a.ty -= pushY; a.top -= pushY; a.bottom -= pushY;
                        b.ty += pushY; b.top += pushY; b.bottom += pushY;
                    } else {
                        a.ty += pushY; a.top += pushY; a.bottom += pushY;
                        b.ty -= pushY; b.top -= pushY; b.bottom -= pushY;
                    }
                }
            }
        }
        if (!anyOverlap) break;
    }

    // Apply adjusted positions
    labelRects.forEach(({ lg, tx, ty }) => {
        lg.attr('transform', `translate(${tx}, ${ty})`);
    });

    const nameLabels = g.selectAll('.label-group');

    leaderLines = g.selectAll('.leader-line');

    // Store references for animation
    window._pieElements = { slices, percentLabels, nameLabels, leaderLines, arc, sliceArcs, growthRanks, arcs, data, g, radius, innerRadius, outerRadius, OTHER_SHRINK };

    return { nudgeExceeded: _labelNudgeExceeded, size };
}

// ── Side Panel ───────────────────────────────────────────────────────────────
function renderSidePanel(data, hasDay2, activeTotal) {
    const panel = document.getElementById('archetype-cards-panel');
    panel.innerHTML = '';

    // Panel header — total player count
    const header = document.createElement('div');
    header.id = 'panel-header';
    header.textContent = `Total Players: ${activeTotal}`;
    panel.appendChild(header);

    // Show up to 16 items (15 archetypes + Other, or all if ≤15)
    const maxItems = 16;
    const items = data.slice(0, maxItems);

    items.forEach((archetype, i) => {
        const card = document.createElement('div');
        card.className = 'archetype-card';

        const shortName = archetype.name.split(',')[0];
        const count = hasDay2 ? (archetype.day2Count || 0) : archetype.day1Count;
        const displayName = `${shortName} (${count})`;
        const bgPortrait = archetype.name === 'Other'
            ? '/assets/images/riftbound/cards/riftbound-card-back.png'
            : getBgPortraitUrl(archetype.name);
        const portrait = bgPortrait
            ? `<img class="archetype-card-portrait" src="${bgPortrait}" alt="${shortName}">`
            : `<div class="archetype-card-portrait" style="background:#333;"></div>`;

        let countsText;
        if (hasDay2) {
            const d1Pct = archetype.day1Percent !== null ? `Day 1: ${parseFloat(archetype.day1Percent).toFixed(1)}%` : '';
            const d2Pct = archetype.day2Percent !== null ? `Day 2: ${parseFloat(archetype.day2Percent).toFixed(1)}%` : '';
            countsText = [d1Pct, d2Pct].filter(Boolean).join(' · ');
        } else {
            countsText = `Day 1: ${archetype.percent.toFixed(1)}%`;
        }

        card.innerHTML = `
            ${portrait}
            <div class="archetype-card-info">
                <div class="archetype-card-name">${displayName}</div>
                <div class="archetype-card-counts">${countsText}</div>
            </div>
        `;

        panel.appendChild(card);
    });

    // Store cards for animation
    window._cardElements = panel.querySelectorAll('#panel-header, .archetype-card');
}

// ── Animation ────────────────────────────────────────────────────────────────
function animateIn() {
    if (!window._pieElements) return;
    const { slices, percentLabels, nameLabels, leaderLines, arc, sliceArcs, growthRanks, arcs, data, g, radius, innerRadius, outerRadius, OTHER_SHRINK } = window._pieElements;

    const SLICE_DURATION = 1000;
    const SLICE_STAGGER = 0;
    const CARD_STAGGER = 80;

    // Animate each slice overlay + background + clip path simultaneously
    // Phase 1: Grow all slices using base arc (uniform outerRadius)
    const sliceBgs = g.selectAll('.slice-bg');

    slices.each(function(d, i) {
        const element = d3.select(this);
        const target = this._target;

        element.transition()
            .delay(i * SLICE_STAGGER)
            .duration(SLICE_DURATION)
            .ease(d3.easeCubicOut)
            .on('start', function() { d3.select(this).attr('stroke-width', this._targetStrokeWidth); })
            .attrTween('d', function() {
                const interpolate = d3.interpolate(
                    { startAngle: target.startAngle, endAngle: target.startAngle },
                    { startAngle: target.startAngle, endAngle: target.endAngle }
                );
                return t => {
                    const angles = interpolate(t);
                    const clipPath = g.select(`#slice-clip-${i} path`);
                    if (!clipPath.empty()) {
                        clipPath.attr('d', arc(angles));
                    }
                    return arc(angles);
                };
            });

        // Animate background path in sync
        const bg = sliceBgs.filter((_, idx) => idx === i);
        if (!bg.empty()) {
            bg.transition()
                .delay(i * SLICE_STAGGER)
                .duration(SLICE_DURATION)
                .ease(d3.easeCubicOut)
                .attrTween('d', function() {
                    const interpolate = d3.interpolate(
                        { startAngle: target.startAngle, endAngle: target.startAngle },
                        { startAngle: target.startAngle, endAngle: target.endAngle }
                    );
                    return t => arc(interpolate(t));
                });
        }

        // Fade in the image/video as the slice grows
        const sliceImage = g.selectAll('.slice-image').filter(function() { return +this.getAttribute('data-slice') === i; });
        if (!sliceImage.empty()) {
            sliceImage.transition()
                .delay(i * SLICE_STAGGER)
                .duration(SLICE_DURATION * 0.5)
                .style('opacity', 1);
        }
    });

    // Phase 2: Grow top 3 slices one at a time (biggest first), shrink "Other"
    const growDelay = arcs.length * SLICE_STAGGER + SLICE_DURATION;
    const GROW_DURATION = 800;
    const GROW_STAGGER = 200;

    slices.each(function(d, i) {
        const idx = this._sliceArcIndex;
        const targetArc = sliceArcs[idx];
        const rank = growthRanks.get(arcs[idx]?.index);
        const isOther = arcs[idx]?.data.name === 'Other';
        if (rank === undefined && !isOther) return;

        const target = this._target;
        const thisDelay = growDelay;

        const element = d3.select(this);
        element.transition()
            .delay(thisDelay)
            .duration(GROW_DURATION)
            .ease(d3.easeCubicOut)
            .attrTween('d', function() {
                return d3.interpolate(arc(target), targetArc(target));
            });

        // Also grow the clip path
        const clipPath = g.select(`#slice-clip-${i} path`);
        if (!clipPath.empty()) {
            clipPath.transition()
                .delay(thisDelay)
                .duration(GROW_DURATION)
                .ease(d3.easeCubicOut)
                .attrTween('d', function() {
                    return d3.interpolate(arc(target), targetArc(target));
                });
        }

        // Also grow the background
        const bg = sliceBgs.filter((_, bgIdx) => bgIdx === i);
        if (!bg.empty()) {
            bg.transition()
                .delay(thisDelay)
                .duration(GROW_DURATION)
                .ease(d3.easeCubicOut)
                .attrTween('d', function() {
                    return d3.interpolate(arc(target), targetArc(target));
                });
        }

        // Animate "Other" image to match shrunk radius
        if (isOther) {
            const sliceImage = g.selectAll('.slice-image').filter(function() { return +this.getAttribute('data-slice') === idx; });
            if (!sliceImage.empty()) {
                const sliceData = arcs[idx];
                const midAngle = (sliceData.startAngle + sliceData.endAngle) / 2;
                const focus = getPortraitFocus(sliceData.data.name);
                const sliceAngle = sliceData.endAngle - sliceData.startAngle;
                const angleFactor = Math.sqrt(sliceAngle / Math.PI);
                const shrunkR = outerRadius - OTHER_SHRINK;
                const slicePercent = sliceAngle / (2 * Math.PI) * 100;
                const newCentroidR = innerRadius + (shrunkR - innerRadius) * (slicePercent <= 6 ? 0.6 : 0.5);
                const newCx = Math.cos(midAngle - Math.PI / 2) * newCentroidR;
                const newCy = Math.sin(midAngle - Math.PI / 2) * newCentroidR;
                const newImgSize = shrunkR * (1.0 + 2.5 * angleFactor) * focus.scale;
                const newFaceOffsetX = (focus.left / 100 - 0.5) * newImgSize;
                const newFaceOffsetY = (focus.top / 100 - 0.5) * newImgSize;

                sliceImage.transition()
                    .delay(thisDelay)
                    .duration(GROW_DURATION)
                    .ease(d3.easeCubicOut)
                    .attr('x', newCx - newImgSize / 2 - newFaceOffsetX)
                    .attr('y', newCy - newImgSize / 2 - newFaceOffsetY)
                    .attr('width', newImgSize)
                    .attr('height', newImgSize);
            }
        }
    });

    // Fade in labels at the same time as growth starts
    const labelsDelay = growDelay;

    leaderLines.transition()
        .delay(labelsDelay)
        .duration(300)
        .style('opacity', 0.7);

    percentLabels.transition()
        .delay(labelsDelay + 100)
        .duration(300)
        .style('opacity', 1);

    nameLabels.transition()
        .delay(labelsDelay + 200)
        .duration(300)
        .style('opacity', 1);

    // Slide pie chart left at the same time as growth
    const slideDelay = growDelay;
    setTimeout(() => {
        const container = document.getElementById('pie-chart-container');
        const rootStyle = getComputedStyle(document.documentElement);
        const finalX = rootStyle.getPropertyValue('--meta-pie-x-final').trim() || '-280px';
        const currentY = rootStyle.getPropertyValue('--meta-pie-y').trim() || '0px';
        container.style.transform = `translate(${finalX}, ${currentY})`;
    }, slideDelay);

    // Show side panel after slide completes
    const panelDelay = slideDelay + 700;
    setTimeout(() => {
        document.getElementById('archetype-cards-panel')?.classList.add('active');
    }, panelDelay);

    // Animate side panel cards
    if (window._cardElements) {
        const cardsDelay = panelDelay + 100;
        window._cardElements.forEach((card, i) => {
            setTimeout(() => {
                card.classList.add('visible');
            }, cardsDelay + i * CARD_STAGGER);
        });
    }
}

function resetAnimation() {
    if (window._pieElements) {
        const { slices, percentLabels, nameLabels, leaderLines, g, arc } = window._pieElements;

        // Reset slices to zero (base arc, not grown)
        slices.each(function(d, i) {
            const target = this._target;
            d3.select(this)
                .attr('d', arc({ startAngle: target.startAngle, endAngle: target.startAngle }))
                .attr('stroke-width', 0);
        });
        percentLabels.style('opacity', 0);
        nameLabels.style('opacity', 0);
        leaderLines.style('opacity', 0);

        // Reset backgrounds to zero
        g.selectAll('.slice-bg').each(function(d, i) {
            const target = slices.nodes()[i]?._target;
            if (target) {
                d3.select(this).attr('d', arc({ startAngle: target.startAngle, endAngle: target.startAngle }));
            }
        });

        // Reset images to hidden
        g.selectAll('.slice-image').style('opacity', 0);


        // Reset clip paths to zero (base arc)
        g.selectAll('[id^="slice-clip-"] path').each(function(d, i) {
            const target = slices.nodes()[i]?._target;
            if (target) {
                d3.select(this).attr('d',
                    arc({ startAngle: target.startAngle, endAngle: target.startAngle })
                );
            }
        });
    }

    // Reset pie chart position (disable transition to avoid visible slide-right)
    const container = document.getElementById('pie-chart-container');
    if (container) {
        container.style.transition = 'none';
        container.style.transform = '';
        // Re-enable transition after a frame
        requestAnimationFrame(() => {
            container.style.transition = '';
        });
    }

    // Reset side panel
    document.getElementById('archetype-cards-panel')?.classList.remove('active');

    // Reset cards
    if (window._cardElements) {
        window._cardElements.forEach(card => card.classList.remove('visible'));
    }
}

// ── OBS Scene Detection (via server obs-websocket) ──────────────────────────
socket.on('obs-animate-metagame', () => {
    console.log('[Metagame] OBS transition to metagame — animating');
    resetAnimation();
    setTimeout(animateIn, 1000);
});

// Auto-animate on data load
socket.on('receive-meta-breakdown-data', () => {
    setTimeout(() => {
        resetAnimation();
        setTimeout(animateIn, 100);
    }, 200);
});

// ── Debug Focus Overlay ─────────────────────────────────────────────────────
// Toggle with: debugFocus()
// Shows each portrait unclipped with a crosshair at its focus point.
// Click a portrait to log its name + current focus for easy copy-paste.
let _debugOverlayActive = false;
window.debugFocus = function () {
    if (_debugOverlayActive) {
        document.getElementById('debug-focus-overlay')?.remove();
        _debugOverlayActive = false;
        console.log('[Debug] Focus overlay removed');
        return;
    }
    if (!window._pieElements) { console.warn('[Debug] No pie data yet'); return; }
    _debugOverlayActive = true;

    const overlay = document.createElement('div');
    overlay.id = 'debug-focus-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(0,0,0,0.85)', zIndex: 9999, overflow: 'hidden',
    });

    // Top toolbar
    const toolbar = document.createElement('div');
    Object.assign(toolbar.style, {
        display: 'flex', gap: '8px', padding: '8px 12px',
        background: 'rgba(0,0,0,0.95)', flexShrink: 0,
    });
    overlay.appendChild(toolbar);

    // Card grid container
    const grid = document.createElement('div');
    Object.assign(grid.style, {
        display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px',
        overflow: 'auto', flex: 1, alignContent: 'flex-start',
    });

    const { data } = window._pieElements;
    // Active legend names from current pie data
    const activeNames = new Set(data.filter(d => d.portrait).map(d => d.name));

    // Iterate ALL legends + "Other", not just active ones
    const allLegends = [
        ...Object.entries(RIFTBOUND_LEGENDS)
            .filter(([name, val]) => val !== null)
            .map(([name, val]) => ({ name, portrait: getPortraitUrl(name) })),
        { name: 'Other', portrait: getPortraitUrl('Other') },
    ].filter(l => l.portrait);

    allLegends.forEach(d => {
        const isActive = activeNames.has(d.name);
        const focus = getPortraitFocus(d.name);
        let currentScale = focus.scale;
        const card = document.createElement('div');
        Object.assign(card.style, {
            position: 'relative', width: '160px', height: '160px',
            border: isActive ? '3px solid #3cb44b' : '2px solid #555',
            borderRadius: '6px', overflow: 'hidden',
            cursor: 'pointer', flexShrink: 0,
            opacity: isActive ? '1' : '0.6',
        });

        const img = document.createElement('img');
        img.src = d.portrait;
        Object.assign(img.style, {
            width: '100%', height: '100%', objectFit: 'cover',
        });
        card.appendChild(img);

        // Crosshair at focus point
        const crossV = document.createElement('div');
        Object.assign(crossV.style, {
            position: 'absolute', top: 0, left: `${focus.left}%`,
            width: '2px', height: '100%', background: 'rgba(255,0,0,0.8)',
            pointerEvents: 'none',
        });
        card.appendChild(crossV);

        const crossH = document.createElement('div');
        Object.assign(crossH.style, {
            position: 'absolute', top: `${focus.top}%`, left: 0,
            width: '100%', height: '2px', background: 'rgba(255,0,0,0.8)',
            pointerEvents: 'none',
        });
        card.appendChild(crossH);

        // Dot at intersection
        const dot = document.createElement('div');
        Object.assign(dot.style, {
            position: 'absolute',
            top: `${focus.top}%`, left: `${focus.left}%`,
            width: '10px', height: '10px', borderRadius: '50%',
            background: 'red', border: '2px solid white',
            transform: 'translate(-50%, -50%)', pointerEvents: 'none',
        });
        card.appendChild(dot);

        // Label
        const updateLabel = () => {
            const f = PORTRAIT_FOCUS[d.name] || { top: focus.top, left: focus.left };
            const scaleStr = currentScale !== 1.0 ? ` s:${currentScale}` : '';
            label.textContent = `${d.name.split(',')[0]}  t:${f.top} l:${f.left}${scaleStr}`;
        };
        const label = document.createElement('div');
        Object.assign(label.style, {
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(0,0,0,0.7)', color: '#fff',
            fontSize: '11px', padding: '4px 6px', textAlign: 'center',
            fontFamily: 'monospace',
        });
        card.appendChild(label);
        updateLabel();

        // Click to log
        card.addEventListener('click', () => {
            const f = PORTRAIT_FOCUS[d.name] || { top: focus.top, left: focus.left };
            const scaleStr = currentScale !== 1.0 ? `, scale: ${currentScale}` : '';
            console.log(`'${d.name}': { top: ${f.top}, left: ${f.left}${scaleStr} },`);
        });

        // Right-click to reposition focus point
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = card.getBoundingClientRect();
            const newLeft = Math.round(((e.clientX - rect.left) / rect.width) * 100);
            const newTop = Math.round(((e.clientY - rect.top) / rect.height) * 100);
            PORTRAIT_FOCUS[d.name] = { top: newTop, left: newLeft, scale: currentScale };
            crossV.style.left = `${newLeft}%`;
            crossH.style.top = `${newTop}%`;
            dot.style.left = `${newLeft}%`;
            dot.style.top = `${newTop}%`;
            updateLabel();
            const scaleStr = currentScale !== 1.0 ? `, scale: ${currentScale}` : '';
            console.log(`'${d.name}': { top: ${newTop}, left: ${newLeft}${scaleStr} },`);
        });

        // Scroll wheel to adjust scale
        card.addEventListener('wheel', (e) => {
            e.preventDefault();
            currentScale = Math.round((currentScale + (e.deltaY < 0 ? 0.1 : -0.1)) * 10) / 10;
            currentScale = Math.max(0.5, Math.min(3.0, currentScale));
            const f = PORTRAIT_FOCUS[d.name] || { top: focus.top, left: focus.left };
            PORTRAIT_FOCUS[d.name] = { top: f.top, left: f.left, scale: currentScale };
            updateLabel();
            console.log(`'${d.name}': scale ${currentScale}`);
        });

        grid.appendChild(card);
    });
    overlay.appendChild(grid);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close & Re-render Pie';
    Object.assign(closeBtn.style, {
        padding: '8px 16px', fontSize: '14px', cursor: 'pointer',
        background: '#e6194b', color: '#fff', border: 'none', borderRadius: '6px',
    });
    closeBtn.addEventListener('click', () => {
        overlay.remove();
        _debugOverlayActive = false;
        // Re-render pie with updated focus values
        renderMetagame();
        setTimeout(() => {
            resetAnimation();
            setTimeout(animateIn, 100);
        }, 100);
    });
    toolbar.appendChild(closeBtn);

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save All Focus Values';
    Object.assign(saveBtn.style, {
        padding: '8px 16px', fontSize: '14px', cursor: 'pointer',
        background: '#3cb44b', color: '#fff', border: 'none', borderRadius: '6px',
    });
    saveBtn.addEventListener('click', async () => {
        // Build full focus map: merge current PORTRAIT_FOCUS (includes debug edits)
        // with any characters from the current data set
        const focusMap = { ...PORTRAIT_FOCUS };
        try {
            const res = await fetch('/save-portrait-focus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ focusMap }),
            });
            const result = await res.json();
            if (result.ok) {
                saveBtn.textContent = `✓ Saved ${result.count} values!`;
                console.log(`[Debug] Saved ${result.count} portrait focus values to file`);
            } else {
                saveBtn.textContent = '✗ Error!';
                console.error('[Debug] Save failed:', result.error);
            }
        } catch (err) {
            saveBtn.textContent = '✗ Error!';
            console.error('[Debug] Save failed:', err);
        }
        setTimeout(() => { saveBtn.textContent = 'Save All Focus Values'; }, 2000);
    });
    toolbar.appendChild(saveBtn);

    document.body.appendChild(overlay);
    console.log('[Debug] Focus overlay active. Right-click portraits to reposition focus. Close to re-render pie.');
};
