import { useEffect, useMemo, useState } from 'react';
import { useDB, defaultSettings } from './store';
import { todayISO, weekStartOf } from './dates';
import { computeStats, dayAdvice, isCounted, programPosition, suggestedDay, weekInfo } from './week';
import type { Session } from './types';

/** تاريخ اليوم (ISO) — يتحدّث تلقائيًا عند منتصف الليل أو العودة للتطبيق */
export function useToday(): string {
  const [t, setT] = useState(() => todayISO());
  useEffect(() => {
    const check = () => setT((prev) => {
      const n = todayISO();
      return n === prev ? prev : n;
    });
    const id = setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return t;
}

export function useDerived() {
  const db = useDB();
  const today = useToday();
  return useMemo(() => {
    const settings = db?.settings ?? defaultSettings(db?.userId ?? 'x');
    const sessions: Session[] = db?.sessions ?? [];
    const weekStartDay = settings.week_start;
    const curWeekStart = weekStartOf(today, weekStartDay);
    const info = weekInfo(sessions, curWeekStart);
    const position = programPosition(settings, sessions, today);
    const trainedToday = sessions.some((s) => s.date === today && isCounted(s));
    const suggested = suggestedDay(info);
    const advice = dayAdvice(today, info, trainedToday, weekStartDay);
    const stats = computeStats(sessions, today, weekStartDay);
    return { db, settings, sessions, today, weekStartDay, curWeekStart, info, position, trainedToday, suggested, advice, stats };
  }, [db, today]);
}

export type Derived = ReturnType<typeof useDerived>;

/** آخر وزن استُخدم لكل جهاز (لعرضه كمرجع في التمرين) */
export function lastWeights(sessions: Session[]): Record<string, number> {
  const out: Record<string, number> = {};
  const sorted = [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at));
  for (const s of sorted) {
    for (const e of s.exercises) {
      const key = e.substituted_for ? e.exercise_id : e.exercise_id;
      if (e.weight_kg != null && out[key] == null) out[key] = e.weight_kg;
    }
  }
  return out;
}

/**
 * هل يُعرض تلميح زيادة الوزن؟ إذا قيّمتَ جلستين أخيرتين لنفس اليوم بأنها «سهلة».
 * لا يغيّر الوزن تلقائيًا أبدًا.
 */
export function shouldHintWeight(sessions: Session[], day: number | null): boolean {
  if (!day) return false;
  const last = sessions
    .filter((s) => s.workout_day === day && s.session_type !== 'extra')
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, 2);
  return last.length === 2 && last.every((s) => s.difficulty === 'easy');
}
