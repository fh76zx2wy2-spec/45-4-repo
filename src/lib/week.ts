/**
 * منطق الأسبوع والالتزام — دوال نقية (قابلة للاختبار) لا تعتمد على الواجهة.
 * الأسبوع الافتراضي: من الأحد إلى السبت (يمكن تغييره من الإعدادات).
 */
import { DAYS, PROGRAM_WEEKS, SUGGESTED_WEEKDAYS, WEEKLY_GOAL, phaseForWeek, type DayId, type PhaseDef } from '../data/program';
import { addDaysISO, diffDaysISO, fromISO, hijriMonthLength, hijriOf, weekIndexBetween, weekStartOf, weekdayOf } from './dates';
import type { Measurement, Session, Settings } from './types';

/** الجلسات التي تُحتسب ضمن هدف 4/4: الأساسية والمختصرة (لا الإضافية) */
export const isCounted = (s: Session) => s.session_type === 'normal' || s.session_type === 'short';

export interface WeekInfo {
  weekStart: string;
  weekEnd: string;
  counted: Session[];
  extras: Session[];
  /** الأيام المنجزة (1..4) */
  doneDays: Set<DayId>;
  count: number;
  complete: boolean;
}

export function sessionsInWeek(sessions: Session[], weekStart: string): Session[] {
  const end = addDaysISO(weekStart, 6);
  return sessions.filter((s) => s.date >= weekStart && s.date <= end);
}

export function weekInfo(sessions: Session[], weekStart: string): WeekInfo {
  const inWeek = sessionsInWeek(sessions, weekStart);
  const counted = inWeek.filter(isCounted).sort((a, b) => a.started_at.localeCompare(b.started_at));
  const doneDays = new Set<DayId>();
  for (const s of counted) if (s.workout_day) doneDays.add(s.workout_day);
  // جلسات أساسية بلا يوم (لا يفترض حدوثها) تُحسب واحدة لكل جلسة
  const orphan = counted.filter((s) => !s.workout_day).length;
  const count = Math.min(WEEKLY_GOAL, doneDays.size + orphan);
  return {
    weekStart,
    weekEnd: addDaysISO(weekStart, 6),
    counted,
    extras: inWeek.filter((s) => s.session_type === 'extra'),
    doneDays,
    count,
    complete: count >= WEEKLY_GOAL,
  };
}

/** اليوم المقترح: أصغر يوم لم يُنجَز هذا الأسبوع، أو null إذا اكتملت الأيام الأربعة */
export function suggestedDay(info: WeekInfo): DayId | null {
  for (const d of DAYS) if (!info.doneDays.has(d.id)) return d.id;
  return null;
}

export function sessionsWord(n: number): string {
  if (n === 0) return 'لا جلسات';
  if (n === 1) return 'جلسة واحدة';
  if (n === 2) return 'جلستان';
  if (n <= 10) return `${n} جلسات`;
  return `${n} جلسة`;
}

/** «جلستين» بحالة النصب/الجر */
export function sessionsWordAcc(n: number): string {
  if (n === 1) return 'جلسة واحدة';
  if (n === 2) return 'جلستين';
  return sessionsWord(n);
}

/** رسالة الأسبوع الجاري — بدون كلمة «تفريط» أثناء الأسبوع */
export function currentWeekMessage(count: number): { title: string; sub: string } {
  const left = Math.max(0, WEEKLY_GOAL - count);
  if (left === 0) return { title: 'اكتمل هدف الأسبوع ✓', sub: 'أحسنت — أسبوع كامل 4/4' };
  const title =
    count === 0 ? 'أسبوع جديد — أربع جلسات بانتظارك' : `أنجزت ${sessionsWordAcc(count)} هذا الأسبوع`;
  const sub = left === 1 ? 'باقي لك جلسة واحدة' : left === 2 ? 'باقي لك جلستان' : `باقي لك ${left} جلسات`;
  return { title, sub };
}

/** رسالة قصيرة لدفعة لطيفة: «جلستان تفصلانك عن 4/4» */
export function nudgeMessage(count: number): string | null {
  const left = WEEKLY_GOAL - count;
  if (left <= 0) return null;
  if (left === 1) return 'جلسة واحدة تفصلك عن 4/4';
  if (left === 2) return 'جلستان تفصلانك عن 4/4';
  return `${left} جلسات تفصلك عن 4/4`;
}

