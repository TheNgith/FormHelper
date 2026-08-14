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
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  connectAuthEmulator,
  initializeAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

import { app, usingEmulators } from '../../lib/firebase';

/**
 * `initializeAuth` với persistence chỉ định sẵn, **không dùng `getAuth()`**.
 *
 * `getAuth()` chọn IndexedDB làm nơi lưu phiên đăng nhập, và bản IndexedDB
 * của Firebase Auth có một cái chốt theo trạng thái hiển thị của trang:
 *
 *     onVisibilityChange = () => document.visibilityState === 'hidden' && this.onPageHide()
 *     async _openDb() { if (this.isHiding) throw Error('Database is closing/hidden') }
 *
 * Đúng luồng đăng nhập bằng cửa sổ bật lên thì chốt ấy sập vào mặt mình: cửa
 * sổ Google che mất tab gốc, tab gốc chuyển sang `hidden`, `isHiding` bật lên
 * — rồi khi Google trả kết quả về, SDK ghi người dùng vừa đăng nhập xuống
 * IndexedDB và ăn ngay lỗi đó. Nửa OAuth đã xong xuôi; chỉ mỗi lượt ghi hỏng,
 * nên triệu chứng là "đăng nhập thất bại" sau khi đã đăng nhập thành công.
 * Nó còn *lúc được lúc không*, tùy tab gốc có bị ẩn đúng khoảnh khắc ấy hay
 * không, nên đây là loại lỗi rất dễ đổ nhầm cho cấu hình console.
 *
 * `browserLocalPersistence` (localStorage) không có cái chốt ấy. Phiên đăng
 * nhập vẫn sống qua lần đóng trình duyệt, đúng như IndexedDB trước đây, nên
 * đây là sửa lỗi chứ không phải đổi hành vi. Mức phơi bày cũng không đổi:
 * IndexedDB và localStorage đều là bộ nhớ cùng nguồn, JavaScript nào chạy
 * trên trang cũng đọc được cả hai.
 *
 * `browserSessionPersistence` đứng sau làm lối lui cho trình duyệt chặn
 * localStorage (chế độ riêng tư của vài trình duyệt). Muốn *bắt buộc* đăng
 * nhập lại mỗi lần mở trình duyệt — hợp lý hơn nếu trang này chạy trên máy
 * dùng chung — thì đảo thứ tự hai dòng dưới.
 *
 * `browserPopupRedirectResolver` phải khai tay: `initializeAuth` không tự gắn
 * nó như `getAuth()`, và thiếu nó thì `signInWithPopup` ném `auth/argument-error`.
 */
export const auth: Auth = initializeAuth(app, {
  persistence: [browserLocalPersistence, browserSessionPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

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
