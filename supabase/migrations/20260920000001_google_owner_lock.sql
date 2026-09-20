-- ==========================================================================
-- الدخول بحساب Google واحد محدَّد مسبقًا (المالك).
--
-- يستبدل منطق «أول مستخدم = المالك» من الترحيل السابق:
--  • لا أحد يُنشأ له حساب إلا إن كان بريده في public.allowed_emails (قائمة المالك).
--  • الحساب يجب أن يأتي من مزوّد google (تسجيل البريد/الرمز مرفوض حتى للمالك).
--  • القائمة الفارغة = لا يدخل أحد (الفشل مغلق). عيّن المالك قبل أول دخول:
--        select public.set_owner_email('you@gmail.com');   -- من لوحة SQL في Supabase
--    أو عبر scripts/configure-supabase.mjs مع OWNER_EMAIL.
--  • دفاع إضافي: سياسات RLS «مقيِّدة» على كل الجداول تتحقق أن بريد الجلسة الحالية
--    هو المالك؛ فحتى لو أُنشئ مستخدم بالخطأ لا يقرأ ولا يكتب شيئًا.
-- إضافي فقط: لا يحذف بيانات مستخدمين.
-- ==========================================================================

comment on table public.allowed_emails is 'قائمة المالك: البريد الوحيد (عادةً) المسموح له بالدخول عبر Google. تُدار عبر set_owner_email().';

create or replace function public.enforce_signup_lock()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is null then
    raise exception 'signup_not_allowed';
  end if;
  -- Google فقط (لا بريد/رمز ولا مزوّد آخر)
  if coalesce(new.raw_app_meta_data ->> 'provider', '') <> 'google' then
    raise exception 'signup_not_allowed';
  end if;
  -- البريد يجب أن يكون في قائمة المالك (لا استثناء لأول مستخدم)
  if not exists (select 1 from public.allowed_emails a where a.email = lower(new.email)) then
    raise exception 'signup_not_allowed';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_signup_lock() from public, anon, authenticated;

drop trigger if exists enforce_signup_lock on auth.users;
create trigger enforce_signup_lock
  before insert on auth.users
  for each row execute function public.enforce_signup_lock();

-- تعيين المالك: يجعل القائمة تحوي هذا البريد فقط. لا تُستدعى من الواجهة (لا صلاحية لـ anon/authenticated).
create or replace function public.set_owner_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e text := lower(btrim(coalesce(p_email, '')));
begin
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;
  delete from public.allowed_emails where email <> e;
  insert into public.allowed_emails (email) values (e) on conflict (email) do nothing;
end;
$$;
revoke all on function public.set_owner_email(text) from public, anon, authenticated;

-- هل صاحب الجلسة الحالية هو المالك؟
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

-- سياسات مقيِّدة (تُطبَّق مع own_rows بمنطق AND)
do $$
declare t text;
begin
  foreach t in array array['profiles','user_settings','workout_sessions','workout_session_exercises','weekly_measurements','saved_audio','daily_logs']
  loop
    execute format('drop policy if exists owner_only on public.%I', t);
    execute format(
      'create policy owner_only on public.%I as restrictive for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()))',
      t
    );
  end loop;
end $$;
