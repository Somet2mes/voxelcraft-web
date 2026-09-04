/** Weather: clear / rain / snow / storm + sky tint. */

import * as THREE from "three";
import { sfx } from "./audio.js";
import { Dim } from "./world.js";
import { Biome } from "./biomes.js";

export const WeatherState = { CLEAR: 0, RAIN: 1, SNOW: 2, STORM: 3 };

export class Weather {
  constructor(scene) {
    this.state = WeatherState.CLEAR;
    this.timer = 40;
    this.intensity = 0;
    this.points = null;
    this.vel = null;
    this.count = 800;
    this.scene = scene;
    this.thunderCd = 0;
    this.flash = 0;
    this.initParticles();
  }

  initParticles() {
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      this.pos[i * 3] = (Math.random() - 0.5) * 40;
      this.pos[i * 3 + 1] = Math.random() * 24;
      this.pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.scene.add(this.points);
  }

  set(state) {
    this.state = state;
    this.intensity = state === WeatherState.CLEAR ? 0 : 1;
    if (this.points) this.points.visible = state !== WeatherState.CLEAR;
    if (this.points && state === WeatherState.SNOW) {
      this.points.material.color.set(0xffffff);
      this.points.material.size = 0.12;
    } else if (this.points) {
      this.points.material.color.set(0xaaccff);
      this.points.material.size = 0.08;
    }
  }

  update(dt, player, world, timeOfDay) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 30 + Math.random() * 50;
      const r = Math.random();
      if (world.activeDim === Dim.NETHER || world.activeDim === Dim.END) {
        this.set(WeatherState.CLEAR);
      } else if (r < 0.45) this.set(WeatherState.CLEAR);
      else if (r < 0.7) this.set(WeatherState.RAIN);
      else if (r < 0.85) this.set(WeatherState.SNOW);
      else this.set(WeatherState.STORM);
    }

    this.flash = Math.max(0, this.flash - dt * 2);
    this.thunderCd -= dt;
    if (this.state === WeatherState.STORM && this.thunderCd <= 0) {
      this.thunderCd = 4 + Math.random() * 8;
      this.flash = 1;
      sfx.thunder();
    }

    if (!this.points || this.state === WeatherState.CLEAR) return;

    this.points.position.set(
      Math.floor(player.position.x),
      Math.floor(player.position.y),
      Math.floor(player.position.z)
    );

    const snow = this.state === WeatherState.SNOW;
    for (let i = 0; i < this.count; i++) {
      this.pos[i * 3 + 1] -= (snow ? 2.5 : 14) * dt;
      if (snow) this.pos[i * 3] += Math.sin(performance.now() * 0.001 + i) * dt * 0.8;
      if (this.pos[i * 3 + 1] < -2) {
        this.pos[i * 3] = (Math.random() - 0.5) * 40;
        this.pos[i * 3 + 1] = 22;
        this.pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  /** Weather block for HUD. */
  label(lang) {
    const zh = ["晴", "雨", "雪", "雷暴"];
    const en = ["Clear", "Rain", "Snow", "Storm"];
    return lang === "en" ? en[this.state] : zh[this.state];
  }

  applySky(baseColor, sunH) {
    const c = baseColor.clone();
    if (this.state === WeatherState.RAIN || this.state === WeatherState.STORM) {
      c.lerp(new THREE.Color(0x6a7a8a), 0.55);
    } else if (this.state === WeatherState.SNOW) {
      c.lerp(new THREE.Color(0xc8d4e0), 0.35);
    }
    if (this.flash > 0) c.lerp(new THREE.Color(0xffffff), this.flash * 0.7);
    return c;
  }
}
