"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { installGlobals, loadGame, makeCtx } = require("./helpers");

installGlobals();

function boardGrid(ctx, cls) {
  const root = ctx.boardEl.children[0];
  if (root.classList.contains(cls)) return root;
  return root.children.find((c) => c.classList && c.classList.contains(cls)) || root;
}

test("Tic-Tac-Toe: X thắng hàng ngang", () => {
  const cfg = loadGame("tictactoe");
  const ctx = makeCtx({ mode: "classic" });
  cfg.create(ctx);
  const grid = boardGrid(ctx, "ttt-board");
  const cells = grid.children;
  cells[0].fire("click"); cells[3].fire("click");
  cells[1].fire("click"); cells[4].fire("click");
  cells[2].fire("click");
  assert.match(ctx.status, /thắng/);
  assert.strictEqual(ctx.scores[0], 1);
});

test("Tic-Tac-Toe: AI Khó chặn nước thắng", () => {
  const cfg = loadGame("tictactoe");
  const ctx = makeCtx({ mode: "classic" });
  const api = cfg.create(ctx);
  api.applyMove({ k: "p", i: 0 });
  api.applyMove({ k: "p", i: 3 });
  api.applyMove({ k: "p", i: 1 });
  const mv = api.aiMove("hard");
  assert.strictEqual(mv.i, 2, "AI phải chặn ở ô 2");
});

test("Connect Four: thắng dọc + undo", () => {
  const cfg = loadGame("connectfour");
  const ctx = makeCtx({});
  cfg.create(ctx);
  const cols = ctx.boardEl.children[0].children;
  cols[0].fire("click"); cols[1].fire("click");
  cols[0].fire("click"); cols[1].fire("click");
  cols[0].fire("click"); cols[1].fire("click");
  cols[0].fire("click"); // P1 dọc 4
  assert.match(ctx.status, /thắng/);
  // undo từ instance khác
  const ctx2 = makeCtx({});
  const api2 = cfg.create(ctx2);
  const cols2 = ctx2.boardEl.children[0].children;
  cols2[3].fire("click");
  const t = ctx2.turn;
  assert.strictEqual(api2.undo(), true);
  assert.notStrictEqual(ctx2.turn, t);
});

test("Nim: AI hard chọn nước tối ưu (xor=0) từ [3,5,7]", () => {
  const cfg = loadGame("nim");
  const ctx = makeCtx({ preset: "classic", mode: "normal", limit: 0 });
  const api = cfg.create(ctx);
  const mv = api.aiMove("hard");
  // áp dụng -> trạng thái còn lại phải có nim-sum = 0
  const rows = [3, 5, 7];
  rows[mv.row] -= mv.count;
  const xor = rows.reduce((a, b) => a ^ b, 0);
  assert.strictEqual(xor, 0, "Nim AI hard phải để lại nim-sum = 0");
});

test("Reversi: lật quân + undo khôi phục", () => {
  const cfg = loadGame("reversi");
  const ctx = makeCtx({ hints: "off" });
  const api = cfg.create(ctx);
  const boardEl = ctx.boardEl.children[0].children.find((c) => c.classList.contains("rv-board"));
  function discs() { let n = 0; for (const cell of boardEl.children) if (cell.children.some((ch) => ch.className && ch.className.includes("rv-disc") && !ch.className.includes("ghost"))) n++; return n; }
  api.applyMove({ r: 2, c: 3 });
  assert.strictEqual(discs(), 5);
  assert.strictEqual(api.undo(), true);
  assert.strictEqual(discs(), 4);
});

test("Gomoku: thắng 5 quân ngang", () => {
  const cfg = loadGame("gomoku");
  const ctx = makeCtx({ size: 15, need: 5 });
  const api = cfg.create(ctx);
  api.applyMove({ r: 7, c: 7 }); api.applyMove({ r: 0, c: 0 });
  api.applyMove({ r: 7, c: 8 }); api.applyMove({ r: 0, c: 1 });
  api.applyMove({ r: 7, c: 9 }); api.applyMove({ r: 0, c: 2 });
  api.applyMove({ r: 7, c: 10 }); api.applyMove({ r: 0, c: 3 });
  api.applyMove({ r: 7, c: 11 });
  assert.match(ctx.status, /thắng/);
});

test("Morris: AI mở màn đánh tâm", () => {
  const cfg = loadGame("morris");
  const ctx = makeCtx({ move: "adjacent" });
  const api = cfg.create(ctx);
  const mv = api.aiMove("hard");
  assert.strictEqual(mv.type, "place");
  assert.strictEqual(mv.to, 4, "tâm bàn là nước mạnh nhất");
});

