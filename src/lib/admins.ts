/**
 * Danh sách trắng của trang quản trị.
 *
 * **Danh sách này không phải cái cổng.** Cổng nằm trong firestore.rules, nơi
 * đúng hai địa chỉ dưới đây được chép lại thành hai chuỗi trong `isAdmin()`.
 * Bản chép ở đây chỉ quyết định trang quản trị vẽ màn hình nào: một tài khoản
 * Google bất kỳ vẫn đăng nhập được, nó chỉ nhận về câu "không có quyền" thay
 * vì bảng dữ liệu. Một người bỏ qua hẳn giao diện vẫn bị máy chủ từ chối, và
 * đó là lý do duy nhất khiến cách sắp xếp này an toàn.
 *
 * Hai bản chép mà lệch nhau thì triệu chứng là một người quản trị lặng lẽ mất
 * quyền đọc, nên firestore.rules.test.ts đọc thẳng tệp rules ra để so — cùng
 * cách nó đã canh SUBMISSION_FIELDS.
 *
 * Thêm người thứ ba nghĩa là sửa cả hai nơi rồi `npm run deploy:rules`. Ở mức
 * hai người thì đó là cái giá đúng: một cơ chế custom claims cần một tiến
 * trình có đặc quyền để cấp claim, tức là một máy chủ mà ứng dụng này không
 * có. Quanh mức năm người thì đổi sang custom claims, đừng kéo dài danh sách.
 */
export const ADMIN_EMAILS = [
  'nguyengiathinh004@gmail.com',
  'minhhuy.up2012@gmail.com',
] as const;

/** Chuẩn hóa như Google trả về: địa chỉ email không phân biệt hoa thường. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((allowed) => allowed === normalized);
}
