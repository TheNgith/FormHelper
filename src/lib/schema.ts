import { z } from 'zod';

import {
  CITY,
  DEPARTMENT,
  SAMPLE_STATES,
  SUPERVISOR_HONORIFICS,
  SUPERVISOR_TITLES,
  type SupervisorParts,
  supervisorFullLabel,
} from './constants';

/**
 * Nguồn dữ liệu duy nhất cho biểu mẫu: kiểu dữ liệu, giá trị mặc định và
 * thông báo lỗi đều lấy từ đây. Màn hình nhập, bản xem lại, file PDF và tài
 * liệu ghi vào Firestore đều dùng chung một kiểu `FormValues`.
 *
 * Lưu ý về ranh giới: từ khi bỏ Apps Script, trình duyệt nói chuyện thẳng với
 * Firestore, nên schema này chạy hoàn toàn ở phía người dùng — nó giúp người
 * điền đơn nhận ra lỗi, chứ không ngăn được ai. Việc ngăn nằm ở
 * firestore.rules. Thêm ràng buộc nào thật sự quan trọng thì phải thêm ở cả
 * hai nơi.
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

  // Một chuỗi đã ghép, "Thầy PGS. TS. Trần Văn Thành". Biểu mẫu nhập nó bằng
  // ba ô rời (xem `supervisorPartsSchema` bên dưới) nhưng ra khỏi biểu mẫu
  // thì chỉ còn chuỗi này — và `scripts/submissionRows.ts` dựng lại đơn cũ từ
  // Firestore cũng qua đúng schema này.
  supervisor: required('tên giảng viên hướng dẫn').max(200, 'Tên giảng viên quá dài.'),

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
 * Ba ô giảng viên hướng dẫn — chỉ có trong biểu mẫu.
 *
 * Trần 100 ký tự cho ô tên giữ cho chuỗi ghép luôn dưới mức 200 mà
 * firestore.rules chốt: 'Thầy ' + 'PGS. TS. ' + 100 = 114.
 */
export const supervisorPartsSchema = z.object({
  supervisorHonorific: z.enum(SUPERVISOR_HONORIFICS, {
    error: 'Vui lòng chọn cách xưng hô.',
  }),
  supervisorTitle: z.enum(SUPERVISOR_TITLES, {
    error: 'Học hàm, học vị không hợp lệ.',
  }),
  supervisorName: required('tên giảng viên hướng dẫn').max(100, 'Tên giảng viên quá dài.'),
});

/**
 * Bản nháp lưu tạm: mọi ô đều có thể còn trống nên không dùng được
 * `formSchema`. Schema này chỉ kiểm tra hình dạng dữ liệu, dùng khi đọc lại
 * bản nháp từ localStorage — nội dung ở đó có thể sót từ phiên bản cũ hoặc
 * bị sửa tay.
 *
 * Bản nháp lưu trước khi giảng viên hướng dẫn tách thành ba ô có khóa
 * `supervisor` và thiếu cả ba khóa mới, nên nó trượt ở đây và `loadDraft`
 * trả về null — sinh viên mở lại thấy biểu mẫu trống thay vì một bản nháp
 * điền dở nửa cũ nửa mới.
 */
export const draftSchema = z.object({
  department: z.string(),
  supervisorHonorific: z.string(),
  supervisorTitle: z.string(),
  supervisorName: z.string(),
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
/**
 * Bản nháp thay ô `supervisor` đã ghép bằng ba ô rời mà màn hình nhập thật sự
 * hiển thị. `validateForm` là chỗ ba ô ấy ghép lại thành một.
 */
export type FormDraft = Omit<FormValues, 'samples' | 'supervisor'> &
  SupervisorParts & { samples: SampleDraft[] };

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

/**
 * Biểu mẫu trống.
 *
 * `email` từng là tham số vì nó đến từ token đăng nhập. Không còn đăng nhập
 * nên nó là một ô như mọi ô khác: sinh viên tự gõ, `formSchema` kiểm tra dạng
 * địa chỉ, và firestore.rules chỉ chốt được độ dài. Không ai chứng minh nó
 * thuộc về người gửi nữa.
 */
export function emptyForm(): FormDraft {
  return {
    department: DEPARTMENT,
    supervisorHonorific: SUPERVISOR_HONORIFICS[0],
    supervisorTitle: '',
    supervisorName: '',
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
  const parts = supervisorPartsSchema.safeParse(draft);

  // Bỏ `id` khỏi từng dòng mẫu; thứ tự mảng giữ nguyên nên đường dẫn lỗi
  // (`samples.2.solvent`) vẫn khớp với dòng đang hiển thị.
  const candidate = {
    ...draft,
    supervisor: parts.success ? supervisorFullLabel(parts.data) : '',
    samples: draft.samples.map(({ id: _id, ...row }) => row),
  };
  const parsed = formSchema.safeParse(candidate);

  if (parsed.success && parts.success) return { ok: true, values: parsed.data };

  const errors = parsed.success ? {} : collectErrors(parsed.error);

  // Ba ô hỏng thì chuỗi ghép ở trên là chuỗi rỗng, nên `formSchema` kêu thêm
  // một lỗi ở khóa `supervisor`. Không màn hình nào có ô mang tên đó — giữ
  // lại chỉ khiến bảng đếm "còn N ô chưa hợp lệ" đếm dư và `focusFirstError`
  // đi tìm một ô không tồn tại.
  if (!parts.success) delete errors.supervisor;

  return {
    ok: false,
    errors: { ...errors, ...(parts.success ? {} : collectErrors(parts.error)) },
  };
}
