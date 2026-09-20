/**
 * المزامنة: رفع العمليات المعلّقة ثم سحب آخر نسخة من السيرفر ودمجها.
 * تفشل بهدوء عند انقطاع الاتصال، وتُعاد تلقائيًا عند عودته.
 */
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { getDB, mergeRemote, removePending, subscribe as subscribeStore, type Op } from './store';
import type { DailyLog, Measurement, Profile, SavedAudio, Session, SessionExercise, Settings } from './types';

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'disabled';
interface SyncInfo {
  state: SyncState;
  lastError: string | null;
  lastOk: number | null;
}

let info: SyncInfo = { state: 'idle', lastError: null, lastOk: null };
const ls = new Set<() => void>();
const setInfo = (p: Partial<SyncInfo>) => {
  info = { ...info, ...p };
  ls.forEach((l) => l());
};

export function useSyncInfo(): SyncInfo {
  return useSyncExternalStore(
    (f) => {
      ls.add(f);
      return () => ls.delete(f);
    },
    () => info,
    () => info,
  );
}

let running: Promise<void> | null = null;

const SESSION_COLS = [
  'id', 'user_id', 'date', 'workout_day', 'program_week', 'duration_seconds', 'cardio_seconds', 'completed', 'early_finish',
  'session_type', 'extra_kind', 'short_minutes', 'difficulty', 'notes', 'started_at', 'ended_at', 'created_at', 'updated_at',
] as const;

function pick<T extends object>(o: T, cols: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of cols) out[c] = (o as Record<string, unknown>)[c];
  return out;
}

async function pushOp(op: Op): Promise<void> {
  const db = getDB();
  if (!db || !supabase) return;
  const uid = db.userId;
  const fail = (e: { message: string } | null) => {
    if (e) throw new Error(`${op.table}: ${e.message}`);
  };
  switch (op.table) {
    case 'profiles': {
      const row = db.profile;
      if (op.action === 'upsert' && row) fail((await supabase.from('profiles').upsert({ id: uid, display_name: row.display_name, updated_at: row.updated_at })).error);
      return;
    }
    case 'user_settings': {
      const s = db.settings;
      if (op.action === 'upsert' && s) {
        fail((await supabase.from('user_settings').upsert({ ...s, user_id: uid })).error);
      }
      return;
    }
    case 'workout_sessions': {
      if (op.action === 'delete') {
        fail((await supabase.from('workout_sessions').delete().eq('id', op.id)).error);
        return;
      }
      const s = db.sessions.find((x) => x.id === op.id);
      if (!s) return;
      fail((await supabase.from('workout_sessions').upsert(pick(s, SESSION_COLS) as never)).error);
      if (s.exercises.length) {
        fail((await supabase.from('workout_session_exercises').upsert(s.exercises.map((e) => ({ ...e, user_id: uid })))).error);
      }
      return;
    }
    case 'weekly_measurements': {
      if (op.action === 'delete') {
        fail((await supabase.from('weekly_measurements').delete().eq('id', op.id)).error);
        return;
      }
      const m = db.measurements.find((x) => x.id === op.id);
      if (m) fail((await supabase.from('weekly_measurements').upsert({ ...m, user_id: uid }, { onConflict: 'id' })).error);
      return;
    }
    case 'saved_audio': {
      if (op.action === 'delete') {
        fail((await supabase.from('saved_audio').delete().eq('id', op.id)).error);
        return;
      }
      const a = db.audio.find((x) => x.id === op.id);
      if (a) fail((await supabase.from('saved_audio').upsert({ ...a, user_id: uid })).error);
      return;
    }
    case 'daily_logs': {
      const l = db.logs.find((x) => x.date === op.id);
      if (l) fail((await supabase.from('daily_logs').upsert({ ...l, user_id: uid }, { onConflict: 'user_id,date' })).error);
      return;
    }
    default:
      return;
  }
}

async function fetchAll<T>(table: string, order: string): Promise<T[]> {
  if (!supabase) return [];
  const out: T[] = [];
  const page = 500;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from(table).select('*').order(order, { ascending: true }).range(from, from + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < page) break;
  }
  return out;
}

async function pull(): Promise<void> {
  if (!supabase) return;
  const db = getDB();
  if (!db) return;
  const [profiles, settingsRows, sessions, exercises, measurements, audio, logs] = await Promise.all([
    fetchAll<Profile>('profiles', 'id'),
    fetchAll<Settings>('user_settings', 'user_id'),
    fetchAll<Omit<Session, 'exercises'>>('workout_sessions', 'id'),
    fetchAll<SessionExercise>('workout_session_exercises', 'id'),
    fetchAll<Measurement>('weekly_measurements', 'id'),
    fetchAll<SavedAudio>('saved_audio', 'id'),
    fetchAll<DailyLog>('daily_logs', 'date'),
  ]);
  const bySession = new Map<string, SessionExercise[]>();
  for (const e of exercises) {
    const arr = bySession.get(e.session_id) ?? [];
    arr.push(e);
    bySession.set(e.session_id, arr);
  }
  const fullSessions: Session[] = sessions.map((s) => ({
    ...s,
    // numeric قد تصل كنص من بعض الإعدادات
    exercises: (bySession.get(s.id) ?? []).sort((a, b) => a.position - b.position).map((e) => ({ ...e, weight_kg: e.weight_kg == null ? null : Number(e.weight_kg) })),
  }));
  mergeRemote({
    profile: profiles[0] ?? null,
    settings: settingsRows[0] ?? null,
    sessions: fullSessions,
    measurements: measurements.map((m) => ({
      ...m,
      weight_kg: m.weight_kg == null ? null : Number(m.weight_kg),
      waist_cm: m.waist_cm == null ? null : Number(m.waist_cm),
    })),
    audio,
    logs,
  });
}

export function syncNow(): Promise<void> {
  if (!supabase) {
    setInfo({ state: 'disabled' });
    return Promise.resolve();
  }
  if (running) return running;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setInfo({ state: 'offline' });
    return Promise.resolve();
  }
  running = (async () => {
    setInfo({ state: 'syncing' });
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('لا توجد جلسة دخول');
      const ops = [...(getDB()?.pending ?? [])].sort((a, b) => a.ts - b.ts);
      const done: Op[] = [];
      for (const op of ops) {
        await pushOp(op);
        done.push(op);
      }
      if (done.length) removePending(done);
      await pull();
      setInfo({ state: 'idle', lastError: null, lastOk: Date.now() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const offline = /fetch|network|failed to|load failed/i.test(msg) || navigator.onLine === false;
      setInfo({ state: offline ? 'offline' : 'error', lastError: msg });
    } finally {
      running = null;
    }
  })();
  return running;
}

/** يربط المزامنة بالأحداث: عودة الاتصال، فتح التطبيق، وأي تغيير محلي */
export function startSyncEngine(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastPending: Op[] | null = null;
  const debounced = (ms = 1200) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), ms);
  };
  const onOnline = () => void syncNow();
  const onVisible = () => {
    if (document.visibilityState === 'visible') void syncNow();
  };
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', () => setInfo({ state: 'offline' }));
  document.addEventListener('visibilitychange', onVisible);
  const unsub = subscribeStore(() => {
    const p = getDB()?.pending ?? null;
    if (p !== lastPending) {
      if (p && p.length > 0) debounced();
      lastPending = p;
    }
  });
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow();
  }, 90_000);
  void syncNow();
  return () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
    unsub();
    clearInterval(interval);
    if (timer) clearTimeout(timer);
  };
}
