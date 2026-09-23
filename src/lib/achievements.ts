import type { GymVisit, Session } from './types';
import type { IconName } from '../components/Icon';

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  icon: IconName;
  unlocked: boolean;
}

export function buildAchievements(sessions: Session[], visits: GymVisit[], streak4of4: number, weeksComplete: number): Achievement[] {
  const endedVisits = visits.filter((v) => !!v.left_at);
  const totalVisitSeconds = endedVisits.reduce((s, v) => s + Math.max(0, v.duration_seconds || 0), 0);
  const counted = sessions.filter((s) => s.session_type === 'normal' || s.session_type === 'short');
  return [
    {
      id: 'first',
      title: 'البداية',
      detail: 'أول تمرين مسجّل',
      icon: 'play',
      unlocked: counted.length >= 1,
    },
    {
      id: 'first-44',
      title: 'أول 4/4',
      detail: 'أسبوع كامل',
      icon: 'check',
      unlocked: weeksComplete >= 1 || streak4of4 >= 1,
    },
    {
      id: 'streak2',
      title: 'ثبات 🔥',
      detail: 'أسبوعان متتاليان 4/4',
      icon: 'flag',
      unlocked: streak4of4 >= 2,
    },
    {
      id: 'month',
      title: 'شهر بلا تفريط',
      detail: '4 أسابيع متتالية 4/4',
      icon: 'calendar',
      unlocked: streak4of4 >= 4,
    },
    {
      id: 'visits10',
      title: '10 زيارات',
      detail: 'عشر مرات للنادي',
      icon: 'target',
      unlocked: endedVisits.length >= 10,
    },
    {
      id: '1000m',
      title: '1000 دقيقة',
      detail: 'وقت متراكم في النادي',
      icon: 'clock',
      unlocked: totalVisitSeconds >= 60_000,
    },
  ];
}
