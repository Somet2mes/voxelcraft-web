/** VoxelCraft main entry. */

import * as THREE from "three";
import { World, CHUNK_SIZE } from "./world.js";
import { buildTextureAtlas, Block, blockName, HOTBAR_BLOCKS } from "./blocks.js";
import { createMaterials, buildChunkGeometry } from "./mesher.js";
import { Player } from "./player.js";
import { UI } from "./ui.js";

const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x87ceeb);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9ec6e0, 40, 110);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 220);

// lights
const sun = new THREE.DirectionalLight(0xfff2d6, 1.05);
sun.position.set(40, 80, 20);
scene.add(sun);
const amb = new THREE.AmbientLight(0xb1c7e8, 0.48);
scene.add(amb);
const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x6b5a3a, 0.35);
scene.add(hemi);

// sky dome (simple gradient via large back sphere would need shader — use clear color + fog)

const atlas = buildTextureAtlas(THREE);
const materials = createMaterials(atlas.texture);
const world = new World(20260904);
const player = new Player(world, camera);
const ui = new UI();

// selection highlight
const highlightGeo = new THREE.BoxGeometry(1.001, 1.001, 1.001);
const highlightMat = new THREE.MeshBasicMaterial({
  color: 0x111111,
  wireframe: true,
  transparent: true,
  opacity: 0.55,
  depthTest: true,
});
const highlight = new THREE.Mesh(highlightGeo, highlightMat);
highlight.visible = false;
scene.add(highlight);

// break/place particles
const particleCount = 80;
const particleGeo = new THREE.BufferGeometry();
const particlePos = new Float32Array(particleCount * 3);
const particleVel = [];
const particleLife = new Float32Array(particleCount);
for (let i = 0; i < particleCount; i++) {
  particleVel.push(new THREE.Vector3());
  particleLife[i] = 0;
}
particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
const particleMat = new THREE.PointsMaterial({
  color: 0x8b6914,
  size: 0.12,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.9,
});
const particles = new THREE.Points(particleGeo, particleMat);
particles.frustumCulled = false;
scene.add(particles);

// chunk meshes registry
const chunkGroup = new THREE.Group();
scene.add(chunkGroup);
const meshMap = new Map(); // key -> { solid, liquid }

function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

function disposeMesh(m) {
  if (!m) return;
  chunkGroup.remove(m);
  m.geometry?.dispose();
}

function rebuildChunk(chunk) {
  const k = chunkKey(chunk.cx, chunk.cz);
  const prev = meshMap.get(k);
  if (prev) {
    disposeMesh(prev.solid);
    disposeMesh(prev.liquid);
  }

  const { solid, liquid } = buildChunkGeometry(world, chunk, atlas.tileUV);
  const entry = { solid: null, liquid: null };

  if (solid) {
    const mesh = new THREE.Mesh(solid, materials.opaque);
    mesh.position.set(chunk.cx * CHUNK_SIZE, 0, chunk.cz * CHUNK_SIZE);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    chunkGroup.add(mesh);
    entry.solid = mesh;
  }
  if (liquid) {
    const mesh = new THREE.Mesh(liquid, materials.transparent);
    mesh.position.set(chunk.cx * CHUNK_SIZE, 0, chunk.cz * CHUNK_SIZE);
    mesh.renderOrder = 1;
    chunkGroup.add(mesh);
    entry.liquid = mesh;
  }

  meshMap.set(k, entry);
  chunk.dirty = false;
  chunk.mesh = entry.solid;
  chunk.waterMesh = entry.liquid;
}

function syncMeshes() {
  // remove meshes for unloaded chunks
  for (const [k, entry] of meshMap) {
    const [cx, cz] = k.split(",").map(Number);
    if (!world.getChunk(cx, cz)) {
      disposeMesh(entry.solid);
      disposeMesh(entry.liquid);
      meshMap.delete(k);
    }
  }

  // rebuild dirty / missing
  let built = 0;
  const budget = 10; // per frame
  for (const chunk of world.chunks.values()) {
    if (!chunk.dirty) continue;
    const k = chunkKey(chunk.cx, chunk.cz);
    if (!meshMap.has(k) || chunk.dirty) {
      rebuildChunk(chunk);
      built++;
      if (built >= budget) break;
    }
  }
}

