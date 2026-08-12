/**
 * Bảng phông cho pdfmake chạy ngoài trình duyệt.
 *
 * Trong trình duyệt, `src/lib/pdf/fonts.ts` tải bốn file .ttf rồi nạp vào hệ
 * thống file ảo của pdfmake. Các script ở đây chạy trên Node nên chỉ cần
 * đường dẫn tới đúng bốn file đó — nhưng phải là cùng bốn file, nếu không thì
 * bản xem thử và bản sinh viên tải về sẽ ngắt dòng khác nhau.
 */

import { resolve } from 'node:path';

import { LIBERTINUS_FAMILY } from '../src/lib/pdf/fonts';

const FONT_DIR = resolve(import.meta.dirname, '..', 'public', 'fonts');

export function nodeFonts(): Record<string, Record<string, string>> {
  return Object.fromEntries(
    Object.entries(LIBERTINUS_FAMILY).map(([family, faces]) => [
      family,
      Object.fromEntries(
        Object.entries(faces).map(([style, file]) => [style, resolve(FONT_DIR, file)]),
      ),
    ]),
  );
}
