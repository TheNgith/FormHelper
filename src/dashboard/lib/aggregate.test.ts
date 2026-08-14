import { describe, expect, it } from 'vitest';

import { SAMPLE_STATES } from '../../lib/constants';
import {
  BLANK_LABEL,
  OTHER_LABEL,
  classRanking,
  sampleStates,
  submissionsByMonth,
  supervisorFrequency,
  totalSamples,
} from './aggregate';
import type { SubmissionRecord } from './records';

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

function withClass(className: string, times: number): SubmissionRecord[] {
  return Array.from({ length: times }, () => record({ className }));
}

describe('classRanking', () => {
  it('đếm và sắp giảm dần', () => {
    expect(classRanking([...withClass('D2A', 3), ...withClass('D2B', 5)])).toEqual([
      { label: 'D2B', value: 5 },
      { label: 'D2A', value: 3 },
    ]);
  });

  it('cùng số lượng thì sắp theo tên, nên thứ tự không nhảy', () => {
    expect(
      classRanking([...withClass('D2B', 2), ...withClass('D2A', 2)]).map((s) => s.label),
    ).toEqual(['D2A', 'D2B']);
  });

  it('quá 10 lớp thì phần dư dồn vào Other, và Other nằm cuối', () => {
    const records = [
      ...withClass('lop-lon', 50),
      ...Array.from({ length: 12 }, (_, i) => withClass(`lop-${i}`, 1)).flat(),
    ];

    const ranking = classRanking(records);
    expect(ranking).toHaveLength(11);
    expect(ranking[0]).toEqual({ label: 'lop-lon', value: 50 });
    // 13 lớp, giữ 10 → ba lớp còn lại mỗi lớp một đơn.
    expect(ranking.at(-1)).toEqual({ label: OTHER_LABEL, value: 3 });
  });

  it('đúng 10 lớp thì không sinh ra Other', () => {
    const records = Array.from({ length: 10 }, (_, i) => withClass(`lop-${i}`, 1)).flat();
    expect(classRanking(records)).toHaveLength(10);
    expect(classRanking(records).some((s) => s.label === OTHER_LABEL)).toBe(false);
  });

  it('lớp để trống hiện ra chứ không bị bỏ đi', () => {
    expect(classRanking([record({ className: '  ' })])).toEqual([
      { label: BLANK_LABEL, value: 1 },
    ]);
  });
});

describe('submissionsByMonth', () => {
  it('luôn đủ mười hai tháng, kể cả tháng bằng không', () => {
    // Tháng rỗng là một thông tin. Bỏ nó đi là giấu đúng cái khoảng trống mà
    // người ta mở biểu đồ này để tìm.
    const buckets = submissionsByMonth([record({ requestDate: '2026-03-04' })], '2026');

    expect(buckets).toHaveLength(12);
    expect(buckets[2]).toEqual({ month: '03', label: 'Mar', value: 1 });
    expect(buckets.filter((b) => b.value === 0)).toHaveLength(11);
  });

  it('bỏ qua đơn của năm khác', () => {
    const buckets = submissionsByMonth(
      [record({ requestDate: '2025-03-04' }), record({ requestDate: '2026-03-04' })],
      '2026',
    );
    expect(buckets.reduce((sum, b) => sum + b.value, 0)).toBe(1);
  });

  it('dùng requestDate chứ không dùng createdAt', () => {
    // Đơn nhập tay hôm nay cho một tờ giấy đề tháng trước phải rơi vào tháng
    // của tờ giấy.
    const buckets = submissionsByMonth(
      [record({ requestDate: '2026-01-15', createdAt: new Date('2026-08-14') })],
      '2026',
    );
    expect(buckets[0].value).toBe(1);
    expect(buckets[7].value).toBe(0);
  });

  it('ngày hỏng không rơi vào tháng nào', () => {
    const buckets = submissionsByMonth([record({ requestDate: '' })], '2026');
    expect(buckets.reduce((sum, b) => sum + b.value, 0)).toBe(0);
  });
});

