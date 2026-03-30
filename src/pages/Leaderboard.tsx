import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";
import { Tag } from "@/components/shared/Tag";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, get, push, set } from "firebase/database";
import { db } from "@/lib/firebase";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LeaderboardUser {
  uid: string;
  name: string;
  points: number;
  checkIns: number;
  workouts: number;
  bookings: number;
  tier: string;
  color: string;
}

interface LiftEntry {
  uid: string;
  name: string;
  gender: "male" | "female";
  exercise: string;
  weight: number;
  unit: "kg" | "lbs";
  date: string;
  timestamp: number;
}

interface Challenge {
  id: string;
  name: string;
  exercise: string;
  description: string;
  startDate: string;
  endDate: string;
  metric: string;
  prize: string;
  color: string;
  active: boolean;
}

interface ChallengeEntry {
  uid: string;
  name: string;
  score: number;
  submittedAt: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const LIFT_EXERCISES = [
  "Squat",
  "Deadlift",
  "Bench Press",
  "Clean & Jerk",
  "Snatch",
];

const tierColor = (t: string) =>
  t === "Gold" ? "hsl(38 92% 44%)" : t === "Silver" ? "#94a3b8" : "#a16207";

function getTier(points: number): string {
  if (points >= 500) return "Gold";
  if (points >= 200) return "Silver";
  return "Bronze";
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function is12MonthsAgo(timestamp: number): boolean {
  const twelveMonthsAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  return timestamp >= twelveMonthsAgo;
}

// ── Overall Leaderboard ───────────────────────────────────────────────────────
function OverallLeaderboard({
  users,
  currentUser,
}: {
  users: LeaderboardUser[];
  currentUser: LeaderboardUser | null;
}) {
  const sorted = [...users].sort((a, b) => b.points - a.points);
  const topUsers = sorted.slice(0, 10);
  const userRank = currentUser
    ? sorted.findIndex((u) => u.uid === currentUser.uid) + 1
    : null;

  return (
    <div>
      {currentUser && userRank && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mk2-card mb-5 border-l-[3px]"
          style={{ borderLeftColor: tierColor(currentUser.tier) }}
        >
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                Your Ranking
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-[48px] text-primary leading-none">
                  #{userRank}
                </span>
                <div>
                  <div className="font-bold">{currentUser.name}</div>
                  <Tag color={tierColor(currentUser.tier)}>
                    {currentUser.tier} · {currentUser.points} pts
                  </Tag>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">
                Points to climb
              </div>
              <div className="text-sm font-bold text-primary">
                {userRank > 1
                  ? `+${sorted[userRank - 2]?.points - currentUser.points} pts`
                  : "👑 TOP!"}
              </div>
            </div>
          </div>
        </motion.div>
      )}
      <div className="flex flex-col gap-2">
        {topUsers.map((user, i) => (
          <motion.div
            key={user.uid}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="mk2-card flex items-center gap-3 py-3"
            style={{
              borderLeft: i < 3 ? `3px solid ${user.color}` : undefined,
            }}
          >
            <div className="font-display text-xl w-8 text-center shrink-0">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm shrink-0"
              style={{ background: user.color, color: "#000" }}
            >
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{user.name}</div>
              <div className="flex gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground">
                  {user.checkIns} check-ins
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {user.workouts} workouts
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className="font-display text-xl"
                style={{ color: user.color }}
              >
                {user.points}
              </div>
              <Tag color={tierColor(user.tier)}>{user.tier}</Tag>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Lifting Leaderboard ───────────────────────────────────────────────────────
function LiftingLeaderboard({ currentUid }: { currentUid: string }) {
  const { user, toast } = useAuth();

  const [exercise, setExercise] = useState("Squat");
  const [gender, setGender] = useState<"male" | "female">(
    (user as any)?.gender === "female" ? "female" : "male",
  );
  const [entries, setEntries] = useState<LiftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    weight: "",
    unit: "kg" as "kg" | "lbs",
    gender: "male" as "male" | "female",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    return onValue(ref(db, "lifting_leaderboard"), (snap) => {
      if (snap.exists()) {
        const all: LiftEntry[] = Object.values(snap.val());
        setEntries(all.filter((e) => is12MonthsAgo(e.timestamp)));
      } else {
        setEntries([]);
      }
      setLoading(false);
    });
  }, []);

  const filtered = entries
    .filter((e) => e.exercise === exercise && e.gender === gender)
    .sort((a, b) => b.weight - a.weight);

  // Best lift per person only
  const best: Record<string, LiftEntry> = {};
  filtered.forEach((e) => {
    if (!best[e.uid] || e.weight > best[e.uid].weight) best[e.uid] = e;
  });
  const ranked = Object.values(best).sort((a, b) => b.weight - a.weight);

  const myBest = best[currentUid];
  const myRank = myBest
    ? ranked.findIndex((e) => e.uid === currentUid) + 1
    : null;

  const submitLift = async () => {
    if (!form.weight || isNaN(Number(form.weight)))
      return toast("Enter a valid weight", "error");
    if (!user) return;
    setSubmitting(true);
    try {
      const entry: Omit<LiftEntry, never> = {
        uid: user.uid,
        name: user.name,
        gender: form.gender,
        exercise,
        weight: Number(form.weight),
        unit: form.unit,
        date: formatDateKey(new Date()),
        timestamp: Date.now(),
      };
      await push(ref(db, "lifting_leaderboard"), entry);
      toast(`${exercise} ${form.weight}${form.unit} submitted! 💪`, "success");
      setShowForm(false);
      setForm({ weight: "", unit: "kg", gender: "male" });
    } catch {
      toast("Failed to submit", "error");
    }
    setSubmitting(false);
  };

  return (
    <div>
      {/* My rank card */}
      {myBest && myRank && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mk2-card mb-5 border-l-[3px] border-orange-500"
        >
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                Your Best — {exercise} ({gender})
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-[48px] text-primary leading-none">
                  #{myRank}
                </span>
                <div>
                  <div className="font-bold">{myBest.name}</div>
                  <Tag color="hsl(20 100% 50%)">
                    {myBest.weight}
                    {myBest.unit}
                  </Tag>
                </div>
              </div>
            </div>
            {myRank > 1 && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">
                  To reach #{myRank - 1}
                </div>
                <div className="text-sm font-bold text-primary">
                  +{ranked[myRank - 2].weight - myBest.weight + 0.5}
                  {myBest.unit}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Gender toggle */}
          <div className="flex bg-secondary rounded-lg p-1 gap-1">
            {(["male", "female"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className="px-3 py-1.5 rounded-md border-none cursor-pointer font-body font-bold text-[11px] uppercase tracking-wide transition-all"
                style={{
                  background: gender === g ? "hsl(20 100% 50%)" : "transparent",
                  color: gender === g ? "#000" : "hsl(var(--muted-foreground))",
                }}
              >
                {g === "male" ? "♂ Male" : "♀ Female"}
              </button>
            ))}
          </div>
          {/* Exercise selector */}
          <div className="flex flex-wrap gap-1">
            {LIFT_EXERCISES.map((ex) => (
              <button
                key={ex}
                onClick={() => setExercise(ex)}
                className="px-3 py-1.5 rounded-lg border-none cursor-pointer font-body font-bold text-[11px] transition-all"
                style={{
                  background:
                    exercise === ex
                      ? "hsl(20 100% 50%)"
                      : "hsl(var(--secondary))",
                  color:
                    exercise === ex ? "#000" : "hsl(var(--muted-foreground))",
                  border:
                    exercise === ex ? "none" : "1px solid hsl(var(--border))",
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Submit lift button */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg font-body font-bold text-xs border-none cursor-pointer transition-all"
          style={{
            background: showForm ? "hsl(var(--secondary))" : "hsl(20 100% 50%)",
            color: showForm ? "hsl(var(--foreground))" : "#000",
          }}
        >
          {showForm ? "✕ Cancel" : "＋ Submit Lift"}
        </button>
      </div>

      {/* Submit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mk2-card mb-4"
            style={{ borderColor: "hsl(20 100% 50% / 0.3)" }}
          >
            <div className="font-bold text-sm mb-3">
              Submit Your Best {exercise}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Weight
                </div>
                <input
                  type="number"
                  placeholder="e.g. 120"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Unit
                </div>
                <div className="flex bg-background border border-border rounded-lg overflow-hidden">
                  {(["kg", "lbs"] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setForm({ ...form, unit: u })}
                      className="flex-1 py-2 text-xs font-bold border-none cursor-pointer transition-all"
                      style={{
                        background:
                          form.unit === u ? "hsl(20 100% 50%)" : "transparent",
                        color:
                          form.unit === u
                            ? "#000"
                            : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Gender
                </div>
                <div className="flex bg-background border border-border rounded-lg overflow-hidden">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setForm({ ...form, gender: g })}
                      className="flex-1 py-2 text-xs font-bold border-none cursor-pointer transition-all"
                      style={{
                        background:
                          form.gender === g
                            ? "hsl(20 100% 50%)"
                            : "transparent",
                        color:
                          form.gender === g
                            ? "#000"
                            : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {g === "male" ? "♂" : "♀"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={submitLift}
              disabled={submitting}
              className="w-full py-2.5 rounded-lg font-body font-bold text-sm border-none cursor-pointer"
              style={{
                background: "hsl(20 100% 50%)",
                color: "#000",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Submitting…" : `Submit ${exercise} →`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rankings */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : ranked.length === 0 ? (
        <div className="mk2-card text-center py-10 text-muted-foreground text-sm">
          <div className="text-3xl mb-3">🏋️</div>
          <div className="font-bold mb-1">
            No {gender} {exercise} entries yet
          </div>
          <div className="text-xs">Be the first to submit a lift!</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {ranked.map((entry, i) => (
            <motion.div
              key={`${entry.uid}_${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="mk2-card flex items-center gap-3 py-3"
              style={{
                borderLeft: i < 3 ? `3px solid hsl(20 100% 50%)` : undefined,
                background:
                  entry.uid === currentUid
                    ? "hsl(20 100% 50% / 0.06)"
                    : undefined,
              }}
            >
              <div className="font-display text-xl w-8 text-center shrink-0">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm shrink-0"
                style={{
                  background:
                    entry.uid === currentUid
                      ? "hsl(20 100% 50%)"
                      : "hsl(var(--secondary))",
                  color:
                    entry.uid === currentUid
                      ? "#000"
                      : "hsl(var(--foreground))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                {entry.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm flex items-center gap-2">
                  {entry.name}
                  {entry.uid === currentUid && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                      YOU
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {entry.date} · {entry.gender}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="font-display text-xl"
                  style={{ color: "hsl(20 100% 50%)" }}
                >
                  {entry.weight}
                  {entry.unit}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-4 text-[11px] text-muted-foreground text-center">
        Rolling 12-month window · Best lift per athlete shown · Submit anytime
      </div>
    </div>
  );
}

// ── Daily Class Leaderboard ───────────────────────────────────────────────────
function DailyClassLeaderboard({
  bookingsCounts,
  currentUserId,
}: {
  bookingsCounts: Array<{ uid: string; name: string; count: number }>;
  currentUserId: string;
}) {
  const sorted = [...bookingsCounts].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, 10);
  const userEntry = sorted.find((u) => u.uid === currentUserId);
  const userRank = userEntry ? sorted.indexOf(userEntry) + 1 : null;

  return (
    <div>
      {userEntry && userRank && (
        <div className="mk2-card mb-5 border-l-[3px] border-orange-500">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                Your Daily Rank
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-[48px] text-primary leading-none">
                  #{userRank}
                </span>
                <div>
                  <div className="font-bold">{userEntry.name}</div>
                  <Tag color="hsl(20 100% 50%)">
                    {userEntry.count} class{userEntry.count !== 1 ? "es" : ""}
                  </Tag>
                </div>
              </div>
            </div>
            {userRank > 1 && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">
                  To reach #{userRank - 1}
                </div>
                <div className="text-sm font-bold text-primary">
                  +{sorted[userRank - 2].count - userEntry.count + 1} more
                  classes
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {top.map((user, i) => (
          <div
            key={user.uid}
            className="mk2-card flex items-center gap-3 py-3"
            style={{
              borderLeft: i < 3 ? `3px solid hsl(20 100% 50%)` : undefined,
              background:
                user.uid === currentUserId
                  ? "hsl(20 100% 50% / 0.06)"
                  : undefined,
            }}
          >
            <div className="font-display text-xl w-8 text-center shrink-0">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm shrink-0"
              style={{
                background:
                  user.uid === currentUserId
                    ? "hsl(20 100% 50%)"
                    : "hsl(var(--secondary))",
                color:
                  user.uid === currentUserId
                    ? "#000"
                    : "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              {user.name[0]}
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm flex items-center gap-2">
                {user.name}
                {user.uid === currentUserId && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                    YOU
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className="font-display text-xl"
                style={{ color: "hsl(20 100% 50%)" }}
              >
                {user.count}
              </div>
              <div className="text-[10px] text-muted-foreground">classes</div>
            </div>
          </div>
        ))}
      </div>
      {sorted.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          No classes booked today — be the first! 🏃
        </div>
      )}
    </div>
  );
}

// ── Challenges Leaderboard ────────────────────────────────────────────────────
function ChallengesLeaderboard({ currentUid }: { currentUid: string }) {
  const { user, toast } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [entries, setEntries] = useState<Record<string, ChallengeEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [submitForm, setSubmitForm] = useState<{
    challengeId: string;
    score: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return onValue(ref(db, "challenges"), (snap) => {
      if (snap.exists()) {
        const list: Challenge[] = Object.entries(snap.val()).map(
          ([id, val]: [string, any]) => ({ id, ...val }),
        );
        setChallenges(
          list
            .filter((c) => c.active)
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } else {
        setChallenges([]);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "challenge_entries"), (snap) => {
      if (snap.exists()) {
        const raw = snap.val();
        const grouped: Record<string, ChallengeEntry[]> = {};
        Object.entries(raw).forEach(
          ([challengeId, entriesRaw]: [string, any]) => {
            const best: Record<string, ChallengeEntry> = {};
            Object.values(entriesRaw).forEach((e: any) => {
              if (!best[e.uid] || e.score > best[e.uid].score) {
                best[e.uid] = e;
              }
            });
            grouped[challengeId] = Object.values(best).sort(
              (a, b) => b.score - a.score,
            );
          },
        );
        setEntries(grouped);
      }
    });
  }, []);

  const submitScore = async () => {
    if (!submitForm || !user) return;
    const score = Number(submitForm.score);
    if (!submitForm.score || isNaN(score))
      return toast("Enter a valid score", "error");
    setSubmitting(true);
    try {
      await push(ref(db, `challenge_entries/${submitForm.challengeId}`), {
        uid: user.uid,
        name: user.name,
        score,
        submittedAt: Date.now(),
      });
      toast("Score submitted! 🏁", "success");
      setSubmitForm(null);
    } catch {
      toast("Failed to submit", "error");
    }
    setSubmitting(false);
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
          Check back soon — the admin will post new challenges here.
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {challenges.map((challenge, ci) => {
        const challengeEntries = entries[challenge.id] ?? [];
        const myEntry = challengeEntries.find((e) => e.uid === currentUid);
        const myRank = myEntry
          ? challengeEntries.findIndex((e) => e.uid === currentUid) + 1
          : null;
        const isExpanded = expanded === challenge.id;
        const isSubmitting = submitForm?.challengeId === challenge.id;

        return (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.08 }}
            className="mk2-card overflow-hidden"
            style={{ borderTop: `3px solid ${challenge.color}` }}
          >
            {/* Header */}
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
                  {challenge.metric}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Prize</div>
                <div
                  className="text-sm font-bold"
                  style={{ color: challenge.color }}
                >
                  {challenge.prize}
                </div>
              </div>
            </div>

            {/* My rank */}
            {myEntry && myRank && (
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg mb-3 text-sm"
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
                    {myEntry.score} {challenge.metric}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setExpanded(isExpanded ? null : challenge.id)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all"
                style={{
                  background: "hsl(var(--secondary))",
                  color: "hsl(var(--foreground))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                👥 {challengeEntries.length} entries {isExpanded ? "▲" : "▼"}
              </button>
              <button
                onClick={() =>
                  setSubmitForm(
                    isSubmitting
                      ? null
                      : { challengeId: challenge.id, score: "" },
                  )
                }
                className="text-xs font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all"
                style={{
                  background: isSubmitting
                    ? "hsl(var(--secondary))"
                    : challenge.color,
                  color: isSubmitting ? "hsl(var(--foreground))" : "#000",
                }}
              >
                {isSubmitting ? "✕ Cancel" : "＋ Submit Score"}
              </button>
            </div>

            {/* Submit score form */}
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
                      type="number"
                      placeholder={`Your score in ${challenge.metric}`}
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expanded rankings */}
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
                    {challengeEntries.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-3 text-center">
                        No entries yet — be the first!
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {challengeEntries.slice(0, 10).map((entry, i) => (
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
                              {entry.score}
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
          counts. Winners are announced when the challenge ends and prizes are
          awarded at reception.
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function Leaderboard() {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const [tab, setTab] = useState<
    "overall" | "lifting" | "daily" | "challenges"
  >("overall");
  const [allUsers, setAllUsers] = useState<LeaderboardUser[]>([]);
  const [dailyBookings, setDailyBookings] = useState<
    { uid: string; name: string; count: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  if (!user) return null;

  useEffect(() => {
    return onValue(ref(db, "mk2_users"), (snap) => {
      if (snap.exists()) {
        const users: LeaderboardUser[] = Object.entries(snap.val()).map(
          ([uid, data]: [string, any]) => ({
            uid,
            name: data.name || "Unnamed",
            points: data.points ?? 0,
            checkIns: data.checkIns?.length ?? 0,
            workouts: data.workouts?.length ?? 0,
            bookings: data.bookings?.length ?? 0,
            tier: getTier(data.points ?? 0),
            color: tierColor(getTier(data.points ?? 0)),
          }),
        );
        setAllUsers(users);
      } else {
        setAllUsers([]);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const todayKey = formatDateKey(new Date());
    return onValue(ref(db, "class_bookings"), (snap) => {
      if (snap.exists()) {
        const counts: Record<string, number> = {};
        Object.entries(snap.val()).forEach(([classKey, classBookings]: any) => {
          if (!classKey.endsWith(todayKey)) return;
          Object.keys(classBookings).forEach((uid) => {
            counts[uid] = (counts[uid] || 0) + 1;
          });
        });
        const list = Object.entries(counts).map(([uid, count]) => {
          const userInfo = allUsers.find((u) => u.uid === uid);
          return { uid, name: userInfo?.name || "Unknown", count };
        });
        setDailyBookings(list);
      } else {
        setDailyBookings([]);
      }
    });
  }, [allUsers]);

  const currentUser = allUsers.find((u) => u.uid === user.uid) ?? null;

  const TABS = [
    { id: "overall", label: "🏆 Overall" },
    { id: "lifting", label: "🏋️ Lifting" },
    { id: "daily", label: "📅 Daily" },
    { id: "challenges", label: "🏁 Challenges" },
  ];

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Compete, earn, and rise through the ranks">
        Leader<span className="text-primary">board</span>
      </PageTitle>

      {/* Tab switcher */}
      <div
        className={`flex bg-secondary rounded-lg p-1 gap-1 mb-6 ${isMobile ? "w-full" : "w-fit"}`}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`${isMobile ? "flex-1" : "px-4"} py-2 rounded-md border-none cursor-pointer font-body font-bold text-xs uppercase tracking-wide transition-all duration-150 ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading leaderboard…
        </div>
      ) : (
        <>
          {tab === "overall" && (
            <OverallLeaderboard users={allUsers} currentUser={currentUser} />
          )}
          {tab === "lifting" && <LiftingLeaderboard currentUid={user.uid} />}
          {tab === "daily" && (
            <DailyClassLeaderboard
              bookingsCounts={dailyBookings}
              currentUserId={user.uid}
            />
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
// import { motion } from "framer-motion";
// import { ref, onValue } from "firebase/database";
// import { db } from "@/lib/firebase";

// // ── Types ─────────────────────────────────────────────────────────────────────
// interface LeaderboardUser {
//   uid: string;
//   name: string;
//   points: number;
//   checkIns: number;
//   workouts: number;
//   bookings: number;
//   tier: string;
//   color: string;
// }

// // Static competitions (can be extended later)
// const COMPETITIONS = [
//   {
//     id: 1,
//     name: "30-Day Check-In Challenge",
//     ends: "1 Apr 2026",
//     prize: "Free 3-month membership",
//     metric: "Check-ins",
//     active: true,
//     color: "hsl(20 100% 50%)",
//   },
//   {
//     id: 2,
//     name: "Most Workouts — March",
//     ends: "31 Mar 2026",
//     prize: "R500 gym credit",
//     metric: "Workouts logged",
//     active: true,
//     color: "hsl(263 85% 58%)",
//   },
//   {
//     id: 3,
//     name: "Points Sprint — Q1",
//     ends: "31 Mar 2026",
//     prize: "Gold membership upgrade",
//     metric: "Points earned",
//     active: true,
//     color: "hsl(38 92% 44%)",
//   },
// ];

// const tierColor = (t: string) =>
//   t === "Gold" ? "hsl(38 92% 44%)" : t === "Silver" ? "#94a3b8" : "#a16207";

// // ── Helpers ───────────────────────────────────────────────────────────────────
// function getTier(points: number): string {
//   if (points >= 500) return "Gold";
//   if (points >= 200) return "Silver";
//   return "Bronze";
// }

// // Format date as YYYY-MM-DD
// function formatDateKey(date: Date): string {
//   const y = date.getFullYear();
//   const m = String(date.getMonth() + 1).padStart(2, "0");
//   const d = String(date.getDate()).padStart(2, "0");
//   return `${y}-${m}-${d}`;
// }

// // ── Leaderboard Components ────────────────────────────────────────────────────
// function OverallLeaderboard({
//   users,
//   currentUser,
// }: {
//   users: LeaderboardUser[];
//   currentUser: LeaderboardUser | null;
// }) {
//   const sorted = [...users].sort((a, b) => b.points - a.points);
//   const topUsers = sorted.slice(0, 10);
//   const userRank = currentUser
//     ? sorted.findIndex((u) => u.uid === currentUser.uid) + 1
//     : null;

//   return (
//     <div>
//       {currentUser && userRank && (
//         <motion.div
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="mk2-card mb-5 border-l-[3px]"
//           style={{ borderLeftColor: tierColor(currentUser.tier) }}
//         >
//           <div className="flex justify-between items-center flex-wrap gap-3">
//             <div>
//               <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
//                 Your Ranking
//               </div>
//               <div className="flex items-center gap-3">
//                 <span className="font-display text-[48px] text-primary leading-none">
//                   #{userRank}
//                 </span>
//                 <div>
//                   <div className="font-bold">{currentUser.name}</div>
//                   <Tag color={tierColor(currentUser.tier)}>
//                     {currentUser.tier} · {currentUser.points} pts
//                   </Tag>
//                 </div>
//               </div>
//             </div>
//             <div className="text-right">
//               <div className="text-xs text-muted-foreground mb-1">
//                 Points to climb
//               </div>
//               <div className="text-sm font-bold text-primary">
//                 {userRank > 1
//                   ? `+${sorted[userRank - 2]?.points - currentUser.points} pts`
//                   : "👑 TOP!"}
//               </div>
//             </div>
//           </div>
//         </motion.div>
//       )}

//       <div className="flex flex-col gap-2">
//         {topUsers.map((user, i) => (
//           <motion.div
//             key={user.uid}
//             initial={{ opacity: 0, x: -8 }}
//             animate={{ opacity: 1, x: 0 }}
//             transition={{ delay: i * 0.04 }}
//             className="mk2-card flex items-center gap-3 py-3"
//             style={{
//               borderLeft: i < 3 ? `3px solid ${user.color}` : undefined,
//             }}
//           >
//             <div className="font-display text-xl w-8 text-center shrink-0">
//               {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}️⃣`}
//             </div>
//             <div
//               className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm shrink-0"
//               style={{ background: user.color, color: "#000" }}
//             >
//               {user.name[0]}
//             </div>
//             <div className="flex-1 min-w-0">
//               <div className="font-bold text-sm">{user.name}</div>
//               <div className="flex gap-2 mt-0.5 flex-wrap">
//                 <span className="text-[10px] text-muted-foreground">
//                   {user.checkIns} check-ins
//                 </span>
//                 <span className="text-[10px] text-muted-foreground">
//                   {user.workouts} workouts
//                 </span>
//               </div>
//             </div>
//             <div className="text-right shrink-0">
//               <div
//                 className="font-display text-xl"
//                 style={{ color: user.color }}
//               >
//                 {user.points}
//               </div>
//               <Tag color={tierColor(user.tier)}>{user.tier}</Tag>
//             </div>
//           </motion.div>
//         ))}
//       </div>
//     </div>
//   );
// }

// function DailyClassLeaderboard({
//   bookingsCounts,
//   currentUserId,
// }: {
//   bookingsCounts: Array<{ uid: string; name: string; count: number }>;
//   currentUserId: string;
// }) {
//   const sorted = [...bookingsCounts].sort((a, b) => b.count - a.count);
//   const top = sorted.slice(0, 10);
//   const userEntry = sorted.find((u) => u.uid === currentUserId);
//   const userRank = userEntry ? sorted.indexOf(userEntry) + 1 : null;

//   return (
//     <div>
//       {userEntry && userRank && (
//         <div className="mk2-card mb-5 border-l-[3px] border-orange-500">
//           <div className="flex justify-between items-center flex-wrap gap-3">
//             <div>
//               <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
//                 Your Daily Rank
//               </div>
//               <div className="flex items-center gap-3">
//                 <span className="font-display text-[48px] text-primary leading-none">
//                   #{userRank}
//                 </span>
//                 <div>
//                   <div className="font-bold">{userEntry.name}</div>
//                   <Tag color="hsl(20 100% 50%)">
//                     {userEntry.count} class{userEntry.count !== 1 ? "es" : ""}
//                   </Tag>
//                 </div>
//               </div>
//             </div>
//             {userRank > 1 && (
//               <div className="text-right">
//                 <div className="text-xs text-muted-foreground mb-1">
//                   To reach #{userRank - 1}
//                 </div>
//                 <div className="text-sm font-bold text-primary">
//                   +{sorted[userRank - 2].count - userEntry.count + 1} more
//                   classes
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       <div className="flex flex-col gap-2">
//         {top.map((user, i) => (
//           <div
//             key={user.uid}
//             className="mk2-card flex items-center gap-3 py-3"
//             style={{
//               borderLeft: i < 3 ? `3px solid hsl(20 100% 50%)` : undefined,
//             }}
//           >
//             <div className="font-display text-xl w-8 text-center shrink-0">
//               {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}️⃣`}
//             </div>
//             <div
//               className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm shrink-0"
//               style={{ background: "hsl(20 100% 50%)", color: "#000" }}
//             >
//               {user.name[0]}
//             </div>
//             <div className="flex-1">
//               <div className="font-bold text-sm">{user.name}</div>
//             </div>
//             <div className="text-right shrink-0">
//               <div
//                 className="font-display text-xl"
//                 style={{ color: "hsl(20 100% 50%)" }}
//               >
//                 {user.count}
//               </div>
//               <div className="text-[10px] text-muted-foreground">classes</div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {sorted.length === 0 && (
//         <div className="text-center py-10 text-muted-foreground">
//           No classes booked today — be the first!
//         </div>
//       )}
//     </div>
//   );
// }

// function ChallengesLeaderboard() {
//   const { user } = useAuth();
//   if (!user) return null;
//   const userPoints = user.points;
//   const userTier = getTier(userPoints);
//   const gymRank = 1; // Placeholder – in real app, fetch from overall leaderboard

//   return (
//     <div>
//       <div className="flex flex-col gap-4">
//         {COMPETITIONS.map((comp, i) => (
//           <motion.div
//             key={comp.id}
//             initial={{ opacity: 0, y: 8 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: i * 0.1 }}
//             className="mk2-card"
//             style={{ borderTop: `3px solid ${comp.color}` }}
//           >
//             <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
//               <div>
//                 <div className="flex items-center gap-2 mb-1">
//                   <div className="font-display text-xl tracking-wide">
//                     {comp.name}
//                   </div>
//                   {comp.active && <Tag color={comp.color}>Active</Tag>}
//                 </div>
//                 <div className="text-xs text-muted-foreground">
//                   Ends: {comp.ends} · Metric: {comp.metric}
//                 </div>
//               </div>
//               <div className="text-right">
//                 <div className="text-xs text-muted-foreground mb-1">Prize</div>
//                 <div
//                   className="text-sm font-bold"
//                   style={{ color: comp.color }}
//                 >
//                   {comp.prize}
//                 </div>
//               </div>
//             </div>
//             <div
//               style={{
//                 height: 1,
//                 background: "hsl(var(--border))",
//                 margin: "12px 0",
//               }}
//             />
//             <div className="text-xs text-muted-foreground">
//               Your position:{" "}
//               <strong className="text-foreground">#{gymRank}</strong> · Keep
//               checking in and logging workouts to climb the ranks!
//             </div>
//           </motion.div>
//         ))}
//       </div>
//       <div className="mk2-card mt-5 bg-secondary/50">
//         <div className="font-bold text-sm mb-2">How Competitions Work</div>
//         <div className="text-xs text-muted-foreground leading-relaxed">
//           Every check-in, logged workout, and booked class earns you points.
//           Winners are announced at the end of each competition period and prizes
//           awarded at reception.
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Main Component ────────────────────────────────────────────────────────────
// export function Leaderboard() {
//   const { user } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [tab, setTab] = useState<"overall" | "daily" | "challenges">("overall");

//   // State for dynamic leaderboards
//   const [allUsers, setAllUsers] = useState<LeaderboardUser[]>([]);
//   const [dailyBookings, setDailyBookings] = useState<
//     Array<{ uid: string; name: string; count: number }>
//   >([]);
//   const [loading, setLoading] = useState(true);

//   if (!user) return null;

//   // Fetch all users
//   useEffect(() => {
//     const unsubscribe = onValue(ref(db, "mk2_users"), (snap) => {
//       if (snap.exists()) {
//         const usersData = snap.val();
//         const users: LeaderboardUser[] = Object.entries(usersData).map(
//           ([uid, data]: [string, any]) => ({
//             uid,
//             name: data.name || "Unnamed",
//             points: data.points ?? 0,
//             checkIns: data.checkIns?.length ?? 0,
//             workouts: data.workouts?.length ?? 0,
//             bookings: data.bookings?.length ?? 0,
//             tier: getTier(data.points ?? 0),
//             color: tierColor(getTier(data.points ?? 0)),
//           }),
//         );
//         setAllUsers(users);
//       } else {
//         setAllUsers([]);
//       }
//       setLoading(false);
//     });
//     return () => unsubscribe();
//   }, []);

//   // Fetch today's bookings for daily leaderboard
//   useEffect(() => {
//     const todayKey = formatDateKey(new Date());
//     const unsubscribe = onValue(ref(db, "class_bookings"), (snap) => {
//       if (snap.exists()) {
//         const allBookings = snap.val();
//         // Count bookings per user for today
//         const counts: Record<string, number> = {};
//         Object.entries(allBookings).forEach(
//           ([classKey, classBookings]: any) => {
//             if (!classKey.endsWith(todayKey)) return; // only today's classes
//             Object.keys(classBookings).forEach((uid) => {
//               counts[uid] = (counts[uid] || 0) + 1;
//             });
//           },
//         );
//         // Map to leaderboard entries
//         const list = Object.entries(counts).map(([uid, count]) => {
//           const userInfo = allUsers.find((u) => u.uid === uid);
//           return {
//             uid,
//             name: userInfo?.name || "Unknown",
//             count,
//           };
//         });
//         setDailyBookings(list);
//       } else {
//         setDailyBookings([]);
//       }
//     });
//     return () => unsubscribe();
//   }, [allUsers]); // re-run when users load

//   const currentUser = allUsers.find((u) => u.uid === user.uid);

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Compete, earn, and rise through the ranks">
//         Leader<span className="text-primary">board</span>
//       </PageTitle>

//       {/* Tab switcher */}
//       <div className="flex bg-secondary rounded-lg p-1 gap-1 mb-6 w-fit">
//         {[
//           { id: "overall", label: "🏆 Overall (12m)" },
//           { id: "daily", label: "📅 Daily Class" },
//           { id: "challenges", label: "🏁 Challenges" },
//         ].map((t) => (
//           <button
//             key={t.id}
//             onClick={() => setTab(t.id as any)}
//             className={`px-4 py-2 rounded-md border-none cursor-pointer font-body font-bold text-xs uppercase tracking-wide transition-all duration-150 ${
//               tab === t.id
//                 ? "bg-primary text-primary-foreground"
//                 : "bg-transparent text-muted-foreground hover:text-foreground"
//             }`}
//           >
//             {t.label}
//           </button>
//         ))}
//       </div>

//       {loading ? (
//         <div className="text-center py-12 text-muted-foreground">
//           Loading leaderboard...
//         </div>
//       ) : (
//         <>
//           {tab === "overall" && (
//             <OverallLeaderboard
//               users={allUsers}
//               currentUser={currentUser || null}
//             />
//           )}
//           {tab === "daily" && (
//             <DailyClassLeaderboard
//               bookingsCounts={dailyBookings}
//               currentUserId={user.uid}
//             />
//           )}
//           {tab === "challenges" && <ChallengesLeaderboard />}
//         </>
//       )}
//     </div>
//   );
// }
