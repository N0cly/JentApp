// ============================================================
// JentApp — Service Worker (Web Push Notifications)
// ============================================================

// Réception d'une notification push depuis le serveur
self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'JentApp', body: event.data.text() };
  }

  const title = data.title || 'JentApp';
  const options = {
    body: data.body || '',
    icon: '/assets/jentapp.png',
    badge: '/assets/jentapp.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    requireInteraction: false,
    tag: data.tag || 'jentapp-notif',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Clic sur la notification → ouvrir/focus l'app
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

// Activation immédiate sans attendre la fermeture des onglets
self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim());
});
