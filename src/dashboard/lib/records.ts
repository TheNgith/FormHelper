/**
 * Đọc bộ sưu tập `submissions` một lần, rồi sắp xếp, lọc và tìm kiếm ngay
 * trong bộ nhớ.
 *
 * Mọi thứ dưới `loadRecords` là hàm thuần trên một mảng bình thường, nên
 * chúng chạy được trong `vitest` mặc định, không cần emulator. Đó là cố ý:
 * quy tắc gộp tên giảng viên và cách chia tháng là những chỗ dễ sai nhất
 * trong cả trang này, và chúng đáng được thử mà không phải dựng Firebase lên.
 *
 * ## Vì sao đọc hết một lượt
 *
 * Không phải để đi tắt cho nhanh:
 *
 *   - **Firestore không so khớp chuỗi con, ở bất kỳ mức chỉ mục nào.** Tab tra
 *     cứu tìm theo một phần họ tên và một phần tên lớp. Không có truy vấn phía
 *     máy chủ nào làm được việc đó — chạy trong bộ nhớ là cách cài đặt duy
 *     nhất, không phải cách rẻ nhất.
 *   - Năm ô lọc tùy chọn trong tab tra cứu, nếu đẩy sang máy chủ, cần một chỉ
 *     mục ghép cho mỗi tổ hợp thật sự được dùng.
 *   - Với lưu lượng của một bộ môn — vài trăm đơn mỗi năm — một lượt đọc rẻ
 *     hơn lưu lượng truy vấn của cách làm "đúng bài", và mọi tab sau lần vẽ
 *     đầu đều tức thì.
 */

