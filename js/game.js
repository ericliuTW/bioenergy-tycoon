/**
 * 生質能校園大亨：微電網保衛戰
 * Bioenergy Tycoon: Microgrid Defense
 *
 * 主遊戲引擎 — 狀態管理、模擬邏輯、渲染、UI、事件
 */

// ============================================================
// 全域遊戲狀態
// ============================================================
const Game = {
  state: 'TITLE', // TITLE, TUTORIAL, PLAYING, PAUSED, GAMEOVER
  timer: 0,
  money: 0,
  manpower: 0,
  maxManpower: 0,
  protestLevel: 0,
  totalEnergy: 0,
  totalRevenue: 0,
  totalMaintenanceCost: 0,

  // 資源節點
  resources: [],
  // 已建設備
  buildings: [],
  // 物流線
  logistics: [],
  // 電線（從發電設備到校園建築）
  powerLines: [],
  // 每局指定的必接建築 tile types
  requiredPowerBuildings: [],

  // 校園佈局（動態生成）
  campusLayout: null,

  // 消化槽狀態
  digesterState: {
    pH: GameConfig.PH_INITIAL,
    olr: 0,
    stability: 100,
    gasOutput: 0,
    acidified: false,
    totalGasProduced: 0
  },

  // 氣化爐狀態
  gasifierState: {
    syngasOutput: 0,
    totalSyngasProduced: 0,
    inputMoisture: 0
  },

  // 發電狀態
  powerState: {
    biogasAvailable: 0,
    electricityOutput: 0,
    mainGridOn: true,
    islandMode: false,
    poweredCampusBuildings: [], // tile types currently powered
    resilienceScore: 0,
    normalPowerScore: 0
  },

  // 停電事件
  powerOutage: {
    active: false,
    triggered: false,
    timeRemaining: 0
  },

  // C/N 追蹤
  mixerCN: null,

  // 外部成本明細（每 tick 更新）
  externalityBreakdown: {
    resourceSmell: 0,
    processingSmell: 0,
    noise: 0,
    proximity: 0,
    treeRemoval: 0,
    scrubberReduction: false
  },

  // UI 狀態
  ui: {
    selectedTile: null,
    selectedBuilding: null,
    showBuildMenu: false,
    showInfo: null,
    connectingFrom: null,
    connectingLine: null,
    hoveredTile: null,
    tutorialStep: 0,
    alerts: [],
    particles: []
  },

  // 統計
  stats: {
    resourcesUsed: {},
    bestCN: null,
    worstCN: null,
    acidifications: 0,
    failures: 0,
    maxElectricity: 0,
    preprocessUsed: false,
    desulfurizerUsed: false,
    scrubberUsed: false,
    mixerUsed: false,
    avgLogisticsLength: 0
  },

  // Canvas
  canvas: null,
  ctx: null,
  uiCanvas: null,
  uiCtx: null,

  // 時間
  lastTick: 0,
  tickAccumulator: 0,
  animFrame: 0
};

// ============================================================
// 初始化
// ============================================================
function initGame() {
  Game.canvas = document.getElementById('gameCanvas');
  Game.ctx = Game.canvas.getContext('2d');
  Game.uiCanvas = document.getElementById('uiCanvas');
  Game.uiCtx = Game.uiCanvas.getContext('2d');

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // 事件監聽
  Game.uiCanvas.addEventListener('mousedown', onMouseDown);
  Game.uiCanvas.addEventListener('mousemove', onMouseMove);
  Game.uiCanvas.addEventListener('mouseup', onMouseUp);
  Game.uiCanvas.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);

  // 按鈕事件
  document.getElementById('btnStart').addEventListener('click', startGame);
  document.getElementById('btnTutorial').addEventListener('click', showTutorial);
  document.getElementById('btnRestart').addEventListener('click', () => { hideAllScreens(); showTitle(); });
  document.getElementById('btnPause').addEventListener('click', togglePause);
  document.getElementById('btnTutorialNext').addEventListener('click', nextTutorial);
  document.getElementById('btnTutorialSkip').addEventListener('click', skipTutorial);
  document.getElementById('btnCloseBuild').addEventListener('click', closeBuildMenu);
  // 點擊建設選單外部可關閉
  document.addEventListener('click', (e) => {
    if (Game.ui.showBuildMenu) {
      const menu = document.getElementById('buildMenu');
      if (!menu.contains(e.target) && !Game.uiCanvas.contains(e.target)) {
        closeBuildMenu();
      }
    }
  });
  document.getElementById('btnCloseInfo').addEventListener('click', closeInfoPanel);
  document.getElementById('btnSubmitEarly').addEventListener('click', submitEarly);

  // 生成初始佈局供標題畫面使用
  generateCampusLayout();

  showTitle();
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  const mapW = GameConfig.MAP_COLS * GameConfig.TILE_SIZE;
  const mapH = GameConfig.MAP_ROWS * GameConfig.TILE_SIZE;
  Game.canvas.width = mapW;
  Game.canvas.height = mapH;
  Game.uiCanvas.width = mapW;
  Game.uiCanvas.height = mapH;

  // 自適應縮放讓地圖完全顯示在容器中
  const container = document.getElementById('mapContainer');
  if (container) {
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw / mapW, ch / mapH, 1);
    const wrapper = document.getElementById('canvasWrapper');
    wrapper.style.width = mapW + 'px';
    wrapper.style.height = mapH + 'px';
    wrapper.style.transform = `scale(${scale})`;
    wrapper.style.transformOrigin = 'top left';
    // 讓容器居中
    wrapper.style.marginLeft = Math.max(0, (cw - mapW * scale) / 2) + 'px';
    wrapper.style.marginTop = Math.max(0, (ch - mapH * scale) / 2) + 'px';
  }
}

// ============================================================
// 畫面切換
// ============================================================
function hideAllScreens() {
  document.getElementById('titleScreen').classList.add('hidden');
  document.getElementById('tutorialScreen').classList.add('hidden');
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('hudBar').classList.add('hidden');
  document.getElementById('sidePanel').classList.add('hidden');
  document.getElementById('buildMenu').classList.add('hidden');
  document.getElementById('infoPanel').classList.add('hidden');
}

function showTitle() {
  Game.state = 'TITLE';
  hideAllScreens();
  document.getElementById('titleScreen').classList.remove('hidden');
}

function showTutorial() {
  Game.state = 'TUTORIAL';
  Game.ui.tutorialStep = 0;
  hideAllScreens();
  document.getElementById('tutorialScreen').classList.remove('hidden');
  updateTutorialDisplay();
}

function nextTutorial() {
  Game.ui.tutorialStep++;
  if (Game.ui.tutorialStep >= GameConfig.TUTORIAL_STEPS.length) {
    skipTutorial();
  } else {
    updateTutorialDisplay();
  }
}

function skipTutorial() {
  document.getElementById('tutorialScreen').classList.add('hidden');
  startGame();
}

function updateTutorialDisplay() {
  const step = GameConfig.TUTORIAL_STEPS[Game.ui.tutorialStep];
  document.getElementById('tutorialTitle').textContent = step.title;
  document.getElementById('tutorialText').textContent = step.text;
  document.getElementById('tutorialProgress').textContent =
    `${Game.ui.tutorialStep + 1} / ${GameConfig.TUTORIAL_STEPS.length}`;
}

// ============================================================
// 開始遊戲
// ============================================================
function startGame() {
  hideAllScreens();
  Game.state = 'PLAYING';
  Game.timer = GameConfig.GAME_DURATION;
  Game.money = GameConfig.INITIAL_MONEY;
  Game.manpower = GameConfig.INITIAL_MANPOWER;
  Game.maxManpower = GameConfig.INITIAL_MANPOWER;
  Game.protestLevel = 0;
  Game.totalEnergy = 0;
  Game.totalRevenue = 0;
  Game.totalMaintenanceCost = 0;
  Game.resources = [];
  Game.buildings = [];
  Game.logistics = [];
  Game.powerLines = [];
  Game.requiredPowerBuildings = [];
  Game.treeRemovedCount = 0;
  Game.ui.alerts = [];
  Game.ui.particles = [];
  Game.ui.selectedTile = null;
  Game.ui.selectedBuilding = null;
  Game.ui.showBuildMenu = false;
  Game.ui.showInfo = null;
  Game.ui.connectingFrom = null;
  Game.ui.connectingLine = null;

  Game.digesterState = {
    pH: GameConfig.PH_INITIAL,
    olr: 0,
    stability: 100,
    gasOutput: 0,
    acidified: false,
    totalGasProduced: 0
  };

  Game.gasifierState = {
    syngasOutput: 0,
    totalSyngasProduced: 0,
    inputMoisture: 0
  };

  Game.powerState = {
    biogasAvailable: 0,
    electricityOutput: 0,
    mainGridOn: true,
    islandMode: false,
    poweredCampusBuildings: [],
    resilienceScore: 0,
    normalPowerScore: 0
  };

  Game.powerOutage = { active: false, triggered: false, timeRemaining: 0 };

  Game.mixerCN = null;

  Game.stats = {
    resourcesUsed: {},
    bestCN: null,
    worstCN: null,
    acidifications: 0,
    failures: 0,
    maxElectricity: 0,
    preprocessUsed: false,
    desulfurizerUsed: false,
    scrubberUsed: false,
    mixerUsed: false,
    gasifierUsed: false,
    avgLogisticsLength: 0
  };

  Game.lastTick = performance.now();
  Game.tickAccumulator = 0;

  generateCampusLayout();
  spawnResources();
  selectRequiredPowerBuildings();

  document.getElementById('hudBar').classList.remove('hidden');
  document.getElementById('sidePanel').classList.remove('hidden');
  // 等待 DOM 佈局完成後再計算縮放
  requestAnimationFrame(() => { resizeCanvas(); });
  updateHUD();
  updateSidePanel();
}

