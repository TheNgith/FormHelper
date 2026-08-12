import { supervisorFullLabel } from '../lib/constants';
import type { FormValues } from '../lib/schema';
import { formatShortDate } from '../lib/text';

type Props = {
  values: FormValues;
};

/**
 * Bản tóm tắt chỉ đọc, dùng chung cho màn hình xem lại và màn hình xác nhận.
 * Thứ tự các mục cố ý trùng với thứ tự trong file PDF để sinh viên dò từ trên
 * xuống khi đối chiếu với mẫu giấy. Sửa bố cục đơn thì sửa luôn ở đây — sáu
 * dòng thông tin sinh viên phải xếp đúng như trong `docDefinition.ts`.
 */
export default function SummaryView({ values }: Props) {
  return (
    <div className="summary">
      <dl className="summary-list">
        <div>
          <dt>Kính gửi</dt>
          <dd>{values.department}</dd>
        </div>
        <div>
          <dt>Giảng viên hướng dẫn</dt>
          <dd>{supervisorFullLabel(values.supervisor)}</dd>
        </div>
        <div>
          <dt>Ngày làm đơn</dt>
          <dd>
            {values.city}, {formatShortDate(values.date)}
          </dd>
        </div>
        <div>
          <dt>Em tên là</dt>
          <dd>{values.studentName}</dd>
        </div>
        <div>
          <dt>Mail</dt>
          <dd>{values.email}</dd>
        </div>
        <div>
          <dt>Lớp</dt>
          <dd>{values.className}</dd>
        </div>
        <div>
          <dt>Mã số sinh viên</dt>
          <dd>{values.studentId}</dd>
        </div>
        <div>
          <dt>Số điện thoại</dt>
          <dd>{values.phone}</dd>
        </div>
        <div>
          <dt>Niên khóa</dt>
          <dd>{values.cohort}</dd>
        </div>
      </dl>

      <h3 className="summary-subhead">
        Các mẫu đo ({values.samples.length})
      </h3>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col" className="col-stt">
                STT
              </th>
              <th scope="col">Tên mẫu</th>
              <th scope="col">Trạng thái mẫu</th>
              <th scope="col">Dung môi có thể hòa tan</th>
            </tr>
          </thead>
          <tbody>
            {values.samples.map((sample, index) => (
              <tr key={index}>
                <td className="col-stt">{index + 1}</td>
                <td>{sample.name}</td>
                <td>{sample.state}</td>
                <td>{sample.solvent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
