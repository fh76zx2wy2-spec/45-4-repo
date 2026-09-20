/**
 * محرك «التمرين المباشر»: دوال نقية على كائن LiveSession.
 * الوقت كله محسوب من طوابع زمنية (Date.now) لا من عدّادات، ليصمد أمام إغلاق الشاشة والعودة للتطبيق.
 */
import { EXTRA_BY_ID, type DayId } from '../data/program';
import { ALTERNATIVES, MACHINES, type MachineId } from '../data/machines';
import type { LiveSession, LiveStage, Session, SessionExercise } from './types';
import type { ResolvedPlan } from './plan';
import { todayISO } from './dates';

export function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  (c ?? { getRandomValues: (a: Uint8Array) => a.map(() => Math.floor(Math.random() * 256)) }).getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const baseStage = (over: Partial<LiveStage> & Pick<LiveStage, 'key' | 'kind' | 'block' | 'machineId'>): LiveStage => ({
  sets: 1,
  reps: '',
  rest: 0,
  setsDone: 0,
  status: 'pending',
  deferred: false,
  weight: null,
  substitutedFor: null,
  ...over,
});

/** يبني جلسة مباشرة من خطة يوم */
export function startLiveFromPlan(
  plan: ResolvedPlan,
  meta: { programWeek: number; type: 'normal' | 'short'; now?: number; date?: string; lastWeights?: Record<string, number> },
): LiveSession {
  const now = meta.now ?? Date.now();
  const lw = meta.lastWeights ?? {};
  const stages: LiveStage[] = [];
  stages.push(
    baseStage({
      key: 'cardio',
      kind: 'cardio',
      block: 0,
      machineId: plan.cardio.machineId,
      seconds: plan.cardio.minutes * 60,
      cardioMode: plan.cardio.mode,
      segments: plan.cardio.segments,
      reps: `${plan.cardio.minutes} د`,
    }),
  );
  let lastBlock = 0;
  if (plan.circuit) {
    const { rounds, optionalFrom, roundRest } = plan.circuit;
    for (let r = 1; r <= rounds; r++) {
      plan.exercises.forEach((e, i) => {
        stages.push(
          baseStage({
            key: `r${r}-${e.machineId}`,
            kind: 'exercise',
            block: r,
            machineId: e.machineId,
            sets: 1,
            reps: e.reps,
            rest: e.rest,
            round: r,
            rounds,
            roundRest: i === plan.exercises.length - 1 ? roundRest : undefined,
            optional: optionalFrom != null && r >= optionalFrom,
            weight: lw[e.machineId] ?? null,
          }),
        );
      });
    }
    lastBlock = rounds;
  } else {
    plan.exercises.forEach((e) => {
      stages.push(
        baseStage({
          key: `ex-${e.machineId}`,
          kind: 'exercise',
          block: 0,
          machineId: e.machineId,
          sets: e.sets,
          reps: e.reps,
          rest: e.rest,
          timed: e.timed,
          weight: lw[e.machineId] ?? null,
        }),
      );
    });
  }
  stages.push(
    baseStage({ key: 'stretch', kind: 'stretch', block: lastBlock + 1, machineId: 'stretch', seconds: plan.stretchMinutes * 60 }),
  );
  return {
    id: uuid(),
    date: meta.date ?? todayISO(new Date(now)),
    day: plan.day.id,
    type: meta.type,
    extraKind: null,
    shortMinutes: plan.short?.minutes ?? null,
    programWeek: meta.programWeek,
    phase: 'running',
    inter: null,
    optionalAccepted: false,
    startedAt: now,
    pausedAt: null,
    pausedTotal: 0,
    stages,
    cur: 0,
    rest: null,
    clock: { startedAt: null, acc: 0 },
    early: false,
  };
}

/** جلسة إضافية بمرحلة واحدة موقّتة */
export function startLiveExtra(
  kindId: string,
  minutes: number,
  meta: { programWeek: number; now?: number; day?: DayId | null; asDayRepeat?: boolean },
): LiveSession {
  const now = meta.now ?? Date.now();
  const kind = EXTRA_BY_ID[kindId];
  const machine = kind?.machineIllustration ?? 'recovery';
  return {
    id: uuid(),
    date: todayISO(new Date(now)),
    day: null,
    type: 'extra',
    extraKind: kindId,
    shortMinutes: null,
    programWeek: meta.programWeek,
    phase: 'running',
    inter: null,
    optionalAccepted: false,
    startedAt: now,
    pausedAt: null,
    pausedTotal: 0,
    stages: [baseStage({ key: 'extra', kind: 'timed', block: 0, machineId: machine, seconds: minutes * 60, reps: `${minutes} د` })],
    cur: 0,
    rest: null,
    clock: { startedAt: null, acc: 0 },
    early: false,
  };
}

