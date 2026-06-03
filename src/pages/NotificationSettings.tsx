import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";
import { ref, set, get, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { getMessaging, getToken, deleteToken } from "firebase/messaging";

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

async function registerCommunityToken(uid: string) {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
    if (token) {
      await set(ref(db, `mk2_users/${uid}/fcmToken`), token);
      await set(ref(db, `mk2_users/${uid}/fcmUpdatedAt`), Date.now());
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
    await remove(ref(db, `mk2_users/${uid}/fcmUpdatedAt`));
  } catch (err) {
    console.warn("FCM token unregistration failed:", err);
  }
}

export function NotificationSettings({
  setPage,
}: {
  setPage: (p: string) => void;
}) {
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

  const [permissionGranted, setPermissionGranted] = useState(
    () => "Notification" in window && Notification.permission === "granted",
  );
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PREF_KEYS.map((p) => [p.key, p.default])),
  );
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Load saved prefs from Firebase
  useEffect(() => {
    if (!user?.uid) return;
    get(ref(db, `mk2_users/${user.uid}/notificationPrefs`)).then((snap) => {
      if (snap.exists()) setPrefs(snap.val());
      setPrefsLoaded(true);
    });
  }, [user?.uid]);

  // If permission is already granted on mount, ensure token is saved
  useEffect(() => {
    if (!user?.uid) return;
    if ("Notification" in window && Notification.permission === "granted") {
      registerCommunityToken(user.uid);
    }
  }, [user?.uid]);

  const togglePref = async (key: string, value: boolean) => {
    if (!user?.uid) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await set(ref(db, `mk2_users/${user.uid}/notificationPrefs`), updated);

    // Community toggle still independently manages the token
    if (key === "community") {
      if (value) {
        const browserPerm = await Notification.requestPermission();
        if (browserPerm === "granted") {
          setPermissionGranted(true);
          await registerCommunityToken(user.uid);
        }
      } else {
        await unregisterCommunityToken(user.uid);
      }
    }
  };

  // ── Updated: saves FCM token for ALL members who accept push ──────────────
  const requestPush = async () => {
    if (!("Notification" in window) || !user?.uid) return;

    if (Notification.permission === "granted") {
      setPermissionGranted(true);
      // Re-register in case the token has rotated
      await registerCommunityToken(user.uid);
      return;
    }

    const result = await Notification.requestPermission();
    if (result === "granted") {
      setPermissionGranted(true);
      // Save token so admin can target this member via Push panel
      await registerCommunityToken(user.uid);
      new Notification("MK2 Rivers Fitness 💪", {
        body: "Notifications enabled! You're all set.",
        icon: "/favicon.ico",
      });
    }
  };

  if (!user) return null;

  return (
    <div
      className={`max-w-[760px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Stay on top of classes, rewards and reminders">
        Notification Settings
      </PageTitle>

      {/* Push notification banner — only shown if permission not yet granted */}
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

      {/* Confirmed — push is active */}
      {permissionGranted && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mk2-card mb-4 border-l-[3px]"
          style={{ borderLeftColor: "hsl(142 72% 37%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-bold text-sm">Push notifications active</div>
              <div className="text-muted-foreground text-xs mt-0.5">
                You'll receive alerts even when the app is closed.
              </div>
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

      {/* Notification Preferences */}
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

      {/* Back button */}
      <div className="mt-8 text-center">
        <Btn variant="ghost" onClick={() => setPage("Dashboard")}>
          ← Back to Dashboard
        </Btn>
      </div>
    </div>
  );
}

// import { useState, useEffect } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { useGeolocation } from "@/hooks/useGeolocation";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";
// import { ref, set, get, remove } from "firebase/database";
// import { db } from "@/lib/firebase";
// import { getMessaging, getToken, deleteToken } from "firebase/messaging";

// const PREF_KEYS = [
//   { label: "Class reminders", icon: "📅", key: "classReminders", default: true },
//   { label: "Reward milestones", icon: "🏆", key: "rewardMilestones", default: true },
//   { label: "Workout nudges", icon: "⚡", key: "workoutNudges", default: true },
//   { label: "Gym news", icon: "📢", key: "gymNews", default: false },
//   { label: "Check-in streaks", icon: "✅", key: "checkinStreaks", default: true },
//   { label: "Community", icon: "💬", key: "community", default: false },
// ];

// const FCM_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

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

// export function NotificationSettings({ setPage }: { setPage: (p: string) => void }) {
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

//   const [permissionGranted, setPermissionGranted] = useState(
//     () => "Notification" in window && Notification.permission === "granted"
//   );
//   const [geoEnabled, setGeoEnabled] = useState(false);
//   const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
//     Object.fromEntries(PREF_KEYS.map((p) => [p.key, p.default]))
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

//   const requestPush = async () => {
//     if (!("Notification" in window)) return;

//     if (Notification.permission === "granted") {
//       setPermissionGranted(true);
//       return;
//     }

//     const result = await Notification.requestPermission();
//     if (result === "granted") {
//       setPermissionGranted(true);
//       new Notification("MK2 Rivers Fitness 💪", {
//         body: "Notifications enabled!",
//         icon: "/favicon.ico",
//       });
//     }
//   };

//   if (!user) return null;

//   return (
//     <div
//       className={`max-w-[760px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Stay on top of classes, rewards and reminders">
//         Notification Settings
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

//       {/* Notification Preferences */}
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

//       {/* Back button */}
//       <div className="mt-8 text-center">
//         <Btn variant="ghost" onClick={() => setPage("Dashboard")}>
//           ← Back to Dashboard
//         </Btn>
//       </div>
//     </div>
//   );
// }
