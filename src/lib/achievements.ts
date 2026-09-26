import type { GymVisit, Session } from './types';
import type { IconName } from '../components/Icon';
import { weekStartOf } from './dates';

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  icon: IconName;
  unlocked: boolean;
}

function completedAttendanceWeeks(visits: GymVisit[]): number {
  const groups = new Map<string, Set<string>>();
  for (const v of visits) {
    const wk = weekStartOf(v.date, 0);
    if (!groups.has(wk)) groups.set(wk, new Set());
    groups.get(wk)!.add(v.date);
  }
  return [...groups.values()].filter((days) => days.size >= 4).length;
}

export function buildAchievements(_sessions: Session[], visits: GymVisit[], streak4of4: number, _weeksComplete: number): Achievement[] {
  const endedVisits = visits.filter((v) => !!v.left_at);
  const totalVisitSeconds = endedVisits.reduce((s, v) => s + Math.max(0, v.duration_seconds || 0), 0);
  const attendanceWeeks = completedAttendanceWeeks(visits);
  return [
    { id: 'first', title: 'البداية', detail: 'أول حضور مسجّل', icon: 'play', unlocked: visits.length >= 1 },
    { id: 'first-44', title: 'أول 4/4', detail: 'أربعة أيام حضور في أسبوع', icon: 'check', unlocked: attendanceWeeks >= 1 || streak4of4 >= 1 },
    { id: 'streak2', title: 'ثبات 🔥', detail: 'أسبوعان متتاليان 4/4', icon: 'flag', unlocked: streak4of4 >= 2 },
    { id: 'month', title: 'شهر بلا تفريط', detail: '4 أسابيع متتالية 4/4', icon: 'calendar', unlocked: streak4of4 >= 4 },
    { id: 'visits10', title: '10 زيارات', detail: 'عشر مرات للنادي', icon: 'target', unlocked: visits.length >= 10 },
    { id: '1000m', title: '1000 دقيقة', detail: 'وقت متراكم في النادي', icon: 'clock', unlocked: totalVisitSeconds >= 60_000 },
  ];
}
