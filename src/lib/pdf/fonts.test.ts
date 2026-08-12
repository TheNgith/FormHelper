import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { LIBERTINUS_FAMILY, PDF_FONT, toBase64 } from './fonts';

/**
 * pdfmake nhận nội dung phông dưới dạng base64. Việc chuyển đổi phải chia
 * nhỏ theo khối vì `String.fromCharCode` không nhận nổi vài trăm nghìn đối
 * số một lúc. Đây đúng chỗ dễ sai mà chỉ lộ ra khi file phông đủ lớn, nên
 * kiểm tra bằng chính bốn file thật trong public/fonts.
 */

const FONT_DIR = resolve(import.meta.dirname, '..', '..', '..', 'public', 'fonts');

function readFont(file: string): Buffer {
  return readFileSync(resolve(FONT_DIR, file));
}

describe('toBase64', () => {
  it('cho kết quả rỗng với dữ liệu rỗng', () => {
    expect(toBase64(new ArrayBuffer(0))).toBe('');
  });

  it('khớp với kết quả mã hóa chuẩn ở mọi độ dài quanh mốc chia khối', () => {
    const CHUNK = 0x8000;
    for (const length of [1, 2, 3, CHUNK - 1, CHUNK, CHUNK + 1, CHUNK * 2 + 5]) {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) bytes[i] = (i * 31 + 7) % 256;
      expect(toBase64(bytes.buffer), `độ dài ${length}`).toBe(
        Buffer.from(bytes).toString('base64'),
      );
    }
  });

  it.each(Object.values(LIBERTINUS_FAMILY.Libertinus))('mã hóa đúng file %s', (file) => {
    const buffer = readFont(file);
    // Chép sang ArrayBuffer riêng: `Buffer` của Node dùng chung vùng nhớ nên
    // `.buffer` có thể dài hơn nội dung thật của file.
    const bytes = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(bytes).set(buffer);
    const encoded = toBase64(bytes);
    expect(encoded).toBe(buffer.toString('base64'));
    // Giải mã ngược phải ra đúng file gốc, kể cả byte đầu 0x00 của TTF.
    expect(Buffer.from(encoded, 'base64').equals(buffer)).toBe(true);
  });
});

/**
 * Đọc bảng `cmap` của file TTF và trả về hàm tra "ký tự này có glyph không".
 *
 * Chỉ đọc đúng phần cần: hai định dạng bảng mã Unicode mà pyftsubset xuất ra
 * là 4 (BMP) và 12 (toàn bộ). Không kéo thêm thư viện phông vào devDependencies
 * chỉ để kiểm tra bốn file.
 */
