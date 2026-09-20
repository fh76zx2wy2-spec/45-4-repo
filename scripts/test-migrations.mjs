/**
 * يختبر ملفات الترحيل وسياسات RLS على PostgreSQL حقيقي (PGlite) دون أي حساب خارجي.
 * تشغيل:  npm run db:test
 */
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'supabase', 'migrations');

let failed = 0;
const ok = (name) => console.log(`  ✓ ${name}`);
const bad = (name, extra = '') => {
  failed++;
  console.log(`  ✗ ${name} ${extra}`);
};
async function expectThrows(name, fn, match) {
  try {
    await fn();
    bad(name, '(لم يُرفض)');
  } catch (e) {
    if (match && !String(e.message).includes(match)) bad(name, `رسالة مختلفة: ${e.message}`);
    else ok(name);
  }
}

const db = new PGlite();

// ---- بيئة تحاكي Supabase: مخطط auth ودور anon/authenticated و auth.uid() ----
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);

const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
console.log('تطبيق الترحيلات:');
for (const f of files) {
  await db.exec(readFileSync(join(dir, f), 'utf8'));
  ok(f);
}
console.log('إعادة تطبيقها (يجب أن تنجح بلا أخطاء وبلا فقدان بيانات):');

// ---- مستخدمان ----
const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
// القفل: أول مستخدم يُقبل، والثاني يُرفض حتى يُدرج بريده
await db.query(`insert into auth.users (id, email) values ($1, 'a@example.com')`, [A]);
ok('أول مستخدم مقبول');
await expectThrows('مستخدم ثانٍ غير مسموح يُرفض', () => db.query(`insert into auth.users (id, email) values ($1, 'b@example.com')`, [B]), 'signup_not_allowed');
await db.query(`insert into public.allowed_emails (email) values ('b@example.com')`);
await db.query(`insert into auth.users (id, email) values ($1, 'b@example.com')`, [B]);
ok('مستخدم ثانٍ بعد إدراج بريده في القائمة المسموحة');
await expectThrows('بريد بأحرف كبيرة في القائمة يُرفض (email = lower(email))', () => db.query(`insert into public.allowed_emails (email) values ('C@Example.com')`));

async function as(uid, fn) {
  await db.exec('begin');
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid ?? '']);
    await db.exec(uid ? 'set local role authenticated' : 'set local role anon');
    const r = await fn();
    await db.exec('commit');
    return r;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}

const S1 = 'aaaaaaaa-0000-0000-0000-000000000001';
const E1 = 'aaaaaaaa-0000-0000-0000-0000000000e1';

console.log('RLS:');
await as(A, async () => {
  await db.query(
    `insert into public.workout_sessions (id, date, workout_day, program_week, duration_seconds, session_type, difficulty, notes)
     values ($1, '2026-09-19', 1, 1, 2700, 'normal', 'good', 'ملاحظة')`,
    [S1],
  );
  await db.query(
    `insert into public.workout_session_exercises (id, session_id, user_id, exercise_id, position, status, sets_planned, sets_done, reps, rest_seconds, weight_kg)
     values ($1, $2, $3, 'chest-press', 1, 'done', 3, 3, '12', 60, 25)`,
    [E1, S1, A],
  );
  await db.query(`insert into public.weekly_measurements (id, week_start, measured_on, weight_kg) values (gen_random_uuid(), '2026-09-13', '2026-09-19', 90.5)`);
  await db.query(`insert into public.saved_audio (id, title, url, kind, section) values (gen_random_uuid(), 'قائمة', 'https://youtube.com/playlist?list=x', 'playlist', 'saved')`);
  await db.query(`insert into public.daily_logs (date, water_cups) values ('2026-09-19', 5)`);
  await db.query(`insert into public.user_settings (user_id, theme) values ($1, 'dark')`, [A]);
  await db.query(`insert into public.profiles (id, display_name) values ($1, 'زياد')`, [A]);
});
ok('المستخدم A يكتب في كل جداوله');