import {
  type Firestore,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';

import { COLLECTION } from '../../lib/submissions';
import { nfc } from '../../lib/text';

/**
 * Trần của một lượt đọc.
 *
 * Đây là cái chốt để lập luận ở trên không lặng lẽ hết hạn. Chạm trần thì
 * trang treo một băng cảnh báo, thay vì vẽ một bức tranh thiếu như thể nó đủ.
 * Lúc ấy câu trả lời là phân trang phía máy chủ cho tab bản ghi và một chỉ mục
 * cho tab tra cứu — và cái băng cảnh báo là thứ khiến có người nhận ra.
 *
 * Phần bị cắt là những đơn **mới nhất** — xem `loadRecords`. Nghịch lý, nhưng
 * nó là cái giá của việc không phải sắp theo `createdAt`, và băng cảnh báo
 * nói thẳng ra điều đó.
 */
export const LOAD_LIMIT = 5000;

export type SampleRecord = {
  name: string;
  state: string;
  solvent: string;
};

/** Một đơn đã đọc lên, các ô đều đã về đúng kiểu để giao diện dùng thẳng. */
export type SubmissionRecord = {
  maHoSo: string;
  /** Giờ máy chủ ghi nhận. `null` nếu tài liệu thiếu hoặc sai kiểu. */
  createdAt: Date | null;
  studentName: string;
  studentId: string;
  email: string;
  phone: string;
  className: string;
  cohort: string;
  department: string;
  supervisor: string;
  city: string;
  /** Ngày ghi trên đơn, dạng YYYY-MM-DD. Mọi biểu đồ và bộ lọc đọc ô này. */
  requestDate: string;
  samples: SampleRecord[];
};

export type LoadResult = {
  records: SubmissionRecord[];
  /** Đã chạm `LOAD_LIMIT`: bức tranh đang thiếu, và người xem phải biết. */
  truncated: boolean;
};

function text(value: unknown): string {
  return typeof value === 'string' ? nfc(value) : '';
}

function toDate(value: unknown): Date | null {
  // Timestamp của Firestore có toDate(); một tài liệu sửa tay trong console
  // thì có thể là bất cứ thứ gì.
  if (value instanceof Date) return value;
  if (
    value !== null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Đọc một tài liệu thô thành `SubmissionRecord`.
 *
 * Chịu được tài liệu sai hình dạng thay vì bỏ nó đi: một đơn hiện thiếu vài ô
 * vẫn tốt hơn một đơn biến mất khỏi bảng mà không ai hay. Cùng lý do khiến
 * `scripts/export-csv.ts` giữ lại đơn không đọc được.
 */
export function toRecord(id: string, data: Record<string, unknown>): SubmissionRecord {
  return {
    maHoSo: id,
    createdAt: toDate(data.createdAt),
    studentName: text(data.studentName),
    studentId: text(data.studentId),
    email: text(data.email),
    phone: text(data.phone),
    className: text(data.className),
    cohort: text(data.cohort),
    department: text(data.department),
    supervisor: text(data.supervisor),
    city: text(data.city),
    requestDate: text(data.requestDate),
    samples: Array.isArray(data.samples)
      ? data.samples.map((sample) => {
          const row = (sample ?? {}) as Record<string, unknown>;
          return {
            name: text(row.name),
            state: text(row.state),
            solvent: text(row.solvent),
          };
        })
      : [],
  };
}

/**
 * Một lượt đọc cả bộ sưu tập.
 *
 * Sắp theo `__name__` chứ không theo `createdAt`: mã hồ sơ mở đầu bằng ngày
 * làm đơn nên thứ tự ID *chính là* thứ tự thời gian, và cách sắp này không cần
 * chỉ mục nào — đúng tính chất mà `scripts/export-csv.ts` đã dựa vào và ghi ra
 * ở đó. `firestore.indexes.json` nhờ vậy vẫn rỗng.
 *
 * ## Chỉ quét khóa theo chiều tăng dần được, và cái trần vì thế cắt đầu mới
 *
 * **Firestore không quét khóa theo chiều giảm dần.** `orderBy('__name__',
 * 'desc')` không phải là thiếu chỉ mục mà bị từ chối thẳng, bằng một câu
 * `failed-precondition` — "Firestore does not support descending key scans".
 * `limitToLast` cũng không thoát: bên trong nó đảo thứ tự rồi quét ngược, nên
 * nó hỏng y hệt. Cả hai chỉ nổ lúc chạy; không có gì trong TypeScript bắt
 * được, và đó là lý do chỗ này phải được thử trên trình duyệt thật.
 *
 * Còn lại đúng một cách: quét tăng dần rồi `limit`. Hệ quả phải nói ra —
 * **chạm trần thì phần bị cắt là những đơn *mới nhất*, không phải cũ nhất.**
 * Đổi lại là không phải sắp theo `createdAt`, thứ nghe thì hợp lý hơn nhưng
 * lại *lặng lẽ bỏ qua mọi tài liệu thiếu ô đó* — Firestore loại khỏi kết quả
 * bất kỳ tài liệu nào không có trường đang sắp. Với một bộ sưu tập còn giữ
 * đơn của bản cũ, đánh đổi ấy tệ hơn hẳn: nó mất dữ liệu ở *mọi* lần tải, còn
 * cách này chỉ lệch khi đã chạm trần, và lúc đó có một băng cảnh báo nói rõ
 * phần nào bị cắt.
 *
 * Kết quả về theo thứ tự tăng dần, nên đảo lại một lần ở đây để mảng luôn là
 * mới-nhất-trước.
 */
export async function loadRecords(db: Firestore): Promise<LoadResult> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy('__name__'), limit(LOAD_LIMIT)),
  );

  const records = snapshot.docs.map((document) =>
    toRecord(document.id, document.data()),
  );
  records.reverse();

  return { records, truncated: snapshot.size >= LOAD_LIMIT };
}

/* ---------- Sắp xếp ---------- */

export type SortOrder = 'newest' | 'oldest';

/**
 * Sắp theo `createdAt`, lấy `maHoSo` làm khóa phụ.
 *
 * Khóa phụ không phải để cho đẹp: hai đơn cùng một dấu thời gian (hoặc cùng
 * `null`) mà không có nó thì thứ tự nhảy qua nhảy lại giữa các lần vẽ, và
 * người đang dò một danh sách dài sẽ mất chỗ.
 *
 * Đây là chỗ duy nhất trong cả trang đọc `createdAt` — và đó là ô đúng cho
 * việc này. Mọi bộ lọc và biểu đồ đọc `requestDate`, ngày ghi trên tờ đơn.
 * Một đơn nhập tay vì thế mang `createdAt` của lúc gõ chứ không phải ngày trên
 * giấy, và khác biệt đó chỉ lộ ra ở đúng thứ tự sắp xếp này.
 */