test("Dots & Boxes: AI trả về cạnh hợp lệ", () => {
  const cfg = loadGame("dotsandboxes");
  const ctx = makeCtx({ cols: 4, rows: 4, bonus: "off" });
  const api = cfg.create(ctx);
  const mv = api.aiMove("normal");
  assert.ok(mv && (mv.type === "h" || mv.type === "v"));
});

test("Mancala: AI trả về hốc hợp lệ của mình", () => {
  const cfg = loadGame("mancala");
  const ctx = makeCtx({});
  const api = cfg.create(ctx);
  const mv = api.aiMove("hard");
  assert.ok(mv >= 0 && mv <= 5, "P1 phải chọn hốc 0-5");
});

test("Quoridor: AI trả về nước đi/đặt tường hợp lệ", () => {
  const cfg = loadGame("quoridor");
  const ctx = makeCtx({ size: 5, walls: 6 });
  const api = cfg.create(ctx);
  const mv = api.aiMove("hard");
  assert.ok(mv && (mv.t === "move" || mv.t === "wall"), "AI phải trả về move hoặc wall");
});

test("Quoridor: AI mở màn tiến về đích (giảm khoảng cách)", () => {
  const cfg = loadGame("quoridor");
  const ctx = makeCtx({ size: 5, walls: 0 }); // không có tường -> chỉ đi quân
  const api = cfg.create(ctx);
  const mv = api.aiMove("normal");
  // P1 (seat 0) ở hàng dưới đi LÊN: nước tốt nhất là tiến 1 hàng về đích
  assert.strictEqual(mv.t, "move");
  assert.ok(mv.r < 4, "phải tiến lên (giảm số hàng)");
});

test("Laser Chess: AI trả về xoay/di chuyển gương hợp lệ", () => {
  const cfg = loadGame("laserchess");
  const ctx = makeCtx({});
  const api = cfg.create(ctx);
  const mv = api.aiMove("hard");
  assert.ok(mv && (mv.t === "rotate" || mv.t === "move"), "AI phải trả về rotate hoặc move");
});

test("Path Lock Duel: AI trả về nước hợp lệ", () => {
  const cfg = loadGame("pathlockduel");
  const ctx = makeCtx({ size: 5, tools: "normal" });
  const api = cfg.create(ctx);
  const mv = api.aiMove("hard");
  assert.ok(mv && ["place", "rotate", "lock", "bomb"].includes(mv.t), "AI phải trả về nước hợp lệ");
});

test("Hangman: dựng được với tùy chọn độ khó + gợi ý", () => {
  const cfg = loadGame("hangman");
  const ctx = makeCtx({ lives: 4, hints: "many" });
  const api = cfg.create(ctx);
  assert.ok(api && typeof api.applyMove === "function");
});

test("Minesweeper: dựng được với tùy chọn gợi ý", () => {
  const cfg = loadGame("minesweeper");
  const ctx = makeCtx({ size: 12, mines: 25, hints: "some" });
  const api = cfg.create(ctx);
  assert.ok(api && typeof api.applyMove === "function");
});

test("Nối Từ: dựng được với tùy chọn gợi ý (không hẹn giờ)", () => {
  const cfg = loadGame("noitu");
  const ctx = makeCtx({ time: 0, hints: "two" }); // time:0 để không tạo setInterval treo test
  const api = cfg.create(ctx);
  assert.ok(api && typeof api.applyMove === "function");
});

test("Pig: AI trả về nước gieo/giữ hợp lệ (đầu ván phải gieo)", () => {
  const cfg = loadGame("pig");
  const ctx = makeCtx({ target: 100 });
  const api = cfg.create(ctx);
  const mv = api.aiMove("normal");
  assert.ok(mv && (mv.kind === "roll" || mv.kind === "hold"));
  assert.strictEqual(mv.kind, "roll", "điểm tạm = 0 thì luôn phải gieo");
  if (mv.kind === "roll") assert.ok(mv.die >= 1 && mv.die <= 6);
});

test("Domino: AI mở màn trả về nước đánh hợp lệ", () => {
  const cfg = loadGame("domino");
  const ctx = makeCtx({});
  const api = cfg.create(ctx);
  const mv = api.aiMove("hard");
  assert.ok(mv && mv.kind === "play", "đầu ván luôn đánh được");
  assert.ok(Array.isArray(mv.tile) && mv.tile.length === 2);
});

test("Auction War: AI đặt giá hợp lệ trong khả năng chi", () => {
  const cfg = loadGame("auctionwar");
  const ctx = makeCtx({ rounds: 8, cash: 140 });
  const api = cfg.create(ctx);
  const mv = api.aiMove("normal");
  assert.ok(mv && mv.kind === "bid" && mv.seat === 1);
  assert.ok(mv.amount >= 0 && mv.amount <= 140, "giá thầu không vượt tiền mặt");
});
