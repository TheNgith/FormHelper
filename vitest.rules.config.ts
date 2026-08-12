import { defineConfig } from 'vitest/config';

/**
 * Cấu hình riêng cho bài kiểm tra firestore.rules.
 *
 * Tách khỏi vite.config.ts vì những bài này cần Firestore emulator đang chạy
 * và không cần plugin React hay bất cứ thứ gì của trình duyệt.
 */
export default defineConfig({
  test: {
    include: ['**/*.rules.test.ts'],

    // Mọi bài dùng chung một emulator; chạy song song thì clearFirestore()
    // của tệp này xóa mất dữ liệu tệp kia đang dựng.
    fileParallelism: false,

    // Lần gọi đầu tiên phải nạp rules lên emulator nên chậm hơn hẳn.
    testTimeout: 15_000,
  },
});
