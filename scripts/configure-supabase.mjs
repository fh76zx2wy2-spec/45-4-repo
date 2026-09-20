#!/usr/bin/env node
/**
 * يهيّئ مشروع Supabase كاملًا عبر Management API:
 *   1) يطبّق ملفات supabase/migrations بالترتيب (مرة واحدة لكل ملف، ولا يمسح بيانات).
 *   2) يضبط المصادقة: رمز من 6 خانات + قالب البريد ({{ .Token }}) + عنوان الموقع.
 *
 * الاستخدام:
 *   SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=abcdxyz SITE_URL=https://your-app.vercel.app \
 *     node scripts/configure-supabase.mjs
 *
 * الرمز الشخصي (Personal Access Token) يبقى في جهازك فقط — لا يدخل التطبيق ولا يُرفع.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
const site = process.env.SITE_URL;
if (!token || !ref || !site) {
  console.error('المطلوب: SUPABASE_ACCESS_TOKEN و SUPABASE_PROJECT_REF و SITE_URL');
  process.exit(1);
}
const api = 'https://api.supabase.com/v1/projects/' + ref;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function call(path, method, body) {
  const r = await fetch(api + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : null;
}
const sql = (query) => call('/database/query', 'POST', { query });

// 1) الترحيلات — تُسجَّل في جدول public._migrations لتجنّب إعادة التطبيق
await sql('create table if not exists public._migrations (name text primary key, applied_at timestamptz default now()); alter table public._migrations enable row level security;');
const applied = new Set((await sql('select name from public._migrations')).map((r) => r.name));
const files = readdirSync(join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
for (const f of files) {
  if (applied.has(f)) { console.log('· تم سابقًا:', f); continue; }
  const body = readFileSync(join(root, 'supabase/migrations', f), 'utf8');
  await sql(body + `\ninsert into public._migrations(name) values ('${f}');`);
  console.log('✓ طُبّق:', f);
}

// 2) المصادقة
const otp = readFileSync(join(root, 'supabase/templates/otp.html'), 'utf8');
await call('/config/auth', 'PATCH', {
  site_url: site,
  uri_allow_list: [site, site.replace(/\/$/, '') + '/**'].join(','),
  mailer_otp_length: 6,
  mailer_otp_exp: 900,
  mailer_autoconfirm: false,
  external_email_enabled: true,
  mailer_subjects_magic_link: 'رمز الدخول إلى 45/4',
  mailer_templates_magic_link_content: otp,
  mailer_subjects_confirmation: 'رمز الدخول إلى 45/4',
  mailer_templates_confirmation_content: otp,
});
console.log('✓ ضُبطت المصادقة (رمز من 6 خانات + قالب البريد).');
console.log('\nأول بريد يسجّل الدخول يصبح المالك؛ أضف غيره لاحقًا:\n  insert into public.allowed_emails(email) values (\'name@example.com\');');
