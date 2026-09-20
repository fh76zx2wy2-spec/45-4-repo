import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { Footer, Logo } from '../components/ui';
import { Icon } from '../components/Icon';

const CODE_LEN = 6;

export default function Login() {
  const { sendCode, verifyCode } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cool, setCool] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cool <= 0) return;
    const t = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cool]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  async function submitEmail(e?: FormEvent) {
    e?.preventDefault();
    if (!validEmail || busy) return;
    setBusy(true);
    setError('');
    const r = await sendCode(email);
    setBusy(false);
    if (r.ok) {
      setStep('code');
      setCool(45);
    } else setError(r.error);
  }

  async function submitCode(value = code, e?: FormEvent) {
    e?.preventDefault();
    if (value.length < CODE_LEN || busy) return;
    setBusy(true);
    setError('');
    const r = await verifyCode(email, value);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      setCode('');
      codeRef.current?.focus();
    }
    // عند النجاح يتولّى AuthProvider نقلك تلقائيًا
  }

  return (
    <div className="login">
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <main className="login-in">
        <div className="login-brand">
          <Logo size={104} subtitle />
        </div>

        {step === 'email' ? (
          <form className="stack login-form" onSubmit={submitEmail}>
            <h2 className="disp login-hello">أهلًا بك</h2>
            <div className="field">
              <label htmlFor="email">البريد الإلكتروني</label>
              <input
                id="email"
                className="input ltr"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
              />
            </div>
            {error && <p className="input-error" role="alert">{error}</p>}
            <button className="btn btn-primary btn-lg btn-block" disabled={!validEmail || busy} type="submit">
              {busy ? 'جارٍ الإرسال…' : 'دخول'}
            </button>
            <p className="muted login-note">سنرسل إلى بريدك رمزًا من 6 أرقام للتحقق. لا حاجة لكلمة مرور.</p>
          </form>
        ) : (
          <form className="stack login-form" onSubmit={(e) => submitCode(code, e)}>
            <h2 className="disp login-hello">أدخل الرمز</h2>
            <p className="muted center">أرسلنا رمزًا إلى <span className="ltr" dir="ltr" style={{ color: 'var(--ink)', fontWeight: 700 }}>{email}</span></p>
            <input
              ref={codeRef}
              className="input input-num code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={8}
              placeholder="• • • • • •"
              value={code}
              aria-label="رمز التحقق"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                setCode(v);
                if (v.length === CODE_LEN) void submitCode(v);
              }}
            />
            {error && <p className="input-error center" role="alert">{error}</p>}
            <button className="btn btn-primary btn-lg btn-block" disabled={code.length < CODE_LEN || busy} type="submit">
              {busy ? 'جارٍ التحقق…' : 'دخول'}
            </button>
            <div className="row-between">
              <button type="button" className="link-btn" onClick={() => { setStep('email'); setCode(''); setError(''); }}>
                <Icon name="edit" size={18} /> تغيير البريد
              </button>
              <button type="button" className="link-btn" disabled={cool > 0 || busy} onClick={() => submitEmail()} style={{ opacity: cool > 0 ? 0.5 : 1 }}>
                {cool > 0 ? `إعادة الإرسال بعد ${cool} ث` : 'إعادة إرسال الرمز'}
              </button>
            </div>
            <p className="muted login-note">يمكنك أيضًا الضغط على الرابط في الرسالة إن وصلك رابط بدل الرمز.</p>
          </form>
        )}
      </main>
      <Footer short />
    </div>
  );
}
