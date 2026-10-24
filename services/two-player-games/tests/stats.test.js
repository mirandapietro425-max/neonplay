"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const SU = require("../js/stats-util");

// ---------- Thử thách hằng ngày ----------
test("dailyIndex: tất định theo ngày + số game", () => {
  const a = SU.dailyIndex("2026-06-08", 47);
  const b = SU.dailyIndex("2026-06-08", 47);
  assert.strictEqual(a, b, "cùng ngày + cùng n phải ra cùng chỉ số");
  assert.ok(a >= 0 && a < 47, "chỉ số nằm trong [0, n)");
});

test("dailyIndex: đổi ngày thường đổi game", () => {
  const days = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05"];
  const idxs = days.map((d) => SU.dailyIndex(d, 47));
  const distinct = new Set(idxs);
  assert.ok(distinct.size >= 3, "5 ngày liên tiếp nên cho ít nhất 3 game khác nhau");
});

test("dailyIndex: n=0 trả -1", () => {
  assert.strictEqual(SU.dailyIndex("2026-06-08", 0), -1);
});

test("dailyDateStr: định dạng YYYY-MM-DD đệm 0", () => {
  assert.strictEqual(SU.dailyDateStr(new Date(2026, 0, 5)), "2026-01-05");
});

// ---------- Kết quả ván (history) ----------
test("histOutcome: hòa", () => {
  assert.strictEqual(SU.histOutcome({ kind: "draw", mode: "ai", winner: 0 }), "draw");
});
test("histOutcome: đấu máy thắng/thua", () => {
  assert.strictEqual(SU.histOutcome({ kind: "win", mode: "ai", winner: 0 }), "win");
  assert.strictEqual(SU.histOutcome({ kind: "win", mode: "ai", winner: 1 }), "lose");
});
test("histOutcome: online theo ghế của mình", () => {
  assert.strictEqual(SU.histOutcome({ kind: "win", mode: "online", winner: 1, seat: 1 }), "win");
  assert.strictEqual(SU.histOutcome({ kind: "win", mode: "online", winner: 0, seat: 1 }), "lose");
});

// ---------- Bảng xếp hạng ----------
test("sortLeaderboard: sắp theo thắng P1 rồi chuỗi thắng", () => {
  const stats = {
    a: { played: 5, p1: 1, p2: 4, draw: 0, bestStreak: 1 },
    b: { played: 9, p1: 5, p2: 4, draw: 0, bestStreak: 2 },
    c: { played: 6, p1: 5, p2: 1, draw: 0, bestStreak: 4 },
    z: { played: 0, p1: 0, p2: 0, draw: 0, bestStreak: 0 },
  };
  const rows = SU.sortLeaderboard(stats);
  assert.strictEqual(rows.length, 3, "bỏ game chưa chơi");
  assert.strictEqual(rows[0].id, "c", "thắng bằng nhau thì chuỗi thắng cao hơn lên trước");
  assert.strictEqual(rows[1].id, "b");
  assert.strictEqual(rows[2].id, "a");
});

// ---------- Chuỗi thắng ----------
test("nextStreak: thắng liên tiếp tăng, thua reset", () => {
  let s = SU.nextStreak(0, 0, "win", 0);
  assert.deepStrictEqual(s, { streak: 1, bestStreak: 1 });
  s = SU.nextStreak(s.streak, s.bestStreak, "win", 0);
  assert.deepStrictEqual(s, { streak: 2, bestStreak: 2 });
  s = SU.nextStreak(s.streak, s.bestStreak, "win", 1); // thua
  assert.deepStrictEqual(s, { streak: 0, bestStreak: 2 });
  s = SU.nextStreak(s.streak, s.bestStreak, "draw", 0); // hòa
  assert.deepStrictEqual(s, { streak: 0, bestStreak: 2 });
});

// ---------- Replay capture (mô phỏng thứ tự nước đi) ----------
test("replay capture: log giữ đúng thứ tự áp dụng", () => {
  // Mô phỏng: nước của mình đẩy khi gửi, nước đối thủ đẩy khi nhận.
  const log = [];
  function myMove(m) { log.push(m); }        // ctx.sendMove
  function theirMove(m) { log.push(m); }      // Net.on("move")
  myMove({ i: 1 });
  theirMove({ i: 2 });
  myMove({ i: 3 });
  theirMove({ i: 4 });
  assert.deepStrictEqual(log.map((x) => x.i), [1, 2, 3, 4]);
});
