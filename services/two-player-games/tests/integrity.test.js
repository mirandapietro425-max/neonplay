"use strict";
// ---------------------------------------------------------------------------
// Test TOÀN VẸN METADATA — bắt sớm các lỗi "quên thêm key / quên id / thiếu mô tả".
//  1. Mọi $("id") trong main.js đều có phần tử id tương ứng trong index.html.
//  2. Mọi data-i18n / data-i18n-ph / data-i18n-title trong index.html đều có key
//     trong CẢ hai từ điển vi & en của i18n.js.
//  3. Mọi game trong registry có đủ name/description/howTo (qua games-i18n) và
//     bản gốc khai báo emoji.
// ---------------------------------------------------------------------------
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const I18n = require("../js/i18n");
const GAMES_EN = require("../js/games-i18n");

const ROOT = path.join(__dirname, "..");
const mainSrc = fs.readFileSync(path.join(ROOT, "js", "main.js"), "utf8");
const htmlSrc = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

function htmlIds() {
  const ids = new Set();
  const re = /\bid="([^"]+)"/g;
  let m;
  while ((m = re.exec(htmlSrc))) ids.add(m[1]);
  return ids;
}

// ---------- 1. $("id") -> phải có trong index.html ----------
test("integrity: mọi $(\"id\") trong main.js đều tồn tại trong index.html", () => {
  const ids = htmlIds();
  const re = /\$\(\s*"([^"]+)"\s*\)/g;
  const missing = new Set();
  let m;
  while ((m = re.exec(mainSrc))) {
    const id = m[1];
    if (!ids.has(id)) missing.add(id);
  }
  assert.deepStrictEqual(
    [...missing],
    [],
    "Các id dùng trong main.js nhưng KHÔNG có trong index.html:\n  " + [...missing].join(", ")
  );
});

// ---------- 2. data-i18n* -> phải có key trong vi & en ----------
test("integrity: mọi data-i18n trong index.html đều có key ở vi & en", () => {
  const attrs = ["data-i18n", "data-i18n-ph", "data-i18n-title", "data-i18n-aria"];
  const keys = new Set();
  for (const a of attrs) {
    const re = new RegExp(a + '="([^"]+)"', "g");
    let m;
    while ((m = re.exec(htmlSrc))) keys.add(m[1]);
  }
  const missing = [];
  for (const k of keys) {
    if (!(k in I18n.DICT.vi)) missing.push("vi." + k);
    if (!(k in I18n.DICT.en)) missing.push("en." + k);
  }
  assert.deepStrictEqual(
    missing,
    [],
    "Khóa data-i18n trong index.html nhưng thiếu trong từ điển:\n  " + missing.join(", ")
  );
});

// ---------- 3. game metadata đầy đủ ----------
function registryIds() {
  const dir = path.join(ROOT, "js", "games");
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    const s = fs.readFileSync(path.join(dir, f), "utf8");
    const m = s.match(/register\(\{\s*[\s\S]*?id:\s*"([a-z0-9_]+)"/);
    if (m) out.push({ id: m[1], file: f, src: s });
  }
  return out;
}

test("integrity: mọi game có bản dịch EN đầy đủ (name/description/howTo)", () => {
  const games = registryIds();
  const problems = [];
  for (const g of games) {
    const v = GAMES_EN[g.id];
    if (!v) { problems.push(`${g.id}: thiếu mục trong games-i18n`); continue; }
    if (!v.name || !v.name.length) problems.push(`${g.id}: thiếu name`);
    if (!v.description || !v.description.length) problems.push(`${g.id}: thiếu description`);
    if (!Array.isArray(v.howTo) || v.howTo.length < 3) problems.push(`${g.id}: howTo < 3 bước`);
  }
  assert.deepStrictEqual(problems, [], "Vấn đề metadata EN:\n  " + problems.join("\n  "));
});

test("integrity: mọi game khai báo emoji trong register()", () => {
  const games = registryIds();
  const problems = [];
  for (const g of games) {
    // tìm emoji: "..." trong khối register của file
    if (!/emoji:\s*"[^"]+"/.test(g.src)) problems.push(`${g.file}: không thấy khai báo emoji`);
  }
  assert.deepStrictEqual(problems, [], "Game thiếu emoji:\n  " + problems.join("\n  "));
});
