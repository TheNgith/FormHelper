/**
 * Lưu trữ lâu dài trong localStorage: bản nháp đang điền và thông tin cá
 * nhân dùng lại cho lần sau.
 *
 * Khác với `session.ts` (chỉ sống trong một tab, giữ đơn vừa gửi), dữ liệu ở
 * đây còn lại sau khi đóng trình duyệt. Vì vậy luôn có nút xóa để máy tính
 * dùng chung trong phòng thí nghiệm không giữ lại tên và mã số của người
 * trước.
 */

import type { FormDraft, FormValues } from './schema';
import { draftSchema, emptyForm, newRowId, todayISO } from './schema';

const DRAFT_KEY = 'don-thiet-bi:ban-nhap';
const PROFILE_KEY = 'don-thiet-bi:thong-tin-ca-nhan';

/** Những ô lặp lại ở mọi lần nộp đơn của cùng một sinh viên. */
export type Profile = Pick<
  FormValues,
  'studentName' | 'studentId' | 'email' | 'phone' | 'className' | 'cohort'
>;

const PROFILE_FIELDS = [
  'studentName',
  'studentId',
  'email',
  'phone',
  'className',
  'cohort',
] as const;

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Chế độ riêng tư hoặc hết dung lượng: không lưu được thì thôi, ứng
    // dụng vẫn chạy bình thường với dữ liệu trong bộ nhớ.
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Bỏ qua.
  }
}

// ---------- Bản nháp ----------

export function saveDraft(draft: FormDraft): void {
  write(DRAFT_KEY, draft);
}

export function loadDraft(): FormDraft | null {
  const parsed = draftSchema.safeParse(read(DRAFT_KEY));
  if (!parsed.success) return null;

  // Bộ đếm sinh id dòng bắt đầu lại từ đầu sau mỗi lần tải trang. Nếu giữ
  // nguyên id cũ thì dòng thêm mới sẽ trùng id với dòng đã khôi phục, khiến
  // React nhầm lẫn hai dòng khác nhau. Cấp lại id mới cho toàn bộ danh sách.
  return {
    ...parsed.data,
    samples: parsed.data.samples.map((sample) => ({ ...sample, id: newRowId() })),
  };
}

export function clearDraft(): void {
  remove(DRAFT_KEY);
}

// ---------- Thông tin cá nhân ----------

export function saveProfile(values: FormValues): void {
  const profile: Profile = {
    studentName: values.studentName,
    studentId: values.studentId,
    email: values.email,
    phone: values.phone,
    className: values.className,
    cohort: values.cohort,
  };
  write(PROFILE_KEY, profile);
}

export function loadProfile(): Profile | null {
  const raw = read(PROFILE_KEY);
  if (typeof raw !== 'object' || raw === null) return null;

  const record = raw as Record<string, unknown>;
  const profile = {} as Profile;
  for (const field of PROFILE_FIELDS) {
    const value = record[field];
    if (typeof value !== 'string') return null;
    profile[field] = value;
  }
  return profile;
}

export function clearProfile(): void {
  remove(PROFILE_KEY);
}

export function hasProfile(): boolean {
  return loadProfile() !== null;
}

/** Biểu mẫu trống, điền sẵn thông tin cá nhân đã lưu nếu có. */
export function freshForm(profile: Profile | null): FormDraft {
  const base = emptyForm();
  return profile ? { ...base, ...profile, date: todayISO() } : base;
}
