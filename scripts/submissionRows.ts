/**
 * Đọc một tài liệu `submissions` thành dòng dữ liệu, và dựng bảng CSV.
 *
 * Phần thuần túy của việc xuất dữ liệu: không chạm firebase-admin, không chạm
 * hệ tệp, nên kiểm tra được bằng vitest bình thường. Việc gọi Firestore nằm ở
 * export-csv.ts.
 *
 * Trước đây đoạn này chạy trong trình duyệt ở trang quản trị. Trang đó đã bị
 * gỡ cùng với đăng nhập — không còn danh tính nên firestore.rules không mở
 * được đường đọc nào cho một trình duyệt mà không mở luôn cho cả Internet.
 * Bản thân cách xử lý dữ liệu thì không liên quan gì tới trình duyệt, nên nó
 * chuyển sang đây gần như nguyên vẹn.
 *
 * Bản Apps Script cũ gộp ba cột mẫu bằng cách *xóa hết dấu phẩy* trong tên
 * mẫu rồi nối lại bằng dấu phẩy — một mẫu tên "Chất A, dạng muối" bị sửa nội
 * dung mà không ai hay. Ở đây dấu phẩy được giữ nguyên và ô được bọc nháy
 * đúng RFC 4180, nên không phải hy sinh gì cả.
 */

import { type FormValues, formSchema } from '../src/lib/schema.ts';
import { formatShortDate } from '../src/lib/text.ts';

const HEADER = [
  'Mã hồ sơ',
  'Thời điểm nộp',
  'Họ và tên',
  'Mã số sinh viên',
  'Email',
  'SĐT',
  'Lớp',
  'Niên khóa',
  'Bộ môn',
  'Giảng viên hướng dẫn',
  'Nơi làm đơn',
  'Ngày làm đơn',
  'Số mẫu',
  'Tên mẫu',
  'Trạng thái mẫu',
  'Dung môi',
];

export type SubmissionRow = {
  maHoSo: string;
  /** Giờ máy chủ ghi nhận, không phải ngày sinh viên điền trên đơn. */
  createdAt: Date | null;
  studentName: string;
  studentId: string;
  email: string;
  sampleCount: number;
  /**
   * Nội dung đơn đã qua `formSchema`, hoặc `null` nếu tài liệu trong cơ sở dữ
   * liệu không đúng hình dạng.
   *
   * Lần kiểm tra này nay quan trọng hơn trước chứ không phải ít đi: rules chỉ
   * còn chốt được kiểu, kích thước và số lượng mẫu, và không còn một danh
   * tính nào đứng sau nội dung. Mọi thứ trong tài liệu đều là thứ ai đó gõ
   * vào.
   *
   * Đơn không đọc được vẫn nằm trong bản xuất, chỉ thiếu các cột dựng lại từ
   * `formSchema`: bỏ nó đi thì bộ môn mất một lá đơn mà không hề biết.
   */
  values: FormValues | null;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** `data` là tài liệu thô đọc từ Firestore; `createdAt` đã đổi sang Date. */
export function toRow(
  maHoSo: string,
  data: Record<string, unknown>,
  createdAt: Date | null,
): SubmissionRow {
  // Tài liệu lưu `requestDate`, biểu mẫu gọi ô đó là `date`.
  const parsed = formSchema.safeParse({
    department: data.department,
    supervisor: data.supervisor,
    studentName: data.studentName,
    studentId: data.studentId,
    email: data.email,
    phone: data.phone,
    className: data.className,
    cohort: data.cohort,
    city: data.city,
    date: data.requestDate,
    samples: data.samples,
  });

  return {
    maHoSo,
    createdAt,
    studentName: text(data.studentName),
    studentId: text(data.studentId),
    email: text(data.email),
    sampleCount: Array.isArray(data.samples) ? data.samples.length : 0,
    values: parsed.success ? parsed.data : null,
  };
}

/** RFC 4180: bọc nháy khi ô chứa dấu phẩy, nháy kép hoặc xuống dòng; nháy kép
 *  bên trong được nhân đôi. */
function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(rows: string[][]): string {
  // CRLF theo đúng RFC 4180; Excel trên Windows đọc mới không dồn thành một
  // dòng.
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n');
}

function formatMoment(date: Date | null): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function submissionsToRows(submissions: SubmissionRow[]): string[][] {
  return [
    HEADER,
    ...submissions.map((row) => {
      const values = row.values;
      const samples = values?.samples ?? [];
      return [
        row.maHoSo,
        formatMoment(row.createdAt),
        values?.studentName ?? row.studentName,
        values?.studentId ?? row.studentId,
        values?.email ?? row.email,
        values?.phone ?? '',
        values?.className ?? '',
        values?.cohort ?? '',
        values?.department ?? '',
        values?.supervisor ?? '',
        values?.city ?? '',
        values ? formatShortDate(values.date) : '',
        String(row.sampleCount),
        samples.map((s) => s.name).join(', '),
        samples.map((s) => s.state).join(', '),
        samples.map((s) => s.solvent).join(', '),
      ];
    }),
  ];
}

/**
 * Excel trên Windows đoán bảng mã theo vùng chứ không mặc định UTF-8, nên
 * không có BOM thì "Nguyễn" mở ra thành "Nguyá»…n". Ba byte đứng đầu là cái
 * giá phải trả để bộ môn mở file bằng cú nhấp đúp.
 */
export function csvFileContents(csv: string): string {
  return '\uFEFF' + csv;
}

export function csvFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `don-thiet-bi-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.csv`;
}
