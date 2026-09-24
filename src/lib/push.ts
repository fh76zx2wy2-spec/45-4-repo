import { supabase } from './supabase';

export const VAPID_PUBLIC_KEY = 'BGZi0tSErETec7-aTwRle2-_Kxpv5fQs8jVChh8BXpxksl1WLzpSzoUB-w70-od2jjMHY8X0EHm_zkzLIjR6vHM';

export type PushState = 'unsupported' | 'denied' | 'prompt' | 'enabled';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? 'enabled' : 'prompt';
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
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
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
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  if (supabase) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  }
  await sub.unsubscribe();
}

export async function sendTestPush(): Promise<void> {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { error } = await supabase.functions.invoke('push-45-4', { body: { action: 'test' } });
  if (error) throw error;
}
