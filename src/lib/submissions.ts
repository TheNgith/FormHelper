/**
 * Ghi một đơn vào Firestore.
 *
 * Tài liệu được khóa theo mã hồ sơ (`submissions/{maHoSo}`) và firestore.rules
 * chỉ cho `create`, nên một mã hồ sơ chỉ ghi được đúng một lần. Việc dò trùng
 * mà Code.gs từng phải làm bằng cách quét cả bảng nay là tính chất sẵn có của
 * cách đặt khóa.
 */

import { FirebaseError } from 'firebase/app';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from './firebase';
import type { FormValues } from './schema';
import type { SubmissionField } from './submissionFields';
import { nfc } from './text';

export const COLLECTION = 'submissions';

/** Ứng dụng không dùng bộ nhớ đệm ngoại tuyến của Firestore, nên lời hứa của
 *  `setDoc` chỉ xong khi máy chủ đã nhận. Mất mạng thì nó treo chứ không hỏng,
 *  vì vậy phải tự đặt hạn. */
const TIMEOUT_MS = 15_000;

export class SubmitError extends Error {
  /**
   * Lỗi này không kết luận được: lệnh ghi *có thể* đã tới máy chủ.
   *
   * Đây là toàn bộ trạng thái mà bẫy gửi lại cần — xem `submitForm`. Màn hình
   * gọi chỉ việc nhớ giá trị này rồi đưa lại vào lần bấm sau.
   */
  readonly inconclusive: boolean;

  constructor(message: string, { inconclusive = false } = {}) {
    super(message);
    this.inconclusive = inconclusive;
  }
}

/**
 * Hình dạng một tài liệu trong `submissions`, trừ `createdAt` do máy chủ đặt.
 *
 * Danh sách khóa phải khớp `SUBMISSION_FIELDS`, và firestore.rules chép lại
 * đúng danh sách đó để chốt `hasOnly`. Ràng buộc dưới đây bắt TypeScript canh
 * một nửa liên kết ấy; nửa còn lại — rules với mã nguồn — do
 * firestore.rules.test.ts canh.
 */
export type SubmissionFields = Record<Exclude<SubmissionField, 'createdAt'>, unknown> & {
  maHoSo: string;
  email: string;
  studentName: string;
  studentId: string;
  phone: string;
  className: string;
  cohort: string;
  department: string;
  supervisor: string;
  city: string;
  requestDate: string;
  samples: Array<{ name: string; state: string; solvent: string }>;
};

/**
 * Chuẩn hóa NFC mọi chuỗi do người dùng gõ, đúng như bản cũ làm trước khi ghi
 * vào Google Sheet: bộ gõ tiếng Việt trên macOS cho ra dạng phân rã, và bản
 * PDF dựng lại từ dữ liệu này sẽ bị chồng dấu nếu không chuẩn hóa.
 *
 * Xuất ra ngoài vì trang quản trị nhập tay một đơn cũng đi qua đây. Đó là cả
 * mục đích: một đơn nhập tay giống hệt một đơn sinh viên nộp về hình dạng, kể
 * cả chuẩn hóa NFC, nên nó không thể trôi khỏi thứ mà firestore.rules chấp
 * nhận. Một bản chép thứ hai của hàm này thì có thể.
 */
export function toDocument(values: FormValues, maHoSo: string): SubmissionFields {
  return {
    maHoSo,
    // Email nay do sinh viên tự gõ chứ không đến từ token nào. Vẫn chuẩn hóa
    // và vẫn ghi xuống: nó được in lên đơn và là cách bộ môn liên hệ lại.
    email: nfc(values.email),
    studentName: nfc(values.studentName),
    studentId: values.studentId,
    phone: values.phone,
    className: nfc(values.className),
    cohort: values.cohort,
    department: nfc(values.department),
    supervisor: nfc(values.supervisor),
    city: nfc(values.city),
    requestDate: values.date,
    samples: values.samples.map((s) => ({
      name: nfc(s.name),
      state: nfc(s.state),
      solvent: nfc(s.solvent),
    })),
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) =>
      // Hết hạn chờ là trường hợp không kết luận được điển hình: lệnh ghi có
      // thể đã tới máy chủ, chỉ phản hồi là không về.
      setTimeout(() => reject(new SubmitError(label, { inconclusive: true })), ms),
    ),
  ]);
}

/** Máy chủ từ chối thẳng, không phải mạng hỏng giữa chừng. */
function isRejection(error: unknown): boolean {
  return error instanceof FirebaseError && error.code === 'permission-denied';
}

