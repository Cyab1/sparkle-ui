import { useState, useEffect } from "react";
import { ref, set, get, push, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { PageTitle } from "@/components/shared/PageTitle";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import {
  EXERCISES,
  CATEGORIES,
  type Category,
  type Level,
} from "./Leaderboard";

// Re-use helpers from Leaderboard
function getParentName(name: string): string {
  const i = name.indexOf(" - ");
  return i > -1 ? name.substring(0, i) : name;
}
function getVariantLabel(name: string): string | null {
  const i = name.indexOf(" - ");
  return i > -1 ? name.substring(i + 3) : null;
}
function getExercisesByCategory(cat: Category) {
  return EXERCISES.filter((e) => e.category === cat);
}
function getExerciseById(id: string) {
  return EXERCISES.find((e) => e.exercise_id === id);
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
function getVariants(cat: Category, parent: string) {
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
function isDistanceExercise(name: string) {
  return /^(Run|Row|Ski) - /.test(name);
}
function calcPace(totalSec: number, distKm: number): string {
  const ps = totalSec / distKm;
  const mins = Math.floor(ps / 60);
  const secs = Math.round(ps % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

const PR_PATH = "pr_logbook";
const LEVELS: Level[] = ["Beginner", "Intermediate", "RX"];

const catEmoji: Record<string, string> = {
  Weightlifting: "🏋️",
  Gymnastics: "🤸",
  MetCon: "⏱",
  Cardio: "🏃",
};

interface PR {
  firebaseKey: string;
  athlete: string;
  uid: string;
  category: string;
  exercise_id: string;
  exercise: string;
  gender: string;
  level: Level;
  value: number;
  unit: string;
  displayValue: string;
  notes: string;
  date_logged: string;
  timestamp: string;
}

export function PRLogbook() {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPR, setEditingPR] = useState<PR | null>(null);
  const [category, setCategory] = useState<Category | "all">("all");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  // Form state
  const [formCat, setFormCat] = useState<Category>("Weightlifting");
  const [parentEx, setParentEx] = useState<string>(
    () => getParentExercises("Weightlifting")[0] || "",
  );
  const [exerciseId, setExerciseId] = useState<string>("");
  const [level, setLevel] = useState<Level>("RX");
  const [timeInput, setTimeInput] = useState("");
  const [weightVal, setWeightVal] = useState("");
  const [unit, setUnit] = useState("kg");
  const [notes, setNotes] = useState("");
  const [dateLogged, setDateLogged] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  // ─── UPDATED: useEffect guards check editingPR directly ──────────────
  useEffect(() => {
    if (editingPR) return;
    if (parentEx && formCat) {
      const variants = getVariants(formCat, parentEx);
      if (variants.length === 1) setExerciseId(variants[0].exercise_id);
      else if (!hasVariants(formCat, parentEx))
        setExerciseId(variants[0]?.exercise_id || "");
      else setExerciseId("");
    }
  }, [parentEx, formCat, editingPR]);

  useEffect(() => {
    if (editingPR) return;
    const parents = getParentExercises(formCat);
    setParentEx(parents[0] || "");
  }, [formCat, editingPR]);

  useEffect(() => {
    loadPRs();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenuKey) return;
    const close = () => setOpenMenuKey(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuKey]);

  const loadPRs = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, PR_PATH));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([k, v]: [string, any]) => ({ firebaseKey: k, ...v }),
        );
        setPrs(list);
      } else {
        setPrs([]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const selectedExercise = exerciseId ? getExerciseById(exerciseId) : null;
  const isTime = selectedExercise?.measurement_type === "time";
  const isRun = selectedExercise
    ? isDistanceExercise(selectedExercise.name)
    : false;
  const runDist = selectedExercise
    ? getDistanceKm(selectedExercise.name)
    : null;
  const parsedSec = parseTimeInput(timeInput);
  const pacePreview =
    isRun && runDist && parsedSec != null ? calcPace(parsedSec, runDist) : null;

  const startEdit = (pr: PR) => {
    const ex = getExerciseById(pr.exercise_id);
    if (!ex) return;

    // Clear first so effect guard sees a change
    setEditingPR(null);
    setTimeout(() => setEditingPR(pr), 0);

    setFormCat(pr.category as Category);
    const parent = getParentName(pr.exercise);
    setParentEx(parent);
    setExerciseId(pr.exercise_id);
    setLevel(pr.level);
    setNotes(pr.notes || "");
    setDateLogged(pr.date_logged);

    if (ex.measurement_type === "time") {
      setTimeInput(formatTime(pr.value));
      setWeightVal("");
    } else {
      setWeightVal(String(pr.value));
      setUnit(pr.unit);
      setTimeInput("");
    }

    setShowModal(true);
  };

  const savePR = async () => {
    if (!exerciseId || !user) return;
    if (isTime && (parsedSec == null || parsedSec <= 0)) return;
    if (!isTime && (!weightVal || isNaN(parseFloat(weightVal)))) return;

    setSaving(true);
    const ex = getExerciseById(exerciseId)!;
    const value = isTime ? parsedSec! : parseFloat(weightVal);
    const displayValue = isTime ? formatTime(value) : `${value}${unit}`;

    const prData = {
      uid: user.uid,
      athlete: user.name,
      gender: (user as any).gender === "female" ? "Female" : "Male",
      level,
      category: formCat,
      exercise_id: exerciseId,
      exercise: ex.name,
      value,
      unit: isTime ? "sec" : unit,
      displayValue,
      notes,
      date_logged: dateLogged,
      timestamp: new Date().toISOString(),
    };

    try {
      if (editingPR) {
        await set(ref(db, `${PR_PATH}/${editingPR.firebaseKey}`), prData);
      } else {
        const existing = prs.find(
          (p) =>
            p.uid === user.uid &&
            p.exercise_id === exerciseId &&
            p.level === level,
        );
        if (existing) {
          await set(ref(db, `${PR_PATH}/${existing.firebaseKey}`), prData);
        } else {
          await push(ref(db, PR_PATH), prData);
        }
      }

      setShowModal(false);
      setEditingPR(null);
      resetForm();
      loadPRs();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const deletePR = async (pr: PR) => {
    if (
      !confirm(
        `Delete your ${pr.exercise} (${pr.level}) PR of ${pr.displayValue}?`,
      )
    )
      return;
    setDeleting(pr.firebaseKey);
    try {
      await remove(ref(db, `${PR_PATH}/${pr.firebaseKey}`));
      setPrs((prev) => prev.filter((p) => p.firebaseKey !== pr.firebaseKey));
    } catch (e) {
      console.error(e);
    }
    setDeleting(null);
  };

  const resetForm = () => {
    setEditingPR(null);
    setFormCat("Weightlifting");
    setTimeInput("");
    setWeightVal("");
    setUnit("kg");
    setNotes("");
    setDateLogged(new Date().toISOString().split("T")[0]);
    setLevel("RX");
  };

  // Filter — only current user's PRs
  let filtered = prs.filter((p) => {
    if (p.uid !== user?.uid) return false;
    if (category !== "all" && p.category !== category) return false;
    return true;
  });

  // Best per exercise for display
  const bestPerEx: Record<string, PR> = {};
  filtered.forEach((p) => {
    const ex = getExerciseById(p.exercise_id);
    const isT = ex?.measurement_type === "time";
    const existing = bestPerEx[p.exercise_id];
    if (
      !existing ||
      (isT ? p.value < existing.value : p.value > existing.value)
    ) {
      bestPerEx[p.exercise_id] = p;
    }
  });
  const displayPRs = Object.values(bestPerEx).sort(
    (a, b) =>
      new Date(b.date_logged).getTime() - new Date(a.date_logged).getTime(),
  );

  const inp =
    "w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-colors font-body";
  const lbl =
    "text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5";

  return (
    <div
      className={`max-w-[860px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <PageTitle
          sub={`${displayPRs.length} personal record${displayPRs.length !== 1 ? "s" : ""}`}
        >
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

      {/* Category filter pills */}
      <div className="mk2-card mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "All" },
            ...CATEGORIES.map((c) => ({ id: c, label: `${catEmoji[c]} ${c}` })),
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id as any)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer transition-all font-body"
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
      </div>

      {/* PR Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading PRs…
        </div>
      ) : displayPRs.length === 0 ? (
        <div className="text-center py-16 mk2-card border-2 border-dashed">
          <div className="text-5xl mb-4">🏆</div>
          <div className="font-bold text-lg mb-2">No PRs yet</div>
          <div className="text-muted-foreground text-sm">
            Log your first personal record!
          </div>
        </div>
      ) : (
        CATEGORIES.filter((cat) => category === "all" || cat === category).map(
          (cat) => {
            const catPRs = displayPRs.filter((p) => p.category === cat);
            if (catPRs.length === 0) return null;
            return (
              <div key={cat} className="mb-6">
                <div
                  className="font-display text-lg mb-1"
                  style={{ color: "hsl(20 100% 50%)" }}
                >
                  {catEmoji[cat]} {cat}
                </div>
                <div
                  className="h-0.5 w-10 mb-3"
                  style={{ background: "hsl(20 100% 50%)" }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {catPRs.map((pr) => {
                    const ex = getExerciseById(pr.exercise_id);
                    const distKm = ex ? getDistanceKm(ex.name) : null;
                    const pace =
                      ex?.measurement_type === "time" && distKm
                        ? calcPace(pr.value, distKm)
                        : null;
                    return (
                      <div
                        key={pr.firebaseKey}
                        className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors relative"
                      >
                        {/* ⋮ Three-dot menu */}
                        <div className="absolute top-3 right-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuKey(
                                openMenuKey === pr.firebaseKey
                                  ? null
                                  : pr.firebaseKey,
                              );
                            }}
                            className="p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-all"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = "hsl(var(--secondary))";
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.color = "hsl(var(--foreground))";
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = "transparent";
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.color = "hsl(var(--muted-foreground))";
                            }}
                            aria-label="Options"
                          >
                            {/* Vertical dots SVG */}
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="5" r="1.8" />
                              <circle cx="12" cy="12" r="1.8" />
                              <circle cx="12" cy="19" r="1.8" />
                            </svg>
                          </button>

                          {/* Dropdown */}
                          {openMenuKey === pr.firebaseKey && (
                            <div
                              className="absolute right-0 top-9 z-50 bg-card border border-border rounded-xl overflow-hidden"
                              style={{
                                minWidth: "130px",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setOpenMenuKey(null);
                                  startEdit(pr);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-body border-none bg-transparent cursor-pointer transition-colors text-foreground"
                                onMouseEnter={(e) =>
                                  ((
                                    e.currentTarget as HTMLButtonElement
                                  ).style.background = "hsl(var(--secondary))")
                                }
                                onMouseLeave={(e) =>
                                  ((
                                    e.currentTarget as HTMLButtonElement
                                  ).style.background = "transparent")
                                }
                              >
                                ✏️ Edit PR
                              </button>
                              <div className="h-px bg-border" />
                              <button
                                onClick={() => {
                                  setOpenMenuKey(null);
                                  deletePR(pr);
                                }}
                                disabled={deleting === pr.firebaseKey}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-body border-none bg-transparent cursor-pointer transition-colors"
                                style={{
                                  color:
                                    deleting === pr.firebaseKey
                                      ? "hsl(var(--muted-foreground))"
                                      : "hsl(0 84% 51%)",
                                }}
                                onMouseEnter={(e) => {
                                  if (deleting !== pr.firebaseKey)
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.background =
                                      "hsl(0 84% 51% / 0.08)";
                                }}
                                onMouseLeave={(e) =>
                                  ((
                                    e.currentTarget as HTMLButtonElement
                                  ).style.background = "transparent")
                                }
                              >
                                {deleting === pr.firebaseKey
                                  ? "Deleting…"
                                  : "🗑 Delete"}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Card content */}
                        <div className="flex items-start justify-between mb-2">
                          <div
                            className="flex-1 min-w-0"
                            style={{ paddingRight: "32px" }}
                          >
                            <div className="font-bold text-sm text-foreground">
                              {pr.exercise}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {pr.level} · {pr.date_logged}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <div
                              className="font-display text-2xl leading-none"
                              style={{ color: "hsl(20 100% 50%)" }}
                            >
                              {pr.displayValue}
                            </div>
                            {pace && (
                              <div className="text-[10px] text-primary/70 mt-0.5">
                                {pace}
                              </div>
                            )}
                          </div>
                        </div>

                        {pr.notes && (
                          <div className="text-[11px] text-muted-foreground italic mt-1.5">
                            📌 {pr.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          },
        )
      )}

      {/* ── Log / Edit PR Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
            onClick={() => {
              setShowModal(false);
              setEditingPR(null);
            }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="font-display text-xl tracking-wide">
                  {editingPR ? "Edit Personal Record" : "Log Personal Record"}
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingPR(null);
                  }}
                  className="text-muted-foreground text-2xl bg-transparent border-none cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Athlete */}
              <div className="mk2-card mb-4 bg-secondary/50">
                <div className="text-xs text-muted-foreground mb-0.5">
                  Logging as
                </div>
                <div className="font-bold">{user?.name}</div>
              </div>

              {/* Category */}
              <div className="mb-3">
                <label className={lbl}>Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFormCat(cat)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all font-body"
                      style={{
                        background:
                          formCat === cat ? "hsl(20 100% 50%)" : "transparent",
                        color:
                          formCat === cat
                            ? "#000"
                            : "hsl(var(--muted-foreground))",
                        borderColor:
                          formCat === cat
                            ? "hsl(20 100% 50%)"
                            : "hsl(var(--border))",
                      }}
                    >
                      {catEmoji[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercise parent */}
              <div className="mb-3">
                <label className={lbl}>Exercise</label>
                <select
                  className={inp}
                  value={parentEx}
                  onChange={(e) => setParentEx(e.target.value)}
                >
                  {getParentExercises(formCat).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variants */}
              {parentEx && hasVariants(formCat, parentEx) && (
                <div className="mb-3">
                  <label className={lbl}>Distance / Target</label>
                  <select
                    className={inp}
                    value={exerciseId}
                    onChange={(e) => setExerciseId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {getVariants(formCat, parentEx).map((v) => (
                      <option key={v.exercise_id} value={v.exercise_id}>
                        {getVariantLabel(v.name) || v.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Level */}
              <div className="mb-3">
                <label className={lbl}>Level</label>
                <div className="flex gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold border cursor-pointer transition-all font-body"
                      style={{
                        background:
                          level === l ? "hsl(20 100% 50%)" : "transparent",
                        color:
                          level === l ? "#000" : "hsl(var(--muted-foreground))",
                        borderColor:
                          level === l
                            ? "hsl(20 100% 50%)"
                            : "hsl(var(--border))",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value input */}
              {exerciseId &&
                (isTime ? (
                  <div className="mb-3">
                    <label className={lbl}>Time (MM:SS or HH:MM:SS)</label>
                    <input
                      className={inp}
                      placeholder="e.g. 4:35 or 1:23:45"
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                    />
                    {pacePreview && (
                      <div className="text-xs text-primary mt-1.5">
                        Avg pace: {pacePreview}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={lbl}>Value</label>
                      <input
                        type="number"
                        step="0.5"
                        className={inp}
                        placeholder="e.g. 100"
                        value={weightVal}
                        onChange={(e) => setWeightVal(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={lbl}>Unit</label>
                      <select
                        className={inp}
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      >
                        {selectedExercise?.measurement_type === "reps" ? (
                          <>
                            <option value="reps">reps</option>
                            <option value="rounds">rounds</option>
                          </>
                        ) : (
                          <>
                            <option value="kg">kg</option>
                            <option value="lbs">lbs</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                ))}

              {/* Date */}
              <div className="mb-3">
                <label className={lbl}>Date</label>
                <input
                  type="date"
                  className={inp}
                  value={dateLogged}
                  onChange={(e) => setDateLogged(e.target.value)}
                />
              </div>

              {/* Notes */}
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
                disabled={
                  saving ||
                  !exerciseId ||
                  (isTime ? !parsedSec || parsedSec <= 0 : !weightVal)
                }
                className="w-full py-3.5 rounded-xl font-body font-bold text-sm text-black border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "hsl(20 100% 50%)" }}
              >
                {saving
                  ? "Saving…"
                  : editingPR
                    ? "💾 Save Changes"
                    : prs.some(
                          (p) =>
                            p.uid === user?.uid &&
                            p.exercise_id === exerciseId &&
                            p.level === level,
                        )
                      ? "🔄 Update Personal Record"
                      : "🏆 Save Personal Record"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// import { useState, useEffect, useRef } from "react";
// import { ref, set, get, push, remove } from "firebase/database";
// import { db } from "@/lib/firebase";
// import { useAuth } from "@/context/AuthContext";
// import { motion, AnimatePresence } from "framer-motion";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import {
//   EXERCISES,
//   CATEGORIES,
//   type Category,
//   type Level,
// } from "./Leaderboard";

// // Re-use helpers from Leaderboard
// function getParentName(name: string): string {
//   const i = name.indexOf(" - ");
//   return i > -1 ? name.substring(0, i) : name;
// }
// function getVariantLabel(name: string): string | null {
//   const i = name.indexOf(" - ");
//   return i > -1 ? name.substring(i + 3) : null;
// }
// function getExercisesByCategory(cat: Category) {
//   return EXERCISES.filter((e) => e.category === cat);
// }
// function getExerciseById(id: string) {
//   return EXERCISES.find((e) => e.exercise_id === id);
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
// function getVariants(cat: Category, parent: string) {
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
// function isDistanceExercise(name: string) {
//   return /^(Run|Row|Ski) - /.test(name);
// }
// function calcPace(totalSec: number, distKm: number): string {
//   const ps = totalSec / distKm;
//   const mins = Math.floor(ps / 60);
//   const secs = Math.round(ps % 60);
//   return `${mins}:${String(secs).padStart(2, "0")} /km`;
// }

// const PR_PATH = "pr_logbook";
// const LEVELS: Level[] = ["Beginner", "Intermediate", "RX"];

// const catEmoji: Record<string, string> = {
//   Weightlifting: "🏋️",
//   Gymnastics: "🤸",
//   MetCon: "⏱",
//   Cardio: "🏃",
// };

// interface PR {
//   firebaseKey: string;
//   athlete: string;
//   uid: string;
//   category: string;
//   exercise_id: string;
//   exercise: string;
//   gender: string;
//   level: Level;
//   value: number;
//   unit: string;
//   displayValue: string;
//   notes: string;
//   date_logged: string;
//   timestamp: string;
// }

// export function PRLogbook() {
//   const { user } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [prs, setPrs] = useState<PR[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showModal, setShowModal] = useState(false);
//   const [editingPR, setEditingPR] = useState<PR | null>(null);
//   const [category, setCategory] = useState<Category | "all">("all");
//   const [saving, setSaving] = useState(false);
//   const [deleting, setDeleting] = useState<string | null>(null);
//   const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

//   // Guards the formCat -> parentEx auto-reset effect below so it only runs
//   // for user-driven category changes, not when startEdit() is populating
//   // the form to edit an existing PR (which sets formCat/parentEx/exerciseId
//   // together and must not have parentEx clobbered back to a default).
//   const isEditingRef = useRef(false);

//   // Form state
//   const [formCat, setFormCat] = useState<Category>("Weightlifting");
//   const [parentEx, setParentEx] = useState<string>(
//     () => getParentExercises("Weightlifting")[0] || "",
//   );
//   const [exerciseId, setExerciseId] = useState<string>("");
//   const [level, setLevel] = useState<Level>("RX");
//   const [timeInput, setTimeInput] = useState("");
//   const [weightVal, setWeightVal] = useState("");
//   const [unit, setUnit] = useState("kg");
//   const [notes, setNotes] = useState("");
//   const [dateLogged, setDateLogged] = useState(
//     () => new Date().toISOString().split("T")[0],
//   );

//   useEffect(() => {
//     if (isEditingRef.current) return;
//     if (parentEx && formCat) {
//       const variants = getVariants(formCat, parentEx);
//       if (variants.length === 1) setExerciseId(variants[0].exercise_id);
//       else if (!hasVariants(formCat, parentEx))
//         setExerciseId(variants[0]?.exercise_id || "");
//       else setExerciseId("");
//     }
//   }, [parentEx, formCat]);

//   useEffect(() => {
//     if (isEditingRef.current) return;
//     const parents = getParentExercises(formCat);
//     setParentEx(parents[0] || "");
//   }, [formCat]);

//   // Clears the edit guard after both effects above have had a chance to
//   // run for the render where startEdit() populated the form. Runs last
//   // because it has no dependency array entries tying it to formCat/parentEx
//   // specifically — React flushes effects in declaration order each commit,
//   // so by the time this runs, the two guarded effects above already saw
//   // isEditingRef.current === true and bailed out for this commit.
//   useEffect(() => {
//     isEditingRef.current = false;
//   }, [editingPR]);

//   useEffect(() => {
//     loadPRs();
//   }, []);

//   // Close menu when clicking outside
//   useEffect(() => {
//     if (!openMenuKey) return;
//     const close = () => setOpenMenuKey(null);
//     document.addEventListener("click", close);
//     return () => document.removeEventListener("click", close);
//   }, [openMenuKey]);

//   const loadPRs = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, PR_PATH));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([k, v]: [string, any]) => ({ firebaseKey: k, ...v }),
//         );
//         setPrs(list);
//       } else {
//         setPrs([]);
//       }
//     } catch (e) {
//       console.error(e);
//     }
//     setLoading(false);
//   };

//   const selectedExercise = exerciseId ? getExerciseById(exerciseId) : null;
//   const isTime = selectedExercise?.measurement_type === "time";
//   const isRun = selectedExercise
//     ? isDistanceExercise(selectedExercise.name)
//     : false;
//   const runDist = selectedExercise
//     ? getDistanceKm(selectedExercise.name)
//     : null;
//   const parsedSec = parseTimeInput(timeInput);
//   const pacePreview =
//     isRun && runDist && parsedSec != null ? calcPace(parsedSec, runDist) : null;

//   const startEdit = (pr: PR) => {
//     const ex = getExerciseById(pr.exercise_id);
//     if (!ex) return;

//     isEditingRef.current = true;
//     setEditingPR(pr);
//     setFormCat(pr.category as Category);

//     const parent = getParentName(pr.exercise);
//     setParentEx(parent);
//     setExerciseId(pr.exercise_id);
//     setLevel(pr.level);
//     setNotes(pr.notes || "");
//     setDateLogged(pr.date_logged);

//     if (ex.measurement_type === "time") {
//       setTimeInput(formatTime(pr.value));
//       setWeightVal("");
//     } else {
//       setWeightVal(String(pr.value));
//       setUnit(pr.unit);
//       setTimeInput("");
//     }

//     setShowModal(true);
//   };

//   const savePR = async () => {
//     if (!exerciseId || !user) return;
//     if (isTime && (parsedSec == null || parsedSec <= 0)) return;
//     if (!isTime && (!weightVal || isNaN(parseFloat(weightVal)))) return;

//     setSaving(true);
//     const ex = getExerciseById(exerciseId)!;
//     const value = isTime ? parsedSec! : parseFloat(weightVal);
//     const displayValue = isTime ? formatTime(value) : `${value}${unit}`;

//     const prData = {
//       uid: user.uid,
//       athlete: user.name,
//       gender: (user as any).gender === "female" ? "Female" : "Male",
//       level,
//       category: formCat,
//       exercise_id: exerciseId,
//       exercise: ex.name,
//       value,
//       unit: isTime ? "sec" : unit,
//       displayValue,
//       notes,
//       date_logged: dateLogged,
//       timestamp: new Date().toISOString(),
//     };

//     try {
//       if (editingPR) {
//         await set(ref(db, `${PR_PATH}/${editingPR.firebaseKey}`), prData);
//       } else {
//         const existing = prs.find(
//           (p) =>
//             p.uid === user.uid &&
//             p.exercise_id === exerciseId &&
//             p.level === level,
//         );
//         if (existing) {
//           await set(ref(db, `${PR_PATH}/${existing.firebaseKey}`), prData);
//         } else {
//           await push(ref(db, PR_PATH), prData);
//         }
//       }

//       setShowModal(false);
//       setEditingPR(null);
//       resetForm();
//       loadPRs();
//     } catch (e) {
//       console.error(e);
//     }
//     setSaving(false);
//   };

//   const deletePR = async (pr: PR) => {
//     if (
//       !confirm(
//         `Delete your ${pr.exercise} (${pr.level}) PR of ${pr.displayValue}?`,
//       )
//     )
//       return;
//     setDeleting(pr.firebaseKey);
//     try {
//       await remove(ref(db, `${PR_PATH}/${pr.firebaseKey}`));
//       setPrs((prev) => prev.filter((p) => p.firebaseKey !== pr.firebaseKey));
//     } catch (e) {
//       console.error(e);
//     }
//     setDeleting(null);
//   };

//   const resetForm = () => {
//     setEditingPR(null);
//     setFormCat("Weightlifting");
//     setTimeInput("");
//     setWeightVal("");
//     setUnit("kg");
//     setNotes("");
//     setDateLogged(new Date().toISOString().split("T")[0]);
//     setLevel("RX");
//   };

//   // Filter — only current user's PRs
//   let filtered = prs.filter((p) => {
//     if (p.uid !== user?.uid) return false;
//     if (category !== "all" && p.category !== category) return false;
//     return true;
//   });

//   // Best per exercise for display
//   const bestPerEx: Record<string, PR> = {};
//   filtered.forEach((p) => {
//     const ex = getExerciseById(p.exercise_id);
//     const isT = ex?.measurement_type === "time";
//     const existing = bestPerEx[p.exercise_id];
//     if (
//       !existing ||
//       (isT ? p.value < existing.value : p.value > existing.value)
//     ) {
//       bestPerEx[p.exercise_id] = p;
//     }
//   });
//   const displayPRs = Object.values(bestPerEx).sort(
//     (a, b) =>
//       new Date(b.date_logged).getTime() - new Date(a.date_logged).getTime(),
//   );

//   const inp =
//     "w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-primary/50 transition-colors font-body";
//   const lbl =
//     "text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5";

//   return (
//     <div
//       className={`max-w-[860px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
//         <PageTitle
//           sub={`${displayPRs.length} personal record${displayPRs.length !== 1 ? "s" : ""}`}
//         >
//           🏆 PR <span className="text-primary">Logbook</span>
//         </PageTitle>
//         <button
//           onClick={() => {
//             resetForm();
//             setShowModal(true);
//           }}
//           className="px-5 py-2.5 rounded-full font-body font-bold text-sm text-black border-none cursor-pointer transition-all active:scale-95"
//           style={{ background: "hsl(20 100% 50%)" }}
//         >
//           + Log PR
//         </button>
//       </div>

//       {/* Category filter pills */}
//       <div className="mk2-card mb-4 flex flex-wrap gap-3 items-center">
//         <div className="flex flex-wrap gap-1.5">
//           {[
//             { id: "all", label: "All" },
//             ...CATEGORIES.map((c) => ({ id: c, label: `${catEmoji[c]} ${c}` })),
//           ].map((c) => (
//             <button
//               key={c.id}
//               onClick={() => setCategory(c.id as any)}
//               className="px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer transition-all font-body"
//               style={{
//                 background:
//                   category === c.id ? "hsl(20 100% 50%)" : "transparent",
//                 color:
//                   category === c.id ? "#000" : "hsl(var(--muted-foreground))",
//                 borderColor:
//                   category === c.id ? "hsl(20 100% 50%)" : "hsl(var(--border))",
//               }}
//             >
//               {c.label}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* PR Cards */}
//       {loading ? (
//         <div className="text-center py-12 text-muted-foreground">
//           Loading PRs…
//         </div>
//       ) : displayPRs.length === 0 ? (
//         <div className="text-center py-16 mk2-card border-2 border-dashed">
//           <div className="text-5xl mb-4">🏆</div>
//           <div className="font-bold text-lg mb-2">No PRs yet</div>
//           <div className="text-muted-foreground text-sm">
//             Log your first personal record!
//           </div>
//         </div>
//       ) : (
//         CATEGORIES.filter((cat) => category === "all" || cat === category).map(
//           (cat) => {
//             const catPRs = displayPRs.filter((p) => p.category === cat);
//             if (catPRs.length === 0) return null;
//             return (
//               <div key={cat} className="mb-6">
//                 <div
//                   className="font-display text-lg mb-1"
//                   style={{ color: "hsl(20 100% 50%)" }}
//                 >
//                   {catEmoji[cat]} {cat}
//                 </div>
//                 <div
//                   className="h-0.5 w-10 mb-3"
//                   style={{ background: "hsl(20 100% 50%)" }}
//                 />
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                   {catPRs.map((pr) => {
//                     const ex = getExerciseById(pr.exercise_id);
//                     const distKm = ex ? getDistanceKm(ex.name) : null;
//                     const pace =
//                       ex?.measurement_type === "time" && distKm
//                         ? calcPace(pr.value, distKm)
//                         : null;
//                     return (
//                       <div
//                         key={pr.firebaseKey}
//                         className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors relative"
//                       >
//                         {/* ⋮ Three-dot menu */}
//                         <div className="absolute top-3 right-3">
//                           <button
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               setOpenMenuKey(
//                                 openMenuKey === pr.firebaseKey
//                                   ? null
//                                   : pr.firebaseKey,
//                               );
//                             }}
//                             className="p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-all"
//                             style={{ color: "hsl(var(--muted-foreground))" }}
//                             onMouseEnter={(e) => {
//                               (
//                                 e.currentTarget as HTMLButtonElement
//                               ).style.background = "hsl(var(--secondary))";
//                               (
//                                 e.currentTarget as HTMLButtonElement
//                               ).style.color = "hsl(var(--foreground))";
//                             }}
//                             onMouseLeave={(e) => {
//                               (
//                                 e.currentTarget as HTMLButtonElement
//                               ).style.background = "transparent";
//                               (
//                                 e.currentTarget as HTMLButtonElement
//                               ).style.color = "hsl(var(--muted-foreground))";
//                             }}
//                             aria-label="Options"
//                           >
//                             {/* Vertical dots SVG */}
//                             <svg
//                               width="16"
//                               height="16"
//                               viewBox="0 0 24 24"
//                               fill="currentColor"
//                               aria-hidden="true"
//                             >
//                               <circle cx="12" cy="5" r="1.8" />
//                               <circle cx="12" cy="12" r="1.8" />
//                               <circle cx="12" cy="19" r="1.8" />
//                             </svg>
//                           </button>

//                           {/* Dropdown */}
//                           {openMenuKey === pr.firebaseKey && (
//                             <div
//                               className="absolute right-0 top-9 z-50 bg-card border border-border rounded-xl overflow-hidden"
//                               style={{
//                                 minWidth: "130px",
//                                 boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
//                               }}
//                               onClick={(e) => e.stopPropagation()}
//                             >
//                               <button
//                                 onClick={() => {
//                                   setOpenMenuKey(null);
//                                   startEdit(pr);
//                                 }}
//                                 className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-body border-none bg-transparent cursor-pointer transition-colors text-foreground"
//                                 onMouseEnter={(e) =>
//                                   ((
//                                     e.currentTarget as HTMLButtonElement
//                                   ).style.background = "hsl(var(--secondary))")
//                                 }
//                                 onMouseLeave={(e) =>
//                                   ((
//                                     e.currentTarget as HTMLButtonElement
//                                   ).style.background = "transparent")
//                                 }
//                               >
//                                 ✏️ Edit PR
//                               </button>
//                               <div className="h-px bg-border" />
//                               <button
//                                 onClick={() => {
//                                   setOpenMenuKey(null);
//                                   deletePR(pr);
//                                 }}
//                                 disabled={deleting === pr.firebaseKey}
//                                 className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-body border-none bg-transparent cursor-pointer transition-colors"
//                                 style={{
//                                   color:
//                                     deleting === pr.firebaseKey
//                                       ? "hsl(var(--muted-foreground))"
//                                       : "hsl(0 84% 51%)",
//                                 }}
//                                 onMouseEnter={(e) => {
//                                   if (deleting !== pr.firebaseKey)
//                                     (
//                                       e.currentTarget as HTMLButtonElement
//                                     ).style.background =
//                                       "hsl(0 84% 51% / 0.08)";
//                                 }}
//                                 onMouseLeave={(e) =>
//                                   ((
//                                     e.currentTarget as HTMLButtonElement
//                                   ).style.background = "transparent")
//                                 }
//                               >
//                                 {deleting === pr.firebaseKey
//                                   ? "Deleting…"
//                                   : "🗑 Delete"}
//                               </button>
//                             </div>
//                           )}
//                         </div>

//                         {/* Card content */}
//                         <div className="flex items-start justify-between mb-2">
//                           <div
//                             className="flex-1 min-w-0"
//                             style={{ paddingRight: "32px" }}
//                           >
//                             <div className="font-bold text-sm text-foreground">
//                               {pr.exercise}
//                             </div>
//                             <div className="text-[10px] text-muted-foreground mt-0.5">
//                               {pr.level} · {pr.date_logged}
//                             </div>
//                           </div>
//                           <div className="text-right ml-3">
//                             <div
//                               className="font-display text-2xl leading-none"
//                               style={{ color: "hsl(20 100% 50%)" }}
//                             >
//                               {pr.displayValue}
//                             </div>
//                             {pace && (
//                               <div className="text-[10px] text-primary/70 mt-0.5">
//                                 {pace}
//                               </div>
//                             )}
//                           </div>
//                         </div>

//                         {pr.notes && (
//                           <div className="text-[11px] text-muted-foreground italic mt-1.5">
//                             📌 {pr.notes}
//                           </div>
//                         )}
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             );
//           },
//         )
//       )}

//       {/* ── Log / Edit PR Modal ───────────────────────────────────────── */}
//       <AnimatePresence>
//         {showModal && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
//             onClick={() => {
//               setShowModal(false);
//               setEditingPR(null);
//             }}
//           >
//             <motion.div
//               initial={{ y: 30, opacity: 0 }}
//               animate={{ y: 0, opacity: 1 }}
//               exit={{ y: 30, opacity: 0 }}
//               className="w-full max-w-md bg-card border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <div className="flex items-center justify-between mb-5">
//                 <div className="font-display text-xl tracking-wide">
//                   {editingPR ? "Edit Personal Record" : "Log Personal Record"}
//                 </div>
//                 <button
//                   onClick={() => {
//                     setShowModal(false);
//                     setEditingPR(null);
//                   }}
//                   className="text-muted-foreground text-2xl bg-transparent border-none cursor-pointer"
//                 >
//                   ×
//                 </button>
//               </div>

//               {/* Athlete */}
//               <div className="mk2-card mb-4 bg-secondary/50">
//                 <div className="text-xs text-muted-foreground mb-0.5">
//                   Logging as
//                 </div>
//                 <div className="font-bold">{user?.name}</div>
//               </div>

//               {/* Category */}
//               <div className="mb-3">
//                 <label className={lbl}>Category</label>
//                 <div className="flex flex-wrap gap-1.5">
//                   {CATEGORIES.map((cat) => (
//                     <button
//                       key={cat}
//                       onClick={() => setFormCat(cat)}
//                       className="px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all font-body"
//                       style={{
//                         background:
//                           formCat === cat ? "hsl(20 100% 50%)" : "transparent",
//                         color:
//                           formCat === cat
//                             ? "#000"
//                             : "hsl(var(--muted-foreground))",
//                         borderColor:
//                           formCat === cat
//                             ? "hsl(20 100% 50%)"
//                             : "hsl(var(--border))",
//                       }}
//                     >
//                       {catEmoji[cat]} {cat}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* Exercise parent */}
//               <div className="mb-3">
//                 <label className={lbl}>Exercise</label>
//                 <select
//                   className={inp}
//                   value={parentEx}
//                   onChange={(e) => setParentEx(e.target.value)}
//                 >
//                   {getParentExercises(formCat).map((p) => (
//                     <option key={p} value={p}>
//                       {p}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Variants */}
//               {parentEx && hasVariants(formCat, parentEx) && (
//                 <div className="mb-3">
//                   <label className={lbl}>Distance / Target</label>
//                   <select
//                     className={inp}
//                     value={exerciseId}
//                     onChange={(e) => setExerciseId(e.target.value)}
//                   >
//                     <option value="">Select…</option>
//                     {getVariants(formCat, parentEx).map((v) => (
//                       <option key={v.exercise_id} value={v.exercise_id}>
//                         {getVariantLabel(v.name) || v.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               )}

//               {/* Level */}
//               <div className="mb-3">
//                 <label className={lbl}>Level</label>
//                 <div className="flex gap-2">
//                   {LEVELS.map((l) => (
//                     <button
//                       key={l}
//                       onClick={() => setLevel(l)}
//                       className="flex-1 py-2 rounded-lg text-xs font-bold border cursor-pointer transition-all font-body"
//                       style={{
//                         background:
//                           level === l ? "hsl(20 100% 50%)" : "transparent",
//                         color:
//                           level === l ? "#000" : "hsl(var(--muted-foreground))",
//                         borderColor:
//                           level === l
//                             ? "hsl(20 100% 50%)"
//                             : "hsl(var(--border))",
//                       }}
//                     >
//                       {l}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* Value input */}
//               {exerciseId &&
//                 (isTime ? (
//                   <div className="mb-3">
//                     <label className={lbl}>Time (MM:SS or HH:MM:SS)</label>
//                     <input
//                       className={inp}
//                       placeholder="e.g. 4:35 or 1:23:45"
//                       value={timeInput}
//                       onChange={(e) => setTimeInput(e.target.value)}
//                     />
//                     {pacePreview && (
//                       <div className="text-xs text-primary mt-1.5">
//                         Avg pace: {pacePreview}
//                       </div>
//                     )}
//                   </div>
//                 ) : (
//                   <div className="grid grid-cols-2 gap-3 mb-3">
//                     <div>
//                       <label className={lbl}>Value</label>
//                       <input
//                         type="number"
//                         step="0.5"
//                         className={inp}
//                         placeholder="e.g. 100"
//                         value={weightVal}
//                         onChange={(e) => setWeightVal(e.target.value)}
//                       />
//                     </div>
//                     <div>
//                       <label className={lbl}>Unit</label>
//                       <select
//                         className={inp}
//                         value={unit}
//                         onChange={(e) => setUnit(e.target.value)}
//                       >
//                         {selectedExercise?.measurement_type === "reps" ? (
//                           <>
//                             <option value="reps">reps</option>
//                             <option value="rounds">rounds</option>
//                           </>
//                         ) : (
//                           <>
//                             <option value="kg">kg</option>
//                             <option value="lbs">lbs</option>
//                           </>
//                         )}
//                       </select>
//                     </div>
//                   </div>
//                 ))}

//               {/* Date */}
//               <div className="mb-3">
//                 <label className={lbl}>Date</label>
//                 <input
//                   type="date"
//                   className={inp}
//                   value={dateLogged}
//                   onChange={(e) => setDateLogged(e.target.value)}
//                 />
//               </div>

//               {/* Notes */}
//               <div className="mb-5">
//                 <label className={lbl}>Notes (optional)</label>
//                 <textarea
//                   className={`${inp} resize-none`}
//                   rows={2}
//                   placeholder="How did it feel?"
//                   value={notes}
//                   onChange={(e) => setNotes(e.target.value)}
//                 />
//               </div>

//               <button
//                 onClick={savePR}
//                 disabled={
//                   saving ||
//                   !exerciseId ||
//                   (isTime ? !parsedSec || parsedSec <= 0 : !weightVal)
//                 }
//                 className="w-full py-3.5 rounded-xl font-body font-bold text-sm text-black border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50"
//                 style={{ background: "hsl(20 100% 50%)" }}
//               >
//                 {saving
//                   ? "Saving…"
//                   : editingPR
//                     ? "💾 Save Changes"
//                     : prs.some(
//                           (p) =>
//                             p.uid === user?.uid &&
//                             p.exercise_id === exerciseId &&
//                             p.level === level,
//                         )
//                       ? "🔄 Update Personal Record"
//                       : "🏆 Save Personal Record"}
//               </button>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }
