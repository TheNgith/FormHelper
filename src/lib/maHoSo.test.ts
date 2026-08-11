import { describe, expect, it } from 'vitest';

import { MA_HO_SO_PATTERN, generateMaHoSo } from './maHoSo';

describe('generateMaHoSo', () => {
  it('theo đúng dạng IR-YYYYMMDD-XXXX', () => {
    const code = generateMaHoSo('2026-08-11');
    expect(code).toMatch(/^IR-20260811-[0-9A-Z]{4}$/);
    expect(code).toMatch(MA_HO_SO_PATTERN);
  });

  it('không dùng các chữ dễ đọc nhầm I, L, O, U', () => {
    const suffixes = Array.from({ length: 500 }, () =>
      generateMaHoSo('2026-08-11').slice(-4),
    ).join('');
    expect(suffixes).not.toMatch(/[ILOU]/);
  });

  it('mỗi lần gọi cho ra một mã khác nhau', () => {
    const codes = new Set(
      Array.from({ length: 500 }, () => generateMaHoSo('2026-08-11')),
    );
    // 500 mã lấy từ hơn một triệu tổ hợp: trùng vài mã là bình thường về mặt
    // xác suất, nhưng phần lớn phải khác nhau.
    expect(codes.size).toBeGreaterThan(490);
  });

  it('lấy ngày từ tham số truyền vào', () => {
    expect(generateMaHoSo('2025-01-05').startsWith('IR-20250105-')).toBe(true);
  });
});
