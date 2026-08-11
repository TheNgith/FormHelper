import { useCallback, useEffect, useRef, useState } from 'react';

import ConfirmationScreen from './screens/ConfirmationScreen';
import FormScreen from './screens/FormScreen';
import ReviewScreen from './screens/ReviewScreen';
import { EQUIPMENT } from './lib/constants';
import { generateMaHoSo } from './lib/maHoSo';
import type { FormDraft, FormValues } from './lib/schema';
import { emptyForm } from './lib/schema';
import { clearSubmitted, loadSubmitted, saveSubmitted } from './lib/session';
import { SubmitError, buildPayload, submitToSheet } from './lib/sheets';

type Screen = 'form' | 'review' | 'done';

const STEP_LABELS: Record<Screen, string> = {
  form: 'Điền đơn',
  review: 'Xem lại',
  done: 'Hoàn tất',
};

const STEP_ORDER: Screen[] = ['form', 'review', 'done'];

export default function App() {
  // Đọc sessionStorage đúng một lần khi khởi tạo, không đọc lại mỗi lần vẽ.
  const [restored] = useState(loadSubmitted);

  const [screen, setScreen] = useState<Screen>(restored ? 'done' : 'form');
  const [draft, setDraft] = useState<FormDraft>(emptyForm);
  const [reviewed, setReviewed] = useState<FormValues | null>(restored?.values ?? null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /** Ô bẫy bot, luôn rỗng nếu người điền là người thật. */
  const [honeypot, setHoneypot] = useState('');

  /** Nội dung đúng như lúc gửi đi — màn hình xác nhận đọc từ đây chứ không
   *  đọc lại biểu mẫu, để bản in luôn khớp với dòng đã ghi vào bảng. */
  const [submitted, setSubmitted] = useState(restored);

  /**
   * Mã hồ sơ sinh một lần duy nhất, ở lần bấm "Xác nhận và gửi" đầu tiên.
   * Gửi lại sau khi lỗi phải dùng lại đúng mã cũ: nếu lần trước thực ra đã
   * ghi được mà chỉ mất phản hồi, thì máy chủ nhận ra mã trùng và bỏ qua,
   * thay vì tạo thêm một dòng nữa dưới mã khác.
   */
  const maHoSoRef = useRef<string | null>(null);

  // Trình xử lý popstate được đăng ký một lần nên không thấy được state mới;
  // đọc qua ref để luôn lấy giá trị hiện tại.
  const submittedRef = useRef(submitted);
  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  const go = useCallback((next: Screen) => {
    setScreen(next);
    window.history.pushState({ screen: next }, '');
    window.scrollTo({ top: 0 });
  }, []);

  // Nút quay lại của trình duyệt. Đơn đã gửi rồi thì mọi thao tác lùi đều
  // giữ nguyên ở màn hình xác nhận — màn hình xem lại lúc đó vẫn còn nút
  // "Xác nhận và gửi", quay về đó chỉ khiến sinh viên bấm gửi thêm lần nữa.
  useEffect(() => {
    window.history.replaceState({ screen: restored ? 'done' : 'form' }, '');

    function onPopState(event: PopStateEvent) {
      const target = (event.state?.screen as Screen | undefined) ?? 'form';

      if (submittedRef.current) {
        if (target !== 'done') window.history.pushState({ screen: 'done' }, '');
        setScreen('done');
      } else {
        setScreen(target);
      }
      window.scrollTo({ top: 0 });
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [restored]);

  const patchDraft = useCallback((patch: Partial<FormDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleValid = useCallback(
    (values: FormValues) => {
      setReviewed(values);
      setSubmitError(null);
      go('review');
    },
    [go],
  );

  const handleEdit = useCallback(() => {
    setSubmitError(null);
    go('form');
  }, [go]);

  // Đang ở màn hình nhập liệu sẵn rồi nên không thêm mục lịch sử mới.
  const handleReset = useCallback(() => {
    setDraft(emptyForm());
    setReviewed(null);
    setSubmitError(null);
    window.scrollTo({ top: 0 });
  }, []);

  const handleRestart = useCallback(() => {
    clearSubmitted();
    maHoSoRef.current = null;
    setSubmitted(null);
    setDraft(emptyForm());
    setReviewed(null);
    setSubmitError(null);
    go('form');
  }, [go]);

  const handleConfirm = useCallback(async () => {
    if (!reviewed || submitting) return;

    maHoSoRef.current ??= generateMaHoSo(reviewed.date);
    const maHoSo = maHoSoRef.current;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitToSheet(buildPayload(reviewed, maHoSo, honeypot));

      const record = { maHoSo, values: reviewed };
      saveSubmitted(record);
      setSubmitted(record);
      submittedRef.current = record;
      go('done');
    } catch (error) {
      // Theo quyết định của bộ môn: ghi không được thì dừng ở màn hình xem
      // lại, không cho đi tiếp. Bản in và dòng trong bảng nhờ vậy không bao
      // giờ lệch nhau.
      setSubmitError(
        error instanceof SubmitError
          ? error.message
          : 'Có lỗi không xác định. Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [reviewed, submitting, go]);

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
          honeypot={honeypot}
          onChange={patchDraft}
          onHoneypotChange={setHoneypot}
          onValid={handleValid}
          onReset={handleReset}
        />
      )}

      {screen === 'review' && reviewed && (
        <ReviewScreen
          values={reviewed}
          submitting={submitting}
          error={submitError}
          onEdit={handleEdit}
          onConfirm={() => void handleConfirm()}
        />
      )}

      {screen === 'done' && submitted && (
        <ConfirmationScreen
          values={submitted.values}
          maHoSo={submitted.maHoSo}
          onRestart={handleRestart}
        />
      )}
    </main>
  );
}
