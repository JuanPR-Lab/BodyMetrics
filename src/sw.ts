import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { clientsClaim, skipWaiting } from 'workbox-core';

// 0. FORCE IMMEDIATE ACTIVATION (Key for your issue)
skipWaiting();
clientsClaim();

// 1. Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// 2. Runtime Caching for Navigation (HTML)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages-cache',
    plugins: []
  })
);

console.log("Service Worker: Active, controlling page, and ready to cache! 🚀");