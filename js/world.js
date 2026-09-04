/** Multi-dimension chunked voxel world. */

import { Noise } from "./noise.js";
import {
  Block,
  isSolid,
  isLiquid,
  BLOCK_DEFS,
} from "./blocks.js";
import {
  classifyBiome,
  surfaceBlock,
  underBlock,
  treeChance,
  cactusChance,
  Biome,
} from "./biomes.js";
import { rleDecode } from "./save.js";
import { computeChunkLight, sampleLight } from "./light.js";

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 80;
export const SEA_LEVEL = 28;

export const Dim = { OVERWORLD: 0, NETHER: 1, END: 2 };
export const DIM_NAMES = {
  0: { zh: "主世界", en: "Overworld" },
  1: { zh: "下界", en: "Nether" },
  2: { zh: "末地", en: "The End" },
};

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    this.dirty = true;
    this.userModified = false;
    this.mesh = null;
    this.waterMesh = null;
  }

  static index(x, y, z) {
    return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
  }

  get(x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) return Block.AIR;
    return this.blocks[Chunk.index(x, y, z)];
  }

  set(x, y, z, id) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) return;
    this.blocks[Chunk.index(x, y, z)] = id;
    this.dirty = true;
  }
}

export class Dimension {
  constructor(id, seed) {
    this.id = id;
    this.seed = seed;
    this.noise = new Noise(seed + id * 10007);
    this.chunks = new Map();
    this.viewDistance = id === Dim.OVERWORLD ? 6 : 4;
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

  worldToChunk(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return { cx, cz, lx, lz };
  }

  getBlock(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return Block.AIR;
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    const { cx, cz, lx, lz } = this.worldToChunk(x, z);
    const c = this.getChunk(cx, cz);
    if (!c) return Block.AIR;
    return c.get(lx, y, lz);
  }

  setBlock(x, y, z, id) {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    const { cx, cz, lx, lz } = this.worldToChunk(x, z);
    const c = this.ensureChunk(cx, cz);
    const prev = c.get(lx, y, lz);
    if (prev === id) return false;
    if (prev === Block.BEDROCK) return false;
    c.set(lx, y, lz, id);
    c.userModified = true;
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

  tempAt(x, z) {
    return this.noise.fbm2(x * 0.004 + 10, z * 0.004 + 10, 2) * 0.5 + 0.5;
  }

  humAt(x, z) {
    return this.noise.fbm2(x * 0.005 + 50, z * 0.005 + 50, 2) * 0.5 + 0.5;
  }

  heightAt(x, z) {
    const n = this.noise;
    if (this.id === Dim.NETHER) {
      const a = n.fbm2(x * 0.04, z * 0.04, 3) * 0.5 + 0.5;
      const b = n.fbm2(x * 0.01 + 9, z * 0.01 + 9, 2) * 0.5 + 0.5;
      return Math.floor(20 + a * 28 + b * 10);
    }
    if (this.id === Dim.END) {
      const a = n.fbm2(x * 0.03, z * 0.03, 3) * 0.5 + 0.5;
      if (a < 0.55) return 0; // void
      return Math.floor(40 + (a - 0.55) * 40);
    }
    const continent = n.fbm2(x * 0.005, z * 0.005, 4) * 0.5 + 0.5;
    const hills = n.fbm2(x * 0.02 + 100, z * 0.02 + 100, 3) * 0.5 + 0.5;
    const ridge = Math.abs(n.noise2(x * 0.008 + 40, z * 0.008 + 40));
    const detail = n.fbm2(x * 0.1, z * 0.1, 2) * 0.5 + 0.5;
    let h = 22 + continent * 28 + hills * 12 + ridge * 12 + detail * 3;
    if (h < SEA_LEVEL + 4 && h > SEA_LEVEL - 3) h = SEA_LEVEL + (h - SEA_LEVEL) * 0.65;
    return Math.max(4, Math.min(CHUNK_HEIGHT - 10, Math.floor(h)));
  }

  biomeAt(x, z) {
    const h = this.heightAt(x, z);
    return classifyBiome(this.tempAt(x, z), this.humAt(x, z), h, SEA_LEVEL);
  }

  findSpawn(originX = 0, originZ = 0) {
    if (this.id === Dim.END) return { x: 0.5, y: 50, z: 0.5 };
    if (this.id === Dim.NETHER) return { x: 0.5, y: 40, z: 0.5 };
    for (let r = 0; r < 48; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const x = originX + dx * 3;
          const z = originZ + dz * 3;
          const h = this.heightAt(x, z);
          if (h > SEA_LEVEL + 2 && h < 50) return { x: x + 0.5, y: h + 1.05, z: z + 0.5 };
        }
      }
    }
    return { x: 8.5, y: 40, z: 8.5 };
  }

