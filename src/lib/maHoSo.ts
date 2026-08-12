/**
 * Sinh mã hồ sơ cho một lần nộp đơn.
 *
 * Dạng: IR-20260811-A7K3M9 — tiền tố thiết bị, ngày nộp, sáu ký tự ngẫu nhiên.
 * Ngày đứng trước nên các đơn tự xếp theo thứ tự thời gian.
 *
 * Mã được sinh ở phía trình duyệt, không cần hỏi máy chủ, và nó cũng là khóa
 * của tài liệu trong Firestore — firestore.rules ép đúng dạng này.
 *
 * Sáu ký tự chứ không phải bốn, và đó không phải chuyện thẩm mỹ. Bẫy gửi lại
 * trong submissions.ts nay đoán "đơn đã nằm đó rồi" mà không đọc lại tài
 * liệu, nên hai trình duyệt trùng mã trong cùng một ngày sẽ khiến lá đơn thứ
 * hai *biến mất không một tiếng động* thay vì báo lỗi. Bốn ký tự cho khoảng
 * một triệu tổ hợp mỗi ngày; sáu ký tự cho 32^6 ≈ 1,07 tỷ, đủ để chuyện đó
 * thôi là một khả năng đáng nghĩ tới. Mã vẫn đọc được cho nhau nghe.
 */

/**
 * Bảng chữ Crockford Base32: bỏ I, L, O, U để không lẫn với 1, 0 và không
 * vô tình ghép thành từ khó coi. Quan trọng vì mã này được đọc cho nhau nghe
 * và đối chiếu bằng mắt với dòng trong bản xuất CSV.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const RANDOM_LENGTH = 6;

export const MA_HO_SO_PATTERN = /^IR-\d{8}-[0-9A-HJKMNP-TV-Z]{6}$/;

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
