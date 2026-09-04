/** Items (tools, food, materials) + block-as-item mapping. */

import { Block, BLOCK_DEFS } from "./blocks.js";

export const Item = {
  // materials
  STICK: 1001,
  COAL: 1002,
  RAW_IRON: 1003,
  IRON_INGOT: 1004,
  FLINT: 1005,
  APPLE: 1006,
  BREAD: 1007,
  SEEDS: 1008,
  // tools
  WOOD_PICK: 1101,
  STONE_PICK: 1102,
  IRON_PICK: 1103,
  WOOD_SWORD: 1111,
  STONE_SWORD: 1112,
  IRON_SWORD: 1113,
  WOOD_AXE: 1121,
  STONE_AXE: 1122,
  FLINT_STEEL: 1131,
};

export const ITEM_DEFS = {
  [Item.STICK]: { name: ["木棍", "Stick"], stack: 64, icon: "#8b5a2b", kind: "material" },
  [Item.COAL]: { name: ["煤炭", "Coal"], stack: 64, icon: "#222222", kind: "material", fuel: 8 },
  [Item.RAW_IRON]: { name: ["粗铁", "Raw Iron"], stack: 64, icon: "#c4a484", kind: "material" },
  [Item.IRON_INGOT]: { name: ["铁锭", "Iron Ingot"], stack: 64, icon: "#d8d8d8", kind: "material" },
  [Item.FLINT]: { name: ["燧石", "Flint"], stack: 64, icon: "#333333", kind: "material" },
  [Item.APPLE]: { name: ["苹果", "Apple"], stack: 16, icon: "#d33", kind: "food", food: 4 },
  [Item.BREAD]: { name: ["面包", "Bread"], stack: 16, icon: "#c4892e", kind: "food", food: 6 },
  [Item.SEEDS]: { name: ["种子", "Seeds"], stack: 64, icon: "#6a8f3a", kind: "material" },
  [Item.WOOD_PICK]: {
    name: ["木镐", "Wood Pickaxe"],
    stack: 1,
    icon: "#a07840",
    kind: "tool",
    tool: "pickaxe",
    level: 1,
    speed: 2,
    damage: 2,
  },
  [Item.STONE_PICK]: {
    name: ["石镐", "Stone Pickaxe"],
    stack: 1,
    icon: "#777",
    kind: "tool",
    tool: "pickaxe",
    level: 2,
    speed: 4,
    damage: 3,
  },
  [Item.IRON_PICK]: {
    name: ["铁镐", "Iron Pickaxe"],
    stack: 1,
    icon: "#ccc",
    kind: "tool",
    tool: "pickaxe",
    level: 3,
    speed: 6,
    damage: 4,
  },
  [Item.WOOD_SWORD]: {
    name: ["木剑", "Wood Sword"],
    stack: 1,
    icon: "#a07840",
    kind: "tool",
    tool: "sword",
    level: 1,
    speed: 1,
    damage: 4,
  },
  [Item.STONE_SWORD]: {
    name: ["石剑", "Stone Sword"],
    stack: 1,
    icon: "#777",
    kind: "tool",
    tool: "sword",
    level: 2,
    speed: 1,
    damage: 6,
  },
  [Item.IRON_SWORD]: {
    name: ["铁剑", "Iron Sword"],
    stack: 1,
    icon: "#ccc",
    kind: "tool",
    tool: "sword",
    level: 3,
    speed: 1,
    damage: 8,
  },
  [Item.WOOD_AXE]: {
    name: ["木斧", "Wood Axe"],
    stack: 1,
    icon: "#a07840",
    kind: "tool",
    tool: "axe",
    level: 1,
    speed: 3,
    damage: 3,
  },
  [Item.STONE_AXE]: {
    name: ["石斧", "Stone Axe"],
    stack: 1,
    icon: "#777",
    kind: "tool",
    tool: "axe",
    level: 2,
    speed: 5,
    damage: 4,
  },
  [Item.FLINT_STEEL]: {
    name: ["打火石", "Flint and Steel"],
    stack: 1,
    icon: "#666",
    kind: "tool",
    tool: "lighter",
    level: 1,
    speed: 1,
    damage: 1,
  },
};

export function isBlockId(id) {
  return id > 0 && id < 1000 && !!BLOCK_DEFS[id];
}

export function isItemId(id) {
  return id >= 1000 && !!ITEM_DEFS[id];
}

export function itemName(id, lang = "zh") {
  if (isBlockId(id)) {
    const d = BLOCK_DEFS[id];
    return lang === "en" ? d.nameEn || d.name : d.name;
  }
  const d = ITEM_DEFS[id];
  if (!d) return String(id);
  return lang === "en" ? d.name[1] : d.name[0];
}

export function maxStack(id) {
  if (isItemId(id)) return ITEM_DEFS[id].stack || 64;
  return 64;
}

export function itemFuelTime(id) {
  if (isItemId(id)) return ITEM_DEFS[id].fuel || 0;
  if (id === Block.LOG) return 15;
  if (id === Block.PLANKS) return 10;
  if (id === Item.STICK) return 5;
  return 0;
}

export function toolLevel(id) {
  if (!isItemId(id)) return 0;
  return ITEM_DEFS[id].level || 0;
}

export function toolSpeed(id, blockId) {
  if (!isItemId(id)) return 1;
  const def = ITEM_DEFS[id];
  if (!def || def.kind !== "tool") return 1;
  const bd = BLOCK_DEFS[blockId];
  if (!bd) return 1;
  // pickaxe best on stone-ish
  if (def.tool === "pickaxe" && bd.pickLevel) {
    if (def.level >= bd.pickLevel) return def.speed;
    return 0.5;
  }
  if (def.tool === "axe" && bd.axePreferred) return def.speed;
  if (def.tool === "sword" && bd.soft) return def.speed * 1.5;
  return def.speed * 0.4;
}

export function damageOf(id) {
  if (!isItemId(id)) return 1;
  return ITEM_DEFS[id].damage || 1;
}

export function foodOf(id) {
  if (!isItemId(id)) return 0;
  return ITEM_DEFS[id].food || 0;
}

/** Starting items for survival. */
export function starterKit() {
  return [
    { id: Block.LOG, count: 8 },
    { id: Item.BREAD, count: 3 },
    { id: Item.FLINT_STEEL, count: 1 },
  ];
}

/** Creative palette for hotbar defaults. */
export function creativePalette() {
  return [
    Block.GRASS,
    Block.STONE,
    Block.LOG,
    Block.PLANKS,
    Block.GLASS,
    Block.COBBLE,
    Item.WOOD_PICK,
    Item.IRON_SWORD,
    Item.FLINT_STEEL,
  ];
}
