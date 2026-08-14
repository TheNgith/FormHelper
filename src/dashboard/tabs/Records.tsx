import { useMemo, useState } from 'react';

import { validateForm } from '../../lib/schema';
import AddRecordForm, { referenceFor } from '../components/AddRecordForm';
import RecordTable from '../components/RecordTable';
import {
  type SortOrder,
  type SubmissionRecord,
  availableYears,
  filterByPeriod,
  sortRecords,
} from '../lib/records';

/**
 * Tab bản ghi: sắp xếp, lọc theo năm/tháng, xóa theo ô chọn, nhập tay một đơn.
 *
 * Không sửa được đơn nào — đó là quyết định đã chốt, và `allow update` trong
 * firestore.rules vẫn đóng để canh nó.
 */

const MONTHS = [
  ['01', 'January'],
  ['02', 'February'],
  ['03', 'March'],
  ['04', 'April'],
  ['05', 'May'],
  ['06', 'June'],
  ['07', 'July'],
  ['08', 'August'],
  ['09', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December'],
] as const;

type Props = {
  records: SubmissionRecord[];
  onDelete: (maHoSoList: string[]) => Promise<void>;
  onAdd: (values: ReturnType<typeof validateForm>, maHoSo: string) => Promise<void>;
};

export default function Records({ records, onDelete, onAdd }: Props) {
  const [order, setOrder] = useState<SortOrder>('newest');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const years = useMemo(() => availableYears(records), [records]);

  const visible = useMemo(
    () => sortRecords(filterByPeriod(records, { year, month }), order),
    [records, year, month, order],
  );

  /**
   * Chỉ những dòng **đang hiện** mới bị xóa.
   *
   * Ô chọn sống lâu hơn bộ lọc: chọn vài dòng, đổi sang năm khác, rồi bấm xóa
   * — nếu đọc thẳng `selected` thì lệnh xóa quét luôn những đơn đã trôi khỏi
   * màn hình. Đó là chỗ dễ mất dữ liệu nhất trong cả trang, và nó không hoàn
   * lại được. Giao nhau với danh sách đang hiện làm cho con số trên nút, con
   * số trong hộp xác nhận và thứ thật sự bị xóa luôn là *một*.
   */
  const targets = useMemo(
    () => visible.map((record) => record.maHoSo).filter((id) => selected.has(id)),
    [visible, selected],
  );

  function toggle(maHoSo: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(maHoSo)) next.delete(maHoSo);
      else next.add(maHoSo);
      return next;
    });
  }

  function toggleAll(ids: string[], select: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function handleDelete() {
    const ids = targets;
    if (ids.length === 0) return;

    // Hộp thoại này là *toàn bộ* lớp chắn: không có xóa mềm, không có bản sao
    // lưu, không có nút hoàn tác. Nên nó nói ra con số chính xác chứ không
    // hỏi một câu chung chung.
    const confirmed = window.confirm(
      `Permanently delete ${ids.length} ${ids.length === 1 ? 'record' : 'records'}?\n\n` +
        'This cannot be undone. There is no backup and no soft delete. ' +
        'Run `npm run export:csv` first if you want a copy.',
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    try {
      await onDelete(ids);
      setSelected(new Set());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `Delete failed: ${cause.message}`
          : 'Delete failed. Some records may already be gone — reload to see the current state.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(result: ReturnType<typeof validateForm>) {
    if (!result.ok) {
      setError('Some fields are not valid yet.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onAdd(result, referenceFor(result.values.date));
      setAdding(false);
    } catch (cause) {
      setError(cause instanceof Error ? `Save failed: ${cause.message}` : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="filter-bar">
        <div className="field">
          <label htmlFor="records-order">Sort</label>
          <select
            id="records-order"
            value={order}
            onChange={(e) => setOrder(e.target.value as SortOrder)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="records-year">Year</label>
          <select id="records-year" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All years</option>
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="records-month">Month</label>
          <select id="records-month" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {MONTHS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <p className="filter-summary">
          {visible.length} of {records.length}
        </p>

        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setAdding((prev) => !prev)}
            disabled={busy}
          >
            {adding ? 'Close form' : 'Add record'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-danger-ghost"
            onClick={() => void handleDelete()}
            disabled={busy || targets.length === 0}
          >
            {busy && <span className="spinner" aria-hidden="true" />}
            Delete {targets.length > 0 ? `(${targets.length})` : ''}
          </button>
        </div>
      </div>

      {error && (
        <div className="notice notice-danger" role="alert">
          <span>{error}</span>
        </div>
      )}

      {adding && (
        <AddRecordForm
          onSubmit={(result) => void handleAdd(result)}
          onCancel={() => setAdding(false)}
          busy={busy}
          error={null}
        />
      )}

      <RecordTable
        records={visible}
        selection={{ selected, onToggle: toggle, onToggleAll: toggleAll }}
        emptyMessage="No submissions match this filter."
      />
    </>
  );
}
