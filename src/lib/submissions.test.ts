import { FirebaseError } from 'firebase/app';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FormValues } from './schema';
import { SUBMISSION_FIELDS } from './submissionFields';

const mocks = vi.hoisted(() => ({
  setDoc: vi.fn(),
}));

vi.mock('./firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
  setDoc: mocks.setDoc,
  serverTimestamp: () => '<serverTimestamp>',
}));

const { SubmitError, submitForm } = await import('./submissions');

const MA_HO_SO = 'IR-20260812-A7K3M9';

const VALUES: FormValues = {
  department: 'Bộ môn Hóa Hữu Cơ',
  supervisor: 'Thầy PGS.TS. Trần Văn Thành',
  studentName: 'Nguyễn Thị Ngọc Ánh',
  studentId: '2200123',
  email: 'ngocanh@ump.edu.vn',
  phone: '0912345678',
  className: 'D2A',
  cohort: '2022 - 2026',
  city: 'TP. HCM',
  date: '2026-08-12',
  samples: [{ name: 'Mẫu A', state: 'Rắn', solvent: 'Methanol' }],
};

function firebaseError(code: string) {
  return new FirebaseError(code, `giả lập ${code}`);
}

beforeEach(() => {
  mocks.setDoc.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('submitForm', () => {
  it('ghi tài liệu dưới khóa là mã hồ sơ', async () => {
    mocks.setDoc.mockResolvedValue(undefined);

    await submitForm(VALUES, MA_HO_SO);

    const [ref, data] = mocks.setDoc.mock.calls[0];
    expect(ref.path).toBe(`submissions/${MA_HO_SO}`);
    expect(data.maHoSo).toBe(MA_HO_SO);
    // Email nay lấy từ ô sinh viên tự gõ, không còn token nào để lấy.
    expect(data.email).toBe(VALUES.email);
    // Giờ ghi lấy từ máy chủ; rules đòi createdAt == request.time.
    expect(data.createdAt).toBe('<serverTimestamp>');
    // Danh sách mẫu giữ nguyên cấu trúc mảng, không gộp thành chuỗi.
    expect(data.samples).toEqual([{ name: 'Mẫu A', state: 'Rắn', solvent: 'Methanol' }]);
  });

  it('chuẩn hóa NFC chuỗi tiếng Việt trước khi ghi', async () => {
    mocks.setDoc.mockResolvedValue(undefined);

    // Dạng phân rã, đúng như bộ gõ tiếng Việt trên macOS cho ra. Viết bằng
    // normalize() chứ không gõ thẳng vào tệp, để một lần định dạng lại mã
    // nguồn không âm thầm biến bài kiểm tra này thành vô nghĩa.
    const composed = 'Ánh'.normalize('NFC');
    const decomposed = composed.normalize('NFD');
    expect(decomposed).not.toBe(composed);

    await submitForm({ ...VALUES, studentName: decomposed }, MA_HO_SO);

    const [, data] = mocks.setDoc.mock.calls[0];
    expect(data.studentName).toBe(composed);
  });

  it('không gửi kèm trường lạ nào ngoài danh sách rules cho phép', async () => {
    mocks.setDoc.mockResolvedValue(undefined);

    await submitForm(VALUES, MA_HO_SO);

    // Rules chốt `hasOnly` đúng bộ trường này; thừa một khóa là cả lá đơn bị
    // từ chối. firestore.rules.test.ts canh nốt đầu kia của mối liên kết.
    const [, data] = mocks.setDoc.mock.calls[0];
    expect(Object.keys(data).sort()).toEqual([...SUBMISSION_FIELDS].sort());
  });

  it('không ghi kèm uid nữa', async () => {
    mocks.setDoc.mockResolvedValue(undefined);

    await submitForm(VALUES, MA_HO_SO);

    const [, data] = mocks.setDoc.mock.calls[0];
    expect(data).not.toHaveProperty('uid');
  });
});

describe('gửi lại sau khi mất phản hồi', () => {
  it('coi là thành công nếu lần bấm trước hỏng không kết luận được', async () => {
    // Đây là cái bẫy của thiết kế chỉ-cho-create: lần gửi trước đã ghi được
    // nhưng phản hồi không về tới nơi, nên lần này bị từ chối. Không còn
    // đường đọc nào để hỏi lại máy chủ, nên câu trả lời suy ra từ lịch sử:
    // đơn sai hình dạng thì đã hỏng ngay từ lần bấm đầu.
    mocks.setDoc.mockRejectedValue(firebaseError('permission-denied'));

    await expect(
      submitForm(VALUES, MA_HO_SO, { previousAttemptInconclusive: true }),
    ).resolves.toBeUndefined();
  });

  it('vẫn báo lỗi khi bị từ chối ngay ở lần bấm đầu', async () => {
    // Không có lần hỏng nào trước đó, nên `permission-denied` chỉ có thể là
    // một lời từ chối thật: sai hình dạng, hoặc App Check chặn.
    mocks.setDoc.mockRejectedValue(firebaseError('permission-denied'));

    await expect(submitForm(VALUES, MA_HO_SO)).rejects.toBeInstanceOf(SubmitError);
  });

  it('lần bấm trước hỏng vì mạng không biến lỗi mạng lần này thành thành công', async () => {
    // Chỉ `permission-denied` mới được diễn giải lại. Mạng hỏng hai lần liền
    // vẫn là mạng hỏng, và mã hồ sơ được giữ nguyên cho lần bấm sau.
    mocks.setDoc.mockRejectedValue(firebaseError('unavailable'));

    await expect(
      submitForm(VALUES, MA_HO_SO, { previousAttemptInconclusive: true }),
    ).rejects.toThrow(/Kiểm tra kết nối mạng/);
  });
});

describe('phân loại lỗi cho lần bấm sau', () => {
  it('từ chối thẳng là kết luận được', async () => {
    mocks.setDoc.mockRejectedValue(firebaseError('permission-denied'));

    const error = await submitForm(VALUES, MA_HO_SO).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SubmitError);
    expect((error as InstanceType<typeof SubmitError>).inconclusive).toBe(false);
  });

  it.each(['unavailable', 'resource-exhausted'])(
    'lỗi %s là không kết luận được',
    async (code) => {
      mocks.setDoc.mockRejectedValue(firebaseError(code));

      const error = await submitForm(VALUES, MA_HO_SO).catch((e: unknown) => e);
      expect((error as InstanceType<typeof SubmitError>).inconclusive).toBe(true);
    },
  );

  it('lỗi lạ cũng là không kết luận được', async () => {
    mocks.setDoc.mockRejectedValue(new Error('kaboom'));

    const error = await submitForm(VALUES, MA_HO_SO).catch((e: unknown) => e);
    expect((error as InstanceType<typeof SubmitError>).inconclusive).toBe(true);
  });
});

describe('thông báo lỗi', () => {
  it('bảo tải lại trang khi bị từ chối, không nhắc gì tới tài khoản', async () => {
    // Không còn đăng nhập nào để kiểm tra. Nguyên nhân khả dĩ nhất mà sinh
    // viên tự xử lý được là token App Check hỏng, và cách chữa là tải lại
    // trang để lấy token mới.
    mocks.setDoc.mockRejectedValue(firebaseError('permission-denied'));

    const error = await submitForm(VALUES, MA_HO_SO).catch((e: unknown) => e);
    expect((error as Error).message).toMatch(/tải lại trang/i);
    expect((error as Error).message).not.toMatch(/đăng nhập/);
  });

  it('có câu tiếng Việt cho lỗi lạ, không để lộ mã lỗi của Firebase', async () => {
    mocks.setDoc.mockRejectedValue(new Error('kaboom'));

    await expect(submitForm(VALUES, MA_HO_SO)).rejects.toThrow(
      'Máy chủ không ghi được đơn. Vui lòng thử lại.',
    );
  });

  it('không treo mãi khi mất mạng giữa chừng', async () => {
    vi.useFakeTimers();
    // Không bật bộ nhớ đệm ngoại tuyến, nên lời hứa của setDoc chỉ xong khi
    // máy chủ nhận được. Mất mạng thì nó không hỏng, nó treo.
    mocks.setDoc.mockReturnValue(new Promise(() => {}));

    const pending = submitForm(VALUES, MA_HO_SO);
    const assertion = expect(pending).rejects.toThrow(/15 giây/);

    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });

  it('hết hạn chờ là lỗi không kết luận được', async () => {
    vi.useFakeTimers();
    mocks.setDoc.mockReturnValue(new Promise(() => {}));

    const pending = submitForm(VALUES, MA_HO_SO).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(15_000);

    const error = await pending;
    expect((error as InstanceType<typeof SubmitError>).inconclusive).toBe(true);
  });
});
