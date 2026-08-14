/**
 * Đăng nhập Google cho trang quản trị — **chỗ duy nhất trong kho mã này import
 * `firebase/auth`**.
 *
 * Cả hai điểm vào đều import `src/lib/firebase.ts`, nên thứ gì nằm trong đó
 * cũng đi thẳng vào gói JavaScript của sinh viên. Để SDK auth ở đây thì
 * Rollup gói nó riêng cho trang quản trị. Đó không phải chuyện sạch sẽ mà là
 * vài chục KB trên một chiếc điện thoại đang mở trang lần đầu, và kiểu hỏng
 * thì im lặng — nên bản build có bài kiểm tra riêng, xem `npm run
 * check:bundle`.
 *
 * `signInWithPopup` chứ không phải `signInWithRedirect`: luồng redirect dựa
 * vào cookie bên thứ ba, thứ Safari chặn mặc định và các trình duyệt khác đang
 * lần lượt chặn theo. Đổi lại, popup phải mở từ một cú bấm thật của người
 * dùng — không bao giờ tự gọi lúc component gắn vào cây.
 */

import {
  type Auth,
  type User,
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

import { app, usingEmulators } from '../../lib/firebase';

export const auth: Auth = getAuth(app);

// Không có dòng này thì `npm run dev` mở thẳng cửa sổ đăng nhập Google thật
// cho dự án giả `demo-don-thiet-bi`. Emulator thì nhận bất kỳ địa chỉ nào ta
// gõ vào, và đó là cách duy nhất thử được *cả hai* phía của danh sách trắng.
if (usingEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}

/** Đăng nhập bằng Google. Phải gọi thẳng từ trình xử lý sự kiện bấm chuột. */
export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();

  // Máy trong phòng thí nghiệm dùng chung, và Google mặc định đăng nhập lại
  // ngay bằng tài khoản gần nhất nếu chỉ có một. Buộc hiện bảng chọn tài
  // khoản để không ai vô tình vào bằng phiên của người trước.
  provider.setCustomParameters({ prompt: 'select_account' });

  await signInWithPopup(auth, provider);
}

export async function signOutAdmin(): Promise<void> {
  await signOut(auth);
}

/**
 * Theo dõi phiên đăng nhập. Trả về hàm hủy đăng ký.
 *
 * `user` là `null` khi chưa đăng nhập — nhưng ở lần gọi *đầu tiên* thì `null`
 * cũng có nghĩa "Firebase đã dò xong bộ nhớ và không thấy phiên nào", nên màn
 * hình chờ phải đợi đúng lần gọi ấy chứ không được đoán trước.
 */
export function watchAdmin(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export type { User };
