import { useState } from 'react';

import { signInWithGoogle } from './lib/adminAuth';

/**
 * Màn hình đăng nhập.
 *
 * Cửa sổ Google **phải** bật lên từ một cú bấm thật. Không có `useEffect` nào
 * tự gọi `signInWithGoogle()` lúc component gắn vào cây: trình duyệt sẽ chặn
 * cửa sổ ấy, và triệu chứng là một trang đứng im không báo gì.
 */
export default function SignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (cause) {
      // Ném ra console *nguyên vẹn* trước khi rút gọn thành một câu.
      //
      // Bản đầu chỉ giữ lại `.code` rồi vứt phần còn lại, và đúng lần hỏng
      // thật đầu tiên thì thứ ném ra lại **không có** `.code` — nên màn hình
      // hiện "Sign-in failed." trống trơn, không ai lần được về nguyên nhân.
      // Một lỗi không đoán trước được là lúc cần *nhiều* thông tin nhất, chứ
      // không phải ít nhất.
      console.error('[dashboard] sign-in failed:', cause);

      const error = cause as { code?: string; name?: string; message?: string };
      const code = error?.code ?? '';

      // Không có `.code` nghĩa là nó không phải FirebaseError — thường là lỗi
      // mạng hoặc CORS (`TypeError: Failed to fetch`). Lúc ấy `name` với
      // `message` là tất cả những gì còn lại, nên đưa thẳng lên màn hình:
      // trang này chỉ hai người dùng, không có ai để mà giấu.
      const detail = code || [error?.name, error?.message].filter(Boolean).join(': ');

      setError(
        // Người dùng tự đóng cửa sổ thì không phải lỗi, chỉ là đổi ý.
        code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
          ? 'Sign-in was cancelled.'
          : code === 'auth/popup-blocked'
            ? 'The browser blocked the sign-in popup. Allow popups for this site and try again.'
            : `Sign-in failed${detail ? ` — ${detail}` : ''}. See the browser console for the full error.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="signin">
      <p className="signin-lead">
        This page is for the department. Sign in with the Google account on the
        allowlist.
      </p>

      {error && (
        <div className="notice notice-danger" role="alert">
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void handleClick()}
        disabled={busy}
      >
        {busy && <span className="spinner" aria-hidden="true" />}
        {busy ? 'Signing in…' : 'Sign in with Google'}
      </button>
    </div>
  );
}
