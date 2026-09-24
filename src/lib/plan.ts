/**
 * يبني «خطة الجلسة» من بيانات البرنامج + المرحلة + تعديلات المستخدم + نسخة الجلسة المختصرة.
 * لا يخترع تمارين: كل شيء مأخوذ من data/program.ts.
 */
import {
  ACTIVE_PROGRAM,
  DAY_BY_ID,
  PHASES,
  SESSION_STRUCTURE,
  SHORT_PRESETS,
  buildCardioSegments,
  phaseForWeek,
  type CardioSegment,
  type DayDef,
  type DayId,
  type PhaseDef,
  type ShortPreset,
  type ShortMinutes,
} from '../data/program';
import type { MachineId } from '../data/machines';
import type { Settings } from './types';

export interface ResolvedExercise {
  machineId: MachineId;
  sets: number;
  reps: string;
  rest: number;
  timed: boolean;
}

export interface ResolvedPlan {
  day: DayDef;
  phase: PhaseDef;
  /** هل طُبقت قيم «رجعت للنادي» (أوزان خفيفة)؟ */
  comeback: boolean;
  short: ShortPreset | null;
  warmupMinutes: number;
  weightsFirst: boolean;
  cardio: {
    machineId: MachineId;
    mode: 'steady' | 'intervals';
    minutes: number;
    segments: CardioSegment[];
    note: string;
  };
  exercises: ResolvedExercise[];
  circuit: { rounds: number; optionalFrom: number | null; roundRest: number } | null;
  stretchMinutes: number;
  /** التقدير الكلي بالدقائق */
  totalMinutes: number;
  /** التمارين التي حُذفت في النسخة المختصرة */
  dropped: MachineId[];
}

export function estimateExerciseMinutes(sets: number, rest: number, timed = false): number {
  const work = timed ? 35 : 40; // ثوانٍ لكل سيت تقريبًا
  return (sets * work + Math.max(0, sets - 1) * rest + 20) / 60; // +20ث للانتقال بين الأجهزة
}

export function resolvePlan(
  dayId: DayId,
  programWeek: number,
  settings: Settings | null,
  opts: { shortMinutes?: ShortMinutes | null } = {},
): ResolvedPlan {
  const day = DAY_BY_ID[dayId];
  const comeback = (settings?.comeback_sessions_left ?? 0) > 0;
  // في «رجعت للنادي» نستعمل قيم مرحلة التأقلم (أوزان خفيفة جدًا) دون تغيير أسبوع البرنامج
  const phase = comeback ? PHASES[0] : phaseForWeek(programWeek);
  const preset = opts.shortMinutes ? SHORT_PRESETS.find((p) => p.minutes === opts.shortMinutes) ?? null : null;

  const ov = settings?.program_overrides ?? {};
  let exercises: ResolvedExercise[] = day.exercises.map((e) => {
    const o = ov[`${day.id}:${e.machineId}`];
    let sets = e.sets;
    let reps = e.reps;
    if (e.phaseScaled) {
      // التأقلم يقلّل السيتات؛ المراحل الأخرى قد تُبقي تكرارات جدول اليوم أو تستبدلها حسب الخطة النشطة.
      sets = phase.id === 'adapt' ? Math.min(phase.sets, e.sets) : e.sets;
      reps = phase.preserveTableReps ? e.reps : phase.reps;
    }
    if (o?.sets) sets = o.sets;
    if (o?.reps) reps = o.reps;
    return { machineId: e.machineId, sets, reps, rest: o?.rest ?? e.rest, timed: !!e.timed };
  });

  let circuit: ResolvedPlan['circuit'] = null;
  if (day.kind === 'circuit' && day.circuit) {
    const rounds = phase.id === 'adapt' ? day.circuit.roundsMin : day.circuit.roundsMax;
    circuit = {
      rounds,
      optionalFrom: rounds > day.circuit.roundsMin ? day.circuit.roundsMin + 1 : null,
      roundRest: day.circuit.restBetweenRounds,
    };
  }

  const cardioMinutesFull = settings?.cardio_overrides?.[String(day.id)] ?? SESSION_STRUCTURE.cardio;
  let cardioMinutes = cardioMinutesFull;
  let warmupMinutes = SESSION_STRUCTURE.warmup;
  let stretch: number = SESSION_STRUCTURE.stretch;
  const dropped: MachineId[] = [];

  if (preset) {
    cardioMinutes = preset.cardio;
    stretch = preset.stretch;
    if (ACTIVE_PROGRAM.key === 'abdulsalam' && preset.minutes === 45) {
      // ملف عبدالسلام: عند ضيق الوقت إلى 45 دقيقة يُحذف التمرين الخامس ويُخفض الكارديو إلى 10 دقائق.
      const removed = exercises.slice(4);
      removed.forEach((e) => dropped.push(e.machineId));
      exercises = exercises.slice(0, 4);
    } else if (circuit) {
      // الدائري: جولة أو جولتان بحسب الميزانية
      const perRound = (exercises.length * (40 + 30)) / 60 + 1;
      circuit = { rounds: Math.max(1, Math.min(2, Math.floor(preset.iron / perRound))), optionalFrom: null, roundRest: circuit.roundRest };
    } else {
      let budget = preset.iron;
      const kept: ResolvedExercise[] = [];
      for (const e of exercises) {
        const sets = Math.min(e.sets, preset.maxSets);
        const cost = estimateExerciseMinutes(sets, e.rest, e.timed);
        if (kept.length >= 2 && budget - cost < -0.5) {
          dropped.push(e.machineId);
          continue;
        }
        kept.push({ ...e, sets });
        budget -= cost;
      }
      exercises = kept;
    }
  }

  const mode = cardioMinutes < 12 ? 'steady' : day.cardio.mode;
  const segments = buildCardioSegments(mode, cardioMinutes, phase.id, day.id);

  const totalMinutes = preset ? preset.minutes : SESSION_STRUCTURE.total;

  return {
    day,
    phase,
    comeback,
    short: preset,
    warmupMinutes,
    weightsFirst: ACTIVE_PROGRAM.weightsFirst,
    cardio: { machineId: day.cardio.machineId, mode, minutes: cardioMinutes, segments, note: day.cardio.note },
    exercises,
    circuit,
    stretchMinutes: stretch,
    totalMinutes,
    dropped,
  };
}

/** نص «سيتات × تكرار» للعرض: 3 × 12 */
export function setsRepsLabel(e: { sets: number; reps: string; timed?: boolean }): string {
  return `${e.sets} × ${e.reps}`;
}
