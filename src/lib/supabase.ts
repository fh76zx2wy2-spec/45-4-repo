import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * إعدادات Supabase تأتي من متغيرات البيئة (لا أسرار هنا):
 *  - VITE_SUPABASE_URL
 *  - VITE_SUPABASE_ANON_KEY  ← المفتاح العام (anon / publishable) فقط، وهو آمن للواجهة بفضل RLS.
 * لا نضع Service Role Key في الواجهة أبدًا.
 */
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/**
 * إن عاد المستخدم من Google/Supabase بخطأ (مثل رفض حساب غير المالك) يكون في عنوان الصفحة.
 * نلتقطه قبل أن ينشئ supabase-js العميل ثم ننظّف العنوان.
 */
export const urlAuthError: string | null = (() => {
  try {
    const u = new URL(window.location.href);
    const h = new URLSearchParams(u.hash.replace(/^#/, ''));
    const g = (k: string) => u.searchParams.get(k) ?? h.get(k);
    const err = g('error');
    const desc = g('error_description');
    if (!err && !desc) return null;
    window.history.replaceState({}, '', u.pathname);
    return `${err ?? ''} ${g('error_code') ?? ''} ${desc ?? ''}`;
  } catch {
    return null;
  }
})();

export const supabaseConfigured = Boolean(url && anon);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // PKCE: أأمن لتسجيل الدخول عبر OAuth ويعمل مع جلسة المتصفح المحفوظة
        flowType: 'pkce',
        storageKey: '45-4-auth',
      },
    })
  : null;