// ============================================================
// 校園佈局動態生成
// ============================================================
function generateCampusLayout() {
  const rows = GameConfig.MAP_ROWS; // 14
  const cols = GameConfig.MAP_COLS; // 20
  const layout = [];

  // 初始化全為草地
  for (let r = 0; r < rows; r++) {
    layout[r] = [];
    for (let c = 0; c < cols; c++) {
      layout[r][c] = 0;
    }
  }

  // 僅放置主幹道：一條水平 + 一條垂直（十字形）
  const mainHRoad = 7; // 中央水平道路
  const mainVRoad = randInt(3, 5); // 靠左的垂直道路（校門入口）
  for (let c = 0; c < cols; c++) layout[mainHRoad][c] = 1;
  for (let r = 0; r < rows; r++) layout[r][mainVRoad] = 1;

  // 定義要放置的校園建築
  const campusBuildings = [
    { tile: 2, w: 2, h: 2, name: '餐廳' },
    { tile: 3, w: 2, h: 2, name: '宿舍' },
    { tile: 4, w: 3, h: 2, name: '教學樓' },
    { tile: 5, w: 2, h: 2, name: '行政中心' },
    { tile: 6, w: 2, h: 2, name: '圖書館' },
    { tile: 8, w: 2, h: 1, name: '回收站' }
  ];

  // 找出道路旁的可建位置
  function findAdjacentToRoad(w, h) {
    const candidates = [];
    for (let r = 0; r < rows - h + 1; r++) {
      for (let c = 0; c < cols - w + 1; c++) {
        let allGrass = true;
        for (let dr = 0; dr < h; dr++) {
          for (let dc = 0; dc < w; dc++) {
            if (layout[r + dr][c + dc] !== 0) { allGrass = false; break; }
          }
          if (!allGrass) break;
        }
        if (!allGrass) continue;

        let adjRoad = false;
        for (let dr = 0; dr < h; dr++) {
          if (c > 0 && layout[r + dr][c - 1] === 1) adjRoad = true;
          if (c + w < cols && layout[r + dr][c + w] === 1) adjRoad = true;
        }
        for (let dc = 0; dc < w; dc++) {
          if (r > 0 && layout[r - 1][c + dc] === 1) adjRoad = true;
          if (r + h < rows && layout[r + h][c + dc] === 1) adjRoad = true;
        }
        if (adjRoad) candidates.push({ r, c });
      }
    }
    return candidates;
  }

  // 隨機放置每棟建築（靠近主幹道）
  for (const bldg of campusBuildings) {
    const candidates = findAdjacentToRoad(bldg.w, bldg.h);
    if (candidates.length === 0) continue;

    const pos = candidates[randInt(0, candidates.length - 1)];
    for (let dr = 0; dr < bldg.h; dr++) {
      for (let dc = 0; dc < bldg.w; dc++) {
        layout[pos.r + dr][pos.c + dc] = bldg.tile;
      }
    }
  }

  // 填充樹木（邊緣多、內部少）
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (layout[r][c] === 0) {
        const isEdge = (r === 0 || r === rows - 1 || c === 0 || c === cols - 1);
        const treeChance = isEdge ? 0.55 : 0.15;
        if (Math.random() < treeChance) {
          layout[r][c] = 9;
        }
      }
    }
  }

  Game.campusLayout = layout;
}

// ============================================================
// 資源生成
// ============================================================
function spawnResources() {
  const layout = Game.campusLayout;
  const zones = {
    dining: [], green: [], general: []
  };

  // 蒐集各區域的可用格子（靠近對應建築的空地）
  for (let r = 0; r < GameConfig.MAP_ROWS; r++) {
    for (let c = 0; c < GameConfig.MAP_COLS; c++) {
      if (layout[r][c] === 0) {
        // 檢查鄰近區域
        let nearDining = false, nearGreen = false;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < GameConfig.MAP_ROWS && nc >= 0 && nc < GameConfig.MAP_COLS) {
              if (layout[nr][nc] === 2) nearDining = true;
              if (layout[nr][nc] === 9) nearGreen = true;
            }
          }
        }
        if (nearDining) zones.dining.push({ r, c });
        if (nearGreen) zones.green.push({ r, c });
        zones.general.push({ r, c });
      }
    }
  }

  const usedTiles = new Set();

  for (const [key, resDef] of Object.entries(GameConfig.RESOURCES)) {
    const spawnCfg = GameConfig.RESOURCE_SPAWN[key];
    if (!spawnCfg) continue;
    const count = randInt(spawnCfg.min, spawnCfg.max);

    for (let i = 0; i < count; i++) {
      let candidates = [];
      for (const zoneName of resDef.spawnZones) {
        candidates = candidates.concat(zones[zoneName] || []);
      }
      if (candidates.length === 0) candidates = zones.general;

      // 過濾已使用
      candidates = candidates.filter(t => !usedTiles.has(`${t.r},${t.c}`));
      if (candidates.length === 0) continue;

      const pos = candidates[randInt(0, candidates.length - 1)];
      usedTiles.add(`${pos.r},${pos.c}`);

      Game.resources.push({
        id: `res_${key}_${i}`,
        type: key,
        def: resDef,
        row: pos.r,
        col: pos.c,
        active: true,
        outputRate: resDef.outputRate,
        connected: false
      });
    }
  }
}

// ============================================================
// 電線系統 & 必接建築選擇
// ============================================================
function selectRequiredPowerBuildings() {
  // 從地圖上實際存在的可接電建築中隨機選 1-2 棟為必接
  const powerableTiles = [2, 3, 4, 5, 6];
  const presentTiles = [];
  const layout = Game.campusLayout;
  for (let r = 0; r < GameConfig.MAP_ROWS; r++) {
    for (let c = 0; c < GameConfig.MAP_COLS; c++) {
      const t = layout[r][c];
      if (powerableTiles.includes(t) && !presentTiles.includes(t)) {
        presentTiles.push(t);
      }
    }
  }
  // 隨機選 1-2 棟
  const shuffled = presentTiles.sort(() => Math.random() - 0.5);
  Game.requiredPowerBuildings = shuffled.slice(0, Math.min(2, shuffled.length));

  const names = Game.requiredPowerBuildings.map(t => GameConfig.CAMPUS_BUILDINGS[t].name);
  addAlert(`📋 本次任務：確保 ${names.join('、')} 有電力供應！`, 'info');
}

function getCampusBuildingAt(row, col) {
  const tile = Game.campusLayout[row][col];
  const bDef = GameConfig.CAMPUS_BUILDINGS[tile];
  if (bDef && bDef.canPower) return { tile, def: bDef, row, col };
  return null;
}

function findCampusBuildingTiles(tileType) {
  // 回傳該建築左上角座標
  const layout = Game.campusLayout;
  for (let r = 0; r < GameConfig.MAP_ROWS; r++) {
    for (let c = 0; c < GameConfig.MAP_COLS; c++) {
      if (layout[r][c] === tileType) {
        // 確認是左上角（往上和左不是同類型）
        const isTop = (r === 0 || layout[r-1][c] !== tileType);
        const isLeft = (c === 0 || layout[r][c-1] !== tileType);
        if (isTop && isLeft) return { row: r, col: c };
      }
    }
  }
  return null;
}

function createPowerLine(generatorBld, campusTileType) {
  const campusPos = findCampusBuildingTiles(campusTileType);
  if (!campusPos) return false;

  const campusDef = GameConfig.CAMPUS_BUILDINGS[campusTileType];
  const genCenter = {
    r: generatorBld.row + (generatorBld.def.tileSize - 1) / 2,
    c: generatorBld.col + (generatorBld.def.tileSize - 1) / 2
  };
  const dist = Math.sqrt(Math.pow(genCenter.r - campusPos.row, 2) + Math.pow(genCenter.c - campusPos.col, 2));
  const cost = Math.round(dist * GameConfig.POWERLINE.COST_PER_TILE);

  if (Game.money < cost) {
    addAlert(`電線資金不足（需 $${cost}）`, 'warning');
    return false;
  }

  // 檢查重複
  if (Game.powerLines.some(pl => pl.generatorId === generatorBld.id && pl.campusTile === campusTileType)) {
    addAlert('已有電線連接此建築！', 'warning');
    return false;
  }

  Game.money -= cost;
  Game.powerLines.push({
    id: `pwr_${Date.now()}`,
    generatorId: generatorBld.id,
    campusTile: campusTileType,
    campusName: campusDef.name,
    fromRow: genCenter.r,
    fromCol: genCenter.c,
    toRow: campusPos.row + 0.5,
    toCol: campusPos.col + 0.5,
    distance: dist,
    cost: cost,
    powerDemand: campusDef.powerDemand
  });

  const isRequired = Game.requiredPowerBuildings.includes(campusTileType);
  addAlert(`⚡ 已接電到${campusDef.name}！${isRequired ? '（必接任務 ✅）' : ''}（費用 $${cost}）`, 'success');
  updateHUD();
  return true;
}

// ============================================================
// 建設系統
// ============================================================
function openBuildMenu(row, col) {
  Game.ui.selectedTile = { row, col };
  Game.ui.showBuildMenu = true;
  const menu = document.getElementById('buildMenu');
  menu.classList.remove('hidden');

  const list = document.getElementById('buildList');
  list.innerHTML = '';

  // 樹木警告
  const isTree = Game.campusLayout[row][col] === 9;
  if (isTree) {
    const warn = document.createElement('div');
    warn.style.cssText = 'background:rgba(243,156,18,0.15);border:1px solid var(--warning);border-radius:6px;padding:8px;margin-bottom:8px;font-size:11px;color:var(--warning);text-align:center';
    warn.textContent = '🌳 此處為樹木綠地。在此建設將砍樹，增加抗議值！';
    list.appendChild(warn);
  }

  // 道路建設選項
  const roadCost = GameConfig.ROAD.BUILD_COST;
  const canAffordRoad = Game.money >= roadCost;
  const roadItem = document.createElement('div');
  roadItem.className = 'build-item' + (!canAffordRoad ? ' disabled' : '');
  roadItem.innerHTML = `
    <div class="build-item-header">
      <span class="build-icon">🛤️</span>
      <span class="build-name">道路</span>
      <span class="build-cost">$${roadCost}</span>
    </div>
    <div class="build-item-detail">👷 人力: 0 | 📐 佔地: 1格</div>
    <div class="build-item-desc">建造道路以連接設備。物流管線必須沿道路運輸，先規劃好路線再建設備！</div>
    ${!canAffordRoad ? '<div class="build-warn">⚠ 資金不足</div>' : ''}
  `;
  if (canAffordRoad) {
    roadItem.addEventListener('click', () => buildRoad(row, col));
  }
  list.appendChild(roadItem);

  for (const [key, bDef] of Object.entries(GameConfig.BUILDINGS)) {
    const canAfford = Game.money >= bDef.cost;
    const hasManpower = getAvailableManpower() >= bDef.manpower;
    const hasSpace = checkBuildSpace(row, col, bDef.tileSize);

    const item = document.createElement('div');
    item.className = 'build-item' + (!canAfford || !hasManpower || !hasSpace ? ' disabled' : '');
    item.innerHTML = `
      <div class="build-item-header">
        <span class="build-icon">${bDef.icon}</span>
        <span class="build-name">${bDef.name}</span>
        <span class="build-cost">$${bDef.cost}</span>
      </div>
      <div class="build-item-detail">
        👷 人力: ${bDef.manpower} | 📐 佔地: ${bDef.tileSize}格
      </div>
      <div class="build-item-desc">${bDef.description}</div>
      ${!canAfford ? '<div class="build-warn">⚠ 資金不足</div>' : ''}
      ${!hasManpower ? '<div class="build-warn">⚠ 人力不足</div>' : ''}
      ${!hasSpace ? '<div class="build-warn">⚠ 空間不足</div>' : ''}
    `;

    if (canAfford && hasManpower && hasSpace) {
      item.addEventListener('click', () => buildEquipment(key, row, col));
    }

    list.appendChild(item);
  }
}