  generate(chunk) {
    const { cx, cz } = chunk;
    const ox = cx * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = ox + lx;
        const wz = oz + lz;
        if (this.id === Dim.NETHER) this.genNetherCol(chunk, lx, lz, wx, wz);
        else if (this.id === Dim.END) this.genEndCol(chunk, lx, lz, wx, wz);
        else this.genOverworldCol(chunk, lx, lz, wx, wz);
      }
    }

    this.decorate(chunk);
    this.placeVillage(chunk);
    computeChunkLight(chunk, (x, y, z) => this.getBlock(x, y, z));
    chunk.dirty = true;
    chunk.lightDirty = false;
  }

  placeVillage(chunk) {
    if (this.id !== Dim.OVERWORLD) return;
    const { cx, cz } = chunk;
    // grid placement every 6 chunks + noise jitter skip
    if (((cx % 6) + 6) % 6 !== 2 || ((cz % 6) + 6) % 6 !== 2) return;
    const skip = this.noise.noise2(cx * 0.2, cz * 0.2);
    if (skip < -0.35) return;
    const ox = 3;
    const oz = 3;
    const wx = cx * CHUNK_SIZE + ox;
    const wz = cz * CHUNK_SIZE + oz;
    const h = this.heightAt(wx, wz);
    if (h <= SEA_LEVEL + 1 || h > 52) return;
    const W = 7;
    const D = 7;
    const H = 4;
    for (let z = 0; z < D; z++) {
      for (let x = 0; x < W; x++) {
        if (ox + x >= CHUNK_SIZE || oz + z >= CHUNK_SIZE) continue;
        chunk.set(ox + x, h, oz + z, Block.COBBLE);
        chunk.set(ox + x, h + 1, oz + z, Block.COBBLE);
      }
    }
    for (let y = h + 2; y < h + 2 + H; y++) {
      for (let z = 0; z < D; z++) {
        for (let x = 0; x < W; x++) {
          if (ox + x >= CHUNK_SIZE || oz + z >= CHUNK_SIZE) continue;
          const edge = x === 0 || z === 0 || x === W - 1 || z === D - 1;
          if (!edge) {
            chunk.set(ox + x, y, oz + z, Block.AIR);
            continue;
          }
          if (z === 0 && (x === 3 || x === 4) && y < h + 5) {
            chunk.set(ox + x, y, oz + z, Block.AIR);
            continue;
          }
          if (y === h + 4 && ((x === 0 || x === W - 1) && (z === 2 || z === 4))) {
            chunk.set(ox + x, y, oz + z, Block.GLASS);
            continue;
          }
          chunk.set(ox + x, y, oz + z, Block.PLANKS);
        }
      }
    }
    const roofY = h + 2 + H;
    for (let z = 0; z < D; z++) {
      for (let x = 0; x < W; x++) {
        if (ox + x >= CHUNK_SIZE || oz + z >= CHUNK_SIZE) continue;
        chunk.set(ox + x, roofY, oz + z, x === 0 || z === 0 || x === W - 1 || z === D - 1 ? Block.PLANKS : Block.BRICK);
      }
    }
    chunk.set(ox + 3, h + 3, oz + 3, Block.REDSTONE_LAMP);
    chunk.set(ox + 5, h + 2, oz + 2, Block.LEVER);
    chunk.set(ox + 5, h + 2, oz + 5, Block.HAY);
    chunk.set(ox + 4, h + 2, oz + 3, Block.TORCH);
    chunk.set(ox + 2, h + 2, oz + 3, Block.CHEST);
    chunk.userModified = true;
  }

  genOverworldCol(chunk, lx, lz, wx, wz) {
    const h = this.heightAt(wx, wz);
    const temp = this.tempAt(wx, wz);
    const biome = classifyBiome(temp, this.humAt(wx, wz), h, SEA_LEVEL);
    const snow = biome === Biome.SNOWY || (biome === Biome.MOUNTAINS && h > SEA_LEVEL + 24);

    for (let y = 0; y <= h; y++) {
      let id;
      if (y === 0) id = Block.BEDROCK;
      else if (y < h - 4) {
        id = Block.STONE;
        const o = this.noise.noise3(wx * 0.12, y * 0.12, wz * 0.12);
        if (o > 0.72 && y < 40) id = Block.COAL_ORE;
        else if (o > 0.78 && y < 28) id = Block.IRON_ORE;
        else if (o < -0.8 && y > 8) id = Block.GRAVEL;
        // 3D noise caves
        if (y > 4 && y < h - 6) {
          const c = this.noise.noise3(wx * 0.08, y * 0.1, wz * 0.08);
          const c2 = this.noise.noise3(wx * 0.16 + 50, y * 0.14, wz * 0.16 + 50);
          if (c + c2 * 0.5 > 0.62) id = Block.AIR;
          else if (c + c2 * 0.5 > 0.55 && y < 16) id = Block.LAVA;
        }
      } else if (y < h) id = underBlock(biome);
      else id = surfaceBlock(biome, snow);
      chunk.set(lx, y, lz, id);
    }
    for (let y = h + 1; y <= SEA_LEVEL; y++) {
      chunk.set(lx, y, lz, Block.WATER);
    }
  }

  genNetherCol(chunk, lx, lz, wx, wz) {
    const h = this.heightAt(wx, wz);
    for (let y = 0; y <= Math.max(h, 10); y++) {
      let id = Block.NETHERRACK;
      if (y === 0) id = Block.BEDROCK;
      else if (y === CHUNK_HEIGHT - 1) id = Block.BEDROCK;
      else if (y > h && y < 12) id = Block.LAVA;
      else if (y === h) id = this.noise.noise2(wx * 0.2, wz * 0.2) > 0.4 ? Block.SOUL_SAND : Block.NETHERRACK;
      chunk.set(lx, y, lz, id);
    }
    // glow blobs
    const g = this.noise.noise3(wx * 0.3, 10, wz * 0.3);
    if (g > 0.75) {
      const y = 20 + Math.floor((this.noise.noise2(wx, wz) * 0.5 + 0.5) * 20);
      if (y < CHUNK_HEIGHT - 2) chunk.set(lx, y, lz, Block.GLOWSTONE);
    }
  }

  genEndCol(chunk, lx, lz, wx, wz) {
    const h = this.heightAt(wx, wz);
    if (h <= 0) return;
    for (let y = Math.max(1, h - 6); y <= h; y++) {
      chunk.set(lx, y, lz, y === h ? Block.END_STONE : Block.END_STONE);
    }
    // bedrock floor under island
    chunk.set(lx, 0, lz, Block.BEDROCK);
  }

  decorate(chunk) {
    const { cx, cz } = chunk;
    const ox = cx * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = ox + lx;
        const wz = oz + lz;

        if (this.id === Dim.NETHER) {
          // sparse glow
          if (this.noise.noise2(wx * 0.5 + 3, wz * 0.5) > 0.92) {
            const h = this.heightAt(wx, wz);
            if (h + 2 < CHUNK_HEIGHT) chunk.set(lx, h + 1, lz, Block.GLOWSTONE);
          }
          continue;
        }
        if (this.id === Dim.END) continue;

        const h = this.heightAt(wx, wz);
        if (h <= SEA_LEVEL + 1 || h > 60) continue;
        const biome = this.biomeAt(wx, wz);
        const top = chunk.get(lx, h, lz);
        if (top !== Block.GRASS && top !== Block.SAND) continue;

        // cactus
        if (top === Block.SAND) {
          const cr = this.noise.noise2(wx * 0.7 + 5, wz * 0.7 + 5) * 0.5 + 0.5;
          if (cr >= cactusChance(biome)) {
            const ht = 2 + Math.floor(cr * 3);
            for (let i = 0; i < ht && h + 1 + i < CHUNK_HEIGHT; i++) {
              chunk.set(lx, h + 1 + i, lz, Block.CACTUS);
            }
          }
        }

        // flowers / tall grass (disabled: plant meshes need polish)
        // if (top === Block.GRASS) { ... }

        // trees
        const tr = this.noise.noise2(wx * 0.71 + 9, wz * 0.73 + 7) * 0.5 + 0.5;
        if (tr >= treeChance(biome) && top === Block.GRASS) {
          this.placeTree(chunk, lx, h + 1, lz, biome === Biome.SNOWY);
        }
      }
    }
  }

  placeTree(chunk, x, y, z, snowy = false) {
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
          if (chunk.get(lx, ly, lz) === Block.AIR) chunk.set(lx, ly, lz, Block.LEAVES);
        }
      }
    }
  }

  update(px, pz) {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);
    const vd = this.viewDistance;
    const needed = new Set();
    for (let dz = -vd; dz <= vd; dz++) {
      for (let dx = -vd; dx <= vd; dx++) {
        if (dx * dx + dz * dz > (vd + 0.5) * (vd + 0.5)) continue;
        needed.add(this.key(pcx + dx, pcz + dz));
        this.ensureChunk(pcx + dx, pcz + dz);
      }
    }
    for (const k of [...this.chunks.keys()]) {
      if (!needed.has(k)) this.chunks.delete(k);
    }
    return this.chunks;
  }

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
    let tMaxX = direction.x === 0 ? Infinity : (stepX > 0 ? x + 1 - origin.x : origin.x - x) * tDeltaX;
    let tMaxY = direction.y === 0 ? Infinity : (stepY > 0 ? y + 1 - origin.y : origin.y - y) * tDeltaY;
    let tMaxZ = direction.z === 0 ? Infinity : (stepZ > 0 ? z + 1 - origin.z : origin.z - z) * tDeltaZ;
    let nx = 0, ny = 0, nz = 0, t = 0;
    for (let i = 0; i < 256 && t <= maxDist; i++) {
      const id = this.getBlock(x, y, z);
      if (id !== Block.AIR && !isLiquid(id) && id !== Block.TALL_GRASS && id !== Block.FLOWER && id !== Block.PORTAL) {
        return { x, y, z, nx, ny, nz, id };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        t = tMaxX; x += stepX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0;
      } else if (tMaxY < tMaxZ) {
        t = tMaxY; y += stepY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0;
      } else {
        t = tMaxZ; z += stepZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ;
      }
    }
    return null;
  }

  isSolidAt(x, y, z) {
    return isSolid(this.getBlock(x, y, z));
  }

  isInWater(x, y, z) {
    return isLiquid(this.getBlock(x, y, z));
  }

  isInLava(x, y, z) {
    return this.getBlock(x, y, z) === Block.LAVA;
  }

  isInPortal(x, y, z) {
    return this.getBlock(x, y, z) === Block.PORTAL;
  }

  /** Toggle levers near a point; update lamp light. */
  toggleLever(x, y, z) {
    // flip a virtual power set
    if (!this.powered) this.powered = new Set();
    const k = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    const on = !this.powered.has(k);
    if (on) this.powered.add(k);
    else this.powered.delete(k);
    // relight nearby lamps
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        for (let dz = -6; dz <= 6; dz++) {
          const id = this.getBlock(x + dx, y + dy, z + dz);
          if (id === Block.REDSTONE_LAMP) {
            // keep same id; light recompute via emissive override
          }
        }
      }
    }
    // recompute light for affected chunks
    this.relightAround(x, z);
    return on;
  }

  relightAround(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const c = this.getChunk(cx + dx, cz + dz);
        if (!c) continue;
        computeChunkLight(c, (px, py, pz) => this.getBlock(px, py, pz));
        // boost lamps near powered levers
        if (this.powered?.size) {
          for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
              for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                if (c.get(lx, y, lz) !== Block.REDSTONE_LAMP) continue;
                const wx = c.cx * CHUNK_SIZE + lx;
                const wz = c.cz * CHUNK_SIZE + lz;
                for (const pk of this.powered) {
                  const [px, py, pz] = pk.split(",").map(Number);
                  if (Math.hypot(px - wx, pz - wz) <= 8 && Math.abs(py - y) <= 4) {
                    const i = (y * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
                    if (c.blockLight) c.blockLight[i] = 15;
                  }
                }
              }
            }
          }
        }
        c.dirty = true;
      }
    }
  }

  getDayLight(timeOfDay) {
    const sunH = Math.sin(timeOfDay * Math.PI * 2);
    return Math.max(0.12, Math.min(1, sunH * 0.85 + 0.35));
  }

  sampleLightAt(x, y, z, dayFactor) {
    const { cx, cz, lx, lz } = this.worldToChunk(Math.floor(x), Math.floor(z));
    const c = this.getChunk(cx, cz);
    return sampleLight(c, lx, Math.floor(y), lz, dayFactor);
  }
}

