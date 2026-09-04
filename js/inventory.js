/** Player inventory: 9 hotbar + 27 storage + furnace/craft helper. */

import { maxStack } from "./items.js";

export class Inventory {
  constructor(size = 36) {
    this.slots = new Array(size).fill(null); // {id, count}
    this.size = size;
  }

  serialize() {
    return this.slots.map((s) => (s ? { ...s } : null));
  }

  deserialize(arr) {
    this.slots = new Array(this.size).fill(null);
    for (let i = 0; i < Math.min(arr.length, this.size); i++) {
      if (arr[i] && arr[i].id && arr[i].count > 0) this.slots[i] = { ...arr[i] };
    }
  }

  get(i) {
    return this.slots[i] || null;
  }

  set(i, stack) {
    this.slots[i] = stack && stack.count > 0 ? { ...stack } : null;
  }

  clear() {
    this.slots.fill(null);
  }

  /** Add stack, return leftover count. */
  add(id, count = 1) {
    const cap = maxStack(id);
    // merge
    for (let i = 0; i < this.size && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id && s.count < cap) {
        const n = Math.min(cap - s.count, count);
        s.count += n;
        count -= n;
      }
    }
    // empty
    for (let i = 0; i < this.size && count > 0; i++) {
      if (!this.slots[i]) {
        const n = Math.min(cap, count);
        this.slots[i] = { id, count: n };
        count -= n;
      }
    }
    return count;
  }

  /** Remove up to count of id, return removed. */
  remove(id, count = 1) {
    let left = count;
    for (let i = 0; i < this.size && left > 0; i++) {
      const s = this.slots[i];
      if (!s || s.id !== id) continue;
      const n = Math.min(s.count, left);
      s.count -= n;
      left -= n;
      if (s.count <= 0) this.slots[i] = null;
    }
    return count - left;
  }

  count(id) {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.count;
    return n;
  }

  has(id, count = 1) {
    return this.count(id) >= count;
  }

  /** Swap two slots. */
  swap(a, b) {
    const t = this.slots[a];
    this.slots[a] = this.slots[b];
    this.slots[b] = t;
  }

  /** Move one item from a to b (merge or swap). */
  move(a, b) {
    const A = this.slots[a];
    const B = this.slots[b];
    if (!A) return;
    if (!B) {
      this.slots[b] = A;
      this.slots[a] = null;
      return;
    }
    if (A.id === B.id) {
      const cap = maxStack(A.id);
      const n = Math.min(cap - B.count, A.count);
      B.count += n;
      A.count -= n;
      if (A.count <= 0) this.slots[a] = null;
      return;
    }
    this.slots[a] = B;
    this.slots[b] = A;
  }

  /** Take half from a into b. */
  half(a, b) {
    const A = this.slots[a];
    if (!A) return;
    const n = Math.ceil(A.count / 2);
    const B = this.slots[b];
    if (!B) {
      this.slots[b] = { id: A.id, count: n };
      A.count -= n;
      if (A.count <= 0) this.slots[a] = null;
      return;
    }
    if (B.id === A.id) {
      const cap = maxStack(B.id);
      const m = Math.min(cap - B.count, n);
      B.count += m;
      A.count -= m;
      if (A.count <= 0) this.slots[a] = null;
    }
  }

  give(id, count = 1) {
    return this.add(id, count) === 0;
  }

  isEmpty() {
    return this.slots.every((s) => !s);
  }
}
