import { useMemo, useState } from 'react';
import { DAY_BY_ID, EXTRA_BY_ID, WEIGHT_HINT } from '../data/program';
import { MACHINES, type MachineId } from '../data/machines';
import {
  acceptInterstitial,
  alternativesFor,
  canPostpone,
  declineOptional,
  elapsedSession,
  clockElapsed,
  liveToSession,
  machineName,
  markBusy,
  pendingDeferred,
  setWeight,
  skipStage,
  substituteStage,
  undoSet,
  completeSet,
} from '../lib/live';
import type { Difficulty, LiveSession, LiveStage, Session } from '../lib/types';
import { Clock, CheckMark, Sheet, Stepper } from '../components/ui';
import { Icon } from '../components/Icon';
import { Illustration } from '../components/Illustration';
import { Ring } from '../components/Ring';
import { beep, vibrate } from '../lib/feedback';
import { kgLabel, mmss, minutesLabel } from '../lib/format';
import { DIFFICULTY_LABEL } from '../lib/format';
import { weekInfo, currentWeekMessage } from '../lib/week';
import { weekStartOf } from '../lib/dates';
import { WEEKLY_GOAL } from '../data/program';

export type Upd = (fn: (l: LiveSession) => LiveSession) => void;

const illId = (machineId: string) => MACHINES[machineId as MachineId]?.illustration ?? machineId;

/* ============================ مرحلة جهاز حديد ============================ */

