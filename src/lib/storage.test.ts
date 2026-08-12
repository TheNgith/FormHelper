import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FormDraft, FormValues } from './schema';
import { emptyForm, emptySample } from './schema';
import {
  clearDraft,
  clearProfile,
  freshForm,
  initialForm,
  loadDraft,
  loadProfile,
  saveDraft,
  saveProfile,
} from './storage';

/** Nay là một ô sinh viên tự gõ, và vì thế cũng là một ô được nhớ lại. */
const EMAIL = 'ngocanh@ump.edu.vn';

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

function draftWith(overrides: Partial<FormDraft> = {}): FormDraft {
  return {
    ...emptyForm(),
    studentName: 'Nguyễn Thị Ngọc Ánh',
    studentId: '2200123',
    email: EMAIL,
    samples: [{ ...emptySample(), name: 'Mẫu A', state: 'Rắn', solvent: 'Methanol' }],
    ...overrides,
  };
}

const VALUES: FormValues = {
  department: 'Bộ môn Hóa Hữu Cơ',
  supervisor: 'Thầy PGS.TS. Trần Văn Thành',
  studentName: 'Nguyễn Thị Ngọc Ánh',
  studentId: '2200123',
  email: EMAIL,
  phone: '0912345678',
  className: 'D2A',
  cohort: '2022 - 2026',
  city: 'TP. HCM',
  date: '2026-08-11',
  samples: [{ name: 'Mẫu A', state: 'Rắn', solvent: 'Methanol' }],
};

describe('bản nháp', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = stubStorage();
  });

  it('lưu và đọc lại được bản nháp còn dở', () => {
    saveDraft(draftWith({ studentId: '', email: '' }));
    const loaded = loadDraft();
    expect(loaded?.studentName).toBe('Nguyễn Thị Ngọc Ánh');
    // Bản nháp chưa hợp lệ vẫn phải khôi phục được, đó mới là điểm của nó.
    expect(loaded?.studentId).toBe('');
  });

  it('cấp lại id mới cho từng dòng mẫu khi khôi phục', () => {
    const original = draftWith({
      samples: [
        { ...emptySample(), name: 'A' },
        { ...emptySample(), name: 'B' },
      ],
    });
    saveDraft(original);

    const loaded = loadDraft()!;
    const ids = loaded.samples.map((s) => s.id);
    // Id phải khác nhau, nếu không React sẽ nhầm lẫn giữa các dòng.
    expect(new Set(ids).size).toBe(2);
    // Và phải khác id của dòng tạo mới sau khi khôi phục.
    expect(ids).not.toContain(emptySample().id);
    expect(loaded.samples.map((s) => s.name)).toEqual(['A', 'B']);
  });

  it('xóa được', () => {
    saveDraft(draftWith());
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it('bỏ qua nội dung hỏng hoặc sai hình dạng', () => {
    store.set('don-thiet-bi:ban-nhap', 'không phải json');
    expect(loadDraft()).toBeNull();

    store.set('don-thiet-bi:ban-nhap', JSON.stringify({ studentName: 'A' }));
    expect(loadDraft()).toBeNull();
  });

  it('bỏ qua bản nháp không còn dòng mẫu nào', () => {
    store.set(
      'don-thiet-bi:ban-nhap',
      JSON.stringify({ ...draftWith(), samples: [] }),
    );
    expect(loadDraft()).toBeNull();
  });
});

describe('thông tin cá nhân', () => {
  beforeEach(stubStorage);

  it('chỉ giữ những ô lặp lại giữa các lần nộp', () => {
    saveProfile(VALUES);
    expect(loadProfile()).toEqual({
      studentName: 'Nguyễn Thị Ngọc Ánh',
      studentId: '2200123',
      email: EMAIL,
      phone: '0912345678',
      className: 'D2A',
      cohort: '2022 - 2026',
    });
  });

  it('giữ cả email', () => {
    // Lý do cũ đã lật ngược: hồi còn đăng nhập, email đến từ token ở mỗi lần
    // mở trang nên một bản sao trong localStorage chỉ có thể che mất giá trị
    // đúng. Nay không còn token, nên không nhớ nghĩa là bắt sinh viên gõ lại
    // địa chỉ của mình mỗi lần nộp đơn.
    saveProfile(VALUES);
    expect(loadProfile()?.email).toBe(EMAIL);
  });

  it('không giữ danh sách mẫu của lần trước', () => {
    saveProfile(VALUES);
    expect(loadProfile()).not.toHaveProperty('samples');
    expect(freshForm(loadProfile()).samples).toHaveLength(1);
    expect(freshForm(loadProfile()).samples[0].name).toBe('');
  });

  it('điền sẵn biểu mẫu trống', () => {
    saveProfile(VALUES);
    const form = freshForm(loadProfile());
    expect(form.studentName).toBe('Nguyễn Thị Ngọc Ánh');
    expect(form.className).toBe('D2A');
    expect(form.email).toBe(EMAIL);
  });

  it('cho biểu mẫu trống khi chưa lưu gì', () => {
    expect(freshForm(null).studentName).toBe('');
    expect(freshForm(null).email).toBe('');
  });

  it('bỏ qua thông tin đã lưu từ phiên bản trước, khi chưa có email', () => {
    // Bản cũ cố ý không lưu email, nên máy nào từng dùng bản đó vẫn còn một
    // bản ghi thiếu khóa này. loadProfile() đòi đủ mọi ô, nên nó trả về null
    // và biểu mẫu mở ra trống — phiền một lần, chứ không phải một ô email
    // undefined lọt tới tận lúc gửi.
    localStorage.setItem(
      'don-thiet-bi:thong-tin-ca-nhan',
      JSON.stringify({
        studentName: 'Nguyễn Thị Ngọc Ánh',
        studentId: '2200123',
        phone: '0912345678',
        className: 'D2A',
        cohort: '2022 - 2026',
      }),
    );
    expect(loadProfile()).toBeNull();
  });

  it('xóa được', () => {
    saveProfile(VALUES);
    clearProfile();
    expect(loadProfile()).toBeNull();
    expect(freshForm(loadProfile()).studentName).toBe('');
  });
});

describe('biểu mẫu lúc vào trang', () => {
  beforeEach(stubStorage);

  it('ưu tiên bản nháp đang dở hơn thông tin đã lưu', () => {
    saveProfile(VALUES);
    saveDraft(draftWith({ studentName: 'Đang gõ dở' }));
    expect(initialForm().studentName).toBe('Đang gõ dở');
  });

  it('dùng thông tin đã lưu khi không còn bản nháp', () => {
    saveProfile(VALUES);
    expect(initialForm().studentName).toBe('Nguyễn Thị Ngọc Ánh');
  });

  it('giữ nguyên email trong bản nháp', () => {
    // Chỗ này từng ghi đè email bằng giá trị trong token, vì bản nháp có thể
    // còn lại từ phiên đăng nhập của người khác trên cùng máy. Không còn
    // token nên không còn gì để ghi đè: thứ đang gõ dở là thứ được khôi phục.
    saveDraft(draftWith({ email: 'dang.go@ump.edu.vn' }));
    expect(initialForm().email).toBe('dang.go@ump.edu.vn');
  });
});