function buildRoad(row, col) {
  const tile = Game.campusLayout[row][col];
  if (tile !== 0 && tile !== 9) return;
  if (Game.money < GameConfig.ROAD.BUILD_COST) return;

  Game.money -= GameConfig.ROAD.BUILD_COST;
  if (tile === 9) {
    // 砍樹建路
    if (!Game.treeRemovedCount) Game.treeRemovedCount = 0;
    Game.treeRemovedCount++;
    Game.protestLevel += GameConfig.EXTERNALITY.TREE_REMOVAL_PROTEST;
    addAlert('⚠️ 砍樹建路！抗議值上升！', 'warning');
  }
  Game.campusLayout[row][col] = 1;
  closeBuildMenu();
  addAlert('道路建設完成！', 'success');
  updateHUD();
}

function closeBuildMenu() {
  Game.ui.showBuildMenu = false;
  Game.ui.selectedTile = null;
  document.getElementById('buildMenu').classList.add('hidden');
}

function checkBuildSpace(row, col, size) {
  for (let dr = 0; dr < size; dr++) {
    for (let dc = 0; dc < size; dc++) {
      const r = row + dr, c = col + dc;
      if (r >= GameConfig.MAP_ROWS || c >= GameConfig.MAP_COLS) return false;
      const tile = Game.campusLayout[r][c];
      if (tile !== 0 && tile !== 9) return false; // 草地和樹木都可建設
      if (Game.buildings.some(b => {
        for (let br = 0; br < b.def.tileSize; br++)
          for (let bc = 0; bc < b.def.tileSize; bc++)
            if (b.row + br === r && b.col + bc === c) return true;
        return false;
      })) return false;
      if (Game.resources.some(res => res.row === r && res.col === c)) return false;
    }
  }
  return true;
}

function getAvailableManpower() {
  const usedByBuildings = Game.buildings.reduce((sum, b) => sum + b.def.manpower, 0);
  const usedByLogistics = Game.logistics.filter(l => l.active).length * GameConfig.LOGISTICS.MANPOWER_PER_LINE;
  return Game.maxManpower - usedByBuildings - usedByLogistics;
}

function buildEquipment(key, row, col) {
  const def = GameConfig.BUILDINGS[key];
  if (Game.money < def.cost) return;
  if (getAvailableManpower() < def.manpower) return;

  Game.money -= def.cost;

  const building = {
    id: `bld_${key}_${Date.now()}`,
    type: key,
    def: def,
    row: row,
    col: col,
    efficiency: def.efficiency,
    health: 100,
    status: 'active', // active, damaged, repairing
    repairTimer: 0,
    inputConnections: [],
    outputConnections: [],
    processing: false,
    throughput: 0
  };

  // 檢查是否砍了樹
  let treesRemoved = 0;
  for (let dr = 0; dr < def.tileSize; dr++) {
    for (let dc = 0; dc < def.tileSize; dc++) {
      if (Game.campusLayout[row + dr][col + dc] === 9) {
        treesRemoved++;
        Game.campusLayout[row + dr][col + dc] = 0; // 清除樹木
      }
    }
  }
  if (treesRemoved > 0) {
    Game.protestLevel += GameConfig.EXTERNALITY.TREE_REMOVAL_PROTEST * treesRemoved;
    addAlert(`⚠️ 砍除 ${treesRemoved} 棵樹木！抗議值上升！`, 'warning');
    // 記錄砍樹位置用於持續外部成本
    if (!Game.treeRemovedCount) Game.treeRemovedCount = 0;
    Game.treeRemovedCount += treesRemoved;
  }

  Game.buildings.push(building);

  // 更新統計（脫硫、洗滌、混合在放置時即記錄；前處理在實際使用時記錄）
  if (key === 'DESULFURIZER') Game.stats.desulfurizerUsed = true;
  if (key === 'SCRUBBER') Game.stats.scrubberUsed = true;
  if (key === 'MIXER') Game.stats.mixerUsed = true;
  if (key === 'GASIFIER') Game.stats.gasifierUsed = true;

  closeBuildMenu();
  addAlert(`已建造 ${def.name}！`, 'success');
  updateHUD();
  updateSidePanel();
}

// ============================================================
// 物流連線系統
// ============================================================
function getNodeAt(row, col) {
  // 檢查是否是資源
  const res = Game.resources.find(r => r.row === row && r.col === col);
  if (res) return { type: 'resource', obj: res, id: res.id };

  // 檢查是否是建築
  const bld = Game.buildings.find(b => {
    for (let dr = 0; dr < b.def.tileSize; dr++)
      for (let dc = 0; dc < b.def.tileSize; dc++)
        if (b.row + dr === row && b.col + dc === col) return true;
    return false;
  });
  if (bld) return { type: 'building', obj: bld, id: bld.id };

  return null;
}

function canConnect(from, to) {
  if (!from || !to) return false;
  if (from.id === to.id) return false;

  // 防止重複連線
  if (Game.logistics.some(l => l.fromId === from.id && l.toId === to.id)) return false;

  // 資源只能連到設備
  if (from.type === 'resource' && to.type !== 'building') return false;

  // 資源不能接收輸入
  if (to.type === 'resource') return false;

  // 檢查輸入類型相容性
  if (to.type === 'building') {
    const targetDef = to.obj.def;
    if (from.type === 'resource') {
      return targetDef.acceptsInput.includes('resource');
    }
    if (from.type === 'building') {
      return targetDef.acceptsInput.includes(from.obj.def.outputType);
    }
  }

  return true;
}

function isAdjacentToRoad(row, col) {
  const layout = Game.campusLayout;
  // 自身是道路也算
  if (layout[row] && layout[row][col] === 1) return true;
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < GameConfig.MAP_ROWS && nc >= 0 && nc < GameConfig.MAP_COLS) {
      if (layout[nr][nc] === 1) return true;
    }
  }
  return false;
}

function nodeAdjacentToRoad(node) {
  if (node.type === 'resource') {
    return isAdjacentToRoad(node.obj.row, node.obj.col);
  }
  if (node.type === 'building') {
    // 任一格鄰道路即可
    const sz = node.obj.def.tileSize;
    for (let dr = 0; dr < sz; dr++) {
      for (let dc = 0; dc < sz; dc++) {
        if (isAdjacentToRoad(node.obj.row + dr, node.obj.col + dc)) return true;
      }
    }
  }
  return false;
}

/**
 * BFS 沿道路尋路：從起點格子找到最近的道路，再走到終點格子最近的道路
 * 回傳路徑的 waypoints [{r,c}, ...]，包含起終點
 */
function findRoadPath(fromRow, fromCol, toRow, toCol) {
  const layout = Game.campusLayout;
  const rows = GameConfig.MAP_ROWS, cols = GameConfig.MAP_COLS;

  // 找離某點最近的道路格
  function nearestRoad(r, c) {
    // 如果自己是道路就用自己
    if (layout[Math.round(r)] && layout[Math.round(r)][Math.round(c)] === 1) return {r: Math.round(r), c: Math.round(c)};
    let best = null, bestDist = Infinity;
    for (let dr = -3; dr <= 3; dr++) {
      for (let dc = -3; dc <= 3; dc++) {
        const nr = Math.round(r) + dr, nc = Math.round(c) + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && layout[nr][nc] === 1) {
          const d = Math.abs(dr) + Math.abs(dc);
          if (d < bestDist) { bestDist = d; best = {r: nr, c: nc}; }
        }
      }
    }
    return best;
  }

  const startRoad = nearestRoad(fromRow, fromCol);
  const endRoad = nearestRoad(toRow, toCol);
  if (!startRoad || !endRoad) return null; // 無法找到道路

  // BFS on road tiles
  const key = (r,c) => r * cols + c;
  const visited = new Set();
  const parent = new Map();
  const queue = [startRoad];
  visited.add(key(startRoad.r, startRoad.c));

  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  let found = false;

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.r === endRoad.r && cur.c === endRoad.c) { found = true; break; }
    for (const [dr, dc] of dirs) {
      const nr = cur.r + dr, nc = cur.c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (layout[nr][nc] !== 1) continue;
      const k = key(nr, nc);
      if (visited.has(k)) continue;
      visited.add(k);
      parent.set(k, cur);
      queue.push({r: nr, c: nc});
    }
  }

  if (!found) return null;

  // 回溯路徑
  const path = [];
  let cur = endRoad;
  while (cur) {
    path.unshift(cur);
    cur = parent.get(key(cur.r, cur.c)) || null;
  }

  // 簡化路徑：只保留轉角點
  const simplified = [{r: fromRow, c: fromCol}];
  if (path.length > 0) {
    simplified.push(path[0]);
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i-1], curr = path[i], next = path[i+1];
      // 方向改變時保留
      if ((curr.r - prev.r !== next.r - curr.r) || (curr.c - prev.c !== next.c - curr.c)) {
        simplified.push(curr);
      }
    }
    if (path.length > 1) simplified.push(path[path.length - 1]);
  }
  simplified.push({r: toRow, c: toCol});

  return simplified;
}

function createLogisticsLine(from, to) {
  const fromPos = getNodeCenter(from);
  const toPos = getNodeCenter(to);
  const dist = Math.sqrt(Math.pow(fromPos.r - toPos.r, 2) + Math.pow(fromPos.c - toPos.c, 2));
  const cost = Math.round(dist * GameConfig.LOGISTICS.COST_PER_TILE);

  // 檢查兩端都鄰接道路
  if (!nodeAdjacentToRoad(from) || !nodeAdjacentToRoad(to)) {
    addAlert('物流線兩端必須鄰接道路！先建造道路再連線。', 'warning');
    return false;
  }

  if (getAvailableManpower() < GameConfig.LOGISTICS.MANPOWER_PER_LINE) {
    addAlert(`人力不足！每條管線需要 ${GameConfig.LOGISTICS.MANPOWER_PER_LINE} 人力`, 'warning');
    return false;
  }

  if (Game.money < cost) {
    addAlert(`物流線資金不足（需 $${cost}）`, 'warning');
    return false;
  }

  Game.money -= cost;

  // 計算沿道路的路徑
  const waypoints = findRoadPath(fromPos.r, fromPos.c, toPos.r, toPos.c);

  const line = {
    id: `log_${Date.now()}`,
    fromId: from.id,
    toId: to.id,
    fromType: from.type,
    toType: to.type,
    fromRow: fromPos.r,
    fromCol: fromPos.c,
    toRow: toPos.r,
    toCol: toPos.c,
    waypoints: waypoints, // 沿道路的路徑點
    distance: dist,
    efficiency: Math.max(0.3, 1.0 - dist * GameConfig.LOGISTICS.EFFICIENCY_LOSS_PER_TILE),
    cost: cost,
    active: true
  };

  Game.logistics.push(line);

  // 更新連線引用
  if (from.type === 'resource') from.obj.connected = true;
  if (from.type === 'building') from.obj.outputConnections.push(line.id);
  if (to.type === 'building') to.obj.inputConnections.push(line.id);

  addAlert(`物流線建立完成（距離 ${dist.toFixed(1)} 格，效率 ${(line.efficiency * 100).toFixed(0)}%）`, 'info');
  updateHUD();
  return true;
}

