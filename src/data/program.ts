/**
 * البرنامج — مصدره ملف «خطة النادي» (PDF) صفحات 1–4.
 * كل ما يخص التمارين والسيتات والتكرارات والراحة والكارديو والمراحل موجود هنا فقط.
 * ولتعديل شيء دون لمس الكود: من داخل التطبيق (الإعدادات ← تعديل البرنامج)،
 * وتُحفَظ تعديلاتك في حسابك فوق هذه القيم الأصلية.
 */
import type { MachineId } from './machines';

export type DayId = 1 | 2 | 3 | 4;
export type PhaseId = 'adapt' | 'build' | 'firm';

/** بنية الجلسة الأصلية: 20 كارديو + 20 حديد + 5 إطالة = 45 دقيقة */
export interface SessionStructure {
  warmup: number;
  cardio: number;
  iron: number;
  stretch: number;
  total: number;
}

export let SESSION_STRUCTURE: SessionStructure = { warmup: 0, cardio: 20, iron: 20, stretch: 5, total: 45 };

export interface ActiveProgramMeta {
  key: 'ziyad' | 'abdulsalam';
  defaultName: string;
  email: string;
  weightsFirst: boolean;
  cardioEmbeddedWarmup: boolean;
}

export let ACTIVE_PROGRAM: ActiveProgramMeta = {
  key: 'ziyad',
  defaultName: 'زياد',
  email: 'z062496@gmail.com',
  weightsFirst: false,
  cardioEmbeddedWarmup: true,
};
export const WEEKLY_GOAL = 4;
export const PROGRAM_WEEKS = 12;

/** الأيام المقترحة في PDF: الأحد · الثلاثاء · الخميس · السبت (0 = الأحد) */
export const SUGGESTED_WEEKDAYS = [0, 2, 4, 6];

export interface CardioSpec {
  machineId: MachineId;
  /** ثابت طوال المدة، أو فترات (دقيقة أسرع + دقيقتان هادئتان) */
  mode: 'steady' | 'intervals';
  /** ملاحظة الإيقاع من PDF */
  note: string;
}

export interface DayExercise {
  machineId: MachineId;
  sets: number;
  /** التكرار كنص: "12" أو "20–30 ثانية" */
  reps: string;
  /** راحة بالثواني */
  rest: number;
  /** هل تتبع قاعدة المرحلة (تأقلم/بناء/تثبيت) في السيتات والتكرارات؟ */
  phaseScaled: boolean;
  /** هل الأداء بالثواني (بلانك)؟ */
  timed?: boolean;
}

export interface DayDef {
  id: DayId;
  /** العنوان الكامل كما في PDF */
  title: string;
  /** التركيز المختصر للعرض */
  focus: string;
  /** وصف السطر الثاني في PDF */
  subtitle: string;
  kind: 'straight' | 'circuit';
  cardio: CardioSpec;
  exercises: DayExercise[];
  /** ملخص الحديد في الجدول الأسبوعي */
  ironSummary: string;
  /** للجولات (اليوم 4) */
  circuit?: { roundsMin: number; roundsMax: number; restBetweenRounds: number };
  /** إطالة مقترحة لهذا اليوم (تلميح نصي) */
  stretchHint: string;
}

