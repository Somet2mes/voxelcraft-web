/** Block registry + procedural texture atlas (zero image assets). */

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
  COAL_ORE: 13,
  IRON_ORE: 14,
  CRAFTING_TABLE: 15,
  FURNACE: 16,
  CHEST: 17,
  NETHERRACK: 18,
  SOUL_SAND: 19,
  LAVA: 20,
  GLOWSTONE: 21,
  OBSIDIAN: 22,
  END_STONE: 23,
  PORTAL: 24,
  CACTUS: 25,
  TALL_GRASS: 26,
  FLOWER: 27,
  GRAVEL: 28,
  CLAY: 29,
  TORCH: 30,
  LEVER: 31,
  REDSTONE_WIRE: 32,
  REDSTONE_LAMP: 33,
  BRICK: 34,
  HAY: 35,
};

const B = Block;

export const BLOCK_DEFS = {
  [B.GRASS]: {
    name: "草方块",
    nameEn: "Grass",
    solid: true,
    transparent: false,
    faces: { top: "grass_top", bottom: "dirt", side: "grass_side" },
    colors: { top: "#4f8f35", side: "#5d8a34", bottom: "#8b6914" },
    drop: B.DIRT,
  },
  [B.DIRT]: {
    name: "泥土",
    nameEn: "Dirt",
    solid: true,
    faces: { top: "dirt", bottom: "dirt", side: "dirt" },
    colors: { top: "#8b6914", side: "#8b6914", bottom: "#8b6914" },
  },
  [B.STONE]: {
    name: "石头",
    nameEn: "Stone",
    solid: true,
    pickLevel: 1,
    hard: 1.5,
    faces: { top: "stone", bottom: "stone", side: "stone" },
    colors: { top: "#7a7a7a", side: "#7a7a7a", bottom: "#7a7a7a" },
    drop: B.COBBLE,
  },
  [B.SAND]: {
    name: "沙子",
    nameEn: "Sand",
    solid: true,
    gravity: true,
    faces: { top: "sand", bottom: "sand", side: "sand" },
    colors: { top: "#e0c97a", side: "#e0c97a", bottom: "#e0c97a" },
  },
  [B.WATER]: {
    name: "水",
    nameEn: "Water",
    solid: false,
    transparent: true,
    liquid: true,
    faces: { top: "water", bottom: "water", side: "water" },
    colors: { top: "#3a7ecf", side: "#3a7ecf", bottom: "#3a7ecf" },
  },
  [B.LOG]: {
    name: "原木",
    nameEn: "Log",
    solid: true,
    axePreferred: true,
    faces: { top: "log_top", bottom: "log_top", side: "log_side" },
    colors: { top: "#b0894f", side: "#6b4423", bottom: "#b0894f" },
  },
  [B.LEAVES]: {
    name: "树叶",
    nameEn: "Leaves",
    solid: true,
    transparent: true,
    soft: true,
    faces: { top: "leaves", bottom: "leaves", side: "leaves" },
    colors: { top: "#3f8f2f", side: "#3f8f2f", bottom: "#3f8f2f" },
    drop: null,
    randomDrop: { 1006: 0.05 }, // apple
  },
  [B.PLANKS]: {
    name: "木板",
    nameEn: "Planks",
    solid: true,
    axePreferred: true,
    faces: { top: "planks", bottom: "planks", side: "planks" },
    colors: { top: "#b8945f", side: "#b8945f", bottom: "#b8945f" },
  },
  [B.COBBLE]: {
    name: "圆石",
    nameEn: "Cobblestone",
    solid: true,
    pickLevel: 1,
    faces: { top: "cobble", bottom: "cobble", side: "cobble" },
    colors: { top: "#6e6e6e", side: "#6e6e6e", bottom: "#6e6e6e" },
  },
  [B.GLASS]: {
    name: "玻璃",
    nameEn: "Glass",
    solid: true,
    transparent: true,
    faces: { top: "glass", bottom: "glass", side: "glass" },
    colors: { top: "#c8e8f8", side: "#c8e8f8", bottom: "#c8e8f8" },
    drop: null,
  },
  [B.SNOW]: {
    name: "雪块",
    nameEn: "Snow",
    solid: true,
    faces: { top: "snow", bottom: "dirt", side: "snow_side" },
    colors: { top: "#f4f7fa", side: "#e8eef2", bottom: "#8b6914" },
  },
  [B.BEDROCK]: {
    name: "基岩",
    nameEn: "Bedrock",
    solid: true,
    unbreakable: true,
    faces: { top: "bedrock", bottom: "bedrock", side: "bedrock" },
    colors: { top: "#333333", side: "#333333", bottom: "#333333" },
  },
  [B.COAL_ORE]: {
    name: "煤矿石",
    nameEn: "Coal Ore",
    solid: true,
    pickLevel: 1,
    faces: { top: "coal_ore", bottom: "coal_ore", side: "coal_ore" },
    colors: { top: "#6a6a6a", side: "#6a6a6a", bottom: "#6a6a6a" },
    drop: 1002,
  },
  [B.IRON_ORE]: {
    name: "铁矿石",
    nameEn: "Iron Ore",
    solid: true,
    pickLevel: 2,
    faces: { top: "iron_ore", bottom: "iron_ore", side: "iron_ore" },
    colors: { top: "#7a7068", side: "#7a7068", bottom: "#7a7068" },
    drop: 1003,
  },
  [B.CRAFTING_TABLE]: {
    name: "工作台",
    nameEn: "Crafting Table",
    solid: true,
    interact: "craft",
    axePreferred: true,
    faces: { top: "table_top", bottom: "planks", side: "table_side" },
    colors: { top: "#9a6b3a", side: "#8b5a2b", bottom: "#b8945f" },
  },
  [B.FURNACE]: {
    name: "熔炉",
    nameEn: "Furnace",
    solid: true,
    interact: "furnace",
    pickLevel: 1,
    faces: { top: "furnace_top", bottom: "furnace_side", side: "furnace_front" },
    colors: { top: "#666", side: "#555", bottom: "#555" },
  },
  [B.CHEST]: {
    name: "箱子",
    nameEn: "Chest",
    solid: true,
    interact: "chest",
    axePreferred: true,
    faces: { top: "chest_top", bottom: "chest_top", side: "chest_side" },
    colors: { top: "#b8862b", side: "#a07020", bottom: "#a07020" },
  },
  [B.NETHERRACK]: {
    name: "下界岩",
    nameEn: "Netherrack",
    solid: true,
    soft: true,
    faces: { top: "netherrack", bottom: "netherrack", side: "netherrack" },
    colors: { top: "#6b2d2d", side: "#6b2d2d", bottom: "#6b2d2d" },
  },
  [B.SOUL_SAND]: {
    name: "灵魂沙",
    nameEn: "Soul Sand",
    solid: true,
    slow: true,
    faces: { top: "soul_sand", bottom: "soul_sand", side: "soul_sand" },
    colors: { top: "#4a3a2a", side: "#4a3a2a", bottom: "#4a3a2a" },
  },
  [B.LAVA]: {
    name: "岩浆",
    nameEn: "Lava",
    solid: false,
    transparent: true,
    liquid: true,
    damage: 4,
    emissive: true,
    light: 15,
    faces: { top: "lava", bottom: "lava", side: "lava" },
    colors: { top: "#e25822", side: "#e25822", bottom: "#e25822" },
  },
  [B.GLOWSTONE]: {
    name: "萤石",
    nameEn: "Glowstone",
    solid: true,
    emissive: true,
    light: 15,
    faces: { top: "glowstone", bottom: "glowstone", side: "glowstone" },
    colors: { top: "#e8c86a", side: "#e8c86a", bottom: "#e8c86a" },
  },
  [B.OBSIDIAN]: {
    name: "黑曜石",
    nameEn: "Obsidian",
    solid: true,
    pickLevel: 3,
    veryHard: true,
    faces: { top: "obsidian", bottom: "obsidian", side: "obsidian" },
    colors: { top: "#1a1028", side: "#1a1028", bottom: "#1a1028" },
  },
  [B.END_STONE]: {
    name: "末地石",
    nameEn: "End Stone",
    solid: true,
    pickLevel: 1,
    faces: { top: "end_stone", bottom: "end_stone", side: "end_stone" },
    colors: { top: "#e8e8c8", side: "#e8e8c8", bottom: "#e8e8c8" },
  },
  [B.PORTAL]: {
    name: "传送门",
    nameEn: "Portal",
    solid: false,
    transparent: true,
    portal: true,
    emissive: true,
    faces: { top: "portal", bottom: "portal", side: "portal" },
    colors: { top: "#8b3dff", side: "#8b3dff", bottom: "#8b3dff" },
  },
  [B.CACTUS]: {
    name: "仙人掌",
    nameEn: "Cactus",
    solid: true,
    damage: 1,
    faces: { top: "cactus_top", bottom: "cactus_top", side: "cactus_side" },
    colors: { top: "#3f8f2f", side: "#2f7a28", bottom: "#3f8f2f" },
  },
  [B.TALL_GRASS]: {
    name: "草丛",
    nameEn: "Tall Grass",
    solid: false,
    transparent: true,
    cross: true,
    soft: true,
    faces: { top: "tall_grass", bottom: "tall_grass", side: "tall_grass" },
    colors: { top: "#5aaa3a", side: "#5aaa3a", bottom: "#5aaa3a" },
    drop: 1008,
  },
  [B.FLOWER]: {
    name: "花",
    nameEn: "Flower",
    solid: false,
    transparent: true,
    cross: true,
    soft: true,
    faces: { top: "flower", bottom: "flower", side: "flower" },
    colors: { top: "#e05080", side: "#e05080", bottom: "#e05080" },
  },
  [B.GRAVEL]: {
    name: "沙砾",
    nameEn: "Gravel",
    solid: true,
    gravity: true,
    faces: { top: "gravel", bottom: "gravel", side: "gravel" },
    colors: { top: "#7a7268", side: "#7a7268", bottom: "#7a7268" },
  },
  [B.CLAY]: {
    name: "黏土",
    nameEn: "Clay",
    solid: true,
    faces: { top: "clay", bottom: "clay", side: "clay" },
    colors: { top: "#9aa8b0", side: "#9aa8b0", bottom: "#9aa8b0" },
  },
  [B.TORCH]: {
    name: "火把",
    nameEn: "Torch",
    solid: false,
    transparent: true,
    cross: true,
    light: 14,
    emissive: true,
    faces: { top: "torch", bottom: "torch", side: "torch" },
    colors: { top: "#e8c86a", side: "#e8c86a", bottom: "#6b4423" },
  },
  [B.LEVER]: {
    name: "拉杆",
    nameEn: "Lever",
    solid: false,
    transparent: true,
    cross: true,
    interact: "lever",
    faces: { top: "lever", bottom: "lever", side: "lever" },
    colors: { top: "#8a7a60", side: "#8a7a60", bottom: "#6a5a40" },
  },
  [B.REDSTONE_WIRE]: {
    name: "红石线",
    nameEn: "Redstone",
    solid: false,
    transparent: true,
    cross: true,
    faces: { top: "wire", bottom: "wire", side: "wire" },
    colors: { top: "#a01818", side: "#a01818", bottom: "#a01818" },
  },
  [B.REDSTONE_LAMP]: {
    name: "红石灯",
    nameEn: "Redstone Lamp",
    solid: true,
    faces: { top: "lamp_off", bottom: "lamp_off", side: "lamp_off" },
    colors: { top: "#8a6a30", side: "#8a6a30", bottom: "#8a6a30" },
    poweredFaces: { top: "lamp_on", bottom: "lamp_on", side: "lamp_on" },
    poweredColors: { top: "#f0d070", side: "#f0d070", bottom: "#f0d070" },
  },
  [B.BRICK]: {
    name: "砖块",
    nameEn: "Bricks",
    solid: true,
    pickLevel: 1,
    faces: { top: "brick", bottom: "brick", side: "brick" },
    colors: { top: "#a05040", side: "#a05040", bottom: "#a05040" },
  },
  [B.HAY]: {
    name: "干草块",
    nameEn: "Hay Bale",
    solid: true,
    axePreferred: true,
    faces: { top: "hay_top", bottom: "hay_top", side: "hay_side" },
    colors: { top: "#c8b040", side: "#b89830", bottom: "#c8b040" },
  },
};

