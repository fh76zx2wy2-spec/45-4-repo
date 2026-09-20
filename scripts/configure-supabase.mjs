#!/usr/bin/env node
/**
 * يهيّئ مشروع Supabase عبر Management API:
 *   1) يطبّق supabase/migrations بالترتيب (مرة واحدة لكل ملف، بلا حذف بيانات).
 *   2) يعيّن المالك: حساب Google الوحيد المسموح له بالدخول (OWNER_EMAIL).
 *   3) يضبط المصادقة: تفعيل Google، تعطيل البريد/الرمز والدخول المجهول، عنوان الموقع.
 *
 * الاستخدام:
 *   SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=abcdxyz \
 *   SITE_URL=https://your-app.vercel.app OWNER_EMAIL=you@gmail.com \
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... \
 *     node scripts/configure-supabase.mjs
 *
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET اختياريان: إن حذفتهما فعّل Google يدويًا من
 * Supabase → Authentication → Providers → Google.
 * هذه المتغيرات تبقى في جهازك فقط: لا تبدأ بـ VITE_ ولا تدخل حزمة التطبيق ولا تُرفع إلى Git.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: ref, SITE_URL: siteRaw, OWNER_EMAIL: ownerRaw, GOOGLE_CLIENT_ID: gid, GOOGLE_CLIENT_SECRET: gsecret } = process.env;
if (!token || !ref || !siteRaw || !ownerRaw) {
  console.error('المطلوب: SUPABASE_ACCESS_TOKEN و SUPABASE_PROJECT_REF و SITE_URL و OWNER_EMAIL');
  process.exit(1);
}
const owner = ownerRaw.trim().toLowerCase();
if (!/^[^@\s'";\\]+@[^@\s'";\\]+\.[^@\s'";\\]+$/.test(owner)) {
  console.error('OWNER_EMAIL غير صالح');
  process.exit(1);
}
const site = siteRaw.trim().replace(/\/$/, '');
const api = 'https://api.supabase.com/v1/projects/' + ref;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function call(path, method, body) {
  const r = await fetch(api + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : null;
}
const sql = (query) => call('/database/query', 'POST', { query });

// 1) الترحيلات — تُسجَّل في public._migrations لتجنّب إعادة التطبيق
await sql('create table if not exists public._migrations (name text primary key, applied_at timestamptz default now()); alter table public._migrations enable row level security;');
const applied = new Set((await sql('select name from public._migrations')).map((r) => r.name));
const files = readdirSync(join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
for (const f of files) {
  if (applied.has(f)) { console.log('· تم سابقًا:', f); continue; }
  const body = readFileSync(join(root, 'supabase/migrations', f), 'utf8');
  await sql(body + `\ninsert into public._migrations(name) values ('${f}');`);
  console.log('✓ طُبّق:', f);
}

// 2) المالك — قبل تفعيل Google كي لا تُقبل أي محاولة دخول قبل تحديده
await sql(`select public.set_owner_email('${owner}')`);
const rows = await sql('select email from public.allowed_emails');
console.log('✓ المالك المسموح له:', rows.map((r) => r.email).join(', '));

// 3) المصادقة
const auth = {
  site_url: site,
  uri_allow_list: [site, site + '/**'].join(','),
  disable_signup: false, // إنشاء الحساب لازم لأول دخول؛ يحصره مشغّل قاعدة البيانات بالمالك فقط
  external_email_enabled: false,
  external_phone_enabled: false,
  external_anonymous_users_enabled: false,
  external_google_enabled: true,
};
if (gid && gsecret) {
  auth.external_google_client_id = gid;
  auth.external_google_secret = gsecret;
} else {
  console.log('! لم تُمرَّر بيانات Google OAuth؛ أدخلها من Authentication → Providers → Google.');
}
await call('/config/auth', 'PATCH', auth);
console.log('✓ ضُبطت المصادقة (Google فقط).');
console.log(`\nأضف هذا العنوان إلى Authorized redirect URIs في Google Cloud:\n  https://${ref}.supabase.co/auth/v1/callback`);
