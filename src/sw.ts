/// <reference lib="webworker" />

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { setCacheNameDetails } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

const CASE_REGISTER_PATH = /^\/case-register(?:\/|$)/;

// كل كاشات 45/4 تحمل prefix واضحًا ولا تُستخدم ككاش عام لباقي github.io.
setCacheNameDetails({ prefix: '45-4', precache: 'precache', runtime: 'runtime', suffix: 'v1' });

self.skipWaiting();

// Workbox only removes obsolete precache entries belonging to this registration.
// No broad CacheStorage deletion is used, so project caches under /case-register/ are untouched.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// The sports app shell must never answer a navigation under /case-register/.
// Non-navigation requests under that path do not match any registered runtime route either.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//, CASE_REGISTER_PATH],
  }),
);

// Users controlled by the previous root-scoped worker may currently see 45/4 at
// /case-register/. As soon as this worker activates, reload those clients once;
// the denylist above makes that reload go directly to GitHub Pages.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true })).then((windowClients) => {
      const caseClients = windowClients.filter((client) => {
        const url = new URL(client.url);
        return url.origin === self.location.origin && CASE_REGISTER_PATH.test(url.pathname);
      });
      // Navigation must run in the next task, after the activate event has completed
      // and this worker is the active controller for the client.
      setTimeout(() => {
        for (const client of caseClients) {
          void (client as WindowClient).navigate(client.url).catch(() => undefined);
        }
      }, 0);
    }),
  );
});


/* ============================ Web Push ============================ */
self.addEventListener('push', (event: any) => {
  let payload: any = {};
  try { payload = event.data?.json?.() ?? {}; } catch { payload = { title: '45/4', body: event.data?.text?.() ?? '' }; }
  const title = payload.title || '45/4';
  const options: NotificationOptions & { actions?: Array<{ action: string; title: string }> } = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    tag: payload.tag || undefined,
    data: { url: payload.url || payload.data?.url || '/', ...(payload.data || {}) },
    actions: Array.isArray(payload.actions) ? payload.actions : undefined,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: any) => {
  event.notification?.close?.();
  if (event.action === 'ack') return;
  const target = new URL(event.notification?.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      const w = client as WindowClient;
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus();
        if (w.url !== target) await w.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
