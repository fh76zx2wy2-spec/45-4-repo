import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DAY_BY_ID, EXTRA_BY_ID } from '../data/program';
import { useDerived } from '../lib/derived';
import { formatGreg, formatHijri, hijriOf, HIJRI_MONTHS, weekdayName } from '../lib/dates';
import { DIFFICULTY_LABEL, minutesLabel } from '../lib/format';
import type { Session } from '../lib/types';
import { PageHeader } from '../components/ui';
import { Icon } from '../components/Icon';

type Filter = 'all' | 'base' | 'extra';

export function sessionLabel(s: Session): string {
  if (s.session_type === 'extra') return EXTRA_BY_ID[s.extra_kind ?? '']?.title ?? 'جلسة إضافية';
  return s.workout_day ? `اليوم ${s.workout_day} — ${DAY_BY_ID[s.workout_day].focus}` : 'جلسة';
}

export default function History() {
  const d = useDerived();
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const list = useMemo(
    () => d.sessions.filter((s) => (filter === 'all' ? true : filter === 'extra' ? s.session_type === 'extra' : s.session_type !== 'extra')),
    [d.sessions, filter],
  );
  // تجميع بحسب الشهر الهجري
  const groups = useMemo(() => {
    const g: { key: string; title: string; items: Session[] }[] = [];
    for (const s of list) {
      const h = hijriOf(s.date);
      const key = `${h.y}-${h.m}`;
      let cur = g[g.length - 1];
      if (!cur || cur.key !== key) {
        cur = { key, title: `${HIJRI_MONTHS[h.m - 1]} ${h.y} هـ`, items: [] };
        g.push(cur);
      }
      cur.items.push(s);
    }
    return g;
  }, [list]);

  return (
    <div className="page stack">
      <PageHeader title="سجل الجلسات" onBack={() => nav('/more')} sub={`${d.sessions.length} جلسة`} />
      <div className="seg" role="group" aria-label="تصفية">
        {(
          [
            ['all', 'الكل'],
            ['base', 'الأساسية'],
            ['extra', 'الإضافية'],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button key={id} className={filter === id ? 'on' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card center stack" style={{ padding: 28 }}>
          <div className="card-title">لا جلسات بعد</div>
          <p className="muted" style={{ fontSize: 14 }}>ستظهر جلساتك هنا من الأحدث إلى الأقدم بعد أن تنهي أول تمرين.</p>
          <Link to="/workout" className="btn btn-primary" style={{ margin: '0 auto' }}>ابدأ تمرينًا</Link>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key}>
            <div className="eyebrow" style={{ margin: '4px 4px 8px' }}>{g.title}</div>
            <div className="card pad-0">
              {g.items.map((s) => (
                <Link key={s.id} to={`/history/${s.id}`} className="list-row">
                  <span className={`ic ${s.session_type === 'extra' ? '' : 'cold'}`}><Icon name={s.session_type === 'extra' ? 'leaf' : 'check'} /></span>
                  <div className="grow">
                    <div className="t">{sessionLabel(s)}</div>
                    <div className="s">
                      {weekdayName(s.date)} {formatHijri(s.date, { year: false })} · {formatGreg(s.date, { year: false })} م
                    </div>
                    <div className="s">
                      {minutesLabel(s.duration_seconds)}
                      {s.session_type === 'short' && ` · مختصرة ${s.short_minutes} د`}
                      {s.difficulty && ` · ${DIFFICULTY_LABEL[s.difficulty]}`}
                      {s.early_finish && ' · إنهاء مبكر'}
                    </div>
                  </div>
                  <Icon name="chevL" className="chev" />
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
