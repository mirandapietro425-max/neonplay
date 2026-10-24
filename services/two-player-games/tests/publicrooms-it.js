/* Kiểm tra tích hợp: phòng công khai (listRooms) + vào nhanh + ẩn phòng private. */
"use strict";
const { spawn } = require("child_process");
const path = require("path");
const WebSocket = require("ws");

const PORT = 8798;
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

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 700));
  try {
    // A tạo phòng công khai
    const a = await open();
    a.send(JSON.stringify({ type: "create", gameId: "tictactoe", playerName: "Alice", public: true }));
    const created = await next(a, "created");
    const code = created.code;

    // B tạo phòng RIÊNG (không công khai)
    const b = await open();
    b.send(JSON.stringify({ type: "create", gameId: "gomoku", playerName: "Bob", public: false }));
    await next(b, "created");

    // C liệt kê phòng -> chỉ thấy phòng công khai của A, không thấy của B
    const c = await open();
    c.send(JSON.stringify({ type: "listRooms" }));
    const list = await next(c, "roomList");
    const codes = list.rooms.map((r) => r.code);
    log(codes.includes(code), "listRooms hien phong cong khai dang cho");
    log(list.rooms.find((r) => r.code === code).hostName === "Alice", "phong cong khai kem ten chu phong");
    log(list.rooms.every((r) => r.gameId !== "gomoku"), "phong rieng (public=false) bi an khoi danh sach");

    // C vào nhanh phòng công khai bằng code -> cả hai start
    const startA = next(a, "start");
    c.send(JSON.stringify({ type: "join", code, playerName: "Charlie" }));
    const joined = await next(c, "joined");
    await startA;
    log(joined.seat === 1 && joined.code === code, "vao nhanh phong cong khai thanh cong");

    // Sau khi đủ người, phòng không còn trong danh sách công khai
    const d = await open();
    d.send(JSON.stringify({ type: "listRooms" }));
    const list2 = await next(d, "roomList");
    log(!list2.rooms.some((r) => r.code === code), "phong da day nguoi khong con trong danh sach");

    [a, b, c, d].forEach((w) => w.close());
    console.log(process.exitCode ? "FAIL" : "ALL PASS");
  } catch (e) {
    console.error("ERR", e.message);
    process.exitCode = 1;
  } finally {
    srv.kill();
    setTimeout(() => process.exit(process.exitCode || 0), 200);
  }
})();
