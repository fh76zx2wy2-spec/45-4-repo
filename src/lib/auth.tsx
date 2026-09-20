/**
 * المصادقة عبر Supabase Auth بالبريد الإلكتروني (رمز OTP أو رابط سحري).
 * الجلسة تُحفظ في الجهاز وتُجدَّد تلقائيًا، فيدخل الموقع مباشرة في المرات التالية.
 * إن انقطع الإنترنت وكانت الجلسة محفوظة، يعمل التطبيق بالبيانات المحلية.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase, supabaseConfigured } from './supabase';
import { clearStore, initStore } from './store';
import { startSyncEngine, syncNow } from './sync';

export interface AuthUser {
  id: string;
  email: string;
}

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthCtx {
  status: Status;
  user: AuthUser | null;
  configured: boolean;
  offlineSession: boolean;
  sendCode: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  verifyCode: (email: string, code: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const LAST_USER = '45-4:last-user';

function readLastUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(LAST_USER);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function arabicAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.';
  if (m.includes('expired') || m.includes('invalid') || m.includes('otp')) return 'الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزًا جديدًا.';
  if (m.includes('signups not allowed') || m.includes('not allowed') || m.includes('database error')) return 'هذا البريد غير مسموح له بالدخول.';
  if (m.includes('email')) return 'تأكد من كتابة البريد الإلكتروني بشكل صحيح.';
  if (m.includes('fetch') || m.includes('network')) return 'تعذّر الاتصال بالإنترنت. حاول مرة أخرى.';
  return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [offlineSession, setOfflineSession] = useState(false);
  const stopSync = useRef<null | (() => void)>(null);

  const enter = useCallback((u: AuthUser, offline = false) => {
    try {
      localStorage.setItem(LAST_USER, JSON.stringify(u));
    } catch {
      /* ignore */
    }
    initStore(u.id);
    setUser(u);
    setOfflineSession(offline);
    setStatus('signedIn');
    if (!stopSync.current) stopSync.current = startSyncEngine();
    else void syncNow();
  }, []);

  useEffect(() => {
    let alive = true;
    if (!supabase) {
      setStatus('signedOut');
      return;
    }
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        const s = data.session;
        if (s?.user?.email) {
          enter({ id: s.user.id, email: s.user.email });
          return;
        }
      } catch {
        /* نكمل للاحتياط دون اتصال */
      }
      // دون اتصال ولدينا مستخدم سابق: نفتح ببياناته المحلية
      const last = readLastUser();
      if (last && typeof navigator !== 'undefined' && navigator.onLine === false && alive) {
        enter(last, true);
        return;
      }
      if (alive) setStatus('signedOut');
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (session?.user?.email && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        enter({ id: session.user.id, email: session.user.email });
      } else if (event === 'SIGNED_OUT') {
        stopSync.current?.();
        stopSync.current = null;
        setUser(null);
        setStatus('signedOut');
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
      stopSync.current?.();
      stopSync.current = null;
    };
  }, [enter]);

  const sendCode = useCallback<AuthCtx['sendCode']>(async (email) => {
    if (!supabase) return { ok: false, error: 'الخدمة غير مهيأة بعد.' };
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    return error ? { ok: false, error: arabicAuthError(error.message) } : { ok: true };
  }, []);

  const verifyCode = useCallback<AuthCtx['verifyCode']>(async (email, code) => {
    if (!supabase) return { ok: false, error: 'الخدمة غير مهيأة بعد.' };
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    if (error || !data.session) return { ok: false, error: arabicAuthError(error?.message ?? 'invalid') };
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    const id = user?.id;
    try {
      await Promise.race([syncNow(), new Promise((r) => setTimeout(r, 3500))]);
    } catch {
      /* ignore */
    }
    try {
      await supabase?.auth.signOut();
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(LAST_USER);
    } catch {
      /* ignore */
    }
    stopSync.current?.();
    stopSync.current = null;
    clearStore(id);
    setUser(null);
    setStatus('signedOut');
  }, [user]);

  const value = useMemo<AuthCtx>(
    () => ({ status, user, configured: supabaseConfigured, offlineSession, sendCode, verifyCode, signOut }),
    [status, user, offlineSession, sendCode, verifyCode, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('AuthProvider مفقود');
  return c;
}
