import { SAMPLE_STATES } from '../lib/constants';
import type { ErrorMap, SampleDraft } from '../lib/schema';

type Props = {
  index: number;
  total: number;
  value: SampleDraft;
  errors: ErrorMap;
  onChange: (patch: Partial<SampleDraft>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export default function SampleRowEditor({
  index,
  total,
  value,
  errors,
  onChange,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: Props) {
  const base = `samples.${index}`;
  const nameError = errors[`${base}.name`];
  const stateError = errors[`${base}.state`];
  const solventError = errors[`${base}.solvent`];

  const nameId = `${base}-name`;
  const stateId = `${base}-state`;
  const solventId = `${base}-solvent`;

  return (
    <li className="sample-row">
      <div className="sample-row-head">
        <span className="sample-row-index" aria-hidden="true">
          {index + 1}
        </span>
        <span className="sample-row-title">Mẫu {index + 1}</span>
        <div className="sample-row-tools">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={`Di chuyển mẫu ${index + 1} lên trên`}
            title="Di chuyển lên"
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label={`Di chuyển mẫu ${index + 1} xuống dưới`}
            title="Di chuyển xuống"
          >
            ↓
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onDuplicate}
            aria-label={`Nhân đôi mẫu ${index + 1}`}
            title="Nhân đôi dòng"
          >
            Nhân đôi
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-danger-ghost"
            onClick={onRemove}
            disabled={total === 1}
            aria-label={`Xóa mẫu ${index + 1}`}
            title={total === 1 ? 'Đơn phải có ít nhất một mẫu' : 'Xóa dòng'}
          >
            Xóa
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor={nameId}>
          Tên mẫu<span className="req">*</span>
        </label>
        <input
          id={nameId}
          type="text"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          aria-invalid={nameError ? 'true' : undefined}
          aria-describedby={nameError ? `${nameId}-error` : undefined}
          autoComplete="off"
          placeholder="Ví dụ: HHVL DAP - HPMC"
        />
        {nameError && (
          <span className="field-error" id={`${nameId}-error`}>
            {nameError}
          </span>
        )}
      </div>

      <div className="field-grid">
        <div className="field">
          <label htmlFor={stateId}>
            Trạng thái mẫu<span className="req">*</span>
          </label>
          <select
            id={stateId}
            value={value.state}
            onChange={(e) => onChange({ state: e.target.value })}
            aria-invalid={stateError ? 'true' : undefined}
            aria-describedby={stateError ? `${stateId}-error` : undefined}
          >
            <option value="">— Chọn —</option>
            {SAMPLE_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          {stateError && (
            <span className="field-error" id={`${stateId}-error`}>
              {stateError}
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor={solventId}>
            Dung môi có thể hoà tan<span className="req">*</span>
          </label>
          <input
            id={solventId}
            type="text"
            value={value.solvent}
            onChange={(e) => onChange({ solvent: e.target.value })}
            aria-invalid={solventError ? 'true' : undefined}
            aria-describedby={solventError ? `${solventId}-error` : undefined}
            autoComplete="off"
            placeholder="Ví dụ: Methanol"
          />
          {solventError && (
            <span className="field-error" id={`${solventId}-error`}>
              {solventError}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
