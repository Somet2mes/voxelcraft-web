/** HUD, inventory, crafting, furnace, saves, death. */

import { Block, BLOCK_DEFS, drawIcon } from "./blocks.js";
import { itemName } from "./items.js";
import { findRecipe, consumeCraft, smeltResult } from "./recipes.js";
import { itemFuelTime } from "./items.js";
import { t, getLang, toggleLang } from "./i18n.js";
import { listSlots, saveSlot, deleteSlot } from "./save.js";

export class UI {
  constructor() {
    this.hotbarEl = document.getElementById("hotbar");
    this.debugEl = document.getElementById("debug");
    this.toastEl = document.getElementById("toast");
    this.hudEl = document.getElementById("hud");
    this.overlayEl = document.getElementById("overlay");
    this.slots = [];
    this.toastTimer = 0;
    this.panel = null; // inventory overlay
    this.onLang = null;
  }

  showHud(show) {
    this.hudEl.classList.toggle("hidden", !show);
    this.overlayEl.classList.toggle("hidden", show);
  }

  rebuildStartOverlay(opts) {
    const slots = listSlots();
    const cont = slots.find((s) => s.exists);
    this.overlayEl.innerHTML = `
      <div class="panel">
        <div class="logo">VoxelCraft</div>
        <p class="tagline">${t("tagline")}</p>
        <div class="btnrow">
          <button id="btn-start" type="button">${cont ? t("continue") : t("start")}</button>
          <button id="btn-new" type="button" class="ghost">${t("newGame")}</button>
        </div>
        <div class="saves">
          <div class="saves-title">${t("saves")}</div>
          ${slots
            .map(
              (s) => `
            <div class="save-row" data-slot="${s.id}">
              <span>${t("slot")} ${s.id}${s.exists ? " · " + (s.name || "World") : " · " + t("emptySlot")}</span>
              <span class="save-actions">
                ${s.exists ? `<button type="button" data-act="load" data-slot="${s.id}">${t("load")}</button>` : ""}
                <button type="button" data-act="play" data-slot="${s.id}" class="small">${s.exists ? "▶" : t("newGame")}</button>
                ${s.exists ? `<button type="button" data-act="del" data-slot="${s.id}" class="danger">${t("del")}</button>` : ""}
              </span>
            </div>`
            )
            .join("")}
        </div>
        <button id="btn-lang" type="button" class="ghost lang">${t("langSwitch")}</button>
        <div class="controls">
          <div><kbd>W A S D</kbd> ${t("move")}</div>
          <div><kbd>空格</kbd> 跳跃 / 双击飞行 · <kbd>F</kbd> 飞行开关</div>
          <div><kbd>E</kbd> ${t("openInv")}</div>
          <div><kbd>G</kbd> 创造/生存 · <kbd>L</kbd> 中英 · <kbd>P</kbd> 存档</div>
          <div><kbd>左键</kbd> ${t("digPlace")}</div>
          <div><kbd>1–9</kbd> ${t("select")}</div>
        </div>
      </div>`;
  }

  bindStartOverlay(handlers) {
    const langBtn = this.overlayEl.querySelector("#btn-lang");
    if (langBtn) {
      langBtn.onclick = () => {
        toggleLang();
        handlers.onLang?.();
      };
    }
    const start = this.overlayEl.querySelector("#btn-start");
    if (start) start.onclick = () => handlers.onPlay?.();
    const nw = this.overlayEl.querySelector("#btn-new");
    if (nw) nw.onclick = () => handlers.onNew?.();
    this.overlayEl.querySelectorAll("[data-act]").forEach((b) => {
      b.onclick = () => {
        const act = b.dataset.act;
        const slot = Number(b.dataset.slot);
        if (act === "del") {
          if (confirm(t("confirmDelete"))) deleteSlot(slot);
          handlers.onRefresh?.();
        } else if (act === "load") handlers.onLoad?.(slot);
        else if (act === "play") handlers.onPlaySlot?.(slot);
      };
    });
  }