export let DAYS: DayDef[] = [
  {
    id: 1,
    title: 'الصدر والظهر والأكتاف',
    focus: 'الصدر · الظهر · الأكتاف',
    subtitle: 'الجزء العلوي من الجسم',
    kind: 'straight',
    cardio: {
      machineId: 'elliptical',
      mode: 'steady',
      note: '20 دقيقة بإيقاع ثابت ومقاومة خفيفة إلى متوسطة',
    },
    ironSummary: '4 أجهزة + بلانك',
    exercises: [
      { machineId: 'chest-press', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'lat-pulldown', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'seated-row', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'shoulder-press', sets: 2, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'plank', sets: 2, reps: '20–30 ثانية', rest: 45, phaseScaled: false, timed: true },
    ],
    stretchHint: 'الصدر والظهر والكتفان: شدّ لطيف 20–30 ثانية لكل وضعية.',
  },
  {
    id: 2,
    title: 'الأرجل والمؤخرة والبطن',
    focus: 'الأرجل · المؤخرة · البطن',
    subtitle: 'الجزء السفلي من الجسم',
    kind: 'straight',
    cardio: {
      machineId: 'bike',
      mode: 'steady',
      note: '20 دقيقة بإيقاع ثابت (60–80 دورة/دقيقة)',
    },
    ironSummary: '3 أجهزة + جسر الحوض + كرنش',
    exercises: [
      { machineId: 'leg-press', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'leg-extension', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'leg-curl', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'glute-bridge', sets: 2, reps: '15', rest: 45, phaseScaled: false },
      { machineId: 'crunch', sets: 2, reps: '15', rest: 45, phaseScaled: false },
    ],
    stretchHint: 'الفخذان والمؤخرة والساقان: شدّ لطيف 20–30 ثانية لكل وضعية.',
  },
  {
    id: 3,
    title: 'الصدر والأكتاف والذراعان',
    focus: 'الصدر · الأكتاف · الذراعان',
    subtitle: 'الجزء العلوي + حرق أكثر',
    kind: 'straight',
    cardio: {
      machineId: 'elliptical',
      mode: 'intervals',
      note: '20 دقيقة: دقيقة أسرع + دقيقتان هادئتان، كرّرها',
    },
    ironSummary: 'فراشة + دمبل + كيبل + بلانك',
    exercises: [
      { machineId: 'pec-deck', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'lateral-raise', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'biceps-curl', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'triceps-pushdown', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'plank', sets: 2, reps: '20–30 ثانية', rest: 45, phaseScaled: false, timed: true },
    ],
    stretchHint: 'الصدر والكتفان والذراعان: شدّ لطيف 20–30 ثانية لكل وضعية.',
  },
  {
    id: 4,
    title: 'جسم كامل — تمرين دائري',
    focus: 'جسم كامل — تمرين دائري',
    subtitle: 'أسرع وأكثر حرقًا للسعرات',
    kind: 'circuit',
    cardio: {
      machineId: 'bike',
      mode: 'intervals',
      note: '20 دقيقة: دقيقة أسرع + دقيقتان هادئتان، كرّرها',
    },
    ironSummary: '5 تمارين متتابعة بدون توقف طويل',
    circuit: { roundsMin: 2, roundsMax: 3, restBetweenRounds: 60 },
    exercises: [
      { machineId: 'leg-press', sets: 3, reps: '15', rest: 30, phaseScaled: false },
      { machineId: 'chest-press', sets: 3, reps: '15', rest: 30, phaseScaled: false },
      { machineId: 'lat-pulldown', sets: 3, reps: '15', rest: 30, phaseScaled: false },
      { machineId: 'glute-bridge', sets: 3, reps: '15', rest: 30, phaseScaled: false },
      { machineId: 'crunch', sets: 3, reps: '15', rest: 30, phaseScaled: false },
    ],
    stretchHint: 'الجسم كله: شدّ لطيف 20–30 ثانية لكل وضعية.',
  },
];

export let DAY_BY_ID: Record<DayId, DayDef> = Object.fromEntries(DAYS.map((d) => [d.id, d])) as Record<DayId, DayDef>;

/** «نفّذ التمارين الخمسة واحدًا بعد الآخر بدون توقف (راحة 30 ثانية بين كل تمرين)، ثم خذ دقيقة راحة وابدأ الجولة الثانية.» */
export const CIRCUIT_NOTE =
  'نفّذ التمارين الخمسة واحدًا بعد الآخر بدون توقف (راحة 30 ثانية بين كل تمرين)، ثم خذ دقيقة راحة وابدأ الجولة التالية.';

export const BUSY_NOTE = 'اكمل كل سيتات الجهاز ثم انتقل للتالي. إن كان الجهاز مشغولًا بدّل الترتيب.';

/* ======================== المراحل (التدرّج على 12 أسبوعًا) ======================== */

