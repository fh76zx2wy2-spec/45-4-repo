/**
 * دليل الأجهزة — مستخرج حرفيًا من ملف «خطة النادي» (صفحات 5–7).
 * لتعديل جهاز أو إضافة جهاز: عدّل هذا الملف فقط، وستظهر التغييرات في
 * دليل الأجهزة وفي التمرين المباشر معًا.
 */
import type { IllustrationId } from './illustrations.generated';

export type MachineGroup = 'cardio' | 'strength' | 'core' | 'water';

export interface Machine {
  id: MachineId;
  ar: string;
  en: string;
  group: MachineGroup;
  /** العضلات المستهدفة */
  muscles: string;
  /** طريقة الاستخدام (خطوات مختصرة) */
  steps: string[];
  /** تنبيه مهم إن وُجد */
  warn?: string;
  illustration: IllustrationId;
  /** كلمات إضافية للبحث في دليل الأجهزة */
  keywords?: string[];
}

export type MachineId =
  | 'elliptical'
  | 'bike'
  | 'pool'
  | 'chest-press'
  | 'lat-pulldown'
  | 'seated-row'
  | 'shoulder-press'
  | 'leg-press'
  | 'leg-extension'
  | 'leg-curl'
  | 'pec-deck'
  | 'lateral-raise'
  | 'biceps-curl'
  | 'triceps-pushdown'
  | 'plank'
  | 'glute-bridge'
  | 'crunch';

