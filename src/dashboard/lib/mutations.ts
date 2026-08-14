/**
 * Hai lệnh ghi duy nhất của trang quản trị: xóa nhiều đơn, và nhập tay một
 * đơn. Không có lệnh sửa — `allow update` trong firestore.rules vẫn đóng.
 */

import {
  type Firestore,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import type { FormValues } from '../../lib/schema';
import { COLLECTION, toDocument } from '../../lib/submissions';

/** Trần của một `writeBatch` trong Firestore. Không phải con số ta chọn. */
export const BATCH_LIMIT = 500;

/**
 * Xóa hẳn, không hoàn lại được.
 *
 * Không có trường xóa mềm, không có bản sao lưu, không có nút hoàn tác. Hộp
 * thoại xác nhận trong giao diện là toàn bộ lớp chắn, và `npm run export:csv`
 * là cách duy nhất giữ một bản trước khi bấm.
 *
 * Chia lô 500 vì đó là giới hạn cứng của một `writeBatch`. Các lô chạy lần
 * lượt: một lô hỏng giữa chừng thì những lô trước đã xong vẫn xong, nên bên
 * gọi phải nạp lại dữ liệu chứ không được coi lỗi là "chưa xóa gì cả".
 */
export async function deleteRecords(db: Firestore, maHoSoList: string[]): Promise<void> {
  for (let i = 0; i < maHoSoList.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const maHoSo of maHoSoList.slice(i, i + BATCH_LIMIT)) {
      batch.delete(doc(db, COLLECTION, maHoSo));
    }
    await batch.commit();
  }
}

/**
 * Nhập tay một đơn — đi qua đúng đường ghi mà sinh viên vẫn đi.
 *
 * Cùng `toDocument()` nên cùng chuẩn hóa NFC, cùng `serverTimestamp()` nên
 * cùng thỏa `createdAt == request.time`, cùng `allow create` nên rules không
 * phải mọc thêm một nhánh nào cho người quản trị. Một tài liệu nhập tay vì
 * thế giống hệt một tài liệu sinh viên nộp, và không thể trôi khỏi thứ mà
 * rules chấp nhận.
 *
 * `createdAt` là *giờ gõ vào*, không phải ngày ghi trên tờ giấy. Ngày thật
 * nằm ở `requestDate`, và mọi biểu đồ cùng bộ lọc trong trang này đọc ô đó —
 * chỉ có thứ tự sắp xếp mới nhất/cũ nhất là nhìn `createdAt`.
 */
export async function addRecord(
  db: Firestore,
  values: FormValues,
  maHoSo: string,
): Promise<void> {
  await setDoc(doc(db, COLLECTION, maHoSo), {
    ...toDocument(values, maHoSo),
    createdAt: serverTimestamp(),
  });
}