function glyphLookup(buffer: Buffer): (ch: string) => number {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  let cmap = -1;
  const numTables = view.getUint16(4);
  for (let i = 0; i < numTables; i++) {
    const record = 12 + i * 16;
    const tag = buffer.toString('latin1', record, record + 4);
    if (tag === 'cmap') cmap = view.getUint32(record + 8);
  }
  if (cmap < 0) throw new Error('không có bảng cmap');

  // Ưu tiên bảng Unicode đầy đủ (3,10) rồi mới tới bảng BMP (3,1) và (0,*).
  let best = -1;
  let bestRank = -1;
  const subtables = view.getUint16(cmap + 2);
  for (let i = 0; i < subtables; i++) {
    const record = cmap + 4 + i * 8;
    const platform = view.getUint16(record);
    const encoding = view.getUint16(record + 2);
    const rank =
      platform === 3 && encoding === 10 ? 3 : platform === 3 && encoding === 1 ? 2 : platform === 0 ? 1 : -1;
    if (rank > bestRank) {
      bestRank = rank;
      best = cmap + view.getUint32(record + 4);
    }
  }
  if (bestRank < 0) throw new Error('không có bảng mã Unicode');

  const format = view.getUint16(best);

  if (format === 12) {
    const groups = view.getUint32(best + 12);
    return (ch) => {
      const cp = ch.codePointAt(0)!;
      for (let i = 0; i < groups; i++) {
        const g = best + 16 + i * 12;
        const start = view.getUint32(g);
        const end = view.getUint32(g + 4);
        if (cp >= start && cp <= end) return view.getUint32(g + 8) + (cp - start);
      }
      return 0;
    };
  }

  if (format !== 4) throw new Error(`chưa đọc được cmap định dạng ${format}`);

  const segCount = view.getUint16(best + 6) / 2;
  const endCodes = best + 14;
  const startCodes = endCodes + segCount * 2 + 2;
  const idDeltas = startCodes + segCount * 2;
  const idRangeOffsets = idDeltas + segCount * 2;

  return (ch) => {
    const cp = ch.codePointAt(0)!;
    if (cp > 0xffff) return 0;
    for (let i = 0; i < segCount; i++) {
      if (view.getUint16(endCodes + i * 2) < cp) continue;
      if (view.getUint16(startCodes + i * 2) > cp) return 0;
      const rangeOffset = view.getUint16(idRangeOffsets + i * 2);
      if (rangeOffset === 0) {
        return (cp + view.getInt16(idDeltas + i * 2)) & 0xffff;
      }
      const at = idRangeOffsets + i * 2 + rangeOffset + (cp - view.getUint16(startCodes + i * 2)) * 2;
      const glyph = view.getUint16(at);
      return glyph === 0 ? 0 : (glyph + view.getInt16(idDeltas + i * 2)) & 0xffff;
    }
    return 0;
  };
}

/** Toàn bộ 146 chữ cái tiếng Việt có dấu, chữ thường rồi chữ hoa. */
const VIETNAMESE =
  'aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđ' +
  'AÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ';

/** Ký hiệu hay gặp trong tên mẫu và tên dung môi của bộ môn. */
const HOA_HOC = 'αβγδεμπω°±×÷·→₀₁₂₃₄₅';

describe('bộ phông Libertinus', () => {
  it('khai báo đủ bốn kiểu chữ, đúng tên họ dùng trong doc definition', () => {
    expect(Object.keys(LIBERTINUS_FAMILY)).toEqual([PDF_FONT]);
    expect(Object.keys(LIBERTINUS_FAMILY.Libertinus).sort()).toEqual([
      'bold',
      'bolditalics',
      'italics',
      'normal',
    ]);
  });

  it('mỗi kiểu chữ đều có file tương ứng trong public/fonts', () => {
    for (const file of Object.values(LIBERTINUS_FAMILY.Libertinus)) {
      expect(() => readFont(file)).not.toThrow();
      // TTF bắt đầu bằng 0x00010000.
      expect(readFont(file).subarray(0, 4)).toEqual(
        Buffer.from([0x00, 0x01, 0x00, 0x00]),
      );
    }
  });

  /**
   * Đây là bài kiểm tra đắt giá nhất trong file này.
   *
   * Bốn kiểu chữ lấy từ hai dự án khác nhau và đều đã bị cắt gọn bằng
   * pyftsubset. Sai một dải mã trong scripts/build-fonts.sh, hoặc đổi sang một
   * file thượng nguồn thiếu chữ — LibertinusSerif-BoldItalic thiếu đúng ơ ư Ơ Ư,
   * nên ô bolditalics mới phải dùng SemiBoldItalic — thì đơn in ra bị ô vuông
   * trắng chứ không báo lỗi gì. Kiểm ngay trên file thật sẽ ship.
   */
  it.each(Object.entries(LIBERTINUS_FAMILY.Libertinus))(
    'kiểu %s có đủ chữ cái tiếng Việt, ASCII và ký hiệu hóa học',
    (_style, file) => {
      const glyph = glyphLookup(readFont(file));
      const missing = [...VIETNAMESE, ...HOA_HOC]
        .concat(Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)))
        .filter((ch) => glyph(ch) === 0);
      expect(missing, `thiếu glyph trong ${file}`).toEqual([]);
    },
  );
});
