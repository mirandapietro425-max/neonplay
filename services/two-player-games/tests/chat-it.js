/* Kiểm tra tích hợp: chat trong phòng chỉ relay sang ĐÚNG đối thủ, không lọt sang người ngoài. */
"use strict";
const { spawn } = require("child_process");
const path = require("path");
const WebSocket = require("ws");

const PORT = 8797;
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
    const a = await open();
    a.send(JSON.stringify({ type: "create", gameId: "tictactoe", playerName: "A" }));
    const created = await next(a, "created");
    const code = created.code;

    const b = await open();
    const startA = next(a, "start");
    b.send(JSON.stringify({ type: "join", code, playerName: "B" }));
    await next(b, "joined");
    await startA;

    // người ngoài C (không trong phòng) không được nhận chat
    const c = await open();
    let cGotChat = false;
    c.on("message", (raw) => { try { if (JSON.parse(raw).type === "chat") cGotChat = true; } catch {} });

    // A gửi -> B nhận đúng nội dung
    const bChat = next(b, "chat");
    a.send(JSON.stringify({ type: "chat", text: "xin chao" }));
    const got = await bChat;
    log(got.text === "xin chao", "chat tu A duoc relay sang B dung noi dung");

    // B gửi -> A nhận
    const aChat = next(a, "chat");
    b.send(JSON.stringify({ type: "chat", text: "ok ban" }));
    const got2 = await aChat;
    log(got2.text === "ok ban", "chat tu B duoc relay nguoc lai A");

    // text dài bị cắt còn 200 ký tự
    const aChat2 = next(a, "chat");
    b.send(JSON.stringify({ type: "chat", text: "x".repeat(500) }));
    const long = await aChat2;
    log(long.text.length === 200, "chat dai bi cat con 200 ky tu");

    await new Promise((r) => setTimeout(r, 200));
    log(!cGotChat, "nguoi ngoai phong khong nhan duoc chat");

    // reaction relay: A gửi react -> B nhận đúng emoji, người ngoài không nhận
    let cGotReact = false;
    c.on("message", (raw) => { try { if (JSON.parse(raw).type === "react") cGotReact = true; } catch {} });
    const bReact = next(b, "react");
    a.send(JSON.stringify({ type: "react", emoji: "🔥" }));
    const react = await bReact;
    log(react.emoji === "🔥", "reaction tu A duoc relay sang B dung emoji");
    await new Promise((r) => setTimeout(r, 150));
    log(!cGotReact, "nguoi ngoai phong khong nhan duoc reaction");

    [a, b, c].forEach((w) => w.close());
    console.log(process.exitCode ? "FAIL" : "ALL PASS");
  } catch (e) {
    console.error("ERR", e.message);
    process.exitCode = 1;
  } finally {
    srv.kill();
    setTimeout(() => process.exit(process.exitCode || 0), 200);
  }
})();
