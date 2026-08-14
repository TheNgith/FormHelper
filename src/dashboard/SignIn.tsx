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
      const code = (cause as { code?: string }).code ?? '';
      setError(
        // Người dùng tự đóng cửa sổ thì không phải lỗi, chỉ là đổi ý.
        code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
          ? 'Sign-in was cancelled.'
          : code === 'auth/popup-blocked'
            ? 'The browser blocked the sign-in popup. Allow popups for this site and try again.'
            : `Sign-in failed${code ? ` (${code})` : ''}.`,
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
