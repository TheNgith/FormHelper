/**
 * Sinh mã hồ sơ cho một lần nộp đơn.
 *
 * Dạng: IR-20260811-A7K3 — tiền tố thiết bị, ngày nộp, bốn ký tự ngẫu nhiên.
 * Ngày đứng trước nên các đơn tự xếp theo thứ tự thời gian trong Google Sheet.
 *
 * Mã được sinh ở phía trình duyệt, không cần hỏi máy chủ. Bốn ký tự cho hơn
 * một triệu tổ hợp mỗi ngày nên với lưu lượng của một bộ môn thì khả năng
 * trùng mã trong cùng một ngày là không đáng kể.
 */

/**
 * Bảng chữ Crockford Base32: bỏ I, L, O, U để không lẫn với 1, 0 và không
 * vô tình ghép thành từ khó coi. Quan trọng vì mã này được đọc cho nhau nghe
 * và đối chiếu bằng mắt với dòng trong Google Sheet.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const RANDOM_LENGTH = 4;

export const MA_HO_SO_PATTERN = /^IR-\d{8}-[0-9A-HJKMNP-TV-Z]{4}$/;

function randomSuffix(): string {
  const bytes = new Uint8Array(RANDOM_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) {
    // 256 không chia hết cho 32 nhưng 8 bit lấy 5 bit thấp thì chia đều,
    // nên không ký tự nào có xác suất cao hơn ký tự khác.
    out += ALPHABET[byte & 0x1f];
  }
  return out;
}

/** `date` theo dạng YYYY-MM-DD, đúng như ô ngày trong biểu mẫu. */
export function generateMaHoSo(date: string): string {
  return `IR-${date.replaceAll('-', '')}-${randomSuffix()}`;
}
