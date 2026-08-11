import SummaryView from '../components/SummaryView';
import type { FormValues } from '../lib/schema';

type Props = {
  values: FormValues;
  submitting: boolean;
  error: string | null;
  onEdit: () => void;
  onConfirm: () => void;
};

export default function ReviewScreen({
  values,
  submitting,
  error,
  onEdit,
  onConfirm,
}: Props) {
  return (
    <>
      <div className="banner banner-warning">
        <span>
          <strong>Kiểm tra lại trước khi gửi</strong>
          Đơn chưa được gửi đi. Hãy đối chiếu từng dòng bên dưới, sau đó bấm
          “Xác nhận và gửi”.
        </span>
      </div>

      {error && (
        <div className="banner banner-error" role="alert">
          <span>
            <strong>Gửi không thành công</strong>
            {error}
          </span>
        </div>
      )}

      <section className="card">
        <h2>Nội dung đơn</h2>
        <SummaryView values={values} />
      </section>

      <div className="actions actions-end">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onEdit}
          disabled={submitting}
        >
          Quay lại chỉnh sửa
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting && <span className="spinner" aria-hidden="true" />}
          {submitting ? 'Đang gửi…' : 'Xác nhận và gửi'}
        </button>
      </div>
    </>
  );
}