/** Manages all dimensions + portal links. */
export class World {
  constructor(seed = 20260904) {
    this.seed = seed;
    this.dimensions = new Map();
    for (const id of [Dim.OVERWORLD, Dim.NETHER, Dim.END]) {
      this.dimensions.set(id, new Dimension(id, seed));
    }
    this.activeDim = Dim.OVERWORLD;
    this.portalTimer = 0;
  }

  get dim() {
    return this.dimensions.get(this.activeDim);
  }

  get viewDistance() {
    return this.dim.viewDistance;
  }

  get chunks() {
    return this.dim.chunks;
  }

  getChunk(cx, cz) {
    return this.dim.getChunk(cx, cz);
  }

  ensureChunk(cx, cz) {
    return this.dim.ensureChunk(cx, cz);
  }

  getBlock(x, y, z) {
    return this.dim.getBlock(x, y, z);
  }

  setBlock(x, y, z, id) {
    return this.dim.setBlock(x, y, z, id);
  }

  heightAt(x, z) {
    return this.dim.heightAt(x, z);
  }

  biomeAt(x, z) {
    return this.dim.biomeAt(x, z);
  }

  findSpawn(x = 0, z = 0) {
    return this.dim.findSpawn(x, z);
  }

  update(px, pz) {
    return this.dim.update(px, pz);
  }

