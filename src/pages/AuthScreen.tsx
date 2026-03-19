import { useState } from "react";
import { useAuth, type MK2User } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import {
  auth,
  fetchUser,
  logEvent,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "@/lib/firebase";
import { saveUser } from "@/lib/firebase";
import { GOALS, LEVELS, ACCENT_COLORS } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

// MK2R CHANGE: Logo helper — falls back to text if image not found
// Place your logo file at /public/mk2r-logo.png (or .svg)
function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const heights: Record<string, number> = { sm: 36, md: 52, lg: 72 };
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <img
        src="/mk2r-logo.jpg"
        alt="MK2 Rivers Fitness"
        height={heights[size]}
        style={{ height: heights[size], width: "auto", objectFit: "contain" }}
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback text logo if image missing
  return (
    <div>
      <div
        className="font-display tracking-[0.2em] text-white leading-none"
        style={{ fontSize: heights[size] * 0.45 }}
      >
        MK2 RIVERS
      </div>
      <div
        className="text-[9px] tracking-[0.25em] uppercase"
        style={{ color: "hsl(187 100% 40%)" }}
      >
        FITNESS HUB
      </div>
    </div>
  );
}

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
      const normalized = {
        ...userData,
        workouts: Array.isArray((userData as any).workouts)
          ? (userData as any).workouts
          : [],
        bookings: Array.isArray((userData as any).bookings)
          ? (userData as any).bookings
          : [],
        weights: Array.isArray((userData as any).weights)
          ? (userData as any).weights
          : [],
        checkIns: Array.isArray((userData as any).checkIns)
          ? (userData as any).checkIns
          : [],
        points: (userData as any).points ?? 0,
      };
      setUser(normalized as MK2User);
      toast(`Welcome back, ${(userData as any).name}! 💪`, "success");
    } catch (e: any) {
      toast(
        e.code === "auth/invalid-credential"
          ? "Wrong email or password."
          : e.message,
        "error",
      );
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
        membership: "basic",
        createdAt: Date.now(),
      };
      await saveUser(uid, newUser);
      logEvent("sign_up", { method: "email" });
      setUser(newUser);
      toast(`Welcome to MK2, ${name}! 🔥`, "success");
    } catch (e: any) {
      toast(
        e.code === "auth/email-already-in-use"
          ? "Email already registered. Log in."
          : e.message,
        "error",
      );
    }
    setLoading(false);
  };

  const inp =
    "w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none font-body placeholder:text-white/30 focus:border-[#00C4CC]/60 focus:bg-black/60 transition-all duration-200";
  const lbl =
    "text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 block mb-1.5";

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-stretch"
      style={{ background: "#070707" }}
    >
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
            radial-gradient(ellipse 80% 60% at 20% 50%, hsl(20 100% 50% / 0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 30%, hsl(187 100% 40% / 0.10) 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 50% 90%, hsl(20 100% 50% / 0.06) 0%, transparent 50%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        <div
          className="absolute top-0 right-0 w-[55%] h-full opacity-[0.03]"
          style={{
            background:
              "linear-gradient(135deg, transparent 30%, hsl(187 100% 40%) 100%)",
          }}
        />
      </div>

      {/* Left hero panel — desktop only */}
      {!isMobile && (
        <div className="relative z-10 flex-1 flex flex-col justify-between p-12 max-w-[55%]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* MK2R CHANGE: real logo image, falls back to text */}
            <Logo size="md" />
          </motion.div>

          <div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div
                className="text-[11px] font-bold tracking-[0.3em] uppercase mb-4"
                style={{ color: "hsl(20 100% 50%)" }}
              >
                ★ ★ ★ &nbsp; RUIMSIG, JOHANNESBURG &nbsp; ★ ★ ★
              </div>
              <h1
                className="font-display leading-[0.9] mb-6"
                style={{ fontSize: "clamp(52px, 6vw, 88px)" }}
              >
                <span className="text-white block">TRAIN</span>
                <span className="block" style={{ color: "hsl(187 100% 40%)" }}>
                  HARDER.
                </span>
                <span className="text-white block">LIVE</span>
                <span className="block" style={{ color: "hsl(20 100% 50%)" }}>
                  STRONGER.
                </span>
              </h1>
              <p className="text-white/40 text-sm leading-relaxed max-w-[380px] font-body">
                Your transformation begins the moment you walk through our
                doors. Elite coaching, smart AI tools, and a community that
                pushes you further.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex gap-8 mt-10"
            >
              {[
                ["100+", "Members"],
                ["8", "Daily Classes"],
                ["10+", "Expert Coaches"],
              ].map(([val, label]) => (
                <div key={label}>
                  <div
                    className="font-display text-[28px] leading-none"
                    style={{ color: "hsl(20 100% 50%)" }}
                  >
                    {val}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-white/30 mt-1">
                    {label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-[10px] tracking-[0.2em] text-white/20 uppercase"
          >
            © 2026 MK2 Rivers Fitness · Ruimsig, Johannesburg
          </motion.div>
        </div>
      )}

      {/* Right form panel */}
      <div
        className={`relative z-10 flex items-center justify-center ${isMobile ? "w-full p-5" : "w-[45%] min-w-[420px] p-8"}`}
      >
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-[420px]"
        >
          {isMobile && (
            <div className="flex justify-center mb-8">
              {/* MK2R CHANGE: logo on mobile auth screen */}
              <Logo size="lg" />
            </div>
          )}

          <div
            className="rounded-2xl p-7 border"
            style={{
              background: "rgba(10,10,10,0.85)",
              borderColor: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
            }}
          >
            <div className="mb-6">
              <div className="font-display text-[22px] tracking-[0.1em] text-white mb-1">
                {mode === "login" ? "WELCOME BACK" : "JOIN THE GYM"}
              </div>
              <div className="text-[11px] text-white/30 tracking-wide">
                {mode === "login"
                  ? "Sign in to your member dashboard"
                  : "Create your MK2 Rivers account"}
              </div>
            </div>

            <div
              className="flex rounded-lg p-[3px] gap-[3px] mb-5"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex-1 py-2.5 rounded-md border-none cursor-pointer font-body font-bold text-[11px] uppercase tracking-[0.08em] transition-all duration-200"
                  style={{
                    background: mode === m ? "hsl(20 100% 50%)" : "transparent",
                    color: mode === m ? "#000" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {mode === "register" && (
                  <div className="mb-3">
                    <label className={lbl}>Full Name</label>
                    <input
                      className={inp}
                      placeholder="e.g. Mandisa Khumalo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}
                <div className="mb-3">
                  <label className={lbl}>Email Address</label>
                  <input
                    className={inp}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className={mode === "register" ? "mb-3" : "mb-5"}>
                  <label className={lbl}>Password</label>
                  <input
                    className={inp}
                    type="password"
                    placeholder={
                      mode === "register"
                        ? "Min. 6 characters"
                        : "Your password"
                    }
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && mode === "login" && login()
                    }
                  />
                </div>
                {mode === "register" && (
                  <div className="grid grid-cols-2 gap-2.5 mb-5">
                    <div>
                      <label className={lbl}>Your Goal</label>
                      <select
                        className={inp}
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                      >
                        {GOALS.map((g) => (
                          <option key={g} style={{ background: "#111" }}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Level</label>
                      <select
                        className={inp}
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                      >
                        {LEVELS.map((l) => (
                          <option key={l} style={{ background: "#111" }}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <button
                  onClick={mode === "login" ? login : register}
                  disabled={loading}
                  className="w-full py-3.5 rounded-lg font-body font-bold text-sm uppercase tracking-[0.1em] transition-all duration-200 border-none cursor-pointer"
                  style={{
                    background: loading
                      ? "rgba(255,82,0,0.5)"
                      : "hsl(20 100% 50%)",
                    color: "#000",
                    opacity: loading ? 0.7 : 1,
                    boxShadow: loading
                      ? "none"
                      : "0 4px 24px hsl(20 100% 50% / 0.4)",
                  }}
                >
                  {loading
                    ? "Please wait…"
                    : mode === "login"
                      ? "Sign In →"
                      : "Create Account →"}
                </button>
              </motion.div>
            </AnimatePresence>

            <div
              className="mt-4 flex items-center gap-2 text-[10px]"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              <div
                className="flex-1 h-px"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <span>🔒 SECURED BY FIREBASE</span>
              <div
                className="flex-1 h-px"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
            </div>
          </div>

          <div
            className="mt-4 rounded-lg py-2.5 px-4 flex items-center gap-2.5 text-xs font-body"
            style={{
              background: "hsl(187 100% 40% / 0.08)",
              border: "1px solid hsl(187 100% 40% / 0.2)",
              color: "hsl(187 100% 40%)",
            }}
          >
            <span>★★★★★</span>
            <span className="font-bold">MK2 Rivers Fitness</span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>
              · Ruimsig, Johannesburg
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// import { useState } from "react";
// import { useAuth, type MK2User } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { auth, fetchUser, logEvent, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "@/lib/firebase";
// import { saveUser } from "@/lib/firebase";
// import { GOALS, LEVELS, ACCENT_COLORS } from "@/lib/constants";
// import { Btn } from "@/components/shared/Btn";
// import { motion } from "framer-motion";

// export function AuthScreen() {
//   const { isMobile } = useBreakpoint();
//   const { setUser, toast } = useAuth();
//   const [mode, setMode] = useState<"login" | "register">("login");
//   const [email, setEmail] = useState("");
//   const [pw, setPw] = useState("");
//   const [name, setName] = useState("");
//   const [goal, setGoal] = useState(GOALS[0]);
//   const [level, setLevel] = useState(LEVELS[1]);
//   const [loading, setLoading] = useState(false);

//   const login = async () => {
//     if (!email || !pw) return toast("Fill in all fields", "error");
//     setLoading(true);
//     try {
//       const cred = await signInWithEmailAndPassword(auth, email.trim(), pw);
//       const userData = await fetchUser(cred.user.uid);
//       logEvent("login", { method: "email" });
//       setUser(userData as MK2User);
//       toast(`Welcome back, ${(userData as any).name}! 💪`, "success");
//     } catch (e: any) {
//       toast(e.code === "auth/invalid-credential" ? "Wrong email or password." : e.message, "error");
//     }
//     setLoading(false);
//   };

//   const register = async () => {
//     if (!email || !pw || !name) return toast("Fill in all fields", "error");
//     if (pw.length < 6) return toast("Password needs 6+ characters", "error");
//     setLoading(true);
//     try {
//       const cred = await createUserWithEmailAndPassword(auth, email.trim(), pw);
//       const uid = cred.user.uid;
//       const newUser: MK2User = {
//         uid,
//         email: email.toLowerCase().trim(),
//         name,
//         goal,
//         level,
//         color: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
//         workouts: [],
//         bookings: [],
//         weights: [],
//         checkIns: [],
//         points: 0,
//         createdAt: Date.now(),
//       };
//       await saveUser(uid, newUser);
//       logEvent("sign_up", { method: "email" });
//       setUser(newUser);
//       toast(`Welcome to MK2, ${name}! 🔥`, "success");
//     } catch (e: any) {
//       toast(e.code === "auth/email-already-in-use" ? "Email already registered. Log in." : e.message, "error");
//     }
//     setLoading(false);
//   };

//   return (
//     <div
//       className="min-h-screen bg-background flex items-center justify-center p-4"
//       style={{
//         backgroundImage:
//           "radial-gradient(ellipse at 15% 50%, hsl(20 100% 50% / 0.08) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, hsl(20 100% 50% / 0.05) 0%, transparent 50%)",
//       }}
//     >
//       <motion.div
//         initial={{ opacity: 0, y: 20, scale: 0.97 }}
//         animate={{ opacity: 1, y: 0, scale: 1 }}
//         transition={{ duration: 0.5, ease: "easeOut" }}
//         className={`w-full max-w-[420px] bg-card border border-border rounded-2xl shadow-elevated ${
//           isMobile ? "px-5 py-7" : "px-9 py-10"
//         }`}
//       >
//         <div className="font-display text-[28px] tracking-[0.15em] text-primary mb-0.5">MK2 RIVERS</div>
//         <div className="text-[11px] text-muted-foreground mb-6 tracking-[0.08em]">
//           FITNESS HUB · {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
//         </div>

//         {/* Mode toggle */}
//         <div className="flex bg-secondary rounded-lg p-0.5 gap-0.5 mb-5">
//           {(["login", "register"] as const).map((m) => (
//             <button
//               key={m}
//               onClick={() => setMode(m)}
//               className={`flex-1 py-2.5 border-none rounded-md cursor-pointer font-body font-bold text-[11px] uppercase tracking-[0.06em] transition-all duration-150 ${
//                 mode === m ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground"
//               }`}
//             >
//               {m}
//             </button>
//           ))}
//         </div>

//         {mode === "register" && (
//           <>
//             <label className="mk2-label">Full Name</label>
//             <input className="mk2-input mb-3" placeholder="e.g. Mandisa Khumalo" value={name} onChange={(e) => setName(e.target.value)} />
//           </>
//         )}

//         <label className="mk2-label">Email</label>
//         <input className="mk2-input mb-3" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

//         <label className="mk2-label">Password</label>
//         <input
//           className={`mk2-input ${mode === "register" ? "mb-3" : "mb-5"}`}
//           type="password"
//           placeholder={mode === "register" ? "Min. 6 characters" : "Your password"}
//           value={pw}
//           onChange={(e) => setPw(e.target.value)}
//           onKeyDown={(e) => e.key === "Enter" && mode === "login" && login()}
//         />

//         {mode === "register" && (
//           <div className="grid grid-cols-2 gap-2.5 mb-5">
//             <div>
//               <label className="mk2-label">Goal</label>
//               <select className="mk2-select" value={goal} onChange={(e) => setGoal(e.target.value)}>
//                 {GOALS.map((g) => (
//                   <option key={g}>{g}</option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <label className="mk2-label">Level</label>
//               <select className="mk2-select" value={level} onChange={(e) => setLevel(e.target.value)}>
//                 {LEVELS.map((l) => (
//                   <option key={l}>{l}</option>
//                 ))}
//               </select>
//             </div>
//           </div>
//         )}

//         <Btn variant="primary" size="lg" onClick={mode === "login" ? login : register} disabled={loading} full>
//           {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
//         </Btn>

//         <div className="mt-4 p-3.5 bg-secondary rounded-lg text-[11px] text-muted-foreground flex items-center gap-2">
//           <span className="text-base">🔒</span>
//           <span>
//             Secured by <strong className="text-foreground">Firebase Auth + Firestore</strong> — your data is encrypted and stored in the cloud
//           </span>
//         </div>
//       </motion.div>
//     </div>
//   );
// }
