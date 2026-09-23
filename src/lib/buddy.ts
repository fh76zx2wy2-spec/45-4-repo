import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

export type BuddyReactionKind = 'kfu' | 'fire' | 'beatme' | 'yourturn' | 'beast4';

export interface BuddyStat {
  user_id: string;
  display_name: string;
  email: string;
  weekly_sessions: number;
  weekly_visits: number;
  weekly_visit_seconds: number;
  last_arrived_at: string | null;
  last_left_at: string | null;
  last_visit_seconds: number;
  in_gym: boolean;
  active_arrived_at: string | null;
  streak_4of4: number;
}

export interface BuddyReaction {
  id: string;
  sender_name: string;
  kind: BuddyReactionKind;
  created_at: string;
}

export const BUDDY_REACTION_LABEL: Record<BuddyReactionKind, string> = {
  kfu: '👏 كفو',
  fire: '🔥 شد حيلك',
  beatme: '😅 سبقتني',
  yourturn: '👉 اليوم عليك',
  beast4: '🔥 4/4 يا وحش',
};

export function useBuddy() {
  const { user } = useAuth();
  const [stats, setStats] = useState<BuddyStat[]>([]);
  const [reactions, setReactions] = useState<BuddyReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<BuddyReactionKind | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    try {
      const [s, r] = await Promise.all([
        supabase.rpc('get_buddy_stats'),
        supabase.rpc('get_buddy_reactions'),
      ]);
      if (s.error) throw s.error;
      if (r.error) throw r.error;
      setStats(((s.data ?? []) as BuddyStat[]).map((x) => ({
        ...x,
        weekly_sessions: Number(x.weekly_sessions ?? 0),
        weekly_visits: Number(x.weekly_visits ?? 0),
        weekly_visit_seconds: Number(x.weekly_visit_seconds ?? 0),
        last_visit_seconds: Number(x.last_visit_seconds ?? 0),
        streak_4of4: Number(x.streak_4of4 ?? 0),
        in_gym: Boolean(x.in_gym),
      })));
      setReactions((r.data ?? []) as BuddyReaction[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const sendReaction = useCallback(async (kind: BuddyReactionKind): Promise<string> => {
    if (!supabase) throw new Error('الخدمة غير مهيأة');
    setSending(kind);
    try {
      const { data, error: sendError } = await supabase.rpc('send_buddy_reaction', { p_kind: kind });
      if (sendError) throw sendError;
      await refresh();
      return String(data ?? 'رفيقك');
    } finally {
      setSending(null);
    }
  }, [refresh]);

  const me = useMemo(
    () => stats.find((s) => s.email.toLowerCase() === user?.email.toLowerCase()) ?? null,
    [stats, user],
  );
  const buddy = useMemo(
    () => stats.find((s) => s.email.toLowerCase() !== user?.email.toLowerCase()) ?? null,
    [stats, user],
  );

  return { me, buddy, stats, reactions, latestReaction: reactions[0] ?? null, loading, error, sending, refresh, sendReaction };
}
