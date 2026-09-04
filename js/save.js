/** Multi-slot world saves in localStorage (RLE, modified chunks only). */

const KEY = "voxelcraft_saves_v2";
const MAX_SLOTS = 3;

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(obj) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
    return true;
  } catch (e) {
    console.warn("save quota", e);
    return false;
  }
}

/** Run-length encode Uint8Array → [val,count,...] */
function rleEncode(arr) {
  const out = [];
  let i = 0;
  while (i < arr.length) {
    const v = arr[i];
    let n = 1;
    while (i + n < arr.length && arr[i + n] === v && n < 65535) n++;
    out.push(v, n);
    i += n;
  }
  return out;
}

function rleDecode(data, length) {
  const arr = new Uint8Array(length);
  let i = 0;
  for (let k = 0; k < data.length; k += 2) {
    const v = data[k];
    const n = data[k + 1];
    for (let j = 0; j < n && i < length; j++) arr[i++] = v;
  }
  return arr;
}

export function listSlots() {
  const all = readAll();
  const out = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const s = all[String(i)];
    out.push({
      id: i,
      exists: !!s,
      name: s?.name || null,
      updatedAt: s?.updatedAt || 0,
      seed: s?.seed ?? null,
      dim: s?.player?.dim ?? 0,
      gamemode: s?.gamemode || "survival",
    });
  }
  return out;
}

export function saveSlot(slot, data) {
  const all = readAll();
  all[String(slot)] = {
    ...data,
    name: data.name || `World ${slot}`,
    updatedAt: Date.now(),
  };
  if (!writeAll(all)) {
    // try dropping chunk payloads and keep player only
    const slim = {
      name: all[String(slot)].name,
      seed: data.seed,
      timeOfDay: data.timeOfDay,
      weather: data.weather,
      gamemode: data.gamemode,
      player: data.player,
      dims: {},
      portals: {},
      slim: true,
    };
    all[String(slot)] = { ...slim, updatedAt: Date.now() };
    writeAll(all);
  }
  return all[String(slot)];
}

export function loadSlot(slot) {
  return readAll()[String(slot)] || null;
}

export function deleteSlot(slot) {
  const all = readAll();
  delete all[String(slot)];
  writeAll(all);
}

export function serializeGame({ world, player, timeOfDay, weather, gamemode, slotName, seed }) {
  const dims = {};
  for (const [id, dim] of world.dimensions) {
    const chunks = {};
    for (const [k, c] of dim.chunks) {
      if (!c.userModified) continue; // regenerate untouched terrain
      chunks[k] = {
        cx: c.cx,
        cz: c.cz,
        b: rleEncode(c.blocks),
      };
    }
    dims[id] = chunks;
  }

  return {
    name: slotName || `World`,
    seed: world.seed,
    timeOfDay,
    weather,
    gamemode,
    player: {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      yaw: player.yaw,
      pitch: player.pitch,
      dim: player.dimension,
      health: player.health,
      hunger: player.hunger,
      hotbarIndex: player.hotbarIndex,
      flying: player.flying,
      inventory: player.inventory.serialize(),
    },
    dims,
    portals: {},
  };
}

export function applySave(world, player, save) {
  if (!save) return false;
  world.loadFromSave(save);
  player.position.set(save.player.x, save.player.y, save.player.z);
  player.yaw = save.player.yaw;
  player.pitch = save.player.pitch;
  player.health = save.player.health ?? 20;
  player.hunger = save.player.hunger ?? 20;
  player.hotbarIndex = save.player.hotbarIndex ?? 0;
  player.flying = !!save.player.flying;
  player.dimension = save.player.dim ?? 0;
  if (save.player.inventory) player.inventory.deserialize(save.player.inventory);
  player.syncCamera();
  return true;
}

export { rleEncode, rleDecode };
