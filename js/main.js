/** VoxelCraft main — multi-dimension survival sandbox. */

import * as THREE from "three";
import { World, Dim, DIM_NAMES, CHUNK_SIZE, SEA_LEVEL } from "./world.js";
import { buildTextureAtlas, Block, blockName, DEFAULT_HOTBAR } from "./blocks.js";
import { createMaterials, buildChunkGeometry } from "./mesher.js";
import { Player } from "./player.js";
import { UI } from "./ui.js";
import { Weather, WeatherState } from "./weather.js";
import { MobManager } from "./entities.js";
import { t, getLang, setLang, toggleLang } from "./i18n.js";
import { initAudio, sfx } from "./audio.js";
import { listSlots, saveSlot, loadSlot, serializeGame, applySave } from "./save.js";
import { itemName } from "./items.js";
import { biomeName } from "./biomes.js";
import { smeltResult } from "./recipes.js";
import { itemFuelTime } from "./items.js";

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
scene.fog = new THREE.Fog(0x9ec6e0, 36, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 220);

const sun = new THREE.DirectionalLight(0xfff2d6, 1.05);
sun.position.set(40, 80, 20);
scene.add(sun);
const amb = new THREE.AmbientLight(0xb1c7e8, 0.48);
scene.add(amb);
const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x6b5a3a, 0.35);
scene.add(hemi);

const atlas = buildTextureAtlas(THREE);
const materials = createMaterials(atlas.texture);
let world = new World(Date.now() % 100000);
let player = new Player(world, camera);
const ui = new UI();
const weather = new Weather(scene);
const mobs = new MobManager(scene);

const highlight = new THREE.Mesh(
  new THREE.BoxGeometry(1.001, 1.001, 1.001),
  new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true, transparent: true, opacity: 0.55 })
);
highlight.visible = false;
scene.add(highlight);

const particleCount = 100;
const particleGeo = new THREE.BufferGeometry();
const particlePos = new Float32Array(particleCount * 3);
const particleVel = [];
const particleLife = new Float32Array(particleCount);
for (let i = 0; i < particleCount; i++) particleVel.push(new THREE.Vector3());
particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
const particleMat = new THREE.PointsMaterial({ color: 0x8b6914, size: 0.12, transparent: true, opacity: 0.9 });
const particles = new THREE.Points(particleGeo, particleMat);
particles.frustumCulled = false;
scene.add(particles);

const chunkGroup = new THREE.Group();
scene.add(chunkGroup);
const meshMap = new Map();

let pointerLocked = false;
let gameStarted = false;
let gamemode = "survival";
let activeSlot = 1;
let timeOfDay = 0.3;
let mouseDown = { left: false, right: false };
let breakCooldown = 0;
let placeCooldown = 0;
let portalToastCd = 0;
let autoSaveTimer = 20;
let uiOpen = false;

function chunkKey(cx, cz) {
  return `${world.activeDim}:${cx},${cz}`;
}

function disposeMesh(m) {
  if (!m) return;
  chunkGroup.remove(m);
  m.geometry?.dispose();
}

function clearAllMeshes() {
  for (const [, e] of meshMap) {
    disposeMesh(e.solid);
    disposeMesh(e.liquid);
  }
  meshMap.clear();
}