export interface PhaseDef {
  id: PhaseId;
  name: string;
  /** اسم الشارة كما في PDF */
  badge: string;
  from: number;
  to: number;
  /** الحديد */
  iron: string;
  /** الكارديو */
  cardio: string;
  /** قيمة السيتات/التكرار للتمارين التي تتبع المرحلة */
  sets: number;
  reps: string;
  /** وصف قصير لبطاقة الرئيسية */
  short: string;
  /** عند true تبقى تكرارات كل تمرين كما هي في جدول اليوم */
  preserveTableReps?: boolean;
}

export let PHASES: PhaseDef[] = [
  {
    id: 'adapt',
    name: 'التأقلم',
    badge: 'تأقلم',
    from: 1,
    to: 2,
    iron: 'سيتان × 15 تكرار، وزن خفيف جدًا. الهدف تعلّم الحركة',
    cardio: '20 دقيقة ثابتة، مقاومة خفيفة في كل الأيام',
    sets: 2,
    reps: '15',
    short: 'أوزان خفيفة جدًا · تعلّم الحركة',
    preserveTableReps: false,
  },
  {
    id: 'build',
    name: 'البناء',
    badge: 'بناء',
    from: 3,
    to: 6,
    iron: '3 سيتات × 12 تكرار، وزن متوسط (تنهي التكرار الأخير بجهد بسيط)',
    cardio: 'اليومان 1 و2 ثابت · اليومان 3 و4 فترات',
    sets: 3,
    reps: '12',
    short: '3 × 12 · وزن متوسط',
    preserveTableReps: true,
  },
  {
    id: 'firm',
    name: 'التثبيت والشدّ',
    badge: 'تثبيت وشدّ',
    from: 7,
    to: 12,
    iron: '3 سيتات × 10–12 تكرار، وزن أثقل قليلًا كل أسبوع أو أسبوعين',
    cardio: 'ارفع المقاومة درجة، أو مدّد الفترات السريعة إلى دقيقتين',
    sets: 3,
    reps: '10–12',
    short: '3 × 10–12 · وزن أثقل تدريجيًا',
    preserveTableReps: false,
  },
];

export function phaseForWeek(week: number): PhaseDef {
  return PHASES.find((p) => week >= p.from && week <= p.to) ?? PHASES[PHASES.length - 1];
}

export let WEIGHT_RULE =
  'إذا أنهيت كل التكرارات بسهولة في سيتات الجلسة كلها، ارفع الوزن بأصغر درجة في الجهاز في الجلسة التالية. لا ترفعه إن كان شكل الحركة سيتغيّر أو تحتاج إلى التأرجح.';

/** التلميح المعروض بعد تقييم «سهل» أكثر من مرة (لا يغيّر الوزن تلقائيًا) */
export let WEIGHT_HINT = 'إذا أنهيت جميع التكرارات بسهولة وبوضعية سليمة، يمكنك زيادة الوزن بأصغر درجة متاحة.';

export let CARDIO_INTENSITY =
  'اجعل الإيقاع بحيث تستطيع الكلام بجمل قصيرة لكن لا تستطيع الغناء (تقريبًا 6–7 من 10). إن كنت تقيس نبضك فالمنطقة المناسبة نحو 120–145 نبضة/دقيقة.';

export let INTERVAL_NOTE =
  'بعد التسخين: دقيقة أسرع (7–8 من 10) ثم دقيقتان هادئتان (5 من 10)، وكرّرها حتى نهاية الـ 20 دقيقة. ابدأ بها من الأسبوع 3.';

/* ======================== ملفّ الكارديو ======================== */

export interface CardioSegment {
  kind: 'warmup' | 'steady' | 'fast' | 'calm';
  seconds: number;
  label: string;
  hint: string;
  /** محطة الكارديو الحالية — تُستخدم لخطة زياد المتنوعة فقط. */
  station?: 'elliptical' | 'bike' | 'rower' | 'stairs';
  stationLabel?: string;
}

