"use strict";
// ---------------------------------------------------------------------------
// Test luồng REPLAY (xem lại ván online).
// Cơ chế thật trong main.js: khi chơi online, mỗi nước được đẩy qua ctx.sendMove
// và lưu vào replayMoves; khi xem lại, tạo instance mới rồi applyMove(move, true)
// lần lượt để dựng lại đúng diễn biến. Test này mô phỏng đúng vòng đó.
// ---------------------------------------------------------------------------
const { test } = require("node:test");
const assert = require("node:assert");
const { installGlobals, loadGame, makeCtx } = require("./helpers");

installGlobals();

// ctx kiểu online cho người đi (seat). Mọi nước hợp lệ được ghi vào captured[].
function makeOnlineCtx(options, seat, captured, seed) {
  const ctx = makeCtx(options, seed);
  ctx.isOnline = true;
  ctx.mySeat = seat;
  ctx.firstSeat = 0;
  ctx.round = 1;
  ctx.sendMove = (mv) => { captured.push(mv); };
  return ctx;
}

// ctx kiểu "xem lại": không tương tác, chỉ nhận applyMove(move, true).
function makeReplayCtx(options, captured, seed) {
  const ctx = makeCtx(options, seed);
  ctx.isOnline = true;
  ctx.mySeat = -1;   // -1 => không phải lượt của ai cả, chỉ phát lại
  ctx.firstSeat = 0;
  ctx.round = 1;
  ctx.sendMove = () => { captured.push("__SHOULD_NOT_HAPPEN__"); };
  return ctx;
}

test("replay: dựng lại ván Tic-Tac-Toe khớp kết quả gốc", () => {
  const cfg = loadGame("tictactoe");
  const opts = { mode: "classic" };

  // ---- Ván gốc: X thắng hàng ngang trên cùng (0,1,2) ----
  const moves = [];
  const live = makeOnlineCtx(opts, 0, moves, 7);
  const liveApi = cfg.create(live);
  // X đi (seat 0), O đi (seat 1) xen kẽ; fromRemote=false để kích hoạt sendMove
  liveApi.applyMove({ k: "p", i: 0 }, false); // X
  liveApi.applyMove({ k: "p", i: 3 }, false); // O
  liveApi.applyMove({ k: "p", i: 1 }, false); // X
  liveApi.applyMove({ k: "p", i: 4 }, false); // O
  liveApi.applyMove({ k: "p", i: 2 }, false); // X thắng

  assert.strictEqual(moves.length, 5, "phải ghi đủ 5 nước vào replay log");
  assert.strictEqual(live.scores[0], 1, "X phải thắng ở ván gốc");
  assert.match(live.status, /thắng/);

  // ---- Phát lại: instance mới + applyMove(move, true) lần lượt ----
  const sink = [];
  const replay = makeReplayCtx(opts, sink, 7);
  const replayApi = cfg.create(replay);
  moves.forEach((mv) => replayApi.applyMove(mv, true));

  assert.deepStrictEqual(sink, [], "phát lại KHÔNG được gửi lại nước nào (fromRemote=true)");
  assert.strictEqual(replay.scores[0], 1, "phát lại phải tái hiện đúng kết quả X thắng");
  assert.match(replay.status, /thắng/);
});

test("replay: phát lại từng phần (prev/next) cho trạng thái trung gian hợp lệ", () => {
  const cfg = loadGame("tictactoe");
  const opts = { mode: "classic" };

  const moves = [];
  const live = makeOnlineCtx(opts, 0, moves, 7);
  const liveApi = cfg.create(live);
  liveApi.applyMove({ k: "p", i: 0 }, false);
  liveApi.applyMove({ k: "p", i: 3 }, false);
  liveApi.applyMove({ k: "p", i: 1 }, false);
  liveApi.applyMove({ k: "p", i: 4 }, false);
  liveApi.applyMove({ k: "p", i: 2 }, false);

  // Dựng lại tới mốc n nước (giống rebuildReplay(n)): tạo instance mới mỗi lần.
  function rebuildTo(n) {
    const sink = [];
    const ctx = makeReplayCtx(opts, sink, 7);
    const api = cfg.create(ctx);
    for (let i = 0; i < n; i++) api.applyMove(moves[i], true);
    return ctx;
  }

  // Dùng scores để xác định người thắng (status luôn chứa chữ "thắng" trong hướng dẫn).
  const at0 = rebuildTo(0);
  assert.strictEqual(at0.scores[0], 0, "0 nước thì chưa có người thắng");
  const at4 = rebuildTo(4);
  assert.strictEqual(at4.scores[0], 0, "sau 4 nước X chưa thắng");
  const at5 = rebuildTo(5);
  assert.strictEqual(at5.scores[0], 1, "đủ 5 nước X thắng");
});

test("replay: Connect Four dựng lại khớp chuỗi nước (thắng dọc)", () => {
  const cfg = loadGame("connectfour");
  const opts = {};

  const moves = [];
  const live = makeOnlineCtx(opts, 0, moves, 7);
  const liveApi = cfg.create(live);
  // applyMove(col, false) đi trực tiếp (không bị chặn theo seat như onClick).
  // P1 dồn cột 0, P2 dồn cột 1 -> P1 thắng dọc 4
  liveApi.applyMove(0, false); liveApi.applyMove(1, false);
  liveApi.applyMove(0, false); liveApi.applyMove(1, false);
  liveApi.applyMove(0, false); liveApi.applyMove(1, false);
  liveApi.applyMove(0, false);

  assert.ok(moves.length >= 7, "phải ghi lại các nước vào replay log");
  assert.strictEqual(live.scores[0], 1, "P1 thắng ở ván gốc");

  const sink = [];
  const replay = makeReplayCtx(opts, sink, 7);
  const replayApi = cfg.create(replay);
  moves.forEach((mv) => replayApi.applyMove(mv, true));

  assert.deepStrictEqual(sink, [], "phát lại không gửi lại nước");
  assert.strictEqual(replay.scores[0], 1, "phát lại tái hiện đúng P1 thắng");
});
