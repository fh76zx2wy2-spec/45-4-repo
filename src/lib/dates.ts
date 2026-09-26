/**
 * التواريخ: نخزّن دائمًا بصيغة ISO ميلادية (YYYY-MM-DD) بتوقيت جهاز المستخدم،
 * ونعرض هجريًا (أم القرى) قدر الإمكان.
 */

export const GREG_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];
export const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const WEEKDAYS_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** يحوّل ISO إلى Date عند الظهيرة المحلية (لتفادي مشكلات التوقيت الصيفي) */
export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayISO(now: Date = new Date()): string {
  return toISO(now);
}

export function addDaysISO(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function diffDaysISO(a: string, b: string): number {
  const da = fromISO(a);
  const db = fromISO(b);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function weekdayOf(iso: string): number {
  return fromISO(iso).getDay(); // 0 = الأحد
}

/** بداية الأسبوع (ISO) الذي يحوي التاريخ. weekStart: 0=الأحد، 6=السبت، 1=الاثنين */
export function weekStartOf(iso: string, weekStart = 0): string {
  const wd = weekdayOf(iso);
  const back = (wd - weekStart + 7) % 7;
  return addDaysISO(iso, -back);
}

export function weekIndexBetween(startWeekISO: string, otherWeekISO: string): number {
  return Math.round(diffDaysISO(startWeekISO, otherWeekISO) / 7);
}

/* ---------------------------- الهجري ---------------------------- */

export interface HijriParts {
  y: number;
  m: number; // 1..12
  d: number;
}

let _fmt: Intl.DateTimeFormat | null = null;
let _calendarOk = true;

function hijriFormatter(): Intl.DateTimeFormat {
  if (_fmt) return _fmt;
  const make = (cal: string) =>
    new Intl.DateTimeFormat('en-u-ca-' + cal + '-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
  try {
    _fmt = make('islamic-umalqura');
    const resolved = _fmt.resolvedOptions().calendar;
    if (resolved !== 'islamic-umalqura') {
      _calendarOk = false;
      _fmt = make('islamic-civil');
    }
  } catch {
    _calendarOk = false;
    _fmt = make('islamic-civil');
  }
  return _fmt;
}

/** هل التقويم المعتمد هو أم القرى فعلًا (وإلا فالمدني كاحتياط)؟ */
export function isUmAlQura(): boolean {
  hijriFormatter();
  return _calendarOk;
}

const _cache = new Map<string, HijriParts>();

export function hijriOf(iso: string): HijriParts {
  const hit = _cache.get(iso);
  if (hit) return hit;
  const [y, m, d] = iso.split('-').map(Number);
  // نستخدم UTC عند الظهيرة حتى لا يتأثر اليوم بالمنطقة الزمنية
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const parts = hijriFormatter().formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const res = { y: get('year'), m: get('month'), d: get('day') };
  _cache.set(iso, res);
  return res;
}

/** «7 ربيع الآخر 1448 هـ» */
export function formatHijri(iso: string, opts: { year?: boolean; suffix?: boolean } = {}): string {
  const { y, m, d } = hijriOf(iso);
  const showYear = opts.year !== false;
  return `${d} ${HIJRI_MONTHS[m - 1]}${showYear ? ' ' + y : ''}${showYear && opts.suffix !== false ? ' هـ' : ''}`;
}

/** «ربيع الآخر 1448» */
export function formatHijriMonth(y: number, m: number): string {
  return `${HIJRI_MONTHS[m - 1]} ${y}`;
}

/** «19 سبتمبر 2026» */
export function formatGreg(iso: string, opts: { year?: boolean } = {}): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${GREG_MONTHS[m - 1]}${opts.year === false ? '' : ' ' + y}`;
}

export function weekdayName(iso: string): string {
  return WEEKDAYS[weekdayOf(iso)];
}

/** أول يوم في الشهر الهجري الذي يحوي التاريخ */
export function hijriMonthStart(iso: string): string {
  return addDaysISO(iso, -(hijriOf(iso).d - 1));
}

/** طول الشهر الهجري (29 أو 30) بدءًا من أول يوم فيه */
export function hijriMonthLength(startISO: string): number {
  const { m } = hijriOf(startISO);
  let n = 28;
  while (hijriOf(addDaysISO(startISO, n)).m === m && n < 31) n++;
  return n;
}

/** أول يوم في الشهر الهجري بعد/قبل n شهرًا */
export function shiftHijriMonth(startISO: string, delta: number): string {
  let cur = startISO;
  const step = delta > 0 ? 1 : -1;
  for (let i = 0; i < Math.abs(delta); i++) {
    cur = step > 0 ? addDaysISO(cur, hijriMonthLength(cur)) : hijriMonthStart(addDaysISO(cur, -1));
  }
  return cur;
}

export interface MonthCell {
  iso: string;
  hijriDay: number;
  gregDay: number;
  inMonth: boolean;
}

/**
 * شبكة الشهر الهجري: صفوف من 7 أيام، تبدأ من weekStart.
 * الخلايا خارج الشهر تُعاد بـ inMonth=false (للمحاذاة فقط).
 */
export function hijriMonthGrid(monthStartISO: string, weekStart = 0): MonthCell[][] {
  const len = hijriMonthLength(monthStartISO);
  const first = weekdayOf(monthStartISO);
  const lead = (first - weekStart + 7) % 7;
  const cells: MonthCell[] = [];
  for (let i = -lead; i < len + ((7 - ((lead + len) % 7)) % 7); i++) {
    const iso = addDaysISO(monthStartISO, i);
    const inMonth = i >= 0 && i < len;
    cells.push({ iso, hijriDay: hijriOf(iso).d, gregDay: fromISO(iso).getDate(), inMonth });
  }
  const rows: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/** منذ متى؟ «اليوم» «أمس» «منذ يومين» … */
export function sinceLabel(fromIso: string, toIso: string): string {
  const n = diffDaysISO(fromIso, toIso);
  if (n <= 0) return 'اليوم';
  if (n === 1) return 'أمس';
  if (n === 2) return 'منذ يومين';
  if (n <= 10) return `منذ ${n} أيام`;
  if (n < 30) return `منذ ${n} يومًا`;
  const w = Math.floor(n / 7);
  if (n < 60) return `منذ ${w} أسابيع`;
  return `منذ ${Math.round(n / 30)} أشهر`;
}


/** وسم مختصر لآخر حضور: اليوم / أمس / قبل أمس، وإلا التاريخ الهجري بدون السنة. */
export function attendanceDayLabel(arrivedAt: string, today: string = todayISO()): string {
  const d = new Date(arrivedAt);
  if (Number.isNaN(d.getTime())) return '';
  const iso = todayISO(d);
  const n = diffDaysISO(iso, today);
  if (n <= 0) return 'اليوم';
  if (n === 1) return 'أمس';
  if (n === 2) return 'قبل أمس';
  return formatHijri(iso, { year: false });
}