const MIXED_CARDIO_STATIONS: Array<NonNullable<CardioSegment['station']>> = ['elliptical', 'bike', 'rower', 'stairs'];
const MIXED_CARDIO_LABELS: Record<NonNullable<CardioSegment['station']>, string> = {
  elliptical: 'الأوبتيكال',
  bike: 'الدراجة',
  rower: 'التجديف الداخلي',
  stairs: 'جهاز الدرج',
};
const MIXED_CARDIO_HINTS: Record<NonNullable<CardioSegment['station']>, string> = {
  elliptical: 'إيقاع مريح ومقاومة خفيفة إلى متوسطة',
  bike: 'حافظ على دوران ثابت ومريح',
  rower: 'سحب هادئ ومنتظم بدون اندفاع',
  stairs: 'خطوات ثابتة وتمسّك بالمقابض للتوازن فقط',
};

function buildMixedCardio(minutes: number, dayId: DayId): CardioSegment[] {
  const total = Math.max(60, Math.round(minutes * 60));
  // 20 دقيقة = 6 + 5 + 5 + 4. وتتناسب تلقائيًا إذا قصّر المستخدم الكارديو.
  const weights = [0.30, 0.25, 0.25, 0.20];
  const rotation = (dayId - 1) % MIXED_CARDIO_STATIONS.length;
  const stations = [...MIXED_CARDIO_STATIONS.slice(rotation), ...MIXED_CARDIO_STATIONS.slice(0, rotation)];
  let used = 0;
  return stations.map((station, i) => {
    const seconds = i === stations.length - 1 ? total - used : Math.max(30, Math.round(total * weights[i]));
    used += seconds;
    return {
      kind: i === 0 ? 'warmup' : 'steady',
      seconds,
      label: MIXED_CARDIO_LABELS[station],
      station,
      stationLabel: MIXED_CARDIO_LABELS[station],
      hint: MIXED_CARDIO_HINTS[station],
    };
  });
}

/**
 * يبني جدول الكارديو للجلسة.
 * - زياد: كارديو متنوع بين الأوبتيكال والدراجة والتجديف والدرج بدل البقاء على جهاز واحد.
 * - عبدالسلام: تبقى خطة ملفه كما هي (ثابت/فترات).
 */
export function buildCardioSegments(
  mode: 'steady' | 'intervals',
  minutes: number,
  phase: PhaseId,
  dayId: DayId,
): CardioSegment[] {
  if (ACTIVE_PROGRAM.key === 'ziyad') return buildMixedCardio(minutes, dayId);

  const total = Math.round(minutes * 60);
  const warm = ACTIVE_PROGRAM.cardioEmbeddedWarmup ? Math.min(300, Math.round(total * 0.25)) : 0;
  const segs: CardioSegment[] = warm
    ? [{ kind: 'warmup', seconds: warm, label: 'تسخين هادئ', hint: 'إيقاع هادئ ومقاومة خفيفة' }]
    : [];
  let left = total - warm;
  if (mode === 'steady' || phase === 'adapt') {
    segs.push({ kind: 'steady', seconds: left, label: 'إيقاع ثابت', hint: 'تكلّم بجمل قصيرة ولا تستطيع الغناء (6–7 من 10)' });
    return segs;
  }
  const fast = phase === 'firm' ? 120 : 60;
  const calm = 120;
  while (left > 0) {
    const f = Math.min(fast, left);
    segs.push({ kind: 'fast', seconds: f, label: 'أسرع', hint: '7–8 من 10' });
    left -= f;
    if (left <= 0) break;
    const c = Math.min(calm, left);
    segs.push({ kind: 'calm', seconds: c, label: 'هادئ', hint: '5 من 10' });
    left -= c;
  }
  return segs;
}

/* ======================== الأسبوع الأول: حالة «رجعت للنادي» ======================== */

export let FIRST_VISIT_NOTE =
  'بما أنك منقطع فترة، ابدأ بأوزان خفيفة جدًا في الأسبوعين الأولين ولا تحاول «تعويض» ما فات. اطلب من مدرّب النادي أن يضبط لك مقاعد الأجهزة في أول مرة، فهذا يوفّر عليك الوقت ويحميك من الإصابة.';

export let SAFETY_NOTE =
  'ابدأ بأوزان خفيفة، وتوقف عن التمرين عند الشعور بأعراض غير معتادة، واستشر مختصًا عند الحاجة.';

