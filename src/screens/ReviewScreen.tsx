import { useEffect } from 'react';

import SummaryView from '../components/SummaryView';
import { downloadPdf, prewarmPdf } from '../lib/pdf/generate';
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
  // Nạp sẵn thư viện PDF và bộ phông ngay khi vào màn hình này. Trong lúc
  // sinh viên đọc lại bản tóm tắt thì phần nặng đó đã tải xong, nên nút
  // "Tải PDF" ở màn hình sau bấm là có file ngay.
  useEffect(() => {
    void prewarmPdf();
  }, []);

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

      {/* Chỉ có khi chạy `npm run dev`: xem thử bố cục PDF mà không phải gửi
          đơn. Vite loại bỏ hẳn khối này khi build bản phát hành. */}
      {import.meta.env.DEV && (
        <div className="actions actions-end">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void downloadPdf(values, 'IR-XXXXXXXX-DEV0')}
          >
            [dev] Xem thử PDF
          </button>
        </div>
      )}
    </>
  );
}
