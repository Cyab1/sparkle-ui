import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent } from "@/lib/firebase";
import { askClaude } from "@/services/api";
import { Btn } from "@/components/shared/Btn";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";

// ── Credit cap config ─────────────────────────────────────────────────────────
const MONTHLY_CREDIT_LIMIT = 10;

const FOCUS_OPTIONS = [
  "Full Body",
  "Upper Body",
  "Lower Body",
  "Core & Abs",
  "Cardio & HIIT",
  "Strength",
  "Mobility",
  "Push",
  "Pull",
  "Legs",
];

const EQUIPMENT_OPTIONS = [
  "Full Gym",
  "Dumbbells Only",
  "Bodyweight",
  "Resistance Bands",
  "Barbells & Racks",
];

const DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

// ── Helpers ───────────────────────────────────────────────────────────────────
const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
};

const getCreditsUsed = (user: any): number => {
  const key = currentMonthKey();
  return user?.aiCredits?.[key] ?? 0;
};

export function WorkoutPlanner() {
  const { user, updateUser, toast } = useAuth();
  const { isMobile } = useBreakpoint();

  // ── Multi-select focus ────────────────────────────────────────────────────
  const [selectedFocus, setSelectedFocus] = useState<string[]>(["Full Body"]);
  const [days, setDays] = useState(3);
  const [dur, setDur] = useState("45");
  const [equip, setEquip] = useState("Full Gym");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const creditsUsed = getCreditsUsed(user);
  const creditsLeft = MONTHLY_CREDIT_LIMIT - creditsUsed;
  const outOfCredits = creditsLeft <= 0;

  // ── Toggle focus selection ────────────────────────────────────────────────
  const toggleFocus = (f: string) => {
    setSelectedFocus((prev) =>
      prev.includes(f)
        ? prev.length > 1
          ? prev.filter((x) => x !== f)
          : prev
        : [...prev, f],
    );
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = async () => {
    if (outOfCredits) {
      toast(
        `Monthly limit reached (${MONTHLY_CREDIT_LIMIT} plans). Resets next month.`,
        "error",
      );
      return;
    }

    setLoading(true);
    setResult("");
    logEvent("generate_workout", {
      focus: selectedFocus.join(", "),
      duration: dur,
      days,
    });

    // Deduct credit immediately
    const key = currentMonthKey();
    const newCredits = {
      ...((user as any).aiCredits || {}),
      [key]: creditsUsed + 1,
    };
    await updateUser({ ...user, aiCredits: newCredits } as any);

    const focusLabel = selectedFocus.join(" + ");
    const prompt =
      days === 1
        ? `${dur}-min ${focusLabel} single session for ${user.level}, goal: "${user.goal}". Equipment: ${equip}.`
        : `${days}-day weekly plan, each session ${dur} min. Focus areas: ${focusLabel}. Level: ${user.level}, Goal: "${user.goal}". Equipment: ${equip}. Label each day clearly (Day 1, Day 2…). Include warm-up, main workout, cool-down and trainer notes for each day.`;

    await askClaude(
      `You are an expert personal trainer at MK2 Rivers Fitness. Create detailed structured workout plans.\nFormat per session:\nWARM-UP (5 min):\n• [3 exercises]\n\nMAIN WORKOUT:\n1. [Exercise] — [sets]×[reps] | Rest: [time]\n\nCOOL-DOWN:\n• [3 stretches]\n\nTRAINER NOTES:\n• [2 tips]`,
      prompt,
      setResult,
    );

    setLoading(false);
  };

  // ── Log workout ───────────────────────────────────────────────────────────
  const logIt = async () => {
    const entry = {
      type: selectedFocus.join(", "),
      duration: parseInt(dur),
      days,
      date: Date.now(),
    };
    await updateUser({ ...user, workouts: [...user.workouts, entry] });
    toast("Workout logged! 💪", "success");
  };

  // ── Save plan to profile ──────────────────────────────────────────────────
  const savePlan = async () => {
    if (!result) return;
    const plan = {
      focus: selectedFocus.join(", "),
      days,
      duration: dur,
      equipment: equip,
      plan: result,
      savedAt: Date.now(),
    };
    const existing = (user as any).savedWorkoutPlans || [];
    await updateUser({
      ...user,
      savedWorkoutPlans: [plan, ...existing],
    } as any);
    toast("Plan saved to your profile ✓", "success");
  };

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Personalised AI programmes for your exact goals">
        AI Workout <span className="text-primary">Planner</span>
      </PageTitle>

      <div className="mk2-card">
        {/* ── Credit counter ─────────────────────────────────────────────── */}
        <div
          className={`flex items-center justify-between mb-4 px-3 py-2 rounded-lg ${outOfCredits ? "bg-red-500/10 border border-red-500/30" : "bg-secondary"}`}
        >
          <div className="text-xs text-muted-foreground">
            AI Plans this month
          </div>
          <div
            className={`font-bold text-sm ${outOfCredits ? "text-red-400" : creditsLeft <= 3 ? "text-orange-400" : "text-green-500"}`}
          >
            {creditsUsed} / {MONTHLY_CREDIT_LIMIT} used
            {outOfCredits && " — resets next month"}
          </div>
        </div>

        {/* ── Multi-select focus ─────────────────────────────────────────── */}
        <div className="mb-4">
          <label className="mk2-label">
            Focus Areas (select all that apply)
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {FOCUS_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => toggleFocus(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedFocus.includes(f)
                    ? "bg-orange-500 text-black border-orange-500"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── Days, duration, equipment ──────────────────────────────────── */}
        <div
          className={`grid gap-3 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}
        >
          {/* Days picker */}
          <div>
            <label className="mk2-label">Training Days per Week</label>
            <div className="flex gap-1.5 mt-1">
              {DAYS_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all ${
                    days === d
                      ? "bg-orange-500 text-black border-orange-500"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="mk2-label">Duration (min)</label>
            <select
              className="mk2-select"
              value={dur}
              onChange={(e) => setDur(e.target.value)}
            >
              {["20", "30", "45", "60", "75", "90"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Equipment */}
          <div>
            <label className="mk2-label">Equipment</label>
            <select
              className="mk2-select"
              value={equip}
              onChange={(e) => setEquip(e.target.value)}
            >
              {EQUIPMENT_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Summary pill ──────────────────────────────────────────────── */}
        <div className="mb-4 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
          Generating:{" "}
          <span className="text-foreground font-semibold">{days}-day plan</span>{" "}
          · {selectedFocus.join(", ")} · {dur} min · {equip}
        </div>

        <Btn
          variant="primary"
          onClick={generate}
          disabled={loading || outOfCredits}
        >
          ⚡{" "}
          {loading
            ? "Generating…"
            : outOfCredits
              ? "No Credits Left"
              : "Generate Workout Plan"}
        </Btn>

        {result && (
          <>
            <div className="mk2-ai-box mt-4">{result}</div>
            <div className="mt-3 flex gap-2.5 flex-wrap">
              <Btn variant="ghost" size="sm" onClick={logIt}>
                + Log Workout
              </Btn>
              <Btn variant="primary" size="sm" onClick={savePlan}>
                💾 Save Plan
              </Btn>
              <Btn
                variant="subtle"
                size="sm"
                onClick={() => {
                  setResult("");
                  generate();
                }}
              >
                ↺ Regenerate
              </Btn>
            </div>
          </>
        )}
      </div>

      {/* ── Saved plans ──────────────────────────────────────────────────── */}
      {(user as any).savedWorkoutPlans?.length > 0 && (
        <div className="mk2-card mt-4">
          <div className="font-bold text-sm mb-3">
            Saved Plans ({(user as any).savedWorkoutPlans.length})
          </div>
          <div className="flex flex-col gap-2">
            {(user as any).savedWorkoutPlans.map((p: any, i: number) => (
              <div key={i} className="bg-secondary rounded-xl p-3">
                <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                  <div>
                    <div className="font-bold text-sm">{p.focus}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.days} days · {p.duration} min · {p.equipment}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(p.savedAt).toLocaleDateString("en-ZA")}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto bg-background rounded-lg p-2">
                  {p.plan}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Workout log ───────────────────────────────────────────────────── */}
      {user.workouts.length > 0 && (
        <div className="mk2-card mt-4">
          <div className="font-bold text-sm mb-3">
            Workout Log ({user.workouts.length})
          </div>
          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
            {user.workouts
              .slice()
              .reverse()
              .map((w: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center px-3 py-2 bg-secondary rounded-lg text-xs flex-wrap gap-1.5"
                >
                  <Tag color="hsl(20 100% 50%)">{w.type}</Tag>
                  <span className="text-muted-foreground">
                    {w.duration} min
                  </span>
                  {w.days && (
                    <span className="text-muted-foreground">{w.days}d/wk</span>
                  )}
                  <span className="text-muted-foreground/60">
                    {new Date(w.date).toLocaleDateString("en-ZA")}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// import { useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { logEvent } from "@/lib/firebase";
// import { askClaude } from "@/services/api";
// import { Btn } from "@/components/shared/Btn";
// import { Tag } from "@/components/shared/Tag";
// import { PageTitle } from "@/components/shared/PageTitle";

// export function WorkoutPlanner() {
//   const { user, updateUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [focus, setFocus] = useState("Full Body");
//   const [dur, setDur] = useState("45");
//   const [equip, setEquip] = useState("Full Gym");
//   const [result, setResult] = useState("");
//   const [loading, setLoading] = useState(false);

//   if (!user) return null;

//   const generate = async () => {
//     setLoading(true);
//     setResult("");
//     logEvent("generate_workout", { focus, duration: dur });
//     await askClaude(
//       `You are an expert personal trainer at MK2 Rivers Fitness. Create detailed structured workout plans.\nFormat:\nWARM-UP (5 min):\n• [3 exercises]\n\nMAIN WORKOUT:\n1. [Exercise] — [sets]×[reps] | Rest: [time]\n\nCOOL-DOWN:\n• [3 stretches]\n\nTRAINER NOTES:\n• [2 tips]`,
//       `${dur}-min ${focus} workout for ${user.level}, goal: "${user.goal}". Equipment: ${equip}.`,
//       setResult
//     );
//     setLoading(false);
//   };

//   const logIt = async () => {
//     await updateUser({ ...user, workouts: [...user.workouts, { type: focus, duration: parseInt(dur), date: Date.now() }] });
//     toast("Workout logged! 💪", "success");
//   };

//   const fields = [
//     { label: "Focus", val: focus, set: setFocus, opts: ["Full Body", "Upper Body", "Lower Body", "Core & Abs", "Cardio & HIIT", "Strength", "Mobility"] },
//     { label: "Duration (min)", val: dur, set: setDur, opts: ["20", "30", "45", "60", "75", "90"] },
//     { label: "Equipment", val: equip, set: setEquip, opts: ["Full Gym", "Dumbbells Only", "Bodyweight", "Resistance Bands", "Barbells & Racks"] },
//   ];

//   return (
//     <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
//       <PageTitle sub="Personalised AI programmes for your exact goals">
//         AI Workout <span className="text-primary">Planner</span>
//       </PageTitle>

//       <div className="mk2-card">
//         <div className={`grid gap-3 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
//           {fields.map((f) => (
//             <div key={f.label}>
//               <label className="mk2-label">{f.label}</label>
//               <select className="mk2-select" value={f.val} onChange={(e) => f.set(e.target.value)}>
//                 {f.opts.map((o) => <option key={o}>{o}</option>)}
//               </select>
//             </div>
//           ))}
//         </div>
//         <Btn variant="primary" onClick={generate} disabled={loading}>
//           ⚡ {loading ? "Generating…" : "Generate Workout"}
//         </Btn>
//         {result && (
//           <>
//             <div className="mk2-ai-box">{result}</div>
//             <div className="mt-3 flex gap-2.5 flex-wrap">
//               <Btn variant="ghost" size="sm" onClick={logIt}>+ Log Workout</Btn>
//               <Btn variant="subtle" size="sm" onClick={() => { setResult(""); generate(); }}>↺ Regenerate</Btn>
//             </div>
//           </>
//         )}
//       </div>

//       {user.workouts.length > 0 && (
//         <div className="mk2-card mt-4">
//           <div className="font-bold text-sm mb-3">Workout Log ({user.workouts.length})</div>
//           <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
//             {user.workouts.slice().reverse().map((w: any, i: number) => (
//               <div key={i} className="flex justify-between items-center px-3 py-2 bg-secondary rounded-lg text-xs flex-wrap gap-1.5">
//                 <Tag color="hsl(20 100% 50%)">{w.type}</Tag>
//                 <span className="text-muted-foreground">{w.duration} min</span>
//                 <span className="text-muted-foreground/60">{new Date(w.date).toLocaleDateString("en-ZA")}</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
