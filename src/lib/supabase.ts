import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * إعدادات Supabase تأتي من متغيرات البيئة (لا أسرار هنا):
 *  - VITE_SUPABASE_URL
 *  - VITE_SUPABASE_ANON_KEY  ← المفتاح العام (anon / publishable) فقط، وهو آمن للواجهة بفضل RLS.
 * لا نضع Service Role Key في الواجهة أبدًا.
 */
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const supabaseConfigured = Boolean(url && anon);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: '45-4-auth',
      },
    })
  : null;
