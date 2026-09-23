-- ==========================================================================
-- 45/4 — «أنا وعبدالسلام»: مشاركة تحفيزية محدودة + تشجيعات
-- لا تكشف الوزن، محيط الخصر، BMI، النبض، السعرات أو أي بيانات Apple Health.
-- لا توسّع RLS على الجداول الأصلية؛ العرض يتم عبر دوال Security Definer تُرجع
-- إحصاءات محددة فقط للحسابين المصرّح بهما.
-- ========================================================================== 

create table if not exists public.buddy_reactions (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('kfu', 'fire')),
  created_at  timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

create index if not exists buddy_reactions_receiver_created_idx
  on public.buddy_reactions (receiver_id, created_at desc);

alter table public.buddy_reactions enable row level security;
revoke all on public.buddy_reactions from public, anon, authenticated;

-- إحصاءات آمنة ومحدودة للحسابين فقط.
create or replace function public.get_buddy_stats()
returns table (
  user_id uuid,
  display_name text,
  email text,
  weekly_sessions integer,
  weekly_visits integer,
  weekly_visit_seconds bigint,
  last_arrived_at timestamptz,
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
  ws integer;
  wk_start date;
  w date;
  cnt integer;
  streak integer;
begin
  if caller_email not in ('z062496@gmail.com', 'amk157662@gmail.com') then
    raise exception 'buddy_not_allowed';
  end if;
  if not exists (select 1 from public.allowed_emails a where a.email = caller_email) then
    raise exception 'buddy_not_allowed';
  end if;

  foreach e in array array['z062496@gmail.com','amk157662@gmail.com']
  loop
    select u.id into uid from auth.users u where lower(u.email) = e limit 1;
    if uid is null then
      continue;
    end if;

    select coalesce(s.week_start, 0)::integer into ws
      from public.user_settings s where s.user_id = uid;
    ws := coalesce(ws, 0);
    wk_start := current_date - (((extract(dow from current_date)::integer - ws + 7) % 7));

    select least(4, count(distinct s.workout_day))::integer
      into cnt
      from public.workout_sessions s
     where s.user_id = uid
       and s.session_type in ('normal','short')
       and s.date between wk_start and wk_start + 6;
    weekly_sessions := coalesce(cnt, 0);

    select count(*)::integer,
           coalesce(sum(extract(epoch from (coalesce(v.left_at, now()) - v.arrived_at)))::bigint, 0),
           max(v.arrived_at)
      into weekly_visits, weekly_visit_seconds, last_arrived_at
      from public.gym_visits v
     where v.user_id = uid
       and v.date between wk_start and wk_start + 6;

    -- سلسلة أسابيع 4/4: إن لم يكتمل الأسبوع الجاري نبدأ من الأسبوع الماضي.
    streak := 0;
    w := wk_start;
    if weekly_sessions < 4 then
      w := w - 7;
    end if;
    for i in 1..52 loop
      select least(4, count(distinct s.workout_day))::integer
        into cnt
        from public.workout_sessions s
       where s.user_id = uid
         and s.session_type in ('normal','short')
         and s.date between w and w + 6;
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

-- إرسال تشجيع للرفيق فقط. لا يسمح باختيار المستلم من الواجهة.
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
  if p_kind not in ('kfu','fire') then
    raise exception 'invalid_reaction';
  end if;
  if caller_email = 'z062496@gmail.com' then
    receiver_email := 'amk157662@gmail.com';
    receiver_name := 'عبدالسلام';
  elsif caller_email = 'amk157662@gmail.com' then
    receiver_email := 'z062496@gmail.com';
    receiver_name := 'زياد';
  else
    raise exception 'buddy_not_allowed';
  end if;
  if not exists (select 1 from public.allowed_emails a where a.email = caller_email) then
    raise exception 'buddy_not_allowed';
  end if;

  select u.id into receiver_id from auth.users u where lower(u.email) = receiver_email limit 1;
  if receiver_id is null then
    raise exception 'buddy_not_registered';
  end if;

  insert into public.buddy_reactions(sender_id, receiver_id, kind)
  values (auth.uid(), receiver_id, p_kind);
  return receiver_name;
end;
$$;

revoke all on function public.send_buddy_reaction(text) from public, anon;
grant execute on function public.send_buddy_reaction(text) to authenticated;

-- آخر التشجيعات التي وصلت للمستخدم الحالي.
create or replace function public.get_buddy_reactions()
returns table (
  id uuid,
  sender_name text,
  kind text,
  created_at timestamptz
)
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
         end as sender_name,
         br.kind,
         br.created_at
    from public.buddy_reactions br
    join auth.users u on u.id = br.sender_id
   where br.receiver_id = auth.uid()
     and lower(coalesce(auth.jwt() ->> 'email','')) in ('z062496@gmail.com','amk157662@gmail.com')
   order by br.created_at desc
   limit 5;
$$;

revoke all on function public.get_buddy_reactions() from public, anon;
grant execute on function public.get_buddy_reactions() to authenticated;