  buildHotbar(inventory, onSelect) {
    this.hotbarEl.innerHTML = "";
    this.slots = [];
    for (let i = 0; i < 9; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot" + (i === 0 ? " active" : "");
      btn.dataset.i = String(i);
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = String(i + 1);
      const cv = document.createElement("canvas");
      const stack = inventory.get(i);
      if (stack) drawIcon(cv, stack.id);
      const cnt = document.createElement("span");
      cnt.className = "cnt";
      cnt.textContent = stack && stack.count > 1 ? String(stack.count) : "";
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = stack ? itemName(stack.id, getLang()) : "";
      btn.append(num, cv, cnt, name);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect(i);
      });
      this.hotbarEl.appendChild(btn);
      this.slots.push(btn);
    }
  }

  refreshHotbar(inventory, selected) {
    for (let i = 0; i < 9; i++) {
      const btn = this.slots[i];
      if (!btn) continue;
      btn.classList.toggle("active", i === selected);
      const stack = inventory.get(i);
      const cv = btn.querySelector("canvas");
      const cnt = btn.querySelector(".cnt");
      const name = btn.querySelector(".name");
      drawIcon(cv, stack ? stack.id : 0);
      cnt.textContent = stack && stack.count > 1 ? String(stack.count) : "";
      name.textContent = stack ? itemName(stack.id, getLang()) : "";
    }
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

  /** Survival bars under crosshair area. */
  updateVitals(health, hunger, oxygen = 10, xpLevel = 0, xp = 0) {
    let el = document.getElementById("vitals");
    if (!el) {
      el = document.createElement("div");
      el.id = "vitals";
      el.className = "vitals";
      this.hudEl.appendChild(el);
    }
    const hp = Math.ceil(health);
    const hu = Math.ceil(hunger);
    const hearts = "♥".repeat(Math.max(0, Math.ceil(hp / 2)));
    const drums = "🍗".repeat(Math.max(0, Math.ceil(hu / 2)));
    const air = oxygen < 10 ? `<span class="air">${"○".repeat(Math.ceil(oxygen))}</span>` : "";
    el.innerHTML = `<span class="hp">${hearts}</span><span class="hg">${drums}</span>${air}<span class="xp">Lv ${xpLevel}</span>`;
  }

  showPause(onResume, onSaveExit) {
    this.closePanel();
    const el = document.createElement("div");
    el.className = "panel-overlay death";
    el.innerHTML = `
      <div class="panel">
        <div class="logo" style="font-size:28px">${t("pause") || "暂停"}</div>
        <div class="btnrow" style="margin-top:16px">
          <button type="button" id="btn-resume">${t("start") || "继续"}</button>
          <button type="button" id="btn-save-exit" class="ghost">${t("save")}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.panel = el;
    el.querySelector("#btn-resume").onclick = () => {
      el.remove();
      this.panel = null;
      onResume();
    };
    el.querySelector("#btn-save-exit").onclick = () => onSaveExit();
  }

  toast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove("show"), 1600);
  }

  closePanel() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }

  isPanelOpen() {
    return !!this.panel;
  }

  openInventory(player, mode = "craft", furnace = null) {
    this.closePanel();
    const wrap = document.createElement("div");
    wrap.className = "panel-overlay";
    wrap.id = "inv-panel";

    const grid =
      mode === "table" || mode === "craft"
        ? new Array(9).fill(null)
        : null;
    if (mode === "craft" || mode === "table") {
      player.craftGrid = grid;
      player.craftMode = mode;
    }

    const furnaceState =
      mode === "furnace"
        ? furnace || { input: null, fuel: null, output: null, progress: 0, burn: 0 }
        : null;
    if (furnaceState) player.openFurnace = furnaceState;

    const render = () => {
      const lang = getLang();
      const inv = player.inventory;
      let mid = "";
      if (mode === "table" || mode === "craft") {
        const cells = player.craftGrid
          .map((s, i) => slotHtml(s, i, "craft"))
          .join("");
        const out = findRecipe(player.craftGrid);
        mid = `
          <div class="craft-row">
            <div class="craft-grid">${cells}</div>
            <div class="craft-arrow">→</div>
            <div class="craft-out">${slotHtml(out, "out", "out")}</div>
          </div>
          <div class="hint">${mode === "craft" ? t("inventory") : t("craftTable")}</div>`;
      } else if (mode === "furnace") {
        const f = player.openFurnace;
        mid = `
          <div class="furnace-row">
            <div>
              <div class="hint">${t("input")}</div>
              ${slotHtml(f.input, "fin", "furnace")}
            </div>
            <div>
              <div class="hint">${t("fuel")}</div>
              ${slotHtml(f.fuel, "ffuel", "furnace")}
            </div>
            <div class="craft-arrow">→</div>
            <div>
              <div class="hint">${t("output")}</div>
              ${slotHtml(f.output, "fout", "furnace")}
            </div>
          </div>
          <div class="hint">${t("furnace")} · ${Math.floor((f.progress || 0) * 100)}%</div>`;
      }

      wrap.innerHTML = `
        <div class="panel inv-panel">
          <div class="inv-title">${mode === "furnace" ? t("furnace") : mode === "table" ? t("craftTable") : t("inventory")}
            <button type="button" class="ghost small" id="inv-close">✕</button>
          </div>
          ${mid}
          <div class="inv-grid">
            ${inv.slots
              .map((s, i) => slotHtml(s, i, "inv"))
              .join("")}
          </div>
        </div>`;

      wrap.querySelector("#inv-close").onclick = () => {
        // return craft grid items
        if (player.craftGrid) {
          for (const s of player.craftGrid) if (s) inv.add(s.id, s.count);
          player.craftGrid = null;
        }
        if (player.openFurnace) {
          const f = player.openFurnace;
          for (const k of ["input", "fuel", "output"]) if (f[k]) inv.add(f[k].id, f[k].count);
          player.openFurnace = null;
        }
        this.closePanel();
        document.exitPointerLock?.();
        // re-lock handled by main
        wrap.dispatchEvent(new CustomEvent("close-inv"));
      };

      // click handlers
      wrap.querySelectorAll("[data-area]").forEach((el) => {
        el.addEventListener("mousedown", (e) => {
          e.preventDefault();
          this.handleSlotClick(player, el.dataset.area, el.dataset.idx, e.button === 2, mode);
          render();
        });
        el.addEventListener("contextmenu", (e) => e.preventDefault());
      });
    };

    function slotHtml(stack, idx, area) {
      const icon = stack
        ? `<canvas width="32" height="32" data-icon="${stack.id}"></canvas><span class="cnt">${stack.count > 1 ? stack.count : ""}</span>`
        : "";
      return `<div class="slot" data-area="${area}" data-idx="${idx}">${icon}</div>`;
    }

    render();
    // draw icons after insert
    wrap.querySelectorAll("canvas[data-icon]").forEach((cv) => drawIcon(cv, Number(cv.dataset.icon)));
    document.body.appendChild(wrap);
    this.panel = wrap;

    // re-render icons after each interaction
    const origRender = render;
    // patch: after handleSlotClick we call render then redraw icons
    wrap.addEventListener("reicon", () => {
      wrap.querySelectorAll("canvas[data-icon]").forEach((cv) => drawIcon(cv, Number(cv.dataset.icon)));
    });

    // override render to redraw icons - wrap in function
    const fullRender = () => {
      render();
      wrap.querySelectorAll("canvas[data-icon]").forEach((cv) => drawIcon(cv, Number(cv.dataset.icon)));
    };
    wrap.querySelectorAll("[data-area]").forEach(() => {});
    // replace click to use fullRender
    wrap.querySelectorAll("[data-area]").forEach((el) => {
      const clone = el.cloneNode(true);
      // already attached; re-bind
    });
    // simpler: re-bind after each render via MutationObserver-free approach
    wrap._fullRender = fullRender;
    wrap.querySelectorAll("[data-area]").forEach((el) => {
      el.onmousedown = (e) => {
        e.preventDefault();
        this.handleSlotClick(player, el.dataset.area, el.dataset.idx, e.button === 2, mode);
        fullRender();
      };
      el.oncontextmenu = (e) => e.preventDefault();
    });

    return wrap;
  }

  handleSlotClick(player, area, idxRaw, right, mode) {
    const inv = player.inventory;
    const idx = idxRaw === "out" || idxRaw === "fin" || idxRaw === "ffuel" || idxRaw === "fout" ? idxRaw : Number(idxRaw);

    // craft output
    if (area === "out") {
      const out = findRecipe(player.craftGrid || []);
      if (!out) return;
      if (!player._craftCarry) {
        player._craftCarry = { ...out };
        consumeCraft(player.craftGrid);
      } else if (player._craftCarry.id === out.id) {
        player._craftCarry.count += out.count;
        consumeCraft(player.craftGrid);
      }
      return;
    }

    // furnace
    if (area === "furnace") {
      const f = player.openFurnace;
      if (!f) return;
      const key = idx === "fin" ? "input" : idx === "ffuel" ? "fuel" : "output";
      if (idx === "fout") {
        if (player._craftCarry && f.output && player._craftCarry.id === f.output.id) {
          player._craftCarry.count += f.output.count;
          f.output = null;
        } else if (!player._craftCarry && f.output) {
          player._craftCarry = f.output;
          f.output = null;
        }
        return;
      }
      if (!player._craftCarry) {
        if (f[key]) {
          player._craftCarry = f[key];
          f[key] = null;
        }
      } else {
        if (!f[key]) {
          f[key] = player._craftCarry;
          player._craftCarry = null;
        } else if (f[key].id === player._craftCarry.id) {
          f[key].count += player._craftCarry.count;
          player._craftCarry = null;
        } else {
          const t = f[key];
          f[key] = player._craftCarry;
          player._craftCarry = t;
        }
      }
      return;
    }

    // craft grid
    if (area === "craft") {
      const g = player.craftGrid;
      if (!g) return;
      const cur = g[idx];
      if (!player._craftCarry) {
        if (cur) {
          if (right) {
            player._craftCarry = { id: cur.id, count: 1 };
            cur.count -= 1;
            if (cur.count <= 0) g[idx] = null;
          } else {
            player._craftCarry = cur;
            g[idx] = null;
          }
        }
      } else {
        if (!cur) {
          if (right) {
            g[idx] = { id: player._craftCarry.id, count: 1 };
            player._craftCarry.count -= 1;
            if (player._craftCarry.count <= 0) player._craftCarry = null;
          } else {
            g[idx] = player._craftCarry;
            player._craftCarry = null;
          }
        } else if (cur.id === player._craftCarry.id) {
          cur.count += right ? 1 : player._craftCarry.count;
          if (right) {
            player._craftCarry.count -= 1;
            if (player._craftCarry.count <= 0) player._craftCarry = null;
          } else player._craftCarry = null;
        } else {
          const t = cur;
          g[idx] = player._craftCarry;
          player._craftCarry = t;
        }
      }
      return;
    }

    // inventory slots
    const i = idx;
    const cur = inv.get(i);
    if (!player._craftCarry) {
      if (cur) {
        if (right) {
          const take = Math.ceil(cur.count / 2);
          player._craftCarry = { id: cur.id, count: take };
          cur.count -= take;
          if (cur.count <= 0) inv.set(i, null);
        } else {
          player._craftCarry = { ...cur };
          inv.set(i, null);
        }
      }
    } else {
      if (!cur) {
        if (right) {
          inv.set(i, { id: player._craftCarry.id, count: 1 });
          player._craftCarry.count -= 1;
          if (player._craftCarry.count <= 0) player._craftCarry = null;
        } else {
          inv.set(i, player._craftCarry);
          player._craftCarry = null;
        }
      } else if (cur.id === player._craftCarry.id) {
        const cap = 64;
        const n = right ? 1 : player._craftCarry.count;
        const add = Math.min(cap - cur.count, n);
        cur.count += add;
        player._craftCarry.count -= add;
        if (player._craftCarry.count <= 0) player._craftCarry = null;
      } else if (!right) {
        inv.set(i, player._craftCarry);
        player._craftCarry = cur;
      }
    }
  }

  /** Try craft from current grid into inventory (E close path). */
  finalizeCraft(player) {
    if (player.craftGrid) {
      const out = findRecipe(player.craftGrid);
      if (out) {
        // leave in grid; user takes via out slot
      }
      for (const s of player.craftGrid) if (s) player.inventory.add(s.id, s.count);
      player.craftGrid = null;
    }
    if (player._craftCarry) {
      player.inventory.add(player._craftCarry.id, player._craftCarry.count);
      player._craftCarry = null;
    }
    if (player.openFurnace) {
      const f = player.openFurnace;
      for (const k of ["input", "fuel", "output"]) if (f[k]) player.inventory.add(f[k].id, f[k].count);
      player.openFurnace = null;
    }
  }

  showDeath(onRespawn) {
    this.closePanel();
    const el = document.createElement("div");
    el.className = "panel-overlay death";
    el.innerHTML = `
      <div class="panel">
        <div class="logo death-logo">${t("died")}</div>
        <button type="button" id="btn-respawn">${t("respawn")}</button>
      </div>`;
    document.body.appendChild(el);
    el.querySelector("#btn-respawn").onclick = () => {
      el.remove();
      onRespawn();
    };
    this.panel = el;
  }
}
