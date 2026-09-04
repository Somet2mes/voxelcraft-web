/** Block registry + procedural 16×16 texture atlas. */

export const Block = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5,
  LOG: 6,
  LEAVES: 7,
  PLANKS: 8,
  COBBLE: 9,
  GLASS: 10,
  SNOW: 11,
  BEDROCK: 12,
};

export const BLOCK_DEFS = {
  [Block.GRASS]: {
    name: "草方块",
    solid: true,
    transparent: false,
    faces: { top: "grass_top", bottom: "dirt", side: "grass_side" },
    colors: { top: "#4f8f35", side: "#5d8a34", bottom: "#8b6914" },
  },
  [Block.DIRT]: {
    name: "泥土",
    solid: true,
    transparent: false,
    faces: { top: "dirt", bottom: "dirt", side: "dirt" },
    colors: { top: "#8b6914", side: "#8b6914", bottom: "#8b6914" },
  },
  [Block.STONE]: {
    name: "石头",
    solid: true,
    transparent: false,
    faces: { top: "stone", bottom: "stone", side: "stone" },
    colors: { top: "#7a7a7a", side: "#7a7a7a", bottom: "#7a7a7a" },
  },
  [Block.SAND]: {
    name: "沙子",
    solid: true,
    transparent: false,
    faces: { top: "sand", bottom: "sand", side: "sand" },
    colors: { top: "#e0c97a", side: "#e0c97a", bottom: "#e0c97a" },
  },
  [Block.WATER]: {
    name: "水",
    solid: false,
    transparent: true,
    liquid: true,
    faces: { top: "water", bottom: "water", side: "water" },
    colors: { top: "#3a7ecf", side: "#3a7ecf", bottom: "#3a7ecf" },
  },
  [Block.LOG]: {
    name: "原木",
    solid: true,
    transparent: false,
    faces: { top: "log_top", bottom: "log_top", side: "log_side" },
    colors: { top: "#b0894f", side: "#6b4423", bottom: "#b0894f" },
  },
  [Block.LEAVES]: {
    name: "树叶",
    solid: true,
    transparent: true,
    faces: { top: "leaves", bottom: "leaves", side: "leaves" },
    colors: { top: "#3f8f2f", side: "#3f8f2f", bottom: "#3f8f2f" },
  },
  [Block.PLANKS]: {
    name: "木板",
    solid: true,
    transparent: false,
    faces: { top: "planks", bottom: "planks", side: "planks" },
    colors: { top: "#b8945f", side: "#b8945f", bottom: "#b8945f" },
  },
  [Block.COBBLE]: {
    name: "圆石",
    solid: true,
    transparent: false,
    faces: { top: "cobble", bottom: "cobble", side: "cobble" },
    colors: { top: "#6e6e6e", side: "#6e6e6e", bottom: "#6e6e6e" },
  },
  [Block.GLASS]: {
    name: "玻璃",
    solid: true,
    transparent: true,
    faces: { top: "glass", bottom: "glass", side: "glass" },
    colors: { top: "#c8e8f8", side: "#c8e8f8", bottom: "#c8e8f8" },
  },
  [Block.SNOW]: {
    name: "雪块",
    solid: true,
    transparent: false,
    faces: { top: "snow", bottom: "dirt", side: "snow_side" },
    colors: { top: "#f4f7fa", side: "#e8eef2", bottom: "#8b6914" },
  },
  [Block.BEDROCK]: {
    name: "基岩",
    solid: true,
    transparent: false,
    unbreakable: true,
    faces: { top: "bedrock", bottom: "bedrock", side: "bedrock" },
    colors: { top: "#333333", side: "#333333", bottom: "#333333" },
  },
};

export const HOTBAR_BLOCKS = [
  Block.GRASS,
  Block.DIRT,
  Block.STONE,
  Block.SAND,
  Block.LOG,
  Block.LEAVES,
  Block.PLANKS,
  Block.COBBLE,
  Block.GLASS,
];

export function isSolid(id) {
  return !!(BLOCK_DEFS[id] && BLOCK_DEFS[id].solid);
}

export function isTransparent(id) {
  if (id === Block.AIR) return true;
  return !!(BLOCK_DEFS[id] && BLOCK_DEFS[id].transparent);
}

export function isLiquid(id) {
  return id === Block.WATER;
}

export function blockName(id) {
  return BLOCK_DEFS[id]?.name ?? "空气";
}

const TILE = 16;
const ATLAS_COLS = 4;
const ATLAS_ROWS = 4;
const FACE_ORDER = ["top", "bottom", "side"];

