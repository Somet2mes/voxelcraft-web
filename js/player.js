/** First-person player: look, physics, survival, combat, interaction. */

import * as THREE from "three";
import { Block, BLOCK_DEFS, blockDrop } from "./blocks.js";
import { Inventory } from "./inventory.js";
import {
  starterKit,
  creativePalette,
  toolLevel,
  toolSpeed,
  damageOf,
  foodOf,
  isItemId,
  itemFuelTime,
} from "./items.js";
import { Dim } from "./world.js";
import { sfx } from "./audio.js";

const WIDTH = 0.6;
const HEIGHT = 1.8;
const EYE = 1.62;
const GRAVITY = 28;
const JUMP = 9.2;
const WALK = 4.8;
const SPRINT = 7.6;
const SNEAK = 2.2;
const FLY = 12;
const FLY_SPRINT = 24;
const WATER_DRAG = 0.55;
const TERMINAL = 50;

export class Player {
  constructor(world, camera) {
    this.world = world;
    this.camera = camera;
    this.position = new THREE.Vector3(8, 40, 8);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = -0.15;
    this.onGround = false;
    this.flying = false;
    this.inWater = false;
    this.inLava = false;
    this.inPortal = false;
    this.sprint = false;
    this.sneak = false;
    this.hotbarIndex = 0;
    this.keys = new Set();
    this.bob = 0;
    this.lastSpace = 0;
    this.dimension = Dim.OVERWORLD;
    this.gamemode = "survival"; // or creative
    this.health = 20;
    this.maxHealth = 20;
    this.hunger = 20;
    this.maxHunger = 20;
    this.hungerTimer = 0;
    this.regenTimer = 0;
    this.hurtCd = 0;
    this.attackCd = 0;
    this.portalCd = 0;
    this.stepTimer = 0;
    this.dead = false;
    this.inventory = new Inventory(36);
    this.selected = null; // furnace ui state etc
  }

  get held() {
    return this.inventory.get(this.hotbarIndex);
  }

  get selectedItemId() {
    return this.held?.id ?? Block.GRASS;
  }

  setupInventory(mode) {
    this.inventory.clear();
    if (mode === "creative") {
      const pal = creativePalette();
      for (let i = 0; i < 9; i++) this.inventory.set(i, { id: pal[i], count: 64 });
    } else {
      const kit = starterKit();
      kit.forEach((k, i) => this.inventory.set(i, k));
    }
  }

  spawnAtSurface() {
    const s = this.world.findSpawn(0, 0);
    this.position.set(s.x, s.y, s.z);
    this.velocity.set(0, 0, 0);
    this.dimension = this.world.activeDim;
    this.dead = false;
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.syncCamera();
  }

  respawn() {
    this.world.setActiveDim(Dim.OVERWORLD);
    this.dimension = Dim.OVERWORLD;
    this.health = this.maxHealth;
    this.hunger = Math.max(10, this.maxHunger);
    this.dead = false;
    this.flying = false;
    this.velocity.set(0, 0, 0);
    const s = this.world.findSpawn(0, 0);
    this.position.set(s.x, s.y, s.z);
    this.syncCamera();
  }

  handleKey(code, down) {
    if (down) this.keys.add(code);
    else this.keys.delete(code);
    if (down && code === "KeyF") {
      if (this.gamemode === "creative" || this.flying) {
        this.flying = !this.flying;
        this.velocity.y = 0;
        return "flying";
      }
    }
    if (down && code === "Space") {
      const now = performance.now();
      if (now - this.lastSpace < 280 && this.gamemode === "creative") {
        this.flying = !this.flying;
        this.velocity.y = 0;
      }
      this.lastSpace = now;
    }
    return null;
  }

