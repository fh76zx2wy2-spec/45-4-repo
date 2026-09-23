-- ==========================================================================
-- 45/4 — تسجيل الوصول/المغادرة + استيراد Apple Health الاختياري
-- آمن للإعادة ولا يحذف أي بيانات موجودة.
-- ==========================================================================

create table if not exists public.gym_visits (
  id               uuid primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date             date not null,
  arrived_at       timestamptz not null,
  left_at          timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (left_at is null or left_at >= arrived_at)
);

create index if not exists gym_visits_user_date_idx
  on public.gym_visits (user_id, date desc, arrived_at desc);

-- زيارة مفتوحة واحدة فقط لكل حساب.
create unique index if not exists gym_visits_one_open_per_user_idx
  on public.gym_visits (user_id)
  where left_at is null;

create table if not exists public.apple_health_records (
  id                 uuid primary key,
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date               date not null,
  workout_type       text not null default '' check (char_length(workout_type) <= 120),
  duration_seconds   integer not null default 0 check (duration_seconds >= 0),
  active_kcal        numeric(8, 2) check (active_kcal is null or active_kcal between 0 and 100000),
  avg_heart_rate     numeric(6, 2) check (avg_heart_rate is null or avg_heart_rate between 0 and 300),
  max_heart_rate     numeric(6, 2) check (max_heart_rate is null or max_heart_rate between 0 and 300),
  distance_km        numeric(9, 3) check (distance_km is null or distance_km between 0 and 10000),
  steps              integer check (steps is null or steps between 0 and 1000000),
  source_started_at  timestamptz,
  source_ended_at    timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (source_started_at is null or source_ended_at is null or source_ended_at >= source_started_at)
);

create index if not exists apple_health_records_user_date_idx
  on public.apple_health_records (user_id, date desc, created_at desc);

alter table public.gym_visits enable row level security;
alter table public.apple_health_records enable row level security;

drop policy if exists own_rows on public.gym_visits;
create policy own_rows on public.gym_visits for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists own_rows on public.apple_health_records;
create policy own_rows on public.apple_health_records for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- نفس طبقة الحماية المقيّدة المستخدمة في بقية التطبيق: البريد يجب أن يكون ضمن allowed_emails.
drop policy if exists owner_only on public.gym_visits;
create policy owner_only on public.gym_visits as restrictive for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

drop policy if exists owner_only on public.apple_health_records;
create policy owner_only on public.apple_health_records as restrictive for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

revoke all on public.gym_visits, public.apple_health_records from anon;
grant select, insert, update, delete on public.gym_visits, public.apple_health_records to authenticated;
