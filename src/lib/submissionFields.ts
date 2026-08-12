/**
 * Danh sách khóa của một tài liệu trong `submissions`.
 *
 * Để riêng ở đây, không phụ thuộc gì vào firebase, để cả bên ghi
 * (submissions.ts) lẫn bài kiểm tra Rules cùng đọc một nguồn.
 *
 * firestore.rules không import được JavaScript nên nó buộc phải chép lại danh
 * sách này. Hai bản chép mà lệch nhau thì mọi lá đơn đều bị từ chối — nên
 * firestore.rules.test.ts đọc thẳng tệp rules ra để so, thay vì tin rằng người
 * sửa sẽ nhớ sửa cả hai chỗ.
 */
export const SUBMISSION_FIELDS = [
  'maHoSo',
  'createdAt',
  'email',
  'studentName',
  'studentId',
  'phone',
  'className',
  'cohort',
  'department',
  'supervisor',
  'city',
  'requestDate',
  'samples',
] as const;

export type SubmissionField = (typeof SUBMISSION_FIELDS)[number];
