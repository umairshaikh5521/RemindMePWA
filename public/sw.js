importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCY33J7NNlNFiQyZQ1-BHWPj1Bm1xor0Qk',
  authDomain: 'remindme-f1a8b.firebaseapp.com',
  projectId: 'remindme-f1a8b',
  storageBucket: 'remindme-f1a8b.firebasestorage.app',
  messagingSenderId: '877598544717',
  appId: '1:877598544717:web:342466b5cd506b64099d04',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data ?? {};
  self.registration.showNotification(data.title || 'Reminder', {
    body: data.body || 'Tap to open your saved link',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data,
    tag: data.id,
    requireInteraction: true,
  });
});

const CACHE_NAME = 'remind-me-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  const reminderId = data.id;
  const origin = self.location.origin;

  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url.includes(origin) && 'navigate' in client && 'focus' in client) {
          await client.navigate(`${origin}/reminder/${reminderId}`);
          return client.focus();
        }
      }
      return clients.openWindow(`${origin}/reminder/${reminderId}`);
    })()
  );
});