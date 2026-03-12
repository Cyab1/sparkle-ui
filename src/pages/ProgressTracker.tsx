import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { askClaude } from "@/services/api";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";

export function ProgressTracker() {
  const { user, updateUser, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const logWeight = async () => {
    if (!weight) return toast("Enter a weight", "error");
    await updateUser({ ...user, weights: [...user.weights, { value: parseFloat(weight), note, date: Date.now() }] });
    setWeight("");
    setNote("");
    toast("Weight logged ✓", "success");
  };

  const analyse = async () => {
    setLoading(true);
    setInsight("");
    const wh = user.weights.slice(-6).map((x: any) => `${x.value}kg (${new Date(x.date).toLocaleDateString("en-ZA")})`).join(", ");
    await askClaude(
      `You are a fitness coach analysing real member data. Be specific, reference actual numbers, give 3 concrete action points.`,
      `Analyse progress for ${user.name}, Goal: "${user.goal}", Level: ${user.level}.\nWorkouts: ${user.workouts.length} total, ${user.workouts.filter((x: any) => Date.now() - x.date < 7 * 86400000).length} this week.\nWeight history: ${wh || "none yet"}.\nGive: trend analysis, consistency score, 3 action points.`,
      setInsight
    );
    setLoading(false);
  };

  const ws = user.weights;
  const latest = ws.at(-1) as any;
  const prev = ws.at(-2) as any;
  const change = latest && prev ? (latest.value - prev.value).toFixed(1) : null;

  return (
    <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
      <PageTitle sub="Log stats and get AI coaching on your real data">
        Progress <span className="text-primary">Tracker</span>
      </PageTitle>

      <div className={`grid gap-4 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        {/* Log weight */}
        <div className="mk2-card">
          <div className="font-bold text-sm mb-3.5">Log Today's Weight</div>
          <label className="mk2-label">Weight (kg)</label>
          <input type="number" step="0.1" className="mk2-input mb-2.5" placeholder="78.5" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <label className="mk2-label">Notes</label>
          <input className="mk2-input mb-4" placeholder="e.g. post-gym, fasted" value={note} onChange={(e) => setNote(e.target.value)} />
          <Btn variant="primary" onClick={logWeight}>Log Weight</Btn>
        </div>

        {/* Summary */}
        <div className="mk2-card">
          <div className="font-bold text-sm mb-3">Weight Summary</div>
          {ws.length === 0 ? (
            <div className="text-muted-foreground text-sm">Start logging to see trends.</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: "Latest", value: latest?.value + "kg", col: "hsl(20 100% 50%)" },
                  { label: "Change", value: change ? (Number(change) > 0 ? "+" + change : change) + "kg" : "—", col: Number(change) > 0 ? "hsl(0 84% 51%)" : "hsl(142 72% 37%)" },
                  { label: "Entries", value: ws.length, col: "hsl(217 91% 53%)" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-2.5 bg-secondary rounded-lg">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] mb-1">{s.label}</div>
                    <div className="font-display text-[22px]" style={{ color: s.col }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="max-h-[150px] overflow-y-auto flex flex-col gap-1.5">
                {ws.slice().reverse().map((w: any, i: number) => (
                  <div key={i} className="flex justify-between px-2.5 py-1.5 bg-secondary rounded text-[11px] flex-wrap gap-1">
                    <span className="font-bold text-primary">{w.value}kg</span>
                    <span className="text-muted-foreground">{w.note}</span>
                    <span className="text-muted-foreground/50">{new Date(w.date).toLocaleDateString("en-ZA")}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Analysis */}
      <div className="mk2-card">
        <div className="flex justify-between items-center flex-wrap gap-2.5 mb-2.5">
          <div>
            <div className="font-bold text-sm">🤖 AI Progress Analysis</div>
            <div className="text-xs text-muted-foreground mt-0.5">Based on your real logged data in Firestore</div>
          </div>
          <Btn variant="primary" onClick={analyse} disabled={loading}>{loading ? "Analysing…" : "Analyse My Progress"}</Btn>
        </div>
        {insight ? <div className="mk2-ai-box">{insight}</div> : <div className="text-muted-foreground text-sm">Log some workouts & weight entries then hit Analyse.</div>}
      </div>
    </div>
  );
}