/* ------------------------- الوقت ------------------------- */

export function elapsedSession(live: LiveSession, now: number): number {
  const end = live.pausedAt ?? now;
  return Math.max(0, Math.floor((end - live.startedAt - live.pausedTotal) / 1000));
}

export function clockElapsed(live: LiveSession, now: number): number {
  const c = live.clock;
  const run = c.startedAt != null ? (live.pausedAt ?? now) - c.startedAt : 0;
  return Math.max(0, Math.floor((c.acc + run) / 1000));
}

export function pauseLive(live: LiveSession, now: number): LiveSession {
  if (live.pausedAt) return live;
  return { ...live, pausedAt: now };
}

export function resumeLive(live: LiveSession, now: number): LiveSession {
  if (!live.pausedAt) return live;
  const delta = now - live.pausedAt;
  return {
    ...live,
    pausedAt: null,
    pausedTotal: live.pausedTotal + delta,
    rest: live.rest ? { ...live.rest, endsAt: live.rest.endsAt + delta } : null,
    clock: live.clock.startedAt != null ? { ...live.clock, startedAt: live.clock.startedAt + delta } : live.clock,
  };
}

export function startClock(live: LiveSession, now: number): LiveSession {
  if (live.clock.startedAt != null) return live;
  return { ...live, clock: { ...live.clock, startedAt: now } };
}

export function pauseClock(live: LiveSession, now: number): LiveSession {
  if (live.clock.startedAt == null) return live;
  return { ...live, clock: { startedAt: null, acc: live.clock.acc + (now - live.clock.startedAt) } };
}

/* ------------------------- التنقل ------------------------- */

export function currentStage(live: LiveSession): LiveStage | null {
  return live.stages[live.cur] ?? null;
}

export function pendingDeferred(live: LiveSession): LiveStage[] {
  return live.stages.filter((s) => s.deferred && s.status === 'pending');
}

/**
 * يختار المرحلة التالية بعد إنهاء الحالية:
 * - أول مرحلة معلّقة غير مؤجلة في أقدم كتلة تحوي مراحل معلّقة.
 * - إن لم يبقَ في الكتلة غير المؤجل → شاشة «بقي N مؤجل».
 * - الجولة الاختيارية تسأل المستخدم أولًا.
 */
export function advance(live: LiveSession): LiveSession {
  const next: LiveSession = { ...live, rest: null, clock: { startedAt: null, acc: 0 }, inter: null, phase: 'running' };
  const pending = next.stages.map((s, i) => ({ s, i })).filter((x) => x.s.status === 'pending');
  if (!pending.length) return { ...next, phase: 'finishing' };
  const block = Math.min(...pending.map((x) => x.s.block));
  const inBlock = pending.filter((x) => x.s.block === block);
  const normal = inBlock.find((x) => !x.s.deferred);
  if (normal) {
    if (normal.s.optional && !next.optionalAccepted) {
      return { ...next, cur: normal.i, phase: 'interstitial', inter: 'optional' };
    }
    return { ...next, cur: normal.i };
  }
  const def = inBlock[0];
  return { ...next, cur: def.i, phase: 'interstitial', inter: 'deferred' };
}

/** قبول الجولة الاختيارية أو العودة للجهاز المؤجل */
export function acceptInterstitial(live: LiveSession): LiveSession {
  const stages = live.stages.map((s, i) => (i === live.cur ? { ...s, deferred: false } : s));
  return { ...live, stages, phase: 'running', inter: null, optionalAccepted: live.inter === 'optional' ? true : live.optionalAccepted };
}

/** رفض الجولة الاختيارية: تُتخطى كل المراحل الاختيارية */
export function declineOptional(live: LiveSession): LiveSession {
  const stages = live.stages.map((s) => (s.optional && s.status === 'pending' ? { ...s, status: 'skipped' as const } : s));
  return advance({ ...live, stages });
}