describe('sampleStates', () => {
  it('đếm theo từng mẫu chứ không theo từng đơn', () => {
    const slices = sampleStates([
      record({
        samples: [
          { name: 'A', state: 'Rắn', solvent: 'X' },
          { name: 'B', state: 'Rắn', solvent: 'X' },
          { name: 'C', state: 'Lỏng', solvent: 'X' },
        ],
      }),
    ]);

    expect(slices.find((s) => s.label === 'Rắn')?.value).toBe(2);
    expect(slices.find((s) => s.label === 'Lỏng')?.value).toBe(1);
  });

  it('cả ba trạng thái luôn có mặt, kể cả khi bằng không', () => {
    expect(sampleStates([]).map((s) => s.label)).toEqual([...SAMPLE_STATES]);
  });

  it('giá trị lạ hiện trong ô Other thay vì bị bỏ đi', () => {
    // Ô này đáng lẽ luôn rỗng. Nó tồn tại để một giá trị cũ hay hỏng lộ ra.
    const slices = sampleStates([
      record({ samples: [{ name: 'A', state: 'Khí', solvent: 'X' }] }),
    ]);
    expect(slices.at(-1)).toEqual({ label: OTHER_LABEL, value: 1 });
  });

  it('không có giá trị lạ thì không có ô Other', () => {
    expect(sampleStates([record()]).some((s) => s.label === OTHER_LABEL)).toBe(false);
  });
});

describe('supervisorFrequency', () => {
  it('gộp Thầy và Cô về cùng một người', () => {
    const slices = supervisorFrequency([
      record({ supervisor: 'Thầy PGS. TS. Trần Văn Thành' }),
      record({ supervisor: 'Cô PGS. TS. Trần Văn Thành' }),
    ]);

    expect(slices).toEqual([{ label: 'PGS. TS. Trần Văn Thành', value: 2 }]);
  });

  it('gộp dạng phân rã của bộ gõ macOS', () => {
    const slices = supervisorFrequency([
      record({ supervisor: 'Thầy TS. Trần Văn Thành' }),
      record({ supervisor: 'Thầy TS. Trần Văn Thành'.normalize('NFD') }),
    ]);
    expect(slices).toHaveLength(1);
    expect(slices[0].value).toBe(2);
  });

  it('gộp khoảng trắng thừa', () => {
    const slices = supervisorFrequency([
      record({ supervisor: 'Thầy  TS.   Trần Văn Thành' }),
      record({ supervisor: 'Thầy TS. Trần Văn Thành' }),
    ]);
    expect(slices).toHaveLength(1);
  });

  it('học hàm học vị khác nhau thì vẫn là hai cột — cố ý', () => {
    // So khớp mờ theo tên sẽ có ngày gộp nhầm hai người thật. Một cột thừa mà
    // người đọc nhận ra ngay tốt hơn một con số sai mà không ai nhận ra.
    const slices = supervisorFrequency([
      record({ supervisor: 'Thầy TS. Trần Văn Thành' }),
      record({ supervisor: 'Thầy PGS. TS. Trần Văn Thành' }),
    ]);
    expect(slices).toHaveLength(2);
  });

  it('đơn cũ không có xưng hô vẫn gộp được với đơn mới', () => {
    // Đơn nộp trước lần tách ba ô chỉ có "PGS.TS. ..." không kèm Thầy/Cô.
    const slices = supervisorFrequency([
      record({ supervisor: 'PGS. TS. Trần Văn Thành' }),
      record({ supervisor: 'Thầy PGS. TS. Trần Văn Thành' }),
    ]);
    expect(slices).toEqual([{ label: 'PGS. TS. Trần Văn Thành', value: 2 }]);
  });

  it('nhãn giữ nguyên hoa thường của lần gặp đầu tiên', () => {
    const slices = supervisorFrequency([
      record({ supervisor: 'Thầy TS. Trần Văn Thành' }),
      record({ supervisor: 'Thầy TS. TRẦN VĂN THÀNH' }),
    ]);
    expect(slices).toEqual([{ label: 'TS. Trần Văn Thành', value: 2 }]);
  });

  it('ô giảng viên để trống hiện ra chứ không bị bỏ đi', () => {
    expect(supervisorFrequency([record({ supervisor: '' })])).toEqual([
      { label: BLANK_LABEL, value: 1 },
    ]);
  });

  it('sắp giảm dần, cùng số lượng thì theo tên', () => {
    const slices = supervisorFrequency([
      record({ supervisor: 'Cô TS. B' }),
      record({ supervisor: 'Thầy TS. A' }),
      record({ supervisor: 'Thầy TS. C' }),
      record({ supervisor: 'Thầy TS. C' }),
    ]);
    expect(slices.map((s) => s.label)).toEqual(['TS. C', 'TS. A', 'TS. B']);
  });
});

describe('totalSamples', () => {
  it('cộng số mẫu của mọi đơn', () => {
    expect(
      totalSamples([
        record({ samples: [{ name: 'A', state: 'Rắn', solvent: 'X' }] }),
        record({
          samples: [
            { name: 'B', state: 'Rắn', solvent: 'X' },
            { name: 'C', state: 'Lỏng', solvent: 'X' },
          ],
        }),
      ]),
    ).toBe(3);
  });
});
