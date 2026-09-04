/** First-person player: look, physics, collision, interaction. */

import * as THREE from "three";
import { Block, HOTBAR_BLOCKS } from "./blocks.js";

const WIDTH = 0.6;
const HEIGHT = 1.8;
const EYE = 1.62;
const GRAVITY = 28;
const JUMP = 9.2;
const WALK = 4.8;
const SPRINT = 7.6;
const SNEAK = 2.2;
const FLY = 10;
const FLY_SPRINT = 22;
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
    this.sprint = false;
    this.sneak = false;
    this.hotbarIndex = 0;
    this.keys = new Set();
    this.bob = 0;
    this.lastSpace = 0;
  }

  get selectedBlock() {
    return HOTBAR_BLOCKS[this.hotbarIndex] ?? Block.GRASS;
  }

  spawnAtSurface() {
    const s = this.world.findSpawn(0, 0);
    this.position.set(s.x, s.y, s.z);
    this.velocity.set(0, 0, 0);
    this.syncCamera();
  }

  handleKey(code, down) {
    if (down) this.keys.add(code);
    else this.keys.delete(code);

    if (down && code === "KeyF") {
      this.flying = !this.flying;
      this.velocity.y = 0;
      return "flying";
    }
    if (down && code === "Space") {
      const now = performance.now();
      if (now - this.lastSpace < 280) {
        this.flying = !this.flying;
        this.velocity.y = 0;
      }
      this.lastSpace = now;
    }
    return null;
  }

  update(dt) {
    const fwd = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    const strafe = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    this.sprint = this.keys.has("ControlLeft") || this.keys.has("ControlRight");
    this.sneak = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");

    // water check at feet + eye
    this.inWater =
      this.world.isInWater(this.position.x, this.position.y + 0.4, this.position.z) ||
      this.world.isInWater(this.position.x, this.position.y + 1.2, this.position.z);

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // camera looks along -Z at yaw=0; forward=(-sin,0,-cos), right=(cos,0,-sin)
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

    const accel = this.flying ? 18 : this.onGround ? 40 : 12;
    this.velocity.x += (wishX * speed - this.velocity.x) * Math.min(1, accel * dt);
    this.velocity.z += (wishZ * speed - this.velocity.z) * Math.min(1, accel * dt);

    if (this.flying) {
      const up = (this.keys.has("Space") ? 1 : 0) - (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") ? 1 : 0);
      const targetY = up * speed;
      this.velocity.y += (targetY - this.velocity.y) * Math.min(1, accel * dt);
    } else {
      if (this.inWater) {
        this.velocity.y -= GRAVITY * 0.35 * dt;
        if (this.keys.has("Space")) this.velocity.y += GRAVITY * 0.75 * dt;
        this.velocity.y *= WATER_DRAG;
        if (this.velocity.y < -8) this.velocity.y = -8;
      } else {
        this.velocity.y -= GRAVITY * dt;
        if (this.keys.has("Space") && this.onGround) {
          this.velocity.y = JUMP;
          this.onGround = false;
        }
      }
      if (this.velocity.y < -TERMINAL) this.velocity.y = TERMINAL;
    }

    this.moveWithCollision(dt);

    // view bob
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.onGround && hSpeed > 0.5 && !this.flying) {
      this.bob += dt * hSpeed * 1.6;
    } else {
      this.bob += dt * 0.5;
    }

    this.syncCamera(hSpeed);
  }

  moveWithCollision(dt) {
    const half = { x: WIDTH / 2, z: WIDTH / 2 };
    const maxY = HEIGHT;

    // move axis by axis
    const axes = ["x", "z", "y"];
    for (const axis of axes) {
      const delta = this.velocity[axis] * dt;
      if (delta === 0) continue;
      this.position[axis] += delta;
      if (this.resolveAxis(axis, axis === "y" ? maxY : half[axis])) {
        this.velocity[axis] = 0;
        if (axis === "y" && delta < 0) this.onGround = true;
        if (axis === "y" && delta > 0) {
          // head bump
        }
      } else if (axis === "y") {
        if (delta < 0) this.onGround = false;
      }
    }

    // ground snap probe
    if (!this.flying) {
      const feetY = this.position.y - 0.05;
      const on =
        this.world.isSolidAt(this.position.x - half.x + 0.05, feetY, this.position.z - half.z + 0.05) ||
        this.world.isSolidAt(this.position.x + half.x - 0.05, feetY, this.position.z - half.z + 0.05) ||
        this.world.isSolidAt(this.position.x - half.x + 0.05, feetY, this.position.z + half.z - 0.05) ||
        this.world.isSolidAt(this.position.x + half.x - 0.05, feetY, this.position.z + half.z - 0.05);
      if (on && this.velocity.y <= 0.01) this.onGround = true;
    }

    // prevent falling out
    if (this.position.y < -20) {
      this.spawnAtSurface();
    }
  }

  resolveAxis(axis, expand) {
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
          // AABB overlap?
          const bMinX = x;
          const bMaxX = x + 1;
          const bMinY = y;
          const bMaxY = y + 1;
          const bMinZ = z;
          const bMaxZ = z + 1;

          const pMinX = px - half;
          const pMaxX = px + half;
          const pMinY = py;
          const pMaxY = py + HEIGHT;
          const pMinZ = pz - half;
          const pMaxZ = pz + half;

          if (pMaxX <= bMinX || pMinX >= bMaxX) continue;
          if (pMaxY <= bMinY || pMinY >= bMaxY) continue;
          if (pMaxZ <= bMinZ || pMinZ >= bMaxZ) continue;

          // resolve
          if (axis === "x") {
            if (this.velocity.x > 0) this.position.x = bMinX - half - 0.001;
            else if (this.velocity.x < 0) this.position.x = bMaxX + half + 0.001;
            else this.position.x = px;
          } else if (axis === "z") {
            if (this.velocity.z > 0) this.position.z = bMinZ - half - 0.001;
            else if (this.velocity.z < 0) this.position.z = bMaxZ + half + 0.001;
            else this.position.z = pz;
          } else {
            if (this.velocity.y > 0) this.position.y = bMinY - HEIGHT - 0.001;
            else if (this.velocity.y < 0) this.position.y = bMaxY + 0.001;
            else this.position.y = py;
          }
          return true;
        }
      }
    }
    return false;
  }

  syncCamera(hSpeed = 0) {
    const bobY = this.onGround && !this.flying && hSpeed > 0.5 ? Math.sin(this.bob * 2) * 0.045 : 0;
    const bobX = this.onGround && !this.flying && hSpeed > 0.5 ? Math.cos(this.bob) * 0.03 : 0;
    this.camera.position.set(
      this.position.x + bobX * Math.cos(this.yaw),
      this.position.y + EYE + bobY,
      this.position.z + bobX * Math.sin(this.yaw)
    );
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.pitch = this.pitch;
    this.camera.rotation.x = this.pitch;
  }

  look(dx, dy, sensitivity = 0.0022) {
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity;
    const lim = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  tryBreak(world) {
    const dir = this.getLookDir();
    const hit = this.world.raycast(this.camera.position, dir, 6.5);
    if (!hit) return null;
    if (hit.id === Block.BEDROCK) return { blocked: true };
    world.setBlock(hit.x, hit.y, hit.z, Block.AIR);
    return { x: hit.x, y: hit.y, z: hit.z, id: hit.id, action: "break" };
  }

  tryPlace(world) {
    const dir = this.getLookDir();
    const hit = this.world.raycast(this.camera.position, dir, 6.5);
    if (!hit) return null;
    const x = hit.x + hit.nx;
    const y = hit.y + hit.ny;
    const z = hit.z + hit.nz;
    // don't place inside player
    const half = WIDTH / 2;
    const pMinX = this.position.x - half;
    const pMaxX = this.position.x + half;
    const pMinY = this.position.y;
    const pMaxY = this.position.y + HEIGHT;
    const pMinZ = this.position.z - half;
    const pMaxZ = this.position.z + half;
    if (pMaxX > x && pMinX < x + 1 && pMaxY > y && pMinY < y + 1 && pMaxZ > z && pMinZ < z + 1) {
      return { blocked: true, reason: "玩家位置" };
    }
    const existing = world.getBlock(x, y, z);
    if (existing !== Block.AIR && existing !== Block.WATER) return null;
    world.setBlock(x, y, z, this.selectedBlock);
    return { x, y, z, id: this.selectedBlock, action: "place" };
  }

  getLookDir() {
    // camera looks down -Z with yaw/pitch; match three.js
    const e = new THREE.Euler(this.pitch, this.yaw, 0, "YXZ");
    return new THREE.Vector3(0, 0, -1).applyEuler(e).normalize();
  }
}
