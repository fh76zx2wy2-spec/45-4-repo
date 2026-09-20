import { describe, expect, it } from 'vitest';
import { addDaysISO, formatHijri, hijriMonthGrid, hijriMonthLength, hijriMonthStart, isUmAlQura, shiftHijriMonth, todayISO, weekStartOf } from '../dates';

describe('dates', () => {
  it('ISO ميلادي محلي بلا انزياح المنطقة الزمنية', () => {
    expect(todayISO(new Date(2026, 8, 19, 23, 59))).toBe('2026-09-19');
    expect(todayISO(new Date(2026, 8, 19, 0, 1))).toBe('2026-09-19');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('بداية الأسبوع (أحد/اثنين/سبت)', () => {
    expect(weekStartOf('2026-09-19', 0)).toBe('2026-09-13'); // السبت → الأحد
    expect(weekStartOf('2026-09-19', 6)).toBe('2026-09-19');
    expect(weekStartOf('2026-09-19', 1)).toBe('2026-09-14');
  });
  it('التاريخ الهجري (أم القرى إن توفّر)', () => {
    if (!isUmAlQura()) return;
    const t = formatHijri('2026-09-19');
    expect(t).toMatch(/ربيع الآخر 1448/);
  });
  it('شبكة الشهر الهجري متّسقة والتنقل للشهر السابق', () => {
    const start = hijriMonthStart('2026-09-19');
    const len = hijriMonthLength(start);
    expect([29, 30]).toContain(len);
    const grid = hijriMonthGrid(start, 0);
    expect(grid.every((r) => r.length === 7)).toBe(true);
    expect(grid.flat().filter((c) => (c as { inMonth?: boolean }).inMonth !== false && c != null).length).toBeGreaterThanOrEqual(len);
    const prev = shiftHijriMonth(start, -1);
    expect(prev < start).toBe(true);
    expect(addDaysISO(prev, hijriMonthLength(prev))).toBe(start);
  });
});
