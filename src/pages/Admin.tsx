import { useState, useEffect } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import {
  fetchCollection,
  addToCollection,
  updateInCollection,
  deleteFromCollection,
} from "@/lib/firebase";
import { ref, get, set, remove, push, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

// Import the shared key builder so admin cancel matches user booking keys exactly
import {
  buildBookingKey,
  formatDateKey,
  getDayName,
} from "@/pages/ClassBooking";

const ADMIN_PASSWORD = "MK2R@2026";
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const CATS = [
  "Cardio",
  "Strength",
  "Flexibility",
  "Core",
  "Combat",
  "CrossFit",
  "Recovery",
  "Spin",
  "Yoga",
];
const INTENSITIES = [
  "Low",
  "Low–Medium",
  "Medium",
  "Medium–High",
  "High",
  "Very High",
];
const NEWS_TYPES = ["News", "Event", "Announcement"];
const GAL_CATS = [
  "Classes",
  "Facilities",
  "Members",
  "Events",
  "Transformation",
];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const inp: any = {
  width: "100%",
  background: "hsl(var(--secondary))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  padding: "10px 14px",
  color: "hsl(var(--foreground))",
  fontSize: 13,
  outline: "none",
  fontFamily: "var(--font-body)",
  boxSizing: "border-box",
};
const lbl: any = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "hsl(var(--muted-foreground))",
  display: "block",
  marginBottom: 6,
};

function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  full = false,
}: any) {
  const s: any = {
    primary: { background: "hsl(20 100% 50%)", color: "#000", border: "none" },
    ghost: {
      background: "transparent",
      color: "hsl(20 100% 50%)",
      border: "1px solid hsl(20 100% 50%)",
    },
    danger: { background: "hsl(0 84% 51%)", color: "#fff", border: "none" },
    subtle: {
      background: "hsl(var(--secondary))",
      color: "hsl(var(--foreground))",
      border: "1px solid hsl(var(--border))",
    },
    green: { background: "hsl(142 72% 37%)", color: "#fff", border: "none" },
  }[variant];
  const pad: any = { sm: "6px 14px", md: "9px 20px", lg: "12px 28px" }[size];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s,
        padding: pad,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--font-body)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: full ? "100%" : "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

