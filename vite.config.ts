import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],

  // Đường dẫn tương đối để bản build chạy được ở bất kỳ chỗ nào: thư mục gốc
  // của tên miền, hay thư mục con kiểu /ten-repo/ của GitHub Pages, mà không
  // phải build lại. Ứng dụng không đổi đường dẫn URL khi chuyển màn hình nên
  // đường dẫn tương đối luôn phân giải đúng.
  base: './',

  build: {
    // pdfmake nặng khoảng 1 MB nhưng nằm ở gói riêng, chỉ tải khi sinh viên
    // vào màn hình xem lại. Nâng ngưỡng cảnh báo để bản build không báo động
    // về đúng thứ đã cố ý tách ra.
    chunkSizeWarningLimit: 1100,
  },
});
