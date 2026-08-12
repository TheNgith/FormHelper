import { useState } from 'react';

import SummaryView from '../components/SummaryView';
import { downloadPdf } from '../lib/pdf/generate';
import type { FormValues } from '../lib/schema';

type Props = {
  values: FormValues;
  /** Không hiện ở màn hình này nữa, nhưng vẫn phải in vào file PDF. */
  maHoSo: string;
  onRestart: () => void;
};

/**
 * Màn hình cuối. Mã hồ sơ không còn hiện ở đây mà nằm trên thanh tiêu đề của
 * tờ đơn (xem `App.tsx`): bản thiết kế dồn màn hình này về đúng một việc còn
 * phải làm — tải file PDF về in và ký.
 */
export default function ConfirmationScreen({ values, maHoSo, onRestart }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  async function handleDownload() {
    setBusy(true);
    setError(null);
    try {
      await downloadPdf(values, maHoSo);
    } catch {
      setError(
        'Chưa tạo được file PDF. Kiểm tra kết nối mạng rồi bấm lại — đơn của em đã được ghi nhận, mã hồ sơ vẫn giữ nguyên.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="notice notice-success">
        <span>Đã gửi đơn</span>
      </div>

      {error && (
        <div className="notice notice-danger" role="alert">
          <span>{error}</span>
        </div>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Tiếp theo</h2>
        </div>
        <div className="section-body">
          <p className="next-step">
            In và xin đủ các chữ ký. Sau đó nộp cho người phụ trách thiết bị.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleDownload()}
            disabled={busy}
          >
            {busy && <span className="spinner" aria-hidden="true" />}
            {busy ? 'Đang tạo file…' : 'Tải PDF'}
          </button>
        </div>
      </section>

      <hr className="hr" />

      <section className="section">
        <div className="section-head" />
        <div className="section-body">
          <button
            type="button"
            className="btn btn-ghost disclosure"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
          >
            {showDetails ? '▾' : '▸'} Nội dung đơn đã gửi
          </button>
          {showDetails && (
            <div className="disclosure-body">
              <SummaryView values={values} />
            </div>
          )}
        </div>
      </section>

      <div className="actions">
        <button type="button" className="btn btn-secondary" onClick={onRestart}>
          Tạo đơn mới
        </button>
      </div>
    </>
  );
}
