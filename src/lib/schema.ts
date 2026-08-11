import { z } from 'zod';

import { CITY, DEPARTMENT, SAMPLE_STATES, SUPERVISORS } from './constants';

/**
 * Nguồn dữ liệu duy nhất cho biểu mẫu: kiểu dữ liệu, giá trị mặc định và
 * thông báo lỗi đều lấy từ đây. Màn hình nhập, bản xem lại, file PDF và dòng
 * ghi vào Google Sheet đều dùng chung một kiểu `FormValues`.
 */

const required = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Vui lòng nhập ${label}.`);

export const sampleSchema = z.object({
  name: required('tên mẫu').max(200, 'Tên mẫu quá dài (tối đa 200 ký tự).'),
  state: z.enum(SAMPLE_STATES, { error: 'Vui lòng chọn trạng thái mẫu.' }),
  solvent: required('dung môi').max(120, 'Tên dung môi quá dài (tối đa 120 ký tự).'),
});

export const formSchema = z.object({
  department: required('tên bộ môn'),
  supervisor: required('tên giảng viên hướng dẫn'),

  studentName: required('họ và tên').max(100, 'Họ tên quá dài.'),
  studentId: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã số sinh viên.')
    .regex(/^\d{6,12}$/, 'Mã số sinh viên chỉ gồm chữ số (6–12 chữ số).'),
  email: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập email.')
    .pipe(z.email({ error: 'Email không hợp lệ.' })),
  phone: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập số điện thoại.')
    .regex(/^0\d{9}$/, 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0.'),
  className: required('lớp'),
  cohort: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập niên khóa.')
    .regex(/^\d{4}\s*-\s*\d{4}$/, 'Niên khóa theo dạng 2022 - 2026.')
    .refine((v) => {
      const [from, to] = v.split('-').map((p) => Number(p.trim()));
      return to > from;
    }, 'Năm kết thúc phải sau năm bắt đầu.'),

  city: required('nơi làm đơn'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ.')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Ngày không hợp lệ.'),

  samples: z
    .array(sampleSchema)
    .min(1, 'Đơn phải có ít nhất một mẫu đo.')
    .max(60, 'Tối đa 60 mẫu trong một đơn.'),
});

export type SampleRow = z.infer<typeof sampleSchema>;
export type FormValues = z.infer<typeof formSchema>;

/**
 * Bản nháp lưu tạm: mọi ô đều có thể còn trống nên không dùng được
 * `formSchema`. Schema này chỉ kiểm tra hình dạng dữ liệu, dùng khi đọc lại
 * bản nháp từ localStorage — nội dung ở đó có thể sót từ phiên bản cũ hoặc
 * bị sửa tay.
 */
export const draftSchema = z.object({
  department: z.string(),
  supervisor: z.string(),
  studentName: z.string(),
  studentId: z.string(),
  email: z.string(),
  phone: z.string(),
  className: z.string(),
  cohort: z.string(),
  city: z.string(),
  date: z.string(),
  samples: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        state: z.string(),
        solvent: z.string(),
      }),
    )
    .min(1),
});

/**
 * Dạng thô khi đang nhập: mọi ô đều là chuỗi, kể cả ô chưa chọn.
 *
 * `id` chỉ tồn tại ở phía giao diện để React giữ đúng danh tính từng dòng khi
 * người dùng đổi thứ tự hoặc xóa dòng giữa. Trường này bị loại bỏ trước khi
 * kiểm tra dữ liệu nên không bao giờ lọt vào PDF hay Google Sheet.
 */
export type SampleDraft = {
  id: string;
  name: string;
  state: string;
  solvent: string;
};
export type FormDraft = Omit<FormValues, 'samples'> & { samples: SampleDraft[] };

let rowCounter = 0;

export function newRowId(): string {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

export function emptySample(): SampleDraft {
  return { id: newRowId(), name: '', state: '', solvent: '' };
}

/** Ngày hôm nay theo múi giờ máy, dạng YYYY-MM-DD cho <input type="date">. */
export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function emptyForm(): FormDraft {
  return {
    department: DEPARTMENT,
    supervisor: SUPERVISORS[0].name,
    studentName: '',
    studentId: '',
    email: '',
    phone: '',
    className: '',
    cohort: '',
    city: CITY,
    date: todayISO(),
    samples: [emptySample()],
  };
}

/**
 * Đường dẫn tới ô lỗi, ví dụ `studentId` hoặc `samples.2.solvent`.
 * Dùng làm khóa trong bản đồ lỗi hiển thị cạnh từng ô nhập.
 */
export type ErrorMap = Record<string, string>;

export function collectErrors(error: z.ZodError): ErrorMap {
  const map: ErrorMap = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    // Giữ lỗi đầu tiên của mỗi ô — hiện nhiều lỗi cùng lúc chỉ gây rối.
    if (!(key in map)) map[key] = issue.message;
  }
  return map;
}

export type ValidationResult =
  | { ok: true; values: FormValues }
  | { ok: false; errors: ErrorMap };

export function validateForm(draft: FormDraft): ValidationResult {
  // Bỏ `id` khỏi từng dòng mẫu; thứ tự mảng giữ nguyên nên đường dẫn lỗi
  // (`samples.2.solvent`) vẫn khớp với dòng đang hiển thị.
  const candidate = {
    ...draft,
    samples: draft.samples.map(({ id: _id, ...row }) => row),
  };
  const parsed = formSchema.safeParse(candidate);
  return parsed.success
    ? { ok: true, values: parsed.data }
    : { ok: false, errors: collectErrors(parsed.error) };
}
