/* Self-play soak test cho 5 game cờ mới: cho AI tự đánh nhiều ván,
   phát hiện treo (không kết thúc), lỗi runtime, hoặc aiMove trả nước rỗng
   giữa chừng. Chạy: node tests/selfplay-it.js */
"use strict";
const { loadGame, makeCtx } = require("./helpers");

let failures = 0;
function check(cond, msg) {
  if (!cond) { console.log("  ✗ " + msg); failures++; } 
}

// Chơi 1 ván: hai bên đều dùng aiMove(level). instance phải tự cập nhật turn/over.
// Trả về { plies, finished } — finished=true nếu setStatus chứa 🎉/🤝.
function playOne(id, opts, level, seed, maxPlies) {
  const game = loadGame(id);
  const ctx = makeCtx(opts, seed);
  let finished = false;
  const origSet = ctx.setStatus.bind(ctx);
  ctx.setStatus = (s) => {
    origSet(s);
    if (s && (s.includes("🎉") || s.includes("🤝") || s.includes("💀"))) finished = true;
  };
  const inst = game.create(ctx);
  let plies = 0;
  for (let i = 0; i < maxPlies; i++) {
    if (finished) break;
    let mv;
    try { mv = inst.aiMove(level); }
    catch (e) { check(false, `${id}: aiMove ném lỗi ở nước ${i}: ${e.message}`); return { plies, finished }; }
    if (mv == null) {
      // aiMove rỗng mà ván chưa kết thúc => nghi treo/bế tắc không được xử lý
      check(finished, `${id}: aiMove trả null khi ván CHƯA kết thúc (nước ${i})`);
      break;
    }
    try { inst.applyMove(mv, false); }
    catch (e) { check(false, `${id}: applyMove ném lỗi ở nước ${i}: ${e.message}`); return { plies, finished }; }
    plies++;
  }
  return { plies, finished };
}

function soak(id, opts, label, games) {
  console.log(`\n▶ ${id} ${label || ""}`);
  const levels = ["easy", "normal", "hard"];
  let totalPlies = 0, finishedCount = 0;
  const GAMES = games || 9;
  const t0 = Date.now();
  for (let g = 0; g < GAMES; g++) {
    const level = levels[g % levels.length];
    const { plies, finished } = playOne(id, opts, level, 1000 + g * 37, 1200);
    totalPlies += plies;
    if (finished) finishedCount++;
    else check(false, `${id}: ván #${g} (${level}) KHÔNG kết thúc trong 1200 nước (treo?)`);
  }
  const ms = Date.now() - t0;
  console.log(`  ${finishedCount}/${GAMES} ván kết thúc · ${totalPlies} nước · ${ms}ms`);
}

console.log("=== SELF-PLAY SOAK TEST ===");
// 5 game mới (kỹ, nhiều ván)
soak("konane", { size: "6" }, "6x6");
soak("konane", { size: "8" }, "8x8");
soak("hive", {}, "");
soak("tak", { size: "5" }, "5x5");
soak("tak", { size: "4" }, "4x4");
soak("kamisado", {}, "");
soak("amazons", { size: "8" }, "8x8");
soak("amazons", { size: "10" }, "10x10");

// các game cờ turn-based KHÁC tự chơi AI-vs-AI sạch (quét rộng để bắt treo/lỗi luật).
// Lưu ý: chỉ liệt kê các game mà AI có thể tự đánh cả hai bên tới khi kết thúc.
// (pentago/mancala/checkers/quoridor... AI vốn chỉ thiết kế cầm 1 bên đấu người,
//  nên KHÔNG đưa vào self-play — đó là giới hạn của khung test, không phải lỗi game.)
const MORE = [
  "gomoku", "connectfour", "reversi", "morris", "minichess", "isolation",
  "sim", "sprouts", "nim", "orderchaos", "dotsandboxes", "breakthrough", "coganh",
];
for (const id of MORE) {
  try { soak(id, {}, "(quét)", 6); }
  catch (e) { check(false, `${id}: lỗi khi nạp/chạy: ${e.message}`); }
}

if (failures) { console.log(`\n❌ ${failures} VẤN ĐỀ phát hiện`); process.exit(1); }
console.log("\n✅ ALL PASS — không phát hiện treo/lỗi luật");
