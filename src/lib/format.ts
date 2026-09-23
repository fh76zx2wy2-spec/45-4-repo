export const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');

/** 75 → "01:15" */
export function mmss(total: number): string {
  const t = Math.max(0, Math.floor(total));
  return `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`;
}

/** 4200 → "70 د" */
export function minutesLabel(seconds: number): string {
  const m = Math.round(seconds / 60);
  return `${m} د`;
}

export function kgLabel(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function arNumber(n: number): string {
  return String(n);
}

export const DIFFICULTY_LABEL: Record<string, string> = { easy: 'سهل', good: 'مناسب', hard: 'متعب' };

/** وقت مختصر مثل «5:12 م» بأرقام لاتينية. */
export function timeLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' }).format(d);
}

/** مدة بشرية مختصرة: 47 دقيقة، أو 1 س 12 د. */
export function durationLabel(seconds: number): string {
  const min = Math.max(0, Math.round(seconds / 60));
  if (min < 60) return `${min} دقيقة`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} س ${m} د` : `${h} ساعة`;
}
