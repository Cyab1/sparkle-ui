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


