importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyBmT8tgFZIjz6f6xIAyCTiq-ChETClnC4w",
  authDomain: "gym-pro-20ee6.firebaseapp.com",
  databaseURL:
    "https://gym-pro-20ee6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gym-pro-20ee6",
  storageBucket: "gym-pro-20ee6.firebasestorage.app",
  messagingSenderId: "816966119755",
  appId: "1:816966119755:web:299e532903d842f514f8ce",
});

const messaging = firebase.messaging();

// Background message handler — shows notification when app is not in focus
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "MK Two Rivers";
  const body = payload.notification?.body || "";
  const icon = payload.notification?.icon || "/icons/icon-192x192.png";

  self.registration.showNotification(title, {
    body,
    icon,
    badge: "/icons/icon-72x72.png",
    data: payload.data || {},
    actions: [{ action: "open", title: "Open App" }],
  });
});

// Handle notification click — opens the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If app already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      }),
  );
});
