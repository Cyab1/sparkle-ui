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
// higherIsBetter: true  → gain is green ▲, loss is red ▼   (e.g. muscle, water)
// higherIsBetter: false → gain is red   ▲, loss is green ▼ (e.g. weight, fat)
const METRICS = [
  {
    key: "weight",
    label: "Weight (kg)",
    color: "hsl(20 100% 50%)",
    higherIsBetter: false,
  },
  {
    key: "bodyFat",
    label: "Body Fat (%)",
    color: "hsl(0 84% 51%)",
    higherIsBetter: false,
  },
  {
    key: "muscleMass",
    label: "Muscle Mass (kg)",
    color: "hsl(142 72% 37%)",
    higherIsBetter: true,
  },
  {
    key: "fatMass",
    label: "Fat Mass (kg)",
    color: "hsl(38 92% 44%)",
    higherIsBetter: false,
  },
  {
    key: "visceralFat",
    label: "Visceral Fat",
    color: "hsl(263 85% 58%)",
    higherIsBetter: false,
  },
  {
    key: "totalBodyWater",
    label: "Body Water (L)",
    color: "hsl(187 85% 40%)",
    higherIsBetter: true,
  },
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

  // ── Toggle metric (always keep at least one active) ───────────────────────
  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev
        : [...prev, key],
    );
  };

  const latest = filtered.at(-1);
  const prev = filtered.at(-2);

  // ── Delta with correct colour logic per metric ────────────────────────────
  const delta = (key: MetricKey) => {
    if (!latest || !prev || latest[key] == null || prev[key] == null)
      return null;
    const diff = parseFloat((latest[key] - prev[key]).toFixed(1));
    if (diff === 0) return null;

    const metric = METRICS.find((m) => m.key === key)!;
    const isPositiveDiff = diff > 0;
    // Green when the change is in the desired direction
    const isGood = metric.higherIsBetter ? isPositiveDiff : !isPositiveDiff;

    return { val: diff, isGood };
  };

  // ── Unit suffix per metric ────────────────────────────────────────────────
  const suffix = (key: MetricKey) => {
    if (key === "bodyFat") return "%";
    if (key === "visceralFat") return "";
    if (key === "totalBodyWater") return "L";
    return "kg";
  };

  // ── Empty state — no history at all ──────────────────────────────────────
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
                  {latest[m.key] != null && latest[m.key] !== 0
                    ? `${latest[m.key]}${suffix(m.key)}`
                    : "—"}
                </div>
                {d && (
                  <div
                    className={`text-[10px] font-semibold ${d.isGood ? "text-green-500" : "text-red-400"}`}
                  >
                    {d.val > 0 ? "▲" : "▼"} {Math.abs(d.val)}
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

      {/* ── No data in selected range ─────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="mk2-card flex flex-col items-center justify-center py-12 gap-2 text-center mb-5">
          <span className="text-3xl">🗓️</span>
          <p className="text-sm text-muted-foreground">
            No assessments in this time range.
          </p>
          <p className="text-xs text-muted-foreground">
            Try a wider date range or add a new assessment.
          </p>
          <Btn variant="ghost" size="sm" onClick={() => setFilterDays(0)}>
            Show All
          </Btn>
        </div>
      )}

      {/* ── Need more data ────────────────────────────────────────────────── */}
      {filtered.length === 1 && (
        <div className="mk2-card flex flex-col items-center justify-center py-12 gap-2 text-center mb-5">
          <span className="text-3xl">📈</span>
          <p className="text-sm text-muted-foreground">
            Only 1 assessment in this period — need at least 2 to draw a graph.
          </p>
          <p className="text-xs text-muted-foreground">
            Try a wider date range or add another assessment.
          </p>
        </div>
      )}

      {/* ── Main combined chart ───────────────────────────────────────────── */}
      {filtered.length >= 2 && (
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
      {filtered.length > 0 && (
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
      )}
    </div>
  );
}

// import { useState, useRef } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { getFunctions, httpsCallable } from "firebase/functions";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";

// // ── Cloud Function ────────────────────────────────────────────────────────────
// // Both callables go through the same aiChat function — region must match deployment.
// const functions = getFunctions(undefined, "europe-west1");
// const aiChatFn = httpsCallable(functions, "aiChat", { timeout: 60_000 });
// const aiExtractFn = httpsCallable(functions, "aiChat", { timeout: 60_000 });

// interface InBodyEntry {
//   date: number;
//   weight: number;
//   bodyFat: number;
//   muscleMass: number;
//   fatMass: number;
//   visceralFat: number;
//   totalBodyWater: number;
//   notes: string;
//   hasFile: boolean;
// }

// interface Props {
//   setPage: (page: string) => void;
// }

// export function InBody({ setPage }: Props) {
//   const { user, updateUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const fileRef = useRef<HTMLInputElement>(null);

//   const [weight, setWeight] = useState("");
//   const [bodyFat, setBodyFat] = useState("");
//   const [muscleMass, setMuscleMass] = useState("");
//   const [fatMass, setFatMass] = useState("");
//   const [visceralFat, setVisceralFat] = useState("");
//   const [totalBodyWater, setTotalBodyWater] = useState("");
//   const [notes, setNotes] = useState("");
//   const [fileName, setFileName] = useState<string | null>(null);
//   const [fileProcessing, setFileProcessing] = useState(false);
//   const [analysis, setAnalysis] = useState("");
//   const [analysing, setAnalysing] = useState(false);
//   const [activeEntry, setActiveEntry] = useState<InBodyEntry | null>(null);
//   const [aiError, setAiError] = useState("");

//   if (!user) return null;

//   const membership = (user as any).membership ?? "basic";
//   const isActiveMember = membership === "silver" || membership === "gold";
//   const aiQuota = (user as any).aiQuota ?? null;
//   const inbodyHistory: InBodyEntry[] = (user as any).inbodyHistory || [];

//   // Quota calculation (mirrors NutritionCoach)
//   const quotaTotal =
//     membership === "gold" ? 100 : membership === "silver" ? 20 : 0;
//   const used = aiQuota?.used ?? 0;
//   const remaining = Math.max(0, quotaTotal - used);
//   const outOfCredits = remaining <= 0;

//   // ── File upload — extraction via aiChat function (NOT direct API call) ────
//   const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     setFileName(file.name);
//     setFileProcessing(true);

//     try {
//       // Convert file to base64
//       const base64 = await new Promise<string>((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = () => resolve((reader.result as string).split(",")[1]);
//         reader.onerror = () => reject(new Error("Failed to read file"));
//         reader.readAsDataURL(file);
//       });

//       const isPDF = file.type === "application/pdf";
//       const mediaType = isPDF ? "application/pdf" : file.type || "image/jpeg";

//       // ✅ Send through Firebase function — keeps Anthropic API key server-side
//       const res = await aiExtractFn({
//         mode: "inbody_extract",
//         fileData: base64,
//         mediaType,
//         isPDF,
//         prompt: `This is an InBody body composition report. Extract ONLY these values as a JSON object with these exact keys (use null if not found):
// {
//   "weight": number (kg),
//   "bodyFat": number (percentage e.g. 18.2 not 0.182),
//   "muscleMass": number (kg skeletal muscle mass),
//   "fatMass": number (kg body fat mass),
//   "visceralFat": number (visceral fat level/score),
//   "totalBodyWater": number (litres)
// }
// Respond ONLY with the JSON object, no other text.`,
//         systemPrompt:
//           "You are a precise data extraction assistant. Extract InBody body composition values from the provided report image or PDF. Return only valid JSON, nothing else.",
//       });

//       const data = res.data as { response: string };
//       const cleaned = data.response.replace(/```json|```/g, "").trim();
//       const parsed = JSON.parse(cleaned);

//       // Count successfully extracted fields
//       const fields: Array<keyof typeof parsed> = [
//         "weight",
//         "bodyFat",
//         "muscleMass",
//         "fatMass",
//         "visceralFat",
//         "totalBodyWater",
//       ];
//       const filled = fields.filter((k) => parsed[k] != null).length;

//       if (filled > 0) {
//         // Pre-fill form fields
//         if (parsed.weight != null) setWeight(String(parsed.weight));
//         if (parsed.bodyFat != null) setBodyFat(String(parsed.bodyFat));
//         if (parsed.muscleMass != null) setMuscleMass(String(parsed.muscleMass));
//         if (parsed.fatMass != null) setFatMass(String(parsed.fatMass));
//         if (parsed.visceralFat != null)
//           setVisceralFat(String(parsed.visceralFat));
//         if (parsed.totalBodyWater != null)
//           setTotalBodyWater(String(parsed.totalBodyWater));

//         // Auto-save the entry
//         const entry: InBodyEntry = {
//           date: Date.now(),
//           weight: parsed.weight ?? 0,
//           bodyFat: parsed.bodyFat ?? 0,
//           muscleMass: parsed.muscleMass ?? 0,
//           fatMass: parsed.fatMass ?? 0,
//           visceralFat: parsed.visceralFat ?? 0,
//           totalBodyWater: parsed.totalBodyWater ?? 0,
//           notes: "",
//           hasFile: true,
//         };

//         try {
//           await updateUser({
//             ...user,
//             inbodyHistory: [entry, ...inbodyHistory],
//           } as any);
//           toast(
//             `✅ Extracted ${filled} values and saved your assessment!`,
//             "success",
//           );
//         } catch {
//           toast(
//             "⚠️ Values extracted but failed to save — press Save Assessment manually",
//             "error",
//           );
//         }
//       } else {
//         toast(
//           "⚠️ Could not extract values — please enter them manually",
//           "error",
//         );
//       }
//     } catch (err: any) {
//       if (import.meta.env.DEV) console.error("File extraction error:", err);
//       toast(
//         "⚠️ Could not read file automatically — please enter values manually",
//         "error",
//       );
//     } finally {
//       setFileProcessing(false);
//     }
//   };

//   // ── Manual save ───────────────────────────────────────────────────────────
//   const saveEntry = async () => {
//     if (!weight) return toast("Enter at least your weight", "error");

//     const entry: InBodyEntry = {
//       date: Date.now(),
//       weight: parseFloat(weight),
//       bodyFat: parseFloat(bodyFat) || 0,
//       muscleMass: parseFloat(muscleMass) || 0,
//       fatMass: parseFloat(fatMass) || 0,
//       visceralFat: parseFloat(visceralFat) || 0,
//       totalBodyWater: parseFloat(totalBodyWater) || 0,
//       notes,
//       hasFile: !!fileName,
//     };

//     try {
//       await updateUser({
//         ...user,
//         inbodyHistory: [entry, ...inbodyHistory],
//       } as any);
//       toast("✅ InBody assessment saved!", "success");
//       setWeight("");
//       setBodyFat("");
//       setMuscleMass("");
//       setFatMass("");
//       setVisceralFat("");
//       setTotalBodyWater("");
//       setNotes("");
//       setFileName(null);
//     } catch {
//       toast("❌ Failed to save — please try again", "error");
//     }
//   };

//   // ── AI analysis ───────────────────────────────────────────────────────────
//   const analyseEntry = async (entry: InBodyEntry) => {
//     if (!isActiveMember) {
//       toast("Upgrade your membership to unlock AI analysis.", "error");
//       return;
//     }

//     // ✅ Quota guard — prevents wasted calls and shows proper message
//     if (outOfCredits) {
//       setAiError(
//         "You've used all your AI calls for this month. Your quota resets on the 1st.",
//       );
//       return;
//     }

//     setActiveEntry(entry);
//     setAnalysing(true);
//     setAnalysis("");
//     setAiError("");

//     const prev = inbodyHistory.find((e) => e.date !== entry.date);

//     try {
//       const prompt = `Analyse this InBody for ${user.name}, Goal: "${user.goal}", Level: ${user.level}:
// Weight: ${entry.weight}kg | Body Fat: ${entry.bodyFat}% | Muscle Mass: ${entry.muscleMass}kg
// Fat Mass: ${entry.fatMass}kg | Visceral Fat: ${entry.visceralFat} | Body Water: ${entry.totalBodyWater}L
// ${
//   prev
//     ? `Previous: Weight ${prev.weight}kg | Fat ${prev.bodyFat}% | Muscle ${prev.muscleMass}kg | Fat Mass ${prev.fatMass}kg`
//     : "First assessment."
// }
// Provide: 1) Assessment 2) Progress vs previous 3) Focus areas for their goal 4) 3 training tips 5) 2 nutrition adjustments`;

//       const res = await aiChatFn({
//         prompt,
//         systemPrompt:
//           "You are a professional fitness and body composition coach at MK2 Rivers Fitness. You ONLY answer questions about fitness, body composition, health, and training. Decline anything unrelated.",
//         mode: "inbody",
//       });

//       const data = res.data as { response: string; quotaRemaining: number };
//       if (!data?.response) throw new Error("EMPTY_RESPONSE");
//       setAnalysis(data.response);
//     } catch (err: any) {
//       const msg: string = err?.message ?? "";
//       if (import.meta.env.DEV) console.error("aiChat inbody error:", err);

//       if (msg.includes("QUOTA_EXCEEDED")) {
//         setAiError(
//           "You've used all your AI calls for this month. Quota resets on the 1st.",
//         );
//       } else if (msg.includes("JOIN_GYM")) {
//         setAiError("An active membership is required to use AI analysis.");
//       } else if (msg.includes("EMPTY_RESPONSE")) {
//         setAiError("The AI returned an empty response. Please try again.");
//       } else {
//         setAiError("AI analysis unavailable — please try again later.");
//       }
//       setAnalysis("");
//     } finally {
//       setAnalysing(false);
//     }
//   };

//   const inputCls =
//     "w-full bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-foreground text-sm outline-none font-body focus:border-primary/40 transition-colors";
//   const lblCls =
//     "text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground block mb-1.5";

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Enter your InBody scan results — AI analyses your body composition">
//         InBody <span className="text-primary">Assessment</span>
//       </PageTitle>

//       {/* ── AI locked notice ─────────────────────────────────────────────── */}
//       {!isActiveMember && (
//         <div
//           className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3 text-xs"
//           style={{
//             background: "hsl(263 85% 58% / 0.08)",
//             border: "1px solid hsl(263 85% 58% / 0.25)",
//             color: "hsl(263 85% 58%)",
//           }}
//         >
//           <span className="text-base shrink-0">🔒</span>
//           <span>
//             <strong>AI Analysis locked</strong> — Upgrade to Silver or Gold to
//             unlock AI body composition analysis.
//           </span>
//         </div>
//       )}

//       {/* ── Quota warning ────────────────────────────────────────────────── */}
//       {isActiveMember && outOfCredits && (
//         <div className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400">
//           <span className="text-base shrink-0">⚠️</span>
//           <span>
//             <strong>No AI calls remaining</strong> — Your monthly quota resets
//             on the 1st. You can still save assessments manually.
//           </span>
//         </div>
//       )}

//       {/* ── Link to Progress Report ──────────────────────────────────────── */}
//       {inbodyHistory.length > 0 && (
//         <div
//           className="mb-5 rounded-xl px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:opacity-90 transition-opacity"
//           style={{
//             background: "hsl(187 85% 40% / 0.1)",
//             border: "1px solid hsl(187 85% 40% / 0.3)",
//           }}
//           onClick={() => setPage("Progress")}
//         >
//           <div>
//             <p
//               className="font-bold text-sm"
//               style={{ color: "hsl(187 85% 40%)" }}
//             >
//               📈 View your Progress Report
//             </p>
//             <p className="text-xs text-muted-foreground mt-0.5">
//               See graphs of all your InBody metrics over time
//             </p>
//           </div>
//           <span className="text-xl">→</span>
//         </div>
//       )}

//       <div
//         className={`grid gap-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"} mb-6`}
//       >
//         {/* ── Manual entry ─────────────────────────────────────────────────── */}
//         <div className="mk2-card">
//           <div className="font-bold text-sm mb-4">Enter Results Manually</div>
//           <div className="grid grid-cols-2 gap-3 mb-3">
//             {[
//               {
//                 label: "Weight (kg)",
//                 val: weight,
//                 set: setWeight,
//                 placeholder: "78.5",
//               },
//               {
//                 label: "Body Fat (%)",
//                 val: bodyFat,
//                 set: setBodyFat,
//                 placeholder: "18.2",
//               },
//               {
//                 label: "Muscle Mass (kg)",
//                 val: muscleMass,
//                 set: setMuscleMass,
//                 placeholder: "35.4",
//               },
//               {
//                 label: "Fat Mass (kg)",
//                 val: fatMass,
//                 set: setFatMass,
//                 placeholder: "14.2",
//               },
//               {
//                 label: "Visceral Fat",
//                 val: visceralFat,
//                 set: setVisceralFat,
//                 placeholder: "7",
//               },
//               {
//                 label: "Body Water (L)",
//                 val: totalBodyWater,
//                 set: setTotalBodyWater,
//                 placeholder: "41.2",
//               },
//             ].map((f) => (
//               <div key={f.label}>
//                 <label className={lblCls}>{f.label}</label>
//                 <input
//                   type="number"
//                   step="0.1"
//                   className={inputCls}
//                   placeholder={f.placeholder}
//                   value={f.val}
//                   onChange={(e) => f.set(e.target.value)}
//                 />
//               </div>
//             ))}
//           </div>
//           <div className="mb-3">
//             <label className={lblCls}>Notes</label>
//             <textarea
//               className={`${inputCls} resize-none`}
//               rows={2}
//               placeholder="e.g. pre-breakfast, after 4 weeks training"
//               value={notes}
//               onChange={(e) => setNotes(e.target.value)}
//             />
//           </div>
//           <div className="flex gap-2 flex-wrap">
//             <Btn variant="primary" onClick={saveEntry}>
//               Save Assessment
//             </Btn>
//             {inbodyHistory.length > 0 && (
//               <Btn variant="ghost" onClick={() => setPage("Progress")}>
//                 📈 Progress Report
//               </Btn>
//             )}
//           </div>
//         </div>

//         {/* ── File upload ───────────────────────────────────────────────────── */}
//         <div className="mk2-card flex flex-col">
//           <div className="font-bold text-sm mb-2">Upload InBody Report</div>
//           <div className="text-xs text-muted-foreground mb-4 leading-relaxed">
//             Upload your InBody printout (photo or PDF). We'll automatically
//             extract your metrics and save the assessment.
//           </div>
//           <div
//             onClick={() => !fileProcessing && fileRef.current?.click()}
//             className="flex-1 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 transition-colors min-h-[140px]"
//             style={{ opacity: fileProcessing ? 0.7 : 1 }}
//           >
//             {fileProcessing ? (
//               <>
//                 <span className="text-3xl animate-pulse">🔍</span>
//                 <div className="font-bold text-sm text-primary">
//                   Extracting values…
//                 </div>
//                 <div className="text-xs text-muted-foreground">
//                   Reading your InBody report
//                 </div>
//               </>
//             ) : fileName ? (
//               <>
//                 <span className="text-3xl">📄</span>
//                 <div className="font-bold text-sm text-primary">{fileName}</div>
//                 <div className="text-xs text-muted-foreground">
//                   Click to change
//                 </div>
//               </>
//             ) : (
//               <>
//                 <span className="text-4xl">📤</span>
//                 <div className="font-bold text-sm">Click to upload</div>
//                 <div className="text-xs text-muted-foreground">
//                   JPG, PNG or PDF — values auto-extracted & saved
//                 </div>
//               </>
//             )}
//           </div>
//           <input
//             ref={fileRef}
//             type="file"
//             accept="image/*,.pdf"
//             className="hidden"
//             onChange={handleFile}
//             disabled={fileProcessing}
//           />
//           <div className="mt-3 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
//             ℹ️ Upload your report — values are extracted and saved
//             automatically.
//           </div>
//         </div>
//       </div>

//       {/* ── AI error banner ──────────────────────────────────────────────── */}
//       {aiError && (
//         <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
//           {aiError}
//         </div>
//       )}

//       {/* ── History ──────────────────────────────────────────────────────── */}
//       {inbodyHistory.length > 0 && (
//         <div className="mk2-card mb-5">
//           <div className="flex items-center justify-between mb-4">
//             <div className="font-bold text-sm">
//               Assessment History ({inbodyHistory.length})
//             </div>
//             <Btn variant="ghost" size="sm" onClick={() => setPage("Progress")}>
//               📈 View Graphs
//             </Btn>
//           </div>
//           <div className="flex flex-col gap-3">
//             {inbodyHistory.map((entry, i) => (
//               <motion.div
//                 key={entry.date}
//                 initial={{ opacity: 0, x: -6 }}
//                 animate={{ opacity: 1, x: 0 }}
//                 transition={{ delay: i * 0.05 }}
//                 className="bg-secondary rounded-xl p-4"
//               >
//                 <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
//                   <div>
//                     <div className="font-bold text-sm">
//                       {new Date(entry.date).toLocaleDateString("en-ZA", {
//                         day: "numeric",
//                         month: "long",
//                         year: "numeric",
//                       })}
//                     </div>
//                     {entry.notes && (
//                       <div className="text-xs text-muted-foreground mt-0.5">
//                         {entry.notes}
//                       </div>
//                     )}
//                     {entry.hasFile && (
//                       <div className="text-[10px] text-primary mt-0.5">
//                         📎 Report attached
//                       </div>
//                     )}
//                   </div>
//                   {isActiveMember ? (
//                     <Btn
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => analyseEntry(entry)}
//                       disabled={outOfCredits}
//                     >
//                       🤖 AI Analyse
//                     </Btn>
//                   ) : (
//                     <div className="text-[11px] text-muted-foreground px-2 py-1 rounded border border-border">
//                       🔒 AI — Members only
//                     </div>
//                   )}
//                 </div>
//                 <div className="grid grid-cols-3 gap-2">
//                   {[
//                     {
//                       label: "Weight",
//                       value: `${entry.weight}kg`,
//                       color: "hsl(20 100% 50%)",
//                     },
//                     {
//                       label: "Body Fat",
//                       value: `${entry.bodyFat}%`,
//                       color: "hsl(0 84% 51%)",
//                     },
//                     {
//                       label: "Muscle",
//                       value: `${entry.muscleMass}kg`,
//                       color: "hsl(142 72% 37%)",
//                     },
//                     {
//                       label: "Fat Mass",
//                       value: entry.fatMass ? `${entry.fatMass}kg` : "—",
//                       color: "hsl(38 92% 44%)",
//                     },
//                     {
//                       label: "Visceral",
//                       value: entry.visceralFat || "—",
//                       color: "hsl(263 85% 58%)",
//                     },
//                     {
//                       label: "Water",
//                       value: entry.totalBodyWater
//                         ? `${entry.totalBodyWater}L`
//                         : "—",
//                       color: "hsl(187 85% 40%)",
//                     },
//                   ].map((s) => (
//                     <div
//                       key={s.label}
//                       className="bg-background rounded-lg px-3 py-2 text-center"
//                     >
//                       <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">
//                         {s.label}
//                       </div>
//                       <div
//                         className="font-display text-lg leading-none"
//                         style={{ color: s.color }}
//                       >
//                         {s.value}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//                 {activeEntry?.date === entry.date && (
//                   <div className="mt-4">
//                     {analysing ? (
//                       <div className="text-xs text-muted-foreground animate-pulse">
//                         🤖 Analysing your body composition…
//                       </div>
//                     ) : analysis ? (
//                       <div className="bg-background border border-primary/20 rounded-xl p-4 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
//                         {analysis}
//                       </div>
//                     ) : null}
//                   </div>
//                 )}
//               </motion.div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* ── About InBody ─────────────────────────────────────────────────── */}
//       <div
//         className="mk2-card"
//         style={{ borderTop: "2px solid hsl(187 85% 40%)" }}
//       >
//         <div className="font-bold text-sm mb-3 flex items-center gap-2">
//           <span
//             className="material-symbols-rounded text-lg"
//             style={{ color: "hsl(187 85% 40%)" }}
//           >
//             monitor_heart
//           </span>
//           About InBody at MK2R
//         </div>
//         <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5 mb-4">
//           {[
//             {
//               icon: "⚡",
//               label: "Skeletal Muscle Mass",
//               color: "hsl(142 72% 37%)",
//             },
//             {
//               icon: "🔥",
//               label: "Body Fat Percentage",
//               color: "hsl(0 84% 51%)",
//             },
//             {
//               icon: "💧",
//               label: "Total Body Water",
//               color: "hsl(187 85% 40%)",
//             },
//             {
//               icon: "📊",
//               label: "Segmental Analysis",
//               color: "hsl(217 91% 53%)",
//             },
//             {
//               icon: "🎯",
//               label: "Visceral Fat Level",
//               color: "hsl(38 92% 44%)",
//             },
//             { icon: "⚖️", label: "Fat Mass (kg)", color: "hsl(38 92% 44%)" },
//           ].map((item) => (
//             <div
//               key={item.label}
//               className="flex items-center gap-2 rounded-lg px-3 py-2.5"
//               style={{
//                 background: `${item.color}12`,
//                 border: `1px solid ${item.color}30`,
//               }}
//             >
//               <span className="text-base">{item.icon}</span>
//               <span className="text-xs font-medium text-foreground">
//                 {item.label}
//               </span>
//             </div>
//           ))}
//         </div>
//         <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
//           <p>
//             MK2 Rivers Fitness uses the{" "}
//             <strong className="text-foreground">
//               InBody body composition analyser
//             </strong>{" "}
//             — a medical-grade scanner that goes far beyond just weight.
//           </p>
//           <p>
//             <strong className="text-foreground">How to scan:</strong> Visit
//             reception at MK2R Ruimsig (29 Peter Rd, Tres Jolie AH, Roodepoort).
//             The scan takes 60 seconds — stand barefoot on the platform and hold
//             the handles.
//           </p>
//           <p>
//             <strong className="text-foreground">Best results tip:</strong> Scan
//             first thing in the morning, before eating or training, after using
//             the bathroom.
//           </p>
//           <div
//             className="rounded-lg px-3 py-2.5 mt-1"
//             style={{
//               background: "hsl(187 85% 40% / 0.08)",
//               border: "1px solid hsl(187 85% 40% / 0.25)",
//             }}
//           >
//             <p className="font-bold" style={{ color: "hsl(187 85% 40%)" }}>
//               📍 MK2R Ruimsig · 29 Peter Rd, Tres Jolie AH, Roodepoort
//             </p>
//             <p className="mt-1">
//               Ask a coach or front desk to assist with your scan.
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
