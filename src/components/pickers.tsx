import { useState } from 'react';
import { DAYS, EXTRA_KINDS, SHORT_NOTE, SHORT_PRESETS, type DayDef, type DayId } from '../data/program';
import { MACHINES } from '../data/machines';
import { resolvePlan } from '../lib/plan';
import type { Derived } from '../lib/derived';
import { Illustration } from './Illustration';
import { Icon } from './Icon';
import { Sheet } from './ui';

export function dayIllustrations(day: DayDef): string[] {
  const first = day.exercises[0]?.machineId;
  const second = day.exercises[Math.min(2, day.exercises.length - 1)]?.machineId;
  return [MACHINES[day.cardio.machineId].illustration, MACHINES[first].illustration, MACHINES[second].illustration].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
}

/** اختيار يوم من الأيام الأربعة — الأيام المنجزة تظهر «✓ مكتمل» ولا تُقترح افتراضيًا */
export function DayPickerSheet({
  open,
  onClose,
  d,
  onPick,
  title = 'اختيار تمرين آخر',
}: {
  open: boolean;
  onClose: () => void;
  d: Derived;
  onPick: (day: DayId) => void;
  title?: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="muted" style={{ fontSize: 14 }}>الأيام الأربعة كلها متاحة. الأيام المكتملة هذا الأسبوع لا تُقترح تلقائيًا.</p>
      <div className="stack" style={{ gap: 10 }}>
        {DAYS.map((day) => {
          const done = d.info.doneDays.has(day.id);
          const suggested = d.suggested === day.id;
          return (
            <button key={day.id} className={`pick-row ${suggested ? 'sug' : ''}`} onClick={() => { onClose(); onPick(day.id); }}>
              <Illustration id={MACHINES[day.exercises[0].machineId].illustration} className="sm pick-ill" />
              <div className="grow">
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <span className="t">اليوم {day.id}</span>
                  {done && <span className="tag tag-solid"><Icon name="check" size={14} /> مكتمل</span>}
                  {suggested && !done && <span className="tag tag-hot">مقترح</span>}
                </div>
                <div className="s">{day.focus}</div>
              </div>
              <Icon name="chevL" className="chev" />
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

/** «وقتي اليوم قصير» */
export function ShortSheet({
  open,
  onClose,
  d,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  d: Derived;
  onStart: (day: DayId, minutes: 15 | 25 | 30) => void;
}) {
  const [day, setDay] = useState<DayId | null>(null);
  const [minutes, setMinutes] = useState<15 | 25 | 30>(25);
  const dayId: DayId = day ?? d.suggested ?? 1;
  const plan = resolvePlan(dayId, d.position.week, d.settings, { shortMinutes: minutes });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="وقتي اليوم قصير"
      footer={
        <button className="btn btn-primary btn-lg btn-block" onClick={() => { onClose(); onStart(dayId, minutes); }}>
          ابدأ جلسة {minutes} دقيقة
        </button>
      }
    >
      <p className="muted" style={{ fontSize: 14 }}>الجلسة الأصلية 45 دقيقة</p>
      <div>
        <div className="label" style={{ marginBottom: 8 }}>المدة المتاحة</div>
        <div className="seg" role="group" aria-label="المدة">
          {SHORT_PRESETS.map((p) => (
            <button key={p.minutes} className={minutes === p.minutes ? 'on' : ''} aria-pressed={minutes === p.minutes} onClick={() => setMinutes(p.minutes)}>
              {p.minutes} د
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="label" style={{ marginBottom: 8 }}>اليوم</div>
        <div className="chips">
          {DAYS.map((x) => (
            <button key={x.id} className={`chip-btn ${dayId === x.id ? 'on' : ''}`} onClick={() => setDay(x.id)}>
              اليوم {x.id}{d.info.doneDays.has(x.id) ? ' ✓' : ''}
            </button>
          ))}
        </div>
      </div>
      <div className="note-box cold">
        <b>{plan.day.focus}</b>
        <div>كارديو {plan.cardio.minutes} د · حديد {plan.circuit ? `${plan.circuit.rounds} ${plan.circuit.rounds === 1 ? 'جولة' : 'جولات'}` : `${plan.exercises.length} تمارين`} · إطالة {plan.stretchMinutes} د</div>
        {plan.dropped.length > 0 && <div className="muted" style={{ marginTop: 4 }}>يُؤجَّل: {plan.dropped.map((id) => MACHINES[id].ar).join('، ')}</div>}
      </div>
      <p className="muted" style={{ fontSize: 13.5 }}>{SHORT_NOTE}</p>
    </Sheet>
  );
}

/** الجلسة الإضافية الاختيارية (الخامسة) */
export function ExtraSheet({ open, onClose, onStart }: { open: boolean; onClose: () => void; onStart: (kind: string, minutes: number) => void }) {
  const [kind, setKind] = useState(EXTRA_KINDS[0].id);
  const k = EXTRA_KINDS.find((x) => x.id === kind)!;
  const [minutes, setMinutes] = useState<number | null>(null);
  const m = minutes && k.minutes.includes(minutes) ? minutes : k.defaultMinutes;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="جلسة إضافية"
      footer={
        <button className="btn btn-teal btn-lg btn-block" onClick={() => { onClose(); onStart(kind, m); }}>
          ابدأ {k.title} · {m} د
        </button>
      }
    >
      <p className="muted" style={{ fontSize: 14 }}>اختيارية تمامًا، ولا تُحتسب ضمن هدف 4/4 — تظهر كـ «جلسة إضافية».</p>
      <div className="chips">
        {EXTRA_KINDS.map((x) => (
          <button key={x.id} className={`chip-btn ${kind === x.id ? 'on' : ''}`} onClick={() => { setKind(x.id); setMinutes(null); }}>
            {x.title}
          </button>
        ))}
      </div>
      <div className="row" style={{ alignItems: 'stretch' }}>
        <Illustration id={k.machineIllustration} className="pick-ill big" />
        <div className="grow">
          <div className="t" style={{ fontWeight: 700 }}>{k.title}</div>
          <div className="muted" style={{ fontSize: 14 }}>{k.desc}</div>
          {k.note && <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{k.note}</div>}
        </div>
      </div>
      <div>
        <div className="label" style={{ marginBottom: 8 }}>المدة</div>
        <div className="seg">
          {k.minutes.map((x) => (
            <button key={x} className={m === x ? 'on' : ''} aria-pressed={m === x} onClick={() => setMinutes(x)}>{x} د</button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