export function ExerciseStage({
  live,
  stage,
  upd,
  vib,
  showWeightHint,
  counter,
}: {
  live: LiveSession;
  stage: LiveStage;
  upd: Upd;
  vib: boolean;
  showWeightHint: boolean;
  counter: string;
}) {
  const m = MACHINES[stage.machineId as MachineId];
  const name = machineName(stage.machineId);
  const [altOpen, setAltOpen] = useState(false);
  const alts = alternativesFor(stage);
  const postpone = canPostpone(live);
  const hasWeight = stage.machineId !== 'plank';
  const origName = stage.substitutedFor ? machineName(stage.substitutedFor).ar : null;
  const done = stage.status !== 'pending';

  function tapSet(i: number) {
    if (done) return;
    if (i === stage.setsDone - 1) {
      upd(undoSet);
    } else if (i === stage.setsDone) {
      const now = Date.now();
      upd((l) => {
        const r = completeSet(l, now);
        return r.live;
      });
      vibrate(30, vib);
    }
  }

  return (
    <div className="stack live-stage">
      <div className="mcard card pad-0">
        <Illustration id={illId(stage.machineId)} className="mill" label={name.ar} />
        <div className="mcard-body">
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <div className="eyebrow">{counter}</div>
              <h2 className="mname">{name.ar}</h2>
              {name.en && <div className="en muted mname-en">{name.en}</div>}
            </div>
            {stage.deferred && <span className="tag tag-hot">مؤجَّل</span>}
          </div>
          {origName && <div className="tag tag-cold" style={{ marginTop: 8 }}>بديل عن: {origName}</div>}
          <div className="spec-row">
            {stage.round ? (
              <div className="spec"><b className="num">{stage.round}/{stage.rounds}</b><span>الجولة</span></div>
            ) : (
              <div className="spec"><b className="num">{stage.sets}</b><span>سيتات</span></div>
            )}
            <div className="spec"><b className="num">{stage.reps.replace(/[^\d–-]/g, '') || stage.reps}</b><span>{stage.timed ? 'ثانية' : 'تكرار'}</span></div>
            <div className="spec"><b className="num">{stage.rest}</b><span>ث راحة</span></div>
          </div>
        </div>
      </div>

      {/* السيتات */}
      <section className="card">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div className="card-title">{stage.sets > 1 ? 'السيتات' : 'التمرين'}</div>
          <span className="muted" style={{ fontSize: 13.5 }}>{stage.setsDone}/{stage.sets}</span>
        </div>
        <div className="sets" role="group" aria-label="السيتات">
          {Array.from({ length: stage.sets }, (_, i) => {
            const isDone = i < stage.setsDone;
            const isNext = i === stage.setsDone && !done;
            return (
              <button
                key={i}
                className={`setbox ${isDone ? 'done' : ''} ${isNext ? 'next' : ''}`}
                onClick={() => tapSet(i)}
                aria-pressed={isDone}
                aria-label={`السيت ${i + 1}${isDone ? ' مكتمل' : ''}`}
              >
                {isDone ? <Icon name="check" /> : <span className="num">{i + 1}</span>}
                <small>{stage.reps}</small>
              </button>
            );
          })}
        </div>
        {hasWeight && (
          <div style={{ marginTop: 18 }}>
            <div className="label" style={{ marginBottom: 8 }}>الوزن (اختياري)</div>
            <Stepper
              value={stage.weight ?? 0}
              step={2.5}
              min={0}
              max={400}
              unit={stage.weight ? 'كجم' : ''}
              format={(v) => (v <= 0 ? '—' : kgLabel(v))}
              label="الوزن"
              onChange={(v) => upd((l) => setWeight(l, v <= 0 ? null : stage.weight == null && v === 2.5 ? 5 : v))}
            />
          </div>
        )}
        {showWeightHint && hasWeight && (
          <div className="note-box cold" style={{ marginTop: 14 }}>
            <b>تلميح:</b> قيّمت آخر جلستين بـ «سهل». {WEIGHT_HINT}
          </div>
        )}
      </section>

      {/* الجهاز مشغول / لا أستطيع */}
      {!done && (
        <div className="stack" style={{ gap: 10 }}>
          {postpone && (
            <button className="btn btn-ghost btn-block" onClick={() => upd(markBusy)}>
              <Icon name="swap" /> الجهاز مشغول — أجّله
            </button>
          )}
          <button className="btn btn-ghost btn-block" onClick={() => setAltOpen(true)}>
            لا أستطيع استخدام هذا الجهاز
          </button>
        </div>
      )}

      {/* طريقة الاستخدام */}
      {m && (
        <section className="card">
          <div className="card-title" style={{ marginBottom: 10 }}>طريقة الاستخدام</div>
          <div className="muted" style={{ fontSize: 13.5, marginBottom: 10 }}>العضلات المستهدفة: {m.muscles}</div>
          <ol className="steps">
            {m.steps.map((s, i) => (
              <li key={i}><span className="n num">{i + 1}</span><span>{s}</span></li>
            ))}
          </ol>
          {m.warn && (
            <div className="note-box hot" style={{ marginTop: 12 }}>
              <b>تنبيه:</b> {m.warn}
            </div>
          )}
        </section>
      )}

      <Sheet open={altOpen} onClose={() => setAltOpen(false)} title="بديل ضمن خطتك">
        {alts.length === 0 ? (
          <>
            <p className="muted">لا يوجد بديل مُعتمد لهذا الجهاز في خطتك. يمكنك تخطّيه هذه المرة والمتابعة.</p>
            <button className="btn btn-dark btn-block" onClick={() => { setAltOpen(false); upd(skipStage); }}>تخطّي هذا التمرين</button>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 14 }}>هذه بدائل من خطتك نفسها:</p>
            {alts.map((a) => (
              <button
                key={a.id}
                className="pick-row"
                onClick={() => { setAltOpen(false); upd((l) => substituteStage(l, a.id)); }}
              >
                <Illustration id={MACHINES[a.id].illustration} className="sm pick-ill" />
                <div className="grow">
                  <div className="t">{MACHINES[a.id].ar}</div>
                  <div className="s">{a.note}</div>
                </div>
              </button>
            ))}
            <button className="link-btn" onClick={() => { setAltOpen(false); upd(skipStage); }}>أو تخطَّ التمرين</button>
          </>
        )}
      </Sheet>
    </div>
  );
}

/* ============================ مرحلة موقّتة (كارديو / إطالة / جلسة إضافية) ============================ */

