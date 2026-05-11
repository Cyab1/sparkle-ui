import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";
import { Tag } from "@/components/shared/Tag";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, push, get } from "firebase/database";
import { db } from "@/lib/firebase";

// ── Exercise data ─────────────────────────────────────────────────────────────
export type Category = "Weightlifting" | "Gymnastics" | "MetCon" | "Cardio";
export type Gender = "Male" | "Female" | "Other";
export type Level = "Beginner" | "Intermediate" | "RX";
export type MeasurementType = "kg" | "lbs" | "time" | "reps";

interface Exercise {
  exercise_id: string;
  category: Category;
  name: string;
  measurement_type: MeasurementType;
}

let _id = 0;
const mkEx = (cat: Category, name: string, mt: MeasurementType): Exercise => ({
  exercise_id: `ex-${++_id}`,
  category: cat,
  name,
  measurement_type: mt,
});

export const EXERCISES: Exercise[] = [
  ...[
    "Back Squat",
    "Front Squat",
    "Overhead Squat",
    "Deadlift",
    "Sumo Deadlift High Pull",
    "Shoulder Press",
    "Push Press",
    "Push Jerk",
    "Split Jerk",
    "Bench Press",
    "Clean",
    "Power Clean",
    "Squat Clean",
    "Snatch",
    "Power Snatch",
    "Squat Snatch",
    "Clean & Jerk",
    "Thruster",
  ].map((n) => mkEx("Weightlifting", n, "kg")),
  ...[
    "Pull-Ups",
    "Chest-to-Bar",
    "Muscle-Ups (Bar)",
    "Muscle-Ups (Ring)",
    "Handstand Hold",
    "Handstand Walk",
    "HSPU (Strict)",
    "HSPU (Kipping)",
    "Toes-to-Bar",
    "Rope Climbs",
    "L-Sit",
  ].map((n) => mkEx("Gymnastics", n, "reps")),
  ...[
    "Fran",
    "Murph",
    "Helen",
    "Grace",
    "Isabel",
    "Cindy",
    "Annie",
    "Karen",
  ].map((n) => mkEx("MetCon", n, "time")),
  ...[
    "Assault Bike - 10cal",
    "Assault Bike - 20cal",
    "Assault Bike - 50cal",
    "Assault Bike - 100cal",
  ].map((n) => mkEx("Cardio", n, "time")),
  ...["Ski - 250m", "Ski - 500m", "Ski - 1km", "Ski - 2km", "Ski - 5km"].map(
    (n) => mkEx("Cardio", n, "time"),
  ),
  ...["Row - 500m", "Row - 1km", "Row - 2km", "Row - 5km", "Row - 10km"].map(
    (n) => mkEx("Cardio", n, "time"),
  ),
  ...[
    "Run - 400m",
    "Run - 800m",
    "Run - 1km",
    "Run - 3km",
    "Run - 5km",
    "Run - 10km",
    "Run - 21.1km",
    "Run - 42.2km",
  ].map((n) => mkEx("Cardio", n, "time")),
];

export const CATEGORIES: Category[] = [
  "Weightlifting",
  "Gymnastics",
  "MetCon",
  "Cardio",
];
export const LEVELS: Level[] = ["Beginner", "Intermediate", "RX"];

