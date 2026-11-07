// CHRONO-KILN // GEAR-LOOP — Authentic PICO-8 Steampunk Clockwork Renderer & Engine
// Matches the original pixel-art visual design (concept3_chrono_kiln_1794020308789.jpg)

(() => {
  const canvas = document.getElementById('kiln-canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ============================================================================
  // 16x16 PIXEL ART SPRITE MATRICES (Scaled 4x for crisp retro pixel art)
  // ============================================================================
  const PALETTE = {
    '.': null,
    'K': '#09080d', // Black outline
    // Automaton (Copper / Brass / Glowing Eyes)
    'B': '#7a4419', // Dark bronze shadow
    'M': '#bf6f28', // Mid copper
    'H': '#e89f43', // Bright brass highlight
    'E': '#fff785', // Glowing yellow eye
    'G': '#383f52', // Iron joint gray
    // Sulfur Crystal (Yellows / Golds)
    'Y': '#fffb9e', // Crystal white-yellow
    'S': '#ffe033', // Bright sulfur yellow
    'D': '#d49217', // Gold shadow
    'O': '#8c520a', // Deep amber base
    // Mercury Flask (Silvers / Blues / Cork)
    'W': '#ffffff', // Specular white
    'L': '#ced9ed', // Light silver-blue glass
    'A': '#8a9bb8', // Mid silver liquid
    'U': '#52617a', // Dark slate glass shadow
    'C': '#a85d24', // Cork brown
    // Cinder Flame (Reds / Oranges / Yellows)
    'R': '#d92818', // Outer crimson red
    'F': '#ff6a00', // Mid blaze orange
    'Z': '#ffcf14', // Inner flame gold
    // Salt Gem (Cyan / Prismatic)
    'P': '#6be6ff', // Cyan facet
    'Q': '#248fb8'  // Deep cyan shadow
  };

  const SPRITES = {
    // Cute-but-deadly Clockwork Rust-Automaton (16x16)
    automaton: [
      '....KKKKKKKK....',
      '...KHHHHHHHHK...',
      '..KHMMMMMMMMHK..',
      '..KMEEKMmkEEMK..'.replace('mk', 'MM'),
      '..KMEEKMMKEEMK..',
      '..KBBBBBBBBBBK..',
      '.KKGGGGGGGGGGKK.',
      'KHMKKKKKKKKKKMHK',
      'KMBKHHHHHHHHKBMK',
      'KMBKHMHBBHMHKBMK',
      'KMBKBBBBBBBBKBMK',
      'KK.KKKKKKKKKK.KK',
      '....KMBKKBMK....',
      '....KMBKKBMK....',
      '...KKBBKKBBKK...',
      '...KKKKKKKKKK...'
    ],
    // Armored Clamp-Golem Automaton (16x16)
    golem: [
      '...KKKKKKKKKK...',
      '..KGGGGGGGGGGK..',
      '.KGHLLLLLLLLHGK.',
      '.KGKEEKGGKEEKGK.',
      '.KGGGGGGGGGGGGK.',
      'KKBBBBBBBBBBBBKK',
      'KGHKKKKKKKKKKHGK',
      'KGUKHHHHHHHHKUGK',
      'KGUKGGGGGGGGKUGK',
      'KGUKBBBBBBBBKUGK',
      'KKKKGGGGGGGGKKKK',
      '...KGGK..KGGK...',
      '...KGGK..KGGK...',
      '..KKBBK..KBBKK..',
      '..KKKKK..KKKKK..',
      '................'
    ],
    // Yellow Sulfur Crystal Cluster (16x16)
    sulfur: [
      '.......KK.......',
      '......KYYK......',
      '.....KYSSYK.....',
      '.....KSDDSK.....',
      '..KK.KSDDSK.KK..',
      '.KYYKKSDDSKKYYK.',
      'KYSSYKSddSKYSSYK'.replace('dd', 'DD'),
      'KSDDSKSDDSKSDDSK',
      'KSDDSKSDDSKSDDSK',
      '.KODDKSDDSKDDOK.',
      '.KODDDDDDDDDDOK.',
      '..KOOOOOOOOOOK..',
      '..KYYOOOOOOYYK..',
      '..KSSDDDDDDSSK..',
      '...KKKKKKKKKK...',
      '................'
    ],
    // Silver Mercury Flask with Cork (16x16)
    mercury: [
      '......KKKK......',
      '......KCCK......',
      '.....KKKKKK.....',
      '.....KWLLWK.....',
      '......KLLK......',
      '.....KWLLWK.....',
      '....KWLLLLWK....',
      '...KWLWWWWLWK...',
      '..KWLWLLLLAAUK..',
      '..KWLWAAAAAAUK..',
      '..KWLAAAAAAAuK..'.replace('u', 'U'),
      '..KLLAAAAAAAUK..',
      '...KUUUUUUUUK...',
      '....KKKKKKKK....',
      '................',
      '................'
    ],
    // Cinder Fireball (16x16)
    cinder: [
      '.......KK.......',
      '......KRRK......',
      '.....KRFFRK.....',
      '....KRFFZFRK....',
      '...KRFZZZZFRK...',
      '..KRFZZYYZZFRK..',
      '.KRFZZYYYYZZFRK.',
      '.KRFZYYYYYYZFRK.',
      'KRFZZYYYYYYZZFRK',
      'KRFZZYYYYYYZZFRK',
      '.KRFFZZZZZZFFRK.',
      '.KKRFFFFFFFFRKK.',
      '..KKRRRRRRRRKK..',
      '....KKKKKKKK....',
      '................',
      '................'
    ],
    // Prismatic Alchemical Salt Crystal (16x16)
    salt: [
      '.......KK.......',
      '......KWWK......',
      '.....KWPPWK.....',
      '....KWPWWPWK....',
      '...KWPWWWWPWK...',
      '..KWPWWPPQQPWK..',
      '.KWPWWPPPPQQPWK.',
      '.KQPPPPPPPPQQQK.',
      '..KQQPPPPQQQQK..',
      '...KQQPPQQQQK...',
      '....KQQQQQQK....',
      '.....KQQQQK.....',
      '......KKKK......',
      '................',
      '................',
      '................'
    ]
  };

  function drawPixelSprite(spriteKey, x, y, scale = 4) {
    const rows = SPRITES[spriteKey];
    if (!rows) return;
    const startX = Math.round(x - (16 * scale) / 2);
    const startY = Math.round(y - (16 * scale) / 2);

    for (let r = 0; r < rows.length; r++) {
      const rowStr = rows[r];
      for (let c = 0; c < rowStr.length; c++) {
        const ch = rowStr[c];
        const color = PALETTE[ch];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(startX + c * scale, startY + r * scale, scale, scale);
        }
      }
    }
  }

  // ============================================================================
  // GRID GEOMETRY & CONSTANTS (Matches concept3_chrono_kiln_1794020308789.jpg)
  // ============================================================================
  const BOARD = {
    x: 266,
    y: 52,
    size: 368,
    cell: 84,
    gap: 6,
    padding: 8
  };

  function getCellRect(r, c) {
    const x = BOARD.x + BOARD.padding + c * (BOARD.cell + BOARD.gap);
    const y = BOARD.y + BOARD.padding + r * (BOARD.cell + BOARD.gap);
    return { x, y, w: BOARD.cell, h: BOARD.cell, cx: x + BOARD.cell / 2, cy: y + BOARD.cell / 2 };
  }

  const DEPTHS = [
    { id: 1, name: 'DEPTH 1/5', automataTotal: 3, boss: false },
    { id: 2, name: 'DEPTH 2/5', automataTotal: 4, boss: false },
    { id: 3, name: 'DEPTH 3/5', automataTotal: 5, boss: false },
    { id: 4, name: 'DEPTH 4/5', automataTotal: 6, boss: false },
    { id: 5, name: 'DEPTH 5/5 (BOSS)', automataTotal: 5, boss: true }
  ];

  const CARD_DEFS = [
    {
      id: 'shift',
      title: 'SHIFT\nROW',
      cost: 1,
      desc: 'Slide any Row or Column by 1 tile'
    },
    {
      id: 'rotate',
      title: 'ROTATE\n2x2',
      cost: 1,
      desc: 'Rotate any 2x2 block 90° clockwise'
    },
    {
      id: 'bellows',
      title: 'BELLOWS',
      cost: 1,
      desc: 'Shove Row/Col (4 Crush DMG) & Cool -20% Pressure'
    },
    {
      id: 'transmute',
      title: 'TRANSMUTE',
      cost: 1,
      desc: 'Transform tile Reagent or blast Automaton (-4 HP)'
    }
  ];

  const state = {
    depthIdx: 0,
    turn: 1,
    hull: 3,
    maxHull: 3,
    ap: 3,
    maxAp: 3,
    freeMove: true,
    pressure: 75, // Matches the iconic "PRESSURE: 75%" from the original graphic!
    gold: 120,
    score: 0,
    automataReserve: 0,
    grid: [], // 4x4 of { kind: 'reagent'|'enemy', type, hp, maxHp, clamped }
    runes: Array.from({ length: 4 }, () => Array(4).fill(null)), // '2x' | 'vent' | 'gold'
    selectedCard: 'shift', // 'shift' | 'rotate' | 'bellows' | 'transmute'
    cardUsesThisTurn: { shift: 0, rotate: 0, bellows: 0, transmute: 0 },
    bonusDamage: 0,
    undoStack: [],
    hoverSpot: null,
    activeCombos: null,
    animating: false,
    blastBanner: null, // { x, y, text, timer }
    starbursts: [],
    steamPuffs: [
      { x: 74, y: 112, r: 10, vx: 0.3, vy: -0.6, alpha: 0.9 },
      { x: 92, y: 96, r: 8, vx: 0.5, vy: -0.5, alpha: 0.75 },
      { x: 114, y: 84, r: 6, vx: 0.4, vy: -0.4, alpha: 0.5 }
    ],
    floatingTexts: [],
    tick: 0
  };

  function randomReagentType() {
    const pool = ['sulfur', 'sulfur', 'mercury', 'mercury', 'cinder', 'cinder', 'salt'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function createAutomaton(depthIdx, isBoss = false) {
    if (isBoss) {
      return {
        kind: 'enemy',
        type: 'golem',
        name: 'GRAND KILN TITAN',
        hp: 24,
        maxHp: 24,
        heat: 10,
        clamped: false,
        boss: true
      };
    }
    const isGolem = depthIdx >= 1 && Math.random() < 0.3;
    const hp = isGolem ? 8 + depthIdx * 2 : 5 + depthIdx * 2;
    return {
      kind: 'enemy',
      type: isGolem ? 'golem' : 'automaton',
      name: isGolem ? 'CLAMP-GOLEM' : 'RUST-AUTOMATON',
      hp,
      maxHp: hp,
      heat: isGolem ? 8 : 6,
      clamped: isGolem
    };
  }

  function cloneGrid(g) {
    return g.map(row => row.map(cell => ({ ...cell })));
  }

  function saveUndo() {
    state.undoStack.push({
      grid: cloneGrid(state.grid),
      ap: state.ap,
      freeMove: state.freeMove,
      pressure: state.pressure,
      cardUses: { ...state.cardUsesThisTurn }
    });
    if (state.undoStack.length > 10) state.undoStack.shift();
  }

  function undoLastAction() {
    if (state.animating || state.undoStack.length === 0) return;
    const snap = state.undoStack.pop();
    state.grid = snap.grid;
    state.ap = snap.ap;
    state.freeMove = snap.freeMove;
    state.pressure = snap.pressure;
    state.cardUsesThisTurn = snap.cardUses;
    window.kilnAudio.playCardTick();
    syncAllUI();
  }

  function initDepth(depthIdx) {
    state.depthIdx = depthIdx;
    state.turn = 1;
    state.undoStack = [];
    const depth = DEPTHS[depthIdx];

    // Initialize 4x4 Crucible Grid resembling the iconic layout
    const initialPattern = [
      ['automaton', 'sulfur', 'mercury', 'cinder'],
      ['automaton', 'sulfur', 'cinder', 'mercury'],
      ['sulfur', 'mercury', 'cinder', 'automaton'],
      ['mercury', 'sulfur', 'mercury', 'cinder']
    ];

    let spawnedCount = 0;
    const maxInitialEnemies = Math.min(3, depth.automataTotal);

    state.grid = Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 4 }, (__, c) => {
        const token = initialPattern[r][c];
        if (token === 'automaton' && spawnedCount < maxInitialEnemies) {
          spawnedCount++;
          return createAutomaton(depthIdx, depth.boss && spawnedCount === 1);
        }
        return {
          kind: 'reagent',
          type: token === 'automaton' ? randomReagentType() : token
        };
      })
    );

    state.automataReserve = depth.automataTotal - spawnedCount;
    startNewTurn();
  }

  function startNewTurn() {
    state.ap = state.maxAp;
    state.freeMove = true;
    state.cardUsesThisTurn = { shift: 0, rotate: 0, bellows: 0, transmute: 0 };
    state.undoStack = [];
    syncAllUI();
  }

  // ============================================================================
  // ALCHEMICAL COMBO DETECTION ENGINE (3-in-a-Row, Flanked Automaton, 2x2 Square)
  // ============================================================================
  function evaluateCombos() {
    const matchedCells = new Set();
    const comboLines = [];

    function checkLine(coords) {
      const cells = coords.map(([r, c]) => state.grid[r][c]);

      // Check every contiguous 3-cell window in the 4-cell row/col
      for (let start = 0; start <= 1; start++) {
        const subCoords = coords.slice(start, start + 3);
        const subCells = cells.slice(start, start + 3);

        const reagents = subCells.filter(c => c.kind === 'reagent');
        const enemies = subCells.filter(c => c.kind === 'enemy');

        let validRecipe = null;
        if (reagents.length === 3) {
          const uniqueTypes = new Set(reagents.map(x => x.type));
          // 1) 3 identical reagents OR 3 distinct reagents (e.g. Sulfur + Mercury + Cinder) OR Salt wildcard
          if (
            uniqueTypes.size === 1 ||
            uniqueTypes.size === 3 ||
            reagents.some(x => x.type === 'salt')
          ) {
            validRecipe = 'CALCINATION BLAST!';
          }
        } else if (reagents.length === 2 && enemies.length === 1) {
          // 2) Classic Chrono-Kiln Recipe: 2 Reagents + 1 Automaton in a 3-tile line!
          const rTypes = reagents.map(x => x.type);
          if (rTypes[0] === rTypes[1] || rTypes[0] !== rTypes[1]) {
            validRecipe = 'CALCINATION BLAST!';
          }
        }

        if (validRecipe) {
          subCoords.forEach(([r, c]) => matchedCells.add(`${r},${c}`));
          comboLines.push({
            type: validRecipe,
            coords: subCoords,
            center: subCoords[1]
          });
        }
      }
    }

    // Check all 4 rows and 4 columns
    for (let r = 0; r < 4; r++) {
      checkLine([
        [r, 0],
        [r, 1],
        [r, 2],
        [r, 3]
      ]);
    }
    for (let c = 0; c < 4; c++) {
      checkLine([
        [0, c],
        [1, c],
        [2, c],
        [3, c]
      ]);
    }

    // Also check 2x2 Solar Squares (4 matching reagents or 3 matching reagents + 1 Automaton)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const sqCoords = [
          [r, c],
          [r, c + 1],
          [r + 1, c],
          [r + 1, c + 1]
        ];
        const sqCells = sqCoords.map(([rr, cc]) => state.grid[rr][cc]);
        const reagents = sqCells.filter(x => x.kind === 'reagent');
        if (reagents.length >= 3) {
          const counts = {};
          reagents.forEach(x => {
            counts[x.type] = (counts[x.type] || 0) + 1;
          });
          if (Object.values(counts).some(cnt => cnt >= 3)) {
            sqCoords.forEach(([rr, cc]) => matchedCells.add(`${rr},${cc}`));
            comboLines.push({
              type: 'SOLAR CRUCIBLE!',
              coords: sqCoords,
              center: [r, c + 1]
            });
          }
        }
      }
    }

    const activeCoords = Array.from(matchedCells).map(k => k.split(',').map(Number));

    // Calculate total damage, gold, and pressure change
    let baseDmg = state.bonusDamage;
    let goldGain = 0;
    let pressureDelta = 0;
    let mult = 1.0;

    activeCoords.forEach(([r, c]) => {
      const cell = state.grid[r][c];
      const rune = state.runes[r][c];
      const rMult = rune === '2x' ? 2 : 1;

      if (rune === 'vent') pressureDelta -= 8;
      if (rune === 'gold') goldGain += 30;

      if (cell.kind === 'reagent') {
        if (cell.type === 'sulfur') {
          baseDmg += 4 * rMult;
          goldGain += 20 * rMult;
        } else if (cell.type === 'mercury') {
          baseDmg += 2 * rMult;
          pressureDelta -= 14 * rMult;
        } else if (cell.type === 'cinder') {
          baseDmg += 3 * rMult;
          pressureDelta += 8;
          mult *= 1.35;
        } else if (cell.type === 'salt') {
          baseDmg += 3 * rMult;
          goldGain += 30 * rMult;
          pressureDelta -= 6;
        }
      } else if (cell.kind === 'enemy') {
        baseDmg += 3 * rMult;
      }
    });

    // Sweet Spot Overdrive (60% - 85% Boiler Pressure)
    const inSweetSpot = state.pressure >= 60 && state.pressure <= 85;
    if (inSweetSpot) {
      mult *= 1.5;
      goldGain = Math.round(goldGain * 1.5);
    }

    const totalBlastDmg = Math.max(4, Math.round(baseDmg * mult));

    // Any Automaton inside or orthogonally adjacent to a matched combo cell is blasted!
    const enemyHits = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = state.grid[r][c];
        if (cell.kind === 'enemy' && activeCoords.length > 0) {
          const isDirect = matchedCells.has(`${r},${c}`);
          const isAdjacent = [
            [r - 1, c],
            [r + 1, c],
            [r, c - 1],
            [r, c + 1]
          ].some(([nr, nc]) => matchedCells.has(`${nr},${nc}`));

          if (isDirect || isAdjacent) {
            enemyHits.push({
              r,
              c,
              dmg: isDirect ? totalBlastDmg : Math.max(3, Math.round(totalBlastDmg * 0.75)),
              direct: isDirect
            });
          }
        }
      }
    }

    return {
      matchedCells,
      activeCoords,
      comboLines,
      totalBlastDmg,
      goldGain,
      pressureDelta,
      enemyHits,
      inSweetSpot
    };
  }

  // ============================================================================
  // BOARD MANIPULATION ACTIONS
  // ============================================================================
  function trySpendMove(cardType, callback) {
    if (state.animating) return;

    // Use Free Wrench Move first if available for Shift / Rotate
    if (state.freeMove && (cardType === 'shift' || cardType === 'rotate')) {
      saveUndo();
      if (callback() !== false) {
        state.freeMove = false;
        syncAllUI();
      } else {
        state.undoStack.pop();
      }
      return;
    }

    const def = CARD_DEFS.find(d => d.id === cardType);
    if (!def || state.ap < def.cost) {
      const strip = document.getElementById('preview-text');
      strip.innerHTML = `<strong style="color:#ff5959">⚠️ Out of Steam AP! Pull the red [IGNITE] lever or click [↶ UNDO].</strong>`;
      return;
    }

    saveUndo();
    if (callback() !== false) {
      state.ap -= def.cost;
      state.cardUsesThisTurn[cardType] = (state.cardUsesThisTurn[cardType] || 0) + 1;
      syncAllUI();
    } else {
      state.undoStack.pop();
    }
  }

  function shiftRowOrCol(isRow, idx, dir) {
    if (isRow) {
      const row = state.grid[idx];
      if (dir > 0) {
        row.unshift(row.pop());
      } else {
        row.push(row.shift());
      }
    } else {
      const col = [0, 1, 2, 3].map(r => state.grid[r][idx]);
      if (dir > 0) {
        col.unshift(col.pop());
      } else {
        col.push(col.shift());
      }
      for (let r = 0; r < 4; r++) state.grid[r][idx] = col[r];
    }
    window.kilnAudio.playRowSlide();
    return true;
  }

  function rotate2x2Quadrant(tlR, tlC) {
    const coords = [
      [tlR, tlC],
      [tlR, tlC + 1],
      [tlR + 1, tlC + 1],
      [tlR + 1, tlC]
    ];
    for (const [r, c] of coords) {
      if (state.grid[r][c].kind === 'enemy' && state.grid[r][c].clamped) {
        addFloatingText(r, c, '🔒 CLAMPED! USE BELLOWS!', '#ff5959');
        window.kilnAudio.playAutomatonBlast();
        return false;
      }
    }
    const vals = coords.map(([r, c]) => state.grid[r][c]);
    const rotated = [vals[3], vals[0], vals[1], vals[2]];
    coords.forEach(([r, c], i) => {
      state.grid[r][c] = rotated[i];
    });
    window.kilnAudio.playGearRotate();
    return true;
  }

  function fireBellowsOnRow(r) {
    window.kilnAudio.playSteamVent();
    state.pressure = Math.max(0, state.pressure - 20);
    shiftRowOrCol(true, r, 1);

    for (let c = 0; c < 4; c++) {
      const cell = state.grid[r][c];
      const rect = getCellRect(r, c);
      state.starbursts.push({ x: rect.cx, y: rect.cy, radius: 28, alpha: 1.0 });
      if (cell.kind === 'enemy') {
        cell.clamped = false;
        cell.hp -= 4;
        addFloatingText(r, c, '💨 BELLOWS -4 HP!', '#ffd56b');
        if (cell.hp <= 0) {
          destroyAutomaton(r, c, cell);
        }
      }
    }
    return true;
  }

  function transmuteSingleTile(r, c) {
    const cell = state.grid[r][c];
    if (cell.kind === 'reagent') {
      const order = ['sulfur', 'mercury', 'cinder', 'salt'];
      cell.type = order[(order.indexOf(cell.type) + 1) % order.length];
      addFloatingText(r, c, `⚛ ${cell.type.toUpperCase()}!`, '#ffd56b');
      window.kilnAudio.playRecipeFanfare();
    } else if (cell.kind === 'enemy') {
      cell.clamped = false;
      cell.hp -= 4;
      addFloatingText(r, c, '⚛ TRANSMUTE -4 HP!', '#ff5959');
      window.kilnAudio.playAutomatonBlast();
      if (cell.hp <= 0) {
        destroyAutomaton(r, c, cell);
      }
    }
    return true;
  }

  function destroyAutomaton(r, c, enemy) {
    window.kilnAudio.playAutomatonBlast();
    const reward = enemy.boss ? 200 : 50;
    state.gold += reward;
    state.score += reward * 4;
    const rect = getCellRect(r, c);
    state.starbursts.push({ x: rect.cx, y: rect.cy, radius: 48, alpha: 1.0 });
    addFloatingText(r, c, `💥 +${reward} GOLD!`, '#ffd56b');
    state.grid[r][c] = { kind: 'reagent', type: 'sulfur' };
  }

  function addFloatingText(r, c, text, color) {
    const rect = getCellRect(r, c);
    state.floatingTexts.push({
      x: rect.cx,
      y: rect.cy - 18,
      text,
      color,
      alpha: 1.0
    });
  }

  // ============================================================================
  // PULL RED [IGNITE] LEVER — EXECUTE CALCINATION BLASTS!
  // ============================================================================
  async function pullIgniteLever() {
    if (state.animating) return;
    state.animating = true;

    const leverBtn = document.getElementById('btn-ignite');
    leverBtn.classList.add('pulled');
    window.kilnAudio.playRowSlide();

    const ev = evaluateCombos();

    if (ev.activeCoords.length > 0) {
      window.kilnAudio.playRecipeFanfare();

      // Show iconic [CALCINATION BLAST!] pixel starburst & banner right on the grid!
      const focusCoord = ev.comboLines[0] ? ev.comboLines[0].center : ev.activeCoords[0];
      const focusRect = getCellRect(focusCoord[0], focusCoord[1]);
      state.blastBanner = {
        x: focusRect.cx,
        y: focusRect.cy,
        text: ev.comboLines[0] ? ev.comboLines[0].type : 'CALCINATION BLAST!'
      };

      for (let i = 0; i < ev.activeCoords.length; i++) {
        const [r, c] = ev.activeCoords[i];
        const rect = getCellRect(r, c);
        window.kilnAudio.playRouteHop(i);
        state.starbursts.push({ x: rect.cx, y: rect.cy, radius: 42, alpha: 1.0 });
        await sleep(85);
      }

      state.gold += ev.goldGain;
      state.score += ev.totalBlastDmg * 15 + ev.goldGain * 2;
      state.pressure = Math.max(0, Math.min(100, state.pressure + ev.pressureDelta));

      for (const hit of ev.enemyHits) {
        const cell = state.grid[hit.r][hit.c];
        if (cell.kind === 'enemy') {
          cell.clamped = false;
          cell.hp -= hit.dmg;
          addFloatingText(hit.r, hit.c, `💥 -${hit.dmg} HP!`, '#ffd56b');
          if (cell.hp <= 0) {
            destroyAutomaton(hit.r, hit.c, cell);
          }
        }
      }

      // Respawn consumed reagents
      ev.activeCoords.forEach(([r, c]) => {
        if (state.grid[r][c].kind === 'reagent') {
          state.grid[r][c] = { kind: 'reagent', type: randomReagentType() };
        }
      });

      await sleep(520);
      state.blastBanner = null;
    } else {
      await sleep(250);
    }

    leverBtn.classList.remove('pulled');

    // Check if Depth is cleared!
    if (countAutomataOnBoard() === 0 && state.automataReserve <= 0) {
      state.animating = false;
      syncAllUI();
      openAlchemistForgeModal();
      return;
    }

    // Surviving Automata heat up the boiler
    let addedHeat = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (state.grid[r][c].kind === 'enemy') {
          addedHeat += state.grid[r][c].heat;
        }
      }
    }
    state.pressure = Math.min(100, state.pressure + addedHeat);

    if (state.pressure >= 100) {
      state.hull -= 1;
      state.pressure = 55;
      window.kilnAudio.playAutomatonBlast();
      addFloatingText(1, 1, '💥 BOILER OVERHEAT! -1 HULL!', '#ff5959');
      if (state.hull <= 0) {
        state.animating = false;
        syncAllUI();
        openEndModal(false);
        return;
      }
    }

    // Spawn reserve Automaton if fewer than 3 on board
    if (state.automataReserve > 0 && countAutomataOnBoard() < 3) {
      const openSlots = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (state.grid[r][c].kind === 'reagent') openSlots.push([r, c]);
        }
      }
      if (openSlots.length > 0) {
        const [sr, sc] = openSlots[Math.floor(Math.random() * openSlots.length)];
        state.grid[sr][sc] = createAutomaton(state.depthIdx, false);
        state.automataReserve--;
        addFloatingText(sr, sc, '⚠️ NEW AUTOMATON!', '#ff5959');
      }
    }

    state.turn++;
    state.animating = false;
    startNewTurn();
  }

  function countAutomataOnBoard() {
    let n = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (state.grid[r][c].kind === 'enemy') n++;
      }
    }
    return n;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ============================================================================
  // UI SYNCHRONIZATION & BOTTOM BRASS CARD DOCK
  // ============================================================================
  function syncAllUI() {
    state.activeCombos = evaluateCombos();
    const ev = state.activeCombos;

    document.getElementById('sector-badge').textContent = DEPTHS[state.depthIdx].name;
    document.getElementById('wave-badge').textContent = `AUTOMATA: ${
      countAutomataOnBoard() + state.automataReserve
    }`;
    document.getElementById('hull-badge').textContent = `HULL: ${'♥'.repeat(state.hull)}${'♡'.repeat(
      Math.max(0, state.maxHull - state.hull)
    )}`;

    const apEl = document.getElementById('ap-readout');
    apEl.textContent = `STEAM AP: ${'●'.repeat(state.ap)}${'○'.repeat(
      Math.max(0, state.maxAp - state.ap)
    )} (${state.ap}/${state.maxAp})${state.freeMove ? ' + [🔧 FREE MOVE]' : ''}`;

    const previewEl = document.getElementById('preview-text');
    if (ev.activeCoords.length > 0) {
      previewEl.innerHTML = `🔥 <strong>READY TO IGNITE:</strong> ${
        ev.comboLines[0] ? ev.comboLines[0].type : 'ALCHEMICAL COMBO'
      } (${ev.totalBlastDmg} DMG to ${ev.enemyHits.length} Automata, +${ev.goldGain} Gold, ${
        ev.pressureDelta >= 0 ? '+' : ''
      }${ev.pressureDelta}% Pressure)`;
    } else {
      previewEl.innerHTML = `⚙️ Click <strong>[SHIFT ROW ➡]</strong> or <strong>[ROTATE ↻]</strong> on the grid to align 3 Reagents or flank an Automaton!`;
    }

    renderBottomBrassCards();
  }

  function renderBottomBrassCards() {
    const dock = document.getElementById('cards-dock');
    dock.innerHTML = '';

    const svgIcons = {
      shift: `
        <svg width="48" height="38" viewBox="0 0 48 38">
          <path d="M16 4 L4 11 L16 18 L16 14 L42 14 L42 8 L16 8 Z" fill="#ffd56b" stroke="#000" stroke-width="2.5"/>
          <path d="M32 20 L44 27 L32 34 L32 30 L6 30 L6 24 L32 24 Z" fill="#dfa239" stroke="#000" stroke-width="2.5"/>
        </svg>`,
      rotate: `
        <svg width="46" height="40" viewBox="0 0 46 40">
          <path d="M12 20 A11 11 0 1 1 32 26" fill="none" stroke="#ffd56b" stroke-width="6"/>
          <polygon points="34,16 42,28 26,28" fill="#ffd56b" stroke="#000" stroke-width="2"/>
        </svg>`,
      bellows: `
        <svg width="50" height="38" viewBox="0 0 50 38">
          <polygon points="8,16 36,6 36,32 8,22" fill="#b86236" stroke="#000" stroke-width="2.5"/>
          <rect x="36" y="10" width="8" height="18" fill="#ffd56b" stroke="#000" stroke-width="2"/>
          <rect x="2" y="17" width="7" height="4" fill="#ffd56b" stroke="#000" stroke-width="1.5"/>
        </svg>`,
      transmute: `
        <svg width="46" height="40" viewBox="0 0 46 40">
          <circle cx="23" cy="20" r="14" fill="none" stroke="#ffd56b" stroke-width="4"/>
          <polygon points="23,6 35,28 11,28" fill="none" stroke="#ff7700" stroke-width="2.5"/>
          <circle cx="23" cy="20" r="4" fill="#fff785"/>
        </svg>`
    };

    CARD_DEFS.forEach(def => {
      const canUse =
        state.ap >= def.cost ||
        (state.freeMove && (def.id === 'shift' || def.id === 'rotate'));
      const isSelected = state.selectedCard === def.id;

      const card = document.createElement('div');
      card.className = `brass-card ${isSelected ? 'selected' : ''} ${!canUse ? 'disabled' : ''}`;
      const costText =
        state.freeMove && (def.id === 'shift' || def.id === 'rotate')
          ? 'FREE'
          : `${def.cost}AP`;

      card.innerHTML = `
        <span class="card-badge">${costText}</span>
        <div class="card-art">${svgIcons[def.id]}</div>
        <div class="card-title">${def.title.replace('\n', '<br/>')}</div>
      `;

      card.addEventListener('click', () => {
        if (!canUse || state.animating) return;
        state.selectedCard = def.id;
        window.kilnAudio.playCardTick();
        syncAllUI();
      });

      dock.appendChild(card);
    });
  }

  // ============================================================================
  // INTERACTIVE HIT-TESTING ON THE CANVAS
  // ============================================================================
  function getHotspots() {
    const spots = [];

    // 1. Left & Right Row Shift Tabs (plus Top & Bottom Col Shift Tabs)
    for (let i = 0; i < 4; i++) {
      const rowRect = getCellRect(i, 0);
      // Left brass tab: [SHIFT ROW ->]
      spots.push({
        type: 'shift_row_right',
        isRow: true,
        index: i,
        dir: 1,
        x: BOARD.x - 106,
        y: rowRect.cy - 20,
        w: 96,
        h: 40
      });

      // Right edge quick shift left tab
      spots.push({
        type: 'shift_row_left',
        isRow: true,
        index: i,
        dir: -1,
        x: BOARD.x + BOARD.size + 10,
        y: rowRect.cy - 14,
        w: 32,
        h: 28
      });

      // Top edge column shift down tab
      const colRect = getCellRect(0, i);
      spots.push({
        type: 'shift_col_down',
        isRow: false,
        index: i,
        dir: 1,
        x: colRect.cx - 16,
        y: BOARD.y - 34,
        w: 32,
        h: 24
      });
    }

    // 2. 9 Inner 2x2 Quadrant Rotation Gear Hubs (where 4 tiles meet)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const tl = getCellRect(r, c);
        const cx = tl.x + BOARD.cell + BOARD.gap / 2;
        const cy = tl.y + BOARD.cell + BOARD.gap / 2;
        spots.push({
          type: 'rotate_hub',
          r,
          c,
          x: cx - 15,
          y: cy - 15,
          w: 30,
          h: 30,
          cx,
          cy
        });
      }
    }

    // 3. Iconic Right-Side [ROTATE ↻] Bracket (rotates bottom-right 2x2 quadrant)
    const brCell = getCellRect(2, 3);
    spots.push({
      type: 'rotate_bracket',
      r: 2,
      c: 2,
      x: BOARD.x + BOARD.size + 16,
      y: brCell.cy - 10,
      w: 112,
      h: 72
    });

    // 4. All 16 Crucible Tiles
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const rect = getCellRect(r, c);
        spots.push({
          type: 'tile',
          r,
          c,
          x: rect.x,
          y: rect.y,
          w: rect.w,
          h: rect.h
        });
      }
    }

    return spots;
  }

  function findSpot(mx, my) {
    const spots = getHotspots();
    // If TRANSMUTE is selected, prioritize tile clicks
    if (state.selectedCard === 'transmute') {
      const tileHit = spots.find(
        s => s.type === 'tile' && mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h
      );
      if (tileHit) return tileHit;
    }

    for (const s of spots) {
      if (mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h) {
        return s;
      }
    }
    return null;
  }

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    state.hoverSpot = findSpot(mx, my);
  });

  canvas.addEventListener('mouseleave', () => {
    state.hoverSpot = null;
  });

  canvas.addEventListener('click', e => {
    if (state.animating) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const spot = findSpot(mx, my);
    if (!spot) return;

    if (
      spot.type === 'shift_row_right' ||
      spot.type === 'shift_row_left' ||
      spot.type === 'shift_col_down'
    ) {
      if (state.selectedCard === 'bellows' && spot.isRow) {
        trySpendMove('bellows', () => fireBellowsOnRow(spot.index));
      } else {
        trySpendMove('shift', () => shiftRowOrCol(spot.isRow, spot.index, spot.dir));
      }
      return;
    }

    if (spot.type === 'rotate_hub' || spot.type === 'rotate_bracket') {
      trySpendMove('rotate', () => rotate2x2Quadrant(spot.r, spot.c));
      return;
    }

    if (spot.type === 'tile') {
      if (state.selectedCard === 'transmute') {
        trySpendMove('transmute', () => transmuteSingleTile(spot.r, spot.c));
      } else if (state.selectedCard === 'bellows') {
        trySpendMove('bellows', () => fireBellowsOnRow(spot.r));
      } else if (state.selectedCard === 'rotate') {
        const rr = Math.min(2, spot.r);
        const cc = Math.min(2, spot.c);
        trySpendMove('rotate', () => rotate2x2Quadrant(rr, cc));
      } else {
        trySpendMove('shift', () => shiftRowOrCol(true, spot.r, 1));
      }
    }
  });

  // ============================================================================
  // MASTER PICO-8 CLOCKWORK FURNACE SCENE RENDERER
  // ============================================================================
  function renderLoop() {
    state.tick++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawSubterraneanBrickAndPipes();
    drawLeftBoilerPressureGauge();
    drawRightFurnaceHearth();
    drawGearToothedCrucibleBox();
    drawCrucibleTilesAndSprites();
    drawInteractiveShiftAndRotateControls();
    drawCalcinationBlastEffects();

    requestAnimationFrame(renderLoop);
  }

  function drawSubterraneanBrickAndPipes() {
    // Dark subterranean wall
    ctx.fillStyle = '#14101c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle dark brick blocks
    ctx.fillStyle = '#1c1626';
    for (let y = 20; y < canvas.height; y += 36) {
      for (let x = (y % 72 === 0 ? 0 : 32); x < canvas.width; x += 68) {
        ctx.fillRect(x, y, 60, 28);
      }
    }

    // Left vertical copper pipe behind shift tabs
    drawCopperPipe(152, 0, 28, 300, true);
    drawCopperPipe(0, 280, 175, 26, false);

    // Right copper pipe assembly feeding the hearth
    drawCopperPipe(630, 68, 170, 24, false);
    drawCopperPipe(796, 0, 38, 285, true);
    drawCopperPipe(630, 176, 170, 26, false);
  }

  function drawCopperPipe(x, y, w, h, vertical) {
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#7a3b1e';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#b86236';
    if (vertical) {
      ctx.fillRect(x + 4, y, w - 10, h);
      ctx.fillStyle = '#e08d58';
      ctx.fillRect(x + 8, y, 5, h);
    } else {
      ctx.fillRect(x, y + 4, w, h - 10);
      ctx.fillStyle = '#e08d58';
      ctx.fillRect(x, y + 7, w, 4);
    }
    ctx.restore();
  }

  function drawLeftBoilerPressureGauge() {
    ctx.save();
    // Top-left pixel readout: "PRESSURE: 75%"
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText('PRESSURE:', 78, 36);
    ctx.fillStyle = '#ffd56b';
    ctx.fillText('PRESSURE:', 76, 34);

    const pColor =
      state.pressure > 85 ? '#ff5959' : state.pressure >= 60 ? '#fff785' : '#ffd56b';
    ctx.fillStyle = '#000000';
    ctx.fillText(`${state.pressure}%`, 78, 58);
    ctx.fillStyle = pColor;
    ctx.fillText(`${state.pressure}%`, 76, 56);

    // Animated pixelated white steam puffs rising from boiler nozzle
    state.steamPuffs.forEach(p => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(p.x - p.r - 2, p.y - p.r - 2, p.r * 2 + 4, p.r * 2 + 4);
      ctx.fillStyle = '#d3dff5';
      ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.x - p.r + 2, p.y - p.r + 2, p.r * 2 - 6, p.r * 2 - 6);

      p.x += p.vx;
      p.y += p.vy;
      if (p.y < 68) {
        p.x = 72 + (Math.random() - 0.5) * 10;
        p.y = 118;
      }
    });

    // Brass Boiler Tank Cylinder (x=42, y=132, w=58, h=208)
    const bx = 42;
    const by = 132;
    const bw = 58;
    const bh = 208;

    // Top steam nozzle
    ctx.fillStyle = '#000';
    ctx.fillRect(bx + 20, by - 14, 18, 14);
    ctx.fillStyle = '#dfa239';
    ctx.fillRect(bx + 23, by - 11, 12, 11);

    // Outer black outline & brass caps
    ctx.fillStyle = '#000000';
    ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
    ctx.fillStyle = '#8f5716';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#dfa239';
    ctx.fillRect(bx + 4, by, bw - 8, 16);
    ctx.fillRect(bx + 4, by + bh - 16, bw - 8, 16);

    // Inner glass chamber
    const gx = bx + 8;
    const gy = by + 18;
    const gw = bw - 16;
    const gh = bh - 36;
    ctx.fillStyle = '#2d1e2f';
    ctx.fillRect(gx, gy, gw, gh);

    // Liquid fill inside boiler
    const fillH = Math.round((state.pressure / 100) * gh);
    const fillY = gy + gh - fillH;
    ctx.fillStyle = state.pressure > 85 ? '#ff3b2f' : '#ffe042';
    ctx.fillRect(gx + 2, fillY, gw - 4, fillH);
    // Specular highlight strip on liquid
    ctx.fillStyle = '#fffb9e';
    ctx.fillRect(gx + 6, fillY, 10, fillH);

    // Sweet spot tick marks (60% - 85%)
    const y85 = gy + gh * 0.15;
    const y60 = gy + gh * 0.4;
    ctx.fillStyle = '#000';
    ctx.fillRect(bx - 6, y85, 8, 3);
    ctx.fillRect(bx - 6, y60, 8, 3);

    // Side brass sight pipe (matching original graphic)
    ctx.fillStyle = '#000';
    ctx.fillRect(bx + bw + 4, by + 26, 12, bh - 52);
    ctx.fillStyle = '#dfa239';
    ctx.fillRect(bx + bw + 7, by + 29, 6, bh - 58);

    // Bottom-Left Riveted Gold Coin Box ([🪙 120])
    const cx = 22;
    const cy = 382;
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - 3, cy - 3, 98, 46);
    ctx.fillStyle = '#282d3c';
    ctx.fillRect(cx, cy, 92, 40);
    ctx.strokeStyle = '#565f78';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 2, cy + 2, 88, 36);

    // Pixel Gold Coin Icon
    ctx.fillStyle = '#000';
    ctx.fillRect(cx + 10, cy + 8, 24, 24);
    ctx.fillStyle = '#ffd56b';
    ctx.fillRect(cx + 12, cy + 10, 20, 20);
    ctx.fillStyle = '#b87d24';
    ctx.fillRect(cx + 17, cy + 15, 10, 10);

    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffd56b';
    ctx.textAlign = 'left';
    ctx.fillText(`${state.gold}`, cx + 40, cy + 27);
    ctx.restore();
  }

  function drawRightFurnaceHearth() {
    ctx.save();
    // Copper bell hood above hearth
    const hx = 772;
    const hy = 248;
    ctx.fillStyle = '#000';
    ctx.fillRect(hx - 18, hy, 82, 42);
    ctx.fillStyle = '#9e522c';
    ctx.fillRect(hx - 14, hy + 4, 74, 34);
    ctx.fillStyle = '#dfa239';
    ctx.fillRect(hx - 18, hy + 30, 82, 8);

    // Flickering pixel flames inside hearth
    const flameFlicker = (state.tick % 16 < 8) ? 0 : 4;
    ctx.fillStyle = '#ff5500';
    ctx.fillRect(782, 326 - flameFlicker, 76, 38 + flameFlicker);
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(792, 334, 56, 30);
    ctx.fillStyle = '#fff785';
    ctx.fillRect(804, 344, 34, 20);

    // Brick furnace base at bottom right
    ctx.fillStyle = '#000';
    ctx.fillRect(752, 362, 136, 110);
    ctx.fillStyle = '#5c3124';
    ctx.fillRect(756, 366, 128, 102);
    ctx.fillStyle = '#7d4432';
    ctx.fillRect(760, 366, 120, 12);
    ctx.restore();
  }

  function drawGearToothedCrucibleBox() {
    ctx.save();
    const gx = BOARD.x - 16;
    const gy = BOARD.y - 16;
    const gw = BOARD.size + 32;
    const gh = BOARD.size + 32;

    // Draw 7 chunky interlocking brass gear teeth along each of the 4 sides!
    const toothCount = 7;
    const toothW = 28;
    const toothD = 16;
    const step = gw / (toothCount + 1);

    for (let i = 1; i <= toothCount; i++) {
      const offset = Math.round(i * step - toothW / 2);

      // Top gear tooth
      drawBrassBlock(gx + offset, gy - toothD + 2, toothW, toothD);
      // Bottom gear tooth
      drawBrassBlock(gx + offset, gy + gh - 2, toothW, toothD);
      // Left gear tooth
      drawBrassBlock(gx - toothD + 2, gy + offset, toothD, toothW);
      // Right gear tooth
      drawBrassBlock(gx + gw - 2, gy + offset, toothD, toothW);
    }

    // Outer Golden Brass Frame
    drawBrassBlock(gx, gy, gw, gh);

    // Inner Riveted Dark-Iron Crucible Bezel
    ctx.fillStyle = '#000000';
    ctx.fillRect(BOARD.x - 4, BOARD.y - 4, BOARD.size + 8, BOARD.size + 8);
    ctx.fillStyle = '#3a4154';
    ctx.fillRect(BOARD.x, BOARD.y, BOARD.size, BOARD.size);

    // Corner & border rivets on iron bezel
    ctx.fillStyle = '#181b24';
    for (let i = 0; i <= 4; i++) {
      const rx = BOARD.x + 4 + i * 89;
      ctx.fillRect(rx, BOARD.y + 2, 4, 4);
      ctx.fillRect(rx, BOARD.y + BOARD.size - 6, 4, 4);
    }
    ctx.restore();
  }

  function drawBrassBlock(x, y, w, h) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#8f5716';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#dfa239';
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    ctx.fillStyle = '#ffd56b';
    ctx.fillRect(x + 3, y + 3, w - 9, 4);
  }

  function drawCrucibleTilesAndSprites() {
    const ev = state.activeCombos || evaluateCombos();

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const rect = getCellRect(r, c);
        const cell = state.grid[r][c];
        const isMatched = ev.matchedCells.has(`${r},${c}`);
        const rune = state.runes[r][c];

        // Check if hovered by a Shift Tab or 2x2 Rotate Hub
        let isHovered = false;
        if (state.hoverSpot) {
          const hs = state.hoverSpot;
          if (
            (hs.type === 'shift_row_right' || hs.type === 'shift_row_left') &&
            hs.index === r
          ) {
            isHovered = true;
          } else if (hs.type === 'shift_col_down' && hs.index === c) {
            isHovered = true;
          } else if (
            (hs.type === 'rotate_hub' || hs.type === 'rotate_bracket') &&
            (r === hs.r || r === hs.r + 1) &&
            (c === hs.c || c === hs.c + 1)
          ) {
            isHovered = true;
          } else if (hs.type === 'tile' && hs.r === r && hs.c === c) {
            isHovered = true;
          }
        }

        // 1. Draw Square Riveted Iron Plate
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4);

        ctx.fillStyle = isMatched
          ? '#634318'
          : isHovered
          ? '#3b374f'
          : '#262b38';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

        // Inner bevel border
        ctx.strokeStyle = isMatched
          ? '#ffd56b'
          : isHovered
          ? '#dfa239'
          : '#49526b';
        ctx.lineWidth = isMatched ? 3 : 2;
        ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);

        // 4 Corner Rivets on each tile plate
        ctx.fillStyle = '#141720';
        ctx.fillRect(rect.x + 5, rect.y + 5, 3, 3);
        ctx.fillRect(rect.x + rect.w - 8, rect.y + 5, 3, 3);
        ctx.fillRect(rect.x + 5, rect.y + rect.h - 8, 3, 3);
        ctx.fillRect(rect.x + rect.w - 8, rect.y + rect.h - 8, 3, 3);

        // Etched Rune indicator if present
        if (rune) {
          ctx.font = '8px "Press Start 2P", monospace';
          ctx.fillStyle = '#ffd56b';
          ctx.textAlign = 'center';
          ctx.fillText(
            rune === '2x' ? '2X RUNE' : rune === 'vent' ? 'COOL' : '+GOLD',
            rect.cx,
            rect.y + 15
          );
        }
        ctx.restore();

        // 2. Draw Pixel Art Sprite (Reagent or Automaton)
        if (cell.kind === 'reagent') {
          drawPixelSprite(cell.type, rect.cx, rect.cy + 2, 4);
        } else if (cell.kind === 'enemy') {
          drawPixelSprite(cell.type, rect.cx, rect.cy, 4);

          // HP Bar & Clamped badge on Automaton
          ctx.save();
          ctx.fillStyle = '#000';
          ctx.fillRect(rect.x + 10, rect.y + rect.h - 14, rect.w - 20, 10);
          const ratio = Math.max(0, cell.hp / cell.maxHp);
          ctx.fillStyle = ratio > 0.5 ? '#ff9d2e' : '#ff3b2f';
          ctx.fillRect(
            rect.x + 12,
            rect.y + rect.h - 12,
            Math.round((rect.w - 24) * ratio),
            6
          );

          ctx.font = '8px "Press Start 2P", monospace';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(`${cell.hp}HP`, rect.cx, rect.y + 13);

          // Show projected kill/damage badge if combo hits this Automaton
          const hit = ev.enemyHits.find(h => h.r === r && h.c === c);
          if (hit) {
            ctx.fillStyle = '#000';
            ctx.fillRect(rect.x + 4, rect.y - 4, rect.w - 8, 15);
            ctx.fillStyle = hit.dmg >= cell.hp ? '#fff785' : '#ff9d2e';
            ctx.fillText(
              hit.dmg >= cell.hp ? `KILL -${hit.dmg}` : `-${hit.dmg} DMG`,
              rect.cx,
              rect.y + 7
            );
          }
          ctx.restore();
        }
      }
    }
  }

  function drawInteractiveShiftAndRotateControls() {
    const spots = getHotspots();
    const hovered = state.hoverSpot;

    // 1. Draw the Left Row Shift Tabs (with the iconic "[SHIFT ROW ➡]" badge on the hovered/active row, default Row 1!)
    const featuredRow =
      hovered && (hovered.type === 'shift_row_right' || hovered.type === 'tile')
        ? hovered.index !== undefined
          ? hovered.index
          : hovered.r
        : 1;

    for (let r = 0; r < 4; r++) {
      const rowRect = getCellRect(r, 0);
      const isRowHovered =
        hovered && hovered.type === 'shift_row_right' && hovered.index === r;

      if (r === featuredRow || isRowHovered) {
        // Full iconic Brass Tab: [SHIFT ROW ➡]
        const tx = BOARD.x - 108;
        const ty = rowRect.cy - 22;
        const tw = 96;
        const th = 44;
        drawBrassBlock(tx, ty, tw, th);
        ctx.fillStyle = isRowHovered ? '#3d2817' : '#26180d';
        ctx.fillRect(tx + 4, ty + 4, tw - 8, th - 8);

        ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffd56b';
        ctx.textAlign = 'left';
        ctx.fillText('SHIFT', tx + 10, ty + 19);
        ctx.fillText('ROW', tx + 16, ty + 33);

        // Chunky gold right arrow
        ctx.fillStyle = '#ffd56b';
        ctx.beginPath();
        ctx.moveTo(tx + 66, ty + 18);
        ctx.lineTo(tx + 78, ty + 18);
        ctx.lineTo(tx + 78, ty + 12);
        ctx.lineTo(tx + 88, ty + 22);
        ctx.lineTo(tx + 78, ty + 32);
        ctx.lineTo(tx + 78, ty + 26);
        ctx.lineTo(tx + 66, ty + 26);
        ctx.closePath();
        ctx.fill();
      } else {
        // Compact brass arrow tab on the other 3 rows
        const tx = BOARD.x - 44;
        const ty = rowRect.cy - 13;
        drawBrassBlock(tx, ty, 30, 26);
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#1a1006';
        ctx.textAlign = 'center';
        ctx.fillText('➡', tx + 15, ty + 18);
      }

      // Top column shift arrows
      const colRect = getCellRect(0, r);
      const isColHovered =
        hovered && hovered.type === 'shift_col_down' && hovered.index === r;
      if (isColHovered) {
        drawBrassBlock(colRect.cx - 16, BOARD.y - 36, 32, 22);
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#1a1006';
        ctx.textAlign = 'center';
        ctx.fillText('⬇', colRect.cx, BOARD.y - 21);
      }
    }

    // 2. Draw the Iconic Right-Side [ROTATE ↻] Curved Arrows & Badge (matching concept3_chrono_kiln_1794020308789.jpg)
    const rx = BOARD.x + BOARD.size + 32;
    const ry = 285;
    ctx.save();
    const isBracketHovered = hovered && hovered.type === 'rotate_bracket';

    // Upper curved gold arrow
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(rx + 18, ry - 18, 22, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
    ctx.strokeStyle = isBracketHovered ? '#fff785' : '#ffd56b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(rx + 18, ry - 18, 22, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();

    // Center [ROTATE ↻] pill
    ctx.fillStyle = '#000';
    ctx.fillRect(rx - 14, ry - 12, 96, 24);
    ctx.fillStyle = '#1c140d';
    ctx.strokeStyle = '#dfa239';
    ctx.lineWidth = 2;
    ctx.fillRect(rx - 12, ry - 10, 92, 20);
    ctx.strokeRect(rx - 12, ry - 10, 92, 20);

    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffd56b';
    ctx.textAlign = 'center';
    ctx.fillText('ROTATE ↻', rx + 34, ry + 4);

    // Lower curved gold arrow
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(rx + 18, ry + 18, 22, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.strokeStyle = isBracketHovered ? '#fff785' : '#ffd56b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(rx + 18, ry + 18, 22, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();

    // 3. Draw the 9 Inner 2x2 Quadrant Rotation Gear Hubs
    spots
      .filter(s => s.type === 'rotate_hub')
      .forEach(hub => {
        const isHubHovered =
          hovered &&
          hovered.type === 'rotate_hub' &&
          hovered.r === hub.r &&
          hovered.c === hub.c;

        ctx.save();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(hub.cx, hub.cy, isHubHovered ? 13 : 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isHubHovered ? '#fff785' : '#dfa239';
        ctx.beginPath();
        ctx.arc(hub.cx, hub.cy, isHubHovered ? 10 : 6.5, 0, Math.PI * 2);
        ctx.fill();

        if (isHubHovered) {
          ctx.font = '9px "Press Start 2P", monospace';
          ctx.fillStyle = '#000';
          ctx.textAlign = 'center';
          ctx.fillText('↻', hub.cx, hub.cy + 3.5);
        }
        ctx.restore();
      });
  }

  function drawCalcinationBlastEffects() {
    // 1. Starburst pixel explosions
    for (let i = state.starbursts.length - 1; i >= 0; i--) {
      const b = state.starbursts[i];
      drawJaggedStarburst(b.x, b.y, b.radius, b.alpha);
      b.radius += 1.2;
      b.alpha -= 0.045;
      if (b.alpha <= 0) state.starbursts.splice(i, 1);
    }

    // 2. Iconic [CALCINATION BLAST!] Banner + Starburst (matching concept3_chrono_kiln_1794020308789.jpg)
    const ev = state.activeCombos;
    if (state.blastBanner) {
      drawJaggedStarburst(state.blastBanner.x, state.blastBanner.y, 56, 1.0);
      drawCalcinationCalloutBox(
        state.blastBanner.x + 28,
        state.blastBanner.y - 18,
        state.blastBanner.text
      );
    } else if (ev && ev.comboLines.length > 0 && !state.animating) {
      // Subtle live preview badge when a 3-in-a-row combo is lined up!
      const firstCombo = ev.comboLines[0];
      const centerRect = getCellRect(firstCombo.center[0], firstCombo.center[1]);
      drawJaggedStarburst(centerRect.cx, centerRect.cy, 30, 0.85);
      drawCalcinationCalloutBox(centerRect.cx + 22, centerRect.cy - 16, firstCombo.type);
    }

    // 3. Floating damage & gold texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x + 2, ft.y + 2);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();

      ft.y -= 0.8;
      ft.alpha -= 0.024;
      if (ft.alpha <= 0) state.floatingTexts.splice(i, 1);
    }
  }

  function drawJaggedStarburst(cx, cy, radius, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const spikes = 12;

    // Outer orange/gold jagged star
    ctx.fillStyle = '#ff9d00';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? radius : radius * 0.48;
      const angle = (i * Math.PI) / spikes;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner white-yellow hot core
    ctx.fillStyle = '#fffb9e';
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? radius * 0.68 : radius * 0.3;
      const angle = (i * Math.PI) / spikes;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCalcinationCalloutBox(x, y, text) {
    ctx.save();
    const w = 228;
    const h = 36;
    const clampedX = Math.min(canvas.width - w - 12, Math.max(12, x));

    ctx.fillStyle = '#000000';
    ctx.fillRect(clampedX - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#1b140e';
    ctx.fillRect(clampedX, y, w, h);
    ctx.strokeStyle = '#ffd56b';
    ctx.lineWidth = 3;
    ctx.strokeRect(clampedX + 2, y + 2, w - 4, h - 4);

    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffd56b';
    ctx.textAlign = 'center';
    ctx.fillText(text, clampedX + w / 2, y + 23);
    ctx.restore();
  }

  // ============================================================================
  // MODALS & CONTROLS
  // ============================================================================
  function openAlchemistForgeModal() {
    window.kilnAudio.playRecipeFanfare();
    if (state.depthIdx >= DEPTHS.length - 1) {
      openEndModal(true);
      return;
    }

    const modal = document.getElementById('shop-modal');
    document.getElementById('shop-gold-val').textContent = state.gold;

    const draftRow = document.getElementById('shop-draft-row');
    draftRow.innerHTML = '';
    const freeUpgrades = [
      {
        title: '⚙️ +1 MAX STEAM AP',
        desc: 'Increases your Steam AP every turn by +1!',
        apply: () => {
          state.maxAp += 1;
        }
      },
      {
        title: '🔥 CRUCIBLE TEMPERING',
        desc: 'Permanently adds +4 Base Damage to all Calcination Blasts!',
        apply: () => {
          state.bonusDamage += 4;
        }
      },
      {
        title: '❄️ COOLING CONDENSER',
        desc: 'Vents boiler pressure to a stable 65% and grants +60 Gold!',
        apply: () => {
          state.pressure = 65;
          state.gold += 60;
        }
      }
    ];

    let pickedFree = false;
    freeUpgrades.forEach(up => {
      const el = document.createElement('div');
      el.className = 'shop-card';
      el.innerHTML = `
        <div class="shop-card-top"><span>${up.title}</span><span>FREE</span></div>
        <div class="shop-card-desc">${up.desc}</div>
      `;
      el.addEventListener('click', () => {
        if (pickedFree) return;
        pickedFree = true;
        up.apply();
        el.classList.add('bought');
        window.kilnAudio.playRecipeFanfare();
        document.getElementById('shop-gold-val').textContent = state.gold;
        syncAllUI();
      });
      draftRow.appendChild(el);
    });

    const runesRow = document.getElementById('shop-runes-row');
    runesRow.innerHTML = '';
    const shopItems = [
      {
        id: '2x',
        title: '⚜️ 2X BLAST RUNE',
        cost: 90,
        desc: 'Etches a permanent 2X Damage & Gold rune onto a Crucible tile.'
      },
      {
        id: 'vent',
        title: '💨 AUTO-VENT RUNE',
        cost: 75,
        desc: 'Etches a cooling rune that vents -8% Pressure whenever matched.'
      },
      {
        id: 'repair',
        title: '♥ HULL REPAIR',
        cost: 100,
        desc: 'Restores +1 Hull Integrity (up to 3 max).'
      }
    ];

    shopItems.forEach(item => {
      const el = document.createElement('div');
      el.className = 'shop-card';
      el.innerHTML = `
        <div class="shop-card-top"><span>${item.title}</span><span>🪙 ${item.cost}</span></div>
        <div class="shop-card-desc">${item.desc}</div>
      `;
      el.addEventListener('click', () => {
        if (el.classList.contains('bought') || state.gold < item.cost) return;
        if (item.id === 'repair' && state.hull >= state.maxHull) return;

        state.gold -= item.cost;
        document.getElementById('shop-gold-val').textContent = state.gold;
        el.classList.add('bought');
        window.kilnAudio.playRecipeFanfare();

        if (item.id === 'repair') {
          state.hull = Math.min(state.maxHull, state.hull + 1);
        } else {
          const coords = [
            [1, 1],
            [1, 2],
            [2, 1],
            [2, 2],
            [0, 1],
            [2, 3]
          ];
          const slot =
            coords.find(([r, c]) => !state.runes[r][c]) || [
              Math.floor(Math.random() * 4),
              Math.floor(Math.random() * 4)
            ];
          state.runes[slot[0]][slot[1]] = item.id;
        }
        syncAllUI();
      });
      runesRow.appendChild(el);
    });

    modal.classList.remove('hidden');
  }

  function openEndModal(won) {
    const modal = document.getElementById('end-modal');
    document.getElementById('end-title').textContent = won
      ? '🏆 CHRONO-KILN MASTERED!'
      : '💥 FURNACE BOILER RUPTURED!';
    document.getElementById('end-subtitle').textContent = won
      ? 'You transmuted all 5 Clockwork Depths into Philosopher’s Gold!'
      : 'The Rust-Automata overheated the subterranean kiln.';
    document.getElementById('end-stats').innerHTML = `
      <div>FINAL SCORE: ${state.score}</div>
      <div>DEPTH REACHED: ${DEPTHS[state.depthIdx].name}</div>
      <div>GOLD FORGED: 🪙 ${state.gold}</div>
    `;
    modal.classList.remove('hidden');
  }

  document.getElementById('btn-ignite').addEventListener('click', () => {
    pullIgniteLever();
  });

  document.getElementById('btn-undo').addEventListener('click', () => {
    undoLastAction();
  });

  document.getElementById('btn-help').addEventListener('click', () => {
    document.getElementById('help-modal').classList.remove('hidden');
  });

  document.getElementById('btn-close-help').addEventListener('click', () => {
    document.getElementById('help-modal').classList.add('hidden');
  });

  document.getElementById('btn-audio').addEventListener('click', e => {
    const on = window.kilnAudio.toggle();
    e.currentTarget.textContent = on ? '🔊 SFX' : '🔇 MUTE';
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    startFreshRun();
  });

  document.getElementById('btn-next-sector').addEventListener('click', () => {
    document.getElementById('shop-modal').classList.add('hidden');
    initDepth(state.depthIdx + 1);
  });

  document.getElementById('btn-play-again').addEventListener('click', () => {
    document.getElementById('end-modal').classList.add('hidden');
    startFreshRun();
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      e.preventDefault();
      pullIgniteLever();
    } else if (e.key === 'z' || e.key === 'Z') {
      undoLastAction();
    }
  });

  function startFreshRun() {
    state.hull = 3;
    state.maxAp = 3;
    state.bonusDamage = 0;
    state.pressure = 75;
    state.gold = 120;
    state.score = 0;
    state.runes = Array.from({ length: 4 }, () => Array(4).fill(null));
    initDepth(0);
  }

  startFreshRun();
  requestAnimationFrame(renderLoop);
})();
