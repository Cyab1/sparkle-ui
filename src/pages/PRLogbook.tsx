import { useState, useEffect } from "react";
import { ref, set, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { PageTitle } from "@/components/shared/PageTitle";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const PR_PATH = "pr_logbook";

const EXERCISES = {
  weightlifting: [
    "Back Squat",
    "Front Squat",
    "Overhead Squat",
    "Deadlift",
    "Sumo Deadlift High Pull",
    "Shoulder Press (Strict)",
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
  ],
  gymnastics: [
    "Pull-Ups (Strict)",
    "Pull-Ups (Kipping)",
    "Pull-Ups (Butterfly)",
    "Chest-to-Bar Pull-Ups",
    "Muscle-Ups (Bar)",
    "Muscle-Ups (Ring)",
    "Handstand Hold",
    "Handstand Walk",
    "Handstand Push-Ups (Strict)",
    "Handstand Push-Ups (Kipping)",
    "Toes-to-Bar",
    "Rope Climbs",
    "L-Sit",
  ],
  metcon: [
    "Fran",
    "Murph",
    "Helen",
    "Grace",
    "Isabel",
    "Cindy",
    "Annie",
    "Karen",
  ],
  cardio: ["Run", "Row", "Bike", "Ski Erg", "Swim"],
};

const CATS = [
  { id: "all", label: "All PRs" },
  { id: "weightlifting", label: "🏋️ Weightlifting" },
  { id: "gymnastics", label: "🤸 Gymnastics" },
  { id: "metcon", label: "⏱️ MetCon" },
  { id: "cardio", label: "🏃 Cardio" },
];

interface PR {
  firebaseKey: string;
  athlete: string;
  category: string;
  exercise: string;
  type: string;
  value: number;
  displayValue: string;
  unit: string;
  notes: string;
  timestamp: string;
}

export function PRLogbook() {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState("all");
  const [exerciseFilter, setExerciseFilter] = useState("all");
  const [myPRsOnly, setMyPRsOnly] = useState(false);
  const [filterName, setFilterName] = useState(
    () => localStorage.getItem("mk2r-filter-name") || "",
  );
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Auto-fill name from logged-in user profile
  const [firstName, setFirstName] = useState(
    () => user?.name.split(" ")[0] || "",
  );
  const [lastName, setLastName] = useState(
    () => user?.name.split(" ").slice(1).join(" ") || "",
  );
  const [formCat, setFormCat] = useState("weightlifting");
  const [exercise, setExercise] = useState(EXERCISES.weightlifting[0]);
  const [prType, setPrType] = useState("weight");
  const [val1, setVal1] = useState("");
  const [val2, setVal2] = useState("");
  const [unit, setUnit] = useState("kg");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadPRs();
  }, []);

  const loadPRs = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, PR_PATH));
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data).map(([k, v]: [string, any]) => ({
          firebaseKey: k,
          ...v,
        }));
        setPrs(list);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const savePR = async () => {
    if (!firstName || !lastName || !val1) return;
    setSaving(true);
    const v1 = parseFloat(val1),
      v2 = parseFloat(val2) || 0;
    let displayValue = "",
      searchValue = v1;
    switch (prType) {
      case "weight":
        displayValue = `${v1}${unit}`;
        break;
      case "time":
        displayValue = `${v1}:${v2.toString().padStart(2, "0")}`;
        searchValue = v1 * 60 + v2;
        break;
      case "reps":
        displayValue = `${v1} reps`;
        break;
      case "rounds":
        displayValue = `${v1} rounds`;
        break;
      case "distance":
        displayValue = `${v1} ${unit}`;
        break;
    }
    const prData = {
      athlete: `${firstName} ${lastName}`.trim(),
      category: formCat,
      exercise,
      type: prType,
      value: searchValue,
      displayValue,
      unit,
      notes,
      timestamp: new Date().toISOString(),
    };
    try {
      await set(ref(db, `${PR_PATH}/${Date.now()}`), prData);
      setShowModal(false);
      resetForm();
      loadPRs();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const resetForm = () => {
    // Keep name pre-filled from profile
    setFirstName(user?.name.split(" ")[0] || "");
    setLastName(user?.name.split(" ").slice(1).join(" ") || "");
    setFormCat("weightlifting");
    setExercise(EXERCISES.weightlifting[0]);
    setPrType("weight");
    setVal1("");
    setVal2("");
    setUnit("kg");
    setNotes("");
    setSuggestions([]);
  };

  const onFirstNameChange = (v: string) => {
    setFirstName(v);
    if (v.length >= 2) {
      const unique = [...new Set(prs.map((p) => p.athlete))];
      setSuggestions(
        unique
          .filter((n) => n.toLowerCase().includes(v.toLowerCase()))
          .slice(0, 5),
      );
    } else {
      setSuggestions([]);
    }
  };

  const pickSuggestion = (name: string) => {
    const [f, ...r] = name.split(" ");
    setFirstName(f);
    setLastName(r.join(" "));
    setSuggestions([]);
  };

  let filtered = prs.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (exerciseFilter !== "all" && p.exercise !== exerciseFilter) return false;
    if (
      myPRsOnly &&
      filterName &&
      !p.athlete.toLowerCase().includes(filterName.toLowerCase())
    )
      return false;
    return true;
  });

  if (category === "weightlifting") filtered.sort((a, b) => b.value - a.value);
  else if (category === "metcon") filtered.sort((a, b) => a.value - b.value);
  else
    filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

  const uniqueExercises = [...new Set(prs.map((p) => p.exercise))].sort();
  const totalAthletes = new Set(prs.map((p) => p.athlete)).size;

  const inp =
    "w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:border-primary/50 transition-colors";
  const lbl =
    "text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5";

  return (
    <div
      className={`max-w-[860px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <PageTitle sub={`${prs.length} PRs logged · ${totalAthletes} athletes`}>
          🏆 PR <span className="text-primary">Logbook</span>
        </PageTitle>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-5 py-2.5 rounded-full font-body font-bold text-sm text-black border-none cursor-pointer transition-all active:scale-95"
          style={{ background: "hsl(20 100% 50%)" }}
        >
          + Log PR
        </button>
      </div>

      <div className="mk2-card mb-5">
        <div className="flex flex-wrap gap-3 items-center mb-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={myPRsOnly}
              onChange={(e) => setMyPRsOnly(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="font-bold">Show only my PRs</span>
          </label>
          {myPRsOnly && (
            <input
              className={`${inp} max-w-[220px]`}
              placeholder="Your name…"
              value={filterName}
              onChange={(e) => {
                setFilterName(e.target.value);
                localStorage.setItem("mk2r-filter-name", e.target.value);
              }}
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
            Exercise
          </span>
          <select
            value={exerciseFilter}
            onChange={(e) => setExerciseFilter(e.target.value)}
            className={`${inp} max-w-[240px]`}
          >
            <option value="all">All Exercises</option>
            {uniqueExercises.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className="px-4 py-2 rounded-full font-body font-bold text-[12px] border cursor-pointer transition-all"
            style={{
              background:
                category === c.id ? "hsl(20 100% 50%)" : "transparent",
              color:
                category === c.id ? "#000" : "hsl(var(--muted-foreground))",
              borderColor:
                category === c.id ? "hsl(20 100% 50%)" : "hsl(var(--border))",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading PRs…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 mk2-card border-2 border-dashed">
          <div className="text-5xl mb-4">🏆</div>
          <div className="font-bold text-lg mb-2">No PRs yet</div>
          <div className="text-muted-foreground text-sm">
            Log your first personal record above!
          </div>
        </div>
      ) : category !== "all" ? (
        [...new Set(filtered.map((p) => p.exercise))].sort().map((ex) => (
          <div key={ex} className="mb-6">
            <div
              className="font-display text-xl mb-1"
              style={{ color: "hsl(20 100% 50%)" }}
            >
              {ex}
            </div>
            <div
              className="h-0.5 w-12 mb-3"
              style={{ background: "hsl(20 100% 50%)" }}
            />
            {filtered
              .filter((p) => p.exercise === ex)
              .map((pr) => (
                <PRRow key={pr.firebaseKey} pr={pr} />
              ))}
          </div>
        ))
      ) : (
        filtered.map((pr) => <PRRow key={pr.firebaseKey} pr={pr} />)
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-xl tracking-wide">
                  Log Personal Record
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-muted-foreground text-2xl bg-transparent border-none cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Name pre-filled from profile */}
              <div className="grid grid-cols-2 gap-3 mb-3 relative">
                <div>
                  <label className={lbl}>First Name *</label>
                  <input
                    className={inp}
                    placeholder="Ashia"
                    value={firstName}
                    onChange={(e) => onFirstNameChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className={lbl}>Surname *</label>
                  <input
                    className={inp}
                    placeholder="Bowers"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 z-50 bg-card border border-border rounded-xl overflow-hidden w-full mt-1 shadow-xl">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => pickSuggestion(s)}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary border-none bg-transparent cursor-pointer text-foreground border-b border-border last:border-0"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className={lbl}>Category</label>
                <select
                  className={inp}
                  value={formCat}
                  onChange={(e) => {
                    setFormCat(e.target.value);
                    setExercise((EXERCISES as any)[e.target.value][0]);
                  }}
                >
                  <option value="weightlifting">🏋️ Weightlifting</option>
                  <option value="gymnastics">🤸 Gymnastics</option>
                  <option value="metcon">⏱️ MetCon</option>
                  <option value="cardio">🏃 Cardio</option>
                </select>
              </div>

              <div className="mb-3">
                <label className={lbl}>Exercise</label>
                <select
                  className={inp}
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                >
                  {(EXERCISES as any)[formCat].map((ex: string) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className={lbl}>PR Type</label>
                <select
                  className={inp}
                  value={prType}
                  onChange={(e) => setPrType(e.target.value)}
                >
                  <option value="weight">Weight (kg/lbs)</option>
                  <option value="time">Time (min:sec)</option>
                  <option value="reps">Reps</option>
                  <option value="rounds">Rounds</option>
                  <option value="distance">Distance</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={lbl}>
                    {prType === "time"
                      ? "Minutes"
                      : prType === "weight"
                        ? "Weight"
                        : prType === "distance"
                          ? "Distance"
                          : prType === "reps"
                            ? "Reps"
                            : "Rounds"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className={inp}
                    placeholder="0"
                    value={val1}
                    onChange={(e) => setVal1(e.target.value)}
                  />
                </div>
                {prType === "time" ? (
                  <div>
                    <label className={lbl}>Seconds</label>
                    <input
                      type="number"
                      step="1"
                      className={inp}
                      placeholder="0"
                      value={val2}
                      onChange={(e) => setVal2(e.target.value)}
                    />
                  </div>
                ) : prType === "weight" || prType === "distance" ? (
                  <div>
                    <label className={lbl}>Unit</label>
                    <select
                      className={inp}
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      {prType === "distance" ? (
                        <>
                          <option value="km">km</option>
                          <option value="miles">miles</option>
                        </>
                      ) : (
                        <>
                          <option value="kg">kg</option>
                          <option value="lbs">lbs</option>
                        </>
                      )}
                    </select>
                  </div>
                ) : (
                  <div />
                )}
              </div>

              <div className="mb-5">
                <label className={lbl}>Notes (optional)</label>
                <textarea
                  className={`${inp} resize-none`}
                  rows={2}
                  placeholder="How did it feel?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                onClick={savePR}
                disabled={saving || !firstName || !lastName || !val1}
                className="w-full py-3.5 rounded-xl font-body font-bold text-sm text-black border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "hsl(20 100% 50%)" }}
              >
                {saving ? "Saving…" : "🏆 Save Personal Record"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PRRow({ pr }: { pr: PR }) {
  const date = new Date(pr.timestamp);
  return (
    <div className="flex items-center gap-3 p-3.5 bg-secondary border border-border rounded-xl mb-2 hover:border-primary/30 transition-colors">
      <div className="text-center min-w-[44px]">
        <div
          className="font-display text-xl leading-none"
          style={{ color: "hsl(20 100% 50%)" }}
        >
          {date.getDate()}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {date.toLocaleDateString("en-US", { month: "short" })}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-foreground">{pr.athlete}</div>
        <div
          className="text-[11px] font-bold mt-0.5"
          style={{ color: "hsl(20 100% 50%)" }}
        >
          {pr.exercise}
        </div>
        {pr.notes && (
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
            📌 {pr.notes}
          </div>
        )}
      </div>
      <div
        className="font-bold text-sm px-3 py-1.5 rounded-full whitespace-nowrap"
        style={{
          color: "hsl(20 100% 50%)",
          background: "hsl(20 100% 50% / 0.1)",
          border: "1px solid hsl(20 100% 50% / 0.3)",
        }}
      >
        {pr.displayValue}
      </div>
    </div>
  );
}
