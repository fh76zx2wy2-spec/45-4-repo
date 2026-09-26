import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { sendPushNotification } from 'npm:@mmmike/web-push@1.3.0/send';

const ZIYAD = 'z062496@gmail.com';
const ABDULSALAM = 'amk157662@gmail.com';
const ALLOWED = new Set([ZIYAD, ABDULSALAM]);
const PUBLIC_VAPID = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const PRIVATE_VAPID = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? `mailto:${ZIYAD}`;
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? (() => {
  try { return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? ''; } catch { return ''; }
})();

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function coachName(email: string) {
  return email === ZIYAD ? 'زياد' : email === ABDULSALAM ? 'عبدالسلام' : 'رفيقك';
}

async function caller(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email) return null;
  const email = data.user.email.toLowerCase();
  if (!ALLOWED.has(email)) return null;
  return { id: data.user.id, email };
}

async function buddyOf(email: string) {
  const buddyEmail = email === ZIYAD ? ABDULSALAM : ZIYAD;
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const buddy = data.users.find((u) => u.email?.toLowerCase() === buddyEmail);
  return buddy ? { id: buddy.id, email: buddyEmail, name: coachName(buddyEmail) } : null;
}

type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
};

async function sendToUser(userId: string, payload: PushPayload) {
  const { data: subs, error } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', userId);
  if (error) throw error;
  let delivered = 0;
  for (const sub of subs ?? []) {
    try {
      const ok = await sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { publicKey: PUBLIC_VAPID, privateKey: PRIVATE_VAPID, subject: VAPID_SUBJECT },
        { ttl: 60 * 60 * 6, urgency: 'normal' },
      );
      if (ok) delivered++;
      else await admin.from('push_subscriptions').delete().eq('id', sub.id);
    } catch (e) {
      const status = Number((e as any)?.statusCode ?? (e as any)?.status ?? 0);
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', sub.id);
      else console.error('push failed', status, e);
    }
  }
  return delivered;
}

async function alreadySent(userId: string, kind: string, refKey: string) {
  const { data } = await admin.from('push_notification_log').select('id').eq('user_id', userId).eq('kind', kind).eq('ref_key', refKey).maybeSingle();
  return !!data;
}

async function markSent(userId: string, kind: string, refKey: string) {
  await admin.from('push_notification_log').upsert({ user_id: userId, kind, ref_key: refKey }, { onConflict: 'user_id,kind,ref_key' });
}

async function sendOnce(userId: string, kind: string, refKey: string, payload: PushPayload) {
  if (await alreadySent(userId, kind, refKey)) return 0;
  const delivered = await sendToUser(userId, payload);
  if (delivered > 0) await markSent(userId, kind, refKey);
  return delivered;
}

