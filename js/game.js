// CHRONO-KILN // 88 — Complete Game Engine & 2.5D Isometric Neon Renderer

(() => {
  const canvas = document.getElementById('kiln-canvas');
  const ctx = canvas.getContext('2d');

  // Directions in isometric grid space:
  // 0: North (r - 1, c) -> Up-Left on screen
  // 1: East  (r, c + 1) -> Up-Right on screen
  // 2: South (r + 1, c) -> Down-Right on screen
  // 3: West  (r, c - 1) -> Down-Left on screen
  const DIRS = [
    { dr: -1, dc: 0, opp: 2 }, // N
    { dr: 0, dc: 1, opp: 3 },  // E
    { dr: 1, dc: 0, opp: 0 },  // S
    { dr: 0, dc: -1, opp: 1 }  // W
  ];

  const SECTORS = [
    { id: 1, name: 'SECTOR 1/5: LANTERN ALLEY', enemyCount: 3, boss: false },
    { id: 2, name: 'SECTOR 2/5: STEAMDUCT BAZAAR', enemyCount: 4, boss: false },
    { id: 3, name: 'SECTOR 3/5: MERCURY VIADUCT', enemyCount: 5, boss: false },
    { id: 4, name: 'SECTOR 4/5: NEON FOUNDRY 88', enemyCount: 6, boss: false },
    { id: 5, name: 'SECTOR 5/5: GRAND CHRONO-CORE', enemyCount: 5, boss: true }
  ];

  const CARD_LIBRARY = {
    shift: {
      id: 'shift',
      name: 'SHIFT ROW/COL',
      cost: 1,
      icon: '⇄',
      colorClass: 'card-cyan',
      desc: 'Slide any Row or Column by 1 tile (wraps around).'
    },
    rotate: {
      id: 'rotate',
      name: 'ROTATE 2x2',
      cost: 1,
      icon: '↻',
      colorClass: 'card-cyan',
      desc: 'Spin any 2x2 quadrant & its conduits 90° CW.'
    },
    bellows: {
      id: 'bellows',
      name: 'STEAM BELLOWS',
      cost: 1,
      icon: '💨',
      colorClass: 'card-gold',
      desc: 'Shove a Row/Col into walls (4 Crush DMG) & cool -20% Pressure.'
    },
    transmute: {
      id: 'transmute',
      name: 'TRANSMUTE ╋',
      cost: 1,
      icon: '⚡',
      colorClass: 'card-magenta',
      desc: 'Cycle tile Reagent & upgrade its conduit to a 4-way Cross (╋).'
    },
    overclock: {
      id: 'overclock',
      name: 'OVERCLOCK 2X',
      cost: 0,
      icon: '🔥',
      colorClass: 'card-magenta',
      desc: 'Instant: 2.0x Route DMG this turn & +15% Pressure (Enter Zone 88!).'
    },
    magnet: {
      id: 'magnet',
      name: 'MAGNETIC SWAP',
      cost: 1,
      icon: '🧲',
      colorClass: 'card-gold',
      desc: 'Click any two tiles on the 4x4 grid to swap them directly.'
    },
    cryo: {
      id: 'cryo',
      name: 'CRYO-SURGE',
      cost: 1,
      icon: '❄️',
      colorClass: 'card-cyan',
      desc: 'Instant: Cool -25% Boiler Pressure & Deal 3 Frost DMG to all Automata.'
    }
  };

  // Isometric Geometry Constants
  const ISO = {
    cx: 455,
    cy: 270,
    tw: 70, // half-width of isometric diamond
    th: 38, // half-height of isometric diamond
    depth: 14
  };

  function gridToScreen(r, c) {
    const sx = ISO.cx + (c - r) * ISO.tw;
    const sy = ISO.cy + (c + r - 3) * ISO.th;
    return { x: sx, y: sy };
  }

  // Rotate a 4-element port array [N, E, S, W] 90 degrees clockwise
  function rotatePortsCW(ports) {
    return [ports[3], ports[0], ports[1], ports[2]];
  }

  // Generate a balanced conduit port array [N, E, S, W] (at least 2-3 open ports)
  function randomPorts(forceThreePlus = false) {
    const templates = forceThreePlus
      ? [
          [1, 1, 1, 0],
          [0, 1, 1, 1],
          [1, 0, 1, 1],
          [1, 1, 0, 1],
          [1, 1, 1, 1]
        ]
      : [
          [1, 0, 1, 0], // Straight N-S
          [0, 1, 0, 1], // Straight E-W
          [1, 1, 0, 0], // Elbow N-E
          [0, 1, 1, 0], // Elbow E-S
          [0, 0, 1, 1], // Elbow S-W
          [1, 0, 0, 1], // Elbow W-N
          [1, 1, 1, 0], // T-junction
          [0, 1, 1, 1], // T-junction
          [1, 0, 1, 1], // T-junction
          [1, 1, 0, 1], // T-junction
          [1, 1, 1, 1]  // Crossroad
        ];
    return [...templates[Math.floor(Math.random() * templates.length)]];
  }

  function randomReagent() {
    const bag = ['sulfur', 'sulfur', 'mercury', 'mercury', 'cinder', 'cinder', 'salt'];
    return bag[Math.floor(Math.random() * bag.length)];
  }

  // Main Game State
  const state = {
    sectorIndex: 0,
    turn: 1,
    hull: 3,
    maxHull: 3,
    energy: 3,
    maxEnergy: 3,
    freeNudgeAvailable: true,
    pressure: 64, // Start right in Zone 88!
    gold: 120,
    score: 0,
    overclockActive: false,
    enemiesRemainingToSpawn: 0,
    grid: [], // 4x4 array of tile objects
    runes: Array.from({ length: 4 }, () => Array(4).fill(null)), // Permanent floor runes
    deck: ['shift', 'shift', 'rotate', 'rotate', 'bellows', 'transmute', 'overclock'],
    hand: [],
    selectedTool: null, // null | 'free_nudge' | { cardIndex, cardId }
    swapFirstTile: null,
    undoStack: [],
    hoverTarget: null, // { type: 'tile'|'shift'|'rotate', ... }
    activeEval: null,
    animating: false,
    surgeParticles: [],
    floatingTexts: [],
    rainDrops: Array.from({ length: 42 }, () => ({
      x: Math.random() * 920,
      y: Math.random() * 540,
      len: 10 + Math.random() * 14,
      speed: 4 + Math.random() * 4
    })),
    steamPuffs: [],
    time: 0
  };

  function cloneGrid(grid) {
    return grid.map(row =>
      row.map(cell => ({
        ports: [...cell.ports],
        occupant: cell.occupant ? { ...cell.occupant } : null
      }))
    );
  }

  function saveUndoSnapshot() {
    state.undoStack.push({
      grid: cloneGrid(state.grid),
      energy: state.energy,
      freeNudgeAvailable: state.freeNudgeAvailable,
      pressure: state.pressure,
      overclockActive: state.overclockActive,
      hand: state.hand.map(c => ({ ...c }))
    });
    if (state.undoStack.length > 10) state.undoStack.shift();
  }

  function restoreUndoSnapshot() {
    if (state.animating || state.undoStack.length === 0) return;
    const snap = state.undoStack.pop();
    state.grid = snap.grid;
    state.energy = snap.energy;
    state.freeNudgeAvailable = snap.freeNudgeAvailable;
    state.pressure = snap.pressure;
    state.overclockActive = snap.overclockActive;
    state.hand = snap.hand;
    state.selectedTool = null;
    state.swapFirstTile = null;
    window.kilnAudio.playCardTick();
    recalculateAndSyncUI();
  }

  function createEnemy(sectorIdx, forceBoss = false) {
    if (forceBoss) {
      return {
        kind: 'enemy',
        enemyType: 'boss',
        name: 'Arch-Horologist',
        hp: 26,
        maxHp: 26,
        heatPerTurn: 10,
        clamped: false
      };
    }
    const roll = Math.random();
    if (sectorIdx >= 1 && roll < 0.28) {
      return {
        kind: 'enemy',
        enemyType: 'golem',
        name: 'Clamp-Golem',
        hp: 7 + sectorIdx * 2,
        maxHp: 7 + sectorIdx * 2,
        heatPerTurn: 8,
        clamped: true
      };
    } else if (roll < 0.56) {
      return {
        kind: 'enemy',
        enemyType: 'bomber',
        name: 'Spark-Bomber',
        hp: 4 + sectorIdx,
        maxHp: 4 + sectorIdx,
        heatPerTurn: 6,
        clamped: false
      };
    }
    return {
      kind: 'enemy',
      enemyType: 'walker',
      name: 'Rust-Walker',
      hp: 5 + sectorIdx * 2,
      maxHp: 5 + sectorIdx * 2,
      heatPerTurn: 7,
      clamped: false
    };
  }

  function initSector(sectorIdx) {
    state.sectorIndex = sectorIdx;
    state.turn = 1;
    state.undoStack = [];
    state.overclockActive = false;
    state.selectedTool = null;
    state.swapFirstTile = null;

    const sec = SECTORS[sectorIdx];
    // Build fresh 4x4 grid with high connectivity
    state.grid = Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 4 }, (__, c) => {
        const isCenter = (r === 1 || r === 2) && (c === 1 || c === 2);
        const rune = state.runes[r][c];
        return {
          ports: rune === 'omni' ? [1, 1, 1, 1] : randomPorts(isCenter),
          occupant: { kind: 'reagent', type: randomReagent() }
        };
      })
    );

    // Spawn initial wave of Automata (2 to 3 on the board immediately, rest in reserve)
    const initialOnBoard = Math.min(3, sec.enemyCount);
    state.enemiesRemainingToSpawn = sec.enemyCount - initialOnBoard;

    const coords = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) coords.push([r, c]);
    }
    coords.sort(() => Math.random() - 0.5);

    for (let i = 0; i < initialOnBoard; i++) {
      const [r, c] = coords[i];
      const isBoss = sec.boss && i === 0;
      state.grid[r][c].occupant = createEnemy(sectorIdx, isBoss);
    }

    startTurn();
  }

  function startTurn() {
    state.energy = state.maxEnergy;
    state.freeNudgeAvailable = true;
    state.overclockActive = false;
    state.selectedTool = null;
    state.swapFirstTile = null;
    state.undoStack = [];

    // Draw 4 cards from deck (cycling shuffle)
    const pool = [...state.deck].sort(() => Math.random() - 0.5);
    state.hand = pool.slice(0, 4).map((id, idx) => ({
      uid: `${state.turn}-${idx}-${id}`,
      id,
      used: false
    }));

    recalculateAndSyncUI();
  }

  // Evaluate connected routes & alchemical recipes across the 4x4 grid
  function evaluateBoardRoutes() {
    const visited = Array.from({ length: 4 }, () => Array(4).fill(false));
    const components = [];
    const edges = [];

    function areConnected(r1, c1, r2, c2, dirIdx) {
      const t1 = state.grid[r1][c1];
      const t2 = state.grid[r2][c2];
      const oppIdx = DIRS[dirIdx].opp;
      // Mutual port connection
      if (t1.ports[dirIdx] && t2.ports[oppIdx]) return true;
      // Or if either tile has an Omni-Cross (all 4 ports) and the other has at least 2 ports
      const isOmni1 = t1.ports.every(Boolean) || state.runes[r1][c1] === 'omni';
      const isOmni2 = t2.ports.every(Boolean) || state.runes[r2][c2] === 'omni';
      if ((isOmni1 && t2.ports[oppIdx]) || (isOmni2 && t1.ports[dirIdx])) return true;
      return false;
    }

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (visited[r][c]) continue;
        const queue = [[r, c]];
        visited[r][c] = true;
        const comp = [];

        while (queue.length > 0) {
          const [cr, cc] = queue.shift();
          comp.push([cr, cc]);
          DIRS.forEach((d, dirIdx) => {
            const nr = cr + d.dr;
            const nc = cc + d.dc;
            if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
              if (areConnected(cr, cc, nr, nc, dirIdx)) {
                if (cr < nr || (cr === nr && cc < nc)) {
                  edges.push({ r1: cr, c1: cc, r2: nr, c2: nc });
                }
                if (!visited[nr][nc]) {
                  visited[nr][nc] = true;
                  queue.push([nr, nc]);
                }
              }
            }
          });
        }
        if (comp.length >= 2) {
          components.push(comp);
        }
      }
    }

    // Also check for 3-in-a-row matching reagent alignments or Trio lines (Calcination bonus!)
    const lineTiles = new Set();
    for (let r = 0; r < 4; r++) {
      for (let startC = 0; startC <= 1; startC++) {
        const slice = [0, 1, 2].map(dc => state.grid[r][startC + dc].occupant);
        if (isCalcinationTrio(slice)) {
          [0, 1, 2].forEach(dc => lineTiles.add(`${r},${startC + dc}`));
        }
      }
    }
    for (let c = 0; c < 4; c++) {
      for (let startR = 0; startR <= 1; startR++) {
        const slice = [0, 1, 2].map(dr => state.grid[startR + dr][c].occupant);
        if (isCalcinationTrio(slice)) {
          [0, 1, 2].forEach(dr => lineTiles.add(`${startR + dr},${c}`));
        }
      }
    }

    // Choose all components of size >= 3 (plus any 3-in-a-row line tiles) as the Active Surge Network
    components.sort((a, b) => b.length - a.length);
    const activeSet = new Set();
    components.forEach((comp, idx) => {
      if (comp.length >= 3 || idx === 0) {
        comp.forEach(([r, c]) => activeSet.add(`${r},${c}`));
      }
    });
    lineTiles.forEach(key => activeSet.add(key));

    const activeCoords = Array.from(activeSet).map(k => k.split(',').map(Number));

    // Check Recipes:
    // 1. Calcination Line: 3+ active tiles in same row/col OR Sulfur + Mercury + Cinder all present in activeCoords
    const reagentTypesPresent = new Set();
    const rowCounts = [0, 0, 0, 0];
    const colCounts = [0, 0, 0, 0];

    activeCoords.forEach(([r, c]) => {
      rowCounts[r]++;
      colCounts[c]++;
      const occ = state.grid[r][c].occupant;
      if (occ && occ.kind === 'reagent') {
        reagentTypesPresent.add(occ.type);
      }
    });

    const hasTrioElements =
      (reagentTypesPresent.has('sulfur') &&
        reagentTypesPresent.has('mercury') &&
        reagentTypesPresent.has('cinder')) ||
      (reagentTypesPresent.has('salt') && reagentTypesPresent.size >= 3);

    const hasStraightThree =
      rowCounts.some(cnt => cnt >= 3) ||
      colCounts.some(cnt => cnt >= 3) ||
      lineTiles.size >= 3;

    const recipeCalcination = activeCoords.length >= 3 && (hasStraightThree || hasTrioElements);

    // 2. Solar Loop: Any 2x2 block fully inside activeSet
    let recipeSolarLoop = false;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (
          activeSet.has(`${r},${c}`) &&
          activeSet.has(`${r + 1},${c}`) &&
          activeSet.has(`${r},${c + 1}`) &&
          activeSet.has(`${r + 1},${c + 1}`)
        ) {
          recipeSolarLoop = true;
        }
      }
    }

    // 3. Philosopher's Chain (ROUTE // 88): 5 or more linked tiles in the main component
    const maxCompLen = components.length > 0 ? components[0].length : activeCoords.length;
    const recipePhilosopher = maxCompLen >= 5 || activeCoords.length >= 6;

    // Tally Base Damage, Gold, Pressure Delta, and Multipliers
    let baseDmg = activeCoords.length >= 2 ? 3 : 0;
    let goldGain = 0;
    let pressureDelta = 0;
    let mult = 1.0;

    activeCoords.forEach(([r, c]) => {
      const occ = state.grid[r][c].occupant;
      const rune = state.runes[r][c];
      const nodeMult = rune === '2x' ? 2 : 1;

      if (rune === 'cryo') pressureDelta -= 8;
      if (rune === 'gold') goldGain += 35;

      if (occ && occ.kind === 'reagent') {
        if (occ.type === 'sulfur') {
          baseDmg += 4 * nodeMult;
          goldGain += 25 * nodeMult;
        } else if (occ.type === 'mercury') {
          baseDmg += 2 * nodeMult;
          pressureDelta -= 12 * nodeMult;
        } else if (occ.type === 'cinder') {
          baseDmg += 3 * nodeMult;
          pressureDelta += 10;
          mult *= nodeMult > 1 ? 1.8 : 1.45;
        } else if (occ.type === 'salt') {
          baseDmg += 3 * nodeMult;
          goldGain += 35 * nodeMult;
          pressureDelta -= 5;
        }
      } else if (occ && occ.kind === 'enemy') {
        baseDmg += 2 * nodeMult;
      }
    });

    if (recipeCalcination) {
      mult *= 1.6;
      pressureDelta -= 10;
      goldGain += 25;
    }
    if (recipeSolarLoop) {
      mult *= 1.8;
      goldGain += 35;
    }
    if (recipePhilosopher) {
      mult *= 2.2;
      goldGain += 50;
    }

    // Zone 88 Thermal Resonance Bonus (60% - 88%)
    const inZone88 = state.pressure >= 60 && state.pressure <= 88;
    if (inZone88) {
      mult *= 1.5;
      goldGain = Math.round(goldGain * 1.5);
    }

    if (state.overclockActive) {
      mult *= 2.0;
    }

    const totalSurgeDmg = Math.max(0, Math.round(baseDmg * mult));

    // Determine which Automata are hit (Direct on route = 100% DMG; Orthogonal neighbor to route = 75% Arc Splash DMG)
    const enemyHits = [];
    const hasMercuryOrCinder =
      reagentTypesPresent.has('mercury') ||
      reagentTypesPresent.has('cinder') ||
      reagentTypesPresent.has('salt');

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const occ = state.grid[r][c].occupant;
        if (occ && occ.kind === 'enemy') {
          const onRoute = activeSet.has(`${r},${c}`);
          let nearRoute = false;
          DIRS.forEach(d => {
            if (activeSet.has(`${r + d.dr},${c + d.dc}`)) nearRoute = true;
          });

          if (onRoute && totalSurgeDmg > 0) {
            enemyHits.push({ r, c, dmg: totalSurgeDmg, direct: true });
          } else if (nearRoute && totalSurgeDmg > 0) {
            const splashRatio = hasMercuryOrCinder ? 1.0 : 0.7;
            enemyHits.push({
              r,
              c,
              dmg: Math.max(2, Math.round(totalSurgeDmg * splashRatio)),
              direct: false
            });
          }
        }
      }
    }

    return {
      activeSet,
      activeCoords,
      edges,
      recipeCalcination,
      recipeSolarLoop,
      recipePhilosopher,
      inZone88,
      totalSurgeDmg,
      goldGain,
      pressureDelta,
      enemyHits
    };
  }

  function isCalcinationTrio(slice) {
    if (slice.some(s => !s)) return false;
    const reagentSlice = slice.filter(s => s.kind === 'reagent');
    if (reagentSlice.length === 3) {
      const types = new Set(reagentSlice.map(s => s.type));
      // Either 3 of the same OR 3 distinct reagents
      if (types.size === 1 || types.size === 3) return true;
    }
    // Or 2 reagents flanking an Automaton!
    if (
      slice[0].kind === 'reagent' &&
      slice[1].kind === 'enemy' &&
      slice[2].kind === 'reagent'
    ) {
      return true;
    }
    return false;
  }

  // Board Operations: Shift Row/Col, Rotate 2x2, Steam Bellows, Transmute, Swap
  function shiftLine(isRow, index, delta) {
    if ( isRow ) {
      const row = state.grid[index];
      if (delta > 0) {
        const last = row.pop();
        row.unshift(last);
      } else {
        const first = row.shift();
        row.push(first);
      }
    } else {
      const col = [0, 1, 2, 3].map(r => state.grid[r][index]);
      if (delta > 0) {
        const last = col.pop();
        col.unshift(last);
      } else {
        const first = col.shift();
        col.push(first);
      }
      for (let r = 0; r < 4; r++) {
        state.grid[r][index] = col[r];
      }
    }
    window.kilnAudio.playRowSlide();
  }

  function rotateQuadrant2x2(tlRow, tlCol, clockwise = true) {
    // Check if any Clamp-Golem inside this 2x2 is currently clamping it
    const coords = [
      [tlRow, tlCol],
      [tlRow, tlCol + 1],
      [tlRow + 1, tlCol + 1],
      [tlRow + 1, tlCol]
    ];
    for (const [r, c] of coords) {
      const occ = state.grid[r][c].occupant;
      if (occ && occ.kind === 'enemy' && occ.clamped) {
        spawnFloatingText(
          r,
          c,
          '🔒 CLAMPED! USE SHIFT OR BELLOWS!',
          '#ff2a85'
        );
        window.kilnAudio.playAutomatonBlast();
        return false;
      }
    }

    const cells = coords.map(([r, c]) => state.grid[r][c]);
    if (clockwise) {
      // Top-Left -> Top-Right -> Bottom-Right -> Bottom-Left
      const rotated = [cells[3], cells[0], cells[1], cells[2]].map(cell => ({
        ...cell,
        ports: rotatePortsCW(cell.ports)
      }));
      coords.forEach(([r, c], idx) => {
        state.grid[r][c] = rotated[idx];
      });
    } else {
      const rotated = [cells[1], cells[2], cells[3], cells[0]].map(cell => ({
        ...cell,
        ports: rotatePortsCW(rotatePortsCW(rotatePortsCW(cell.ports)))
      }));
      coords.forEach(([r, c], idx) => {
        state.grid[r][c] = rotated[idx];
      });
    }
    window.kilnAudio.playGearRotate();
    return true;
  }

  function triggerSteamBellows(isRow, index) {
    window.kilnAudio.playSteamVent();
    state.pressure = Math.max(0, state.pressure - 20);
    // Shift line AND deal 4 Crush Damage + break Clamp locks on all enemies in that row/col
    shiftLine(isRow, index, 1);
    for (let i = 0; i < 4; i++) {
      const r = isRow ? index : i;
      const c = isRow ? i : index;
      const occ = state.grid[r][c].occupant;
      // Add steam puff visuals
      const pt = gridToScreen(r, c);
      for (let p = 0; p < 6; p++) {
        state.steamPuffs.push({
          x: pt.x + (Math.random() - 0.5) * 30,
          y: pt.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 2,
          vy: -1.5 - Math.random() * 2,
          radius: 8 + Math.random() * 10,
          alpha: 0.85
        });
      }
      if (occ && occ.kind === 'enemy') {
        occ.clamped = false;
        occ.hp -= 4;
        spawnFloatingText(r, c, '💨 CRUSH -4 HP!', '#00f5ff');
        if (occ.hp <= 0) {
          handleEnemyDefeat(r, c, occ);
        }
      }
    }
  }

  function triggerTransmuteTile(r, c) {
    const cell = state.grid[r][c];
    cell.ports = [1, 1, 1, 1]; // Upgrade conduit to 4-way Omni-Cross!
    const cycle = ['sulfur', 'mercury', 'cinder', 'salt'];
    if (cell.occupant && cell.occupant.kind === 'reagent') {
      const nextIdx = (cycle.indexOf(cell.occupant.type) + 1) % cycle.length;
      cell.occupant.type = cycle[nextIdx];
      spawnFloatingText(
        r,
        c,
        `╋ ${cell.occupant.type.toUpperCase()}!`,
        '#ffb800'
      );
    } else if (cell.occupant && cell.occupant.kind === 'enemy') {
      cell.occupant.clamped = false;
      cell.occupant.hp -= 3;
      spawnFloatingText(r, c, '╋ SHOCK -3 HP!', '#ff2a85');
      if (cell.occupant.hp <= 0) {
        handleEnemyDefeat(r, c, cell.occupant);
      }
    }
    window.kilnAudio.playRecipeFanfare();
  }

  function handleEnemyDefeat(r, c, enemy) {
    window.kilnAudio.playAutomatonBlast();
    const bounty = enemy.enemyType === 'boss' ? 200 : enemy.enemyType === 'golem' ? 65 : 45;
    state.gold += bounty;
    state.score += bounty * 3;
    spawnFloatingText(r, c, `💥 SCRAPPED +$${bounty}!`, '#ffb800');

    // If Spark-Bomber, detonate 4 damage to orthogonal neighbors!
    const wasBomber = enemy.enemyType === 'bomber';
    state.grid[r][c].occupant = {
      kind: 'reagent',
      type: wasBomber ? 'cinder' : 'salt'
    };

    if (wasBomber) {
      DIRS.forEach(d => {
        const nr = r + d.dr;
        const nc = c + d.dc;
        if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
          const nOcc = state.grid[nr][nc].occupant;
          if (nOcc && nOcc.kind === 'enemy') {
            nOcc.hp -= 4;
            spawnFloatingText(nr, nc, '💣 BLAST -4!', '#ff2a85');
            if (nOcc.hp <= 0) {
              handleEnemyDefeat(nr, nc, nOcc);
            }
          }
        }
      });
    }
  }

  // Spend resource (either selected card, Free Nudge, or auto-matched hand card)
  function tryConsumeForBoardAction(actionType, executeCallback) {
    if (state.animating) return;

    // 1. Check if player explicitly selected a matching tool
    if (state.selectedTool === 'free_nudge') {
      if (!state.freeNudgeAvailable) return;
      saveUndoSnapshot();
      if (executeCallback() !== false) {
        state.freeNudgeAvailable = false;
        state.selectedTool = null;
        recalculateAndSyncUI();
      } else {
        state.undoStack.pop();
      }
      return;
    }

    if (state.selectedTool && state.selectedTool.cardId) {
      const cardSlot = state.hand[state.selectedTool.cardIndex];
      const def = CARD_LIBRARY[state.selectedTool.cardId];
      if (!cardSlot || cardSlot.used || state.energy < def.cost) return;

      saveUndoSnapshot();
      if (executeCallback(state.selectedTool.cardId) !== false) {
        cardSlot.used = true;
        state.energy -= def.cost;
        state.selectedTool = null;
        recalculateAndSyncUI();
      } else {
        state.undoStack.pop();
      }
      return;
    }

    // 2. Direct Board Click Auto-Resolution:
    // Prefer Free Nudge first so cards/energy are saved, or use matching card in hand!
    if (state.freeNudgeAvailable) {
      saveUndoSnapshot();
      if (executeCallback('free_nudge') !== false) {
        state.freeNudgeAvailable = false;
        recalculateAndSyncUI();
      } else {
        state.undoStack.pop();
      }
      return;
    }

    const matchingCardIdx = state.hand.findIndex(
      c => !c.used && c.id === actionType && state.energy >= CARD_LIBRARY[c.id].cost
    );
    if (matchingCardIdx !== -1) {
      const cardSlot = state.hand[matchingCardIdx];
      const def = CARD_LIBRARY[cardSlot.id];
      saveUndoSnapshot();
      if (executeCallback(cardSlot.id) !== false) {
        cardSlot.used = true;
        state.energy -= def.cost;
        recalculateAndSyncUI();
      } else {
        state.undoStack.pop();
      }
    } else {
      // Flash hint
      const hintEl = document.getElementById('board-hint');
      hintEl.innerHTML = `<span class="accent-magenta">⚠️ No ${actionType.toUpperCase()} card or Free Nudge remaining! Pull <strong>[IGNITE ▶]</strong> or click <strong>[↶ UNDO]</strong>.</span>`;
    }
  }

  // Pull [IGNITE ▶]: Execute the 88 MPH Neon Surge along the active route!
  async function executeIgniteSequence() {
    if (state.animating) return;
    state.animating = true;
    state.selectedTool = null;
    state.swapFirstTile = null;

    const evalRes = evaluateBoardRoutes();
    const bannerEl = document.getElementById('combo-banner');
    const titleEl = document.getElementById('combo-title');
    const subEl = document.getElementById('combo-sub');

    // Show Combo Banner if any recipe or Zone 88 triggered
    const recipesTriggered = [];
    if (evalRes.recipePhilosopher) recipesTriggered.push('ROUTE // 88 OVERDRIVE (3.0x)');
    if (evalRes.recipeSolarLoop) recipesTriggered.push('SOLAR LOOP (2.2x +1E)');
    if (evalRes.recipeCalcination) recipesTriggered.push('CALCINATION LINE (1.8x)');

    if (recipesTriggered.length > 0 || evalRes.activeCoords.length >= 3) {
      window.kilnAudio.playRecipeFanfare();
      titleEl.textContent =
        recipesTriggered[0] || `⚡ NEON CONDUIT SURGE (${evalRes.activeCoords.length} NODES)`;
      subEl.textContent = `${evalRes.totalSurgeDmg} SURGE DMG // +$${evalRes.goldGain} GOLD // ${
        evalRes.pressureDelta >= 0 ? '+' : ''
      }${evalRes.pressureDelta}% PRESSURE`;
      bannerEl.classList.remove('hidden');
    }

    // Step-by-step 88 MPH Surge Hop along activeCoords
    for (let i = 0; i < evalRes.activeCoords.length; i++) {
      const [r, c] = evalRes.activeCoords[i];
      const pt = gridToScreen(r, c);
      window.kilnAudio.playRouteHop(i);

      for (let p = 0; p < 10; p++) {
        const angle = (Math.PI * 2 * p) / 10;
        state.surgeParticles.push({
          x: pt.x,
          y: pt.y - 10,
          vx: Math.cos(angle) * (2 + Math.random() * 2.5),
          vy: Math.sin(angle) * (2 + Math.random() * 2.5) - 1,
          color: i % 2 === 0 ? '#00f5ff' : '#ffb800',
          life: 1.0
        });
      }
      await sleep(75);
    }

    // Apply gold, score, and pressure delta
    state.gold += evalRes.goldGain;
    state.score += evalRes.totalSurgeDmg * 10 + evalRes.goldGain * 2;
    state.pressure = Math.max(0, Math.min(100, state.pressure + evalRes.pressureDelta));

    // Apply damage to all hit Automata
    for (const hit of evalRes.enemyHits) {
      const occ = state.grid[hit.r][hit.c].occupant;
      if (occ && occ.kind === 'enemy') {
        occ.hp -= hit.dmg;
        if (evalRes.recipeCalcination) occ.clamped = false;
        spawnFloatingText(
          hit.r,
          hit.c,
          `${hit.direct ? '⚡' : '💧'} -${hit.dmg} HP!`,
          hit.direct ? '#ffb800' : '#00f5ff'
        );
        if (occ.hp <= 0) {
          handleEnemyDefeat(hit.r, hit.c, occ);
        }
      }
    }

    // Cycle consumed reagents on the active route into fresh random reagents & rotated pipes
    evalRes.activeCoords.forEach(([r, c]) => {
      const cell = state.grid[r][c];
      if (cell.occupant && cell.occupant.kind === 'reagent') {
        cell.occupant.type = randomReagent();
        if (state.runes[r][c] !== 'omni') {
          cell.ports = rotatePortsCW(cell.ports);
        }
      }
    });

    await sleep(380);
    bannerEl.classList.add('hidden');

    // Check if all enemies in this Sector are cleared!
    const enemiesOnBoard = countEnemiesOnBoard();
    if (enemiesOnBoard === 0 && state.enemiesRemainingToSpawn === 0) {
      state.animating = false;
      recalculateAndSyncUI();
      onSectorCleared();
      return;
    }

    // Surviving Automata act: generate Boiler Heat and shift/march
    let survivingHeat = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const occ = state.grid[r][c].occupant;
        if (occ && occ.kind === 'enemy') {
          survivingHeat += occ.heatPerTurn;
          if (occ.enemyType === 'boss') {
            // Arch-Horologist shifts a random row!
            shiftLine(true, r, 1);
          }
        }
      }
    }

    if (survivingHeat > 0) {
      state.pressure = Math.min(100, state.pressure + survivingHeat);
    }

    // Check Boiler Rupture at 100% Pressure
    if (state.pressure >= 100) {
      state.hull -= 1;
      state.pressure = 48;
      window.kilnAudio.playAutomatonBlast();
      spawnFloatingText(1, 1, '💥 BOILER OVERLOAD! -1 HULL!', '#ff2a85');
      if (state.hull <= 0) {
        state.animating = false;
        recalculateAndSyncUI();
        showEndModal(false);
        return;
      }
    }

    // Spawn reinforcement Automaton if reserve remains and fewer than 3 enemies on board
    if (state.enemiesRemainingToSpawn > 0 && countEnemiesOnBoard() < 3) {
      const reagentCoords = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (state.grid[r][c].occupant && state.grid[r][c].occupant.kind === 'reagent') {
            reagentCoords.push([r, c]);
          }
        }
      }
      if (reagentCoords.length > 0) {
        const [sr, sc] = reagentCoords[Math.floor(Math.random() * reagentCoords.length)];
        state.grid[sr][sc].occupant = createEnemy(state.sectorIndex, false);
        state.enemiesRemainingToSpawn--;
        spawnFloatingText(sr, sc, '⚠️ NEW AUTOMATON!', '#ff2a85');
      }
    }

    state.turn += 1;
    state.animating = false;
    startTurn();
    if (evalRes.recipeSolarLoop) {
      state.energy += 1;
      recalculateAndSyncUI();
    }
  }

  function countEnemiesOnBoard() {
    let count = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const occ = state.grid[r][c].occupant;
        if (occ && occ.kind === 'enemy') count++;
      }
    }
    return count;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function spawnFloatingText(r, c, text, color) {
    const pt = gridToScreen(r, c);
    state.floatingTexts.push({
      x: pt.x,
      y: pt.y - 24,
      text,
      color,
      alpha: 1.0,
      vy: -0.9
    });
  }

  // Night-Market Shop between Sectors
  function onSectorCleared() {
    window.kilnAudio.playRecipeFanfare();
    if (state.sectorIndex >= SECTORS.length - 1) {
      showEndModal(true);
      return;
    }

    const modal = document.getElementById('shop-modal');
    document.getElementById('shop-gold-val').textContent = `$${state.gold}`;

    // 1. Populate 3 Free Draft Cards
    const draftRow = document.getElementById('shop-draft-row');
    draftRow.innerHTML = '';
    const draftOptions = ['bellows', 'transmute', 'overclock', 'magnet', 'cryo']
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    let drafted = false;
    draftOptions.forEach(cardId => {
      const def = CARD_LIBRARY[cardId];
      const el = document.createElement('div');
      el.className = 'shop-item';
      el.innerHTML = `
        <div class="card-top">
          <span>${def.icon} ${def.name}</span>
          <span class="card-cost">FREE DRAFT</span>
        </div>
        <div class="card-desc">${def.desc}</div>
      `;
      el.addEventListener('click', () => {
        if (drafted) return;
        drafted = true;
        state.deck.push(cardId);
        el.classList.add('purchased');
        el.querySelector('.card-cost').textContent = '✓ ADDED TO DECK';
        window.kilnAudio.playRecipeFanfare();
      });
      draftRow.appendChild(el);
    });

    // 2. Populate Permanent Crucible Floor Runes & Hull Repair
    const runesRow = document.getElementById('shop-runes-row');
    runesRow.innerHTML = '';
    const runeOffers = [
      {
        id: '2x',
        name: '🔷 2X ROUTE NODE RUNE',
        cost: 100,
        desc: 'Etches a permanent 2X Damage & Gold multiplier rune onto a random center tile.'
      },
      {
        id: 'omni',
        name: '╋ OMNI-CONDUIT RUNE',
        cost: 85,
        desc: 'Permanently etches an indestructible 4-Way Crossroad Conduit onto a tile.'
      },
      {
        id: 'cryo',
        name: '❄️ CRYO-VENT RUNE',
        cost: 90,
        desc: 'Etches a cooling vent tile that automatically vents -8% Pressure whenever linked.'
      },
      {
        id: 'repair',
        name: '♥ HULL CORE REPAIR',
        cost: 110,
        desc: 'Restore +1 Kiln Hull Integrity (up to 3 max).'
      }
    ];

    runeOffers.forEach(offer => {
      const el = document.createElement('div');
      el.className = 'shop-item';
      el.innerHTML = `
        <div class="card-top">
          <span>${offer.name}</span>
          <span class="card-cost">$${offer.cost}</span>
        </div>
        <div class="card-desc">${offer.desc}</div>
      `;
      el.addEventListener('click', () => {
        if (el.classList.contains('purchased') || state.gold < offer.cost) return;
        if (offer.id === 'repair' && state.hull >= state.maxHull) return;

        state.gold -= offer.cost;
        document.getElementById('shop-gold-val').textContent = `$${state.gold}`;
        el.classList.add('purchased');
        el.querySelector('.card-cost').textContent = '✓ ETCHED';
        window.kilnAudio.playRecipeFanfare();

        if (offer.id === 'repair') {
          state.hull = Math.min(state.maxHull, state.hull + 1);
        } else {
          // Etch onto an un-etched tile (preferring center 2x2 first)
          const candidates = [
            [1, 1],
            [1, 2],
            [2, 1],
            [2, 2],
            [0, 1],
            [1, 0],
            [2, 3],
            [3, 2]
          ];
          const target =
            candidates.find(([r, c]) => !state.runes[r][c]) || [
              Math.floor(Math.random() * 4),
              Math.floor(Math.random() * 4)
            ];
          state.runes[target[0]][target[1]] = offer.id;
        }
        recalculateAndSyncUI();
      });
      runesRow.appendChild(el);
    });

    modal.classList.remove('hidden');
  }

  function showEndModal(victory) {
    const modal = document.getElementById('end-modal');
    document.getElementById('end-title').textContent = victory
      ? '🏆 GRAND CHRONO-KILN MASTERED!'
      : '💥 BOILER CORE RUPTURED!';
    document.getElementById('end-subtitle').textContent = victory
      ? 'You conquered all 5 Night-Market Sectors at 88 MPH!'
      : 'The Clockwork Automata overheated the furnace.';
    document.getElementById('end-stats').innerHTML = `
      <div>Final Score: <strong class="accent-cyan">${state.score}</strong></div>
      <div>Sector Reached: <strong class="accent-gold">${SECTORS[state.sectorIndex].name}</strong></div>
      <div>Gold Forged: <strong class="accent-gold">$${state.gold}</strong></div>
      <div>Gear-Loop Deck Size: <strong>${state.deck.length} Cards</strong></div>
    `;
    modal.classList.remove('hidden');
  }

  // Synchronize HTML HUD & Card Dock with current game state
  function recalculateAndSyncUI() {
    state.activeEval = evaluateBoardRoutes();
    const ev = state.activeEval;

    document.getElementById('sector-label').textContent = SECTORS[state.sectorIndex].name;
    document.getElementById('turn-val').textContent = String(state.turn).padStart(2, '0');
    document.getElementById('hull-val').textContent =
      '♥'.repeat(state.hull) + '♡'.repeat(Math.max(0, state.maxHull - state.hull));
    document.getElementById('energy-val').textContent = `${'⚡'.repeat(state.energy)} ${
      state.energy
    }/${state.maxEnergy}`;
    document.getElementById('gold-val').textContent = `$${state.gold}`;
    document.getElementById('score-val').textContent = String(state.score).padStart(4, '0');

    // Pressure Pill & Zone 88 indicator
    const pPill = document.getElementById('pressure-pill');
    const pVal = document.getElementById('pressure-val');
    const pTag = document.getElementById('pressure-zone-tag');
    pVal.textContent = `${state.pressure}%`;
    pPill.classList.remove('zone-88', 'zone-critical');

    if (state.pressure >= 60 && state.pressure <= 88) {
      pPill.classList.add('zone-88');
      pTag.textContent = 'ZONE 88 (1.5x!)';
      pTag.style.background = '#ffb800';
    } else if (state.pressure > 88) {
      pPill.classList.add('zone-critical');
      pTag.textContent = 'CRITICAL (>88%)';
      pTag.style.background = '#ff2a2a';
    } else {
      pTag.textContent = 'STABLE (1.0x)';
      pTag.style.background = '#00f5ff';
    }

    // Telemetry & Recipe Radar
    document.getElementById('tele-length').textContent = `${ev.activeCoords.length} Tiles`;
    document.getElementById('tele-dmg').textContent = `${ev.totalSurgeDmg} DMG${
      state.overclockActive ? ' (2X!)' : ''
    }`;
    document.getElementById('tele-targets').textContent = `${ev.enemyHits.length} Hit`;
    const pDeltaEl = document.getElementById('tele-pressure');
    pDeltaEl.textContent = `${ev.pressureDelta >= 0 ? '+' : ''}${ev.pressureDelta}%`;
    pDeltaEl.style.color = ev.pressureDelta <= 0 ? '#00f5ff' : '#ff2a85';
    document.getElementById('tele-gold').textContent = `+$${ev.goldGain}`;

    document
      .getElementById('rec-calcination')
      .classList.toggle('active', ev.recipeCalcination);
    document.getElementById('rec-solar').classList.toggle('active', ev.recipeSolarLoop);
    document
      .getElementById('rec-philosopher')
      .classList.toggle('active', ev.recipePhilosopher);

    const totalEnemiesLeft = countEnemiesOnBoard() + state.enemiesRemainingToSpawn;
    document.getElementById('enemy-count-badge').textContent = totalEnemiesLeft;

    // Render Card Dock
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    // 0. Always include the innate [🔧 FREE NUDGE] card first!
    const nudgeEl = document.createElement('div');
    const isNudgeSelected = state.selectedTool === 'free_nudge';
    nudgeEl.className = `gear-card card-gold ${isNudgeSelected ? 'selected' : ''} ${
      !state.freeNudgeAvailable ? 'disabled' : ''
    }`;
    nudgeEl.innerHTML = `
      <div class="card-top">
        <span>🔧 FREE WRENCH</span>
        <span class="card-cost">0E</span>
      </div>
      <div class="card-icon-row">⇄ / ↻</div>
      <div class="card-desc">${
        state.freeNudgeAvailable
          ? 'Free 1x Row/Col Shift OR 2x2 Rotate this turn!'
          : 'Used this turn'
      }</div>
    `;
    nudgeEl.addEventListener('click', () => {
      if (!state.freeNudgeAvailable || state.animating) return;
      state.selectedTool = state.selectedTool === 'free_nudge' ? null : 'free_nudge';
      window.kilnAudio.playCardTick();
      recalculateAndSyncUI();
    });
    container.appendChild(nudgeEl);

    // 1..4 Hand Cards
    state.hand.forEach((slot, idx) => {
      const def = CARD_LIBRARY[slot.id];
      const canAfford = !slot.used && state.energy >= def.cost;
      const isSelected =
        state.selectedTool &&
        state.selectedTool.cardIndex === idx &&
        state.selectedTool.cardId === slot.id;

      const cardEl = document.createElement('div');
      cardEl.className = `gear-card ${def.colorClass} ${isSelected ? 'selected' : ''} ${
        !canAfford ? 'disabled' : ''
      }`;
      cardEl.innerHTML = `
        <div class="card-top">
          <span>${def.name}</span>
          <span class="card-cost">${slot.used ? 'USED' : `${def.cost}E`}</span>
        </div>
        <div class="card-icon-row">${def.icon}</div>
        <div class="card-desc">${def.desc}</div>
      `;

      cardEl.addEventListener('click', () => {
        if (!canAfford || state.animating) return;
        window.kilnAudio.playCardTick();

        // Instant cards (Overclock 2X, Cryo-Surge) execute immediately on click!
        if (slot.id === 'overclock') {
          saveUndoSnapshot();
          slot.used = true;
          state.energy -= def.cost;
          state.overclockActive = true;
          state.pressure = Math.min(99, state.pressure + 15);
          spawnFloatingText(1, 1, '🔥 OVERCLOCK 2.0X SURGE!', '#ffb800');
          window.kilnAudio.playRecipeFanfare();
          recalculateAndSyncUI();
          return;
        }
        if (slot.id === 'cryo') {
          saveUndoSnapshot();
          slot.used = true;
          state.energy -= def.cost;
          state.pressure = Math.max(0, state.pressure - 25);
          window.kilnAudio.playSteamVent();
          for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
              const occ = state.grid[r][c].occupant;
              if (occ && occ.kind === 'enemy') {
                occ.hp -= 3;
                occ.clamped = false;
                spawnFloatingText(r, c, '❄️ CRYO -3 HP!', '#00f5ff');
                if (occ.hp <= 0) handleEnemyDefeat(r, c, occ);
              }
            }
          }
          recalculateAndSyncUI();
          return;
        }

        // Targeted cards toggle selection
        if (isSelected) {
          state.selectedTool = null;
          state.swapFirstTile = null;
        } else {
          state.selectedTool = { cardIndex: idx, cardId: slot.id };
          state.swapFirstTile = null;
        }
        recalculateAndSyncUI();
      });

      container.appendChild(cardEl);
    });

    // Update Active Tool indicator
    const toolInd = document.getElementById('selected-tool-indicator');
    if (state.selectedTool === 'free_nudge') {
      toolInd.textContent = 'TOOL: 🔧 FREE NUDGE (Click any Arrow [⇄] or 2x2 Hub [↻])';
    } else if (state.selectedTool && state.selectedTool.cardId) {
      const def = CARD_LIBRARY[state.selectedTool.cardId];
      toolInd.textContent = `TOOL: ${def.icon} ${def.name} (Click target on board)`;
    } else {
      toolInd.textContent = 'DIRECT CONTROL: Click any Arrow [⇄] or 2x2 Gear Hub [↻]';
    }
  }

  // Interactive Hit-Testing on the Isometric Canvas
  function getInteractiveHotspots() {
    const spots = [];

    // 1. 9 Inner 2x2 Rotation Gear Hubs (r = 0..2, c = 0..2)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        // Center of the 4 tiles (r,c), (r+1,c), (r,c+1), (r+1,c+1)
        const p00 = gridToScreen(r, c);
        const p11 = gridToScreen(r + 1, c + 1);
        spots.push({
          type: 'rotate',
          r,
          c,
          x: (p00.x + p11.x) / 2,
          y: (p00.y + p11.y) / 2,
          radius: 17
        });
      }
    }

    // 2. 16 Border Shift Arrows (4 rows x 2 ends + 4 cols x 2 ends)
    for (let i = 0; i < 4; i++) {
      // Row i West end (c = -0.75) -> pushes row East (+1)
      const rw = gridToScreen(i, -0.78);
      spots.push({
        type: 'shift',
        isRow: true,
        index: i,
        delta: 1,
        x: rw.x,
        y: rw.y,
        radius: 16,
        dirAngle: Math.atan2(ISO.th, ISO.tw)
      });
      // Row i East end (c = 3.78) -> pushes row West (-1)
      const re = gridToScreen(i, 3.78);
      spots.push({
        type: 'shift',
        isRow: true,
        index: i,
        delta: -1,
        x: re.x,
        y: re.y,
        radius: 16,
        dirAngle: Math.atan2(-ISO.th, -ISO.tw)
      });

      // Col i North end (r = -0.78) -> pushes col South (+1)
      const cn = gridToScreen(-0.78, i);
      spots.push({
        type: 'shift',
        isRow: false,
        index: i,
        delta: 1,
        x: cn.x,
        y: cn.y,
        radius: 16,
        dirAngle: Math.atan2(ISO.th, -ISO.tw)
      });
      // Col i South end (r = 3.78) -> pushes col North (-1)
      const cs = gridToScreen(3.78, i);
      spots.push({
        type: 'shift',
        isRow: false,
        index: i,
        delta: -1,
        x: cs.x,
        y: cs.y,
        radius: 16,
        dirAngle: Math.atan2(-ISO.th, ISO.tw)
      });
    }

    // 3. 16 Tile Centers (r = 0..3, c = 0..3)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const pt = gridToScreen(r, c);
        spots.push({
          type: 'tile',
          r,
          c,
          x: pt.x,
          y: pt.y,
          radius: 34
        });
      }
    }

    return spots;
  }

  function findHotspotAt(mx, my) {
    const spots = getInteractiveHotspots();
    const toolId =
      state.selectedTool && state.selectedTool.cardId ? state.selectedTool.cardId : null;

    // Prioritize specific hotspot types based on active tool
    if (toolId === 'transmute' || toolId === 'magnet') {
      return spots.find(
        s => s.type === 'tile' && Math.hypot(mx - s.x, my - s.y) <= s.radius
      );
    }
    if (toolId === 'rotate') {
      return spots.find(
        s => s.type === 'rotate' && Math.hypot(mx - s.x, my - s.y) <= s.radius + 6
      );
    }
    if (toolId === 'shift' || toolId === 'bellows') {
      return spots.find(
        s => s.type === 'shift' && Math.hypot(mx - s.x, my - s.y) <= s.radius + 6
      );
    }

    // Default priority: rotate hubs & shift arrows first, then tiles
    for (const s of spots) {
      if (Math.hypot(mx - s.x, my - s.y) <= s.radius) {
        return s;
      }
    }
    return null;
  }

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    state.hoverTarget = findHotspotAt(mx, my);
  });

  canvas.addEventListener('mouseleave', () => {
    state.hoverTarget = null;
  });

  canvas.addEventListener('click', e => {
    if (state.animating) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const spot = findHotspotAt(mx, my);
    if (!spot) return;

    const toolId =
      state.selectedTool && state.selectedTool.cardId ? state.selectedTool.cardId : null;

    if (spot.type === 'shift') {
      if (toolId === 'bellows') {
        tryConsumeForBoardAction('bellows', () => {
          triggerSteamBellows(spot.isRow, spot.index);
          return true;
        });
      } else {
        tryConsumeForBoardAction('shift', () => {
          shiftLine(spot.isRow, spot.index, spot.delta);
          return true;
        });
      }
      return;
    }

    if (spot.type === 'rotate') {
      tryConsumeForBoardAction('rotate', () => {
        return rotateQuadrant2x2(spot.r, spot.c, !e.shiftKey);
      });
      return;
    }

    if (spot.type === 'tile') {
      if (toolId === 'transmute') {
        tryConsumeForBoardAction('transmute', () => {
          triggerTransmuteTile(spot.r, spot.c);
          return true;
        });
      } else if (toolId === 'magnet') {
        if (!state.swapFirstTile) {
          state.swapFirstTile = { r: spot.r, c: spot.c };
          window.kilnAudio.playCardTick();
        } else if (
          state.swapFirstTile.r === spot.r &&
          state.swapFirstTile.c === spot.c
        ) {
          state.swapFirstTile = null;
        } else {
          const first = state.swapFirstTile;
          tryConsumeForBoardAction('magnet', () => {
            const temp = state.grid[first.r][first.c];
            state.grid[first.r][first.c] = state.grid[spot.r][spot.c];
            state.grid[spot.r][spot.c] = temp;
            state.swapFirstTile = null;
            window.kilnAudio.playRowSlide();
            return true;
          });
        }
      } else {
        // Clicking a tile directly rotates its nearest 2x2 hub if hovered or cycles its conduit if Transmute is in hand
        const nr = Math.min(2, spot.r);
        const nc = Math.min(2, spot.c);
        tryConsumeForBoardAction('rotate', () => rotateQuadrant2x2(nr, nc, true));
      }
    }
  });

  // ============================================================================
  // 2.5D ISOMETRIC NEON NIGHT-MARKET FOUNDRY RENDERER (ROUTE 88 STYLE)
  // ============================================================================
  function renderScene() {
    state.time += 0.03;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawNightMarketBackdrop();
    drawBoilerPressureTubes();
    drawIsometricCrucibleFrame();
    drawIsometricGridTiles();
    drawShiftArrowsAndRotateHubs();
    drawParticlesAndFloatingText();

    requestAnimationFrame(renderScene);
  }

  function drawNightMarketBackdrop() {
    // Deep cyber-indigo gradient floor & alley
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#070612');
    bgGrad.addColorStop(0.55, '#120f29');
    bgGrad.addColorStop(1, '#090714');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle isometric street grid lines on the night-market floor
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = -8; i <= 12; i++) {
      ctx.beginPath();
      ctx.moveTo(ISO.cx + i * 70, 80);
      ctx.lineTo(ISO.cx + i * 70 - 500, 540);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ISO.cx + i * 70, 80);
      ctx.lineTo(ISO.cx + i * 70 + 500, 540);
      ctx.stroke();
    }
    ctx.restore();

    // Left Neon Storefront Sign: "KILN // 88 ALCHEMY"
    drawNeonSignBoard(88, 52, 165, 54, '#00f5ff', 'KILN // 88', 'NEON ALCHEMY');
    // Right Neon Storefront Sign: "AUTOMATON REPAIR"
    drawNeonSignBoard(668, 52, 165, 54, '#ff2a85', 'GEAR // LOOP', 'AUTOMATA LAB');

    // Overhead cable with glowing swaying Night-Market Paper Lanterns
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 184, 0, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(230, 28);
    ctx.quadraticCurveTo(460, 68, 690, 28);
    ctx.stroke();

    const lanternXs = [290, 375, 460, 545, 630];
    lanternXs.forEach((lx, idx) => {
      const t = (lx - 230) / 460;
      const ly = 28 + 4 * t * (1 - t) * 40;
      const sway = Math.sin(state.time * 1.4 + idx) * 2.5;

      // Lantern glow
      const glow = ctx.createRadialGradient(lx + sway, ly + 14, 2, lx + sway, ly + 14, 26);
      glow.addColorStop(0, 'rgba(255, 184, 0, 0.85)');
      glow.addColorStop(1, 'rgba(255, 184, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx + sway, ly + 14, 26, 0, Math.PI * 2);
      ctx.fill();

      // Lantern body
      ctx.fillStyle = '#ffb800';
      ctx.strokeStyle = '#ff5500';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(lx + sway, ly + 14, 9, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();

    // Falling neon rain streaks
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.16)';
    ctx.lineWidth = 1;
    state.rainDrops.forEach(drop => {
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 3, drop.y + drop.len);
      ctx.stroke();
      drop.y += drop.speed;
      drop.x -= 0.7;
      if (drop.y > canvas.height) {
        drop.y = -20;
        drop.x = Math.random() * canvas.width;
      }
    });
    ctx.restore();
  }

  function drawNeonSignBoard(x, y, w, h, color, line1, line2) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 26, 0.88)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.strokeRect(x, y, w, h);
    ctx.fillRect(x, y, w, h);

    ctx.font = 'bold 13px "Chakra Petch", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(line1, x + w / 2, y + 23);

    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line2, x + w / 2, y + 41);
    ctx.restore();
  }

  function drawBoilerPressureTubes() {
    const inZone88 = state.pressure >= 60 && state.pressure <= 88;
    const isCrit = state.pressure > 88;
    const tubeColor = isCrit ? '#ff2a2a' : inZone88 ? '#ffb800' : '#00f5ff';

    [38, 882].forEach((tx, idx) => {
      ctx.save();
      const topY = 125;
      const tubeH = 290;
      const tubeW = 28;
      const leftX = tx - tubeW / 2;

      // Brass caps
      ctx.fillStyle = '#b8860b';
      ctx.fillRect(leftX - 4, topY - 10, tubeW + 8, 10);
      ctx.fillRect(leftX - 4, topY + tubeH, tubeW + 8, 12);

      // Glass cylinder
      ctx.fillStyle = 'rgba(8, 12, 26, 0.85)';
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.fillRect(leftX, topY, tubeW, tubeH);
      ctx.strokeRect(leftX, topY, tubeW, tubeH);

      // Zone 88 Sweet Spot bracket (60% to 88% height)
      const y88 = topY + tubeH * (1 - 0.88);
      const y60 = topY + tubeH * (1 - 0.6);
      ctx.fillStyle = 'rgba(255, 184, 0, 0.16)';
      ctx.fillRect(leftX + 2, y88, tubeW - 4, y60 - y88);
      ctx.strokeStyle = '#ffb800';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftX, y88);
      ctx.lineTo(leftX + tubeW, y88);
      ctx.moveTo(leftX, y60);
      ctx.lineTo(leftX + tubeW, y60);
      ctx.stroke();

      // Liquid fill level
      const fillH = Math.max(4, (state.pressure / 100) * tubeH);
      const fillY = topY + tubeH - fillH;
      ctx.fillStyle = tubeColor;
      ctx.shadowColor = tubeColor;
      ctx.shadowBlur = 15;
      ctx.fillRect(leftX + 4, fillY, tubeW - 8, fillH);

      // Steam puff at top of tube
      const puffR = 10 + Math.sin(state.time * 3 + idx) * 3;
      ctx.fillStyle = 'rgba(0, 245, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(tx, topY - 22, puffR, 0, Math.PI * 2);
      ctx.fill();

      // Vertical label
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#cbd8f0';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${state.pressure}%`, tx, topY + tubeH + 26);
      ctx.restore();
    });
  }

  function drawIsometricCrucibleFrame() {
    ctx.save();
    // Outer isometric diamond platform around the 4x4 grid
    const top = gridToScreen(-0.55, -0.55);
    const right = gridToScreen(-0.55, 3.55);
    const bottom = gridToScreen(3.55, 3.55);
    const left = gridToScreen(3.55, -0.55);

    // 3D base rim
    ctx.fillStyle = '#121024';
    ctx.strokeStyle = '#ffb800';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y - 12);
    ctx.lineTo(right.x + 18, right.y);
    ctx.lineTo(bottom.x, bottom.y + 22);
    ctx.lineTo(left.x - 18, left.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner glowing cyan circuit border
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y - 6);
    ctx.lineTo(right.x + 10, right.y);
    ctx.lineTo(bottom.x, bottom.y + 14);
    ctx.lineTo(left.x - 10, left.y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawIsometricGridTiles() {
    const ev = state.activeEval || evaluateBoardRoutes();

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const pt = gridToScreen(r, c);
        const cell = state.grid[r][c];
        const isActiveRoute = ev.activeSet.has(`${r},${c}`);
        const rune = state.runes[r][c];

        // Check if tile is highlighted by hover on a row/col shift or 2x2 rotate hub
        let isHoveredGroup = false;
        if (state.hoverTarget) {
          if (state.hoverTarget.type === 'shift') {
            if (state.hoverTarget.isRow && state.hoverTarget.index === r) isHoveredGroup = true;
            if (!state.hoverTarget.isRow && state.hoverTarget.index === c) isHoveredGroup = true;
          } else if (state.hoverTarget.type === 'rotate') {
            if (
              (r === state.hoverTarget.r || r === state.hoverTarget.r + 1) &&
              (c === state.hoverTarget.c || c === state.hoverTarget.c + 1)
            ) {
              isHoveredGroup = true;
            }
          } else if (
            state.hoverTarget.type === 'tile' &&
            state.hoverTarget.r === r &&
            state.hoverTarget.c === c
          ) {
            isHoveredGroup = true;
          }
        }
        if (
          state.swapFirstTile &&
          state.swapFirstTile.r === r &&
          state.swapFirstTile.c === c
        ) {
          isHoveredGroup = true;
        }

        const w = ISO.tw - 4;
        const h = ISO.th - 2;

        // 1. Draw 3D Isometric Tile Side Extrusion
        ctx.save();
        ctx.fillStyle = isActiveRoute ? '#10344a' : '#141328';
        ctx.beginPath();
        ctx.moveTo(pt.x - w, pt.y);
        ctx.lineTo(pt.x, pt.y + h);
        ctx.lineTo(pt.x + w, pt.y);
        ctx.lineTo(pt.x + w, pt.y + ISO.depth);
        ctx.lineTo(pt.x, pt.y + h + ISO.depth);
        ctx.lineTo(pt.x - w, pt.y + ISO.depth);
        ctx.closePath();
        ctx.fill();

        // 2. Draw Isometric Top Surface
        ctx.fillStyle = isHoveredGroup
          ? 'rgba(255, 184, 0, 0.28)'
          : isActiveRoute
          ? 'rgba(0, 245, 255, 0.16)'
          : '#1c1b36';
        ctx.strokeStyle = isHoveredGroup
          ? '#ffb800'
          : isActiveRoute
          ? '#00f5ff'
          : 'rgba(138, 153, 184, 0.4)';
        ctx.lineWidth = isActiveRoute || isHoveredGroup ? 2 : 1.2;

        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y - h);
        ctx.lineTo(pt.x + w, pt.y);
        ctx.lineTo(pt.x, pt.y + h);
        ctx.lineTo(pt.x - w, pt.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Draw Permanent Floor Rune Badge if present
        if (rune) {
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#00f5ff';
          ctx.textAlign = 'center';
          const label =
            rune === '2x' ? '2X NODE' : rune === 'cryo' ? 'CRYO' : rune === 'gold' ? '+$35' : 'OMNI';
          ctx.fillText(label, pt.x, pt.y + h - 8);
        }

        // 4. Draw Glowing Conduit Tracks on the Tile Surface
        // Edge midpoints for N, E, S, W on the isometric diamond:
        const edgeMidpoints = [
          { x: pt.x - w * 0.5, y: pt.y - h * 0.5 }, // 0: N (Up-Left)
          { x: pt.x + w * 0.5, y: pt.y - h * 0.5 }, // 1: E (Up-Right)
          { x: pt.x + w * 0.5, y: pt.y + h * 0.5 }, // 2: S (Down-Right)
          { x: pt.x - w * 0.5, y: pt.y + h * 0.5 }  // 3: W (Down-Left)
        ];

        cell.ports.forEach((open, dirIdx) => {
          if (!open) return;
          const mid = edgeMidpoints[dirIdx];

          // Outer glow line
          ctx.strokeStyle = isActiveRoute ? '#00f5ff' : 'rgba(255, 42, 133, 0.55)';
          ctx.lineWidth = isActiveRoute ? 6 : 3.5;
          ctx.lineCap = 'round';
          if (isActiveRoute) {
            ctx.shadowColor = '#00f5ff';
            ctx.shadowBlur = 12;
          }
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(mid.x, mid.y);
          ctx.stroke();

          // Bright core line
          ctx.shadowBlur = 0;
          ctx.strokeStyle = isActiveRoute ? '#ffffff' : '#ff7ab8';
          ctx.lineWidth = isActiveRoute ? 2.2 : 1.2;
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(mid.x, mid.y);
          ctx.stroke();
        });

        // Center node hub
        ctx.fillStyle = isActiveRoute ? '#00f5ff' : '#ffb800';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 5. Draw Surface Occupant (Reagent Crystal/Flask or Clockwork Automaton)
        if (cell.occupant) {
          drawOccupantSprite(pt.x, pt.y, r, c, cell.occupant, isActiveRoute, ev);
        }
      }
    }
  }

  function drawOccupantSprite(x, y, r, c, occ, isActiveRoute, ev) {
    ctx.save();
    const bob = Math.sin(state.time * 2.2 + r + c) * 2.2;

    if (occ.kind === 'reagent') {
      if (occ.type === 'sulfur') {
        // Golden Sulfur Crystal Cluster
        ctx.fillStyle = '#ffb800';
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ffb800';
        ctx.shadowBlur = isActiveRoute ? 16 : 8;

        // Center crystal spire
        ctx.beginPath();
        ctx.moveTo(x, y - 26 + bob);
        ctx.lineTo(x + 9, y - 8 + bob);
        ctx.lineTo(x, y - 2 + bob);
        ctx.lineTo(x - 9, y - 8 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Side crystal shard
        ctx.beginPath();
        ctx.moveTo(x - 12, y - 18 + bob);
        ctx.lineTo(x - 4, y - 6 + bob);
        ctx.lineTo(x - 10, y - 3 + bob);
        ctx.closePath();
        ctx.fill();
      } else if (occ.type === 'mercury') {
        // Electric Cyan Alchemical Bulb Flask
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = isActiveRoute ? 16 : 8;
        ctx.fillStyle = 'rgba(0, 245, 255, 0.85)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.arc(x, y - 10 + bob, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Flask neck & cork
        ctx.fillStyle = '#d0f8ff';
        ctx.fillRect(x - 3, y - 24 + bob, 6, 6);
        ctx.fillStyle = '#b87333';
        ctx.fillRect(x - 3, y - 27 + bob, 6, 3);
      } else if (occ.type === 'cinder') {
        // Neon Magenta & Orange Cinder Flame Core
        ctx.shadowColor = '#ff2a85';
        ctx.shadowBlur = isActiveRoute ? 18 : 10;
        ctx.fillStyle = '#ff2a85';
        ctx.beginPath();
        ctx.moveTo(x, y - 28 + bob);
        ctx.quadraticCurveTo(x + 14, y - 12 + bob, x, y - 2 + bob);
        ctx.quadraticCurveTo(x - 14, y - 12 + bob, x, y - 28 + bob);
        ctx.fill();

        ctx.fillStyle = '#ffb800';
        ctx.beginPath();
        ctx.arc(x, y - 10 + bob, 5.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (occ.type === 'salt') {
        // Prismatic White Salt Octahedron
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#eef8ff';
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 26 + bob);
        ctx.lineTo(x + 11, y - 13 + bob);
        ctx.lineTo(x, y - 1 + bob);
        ctx.lineTo(x - 11, y - 13 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (occ.kind === 'enemy') {
      // Clockwork Automaton Sprite
      const isBoss = occ.enemyType === 'boss';
      const bodyColor = isBoss
        ? '#ffb800'
        : occ.enemyType === 'golem'
        ? '#90a4ae'
        : occ.enemyType === 'bomber'
        ? '#ff2a85'
        : '#cd7f32';

      ctx.shadowColor = '#ff2a85';
      ctx.shadowBlur = 12;

      // Robot Torso / Head
      const bw = isBoss ? 28 : 22;
      const bh = isBoss ? 26 : 20;
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.fillRect(x - bw / 2, y - bh - 4 + bob, bw, bh);
      ctx.strokeRect(x - bw / 2, y - bh - 4 + bob, bw, bh);

      // Glowing Eyes
      ctx.fillStyle = '#00f5ff';
      ctx.fillRect(x - 6, y - bh + 3 + bob, 4, 4);
      ctx.fillRect(x + 2, y - bh + 3 + bob, 4, 4);

      // Clamp badge if Clamp-Golem
      if (occ.clamped) {
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ff2a85';
        ctx.textAlign = 'center';
        ctx.fillText('🔒CLAMP', x, y + 11);
      }

      // HP Bar above Automaton
      const barW = 36;
      const barH = 6;
      const barY = y - bh - 15 + bob;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(x - barW / 2, barY, barW, barH);
      const hpRatio = Math.max(0, occ.hp / occ.maxHp);
      ctx.fillStyle = hpRatio > 0.5 ? '#00ff9d' : '#ff2a85';
      ctx.fillRect(x - barW / 2 + 1, barY + 1, (barW - 2) * hpRatio, barH - 2);

      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`${occ.hp}HP`, x, barY - 3);

      // Check if targeted by current route preview
      const hitInfo = ev.enemyHits.find(h => h.r === r && h.c === c);
      if (hitInfo) {
        const isKill = hitInfo.dmg >= occ.hp;
        ctx.fillStyle = isKill ? '#ffb800' : '#00f5ff';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(
          isKill ? `⚡KILL (-${hitInfo.dmg})` : `-${hitInfo.dmg} DMG`,
          x,
          barY - 14
        );
      }
    }

    ctx.restore();
  }

  function drawShiftArrowsAndRotateHubs() {
    const spots = getInteractiveHotspots();

    spots.forEach(spot => {
      const isHovered =
        state.hoverTarget &&
        state.hoverTarget.type === spot.type &&
        state.hoverTarget.x === spot.x &&
        state.hoverTarget.y === spot.y;

      if (spot.type === 'rotate') {
        // 2x2 Quadrant Rotation Hub Gear
        ctx.save();
        ctx.translate(spot.x, spot.y);
        ctx.rotate(isHovered ? state.time * 2 : 0);

        ctx.fillStyle = isHovered ? '#ffb800' : 'rgba(16, 20, 38, 0.9)';
        ctx.strokeStyle = isHovered ? '#ffffff' : '#ffb800';
        ctx.lineWidth = isHovered ? 2.2 : 1.5;
        if (isHovered) {
          ctx.shadowColor = '#ffb800';
          ctx.shadowBlur = 12;
        }

        ctx.beginPath();
        ctx.arc(0, 0, isHovered ? 13 : 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillStyle = isHovered ? '#090814' : '#ffb800';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↻', 0, 0.5);
        ctx.restore();
      } else if (spot.type === 'shift') {
        // Border Row/Col Shift Button
        ctx.save();
        ctx.translate(spot.x, spot.y);

        const isBellows =
          state.selectedTool && state.selectedTool.cardId === 'bellows';
        const color = isBellows ? '#ffb800' : '#00f5ff';

        ctx.fillStyle = isHovered ? color : 'rgba(12, 16, 34, 0.88)';
        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 2.2 : 1.4;
        if (isHovered) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
        }

        ctx.beginPath();
        ctx.arc(0, 0, isHovered ? 14 : 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.rotate(spot.dirAngle);
        ctx.fillStyle = isHovered ? '#070610' : color;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(-4, -4.5);
        ctx.lineTo(-4, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    });
  }

  function drawParticlesAndFloatingText() {
    // Surge particles
    for (let i = state.surgeParticles.length - 1; i >= 0; i--) {
      const p = state.surgeParticles[i];
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) state.surgeParticles.splice(i, 1);
    }

    // Steam puffs
    for (let i = state.steamPuffs.length - 1; i >= 0; i--) {
      const s = state.steamPuffs[i];
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = 'rgba(0, 245, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      s.x += s.vx;
      s.y += s.vy;
      s.radius += 0.4;
      s.alpha -= 0.03;
      if (s.alpha <= 0) state.steamPuffs.splice(i, 1);
    }

    // Floating combat / gold text
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();

      ft.y += ft.vy;
      ft.alpha -= 0.022;
      if (ft.alpha <= 0) state.floatingTexts.splice(i, 1);
    }
  }

  // UI Button Listeners & Keyboard Shortcuts
  document.getElementById('btn-ignite').addEventListener('click', () => {
    executeIgniteSequence();
  });

  document.getElementById('btn-undo').addEventListener('click', () => {
    restoreUndoSnapshot();
  });

  document.getElementById('btn-help').addEventListener('click', () => {
    document.getElementById('help-modal').classList.remove('hidden');
  });

  document.getElementById('btn-close-help').addEventListener('click', () => {
    document.getElementById('help-modal').classList.add('hidden');
  });

  document.getElementById('btn-audio').addEventListener('click', e => {
    const on = window.kilnAudio.toggle();
    e.currentTarget.textContent = on ? '🔊 SFX: ON' : '🔇 SFX: OFF';
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    resetFullRun();
  });

  document.getElementById('btn-next-sector').addEventListener('click', () => {
    document.getElementById('shop-modal').classList.add('hidden');
    initSector(state.sectorIndex + 1);
  });

  document.getElementById('btn-play-again').addEventListener('click', () => {
    document.getElementById('end-modal').classList.add('hidden');
    resetFullRun();
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      e.preventDefault();
      executeIgniteSequence();
    } else if (e.key === 'z' || e.key === 'Z') {
      restoreUndoSnapshot();
    }
  });

  function resetFullRun() {
    state.hull = 3;
    state.pressure = 64;
    state.gold = 120;
    state.score = 0;
    state.deck = ['shift', 'shift', 'rotate', 'rotate', 'bellows', 'transmute', 'overclock'];
    state.runes = Array.from({ length: 4 }, () => Array(4).fill(null));
    initSector(0);
  }

  // Boot the game!
  resetFullRun();
  requestAnimationFrame(renderScene);
})();