function describe(error: unknown): SubmitError {
  if (error instanceof SubmitError) return error;

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        return new SubmitError(
          'Máy chủ từ chối đơn này. Hãy tải lại trang rồi gửi lại; nếu vẫn không được, báo cho bộ môn.',
        );
      case 'unavailable':
        return new SubmitError(
          'Không kết nối được tới máy chủ. Kiểm tra kết nối mạng rồi thử lại.',
          { inconclusive: true },
        );
      case 'resource-exhausted':
        return new SubmitError('Máy chủ đang quá tải. Đợi một lát rồi bấm gửi lại.', {
          inconclusive: true,
        });
    }
  }

  return new SubmitError('Máy chủ không ghi được đơn. Vui lòng thử lại.', {
    inconclusive: true,
  });
}

export type SubmitOptions = {
  /**
   * Lần bấm gửi trước cho **đúng mã hồ sơ này** đã hỏng theo kiểu không kết
   * luận được (`SubmitError.inconclusive`).
   */
  previousAttemptInconclusive?: boolean;
};

/**
 * Gửi đơn. Ném `SubmitError` kèm câu tiếng Việt hiển thị được nếu không ghi
 * được; trở về bình thường nếu đơn đã nằm trong cơ sở dữ liệu — kể cả khi nó
 * nằm đó từ lần bấm trước.
 *
 * ## Bẫy gửi lại, không đọc lại tài liệu nào
 *
 * Rules chỉ cho `create`, nên lần gửi lại sau khi mất phản hồi mạng — dù lần
 * trước thực ra đã ghi được — bị từ chối. Không xử lý riêng thì sinh viên
 * nhận một câu báo lỗi đáng sợ về một lá đơn đã nằm trong cơ sở dữ liệu, tức
 * là đúng lỗi nộp hai lần mà cách khóa theo mã hồ sơ sinh ra để tránh.
 *
 * Bản cũ trả lời câu hỏi "đơn này đã là của tôi chưa" bằng cách đọc lại tài
 * liệu. Nay không còn đường đọc nào cho trình duyệt, nên câu trả lời phải suy
 * ra từ lịch sử các lần bấm:
 *
 *   - `permission-denied` chỉ có hai nguyên nhân: tài liệu đã tồn tại, hoặc
 *     nội dung sai hình dạng.
 *   - Nội dung sai hình dạng thì hỏng **ngay từ lần bấm đầu**, trong vài chục
 *     mili giây, không qua timeout nào.
 *
 * Vậy nên: `permission-denied` **sau** một lần hỏng không kết luận được
 * (timeout, `unavailable`, lỗi lạ) nghĩa là chính ta đã ghi được từ lần
 * trước → coi như thành công. `permission-denied` ở lần bấm đầu là một lời từ
 * chối thật → báo lỗi.
 *
 * Chỗ suy luận này còn một khe hở, ghi ra cho sòng phẳng: nếu lần bấm đầu
 * hỏng vì mạng rồi lần sau bị App Check từ chối (token hết hạn, điểm
 * reCAPTCHA thấp), ứng dụng sẽ báo thành công cho một lá đơn chưa hề được
 * ghi. Không đọc lại được tài liệu thì không có cách nào phân biệt.
 *
 * Và trang nộp đơn *vẫn* không đọc lại được, kể cả sau khi trang quản trị mở
 * lại `allow read`: quyền đọc ấy đòi một tài khoản trong danh sách trắng, thứ
 * sinh viên không có. Đổi lại là không mở một đường đọc nào cho cả Internet —
 * xem `isAdmin()` trong firestore.rules.
 */
export async function submitForm(
  values: FormValues,
  maHoSo: string,
  { previousAttemptInconclusive = false }: SubmitOptions = {},
): Promise<void> {
  const ref = doc(db, COLLECTION, maHoSo);

  try {
    await withTimeout(
      setDoc(ref, {
        ...toDocument(values, maHoSo),
        // Rules đòi `createdAt == request.time`, nên giờ ghi là giờ của máy
        // chủ. Đồng hồ máy sinh viên không tính.
        createdAt: serverTimestamp(),
      }),
      TIMEOUT_MS,
      'Máy chủ không phản hồi sau 15 giây. Kiểm tra kết nối mạng rồi thử lại.',
    );
  } catch (error) {
    if (previousAttemptInconclusive && isRejection(error)) return;
    throw describe(error);
  }
}