export function TimedStage({ live, stage, now, title, hint }: { live: LiveSession; stage: LiveStage; now: number; title: string; hint: string }) {
  const total = stage.seconds ?? 0;
  const elapsed = clockElapsed(live, now);
  const remaining = Math.max(0, total - elapsed);
  const running = live.clock.startedAt != null && !live.pausedAt;
  const segs = stage.segments ?? [];
  let acc = 0;
  let segIdx = -1;
  let segLeft = 0;
  segs.forEach((s, i) => {
    if (elapsed >= acc && elapsed < acc + s.seconds) {
      segIdx = i;
      segLeft = acc + s.seconds - elapsed;
    }
    acc += s.seconds;
  });
  const seg = segIdx >= 0 ? segs[segIdx] : null;
  const over = elapsed >= total;
  const machine = MACHINES[stage.machineId as MachineId];
  const name = stage.kind === 'stretch' ? { ar: 'الإطالة', en: 'Stretching' } : stage.kind === 'timed' ? { ar: title, en: '' } : machineName(stage.machineId);

  return (
    <div className="stack live-stage">
      <section className="card center timed">
        <Illustration id={stage.kind === 'stretch' ? 'stretch' : illId(stage.machineId)} className="sm timed-ill" />
        <div className="eyebrow">{stage.kind === 'cardio' ? 'الكارديو' : stage.kind === 'stretch' ? 'الإطالة' : 'جلسة إضافية'}</div>
        <h2 className="mname" style={{ marginTop: 2 }}>{name.ar}</h2>
        {name.en && <div className="en muted mname-en">{name.en}</div>}
        <div className="timed-ring">
          <Ring size={236} stroke={13} progress={total ? elapsed / total : 0} color={over ? 'var(--cold)' : seg?.kind === 'fast' ? 'var(--hot)' : undefined}>
            <Clock seconds={remaining} className="timed-clock" />
            <span className="muted" style={{ fontSize: 13.5 }}>{over ? 'اكتمل الوقت' : running ? 'متبقٍ' : elapsed > 0 ? 'متوقف' : 'جاهز'}</span>
          </Ring>
        </div>
        {seg && (
          <div className={`seg-now ${seg.kind}`}>
            <div className="row-between">
              <b>{seg.label}</b>
              <span className="num">{mmss(segLeft)}</span>
            </div>
            <div className="s">{seg.hint}</div>
          </div>
        )}
        {!seg && !over && <div className="note-box" style={{ textAlign: 'start' }}>{hint}</div>}
        {over && <div className="note-box cold" style={{ textAlign: 'start' }}>أحسنت! يمكنك الانتقال للمرحلة التالية.</div>}
      </section>

      {segs.length > 1 && (
        <section className="card">
          <div className="card-title" style={{ marginBottom: 10 }}>جدول الكارديو</div>
          <div className="segline" aria-hidden="true">
            {segs.map((s, i) => (
              <i key={i} className={`${s.kind} ${i === segIdx ? 'cur' : ''} ${i < segIdx ? 'past' : ''}`} style={{ flexGrow: s.seconds }} />
            ))}
          </div>
          <div className="seg-legend">
            <span><i className="warmup" /> تسخين/هادئ</span>
            <span><i className="fast" /> أسرع</span>
          </div>
        </section>
      )}

    </div>
  );
}

/* ============================ شاشة بينية ============================ */

export function Interstitial({ live, upd }: { live: LiveSession; upd: Upd }) {
  const stage = live.stages[live.cur];
  const name = machineName(stage.machineId);
  if (live.inter === 'optional') {
    const r = stage.round ?? 0;
    return (
      <div className="stack live-stage">
        <section className="card center inter">
          <div className="inter-ic"><Icon name="target" /></div>
          <h2 className="mname">أنهيت {r - 1 === 1 ? 'الجولة الأولى' : 'الجولتين'}</h2>
          <p className="muted">الجولة {r === 3 ? 'الثالثة' : `رقم ${r}`} اختيارية. هل تريد إضافتها؟</p>
          <div className="stack" style={{ gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => upd(acceptInterstitial)}>نعم، جولة إضافية</button>
            <button className="btn btn-ghost btn-block" onClick={() => upd(declineOptional)}>لا، أنهِ الحديد</button>
          </div>
        </section>
      </div>
    );
  }
  const left = pendingDeferred(live);
  return (
    <div className="stack live-stage">
      <section className="card center inter">
        <div className="inter-ic"><Icon name="swap" /></div>
        <h2 className="mname">{left.length === 1 ? 'بقي جهاز واحد مؤجل' : `بقيت ${left.length} أجهزة مؤجلة`}</h2>
        <p className="muted">أنهيت بقية الأجهزة. حان وقت العودة إلى:</p>
        <Illustration id={illId(stage.machineId)} className="sm" label={name.ar} />
        <div style={{ fontWeight: 700, fontSize: 18 }}>{name.ar}</div>
        {left.length > 1 && <div className="muted" style={{ fontSize: 13.5 }}>ثم: {left.slice(1).map((s) => machineName(s.machineId).ar).join('، ')}</div>}
        <div className="stack" style={{ gap: 10, marginTop: 8 }}>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => upd(acceptInterstitial)}>ابدأ به الآن</button>
          {stage.status === 'pending' && canPostponeAgain(live) && (
            <button className="btn btn-ghost btn-block" onClick={() => upd(skipStage)}>تخطَّه هذه المرة</button>
          )}
        </div>
      </section>
    </div>
  );
}

