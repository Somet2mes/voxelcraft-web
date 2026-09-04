/** Chunked voxel world with procedural terrain. */

import { Noise } from "./noise.js";
import { Block, isSolid, isLiquid } from "./blocks.js";

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;
export const SEA_LEVEL = 20;

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    this.dirty = true;
    this.mesh = null;
    this.waterMesh = null;
  }

  static index(x, y, z) {
    return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
  }

  get(x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
      return Block.AIR;
    }
    return this.blocks[Chunk.index(x, y, z)];
  }

  set(x, y, z, id) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) return;
    this.blocks[Chunk.index(x, y, z)] = id;
    this.dirty = true;
  }
}

export class World {
  constructor(seed = 20260904) {
    this.seed = seed;
    this.noise = new Noise(seed);
    this.chunks = new Map();
    this.viewDistance = 6;
  }

  key(cx, cz) {
    return `${cx},${cz}`;
  }

  getChunk(cx, cz) {
    return this.chunks.get(this.key(cx, cz)) || null;
  }

  ensureChunk(cx, cz) {
    const k = this.key(cx, cz);
    let c = this.chunks.get(k);
    if (!c) {
      c = new Chunk(cx, cz);
      this.generate(c);
      this.chunks.set(k, c);
    }
    return c;
  }

  worldToChunk(x, y, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return { cx, cz, lx, y, lz };
  }

  getBlock(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return Block.AIR;
    const { cx, cz, lx, lz } = this.worldToChunk(x, Math.floor(y), z);
    const c = this.getChunk(cx, cz);
    if (!c) return Block.AIR;
    return c.get(lx, Math.floor(y), lz);
  }

  setBlock(x, y, z, id) {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const { cx, cz, lx, y: wy, lz } = this.worldToChunk(x, Math.floor(y), z);
    const c = this.ensureChunk(cx, cz);
    const prev = c.get(lx, wy, lz);
    if (prev === id) return false;
    if (prev === Block.BEDROCK) return false;
    c.set(lx, wy, lz, id);
    // dirty neighbors if on edge
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.markDirty(cx, cz + 1);
    return true;
  }

  markDirty(cx, cz) {
    const c = this.getChunk(cx, cz);
    if (c) c.dirty = true;
  }

  heightAt(x, z) {
    const n = this.noise;
    const continent = n.fbm2(x * 0.006, z * 0.006, 4) * 0.5 + 0.5;
    const hills = n.fbm2(x * 0.025 + 100, z * 0.025 + 100, 3) * 0.5 + 0.5;
    const ridge = Math.abs(n.noise2(x * 0.01 + 40, z * 0.01 + 40));
    const detail = n.fbm2(x * 0.1, z * 0.1, 2) * 0.5 + 0.5;
    // bias land upward so continents read as land, oceans as basins
    let h = 16 + continent * 30 + hills * 14 + ridge * 10 + detail * 3;
    if (h < SEA_LEVEL + 4 && h > SEA_LEVEL - 3) {
      h = SEA_LEVEL + (h - SEA_LEVEL) * 0.65;
    }
    return Math.max(4, Math.min(CHUNK_HEIGHT - 6, Math.floor(h)));
  }

