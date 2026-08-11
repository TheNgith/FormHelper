import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { TINOS_FAMILY, toBase64 } from './fonts';

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

  it.each(Object.values(TINOS_FAMILY.Tinos))('mã hóa đúng file %s', (file) => {
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

describe('bộ phông Tinos', () => {
  it('khai báo đủ bốn kiểu chữ', () => {
    expect(Object.keys(TINOS_FAMILY.Tinos).sort()).toEqual([
      'bold',
      'bolditalics',
      'italics',
      'normal',
    ]);
  });

  it('mỗi kiểu chữ đều có file tương ứng trong public/fonts', () => {
    for (const file of Object.values(TINOS_FAMILY.Tinos)) {
      expect(() => readFont(file)).not.toThrow();
      // TTF bắt đầu bằng 0x00010000.
      expect(readFont(file).subarray(0, 4)).toEqual(
        Buffer.from([0x00, 0x01, 0x00, 0x00]),
      );
    }
  });
});
