import { supabase } from './supabase';

export const VAPID_PUBLIC_KEY = 'BKUYyeTw5WkAJGBrehAd5DfA6quy1swLbmYB_S7-T2bk-uAZbkum0Rc8AIuD4VXRp6zw6ioArnOuxIXYQ3MUt0E';

export type PushState = 'unsupported' | 'denied' | 'prompt' | 'enabled';
export type BuddyPushAction = 'buddy-arrived' | 'buddy-left' | 'buddy-4of4' | 'buddy-reaction';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/** فحص أولي فقط؛ الفحص الحاسم يتم من registration.pushManager لأن iOS قد لا يعرّف PushManager على window. */
export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;
}

async function pushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return 'pushManager' in reg ? reg : null;
  } catch {
    return null;
  }
}

function sameApplicationServerKey(sub: PushSubscription): boolean {
  const current = sub.options.applicationServerKey;
  if (!current) return false;
  const a = new Uint8Array(current);
  const b = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await pushRegistration();
  if (!reg) return 'unsupported';
  const sub = await reg.pushManager.getSubscription();
  return sub && sameApplicationServerKey(sub) ? 'enabled' : 'prompt';
}

async function storeSubscription(subscription: PushSubscription) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('يجب تسجيل الدخول');
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) throw new Error('تعذر قراءة مفاتيح الاشتراك');
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userData.user.id,
    endpoint: subscription.endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,endpoint' });
  if (error) throw error;
}

export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'prompt';
  const reg = await pushRegistration();
  if (!reg) return 'unsupported';
  let sub = await reg.pushManager.getSubscription();
  // إذا تغيّر مفتاح VAPID بين نسخة وأخرى، ندوّر الاشتراك بدل إبقاء اشتراك قديم لا يستطيع الخادم الإرسال إليه.
  if (sub && !sameApplicationServerKey(sub)) {
    if (supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }
  await storeSubscription(sub);
  return 'enabled';
}

export async function disablePush(): Promise<void> {
  const reg = await pushRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  if (supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

async function invokePush(body: Record<string, unknown>): Promise<number> {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data, error } = await supabase.functions.invoke('push-45-4', { body });
  if (error) throw error;
  return Number((data as { delivered?: number } | null)?.delivered ?? 0);
}

export async function sendTestPush(): Promise<number> {
  return invokePush({ action: 'test' });
}

export async function notifyBuddyArrival(visitId: string): Promise<number> {
  return invokePush({ action: 'buddy-arrived', visitId });
}

export async function notifyBuddyLeft(visitId: string, durationSeconds: number): Promise<number> {
  return invokePush({ action: 'buddy-left', visitId, durationSeconds });
}

export async function notifyBuddyFourOfFour(weekStart: string): Promise<number> {
  return invokePush({ action: 'buddy-4of4', weekStart });
}

export async function notifyBuddyReaction(kind: string): Promise<number> {
  return invokePush({ action: 'buddy-reaction', kind });
}
