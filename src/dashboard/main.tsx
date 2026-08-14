import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import Dashboard from './Dashboard';
import { isAuthConfigured } from '../lib/firebase';
import '../styles/index.css';
import '../styles/dashboard.css';

/**
 * Điểm vào thứ hai của bản build — xem `rollupOptions.input` trong
 * vite.config.ts. Trang này không dùng chung gói JavaScript nào với trang nộp
 * đơn ngoài phần lõi, nên Firebase Auth và Recharts không bao giờ tới máy sinh
 * viên.
 *
 * Nạp cả index.css: trang quản trị dùng đúng hệ thiết kế ấy — giấy ngà, chữ có
 * chân, điểm nhấn màu đồng — rồi dashboard.css thêm phần riêng của nó.
 */

/**
 * Thiếu `authDomain` thì cửa sổ đăng nhập mở ra một địa chỉ không tồn tại, và
 * triệu chứng là bấm nút không thấy gì xảy ra. Nói thẳng ra còn hơn.
 */
function NotConfigured() {
  return (
    <main className="page dashboard">
      <div className="sheet">
        <header className="sheet-head">
          <h1>Dashboard</h1>
        </header>
        <div className="sheet-body">
          <div className="notice notice-danger" role="alert">
            <span>
              <strong>Sign-in is not configured</strong>
              This build is missing VITE_FIREBASE_AUTH_DOMAIN, so the Google
              popup cannot open. See .env.example.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isAuthConfigured ? <Dashboard /> : <NotConfigured />}</StrictMode>,
);