export const DEFAULT_HOTBAR = [
  B.GRASS,
  B.DIRT,
  B.STONE,
  B.LOG,
  B.PLANKS,
  B.COBBLE,
  B.GLASS,
  B.CRAFTING_TABLE,
  B.FURNACE,
];

export function isSolid(id) {
  return !!(BLOCK_DEFS[id] && BLOCK_DEFS[id].solid);
}

export function isTransparent(id) {
  if (id === B.AIR) return true;
  return !!(BLOCK_DEFS[id] && BLOCK_DEFS[id].transparent);
}

export function isLiquid(id) {
  const d = BLOCK_DEFS[id];
  return !!(d && d.liquid);
}

export function blockName(id, lang = "zh") {
  const d = BLOCK_DEFS[id];
  if (!d) return "空气";
  return lang === "en" ? d.nameEn || d.name : d.name;
}

export function blockDrop(id) {
  const d = BLOCK_DEFS[id];
  if (!d) return null;
  if (d.drop === undefined) return id;
  return d.drop;
}

const TILE = 16;
const ATLAS_COLS = 8;
const ATLAS_ROWS = 6;
const FACE_ORDER = ["top", "bottom", "side"];

function px(ctx, x, y, color, a = 1) {
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
  ctx.globalAlpha = 1;
}

