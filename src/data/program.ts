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
export const SESSION_STRUCTURE = { cardio: 20, iron: 20, stretch: 5, total: 45 } as const;
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

export const DAYS: DayDef[] = [
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

export const DAY_BY_ID: Record<DayId, DayDef> = Object.fromEntries(DAYS.map((d) => [d.id, d])) as Record<DayId, DayDef>;

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
}

export const PHASES: PhaseDef[] = [
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
  },
];

export function phaseForWeek(week: number): PhaseDef {
  if (week <= 2) return PHASES[0];
  if (week <= 6) return PHASES[1];
  return PHASES[2];
}

export const WEIGHT_RULE =
  'إذا أنهيت كل التكرارات بسهولة في سيتات الجلسة كلها، ارفع الوزن بأصغر درجة في الجهاز في الجلسة التالية. لا ترفعه إن كان شكل الحركة سيتغيّر أو تحتاج إلى التأرجح.';

/** التلميح المعروض بعد تقييم «سهل» أكثر من مرة (لا يغيّر الوزن تلقائيًا) */
export const WEIGHT_HINT = 'إذا أنهيت جميع التكرارات بسهولة وبوضعية سليمة، يمكنك زيادة الوزن بأصغر درجة متاحة.';

export const CARDIO_INTENSITY =
  'اجعل الإيقاع بحيث تستطيع الكلام بجمل قصيرة لكن لا تستطيع الغناء (تقريبًا 6–7 من 10). إن كنت تقيس نبضك فالمنطقة المناسبة نحو 120–145 نبضة/دقيقة.';

export const INTERVAL_NOTE =
  'بعد التسخين: دقيقة أسرع (7–8 من 10) ثم دقيقتان هادئتان (5 من 10)، وكرّرها حتى نهاية الـ 20 دقيقة. ابدأ بها من الأسبوع 3.';

/* ======================== ملفّ الكارديو ======================== */

export interface CardioSegment {
  kind: 'warmup' | 'steady' | 'fast' | 'calm';
  seconds: number;
  label: string;
  hint: string;
}

/**
 * يبني جدول الكارديو للجلسة.
 * - أول 5 دقائق تسخين هادئ (PDF).
 * - الفترات: دقيقة أسرع + دقيقتان هادئتان، وفي مرحلة التثبيت تُمدَّد السريعة إلى دقيقتين.
 * - التأقلم (أسبوع 1–2): ثابت في كل الأيام.
 */
export function buildCardioSegments(
  mode: 'steady' | 'intervals',
  minutes: number,
  phase: PhaseId,
): CardioSegment[] {
  const total = Math.round(minutes * 60);
  const warm = Math.min(300, Math.round(total * 0.25));
  const segs: CardioSegment[] = [
    { kind: 'warmup', seconds: warm, label: 'تسخين هادئ', hint: 'إيقاع هادئ ومقاومة خفيفة' },
  ];
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

export const FIRST_VISIT_NOTE =
  'بما أنك منقطع فترة، ابدأ بأوزان خفيفة جدًا في الأسبوعين الأولين ولا تحاول «تعويض» ما فات. اطلب من مدرّب النادي أن يضبط لك مقاعد الأجهزة في أول مرة، فهذا يوفّر عليك الوقت ويحميك من الإصابة.';

export const SAFETY_NOTE =
  'ابدأ بأوزان خفيفة، وتوقف عن التمرين عند الشعور بأعراض غير معتادة، واستشر مختصًا عند الحاجة.';

export const WARNINGS: string[] = [
  'ابدأ خفيفًا؛ الألم العضلي الخفيف بعد الجلسات الأولى طبيعي ويزول خلال يومين.',
  'لا تحبس نَفَسك: زفير عند الدفع أو الشدّ، وشهيق عند الرجوع.',
  'اشرب ماء أثناء الجلسة وخذ راحة عند الحاجة.',
  'توقّف فورًا عند أي ألم حاد في المفصل أو دوخة أو ألم/ضيق في الصدر، واستشر الطبيب.',
];

export const GENERAL_DISCLAIMER =
  'هذه خطة عامة للتوجيه وليست بديلًا عن الطبيب أو مدرّب النادي. يُفضَّل فحص عام سريع قبل البدء بعد انقطاع طويل، ومراجعة المدرّب لضبط الأجهزة على جسمك.';

export const CONTINUE_TIPS: string[] = [
  'حدّد أيامك وموعدك الثابت، واعتبره موعدًا لا يُلغى.',
  'الجلسة القصيرة أفضل من عدم الذهاب؛ تعال ولو لنصف الخطة.',
  'صوّر نفسك (أو قِس خصرك) كل أسبوعين؛ الميزان لا يقول كل الحقيقة.',
  'نم جيدًا وخفّف الأكل الليلي.',
];

/* ======================== الجلسة المختصرة ======================== */

export interface ShortPreset {
  minutes: 15 | 25 | 30;
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
export const SHORT_PRESETS: ShortPreset[] = [
  { minutes: 15, cardio: 6, iron: 7, stretch: 2, maxSets: 2, label: '15 دقيقة' },
  { minutes: 25, cardio: 10, iron: 12, stretch: 3, maxSets: 2, label: '25 دقيقة' },
  { minutes: 30, cardio: 12, iron: 14, stretch: 4, maxSets: 3, label: '30 دقيقة' },
];

/** الجلسة الأصلية 45 دقيقة */
export const SHORT_NOTE = 'الجلسة الأصلية 45 دقيقة. هذه نسخة مختصرة لليوم نفسه — الذهاب لفترة قصيرة أفضل من إلغاء اليوم بالكامل.';

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

/** أين يُستخدم الجهاز في البرنامج (مُحسوب من الأيام) */
export function machineUsage(id: MachineId): DayId[] {
  return DAYS.filter((d) => d.cardio.machineId === id || d.exercises.some((e) => e.machineId === id)).map((d) => d.id);
}
