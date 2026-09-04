/** Crafting + smelting recipes. */

import { Block } from "./blocks.js";
import { Item } from "./items.js";

/**
 * Shaped 3x3 recipes use pattern rows of item ids (0 = empty).
 * Shapeless: { shapeless: [ids], out: {id, count} }
 */
export const CRAFT_RECIPES = [
  // planks from log
  { shapeless: [Block.LOG], out: { id: Block.PLANKS, count: 4 } },
  // sticks
  {
    pattern: [
      [Block.PLANKS, 0, 0],
      [Block.PLANKS, 0, 0],
      [0, 0, 0],
    ],
    out: { id: Item.STICK, count: 4 },
  },
  // crafting table
  {
    pattern: [
      [Block.PLANKS, Block.PLANKS, 0],
      [Block.PLANKS, Block.PLANKS, 0],
      [0, 0, 0],
    ],
    out: { id: Block.CRAFTING_TABLE, count: 1 },
  },
  // furnace
  {
    pattern: [
      [Block.COBBLE, Block.COBBLE, Block.COBBLE],
      [Block.COBBLE, 0, Block.COBBLE],
      [Block.COBBLE, Block.COBBLE, Block.COBBLE],
    ],
    out: { id: Block.FURNACE, count: 1 },
  },
  // chest
  {
    pattern: [
      [Block.PLANKS, Block.PLANKS, Block.PLANKS],
      [Block.PLANKS, 0, Block.PLANKS],
      [Block.PLANKS, Block.PLANKS, Block.PLANKS],
    ],
    out: { id: Block.CHEST, count: 1 },
  },
  // tools
  {
    pattern: [
      [Block.PLANKS, Block.PLANKS, Block.PLANKS],
      [0, Item.STICK, 0],
      [0, Item.STICK, 0],
    ],
    out: { id: Item.WOOD_PICK, count: 1 },
  },
  {
    pattern: [
      [Block.COBBLE, Block.COBBLE, Block.COBBLE],
      [0, Item.STICK, 0],
      [0, Item.STICK, 0],
    ],
    out: { id: Item.STONE_PICK, count: 1 },
  },
  {
    pattern: [
      [Item.IRON_INGOT, Item.IRON_INGOT, Item.IRON_INGOT],
      [0, Item.STICK, 0],
      [0, Item.STICK, 0],
    ],
    out: { id: Item.IRON_PICK, count: 1 },
  },
  {
    pattern: [
      [Block.PLANKS, 0, 0],
      [Block.PLANKS, Item.STICK, 0],
      [0, Item.STICK, 0],
    ],
    out: { id: Item.WOOD_SWORD, count: 1 },
  },
  {
    pattern: [
      [Block.COBBLE, 0, 0],
      [Block.COBBLE, Item.STICK, 0],
      [0, Item.STICK, 0],
    ],
    out: { id: Item.STONE_SWORD, count: 1 },
  },
  {
    pattern: [
      [Item.IRON_INGOT, 0, 0],
      [Item.IRON_INGOT, Item.STICK, 0],
      [0, Item.STICK, 0],
    ],
    out: { id: Item.IRON_SWORD, count: 1 },
  },
  {
    pattern: [
      [Block.PLANKS, Block.PLANKS, 0],
      [Block.PLANKS, Item.STICK, 0],
      [0, Item.STICK, 0],
    ],
    out: { id: Item.WOOD_AXE, count: 1 },
  },
  {
    pattern: [
      [Block.COBBLE, Block.COBBLE, 0],
      [Block.COBBLE, Item.STICK, 0],
      [0, Item.STICK, 0],
    ],
    out: { id: Item.STONE_AXE, count: 1 },
  },
  // flint and steel
  {
    pattern: [
      [Item.FLINT, 0, 0],
      [0, Item.IRON_INGOT, 0],
      [0, 0, 0],
    ],
    out: { id: Item.FLINT_STEEL, count: 1 },
  },
  // bread from seeds (simple)
  {
    pattern: [
      [Item.SEEDS, Item.SEEDS, Item.SEEDS],
      [0, 0, 0],
      [0, 0, 0],
    ],
    out: { id: Item.BREAD, count: 1 },
  },
  // glass from sand (craft shortcut, also smeltable)
  {
    shapeless: [Block.SAND, Block.SAND],
    out: { id: Block.GLASS, count: 1 },
  },
  // torch: coal + stick
  {
    pattern: [
      [Item.COAL, 0, 0],
      [Item.STICK, 0, 0],
      [0, 0, 0],
    ],
    out: { id: Block.TORCH, count: 4 },
  },
  // lever
  {
    pattern: [
      [Item.STICK, 0, 0],
      [Block.COBBLE, 0, 0],
      [0, 0, 0],
    ],
    out: { id: Block.LEVER, count: 1 },
  },
  // redstone lamp
  {
    pattern: [
      [Block.PLANKS, Block.PLANKS, Block.PLANKS],
      [Block.PLANKS, Block.GLOWSTONE, Block.PLANKS],
      [Block.PLANKS, Block.PLANKS, Block.PLANKS],
    ],
    out: { id: Block.REDSTONE_LAMP, count: 1 },
  },
  // redstone wire
  {
    pattern: [
      [Item.COAL, Item.COAL, 0],
      [0, Item.STICK, 0],
      [0, 0, 0],
    ],
    out: { id: Block.REDSTONE_WIRE, count: 6 },
  },
  // brick
  {
    shapeless: [Block.CLAY, Block.CLAY],
    out: { id: Block.BRICK, count: 2 },
  },
];