/** رسالة أسبوع منتهٍ — كما طلب المستخدم: «تفريط — أنهيت 3 من 4 جلسات» بلغة هادئة */
export function pastWeekMessage(count: number): { title: string; sub: string; ok: boolean } {
  if (count >= WEEKLY_GOAL) return { title: 'اكتمل هدف الأسبوع ✓', sub: '4/4', ok: true };
  const missed = WEEKLY_GOAL - count;
  const missedTxt = missed === 1 ? 'فاتتك جلسة واحدة' : missed === 2 ? 'فاتتك جلستان' : `فاتتك ${missed} جلسات`;
  if (count === 0) return { title: 'تفريط — لم تُنهِ جلسات هذا الأسبوع', sub: missedTxt, ok: false };
  if (count === 1) return { title: 'تفريط — أنهيت جلسة واحدة من أربع', sub: missedTxt, ok: false };
  if (count === 2) return { title: 'تفريط — أنهيت جلستين من أربع', sub: missedTxt, ok: false };
  return { title: `تفريط — أنهيت ${count} من 4 جلسات`, sub: missedTxt, ok: false };
}

/* ---------------- سلسلة الالتزام ---------------- */

export interface StreakInfo {
  current: number;
  best: number;
}

export function streaks(sessions: Session[], today: string, weekStartDay: number): StreakInfo {
  const counted = sessions.filter(isCounted);
  if (!counted.length) return { current: 0, best: 0 };
  const firstWeek = weekStartOf(counted.reduce((m, s) => (s.date < m ? s.date : m), counted[0].date), weekStartDay);
  const curWeek = weekStartOf(today, weekStartDay);
  const totalWeeks = weekIndexBetween(firstWeek, curWeek) + 1;
  const flags: boolean[] = [];
  for (let i = 0; i < totalWeeks; i++) flags.push(weekInfo(sessions, addDaysISO(firstWeek, i * 7)).complete);
  // الأسبوع الجاري لا يقطع السلسلة إن لم يكتمل بعد
  let best = 0;
  let run = 0;
  for (let i = 0; i < flags.length; i++) {
    const isCurrent = i === flags.length - 1;
    if (flags[i]) {
      run++;
      best = Math.max(best, run);
    } else if (!isCurrent) {
      run = 0;
    }
  }
  // السلسلة الحالية: الأسابيع الكاملة المتتالية المنتهية عند آخر أسبوع (أو الأسبوع الجاري إن اكتمل)
  let current = 0;
  let i = flags.length - 1;
  if (!flags[i]) i--; // الأسبوع الجاري غير مكتمل بعد: ابدأ من السابق
  for (; i >= 0 && flags[i]; i--) current++;
  return { current, best: Math.max(best, current) };
}

/* ---------------- أسبوع البرنامج والمرحلة ---------------- */

export function programStartWeek(settings: Settings | null, sessions: Session[], today: string): string {
  const ws = settings?.week_start ?? 0;
  if (settings?.program_start_date) return weekStartOf(settings.program_start_date, ws);
  const counted = sessions.filter((s) => s.session_type !== 'extra');
  if (counted.length) {
    const first = counted.reduce((m, s) => (s.date < m ? s.date : m), counted[0].date);
    return weekStartOf(first, ws);
  }
  return weekStartOf(today, ws);
}

export interface ProgramPosition {
  /** رقم الأسبوع (1..∞) */
  week: number;
  /** الأسبوع المعروض ضمن 12 */
  shown: number;
  phase: PhaseDef;
  /** أنهى الـ 12 أسبوعًا؟ */
  beyond: boolean;
  startWeek: string;
}

export function programPosition(settings: Settings | null, sessions: Session[], today: string): ProgramPosition {
  const ws = settings?.week_start ?? 0;
  const startWeek = programStartWeek(settings, sessions, today);
  const cur = weekStartOf(today, ws);
  const week = Math.max(1, weekIndexBetween(startWeek, cur) + 1);
  return { week, shown: Math.min(week, PROGRAM_WEEKS), phase: phaseForWeek(week), beyond: week > PROGRAM_WEEKS, startWeek };
}

