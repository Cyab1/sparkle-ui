import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { ref, set } from "firebase/database";
import { db } from "@/lib/firebase";

const STEPS = [
  { id: "welcome", title: "Welcome to MK Two Rivers! 🔥" },
  { id: "goals", title: "What brings you here?" },
  { id: "features", title: "Here's what you can do" },
  { id: "done", title: "You're all set! 💪" },
];

// ── Combat removed ────────────────────────────────────────────────────────────
const QUICK_GOALS = [
  { emoji: "💪", label: "Build Muscle" },
  { emoji: "🏃", label: "Lose Weight" },
  { emoji: "❤️", label: "Improve Fitness" },
  { emoji: "🏋️", label: "Olympic Lifting" },
  { emoji: "🤸", label: "Gymnastics & Skills" },
  { emoji: "🏆", label: "Compete & Perform" },
];

const FEATURES = [
  {
    icon: "📅",
    title: "Book Classes",
    desc: "Browse and book any of our daily classes",
  },
  {
    icon: "✅",
    title: "Check In",
    desc: "Check in at the gym to earn loyalty points",
  },
  {
    icon: "🏆",
    title: "PR Logbook",
    desc: "Track your personal records (Silver+)",
  },
  {
    icon: "🤖",
    title: "AI Tools",
    desc: "Workout planner, nutrition & body analysis (Gold)",
  },
  {
    icon: "👥",
    title: "Community",
    desc: "Connect with fellow members (Silver+)",
  },
  {
    icon: "📊",
    title: "Progress Tracking",
    desc: "Log weights and track your journey (Gold)",
  },
];

interface OnboardingProps {
  onDone: () => void;
  setPage: (page: string) => void;
}