function spawnParticles(x, y, z, colorHex) {
  const color = new THREE.Color(colorHex);
  particleMat.color.lerp(color, 0.65);
  for (let i = 0; i < 12; i++) {
    // find free slot
    let slot = -1;
    for (let j = 0; j < particleCount; j++) {
      if (particleLife[j] <= 0) {
        slot = j;
        break;
      }
    }
    if (slot < 0) break;
    particleLife[slot] = 0.45 + Math.random() * 0.35;
    particlePos[slot * 3] = x + 0.5 + (Math.random() - 0.5) * 0.7;
    particlePos[slot * 3 + 1] = y + 0.5 + (Math.random() - 0.5) * 0.7;
    particlePos[slot * 3 + 2] = z + 0.5 + (Math.random() - 0.5) * 0.7;
    particleVel[slot].set(
      (Math.random() - 0.5) * 3,
      2 + Math.random() * 2.5,
      (Math.random() - 0.5) * 3
    );
  }
}

function updateParticles(dt) {
  let any = false;
  for (let i = 0; i < particleCount; i++) {
    if (particleLife[i] <= 0) {
      particlePos[i * 3 + 1] = -999;
      continue;
    }
    any = true;
    particleLife[i] -= dt;
    particleVel[i].y -= 18 * dt;
    particlePos[i * 3] += particleVel[i].x * dt;
    particlePos[i * 3 + 1] += particleVel[i].y * dt;
    particlePos[i * 3 + 2] += particleVel[i].z * dt;
  }
  particleGeo.attributes.position.needsUpdate = true;
  particles.visible = any;
}

// day cycle (slow)
let timeOfDay = 0.28; // 0..1, 0.25 = noon-ish start
function updateSky(dt) {
  timeOfDay = (timeOfDay + dt * 0.0035) % 1;
  const angle = timeOfDay * Math.PI * 2;
  const sunH = Math.sin(angle);
  const daylight = Math.max(0.12, Math.min(1, sunH * 0.85 + 0.35));
  sun.position.set(Math.cos(angle) * 80, sunH * 90 + 10, 25);
  sun.intensity = 0.25 + daylight * 0.95;
  amb.intensity = 0.22 + daylight * 0.35;

  const day = new THREE.Color(0x87ceeb);
  const dusk = new THREE.Color(0xe8a060);
  const night = new THREE.Color(0x0b1020);
  const sky = new THREE.Color();
  if (sunH > 0.15) sky.copy(day);
  else if (sunH > -0.15) sky.copy(dusk).lerp(day, (sunH + 0.15) / 0.3);
  else sky.copy(night).lerp(dusk, (sunH + 0.4) / 0.25);
  sky.multiplyScalar(0.55 + daylight * 0.55);
  renderer.setClearColor(sky);
  scene.fog.color.copy(sky);
}

// input
const overlay = document.getElementById("overlay");
const btnStart = document.getElementById("btn-start");
let pointerLocked = false;
let gameStarted = false;

function requestLock() {
  canvas.requestPointerLock?.();
}

btnStart.addEventListener("click", () => {
  requestLock();
});

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) requestLock();
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === canvas;
  if (pointerLocked) gameStarted = true;
  ui.showHud(pointerLocked);
  if (!pointerLocked) {
    player.keys.clear();
  }
});

document.addEventListener("mousemove", (e) => {
  if (!pointerLocked) return;
  player.look(e.movementX, e.movementY);
});

const mouseDown = { left: false, right: false };

canvas.addEventListener("mousedown", (e) => {
  if (!pointerLocked) {
    requestLock();
    return;
  }
  if (e.button === 0) {
    mouseDown.left = true;
    actBreak();
  } else if (e.button === 2) {
    mouseDown.right = true;
    actPlace();
  }
});

window.addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseDown.left = false;
  if (e.button === 2) mouseDown.right = false;
});

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

let breakCooldown = 0;
let placeCooldown = 0;