/** رقم أسبوع البرنامج لتاريخ معيّن */
export function programWeekOf(dateISO: string, startWeek: string, weekStartDay: number): number {
  return Math.max(1, weekIndexBetween(startWeek, weekStartOf(dateISO, weekStartDay)) + 1);
}

/* ---------------- هل عليّ تمرين اليوم؟ ---------------- */

export interface DayAdvice {
  kind: 'done-week' | 'done-today' | 'must' | 'train' | 'rest';
  label: string;
  detail: string;
}

export function dayAdvice(today: string, info: WeekInfo, trainedToday: boolean, weekStartDay: number): DayAdvice {
  const need = WEEKLY_GOAL - info.count;
  if (need <= 0) {
    return { kind: 'done-week', label: 'اكتمل هدف الأسبوع', detail: 'يمكنك جلسة إضافية اختيارية إن أحببت.' };
  }
  if (trainedToday) {
    return { kind: 'done-today', label: 'أنجزت جلسة اليوم ✓', detail: 'الأفضل ألا تتوالى الأيام؛ خذ راحة إن استطعت.' };
  }
  const daysLeft = 7 - diffDaysISO(weekStartOf(today, weekStartDay), today);
  if (need > daysLeft) {
    return { kind: 'must', label: 'اليوم يوم تمرين', detail: 'آخر أيام الأسبوع — كل جلسة تُحسب لك، وأسبوعك القادم فرصة جديدة.' };
  }
  if (need === daysLeft) {
    return { kind: 'must', label: 'اليوم يوم تمرين', detail: `تحتاج ${sessionsWord(need)} في ${daysLeft === 1 ? 'يوم واحد' : daysLeft === 2 ? 'يومين' : daysLeft + ' أيام'} لتكتمل 4/4.` };
  }
  if (SUGGESTED_WEEKDAYS.includes(weekdayOf(today))) {
    return { kind: 'train', label: 'يوم تمرين مقترح', detail: 'من أيامك المقترحة: الأحد · الثلاثاء · الخميس · السبت.' };
  }
  return { kind: 'rest', label: 'يوم راحة مقترح', detail: 'يمكنك السباحة 30 دقيقة بهدوء أو المشي الخفيف — أو التمرين إن كان يومك مناسبًا.' };
}

/* ---------------- إحصائيات ---------------- */

export interface Stats {
  totalSessions: number;
  countedSessions: number;
  extraSessions: number;
  weeksComplete: number;
  cardioMinutes: number;
  adherence: number | null;
  avgDurationMin: number | null;
  streak: StreakInfo;
  lastSessionDate: string | null;
}

export function computeStats(sessions: Session[], today: string, weekStartDay: number): Stats {
  const counted = sessions.filter(isCounted);
  const cardioMinutes = Math.round(sessions.reduce((a, s) => a + (s.cardio_seconds || 0), 0) / 60);
  const totalSessions = sessions.length;
  let adherence: number | null = null;
  let weeksComplete = 0;
  if (sessions.length) {
    const firstWeek = weekStartOf(sessions.reduce((m, s) => (s.date < m ? s.date : m), sessions[0].date), weekStartDay);
    const curWeek = weekStartOf(today, weekStartDay);
    const n = weekIndexBetween(firstWeek, curWeek); // أسابيع منتهية
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const w = weekInfo(sessions, addDaysISO(firstWeek, i * 7));
      sum += w.count;
      if (w.complete) weeksComplete++;
    }
    const curInfo = weekInfo(sessions, curWeek);
    if (curInfo.complete) weeksComplete++;
    if (n > 0) adherence = Math.round((sum / (n * WEEKLY_GOAL)) * 100);
    else adherence = Math.round((curInfo.count / WEEKLY_GOAL) * 100);
  }
  const durs = sessions.filter((s) => s.duration_seconds > 60);
  const avgDurationMin = durs.length ? Math.round(durs.reduce((a, s) => a + s.duration_seconds, 0) / durs.length / 60) : null;
  const last = sessions.length ? sessions.reduce((m, s) => (s.date > m ? s.date : m), sessions[0].date) : null;
  return {
    totalSessions,
    countedSessions: counted.length,
    extraSessions: totalSessions - counted.length,
    weeksComplete,
    cardioMinutes,
    adherence,
    avgDurationMin,
    streak: streaks(sessions, today, weekStartDay),
    lastSessionDate: last,
  };
}