export function sortRecords(
  records: SubmissionRecord[],
  order: SortOrder,
): SubmissionRecord[] {
  const direction = order === 'newest' ? -1 : 1;
  return [...records].sort((a, b) => {
    const left = a.createdAt?.getTime() ?? 0;
    const right = b.createdAt?.getTime() ?? 0;
    if (left !== right) return (left - right) * direction;
    return a.maHoSo.localeCompare(b.maHoSo) * direction;
  });
}

/* ---------- Lọc theo năm và tháng ---------- */

export type Period = {
  /** Chuỗi rỗng nghĩa là mọi năm. */
  year: string;
  /** Chuỗi rỗng nghĩa là mọi tháng. '01'–'12' khi đã chọn. */
  month: string;
};

/** '2026-08-12' -> '2026'. Chuỗi rỗng nếu ô ngày hỏng. */
export function yearOf(record: SubmissionRecord): string {
  return record.requestDate.slice(0, 4);
}

/** '2026-08-12' -> '08'. */
export function monthOf(record: SubmissionRecord): string {
  return record.requestDate.slice(5, 7);
}

/** Các năm có mặt trong dữ liệu, mới nhất trước. */
export function availableYears(records: SubmissionRecord[]): string[] {
  const years = new Set<string>();
  for (const record of records) {
    const year = yearOf(record);
    if (year) years.add(year);
  }
  return [...years].sort().reverse();
}

export function filterByPeriod(
  records: SubmissionRecord[],
  { year, month }: Period,
): SubmissionRecord[] {
  return records.filter((record) => {
    if (year && yearOf(record) !== year) return false;
    if (month && monthOf(record) !== month) return false;
    return true;
  });
}

/* ---------- Tra cứu ---------- */

/**
 * Khóa để so khớp: NFC, thường hóa, gộp mọi khoảng trắng liền nhau về một dấu
 * cách.
 *
 * NFC là phần bắt buộc. Bộ gõ tiếng Việt trên macOS cho ra dạng phân rã, nên
 * "Nguyễn" gõ ở ô tìm kiếm và "Nguyễn" đã lưu trong Firestore có thể là hai
 * chuỗi khác nhau về byte trong khi trên màn hình giống hệt. Không chuẩn hóa
 * thì kết quả rỗng mà không ai hiểu vì sao.
 */
export function matchKey(value: string): string {
  return nfc(value).toLowerCase().trim().replace(/\s+/g, ' ');
}

export type SearchCriteria = {
  studentName: string;
  studentId: string;
  className: string;
  email: string;
  supervisorName: string;
};

export const EMPTY_CRITERIA: SearchCriteria = {
  studentName: '',
  studentId: '',
  className: '',
  email: '',
  supervisorName: '',
};

export function hasCriteria(criteria: SearchCriteria): boolean {
  return Object.values(criteria).some((value) => value.trim() !== '');
}

function contains(haystack: string, needle: string): boolean {
  return matchKey(haystack).includes(matchKey(needle));
}

/**
 * So khớp chuỗi con không phân biệt hoa thường, AND lại trên những ô có điền.
 *
 * `studentId` so theo **tiền tố** chứ không phải chuỗi con: đó là một dãy số
 * người ta đọc từ tờ đơn, và việc hữu ích là gõ mấy chữ số đầu. So chuỗi con
 * ở đây chỉ thêm những kết quả trùng khúc giữa mà không ai đi tìm.
 *
 * Ô trống không thu hẹp gì cả, nên không điền ô nào thì mọi đơn đều khớp —
 * giao diện dựa vào điều đó để không chạy tìm kiếm khi cả năm ô còn trống.
 */
export function searchRecords(
  records: SubmissionRecord[],
  criteria: SearchCriteria,
): SubmissionRecord[] {
  return records.filter((record) => {
    if (criteria.studentName.trim() && !contains(record.studentName, criteria.studentName))
      return false;
    if (
      criteria.studentId.trim() &&
      !matchKey(record.studentId).startsWith(matchKey(criteria.studentId))
    )
      return false;
    if (criteria.className.trim() && !contains(record.className, criteria.className))
      return false;
    if (criteria.email.trim() && !contains(record.email, criteria.email)) return false;
    if (
      criteria.supervisorName.trim() &&
      !contains(record.supervisor, criteria.supervisorName)
    )
      return false;
    return true;
  });
}