function mix(c1, c2, t) {
  const p = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
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
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = ((x * 17 + y * 31 + kind.length * 13) % 9) / 9 - 0.35;
      px(ctx, ox + x, oy + y, shade(base, n * 0.18));
    }
  }

  if (kind === "grass_top") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const v = Math.sin(x * 1.7 + y * 2.3) * 0.5 + 0.5;
        if (v > 0.55) px(ctx, ox + x, oy + y, shade("#3f7a28", ((x + y) % 3) * 0.06), 0.55);
      }
  } else if (kind === "grass_side") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const dirt = shade("#8b6914", ((x * 3 + y * 5) % 7) / 7 - 0.25);
        px(ctx, ox + x, oy + y, dirt);
        if (y < 4 + ((x * 7) % 3)) px(ctx, ox + x, oy + y, shade("#4f8f35", ((x + y) % 4) * 0.05));
      }
  } else if (kind === "dirt" || kind === "netherrack" || kind === "soul_sand" || kind === "gravel" || kind === "clay" || kind === "end_stone") {
    for (let i = 0; i < 28; i++) {
      const x = (i * 5 + 3) % TILE;
      const y = (i * 9 + 1) % TILE;
      px(ctx, ox + x, oy + y, shade(base, -0.25));
      if (i % 3 === 0) px(ctx, ox + x, oy + y, shade(base, 0.15));
    }
  } else if (kind === "stone" || kind === "obsidian") {
    for (let i = 0; i < 10; i++) {
      const x = (i * 4 + 1) % 14;
      const y = (i * 7 + 2) % 14;
      for (let dy = 0; dy < 3; dy++)
        for (let dx = 0; dx < 3; dx++)
          if ((dx + dy) % 2 === 0) px(ctx, ox + x + dx, oy + y + dy, shade(base, i % 2 ? 0.15 : -0.18));
    }
  } else if (kind === "sand") {
    for (let i = 0; i < 40; i++) {
      const x = (i * 3 + 1) % TILE;
      const y = (i * 11 + 4) % TILE;
      px(ctx, ox + x, oy + y, shade(base, i % 3 === 0 ? 0.12 : -0.1));
    }
  } else if (kind === "water" || kind === "lava") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const w = ((x * 3 + y * 5) % 7) * (kind === "lava" ? 0.04 : 0.015);
        px(ctx, ox + x, oy + y, shade(base, w - 0.04));
      }
    if (kind === "lava") {
      for (let i = 0; i < 8; i++) {
        px(ctx, ox + ((i * 5) % 14), oy + ((i * 3) % 14), "#ffd080", 0.7);
      }
    }
  } else if (kind === "log_side") {
    for (let x = 0; x < TILE; x++) {
      const stripe = x % 4 === 0 ? -0.22 : x % 4 === 2 ? 0.12 : 0;
      for (let y = 0; y < TILE; y++) px(ctx, ox + x, oy + y, shade(base, stripe + ((y * 3 + x) % 5) * 0.03));
    }
  } else if (kind === "log_top") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const dx = x - 7.5;
        const dy = y - 7.5;
        const d = Math.sqrt(dx * dx + dy * dy);
        px(ctx, ox + x, oy + y, shade(base, Math.sin(d * 1.8) * 0.12 - 0.05));
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
        const edge = y % 4 === 0 ? -0.28 : y % 4 === 1 ? 0.08 : 0;
        px(ctx, ox + x, oy + y, shade(base, edge + ((x * 5 + board * 9) % 7) * 0.03));
      }
    }
  } else if (kind === "cobble") {
    for (let i = 0; i < 12; i++) {
      const x = (i * 5 + 2) % 12;
      const y = (i * 7 + 1) % 12;
      for (let dy = 0; dy < 4; dy++)
        for (let dx = 0; dx < 4; dx++)
          px(ctx, ox + x + dx, oy + y + dy, shade(base, ((dx + dy + i) % 3) * 0.12 - 0.15));
    }
  } else if (kind === "glass") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const border = x === 0 || y === 0 || x === 15 || y === 15;
        const streak = x + y === 10 || (x + y === 11 && x < 8);
        if (border) px(ctx, ox + x, oy + y, shade(base, -0.25), 0.9);
        else if (streak) px(ctx, ox + x, oy + y, "#ffffff", 0.35);
        else px(ctx, ox + x, oy + y, base, 0.18);
      }
  } else if (kind === "snow") {
    for (let i = 0; i < 20; i++) px(ctx, ox + ((i * 3) % TILE), oy + ((i * 5) % TILE), shade(base, i % 2 ? 0.15 : -0.08));
  } else if (kind === "snow_side") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        if (y < 4) px(ctx, ox + x, oy + y, shade("#f4f7fa", ((x + y) % 3) * 0.05));
        else px(ctx, ox + x, oy + y, shade("#8b6914", ((x * 3 + y * 5) % 7) / 7 - 0.25));
      }
  } else if (kind === "bedrock") {
    for (let i = 0; i < 30; i++) px(ctx, ox + ((i * 4 + 1) % TILE), oy + ((i * 9 + 3) % TILE), shade(base, i % 3 === 0 ? 0.35 : -0.4));
  } else if (kind === "torch") {
    ctx.clearRect(ox, oy, TILE, TILE);
    for (let y = 6; y < 16; y++) px(ctx, ox + 7, oy + y, "#6b4423");
    for (let y = 4; y < 7; y++) {
      px(ctx, ox + 7, oy + y, "#e8c86a");
      px(ctx, ox + 8, oy + y, "#f0e0a0");
    }
    px(ctx, ox + 7, oy + 3, "#fff0b0");
  } else if (kind === "lever") {
    ctx.clearRect(ox, oy, TILE, TILE);
    for (let y = 8; y < 14; y++) px(ctx, ox + 7, oy + y, "#6a5a40");
    for (let y = 4; y < 9; y++) px(ctx, ox + 7, oy + y, "#a09070");
    px(ctx, ox + 7, oy + 3, "#c0b090");
  } else if (kind === "wire") {
    ctx.clearRect(ox, oy, TILE, TILE);
    for (let i = 0; i < 16; i++) {
      px(ctx, ox + i, oy + 8, "#a01818");
      px(ctx, ox + 8, oy + i, "#a01818");
      px(ctx, ox + i, oy + 7, "#601010");
    }
  } else if (kind === "lamp_off" || kind === "lamp_on") {
    const on = kind === "lamp_on";
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const border = x < 2 || y < 2 || x > 13 || y > 13;
        px(ctx, ox + x, oy + y, border ? shade(base, -0.25) : on ? shade(base, 0.25) : base);
      }
    if (on) {
      for (let i = 0; i < 20; i++) px(ctx, ox + ((i * 7) % 12) + 2, oy + ((i * 5) % 12) + 2, "#fff6c0");
    }
  } else if (kind === "brick") {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const row = Math.floor(y / 4);
        const off = (row % 2) * 4;
        const joint = y % 4 === 0 || (x + off) % 8 === 0;
        px(ctx, ox + x, oy + y, joint ? shade(base, -0.35) : shade(base, ((x + y) % 5) * 0.04));
      }
    }
  } else if (kind === "hay_top" || kind === "hay_side") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        if (kind === "hay_side") {
          const band = y % 5 === 0;
          px(ctx, ox + x, oy + y, shade(base, band ? -0.25 : ((x + y) % 4) * 0.05));
        } else px(ctx, ox + x, oy + y, shade(base, ((x * y) % 7) * 0.04));
      }
  } else if (kind === "coal_ore" || kind === "iron_ore") {
    const blob = kind === "coal_ore" ? "#1a1a1a" : "#d0a070";
    const spots = [
      [3, 4],
      [9, 6],
      [5, 11],
      [12, 10],
      [7, 3],
    ];
    for (const [x, y] of spots) {
      for (let dy = 0; dy < 3; dy++)
        for (let dx = 0; dx < 3; dx++) if (dx + dy < 3) px(ctx, ox + x + dx, oy + y + dy, blob);
    }
  } else if (kind === "table_top") {
    // grid
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const edge = x < 2 || y < 2 || x > 13 || y > 13;
        const line = x === 8 || y === 8;
        px(ctx, ox + x, oy + y, shade(base, edge ? -0.2 : line ? -0.15 : 0.05));
      }
  } else if (kind === "table_side") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        if (y < 5) px(ctx, ox + x, oy + y, shade("#9a6b3a", ((x + y) % 3) * 0.05));
        else px(ctx, ox + x, oy + y, shade("#6b4423", ((x * 2 + y) % 5) * 0.04));
      }
  } else if (kind === "furnace_front") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) px(ctx, ox + x, oy + y, shade(base, ((x + y) % 4) * 0.05 - 0.1));
    // mouth
    for (let y = 8; y < 13; y++)
      for (let x = 4; x < 12; x++) px(ctx, ox + x, oy + y, "#2a1810");
    for (let x = 5; x < 11; x++) px(ctx, ox + x, oy + 11, "#e25822");
  } else if (kind === "furnace_top" || kind === "furnace_side") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) px(ctx, ox + x, oy + y, shade(base, ((x * 3 + y * 2) % 6) * 0.04 - 0.15));
  } else if (kind === "chest_top" || kind === "chest_side") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) px(ctx, ox + x, oy + y, shade(base, y < 2 ? -0.2 : ((x + y) % 5) * 0.04));
    if (kind === "chest_side") {
      for (let x = 6; x < 10; x++) px(ctx, ox + x, oy + 7, "#e8c86a");
      for (let y = 6; y < 10; y++) px(ctx, ox + 7, oy + y, "#e8c86a");
    }
  } else if (kind === "glowstone") {
    for (let i = 0; i < 20; i++) {
      const x = (i * 7) % TILE;
      const y = (i * 5) % TILE;
      px(ctx, ox + x, oy + y, "#fff2a8");
      px(ctx, ox + x + 1, oy + y, "#ffe070");
    }
  } else if (kind === "portal") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const v = Math.sin(x * 0.8 + y * 0.5) * 0.5 + 0.5;
        px(ctx, ox + x, oy + y, shade(base, v * 0.25 - 0.05), 0.75);
      }
  } else if (kind === "cactus_side") {
    for (let x = 0; x < TILE; x++) {
      if (x % 4 === 1) for (let y = 0; y < TILE; y++) px(ctx, ox + x, oy + y, shade(base, 0.2));
      if (x === 0 || x === 15) for (let y = 0; y < TILE; y++) px(ctx, ox + x, oy + y, shade(base, -0.25));
    }
  } else if (kind === "cactus_top") {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) px(ctx, ox + x, oy + y, shade(base, ((x + y) % 3) * 0.08));
  } else if (kind === "tall_grass" || kind === "flower") {
    // mostly transparent with blades
    ctx.clearRect(ox, oy, TILE, TILE);
    if (kind === "flower") {
      for (let y = 8; y < 16; y++) px(ctx, ox + 8, oy + y, "#2f7a28");
      px(ctx, ox + 7, oy + 6, "#e05080");
      px(ctx, ox + 8, oy + 5, "#e05080");
      px(ctx, ox + 9, oy + 6, "#e05080");
      px(ctx, ox + 8, oy + 6, "#f0c040");
    } else {
      for (let i = 0; i < 10; i++) {
        const x = 2 + i * 1.4;
        for (let y = 4; y < 16; y++) px(ctx, ox + Math.floor(x), oy + y, shade(base, (i % 3) * 0.08));
      }
    }
  }
}

