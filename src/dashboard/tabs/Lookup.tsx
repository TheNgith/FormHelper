import { useState } from 'react';

import RecordTable from '../components/RecordTable';
import {
  EMPTY_CRITERIA,
  type SearchCriteria,
  type SubmissionRecord,
  hasCriteria,
  searchRecords,
} from '../lib/records';

/**
 * Tab tra cứu: năm ô lọc bên trái, kết quả bên phải trong cùng bảng của tab
 * bản ghi.
 *
 * Tìm khi bấm nút chứ không tìm theo từng phím gõ — nút nằm trong bản mô tả,
 * và với dữ liệu đã nằm sẵn trong bộ nhớ thì hai cách nhanh như nhau. Bấm nút
 * còn cho một chỗ dừng rõ ràng: kết quả không nhấp nháy trong lúc người ta
 * còn đang gõ dở một cái tên.
 */

type Props = {
  records: SubmissionRecord[];
};

export default function Lookup({ records }: Props) {
  const [criteria, setCriteria] = useState<SearchCriteria>(EMPTY_CRITERIA);
  const [results, setResults] = useState<SubmissionRecord[] | null>(null);

  function patch(update: Partial<SearchCriteria>) {
    setCriteria((prev) => ({ ...prev, ...update }));
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setResults(searchRecords(records, criteria));
  }

  return (
    <div className="lookup">
      <form className="lookup-panel" onSubmit={handleSearch}>
        <Field
          id="lookup-studentName"
          label="Applicant name"
          hint="Partial match"
          value={criteria.studentName}
          onChange={(v) => patch({ studentName: v })}
        />
        <Field
          id="lookup-studentId"
          label="Student ID"
          hint="Matches from the start"
          value={criteria.studentId}
          onChange={(v) => patch({ studentId: v })}
        />
        <Field
          id="lookup-className"
          label="Class"
          hint="Partial match"
          value={criteria.className}
          onChange={(v) => patch({ className: v })}
        />
        <Field
          id="lookup-email"
          label="Email"
          hint="Partial match"
          value={criteria.email}
          onChange={(v) => patch({ email: v })}
        />
        <Field
          id="lookup-supervisorName"
          label="Supervisor"
          hint="Partial match, honorific optional"
          value={criteria.supervisorName}
          onChange={(v) => patch({ supervisorName: v })}
        />

        <div className="lookup-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setCriteria(EMPTY_CRITERIA);
              setResults(null);
            }}
          >
            Clear
          </button>
          {/* Không điền ô nào thì mọi đơn đều khớp, và một "kết quả" bằng cả
              bộ sưu tập chỉ làm người dùng tưởng mình đã tìm gì đó. */}
          <button type="submit" className="btn btn-primary" disabled={!hasCriteria(criteria)}>
            Search
          </button>
        </div>
      </form>

      <div className="lookup-results">
        {results === null ? (
          <p className="table-empty">
            Fill in one or more fields, then search. All matching is
            case-insensitive and runs on the records already loaded.
          </p>
        ) : (
          <>
            <p className="filter-summary">
              {results.length} {results.length === 1 ? 'match' : 'matches'}
            </p>
            <RecordTable records={results} emptyMessage="Nothing matched those fields." />
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="field-hint">{hint}</span>
    </div>
  );
}