function getExercisesByCategory(cat: Category) {
  return EXERCISES.filter((e) => e.category === cat);
}
function getExerciseById(id: string) {
  return EXERCISES.find((e) => e.exercise_id === id);
}
function getParentName(name: string): string {
  const i = name.indexOf(" - ");
  return i > -1 ? name.substring(0, i) : name;
}
function getVariantLabel(name: string): string | null {
  const i = name.indexOf(" - ");
  return i > -1 ? name.substring(i + 3) : null;
}
function getParentExercises(cat: Category): string[] {
  const seen = new Set<string>();
  return getExercisesByCategory(cat).reduce<string[]>((acc, ex) => {
    const p = getParentName(ex.name);
    if (!seen.has(p)) {
      seen.add(p);
      acc.push(p);
    }
    return acc;
  }, []);
}
function getVariants(cat: Category, parent: string): Exercise[] {
  return getExercisesByCategory(cat).filter(
    (e) => getParentName(e.name) === parent,
  );
}
function hasVariants(cat: Category, parent: string): boolean {
  const v = getVariants(cat, parent);
  return (
    v.length > 1 || (v.length === 1 && getVariantLabel(v[0].name) !== null)
  );
}
function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function parseTimeInput(input: string): number | null {
  const parts = input.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
function getDistanceKm(name: string): number | null {
  const m = name.match(/^(?:Run|Row|Ski) - ([\d.]+)(m|km)$/);
  if (!m) return null;
  return m[2] === "m" ? parseFloat(m[1]) / 1000 : parseFloat(m[1]);
}
function calcPace(totalSec: number, distKm: number): string {
  if (distKm <= 0) return "-";
  const ps = totalSec / distKm;
  const mins = Math.floor(ps / 60);
  const secs = Math.round(ps % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

const PR_PATH = "pr_logbook";

function RankIcon({ i }: { i: number }) {
  if (i === 0) return <span className="text-xl">🥇</span>;
  if (i === 1) return <span className="text-xl">🥈</span>;
  if (i === 2) return <span className="text-xl">🥉</span>;
  return (
    <span className="font-display text-base text-muted-foreground">
      {i + 1}
    </span>
  );
}

function LevelBadge({ level }: { level: Level }) {
  const cfg: Record<Level, { bg: string; color: string; label: string }> = {
    RX: {
      bg: "hsl(20 100% 50% / 0.12)",
      color: "hsl(20 100% 50%)",
      label: "RX",
    },
    Intermediate: {
      bg: "hsl(38 92% 44% / 0.12)",
      color: "hsl(38 92% 44%)",
      label: "Sc",
    },
    Beginner: {
      bg: "hsl(var(--secondary))",
      color: "hsl(var(--muted-foreground))",
      label: "Beg",
    },
  };
  const c = cfg[level];
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PR LEADERBOARD
// ══════════════════════════════════════════════════════════════════════════════
function PRLeaderboard({ currentUid }: { currentUid: string }) {
  const [category, setCategory] = useState<Category>("Weightlifting");
  const [parentEx, setParentEx] = useState<string>(
    () => getParentExercises("Weightlifting")[0] || "",
  );
  const [exerciseId, setExerciseId] = useState<string>("");
  const [gender, setGender] = useState<Gender | "All">("All");
  const [level, setLevel] = useState<Level | "All">("All");
  const [allPRs, setAllPRs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (parentEx && category) {
      const variants = getVariants(category, parentEx);
      if (variants.length === 1) {
        setExerciseId(variants[0].exercise_id);
      } else if (!hasVariants(category, parentEx)) {
        setExerciseId(variants[0]?.exercise_id || "");
      } else {
        setExerciseId("");
      }
    }
  }, [parentEx, category]);

  useEffect(() => {
    const parents = getParentExercises(category);
    setParentEx(parents[0] || "");
  }, [category]);

  useEffect(() => {
    setLoading(true);
    return onValue(ref(db, PR_PATH), (snap) => {
      if (snap.exists()) {
        setAllPRs(
          Object.entries(snap.val()).map(([k, v]: [string, any]) => ({
            firebaseKey: k,
            ...v,
          })),
        );
      } else {
        setAllPRs([]);
      }
      setLoading(false);
    });
  }, []);

  const ex = exerciseId ? getExerciseById(exerciseId) : null;
  const isTime = ex?.measurement_type === "time";
  const isReps = ex?.measurement_type === "reps";
  const distKm = ex ? getDistanceKm(ex.name) : null;
  const variants = category && parentEx ? getVariants(category, parentEx) : [];
  const showVariants = hasVariants(category, parentEx);
  const isBetter = (a: number, b: number) => (isTime ? a < b : a > b);

  const filtered = allPRs.filter((p) => p.exercise_id === exerciseId);
  const bestPerAthlete: Record<string, any> = {};
  filtered.forEach((p) => {
    const existing = bestPerAthlete[p.athlete];
    if (!existing || isBetter(p.value, existing.value)) {
      bestPerAthlete[p.athlete] = p;
    }
  });

  let entries = Object.values(bestPerAthlete);
  if (gender !== "All") entries = entries.filter((e) => e.gender === gender);
  if (level !== "All") entries = entries.filter((e) => e.level === level);
  entries.sort((a, b) => (isTime ? a.value - b.value : b.value - a.value));

  const myEntry = entries.find((e) => e.uid === currentUid);
  const myRank = myEntry ? entries.indexOf(myEntry) : -1;

  const formatPR = (entry: any) => {
    if (!ex) return "";
    if (isTime) return formatTime(entry.value);
    if (isReps) return `${entry.value} reps`;
    return `${entry.value}${entry.unit || (ex.measurement_type === "kg" ? "kg" : "lbs")}`;
  };

  const gapToNext = (myIdx: number) => {
    if (myIdx <= 0 || !ex) return null;
    const above = entries[myIdx - 1];
    if (isTime) return `${formatTime(above.value)} target`;
    if (isReps) return `+${above.value - entries[myIdx].value} reps`;
    return `+${(above.value - entries[myIdx].value).toFixed(1)}${entries[myIdx].unit || ex.measurement_type}`;
  };

  return (
    <div>
      <div className="mk2-card mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer transition-all font-body"
              style={{
                background:
                  category === cat ? "hsl(20 100% 50%)" : "transparent",
                color:
                  category === cat ? "#000" : "hsl(var(--muted-foreground))",
                borderColor:
                  category === cat ? "hsl(20 100% 50%)" : "hsl(var(--border))",
              }}
            >
              {cat === "Weightlifting"
                ? "🏋️"
                : cat === "Gymnastics"
                  ? "🤸"
                  : cat === "MetCon"
                    ? "⏱"
                    : "🏃"}{" "}
              {cat}
            </button>
          ))}
        </div>

        {ex && (
          <div className="text-[11px] text-muted-foreground">
            Measured in:{" "}
            <span className="font-bold text-foreground">
              {isTime
                ? "Time (lower = better)"
                : isReps
                  ? "Reps (higher = better)"
                  : `${ex.measurement_type.toUpperCase()} (higher = better)`}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Exercise
            </div>
            <select
              value={parentEx}
              onChange={(e) => setParentEx(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-body outline-none text-foreground"
            >
              {getParentExercises(category).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {showVariants && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Distance / Target
              </div>
              <select
                value={exerciseId}
                onChange={(e) => setExerciseId(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-body outline-none text-foreground"
              >
                <option value="">Select…</option>
                {variants.map((v) => (
                  <option key={v.exercise_id} value={v.exercise_id}>
                    {getVariantLabel(v.name) || v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Gender
            </div>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-body outline-none text-foreground"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Level
            </div>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as any)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-body outline-none text-foreground"
            >
              <option value="All">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate (Scaled)</option>
              <option value="RX">RX</option>
            </select>
          </div>
        </div>
      </div>

      {myEntry && myRank >= 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mk2-card mb-4 border-l-[3px] border-primary"
        >
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                Your Ranking
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-[48px] text-primary leading-none">
                  #{myRank + 1}
                </span>
                <div>
                  <div className="font-bold">{myEntry.athlete}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Tag color="hsl(20 100% 50%)">{formatPR(myEntry)}</Tag>
                    <LevelBadge level={myEntry.level} />
                  </div>
                </div>
              </div>
            </div>
            {myRank > 0 && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">
                  To reach #{myRank}
                </div>
                <div className="text-sm font-bold text-primary">
                  {gapToNext(myRank)}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {!exerciseId ? (
        <div className="mk2-card text-center py-10 text-muted-foreground text-sm">
          <div className="text-3xl mb-3">🏋️</div>
          <div className="font-bold mb-1">
            Select an exercise to see rankings
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : entries.length === 0 ? (
        <div className="mk2-card text-center py-10 text-muted-foreground text-sm">
          <div className="text-3xl mb-3">🏆</div>
          <div className="font-bold mb-1">No entries yet</div>
          <div className="text-xs">
            Log your PR to be the first on the board!
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div
            className="grid px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            style={{ gridTemplateColumns: "2.5rem 1fr 5rem 4rem 5rem" }}
          >
            <span>#</span>
            <span>Athlete</span>
            <span className="text-right">PR</span>
            <span className="text-center">Level</span>
            <span className="text-right hidden sm:block">Date</span>
          </div>

          {entries.slice(0, 20).map((entry, i) => {
            const isMe = entry.uid === currentUid;
            const prDisplay = formatPR(entry);
            const pace =
              isTime && distKm ? calcPace(entry.value, distKm) : null;
            return (
              <motion.div
                key={entry.firebaseKey || i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="grid px-4 py-3 border-t border-border items-center transition-colors hover:bg-secondary/30"
                style={{
                  gridTemplateColumns: "2.5rem 1fr 5rem 4rem 5rem",
                  background: isMe ? "hsl(20 100% 50% / 0.06)" : undefined,
                }}
              >
                <span className="flex items-center justify-center w-8 h-8">
                  <RankIcon i={i} />
                </span>
                <span className="font-bold text-sm flex items-center gap-2 flex-wrap min-w-0 truncate">
                  {entry.athlete}
                  {isMe && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 shrink-0">
                      YOU
                    </span>
                  )}
                </span>
                <div className="text-right">
                  <div
                    className="font-display text-base"
                    style={{ color: "hsl(20 100% 50%)" }}
                  >
                    {prDisplay}
                  </div>
                  {pace && (
                    <div className="text-[10px] text-primary/70">{pace}</div>
                  )}
                </div>
                <span className="text-center">
                  <LevelBadge level={entry.level} />
                </span>
                <span className="text-right text-[11px] text-muted-foreground hidden sm:block">
                  {entry.date_logged || entry.date || ""}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CHECK-IN LEADERBOARD
// ══════════════════════════════════════════════════════════════════════════════
function CheckInLeaderboard({
  users,
  currentUid,
}: {
  users: any[];
  currentUid: string;
}) {
  const sorted = [...users].sort((a, b) => b.checkIns - a.checkIns);
  const top = sorted.slice(0, 15);
  const meIdx = sorted.findIndex((u) => u.uid === currentUid);
  const me = meIdx >= 0 ? sorted[meIdx] : null;

  return (
    <div>
      {me && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mk2-card mb-5 border-l-[3px] border-primary"
        >
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                Your Ranking
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-[48px] text-primary leading-none">
                  #{meIdx + 1}
                </span>
                <div>
                  <div className="font-bold">{me.name}</div>
                  <Tag color="hsl(20 100% 50%)">
                    {me.checkIns} check-in{me.checkIns !== 1 ? "s" : ""}
                  </Tag>
                </div>
              </div>
            </div>
            {meIdx === 0 ? (
              <div className="text-sm font-bold text-primary">👑 TOP!</div>
            ) : (
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">
                  To reach #{meIdx}
                </div>
                <div className="text-sm font-bold text-primary">
                  +{sorted[meIdx - 1].checkIns - me.checkIns + 1} check-ins
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
      <div className="text-xs text-muted-foreground mb-4 px-1">
        Ranked by total gym check-ins. Every visit counts!
      </div>
      <div className="flex flex-col gap-2">
        {top.map((user, i) => (
          <motion.div
            key={user.uid}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="mk2-card flex items-center gap-3 py-3"
            style={{
              borderLeft: i < 3 ? "3px solid hsl(20 100% 50%)" : undefined,
              background:
                user.uid === currentUid ? "hsl(20 100% 50% / 0.06)" : undefined,
            }}
          >
            <div className="w-8 text-center shrink-0">
              <RankIcon i={i} />
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-display text-sm shrink-0"
              style={{
                background:
                  user.uid === currentUid
                    ? "hsl(20 100% 50%)"
                    : "hsl(var(--secondary))",
                color:
                  user.uid === currentUid ? "#000" : "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0 font-bold text-sm flex items-center gap-2 flex-wrap">
              {user.name}
              {user.uid === currentUid && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                  YOU
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <div
                className="font-display text-xl"
                style={{ color: "hsl(20 100% 50%)" }}
              >
                {user.checkIns}
              </div>
              <div className="text-[10px] text-muted-foreground">check-ins</div>
            </div>
          </motion.div>
        ))}
        {top.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No check-in data yet — be the first! 🏃
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CHALLENGES TAB — metric-aware score input
// ══════════════════════════════════════════════════════════════════════════════
export const CHALLENGE_METRICS = [
  { value: "reps", label: "Reps", placeholder: "e.g. 42", isTime: false },
  { value: "kg", label: "Weight (kg)", placeholder: "e.g. 100", isTime: false },
  {
    value: "lbs",
    label: "Weight (lbs)",
    placeholder: "e.g. 225",
    isTime: false,
  },
  {
    value: "time",
    label: "Time (mm:ss)",
    placeholder: "e.g. 4:30",
    isTime: true,
  },
  {
    value: "distance_m",
    label: "Distance (m)",
    placeholder: "e.g. 500",
    isTime: false,
  },
  {
    value: "distance_km",
    label: "Distance (km)",
    placeholder: "e.g. 5.2",
    isTime: false,
  },
  {
    value: "calories",
    label: "Calories",
    placeholder: "e.g. 100",
    isTime: false,
  },
  {
    value: "rounds",
    label: "Rounds + Reps",
    placeholder: "e.g. 5 rounds + 3 reps",
    isTime: false,
  },
] as const;

function ChallengesLeaderboard({ currentUid }: { currentUid: string }) {
  const { user, toast } = useAuth();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [entries, setEntries] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [submitForm, setSubmitForm] = useState<{
    challengeId: string;
    score: string;
    metric: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return onValue(ref(db, "challenges"), (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val())
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter((c) => c.active)
          .sort((a, b) => a.name.localeCompare(b.name));
        setChallenges(list);
      } else setChallenges([]);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "challenge_entries"), (snap) => {
      if (!snap.exists()) return;
      const raw = snap.val();
      const grouped: Record<string, any[]> = {};
      Object.entries(raw).forEach(([cId, entriesRaw]: [string, any]) => {
        const best: Record<string, any> = {};
        Object.values(entriesRaw).forEach((e: any) => {
          if (!best[e.uid] || e.score > best[e.uid].score) best[e.uid] = e;
        });
        grouped[cId] = Object.values(best).sort((a, b) => b.score - a.score);
      });
      setEntries(grouped);
    });
  }, []);

  const submitScore = async () => {
    if (!submitForm || !user) return;
    const metricDef = CHALLENGE_METRICS.find(
      (m) => m.value === submitForm.metric,
    );
    let numericScore: number;

    if (metricDef?.isTime) {
      const parsed = parseTimeInput(submitForm.score);
      if (parsed === null)
        return toast("Enter time as mm:ss or hh:mm:ss", "error");
      numericScore = parsed;
    } else {
      numericScore = Number(submitForm.score);
      if (!submitForm.score || isNaN(numericScore) || numericScore <= 0)
        return toast("Enter a valid score", "error");
    }

    setSubmitting(true);
    try {
      await push(ref(db, `challenge_entries/${submitForm.challengeId}`), {
        uid: user.uid,
        name: user.name,
        score: numericScore,
        rawInput: submitForm.score,
        submittedAt: Date.now(),
      });
      toast("Score submitted! 🏁", "success");
      setSubmitForm(null);
    } catch {
      toast("Failed to submit", "error");
    }
    setSubmitting(false);
  };

  // Format display score based on metric
  const formatScore = (score: number, metric: string) => {
    if (metric === "time") return formatTime(score);
    return `${score} ${metric}`;
  };

  if (loading)
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        Loading challenges…
      </div>
    );
  if (challenges.length === 0)
    return (
      <div className="mk2-card text-center py-12">
        <div className="text-4xl mb-3">🏁</div>
        <div className="font-bold mb-1">No Active Challenges</div>
        <div className="text-xs text-muted-foreground">
          Check back soon — admin will post new challenges here.
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {challenges.map((challenge, ci) => {
        const cEntries = entries[challenge.id] ?? [];
        const myEntry = cEntries.find((e) => e.uid === currentUid);
        const myRank = myEntry
          ? cEntries.findIndex((e) => e.uid === currentUid) + 1
          : null;
        const isExpanded = expanded === challenge.id;
        const isSubmitting = submitForm?.challengeId === challenge.id;
        const metricDef = CHALLENGE_METRICS.find(
          (m) => m.value === challenge.metric,
        );

        return (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.08 }}
            className="mk2-card overflow-hidden"
            style={{ borderTop: `3px solid ${challenge.color}` }}
          >
            <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
              <div>
                <div className="font-display text-lg tracking-wide mb-1">
                  {challenge.name}
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  {challenge.description}
                </div>
                <div className="text-xs text-muted-foreground">
                  📅 {challenge.startDate} → {challenge.endDate} · 📏{" "}
                  {metricDef?.label || challenge.metric}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-muted-foreground mb-1">Prize</div>
                <div
                  className="text-sm font-bold"
                  style={{ color: challenge.color }}
                >
                  {challenge.prize}
                </div>
              </div>
            </div>

            {myEntry && myRank && (
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg mb-3"
                style={{
                  background: `${challenge.color}12`,
                  border: `1px solid ${challenge.color}30`,
                }}
              >
                <span
                  className="font-display text-2xl"
                  style={{ color: challenge.color }}
                >
                  #{myRank}
                </span>
                <div>
                  <div className="font-bold text-xs">Your Score</div>
                  <div
                    className="font-display text-lg"
                    style={{ color: challenge.color }}
                  >
                    {formatScore(myEntry.score, challenge.metric)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setExpanded(isExpanded ? null : challenge.id)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                style={{
                  background: "hsl(var(--secondary))",
                  color: "hsl(var(--foreground))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                👥 {cEntries.length} entries {isExpanded ? "▲" : "▼"}
              </button>
              <button
                onClick={() =>
                  setSubmitForm(
                    isSubmitting
                      ? null
                      : {
                          challengeId: challenge.id,
                          score: "",
                          metric: challenge.metric,
                        },
                  )
                }
                className="text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                style={{
                  background: isSubmitting
                    ? "hsl(var(--secondary))"
                    : challenge.color,
                  color: isSubmitting ? "hsl(var(--foreground))" : "#000",
                  border: isSubmitting
                    ? "1px solid hsl(var(--border))"
                    : "none",
                }}
              >
                {isSubmitting ? "✕ Cancel" : "＋ Submit Score"}
              </button>
            </div>

            <AnimatePresence>
              {isSubmitting && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  <div className="flex gap-2 items-center pt-1">
                    <input
                      type={metricDef?.isTime ? "text" : "number"}
                      placeholder={
                        metricDef?.placeholder || `Score in ${challenge.metric}`
                      }
                      value={submitForm?.score ?? ""}
                      onChange={(e) =>
                        setSubmitForm((f) =>
                          f ? { ...f, score: e.target.value } : f,
                        )
                      }
                      className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none"
                    />
                    <button
                      onClick={submitScore}
                      disabled={submitting}
                      className="px-4 py-2 rounded-lg font-bold text-xs border-none cursor-pointer"
                      style={{
                        background: challenge.color,
                        color: "#000",
                        opacity: submitting ? 0.7 : 1,
                      }}
                    >
                      {submitting ? "…" : "Submit →"}
                    </button>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1.5">
                    {metricDef?.isTime
                      ? "Enter as mm:ss or hh:mm:ss"
                      : `Enter your score in ${metricDef?.label || challenge.metric}`}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  <div
                    className="pt-3"
                    style={{ borderTop: "1px solid hsl(var(--border))" }}
                  >
                    {cEntries.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-3 text-center">
                        No entries yet — be the first!
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {cEntries.slice(0, 10).map((entry, i) => (
                          <div
                            key={entry.uid}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                            style={{
                              background:
                                entry.uid === currentUid
                                  ? `${challenge.color}12`
                                  : "hsl(var(--secondary))",
                              border:
                                entry.uid === currentUid
                                  ? `1px solid ${challenge.color}30`
                                  : "1px solid transparent",
                            }}
                          >
                            <span className="font-display text-base w-6 text-center">
                              {i === 0
                                ? "🥇"
                                : i === 1
                                  ? "🥈"
                                  : i === 2
                                    ? "🥉"
                                    : `${i + 1}.`}
                            </span>
                            <span className="flex-1 font-bold">
                              {entry.name}
                              {entry.uid === currentUid && (
                                <span
                                  className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                  style={{
                                    background: `${challenge.color}25`,
                                    color: challenge.color,
                                  }}
                                >
                                  YOU
                                </span>
                              )}
                            </span>
                            <span
                              className="font-display text-base"
                              style={{ color: challenge.color }}
                            >
                              {formatScore(entry.score, challenge.metric)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
      <div className="mk2-card bg-secondary/50">
        <div className="font-bold text-sm mb-2">How Challenges Work</div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          Submit your score for any active challenge. Only your best score
          counts. Winners announced when the challenge ends.
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN — hooks order fixed, early return moved after all hooks
// ══════════════════════════════════════════════════════════════════════════════
export function Leaderboard() {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const [tab, setTab] = useState<"pr" | "checkin" | "challenges">("pr");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── All hooks must run before any early return ────────────────────────────
  useEffect(() => {
    return onValue(ref(db, "mk2_users"), (snap) => {
      if (snap.exists()) {
        const users = Object.entries(snap.val()).map(
          ([uid, data]: [string, any]) => ({
            uid,
            name: data.name || "Unnamed",
            checkIns: Array.isArray(data.checkIns)
              ? data.checkIns.length
              : typeof data.checkIns === "number"
                ? data.checkIns
                : 0,
            points: data.points ?? 0,
          }),
        );
        setAllUsers(users);
      } else setAllUsers([]);
      setLoading(false);
    });
  }, []);

  // Safe to early-return after all hooks
  if (!user) return null;

  const TABS = [
    { id: "pr", label: "🏆 PR Board" },
    { id: "checkin", label: "✅ Check-ins" },
    { id: "challenges", label: "🏁 Challenges" },
  ];

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      {/* ── "Leader Board" — two words, two lines, fits container ──────── */}
      <PageTitle sub="A Little Healthy Competition">
        Leader <span className="text-primary block sm:inline">Board</span>
      </PageTitle>

      <div className="flex bg-secondary rounded-lg p-1 gap-1 mb-6 w-full overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className="flex-1 py-2 px-2 rounded-md border-none cursor-pointer font-body font-bold text-xs uppercase tracking-wide transition-all duration-150 whitespace-nowrap"
            style={{
              background: tab === t.id ? "hsl(20 100% 50%)" : "transparent",
              color: tab === t.id ? "#000" : "hsl(var(--muted-foreground))",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && tab === "checkin" ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : (
        <>
          {tab === "pr" && <PRLeaderboard currentUid={user.uid} />}
          {tab === "checkin" && (
            <CheckInLeaderboard users={allUsers} currentUid={user.uid} />
          )}
          {tab === "challenges" && (
            <ChallengesLeaderboard currentUid={user.uid} />
          )}
        </>
      )}
    </div>
  );
}

// import { useState, useEffect } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { Tag } from "@/components/shared/Tag";
// import { motion, AnimatePresence } from "framer-motion";
// import { ref, onValue, push, get } from "firebase/database";
// import { db } from "@/lib/firebase";

// // ── Exercise data ─────────────────────────────────────────────────────────────
// export type Category = "Weightlifting" | "Gymnastics" | "MetCon" | "Cardio";
// export type Gender = "Male" | "Female" | "Other";
// export type Level = "Beginner" | "Intermediate" | "RX";
// export type MeasurementType = "kg" | "lbs" | "time" | "reps";

// interface Exercise {
//   exercise_id: string;
//   category: Category;
//   name: string;
//   measurement_type: MeasurementType;
// }

// let _id = 0;
// const mkEx = (cat: Category, name: string, mt: MeasurementType): Exercise => ({
//   exercise_id: `ex-${++_id}`,
//   category: cat,
//   name,
//   measurement_type: mt,
// });

// export const EXERCISES: Exercise[] = [
//   ...[
//     "Back Squat",
//     "Front Squat",
//     "Overhead Squat",
//     "Deadlift",
//     "Sumo Deadlift High Pull",
//     "Shoulder Press",
//     "Push Press",
//     "Push Jerk",
//     "Split Jerk",
//     "Bench Press",
//     "Clean",
//     "Power Clean",
//     "Squat Clean",
//     "Snatch",
//     "Power Snatch",
//     "Squat Snatch",
//     "Clean & Jerk",
//     "Thruster",
//   ].map((n) => mkEx("Weightlifting", n, "kg")),
//   ...[
//     "Pull-Ups",
//     "Chest-to-Bar",
//     "Muscle-Ups (Bar)",
//     "Muscle-Ups (Ring)",
//     "Handstand Hold",
//     "Handstand Walk",
//     "HSPU (Strict)",
//     "HSPU (Kipping)",
//     "Toes-to-Bar",
//     "Rope Climbs",
//     "L-Sit",
//   ].map((n) => mkEx("Gymnastics", n, "reps")),
//   ...[
//     "Fran",
//     "Murph",
//     "Helen",
//     "Grace",
//     "Isabel",
//     "Cindy",
//     "Annie",
//     "Karen",
//   ].map((n) => mkEx("MetCon", n, "time")),
//   ...[
//     "Assault Bike - 10cal",
//     "Assault Bike - 20cal",
//     "Assault Bike - 50cal",
//     "Assault Bike - 100cal",
//   ].map((n) => mkEx("Cardio", n, "time")),
//   ...["Ski - 250m", "Ski - 500m", "Ski - 1km", "Ski - 2km", "Ski - 5km"].map(
//     (n) => mkEx("Cardio", n, "time"),
//   ),
//   ...["Row - 500m", "Row - 1km", "Row - 2km", "Row - 5km", "Row - 10km"].map(
//     (n) => mkEx("Cardio", n, "time"),
//   ),
//   ...[
//     "Run - 400m",
//     "Run - 800m",
//     "Run - 1km",
//     "Run - 3km",
//     "Run - 5km",
//     "Run - 10km",
//     "Run - 21.1km",
//     "Run - 42.2km",
//   ].map((n) => mkEx("Cardio", n, "time")),
// ];

// export const CATEGORIES: Category[] = [
//   "Weightlifting",
//   "Gymnastics",
//   "MetCon",
//   "Cardio",
// ];
// export const LEVELS: Level[] = ["Beginner", "Intermediate", "RX"];

// function getExercisesByCategory(cat: Category) {
//   return EXERCISES.filter((e) => e.category === cat);
// }
// function getExerciseById(id: string) {
//   return EXERCISES.find((e) => e.exercise_id === id);
// }
// function getParentName(name: string): string {
//   const i = name.indexOf(" - ");
//   return i > -1 ? name.substring(0, i) : name;
// }
// function getVariantLabel(name: string): string | null {
//   const i = name.indexOf(" - ");
//   return i > -1 ? name.substring(i + 3) : null;
// }
// function getParentExercises(cat: Category): string[] {
//   const seen = new Set<string>();
//   return getExercisesByCategory(cat).reduce<string[]>((acc, ex) => {
//     const p = getParentName(ex.name);
//     if (!seen.has(p)) {
//       seen.add(p);
//       acc.push(p);
//     }
//     return acc;
//   }, []);
// }
// function getVariants(cat: Category, parent: string): Exercise[] {
//   return getExercisesByCategory(cat).filter(
//     (e) => getParentName(e.name) === parent,
//   );
// }
// function hasVariants(cat: Category, parent: string): boolean {
//   const v = getVariants(cat, parent);
//   return (
//     v.length > 1 || (v.length === 1 && getVariantLabel(v[0].name) !== null)
//   );
// }
// function formatTime(totalSeconds: number): string {
//   const h = Math.floor(totalSeconds / 3600);
//   const m = Math.floor((totalSeconds % 3600) / 60);
//   const s = Math.round(totalSeconds % 60);
//   if (h > 0)
//     return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
//   return `${m}:${String(s).padStart(2, "0")}`;
// }
// function parseTimeInput(input: string): number | null {
//   const parts = input.split(":").map(Number);
//   if (parts.some(isNaN)) return null;
//   if (parts.length === 2) return parts[0] * 60 + parts[1];
//   if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
//   return null;
// }
// function getDistanceKm(name: string): number | null {
//   const m = name.match(/^(?:Run|Row|Ski) - ([\d.]+)(m|km)$/);
//   if (!m) return null;
//   return m[2] === "m" ? parseFloat(m[1]) / 1000 : parseFloat(m[1]);
// }
// function calcPace(totalSec: number, distKm: number): string {
//   if (distKm <= 0) return "-";
//   const ps = totalSec / distKm;
//   const mins = Math.floor(ps / 60);
//   const secs = Math.round(ps % 60);
//   return `${mins}:${String(secs).padStart(2, "0")} /km`;
// }

// const PR_PATH = "pr_logbook";

// function RankIcon({ i }: { i: number }) {
//   if (i === 0) return <span className="text-xl">🥇</span>;
//   if (i === 1) return <span className="text-xl">🥈</span>;
//   if (i === 2) return <span className="text-xl">🥉</span>;
//   return (
//     <span className="font-display text-base text-muted-foreground">
//       {i + 1}
//     </span>
//   );
// }

// function LevelBadge({ level }: { level: Level }) {
//   const cfg: Record<Level, { bg: string; color: string; label: string }> = {
//     RX: {
//       bg: "hsl(20 100% 50% / 0.12)",
//       color: "hsl(20 100% 50%)",
//       label: "RX",
//     },
//     Intermediate: {
//       bg: "hsl(38 92% 44% / 0.12)",
//       color: "hsl(38 92% 44%)",
//       label: "Sc",
//     },
//     Beginner: {
//       bg: "hsl(var(--secondary))",
//       color: "hsl(var(--muted-foreground))",
//       label: "Beg",
//     },
//   };
//   const c = cfg[level];
//   return (
//     <span
//       className="text-[10px] font-bold px-2 py-0.5 rounded-full"
//       style={{ background: c.bg, color: c.color }}
//     >
//       {c.label}
//     </span>
//   );
// }

// // ══════════════════════════════════════════════════════════════════════════════
// // PR LEADERBOARD
// // ══════════════════════════════════════════════════════════════════════════════
// function PRLeaderboard({ currentUid }: { currentUid: string }) {
//   const [category, setCategory] = useState<Category>("Weightlifting");
//   const [parentEx, setParentEx] = useState<string>(
//     () => getParentExercises("Weightlifting")[0] || "",
//   );
//   const [exerciseId, setExerciseId] = useState<string>("");
//   const [gender, setGender] = useState<Gender | "All">("All");
//   const [level, setLevel] = useState<Level | "All">("All");
//   const [allPRs, setAllPRs] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (parentEx && category) {
//       const variants = getVariants(category, parentEx);
//       if (variants.length === 1) {
//         setExerciseId(variants[0].exercise_id);
//       } else if (!hasVariants(category, parentEx)) {
//         setExerciseId(variants[0]?.exercise_id || "");
//       } else {
//         setExerciseId("");
//       }
//     }
//   }, [parentEx, category]);

//   useEffect(() => {
//     const parents = getParentExercises(category);
//     setParentEx(parents[0] || "");
//   }, [category]);

//   useEffect(() => {
//     setLoading(true);
//     return onValue(ref(db, PR_PATH), (snap) => {
//       if (snap.exists()) {
//         setAllPRs(
//           Object.entries(snap.val()).map(([k, v]: [string, any]) => ({
//             firebaseKey: k,
//             ...v,
//           })),
//         );
//       } else {
//         setAllPRs([]);
//       }
//       setLoading(false);
//     });
//   }, []);

//   const ex = exerciseId ? getExerciseById(exerciseId) : null;
//   const isTime = ex?.measurement_type === "time";
//   const isReps = ex?.measurement_type === "reps";
//   const distKm = ex ? getDistanceKm(ex.name) : null;
//   const variants = category && parentEx ? getVariants(category, parentEx) : [];
//   const showVariants = hasVariants(category, parentEx);
//   const isBetter = (a: number, b: number) => (isTime ? a < b : a > b);

//   const filtered = allPRs.filter((p) => p.exercise_id === exerciseId);
//   const bestPerAthlete: Record<string, any> = {};
//   filtered.forEach((p) => {
//     const existing = bestPerAthlete[p.athlete];
//     if (!existing || isBetter(p.value, existing.value)) {
//       bestPerAthlete[p.athlete] = p;
//     }
//   });

//   let entries = Object.values(bestPerAthlete);
//   if (gender !== "All") entries = entries.filter((e) => e.gender === gender);
//   if (level !== "All") entries = entries.filter((e) => e.level === level);
//   entries.sort((a, b) => (isTime ? a.value - b.value : b.value - a.value));

//   const myEntry = entries.find((e) => e.uid === currentUid);
//   const myRank = myEntry ? entries.indexOf(myEntry) : -1;

//   const formatPR = (entry: any) => {
//     if (!ex) return "";
//     if (isTime) return formatTime(entry.value);
//     if (isReps) return `${entry.value} reps`;
//     return `${entry.value}${entry.unit || (ex.measurement_type === "kg" ? "kg" : "lbs")}`;
//   };

//   const gapToNext = (myIdx: number) => {
//     if (myIdx <= 0 || !ex) return null;
//     const above = entries[myIdx - 1];
//     if (isTime) return `${formatTime(above.value)} target`;
//     if (isReps) return `+${above.value - entries[myIdx].value} reps`;
//     return `+${(above.value - entries[myIdx].value).toFixed(1)}${entries[myIdx].unit || ex.measurement_type}`;
//   };

//   return (
//     <div>
//       <div className="mk2-card mb-4 flex flex-col gap-3">
//         <div className="flex flex-wrap gap-1.5">
//           {CATEGORIES.map((cat) => (
//             <button
//               key={cat}
//               onClick={() => setCategory(cat)}
//               className="px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer transition-all font-body"
//               style={{
//                 background:
//                   category === cat ? "hsl(20 100% 50%)" : "transparent",
//                 color:
//                   category === cat ? "#000" : "hsl(var(--muted-foreground))",
//                 borderColor:
//                   category === cat ? "hsl(20 100% 50%)" : "hsl(var(--border))",
//               }}
//             >
//               {cat === "Weightlifting"
//                 ? "🏋️"
//                 : cat === "Gymnastics"
//                   ? "🤸"
//                   : cat === "MetCon"
//                     ? "⏱"
//                     : "🏃"}{" "}
//               {cat}
//             </button>
//           ))}
//         </div>

//         {ex && (
//           <div className="text-[11px] text-muted-foreground">
//             Measured in:{" "}
//             <span className="font-bold text-foreground">
//               {isTime
//                 ? "Time (lower = better)"
//                 : isReps
//                   ? "Reps (higher = better)"
//                   : `${ex.measurement_type.toUpperCase()} (higher = better)`}
//             </span>
//           </div>
//         )}

//         <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
//           <div>
//             <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
//               Exercise
//             </div>
//             <select
//               value={parentEx}
//               onChange={(e) => setParentEx(e.target.value)}
//               className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-body outline-none text-foreground"
//             >
//               {getParentExercises(category).map((p) => (
//                 <option key={p} value={p}>
//                   {p}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {showVariants && (
//             <div>
//               <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
//                 Distance / Target
//               </div>
//               <select
//                 value={exerciseId}
//                 onChange={(e) => setExerciseId(e.target.value)}
//                 className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-body outline-none text-foreground"
//               >
//                 <option value="">Select…</option>
//                 {variants.map((v) => (
//                   <option key={v.exercise_id} value={v.exercise_id}>
//                     {getVariantLabel(v.name) || v.name}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           )}

//           <div>
//             <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
//               Gender
//             </div>
//             <select
//               value={gender}
//               onChange={(e) => setGender(e.target.value as any)}
//               className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-body outline-none text-foreground"
//             >
//               <option value="All">All Genders</option>
//               <option value="Male">Male</option>
//               <option value="Female">Female</option>
//               <option value="Other">Other</option>
//             </select>
//           </div>

//           <div>
//             <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
//               Level
//             </div>
//             <select
//               value={level}
//               onChange={(e) => setLevel(e.target.value as any)}
//               className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-body outline-none text-foreground"
//             >
//               <option value="All">All Levels</option>
//               <option value="Beginner">Beginner</option>
//               <option value="Intermediate">Intermediate (Scaled)</option>
//               <option value="RX">RX</option>
//             </select>
//           </div>
//         </div>
//       </div>

//       {myEntry && myRank >= 0 && (
//         <motion.div
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="mk2-card mb-4 border-l-[3px] border-primary"
//         >
//           <div className="flex justify-between items-center flex-wrap gap-3">
//             <div>
//               <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
//                 Your Ranking
//               </div>
//               <div className="flex items-center gap-3">
//                 <span className="font-display text-[48px] text-primary leading-none">
//                   #{myRank + 1}
//                 </span>
//                 <div>
//                   <div className="font-bold">{myEntry.athlete}</div>
//                   <div className="flex items-center gap-2 mt-0.5">
//                     <Tag color="hsl(20 100% 50%)">{formatPR(myEntry)}</Tag>
//                     <LevelBadge level={myEntry.level} />
//                   </div>
//                 </div>
//               </div>
//             </div>
//             {myRank > 0 && (
//               <div className="text-right">
//                 <div className="text-xs text-muted-foreground mb-1">
//                   To reach #{myRank}
//                 </div>
//                 <div className="text-sm font-bold text-primary">
//                   {gapToNext(myRank)}
//                 </div>
//               </div>
//             )}
//           </div>
//         </motion.div>
//       )}

//       {!exerciseId ? (
//         <div className="mk2-card text-center py-10 text-muted-foreground text-sm">
//           <div className="text-3xl mb-3">🏋️</div>
//           <div className="font-bold mb-1">
//             Select an exercise to see rankings
//           </div>
//         </div>
//       ) : loading ? (
//         <div className="text-center py-10 text-muted-foreground text-sm">
//           Loading…
//         </div>
//       ) : entries.length === 0 ? (
//         <div className="mk2-card text-center py-10 text-muted-foreground text-sm">
//           <div className="text-3xl mb-3">🏆</div>
//           <div className="font-bold mb-1">No entries yet</div>
//           <div className="text-xs">
//             Log your PR to be the first on the board!
//           </div>
//         </div>
//       ) : (
//         <div className="bg-card border border-border rounded-xl overflow-hidden">
//           <div
//             className="grid px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
//             style={{ gridTemplateColumns: "2.5rem 1fr 5rem 4rem 5rem" }}
//           >
//             <span>#</span>
//             <span>Athlete</span>
//             <span className="text-right">PR</span>
//             <span className="text-center">Level</span>
//             <span className="text-right hidden sm:block">Date</span>
//           </div>

//           {entries.slice(0, 20).map((entry, i) => {
//             const isMe = entry.uid === currentUid;
//             const prDisplay = formatPR(entry);
//             const pace =
//               isTime && distKm ? calcPace(entry.value, distKm) : null;
//             return (
//               <motion.div
//                 key={entry.firebaseKey || i}
//                 initial={{ opacity: 0, x: -6 }}
//                 animate={{ opacity: 1, x: 0 }}
//                 transition={{ delay: i * 0.03 }}
//                 className="grid px-4 py-3 border-t border-border items-center transition-colors hover:bg-secondary/30"
//                 style={{
//                   gridTemplateColumns: "2.5rem 1fr 5rem 4rem 5rem",
//                   background: isMe ? "hsl(20 100% 50% / 0.06)" : undefined,
//                 }}
//               >
//                 <span className="flex items-center justify-center w-8 h-8">
//                   <RankIcon i={i} />
//                 </span>
//                 <span className="font-bold text-sm flex items-center gap-2 flex-wrap min-w-0 truncate">
//                   {entry.athlete}
//                   {isMe && (
//                     <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 shrink-0">
//                       YOU
//                     </span>
//                   )}
//                 </span>
//                 <div className="text-right">
//                   <div
//                     className="font-display text-base"
//                     style={{ color: "hsl(20 100% 50%)" }}
//                   >
//                     {prDisplay}
//                   </div>
//                   {pace && (
//                     <div className="text-[10px] text-primary/70">{pace}</div>
//                   )}
//                 </div>
//                 <span className="text-center">
//                   <LevelBadge level={entry.level} />
//                 </span>
//                 <span className="text-right text-[11px] text-muted-foreground hidden sm:block">
//                   {entry.date_logged || entry.date || ""}
//                 </span>
//               </motion.div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════════════════
// // CHECK-IN LEADERBOARD
// // ══════════════════════════════════════════════════════════════════════════════
// function CheckInLeaderboard({
//   users,
//   currentUid,
// }: {
//   users: any[];
//   currentUid: string;
// }) {
//   const sorted = [...users].sort((a, b) => b.checkIns - a.checkIns);
//   const top = sorted.slice(0, 15);
//   const meIdx = sorted.findIndex((u) => u.uid === currentUid);
//   const me = meIdx >= 0 ? sorted[meIdx] : null;

//   return (
//     <div>
//       {me && (
//         <motion.div
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="mk2-card mb-5 border-l-[3px] border-primary"
//         >
//           <div className="flex justify-between items-center flex-wrap gap-3">
//             <div>
//               <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
//                 Your Ranking
//               </div>
//               <div className="flex items-center gap-3">
//                 <span className="font-display text-[48px] text-primary leading-none">
//                   #{meIdx + 1}
//                 </span>
//                 <div>
//                   <div className="font-bold">{me.name}</div>
//                   <Tag color="hsl(20 100% 50%)">
//                     {me.checkIns} check-in{me.checkIns !== 1 ? "s" : ""}
//                   </Tag>
//                 </div>
//               </div>
//             </div>
//             {meIdx === 0 ? (
//               <div className="text-sm font-bold text-primary">👑 TOP!</div>
//             ) : (
//               <div className="text-right">
//                 <div className="text-xs text-muted-foreground mb-1">
//                   To reach #{meIdx}
//                 </div>
//                 <div className="text-sm font-bold text-primary">
//                   +{sorted[meIdx - 1].checkIns - me.checkIns + 1} check-ins
//                 </div>
//               </div>
//             )}
//           </div>
//         </motion.div>
//       )}
//       <div className="text-xs text-muted-foreground mb-4 px-1">
//         Ranked by total gym check-ins. Every visit counts!
//       </div>
//       <div className="flex flex-col gap-2">
//         {top.map((user, i) => (
//           <motion.div
//             key={user.uid}
//             initial={{ opacity: 0, x: -8 }}
//             animate={{ opacity: 1, x: 0 }}
//             transition={{ delay: i * 0.04 }}
//             className="mk2-card flex items-center gap-3 py-3"
//             style={{
//               borderLeft: i < 3 ? "3px solid hsl(20 100% 50%)" : undefined,
//               background:
//                 user.uid === currentUid ? "hsl(20 100% 50% / 0.06)" : undefined,
//             }}
//           >
//             <div className="w-8 text-center shrink-0">
//               <RankIcon i={i} />
//             </div>
//             <div
//               className="w-8 h-8 rounded-full flex items-center justify-center font-display text-sm shrink-0"
//               style={{
//                 background:
//                   user.uid === currentUid
//                     ? "hsl(20 100% 50%)"
//                     : "hsl(var(--secondary))",
//                 color:
//                   user.uid === currentUid ? "#000" : "hsl(var(--foreground))",
//                 border: "1px solid hsl(var(--border))",
//               }}
//             >
//               {user.name[0]}
//             </div>
//             <div className="flex-1 min-w-0 font-bold text-sm flex items-center gap-2 flex-wrap">
//               {user.name}
//               {user.uid === currentUid && (
//                 <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
//                   YOU
//                 </span>
//               )}
//             </div>
//             <div className="text-right shrink-0">
//               <div
//                 className="font-display text-xl"
//                 style={{ color: "hsl(20 100% 50%)" }}
//               >
//                 {user.checkIns}
//               </div>
//               <div className="text-[10px] text-muted-foreground">check-ins</div>
//             </div>
//           </motion.div>
//         ))}
//         {top.length === 0 && (
//           <div className="text-center py-12 text-muted-foreground text-sm">
//             No check-in data yet — be the first! 🏃
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════════════════
// // CHALLENGES TAB — metric-aware score input
// // ══════════════════════════════════════════════════════════════════════════════
// export const CHALLENGE_METRICS = [
//   { value: "reps", label: "Reps", placeholder: "e.g. 42", isTime: false },
//   { value: "kg", label: "Weight (kg)", placeholder: "e.g. 100", isTime: false },
//   {
//     value: "lbs",
//     label: "Weight (lbs)",
//     placeholder: "e.g. 225",
//     isTime: false,
//   },
//   {
//     value: "time",
//     label: "Time (mm:ss)",
//     placeholder: "e.g. 4:30",
//     isTime: true,
//   },
//   {
//     value: "distance_m",
//     label: "Distance (m)",
//     placeholder: "e.g. 500",
//     isTime: false,
//   },
//   {
//     value: "distance_km",
//     label: "Distance (km)",
//     placeholder: "e.g. 5.2",
//     isTime: false,
//   },
//   {
//     value: "calories",
//     label: "Calories",
//     placeholder: "e.g. 100",
//     isTime: false,
//   },
//   {
//     value: "rounds",
//     label: "Rounds + Reps",
//     placeholder: "e.g. 5 rounds + 3 reps",
//     isTime: false,
//   },
// ] as const;

// function ChallengesLeaderboard({ currentUid }: { currentUid: string }) {
//   const { user, toast } = useAuth();
//   const [challenges, setChallenges] = useState<any[]>([]);
//   const [entries, setEntries] = useState<Record<string, any[]>>({});
//   const [loading, setLoading] = useState(true);
//   const [expanded, setExpanded] = useState<string | null>(null);
//   const [submitForm, setSubmitForm] = useState<{
//     challengeId: string;
//     score: string;
//     metric: string;
//   } | null>(null);
//   const [submitting, setSubmitting] = useState(false);

//   useEffect(() => {
//     return onValue(ref(db, "challenges"), (snap) => {
//       if (snap.exists()) {
//         const list = Object.entries(snap.val())
//           .map(([id, val]: [string, any]) => ({ id, ...val }))
//           .filter((c) => c.active)
//           .sort((a, b) => a.name.localeCompare(b.name));
//         setChallenges(list);
//       } else setChallenges([]);
//       setLoading(false);
//     });
//   }, []);

//   useEffect(() => {
//     return onValue(ref(db, "challenge_entries"), (snap) => {
//       if (!snap.exists()) return;
//       const raw = snap.val();
//       const grouped: Record<string, any[]> = {};
//       Object.entries(raw).forEach(([cId, entriesRaw]: [string, any]) => {
//         const best: Record<string, any> = {};
//         Object.values(entriesRaw).forEach((e: any) => {
//           if (!best[e.uid] || e.score > best[e.uid].score) best[e.uid] = e;
//         });
//         grouped[cId] = Object.values(best).sort((a, b) => b.score - a.score);
//       });
//       setEntries(grouped);
//     });
//   }, []);

//   const submitScore = async () => {
//     if (!submitForm || !user) return;
//     const metricDef = CHALLENGE_METRICS.find(
//       (m) => m.value === submitForm.metric,
//     );
//     let numericScore: number;

//     if (metricDef?.isTime) {
//       const parsed = parseTimeInput(submitForm.score);
//       if (parsed === null)
//         return toast("Enter time as mm:ss or hh:mm:ss", "error");
//       numericScore = parsed;
//     } else {
//       numericScore = Number(submitForm.score);
//       if (!submitForm.score || isNaN(numericScore) || numericScore <= 0)
//         return toast("Enter a valid score", "error");
//     }

//     setSubmitting(true);
//     try {
//       await push(ref(db, `challenge_entries/${submitForm.challengeId}`), {
//         uid: user.uid,
//         name: user.name,
//         score: numericScore,
//         rawInput: submitForm.score,
//         submittedAt: Date.now(),
//       });
//       toast("Score submitted! 🏁", "success");
//       setSubmitForm(null);
//     } catch {
//       toast("Failed to submit", "error");
//     }
//     setSubmitting(false);
//   };

//   // Format display score based on metric
//   const formatScore = (score: number, metric: string) => {
//     if (metric === "time") return formatTime(score);
//     return `${score} ${metric}`;
//   };

//   if (loading)
//     return (
//       <div className="text-center py-10 text-muted-foreground text-sm">
//         Loading challenges…
//       </div>
//     );
//   if (challenges.length === 0)
//     return (
//       <div className="mk2-card text-center py-12">
//         <div className="text-4xl mb-3">🏁</div>
//         <div className="font-bold mb-1">No Active Challenges</div>
//         <div className="text-xs text-muted-foreground">
//           Check back soon — admin will post new challenges here.
//         </div>
//       </div>
//     );

//   return (
//     <div className="flex flex-col gap-4">
//       {challenges.map((challenge, ci) => {
//         const cEntries = entries[challenge.id] ?? [];
//         const myEntry = cEntries.find((e) => e.uid === currentUid);
//         const myRank = myEntry
//           ? cEntries.findIndex((e) => e.uid === currentUid) + 1
//           : null;
//         const isExpanded = expanded === challenge.id;
//         const isSubmitting = submitForm?.challengeId === challenge.id;
//         const metricDef = CHALLENGE_METRICS.find(
//           (m) => m.value === challenge.metric,
//         );

//         return (
//           <motion.div
//             key={challenge.id}
//             initial={{ opacity: 0, y: 8 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: ci * 0.08 }}
//             className="mk2-card overflow-hidden"
//             style={{ borderTop: `3px solid ${challenge.color}` }}
//           >
//             <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
//               <div>
//                 <div className="font-display text-lg tracking-wide mb-1">
//                   {challenge.name}
//                 </div>
//                 <div className="text-xs text-muted-foreground mb-1">
//                   {challenge.description}
//                 </div>
//                 <div className="text-xs text-muted-foreground">
//                   📅 {challenge.startDate} → {challenge.endDate} · 📏{" "}
//                   {metricDef?.label || challenge.metric}
//                 </div>
//               </div>
//               <div className="text-right shrink-0">
//                 <div className="text-xs text-muted-foreground mb-1">Prize</div>
//                 <div
//                   className="text-sm font-bold"
//                   style={{ color: challenge.color }}
//                 >
//                   {challenge.prize}
//                 </div>
//               </div>
//             </div>

//             {myEntry && myRank && (
//               <div
//                 className="flex items-center gap-3 px-3 py-2 rounded-lg mb-3"
//                 style={{
//                   background: `${challenge.color}12`,
//                   border: `1px solid ${challenge.color}30`,
//                 }}
//               >
//                 <span
//                   className="font-display text-2xl"
//                   style={{ color: challenge.color }}
//                 >
//                   #{myRank}
//                 </span>
//                 <div>
//                   <div className="font-bold text-xs">Your Score</div>
//                   <div
//                     className="font-display text-lg"
//                     style={{ color: challenge.color }}
//                   >
//                     {formatScore(myEntry.score, challenge.metric)}
//                   </div>
//                 </div>
//               </div>
//             )}

//             <div className="flex gap-2 flex-wrap">
//               <button
//                 onClick={() => setExpanded(isExpanded ? null : challenge.id)}
//                 className="text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
//                 style={{
//                   background: "hsl(var(--secondary))",
//                   color: "hsl(var(--foreground))",
//                   border: "1px solid hsl(var(--border))",
//                 }}
//               >
//                 👥 {cEntries.length} entries {isExpanded ? "▲" : "▼"}
//               </button>
//               <button
//                 onClick={() =>
//                   setSubmitForm(
//                     isSubmitting
//                       ? null
//                       : {
//                           challengeId: challenge.id,
//                           score: "",
//                           metric: challenge.metric,
//                         },
//                   )
//                 }
//                 className="text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
//                 style={{
//                   background: isSubmitting
//                     ? "hsl(var(--secondary))"
//                     : challenge.color,
//                   color: isSubmitting ? "hsl(var(--foreground))" : "#000",
//                   border: isSubmitting
//                     ? "1px solid hsl(var(--border))"
//                     : "none",
//                 }}
//               >
//                 {isSubmitting ? "✕ Cancel" : "＋ Submit Score"}
//               </button>
//             </div>

//             <AnimatePresence>
//               {isSubmitting && (
//                 <motion.div
//                   initial={{ height: 0, opacity: 0 }}
//                   animate={{ height: "auto", opacity: 1 }}
//                   exit={{ height: 0, opacity: 0 }}
//                   className="mt-3 overflow-hidden"
//                 >
//                   <div className="flex gap-2 items-center pt-1">
//                     <input
//                       type={metricDef?.isTime ? "text" : "number"}
//                       placeholder={
//                         metricDef?.placeholder || `Score in ${challenge.metric}`
//                       }
//                       value={submitForm?.score ?? ""}
//                       onChange={(e) =>
//                         setSubmitForm((f) =>
//                           f ? { ...f, score: e.target.value } : f,
//                         )
//                       }
//                       className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none"
//                     />
//                     <button
//                       onClick={submitScore}
//                       disabled={submitting}
//                       className="px-4 py-2 rounded-lg font-bold text-xs border-none cursor-pointer"
//                       style={{
//                         background: challenge.color,
//                         color: "#000",
//                         opacity: submitting ? 0.7 : 1,
//                       }}
//                     >
//                       {submitting ? "…" : "Submit →"}
//                     </button>
//                   </div>
//                   <div className="text-[11px] text-muted-foreground mt-1.5">
//                     {metricDef?.isTime
//                       ? "Enter as mm:ss or hh:mm:ss"
//                       : `Enter your score in ${metricDef?.label || challenge.metric}`}
//                   </div>
//                 </motion.div>
//               )}
//             </AnimatePresence>

//             <AnimatePresence>
//               {isExpanded && (
//                 <motion.div
//                   initial={{ height: 0, opacity: 0 }}
//                   animate={{ height: "auto", opacity: 1 }}
//                   exit={{ height: 0, opacity: 0 }}
//                   className="mt-3 overflow-hidden"
//                 >
//                   <div
//                     className="pt-3"
//                     style={{ borderTop: "1px solid hsl(var(--border))" }}
//                   >
//                     {cEntries.length === 0 ? (
//                       <div className="text-xs text-muted-foreground py-3 text-center">
//                         No entries yet — be the first!
//                       </div>
//                     ) : (
//                       <div className="flex flex-col gap-1.5">
//                         {cEntries.slice(0, 10).map((entry, i) => (
//                           <div
//                             key={entry.uid}
//                             className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
//                             style={{
//                               background:
//                                 entry.uid === currentUid
//                                   ? `${challenge.color}12`
//                                   : "hsl(var(--secondary))",
//                               border:
//                                 entry.uid === currentUid
//                                   ? `1px solid ${challenge.color}30`
//                                   : "1px solid transparent",
//                             }}
//                           >
//                             <span className="font-display text-base w-6 text-center">
//                               {i === 0
//                                 ? "🥇"
//                                 : i === 1
//                                   ? "🥈"
//                                   : i === 2
//                                     ? "🥉"
//                                     : `${i + 1}.`}
//                             </span>
//                             <span className="flex-1 font-bold">
//                               {entry.name}
//                               {entry.uid === currentUid && (
//                                 <span
//                                   className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
//                                   style={{
//                                     background: `${challenge.color}25`,
//                                     color: challenge.color,
//                                   }}
//                                 >
//                                   YOU
//                                 </span>
//                               )}
//                             </span>
//                             <span
//                               className="font-display text-base"
//                               style={{ color: challenge.color }}
//                             >
//                               {formatScore(entry.score, challenge.metric)}
//                             </span>
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </motion.div>
//         );
//       })}
//       <div className="mk2-card bg-secondary/50">
//         <div className="font-bold text-sm mb-2">How Challenges Work</div>
//         <div className="text-xs text-muted-foreground leading-relaxed">
//           Submit your score for any active challenge. Only your best score
//           counts. Winners announced when the challenge ends.
//         </div>
//       </div>
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════════════════
// // MAIN — hooks order fixed, early return moved after all hooks
// // ══════════════════════════════════════════════════════════════════════════════
// export function Leaderboard() {
//   const { user } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [tab, setTab] = useState<"pr" | "checkin" | "challenges">("pr");
//   const [allUsers, setAllUsers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   // ── All hooks must run before any early return ────────────────────────────
//   useEffect(() => {
//     return onValue(ref(db, "mk2_users"), (snap) => {
//       if (snap.exists()) {
//         const users = Object.entries(snap.val()).map(
//           ([uid, data]: [string, any]) => ({
//             uid,
//             name: data.name || "Unnamed",
//             checkIns: Array.isArray(data.checkIns)
//               ? data.checkIns.length
//               : typeof data.checkIns === "number"
//                 ? data.checkIns
//                 : 0,
//             points: data.points ?? 0,
//           }),
//         );
//         setAllUsers(users);
//       } else setAllUsers([]);
//       setLoading(false);
//     });
//   }, []);

//   // Safe to early-return after all hooks
//   if (!user) return null;

//   const TABS = [
//     { id: "pr", label: "🏆 PR Board" },
//     { id: "checkin", label: "✅ Check-ins" },
//     { id: "challenges", label: "🏁 Challenges" },
//   ];

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       {/* ── "Leader Board" — two words, two lines, fits container ──────── */}
//       <PageTitle sub="A Little Healthy Competition">
//         Leader <span className="text-primary block sm:inline">Board</span>
//       </PageTitle>

//       <div className="flex bg-secondary rounded-lg p-1 gap-1 mb-6 w-full overflow-x-auto">
//         {TABS.map((t) => (
//           <button
//             key={t.id}
//             onClick={() => setTab(t.id as any)}
//             className="flex-1 py-2 px-2 rounded-md border-none cursor-pointer font-body font-bold text-xs uppercase tracking-wide transition-all duration-150 whitespace-nowrap"
//             style={{
//               background: tab === t.id ? "hsl(20 100% 50%)" : "transparent",
//               color: tab === t.id ? "#000" : "hsl(var(--muted-foreground))",
//             }}
//           >
//             {t.label}
//           </button>
//         ))}
//       </div>
// n
//       {loading && tab === "checkin" ? (
//         <div className="text-center py-12 text-muted-foreground">Loading…</div>
//       ) : (
//         <>
//           {tab === "pr" && <PRLeaderboard currentUid={user.uid} />}
//           {tab === "checkin" && (
//             <CheckInLeaderboard users={allUsers} currentUid={user.uid} />
//           )}
//           {tab === "challenges" && (
//             <ChallengesLeaderboard currentUid={user.uid} />
//           )}
//         </>
//       )}
//     </div>
//   );
// }