function MToast({ msg, type, onDone }: any) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg: any =
    {
      success: "hsl(142 72% 37%)",
      error: "hsl(0 84% 51%)",
      info: "hsl(20 100% 50%)",
    }[type] || "hsl(20 100% 50%)";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: bg,
        color: type === "error" ? "#fff" : "#000",
        borderRadius: 10,
        padding: "12px 20px",
        fontWeight: 700,
        fontSize: 13,
        fontFamily: "var(--font-body)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
      }}
    >
      {msg}
    </div>
  );
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const check = () =>
    pw === ADMIN_PASSWORD
      ? onLogin()
      : (setErr("Incorrect password"), setPw(""));
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "hsl(var(--background))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 16,
          padding: "36px 32px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            letterSpacing: "0.15em",
            color: "hsl(20 100% 50%)",
            marginBottom: 4,
          }}
        >
          MK2R ADMIN
        </div>
        <div
          style={{
            fontSize: 12,
            color: "hsl(var(--muted-foreground))",
            marginBottom: 24,
          }}
        >
          Management Portal — Authorised Access Only
        </div>
        <label style={lbl}>Admin Password</label>
        <input
          type="password"
          style={{ ...inp, marginBottom: 8 }}
          placeholder="Enter password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
        />
        {err && (
          <div
            style={{ fontSize: 12, color: "hsl(0 84% 51%)", marginBottom: 10 }}
          >
            {err}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <Btn variant="primary" size="lg" onClick={check} full>
            Enter Admin Panel →
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Admin Calendar ────────────────────────────────────────────────────────────
function AdminCalendar({
  selectedDate,
  onSelect,
  classDateCounts,
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  classDateCounts: Record<string, number>;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div
      style={{
        background: "hsl(var(--secondary))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "hsl(var(--muted-foreground))",
            fontSize: 16,
            padding: "2px 8px",
          }}
        >
          ←
        </button>
        <div style={{ fontWeight: 700, fontSize: 13 }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </div>
        <button
          onClick={nextMonth}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "hsl(var(--muted-foreground))",
            fontSize: 16,
            padding: "2px 8px",
          }}
        >
          →
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          marginBottom: 4,
        }}
      >
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "hsl(var(--muted-foreground))",
              padding: "2px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 2,
        }}
      >
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const date = new Date(viewYear, viewMonth, day);
          date.setHours(0, 0, 0, 0);
          // FIX: use formatDateKey (local) not toISOString (UTC)
          const key = formatDateKey(date);
          const isToday = date.getTime() === today.getTime();
          const isSel = formatDateKey(selectedDate) === key;
          const count = classDateCounts[key] || 0;
          return (
            <button
              key={i}
              onClick={() => onSelect(new Date(viewYear, viewMonth, day))}
              style={{
                aspectRatio: "1",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: isSel
                  ? "hsl(20 100% 50%)"
                  : isToday
                    ? "hsl(20 100% 50% / 0.15)"
                    : "transparent",
                color: isSel
                  ? "#000"
                  : isToday
                    ? "hsl(20 100% 50%)"
                    : "hsl(var(--foreground))",
                outline:
                  isToday && !isSel ? "1px solid hsl(20 100% 50%)" : "none",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              {day}
              {count > 0 && (
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: isSel ? "#000" : "hsl(20 100% 50%)",
                    display: "block",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Classes Manager with ADMIN CANCEL per booking ─────────────────────────────
function ClassesManager({ toast }: any) {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [scheduleMode, setScheduleMode] = useState<"day" | "date">("day");
  const [calDate, setCalDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  // Live class_bookings for admin cancel
  const [allBookings, setAllBookings] = useState<
    Record<string, Record<string, any>>
  >({});
  const [expandedBookings, setExpandedBookings] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const blank = {
    name: "",
    time: "",
    trainer: "",
    day: "Monday",
    specificDate: "",
    spots: "12",
    duration: "45 min",
    intensity: "Medium",
    category: "Cardio",
    subtitle: "",
    details: "",
    scheduleType: "day",
    wod: "",
  };
  const [form, setForm] = useState(blank);

  const load = async () => {
    setLoading(true);
    setClasses(await fetchCollection("admin_classes"));
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  // Live bookings feed for admin
  useEffect(() => {
    return onValue(ref(db, "class_bookings"), (snap) =>
      setAllBookings(snap.val() ?? {}),
    );
  }, []);

  const save = async () => {
    if (!form.name || !form.time || !form.trainer)
      return toast("Fill in Name, Time and Trainer", "error");
    const data = {
      ...form,
      spots: parseInt(form.spots),
      details: form.details.split("\n").filter(Boolean),
      scheduleType: scheduleMode,
      // FIX: use formatDateKey for specificDate (local timezone)
      specificDate: scheduleMode === "date" ? formatDateKey(calDate) : "",
      day: scheduleMode === "day" ? form.day : getDayName(calDate),
    };
    if (editing) {
      await updateInCollection("admin_classes", editing.id, data);
      toast("Updated ✓", "success");
    } else {
      await addToCollection("admin_classes", data);
      toast("Class added ✓", "success");
    }
    setShowForm(false);
    setEditing(null);
    setForm(blank);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this class?")) return;
    await deleteFromCollection("admin_classes", id);
    toast("Deleted", "info");
    load();
  };

  const startEdit = (c: any) => {
    setEditing(c);
    setScheduleMode(c.scheduleType || "day");
    setForm({
      name: c.name,
      time: c.time,
      trainer: c.trainer,
      day: c.day,
      specificDate: c.specificDate || "",
      spots: String(c.spots),
      duration: c.duration,
      intensity: c.intensity,
      category: c.category,
      subtitle: c.subtitle || "",
      details: (c.details || []).join("\n"),
      scheduleType: c.scheduleType || "day",
      wod: c.wod || "",
    });
    if (c.specificDate) setCalDate(new Date(c.specificDate + "T00:00:00"));
    setShowForm(true);
  };

  const f = (k: string) => (e: any) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const classDateCounts: Record<string, number> = {};
  classes.forEach((cls) => {
    if (cls.scheduleType === "date" && cls.specificDate) {
      classDateCounts[cls.specificDate] =
        (classDateCounts[cls.specificDate] || 0) + 1;
    } else {
      for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayName = getDayName(d);
        if (cls.day === dayName) {
          // FIX: use formatDateKey not toISOString
          const key = formatDateKey(d);
          classDateCounts[key] = (classDateCounts[key] || 0) + 1;
        }
      }
    }
  });

  // FIX: use formatDateKey for selected date (local timezone)
  const selectedDateKey = formatDateKey(calDate);
  const selectedDayName = getDayName(calDate);

  const classesOnDate = classes
    .filter((cls) =>
      cls.scheduleType === "date"
        ? cls.specificDate === selectedDateKey
        : cls.day === selectedDayName,
    )
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  // ── Admin cancel a user's booking ─────────────────────────────────────────
  const adminCancelBooking = async (
    cls: any,
    uid: string,
    memberName: string,
  ) => {
    if (!confirm(`Remove ${memberName}'s booking from ${cls.name}?`)) return;
    setCancelling(`${cls.name}_${uid}`);
    const bk = buildBookingKey(cls.name, selectedDateKey);
    try {
      // Remove from class_bookings
      await set(ref(db, `class_bookings/${bk}/${uid}`), null);
      // Refund 1 credit to the user
      const credSnap = await get(ref(db, `mk2_users/${uid}/classCredits`));
      const current = credSnap.exists() ? (credSnap.val() as number) : 0;
      await set(ref(db, `mk2_users/${uid}/classCredits`), current + 1);
      // Log refund
      await push(ref(db, `mk2_users/${uid}/creditHistory`), {
        amount: +1,
        type: "admin_cancel",
        note: `Admin removed: ${cls.name} on ${selectedDateKey}`,
        timestamp: Date.now(),
      });
      // Remove from user bookings array
      const userSnap = await get(ref(db, `mk2_users/${uid}/bookings`));
      if (userSnap.exists()) {
        const bookings = userSnap.val();
        const filtered = Array.isArray(bookings)
          ? bookings.filter(
              (b: any) =>
                !(b.name === cls.name && b.dateKey === selectedDateKey),
            )
          : [];
        await set(ref(db, `mk2_users/${uid}/bookings`), filtered);
      }
      toast(`${memberName} removed · credit refunded ✓`, "success");
    } catch {
      toast("Cancel failed", "error");
    }
    setCancelling(null);
  };

  // Get bookings for a class on selected date
  const getClassBookings = (
    cls: any,
  ): Array<{ uid: string; name: string; email: string }> => {
    const bk = buildBookingKey(cls.name, selectedDateKey);
    const raw = allBookings[bk] ?? {};
    return Object.entries(raw).map(([uid, val]: [string, any]) => ({
      uid,
      name: val.name || "Unknown",
      email: val.email || "",
    }));
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Classes ({classes.length})
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              background: "hsl(var(--secondary))",
              borderRadius: 8,
              padding: 2,
              gap: 2,
            }}
          >
            {(["calendar", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background:
                    viewMode === v ? "hsl(20 100% 50%)" : "transparent",
                  color:
                    viewMode === v ? "#000" : "hsl(var(--muted-foreground))",
                  border: "none",
                  textTransform: "capitalize",
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <Btn
            variant="primary"
            size="sm"
            onClick={() => {
              setShowForm(!showForm);
              setEditing(null);
              setForm(blank);
              setScheduleMode("day");
            }}
          >
            {showForm ? "✕ Cancel" : "+ Add Class"}
          </Btn>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
              {editing ? "Edit Class" : "New Class"}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Schedule Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["day", "date"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setScheduleMode(mode)}
                    style={{
                      padding: "7px 18px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor:
                        scheduleMode === mode
                          ? "hsl(20 100% 50%)"
                          : "hsl(var(--border))",
                      background:
                        scheduleMode === mode
                          ? "hsl(20 100% 50%)"
                          : "transparent",
                      color:
                        scheduleMode === mode
                          ? "#000"
                          : "hsl(var(--foreground))",
                    }}
                  >
                    {mode === "day"
                      ? "📅 Weekly (recurring)"
                      : "🗓 Specific Date (once-off)"}
                  </button>
                ))}
              </div>
            </div>

            {scheduleMode === "day" ? (
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Day of Week</label>
                <select style={inp} value={form.day} onChange={f("day")}>
                  {DAYS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Pick a Date</label>
                <AdminCalendar
                  selectedDate={calDate}
                  onSelect={setCalDate}
                  classDateCounts={classDateCounts}
                />
                <div
                  style={{
                    fontSize: 12,
                    color: "hsl(var(--muted-foreground))",
                    marginTop: -10,
                    marginBottom: 8,
                  }}
                >
                  Selected:{" "}
                  <strong style={{ color: "hsl(20 100% 50%)" }}>
                    {calDate.toLocaleDateString("en-ZA", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </div>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              {(
                [
                  ["name", "Class Name", "e.g. HIIT Blast"],
                  ["time", "Time", "06:00"],
                  ["trainer", "Trainer", "Coach Sipho"],
                  ["spots", "Max Spots", "12"],
                  ["duration", "Duration", "45 min"],
                  ["subtitle", "Subtitle", "Short description"],
                ] as any[]
              ).map(([k, l, p]: any) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <input
                    style={inp}
                    placeholder={p}
                    value={(form as any)[k]}
                    onChange={f(k)}
                  />
                </div>
              ))}
              {(
                [
                  ["category", "Category", CATS],
                  ["intensity", "Intensity", INTENSITIES],
                ] as any[]
              ).map(([k, l, opts]: any) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <select style={inp} value={(form as any)[k]} onChange={f(k)}>
                    {opts.map((o: string) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>What's Included (one item per line)</label>
              <textarea
                style={{ ...inp, minHeight: 80, resize: "vertical" }}
                placeholder={
                  "10 rounds Tabata\nKettlebell swings\nBurns 400–600 kcal"
                }
                value={form.details}
                onChange={f("details")}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>WOD / Workout Detail (optional)</label>
              <div
                style={{
                  fontSize: 11,
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: 6,
                }}
              >
                Paste the full workout here — warm up, WOD parts, weights
                (Comp/Scaled/Beg).
              </div>
              <textarea
                style={{
                  ...inp,
                  minHeight: 160,
                  resize: "vertical",
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
                placeholder={`Warm Up:\n3 ROUNDS\n0:30 Machine\n\nPart WOD 1: BUDDY WOD\n4 ROUNDS FT (12:00 CAP)\n24/20 Cal Row\n\nComp: 80/55\nScaled: 70/45\nBeg: 40/30`}
                value={form.wod}
                onChange={f("wod")}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={save}>
                {editing ? "Save Changes" : "Add Class"}
              </Btn>
              <Btn
                variant="subtle"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Calendar view ── */}
      {viewMode === "calendar" && (
        <>
          <AdminCalendar
            selectedDate={calDate}
            onSelect={(d) => {
              setCalDate(d);
              setExpandedBookings(null);
            }}
            classDateCounts={classDateCounts}
          />
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              {calDate.toLocaleDateString("en-ZA", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              — {classesOnDate.length} class
              {classesOnDate.length !== 1 ? "es" : ""}
            </div>
            {loading ? (
              <div
                style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}
              >
                Loading…
              </div>
            ) : classesOnDate.length === 0 ? (
              <div
                style={{
                  color: "hsl(var(--muted-foreground))",
                  fontSize: 13,
                  padding: "16px 0",
                }}
              >
                No classes on this date.
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {classesOnDate.map((cls) => {
                  const bookings = getClassBookings(cls);
                  const isExpanded = expandedBookings === cls.id;
                  return (
                    <div
                      key={cls.id}
                      style={{
                        background: "hsl(var(--secondary))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      {/* Class header row */}
                      <div
                        style={{
                          padding: "12px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            {cls.name}
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 8px",
                                borderRadius: 20,
                                background:
                                  cls.scheduleType === "date"
                                    ? "hsl(217 91% 53% / 0.15)"
                                    : "hsl(142 72% 37% / 0.15)",
                                color:
                                  cls.scheduleType === "date"
                                    ? "hsl(217 91% 53%)"
                                    : "hsl(142 72% 37%)",
                                fontWeight: 700,
                              }}
                            >
                              {cls.scheduleType === "date"
                                ? "Once-off"
                                : "Weekly"}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "hsl(var(--muted-foreground))",
                              marginTop: 2,
                            }}
                          >
                            {cls.time} · {cls.trainer} · {cls.spots} spots ·{" "}
                            {cls.category}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          {/* Bookings count — click to expand */}
                          <button
                            onClick={() =>
                              setExpandedBookings(isExpanded ? null : cls.id)
                            }
                            style={{
                              padding: "5px 12px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              background:
                                bookings.length > 0
                                  ? "hsl(20 100% 50% / 0.15)"
                                  : "hsl(var(--secondary))",
                              color:
                                bookings.length > 0
                                  ? "hsl(20 100% 50%)"
                                  : "hsl(var(--muted-foreground))",
                              border: `1px solid ${bookings.length > 0 ? "hsl(20 100% 50% / 0.3)" : "hsl(var(--border))"}`,
                            }}
                          >
                            👥 {bookings.length}/{cls.spots}{" "}
                            {isExpanded ? "▲" : "▼"}
                          </button>
                          <Btn
                            variant="subtle"
                            size="sm"
                            onClick={() => startEdit(cls)}
                          >
                            Edit
                          </Btn>
                          <Btn
                            variant="danger"
                            size="sm"
                            onClick={() => del(cls.id)}
                          >
                            Delete
                          </Btn>
                        </div>
                      </div>

                      {/* ── Bookings panel with ADMIN CANCEL ── */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{
                              borderTop: "1px solid hsl(var(--border))",
                              background: "hsl(var(--background))",
                              padding: "12px 16px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "hsl(var(--muted-foreground))",
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                marginBottom: 10,
                              }}
                            >
                              Booked Members ({bookings.length})
                            </div>
                            {bookings.length === 0 ? (
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "hsl(var(--muted-foreground))",
                                }}
                              >
                                No bookings yet for this class on this date.
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 8,
                                }}
                              >
                                {bookings.map((b) => (
                                  <div
                                    key={b.uid}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "8px 12px",
                                      borderRadius: 8,
                                      background: "hsl(var(--secondary))",
                                      flexWrap: "wrap",
                                      gap: 8,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: 30,
                                          height: 30,
                                          borderRadius: "50%",
                                          background: "hsl(20 100% 50%)",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontWeight: 700,
                                          fontSize: 13,
                                          color: "#000",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {b.name[0] ?? "?"}
                                      </div>
                                      <div>
                                        <div
                                          style={{
                                            fontWeight: 700,
                                            fontSize: 13,
                                          }}
                                        >
                                          {b.name}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color:
                                              "hsl(var(--muted-foreground))",
                                          }}
                                        >
                                          {b.email}
                                        </div>
                                      </div>
                                    </div>
                                    <Btn
                                      variant="danger"
                                      size="sm"
                                      disabled={
                                        cancelling === `${cls.name}_${b.uid}`
                                      }
                                      onClick={() =>
                                        adminCancelBooking(cls, b.uid, b.name)
                                      }
                                    >
                                      {cancelling === `${cls.name}_${b.uid}`
                                        ? "Removing…"
                                        : "✕ Remove"}
                                    </Btn>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── List view ── */}
      {viewMode === "list" &&
        (loading ? (
          <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
            Loading…
          </div>
        ) : classes.length === 0 ? (
          <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
            No classes yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {classes.map((cls) => (
              <div
                key={cls.id}
                style={{
                  background: "hsl(var(--secondary))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {cls.name}
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background:
                          cls.scheduleType === "date"
                            ? "hsl(217 91% 53% / 0.15)"
                            : "hsl(142 72% 37% / 0.15)",
                        color:
                          cls.scheduleType === "date"
                            ? "hsl(217 91% 53%)"
                            : "hsl(142 72% 37%)",
                        fontWeight: 700,
                      }}
                    >
                      {cls.scheduleType === "date" ? "Once-off" : "Weekly"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "hsl(var(--muted-foreground))",
                      marginTop: 2,
                    }}
                  >
                    {cls.scheduleType === "date"
                      ? new Date(
                          cls.specificDate + "T00:00:00",
                        ).toLocaleDateString("en-ZA", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : cls.day}{" "}
                    · {cls.time} · {cls.trainer} · {cls.spots} spots
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn
                    variant="subtle"
                    size="sm"
                    onClick={() => startEdit(cls)}
                  >
                    Edit
                  </Btn>
                  <Btn variant="danger" size="sm" onClick={() => del(cls.id)}>
                    Delete
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

// ── Gallery Manager ───────────────────────────────────────────────────────────
function GalleryManager({ toast }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const blank = {
    label: "",
    category: "Classes",
    emoji: "🔥",
    desc: "",
    imageUrl: "",
  };
  const [form, setForm] = useState(blank);
  const EMOJIS = [
    "🔥",
    "🏋️",
    "🧘",
    "💪",
    "🥊",
    "🚴",
    "🎉",
    "⚡",
    "🛁",
    "🏆",
    "📸",
    "🤸",
  ];
  const load = async () => {
    setLoading(true);
    setItems(await fetchCollection("admin_gallery"));
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    if (!form.label) return toast("Enter a label", "error");
    await addToCollection("admin_gallery", form);
    toast("Added ✓", "success");
    setShowForm(false);
    setForm(blank);
    load();
  };
  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    await deleteFromCollection("admin_gallery", id);
    toast("Deleted", "info");
    load();
  };
  const f = (k: string) => (e: any) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Gallery ({items.length})
        </div>
        <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Add Item"}
        </Btn>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <label style={lbl}>Label</label>
                <input
                  style={inp}
                  placeholder="e.g. HIIT Session"
                  value={form.label}
                  onChange={f("label")}
                />
              </div>
              <div>
                <label style={lbl}>Category</label>
                <select
                  style={inp}
                  value={form.category}
                  onChange={f("category")}
                >
                  {GAL_CATS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Emoji</label>
                <select style={inp} value={form.emoji} onChange={f("emoji")}>
                  {EMOJIS.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Image URL (optional)</label>
                <input
                  style={inp}
                  placeholder="https://..."
                  value={form.imageUrl}
                  onChange={f("imageUrl")}
                />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Description</label>
              <textarea
                style={{ ...inp, minHeight: 60, resize: "vertical" }}
                placeholder="Describe this item…"
                value={form.desc}
                onChange={f("desc")}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                marginBottom: 14,
              }}
            >
              💡 Once Instagram API is approved, posts auto-sync here.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={save}>
                Add to Gallery
              </Btn>
              <Btn variant="subtle" onClick={() => setShowForm(false)}>
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          No items yet.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: 10,
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                background: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 90,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 44,
                  background: "hsl(var(--background))",
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.label}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  item.emoji
                )}
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "hsl(var(--muted-foreground))",
                    marginTop: 2,
                  }}
                >
                  {item.category}
                </div>
                <div style={{ marginTop: 8 }}>
                  <Btn variant="danger" size="sm" onClick={() => del(item.id)}>
                    Delete
                  </Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── News Manager ──────────────────────────────────────────────────────────────
function NewsManager({ toast }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const blank = { title: "", type: "News", date: "", desc: "", emoji: "📢" };
  const [form, setForm] = useState(blank);
  const EMOJIS = [
    "📢",
    "🏆",
    "🚴",
    "🏃",
    "🥊",
    "🛁",
    "🎉",
    "⚡",
    "🌟",
    "📅",
    "💪",
    "🎯",
  ];
  const load = async () => {
    setLoading(true);
    setItems(await fetchCollection("admin_news"));
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    if (!form.title || !form.date)
      return toast("Fill in Title and Date", "error");
    // ── NEW: Add createdAt timestamp for unread count ─────────────────────
    await addToCollection("admin_news", { ...form, createdAt: Date.now() });
    toast("Published ✓", "success");
    setShowForm(false);
    setForm(blank);
    load();
  };
  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    await deleteFromCollection("admin_news", id);
    toast("Deleted", "info");
    load();
  };
  const f = (k: string) => (e: any) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          News & Events ({items.length})
        </div>
        <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Add Post"}
        </Btn>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Title</label>
                <input
                  style={inp}
                  placeholder="e.g. 30-Day Challenge!"
                  value={form.title}
                  onChange={f("title")}
                />
              </div>
              <div>
                <label style={lbl}>Type</label>
                <select style={inp} value={form.type} onChange={f("type")}>
                  {NEWS_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Date</label>
                <input
                  style={inp}
                  placeholder="e.g. 1 Apr 2026"
                  value={form.date}
                  onChange={f("date")}
                />
              </div>
              <div>
                <label style={lbl}>Emoji</label>
                <select style={inp} value={form.emoji} onChange={f("emoji")}>
                  {EMOJIS.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Description</label>
              <textarea
                style={{ ...inp, minHeight: 80, resize: "vertical" }}
                placeholder="Describe the news or event…"
                value={form.desc}
                onChange={f("desc")}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={save}>
                Publish
              </Btn>
              <Btn variant="subtle" onClick={() => setShowForm(false)}>
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          No posts yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                background: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{item.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {item.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "hsl(20 100% 50% / 0.15)",
                      color: "hsl(20 100% 50%)",
                    }}
                  >
                    {item.type}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "hsl(var(--muted-foreground))",
                    marginTop: 3,
                  }}
                >
                  {item.date}
                </div>
              </div>
              <Btn variant="danger" size="sm" onClick={() => del(item.id)}>
                Delete
              </Btn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Members Manager ───────────────────────────────────────────────────────────
function MembersManager({ toast }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const TIER_CONFIG = {
    basic: { color: "#9ca3af", label: "Basic" },
    silver: { color: "#e2e8f0", label: "Silver" },
    gold: { color: "hsl(38 92% 50%)", label: "Gold" },
  };
  const loadMembers = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "mk2_users"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([uid, val]: [string, any]) => ({
            uid,
            ...val,
            membership: val.membership ?? "basic",
          }),
        );
        setMembers(list.sort((a, b) => b.createdAt - a.createdAt));
      }
    } catch {
      toast("Failed to load members", "error");
    }
    setLoading(false);
  };
  useEffect(() => {
    loadMembers();
  }, []);
  const setTier = async (uid: string, tier: string) => {
    setSaving(uid);
    try {
      await set(ref(db, `mk2_users/${uid}/membership`), tier);
      setMembers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, membership: tier } : m)),
      );
      toast(`Tier updated to ${tier} ✓`, "success");
    } catch {
      toast("Update failed", "error");
    }
    setSaving(null);
  };
  const filtered = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Members ({members.length})
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            style={{ ...inp, width: 200 }}
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Btn variant="subtle" size="sm" onClick={loadMembers}>
            ↻ Refresh
          </Btn>
        </div>
      </div>
      <div
        style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
      >
        {(["basic", "silver", "gold"] as const).map((t) => {
          const count = members.filter(
            (m) => (m.membership ?? "basic") === t,
          ).length;
          const cfg = TIER_CONFIG[t];
          return (
            <div
              key={t}
              style={{
                background: `${cfg.color}15`,
                border: `1px solid ${cfg.color}40`,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                color: cfg.color,
              }}
            >
              {cfg.label}: {count}
            </div>
          );
        })}
      </div>
      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading members…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          No members found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((m) => {
            const cfg =
              TIER_CONFIG[
                (m.membership ?? "basic") as keyof typeof TIER_CONFIG
              ];
            return (
              <div
                key={m.uid}
                style={{
                  background: "hsl(var(--secondary))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  borderLeft: `3px solid ${cfg.color}`,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {m.name || "Unnamed"}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: `${cfg.color}20`,
                        color: cfg.color,
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "hsl(var(--muted-foreground))",
                      marginTop: 2,
                    }}
                  >
                    {m.email} · {m.points ?? 0} pts · {m.checkIns?.length ?? 0}{" "}
                    check-ins · 🎟 {m.classCredits ?? 0} credits
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <select
                    value={m.membership ?? "basic"}
                    onChange={(e) => setTier(m.uid, e.target.value)}
                    disabled={saving === m.uid}
                    style={{
                      ...inp,
                      width: "auto",
                      padding: "6px 10px",
                      fontSize: 12,
                      borderColor: cfg.color,
                      color: cfg.color,
                    }}
                  >
                    <option value="basic">Basic (Free)</option>
                    <option value="silver">Silver (R199/mo)</option>
                    <option value="gold">Gold (R349/mo)</option>
                  </select>
                  {saving === m.uid && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      Saving…
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Packages Manager (inline — no separate file needed) ───────────────────────
function PackagesManager({ toast }: any) {
  const [packages, setPackages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [assignUid, setAssignUid] = useState("");
  const [assignCredits, setAssignCredits] = useState("10");
  const [assignNote, setAssignNote] = useState("");
  const [assigning, setAssigning] = useState(false);
  const blank = {
    name: "",
    description: "",
    credits: "10",
    price: "299",
    badge: "",
    active: true,
  };
  const [form, setForm] = useState(blank);
  const f = (k: string) => (e: any) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const loadPackages = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "packages"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([id, val]: [string, any]) => ({ id, ...val }),
        );
        setPackages(list.sort((a: any, b: any) => a.price - b.price));
      } else setPackages([]);
    } catch {
      toast("Failed to load packages", "error");
    }
    setLoading(false);
  };
  const loadMembers = async () => {
    try {
      const snap = await get(ref(db, "mk2_users"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([uid, val]: [string, any]) => ({
            uid,
            name: val.name || "Unnamed",
            email: val.email || "",
            classCredits: val.classCredits ?? 0,
          }),
        );
        setMembers(list.sort((a: any, b: any) => a.name.localeCompare(b.name)));
      }
    } catch {
      /* non-critical */
    }
  };
  useEffect(() => {
    loadPackages();
    loadMembers();
  }, []);

  const save = async () => {
    if (!form.name || !form.credits || !form.price)
      return toast("Fill in Name, Credits and Price", "error");
    const data = {
      name: form.name,
      description: form.description,
      credits: parseInt(form.credits),
      price: parseInt(form.price),
      badge: form.badge,
      active: form.active,
      updatedAt: Date.now(),
    };
    try {
      if (editing) {
        await set(ref(db, `packages/${editing.id}`), data);
        toast("Updated ✓", "success");
      } else {
        await push(ref(db, "packages"), { ...data, createdAt: Date.now() });
        toast("Package created ✓", "success");
      }
      setShowForm(false);
      setEditing(null);
      setForm(blank);
      loadPackages();
    } catch {
      toast("Save failed", "error");
    }
  };
  const toggleActive = async (pkg: any) => {
    await set(ref(db, `packages/${pkg.id}/active`), !pkg.active);
    toast(pkg.active ? "Package hidden" : "Package visible ✓", "info");
    loadPackages();
  };
  const del = async (pkg: any) => {
    if (!confirm(`Delete "${pkg.name}"?`)) return;
    await remove(ref(db, `packages/${pkg.id}`));
    toast("Deleted", "info");
    loadPackages();
  };
  const startEdit = (pkg: any) => {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description || "",
      credits: String(pkg.credits),
      price: String(pkg.price),
      badge: pkg.badge || "",
      active: pkg.active !== false,
    });
    setShowForm(true);
  };

  const assignCreditsToUser = async () => {
    if (!assignUid) return toast("Select a member", "error");
    const amount = parseInt(assignCredits);
    if (!amount || amount < 1)
      return toast("Enter valid credit amount", "error");
    setAssigning(true);
    try {
      const memberRef = ref(db, `mk2_users/${assignUid}/classCredits`);
      const snap = await get(memberRef);
      const current = snap.exists() ? (snap.val() as number) : 0;
      await set(memberRef, current + amount);
      await push(ref(db, `mk2_users/${assignUid}/creditHistory`), {
        amount,
        type: "manual_assign",
        note: assignNote || "Admin assignment",
        timestamp: Date.now(),
        adminAssigned: true,
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.uid === assignUid ? { ...m, classCredits: current + amount } : m,
        ),
      );
      toast(`+${amount} credits assigned ✓`, "success");
      setAssignNote("");
    } catch {
      toast("Assignment failed", "error");
    }
    setAssigning(false);
  };

  const selectedMember = members.find((m) => m.uid === assignUid);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Class Credit Packages ({packages.length})
        </div>
        <Btn
          variant="primary"
          size="sm"
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
            setForm(blank);
          }}
        >
          {showForm ? "✕ Cancel" : "+ New Package"}
        </Btn>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
              {editing ? "Edit Package" : "New Package"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Package Name</label>
                <input
                  style={inp}
                  placeholder="e.g. 10-Class Pack"
                  value={form.name}
                  onChange={f("name")}
                />
              </div>
              <div>
                <label style={lbl}>Credits</label>
                <input
                  style={inp}
                  type="number"
                  placeholder="10"
                  value={form.credits}
                  onChange={f("credits")}
                />
              </div>
              <div>
                <label style={lbl}>Price (ZAR)</label>
                <input
                  style={inp}
                  type="number"
                  placeholder="299"
                  value={form.price}
                  onChange={f("price")}
                />
              </div>
              <div>
                <label style={lbl}>Badge (optional)</label>
                <input
                  style={inp}
                  placeholder="Best Value"
                  value={form.badge}
                  onChange={f("badge")}
                />
              </div>
              <div>
                <label style={lbl}>Visible?</label>
                <select
                  style={inp}
                  value={form.active ? "true" : "false"}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      active: e.target.value === "true",
                    }))
                  }
                >
                  <option value="true">✓ Visible</option>
                  <option value="false">✕ Hidden</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Description</label>
              <input
                style={inp}
                placeholder="e.g. Perfect for regular gym-goers"
                value={form.description}
                onChange={f("description")}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={save}>
                {editing ? "Save Changes" : "Create Package"}
              </Btn>
              <Btn
                variant="subtle"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading…
        </div>
      ) : packages.length === 0 ? (
        <div
          style={{
            color: "hsl(var(--muted-foreground))",
            fontSize: 13,
            padding: "20px 0",
          }}
        >
          No packages yet.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
            gap: 12,
            marginBottom: 32,
          }}
        >
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                padding: 16,
                opacity: pkg.active ? 1 : 0.6,
              }}
            >
              {pkg.badge && (
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 10px",
                    borderRadius: 20,
                    background: "hsl(20 100% 50% / 0.15)",
                    color: "hsl(20 100% 50%)",
                    border: "1px solid hsl(20 100% 50% / 0.3)",
                    marginBottom: 10,
                  }}
                >
                  {pkg.badge}
                </div>
              )}
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                {pkg.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: 10,
                }}
              >
                {pkg.description}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    color: "hsl(20 100% 50%)",
                  }}
                >
                  {pkg.credits}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  credits
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
                R{pkg.price}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn variant="subtle" size="sm" onClick={() => startEdit(pkg)}>
                  Edit
                </Btn>
                <Btn
                  variant={pkg.active ? "subtle" : "green"}
                  size="sm"
                  onClick={() => toggleActive(pkg)}
                >
                  {pkg.active ? "Hide" : "Show"}
                </Btn>
                <Btn variant="danger" size="sm" onClick={() => del(pkg)}>
                  Delete
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual credit assignment */}
      <div
        style={{
          borderTop: "1px solid hsl(var(--border))",
          paddingTop: 24,
          marginTop: 8,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
          Manually Assign Credits
        </div>
        <div
          style={{
            fontSize: 12,
            color: "hsl(var(--muted-foreground))",
            marginBottom: 16,
          }}
        >
          Assign credits when a member pays cash or EFT. PayFast will automate
          this once live.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={lbl}>Member</label>
            <select
              style={inp}
              value={assignUid}
              onChange={(e) => setAssignUid(e.target.value)}
            >
              <option value="">— Select member —</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {m.name} ({m.email}) — {m.classCredits} credits
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Credits to Add</label>
            <input
              style={inp}
              type="number"
              min="1"
              max="100"
              value={assignCredits}
              onChange={(e) => setAssignCredits(e.target.value)}
            />
          </div>
          <div>
            <label style={lbl}>Note (optional)</label>
            <input
              style={inp}
              placeholder="e.g. Cash payment - 10-pack"
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
            />
          </div>
        </div>
        {selectedMember && (
          <div
            style={{
              fontSize: 12,
              color: "hsl(var(--muted-foreground))",
              marginBottom: 12,
              padding: "8px 12px",
              background: "hsl(var(--secondary))",
              borderRadius: 8,
            }}
          >
            {selectedMember.name} has{" "}
            <strong style={{ color: "hsl(20 100% 50%)" }}>
              {selectedMember.classCredits}
            </strong>{" "}
            credits → after:{" "}
            <strong style={{ color: "hsl(142 72% 37%)" }}>
              {selectedMember.classCredits + parseInt(assignCredits || "0")}
            </strong>
          </div>
        )}
        <Btn
          variant="green"
          onClick={assignCreditsToUser}
          disabled={assigning || !assignUid}
        >
          {assigning ? "Assigning…" : `✓ Assign ${assignCredits} Credits`}
        </Btn>
      </div>
    </div>
  );
}

// ── Ad Enquiries Manager ──────────────────────────────────────────────────────
function AdEnquiriesManager({ toast }: any) {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const load = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "ad_enquiries"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([k, v]: [string, any]) => ({ key: k, ...v }),
        );
        setEnquiries(
          list.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          ),
        );
      } else setEnquiries([]);
    } catch {
      toast("Failed to load enquiries", "error");
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const updateStatus = async (key: string, status: string) => {
    await set(ref(db, `ad_enquiries/${key}/status`), status);
    setEnquiries((prev) =>
      prev.map((e) => (e.key === key ? { ...e, status } : e)),
    );
    toast(`Status updated to ${status}`, "success");
  };
  const deleteEnquiry = async (key: string) => {
    if (!confirm("Delete this enquiry?")) return;
    await remove(ref(db, `ad_enquiries/${key}`));
    setEnquiries((prev) => prev.filter((e) => e.key !== key));
    toast("Deleted", "info");
  };
  const STATUS_COLORS: any = {
    new: { bg: "hsl(20 100% 50% / 0.15)", color: "hsl(20 100% 50%)" },
    contacted: { bg: "hsl(217 91% 53% / 0.15)", color: "hsl(217 91% 53%)" },
    confirmed: { bg: "hsl(142 72% 37% / 0.15)", color: "hsl(142 72% 37%)" },
    declined: { bg: "hsl(0 84% 51% / 0.15)", color: "hsl(0 84% 51%)" },
  };
  const filtered =
    filter === "all" ? enquiries : enquiries.filter((e) => e.status === filter);
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Ad Enquiries ({enquiries.length})
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "new", "contacted", "confirmed", "declined"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                textTransform: "capitalize",
                background:
                  filter === s ? "hsl(20 100% 50%)" : "hsl(var(--secondary))",
                color: filter === s ? "#000" : "hsl(var(--foreground))",
                border: filter === s ? "none" : "1px solid hsl(var(--border))",
              }}
            >
              {s}
            </button>
          ))}
          <Btn variant="subtle" size="sm" onClick={load}>
            ↻ Refresh
          </Btn>
        </div>
      </div>
      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          No enquiries found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((e) => {
            const sc = STATUS_COLORS[e.status] || STATUS_COLORS.new;
            return (
              <div
                key={e.key}
                style={{
                  background: "hsl(var(--secondary))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  padding: "14px 16px",
                  borderLeft: `3px solid ${sc.color}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {e.bizName}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: sc.bg,
                          color: sc.color,
                          textTransform: "capitalize",
                        }}
                      >
                        {e.status}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "hsl(var(--muted-foreground))",
                        marginTop: 3,
                      }}
                    >
                      {e.contactName} · {e.email} {e.phone && `· ${e.phone}`}
                    </div>
                    {e.message && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "hsl(var(--foreground))",
                          marginTop: 6,
                          fontStyle: "italic",
                        }}
                      >
                        "{e.message}"
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Btn
                      variant="subtle"
                      size="sm"
                      onClick={() => updateStatus(e.key, "contacted")}
                    >
                      Contacted
                    </Btn>
                    <Btn
                      variant="green"
                      size="sm"
                      onClick={() => updateStatus(e.key, "confirmed")}
                    >
                      ✓ Confirmed
                    </Btn>
                    <Btn
                      variant="danger"
                      size="sm"
                      onClick={() => deleteEnquiry(e.key)}
                    >
                      Delete
                    </Btn>
                  </div>
                </div>
                <a
                  href={`mailto:${e.email}?subject=Re: Advertising Enquiry — MK Two Rivers`}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "hsl(217 91% 53%)",
                    textDecoration: "none",
                  }}
                >
                  ✉ Reply via email →
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Feedback Manager ──────────────────────────────────────────────────────────
function FeedbackManager({ toast }: any) {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const TYPES = [
    "all",
    "Feature suggestion",
    "Bug / issue report",
    "App improvement",
    "General comment",
  ];
  const load = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "app_feedback"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([k, v]: [string, any]) => ({ key: k, ...v }),
        );
        setFeedback(
          list.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          ),
        );
      } else setFeedback([]);
    } catch {
      toast("Failed to load feedback", "error");
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const deleteFb = async (key: string) => {
    if (!confirm("Delete this feedback?")) return;
    await remove(ref(db, `app_feedback/${key}`));
    setFeedback((prev) => prev.filter((f) => f.key !== key));
    toast("Deleted", "info");
  };
  const avgRating = feedback.length
    ? (
        feedback.reduce((s, f) => s + (f.rating || 0), 0) / feedback.length
      ).toFixed(1)
    : "—";
  const filtered =
    filter === "all" ? feedback : feedback.filter((f) => f.type === filter);
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          App Feedback ({feedback.length}) · Avg: {avgRating}★
        </div>
        <Btn variant="subtle" size="sm" onClick={load}>
          ↻ Refresh
        </Btn>
      </div>
      <div
        style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
      >
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              background:
                filter === t ? "hsl(217 91% 53%)" : "hsl(var(--secondary))",
              color: filter === t ? "#fff" : "hsl(var(--foreground))",
              border: filter === t ? "none" : "1px solid hsl(var(--border))",
            }}
          >
            {t === "all" ? "All" : t}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          No feedback yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((f) => (
            <div
              key={f.key}
              style={{
                background: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                padding: "12px 16px",
                borderLeft: "3px solid hsl(217 91% 53%)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {f.name}
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: "hsl(217 91% 53% / 0.15)",
                        color: "hsl(217 91% 53%)",
                        fontWeight: 700,
                      }}
                    >
                      {f.type}
                    </span>
                    <span
                      style={{
                        color: "hsl(38 92% 44%)",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {"★".repeat(f.rating || 0)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "hsl(var(--muted-foreground))",
                      marginTop: 2,
                    }}
                  >
                    {f.email} ·{" "}
                    {new Date(f.timestamp).toLocaleDateString("en-ZA")}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "hsl(var(--foreground))",
                      marginTop: 6,
                      lineHeight: 1.6,
                    }}
                  >
                    {f.message}
                  </div>
                </div>
                <Btn variant="danger" size="sm" onClick={() => deleteFb(f.key)}>
                  Delete
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InstagramSetup() {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
        Instagram Auto-Sync Setup
      </div>
      <div
        style={{
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(20 100% 50% / 0.3)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: "hsl(20 100% 50%)",
            marginBottom: 8,
          }}
        >
          Status: Pending Meta Approval
        </div>
        <div
          style={{
            fontSize: 13,
            color: "hsl(var(--muted-foreground))",
            lineHeight: 1.8,
          }}
        >
          Once approved, new posts on the gym's Instagram will automatically
          appear in the Gallery section.
        </div>
      </div>
    </div>
  );
}

// ── Terms Manager (T&C Audit Log) ─────────────────────────────────────────────
function TermsManager({ toast }: any) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "terms_acceptance"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([uid, val]: [string, any]) => ({ uid, ...val }),
        );
        setRecords(list.sort((a, b) => b.acceptedAt - a.acceptedAt));
      } else setRecords([]);
    } catch {
      toast("Failed to load records", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          T&C Acceptance Records ({records.length})
        </div>
        <Btn variant="subtle" size="sm" onClick={load}>
          ↻ Refresh
        </Btn>
      </div>
      <div
        style={{
          fontSize: 12,
          color: "hsl(var(--muted-foreground))",
          marginBottom: 16,
          padding: "10px 14px",
          background: "hsl(142 72% 37% / 0.1)",
          border: "1px solid hsl(142 72% 37% / 0.3)",
          borderRadius: 8,
        }}
      >
        ✓ These records confirm each member has accepted the Terms & Conditions.
        POPIA compliant audit log.
      </div>
      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading…
        </div>
      ) : records.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          No records yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {records.map((r) => (
            <div
              key={r.uid}
              style={{
                background: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                borderLeft: "3px solid hsl(142 72% 37%)",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: "hsl(var(--muted-foreground))",
                    marginTop: 2,
                  }}
                >
                  {r.email} · Version: {r.termsVersion}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "hsl(var(--muted-foreground))",
                  textAlign: "right",
                }}
              >
                <div style={{ fontWeight: 700, color: "hsl(142 72% 37%)" }}>
                  ✓ Accepted
                </div>
                <div>
                  {new Date(r.acceptedAt).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Banners Manager ───────────────────────────────────────────────────────────
function BannersManager({ toast }: any) {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const blank = {
    title: "",
    subtitle: "",
    emoji: "🔥",
    imageUrl: "",
    url: "",
    cta: "Learn More",
    color: "hsl(20 100% 50%)",
    bgColor: "hsl(20 100% 50% / 0.06)",
    active: true,
    expiresAt: "",
  };
  const [form, setForm] = useState(blank);
  const f = (k: string) => (e: any) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "ad_banners"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([id, val]: [string, any]) => ({ id, ...val }),
        );
        setBanners(
          list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
        );
      } else setBanners([]);
    } catch {
      toast("Failed to load banners", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.title) return toast("Enter a title", "error");
    try {
      await push(ref(db, "ad_banners"), {
        ...form,
        active: form.active === true || (form.active as any) === "true",
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : null,
        createdAt: Date.now(),
      });
      toast("Banner created ✓", "success");
      setShowForm(false);
      setForm(blank);
      load();
    } catch {
      toast("Save failed", "error");
    }
  };

  const toggleActive = async (banner: any) => {
    await set(ref(db, `ad_banners/${banner.id}/active`), !banner.active);
    toast(banner.active ? "Banner hidden" : "Banner live ✓", "info");
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await remove(ref(db, `ad_banners/${id}`));
    toast("Deleted", "info");
    load();
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Ad Banners ({banners.length})
        </div>
        <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ New Banner"}
        </Btn>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
              New Banner
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              {(
                [
                  ["title", "Title *", "e.g. Ruimsig Pharmacy"],
                  ["subtitle", "Subtitle", "Short tagline"],
                  ["emoji", "Emoji", "🔥"],
                  ["cta", "Button Text", "Learn More"],
                  ["url", "Click URL", "https://..."],
                  ["imageUrl", "Image URL (optional)", "https://..."],
                  ["color", "Accent Color", "hsl(20 100% 50%)"],
                  ["expiresAt", "Expires (optional)", ""],
                ] as any[]
              ).map(([k, l, p]: any) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <input
                    style={inp}
                    type={k === "expiresAt" ? "date" : "text"}
                    placeholder={p}
                    value={(form as any)[k]}
                    onChange={f(k)}
                  />
                </div>
              ))}
              <div>
                <label style={lbl}>Status</label>
                <select
                  style={inp}
                  value={String(form.active)}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      active: e.target.value === "true",
                    }))
                  }
                >
                  <option value="true">✓ Live</option>
                  <option value="false">✕ Hidden</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={save}>
                Create Banner
              </Btn>
              <Btn variant="subtle" onClick={() => setShowForm(false)}>
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading…
        </div>
      ) : banners.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          No banners yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {banners.map((b) => (
            <div
              key={b.id}
              style={{
                background: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                borderLeft: `3px solid ${b.active ? b.color : "#666"}`,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {b.emoji} {b.title}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: b.active
                        ? "hsl(142 72% 37% / 0.15)"
                        : "hsl(var(--secondary))",
                      color: b.active
                        ? "hsl(142 72% 37%)"
                        : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {b.active ? "● Live" : "○ Hidden"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "hsl(var(--muted-foreground))",
                    marginTop: 2,
                  }}
                >
                  {b.subtitle}{" "}
                  {b.expiresAt
                    ? `· Expires ${new Date(b.expiresAt).toLocaleDateString("en-ZA")}`
                    : "· No expiry"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn
                  variant={b.active ? "subtle" : "green"}
                  size="sm"
                  onClick={() => toggleActive(b)}
                >
                  {b.active ? "Hide" : "Go Live"}
                </Btn>
                <Btn variant="danger" size="sm" onClick={() => del(b.id)}>
                  Delete
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Challenges Manager ────────────────────────────────────────────────────────
function ChallengesManager({ toast }: any) {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const blank = {
    name: "",
    exercise: "",
    description: "",
    startDate: "",
    endDate: "",
    metric: "reps",
    prize: "",
    color: "hsl(20 100% 50%)",
    active: true,
  };
  const [form, setForm] = useState(blank);
  const f = (k: string) => (e: any) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "challenges"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([id, val]: [string, any]) => ({ id, ...val }),
        );
        setChallenges(
          list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
        );
      } else setChallenges([]);
    } catch {
      toast("Failed to load challenges", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name || !form.startDate || !form.endDate)
      return toast("Fill in Name, Start and End Date", "error");
    try {
      await push(ref(db, "challenges"), {
        ...form,
        active: form.active === true || (form.active as any) === "true",
        createdAt: Date.now(),
      });
      toast("Challenge created ✓", "success");
      setShowForm(false);
      setForm(blank);
      load();
    } catch {
      toast("Save failed", "error");
    }
  };

  const toggleActive = async (c: any) => {
    await set(ref(db, `challenges/${c.id}/active`), !c.active);
    toast(c.active ? "Challenge hidden" : "Challenge active ✓", "info");
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this challenge and all its entries?")) return;
    await remove(ref(db, `challenges/${id}`));
    await remove(ref(db, `challenge_entries/${id}`));
    toast("Deleted", "info");
    load();
  };

  const COLORS = [
    "hsl(20 100% 50%)",
    "hsl(263 85% 58%)",
    "hsl(142 72% 37%)",
    "hsl(217 91% 53%)",
    "hsl(38 92% 44%)",
    "hsl(187 85% 40%)",
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Challenges ({challenges.length})
        </div>
        <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ New Challenge"}
        </Btn>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
              New Challenge
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              {(
                [
                  ["name", "Challenge Name *", "e.g. 30-Day Squat Challenge"],
                  ["exercise", "Exercise", "e.g. Squat"],
                  ["metric", "Metric", "e.g. kg, reps, time"],
                  ["prize", "Prize", "e.g. Free 1-month membership"],
                  ["startDate", "Start Date *", ""],
                  ["endDate", "End Date *", ""],
                ] as any[]
              ).map(([k, l, p]: any) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <input
                    style={inp}
                    type={k.includes("Date") ? "date" : "text"}
                    placeholder={p}
                    value={(form as any)[k]}
                    onChange={f(k)}
                  />
                </div>
              ))}
              <div>
                <label style={lbl}>Status</label>
                <select
                  style={inp}
                  value={String(form.active)}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      active: e.target.value === "true",
                    }))
                  }
                >
                  <option value="true">✓ Active</option>
                  <option value="false">✕ Hidden</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Color</label>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginTop: 4,
                  }}
                >
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((p) => ({ ...p, color: c }))}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: c,
                        border:
                          form.color === c
                            ? "3px solid white"
                            : "2px solid transparent",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Description</label>
              <textarea
                style={{ ...inp, minHeight: 60, resize: "vertical" }}
                placeholder="Describe the challenge…"
                value={form.description}
                onChange={f("description")}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={save}>
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
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading…
        </div>
      ) : challenges.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          No challenges yet. Create one above!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {challenges.map((c) => (
            <div
              key={c.id}
              style={{
                background: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                borderLeft: `3px solid ${c.color}`,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {c.name}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: c.active
                        ? "hsl(142 72% 37% / 0.15)"
                        : "hsl(var(--secondary))",
                      color: c.active
                        ? "hsl(142 72% 37%)"
                        : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {c.active ? "● Active" : "○ Hidden"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "hsl(var(--muted-foreground))",
                    marginTop: 2,
                  }}
                >
                  {c.startDate} → {c.endDate} · {c.metric} · 🏆 {c.prize}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn
                  variant={c.active ? "subtle" : "green"}
                  size="sm"
                  onClick={() => toggleActive(c)}
                >
                  {c.active ? "Deactivate" : "Activate"}
                </Btn>
                <Btn variant="danger" size="sm" onClick={() => del(c.id)}>
                  Delete
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add to Firebase rules reminder */}
      <div
        style={{
          marginTop: 20,
          padding: "10px 14px",
          background: "hsl(217 91% 53% / 0.1)",
          border: "1px solid hsl(217 91% 53% / 0.3)",
          borderRadius: 8,
          fontSize: 12,
          color: "hsl(var(--muted-foreground))",
        }}
      >
        ℹ️ Challenge entries are stored at{" "}
        <strong style={{ color: "hsl(217 91% 53%)" }}>
          challenge_entries/
        </strong>{" "}
        in Firebase. Make sure your rules allow read/write for authenticated
        users.
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "members", label: "👥 Members", desc: "Manage user tiers" },
  { id: "classes", label: "📅 Classes", desc: "Schedule & bookings" },
  { id: "packages", label: "🎟 Packages", desc: "Class credit packages" },
  { id: "gallery", label: "📸 Gallery", desc: "Add & remove items" },
  { id: "news", label: "📢 News & Events", desc: "Post updates" },
  { id: "ads", label: "📣 Ad Enquiries", desc: "Manage advertising" },
  { id: "banners", label: "🖼 Ad Banners", desc: "Live banner ads" },
  { id: "challenges", label: "🏁 Challenges", desc: "Create challenges" },
  { id: "feedback", label: "💬 Feedback", desc: "App feedback & ratings" },
  { id: "terms", label: "📋 T&C Records", desc: "Acceptance audit log" },
  { id: "instagram", label: "📱 Instagram", desc: "Auto-sync setup" },
];

export function Admin() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem("mk2admin") === "true",
  );
  const [tab, setTab] = useState("members");
  const [toastQ, setToastQ] = useState<any>(null);
  const { isMobile } = useBreakpoint();
  const toast = (msg: string, type: string) => setToastQ({ msg, type });
  const login = () => {
    sessionStorage.setItem("mk2admin", "true");
    setAuthed(true);
  };
  const logout = () => {
    sessionStorage.removeItem("mk2admin");
    setAuthed(false);
  };

  if (!authed) return <AdminLogin onLogin={login} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        fontFamily: "var(--font-body)",
        paddingBottom: 40,
      }}
    >
      <nav
        style={{
          background: "hsl(0 0% 4%)",
          borderBottom: "1px solid hsl(var(--border))",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            letterSpacing: "0.15em",
            color: "hsl(20 100% 50%)",
          }}
        >
          MK2R ADMIN
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
            Management Portal
          </span>
          <Btn variant="subtle" size="sm" onClick={logout}>
            Sign Out
          </Btn>
        </div>
      </nav>

      <div
        style={{
          maxWidth: 1060,
          margin: "0 auto",
          padding: isMobile ? "20px 14px" : "32px 24px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
            gap: 10,
            marginBottom: 28,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background:
                  tab === t.id ? "hsl(20 100% 50%)" : "hsl(var(--card))",
                color: tab === t.id ? "#000" : "hsl(var(--foreground))",
                border: `1px solid ${tab === t.id ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
                borderRadius: 10,
                padding: "14px 16px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>
                {t.desc}
              </div>
            </button>
          ))}
        </div>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 14,
            padding: isMobile ? 16 : 24,
          }}
        >
          {tab === "members" && <MembersManager toast={toast} />}
          {tab === "classes" && <ClassesManager toast={toast} />}
          {tab === "packages" && <PackagesManager toast={toast} />}
          {tab === "gallery" && <GalleryManager toast={toast} />}
          {tab === "news" && <NewsManager toast={toast} />}
          {tab === "ads" && <AdEnquiriesManager toast={toast} />}
          {tab === "feedback" && <FeedbackManager toast={toast} />}
          {tab === "instagram" && <InstagramSetup />}
          {tab === "terms" && <TermsManager toast={toast} />}
          {tab === "banners" && <BannersManager toast={toast} />}
          {tab === "challenges" && <ChallengesManager toast={toast} />}
        </motion.div>
      </div>

      {toastQ && <MToast {...toastQ} onDone={() => setToastQ(null)} />}
    </div>
  );
}
