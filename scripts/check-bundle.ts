/**
 * Canh xem gói JavaScript của sinh viên có lẫn thư viện của trang quản trị
 * không.
 *
 *   npm run build && npm run check:bundle
 *
 * Hai điểm vào dùng chung `src/lib/firebase.ts`, nên chỉ cần một dòng
 * `import 'firebase/auth'` đặt nhầm chỗ là toàn bộ SDK đăng nhập — cộng
 * Recharts, nếu ai đó lỡ nhập một biểu đồ vào màn hình chung — đi thẳng vào
 * gói mà sinh viên tải về trên điện thoại, ở lần mở trang đầu tiên.
 *
 * Kiểu hỏng này **im lặng**: trang vẫn chạy đúng, bài kiểm tra vẫn xanh, chỉ
 * có bản build nặng thêm vài trăm KB mà không ai để ý. Nên nó phải được đo
 * trên sản phẩm thật chứ không suy ra từ cách viết mã.
 *
 * Cách đo: đi từ dist/ir-form/index.html, lần theo *mọi* tệp .js mà nó với
 * các tệp con của nó nhập vào — kể cả nhập động, vì pdfmake cũng đi đường ấy
 * — rồi tìm những ký hiệu chỉ có ở thư viện của trang quản trị.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENTRY_HTML = resolve(ROOT, 'dist/ir-form/index.html');

/**
 * Ký hiệu chỉ xuất hiện khi thư viện tương ứng có mặt.
 *
 * Chọn chuỗi mà bộ nén **không đổi tên được**: địa chỉ máy chủ, mã lỗi, tiền
 * tố tên lớp CSS. Tên hàm thì không dùng được — `signInWithPopup` bị rút gọn
 * mất hẳn trong bản build, nên tìm nó là tìm một thứ không bao giờ có, ở cả
 * hai gói.
 *
 * Từng chuỗi dưới đây đã được đối chiếu trên bản build thật: có mặt trong gói
 * của trang quản trị, vắng mặt trong gói của trang nộp đơn. Thêm chuỗi mới
 * thì kiểm lại đúng hai điều đó — một cái bẫy không bao giờ sập được còn tệ
 * hơn không có bẫy, vì nó làm người ta yên tâm.
 */
const FORBIDDEN = [
  { library: 'firebase/auth', needle: 'identitytoolkit.googleapis.com' },
  { library: 'firebase/auth', needle: 'auth/popup-blocked' },
  { library: 'recharts', needle: 'recharts-' },
];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Mọi tệp .js mà trang nộp đơn có thể tải, kể cả qua nhập động. */
function reachableChunks(): string[] {
  let html: string;
  try {
    html = readFileSync(ENTRY_HTML, 'utf8');
  } catch {
    fail(`Không thấy ${ENTRY_HTML}. Chạy \`npm run build\` trước.`);
  }

  const assetsDir = resolve(ROOT, 'dist/ir-form/assets');
  const seen = new Set<string>();
  const queue = [...html.matchAll(/assets\/([\w.-]+\.js)/g)].map((match) => match[1]);

  while (queue.length > 0) {
    const name = queue.pop()!;
    if (seen.has(name)) continue;
    seen.add(name);

    const source = readFileSync(resolve(assetsDir, name), 'utf8');
    // Rollup viết đường dẫn tương đối trong cả import tĩnh lẫn import động,
    // luôn dưới dạng "./ten-bam.js".
    for (const match of source.matchAll(/["'`]\.\/([\w.-]+\.js)["'`]/g)) {
      if (!seen.has(match[1])) queue.push(match[1]);
    }
  }

  return [...seen].map((name) => resolve(assetsDir, name));
}

const chunks = reachableChunks();
const found: string[] = [];

for (const path of chunks) {
  const source = readFileSync(path, 'utf8');
  for (const { library, needle } of FORBIDDEN) {
    if (source.includes(needle)) {
      found.push(`  ${library} (dấu vết "${needle}") trong ${path.slice(ROOT.length)}`);
    }
  }
}

if (found.length > 0) {
  fail(
    'Gói của trang nộp đơn có lẫn thư viện chỉ trang quản trị mới cần:\n' +
      found.join('\n') +
      '\n\nThường là do một tệp dùng chung — hay gặp nhất là src/lib/firebase.ts —\n' +
      'import thẳng thư viện đó. Chuyển lệnh import ấy vào src/dashboard/.',
  );
}

console.log(`${chunks.length} gói của trang nộp đơn, không lẫn thư viện quản trị.`);