  /** Spiral search for a walkable land spawn above sea level. */
  findSpawn(originX = 0, originZ = 0) {
    for (let r = 0; r < 48; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const x = originX + dx * 3;
          const z = originZ + dz * 3;
          const h = this.heightAt(x, z);
          if (h > SEA_LEVEL + 2 && h < 48) {
            return { x: x + 0.5, y: h + 1.05, z: z + 0.5 };
          }
        }
      }
    }
    return { x: 8.5, y: 40, z: 8.5 };
  }

  temperatureAt(x, z) {
    return this.noise.fbm2(x * 0.005 + 40, z * 0.005 + 40, 2) * 0.5 + 0.5;
  }

  generate(chunk) {
    const { cx, cz } = chunk;
    const ox = cx * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = ox + lx;
        const wz = oz + lz;
        const h = this.heightAt(wx, wz);
        const temp = this.temperatureAt(wx, wz);
        const snowy = temp < 0.28 && h > 30;

        for (let y = 0; y <= h; y++) {
          let id;
          if (y === 0) id = Block.BEDROCK;
          else if (y < h - 4) id = Block.STONE;
          else if (y < h) id = Block.DIRT;
          else if (h < SEA_LEVEL - 1) id = Block.SAND;
          else if (h <= SEA_LEVEL + 1) id = temp < 0.4 ? Block.SAND : Block.GRASS;
          else id = snowy ? Block.SNOW : Block.GRASS;
          chunk.set(lx, y, lz, id);
        }

        // water fill
        for (let y = h + 1; y <= SEA_LEVEL; y++) {
          chunk.set(lx, y, lz, Block.WATER);
        }
      }
    }

    // trees
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = ox + lx;
        const wz = oz + lz;
        const h = this.heightAt(wx, wz);
        if (h <= SEA_LEVEL + 1 || h > 48) continue;
        const top = chunk.get(lx, h, lz);
        if (top !== Block.GRASS) continue;
        // deterministic tree chance
        const r = this.noise.noise2(wx * 0.71 + 9, wz * 0.73 + 7) * 0.5 + 0.5;
        if (r < 0.955) continue;
        // avoid edge placement issues for canopy - allow, neighbors will clip visually fine
        this.placeTree(chunk, lx, h + 1, lz);
      }
    }

    chunk.dirty = true;
  }

  placeTree(chunk, x, y, z) {
    const trunkH = 4 + Math.floor((this.noise.noise2(x, z) * 0.5 + 0.5) * 2);
    for (let i = 0; i < trunkH; i++) {
      if (y + i >= CHUNK_HEIGHT) break;
      chunk.set(x, y + i, z, Block.LOG);
    }
    const topY = y + trunkH - 1;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          const dist = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
          if (dist > 3) continue;
          if (dx === 0 && dz === 0 && dy < 1) continue;
          const lx = x + dx;
          const ly = topY + dy;
          const lz = z + dz;
          if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_HEIGHT) continue;
          if (chunk.get(lx, ly, lz) === Block.AIR) {
            chunk.set(lx, ly, lz, Block.LEAVES);
          }
        }
      }
    }
    // canopy top
    if (topY + 2 < CHUNK_HEIGHT && chunk.get(x, topY + 2, z) === Block.AIR) {
      chunk.set(x, topY + 2, z, Block.LEAVES);
    }
  }

  /** Load chunks around player, unload far ones. Returns list of chunks that need remesh. */
  update(playerX, playerZ) {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);
    const vd = this.viewDistance;
    const needed = new Set();

    // generate in spiral-ish order
    for (let dz = -vd; dz <= vd; dz++) {
      for (let dx = -vd; dx <= vd; dx++) {
        const d2 = dx * dx + dz * dz;
        if (d2 > (vd + 0.5) * (vd + 0.5)) continue;
        needed.add(this.key(pcx + dx, pcz + dz));
        this.ensureChunk(pcx + dx, pcz + dz);
      }
    }

    // unload
    for (const [k, chunk] of this.chunks) {
      if (!needed.has(k)) {
        if (chunk.mesh || chunk.waterMesh) {
          // handled by main via scene; mark for dispose
          chunk.dirty = false;
          chunk.unload = true;
        }
        this.chunks.delete(k);
      }
    }

    return this.chunks;
  }

  /** Voxel DDA raycast. Returns { x,y,z, nx,ny,nz, id } or null. */
  raycast(origin, direction, maxDist = 6) {
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const stepX = direction.x > 0 ? 1 : -1;
    const stepY = direction.y > 0 ? 1 : -1;
    const stepZ = direction.z > 0 ? 1 : -1;

    const tDeltaX = direction.x === 0 ? Infinity : Math.abs(1 / direction.x);
    const tDeltaY = direction.y === 0 ? Infinity : Math.abs(1 / direction.y);
    const tDeltaZ = direction.z === 0 ? Infinity : Math.abs(1 / direction.z);

    let tMaxX = direction.x === 0 ? Infinity : ((stepX > 0 ? x + 1 - origin.x : origin.x - x) * tDeltaX);
    let tMaxY = direction.y === 0 ? Infinity : ((stepY > 0 ? y + 1 - origin.y : origin.y - y) * tDeltaY);
    let tMaxZ = direction.z === 0 ? Infinity : ((stepZ > 0 ? z + 1 - origin.z : origin.z - z) * tDeltaZ);

    let nx = 0;
    let ny = 0;
    let nz = 0;
    let t = 0;

    for (let i = 0; i < 256 && t <= maxDist; i++) {
      const id = this.getBlock(x, y, z);
      if (id !== Block.AIR && !isLiquid(id)) {
        return { x, y, z, nx, ny, nz, id };
      }

      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        t = tMaxX;
        x += stepX;
        tMaxX += tDeltaX;
        nx = -stepX; ny = 0; nz = 0;
      } else if (tMaxY < tMaxZ) {
        t = tMaxY;
        y += stepY;
        tMaxY += tDeltaY;
        nx = 0; ny = -stepY; nz = 0;
      } else {
        t = tMaxZ;
        z += stepZ;
        tMaxZ += tDeltaZ;
        nx = 0; ny = 0; nz = -stepZ;
      }
    }
    return null;
  }

  /** Solid AABB for physics. */
  isSolidAt(x, y, z) {
    return isSolid(this.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)));
  }

  isInWater(x, y, z) {
    return isLiquid(this.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)));
  }
}
