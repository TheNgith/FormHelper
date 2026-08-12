import { describe, expect, it } from 'vitest';

import { emptyForm, emptySample, validateForm } from './schema';
import type { FormDraft } from './schema';

function draft(overrides: Partial<FormDraft> = {}): FormDraft {
  return {
    ...emptyForm(),
    // `emptyForm()` để trống ô tên giảng viên — nó là ô gõ tự do, không còn
    // là danh sách chọn có sẵn một giá trị.
    supervisorTitle: 'PGS. TS.',
    supervisorName: 'Trần Văn Thành',
    studentName: 'Nguyễn Thị Ngọc Ánh',
    studentId: '2200123',
    email: 'ngocanh@ump.edu.vn',
    phone: '0912345678',
    className: 'D2A',
    cohort: '2022 - 2026',
    samples: [{ ...emptySample(), name: 'Dapagliflozin', state: 'Rắn', solvent: 'Methanol' }],
    ...overrides,
  };
}

describe('validateForm', () => {
  it('chấp nhận một đơn hợp lệ', () => {
    const result = validateForm(draft());
    expect(result.ok).toBe(true);
  });

  it('loại bỏ trường id khỏi danh sách mẫu', () => {
    const result = validateForm(draft());
    if (!result.ok) throw new Error('mong đợi dữ liệu hợp lệ');
    expect(result.values.samples[0]).toEqual({
      name: 'Dapagliflozin',
      state: 'Rắn',
      solvent: 'Methanol',
    });
  });

  describe('giảng viên hướng dẫn', () => {
    it('ghép ba ô thành một chuỗi', () => {
      const result = validateForm(draft());
      if (!result.ok) throw new Error('mong đợi dữ liệu hợp lệ');
      expect(result.values.supervisor).toBe('Thầy PGS. TS. Trần Văn Thành');
    });

    it('bỏ qua ô học vị để trống, không để lại hai dấu cách', () => {
      const result = validateForm(draft({ supervisorTitle: '' }));
      if (!result.ok) throw new Error('mong đợi dữ liệu hợp lệ');
      expect(result.values.supervisor).toBe('Thầy Trần Văn Thành');
    });

    it('đòi tên giảng viên, và báo lỗi ở đúng ô tên', () => {
      const result = validateForm(draft({ supervisorName: '   ' }));
      if (result.ok) throw new Error('mong đợi dữ liệu không hợp lệ');
      expect(result.errors.supervisorName).toBeDefined();
      // Ô `supervisor` không tồn tại trên màn hình nên không được đếm là lỗi.
      expect(result.errors.supervisor).toBeUndefined();
    });

    it('từ chối học vị ngoài danh sách', () => {
      const result = validateForm(draft({ supervisorTitle: 'Thạc sỹ' }));
      if (result.ok) throw new Error('mong đợi dữ liệu không hợp lệ');
      expect(result.errors.supervisorTitle).toBeDefined();
    });
  });

  it('cắt khoảng trắng thừa', () => {
    const result = validateForm(draft({ studentName: '  Trần Văn A  ' }));
    if (!result.ok) throw new Error('mong đợi dữ liệu hợp lệ');
    expect(result.values.studentName).toBe('Trần Văn A');
  });

  it('từ chối danh sách mẫu rỗng', () => {
    const result = validateForm(draft({ samples: [] }));
    if (result.ok) throw new Error('mong đợi lỗi');
    expect(result.errors['samples']).toMatch(/ít nhất một mẫu/);
  });

  it('báo lỗi đúng dòng mẫu bị thiếu dữ liệu', () => {
    const result = validateForm(
      draft({
        samples: [
          { ...emptySample(), name: 'Mẫu 1', state: 'Rắn', solvent: 'Methanol' },
          { ...emptySample(), name: '', state: 'Lỏng', solvent: 'Nước' },
          { ...emptySample(), name: 'Mẫu 3', state: '', solvent: 'Ethanol' },
        ],
      }),
    );
    if (result.ok) throw new Error('mong đợi lỗi');
    expect(result.errors['samples.1.name']).toBeDefined();
    expect(result.errors['samples.2.state']).toBeDefined();
    expect(result.errors['samples.0.name']).toBeUndefined();
  });

  it('chỉ chấp nhận trạng thái mẫu trong danh sách cho phép', () => {
    const result = validateForm({
      ...draft(),
      samples: [{ ...emptySample(), name: 'X', state: 'Khí', solvent: 'Nước' }],
    });
    if (result.ok) throw new Error('mong đợi lỗi');
    expect(result.errors['samples.0.state']).toBeDefined();
  });

  describe('mã số sinh viên', () => {
    it.each(['abc', '12345', '2200123x', ''])('từ chối %o', (studentId) => {
      expect(validateForm(draft({ studentId })).ok).toBe(false);
    });

    it('chấp nhận chuỗi chữ số hợp lệ', () => {
      expect(validateForm(draft({ studentId: '2200123' })).ok).toBe(true);
    });
  });

  describe('số điện thoại', () => {
    it.each(['912345678', '09123456789', '+84912345678', '0912 345 678'])(
      'từ chối %o',
      (phone) => {
        expect(validateForm(draft({ phone })).ok).toBe(false);
      },
    );

    it('chấp nhận 10 chữ số bắt đầu bằng 0', () => {
      expect(validateForm(draft({ phone: '0912345678' })).ok).toBe(true);
    });
  });

  describe('niên khóa', () => {
    it.each(['2022', '2022-20', 'hai nghìn'])('từ chối %o', (cohort) => {
      expect(validateForm(draft({ cohort })).ok).toBe(false);
    });

    it('từ chối năm kết thúc trước năm bắt đầu', () => {
      expect(validateForm(draft({ cohort: '2026 - 2022' })).ok).toBe(false);
    });

    it.each(['2022 - 2026', '2022-2026'])('chấp nhận %o', (cohort) => {
      expect(validateForm(draft({ cohort })).ok).toBe(true);
    });
  });

  describe('email', () => {
    it.each(['khong-phai-email', 'a@', '@b.com', ''])('từ chối %o', (email) => {
      expect(validateForm(draft({ email })).ok).toBe(false);
    });

    it('chấp nhận địa chỉ ngoài trường', () => {
      // Ô này nay do sinh viên tự gõ. Đuôi @ump.edu.vn là lời nhắc cạnh ô
      // nhập, không phải một ràng buộc — nó không chứng minh được gì nữa mà
      // vẫn đủ sức chặn nhầm một lá đơn thật.
      expect(validateForm(draft({ email: 'ngocanh@gmail.com' })).ok).toBe(true);
    });
  });
});
