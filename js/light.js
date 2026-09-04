/** Per-chunk sky light + block light (0–15). */

import { BLOCK_DEFS, Block } from "./blocks.js";

// keep in sync with world.js (avoid circular import)
const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 80;

const N = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;

function idx(x, y, z) {
  return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
}

function lightLevelOf(id) {
  const d = BLOCK_DEFS[id];
  if (!d) return 0;
  if (d.light) return d.light;
  if (d.emissive) return id === Block.LAVA ? 15 : 14;
  return 0;
}

function opacityOf(id) {
  if (id === Block.AIR) return 0;
  const d = BLOCK_DEFS[id];
  if (!d) return 1;
  if (d.liquid) return 1;
  if (d.transparent) return 1;
  return 15;
}

/** Compute sky + block light for one chunk (neighbors used for borders via getBlock). */
export function computeChunkLight(chunk, getBlock) {
  const sky = new Uint8Array(N);
  const block = new Uint8Array(N);

  // sky: cast down
  for (let z = 0; z < CHUNK_SIZE; z++) {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      let light = 15;
      for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
        const id = chunk.get(x, y, z);
        const op = opacityOf(id);
        if (op >= 15) light = 0;
        else if (op > 0) light = Math.max(0, light - op);
        sky[idx(x, y, z)] = light;
      }
    }
  }

  // block light seeds
  const queue = [];
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const id = chunk.get(x, y, z);
        const lv = lightLevelOf(id);
        if (lv > 0) {
          block[idx(x, y, z)] = lv;
          queue.push(x, y, z, lv);
        }
      }
    }
  }

  // BFS flood
  const dirs = [1, -1, 0, 0, 0, 0, 0, 0, 1, -1];
  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const z = queue[head++];
    const lv = queue[head++];
    if (lv <= 1) continue;
    const spread = lv - 1;
    for (let d = 0; d < 6; d++) {
      const nx = x + [1, -1, 0, 0, 0, 0][d];
      const ny = y + [0, 0, 1, -1, 0, 0][d];
      const nz = z + [0, 0, 0, 0, 1, -1][d];
      if (nx < 0 || nx >= CHUNK_SIZE || ny < 0 || ny >= CHUNK_HEIGHT || nz < 0 || nz >= CHUNK_SIZE) continue;
      const nId = chunk.get(nx, ny, nz);
      if (opacityOf(nId) >= 15) continue;
      const i = idx(nx, ny, nz);
      if (block[i] < spread) {
        block[i] = spread;
        queue.push(nx, ny, nz, spread);
      }
    }
  }

  chunk.skyLight = sky;
  chunk.blockLight = block;
  chunk.lightDirty = false;
}

/** Sample light 0–1 with dayFactor 0–1. */
export function sampleLight(chunk, x, y, z, dayFactor) {
  if (!chunk || !chunk.skyLight) return 0.55;
  if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT) return 0.55;
  const i = idx(x, y, z);
  const sky = (chunk.skyLight[i] / 15) * dayFactor;
  const blk = chunk.blockLight[i] / 15;
  return Math.min(1, Math.max(0.12, sky, blk));
}

export { lightLevelOf, opacityOf };