function getNodeCenter(node) {
  if (node.type === 'resource') return { r: node.obj.row, c: node.obj.col };
  if (node.type === 'building') {
    const sz = node.obj.def.tileSize;
    return { r: node.obj.row + (sz - 1) / 2, c: node.obj.col + (sz - 1) / 2 };
  }
  return { r: 0, c: 0 };
}

// ============================================================
// 模擬引擎（每 tick 執行）
// ============================================================
function simulateTick() {
  if (Game.state !== 'PLAYING') return;

  // 1. 計算處理鏈
  simulateProcessingChain();

  // 2. 更新消化槽
  simulateDigester();

  // 3. 更新氣化爐
  simulateGasifier();

  // 4. 更新發電
  simulatePower();

  // 5. 更新外部成本
  simulateExternalities();

  // 6. 設備故障檢查
  simulateFailures();

  // 7. 維護成本
  simulateMaintenance();

  // 8. 停電事件
  simulatePowerOutage();

  // 9. 收益
  simulateRevenue();

  // 10. 檢查結束條件
  checkEndConditions();

  updateHUD();
  updateSidePanel();
}

function simulateProcessingChain() {
  // 追蹤所有最終進入消化系統的資源
  // 透過遞迴追蹤物流鏈：resource → [crusher] → [mixer] → digester
  const feedInputs = []; // { resource, rate, preprocessed }

  for (const res of Game.resources) {
    if (!res.active) continue;

    // 追蹤這個資源的所有路徑
    const paths = traceResourcePaths(res.id, res, 1.0, false, new Set());
    for (const path of paths) {
      feedInputs.push(path);
      Game.stats.resourcesUsed[res.type] = true;
    }
  }

  // 計算混合後的 C/N 比
  if (feedInputs.length > 0) {
    let totalC = 0, totalN = 0, totalRate = 0;
    let anyPreprocessed = false;
    for (const input of feedInputs) {
      const def = input.resource.def;
      const rate = input.rate;
      totalC += def.carbonContent * rate;
      totalN += def.nitrogenContent * rate;
      totalRate += rate;
      if (input.preprocessed) anyPreprocessed = true;
    }
    if (totalN > 0) {
      Game.mixerCN = totalC / totalN;
      if (Game.stats.bestCN === null || Math.abs(Game.mixerCN - 25) < Math.abs(Game.stats.bestCN - 25)) {
        Game.stats.bestCN = Game.mixerCN;
      }
      if (Game.stats.worstCN === null || Math.abs(Game.mixerCN - 25) > Math.abs(Game.stats.worstCN - 25)) {
        Game.stats.worstCN = Game.mixerCN;
      }
    }

    if (anyPreprocessed) Game.stats.preprocessUsed = true;
    Game.digesterState.olr = totalRate * 0.8;
  } else {
    Game.mixerCN = null;
    Game.digesterState.olr = 0;
  }
}

/**
 * 遞迴追蹤資源從起點到消化槽/混合槽的路徑
 * 回傳所有到達 DIGESTER 或 (MIXER→DIGESTER) 的路徑
 */
function traceResourcePaths(nodeId, resource, efficiencyAccum, wasPreprocessed, visited) {
  if (visited.has(nodeId)) return []; // 防止循環
  visited.add(nodeId);

  const results = [];

  // 找從此節點出發的所有物流線
  for (const line of Game.logistics) {
    if (!line.active || line.fromId !== nodeId) continue;

    const targetBld = findBuildingById(line.toId);
    if (!targetBld || targetBld.status !== 'active') continue;

    const newEff = efficiencyAccum * line.efficiency;

    if (targetBld.type === 'CRUSHER') {
      // 經過前處理，繼續追蹤
      const subPaths = traceResourcePaths(targetBld.id, resource, newEff * targetBld.efficiency, true, new Set(visited));
      results.push(...subPaths);
    } else if (targetBld.type === 'MIXER') {
      // 到達混合槽，繼續追蹤到消化槽
      const subPaths = traceResourcePaths(targetBld.id, resource, newEff * targetBld.efficiency, wasPreprocessed, new Set(visited));
      if (subPaths.length > 0) {
        results.push(...subPaths);
      } else {
        // 混合槽沒有連到消化槽，但仍記錄（顯示 C/N）
        results.push({
          resource: resource,
          rate: resource.outputRate * newEff,
          preprocessed: wasPreprocessed,
          reachedDigester: false,
          reachedGasifier: false
        });
      }
    } else if (targetBld.type === 'DIGESTER') {
      // 到達消化槽！
      results.push({
        resource: resource,
        rate: resource.outputRate * newEff,
        preprocessed: wasPreprocessed,
        reachedDigester: true,
        reachedGasifier: false
      });
    } else if (targetBld.type === 'GASIFIER') {
      // 到達氣化爐！
      results.push({
        resource: resource,
        rate: resource.outputRate * newEff,
        preprocessed: wasPreprocessed,
        reachedDigester: false,
        reachedGasifier: true
      });
    }
  }

  return results;
}

function simulateDigester() {
  const digester = Game.buildings.find(b => b.type === 'DIGESTER' && b.status === 'active');
  if (!digester) {
    Game.digesterState.gasOutput = 0;
    return;
  }

  const ds = Game.digesterState;
  const cn = Game.mixerCN;

  if (cn === null || ds.olr === 0) {
    // 無輸入，pH 緩慢回升
    ds.pH = Math.min(7.0, ds.pH + GameConfig.PH_RECOVERY_RATE_NORMAL);
    ds.gasOutput = 0;
    ds.stability = Math.min(100, ds.stability + 0.5);
    return;
  }

  // C/N 效率
  let cnEfficiency = 1.0;
  if (cn < 15) cnEfficiency = GameConfig.CN_EFFICIENCY_CURVE.below15;
  else if (cn < 20) cnEfficiency = GameConfig.CN_EFFICIENCY_CURVE.range15to20;
  else if (cn <= 30) cnEfficiency = GameConfig.CN_EFFICIENCY_CURVE.range20to30;
  else if (cn <= 35) cnEfficiency = GameConfig.CN_EFFICIENCY_CURVE.range30to35;
  else cnEfficiency = GameConfig.CN_EFFICIENCY_CURVE.above35;

  // OLR 影響
  let olrFactor = 1.0;
  if (ds.olr > GameConfig.OLR_DANGER) {
    olrFactor = 0.4;
    ds.pH -= GameConfig.PH_DROP_RATE_OVERFEED;
    ds.stability -= 3;
  } else if (ds.olr > GameConfig.OLR_SAFE_MAX) {
    olrFactor = 0.7;
    ds.pH -= GameConfig.PH_DROP_RATE_OVERFEED * 0.5;
    ds.stability -= 1;
  }

  // C/N 不佳時 pH 也會下降
  if (cn < 15 || cn > 35) {
    ds.pH -= GameConfig.PH_DROP_RATE_BAD_CN;
    ds.stability -= 1.5;
  } else if (cn >= 20 && cn <= 30) {
    ds.pH = Math.min(7.0, ds.pH + GameConfig.PH_RECOVERY_RATE_NORMAL * 2);
    ds.stability = Math.min(100, ds.stability + 1);
  }

  // 酸化檢查
  if (ds.pH < GameConfig.PH_MIN_SAFE) {
    if (!ds.acidified) {
      ds.acidified = true;
      Game.stats.acidifications++;
      addAlert('⚠️ 消化槽酸化崩潰！pH 過低，產氣停止！', 'danger');
    }
    ds.gasOutput = 0;
    ds.stability = Math.max(0, ds.stability - 5);
    return;
  }

  ds.acidified = false;

  // 計算產氣量
  const preprocessBonus = Game.stats.preprocessUsed ? 1.0 : 0.7;
  ds.gasOutput = ds.olr * cnEfficiency * olrFactor * preprocessBonus * digester.efficiency * (ds.stability / 100);
  ds.totalGasProduced += ds.gasOutput;
}

function simulateGasifier() {
  const gasifier = Game.buildings.find(b => b.type === 'GASIFIER' && b.status === 'active');
  if (!gasifier) {
    Game.gasifierState.syngasOutput = 0;
    return;
  }

  // 收集到達氣化爐的資源
  let totalRate = 0;
  let weightedMoisture = 0;
  let totalGasYield = 0;

  for (const res of Game.resources) {
    if (!res.active) continue;
    const paths = traceResourcePaths(res.id, res, 1.0, false, new Set());
    for (const path of paths) {
      if (path.reachedGasifier) {
        const moisture = path.resource.def.moisture;
        const gasYield = path.resource.def.gasYield;
        totalRate += path.rate;
        weightedMoisture += moisture * path.rate;
        totalGasYield += gasYield * path.rate;
      }
    }
  }

  if (totalRate === 0) {
    Game.gasifierState.syngasOutput = 0;
    return;
  }

  Game.stats.gasifierUsed = true;

  const avgMoisture = weightedMoisture / totalRate;
  Game.gasifierState.inputMoisture = avgMoisture;

  // 低含水量效率更高：moisture < 0.5 合適，越乾越好
  const moistureEfficiency = Math.max(0.1, 1.0 - avgMoisture * 1.2);

  const avgGasYield = totalGasYield / totalRate;
  const preprocessBonus = Game.stats.preprocessUsed ? 1.0 : 0.8;

  Game.gasifierState.syngasOutput = totalRate * avgGasYield * moistureEfficiency * preprocessBonus * gasifier.efficiency;
  Game.gasifierState.totalSyngasProduced += Game.gasifierState.syngasOutput;
}

function simulatePower() {
  const desulfurizer = Game.buildings.find(b => b.type === 'DESULFURIZER' && b.status === 'active');
  const generator = Game.buildings.find(b => b.type === 'GENERATOR' && b.status === 'active');
  const syngasEngine = Game.buildings.find(b => b.type === 'SYNGAS_ENGINE' && b.status === 'active');

  let biogasElectricity = 0;
  let syngasElectricity = 0;

  // 沼氣發電路徑
  if (generator) {
    // 檢查沼氣是否有連到脫硫再到發電機
    const hasDesulfurLine = desulfurizer && isConnected(desulfurizer.id, generator.id);
    const hasDirectBiogas = Game.buildings.some(b =>
      b.type === 'DIGESTER' && isConnected(b.id, generator.id)
    );
    const hasCleanBiogas = desulfurizer && Game.buildings.some(b =>
      b.type === 'DIGESTER' && isConnected(b.id, desulfurizer.id)
    ) && hasDesulfurLine;

    let biogasInput = Game.digesterState.gasOutput;
    let corrosionPenalty = 1.0;

    if (hasCleanBiogas) {
      corrosionPenalty = 1.0;
    } else if (hasDirectBiogas) {
      corrosionPenalty = GameConfig.FAILURE.CORROSION_EFFICIENCY_PENALTY;
    } else {
      biogasInput = 0;
    }

    Game.powerState.biogasAvailable = biogasInput;
    biogasElectricity = biogasInput * generator.efficiency * corrosionPenalty * 10;
  } else {
    Game.powerState.biogasAvailable = 0;
  }

  // 合成氣發電路徑
  if (syngasEngine) {
    const hasGasifierConnection = Game.buildings.some(b =>
      b.type === 'GASIFIER' && isConnected(b.id, syngasEngine.id)
    );
    if (hasGasifierConnection && Game.gasifierState.syngasOutput > 0) {
      syngasElectricity = Game.gasifierState.syngasOutput * syngasEngine.efficiency * 8;
    }
  }

  Game.powerState.electricityOutput = biogasElectricity + syngasElectricity;

  if (Game.powerState.electricityOutput > Game.stats.maxElectricity) {
    Game.stats.maxElectricity = Game.powerState.electricityOutput;
  }

  Game.totalEnergy += Game.powerState.electricityOutput;
}

