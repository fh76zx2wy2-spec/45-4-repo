import { describe, expect, it } from 'vitest';
import { currentWeekMessage, dayAdvice, isCounted, pastWeekMessage, streaks, suggestedDay, weekInfo } from '../week';
import type { Session } from '../types';

let n = 0;
function mk(date: string, day: 1 | 2 | 3 | 4 | null, type: Session['session_type'] = 'normal'): Session {
  n++;
  return {
    id: `s${n}`, user_id: 'u', date, workout_day: day, program_week: 1, duration_seconds: 2700, cardio_seconds: 1200,
    completed: true, early_finish: false, session_type: type, extra_kind: null, short_minutes: null, difficulty: null, notes: '',
    started_at: `${date}T10:00:00.000Z`, ended_at: `${date}T10:45:00.000Z`, created_at: `${date}T10:45:00.000Z`, updated_at: `${date}T10:45:00.000Z`,
  } as unknown as Session;
}

// 2026-09-13 = الأحد، الأسبوع 13..19 سبتمبر
const W = '2026-09-13';

describe('week', () => {
  it('الجلسة الإضافية لا تُحتسب ضمن 4/4', () => {
    expect(isCounted(mk(W, null, 'extra'))).toBe(false);
    const info = weekInfo([mk(W, 1), mk('2026-09-14', null, 'extra')], W);
    expect(info.count).toBe(1);
    expect(info.extras.length).toBe(1);
  });
  it('اليوم نفسه مرتين يُحتسب مرة واحدة', () => {
    expect(weekInfo([mk(W, 1), mk('2026-09-14', 1)], W).count).toBe(1);
  });
  it('اليوم المقترح: أول يوم لم يُنجز، وليس عشوائيًا', () => {
    expect(suggestedDay(weekInfo([], W))).toBe(1);
    expect(suggestedDay(weekInfo([mk(W, 1)], W))).toBe(2);
    expect(suggestedDay(weekInfo([mk(W, 2)], W))).toBe(1);
    expect(suggestedDay(weekInfo([mk(W, 1), mk(W, 2), mk(W, 3), mk(W, 4)], W))).toBeNull();
  });
  it('الأسبوع الجديد يبدأ من 0 ولا يمسّ السجل', () => {
    const all = [mk(W, 1), mk('2026-09-14', 2)];
    expect(weekInfo(all, '2026-09-20').count).toBe(0);
    expect(weekInfo(all, W).count).toBe(2);
  });
  it('4/4 يكتمل الأسبوع', () => {
    const info = weekInfo([mk(W, 1), mk(W, 2), mk(W, 3), mk(W, 4)], W);
    expect(info.complete).toBe(true);
    expect(currentWeekMessage(4).title).toContain('اكتمل هدف الأسبوع');
  });
  it('أثناء الأسبوع لا تظهر كلمة «تفريط»', () => {
    for (let c = 0; c < 4; c++) {
      const m = currentWeekMessage(c);
      expect(m.title + m.sub).not.toContain('تفريط');
    }
    expect(currentWeekMessage(1).sub).toBe('باقي لك 3 جلسات'.replace('3 جلسات', '3 جلسات'));
  });
  it('رسائل الأسبوع المنتهي كما طُلب', () => {
    expect(pastWeekMessage(3)).toMatchObject({ title: 'تفريط — أنهيت 3 من 4 جلسات', sub: 'فاتتك جلسة واحدة' });
    expect(pastWeekMessage(2).title).toBe('تفريط — أنهيت جلستين من أربع');
    expect(pastWeekMessage(4).ok).toBe(true);
  });
  it('السلسلة: أسبوع جارٍ غير مكتمل لا يقطعها', () => {
    const full = (w: string) => [mk(w, 1), mk(w, 2), mk(w, 3), mk(w, 4)];
    const s = [...full('2026-08-30'), ...full('2026-09-06'), mk(W, 1)];
    expect(streaks(s, '2026-09-15', 0)).toEqual({ current: 2, best: 2 });
  });
  it('السلسلة: الأسبوع الناقص المنتهي يقطعها ويبقى أفضل رقم', () => {
    const full = (w: string) => [mk(w, 1), mk(w, 2), mk(w, 3), mk(w, 4)];
    const s = [...full('2026-08-23'), ...full('2026-08-30'), mk('2026-09-06', 1), ...full(W)];
    const r = streaks(s, '2026-09-19', 0);
    expect(r.current).toBe(1);
    expect(r.best).toBe(2);
  });
  it('نصيحة اليوم لا تقول «تحتاج 4 جلسات في يوم واحد»', () => {
    const a = dayAdvice('2026-09-19', weekInfo([], W), false, 0);
    expect(a.detail ?? '').not.toContain('في يوم واحد');
  });
});
