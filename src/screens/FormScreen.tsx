import { useState } from 'react';

import ApplicantFields from '../components/ApplicantFields';
import SampleList from '../components/SampleList';
import { EQUIPMENT } from '../lib/constants';
import type { ErrorMap, FormDraft, FormValues, SampleDraft } from '../lib/schema';
import { validateForm } from '../lib/schema';

type Props = {
  values: FormDraft;
  onChange: (patch: Partial<FormDraft>) => void;
  onValid: (values: FormValues) => void;
  onReset: () => void;
};

export default function FormScreen({ values, onChange, onValid, onReset }: Props) {
  const [errors, setErrors] = useState<ErrorMap>({});
  const [showSummaryError, setShowSummaryError] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validateForm(values);
    if (result.ok) {
      setErrors({});
      setShowSummaryError(false);
      onValid(result.values);
      return;
    }
    setErrors(result.errors);
    setShowSummaryError(true);
    focusFirstError(result.errors);
  }

  // Nếu người dùng đã bấm "Tiếp tục" một lần, kiểm tra lại sau mỗi thay đổi
  // để lỗi biến mất ngay khi được sửa, thay vì đợi bấm nút lần nữa.
  function revalidate(next: FormDraft) {
    if (Object.keys(errors).length === 0) return;
    const result = validateForm(next);
    setErrors(result.ok ? {} : result.errors);
    if (result.ok) setShowSummaryError(false);
  }

  function patchField(patch: Partial<FormDraft>) {
    onChange(patch);
    revalidate({ ...values, ...patch });
  }

  function patchSamples(samples: SampleDraft[]) {
    onChange({ samples });
    revalidate({ ...values, samples });
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {showSummaryError && errorCount > 0 && (
        <div className="banner banner-error" role="alert">
          <span>
            <strong>Chưa gửi được đơn</strong>
            Còn {errorCount} ô chưa hợp lệ. Các ô này được đánh dấu đỏ bên dưới.
          </span>
        </div>
      )}

      <section className="card">
        <h2>Thông tin người làm đơn</h2>
        <p className="card-hint">
          Các thông tin này được in nguyên văn lên đơn, hãy kiểm tra kỹ chính tả.
        </p>
        <ApplicantFields values={values} errors={errors} onChange={patchField} />
      </section>

      <section className="card">
        <h2>Các mẫu đo</h2>
        <p className="card-hint">
          Liệt kê những mẫu cần đo trên {EQUIPMENT}. Số thứ tự được đánh tự động
          theo đúng thứ tự bên dưới.
        </p>
        <SampleList samples={values.samples} errors={errors} onChange={patchSamples} />
      </section>

      <div className="actions actions-end">
        <button type="button" className="btn btn-secondary" onClick={onReset}>
          Xóa hết
        </button>
        <button type="submit" className="btn btn-primary">
          Tiếp tục
        </button>
      </div>
    </form>
  );
}

function focusFirstError(errors: ErrorMap) {
  const [firstKey] = Object.keys(errors);
  if (!firstKey) return;
  // Đường dẫn lỗi trùng với id của ô nhập, trừ các ô trong danh sách mẫu
  // dùng dạng `samples.0-name`.
  const match = /^samples\.(\d+)\.(\w+)$/.exec(firstKey);
  const id = match ? `samples.${match[1]}-${match[2]}` : firstKey;
  const el = document.getElementById(id);
  if (el instanceof HTMLElement) {
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