  raycast(origin, direction, maxDist = 6) {
    return this.dim.raycast(origin, direction, maxDist);
  }

  isSolidAt(x, y, z) {
    return this.dim.isSolidAt(x, y, z);
  }

  isInWater(x, y, z) {
    return this.dim.isInWater(x, y, z);
  }

  isInLava(x, y, z) {
    return this.dim.isInLava(x, y, z);
  }

  isInPortal(x, y, z) {
    return this.dim.isInPortal(x, y, z);
  }

  toggleLever(x, y, z) {
    return this.dim.toggleLever(x, y, z);
  }

  relightAround(x, z) {
    return this.dim.relightAround(x, z);
  }

  getDayLight(timeOfDay) {
    return this.dim.getDayLight(timeOfDay);
  }

  sampleLightAt(x, y, z, dayFactor) {
    return this.dim.sampleLightAt(x, y, z, dayFactor);
  }

  setActiveDim(id) {
    this.activeDim = id;
  }

  /**
   * Build a lit portal frame interior blocks.
   * Frame is 4x5 obsidian, interior becomes PORTAL.
   */
  lightPortal(x, y, z, destDim = Dim.NETHER) {
    // find a portal-shaped hole near x,y,z or create frame interior
    // If player used flint on obsidian, try to fill air inside an obsidian frame.
    const filled = this.fillPortalInterior(x, y, z);
    return { ok: filled, dest: destDim };
  }

