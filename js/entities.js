/** Simple box-model mobs with procedural geometry (no external models). */

import * as THREE from "three";
import { Block } from "./blocks.js";
import { Dim } from "./world.js";

const MOB_TYPES = {
  zombie: {
    color: 0x3d7a3a,
    head: 0x4a8a44,
    hp: 12,
    damage: 3,
    speed: 2.2,
    hostile: true,
    drops: [{ id: 1002, chance: 0.3, count: 1 }],
  },
  skeleton: {
    color: 0xc8c8c0,
    head: 0xd8d8d0,
    hp: 10,
    damage: 4,
    speed: 2.5,
    hostile: true,
    drops: [{ id: 1005, chance: 0.4, count: 1 }],
  },
  pig: {
    color: 0xe8a0a8,
    head: 0xf0b0b8,
    hp: 8,
    damage: 0,
    speed: 1.6,
    hostile: false,
    drops: [{ id: 1007, chance: 0.5, count: 1 }],
  },
  cow: {
    color: 0x5a4030,
    head: 0x6a4a38,
    hp: 10,
    damage: 0,
    speed: 1.5,
    hostile: false,
    drops: [{ id: 1007, chance: 0.4, count: 1 }],
  },
};

function makeBox(w, h, d, color) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.MeshLambertMaterial({ color });
  return new THREE.Mesh(g, m);
}

export class Mob {
  constructor(type, x, y, z) {
    this.type = type;
    this.def = MOB_TYPES[type];
    this.hp = this.def.hp;
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3();
    this.yaw = Math.random() * Math.PI * 2;
    this.onGround = false;
    this.hurtTimer = 0;
    this.attackCd = 0;
    this.wanderTimer = 0;
    this.dead = false;
    this.group = this.buildMesh();
    this.group.position.copy(this.position);
  }

  buildMesh() {
    const g = new THREE.Group();
    const body = makeBox(0.6, 0.7, 0.35, this.def.color);
    body.position.y = 0.7;
    g.add(body);
    const head = makeBox(0.45, 0.45, 0.45, this.def.head);
    head.position.y = 1.25;
    g.add(head);
    const l1 = makeBox(0.18, 0.5, 0.18, this.def.color);
    l1.position.set(-0.18, 0.25, 0);
    g.add(l1);
    const l2 = l1.clone();
    l2.position.x = 0.18;
    g.add(l2);
    const a1 = makeBox(0.15, 0.45, 0.15, this.def.color);
    a1.position.set(-0.38, 0.85, 0);
    g.add(a1);
    const a2 = a1.clone();
    a2.position.x = 0.38;
    g.add(a2);
    // eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: this.def.hostile ? 0xff3333 : 0x222222 });
    const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), eyeMat);
    e1.position.set(-0.1, 1.3, -0.22);
    g.add(e1);
    const e2 = e1.clone();
    e2.position.x = 0.1;
    g.add(e2);
    return g;
  }

  dispose(scene) {
    scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  hurt(dmg) {
    this.hp -= dmg;
    this.hurtTimer = 0.3;
    if (this.hp <= 0) this.dead = true;
    return this.hp <= 0;
  }

  update(dt, world, player, scene) {
    if (this.dead) return;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.wanderTimer -= dt;

    const toPlayer = new THREE.Vector3().subVectors(player.position, this.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    let wishX = 0;
    let wishZ = 0;
    const speed = this.def.speed;

    if (this.def.hostile && dist < 18 && player.dimension === world.activeDim) {
      // chase
      toPlayer.normalize();
      wishX = toPlayer.x;
      wishZ = toPlayer.z;
      this.yaw = Math.atan2(wishX, wishZ);
      if (dist < 1.4 && this.attackCd <= 0) {
        this.attackCd = 0.8;
        return { attack: this.def.damage };
      }
    } else {
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 1.5 + Math.random() * 2.5;
        this.yaw += (Math.random() - 0.5) * 2;
      }
      if (this.wanderTimer > 0.5) {
        wishX = Math.sin(this.yaw) * 0.5;
        wishZ = Math.cos(this.yaw) * 0.5;
      }
    }

    this.velocity.x += (wishX * speed - this.velocity.x) * Math.min(1, 10 * dt);
    this.velocity.z += (wishZ * speed - this.velocity.z) * Math.min(1, 10 * dt);
    this.velocity.y -= 24 * dt;

    // move
    const half = 0.3;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    // ground
    const gy = this.position.y;
    if (world.isSolidAt(this.position.x, gy - 0.05, this.position.z)) {
      this.position.y = Math.floor(gy) + 1;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // simple wall stop
    if (world.isSolidAt(this.position.x, this.position.y + 0.5, this.position.z)) {
      this.position.x -= this.velocity.x * dt;
      this.position.z -= this.velocity.z * dt;
      this.yaw += 1.2;
    }

    // lava / void
    if (world.isInLava(this.position.x, this.position.y + 0.4, this.position.z)) this.hurt(4 * dt * 4);
    if (this.position.y < -10) this.dead = true;

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
    // hurt flash
    const flash = this.hurtTimer > 0;
    this.group.traverse((o) => {
      if (o.material && o.material.emissive) o.material.emissive.setHex(flash ? 0x660000 : 0x000000);
    });

    return null;
  }
}

export class MobManager {
  constructor(scene) {
    this.mobs = [];
    this.scene = scene;
    this.spawnTimer = 0;
  }

  clear() {
    for (const m of this.mobs) m.dispose(this.scene);
    this.mobs = [];
  }

  spawnAround(player, world, isNight) {
    if (this.mobs.length > 24) return;
    const hostile = isNight ? ["zombie", "skeleton"] : ["pig", "cow"];
    const type = hostile[Math.floor(Math.random() * hostile.length)];
    const ang = Math.random() * Math.PI * 2;
    const r = 16 + Math.random() * 18;
    const x = player.position.x + Math.cos(ang) * r;
    const z = player.position.z + Math.sin(ang) * r;
    // find ground
    let y = world.heightAt(Math.floor(x), Math.floor(z)) + 1;
    if (world.activeDim === Dim.END) y = 48;
    if (y < 1 || y > 70) return;
    const mob = new Mob(type, x, y, z);
    this.mobs.push(mob);
    this.scene.add(mob.group);
  }

  update(dt, world, player, isNight) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = isNight ? 2.5 : 4.5;
      this.spawnAround(player, world, isNight);
    }

    const events = [];
    for (const m of this.mobs) {
      if (m.position.distanceTo(player.position) > 64) {
        m.dead = true;
      }
      const ev = m.update(dt, world, player, this.scene);
      if (ev && ev.attack) events.push({ type: "attack", damage: ev.attack, mob: m });
      if (m.dead) {
        events.push({ type: "death", mob: m });
      }
    }

    // cleanup
    this.mobs = this.mobs.filter((m) => {
      if (m.dead) {
        m.dispose(this.scene);
        return false;
      }
      return true;
    });

    return events;
  }

  /** Raycast mobs for attack. Returns nearest mob within range. */
  pick(origin, dir, range = 3.5) {
    let best = null;
    let bestT = range;
    for (const m of this.mobs) {
      // distance from ray to mob center
      const c = m.position.clone().add(new THREE.Vector3(0, 0.7, 0));
      const oc = c.clone().sub(origin);
      const t = oc.dot(dir);
      if (t < 0 || t > bestT) continue;
      const closest = origin.clone().add(dir.clone().multiplyScalar(t));
      if (closest.distanceTo(c) < 0.85) {
        best = m;
        bestT = t;
      }
    }
    return best;
  }
}

export { MOB_TYPES };
