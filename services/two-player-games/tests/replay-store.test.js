"use strict";
// ---------------------------------------------------------------------------
// Test logic LƯU REPLAY (js/replay-store.js) — phần thuần, không DOM/localStorage.
// Gồm cả test "vòng đầy đủ": lưu chuỗi nước của một ván qua store -> lấy lại ->
// dựng lại ván bằng instance mới, xác minh kết quả khớp (gắn lưu trữ với replay thật).
// ---------------------------------------------------------------------------
const { test } = require("node:test");
const assert = require("node:assert");
const RS = require("../js/replay-store");
const { installGlobals, loadGame, makeCtx } = require("./helpers");

installGlobals();

test("addReplay: thêm bản ghi và KHÔNG sửa store gốc", () => {
  const store = {};
  const next = RS.addReplay(store, "r1", { moves: [1], ts: 100 }, 20);
  assert.deepStrictEqual(store, {}, "store gốc phải bất biến");
  assert.ok(next.r1, "store mới có bản ghi r1");
  assert.deepStrictEqual(next.r1.moves, [1]);
});

test("addReplay: giữ đúng MAX bản ghi mới nhất theo ts", () => {
  let store = {};
  for (let i = 1; i <= 25; i++) store = RS.addReplay(store, "r" + i, { moves: [i], ts: i * 10 }, 20);
  const keys = Object.keys(store);
  assert.strictEqual(keys.length, 20, "chỉ giữ tối đa 20 bản ghi");
  // 5 bản cũ nhất (ts nhỏ nhất) bị loại
  assert.ok(!store.r1 && !store.r5, "bản cũ nhất bị cắt");
  assert.ok(store.r25 && store.r6, "bản mới nhất được giữ");
});

test("addReplay: max <= 0 thì không cắt bớt", () => {
  let store = {};
  for (let i = 1; i <= 30; i++) store = RS.addReplay(store, "r" + i, { moves: [i], ts: i }, 0);
  assert.strictEqual(Object.keys(store).length, 30);
});

test("getReplay: null khi thiếu hoặc moves rỗng, trả data khi hợp lệ", () => {
  const store = {
    ok: { moves: [{ x: 1 }], ts: 1 },
    empty: { moves: [], ts: 2 },
    nomoves: { ts: 3 },
  };
  assert.strictEqual(RS.getReplay(store, "missing"), null);
  assert.strictEqual(RS.getReplay(store, "empty"), null);
  assert.strictEqual(RS.getReplay(store, "nomoves"), null);
  assert.ok(RS.getReplay(store, "ok"));
  assert.strictEqual(RS.getReplay(null, "ok"), null);
});

test("makeReplayId: đúng định dạng và khác nhau theo đầu vào", () => {
  const a = RS.makeReplayId(1700000000000, 0.123456);
  const b = RS.makeReplayId(1700000000001, 0.987654);
  assert.match(a, /^r[a-z0-9]+$/, "id bắt đầu bằng 'r' và chỉ gồm chữ-số");
  assert.notStrictEqual(a, b, "đầu vào khác cho id khác");
});

test("VÒNG ĐẦY ĐỦ: lưu qua store -> lấy lại -> dựng lại ván Tic-Tac-Toe khớp kết quả", () => {
  const cfg = loadGame("tictactoe");
  const opts = { mode: "classic" };

  // 1) Chơi ván gốc, thu thập chuỗi nước (giống main.js đẩy vào replayMoves)
  const moves = [];
  const live = makeCtx(opts, 7);
  live.isOnline = true; live.mySeat = 0; live.firstSeat = 0; live.round = 1;
  live.sendMove = (mv) => moves.push(mv);
  const liveApi = cfg.create(live);
  [{ k: "p", i: 0 }, { k: "p", i: 3 }, { k: "p", i: 1 }, { k: "p", i: 4 }, { k: "p", i: 2 }]
    .forEach((mv) => liveApi.applyMove(mv, false));
  assert.strictEqual(live.scores[0], 1, "X thắng ở ván gốc");

  // 2) Lưu replay vào store (kèm seed/options/moves) rồi lấy lại bằng id
  const rid = RS.makeReplayId(Date.now(), Math.random());
  const store = RS.addReplay({}, rid, {
    id: "tictactoe", seed: 7, firstSeat: 0, round: 1, options: opts, moves: moves.slice(), ts: Date.now(),
  }, 20);
  const data = RS.getReplay(store, rid);
  assert.ok(data && data.moves.length === 5, "lấy lại được replay đủ 5 nước");

  // 3) Dựng lại từ dữ liệu đã lưu: instance mới + applyMove(move, true)
  const sink = [];
  const replay = makeCtx(data.options, data.seed);
  replay.isOnline = true; replay.mySeat = -1; replay.firstSeat = data.firstSeat; replay.round = data.round;
  replay.sendMove = () => sink.push("__SHOULD_NOT_HAPPEN__");
  const replayApi = cfg.create(replay);
  data.moves.forEach((mv) => replayApi.applyMove(mv, true));

  assert.deepStrictEqual(sink, [], "phát lại không gửi lại nước nào");
  assert.strictEqual(replay.scores[0], 1, "dựng lại từ replay đã lưu tái hiện đúng X thắng");
});