function durationArabic(seconds: number) {
  const mins = Math.max(0, Math.round(seconds / 60));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} س و${m} د` : `${h} س`;
  }
  return `${mins} دقيقة`;
}

async function sweep() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = data.users.filter((u) => u.email && ALLOWED.has(u.email.toLowerCase()));
  const now = new Date();
  let delivered = 0;

  for (const u of users) {
    const email = u.email!.toLowerCase();
    const name = coachName(email);
    const { data: active } = await admin.from('gym_visits')
      .select('id,arrived_at').eq('user_id', u.id).is('left_at', null)
      .order('arrived_at', { ascending: false }).limit(1).maybeSingle();
    if (!active?.arrived_at) continue;

    const minutes = Math.floor((now.getTime() - Date.parse(active.arrived_at)) / 60000);
    if (minutes >= 45) {
      delivered += await sendOnce(u.id, 'visit-45', active.id, {
        title: '45/4 · وصلت 45 دقيقة ✅',
        body: `يا ${name}، أكملت 45 دقيقة في النادي. كفو عليك 🔥`,
        tag: `visit-45-${active.id}`,
        url: '/',
      });
    }
    if (minutes >= 60) {
      delivered += await sendOnce(u.id, 'visit-60', active.id, {
        title: '45/4 · جلست ساعة 🔥',
        body: `يا ${name}، مرّت ساعة منذ وصولك. إذا كنت خرجت من النادي افتح 45/4 وسجّل خروجك.`,
        tag: `visit-60-${active.id}`,
        url: '/',
      });
    }
  }
  return { delivered };
}

const REACTIONS: Record<string, string> = {
  kfu: '👏 كفو', fire: '🔥 شد حيلك', beatme: '😅 سبقتني', yourturn: '👉 اليوم عليك', beast4: '🔥 4/4 يا وحش',
};

export default {
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    if (!PUBLIC_VAPID || !PRIVATE_VAPID || !SERVICE_ROLE) return json({ error: 'push_not_configured' }, 500);
    const body = await req.json().catch(() => ({}));

    if (body?.action === 'sweep') {
      if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'unauthorized' }, 401);
      try { return json(await sweep()); } catch (e) { console.error(e); return json({ error: String(e) }, 500); }
    }

    const user = await caller(req);
    if (!user) return json({ error: 'unauthorized' }, 401);

    if (body?.action === 'test') {
      const delivered = await sendToUser(user.id, {
        title: '45/4 🔔',
        body: `يا ${coachName(user.email)}، هذا إشعار تجريبي حقيقي من 45/4 🔥`,
        tag: `test-${Date.now()}`,
        url: '/',
      });
      return json({ ok: true, delivered });
    }

    const buddy = await buddyOf(user.email);
    if (!buddy) return json({ error: 'buddy_not_registered' }, 404);
    const sender = coachName(user.email);

    if (body?.action === 'buddy-arrived') {
      const visitId = String(body.visitId ?? '');
      const { data: visit } = await admin.from('gym_visits').select('id').eq('id', visitId).eq('user_id', user.id).maybeSingle();
      if (!visit) return json({ error: 'visit_not_found' }, 404);
      const text = user.email === ZIYAD ? 'زياد وصل النادي الآن 🔥 شد حيلك' : 'عبدالسلام وصل النادي الآن 🏋️‍♂️';
      const delivered = await sendOnce(buddy.id, 'buddy-arrived', visitId, { title: '45/4 · رفيقك وصل', body: text, tag: `buddy-arrived-${visitId}`, url: '/' });
      return json({ ok: true, delivered });
    }

    if (body?.action === 'buddy-left') {
      const visitId = String(body.visitId ?? '');
      const { data: visit } = await admin.from('gym_visits').select('id,duration_seconds').eq('id', visitId).eq('user_id', user.id).maybeSingle();
      if (!visit) return json({ error: 'visit_not_found' }, 404);
      const seconds = Math.max(0, Number(visit.duration_seconds ?? body.durationSeconds ?? 0));
      const delivered = await sendOnce(buddy.id, 'buddy-left', visitId, {
        title: '45/4 · انتهت الزيارة 👏',
        body: `${sender} أنهى زيارته للنادي اليوم · ${durationArabic(seconds)} 👏`,
        tag: `buddy-left-${visitId}`, url: '/',
      });
      return json({ ok: true, delivered });
    }

    if (body?.action === 'buddy-4of4') {
      const weekStart = String(body.weekStart ?? '');
      const weekEnd = new Date(`${weekStart}T12:00:00Z`);
      if (Number.isNaN(weekEnd.getTime())) return json({ error: 'bad_week' }, 400);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      const end = weekEnd.toISOString().slice(0, 10);
      const { data: visits } = await admin.from('gym_visits').select('date').eq('user_id', user.id).gte('date', weekStart).lte('date', end);
      const days = new Set((visits ?? []).map((v) => v.date)).size;
      if (days < 4) return json({ error: 'not_4of4' }, 400);
      const delivered = await sendOnce(buddy.id, 'buddy-4of4', `${user.id}:${weekStart}`, {
        title: '45/4 · أسبوع كامل 🏆', body: `${sender} أكمل 4/4 هذا الأسبوع 🏆`, tag: `buddy-4of4-${user.id}-${weekStart}`, url: '/',
      });
      return json({ ok: true, delivered });
    }

    if (body?.action === 'buddy-reaction') {
      const kind = String(body.kind ?? '');
      const label = REACTIONS[kind];
      if (!label) return json({ error: 'invalid_reaction' }, 400);
      const delivered = await sendToUser(buddy.id, { title: `45/4 · ${sender} يشجّعك`, body: `${sender}: ${label}`, tag: `reaction-${Date.now()}`, url: '/' });
      return json({ ok: true, delivered });
    }

    return json({ error: 'unknown_action' }, 400);
  },
};
