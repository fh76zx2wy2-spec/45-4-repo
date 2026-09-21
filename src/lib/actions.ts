import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DayId, ShortMinutes } from '../data/program';
import { EXTRA_BY_ID } from '../data/program';
import { getDB, setLive, saveSettings } from './store';
import { resolvePlan } from './plan';
import { startLiveExtra, startLiveFromPlan } from './live';
import { lastWeights, type Derived } from './derived';

/** بدء جلسة مباشرة من الشاشات المختلفة */
export function useStartActions(d: Derived) {
  const nav = useNavigate();

  const startDay = useCallback(
    (day: DayId, shortMinutes: ShortMinutes | null = null) => {
      const cur = getDB();
      if (!cur) return;
      if (cur.live) {
        nav('/live');
        return;
      }
      const plan = resolvePlan(day, d.position.week, cur.settings, { shortMinutes });
      const live = startLiveFromPlan(plan, {
        programWeek: d.position.week,
        type: shortMinutes ? 'short' : 'normal',
        lastWeights: lastWeights(cur.sessions),
      });
      setLive(live);
      nav('/live');
    },
    [d.position.week, nav],
  );

  const startExtra = useCallback(
    (kindId: string, minutes: number) => {
      const cur = getDB();
      if (!cur || !EXTRA_BY_ID[kindId]) return;
      if (cur.live) {
        nav('/live');
        return;
      }
      setLive(startLiveExtra(kindId, minutes, { programWeek: d.position.week }));
      nav('/live');
    },
    [d.position.week, nav],
  );

  /** «رجعت للنادي»: أوزان خفيفة في أول جلستين */
  const comeback = useCallback(() => saveSettings({ comeback_sessions_left: 2 }), []);
  const cancelComeback = useCallback(() => saveSettings({ comeback_sessions_left: 0 }), []);

  return { startDay, startExtra, comeback, cancelComeback };
}
