import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";
import { Btn } from "@/components/shared/Btn";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ── Date filter options ───────────────────────────────────────────────────────
const FILTERS = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "6m", days: 180 },
  { label: "1yr", days: 365 },
  { label: "All", days: 0 },
] as const;

// ── Metric config ─────────────────────────────────────────────────────────────
const METRICS = [
  { key: "weight", label: "Weight (kg)", color: "hsl(20 100% 50%)" },
  { key: "bodyFat", label: "Body Fat (%)", color: "hsl(0 84% 51%)" },
  { key: "muscleMass", label: "Muscle Mass (kg)", color: "hsl(142 72% 37%)" },
  { key: "fatMass", label: "Fat Mass (kg)", color: "hsl(38 92% 44%)" },
  { key: "visceralFat", label: "Visceral Fat", color: "hsl(263 85% 58%)" },
  { key: "totalBodyWater", label: "Body Water (L)", color: "hsl(187 85% 40%)" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

interface Props {
  setPage: (page: string) => void;
}

export function ProgressReport({ setPage }: Props) {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();

  const [filterDays, setFilterDays] = useState<number>(90);
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>([
    "weight",
    "muscleMass",
    "fatMass",
  ]);

  if (!user) return null;

  const inbodyHistory: any[] = (user as any).inbodyHistory || [];

  // ── Filter + sort by date ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const cutoff =
      filterDays === 0 ? 0 : Date.now() - filterDays * 24 * 60 * 60 * 1000;
    return inbodyHistory
      .filter((e) => e.date >= cutoff)
      .sort((a, b) => a.date - b.date)
      .map((e) => ({
        ...e,
        dateLabel: new Date(e.date).toLocaleDateString("en-ZA", {
          day: "numeric",
          month: "short",
        }),
      }));
  }, [inbodyHistory, filterDays]);

  // ── Toggle metric ─────────────────────────────────────────────────────────
  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev
        : [...prev, key],
    );
  };

  // ── Delta vs previous entry ───────────────────────────────────────────────
  const latest = filtered.at(-1);
  const prev = filtered.at(-2);

  const delta = (key: MetricKey) => {
    if (!latest || !prev || !latest[key] || !prev[key]) return null;
    const d = (latest[key] - prev[key]).toFixed(1);
    return { val: d, positive: Number(d) > 0 };
  };

  // ── Unit suffix per metric ────────────────────────────────────────────────
  const suffix = (key: MetricKey) => {
    if (key === "bodyFat") return "%";
    if (key === "visceralFat") return "";
    if (key === "totalBodyWater") return "L";
    return "kg";
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (inbodyHistory.length === 0) {
    return (
      <div
        className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
      >
        <PageTitle sub="Track your body composition over time">
          Progress <span className="text-primary">Report</span>
        </PageTitle>
        <div className="mk2-card flex flex-col items-center justify-center py-16 gap-4 text-center">
          <span className="text-5xl">📊</span>
          <p className="font-bold text-sm">No assessments yet</p>
          <p className="text-xs text-muted-foreground">
            Complete an InBody assessment to see your progress graphs here.
          </p>
          <Btn variant="primary" onClick={() => setPage("InBody")}>
            Go to InBody Assessment
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Your body composition trends from InBody assessments">
        Progress <span className="text-primary">Report</span>
      </PageTitle>

      {/* ── Back + date filters ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <Btn variant="ghost" size="sm" onClick={() => setPage("InBody")}>
          ← InBody
        </Btn>
        <div className="flex gap-1.5 bg-secondary p-1 rounded-xl">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilterDays(f.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterDays === f.days
                  ? "bg-orange-500 text-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      {latest && (
        <div
          className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-3 lg:grid-cols-6"}`}
        >
          {METRICS.map((m) => {
            const d = delta(m.key);
            return (
              <div key={m.key} className="mk2-card py-3 text-center">
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">
                  {m.label}
                </div>
                <div
                  className="font-display text-xl leading-none mb-1"
                  style={{ color: m.color }}
                >
                  {latest[m.key] ? `${latest[m.key]}${suffix(m.key)}` : "—"}
                </div>
                {d && (
                  <div
                    className={`text-[10px] font-semibold ${d.positive ? "text-red-400" : "text-green-500"}`}
                  >
                    {d.positive ? "▲" : "▼"} {Math.abs(Number(d.val))}
                    {suffix(m.key)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Metric toggles ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => toggleMetric(m.key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
            style={{
              borderColor: m.color,
              color: activeMetrics.includes(m.key) ? m.color : "inherit",
              background: activeMetrics.includes(m.key)
                ? `${m.color}15`
                : "transparent",
              opacity: activeMetrics.includes(m.key) ? 1 : 0.35,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Main combined chart ───────────────────────────────────────────── */}
      {filtered.length < 2 ? (
        <div className="mk2-card flex flex-col items-center justify-center py-12 gap-2 text-center">
          <span className="text-3xl">📈</span>
          <p className="text-sm text-muted-foreground">
            Need at least 2 assessments in this period to show a graph.
          </p>
          <p className="text-xs text-muted-foreground">
            Try a wider date range or add another assessment.
          </p>
        </div>
      ) : (
        <div className="mk2-card mb-5">
          <div className="font-bold text-sm mb-4">
            Body Composition Over Time
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={filtered}
              margin={{ top: 4, right: 12, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              {METRICS.filter((m) => activeMetrics.includes(m.key)).map((m) => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: m.color, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Individual charts per metric ──────────────────────────────────── */}
      {filtered.length >= 2 && (
        <div
          className={`grid gap-4 mb-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {METRICS.filter((m) => activeMetrics.includes(m.key)).map((m) => (
            <div key={m.key} className="mk2-card">
              <div
                className="font-bold text-xs mb-3"
                style={{ color: m.color }}
              >
                {m.label}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart
                  data={filtered}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.2}
                  />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 11,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={m.key}
                    stroke={m.color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* ── Assessment log ────────────────────────────────────────────────── */}
      <div className="mk2-card">
        <div className="font-bold text-sm mb-3">
          Assessment Log ({filtered.length} in range)
        </div>
        <div className="flex flex-col gap-2">
          {filtered
            .slice()
            .reverse()
            .map((e) => (
              <div
                key={e.date}
                className="flex items-center justify-between flex-wrap gap-2 bg-secondary rounded-lg px-3 py-2 text-xs"
              >
                <span className="font-bold">
                  {new Date(e.date).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <div className="flex gap-3 flex-wrap text-muted-foreground">
                  <span>
                    <span className="text-foreground font-semibold">
                      {e.weight}kg
                    </span>{" "}
                    weight
                  </span>
                  <span>
                    <span className="text-foreground font-semibold">
                      {e.bodyFat}%
                    </span>{" "}
                    fat
                  </span>
                  <span>
                    <span className="text-foreground font-semibold">
                      {e.muscleMass}kg
                    </span>{" "}
                    muscle
                  </span>
                  {e.fatMass > 0 && (
                    <span>
                      <span className="text-foreground font-semibold">
                        {e.fatMass}kg
                      </span>{" "}
                      fat mass
                    </span>
                  )}
                </div>
                {e.notes && (
                  <span className="text-muted-foreground italic">
                    {e.notes}
                  </span>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// import { useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { askClaude } from "@/services/api";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";

// export function ProgressTracker() {
//   const { user, updateUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [weight, setWeight] = useState("");
//   const [note, setNote] = useState("");
//   const [insight, setInsight] = useState("");
//   const [loading, setLoading] = useState(false);

//   if (!user) return null;

//   const logWeight = async () => {
//     if (!weight) return toast("Enter a weight", "error");
//     await updateUser({ ...user, weights: [...user.weights, { value: parseFloat(weight), note, date: Date.now() }] });
//     setWeight("");
//     setNote("");
//     toast("Weight logged ✓", "success");
//   };

//   const analyse = async () => {
//     setLoading(true);
//     setInsight("");
//     const wh = user.weights.slice(-6).map((x: any) => `${x.value}kg (${new Date(x.date).toLocaleDateString("en-ZA")})`).join(", ");
//     await askClaude(
//       `You are a fitness coach analysing real member data. Be specific, reference actual numbers, give 3 concrete action points.`,
//       `Analyse progress for ${user.name}, Goal: "${user.goal}", Level: ${user.level}.\nWorkouts: ${user.workouts.length} total, ${user.workouts.filter((x: any) => Date.now() - x.date < 7 * 86400000).length} this week.\nWeight history: ${wh || "none yet"}.\nGive: trend analysis, consistency score, 3 action points.`,
//       setInsight
//     );
//     setLoading(false);
//   };

//   const ws = user.weights;
//   const latest = ws.at(-1) as any;
//   const prev = ws.at(-2) as any;
//   const change = latest && prev ? (latest.value - prev.value).toFixed(1) : null;

//   return (
//     <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
//       <PageTitle sub="Log stats and get AI coaching on your real data">
//         Progress <span className="text-primary">Tracker</span>
//       </PageTitle>

//       <div className={`grid gap-4 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
//         {/* Log weight */}
//         <div className="mk2-card">
//           <div className="font-bold text-sm mb-3.5">Log Today's Weight</div>
//           <label className="mk2-label">Weight (kg)</label>
//           <input type="number" step="0.1" className="mk2-input mb-2.5" placeholder="78.5" value={weight} onChange={(e) => setWeight(e.target.value)} />
//           <label className="mk2-label">Notes</label>
//           <input className="mk2-input mb-4" placeholder="e.g. post-gym, fasted" value={note} onChange={(e) => setNote(e.target.value)} />
//           <Btn variant="primary" onClick={logWeight}>Log Weight</Btn>
//         </div>

//         {/* Summary */}
//         <div className="mk2-card">
//           <div className="font-bold text-sm mb-3">Weight Summary</div>
//           {ws.length === 0 ? (
//             <div className="text-muted-foreground text-sm">Start logging to see trends.</div>
//           ) : (
//             <>
//               <div className="grid grid-cols-3 gap-2 mb-3">
//                 {[
//                   { label: "Latest", value: latest?.value + "kg", col: "hsl(20 100% 50%)" },
//                   { label: "Change", value: change ? (Number(change) > 0 ? "+" + change : change) + "kg" : "—", col: Number(change) > 0 ? "hsl(0 84% 51%)" : "hsl(142 72% 37%)" },
//                   { label: "Entries", value: ws.length, col: "hsl(217 91% 53%)" },
//                 ].map((s) => (
//                   <div key={s.label} className="text-center p-2.5 bg-secondary rounded-lg">
//                     <div className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] mb-1">{s.label}</div>
//                     <div className="font-display text-[22px]" style={{ color: s.col }}>{s.value}</div>
//                   </div>
//                 ))}
//               </div>
//               <div className="max-h-[150px] overflow-y-auto flex flex-col gap-1.5">
//                 {ws.slice().reverse().map((w: any, i: number) => (
//                   <div key={i} className="flex justify-between px-2.5 py-1.5 bg-secondary rounded text-[11px] flex-wrap gap-1">
//                     <span className="font-bold text-primary">{w.value}kg</span>
//                     <span className="text-muted-foreground">{w.note}</span>
//                     <span className="text-muted-foreground/50">{new Date(w.date).toLocaleDateString("en-ZA")}</span>
//                   </div>
//                 ))}
//               </div>
//             </>
//           )}
//         </div>
//       </div>

//       {/* AI Analysis */}
//       <div className="mk2-card">
//         <div className="flex justify-between items-center flex-wrap gap-2.5 mb-2.5">
//           <div>
//             <div className="font-bold text-sm">🤖 AI Progress Analysis</div>
//             <div className="text-xs text-muted-foreground mt-0.5">Based on your real logged data in Firestore</div>
//           </div>
//           <Btn variant="primary" onClick={analyse} disabled={loading}>{loading ? "Analysing…" : "Analyse My Progress"}</Btn>
//         </div>
//         {insight ? <div className="mk2-ai-box">{insight}</div> : <div className="text-muted-foreground text-sm">Log some workouts & weight entries then hit Analyse.</div>}
//       </div>
//     </div>
//   );
// }
