import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNotifications } from "@/hooks/useNotifications";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";
import { ref, set, get, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { getMessaging, getToken, deleteToken } from "firebase/messaging";

// Helper to format timestamp
const formatTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const getIcon = (title: string, message: string) => {
  const lower = (title + " " + message).toLowerCase();
  if (lower.includes("class") || lower.includes("booking")) return "🏋️";
  if (lower.includes("reward") || lower.includes("points")) return "🏆";
  if (lower.includes("workout") || lower.includes("planner")) return "⚡";
  if (lower.includes("check")) return "✅";
  if (lower.includes("news")) return "📢";
  if (lower.includes("poll")) return "📊";
  if (
    lower.includes("community") ||
    lower.includes("chat") ||
    lower.includes("message")
  )
    return "💬";
  if (lower.includes("geo") || lower.includes("location")) return "📍";
  return "🔔";
};

const getTypeColor = (title: string, message: string) => {
  const lower = (title + " " + message).toLowerCase();
  if (lower.includes("class") || lower.includes("booking"))
    return "hsl(20 100% 50%)";
  if (lower.includes("reward") || lower.includes("points"))
    return "hsl(38 92% 44%)";
  if (lower.includes("workout") || lower.includes("planner"))
    return "hsl(217 91% 53%)";
  if (lower.includes("check")) return "hsl(142 72% 37%)";
  if (lower.includes("geo") || lower.includes("location"))
    return "hsl(187 85% 40%)";
  if (lower.includes("news")) return "hsl(263 85% 58%)";
  if (
    lower.includes("community") ||
    lower.includes("chat") ||
    lower.includes("poll") ||
    lower.includes("message")
  )
    return "hsl(20 100% 50%)";
  return "hsl(var(--muted-foreground))";
};

const PREF_KEYS = [
  {
    label: "Class reminders",
    icon: "📅",
    key: "classReminders",
    default: true,
  },
  {
    label: "Reward milestones",
    icon: "🏆",
    key: "rewardMilestones",
    default: true,
  },
  { label: "Workout nudges", icon: "⚡", key: "workoutNudges", default: true },
  { label: "Gym news", icon: "📢", key: "gymNews", default: false },
  {
    label: "Check-in streaks",
    icon: "✅",
    key: "checkinStreaks",
    default: true,
  },
  { label: "Community", icon: "💬", key: "community", default: false },
];

const FCM_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

// ── FCM token helpers – store token at mk2_users/${uid}/fcmToken (singular) ──
async function registerCommunityToken(uid: string) {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
    if (token) {
      await set(ref(db, `mk2_users/${uid}/fcmToken`), token);
    }
  } catch (err) {
    console.warn("FCM token registration failed:", err);
  }
}

async function unregisterCommunityToken(uid: string) {
  try {
    const messaging = getMessaging();
    await deleteToken(messaging);
    await remove(ref(db, `mk2_users/${uid}/fcmToken`));
  } catch (err) {
    console.warn("FCM token unregistration failed:", err);
  }
}

