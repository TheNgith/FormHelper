import { useCallback, useState } from 'react';

import FormScreen from './screens/FormScreen';
import ReviewScreen from './screens/ReviewScreen';
import { EQUIPMENT } from './lib/constants';
import type { FormDraft, FormValues } from './lib/schema';
import { emptyForm } from './lib/schema';

type Screen = 'form' | 'review' | 'done';

const STEP_LABELS: Record<Screen, string> = {
  form: 'Điền đơn',
  review: 'Xem lại',
  done: 'Hoàn tất',
};

const STEP_ORDER: Screen[] = ['form', 'review', 'done'];

export default function App() {
  const [screen, setScreen] = useState<Screen>('form');
  const [draft, setDraft] = useState<FormDraft>(emptyForm);
  const [reviewed, setReviewed] = useState<FormValues | null>(null);

  const patchDraft = useCallback((patch: Partial<FormDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleValid = useCallback((values: FormValues) => {
    setReviewed(values);
    setScreen('review');
    window.scrollTo({ top: 0 });
  }, []);

  const handleEdit = useCallback(() => {
    setScreen('form');
    window.scrollTo({ top: 0 });
  }, []);

  const handleReset = useCallback(() => {
    setDraft(emptyForm());
    setReviewed(null);
    setScreen('form');
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <main className="app">
      <header className="masthead">
        <h1>Đơn xin sử dụng thiết bị</h1>
        <p>{EQUIPMENT} — Bộ môn Hóa Hữu Cơ</p>
      </header>

      <ol className="steps">
        {STEP_ORDER.map((step) => (
          <li
            key={step}
            data-state={
              step === screen
                ? 'current'
                : STEP_ORDER.indexOf(step) < STEP_ORDER.indexOf(screen)
                  ? 'done'
                  : 'todo'
            }
            aria-current={step === screen ? 'step' : undefined}
          >
            {STEP_LABELS[step]}
          </li>
        ))}
      </ol>

      {screen === 'form' && (
        <FormScreen
          values={draft}
          onChange={patchDraft}
          onValid={handleValid}
          onReset={handleReset}
        />
      )}

      {screen === 'review' && reviewed && (
        <ReviewScreen
          values={reviewed}
          submitting={false}
          error={null}
          onEdit={handleEdit}
          onConfirm={() => setScreen('done')}
        />
      )}

      {screen === 'done' && (
        <section className="card">
          <h2>Đã nhận đơn</h2>
          <p className="card-hint">Màn hình xác nhận được hoàn thiện ở bước sau.</p>
        </section>
      )}
    </main>
  );
}
