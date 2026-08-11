/** Tiện ích xử lý chuỗi tiếng Việt dùng chung cho giao diện và file PDF. */

/**
 * Chuẩn hóa về dạng tổ hợp sẵn (NFC).
 *
 * Bộ gõ tiếng Việt trên macOS và một số thao tác sao chép cho ra dạng phân rã
 * (NFD): "ệ" thành "e" + hai dấu rời. Trình duyệt hiển thị giống nhau nhưng
 * khi nhúng vào PDF thì dấu bị chồng lệch. Mọi chuỗi do người dùng nhập đều
 * phải đi qua hàm này trước khi đưa vào PDF hoặc gửi lên Google Sheet.
 */
export function nfc(value: string): string {
  return value.normalize('NFC');
}

/** "2026-08-11" -> "ngày 11 tháng 08 năm 2026" */
export function formatVietnameseDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `ngày ${day} tháng ${month} năm ${year}`;
}

/** "2026-08-11" -> "11/08/2026", dùng cho bản tóm tắt trên màn hình. */
export function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

const DIACRITIC_EXTRAS: Record<string, string> = {
  đ: 'd',
  Đ: 'D',
};

/**
 * Bỏ dấu tiếng Việt, dùng cho tên file tải về — nhiều hệ điều hành và trình
 * duyệt vẫn xử lý tên file có dấu không nhất quán.
 */
export function stripDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (ch) => DIACRITIC_EXTRAS[ch])
    .normalize('NFC');
}

/** Rút gọn về ký tự an toàn cho tên file. */
export function slugForFilename(value: string): string {
  return stripDiacritics(value)
    .replace(/[^\w.-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}
