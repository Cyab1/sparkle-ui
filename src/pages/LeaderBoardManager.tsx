import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Btn } from "@/components/shared/Btn";
import { ref, get, set, remove, push, update } from "firebase/database";

// Style helpers (reused from Admin.tsx)
const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  marginBottom: 4,
  color: "hsl(var(--muted-foreground))",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 13,
  color: "hsl(var(--foreground))",
};

interface CustomLeaderboardEntry {
  id: string;
  name: string;
  points: number;
  checkIns: number;
  workouts: number;
  isCustom: true;
}

interface RealUser {
  uid: string;
  name: string;
  points: number;
  checkIns: number;
  workouts: number;
  showInLeaderboard: boolean;
}

interface CombinedEntry {
  key: string;
  name: string;
  points: number;
}

// ── Challenges Manager Component (internal) ──────────────────────────────────
function ChallengesManager({
  toast,
}: {
  toast: (msg: string, type: string) => void;
}) {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    type: "points",
  });

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "challenges"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([id, val]: [string, any]) => ({
            id,
            ...val,
          }),
        );
        setChallenges(
          list.sort((a, b) =>
            (a.startDate || "").localeCompare(b.startDate || ""),
          ),
        );
      } else {
        setChallenges([]);
      }
    } catch {
      toast("Failed to load challenges", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const addChallenge = async () => {
    if (!form.name.trim()) {
      toast("Challenge name is required", "error");
      return;
    }
    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      type: form.type,
      createdAt: Date.now(),
    };
    try {
      await push(ref(db, "challenges"), data);
      toast("Challenge created ✓", "success");
      setShowForm(false);
      setForm({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        type: "points",
      });
      loadChallenges();
    } catch {
      toast("Failed to create challenge", "error");
    }
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm("Delete this challenge?")) return;
    try {
      await remove(ref(db, `challenges/${id}`));
      toast("Challenge deleted", "info");
      loadChallenges();
    } catch {
      toast("Delete failed", "error");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="font-bold text-sm">
          Challenges ({challenges.length})
        </div>
        <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Create Challenge"}
        </Btn>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 p-4 rounded-lg"
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <div className="font-bold text-sm mb-3">New Challenge</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label style={lbl}>Challenge Name</label>
                <input
                  style={inp}
                  placeholder="e.g. 30-Day Push-Up Challenge"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label style={lbl}>Description</label>
                <textarea
                  style={{ ...inp, minHeight: 60 }}
                  placeholder="Details about the challenge..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label style={lbl}>Start Date</label>
                <input
                  type="date"
                  style={inp}
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label style={lbl}>End Date</label>
                <input
                  type="date"
                  style={inp}
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label style={lbl}>Scoring Type</label>
                <select
                  style={inp}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="points">Points</option>
                  <option value="workouts">Workout Count</option>
                  <option value="checkins">Check‑ins</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Btn variant="primary" onClick={addChallenge}>
                Create Challenge
              </Btn>
              <Btn variant="subtle" onClick={() => setShowForm(false)}>
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-muted-foreground text-sm py-8">
          Loading challenges…
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-muted-foreground text-sm py-8">
          No challenges yet. Create one above.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {challenges.map((ch) => (
            <div
              key={ch.id}
              className="bg-secondary rounded-lg p-3 flex justify-between items-start gap-2 flex-wrap"
              style={{ borderLeft: "3px solid hsl(20 100% 50%)" }}
            >
              <div className="flex-1">
                <div className="font-bold">{ch.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {ch.description}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                  <span>
                    📅{" "}
                    {ch.startDate
                      ? new Date(ch.startDate).toLocaleDateString()
                      : "TBD"}{" "}
                    →{" "}
                    {ch.endDate
                      ? new Date(ch.endDate).toLocaleDateString()
                      : "TBD"}
                  </span>
                  <span>🏆 {ch.type}</span>
                </div>
              </div>
              <Btn
                variant="danger"
                size="sm"
                onClick={() => deleteChallenge(ch.id)}
              >
                Delete
              </Btn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LeaderboardManager({ toast }: any) {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "challenges">(
    "leaderboard",
  );
  const [users, setUsers] = useState<RealUser[]>([]);
  const [customEntries, setCustomEntries] = useState<CustomLeaderboardEntry[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RealUser>>({});
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCustom, setNewCustom] = useState({
    name: "",
    points: "100",
    checkIns: "10",
    workouts: "8",
  });

  // Load real users
  const loadUsers = async () => {
    try {
      const snap = await get(ref(db, "mk2_users"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([uid, val]: [string, any]) => ({
            uid,
            name: val.name || "Unnamed",
            points: val.points ?? 0,
            checkIns: val.checkIns?.length ?? 0,
            workouts: val.workouts?.length ?? 0,
            showInLeaderboard: val.showInLeaderboard ?? true,
          }),
        );
        setUsers(list.sort((a, b) => b.points - a.points));
      } else {
        setUsers([]);
      }
    } catch (err) {
      toast("Failed to load users", "error");
    }
  };

  // Load custom entries
  const loadCustomEntries = async () => {
    try {
      const snap = await get(ref(db, "custom_leaderboard_entries"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([id, val]: [string, any]) => ({
            id,
            ...val,
            isCustom: true,
          }),
        );
        setCustomEntries(list.sort((a, b) => b.points - a.points));
      } else {
        setCustomEntries([]);
      }
    } catch (err) {
      toast("Failed to load custom entries", "error");
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadCustomEntries()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ── Edit real user ──────────────────────────────────────────────────────
  const startEditUser = (user: RealUser) => {
    setEditingUser(user.uid);
    setEditForm({
      name: user.name,
      points: user.points,
      checkIns: user.checkIns,
      workouts: user.workouts,
      showInLeaderboard: user.showInLeaderboard,
    });
  };

  const cancelEditUser = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const saveUserEdit = async (uid: string) => {
    if (!uid) return;
    const updated: any = {};
    if (editForm.name !== undefined) updated.name = editForm.name;
    if (editForm.points !== undefined) updated.points = editForm.points;
    if (editForm.workouts !== undefined) updated.workouts = editForm.workouts;
    if (editForm.showInLeaderboard !== undefined)
      updated.showInLeaderboard = editForm.showInLeaderboard;

    try {
      await update(ref(db, `mk2_users/${uid}`), updated);
      toast("User updated ✓", "success");
      cancelEditUser();
      loadAll();
    } catch {
      toast("Update failed", "error");
    }
  };

  // ── Custom entries ─────────────────────────────────────────────────────
  const addCustomEntry = async () => {
    if (!newCustom.name.trim()) {
      toast("Name is required", "error");
      return;
    }
    const data = {
      name: newCustom.name.trim(),
      points: parseInt(newCustom.points) || 0,
      checkIns: parseInt(newCustom.checkIns) || 0,
      workouts: parseInt(newCustom.workouts) || 0,
      isCustom: true,
      createdAt: Date.now(),
    };
    try {
      const newRef = push(ref(db, "custom_leaderboard_entries"));
      await set(newRef, data);
      toast("Custom entry added ✓", "success");
      setShowAddCustom(false);
      setNewCustom({ name: "", points: "100", checkIns: "10", workouts: "8" });
      loadCustomEntries();
    } catch {
      toast("Failed to add", "error");
    }
  };

  const deleteCustomEntry = async (id: string) => {
    if (!confirm("Delete this custom entry?")) return;
    try {
      await remove(ref(db, `custom_leaderboard_entries/${id}`));
      toast("Deleted", "info");
      loadCustomEntries();
    } catch {
      toast("Delete failed", "error");
    }
  };

  // Combined list for preview
  const allEntries: CombinedEntry[] = [
    ...users
      .filter((u) => u.showInLeaderboard)
      .map((u) => ({ key: u.uid, name: u.name, points: u.points })),
    ...customEntries.map((c) => ({
      key: c.id,
      name: c.name,
      points: c.points,
    })),
  ].sort((a, b) => b.points - a.points);

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "leaderboard"
              ? "text-orange-500 border-b-2 border-orange-500 -mb-[2px]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          📊 Leaderboard
        </button>
        <button
          onClick={() => setActiveTab("challenges")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "challenges"
              ? "text-orange-500 border-b-2 border-orange-500 -mb-[2px]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🏁 Challenges
        </button>
      </div>

      {/* Leaderboard content */}
      {activeTab === "leaderboard" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="font-bold text-sm">Leaderboard Management</div>
            <Btn
              variant="primary"
              size="sm"
              onClick={() => setShowAddCustom(!showAddCustom)}
            >
              {showAddCustom ? "✕ Cancel" : "+ Add Custom Entry"}
            </Btn>
          </div>

          {/* Add custom form */}
          <AnimatePresence>
            {showAddCustom && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-5 p-4 rounded-lg"
                style={{
                  background: "hsl(var(--secondary))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <div className="font-bold text-sm mb-3">
                  Add Custom Leaderboard Entry
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={lbl}>Name</label>
                    <input
                      style={inp}
                      placeholder="e.g. Guest Athlete"
                      value={newCustom.name}
                      onChange={(e) =>
                        setNewCustom({ ...newCustom, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label style={lbl}>Points</label>
                    <input
                      style={inp}
                      type="number"
                      placeholder="100"
                      value={newCustom.points}
                      onChange={(e) =>
                        setNewCustom({ ...newCustom, points: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label style={lbl}>Check-ins</label>
                    <input
                      style={inp}
                      type="number"
                      placeholder="10"
                      value={newCustom.checkIns}
                      onChange={(e) =>
                        setNewCustom({ ...newCustom, checkIns: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label style={lbl}>Workouts</label>
                    <input
                      style={inp}
                      type="number"
                      placeholder="8"
                      value={newCustom.workouts}
                      onChange={(e) =>
                        setNewCustom({ ...newCustom, workouts: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Btn variant="primary" onClick={addCustomEntry}>
                    Add Entry
                  </Btn>
                  <Btn variant="subtle" onClick={() => setShowAddCustom(false)}>
                    Cancel
                  </Btn>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="text-muted-foreground text-sm py-8">Loading…</div>
          ) : (
            <>
              {/* Real users section */}
              <div className="mb-8">
                <div className="font-bold text-sm mb-3">
                  Real Members ({users.length})
                </div>
                <div className="flex flex-col gap-2">
                  {users.map((user) => (
                    <div
                      key={user.uid}
                      className="bg-secondary rounded-lg p-3 flex flex-wrap items-center justify-between gap-2"
                      style={{
                        borderLeft: `3px solid ${user.showInLeaderboard ? "hsl(20 100% 50%)" : "#666"}`,
                      }}
                    >
                      {editingUser === user.uid ? (
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            style={inp}
                            value={editForm.name ?? user.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            placeholder="Name"
                          />
                          <input
                            style={inp}
                            type="number"
                            value={editForm.points ?? user.points}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                points: parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="Points"
                          />
                          <input
                            style={inp}
                            type="number"
                            value={editForm.workouts ?? user.workouts}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                workouts: parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="Workouts"
                          />
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={
                                  editForm.showInLeaderboard ??
                                  user.showInLeaderboard
                                }
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    showInLeaderboard: e.target.checked,
                                  })
                                }
                                className="accent-orange-500"
                              />
                              Show on leaderboard
                            </label>
                          </div>
                          <div className="flex gap-1">
                            <Btn
                              size="sm"
                              variant="primary"
                              onClick={() => saveUserEdit(user.uid)}
                            >
                              Save
                            </Btn>
                            <Btn
                              size="sm"
                              variant="subtle"
                              onClick={cancelEditUser}
                            >
                              Cancel
                            </Btn>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="font-bold">{user.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.points} pts · {user.checkIns} check‑ins ·{" "}
                              {user.workouts} workouts
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Btn
                              size="sm"
                              variant="subtle"
                              onClick={() => startEditUser(user)}
                            >
                              Edit
                            </Btn>
                            <Btn
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                await set(
                                  ref(
                                    db,
                                    `mk2_users/${user.uid}/showInLeaderboard`,
                                  ),
                                  !user.showInLeaderboard,
                                );
                                toast(
                                  user.showInLeaderboard
                                    ? "Hidden from leaderboard"
                                    : "Visible on leaderboard",
                                  "info",
                                );
                                loadAll();
                              }}
                            >
                              {user.showInLeaderboard ? "Hide" : "Show"}
                            </Btn>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom entries section */}
              <div>
                <div className="font-bold text-sm mb-3">
                  Custom Entries ({customEntries.length})
                </div>
                <div className="flex flex-col gap-2">
                  {customEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-secondary rounded-lg p-3 flex justify-between items-center flex-wrap gap-2"
                      style={{ borderLeft: "3px solid #888" }}
                    >
                      <div>
                        <div className="font-bold">{entry.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.points} pts · {entry.checkIns} check‑ins ·{" "}
                          {entry.workouts} workouts
                        </div>
                      </div>
                      <Btn
                        size="sm"
                        variant="danger"
                        onClick={() => deleteCustomEntry(entry.id)}
                      >
                        Delete
                      </Btn>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview of combined leaderboard */}
              <div className="mt-8">
                <div className="font-bold text-sm mb-2">Preview (Top 10)</div>
                <div className="text-xs text-muted-foreground mb-2">
                  Combines visible members + custom entries
                </div>
                <div className="flex flex-col gap-1">
                  {allEntries.slice(0, 10).map((e, i) => (
                    <div
                      key={e.key}
                      className="flex justify-between items-center bg-background rounded-lg px-3 py-1.5"
                    >
                      <span>
                        {i + 1}. {e.name}
                      </span>
                      <span className="font-bold text-orange-500">
                        {e.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Challenges content */}
      {activeTab === "challenges" && <ChallengesManager toast={toast} />}
    </div>
  );
}

// import { useState, useEffect } from "react";
// import { db } from "@/lib/firebase";
// import { motion, AnimatePresence } from "framer-motion";
// import { Btn } from "@/components/shared/Btn";
// import { ref, get, set, remove, push, update } from "firebase/database";

// // Style helpers (reused from Admin.tsx)
// const lbl: React.CSSProperties = {
//   display: "block",
//   fontSize: 11,
//   fontWeight: 600,
//   marginBottom: 4,
//   color: "hsl(var(--muted-foreground))",
//   textTransform: "uppercase",
//   letterSpacing: "0.05em",
// };

// const inp: React.CSSProperties = {
//   width: "100%",
//   padding: "8px 12px",
//   background: "hsl(var(--background))",
//   border: "1px solid hsl(var(--border))",
//   borderRadius: 8,
//   fontSize: 13,
//   color: "hsl(var(--foreground))",
// };

// interface CustomLeaderboardEntry {
//   id: string;
//   name: string;
//   points: number;
//   checkIns: number;
//   workouts: number;
//   isCustom: true;
// }

// interface RealUser {
//   uid: string;
//   name: string;
//   points: number;
//   checkIns: number;
//   workouts: number;
//   showInLeaderboard: boolean;
// }

// interface CombinedEntry {
//   key: string;
//   name: string;
//   points: number;
// }

// export function LeaderboardManager({ toast }: any) {
//   const [users, setUsers] = useState<RealUser[]>([]);
//   const [customEntries, setCustomEntries] = useState<CustomLeaderboardEntry[]>(
//     [],
//   );
//   const [loading, setLoading] = useState(true);
//   const [editingUser, setEditingUser] = useState<string | null>(null);
//   const [editForm, setEditForm] = useState<Partial<RealUser>>({});
//   const [showAddCustom, setShowAddCustom] = useState(false);
//   const [newCustom, setNewCustom] = useState({
//     name: "",
//     points: "100",
//     checkIns: "10",
//     workouts: "8",
//   });

//   // Load real users
//   const loadUsers = async () => {
//     try {
//       const snap = await get(ref(db, "mk2_users"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([uid, val]: [string, any]) => ({
//             uid,
//             name: val.name || "Unnamed",
//             points: val.points ?? 0,
//             checkIns: val.checkIns?.length ?? 0,
//             workouts: val.workouts?.length ?? 0,
//             showInLeaderboard: val.showInLeaderboard ?? true,
//           }),
//         );
//         setUsers(list.sort((a, b) => b.points - a.points));
//       } else {
//         setUsers([]);
//       }
//     } catch (err) {
//       toast("Failed to load users", "error");
//     }
//   };

//   // Load custom entries
//   const loadCustomEntries = async () => {
//     try {
//       const snap = await get(ref(db, "custom_leaderboard_entries"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([id, val]: [string, any]) => ({
//             id,
//             ...val,
//             isCustom: true,
//           }),
//         );
//         setCustomEntries(list.sort((a, b) => b.points - a.points));
//       } else {
//         setCustomEntries([]);
//       }
//     } catch (err) {
//       toast("Failed to load custom entries", "error");
//     }
//   };

//   const loadAll = async () => {
//     setLoading(true);
//     await Promise.all([loadUsers(), loadCustomEntries()]);
//     setLoading(false);
//   };

//   useEffect(() => {
//     loadAll();
//   }, []);

//   // ── Edit real user ──────────────────────────────────────────────────────
//   const startEditUser = (user: RealUser) => {
//     setEditingUser(user.uid);
//     setEditForm({
//       name: user.name,
//       points: user.points,
//       checkIns: user.checkIns,
//       workouts: user.workouts,
//       showInLeaderboard: user.showInLeaderboard,
//     });
//   };

//   const cancelEditUser = () => {
//     setEditingUser(null);
//     setEditForm({});
//   };

//   const saveUserEdit = async (uid: string) => {
//     if (!uid) return;
//     const updated: any = {};
//     if (editForm.name !== undefined) updated.name = editForm.name;
//     if (editForm.points !== undefined) updated.points = editForm.points;
//     if (editForm.workouts !== undefined) updated.workouts = editForm.workouts;
//     if (editForm.showInLeaderboard !== undefined)
//       updated.showInLeaderboard = editForm.showInLeaderboard;

//     try {
//       await update(ref(db, `mk2_users/${uid}`), updated);
//       toast("User updated ✓", "success");
//       cancelEditUser();
//       loadAll();
//     } catch {
//       toast("Update failed", "error");
//     }
//   };

//   // ── Custom entries ─────────────────────────────────────────────────────
//   const addCustomEntry = async () => {
//     if (!newCustom.name.trim()) {
//       toast("Name is required", "error");
//       return;
//     }
//     const data = {
//       name: newCustom.name.trim(),
//       points: parseInt(newCustom.points) || 0,
//       checkIns: parseInt(newCustom.checkIns) || 0,
//       workouts: parseInt(newCustom.workouts) || 0,
//       isCustom: true,
//       createdAt: Date.now(),
//     };
//     try {
//       const newRef = push(ref(db, "custom_leaderboard_entries"));
//       await set(newRef, data);
//       toast("Custom entry added ✓", "success");
//       setShowAddCustom(false);
//       setNewCustom({ name: "", points: "100", checkIns: "10", workouts: "8" });
//       loadCustomEntries();
//     } catch {
//       toast("Failed to add", "error");
//     }
//   };

//   const deleteCustomEntry = async (id: string) => {
//     if (!confirm("Delete this custom entry?")) return;
//     try {
//       await remove(ref(db, `custom_leaderboard_entries/${id}`));
//       toast("Deleted", "info");
//       loadCustomEntries();
//     } catch {
//       toast("Delete failed", "error");
//     }
//   };

//   // Combined list for preview
//   const allEntries: CombinedEntry[] = [
//     ...users
//       .filter((u) => u.showInLeaderboard)
//       .map((u) => ({ key: u.uid, name: u.name, points: u.points })),
//     ...customEntries.map((c) => ({
//       key: c.id,
//       name: c.name,
//       points: c.points,
//     })),
//   ].sort((a, b) => b.points - a.points);

//   return (
//     <div>
//       <div className="flex justify-between items-center mb-4">
//         <div className="font-bold text-sm">Leaderboard Management</div>
//         <Btn
//           variant="primary"
//           size="sm"
//           onClick={() => setShowAddCustom(!showAddCustom)}
//         >
//           {showAddCustom ? "✕ Cancel" : "+ Add Custom Entry"}
//         </Btn>
//       </div>

//       {/* Add custom form */}
//       <AnimatePresence>
//         {showAddCustom && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             className="mb-5 p-4 rounded-lg"
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//             }}
//           >
//             <div className="font-bold text-sm mb-3">
//               Add Custom Leaderboard Entry
//             </div>
//             <div className="grid grid-cols-2 gap-3">
//               <div>
//                 <label style={lbl}>Name</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. Guest Athlete"
//                   value={newCustom.name}
//                   onChange={(e) =>
//                     setNewCustom({ ...newCustom, name: e.target.value })
//                   }
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Points</label>
//                 <input
//                   style={inp}
//                   type="number"
//                   placeholder="100"
//                   value={newCustom.points}
//                   onChange={(e) =>
//                     setNewCustom({ ...newCustom, points: e.target.value })
//                   }
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Check-ins</label>
//                 <input
//                   style={inp}
//                   type="number"
//                   placeholder="10"
//                   value={newCustom.checkIns}
//                   onChange={(e) =>
//                     setNewCustom({ ...newCustom, checkIns: e.target.value })
//                   }
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Workouts</label>
//                 <input
//                   style={inp}
//                   type="number"
//                   placeholder="8"
//                   value={newCustom.workouts}
//                   onChange={(e) =>
//                     setNewCustom({ ...newCustom, workouts: e.target.value })
//                   }
//                 />
//               </div>
//             </div>
//             <div className="mt-3 flex gap-2">
//               <Btn variant="primary" onClick={addCustomEntry}>
//                 Add Entry
//               </Btn>
//               <Btn variant="subtle" onClick={() => setShowAddCustom(false)}>
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {loading ? (
//         <div className="text-muted-foreground text-sm py-8">Loading…</div>
//       ) : (
//         <>
//           {/* Real users section */}
//           <div className="mb-8">
//             <div className="font-bold text-sm mb-3">
//               Real Members ({users.length})
//             </div>
//             <div className="flex flex-col gap-2">
//               {users.map((user) => (
//                 <div
//                   key={user.uid}
//                   className="bg-secondary rounded-lg p-3 flex flex-wrap items-center justify-between gap-2"
//                   style={{
//                     borderLeft: `3px solid ${user.showInLeaderboard ? "hsl(20 100% 50%)" : "#666"}`,
//                   }}
//                 >
//                   {editingUser === user.uid ? (
//                     <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
//                       <input
//                         style={inp}
//                         value={editForm.name ?? user.name}
//                         onChange={(e) =>
//                           setEditForm({ ...editForm, name: e.target.value })
//                         }
//                         placeholder="Name"
//                       />
//                       <input
//                         style={inp}
//                         type="number"
//                         value={editForm.points ?? user.points}
//                         onChange={(e) =>
//                           setEditForm({
//                             ...editForm,
//                             points: parseInt(e.target.value) || 0,
//                           })
//                         }
//                         placeholder="Points"
//                       />
//                       <input
//                         style={inp}
//                         type="number"
//                         value={editForm.workouts ?? user.workouts}
//                         onChange={(e) =>
//                           setEditForm({
//                             ...editForm,
//                             workouts: parseInt(e.target.value) || 0,
//                           })
//                         }
//                         placeholder="Workouts"
//                       />
//                       <div className="flex items-center gap-2">
//                         <label className="flex items-center gap-1 text-xs">
//                           <input
//                             type="checkbox"
//                             checked={
//                               editForm.showInLeaderboard ??
//                               user.showInLeaderboard
//                             }
//                             onChange={(e) =>
//                               setEditForm({
//                                 ...editForm,
//                                 showInLeaderboard: e.target.checked,
//                               })
//                             }
//                             className="accent-orange-500"
//                           />
//                           Show on leaderboard
//                         </label>
//                       </div>
//                       <div className="flex gap-1">
//                         <Btn
//                           size="sm"
//                           variant="primary"
//                           onClick={() => saveUserEdit(user.uid)}
//                         >
//                           Save
//                         </Btn>
//                         <Btn
//                           size="sm"
//                           variant="subtle"
//                           onClick={cancelEditUser}
//                         >
//                           Cancel
//                         </Btn>
//                       </div>
//                     </div>
//                   ) : (
//                     <>
//                       <div className="flex-1">
//                         <div className="font-bold">{user.name}</div>
//                         <div className="text-xs text-muted-foreground">
//                           {user.points} pts · {user.checkIns} check‑ins ·{" "}
//                           {user.workouts} workouts
//                         </div>
//                       </div>
//                       <div className="flex gap-1">
//                         <Btn
//                           size="sm"
//                           variant="subtle"
//                           onClick={() => startEditUser(user)}
//                         >
//                           Edit
//                         </Btn>
//                         <Btn
//                           size="sm"
//                           variant="ghost"
//                           onClick={async () => {
//                             await set(
//                               ref(
//                                 db,
//                                 `mk2_users/${user.uid}/showInLeaderboard`,
//                               ),
//                               !user.showInLeaderboard,
//                             );
//                             toast(
//                               user.showInLeaderboard
//                                 ? "Hidden from leaderboard"
//                                 : "Visible on leaderboard",
//                               "info",
//                             );
//                             loadAll();
//                           }}
//                         >
//                           {user.showInLeaderboard ? "Hide" : "Show"}
//                         </Btn>
//                       </div>
//                     </>
//                   )}
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Custom entries section */}
//           <div>
//             <div className="font-bold text-sm mb-3">
//               Custom Entries ({customEntries.length})
//             </div>
//             <div className="flex flex-col gap-2">
//               {customEntries.map((entry) => (
//                 <div
//                   key={entry.id}
//                   className="bg-secondary rounded-lg p-3 flex justify-between items-center flex-wrap gap-2"
//                   style={{ borderLeft: "3px solid #888" }}
//                 >
//                   <div>
//                     <div className="font-bold">{entry.name}</div>
//                     <div className="text-xs text-muted-foreground">
//                       {entry.points} pts · {entry.checkIns} check‑ins ·{" "}
//                       {entry.workouts} workouts
//                     </div>
//                   </div>
//                   <Btn
//                     size="sm"
//                     variant="danger"
//                     onClick={() => deleteCustomEntry(entry.id)}
//                   >
//                     Delete
//                   </Btn>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Preview of combined leaderboard */}
//           <div className="mt-8">
//             <div className="font-bold text-sm mb-2">Preview (Top 10)</div>
//             <div className="text-xs text-muted-foreground mb-2">
//               Combines visible members + custom entries
//             </div>
//             <div className="flex flex-col gap-1">
//               {allEntries.slice(0, 10).map((e, i) => (
//                 <div
//                   key={e.key}
//                   className="flex justify-between items-center bg-background rounded-lg px-3 py-1.5"
//                 >
//                   <span>
//                     {i + 1}. {e.name}
//                   </span>
//                   <span className="font-bold text-orange-500">
//                     {e.points} pts
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }
