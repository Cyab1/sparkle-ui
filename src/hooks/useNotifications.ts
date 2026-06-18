import { useState, useEffect } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";

export interface Notification {
  id: string;
  title: string;
  message: string;
  body?: string; // ← added for compatibility with admin‑sent notifications
  read: boolean;
  timestamp: number;
  link?: string;
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const notifRef = ref(db, `users/${userId}/notifications`);
    const unsub = onValue(notifRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        // Map and normalise: use body if present, otherwise fall back to message
        const list: Notification[] = Object.entries(data).map(
          ([id, val]: [string, any]) => ({
            id,
            ...val,
            message: val.body || val.message || "",
          }),
        );
        list.sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [userId]);

  const markAsRead = async (id: string) => {
    if (!userId) return;
    await set(ref(db, `users/${userId}/notifications/${id}/read`), true);
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    const promises = notifications.map((n) =>
      set(ref(db, `users/${userId}/notifications/${n.id}/read`), true),
    );
    await Promise.all(promises);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
