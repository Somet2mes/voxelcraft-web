/** 2D/3D value noise with 32-bit integer hashes (safe for JS numbers). */

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hash2(x, y, seed) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967295;
}

function hash3(x, y, z, seed) {
  let n =
    Math.imul(x, 374761393) +
    Math.imul(y, 668265263) +
    Math.imul(z, 2147483647) +
    Math.imul(seed, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967295;
}

export class Noise {
  constructor(seed = 1337) {
    this.seed = seed | 0;
  }

  noise2(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const sx = fade(x - x0);
    const sy = fade(y - y0);
    const n00 = hash2(x0, y0, this.seed);
    const n10 = hash2(x1, y0, this.seed);
    const n01 = hash2(x0, y1, this.seed);
    const n11 = hash2(x1, y1, this.seed);
    return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy) * 2 - 1;
  }

  noise3(x, y, z) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const z1 = z0 + 1;
    const sx = fade(x - x0);
    const sy = fade(y - y0);
    const sz = fade(z - z0);
    const n000 = hash3(x0, y0, z0, this.seed);
    const n100 = hash3(x1, y0, z0, this.seed);
    const n010 = hash3(x0, y1, z0, this.seed);
    const n110 = hash3(x1, y1, z0, this.seed);
    const n001 = hash3(x0, y0, z1, this.seed);
    const n101 = hash3(x1, y0, z1, this.seed);
    const n011 = hash3(x0, y1, z1, this.seed);
    const n111 = hash3(x1, y1, z1, this.seed);
    return (
      lerp(
        lerp(lerp(n000, n100, sx), lerp(n010, n110, sx), sy),
        lerp(lerp(n001, n101, sx), lerp(n011, n111, sx), sy),
        sz
      ) * 2 - 1
    );
  }

  fbm2(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.noise2(x * freq, y * freq) * amp;
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }
}