export function buildTextureAtlas(THREE) {
  const names = new Map();
  let idx = 0;
  for (const def of Object.values(BLOCK_DEFS)) {
    for (const face of FACE_ORDER) {
      const n = def.faces[face];
      if (n && !names.has(n)) names.set(n, idx++);
      const p = def.poweredFaces?.[face];
      if (p && !names.has(p)) names.set(p, idx++);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * TILE;
  canvas.height = ATLAS_ROWS * TILE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const baseByName = new Map();
  for (const def of Object.values(BLOCK_DEFS)) {
    for (const face of FACE_ORDER) {
      const n = def.faces[face];
      baseByName.set(n, def.colors[face] || def.colors.side || def.colors.top);
    }
  }

  for (const [name, i] of names) {
    const ox = (i % ATLAS_COLS) * TILE;
    const oy = Math.floor(i / ATLAS_COLS) * TILE;
    drawTile(ctx, ox, oy, name, baseByName.get(name) || "#fff");
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
    const pad = 0.5 / (ATLAS_COLS * TILE);
    return {
      u0: col / ATLAS_COLS + pad,
      u1: (col + 1) / ATLAS_COLS - pad,
      v1: 1 - row / ATLAS_ROWS - pad,
      v0: 1 - (row + 1) / ATLAS_ROWS + pad,
    };
  };

  return { canvas, texture, tileUV, names };
}

/** Animate water / lava / portal tiles in-place on the atlas canvas. */
export function animateAtlas(atlas, t) {
  const { canvas, names } = atlas;
  const ctx = canvas.getContext("2d");
  const drawAnim = (name, base, kind) => {
    const i = names.get(name);
    if (i === undefined) return;
    const ox = (i % ATLAS_COLS) * TILE;
    const oy = Math.floor(i / ATLAS_COLS) * TILE;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        let v;
        if (kind === "water") {
          v = Math.sin(x * 0.55 + t * 2.1) * 0.5 + Math.sin(y * 0.7 - t * 1.4) * 0.5;
          const c = shade(base, v * 0.12 - 0.02);
          ctx.globalAlpha = 1;
          ctx.fillStyle = c;
          ctx.fillRect(ox + x, oy + y, 1, 1);
        } else if (kind === "lava") {
          v = Math.sin(x * 0.4 + t * 3) * Math.cos(y * 0.5 - t * 2.2);
          const c = shade(base, v * 0.25);
          ctx.fillStyle = c;
          ctx.fillRect(ox + x, oy + y, 1, 1);
          if (v > 0.75) {
            ctx.fillStyle = "#ffd080";
            ctx.fillRect(ox + x, oy + y, 1, 1);
          }
        } else if (kind === "portal") {
          v = Math.sin(x * 0.6 + y * 0.3 + t * 4);
          ctx.fillStyle = shade(base, v * 0.3);
          ctx.fillRect(ox + x, oy + y, 1, 1);
        } else if (kind === "lamp_on") {
          const pulse = 0.85 + Math.sin(t * 6) * 0.15;
          ctx.fillStyle = shade(base, pulse * 0.2);
          ctx.fillRect(ox + x, oy + y, 1, 1);
        }
      }
    }
  };
  drawAnim("water", "#3a7ecf", "water");
  drawAnim("lava", "#e25822", "lava");
  drawAnim("portal", "#8b3dff", "portal");
  drawAnim("lamp_on", "#f0d070", "lamp_on");
  atlas.texture.needsUpdate = true;
}

