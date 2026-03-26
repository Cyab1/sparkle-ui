import { useEffect } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { ref, set } from "firebase/database";
import { firebaseApp, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

// Your VAPID key from Firebase Console → Project Settings → Cloud Messaging
const VAPID_KEY =
  "BKahujUOLzLZ17AIqdhtE_BxjIXQfGCGa8LJpHjlB_wMTRLn-thSNa7RgfuyYOeOET7mdVIbeq7F5nNLy6xXec4";

export function usePushNotifications() {
  const { user, toast } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Service workers only work in production builds + HTTPS
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

    const init = async () => {
      try {
        // 1. Request permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // 2. Get FCM token
        const messaging = getMessaging(firebaseApp);
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });

        if (!token) return;

        // 3. Save token to Firebase under the user's record
        await set(ref(db, `mk2_users/${user.uid}/fcmToken`), token);

        // 4. Handle foreground messages (app is open)
        onMessage(messaging, (payload) => {
          const title = payload.notification?.title || "MK Two Rivers";
          const body = payload.notification?.body || "";
          toast(`${title}: ${body}`, "info");
        });
      } catch (err) {
        console.error("Push notification setup failed:", err);
      }
    };

    init();
  }, [user, toast]);
}

// import { useEffect } from "react";
// import { getMessaging, getToken, onMessage } from "firebase/messaging";
// import { ref, set } from "firebase/database";
// import { firebaseApp, db } from "@/lib/firebase";
// import { useAuth } from "@/context/AuthContext";

// // ── Your VAPID key from Firebase Console → Project Settings → Cloud Messaging
// const VAPID_KEY = "BKahujUOLzLZ17AIqdhtE_BxjIXQfGCGa8LJpHjlB_wMTRLn-thSNa7RgfuyYOeOET7mdVIbeq7F5nNLy6xXec4"; // 🔴 replace this

// export function usePushNotifications() {
//   const { user, toast } = useAuth();

//   useEffect(() => {
//     if (!user) return;

//     // Service workers only work in production builds + HTTPS
//     if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

//     const init = async () => {
//       try {
//         // 1. Request permission
//         const permission = await Notification.requestPermission();
//         if (permission !== "granted") return;

//         // 2. Get FCM token
//         const messaging = getMessaging(firebaseApp);
//         const token = await getToken(messaging, { vapidKey: VAPID_KEY });

//         if (!token) return;

//         // 3. Save token to Firebase under the user's record
//         await set(ref(db, `mk2_users/${user.uid}/fcmToken`), token);

//         // 4. Handle foreground messages (app is open)
//         onMessage(messaging, (payload) => {
//           const title = payload.notification?.title || "MK Two Rivers";
//           const body = payload.notification?.body || "";
//           toast(`${title}: ${body}`, "info");
//         });
//       } catch (err) {
//         console.error("Push notification setup failed:", err);
//       }
//     };

//     init();
//   }, [user]);
// }