const cnt = async (uid, table) => (await as(uid, () => db.query(`select count(*)::int as n from public.${table}`))).rows[0].n;
for (const t of ['workout_sessions', 'workout_session_exercises', 'weekly_measurements', 'saved_audio', 'daily_logs', 'user_settings', 'profiles']) {
  const a = await cnt(A, t);
  const b = await cnt(B, t);
  if (a === 1 && b === 0) ok(`${t}: A يرى صفه وB لا يرى شيئًا`);
  else bad(`${t}: عزل البيانات`, `A=${a} B=${b}`);
}

await expectThrows('B لا يستطيع إدراج صف باسم A', () => as(B, () => db.query(`insert into public.saved_audio (id, user_id, title, url) values (gen_random_uuid(), $1, 'x', 'https://a.b')`, [A])));
await expectThrows('B لا يستطيع ربط تمرين بجلسة A', () =>
  as(B, () => db.query(`insert into public.workout_session_exercises (id, session_id, user_id, exercise_id) values (gen_random_uuid(), $1, $2, 'x')`, [S1, B])),
);
const upd = await as(B, () => db.query(`update public.workout_sessions set notes = 'اختراق' where id = $1`, [S1]));
if (upd.affectedRows === 0) ok('B لا يعدّل جلسة A (0 صفوف)');
else bad('B عدّل جلسة A');
const del = await as(B, () => db.query(`delete from public.workout_sessions where id = $1`, [S1]));
if (del.affectedRows === 0) ok('B لا يحذف جلسة A (0 صفوف)');
else bad('B حذف جلسة A');

// الزائر بلا حساب
await expectThrows('الزائر (anon) لا يقرأ الجلسات', () => as(null, () => db.query(`select * from public.workout_sessions`)), 'permission denied');
await expectThrows('الزائر (anon) لا يكتب', () => as(null, () => db.query(`insert into public.saved_audio (id, user_id, title, url) values (gen_random_uuid(), $1, 'x', 'https://a.b')`, [A])), 'permission denied');
await expectThrows('لا أحد يقرأ allowed_emails (authenticated)', () => as(A, () => db.query(`select * from public.allowed_emails`)), 'permission denied');
await expectThrows('لا أحد يقرأ allowed_emails (anon)', () => as(null, () => db.query(`select * from public.allowed_emails`)), 'permission denied');

console.log('قيود البيانات:');
await expectThrows('يوم تمرين خارج 1–4 يُرفض', () => as(A, () => db.query(`insert into public.workout_sessions (id, date, workout_day) values (gen_random_uuid(), '2026-09-19', 7)`)));
await expectThrows('نوع جلسة غير معروف يُرفض', () => as(A, () => db.query(`insert into public.workout_sessions (id, date, session_type) values (gen_random_uuid(), '2026-09-19', 'x')`)));
await expectThrows('رابط صوتي بلا http يُرفض', () => as(A, () => db.query(`insert into public.saved_audio (id, title, url) values (gen_random_uuid(), 'x', 'javascript:alert(1)')`)));
await expectThrows('وزن غير معقول يُرفض', () => as(A, () => db.query(`insert into public.weekly_measurements (id, week_start, measured_on, weight_kg) values (gen_random_uuid(), '2026-09-13', '2026-09-19', 900)`)));

const dm = (await as(A, () => db.query(`select duration_minutes from public.workout_sessions where id = $1`, [S1]))).rows[0].duration_minutes;
if (dm === 45) ok('عمود duration_minutes المحسوب = 45');
else bad('duration_minutes', String(dm));

console.log('حذف الحساب يحذف بياناته فقط:');
await db.exec(`delete from auth.users where id = '${B}'`);
if ((await cnt(A, 'workout_sessions')) === 1) ok('بيانات A سليمة بعد حذف B');
else bad('بيانات A تأثرت');

console.log('إعادة تطبيق الترحيلات على قاعدة فيها بيانات:');
for (const f of files) await db.exec(readFileSync(join(dir, f), 'utf8'));
if ((await cnt(A, 'workout_sessions')) === 1 && (await cnt(A, 'workout_session_exercises')) === 1) ok('البيانات باقية بعد إعادة التطبيق');
else bad('فُقدت بيانات بعد إعادة التطبيق');

console.log(failed ? `\nفشل ${failed} اختبار` : '\nنجحت كل اختبارات قاعدة البيانات');
process.exit(failed ? 1 : 0);