function isConnected(fromBldId, toBldId) {
  return Game.logistics.some(l =>
    l.fromId === fromBldId && l.toId === toBldId && l.active
  );
}

function simulateExternalities() {
  const ext = GameConfig.EXTERNALITY;
  let resourceSmell = 0;
  let processingSmell = 0;
  let noiseIncrease = 0;

  // 未連接資源的自然臭味（很低，給玩家時間建設）
  for (const res of Game.resources) {
    if (res.active && !res.connected) {
      resourceSmell += ext.SMELL_UNTREATED_RESOURCE * res.def.smellRisk;
    }
  }

  // 活躍設備噪音
  noiseIncrease = Game.buildings.filter(b => b.status === 'active').length * ext.NOISE_PER_EQUIPMENT;

  // 有設備在處理但無洗滌塔的臭味
  const hasActiveProcessing = (Game.buildings.some(b =>
    (b.type === 'DIGESTER' || b.type === 'MIXER') && b.status === 'active'
  ) && Game.digesterState.olr > 0) || (Game.buildings.some(b =>
    b.type === 'GASIFIER' && b.status === 'active'
  ) && Game.gasifierState.syngasOutput > 0);
  if (hasActiveProcessing) {
    processingSmell += ext.SMELL_PROCESSING_NO_SCRUBBER;
  }

  // 酸化崩潰臭味
  if (Game.digesterState.acidified) {
    processingSmell += ext.SMELL_ACIDIFICATION;
  }

  // 物流距離臭味
  for (const line of Game.logistics) {
    if (line.active) {
      processingSmell += line.distance * ext.LOGISTICS_DISTANCE_FACTOR;
    }
  }

  // 接近性外部成本：設備太靠近學生設施
  let proximityCost = 0;
  const studentTiles = [2, 3, 4, 5, 6]; // 餐廳、宿舍、教學樓、行政中心、圖書館
  for (const bld of Game.buildings) {
    if (bld.status !== 'active') continue;
    let minDist = Infinity;
    const bldCenterR = bld.row + (bld.def.tileSize - 1) / 2;
    const bldCenterC = bld.col + (bld.def.tileSize - 1) / 2;

    for (let r = 0; r < GameConfig.MAP_ROWS; r++) {
      for (let c = 0; c < GameConfig.MAP_COLS; c++) {
        if (studentTiles.includes(Game.campusLayout[r][c])) {
          const d = Math.sqrt(Math.pow(bldCenterR - r, 2) + Math.pow(bldCenterC - c, 2));
          if (d < minDist) minDist = d;
        }
      }
    }

    if (minDist < ext.PROXIMITY_SAFE_DISTANCE) {
      proximityCost += (ext.PROXIMITY_SAFE_DISTANCE - minDist) * ext.PROXIMITY_COST_PER_TILE;
    }
  }
  processingSmell += proximityCost;

  // 砍樹的持續外部成本
  if (Game.treeRemovedCount > 0) {
    processingSmell += Game.treeRemovedCount * GameConfig.EXTERNALITY.TREE_REMOVAL_ONGOING;
  }

  // 洗滌塔僅減免「處理中」的臭味，不減免資源自然臭味
  const hasScrubber = Game.buildings.some(b => b.type === 'SCRUBBER' && b.status === 'active');
  if (hasScrubber) {
    processingSmell *= (1 - ext.SCRUBBER_REDUCTION);
  } else if (hasActiveProcessing) {
    processingSmell *= ext.SMELL_NO_SCRUBBER_MULTIPLIER;
  }

  // 儲存明細供 UI 顯示
  Game.externalityBreakdown = {
    resourceSmell: resourceSmell,
    processingSmell: processingSmell,
    noise: noiseIncrease,
    proximity: proximityCost,
    treeRemoval: Game.treeRemovedCount ? Game.treeRemovedCount * ext.TREE_REMOVAL_ONGOING : 0,
    scrubberReduction: hasScrubber
  };

  // 自然衰減
  const totalIncrease = resourceSmell + processingSmell + noiseIncrease - ext.NATURAL_DECAY;

  Game.protestLevel = Math.max(0, Math.min(ext.MAX_PROTEST, Game.protestLevel + totalIncrease));

  // 警告
  if (Game.protestLevel > 60 && Game.protestLevel <= 62) {
    addAlert('⚠️ 抗議值超過 60%！居民開始不滿！', 'warning');
  }
  if (Game.protestLevel > 80 && Game.protestLevel <= 82) {
    addAlert('🚨 抗議值超過 80%！即將爆發抗議！', 'danger');
  }
}

function simulateFailures() {
  const fail = GameConfig.FAILURE;

  for (const bld of Game.buildings) {
    if (bld.status === 'repairing') {
      bld.repairTimer--;
      if (bld.repairTimer <= 0) {
        bld.status = 'active';
        bld.health = 80;
        bld.efficiency = bld.def.efficiency * 0.9;
        addAlert(`${bld.def.name} 維修完成！`, 'success');
      }
      continue;
    }
    if (bld.status !== 'active') continue;

    // 消化槽堵塞（無前處理）
    if (bld.type === 'DIGESTER' && !Game.stats.preprocessUsed) {
      if (Game.digesterState.olr > 0 && Math.random() < fail.NO_PREPROCESS_CLOG_RATE) {
        bld.status = 'damaged';
        bld.efficiency *= fail.CLOG_EFFICIENCY_PENALTY;
        Game.stats.failures++;
        addAlert('⚠️ 消化槽堵塞！缺少前處理設備！', 'danger');
      }
    }

    // 發電機腐蝕（無脫硫）
    if (bld.type === 'GENERATOR' && !Game.stats.desulfurizerUsed) {
      if (Game.powerState.biogasAvailable > 0 && Math.random() < fail.NO_DESULFUR_CORROSION_RATE) {
        bld.health -= 15;
        bld.efficiency = bld.def.efficiency * (bld.health / 100);
        if (bld.health <= 30) {
          bld.status = 'damaged';
          Game.stats.failures++;
          addAlert('⚠️ 發電機嚴重腐蝕！缺少脫硫設備！', 'danger');
        }
      }
    }
  }
}

function repairBuilding(buildingId) {
  const bld = Game.buildings.find(b => b.id === buildingId);
  if (!bld || bld.status !== 'damaged') return;

  const cost = Math.round(bld.def.cost * GameConfig.FAILURE.REPAIR_COST_MULTIPLIER);
  if (Game.money < cost) {
    addAlert(`維修資金不足（需 $${cost}）`, 'warning');
    return;
  }

  Game.money -= cost;
  bld.status = 'repairing';
  bld.repairTimer = GameConfig.FAILURE.REPAIR_TIME_TICKS;
  addAlert(`${bld.def.name} 維修中...`, 'info');
}

function recoverAcidification() {
  if (!Game.digesterState.acidified) return;
  if (Game.money < GameConfig.PH_RECOVERY_COST) {
    addAlert(`鹼劑費用不足（需 $${GameConfig.PH_RECOVERY_COST}）`, 'warning');
    return;
  }
  Game.money -= GameConfig.PH_RECOVERY_COST;
  Game.digesterState.pH = 6.5;
  Game.digesterState.acidified = false;
  Game.digesterState.stability = 40;
  addAlert('已投入鹼劑，消化槽 pH 回升中...', 'success');
}

function simulateMaintenance() {
  let totalMaint = 0;
  for (const bld of Game.buildings) {
    if (bld.status === 'active') {
      totalMaint += bld.def.cost * GameConfig.MAINTENANCE_COST_RATE;
    }
  }
  Game.money -= totalMaint;
  Game.totalMaintenanceCost += totalMaint;
}

function simulateRevenue() {
  const revenue = Game.powerState.electricityOutput * GameConfig.ELECTRICITY_PRICE;
  Game.money += revenue;
  Game.totalRevenue += revenue;
}

function simulatePowerOutage() {
  const timeLeft = Game.timer;

  // 計算哪些校園建築有電（根據電線 + 發電量）
  const poweredBuildings = [];
  let remainingPower = Game.powerState.electricityOutput;
  for (const pl of Game.powerLines) {
    // 檢查發電設備還在運作
    const gen = Game.buildings.find(b => b.id === pl.generatorId && b.status === 'active');
    if (!gen) continue;
    if (remainingPower >= pl.powerDemand) {
      remainingPower -= pl.powerDemand;
      poweredBuildings.push(pl.campusTile);
    }
  }
  Game.powerState.poweredCampusBuildings = poweredBuildings;

  // 平時供電微量加分
  if (!Game.powerOutage.active && poweredBuildings.length > 0) {
    let normalBonus = 0;
    for (const tile of poweredBuildings) {
      let mult = 1;
      if (Game.requiredPowerBuildings.includes(tile)) mult = GameConfig.POWERLINE.REQUIRED_BONUS_MULTIPLIER;
      normalBonus += GameConfig.POWERLINE.NORMAL_SCORE_PER_BUILDING * mult;
    }
    Game.powerState.normalPowerScore += normalBonus;
  }

  // 觸發停電
  if (!Game.powerOutage.triggered && timeLeft <= GameConfig.POWER_OUTAGE_TIME) {
    Game.powerOutage.triggered = true;
    Game.powerOutage.active = true;
    Game.powerOutage.timeRemaining = GameConfig.POWER_OUTAGE_DURATION * (1000 / GameConfig.TICK_INTERVAL);
    Game.powerState.mainGridOn = false;
    addAlert('🌀 颱風來襲！主電網斷電！校園進入緊急狀態！', 'danger');
  }

  if (Game.powerOutage.active) {
    Game.powerOutage.timeRemaining--;

    // 檢查是否能孤島運轉
    if (Game.powerState.electricityOutput >= GameConfig.MICROGRID.MIN_POWER_FOR_ISLAND) {
      Game.powerState.islandMode = true;

      // 停電期間有電線供電的建築大加分
      for (const tile of poweredBuildings) {
        let mult = 1;
        if (Game.requiredPowerBuildings.includes(tile)) mult = GameConfig.POWERLINE.REQUIRED_BONUS_MULTIPLIER;
        Game.powerState.resilienceScore += GameConfig.POWERLINE.OUTAGE_SCORE_PER_BUILDING * mult;
      }
    } else {
      Game.powerState.islandMode = false;
    }

    // 停電結束
    if (Game.powerOutage.timeRemaining <= 0) {
      Game.powerOutage.active = false;
      Game.powerState.mainGridOn = true;
      Game.powerState.islandMode = false;
      addAlert('⚡ 主電網已恢復供電！', 'success');
    }
  }
}

