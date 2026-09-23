import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { WEEKLY_GOAL } from '../data/program';
import { useDerived } from '../lib/derived';
import { deleteGymVisit } from '../lib/store';
import {
  formatGreg,
  formatHijri,
  formatHijriMonth,
  GREG_MONTHS,
  hijriMonthGrid,
  hijriMonthLength,
  hijriMonthStart,
  hijriOf,
  addDaysISO,
  shiftHijriMonth,
  WEEKDAYS_SHORT,
  weekdayName,
  fromISO,
} from '../lib/dates';
import { isCounted, monthSummary, weekInfo } from '../lib/week';
import type { Session } from '../lib/types';
import { Icon } from '../components/Icon';
import { Sheet, useToast } from '../components/ui';
import { durationLabel, minutesLabel, DIFFICULTY_LABEL, timeLabel } from '../lib/format';
import { EXTRA_BY_ID, DAY_BY_ID } from '../data/program';

function sessionTitle(s: Session): string {
  if (s.session_type === 'extra') return EXTRA_BY_ID[s.extra_kind ?? '']?.title ?? 'جلسة إضافية';
  return s.workout_day ? `اليوم ${s.workout_day} — ${DAY_BY_ID[s.workout_day].focus}` : 'جلسة';
}

export default function CalendarScreen() {
  const d = useDerived();
  const { toast } = useToast();
  const { today, sessions, weekStartDay } = d;
  const visits = d.db?.visits ?? [];
  const thisMonth = hijriMonthStart(today);
  const [monthStart, setMonthStart] = useState(thisMonth);
  const [selected, setSelected] = useState<string | null>(null);

  const grid = useMemo(() => hijriMonthGrid(monthStart, weekStartDay), [monthStart, weekStartDay]);
  const h = hijriOf(monthStart);
  const len = hijriMonthLength(monthStart);
  const lastDay = addDaysISO(monthStart, len - 1);
  const g1 = fromISO(monthStart);
  const g2 = fromISO(lastDay);
  const gregRange =
    g1.getMonth() === g2.getMonth() ? `${GREG_MONTHS[g1.getMonth()]} ${g1.getFullYear()}` : `${GREG_MONTHS[g1.getMonth()]} – ${GREG_MONTHS[g2.getMonth()]} ${g2.getFullYear()}`;

  const byDate = useMemo(() => {
    const m = new Map<string, Session[]>();
    for (const s of sessions) m.set(s.date, [...(m.get(s.date) ?? []), s]);
    return m;
  }, [sessions]);

  const byVisitDate = useMemo(() => {
    const m = new Map<string, typeof visits>();
    for (const v of visits) m.set(v.date, [...(m.get(v.date) ?? []), v]);
    return m;
  }, [visits]);

  const ms = monthSummary(sessions, monthStart, weekStartDay, today);
  const isCurrent = monthStart === thisMonth;
  const isPast = monthStart < thisMonth;
  const dayNames = [...WEEKDAYS_SHORT.slice(weekStartDay), ...WEEKDAYS_SHORT.slice(0, weekStartDay)];
  const selSessions = selected ? byDate.get(selected) ?? [] : [];
  const selVisits = selected ? byVisitDate.get(selected) ?? [] : [];
  const monthVisits = visits.filter((v) => v.date >= monthStart && v.date <= lastDay);
  const monthVisitSeconds = monthVisits.reduce((sum, v) => sum + (v.left_at ? v.duration_seconds : Math.max(0, Math.floor((Date.now() - Date.parse(v.arrived_at)) / 1000))), 0);

  return (
    <div className="page stack">
      <div className="topbar">
        <h1>التقويم</h1>
        {!isCurrent && (
          <button className="btn btn-sm btn-soft" onClick={() => setMonthStart(thisMonth)}>اليوم</button>
        )}
      </div>

      <section className="card cal">
        <div className="cal-head">
          <button className="icon-btn" onClick={() => setMonthStart(shiftHijriMonth(monthStart, -1))} aria-label="الشهر السابق">
            <Icon name="chevR" />
          </button>
          <div className="center">
            <div className="cal-month disp">{formatHijriMonth(h.y, h.m)} هـ</div>
            <div className="eyebrow">{gregRange} م</div>
          </div>
          <button className="icon-btn" onClick={() => setMonthStart(shiftHijriMonth(monthStart, 1))} aria-label="الشهر التالي">
            <Icon name="chevL" />
          </button>
        </div>

        <div className="cal-grid cal-dow" aria-hidden="true">
          {dayNames.map((n) => (
            <span key={n}>{n}</span>
          ))}
          <span />
        </div>

        <div className="cal-rows">
          {grid.map((row) => {
            const rowStart = row[0].iso;
            const rowEnd = row[6].iso;
            const wk = weekInfo(sessions, rowStart);
            const started = rowStart <= today && (rowStart >= d.position.startWeek || wk.counted.length + wk.extras.length > 0);
            const over = rowEnd < today;
            return (
              <div className="cal-grid" key={rowStart} role="row">
                {row.map((c) => {
                  const list = byDate.get(c.iso) ?? [];
                  const base = list.some(isCounted);
                  const extra = list.some((s) => s.session_type === 'extra');
                  const hasVisit = (byVisitDate.get(c.iso) ?? []).length > 0;
                  const isToday = c.iso === today;
                  const cls = ['cal-cell', !c.inMonth ? 'out' : '', base ? 'base' : extra ? 'extra' : '', hasVisit ? 'has-visit' : '', isToday ? 'today' : ''].join(' ');
                  const label = `${formatHijri(c.iso)} — ${formatGreg(c.iso)}${base ? ' — تمرين' : extra ? ' — جلسة إضافية' : ''}${hasVisit ? ' — حضور النادي مسجّل' : ''}`;
                  return (
                    <button
                      key={c.iso}
                      className={cls}
                      disabled={!c.inMonth}
                      onClick={() => setSelected(c.iso)}
                      aria-label={label}
                      aria-current={isToday ? 'date' : undefined}
                    >
                      <span className="hd num">{c.hijriDay}</span>
                      <span className="gd num">{c.gregDay}</span>
                      {c.inMonth && base && <span className="badge"><Icon name="check" size={11} strokeWidth={3.4} /></span>}
                      {c.inMonth && base && extra && <span className="dot2" />}
                      {c.inMonth && hasVisit && <span className="visit-mark" aria-hidden="true"><Icon name="clock" size={9} /></span>}
                    </button>
                  );
                })}
                <div className={`cal-week ${!started ? 'none' : wk.complete ? 'ok' : over ? 'miss' : 'cur'}`} title="أسبوع">
                  {started && (
                    <>
                      <b className="num">{wk.count}/{WEEKLY_GOAL}</b>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="cal-legend">
          <span><i className="lg base" /> يوم تمرين</span>
          <span><i className="lg extra" /> جلسة إضافية</span>
          <span><i className="lg today" /> اليوم</span>
          <span><i className="lg visit" /> تسجيل حضور</span>
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
          الرقم الكبير هجري (أم القرى) والصغير ميلادي. العمود الجانبي يعرض إنجاز كل أسبوع.
        </p>
      </section>

      <section className="card">
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div className="card-title">ملخص الشهر</div>
          <span className="tag">{isCurrent ? 'الشهر الحالي' : isPast ? 'شهر منتهٍ' : 'قادم'}</span>
        </div>
        <div className="fstats">
          <div><b className="num">{ms.visits}</b><span>جلسات مسجّلة</span></div>
          <div><b className="num">{ms.base}</b><span>جلسات أساسية</span></div>
          <div><b className="num">{ms.weeksComplete}</b><span>أسابيع 4/4</span></div>
        </div>
        {monthVisits.length > 0 && (
          <div className="calendar-attendance-summary">
            <Icon name="clock" size={18} />
            <span>تسجيل الوصول: <b>{monthVisits.length}</b> {monthVisits.length === 1 ? 'زيارة' : 'زيارات'} · الإجمالي <b>{durationLabel(monthVisitSeconds)}</b></span>
          </div>
        )}
        {ms.extra > 0 && <p className="muted" style={{ fontSize: 13.5, marginTop: 10 }}>+ {ms.extra} {ms.extra === 1 ? 'جلسة إضافية' : 'جلسات إضافية'}</p>}
        {ms.visits === 0 && monthVisits.length === 0 && (isPast || isCurrent) && <p className="muted" style={{ fontSize: 13.5, marginTop: 10 }}>لا جلسات أو زيارات مسجّلة في هذا الشهر.</p>}
      </section>

      <Link to="/history" className="btn btn-ghost btn-block">سجل الجلسات</Link>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected ? formatHijri(selected) : ''}>
        {selected && (
          <>
            <p className="muted" style={{ fontSize: 14, marginTop: -8 }}>{weekdayName(selected)} · {formatGreg(selected)} م</p>
            {selVisits.length > 0 && (
              <section className="calendar-visit-detail">
                <div className="eyebrow">وقت النادي</div>
                {selVisits.map((v) => {
                  const seconds = v.left_at ? v.duration_seconds : Math.max(0, Math.floor((Date.now() - Date.parse(v.arrived_at)) / 1000));
                  return (
                    <div className="visit-detail-row" key={v.id}>
                      <span className="ic"><Icon name="clock" /></span>
                      <div className="grow">
                        <div className="t">وصلت {timeLabel(v.arrived_at)} {v.left_at ? `· خرجت ${timeLabel(v.left_at)}` : '· ما زلت في النادي'}</div>
                        <div className="s">المدة: {durationLabel(seconds)}</div>
                        <button
                          type="button"
                          className="visit-delete-btn"
                          onClick={() => {
                            if (!window.confirm('حذف تسجيل هذه الزيارة؟ لا يؤثر ذلك على جلسات التمرين.')) return;
                            deleteGymVisit(v.id);
                            toast('تم حذف الزيارة');
                          }}
                        >
                          حذف الزيارة
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
            {selSessions.length > 0 && (
              <>
                <div className="eyebrow">التمارين</div>
                <div className="card pad-0">
                  {selSessions.map((s) => (
                    <Link key={s.id} to={`/history/${s.id}`} className="list-row" onClick={() => setSelected(null)}>
                      <span className={`ic ${s.session_type === 'extra' ? '' : 'cold'}`}><Icon name={s.session_type === 'extra' ? 'leaf' : 'check'} /></span>
                      <div className="grow">
                        <div className="t">{sessionTitle(s)}</div>
                        <div className="s">
                          {minutesLabel(s.duration_seconds)}
                          {s.session_type === 'short' ? ` · مختصرة ${s.short_minutes} د` : ''}
                          {s.difficulty ? ` · ${DIFFICULTY_LABEL[s.difficulty]}` : ''}
                          {s.early_finish ? ' · إنهاء مبكر' : ''}
                        </div>
                      </div>
                      <Icon name="chevL" className="chev" />
                    </Link>
                  ))}
                </div>
              </>
            )}
            {selSessions.length === 0 && selVisits.length === 0 && <p className="muted">لا توجد بيانات مسجّلة في هذا اليوم.</p>}
          </>
        )}
      </Sheet>
    </div>
  );
}
