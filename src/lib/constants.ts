/**
 * Giá trị cố định in sẵn trên mẫu giấy.
 *
 * Sinh viên không sửa được những giá trị này — đổi ở đây rồi build lại là
 * toàn bộ ứng dụng (biểu mẫu, bản xem lại, PDF, Google Sheet) đổi theo.
 */

export const DEPARTMENT = 'Bộ môn Hóa Hữu Cơ';

export const CITY = 'TP. Hồ Chí Minh';

/**
 * Tên cơ quan chủ quản ở góc trái đầu đơn, in hoa và tách làm hai dòng cho
 * vừa bề ngang cột.
 */
export const LETTERHEAD = ['ĐẠI HỌC Y DƯỢC', 'THÀNH PHỐ HỒ CHÍ MINH'] as const;

/** Đơn vị ban hành, in ngay dưới tên đại học. */
export const SCHOOL = 'Trường Dược';

/** Thiết bị duy nhất mà đơn này áp dụng. */
export const EQUIPMENT = 'máy quang phổ hồng ngoại (FT-IR)';

/**
 * Giảng viên hướng dẫn, nhập thành ba phần rời: cách xưng hô, học hàm học vị,
 * và tên.
 *
 * Trước đây đây là một danh sách đóng gồm đúng một người, chọn bằng một ô
 * `select`. Thêm giảng viên nghĩa là sửa mã nguồn rồi triển khai lại — trong
 * khi mỗi khóa luận lại có người hướng dẫn khác. Nay tên là ô gõ tự do; chỉ
 * hai phần đứng trước tên còn là danh sách đóng, vì chúng là cách xưng hô
 * chuẩn chứ không phải dữ liệu.
 *
 * Đổi lại: không còn gì kiểm tra được tên đó có thật hay không. Đây là lá đơn
 * giấy sinh viên tự mang đi xin chữ ký, nên người hướng dẫn thấy tên mình sai
 * là biết ngay — xem mục "Bảo mật" trong README, thứ này cùng loại với việc
 * ai cũng gõ được tên người khác vào ô "Em tên là".
 */
export const SUPERVISOR_HONORIFICS = ['Thầy', 'Cô'] as const;

/** Ô trống là hợp lệ: không phải người hướng dẫn nào cũng có học hàm học vị. */
export const SUPERVISOR_TITLES = ['', 'ThS.', 'TS.', 'PGS. TS.', 'GS. TS.'] as const;

/**
 * Ba ô ấy chỉ tồn tại trong lúc nhập.
 *
 * Ra khỏi biểu mẫu, giảng viên hướng dẫn lại là **một chuỗi duy nhất** —
 * `FormValues.supervisor`, "Thầy PGS. TS. Trần Văn Thành" — và mọi thứ phía
 * sau chỉ thấy chuỗi đó: tài liệu Firestore, firestore.rules, cột CSV, file
 * PDF. Chia ba là một quyết định về giao diện, không phải về dữ liệu, nên nó
 * dừng lại ở ranh giới của biểu mẫu.
 *
 * Điều đó quan trọng với `scripts/submissionRows.ts`: script xuất CSV dựng
 * lại từng đơn đã lưu bằng chính `formSchema`. Nếu schema ấy đòi ba ô rời thì
 * mọi tài liệu đang nằm trong Firestore — chỉ có một chuỗi, và những đơn cũ
 * còn không có cả "Thầy" ở đầu — sẽ trượt kiểm tra và bị xuất ra thành dòng
 * trống mà không ai hay.
 */
export type SupervisorParts = {
  supervisorHonorific: string;
  supervisorTitle: string;
  supervisorName: string;
};

/** Ghép ba ô lại: "Thầy PGS. TS. Trần Văn Thành". */
export function supervisorFullLabel(v: SupervisorParts): string {
  return [v.supervisorHonorific, v.supervisorTitle, v.supervisorName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * "PGS. TS. Trần Văn Thành" — tên đặt dưới dòng kẻ ký, bỏ cách xưng hô.
 *
 * Dưới một chỗ ký thì "Thầy" là lời của sinh viên trong câu văn, không phải
 * một phần của tên người ký.
 *
 * Nhận thẳng chuỗi đã ghép chứ không nhận ba ô, nên nó chạy được cả với đơn
 * cũ đọc lên từ Firestore — thứ vốn không có cách xưng hô nào để bỏ.
 */
export function supervisorSignatureName(supervisor: string): string {
  const trimmed = supervisor.trim();
  const honorific = SUPERVISOR_HONORIFICS.find((h) => trimmed.startsWith(`${h} `));
  return honorific ? trimmed.slice(honorific.length).trim() : trimmed;
}

/** Trạng thái mẫu — danh sách đóng, theo lựa chọn của bộ môn. */
export const SAMPLE_STATES = ['Rắn', 'Lỏng', 'Dung dịch'] as const;

export type SampleState = (typeof SAMPLE_STATES)[number];
