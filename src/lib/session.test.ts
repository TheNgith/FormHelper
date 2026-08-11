import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FormValues } from './schema';
import { clearSubmitted, loadSubmitted, saveSubmitted } from './session';

const KEY = 'don-thiet-bi:da-gui';

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
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

describe('bản lưu đơn đã gửi', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = stubStorage();
  });

  it('ghi rồi đọc lại nguyên vẹn', () => {
    saveSubmitted({ maHoSo: 'IR-20260811-A7K3', values: VALUES });
    expect(loadSubmitted()).toEqual({ maHoSo: 'IR-20260811-A7K3', values: VALUES });
  });

  it('trả về null khi chưa có gì', () => {
    expect(loadSubmitted()).toBeNull();
  });

  it('xóa được', () => {
    saveSubmitted({ maHoSo: 'IR-X', values: VALUES });
    clearSubmitted();
    expect(loadSubmitted()).toBeNull();
  });

  it('bỏ qua nội dung hỏng', () => {
    store.set(KEY, '{ không phải json');
    expect(loadSubmitted()).toBeNull();
  });

  it('bỏ qua bản lưu thiếu mã hồ sơ', () => {
    store.set(KEY, JSON.stringify({ values: VALUES }));
    expect(loadSubmitted()).toBeNull();
  });

  it('bỏ qua bản lưu có dữ liệu không còn hợp lệ', () => {
    store.set(
      KEY,
      JSON.stringify({ maHoSo: 'IR-X', values: { ...VALUES, samples: [] } }),
    );
    expect(loadSubmitted()).toBeNull();
  });

  it('không làm hỏng ứng dụng khi trình duyệt chặn sessionStorage', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('bị chặn');
      },
      setItem: () => {
        throw new Error('bị chặn');
      },
      removeItem: () => {
        throw new Error('bị chặn');
      },
    });
    expect(() => saveSubmitted({ maHoSo: 'IR-X', values: VALUES })).not.toThrow();
    expect(loadSubmitted()).toBeNull();
    expect(() => clearSubmitted()).not.toThrow();
  });
});
