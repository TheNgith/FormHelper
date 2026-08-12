/**
 * Bài kiểm tra cho firestore.rules, chạy trên Firestore emulator.
 *
 * Bản Apps Script cũ có 225 dòng kiểm tra phía máy chủ. Rules thay nó làm nơi
 * kiểm tra hình dạng dữ liệu, nên cũng phải được kiểm tra tương đương.
 *
 * **App Check không có bài kiểm tra nào ở đây, và không thể có.** Emulator bỏ
 * qua App Check hoàn toàn, còn Firestore thì không cho rules nhìn thấy nó
 * (`request.app` chỉ tồn tại trong callable Cloud Functions). Nửa ranh giới
 * đó — thứ chặn script, bot và curl — chỉ quan sát được ở Firebase console →
 * App Check → Cloud Firestore. Bộ bài này xanh **không** có nghĩa là cổng App
 * Check đang bật.
 *
 * Những gì bên dưới thật sự chứng minh: một máy khách bất kỳ chỉ tạo được
 * đúng một tài liệu đúng hình dạng, dưới một ID đúng dạng, và không đọc được
 * gì cả.
 *
 * Chạy bằng `npm run test:rules` (tự bật emulator), không chạy được nếu gọi
 * thẳng `vitest` vì cần emulator đang mở.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { SUBMISSION_FIELDS } from './src/lib/submissionFields.ts';

const RULES_PATH = fileURLToPath(new URL('./firestore.rules', import.meta.url));
const RULES_SOURCE = readFileSync(RULES_PATH, 'utf8');

const MA_HO_SO = 'IR-20260812-A7K3M9';

let testEnv: RulesTestEnvironment;

/**
 * Máy khách của ứng dụng.
 *
 * Không còn đăng nhập nên chỉ có đúng một loại máy khách, và nó chưa xác
 * thực. Chỗ này từng có `as()` cho tài khoản đã đăng nhập; việc hai hàm gộp
 * lại thành một chính là toàn bộ thay đổi của lần di trú này.
 */
function client() {
  return testEnv.unauthenticatedContext().firestore();
}

/**
 * Đơn hợp lệ. `createdAt` là serverTimestamp() vì rule đòi
 * `createdAt == request.time` — đồng hồ của máy khách không được tính.
 */
function validSubmission(overrides: Record<string, unknown> = {}) {
  return {
    maHoSo: MA_HO_SO,
    createdAt: serverTimestamp(),
    studentName: 'Nguyễn Thị Ngọc Ánh',
    studentId: '2200123',
    email: 'ngocanh@ump.edu.vn',
    phone: '0912345678',
    className: 'D2A',
    cohort: '2022 - 2026',
    department: 'Bộ môn Hóa Hữu Cơ',
    supervisor: 'PGS.TS. Trần Văn Thành',
    city: 'TP. HCM',
    requestDate: '2026-08-12',
    samples: [{ name: 'Mẫu A', state: 'Rắn', solvent: 'Ethanol' }],
    ...overrides,
  };
}

function sampleList(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `Mẫu ${i + 1}`,
    state: 'Rắn',
    solvent: 'Ethanol',
  }));
}

