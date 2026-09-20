import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DAYS, SESSION_STRUCTURE, type DayId } from '../data/program';
import { MACHINES } from '../data/machines';
import { resolvePlan } from '../lib/plan';
import { useDerived } from '../lib/derived';
import { saveSettings } from '../lib/store';
import { PageHeader, Stepper, useToast } from '../components/ui';
import { Illustration } from '../components/Illustration';

function RepsField({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <input
      className="input"
      style={{ minHeight: 48, textAlign: 'center', fontWeight: 700, fontSize: 18 }}
      value={v}
      maxLength={14}
      aria-label="التكرارات"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && v.trim() !== value && onCommit(v.trim())}
    />
  );
}

export default function ProgramEditor() {
  const d = useDerived();
  const nav = useNavigate();
  const { toast } = useToast();
  const [dayId, setDayId] = useState<DayId>(1);
  const s = d.settings;
  const day = DAYS.find((x) => x.id === dayId)!;
  const plan = resolvePlan(dayId, d.position.week, { ...s, comeback_sessions_left: 0 });
  const dirty = day.exercises.some((e) => s.program_overrides[`${dayId}:${e.machineId}`]) || s.cardio_overrides[String(dayId)] != null;

  function setOv(machineId: string, patch: { sets?: number; reps?: string; rest?: number }, current: { sets: number; reps: string; rest: number }) {
    const key = `${dayId}:${machineId}`;
    saveSettings({ program_overrides: { ...s.program_overrides, [key]: { ...current, ...s.program_overrides[key], ...patch } } });
  }
  function resetDay() {
    const ov = { ...s.program_overrides };
    for (const e of day.exercises) delete ov[`${dayId}:${e.machineId}`];
    const co = { ...s.cardio_overrides };
    delete co[String(dayId)];
    saveSettings({ program_overrides: ov, cardio_overrides: co });
    toast('عادت قيم هذا اليوم إلى الخطة الأصلية');
  }

  return (
    <div className="page stack">
      <PageHeader title="تعديل البرنامج" onBack={() => nav('/settings')} />
      <p className="muted" style={{ fontSize: 14 }}>
        الخطة الأصلية محفوظة دائمًا؛ ما تغيّره هنا يُحفظ في حسابك فوقها ويمكنك التراجع عنه بضغطة. الأوزان لا تتغير تلقائيًا أبدًا.
      </p>
      <div className="chips">
        {DAYS.map((x) => (
          <button key={x.id} className={`chip-btn ${dayId === x.id ? 'on' : ''}`} onClick={() => setDayId(x.id)}>اليوم {x.id}</button>
        ))}
      </div>
      <div className="eyebrow">{day.title}</div>

      <section className="card stack">
        <div className="card-title">الكارديو</div>
        <Stepper
          value={s.cardio_overrides[String(dayId)] ?? SESSION_STRUCTURE.cardio}
          min={5}
          max={45}
          step={5}
          unit="دقيقة"
          label="مدة الكارديو"
          onChange={(v) => saveSettings({ cardio_overrides: { ...s.cardio_overrides, [String(dayId)]: v } })}
        />
        <div className="muted" style={{ fontSize: 13 }}>الأصل: {SESSION_STRUCTURE.cardio} دقيقة — {day.cardio.note}</div>
      </section>

      {plan.exercises.map((e) => {
        const m = MACHINES[e.machineId];
        const cur = { sets: e.sets, reps: e.reps, rest: e.rest };
        const key = `${dayId}:${e.machineId}`;
        const changed = !!s.program_overrides[key];
        return (
          <section key={key} className="card stack">
            <div className="row" style={{ gap: 12 }}>
              <Illustration id={m.illustration} className="sm pick-ill" />
              <div className="grow">
                <div className="card-title">{m.ar}</div>
                <div className="en muted" style={{ fontSize: 12.5 }}>{m.en}</div>
              </div>
              {changed && <span className="tag tag-hot">معدَّل</span>}
            </div>
            <div className="edit-grid">
              <div className="field">
                <label>السيتات</label>
                <Stepper value={e.sets} min={1} max={6} label="السيتات" onChange={(v) => setOv(e.machineId, { sets: v }, cur)} />
              </div>
              <div className="field">
                <label>التكرارات</label>
                <RepsField key={e.reps + changed} value={e.reps} onCommit={(v) => setOv(e.machineId, { reps: v }, cur)} />
              </div>
              <div className="field">
                <label>الراحة (ثانية)</label>
                <Stepper value={e.rest} min={15} max={180} step={15} label="الراحة" onChange={(v) => setOv(e.machineId, { rest: v }, cur)} />
              </div>
            </div>
            {changed && (
              <button
                className="link-btn"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => {
                  const ov = { ...s.program_overrides };
                  delete ov[key];
                  saveSettings({ program_overrides: ov });
                }}
              >
                استعادة القيمة الأصلية
              </button>
            )}
          </section>
        );
      })}
      {dirty && <button className="btn btn-ghost btn-block" onClick={resetDay}>استعادة كل قيم هذا اليوم</button>}
    </div>
  );
}