function shadeRef(c, t) {
  return shade(c, t);
}

/** Hotbar / inventory icon for any id. */
export function drawIcon(target, id) {
  const S = 32;
  target.width = S;
  target.height = S;
  const ctx = target.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, S, S);

  const def = BLOCK_DEFS[id];
  if (def) {
    const top = def.colors.top;
    const side = def.colors.side;
    const light = shadeRef(top, 0.18);
    const mid = side;
    const dark = shadeRef(side, -0.28);
    const poly = (pts, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fill();
    };
    poly([[16, 3], [29, 10.5], [16, 18], [3, 10.5]], light);
    poly([[3, 10.5], [16, 18], [16, 30], [3, 22.5]], dark);
    poly([[16, 18], [29, 10.5], [29, 22.5], [16, 30]], mid);
    ctx.fillStyle = shadeRef(top, -0.2);
    ctx.fillRect(14, 8, 2, 2);
    return;
  }

  // item icons drawn as simple shapes
  import_item_icon(ctx, id);
}

function import_item_icon(ctx, id) {
  // local colors by id
  const map = {
    1001: ["#8b5a2b", "stick"],
    1002: ["#222222", "coal"],
    1003: ["#c4a484", "ore"],
    1004: ["#d8d8d8", "ingot"],
    1005: ["#333333", "flint"],
    1006: ["#d33333", "apple"],
    1007: ["#c4892e", "bread"],
    1008: ["#6a8f3a", "seeds"],
    1101: ["#a07840", "pick"],
    1102: ["#777777", "pick"],
    1103: ["#cccccc", "pick"],
    1111: ["#a07840", "sword"],
    1112: ["#777777", "sword"],
    1113: ["#cccccc", "sword"],
    1121: ["#a07840", "axe"],
    1122: ["#777777", "axe"],
    1131: ["#888888", "steel"],
  };
  const [color, kind] = map[id] || ["#aaa", "item"];
  ctx.fillStyle = color;
  if (kind === "stick" || kind === "steel") {
    ctx.fillRect(14, 8, 4, 18);
    if (kind === "steel") {
      ctx.fillStyle = "#444";
      ctx.fillRect(10, 8, 12, 6);
    }
  } else if (kind === "coal" || kind === "ore" || kind === "flint") {
    ctx.fillRect(10, 10, 12, 12);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(12, 12, 4, 3);
  } else if (kind === "ingot") {
    ctx.fillRect(8, 14, 16, 8);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(10, 15, 10, 2);
  } else if (kind === "apple") {
    ctx.beginPath();
    ctx.arc(16, 18, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f7a28";
    ctx.fillRect(15, 8, 2, 4);
  } else if (kind === "bread") {
    ctx.fillRect(8, 14, 16, 10);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(10, 16, 2, 6);
    ctx.fillRect(15, 16, 2, 6);
    ctx.fillRect(20, 16, 2, 6);
  } else if (kind === "seeds") {
    for (let i = 0; i < 8; i++) ctx.fillRect(10 + (i % 4) * 4, 12 + Math.floor(i / 4) * 5, 2, 3);
  } else if (kind === "pick") {
    ctx.fillRect(14, 10, 3, 18);
    ctx.fillRect(8, 8, 16, 4);
    ctx.fillRect(8, 8, 4, 6);
    ctx.fillRect(20, 8, 4, 6);
  } else if (kind === "sword") {
    ctx.fillRect(15, 6, 3, 14);
    ctx.fillRect(10, 18, 13, 3);
    ctx.fillRect(15, 21, 3, 6);
  } else if (kind === "axe") {
    ctx.fillRect(14, 10, 3, 18);
    ctx.fillRect(10, 6, 10, 8);
  }
}