  fillPortalInterior(x, y, z) {
    // search nearby for obsidian rectangle 4 wide x 5 tall interior 2x3
    const dim = this.dim;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const ox = x + dx;
          const oy = y + dy;
          const oz = z + dz;
          // check two orientations: frame in X-Y plane or Z-Y plane
          if (this.tryFrame(ox, oy, oz, 1, 0)) return true;
          if (this.tryFrame(ox, oy, oz, 0, 1)) return true;
        }
      }
    }
    return false;
  }

  tryFrame(x, y, z, ax, az) {
    // ax,az = axis of width (1,0) or (0,1)
    // assume (x,y,z) is bottom-left interior
    const dim = this.dim;
    const isObs = (px, py, pz) => dim.getBlock(px, py, pz) === Block.OBSIDIAN;
    // interior 2 wide, 3 tall
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        const px = x + i * ax;
        const py = y + j;
        const pz = z + i * az;
        const id = dim.getBlock(px, py, pz);
        if (id !== Block.AIR && id !== Block.PORTAL) return false;
      }
    }
    // frame: bottom/top 4 wide, sides
    for (let i = -1; i <= 2; i++) {
      if (!isObs(x + i * ax, y - 1, z + i * az)) return false;
      if (!isObs(x + i * ax, y + 3, z + i * az)) return false;
    }
    for (let j = -1; j <= 3; j++) {
      if (!isObs(x - ax, y + j, z - az)) return false;
      if (!isObs(x + 2 * ax, y + j, z + 2 * az)) return false;
    }
    // light it
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        dim.setBlock(x + i * ax, y + j, z + i * az, Block.PORTAL);
      }
    }
    return true;
  }

  /** Coords mapping between dimensions (simplified 1:1). */
  mapCoords(x, z, from, to) {
    if (from === Dim.OVERWORLD && to === Dim.NETHER) {
      return { x: x / 8, z: z / 8 };
    }
    if (from === Dim.NETHER && to === Dim.OVERWORLD) {
      return { x: x * 8, z: z * 8 };
    }
    return { x, z };
  }

  serializePortals() {
    return {}; // portals are blocks themselves
  }

  loadFromSave(save) {
    if (!save.dims) return;
    for (const id of Object.keys(save.dims)) {
      const dimId = Number(id);
      const dim = this.dimensions.get(dimId);
      if (!dim) continue;
      // keep generated chunks; overlay user modifications
      const chunks = save.dims[id];
      for (const k of Object.keys(chunks)) {
        const sc = chunks[k];
        const c = dim.ensureChunk(sc.cx, sc.cz);
        if (sc.b) {
          const arr = rleDecode(sc.b, c.blocks.length);
          c.blocks.set(arr);
        } else if (sc.blocks) {
          for (let i = 0; i < c.blocks.length && i < sc.blocks.length; i++) c.blocks[i] = sc.blocks[i];
        }
        c.userModified = true;
        c.dirty = true;
      }
    }
  }
}

export { BLOCK_DEFS };