/** «الجهاز مشغول»: تأجيل المرحلة الحالية إلى نهاية كتلتها */
export function markBusy(live: LiveSession): LiveSession {
  const cur = live.stages[live.cur];
  if (!cur || cur.status !== 'pending') return live;
  const sameBlock = live.stages.filter((s, i) => i !== live.cur && s.block === cur.block && s.status === 'pending' && !s.deferred);
  if (!sameBlock.length) return live; // لا يوجد ما نتنقل إليه
  const stages = live.stages.slice();
  const [moved] = stages.splice(live.cur, 1);
  // آخر موضع لكتلته
  let insertAt = stages.length;
  for (let i = stages.length - 1; i >= 0; i--) {
    if (stages[i].block === moved.block) {
      insertAt = i + 1;
      break;
    }
  }
  stages.splice(insertAt, 0, { ...moved, deferred: true });
  return advance({ ...live, stages, cur: live.cur });
}

export function canPostpone(live: LiveSession): boolean {
  const cur = live.stages[live.cur];
  if (!cur || cur.status !== 'pending') return false;
  return live.stages.some((s, i) => i !== live.cur && s.block === cur.block && s.status === 'pending' && !s.deferred);
}

export function skipStage(live: LiveSession): LiveSession {
  const stages = live.stages.map((s, i) => (i === live.cur ? { ...s, status: 'skipped' as const } : s));
  return advance({ ...live, stages });
}

/** بدائل معتمدة للمرحلة الحالية (قد تكون فارغة) */
export function alternativesFor(stage: LiveStage): { id: MachineId; note: string }[] {
  const base = (stage.substitutedFor ?? stage.machineId) as MachineId;
  return ALTERNATIVES[base] ?? [];
}

export function substituteStage(live: LiveSession, machineId: string): LiveSession {
  const stages = live.stages.map((s, i) =>
    i === live.cur ? { ...s, machineId, substitutedFor: s.substitutedFor ?? s.machineId } : s,
  );
  return { ...live, stages };
}

export function setWeight(live: LiveSession, weight: number | null): LiveSession {
  const stages = live.stages.map((s, i) => (i === live.cur ? { ...s, weight } : s));
  return { ...live, stages };
}

/**
 * يعلّم سيتًا كمكتمل. يعيد الحالة الجديدة، مع راحة تلقائية إن لزم:
 * - بعد كل سيت غير أخير: راحة الجهاز.
 * - بعد آخر سيت في تمرين دائري: راحة 30 ث (وراحة الجولة إن كان آخر تمرين فيها).
 */
export function completeSet(live: LiveSession, now: number): { live: LiveSession; restStarted: boolean; stageDone: boolean } {
  const st = live.stages[live.cur];
  if (!st || st.status !== 'pending') return { live, restStarted: false, stageDone: false };
  const setsDone = Math.min(st.sets, st.setsDone + 1);
  const stageDone = setsDone >= st.sets;
  const stages = live.stages.map((s, i) => (i === live.cur ? { ...s, setsDone, status: stageDone ? ('done' as const) : s.status } : s));
  let rest: LiveSession['rest'] = null;
  if (!stageDone && st.rest > 0) rest = { endsAt: now + st.rest * 1000, total: st.rest, label: 'راحة' };
  if (stageDone && st.round) {
    const isLastOfRound = st.roundRest != null;
    const total = isLastOfRound ? st.roundRest! : st.rest;
    const hasMore = stages.some((s) => s.status === 'pending');
    if (hasMore && total > 0) rest = { endsAt: now + total * 1000, total, label: isLastOfRound ? 'راحة الجولة' : 'راحة' };
  }
  return { live: { ...live, stages, rest }, restStarted: !!rest, stageDone };
}

export function undoSet(live: LiveSession): LiveSession {
  const st = live.stages[live.cur];
  if (!st || st.setsDone <= 0) return live;
  const stages = live.stages.map((s, i) => (i === live.cur ? { ...s, setsDone: s.setsDone - 1, status: 'pending' as const } : s));
  return { ...live, stages, rest: null };
}

export function skipRest(live: LiveSession): LiveSession {
  return { ...live, rest: null };
}

export function addRest(live: LiveSession, seconds: number): LiveSession {
  if (!live.rest) return live;
  return { ...live, rest: { ...live.rest, endsAt: live.rest.endsAt + seconds * 1000, total: live.rest.total + seconds } };
}

