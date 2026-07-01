import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  auth,
  fetchUser,
  saveUser,
  onAuthStateChanged,
  signOut as fbSignOut,
  db,
  ref,
  onValue,
} from "@/lib/firebase";

export interface MK2User {
  uid: string;
  email: string;
  name: string;
  goal: string;
  level: string;
  color: string;
  workouts: any[];
  bookings: any[];
  weights: any[];
  checkIns: any[];
  points: number;
  createdAt: number;
  membership: "basic" | "silver" | "gold";
  gender?: "male" | "female";
  termsAcceptedAt?: number;
  termsVersion?: string;
  classCredits: number;
  lastGoldTopUp?: string;
  aiCredits: Record<string, number>;
}

const normalizeUser = (data: any): MK2User => ({
  ...data,
  workouts: Array.isArray(data.workouts) ? data.workouts : [],
  bookings: Array.isArray(data.bookings) ? data.bookings : [],
  weights: Array.isArray(data.weights) ? data.weights : [],
  checkIns: Array.isArray(data.checkIns) ? data.checkIns : [],
  points: data.points ?? 0,
  createdAt: data.createdAt ?? Date.now(),
  membership: data.membership ?? "basic",
  classCredits: data.classCredits ?? 0,
  lastGoldTopUp: data.lastGoldTopUp ?? undefined,
  gender: data.gender ?? undefined,
});

interface ToastData {
  msg: string;
  type: string;
  onTap?: () => void;
}

interface AuthContextType {
  user: MK2User | null;
  booting: boolean;
  setUser: (user: MK2User | null) => void;
  updateUser: (user: MK2User) => Promise<void>;
  logout: () => Promise<void>;
  toast: (
    msg: string,
    type?: "success" | "error" | "info",
    onTap?: () => void,
  ) => void;
  toastData: ToastData | null;
  clearToast: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MK2User | null>(null);
  const [booting, setBooting] = useState(true);
  const [toastData, setToastData] = useState<ToastData | null>(null);

  // ── Auth state listener ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const data = await fetchUser(fbUser.uid);
        if (data) setUser(normalizeUser(data));
        else setUser(null);
      } else {
        setUser(null);
      }
      setBooting(false);
    });
    return () => unsub();
  }, []);

  // ── Real-time aiQuota listener ────────────────────────────────────────────
  // Keeps the quota display in sync across all AI screens without needing
  // a full user reload after each call. Patches only aiQuota on the user
  // object so nothing else is disrupted.
  useEffect(() => {
    if (!user?.uid) return;
    const quotaRef = ref(db, `mk2_users/${user.uid}/aiQuota`);
    const unsub = onValue(quotaRef, (snap) => {
      const aiQuota = snap.val();
      setUser((prev) => {
        if (!prev) return prev;
        // Only update if the value actually changed to avoid unnecessary renders
        const prevQuota = (prev as any).aiQuota;
        if (
          prevQuota?.used === aiQuota?.used &&
          prevQuota?.month === aiQuota?.month
        ) {
          return prev;
        }
        return { ...prev, aiQuota };
      });
    });
    return () => unsub();
  }, [user?.uid]);

  const updateUser = useCallback(async (u: MK2User) => {
    const normalized = normalizeUser(u);
    await saveUser(u.uid, normalized);
    setUser(normalized);
  }, []);

  const logout = useCallback(async () => {
    await fbSignOut(auth);
    setUser(null);
  }, []);

  const toast = useCallback(
    (msg: string, type: string = "info", onTap?: () => void) => {
      setToastData({ msg, type, onTap });
    },
    [],
  );

  const clearToast = useCallback(() => setToastData(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        booting,
        setUser,
        updateUser,
        logout,
        toast,
        toastData,
        clearToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// import {
//   createContext,
//   useContext,
//   useState,
//   useEffect,
//   useCallback,
//   type ReactNode,
// } from "react";
// import {
//   auth,
//   fetchUser,
//   saveUser,
//   onAuthStateChanged,
//   signOut as fbSignOut,
// } from "@/lib/firebase";

// export interface MK2User {
//   uid: string;
//   email: string;
//   name: string;
//   goal: string;
//   level: string;
//   color: string;
//   workouts: any[];
//   bookings: any[];
//   weights: any[];
//   checkIns: any[];
//   points: number;
//   createdAt: number;
//   membership: "basic" | "silver" | "gold";
//   gender?: "male" | "female";
//   termsAcceptedAt?: number;
//   termsVersion?: string;
//   classCredits: number;
//   lastGoldTopUp?: string;
//   aiCredits: Record<string, number>;
// }

// const normalizeUser = (data: any): MK2User => ({
//   ...data,
//   workouts: Array.isArray(data.workouts) ? data.workouts : [],
//   bookings: Array.isArray(data.bookings) ? data.bookings : [],
//   weights: Array.isArray(data.weights) ? data.weights : [],
//   checkIns: Array.isArray(data.checkIns) ? data.checkIns : [],
//   points: data.points ?? 0,
//   createdAt: data.createdAt ?? Date.now(),
//   membership: data.membership ?? "basic",
//   classCredits: data.classCredits ?? 0,
//   lastGoldTopUp: data.lastGoldTopUp ?? undefined,
//   gender: data.gender ?? undefined,
// });

// interface ToastData {
//   msg: string;
//   type: string;
//   onTap?: () => void;
// }

// interface AuthContextType {
//   user: MK2User | null;
//   booting: boolean;
//   setUser: (user: MK2User | null) => void;
//   updateUser: (user: MK2User) => Promise<void>;
//   logout: () => Promise<void>;
//   toast: (
//     msg: string,
//     type?: "success" | "error" | "info",
//     onTap?: () => void,
//   ) => void;
//   toastData: ToastData | null;
//   clearToast: () => void;
// }

// const AuthContext = createContext<AuthContextType | null>(null);

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<MK2User | null>(null);
//   const [booting, setBooting] = useState(true);
//   const [toastData, setToastData] = useState<ToastData | null>(null);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (fbUser) => {
//       if (fbUser) {
//         const data = await fetchUser(fbUser.uid);
//         if (data) setUser(normalizeUser(data));
//         else setUser(null);
//       } else {
//         setUser(null);
//       }
//       setBooting(false);
//     });
//     return () => unsub();
//   }, []);

//   const updateUser = useCallback(async (u: MK2User) => {
//     const normalized = normalizeUser(u);
//     await saveUser(u.uid, normalized);
//     setUser(normalized);
//   }, []);

//   const logout = useCallback(async () => {
//     await fbSignOut(auth);
//     setUser(null);
//   }, []);

//   const toast = useCallback(
//     (msg: string, type: string = "info", onTap?: () => void) => {
//       setToastData({ msg, type, onTap });
//     },
//     [],
//   );

//   const clearToast = useCallback(() => setToastData(null), []);

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         booting,
//         setUser,
//         updateUser,
//         logout,
//         toast,
//         toastData,
//         clearToast,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const ctx = useContext(AuthContext);
//   if (!ctx) throw new Error("useAuth must be used within AuthProvider");
//   return ctx;
// }
