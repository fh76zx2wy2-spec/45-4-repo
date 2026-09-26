-- ============================================================================
-- 45/4 — التحديث النهائي 26-09-2026
-- 4/4 = أربعة أيام حضور مختلفة من الأحد إلى السبت.
-- الحضور مستقل عن خطة التمرين. لا يحذف هذا الملف أي بيانات سابقة.
-- ============================================================================

-- ============================================================================
-- 45/4 — تحديث تجربة الكوتش + رفيق التمرين
-- الأسبوع ثابت: الأحد إلى السبت. لا تُشارك أي بيانات صحية خاصة.
-- ============================================================================

insert into public.allowed_emails (email)
values ('z062496@gmail.com'), ('amk157662@gmail.com')
on conflict (email) do nothing;

-- تثبيت بداية الأسبوع للأسبوع الرياضي: الأحد = 0
update public.user_settings
   set week_start = 0, updated_at = now()
 where user_id in (
   select id from auth.users where lower(email) in ('z062496@gmail.com','amk157662@gmail.com')
 );

create table if not exists public.buddy_reactions (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  kind        text not null,
  created_at  timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

-- وسّع أنواع التشجيع بأمان حتى لو كان الجدول موجودًا من تحديث سابق
alter table public.buddy_reactions drop constraint if exists buddy_reactions_kind_check;
alter table public.buddy_reactions
  add constraint buddy_reactions_kind_check
  check (kind in ('kfu','fire','beatme','yourturn','beast4'));

create index if not exists buddy_reactions_receiver_created_idx
  on public.buddy_reactions (receiver_id, created_at desc);

alter table public.buddy_reactions enable row level security;
revoke all on public.buddy_reactions from public, anon, authenticated;

drop function if exists public.get_buddy_stats();

create or replace function public.get_buddy_stats()
returns table (
  user_id uuid,
  display_name text,
  email text,
  weekly_sessions integer,
  weekly_visits integer,
  weekly_visit_seconds bigint,
  last_arrived_at timestamptz,
  last_left_at timestamptz,
  last_visit_seconds bigint,
  in_gym boolean,
  active_arrived_at timestamptz,
  streak_4of4 integer
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  e text;
  uid uuid;
  wk_start date;
  w date;
  cnt integer;
  streak integer;
  lv_arrived timestamptz;
  lv_left timestamptz;
  lv_seconds bigint;
begin
  if caller_email not in ('z062496@gmail.com', 'amk157662@gmail.com') then
    raise exception 'buddy_not_allowed';
  end if;
  if not exists (select 1 from public.allowed_emails a where a.email = caller_email) then
    raise exception 'buddy_not_allowed';
  end if;

  -- PostgreSQL DOW: الأحد = 0. إذن بداية الأسبوع الرياضية ثابتة هنا.
  -- Supabase يعمل عادةً على UTC؛ نحسب اليوم الرياضي بتوقيت السعودية.
  wk_start := (now() at time zone 'Asia/Riyadh')::date - extract(dow from (now() at time zone 'Asia/Riyadh')::date)::integer;

  foreach e in array array['z062496@gmail.com','amk157662@gmail.com']
  loop
    select u.id into uid from auth.users u where lower(u.email) = e limit 1;
    if uid is null then continue; end if;

    -- 4/4 = أربعة أيام حضور مختلفة، وليس إكمال تمارين الموقع.
    select least(4, count(distinct v.date))::integer
      into cnt
      from public.gym_visits v
     where v.user_id = uid
       and v.date between wk_start and wk_start + 6;
    weekly_sessions := coalesce(cnt, 0);

    select count(*)::integer,
           coalesce(sum(extract(epoch from (coalesce(v.left_at, now()) - v.arrived_at)))::bigint, 0),
           max(v.arrived_at)
      into weekly_visits, weekly_visit_seconds, last_arrived_at
      from public.gym_visits v
     where v.user_id = uid
       and v.date between wk_start and wk_start + 6;

    lv_arrived := null; lv_left := null; lv_seconds := 0;
    select v.arrived_at, v.left_at,
           greatest(0, extract(epoch from (coalesce(v.left_at, now()) - v.arrived_at))::bigint)
      into lv_arrived, lv_left, lv_seconds
      from public.gym_visits v
     where v.user_id = uid
     order by v.arrived_at desc
     limit 1;

    -- آخر حضور عبر كامل السجل، لا الأسبوع الحالي فقط.
    last_arrived_at := lv_arrived;
    last_left_at := lv_left;
    last_visit_seconds := coalesce(lv_seconds, 0);
    in_gym := lv_arrived is not null and lv_left is null;
    active_arrived_at := case when in_gym then lv_arrived else null end;

    streak := 0;
    w := wk_start;
    if weekly_sessions < 4 then w := w - 7; end if;
    for i in 1..52 loop
      select least(4, count(distinct v.date))::integer
        into cnt
        from public.gym_visits v
       where v.user_id = uid
         and v.date between w and w + 6;
      exit when coalesce(cnt, 0) < 4;
      streak := streak + 1;
      w := w - 7;
    end loop;

    user_id := uid;
    email := e;
    display_name := case e
      when 'z062496@gmail.com' then 'زياد'
      when 'amk157662@gmail.com' then 'عبدالسلام'
      else 'رفيق التمرين'
    end;
    streak_4of4 := streak;
    return next;
  end loop;
end;
$$;

revoke all on function public.get_buddy_stats() from public, anon;
grant execute on function public.get_buddy_stats() to authenticated;

create or replace function public.send_buddy_reaction(p_kind text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  receiver_email text;
  receiver_id uuid;
  receiver_name text;
begin
  if p_kind not in ('kfu','fire','beatme','yourturn','beast4') then
    raise exception 'invalid_reaction';
  end if;
  if caller_email = 'z062496@gmail.com' then
    receiver_email := 'amk157662@gmail.com'; receiver_name := 'عبدالسلام';
  elsif caller_email = 'amk157662@gmail.com' then
    receiver_email := 'z062496@gmail.com'; receiver_name := 'زياد';
  else
    raise exception 'buddy_not_allowed';
  end if;
  if not exists (select 1 from public.allowed_emails a where a.email = caller_email) then
    raise exception 'buddy_not_allowed';
  end if;
  select u.id into receiver_id from auth.users u where lower(u.email) = receiver_email limit 1;
  if receiver_id is null then raise exception 'buddy_not_registered'; end if;
  insert into public.buddy_reactions(sender_id, receiver_id, kind)
  values (auth.uid(), receiver_id, p_kind);
  return receiver_name;
end;
$$;

revoke all on function public.send_buddy_reaction(text) from public, anon;
grant execute on function public.send_buddy_reaction(text) to authenticated;

create or replace function public.get_buddy_reactions()
returns table (id uuid, sender_name text, kind text, created_at timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
  select br.id,
         case lower(u.email)
           when 'z062496@gmail.com' then 'زياد'
           when 'amk157662@gmail.com' then 'عبدالسلام'
           else 'رفيق التمرين'
         end,
         br.kind,
         br.created_at
    from public.buddy_reactions br
    join auth.users u on u.id = br.sender_id
   where br.receiver_id = auth.uid()
     and lower(coalesce(auth.jwt() ->> 'email','')) in ('z062496@gmail.com','amk157662@gmail.com')
   order by br.created_at desc
   limit 8;
$$;

revoke all on function public.get_buddy_reactions() from public, anon;
grant execute on function public.get_buddy_reactions() to authenticated;

-- ==========================================================================
-- الصور الشخصية الخاصة — Supabase Storage
-- الصور لا توضع داخل GitHub. كل حساب يقرأ صورته فقط عبر رابط موقّع مؤقت.
-- ==========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coach-profiles',
  'coach-profiles',
  false,
  10485760,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "45-4 private coach profile read" on storage.objects;
create policy "45-4 private coach profile read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'coach-profiles'
  and name = case lower(coalesce(auth.jwt() ->> 'email', ''))
    when 'z062496@gmail.com' then 'ziyad/profile.png'
    when 'amk157662@gmail.com' then 'abdulsalam/profile.png'
    else '__blocked__'
  end
);


-- ==========================================================================
-- 45/4 — Web Push subscriptions + deduplication log
-- آمن للنشر في GitHub: لا يحتوي أي مفاتيح خاصة.
-- ==========================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "45-4 push read own" on public.push_subscriptions;
create policy "45-4 push read own" on public.push_subscriptions
for select to authenticated using (user_id = auth.uid());

drop policy if exists "45-4 push insert own" on public.push_subscriptions;
create policy "45-4 push insert own" on public.push_subscriptions
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "45-4 push update own" on public.push_subscriptions;
create policy "45-4 push update own" on public.push_subscriptions
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "45-4 push delete own" on public.push_subscriptions;
create policy "45-4 push delete own" on public.push_subscriptions
for delete to authenticated using (user_id = auth.uid());

create table if not exists public.push_notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  ref_key text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, ref_key)
);

create index if not exists push_notification_log_user_sent_idx on public.push_notification_log(user_id, sent_at desc);
alter table public.push_notification_log enable row level security;
-- لا يحتاج المستخدم الوصول لهذا الجدول؛ Edge Function تستخدم service role فقط.
revoke all on public.push_notification_log from public, anon, authenticated;