/** إنهاء مرحلة موقّتة (كارديو/إطالة/جلسة إضافية) */
export function completeTimedStage(live: LiveSession, now: number): LiveSession {
  const spent = clockElapsed(live, now);
  const stages = live.stages.map((s, i) => (i === live.cur ? { ...s, status: 'done' as const, spent } : s));
  return advance({ ...live, stages });
}

export function markStageDone(live: LiveSession): LiveSession {
  const stages = live.stages.map((s, i) => (i === live.cur ? { ...s, status: 'done' as const, setsDone: s.sets } : s));
  return advance({ ...live, stages });
}

/** «التالي» بعد اكتمال كل سيتات الجهاز */
export function nextAfterStage(live: LiveSession): LiveSession {
  return advance({ ...live, rest: null });
}

export function progressFraction(live: LiveSession): number {
  const total = live.stages.filter((s) => !s.optional || live.optionalAccepted).length;
  const done = live.stages.filter((s) => (!s.optional || live.optionalAccepted) && s.status !== 'pending').length;
  return total ? done / total : 0;
}

/* ------------------------- التحويل إلى جلسة محفوظة ------------------------- */

export function liveToSession(
  live: LiveSession,
  userId: string,
  now: number,
  extra: { difficulty: Session['difficulty']; notes: string; early: boolean },
): Session {
  const nowIso = new Date(now).toISOString();
  const duration = elapsedSession(live, now);
  const rows: SessionExercise[] = [];
  live.stages.forEach((s) => {
    if (s.kind === 'stretch') return;
    if (s.optional && s.status === 'pending') return;
    let status: SessionExercise['status'];
    if (s.substitutedFor && s.status === 'done') status = 'substituted';
    else if (s.status === 'done') status = 'done';
    else if (s.status === 'pending' && s.setsDone > 0) status = 'partial';
    else if (s.status === 'pending' && s.kind === 'cardio' && (s.spent ?? 0) > 0) status = 'partial';
    else if (s.status === 'skipped' || s.status === 'pending') status = s.setsDone > 0 ? 'partial' : 'skipped';
    else status = 'skipped';
    rows.push({
      id: uuid(),
      session_id: live.id,
      user_id: userId,
      exercise_id: s.machineId,
      position: rows.length + 1,
      status,
      sets_planned: s.sets,
      sets_done: s.kind === 'cardio' || s.kind === 'timed' ? (s.status === 'done' ? 1 : 0) : s.setsDone,
      reps: s.reps,
      rest_seconds: s.rest,
      weight_kg: s.weight,
      substituted_for: s.substitutedFor,
      updated_at: nowIso,
    });
  });
  const cardioStage = live.stages.find((s) => s.kind === 'cardio' || s.kind === 'timed');
  // مدة الكارديو الفعلية؛ وإن انتهت المرحلة دون مؤقت نفترض المدة المخططة
  const cardioSeconds = cardioStage ? (cardioStage.spent ?? (cardioStage.status === 'done' ? cardioStage.seconds ?? 0 : 0)) : 0;
  const completed = !extra.early && live.stages.every((s) => s.status !== 'pending' || s.optional);
  return {
    id: live.id,
    user_id: userId,
    date: live.date,
    workout_day: live.day,
    program_week: live.programWeek,
    duration_seconds: duration,
    cardio_seconds: cardioSeconds,
    completed,
    early_finish: extra.early,
    session_type: live.type,
    extra_kind: live.extraKind,
    short_minutes: live.shortMinutes,
    difficulty: extra.difficulty,
    notes: extra.notes.trim(),
    started_at: new Date(live.startedAt).toISOString(),
    ended_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    exercises: rows,
  };
}

/** هل الجلسة الجارية تستحق الحفظ عند «إنهاء مبكر»؟ */
export function hasMeaningfulProgress(live: LiveSession, now: number): boolean {
  const anySet = live.stages.some((s) => s.setsDone > 0 || s.status === 'done' || (s.spent ?? 0) > 60);
  return anySet || elapsedSession(live, now) >= 600 || clockElapsed(live, now) >= 300;
}

export function machineName(id: string): { ar: string; en: string } {
  const m = MACHINES[id as MachineId];
  if (m) return { ar: m.ar, en: m.en };
  if (id === 'stretch') return { ar: 'إطالة', en: 'Stretching' };
  const ex = EXTRA_BY_ID[id];
  if (ex) return { ar: ex.title, en: '' };
  return { ar: id, en: '' };
}
