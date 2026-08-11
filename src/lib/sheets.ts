/**
 * Ghi một dòng vào Google Sheet thông qua Apps Script Web App.
 *
 * Trang này là trang tĩnh nên không giữ được khóa dịch vụ của Google. Cách
 * duy nhất còn lại là gọi tới một Apps Script triển khai ở chế độ "Anyone".
 * Địa chỉ và token đều nằm trong gói JavaScript gửi xuống trình duyệt — xem
 * mục "Bảo mật" trong README.
 */

import type { FormValues } from './schema';
import { nfc } from './text';

const ENDPOINT = import.meta.env.VITE_SHEETS_ENDPOINT as string | undefined;
const TOKEN = import.meta.env.VITE_SHEETS_TOKEN as string | undefined;

const TIMEOUT_MS = 10_000;

export type SubmitPayload = {
  token: string;
  maHoSo: string;
  studentName: string;
  studentId: string;
  email: string;
  phone: string;
  className: string;
  cohort: string;
  department: string;
  supervisor: string;
  city: string;
  requestDate: string;
  samples: Array<{ name: string; state: string; solvent: string }>;
  userAgent: string;
  /** Bẫy bot: người dùng thật không bao giờ thấy ô này nên luôn để trống. */
  website: string;
};

export function buildPayload(
  values: FormValues,
  maHoSo: string,
  honeypot = '',
): SubmitPayload {
  return {
    token: TOKEN ?? '',
    maHoSo,
    studentName: nfc(values.studentName),
    studentId: values.studentId,
    email: values.email,
    phone: values.phone,
    className: nfc(values.className),
    cohort: values.cohort,
    department: nfc(values.department),
    supervisor: nfc(values.supervisor),
    city: nfc(values.city),
    requestDate: values.date,
    // Giữ nguyên cấu trúc mảng; việc gộp thành ba ô ngăn cách bằng dấu phẩy
    // do Code.gs làm, để quy tắc gộp chỉ nằm ở một chỗ duy nhất.
    samples: values.samples.map((s) => ({
      name: nfc(s.name),
      state: nfc(s.state),
      solvent: nfc(s.solvent),
    })),
    userAgent: navigator.userAgent,
    website: honeypot,
  };
}

export class SubmitError extends Error {}

/**
 * Gửi đơn. Ném lỗi `SubmitError` kèm câu tiếng Việt hiển thị được cho người
 * dùng nếu không ghi được.
 */
export async function submitToSheet(payload: SubmitPayload): Promise<void> {
  if (!ENDPOINT) {
    throw new SubmitError(
      'Ứng dụng chưa được cấu hình địa chỉ nhận đơn. Vui lòng báo cho bộ môn.',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      // Dùng text/plain để trình duyệt coi đây là "simple request" và bỏ qua
      // bước preflight OPTIONS — Apps Script không trả lời được OPTIONS.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new SubmitError(
        'Máy chủ không phản hồi sau 10 giây. Kiểm tra kết nối mạng rồi thử lại.',
      );
    }
    throw new SubmitError(
      'Không kết nối được tới máy chủ. Kiểm tra kết nối mạng rồi thử lại.',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new SubmitError(`Máy chủ trả về lỗi ${response.status}. Vui lòng thử lại.`);
  }

  let body: { ok?: boolean; error?: string };
  try {
    body = JSON.parse(await response.text());
  } catch {
    throw new SubmitError('Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.');
  }

  if (!body.ok) {
    throw new SubmitError(
      body.error === 'unauthorized'
        ? 'Ứng dụng không được phép ghi vào bảng dữ liệu. Vui lòng báo cho bộ môn.'
        : 'Máy chủ không ghi được đơn. Vui lòng thử lại.',
    );
  }
}
