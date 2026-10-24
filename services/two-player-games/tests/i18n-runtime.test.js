"use strict";
/* Bảo vệ i18n: nạp từng game ở chế độ EN (ctx.t trả về bản EN), gọi create()
   rồi quét toàn bộ output (status, tên, DOM) — không được còn ký tự tiếng Việt.
   Test chạy trong tiến trình riêng (node --test) nên globals không đụng test khác. */
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const VN_RE = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳýỷỹỵàáảãèéẻẽìíỉĩòóỏõùúủũÀÁẢÃĐÊÔƠƯ]/;

// ---------- mock DOM tối thiểu + canvas + timer ----------
function mkEl(tag) {
  const set = new Set();
  const qs = {};
  const el = {
    tagName: tag, children: [], _text: "", _html: "", _ev: {}, dataset: {}, type: "", disabled: false,
    width: 300, height: 150, offsetWidth: 50, clientWidth: 300, clientHeight: 150,
    style: { _p: {}, setProperty(k, v) { this._p[k] = v; }, removeProperty(k) { delete this._p[k]; }, getPropertyValue(k) { return this._p[k]; } },
    classList: {
      add: (...c) => c.forEach((x) => set.add(x)), remove: (...c) => c.forEach((x) => set.delete(x)),
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
    appendChild(c) { el.children.push(c); return c; },
    removeChild(c) { el.children = el.children.filter((x) => x !== c); },
    remove() {}, focus() {}, blur() {},
    getBoundingClientRect() { return { height: 50, width: 50, top: 0, left: 0 }; },
    querySelector(sel) { return qs[sel] || (qs[sel] = mkEl("div")); },
    querySelectorAll() { return []; },
    getContext() { return new Proxy({}, { get: () => () => ({ addColorStop() {} }) }); },
  };
  return el;
}

function makeRng(seed) { let x = seed || 7; return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; }; }

const registry = {};
global.document = {
  createElement: (t) => mkEl(t), createElementNS: (ns, t) => mkEl(t),
  querySelector: () => null, addEventListener() {}, removeEventListener() {},
  body: { contains: () => true },
};
global.MutationObserver = class { observe() {} disconnect() {} };
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};
global.setInterval = () => 0; global.setTimeout = () => 0;
global.clearInterval = () => {}; global.clearTimeout = () => {};
global.performance = global.performance || { now: () => 0 };
global.window = {
  GameRegistry: { register: (cfg) => { registry[cfg.id] = cfg; } },
  addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1,
  makeRng, VI_DICT: new Set(["học sinh", "sinh viên"]),
};

function makeCtxEN() {
  const boardEl = mkEl("div");
  const scores = [0, 0];
  const out = [];
  return {
    boardEl, isOnline: false, mySeat: 0, options: {}, rng: makeRng(7), scores, _out: out,
    sound() {}, sendMove() {},
    setNames(a, b) { out.push(String(a), String(b)); },
    t(vi, en) { return en !== undefined ? en : vi; },
    setStatus(s) { out.push(String(s)); },
    setTurn() {}, incScore(p) { scores[p]++; }, decScore() {},
  };
}

function collect(el, out) {
  if (!el || typeof el !== "object") return;
  if (el._text) out.push(el._text);
  if (el._html) out.push(el._html);
  (el.children || []).forEach((c) => collect(c, out));
}

const ids = fs.readdirSync(path.join(__dirname, "..", "js", "games"))
  .filter((f) => f.endsWith(".js")).map((f) => f.replace(/\.js$/, ""));

assert.strictEqual(ids.length, 76, "phải có đúng 76 game");

for (const id of ids) {
  test(`i18n runtime EN sạch tiếng Việt: ${id}`, () => {
    require(path.join(__dirname, "..", "js", "games", id + ".js"));
    const cfg = registry[id];
    assert.ok(cfg && typeof cfg.create === "function", `${id} không đăng ký create`);
    const ctx = makeCtxEN();
    cfg.create(ctx);
    const out = [...ctx._out];
    collect(ctx.boardEl, out);
    const bad = out.filter((s) => VN_RE.test(s));
    assert.deepStrictEqual(
      bad.slice(0, 3).map((s) => s.replace(/\s+/g, " ").slice(0, 120)),
      [],
      `${id} còn chuỗi tiếng Việt khi ở chế độ EN`
    );
  });
}
