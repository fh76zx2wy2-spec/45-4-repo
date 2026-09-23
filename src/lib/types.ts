import type { CardioSegment, DayId } from '../data/program';

export type SessionType = 'normal' | 'short' | 'extra';
export type Difficulty = 'easy' | 'good' | 'hard';
export type ExerciseStatus = 'done' | 'partial' | 'skipped' | 'substituted';

export interface SessionExercise {
  id: string;
  session_id: string;
  user_id: string;
  /** مفتاح الجهاز (machines.ts) */
  exercise_id: string;
  position: number;
  status: ExerciseStatus;
  sets_planned: number;
  sets_done: number;
  reps: string;
  rest_seconds: number;
  weight_kg: number | null;
  /** إن استُبدل تمرين آخر به: مفتاح التمرين الأصلي */
  substituted_for: string | null;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  /** ISO ميلادي YYYY-MM-DD (المخزَّن داخليًا) */
  date: string;
  /** 1..4، أو null لجلسات الكارديو/الإطالة الإضافية */
  workout_day: DayId | null;
  program_week: number;
  duration_seconds: number;
  cardio_seconds: number;
  completed: boolean;
  early_finish: boolean;
  session_type: SessionType;
  /** لجلسات extra: swim | light-cardio | bike | elliptical | stretch | mobility | recovery | day-repeat */
  extra_kind: string | null;
  short_minutes: number | null;
  difficulty: Difficulty | null;
  notes: string;
  started_at: string;
  ended_at: string;
  created_at: string;
  updated_at: string;
  /** يُخزَّن محليًا مضمَّنًا ويُحفظ في جدول workout_session_exercises */
  exercises: SessionExercise[];
}

export interface Measurement {
  id: string;
  user_id: string;
  /** بداية الأسبوع (ISO) — قياس واحد للوزن في الأسبوع */
  week_start: string;
  measured_on: string;
  weight_kg: number | null;
  waist_cm: number | null;
  program_week: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SavedAudio {
  id: string;
  user_id: string;
  title: string;
  url: string;
  kind: 'youtube' | 'playlist' | 'spotify' | 'other';
  section: 'recitation' | 'podcast' | 'saved';
  created_at: string;
  updated_at: string;
}


export interface GymVisit {
  id: string;
  user_id: string;
  /** تاريخ الزيارة حسب وقت الوصول المحلي */
  date: string;
  arrived_at: string;
  left_at: string | null;
  /** تُحدَّث عند المغادرة؛ أثناء الزيارة نحسبها من arrived_at */
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

/** بيانات Apple Health المستوردة اختيارياً؛ لا تغيّر جلسات البرنامج ولا احتساب 4/4. */
export interface AppleHealthRecord {
  id: string;
  user_id: string;
  date: string;
  workout_type: string;
  duration_seconds: number;
  active_kcal: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  distance_km: number | null;
  steps: number | null;
  source_started_at: string | null;
  source_ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyLog {
  user_id: string;
  date: string;
  water_cups: number;
  free_meal: boolean;
  updated_at: string;
}

export interface ProgramOverride {
  sets?: number;
  reps?: string;
  rest?: number;
}

export interface Settings {
  user_id: string;
  theme: 'system' | 'light' | 'dark';
  /** بداية أسبوع البرنامج (ISO) — تُضبط تلقائيًا عند أول جلسة */
  program_start_date: string | null;
  /** 0 = الأحد (الافتراضي) · 6 = السبت · 1 = الاثنين */
  week_start: number;
  vibration: boolean;
  sound: boolean;
  wake_lock: boolean;
  hide_ready_checklist: boolean;
  /** تعديلات المستخدم على البرنامج — المفتاح "dayId:machineId" */
  program_overrides: Record<string, ProgramOverride>;
  /** مدة الكارديو بالدقائق لكل يوم (المفتاح: رقم اليوم) */
  cardio_overrides: Record<string, number>;
  /** عدد الجلسات القادمة بأوزان خفيفة بعد «رجعت للنادي» */
  comeback_sessions_left: number;
  dismissed: Record<string, string>;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  updated_at: string;
}

/* ===================== الجلسة المباشرة (محلية) ===================== */

export type StageKind = 'cardio' | 'exercise' | 'stretch' | 'timed';

export interface LiveStage {
  key: string;
  kind: StageKind;
  /** كتلة الترتيب: التأجيل يتم ضمن الكتلة نفسها */
  block: number;
  machineId: string;
  /** السيتات أو الجولات: للحديد 1..n، وللدائري 1 لكل خطوة */
  sets: number;
  reps: string;
  rest: number;
  setsDone: number;
  status: 'pending' | 'done' | 'skipped';
  deferred: boolean;
  weight: number | null;
  substitutedFor: string | null;
  /** للتمرين الدائري */
  round?: number;
  rounds?: number;
  /** بعد إنهاء هذه الخطوة: راحة إضافية (راحة الجولة) */
  roundRest?: number;
  /** للكارديو والإطالة والجلسات الإضافية: المدة بالثواني */
  seconds?: number;
  cardioMode?: 'steady' | 'intervals';
  /** جدول الكارديو (تسخين/أسرع/هادئ) */
  segments?: CardioSegment[];
  /** الوقت الفعلي الذي قضاه المستخدم في الكارديو (ثوانٍ) */
  spent?: number;
  timed?: boolean;
  /** الجولة الاختيارية (الثالثة في اليوم الدائري) */
  optional?: boolean;
}

export interface Clock {
  startedAt: number | null;
  acc: number;
}

export interface LiveSession {
  id: string;
  date: string;
  day: DayId | null;
  type: SessionType;
  extraKind: string | null;
  shortMinutes: number | null;
  programWeek: number;
  phase: 'running' | 'interstitial' | 'finishing';
  /** نوع الشاشة البينية: عودة لجهاز مؤجل، أو جولة اختيارية */
  inter: 'deferred' | 'optional' | null;
  optionalAccepted: boolean;
  startedAt: number;
  pausedAt: number | null;
  pausedTotal: number;
  stages: LiveStage[];
  cur: number;
  /** راحة جارية: طابع زمن الانتهاء + المدة الكلية */
  rest: { endsAt: number; total: number; label: string } | null;
  /** ساعة المرحلة (كارديو/إطالة/جلسة إضافية) */
  clock: Clock;
  early: boolean;
}
