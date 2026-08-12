import { describe, expect, it } from 'vitest';

import type { FormValues } from '../src/lib/schema.ts';
import {
  type SubmissionRow,
  csvFilename,
  submissionsToRows,
  toCsv,
  toRow,
} from './submissionRows.ts';

const VALUES: FormValues = {
  department: 'Bộ môn Hóa Hữu Cơ',
  supervisor: 'PGS.TS. Trần Văn Thành',
  studentName: 'Nguyễn Thị Ngọc Ánh',
  studentId: '2200123',
  email: 'ngocanh@ump.edu.vn',
  phone: '0912345678',
  className: 'D2A',
  cohort: '2022 - 2026',
  city: 'TP. HCM',
  date: '2026-08-12',
  samples: [
    { name: 'Chất A, dạng muối', state: 'Rắn', solvent: 'Methanol' },
    { name: 'Chất B', state: 'Lỏng', solvent: 'Ethanol' },
  ],
};

/** Tài liệu thô như Firestore trả về, trừ createdAt do script đổi sẵn. */
function document(overrides: Record<string, unknown> = {}) {
  return {
    maHoSo: 'IR-20260812-A7K3M9',
    studentName: VALUES.studentName,
    studentId: VALUES.studentId,
    email: VALUES.email,
    phone: VALUES.phone,
    className: VALUES.className,
    cohort: VALUES.cohort,
    department: VALUES.department,
    supervisor: VALUES.supervisor,
    city: VALUES.city,
    requestDate: VALUES.date,
    samples: VALUES.samples,
    ...overrides,
  };
}

function row(overrides: Partial<SubmissionRow> = {}): SubmissionRow {
  return {
    ...toRow('IR-20260812-A7K3M9', document(), new Date(2026, 7, 12, 9, 5)),
    ...overrides,
  };
}

describe('đọc tài liệu thành dòng', () => {
  it('dựng lại nội dung đơn qua formSchema', () => {
    const parsed = toRow('IR-20260812-A7K3M9', document(), null);
    expect(parsed.values).not.toBeNull();
    expect(parsed.values?.samples).toHaveLength(2);
    expect(parsed.sampleCount).toBe(2);
  });

  it('đơn không đúng hình dạng vẫn thành một dòng, chỉ thiếu values', () => {
    // Rules chốt được kiểu và số lượng mẫu nhưng không duyệt từng phần tử, và
    // không còn danh tính nào đứng sau nội dung. Tài liệu đọc lên vẫn đáng ngờ.
    const parsed = toRow(
      'IR-20260812-A7K3M9',
      document({ studentId: 'không-phải-số' }),
      null,
    );
    expect(parsed.values).toBeNull();
    expect(parsed.studentName).toBe('Nguyễn Thị Ngọc Ánh');
  });

  it('tài liệu của bản cũ còn trường uid vẫn đọc được', () => {
    // Đơn nộp thời còn đăng nhập vẫn nằm trong cơ sở dữ liệu. Không di trú
    // chúng: khóa lạ bị bỏ qua ở đây, và không trình duyệt nào đọc chúng nữa.
    const parsed = toRow(
      'IR-20260812-A7K3M9',
      document({ uid: 'uid-sv-1' }),
      new Date(2026, 7, 12, 9, 5),
    );
    expect(parsed.values).not.toBeNull();
  });

  it('mã hồ sơ bốn ký tự của bản cũ vẫn xuất được', () => {
    // Mã được nới từ bốn lên sáu ký tự cùng với bẫy gửi lại. Bản xuất không
    // được vì thế mà bỏ sót các đơn nộp trước đó.
    const parsed = toRow('IR-20260812-A7K3', document({ maHoSo: 'IR-20260812-A7K3' }), null);
    expect(parsed.maHoSo).toBe('IR-20260812-A7K3');
    expect(parsed.values).not.toBeNull();
  });
});

describe('bọc nháy theo RFC 4180', () => {
  it('để nguyên ô không có ký tự đặc biệt', () => {
    expect(toCsv([['a', 'b']])).toBe('a,b');
  });

  it('bọc nháy ô có dấu phẩy', () => {
    expect(toCsv([['Chất A, dạng muối']])).toBe('"Chất A, dạng muối"');
  });

  it('nhân đôi nháy kép bên trong', () => {
    expect(toCsv([['mẫu "X"']])).toBe('"mẫu ""X"""');
  });

  it('bọc nháy ô có xuống dòng', () => {
    expect(toCsv([['dòng 1\ndòng 2']])).toBe('"dòng 1\ndòng 2"');
  });

  it('ngăn dòng bằng CRLF', () => {
    expect(toCsv([['a'], ['b']])).toBe('a\r\nb');
  });
});

describe('xuất danh sách đơn', () => {
  it('giữ nguyên dấu phẩy trong tên mẫu', () => {
    // Bản Apps Script cũ xóa hết dấu phẩy trong tên mẫu rồi mới nối bằng dấu
    // phẩy, tức là sửa nội dung của người ta mà không báo. Bọc nháy đúng cách
    // thì không phải hy sinh gì.
    const csv = toCsv(submissionsToRows([row()]));
    expect(csv).toContain('"Chất A, dạng muối, Chất B"');
  });

  it('có đủ số cột như dòng tiêu đề', () => {
    const rows = submissionsToRows([row()]);
    expect(rows[1]).toHaveLength(rows[0].length);
  });

  it('vẫn xuất được đơn không đọc được đúng hình dạng', () => {
    // Giấu đi thì bộ môn mất một lá đơn mà không hề biết.
    const rows = submissionsToRows([row({ values: null })]);
    expect(rows[1][0]).toBe('IR-20260812-A7K3M9');
    expect(rows[1][2]).toBe('Nguyễn Thị Ngọc Ánh');
    expect(rows[1]).toHaveLength(rows[0].length);
  });

  it('ghi thời điểm nộp theo giờ máy người xem', () => {
    const rows = submissionsToRows([row()]);
    expect(rows[1][1]).toBe('12/08/2026 09:05');
  });

  it('để trống thời điểm nộp khi tài liệu chưa có dấu thời gian', () => {
    const rows = submissionsToRows([row({ createdAt: null })]);
    expect(rows[1][1]).toBe('');
  });
});

describe('tên file', () => {
  it('có ngày để nhiều lần xuất không đè lên nhau', () => {
    expect(csvFilename(new Date(2026, 7, 12))).toBe('don-thiet-bi-20260812.csv');
  });
});
