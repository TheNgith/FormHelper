import { useState } from 'react';

import SummaryView from '../components/SummaryView';
import { downloadPdf } from '../lib/pdf/generate';
import type { FormValues } from '../lib/schema';

type Props = {
  values: FormValues;
  maHoSo: string;
  onRestart: () => void;
};

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
      <div className="banner banner-success">
        <span>
          <strong>Đã gửi đơn thành công</strong>
          Đơn của em đã được ghi nhận. Bước cuối là tải file PDF về để in và ký.
        </span>
      </div>

      <section className="card">
        <h2>Mã hồ sơ</h2>
        <p className="card-hint">
          Mã này đã được in sẵn ở góc trên bên phải file PDF. Giữ lại để đối
          chiếu khi cần hỏi bộ môn.
        </p>
        <p className="ma-ho-so">{maHoSo}</p>
      </section>

      <section className="card">
        <h2>Tải đơn về</h2>
        <p className="card-hint">
          File PDF khổ A4, in ở tỉ lệ 100% rồi xin đủ ba chữ ký. Tải lại bao
          nhiêu lần cũng ra đúng file như nhau.
        </p>

        {error && (
          <div className="banner banner-error" role="alert">
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => void handleDownload()}
          disabled={busy}
        >
          {busy && <span className="spinner" aria-hidden="true" />}
          {busy ? 'Đang tạo file…' : 'Tải PDF'}
        </button>
      </section>

      <section className="card">
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
      </section>

      <div className="actions actions-end">
        <button type="button" className="btn btn-secondary" onClick={onRestart}>
          Tạo đơn mới
        </button>
      </div>
    </>
  );
}
