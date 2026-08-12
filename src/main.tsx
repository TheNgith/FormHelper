import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { isConfigured } from './lib/firebase';
import './styles/index.css';

/**
 * Bản dựng thiếu cấu hình thì nói ra ngay, thay vì để sinh viên điền hết một
 * trang đơn dài rồi mới nhận `permission-denied` ở bước gửi. Khối này từng
 * nằm trong AuthGate, thứ duy nhất còn lại của cái cổng ấy.
 */
function NotConfigured() {
  return (
    <main className="app">
      <header className="masthead">
        <h1>Đơn xin sử dụng thiết bị</h1>
        <p>Bộ môn Hóa Hữu Cơ</p>
      </header>
      <div className="banner banner-error" role="alert">
        <span>
          <strong>Ứng dụng chưa được cấu hình</strong>
          Bản dựng này thiếu thông tin dự án Firebase. Vui lòng báo cho bộ môn.
        </span>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isConfigured ? <App /> : <NotConfigured />}</StrictMode>,
);
