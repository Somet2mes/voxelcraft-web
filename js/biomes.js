/** Biome table driven by temperature / humidity. */

import { Block } from "./blocks.js";

export const Biome = {
  OCEAN: 0,
  BEACH: 1,
  PLAINS: 2,
  FOREST: 3,
  DESERT: 4,
  SNOWY: 5,
  MOUNTAINS: 6,
  SWAMP: 7,
};

export function classifyBiome(temp, hum, height, seaLevel) {
  if (height < seaLevel - 2) return Biome.OCEAN;
  if (height <= seaLevel + 1) return Biome.BEACH;
  if (height > seaLevel + 18) return Biome.MOUNTAINS;
  if (temp < 0.32) return Biome.SNOWY;
  if (temp > 0.72 && hum < 0.4) return Biome.DESERT;
  if (hum > 0.7 && height <= seaLevel + 4) return Biome.SWAMP;
  if (hum > 0.55) return Biome.FOREST;
  return Biome.PLAINS;
}

export function biomeName(id, lang = "zh") {
  const zh = ["海洋", "沙滩", "平原", "森林", "沙漠", "雪原", "山地", "沼泽"];
  const en = ["Ocean", "Beach", "Plains", "Forest", "Desert", "Snowy", "Mountains", "Swamp"];
  return lang === "en" ? en[id] ?? "?" : zh[id] ?? "?";
}

export function surfaceBlock(biome, snowTop = false) {
  switch (biome) {
    case Biome.DESERT:
    case Biome.BEACH:
      return Block.SAND;
    case Biome.SNOWY:
      return snowTop ? Block.SNOW : Block.GRASS;
    case Biome.OCEAN:
      return Block.SAND;
    case Biome.MOUNTAINS:
      return snowTop ? Block.SNOW : Block.GRASS;
    case Biome.SWAMP:
      return Block.GRASS;
    default:
      return Block.GRASS;
  }
}

export function underBlock(biome) {
  switch (biome) {
    case Biome.DESERT:
    case Biome.BEACH:
    case Biome.OCEAN:
      return Block.SAND;
    case Biome.SWAMP:
      return Block.CLAY;
    default:
      return Block.DIRT;
  }
}

export function treeChance(biome) {
  switch (biome) {
    case Biome.FOREST:
      return 0.93;
    case Biome.PLAINS:
      return 0.975;
    case Biome.SWAMP:
      return 0.94;
    case Biome.SNOWY:
      return 0.96;
    case Biome.MOUNTAINS:
      return 0.985;
    case Biome.DESERT:
      return 1.01; // none
    default:
      return 1.01;
  }
}

export function cactusChance(biome) {
  return biome === Biome.DESERT ? 0.96 : 1.01;
}
