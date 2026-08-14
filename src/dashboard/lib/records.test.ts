import { describe, expect, it } from 'vitest';

import {
  EMPTY_CRITERIA,
  type SubmissionRecord,
  availableYears,
  filterByPeriod,
  hasCriteria,
  matchKey,
  searchRecords,
  sortRecords,
  toRecord,
} from './records';

function record(overrides: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return {
    maHoSo: 'IR-20260812-A7K3M9',
    createdAt: new Date('2026-08-12T03:00:00Z'),
    studentName: 'Nguyễn Thị Ngọc Ánh',
    studentId: '2200123',
    email: 'ngocanh@ump.edu.vn',
    phone: '0912345678',
    className: 'D2A',
    cohort: '2022 - 2026',
    department: 'Bộ môn Hóa Hữu Cơ',
    supervisor: 'Thầy PGS. TS. Trần Văn Thành',
    city: 'TP. HCM',
    requestDate: '2026-08-12',
    samples: [{ name: 'Mẫu A', state: 'Rắn', solvent: 'Ethanol' }],
    ...overrides,
  };
}

describe('toRecord', () => {
  it('đọc được tài liệu đúng hình dạng', () => {
    const parsed = toRecord('IR-20260812-A7K3M9', {
      createdAt: { toDate: () => new Date('2026-08-12T03:00:00Z') },
      studentName: 'Nguyễn Văn A',
      studentId: '2200123',
      email: 'a@ump.edu.vn',
      phone: '0912345678',
      className: 'D2A',
      cohort: '2022 - 2026',
      department: 'Bộ môn Hóa Hữu Cơ',
      supervisor: 'Thầy TS. B',
      city: 'TP. HCM',
      requestDate: '2026-08-12',
      samples: [{ name: 'Mẫu A', state: 'Rắn', solvent: 'Ethanol' }],
    });

    expect(parsed.maHoSo).toBe('IR-20260812-A7K3M9');
    expect(parsed.createdAt?.toISOString()).toBe('2026-08-12T03:00:00.000Z');
    expect(parsed.samples).toHaveLength(1);
  });

  it('tài liệu sai hình dạng vẫn ra một bản ghi, không biến mất', () => {
    // Bỏ một đơn đi thì bộ môn mất nó mà không hề biết — cùng lý do khiến
    // scripts/export-csv.ts giữ lại đơn không đọc được.
    const parsed = toRecord('IR-20260812-A7K3M9', {
      studentName: 123,
      samples: 'không phải mảng',
      uid: 'trường của bản cũ',
    });

    expect(parsed.maHoSo).toBe('IR-20260812-A7K3M9');
    expect(parsed.studentName).toBe('');
    expect(parsed.createdAt).toBeNull();
    expect(parsed.samples).toEqual([]);
  });

  it('chuẩn hóa NFC ngay lúc đọc', () => {
    // Chuỗi phân rã đọc lên từ Firestore phải khớp được với chuỗi tổ hợp sẵn
    // người ta gõ vào ô tìm kiếm.
    const decomposed = 'Nguyễn'.normalize('NFD');
    const parsed = toRecord('IR-20260812-A7K3M9', { studentName: decomposed });
    expect(parsed.studentName).toBe('Nguyễn');
  });
});

describe('sortRecords', () => {
  const older = record({ maHoSo: 'IR-20260101-AAAAAA', createdAt: new Date('2026-01-01') });
  const newer = record({ maHoSo: 'IR-20260301-BBBBBB', createdAt: new Date('2026-03-01') });

  it('sắp mới nhất trước và cũ nhất trước', () => {
    expect(sortRecords([older, newer], 'newest').map((r) => r.maHoSo)).toEqual([
      newer.maHoSo,
      older.maHoSo,
    ]);
    expect(sortRecords([newer, older], 'oldest').map((r) => r.maHoSo)).toEqual([
      older.maHoSo,
      newer.maHoSo,
    ]);
  });

  it('cùng dấu thời gian thì mã hồ sơ quyết định, nên thứ tự không nhảy', () => {
    const at = new Date('2026-05-05');
    const a = record({ maHoSo: 'IR-20260505-AAAAAA', createdAt: at });
    const b = record({ maHoSo: 'IR-20260505-BBBBBB', createdAt: at });

    expect(sortRecords([a, b], 'newest').map((r) => r.maHoSo)).toEqual([
      b.maHoSo,
      a.maHoSo,
    ]);
    expect(sortRecords([b, a], 'newest').map((r) => r.maHoSo)).toEqual([
      b.maHoSo,
      a.maHoSo,
    ]);
  });

  it('đơn thiếu createdAt không làm hỏng thứ tự', () => {
    const missing = record({ maHoSo: 'IR-20260101-CCCCCC', createdAt: null });
    expect(sortRecords([newer, missing], 'newest').map((r) => r.maHoSo)).toEqual([
      newer.maHoSo,
      missing.maHoSo,
    ]);
  });

  it('không sửa mảng gốc', () => {
    const input = [older, newer];
    sortRecords(input, 'newest');
    expect(input.map((r) => r.maHoSo)).toEqual([older.maHoSo, newer.maHoSo]);
  });
});

