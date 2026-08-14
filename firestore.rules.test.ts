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
 * gì cả — trừ hai địa chỉ trong danh sách trắng của trang quản trị, thứ đọc
 * và xóa được nhưng vẫn không sửa được.
 *
 * Chạy bằng `npm run test:rules` (tự bật emulator Firestore *và* emulator
 * Auth), không chạy được nếu gọi thẳng `vitest` vì cần emulator đang mở.
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

import { ADMIN_EMAILS } from './src/lib/admins.ts';
import { SUBMISSION_FIELDS } from './src/lib/submissionFields.ts';

const RULES_PATH = fileURLToPath(new URL('./firestore.rules', import.meta.url));
const RULES_SOURCE = readFileSync(RULES_PATH, 'utf8');

const MA_HO_SO = 'IR-20260812-A7K3M9';

let testEnv: RulesTestEnvironment;

/**
 * Máy khách của trang nộp đơn: chưa đăng nhập, và đó là toàn bộ những gì
 * sinh viên có. Mọi bài về đường ghi đều đi qua hàm này.
 */
function client() {
  return testEnv.unauthenticatedContext().firestore();
}

/**
 * Máy khách của trang quản trị: một tài khoản Google đã xác minh email.
 *
 * `email_verified` phải có mặt trong token — rules đòi đúng claim đó, và một
 * bài kiểm tra quên nó sẽ đỏ ở chỗ không ai ngờ. Emulator Auth cấp token cho
 * bất kỳ địa chỉ nào ta gõ vào, và chính điều đó làm cả hai phía của danh
 * sách trắng kiểm tra được.
 */
function as(email: string, { emailVerified = true } = {}) {
  return testEnv
    .authenticatedContext(`uid-${email}`, {
      email,
      email_verified: emailVerified,
    })
    .firestore();
}

/** Người quản trị đầu tiên trong danh sách trắng. */
function admin() {
  return as(ADMIN_EMAILS[0]);
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

  it('sinh viên không sửa được đơn đã nộp', async () => {
    await seed(MA_HO_SO, validSubmission());
    await assertFails(
      updateDoc(doc(client(), 'submissions', MA_HO_SO), { studentName: 'Tên khác' }),
    );
  });

  it('sinh viên không xóa được đơn đã nộp', async () => {
    await seed(MA_HO_SO, validSubmission());
    await assertFails(deleteDoc(doc(client(), 'submissions', MA_HO_SO)));
  });
});

describe('submissions — quyền đọc', () => {
  it('máy khách chưa đăng nhập không đọc lại được chính lá đơn vừa ghi', async () => {
    // Bài này từng chứng minh một lời từ chối trọn gói (`allow read: if
    // false`); nay nó canh một nhánh sống. Chỉ riêng chỗ đó đã đáng giữ lại:
    // sinh viên vẫn không có đường đọc nào, nên người lạ dò ID tài liệu vẫn
    // không gom được tên, mã số sinh viên và số điện thoại.
    await assertSucceeds(
      setDoc(doc(client(), 'submissions', MA_HO_SO), validSubmission()),
    );
    await assertFails(getDoc(doc(client(), 'submissions', MA_HO_SO)));
  });

  it('máy khách chưa đăng nhập không liệt kê được cả bộ sưu tập', async () => {
    await seed(MA_HO_SO, validSubmission());
    await assertFails(getDocs(collection(client(), 'submissions')));
  });

  it('tài khoản Google ngoài danh sách trắng cũng không đọc được gì', async () => {
    // Ai cũng đăng nhập Google xong được, nên đây mới là bài kiểm tra thật sự
    // của danh sách trắng. Danh sách trong src/lib/admins.ts chỉ chọn màn hình
    // để vẽ; thứ từ chối một tài khoản lạ là đúng dòng rules này.
    await seed(MA_HO_SO, validSubmission());
    const stranger = as('nguoi.la@gmail.com');
    await assertFails(getDoc(doc(stranger, 'submissions', MA_HO_SO)));
    await assertFails(getDocs(collection(stranger, 'submissions')));
  });

  it('email chưa xác minh thì không đọc được, dù đúng địa chỉ', async () => {
    // `email_verified` giữ cho rule không tin vào một claim `email` tự khai.
    // Với Google thì nó luôn đúng; bài này là thứ giữ cho nó vẫn đúng vào cái
    // ngày ai đó bật thêm một nhà cung cấp thứ hai.
    await seed(MA_HO_SO, validSubmission());
    await assertFails(
      getDoc(
        doc(as(ADMIN_EMAILS[0], { emailVerified: false }), 'submissions', MA_HO_SO),
      ),
    );
  });

  it('người quản trị đọc được một đơn và liệt kê được cả bộ sưu tập', async () => {
    // `list` là thứ trang quản trị thật sự dùng: một lượt đọc cả bộ sưu tập
    // lúc đăng nhập, rồi mọi thứ còn lại chạy trong bộ nhớ.
    await seed(MA_HO_SO, validSubmission());
    await assertSucceeds(getDoc(doc(admin(), 'submissions', MA_HO_SO)));
    await assertSucceeds(getDocs(collection(admin(), 'submissions')));
  });

  it('cả hai địa chỉ trong danh sách trắng đều đọc được', async () => {
    await seed(MA_HO_SO, validSubmission());
    for (const email of ADMIN_EMAILS) {
      await assertSucceeds(getDoc(doc(as(email), 'submissions', MA_HO_SO)));
    }
  });
});

