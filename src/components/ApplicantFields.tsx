import { SUPERVISORS, supervisorFullLabel } from '../lib/constants';
import type { ErrorMap, FormDraft } from '../lib/schema';

type Props = {
  values: FormDraft;
  errors: ErrorMap;
  onChange: (patch: Partial<FormDraft>) => void;
};

type TextFieldProps = {
  id: keyof FormDraft & string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  autoComplete?: string;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
};

function TextField({
  id,
  label,
  value,
  error,
  hint,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
  className,
  onChange,
}: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className ? `field ${className}` : 'field'}>
      <label htmlFor={id}>
        {label}
        <span className="req">*</span>
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export default function ApplicantFields({ values, errors, onChange }: Props) {
  return (
    <>
      <div className="field">
        <label htmlFor="department">Kính gửi</label>
        <input id="department" type="text" value={values.department} disabled />
        <span className="field-hint">Bộ môn phụ trách thiết bị, không thay đổi.</span>
      </div>

      <div className="field">
        <label htmlFor="supervisor">
          Giảng viên hướng dẫn<span className="req">*</span>
        </label>
        <select
          id="supervisor"
          value={values.supervisor}
          onChange={(e) => onChange({ supervisor: e.target.value })}
          aria-invalid={errors.supervisor ? 'true' : undefined}
          aria-describedby={errors.supervisor ? 'supervisor-error' : undefined}
        >
          {SUPERVISORS.map((s) => (
            <option key={s.name} value={s.name}>
              {supervisorFullLabel(s.name)}
            </option>
          ))}
        </select>
        {errors.supervisor && (
          <span className="field-error" id="supervisor-error">
            {errors.supervisor}
          </span>
        )}
      </div>

      <div className="field-grid">
        <TextField
          id="studentName"
          label="Em tên là"
          className="span-2"
          value={values.studentName}
          error={errors.studentName}
          autoComplete="name"
          placeholder="Nguyễn Thị Ngọc Ánh"
          onChange={(v) => onChange({ studentName: v })}
        />
        <TextField
          id="studentId"
          label="Mã số sinh viên"
          value={values.studentId}
          error={errors.studentId}
          inputMode="numeric"
          autoComplete="off"
          placeholder="2200123"
          onChange={(v) => onChange({ studentId: v })}
        />
        <TextField
          id="phone"
          label="SĐT"
          value={values.phone}
          error={errors.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0912345678"
          onChange={(v) => onChange({ phone: v })}
        />
        {/* Ô này từng bị khóa vì giá trị đến từ token đăng nhập. Không còn
            đăng nhập nên sinh viên tự gõ, và không gì chứng minh địa chỉ là
            của họ. Câu nhắc @ump.edu.vn ở đây là lời khuyên đọc được và sửa
            được — cố ý không đưa nó vào firestore.rules, nơi nó sẽ chặn thẳng
            một lá đơn thật bằng một câu lỗi khó hiểu. */}
        <TextField
          id="email"
          label="Mail"
          className="span-2"
          value={values.email}
          error={errors.email}
          hint="Dùng địa chỉ trường cấp (@ump.edu.vn) để bộ môn liên hệ lại được."
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="ngocanh@ump.edu.vn"
          onChange={(v) => onChange({ email: v })}
        />
        <TextField
          id="className"
          label="Lớp"
          value={values.className}
          error={errors.className}
          autoComplete="off"
          placeholder="D2A"
          onChange={(v) => onChange({ className: v })}
        />
        <TextField
          id="cohort"
          label="Niên khóa"
          value={values.cohort}
          error={errors.cohort}
          hint="Dạng 2022 - 2026"
          autoComplete="off"
          placeholder="2022 - 2026"
          onChange={(v) => onChange({ cohort: v })}
        />
      </div>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="city">Nơi làm đơn</label>
          <input id="city" type="text" value={values.city} disabled />
        </div>
        <TextField
          id="date"
          label="Ngày làm đơn"
          value={values.date}
          error={errors.date}
          type="date"
          onChange={(v) => onChange({ date: v })}
        />
      </div>
    </>
  );
}
