/**
 * Bản sao của đơn đã gửi, lưu trong sessionStorage.
 *
 * Khi tới màn hình xác nhận thì dòng dữ liệu đã nằm trong Google Sheet rồi.
 * Nếu sinh viên lỡ tải lại trang hoặc vuốt quay lại trước khi bấm tải PDF mà
 * ứng dụng quên mất mã hồ sơ, sẽ có một dòng trong bảng không đi kèm đơn nào
 * — đúng cái sai mà ứng dụng này sinh ra để tránh. Vì vậy nội dung đã gửi
 * được ghi lại ngay, và màn hình xác nhận đọc lại từ đây khi bộ nhớ trống.
 */

import type { FormValues } from './schema';
import { formSchema } from './schema';

const KEY = 'don-thiet-bi:da-gui';

export type SubmittedRecord = {
  maHoSo: string;
  values: FormValues;
};

export function saveSubmitted(record: SubmittedRecord): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // Chế độ riêng tư hoặc hết dung lượng: không lưu được cũng không sao,
    // dữ liệu trong bộ nhớ vẫn dùng bình thường cho tới khi tải lại trang.
  }
}

export function loadSubmitted(): SubmittedRecord | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { maHoSo, values } = parsed as Record<string, unknown>;
    if (typeof maHoSo !== 'string' || !maHoSo) return null;

    // Kiểm tra lại bằng chính schema của biểu mẫu: nội dung trong
    // sessionStorage có thể sót lại từ phiên bản cũ hoặc bị sửa tay.
    const checked = formSchema.safeParse(values);
    if (!checked.success) return null;

    return { maHoSo, values: checked.data };
  } catch {
    return null;
  }
}

export function clearSubmitted(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Không xóa được thì bỏ qua; lần gửi sau sẽ ghi đè.
  }
}
