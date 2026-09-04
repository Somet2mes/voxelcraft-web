/** HUD: hotbar, debug, toast. */

import { HOTBAR_BLOCKS, blockName, drawBlockIcon } from "./blocks.js";

export class UI {
  constructor() {
    this.hotbarEl = document.getElementById("hotbar");
    this.debugEl = document.getElementById("debug");
    this.toastEl = document.getElementById("toast");
    this.hudEl = document.getElementById("hud");
    this.overlayEl = document.getElementById("overlay");
    this.slots = [];
    this.toastTimer = 0;
  }

  showHud(show) {
    this.hudEl.classList.toggle("hidden", !show);
    this.overlayEl.classList.toggle("hidden", show);
  }

  buildHotbar(onSelect) {
    this.hotbarEl.innerHTML = "";
    this.slots = HOTBAR_BLOCKS.map((id, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot" + (i === 0 ? " active" : "");
      btn.title = blockName(id);
      btn.setAttribute("aria-label", `${i + 1} ${blockName(id)}`);

      const num = document.createElement("span");
      num.className = "num";
      num.textContent = String(i + 1);

      const cv = document.createElement("canvas");
      drawBlockIcon(cv, id);

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = blockName(id);

      btn.append(num, cv, name);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect(i);
      });
      this.hotbarEl.appendChild(btn);
      return btn;
    });
  }

  setHotbarIndex(i) {
    this.slots.forEach((s, idx) => s.classList.toggle("active", idx === i));
  }

  setDebugVisible(v) {
    this.debugEl.classList.toggle("hidden", !v);
  }

  isDebugVisible() {
    return !this.debugEl.classList.contains("hidden");
  }

  toggleDebug() {
    this.setDebugVisible(this.isDebugVisible());
  }

  updateDebug(info) {
    if (!this.isDebugVisible()) return;
    this.debugEl.textContent = info;
  }

  toast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove("show"), 1600);
  }
}