const canPostponeAgain = (live: LiveSession) => live.stages[live.cur]?.status === 'pending';

/* ============================ لوحة الراحة ============================ */

export function RestPanel({ live, now, onAdd }: { live: LiveSession; now: number; onSkip?: () => void; onAdd: (s: number) => void }) {
  const r = live.rest!;
  const left = Math.max(0, Math.ceil((r.endsAt - (live.pausedAt ?? now)) / 1000));
  const nextStage = live.stages[live.cur];
  const done = nextStage?.status !== 'pending';
  return (
    <section className="rest-panel" aria-live="polite">
      <Ring size={88} stroke={8} progress={1 - left / Math.max(1, r.total)} color="var(--cold)">
        <Clock seconds={left} className="rest-clock" />
      </Ring>
      <div className="grow">
        <div className="rest-title">{r.label}</div>
        <div className="muted" style={{ fontSize: 13.5 }}>{done ? 'ثم ننتقل للتمرين التالي' : 'ثم السيت التالي'}</div>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <button className="btn btn-sm btn-soft-cold" onClick={() => onAdd(15)}>+15 ث</button>
        </div>
      </div>
    </section>
  );
}

/* ============================ إنهاء الجلسة وحفظها ============================ */

export interface SaveResult {
  session: Session;
  countBefore: number;
  alreadyDone: boolean;
}