function checkEndConditions() {
  // 抗議失敗
  if (Game.protestLevel >= GameConfig.EXTERNALITY.MAX_PROTEST) {
    Game.state = 'GAMEOVER';
    showGameOver('protest');
    return;
  }

  // 時間到
  if (Game.timer <= 0) {
    Game.state = 'GAMEOVER';
    showGameOver('timeout');
  }
}

// ============================================================
// 分數計算
// ============================================================
function calculateScore(reason) {
  const sc = GameConfig.SCORING;
  const scores = {};

  // 1. 能源產出
  scores.energy = Math.min(1, Game.totalEnergy / 5000) * sc.MAX_SCORE * sc.ENERGY_WEIGHT;

  // 2. 經濟效益
  const netProfit = Game.totalRevenue - Game.totalMaintenanceCost;
  scores.economy = Math.max(0, Math.min(1, (Game.money + netProfit) / GameConfig.INITIAL_MONEY)) * sc.MAX_SCORE * sc.ECONOMY_WEIGHT;

  // 3. 技術匹配
  let techScore = 0;
  if (Game.stats.preprocessUsed) techScore += 0.20;
  if (Game.stats.mixerUsed) techScore += 0.20;
  if (Game.stats.desulfurizerUsed) techScore += 0.20;
  if (Game.stats.scrubberUsed) techScore += 0.20;
  if (Game.stats.gasifierUsed) techScore += 0.20;
  techScore = Math.min(1.0, techScore);
  scores.techMatch = techScore * sc.MAX_SCORE * sc.TECH_MATCH_WEIGHT;

  // 4. C/N 管理
  let cnScore = 0;
  if (Game.stats.bestCN !== null) {
    const bestDist = Math.abs(Game.stats.bestCN - 25);
    cnScore = Math.max(0, 1 - bestDist / 25);
  }
  if (Object.keys(Game.stats.resourcesUsed).length >= 2) cnScore += 0.2;
  scores.cnManagement = Math.min(1, cnScore) * sc.MAX_SCORE * sc.CN_MANAGEMENT_WEIGHT;

  // 5. 物流效率（沒有管線 = 0 分）
  let logisticsScore = 0;
  if (Game.logistics.length > 0) {
    const avgEff = Game.logistics.reduce((s, l) => s + l.efficiency, 0) / Game.logistics.length;
    logisticsScore = avgEff;
  }
  scores.logistics = logisticsScore * sc.MAX_SCORE * sc.LOGISTICS_WEIGHT;

  // 6. 外部成本控制
  scores.externality = Math.max(0, 1 - Game.protestLevel / 100) * sc.MAX_SCORE * sc.EXTERNALITY_WEIGHT;

  // 7. 微電網韌性（停電大加分 + 平時微量加分）
  const resilienceRaw = Game.powerState.resilienceScore + Game.powerState.normalPowerScore;
  scores.resilience = Math.min(1, resilienceRaw / 8000) * sc.MAX_SCORE * sc.RESILIENCE_WEIGHT;

  // 8. 系統穩定度（沒建消化槽 = 0 分）
  const hasDigester = Game.buildings.some(b => b.type === 'DIGESTER');
  const stabilityRaw = hasDigester ? (Game.digesterState.stability / 100) * (1 - Game.stats.acidifications * 0.3) : 0;
  scores.stability = Math.max(0, stabilityRaw) * sc.MAX_SCORE * sc.STABILITY_WEIGHT;

  // 9a. 電線接電分（接了多少棟 / 5 棟可接電建築）
  const poweredCount = Game.powerLines.length;
  const reqMet = Game.requiredPowerBuildings.every(t => Game.powerLines.some(pl => pl.campusTile === t));
  scores.powerline = Math.min(1, poweredCount / 4 + (reqMet ? 0.3 : 0)) * sc.MAX_SCORE * (sc.POWERLINE_WEIGHT || 0);

  // 9. 時間獎勵（提早交卷）
  scores.timeBonus = 0;
  if (reason === 'submit' && Game.timer > 0) {
    const timeRatio = Game.timer / GameConfig.GAME_DURATION;
    scores.timeBonus = Math.round(timeRatio * GameConfig.TIME_BONUS_MAX);
  }

  // 總分
  scores.total = Math.round(
    scores.energy + scores.economy + scores.techMatch +
    scores.cnManagement + scores.logistics + scores.externality +
    scores.resilience + scores.stability + scores.powerline + scores.timeBonus
  );

  // 若抗議失敗，扣分
  if (reason === 'protest') {
    scores.total = Math.round(scores.total * 0.5);
  }

  // 等級
  if (scores.total >= sc.GRADE_S) scores.grade = 'S';
  else if (scores.total >= sc.GRADE_A) scores.grade = 'A';
  else if (scores.total >= sc.GRADE_B) scores.grade = 'B';
  else if (scores.total >= sc.GRADE_C) scores.grade = 'C';
  else scores.grade = 'D';

  return scores;
}

// ============================================================
// 教學回饋
// ============================================================
function generateFeedback(scores, reason) {
  let fb = [];

  // 資源辨識
  const usedCount = Object.keys(Game.stats.resourcesUsed).length;
  const totalRes = Game.resources.length;
  if (usedCount === 0) {
    fb.push('📋 你沒有連接任何生質資源。生質能系統需要原料才能運作！下次試試將廚餘或有機肥水連到設備。');
  } else if (usedCount === 1) {
    fb.push(`📋 你只使用了一種資源。單一原料的 C/N 比往往不理想，試試混合不同資源來達到最佳配比。`);
  } else {
    fb.push(`📋 很好！你使用了 ${usedCount} 種資源，這是共消化的正確做法。混合多種原料有助於調整 C/N 比。`);
  }

  // C/N 管理
  if (Game.stats.bestCN !== null) {
    const cn = Game.stats.bestCN;
    if (cn >= 20 && cn <= 30) {
      fb.push(`🔬 你的 C/N 比管理非常出色（${cn.toFixed(1)}），恰好在 20-30 的最佳範圍內！厭氧微生物在此範圍效率最高。`);
    } else if (cn < 15) {
      fb.push(`🔬 C/N 比太低（${cn.toFixed(1)}），低於 15 會導致氨抑制。試著加入枯枝落葉等高碳材料來提升碳源。`);
    } else if (cn > 35) {
      fb.push(`🔬 C/N 比太高（${cn.toFixed(1)}），超過 35 表示氮不足，微生物生長緩慢。加入廚餘或糞水可增加氮源。`);
    } else {
      fb.push(`🔬 C/N 比為 ${cn.toFixed(1)}，接近最佳範圍但還有改善空間。最佳範圍是 20-30。`);
    }
  } else {
    fb.push('🔬 沒有偵測到 C/N 比數據，可能沒有正確連接資源到混合槽或消化槽。');
  }

  // 技術選擇
  if (!Game.stats.preprocessUsed) {
    fb.push('⚙️ 你沒有建造前處理設備！未處理的原料容易造成消化槽堵塞，增加故障率和維修成本。');
  }
  if (!Game.stats.desulfurizerUsed) {
    fb.push('🧪 你沒有建造脫硫塔！沼氣中的硫化氫會腐蝕發電機，大幅縮短設備壽命。');
  }
  if (!Game.stats.scrubberUsed) {
    fb.push('💨 你沒有建造廢氣洗滌塔！排放的臭味和汙染物會快速增加社區抗議。');
  }
  if (Game.stats.gasifierUsed) {
    fb.push('🔥 你使用了氣化爐路徑！氣化技術適合乾燥原料（如枯枝、廢油），是厭氧消化之外的替代能源轉換方式。');
  }
  if (Game.stats.preprocessUsed && Game.stats.desulfurizerUsed && Game.stats.scrubberUsed) {
    fb.push('⚙️ 技術配置完整！前處理、脫硫、洗滌塔都到位，這是成熟的生質能系統規劃。');
  }

  // 物流
  if (Game.logistics.length > 0) {
    const avgDist = Game.logistics.reduce((s, l) => s + l.distance, 0) / Game.logistics.length;
    if (avgDist > 8) {
      fb.push('🚛 物流路線偏長（平均 ' + avgDist.toFixed(1) + ' 格），增加了運輸成本和臭味擴散。將設備建在資源附近可以改善。');
    } else {
      fb.push('🚛 物流規劃合理，路線保持在適當距離內，有效控制了運輸成本。');
    }
  }

  // 系統穩定度
  if (Game.stats.acidifications > 0) {
    fb.push(`⚠️ 消化槽發生了 ${Game.stats.acidifications} 次酸化崩潰。過度餵料會導致 pH 下降，記得控制進料速度。`);
  }

  // 電線連接
  const plCount = Game.powerLines.length;
  if (plCount === 0) {
    fb.push('🔌 你沒有拉電線到任何校園建築！點擊校園建築可接電。接電後平時微量加分、停電時大加分。');
  } else {
    const reqMet = Game.requiredPowerBuildings.every(t => Game.powerLines.some(pl => pl.campusTile === t));
    if (reqMet) {
      fb.push(`🔌 很好！你成功為所有任務指定建築接電（${plCount} 棟），展現了完整的微電網規劃能力！`);
    } else {
      fb.push(`🔌 你接了 ${plCount} 棟建築的電線，但未完成所有任務指定建築。必接建築有額外加分！`);
    }
  }

  // 停電韌性
  if (Game.powerState.resilienceScore > 0) {
    fb.push('⚡ 太棒了！在颱風停電期間，你的生質能系統成功支撐了校園微電網，這就是能源韌性！');
  } else if (Game.powerOutage.triggered) {
    fb.push('⚡ 停電期間你的系統無法提供足夠電力。確保在停電前建好完整的發電系統鏈並接電到建築。');
  }

  // 提早交卷
  if (reason === 'submit') {
    const minutesLeft = Math.floor(Game.timer / 60);
    fb.push(`⏱ 你提早完成設計！剩餘 ${minutesLeft} 分鐘，獲得時間獎勵分數。高效的規劃值得肯定！`);
  }

  // 失敗分析
  if (reason === 'protest') {
    fb.push('🚫 本次遊戲因社區抗議而提前結束。外部成本（臭味、噪音、汙染）是生質能設施的重要挑戰，需要透過脫硫、洗滌、適當物流來控制。');
  }

  // 改善建議
  fb.push('');
  fb.push('💡 改善建議：');
  if (usedCount < 2) fb.push('  • 嘗試混合至少 2-3 種資源，優化 C/N 比');
  if (!Game.stats.preprocessUsed) fb.push('  • 先建前處理設備再送入消化槽');
  if (!Game.stats.desulfurizerUsed) fb.push('  • 在發電機前加裝脫硫塔保護設備');
  if (!Game.stats.scrubberUsed) fb.push('  • 建造廢氣洗滌塔控制抗議值');
  if (Game.stats.acidifications > 0) fb.push('  • 避免一次送入太多原料，控制有機負荷率');
  fb.push('  • 將設備建在資源附近，縮短物流距離');

  return fb.join('\n');
}

