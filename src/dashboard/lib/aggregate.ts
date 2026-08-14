/**
 * Bốn phép gộp của tab tổng quan, viết thành hàm thuần trên mảng để thử được
 * bằng `vitest` mặc định.
 *
 * Mọi phép ở đây đọc `requestDate` — ngày ghi trên tờ đơn — chứ không đọc
 * `createdAt`. Nhờ vậy một đơn nhập tay hôm nay cho một tờ giấy đề tháng
 * trước vẫn rơi vào đúng tháng của nó.
 */

import { SAMPLE_STATES, supervisorSignatureName } from '../../lib/constants';
import { nfc } from '../../lib/text';
import { type SubmissionRecord, matchKey, monthOf, yearOf } from './records';

/** Nhãn tiếng Anh như mọi chữ khác của trang quản trị; dữ liệu thì giữ nguyên. */
export const OTHER_LABEL = 'Other';
export const BLANK_LABEL = '(blank)';

/** Số cột tối đa của bảng xếp hạng lớp; phần còn lại gộp vào "Other". */
export const CLASS_RANK_LIMIT = 10;

export type Slice = {
  label: string;
  value: number;
};

/**
 * Đếm theo khóa, rồi sắp giảm dần.
 *
 * Khóa phụ là nhãn, để hai mục cùng số lượng không đổi chỗ giữa các lần vẽ —
 * `Array.prototype.sort` ổn định, nhưng thứ tự vào lại phụ thuộc thứ tự tài
 * liệu, và thứ tự ấy đổi sau mỗi lần xóa.
 */
function ranked(counts: Map<string, number>): Slice[] {
  return [...counts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/**
 * Xếp hạng lớp, giữ 10 lớp đông nhất và dồn phần còn lại vào "Other".
 *
 * "Other" luôn nằm cuối kể cả khi nó lớn hơn vài cột phía trên: nó không phải
 * một lớp, nên xếp nó lẫn vào hàng ngũ các lớp là đọc sai biểu đồ.
 */
export function classRanking(
  records: SubmissionRecord[],
  topN = CLASS_RANK_LIMIT,
): Slice[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const label = record.className.trim() || BLANK_LABEL;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const all = ranked(counts);
  if (all.length <= topN) return all;

  const top = all.slice(0, topN);
  const rest = all.slice(topN).reduce((sum, slice) => sum + slice.value, 0);
  return [...top, { label: OTHER_LABEL, value: rest }];
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export type MonthBucket = {
  /** '01'–'12', để giao diện có khóa ổn định. */
  month: string;
  label: string;
  value: number;
};

/**
 * Đủ mười hai tháng của một năm, **kể cả tháng bằng không**.
 *
 * Bỏ tháng rỗng đi là giấu đúng cái khoảng trống mà người ta mở biểu đồ này để
 * tìm: một tháng không có đơn nào là một thông tin, không phải một chỗ thiếu
 * dữ liệu.
 */
export function submissionsByMonth(
  records: SubmissionRecord[],
  year: string,
): MonthBucket[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (yearOf(record) !== year) continue;
    const month = monthOf(record);
    if (month) counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  return MONTH_LABELS.map((label, index) => {
    const month = String(index + 1).padStart(2, '0');
    return { month, label, value: counts.get(month) ?? 0 };
  });
}

/**
 * Trạng thái mẫu, đếm **theo từng mẫu chứ không theo từng đơn** — một đơn 30
 * mẫu góp 30 lượt. Biểu đồ phải ghi rõ điều đó, nếu không con số tổng đọc lên
 * sẽ bị hiểu là số đơn.
 *
 * Ba giá trị của `SAMPLE_STATES` luôn có mặt, kể cả khi bằng không, cộng một
 * ô "Other" đáng lẽ phải rỗng: nó tồn tại để một giá trị cũ hay hỏng hiện ra
 * thay vì bị lặng lẽ bỏ đi.
 */
export function sampleStates(records: SubmissionRecord[]): Slice[] {
  const known = new Map<string, number>(SAMPLE_STATES.map((state) => [state, 0]));
  let other = 0;

  for (const record of records) {
    for (const sample of record.samples) {
      const state = sample.state.trim();
      if (known.has(state)) {
        known.set(state, known.get(state)! + 1);
      } else {
        other += 1;
      }
    }
  }

  const slices: Slice[] = [...known].map(([label, value]) => ({ label, value }));
  if (other > 0) slices.push({ label: OTHER_LABEL, value: other });
  return slices;
}

/**
 * Tần suất giảng viên hướng dẫn — phép gộp cần cẩn thận nhất trong bốn phép.
 *
 * `supervisor` là **một chuỗi gõ tay** ("Thầy PGS. TS. Trần Văn Thành"), nên
 * cùng một người xuất hiện dưới nhiều khóa. Hai nguồn tách nhau được chữa ở
 * đây:
 *
 *   - `supervisorSignatureName()` bỏ cách xưng hô, gộp cặp Thầy/Cô;
 *   - `matchKey()` chuẩn hóa NFC và gộp khoảng trắng, gộp cặp bị tách vì bộ
 *     gõ macOS cho ra dạng phân rã.
 *
 * **Học hàm học vị thì vẫn tách một người làm hai cột** — `TS. X` và
 * `PGS. TS. X` là hai khóa khác nhau — và chỗ đó cố ý để nguyên. So khớp mờ
 * theo tên sẽ có ngày gộp nhầm hai người thật thành một, và một cột thừa mà
 * người đọc nhận ra ngay thì tốt hơn một con số sai mà không ai nhận ra.
 *
 * Nhãn hiển thị là dạng đã bỏ xưng hô của lần gặp **đầu tiên**, giữ nguyên
 * hoa thường như người ta đã gõ; `matchKey` chỉ dùng để so, không dùng để
 * hiện.
 *
 * Thứ tự hai bước ấy quan trọng và không hiển nhiên: `supervisorSignatureName`
 * so đầu chuỗi với hằng số `'Thầy '` viết ở dạng tổ hợp sẵn, nên đưa vào một
 * chuỗi phân rã thì nó **không** bỏ được xưng hô, và người đó tách làm hai
 * cột. Vì vậy `nfc()` phải chạy trước. `toRecord` đã chuẩn hóa lúc đọc, nhưng
 * hàm này không được phép dựa vào điều đó — nó là hàm thuần, và bài kiểm tra
 * gọi thẳng vào nó.
 */
export function supervisorFrequency(records: SubmissionRecord[]): Slice[] {
  const counts = new Map<string, number>();
  const labels = new Map<string, string>();

  for (const record of records) {
    const stripped = supervisorSignatureName(nfc(record.supervisor))
      .replace(/\s+/g, ' ')
      .trim();
    const key = matchKey(stripped) || BLANK_LABEL;
    if (!labels.has(key)) labels.set(key, stripped || BLANK_LABEL);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts]
    .map(([key, value]) => ({ label: labels.get(key)!, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/** Tổng số mẫu trong một tập đơn — chú thích dưới biểu đồ trạng thái mẫu. */
export function totalSamples(records: SubmissionRecord[]): number {
  return records.reduce((sum, record) => sum + record.samples.length, 0);
}
