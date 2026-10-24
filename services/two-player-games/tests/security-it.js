/* Kiểm tra tích hợp các lớp chống lạm dụng / DoS của server:
   - Giới hạn số kết nối theo IP (MAX_CONNECTIONS_PER_IP)
   - Giới hạn tổng số phòng (MAX_ROOMS)
   - maxPayload: frame quá lớn bị đóng ngay ở tầng ws
   Chạy server với hạn mức thấp qua biến môi trường để test nhanh & tất định. */
"use strict";
const { spawn } = require("child_process");
const path = require("path");
const WebSocket = require("ws");

const PORT = 8799;
const URL = `ws://127.0.0.1:${PORT}`;

function open() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    const to = setTimeout(() => reject(new Error("open timeout")), 3000);
    ws.on("open", () => { clearTimeout(to); resolve(ws); });
    ws.on("error", (e) => { clearTimeout(to); reject(e); });
  });
}
// Mở một kết nối và cho biết nó có bị server đóng ngay không (true = bị đóng/từ chối).
function openAndWatch() {
  return new Promise((resolve) => {
    const ws = new WebSocket(URL);
    let closed = false;
    ws.on("close", () => { closed = true; });
    ws.on("error", () => { closed = true; });
    ws.on("open", () => {
      // chờ một nhịp để server kịp đóng nếu vượt hạn mức
      setTimeout(() => resolve({ ws, closed }), 250);
    });
    // nếu không mở được trong 2s coi như bị từ chối
    setTimeout(() => { if (ws.readyState !== WebSocket.OPEN) resolve({ ws, closed: true }); }, 2000);
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
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, PORT: String(PORT), MAX_CONNECTIONS_PER_IP: "3", MAX_ROOMS: "2" },
    stdio: "ignore",
  });
  await new Promise((r) => setTimeout(r, 700));
  const sockets = [];
  try {
    // ---- 1) Giới hạn kết nối theo IP: cho phép 3, kết nối thứ 4 bị đóng ----
    for (let i = 0; i < 3; i++) {
      const r = await openAndWatch();
      sockets.push(r.ws);
      log(!r.closed, `ket noi #${i + 1} trong han muc duoc giu`);
    }
    const fourth = await openAndWatch();
    sockets.push(fourth.ws);
    log(fourth.closed, "ket noi thu 4 vuot han muc IP bi dong");

    // Đóng bớt để còn chỗ cho các phần test sau (giải phóng bộ đếm IP).
    sockets.forEach((w) => { try { w.close(); } catch { /* ignore */ } });
    sockets.length = 0;
    await new Promise((r) => setTimeout(r, 300));

    // ---- 2) Giới hạn tổng số phòng: MAX_ROOMS=2 -> phòng thứ 3 bị từ chối ----
    const a = await open(); sockets.push(a);
    a.send(JSON.stringify({ type: "create", gameId: "tictactoe", playerName: "A" }));
    await next(a, "created");
    const b = await open(); sockets.push(b);
    b.send(JSON.stringify({ type: "create", gameId: "tictactoe", playerName: "B" }));
    await next(b, "created");
    const c = await open(); sockets.push(c);
    const cErr = next(c, "error");
    c.send(JSON.stringify({ type: "create", gameId: "tictactoe", playerName: "C" }));
    const err = await cErr;
    log(/phòng|room/i.test(err.message || ""), "tao phong vuot MAX_ROOMS bi tu choi");

    // ---- 3) maxPayload: frame vuot MAX_MESSAGE_BYTES bi dong ngay ----
    const d = await open();
    let dClosed = false;
    d.on("close", () => { dClosed = true; });
    d.send(JSON.stringify({ type: "chat", text: "x".repeat(20000) }));
    await new Promise((r) => setTimeout(r, 400));
    log(dClosed, "frame qua lon bi dong o tang ws (maxPayload)");

    console.log(process.exitCode ? "FAIL" : "ALL PASS");
  } catch (e) {
    console.error("ERR", e.message);
    process.exitCode = 1;
  } finally {
    sockets.forEach((w) => { try { w.close(); } catch { /* ignore */ } });
    srv.kill();
    setTimeout(() => process.exit(process.exitCode || 0), 200);
  }
})();
