-- ==========================================================================
-- 45/4 — المخطط الأساسي
-- مبدأ: كل الأوامر هنا آمنة عند إعادة التشغيل (idempotent) ولا تحذف بيانات المستخدم أبدًا.
-- لإضافة ميزة لاحقًا: أنشئ ملف ترحيل جديدًا بأرقام أعلى ولا تعدّل هذا الملف.
-- ==========================================================================

-- ---------- الملف الشخصي ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'زياد' check (char_length(display_name) between 1 and 40),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- إعدادات المستخدم (وتعديلات البرنامج) ----------
create table if not exists public.user_settings (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  theme                 text not null default 'system' check (theme in ('system', 'light', 'dark')),
  program_start_date    date,
  week_start            smallint not null default 0 check (week_start between 0 and 6),
  vibration             boolean not null default true,
  sound                 boolean not null default true,
  wake_lock             boolean not null default true,
  hide_ready_checklist  boolean not null default false,
  program_overrides     jsonb not null default '{}'::jsonb,
  cardio_overrides      jsonb not null default '{}'::jsonb,
  comeback_sessions_left integer not null default 0 check (comeback_sessions_left between 0 and 20),
  dismissed             jsonb not null default '{}'::jsonb,
  updated_at            timestamptz not null default now()
);

-- ---------- الجلسات ----------
create table if not exists public.workout_sessions (
  id               uuid primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date             date not null,
  workout_day      smallint check (workout_day between 1 and 4),
  program_week     integer not null default 1 check (program_week >= 1),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  cardio_seconds   integer not null default 0 check (cardio_seconds >= 0),
  completed        boolean not null default false,
  early_finish     boolean not null default false,
  session_type     text not null default 'normal' check (session_type in ('normal', 'short', 'extra')),
  extra_kind       text,
  short_minutes    integer check (short_minutes is null or short_minutes between 5 and 45),
  difficulty       text check (difficulty is null or difficulty in ('easy', 'good', 'hard')),
  notes            text not null default '' check (char_length(notes) <= 1000),
  started_at       timestamptz not null default now(),
  ended_at         timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
-- المدة بالدقائق مباشرة للقراءة (عمود محسوب)
alter table public.workout_sessions
  add column if not exists duration_minutes integer generated always as (round(duration_seconds / 60.0)::integer) stored;

create index if not exists workout_sessions_user_date_idx on public.workout_sessions (user_id, date desc);

-- ---------- تمارين كل جلسة ----------
create table if not exists public.workout_session_exercises (
  id              uuid primary key,
  session_id      uuid not null references public.workout_sessions (id) on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id     text not null,
  position        integer not null default 1,
  status          text not null default 'done' check (status in ('done', 'partial', 'skipped', 'substituted')),
  sets_planned    integer not null default 0 check (sets_planned >= 0),
  sets_done       integer not null default 0 check (sets_done >= 0),
  reps            text not null default '',
  rest_seconds    integer not null default 0 check (rest_seconds >= 0),
  weight_kg       numeric(6, 2) check (weight_kg is null or weight_kg between 0 and 1000),
  substituted_for text,
  updated_at      timestamptz not null default now()
);
create index if not exists workout_session_exercises_session_idx on public.workout_session_exercises (session_id);
create index if not exists workout_session_exercises_user_idx on public.workout_session_exercises (user_id);

-- ---------- القياسات الأسبوعية ----------
create table if not exists public.weekly_measurements (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start   date not null,
  measured_on  date not null,
  weight_kg    numeric(5, 2) check (weight_kg is null or weight_kg between 20 and 400),
  waist_cm     numeric(5, 1) check (waist_cm is null or waist_cm between 30 and 250),
  program_week integer,
  notes        text not null default '' check (char_length(notes) <= 500),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists weekly_measurements_user_week_idx on public.weekly_measurements (user_id, week_start);

-- ---------- المحفوظات الصوتية (روابط فقط، لا ملفات) ----------
create table if not exists public.saved_audio (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 120),
  url        text not null check (char_length(url) <= 2000 and url ~* '^https?://'),
  kind       text not null default 'other' check (kind in ('youtube', 'playlist', 'spotify', 'other')),
  section    text not null default 'saved' check (section in ('recitation', 'podcast', 'saved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists saved_audio_user_idx on public.saved_audio (user_id, created_at desc);

-- ---------- سجل يومي خفيف (ماء / وجبة حرة) ----------
create table if not exists public.daily_logs (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  water_cups smallint not null default 0 check (water_cups between 0 and 60),
  free_meal  boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- ==========================================================================
-- الأمان: RLS — كل مستخدم يرى ويعدّل بياناته وحده
-- ==========================================================================
alter table public.profiles                   enable row level security;
alter table public.user_settings              enable row level security;
alter table public.workout_sessions           enable row level security;
alter table public.workout_session_exercises  enable row level security;
alter table public.weekly_measurements        enable row level security;
alter table public.saved_audio                enable row level security;
alter table public.daily_logs                 enable row level security;

-- سياسات (تُعاد إنشاؤها بأمان)
drop policy if exists own_rows on public.profiles;
create policy own_rows on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists own_rows on public.user_settings;
create policy own_rows on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists own_rows on public.workout_sessions;
create policy own_rows on public.workout_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- التمارين: يجب أن تتبع جلسة يملكها المستخدم نفسه
drop policy if exists own_rows on public.workout_session_exercises;
create policy own_rows on public.workout_session_exercises for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
  );

drop policy if exists own_rows on public.weekly_measurements;
create policy own_rows on public.weekly_measurements for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists own_rows on public.saved_audio;
create policy own_rows on public.saved_audio for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists own_rows on public.daily_logs;
create policy own_rows on public.daily_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- الصلاحيات: لا شيء للزائر (anon)، والمستخدم المسجّل له CRUD ضمن RLS فقط
revoke all on public.profiles, public.user_settings, public.workout_sessions, public.workout_session_exercises,
  public.weekly_measurements, public.saved_audio, public.daily_logs from anon;
grant select, insert, update, delete on public.profiles, public.user_settings, public.workout_sessions,
  public.workout_session_exercises, public.weekly_measurements, public.saved_audio, public.daily_logs to authenticated;
