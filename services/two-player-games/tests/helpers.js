/* Helper dùng chung cho test logic game: mock DOM tối thiểu + nạp game + tạo ctx */
"use strict";
const path = require("path");

// Mock 2D canvas context: mọi phương thức là no-op, thuộc tính ghi/đọc tự do.
function makeCtx2d() {
  const noop = () => {};
  return new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === "measureText") return () => ({ width: 0 });
      if (prop === "createLinearGradient" || prop === "createRadialGradient") {
        return () => ({ addColorStop: noop });
      }
      if (prop === "getImageData") return () => ({ data: [] });
      return noop;
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}

function mkEl(tag) {
  const set = new Set();
  const el = {
    tagName: tag, children: [], _text: "", _html: "", _ev: {}, dataset: {}, type: "", disabled: false,
    style: { _p: {}, setProperty(k, v) { this._p[k] = v; }, removeProperty(k) { delete this._p[k]; }, getPropertyValue(k) { return this._p[k]; } },
    offsetWidth: 50,
    classList: {
      add: (...c) => c.forEach((x) => set.add(x)),
      remove: (...c) => c.forEach((x) => set.delete(x)),
      toggle: (c, on) => { if (on === undefined) { set.has(c) ? set.delete(c) : set.add(c); } else { on ? set.add(c) : set.delete(c); } },
      contains: (c) => set.has(c),
    },
    get className() { return [...set].join(" "); },
    set className(v) { set.clear(); String(v).split(/\s+/).filter(Boolean).forEach((x) => set.add(x)); },
    setAttribute() {},
    get textContent() { return el._text; },
    set textContent(v) { el._text = String(v); },
    get innerHTML() { return el._html; },
    set innerHTML(v) { el._html = v; if (v === "") el.children = []; },
    addEventListener(ev, cb) { (el._ev[ev] ||= []).push(cb); },
    insertAdjacentHTML() {},
    appendChild(c) { el.children.push(c); return c; },
    removeChild(c) { el.children = el.children.filter((x) => x !== c); },
    remove() {},
    focus() {},
    blur() {},
    fire(ev) { (el._ev[ev] || []).forEach((f) => f()); },
    getBoundingClientRect() { return { height: 50, width: 50, top: 0, left: 0 }; },
    getContext() { return makeCtx2d(); },
    width: 300, height: 150,
    _qs: {},
    querySelector(sel) { return el._qs[sel] || (el._qs[sel] = mkEl("div")); },
    querySelectorAll() { return []; },
  };
  return el;
}

function makeRng(seed) {
  let x = seed || 1;
  return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
}

const registry = {};
function installGlobals() {
  global.document = {
    createElement: (t) => mkEl(t),
    createElementNS: (ns, t) => mkEl(t),
    querySelector: () => null,
    addEventListener() {},
    removeEventListener() {},
    body: { contains: () => true, appendChild() {}, removeChild() {} },
  };
  global.MutationObserver = class { observe() {} disconnect() {} };
  global.requestAnimationFrame = () => 0;
  global.cancelAnimationFrame = () => {};
  // Bọc timer để .unref(): game vẫn tạo được setInterval/RAF nhưng các handle
  // này KHÔNG giữ tiến trình sống, nên node:test có thể thoát (tránh treo).
  // Không stub no-op vì sẽ phá chính test runner (vốn dùng timer nội bộ).
  const _setInterval = global.setInterval.bind(global);
  const _setTimeout = global.setTimeout.bind(global);
  global.setInterval = (...a) => { const h = _setInterval(...a); if (h && h.unref) h.unref(); return h; };
  global.setTimeout = (...a) => { const h = _setTimeout(...a); if (h && h.unref) h.unref(); return h; };
  global.window = {
    GameRegistry: { register: (cfg) => { registry[cfg.id] = cfg; } },
    addEventListener() {}, removeEventListener() {},
    makeRng,
  };
}

function loadGame(id) {
  if (!global.window) installGlobals();
  if (!registry[id]) require(path.join(__dirname, "..", "js", "games", id + ".js"));
  return registry[id];
}

function makeCtx(options, seed) {
  const boardEl = mkEl("div");
  const scores = [0, 0];
  return {
    boardEl, isOnline: false, mySeat: 0, options: options || {}, rng: makeRng(seed || 7),
    scores,
    sound() {}, sendMove() {}, setNames() {},
    t(vi) { return vi; },
    setStatus(s) { this.status = s; },
    setTurn(t) { this.turn = t; },
    incScore(p) { scores[p]++; },
    decScore(p) { scores[p] = Math.max(0, scores[p] - 1); },
  };
}

function grid(ctx, boardClass) {
  const root = ctx.boardEl.children[0];
  if (root && root.classList.contains(boardClass)) return root;
  return (root.children || []).find((c) => c.classList && c.classList.contains(boardClass));
}

module.exports = { mkEl, makeRng, installGlobals, loadGame, makeCtx, grid };