describe('lọc theo năm và tháng', () => {
  const records = [
    record({ maHoSo: 'a', requestDate: '2025-03-04' }),
    record({ maHoSo: 'b', requestDate: '2026-03-04' }),
    record({ maHoSo: 'c', requestDate: '2026-08-12' }),
  ];

  it('liệt kê các năm có mặt, mới nhất trước', () => {
    expect(availableYears(records)).toEqual(['2026', '2025']);
  });

  it('bỏ qua ngày rỗng khi liệt kê năm', () => {
    expect(availableYears([...records, record({ requestDate: '' })])).toEqual([
      '2026',
      '2025',
    ]);
  });

  it('lọc theo năm, theo tháng, và cả hai', () => {
    expect(
      filterByPeriod(records, { year: '2026', month: '' }).map((r) => r.maHoSo),
    ).toEqual(['b', 'c']);
    expect(filterByPeriod(records, { year: '', month: '03' }).map((r) => r.maHoSo)).toEqual([
      'a',
      'b',
    ]);
    expect(
      filterByPeriod(records, { year: '2026', month: '03' }).map((r) => r.maHoSo),
    ).toEqual(['b']);
  });

  it('không chọn gì thì giữ nguyên tất cả', () => {
    expect(filterByPeriod(records, { year: '', month: '' })).toHaveLength(3);
  });
});

describe('matchKey', () => {
  it('gộp hoa thường, khoảng trắng thừa và dạng phân rã', () => {
    expect(matchKey('  Trần   Văn   Thành ')).toBe('trần văn thành');
    expect(matchKey('Nguyễn'.normalize('NFD'))).toBe(matchKey('Nguyễn'));
  });
});

describe('searchRecords', () => {
  const records = [
    record({
      maHoSo: 'a',
      studentName: 'Nguyễn Thị Ngọc Ánh',
      studentId: '2200123',
      className: 'D2A',
      email: 'ngocanh@ump.edu.vn',
      supervisor: 'Thầy PGS. TS. Trần Văn Thành',
    }),
    record({
      maHoSo: 'b',
      studentName: 'Lê Minh Huy',
      studentId: '2211999',
      className: 'D2B',
      email: 'huy@ump.edu.vn',
      supervisor: 'Cô TS. Phạm Thu Hà',
    }),
  ];

  it('không điền ô nào thì trả về tất cả', () => {
    expect(searchRecords(records, EMPTY_CRITERIA)).toHaveLength(2);
    expect(hasCriteria(EMPTY_CRITERIA)).toBe(false);
  });

  it('tìm theo một phần họ tên, không phân biệt hoa thường và dấu tổ hợp', () => {
    expect(
      searchRecords(records, { ...EMPTY_CRITERIA, studentName: 'ngọc' }).map(
        (r) => r.maHoSo,
      ),
    ).toEqual(['a']);
    expect(
      searchRecords(records, {
        ...EMPTY_CRITERIA,
        studentName: 'NGỌC'.normalize('NFD'),
      }).map((r) => r.maHoSo),
    ).toEqual(['a']);
  });

  it('mã số sinh viên so theo tiền tố, không phải chuỗi con', () => {
    expect(
      searchRecords(records, { ...EMPTY_CRITERIA, studentId: '2200' }).map((r) => r.maHoSo),
    ).toEqual(['a']);
    // '0123' nằm giữa mã của đơn a nhưng không phải phần đầu, nên không khớp.
    expect(searchRecords(records, { ...EMPTY_CRITERIA, studentId: '0123' })).toEqual([]);
  });

  it('tìm theo một phần tên lớp', () => {
    expect(
      searchRecords(records, { ...EMPTY_CRITERIA, className: 'd2' }),
    ).toHaveLength(2);
  });

  it('tìm giảng viên bằng phần tên, bỏ qua xưng hô và học vị', () => {
    expect(
      searchRecords(records, { ...EMPTY_CRITERIA, supervisorName: 'thu hà' }).map(
        (r) => r.maHoSo,
      ),
    ).toEqual(['b']);
  });

  it('nhiều ô thì AND lại với nhau', () => {
    expect(
      searchRecords(records, {
        ...EMPTY_CRITERIA,
        studentName: 'lê',
        className: 'D2A',
      }),
    ).toEqual([]);
  });

  it('ô chỉ có khoảng trắng không thu hẹp gì', () => {
    expect(searchRecords(records, { ...EMPTY_CRITERIA, studentName: '   ' })).toHaveLength(
      2,
    );
    expect(hasCriteria({ ...EMPTY_CRITERIA, studentName: '   ' })).toBe(false);
  });
});