export const WARNINGS: string[] = [
  'ابدأ خفيفًا؛ الألم العضلي الخفيف بعد الجلسات الأولى طبيعي ويزول خلال يومين.',
  'لا تحبس نَفَسك: زفير عند الدفع أو الشدّ، وشهيق عند الرجوع.',
  'اشرب ماء أثناء الجلسة وخذ راحة عند الحاجة.',
  'توقّف فورًا عند أي ألم حاد في المفصل أو دوخة أو ألم/ضيق في الصدر، واستشر الطبيب.',
];

export let GENERAL_DISCLAIMER =
  'هذه خطة عامة للتوجيه وليست بديلًا عن الطبيب أو مدرّب النادي. يُفضَّل فحص عام سريع قبل البدء بعد انقطاع طويل، ومراجعة المدرّب لضبط الأجهزة على جسمك.';

export const CONTINUE_TIPS: string[] = [
  'حدّد أيامك وموعدك الثابت، واعتبره موعدًا لا يُلغى.',
  'الجلسة القصيرة أفضل من عدم الذهاب؛ تعال ولو لنصف الخطة.',
  'صوّر نفسك (أو قِس خصرك) كل أسبوعين؛ الميزان لا يقول كل الحقيقة.',
  'نم جيدًا وخفّف الأكل الليلي.',
];

/* ======================== الجلسة المختصرة ======================== */

export type ShortMinutes = 15 | 25 | 30 | 45;

export interface ShortPreset {
  minutes: ShortMinutes;
  cardio: number;
  /** ميزانية الحديد بالدقائق */
  iron: number;
  stretch: number;
  maxSets: number;
  label: string;
}

/**
 * نسخ مختصرة: تحافظ على تركيز اليوم وترتيبه، فلا تُفسد توزيع البرنامج.
 * وتُحسب ضمن جلسات الأسبوع لليوم نفسه (الذهاب القصير أفضل من الإلغاء).
 */
export let SHORT_PRESETS: ShortPreset[] = [
  { minutes: 15, cardio: 6, iron: 7, stretch: 2, maxSets: 2, label: '15 دقيقة' },
  { minutes: 25, cardio: 10, iron: 12, stretch: 3, maxSets: 2, label: '25 دقيقة' },
  { minutes: 30, cardio: 12, iron: 14, stretch: 4, maxSets: 3, label: '30 دقيقة' },
];

/** الجلسة الأصلية 45 دقيقة */
export let SHORT_NOTE = 'الجلسة الأصلية 45 دقيقة. هذه نسخة مختصرة لليوم نفسه — الذهاب لفترة قصيرة أفضل من إلغاء اليوم بالكامل.';

/* ======================== الجلسة الخامسة الاختيارية ======================== */

export interface ExtraKind {
  id: string;
  title: string;
  desc: string;
  machineIllustration: string;
  minutes: number[];
  defaultMinutes: number;
  /** ملاحظة من PDF إن وجدت */
  note?: string;
}

export const EXTRA_KINDS: ExtraKind[] = [
  {
    id: 'swim',
    title: 'سباحة هادئة',
    desc: 'جسم كامل بدون ضغط على المفاصل',
    machineIllustration: 'pool',
    minutes: [15, 30],
    defaultMinutes: 30,
    note: 'ابدأ بـ 10–15 دقيقة إن كانت لياقتك قد نزلت.',
  },
  {
    id: 'light-cardio',
    title: 'كارديو خفيف',
    desc: 'إيقاع هادئ على الجهاز الذي تحبه',
    machineIllustration: 'elliptical',
    minutes: [15, 20, 30],
    defaultMinutes: 20,
  },
  {
    id: 'bike',
    title: 'دراجة',
    desc: 'إيقاع ثابت 60–80 دورة/دقيقة',
    machineIllustration: 'bike',
    minutes: [15, 20, 30],
    defaultMinutes: 20,
  },
  {
    id: 'elliptical',
    title: 'Elliptical',
    desc: 'حركة انسيابية لطيفة على الركب',
    machineIllustration: 'elliptical',
    minutes: [15, 20, 30],
    defaultMinutes: 20,
  },
  {
    id: 'stretch',
    title: 'إطالة',
    desc: 'شدّ لطيف لكل عضلات الجسم',
    machineIllustration: 'stretch',
    minutes: [10, 15, 20],
    defaultMinutes: 10,
  },
  {
    id: 'mobility',
    title: 'Mobility',
    desc: 'حركة مفاصل وتحريك خفيف',
    machineIllustration: 'mobility',
    minutes: [10, 15, 20],
    defaultMinutes: 10,
  },
  {
    id: 'recovery',
    title: 'استشفاء نشط',
    desc: 'مشي خفيف أو حركة هادئة',
    machineIllustration: 'recovery',
    minutes: [15, 20, 30],
    defaultMinutes: 20,
    note: 'في أيام الراحة يمكنك السباحة 30 دقيقة بهدوء (اختياري) أو مشيًا خفيفًا.',
  },
];

