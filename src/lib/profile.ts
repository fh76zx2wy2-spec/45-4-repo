import { ACTIVE_PROGRAM, DAY_BY_ID, type DayId } from '../data/program';
import type { IconName } from '../components/Icon';

const MOTIVATION = [
  'لا تفكر كثيرًا، ابدأ.',
  'جلسة واحدة أفضل من لا شيء.',
  'المهم أنك جيت.',
  'ابدأ بهدوء، وكمل بثبات.',
  'أربع مرات في الأسبوع تصنع فرقًا.',
  'اليوم خطوة، وبكرة نتيجة.',
  'خلّها عادة، مو مزاج.',
  'القليل المستمر أقوى من الكثير المنقطع.',
];

export function coachName(): string {
  return ACTIVE_PROGRAM.defaultName;
}

export function timeGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 11) return 'صباح النشاط ☀️';
  if (h < 17) return 'يومك نشيط 💪';
  if (h < 22) return 'مساء النشاط 🌙';
  return 'جلسة هادئة تكمّل يومك ✨';
}

export function motivationForDate(iso: string): string {
  let n = 0;
  for (const ch of `${iso}:${ACTIVE_PROGRAM.key}`) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return MOTIVATION[n % MOTIVATION.length];
}

export function dayIcon(day: DayId | null, rest = false): IconName {
  if (rest) return 'leaf';
  if (!day) return 'check';
  if (day === 1) return 'target';
  if (day === 2) return 'bolt';
  if (day === 3) return 'sparkle';
  return 'timer';
}

export function dayShortLabel(day: DayId | null): string {
  return day ? DAY_BY_ID[day].focus : 'اكتمل الأسبوع';
}