export function FinishScreen({
  live,
  now,
  userId,
  sessions,
  weekStartDay,
  onSave,
  onDiscard,
  onBack,
}: {
  live: LiveSession;
  now: number;
  userId: string;
  sessions: Session[];
  weekStartDay: number;
  onSave: (r: SaveResult) => void;
  onDiscard: () => void;
  onBack: () => void;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const early = live.early;
  const dur = elapsedSession(live, now);
  const preview = useMemo(() => liveToSession(live, userId, live.pausedAt ?? now, { difficulty: null, notes: '', early }), [live, userId, early, now]);
  const wk = weekStartOf(live.date, weekStartDay);
  const before = weekInfo(sessions.filter((s) => s.id !== live.id), wk);
  const isCounted = live.type !== 'extra';
  const alreadyDone = isCounted && live.day != null && before.doneDays.has(live.day);
  const doneCount = preview.exercises.filter((e) => e.status === 'done' || e.status === 'substituted').length;
  const skippedCount = preview.exercises.filter((e) => e.status === 'skipped').length;
  const day = live.day ? DAY_BY_ID[live.day] : null;

  function save() {
    if (busy) return;
    setBusy(true);
    const session = liveToSession(live, userId, live.pausedAt ?? Date.now(), { difficulty, notes, early });
    onSave({ session, countBefore: before.count, alreadyDone });
  }

  return (
    <div className="page no-nav stack finish">
      <div className="center stack" style={{ gap: 6, marginTop: 8 }}>
        <div className="finish-ic"><Icon name={early ? 'flag' : 'check'} size={34} /></div>
        <h1>{early ? 'إنهاء مبكر' : live.type === 'extra' ? 'أنهيت الجلسة الإضافية' : 'أنهيت الجلسة'}</h1>
        <p className="muted">
          {day ? `اليوم ${day.id} — ${day.focus}` : EXTRA_BY_ID[live.extraKind ?? '']?.title}
          {live.type === 'short' && ` · نسخة ${live.shortMinutes} دقيقة`}
        </p>
      </div>

      <div className="card">
        <div className="fstats">
          <div><b className="num">{minutesLabel(dur)}</b><span>المدة</span></div>
          <div><b className="num">{doneCount}</b><span>أجهزة مكتملة</span></div>
          <div><b className="num">{skippedCount}</b><span>متروكة</span></div>
        </div>
        {early && <p className="muted" style={{ fontSize: 13.5, marginTop: 12 }}>سنحفظ ما أنجزته حتى الآن — الذهاب أفضل من الإلغاء.</p>}
      </div>

      <div className="card stack">
        <div className="card-title">كيف كانت الجلسة؟</div>
        <div className="seg" role="group" aria-label="مستوى الصعوبة">
          {(['easy', 'good', 'hard'] as Difficulty[]).map((k) => (
            <button key={k} className={difficulty === k ? 'on' : ''} aria-pressed={difficulty === k} onClick={() => setDifficulty(difficulty === k ? null : k)}>
              {DIFFICULTY_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="note">ملاحظة (اختياري)</label>
          <textarea id="note" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثلاً: كتفي متعب قليلًا…" maxLength={500} />
        </div>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        <button className="btn btn-primary btn-lg btn-block" onClick={save} disabled={busy}>حفظ الجلسة</button>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="link-btn" onClick={onBack}>رجوع للتمرين</button>
          <button className="link-btn" style={{ color: 'var(--danger)' }} onClick={onDiscard}>تجاهل بدون حفظ</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ بعد الحفظ ============================ */

export function SavedScreen({
  session,
  sessions,
  weekStartDay,
  countBefore,
  alreadyDone,
  onHome,
}: {
  session: Session;
  sessions: Session[];
  weekStartDay: number;
  countBefore: number;
  alreadyDone: boolean;
  onHome: () => void;
}) {
  const wk = weekStartOf(session.date, weekStartDay);
  const info = weekInfo(sessions, wk);
  const extra = session.session_type === 'extra';
  const complete = info.complete;
  const msg = currentWeekMessage(info.count);
  const title = session.early_finish ? 'تم حفظ ما أنجزته ✓' : extra ? 'تمت الجلسة الإضافية ✓' : 'تمت جلسة اليوم ✓';
  const justCompleted = complete && countBefore < WEEKLY_GOAL && !extra;
  return (
    <div className="page no-nav stack saved">
      <div className="saved-hero center">
        <div className={`saved-check ${justCompleted ? 'big' : ''}`}><CheckMark size={justCompleted ? 120 : 96} stroke="var(--cold)" /></div>
        <h1 style={{ fontSize: 30 }}>{title}</h1>
        {!extra && (
          <div className="saved-count disp">
            <span className="num">{info.count}/{WEEKLY_GOAL}</span> <span style={{ fontSize: 20 }}>هذا الأسبوع</span>
          </div>
        )}
        {extra && (
          <div className="saved-count disp" style={{ fontSize: 26 }}>
            {complete ? '4/4 ✓ + جلسة إضافية' : `${info.count}/${WEEKLY_GOAL} هذا الأسبوع`}
          </div>
        )}
        <p className="muted" style={{ maxWidth: 320, margin: '6px auto 0' }}>
          {extra
            ? 'الجلسة الإضافية لا تُحتسب ضمن 4/4، لكنها تُسجَّل في سجلك.'
            : alreadyDone
              ? 'هذا اليوم كان مكتملًا أصلًا هذا الأسبوع، لذا لم يزد العدّاد — لكن الجلسة محفوظة في السجل.'
              : complete
                ? 'اكتمل هدف الأسبوع ✓ — أحسنت!'
                : msg.sub}
        </p>
      </div>
      <button className="btn btn-primary btn-lg btn-block" onClick={onHome}>العودة للرئيسية</button>
      {session.difficulty && <p className="muted center" style={{ fontSize: 13.5 }}>تقييمك: {DIFFICULTY_LABEL[session.difficulty]}</p>}
    </div>
  );
}
