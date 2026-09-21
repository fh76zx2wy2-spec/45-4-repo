import { Link, useNavigate } from 'react-router-dom';
import {
  ACTIVE_PROGRAM,
  CARDIO_INTENSITY,
  CONTINUE_TIPS,
  DAYS,
  GENERAL_DISCLAIMER,
  INTERVAL_NOTE,
  PHASES,
  PROGRAM_WEEKS,
  SESSION_STRUCTURE,
  WARNINGS,
  WEIGHT_RULE,
} from '../data/program';
import { useDerived } from '../lib/derived';
import { PageHeader } from '../components/ui';
import { Icon } from '../components/Icon';

export default function ProgramScreen() {
  const d = useDerived();
  const nav = useNavigate();
  const { position } = d;
  return (
    <div className="page stack">
      <PageHeader title="برنامج 12 أسبوعًا" onBack={() => nav('/')} sub={position.beyond ? 'أكملت البرنامج' : `أنت في الأسبوع ${position.shown}`} />

      <section className="card">
        <div className="segbar" style={{ marginBottom: 12 }} aria-hidden="true">
          {Array.from({ length: PROGRAM_WEEKS }, (_, i) => (
            <i key={i} className={i + 1 < position.shown || position.beyond ? 'done' : i + 1 === position.shown ? 'cur' : ''} />
          ))}
        </div>
        <div className="stack" style={{ gap: 12 }}>
          {PHASES.map((p) => {
            const active = p.id === position.phase.id && !position.beyond;
            return (
              <div key={p.id} className={`phase-row ${active ? 'on' : ''}`}>
                <div className="row-between">
                  <div className="card-title">{p.name}</div>
                  <span className={`tag ${active ? 'tag-hot' : ''}`}>{p.from === p.to ? `أسبوع ${p.from}` : `أسابيع ${p.from}–${p.to}`}</span>
                </div>
                <div className="muted" style={{ fontSize: 14, marginTop: 6 }}><b style={{ color: 'var(--ink-2)' }}>الحديد:</b> {p.iron}</div>
                <div className="muted" style={{ fontSize: 14 }}><b style={{ color: 'var(--ink-2)' }}>الكارديو:</b> {p.cardio}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="card-title" style={{ marginBottom: 4 }}>بنية الجلسة · {SESSION_STRUCTURE.total} دقيقة</div>
        <div className="struct">
          {ACTIVE_PROGRAM.weightsFirst ? (
            <>
              {SESSION_STRUCTURE.warmup > 0 && <div style={{ flex: SESSION_STRUCTURE.warmup + 3 }} className="c1"><b className="num">{SESSION_STRUCTURE.warmup}</b>تسخين</div>}
              <div style={{ flex: SESSION_STRUCTURE.iron }} className="c2"><b className="num">{SESSION_STRUCTURE.iron}</b>حديد</div>
              <div style={{ flex: SESSION_STRUCTURE.cardio }} className="c1"><b className="num">{SESSION_STRUCTURE.cardio}</b>كارديو</div>
              <div style={{ flex: SESSION_STRUCTURE.stretch + 3 }} className="c3"><b className="num">{SESSION_STRUCTURE.stretch}</b>إطالة</div>
            </>
          ) : (
            <>
              <div style={{ flex: SESSION_STRUCTURE.cardio }} className="c1"><b className="num">{SESSION_STRUCTURE.cardio}</b>كارديو</div>
              <div style={{ flex: SESSION_STRUCTURE.iron }} className="c2"><b className="num">{SESSION_STRUCTURE.iron}</b>حديد</div>
              <div style={{ flex: SESSION_STRUCTURE.stretch + 4 }} className="c3"><b className="num">{SESSION_STRUCTURE.stretch}</b>إطالة</div>
            </>
          )}
        </div>
      </section>

      <section className="card pad-0">
        <div className="card-title" style={{ padding: '16px 18px 6px' }}>أيامك الأربعة</div>
        {DAYS.map((day) => (
          <div key={day.id} className="list-row" style={{ alignItems: 'flex-start' }}>
            <span className="ic disp num" style={{ fontWeight: 900, fontSize: 19 }}>{day.id}</span>
            <div className="grow">
              <div className="t">{day.title}</div>
              <div className="s">{day.subtitle}</div>
              <div className="s">كارديو: {day.cardio.note}</div>
              <div className="s">حديد: {day.ironSummary}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="card stack">
        <div className="card-title">قاعدة زيادة الوزن</div>
        <p style={{ fontSize: 15 }}>{WEIGHT_RULE}</p>
        <div className="card-title">شدّة الكارديو</div>
        <p style={{ fontSize: 15 }}>{CARDIO_INTENSITY}</p>
        <p className="muted" style={{ fontSize: 14 }}>{INTERVAL_NOTE}</p>
      </section>

      <section className="card stack">
        <div className="card-title">تنبيهات مهمة</div>
        <ul className="stack" style={{ gap: 8 }}>
          {WARNINGS.map((w) => (
            <li key={w} className="stat-line" style={{ alignItems: 'flex-start' }}><Icon name="shield" /><span>{w}</span></li>
          ))}
        </ul>
        <div className="card-title" style={{ marginTop: 6 }}>كيف تستمر؟</div>
        <ul className="stack" style={{ gap: 8 }}>
          {CONTINUE_TIPS.map((t) => (
            <li key={t} className="stat-line" style={{ alignItems: 'flex-start' }}><Icon name="check" /><span>{t}</span></li>
          ))}
        </ul>
      </section>

      <Link to="/settings/program" className="btn btn-ghost btn-block"><Icon name="edit" /> تعديل البرنامج (سيتات، تكرارات، راحة، كارديو)</Link>
      <p className="muted center" style={{ fontSize: 12.5 }}>{GENERAL_DISCLAIMER}</p>
    </div>
  );
}
