/**
 * renderer.js — Pixel-Art Style Rendering Engine
 * 生質能校園大亨：微電網保衛戰
 *
 * All campus map, resource, building, logistics and UI rendering.
 * Uses only Canvas 2D primitives — no external images.
 */

// ============================================================
// Color Palette
// ============================================================
const Palette = {
  grass:   ['#4a7c3f', '#5a9e4f', '#3d6b35', '#4e8e43'],
  flower:  ['#e85d75', '#f0c040', '#d0d0ff', '#ffb347'],
  road:    ['#8a8a8a', '#6e6e6e', '#5a5a5a', '#7a7a7a'],
  shadow:  'rgba(0,0,0,0.18)',
  shadowLt:'rgba(0,0,0,0.10)',
  white:   '#ffffff',
  black:   '#222222',
};

// ============================================================
// Seeded pseudo-random for deterministic tile decoration
// ============================================================
function tileHash(r, c, salt) {
  let h = (r * 7919 + c * 104729 + (salt || 0) * 31) | 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b | 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b | 0;
  return ((h >>> 16) ^ h) & 0x7fffffff;
}

// ============================================================
// Pixel helpers — small drawing primitives at tile scale
// ============================================================
function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// ============================================================
// renderCampusBackground
// ============================================================
function renderCampusBackground(ctx, ts) {
  const layout = Game.campusLayout;
  if (!layout) return; // 佈局尚未生成
  const buildings = GameConfig.CAMPUS_BUILDINGS;

  for (let r = 0; r < GameConfig.MAP_ROWS; r++) {
    for (let c = 0; c < GameConfig.MAP_COLS; c++) {
      const tile = layout[r][c];
      const x = c * ts, y = r * ts;
      const h = tileHash(r, c, 0);

      if (tile === 0) {
        // ---- Grass tile ----
        const base = Palette.grass[h % 4];
        ctx.fillStyle = base;
        ctx.fillRect(x, y, ts, ts);
        // Grass blades
        for (let i = 0; i < 4; i++) {
          const hi = tileHash(r, c, i + 10);
          const gx = x + (hi % (ts - 4)) + 2;
          const gy = y + ((hi >> 8) % (ts - 6)) + 2;
          ctx.fillStyle = Palette.grass[(hi >> 4) % 4];
          ctx.fillRect(gx, gy, 1, 3);
        }
        // Tiny flowers (some tiles)
        if (h % 7 === 0) {
          const fx = x + (h % (ts - 6)) + 3;
          const fy = y + ((h >> 6) % (ts - 6)) + 3;
          ctx.fillStyle = Palette.flower[h % 4];
          ctx.fillRect(fx, fy, 2, 2);
          ctx.fillStyle = Palette.flower[(h + 1) % 4];
          ctx.fillRect(fx + 1, fy - 1, 1, 1);
        }
        // Dirt patch (some tiles)
        if (h % 11 === 0) {
          ctx.fillStyle = '#8B7355';
          const dx = x + ((h >> 3) % (ts - 8)) + 4;
          const dy = y + ((h >> 5) % (ts - 6)) + 3;
          ctx.fillRect(dx, dy, 3, 2);
        }
        // Subtle grid
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.strokeRect(x, y, ts, ts);

      } else if (tile === 1) {
        // ---- Road ----
        ctx.fillStyle = '#8a8a8a';
        ctx.fillRect(x, y, ts, ts);
        // Texture grain
        for (let i = 0; i < 3; i++) {
          const hi = tileHash(r, c, i + 20);
          const gx = x + (hi % (ts - 2));
          const gy = y + ((hi >> 6) % (ts - 2));
          ctx.fillStyle = Palette.road[(hi >> 4) % 4];
          ctx.fillRect(gx, gy, 2, 1);
        }
        // Dashed center line (horizontal if neighbors left/right are road, else vertical)
        const leftRoad = c > 0 && layout[r][c - 1] === 1;
        const rightRoad = c < GameConfig.MAP_COLS - 1 && layout[r][c + 1] === 1;
        const topRoad = r > 0 && layout[r - 1][c] === 1;
        const bottomRoad = r < GameConfig.MAP_ROWS - 1 && layout[r + 1][c] === 1;
        ctx.fillStyle = '#c8c864';
        if (leftRoad || rightRoad) {
          // horizontal dashes
          for (let d = 2; d < ts - 2; d += 8) {
            ctx.fillRect(x + d, y + ts / 2 - 1, 4, 2);
          }
        }
        if (topRoad || bottomRoad) {
          for (let d = 2; d < ts - 2; d += 8) {
            ctx.fillRect(x + ts / 2 - 1, y + d, 2, 4);
          }
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.strokeRect(x, y, ts, ts);

      } else if (tile === 9) {
        // ---- Trees / Green ----
        // Grass base
        ctx.fillStyle = '#3d6b35';
        ctx.fillRect(x, y, ts, ts);
        // Shadow under tree
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.ellipse(x + ts / 2, y + ts - 5, ts * 0.35, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tree trunk
        const variant = h % 3;
        ctx.fillStyle = '#6d4c1d';
        ctx.fillRect(x + ts / 2 - 2, y + ts * 0.4, 4, ts * 0.45);
        // Canopy
        if (variant === 0) {
          // Round bushy tree
          ctx.fillStyle = '#2d7a2d';
          ctx.beginPath();
          ctx.arc(x + ts / 2, y + ts * 0.32, ts * 0.32, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#3a9a3a';
          ctx.beginPath();
          ctx.arc(x + ts / 2 - 3, y + ts * 0.28, ts * 0.18, 0, Math.PI * 2);
          ctx.fill();
        } else if (variant === 1) {
          // Tall pine-like
          ctx.fillStyle = '#1e6b1e';
          ctx.beginPath();
          ctx.moveTo(x + ts / 2, y + 2);
          ctx.lineTo(x + ts / 2 - ts * 0.3, y + ts * 0.5);
          ctx.lineTo(x + ts / 2 + ts * 0.3, y + ts * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#2a8a2a';
          ctx.beginPath();
          ctx.moveTo(x + ts / 2, y + 6);
          ctx.lineTo(x + ts / 2 - ts * 0.22, y + ts * 0.42);
          ctx.lineTo(x + ts / 2 + ts * 0.22, y + ts * 0.42);
          ctx.closePath();
          ctx.fill();
        } else {
          // Multi-blob tree
          ctx.fillStyle = '#2e7d32';
          ctx.beginPath();
          ctx.arc(x + ts / 2, y + ts * 0.3, ts * 0.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#388e3c';
          ctx.beginPath();
          ctx.arc(x + ts / 2 + 5, y + ts * 0.22, ts * 0.18, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + ts / 2 - 5, y + ts * 0.26, ts * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (buildings[tile]) {
        const b = buildings[tile];
        _drawCampusBuilding(ctx, x, y, ts, tile, b, h);
      }
    }
  }
}

// ---- Draw specific campus building tiles ----
function _drawCampusBuilding(ctx, x, y, ts, tile, b, h) {
  const s = 2; // inset

  switch (tile) {
    case 2: // Dining hall — warm orange
      ctx.fillStyle = '#c0601a';
      ctx.fillRect(x + s, y + s, ts - s * 2, ts - s * 2);
      // roof line
      ctx.fillStyle = '#993d0a';
      ctx.fillRect(x + s, y + s, ts - s * 2, 5);
      // door
      ctx.fillStyle = '#6b3410';
      ctx.fillRect(x + ts / 2 - 3, y + ts - 10, 6, 8);
      // windows
      ctx.fillStyle = '#ffe8a0';
      ctx.fillRect(x + 6, y + 12, 5, 5);
      ctx.fillRect(x + ts - 11, y + 12, 5, 5);
      // plate icon (small circle + lines)
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + ts / 2, y + ts / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c0601a';
      ctx.fillRect(x + ts / 2 - 3, y + ts / 2 - 1, 6, 1);
      break;

    case 3: // Dormitory — blue with window grid
      ctx.fillStyle = '#4a6fa5';
      ctx.fillRect(x + s, y + s, ts - s * 2, ts - s * 2);
      // roof
      ctx.fillStyle = '#3a5a8a';
      ctx.fillRect(x + s, y + s, ts - s * 2, 4);
      // windows grid (3x2)
      ctx.fillStyle = '#ffe8a0';
      for (let wr = 0; wr < 2; wr++) {
        for (let wc = 0; wc < 3; wc++) {
          ctx.fillRect(x + 5 + wc * 9, y + 10 + wr * 9, 4, 4);
        }
      }
      // door
      ctx.fillStyle = '#2a3e5e';
      ctx.fillRect(x + ts / 2 - 3, y + ts - 9, 6, 7);
      // bed icon pixel
      ctx.fillStyle = '#d0d0ff';
      ctx.fillRect(x + ts / 2 - 4, y + ts / 2 + 5, 8, 2);
      ctx.fillRect(x + ts / 2 - 4, y + ts / 2 + 3, 3, 2);
      break;

    case 4: // Classroom — beige/tan
      ctx.fillStyle = '#c4a86c';
      ctx.fillRect(x + s, y + s, ts - s * 2, ts - s * 2);
      // roof
      ctx.fillStyle = '#a08050';
      ctx.fillRect(x + s, y + s, ts - s * 2, 4);
      // large window
      ctx.fillStyle = '#e0e8f0';
      ctx.fillRect(x + 6, y + 10, ts - 12, 8);
      // window frame
      ctx.strokeStyle = '#887040';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 6, y + 10, ts - 12, 8);
      ctx.beginPath();
      ctx.moveTo(x + ts / 2, y + 10);
      ctx.lineTo(x + ts / 2, y + 18);
      ctx.stroke();
      // door
      ctx.fillStyle = '#705030';
      ctx.fillRect(x + ts / 2 - 3, y + ts - 10, 6, 8);
      ctx.fillStyle = '#c4a86c';
      ctx.fillRect(x + ts / 2 + 1, y + ts - 6, 1, 1);
      break;

    case 5: // Admin center — red/maroon with flag
      ctx.fillStyle = '#a0353a';
      ctx.fillRect(x + s, y + s, ts - s * 2, ts - s * 2);
      // roof
      ctx.fillStyle = '#7a252a';
      ctx.fillRect(x + s, y + s, ts - s * 2, 5);
      // columns
      ctx.fillStyle = '#c8c0b0';
      ctx.fillRect(x + 5, y + 10, 3, ts - 16);
      ctx.fillRect(x + ts - 8, y + 10, 3, ts - 16);
      // door
      ctx.fillStyle = '#5a1a1e';
      ctx.fillRect(x + ts / 2 - 4, y + ts - 10, 8, 8);
      // flag pole + flag
      ctx.fillStyle = '#ccc';
      ctx.fillRect(x + ts - 6, y + 1, 1, 10);
      ctx.fillStyle = '#ee3333';
      ctx.fillRect(x + ts - 5, y + 2, 4, 3);
      // star marking
      _drawStar(ctx, x + 8, y + 6, 3, '#FFD700');
      break;

    case 6: // Library — brown with bookshelf detail
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(x + s, y + s, ts - s * 2, ts - s * 2);
      // roof
      ctx.fillStyle = '#4a2e18';
      ctx.fillRect(x + s, y + s, ts - s * 2, 4);
      // bookshelf rows
      const shelfColors = ['#e04040', '#4080c0', '#40a060', '#d0a030', '#9060c0'];
      for (let row = 0; row < 2; row++) {
        for (let bk = 0; bk < 5; bk++) {
          ctx.fillStyle = shelfColors[(bk + row * 2) % 5];
          ctx.fillRect(x + 5 + bk * 5, y + 10 + row * 8, 4, 6);
        }
        // shelf line
        ctx.fillStyle = '#3a1e0e';
        ctx.fillRect(x + 4, y + 16 + row * 8, ts - 8, 1);
      }
      // door
      ctx.fillStyle = '#3a1e0e';
      ctx.fillRect(x + ts / 2 - 3, y + ts - 9, 6, 7);
      // star marking
      _drawStar(ctx, x + ts - 8, y + 6, 3, '#FFD700');
      break;

    case 8: // Recycling — gray with recycling arrows
      ctx.fillStyle = '#707070';
      ctx.fillRect(x + s, y + s, ts - s * 2, ts - s * 2);
      // lighter floor
      ctx.fillStyle = '#888';
      ctx.fillRect(x + 4, y + 4, ts - 8, ts - 8);
      // recycling arrows (3 arrows in triangle)
      _drawRecyclingSymbol(ctx, x + ts / 2, y + ts / 2, ts * 0.3);
      break;

    default:
      // Fallback
      ctx.fillStyle = b.color;
      ctx.fillRect(x + s, y + s, ts - s * 2, ts - s * 2);
      break;
  }

  // Shadow on bottom-right
  ctx.fillStyle = Palette.shadow;
  ctx.fillRect(x + ts - 2, y + 4, 2, ts - 4);
  ctx.fillRect(x + 4, y + ts - 2, ts - 4, 2);

  // Required power building indicator (pulsing star)
  if (Game.requiredPowerBuildings && Game.requiredPowerBuildings.includes(tile)) {
    const pulse = Math.sin((Game.animFrame || 0) * 0.06) * 1.5;
    _drawStar(ctx, x + ts - 8, y + 6, 4 + pulse, '#FFD700');
    // Small "⚡" text
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', x + ts - 8, y + 16);
  }

  // Show powered indicator
  if (Game.powerState && Game.powerState.poweredCampusBuildings &&
      Game.powerState.poweredCampusBuildings.includes(tile)) {
    ctx.fillStyle = 'rgba(76,175,80,0.3)';
    ctx.fillRect(x + s, y + s, ts - s * 2, ts - s * 2);
  }
}

function _drawStar(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const outerX = cx + r * Math.cos(angle);
    const outerY = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(outerX, outerY);
    else ctx.lineTo(outerX, outerY);
    const innerAngle = angle + Math.PI / 5;
    ctx.lineTo(cx + r * 0.4 * Math.cos(innerAngle), cy + r * 0.4 * Math.sin(innerAngle));
  }
  ctx.closePath();
  ctx.fill();
}

function _drawRecyclingSymbol(ctx, cx, cy, r) {
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const angles = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];
  for (let i = 0; i < 3; i++) {
    const a1 = angles[i] - Math.PI / 2;
    const a2 = angles[(i + 1) % 3] - Math.PI / 2;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const mx = cx + r * 0.6 * Math.cos((a1 + a2) / 2);
    const my = cy + r * 0.6 * Math.sin((a1 + a2) / 2);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx, my, x2, y2);
    ctx.stroke();
    // arrowhead
    const ah = a2 + Math.PI * 0.15;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 4 * Math.cos(ah), y2 - 4 * Math.sin(ah));
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// ============================================================
// renderResources — animated resource nodes with pixel sprites
// ============================================================
function renderResources(ctx, ts) {
  const time = Game.animFrame;

  for (const res of Game.resources) {
    if (!res.active) continue;
    const cx = res.col * ts + ts / 2;
    const bob = Math.sin(time * 0.04 + res.col * 2.1 + res.row * 1.3) * 2;
    const cy = res.row * ts + ts / 2 + bob;
    const pulse = Math.sin(time * 0.05 + res.col) * 2;

    // Glow circle
    ctx.beginPath();
    ctx.fillStyle = res.def.color + '30';
    ctx.arc(cx, cy, ts * 0.48 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Main circle
    ctx.beginPath();
    ctx.fillStyle = res.def.color;
    ctx.arc(cx, cy, ts * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pixel sprite icon inside
    _drawResourceSprite(ctx, cx, cy, res.type, ts);

    // Sparkle effect when connected (active)
    if (res.connected) {
      const st = (time * 0.08 + res.col * 3) % (Math.PI * 2);
      const sx = cx + Math.cos(st) * ts * 0.38;
      const sy = cy + Math.sin(st) * ts * 0.38;
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx - 1, sy - 1, 2, 2);
      const sx2 = cx + Math.cos(st + 2) * ts * 0.32;
      const sy2 = cy + Math.sin(st + 2) * ts * 0.32;
      ctx.fillRect(sx2, sy2, 1, 1);
    }

    // Connection port (right side)
    const portX = res.col * ts + ts - 2;
    const portY = res.row * ts + ts / 2;
    ctx.beginPath();
    ctx.fillStyle = res.connected ? '#4CAF50' : '#fff';
    ctx.arc(portX, portY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function _drawResourceSprite(ctx, cx, cy, type, ts) {
  // Small pixel art icon for each resource type
  const s = 2; // pixel size
  ctx.save();
  switch (type) {
    case 'KITCHEN_WASTE':
      // Food scraps — small box with rising steam lines
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 4, cy - 2, 8, 6);
      ctx.fillStyle = '#d4a020';
      ctx.fillRect(cx - 3, cy - 1, 6, 4);
      // steam
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(cx - 2, cy - 5, 1, 2);
      ctx.fillRect(cx + 1, cy - 6, 1, 3);
      break;
    case 'BRANCHES':
      // Leaf / branch shape
      ctx.fillStyle = '#a07020';
      ctx.fillRect(cx - 1, cy - 4, 2, 8);
      ctx.fillStyle = '#c09030';
      ctx.fillRect(cx - 4, cy - 2, 3, 2);
      ctx.fillRect(cx + 1, cy, 3, 2);
      ctx.fillStyle = '#8a6020';
      ctx.fillRect(cx - 3, cy + 2, 2, 2);
      break;
    case 'MANURE':
      // Cow silhouette
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 4, cy - 3, 8, 5);
      ctx.fillStyle = '#4a3520';
      ctx.fillRect(cx - 3, cy - 2, 3, 3);
      ctx.fillRect(cx + 1, cy - 1, 2, 2);
      // legs
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 3, cy + 2, 1, 2);
      ctx.fillRect(cx + 2, cy + 2, 1, 2);
      // head
      ctx.fillRect(cx + 3, cy - 3, 2, 3);
      break;
    case 'WASTE_OIL':
      // Oil barrel
      ctx.fillStyle = '#888';
      ctx.fillRect(cx - 3, cy - 4, 6, 8);
      ctx.fillStyle = '#666';
      ctx.fillRect(cx - 3, cy - 4, 6, 1);
      ctx.fillRect(cx - 3, cy + 3, 6, 1);
      ctx.fillStyle = '#DAA520';
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
      break;
    case 'STARCH_RESIDUE':
      // Grain/starch pile
      ctx.fillStyle = '#DEB887';
      ctx.beginPath();
      ctx.arc(cx, cy + 1, 5, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - 5, cy + 1, 10, 3);
      // grain dots
      ctx.fillStyle = '#C4A060';
      ctx.fillRect(cx - 3, cy - 1, 2, 2);
      ctx.fillRect(cx + 1, cy, 2, 2);
      ctx.fillRect(cx - 1, cy - 3, 2, 1);
      break;
  }
  ctx.restore();
}

// ============================================================
// renderBuildings — Player-placed equipment with pixel art
// ============================================================
function renderBuildings(ctx, ts) {
  for (const bld of Game.buildings) {
    const x = bld.col * ts;
    const y = bld.row * ts;
    const sz = bld.def.tileSize * ts;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + 4, y + sz - 2, sz - 4, 3);
    ctx.fillRect(x + sz - 2, y + 4, 3, sz - 4);

    // Draw building sprite based on type
    _drawBuildingSprite(ctx, x, y, sz, bld, ts);

    // Status overlay
    if (bld.status === 'damaged') {
      ctx.fillStyle = 'rgba(200,30,30,0.25)';
      ctx.fillRect(x + 2, y + 2, sz - 4, sz - 4);
      // crack lines
      ctx.strokeStyle = '#cc3333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + sz * 0.3, y + 4);
      ctx.lineTo(x + sz * 0.5, y + sz * 0.4);
      ctx.lineTo(x + sz * 0.4, y + sz * 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + sz * 0.6, y + 6);
      ctx.lineTo(x + sz * 0.7, y + sz * 0.5);
      ctx.stroke();
    }
    if (bld.status === 'repairing') {
      ctx.fillStyle = 'rgba(200,150,30,0.2)';
      ctx.fillRect(x + 2, y + 2, sz - 4, sz - 4);
      // wrench icon
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(x + sz - 12, y + 4, 3, 8);
      ctx.fillRect(x + sz - 14, y + 3, 7, 2);
    }

    // Health bar if damaged
    if (bld.health < 100) {
      const barW = sz - 8;
      const barH = 3;
      const bx = x + 4;
      const by = y - 5;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, barW, barH);
      const hpRatio = bld.health / 100;
      ctx.fillStyle = hpRatio > 0.6 ? '#4CAF50' : hpRatio > 0.3 ? '#FFC107' : '#F44336';
      ctx.fillRect(bx, by, barW * hpRatio, barH);
    }

    // Input port (blue dot, left)
    ctx.beginPath();
    ctx.fillStyle = '#2196F3';
    ctx.arc(x + 2, y + sz / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Output port (orange dot, right)
    ctx.beginPath();
    ctx.fillStyle = '#FF9800';
    ctx.arc(x + sz - 2, y + sz / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Name label
    ctx.font = `bold ${Math.min(11, ts * 0.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeText(bld.def.name, x + sz / 2, y + sz - 8);
    ctx.fillText(bld.def.name, x + sz / 2, y + sz - 8);
  }
}

function _drawBuildingSprite(ctx, x, y, sz, bld, ts) {
  const type = bld.type;
  const m = 3; // margin

  switch (type) {
    case 'CRUSHER': {
      // Gray machine body with gear/cog
      ctx.fillStyle = '#607080';
      ctx.fillRect(x + m, y + m, sz - m * 2, sz - m * 2);
      ctx.fillStyle = '#4a5a6a';
      ctx.fillRect(x + m, y + m, sz - m * 2, 5);
      // Gear/cog
      const gcx = x + sz / 2, gcy = y + sz / 2 - 2;
      const gr = sz * 0.2;
      ctx.fillStyle = '#8899aa';
      ctx.beginPath();
      ctx.arc(gcx, gcy, gr, 0, Math.PI * 2);
      ctx.fill();
      // gear teeth
      ctx.fillStyle = '#8899aa';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Game.animFrame * 0.02;
        ctx.fillRect(
          gcx + Math.cos(a) * gr - 2,
          gcy + Math.sin(a) * gr - 2,
          4, 4
        );
      }
      // center
      ctx.fillStyle = '#3a4a5a';
      ctx.beginPath();
      ctx.arc(gcx, gcy, gr * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // border
      ctx.strokeStyle = '#2a3a4a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + m, y + m, sz - m * 2, sz - m * 2);
      break;
    }
    case 'MIXER': {
      // Blue tank with stirring blade
      ctx.fillStyle = '#4682B4';
      ctx.fillRect(x + m, y + m, sz - m * 2, sz - m * 2);
      // Tank body (rounded appearance)
      ctx.fillStyle = '#5a95c8';
      ctx.fillRect(x + 6, y + 8, sz - 12, sz - 14);
      // Stirring blade center
      const mcx = x + sz / 2, mcy = y + sz / 2;
      ctx.strokeStyle = '#c0d0e0';
      ctx.lineWidth = 2;
      // shaft
      ctx.beginPath();
      ctx.moveTo(mcx, y + 6);
      ctx.lineTo(mcx, mcy);
      ctx.stroke();
      // blades (rotating)
      const ba = Game.animFrame * 0.04;
      ctx.beginPath();
      ctx.moveTo(mcx + Math.cos(ba) * 8, mcy + Math.sin(ba) * 8);
      ctx.lineTo(mcx - Math.cos(ba) * 8, mcy - Math.sin(ba) * 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mcx + Math.cos(ba + Math.PI / 2) * 8, mcy + Math.sin(ba + Math.PI / 2) * 8);
      ctx.lineTo(mcx - Math.cos(ba + Math.PI / 2) * 8, mcy - Math.sin(ba + Math.PI / 2) * 8);
      ctx.stroke();
      // border
      ctx.strokeStyle = '#2a4a6a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + m, y + m, sz - m * 2, sz - m * 2);
      break;
    }
    case 'DIGESTER': {
      // Large green dome (2x2)
      ctx.fillStyle = '#1e6b3a';
      ctx.fillRect(x + m, y + m, sz - m * 2, sz - m * 2);
      // Dome shape
      const dcx = x + sz / 2, dcy = y + sz / 2;
      ctx.fillStyle = '#2E8B57';
      ctx.beginPath();
      ctx.arc(dcx, dcy + 6, sz * 0.38, Math.PI, 0);
      ctx.fillRect(dcx - sz * 0.38, dcy + 6, sz * 0.76, sz * 0.2);
      ctx.fill();
      // Tank body
      ctx.fillStyle = '#267a4a';
      ctx.fillRect(dcx - sz * 0.35, dcy + 4, sz * 0.7, sz * 0.28);
      // Bubbles
      const bt = Game.animFrame;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 0; i < 4; i++) {
        const bx = dcx - 12 + ((i * 9 + bt * 0.3) % 24);
        const by = dcy - 4 - ((bt * 0.5 + i * 15) % 20);
        ctx.beginPath();
        ctx.arc(bx, by, 2 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
      // pipe inlet
      ctx.fillStyle = '#555';
      ctx.fillRect(x + 2, dcy - 3, 8, 6);
      ctx.fillRect(x + sz - 10, dcy - 3, 8, 6);
      // border
      ctx.strokeStyle = '#1a4a2a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + m, y + m, sz - m * 2, sz - m * 2);
      break;
    }
    case 'DESULFURIZER': {
      // Purple tower with pipes
      ctx.fillStyle = '#7a5aaa';
      ctx.fillRect(x + m, y + m, sz - m * 2, sz - m * 2);
      // Tower body (tall narrow)
      ctx.fillStyle = '#9370DB';
      ctx.fillRect(x + sz * 0.25, y + 6, sz * 0.5, sz - 12);
      // Top dome
      ctx.fillStyle = '#8060c0';
      ctx.beginPath();
      ctx.arc(x + sz / 2, y + 8, sz * 0.25, Math.PI, 0);
      ctx.fill();
      // Pipes left & right
      ctx.fillStyle = '#666';
      ctx.fillRect(x + 4, y + sz / 2 - 2, sz * 0.2, 4);
      ctx.fillRect(x + sz - sz * 0.2 - 4, y + sz / 2 - 2, sz * 0.2, 4);
      // Level marks
      ctx.fillStyle = '#b0a0d0';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x + sz * 0.3, y + 14 + i * 6, sz * 0.4, 1);
      }
      // border
      ctx.strokeStyle = '#4a3070';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + m, y + m, sz - m * 2, sz - m * 2);
      break;
    }
    case 'SCRUBBER': {
      // Teal tower with air wave detail
      ctx.fillStyle = '#1a8a7a';
      ctx.fillRect(x + m, y + m, sz - m * 2, sz - m * 2);
      // Tower
      ctx.fillStyle = '#20B2AA';
      ctx.fillRect(x + sz * 0.2, y + 5, sz * 0.6, sz - 10);
      // Air waves on top
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      for (let w = 0; w < 3; w++) {
        const wy = y + 6 + w * 4;
        ctx.beginPath();
        ctx.moveTo(x + sz * 0.25, wy);
        ctx.quadraticCurveTo(x + sz * 0.38, wy - 2, x + sz / 2, wy);
        ctx.quadraticCurveTo(x + sz * 0.62, wy + 2, x + sz * 0.75, wy);
        ctx.stroke();
      }
      // Vent openings
      ctx.fillStyle = '#0e6e60';
      ctx.fillRect(x + sz * 0.3, y + sz - 10, 3, 4);
      ctx.fillRect(x + sz * 0.55, y + sz - 10, 3, 4);
      // border
      ctx.strokeStyle = '#0e5a50';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + m, y + m, sz - m * 2, sz - m * 2);
      break;
    }
    case 'GENERATOR': {
      // Gold/yellow machine with lightning bolt
      ctx.fillStyle = '#b8960e';
      ctx.fillRect(x + m, y + m, sz - m * 2, sz - m * 2);
      // Machine body
      ctx.fillStyle = '#d4aa20';
      ctx.fillRect(x + 5, y + 6, sz - 10, sz - 12);
      // Vents
      ctx.fillStyle = '#a08000';
      for (let v = 0; v < 3; v++) {
        ctx.fillRect(x + 7, y + 10 + v * 6, sz - 14, 2);
      }
      // Lightning bolt
      const lx = x + sz / 2, ly = y + sz / 2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(lx - 1, ly - 8);
      ctx.lineTo(lx + 4, ly - 2);
      ctx.lineTo(lx + 1, ly - 2);
      ctx.lineTo(lx + 3, ly + 6);
      ctx.lineTo(lx - 2, ly);
      ctx.lineTo(lx + 1, ly);
      ctx.lineTo(lx - 3, ly - 8);
      ctx.closePath();
      ctx.fill();
      // border
      ctx.strokeStyle = '#7a6000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + m, y + m, sz - m * 2, sz - m * 2);
      break;
    }
    case 'GASIFIER': {
      // Orange/brown furnace body (2x2 tiles)
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x + m, y + m, sz - m * 2, sz - m * 2);
      // Furnace inner body
      ctx.fillStyle = '#D2691E';
      ctx.fillRect(x + 6, y + 8, sz - 12, sz - 14);
      // Fire grate at bottom
      ctx.fillStyle = '#4a2a0a';
      ctx.fillRect(x + 8, y + sz - 16, sz - 16, 4);
      // Flames on top (animated)
      const ft = Game.animFrame;
      const flameColors = ['#FF4500', '#FF6600', '#FFD700'];
      for (let i = 0; i < 5; i++) {
        const fx = x + sz * 0.2 + i * (sz * 0.15);
        const fh = 6 + Math.sin(ft * 0.1 + i * 1.5) * 4;
        ctx.fillStyle = flameColors[i % 3];
        ctx.beginPath();
        ctx.moveTo(fx, y + 10);
        ctx.lineTo(fx + 4, y + 10 - fh);
        ctx.lineTo(fx + 8, y + 10);
        ctx.closePath();
        ctx.fill();
      }
      // Chimney
      ctx.fillStyle = '#555';
      ctx.fillRect(x + sz - 14, y + m, 6, 12);
      // Smoke from chimney (animated)
      ctx.fillStyle = 'rgba(150,150,150,0.4)';
      for (let s = 0; s < 3; s++) {
        const sy = y - 2 - s * 5 - (ft * 0.3 % 8);
        const sx = x + sz - 11 + Math.sin(ft * 0.05 + s) * 3;
        ctx.beginPath();
        ctx.arc(sx, sy, 3 + s, 0, Math.PI * 2);
        ctx.fill();
      }
      // Border
      ctx.strokeStyle = '#3a1a0a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + m, y + m, sz - m * 2, sz - m * 2);
      break;
    }
    case 'SYNGAS_ENGINE': {
      // Red/orange machine
      ctx.fillStyle = '#B22222';
      ctx.fillRect(x + m, y + m, sz - m * 2, sz - m * 2);
      // Machine body
      ctx.fillStyle = '#FF6347';
      ctx.fillRect(x + 5, y + 6, sz - 10, sz - 12);
      // Exhaust pipes (left and right)
      ctx.fillStyle = '#666';
      ctx.fillRect(x + 2, y + 8, 5, 4);
      ctx.fillRect(x + 2, y + sz - 14, 5, 4);
      ctx.fillRect(x + sz - 7, y + 8, 5, 4);
      // Vents
      ctx.fillStyle = '#8B0000';
      for (let v = 0; v < 3; v++) {
        ctx.fillRect(x + 7, y + 10 + v * 6, sz - 14, 2);
      }
      // Energy symbol
      const ecx = x + sz / 2, ecy = y + sz / 2;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(ecx - 1, ecy - 6);
      ctx.lineTo(ecx + 3, ecy - 1);
      ctx.lineTo(ecx, ecy - 1);
      ctx.lineTo(ecx + 2, ecy + 5);
      ctx.lineTo(ecx - 2, ecy + 1);
      ctx.lineTo(ecx + 1, ecy + 1);
      ctx.lineTo(ecx - 2, ecy - 6);
      ctx.closePath();
      ctx.fill();
      // Border
      ctx.strokeStyle = '#5a0a0a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + m, y + m, sz - m * 2, sz - m * 2);
      break;
    }
    default: {
      ctx.fillStyle = bld.def.color;
      ctx.fillRect(x + m, y + m, sz - m * 2, sz - m * 2);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + m, y + m, sz - m * 2, sz - m * 2);
    }
  }
}

// ============================================================
// renderLogistics — Pixel art pipe visuals
// ============================================================
function _buildPipePath(ctx, line, ts) {
  // 如果有沿道路的 waypoints，畫折線；否則畫直線
  if (line.waypoints && line.waypoints.length > 1) {
    const wp = line.waypoints;
    ctx.moveTo((wp[0].c + 0.5) * ts, (wp[0].r + 0.5) * ts);
    for (let i = 1; i < wp.length; i++) {
      ctx.lineTo((wp[i].c + 0.5) * ts, (wp[i].r + 0.5) * ts);
    }
  } else {
    ctx.moveTo((line.fromCol + 0.5) * ts, (line.fromRow + 0.5) * ts);
    ctx.lineTo((line.toCol + 0.5) * ts, (line.toRow + 0.5) * ts);
  }
}

function renderLogistics(ctx, ts) {
  for (const line of Game.logistics) {
    if (!line.active) continue;

    const breathe = Math.sin(Game.animFrame * 0.03 + line.distance) * 0.8;

    // Outer pipe (dark border)
    ctx.beginPath();
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 8 + breathe;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    _buildPipePath(ctx, line, ts);
    ctx.stroke();

    // Inner pipe fill — color based on efficiency
    let pipeColor;
    if (line.efficiency > 0.7) pipeColor = '#4CAF50';
    else if (line.efficiency > 0.5) pipeColor = '#FFC107';
    else pipeColor = '#F44336';

    ctx.beginPath();
    ctx.strokeStyle = pipeColor;
    ctx.lineWidth = 4 + breathe * 0.5;
    _buildPipePath(ctx, line, ts);
    ctx.stroke();

    // Animated flowing dashes
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    const dashOffset = -(Game.animFrame * 1.5) % 20;
    ctx.setLineDash([6, 8]);
    ctx.lineDashOffset = dashOffset;
    _buildPipePath(ctx, line, ts);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    // Direction arrow at midpoint of the path
    const wp = line.waypoints && line.waypoints.length > 1 ? line.waypoints : [{r: line.fromRow, c: line.fromCol}, {r: line.toRow, c: line.toCol}];
    const midIdx = Math.floor(wp.length / 2);
    const p1 = wp[Math.max(0, midIdx - 1)];
    const p2 = wp[midIdx];
    const mx = ((p1.c + p2.c) / 2 + 0.5) * ts;
    const my = ((p1.r + p2.r) / 2 + 0.5) * ts;
    const angle = Math.atan2((p2.r - p1.r) * ts, (p2.c - p1.c) * ts);

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-4, -5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================
// renderPowerLines — Yellow/gold electric lines to campus buildings
// ============================================================
function renderPowerLines(ctx, ts) {
  for (const pl of Game.powerLines) {
    const x1 = (pl.fromCol + 0.5) * ts;
    const y1 = (pl.fromRow + 0.5) * ts;
    const x2 = (pl.toCol + 0.5) * ts;
    const y2 = (pl.toRow + 0.5) * ts;

    const isPowered = Game.powerState.poweredCampusBuildings.includes(pl.campusTile);
    const isRequired = Game.requiredPowerBuildings.includes(pl.campusTile);

    // Outer line
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Inner line - gold if powered, gray if not
    ctx.beginPath();
    ctx.strokeStyle = isPowered ? (isRequired ? '#FFD700' : '#FFA500') : '#666';
    ctx.lineWidth = 3;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Electric spark animation along the line
    if (isPowered) {
      const t = Game.animFrame;
      ctx.strokeStyle = 'rgba(255,255,100,0.6)';
      ctx.lineWidth = 1;
      const sparkOffset = (t * 2) % 16;
      ctx.setLineDash([3, 13]);
      ctx.lineDashOffset = -sparkOffset;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Lightning bolt icon at midpoint
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    ctx.fillStyle = isPowered ? '#FFD700' : '#888';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', mx, my);

    ctx.lineCap = 'butt';
  }
}

// ============================================================
// renderFlowParticles — slightly larger and brighter
// ============================================================
function renderFlowParticles(ctx, ts) {
  // 已由動畫管線效果替代，保留空函式以避免呼叫錯誤
}

// ============================================================
// renderUIOverlay — hover + selection highlights
// ============================================================
function renderUIOverlay(uiCtx, ts) {
  // Hover highlight
  if (Game.ui.hoveredTile && Game.state === 'PLAYING') {
    const { row, col } = Game.ui.hoveredTile;
    if (row >= 0 && row < GameConfig.MAP_ROWS && col >= 0 && col < GameConfig.MAP_COLS) {
      uiCtx.strokeStyle = 'rgba(255,255,255,0.6)';
      uiCtx.lineWidth = 2;
      uiCtx.strokeRect(col * ts, row * ts, ts, ts);
    }
  }

  // Selection highlight
  if (Game.ui.selectedTile) {
    const { row, col } = Game.ui.selectedTile;
    uiCtx.strokeStyle = '#00ff88';
    uiCtx.lineWidth = 3;
    uiCtx.setLineDash([4, 4]);
    uiCtx.strokeRect(col * ts - 1, row * ts - 1, ts + 2, ts + 2);
    uiCtx.setLineDash([]);
  }
}

// ============================================================
// renderTooltip — with rounded corners and drop shadow
// ============================================================
function renderTooltip(uiCtx, ts) {
  if (!Game.ui.hoveredTile || Game.state !== 'PLAYING') return;
  const { row, col, x, y } = Game.ui.hoveredTile;
  if (row < 0 || row >= GameConfig.MAP_ROWS || col < 0 || col >= GameConfig.MAP_COLS) return;

  const node = getNodeAt(row, col);
  let text = '';

  if (node) {
    if (node.type === 'resource') {
      text = `${node.obj.def.icon} ${node.obj.def.name} | C/N: ${node.obj.def.cn}`;
    } else if (node.type === 'building') {
      text = `${node.obj.def.icon} ${node.obj.def.name} | 效率: ${(node.obj.efficiency * 100).toFixed(0)}%`;
    }
  } else {
    const tile = Game.campusLayout[row][col];
    if (tile === 0) text = '🟩 空地（點擊建設）';
    else if (tile === 1) text = '🛤️ 道路';
    else {
      const b = GameConfig.CAMPUS_BUILDINGS[tile];
      if (b) text = `${b.icon} ${b.name}${b.critical ? ' ★關鍵負載' : ''}`;
    }
  }

  if (text) {
    uiCtx.font = '12px sans-serif';
    const metrics = uiCtx.measureText(text);
    const tw = metrics.width + 18;
    const th = 26;
    let tx = x + 15;
    let ty = y - 32;
    if (tx + tw > Game.uiCanvas.width) tx = x - tw - 5;
    if (ty < 0) ty = y + 20;

    // Drop shadow
    uiCtx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(uiCtx, tx + 2, ty + 2, tw, th, 6);
    uiCtx.fill();

    // Background
    uiCtx.fillStyle = 'rgba(0,0,0,0.88)';
    roundRect(uiCtx, tx, ty, tw, th, 6);
    uiCtx.fill();

    // Border
    uiCtx.strokeStyle = 'rgba(255,255,255,0.15)';
    uiCtx.lineWidth = 1;
    roundRect(uiCtx, tx, ty, tw, th, 6);
    uiCtx.stroke();

    // Text
    uiCtx.fillStyle = '#fff';
    uiCtx.textAlign = 'left';
    uiCtx.textBaseline = 'middle';
    uiCtx.fillText(text, tx + 9, ty + th / 2);
  }
}

// ============================================================
// renderAlerts — same logic, same style
// ============================================================
function renderAlerts(uiCtx) {
  let ay = 10;
  for (let i = Game.ui.alerts.length - 1; i >= 0; i--) {
    const alert = Game.ui.alerts[i];
    alert.time--;
    if (alert.time <= 0) {
      Game.ui.alerts.splice(i, 1);
      continue;
    }

    const alpha = Math.min(1, alert.time / 30);
    uiCtx.globalAlpha = alpha;

    let bgColor = 'rgba(0,0,0,0.8)';
    if (alert.type === 'danger') bgColor = 'rgba(180,30,30,0.9)';
    else if (alert.type === 'warning') bgColor = 'rgba(180,120,30,0.9)';
    else if (alert.type === 'success') bgColor = 'rgba(30,120,50,0.9)';

    uiCtx.font = '13px sans-serif';
    const tw = uiCtx.measureText(alert.message).width + 20;
    const tx = (Game.uiCanvas.width - tw) / 2;

    uiCtx.fillStyle = bgColor;
    roundRect(uiCtx, tx, ay, tw, 26, 6);
    uiCtx.fill();
    uiCtx.fillStyle = '#fff';
    uiCtx.textAlign = 'center';
    uiCtx.textBaseline = 'middle';
    uiCtx.fillText(alert.message, Game.uiCanvas.width / 2, ay + 13);

    ay += 30;
    uiCtx.globalAlpha = 1.0;
  }
}

// ============================================================
// renderPowerOutageEffect — Enhanced with rain, lightning, darkness
// ============================================================
function renderPowerOutageEffect(uiCtx) {
  if (!Game.powerOutage.active) return;
  const w = Game.uiCanvas.width;
  const h = Game.uiCanvas.height;
  const t = Game.animFrame;

  // Dark overlay with flicker
  const flicker = Math.sin(t * 0.15) * 0.08;
  uiCtx.fillStyle = `rgba(0,0,20,${0.35 + flicker})`;
  uiCtx.fillRect(0, 0, w, h);

  // Rain streaks (diagonal lines)
  uiCtx.strokeStyle = 'rgba(150,170,200,0.25)';
  uiCtx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const rx = ((i * 37 + t * 3) % (w + 80)) - 40;
    const ry = ((i * 53 + t * 5) % (h + 60)) - 30;
    uiCtx.beginPath();
    uiCtx.moveTo(rx, ry);
    uiCtx.lineTo(rx + 8, ry + 16);
    uiCtx.stroke();
  }

  // Occasional lightning flash
  if (t % 180 < 3) {
    uiCtx.fillStyle = `rgba(255,255,255,${0.15 + (t % 3) * 0.05})`;
    uiCtx.fillRect(0, 0, w, h);
  }

  // Storm warning text
  uiCtx.font = 'bold 20px sans-serif';
  uiCtx.textAlign = 'center';
  uiCtx.textBaseline = 'middle';
  uiCtx.fillStyle = `rgba(255,50,50,${0.7 + Math.sin(t * 0.1) * 0.3})`;
  uiCtx.strokeStyle = 'rgba(0,0,0,0.5)';
  uiCtx.lineWidth = 3;
  uiCtx.strokeText('🌀 颱風停電中！', w / 2, 30);
  uiCtx.fillText('🌀 颱風停電中！', w / 2, 30);

  if (Game.powerState.islandMode) {
    uiCtx.fillStyle = '#4CAF50';
    uiCtx.font = 'bold 16px sans-serif';
    uiCtx.strokeStyle = 'rgba(0,0,0,0.5)';
    uiCtx.lineWidth = 2;
    uiCtx.strokeText('✅ 微電網孤島供電中', w / 2, 55);
    uiCtx.fillText('✅ 微電網孤島供電中', w / 2, 55);
  }
}

// ============================================================
// render — Main render orchestrator
// ============================================================
function render() {
  const ctx = Game.ctx;
  const uiCtx = Game.uiCtx;
  const ts = GameConfig.TILE_SIZE;

  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  uiCtx.clearRect(0, 0, Game.uiCanvas.width, Game.uiCanvas.height);

  if (Game.state === 'TITLE' || Game.state === 'TUTORIAL' || Game.state === 'GAMEOVER') {
    renderCampusBackground(ctx, ts);
    return;
  }

  // Power outage dimming
  if (Game.powerOutage.active && !Game.powerState.islandMode) {
    ctx.globalAlpha = 0.7;
  }

  // 1. Campus background
  renderCampusBackground(ctx, ts);

  ctx.globalAlpha = 1.0;

  // 2. Logistics pipes
  renderLogistics(ctx, ts);

  // 2.5 Power lines
  renderPowerLines(ctx, ts);

  // 3. Resource nodes
  renderResources(ctx, ts);

  // 4. Player equipment
  renderBuildings(ctx, ts);

  // 5. Flow particles
  renderFlowParticles(ctx, ts);

  // 6. UI overlay
  renderUIOverlay(uiCtx, ts);

  // 7. Connection preview line
  if (Game.ui.connectingLine) {
    uiCtx.beginPath();
    uiCtx.setLineDash([5, 5]);
    uiCtx.strokeStyle = '#00ff88';
    uiCtx.lineWidth = 2;
    uiCtx.moveTo(Game.ui.connectingLine.fromX, Game.ui.connectingLine.fromY);
    uiCtx.lineTo(Game.ui.connectingLine.toX, Game.ui.connectingLine.toY);
    uiCtx.stroke();
    uiCtx.setLineDash([]);
  }

  // 8. Hover tooltip
  renderTooltip(uiCtx, ts);

  // 9. Alerts
  renderAlerts(uiCtx);

  // 10. Power outage effect
  if (Game.powerOutage.active) {
    renderPowerOutageEffect(uiCtx);
  }
}
