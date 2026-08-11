import { describe, expect, it } from 'vitest';

import {
  formatShortDate,
  formatVietnameseDate,
  nfc,
  slugForFilename,
  stripDiacritics,
} from './text';

// Viết bằng mã ký tự thay vì gõ trực tiếp: nhiều trình soạn thảo tự chuẩn hóa
// nội dung file, khi đó phép so sánh NFD/NFC sẽ mất ý nghĩa mà không báo lỗi.
const E_NFC = String.fromCodePoint(0x1ec7); // ệ dang to hop san
const E_NFD = String.fromCodePoint(0x65, 0x323, 0x302); // e + dau nang + dau mu
const NGUYEN_NFD = 'Nguy' + String.fromCodePoint(0x65, 0x302, 0x303) + 'n';

describe('nfc', () => {
  it('gộp dạng phân rã (NFD) về dạng tổ hợp sẵn', () => {
    expect(E_NFD).not.toBe(E_NFC);
    expect(E_NFD.length).toBe(3);
    expect(nfc(E_NFD)).toBe(E_NFC);
    expect(nfc(E_NFD).length).toBe(1);
  });

  it('giữ nguyên chuỗi đã ở dạng NFC', () => {
    const s = 'Nguyễn Thị Ngọc Ánh';
    expect(nfc(s)).toBe(s);
  });
});

describe('định dạng ngày', () => {
  it('viết đầy đủ cho file PDF', () => {
    expect(formatVietnameseDate('2026-08-11')).toBe('ngày 11 tháng 08 năm 2026');
  });

  it('viết gọn cho bản tóm tắt', () => {
    expect(formatShortDate('2026-08-11')).toBe('11/08/2026');
  });
});

describe('stripDiacritics', () => {
  it('bỏ dấu và chuyển đ/Đ', () => {
    expect(stripDiacritics('Đơn xin sử dụng thiết bị')).toBe('Don xin su dung thiet bi');
  });

  it('xử lý được cả đầu vào dạng phân rã', () => {
    expect(stripDiacritics(NGUYEN_NFD)).toBe('Nguyen');
  });
});

describe('slugForFilename', () => {
  it('thay ký tự không an toàn bằng gạch dưới', () => {
    expect(slugForFilename('Đơn xin / thiết bị')).toBe('Don_xin_thiet_bi');
  });

  it('không để lại gạch dưới ở hai đầu', () => {
    expect(slugForFilename('  xin chào  ')).toBe('xin_chao');
  });
});
