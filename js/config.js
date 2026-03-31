/**
 * GameConfig — 所有可調參數集中管理
 * 教師可在此調整難度、經濟平衡、事件參數等
 */
const GameConfig = {
  // ========== 時間設定 ==========
  GAME_DURATION: 900,          // 遊戲總時長（秒）15 分鐘
  TICK_INTERVAL: 500,          // 模擬更新間隔（毫秒）
  POWER_OUTAGE_TIME: 300,     // 停電事件觸發時間（剩餘秒數）遊戲剩 5 分鐘時
  POWER_OUTAGE_DURATION: 45,  // 停電持續秒數
  TIME_BONUS_MAX: 800,        // 提早交卷最高時間獎勵分

  // ========== 經濟設定 ==========
  INITIAL_MONEY: 120000,       // 初始資金（15分鐘+道路建設需更多資金）
  INITIAL_MANPOWER: 16,        // 初始人力
  ELECTRICITY_PRICE: 8,        // 每單位電力售價（每 tick）
  MAINTENANCE_COST_RATE: 0.002, // 設備維護成本比率（每 tick × CAPEX）

  // ========== 地圖設定 ==========
  MAP_COLS: 20,
  MAP_ROWS: 14,
  TILE_SIZE: 36,

  // ========== 資源定義 ==========
  RESOURCES: {
    KITCHEN_WASTE: {
      name: '學生廚餘',
      icon: '🍱',
      color: '#e8a735',
      cn: 12,
      moisture: 0.85,
      gasYield: 0.80,
      smellRisk: 0.70,
      collectDifficulty: 0.3,
      outputRate: 2.0,
      description: '含水量高、C/N 比低，容易產生臭味。適合厭氧消化，但單獨使用易氨抑制。',
      spawnZones: ['dining'],
      carbonContent: 40,
      nitrogenContent: 3.3
    },
    BRANCHES: {
      name: '枯枝落葉',
      icon: '🍂',
      color: '#8B6914',
      cn: 80,
      moisture: 0.15,
      gasYield: 0.25,
      smellRisk: 0.05,
      collectDifficulty: 0.5,
      outputRate: 1.5,
      description: '乾燥木質纖維，C/N 比高。作為共消化碳源可大幅改善混合比。',
      spawnZones: ['green'],
      carbonContent: 48,
      nitrogenContent: 0.6
    },
    MANURE: {
      name: '有機肥水',
      icon: '🐄',
      color: '#6B4226',
      cn: 8,
      moisture: 0.90,
      gasYield: 0.65,
      smellRisk: 0.90,
      collectDifficulty: 0.4,
      outputRate: 2.5,
      description: '高含水、低 C/N。產氣潛力不錯但臭味風險極高，需妥善處理。',
      spawnZones: ['green', 'general'],
      carbonContent: 32,
      nitrogenContent: 4.0
    },
    WASTE_OIL: {
      name: '廢食用油',
      icon: '🛢️',
      color: '#DAA520',
      cn: 50,
      moisture: 0.05,
      gasYield: 0.90,
      smellRisk: 0.30,
      collectDifficulty: 0.6,
      outputRate: 0.8,
      description: '含油量高、產氣潛力大，但需適當前處理避免消化槽浮渣。',
      spawnZones: ['dining'],
      carbonContent: 75,
      nitrogenContent: 1.5
    },
    STARCH_RESIDUE: {
      name: '澱粉殘渣',
      icon: '🌾',
      color: '#DEB887',
      cn: 35,
      moisture: 0.40,
      gasYield: 0.50,
      smellRisk: 0.20,
      collectDifficulty: 0.3,
      outputRate: 1.2,
      description: '含糖澱粉殘渣，中等含水。可用於厭氧消化或氣化，是靈活的原料。',
      spawnZones: ['dining', 'general'],
      carbonContent: 42,
      nitrogenContent: 1.2
    }
  },

  // ========== 資源生成設定 ==========
  RESOURCE_SPAWN: {
    KITCHEN_WASTE: { min: 2, max: 3 },
    BRANCHES: { min: 2, max: 3 },
    MANURE: { min: 1, max: 2 },
    WASTE_OIL: { min: 0, max: 1 },
    STARCH_RESIDUE: { min: 0, max: 2 }
  },

  // ========== 設備定義 ==========
  BUILDINGS: {
    CRUSHER: {
      name: '前處理設備',
      icon: '⚙️',
      color: '#778899',
      cost: 4000,
      manpower: 1,
      tileSize: 1,
      category: 'preprocess',
      efficiency: 1.0,
      description: '破碎與去砂，降低後端設備故障率。未前處理的原料將大幅增加堵塞風險。',
      acceptsInput: ['resource'],
      outputType: 'processed'
    },
    MIXER: {
      name: '均質混合槽',
      icon: '🔄',
      color: '#4682B4',
      cost: 6000,
      manpower: 1,
      tileSize: 1,
      category: 'core',
      efficiency: 1.0,
      description: '將多種原料混合均勻，是調整 C/N 比的關鍵設備。連接越多種資源，越能優化配比。',
      acceptsInput: ['processed', 'resource'],
      outputType: 'mixed'
    },
    DIGESTER: {
      name: '厭氧消化槽',
      icon: '🏭',
      color: '#2E8B57',
      cost: 16000,
      manpower: 2,
      tileSize: 2,
      category: 'core',
      efficiency: 1.0,
      description: '核心設備！中溫（35°C）厭氧消化產生沼氣。注意控制進料速度與 C/N 比，避免酸化崩潰。',
      acceptsInput: ['mixed', 'processed', 'resource'],
      outputType: 'biogas'
    },
    DESULFURIZER: {
      name: '生物脫硫塔',
      icon: '🧪',
      color: '#9370DB',
      cost: 5000,
      manpower: 1,
      tileSize: 1,
      category: 'purify',
      efficiency: 1.0,
      description: '去除沼氣中的硫化氫。未脫硫的沼氣會腐蝕發電機，大幅縮短壽命。',
      acceptsInput: ['biogas'],
      outputType: 'clean_biogas'
    },
    SCRUBBER: {
      name: '廢氣洗滌塔',
      icon: '💨',
      color: '#20B2AA',
      cost: 4000,
      manpower: 1,
      tileSize: 1,
      category: 'purify',
      efficiency: 1.0,
      description: '處理廢氣排放，有效降低臭味與汙染物，大幅減少抗議值上升速度。',
      acceptsInput: [],
      outputType: 'none'
    },
    GENERATOR: {
      name: '沼氣發電機',
      icon: '⚡',
      color: '#FFD700',
      cost: 14000,
      manpower: 2,
      tileSize: 1,
      category: 'energy',
      efficiency: 1.0,
      description: '將沼氣轉換為電力。可支援校園微電網，在停電時維持關鍵設施供電。',
      acceptsInput: ['biogas', 'clean_biogas'],
      outputType: 'electricity'
    },
    GASIFIER: {
      name: '氣化爐',
      icon: '🔥',
      color: '#D2691E',
      cost: 12000,
      manpower: 2,
      tileSize: 2,
      category: 'core',
      efficiency: 1.0,
      description: '高溫氣化乾燥生質物（枯枝、廢油等），產生合成氣。適合含水量低的原料。',
      acceptsInput: ['processed', 'resource'],
      outputType: 'syngas'
    },
    SYNGAS_ENGINE: {
      name: '合成氣引擎',
      icon: '🔋',
      color: '#FF6347',
      cost: 10000,
      manpower: 1,
      tileSize: 1,
      category: 'energy',
      efficiency: 1.0,
      description: '將合成氣轉為電力。比沼氣發電效率略低但適用不同原料。',
      acceptsInput: ['syngas'],
      outputType: 'electricity'
    }
  },

  // ========== C/N 比規則 ==========
  CN_OPTIMAL_MIN: 20,
  CN_OPTIMAL_MAX: 30,
  CN_GOOD_MIN: 16,
  CN_GOOD_MAX: 35,
  CN_EFFICIENCY_CURVE: {
    // C/N → efficiency multiplier
    below15: 0.30,  // 嚴重氨抑制
    range15to20: 0.65,
    range20to30: 1.00, // 最佳
    range30to35: 0.70,
    above35: 0.35   // 氮不足
  },

  // ========== pH / OLR 規則 ==========
  PH_INITIAL: 7.0,
  PH_MIN_SAFE: 6.0,
  PH_RECOVERY_COST: 3500,
  PH_RECOVERY_MANPOWER: 1,
  PH_DROP_RATE_OVERFEED: 0.04,    // 過度餵料時每 tick pH 下降
  PH_DROP_RATE_BAD_CN: 0.02,      // C/N 不佳時每 tick pH 下降
  PH_RECOVERY_RATE_NORMAL: 0.015, // 正常運轉時每 tick pH 回升
  OLR_SAFE_MAX: 4.0,              // 安全有機負荷率上限（kg VS/m³/d 簡化值）
  OLR_DANGER: 6.0,                // 危險有機負荷率

  // ========== 故障規則 ==========
  FAILURE: {
    NO_PREPROCESS_CLOG_RATE: 0.03,    // 無前處理：每 tick 堵塞機率
    NO_DESULFUR_CORROSION_RATE: 0.02, // 無脫硫：每 tick 腐蝕機率
    REPAIR_COST_MULTIPLIER: 0.3,      // 維修費 = 設備造價 × 此值
    REPAIR_TIME_TICKS: 6,             // 維修所需 tick 數
    CLOG_EFFICIENCY_PENALTY: 0.5,     // 堵塞時效率降低
    CORROSION_EFFICIENCY_PENALTY: 0.6 // 腐蝕時效率降低
  },

  // ========== 外部成本規則 ==========
  EXTERNALITY: {
    MAX_PROTEST: 100,
    SMELL_PER_TICK_BASE: 0.0,             // 基礎臭味增加（僅在有設備運作時）
    SMELL_UNTREATED_RESOURCE: 0.015,      // 未處理資源的臭味（低值，資源自然存在）
    SMELL_PROCESSING_NO_SCRUBBER: 0.12,   // 有設備但無洗滌塔時的臭味
    SMELL_ACIDIFICATION: 0.6,             // 酸化崩潰時的臭味暴增
    SMELL_NO_SCRUBBER_MULTIPLIER: 1.8,    // 無洗滌塔時「處理中臭味」倍率
    NOISE_PER_EQUIPMENT: 0.008,           // 每台設備噪音
    LOGISTICS_DISTANCE_FACTOR: 0.005,     // 物流距離外部成本因子
    SCRUBBER_REDUCTION: 0.70,             // 洗滌塔減少外部成本比例
    NATURAL_DECAY: 0.08,                  // 外部成本自然衰減
    PROXIMITY_COST_PER_TILE: 0.008,       // 設備每接近學生設施1格的外部成本
    PROXIMITY_SAFE_DISTANCE: 4,           // 安全距離（格）
    TREE_REMOVAL_PROTEST: 3.0,            // 砍樹建設的一次性抗議值增加
    TREE_REMOVAL_ONGOING: 0.01            // 砍樹位置每 tick 持續增加的外部成本
  },

  // ========== 道路建設 ==========
  ROAD: {
    BUILD_COST: 500,                 // 每格道路建設費用
  },

  // ========== 物流規則 ==========
  LOGISTICS: {
    COST_PER_TILE: 200,              // 每格距離的建設成本
    EFFICIENCY_LOSS_PER_TILE: 0.02,  // 每格距離效率損失
    SMELL_PER_TILE: 0.005,           // 每格距離臭味增加
    MANPOWER_PER_LINE: 1             // 每條管線需要1人力運輸
  },

  // ========== 電線系統 ==========
  POWERLINE: {
    COST_PER_TILE: 120,            // 電線每格距離費用
    NORMAL_SCORE_PER_BUILDING: 15, // 平時每 tick 每棟供電建築微量加分
    OUTAGE_SCORE_PER_BUILDING: 80, // 停電時每 tick 每棟供電建築大加分
    REQUIRED_BONUS_MULTIPLIER: 2.0 // 指定必接建築的額外倍率
  },

  // ========== 微電網設定 ==========
  MICROGRID: {
    MIN_POWER_FOR_ISLAND: 10,    // 孤島運轉最低發電量
    POWER_DEMAND_PER_BUILDING: 5  // 每棟建築需求 kW
  },

  // ========== 分數計算 ==========
  SCORING: {
    ENERGY_WEIGHT: 0.25,       // 能源產出（主動才有分）
    ECONOMY_WEIGHT: 0.10,      // 經濟效益
    TECH_MATCH_WEIGHT: 0.10,   // 技術匹配（主動才有分）
    CN_MANAGEMENT_WEIGHT: 0.15, // C/N 管理（主動才有分）
    LOGISTICS_WEIGHT: 0.05,    // 物流效率（降低：不做事也能滿分）
    EXTERNALITY_WEIGHT: 0.05,  // 外部成本（降低：不做事也能滿分）
    RESILIENCE_WEIGHT: 0.20,   // 微電網韌性（提高：電線+停電）
    STABILITY_WEIGHT: 0.05,    // 系統穩定度
    POWERLINE_WEIGHT: 0.05,    // 電線接電額外項（主動才有分）
    MAX_SCORE: 10000,
    GRADE_S: 8500,
    GRADE_A: 7000,
    GRADE_B: 5000,
    GRADE_C: 3000
  },

  // ========== 教學文字模板 ==========
  TUTORIAL_STEPS: [
    {
      title: '歡迎來到生質能校園！',
      text: '你是校園永續能源規劃者。\n在 15 分鐘內建立生質能系統，\n將廢棄物轉化為電力！\n提早完成可獲得時間獎勵分！',
      highlight: null
    },
    {
      title: '① 認識校園資源',
      text: '地圖上的彩色圓點是生質資源。\n點擊可查看詳細資訊。\n注意每種資源的 C/N 比不同！',
      highlight: 'resources'
    },
    {
      title: '② 建設設備',
      text: '點擊草地空格可建設設備。\n建議順序：前處理 → 混合槽 → 消化槽\n→ 脫硫塔 → 發電機',
      highlight: 'build'
    },
    {
      title: '③ 建造道路 & 連接管線',
      text: '點擊空地可建造道路（$500/格）。\n物流管線兩端必須鄰接道路！\n從資源拖曳到設備即可建立管線。',
      highlight: 'logistics'
    },
    {
      title: '④ 控制 C/N 比',
      text: '混合槽會顯示目前的 C/N 比。\n最佳範圍是 20～30。\n混合不同資源來調整配比！',
      highlight: 'cn'
    },
    {
      title: '⑤ 注意外部成本！',
      text: '上方紅色進度條是抗議值。\n臭味、噪音、汙染都會增加。\n到 100% 遊戲就結束了！',
      highlight: 'protest'
    },
    {
      title: '⑥ 迎戰停電事件',
      text: '遊戲剩 5 分鐘時會發生颱風停電！\n如果你的發電系統穩定運作，\n並有接電到校園建築，就能獲得大量韌性加分！',
      highlight: 'power'
    },
    {
      title: '準備好了嗎？',
      text: '記住：便宜的配置可能造成長期損失！\n前處理、脫硫、洗滌塔都很重要。\n祝你好運，校園規劃者！',
      highlight: null
    }
  ],

  // ========== 校園地圖佈局 ==========
  // 佈局現在由 game.js 中的 generateCampusLayout() 動態生成
  // 儲存在 Game.campusLayout 中
  // 0=草地(可建), 1=道路, 2=餐廳, 3=宿舍, 4=教學樓,
  // 5=行政中心, 6=圖書館, 8=回收站, 9=樹木

  // 校園建築名稱映射
  CAMPUS_BUILDINGS: {
    2: { name: '學生餐廳', icon: '🍽️', color: '#D2691E', canPower: true, powerDemand: 5 },
    3: { name: '宿舍', icon: '🏠', color: '#6495ED', canPower: true, powerDemand: 6 },
    4: { name: '教學大樓', icon: '🏫', color: '#BDB76B', canPower: true, powerDemand: 8 },
    5: { name: '行政中心', icon: '🏛️', color: '#CD5C5C', canPower: true, powerDemand: 5 },
    6: { name: '圖書館', icon: '📚', color: '#8B4513', canPower: true, powerDemand: 7 },
    8: { name: '回收站', icon: '♻️', color: '#808080', canPower: false, powerDemand: 0 },
    9: { name: '樹木綠地', icon: '🌳', color: '#006400', canPower: false, powerDemand: 0 },
    10: { name: '能源中心', icon: '🔋', color: '#FF8C00', canPower: false, powerDemand: 0 }
  }
};
