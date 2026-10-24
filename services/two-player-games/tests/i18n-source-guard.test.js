"use strict";
// ---------------------------------------------------------------------------
// Lá chắn i18n: quét js/main.js tìm chuỗi tiếng Việt còn HARDCODE trong UI động.
// Mục tiêu: ngăn lỗi "bật EN mà vẫn còn tiếng Việt" tái diễn khi thêm code mới.
//
// Cách hoạt động: bỏ comment, trích mọi chuỗi literal ("..", '..', `..`) chứa
// ký tự tiếng Việt, rồi đối chiếu với ALLOWLIST các ngoại lệ hợp lệ đã biết
// (fallback có *Key tương ứng, tham số mặc định, regex phân tích tên...).
// Bất kỳ chuỗi tiếng Việt MỚI nào không nằm trong allowlist sẽ làm fail test.
// ---------------------------------------------------------------------------
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const VN = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

// Ngoại lệ hợp lệ: các chuỗi này KHÔNG hiển thị trực tiếp khi chạy EN.
// - GAME_GROUPS.title/hint: chỉ là fallback, render luôn dùng titleKey/hintKey.
// - "Người chơi": tham số mặc định nội bộ, luôn được tt("player1/2") ghi đè ở chỗ hiển thị.
// - Regex `Người chơi\s*${playerNo}`: để PHÂN TÍCH nhãn cũ, không phải hiển thị.
const ALLOWLIST = new Set([
  '"Cờ & chiến thuật bàn"',
  '"Caro, cờ lật, kết nối, đặt tường và các game bàn cờ kinh điển."',
  '"Chiến thuật trên bản đồ"',
  '"Đi quân trên lưới, chiếm vùng, dùng tài nguyên và kỹ năng theo lượt."',
  '"Đối kháng hành động & vật lý"',
  '"Canh lực, bắn, kéo thả, va chạm và phản xạ."',
  '"Ván dài & xây dựng"',
  '"Có tiến triển lâu hơn: thủ nhà, gửi quái, đi dungeon và lên cấp."',
  '"Ẩn thông tin & suy luận"',
  '"Giấu vị trí, đoán tọa độ, tìm mìn, giải từ và đọc dấu hiệu."',
  '"Xúc xắc, bài & may rủi"',
  '"Roll, ghi điểm, domino, đấu giá kín và lật cặp nhanh gọn."',
  '"Người chơi"',
  "`Người chơi\\\\s*${playerNo}`",
]);

function stripComments(src) {
  src = src.replace(/\/\*[\s\S]*?\*\//g, "");        // block comment
  src = src.replace(/(^|[^:])\/\/[^\n]*/g, "$1");     // line comment (tránh nuốt "http://")
  return src;
}

function extractVietnameseLiterals(src) {
  const re = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
  const out = new Set();
  let m;
  while ((m = re.exec(src))) {
    if (VN.test(m[0])) out.add(m[0]);
  }
  return out;
}

test("lá chắn i18n: main.js không có chuỗi tiếng Việt hardcode mới ngoài allowlist", () => {
  const src = stripComments(fs.readFileSync(path.join(__dirname, "..", "js", "main.js"), "utf8"));
  const found = extractVietnameseLiterals(src);
  const offenders = [...found].filter((s) => !ALLOWLIST.has(s));
  assert.deepStrictEqual(
    offenders,
    [],
    "Chuỗi tiếng Việt chưa i18n (dùng tt(<key>) hoặc thêm vào ALLOWLIST nếu là fallback nội bộ):\n" +
      offenders.map((s) => "  • " + s).join("\n")
  );
});

test("lá chắn i18n: allowlist không thừa (mọi mục vẫn còn trong main.js)", () => {
  const src = stripComments(fs.readFileSync(path.join(__dirname, "..", "js", "main.js"), "utf8"));
  const found = extractVietnameseLiterals(src);
  const stale = [...ALLOWLIST].filter((s) => !found.has(s));
  assert.deepStrictEqual(
    stale,
    [],
    "Allowlist có mục không còn tồn tại trong main.js — hãy xóa để giữ test sạch:\n" +
      stale.map((s) => "  • " + s).join("\n")
  );
});
