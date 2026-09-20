import { useState } from 'react';
import { initialAuthError, useAuth } from '../lib/auth';
import { Footer, Logo } from '../components/ui';

/** شعار Google الرسمي (ألوان العلامة) — للتعريف بالزر فقط */
function GoogleG() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialAuthError ?? '');

  async function go() {
    if (busy) return;
    setBusy(true);
    setError('');
    const r = await signInWithGoogle();
    // عند النجاح ينتقل المتصفح إلى Google؛ لا نعيد الزر إلا عند الفشل
    if (!r.ok) {
      setBusy(false);
      setError(r.error);
    }
  }

  return (
    <div className="login">
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <main className="login-in">
        <div className="login-brand">
          <Logo size={104} subtitle />
        </div>

        <div className="stack login-form">
          <h2 className="disp login-hello">أهلًا بك</h2>
          {error && <p className="input-error center" role="alert">{error}</p>}
          <button className="btn btn-primary btn-lg btn-block google-btn" type="button" disabled={busy} onClick={() => void go()}>
            <span className="google-g"><GoogleG /></span>
            {busy ? 'جارٍ التحويل إلى Google…' : 'الدخول باستخدام Google'}
          </button>
          <p className="muted login-note">الدخول لحساب Google المصرّح له فقط. نطلب الاسم والبريد للتعريف بحسابك، ولا نقرأ بريدك ولا نصل إلى أي شيء آخر في حسابك.</p>
        </div>
      </main>
      <Footer short />
    </div>
  );
}