export const MACHINES: Record<MachineId, Machine> = {
  elliptical: {
    id: 'elliptical',
    ar: 'الأوبتيكال (الإليبتيكال)',
    en: 'Elliptical / Cross Trainer',
    group: 'cardio',
    muscles: 'جسم كامل: الأرجل والذراعان والأكتاف — لطيف على الركب',
    steps: [
      'قف على الدواستين وأمسك المقبضين المتحركين.',
      'ادفع وشدّ بحركة انسيابية كأنك تمشي، وظهرك مستقيم.',
      'ابدأ بمقاومة خفيفة (3–5) وزدها تدريجيًا مع الأسابيع.',
    ],
    warn: 'لا تتّكئ بثقل جسمك على المقابض؛ أبقِ صدرك مرفوعًا.',
    illustration: 'elliptical',
    keywords: ['كارديو', 'اوبتيكال', 'اليبتيكال', 'cross', 'cardio'],
  },
  bike: {
    id: 'bike',
    ar: 'الدراجة الثابتة (السيكل)',
    en: 'Upright / Stationary Bike',
    group: 'cardio',
    muscles: 'الفخذان والمؤخرة والساقان',
    steps: [
      'اضبط الكرسي بحيث تكون ركبتك شبه مفرودة عند أسفل الدواسة.',
      'أمسك المقبضين وظهرك مستقيم وكتفاك مرتخيان.',
      'دُر بإيقاع ثابت 60–80 دورة/دقيقة.',
    ],
    warn: 'إن وجدت دراجة بمسند ظهر (Recumbent) فهي أريح للمبتدئ.',
    illustration: 'bike',
    keywords: ['كارديو', 'سيكل', 'دراجة', 'bike', 'cycle', 'cardio'],
  },
  pool: {
    id: 'pool',
    ar: 'المسبح',
    en: 'Swimming Pool',
    group: 'water',
    muscles: 'جسم كامل بدون ضغط على المفاصل',
    steps: [
      '30 دقيقة سباحة هادئة أو مشي في الماء.',
      'يمكن أن يحل محل جلسة كارديو، أو يكون يوم راحة نشطًا (اختياري).',
    ],
    warn: 'ابدأ بـ 10–15 دقيقة إن كانت لياقتك قد نزلت.',
    illustration: 'pool',
    keywords: ['سباحة', 'مسبح', 'swim', 'pool'],
  },
  'chest-press': {
    id: 'chest-press',
    ar: 'ضغط الصدر',
    en: 'Chest Press',
    group: 'strength',
    muscles: 'الصدر، مقدمة الكتف، الترايسبس',
    steps: [
      'اضبط الكرسي لتكون المقابض بمستوى منتصف صدرك.',
      'ادفع للأمام حتى تكاد تفرد ذراعيك دون قفل المرفقين.',
      'ارجع ببطء (نحو ثانيتين).',
    ],
    warn: 'ظهرك ملتصق بالمسند وكتفاك للخلف.',
    illustration: 'chest-press',
    keywords: ['صدر', 'chest', 'press'],
  },
  'lat-pulldown': {
    id: 'lat-pulldown',
    ar: 'السحب الأمامي (لات)',
    en: 'Lat Pulldown',
    group: 'strength',
    muscles: 'الظهر (الأجنحة) والبايسبس',
    steps: [
      'اجلس وثبّت فخذيك تحت الوسادة.',
      'أمسك البار أوسع قليلًا من الكتفين.',
      'اسحبه إلى أعلى صدرك مع ضمّ لوحي الكتف، ثم ارجع ببطء.',
    ],
    warn: 'لا تسحب خلف الرقبة ولا تتأرجح بجسمك.',
    illustration: 'lat-pulldown',
    keywords: ['ظهر', 'back', 'lat', 'سحب'],
  },
  'seated-row': {
    id: 'seated-row',
    ar: 'السحب الأرضي (تجديف)',
    en: 'Seated Row',
    group: 'strength',
    muscles: 'منتصف الظهر والبايسبس',
    steps: [
      'صدرك على الوسادة وقدماك على المسند.',
      'اسحب المقبضين نحو بطنك مع ضمّ لوحي الكتف.',
      'ارجع ببطء دون أن تنحني للأمام.',
    ],
    warn: 'أبعد كتفيك عن أذنيك.',
    illustration: 'seated-row',
    keywords: ['ظهر', 'back', 'row', 'سحب', 'تجديف'],
  },
  'shoulder-press': {
    id: 'shoulder-press',
    ar: 'ضغط الأكتاف',
    en: 'Shoulder Press',
    group: 'strength',
    muscles: 'الأكتاف والترايسبس',
    steps: [
      'اضبط الكرسي لتكون المقابض بمستوى كتفيك.',
      'ادفع للأعلى حتى تفرد ذراعيك تقريبًا.',
      'انزل ببطء إلى مستوى الأذنين.',
    ],
    warn: 'وزن خفيف؛ الأكتاف حساسة. لا تقوّس أسفل ظهرك.',
    illustration: 'shoulder-press',
    keywords: ['كتف', 'اكتاف', 'shoulder', 'press'],
  },
  'leg-press': {
    id: 'leg-press',
    ar: 'ضغط الأرجل (ليج برس)',
    en: 'Leg Press',
    group: 'strength',
    muscles: 'الفخذ الأمامي والخلفي والمؤخرة',
    steps: [
      'ظهرك وحوضك ملتصقان بالمسند وقدماك على المنصة بعرض الكتفين.',
      'ادفع المنصة حتى تكاد تفرد ركبتيك دون قفلهما.',
      'ارجع ببطء.',
    ],
    warn: 'ركبتاك باتجاه أصابع قدميك ولا يرتفع حوضك عن الكرسي.',
    illustration: 'leg-press',
    keywords: ['رجل', 'ارجل', 'فخذ', 'leg', 'press'],
  },
  'leg-extension': {
    id: 'leg-extension',
    ar: 'الرفرفة الأمامية للأرجل',
    en: 'Leg Extension',
    group: 'strength',
    muscles: 'الفخذ الأمامي',
    steps: [
      'ضع الوسادة فوق كاحليك وظهرك على المسند.',
      'افرد الساقين للأمام واثبت لحظة.',
      'انزل ببطء.',
    ],
    warn: 'وزن خفيف إلى متوسط، بدون تأرجح.',
    illustration: 'leg-extension',
    keywords: ['رجل', 'ارجل', 'فخذ', 'leg', 'extension', 'رفرفة'],
  },
  'leg-curl': {
    id: 'leg-curl',
    ar: 'الأرجل الخلفية (ليج كيرل)',
    en: 'Seated Leg Curl',
    group: 'strength',
    muscles: 'الفخذ الخلفي',
    steps: [
      'ثبّت الوسادة العلوية فوق فخذيك.',
      'اسحب الرولر بكعبيك نحو الأسفل والخلف.',
      'ارجع ببطء دون ترك الوزن يسقط.',
    ],
    warn: 'أبقِ ظهرك ملتصقًا بالمسند.',
    illustration: 'leg-curl',
    keywords: ['رجل', 'ارجل', 'فخذ', 'خلفي', 'leg', 'curl'],
  },
  'pec-deck': {
    id: 'pec-deck',
    ar: 'الفراشة (بك ديك)',
    en: 'Pec Deck / Chest Fly',
    group: 'strength',
    muscles: 'الصدر ومقدمة الكتف',
    steps: [
      'ضع ساعديك على الوسادتين ومرفقاك بمستوى الكتفين.',
      'قرّب الذراعين أمام صدرك كأنك تحتضن شيئًا.',
      'افتح ببطء.',
    ],
    warn: 'لا تفتح الذراعين أبعد من خط الكتفين.',
    illustration: 'pec-deck',
    keywords: ['صدر', 'chest', 'fly', 'pec', 'deck', 'فراشة'],
  },
  'lateral-raise': {
    id: 'lateral-raise',
    ar: 'رفرفة جانبية بالدمبل',
    en: 'Dumbbell Lateral Raise',
    group: 'strength',
    muscles: 'الجزء الجانبي من الكتف',
    steps: [
      'دمبل خفيف (2–5 كجم) في كل يد والمرفقان مثنيان قليلًا.',
      'ارفع الذراعين للجانبين حتى مستوى الكتفين.',
      'انزل ببطء.',
    ],
    warn: 'لا ترفع كتفيك نحو أذنيك ولا تتمايل بجسمك.',
    illustration: 'lateral-raise',
    keywords: ['كتف', 'اكتاف', 'دمبل', 'dumbbell', 'lateral', 'raise'],
  },
  'biceps-curl': {
    id: 'biceps-curl',
    ar: 'بايسبس بالدمبل',
    en: 'Dumbbell Biceps Curl',
    group: 'strength',
    muscles: 'الجزء الأمامي من الذراع',
    steps: [
      'قف والمرفقان ملتصقان بجانبك.',
      'ارفع الدمبل نحو كتفك.',
      'انزل ببطء ثانيتين.',
    ],
    warn: 'لا تأرجح ظهرك لرفع الوزن.',
    illustration: 'biceps-curl',
    keywords: ['ذراع', 'دمبل', 'بايسبس', 'biceps', 'curl', 'dumbbell'],
  },
  'triceps-pushdown': {
    id: 'triceps-pushdown',
    ar: 'ترايسبس بالكيبل',
    en: 'Cable Triceps Pushdown',
    group: 'strength',
    muscles: 'الجزء الخلفي من الذراع',
    steps: [
      'قف أمام البكرة العلوية وأمسك البار والمرفقان بجنبك.',
      'ادفع لأسفل حتى تفرد ذراعيك.',
      'ارجع ببطء إلى مستوى الصدر.',
    ],
    warn: 'مرفقاك ثابتان لا يتحركان.',
    illustration: 'triceps-pushdown',
    keywords: ['ذراع', 'ترايسبس', 'كيبل', 'triceps', 'cable', 'pushdown'],
  },
  plank: {
    id: 'plank',
    ar: 'بلانك (البطن)',
    en: 'Plank',
    group: 'core',
    muscles: 'البطن والظهر والكتفان',
    steps: [
      'استند على ساعديك ومرفقاك تحت كتفيك.',
      'جسمك خط مستقيم من الرأس إلى الكعبين.',
      'اثبت 20–30 ثانية وتنفّس طبيعيًا.',
    ],
    warn: 'صعب؟ نفّذه من الركبتين.',
    illustration: 'plank',
    keywords: ['بطن', 'abs', 'core', 'plank', 'بلانك'],
  },
  'glute-bridge': {
    id: 'glute-bridge',
    ar: 'جسر الحوض',
    en: 'Glute Bridge',
    group: 'core',
    muscles: 'المؤخرة والفخذ الخلفي',
    steps: [
      'استلقِ على ظهرك وركبتاك مثنيتان وقدماك على الأرض.',
      'ارفع الحوض حتى يصير جسمك خطًا من الكتف إلى الركبة.',
      'اثبت ثانيتين ثم انزل.',
    ],
    warn: 'اعصر عضلات المؤخرة في الأعلى.',
    illustration: 'glute-bridge',
    keywords: ['مؤخرة', 'حوض', 'glute', 'bridge', 'جسر'],
  },
  crunch: {
    id: 'crunch',
    ar: 'كرنش البطن',
    en: 'Crunch',
    group: 'core',
    muscles: 'عضلات البطن',
    steps: [
      'استلقِ وركبتاك مثنيتان ويداك بجانب أذنيك.',
      'ارفع كتفيك قليلًا عن الأرض بتقلّص البطن.',
      'انزل ببطء.',
    ],
    warn: 'الحركة صغيرة؛ لا تشدّ رقبتك بيديك.',
    illustration: 'crunch',
    keywords: ['بطن', 'abs', 'core', 'crunch', 'كرنش'],
  },
};

