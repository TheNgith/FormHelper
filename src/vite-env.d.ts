/// <reference types="vite/client" />

/**
 * Cấu hình web của Firebase. Không có giá trị nào ở đây là bí mật: tất cả đều
 * nằm trong gói JavaScript gửi xuống trình duyệt, đúng như thiết kế. Xem mục
 * "Bảo mật" trong README.
 */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /**
   * Khóa site của reCAPTCHA **Enterprise**, dùng cho App Check.
   *
   * Công khai theo đúng thiết kế — reCAPTCHA không chạy được nếu nó không nằm
   * trong trang. Khóa Enterprise không có secret key nào đi kèm; đó là chuyện
   * của reCAPTCHA v3.
   */
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
