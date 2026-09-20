/**
 * المخزن المحلي (Local-first): كل القراءة والكتابة تحدث محليًا أولًا ثم تُزامَن مع Supabase.
 * لذلك يعمل التطبيق حتى مع ضعف الإنترنت في النادي، وتُزامَن البيانات عند عودة الاتصال.
 * التخزين: localStorage بمفتاح لكل مستخدم.
 */
import { useSyncExternalStore } from 'react';
import { uuid } from './live';
import { weekStartOf } from './dates';
import type { DailyLog, LiveSession, Measurement, Profile, SavedAudio, Session, Settings } from './types';

export type Table = 'profiles' | 'user_settings' | 'workout_sessions' | 'workout_session_exercises' | 'weekly_measurements' | 'saved_audio' | 'daily_logs';

/** عملية معلّقة للمزامنة. للجلسات: id = معرّف الجلسة (وتُرفع تمارينها معها) */
export interface Op {
  table: Table;
  id: string;
  action: 'upsert' | 'delete';
  ts: number;
}

export interface DB {
  v: 1;
  userId: string;
  profile: Profile | null;
  settings: Settings | null;
  sessions: Session[];
  measurements: Measurement[];
  audio: SavedAudio[];
  logs: DailyLog[];
  live: LiveSession | null;
  pending: Op[];
  lastSync: number | null;
}

export const nowIso = () => new Date().toISOString();

export function defaultSettings(userId: string): Settings {
  return {
    user_id: userId,
    theme: 'system',
    program_start_date: null,
    week_start: 0,
    vibration: true,
    sound: true,
    wake_lock: true,
    hide_ready_checklist: false,
    program_overrides: {},
    cardio_overrides: {},
    comeback_sessions_left: 0,
    dismissed: {},
    updated_at: nowIso(),
  };
}

const emptyDB = (userId: string): DB => ({
  v: 1,
  userId,
  profile: null,
  settings: null,
  sessions: [],
  measurements: [],
  audio: [],
  logs: [],
  live: null,
  pending: [],
  lastSync: null,
});

const KEY = (u: string) => `45-4:db:${u}`;

let db: DB | null = null;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function persistNow() {
  if (!db) return;
  try {
    localStorage.setItem(KEY(db.userId), JSON.stringify(db));
  } catch {
    /* مساحة ممتلئة أو وضع خاص: نستمر في الذاكرة */
  }
}

function schedulePersist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 150);
}

function commit(next: DB) {
  db = next;
  schedulePersist();
  emit();
}