function actBreak() {
  const r = player.tryBreak(world);
  if (!r) return;
  if (r.blocked) {
    ui.toast("基岩不可破坏");
    return;
  }
  spawnParticles(r.x, r.y, r.z, 0x8b6914);
  ui.toast(`破坏 ${blockName(r.id)}`);
}

function actPlace() {
  const r = player.tryPlace(world);
  if (!r) return;
  if (r.blocked) {
    ui.toast("不能放在自己身上");
    return;
  }
  ui.toast(`放置 ${blockName(r.id)}`);
}

window.addEventListener("keydown", (e) => {
  if (!pointerLocked) return;
  if (e.code === "F3") {
    e.preventDefault();
    ui.toggleDebug();
    return;
  }
  if (e.code === "Tab") e.preventDefault();

  const hotbarNum = e.code.match(/^Digit([1-9])$/);
  if (hotbarNum) {
    const i = Number(hotbarNum[1]) - 1;
    player.hotbarIndex = i;
    ui.setHotbarIndex(i);
    ui.toast(blockName(player.selectedBlock));
    return;
  }

  const ev = player.handleKey(e.code, true);
  if (ev === "flying") {
    ui.toast(player.flying ? "飞行模式：开" : "飞行模式：关");
  }
  if (["Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) e.preventDefault();
});

window.addEventListener("keyup", (e) => {
  player.handleKey(e.code, false);
});

window.addEventListener(
  "wheel",
  (e) => {
    if (!pointerLocked) return;
    const dir = Math.sign(e.deltaY);
    const n = HOTBAR_BLOCKS.length;
    player.hotbarIndex = (player.hotbarIndex + dir + n) % n;
    ui.setHotbarIndex(player.hotbarIndex);
    ui.toast(blockName(player.selectedBlock));
  },
  { passive: true }
);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// select highlight update
function updateHighlight() {
  if (!pointerLocked) {
    highlight.visible = false;
    return;
  }
  const dir = player.getLookDir();
  const hit = world.raycast(camera.position, dir, 6.5);
  if (!hit) {
    highlight.visible = false;
    return;
  }
  highlight.visible = true;
  highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
}

// init
ui.buildHotbar((i) => {
  player.hotbarIndex = i;
  ui.setHotbarIndex(i);
  if (pointerLocked) ui.toast(blockName(player.selectedBlock));
});

// find spawn first, then generate chunks around it
const spawn = world.findSpawn(0, 0);
player.position.set(spawn.x, spawn.y, spawn.z);
player.velocity.set(0, 0, 0);
world.update(player.position.x, player.position.z);
for (const chunk of world.chunks.values()) rebuildChunk(chunk);
player.spawnAtSurface();
player.pitch = -0.2;
player.yaw = 0.6;
player.syncCamera(0);

// FPS
let frames = 0;
let fps = 60;
let fpsTimer = 0;
let last = performance.now();

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  frames++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    fps = frames / fpsTimer;
    frames = 0;
    fpsTimer = 0;
  }

  // world streaming
  world.update(player.position.x, player.position.z);
  syncMeshes();

  if (gameStarted) {
    player.update(dt);

    if (pointerLocked) {
      breakCooldown -= dt;
      placeCooldown -= dt;
      if (mouseDown.left && breakCooldown <= 0) {
        actBreak();
        breakCooldown = 0.22;
      }
      if (mouseDown.right && placeCooldown <= 0) {
        actPlace();
        placeCooldown = 0.18;
      }
    }
  } else {
    player.syncCamera(0);
  }

  updateHighlight();
  updateParticles(dt);
  updateSky(dt);

  ui.updateDebug(
    `VoxelCraft  FPS ${fps.toFixed(0)}
XYZ ${player.position.x.toFixed(1)} ${player.position.y.toFixed(1)} ${player.position.z.toFixed(1)}
区块 ${meshMap.size}  模式 ${player.flying ? "飞行" : player.inWater ? "游泳" : "行走"}
种子 ${world.seed}  选中 ${blockName(player.selectedBlock)}`
  );

  renderer.render(scene, camera);
}

requestAnimationFrame(loop);

// expose for debugging
window.__voxel = {
  world,
  player,
  scene,
  renderer,
  start: () => {
    gameStarted = true;
  },
};
