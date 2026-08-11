import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FormDraft, FormValues } from './schema';
import { emptyForm, emptySample } from './schema';
import {
  clearDraft,
  clearProfile,
  freshForm,
  loadDraft,
  loadProfile,
  saveDraft,
  saveProfile,
} from './storage';

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
    samples: [{ ...emptySample(), name: 'Mẫu A', state: 'Rắn', solvent: 'Methanol' }],
    ...overrides,
  };
}

const VALUES: FormValues = {
  department: 'Bộ môn Hóa Hữu Cơ',
  supervisor: 'PGS.TS. Trần Văn Thành',
  studentName: 'Nguyễn Thị Ngọc Ánh',
  studentId: '2200123',
  email: 'ngocanh@example.com',
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
      email: 'ngocanh@example.com',
      phone: '0912345678',
      className: 'D2A',
      cohort: '2022 - 2026',
    });
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
  });

  it('cho biểu mẫu trống khi chưa lưu gì', () => {
    expect(freshForm(null).studentName).toBe('');
  });

  it('xóa được', () => {
    saveProfile(VALUES);
    clearProfile();
    expect(loadProfile()).toBeNull();
    expect(freshForm(loadProfile()).studentName).toBe('');
  });
});
