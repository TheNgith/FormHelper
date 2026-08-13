import { SUPERVISOR_HONORIFICS, SUPERVISOR_TITLES } from '../lib/constants';
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
  // Ba ô của giảng viên dùng chung một dòng lỗi dưới nhóm. Hai ô `select` chỉ
  // sai được nếu bản nháp cũ mang giá trị lạ, nên trên thực tế đây gần như
  // luôn là lỗi của ô tên.
  const supervisorError =
    errors.supervisorName ?? errors.supervisorHonorific ?? errors.supervisorTitle;

  return (
    // Bản thiết kế gom hết vào một lưới hai cột: ô nào ngắn thì đi cặp, ô nào
    // dài chiếm cả hàng. Thứ tự giữ nguyên thứ tự đọc của tờ đơn.
    <div className="field-grid">
      <div className="field span-2">
        <label htmlFor="department">Kính gửi</label>
        <input id="department" type="text" value={values.department} disabled />
        <span className="field-hint">Không thay đổi mục này</span>
      </div>

      {/* Ba ô rời: cách xưng hô, học hàm học vị, tên. Nhãn chung nằm trên một
          `span` chứ không phải `label`, vì một `label` chỉ trỏ được tới một ô;
          nhóm được gộp bằng role="group" và mỗi ô mang nhãn riêng cho trình
          đọc màn hình. Ba `id` trùng tên ba khóa lỗi để `focusFirstError`
          trong FormScreen nhảy đúng ô. */}
      <div className="field span-2">
        <span className="field-label" id="supervisor-label">
          Giảng viên hướng dẫn<span className="req">*</span>
        </span>
        <div className="supervisor-parts" role="group" aria-labelledby="supervisor-label">
          <select
            id="supervisorHonorific"
            aria-label="Cách xưng hô"
            value={values.supervisorHonorific}
            onChange={(e) => onChange({ supervisorHonorific: e.target.value })}
            aria-invalid={errors.supervisorHonorific ? 'true' : undefined}
          >
            {SUPERVISOR_HONORIFICS.map((honorific) => (
              <option key={honorific} value={honorific}>
                {honorific}
              </option>
            ))}
          </select>
          <select
            id="supervisorTitle"
            aria-label="Học hàm, học vị"
            value={values.supervisorTitle}
            onChange={(e) => onChange({ supervisorTitle: e.target.value })}
            aria-invalid={errors.supervisorTitle ? 'true' : undefined}
          >
            {SUPERVISOR_TITLES.map((title) => (
              <option key={title} value={title}>
                {title === '' ? '—' : title}
              </option>
            ))}
          </select>
          <input
            id="supervisorName"
            type="text"
            aria-label="Tên giảng viên hướng dẫn"
            value={values.supervisorName}
            onChange={(e) => onChange({ supervisorName: e.target.value })}
            aria-invalid={errors.supervisorName ? 'true' : undefined}
            aria-describedby={supervisorError ? 'supervisor-error' : undefined}
            autoComplete="off"
            placeholder="Nguyễn Văn A"
          />
        </div>
        {supervisorError && (
          <span className="field-error" id="supervisor-error">
            {supervisorError}
          </span>
        )}
      </div>

      <TextField
        id="studentName"
        label="Em tên là"
        className="span-2"
        value={values.studentName}
        error={errors.studentName}
        autoComplete="name"
        placeholder="Trần Ngọc B"
        onChange={(v) => onChange({ studentName: v })}
      />
      <TextField
        id="studentId"
        label="Mã số sinh viên"
        value={values.studentId}
        error={errors.studentId}
        inputMode="numeric"
        autoComplete="off"
        placeholder="000000"
        onChange={(v) => onChange({ studentId: v })}
      />
      <TextField
        id="phone"
        label="Số điện thoại"
        value={values.phone}
        error={errors.phone}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0987654321"
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
        hint="Dùng địa chỉ @ump.edu.vn"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="example@ump.edu.vn"
        onChange={(v) => onChange({ email: v })}
      />
      <TextField
        id="className"
        label="Lớp"
        value={values.className}
        error={errors.className}
        autoComplete="off"
        placeholder="D22"
        onChange={(v) => onChange({ className: v })}
      />
      <TextField
        id="cohort"
        label="Niên khóa"
        value={values.cohort}
        error={errors.cohort}
        autoComplete="off"
        placeholder="2022 - 2027"
        onChange={(v) => onChange({ cohort: v })}
      />

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
  );
}
