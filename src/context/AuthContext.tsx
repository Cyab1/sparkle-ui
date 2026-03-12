import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { auth, fetchUser, saveUser, onAuthStateChanged, signOut as fbSignOut } from "@/lib/firebase";

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
}

interface AuthContextType {
  user: MK2User | null;
  booting: boolean;
  setUser: (user: MK2User | null) => void;
  updateUser: (user: MK2User) => Promise<void>;
  logout: () => Promise<void>;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
  toastData: { msg: string; type: string } | null;
  clearToast: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MK2User | null>(null);
  const [booting, setBooting] = useState(true);
  const [toastData, setToastData] = useState<{ msg: string; type: string } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const data = await fetchUser(fbUser.uid);
        if (data) setUser(data as MK2User);
        else setUser(null);
      } else {
        setUser(null);
      }
      setBooting(false);
    });
    return () => unsub();
  }, []);

  const updateUser = useCallback(async (u: MK2User) => {
    await saveUser(u.uid, u);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await fbSignOut(auth);
    setUser(null);
  }, []);

  const toast = useCallback((msg: string, type: string = "info") => {
    setToastData({ msg, type });
  }, []);

  const clearToast = useCallback(() => setToastData(null), []);

  return (
    <AuthContext.Provider value={{ user, booting, setUser, updateUser, logout, toast, toastData, clearToast }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
