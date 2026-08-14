import { useState } from 'react';

import {
  SAMPLE_STATES,
  SUPERVISOR_HONORIFICS,
  SUPERVISOR_TITLES,
} from '../../lib/constants';
import { generateMaHoSo } from '../../lib/maHoSo';
import {
  type ErrorMap,
  type FormDraft,
  emptyForm,
  emptySample,
  validateForm,
} from '../../lib/schema';

/**
 * Nhập tay một đơn giấy vào cơ sở dữ liệu.
 *
 * Biểu mẫu này **không có bản sao nào của luật lệ**: nó gọi thẳng
 * `validateForm` — cùng hàm màn hình sinh viên gọi, dựng trên cùng
 * `formSchema` — rồi giao `FormValues` cho `addRecord`, thứ ghi qua
 * `toDocument()`. Nhờ vậy một đơn nhập tay không thể lệch khỏi hình dạng mà
 * firestore.rules chấp nhận, và cũng không thể lệch khỏi một đơn sinh viên
 * nộp. Nhãn ở đây là tiếng Anh như cả trang quản trị; luật thì dùng chung.
 *
 * Mã hồ sơ do `generateMaHoSo(date)` sinh từ **ngày ghi trên tờ đơn**, nên một
 * đơn nhập muộn vẫn mang mã đúng ngày của nó — và thứ tự theo ID vẫn là thứ
 * tự thời gian, thứ mà cả `loadRecords` lẫn `scripts/export-csv.ts` dựa vào.
 */

type Props = {
  onSubmit: (values: ReturnType<typeof validateForm>) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
};

export default function AddRecordForm({ onSubmit, onCancel, busy, error }: Props) {
  const [draft, setDraft] = useState<FormDraft>(() => emptyForm());
  const [errors, setErrors] = useState<ErrorMap>({});

  function patch(update: Partial<FormDraft>) {
    setDraft((prev) => ({ ...prev, ...update }));
  }

  function patchSample(id: string, update: Partial<FormDraft['samples'][number]>) {
    setDraft((prev) => ({
      ...prev,
      samples: prev.samples.map((row) => (row.id === id ? { ...row, ...update } : row)),
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validateForm(draft);
    setErrors(result.ok ? {} : result.errors);
    onSubmit(result);
  }

  return (
    <form className="add-form" onSubmit={handleSubmit} noValidate>
      <div className="field-grid">
        <Field
          id="add-studentName"
          label="Applicant"
          className="span-2"
          value={draft.studentName}
          error={errors.studentName}
          onChange={(v) => patch({ studentName: v })}
        />
        <Field
          id="add-studentId"
          label="Student ID"
          value={draft.studentId}
          error={errors.studentId}
          onChange={(v) => patch({ studentId: v })}
        />
        <Field
          id="add-phone"
          label="Phone"
          value={draft.phone}
          error={errors.phone}
          onChange={(v) => patch({ phone: v })}
        />
        <Field
          id="add-email"
          label="Email"
          className="span-2"
          value={draft.email}
          error={errors.email}
          onChange={(v) => patch({ email: v })}
        />
        <Field
          id="add-className"
          label="Class"
          value={draft.className}
          error={errors.className}
          onChange={(v) => patch({ className: v })}
        />
        <Field
          id="add-cohort"
          label="Cohort"
          value={draft.cohort}
          error={errors.cohort}
          onChange={(v) => patch({ cohort: v })}
        />

        <div className="field span-2">
          <span className="field-label" id="add-supervisor-label">
            Supervisor
          </span>
          <div className="supervisor-parts" role="group" aria-labelledby="add-supervisor-label">
            <select
              aria-label="Honorific"
              value={draft.supervisorHonorific}
              onChange={(e) => patch({ supervisorHonorific: e.target.value })}
            >
              {SUPERVISOR_HONORIFICS.map((honorific) => (
                <option key={honorific} value={honorific}>
                  {honorific}
                </option>
              ))}
            </select>
            <select
              aria-label="Academic title"
              value={draft.supervisorTitle}
              onChange={(e) => patch({ supervisorTitle: e.target.value })}
            >
              {SUPERVISOR_TITLES.map((title) => (
                <option key={title} value={title}>
                  {title === '' ? '—' : title}
                </option>
              ))}
            </select>
            <input
              aria-label="Supervisor name"
              value={draft.supervisorName}
              onChange={(e) => patch({ supervisorName: e.target.value })}
              aria-invalid={errors.supervisorName ? 'true' : undefined}
            />
          </div>
          {errors.supervisorName && (
            <span className="field-error">{errors.supervisorName}</span>
          )}
        </div>

        <Field
          id="add-department"
          label="Department"
          className="span-2"
          value={draft.department}
          error={errors.department}
          onChange={(v) => patch({ department: v })}
        />
        <Field
          id="add-city"
          label="Place"
          value={draft.city}
          error={errors.city}
          onChange={(v) => patch({ city: v })}
        />
        {/* Ngày trên tờ giấy, không phải hôm nay. Nó quyết định mã hồ sơ và
            mọi biểu đồ trong trang này. */}
        <Field
          id="add-date"
          label="Request date"
          type="date"
          value={draft.date}
          error={errors.date}
          hint={`Reference will be IR-${draft.date.replaceAll('-', '')}-XXXXXX`}
          onChange={(v) => patch({ date: v })}
        />
      </div>

      <h4 className="add-subhead">Samples</h4>
      {errors.samples && <span className="field-error">{errors.samples}</span>}

      <ul className="add-samples">
        {draft.samples.map((sample, index) => (
          <li key={sample.id}>
            <span className="sample-index" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="field">
              <input
                aria-label={`Sample ${index + 1} name`}
                placeholder="Name"
                value={sample.name}
                onChange={(e) => patchSample(sample.id, { name: e.target.value })}
                aria-invalid={errors[`samples.${index}.name`] ? 'true' : undefined}
              />
            </div>
            <div className="field">
              <select
                aria-label={`Sample ${index + 1} state`}
                value={sample.state}
                onChange={(e) => patchSample(sample.id, { state: e.target.value })}
                aria-invalid={errors[`samples.${index}.state`] ? 'true' : undefined}
              >
                <option value="">State…</option>
                {/* Giá trị giữ nguyên tiếng Việt: đây là dữ liệu được lưu
                    xuống, không phải chữ của giao diện. */}
                {SAMPLE_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <input
                aria-label={`Sample ${index + 1} solvent`}
                placeholder="Solvent"
                value={sample.solvent}
                onChange={(e) => patchSample(sample.id, { solvent: e.target.value })}
                aria-invalid={errors[`samples.${index}.solvent`] ? 'true' : undefined}
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-danger-ghost"
              disabled={draft.samples.length === 1}
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  samples: prev.samples.filter((row) => row.id !== sample.id),
                }))
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={() =>
          setDraft((prev) => ({ ...prev, samples: [...prev.samples, emptySample()] }))
        }
      >
        Add sample
      </button>

      {error && (
        <div className="notice notice-danger" role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className="actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy && <span className="spinner" aria-hidden="true" />}
          {busy ? 'Saving…' : 'Save record'}
        </button>
      </div>
    </form>
  );
}

/** Mã hồ sơ cho một đơn nhập tay, sinh từ ngày ghi trên tờ đơn. */
export function referenceFor(date: string): string {
  return generateMaHoSo(date);
}

function Field({
  id,
  label,
  value,
  error,
  hint,
  type = 'text',
  className,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  type?: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={className ? `field ${className}` : 'field'}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : undefined}
      />
      {error ? (
        <span className="field-error">{error}</span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}