function rebuildChunk(chunk) {
  const k = chunkKey(chunk.cx, chunk.cz);
  const prev = meshMap.get(k);
  if (prev) {
    disposeMesh(prev.solid);
    disposeMesh(prev.liquid);
  }
  const { solid, liquid } = buildChunkGeometry(world, chunk, atlas.tileUV);
  const entry = {
    solid: null,
    liquid: null,
    dim: world.activeDim,
    cx: chunk.cx,
    cz: chunk.cz,
  };
  if (solid) {
    const mesh = new THREE.Mesh(solid, materials.opaque);
    mesh.position.set(chunk.cx * CHUNK_SIZE, 0, chunk.cz * CHUNK_SIZE);
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
  const dimId = world.activeDim;
  for (const [k, entry] of [...meshMap]) {
    if (entry.dim !== dimId || !world.getChunk(entry.cx, entry.cz)) {
      disposeMesh(entry.solid);
      disposeMesh(entry.liquid);
      meshMap.delete(k);
    }
  }
  let built = 0;
  for (const chunk of world.chunks.values()) {
    const k = chunkKey(chunk.cx, chunk.cz);
    if (!chunk.dirty && meshMap.has(k)) continue;
    if (built >= 12) break;
    rebuildChunk(chunk);
    built++;
  }
}

function spawnParticles(x, y, z, color) {
  particleMat.color.lerp(new THREE.Color(color), 0.5);
  for (let i = 0; i < 10; i++) {
    let slot = -1;
    for (let j = 0; j < particleCount; j++)
      if (particleLife[j] <= 0) {
        slot = j;
        break;
      }
    if (slot < 0) break;
    particleLife[slot] = 0.4 + Math.random() * 0.3;
    particlePos[slot * 3] = x + 0.5 + (Math.random() - 0.5) * 0.7;
    particlePos[slot * 3 + 1] = y + 0.5 + (Math.random() - 0.5) * 0.7;
    particlePos[slot * 3 + 2] = z + 0.5 + (Math.random() - 0.5) * 0.7;
    particleVel[slot].set((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3);
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
    particleVel[i].y -= 16 * dt;
    particlePos[i * 3] += particleVel[i].x * dt;
    particlePos[i * 3 + 1] += particleVel[i].y * dt;
    particlePos[i * 3 + 2] += particleVel[i].z * dt;
  }
  particleGeo.attributes.position.needsUpdate = true;
  particles.visible = any;
}

function isNight() {
  const sunH = Math.sin(timeOfDay * Math.PI * 2);
  return sunH < 0;
}

function updateSky(dt) {
  timeOfDay = (timeOfDay + dt * 0.004) % 1;
  const angle = timeOfDay * Math.PI * 2;
  const sunH = Math.sin(angle);
  let daylight = Math.max(0.12, Math.min(1, sunH * 0.85 + 0.35));

  if (world.activeDim === Dim.NETHER) {
    daylight = 0.55;
    renderer.setClearColor(new THREE.Color(0x2a0a0a));
    scene.fog.color.set(0x2a0a0a);
    scene.fog.near = 16;
    scene.fog.far = 60;
    sun.intensity = 0.25;
    amb.intensity = 0.35;
    return;
  }
  if (world.activeDim === Dim.END) {
    daylight = 0.7;
    renderer.setClearColor(new THREE.Color(0x0a0a18));
    scene.fog.color.set(0x0a0a18);
    scene.fog.near = 20;
    scene.fog.far = 80;
    sun.intensity = 0.4;
    amb.intensity = 0.4;
    return;
  }

  scene.fog.near = 36;
  scene.fog.far = 100;
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
  const colored = weather.applySky(sky, sunH);
  renderer.setClearColor(colored);
  scene.fog.color.copy(colored);
}

function requestLock() {
  canvas.requestPointerLock?.();
}

function openUI(mode, furnace) {
  uiOpen = true;
  document.exitPointerLock?.();
  sfx.openUI();
  const wrap = ui.openInventory(player, mode, furnace);
  wrap.addEventListener(
    "close-inv",
    () => {
      uiOpen = false;
      ui.refreshHotbar(player.inventory, player.hotbarIndex);
      requestLock();
    },
    { once: true }
  );
  // also close on overlay click? no
}

function closeUIAndRelock() {
  ui.finalizeCraft(player);
  ui.closePanel();
  uiOpen = false;
  ui.refreshHotbar(player.inventory, player.hotbarIndex);
  requestLock();
}

function switchDimension(dest) {
  clearAllMeshes();
  mobs.clear();
  world.setActiveDim(dest);
  player.dimension = dest;
  if (dest === Dim.NETHER) {
    player.position.set(0.5, world.findSpawn().y, 0.5);
    // safer: height
    const h = world.heightAt(0, 0);
    player.position.set(0.5, Math.max(h + 2, 20), 0.5);
  } else if (dest === Dim.END) {
    player.position.set(0.5, 48, 0.5);
  } else {
    const s = world.findSpawn(0, 0);
    player.position.set(s.x, s.y, s.z);
  }
  player.velocity.set(0, 0, 0);
  player.syncCamera();
  world.update(player.position.x, player.position.z);
  for (const c of world.chunks.values()) rebuildChunk(c);
  sfx.portal();
  ui.toast(DIM_NAMES[dest][getLang()]);
}

function doSave() {
  const data = serializeGame({
    world,
    player,
    timeOfDay,
    weather: weather.state,
    gamemode,
    slotName: `World ${activeSlot}`,
  });
  saveSlot(activeSlot, data);
  ui.toast(t("saved"));
}

function loadGame(slot) {
  const save = loadSlot(slot);
  if (!save) return false;
  activeSlot = slot;
  gamemode = save.gamemode || "survival";
  world = new World(save.seed || 1);
  player = new Player(world, camera);
  player.gamemode = gamemode;
  applySave(world, player, save);
  timeOfDay = save.timeOfDay ?? 0.3;
  weather.set(save.weather || 0);
  clearAllMeshes();
  mobs.clear();
  world.setActiveDim(player.dimension || 0);
  world.update(player.position.x, player.position.z);
  for (const c of world.chunks.values()) rebuildChunk(c);
  ui.buildHotbar(player.inventory, onSelectHotbar);
  ui.refreshHotbar(player.inventory, player.hotbarIndex);
  return true;
}

function newGame(slot, seed) {
  activeSlot = slot;
  gamemode = "survival";
  world = new World(seed ?? (Date.now() % 100000));
  player = new Player(world, camera);
  player.gamemode = gamemode;
  player.setupInventory(gamemode);
  timeOfDay = 0.3;
  weather.set(WeatherState.CLEAR);
  clearAllMeshes();
  mobs.clear();
  world.setActiveDim(Dim.OVERWORLD);
  player.dimension = Dim.OVERWORLD;
  player.spawnAtSurface();
  world.update(player.position.x, player.position.z);
  for (const c of world.chunks.values()) rebuildChunk(c);
  ui.buildHotbar(player.inventory, onSelectHotbar);
  ui.refreshHotbar(player.inventory, player.hotbarIndex);
}

function onSelectHotbar(i) {
  player.hotbarIndex = i;
  ui.setHotbarIndex(i);
  const s = player.inventory.get(i);
  if (s) ui.toast(itemName(s.id, getLang()));
  sfx.pick();
}

function actBreak() {
  if (uiOpen || player.dead) return;
  // try attack first if mob closer
  const attacked = player.tryAttack(mobs);
  if (attacked) {
    ui.toast(attacked.action === "kill" ? `${t("killed")} ${t("mob" + cap(attacked.type))}` : t("attack"));
    return;
  }
  const r = player.tryBreak();
  if (!r) return;
  if (r.blocked === "bedrock") {
    ui.toast(t("bedrock"));
    return;
  }
  if (r.blocked) {
    ui.toast(`${t("needPick") || "需要更好工具"}`);
    return;
  }
  spawnParticles(r.x, r.y, r.z, 0x8b6914);
  ui.toast(`${t("broke")} ${blockName(r.id, getLang())}`);
  ui.refreshHotbar(player.inventory, player.hotbarIndex);
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function actPlace() {
  if (uiOpen || player.dead) return;
  const hit = world.raycast(camera.position, player.getLookDir(), 6.5);
  const inter = player.interact(hit);
  if (inter) {
    openUI(inter.kind === "craft" ? "table" : inter.kind);
    return;
  }
  const r = player.tryPlace();
  if (!r) return;
  if (r.blocked === "notInSelf") {
    ui.toast(t("notInSelf"));
    return;
  }
  if (r.action === "portalLit") {
    ui.toast(t("portalLit"));
    return;
  }
  if (r.action === "eat") {
    ui.toast(t("ate"));
    ui.refreshHotbar(player.inventory, player.hotbarIndex);
    return;
  }
  if (r.action === "place") {
    ui.toast(`${t("placed")} ${blockName(r.id, getLang())}`);
    ui.refreshHotbar(player.inventory, player.hotbarIndex);
  }
}

// input
document.getElementById("overlay").addEventListener("click", (e) => {
  if (e.target.id === "overlay" || e.target.closest("#btn-start")) requestLock();
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === canvas;
  if (pointerLocked) {
    gameStarted = true;
    uiOpen = false;
    ui.showHud(true);
  } else {
    player.keys.clear();
    if (gameStarted && !uiOpen && !player.dead) ui.showHud(false);
  }
});

document.addEventListener("mousemove", (e) => {
  if (!pointerLocked) return;
  player.look(e.movementX, e.movementY);
});

canvas.addEventListener("mousedown", (e) => {
  if (!pointerLocked) {
    if (gameStarted && !uiOpen) requestLock();
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

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyL") {
    toggleLang();
    refreshOverlay();
    ui.toast(getLang() === "zh" ? "中文" : "English");
    return;
  }
  if (uiOpen) {
    if (e.code === "Escape" || e.code === "KeyE") {
      e.preventDefault();
      closeUIAndRelock();
    }
    return;
  }
  if (!pointerLocked && !player.dead) return;
  if (e.code === "F3") {
    e.preventDefault();
    ui.toggleDebug();
    return;
  }
  if (e.code === "KeyE") {
    e.preventDefault();
    if (uiOpen) closeUIAndRelock();
    else openUI("craft");
    return;
  }
  if (e.code === "KeyO" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    doSave();
    return;
  }
  if (e.code === "F5" && gamemode === "creative") {
    gamemode = "survival";
    player.gamemode = "survival";
    player.flying = false;
    ui.toast(t("survival"));
    return;
  }
  if (e.code === "F4" && gamemode === "creative") {
    gamemode = "survival";
    ui.toast(t("survival"));
    return;
  }
  // creative toggle
  if (e.code === "KeyG") {
    gamemode = gamemode === "creative" ? "survival" : "creative";
    player.gamemode = gamemode;
    ui.toast(gamemode === "creative" ? t("creative") : t("survival"));
    return;
  }
  if (e.code === "KeyP") {
    doSave();
    return;
  }

  const hot = e.code.match(/^Digit([1-9])$/);
  if (hot) {
    onSelectHotbar(Number(hot[1]) - 1);
    return;
  }
  const ev = player.handleKey(e.code, true);
  if (ev === "flying") ui.toast(player.flying ? t("flying") : t("walking"));
  if (["Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) e.preventDefault();
});
window.addEventListener("keyup", (e) => player.handleKey(e.code, false));

window.addEventListener(
  "wheel",
  (e) => {
    if (!pointerLocked || uiOpen) return;
    const n = 9;
    player.hotbarIndex = (player.hotbarIndex + Math.sign(e.deltaY) + n) % n;
    onSelectHotbar(player.hotbarIndex);
  },
  { passive: true }
);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateHighlight() {
  if (!pointerLocked || uiOpen || player.dead) {
    highlight.visible = false;
    return;
  }
  const hit = world.raycast(camera.position, player.getLookDir(), 6.5);
  if (!hit) {
    highlight.visible = false;
    return;
  }
  highlight.visible = true;
  highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
}

function updateFurnaces(dt) {
  const f = player.openFurnace;
  if (!f || !uiOpen) return;
  const result = f.input ? smeltResult(f.input.id) : null;
  if (result && f.burn > 0) {
    f.burn -= dt;
    f.progress = (f.progress || 0) + dt / 4;
    if (f.progress >= 1) {
      f.progress = 0;
      f.input.count -= 1;
      if (f.input.count <= 0) f.input = null;
      if (!f.output) f.output = { id: result.id, count: result.count };
      else if (f.output.id === result.id) f.output.count += result.count;
      sfx.smelt();
    }
  } else if (result && f.fuel && itemFuelTime(f.fuel.id) > 0) {
    f.burn = itemFuelTime(f.fuel.id);
    f.fuel.count -= 1;
    if (f.fuel.count <= 0) f.fuel = null;
  }
}

function refreshOverlay() {
  document.documentElement.lang = getLang() === "zh" ? "zh-CN" : "en";
  document.title = t("title");
  ui.rebuildStartOverlay({});
  ui.bindStartOverlay({
    onLang: refreshOverlay,
    onPlay: () => {
      const slots = listSlots();
      const cont = slots.find((s) => s.exists);
      if (cont && !loadGame(cont.id)) newGame(cont.id);
      else if (!cont) newGame(1);
      initAudio();
      requestLock();
    },
    onNew: () => {
      newGame(1, Date.now() % 100000);
      initAudio();
      requestLock();
    },
    onPlaySlot: (slot) => {
      if (loadSlot(slot)) loadGame(slot);
      else newGame(slot);
      initAudio();
      requestLock();
    },
    onLoad: (slot) => {
      if (loadGame(slot)) {
        initAudio();
        requestLock();
      }
    },
    onRefresh: refreshOverlay,
  });
}

// boot
refreshOverlay();
world.update(8, 8);
player.spawnAtSurface();
world.update(player.position.x, player.position.z);
for (const c of world.chunks.values()) rebuildChunk(c);
ui.buildHotbar(player.inventory, onSelectHotbar);

let frames = 0,
  fps = 60,
  fpsTimer = 0,
  last = performance.now();

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

  if (gameStarted && !uiOpen) {
    world.update(player.position.x, player.position.z);
    syncMeshes();
    player.update(dt);

    breakCooldown -= dt;
    placeCooldown -= dt;
    if (pointerLocked && mouseDown.left && breakCooldown <= 0) {
      actBreak();
      breakCooldown = 0.22;
    }
    if (pointerLocked && mouseDown.right && placeCooldown <= 0) {
      actPlace();
      placeCooldown = 0.18;
    }

    // mobs
    const events = mobs.update(dt, world, player, isNight());
    for (const ev of events) {
      if (ev.type === "attack") player.takeDamage(ev.damage);
      if (ev.type === "death") {
        // already dead
      }
    }

    // portal check
    portalToastCd -= dt;
    if (player.inPortal && player.portalCd <= 0) {
      player.portalCd = 4;
      const dest = player.dimension === Dim.OVERWORLD ? Dim.NETHER : Dim.OVERWORLD;
      ui.toast(t("portalEnter"));
      setTimeout(() => switchDimension(dest), 800);
    }

    autoSaveTimer -= dt;
    if (autoSaveTimer <= 0) {
      autoSaveTimer = 30;
      doSave();
    }
  } else if (gameStarted) {
    // ui open — still stream chunks slowly
    world.update(player.position.x, player.position.z);
    syncMeshes();
    updateFurnaces(dt);
  } else {
    player.syncCamera(0);
  }

  if (player.dead && !ui.isPanelOpen()) {
    document.exitPointerLock?.();
    ui.showDeath(() => {
      player.respawn();
      clearAllMeshes();
      world.update(player.position.x, player.position.z);
      for (const c of world.chunks.values()) rebuildChunk(c);
      requestLock();
    });
  }

  updateHighlight();
  updateParticles(dt);
  updateSky(dt);
  weather.update(dt, player, world, timeOfDay);

  ui.updateVitals(player.health, player.hunger);
  ui.updateDebug(
    `VoxelCraft  ${fps.toFixed(0)} ${t("fps")}
${t("pos")} ${player.position.x.toFixed(1)} ${player.position.y.toFixed(1)} ${player.position.z.toFixed(1)}
${t("dim")} ${DIM_NAMES[world.activeDim][getLang()]}
${t("weather")} ${weather.label(getLang())}  ${t("mode")} ${player.gamemode === "creative" ? t("creative") : t("survival")}
${t("health")} ${Math.ceil(player.health)}/20  ${t("hunger")} ${Math.ceil(player.hunger)}/20
${t("seed")} ${world.seed}  ${t("chunks")} ${meshMap.size}`
  );

  renderer.render(scene, camera);
}
requestAnimationFrame(loop);

window.__voxel = {
  get world() {
    return world;
  },
  get player() {
    return player;
  },
  scene,
  renderer,
  weather,
  mobs,
  switchDimension,
  newGame,
  loadGame,
  doSave,
  start: () => {
    gameStarted = true;
  },
};
