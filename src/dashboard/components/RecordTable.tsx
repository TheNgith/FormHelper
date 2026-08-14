import { useState } from 'react';

import { formatShortDate } from '../../lib/text';
import type { SubmissionRecord } from '../lib/records';

/**
 * Bảng đơn, dùng chung cho tab bản ghi và tab tra cứu.
 *
 * Dòng thu gọn chỉ mang thông tin của người nộp cộng **số lượng** mẫu; mở một
 * dòng ra mới thấy danh sách mẫu đầy đủ. Một đơn có tới 60 mẫu, nên trải hết
 * ra là mất luôn khả năng lướt qua danh sách.
 *
 * Ô chọn để xóa chỉ hiện khi bên gọi truyền `selection` vào — tab tra cứu
 * không xóa, và một ô chọn không làm được gì thì tệ hơn là không có.
 */

export type Selection = {
  selected: ReadonlySet<string>;
  onToggle: (maHoSo: string) => void;
  onToggleAll: (maHoSoList: string[], select: boolean) => void;
};

type Props = {
  records: SubmissionRecord[];
  selection?: Selection;
  emptyMessage: string;
};

function formatMoment(date: Date | null): string {
  if (!date) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** '2026-08-12' -> '12/08/2026'; ô ngày hỏng thì hiện nguyên vẹn thứ đã lưu. */
function formatRequestDate(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? formatShortDate(iso) : iso || '—';
}

export default function RecordTable({ records, selection, emptyMessage }: Props) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  function toggleExpanded(maHoSo: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(maHoSo)) next.delete(maHoSo);
      else next.add(maHoSo);
      return next;
    });
  }

  if (records.length === 0) {
    return <p className="table-empty">{emptyMessage}</p>;
  }

  const ids = records.map((record) => record.maHoSo);
  const allSelected =
    selection !== undefined && ids.length > 0 && ids.every((id) => selection.selected.has(id));

  return (
    <div className="table-wrap">
      <table className="table records-table">
        <thead>
          <tr>
            {selection && (
              <th className="col-check">
                <input
                  type="checkbox"
                  checked={allSelected}
                  aria-label={allSelected ? 'Clear selection' : 'Select all rows'}
                  onChange={() => selection.onToggleAll(ids, !allSelected)}
                />
              </th>
            )}
            <th className="col-expand" />
            <th>Reference</th>
            <th>Submitted</th>
            <th>Applicant</th>
            <th>Student ID</th>
            <th>Class</th>
            <th>Supervisor</th>
            <th>Request date</th>
            <th className="col-count">Samples</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const isOpen = expanded.has(record.maHoSo);
            return [
              <tr key={record.maHoSo}>
                {selection && (
                  <td className="col-check">
                    <input
                      type="checkbox"
                      checked={selection.selected.has(record.maHoSo)}
                      aria-label={`Select ${record.maHoSo}`}
                      onChange={() => selection.onToggle(record.maHoSo)}
                    />
                  </td>
                )}
                <td className="col-expand">
                  <button
                    type="button"
                    className="btn btn-ghost row-toggle"
                    aria-expanded={isOpen}
                    onClick={() => toggleExpanded(record.maHoSo)}
                  >
                    <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                    <span className="sr-only">
                      {isOpen ? 'Hide samples for' : 'Show samples for'} {record.maHoSo}
                    </span>
                  </button>
                </td>
                <td className="col-ref">{record.maHoSo}</td>
                <td>{formatMoment(record.createdAt)}</td>
                <td>{record.studentName}</td>
                <td>{record.studentId}</td>
                <td>{record.className}</td>
                <td>{record.supervisor}</td>
                <td>{formatRequestDate(record.requestDate)}</td>
                <td className="col-count">{record.samples.length}</td>
              </tr>,

              isOpen && (
                <tr key={`${record.maHoSo}-samples`} className="row-detail">
                  <td colSpan={selection ? 10 : 9}>
                    <dl className="detail-grid">
                      <div>
                        <dt>Email</dt>
                        <dd>{record.email || '—'}</dd>
                      </div>
                      <div>
                        <dt>Phone</dt>
                        <dd>{record.phone || '—'}</dd>
                      </div>
                      <div>
                        <dt>Cohort</dt>
                        <dd>{record.cohort || '—'}</dd>
                      </div>
                      <div>
                        <dt>Department</dt>
                        <dd>{record.department || '—'}</dd>
                      </div>
                      <div>
                        <dt>Place</dt>
                        <dd>{record.city || '—'}</dd>
                      </div>
                    </dl>

                    {record.samples.length === 0 ? (
                      <p className="table-empty">This record has no samples.</p>
                    ) : (
                      <table className="table sample-table">
                        <thead>
                          <tr>
                            <th className="col-stt">#</th>
                            <th>Sample</th>
                            <th>State</th>
                            <th>Solvent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.samples.map((sample, index) => (
                            // Không có khóa nào ổn định trong một mẫu — tên
                            // mẫu trùng nhau được. Danh sách này chỉ đọc và
                            // không bao giờ đổi thứ tự, nên chỉ số là khóa
                            // đúng ở đây.
                            <tr key={index}>
                              <td className="col-stt">{index + 1}</td>
                              <td>{sample.name}</td>
                              <td>{sample.state}</td>
                              <td>{sample.solvent}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