export const EXTRA_BY_ID: Record<string, ExtraKind> = Object.fromEntries(EXTRA_KINDS.map((e) => [e.id, e]));

/* ======================== قائمة «جاهز؟» ======================== */

export const READY_CHECKLIST = ['ماء', 'منشفة', 'سماعات'];

/* ======================== أسماء ======================== */

export const DAY_SHORT: Record<DayId, string> = {
  1: 'اليوم 1',
  2: 'اليوم 2',
  3: 'اليوم 3',
  4: 'اليوم 4',
};


/* ======================== الخطط حسب الحساب ======================== */

const ZIYAD_STRUCTURE: SessionStructure = { ...SESSION_STRUCTURE };
const ZIYAD_DAYS: DayDef[] = DAYS.map((d) => ({
  ...d,
  cardio: { ...d.cardio },
  exercises: d.exercises.map((e) => ({ ...e })),
  circuit: d.circuit ? { ...d.circuit } : undefined,
}));
const ZIYAD_PHASES: PhaseDef[] = PHASES.map((p) => ({ ...p }));
const ZIYAD_SHORT_PRESETS: ShortPreset[] = SHORT_PRESETS.map((p) => ({ ...p }));
const ZIYAD_SHORT_NOTE = SHORT_NOTE;
const ZIYAD_INTERVAL_NOTE = INTERVAL_NOTE;
const ZIYAD_WEIGHT_RULE = WEIGHT_RULE;