/** Ghi sẵn một tài liệu, bỏ qua rules — dùng để dựng trạng thái ban đầu. */
async function seed(id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'submissions', id), {
      ...data,
      createdAt: new Date('2026-08-12T03:00:00Z'),
    });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-don-thiet-bi',
    firestore: {
      rules: RULES_SOURCE,
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('submissions — quyền ghi', () => {
  it('máy khách chưa đăng nhập nộp được đơn đúng hình dạng', async () => {
    // Đây là tiền đề của cả thiết kế: không còn cổng đăng nhập nào, nên nếu
    // bài này đỏ thì mọi sinh viên đều không nộp được đơn.
    await assertSucceeds(
      setDoc(doc(client(), 'submissions', MA_HO_SO), validSubmission()),
    );
  });

  it('mã hồ sơ khác ID tài liệu thì không ghi được', async () => {
    await assertFails(
      setDoc(
        doc(client(), 'submissions', MA_HO_SO),
        validSubmission({ maHoSo: 'IR-20260812-ZZZZZZ' }),
      ),
    );
  });

  it('ID tài liệu không đúng dạng mã hồ sơ thì không ghi được', async () => {
    // Hồi còn đăng nhập thì ID coi như đáng tin. Nay ai cũng tự đặt được, nên
    // dạng khóa phải do máy chủ ép, nếu không bộ sưu tập thành một cái sọt.
    for (const id of ['dat-tay', 'IR-20260812-A7K3', 'IR-2026812-A7K3M9', 'ir-20260812-a7k3m9']) {
      await assertFails(
        setDoc(doc(client(), 'submissions', id), validSubmission({ maHoSo: id })),
      );
    }
  });

  it('ID tài liệu chứa chữ dễ đọc nhầm thì không ghi được', async () => {
    // Bảng chữ Crockford Base32 bỏ I, L, O, U; regex trong rules phải bỏ đúng
    // bộ đó, nếu không nó rộng hơn thứ generateMaHoSo() sinh ra.
    const id = 'IR-20260812-A7K3IL';
    await assertFails(
      setDoc(doc(client(), 'submissions', id), validSubmission({ maHoSo: id })),
    );
  });

  it('createdAt lấy từ đồng hồ máy khách thì không ghi được', async () => {
    await assertFails(
      setDoc(
        doc(client(), 'submissions', MA_HO_SO),
        validSubmission({ createdAt: new Date('2020-01-01T00:00:00Z') }),
      ),
    );
  });
});

describe('submissions — hình dạng dữ liệu', () => {
  it('không có mẫu nào thì không ghi được', async () => {
    await assertFails(
      setDoc(
        doc(client(), 'submissions', MA_HO_SO),
        validSubmission({ samples: [] }),
      ),
    );
  });

  it('61 mẫu thì không ghi được', async () => {
    await assertFails(
      setDoc(
        doc(client(), 'submissions', MA_HO_SO),
        validSubmission({ samples: sampleList(61) }),
      ),
    );
  });

  it('60 mẫu vẫn ghi được', async () => {
    await assertSucceeds(
      setDoc(
        doc(client(), 'submissions', MA_HO_SO),
        validSubmission({ samples: sampleList(60) }),
      ),
    );
  });

  it('họ tên quá 100 ký tự thì không ghi được', async () => {
    await assertFails(
      setDoc(
        doc(client(), 'submissions', MA_HO_SO),
        validSubmission({ studentName: 'A'.repeat(101) }),
      ),
    );
  });

  it('mã số sinh viên không phải chữ số thì không ghi được', async () => {
    await assertFails(
      setDoc(
        doc(client(), 'submissions', MA_HO_SO),
        validSubmission({ studentId: '22001a' }),
      ),
    );
  });

  it('email rỗng hoặc quá dài thì không ghi được', async () => {
    // Nội dung của ô này không còn được chứng minh bởi bất cứ thứ gì, nhưng
    // kích thước thì vẫn chặn được — và đó là điều duy nhất rules còn nói
    // được về nó.
    await assertFails(
      setDoc(doc(client(), 'submissions', MA_HO_SO), validSubmission({ email: '' })),
    );
    await assertFails(
      setDoc(
        doc(client(), 'submissions', MA_HO_SO),
        validSubmission({ email: `${'a'.repeat(200)}@ump.edu.vn` }),
      ),
    );
  });

  it('email ngoài trường vẫn ghi được', async () => {
    // Cố ý. Ràng buộc @ump.edu.vn nay chứng minh được đúng con số không, vì
    // giá trị là tự khai — nhưng nó thừa sức chặn một lá đơn thật của sinh
    // viên có địa chỉ khác thường. Bỏ bài này đi thì đọc lại mục "The one
    // shape check I recommend against adding" trong bản kế hoạch trước.
    await assertSucceeds(
      setDoc(
        doc(client(), 'submissions', MA_HO_SO),
        validSubmission({ email: 'ngocanh@gmail.com' }),
      ),
    );
  });

  it('thiếu trường bắt buộc thì không ghi được', async () => {
    const { phone: _phone, ...withoutPhone } = validSubmission();
    await assertFails(setDoc(doc(client(), 'submissions', MA_HO_SO), withoutPhone));
  });

  it('thêm trường lạ thì không ghi được', async () => {
    await assertFails(
      setDoc(
        doc(client(), 'submissions', MA_HO_SO),
        validSubmission({ payload: 'x'.repeat(50_000) }),
      ),
    );
  });

  it('trường uid của bản cũ nay là trường lạ', async () => {
    // Bản trước ghi kèm uid của người đăng nhập. Không còn danh tính nào để
    // ghi, và hasOnly() từ chối luôn — nghĩa là một gói JavaScript cũ còn nằm
    // trong bộ nhớ đệm của trình duyệt sẽ *không* âm thầm ghi tiếp được.
    await assertFails(
      setDoc(
        doc(client(), 'submissions', MA_HO_SO),
        validSubmission({ uid: 'uid-sv-1' }),
      ),
    );
  });
});

describe('submissions — chỉ ghi một lần', () => {
  it('ghi lần thứ hai vào cùng mã hồ sơ thì bị từ chối', async () => {
    // Chính chỗ này sinh ra bẫy gửi lại: lần gửi lại chính đáng sau khi mất
    // phản hồi mạng cũng rơi vào đây. Cách phân biệt nằm ở
    // src/lib/submissions.ts, không đọc lại tài liệu nào cả.
    await seed(MA_HO_SO, validSubmission());
    await assertFails(
      setDoc(doc(client(), 'submissions', MA_HO_SO), validSubmission()),
    );
  });

  it('không sửa được đơn đã nộp', async () => {
    await seed(MA_HO_SO, validSubmission());
    await assertFails(
      updateDoc(doc(client(), 'submissions', MA_HO_SO), { studentName: 'Tên khác' }),
    );
  });

  it('không xóa được đơn đã nộp', async () => {
    await seed(MA_HO_SO, validSubmission());
    await assertFails(deleteDoc(doc(client(), 'submissions', MA_HO_SO)));
  });
});

describe('submissions — không ai đọc được gì', () => {
  it('không đọc lại được chính lá đơn vừa ghi', async () => {
    // Không phải là thu hẹp quyền đọc, mà là đóng hẳn. Không còn danh tính
    // nên bất cứ đường đọc nào cũng là đường đọc cho người lạ: dò ID tài liệu
    // là gom được tên, mã số sinh viên và số điện thoại.
    await assertSucceeds(
      setDoc(doc(client(), 'submissions', MA_HO_SO), validSubmission()),
    );
    await assertFails(getDoc(doc(client(), 'submissions', MA_HO_SO)));
  });

  it('không liệt kê được cả bộ sưu tập', async () => {
    await seed(MA_HO_SO, validSubmission());
    await assertFails(getDocs(collection(client(), 'submissions')));
  });
});

describe('rules và mã nguồn nói cùng một danh sách trường', () => {
  it('mọi hasOnly/hasAll trong rules đúng bằng SUBMISSION_FIELDS', () => {
    // firestore.rules không import được JavaScript nên nó phải chép lại danh
    // sách trường. Lệch một cái tên là *mọi* lá đơn bị từ chối, và triệu
    // chứng — "permission-denied" — không hề chỉ về phía nguyên nhân. Đọc
    // thẳng tệp rules ra so còn hơn tin rằng người sửa sẽ nhớ sửa cả hai chỗ.
    const lists = [...RULES_SOURCE.matchAll(/has(?:Only|All)\(\[([^\]]*)\]\)/g)].map(
      (match) =>
        [...match[1].matchAll(/'([^']+)'/g)].map((quoted) => quoted[1]).sort(),
    );

    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) {
      expect(list).toEqual([...SUBMISSION_FIELDS].sort());
    }
  });

  it('đơn hợp lệ trong bài kiểm tra mang đúng bộ trường đó', () => {
    expect(Object.keys(validSubmission()).sort()).toEqual(
      [...SUBMISSION_FIELDS].sort(),
    );
  });
});

describe('các bộ sưu tập khác đều đóng', () => {
  it('không ghi và không đọc được sang bộ sưu tập khác', async () => {
    await assertFails(setDoc(doc(client(), 'ghi-chu', 'x'), { a: 1 }));
    await assertFails(getDoc(doc(client(), 'ghi-chu', 'x')));
  });
});
