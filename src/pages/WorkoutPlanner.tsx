import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent } from "@/lib/firebase";
import { askClaude } from "@/services/api";
import { Btn } from "@/components/shared/Btn";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";

export function WorkoutPlanner() {
  const { user, updateUser, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const [focus, setFocus] = useState("Full Body");
  const [dur, setDur] = useState("45");
  const [equip, setEquip] = useState("Full Gym");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const generate = async () => {
    setLoading(true);
    setResult("");
    logEvent("generate_workout", { focus, duration: dur });
    await askClaude(
      `You are an expert personal trainer at MK2 Rivers Fitness. Create detailed structured workout plans.\nFormat:\nWARM-UP (5 min):\n• [3 exercises]\n\nMAIN WORKOUT:\n1. [Exercise] — [sets]×[reps] | Rest: [time]\n\nCOOL-DOWN:\n• [3 stretches]\n\nTRAINER NOTES:\n• [2 tips]`,
      `${dur}-min ${focus} workout for ${user.level}, goal: "${user.goal}". Equipment: ${equip}.`,
      setResult
    );
    setLoading(false);
  };

  const logIt = async () => {
    await updateUser({ ...user, workouts: [...user.workouts, { type: focus, duration: parseInt(dur), date: Date.now() }] });
    toast("Workout logged! 💪", "success");
  };

  const fields = [
    { label: "Focus", val: focus, set: setFocus, opts: ["Full Body", "Upper Body", "Lower Body", "Core & Abs", "Cardio & HIIT", "Strength", "Mobility"] },
    { label: "Duration (min)", val: dur, set: setDur, opts: ["20", "30", "45", "60", "75", "90"] },
    { label: "Equipment", val: equip, set: setEquip, opts: ["Full Gym", "Dumbbells Only", "Bodyweight", "Resistance Bands", "Barbells & Racks"] },
  ];

  return (
    <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
      <PageTitle sub="Personalised AI programmes for your exact goals">
        AI Workout <span className="text-primary">Planner</span>
      </PageTitle>

      <div className="mk2-card">
        <div className={`grid gap-3 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
          {fields.map((f) => (
            <div key={f.label}>
              <label className="mk2-label">{f.label}</label>
              <select className="mk2-select" value={f.val} onChange={(e) => f.set(e.target.value)}>
                {f.opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <Btn variant="primary" onClick={generate} disabled={loading}>
          ⚡ {loading ? "Generating…" : "Generate Workout"}
        </Btn>
        {result && (
          <>
            <div className="mk2-ai-box">{result}</div>
            <div className="mt-3 flex gap-2.5 flex-wrap">
              <Btn variant="ghost" size="sm" onClick={logIt}>+ Log Workout</Btn>
              <Btn variant="subtle" size="sm" onClick={() => { setResult(""); generate(); }}>↺ Regenerate</Btn>
            </div>
          </>
        )}
      </div>

      {user.workouts.length > 0 && (
        <div className="mk2-card mt-4">
          <div className="font-bold text-sm mb-3">Workout Log ({user.workouts.length})</div>
          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
            {user.workouts.slice().reverse().map((w: any, i: number) => (
              <div key={i} className="flex justify-between items-center px-3 py-2 bg-secondary rounded-lg text-xs flex-wrap gap-1.5">
                <Tag color="hsl(20 100% 50%)">{w.type}</Tag>
                <span className="text-muted-foreground">{w.duration} min</span>
                <span className="text-muted-foreground/60">{new Date(w.date).toLocaleDateString("en-ZA")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