// ============================================================
// 結算畫面
// ============================================================
function showGameOver(reason) {
  const scores = calculateScore(reason);
  const feedback = generateFeedback(scores, reason);

  document.getElementById('hudBar').classList.add('hidden');
  document.getElementById('sidePanel').classList.add('hidden');
  document.getElementById('buildMenu').classList.add('hidden');
  document.getElementById('infoPanel').classList.add('hidden');

  const screen = document.getElementById('gameOverScreen');
  screen.classList.remove('hidden');

  document.getElementById('goTitle').textContent =
    reason === 'protest' ? '💢 校園抗議爆發！遊戲結束' :
    reason === 'submit' ? '✅ 設計完成！提交評分' : '⏰ 時間到！遊戲結束';

  document.getElementById('goGrade').textContent = scores.grade;
  document.getElementById('goGrade').className = 'grade grade-' + scores.grade.toLowerCase();
  document.getElementById('goTotal').textContent = scores.total;

  // 分項
  document.getElementById('goEnergy').textContent = Math.round(scores.energy);
  document.getElementById('goEconomy').textContent = Math.round(scores.economy);
  document.getElementById('goTech').textContent = Math.round(scores.techMatch);
  document.getElementById('goCN').textContent = Math.round(scores.cnManagement);
  document.getElementById('goLogistics').textContent = Math.round(scores.logistics);
  document.getElementById('goExternality').textContent = Math.round(scores.externality);
  document.getElementById('goResilience').textContent = Math.round(scores.resilience);
  document.getElementById('goStability').textContent = Math.round(scores.stability);
  document.getElementById('goPowerline').textContent = Math.round(scores.powerline);

  // 時間獎勵
  const timeBonusRow = document.getElementById('goTimeBonusRow');
  if (scores.timeBonus > 0) {
    timeBonusRow.style.display = '';
    document.getElementById('goTimeBonus').textContent = Math.round(scores.timeBonus);
  } else {
    timeBonusRow.style.display = 'none';
  }

  document.getElementById('goFeedback').textContent = feedback;
}

// ============================================================
// UI 更新
// ============================================================
function updateHUD() {
  document.getElementById('hudTimer').textContent = formatTime(Game.timer);
  document.getElementById('hudMoney').textContent = `$${Math.round(Game.money)}`;
  document.getElementById('hudManpower').textContent = `${getAvailableManpower()}/${Game.maxManpower}`;
  document.getElementById('hudProtest').style.width = `${Math.min(100, Game.protestLevel)}%`;
  document.getElementById('hudProtestText').textContent = `${Math.round(Game.protestLevel)}%`;

  const powerEl = document.getElementById('hudPower');
  if (Game.powerOutage.active) {
    powerEl.textContent = Game.powerState.islandMode ? '⚡ 孤島供電中' : '🔌 停電中！';
    powerEl.className = Game.powerState.islandMode ? 'power-island' : 'power-off';
  } else {
    powerEl.textContent = `⚡ ${Math.round(Game.powerState.electricityOutput)} kW`;
    powerEl.className = 'power-on';
  }
}

function updateSidePanel() {
  // 消化槽狀態
  const dsPanel = document.getElementById('digesterStatus');
  const ds = Game.digesterState;

  let phClass = 'status-good';
  if (ds.pH < 6.0) phClass = 'status-danger';
  else if (ds.pH < 6.5) phClass = 'status-warn';

  let olrClass = 'status-good';
  if (ds.olr > GameConfig.OLR_DANGER) olrClass = 'status-danger';
  else if (ds.olr > GameConfig.OLR_SAFE_MAX) olrClass = 'status-warn';

  dsPanel.innerHTML = `
    <div class="status-row">
      <span>pH 值</span>
      <span class="${phClass}">${ds.pH.toFixed(2)}</span>
      <div class="mini-bar"><div class="mini-bar-fill" style="width:${(ds.pH / 8) * 100}%;background:${ds.pH < 6 ? '#e74c3c' : ds.pH < 6.5 ? '#f39c12' : '#27ae60'}"></div></div>
    </div>
    <div class="status-row">
      <span>有機負荷率</span>
      <span class="${olrClass}">${ds.olr.toFixed(1)}</span>
      <div class="mini-bar"><div class="mini-bar-fill" style="width:${Math.min(100, (ds.olr / 8) * 100)}%;background:${ds.olr > 6 ? '#e74c3c' : ds.olr > 4 ? '#f39c12' : '#27ae60'}"></div></div>
    </div>
    <div class="status-row">
      <span>穩定度</span>
      <span>${Math.round(ds.stability)}%</span>
      <div class="mini-bar"><div class="mini-bar-fill" style="width:${ds.stability}%;background:${ds.stability < 30 ? '#e74c3c' : ds.stability < 60 ? '#f39c12' : '#27ae60'}"></div></div>
    </div>
    <div class="status-row">
      <span>產氣量</span>
      <span>${ds.gasOutput.toFixed(1)} m³/h</span>
    </div>
    ${ds.acidified ? '<div class="acid-warn">🚨 酸化崩潰中！<button onclick="recoverAcidification()" class="btn-small">投鹼劑 $' + GameConfig.PH_RECOVERY_COST + '</button></div>' : ''}
  `;

  // C/N 顯示
  const cnPanel = document.getElementById('cnStatus');
  if (Game.mixerCN !== null) {
    const cn = Game.mixerCN;
    let cnClass = 'cn-optimal';
    let cnLabel = '最佳';
    if (cn < 15) { cnClass = 'cn-danger'; cnLabel = '氨抑制！'; }
    else if (cn < 20) { cnClass = 'cn-warn'; cnLabel = '偏低'; }
    else if (cn > 35) { cnClass = 'cn-danger'; cnLabel = '氮不足！'; }
    else if (cn > 30) { cnClass = 'cn-warn'; cnLabel = '偏高'; }

    cnPanel.innerHTML = `
      <div class="cn-display ${cnClass}">
        <div class="cn-value">${cn.toFixed(1)}</div>
        <div class="cn-label">C/N 比 — ${cnLabel}</div>
        <div class="cn-bar">
          <div class="cn-zone cn-low" style="width:25%">＜15</div>
          <div class="cn-zone cn-mid" style="width:15%">15-20</div>
          <div class="cn-zone cn-opt" style="width:20%">20-30</div>
          <div class="cn-zone cn-mid" style="width:15%">30-35</div>
          <div class="cn-zone cn-low" style="width:25%">＞35</div>
          <div class="cn-marker" style="left:${Math.min(98, Math.max(2, (cn / 60) * 100))}%">▼</div>
        </div>
      </div>
    `;
  } else {
    cnPanel.innerHTML = '<div class="cn-empty">尚無資源輸入</div>';
  }

  // 發電狀態
  const pwPanel = document.getElementById('powerStatus');
  pwPanel.innerHTML = `
    <div class="status-row">
      <span>沼氣供應</span>
      <span>${Game.powerState.biogasAvailable.toFixed(1)} m³/h</span>
    </div>
    ${Game.gasifierState.syngasOutput > 0 ? `
    <div class="status-row">
      <span>合成氣供應</span>
      <span>${Game.gasifierState.syngasOutput.toFixed(1)} m³/h</span>
    </div>` : ''}
    <div class="status-row">
      <span>發電輸出</span>
      <span>${Math.round(Game.powerState.electricityOutput)} kW</span>
    </div>
    <div class="status-row">
      <span>主電網</span>
      <span>${Game.powerState.mainGridOn ? '✅ 正常' : '❌ 斷電'}</span>
    </div>
    ${Game.powerOutage.active ? `
    <div class="outage-info">
      🌀 颱風停電中！剩餘 ${Math.ceil(Game.powerOutage.timeRemaining * GameConfig.TICK_INTERVAL / 1000)} 秒
      ${Game.powerState.islandMode ? '<br>✅ 微電網孤島運轉中' : '<br>❌ 發電量不足，無法孤島運轉'}
    </div>` : ''}
    <div style="margin-top:8px;font-size:11px">
      <div style="color:var(--accent2);font-weight:700;margin-bottom:4px">🔌 電線連接</div>
      ${Game.powerLines.length === 0 ? '<div style="color:var(--text-dim)">尚未接電到任何建築<br>點擊校園建築可接電</div>' :
        Game.powerLines.map(pl => {
          const isRequired = Game.requiredPowerBuildings.includes(pl.campusTile);
          const isPowered = Game.powerState.poweredCampusBuildings.includes(pl.campusTile);
          return `<div>${isPowered ? '✅' : '⚠️'} ${pl.campusName} ${isRequired ? '⭐' : ''}</div>`;
        }).join('')}
      ${Game.requiredPowerBuildings.length > 0 ? '<div style="color:var(--gold);margin-top:4px">⭐ = 必接任務建築</div>' : ''}
    </div>
  `;

  // 外部成本明細
  const extPanel = document.getElementById('externalityStatus');
  const eb = Game.externalityBreakdown;
  if (Game.buildings.length === 0 && Game.treeRemovedCount === 0) {
    extPanel.innerHTML = '<div class="cn-empty">尚無外部成本</div>';
  } else {
    const items = [];
    if (eb.resourceSmell > 0.001) items.push(`<div class="status-row"><span>🗑️ 資源臭味</span><span>${eb.resourceSmell.toFixed(3)}/tick</span></div>`);
    if (eb.processingSmell > 0.001) items.push(`<div class="status-row"><span>🏭 處理排放</span><span>${eb.processingSmell.toFixed(3)}/tick</span></div>`);
    if (eb.noise > 0.001) items.push(`<div class="status-row"><span>🔊 設備噪音</span><span>${eb.noise.toFixed(3)}/tick</span></div>`);
    if (eb.proximity > 0.001) items.push(`<div class="status-row"><span>📏 設備過近</span><span>${eb.proximity.toFixed(3)}/tick</span></div>`);
    if (eb.treeRemoval > 0) items.push(`<div class="status-row"><span>🌳 砍樹</span><span>${eb.treeRemoval.toFixed(3)}/tick</span></div>`);
    if (eb.scrubberReduction) items.push(`<div style="color:var(--success);font-size:11px">💨 洗滌塔運作中（-70%處理臭味）</div>`);
    if (items.length === 0) items.push('<div style="color:var(--success);font-size:11px">✅ 外部成本控制良好</div>');
    extPanel.innerHTML = items.join('');
  }
}

