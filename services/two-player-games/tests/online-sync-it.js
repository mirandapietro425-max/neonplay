/* Kiểm tra tích hợp ĐỒNG BỘ cho các game online mới: tạo phòng cho từng game,
   relay một nước đi đặc trưng và xác minh đối thủ nhận ĐÚNG payload (giữ nguyên
   cấu trúc). Server là relay game-agnostic nên test này bảo chứng rằng các hành
   động (die / bid / guess / hit / ask...) đi qua mạng không bị biến dạng. */
"use strict";
const { spawn } = require("child_process");
const path = require("path");
const WebSocket = require("ws");

const PORT = 8796;
const URL = `ws://127.0.0.1:${PORT}`;

function open() {
  return new Promise((res, rej) => {
    const ws = new WebSocket(URL);
    ws.on("open", () => res(ws));
    ws.on("error", rej);
  });
}
function next(ws, type) {
  return new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error("timeout " + type)), 3000);
    const on = (raw) => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.type === type) { clearTimeout(to); ws.off("message", on); res(m); }
    };
    ws.on("message", on);
  });
}
function log(ok, msg) { console.log((ok ? "\u2714 " : "\u2718 ") + msg); if (!ok) process.exitCode = 1; }

// một nước đi mẫu cho mỗi game online mới
const CASES = [
  { gameId: "ultimatettt", move: { b: 4, c: 0 }, check: (m) => m.move.b === 4 && m.move.c === 0 },
  { gameId: "snakesladders", move: { die: 5 }, check: (m) => m.move.die === 5 },
  { gameId: "liarsdice", move: { k: "bid", qty: 3, face: 4 }, check: (m) => m.move.k === "bid" && m.move.qty === 3 && m.move.face === 4 },
  { gameId: "codebreakerduel", move: { k: "guess", code: [0, 1, 2, 3] }, check: (m) => m.move.k === "guess" && Array.isArray(m.move.code) && m.move.code.length === 4 },
  { gameId: "blackjackduel", move: { k: "hit" }, check: (m) => m.move.k === "hit" },
  { gameId: "twentyquestions", move: { k: "ask", text: "Nó có sống không?" }, check: (m) => m.move.k === "ask" && m.move.text.length > 0 },
  { gameId: "wordduel", move: { k: "word", idx: [0, 1] }, check: (m) => m.move.k === "word" && m.move.idx.length === 2 },
  { gameId: "numberduel", move: { k: "pick", n: 4 }, check: (m) => m.move.k === "pick" && m.move.n === 4 },
  { gameId: "prisonersdilemma", move: { k: "pick", c: "D" }, check: (m) => m.move.k === "pick" && m.move.c === "D" },
  { gameId: "rpsplus", move: { k: "pick", c: "R" }, check: (m) => m.move.k === "pick" && m.move.c === "R" },
  { gameId: "tycoon", move: { k: "roll", die: 4 }, check: (m) => m.move.k === "roll" && m.move.die === 4 },
  { gameId: "colorwar", move: { k: "color", ci: 2 }, check: (m) => m.move.k === "color" && m.move.ci === 2 },
  { gameId: "sim", move: { e: 0 }, check: (m) => m.move.e === 0 },
  { gameId: "breakthrough", move: { from: [6, 0], to: [5, 0] }, check: (m) => Array.isArray(m.move.from) && m.move.from[0] === 6 && m.move.to[0] === 5 },
  { gameId: "coganh", move: { from: [4, 2], to: [3, 2] }, check: (m) => Array.isArray(m.move.from) && m.move.from[0] === 4 && m.move.from[1] === 2 && m.move.to[0] === 3 },
  { gameId: "minichess", move: { from: 18, to: 13 }, check: (m) => m.move.from === 18 && m.move.to === 13 },
  { gameId: "sprouts", move: { a: 0, b: 1 }, check: (m) => m.move.a === 0 && m.move.b === 1 },
  { gameId: "typingrace", move: { k: "prog", i: 3 }, check: (m) => m.move.k === "prog" && m.move.i === 3 },
  { gameId: "reactionduel", move: { k: "rt", ms: 240 }, check: (m) => m.move.k === "rt" && m.move.ms === 240 },
  { gameId: "boxpush", move: { k: "move", seat: 0, dir: "right" }, check: (m) => m.move.k === "move" && m.move.dir === "right" },
  { gameId: "mazecoop", move: { k: "move", seat: 1, dir: "up" }, check: (m) => m.move.k === "move" && m.move.seat === 1 },
  { gameId: "defusebomb", move: { k: "cut", m: 0, idx: 2 }, check: (m) => m.move.k === "cut" && m.move.m === 0 && m.move.idx === 2 },
];

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 700));
  try {
    for (const c of CASES) {
      const a = await open();
      a.send(JSON.stringify({ type: "create", gameId: c.gameId, playerName: "A" }));
      const created = await next(a, "created");

      const b = await open();
      const startA = next(a, "start");
      b.send(JSON.stringify({ type: "join", code: created.code, playerName: "B" }));
      await next(b, "joined");
      const startMsg = await startA;
      log(startMsg.gameId === c.gameId, `${c.gameId}: tao phong + ca hai vao start dung game`);

      // A gửi nước -> B nhận đúng payload
      const bMove = next(b, "move");
      a.send(JSON.stringify({ type: "move", move: c.move }));
      const got = await bMove;
      log(!!got.move && c.check(got), `${c.gameId}: nuoc di relay sang doi thu giu nguyen payload`);

      a.close(); b.close();
      await new Promise((r) => setTimeout(r, 120));
    }
    console.log(process.exitCode ? "FAIL" : "ALL PASS");
  } catch (e) {
    console.error("ERR", e.message);
    process.exitCode = 1;
  } finally {
    srv.kill();
    setTimeout(() => process.exit(process.exitCode || 0), 200);
  }
})();
