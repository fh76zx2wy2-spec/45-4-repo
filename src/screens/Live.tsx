import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DAY_BY_ID, EXTRA_BY_ID, READY_CHECKLIST } from '../data/program';
import { consumeComeback, deleteGymVisit, getDB, saveSettings, saveSession, setLive, useDB } from '../lib/store';
import { useDerived, shouldHintWeight } from '../lib/derived';
import {
  addRest,
  clockElapsed,
  completeSet,
  completeTimedStage,
  elapsedSession,
  hasMeaningfulProgress,
  nextAfterStage,
  pauseClock,
  pauseLive,
  progressFraction,
  resumeLive,
  skipRest,
  skipStage,
  startClock,
} from '../lib/live';
import type { LiveSession, Session } from '../lib/types';
import { beep, keepAwake, vibrate } from '../lib/feedback';
import { Clock, Sheet, useNow } from '../components/ui';
import { Icon } from '../components/Icon';
import { ExerciseStage, FinishScreen, Interstitial, RestPanel, SavedScreen, TimedStage, type SaveResult, type Upd } from './LiveParts';

export default function Live() {
  const db = useDB();
  const d = useDerived();
  const nav = useNavigate();
  const [saved, setSaved] = useState<SaveResult | null>(null);
  const [leaving, setLeaving] = useState(false);

  if (saved) {
    return (
      <SavedScreen
        session={saved.session}
        sessions={db?.sessions ?? []}
        weekStartDay={d.weekStartDay}
        countBefore={saved.countBefore}
        alreadyDone={saved.alreadyDone}
        onHome={() => nav('/', { replace: true })}
      />
    );
  }
  if (!db?.live) return leaving ? null : <Navigate to="/workout" replace />;
  return <LiveInner key={db.live.id} live={db.live} onSaved={setSaved} onLeave={() => setLeaving(true)} />;
}

const readyKey = (id: string) => `45-4:ready:${id}`;
const seenReady = (id: string) => {
  try {
    return sessionStorage.getItem(readyKey(id)) === '1';
  } catch {
    return false;
  }
};