function showInfoPanel(node) {
  const panel = document.getElementById('infoPanel');
  const content = document.getElementById('infoContent');
  panel.classList.remove('hidden');

  if (node.type === 'resource') {
    const res = node.obj;
    content.innerHTML = `
      <h3>${res.def.icon} ${res.def.name}</h3>
      <div class="info-grid">
        <div class="info-item"><span>C/N 比</span><span>${res.def.cn}</span></div>
        <div class="info-item"><span>含水率</span><span>${(res.def.moisture * 100).toFixed(0)}%</span></div>
        <div class="info-item"><span>產氣潛力</span><span>${(res.def.gasYield * 100).toFixed(0)}%</span></div>
        <div class="info-item"><span>臭味風險</span><span>${(res.def.smellRisk * 100).toFixed(0)}%</span></div>
        <div class="info-item"><span>產出速率</span><span>${res.def.outputRate}/tick</span></div>
        <div class="info-item"><span>已連接</span><span>${res.connected ? '✅' : '❌'}</span></div>
      </div>
      <p class="info-desc">${res.def.description}</p>
    `;
  } else if (node.type === 'building') {
    const bld = node.obj;
    let statusIcon = bld.status === 'active' ? '✅ 運作中' : bld.status === 'damaged' ? '⚠️ 損壞' : '🔧 維修中';
    content.innerHTML = `
      <h3>${bld.def.icon} ${bld.def.name}</h3>
      <div class="info-grid">
        <div class="info-item"><span>狀態</span><span>${statusIcon}</span></div>
        <div class="info-item"><span>效率</span><span>${(bld.efficiency * 100).toFixed(0)}%</span></div>
        <div class="info-item"><span>健康度</span><span>${bld.health}%</span></div>
        <div class="info-item"><span>人力</span><span>${bld.def.manpower}</span></div>
        <div class="info-item"><span>輸入線</span><span>${bld.inputConnections.length}</span></div>
        <div class="info-item"><span>輸出線</span><span>${bld.outputConnections.length}</span></div>
      </div>
      <p class="info-desc">${bld.def.description}</p>
      ${bld.status === 'damaged' ? `<button onclick="repairBuilding('${bld.id}')" class="btn-repair">🔧 維修 $${Math.round(bld.def.cost * GameConfig.FAILURE.REPAIR_COST_MULTIPLIER)}</button>` : ''}
    `;
  }
}

function showPowerLinePanel(campusBld) {
  const panel = document.getElementById('infoPanel');
  const content = document.getElementById('infoContent');
  panel.classList.remove('hidden');

  const isRequired = Game.requiredPowerBuildings.includes(campusBld.tile);
  const alreadyPowered = Game.powerLines.some(pl => pl.campusTile === campusBld.tile);

  // 找可用的發電設備
  const generators = Game.buildings.filter(b =>
    (b.type === 'GENERATOR' || b.type === 'SYNGAS_ENGINE') && b.status === 'active'
  );

  let html = `<h3>${campusBld.def.icon} ${campusBld.def.name}</h3>`;
  html += `<div class="info-grid">
    <div class="info-item"><span>用電需求</span><span>${campusBld.def.powerDemand} kW</span></div>
    <div class="info-item"><span>任務指定</span><span>${isRequired ? '⭐ 必接' : '—'}</span></div>
    <div class="info-item"><span>接電狀態</span><span>${alreadyPowered ? '✅ 已接電' : '❌ 未接電'}</span></div>
  </div>`;

  if (alreadyPowered) {
    html += '<p style="color:var(--success);margin-top:8px">已有電線供電中。停電時將獲得韌性加分！</p>';
  } else if (generators.length === 0) {
    html += '<p style="color:var(--warning);margin-top:8px">尚無發電設備。先建造沼氣發電機或合成氣引擎！</p>';
  } else {
    html += '<p style="margin-top:8px;font-size:12px;color:var(--text-dim)">選擇發電設備接電：</p>';
    for (const gen of generators) {
      const campusPos = findCampusBuildingTiles(campusBld.tile);
      const genCenter = { r: gen.row + (gen.def.tileSize-1)/2, c: gen.col + (gen.def.tileSize-1)/2 };
      const dist = campusPos ? Math.sqrt(Math.pow(genCenter.r - campusPos.row, 2) + Math.pow(genCenter.c - campusPos.col, 2)) : 0;
      const cost = Math.round(dist * GameConfig.POWERLINE.COST_PER_TILE);
      const canAfford = Game.money >= cost;
      html += `<button onclick="createPowerLine(Game.buildings.find(b=>b.id==='${gen.id}'), ${campusBld.tile}); closeInfoPanel();"
        class="btn-repair" style="margin-top:4px;${canAfford ? '' : 'opacity:0.5;cursor:not-allowed'}"
        ${canAfford ? '' : 'disabled'}>
        ⚡ ${gen.def.name} → ${campusBld.def.name}（$${cost}）
      </button>`;
    }
  }

  content.innerHTML = html;
}

function closeInfoPanel() {
  document.getElementById('infoPanel').classList.add('hidden');
  Game.ui.showInfo = null;
}

function addAlert(message, type) {
  Game.ui.alerts.push({ message, type, time: 120 }); // 120 frames
  if (Game.ui.alerts.length > 5) Game.ui.alerts.shift();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ============================================================
// 輸入處理
// ============================================================
function getTileFromMouse(e) {
  const rect = Game.uiCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const scaleX = Game.uiCanvas.width / rect.width;
  const scaleY = Game.uiCanvas.height / rect.height;
  const col = Math.floor((x * scaleX) / GameConfig.TILE_SIZE);
  const row = Math.floor((y * scaleY) / GameConfig.TILE_SIZE);
  return { row, col, x: x * scaleX, y: y * scaleY };
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    if (Game.ui.showBuildMenu) { closeBuildMenu(); return; }
    if (!document.getElementById('infoPanel').classList.contains('hidden')) { closeInfoPanel(); return; }
  }
}

function onMouseDown(e) {
  if (Game.state !== 'PLAYING') return;
  const pos = getTileFromMouse(e);
  const node = getNodeAt(pos.row, pos.col);
  Game.ui._didDrag = false;
  Game.ui._mouseDownPos = { x: pos.x, y: pos.y };

  if (node) {
    Game.ui.connectingFrom = node;
    Game.ui.connectingLine = { fromX: pos.x, fromY: pos.y, toX: pos.x, toY: pos.y };
  }
}

function onMouseMove(e) {
  if (Game.state !== 'PLAYING') return;
  const pos = getTileFromMouse(e);
  Game.ui.hoveredTile = pos;

  if (Game.ui.connectingLine) {
    Game.ui.connectingLine.toX = pos.x;
    Game.ui.connectingLine.toY = pos.y;
    // 判定是否為拖曳（移動超過 10px）
    if (Game.ui._mouseDownPos) {
      const dx = pos.x - Game.ui._mouseDownPos.x;
      const dy = pos.y - Game.ui._mouseDownPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        Game.ui._didDrag = true;
      }
    }
  }
}

function onMouseUp(e) {
  if (Game.state !== 'PLAYING') return;

  if (Game.ui.connectingFrom && Game.ui.connectingLine && Game.ui._didDrag) {
    const pos = getTileFromMouse(e);
    const toNode = getNodeAt(pos.row, pos.col);

    if (toNode && canConnect(Game.ui.connectingFrom, toNode)) {
      createLogisticsLine(Game.ui.connectingFrom, toNode);
    } else if (toNode && Game.ui.connectingFrom.id !== toNode.id) {
      addAlert('無法連線：類型不相容', 'warning');
    }
  }

  Game.ui.connectingFrom = null;
  Game.ui.connectingLine = null;
}

function onClick(e) {
  if (Game.state !== 'PLAYING') return;
  // 如果剛才是拖曳操作，跳過 click
  if (Game.ui._didDrag) { Game.ui._didDrag = false; return; }

  const pos = getTileFromMouse(e);
  if (pos.row < 0 || pos.row >= GameConfig.MAP_ROWS || pos.col < 0 || pos.col >= GameConfig.MAP_COLS) return;

  const node = getNodeAt(pos.row, pos.col);

  if (node) {
    // 顯示資訊面板
    showInfoPanel(node);
    return;
  }

  // 空地或樹木 → 建設選單
  const tile = Game.campusLayout[pos.row][pos.col];
  if (tile === 0 || tile === 9) {
    // 確認不是已有設備或資源
    if (!Game.buildings.some(b => {
      for (let dr = 0; dr < b.def.tileSize; dr++)
        for (let dc = 0; dc < b.def.tileSize; dc++)
          if (b.row + dr === pos.row && b.col + dc === pos.col) return true;
      return false;
    }) && !Game.resources.some(r => r.row === pos.row && r.col === pos.col)) {
      openBuildMenu(pos.row, pos.col);
    }
    return;
  }

  // 校園建築 → 接電選單
  const campusBld = getCampusBuildingAt(pos.row, pos.col);
  if (campusBld) {
    showPowerLinePanel(campusBld);
  }
}

// updateFlowParticles 已移除 — 使用 renderer.js 中的動畫管線效果替代

// roundRect 保留為通用工具函式（renderer.js 也使用）
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ============================================================
// 輔助函式
// ============================================================
function findNodeById(id) {
  const res = Game.resources.find(r => r.id === id);
  if (res) return res;
  const bld = Game.buildings.find(b => b.id === id);
  return bld || null;
}

function findBuildingById(id) {
  return Game.buildings.find(b => b.id === id) || null;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function submitEarly() {
  if (Game.state !== 'PLAYING') return;
  // 必須至少有一棟建築才能交卷
  if (Game.buildings.length === 0) {
    addAlert('至少要建造一項設備才能提交設計！', 'warning');
    return;
  }
  Game.state = 'GAMEOVER';
  showGameOver('submit');
}

function togglePause() {
  if (Game.state === 'PLAYING') {
    Game.state = 'PAUSED';
    document.getElementById('btnPause').textContent = '▶ 繼續';
    addAlert('遊戲暫停', 'info');
  } else if (Game.state === 'PAUSED') {
    Game.state = 'PLAYING';
    Game.lastTick = performance.now();
    document.getElementById('btnPause').textContent = '⏸ 暫停';
  }
}

// ============================================================
// 主遊戲迴圈
// ============================================================
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  Game.animFrame++;

  if (Game.state === 'PLAYING') {
    const delta = timestamp - Game.lastTick;
    Game.lastTick = timestamp;
    Game.tickAccumulator += delta;

    // 計時器
    Game.timer -= delta / 1000;
    if (Game.timer < 0) Game.timer = 0;

    // 模擬 tick
    while (Game.tickAccumulator >= GameConfig.TICK_INTERVAL) {
      Game.tickAccumulator -= GameConfig.TICK_INTERVAL;
      simulateTick();
    }
  }

  render();
}

// ============================================================
// 啟動
// ============================================================
window.addEventListener('DOMContentLoaded', initGame);
