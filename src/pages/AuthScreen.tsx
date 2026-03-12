import { useState } from "react";
import { useAuth, type MK2User } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { auth, fetchUser, logEvent, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "@/lib/firebase";
import { saveUser } from "@/lib/firebase";
import { GOALS, LEVELS, ACCENT_COLORS } from "@/lib/constants";
import { Btn } from "@/components/shared/Btn";
import { motion } from "framer-motion";

export function AuthScreen() {
  const { isMobile } = useBreakpoint();
  const { setUser, toast } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [level, setLevel] = useState(LEVELS[1]);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !pw) return toast("Fill in all fields", "error");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pw);
      const userData = await fetchUser(cred.user.uid);
      logEvent("login", { method: "email" });
      setUser(userData as MK2User);
      toast(`Welcome back, ${(userData as any).name}! 💪`, "success");
    } catch (e: any) {
      toast(e.code === "auth/invalid-credential" ? "Wrong email or password." : e.message, "error");
    }
    setLoading(false);
  };

  const register = async () => {
    if (!email || !pw || !name) return toast("Fill in all fields", "error");
    if (pw.length < 6) return toast("Password needs 6+ characters", "error");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pw);
      const uid = cred.user.uid;
      const newUser: MK2User = {
        uid,
        email: email.toLowerCase().trim(),
        name,
        goal,
        level,
        color: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
        workouts: [],
        bookings: [],
        weights: [],
        checkIns: [],
        points: 0,
        createdAt: Date.now(),
      };
      await saveUser(uid, newUser);
      logEvent("sign_up", { method: "email" });
      setUser(newUser);
      toast(`Welcome to MK2, ${name}! 🔥`, "success");
    } catch (e: any) {
      toast(e.code === "auth/email-already-in-use" ? "Email already registered. Log in." : e.message, "error");
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 15% 50%, hsl(20 100% 50% / 0.08) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, hsl(20 100% 50% / 0.05) 0%, transparent 50%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`w-full max-w-[420px] bg-card border border-border rounded-2xl shadow-elevated ${
          isMobile ? "px-5 py-7" : "px-9 py-10"
        }`}
      >
        <div className="font-display text-[28px] tracking-[0.15em] text-primary mb-0.5">MK2 RIVERS</div>
        <div className="text-[11px] text-muted-foreground mb-6 tracking-[0.08em]">
          FITNESS HUB · {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
        </div>

        {/* Mode toggle */}
        <div className="flex bg-secondary rounded-lg p-0.5 gap-0.5 mb-5">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 border-none rounded-md cursor-pointer font-body font-bold text-[11px] uppercase tracking-[0.06em] transition-all duration-150 ${
                mode === m ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === "register" && (
          <>
            <label className="mk2-label">Full Name</label>
            <input className="mk2-input mb-3" placeholder="e.g. Mandisa Khumalo" value={name} onChange={(e) => setName(e.target.value)} />
          </>
        )}

        <label className="mk2-label">Email</label>
        <input className="mk2-input mb-3" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="mk2-label">Password</label>
        <input
          className={`mk2-input ${mode === "register" ? "mb-3" : "mb-5"}`}
          type="password"
          placeholder={mode === "register" ? "Min. 6 characters" : "Your password"}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && mode === "login" && login()}
        />

        {mode === "register" && (
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div>
              <label className="mk2-label">Goal</label>
              <select className="mk2-select" value={goal} onChange={(e) => setGoal(e.target.value)}>
                {GOALS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mk2-label">Level</label>
              <select className="mk2-select" value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <Btn variant="primary" size="lg" onClick={mode === "login" ? login : register} disabled={loading} full>
          {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
        </Btn>

        <div className="mt-4 p-3.5 bg-secondary rounded-lg text-[11px] text-muted-foreground flex items-center gap-2">
          <span className="text-base">🔒</span>
          <span>
            Secured by <strong className="text-foreground">Firebase Auth + Firestore</strong> — your data is encrypted and stored in the cloud
          </span>
        </div>
      </motion.div>
    </div>
  );
}