describe('submissions — quyền của người quản trị', () => {
  it('người quản trị xóa được đơn', async () => {
    // Không hoàn lại được: không có trường xóa mềm, không có bản sao lưu.
    // `npm run export:csv` là cách duy nhất giữ một bản trước khi bấm.
    await seed(MA_HO_SO, validSubmission());
    await assertSucceeds(deleteDoc(doc(admin(), 'submissions', MA_HO_SO)));
  });

  it('tài khoản ngoài danh sách trắng không xóa được', async () => {
    await seed(MA_HO_SO, validSubmission());
    await assertFails(
      deleteDoc(doc(as('nguoi.la@gmail.com'), 'submissions', MA_HO_SO)),
    );
  });

  it('người quản trị vẫn không sửa được đơn', async () => {
    // Cố ý để đóng: trang quản trị không sửa đơn nào, và một rule cho sửa
    // phải ghim createdAt với maHoSo bất biến — thêm ba điều kiện để viết sai.
    await seed(MA_HO_SO, validSubmission());
    await assertFails(
      updateDoc(doc(admin(), 'submissions', MA_HO_SO), { studentName: 'Tên khác' }),
    );
  });

  it('người quản trị nhập tay một đơn đúng hình dạng thì ghi được', async () => {
    // "Thêm đơn bằng tay" không có nhánh riêng nào trong rules: nó dùng đúng
    // `allow create` của sinh viên, nên nó không tốn gì trên ranh giới bảo mật.
    await assertSucceeds(
      setDoc(doc(admin(), 'submissions', MA_HO_SO), validSubmission()),
    );
  });

  it('người quản trị cũng không ghi được đơn sai hình dạng', async () => {
    // Ràng buộc hình dạng không hỏi ai đang gọi. Một trang quản trị hỏng
    // không nhét được rác vào bộ sưu tập.
    await assertFails(
      setDoc(
        doc(admin(), 'submissions', MA_HO_SO),
        validSubmission({ samples: [] }),
      ),
    );
  });

  it('người quản trị vẫn không chạm được sang bộ sưu tập khác', async () => {
    await assertFails(setDoc(doc(admin(), 'ghi-chu', 'x'), { a: 1 }));
    await assertFails(getDoc(doc(admin(), 'ghi-chu', 'x')));
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

describe('rules và mã nguồn nói cùng một danh sách quản trị', () => {
  it('danh sách trong isAdmin() đúng bằng ADMIN_EMAILS', () => {
    // Cùng lý do với danh sách trường ở trên: rules không import được
    // JavaScript nên có hai bản chép. Lệch nhau ở đây thì triệu chứng còn êm
    // hơn — một người quản trị lặng lẽ không đọc được gì, trong khi giao diện
    // vẫn vẽ ra bảng dữ liệu rỗng như thể bộ sưu tập trống.
    const match = RULES_SOURCE.match(/function isAdmin\(\)[^}]*}/);
    expect(match, 'không tìm thấy isAdmin() trong firestore.rules').not.toBeNull();

    const inRules = [...match![0].matchAll(/'([^']+@[^']+)'/g)]
      .map((quoted) => quoted[1])
      .sort();

    expect(inRules).toEqual([...ADMIN_EMAILS].sort());
  });
});

describe('các bộ sưu tập khác đều đóng', () => {
  it('không ghi và không đọc được sang bộ sưu tập khác', async () => {
    await assertFails(setDoc(doc(client(), 'ghi-chu', 'x'), { a: 1 }));
    await assertFails(getDoc(doc(client(), 'ghi-chu', 'x')));
  });
});