  takeDamage(n) {
    if (this.gamemode === "creative" || this.dead) return false;
    if (this.hurtCd > 0) return false;
    this.hurtCd = 0.45;
    this.health -= n;
    sfx.hurt();
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      sfx.death();
    }
    return true;
  }

  heal(n) {
    this.health = Math.min(this.maxHealth, this.health + n);
  }

  eat() {
    const h = this.held;
    if (!h) return false;
    const food = foodOf(h.id);
    if (food <= 0 || this.hunger >= this.maxHunger) return false;
    h.count -= 1;
    if (h.count <= 0) this.inventory.set(this.hotbarIndex, null);
    this.hunger = Math.min(this.maxHunger, this.hunger + food);
    this.heal(2);
    sfx.eat();
    return true;
  }

  update(dt) {
    if (this.dead) return;

    this.hurtCd = Math.max(0, this.hurtCd - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.portalCd = Math.max(0, this.portalCd - dt);

    const fwd = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    const strafe = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    this.sprint = this.keys.has("ControlLeft") || this.keys.has("ControlRight");
    this.sneak = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");

    this.inWater = this.world.isInWater(this.position.x, this.position.y + 0.5, this.position.z);
    this.inLava = this.world.isInLava(this.position.x, this.position.y + 0.5, this.position.z);
    this.inPortal = this.world.isInPortal(this.position.x, this.position.y + 0.9, this.position.z);

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    let wishX = -fwd * sin + strafe * cos;
    let wishZ = -fwd * cos - strafe * sin;
    const len = Math.hypot(wishX, wishZ);
    if (len > 0) {
      wishX /= len;
      wishZ /= len;
    }

    let speed = this.flying ? (this.sprint ? FLY_SPRINT : FLY) : this.sprint ? SPRINT : WALK;
    if (this.sneak && !this.flying) speed = SNEAK;
    if (this.inWater && !this.flying) speed *= 0.55;
    // soul sand slow
    if (this.world.getBlock(this.position.x, this.position.y - 0.2, this.position.z) === Block.SOUL_SAND) {
      speed *= 0.6;
    }

    const accel = this.flying ? 18 : this.onGround ? 40 : 12;
    this.velocity.x += (wishX * speed - this.velocity.x) * Math.min(1, accel * dt);
    this.velocity.z += (wishZ * speed - this.velocity.z) * Math.min(1, accel * dt);

    const wasY = this.position.y;
    if (this.flying) {
      const up = (this.keys.has("Space") ? 1 : 0) - (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") ? 1 : 0);
      this.velocity.y += (up * speed - this.velocity.y) * Math.min(1, accel * dt);
    } else if (this.inWater) {
      this.velocity.y -= GRAVITY * 0.35 * dt;
      if (this.keys.has("Space")) this.velocity.y += GRAVITY * 0.75 * dt;
      this.velocity.y *= WATER_DRAG;
    } else if (this.inLava) {
      this.velocity.y -= GRAVITY * 0.25 * dt;
      if (this.keys.has("Space")) this.velocity.y += GRAVITY * 0.5 * dt;
      this.takeDamage(2 * dt * 2);
    } else {
      this.velocity.y -= GRAVITY * dt;
      if (this.keys.has("Space") && this.onGround) {
        this.velocity.y = JUMP;
        this.onGround = false;
      }
      if (this.velocity.y < -TERMINAL) this.velocity.y = TERMINAL;
    }

    const prevOnGround = this.onGround;
    this.moveWithCollision(dt);

    // fall damage
    if (!this.flying && !this.inWater && prevOnGround === false && this.onGround) {
      const fall = this.fallFrom - this.position.y;
      if (fall > 4) this.takeDamage(Math.floor(fall - 3));
    }
    if (!this.onGround && this.velocity.y < 0 && this.fallFrom === undefined) {
      // start tracking
    }
    if (!this.onGround && this.velocity.y < -0.1) {
      if (this.fallFrom === undefined || this.position.y > this.fallFrom) {
        // keep highest recent
      }
      if (this.fallFrom === undefined) this.fallFrom = this.position.y;
    }
    if (this.onGround) {
      // after landing clear
      setTimeout(() => {
        this.fallFrom = undefined;
      }, 0);
    }
    // better fall tracking
    if (!this.flying && !this.inWater) {
      if (!this.onGround) {
        this.fallFrom = Math.max(this.fallFrom ?? this.position.y, this.position.y);
      }
    }

    // steps sound
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.onGround && hSpeed > 1.5 && !this.flying) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.38;
        sfx.step();
      }
      this.bob += dt * hSpeed * 1.6;
    } else {
      this.bob += dt * 0.5;
    }

    // survival ticks
    if (this.gamemode === "survival") {
      this.hungerTimer += dt * (this.sprint ? 1.8 : 1);
      if (this.hungerTimer > 45) {
        this.hungerTimer = 0;
        this.hunger = Math.max(0, this.hunger - 1);
      }
      if (this.hunger >= 16 && this.health < this.maxHealth) {
        this.regenTimer += dt;
        if (this.regenTimer > 3.5) {
          this.regenTimer = 0;
          this.heal(1);
          this.hunger = Math.max(0, this.hunger - 1);
        }
      }
      if (this.hunger <= 0) {
        this.regenTimer += dt;
        if (this.regenTimer > 2) {
          this.regenTimer = 0;
          this.takeDamage(1);
        }
      }
      // drown
      if (this.inWater && this.world.isInWater(this.camera.position.x, this.camera.position.y, this.camera.position.z)) {
        // simplified: no air meter, small damage if fully submerged long — skip
      }
    }

    // cactus damage
    const feet = this.world.getBlock(this.position.x, this.position.y + 0.2, this.position.z);
    if (feet === Block.CACTUS) this.takeDamage(1);

    if (this.position.y < -20) {
      this.takeDamage(20);
      if (!this.dead) this.respawn();
    }

    this.syncCamera(hSpeed);
  }

  moveWithCollision(dt) {
    const half = { x: WIDTH / 2, z: WIDTH / 2 };
    const axes = ["x", "z", "y"];
    for (const axis of axes) {
      const delta = this.velocity[axis] * dt;
      if (delta === 0) continue;
      this.position[axis] += delta;
      if (this.resolveAxis(axis)) {
        this.velocity[axis] = 0;
        if (axis === "y" && delta < 0) this.onGround = true;
      } else if (axis === "y") {
        if (delta < 0) this.onGround = false;
      }
    }
    if (!this.flying) {
      const feetY = this.position.y - 0.05;
      const halfW = WIDTH / 2;
      const on =
        this.world.isSolidAt(this.position.x - halfW + 0.05, feetY, this.position.z - halfW + 0.05) ||
        this.world.isSolidAt(this.position.x + halfW - 0.05, feetY, this.position.z - halfW + 0.05) ||
        this.world.isSolidAt(this.position.x - halfW + 0.05, feetY, this.position.z + halfW - 0.05) ||
        this.world.isSolidAt(this.position.x + halfW - 0.05, feetY, this.position.z + halfW - 0.05);
      if (on && this.velocity.y <= 0.01) this.onGround = true;
    }
  }

  resolveAxis(axis) {
    const px = this.position.x;
    const py = this.position.y;
    const pz = this.position.z;
    const half = WIDTH / 2;
    const minX = Math.floor(px - half);
    const maxX = Math.floor(px + half);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + HEIGHT);
    const minZ = Math.floor(pz - half);
    const maxZ = Math.floor(pz + half);

    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          if (!this.world.isSolidAt(x + 0.5, y + 0.5, z + 0.5)) continue;
          const bMinX = x, bMaxX = x + 1;
          const bMinY = y, bMaxY = y + 1;
          const bMinZ = z, bMaxZ = z + 1;
          const pMinX = px - half, pMaxX = px + half;
          const pMinY = py, pMaxY = py + HEIGHT;
          const pMinZ = pz - half, pMaxZ = pz + half;
          if (pMaxX <= bMinX || pMinX >= bMaxX) continue;
          if (pMaxY <= bMinY || pMinY >= bMaxY) continue;
          if (pMaxZ <= bMinZ || pMinZ >= bMaxZ) continue;
          if (axis === "x") {
            if (this.velocity.x > 0) this.position.x = bMinX - half - 0.001;
            else if (this.velocity.x < 0) this.position.x = bMaxX + half + 0.001;
          } else if (axis === "z") {
            if (this.velocity.z > 0) this.position.z = bMinZ - half - 0.001;
            else if (this.velocity.z < 0) this.position.z = bMaxZ + half + 0.001;
          } else {
            if (this.velocity.y > 0) this.position.y = bMinY - HEIGHT - 0.001;
            else if (this.velocity.y < 0) this.position.y = bMaxY + 0.001;
          }
          return true;
        }
      }
    }
    return false;
  }

  syncCamera(hSpeed = 0) {
    const bobY = this.onGround && !this.flying && hSpeed > 0.5 ? Math.sin(this.bob * 2) * 0.045 : 0;
    this.camera.position.set(this.position.x, this.position.y + EYE + bobY, this.position.z);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  look(dx, dy, sensitivity = 0.0022) {
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity;
    const lim = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  getLookDir() {
    const e = new THREE.Euler(this.pitch, this.yaw, 0, "YXZ");
    return new THREE.Vector3(0, 0, -1).applyEuler(e).normalize();
  }

  tryBreak() {
    const hit = this.world.raycast(this.camera.position, this.getLookDir(), 6.5);
    if (!hit) return null;
    const def = BLOCK_DEFS[hit.id];
    if (def?.unbreakable) return { blocked: "bedrock" };
    if (def?.veryHard && this.gamemode === "survival" && toolLevel(this.selectedItemId) < 3) {
      return { blocked: "needIron", need: 3 };
    }
    if (def?.pickLevel && this.gamemode === "survival" && toolLevel(this.selectedItemId) < def.pickLevel) {
      return { blocked: "needPick", need: def.pickLevel };
    }

    this.world.setBlock(hit.x, hit.y, hit.z, Block.AIR);
    sfx.dig();
    const drop = blockDrop(hit.id);
    const result = { x: hit.x, y: hit.y, z: hit.z, id: hit.id, action: "break" };
    if (drop && this.gamemode === "survival") {
      this.inventory.add(drop, 1);
      result.drop = drop;
    }
    // random drops
    if (def?.randomDrop && this.gamemode === "survival") {
      for (const [id, ch] of Object.entries(def.randomDrop)) {
        if (Math.random() < ch) this.inventory.add(Number(id), 1);
      }
    }
    return result;
  }

  tryPlace() {
    const held = this.held;
    if (!held) return null;
    const id = held.id;
    // food
    if (isItemId(id) && foodOf(id) > 0) {
      if (this.eat()) return { action: "eat", id };
      return null;
    }
    // flint and steel → light portal
    if (id === 1131) {
      const hit = this.world.raycast(this.camera.position, this.getLookDir(), 5.5);
      if (!hit) return null;
      const dest = this.dimension === Dim.OVERWORLD ? Dim.NETHER : Dim.OVERWORLD;
      const lit = this.world.lightPortal(hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz, dest);
      if (lit.ok) {
        sfx.portal();
        return { action: "portalLit", dest: lit.dest };
      }
      return null;
    }
    // placeable block
    if (!BLOCK_DEFS[id]) return null;

    const hit = this.world.raycast(this.camera.position, this.getLookDir(), 6.5);
    if (!hit) return null;
    const x = hit.x + hit.nx;
    const y = hit.y + hit.ny;
    const z = hit.z + hit.nz;
    const half = WIDTH / 2;
    const pMinX = this.position.x - half;
    const pMaxX = this.position.x + half;
    const pMinY = this.position.y;
    const pMaxY = this.position.y + HEIGHT;
    const pMinZ = this.position.z - half;
    const pMaxZ = this.position.z + half;
    if (pMaxX > x && pMinX < x + 1 && pMaxY > y && pMinY < y + 1 && pMaxZ > z && pMinZ < z + 1) {
      return { blocked: "notInSelf" };
    }
    const existing = this.world.getBlock(x, y, z);
    if (existing !== Block.AIR && existing !== Block.WATER && existing !== Block.TALL_GRASS && existing !== Block.FLOWER && existing !== Block.PORTAL) {
      return null;
    }
    this.world.setBlock(x, y, z, id);
    sfx.place();
    if (this.gamemode === "survival") {
      held.count -= 1;
      if (held.count <= 0) this.inventory.set(this.hotbarIndex, null);
    }
    return { x, y, z, id, action: "place" };
  }

  /** Attack mob in front. */
  tryAttack(mobs) {
    if (this.attackCd > 0) return null;
    const dir = this.getLookDir();
    const mob = mobs.pick(this.camera.position, dir, 3.6);
    if (!mob) return null;
    this.attackCd = 0.35;
    const dmg = damageOf(this.selectedItemId);
    const died = mob.hurt(dmg);
    sfx.hit();
    sfx.mobHurt();
    // knockback
    const kb = dir.clone().multiplyScalar(0.25);
    mob.position.x += kb.x;
    mob.position.z += kb.z;
    if (died) {
      sfx.mobDie();
      if (this.gamemode === "survival" && mob.def.drops) {
        for (const d of mob.def.drops) {
          if (Math.random() < d.chance) this.inventory.add(d.id, d.count);
        }
      }
      return { action: "kill", type: mob.type };
    }
    return { action: "hit", type: mob.type, dmg };
  }

  /** Right-click a special block (table/furnace/chest). */
  interact(hit) {
    if (!hit) return null;
    const def = BLOCK_DEFS[hit.id];
    if (!def?.interact) return null;
    return { kind: def.interact, x: hit.x, y: hit.y, z: hit.z };
  }
}