/** أفضل وقت أسبوعي: لا يُعرض إلا بعد وجود بيانات كافية */
export function usualTime(sessions: Session[]): string | null {
  const s = sessions.filter((x) => x.started_at && x.duration_seconds > 300);
  if (s.length < 8) return null;
  const perDay = new Array(7).fill(0) as number[];
  const perPeriod: Record<string, number> = { صباحًا: 0, ظهرًا: 0, عصرًا: 0, مساءً: 0, ليلًا: 0 };
  for (const x of s) {
    const dt = new Date(x.started_at);
    perDay[fromISO(x.date).getDay()]++;
    const h = dt.getHours();
    const p = h < 11 ? 'صباحًا' : h < 15 ? 'ظهرًا' : h < 18 ? 'عصرًا' : h < 22 ? 'مساءً' : 'ليلًا';
    perPeriod[p]++;
  }
  const dayRank = perDay.map((n, i) => ({ n, i })).sort((a, b) => b.n - a.n);
  const top = dayRank.filter((d) => d.n / s.length >= 0.22).slice(0, 2);
  if (!top.length) return null;
  const period = Object.entries(perPeriod).sort((a, b) => b[1] - a[1])[0];
  if (period[1] / s.length < 0.4) return null;
  const names = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const days = top.map((d) => names[d.i]);
  return `غالبًا تتمرن ${period[0] === 'صباحًا' ? 'صباح' : period[0] === 'ظهرًا' ? 'ظهر' : period[0] === 'عصرًا' ? 'عصر' : period[0] === 'مساءً' ? 'مساء' : 'ليل'} ${days.join(' و')}.`;
}

/* ---------------- ملخص الشهر الهجري ---------------- */

export interface MonthSummary {
  visits: number;
  base: number;
  extra: number;
  weeksComplete: number;
}

export function monthSummary(sessions: Session[], monthStartISO: string, weekStartDay: number, today: string): MonthSummary {
  const len = hijriMonthLength(monthStartISO);
  const end = addDaysISO(monthStartISO, len - 1);
  const inMonth = sessions.filter((s) => s.date >= monthStartISO && s.date <= end);
  const base = inMonth.filter(isCounted).length;
  const extra = inMonth.length - base;
  // الأسابيع التي تنتهي داخل الشهر (آخر يوم في الأسبوع ضمن الشهر)
  let weeksComplete = 0;
  let w = weekStartOf(monthStartISO, weekStartDay);
  for (let i = 0; i < 7; i++) {
    const wEnd = addDaysISO(w, 6);
    // الأسبوع يُنسب للشهر الذي ينتهي فيه؛ والأسبوع الجاري المكتمل يُنسب لشهر اليوم
    const attrib = wEnd <= today ? wEnd : today;
    if (attrib >= monthStartISO && attrib <= end) {
      if (weekInfo(sessions, w).complete) weeksComplete++;
    }
    w = addDaysISO(w, 7);
    if (w > end) break;
  }
  return { visits: inMonth.length, base, extra, weeksComplete };
}

/** هل الشهر الهجري الحالي في آخره، أو الجديد في أوله؟ لعرض بطاقة «ملخص الشهر» */
export function monthRecapTarget(today: string): { monthStart: string; label: 'ending' | 'ended' } | null {
  const h = hijriOf(today);
  const start = addDaysISO(today, -(h.d - 1));
  const len = hijriMonthLength(start);
  if (h.d >= len - 1) return { monthStart: start, label: 'ending' };
  if (h.d <= 2) {
    const prevStart = addDaysISO(start, -1);
    return { monthStart: addDaysISO(prevStart, -(hijriOf(prevStart).d - 1)), label: 'ended' };
  }
  return null;
}

/* ---------------- قياسات الوزن ---------------- */

export function weightSeries(measurements: Measurement[]): Measurement[] {
  return measurements.filter((m) => m.weight_kg != null).sort((a, b) => a.week_start.localeCompare(b.week_start));
}

/** إن ثبت الوزن أسبوعين كاملين → تلميح PDF (لا تغيير تلقائي) */
export function weightStalled(series: Measurement[]): boolean {
  if (series.length < 3) return false;
  const last = series.slice(-3).map((m) => m.weight_kg as number);
  return Math.max(...last) - Math.min(...last) <= 0.3;
}
