import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { sendPushNotification } from 'npm:@mmmike/web-push@1.3.0/send';

const ALLOWED = new Set(['z062496@gmail.com', 'amk157662@gmail.com']);
const PUBLIC_VAPID = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const PRIVATE_VAPID = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:z062496@gmail.com';
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

type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  data?: { url?: string; [key: string]: unknown };
  actions?: Array<{ action: string; title: string }>;
};

async function sendToUser(userId: string, payload: PushPayload) {
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id,endpoint,p256dh,auth')
    .eq('user_id', userId);
  if (error) throw error;
  let delivered = 0;
  for (const sub of subs ?? []) {
    try {
      await sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        { ...payload, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' },
        { publicKey: PUBLIC_VAPID, privateKey: PRIVATE_VAPID, subject: VAPID_SUBJECT },
        { ttl: 60 * 60 * 6, urgency: 'normal' },
      );
      delivered++;
    } catch (e) {
      const status = Number((e as any)?.statusCode ?? (e as any)?.status ?? 0);
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        console.error('push failed', status, e);
      }
    }
  }
  return delivered;
}

async function alreadySent(userId: string, kind: string, refKey: string) {
  const { data } = await admin
    .from('push_notification_log')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('ref_key', refKey)
    .maybeSingle();
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

function riyadhParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(now);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: g('year'), m: g('month'), d: g('day'), hour: g('hour') };
}

function localDayNumber(date: Date) {
  const p = riyadhParts(date);
  return Math.floor(Date.UTC(p.y, p.m - 1, p.d) / 86400000);
}

async function sweep() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = data.users.filter((u) => u.email && ALLOWED.has(u.email.toLowerCase()));
  const now = new Date();
  const local = riyadhParts(now);
  let delivered = 0;

  for (const u of users) {
    const email = u.email!.toLowerCase();
    const name = email === 'z062496@gmail.com' ? 'زياد' : 'عبدالسلام';
    const targetMinutes = email === 'z062496@gmail.com' ? 45 : 60;
    // زياد: 45 ثم تذكير خروج عند 60. عبدالسلام: خطته 60 فنترك 15 دقيقة قبل تذكير الخروج.
    const exitReminderMinutes = Math.max(60, targetMinutes + 15);

    const { data: active } = await admin
      .from('gym_visits')
      .select('id,arrived_at')
      .eq('user_id', u.id)
      .is('left_at', null)
      .order('arrived_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (active?.arrived_at) {
      const minutes = Math.floor((now.getTime() - Date.parse(active.arrived_at)) / 60000);
      if (minutes >= targetMinutes) {
        delivered += await sendOnce(u.id, 'target-reached', active.id, {
          title: '45/4 · كملت وقتك 👏',
          body: `يا ${name}، أكملت ${targetMinutes} دقيقة في النادي. كفو عليك 🔥`,
          tag: `target-${active.id}`,
          data: { url: '/' },
          actions: [{ action: 'ack', title: 'فهمت' }],
        });
      }
      if (minutes >= exitReminderMinutes) {
        delivered += await sendOnce(u.id, 'exit-reminder', active.id, {
          title: '45/4 · هل انتهيت من النادي؟',
          body: `يا ${name}، زيارتك ما زالت مفتوحة. إذا خلصت افتح 45/4 واضغط «خرجت من النادي».`,
          tag: `exit-${active.id}`,
          data: { url: '/' },
          actions: [{ action: 'ack', title: 'فهمت' }],
        });
      }
      continue;
    }

    // تحفيز الانقطاع: عند اليوم الرابع، ثم كل يومين. يرسل مرة واحدة قرابة 6 مساءً بتوقيت الرياض.
    if (local.hour !== 18) continue;
    const { data: lastVisit } = await admin
      .from('gym_visits')
      .select('arrived_at')
      .eq('user_id', u.id)
      .order('arrived_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lastVisit?.arrived_at) continue;
    const daysAway = localDayNumber(now) - localDayNumber(new Date(lastVisit.arrived_at));
    if (daysAway < 4 || (daysAway !== 4 && daysAway % 2 !== 0)) continue;
    const ref = `${local.y}-${String(local.m).padStart(2, '0')}-${String(local.d).padStart(2, '0')}`;
    delivered += await sendOnce(u.id, 'inactive-nudge', ref, {
      title: '45/4 · وينك يا كوتش؟ 👀',
      body: `يا ${name}، لك ${daysAway} أيام عن النادي. اليوم فرصة ممتازة ترجع وتبدأ من جديد 🔥`,
      tag: 'inactive-nudge',
      data: { url: '/' },
    });
  }
  return { delivered };
}

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
        body: `يا ${user.email === 'z062496@gmail.com' ? 'زياد' : 'عبدالسلام'}، الإشعارات شغالة عندك تمام 🔥`,
        tag: `test-${Date.now()}`,
        data: { url: '/' },
        actions: [{ action: 'ack', title: 'فهمت' }],
      });
      return json({ ok: true, delivered });
    }

    return json({ error: 'unknown_action' }, 400);
  },
};
