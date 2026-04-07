import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { firebaseApp, db } from "./firebase";
import { ref, set } from "firebase/database";

const messaging = getMessaging(firebaseApp);

export const requestNotificationPermission = async (uid: string) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Permission denied");
      return;
    }
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    if (token) {
      await set(ref(db, `mk2_users/${uid}/fcmToken`), token);
      console.log("Token saved:", token);
    }
  } catch (err) {
    console.error(err);
  }
};

export const listenForForegroundMessages = (
  showToast: (msg: string, type: "success" | "error" | "info") => void,
) => {
  onMessage(messaging, (payload) => {
    console.log("📨 Message received:", payload);
    showToast(
      `${payload.notification?.title} — ${payload.notification?.body}`,
      "success",
    );
  });
};
