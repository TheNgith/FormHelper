import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],

  /**
   * Ứng dụng nằm dưới một tiền tố đường dẫn: ump.ngthinh.com/ir-form/
   *
   * Tiền tố này do một reverse proxy ở trước quyết định — trang chủ
   * ump.ngthinh.com và từng công cụ đều nằm ở kho mã riêng, triển khai riêng,
   * và proxy ghép chúng lại thành một tên miền. Bản build ở đây không biết gì
   * về proxy đó: nó chỉ cần phục vụ đúng những địa chỉ bắt đầu bằng
   * `/ir-form/`, y hệt khi mở thẳng bằng địa chỉ .web.app của Hosting.
   *
   * Đường dẫn **tuyệt đối**, không phải './' như trước, và khác biệt đó không
   * phải chuyện thẩm mỹ. Với './' thì mọi địa chỉ được phân giải theo URL của
   * trang đang mở, nên sinh viên gõ thiếu dấu gạch cuối — `/ir-form` thay vì
   * `/ir-form/` — sẽ khiến `./fonts/...` trỏ về `/fonts/...` ở gốc tên miền,
   * tức là sang trang chủ. Trang vẫn hiện ra bình thường; chỉ có nút "Tải
   * PDF" là hỏng, vì phông nạp bằng fetch tại thời điểm bấm (xem BASE_URL
   * trong src/lib/pdf/fonts.ts). Đúng loại lỗi lọt qua mọi lần thử của người
   * xây dựng, vì họ luôn mở đúng địa chỉ có gạch cuối.
   *
   * Đổi chỗ đặt trang thì sửa hằng số này, `outDir` bên dưới, dòng redirect
   * trong firebase.json, *và* bảng định tuyến của proxy — bốn nơi phải cùng
   * nói một đường dẫn.
   */
  base: '/ir-form/',

  build: {
    // Firebase Hosting phục vụ tệp theo đúng cây thư mục, không có cách nào
    // "gắn" dist vào một tiền tố. Vậy nên bản build phải nằm sẵn trong đúng
    // thư mục con của gốc hosting (`public: "dist"` trong firebase.json).
    //
    // Nhờ vậy proxy chỉ việc chuyển tiếp nguyên đường dẫn, không phải cắt bỏ
    // tiền tố — và cùng một URL chạy được cả qua proxy lẫn khi mở thẳng
    // <project>.web.app/ir-form/, thứ cần có mỗi khi phải tìm xem lỗi nằm ở
    // ứng dụng hay ở proxy.
    outDir: 'dist/ir-form',

    // pdfmake nặng khoảng 1 MB nhưng nằm ở gói riêng, chỉ tải khi sinh viên
    // vào màn hình xem lại. Nâng ngưỡng cảnh báo để bản build không báo động
    // về đúng thứ đã cố ý tách ra.
    chunkSizeWarningLimit: 1100,
  },

  test: {
    // Bài kiểm tra Rules cần Firestore emulator đang chạy nên không nằm trong
    // lần chạy mặc định; `npm run test:rules` tự bật emulator cho nó.
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.rules.test.ts'],
  },
});
