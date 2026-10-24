"use strict";
// ---------------------------------------------------------------------------
// Phủ test "build + AI hợp lệ" cho các game CHƯA có test logic riêng.
// Mục tiêu: lá chắn chống hồi quy khi sửa game về sau — đảm bảo mỗi game:
//   • create(ctx) không ném lỗi và trả về object có applyMove (hoặc tương đương),
//   • nếu có aiMove thì gọi được và trả về nước (không ném lỗi),
//   • destroy() (nếu có) gọi được để dọn timer/RAF.
// Dùng makeCtx headless; options chọn time:0 ở game có đồng hồ để tránh treo.
// ---------------------------------------------------------------------------
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { installGlobals, loadGame, makeCtx } = require("./helpers");

installGlobals();

// Mọi id game suy ra từ thư mục js/games/ (1 file = 1 game tự đăng ký).
const GAMES_DIR = path.join(__dirname, "..", "js", "games");
const ALL_IDS = fs.readdirSync(GAMES_DIR)
  .filter((f) => f.endsWith(".js"))
  .map((f) => f.replace(/\.js$/, ""));

// Options an toàn cho từng game (time:0 cho game có đồng hồ để không tạo setInterval treo).
// time:0 được áp MẶC ĐỊNH cho mọi game qua aiOpts() bên dưới (vô hại với game không có đồng hồ).
const SAFE_OPTS = {
  bullscows: { time: 0 },
  coopdefense: { time: 0 },
  crystalconquest: { time: 0 },
  dicebattle: { time: 0 },
  fishingfrenzy: { time: 0 },
  memory: { time: 0 },
  pentago: { time: 0 },
  tankarena: { time: 0 },
  territorywar: { time: 0 },
  yahtzee: { time: 0 },
};
// Gộp time:0 mặc định + options riêng của game (dùng cho khối quét AI động).
function aiOpts(id) { return Object.assign({ time: 0 }, SAFE_OPTS[id]); }

// Danh sách game chưa có test riêng (xem games.test.js cho phần đã test).
const GAMES = [
  "artillery", "basedefenseduel", "battleship", "bullscows", "checkers",
  "coopdefense", "crystalconquest", "dicebattle", "dungeonrival", "fishingfrenzy",
  "hex", "hiddenassassin", "hunterswarm", "isolation", "memory",
  "orderchaos", "pentago", "pong", "poolbattle", "robotfactorywar",
  "seabattleplus", "slingshotbattle", "stratego", "submarinehunt", "tankarena",
  "territorywar", "timeloopduel", "trapmansion", "treasure", "yahtzee",
  "reactionduel", "dashdodge", "snakesladders", "liarsdice", "codebreakerduel", "blackjackduel", "twentyquestions", "wordduel", "tugofwar", "typingrace", "numberduel", "prisonersdilemma", "rpsplus", "tycoon", "colorwar", "defusebomb",
  "sim", "minichess", "sprouts", "boxpush", "mazecoop",
];

for (const id of GAMES) {
  test(`coverage: ${id} dựng được + API hợp lệ`, () => {
    const cfg = loadGame(id);
    assert.ok(cfg && typeof cfg.create === "function", `${id}: thiếu create()`);

    const ctx = makeCtx(SAFE_OPTS[id] || {});
    let api;
    assert.doesNotThrow(() => { api = cfg.create(ctx); }, `${id}: create() ném lỗi`);
    assert.ok(api && typeof api === "object", `${id}: create() phải trả về object`);

    // Phải có ít nhất một trong các phương thức tương tác chuẩn.
    const hasEntry = ["applyMove", "aiMove", "undo", "destroy"].some((k) => typeof api[k] === "function");
    assert.ok(hasEntry, `${id}: API không có applyMove/aiMove/undo/destroy`);

    // boardEl phải được gắn nội dung (game đã render gì đó).
    assert.ok(ctx.boardEl.children.length > 0, `${id}: không render gì vào boardEl`);

    // dọn dẹp nếu có destroy
    if (typeof api.destroy === "function") {
      assert.doesNotThrow(() => api.destroy(), `${id}: destroy() ném lỗi`);
    }
  });
}

// ---- AI: gọi được và trả nước, không ném lỗi (mức Khó) ----
// Quét ĐỘNG toàn bộ registry: mọi game khai báo supportsAI VÀ expose aiMove()
// đều được kiểm tra (tự bao game thêm về sau). Game lái AI nội bộ qua ctx.vsAI
// + timer (vd tycoon/colorwar) không expose aiMove — phần create() của chúng
// đã được khối coverage ở trên kiểm tra.
const AI_GAMES = [];
for (const id of ALL_IDS) {
  let cfg;
  try { cfg = loadGame(id); } catch { continue; }
  if (!cfg || !cfg.supportsAI) continue;
  let api;
  try { api = cfg.create(makeCtx(aiOpts(id))); } catch { AI_GAMES.push(id); continue; }
  if (api && typeof api.aiMove === "function") AI_GAMES.push(id);
}

for (const id of AI_GAMES) {
  test(`coverage AI: ${id} aiMove("hard") trả nước không lỗi`, () => {
    const cfg = loadGame(id);
    const ctx = makeCtx(aiOpts(id));
    const api = cfg.create(ctx);
    assert.strictEqual(typeof api.aiMove, "function", `${id}: thiếu aiMove`);
    let mv;
    assert.doesNotThrow(() => { mv = api.aiMove("hard"); }, `${id}: aiMove ném lỗi`);
    // nước hợp lệ có thể là object (đa số) hoặc số (vd connectfour=cột, mancala=hốc);
    // khớp cách main.js chấp nhận: chỉ cần khác null/undefined.
    assert.ok(mv !== null && mv !== undefined, `${id}: aiMove phải trả về một nước (khác null)`);
    if (typeof api.destroy === "function") api.destroy();
  });
}

// Sanity: chắc chắn quét động thực sự phủ được nhiều game (chống hồi quy khi
// helpers/registry đổi và danh sách bỗng rỗng).
test("coverage AI: quét động phủ đủ số game hỗ trợ AI", () => {
  assert.ok(AI_GAMES.length >= 30,
    `Chỉ phát hiện ${AI_GAMES.length} game có aiMove — nghi quét động hỏng (kỳ vọng ≥30).`);
});