export const MACHINE_LIST: Machine[] = Object.values(MACHINES);

/**
 * بدائل معتمدة داخل نطاق الخطة نفسها (لا تُضاف تمارين من خارج البرنامج).
 * تظهر فقط عند ضغط «لا أستطيع استخدام هذا الجهاز».
 * إن لم يوجد بديل معتمد، يعرض الموقع خيار التخطي فقط.
 */
export const ALTERNATIVES: Partial<Record<MachineId, { id: MachineId; note: string }[]>> = {
  'chest-press': [{ id: 'pec-deck', note: 'جهاز صدر آخر ضمن برنامجك (اليوم 3).' }],
  'pec-deck': [{ id: 'chest-press', note: 'جهاز صدر آخر ضمن برنامجك (اليومان 1 و4).' }],
  'lat-pulldown': [{ id: 'seated-row', note: 'جهاز ظهر آخر ضمن برنامجك (اليوم 1).' }],
  'seated-row': [{ id: 'lat-pulldown', note: 'جهاز ظهر آخر ضمن برنامجك (اليومان 1 و4).' }],
  'shoulder-press': [{ id: 'lateral-raise', note: 'تمرين أكتاف ضمن برنامجك (اليوم 3) بدمبل خفيف.' }],
  'lateral-raise': [{ id: 'shoulder-press', note: 'جهاز أكتاف ضمن برنامجك (اليوم 1) بوزن خفيف.' }],
  'leg-press': [{ id: 'leg-extension', note: 'تمرين أرجل آخر ضمن برنامجك (اليوم 2).' }],
  'leg-extension': [{ id: 'leg-press', note: 'تمرين أرجل آخر ضمن برنامجك (اليومان 2 و4).' }],
  'leg-curl': [{ id: 'glute-bridge', note: 'يعمل على الفخذ الخلفي والمؤخرة (اليومان 2 و4).' }],
  'glute-bridge': [{ id: 'leg-curl', note: 'يعمل على الفخذ الخلفي (اليوم 2).' }],
  plank: [{ id: 'crunch', note: 'تمرين بطن آخر ضمن برنامجك (اليومان 2 و4).' }],
  crunch: [{ id: 'plank', note: 'تمرين بطن آخر ضمن برنامجك (اليومان 1 و3).' }],
  elliptical: [
    { id: 'bike', note: 'الدراجة الثابتة — كارديو بنفس المدة والشدة.' },
    { id: 'pool', note: 'المسبح — يحل محل جلسة كارديو (سباحة هادئة).' },
  ],
  bike: [
    { id: 'elliptical', note: 'الأوبتيكال — كارديو بنفس المدة والشدة.' },
    { id: 'pool', note: 'المسبح — يحل محل جلسة كارديو (سباحة هادئة).' },
  ],
};

/** أين يُستخدم الجهاز في البرنامج — يُحسب من بيانات الأيام (انظر program.ts). */