export function Onboarding({ onDone, setPage }: OnboardingProps) {
  const { user, setUser } = useAuth();
  const { isMobile } = useBreakpoint();
  const [step, setStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const markOnboardingDone = async () => {
    try {
      await set(ref(db, `mk2_users/${user.uid}/onboardingDone`), true);
      setUser({ ...user, onboardingDone: true } as any);
    } catch {
      // non-blocking
    }
  };

  const toggleGoal = (label: string) => {
    setSelectedGoals((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
    );
  };

  const next = async () => {
    if (step === STEPS.length - 1) {
      setSaving(true);
      await markOnboardingDone();
      setSaving(false);
      onDone();
      return;
    }
    setStep((s) => s + 1);
  };

  const skip = async () => {
    await markOnboardingDone();
    onDone();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "hsl(var(--background))",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "20px 16px" : "40px 24px",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `radial-gradient(ellipse 70% 50% at 50% 0%, hsl(20 100% 50% / 0.06) 0%, transparent 60%)`,
        }}
      />

      {/* Step dots */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
        }}
      >
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === step ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background:
                i === step
                  ? "hsl(20 100% 50%)"
                  : i < step
                    ? "hsl(20 100% 50% / 0.4)"
                    : "hsl(var(--border))",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>

      {/* Skip button */}
      {step < STEPS.length - 1 && (
        <button
          onClick={skip}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: "hsl(var(--muted-foreground))",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
          }}
        >
          Skip →
        </button>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 480,
          position: "relative",
          zIndex: 1,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* Step 0 — Welcome */}
            {step === 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 72, marginBottom: 16 }}>🏋️</div>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: isMobile ? 28 : 36,
                    letterSpacing: "0.05em",
                    color: "hsl(var(--foreground))",
                    marginBottom: 12,
                    lineHeight: 1.1,
                  }}
                >
                  WELCOME,
                  <br />
                  <span style={{ color: "hsl(20 100% 50%)" }}>
                    {user.name.split(" ")[0].toUpperCase()}!
                  </span>
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: "hsl(var(--muted-foreground))",
                    lineHeight: 1.7,
                    maxWidth: 360,
                    margin: "0 auto 24px",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  You've just joined MK Two Rivers Fitness — Ruimsig's home of
                  elite coaching, smart training tools, and a community that
                  pushes you further. Let's get you set up in 30 seconds.
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 20,
                    flexWrap: "wrap",
                    marginBottom: 32,
                  }}
                >
                  {[
                    ["100+", "Members"],
                    ["8", "Classes/Day"],
                    ["10+", "Coaches"],
                  ].map(([val, label]) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 24,
                          color: "hsl(20 100% 50%)",
                        }}
                      >
                        {val}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "hsl(var(--muted-foreground))",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1 — Goals */}
            {step === 1 && (
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: isMobile ? 22 : 28,
                    color: "hsl(var(--foreground))",
                    marginBottom: 6,
                    textAlign: "center",
                  }}
                >
                  WHAT BRINGS YOU HERE?
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "hsl(var(--muted-foreground))",
                    textAlign: "center",
                    marginBottom: 20,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Select all that apply — we'll personalise your experience.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
                    gap: 10,
                    marginBottom: 24,
                  }}
                >
                  {QUICK_GOALS.map((g) => {
                    const selected = selectedGoals.includes(g.label);
                    return (
                      <button
                        key={g.label}
                        onClick={() => toggleGoal(g.label)}
                        style={{
                          padding: "14px 12px",
                          borderRadius: 12,
                          cursor: "pointer",
                          fontFamily: "var(--font-body)",
                          fontWeight: 700,
                          fontSize: 13,
                          textAlign: "center",
                          transition: "all 0.15s",
                          background: selected
                            ? "hsl(20 100% 50% / 0.15)"
                            : "hsl(var(--secondary))",
                          border: `2px solid ${selected ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
                          color: selected
                            ? "hsl(20 100% 50%)"
                            : "hsl(var(--foreground))",
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 6 }}>
                          {g.emoji}
                        </div>
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2 — Features */}
            {step === 2 && (
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: isMobile ? 22 : 28,
                    color: "hsl(var(--foreground))",
                    marginBottom: 6,
                    textAlign: "center",
                  }}
                >
                  HERE'S WHAT YOU CAN DO
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "hsl(var(--muted-foreground))",
                    textAlign: "center",
                    marginBottom: 20,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  The more you engage, the more you unlock.
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    marginBottom: 24,
                  }}
                >
                  {FEATURES.map((f, i) => (
                    <motion.div
                      key={f.title}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "12px 16px",
                        borderRadius: 12,
                        background: "hsl(var(--secondary))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    >
                      <span style={{ fontSize: 24, flexShrink: 0 }}>
                        {f.icon}
                      </span>
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: "hsl(var(--foreground))",
                          }}
                        >
                          {f.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "hsl(var(--muted-foreground))",
                            marginTop: 2,
                          }}
                        >
                          {f.desc}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3 — Done */}
            {step === 3 && (
              <div style={{ textAlign: "center" }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  style={{ fontSize: 80, marginBottom: 16 }}
                >
                  🎉
                </motion.div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: isMobile ? 26 : 32,
                    color: "hsl(var(--foreground))",
                    marginBottom: 12,
                  }}
                >
                  YOU'RE ALL SET!
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "hsl(var(--muted-foreground))",
                    lineHeight: 1.7,
                    maxWidth: 340,
                    margin: "0 auto 20px",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Your MK Two Rivers account is ready. Start by booking a class
                  or checking in at the gym to earn your first loyalty points!
                </p>

                {/* ── Membership preview ──────────────────────────────────── */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    maxWidth: 340,
                    margin: "0 auto 20px",
                  }}
                >
                  {[
                    {
                      tier: "Silver",
                      monthly: "R24",
                      annual: "R288/yr",
                      color: "hsl(var(--muted-foreground))",
                      bg: "hsl(var(--secondary))",
                      border: "hsl(var(--border))",
                    },
                    {
                      tier: "Gold",
                      monthly: "R49",
                      annual: "R588/yr",
                      color: "hsl(38 92% 44%)",
                      bg: "hsl(38 92% 44% / 0.1)",
                      border: "hsl(38 92% 44% / 0.4)",
                    },
                  ].map((plan) => (
                    <div
                      key={plan.tier}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: plan.bg,
                        border: `1px solid ${plan.border}`,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: plan.color,
                          marginBottom: 4,
                        }}
                      >
                        {plan.tier}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 22,
                          color: plan.color,
                          lineHeight: 1,
                        }}
                      >
                        {plan.monthly}
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          /mo
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "hsl(var(--muted-foreground))",
                          marginTop: 2,
                        }}
                      >
                        {plan.annual}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    maxWidth: 300,
                    margin: "0 auto 24px",
                  }}
                >
                  <button
                    onClick={async () => {
                      await markOnboardingDone();
                      onDone();
                      setPage("Classes");
                    }}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 12,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontWeight: 700,
                      fontSize: 14,
                      background: "hsl(20 100% 50%)",
                      color: "#000",
                      boxShadow: "0 4px 20px hsl(20 100% 50% / 0.35)",
                    }}
                  >
                    📅 Browse Classes
                  </button>
                  <button
                    onClick={async () => {
                      await markOnboardingDone();
                      onDone();
                      setPage("Membership");
                    }}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 12,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontWeight: 700,
                      fontSize: 14,
                      background: "hsl(var(--secondary))",
                      border: "1px solid hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    ⚡ View Membership Plans
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Next button — steps 0, 1, 2 */}
        {step < STEPS.length - 1 && (
          <button
            onClick={next}
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              background: "hsl(20 100% 50%)",
              color: "#000",
              boxShadow: "0 4px 20px hsl(20 100% 50% / 0.35)",
              transition: "all 0.2s",
            }}
          >
            {step === 0
              ? "Let's Go →"
              : step === STEPS.length - 2
                ? "I'm Ready! →"
                : "Next →"}
          </button>
        )}

        {/* Go to Dashboard — final step */}
        {step === STEPS.length - 1 && (
          <button
            onClick={next}
            disabled={saving}
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: 12,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              background: "hsl(20 100% 50%)",
              color: "#000",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Setting up…" : "Go to Dashboard →"}
          </button>
        )}
      </div>
    </div>
  );
}


// import { useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { saveUser } from "@/lib/firebase";
// import { motion, AnimatePresence } from "framer-motion";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { ref, set } from "firebase/database";
// import { db } from "@/lib/firebase";

// const STEPS = [
//   { id: "welcome", title: "Welcome to MK Two Rivers! 🔥" },
//   { id: "goals", title: "What brings you here?" },
//   { id: "features", title: "Here's what you can do" },
//   { id: "done", title: "You're all set! 💪" },
// ];

// const QUICK_GOALS = [
//   { emoji: "💪", label: "Build Muscle" },
//   { emoji: "🏃", label: "Lose Weight" },
//   { emoji: "❤️", label: "Improve Fitness" },
//   { emoji: "🥊", label: "Learn Combat" },
//   { emoji: "🧘", label: "Flexibility & Recovery" },
//   { emoji: "🏆", label: "Compete & Perform" },
// ];

// const FEATURES = [
//   {
//     icon: "📅",
//     title: "Book Classes",
//     desc: "Browse and book any of our daily classes",
//   },
//   {
//     icon: "✅",
//     title: "Check In",
//     desc: "Check in at the gym to earn loyalty points",
//   },
//   {
//     icon: "🏆",
//     title: "PR Logbook",
//     desc: "Track your personal records (Silver+)",
//   },
//   {
//     icon: "🤖",
//     title: "AI Tools",
//     desc: "Workout planner, nutrition & body analysis (Gold)",
//   },
//   {
//     icon: "👥",
//     title: "Community",
//     desc: "Connect with fellow members (Silver+)",
//   },
//   {
//     icon: "📊",
//     title: "Progress Tracking",
//     desc: "Log weights and track your journey (Gold)",
//   },
// ];

// interface OnboardingProps {
//   onDone: () => void;
//   setPage: (page: string) => void;
// }

// export function Onboarding({ onDone, setPage }: OnboardingProps) {
//   const { user, setUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [step, setStep] = useState(0);
//   const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
//   const [saving, setSaving] = useState(false);

//   if (!user) return null;

//   const toggleGoal = (label: string) => {
//     setSelectedGoals((prev) =>
//       prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
//     );
//   };

//   const next = async () => {
//     if (step === STEPS.length - 1) {
//       // Mark onboarding complete in Firebase
//       setSaving(true);
//       try {
//         const updated = { ...user, onboardingDone: true };
//         await saveUser(user.uid, updated);
//         setUser(updated as any);
//       } catch {
//         /* non-blocking */
//       }
//       setSaving(false);
//       onDone();
//       return;
//     }
//     setStep((s) => s + 1);
//   };

//   const skip = () => {
//     onDone();
//   };

//   return (
//     <div
//       style={{
//         position: "fixed",
//         inset: 0,
//         zIndex: 9998,
//         background: "hsl(var(--background))",
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: isMobile ? "20px 16px" : "40px 24px",
//       }}
//     >
//       {/* Background glow */}
//       <div
//         style={{
//           position: "absolute",
//           inset: 0,
//           pointerEvents: "none",
//           backgroundImage: `radial-gradient(ellipse 70% 50% at 50% 0%, hsl(20 100% 50% / 0.06) 0%, transparent 60%)`,
//         }}
//       />

//       {/* Step dots */}
//       <div
//         style={{
//           position: "absolute",
//           top: 24,
//           left: "50%",
//           transform: "translateX(-50%)",
//           display: "flex",
//           gap: 8,
//         }}
//       >
//         {STEPS.map((_, i) => (
//           <div
//             key={i}
//             style={{
//               width: i === step ? 24 : 8,
//               height: 8,
//               borderRadius: 4,
//               background:
//                 i === step
//                   ? "hsl(20 100% 50%)"
//                   : i < step
//                     ? "hsl(20 100% 50% / 0.4)"
//                     : "hsl(var(--border))",
//               transition: "all 0.3s",
//             }}
//           />
//         ))}
//       </div>

//       {/* Skip button */}
//       {step < STEPS.length - 1 && (
//         <button
//           onClick={skip}
//           style={{
//             position: "absolute",
//             top: 20,
//             right: 20,
//             background: "transparent",
//             border: "none",
//             cursor: "pointer",
//             fontSize: 12,
//             color: "hsl(var(--muted-foreground))",
//             fontFamily: "var(--font-body)",
//             fontWeight: 600,
//           }}
//         >
//           Skip →
//         </button>
//       )}

//       <div
//         style={{
//           width: "100%",
//           maxWidth: 480,
//           position: "relative",
//           zIndex: 1,
//         }}
//       >
//         <AnimatePresence mode="wait">
//           <motion.div
//             key={step}
//             initial={{ opacity: 0, x: 30 }}
//             animate={{ opacity: 1, x: 0 }}
//             exit={{ opacity: 0, x: -30 }}
//             transition={{ duration: 0.25 }}
//           >
//             {/* Step 0 — Welcome */}
//             {step === 0 && (
//               <div style={{ textAlign: "center" }}>
//                 <div style={{ fontSize: 72, marginBottom: 16 }}>🏋️</div>
//                 <h1
//                   style={{
//                     fontFamily: "var(--font-display)",
//                     fontSize: isMobile ? 28 : 36,
//                     letterSpacing: "0.05em",
//                     color: "hsl(var(--foreground))",
//                     marginBottom: 12,
//                     lineHeight: 1.1,
//                   }}
//                 >
//                   WELCOME,
//                   <br />
//                   <span style={{ color: "hsl(20 100% 50%)" }}>
//                     {user.name.split(" ")[0].toUpperCase()}!
//                   </span>
//                 </h1>
//                 <p
//                   style={{
//                     fontSize: 14,
//                     color: "hsl(var(--muted-foreground))",
//                     lineHeight: 1.7,
//                     maxWidth: 360,
//                     margin: "0 auto 24px",
//                     fontFamily: "var(--font-body)",
//                   }}
//                 >
//                   You've just joined MK Two Rivers Fitness — Ruimsig's home of
//                   elite coaching, smart training tools, and a community that
//                   pushes you further. Let's get you set up in 30 seconds.
//                 </p>
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "center",
//                     gap: 20,
//                     flexWrap: "wrap",
//                     marginBottom: 32,
//                   }}
//                 >
//                   {[
//                     ["100+", "Members"],
//                     ["8", "Classes/Day"],
//                     ["10+", "Coaches"],
//                   ].map(([val, label]) => (
//                     <div key={label} style={{ textAlign: "center" }}>
//                       <div
//                         style={{
//                           fontFamily: "var(--font-display)",
//                           fontSize: 24,
//                           color: "hsl(20 100% 50%)",
//                         }}
//                       >
//                         {val}
//                       </div>
//                       <div
//                         style={{
//                           fontSize: 10,
//                           color: "hsl(var(--muted-foreground))",
//                           textTransform: "uppercase",
//                           letterSpacing: "0.1em",
//                         }}
//                       >
//                         {label}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Step 1 — Goals */}
//             {step === 1 && (
//               <div>
//                 <h2
//                   style={{
//                     fontFamily: "var(--font-display)",
//                     fontSize: isMobile ? 22 : 28,
//                     color: "hsl(var(--foreground))",
//                     marginBottom: 6,
//                     textAlign: "center",
//                   }}
//                 >
//                   WHAT BRINGS YOU HERE?
//                 </h2>
//                 <p
//                   style={{
//                     fontSize: 13,
//                     color: "hsl(var(--muted-foreground))",
//                     textAlign: "center",
//                     marginBottom: 20,
//                     fontFamily: "var(--font-body)",
//                   }}
//                 >
//                   Select all that apply — we'll personalise your experience.
//                 </p>
//                 <div
//                   style={{
//                     display: "grid",
//                     gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
//                     gap: 10,
//                     marginBottom: 24,
//                   }}
//                 >
//                   {QUICK_GOALS.map((g) => {
//                     const selected = selectedGoals.includes(g.label);
//                     return (
//                       <button
//                         key={g.label}
//                         onClick={() => toggleGoal(g.label)}
//                         style={{
//                           padding: "14px 12px",
//                           borderRadius: 12,
//                           cursor: "pointer",
//                           fontFamily: "var(--font-body)",
//                           fontWeight: 700,
//                           fontSize: 13,
//                           textAlign: "center",
//                           transition: "all 0.15s",
//                           background: selected
//                             ? "hsl(20 100% 50% / 0.15)"
//                             : "hsl(var(--secondary))",
//                           border: `2px solid ${selected ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
//                           color: selected
//                             ? "hsl(20 100% 50%)"
//                             : "hsl(var(--foreground))",
//                         }}
//                       >
//                         <div style={{ fontSize: 24, marginBottom: 6 }}>
//                           {g.emoji}
//                         </div>
//                         {g.label}
//                       </button>
//                     );
//                   })}
//                 </div>
//               </div>
//             )}

//             {/* Step 2 — Features */}
//             {step === 2 && (
//               <div>
//                 <h2
//                   style={{
//                     fontFamily: "var(--font-display)",
//                     fontSize: isMobile ? 22 : 28,
//                     color: "hsl(var(--foreground))",
//                     marginBottom: 6,
//                     textAlign: "center",
//                   }}
//                 >
//                   HERE'S WHAT YOU CAN DO
//                 </h2>
//                 <p
//                   style={{
//                     fontSize: 13,
//                     color: "hsl(var(--muted-foreground))",
//                     textAlign: "center",
//                     marginBottom: 20,
//                     fontFamily: "var(--font-body)",
//                   }}
//                 >
//                   The more you engage, the more you unlock.
//                 </p>
//                 <div
//                   style={{
//                     display: "flex",
//                     flexDirection: "column",
//                     gap: 10,
//                     marginBottom: 24,
//                   }}
//                 >
//                   {FEATURES.map((f, i) => (
//                     <motion.div
//                       key={f.title}
//                       initial={{ opacity: 0, x: -10 }}
//                       animate={{ opacity: 1, x: 0 }}
//                       transition={{ delay: i * 0.06 }}
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: 14,
//                         padding: "12px 16px",
//                         borderRadius: 12,
//                         background: "hsl(var(--secondary))",
//                         border: "1px solid hsl(var(--border))",
//                       }}
//                     >
//                       <span style={{ fontSize: 24, flexShrink: 0 }}>
//                         {f.icon}
//                       </span>
//                       <div>
//                         <div
//                           style={{
//                             fontWeight: 700,
//                             fontSize: 13,
//                             color: "hsl(var(--foreground))",
//                           }}
//                         >
//                           {f.title}
//                         </div>
//                         <div
//                           style={{
//                             fontSize: 11,
//                             color: "hsl(var(--muted-foreground))",
//                             marginTop: 2,
//                           }}
//                         >
//                           {f.desc}
//                         </div>
//                       </div>
//                     </motion.div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Step 3 — Done */}
//             {step === 3 && (
//               <div style={{ textAlign: "center" }}>
//                 <motion.div
//                   initial={{ scale: 0 }}
//                   animate={{ scale: 1 }}
//                   transition={{ type: "spring", stiffness: 200, damping: 12 }}
//                   style={{ fontSize: 80, marginBottom: 16 }}
//                 >
//                   🎉
//                 </motion.div>
//                 <h2
//                   style={{
//                     fontFamily: "var(--font-display)",
//                     fontSize: isMobile ? 26 : 32,
//                     color: "hsl(var(--foreground))",
//                     marginBottom: 12,
//                   }}
//                 >
//                   YOU'RE ALL SET!
//                 </h2>
//                 <p
//                   style={{
//                     fontSize: 14,
//                     color: "hsl(var(--muted-foreground))",
//                     lineHeight: 1.7,
//                     maxWidth: 340,
//                     margin: "0 auto 20px",
//                     fontFamily: "var(--font-body)",
//                   }}
//                 >
//                   Your MK Two Rivers account is ready. Start by booking a class
//                   or checking in at the gym to earn your first loyalty points!
//                 </p>
//                 <div
//                   style={{
//                     display: "flex",
//                     flexDirection: "column",
//                     gap: 10,
//                     maxWidth: 300,
//                     margin: "0 auto 24px",
//                   }}
//                 >
//                   <button
//                     onClick={() => {
//                       onDone();
//                       setPage("Classes");
//                     }}
//                     style={{
//                       padding: "12px 24px",
//                       borderRadius: 12,
//                       border: "none",
//                       cursor: "pointer",
//                       fontFamily: "var(--font-body)",
//                       fontWeight: 700,
//                       fontSize: 14,
//                       background: "hsl(20 100% 50%)",
//                       color: "#000",
//                       boxShadow: "0 4px 20px hsl(20 100% 50% / 0.35)",
//                     }}
//                   >
//                     📅 Browse Classes
//                   </button>
//                   <button
//                     onClick={() => {
//                       onDone();
//                       setPage("Membership");
//                     }}
//                     style={{
//                       padding: "12px 24px",
//                       borderRadius: 12,
//                       cursor: "pointer",
//                       fontFamily: "var(--font-body)",
//                       fontWeight: 700,
//                       fontSize: 14,
//                       background: "hsl(var(--secondary))",
//                       border: "1px solid hsl(var(--border))",
//                       color: "hsl(var(--foreground))",
//                     }}
//                   >
//                     ⚡ View Membership Plans
//                   </button>
//                 </div>
//               </div>
//             )}
//           </motion.div>
//         </AnimatePresence>

//         {/* Next button */}
//         {step < STEPS.length - 1 && (
//           <button
//             onClick={next}
//             style={{
//               width: "100%",
//               padding: "14px 24px",
//               borderRadius: 12,
//               border: "none",
//               cursor: "pointer",
//               fontFamily: "var(--font-body)",
//               fontWeight: 700,
//               fontSize: 14,
//               textTransform: "uppercase",
//               letterSpacing: "0.08em",
//               background: "hsl(20 100% 50%)",
//               color: "#000",
//               boxShadow: "0 4px 20px hsl(20 100% 50% / 0.35)",
//               transition: "all 0.2s",
//             }}
//           >
//             {step === 0
//               ? "Let's Go →"
//               : step === STEPS.length - 2
//                 ? "I'm Ready! →"
//                 : "Next →"}
//           </button>
//         )}

//         {step === STEPS.length - 1 && (
//           <button
//             onClick={next}
//             disabled={saving}
//             style={{
//               width: "100%",
//               padding: "14px 24px",
//               borderRadius: 12,
//               border: "none",
//               cursor: "pointer",
//               fontFamily: "var(--font-body)",
//               fontWeight: 700,
//               fontSize: 14,
//               textTransform: "uppercase",
//               letterSpacing: "0.08em",
//               background: "hsl(20 100% 50%)",
//               color: "#000",
//               opacity: saving ? 0.7 : 1,
//             }}
//           >
//             {saving ? "Setting up…" : "Go to Dashboard →"}
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }
