import { describe, expect, it } from 'vitest';
import { resolvePlan } from '../plan';
import { markStageDone, completeSet, markBusy, pendingDeferred, startLiveFromPlan, progressFraction, skipStage } from '../live';
import { DAYS } from '../../data/program';

const T0 = 1_800_000_000_000;
/** ينهي المراحل الحالية حتى نصل إلى أول جهاز حديد */
function toFirstMachine(l: ReturnType<typeof fresh>) {
  let guard = 0;
  while (l.stages[l.cur]?.kind !== 'exercise' && guard++ < 50) l = markStageDone(l);
  return l;
}
function fresh(day: 1 | 2 | 3 | 4 = 1) {
  return startLiveFromPlan(resolvePlan(day, 1, null), { programWeek: 1, type: 'normal', now: T0, date: '2026-09-19' });
}

describe('live', () => {
  it('الخطة من ملف البيانات: 4 أيام والجلسة تبدأ بالكارديو', () => {
    expect(DAYS.length).toBe(4);
    const l = fresh(1);
    expect(l.stages[0].kind).toBe('cardio');
    expect(l.stages.length).toBeGreaterThan(3);
  });
  it('إنهاء سيت يبدأ راحة تلقائيًا، والأخير لا راحة بعده', () => {
    let l = fresh(1);
    // انتقل إلى أول جهاز
    l = toFirstMachine(l);
    const st = l.stages[l.cur];
    expect(st.kind).toBe('exercise');
    const r1 = completeSet(l, T0);
    expect(r1.restStarted).toBe(st.sets > 1);
    if (st.sets > 1) expect(r1.live.rest!.total).toBe(st.rest);
    let cur = r1.live;
    for (let i = 1; i < st.sets; i++) cur = completeSet({ ...cur, rest: null }, T0).live;
    expect(cur.stages[l.cur].status).toBe('done');
  });
  it('«الجهاز مشغول» يؤجّله ويبقى مطلوبًا في النهاية', () => {
    let l = fresh(1);
    l = toFirstMachine(l);
    const name = l.stages[l.cur].machineId;
    const b = markBusy(l);
    expect(b.stages[b.cur].machineId).not.toBe(name);
    expect(pendingDeferred(b).some((s) => s.machineId === name)).toBe(true);
  });
  it('تقدّم الجلسة بين 0 و1', () => {
    const l = fresh(2);
    const p = progressFraction(l);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
    expect(progressFraction(skipStage(l))).toBeGreaterThanOrEqual(p);
  });
  it('اليوم 4 دائري بجولات', () => {
    const l = fresh(4);
    expect(l.stages.some((s) => s.round)).toBe(true);
  });
});