const ABDULSALAM_DAYS: DayDef[] = [
  {
    id: 1,
    title: 'الجزء العلوي (أ)',
    focus: 'صدر · ظهر · أكتاف · ترايسبس',
    subtitle: 'أوزان أثقل',
    kind: 'straight',
    cardio: { machineId: 'elliptical', mode: 'steady', note: '15 دقيقة بإيقاع ثابت بعد الحديد (تستطيع الكلام بجمل قصيرة) · ويمكن بدلًا منه المشي الداخلي على السير 15 دقيقة بسرعة وميل مريحين' },
    ironSummary: '5 تمارين · 35 دقيقة',
    exercises: [
      { machineId: 'chest-press', sets: 3, reps: '8–10', rest: 90, phaseScaled: true },
      { machineId: 'lat-pulldown', sets: 3, reps: '8–10', rest: 90, phaseScaled: true },
      { machineId: 'shoulder-press', sets: 3, reps: '10', rest: 90, phaseScaled: true },
      { machineId: 'seated-row', sets: 3, reps: '10', rest: 90, phaseScaled: true },
      { machineId: 'triceps-pushdown', sets: 2, reps: '12', rest: 60, phaseScaled: true },
    ],
    stretchHint: 'الصدر والظهر والأكتاف والذراعان: شدّ لطيف 20–30 ثانية لكل وضعية.',
  },
  {
    id: 2,
    title: 'الأرجل (أ)',
    focus: 'فخذ · سمانة · بطن',
    subtitle: 'أوزان أثقل',
    kind: 'straight',
    cardio: { machineId: 'bike', mode: 'steady', note: '15 دقيقة بإيقاع ثابت بعد الحديد (60–80 دورة/دقيقة) · ويمكن بدلًا منه المشي الداخلي على السير 15 دقيقة بسرعة وميل مريحين' },
    ironSummary: '5 تمارين · 35 دقيقة',
    exercises: [
      { machineId: 'leg-press', sets: 3, reps: '10', rest: 90, phaseScaled: true },
      { machineId: 'leg-extension', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'leg-curl', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'calf-raise', sets: 3, reps: '15', rest: 45, phaseScaled: true },
      { machineId: 'plank', sets: 3, reps: '30 ثانية', rest: 45, phaseScaled: true, timed: true },
    ],
    stretchHint: 'الفخذان والسمانة والورك: شدّ لطيف 20–30 ثانية لكل وضعية.',
  },
  {
    id: 3,
    title: 'الجزء العلوي (ب)',
    focus: 'ظهر · صدر · أكتاف · ذراعان',
    subtitle: 'تكرارات أكثر',
    kind: 'straight',
    cardio: { machineId: 'elliptical', mode: 'intervals', note: '15 دقيقة: دقيقة أسرع + دقيقتان هادئتان، كرّرها بعد الحديد · أو المشي الداخلي على السير 15 دقيقة كخيار مريح' },
    ironSummary: '5 تمارين · 35 دقيقة',
    exercises: [
      { machineId: 'lat-pulldown', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'pec-deck', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'lateral-raise', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'biceps-curl', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'triceps-pushdown', sets: 3, reps: '12', rest: 60, phaseScaled: true },
    ],
    stretchHint: 'الظهر والصدر والأكتاف والذراعان: شدّ لطيف 20–30 ثانية لكل وضعية.',
  },
  {
    id: 4,
    title: 'الأرجل (ب) + البطن',
    focus: 'مؤخرة · فخذ خلفي · بطن',
    subtitle: 'تكرارات أكثر',
    kind: 'straight',
    cardio: { machineId: 'bike', mode: 'intervals', note: '15 دقيقة: دقيقة أسرع + دقيقتان هادئتان، أو 20 دقيقة سباحة هادئة، أو المشي الداخلي على السير 15 دقيقة' },
    ironSummary: '5 تمارين · 35 دقيقة',
    exercises: [
      { machineId: 'leg-press', sets: 3, reps: '12–15', rest: 60, phaseScaled: true },
      { machineId: 'glute-bridge', sets: 3, reps: '15', rest: 60, phaseScaled: true },
      { machineId: 'leg-curl', sets: 3, reps: '12', rest: 60, phaseScaled: true },
      { machineId: 'crunch', sets: 3, reps: '15', rest: 45, phaseScaled: true },
      { machineId: 'plank', sets: 3, reps: '30 ثانية', rest: 45, phaseScaled: true, timed: true },
    ],
    stretchHint: 'المؤخرة والفخذ الخلفي والبطن: شدّ لطيف 20–30 ثانية لكل وضعية.',
  },
];

const ABDULSALAM_PHASES: PhaseDef[] = [
  {
    id: 'adapt',
    name: 'التأقلم',
    badge: 'تأقلم',
    from: 1,
    to: 2,
    iron: 'سيتان فقط لكل تمرين × 12–15 تكرار بوزن خفيف. تعلّم الحركة وضبط الجهاز.',
    cardio: '15 دقيقة ثابتة بمقاومة خفيفة في كل الأيام.',
    sets: 2,
    reps: '12–15',
    short: 'سيتان · وزن خفيف · تعلّم الحركة',
    preserveTableReps: false,
  },
  {
    id: 'build',
    name: 'البناء',
    badge: 'بناء',
    from: 3,
    to: 8,
    iron: '3 سيتات حسب الجدول. اترك في نفسك تكرارين تقريبًا قبل الفشل.',
    cardio: 'اليومان 1 و2 ثابت · اليومان 3 و4 فترات.',
    sets: 3,
    reps: '12',
    short: '3 سيتات حسب الجدول',
    preserveTableReps: true,
  },
  {
    id: 'firm',
    name: 'التقدّم',
    badge: 'تقدّم',
    from: 9,
    to: 12,
    iron: 'أوزان أثقل تدريجيًا، ويمكن إضافة سيت رابع للتمرين الأول في كل يوم.',
    cardio: 'ارفع المقاومة درجة، أو 20 دقيقة في اليومين الثابتين.',
    sets: 3,
    reps: '12',
    short: 'أوزان أثقل تدريجيًا',
    preserveTableReps: true,
  },
];

