/**
 * Xuất toàn bộ đơn đã nộp ra một file CSV, chạy tại máy.
 *
 *   npm run export:csv                  # → don-thiet-bi-YYYYMMDD.csv
 *   npm run export:csv -- duong-dan.csv
 *
 * Đây là cách duy nhất còn lại để đọc dữ liệu, và đó là cố ý. Không còn đăng
 * nhập nên firestore.rules đóng hẳn mọi đường đọc: mở một đường cho trình
 * duyệt là mở cho cả Internet, và người lạ dò ID tài liệu sẽ gom được tên, mã
 * số sinh viên và số điện thoại. Trang quản trị cũ bị gỡ theo.
 *
 * Script này đi vòng qua cả rules lẫn App Check vì nó xác thực bằng **service
 * account**, không phải bằng một máy khách web. Nói cách khác: lòng tin nằm ở
 * đúng một tệp JSON trên đúng một máy. Giữ tệp đó như giữ mật khẩu — nó không
 * bao giờ được đi vào kho mã (xem .gitignore).
 *
 * Cách chạy:
 *
 *   1. Firebase console → Project settings → Service accounts → Generate new
 *      private key. Đúng cái khóa CI đang dùng dưới tên FIREBASE_SERVICE_ACCOUNT.
 *   2. export GOOGLE_APPLICATION_CREDENTIALS=/duong/dan/toi/khoa.json
 *   3. export FIREBASE_PROJECT_ID=formhelper-1f657   (hoặc để trống nếu khóa
 *      đã ghi sẵn project_id)
 *   4. npm run export:csv
 */

import { writeFileSync } from 'node:fs';

import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

import {
  csvFileContents,
  csvFilename,
  submissionsToRows,
  toCsv,
  toRow,
} from './submissionRows.ts';

const COLLECTION = 'submissions';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  // Chạy thử với emulator thì không cần khóa nào: đặt FIRESTORE_EMULATOR_HOST
  // là firebase-admin nói chuyện với emulator và bỏ qua xác thực. Có lối này
  // thì việc "thử bản xuất" không đòi phải cầm khóa thật trong tay.
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;

  if (!emulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    fail(
      'Thiếu GOOGLE_APPLICATION_CREDENTIALS.\n' +
        'Trỏ nó tới tệp JSON của service account rồi chạy lại — xem phần đầu\n' +
        'scripts/export-csv.ts.',
    );
  }

  if (getApps().length === 0) {
    initializeApp({
      ...(emulator ? {} : { credential: applicationDefault() }),
      projectId: process.env.FIREBASE_PROJECT_ID ?? (emulator ? 'demo-don-thiet-bi' : undefined),
    });
  }

  if (emulator) console.warn(`Đang đọc từ emulator ${emulator}, không phải dữ liệu thật.`);

  // Sắp theo mã hồ sơ chứ không theo createdAt: mã bắt đầu bằng ngày nộp nên
  // thứ tự chữ cái đã là thứ tự thời gian, và cách này không cần chỉ mục nào.
  // Cũng không phân trang — với lưu lượng của một bộ môn thì lấy hết là đủ,
  // và một bản xuất thiếu dòng thì tệ hơn hẳn một bản xuất chậm.
  const snapshot = await getFirestore().collection(COLLECTION).orderBy('__name__').get();

  const rows = snapshot.docs.map((document) => {
    const data = document.data();
    const createdAt = data.createdAt;
    return toRow(
      document.id,
      data,
      createdAt instanceof Timestamp ? createdAt.toDate() : null,
    );
  });

  const outputPath = process.argv[2] ?? csvFilename();
  writeFileSync(outputPath, csvFileContents(toCsv(submissionsToRows(rows))), 'utf8');

  const unreadable = rows.filter((row) => row.values === null).length;
  console.log(`${rows.length} đơn → ${outputPath}`);
  if (unreadable > 0) {
    // Vẫn nằm trong file, chỉ thiếu các cột dựng lại từ formSchema. Im lặng ở
    // đây thì bộ môn không bao giờ biết có đơn nào đọc không ra.
    console.warn(`${unreadable} đơn không đúng hình dạng formSchema, xuất thiếu cột.`);
  }
}

await main();