export function Notifications({ setPage }: { setPage: (p: string) => void }) {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const {
    nearGym,
    distanceM,
    requestLocation,
    loading: geoLoading,
    error: geoError,
    supported,
    lat,
  } = useGeolocation();

  const {
    notifications,
    unreadCount,
    loading: notifLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications(user?.uid || null);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [geoEnabled, setGeoEnabled] = useState(false);

  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PREF_KEYS.map((p) => [p.key, p.default])),
  );
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    get(ref(db, `mk2_users/${user.uid}/notificationPrefs`)).then((snap) => {
      if (snap.exists()) setPrefs(snap.val());
      setPrefsLoaded(true);
    });
  }, [user?.uid]);

  // Mark all news as seen when user opens Notifications — clears the bell badge
  useEffect(() => {
    if (!user?.uid) return;
    set(ref(db, `mk2_users/${user.uid}/lastSeenNewsAt`), Date.now()).catch(
      () => {},
    );
  }, [user?.uid]);

  const togglePref = async (key: string, value: boolean) => {
    if (!user?.uid) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await set(ref(db, `mk2_users/${user.uid}/notificationPrefs`), updated);

    if (key === "community") {
      if (value) {
        const browserPerm = await Notification.requestPermission();
        if (browserPerm === "granted") {
          await registerCommunityToken(user.uid);
        }
      } else {
        await unregisterCommunityToken(user.uid);
      }
    }
  };

  if (!user) return null;

  const requestPush = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    if (result === "granted") {
      setPermissionGranted(true);
      new Notification("MK2 Rivers Fitness 💪", {
        body: "Notifications enabled!",
        icon: "/favicon.ico",
      });
    }
  };

  return (
    <div
      className={`max-w-[760px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Stay on top of classes, rewards and reminders">
        Notifications{" "}
        {unreadCount > 0 && (
          <span className="text-primary text-[32px]">({unreadCount})</span>
        )}
      </PageTitle>

      {/* Push notification banner */}
      {!permissionGranted && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mk2-card mb-4 border-l-[3px]"
          style={{ borderLeftColor: "hsl(20 100% 50%)" }}
        >
          <div className="flex items-start gap-3 flex-wrap">
            <span className="text-2xl">🔔</span>
            <div className="flex-1">
              <div className="font-bold text-sm mb-1">
                Enable Push Notifications
              </div>
              <div className="text-muted-foreground text-xs mb-3">
                Get reminders for classes, rewards, and check-ins — even when
                the app is closed.
              </div>
              <Btn variant="primary" size="sm" onClick={requestPush}>
                🔔 Enable Notifications
              </Btn>
            </div>
          </div>
        </motion.div>
      )}

      {/* Geolocation banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mk2-card mb-4 border-l-[3px]"
        style={{ borderLeftColor: "hsl(187 85% 40%)" }}
      >
        <div className="flex items-start gap-3 flex-wrap">
          <span className="text-2xl">📍</span>
          <div className="flex-1">
            <div className="font-bold text-sm mb-1">
              Location-Based Check-In Reminders
            </div>
            <div className="text-muted-foreground text-xs mb-3">
              When you're near the gym, we'll remind you to check in and earn
              points.
            </div>
            {!geoEnabled ? (
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => {
                  requestLocation();
                  setGeoEnabled(true);
                }}
                disabled={!supported}
              >
                📍 Enable Location
              </Btn>
            ) : geoLoading ? (
              <div className="text-xs text-muted-foreground">
                Getting location…
              </div>
            ) : geoError ? (
              <div className="text-xs text-red-400">{geoError}</div>
            ) : lat ? (
              <div
                className="text-xs font-bold px-3 py-1.5 rounded-full w-fit"
                style={{
                  background: nearGym
                    ? "hsl(142 72% 37% / 0.2)"
                    : "hsl(38 92% 44% / 0.15)",
                  color: nearGym ? "hsl(142 72% 37%)" : "hsl(38 92% 44%)",
                }}
              >
                {nearGym
                  ? "✅ You're near the gym! Check in now"
                  : `📍 ${distanceM}m from gym`}
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* Notification Preferences — saved to Firebase */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mk2-card mb-5"
      >
        <div className="font-bold text-sm mb-3">Notification Preferences</div>
        {!prefsLoaded ? (
          <div className="text-xs text-muted-foreground">
            Loading preferences…
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {PREF_KEYS.map(({ label, icon, key }) => (
              <label
                key={key}
                className="flex items-center gap-2.5 p-2.5 bg-secondary rounded-lg cursor-pointer"
              >
                <span>{icon}</span>
                <span className="flex-1 text-xs font-medium">{label}</span>
                <input
                  type="checkbox"
                  checked={prefs[key] ?? false}
                  onChange={(e) => togglePref(key, e.target.checked)}
                  className="accent-orange-500 w-4 h-4"
                />
              </label>
            ))}
          </div>
        )}
      </motion.div>

      {/* Notifications list */}
      <div className="flex justify-between items-center mb-3">
        <div className="font-bold text-sm">Recent ({notifications.length})</div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-primary bg-transparent border-none cursor-pointer font-bold"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Loading notifications…
        </div>
      ) : notifications.length === 0 ? (
        <div className="mk2-card text-center py-12 text-muted-foreground">
          No notifications yet. We'll keep you posted!
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((n, i) => {
            const icon = getIcon(n.title, n.message);
            const color = getTypeColor(n.title, n.message);
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => markAsRead(n.id)}
                className="mk2-card cursor-pointer"
                style={{
                  borderLeft: `3px solid ${color}`,
                  opacity: n.read ? 0.6 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <div className="font-bold text-sm">{n.title}</div>
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        <div className="text-[10px] text-muted-foreground">
                          {formatTime(n.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {n.message}
                    </div>
                    {n.link && (
                      <div className="mt-2 text-[10px] font-semibold text-primary">
                        Tap to view →
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Back button */}
      <div className="mt-8 text-center">
        <Btn variant="ghost" onClick={() => setPage("Dashboard")}>
          ← Back to Dashboard
        </Btn>
      </div>
    </div>
  );
}

// import { useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { useGeolocation } from "@/hooks/useGeolocation";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";

// interface Notification {
//   id: string;
//   type: "reminder" | "reward" | "class" | "news" | "checkin" | "geo";
//   title: string;
//   body: string;
//   time: string;
//   read: boolean;
//   icon: string;
// }

// const DEMO: Notification[] = [
//   {
//     id: "1",
//     type: "class",
//     title: "Class Starting Soon",
//     body: "HIIT Blast with Coach Sipho starts in 30 minutes!",
//     time: "30 min ago",
//     read: false,
//     icon: "🏋️",
//   },
//   {
//     id: "2",
//     type: "reward",
//     title: "Points Milestone!",
//     body: "You've earned 200 points — Silver Member unlocked! 10% off all classes.",
//     time: "2 hrs ago",
//     read: false,
//     icon: "🥈",
//   },
//   {
//     id: "3",
//     type: "reminder",
//     title: "Workout Reminder",
//     body: "You haven't logged a workout in 3 days. Keep your streak going!",
//     time: "Yesterday",
//     read: true,
//     icon: "⚡",
//   },
//   {
//     id: "4",
//     type: "news",
//     title: "New Class Added",
//     body: "Saturday Morning Bootcamp — 07:00 with Coach Marcus. Spots filling fast!",
//     time: "2 days ago",
//     read: true,
//     icon: "📢",
//   },
//   {
//     id: "5",
//     type: "checkin",
//     title: "Check-In Streak",
//     body: "3-day streak! Check in 7 days in a row to earn a bonus 50 points.",
//     time: "3 days ago",
//     read: true,
//     icon: "✅",
//   },
// ];

// export function Notifications() {
//   const { user } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const {
//     nearGym,
//     distanceM,
//     requestLocation,
//     loading,
//     error,
//     supported,
//     lat,
//   } = useGeolocation();
//   const [notifications, setNotifications] = useState<Notification[]>(DEMO);
//   const [geoEnabled, setGeoEnabled] = useState(false);
//   const [permissionGranted, setPermissionGranted] = useState(false);

//   if (!user) return null;

//   const unread = notifications.filter((n) => !n.read).length;
//   const markRead = (id: string) =>
//     setNotifications((ns) =>
//       ns.map((n) => (n.id === id ? { ...n, read: true } : n)),
//     );
//   const markAllRead = () =>
//     setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));

//   const requestPush = async () => {
//     if (!("Notification" in window)) return;
//     const result = await Notification.requestPermission();
//     if (result === "granted") {
//       setPermissionGranted(true);
//       new Notification("MK2 Rivers Fitness 💪", {
//         body: "Notifications enabled!",
//         icon: "/favicon.ico",
//       });
//     }
//   };

//   const typeColor: Record<string, string> = {
//     reminder: "hsl(38 92% 44%)",
//     reward: "hsl(38 92% 44%)",
//     class: "hsl(20 100% 50%)",
//     news: "hsl(217 91% 53%)",
//     checkin: "hsl(142 72% 37%)",
//     geo: "hsl(187 85% 40%)",
//   };

//   return (
//     <div
//       className={`max-w-[760px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Stay on top of classes, rewards and reminders">
//         Notifications{" "}
//         {unread > 0 && (
//           <span className="text-primary text-[32px]">({unread})</span>
//         )}
//       </PageTitle>

//       {!permissionGranted && (
//         <motion.div
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="mk2-card mb-4 border-l-[3px]"
//           style={{ borderLeftColor: "hsl(20 100% 50%)" }}
//         >
//           <div className="flex items-start gap-3 flex-wrap">
//             <span className="text-2xl">🔔</span>
//             <div className="flex-1">
//               <div className="font-bold text-sm mb-1">
//                 Enable Push Notifications
//               </div>
//               <div className="text-muted-foreground text-xs mb-3">
//                 Get reminders for classes, rewards, and check-ins — even when
//                 the app is closed.
//               </div>
//               <Btn variant="primary" size="sm" onClick={requestPush}>
//                 🔔 Enable Notifications
//               </Btn>
//             </div>
//           </div>
//         </motion.div>
//       )}

//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.1 }}
//         className="mk2-card mb-4 border-l-[3px]"
//         style={{ borderLeftColor: "hsl(187 85% 40%)" }}
//       >
//         <div className="flex items-start gap-3 flex-wrap">
//           <span className="text-2xl">📍</span>
//           <div className="flex-1">
//             <div className="font-bold text-sm mb-1">
//               Location-Based Check-In Reminders
//             </div>
//             <div className="text-muted-foreground text-xs mb-3">
//               When you're near the gym, we'll remind you to check in and earn
//               points.
//             </div>
//             {!geoEnabled ? (
//               <Btn
//                 variant="ghost"
//                 size="sm"
//                 onClick={() => {
//                   requestLocation();
//                   setGeoEnabled(true);
//                 }}
//                 disabled={!supported}
//               >
//                 📍 Enable Location
//               </Btn>
//             ) : loading ? (
//               <div className="text-xs text-muted-foreground">
//                 Getting location…
//               </div>
//             ) : error ? (
//               <div className="text-xs text-red-400">{error}</div>
//             ) : lat ? (
//               <div
//                 className="text-xs font-bold px-3 py-1.5 rounded-full w-fit"
//                 style={{
//                   background: nearGym
//                     ? "hsl(142 72% 37% / 0.2)"
//                     : "hsl(38 92% 44% / 0.15)",
//                   color: nearGym ? "hsl(142 72% 37%)" : "hsl(38 92% 44%)",
//                 }}
//               >
//                 {nearGym
//                   ? "✅ You're near the gym! Check in now"
//                   : `📍 ${distanceM}m from gym`}
//               </div>
//             ) : null}
//           </div>
//         </div>
//       </motion.div>

//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.15 }}
//         className="mk2-card mb-5"
//       >
//         <div className="font-bold text-sm mb-3">Notification Preferences</div>
//         <div className="grid grid-cols-2 gap-2">
//           {[
//             ["Class reminders", "📅", true],
//             ["Reward milestones", "🏆", true],
//             ["Workout nudges", "⚡", true],
//             ["Gym news", "📢", false],
//             ["Check-in streaks", "✅", true],
//             ["Community", "💬", false],
//           ].map(([label, icon, def]: any) => (
//             <label
//               key={label}
//               className="flex items-center gap-2.5 p-2.5 bg-secondary rounded-lg cursor-pointer"
//             >
//               <span>{icon}</span>
//               <span className="flex-1 text-xs font-medium">{label}</span>
//               <input
//                 type="checkbox"
//                 defaultChecked={def}
//                 className="accent-orange-500 w-4 h-4"
//               />
//             </label>
//           ))}
//         </div>
//       </motion.div>

//       <div className="flex justify-between items-center mb-3">
//         <div className="font-bold text-sm">Recent ({notifications.length})</div>
//         {unread > 0 && (
//           <button
//             onClick={markAllRead}
//             className="text-xs text-primary bg-transparent border-none cursor-pointer font-bold"
//           >
//             Mark all read
//           </button>
//         )}
//       </div>

//       <div className="flex flex-col gap-3">
//         {notifications.map((n, i) => (
//           <motion.div
//             key={n.id}
//             initial={{ opacity: 0, x: -8 }}
//             animate={{ opacity: 1, x: 0 }}
//             transition={{ delay: i * 0.05 }}
//             onClick={() => markRead(n.id)}
//             className="mk2-card cursor-pointer"
//             style={{
//               borderLeft: `3px solid ${typeColor[n.type]}`,
//               opacity: n.read ? 0.6 : 1,
//             }}
//           >
//             <div className="flex items-start gap-3">
//               <span className="text-xl shrink-0">{n.icon}</span>
//               <div className="flex-1">
//                 <div className="flex justify-between items-start gap-2 flex-wrap">
//                   <div className="font-bold text-sm">{n.title}</div>
//                   <div className="flex items-center gap-2">
//                     {!n.read && (
//                       <div className="w-2 h-2 rounded-full bg-primary" />
//                     )}
//                     <div className="text-[10px] text-muted-foreground">
//                       {n.time}
//                     </div>
//                   </div>
//                 </div>
//                 <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
//                   {n.body}
//                 </div>
//               </div>
//             </div>
//           </motion.div>
//         ))}
//       </div>
//     </div>
//   );
// }

// import { useState, useEffect } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { useGeolocation } from "@/hooks/useGeolocation";
// import { useNotifications } from "@/hooks/useNotifications";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";
// import { ref, set, get, remove } from "firebase/database";
// import { db } from "@/lib/firebase";
// import { getMessaging, getToken, deleteToken } from "firebase/messaging";

// // Helper to format timestamp
// const formatTime = (timestamp: number) => {
//   const diff = Date.now() - timestamp;
//   const minutes = Math.floor(diff / 60000);
//   const hours = Math.floor(diff / 3600000);
//   const days = Math.floor(diff / 86400000);

//   if (minutes < 1) return "Just now";
//   if (minutes < 60) return `${minutes} min ago`;
//   if (hours < 24) return `${hours} hr ago`;
//   return `${days} day${days === 1 ? "" : "s"} ago`;
// };

// const getIcon = (title: string, message: string) => {
//   const lower = (title + " " + message).toLowerCase();
//   if (lower.includes("class") || lower.includes("booking")) return "🏋️";
//   if (lower.includes("reward") || lower.includes("points")) return "🏆";
//   if (lower.includes("workout") || lower.includes("planner")) return "⚡";
//   if (lower.includes("check")) return "✅";
//   if (lower.includes("news")) return "📢";
//   if (lower.includes("poll")) return "📊";
//   if (
//     lower.includes("community") ||
//     lower.includes("chat") ||
//     lower.includes("message")
//   )
//     return "💬";
//   if (lower.includes("geo") || lower.includes("location")) return "📍";
//   return "🔔";
// };

// const getTypeColor = (title: string, message: string) => {
//   const lower = (title + " " + message).toLowerCase();
//   if (lower.includes("class") || lower.includes("booking"))
//     return "hsl(20 100% 50%)";
//   if (lower.includes("reward") || lower.includes("points"))
//     return "hsl(38 92% 44%)";
//   if (lower.includes("workout") || lower.includes("planner"))
//     return "hsl(217 91% 53%)";
//   if (lower.includes("check")) return "hsl(142 72% 37%)";
//   if (lower.includes("geo") || lower.includes("location"))
//     return "hsl(187 85% 40%)";
//   if (lower.includes("news")) return "hsl(263 85% 58%)";
//   if (
//     lower.includes("community") ||
//     lower.includes("chat") ||
//     lower.includes("poll") ||
//     lower.includes("message")
//   )
//     return "hsl(20 100% 50%)";
//   return "hsl(var(--muted-foreground))";
// };

// const PREF_KEYS = [
//   {
//     label: "Class reminders",
//     icon: "📅",
//     key: "classReminders",
//     default: true,
//   },
//   {
//     label: "Reward milestones",
//     icon: "🏆",
//     key: "rewardMilestones",
//     default: true,
//   },
//   { label: "Workout nudges", icon: "⚡", key: "workoutNudges", default: true },
//   { label: "Gym news", icon: "📢", key: "gymNews", default: false },
//   {
//     label: "Check-in streaks",
//     icon: "✅",
//     key: "checkinStreaks",
//     default: true,
//   },
//   { label: "Community", icon: "💬", key: "community", default: false },
// ];

// const FCM_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

// // ── FCM token helpers – store token at mk2_users/${uid}/fcmToken (singular) ──
// async function registerCommunityToken(uid: string) {
//   try {
//     const messaging = getMessaging();
//     const token = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
//     if (token) {
//       await set(ref(db, `mk2_users/${uid}/fcmToken`), token);
//     }
//   } catch (err) {
//     console.warn("FCM token registration failed:", err);
//   }
// }

// async function unregisterCommunityToken(uid: string) {
//   try {
//     const messaging = getMessaging();
//     await deleteToken(messaging);
//     await remove(ref(db, `mk2_users/${uid}/fcmToken`));
//   } catch (err) {
//     console.warn("FCM token unregistration failed:", err);
//   }
// }

// export function Notifications({ setPage }: { setPage: (p: string) => void }) {
//   const { user } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const {
//     nearGym,
//     distanceM,
//     requestLocation,
//     loading: geoLoading,
//     error: geoError,
//     supported,
//     lat,
//   } = useGeolocation();

//   const {
//     notifications,
//     unreadCount,
//     loading: notifLoading,
//     markAsRead,
//     markAllAsRead,
//   } = useNotifications(user?.uid || null);

//   const [permissionGranted, setPermissionGranted] = useState(false);
//   const [geoEnabled, setGeoEnabled] = useState(false);

//   const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
//     Object.fromEntries(PREF_KEYS.map((p) => [p.key, p.default])),
//   );
//   const [prefsLoaded, setPrefsLoaded] = useState(false);

//   useEffect(() => {
//     if (!user?.uid) return;
//     get(ref(db, `mk2_users/${user.uid}/notificationPrefs`)).then((snap) => {
//       if (snap.exists()) setPrefs(snap.val());
//       setPrefsLoaded(true);
//     });
//   }, [user?.uid]);

//   const togglePref = async (key: string, value: boolean) => {
//     if (!user?.uid) return;
//     const updated = { ...prefs, [key]: value };
//     setPrefs(updated);
//     await set(ref(db, `mk2_users/${user.uid}/notificationPrefs`), updated);

//     if (key === "community") {
//       if (value) {
//         const browserPerm = await Notification.requestPermission();
//         if (browserPerm === "granted") {
//           await registerCommunityToken(user.uid);
//         }
//       } else {
//         await unregisterCommunityToken(user.uid);
//       }
//     }
//   };

//   if (!user) return null;

//   const requestPush = async () => {
//     if (!("Notification" in window)) return;
//     const result = await Notification.requestPermission();
//     if (result === "granted") {
//       setPermissionGranted(true);
//       new Notification("MK2 Rivers Fitness 💪", {
//         body: "Notifications enabled!",
//         icon: "/favicon.ico",
//       });
//     }
//   };

//   return (
//     <div
//       className={`max-w-[760px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Stay on top of classes, rewards and reminders">
//         Notifications{" "}
//         {unreadCount > 0 && (
//           <span className="text-primary text-[32px]">({unreadCount})</span>
//         )}
//       </PageTitle>

//       {/* Push notification banner */}
//       {!permissionGranted && (
//         <motion.div
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="mk2-card mb-4 border-l-[3px]"
//           style={{ borderLeftColor: "hsl(20 100% 50%)" }}
//         >
//           <div className="flex items-start gap-3 flex-wrap">
//             <span className="text-2xl">🔔</span>
//             <div className="flex-1">
//               <div className="font-bold text-sm mb-1">
//                 Enable Push Notifications
//               </div>
//               <div className="text-muted-foreground text-xs mb-3">
//                 Get reminders for classes, rewards, and check-ins — even when
//                 the app is closed.
//               </div>
//               <Btn variant="primary" size="sm" onClick={requestPush}>
//                 🔔 Enable Notifications
//               </Btn>
//             </div>
//           </div>
//         </motion.div>
//       )}

//       {/* Geolocation banner */}
//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.1 }}
//         className="mk2-card mb-4 border-l-[3px]"
//         style={{ borderLeftColor: "hsl(187 85% 40%)" }}
//       >
//         <div className="flex items-start gap-3 flex-wrap">
//           <span className="text-2xl">📍</span>
//           <div className="flex-1">
//             <div className="font-bold text-sm mb-1">
//               Location-Based Check-In Reminders
//             </div>
//             <div className="text-muted-foreground text-xs mb-3">
//               When you're near the gym, we'll remind you to check in and earn
//               points.
//             </div>
//             {!geoEnabled ? (
//               <Btn
//                 variant="ghost"
//                 size="sm"
//                 onClick={() => {
//                   requestLocation();
//                   setGeoEnabled(true);
//                 }}
//                 disabled={!supported}
//               >
//                 📍 Enable Location
//               </Btn>
//             ) : geoLoading ? (
//               <div className="text-xs text-muted-foreground">
//                 Getting location…
//               </div>
//             ) : geoError ? (
//               <div className="text-xs text-red-400">{geoError}</div>
//             ) : lat ? (
//               <div
//                 className="text-xs font-bold px-3 py-1.5 rounded-full w-fit"
//                 style={{
//                   background: nearGym
//                     ? "hsl(142 72% 37% / 0.2)"
//                     : "hsl(38 92% 44% / 0.15)",
//                   color: nearGym ? "hsl(142 72% 37%)" : "hsl(38 92% 44%)",
//                 }}
//               >
//                 {nearGym
//                   ? "✅ You're near the gym! Check in now"
//                   : `📍 ${distanceM}m from gym`}
//               </div>
//             ) : null}
//           </div>
//         </div>
//       </motion.div>

//       {/* Notification Preferences — saved to Firebase */}
//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.15 }}
//         className="mk2-card mb-5"
//       >
//         <div className="font-bold text-sm mb-3">Notification Preferences</div>
//         {!prefsLoaded ? (
//           <div className="text-xs text-muted-foreground">
//             Loading preferences…
//           </div>
//         ) : (
//           <div className="grid grid-cols-2 gap-2">
//             {PREF_KEYS.map(({ label, icon, key }) => (
//               <label
//                 key={key}
//                 className="flex items-center gap-2.5 p-2.5 bg-secondary rounded-lg cursor-pointer"
//               >
//                 <span>{icon}</span>
//                 <span className="flex-1 text-xs font-medium">{label}</span>
//                 <input
//                   type="checkbox"
//                   checked={prefs[key] ?? false}
//                   onChange={(e) => togglePref(key, e.target.checked)}
//                   className="accent-orange-500 w-4 h-4"
//                 />
//               </label>
//             ))}
//           </div>
//         )}
//       </motion.div>

//       {/* Notifications list */}
//       <div className="flex justify-between items-center mb-3">
//         <div className="font-bold text-sm">Recent ({notifications.length})</div>
//         {unreadCount > 0 && (
//           <button
//             onClick={markAllAsRead}
//             className="text-xs text-primary bg-transparent border-none cursor-pointer font-bold"
//           >
//             Mark all read
//           </button>
//         )}
//       </div>

//       {notifLoading ? (
//         <div className="text-center py-12 text-muted-foreground text-sm">
//           Loading notifications…
//         </div>
//       ) : notifications.length === 0 ? (
//         <div className="mk2-card text-center py-12 text-muted-foreground">
//           No notifications yet. We'll keep you posted!
//         </div>
//       ) : (
//         <div className="flex flex-col gap-3">
//           {notifications.map((n, i) => {
//             const icon = getIcon(n.title, n.message);
//             const color = getTypeColor(n.title, n.message);
//             return (
//               <motion.div
//                 key={n.id}
//                 initial={{ opacity: 0, x: -8 }}
//                 animate={{ opacity: 1, x: 0 }}
//                 transition={{ delay: i * 0.05 }}
//                 onClick={() => markAsRead(n.id)}
//                 className="mk2-card cursor-pointer"
//                 style={{
//                   borderLeft: `3px solid ${color}`,
//                   opacity: n.read ? 0.6 : 1,
//                 }}
//               >
//                 <div className="flex items-start gap-3">
//                   <span className="text-xl shrink-0">{icon}</span>
//                   <div className="flex-1">
//                     <div className="flex justify-between items-start gap-2 flex-wrap">
//                       <div className="font-bold text-sm">{n.title}</div>
//                       <div className="flex items-center gap-2">
//                         {!n.read && (
//                           <div className="w-2 h-2 rounded-full bg-primary" />
//                         )}
//                         <div className="text-[10px] text-muted-foreground">
//                           {formatTime(n.timestamp)}
//                         </div>
//                       </div>
//                     </div>
//                     <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
//                       {n.message}
//                     </div>
//                     {n.link && (
//                       <div className="mt-2 text-[10px] font-semibold text-primary">
//                         Tap to view →
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </motion.div>
//             );
//           })}
//         </div>
//       )}

//       {/* Back button */}
//       <div className="mt-8 text-center">
//         <Btn variant="ghost" onClick={() => setPage("Dashboard")}>
//           ← Back to Dashboard
//         </Btn>
//       </div>
//     </div>
//   );
// }

// import { useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { useGeolocation } from "@/hooks/useGeolocation";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";

// interface Notification {
//   id: string;
//   type: "reminder" | "reward" | "class" | "news" | "checkin" | "geo";
//   title: string;
//   body: string;
//   time: string;
//   read: boolean;
//   icon: string;
// }

// const DEMO: Notification[] = [
//   {
//     id: "1",
//     type: "class",
//     title: "Class Starting Soon",
//     body: "HIIT Blast with Coach Sipho starts in 30 minutes!",
//     time: "30 min ago",
//     read: false,
//     icon: "🏋️",
//   },
//   {
//     id: "2",
//     type: "reward",
//     title: "Points Milestone!",
//     body: "You've earned 200 points — Silver Member unlocked! 10% off all classes.",
//     time: "2 hrs ago",
//     read: false,
//     icon: "🥈",
//   },
//   {
//     id: "3",
//     type: "reminder",
//     title: "Workout Reminder",
//     body: "You haven't logged a workout in 3 days. Keep your streak going!",
//     time: "Yesterday",
//     read: true,
//     icon: "⚡",
//   },
//   {
//     id: "4",
//     type: "news",
//     title: "New Class Added",
//     body: "Saturday Morning Bootcamp — 07:00 with Coach Marcus. Spots filling fast!",
//     time: "2 days ago",
//     read: true,
//     icon: "📢",
//   },
//   {
//     id: "5",
//     type: "checkin",
//     title: "Check-In Streak",
//     body: "3-day streak! Check in 7 days in a row to earn a bonus 50 points.",
//     time: "3 days ago",
//     read: true,
//     icon: "✅",
//   },
// ];

// export function Notifications() {
//   const { user } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const {
//     nearGym,
//     distanceM,
//     requestLocation,
//     loading,
//     error,
//     supported,
//     lat,
//   } = useGeolocation();
//   const [notifications, setNotifications] = useState<Notification[]>(DEMO);
//   const [geoEnabled, setGeoEnabled] = useState(false);
//   const [permissionGranted, setPermissionGranted] = useState(false);

//   if (!user) return null;

//   const unread = notifications.filter((n) => !n.read).length;
//   const markRead = (id: string) =>
//     setNotifications((ns) =>
//       ns.map((n) => (n.id === id ? { ...n, read: true } : n)),
//     );
//   const markAllRead = () =>
//     setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));

//   const requestPush = async () => {
//     if (!("Notification" in window)) return;
//     const result = await Notification.requestPermission();
//     if (result === "granted") {
//       setPermissionGranted(true);
//       new Notification("MK2 Rivers Fitness 💪", {
//         body: "Notifications enabled!",
//         icon: "/favicon.ico",
//       });
//     }
//   };

//   const typeColor: Record<string, string> = {
//     reminder: "hsl(38 92% 44%)",
//     reward: "hsl(38 92% 44%)",
//     class: "hsl(20 100% 50%)",
//     news: "hsl(217 91% 53%)",
//     checkin: "hsl(142 72% 37%)",
//     geo: "hsl(187 85% 40%)",
//   };

//   return (
//     <div
//       className={`max-w-[760px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Stay on top of classes, rewards and reminders">
//         Notifications{" "}
//         {unread > 0 && (
//           <span className="text-primary text-[32px]">({unread})</span>
//         )}
//       </PageTitle>

//       {!permissionGranted && (
//         <motion.div
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="mk2-card mb-4 border-l-[3px]"
//           style={{ borderLeftColor: "hsl(20 100% 50%)" }}
//         >
//           <div className="flex items-start gap-3 flex-wrap">
//             <span className="text-2xl">🔔</span>
//             <div className="flex-1">
//               <div className="font-bold text-sm mb-1">
//                 Enable Push Notifications
//               </div>
//               <div className="text-muted-foreground text-xs mb-3">
//                 Get reminders for classes, rewards, and check-ins — even when
//                 the app is closed.
//               </div>
//               <Btn variant="primary" size="sm" onClick={requestPush}>
//                 🔔 Enable Notifications
//               </Btn>
//             </div>
//           </div>
//         </motion.div>
//       )}

//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.1 }}
//         className="mk2-card mb-4 border-l-[3px]"
//         style={{ borderLeftColor: "hsl(187 85% 40%)" }}
//       >
//         <div className="flex items-start gap-3 flex-wrap">
//           <span className="text-2xl">📍</span>
//           <div className="flex-1">
//             <div className="font-bold text-sm mb-1">
//               Location-Based Check-In Reminders
//             </div>
//             <div className="text-muted-foreground text-xs mb-3">
//               When you're near the gym, we'll remind you to check in and earn
//               points.
//             </div>
//             {!geoEnabled ? (
//               <Btn
//                 variant="ghost"
//                 size="sm"
//                 onClick={() => {
//                   requestLocation();
//                   setGeoEnabled(true);
//                 }}
//                 disabled={!supported}
//               >
//                 📍 Enable Location
//               </Btn>
//             ) : loading ? (
//               <div className="text-xs text-muted-foreground">
//                 Getting location…
//               </div>
//             ) : error ? (
//               <div className="text-xs text-red-400">{error}</div>
//             ) : lat ? (
//               <div
//                 className="text-xs font-bold px-3 py-1.5 rounded-full w-fit"
//                 style={{
//                   background: nearGym
//                     ? "hsl(142 72% 37% / 0.2)"
//                     : "hsl(38 92% 44% / 0.15)",
//                   color: nearGym ? "hsl(142 72% 37%)" : "hsl(38 92% 44%)",
//                 }}
//               >
//                 {nearGym
//                   ? "✅ You're near the gym! Check in now"
//                   : `📍 ${distanceM}m from gym`}
//               </div>
//             ) : null}
//           </div>
//         </div>
//       </motion.div>

//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.15 }}
//         className="mk2-card mb-5"
//       >
//         <div className="font-bold text-sm mb-3">Notification Preferences</div>
//         <div className="grid grid-cols-2 gap-2">
//           {[
//             ["Class reminders", "📅", true],
//             ["Reward milestones", "🏆", true],
//             ["Workout nudges", "⚡", true],
//             ["Gym news", "📢", false],
//             ["Check-in streaks", "✅", true],
//             ["Community", "💬", false],
//           ].map(([label, icon, def]: any) => (
//             <label
//               key={label}
//               className="flex items-center gap-2.5 p-2.5 bg-secondary rounded-lg cursor-pointer"
//             >
//               <span>{icon}</span>
//               <span className="flex-1 text-xs font-medium">{label}</span>
//               <input
//                 type="checkbox"
//                 defaultChecked={def}
//                 className="accent-orange-500 w-4 h-4"
//               />
//             </label>
//           ))}
//         </div>
//       </motion.div>

//       <div className="flex justify-between items-center mb-3">
//         <div className="font-bold text-sm">Recent ({notifications.length})</div>
//         {unread > 0 && (
//           <button
//             onClick={markAllRead}
//             className="text-xs text-primary bg-transparent border-none cursor-pointer font-bold"
//           >
//             Mark all read
//           </button>
//         )}
//       </div>

//       <div className="flex flex-col gap-3">
//         {notifications.map((n, i) => (
//           <motion.div
//             key={n.id}
//             initial={{ opacity: 0, x: -8 }}
//             animate={{ opacity: 1, x: 0 }}
//             transition={{ delay: i * 0.05 }}
//             onClick={() => markRead(n.id)}
//             className="mk2-card cursor-pointer"
//             style={{
//               borderLeft: `3px solid ${typeColor[n.type]}`,
//               opacity: n.read ? 0.6 : 1,
//             }}
//           >
//             <div className="flex items-start gap-3">
//               <span className="text-xl shrink-0">{n.icon}</span>
//               <div className="flex-1">
//                 <div className="flex justify-between items-start gap-2 flex-wrap">
//                   <div className="font-bold text-sm">{n.title}</div>
//                   <div className="flex items-center gap-2">
//                     {!n.read && (
//                       <div className="w-2 h-2 rounded-full bg-primary" />
//                     )}
//                     <div className="text-[10px] text-muted-foreground">
//                       {n.time}
//                     </div>
//                   </div>
//                 </div>
//                 <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
//                   {n.body}
//                 </div>
//               </div>
//             </div>
//           </motion.div>
//         ))}
//       </div>
//     </div>
//   );
// }
