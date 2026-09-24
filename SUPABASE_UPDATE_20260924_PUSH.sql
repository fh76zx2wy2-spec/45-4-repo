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
