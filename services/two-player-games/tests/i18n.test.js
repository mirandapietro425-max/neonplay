"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const I18n = require("../js/i18n");
const GAMES_EN = require("../js/games-i18n");

// ---------- i18n: từ điển ----------
test("i18n: vi và en có cùng tập khóa", () => {
  const viKeys = Object.keys(I18n.DICT.vi).sort();
  const enKeys = Object.keys(I18n.DICT.en).sort();
  const missingEn = viKeys.filter((k) => !(k in I18n.DICT.en));
  const missingVi = enKeys.filter((k) => !(k in I18n.DICT.vi));
  assert.deepStrictEqual(missingEn, [], "thiếu khóa tiếng Anh: " + missingEn.join(", "));
  assert.deepStrictEqual(missingVi, [], "thiếu khóa tiếng Việt: " + missingVi.join(", "));
});

test("i18n: không có giá trị rỗng", () => {
  for (const lang of ["vi", "en"]) {
    for (const [k, v] of Object.entries(I18n.DICT[lang])) {
      assert.ok(typeof v === "string" && v.length > 0, `${lang}.${k} rỗng`);
    }
  }
});

test("i18n: t() trả khóa khi không có bản dịch", () => {
  assert.strictEqual(I18n.t("__khong_ton_tai__"), "__khong_ton_tai__");
});

test("i18n: setLang đổi ngôn ngữ và t() theo đó", () => {
  I18n.setLang("en");
  assert.strictEqual(I18n.getLang(), "en");
  assert.strictEqual(I18n.t("playNow"), I18n.DICT.en.playNow);
  I18n.setLang("vi");
  assert.strictEqual(I18n.t("playNow"), I18n.DICT.vi.playNow);
});

// ---------- games-i18n: phủ đủ toàn bộ game trong registry ----------
test("games-i18n: mọi game trong registry đều có bản dịch EN", () => {
  const dir = path.join(__dirname, "..", "js", "games");
  const realIds = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    const s = fs.readFileSync(path.join(dir, f), "utf8");
    const m = s.match(/register\(\{\s*[\s\S]*?id:\s*"([a-z0-9_]+)"/);
    if (m) realIds.push(m[1]);
  }
  const missing = realIds.filter((id) => !(id in GAMES_EN));
  assert.deepStrictEqual(missing, [], "game chưa dịch EN: " + missing.join(", "));
  assert.strictEqual(realIds.length, 76, "phải có đúng 76 game");
});

test("games-i18n: mỗi mục có name và description không rỗng", () => {
  for (const [id, v] of Object.entries(GAMES_EN)) {
    assert.ok(v.name && v.name.length, `${id} thiếu name`);
    assert.ok(v.description && v.description.length, `${id} thiếu description`);
  }
});

test("games-i18n: mỗi game có howTo (>=3 bước, không rỗng)", () => {
  for (const [id, v] of Object.entries(GAMES_EN)) {
    assert.ok(Array.isArray(v.howTo) && v.howTo.length >= 3, `${id} thiếu howTo`);
    v.howTo.forEach((s, i) => assert.ok(typeof s === "string" && s.length, `${id}.howTo[${i}] rỗng`));
  }
});