export const SMELT_RECIPES = {
  [Block.SAND]: { id: Block.GLASS, count: 1 },
  [Block.COBBLE]: { id: Block.STONE, count: 1 },
  [Block.LOG]: { id: Item.COAL, count: 1 },
  [Block.IRON_ORE]: { id: Item.IRON_INGOT, count: 1 },
  [Item.RAW_IRON]: { id: Item.IRON_INGOT, count: 1 },
};

function gridKey(ids) {
  return ids.join(",");
}

function normalizeGrid(grid) {
  // grid is 9-length array of {id,count}|null → ids only
  return grid.map((s) => (s ? s.id : 0));
}

function trimPattern(ids) {
  let minR = 3,
    maxR = -1,
    minC = 3,
    maxC = -1;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (ids[r * 3 + c]) {
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
      }
    }
  }
  if (maxR < 0) return [];
  const out = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      out.push(ids[r * 3 + c]);
    }
  }
  return { w: maxC - minC + 1, h: maxR - minR + 1, cells: out };
}

function matchShaped(gridIds, pattern) {
  // try all offsets
  for (let dr = 0; dr <= 0; dr++) {
    for (let dc = 0; dc <= 0; dc++) {
      let ok = true;
      for (let r = 0; r < 3 && ok; r++) {
        for (let c = 0; c < 3 && ok; c++) {
          const want = pattern[r]?.[c] || 0;
          const have = gridIds[r * 3 + c];
          if (want !== have) ok = false;
        }
      }
      if (ok) return true;
    }
  }
  return false;
}

function matchShapeless(gridIds, ids) {
  const have = gridIds.filter((x) => x).sort((a, b) => a - b);
  const need = ids.filter((x) => x).sort((a, b) => a - b);
  if (have.length !== need.length) return false;
  return have.every((v, i) => v === need[i]);
}

/**
 * Find craft result for a 9-slot grid (player can use 2x2 by only filling first 2x2 conceptually;
 * we always use 3x3 internally). Returns {id,count} or null.
 */
export function findRecipe(grid) {
  const ids = normalizeGrid(grid);
  for (const r of CRAFT_RECIPES) {
    if (r.pattern) {
      if (matchShaped(ids, r.pattern)) return { ...r.out };
    } else if (r.shapeless) {
      if (matchShapeless(ids, r.shapeless)) return { ...r.out };
    }
  }
  return null;
}

/** Consume 1 of each non-empty grid slot. */
export function consumeCraft(grid) {
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) continue;
    grid[i].count -= 1;
    if (grid[i].count <= 0) grid[i] = null;
  }
}

export function smeltResult(inputId) {
  return SMELT_RECIPES[inputId] || null;
}
