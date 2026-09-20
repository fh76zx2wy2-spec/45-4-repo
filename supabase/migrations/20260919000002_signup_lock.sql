-- ==========================================================================
-- قفل التسجيل: التطبيق شخصي.
--  • أول حساب يُنشأ يصبح المالك.
--  • بعد ذلك لا يُنشأ حساب جديد إلا إن أضفتَ بريده يدويًا في public.allowed_emails.
--  • الحسابات الموجودة تدخل دائمًا (لا يمسّها هذا القفل).
-- لإضافة بريد:  insert into public.allowed_emails (email) values ('name@example.com');
-- ==========================================================================
create table if not exists public.allowed_emails (
  email      text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;
-- بلا سياسات ولا صلاحيات لـ anon/authenticated: لا يصل إليها إلا مالك قاعدة البيانات
revoke all on public.allowed_emails from anon, authenticated;

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
  -- أول مستخدم في المشروع
  if not exists (select 1 from auth.users) then
    return new;
  end if;
  if exists (select 1 from public.allowed_emails a where a.email = lower(new.email)) then
    return new;
  end if;
  raise exception 'signup_not_allowed';
end;
$$;

revoke all on function public.enforce_signup_lock() from public, anon, authenticated;

drop trigger if exists enforce_signup_lock on auth.users;
create trigger enforce_signup_lock
  before insert on auth.users
  for each row execute function public.enforce_signup_lock();
