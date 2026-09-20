import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DAYS, SAFETY_NOTE, WEEKLY_GOAL, type DayId } from '../data/program';
import { MACHINES } from '../data/machines';
import { useDerived } from '../lib/derived';
import { useStartActions } from '../lib/actions';
import { resolvePlan, setsRepsLabel } from '../lib/plan';
import { Illustration } from '../components/Illustration';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/ui';
import { ExtraSheet, ShortSheet, dayIllustrations } from '../components/pickers';

export default function Workout() {
  const d = useDerived();
  const nav = useNavigate();
  const act = useStartActions(d);
  const [preview, setPreview] = useState<DayId | null>(null);
  const [shortOpen, setShortOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const live = d.db?.live;
  const plan = preview ? resolvePlan(preview, d.position.week, d.settings) : null;

  return (
    <div className="page stack">
      <div className="topbar">
        <div>
          <h1>التمرين</h1>
          <div className="eyebrow">هذا الأسبوع {d.info.count}/{WEEKLY_GOAL} · {d.position.phase.name}</div>
        </div>
      </div>

      {live && (
        <button className="card tap card-cold" onClick={() => nav('/live')}>
          <div className="row-between">
            <div>
              <div className="card-title">جلسة جارية</div>
              <div className="card-sub" style={{ color: 'var(--cold-ink)' }}>اضغط لمتابعتها من حيث توقفت</div>
            </div>
            <Icon name="chevL" className="chev" />
          </div>
        </button>
      )}

      <div className="stack" style={{ gap: 12 }}>
        {DAYS.map((day) => {
          const done = d.info.doneDays.has(day.id);
          const sug = d.suggested === day.id;
          return (
            <button key={day.id} className={`card tap day-card ${sug ? 'sug' : ''} ${done ? 'done' : ''}`} onClick={() => setPreview(day.id)}>
              <div className="day-ills">
                {dayIllustrations(day).slice(0, 2).map((id) => (
                  <Illustration key={id} id={id} className="sm" />
                ))}
              </div>
              <div className="row-between" style={{ marginTop: 12, alignItems: 'flex-start' }}>
                <div>
                  <div className="eyebrow">اليوم {day.id}</div>
                  <div className="card-title">{day.focus}</div>
                  <div className="card-sub">{day.ironSummary}</div>
                </div>
                {done ? (
                  <span className="tag tag-solid"><Icon name="check" size={14} /> مكتمل</span>
                ) : sug ? (
                  <span className="tag tag-hot">مقترح اليوم</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="card">
        <button className="list-row" style={{ padding: '4px 0' }} onClick={() => setShortOpen(true)}>
          <span className="ic"><Icon name="bolt" /></span>
          <div className="grow"><div className="t">وقتي اليوم قصير</div><div className="s">15 أو 25 أو 30 دقيقة — الجلسة الأصلية 45 دقيقة</div></div>
          <Icon name="chevL" className="chev" />
        </button>
        <button className="list-row" style={{ padding: '4px 0' }} onClick={() => setExtraOpen(true)}>
          <span className="ic cold"><Icon name="leaf" /></span>
          <div className="grow"><div className="t">جلسة إضافية</div><div className="s">سباحة، كارديو خفيف، إطالة… لا تُحتسب ضمن 4/4</div></div>
          <Icon name="chevL" className="chev" />
        </button>
        <button className="list-row" style={{ padding: '4px 0' }} onClick={() => { act.comeback(); nav('/'); }}>
          <span className="ic"><Icon name="sparkle" /></span>
          <div className="grow"><div className="t">رجعت للنادي</div><div className="s">بداية خفيفة بأوزان خفيفة جدًا في أول جلستين</div></div>
        </button>
      </div>

      <p className="muted center" style={{ fontSize: 13 }}>{SAFETY_NOTE}</p>

      <Sheet
        open={!!plan}
        onClose={() => setPreview(null)}
        title={plan ? `اليوم ${plan.day.id} — ${plan.day.focus}` : ''}
        footer={
          plan && (
            <button className="btn btn-primary btn-lg btn-block" onClick={() => { const id = plan.day.id; setPreview(null); act.startDay(id); }}>
              <Icon name="play" /> ابدأ هذا اليوم
            </button>
          )
        }
      >
        {plan && (
          <>
            <div className="chips">
              <span className="tag">{plan.phase.badge}</span>
              <span className="tag">45 دقيقة</span>
              {d.info.doneDays.has(plan.day.id) && <span className="tag tag-solid"><Icon name="check" size={14} /> مكتمل هذا الأسبوع</span>}
            </div>
            <div className="plan-list">
              <div className="plan-row">
                <Illustration id={MACHINES[plan.cardio.machineId].illustration} className="sm plan-ill" />
                <div className="grow">
                  <div className="t">{MACHINES[plan.cardio.machineId].ar}</div>
                  <div className="s">كارديو {plan.cardio.minutes} دقيقة · {plan.cardio.mode === 'intervals' ? 'فترات' : 'إيقاع ثابت'}</div>
                </div>
              </div>
              {plan.exercises.map((e) => (
                <div className="plan-row" key={e.machineId}>
                  <Illustration id={MACHINES[e.machineId].illustration} className="sm plan-ill" />
                  <div className="grow">
                    <div className="t">{MACHINES[e.machineId].ar}</div>
                    <div className="s">{plan.circuit ? `${plan.circuit.rounds} جولات × ${e.reps}` : setsRepsLabel(e)} · راحة {e.rest} ث</div>
                  </div>
                </div>
              ))}
              <div className="plan-row">
                <Illustration id="stretch" className="sm plan-ill" />
                <div className="grow"><div className="t">إطالة</div><div className="s">{plan.stretchMinutes} دقائق</div></div>
              </div>
            </div>
            {plan.circuit && (
              <p className="muted" style={{ fontSize: 13.5 }}>تمرين دائري: نفّذ التمارين واحدًا بعد الآخر بدون توقف طويل، ثم راحة دقيقة قبل الجولة التالية. الجولة الثالثة اختيارية.</p>
            )}
          </>
        )}
      </Sheet>
      <ShortSheet open={shortOpen} onClose={() => setShortOpen(false)} d={d} onStart={(id, m) => act.startDay(id, m)} />
      <ExtraSheet open={extraOpen} onClose={() => setExtraOpen(false)} onStart={act.startExtra} />
    </div>
  );
}