function px(ctx, x, y, color, a = 1) {
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
  ctx.globalAlpha = 1;
}

function mix(c1, c2, t) {
  const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const a = p(c1);
  const b = p(c2);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function shade(c, t) {
  if (t >= 0) return mix(c, "#ffffff", Math.min(t, 1));
  return mix(c, "#000000", Math.min(-t, 1));
}

function drawTile(ctx, ox, oy, kind, base) {
  // fill base
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = ((x * 17 + y * 31 + kind.length * 13) % 9) / 9 - 0.35;
      px(ctx, ox + x, oy + y, shade(base, n * 0.18));
    }
  }

  if (kind === "grass_top") {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const v = Math.sin(x * 1.7 + y * 2.3) * 0.5 + 0.5;
        if (v > 0.55) px(ctx, ox + x, oy + y, shade("#3f7a28", ((x + y) % 3) * 0.06), 0.55);
      }
    }
  } else if (kind === "grass_side") {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const dirt = shade("#8b6914", ((x * 3 + y * 5) % 7) / 7 - 0.25);
        px(ctx, ox + x, oy + y, dirt);
        if (y < 4 + ((x * 7) % 3)) {
          px(ctx, ox + x, oy + y, shade("#4f8f35", ((x + y) % 4) * 0.05));
        }
      }
    }
  } else if (kind === "dirt") {
    for (let i = 0; i < 28; i++) {
      const x = (i * 5 + 3) % TILE;
      const y = (i * 9 + 1) % TILE;
      px(ctx, ox + x, oy + y, shade(base, -0.25));
    }
  } else if (kind === "stone") {
    for (let i = 0; i < 10; i++) {
      const x = (i * 4 + 1) % 14;
      const y = (i * 7 + 2) % 14;
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          if ((dx + dy) % 2 === 0) px(ctx, ox + x + dx, oy + y + dy, shade(base, i % 2 ? 0.15 : -0.18));
        }
      }
    }
  } else if (kind === "sand") {
    for (let i = 0; i < 40; i++) {
      const x = (i * 3 + 1) % TILE;
      const y = (i * 11 + 4) % TILE;
      px(ctx, ox + x, oy + y, shade(base, i % 3 === 0 ? 0.12 : -0.1));
    }
  } else if (kind === "water") {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const w = ((x * 3 + y * 5) % 7) * 0.015;
        px(ctx, ox + x, oy + y, shade(base, w - 0.04));
      }
    }
  } else if (kind === "log_side") {
    for (let x = 0; x < TILE; x++) {
      const stripe = (x % 4 === 0) ? -0.22 : (x % 4 === 2 ? 0.12 : 0);
      for (let y = 0; y < TILE; y++) {
        px(ctx, ox + x, oy + y, shade(base, stripe + ((y * 3 + x) % 5) * 0.03));
      }
    }
  } else if (kind === "log_top") {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const dx = x - 7.5;
        const dy = y - 7.5;
        const d = Math.sqrt(dx * dx + dy * dy);
        const ring = Math.sin(d * 1.8) * 0.12;
        px(ctx, ox + x, oy + y, shade(base, ring - 0.05));
      }
    }
    for (let x = 0; x < TILE; x++) {
      px(ctx, ox + x, oy, shade(base, -0.35));
      px(ctx, ox + x, oy + 15, shade(base, -0.25));
    }
  } else if (kind === "leaves") {
    for (let i = 0; i < 55; i++) {
      const x = (i * 7 + 2) % TILE;
      const y = (i * 13 + 5) % TILE;
      px(ctx, ox + x, oy + y, shade(base, i % 4 === 0 ? 0.25 : -0.2), 0.85);
    }
  } else if (kind === "planks") {
    for (let y = 0; y < TILE; y++) {
      const board = Math.floor(y / 4) % 2;
      for (let x = 0; x < TILE; x++) {
        const edge = y % 4 === 0 ? -0.28 : (y % 4 === 1 ? 0.08 : 0);
        const grain = ((x * 5 + board * 9) % 7) * 0.03;
        px(ctx, ox + x, oy + y, shade(base, edge + grain));
      }
      if (y % 4 === 2) {
        const seam = (y * 3) % 16;
        px(ctx, ox + seam, oy + y, shade(base, -0.3));
      }
    }
  } else if (kind === "cobble") {
    for (let i = 0; i < 12; i++) {
      const x = (i * 5 + 2) % 12;
      const y = (i * 7 + 1) % 12;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          px(ctx, ox + x + dx, oy + y + dy, shade(base, ((dx + dy + i) % 3) * 0.12 - 0.15));
        }
      }
    }
  } else if (kind === "glass") {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const border = x === 0 || y === 0 || x === 15 || y === 15;
        const streak = (x + y === 10) || (x + y === 11 && x < 8);
        if (border) px(ctx, ox + x, oy + y, shade(base, -0.25), 0.9);
        else if (streak) px(ctx, ox + x, oy + y, "#ffffff", 0.35);
        else px(ctx, ox + x, oy + y, base, 0.18);
      }
    }
  } else if (kind === "snow") {
    for (let i = 0; i < 20; i++) {
      const x = (i * 3) % TILE;
      const y = (i * 5) % TILE;
      px(ctx, ox + x, oy + y, shade(base, i % 2 ? 0.15 : -0.08));
    }
  } else if (kind === "snow_side") {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        if (y < 4) px(ctx, ox + x, oy + y, shade("#f4f7fa", ((x + y) % 3) * 0.05));
        else px(ctx, ox + x, oy + y, shade("#8b6914", ((x * 3 + y * 5) % 7) / 7 - 0.25));
      }
    }
  } else if (kind === "bedrock") {
    for (let i = 0; i < 30; i++) {
      const x = (i * 4 + 1) % TILE;
      const y = (i * 9 + 3) % TILE;
      px(ctx, ox + x, oy + y, shade(base, i % 3 === 0 ? 0.35 : -0.4));
    }
  }
}

