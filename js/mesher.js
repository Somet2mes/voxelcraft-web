/** Face-culled chunk mesher. */

import * as THREE from "three";
import { CHUNK_SIZE, CHUNK_HEIGHT } from "./world.js";
import { Block, isTransparent, isLiquid, BLOCK_DEFS } from "./blocks.js";

// face: dir, corners (CCW), normal
const FACES = [
  {
    // +X
    dir: [1, 0, 0],
    corners: [
      [1, 1, 1],
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
    ],
    uvs: [
      [0, 1],
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    faceKey: "side",
  },
  {
    // -X
    dir: [-1, 0, 0],
    corners: [
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
    ],
    uvs: [
      [0, 1],
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    faceKey: "side",
  },
  {
    // +Y
    dir: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    uvs: [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
    faceKey: "top",
  },
  {
    // -Y
    dir: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    uvs: [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
    faceKey: "bottom",
  },
  {
    // +Z
    dir: [0, 0, 1],
    corners: [
      [0, 1, 1],
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
    ],
    uvs: [
      [0, 1],
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    faceKey: "side",
  },
  {
    // -Z
    dir: [0, 0, -1],
    corners: [
      [1, 1, 0],
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
    ],
    uvs: [
      [0, 1],
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    faceKey: "side",
  },
];

// simple face AO (vertex-based approximation using 3 neighbors)
function vertexAO(side1, side2, corner) {
  if (side1 && side2) return 0;
  return 3 - (side1 + side2 + corner);
}

function aoValue(ao) {
  return 0.7 + (ao / 3) * 0.3;
}

export function createMaterials(texture) {
  const opaque = new THREE.MeshLambertMaterial({
    map: texture,
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const transparent = new THREE.MeshLambertMaterial({
    map: texture,
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  return { opaque, transparent };
}

/**
 * Build solid + liquid meshes for a chunk.
 * @returns {{ solid: THREE.BufferGeometry|null, liquid: THREE.BufferGeometry|null }}
 */
export function buildChunkGeometry(world, chunk, tileUV) {
  const solidPos = [];
  const solidNorm = [];
  const solidUv = [];
  const solidCol = [];
  const solidIdx = [];

  const liquidPos = [];
  const liquidNorm = [];
  const liquidUv = [];
  const liquidCol = [];
  const liquidIdx = [];

  const ox = chunk.cx * CHUNK_SIZE;
  const oz = chunk.cz * CHUNK_SIZE;

  const getWorld = (x, y, z) => world.getBlock(x, y, z);

  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const id = chunk.get(x, y, z);
        if (id === Block.AIR) continue;
        const def = BLOCK_DEFS[id];
        if (!def) continue;
        const liquid = isLiquid(id);
        const wx = ox + x;
        const wz = oz + z;

        // X-shaped plants
        if (def.cross) {
          const faceName = def.faces.side;
          const { u0, v0, u1, v1 } = tileUV(faceName);
          const quads = [
            [
              [0.2, 0, 0.2],
              [0.8, 0, 0.8],
              [0.8, 0.95, 0.8],
              [0.2, 0.95, 0.2],
            ],
            [
              [0.8, 0, 0.2],
              [0.2, 0, 0.8],
              [0.2, 0.95, 0.8],
              [0.8, 0.95, 0.2],
            ],
          ];
          for (const corners of quads) {
            const base = solidPos.length / 3;
            for (let ci = 0; ci < 4; ci++) {
              const c = corners[ci];
              solidPos.push(x + c[0], y + c[1], z + c[2]);
              solidNorm.push(0, 1, 0);
              const u = u0 + (u1 - u0) * (ci % 2);
              const v = v0 + (v1 - v0) * (ci < 2 ? 0 : 1);
              solidUv.push(u, v);
              solidCol.push(1, 1, 1);
            }
            solidIdx.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
          continue;
        }

        for (const face of FACES) {
          const nx = x + face.dir[0];
          const ny = y + face.dir[1];
          const nz = z + face.dir[2];

          // neighbor inside chunk fast path
          let nId;
          if (nx >= 0 && nx < CHUNK_SIZE && nz >= 0 && nz < CHUNK_SIZE && ny >= 0 && ny < CHUNK_HEIGHT) {
            nId = chunk.get(nx, ny, nz);
          } else {
            nId = getWorld(wx + face.dir[0], ny, wz + face.dir[2]);
          }

          // face culling: hide when neighbor fully occludes this side
          if (nId === Block.AIR) {
            // draw
          } else if (liquid) {
            if (nId === id || !isTransparent(nId)) continue;
          } else {
            if (!isTransparent(nId) || nId === id) continue;
          }

          // water surface slightly lower
          let yTop = 0;
          if (liquid && face.faceKey === "top") yTop = -0.12;

          const faceName = def.faces[face.faceKey];
          const { u0, v0, u1, v1 } = tileUV(faceName);

          const P = liquid ? liquidPos : solidPos;
          const N = liquid ? liquidNorm : solidNorm;
          const U = liquid ? liquidUv : solidUv;
          const C = liquid ? liquidCol : solidCol;
          const I = liquid ? liquidIdx : solidIdx;
          const base = P.length / 3;

          // AO for solid opaque
          const aoLevels = [1, 1, 1, 1];
          if (!liquid && !isTransparent(id)) {
            for (let ci = 0; ci < 4; ci++) {
              const c = face.corners[ci];
              // sample neighbors around the vertex
              const dx = face.dir[0];
              const dy = face.dir[1];
              const dz = face.dir[2];
              // local offsets for side samples depend on face axis
              let s1x = 0, s1y = 0, s1z = 0;
              let s2x = 0, s2y = 0, s2z = 0;
              if (dx !== 0) {
                s1y = c[1] === 1 ? 1 : -1;
                s2z = c[2] === 1 ? 1 : -1;
              } else if (dy !== 0) {
                s1x = c[0] === 1 ? 1 : -1;
                s2z = c[2] === 1 ? 1 : -1;
              } else {
                s1x = c[0] === 1 ? 1 : -1;
                s2y = c[1] === 1 ? 1 : -1;
              }
              const side1 = isSolidOpaque(getWorld(wx + dx + s1x, y + dy + s1y, wz + dz + s1z)) ? 1 : 0;
              const side2 = isSolidOpaque(getWorld(wx + dx + s2x, y + dy + s2y, wz + dz + s2z)) ? 1 : 0;
              const corner = isSolidOpaque(getWorld(wx + dx + s1x + s2x, y + dy + s1y + s2y, wz + dz + s1z + s2z)) ? 1 : 0;
              aoLevels[ci] = aoValue(vertexAO(side1, side2, corner));
            }
          }

          for (let ci = 0; ci < 4; ci++) {
            const c = face.corners[ci];
            const uv = face.uvs[ci];
            let vy = c[1];
            if (liquid && face.faceKey === "top") {
              // keep top at y+1 but lower by yTop via all corners
            }
            P.push(
              x + c[0],
              y + c[1] + (c[1] === 1 ? yTop : 0),
              z + c[2]
            );
            N.push(face.dir[0], face.dir[1], face.dir[2]);
            const u = u0 + (u1 - u0) * uv[0];
            const v = v0 + (v1 - v0) * uv[1];
            U.push(u, v);
            const shade = aoLevels[ci];
            // slight face tint
            let tint = 1;
            if (face.dir[1] === 1) tint = 1;
            else if (face.dir[1] === -1) tint = 0.72;
            else if (face.dir[0] !== 0) tint = 0.88;
            else tint = 0.82;
            const a = Math.min(1, Math.max(0.25, shade * tint));
            C.push(a, a, a);
          }

          // consistent winding (no diagonal flip — avoids checker artifacts)
          I.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }
    }
  }

  const make = (pos, norm, uv, col, idx) => {
    if (pos.length === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(norm, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  };

  return {
    solid: make(solidPos, solidNorm, solidUv, solidCol, solidIdx),
    liquid: make(liquidPos, liquidNorm, liquidUv, liquidCol, liquidIdx),
  };
}

function isSolidOpaque(id) {
  if (id === Block.AIR || id === Block.WATER) return false;
  const def = BLOCK_DEFS[id];
  if (!def) return false;
  return def.solid && !def.transparent;
}