if (typeof window !== 'undefined') {
  const flush = () => {
    if (saveTimer) clearTimeout(saveTimer);
    persistNow();
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export function initStore(userId: string): DB {
  if (db && db.userId === userId) return db;
  let loaded: DB | null = null;
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (raw) loaded = JSON.parse(raw) as DB;
  } catch {
    loaded = null;
  }
  db = loaded && loaded.v === 1 ? { ...emptyDB(userId), ...loaded } : emptyDB(userId);
  if (!db.settings) db = { ...db, settings: defaultSettings(userId) };
  emit();
  return db;
}

export function clearStore(userId?: string) {
  const u = userId ?? db?.userId;
  if (u) {
    try {
      localStorage.removeItem(KEY(u));
    } catch {
      /* ignore */
    }
  }
  db = null;
  emit();
}

export function getDB(): DB | null {
  return db;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useDB(): DB | null {
  return useSyncExternalStore(subscribe, () => db, () => db);
}

/* ------------------------- عمليات الكتابة ------------------------- */

function enqueue(pending: Op[], op: Omit<Op, 'ts'>): Op[] {
  // نلغي أي عملية سابقة لنفس الصف (الأحدث يكفي)
  const rest = pending.filter((p) => !(p.table === op.table && p.id === op.id));
  return [...rest, { ...op, ts: Date.now() }];
}

function requireDB(): DB {
  if (!db) throw new Error('المخزن غير مهيأ');
  return db;
}

export function saveSession(s: Session) {
  const d = requireDB();
  const upd = { ...s, updated_at: nowIso() };
  const sessions = [...d.sessions.filter((x) => x.id !== s.id), upd].sort((a, b) => b.started_at.localeCompare(a.started_at));
  let settings = d.settings;
  // أول جلسة أساسية تحدد بداية البرنامج
  if (settings && !settings.program_start_date && s.session_type !== 'extra') {
    settings = { ...settings, program_start_date: weekStartOf(s.date, settings.week_start), updated_at: nowIso() };
  }
  let pending = enqueue(d.pending, { table: 'workout_sessions', id: s.id, action: 'upsert' });
  if (settings !== d.settings && settings) pending = enqueue(pending, { table: 'user_settings', id: d.userId, action: 'upsert' });
  commit({ ...d, sessions, settings, pending });
}

export function deleteSession(id: string) {
  const d = requireDB();
  commit({
    ...d,
    sessions: d.sessions.filter((s) => s.id !== id),
    pending: enqueue(d.pending, { table: 'workout_sessions', id, action: 'delete' }),
  });
}

export function updateSessionNotes(id: string, patch: Partial<Pick<Session, 'notes' | 'difficulty'>>) {
  const d = requireDB();
  commit({
    ...d,
    sessions: d.sessions.map((s) => (s.id === id ? { ...s, ...patch, updated_at: nowIso() } : s)),
    pending: enqueue(d.pending, { table: 'workout_sessions', id, action: 'upsert' }),
  });
}

export function saveSettings(patch: Partial<Settings>) {
  const d = requireDB();
  const settings = { ...(d.settings ?? defaultSettings(d.userId)), ...patch, updated_at: nowIso() };
  commit({ ...d, settings, pending: enqueue(d.pending, { table: 'user_settings', id: d.userId, action: 'upsert' }) });
}

export function dismiss(key: string, value = '1') {
  const d = requireDB();
  const settings = d.settings ?? defaultSettings(d.userId);
  saveSettings({ dismissed: { ...settings.dismissed, [key]: value } });
}

export function saveProfile(display_name: string) {
  const d = requireDB();
  const profile: Profile = { id: d.userId, display_name, updated_at: nowIso() };
  commit({ ...d, profile, pending: enqueue(d.pending, { table: 'profiles', id: d.userId, action: 'upsert' }) });
}

export function saveMeasurement(m: Omit<Measurement, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { id?: string }) {
  const d = requireDB();
  // قياس واحد لكل أسبوع: نحدّث الموجود إن وُجد
  const existing = d.measurements.find((x) => x.week_start === m.week_start);
  const id = existing?.id ?? m.id ?? uuid();
  const row: Measurement = {
    id,
    user_id: d.userId,
    week_start: m.week_start,
    measured_on: m.measured_on,
    weight_kg: m.weight_kg ?? existing?.weight_kg ?? null,
    waist_cm: m.waist_cm ?? existing?.waist_cm ?? null,
    program_week: m.program_week,
    notes: m.notes ?? existing?.notes ?? '',
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  };
  commit({
    ...d,
    measurements: [...d.measurements.filter((x) => x.id !== id), row].sort((a, b) => a.week_start.localeCompare(b.week_start)),
    pending: enqueue(d.pending, { table: 'weekly_measurements', id, action: 'upsert' }),
  });
}

export function deleteMeasurement(id: string) {
  const d = requireDB();
  commit({
    ...d,
    measurements: d.measurements.filter((m) => m.id !== id),
    pending: enqueue(d.pending, { table: 'weekly_measurements', id, action: 'delete' }),
  });
}

export function addAudio(a: Pick<SavedAudio, 'title' | 'url' | 'kind' | 'section'>) {
  const d = requireDB();
  const row: SavedAudio = { id: uuid(), user_id: d.userId, ...a, created_at: nowIso(), updated_at: nowIso() };
  commit({ ...d, audio: [row, ...d.audio], pending: enqueue(d.pending, { table: 'saved_audio', id: row.id, action: 'upsert' }) });
}

export function removeAudio(id: string) {
  const d = requireDB();
  commit({
    ...d,
    audio: d.audio.filter((a) => a.id !== id),
    pending: enqueue(d.pending, { table: 'saved_audio', id, action: 'delete' }),
  });
}

export function setDailyLog(date: string, patch: Partial<Pick<DailyLog, 'water_cups' | 'free_meal'>>) {
  const d = requireDB();
  const existing = d.logs.find((l) => l.date === date);
  const row: DailyLog = {
    user_id: d.userId,
    date,
    water_cups: existing?.water_cups ?? 0,
    free_meal: existing?.free_meal ?? false,
    ...patch,
    updated_at: nowIso(),
  };
  commit({
    ...d,
    logs: [...d.logs.filter((l) => l.date !== date), row],
    pending: enqueue(d.pending, { table: 'daily_logs', id: date, action: 'upsert' }),
  });
}

export function setLive(live: LiveSession | null) {
  const d = requireDB();
  commit({ ...d, live });
}

/** بعد الحفظ: تخفيض عدّاد «رجعت للنادي» */
export function consumeComeback() {
  const d = requireDB();
  const left = d.settings?.comeback_sessions_left ?? 0;
  if (left > 0) saveSettings({ comeback_sessions_left: left - 1 });
}

/* ------------------------- دمج بيانات السيرفر ------------------------- */

export interface RemoteSnapshot {
  profile: Profile | null;
  settings: Settings | null;
  sessions: Session[];
  measurements: Measurement[];
  audio: SavedAudio[];
  logs: DailyLog[];
}

/** الأحدث يفوز (بحسب updated_at)، وما فيه عملية معلّقة محليًا لا يُستبدل */
export function mergeRemote(remote: RemoteSnapshot) {
  const d = requireDB();
  const pendKey = new Set(d.pending.map((p) => `${p.table}:${p.id}`));
  // نقارن اللحظات الزمنية لا النصوص (السيرفر يعيد +00:00 بدل Z وبدقة ميكروثانية)
  const ts = (x: { updated_at: string }) => Date.parse(x.updated_at) || 0;
  const newer = (a?: { updated_at: string }, b?: { updated_at: string }) => !a || !b || ts(b) >= ts(a);

  function mergeList<T extends { updated_at: string }>(local: T[], rem: T[], idOf: (x: T) => string, table: Table): T[] {
    const out = new Map<string, T>();
    for (const l of local) out.set(idOf(l), l);
    const remIds = new Set<string>();
    for (const r of rem) {
      const id = idOf(r);
      remIds.add(id);
      if (pendKey.has(`${table}:${id}`)) continue;
      const l = out.get(id);
      if (!l || newer(l, r)) out.set(id, r);
    }
    // ما ليس على السيرفر ولا عملية معلّقة له: حُذف من جهاز آخر
    for (const [id] of [...out]) if (!remIds.has(id) && !pendKey.has(`${table}:${id}`)) out.delete(id);
    return [...out.values()];
  }

  const sessions = mergeList(d.sessions, remote.sessions, (s) => s.id, 'workout_sessions').sort((a, b) => b.started_at.localeCompare(a.started_at));
  const measurements = mergeList(d.measurements, remote.measurements, (m) => m.id, 'weekly_measurements').sort((a, b) => a.week_start.localeCompare(b.week_start));
  const audio = mergeList(d.audio, remote.audio, (a) => a.id, 'saved_audio');
  const logs = mergeList(d.logs, remote.logs, (l) => l.date, 'daily_logs');
  const settings =
    remote.settings && !pendKey.has(`user_settings:${d.userId}`) && newer(d.settings ?? undefined, remote.settings)
      ? { ...defaultSettings(d.userId), ...remote.settings }
      : d.settings;
  const profile =
    remote.profile && !pendKey.has(`profiles:${d.userId}`) && newer(d.profile ?? undefined, remote.profile) ? remote.profile : d.profile;
  commit({ ...d, sessions, measurements, audio, logs, settings, profile, lastSync: Date.now() });
}

export function removePending(done: Op[]) {
  const d = requireDB();
  const keys = new Set(done.map((o) => `${o.table}:${o.id}:${o.ts}`));
  commit({ ...d, pending: d.pending.filter((p) => !keys.has(`${p.table}:${p.id}:${p.ts}`)) });
}

/** تصدير كل البيانات (نسخة احتياطية بيد المستخدم) */
export function exportAll(): string {
  const d = requireDB();
  const { live: _live, pending: _pending, ...rest } = d;
  void _live;
  void _pending;
  return JSON.stringify(rest, null, 2);
}
