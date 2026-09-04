/** Procedural Web Audio SFX — zero audio files. */

let ctx = null;
let master = null;
let enabled = true;

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function initAudio() {
  try {
    ensure();
  } catch {
    enabled = false;
  }
}

export function setAudioEnabled(v) {
  enabled = v;
}

function env(node, t0, a, d, peak = 1) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  node.connect(g);
  g.connect(master);
  return g;
}

function tone(freq, type, dur, peak = 0.5, detune = 0) {
  if (!enabled) return;
  const c = ensure();
  const t0 = c.currentTime;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  env(o, t0, 0.01, dur, peak);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur, peak = 0.4, filterFreq = 1200) {
  if (!enabled) return;
  const c = ensure();
  const t0 = c.currentTime;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = filterFreq;
  src.connect(f);
  env(f, t0, 0.005, dur, peak);
  src.start(t0);
}

export const sfx = {
  dig() {
    noise(0.08, 0.35, 900);
    tone(180 + Math.random() * 40, "square", 0.05, 0.12);
  },
  place() {
    noise(0.06, 0.25, 1400);
    tone(320 + Math.random() * 30, "triangle", 0.06, 0.15);
  },
  step() {
    noise(0.04, 0.12, 500);
  },
  hurt() {
    tone(220, "sawtooth", 0.18, 0.35);
    tone(160, "square", 0.12, 0.2, 10);
  },
  hit() {
    noise(0.07, 0.4, 700);
    tone(120, "square", 0.08, 0.25);
  },
  mobHurt() {
    tone(140, "sawtooth", 0.12, 0.25);
  },
  mobDie() {
    tone(100, "sawtooth", 0.3, 0.3);
    tone(70, "square", 0.25, 0.2);
  },
  eat() {
    for (let i = 0; i < 3; i++) setTimeout(() => noise(0.05, 0.2, 600), i * 90);
  },
  craft() {
    tone(440, "triangle", 0.08, 0.25);
    setTimeout(() => tone(660, "triangle", 0.1, 0.22), 70);
  },
  smelt() {
    noise(0.15, 0.2, 400);
    tone(280, "sine", 0.2, 0.15);
  },
  portal() {
    const c = ensure();
    const t0 = c.currentTime;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(120, t0);
    o.frequency.exponentialRampToValueAtTime(480, t0 + 1.1);
    env(o, t0, 0.1, 1.2, 0.3);
    o.start(t0);
    o.stop(t0 + 1.4);
    const o2 = c.createOscillator();
    o2.type = "triangle";
    o2.frequency.setValueAtTime(90, t0);
    o2.frequency.exponentialRampToValueAtTime(360, t0 + 1.0);
    env(o2, t0, 0.08, 1.0, 0.18);
    o2.start(t0);
    o2.stop(t0 + 1.2);
  },
  thunder() {
    noise(0.8, 0.55, 200);
    setTimeout(() => noise(0.5, 0.3, 120), 180);
  },
  splash() {
    noise(0.2, 0.3, 800);
  },
  pick() {
    tone(520, "square", 0.04, 0.15);
    tone(780, "square", 0.05, 0.1);
  },
  death() {
    tone(200, "sawtooth", 0.4, 0.35);
    setTimeout(() => tone(120, "sawtooth", 0.5, 0.3), 150);
    setTimeout(() => tone(80, "square", 0.6, 0.25), 350);
  },
  openUI() {
    tone(500, "sine", 0.05, 0.12);
  },
  closeUI() {
    tone(350, "sine", 0.05, 0.1);
  },
};
