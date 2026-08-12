import { describe, expect, it } from 'vitest';

import { MA_HO_SO_PATTERN, generateMaHoSo } from './maHoSo';

describe('generateMaHoSo', () => {
  it('theo đúng dạng IR-YYYYMMDD-XXXXXX', () => {
    const code = generateMaHoSo('2026-08-11');
    expect(code).toMatch(/^IR-20260811-[0-9A-Z]{6}$/);
    expect(code).toMatch(MA_HO_SO_PATTERN);
  });

  it('dạng mã khớp với regex mà firestore.rules ép', () => {
    // Rules chốt dạng ID tài liệu, nên mã sinh ra ở đây mà lệch một ký tự là
    // mọi lá đơn bị từ chối. Hai bản chép của cùng một regex, cố ý: một bên
    // chạy trên trình duyệt, bên kia là ranh giới bảo mật.
    const rulesPattern = /^IR-[0-9]{8}-[0-9A-HJKMNP-TV-Z]{6}$/;
    for (let i = 0; i < 200; i += 1) {
      expect(generateMaHoSo('2026-08-11')).toMatch(rulesPattern);
    }
  });

  it('không dùng các chữ dễ đọc nhầm I, L, O, U', () => {
    const suffixes = Array.from({ length: 500 }, () =>
      generateMaHoSo('2026-08-11').slice(-6),
    ).join('');
    expect(suffixes).not.toMatch(/[ILOU]/);
  });

  it('mỗi lần gọi cho ra một mã khác nhau', () => {
    const codes = new Set(
      Array.from({ length: 500 }, () => generateMaHoSo('2026-08-11')),
    );
    // 500 mã lấy từ hơn một tỷ tổ hợp: xác suất trùng một cặp là khoảng
    // 1/8500. Không chốt đúng 500 để bài kiểm tra không thỉnh thoảng đỏ vì
    // đúng cái xác suất mà nó đang đo. Sáu ký tự thay vì bốn chính là để chỗ
    // này không còn cửa — xem lý do trong maHoSo.ts và bẫy gửi lại trong
    // submissions.ts.
    expect(codes.size).toBeGreaterThan(498);
  });

  it('lấy ngày từ tham số truyền vào', () => {
    expect(generateMaHoSo('2025-01-05').startsWith('IR-20250105-')).toBe(true);
  });
});
