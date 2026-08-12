import { useCallback, useEffect, useRef } from 'react';

import type { ErrorMap, SampleDraft } from '../lib/schema';
import { emptySample, newRowId } from '../lib/schema';
import SampleRowEditor from './SampleRowEditor';

type Props = {
  samples: SampleDraft[];
  errors: ErrorMap;
  onChange: (samples: SampleDraft[]) => void;
};

export default function SampleList({ samples, errors, onChange }: Props) {
  // Sau khi thêm hoặc nhân đôi một dòng, đưa con trỏ vào ô "Tên mẫu" của
  // dòng mới để nhập liên tục bằng bàn phím mà không phải rê chuột.
  const focusIndex = useRef<number | null>(null);

  useEffect(() => {
    if (focusIndex.current === null) return;
    const target = document.getElementById(`samples.${focusIndex.current}-name`);
    focusIndex.current = null;
    if (target instanceof HTMLInputElement) {
      target.focus();
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [samples.length]);

  const patchRow = useCallback(
    (index: number, patch: Partial<SampleDraft>) => {
      onChange(samples.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    },
    [samples, onChange],
  );

  const addRow = useCallback(() => {
    focusIndex.current = samples.length;
    onChange([...samples, emptySample()]);
  }, [samples, onChange]);

  const duplicateRow = useCallback(
    (index: number) => {
      const copy = [...samples];
      copy.splice(index + 1, 0, { ...samples[index], id: newRowId() });
      focusIndex.current = index + 1;
      onChange(copy);
    },
    [samples, onChange],
  );

  const removeRow = useCallback(
    (index: number) => {
      if (samples.length === 1) return;
      onChange(samples.filter((_, i) => i !== index));
    },
    [samples, onChange],
  );

  const move = useCallback(
    (index: number, delta: number) => {
      const target = index + delta;
      if (target < 0 || target >= samples.length) return;
      const copy = [...samples];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      onChange(copy);
    },
    [samples, onChange],
  );

  // Lỗi ở cấp mảng (ví dụ "phải có ít nhất một mẫu"), không thuộc dòng nào.
  const listError = errors['samples'];

  return (
    <>
      {listError && (
        <div className="notice notice-danger" role="alert">
          <span>{listError}</span>
        </div>
      )}

      <ol className="sample-list">
        {samples.map((sample, index) => (
          <SampleRowEditor
            key={sample.id}
            index={index}
            total={samples.length}
            value={sample}
            errors={errors}
            onChange={(patch) => patchRow(index, patch)}
            onRemove={() => removeRow(index)}
            onDuplicate={() => duplicateRow(index)}
            onMoveUp={() => move(index, -1)}
            onMoveDown={() => move(index, 1)}
          />
        ))}
      </ol>

      {/* Số mẫu nay nằm dưới tiêu đề mục, cùng chỗ với "Các mẫu đo" — xem
          FormScreen. Ở đây chỉ còn đúng nút thêm dòng. */}
      <div className="sample-add">
        <button type="button" className="btn btn-secondary" onClick={addRow}>
          + Thêm mẫu
        </button>
      </div>
    </>
  );
}
