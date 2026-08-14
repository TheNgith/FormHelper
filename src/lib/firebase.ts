/**
 * Khởi tạo Firebase: một app, một Firestore, một App Check.
 *
 * Toàn bộ cấu hình dưới đây nằm trong gói JavaScript gửi xuống trình duyệt và
 * điều đó là đúng. `apiKey` của Firebase không phải mật khẩu — nó chỉ là định
 * danh dự án, ai mở DevTools cũng đọc được. Khóa site của reCAPTCHA cũng vậy:
 * nó *phải* nằm trong trang thì reCAPTCHA mới chạy được; khóa secret đi thẳng
 * vào Firebase console và không bao giờ có mặt trong kho mã này.
 *
 * Trang nộp đơn của sinh viên không có đăng nhập. Thứ đứng giữa Firestore và
 * cả Internet ở đường *ghi* là App Check cộng với firestore.rules, và hai thứ
 * đó trả lời hai câu hỏi khác nhau: "yêu cầu này có đến từ trang web của mình
 * không" và "nội dung này có đúng hình dạng không". Không cái nào trả lời
 * "người này là ai" — xem mục "Bảo mật" trong README.
 *
 * Đăng nhập chỉ tồn tại ở đúng một chỗ: trang quản trị `/ir-form/dashboard/`,
 * nơi nó mở đường *đọc* và *xóa* cho hai địa chỉ trong danh sách trắng. Vì
 * vậy tệp này **không được import `firebase/auth`** — cả hai điểm vào đều
 * import nó, nên thứ gì nằm đây cũng đi thẳng vào gói của sinh viên. SDK auth
 * nạp ở src/dashboard/lib/adminAuth.ts, và chỉ ở đó.
 */

import { type FirebaseApp, initializeApp } from 'firebase/app';
import {
  type AppCheck,
  ReCaptchaEnterpriseProvider,
  initializeAppCheck,
} from 'firebase/app-check';
import {
  type Firestore,
  connectFirestoreEmulator,
  getFirestore,
} from 'firebase/firestore';

/** Cấu hình giả cho emulator: chạy `npm run dev` không cần .env. */
const EMULATOR_CONFIG = {
  apiKey: 'demo-api-key',
  projectId: 'demo-don-thiet-bi',
  appId: 'demo-app-id',
};

const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // Chỉ trang quản trị dùng tới: `signInWithPopup` mở
  // https://<authDomain>/__/auth/handler, nên thiếu nó là bấm đăng nhập không
  // ra gì. Trang sinh viên không đụng tới Auth nên không thấy khác biệt — đó
  // đúng là lý do ô này vắng mặt suốt từ lần di trú App Check tới giờ.
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

/**
 * Bản build phát hành thiếu cấu hình thì nói thẳng ra, thay vì để sinh viên
 * điền hết một trang đơn dài rồi nhận một lỗi khó hiểu ở bước gửi.
 *
 * Khóa reCAPTCHA nằm trong danh sách này vì khi App Check đã bật cưỡng chế
 * thì thiếu nó nghĩa là *mọi* lá đơn bị từ chối — và triệu chứng, một câu
 * `permission-denied`, không hề chỉ về phía nguyên nhân.
 */
export const isConfigured =
  import.meta.env.DEV ||
  Boolean(envConfig.apiKey && envConfig.projectId && recaptchaSiteKey);

/**
 * Riêng trang quản trị còn cần `authDomain`. Cố ý **không** gộp vào
 * `isConfigured`: thiếu một giá trị mà chỉ hai người dùng tới thì không có lý
 * do gì để chặn cả trang nộp đơn của sinh viên.
 */
export const isAuthConfigured =
  import.meta.env.DEV || Boolean(isConfigured && envConfig.authDomain);

export const app: FirebaseApp = initializeApp(
  import.meta.env.DEV && !envConfig.apiKey ? EMULATOR_CONFIG : envConfig,
);

/**
 * App Check: chứng thực rằng yêu cầu đến từ ứng dụng này, chạy trên tên miền
 * đã đăng ký. Bằng chứng là điểm số reCAPTCHA — *có vẻ là người thật trong
 * một trình duyệt thật* — chứ không phải một danh tính.
 *
 * **Provider ở đây phải trùng đúng thứ đã đăng ký trong Firebase console.**
 * `ReCaptchaEnterpriseProvider` đi với khóa reCAPTCHA **Enterprise**;
 * `ReCaptchaV3Provider` đi với khóa reCAPTCHA v3 (loại có kèm secret key).
 * Lắp lệch hai thứ này thì token sinh ra không ai xác minh được, và triệu
 * chứng chỉ xuất hiện *sau khi bật cưỡng chế*: mọi lá đơn bị từ chối bằng một
 * câu `permission-denied`, trong khi trang vẫn chạy hoàn hảo lúc thử ở nhà.
 * Đổi bên console thì đổi luôn dòng này.
 *
 * Phải khởi tạo trước khi có gì đó chạm vào Firestore, để lệnh ghi đầu tiên
 * đã kèm sẵn token.
 *
 * Bỏ qua khi chạy emulator: emulator không kiểm tra App Check, nên khởi tạo ở
 * đó chỉ tạo tiếng ồn trong console và một lượt gọi ra Google trong lúc
 * `npm run dev`.
 *
 * Việc cưỡng chế nằm ở Firebase console → App Check → Cloud Firestore, không
 * ở đây và cũng không trong firestore.rules. Chừng nào công tắc đó còn tắt
 * thì dòng dưới đây chỉ gửi token đi cho console vẽ biểu đồ.
 */
export const appCheck: AppCheck | null =
  import.meta.env.DEV || !recaptchaSiteKey
    ? null
    : initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });

export const db: Firestore = getFirestore(app);

// Khi chạy `npm run dev` thì nối vào emulator, không đụng tới dự án thật.
export const usingEmulators = import.meta.env.DEV;

if (usingEmulators) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