const ABDULSALAM_SHORT_PRESETS: ShortPreset[] = [
  { minutes: 45, cardio: 10, iron: 25, stretch: 5, maxSets: 3, label: '45 دقيقة' },
];

function mapDays(days: DayDef[]): Record<DayId, DayDef> {
  return Object.fromEntries(days.map((d) => [d.id, d])) as Record<DayId, DayDef>;
}

export function setProgramForEmail(email: string | null | undefined) {
  const e = (email ?? '').trim().toLowerCase();
  if (e === 'amk157662@gmail.com') {
    ACTIVE_PROGRAM = {
      key: 'abdulsalam',
      defaultName: 'عبدالسلام',
      email: 'amk157662@gmail.com',
      weightsFirst: true,
      cardioEmbeddedWarmup: false,
    };
    SESSION_STRUCTURE = { warmup: 5, cardio: 15, iron: 35, stretch: 5, total: 60 };
    DAYS = ABDULSALAM_DAYS.map((d) => ({
      ...d,
      cardio: { ...d.cardio },
      exercises: d.exercises.map((x) => ({ ...x })),
      circuit: d.circuit ? { ...d.circuit } : undefined,
    }));
    DAY_BY_ID = mapDays(DAYS);
    PHASES = ABDULSALAM_PHASES.map((p) => ({ ...p }));
    SHORT_PRESETS = ABDULSALAM_SHORT_PRESETS.map((p) => ({ ...p }));
    SHORT_NOTE = 'إذا ضاق وقتك إلى 45 دقيقة: احذف التمرين الخامس وخفّض الكارديو إلى 10 دقائق. الأهم ألا تترك الجلسة كلها.';
    INTERVAL_NOTE = 'في اليومين 3 و4: دقيقة أسرع + دقيقتان هادئتان، كرّرها حتى نهاية 15 دقيقة الكارديو.';
    WEIGHT_RULE = 'عندما تنجز أعلى رقم في نطاق التكرارات في كل السيتات بشكل نظيف، ارفع الوزن بأصغر درجة في الجلسة التالية ثم ابدأ من أول النطاق.';
    return;
  }

  ACTIVE_PROGRAM = {
    key: 'ziyad',
    defaultName: 'زياد',
    email: 'z062496@gmail.com',
    weightsFirst: false,
    cardioEmbeddedWarmup: true,
  };
  SESSION_STRUCTURE = { ...ZIYAD_STRUCTURE };
  DAYS = ZIYAD_DAYS.map((d) => ({
    ...d,
    cardio: {
      ...d.cardio,
      note: '20 دقيقة متنوعة: أوبتيكال + دراجة + تجديف داخلي + درج — ينتقل التطبيق بين المحطات تلقائيًا.',
    },
    exercises: d.exercises.map((x) => ({ ...x })),
    circuit: d.circuit ? { ...d.circuit } : undefined,
  }));
  DAY_BY_ID = mapDays(DAYS);
  PHASES = ZIYAD_PHASES.map((p) => ({ ...p }));
  SHORT_PRESETS = ZIYAD_SHORT_PRESETS.map((p) => ({ ...p }));
  SHORT_NOTE = ZIYAD_SHORT_NOTE;
  INTERVAL_NOTE = ZIYAD_INTERVAL_NOTE;
  WEIGHT_RULE = ZIYAD_WEIGHT_RULE;
}

/** أين يُستخدم الجهاز في البرنامج (مُحسوب من الأيام) */
export function machineUsage(id: MachineId): DayId[] {
  return DAYS.filter((d) => d.cardio.machineId === id || d.exercises.some((e) => e.machineId === id)).map((d) => d.id);
}