function LiveInner({ live, onSaved, onLeave }: { live: LiveSession; onSaved: (r: SaveResult) => void; onLeave: () => void }) {
  const d = useDerived();
  const db = useDB();
  const nav = useNavigate();
  const settings = d.settings;
  const vib = settings.vibration;
  const snd = settings.sound;
  const now = useNow(250);
  const [earlyOpen, setEarlyOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const upd: Upd = (fn) => {
    const cur = getDB()?.live;
    if (cur) setLive(fn(cur));
  };

  /* ---------- قائمة «جاهز؟» ---------- */
  const untouched =
    live.stages.every((s) => s.setsDone === 0 && s.status === 'pending' && !s.spent) && live.clock.startedAt == null && live.clock.acc === 0;
  const [readyOpen, setReadyOpen] = useState(() => !settings.hide_ready_checklist && untouched && !seenReady(live.id));
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [hideForever, setHideForever] = useState(false);

  useEffect(() => {
    if (readyOpen && !live.pausedAt) upd((l) => pauseLive(l, Date.now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeReady() {
    try {
      sessionStorage.setItem(readyKey(live.id), '1');
    } catch {
      /* ignore */
    }
    if (hideForever) saveSettings({ hide_ready_checklist: true });
    upd((l) => resumeLive(l, Date.now()));
    setReadyOpen(false);
  }

  /* ---------- إبقاء الشاشة مضاءة ---------- */
  useEffect(() => {
    void keepAwake(settings.wake_lock);
    const onVis = () => document.visibilityState === 'visible' && void keepAwake(settings.wake_lock);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      void keepAwake(false);
    };
  }, [settings.wake_lock]);

  const stage = live.stages[live.cur];
  const paused = !!live.pausedAt;

  /* ---------- انتهاء الراحة ---------- */
  useEffect(() => {
    if (!live.rest || paused) return;
    if (now >= live.rest.endsAt) {
      beep('done', snd);
      vibrate([220, 90, 220], vib);
      upd((l) => {
        const st = l.stages[l.cur];
        return st && st.status !== 'pending' ? nextAfterStage(l) : skipRest(l);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, live.rest, paused]);

  /* ---------- تنبيهات المراحل الموقّتة ---------- */
  const seg = useRef({ key: '', idx: -1, ended: '' });
  useEffect(() => {
    if (!stage || stage.kind === 'exercise' || live.phase !== 'running' || paused || live.clock.startedAt == null) return;
    const total = stage.seconds ?? 0;
    const el = clockElapsed(live, now);
    if (el >= total && seg.current.ended !== stage.key) {
      seg.current.ended = stage.key;
      beep('done', snd);
      vibrate([300, 120, 300], vib);
    }
    if (stage.segments?.length) {
      let acc = 0;
      let idx = -1;
      stage.segments.forEach((s, i) => {
        if (el >= acc && el < acc + s.seconds) idx = i;
        acc += s.seconds;
      });
      if (seg.current.key !== stage.key) seg.current = { ...seg.current, key: stage.key, idx };
      else if (idx !== seg.current.idx) {
        if (idx > seg.current.idx) {
          beep('switch', snd);
          vibrate(180, vib);
        }
        seg.current.idx = idx;
      }
    }
  }, [now, stage, live, paused, snd, vib]);

  /* ---------- عند الانتهاء نجمّد الزمن ---------- */
  useEffect(() => {
    if (live.phase === 'finishing' && !live.pausedAt) upd((l) => pauseLive(l, Date.now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.phase, live.pausedAt]);

  /* ---------- الحفظ والتجاهل ---------- */
  function handleSave(r: SaveResult) {
    onSaved(r);
    saveSession(r.session);
    if (r.session.session_type !== 'extra') consumeComeback();
    setLive(null);
    void keepAwake(false);
  }
  function handleDiscard() {
    onLeave();
    setLive(null);
    void keepAwake(false);
    nav('/', { replace: true });
  }
  function startEarlyFinish() {
    setEarlyOpen(false);
    upd((l) => pauseLive({ ...l, early: true, phase: 'finishing', rest: null }, Date.now()));
  }

  if (live.phase === 'finishing') {
    return (
      <>
        <FinishScreen
          live={live}
          now={now}
          userId={d.db?.userId ?? ''}
          sessions={d.sessions as Session[]}
          weekStartDay={d.weekStartDay}
          onSave={handleSave}
          onDiscard={() => setDiscardOpen(true)}
          onBack={() => upd((l) => resumeLive({ ...l, phase: 'running', early: false }, Date.now()))}
        />
        <Sheet open={discardOpen} onClose={() => setDiscardOpen(false)} title="تجاهل الجلسة؟">
          <p className="muted">لن يُحفظ شيء من هذه الجلسة ولن تُحتسب.</p>
          <button className="btn btn-danger btn-block" onClick={handleDiscard}>نعم، تجاهل</button>
          <button className="btn btn-ghost btn-block" onClick={() => setDiscardOpen(false)}>رجوع</button>
        </Sheet>
      </>
    );
  }

  const elapsed = elapsedSession(live, now);
  const day = live.day ? DAY_BY_ID[live.day] : null;
  const extraKind = live.extraKind ? EXTRA_BY_ID[live.extraKind] : null;
  const isExtra = live.type === 'extra';

  /* ---------- شريط المراحل العلوي ---------- */
  const warmupSt = live.stages.find((s) => s.key === 'warmup');
  const cardioSt = live.stages.find((s) => s.key === 'cardio');
  const ironSts = live.stages.filter((s) => s.kind === 'exercise' && (!s.optional || live.optionalAccepted));
  const stretchSt = live.stages.find((s) => s.kind === 'stretch');
  const timedFrac = (s: typeof cardioSt) => {
    if (!s) return 0;
    if (s.status !== 'pending') return 1;
    if (stage?.key === s.key) return Math.min(1, clockElapsed(live, now) / Math.max(1, s.seconds ?? 1));
    return 0;
  };
  const ironDone = ironSts.filter((s) => s.status !== 'pending').length;
  const ironFrac = ironSts.length ? ironDone / ironSts.length : 0;
  const inWarmup = stage?.key === 'warmup';
  const inCardio = stage?.key === 'cardio';
  const inIron = stage?.kind === 'exercise';
  const inStretch = stage?.kind === 'stretch';

  /* ---------- عدّاد التمرين ---------- */
  let counter = '';
  if (stage?.kind === 'exercise') {
    if (stage.round) {
      const inBlock = live.stages.filter((s) => s.block === stage.block);
      counter = `الجولة ${stage.round} من ${stage.rounds} · تمرين ${inBlock.findIndex((s) => s.key === stage.key) + 1} من ${inBlock.length}`;
    } else {
      counter = `تمرين ${Math.min(ironSts.length, ironDone + 1)} من ${ironSts.length}`;
    }
  }
  const firstEx = live.stages.find((s) => s.kind === 'exercise');
  const hintWeight = !!stage && stage.key === firstEx?.key && shouldHintWeight(d.sessions, live.day);

  /* ---------- الجسم ---------- */
  let body: JSX.Element;
  if (live.phase === 'interstitial') {
    body = <Interstitial live={live} upd={upd} />;
  } else if (stage?.kind === 'exercise') {
    body = <ExerciseStage live={live} stage={stage} upd={upd} vib={vib} showWeightHint={hintWeight} counter={counter} />;
  } else if (stage) {
    body = (
      <>
        <TimedStage
          live={live}
          stage={stage}
          now={now}
          title={stage.key === 'warmup' ? 'التسخين' : extraKind?.title ?? 'جلسة إضافية'}
          hint={
            stage.key === 'warmup'
              ? '5 دقائق أوبتيكال أو سيكل هادئ، ثم سيت خفيف جدًا من أول تمرين.'
              : stage.key === 'cardio' && day
                ? day.cardio.note
                : stage.kind === 'stretch' && day
                  ? day.stretchHint
                  : extraKind?.desc ?? 'خذ وقتك وتنفّس بهدوء.'
          }
        />
        {!isExtra && stage.status === 'pending' && (
          <div className="center"><button className="link-btn" onClick={() => upd(skipStage)}>تخطّي هذه المرحلة</button></div>
        )}
      </>
    );
  } else {
    body = <div />;
  }

  /* ---------- الشريط السفلي ---------- */
  let bar: JSX.Element | null = null;
  if (paused) {
    bar = (
      <button className="btn btn-primary btn-lg btn-block" onClick={() => upd((l) => resumeLive(l, Date.now()))}>
        <Icon name="play" /> استئناف
      </button>
    );
  } else if (live.phase === 'interstitial') {
    bar = null;
  } else if (live.rest) {
    const done = stage?.status !== 'pending';
    bar = (
      <button className="btn btn-teal btn-lg btn-block" onClick={() => upd((l) => (done ? nextAfterStage(l) : skipRest(l)))}>
        {done ? 'التالي' : 'تخطي الراحة'}
      </button>
    );
  } else if (stage?.kind === 'exercise') {
    if (stage.status === 'pending') {
      const single = stage.sets === 1;
      bar = (
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={() => {
            const t = Date.now();
            upd((l) => completeSet(l, t).live);
            vibrate(35, vib);
          }}
        >
          <Icon name="check" /> {single ? 'أنهيت التمرين' : `أنهيت السيت ${stage.setsDone + 1} من ${stage.sets}`}
        </button>
      );
    } else {
      bar = (
        <button className="btn btn-teal btn-lg btn-block" onClick={() => upd(nextAfterStage)}>
          التالي <Icon name="chevL" />
        </button>
      );
    }
  } else if (stage) {
    const total = stage.seconds ?? 0;
    const started = live.clock.startedAt != null;
    const el = clockElapsed(live, now);
    const label = stage.key === 'warmup' ? 'التسخين' : stage.key === 'cardio' ? 'الكارديو' : stage.kind === 'stretch' ? 'الإطالة' : 'الجلسة';
    if (stage.status !== 'pending') {
      bar = <button className="btn btn-teal btn-lg btn-block" onClick={() => upd(nextAfterStage)}>التالي <Icon name="chevL" /></button>;
    } else if (!started) {
      bar = (
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={() => upd((l) => startClock(l, Date.now()))}
        >
          <Icon name="play" /> {el > 0 ? 'استئناف' : `ابدأ ${label}`}
        </button>
      );
    } else {
      bar = (
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" style={{ minWidth: 64 }} aria-label="إيقاف مؤقت" onClick={() => upd((l) => pauseClock(l, Date.now()))}>
            <Icon name="pause" />
          </button>
          <button className={`btn btn-lg grow ${el >= total ? 'btn-teal' : 'btn-primary'}`} onClick={() => upd((l) => completeTimedStage(l, Date.now()))}>
            {el >= total ? 'التالي' : `إنهاء ${label} الآن`}
          </button>
        </div>
      );
    }
  }

  const meaningful = hasMeaningfulProgress(live, now);
  const pct = Math.round(progressFraction(live) * 100);
  const activeVisit = db?.visits.find((v) => !v.left_at) ?? null;
  const undoArrival = () => {
    if (!activeVisit) return;
    if (!window.confirm('هل ضغطت «وصلت النادي» بالغلط؟ سيُحذف تسجيل الوصول فقط.')) return;
    deleteGymVisit(activeVisit.id);
    if (!meaningful) {
      setLive(null);
      nav('/', { replace: true });
    }
  };

  return (
    <div className="live">
      <header className="live-head">
        <div className="live-head-row">
          <button className="icon-btn on-dark" onClick={() => nav('/')} aria-label="العودة للتطبيق دون إنهاء الجلسة">
            <Icon name="chevR" />
          </button>
          <div className="live-timer">
            <Clock seconds={elapsed} className="live-clock" />
            <span>{paused ? 'متوقفة مؤقتًا' : 'مدة الجلسة'}</span>
          </div>
          <button className="btn btn-sm btn-onhero-ghost" onClick={() => setEarlyOpen(true)}>
            <Icon name="flag" size={18} /> إنهاء مبكر
          </button>
        </div>
        <div className="live-title">
          {day ? (
            <>
              <b>اليوم {day.id}</b> · {day.focus}
            </>
          ) : (
            <b>{extraKind?.title ?? 'جلسة إضافية'}</b>
          )}
          {live.type === 'short' && <span className="tag tag-ghost">نسخة {live.shortMinutes} د</span>}
          {isExtra && <span className="tag tag-ghost">إضافية</span>}
        </div>
        {isExtra ? (
          <div className="phasebar single" aria-hidden="true"><div><i style={{ width: `${timedFrac(stage) * 100}%` }} /></div></div>
        ) : (
          <div className="phasebar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="تقدّم الجلسة">
            {warmupSt && <div className={inWarmup ? 'cur' : ''}><i style={{ width: `${timedFrac(warmupSt) * 100}%` }} /><span>تسخين</span></div>}
            <div className={`wide ${inIron ? 'cur' : ''}`}><i style={{ width: `${ironFrac * 100}%` }} /><span>حديد</span></div>
            <div className={inCardio ? 'cur' : ''}><i style={{ width: `${timedFrac(cardioSt) * 100}%` }} /><span>كارديو</span></div>
            <div className={inStretch ? 'cur' : ''}><i style={{ width: `${timedFrac(stretchSt) * 100}%` }} /><span>إطالة</span></div>
          </div>
        )}
        {activeVisit && (
          <button type="button" className="live-undo-arrival" onClick={undoArrival}>وصلت بالغلط؟ تراجع</button>
        )}
      </header>

      <main className={`live-body ${live.rest && live.phase === 'running' ? 'has-rest' : ''}`}>
        {body}
        {paused && !readyOpen && (
          <div className="pause-veil" role="status">
            <Icon name="pause" size={30} />
            <b>الجلسة متوقفة مؤقتًا</b>
            <span className="muted">الوقت متوقف حتى تستأنف.</span>
          </div>
        )}
      </main>

      {bar && (
        <div className="live-bar">
          <div className="live-bar-in">
            {live.rest && live.phase === 'running' && (
              <RestPanel live={live} now={now} onSkip={() => upd((l) => (stage?.status !== 'pending' ? nextAfterStage(l) : skipRest(l)))} onAdd={(s) => upd((l) => addRest(l, s))} />
            )}
            {bar}
          </div>
        </div>
      )}

      {/* قائمة جاهز؟ */}
      <Sheet
        open={readyOpen}
        onClose={closeReady}
        title="جاهز؟"
        footer={
          <button className="btn btn-primary btn-lg btn-block" onClick={closeReady}>
            ابدأ التمرين
          </button>
        }
      >
        <p className="muted" style={{ fontSize: 14 }}>لحظة قبل البداية:</p>
        <div className="stack" style={{ gap: 8 }}>
          {READY_CHECKLIST.map((item) => (
            <button key={item} className={`ready-item ${ready[item] ? 'on' : ''}`} onClick={() => setReady((r) => ({ ...r, [item]: !r[item] }))} aria-pressed={!!ready[item]}>
              <span className="box">{ready[item] && <Icon name="check" size={18} />}</span>
              <span>{item}</span>
            </button>
          ))}
        </div>
        <button className="ready-item" onClick={() => setHideForever((v) => !v)} aria-pressed={hideForever} style={{ marginTop: 6 }}>
          <span className={`box ${hideForever ? 'on' : ''}`}>{hideForever && <Icon name="check" size={18} />}</span>
          <span className="muted">لا تُظهر هذه القائمة مرة أخرى</span>
        </button>
      </Sheet>

      {/* إنهاء مبكر */}
      <Sheet open={earlyOpen} onClose={() => setEarlyOpen(false)} title="إنهاء الجلسة الآن؟">
        {meaningful ? (
          <p className="muted">سنحفظ ما أنجزته حتى الآن — الذهاب لجلسة ناقصة أفضل من لا شيء.</p>
        ) : (
          <p className="muted">لم تنجز شيئًا يُحفظ بعد. يمكنك المتابعة أو تجاهل الجلسة.</p>
        )}
        <div className="stack" style={{ gap: 10 }}>
          {meaningful && <button className="btn btn-primary btn-lg btn-block" onClick={startEarlyFinish}>إنهاء وحفظ ما أنجزته</button>}
          <button className="btn btn-ghost btn-block" onClick={() => setEarlyOpen(false)}>متابعة التمرين</button>
          <button className="btn btn-danger btn-block" onClick={() => { setEarlyOpen(false); setDiscardOpen(true); }}>تجاهل الجلسة بدون حفظ</button>
        </div>
      </Sheet>

      <Sheet open={discardOpen} onClose={() => setDiscardOpen(false)} title="تجاهل الجلسة؟">
        <p className="muted">لن يُحفظ شيء من هذه الجلسة ولن تُحتسب.</p>
        <button className="btn btn-danger btn-block" onClick={handleDiscard}>نعم، تجاهل</button>
        <button className="btn btn-ghost btn-block" onClick={() => setDiscardOpen(false)}>رجوع</button>
      </Sheet>
    </div>
  );
}
