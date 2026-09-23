/// <reference lib="webworker" />

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

const CASE_REGISTER_PATH = /^\/case-register(?:\/|$)/;

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
