/**
 * Giá trị cố định in sẵn trên mẫu giấy.
 *
 * Sinh viên không sửa được những giá trị này — đổi ở đây rồi build lại là
 * toàn bộ ứng dụng (biểu mẫu, bản xem lại, PDF, Google Sheet) đổi theo.
 */

export const DEPARTMENT = 'Bộ môn Hóa Hữu Cơ';

export const CITY = 'TP. HCM';

/** Thiết bị duy nhất mà đơn này áp dụng. */
export const EQUIPMENT = 'máy quang phổ hồng ngoại (FT-IR)';

/**
 * Danh sách giảng viên hướng dẫn.
 *
 * Thêm giảng viên mới thì thêm một dòng vào đây. `title` là phần đứng trước
 * tên khi in ra đơn ("Thầy PGS.TS. Trần Văn Thành"), `name` là phần được ký
 * ở ô "Giảng viên hướng dẫn".
 */
export const SUPERVISORS = [
  { title: 'Thầy', name: 'PGS.TS. Trần Văn Thành' },
] as const;

/** Chuỗi đầy đủ dùng trong câu mở đầu và dòng "Kính gửi". */
export function supervisorFullLabel(name: string): string {
  const found = SUPERVISORS.find((s) => s.name === name);
  return found ? `${found.title} ${found.name}` : name;
}

/** Trạng thái mẫu — danh sách đóng, theo lựa chọn của bộ môn. */
export const SAMPLE_STATES = ['Rắn', 'Lỏng', 'Dung dịch'] as const;

export type SampleState = (typeof SAMPLE_STATES)[number];