/**
 * Build a texture atlas from all unique face tiles.
 * Returns { canvas, texture, tileUV(name) -> {u0,v0,u1,v1}, tileIndex(name) }
 */
export function buildTextureAtlas(THREE) {
  const names = new Map();
  let idx = 0;
  for (const def of Object.values(BLOCK_DEFS)) {
    for (const face of FACE_ORDER) {
      const n = def.faces[face];
      if (!names.has(n)) names.set(n, idx++);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * TILE;
  canvas.height = ATLAS_ROWS * TILE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  for (const [name, i] of names) {
    const ox = (i % ATLAS_COLS) * TILE;
    const oy = Math.floor(i / ATLAS_COLS) * TILE;
    // find base color for this tile
    let base = "#ffffff";
    for (const def of Object.values(BLOCK_DEFS)) {
      for (const face of FACE_ORDER) {
        if (def.faces[face] === name) {
          base = def.colors[face] || def.colors.side || def.colors.top;
        }
      }
    }
    drawTile(ctx, ox, oy, name, base);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  const tileUV = (name) => {
    const i = names.get(name);
    if (i === undefined) return { u0: 0, v0: 0, u1: 1 / ATLAS_COLS, v1: 1 / ATLAS_ROWS };
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    // slight inset to avoid bleeding
    const pad = 0.5 / (ATLAS_COLS * TILE);
    const u0 = col / ATLAS_COLS + pad;
    const u1 = (col + 1) / ATLAS_COLS - pad;
    // flip V for three.js UV origin bottom-left
    const v1 = 1 - row / ATLAS_ROWS - pad;
    const v0 = 1 - (row + 1) / ATLAS_ROWS + pad;
    return { u0, v0, u1, v1 };
  };

  return { canvas, texture, tileUV, names };
}

/** 32×32 pixel icon for hotbar. */
export function drawBlockIcon(target, blockId) {
  const S = 32;
  target.width = S;
  target.height = S;
  const ctx = target.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const def = BLOCK_DEFS[blockId];
  if (!def) return;

  const top = def.colors.top;
  const side = def.colors.side;
  const light = shade(top, 0.18);
  const mid = side;
  const dark = shade(side, -0.28);

  const poly = (pts, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
  };

  // isometric cube
  poly([[16, 3], [29, 10.5], [16, 18], [3, 10.5]], light);
  poly([[3, 10.5], [16, 18], [16, 30], [3, 22.5]], dark);
  poly([[16, 18], [29, 10.5], [29, 22.5], [16, 30]], mid);

  // pixel accents
  ctx.fillStyle = shade(top, -0.2);
  ctx.fillRect(14, 8, 2, 2);
  ctx.fillRect(18, 11, 2, 1);
  ctx.fillStyle = shade(side, -0.2);
  ctx.fillRect(6, 14, 2, 2);
  ctx.fillRect(20, 20, 2, 2);

  if (blockId === Block.GLASS) {
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 1;
    ctx.strokeRect(8.5, 8.5, 15, 15);
  }
}
