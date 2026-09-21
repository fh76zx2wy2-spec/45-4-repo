/**
 * المصادقة عبر Google OAuth فقط (Supabase Auth). لا بريد ولا رمز.
 * نطلب النطاقات الأساسية فقط (openid email profile) — لا صلاحية لقراءة البريد أو أي خدمة Google أخرى.
 * الجلسة تُحفظ في الجهاز وتُجدَّد تلقائيًا، فيدخل الموقع مباشرة في المرات التالية.
 * حصر الدخول بالحسابات المصرّح لها يتم في قاعدة البيانات (انظر supabase/migrations/*google_owner_lock.sql).
 * إن انقطع الإنترنت وكانت الجلسة محفوظة، يعمل التطبيق بالبيانات المحلية.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase, supabaseConfigured, urlAuthError } from './supabase';
import { clearStore, initStore } from './store';
import { startSyncEngine, syncNow } from './sync';
import { setProgramForEmail } from '../data/program';
import { setNutritionForEmail } from '../data/nutrition';

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
  /** يحوّل المتصفح إلى Google؛ لا يعود إلا عند الفشل */
  signInWithGoogle: () => Promise<{ ok: true } | { ok: false; error: string }>;
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

const DENIED = 'هذا الحساب غير مسموح له بالدخول إلى 45/4. استخدم أحد حسابات Google المصرّح لها.';

export function arabicAuthError(msg: string): string {
  const m = msg.toLowerCase().replace(/\+/g, ' ');
  // المشغّل في قاعدة البيانات يرفض إنشاء أي حساب غير موجود في القائمة المسموحة → Supabase يعيد «Database error saving new user»
  if (m.includes('database error') || m.includes('signup_not_allowed') || m.includes('signups not allowed') || m.includes('not allowed') || m.includes('unexpected_failure')) return DENIED;
  if (m.includes('access_denied') || m.includes('cancel')) return 'أُلغي الدخول. اضغط الزر للمحاولة مرة أخرى.';
  if (m.includes('rate limit') || m.includes('too many')) return 'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.';
  if (m.includes('provider') && m.includes('not')) return 'الدخول عبر Google غير مفعّل بعد في إعدادات Supabase.';
  if (m.includes('fetch') || m.includes('network')) return 'تعذّر الاتصال بالإنترنت. حاول مرة أخرى.';
  return 'تعذّر تسجيل الدخول. حاول مرة أخرى.';
}

/** رسالة الرفض العائدة من Google/Supabase في العنوان (إن وُجدت) */
export const initialAuthError: string | null = urlAuthError ? arabicAuthError(urlAuthError) : null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [offlineSession, setOfflineSession] = useState(false);
  const stopSync = useRef<null | (() => void)>(null);

  const enter = useCallback((u: AuthUser, offline = false) => {
    setProgramForEmail(u.email);
    setNutritionForEmail(u.email);
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

  const signInWithGoogle = useCallback<AuthCtx['signInWithGoogle']>(async () => {
    if (!supabase) return { ok: false, error: 'الخدمة غير مهيأة بعد.' };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/',
        scopes: 'openid email profile', // لا Gmail ولا أي صلاحية إضافية
        queryParams: { prompt: 'select_account' },
      },
    });
    return error ? { ok: false, error: arabicAuthError(error.message) } : { ok: true };
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
    () => ({ status, user, configured: supabaseConfigured, offlineSession, signInWithGoogle, signOut }),
    [status, user, offlineSession, signInWithGoogle, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('AuthProvider مفقود');
  return c;
}
