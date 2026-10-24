/* Kiểm tra tích hợp: phòng riêng tư có mật khẩu.
   - Tạo phòng có mật khẩu, vào đúng mật khẩu -> start.
   - Vào sai mật khẩu / thiếu mật khẩu -> bị từ chối.
   - Phòng công khai có mật khẩu hiện trong listRooms kèm cờ locked.
   - Phòng KHÔNG mật khẩu vẫn vào được như cũ (không hồi quy). */
"use strict";
const { spawn } = require("child_process");
const path = require("path");
const WebSocket = require("ws");

const PORT = 8799;
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
    // --- Phòng riêng tư có mật khẩu ---
    const host = await open();
    host.send(JSON.stringify({ type: "create", gameId: "tictactoe", playerName: "Host", public: true, password: "  Bí Mật 1  " }));
    const created = await next(host, "created");
    log(created.hasPassword === true, "created bao co hasPassword=true khi dat mat khau");
    const code = created.code;

    // Vào SAI mật khẩu -> error bad_password, không start
    const wrong = await open();
    wrong.send(JSON.stringify({ type: "join", code, playerName: "Wrong", password: "sai" }));
    const errWrong = await next(wrong, "error");
    log(errWrong.reason === "bad_password", "vao sai mat khau bi tu choi (reason=bad_password)");

    // Vào THIẾU mật khẩu -> cũng bị từ chối
    const none = await open();
    none.send(JSON.stringify({ type: "join", code, playerName: "None" }));
    const errNone = await next(none, "error");
    log(errNone.reason === "bad_password", "vao thieu mat khau bi tu choi");

    // listRooms: phòng công khai có mật khẩu hiện kèm locked=true
    const lister = await open();
    lister.send(JSON.stringify({ type: "listRooms" }));
    const list = await next(lister, "roomList");
    const entry = list.rooms.find((r) => r.code === code);
    log(!!entry && entry.locked === true, "phong cong khai co mat khau hien kem locked=true");

    // Vào ĐÚNG mật khẩu (đã trim/chuẩn hóa) -> cả hai start
    const guest = await open();
    const startHost = next(host, "start");
    guest.send(JSON.stringify({ type: "join", code, playerName: "Guest", password: "Bí Mật 1" }));
    const joined = await next(guest, "joined");
    await startHost;
    log(joined.seat === 1 && joined.code === code, "vao dung mat khau (sau trim) thanh cong");

    // --- Không hồi quy: phòng KHÔNG mật khẩu vào bình thường ---
    const h2 = await open();
    h2.send(JSON.stringify({ type: "create", gameId: "gomoku", playerName: "H2", public: true }));
    const c2 = await next(h2, "created");
    log(c2.hasPassword === false, "phong khong mat khau co hasPassword=false");
    const g2 = await open();
    const startH2 = next(h2, "start");
    g2.send(JSON.stringify({ type: "join", code: c2.code, playerName: "G2" }));
    const joined2 = await next(g2, "joined");
    await startH2;
    log(joined2.seat === 1, "phong khong mat khau van vao duoc nhu cu");

    [host, wrong, none, lister, guest, h2, g2].forEach((w) => w.close());
    console.log(process.exitCode ? "FAIL" : "ALL PASS");
  } catch (e) {
    console.error("ERR", e.message);
    process.exitCode = 1;
  } finally {
    srv.kill();
    setTimeout(() => process.exit(process.exitCode || 0), 200);
  }
})();
