import { fileURLToPath } from 'node:url';

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

    /**
     * Hai điểm vào, không phải một router phía máy khách.
     *
     * `dashboard/index.html` cộng với `base` và `outDir` ở trên cho ra
     * `dist/ir-form/dashboard/index.html`, và Firebase Hosting phục vụ nó tại
     * `/ir-form/dashboard/` như một thư mục bình thường — `trailingSlash:
     * true` lo nốt địa chỉ thiếu gạch cuối. Không phải sửa firebase.json,
     * cũng không phải sửa bảng định tuyến của proxy: proxy chuyển tiếp nguyên
     * tiền tố `/ir-form` nên một đường dẫn mới nằm dưới đó tự đi đúng chỗ.
     * Ghi chú "bốn nơi phải cùng nói một đường dẫn" ở trên vẫn nói về *một*
     * đường dẫn, không phải hai.
     *
     * Tách hẳn hai điểm vào chứ không dùng router, vì trang nộp đơn mới là
     * đường nóng — điện thoại, lần đầu vào, dùng một lần rồi thôi. Firebase
     * Auth và Recharts không được phép nằm trong gói của nó chỉ vì một trang
     * mỗi tháng có hai người mở. Chỗ đó thì đạt được: `npm run check:bundle`
     * đo trên bản đã dựng và cả hai thư viện đều vắng mặt.
     *
     * **Nhưng nó không hoàn toàn miễn phí, và con số đã đo được.** Rollup dồn
     * những module *cả hai* điểm vào cùng dùng vào một gói chung, và trang nộp
     * đơn phải tải gói chung ấy. `src/lib/firebase.ts` nằm ở giữa, nên khi
     * trang quản trị gọi tới `query`/`orderBy`/`writeBatch` thì bộ máy truy vấn
     * của Firestore trở thành mã sống và rơi vào gói chung — dù sinh viên
     * không bao giờ chạm tới nó:
     *
     *   trước: 708,69 kB (gzip 213,34)
     *   sau:   759,02 kB (gzip 227,74)   → +50,3 kB, +14,4 kB gzip (+6,7%)
     *
     * Đo bằng cách bỏ dòng `dashboard:` bên dưới rồi dựng lại: gói của sinh
     * viên trở về đúng 708,76 kB, nên toàn bộ phần chênh là do điểm vào thứ
     * hai chứ không phải do mã mới của trang nộp đơn.
     *
     * Chấp nhận ở mức này. Muốn xóa hẳn phần chênh thì phải dựng **hai lần
     * riêng biệt** (mỗi điểm vào một lượt `vite build`, không dùng chung gói
     * nào) — đổi lại trang quản trị mang bản sao React và Firestore của riêng
     * nó, thứ chẳng ai bận tâm ở một trang hai người dùng. Nếu con số trên còn
     * phình ra vì trang quản trị dùng thêm API Firestore mới, đó là lúc làm.
     */
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        dashboard: fileURLToPath(new URL('dashboard/index.html', import.meta.url)),
      },
    },

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
