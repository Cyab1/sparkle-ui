import { useState, useEffect, useRef } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import {
  fetchCollection,
  addToCollection,
  updateInCollection,
  deleteFromCollection,
} from "@/lib/firebase";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { ref, get, set, remove, push, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { QRScanner } from "@/components/shared/QRScanner";
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

const INTENSITIES = [
  "Low",
  "Low–Medium",
  "Medium",
  "Medium–High",
  "High",
  "Very High",
];
const NEWS_TYPES = ["News", "Event", "Announcement"];

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
    blue: { background: "hsl(217 91% 53%)", color: "#fff", border: "none" },
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

// ── Admin Calendar (timezone‑safe) ───────────────────────────────────────────
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

// ── Category Manager ──────────────────────────────────────────────────────────
function CategoryManager({ toast }: any) {
  const [cats, setCats] = useState<string[]>([]);
  const [newCat, setNewCat] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get(ref(db, "class_categories")).then((snap) => {
      if (snap.exists()) setCats(snap.val());
      else
        setCats([
          "Crossfit",
          "Gymnastics",
          "Strength",
          "Olympic Lifting",
          "Saturday Smasher",
        ]);
    });
  }, []);

  const save = async (updated: string[]) => {
    setSaving(true);
    try {
      await set(ref(db, "class_categories"), updated);
      setCats(updated);
      toast("Categories saved ✓", "success");
    } catch {
      toast("Save failed", "error");
    }
    setSaving(false);
  };

  const add = () => {
    const trimmed = newCat.trim();
    if (!trimmed || cats.includes(trimmed)) return;
    save([...cats, trimmed]);
    setNewCat("");
  };

  const removeCat = (cat: string) => {
    if (!confirm(`Delete "${cat}"?`)) return;
    save(cats.filter((c) => c !== cat));
  };

  return (
    <div
      style={{
        background: "hsl(var(--secondary))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 20,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
        📂 Class Categories
      </div>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}
      >
        {cats.map((cat) => (
          <div
            key={cat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 20,
              background: "hsl(20 100% 50% / 0.1)",
              border: "1px solid hsl(20 100% 50% / 0.3)",
              fontSize: 12,
              fontWeight: 700,
              color: "hsl(20 100% 50%)",
            }}
          >
            {cat}
            <button
              onClick={() => removeCat(cat)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "hsl(0 84% 51%)",
                fontSize: 12,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ ...inp, flex: 1 }}
          placeholder="New category name…"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Btn
          variant="primary"
          size="sm"
          onClick={add}
          disabled={saving || !newCat.trim()}
        >
          + Add
        </Btn>
      </div>
    </div>
  );
}

// ── Classes Manager ───────────────────────────────────────────────────────────
function ClassesManager({ toast }: any) {
  // FIX: cats state moved to top of component, before blank uses it
  const [cats, setCats] = useState<string[]>([
    "Crossfit",
    "Gymnastics",
    "Strength",
    "Olympic Lifting",
    "Saturday Smasher",
  ]);

  useEffect(() => {
    get(ref(db, "class_categories")).then((snap) => {
      if (snap.exists()) setCats(snap.val());
    });
  }, []);

  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"day" | "date">("day");
  const [calDate, setCalDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  // FIX: corrected generic type syntax
  const [allBookings, setAllBookings] = useState<
    Record<string, Record<string, any>>
  >({});
  const [expandedBookings, setExpandedBookings] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const blank = {
    name: cats[0] ?? "Crossfit",
    time: "06:00",
    trainer: "",
    day: "Monday",
    specificDate: "",
    spots: "20",
    duration: "60 min",
    intensity: "Medium",
    category: cats[0] ?? "Crossfit",
    subtitle: "",
    details: "",
    scheduleType: "day",
    wod: "",
    warmup: "",
    exercises: [] as any[],
    chargeNonMembers: true,
    price: "250",
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

  useEffect(() => {
    return onValue(ref(db, "class_bookings"), (snap) =>
      setAllBookings(snap.val() ?? {}),
    );
  }, []);

  const save = async () => {
    if (!form.name) return toast("Fill in Name, Time and Trainer", "error");

    const data = {
      ...form,
      name: form.category,
      spots: parseInt(form.spots),
      details:
        scheduleMode === "date" ? form.details.split("\n").filter(Boolean) : [],
      wod: scheduleMode === "date" ? form.wod : "",
      warmup: scheduleMode === "date" ? form.warmup : "",
      exercises: scheduleMode === "date" ? form.exercises || [] : [],
      scheduleType: scheduleMode,
      specificDate: scheduleMode === "date" ? formatDateKey(calDate) : "",
      day: scheduleMode === "day" ? form.day : getDayName(calDate),
      chargeNonMembers: Boolean(form.chargeNonMembers),
      price: form.chargeNonMembers ? parseFloat(form.price) || 0 : 0,
    };

    if (editing && !isDuplicate) {
      const existingSnap = await get(
        ref(db, `admin_classes/${editing.id}/bookedCount`),
      );
      const currentBookedCount = existingSnap.exists()
        ? (existingSnap.val() as number)
        : 0;
      await updateInCollection("admin_classes", editing.id, {
        ...data,
        bookedCount: currentBookedCount,
      });
      toast("Updated ✓", "success");
    } else {
      await addToCollection("admin_classes", { ...data, bookedCount: 0 });
      toast(isDuplicate ? "Class duplicated ✓" : "Class added ✓", "success");
    }
    setShowForm(false);
    setEditing(null);
    setIsDuplicate(false);
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
    setIsDuplicate(false);
    setScheduleMode(c.scheduleType || "day");
    setForm({
      name: c.category,
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
      warmup: c.warmup || "",
      exercises: c.exercises || [],
      chargeNonMembers: Boolean(c.chargeNonMembers),
      price: String(c.price ?? 0),
    });
    if (c.specificDate) setCalDate(new Date(c.specificDate + "T00:00:00"));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const duplicateClass = (c: any) => {
    setEditing(c);
    setIsDuplicate(true);
    setScheduleMode(c.scheduleType || "day");
    setForm({
      name: c.name + " (copy)",
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
      warmup: c.warmup || "",
      exercises: c.exercises || [],
      chargeNonMembers: Boolean(c.chargeNonMembers),
      price: String(c.price ?? 0),
    });
    if (c.specificDate) setCalDate(new Date(c.specificDate + "T00:00:00"));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          const key = formatDateKey(d);
          classDateCounts[key] = (classDateCounts[key] || 0) + 1;
        }
      }
    }
  });

  const selectedDateKey = formatDateKey(calDate);
  const selectedDayName = getDayName(calDate);

  const classesOnDate = classes
    .filter((cls) =>
      cls.scheduleType === "date"
        ? cls.specificDate === selectedDateKey
        : cls.day === selectedDayName,
    )
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const adminCancelBooking = async (
    cls: any,
    uid: string,
    memberName: string,
  ) => {
    if (!confirm(`Remove ${memberName}'s booking from ${cls.name}?`)) return;
    setCancelling(`${cls.name}_${uid}`);
    const bk = buildBookingKey(cls.name, selectedDateKey);
    try {
      await set(ref(db, `class_bookings/${bk}/${uid}`), null);
      const credSnap = await get(ref(db, `mk2_users/${uid}/classCredits`));
      const current = credSnap.exists() ? (credSnap.val() as number) : 0;
      await set(ref(db, `mk2_users/${uid}/classCredits`), current + 1);
      await push(ref(db, `mk2_users/${uid}/creditHistory`), {
        amount: +1,
        type: "admin_cancel",
        note: `Admin removed: ${cls.name} on ${selectedDateKey}`,
        timestamp: Date.now(),
      });
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

  const ClassActions = ({ cls, bookings }: { cls: any; bookings?: any[] }) => (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {bookings !== undefined && (
        <button
          onClick={() =>
            setExpandedBookings(expandedBookings === cls.id ? null : cls.id)
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
          {expandedBookings === cls.id ? "▲" : "▼"}
        </button>
      )}
      <Btn variant="blue" size="sm" onClick={() => duplicateClass(cls)}>
        ⧉ Duplicate
      </Btn>
      <Btn variant="subtle" size="sm" onClick={() => startEdit(cls)}>
        Edit
      </Btn>
      <Btn variant="danger" size="sm" onClick={() => del(cls.id)}>
        Delete
      </Btn>
    </div>
  );

  return (
    <div>
      <CategoryManager toast={toast} />
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
              setIsDuplicate(false);
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
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              {isDuplicate
                ? "Duplicate Class"
                : editing
                  ? "Edit Class"
                  : "New Class"}
            </div>
            {isDuplicate && (
              <div
                style={{
                  fontSize: 11,
                  color: "hsl(217 91% 53%)",
                  marginBottom: 14,
                  padding: "6px 10px",
                  background: "hsl(217 91% 53% / 0.1)",
                  borderRadius: 6,
                  border: "1px solid hsl(217 91% 53% / 0.3)",
                }}
              >
                ⧉ Duplicating from "{editing?.name}" — adjust details and save
                as a new class.
              </div>
            )}
            <div style={{ marginBottom: 14 }} />

            {/* Schedule Type */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Schedule Type</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                      : "🗓 Workout Details (once-off)"}
                  </button>
                ))}
              </div>
              {scheduleMode === "day" && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: "hsl(var(--muted-foreground))",
                    padding: "6px 10px",
                    background: "hsl(142 72% 37% / 0.08)",
                    borderRadius: 6,
                    border: "1px solid hsl(142 72% 37% / 0.2)",
                  }}
                >
                  ℹ️ WOD details are added per-date on once-off classes. Weekly
                  recurring classes share the same template.
                </div>
              )}
            </div>

            {/* Day / Date picker */}
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

            {/* Core fields grid */}
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
                  ["trainer", "Trainer", "Coach Marcus"],
                  ["duration", "Duration", "60 min"],
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

              {/* Max Spots dropdown */}
              <div>
                <label style={lbl}>Max Spots</label>
                <select
                  style={inp}
                  value={form.spots}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, spots: e.target.value }))
                  }
                >
                  {[
                    "5",
                    "8",
                    "10",
                    "12",
                    "15",
                    "16",
                    "18",
                    "20",
                    "24",
                    "25",
                    "30",
                    "40",
                    "50",
                  ].map((n) => (
                    <option key={n} value={n}>
                      {n} spots
                    </option>
                  ))}
                </select>
              </div>

              {/* Time dropdown */}
              <div>
                <label style={lbl}>Time</label>
                <select style={inp} value={form.time} onChange={f("time")}>
                  {[
                    "05:00",
                    "05:15",
                    "05:30",
                    "05:45",
                    "06:00",
                    "06:15",
                    "06:30",
                    "06:45",
                    "07:00",
                    "07:15",
                    "07:30",
                    "07:45",
                    "08:00",
                    "08:15",
                    "08:30",
                    "08:45",
                    "09:00",
                    "09:15",
                    "09:30",
                    "09:45",
                    "10:00",
                    "10:15",
                    "10:30",
                    "10:45",
                    "11:00",
                    "11:30",
                    "12:00",
                    "12:30",
                    "13:00",
                    "13:30",
                    "14:00",
                    "14:30",
                    "15:00",
                    "15:30",
                    "16:00",
                    "16:30",
                    "17:00",
                    "17:15",
                    "17:30",
                    "17:45",
                    "18:00",
                    "18:15",
                    "18:30",
                    "18:45",
                    "19:00",
                    "19:15",
                    "19:30",
                    "19:45",
                    "20:00",
                    "20:30",
                  ].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category dropdown */}
              <div>
                <label style={lbl}>Category</label>
                <select
                  style={inp}
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      category: e.target.value,
                      name: e.target.value,
                    }))
                  }
                >
                  {cats.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Non-Member Booking */}
            <div
              style={{
                marginBottom: 14,
                padding: "14px 16px",
                background: "hsl(var(--background))",
                borderRadius: 10,
                border: "1px solid hsl(var(--border))",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>
                Non-Member Booking
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <input
                  type="checkbox"
                  id="chargeNonMembers"
                  checked={Boolean(form.chargeNonMembers)}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      chargeNonMembers: e.target.checked,
                      price: e.target.checked ? p.price : "0",
                    }))
                  }
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <label
                  htmlFor="chargeNonMembers"
                  style={{
                    fontSize: 13,
                    color: "hsl(var(--foreground))",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  Charge non-members to book this class
                </label>
              </div>
              {form.chargeNonMembers ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, maxWidth: 200 }}>
                    <label style={lbl}>Price (ZAR)</label>
                    <input
                      type="number"
                      style={inp}
                      placeholder="250.00"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={f("price")}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "hsl(var(--muted-foreground))",
                      marginTop: 20,
                    }}
                  >
                    Non-members will pay via PayFast before booking is
                    confirmed.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  Non-members can book this class for free (no payment
                  required).
                </div>
              )}
            </div>

            {/* Warm Up + Workout — once-off classes only */}
            {scheduleMode === "date" && (
              <>
                {/* Warm Up */}
                <div
                  style={{
                    marginBottom: 14,
                    padding: "14px 16px",
                    background: "hsl(var(--background))",
                    borderRadius: 10,
                    border: "1px solid hsl(var(--border))",
                  }}
                >
                  <div
                    style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}
                  >
                    🔥 Warm Up
                  </div>
                  <textarea
                    style={{
                      ...inp,
                      minHeight: 80,
                      resize: "vertical",
                      fontFamily: "monospace",
                      fontSize: 12,
                    }}
                    placeholder={
                      "e.g. 3 ROUNDS\n0:30 Row\n10 Air Squats\n10 Push-ups"
                    }
                    value={form.warmup}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, warmup: e.target.value }))
                    }
                  />
                </div>

                {/* Workout */}
                <div
                  style={{
                    marginBottom: 14,
                    padding: "14px 16px",
                    background: "hsl(var(--background))",
                    borderRadius: 10,
                    border: "1px solid hsl(var(--border))",
                  }}
                >
                  <div
                    style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}
                  >
                    ⚡ Workout
                  </div>

                  {/* Exercise rows */}
                  {(form.exercises || []).map((ex: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 8,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        style={{ ...inp, flex: 2, minWidth: 140 }}
                        placeholder="Exercise name"
                        value={ex.name}
                        onChange={(e) => {
                          const updated = [...(form.exercises || [])];
                          updated[i] = { ...updated[i], name: e.target.value };
                          setForm((p) => ({ ...p, exercises: updated }));
                        }}
                      />
                      <input
                        style={{ ...inp, flex: 1, minWidth: 80 }}
                        placeholder="e.g. 3x10"
                        value={ex.sets}
                        onChange={(e) => {
                          const updated = [...(form.exercises || [])];
                          updated[i] = { ...updated[i], sets: e.target.value };
                          setForm((p) => ({ ...p, exercises: updated }));
                        }}
                      />
                      <input
                        style={{ ...inp, flex: 1, minWidth: 70 }}
                        placeholder="Value"
                        value={ex.value ?? ""}
                        onChange={(e) => {
                          const updated = [...(form.exercises || [])];
                          updated[i] = { ...updated[i], value: e.target.value };
                          setForm((p) => ({ ...p, exercises: updated }));
                        }}
                      />
                      <select
                        style={{ ...inp, flex: 1, minWidth: 90 }}
                        value={ex.measure ?? "kg"}
                        onChange={(e) => {
                          const updated = [...(form.exercises || [])];
                          updated[i] = {
                            ...updated[i],
                            measure: e.target.value,
                          };
                          setForm((p) => ({ ...p, exercises: updated }));
                        }}
                      >
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                        <option value="reps">reps</option>
                        <option value="time">time</option>
                        <option value="distance">distance</option>
                        <option value="calories">calories</option>
                        <option value="rounds">rounds</option>
                        <option value="%">% of 1RM</option>
                        <option value="bodyweight">bodyweight</option>
                      </select>
                      <button
                        onClick={() => {
                          const updated = (form.exercises || []).filter(
                            (_: any, j: number) => j !== i,
                          );
                          setForm((p) => ({ ...p, exercises: updated }));
                        }}
                        style={{
                          background: "hsl(0 84% 51% / 0.1)",
                          border: "1px solid hsl(0 84% 51% / 0.3)",
                          color: "hsl(0 84% 51%)",
                          borderRadius: 8,
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: 13,
                          fontFamily: "var(--font-body)",
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        exercises: [
                          ...(p.exercises || []),
                          { name: "", sets: "", value: "", measure: "kg" },
                        ],
                      }))
                    }
                    style={{
                      marginTop: 4,
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "1px dashed hsl(20 100% 50% / 0.4)",
                      background: "hsl(20 100% 50% / 0.06)",
                      color: "hsl(20 100% 50%)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    + Add Exercise
                  </button>

                  {/* WOD notes */}
                  <div style={{ marginTop: 14 }}>
                    <label style={lbl}>Additional WOD Notes</label>
                    <textarea
                      style={{
                        ...inp,
                        minHeight: 80,
                        resize: "vertical",
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                      placeholder={
                        "e.g. Comp: 80/55kg\nScaled: 60/40kg\nBeg: 40/30kg"
                      }
                      value={form.wod}
                      onChange={f("wod")}
                    />
                  </div>
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn variant="primary" onClick={save}>
                {isDuplicate
                  ? "Save as New Class"
                  : editing
                    ? "Save Changes"
                    : "Add Class"}
              </Btn>
              <Btn
                variant="subtle"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setIsDuplicate(false);
                }}
              >
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar View */}
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
                              flexWrap: "wrap",
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
                            {cls.chargeNonMembers && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 8px",
                                  borderRadius: 20,
                                  background: "hsl(38 92% 44% / 0.15)",
                                  color: "hsl(38 92% 44%)",
                                  fontWeight: 700,
                                  border: "1px solid hsl(38 92% 44% / 0.3)",
                                }}
                              >
                                💳 R{Number(cls.price).toFixed(0)} non-members
                              </span>
                            )}
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
                        <ClassActions cls={cls} bookings={bookings} />
                      </div>

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

      {/* List View */}
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
                      flexWrap: "wrap",
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
                    {cls.chargeNonMembers && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: "hsl(38 92% 44% / 0.15)",
                          color: "hsl(38 92% 44%)",
                          fontWeight: 700,
                          border: "1px solid hsl(38 92% 44% / 0.3)",
                        }}
                      >
                        💳 R{Number(cls.price).toFixed(0)}
                      </span>
                    )}
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
                <ClassActions cls={cls} />
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

// ── Social Media Manager ──────────────────────────────────────────────────────
function SocialMediaManager({ toast }: any) {
  const [socialsTab, setSocialsTab] = useState<"platforms" | "photos">(
    "platforms",
  );

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
        Social Media Platforms
      </div>
      <div
        style={{
          fontSize: 12,
          color: "hsl(var(--muted-foreground))",
          marginBottom: 20,
        }}
      >
        Manage your social platform links and photo highlights
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: 4,
          borderRadius: 10,
          background: "hsl(var(--secondary))",
          width: "fit-content",
          marginBottom: 24,
        }}
      >
        {[
          { id: "platforms" as const, label: "🔗 Platform Links" },
          { id: "photos" as const, label: "🖼 Photo Highlights" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSocialsTab(t.id)}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 12,
              background:
                socialsTab === t.id ? "hsl(20 100% 50%)" : "transparent",
              color:
                socialsTab === t.id ? "#000" : "hsl(var(--muted-foreground))",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {socialsTab === "platforms" && <PlatformsConfig toast={toast} />}
      {socialsTab === "photos" && <PhotosManager toast={toast} />}
    </div>
  );
}

// ── Platform Links Config ─────────────────────────────────────────────────────
function PlatformsConfig({ toast }: any) {
  const [form, setForm] = useState({
    instagramHandle: "",
    facebookUrl: "",
    tiktokUrl: "",
    facebookEmbedEnabled: false,
    tiktokEmbedEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get(ref(db, "admin_socials")).then((snap) => {
      if (snap.exists()) setForm((p) => ({ ...p, ...snap.val() }));
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await set(ref(db, "admin_socials"), form);
      toast("Social platforms updated ✓", "success");
    } catch {
      toast("Save failed", "error");
    }
    setSaving(false);
  };

  if (loading)
    return (
      <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
        Loading…
      </div>
    );

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Instagram */}
      <div
        style={{
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 12,
          borderLeft: "3px solid hsl(20 100% 50%)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
          📸 Instagram
        </div>
        <label style={lbl}>Instagram Handle (without @)</label>
        <input
          style={inp}
          placeholder="mk2riversfitness"
          value={form.instagramHandle}
          onChange={(e) =>
            setForm((p) => ({ ...p, instagramHandle: e.target.value }))
          }
        />
        <div
          style={{
            fontSize: 11,
            color: "hsl(var(--muted-foreground))",
            marginTop: 6,
          }}
        >
          Feed is powered by Elfsight. The handle here controls the profile link
          shown to members.
        </div>
      </div>

      {/* Facebook */}
      <div
        style={{
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 12,
          borderLeft: "3px solid hsl(217 91% 53%)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
          👥 Facebook
        </div>
        <label style={lbl}>Facebook Page URL</label>
        <input
          style={{ ...inp, marginBottom: 12 }}
          placeholder="https://facebook.com/mk2riversfitness"
          value={form.facebookUrl}
          onChange={(e) =>
            setForm((p) => ({ ...p, facebookUrl: e.target.value }))
          }
        />
        <label style={lbl}>Show embedded feed?</label>
        <select
          style={inp}
          value={form.facebookEmbedEnabled ? "true" : "false"}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              facebookEmbedEnabled: e.target.value === "true",
            }))
          }
        >
          <option value="false">No — show link button only</option>
          <option value="true">Yes — embed Facebook feed</option>
        </select>
        <div
          style={{
            fontSize: 11,
            color: "hsl(var(--muted-foreground))",
            marginTop: 6,
          }}
        >
          Leave URL empty to hide Facebook tab from members entirely.
        </div>
      </div>

      {/* TikTok */}
      <div
        style={{
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 24,
          borderLeft: "3px solid hsl(var(--border))",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
          🎵 TikTok
        </div>
        <label style={lbl}>TikTok Profile URL</label>
        <input
          style={{ ...inp, marginBottom: 12 }}
          placeholder="https://tiktok.com/@mk2rivers"
          value={form.tiktokUrl}
          onChange={(e) =>
            setForm((p) => ({ ...p, tiktokUrl: e.target.value }))
          }
        />
        <label style={lbl}>Show embedded feed?</label>
        <select
          style={inp}
          value={form.tiktokEmbedEnabled ? "true" : "false"}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              tiktokEmbedEnabled: e.target.value === "true",
            }))
          }
        >
          <option value="false">No — show link button only</option>
          <option value="true">Yes — embed TikTok creator feed</option>
        </select>
        <div
          style={{
            fontSize: 11,
            color: "hsl(var(--muted-foreground))",
            marginTop: 6,
          }}
        >
          Leave URL empty to hide TikTok tab from members entirely.
        </div>
      </div>

      <Btn variant="primary" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Platform Settings"}
      </Btn>
    </div>
  );
}

// ── Photo Highlights Manager ──────────────────────────────────────────────────
const GAL_CATS = [
  "Classes",
  "Facilities",
  "Members",
  "Events",
  "Transformation",
];

function PhotosManager({ toast }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blank = { label: "", category: "Classes", desc: "", imageUrl: "" };
  const [form, setForm] = useState(blank);
  const f = (k: string) => (e: any) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "admin_gallery"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([id, val]: [string, any]) => ({ id, ...val }),
        );
        setItems(list.reverse());
      } else {
        setItems([]);
      }
    } catch {
      toast("Failed to load", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please select an image file", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Image must be under 5MB", "error");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const storage = getStorage();
      const fileName = `gallery/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const sRef = storageRef(storage, fileName);
      const uploadTask = uploadBytesResumable(sRef, file);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          setUploadProgress(
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          );
        },
        () => {
          toast("Upload failed — try again", "error");
          setUploading(false);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setForm((p) => ({ ...p, imageUrl: url }));
          toast("Image uploaded ✓", "success");
          setUploading(false);
          setUploadProgress(0);
        },
      );
    } catch {
      toast("Upload error", "error");
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.label) return toast("Enter a label", "error");
    if (!form.imageUrl) return toast("Upload an image first", "error");
    try {
      await push(ref(db, "admin_gallery"), { ...form, createdAt: Date.now() });
      toast("Photo added ✓", "success");
      setShowForm(false);
      setForm(blank);
      load();
    } catch {
      toast("Save failed", "error");
    }
  };

  const del = async (item: any) => {
    if (!confirm(`Delete "${item.label}"?`)) return;
    try {
      await remove(ref(db, `admin_gallery/${item.id}`));
      if (item.imageUrl?.includes("firebasestorage")) {
        try {
          const storage = getStorage();
          const fileRef = storageRef(storage, item.imageUrl);
          await deleteObject(fileRef);
        } catch {
          /* non-critical */
        }
      }
      toast("Deleted", "info");
      load();
    } catch {
      toast("Delete failed", "error");
    }
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
        <div style={{ fontWeight: 700, fontSize: 14 }}>
          Photo Highlights ({items.length})
        </div>
        <Btn
          variant="primary"
          size="sm"
          onClick={() => {
            setShowForm(!showForm);
            setForm(blank);
          }}
        >
          {showForm ? "✕ Cancel" : "+ Add Photo"}
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
              New Photo
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Photo</label>
              {form.imageUrl ? (
                <div style={{ position: "relative", width: "fit-content" }}>
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    style={{
                      width: 180,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 8,
                      display: "block",
                    }}
                  />
                  <button
                    onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: 22,
                      height: 22,
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 8,
                      border: "1px dashed hsl(var(--border))",
                      background: "hsl(var(--card))",
                      cursor: uploading ? "not-allowed" : "pointer",
                      fontSize: 13,
                      color: "hsl(var(--muted-foreground))",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {uploading
                      ? `Uploading… ${uploadProgress}%`
                      : "📁 Choose image (max 5MB)"}
                  </button>
                  {uploading && (
                    <div
                      style={{
                        marginTop: 8,
                        height: 4,
                        background: "hsl(var(--border))",
                        borderRadius: 2,
                        overflow: "hidden",
                        width: 200,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${uploadProgress}%`,
                          background: "hsl(20 100% 50%)",
                          borderRadius: 2,
                          transition: "width 0.2s",
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
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
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Description (optional)</label>
              <textarea
                style={{ ...inp, minHeight: 60, resize: "vertical" }}
                placeholder="Describe this photo…"
                value={form.desc}
                onChange={f("desc")}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn
                variant="primary"
                onClick={save}
                disabled={uploading || !form.imageUrl}
              >
                Add Photo
              </Btn>
              <Btn variant="subtle" onClick={() => setShowForm(false)}>
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
          No photos yet. Add your first one above.
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
                  height: 120,
                  overflow: "hidden",
                  background: "hsl(var(--background))",
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.label}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
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
                    marginBottom: 8,
                  }}
                >
                  {item.category}
                  {item.desc && ` · ${item.desc}`}
                </div>
                <Btn variant="danger" size="sm" onClick={() => del(item)}>
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

// ── News Manager ──────────────────────────────────────────────────────────────
function NewsManager({ toast }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blank = {
    title: "",
    type: "News",
    date: "",
    desc: "",
    registrationLink: "",
    registrationCutoff: "",
    paymentLink: "",
    imageUrl: "",
  };
  const [form, setForm] = useState(blank);
  const f = (k: string) => (e: any) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const isEvent = form.type === "Event";

  const load = async () => {
    setLoading(true);
    setItems(await fetchCollection("admin_news"));
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please select an image file", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Image must be under 5MB", "error");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const storage = getStorage();
      const fileName = `news/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const sRef = storageRef(storage, fileName);
      const uploadTask = uploadBytesResumable(sRef, file);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          setUploadProgress(
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          );
        },
        () => {
          toast("Upload failed", "error");
          setUploading(false);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setForm((p) => ({ ...p, imageUrl: url }));
          toast("Image uploaded ✓", "success");
          setUploading(false);
          setUploadProgress(0);
        },
      );
    } catch {
      toast("Upload error", "error");
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title || !form.date)
      return toast("Fill in Title and Date", "error");
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
        <Btn
          variant="primary"
          size="sm"
          onClick={() => {
            setShowForm(!showForm);
            setForm(blank);
          }}
        >
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
                <label style={lbl}>Title *</label>
                <input
                  style={inp}
                  placeholder="e.g. 30-Day Challenge"
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
                <label style={lbl}>Date *</label>
                <input
                  style={inp}
                  type="date"
                  value={form.date}
                  onChange={f("date")}
                />
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
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Image (optional)</label>
              {form.imageUrl ? (
                <div style={{ position: "relative", width: "fit-content" }}>
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    style={{
                      width: 220,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 8,
                      display: "block",
                    }}
                  />
                  <button
                    onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: 22,
                      height: 22,
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 8,
                      border: "1px dashed hsl(var(--border))",
                      background: "hsl(var(--card))",
                      cursor: uploading ? "not-allowed" : "pointer",
                      fontSize: 13,
                      color: "hsl(var(--muted-foreground))",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {uploading
                      ? `Uploading… ${uploadProgress}%`
                      : "📁 Upload image (max 5MB)"}
                  </button>
                  {uploading && (
                    <div
                      style={{
                        marginTop: 8,
                        height: 4,
                        background: "hsl(var(--border))",
                        borderRadius: 2,
                        overflow: "hidden",
                        width: 200,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${uploadProgress}%`,
                          background: "hsl(20 100% 50%)",
                          borderRadius: 2,
                          transition: "width 0.2s",
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            {isEvent && (
              <div
                style={{
                  marginBottom: 14,
                  padding: "14px 16px",
                  background: "hsl(var(--background))",
                  borderRadius: 10,
                  border: "1px solid hsl(20 100% 50% / 0.3)",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 12,
                    color: "hsl(20 100% 50%)",
                    marginBottom: 12,
                  }}
                >
                  🎟 Event Details
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <label style={lbl}>Registration Link</label>
                    <input
                      style={inp}
                      placeholder="https://forms.gle/..."
                      value={form.registrationLink}
                      onChange={f("registrationLink")}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Registration Cutoff</label>
                    <input
                      style={inp}
                      type="date"
                      value={form.registrationCutoff}
                      onChange={f("registrationCutoff")}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Payment Link</label>
                    <input
                      style={inp}
                      placeholder="https://payfast.io/..."
                      value={form.paymentLink}
                      onChange={f("paymentLink")}
                    />
                  </div>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={save} disabled={uploading}>
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
              <div
                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    style={{
                      width: 56,
                      height: 40,
                      objectFit: "cover",
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 14 }}>
                      {item.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background:
                          item.type === "Event"
                            ? "hsl(20 100% 50% / 0.15)"
                            : "hsl(var(--secondary))",
                        color:
                          item.type === "Event"
                            ? "hsl(20 100% 50%)"
                            : "hsl(var(--muted-foreground))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    >
                      {item.type}
                    </span>
                    {item.registrationLink && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: "hsl(142 72% 37% / 0.12)",
                          color: "hsl(142 72% 37%)",
                        }}
                      >
                        🎟 Registration
                      </span>
                    )}
                    {item.paymentLink && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: "hsl(217 91% 53% / 0.12)",
                          color: "hsl(217 91% 53%)",
                        }}
                      >
                        💳 Payment
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "hsl(var(--muted-foreground))",
                      marginTop: 3,
                    }}
                  >
                    {item.date}
                    {item.registrationCutoff &&
                      ` · Cutoff: ${item.registrationCutoff}`}
                  </div>
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
        {/* FIX: label updated to "App Users" */}
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          👥 App Users ({members.length})
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
                    <option value="silver">Silver (R288/mo)</option>
                    <option value="gold">Gold (R588/mo)</option>
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

// ── Packages Manager ──────────────────────────────────────────────────────────
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
          Assign credits when a member pays cash or EFT.
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

// ── Manual Check-In Manager ───────────────────────────────────────────────────
// FIX: All state and logic moved inside the component
function ManualCheckInManager({ toast }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUid, setSelectedUid] = useState("");
  const [pointsBonus, setPointsBonus] = useState<string>("10");
  const [adjustingPoints, setAdjustingPoints] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);

  const today = new Date().toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const selectedMember = members.find((m) => m.uid === selectedUid) ?? null;
  const alreadyCheckedIn =
    selectedMember?.checkIns?.some((ci: any) => {
      const dateStr = typeof ci === "object" && ci.date ? ci.date : null;
      return dateStr === today;
    }) ?? false;

  const loadMembers = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "mk2_users"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([uid, val]: [string, any]) => ({
            uid,
            name: val.name || "Unnamed",
            email: val.email || "",
            points: val.points ?? 0,
            checkIns: val.checkIns ?? [],
            classCredits: val.classCredits ?? 0,
          }),
        );
        setMembers(list.sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch {
      toast("Failed to load members", "error");
    }
    setLoading(false);
  };

  const loadRecentCheckIns = async () => {
    try {
      const snap = await get(ref(db, "mk2_users"));
      if (!snap.exists()) return;
      const list: any[] = [];
      Object.entries(snap.val()).forEach(([uid, val]: [string, any]) => {
        const checkIns = Array.isArray(val.checkIns) ? val.checkIns : [];
        const todayCheckIn = checkIns.find((ci: any) => ci?.date === today);
        if (todayCheckIn) {
          list.push({
            uid,
            name: val.name || "Unnamed",
            time: todayCheckIn.time || "—",
          });
        }
      });
      setRecentCheckIns(list.sort((a, b) => a.time.localeCompare(b.time)));
    } catch {
      /* non-critical */
    }
  };

  useEffect(() => {
    loadMembers();
    loadRecentCheckIns();
  }, []);

  const handleManualCheckIn = async () => {
    if (!selectedUid) return toast("Select a member first", "error");
    if (alreadyCheckedIn)
      return toast(`${selectedMember?.name} already checked in today`, "error");

    setSubmitting(true);
    try {
      const memberSnap = await get(ref(db, `mk2_users/${selectedUid}`));
      if (!memberSnap.exists()) throw new Error("Member not found");
      const val = memberSnap.val();

      const checkIns = Array.isArray(val.checkIns) ? val.checkIns : [];
      const time = new Date().toLocaleTimeString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const newCheckIns = [...checkIns, { date: today, time }];
      const bonus = parseInt(pointsBonus) || 10;
      const newPoints = (val.points ?? 0) + bonus;

      const newTotal = newCheckIns.length;
      const newMilestones = Math.floor(newTotal / 40);
      const oldMilestones = Math.floor(checkIns.length / 40);
      const milestoneReached = newMilestones > oldMilestones;

      await set(ref(db, `mk2_users/${selectedUid}/checkIns`), newCheckIns);
      await set(ref(db, `mk2_users/${selectedUid}/points`), newPoints);

      if (milestoneReached) {
        const code = `MK2R-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        const earnedAt = Date.now();
        const expiresAt = earnedAt + 60 * 24 * 60 * 60 * 1000;
        await push(ref(db, `mk2_users/${selectedUid}/rewards`), {
          status: "pending",
          earnedAt,
          expiresAt,
          redemptionCode: code,
          checkInMilestone: newMilestones * 40,
          type: null,
        });
        toast(
          `✓ ${selectedMember?.name} checked in! 🎉 Milestone reached — reward created`,
          "success",
        );
      } else {
        toast(
          `✓ ${selectedMember?.name} checked in at ${time} (+${bonus} pts)`,
          "success",
        );
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.uid === selectedUid
            ? { ...m, checkIns: newCheckIns, points: newPoints }
            : m,
        ),
      );
      setSelectedUid("");
      setPointsBonus("10");
      loadRecentCheckIns();
    } catch {
      toast("Check-in failed — try again", "error");
    }
    setSubmitting(false);
  };

  const handleAdjustPoints = async () => {
    if (!selectedUid || !selectedMember) return;
    const delta = parseInt(pointsBonus);
    if (isNaN(delta)) return toast("Enter a valid points value", "error");

    setAdjustingPoints(true);
    try {
      const newPoints = selectedMember.points + delta;
      await set(ref(db, `mk2_users/${selectedUid}/points`), newPoints);
      setMembers((prev) =>
        prev.map((m) =>
          m.uid === selectedUid ? { ...m, points: newPoints } : m,
        ),
      );
      toast(
        `✓ ${selectedMember.name}: ${delta > 0 ? "+" : ""}${delta} pts → ${newPoints} total`,
        "success",
      );
      setPointsBonus("10");
      setSelectedUid("");
    } catch {
      toast("Points update failed", "error");
    }
    setAdjustingPoints(false);
  };

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
        Manual Check-In
      </div>
      <div
        style={{
          fontSize: 12,
          color: "hsl(var(--muted-foreground))",
          marginBottom: 20,
        }}
      >
        Override for when members forget to check in via app.
      </div>

      <div
        style={{
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ gridColumn: "1/-1" }}>
            <label style={lbl}>Select Member</label>
            {loading ? (
              <div
                style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}
              >
                Loading…
              </div>
            ) : (
              <select
                style={inp}
                value={selectedUid}
                onChange={(e) => setSelectedUid(e.target.value)}
              >
                <option value="">— Choose member —</option>
                {members.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label style={lbl}>Points Bonus / Adjustment</label>
            <input
              style={inp}
              type="number"
              value={pointsBonus}
              onChange={(e) => setPointsBonus(e.target.value)}
              placeholder="10"
            />
          </div>
        </div>

        {selectedMember && (
          <div
            style={{
              fontSize: 12,
              color: "hsl(var(--muted-foreground))",
              marginBottom: 14,
              padding: "8px 12px",
              background: "hsl(var(--background))",
              borderRadius: 8,
            }}
          >
            <strong style={{ color: "hsl(var(--foreground))" }}>
              {selectedMember.name}
            </strong>{" "}
            — {selectedMember.checkIns.length} check-ins total ·{" "}
            {selectedMember.points} pts
            {alreadyCheckedIn && (
              <span style={{ color: "hsl(38 92% 44%)", marginLeft: 8 }}>
                ⚠ Already checked in today
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn
            variant="primary"
            onClick={handleManualCheckIn}
            disabled={submitting || !selectedUid || alreadyCheckedIn}
          >
            {submitting ? "Checking in…" : "✓ Check In"}
          </Btn>
          <Btn
            variant="subtle"
            onClick={handleAdjustPoints}
            disabled={adjustingPoints || !selectedUid}
          >
            {adjustingPoints ? "Updating…" : "± Adjust Points"}
          </Btn>
          <Btn
            variant="subtle"
            size="sm"
            onClick={() => {
              loadMembers();
              loadRecentCheckIns();
            }}
          >
            ↻ Refresh
          </Btn>
        </div>
      </div>

      {recentCheckIns.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
            Today's Check-Ins ({recentCheckIns.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentCheckIns.map((ci) => (
              <div
                key={ci.uid}
                style={{
                  background: "hsl(var(--secondary))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  padding: "8px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 13 }}>{ci.name}</span>
                <span
                  style={{
                    fontSize: 12,
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  {ci.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
  const [reviewUrl, setReviewUrl] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);

  const TYPES = [
    "all",
    "Feature suggestion",
    "Bug / issue report",
    "App improvement",
    "General comment",
  ];

  useEffect(() => {
    get(ref(db, "admin_config/googleReviewUrl")).then((snap) => {
      if (snap.exists()) setReviewUrl(snap.val());
    });
  }, []);

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

  const saveReviewUrl = async () => {
    setSavingUrl(true);
    try {
      await set(ref(db, "admin_config/googleReviewUrl"), reviewUrl);
      toast("Google Review URL saved ✓", "success");
    } catch {
      toast("Failed to save URL", "error");
    }
    setSavingUrl(false);
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
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 20,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
          ⭐ Google Review Link
        </div>
        <div
          style={{
            fontSize: 12,
            color: "hsl(var(--muted-foreground))",
            marginBottom: 10,
          }}
        >
          This link appears on the Contact & Feedback page for members to leave
          a review.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              fontSize: 13,
              outline: "none",
            }}
            placeholder="https://g.page/r/your-review-link"
            value={reviewUrl}
            onChange={(e) => setReviewUrl(e.target.value)}
          />
          <Btn
            variant="primary"
            size="sm"
            onClick={saveReviewUrl}
            disabled={savingUrl}
          >
            {savingUrl ? "Saving…" : "Save"}
          </Btn>
        </div>
      </div>

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

// ── Community Manager ─────────────────────────────────────────────────────────
function CommunityManager({ toast }: any) {
  const [rooms, setRooms] = useState<string[]>([]);
  const [newRoom, setNewRoom] = useState("");
  const [newRoomDesc, setNewRoomDesc] = useState("");
  const [savingRoom, setSavingRoom] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollHours, setPollHours] = useState(24);
  const [sendingPoll, setSendingPoll] = useState(false);

  useEffect(() => {
    get(ref(db, "community_rooms")).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setRooms(Object.values(data).map((r: any) => r.name));
      } else {
        setRooms([
          "💬 MK2R General",
          "🏆 MK2R Competitive Group",
          "🔥 MK2R Hyrox",
          "💼 MK2R Business Hub",
        ]);
      }
    });
  }, []);

  const addRoom = async () => {
    const trimmed = newRoom.trim();
    if (!trimmed) return toast("Enter a room name", "error");
    if (rooms.includes(trimmed)) return toast("Room already exists", "error");
    setSavingRoom(true);
    try {
      const updated = [...rooms, trimmed];
      const roomsObj = updated.reduce((acc: any, name, i) => {
        acc[`room_${i}`] = {
          name,
          desc: i === rooms.length ? newRoomDesc : "",
        };
        return acc;
      }, {});
      await set(ref(db, "community_rooms"), roomsObj);
      setRooms(updated);
      setNewRoom("");
      setNewRoomDesc("");
      toast(`Room "${trimmed}" created ✓`, "success");
    } catch {
      toast("Failed to create room", "error");
    }
    setSavingRoom(false);
  };

  const deleteRoom = async (roomName: string) => {
    if (!confirm(`Delete "${roomName}"? All messages will be lost.`)) return;
    try {
      const updated = rooms.filter((r) => r !== roomName);
      const roomsObj = updated.reduce((acc: any, name, i) => {
        acc[`room_${i}`] = { name, desc: "" };
        return acc;
      }, {});
      await set(ref(db, "community_rooms"), roomsObj);
      await remove(ref(db, `rooms/${roomName}`));
      setRooms(updated);
      toast("Room deleted", "info");
    } catch {
      toast("Delete failed", "error");
    }
  };

  const sendPoll = async () => {
    if (!selectedRoom) return toast("Select a room", "error");
    if (!pollQuestion.trim()) return toast("Enter a question", "error");
    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2)
      return toast("At least 2 options required", "error");
    if (pollHours <= 0) return toast("Set a duration", "error");
    setSendingPoll(true);
    try {
      await push(ref(db, `rooms/${selectedRoom}/polls`), {
        type: "poll",
        question: pollQuestion,
        options: cleanOptions,
        votes: {},
        uid: "admin",
        user: "MK2 Admin",
        createdAt: Date.now(),
        expiresAt: Date.now() + pollHours * 3600000,
      });
      toast(`Poll sent to "${selectedRoom}" ✓`, "success");
      setPollQuestion("");
      setPollOptions(["", ""]);
      setPollHours(24);
      setSelectedRoom("");
    } catch {
      toast("Failed to send poll", "error");
    }
    setSendingPoll(false);
  };

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
        Community Chat
      </div>
      <div
        style={{
          fontSize: 12,
          color: "hsl(var(--muted-foreground))",
          marginBottom: 20,
        }}
      >
        Manage chat rooms and create polls for members.
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
        Chat Rooms ({rooms.length})
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {rooms.map((roomName) => (
          <div
            key={roomName}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13 }}>{roomName}</span>
            <Btn
              variant="danger"
              size="sm"
              onClick={() => deleteRoom(roomName)}
            >
              Delete
            </Btn>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 28,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
          + New Chat Room
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label style={lbl}>Room Name *</label>
            <input
              style={inp}
              placeholder="e.g. 🧘 MK2R Yoga"
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRoom()}
            />
          </div>
          <div>
            <label style={lbl}>Description</label>
            <input
              style={inp}
              placeholder="Short description…"
              value={newRoomDesc}
              onChange={(e) => setNewRoomDesc(e.target.value)}
            />
          </div>
        </div>
        <Btn
          variant="primary"
          size="sm"
          onClick={addRoom}
          disabled={savingRoom}
        >
          {savingRoom ? "Creating…" : "Create Room"}
        </Btn>
      </div>

      <div
        style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: 24 }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
          📊 Create Poll
        </div>
        <div
          style={{
            fontSize: 12,
            color: "hsl(var(--muted-foreground))",
            marginBottom: 16,
          }}
        >
          Send a poll to any chat room. Only admins can create polls.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label style={lbl}>Room *</label>
            <select
              style={inp}
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              <option value="">— Select room —</option>
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Duration (hours) *</label>
            <select
              style={inp}
              value={pollHours}
              onChange={(e) => setPollHours(Number(e.target.value))}
            >
              {[1, 2, 4, 6, 12, 24, 48, 72].map((h) => (
                <option key={h} value={h}>
                  {h}h
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={lbl}>Question *</label>
            <input
              style={inp}
              placeholder="What do you want to ask members?"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Options *</label>
          {pollOptions.map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                style={{ ...inp, flex: 1 }}
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const updated = [...pollOptions];
                  updated[i] = e.target.value;
                  setPollOptions(updated);
                }}
              />
              {pollOptions.length > 2 && (
                <button
                  onClick={() =>
                    setPollOptions(pollOptions.filter((_, j) => j !== i))
                  }
                  style={{
                    background: "hsl(0 84% 51% / 0.1)",
                    border: "1px solid hsl(0 84% 51% / 0.3)",
                    color: "hsl(0 84% 51%)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setPollOptions([...pollOptions, ""])}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px dashed hsl(20 100% 50% / 0.4)",
              background: "hsl(20 100% 50% / 0.06)",
              color: "hsl(20 100% 50%)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "var(--font-body)",
            }}
          >
            + Add Option
          </button>
        </div>
        <Btn variant="primary" onClick={sendPoll} disabled={sendingPoll}>
          {sendingPoll ? "Sending…" : "📊 Send Poll to Room"}
        </Btn>
      </div>
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

// ── Terms Manager ─────────────────────────────────────────────────────────────
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blank = {
    title: "",
    subtitle: "",
    emoji: "🔥",
    imageUrl: "",
    actionType: "url",
    actionValue: "",
    cta: "Learn More",
    size: "medium",
    status: "draft",
    activatesAt: "",
    periodMonths: "1",
    expiresAt: "",
  };
  const [form, setForm] = useState(blank);
  const f = (k: string) => (e: any) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (!form.activatesAt || !form.periodMonths) return;
    const start = new Date(form.activatesAt);
    start.setMonth(start.getMonth() + parseInt(form.periodMonths));
    setForm((p) => ({ ...p, expiresAt: start.toISOString().split("T")[0] }));
  }, [form.activatesAt, form.periodMonths]);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please select an image file", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Image must be under 5MB", "error");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const storage = getStorage();
      const fileName = `banners/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const sRef = storageRef(storage, fileName);
      const uploadTask = uploadBytesResumable(sRef, file);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          setUploadProgress(
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          );
        },
        () => {
          toast("Upload failed", "error");
          setUploading(false);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setForm((p) => ({ ...p, imageUrl: url }));
          toast("Image uploaded ✓", "success");
          setUploading(false);
          setUploadProgress(0);
        },
      );
    } catch {
      toast("Upload error", "error");
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title) return toast("Enter a title", "error");
    if (!form.activatesAt) return toast("Set an activation date", "error");
    if (!form.actionValue)
      return toast("Enter an action URL, WhatsApp number or email", "error");

    let url = form.actionValue;
    if (form.actionType === "whatsapp") {
      const digits = form.actionValue.replace(/\D/g, "");
      url = `https://wa.me/${digits}`;
    } else if (form.actionType === "email") {
      url = `mailto:${form.actionValue}`;
    }

    try {
      await push(ref(db, "ad_banners"), {
        title: form.title,
        subtitle: form.subtitle,
        emoji: form.emoji,
        imageUrl: form.imageUrl,
        url,
        cta: form.cta,
        size: form.size,
        status: form.status,
        activatesAt: new Date(form.activatesAt).getTime(),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : null,
        periodMonths: parseInt(form.periodMonths),
        active: form.status === "published",
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

  const toggleStatus = async (banner: any) => {
    const newActive = !banner.active;
    await set(ref(db, `ad_banners/${banner.id}/active`), newActive);
    await set(
      ref(db, `ad_banners/${banner.id}/status`),
      newActive ? "published" : "draft",
    );
    toast(newActive ? "Banner published ✓" : "Banner set to draft", "info");
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await remove(ref(db, `ad_banners/${id}`));
    toast("Deleted", "info");
    load();
  };

  const SIZE_LABELS: Record<string, string> = {
    small: "Small (notification strip)",
    medium: "Medium (card)",
    large: "Large (hero)",
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
        <Btn
          variant="primary"
          size="sm"
          onClick={() => {
            setShowForm(!showForm);
            setForm(blank);
          }}
        >
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

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Banner Image (optional)</label>
              {form.imageUrl ? (
                <div style={{ position: "relative", width: "fit-content" }}>
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    style={{
                      width: 220,
                      height: 100,
                      objectFit: "cover",
                      borderRadius: 8,
                      display: "block",
                    }}
                  />
                  <button
                    onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: 22,
                      height: 22,
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 8,
                      border: "1px dashed hsl(var(--border))",
                      background: "hsl(var(--card))",
                      cursor: uploading ? "not-allowed" : "pointer",
                      fontSize: 13,
                      color: "hsl(var(--muted-foreground))",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {uploading
                      ? `Uploading… ${uploadProgress}%`
                      : "📁 Upload image (max 5MB)"}
                  </button>
                  {uploading && (
                    <div
                      style={{
                        marginTop: 8,
                        height: 4,
                        background: "hsl(var(--border))",
                        borderRadius: 2,
                        overflow: "hidden",
                        width: 200,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${uploadProgress}%`,
                          background: "hsl(20 100% 50%)",
                          borderRadius: 2,
                          transition: "width 0.2s",
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Title *</label>
                <input
                  style={inp}
                  placeholder="e.g. Ruimsig Pharmacy"
                  value={form.title}
                  onChange={f("title")}
                />
              </div>
              <div>
                <label style={lbl}>Subtitle</label>
                <input
                  style={inp}
                  placeholder="Short tagline"
                  value={form.subtitle}
                  onChange={f("subtitle")}
                />
              </div>
              <div>
                <label style={lbl}>Emoji</label>
                <input
                  style={inp}
                  placeholder="🔥"
                  value={form.emoji}
                  onChange={f("emoji")}
                />
              </div>
              <div>
                <label style={lbl}>Button Text</label>
                <input
                  style={inp}
                  placeholder="Learn More"
                  value={form.cta}
                  onChange={f("cta")}
                />
              </div>
              <div>
                <label style={lbl}>Banner Size</label>
                <select style={inp} value={form.size} onChange={f("size")}>
                  <option value="small">Small — notification strip</option>
                  <option value="medium">Medium — card</option>
                  <option value="large">Large — hero</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select style={inp} value={form.status} onChange={f("status")}>
                  <option value="draft">✎ Draft</option>
                  <option value="published">● Published</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Activation Date *</label>
                <input
                  style={inp}
                  type="date"
                  value={form.activatesAt}
                  onChange={f("activatesAt")}
                />
              </div>
              <div>
                <label style={lbl}>Period</label>
                <select
                  style={inp}
                  value={form.periodMonths}
                  onChange={f("periodMonths")}
                >
                  {["1", "2", "3", "6", "12"].map((m) => (
                    <option key={m} value={m}>
                      {m} month{parseInt(m) > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Expiry Date (auto)</label>
                <input
                  style={{ ...inp, opacity: 0.7 }}
                  type="date"
                  value={form.expiresAt}
                  readOnly
                  placeholder="Set activation date + period"
                />
              </div>
            </div>

            <div
              style={{
                marginBottom: 14,
                padding: "14px 16px",
                background: "hsl(var(--background))",
                borderRadius: 10,
                border: "1px solid hsl(var(--border))",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>
                Action Button *
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 10,
                  flexWrap: "wrap",
                }}
              >
                {(["url", "whatsapp", "email"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setForm((p) => ({ ...p, actionType: t, actionValue: "" }))
                    }
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: `1px solid ${form.actionType === t ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
                      background:
                        form.actionType === t
                          ? "hsl(20 100% 50%)"
                          : "transparent",
                      color:
                        form.actionType === t
                          ? "#000"
                          : "hsl(var(--foreground))",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {t === "url"
                      ? "🔗 URL"
                      : t === "whatsapp"
                        ? "💬 WhatsApp"
                        : "✉ Email"}
                  </button>
                ))}
              </div>
              <input
                style={inp}
                placeholder={
                  form.actionType === "url"
                    ? "https://yourbusiness.co.za"
                    : form.actionType === "whatsapp"
                      ? "e.g. 27821234567"
                      : "e.g. info@yourbusiness.co.za"
                }
                value={form.actionValue}
                onChange={f("actionValue")}
              />
              <div
                style={{
                  fontSize: 11,
                  color: "hsl(var(--muted-foreground))",
                  marginTop: 6,
                }}
              >
                {form.actionType === "whatsapp"
                  ? "Enter number with country code (no +). e.g. 27821234567"
                  : form.actionType === "email"
                    ? "Members will open their mail app to contact you."
                    : "Full URL including https://"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={save} disabled={uploading}>
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
          {banners.map((b) => {
            const isPublished = b.active;
            const now = Date.now();
            const isExpired = b.expiresAt && now > b.expiresAt;
            const isPending = b.activatesAt && now < b.activatesAt;
            return (
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
                  borderLeft: `3px solid ${isPublished && !isExpired ? "hsl(142 72% 37%)" : "hsl(var(--border))"}`,
                  opacity: isExpired ? 0.6 : 1,
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
                      flexWrap: "wrap",
                    }}
                  >
                    {b.emoji} {b.title}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: isExpired
                          ? "hsl(0 84% 51% / 0.12)"
                          : isPublished
                            ? "hsl(142 72% 37% / 0.12)"
                            : "hsl(var(--secondary))",
                        color: isExpired
                          ? "hsl(0 84% 51%)"
                          : isPublished
                            ? "hsl(142 72% 37%)"
                            : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {isExpired
                        ? "⚠ Expired"
                        : isPublished
                          ? "● Published"
                          : "✎ Draft"}
                    </span>
                    {isPending && !isExpired && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: "hsl(38 92% 44% / 0.12)",
                          color: "hsl(38 92% 44%)",
                        }}
                      >
                        ⏳ Pending
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: "hsl(217 91% 53% / 0.12)",
                        color: "hsl(217 91% 53%)",
                      }}
                    >
                      {SIZE_LABELS[b.size] ?? b.size}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "hsl(var(--muted-foreground))",
                      marginTop: 3,
                    }}
                  >
                    {b.subtitle && `${b.subtitle} · `}
                    {b.activatesAt
                      ? `Starts ${new Date(b.activatesAt).toLocaleDateString("en-ZA")}`
                      : "No start date"}
                    {b.expiresAt
                      ? ` · Expires ${new Date(b.expiresAt).toLocaleDateString("en-ZA")}`
                      : " · No expiry"}
                    {b.periodMonths
                      ? ` · ${b.periodMonths} month${b.periodMonths > 1 ? "s" : ""}`
                      : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn
                    variant={isPublished ? "subtle" : "green"}
                    size="sm"
                    onClick={() => toggleStatus(b)}
                  >
                    {isPublished ? "Set Draft" : "Publish"}
                  </Btn>
                  <Btn variant="danger" size="sm" onClick={() => del(b.id)}>
                    Delete
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Challenges Manager ────────────────────────────────────────────────────────
const CHALLENGE_METRICS = [
  { value: "reps", label: "Reps" },
  { value: "kg", label: "Weight (kg)" },
  { value: "lbs", label: "Weight (lbs)" },
  { value: "time", label: "Time (mm:ss)" },
  { value: "distance_m", label: "Distance (m)" },
  { value: "distance_km", label: "Distance (km)" },
  { value: "calories", label: "Calories" },
  { value: "rounds", label: "Rounds + Reps" },
];

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
      await push(ref(db, "notifications"), {
        title: "New Challenge! 🏁",
        body: `${form.name} — ${form.description || "Check it out in the app!"}`,
        type: "challenge",
        createdAt: Date.now(),
        read: false,
        prize: form.prize,
      });
      toast("Challenge created ✓ — members notified", "success");
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
              <div>
                <label style={lbl}>Challenge Name *</label>
                <input
                  style={inp}
                  placeholder="e.g. 30-Day Squat Challenge"
                  value={form.name}
                  onChange={f("name")}
                />
              </div>
              <div>
                <label style={lbl}>Exercise</label>
                <input
                  style={inp}
                  placeholder="e.g. Back Squat"
                  value={form.exercise}
                  onChange={f("exercise")}
                />
              </div>
              <div>
                <label style={lbl}>Metric *</label>
                <select style={inp} value={form.metric} onChange={f("metric")}>
                  {CHALLENGE_METRICS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Prize</label>
                <input
                  style={inp}
                  placeholder="e.g. Free 1-month membership"
                  value={form.prize}
                  onChange={f("prize")}
                />
              </div>
              <div>
                <label style={lbl}>Start Date *</label>
                <input
                  style={inp}
                  type="date"
                  value={form.startDate}
                  onChange={f("startDate")}
                />
              </div>
              <div>
                <label style={lbl}>End Date *</label>
                <input
                  style={inp}
                  type="date"
                  value={form.endDate}
                  onChange={f("endDate")}
                />
              </div>
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
                <label style={lbl}>Colour</label>
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
            <div
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                marginBottom: 14,
                padding: "8px 12px",
                background: "hsl(142 72% 37% / 0.08)",
                borderRadius: 6,
                border: "1px solid hsl(142 72% 37% / 0.2)",
              }}
            >
              🔔 A notification will be sent to all members when this challenge
              is created.
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
          {challenges.map((c) => {
            const metricLabel =
              CHALLENGE_METRICS.find((m) => m.value === c.metric)?.label ??
              c.metric;
            return (
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
                    {c.startDate} → {c.endDate} · {metricLabel} · 🏆 {c.prize}
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
            );
          })}
        </div>
      )}
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
        in Firebase. Notifications are stored at{" "}
        <strong style={{ color: "hsl(217 91% 53%)" }}>notifications/</strong>.
      </div>
    </div>
  );
}

// ── Rewards Manager ───────────────────────────────────────────────────────────
const CHECKINS_REQUIRED = 40;
const EXPIRY_DAYS = 60;

function ProgressBar({ pct, ready }: { pct: number; ready: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: 6,
        background: "hsl(var(--border))",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(100, pct)}%`,
          height: "100%",
          background: ready ? "hsl(142 72% 37%)" : "hsl(20 100% 50%)",
          borderRadius: 4,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

function RewardsManager({ toast }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ready" | "progress">("all");
  const [search, setSearch] = useState("");
  const [redeemTarget, setRedeemTarget] = useState<any>(null);
  const [rewardType, setRewardType] = useState<"inbody" | "buddy">("inbody");
  const [redeemNote, setRedeemNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrLookupResult, setQrLookupResult] = useState<{
    uid: string;
    rewardId: string;
    memberName: string;
    rewardCode: string;
    rewardType: string | null;
    earnedAt: number;
    expiresAt: number;
  } | null>(null);
  const [qrLookupError, setQrLookupError] = useState<string | null>(null);
  const [qrConfirmType, setQrConfirmType] = useState<"inbody" | "buddy">(
    "inbody",
  );
  const [qrConfirming, setQrConfirming] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "mk2_users"));
      if (!snap.exists()) {
        setMembers([]);
        setLoading(false);
        return;
      }
      const list: any[] = [];
      Object.entries(snap.val()).forEach(([uid, val]: [string, any]) => {
        const totalCheckIns = Array.isArray(val.checkIns)
          ? val.checkIns.length
          : typeof val.checkIns === "number"
            ? val.checkIns
            : 0;
        const rewardsMap: Record<string, any> = val.rewards ?? {};
        const redemptions = Object.entries(rewardsMap)
          .filter(([, r]: [string, any]) => r.status === "redeemed")
          .map(([id, r]: [string, any]) => ({ id, ...r }))
          .sort((a, b) => b.redeemedAt - a.redeemedAt);
        const pendingRewards = Object.entries(rewardsMap)
          .filter(
            ([, r]: [string, any]) =>
              r.status === "pending" && Date.now() < r.expiresAt,
          )
          .map(([id, r]: [string, any]) => ({ id, ...r }));
        const lastRedeemedAt = redemptions[0]?.redeemedAt ?? 0;
        let cycleCheckIns = 0;
        if (Array.isArray(val.checkIns)) {
          cycleCheckIns = val.checkIns.filter((ci: any) => {
            const ts =
              typeof ci === "number"
                ? ci
                : typeof ci === "string"
                  ? new Date(ci).getTime()
                  : 0;
            return ts > lastRedeemedAt;
          }).length;
        } else {
          cycleCheckIns =
            lastRedeemedAt > 0
              ? totalCheckIns -
                Math.floor(totalCheckIns / CHECKINS_REQUIRED) *
                  CHECKINS_REQUIRED
              : totalCheckIns;
        }
        const rewardReady =
          cycleCheckIns >= CHECKINS_REQUIRED || pendingRewards.length > 0;
        const pct = Math.min(100, (cycleCheckIns / CHECKINS_REQUIRED) * 100);
        const expiresAt =
          pendingRewards[0]?.expiresAt ??
          (lastRedeemedAt > 0
            ? lastRedeemedAt + EXPIRY_DAYS * 24 * 60 * 60 * 1000
            : Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        list.push({
          uid,
          name: val.name || "Unnamed",
          email: val.email || "",
          totalCheckIns,
          cycleCheckIns,
          pct,
          rewardReady,
          expired:
            rewardReady &&
            pendingRewards.length === 0 &&
            Date.now() > expiresAt,
          expiresAt,
          redemptions,
          pendingRewards,
        });
      });
      list.sort((a, b) => {
        if (a.rewardReady !== b.rewardReady) return a.rewardReady ? -1 : 1;
        return b.pct - a.pct;
      });
      setMembers(list);
    } catch {
      toast("Failed to load", "error");
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const handleRedeem = async () => {
    if (!redeemTarget) return;
    const pendingReward = redeemTarget.pendingRewards?.[0];
    if (!pendingReward) return toast("No pending reward found", "error");
    setSubmitting(true);
    try {
      await set(
        ref(db, `mk2_users/${redeemTarget.uid}/rewards/${pendingReward.id}`),
        {
          ...pendingReward,
          status: "redeemed",
          type: rewardType,
          redeemedAt: Date.now(),
          redeemedBy: "Admin",
          note: redeemNote || "Redeemed at reception",
        },
      );
      toast(
        `✓ ${rewardType === "inbody" ? "InBody Assessment" : "Bring-a-Buddy"} redeemed for ${redeemTarget.name}`,
        "success",
      );
      setRedeemTarget(null);
      setRedeemNote("");
      load();
    } catch {
      toast("Redemption failed", "error");
    }
    setSubmitting(false);
  };

  const lookupCode = async (code: string) => {
    setQrLookupError(null);
    setQrLookupResult(null);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    try {
      const snap = await get(ref(db, "mk2_users"));
      if (!snap.exists()) {
        setQrLookupError("No members found.");
        return;
      }
      const allUsers = snap.val();
      for (const [uid, val] of Object.entries(allUsers) as [string, any][]) {
        const rewardsMap: Record<string, any> = val.rewards ?? {};
        for (const [rewardId, r] of Object.entries(rewardsMap)) {
          if ((r as any).redemptionCode?.toUpperCase() === trimmed) {
            if ((r as any).status === "redeemed") {
              setQrLookupError(
                `This code has already been redeemed by ${val.name || "this member"}.`,
              );
              return;
            }
            if ((r as any).status === "expired") {
              setQrLookupError(
                `This reward expired on ${new Date((r as any).expiresAt).toLocaleDateString("en-ZA")}.`,
              );
              return;
            }
            if (Date.now() > (r as any).expiresAt) {
              setQrLookupError(
                `This reward has expired (${new Date((r as any).expiresAt).toLocaleDateString("en-ZA")}).`,
              );
              return;
            }
            setQrLookupResult({
              uid,
              rewardId,
              memberName: val.name || "Unnamed",
              rewardCode: (r as any).redemptionCode,
              rewardType: (r as any).type,
              earnedAt: (r as any).earnedAt,
              expiresAt: (r as any).expiresAt,
            });
            if ((r as any).type) setQrConfirmType((r as any).type);
            return;
          }
        }
      }
      setQrLookupError("Code not found — check it was entered correctly.");
    } catch {
      setQrLookupError("Lookup failed — try again.");
    }
  };

  const confirmQrRedemption = async () => {
    if (!qrLookupResult) return;
    setQrConfirming(true);
    try {
      const snap = await get(
        ref(
          db,
          `mk2_users/${qrLookupResult.uid}/rewards/${qrLookupResult.rewardId}`,
        ),
      );
      if (!snap.exists()) throw new Error("Reward not found");
      await set(
        ref(
          db,
          `mk2_users/${qrLookupResult.uid}/rewards/${qrLookupResult.rewardId}`,
        ),
        {
          ...snap.val(),
          status: "redeemed",
          type: qrConfirmType,
          redeemedAt: Date.now(),
          redeemedBy: "Admin",
        },
      );
      toast(
        `✓ ${qrConfirmType === "inbody" ? "InBody Assessment" : "Bring-a-Buddy"} redeemed for ${qrLookupResult.memberName}`,
        "success",
      );
      setQrLookupResult(null);
      setManualCode("");
      setShowQRScanner(false);
      load();
    } catch {
      toast("Redemption failed — try again", "error");
    }
    setQrConfirming(false);
  };

  const readyCount = members.filter((m) => m.rewardReady && !m.expired).length;
  const filtered = members
    .filter((m) =>
      filter === "ready"
        ? m.rewardReady && !m.expired
        : filter === "progress"
          ? !m.rewardReady
          : true,
    )
    .filter(
      (m) =>
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            Rewards Management
          </div>
          <div
            style={{
              fontSize: 12,
              color: "hsl(var(--muted-foreground))",
              marginTop: 4,
            }}
          >
            {CHECKINS_REQUIRED} check-ins = 1 reward · Redeem within{" "}
            {EXPIRY_DAYS} days
          </div>
        </div>
        {readyCount > 0 && (
          <div
            style={{
              background: "hsl(142 72% 37% / 0.12)",
              border: "1px solid hsl(142 72% 37% / 0.3)",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              color: "hsl(142 72% 37%)",
            }}
          >
            🎁 {readyCount} member{readyCount !== 1 ? "s" : ""} ready to redeem
          </div>
        )}
      </div>

      {/* QR / Code Redemption Panel */}
      <div
        style={{
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 20,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          📷 Redeem by Code
        </div>
        <div
          style={{
            fontSize: 12,
            color: "hsl(var(--muted-foreground))",
            marginBottom: 14,
          }}
        >
          Scan the member's QR code or type their redemption code manually.
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <input
            style={{
              ...inp,
              flex: 1,
              minWidth: 200,
              fontFamily: "monospace",
              letterSpacing: "0.1em",
            }}
            placeholder="e.g. MK2R-XXXX-YYY"
            value={manualCode}
            onChange={(e) => {
              setManualCode(e.target.value.toUpperCase());
              setQrLookupError(null);
              setQrLookupResult(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && lookupCode(manualCode)}
          />
          <Btn
            variant="primary"
            size="sm"
            onClick={() => lookupCode(manualCode)}
            disabled={!manualCode.trim()}
          >
            Look Up →
          </Btn>
          <Btn
            variant="subtle"
            size="sm"
            onClick={() => {
              setShowQRScanner((v) => !v);
              setQrLookupError(null);
              setQrLookupResult(null);
              setManualCode("");
            }}
          >
            {showQRScanner ? "✕ Close Scanner" : "📷 Scan QR"}
          </Btn>
        </div>
        {showQRScanner && (
          <div
            style={{
              borderRadius: 10,
              overflow: "hidden",
              marginBottom: 12,
              border: "1px solid hsl(var(--border))",
            }}
          >
            <QRScanner
              onScan={(data) => {
                setShowQRScanner(false);
                setManualCode(data.toUpperCase());
                lookupCode(data);
              }}
            />
          </div>
        )}
        {qrLookupError && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "hsl(0 84% 51% / 0.08)",
              border: "1px solid hsl(0 84% 51% / 0.2)",
              color: "hsl(0 84% 51%)",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            ⚠ {qrLookupError}
          </div>
        )}
        {qrLookupResult && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(142 72% 37% / 0.4)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 2,
                color: "hsl(142 72% 37%)",
              }}
            >
              ✓ Valid reward found
            </div>
            <div
              style={{
                fontSize: 13,
                color: "hsl(var(--muted-foreground))",
                marginBottom: 14,
              }}
            >
              <strong style={{ color: "hsl(var(--foreground))" }}>
                {qrLookupResult.memberName}
              </strong>{" "}
              · Code:{" "}
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                {qrLookupResult.rewardCode}
              </span>
              <br />
              Earned{" "}
              {new Date(qrLookupResult.earnedAt).toLocaleDateString("en-ZA")} ·
              Expires{" "}
              {new Date(qrLookupResult.expiresAt).toLocaleDateString("en-ZA")}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "hsl(var(--muted-foreground))",
                marginBottom: 8,
              }}
            >
              {qrLookupResult.rewardType
                ? "Member chose:"
                : "Choose reward type:"}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(["inbody", "buddy"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setQrConfirmType(t)}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: `2px solid ${qrConfirmType === t ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
                    background:
                      qrConfirmType === t
                        ? "hsl(20 100% 50% / 0.08)"
                        : "transparent",
                    textAlign: "center",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 2 }}>
                    {t === "inbody" ? "📊" : "🤝"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color:
                        qrConfirmType === t
                          ? "hsl(20 100% 50%)"
                          : "hsl(var(--foreground))",
                    }}
                  >
                    {t === "inbody" ? "Free InBody" : "Bring-a-Buddy"}
                  </div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn
                variant="green"
                onClick={confirmQrRedemption}
                disabled={qrConfirming}
              >
                {qrConfirming ? "Confirming…" : "✓ Confirm Redemption"}
              </Btn>
              <Btn
                variant="subtle"
                size="sm"
                onClick={() => {
                  setQrLookupResult(null);
                  setManualCode("");
                }}
              >
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </div>

      <div
        style={{
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 20,
          fontSize: 12,
          color: "hsl(var(--muted-foreground))",
          lineHeight: 1.7,
        }}
      >
        <strong style={{ color: "hsl(var(--foreground))" }}>
          Reward Rules:{" "}
        </strong>
        Every {CHECKINS_REQUIRED} gym check‑ins earns a member one reward —
        either a{" "}
        <strong style={{ color: "hsl(20 100% 50%)" }}>
          Free InBody Assessment
        </strong>{" "}
        or a{" "}
        <strong style={{ color: "hsl(20 100% 50%)" }}>
          Bring‑a‑Buddy free session
        </strong>
        . Rewards must be redeemed within{" "}
        <strong style={{ color: "hsl(20 100% 50%)" }}>
          {EXPIRY_DAYS} days
        </strong>{" "}
        of earning. After redemption the cycle resets.
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {(["all", "ready", "progress"] as const).map((fv) => (
          <button
            key={fv}
            onClick={() => setFilter(fv)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              background:
                filter === fv ? "hsl(20 100% 50%)" : "hsl(var(--secondary))",
              color: filter === fv ? "#000" : "hsl(var(--foreground))",
              border: filter === fv ? "none" : "1px solid hsl(var(--border))",
            }}
          >
            {fv === "all"
              ? `All (${members.length})`
              : fv === "ready"
                ? `🎁 Ready (${readyCount})`
                : `⏳ In Progress (${members.length - readyCount})`}
          </button>
        ))}
        <input
          style={{ ...inp, width: 200, marginLeft: "auto" }}
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Btn variant="subtle" size="sm" onClick={load}>
          ↻ Refresh
        </Btn>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((m) => {
            const borderColor = m.rewardReady
              ? m.expired
                ? "hsl(0 84% 51%)"
                : "hsl(142 72% 37%)"
              : "hsl(var(--border))";
            return (
              <div
                key={m.uid}
                style={{
                  background: "hsl(var(--secondary))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  padding: "14px 16px",
                  borderLeft: `3px solid ${borderColor}`,
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
                      {m.name}
                      {m.rewardReady && !m.expired && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: "hsl(142 72% 37% / 0.15)",
                            color: "hsl(142 72% 37%)",
                          }}
                        >
                          🎁 Reward Ready
                        </span>
                      )}
                      {m.expired && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: "hsl(0 84% 51% / 0.15)",
                            color: "hsl(0 84% 51%)",
                          }}
                        >
                          ⚠ Reward Expired
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "hsl(var(--muted-foreground))",
                        marginTop: 2,
                      }}
                    >
                      {m.email} · {m.totalCheckIns} total check-ins
                    </div>
                  </div>
                  {m.rewardReady && !m.expired && (
                    <Btn
                      variant="green"
                      size="sm"
                      onClick={() => setRedeemTarget(m)}
                    >
                      ✓ Redeem Reward
                    </Btn>
                  )}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: "hsl(var(--muted-foreground))",
                      marginBottom: 4,
                    }}
                  >
                    <span>
                      {m.rewardReady
                        ? "Current cycle complete ✓"
                        : `${m.cycleCheckIns} / ${CHECKINS_REQUIRED} check-ins this cycle`}
                    </span>
                    <span style={{ fontWeight: 700 }}>
                      {Math.round(m.pct)}%
                    </span>
                  </div>
                  <ProgressBar pct={m.pct} ready={m.rewardReady} />
                </div>
                {m.rewardReady && !m.expired && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "hsl(38 92% 44%)",
                      marginTop: 6,
                    }}
                  >
                    ⏰ Reward expires{" "}
                    {new Date(m.expiresAt).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                )}
                {m.pendingRewards?.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "6px 10px",
                      background: "hsl(var(--background))",
                      borderRadius: 6,
                      fontSize: 11,
                      color: "hsl(var(--muted-foreground))",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>🔑 Code:</span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        color: "hsl(20 100% 50%)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {m.pendingRewards[0].redemptionCode}
                    </span>
                  </div>
                )}
                {m.redemptions.length > 0 && (
                  <details style={{ marginTop: 10 }}>
                    <summary
                      style={{
                        fontSize: 11,
                        color: "hsl(var(--muted-foreground))",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      {m.redemptions.length} previous redemption
                      {m.redemptions.length !== 1 ? "s" : ""}
                    </summary>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        marginTop: 8,
                      }}
                    >
                      {m.redemptions.slice(0, 5).map((r: any) => (
                        <div
                          key={r.id}
                          style={{
                            fontSize: 11,
                            color: "hsl(var(--muted-foreground))",
                            display: "flex",
                            gap: 8,
                            padding: "4px 8px",
                            background: "hsl(var(--background))",
                            borderRadius: 6,
                          }}
                        >
                          <span>{r.type === "inbody" ? "📊" : "🤝"}</span>
                          <span style={{ color: "hsl(var(--foreground))" }}>
                            {r.type === "inbody"
                              ? "Free InBody Assessment"
                              : "Bring-a-Buddy Session"}
                          </span>
                          <span style={{ marginLeft: "auto" }}>
                            {new Date(r.redeemedAt).toLocaleDateString(
                              "en-ZA",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Redeem modal */}
      {redeemTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setRedeemTarget(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 16,
              padding: 28,
              width: "100%",
              maxWidth: 440,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                color: "hsl(20 100% 50%)",
                marginBottom: 4,
              }}
            >
              Redeem Reward
            </div>
            <div
              style={{
                fontSize: 13,
                color: "hsl(var(--muted-foreground))",
                marginBottom: 20,
              }}
            >
              {redeemTarget.name} has earned a reward for {CHECKINS_REQUIRED}{" "}
              check-ins.
            </div>
            <label style={lbl}>Reward Type</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {(["inbody", "buddy"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRewardType(t)}
                  style={{
                    flex: 1,
                    padding: "12px 10px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border: `2px solid ${rewardType === t ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
                    background:
                      rewardType === t
                        ? "hsl(20 100% 50% / 0.08)"
                        : "transparent",
                    textAlign: "center",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>
                    {t === "inbody" ? "📊" : "🤝"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color:
                        rewardType === t
                          ? "hsl(20 100% 50%)"
                          : "hsl(var(--foreground))",
                    }}
                  >
                    {t === "inbody"
                      ? "Free InBody Assessment"
                      : "Bring-a-Buddy Session"}
                  </div>
                </button>
              ))}
            </div>
            <label style={lbl}>Note (optional)</label>
            <input
              style={{ ...inp, marginBottom: 20 }}
              placeholder="e.g. Redeemed at front desk on 9 Apr"
              value={redeemNote}
              onChange={(e) => setRedeemNote(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <Btn
                variant="primary"
                onClick={handleRedeem}
                disabled={submitting}
              >
                {submitting ? "Redeeming…" : "✓ Confirm Redemption"}
              </Btn>
              <Btn variant="subtle" onClick={() => setRedeemTarget(null)}>
                Cancel
              </Btn>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
// FIX: Duplicate "packages" id resolved — second entry uses "credits"
const TABS = [
  { id: "members", label: "👥 App Users", desc: "Manage user tiers" },
  { id: "community", label: "💬 Community Chat", desc: "Rooms & polls" },
  { id: "classes", label: "📅 Classes", desc: "Schedule & bookings" },
  { id: "credits", label: "🎟 Packages", desc: "Class credit packages" },
  { id: "checkin", label: "Check-In", desc: "Manual override" },
  { id: "rewards", label: "🎁 Rewards", desc: "View & redeem rewards" },
  { id: "gallery", label: "Social Media", desc: "Platforms & uploads" },
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
          {tab === "community" && <CommunityManager toast={toast} />}
          {tab === "classes" && <ClassesManager toast={toast} />}
          {tab === "credits" && <PackagesManager toast={toast} />}
          {tab === "checkin" && <ManualCheckInManager toast={toast} />}
          {tab === "gallery" && <SocialMediaManager toast={toast} />}
          {tab === "rewards" && <RewardsManager toast={toast} />}
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

// import { useState, useEffect, useRef } from "react";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import {
//   fetchCollection,
//   addToCollection,
//   updateInCollection,
//   deleteFromCollection,
// } from "@/lib/firebase";
// import {
//   getStorage,
//   ref as storageRef,
//   uploadBytesResumable,
//   getDownloadURL,
//   deleteObject,
// } from "firebase/storage";

// import { ref, get, set, remove, push, onValue } from "firebase/database";
// import { db } from "@/lib/firebase";
// import { motion, AnimatePresence } from "framer-motion";
// import { QRScanner } from "@/components/shared/QRScanner";
// import {
//   buildBookingKey,
//   formatDateKey,
//   getDayName,
// } from "@/pages/ClassBooking";

// const ADMIN_PASSWORD = "MK2R@2026";
// const [pointsBonus, setPointsBonus] = useState<string>("10");
// const [adjustingPoints, setAdjustingPoints] = useState(false);
// const DAYS = [
//   "Monday",
//   "Tuesday",
//   "Wednesday",
//   "Thursday",
//   "Friday",
//   "Saturday",
//   "Sunday",
// ];

// const [cats, setCats] = useState<string[]>([
//   "Crossfit", "Gymnastics", "Strength", "Olympic Lifting", "Saturday Smasher",
// ]);

// useEffect(() => {
//   get(ref(db, "class_categories")).then((snap) => {
//     if (snap.exists()) setCats(snap.val());
//   });
// }, []);
// // ── Only MK2R categories ──────────────────────────────────────────────────────
// // const CATS = [
// //   "Crossfit",
// //   "Gymnastics",
// //   "Strength",
// //   "Olympic Lifting",
// //   "Saturday Smasher",
// // ];
// const INTENSITIES = [
//   "Low",
//   "Low–Medium",
//   "Medium",
//   "Medium–High",
//   "High",
//   "Very High",
// ];
// const NEWS_TYPES = ["News", "Event", "Announcement"];

// const MONTH_NAMES = [
//   "January",
//   "February",
//   "March",
//   "April",
//   "May",
//   "June",
//   "July",
//   "August",
//   "September",
//   "October",
//   "November",
//   "December",
// ];
// const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// const inp: any = {
//   width: "100%",
//   background: "hsl(var(--secondary))",
//   border: "1px solid hsl(var(--border))",
//   borderRadius: 8,
//   padding: "10px 14px",
//   color: "hsl(var(--foreground))",
//   fontSize: 13,
//   outline: "none",
//   fontFamily: "var(--font-body)",
//   boxSizing: "border-box",
// };
// const lbl: any = {
//   fontSize: 10,
//   fontWeight: 700,
//   textTransform: "uppercase",
//   letterSpacing: "0.1em",
//   color: "hsl(var(--muted-foreground))",
//   display: "block",
//   marginBottom: 6,
// };

// function Btn({
//   children,
//   onClick,
//   variant = "primary",
//   size = "md",
//   disabled = false,
//   full = false,
// }: any) {
//   const s: any = {
//     primary: { background: "hsl(20 100% 50%)", color: "#000", border: "none" },
//     ghost: {
//       background: "transparent",
//       color: "hsl(20 100% 50%)",
//       border: "1px solid hsl(20 100% 50%)",
//     },
//     danger: { background: "hsl(0 84% 51%)", color: "#fff", border: "none" },
//     subtle: {
//       background: "hsl(var(--secondary))",
//       color: "hsl(var(--foreground))",
//       border: "1px solid hsl(var(--border))",
//     },
//     green: { background: "hsl(142 72% 37%)", color: "#fff", border: "none" },
//     blue: { background: "hsl(217 91% 53%)", color: "#fff", border: "none" },
//   }[variant];
//   const pad: any = { sm: "6px 14px", md: "9px 20px", lg: "12px 28px" }[size];
//   return (
//     <button
//       onClick={onClick}
//       disabled={disabled}
//       style={{
//         ...s,
//         padding: pad,
//         fontSize: 11,
//         fontWeight: 700,
//         fontFamily: "var(--font-body)",
//         letterSpacing: "0.05em",
//         textTransform: "uppercase",
//         borderRadius: 8,
//         cursor: disabled ? "not-allowed" : "pointer",
//         opacity: disabled ? 0.5 : 1,
//         width: full ? "100%" : "auto",
//         display: "inline-flex",
//         alignItems: "center",
//         gap: 6,
//       }}
//     >
//       {children}
//     </button>
//   );
// }

// function MToast({ msg, type, onDone }: any) {
//   useEffect(() => {
//     const t = setTimeout(onDone, 3000);
//     return () => clearTimeout(t);
//   }, [onDone]);
//   const bg: any =
//     {
//       success: "hsl(142 72% 37%)",
//       error: "hsl(0 84% 51%)",
//       info: "hsl(20 100% 50%)",
//     }[type] || "hsl(20 100% 50%)";
//   return (
//     <div
//       style={{
//         position: "fixed",
//         bottom: 24,
//         right: 24,
//         zIndex: 9999,
//         background: bg,
//         color: type === "error" ? "#fff" : "#000",
//         borderRadius: 10,
//         padding: "12px 20px",
//         fontWeight: 700,
//         fontSize: 13,
//         fontFamily: "var(--font-body)",
//         boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
//       }}
//     >
//       {msg}
//     </div>
//   );
// }

// function AdminLogin({ onLogin }: { onLogin: () => void }) {
//   const [pw, setPw] = useState("");
//   const [err, setErr] = useState("");
//   const check = () =>
//     pw === ADMIN_PASSWORD
//       ? onLogin()
//       : (setErr("Incorrect password"), setPw(""));
//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         background: "hsl(var(--background))",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: 20,
//       }}
//     >
//       <div
//         style={{
//           width: "100%",
//           maxWidth: 380,
//           background: "hsl(var(--card))",
//           border: "1px solid hsl(var(--border))",
//           borderRadius: 16,
//           padding: "36px 32px",
//         }}
//       >
//         <div
//           style={{
//             fontFamily: "var(--font-display)",
//             fontSize: 26,
//             letterSpacing: "0.15em",
//             color: "hsl(20 100% 50%)",
//             marginBottom: 4,
//           }}
//         >
//           MK2R ADMIN
//         </div>
//         <div
//           style={{
//             fontSize: 12,
//             color: "hsl(var(--muted-foreground))",
//             marginBottom: 24,
//           }}
//         >
//           Management Portal — Authorised Access Only
//         </div>
//         <label style={lbl}>Admin Password</label>
//         <input
//           type="password"
//           style={{ ...inp, marginBottom: 8 }}
//           placeholder="Enter password"
//           value={pw}
//           onChange={(e) => setPw(e.target.value)}
//           onKeyDown={(e) => e.key === "Enter" && check()}
//         />
//         {err && (
//           <div
//             style={{ fontSize: 12, color: "hsl(0 84% 51%)", marginBottom: 10 }}
//           >
//             {err}
//           </div>
//         )}
//         <div style={{ marginTop: 14 }}>
//           <Btn variant="primary" size="lg" onClick={check} full>
//             Enter Admin Panel →
//           </Btn>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Admin Calendar (timezone‑safe) ───────────────────────────────────────────
// function AdminCalendar({
//   selectedDate,
//   onSelect,
//   classDateCounts,
// }: {
//   selectedDate: Date;
//   onSelect: (d: Date) => void;
//   classDateCounts: Record<string, number>;
// }) {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
//   const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
//   const firstDay = new Date(viewYear, viewMonth, 1).getDay();
//   const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
//   const prevMonth = () => {
//     if (viewMonth === 0) {
//       setViewMonth(11);
//       setViewYear((y) => y - 1);
//     } else setViewMonth((m) => m - 1);
//   };
//   const nextMonth = () => {
//     if (viewMonth === 11) {
//       setViewMonth(0);
//       setViewYear((y) => y + 1);
//     } else setViewMonth((m) => m + 1);
//   };
//   const cells: (number | null)[] = [];
//   for (let i = 0; i < firstDay; i++) cells.push(null);
//   for (let d = 1; d <= daysInMonth; d++) cells.push(d);

//   return (
//     <div
//       style={{
//         background: "hsl(var(--secondary))",
//         border: "1px solid hsl(var(--border))",
//         borderRadius: 12,
//         padding: 16,
//         marginBottom: 20,
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           marginBottom: 12,
//         }}
//       >
//         <button
//           onClick={prevMonth}
//           style={{
//             background: "none",
//             border: "none",
//             cursor: "pointer",
//             color: "hsl(var(--muted-foreground))",
//             fontSize: 16,
//             padding: "2px 8px",
//           }}
//         >
//           ←
//         </button>
//         <div style={{ fontWeight: 700, fontSize: 13 }}>
//           {MONTH_NAMES[viewMonth]} {viewYear}
//         </div>
//         <button
//           onClick={nextMonth}
//           style={{
//             background: "none",
//             border: "none",
//             cursor: "pointer",
//             color: "hsl(var(--muted-foreground))",
//             fontSize: 16,
//             padding: "2px 8px",
//           }}
//         >
//           →
//         </button>
//       </div>
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(7,1fr)",
//           marginBottom: 4,
//         }}
//       >
//         {DAY_NAMES.map((d) => (
//           <div
//             key={d}
//             style={{
//               textAlign: "center",
//               fontSize: 10,
//               fontWeight: 700,
//               color: "hsl(var(--muted-foreground))",
//               padding: "2px 0",
//             }}
//           >
//             {d}
//           </div>
//         ))}
//       </div>
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(7,1fr)",
//           gap: 2,
//         }}
//       >
//         {cells.map((day, i) => {
//           if (!day) return <div key={i} />;
//           const date = new Date(viewYear, viewMonth, day);
//           date.setHours(0, 0, 0, 0);
//           const key = formatDateKey(date);
//           const isToday = date.getTime() === today.getTime();
//           const isSel = formatDateKey(selectedDate) === key;
//           const count = classDateCounts[key] || 0;
//           return (
//             <button
//               key={i}
//               onClick={() => onSelect(new Date(viewYear, viewMonth, day))}
//               style={{
//                 aspectRatio: "1",
//                 borderRadius: 6,
//                 fontSize: 11,
//                 fontWeight: 600,
//                 cursor: "pointer",
//                 border: "none",
//                 background: isSel
//                   ? "hsl(20 100% 50%)"
//                   : isToday
//                     ? "hsl(20 100% 50% / 0.15)"
//                     : "transparent",
//                 color: isSel
//                   ? "#000"
//                   : isToday
//                     ? "hsl(20 100% 50%)"
//                     : "hsl(var(--foreground))",
//                 outline:
//                   isToday && !isSel ? "1px solid hsl(20 100% 50%)" : "none",
//                 position: "relative",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 gap: 1,
//               }}
//             >
//               {day}
//               {count > 0 && (
//                 <span
//                   style={{
//                     width: 4,
//                     height: 4,
//                     borderRadius: "50%",
//                     background: isSel ? "#000" : "hsl(20 100% 50%)",
//                     display: "block",
//                   }}
//                 />
//               )}
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// //------CategoryManager------------------
// function CategoryManager({ toast }: any) {
//   const [cats, setCats] = useState<string[]>([]);
//   const [newCat, setNewCat] = useState("");
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     get(ref(db, "class_categories")).then((snap) => {
//       if (snap.exists()) setCats(snap.val());
//       else setCats(["Crossfit", "Gymnastics", "Strength", "Olympic Lifting", "Saturday Smasher"]);
//     });
//   }, []);

//   const save = async (updated: string[]) => {
//     setSaving(true);
//     try {
//       await set(ref(db, "class_categories"), updated);
//       setCats(updated);
//       toast("Categories saved ✓", "success");
//     } catch {
//       toast("Save failed", "error");
//     }
//     setSaving(false);
//   };

//   const add = () => {
//     const trimmed = newCat.trim();
//     if (!trimmed || cats.includes(trimmed)) return;
//     save([...cats, trimmed]);
//     setNewCat("");
//   };

//   const remove = (cat: string) => {
//     if (!confirm(`Delete "${cat}"?`)) return;
//     save(cats.filter((c) => c !== cat));
//   };

//   return (
//     <div
//       style={{
//         background: "hsl(var(--secondary))",
//         border: "1px solid hsl(var(--border))",
//         borderRadius: 12,
//         padding: "14px 16px",
//         marginBottom: 20,
//       }}
//     >
//       <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
//         📂 Class Categories
//       </div>
//       <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
//         {cats.map((cat) => (
//           <div
//             key={cat}
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 6,
//               padding: "4px 10px",
//               borderRadius: 20,
//               background: "hsl(20 100% 50% / 0.1)",
//               border: "1px solid hsl(20 100% 50% / 0.3)",
//               fontSize: 12,
//               fontWeight: 700,
//               color: "hsl(20 100% 50%)",
//             }}
//           >
//             {cat}
//             <button
//               onClick={() => remove(cat)}
//               style={{
//                 background: "none",
//                 border: "none",
//                 cursor: "pointer",
//                 color: "hsl(0 84% 51%)",
//                 fontSize: 12,
//                 padding: 0,
//                 lineHeight: 1,
//               }}
//             >
//               ✕
//             </button>
//           </div>
//         ))}
//       </div>
//       <div style={{ display: "flex", gap: 8 }}>
//         <input
//           style={{ ...inp, flex: 1 }}
//           placeholder="New category name…"
//           value={newCat}
//           onChange={(e) => setNewCat(e.target.value)}
//           onKeyDown={(e) => e.key === "Enter" && add()}
//         />
//         <Btn variant="primary" size="sm" onClick={add} disabled={saving || !newCat.trim()}>
//           + Add
//         </Btn>
//       </div>
//     </div>
//   );
// }

// // ── Classes Manager ───────────────────────────────────────────────────────────
// function ClassesManager({ toast }: any) {
//   const [classes, setClasses] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [editing, setEditing] = useState<any>(null);
//   const [isDuplicate, setIsDuplicate] = useState(false);
//   const [scheduleMode, setScheduleMode] = useState<"day" | "date">("day");
//   const [calDate, setCalDate] = useState<Date>(() => {
//     const d = new Date();
//     d.setHours(0, 0, 0, 0);
//     return d;
//   });
//   const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
//   const [allBookings, setAllBookings] = useState
//     Record<string, Record<string, any>>
//   >({});
//   const [expandedBookings, setExpandedBookings] = useState<string | null>(null);
//   const [cancelling, setCancelling] = useState<string | null>(null);

//   const blank = {
//     name: cats[0] ?? "Crossfit",
//     time: "06:00",
//     trainer: "",
//     day: "Monday",
//     specificDate: "",
//     spots: "20",
//     duration: "60 min",
//     intensity: "Medium",
//     category: cats[0] ?? "Crossfit",
//     subtitle: "",
//     details: "",
//     scheduleType: "day",
//     wod: "",
//     warmup: "",
//     exercises: [] as any[],
//     chargeNonMembers: true,
//     price: "250",
//   };
//   const [form, setForm] = useState(blank);

//   const load = async () => {
//     setLoading(true);
//     setClasses(await fetchCollection("admin_classes"));
//     setLoading(false);
//   };
//   useEffect(() => { load(); }, []);

//   useEffect(() => {
//     return onValue(ref(db, "class_bookings"), (snap) =>
//       setAllBookings(snap.val() ?? {}),
//     );
//   }, []);

//   const save = async () => {
//     if (!form.name)
//       return toast("Fill in Name, Time and Trainer", "error");

//     const data = {
//       ...form, name: form.category,
//       spots: parseInt(form.spots),
//       details:
//         scheduleMode === "date" ? form.details.split("\n").filter(Boolean) : [],
//       wod: scheduleMode === "date" ? form.wod : "",
//       warmup: scheduleMode === "date" ? form.warmup : "",
//       exercises: scheduleMode === "date" ? (form.exercises || []) : [],
//       scheduleType: scheduleMode,
//       specificDate: scheduleMode === "date" ? formatDateKey(calDate) : "",
//       day: scheduleMode === "day" ? form.day : getDayName(calDate),
//       chargeNonMembers: Boolean(form.chargeNonMembers),
//       price: form.chargeNonMembers ? parseFloat(form.price) || 0 : 0,
//     };

//     if (editing && !isDuplicate) {
//       const existingSnap = await get(
//         ref(db, `admin_classes/${editing.id}/bookedCount`),
//       );
//       const currentBookedCount = existingSnap.exists()
//         ? (existingSnap.val() as number)
//         : 0;
//       await updateInCollection("admin_classes", editing.id, {
//         ...data,
//         bookedCount: currentBookedCount,
//       });
//       toast("Updated ✓", "success");
//     } else {
//       await addToCollection("admin_classes", { ...data, bookedCount: 0 });
//       toast(isDuplicate ? "Class duplicated ✓" : "Class added ✓", "success");
//     }
//     setShowForm(false);
//     setEditing(null);
//     setIsDuplicate(false);
//     setForm(blank);
//     load();
//   };

//   const del = async (id: string) => {
//     if (!confirm("Delete this class?")) return;
//     await deleteFromCollection("admin_classes", id);
//     toast("Deleted", "info");
//     load();
//   };

//   const startEdit = (c: any) => {
//     setEditing(c);
//     setIsDuplicate(false);
//     setScheduleMode(c.scheduleType || "day");
//     setForm({
//       name: c.category,
//       time: c.time,
//       trainer: c.trainer,
//       day: c.day,
//       specificDate: c.specificDate || "",
//       spots: String(c.spots),
//       duration: c.duration,
//       intensity: c.intensity,
//       category: c.category,
//       subtitle: c.subtitle || "",
//       details: (c.details || []).join("\n"),
//       scheduleType: c.scheduleType || "day",
//       wod: c.wod || "",
//       warmup: c.warmup || "",
//       exercises: c.exercises || [],
//       chargeNonMembers: Boolean(c.chargeNonMembers),
//       price: String(c.price ?? 0),
//     });
//     if (c.specificDate) setCalDate(new Date(c.specificDate + "T00:00:00"));
//     setShowForm(true);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const duplicateClass = (c: any) => {
//     setEditing(c);
//     setIsDuplicate(true);
//     setScheduleMode(c.scheduleType || "day");
//     setForm({
//       name: c.name + " (copy)",
//       time: c.time,
//       trainer: c.trainer,
//       day: c.day,
//       specificDate: c.specificDate || "",
//       spots: String(c.spots),
//       duration: c.duration,
//       intensity: c.intensity,
//       category: c.category,
//       subtitle: c.subtitle || "",
//       details: (c.details || []).join("\n"),
//       scheduleType: c.scheduleType || "day",
//       wod: c.wod || "",
//       warmup: c.warmup || "",
//       exercises: c.exercises || [],
//       chargeNonMembers: Boolean(c.chargeNonMembers),
//       price: String(c.price ?? 0),
//     });
//     if (c.specificDate) setCalDate(new Date(c.specificDate + "T00:00:00"));
//     setShowForm(true);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));

//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const classDateCounts: Record<string, number> = {};
//   classes.forEach((cls) => {
//     if (cls.scheduleType === "date" && cls.specificDate) {
//       classDateCounts[cls.specificDate] =
//         (classDateCounts[cls.specificDate] || 0) + 1;
//     } else {
//       for (let i = 0; i < 60; i++) {
//         const d = new Date(today);
//         d.setDate(today.getDate() + i);
//         const dayName = getDayName(d);
//         if (cls.day === dayName) {
//           const key = formatDateKey(d);
//           classDateCounts[key] = (classDateCounts[key] || 0) + 1;
//         }
//       }
//     }
//   });

//   const selectedDateKey = formatDateKey(calDate);
//   const selectedDayName = getDayName(calDate);

//   const classesOnDate = classes
//     .filter((cls) =>
//       cls.scheduleType === "date"
//         ? cls.specificDate === selectedDateKey
//         : cls.day === selectedDayName,
//     )
//     .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

//   const adminCancelBooking = async (cls: any, uid: string, memberName: string) => {
//     if (!confirm(`Remove ${memberName}'s booking from ${cls.name}?`)) return;
//     setCancelling(`${cls.name}_${uid}`);
//     const bk = buildBookingKey(cls.name, selectedDateKey);
//     try {
//       await set(ref(db, `class_bookings/${bk}/${uid}`), null);
//       const credSnap = await get(ref(db, `mk2_users/${uid}/classCredits`));
//       const current = credSnap.exists() ? (credSnap.val() as number) : 0;
//       await set(ref(db, `mk2_users/${uid}/classCredits`), current + 1);
//       await push(ref(db, `mk2_users/${uid}/creditHistory`), {
//         amount: +1,
//         type: "admin_cancel",
//         note: `Admin removed: ${cls.name} on ${selectedDateKey}`,
//         timestamp: Date.now(),
//       });
//       const userSnap = await get(ref(db, `mk2_users/${uid}/bookings`));
//       if (userSnap.exists()) {
//         const bookings = userSnap.val();
//         const filtered = Array.isArray(bookings)
//           ? bookings.filter(
//               (b: any) => !(b.name === cls.name && b.dateKey === selectedDateKey),
//             )
//           : [];
//         await set(ref(db, `mk2_users/${uid}/bookings`), filtered);
//       }
//       toast(`${memberName} removed · credit refunded ✓`, "success");
//     } catch {
//       toast("Cancel failed", "error");
//     }
//     setCancelling(null);
//   };

//   const getClassBookings = (cls: any): Array<{ uid: string; name: string; email: string }> => {
//     const bk = buildBookingKey(cls.name, selectedDateKey);
//     const raw = allBookings[bk] ?? {};
//     return Object.entries(raw).map(([uid, val]: [string, any]) => ({
//       uid,
//       name: val.name || "Unknown",
//       email: val.email || "",
//     }));
//   };

//   const ClassActions = ({ cls, bookings }: { cls: any; bookings?: any[] }) => (
//     <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
//       {bookings !== undefined && (
//         <button
//           onClick={() =>
//             setExpandedBookings(expandedBookings === cls.id ? null : cls.id)
//           }
//           style={{
//             padding: "5px 12px",
//             borderRadius: 20,
//             fontSize: 11,
//             fontWeight: 700,
//             cursor: "pointer",
//             background: bookings.length > 0 ? "hsl(20 100% 50% / 0.15)" : "hsl(var(--secondary))",
//             color: bookings.length > 0 ? "hsl(20 100% 50%)" : "hsl(var(--muted-foreground))",
//             border: `1px solid ${bookings.length > 0 ? "hsl(20 100% 50% / 0.3)" : "hsl(var(--border))"}`,
//           }}
//         >
//           👥 {bookings.length}/{cls.spots} {expandedBookings === cls.id ? "▲" : "▼"}
//         </button>
//       )}
//       <Btn variant="blue" size="sm" onClick={() => duplicateClass(cls)}>⧉ Duplicate</Btn>
//       <Btn variant="subtle" size="sm" onClick={() => startEdit(cls)}>Edit</Btn>
//       <Btn variant="danger" size="sm" onClick={() => del(cls.id)}>Delete</Btn>
//     </div>
//   );

//   return (
//     <div>
//        <CategoryManager toast={toast} />  {/* ← add this line */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
//         <div style={{ fontWeight: 700, fontSize: 15 }}>Classes ({classes.length})</div>
//         <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//           <div style={{ display: "flex", background: "hsl(var(--secondary))", borderRadius: 8, padding: 2, gap: 2 }}>
//             {(["calendar", "list"] as const).map((v) => (
//               <button
//                 key={v}
//                 onClick={() => setViewMode(v)}
//                 style={{
//                   padding: "5px 14px",
//                   borderRadius: 6,
//                   fontSize: 11,
//                   fontWeight: 700,
//                   cursor: "pointer",
//                   background: viewMode === v ? "hsl(20 100% 50%)" : "transparent",
//                   color: viewMode === v ? "#000" : "hsl(var(--muted-foreground))",
//                   border: "none",
//                   textTransform: "capitalize",
//                 }}
//               >
//                 {v}
//               </button>
//             ))}
//           </div>
//           <Btn
//             variant="primary"
//             size="sm"
//             onClick={() => {
//               setShowForm(!showForm);
//               setEditing(null);
//               setIsDuplicate(false);
//               setForm(blank);
//               setScheduleMode("day");
//             }}
//           >
//             {showForm ? "✕ Cancel" : "+ Add Class"}
//           </Btn>
//         </div>
//       </div>

//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
//               {isDuplicate ? "Duplicate Class" : editing ? "Edit Class" : "New Class"}
//             </div>
//             {isDuplicate && (
//               <div style={{ fontSize: 11, color: "hsl(217 91% 53%)", marginBottom: 14, padding: "6px 10px", background: "hsl(217 91% 53% / 0.1)", borderRadius: 6, border: "1px solid hsl(217 91% 53% / 0.3)" }}>
//                 ⧉ Duplicating from "{editing?.name}" — adjust details and save as a new class.
//               </div>
//             )}
//             <div style={{ marginBottom: 14 }} />

//             {/* Schedule Type */}
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Schedule Type</label>
//               <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//                 {(["day", "date"] as const).map((mode) => (
//                   <button
//                     key={mode}
//                     onClick={() => setScheduleMode(mode)}
//                     style={{
//                       padding: "7px 18px",
//                       borderRadius: 8,
//                       fontSize: 11,
//                       fontWeight: 700,
//                       cursor: "pointer",
//                       border: "1px solid",
//                       borderColor: scheduleMode === mode ? "hsl(20 100% 50%)" : "hsl(var(--border))",
//                       background: scheduleMode === mode ? "hsl(20 100% 50%)" : "transparent",
//                       color: scheduleMode === mode ? "#000" : "hsl(var(--foreground))",
//                     }}
//                   >
//                     {mode === "day" ? "📅 Weekly (recurring)" : "🗓 Workout Details (once-off)"}
//                   </button>
//                 ))}
//               </div>
//               {scheduleMode === "day" && (
//                 <div style={{ marginTop: 8, fontSize: 11, color: "hsl(var(--muted-foreground))", padding: "6px 10px", background: "hsl(142 72% 37% / 0.08)", borderRadius: 6, border: "1px solid hsl(142 72% 37% / 0.2)" }}>
//                   ℹ️ WOD details are added per-date on once-off classes. Weekly recurring classes share the same template.
//                 </div>
//               )}
//             </div>

//             {/* Day / Date picker */}
//             {scheduleMode === "day" ? (
//               <div style={{ marginBottom: 14 }}>
//                 <label style={lbl}>Day of Week</label>
//                 <select style={inp} value={form.day} onChange={f("day")}>
//                   {DAYS.map((d) => <option key={d}>{d}</option>)}
//                 </select>
//               </div>
//             ) : (
//               <div style={{ marginBottom: 14 }}>
//                 <label style={lbl}>Pick a Date</label>
//                 <AdminCalendar
//                   selectedDate={calDate}
//                   onSelect={setCalDate}
//                   classDateCounts={classDateCounts}
//                 />
//                 <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: -10, marginBottom: 8 }}>
//                   Selected:{" "}
//                   <strong style={{ color: "hsl(20 100% 50%)" }}>
//                     {calDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
//                   </strong>
//                 </div>
//               </div>
//             )}

//             {/* Core fields grid */}
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 12 }}>
//   {([
//     ["trainer", "Trainer", "Coach Marcus"],
//     ["duration", "Duration", "60 min"],
//     ["subtitle", "Subtitle", "Short description"],
//   ] as any[]).map(([k, l, p]: any) => (
//     <div key={k}>
//       <label style={lbl}>{l}</label>
//       <input style={inp} placeholder={p} value={(form as any)[k]} onChange={f(k)} />
//     </div>
//   ))}

//   {/* Booking Threshold — dropdown */}
// <div>
//   <label style={lbl}>Max Spots</label>
//   <select
//     style={inp}
//     value={form.spots}
//     onChange={(e) => setForm((p) => ({ ...p, spots: e.target.value }))}
//   >
//     {["5", "8", "10", "12", "15", "16", "18", "20", "24", "25", "30", "40", "50"].map((n) => (
//       <option key={n} value={n}>{n} spots</option>
//     ))}
//   </select>
// </div>

//   {/* Time — dropdown */}
//   <div>
//     <label style={lbl}>Time</label>
//     <select style={inp} value={form.time} onChange={f("time")}>
//       {[
//         "05:00", "05:15", "05:30", "05:45",
//         "06:00", "06:15", "06:30", "06:45",
//         "07:00", "07:15", "07:30", "07:45",
//         "08:00", "08:15", "08:30", "08:45",
//         "09:00", "09:15", "09:30", "09:45",
//         "10:00", "10:15", "10:30", "10:45",
//         "11:00", "11:30",
//         "12:00", "12:30",
//         "13:00", "13:30",
//         "14:00", "14:30",
//         "15:00", "15:30",
//         "16:00", "16:30",
//         "17:00", "17:15", "17:30", "17:45",
//         "18:00", "18:15", "18:30", "18:45",
//         "19:00", "19:15", "19:30", "19:45",
//         "20:00", "20:30",
//       ].map((t) => (
//         <option key={t} value={t}>{t}</option>
//       ))}
//     </select>
//   </div>

//   {/* Category + Intensity dropdowns */}

// <div>
//   <label style={lbl}>Category</label>
//   <select
//     style={inp}
//     value={form.category}
//     onChange={(e) =>
//       setForm((p) => ({
//         ...p,
//         category: e.target.value,
//         name: e.target.value, // keep name in sync
//       }))
//     }
//   >
//     {cats.map((o) => <option key={o}>{o}</option>)}

//   </select>
// </div>
//   {/* {([
//     ["intensity", "Intensity", INTENSITIES],
//   ] as any[]).map(([k, l, opts]: any) => (
//     <div key={k}>
//       <label style={lbl}>{l}</label>
//       <select style={inp} value={(form as any)[k]} onChange={f(k)}>
//         {opts.map((o: string) => <option key={o}>{o}</option>)}
//       </select>
//     </div>
//   ))} */}
// </div>

//             {/* Non-Member Booking */}
//             <div style={{ marginBottom: 14, padding: "14px 16px", background: "hsl(var(--background))", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
//               <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>Non-Member Booking</div>
//               <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
//                 <input
//                   type="checkbox"
//                   id="chargeNonMembers"
//                   checked={Boolean(form.chargeNonMembers)}
//                   onChange={(e) => setForm((p) => ({ ...p, chargeNonMembers: e.target.checked, price: e.target.checked ? p.price : "0" }))}
//                   style={{ width: 16, height: 16, cursor: "pointer" }}
//                 />
//                 <label htmlFor="chargeNonMembers" style={{ fontSize: 13, color: "hsl(var(--foreground))", cursor: "pointer", userSelect: "none" }}>
//                   Charge non-members to book this class
//                 </label>
//               </div>
//               {form.chargeNonMembers ? (
//                 <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                   <div style={{ flex: 1, maxWidth: 200 }}>
//                     <label style={lbl}>Price (ZAR)</label>
//                     <input type="number" style={inp} placeholder="250.00" min="0" step="0.01" value={form.price} onChange={f("price")} />
//                   </div>
//                   <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 20 }}>
//                     Non-members will pay via PayFast before booking is confirmed.
//                   </div>
//                 </div>
//               ) : (
//                 <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
//                   Non-members can book this class for free (no payment required).
//                 </div>
//               )}
//             </div>

//             {/* ── Warm Up + Workout — once-off classes only ── */}
//             {scheduleMode === "date" && (
//               <>
//                 {/* Warm Up */}
//                 <div style={{ marginBottom: 14, padding: "14px 16px", background: "hsl(var(--background))", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
//                   <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>🔥 Warm Up</div>
//                   <textarea
//                     style={{ ...inp, minHeight: 80, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
//                     placeholder={"e.g. 3 ROUNDS\n0:30 Row\n10 Air Squats\n10 Push-ups"}
//                     value={form.warmup}
//                     onChange={(e) => setForm((p) => ({ ...p, warmup: e.target.value }))}
//                   />
//                 </div>

//                 {/* Workout */}
//                 <div style={{ marginBottom: 14, padding: "14px 16px", background: "hsl(var(--background))", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
//                   <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>⚡ Workout</div>

//                   {/* Exercise rows */}
//                   {(form.exercises || []).map((ex: any, i: number) => (
//                     <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
//                       <input
//                         style={{ ...inp, flex: 2, minWidth: 140 }}
//                         placeholder="Exercise name"
//                         value={ex.name}
//                         onChange={(e) => {
//                           const updated = [...(form.exercises || [])];
//                           updated[i] = { ...updated[i], name: e.target.value };
//                           setForm((p) => ({ ...p, exercises: updated }));
//                         }}
//                       />
//                       <input
//                         style={{ ...inp, flex: 1, minWidth: 80 }}
//                         placeholder="e.g. 3x10"
//                         value={ex.sets}
//                         onChange={(e) => {
//                           const updated = [...(form.exercises || [])];
//                           updated[i] = { ...updated[i], sets: e.target.value };
//                           setForm((p) => ({ ...p, exercises: updated }));
//                         }}
//                       />
//                       // AFTER — replace that single input with these two side-by-side
// <input
//   style={{ ...inp, flex: 1, minWidth: 70 }}
//   placeholder="Value"
//   value={ex.value ?? ""}
//   onChange={(e) => {
//     const updated = [...(form.exercises || [])];
//     updated[i] = { ...updated[i], value: e.target.value };
//     setForm((p) => ({ ...p, exercises: updated }));
//   }}
// />
// <select
//   style={{ ...inp, flex: 1, minWidth: 90 }}
//   value={ex.measure ?? "kg"}
//   onChange={(e) => {
//     const updated = [...(form.exercises || [])];
//     updated[i] = { ...updated[i], measure: e.target.value };
//     setForm((p) => ({ ...p, exercises: updated }));
//   }}
// >
//   <option value="kg">kg</option>
//   <option value="lbs">lbs</option>
//   <option value="reps">reps</option>
//   <option value="time">time</option>
//   <option value="distance">distance</option>
//   <option value="calories">calories</option>
//   <option value="rounds">rounds</option>
//   <option value="%">% of 1RM</option>
//   <option value="bodyweight">bodyweight</option>
// </select>
//                       <button
//                         onClick={() => {
//                           const updated = (form.exercises || []).filter((_: any, j: number) => j !== i);
//                           setForm((p) => ({ ...p, exercises: updated }));
//                         }}
//                         style={{
//                           background: "hsl(0 84% 51% / 0.1)",
//                           border: "1px solid hsl(0 84% 51% / 0.3)",
//                           color: "hsl(0 84% 51%)",
//                           borderRadius: 8,
//                           padding: "8px 12px",
//                           cursor: "pointer",
//                           fontSize: 13,
//                           fontFamily: "var(--font-body)",
//                           flexShrink: 0,
//                         }}
//                       >
//                         ✕
//                       </button>
//                     </div>
//                   ))}

//                   <button
//                     onClick={() =>
//                       setForm((p) => ({
//                         ...p,
//                         exercises: [...(p.exercises || []), { name: "", sets: "", value: "", measure: "kg" }],
//                       }))
//                     }
//                     style={{
//                       marginTop: 4,
//                       padding: "8px 16px",
//                       borderRadius: 8,
//                       border: "1px dashed hsl(20 100% 50% / 0.4)",
//                       background: "hsl(20 100% 50% / 0.06)",
//                       color: "hsl(20 100% 50%)",
//                       cursor: "pointer",
//                       fontSize: 12,
//                       fontWeight: 700,
//                       fontFamily: "var(--font-body)",
//                     }}
//                   >
//                     + Add Exercise
//                   </button>

//                   {/* WOD notes */}
//                   <div style={{ marginTop: 14 }}>
//                     <label style={lbl}>Additional WOD Notes</label>
//                     <textarea
//                       style={{ ...inp, minHeight: 80, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
//                       placeholder={"e.g. Comp: 80/55kg\nScaled: 60/40kg\nBeg: 40/30kg"}
//                       value={form.wod}
//                       onChange={f("wod")}
//                     />
//                   </div>
//                 </div>
//               </>
//             )}

//             <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
//               <Btn variant="primary" onClick={save}>
//                 {isDuplicate ? "Save as New Class" : editing ? "Save Changes" : "Add Class"}
//               </Btn>
//               <Btn variant="subtle" onClick={() => { setShowForm(false); setEditing(null); setIsDuplicate(false); }}>
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* ── Calendar View ── */}
//       {viewMode === "calendar" && (
//         <>
//           <AdminCalendar
//             selectedDate={calDate}
//             onSelect={(d) => { setCalDate(d); setExpandedBookings(null); }}
//             classDateCounts={classDateCounts}
//           />
//           <div style={{ marginBottom: 12 }}>
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
//               {calDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} — {classesOnDate.length} class{classesOnDate.length !== 1 ? "es" : ""}
//             </div>
//             {loading ? (
//               <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>Loading…</div>
//             ) : classesOnDate.length === 0 ? (
//               <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13, padding: "16px 0" }}>No classes on this date.</div>
//             ) : (
//               <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//                 {classesOnDate.map((cls) => {
//                   const bookings = getClassBookings(cls);
//                   const isExpanded = expandedBookings === cls.id;
//                   return (
//                     <div key={cls.id} style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", borderRadius: 10, overflow: "hidden" }}>
//                       <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
//                         <div>
//                           <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
//                             {cls.name}
//                             <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: cls.scheduleType === "date" ? "hsl(217 91% 53% / 0.15)" : "hsl(142 72% 37% / 0.15)", color: cls.scheduleType === "date" ? "hsl(217 91% 53%)" : "hsl(142 72% 37%)", fontWeight: 700 }}>
//                               {cls.scheduleType === "date" ? "Once-off" : "Weekly"}
//                             </span>
//                             {cls.chargeNonMembers && (
//                               <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "hsl(38 92% 44% / 0.15)", color: "hsl(38 92% 44%)", fontWeight: 700, border: "1px solid hsl(38 92% 44% / 0.3)" }}>
//                                 💳 R{Number(cls.price).toFixed(0)} non-members
//                               </span>
//                             )}
//                           </div>
//                           <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
//                             {cls.time} · {cls.trainer} · {cls.spots} spots · {cls.category}
//                           </div>
//                         </div>
//                         <ClassActions cls={cls} bookings={bookings} />
//                       </div>

//                       <AnimatePresence>
//                         {isExpanded && (
//                           <motion.div
//                             initial={{ height: 0, opacity: 0 }}
//                             animate={{ height: "auto", opacity: 1 }}
//                             exit={{ height: 0, opacity: 0 }}
//                             style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--background))", padding: "12px 16px" }}
//                           >
//                             <div style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
//                               Booked Members ({bookings.length})
//                             </div>
//                             {bookings.length === 0 ? (
//                               <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>No bookings yet for this class on this date.</div>
//                             ) : (
//                               <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//                                 {bookings.map((b) => (
//                                   <div key={b.uid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "hsl(var(--secondary))", flexWrap: "wrap", gap: 8 }}>
//                                     <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                                       <div style={{ width: 30, height: 30, borderRadius: "50%", background: "hsl(20 100% 50%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#000", flexShrink: 0 }}>
//                                         {b.name[0] ?? "?"}
//                                       </div>
//                                       <div>
//                                         <div style={{ fontWeight: 700, fontSize: 13 }}>{b.name}</div>
//                                         <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{b.email}</div>
//                                       </div>
//                                     </div>
//                                     <Btn variant="danger" size="sm" disabled={cancelling === `${cls.name}_${b.uid}`} onClick={() => adminCancelBooking(cls, b.uid, b.name)}>
//                                       {cancelling === `${cls.name}_${b.uid}` ? "Removing…" : "✕ Remove"}
//                                     </Btn>
//                                   </div>
//                                 ))}
//                               </div>
//                             )}
//                           </motion.div>
//                         )}
//                       </AnimatePresence>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         </>
//       )}

//       {/* ── List View ── */}
//       {viewMode === "list" && (
//         loading ? (
//           <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>Loading…</div>
//         ) : classes.length === 0 ? (
//           <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>No classes yet.</div>
//         ) : (
//           <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//             {classes.map((cls) => (
//               <div key={cls.id} style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
//                 <div>
//                   <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
//                     {cls.name}
//                     <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: cls.scheduleType === "date" ? "hsl(217 91% 53% / 0.15)" : "hsl(142 72% 37% / 0.15)", color: cls.scheduleType === "date" ? "hsl(217 91% 53%)" : "hsl(142 72% 37%)", fontWeight: 700 }}>
//                       {cls.scheduleType === "date" ? "Once-off" : "Weekly"}
//                     </span>
//                     {cls.chargeNonMembers && (
//                       <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "hsl(38 92% 44% / 0.15)", color: "hsl(38 92% 44%)", fontWeight: 700, border: "1px solid hsl(38 92% 44% / 0.3)" }}>
//                         💳 R{Number(cls.price).toFixed(0)}
//                       </span>
//                     )}
//                   </div>
//                   <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
//                     {cls.scheduleType === "date"
//                       ? new Date(cls.specificDate + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
//                       : cls.day}{" "}
//                     · {cls.time} · {cls.trainer} · {cls.spots} spots
//                   </div>
//                 </div>
//                 <ClassActions cls={cls} />
//               </div>
//             ))}
//           </div>
//         )
//       )}
//     </div>
//   );
// }

// // ── Social Media Manager ──────────────────────────────────────────────────────
// // Replaces GalleryManager in Admin.tsx
// // Also update the TABS array entry from:
// //   { id: "gallery", label: "Gallery", desc: "Photo highlights" }
// // to:
// //   { id: "gallery", label: "Social Media", desc: "Platforms & uploads" }

// // Required additional imports at top of Admin.tsx:
// // import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// function SocialMediaManager({ toast }: any) {
//   const [socialsTab, setSocialsTab] = useState<"platforms" | "photos">(
//     "platforms",
//   );

//   return (
//     <div>
//       <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
//         Social Media Platforms
//       </div>
//       <div
//         style={{
//           fontSize: 12,
//           color: "hsl(var(--muted-foreground))",
//           marginBottom: 20,
//         }}
//       >
//         Manage your social platform links and photo highlights
//       </div>

//       {/* Sub-tabs */}
//       <div
//         style={{
//           display: "flex",
//           gap: 6,
//           padding: 4,
//           borderRadius: 10,
//           background: "hsl(var(--secondary))",
//           width: "fit-content",
//           marginBottom: 24,
//         }}
//       >
//         {[
//           { id: "platforms" as const, label: "🔗 Platform Links" },
//           { id: "photos" as const, label: "🖼 Photo Highlights" },
//         ].map((t) => (
//           <button
//             key={t.id}
//             onClick={() => setSocialsTab(t.id)}
//             style={{
//               padding: "7px 16px",
//               borderRadius: 8,
//               border: "none",
//               cursor: "pointer",
//               fontFamily: "var(--font-body)",
//               fontWeight: 700,
//               fontSize: 12,
//               background:
//                 socialsTab === t.id ? "hsl(20 100% 50%)" : "transparent",
//               color:
//                 socialsTab === t.id ? "#000" : "hsl(var(--muted-foreground))",
//             }}
//           >
//             {t.label}
//           </button>
//         ))}
//       </div>

//       {socialsTab === "platforms" && <PlatformsConfig toast={toast} />}
//       {socialsTab === "photos" && <PhotosManager toast={toast} />}
//     </div>
//   );
// }

// // ── Platform Links Config ─────────────────────────────────────────────────────
// function PlatformsConfig({ toast }: any) {
//   const [form, setForm] = useState({
//     instagramHandle: "",
//     facebookUrl: "",
//     tiktokUrl: "",
//     facebookEmbedEnabled: false,
//     tiktokEmbedEnabled: false,
//   });
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     get(ref(db, "admin_socials")).then((snap) => {
//       if (snap.exists()) setForm((p) => ({ ...p, ...snap.val() }));
//       setLoading(false);
//     });
//   }, []);

//   const save = async () => {
//     setSaving(true);
//     try {
//       await set(ref(db, "admin_socials"), form);
//       toast("Social platforms updated ✓", "success");
//     } catch {
//       toast("Save failed", "error");
//     }
//     setSaving(false);
//   };

//   if (loading)
//     return (
//       <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
//         Loading…
//       </div>
//     );

//   return (
//     <div style={{ maxWidth: 560 }}>
//       {/* Instagram */}
//       <div
//         style={{
//           background: "hsl(var(--secondary))",
//           border: "1px solid hsl(var(--border))",
//           borderRadius: 12,
//           padding: "16px 20px",
//           marginBottom: 12,
//           borderLeft: "3px solid hsl(20 100% 50%)",
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
//           📸 Instagram
//         </div>
//         <label style={lbl}>Instagram Handle (without @)</label>
//         <input
//           style={inp}
//           placeholder="mk2riversfitness"
//           value={form.instagramHandle}
//           onChange={(e) =>
//             setForm((p) => ({ ...p, instagramHandle: e.target.value }))
//           }
//         />
//         <div
//           style={{
//             fontSize: 11,
//             color: "hsl(var(--muted-foreground))",
//             marginTop: 6,
//           }}
//         >
//           Feed is powered by Elfsight. The handle here controls the profile link
//           shown to members.
//         </div>
//       </div>

//       {/* Facebook */}
//       <div
//         style={{
//           background: "hsl(var(--secondary))",
//           border: "1px solid hsl(var(--border))",
//           borderRadius: 12,
//           padding: "16px 20px",
//           marginBottom: 12,
//           borderLeft: "3px solid hsl(217 91% 53%)",
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
//           👥 Facebook
//         </div>
//         <label style={lbl}>Facebook Page URL</label>
//         <input
//           style={{ ...inp, marginBottom: 12 }}
//           placeholder="https://facebook.com/mk2riversfitness"
//           value={form.facebookUrl}
//           onChange={(e) =>
//             setForm((p) => ({ ...p, facebookUrl: e.target.value }))
//           }
//         />
//         <label style={lbl}>Show embedded feed?</label>
//         <select
//           style={inp}
//           value={form.facebookEmbedEnabled ? "true" : "false"}
//           onChange={(e) =>
//             setForm((p) => ({
//               ...p,
//               facebookEmbedEnabled: e.target.value === "true",
//             }))
//           }
//         >
//           <option value="false">No — show link button only</option>
//           <option value="true">Yes — embed Facebook feed</option>
//         </select>
//         <div
//           style={{
//             fontSize: 11,
//             color: "hsl(var(--muted-foreground))",
//             marginTop: 6,
//           }}
//         >
//           Leave URL empty to hide Facebook tab from members entirely.
//         </div>
//       </div>

//       {/* TikTok */}
//       <div
//         style={{
//           background: "hsl(var(--secondary))",
//           border: "1px solid hsl(var(--border))",
//           borderRadius: 12,
//           padding: "16px 20px",
//           marginBottom: 24,
//           borderLeft: "3px solid hsl(var(--border))",
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
//           🎵 TikTok
//         </div>
//         <label style={lbl}>TikTok Profile URL</label>
//         <input
//           style={{ ...inp, marginBottom: 12 }}
//           placeholder="https://tiktok.com/@mk2rivers"
//           value={form.tiktokUrl}
//           onChange={(e) =>
//             setForm((p) => ({ ...p, tiktokUrl: e.target.value }))
//           }
//         />
//         <label style={lbl}>Show embedded feed?</label>
//         <select
//           style={inp}
//           value={form.tiktokEmbedEnabled ? "true" : "false"}
//           onChange={(e) =>
//             setForm((p) => ({
//               ...p,
//               tiktokEmbedEnabled: e.target.value === "true",
//             }))
//           }
//         >
//           <option value="false">No — show link button only</option>
//           <option value="true">Yes — embed TikTok creator feed</option>
//         </select>
//         <div
//           style={{
//             fontSize: 11,
//             color: "hsl(var(--muted-foreground))",
//             marginTop: 6,
//           }}
//         >
//           Leave URL empty to hide TikTok tab from members entirely.
//         </div>
//       </div>

//       <Btn variant="primary" onClick={save} disabled={saving}>
//         {saving ? "Saving…" : "Save Platform Settings"}
//       </Btn>
//     </div>
//   );
// }

// // ── Photo Highlights Manager ──────────────────────────────────────────────────
// const GAL_CATS = [
//   "Classes",
//   "Facilities",
//   "Members",
//   "Events",
//   "Transformation",
// ];

// function PhotosManager({ toast }: any) {
//   const [items, setItems] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const blank = {
//     label: "",
//     category: "Classes",
//     desc: "",
//     imageUrl: "",
//   };
//   const [form, setForm] = useState(blank);
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));

//   const load = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "admin_gallery"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([id, val]: [string, any]) => ({ id, ...val }),
//         );
//         setItems(list.reverse());
//       } else {
//         setItems([]);
//       }
//     } catch {
//       toast("Failed to load", "error");
//     }
//     setLoading(false);
//   };

//   useEffect(() => {
//     load();
//   }, []);

//   // ── Firebase Storage upload ───────────────────────────────────────────────
//   const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     // Validate type and size (max 5MB)
//     if (!file.type.startsWith("image/")) {
//       toast("Please select an image file", "error");
//       return;
//     }
//     if (file.size > 5 * 1024 * 1024) {
//       toast("Image must be under 5MB", "error");
//       return;
//     }

//     setUploading(true);
//     setUploadProgress(0);

//     try {
//       const storage = getStorage();
//       const fileName = `gallery/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
//       const sRef = storageRef(storage, fileName);
//       const uploadTask = uploadBytesResumable(sRef, file);

//       uploadTask.on(
//         "state_changed",
//         (snapshot) => {
//           const pct = Math.round(
//             (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
//           );
//           setUploadProgress(pct);
//         },
//         () => {
//           toast("Upload failed — try again", "error");
//           setUploading(false);
//         },
//         async () => {
//           const url = await getDownloadURL(uploadTask.snapshot.ref);
//           setForm((p) => ({ ...p, imageUrl: url }));
//           toast("Image uploaded ✓", "success");
//           setUploading(false);
//           setUploadProgress(0);
//         },
//       );
//     } catch {
//       toast("Upload error", "error");
//       setUploading(false);
//     }
//   };

//   const save = async () => {
//     if (!form.label) return toast("Enter a label", "error");
//     if (!form.imageUrl) return toast("Upload an image first", "error");
//     try {
//       await push(ref(db, "admin_gallery"), {
//         ...form,
//         createdAt: Date.now(),
//       });
//       toast("Photo added ✓", "success");
//       setShowForm(false);
//       setForm(blank);
//       load();
//     } catch {
//       toast("Save failed", "error");
//     }
//   };

//   const del = async (item: any) => {
//     if (!confirm(`Delete "${item.label}"?`)) return;
//     try {
//       await remove(ref(db, `admin_gallery/${item.id}`));
//       // Also delete from Storage if it's a Firebase Storage URL
//       if (item.imageUrl?.includes("firebasestorage")) {
//         try {
//           const storage = getStorage();
//           const fileRef = storageRef(storage, item.imageUrl);
//           await deleteObject(fileRef);
//         } catch {
//           // Non-critical — file may already be gone
//         }
//       }
//       toast("Deleted", "info");
//       load();
//     } catch {
//       toast("Delete failed", "error");
//     }
//   };

//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 14 }}>
//           Photo Highlights ({items.length})
//         </div>
//         <Btn
//           variant="primary"
//           size="sm"
//           onClick={() => {
//             setShowForm(!showForm);
//             setForm(blank);
//           }}
//         >
//           {showForm ? "✕ Cancel" : "+ Add Photo"}
//         </Btn>
//       </div>

//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
//               New Photo
//             </div>

//             {/* Image upload */}
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Photo</label>
//               {form.imageUrl ? (
//                 <div style={{ position: "relative", width: "fit-content" }}>
//                   <img
//                     src={form.imageUrl}
//                     alt="Preview"
//                     style={{
//                       width: 180,
//                       height: 120,
//                       objectFit: "cover",
//                       borderRadius: 8,
//                       display: "block",
//                     }}
//                   />
//                   <button
//                     onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))}
//                     style={{
//                       position: "absolute",
//                       top: 4,
//                       right: 4,
//                       background: "rgba(0,0,0,0.6)",
//                       color: "#fff",
//                       border: "none",
//                       borderRadius: "50%",
//                       width: 22,
//                       height: 22,
//                       cursor: "pointer",
//                       fontSize: 12,
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                     }}
//                   >
//                     ✕
//                   </button>
//                 </div>
//               ) : (
//                 <div>
//                   <input
//                     ref={fileInputRef}
//                     type="file"
//                     accept="image/*"
//                     style={{ display: "none" }}
//                     onChange={handleFileSelect}
//                   />
//                   <button
//                     onClick={() => fileInputRef.current?.click()}
//                     disabled={uploading}
//                     style={{
//                       padding: "10px 20px",
//                       borderRadius: 8,
//                       border: "1px dashed hsl(var(--border))",
//                       background: "hsl(var(--card))",
//                       cursor: uploading ? "not-allowed" : "pointer",
//                       fontSize: 13,
//                       color: "hsl(var(--muted-foreground))",
//                       fontFamily: "var(--font-body)",
//                     }}
//                   >
//                     {uploading
//                       ? `Uploading… ${uploadProgress}%`
//                       : "📁 Choose image (max 5MB)"}
//                   </button>
//                   {uploading && (
//                     <div
//                       style={{
//                         marginTop: 8,
//                         height: 4,
//                         background: "hsl(var(--border))",
//                         borderRadius: 2,
//                         overflow: "hidden",
//                         width: 200,
//                       }}
//                     >
//                       <div
//                         style={{
//                           height: "100%",
//                           width: `${uploadProgress}%`,
//                           background: "hsl(20 100% 50%)",
//                           borderRadius: 2,
//                           transition: "width 0.2s",
//                         }}
//                       />
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               <div>
//                 <label style={lbl}>Label</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. HIIT Session"
//                   value={form.label}
//                   onChange={f("label")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Category</label>
//                 <select
//                   style={inp}
//                   value={form.category}
//                   onChange={f("category")}
//                 >
//                   {GAL_CATS.map((c) => (
//                     <option key={c}>{c}</option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             <div style={{ marginBottom: 16 }}>
//               <label style={lbl}>Description (optional)</label>
//               <textarea
//                 style={{ ...inp, minHeight: 60, resize: "vertical" }}
//                 placeholder="Describe this photo…"
//                 value={form.desc}
//                 onChange={f("desc")}
//               />
//             </div>

//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn
//                 variant="primary"
//                 onClick={save}
//                 disabled={uploading || !form.imageUrl}
//               >
//                 Add Photo
//               </Btn>
//               <Btn variant="subtle" onClick={() => setShowForm(false)}>
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {loading ? (
//         <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
//           Loading…
//         </div>
//       ) : items.length === 0 ? (
//         <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
//           No photos yet. Add your first one above.
//         </div>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
//             gap: 10,
//           }}
//         >
//           {items.map((item) => (
//             <div
//               key={item.id}
//               style={{
//                 background: "hsl(var(--secondary))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 10,
//                 overflow: "hidden",
//               }}
//             >
//               <div
//                 style={{
//                   height: 120,
//                   overflow: "hidden",
//                   background: "hsl(var(--background))",
//                 }}
//               >
//                 <img
//                   src={item.imageUrl}
//                   alt={item.label}
//                   style={{ width: "100%", height: "100%", objectFit: "cover" }}
//                 />
//               </div>
//               <div style={{ padding: "10px 12px" }}>
//                 <div style={{ fontWeight: 700, fontSize: 13 }}>
//                   {item.label}
//                 </div>
//                 <div
//                   style={{
//                     fontSize: 11,
//                     color: "hsl(var(--muted-foreground))",
//                     marginTop: 2,
//                     marginBottom: 8,
//                   }}
//                 >
//                   {item.category}
//                   {item.desc && ` · ${item.desc}`}
//                 </div>
//                 <Btn variant="danger" size="sm" onClick={() => del(item)}>
//                   Delete
//                 </Btn>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── News Manager (with createdAt timestamp) ───────────────────────────────────
// function NewsManager({ toast }: any) {
//   const [items, setItems] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const blank = {
//     title: "",
//     type: "News",
//     date: "",
//     desc: "",
//     // Event-only fields
//     registrationLink: "",
//     registrationCutoff: "",
//     paymentLink: "",
//     imageUrl: "",
//   };
//   const [form, setForm] = useState(blank);
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));

//   const isEvent = form.type === "Event";

//   const load = async () => {
//     setLoading(true);
//     setItems(await fetchCollection("admin_news"));
//     setLoading(false);
//   };
//   useEffect(() => { load(); }, []);

//   // ── Image upload ──────────────────────────────────────────────────────────
//   const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     if (!file.type.startsWith("image/")) {
//       toast("Please select an image file", "error");
//       return;
//     }
//     if (file.size > 5 * 1024 * 1024) {
//       toast("Image must be under 5MB", "error");
//       return;
//     }
//     setUploading(true);
//     setUploadProgress(0);
//     try {
//       const storage = getStorage();
//       const fileName = `news/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
//       const sRef = storageRef(storage, fileName);
//       const uploadTask = uploadBytesResumable(sRef, file);
//       uploadTask.on(
//         "state_changed",
//         (snapshot) => {
//           setUploadProgress(
//             Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
//           );
//         },
//         () => { toast("Upload failed", "error"); setUploading(false); },
//         async () => {
//           const url = await getDownloadURL(uploadTask.snapshot.ref);
//           setForm((p) => ({ ...p, imageUrl: url }));
//           toast("Image uploaded ✓", "success");
//           setUploading(false);
//           setUploadProgress(0);
//         },
//       );
//     } catch {
//       toast("Upload error", "error");
//       setUploading(false);
//     }
//   };

//   const save = async () => {
//     if (!form.title || !form.date)
//       return toast("Fill in Title and Date", "error");
//     await addToCollection("admin_news", {
//       ...form,
//       createdAt: Date.now(),
//     });
//     toast("Published ✓", "success");
//     setShowForm(false);
//     setForm(blank);
//     load();
//   };

//   const del = async (id: string) => {
//     if (!confirm("Delete?")) return;
//     await deleteFromCollection("admin_news", id);
//     toast("Deleted", "info");
//     load();
//   };

//   return (
//     <div>
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           News & Events ({items.length})
//         </div>
//         <Btn variant="primary" size="sm" onClick={() => { setShowForm(!showForm); setForm(blank); }}>
//           {showForm ? "✕ Cancel" : "+ Add Post"}
//         </Btn>
//       </div>

//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 20, marginBottom: 20 }}
//           >
//             {/* Core fields */}
//             <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 12 }}>
//               <div style={{ gridColumn: "1/-1" }}>
//                 <label style={lbl}>Title *</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. 30-Day Challenge"
//                   value={form.title}
//                   onChange={f("title")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Type</label>
//                 <select style={inp} value={form.type} onChange={f("type")}>
//                   {NEWS_TYPES.map((t) => <option key={t}>{t}</option>)}
//                 </select>
//               </div>
//               <div>
//                 <label style={lbl}>Date *</label>
//                 <input
//                   style={inp}
//                   type="date"
//                   value={form.date}
//                   onChange={f("date")}
//                 />
//               </div>
//             </div>

//             {/* Description */}
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Description</label>
//               <textarea
//                 style={{ ...inp, minHeight: 80, resize: "vertical" }}
//                 placeholder="Describe the news or event…"
//                 value={form.desc}
//                 onChange={f("desc")}
//               />
//             </div>

//             {/* Image upload */}
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Image (optional)</label>
//               {form.imageUrl ? (
//                 <div style={{ position: "relative", width: "fit-content" }}>
//                   <img
//                     src={form.imageUrl}
//                     alt="Preview"
//                     style={{ width: 220, height: 120, objectFit: "cover", borderRadius: 8, display: "block" }}
//                   />
//                   <button
//                     onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))}
//                     style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
//                   >✕</button>
//                 </div>
//               ) : (
//                 <div>
//                   <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect} />
//                   <button
//                     onClick={() => fileInputRef.current?.click()}
//                     disabled={uploading}
//                     style={{ padding: "10px 20px", borderRadius: 8, border: "1px dashed hsl(var(--border))", background: "hsl(var(--card))", cursor: uploading ? "not-allowed" : "pointer", fontSize: 13, color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-body)" }}
//                   >
//                     {uploading ? `Uploading… ${uploadProgress}%` : "📁 Upload image (max 5MB)"}
//                   </button>
//                   {uploading && (
//                     <div style={{ marginTop: 8, height: 4, background: "hsl(var(--border))", borderRadius: 2, overflow: "hidden", width: 200 }}>
//                       <div style={{ height: "100%", width: `${uploadProgress}%`, background: "hsl(20 100% 50%)", borderRadius: 2, transition: "width 0.2s" }} />
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* Event-only fields */}
//             {isEvent && (
//               <div
//                 style={{ marginBottom: 14, padding: "14px 16px", background: "hsl(var(--background))", borderRadius: 10, border: "1px solid hsl(20 100% 50% / 0.3)" }}
//               >
//                 <div style={{ fontWeight: 700, fontSize: 12, color: "hsl(20 100% 50%)", marginBottom: 12 }}>
//                   🎟 Event Details
//                 </div>
//                 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
//                   <div>
//                     <label style={lbl}>Registration Link</label>
//                     <input
//                       style={inp}
//                       placeholder="https://forms.gle/..."
//                       value={form.registrationLink}
//                       onChange={f("registrationLink")}
//                     />
//                   </div>
//                   <div>
//                     <label style={lbl}>Registration Cutoff</label>
//                     <input
//                       style={inp}
//                       type="date"
//                       value={form.registrationCutoff}
//                       onChange={f("registrationCutoff")}
//                     />
//                   </div>
//                   <div>
//                     <label style={lbl}>Payment Link</label>
//                     <input
//                       style={inp}
//                       placeholder="https://payfast.io/..."
//                       value={form.paymentLink}
//                       onChange={f("paymentLink")}
//                     />
//                   </div>
//                 </div>
//               </div>
//             )}

//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save} disabled={uploading}>Publish</Btn>
//               <Btn variant="subtle" onClick={() => setShowForm(false)}>Cancel</Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* List */}
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>Loading…</div>
//       ) : items.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>No posts yet.</div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//           {items.map((item) => (
//             <div
//               key={item.id}
//               style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}
//             >
//               <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
//                 {item.imageUrl && (
//                   <img
//                     src={item.imageUrl}
//                     alt={item.title}
//                     style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
//                   />
//                 )}
//                 <div>
//                   <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
//                     <span style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</span>
//                     <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: item.type === "Event" ? "hsl(20 100% 50% / 0.15)" : "hsl(var(--secondary))", color: item.type === "Event" ? "hsl(20 100% 50%)" : "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }}>
//                       {item.type}
//                     </span>
//                     {item.registrationLink && (
//                       <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "hsl(142 72% 37% / 0.12)", color: "hsl(142 72% 37%)" }}>
//                         🎟 Registration
//                       </span>
//                     )}
//                     {item.paymentLink && (
//                       <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "hsl(217 91% 53% / 0.12)", color: "hsl(217 91% 53%)" }}>
//                         💳 Payment
//                       </span>
//                     )}
//                   </div>
//                   <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 3 }}>
//                     {item.date}
//                     {item.registrationCutoff && ` · Cutoff: ${item.registrationCutoff}`}
//                   </div>
//                 </div>
//               </div>
//               <Btn variant="danger" size="sm" onClick={() => del(item.id)}>Delete</Btn>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
// // ── Members Manager ───────────────────────────────────────────────────────────
// function MembersManager({ toast }: any) {
//   const [members, setMembers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [saving, setSaving] = useState<string | null>(null);
//   const TIER_CONFIG = {
//     basic: { color: "#9ca3af", label: "Basic" },
//     silver: { color: "#e2e8f0", label: "Silver" },
//     gold: { color: "hsl(38 92% 50%)", label: "Gold" },
//   };
//   const loadMembers = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "mk2_users"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([uid, val]: [string, any]) => ({
//             uid,
//             ...val,
//             membership: val.membership ?? "basic",
//           }),
//         );
//         setMembers(list.sort((a, b) => b.createdAt - a.createdAt));
//       }
//     } catch {
//       toast("Failed to load members", "error");
//     }
//     setLoading(false);
//   };
//   useEffect(() => {
//     loadMembers();
//   }, []);
//   const setTier = async (uid: string, tier: string) => {
//     setSaving(uid);
//     try {
//       await set(ref(db, `mk2_users/${uid}/membership`), tier);
//       setMembers((prev) =>
//         prev.map((m) => (m.uid === uid ? { ...m, membership: tier } : m)),
//       );
//       toast(`Tier updated to ${tier} ✓`, "success");
//     } catch {
//       toast("Update failed", "error");
//     }
//     setSaving(null);
//   };
//   const filtered = members.filter(
//     (m) =>
//       m.name?.toLowerCase().includes(search.toLowerCase()) ||
//       m.email?.toLowerCase().includes(search.toLowerCase()),
//   );
//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Members ({members.length})
//         </div>
//         <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//           <input
//             style={{ ...inp, width: 200 }}
//             placeholder="Search name or email…"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//           />
//           <Btn variant="subtle" size="sm" onClick={loadMembers}>
//             ↻ Refresh
//           </Btn>
//         </div>
//       </div>
//       <div
//         style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
//       >
//         {(["basic", "silver", "gold"] as const).map((t) => {
//           const count = members.filter(
//             (m) => (m.membership ?? "basic") === t,
//           ).length;
//           const cfg = TIER_CONFIG[t];
//           return (
//             <div
//               key={t}
//               style={{
//                 background: `${cfg.color}15`,
//                 border: `1px solid ${cfg.color}40`,
//                 borderRadius: 8,
//                 padding: "6px 14px",
//                 fontSize: 12,
//                 fontWeight: 700,
//                 color: cfg.color,
//               }}
//             >
//               {cfg.label}: {count}
//             </div>
//           );
//         })}
//       </div>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading members…
//         </div>
//       ) : filtered.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No members found.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//           {filtered.map((m) => {
//             const cfg =
//               TIER_CONFIG[
//                 (m.membership ?? "basic") as keyof typeof TIER_CONFIG
//               ];
//             return (
//               <div
//                 key={m.uid}
//                 style={{
//                   background: "hsl(var(--secondary))",
//                   border: "1px solid hsl(var(--border))",
//                   borderRadius: 10,
//                   padding: "12px 16px",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                   flexWrap: "wrap",
//                   gap: 10,
//                   borderLeft: `3px solid ${cfg.color}`,
//                 }}
//               >
//                 <div>
//                   <div
//                     style={{
//                       fontWeight: 700,
//                       fontSize: 14,
//                       display: "flex",
//                       alignItems: "center",
//                       gap: 8,
//                     }}
//                   >
//                     {m.name || "Unnamed"}
//                     <span
//                       style={{
//                         fontSize: 10,
//                         fontWeight: 700,
//                         padding: "2px 8px",
//                         borderRadius: 20,
//                         background: `${cfg.color}20`,
//                         color: cfg.color,
//                       }}
//                     >
//                       {cfg.label}
//                     </span>
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 12,
//                       color: "hsl(var(--muted-foreground))",
//                       marginTop: 2,
//                     }}
//                   >
//                     {m.email} · {m.points ?? 0} pts · {m.checkIns?.length ?? 0}{" "}
//                     check-ins · 🎟 {m.classCredits ?? 0} credits
//                   </div>
//                 </div>
//                 <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
//                   <select
//                     value={m.membership ?? "basic"}
//                     onChange={(e) => setTier(m.uid, e.target.value)}
//                     disabled={saving === m.uid}
//                     style={{
//                       ...inp,
//                       width: "auto",
//                       padding: "6px 10px",
//                       fontSize: 12,
//                       borderColor: cfg.color,
//                       color: cfg.color,
//                     }}
//                   >
//                     <option value="basic">Basic (Free)</option>
//                     <option value="silver">Silver (R288/mo)</option>
//                     <option value="gold">Gold (R588/mo)</option>
//                   </select>
//                   {saving === m.uid && (
//                     <span
//                       style={{
//                         fontSize: 11,
//                         color: "hsl(var(--muted-foreground))",
//                       }}
//                     >
//                       Saving…
//                     </span>
//                   )}
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Packages Manager (with manual credit assignment) ─────────────────────────
// function PackagesManager({ toast }: any) {
//   const [packages, setPackages] = useState<any[]>([]);
//   const [members, setMembers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [editing, setEditing] = useState<any>(null);
//   const [assignUid, setAssignUid] = useState("");
//   const [assignCredits, setAssignCredits] = useState("10");
//   const [assignNote, setAssignNote] = useState("");
//   const [assigning, setAssigning] = useState(false);
//   const blank = {
//     name: "",
//     description: "",
//     credits: "10",
//     price: "299",
//     badge: "",
//     active: true,
//   };
//   const [form, setForm] = useState(blank);
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));

//   const loadPackages = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "packages"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([id, val]: [string, any]) => ({ id, ...val }),
//         );
//         setPackages(list.sort((a: any, b: any) => a.price - b.price));
//       } else setPackages([]);
//     } catch {
//       toast("Failed to load packages", "error");
//     }
//     setLoading(false);
//   };
//   const loadMembers = async () => {
//     try {
//       const snap = await get(ref(db, "mk2_users"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([uid, val]: [string, any]) => ({
//             uid,
//             name: val.name || "Unnamed",
//             email: val.email || "",
//             classCredits: val.classCredits ?? 0,
//           }),
//         );
//         setMembers(list.sort((a: any, b: any) => a.name.localeCompare(b.name)));
//       }
//     } catch {
//       /* non-critical */
//     }
//   };
//   useEffect(() => {
//     loadPackages();
//     loadMembers();
//   }, []);

//   const save = async () => {
//     if (!form.name || !form.credits || !form.price)
//       return toast("Fill in Name, Credits and Price", "error");
//     const data = {
//       name: form.name,
//       description: form.description,
//       credits: parseInt(form.credits),
//       price: parseInt(form.price),
//       badge: form.badge,
//       active: form.active,
//       updatedAt: Date.now(),
//     };
//     try {
//       if (editing) {
//         await set(ref(db, `packages/${editing.id}`), data);
//         toast("Updated ✓", "success");
//       } else {
//         await push(ref(db, "packages"), { ...data, createdAt: Date.now() });
//         toast("Package created ✓", "success");
//       }
//       setShowForm(false);
//       setEditing(null);
//       setForm(blank);
//       loadPackages();
//     } catch {
//       toast("Save failed", "error");
//     }
//   };
//   const toggleActive = async (pkg: any) => {
//     await set(ref(db, `packages/${pkg.id}/active`), !pkg.active);
//     toast(pkg.active ? "Package hidden" : "Package visible ✓", "info");
//     loadPackages();
//   };
//   const del = async (pkg: any) => {
//     if (!confirm(`Delete "${pkg.name}"?`)) return;
//     await remove(ref(db, `packages/${pkg.id}`));
//     toast("Deleted", "info");
//     loadPackages();
//   };
//   const startEdit = (pkg: any) => {
//     setEditing(pkg);
//     setForm({
//       name: pkg.name,
//       description: pkg.description || "",
//       credits: String(pkg.credits),
//       price: String(pkg.price),
//       badge: pkg.badge || "",
//       active: pkg.active !== false,
//     });
//     setShowForm(true);
//   };

//   const assignCreditsToUser = async () => {
//     if (!assignUid) return toast("Select a member", "error");
//     const amount = parseInt(assignCredits);
//     if (!amount || amount < 1)
//       return toast("Enter valid credit amount", "error");
//     setAssigning(true);
//     try {
//       const memberRef = ref(db, `mk2_users/${assignUid}/classCredits`);
//       const snap = await get(memberRef);
//       const current = snap.exists() ? (snap.val() as number) : 0;
//       await set(memberRef, current + amount);
//       await push(ref(db, `mk2_users/${assignUid}/creditHistory`), {
//         amount,
//         type: "manual_assign",
//         note: assignNote || "Admin assignment",
//         timestamp: Date.now(),
//         adminAssigned: true,
//       });
//       setMembers((prev) =>
//         prev.map((m) =>
//           m.uid === assignUid ? { ...m, classCredits: current + amount } : m,
//         ),
//       );
//       toast(`+${amount} credits assigned ✓`, "success");
//       setAssignNote("");
//     } catch {
//       toast("Assignment failed", "error");
//     }
//     setAssigning(false);
//   };

//   const selectedMember = members.find((m) => m.uid === assignUid);

//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 20,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Class Credit Packages ({packages.length})
//         </div>
//         <Btn
//           variant="primary"
//           size="sm"
//           onClick={() => {
//             setShowForm(!showForm);
//             setEditing(null);
//             setForm(blank);
//           }}
//         >
//           {showForm ? "✕ Cancel" : "+ New Package"}
//         </Btn>
//       </div>

//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
//               {editing ? "Edit Package" : "New Package"}
//             </div>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               <div style={{ gridColumn: "1/-1" }}>
//                 <label style={lbl}>Package Name</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. 10-Class Pack"
//                   value={form.name}
//                   onChange={f("name")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Credits</label>
//                 <input
//                   style={inp}
//                   type="number"
//                   placeholder="10"
//                   value={form.credits}
//                   onChange={f("credits")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Price (ZAR)</label>
//                 <input
//                   style={inp}
//                   type="number"
//                   placeholder="299"
//                   value={form.price}
//                   onChange={f("price")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Badge (optional)</label>
//                 <input
//                   style={inp}
//                   placeholder="Best Value"
//                   value={form.badge}
//                   onChange={f("badge")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Visible?</label>
//                 <select
//                   style={inp}
//                   value={form.active ? "true" : "false"}
//                   onChange={(e) =>
//                     setForm((p) => ({
//                       ...p,
//                       active: e.target.value === "true",
//                     }))
//                   }
//                 >
//                   <option value="true">✓ Visible</option>
//                   <option value="false">✕ Hidden</option>
//                 </select>
//               </div>
//             </div>
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Description</label>
//               <input
//                 style={inp}
//                 placeholder="e.g. Perfect for regular gym-goers"
//                 value={form.description}
//                 onChange={f("description")}
//               />
//             </div>
//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save}>
//                 {editing ? "Save Changes" : "Create Package"}
//               </Btn>
//               <Btn
//                 variant="subtle"
//                 onClick={() => {
//                   setShowForm(false);
//                   setEditing(null);
//                 }}
//               >
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : packages.length === 0 ? (
//         <div
//           style={{
//             color: "hsl(var(--muted-foreground))",
//             fontSize: 13,
//             padding: "20px 0",
//           }}
//         >
//           No packages yet.
//         </div>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
//             gap: 12,
//             marginBottom: 32,
//           }}
//         >
//           {packages.map((pkg) => (
//             <div
//               key={pkg.id}
//               style={{
//                 background: "hsl(var(--card))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 12,
//                 padding: 16,
//                 opacity: pkg.active ? 1 : 0.6,
//               }}
//             >
//               {pkg.badge && (
//                 <div
//                   style={{
//                     display: "inline-block",
//                     fontSize: 10,
//                     fontWeight: 700,
//                     padding: "2px 10px",
//                     borderRadius: 20,
//                     background: "hsl(20 100% 50% / 0.15)",
//                     color: "hsl(20 100% 50%)",
//                     border: "1px solid hsl(20 100% 50% / 0.3)",
//                     marginBottom: 10,
//                   }}
//                 >
//                   {pkg.badge}
//                 </div>
//               )}
//               <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
//                 {pkg.name}
//               </div>
//               <div
//                 style={{
//                   fontSize: 12,
//                   color: "hsl(var(--muted-foreground))",
//                   marginBottom: 10,
//                 }}
//               >
//                 {pkg.description}
//               </div>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "baseline",
//                   gap: 6,
//                   marginBottom: 4,
//                 }}
//               >
//                 <span
//                   style={{
//                     fontFamily: "var(--font-display)",
//                     fontSize: 28,
//                     color: "hsl(20 100% 50%)",
//                   }}
//                 >
//                   {pkg.credits}
//                 </span>
//                 <span
//                   style={{
//                     fontSize: 12,
//                     color: "hsl(var(--muted-foreground))",
//                   }}
//                 >
//                   credits
//                 </span>
//               </div>
//               <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
//                 R{pkg.price}
//               </div>
//               <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//                 <Btn variant="subtle" size="sm" onClick={() => startEdit(pkg)}>
//                   Edit
//                 </Btn>
//                 <Btn
//                   variant={pkg.active ? "subtle" : "green"}
//                   size="sm"
//                   onClick={() => toggleActive(pkg)}
//                 >
//                   {pkg.active ? "Hide" : "Show"}
//                 </Btn>
//                 <Btn variant="danger" size="sm" onClick={() => del(pkg)}>
//                   Delete
//                 </Btn>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       <div
//         style={{
//           borderTop: "1px solid hsl(var(--border))",
//           paddingTop: 24,
//           marginTop: 8,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
//           Manually Assign Credits
//         </div>
//         <div
//           style={{
//             fontSize: 12,
//             color: "hsl(var(--muted-foreground))",
//             marginBottom: 16,
//           }}
//         >
//           Assign credits when a member pays cash or EFT. PayFast will automate
//           this once live.
//         </div>
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
//             gap: 12,
//             marginBottom: 14,
//           }}
//         >
//           <div>
//             <label style={lbl}>Member</label>
//             <select
//               style={inp}
//               value={assignUid}
//               onChange={(e) => setAssignUid(e.target.value)}
//             >
//               <option value="">— Select member —</option>
//               {members.map((m) => (
//                 <option key={m.uid} value={m.uid}>
//                   {m.name} ({m.email}) — {m.classCredits} credits
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label style={lbl}>Credits to Add</label>
//             <input
//               style={inp}
//               type="number"
//               min="1"
//               max="100"
//               value={assignCredits}
//               onChange={(e) => setAssignCredits(e.target.value)}
//             />
//           </div>
//           <div>
//             <label style={lbl}>Note (optional)</label>
//             <input
//               style={inp}
//               placeholder="e.g. Cash payment - 10-pack"
//               value={assignNote}
//               onChange={(e) => setAssignNote(e.target.value)}
//             />
//           </div>
//         </div>
//         {selectedMember && (
//           <div
//             style={{
//               fontSize: 12,
//               color: "hsl(var(--muted-foreground))",
//               marginBottom: 12,
//               padding: "8px 12px",
//               background: "hsl(var(--secondary))",
//               borderRadius: 8,
//             }}
//           >
//             {selectedMember.name} has{" "}
//             <strong style={{ color: "hsl(20 100% 50%)" }}>
//               {selectedMember.classCredits}
//             </strong>{" "}
//             credits → after:{" "}
//             <strong style={{ color: "hsl(142 72% 37%)" }}>
//               {selectedMember.classCredits + parseInt(assignCredits || "0")}
//             </strong>
//           </div>
//         )}
//         <Btn
//           variant="green"
//           onClick={assignCreditsToUser}
//           disabled={assigning || !assignUid}
//         >
//           {assigning ? "Assigning…" : `✓ Assign ${assignCredits} Credits`}
//         </Btn>
//       </div>
//     </div>
//   );
// }

// // ── Ad Enquiries Manager ──────────────────────────────────────────────────────
// function AdEnquiriesManager({ toast }: any) {
//   const [enquiries, setEnquiries] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState("all");
//   const load = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "ad_enquiries"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([k, v]: [string, any]) => ({ key: k, ...v }),
//         );
//         setEnquiries(
//           list.sort(
//             (a, b) =>
//               new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
//           ),
//         );
//       } else setEnquiries([]);
//     } catch {
//       toast("Failed to load enquiries", "error");
//     }
//     setLoading(false);
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   const updateStatus = async (key: string, status: string) => {
//     await set(ref(db, `ad_enquiries/${key}/status`), status);
//     setEnquiries((prev) =>
//       prev.map((e) => (e.key === key ? { ...e, status } : e)),
//     );
//     toast(`Status updated to ${status}`, "success");
//   };
//   const deleteEnquiry = async (key: string) => {
//     if (!confirm("Delete this enquiry?")) return;
//     await remove(ref(db, `ad_enquiries/${key}`));
//     setEnquiries((prev) => prev.filter((e) => e.key !== key));
//     toast("Deleted", "info");
//   };
//   const STATUS_COLORS: any = {
//     new: { bg: "hsl(20 100% 50% / 0.15)", color: "hsl(20 100% 50%)" },
//     contacted: { bg: "hsl(217 91% 53% / 0.15)", color: "hsl(217 91% 53%)" },
//     confirmed: { bg: "hsl(142 72% 37% / 0.15)", color: "hsl(142 72% 37%)" },
//     declined: { bg: "hsl(0 84% 51% / 0.15)", color: "hsl(0 84% 51%)" },
//   };
//   const filtered =
//     filter === "all" ? enquiries : enquiries.filter((e) => e.status === filter);
//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Ad Enquiries ({enquiries.length})
//         </div>
//         <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//           {["all", "new", "contacted", "confirmed", "declined"].map((s) => (
//             <button
//               key={s}
//               onClick={() => setFilter(s)}
//               style={{
//                 padding: "5px 12px",
//                 borderRadius: 20,
//                 fontSize: 11,
//                 fontWeight: 700,
//                 cursor: "pointer",
//                 textTransform: "capitalize",
//                 background:
//                   filter === s ? "hsl(20 100% 50%)" : "hsl(var(--secondary))",
//                 color: filter === s ? "#000" : "hsl(var(--foreground))",
//                 border: filter === s ? "none" : "1px solid hsl(var(--border))",
//               }}
//             >
//               {s}
//             </button>
//           ))}
//           <Btn variant="subtle" size="sm" onClick={load}>
//             ↻ Refresh
//           </Btn>
//         </div>
//       </div>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : filtered.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No enquiries found.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//           {filtered.map((e) => {
//             const sc = STATUS_COLORS[e.status] || STATUS_COLORS.new;
//             return (
//               <div
//                 key={e.key}
//                 style={{
//                   background: "hsl(var(--secondary))",
//                   border: "1px solid hsl(var(--border))",
//                   borderRadius: 10,
//                   padding: "14px 16px",
//                   borderLeft: `3px solid ${sc.color}`,
//                 }}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "flex-start",
//                     flexWrap: "wrap",
//                     gap: 10,
//                     marginBottom: 10,
//                   }}
//                 >
//                   <div>
//                     <div
//                       style={{
//                         fontWeight: 700,
//                         fontSize: 14,
//                         display: "flex",
//                         alignItems: "center",
//                         gap: 8,
//                       }}
//                     >
//                       {e.bizName}
//                       <span
//                         style={{
//                           fontSize: 10,
//                           fontWeight: 700,
//                           padding: "2px 8px",
//                           borderRadius: 20,
//                           background: sc.bg,
//                           color: sc.color,
//                           textTransform: "capitalize",
//                         }}
//                       >
//                         {e.status}
//                       </span>
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 12,
//                         color: "hsl(var(--muted-foreground))",
//                         marginTop: 3,
//                       }}
//                     >
//                       {e.contactName} · {e.email} {e.phone && `· ${e.phone}`}
//                     </div>
//                     {e.message && (
//                       <div
//                         style={{
//                           fontSize: 12,
//                           color: "hsl(var(--foreground))",
//                           marginTop: 6,
//                           fontStyle: "italic",
//                         }}
//                       >
//                         "{e.message}"
//                       </div>
//                     )}
//                   </div>
//                   <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
//                     <Btn
//                       variant="subtle"
//                       size="sm"
//                       onClick={() => updateStatus(e.key, "contacted")}
//                     >
//                       Contacted
//                     </Btn>
//                     <Btn
//                       variant="green"
//                       size="sm"
//                       onClick={() => updateStatus(e.key, "confirmed")}
//                     >
//                       ✓ Confirmed
//                     </Btn>
//                     <Btn
//                       variant="danger"
//                       size="sm"
//                       onClick={() => deleteEnquiry(e.key)}
//                     >
//                       Delete
//                     </Btn>
//                   </div>
//                 </div>
//                 <a
//                   href={`mailto:${e.email}?subject=Re: Advertising Enquiry — MK Two Rivers`}
//                   style={{
//                     fontSize: 11,
//                     fontWeight: 700,
//                     color: "hsl(217 91% 53%)",
//                     textDecoration: "none",
//                   }}
//                 >
//                   ✉ Reply via email →
//                 </a>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Feedback Manager ──────────────────────────────────────────────────────────
// function FeedbackManager({ toast }: any) {
//   const [feedback, setFeedback] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState("all");

//   // Google Review URL state
//   const [reviewUrl, setReviewUrl] = useState("");
//   const [savingUrl, setSavingUrl] = useState(false);

//   const TYPES = [
//     "all",
//     "Feature suggestion",
//     "Bug / issue report",
//     "App improvement",
//     "General comment",
//   ];

//   // Load existing Google Review URL
//   useEffect(() => {
//     get(ref(db, "admin_config/googleReviewUrl")).then((snap) => {
//       if (snap.exists()) setReviewUrl(snap.val());
//     });
//   }, []);

//   const load = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "app_feedback"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([k, v]: [string, any]) => ({ key: k, ...v })
//         );
//         setFeedback(
//           list.sort(
//             (a, b) =>
//               new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
//           )
//         );
//       } else setFeedback([]);
//     } catch {
//       toast("Failed to load feedback", "error");
//     }
//     setLoading(false);
//   };

//   useEffect(() => {
//     load();
//   }, []);

//   const deleteFb = async (key: string) => {
//     if (!confirm("Delete this feedback?")) return;
//     await remove(ref(db, `app_feedback/${key}`));
//     setFeedback((prev) => prev.filter((f) => f.key !== key));
//     toast("Deleted", "info");
//   };

//   const saveReviewUrl = async () => {
//     setSavingUrl(true);
//     try {
//       await set(ref(db, "admin_config/googleReviewUrl"), reviewUrl);
//       toast("Google Review URL saved ✓", "success");
//     } catch {
//       toast("Failed to save URL", "error");
//     }
//     setSavingUrl(false);
//   };

//   const avgRating = feedback.length
//     ? (
//         feedback.reduce((s, f) => s + (f.rating || 0), 0) / feedback.length
//       ).toFixed(1)
//     : "—";
//   const filtered =
//     filter === "all" ? feedback : feedback.filter((f) => f.type === filter);

//   return (
//     <div>
//       {/* ─── Google Review URL config card ─── */}
//       <div
//         style={{
//           background: "hsl(var(--secondary))",
//           border: "1px solid hsl(var(--border))",
//           borderRadius: 12,
//           padding: "14px 16px",
//           marginBottom: 20,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
//           ⭐ Google Review Link
//         </div>
//         <div
//           style={{
//             fontSize: 12,
//             color: "hsl(var(--muted-foreground))",
//             marginBottom: 10,
//           }}
//         >
//           This link appears on the Contact &amp; Feedback page for members to leave a review.
//         </div>
//         <div style={{ display: "flex", gap: 8 }}>
//           <input
//             style={{
//               flex: 1,
//               padding: "8px 12px",
//               borderRadius: 8,
//               border: "1px solid hsl(var(--border))",
//               background: "hsl(var(--background))",
//               color: "hsl(var(--foreground))",
//               fontSize: 13,
//               outline: "none",
//             }}
//             placeholder="https://g.page/r/your-review-link"
//             value={reviewUrl}
//             onChange={(e) => setReviewUrl(e.target.value)}
//           />
//           <Btn variant="primary" size="sm" onClick={saveReviewUrl} disabled={savingUrl}>
//             {savingUrl ? "Saving…" : "Save"}
//           </Btn>
//         </div>
//       </div>

//       {/* Header / stats */}
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           App Feedback ({feedback.length}) · Avg: {avgRating}★
//         </div>
//         <Btn variant="subtle" size="sm" onClick={load}>
//           ↻ Refresh
//         </Btn>
//       </div>

//       {/* Filter buttons */}
//       <div
//         style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
//       >
//         {TYPES.map((t) => (
//           <button
//             key={t}
//             onClick={() => setFilter(t)}
//             style={{
//               padding: "5px 12px",
//               borderRadius: 20,
//               fontSize: 11,
//               fontWeight: 700,
//               cursor: "pointer",
//               background:
//                 filter === t ? "hsl(217 91% 53%)" : "hsl(var(--secondary))",
//               color: filter === t ? "#fff" : "hsl(var(--foreground))",
//               border: filter === t ? "none" : "1px solid hsl(var(--border))",
//             }}
//           >
//             {t === "all" ? "All" : t}
//           </button>
//         ))}
//       </div>

//       {/* Feedback list */}
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : filtered.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No feedback yet.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//           {filtered.map((f) => (
//             <div
//               key={f.key}
//               style={{
//                 background: "hsl(var(--secondary))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 10,
//                 padding: "12px 16px",
//                 borderLeft: "3px solid hsl(217 91% 53%)",
//               }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "flex-start",
//                   flexWrap: "wrap",
//                   gap: 8,
//                 }}
//               >
//                 <div>
//                   <div
//                     style={{
//                       fontWeight: 700,
//                       fontSize: 13,
//                       display: "flex",
//                       alignItems: "center",
//                       gap: 8,
//                     }}
//                   >
//                     {f.name}
//                     <span
//                       style={{
//                         fontSize: 10,
//                         padding: "2px 8px",
//                         borderRadius: 20,
//                         background: "hsl(217 91% 53% / 0.15)",
//                         color: "hsl(217 91% 53%)",
//                         fontWeight: 700,
//                       }}
//                     >
//                       {f.type}
//                     </span>
//                     <span
//                       style={{
//                         color: "hsl(38 92% 44%)",
//                         fontSize: 12,
//                         fontWeight: 700,
//                       }}
//                     >
//                       {"★".repeat(f.rating || 0)}
//                     </span>
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 11,
//                       color: "hsl(var(--muted-foreground))",
//                       marginTop: 2,
//                     }}
//                   >
//                     {f.email} ·{" "}
//                     {new Date(f.timestamp).toLocaleDateString("en-ZA")}
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 13,
//                       color: "hsl(var(--foreground))",
//                       marginTop: 6,
//                       lineHeight: 1.6,
//                     }}
//                   >
//                     {f.message}
//                   </div>
//                 </div>
//                 <Btn variant="danger" size="sm" onClick={() => deleteFb(f.key)}>
//                   Delete
//                 </Btn>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Community Manager ─────────────────────────────────────────────────────────
// function CommunityManager({ toast }: any) {
//   const [rooms, setRooms] = useState<string[]>([]);
//   const [newRoom, setNewRoom] = useState("");
//   const [newRoomDesc, setNewRoomDesc] = useState("");
//   const [savingRoom, setSavingRoom] = useState(false);

//   // Poll state
//   const [selectedRoom, setSelectedRoom] = useState("");
//   const [pollQuestion, setPollQuestion] = useState("");
//   const [pollOptions, setPollOptions] = useState(["", ""]);
//   const [pollHours, setPollHours] = useState(24);
//   const [sendingPoll, setSendingPoll] = useState(false);

//   useEffect(() => {
//     get(ref(db, "community_rooms")).then((snap) => {
//       if (snap.exists()) {
//         const data = snap.val();
//         setRooms(Object.values(data).map((r: any) => r.name));
//       } else {
//         // Seed defaults if nothing in Firebase yet
//         setRooms([
//           "💬 MK2R General",
//           "🏆 MK2R Competitive Group",
//           "🔥 MK2R Hyrox",
//           "💼 MK2R Business Hub",
//         ]);
//       }
//     });
//   }, []);

//   const addRoom = async () => {
//     const trimmed = newRoom.trim();
//     if (!trimmed) return toast("Enter a room name", "error");
//     if (rooms.includes(trimmed)) return toast("Room already exists", "error");
//     setSavingRoom(true);
//     try {
//       const updated = [...rooms, trimmed];
//       // Save all rooms as an array in Firebase
//       const roomsObj = updated.reduce((acc: any, name, i) => {
//         acc[`room_${i}`] = { name, desc: i === rooms.length ? newRoomDesc : "" };
//         return acc;
//       }, {});
//       await set(ref(db, "community_rooms"), roomsObj);
//       setRooms(updated);
//       setNewRoom("");
//       setNewRoomDesc("");
//       toast(`Room "${trimmed}" created ✓`, "success");
//     } catch {
//       toast("Failed to create room", "error");
//     }
//     setSavingRoom(false);
//   };

//   const deleteRoom = async (roomName: string) => {
//     if (!confirm(`Delete "${roomName}"? All messages will be lost.`)) return;
//     try {
//       const updated = rooms.filter((r) => r !== roomName);
//       const roomsObj = updated.reduce((acc: any, name, i) => {
//         acc[`room_${i}`] = { name, desc: "" };
//         return acc;
//       }, {});
//       await set(ref(db, "community_rooms"), roomsObj);
//       // Also remove messages
//       await remove(ref(db, `rooms/${roomName}`));
//       setRooms(updated);
//       toast("Room deleted", "info");
//     } catch {
//       toast("Delete failed", "error");
//     }
//   };

//   const sendPoll = async () => {
//     if (!selectedRoom) return toast("Select a room", "error");
//     if (!pollQuestion.trim()) return toast("Enter a question", "error");
//     const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
//     if (cleanOptions.length < 2) return toast("At least 2 options required", "error");
//     if (pollHours <= 0) return toast("Set a duration", "error");

//     setSendingPoll(true);
//     try {
//       await push(ref(db, `rooms/${selectedRoom}/polls`), {
//         type: "poll",
//         question: pollQuestion,
//         options: cleanOptions,
//         votes: {},
//         uid: "admin",
//         user: "MK2 Admin",
//         createdAt: Date.now(),
//         expiresAt: Date.now() + pollHours * 3600000,
//       });
//       toast(`Poll sent to "${selectedRoom}" ✓`, "success");
//       setPollQuestion("");
//       setPollOptions(["", ""]);
//       setPollHours(24);
//       setSelectedRoom("");
//     } catch {
//       toast("Failed to send poll", "error");
//     }
//     setSendingPoll(false);
//   };

//   return (
//     <div>
//       <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
//         Community Chat
//       </div>
//       <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 20 }}>
//         Manage chat rooms and create polls for members.
//       </div>

//       {/* ── Chat Rooms ── */}
//       <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Chat Rooms ({rooms.length})</div>

//       <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
//         {rooms.map((roomName) => (
//           <div
//             key={roomName}
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//               padding: "10px 14px",
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 10,
//               flexWrap: "wrap",
//               gap: 8,
//             }}
//           >
//             <span style={{ fontWeight: 700, fontSize: 13 }}>{roomName}</span>
//             <Btn variant="danger" size="sm" onClick={() => deleteRoom(roomName)}>Delete</Btn>
//           </div>
//         ))}
//       </div>

//       {/* Add room */}
//       <div style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: "16px 20px", marginBottom: 28 }}>
//         <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>+ New Chat Room</div>
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 12 }}>
//           <div>
//             <label style={lbl}>Room Name *</label>
//             <input
//               style={inp}
//               placeholder="e.g. 🧘 MK2R Yoga"
//               value={newRoom}
//               onChange={(e) => setNewRoom(e.target.value)}
//               onKeyDown={(e) => e.key === "Enter" && addRoom()}
//             />
//           </div>
//           <div>
//             <label style={lbl}>Description</label>
//             <input
//               style={inp}
//               placeholder="Short description…"
//               value={newRoomDesc}
//               onChange={(e) => setNewRoomDesc(e.target.value)}
//             />
//           </div>
//         </div>
//         <Btn variant="primary" size="sm" onClick={addRoom} disabled={savingRoom}>
//           {savingRoom ? "Creating…" : "Create Room"}
//         </Btn>
//       </div>

//       {/* ── Create Poll ── */}
//       <div style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: 24 }}>
//         <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>📊 Create Poll</div>
//         <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 16 }}>
//           Send a poll to any chat room. Only admins can create polls.
//         </div>

//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 12 }}>
//           <div>
//             <label style={lbl}>Room *</label>
//             <select style={inp} value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
//               <option value="">— Select room —</option>
//               {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
//             </select>
//           </div>
//           <div>
//             <label style={lbl}>Duration (hours) *</label>
//             <select style={inp} value={pollHours} onChange={(e) => setPollHours(Number(e.target.value))}>
//               {[1, 2, 4, 6, 12, 24, 48, 72].map((h) => (
//                 <option key={h} value={h}>{h}h</option>
//               ))}
//             </select>
//           </div>
//           <div style={{ gridColumn: "1/-1" }}>
//             <label style={lbl}>Question *</label>
//             <input
//               style={inp}
//               placeholder="What do you want to ask members?"
//               value={pollQuestion}
//               onChange={(e) => setPollQuestion(e.target.value)}
//             />
//           </div>
//         </div>

//         {/* Poll options */}
//         <div style={{ marginBottom: 12 }}>
//           <label style={lbl}>Options *</label>
//           {pollOptions.map((opt, i) => (
//             <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
//               <input
//                 style={{ ...inp, flex: 1 }}
//                 placeholder={`Option ${i + 1}`}
//                 value={opt}
//                 onChange={(e) => {
//                   const updated = [...pollOptions];
//                   updated[i] = e.target.value;
//                   setPollOptions(updated);
//                 }}
//               />
//               {pollOptions.length > 2 && (
//                 <button
//                   onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
//                   style={{ background: "hsl(0 84% 51% / 0.1)", border: "1px solid hsl(0 84% 51% / 0.3)", color: "hsl(0 84% 51%)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}
//                 >✕</button>
//               )}
//             </div>
//           ))}
//           <button
//             onClick={() => setPollOptions([...pollOptions, ""])}
//             style={{ padding: "6px 14px", borderRadius: 8, border: "1px dashed hsl(20 100% 50% / 0.4)", background: "hsl(20 100% 50% / 0.06)", color: "hsl(20 100% 50%)", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-body)" }}
//           >
//             + Add Option
//           </button>
//         </div>

//         <Btn variant="primary" onClick={sendPoll} disabled={sendingPoll}>
//           {sendingPoll ? "Sending…" : "📊 Send Poll to Room"}
//         </Btn>
//       </div>
//     </div>
//   );
// }

// function InstagramSetup() {
//   return (
//     <div>
//       <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
//         Instagram Auto-Sync Setup
//       </div>
//       <div
//         style={{
//           background: "hsl(var(--secondary))",
//           border: "1px solid hsl(20 100% 50% / 0.3)",
//           borderRadius: 12,
//           padding: 20,
//         }}
//       >
//         <div
//           style={{
//             fontWeight: 700,
//             color: "hsl(20 100% 50%)",
//             marginBottom: 8,
//           }}
//         >
//           Status: Pending Meta Approval
//         </div>
//         <div
//           style={{
//             fontSize: 13,
//             color: "hsl(var(--muted-foreground))",
//             lineHeight: 1.8,
//           }}
//         >
//           Once approved, new posts on the gym's Instagram will automatically
//           appear in the Gallery section.
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Terms Manager ─────────────────────────────────────────────────────────────
// function TermsManager({ toast }: any) {
//   const [records, setRecords] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   const load = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "terms_acceptance"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([uid, val]: [string, any]) => ({ uid, ...val }),
//         );
//         setRecords(list.sort((a, b) => b.acceptedAt - a.acceptedAt));
//       } else setRecords([]);
//     } catch {
//       toast("Failed to load records", "error");
//     }
//     setLoading(false);
//   };

//   useEffect(() => {
//     load();
//   }, []);

//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           T&C Acceptance Records ({records.length})
//         </div>
//         <Btn variant="subtle" size="sm" onClick={load}>
//           ↻ Refresh
//         </Btn>
//       </div>
//       <div
//         style={{
//           fontSize: 12,
//           color: "hsl(var(--muted-foreground))",
//           marginBottom: 16,
//           padding: "10px 14px",
//           background: "hsl(142 72% 37% / 0.1)",
//           border: "1px solid hsl(142 72% 37% / 0.3)",
//           borderRadius: 8,
//         }}
//       >
//         ✓ These records confirm each member has accepted the Terms & Conditions.
//         POPIA compliant audit log.
//       </div>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : records.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No records yet.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//           {records.map((r) => (
//             <div
//               key={r.uid}
//               style={{
//                 background: "hsl(var(--secondary))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 10,
//                 padding: "12px 16px",
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 flexWrap: "wrap",
//                 gap: 10,
//                 borderLeft: "3px solid hsl(142 72% 37%)",
//               }}
//             >
//               <div>
//                 <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</div>
//                 <div
//                   style={{
//                     fontSize: 11,
//                     color: "hsl(var(--muted-foreground))",
//                     marginTop: 2,
//                   }}
//                 >
//                   {r.email} · Version: {r.termsVersion}
//                 </div>
//               </div>
//               <div
//                 style={{
//                   fontSize: 11,
//                   color: "hsl(var(--muted-foreground))",
//                   textAlign: "right",
//                 }}
//               >
//                 <div style={{ fontWeight: 700, color: "hsl(142 72% 37%)" }}>
//                   ✓ Accepted
//                 </div>
//                 <div>
//                   {new Date(r.acceptedAt).toLocaleDateString("en-ZA", {
//                     day: "numeric",
//                     month: "long",
//                     year: "numeric",
//                     hour: "2-digit",
//                     minute: "2-digit",
//                   })}
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Banners Manager ───────────────────────────────────────────────────────────
// function BannersManager({ toast }: any) {
//   const [banners, setBanners] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const blank = {
//     title: "",
//     subtitle: "",
//     emoji: "🔥",
//     imageUrl: "",
//     actionType: "url",   // "url" | "whatsapp" | "email"
//     actionValue: "",     // the URL, phone number, or email address
//     cta: "Learn More",
//     size: "medium",      // "small" | "medium" | "large"
//     status: "draft",     // "published" | "draft"
//     activatesAt: "",     // date string
//     periodMonths: "1",   // "1" | "2" | "3" | "6" | "12"
//     expiresAt: "",       // auto-computed, stored as timestamp
//   };
//   const [form, setForm] = useState(blank);
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));

//   // Auto-compute expiresAt when activatesAt or periodMonths changes
//   useEffect(() => {
//     if (!form.activatesAt || !form.periodMonths) return;
//     const start = new Date(form.activatesAt);
//     start.setMonth(start.getMonth() + parseInt(form.periodMonths));
//     setForm((p) => ({ ...p, expiresAt: start.toISOString().split("T")[0] }));
//   }, [form.activatesAt, form.periodMonths]);

//   const load = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "ad_banners"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([id, val]: [string, any]) => ({ id, ...val }),
//         );
//         setBanners(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
//       } else setBanners([]);
//     } catch {
//       toast("Failed to load banners", "error");
//     }
//     setLoading(false);
//   };

//   useEffect(() => { load(); }, []);

//   // ── Image upload ──────────────────────────────────────────────────────────
//   const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     if (!file.type.startsWith("image/")) {
//       toast("Please select an image file", "error");
//       return;
//     }
//     if (file.size > 5 * 1024 * 1024) {
//       toast("Image must be under 5MB", "error");
//       return;
//     }
//     setUploading(true);
//     setUploadProgress(0);
//     try {
//       const storage = getStorage();
//       const fileName = `banners/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
//       const sRef = storageRef(storage, fileName);
//       const uploadTask = uploadBytesResumable(sRef, file);
//       uploadTask.on(
//         "state_changed",
//         (snapshot) => {
//           setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
//         },
//         () => { toast("Upload failed", "error"); setUploading(false); },
//         async () => {
//           const url = await getDownloadURL(uploadTask.snapshot.ref);
//           setForm((p) => ({ ...p, imageUrl: url }));
//           toast("Image uploaded ✓", "success");
//           setUploading(false);
//           setUploadProgress(0);
//         },
//       );
//     } catch {
//       toast("Upload error", "error");
//       setUploading(false);
//     }
//   };

//   const save = async () => {
//     if (!form.title) return toast("Enter a title", "error");
//     if (!form.activatesAt) return toast("Set an activation date", "error");
//     if (!form.actionValue) return toast("Enter an action URL, WhatsApp number or email", "error");

//     // Build the click URL from actionType + actionValue
//     let url = form.actionValue;
//     if (form.actionType === "whatsapp") {
//       const digits = form.actionValue.replace(/\D/g, "");
//       url = `https://wa.me/${digits}`;
//     } else if (form.actionType === "email") {
//       url = `mailto:${form.actionValue}`;
//     }

//     try {
//       await push(ref(db, "ad_banners"), {
//         title: form.title,
//         subtitle: form.subtitle,
//         emoji: form.emoji,
//         imageUrl: form.imageUrl,
//         url,
//         cta: form.cta,
//         size: form.size,
//         status: form.status,
//         activatesAt: new Date(form.activatesAt).getTime(),
//         expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : null,
//         periodMonths: parseInt(form.periodMonths),
//         active: form.status === "published",
//         createdAt: Date.now(),
//       });
//       toast("Banner created ✓", "success");
//       setShowForm(false);
//       setForm(blank);
//       load();
//     } catch {
//       toast("Save failed", "error");
//     }
//   };

//   const toggleStatus = async (banner: any) => {
//     const newActive = !banner.active;
//     await set(ref(db, `ad_banners/${banner.id}/active`), newActive);
//     await set(ref(db, `ad_banners/${banner.id}/status`), newActive ? "published" : "draft");
//     toast(newActive ? "Banner published ✓" : "Banner set to draft", "info");
//     load();
//   };

//   const del = async (id: string) => {
//     if (!confirm("Delete this banner?")) return;
//     await remove(ref(db, `ad_banners/${id}`));
//     toast("Deleted", "info");
//     load();
//   };

//   const SIZE_LABELS: Record<string, string> = {
//     small: "Small (notification strip)",
//     medium: "Medium (card)",
//     large: "Large (hero)",
//   };

//   return (
//     <div>
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
//         <div style={{ fontWeight: 700, fontSize: 15 }}>Ad Banners ({banners.length})</div>
//         <Btn variant="primary" size="sm" onClick={() => { setShowForm(!showForm); setForm(blank); }}>
//           {showForm ? "✕ Cancel" : "+ New Banner"}
//         </Btn>
//       </div>

//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 20, marginBottom: 20 }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>New Banner</div>

//             {/* Image upload */}
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Banner Image (optional)</label>
//               {form.imageUrl ? (
//                 <div style={{ position: "relative", width: "fit-content" }}>
//                   <img src={form.imageUrl} alt="Preview" style={{ width: 220, height: 100, objectFit: "cover", borderRadius: 8, display: "block" }} />
//                   <button
//                     onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))}
//                     style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
//                   >✕</button>
//                 </div>
//               ) : (
//                 <div>
//                   <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect} />
//                   <button
//                     onClick={() => fileInputRef.current?.click()}
//                     disabled={uploading}
//                     style={{ padding: "10px 20px", borderRadius: 8, border: "1px dashed hsl(var(--border))", background: "hsl(var(--card))", cursor: uploading ? "not-allowed" : "pointer", fontSize: 13, color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-body)" }}
//                   >
//                     {uploading ? `Uploading… ${uploadProgress}%` : "📁 Upload image (max 5MB)"}
//                   </button>
//                   {uploading && (
//                     <div style={{ marginTop: 8, height: 4, background: "hsl(var(--border))", borderRadius: 2, overflow: "hidden", width: 200 }}>
//                       <div style={{ height: "100%", width: `${uploadProgress}%`, background: "hsl(20 100% 50%)", borderRadius: 2, transition: "width 0.2s" }} />
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* Core fields */}
//             <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 12 }}>
//               <div style={{ gridColumn: "1/-1" }}>
//                 <label style={lbl}>Title *</label>
//                 <input style={inp} placeholder="e.g. Ruimsig Pharmacy" value={form.title} onChange={f("title")} />
//               </div>
//               <div>
//                 <label style={lbl}>Subtitle</label>
//                 <input style={inp} placeholder="Short tagline" value={form.subtitle} onChange={f("subtitle")} />
//               </div>
//               <div>
//                 <label style={lbl}>Emoji</label>
//                 <input style={inp} placeholder="🔥" value={form.emoji} onChange={f("emoji")} />
//               </div>
//               <div>
//                 <label style={lbl}>Button Text</label>
//                 <input style={inp} placeholder="Learn More" value={form.cta} onChange={f("cta")} />
//               </div>

//               {/* Banner size */}
//               <div>
//                 <label style={lbl}>Banner Size</label>
//                 <select style={inp} value={form.size} onChange={f("size")}>
//                   <option value="small">Small — notification strip</option>
//                   <option value="medium">Medium — card</option>
//                   <option value="large">Large — hero</option>
//                 </select>
//               </div>

//               {/* Status */}
//               <div>
//                 <label style={lbl}>Status</label>
//                 <select style={inp} value={form.status} onChange={f("status")}>
//                   <option value="draft">✎ Draft</option>
//                   <option value="published">● Published</option>
//                 </select>
//               </div>

//               {/* Activation date */}
//               <div>
//                 <label style={lbl}>Activation Date *</label>
//                 <input style={inp} type="date" value={form.activatesAt} onChange={f("activatesAt")} />
//               </div>

//               {/* Period */}
//               <div>
//                 <label style={lbl}>Period</label>
//                 <select style={inp} value={form.periodMonths} onChange={f("periodMonths")}>
//                   <option value="1">1 month</option>
//                   <option value="2">2 months</option>
//                   <option value="3">3 months</option>
//                   <option value="6">6 months</option>
//                   <option value="12">12 months</option>
//                 </select>
//               </div>

//               {/* Auto-populated expiry */}
//               <div>
//                 <label style={lbl}>Expiry Date (auto)</label>
//                 <input
//                   style={{ ...inp, opacity: 0.7 }}
//                   type="date"
//                   value={form.expiresAt}
//                   readOnly
//                   placeholder="Set activation date + period"
//                 />
//               </div>
//             </div>

//             {/* Action button */}
//             <div style={{ marginBottom: 14, padding: "14px 16px", background: "hsl(var(--background))", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
//               <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>Action Button *</div>
//               <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
//                 {(["url", "whatsapp", "email"] as const).map((t) => (
//                   <button
//                     key={t}
//                     onClick={() => setForm((p) => ({ ...p, actionType: t, actionValue: "" }))}
//                     style={{
//                       padding: "6px 14px",
//                       borderRadius: 8,
//                       fontSize: 11,
//                       fontWeight: 700,
//                       cursor: "pointer",
//                       border: `1px solid ${form.actionType === t ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
//                       background: form.actionType === t ? "hsl(20 100% 50%)" : "transparent",
//                       color: form.actionType === t ? "#000" : "hsl(var(--foreground))",
//                       fontFamily: "var(--font-body)",
//                     }}
//                   >
//                     {t === "url" ? "🔗 URL" : t === "whatsapp" ? "💬 WhatsApp" : "✉ Email"}
//                   </button>
//                 ))}
//               </div>
//               <input
//                 style={inp}
//                 placeholder={
//                   form.actionType === "url"
//                     ? "https://yourbusiness.co.za"
//                     : form.actionType === "whatsapp"
//                     ? "e.g. 27821234567"
//                     : "e.g. info@yourbusiness.co.za"
//                 }
//                 value={form.actionValue}
//                 onChange={f("actionValue")}
//               />
//               <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 6 }}>
//                 {form.actionType === "whatsapp"
//                   ? "Enter number with country code (no +). e.g. 27821234567"
//                   : form.actionType === "email"
//                   ? "Members will open their mail app to contact you."
//                   : "Full URL including https://"}
//               </div>
//             </div>

//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save} disabled={uploading}>Create Banner</Btn>
//               <Btn variant="subtle" onClick={() => setShowForm(false)}>Cancel</Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Banner list */}
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>Loading…</div>
//       ) : banners.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>No banners yet.</div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//           {banners.map((b) => {
//             const isPublished = b.active;
//             const now = Date.now();
//             const isExpired = b.expiresAt && now > b.expiresAt;
//             const isPending = b.activatesAt && now < b.activatesAt;
//             return (
//               <div
//                 key={b.id}
//                 style={{
//                   background: "hsl(var(--secondary))",
//                   border: "1px solid hsl(var(--border))",
//                   borderRadius: 10,
//                   padding: "12px 16px",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                   flexWrap: "wrap",
//                   gap: 10,
//                   borderLeft: `3px solid ${isPublished && !isExpired ? "hsl(142 72% 37%)" : "hsl(var(--border))"}`,
//                   opacity: isExpired ? 0.6 : 1,
//                 }}
//               >
//                 <div>
//                   <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
//                     {b.emoji} {b.title}
//                     {/* Status badge */}
//                     <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: isExpired ? "hsl(0 84% 51% / 0.12)" : isPublished ? "hsl(142 72% 37% / 0.12)" : "hsl(var(--secondary))", color: isExpired ? "hsl(0 84% 51%)" : isPublished ? "hsl(142 72% 37%)" : "hsl(var(--muted-foreground))" }}>
//                       {isExpired ? "⚠ Expired" : isPublished ? "● Published" : "✎ Draft"}
//                     </span>
//                     {/* Pending badge */}
//                     {isPending && !isExpired && (
//                       <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "hsl(38 92% 44% / 0.12)", color: "hsl(38 92% 44%)" }}>
//                         ⏳ Pending
//                       </span>
//                     )}
//                     {/* Size badge */}
//                     <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "hsl(217 91% 53% / 0.12)", color: "hsl(217 91% 53%)" }}>
//                       {SIZE_LABELS[b.size] ?? b.size}
//                     </span>
//                   </div>
//                   <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 3 }}>
//                     {b.subtitle && `${b.subtitle} · `}
//                     {b.activatesAt ? `Starts ${new Date(b.activatesAt).toLocaleDateString("en-ZA")}` : "No start date"}
//                     {b.expiresAt ? ` · Expires ${new Date(b.expiresAt).toLocaleDateString("en-ZA")}` : " · No expiry"}
//                     {b.periodMonths ? ` · ${b.periodMonths} month${b.periodMonths > 1 ? "s" : ""}` : ""}
//                   </div>
//                 </div>
//                 <div style={{ display: "flex", gap: 8 }}>
//                   <Btn variant={isPublished ? "subtle" : "green"} size="sm" onClick={() => toggleStatus(b)}>
//                     {isPublished ? "Set Draft" : "Publish"}
//                   </Btn>
//                   <Btn variant="danger" size="sm" onClick={() => del(b.id)}>Delete</Btn>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// // // ── Challenges Manager ────────────────────────────────────────────────────────
// // function ChallengesManager({ toast }: any) {
// //   const [challenges, setChallenges] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [showForm, setShowForm] = useState(false);
// //   const blank = {
// //     name: "",
// //     exercise: "",
// //     description: "",
// //     startDate: "",
// //     endDate: "",
// //     metric: "reps",
// //     prize: "",
// //     color: "hsl(20 100% 50%)",
// //     active: true,
// //   };
// //   const [form, setForm] = useState(blank);
// //   const f = (k: string) => (e: any) =>
// //     setForm((p) => ({ ...p, [k]: e.target.value }));

// //   const load = async () => {
// //     setLoading(true);
// //     try {
// //       const snap = await get(ref(db, "challenges"));
// //       if (snap.exists()) {
// //         const list = Object.entries(snap.val()).map(
// //           ([id, val]: [string, any]) => ({ id, ...val }),
// //         );
// //         setChallenges(
// //           list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
// //         );
// //       } else setChallenges([]);
// //     } catch {
// //       toast("Failed to load challenges", "error");
// //     }
// //     setLoading(false);
// //   };

// //   useEffect(() => {
// //     load();
// //   }, []);

// //   const save = async () => {
// //     if (!form.name || !form.startDate || !form.endDate)
// //       return toast("Fill in Name, Start and End Date", "error");
// //     try {
// //       await push(ref(db, "challenges"), {
// //         ...form,
// //         active: form.active === true || (form.active as any) === "true",
// //         createdAt: Date.now(),
// //       });
// //       toast("Challenge created ✓", "success");
// //       setShowForm(false);
// //       setForm(blank);
// //       load();
// //     } catch {
// //       toast("Save failed", "error");
// //     }
// //   };

// //   const toggleActive = async (c: any) => {
// //     await set(ref(db, `challenges/${c.id}/active`), !c.active);
// //     toast(c.active ? "Challenge hidden" : "Challenge active ✓", "info");
// //     load();
// //   };

// //   const del = async (id: string) => {
// //     if (!confirm("Delete this challenge and all its entries?")) return;
// //     await remove(ref(db, `challenges/${id}`));
// //     await remove(ref(db, `challenge_entries/${id}`));
// //     toast("Deleted", "info");
// //     load();
// //   };

// //   const COLORS = [
// //     "hsl(20 100% 50%)",
// //     "hsl(263 85% 58%)",
// //     "hsl(142 72% 37%)",
// //     "hsl(217 91% 53%)",
// //     "hsl(38 92% 44%)",
// //     "hsl(187 85% 40%)",
// //   ];

// //   return (
// //     <div>
// //       <div
// //         style={{
// //           display: "flex",
// //           justifyContent: "space-between",
// //           alignItems: "center",
// //           marginBottom: 16,
// //           flexWrap: "wrap",
// //           gap: 10,
// //         }}
// //       >
// //         <div style={{ fontWeight: 700, fontSize: 15 }}>
// //           Challenges ({challenges.length})
// //         </div>
// //         <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
// //           {showForm ? "✕ Cancel" : "+ New Challenge"}
// //         </Btn>
// //       </div>

// //       <AnimatePresence>
// //         {showForm && (
// //           <motion.div
// //             initial={{ opacity: 0, y: -8 }}
// //             animate={{ opacity: 1, y: 0 }}
// //             exit={{ opacity: 0, y: -8 }}
// //             style={{
// //               background: "hsl(var(--secondary))",
// //               border: "1px solid hsl(var(--border))",
// //               borderRadius: 12,
// //               padding: 20,
// //               marginBottom: 20,
// //             }}
// //           >
// //             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
// //               New Challenge
// //             </div>
// //             <div
// //               style={{
// //                 display: "grid",
// //                 gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
// //                 gap: 12,
// //                 marginBottom: 12,
// //               }}
// //             >
// //               {(
// //                 [
// //                   ["name", "Challenge Name *", "e.g. 30-Day Squat Challenge"],
// //                   ["exercise", "Exercise", "e.g. Squat"],
// //                   ["metric", "Metric", "e.g. kg, reps, time"],
// //                   ["prize", "Prize", "e.g. Free 1-month membership"],
// //                   ["startDate", "Start Date *", ""],
// //                   ["endDate", "End Date *", ""],
// //                 ] as any[]
// //               ).map(([k, l, p]: any) => (
// //                 <div key={k}>
// //                   <label style={lbl}>{l}</label>
// //                   <input
// //                     style={inp}
// //                     type={k.includes("Date") ? "date" : "text"}
// //                     placeholder={p}
// //                     value={(form as any)[k]}
// //                     onChange={f(k)}
// //                   />
// //                 </div>
// //               ))}
// //               <div>
// //                 <label style={lbl}>Status</label>
// //                 <select
// //                   style={inp}
// //                   value={String(form.active)}
// //                   onChange={(e) =>
// //                     setForm((p) => ({
// //                       ...p,
// //                       active: e.target.value === "true",
// //                     }))
// //                   }
// //                 >
// //                   <option value="true">✓ Active</option>
// //                   <option value="false">✕ Hidden</option>
// //                 </select>
// //               </div>
// //               <div>
// //                 <label style={lbl}>Color</label>
// //                 <div
// //                   style={{
// //                     display: "flex",
// //                     gap: 6,
// //                     flexWrap: "wrap",
// //                     marginTop: 4,
// //                   }}
// //                 >
// //                   {COLORS.map((c) => (
// //                     <button
// //                       key={c}
// //                       onClick={() => setForm((p) => ({ ...p, color: c }))}
// //                       style={{
// //                         width: 28,
// //                         height: 28,
// //                         borderRadius: "50%",
// //                         background: c,
// //                         border:
// //                           form.color === c
// //                             ? "3px solid white"
// //                             : "2px solid transparent",
// //                         cursor: "pointer",
// //                       }}
// //                     />
// //                   ))}
// //                 </div>
// //               </div>
// //             </div>
// //             <div style={{ marginBottom: 14 }}>
// //               <label style={lbl}>Description</label>
// //               <textarea
// //                 style={{ ...inp, minHeight: 60, resize: "vertical" }}
// //                 placeholder="Describe the challenge…"
// //                 value={form.description}
// //                 onChange={f("description")}
// //               />
// //             </div>
// //             <div style={{ display: "flex", gap: 10 }}>
// //               <Btn variant="primary" onClick={save}>
// //                 Create Challenge
// //               </Btn>
// //               <Btn variant="subtle" onClick={() => setShowForm(false)}>
// //                 Cancel
// //               </Btn>
// //             </div>
// //           </motion.div>
// //         )}
// //       </AnimatePresence>

// //       {loading ? (
// //         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
// //           Loading…
// //         </div>
// //       ) : challenges.length === 0 ? (
// //         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
// //           No challenges yet. Create one above!
// //         </div>
// //       ) : (
// //         <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
// //           {challenges.map((c) => (
// //             <div
// //               key={c.id}
// //               style={{
// //                 background: "hsl(var(--secondary))",
// //                 border: "1px solid hsl(var(--border))",
// //                 borderRadius: 10,
// //                 padding: "12px 16px",
// //                 display: "flex",
// //                 justifyContent: "space-between",
// //                 alignItems: "center",
// //                 flexWrap: "wrap",
// //                 gap: 10,
// //                 borderLeft: `3px solid ${c.color}`,
// //               }}
// //             >
// //               <div>
// //                 <div
// //                   style={{
// //                     fontWeight: 700,
// //                     fontSize: 14,
// //                     display: "flex",
// //                     alignItems: "center",
// //                     gap: 8,
// //                   }}
// //                 >
// //                   {c.name}
// //                   <span
// //                     style={{
// //                       fontSize: 10,
// //                       fontWeight: 700,
// //                       padding: "2px 8px",
// //                       borderRadius: 20,
// //                       background: c.active
// //                         ? "hsl(142 72% 37% / 0.15)"
// //                         : "hsl(var(--secondary))",
// //                       color: c.active
// //                         ? "hsl(142 72% 37%)"
// //                         : "hsl(var(--muted-foreground))",
// //                     }}
// //                   >
// //                     {c.active ? "● Active" : "○ Hidden"}
// //                   </span>
// //                 </div>
// //                 <div
// //                   style={{
// //                     fontSize: 12,
// //                     color: "hsl(var(--muted-foreground))",
// //                     marginTop: 2,
// //                   }}
// //                 >
// //                   {c.startDate} → {c.endDate} · {c.metric} · 🏆 {c.prize}
// //                 </div>
// //               </div>
// //               <div style={{ display: "flex", gap: 8 }}>
// //                 <Btn
// //                   variant={c.active ? "subtle" : "green"}
// //                   size="sm"
// //                   onClick={() => toggleActive(c)}
// //                 >
// //                   {c.active ? "Deactivate" : "Activate"}
// //                 </Btn>
// //                 <Btn variant="danger" size="sm" onClick={() => del(c.id)}>
// //                   Delete
// //                 </Btn>
// //               </div>
// //             </div>
// //           ))}
// //         </div>
// //       )}

// //       <div
// //         style={{
// //           marginTop: 20,
// //           padding: "10px 14px",
// //           background: "hsl(217 91% 53% / 0.1)",
// //           border: "1px solid hsl(217 91% 53% / 0.3)",
// //           borderRadius: 8,
// //           fontSize: 12,
// //           color: "hsl(var(--muted-foreground))",
// //         }}
// //       >
// //         ℹ️ Challenge entries are stored at{" "}
// //         <strong style={{ color: "hsl(217 91% 53%)" }}>
// //           challenge_entries/
// //         </strong>{" "}
// //         in Firebase. Make sure your rules allow read/write for authenticated
// //         users.
// //       </div>
// //     </div>
// //   );
// // }

// // ── Challenges Manager ────────────────────────────────────────────────────────
// // Replace the existing ChallengesManager in Admin.tsx with this.
// // Also add this import at the top of Admin.tsx if not already present:
// // import { CHALLENGE_METRICS } from "@/pages/Leaderboard";
// // (or copy the CHALLENGE_METRICS array here directly if you prefer)

// // CHALLENGE_METRICS — keep in sync with Leaderboard.tsx
// const CHALLENGE_METRICS = [
//   { value: "reps", label: "Reps" },
//   { value: "kg", label: "Weight (kg)" },
//   { value: "lbs", label: "Weight (lbs)" },
//   { value: "time", label: "Time (mm:ss)" },
//   { value: "distance_m", label: "Distance (m)" },
//   { value: "distance_km", label: "Distance (km)" },
//   { value: "calories", label: "Calories" },
//   { value: "rounds", label: "Rounds + Reps" },
// ];

// function ChallengesManager({ toast }: any) {
//   const [challenges, setChallenges] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const blank = {
//     name: "",
//     exercise: "",
//     description: "",
//     startDate: "",
//     endDate: "",
//     metric: "reps", // ← now a controlled dropdown value
//     prize: "",
//     color: "hsl(20 100% 50%)",
//     active: true,
//   };
//   const [form, setForm] = useState(blank);
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));

//   const load = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "challenges"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([id, val]: [string, any]) => ({ id, ...val }),
//         );
//         setChallenges(
//           list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
//         );
//       } else setChallenges([]);
//     } catch {
//       toast("Failed to load challenges", "error");
//     }
//     setLoading(false);
//   };

//   useEffect(() => {
//     load();
//   }, []);

//   const save = async () => {
//     if (!form.name || !form.startDate || !form.endDate)
//       return toast("Fill in Name, Start and End Date", "error");
//     try {
//       const challengeData = {
//         ...form,
//         active: form.active === true || (form.active as any) === "true",
//         createdAt: Date.now(),
//       };

//       // Save challenge
//       await push(ref(db, "challenges"), challengeData);

//       // ── Trigger notification to all users ────────────────────────────
//       // Writes to a notifications node that your notification system reads.
//       // Adjust the path to match your existing notification structure.
//       await push(ref(db, "notifications"), {
//         title: "New Challenge! 🏁",
//         body: `${form.name} — ${form.description || "Check it out in the app!"}`,
//         type: "challenge",
//         createdAt: Date.now(),
//         read: false,
//         prize: form.prize,
//       });

//       toast("Challenge created ✓ — members notified", "success");
//       setShowForm(false);
//       setForm(blank);
//       load();
//     } catch {
//       toast("Save failed", "error");
//     }
//   };

//   const toggleActive = async (c: any) => {
//     await set(ref(db, `challenges/${c.id}/active`), !c.active);
//     toast(c.active ? "Challenge hidden" : "Challenge active ✓", "info");
//     load();
//   };

//   const del = async (id: string) => {
//     if (!confirm("Delete this challenge and all its entries?")) return;
//     await remove(ref(db, `challenges/${id}`));
//     await remove(ref(db, `challenge_entries/${id}`));
//     toast("Deleted", "info");
//     load();
//   };

//   const COLORS = [
//     "hsl(20 100% 50%)",
//     "hsl(263 85% 58%)",
//     "hsl(142 72% 37%)",
//     "hsl(217 91% 53%)",
//     "hsl(38 92% 44%)",
//     "hsl(187 85% 40%)",
//   ];

//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Challenges ({challenges.length})
//         </div>
//         <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
//           {showForm ? "✕ Cancel" : "+ New Challenge"}
//         </Btn>
//       </div>

//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
//               New Challenge
//             </div>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               {/* Name */}
//               <div>
//                 <label style={lbl}>Challenge Name *</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. 30-Day Squat Challenge"
//                   value={form.name}
//                   onChange={f("name")}
//                 />
//               </div>

//               {/* Exercise */}
//               <div>
//                 <label style={lbl}>Exercise</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. Back Squat"
//                   value={form.exercise}
//                   onChange={f("exercise")}
//                 />
//               </div>

//               {/* Metric — dropdown instead of text input */}
//               <div>
//                 <label style={lbl}>Metric *</label>
//                 <select style={inp} value={form.metric} onChange={f("metric")}>
//                   {CHALLENGE_METRICS.map((m) => (
//                     <option key={m.value} value={m.value}>
//                       {m.label}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Prize */}
//               <div>
//                 <label style={lbl}>Prize</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. Free 1-month membership"
//                   value={form.prize}
//                   onChange={f("prize")}
//                 />
//               </div>

//               {/* Start date */}
//               <div>
//                 <label style={lbl}>Start Date *</label>
//                 <input
//                   style={inp}
//                   type="date"
//                   value={form.startDate}
//                   onChange={f("startDate")}
//                 />
//               </div>

//               {/* End date */}
//               <div>
//                 <label style={lbl}>End Date *</label>
//                 <input
//                   style={inp}
//                   type="date"
//                   value={form.endDate}
//                   onChange={f("endDate")}
//                 />
//               </div>

//               {/* Status */}
//               <div>
//                 <label style={lbl}>Status</label>
//                 <select
//                   style={inp}
//                   value={String(form.active)}
//                   onChange={(e) =>
//                     setForm((p) => ({
//                       ...p,
//                       active: e.target.value === "true",
//                     }))
//                   }
//                 >
//                   <option value="true">✓ Active</option>
//                   <option value="false">✕ Hidden</option>
//                 </select>
//               </div>

//               {/* Color */}
//               <div>
//                 <label style={lbl}>Colour</label>
//                 <div
//                   style={{
//                     display: "flex",
//                     gap: 6,
//                     flexWrap: "wrap",
//                     marginTop: 4,
//                   }}
//                 >
//                   {COLORS.map((c) => (
//                     <button
//                       key={c}
//                       onClick={() => setForm((p) => ({ ...p, color: c }))}
//                       style={{
//                         width: 28,
//                         height: 28,
//                         borderRadius: "50%",
//                         background: c,
//                         border:
//                           form.color === c
//                             ? "3px solid white"
//                             : "2px solid transparent",
//                         cursor: "pointer",
//                       }}
//                     />
//                   ))}
//                 </div>
//               </div>
//             </div>

//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Description</label>
//               <textarea
//                 style={{ ...inp, minHeight: 60, resize: "vertical" }}
//                 placeholder="Describe the challenge…"
//                 value={form.description}
//                 onChange={f("description")}
//               />
//             </div>

//             {/* Notification note */}
//             <div
//               style={{
//                 fontSize: 11,
//                 color: "hsl(var(--muted-foreground))",
//                 marginBottom: 14,
//                 padding: "8px 12px",
//                 background: "hsl(142 72% 37% / 0.08)",
//                 borderRadius: 6,
//                 border: "1px solid hsl(142 72% 37% / 0.2)",
//               }}
//             >
//               🔔 A notification will be sent to all members when this challenge
//               is created.
//             </div>

//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save}>
//                 Create Challenge
//               </Btn>
//               <Btn variant="subtle" onClick={() => setShowForm(false)}>
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : challenges.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No challenges yet. Create one above!
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//           {challenges.map((c) => {
//             const metricLabel =
//               CHALLENGE_METRICS.find((m) => m.value === c.metric)?.label ??
//               c.metric;
//             return (
//               <div
//                 key={c.id}
//                 style={{
//                   background: "hsl(var(--secondary))",
//                   border: "1px solid hsl(var(--border))",
//                   borderRadius: 10,
//                   padding: "12px 16px",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                   flexWrap: "wrap",
//                   gap: 10,
//                   borderLeft: `3px solid ${c.color}`,
//                 }}
//               >
//                 <div>
//                   <div
//                     style={{
//                       fontWeight: 700,
//                       fontSize: 14,
//                       display: "flex",
//                       alignItems: "center",
//                       gap: 8,
//                     }}
//                   >
//                     {c.name}
//                     <span
//                       style={{
//                         fontSize: 10,
//                         fontWeight: 700,
//                         padding: "2px 8px",
//                         borderRadius: 20,
//                         background: c.active
//                           ? "hsl(142 72% 37% / 0.15)"
//                           : "hsl(var(--secondary))",
//                         color: c.active
//                           ? "hsl(142 72% 37%)"
//                           : "hsl(var(--muted-foreground))",
//                       }}
//                     >
//                       {c.active ? "● Active" : "○ Hidden"}
//                     </span>
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 12,
//                       color: "hsl(var(--muted-foreground))",
//                       marginTop: 2,
//                     }}
//                   >
//                     {c.startDate} → {c.endDate} · {metricLabel} · 🏆 {c.prize}
//                   </div>
//                 </div>
//                 <div style={{ display: "flex", gap: 8 }}>
//                   <Btn
//                     variant={c.active ? "subtle" : "green"}
//                     size="sm"
//                     onClick={() => toggleActive(c)}
//                   >
//                     {c.active ? "Deactivate" : "Activate"}
//                   </Btn>
//                   <Btn variant="danger" size="sm" onClick={() => del(c.id)}>
//                     Delete
//                   </Btn>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}

//       <div
//         style={{
//           marginTop: 20,
//           padding: "10px 14px",
//           background: "hsl(217 91% 53% / 0.1)",
//           border: "1px solid hsl(217 91% 53% / 0.3)",
//           borderRadius: 8,
//           fontSize: 12,
//           color: "hsl(var(--muted-foreground))",
//         }}
//       >
//         ℹ️ Challenge entries are stored at{" "}
//         <strong style={{ color: "hsl(217 91% 53%)" }}>
//           challenge_entries/
//         </strong>{" "}
//         in Firebase. Notifications are stored at{" "}
//         <strong style={{ color: "hsl(217 91% 53%)" }}>notifications/</strong>.
//       </div>
//     </div>
//   );
// }

// // ── Manual Check-In (admin fallback) ─────────────────────────────────────────
// // Drop this function into Admin.tsx above RewardsManager.
// // Add { tab === "checkin" && <ManualCheckInManager toast={toast} /> } in the
// // tab renderer, and add { id: "checkin", label: "Check-In", desc: "Manual override" }
// // to your TABS array.
// const handleManualCheckIn = async () => {
//   if (!selectedUid) return toast("Select a member first", "error");
//   if (alreadyCheckedIn)
//     return toast(`${selectedMember?.name} already checked in today`, "error");

//   setSubmitting(true);
//   try {
//     const memberSnap = await get(ref(db, `mk2_users/${selectedUid}`));
//     if (!memberSnap.exists()) throw new Error("Member not found");
//     const val = memberSnap.val();

//     const checkIns = Array.isArray(val.checkIns) ? val.checkIns : [];
//     const time = new Date().toLocaleTimeString("en-ZA", {
//       hour: "2-digit",
//       minute: "2-digit",
//     });
//     const newCheckIns = [...checkIns, { date: today, time }];
//     const bonus = parseInt(pointsBonus) || 10;
//     const newPoints = (val.points ?? 0) + bonus;

//     const newTotal = newCheckIns.length;
//     const newMilestones = Math.floor(newTotal / 40);
//     const oldMilestones = Math.floor(checkIns.length / 40);
//     const milestoneReached = newMilestones > oldMilestones;

//     await set(ref(db, `mk2_users/${selectedUid}/checkIns`), newCheckIns);
//     await set(ref(db, `mk2_users/${selectedUid}/points`), newPoints);

//     if (milestoneReached) {
//       const code = `MK2R-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
//       const earnedAt = Date.now();
//       const expiresAt = earnedAt + 60 * 24 * 60 * 60 * 1000;
//       await push(ref(db, `mk2_users/${selectedUid}/rewards`), {
//         status: "pending",
//         earnedAt,
//         expiresAt,
//         redemptionCode: code,
//         checkInMilestone: newMilestones * 40,
//         type: null,
//       });
//       toast(
//         `✓ ${selectedMember?.name} checked in! 🎉 Milestone reached — reward created`,
//         "success",
//       );
//     } else {
//       toast(
//         `✓ ${selectedMember?.name} checked in at ${time} (+${bonus} pts)`,
//         "success",
//       );
//     }

//     setMembers((prev) =>
//       prev.map((m) =>
//         m.uid === selectedUid
//           ? { ...m, checkIns: newCheckIns, points: newPoints }
//           : m,
//       ),
//     );
//     setSelectedUid("");
//     setPointsBonus("10");
//     loadRecentCheckIns();
//   } catch {
//     toast("Check-in failed — try again", "error");
//   }
//   setSubmitting(false);
// };

// const handleAdjustPoints = async () => {
//   if (!selectedUid || !selectedMember) return;
//   const delta = parseInt(pointsBonus);
//   if (isNaN(delta)) return toast("Enter a valid points value", "error");

//   setAdjustingPoints(true);
//   try {
//     const newPoints = selectedMember.points + delta;
//     await set(ref(db, `mk2_users/${selectedUid}/points`), newPoints);
//     setMembers((prev) =>
//       prev.map((m) =>
//         m.uid === selectedUid ? { ...m, points: newPoints } : m,
//       ),
//     );
//     toast(
//       `✓ ${selectedMember.name}: ${delta > 0 ? "+" : ""}${delta} pts → ${newPoints} total`,
//       "success",
//     );
//     setPointsBonus("10");
//     setSelectedUid("");
//   } catch {
//     toast("Points update failed", "error");
//   }
//   setAdjustingPoints(false);
// };

// // ── Rewards Manager (with QR scan redemption) ────────────────────────────────
// const CHECKINS_REQUIRED = 40;
// const EXPIRY_DAYS = 60;

// function ProgressBar({ pct, ready }: { pct: number; ready: boolean }) {
//   return (
//     <div
//       style={{
//         width: "100%",
//         height: 6,
//         background: "hsl(var(--border))",
//         borderRadius: 4,
//         overflow: "hidden",
//       }}
//     >
//       <div
//         style={{
//           width: `${Math.min(100, pct)}%`,
//           height: "100%",
//           background: ready ? "hsl(142 72% 37%)" : "hsl(20 100% 50%)",
//           borderRadius: 4,
//           transition: "width 0.4s ease",
//         }}
//       />
//     </div>
//   );
// }

// function RewardsManager({ toast }: any) {
//   const [members, setMembers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState<"all" | "ready" | "progress">("all");
//   const [search, setSearch] = useState("");
//   const [redeemTarget, setRedeemTarget] = useState<any>(null);
//   const [rewardType, setRewardType] = useState<"inbody" | "buddy">("inbody");
//   const [redeemNote, setRedeemNote] = useState("");
//   const [submitting, setSubmitting] = useState(false);

//   // ── QR scan state ──────────────────────────────────────────────────────────
//   const [showQRScanner, setShowQRScanner] = useState(false);
//   const [qrLookupResult, setQrLookupResult] = useState<{
//     uid: string;
//     rewardId: string;
//     memberName: string;
//     rewardCode: string;
//     rewardType: string | null;
//     earnedAt: number;
//     expiresAt: number;
//   } | null>(null);
//   const [qrLookupError, setQrLookupError] = useState<string | null>(null);
//   const [qrConfirmType, setQrConfirmType] = useState<"inbody" | "buddy">(
//     "inbody",
//   );
//   const [qrConfirming, setQrConfirming] = useState(false);
//   const [manualCode, setManualCode] = useState("");

//   const load = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "mk2_users"));
//       if (!snap.exists()) {
//         setMembers([]);
//         setLoading(false);
//         return;
//       }
//       const list: any[] = [];
//       Object.entries(snap.val()).forEach(([uid, val]: [string, any]) => {
//         const totalCheckIns = Array.isArray(val.checkIns)
//           ? val.checkIns.length
//           : typeof val.checkIns === "number"
//             ? val.checkIns
//             : 0;

//         // ── Read from mk2_users/{uid}/rewards (member-side source of truth) ──
//         const rewardsMap: Record<string, any> = val.rewards ?? {};
//         const redemptions = Object.entries(rewardsMap)
//           .filter(([, r]: [string, any]) => r.status === "redeemed")
//           .map(([id, r]: [string, any]) => ({ id, ...r }))
//           .sort((a, b) => b.redeemedAt - a.redeemedAt);

//         const pendingRewards = Object.entries(rewardsMap)
//           .filter(
//             ([, r]: [string, any]) =>
//               r.status === "pending" && Date.now() < r.expiresAt,
//           )
//           .map(([id, r]: [string, any]) => ({ id, ...r }));

//         const lastRedeemedAt = redemptions[0]?.redeemedAt ?? 0;

//         let cycleCheckIns = 0;
//         if (Array.isArray(val.checkIns)) {
//           cycleCheckIns = val.checkIns.filter((ci: any) => {
//             const ts =
//               typeof ci === "number"
//                 ? ci
//                 : typeof ci === "string"
//                   ? new Date(ci).getTime()
//                   : 0;
//             return ts > lastRedeemedAt;
//           }).length;
//         } else {
//           cycleCheckIns =
//             lastRedeemedAt > 0
//               ? totalCheckIns -
//                 Math.floor(totalCheckIns / CHECKINS_REQUIRED) *
//                   CHECKINS_REQUIRED
//               : totalCheckIns;
//         }

//         const rewardReady =
//           cycleCheckIns >= CHECKINS_REQUIRED || pendingRewards.length > 0;
//         const pct = Math.min(100, (cycleCheckIns / CHECKINS_REQUIRED) * 100);
//         const expiresAt =
//           pendingRewards[0]?.expiresAt ??
//           (lastRedeemedAt > 0
//             ? lastRedeemedAt + EXPIRY_DAYS * 24 * 60 * 60 * 1000
//             : Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

//         list.push({
//           uid,
//           name: val.name || "Unnamed",
//           email: val.email || "",
//           totalCheckIns,
//           cycleCheckIns,
//           pct,
//           rewardReady,
//           expired:
//             rewardReady &&
//             pendingRewards.length === 0 &&
//             Date.now() > expiresAt,
//           expiresAt,
//           redemptions,
//           pendingRewards,
//         });
//       });

//       list.sort((a, b) => {
//         if (a.rewardReady !== b.rewardReady) return a.rewardReady ? -1 : 1;
//         return b.pct - a.pct;
//       });
//       setMembers(list);
//     } catch {
//       toast("Failed to load", "error");
//     }
//     setLoading(false);
//   };

//   useEffect(() => {
//     load();
//   }, []);

//   // ── Redeem from member list (manual pick) ─────────────────────────────────
//   const handleRedeem = async () => {
//     if (!redeemTarget) return;
//     // Find the first pending reward for this member
//     const pendingReward = redeemTarget.pendingRewards?.[0];
//     if (!pendingReward) return toast("No pending reward found", "error");

//     setSubmitting(true);
//     try {
//       await set(
//         ref(db, `mk2_users/${redeemTarget.uid}/rewards/${pendingReward.id}`),
//         {
//           ...pendingReward,
//           status: "redeemed",
//           type: rewardType,
//           redeemedAt: Date.now(),
//           redeemedBy: "Admin",
//           note: redeemNote || "Redeemed at reception",
//         },
//       );
//       toast(
//         `✓ ${rewardType === "inbody" ? "InBody Assessment" : "Bring-a-Buddy"} redeemed for ${redeemTarget.name}`,
//         "success",
//       );
//       setRedeemTarget(null);
//       setRedeemNote("");
//       load();
//     } catch {
//       toast("Redemption failed", "error");
//     }
//     setSubmitting(false);
//   };

//   // ── Look up a reward code across all users ────────────────────────────────
//   const lookupCode = async (code: string) => {
//     setQrLookupError(null);
//     setQrLookupResult(null);
//     const trimmed = code.trim().toUpperCase();
//     if (!trimmed) return;

//     try {
//       const snap = await get(ref(db, "mk2_users"));
//       if (!snap.exists()) {
//         setQrLookupError("No members found.");
//         return;
//       }
//       const allUsers = snap.val();
//       for (const [uid, val] of Object.entries(allUsers) as [string, any][]) {
//         const rewardsMap: Record<string, any> = val.rewards ?? {};
//         for (const [rewardId, r] of Object.entries(rewardsMap)) {
//           if ((r as any).redemptionCode?.toUpperCase() === trimmed) {
//             if ((r as any).status === "redeemed") {
//               setQrLookupError(
//                 `This code has already been redeemed by ${val.name || "this member"}.`,
//               );
//               return;
//             }
//             if ((r as any).status === "expired") {
//               setQrLookupError(
//                 `This reward expired on ${new Date((r as any).expiresAt).toLocaleDateString("en-ZA")}.`,
//               );
//               return;
//             }
//             if (Date.now() > (r as any).expiresAt) {
//               setQrLookupError(
//                 `This reward has expired (${new Date((r as any).expiresAt).toLocaleDateString("en-ZA")}).`,
//               );
//               return;
//             }
//             // Valid pending reward found
//             setQrLookupResult({
//               uid,
//               rewardId,
//               memberName: val.name || "Unnamed",
//               rewardCode: (r as any).redemptionCode,
//               rewardType: (r as any).type,
//               earnedAt: (r as any).earnedAt,
//               expiresAt: (r as any).expiresAt,
//             });
//             // Pre-select type if member already chose one
//             if ((r as any).type) {
//               setQrConfirmType((r as any).type);
//             }
//             return;
//           }
//         }
//       }
//       setQrLookupError("Code not found — check it was entered correctly.");
//     } catch {
//       setQrLookupError("Lookup failed — try again.");
//     }
//   };

//   // ── Confirm QR redemption ─────────────────────────────────────────────────
//   const confirmQrRedemption = async () => {
//     if (!qrLookupResult) return;
//     setQrConfirming(true);
//     try {
//       const snap = await get(
//         ref(
//           db,
//           `mk2_users/${qrLookupResult.uid}/rewards/${qrLookupResult.rewardId}`,
//         ),
//       );
//       if (!snap.exists()) throw new Error("Reward not found");
//       const existing = snap.val();

//       await set(
//         ref(
//           db,
//           `mk2_users/${qrLookupResult.uid}/rewards/${qrLookupResult.rewardId}`,
//         ),
//         {
//           ...existing,
//           status: "redeemed",
//           type: qrConfirmType,
//           redeemedAt: Date.now(),
//           redeemedBy: "Admin",
//         },
//       );
//       toast(
//         `✓ ${qrConfirmType === "inbody" ? "InBody Assessment" : "Bring-a-Buddy"} redeemed for ${qrLookupResult.memberName}`,
//         "success",
//       );
//       setQrLookupResult(null);
//       setManualCode("");
//       setShowQRScanner(false);
//       load();
//     } catch {
//       toast("Redemption failed — try again", "error");
//     }
//     setQrConfirming(false);
//   };

//   const readyCount = members.filter((m) => m.rewardReady && !m.expired).length;
//   const filtered = members
//     .filter((m) =>
//       filter === "ready"
//         ? m.rewardReady && !m.expired
//         : filter === "progress"
//           ? !m.rewardReady
//           : true,
//     )
//     .filter(
//       (m) =>
//         !search ||
//         m.name.toLowerCase().includes(search.toLowerCase()) ||
//         m.email.toLowerCase().includes(search.toLowerCase()),
//     );

//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "flex-start",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 12,
//         }}
//       >
//         <div>
//           <div style={{ fontWeight: 700, fontSize: 15 }}>
//             Rewards Management
//           </div>
//           <div
//             style={{
//               fontSize: 12,
//               color: "hsl(var(--muted-foreground))",
//               marginTop: 4,
//             }}
//           >
//             {CHECKINS_REQUIRED} check-ins = 1 reward · Redeem within{" "}
//             {EXPIRY_DAYS} days
//           </div>
//         </div>
//         {readyCount > 0 && (
//           <div
//             style={{
//               background: "hsl(142 72% 37% / 0.12)",
//               border: "1px solid hsl(142 72% 37% / 0.3)",
//               borderRadius: 10,
//               padding: "8px 16px",
//               fontSize: 13,
//               fontWeight: 700,
//               color: "hsl(142 72% 37%)",
//             }}
//           >
//             🎁 {readyCount} member{readyCount !== 1 ? "s" : ""} ready to redeem
//           </div>
//         )}
//       </div>

//       {/* ── QR / Code Redemption Panel ──────────────────────────────────── */}
//       <div
//         style={{
//           background: "hsl(var(--secondary))",
//           border: "1px solid hsl(var(--border))",
//           borderRadius: 12,
//           padding: "16px 20px",
//           marginBottom: 20,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
//           📷 Redeem by Code
//         </div>
//         <div
//           style={{
//             fontSize: 12,
//             color: "hsl(var(--muted-foreground))",
//             marginBottom: 14,
//           }}
//         >
//           Scan the member's QR code or type their redemption code manually.
//         </div>

//         {/* Manual code input */}
//         <div
//           style={{
//             display: "flex",
//             gap: 8,
//             marginBottom: 12,
//             flexWrap: "wrap",
//           }}
//         >
//           <input
//             style={{
//               ...inp,
//               flex: 1,
//               minWidth: 200,
//               fontFamily: "monospace",
//               letterSpacing: "0.1em",
//             }}
//             placeholder="e.g. MK2R-XXXX-YYY"
//             value={manualCode}
//             onChange={(e) => {
//               setManualCode(e.target.value.toUpperCase());
//               setQrLookupError(null);
//               setQrLookupResult(null);
//             }}
//             onKeyDown={(e) => e.key === "Enter" && lookupCode(manualCode)}
//           />
//           <Btn
//             variant="primary"
//             size="sm"
//             onClick={() => lookupCode(manualCode)}
//             disabled={!manualCode.trim()}
//           >
//             Look Up →
//           </Btn>
//           <Btn
//             variant="subtle"
//             size="sm"
//             onClick={() => {
//               setShowQRScanner((v) => !v);
//               setQrLookupError(null);
//               setQrLookupResult(null);
//               setManualCode("");
//             }}
//           >
//             {showQRScanner ? "✕ Close Scanner" : "📷 Scan QR"}
//           </Btn>
//         </div>

//         {/* QR Scanner */}
//         {showQRScanner && (
//           <div
//             style={{
//               borderRadius: 10,
//               overflow: "hidden",
//               marginBottom: 12,
//               border: "1px solid hsl(var(--border))",
//             }}
//           >
//             <QRScanner
//               onScan={(data) => {
//                 setShowQRScanner(false);
//                 setManualCode(data.toUpperCase());
//                 lookupCode(data);
//               }}
//             />
//           </div>
//         )}

//         {/* Lookup error */}
//         {qrLookupError && (
//           <div
//             style={{
//               padding: "10px 14px",
//               borderRadius: 8,
//               background: "hsl(0 84% 51% / 0.08)",
//               border: "1px solid hsl(0 84% 51% / 0.2)",
//               color: "hsl(0 84% 51%)",
//               fontSize: 13,
//               marginBottom: 12,
//             }}
//           >
//             ⚠ {qrLookupError}
//           </div>
//         )}

//         {/* Lookup result — confirmation card */}
//         {qrLookupResult && (
//           <motion.div
//             initial={{ opacity: 0, y: -6 }}
//             animate={{ opacity: 1, y: 0 }}
//             style={{
//               background: "hsl(var(--card))",
//               border: "1px solid hsl(142 72% 37% / 0.4)",
//               borderRadius: 10,
//               padding: 16,
//             }}
//           >
//             <div
//               style={{
//                 fontWeight: 700,
//                 fontSize: 15,
//                 marginBottom: 2,
//                 color: "hsl(142 72% 37%)",
//               }}
//             >
//               ✓ Valid reward found
//             </div>
//             <div
//               style={{
//                 fontSize: 13,
//                 color: "hsl(var(--muted-foreground))",
//                 marginBottom: 14,
//               }}
//             >
//               <strong style={{ color: "hsl(var(--foreground))" }}>
//                 {qrLookupResult.memberName}
//               </strong>{" "}
//               · Code:{" "}
//               <span style={{ fontFamily: "monospace", fontSize: 12 }}>
//                 {qrLookupResult.rewardCode}
//               </span>
//               <br />
//               Earned{" "}
//               {new Date(qrLookupResult.earnedAt).toLocaleDateString("en-ZA")} ·
//               Expires{" "}
//               {new Date(qrLookupResult.expiresAt).toLocaleDateString("en-ZA")}
//             </div>

//             {/* Reward type selector */}
//             <div
//               style={{
//                 fontSize: 11,
//                 fontWeight: 700,
//                 textTransform: "uppercase",
//                 letterSpacing: "0.08em",
//                 color: "hsl(var(--muted-foreground))",
//                 marginBottom: 8,
//               }}
//             >
//               {qrLookupResult.rewardType
//                 ? "Member chose:"
//                 : "Choose reward type:"}
//             </div>
//             <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
//               {(["inbody", "buddy"] as const).map((t) => (
//                 <button
//                   key={t}
//                   onClick={() => setQrConfirmType(t)}
//                   style={{
//                     flex: 1,
//                     padding: "10px 8px",
//                     borderRadius: 8,
//                     cursor: "pointer",
//                     border: `2px solid ${qrConfirmType === t ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
//                     background:
//                       qrConfirmType === t
//                         ? "hsl(20 100% 50% / 0.08)"
//                         : "transparent",
//                     textAlign: "center",
//                     fontFamily: "var(--font-body)",
//                   }}
//                 >
//                   <div style={{ fontSize: 20, marginBottom: 2 }}>
//                     {t === "inbody" ? "📊" : "🤝"}
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 11,
//                       fontWeight: 700,
//                       color:
//                         qrConfirmType === t
//                           ? "hsl(20 100% 50%)"
//                           : "hsl(var(--foreground))",
//                     }}
//                   >
//                     {t === "inbody" ? "Free InBody" : "Bring-a-Buddy"}
//                   </div>
//                 </button>
//               ))}
//             </div>

//             <div style={{ display: "flex", gap: 8 }}>
//               <Btn
//                 variant="green"
//                 onClick={confirmQrRedemption}
//                 disabled={qrConfirming}
//               >
//                 {qrConfirming ? "Confirming…" : "✓ Confirm Redemption"}
//               </Btn>
//               <Btn
//                 variant="subtle"
//                 size="sm"
//                 onClick={() => {
//                   setQrLookupResult(null);
//                   setManualCode("");
//                 }}
//               >
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </div>

//       <div
//         style={{
//           background: "hsl(var(--secondary))",
//           border: "1px solid hsl(var(--border))",
//           borderRadius: 10,
//           padding: "12px 16px",
//           marginBottom: 20,
//           fontSize: 12,
//           color: "hsl(var(--muted-foreground))",
//           lineHeight: 1.7,
//         }}
//       >
//         <strong style={{ color: "hsl(var(--foreground))" }}>
//           Reward Rules:{" "}
//         </strong>
//         Every {CHECKINS_REQUIRED} gym check‑ins earns a member one reward —
//         either a{" "}
//         <strong style={{ color: "hsl(20 100% 50%)" }}>
//           Free InBody Assessment
//         </strong>{" "}
//         or a{" "}
//         <strong style={{ color: "hsl(20 100% 50%)" }}>
//           Bring‑a‑Buddy free session
//         </strong>
//         . Rewards must be redeemed within{" "}
//         <strong style={{ color: "hsl(20 100% 50%)" }}>
//           {EXPIRY_DAYS} days
//         </strong>{" "}
//         of earning. After redemption the cycle resets.
//       </div>

//       <div
//         style={{
//           display: "flex",
//           gap: 10,
//           marginBottom: 16,
//           flexWrap: "wrap",
//           alignItems: "center",
//         }}
//       >
//         {(["all", "ready", "progress"] as const).map((f) => (
//           <button
//             key={f}
//             onClick={() => setFilter(f)}
//             style={{
//               padding: "5px 14px",
//               borderRadius: 20,
//               fontSize: 11,
//               fontWeight: 700,
//               cursor: "pointer",
//               background:
//                 filter === f ? "hsl(20 100% 50%)" : "hsl(var(--secondary))",
//               color: filter === f ? "#000" : "hsl(var(--foreground))",
//               border: filter === f ? "none" : "1px solid hsl(var(--border))",
//             }}
//           >
//             {f === "all"
//               ? `All (${members.length})`
//               : f === "ready"
//                 ? `🎁 Ready (${readyCount})`
//                 : `⏳ In Progress (${members.length - readyCount})`}
//           </button>
//         ))}
//         <input
//           style={{ ...inp, width: 200, marginLeft: "auto" }}
//           placeholder="Search name or email…"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//         />
//         <Btn variant="subtle" size="sm" onClick={load}>
//           ↻ Refresh
//         </Btn>
//       </div>

//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading members…
//         </div>
//       ) : filtered.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No members found.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//           {filtered.map((m) => {
//             const expired = m.expired;
//             const borderColor = m.rewardReady
//               ? expired
//                 ? "hsl(0 84% 51%)"
//                 : "hsl(142 72% 37%)"
//               : "hsl(var(--border))";
//             return (
//               <div
//                 key={m.uid}
//                 style={{
//                   background: "hsl(var(--secondary))",
//                   border: "1px solid hsl(var(--border))",
//                   borderRadius: 12,
//                   padding: "14px 16px",
//                   borderLeft: `3px solid ${borderColor}`,
//                 }}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "flex-start",
//                     flexWrap: "wrap",
//                     gap: 10,
//                     marginBottom: 10,
//                   }}
//                 >
//                   <div>
//                     <div
//                       style={{
//                         fontWeight: 700,
//                         fontSize: 14,
//                         display: "flex",
//                         alignItems: "center",
//                         gap: 8,
//                       }}
//                     >
//                       {m.name}
//                       {m.rewardReady && !expired && (
//                         <span
//                           style={{
//                             fontSize: 10,
//                             fontWeight: 700,
//                             padding: "2px 8px",
//                             borderRadius: 20,
//                             background: "hsl(142 72% 37% / 0.15)",
//                             color: "hsl(142 72% 37%)",
//                           }}
//                         >
//                           🎁 Reward Ready
//                         </span>
//                       )}
//                       {expired && (
//                         <span
//                           style={{
//                             fontSize: 10,
//                             fontWeight: 700,
//                             padding: "2px 8px",
//                             borderRadius: 20,
//                             background: "hsl(0 84% 51% / 0.15)",
//                             color: "hsl(0 84% 51%)",
//                           }}
//                         >
//                           ⚠ Reward Expired
//                         </span>
//                       )}
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 12,
//                         color: "hsl(var(--muted-foreground))",
//                         marginTop: 2,
//                       }}
//                     >
//                       {m.email} · {m.totalCheckIns} total check-ins
//                     </div>
//                   </div>
//                   {m.rewardReady && !expired && (
//                     <Btn
//                       variant="green"
//                       size="sm"
//                       onClick={() => setRedeemTarget(m)}
//                     >
//                       ✓ Redeem Reward
//                     </Btn>
//                   )}
//                 </div>

//                 <div style={{ marginBottom: 6 }}>
//                   <div
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       fontSize: 11,
//                       color: "hsl(var(--muted-foreground))",
//                       marginBottom: 4,
//                     }}
//                   >
//                     <span>
//                       {m.rewardReady
//                         ? "Current cycle complete ✓"
//                         : `${m.cycleCheckIns} / ${CHECKINS_REQUIRED} check-ins this cycle`}
//                     </span>
//                     <span style={{ fontWeight: 700 }}>
//                       {Math.round(m.pct)}%
//                     </span>
//                   </div>
//                   <ProgressBar pct={m.pct} ready={m.rewardReady} />
//                 </div>

//                 {m.rewardReady && !expired && (
//                   <div
//                     style={{
//                       fontSize: 11,
//                       color: "hsl(38 92% 44%)",
//                       marginTop: 6,
//                     }}
//                   >
//                     ⏰ Reward expires{" "}
//                     {new Date(m.expiresAt).toLocaleDateString("en-ZA", {
//                       day: "numeric",
//                       month: "long",
//                       year: "numeric",
//                     })}
//                   </div>
//                 )}

//                 {/* Show pending reward codes for reference */}
//                 {m.pendingRewards?.length > 0 && (
//                   <div
//                     style={{
//                       marginTop: 8,
//                       padding: "6px 10px",
//                       background: "hsl(var(--background))",
//                       borderRadius: 6,
//                       fontSize: 11,
//                       color: "hsl(var(--muted-foreground))",
//                       display: "flex",
//                       alignItems: "center",
//                       gap: 8,
//                     }}
//                   >
//                     <span>🔑 Code:</span>
//                     <span
//                       style={{
//                         fontFamily: "monospace",
//                         color: "hsl(20 100% 50%)",
//                         letterSpacing: "0.05em",
//                       }}
//                     >
//                       {m.pendingRewards[0].redemptionCode}
//                     </span>
//                   </div>
//                 )}

//                 {/* Full redemption history */}
//                 {m.redemptions.length > 0 && (
//                   <details style={{ marginTop: 10 }}>
//                     <summary
//                       style={{
//                         fontSize: 11,
//                         color: "hsl(var(--muted-foreground))",
//                         cursor: "pointer",
//                         userSelect: "none",
//                       }}
//                     >
//                       {m.redemptions.length} previous redemption
//                       {m.redemptions.length !== 1 ? "s" : ""}
//                     </summary>
//                     <div
//                       style={{
//                         display: "flex",
//                         flexDirection: "column",
//                         gap: 4,
//                         marginTop: 8,
//                       }}
//                     >
//                       {m.redemptions.slice(0, 5).map((r: any) => (
//                         <div
//                           key={r.id}
//                           style={{
//                             fontSize: 11,
//                             color: "hsl(var(--muted-foreground))",
//                             display: "flex",
//                             gap: 8,
//                             padding: "4px 8px",
//                             background: "hsl(var(--background))",
//                             borderRadius: 6,
//                           }}
//                         >
//                           <span>{r.type === "inbody" ? "📊" : "🤝"}</span>
//                           <span style={{ color: "hsl(var(--foreground))" }}>
//                             {r.type === "inbody"
//                               ? "Free InBody Assessment"
//                               : "Bring-a-Buddy Session"}
//                           </span>
//                           <span style={{ marginLeft: "auto" }}>
//                             {new Date(r.redeemedAt).toLocaleDateString(
//                               "en-ZA",
//                               {
//                                 day: "numeric",
//                                 month: "short",
//                                 year: "numeric",
//                               },
//                             )}
//                           </span>
//                         </div>
//                       ))}
//                     </div>
//                   </details>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       )}

//       {/* ── Redeem modal (from member list) ─────────────────────────────── */}
//       {redeemTarget && (
//         <div
//           style={{
//             position: "fixed",
//             inset: 0,
//             background: "rgba(0,0,0,0.7)",
//             zIndex: 200,
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             padding: 20,
//           }}
//           onClick={() => setRedeemTarget(null)}
//         >
//           <motion.div
//             initial={{ opacity: 0, scale: 0.95 }}
//             animate={{ opacity: 1, scale: 1 }}
//             style={{
//               background: "hsl(var(--card))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 16,
//               padding: 28,
//               width: "100%",
//               maxWidth: 440,
//             }}
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div
//               style={{
//                 fontFamily: "var(--font-display)",
//                 fontSize: 22,
//                 color: "hsl(20 100% 50%)",
//                 marginBottom: 4,
//               }}
//             >
//               Redeem Reward
//             </div>
//             <div
//               style={{
//                 fontSize: 13,
//                 color: "hsl(var(--muted-foreground))",
//                 marginBottom: 20,
//               }}
//             >
//               {redeemTarget.name} has earned a reward for {CHECKINS_REQUIRED}{" "}
//               check-ins.
//             </div>

//             <label style={lbl}>Reward Type</label>
//             <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
//               {(["inbody", "buddy"] as const).map((t) => (
//                 <button
//                   key={t}
//                   onClick={() => setRewardType(t)}
//                   style={{
//                     flex: 1,
//                     padding: "12px 10px",
//                     borderRadius: 10,
//                     cursor: "pointer",
//                     border: `2px solid ${rewardType === t ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
//                     background:
//                       rewardType === t
//                         ? "hsl(20 100% 50% / 0.08)"
//                         : "transparent",
//                     textAlign: "center",
//                     fontFamily: "var(--font-body)",
//                   }}
//                 >
//                   <div style={{ fontSize: 24, marginBottom: 4 }}>
//                     {t === "inbody" ? "📊" : "🤝"}
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 11,
//                       fontWeight: 700,
//                       color:
//                         rewardType === t
//                           ? "hsl(20 100% 50%)"
//                           : "hsl(var(--foreground))",
//                     }}
//                   >
//                     {t === "inbody"
//                       ? "Free InBody Assessment"
//                       : "Bring-a-Buddy Session"}
//                   </div>
//                 </button>
//               ))}
//             </div>

//             <label style={lbl}>Note (optional)</label>
//             <input
//               style={{ ...inp, marginBottom: 20 }}
//               placeholder="e.g. Redeemed at front desk on 9 Apr"
//               value={redeemNote}
//               onChange={(e) => setRedeemNote(e.target.value)}
//             />

//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn
//                 variant="primary"
//                 onClick={handleRedeem}
//                 disabled={submitting}
//               >
//                 {submitting ? "Redeeming…" : "✓ Confirm Redemption"}
//               </Btn>
//               <Btn variant="subtle" onClick={() => setRedeemTarget(null)}>
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         </div>
//       )}
//     </div>
//   );
// }
// // ── Tabs ──────────────────────────────────────────────────────────────────────
// const TABS = [
//   { id: "members", label: "👥 Members", desc: "Manage user tiers" },
//   {
//     id: "packages",
//     label: "🏷️ Gym Membership Packages",
//     desc: "Manage membership tiers",
//   },
//   { id: "community", label: "💬 Community Chat", desc: "Rooms & polls" },
//   { id: "classes", label: "📅 Classes", desc: "Schedule & bookings" },
//   { id: "packages", label: "🎟 Packages", desc: "Class credit packages" },
//   { id: "checkin", label: "Check-In", desc: "Manual override" },
//   { id: "rewards", label: "🎁 Rewards", desc: "View & redeem rewards" },
//   { id: "gallery", label: "Social Media", desc: "Platforms & uploads" },
//   // { id: "gallery", label: "📸 Gallery", desc: "Add & remove items" },
//   { id: "news", label: "📢 News & Events", desc: "Post updates" },
//   { id: "ads", label: "📣 Ad Enquiries", desc: "Manage advertising" },
//   { id: "banners", label: "🖼 Ad Banners", desc: "Live banner ads" },
//   { id: "challenges", label: "🏁 Challenges", desc: "Create challenges" },
//   { id: "feedback", label: "💬 Feedback", desc: "App feedback & ratings" },
//   { id: "terms", label: "📋 T&C Records", desc: "Acceptance audit log" },
//   { id: "instagram", label: "📱 Instagram", desc: "Auto-sync setup" },
// ];

// export function Admin() {
//   const [authed, setAuthed] = useState(
//     () => sessionStorage.getItem("mk2admin") === "true",
//   );
//   const [tab, setTab] = useState("members");
//   const [toastQ, setToastQ] = useState<any>(null);
//   const { isMobile } = useBreakpoint();
//   const toast = (msg: string, type: string) => setToastQ({ msg, type });
//   const login = () => {
//     sessionStorage.setItem("mk2admin", "true");
//     setAuthed(true);
//   };
//   const logout = () => {
//     sessionStorage.removeItem("mk2admin");
//     setAuthed(false);
//   };

//   if (!authed) return <AdminLogin onLogin={login} />;

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         background: "hsl(var(--background))",
//         color: "hsl(var(--foreground))",
//         fontFamily: "var(--font-body)",
//         paddingBottom: 40,
//       }}
//     >
//       <nav
//         style={{
//           background: "hsl(0 0% 4%)",
//           borderBottom: "1px solid hsl(var(--border))",
//           padding: "0 24px",
//           height: 56,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           position: "sticky",
//           top: 0,
//           zIndex: 100,
//         }}
//       >
//         <div
//           style={{
//             fontFamily: "var(--font-display)",
//             fontSize: 20,
//             letterSpacing: "0.15em",
//             color: "hsl(20 100% 50%)",
//           }}
//         >
//           MK2R ADMIN
//         </div>
//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//           <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
//             Management Portal
//           </span>
//           <Btn variant="subtle" size="sm" onClick={logout}>
//             Sign Out
//           </Btn>
//         </div>
//       </nav>

//       <div
//         style={{
//           maxWidth: 1060,
//           margin: "0 auto",
//           padding: isMobile ? "20px 14px" : "32px 24px",
//         }}
//       >
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
//             gap: 10,
//             marginBottom: 28,
//           }}
//         >
//           {TABS.map((t) => (
//             <button
//               key={t.id}
//               onClick={() => setTab(t.id)}
//               style={{
//                 background:
//                   tab === t.id ? "hsl(20 100% 50%)" : "hsl(var(--card))",
//                 color: tab === t.id ? "#000" : "hsl(var(--foreground))",
//                 border: `1px solid ${tab === t.id ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
//                 borderRadius: 10,
//                 padding: "14px 16px",
//                 textAlign: "left",
//                 cursor: "pointer",
//                 fontFamily: "var(--font-body)",
//                 transition: "all 0.15s",
//               }}
//             >
//               <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
//               <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>
//                 {t.desc}
//               </div>
//             </button>
//           ))}
//         </div>

//         <motion.div
//           key={tab}
//           initial={{ opacity: 0, y: 6 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.2 }}
//           style={{
//             background: "hsl(var(--card))",
//             border: "1px solid hsl(var(--border))",
//             borderRadius: 14,
//             padding: isMobile ? 16 : 24,
//           }}
//         >
//           {tab === "members" && <MembersManager toast={toast} />}
//           {tab === "community" && <CommunityManager toast={toast} />}
//           {tab === "classes" && <ClassesManager toast={toast} />}
//           {tab === "packages" && <PackagesManager toast={toast} />}
//           {tab === "checkin" && <ManualCheckInManager toast={toast} />}
//           {tab === "gallery" && <SocialMediaManager toast={toast} />}
//           {tab === "rewards" && <RewardsManager toast={toast} />}
//           {/* {tab === "gallery" && <GalleryManager toast={toast} />} */}
//           {tab === "news" && <NewsManager toast={toast} />}
//           {tab === "ads" && <AdEnquiriesManager toast={toast} />}
//           {tab === "feedback" && <FeedbackManager toast={toast} />}
//           {tab === "instagram" && <InstagramSetup />}
//           {tab === "terms" && <TermsManager toast={toast} />}
//           {tab === "banners" && <BannersManager toast={toast} />}
//           {tab === "challenges" && <ChallengesManager toast={toast} />}
//         </motion.div>
//       </div>

//       {toastQ && <MToast {...toastQ} onDone={() => setToastQ(null)} />}
//     </div>
//   );
// }

// import { useState, useEffect } from "react";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import {
//   fetchCollection,
//   addToCollection,
//   updateInCollection,
//   deleteFromCollection,
// } from "@/lib/firebase";
// import { ref, get, set, remove, push, onValue } from "firebase/database";
// import { db } from "@/lib/firebase";
// import { motion, AnimatePresence } from "framer-motion";

// import {
//   buildBookingKey,
//   formatDateKey,
//   getDayName,
// } from "@/pages/ClassBooking";

// const ADMIN_PASSWORD = "MK2R@2026";
// const DAYS = [
//   "Monday",
//   "Tuesday",
//   "Wednesday",
//   "Thursday",
//   "Friday",
//   "Saturday",
//   "Sunday",
// ];
// const CATS = [
//   "Cardio",
//   "Strength",
//   "Flexibility",
//   "Core",
//   "Combat",
//   "CrossFit",
//   "Recovery",
//   "Spin",
//   "Yoga",
// ];
// const INTENSITIES = [
//   "Low",
//   "Low–Medium",
//   "Medium",
//   "Medium–High",
//   "High",
//   "Very High",
// ];
// const NEWS_TYPES = ["News", "Event", "Announcement"];
// const GAL_CATS = [
//   "Classes",
//   "Facilities",
//   "Members",
//   "Events",
//   "Transformation",
// ];
// const MONTH_NAMES = [
//   "January",
//   "February",
//   "March",
//   "April",
//   "May",
//   "June",
//   "July",
//   "August",
//   "September",
//   "October",
//   "November",
//   "December",
// ];
// const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// const inp: any = {
//   width: "100%",
//   background: "hsl(var(--secondary))",
//   border: "1px solid hsl(var(--border))",
//   borderRadius: 8,
//   padding: "10px 14px",
//   color: "hsl(var(--foreground))",
//   fontSize: 13,
//   outline: "none",
//   fontFamily: "var(--font-body)",
//   boxSizing: "border-box",
// };
// const lbl: any = {
//   fontSize: 10,
//   fontWeight: 700,
//   textTransform: "uppercase",
//   letterSpacing: "0.1em",
//   color: "hsl(var(--muted-foreground))",
//   display: "block",
//   marginBottom: 6,
// };

// function Btn({
//   children,
//   onClick,
//   variant = "primary",
//   size = "md",
//   disabled = false,
//   full = false,
// }: any) {
//   const s: any = {
//     primary: { background: "hsl(20 100% 50%)", color: "#000", border: "none" },
//     ghost: {
//       background: "transparent",
//       color: "hsl(20 100% 50%)",
//       border: "1px solid hsl(20 100% 50%)",
//     },
//     danger: { background: "hsl(0 84% 51%)", color: "#fff", border: "none" },
//     subtle: {
//       background: "hsl(var(--secondary))",
//       color: "hsl(var(--foreground))",
//       border: "1px solid hsl(var(--border))",
//     },
//     green: { background: "hsl(142 72% 37%)", color: "#fff", border: "none" },
//   }[variant];
//   const pad: any = { sm: "6px 14px", md: "9px 20px", lg: "12px 28px" }[size];
//   return (
//     <button
//       onClick={onClick}
//       disabled={disabled}
//       style={{
//         ...s,
//         padding: pad,
//         fontSize: 11,
//         fontWeight: 700,
//         fontFamily: "var(--font-body)",
//         letterSpacing: "0.05em",
//         textTransform: "uppercase",
//         borderRadius: 8,
//         cursor: disabled ? "not-allowed" : "pointer",
//         opacity: disabled ? 0.5 : 1,
//         width: full ? "100%" : "auto",
//         display: "inline-flex",
//         alignItems: "center",
//         gap: 6,
//       }}
//     >
//       {children}
//     </button>
//   );
// }

// function MToast({ msg, type, onDone }: any) {
//   useEffect(() => {
//     const t = setTimeout(onDone, 3000);
//     return () => clearTimeout(t);
//   }, [onDone]);
//   const bg: any =
//     {
//       success: "hsl(142 72% 37%)",
//       error: "hsl(0 84% 51%)",
//       info: "hsl(20 100% 50%)",
//     }[type] || "hsl(20 100% 50%)";
//   return (
//     <div
//       style={{
//         position: "fixed",
//         bottom: 24,
//         right: 24,
//         zIndex: 9999,
//         background: bg,
//         color: type === "error" ? "#fff" : "#000",
//         borderRadius: 10,
//         padding: "12px 20px",
//         fontWeight: 700,
//         fontSize: 13,
//         fontFamily: "var(--font-body)",
//         boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
//       }}
//     >
//       {msg}
//     </div>
//   );
// }

// function AdminLogin({ onLogin }: { onLogin: () => void }) {
//   const [pw, setPw] = useState("");
//   const [err, setErr] = useState("");
//   const check = () =>
//     pw === ADMIN_PASSWORD
//       ? onLogin()
//       : (setErr("Incorrect password"), setPw(""));
//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         background: "hsl(var(--background))",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: 20,
//       }}
//     >
//       <div
//         style={{
//           width: "100%",
//           maxWidth: 380,
//           background: "hsl(var(--card))",
//           border: "1px solid hsl(var(--border))",
//           borderRadius: 16,
//           padding: "36px 32px",
//         }}
//       >
//         <div
//           style={{
//             fontFamily: "var(--font-display)",
//             fontSize: 26,
//             letterSpacing: "0.15em",
//             color: "hsl(20 100% 50%)",
//             marginBottom: 4,
//           }}
//         >
//           MK2R ADMIN
//         </div>
//         <div
//           style={{
//             fontSize: 12,
//             color: "hsl(var(--muted-foreground))",
//             marginBottom: 24,
//           }}
//         >
//           Management Portal — Authorised Access Only
//         </div>
//         <label style={lbl}>Admin Password</label>
//         <input
//           type="password"
//           style={{ ...inp, marginBottom: 8 }}
//           placeholder="Enter password"
//           value={pw}
//           onChange={(e) => setPw(e.target.value)}
//           onKeyDown={(e) => e.key === "Enter" && check()}
//         />
//         {err && (
//           <div
//             style={{ fontSize: 12, color: "hsl(0 84% 51%)", marginBottom: 10 }}
//           >
//             {err}
//           </div>
//         )}
//         <div style={{ marginTop: 14 }}>
//           <Btn variant="primary" size="lg" onClick={check} full>
//             Enter Admin Panel →
//           </Btn>
//         </div>
//       </div>
//     </div>
//   );
// }

// function AdminCalendar({
//   selectedDate,
//   onSelect,
//   classDateCounts,
// }: {
//   selectedDate: Date;
//   onSelect: (d: Date) => void;
//   classDateCounts: Record<string, number>;
// }) {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
//   const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
//   const firstDay = new Date(viewYear, viewMonth, 1).getDay();
//   const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
//   const prevMonth = () => {
//     if (viewMonth === 0) {
//       setViewMonth(11);
//       setViewYear((y) => y - 1);
//     } else setViewMonth((m) => m - 1);
//   };
//   const nextMonth = () => {
//     if (viewMonth === 11) {
//       setViewMonth(0);
//       setViewYear((y) => y + 1);
//     } else setViewMonth((m) => m + 1);
//   };
//   const cells: (number | null)[] = [];
//   for (let i = 0; i < firstDay; i++) cells.push(null);
//   for (let d = 1; d <= daysInMonth; d++) cells.push(d);
//   return (
//     <div
//       style={{
//         background: "hsl(var(--secondary))",
//         border: "1px solid hsl(var(--border))",
//         borderRadius: 12,
//         padding: 16,
//         marginBottom: 20,
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           marginBottom: 12,
//         }}
//       >
//         <button
//           onClick={prevMonth}
//           style={{
//             background: "none",
//             border: "none",
//             cursor: "pointer",
//             color: "hsl(var(--muted-foreground))",
//             fontSize: 16,
//             padding: "2px 8px",
//           }}
//         >
//           ←
//         </button>
//         <div style={{ fontWeight: 700, fontSize: 13 }}>
//           {MONTH_NAMES[viewMonth]} {viewYear}
//         </div>
//         <button
//           onClick={nextMonth}
//           style={{
//             background: "none",
//             border: "none",
//             cursor: "pointer",
//             color: "hsl(var(--muted-foreground))",
//             fontSize: 16,
//             padding: "2px 8px",
//           }}
//         >
//           →
//         </button>
//       </div>
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(7,1fr)",
//           marginBottom: 4,
//         }}
//       >
//         {DAY_NAMES.map((d) => (
//           <div
//             key={d}
//             style={{
//               textAlign: "center",
//               fontSize: 10,
//               fontWeight: 700,
//               color: "hsl(var(--muted-foreground))",
//               padding: "2px 0",
//             }}
//           >
//             {d}
//           </div>
//         ))}
//       </div>
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(7,1fr)",
//           gap: 2,
//         }}
//       >
//         {cells.map((day, i) => {
//           if (!day) return <div key={i} />;
//           const date = new Date(viewYear, viewMonth, day);
//           date.setHours(0, 0, 0, 0);
//           const key = formatDateKey(date);
//           const isToday = date.getTime() === today.getTime();
//           const isSel = formatDateKey(selectedDate) === key;
//           const count = classDateCounts[key] || 0;
//           return (
//             <button
//               key={i}
//               onClick={() => onSelect(new Date(viewYear, viewMonth, day))}
//               style={{
//                 aspectRatio: "1",
//                 borderRadius: 6,
//                 fontSize: 11,
//                 fontWeight: 600,
//                 cursor: "pointer",
//                 border: "none",
//                 background: isSel
//                   ? "hsl(20 100% 50%)"
//                   : isToday
//                     ? "hsl(20 100% 50% / 0.15)"
//                     : "transparent",
//                 color: isSel
//                   ? "#000"
//                   : isToday
//                     ? "hsl(20 100% 50%)"
//                     : "hsl(var(--foreground))",
//                 outline:
//                   isToday && !isSel ? "1px solid hsl(20 100% 50%)" : "none",
//                 position: "relative",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 gap: 1,
//               }}
//             >
//               {day}
//               {count > 0 && (
//                 <span
//                   style={{
//                     width: 4,
//                     height: 4,
//                     borderRadius: "50%",
//                     background: isSel ? "#000" : "hsl(20 100% 50%)",
//                     display: "block",
//                   }}
//                 />
//               )}
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// // ── Classes Manager with chargeNonMembers + price ─────────────────────────────
// function ClassesManager({ toast }: any) {
//   const [classes, setClasses] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [editing, setEditing] = useState<any>(null);
//   const [scheduleMode, setScheduleMode] = useState<"day" | "date">("day");
//   const [calDate, setCalDate] = useState<Date>(() => {
//     const d = new Date();
//     d.setHours(0, 0, 0, 0);
//     return d;
//   });
//   const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
//   const [allBookings, setAllBookings] = useState<
//     Record<string, Record<string, any>>
//   >({});
//   const [expandedBookings, setExpandedBookings] = useState<string | null>(null);
//   const [cancelling, setCancelling] = useState<string | null>(null);

//   const blank = {
//     name: "",
//     time: "",
//     trainer: "",
//     day: "Monday",
//     specificDate: "",
//     spots: "12",
//     duration: "45 min",
//     intensity: "Medium",
//     category: "Cardio",
//     subtitle: "",
//     details: "",
//     scheduleType: "day",
//     wod: "",
//     chargeNonMembers: false,
//     price: "0",
//   };
//   const [form, setForm] = useState(blank);

//   const load = async () => {
//     setLoading(true);
//     setClasses(await fetchCollection("admin_classes"));
//     setLoading(false);
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   useEffect(() => {
//     return onValue(ref(db, "class_bookings"), (snap) =>
//       setAllBookings(snap.val() ?? {}),
//     );
//   }, []);

//   const save = async () => {
//     if (!form.name || !form.time || !form.trainer)
//       return toast("Fill in Name, Time and Trainer", "error");

//     const data = {
//       ...form,
//       spots: parseInt(form.spots),
//       details: form.details.split("\n").filter(Boolean),
//       scheduleType: scheduleMode,
//       specificDate: scheduleMode === "date" ? formatDateKey(calDate) : "",
//       day: scheduleMode === "day" ? form.day : getDayName(calDate),
//       chargeNonMembers: Boolean(form.chargeNonMembers),
//       price: form.chargeNonMembers ? parseFloat(form.price) || 0 : 0,
//     };

//     if (editing) {
//       const existingSnap = await get(
//         ref(db, `admin_classes/${editing.id}/bookedCount`),
//       );
//       const currentBookedCount = existingSnap.exists()
//         ? (existingSnap.val() as number)
//         : 0;
//       await updateInCollection("admin_classes", editing.id, {
//         ...data,
//         bookedCount: currentBookedCount,
//       });
//       toast("Updated ✓", "success");
//     } else {
//       await addToCollection("admin_classes", { ...data, bookedCount: 0 });
//       toast("Class added ✓", "success");
//     }
//     setShowForm(false);
//     setEditing(null);
//     setForm(blank);
//     load();
//   };

//   const del = async (id: string) => {
//     if (!confirm("Delete this class?")) return;
//     await deleteFromCollection("admin_classes", id);
//     toast("Deleted", "info");
//     load();
//   };

//   const startEdit = (c: any) => {
//     setEditing(c);
//     setScheduleMode(c.scheduleType || "day");
//     setForm({
//       name: c.name,
//       time: c.time,
//       trainer: c.trainer,
//       day: c.day,
//       specificDate: c.specificDate || "",
//       spots: String(c.spots),
//       duration: c.duration,
//       intensity: c.intensity,
//       category: c.category,
//       subtitle: c.subtitle || "",
//       details: (c.details || []).join("\n"),
//       scheduleType: c.scheduleType || "day",
//       wod: c.wod || "",
//       chargeNonMembers: Boolean(c.chargeNonMembers),
//       price: String(c.price ?? 0),
//     });
//     if (c.specificDate) setCalDate(new Date(c.specificDate + "T00:00:00"));
//     setShowForm(true);
//   };

//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));

//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const classDateCounts: Record<string, number> = {};
//   classes.forEach((cls) => {
//     if (cls.scheduleType === "date" && cls.specificDate) {
//       classDateCounts[cls.specificDate] =
//         (classDateCounts[cls.specificDate] || 0) + 1;
//     } else {
//       for (let i = 0; i < 60; i++) {
//         const d = new Date(today);
//         d.setDate(today.getDate() + i);
//         const dayName = getDayName(d);
//         if (cls.day === dayName) {
//           const key = formatDateKey(d);
//           classDateCounts[key] = (classDateCounts[key] || 0) + 1;
//         }
//       }
//     }
//   });

//   const selectedDateKey = formatDateKey(calDate);
//   const selectedDayName = getDayName(calDate);
//   const classesOnDate = classes
//     .filter((cls) =>
//       cls.scheduleType === "date"
//         ? cls.specificDate === selectedDateKey
//         : cls.day === selectedDayName,
//     )
//     .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

//   const adminCancelBooking = async (
//     cls: any,
//     uid: string,
//     memberName: string,
//   ) => {
//     if (!confirm(`Remove ${memberName}'s booking from ${cls.name}?`)) return;
//     setCancelling(`${cls.name}_${uid}`);
//     const bk = buildBookingKey(cls.name, selectedDateKey);
//     try {
//       await set(ref(db, `class_bookings/${bk}/${uid}`), null);
//       const credSnap = await get(ref(db, `mk2_users/${uid}/classCredits`));
//       const current = credSnap.exists() ? (credSnap.val() as number) : 0;
//       await set(ref(db, `mk2_users/${uid}/classCredits`), current + 1);
//       await push(ref(db, `mk2_users/${uid}/creditHistory`), {
//         amount: +1,
//         type: "admin_cancel",
//         note: `Admin removed: ${cls.name} on ${selectedDateKey}`,
//         timestamp: Date.now(),
//       });
//       const userSnap = await get(ref(db, `mk2_users/${uid}/bookings`));
//       if (userSnap.exists()) {
//         const bookings = userSnap.val();
//         const filtered = Array.isArray(bookings)
//           ? bookings.filter(
//               (b: any) =>
//                 !(b.name === cls.name && b.dateKey === selectedDateKey),
//             )
//           : [];
//         await set(ref(db, `mk2_users/${uid}/bookings`), filtered);
//       }
//       toast(`${memberName} removed · credit refunded ✓`, "success");
//     } catch {
//       toast("Cancel failed", "error");
//     }
//     setCancelling(null);
//   };

//   const getClassBookings = (
//     cls: any,
//   ): Array<{ uid: string; name: string; email: string }> => {
//     const bk = buildBookingKey(cls.name, selectedDateKey);
//     const raw = allBookings[bk] ?? {};
//     return Object.entries(raw).map(([uid, val]: [string, any]) => ({
//       uid,
//       name: val.name || "Unknown",
//       email: val.email || "",
//     }));
//   };

//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Classes ({classes.length})
//         </div>
//         <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//           <div
//             style={{
//               display: "flex",
//               background: "hsl(var(--secondary))",
//               borderRadius: 8,
//               padding: 2,
//               gap: 2,
//             }}
//           >
//             {(["calendar", "list"] as const).map((v) => (
//               <button
//                 key={v}
//                 onClick={() => setViewMode(v)}
//                 style={{
//                   padding: "5px 14px",
//                   borderRadius: 6,
//                   fontSize: 11,
//                   fontWeight: 700,
//                   cursor: "pointer",
//                   background:
//                     viewMode === v ? "hsl(20 100% 50%)" : "transparent",
//                   color:
//                     viewMode === v ? "#000" : "hsl(var(--muted-foreground))",
//                   border: "none",
//                   textTransform: "capitalize",
//                 }}
//               >
//                 {v}
//               </button>
//             ))}
//           </div>
//           <Btn
//             variant="primary"
//             size="sm"
//             onClick={() => {
//               setShowForm(!showForm);
//               setEditing(null);
//               setForm(blank);
//               setScheduleMode("day");
//             }}
//           >
//             {showForm ? "✕ Cancel" : "+ Add Class"}
//           </Btn>
//         </div>
//       </div>

//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
//               {editing ? "Edit Class" : "New Class"}
//             </div>

//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Schedule Type</label>
//               <div style={{ display: "flex", gap: 8 }}>
//                 {(["day", "date"] as const).map((mode) => (
//                   <button
//                     key={mode}
//                     onClick={() => setScheduleMode(mode)}
//                     style={{
//                       padding: "7px 18px",
//                       borderRadius: 8,
//                       fontSize: 11,
//                       fontWeight: 700,
//                       cursor: "pointer",
//                       border: "1px solid",
//                       borderColor:
//                         scheduleMode === mode
//                           ? "hsl(20 100% 50%)"
//                           : "hsl(var(--border))",
//                       background:
//                         scheduleMode === mode
//                           ? "hsl(20 100% 50%)"
//                           : "transparent",
//                       color:
//                         scheduleMode === mode
//                           ? "#000"
//                           : "hsl(var(--foreground))",
//                     }}
//                   >
//                     {mode === "day"
//                       ? "📅 Weekly (recurring)"
//                       : "🗓 Specific Date (once-off)"}
//                   </button>
//                 ))}
//               </div>
//             </div>

//             {scheduleMode === "day" ? (
//               <div style={{ marginBottom: 14 }}>
//                 <label style={lbl}>Day of Week</label>
//                 <select style={inp} value={form.day} onChange={f("day")}>
//                   {DAYS.map((d) => (
//                     <option key={d}>{d}</option>
//                   ))}
//                 </select>
//               </div>
//             ) : (
//               <div style={{ marginBottom: 14 }}>
//                 <label style={lbl}>Pick a Date</label>
//                 <AdminCalendar
//                   selectedDate={calDate}
//                   onSelect={setCalDate}
//                   classDateCounts={classDateCounts}
//                 />
//                 <div
//                   style={{
//                     fontSize: 12,
//                     color: "hsl(var(--muted-foreground))",
//                     marginTop: -10,
//                     marginBottom: 8,
//                   }}
//                 >
//                   Selected:{" "}
//                   <strong style={{ color: "hsl(20 100% 50%)" }}>
//                     {calDate.toLocaleDateString("en-ZA", {
//                       weekday: "long",
//                       day: "numeric",
//                       month: "long",
//                       year: "numeric",
//                     })}
//                   </strong>
//                 </div>
//               </div>
//             )}

//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               {(
//                 [
//                   ["name", "Class Name", "e.g. HIIT Blast"],
//                   ["time", "Time", "06:00"],
//                   ["trainer", "Trainer", "Coach Sipho"],
//                   ["spots", "Max Spots", "12"],
//                   ["duration", "Duration", "45 min"],
//                   ["subtitle", "Subtitle", "Short description"],
//                 ] as any[]
//               ).map(([k, l, p]: any) => (
//                 <div key={k}>
//                   <label style={lbl}>{l}</label>
//                   <input
//                     style={inp}
//                     placeholder={p}
//                     value={(form as any)[k]}
//                     onChange={f(k)}
//                   />
//                 </div>
//               ))}
//               {(
//                 [
//                   ["category", "Category", CATS],
//                   ["intensity", "Intensity", INTENSITIES],
//                 ] as any[]
//               ).map(([k, l, opts]: any) => (
//                 <div key={k}>
//                   <label style={lbl}>{l}</label>
//                   <select style={inp} value={(form as any)[k]} onChange={f(k)}>
//                     {opts.map((o: string) => (
//                       <option key={o}>{o}</option>
//                     ))}
//                   </select>
//                 </div>
//               ))}
//             </div>

//             {/* Non-Member Booking Section */}
//             <div
//               style={{
//                 marginBottom: 14,
//                 padding: "14px 16px",
//                 background: "hsl(var(--background))",
//                 borderRadius: 10,
//                 border: "1px solid hsl(var(--border))",
//               }}
//             >
//               <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>
//                 Non-Member Booking
//               </div>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: 10,
//                   marginBottom: 10,
//                 }}
//               >
//                 <input
//                   type="checkbox"
//                   id="chargeNonMembers"
//                   checked={Boolean(form.chargeNonMembers)}
//                   onChange={(e) =>
//                     setForm((p) => ({
//                       ...p,
//                       chargeNonMembers: e.target.checked,
//                       price: e.target.checked ? p.price : "0",
//                     }))
//                   }
//                   style={{ width: 16, height: 16, cursor: "pointer" }}
//                 />
//                 <label
//                   htmlFor="chargeNonMembers"
//                   style={{
//                     fontSize: 13,
//                     color: "hsl(var(--foreground))",
//                     cursor: "pointer",
//                     userSelect: "none",
//                   }}
//                 >
//                   Charge non-members to book this class
//                 </label>
//               </div>
//               {form.chargeNonMembers && (
//                 <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                   <div style={{ flex: 1, maxWidth: 200 }}>
//                     <label style={lbl}>Price (ZAR)</label>
//                     <input
//                       type="number"
//                       style={inp}
//                       placeholder="150.00"
//                       min="0"
//                       step="0.01"
//                       value={form.price}
//                       onChange={f("price")}
//                     />
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 12,
//                       color: "hsl(var(--muted-foreground))",
//                       marginTop: 20,
//                     }}
//                   >
//                     Non-members will pay via PayFast before booking is
//                     confirmed.
//                   </div>
//                 </div>
//               )}
//               {!form.chargeNonMembers && (
//                 <div
//                   style={{
//                     fontSize: 12,
//                     color: "hsl(var(--muted-foreground))",
//                   }}
//                 >
//                   Non-members can book this class for free (no payment
//                   required).
//                 </div>
//               )}
//             </div>

//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>What's Included (one item per line)</label>
//               <textarea
//                 style={{ ...inp, minHeight: 80, resize: "vertical" }}
//                 placeholder={
//                   "10 rounds Tabata\nKettlebell swings\nBurns 400–600 kcal"
//                 }
//                 value={form.details}
//                 onChange={f("details")}
//               />
//             </div>
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>WOD / Workout Detail (optional)</label>
//               <div
//                 style={{
//                   fontSize: 11,
//                   color: "hsl(var(--muted-foreground))",
//                   marginBottom: 6,
//                 }}
//               >
//                 Paste the full workout here — warm up, WOD parts, weights
//                 (Comp/Scaled/Beg).
//               </div>
//               <textarea
//                 style={{
//                   ...inp,
//                   minHeight: 160,
//                   resize: "vertical",
//                   fontFamily: "monospace",
//                   fontSize: 12,
//                 }}
//                 placeholder={`Warm Up:\n3 ROUNDS\n0:30 Machine\n\nPart WOD 1: BUDDY WOD\n4 ROUNDS FT (12:00 CAP)\n24/20 Cal Row\n\nComp: 80/55\nScaled: 70/45\nBeg: 40/30`}
//                 value={form.wod}
//                 onChange={f("wod")}
//               />
//             </div>

//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save}>
//                 {editing ? "Save Changes" : "Add Class"}
//               </Btn>
//               <Btn
//                 variant="subtle"
//                 onClick={() => {
//                   setShowForm(false);
//                   setEditing(null);
//                 }}
//               >
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Calendar view */}
//       {viewMode === "calendar" && (
//         <>
//           <AdminCalendar
//             selectedDate={calDate}
//             onSelect={(d) => {
//               setCalDate(d);
//               setExpandedBookings(null);
//             }}
//             classDateCounts={classDateCounts}
//           />
//           <div style={{ marginBottom: 12 }}>
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
//               {calDate.toLocaleDateString("en-ZA", {
//                 weekday: "long",
//                 day: "numeric",
//                 month: "long",
//               })}{" "}
//               — {classesOnDate.length} class
//               {classesOnDate.length !== 1 ? "es" : ""}
//             </div>
//             {loading ? (
//               <div
//                 style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}
//               >
//                 Loading…
//               </div>
//             ) : classesOnDate.length === 0 ? (
//               <div
//                 style={{
//                   color: "hsl(var(--muted-foreground))",
//                   fontSize: 13,
//                   padding: "16px 0",
//                 }}
//               >
//                 No classes on this date.
//               </div>
//             ) : (
//               <div
//                 style={{ display: "flex", flexDirection: "column", gap: 10 }}
//               >
//                 {classesOnDate.map((cls) => {
//                   const bookings = getClassBookings(cls);
//                   const isExpanded = expandedBookings === cls.id;
//                   return (
//                     <div
//                       key={cls.id}
//                       style={{
//                         background: "hsl(var(--secondary))",
//                         border: "1px solid hsl(var(--border))",
//                         borderRadius: 10,
//                         overflow: "hidden",
//                       }}
//                     >
//                       <div
//                         style={{
//                           padding: "12px 16px",
//                           display: "flex",
//                           justifyContent: "space-between",
//                           alignItems: "center",
//                           flexWrap: "wrap",
//                           gap: 10,
//                         }}
//                       >
//                         <div>
//                           <div
//                             style={{
//                               fontWeight: 700,
//                               fontSize: 14,
//                               display: "flex",
//                               alignItems: "center",
//                               gap: 8,
//                             }}
//                           >
//                             {cls.name}
//                             <span
//                               style={{
//                                 fontSize: 10,
//                                 padding: "2px 8px",
//                                 borderRadius: 20,
//                                 background:
//                                   cls.scheduleType === "date"
//                                     ? "hsl(217 91% 53% / 0.15)"
//                                     : "hsl(142 72% 37% / 0.15)",
//                                 color:
//                                   cls.scheduleType === "date"
//                                     ? "hsl(217 91% 53%)"
//                                     : "hsl(142 72% 37%)",
//                                 fontWeight: 700,
//                               }}
//                             >
//                               {cls.scheduleType === "date"
//                                 ? "Once-off"
//                                 : "Weekly"}
//                             </span>
//                             {cls.chargeNonMembers && (
//                               <span
//                                 style={{
//                                   fontSize: 10,
//                                   padding: "2px 8px",
//                                   borderRadius: 20,
//                                   background: "hsl(38 92% 44% / 0.15)",
//                                   color: "hsl(38 92% 44%)",
//                                   fontWeight: 700,
//                                   border: "1px solid hsl(38 92% 44% / 0.3)",
//                                 }}
//                               >
//                                 💳 R{Number(cls.price).toFixed(0)} non-members
//                               </span>
//                             )}
//                           </div>
//                           <div
//                             style={{
//                               fontSize: 12,
//                               color: "hsl(var(--muted-foreground))",
//                               marginTop: 2,
//                             }}
//                           >
//                             {cls.time} · {cls.trainer} · {cls.spots} spots ·{" "}
//                             {cls.category}
//                           </div>
//                         </div>
//                         <div
//                           style={{
//                             display: "flex",
//                             gap: 8,
//                             alignItems: "center",
//                           }}
//                         >
//                           <button
//                             onClick={() =>
//                               setExpandedBookings(isExpanded ? null : cls.id)
//                             }
//                             style={{
//                               padding: "5px 12px",
//                               borderRadius: 20,
//                               fontSize: 11,
//                               fontWeight: 700,
//                               cursor: "pointer",
//                               background:
//                                 bookings.length > 0
//                                   ? "hsl(20 100% 50% / 0.15)"
//                                   : "hsl(var(--secondary))",
//                               color:
//                                 bookings.length > 0
//                                   ? "hsl(20 100% 50%)"
//                                   : "hsl(var(--muted-foreground))",
//                               border: `1px solid ${bookings.length > 0 ? "hsl(20 100% 50% / 0.3)" : "hsl(var(--border))"}`,
//                             }}
//                           >
//                             👥 {bookings.length}/{cls.spots}{" "}
//                             {isExpanded ? "▲" : "▼"}
//                           </button>
//                           <Btn
//                             variant="subtle"
//                             size="sm"
//                             onClick={() => startEdit(cls)}
//                           >
//                             Edit
//                           </Btn>
//                           <Btn
//                             variant="danger"
//                             size="sm"
//                             onClick={() => del(cls.id)}
//                           >
//                             Delete
//                           </Btn>
//                         </div>
//                       </div>

//                       <AnimatePresence>
//                         {isExpanded && (
//                           <motion.div
//                             initial={{ height: 0, opacity: 0 }}
//                             animate={{ height: "auto", opacity: 1 }}
//                             exit={{ height: 0, opacity: 0 }}
//                             style={{
//                               borderTop: "1px solid hsl(var(--border))",
//                               background: "hsl(var(--background))",
//                               padding: "12px 16px",
//                             }}
//                           >
//                             <div
//                               style={{
//                                 fontSize: 11,
//                                 fontWeight: 700,
//                                 color: "hsl(var(--muted-foreground))",
//                                 textTransform: "uppercase",
//                                 letterSpacing: "0.1em",
//                                 marginBottom: 10,
//                               }}
//                             >
//                               Booked Members ({bookings.length})
//                             </div>
//                             {bookings.length === 0 ? (
//                               <div
//                                 style={{
//                                   fontSize: 13,
//                                   color: "hsl(var(--muted-foreground))",
//                                 }}
//                               >
//                                 No bookings yet for this class on this date.
//                               </div>
//                             ) : (
//                               <div
//                                 style={{
//                                   display: "flex",
//                                   flexDirection: "column",
//                                   gap: 8,
//                                 }}
//                               >
//                                 {bookings.map((b) => (
//                                   <div
//                                     key={b.uid}
//                                     style={{
//                                       display: "flex",
//                                       alignItems: "center",
//                                       justifyContent: "space-between",
//                                       padding: "8px 12px",
//                                       borderRadius: 8,
//                                       background: "hsl(var(--secondary))",
//                                       flexWrap: "wrap",
//                                       gap: 8,
//                                     }}
//                                   >
//                                     <div
//                                       style={{
//                                         display: "flex",
//                                         alignItems: "center",
//                                         gap: 10,
//                                       }}
//                                     >
//                                       <div
//                                         style={{
//                                           width: 30,
//                                           height: 30,
//                                           borderRadius: "50%",
//                                           background: "hsl(20 100% 50%)",
//                                           display: "flex",
//                                           alignItems: "center",
//                                           justifyContent: "center",
//                                           fontWeight: 700,
//                                           fontSize: 13,
//                                           color: "#000",
//                                           flexShrink: 0,
//                                         }}
//                                       >
//                                         {b.name[0] ?? "?"}
//                                       </div>
//                                       <div>
//                                         <div
//                                           style={{
//                                             fontWeight: 700,
//                                             fontSize: 13,
//                                           }}
//                                         >
//                                           {b.name}
//                                         </div>
//                                         <div
//                                           style={{
//                                             fontSize: 11,
//                                             color:
//                                               "hsl(var(--muted-foreground))",
//                                           }}
//                                         >
//                                           {b.email}
//                                         </div>
//                                       </div>
//                                     </div>
//                                     <Btn
//                                       variant="danger"
//                                       size="sm"
//                                       disabled={
//                                         cancelling === `${cls.name}_${b.uid}`
//                                       }
//                                       onClick={() =>
//                                         adminCancelBooking(cls, b.uid, b.name)
//                                       }
//                                     >
//                                       {cancelling === `${cls.name}_${b.uid}`
//                                         ? "Removing…"
//                                         : "✕ Remove"}
//                                     </Btn>
//                                   </div>
//                                 ))}
//                               </div>
//                             )}
//                           </motion.div>
//                         )}
//                       </AnimatePresence>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         </>
//       )}

//       {/* List view */}
//       {viewMode === "list" &&
//         (loading ? (
//           <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//             Loading…
//           </div>
//         ) : classes.length === 0 ? (
//           <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//             No classes yet.
//           </div>
//         ) : (
//           <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//             {classes.map((cls) => (
//               <div
//                 key={cls.id}
//                 style={{
//                   background: "hsl(var(--secondary))",
//                   border: "1px solid hsl(var(--border))",
//                   borderRadius: 10,
//                   padding: "12px 16px",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                   flexWrap: "wrap",
//                   gap: 10,
//                 }}
//               >
//                 <div>
//                   <div
//                     style={{
//                       fontWeight: 700,
//                       fontSize: 14,
//                       display: "flex",
//                       alignItems: "center",
//                       gap: 8,
//                     }}
//                   >
//                     {cls.name}
//                     <span
//                       style={{
//                         fontSize: 10,
//                         padding: "2px 8px",
//                         borderRadius: 20,
//                         background:
//                           cls.scheduleType === "date"
//                             ? "hsl(217 91% 53% / 0.15)"
//                             : "hsl(142 72% 37% / 0.15)",
//                         color:
//                           cls.scheduleType === "date"
//                             ? "hsl(217 91% 53%)"
//                             : "hsl(142 72% 37%)",
//                         fontWeight: 700,
//                       }}
//                     >
//                       {cls.scheduleType === "date" ? "Once-off" : "Weekly"}
//                     </span>
//                     {cls.chargeNonMembers && (
//                       <span
//                         style={{
//                           fontSize: 10,
//                           padding: "2px 8px",
//                           borderRadius: 20,
//                           background: "hsl(38 92% 44% / 0.15)",
//                           color: "hsl(38 92% 44%)",
//                           fontWeight: 700,
//                           border: "1px solid hsl(38 92% 44% / 0.3)",
//                         }}
//                       >
//                         💳 R{Number(cls.price).toFixed(0)}
//                       </span>
//                     )}
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 12,
//                       color: "hsl(var(--muted-foreground))",
//                       marginTop: 2,
//                     }}
//                   >
//                     {cls.scheduleType === "date"
//                       ? new Date(
//                           cls.specificDate + "T00:00:00",
//                         ).toLocaleDateString("en-ZA", {
//                           weekday: "short",
//                           day: "numeric",
//                           month: "short",
//                           year: "numeric",
//                         })
//                       : cls.day}{" "}
//                     · {cls.time} · {cls.trainer} · {cls.spots} spots
//                   </div>
//                 </div>
//                 <div style={{ display: "flex", gap: 8 }}>
//                   <Btn
//                     variant="subtle"
//                     size="sm"
//                     onClick={() => startEdit(cls)}
//                   >
//                     Edit
//                   </Btn>
//                   <Btn variant="danger" size="sm" onClick={() => del(cls.id)}>
//                     Delete
//                   </Btn>
//                 </div>
//               </div>
//             ))}
//           </div>
//         ))}
//     </div>
//   );
// }

// // ── Gallery Manager ───────────────────────────────────────────────────────────
// function GalleryManager({ toast }: any) {
//   const [items, setItems] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const blank = {
//     label: "",
//     category: "Classes",
//     emoji: "🔥",
//     desc: "",
//     imageUrl: "",
//   };
//   const [form, setForm] = useState(blank);
//   const EMOJIS = [
//     "🔥",
//     "🏋️",
//     "🧘",
//     "💪",
//     "🥊",
//     "🚴",
//     "🎉",
//     "⚡",
//     "🛁",
//     "🏆",
//     "📸",
//     "🤸",
//   ];
//   const load = async () => {
//     setLoading(true);
//     setItems(await fetchCollection("admin_gallery"));
//     setLoading(false);
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   const save = async () => {
//     if (!form.label) return toast("Enter a label", "error");
//     await addToCollection("admin_gallery", form);
//     toast("Added ✓", "success");
//     setShowForm(false);
//     setForm(blank);
//     load();
//   };
//   const del = async (id: string) => {
//     if (!confirm("Delete?")) return;
//     await deleteFromCollection("admin_gallery", id);
//     toast("Deleted", "info");
//     load();
//   };
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));
//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Gallery ({items.length})
//         </div>
//         <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
//           {showForm ? "✕ Cancel" : "+ Add Item"}
//         </Btn>
//       </div>
//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               <div>
//                 <label style={lbl}>Label</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. HIIT Session"
//                   value={form.label}
//                   onChange={f("label")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Category</label>
//                 <select
//                   style={inp}
//                   value={form.category}
//                   onChange={f("category")}
//                 >
//                   {GAL_CATS.map((c) => (
//                     <option key={c}>{c}</option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label style={lbl}>Emoji</label>
//                 <select style={inp} value={form.emoji} onChange={f("emoji")}>
//                   {EMOJIS.map((e) => (
//                     <option key={e}>{e}</option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label style={lbl}>Image URL (optional)</label>
//                 <input
//                   style={inp}
//                   placeholder="https://..."
//                   value={form.imageUrl}
//                   onChange={f("imageUrl")}
//                 />
//               </div>
//             </div>
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Description</label>
//               <textarea
//                 style={{ ...inp, minHeight: 60, resize: "vertical" }}
//                 placeholder="Describe this item…"
//                 value={form.desc}
//                 onChange={f("desc")}
//               />
//             </div>
//             <div
//               style={{
//                 fontSize: 11,
//                 color: "hsl(var(--muted-foreground))",
//                 marginBottom: 14,
//               }}
//             >
//               💡 Once Instagram API is approved, posts auto-sync here.
//             </div>
//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save}>
//                 Add to Gallery
//               </Btn>
//               <Btn variant="subtle" onClick={() => setShowForm(false)}>
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : items.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No items yet.
//         </div>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
//             gap: 10,
//           }}
//         >
//           {items.map((item) => (
//             <div
//               key={item.id}
//               style={{
//                 background: "hsl(var(--secondary))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 10,
//                 overflow: "hidden",
//               }}
//             >
//               <div
//                 style={{
//                   height: 90,
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   fontSize: 44,
//                   background: "hsl(var(--background))",
//                 }}
//               >
//                 {item.imageUrl ? (
//                   <img
//                     src={item.imageUrl}
//                     alt={item.label}
//                     style={{
//                       width: "100%",
//                       height: "100%",
//                       objectFit: "cover",
//                     }}
//                   />
//                 ) : (
//                   item.emoji
//                 )}
//               </div>
//               <div style={{ padding: "10px 12px" }}>
//                 <div style={{ fontWeight: 700, fontSize: 13 }}>
//                   {item.label}
//                 </div>
//                 <div
//                   style={{
//                     fontSize: 11,
//                     color: "hsl(var(--muted-foreground))",
//                     marginTop: 2,
//                   }}
//                 >
//                   {item.category}
//                 </div>
//                 <div style={{ marginTop: 8 }}>
//                   <Btn variant="danger" size="sm" onClick={() => del(item.id)}>
//                     Delete
//                   </Btn>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── News Manager ──────────────────────────────────────────────────────────────
// function NewsManager({ toast }: any) {
//   const [items, setItems] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const blank = { title: "", type: "News", date: "", desc: "", emoji: "📢" };
//   const [form, setForm] = useState(blank);
//   const EMOJIS = [
//     "📢",
//     "🏆",
//     "🚴",
//     "🏃",
//     "🥊",
//     "🛁",
//     "🎉",
//     "⚡",
//     "🌟",
//     "📅",
//     "💪",
//     "🎯",
//   ];
//   const load = async () => {
//     setLoading(true);
//     setItems(await fetchCollection("admin_news"));
//     setLoading(false);
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   const save = async () => {
//     if (!form.title || !form.date)
//       return toast("Fill in Title and Date", "error");
//     await addToCollection("admin_news", { ...form, createdAt: Date.now() });
//     toast("Published ✓", "success");
//     setShowForm(false);
//     setForm(blank);
//     load();
//   };
//   const del = async (id: string) => {
//     if (!confirm("Delete?")) return;
//     await deleteFromCollection("admin_news", id);
//     toast("Deleted", "info");
//     load();
//   };
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));
//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           News & Events ({items.length})
//         </div>
//         <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
//           {showForm ? "✕ Cancel" : "+ Add Post"}
//         </Btn>
//       </div>
//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               <div style={{ gridColumn: "1/-1" }}>
//                 <label style={lbl}>Title</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. 30-Day Challenge!"
//                   value={form.title}
//                   onChange={f("title")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Type</label>
//                 <select style={inp} value={form.type} onChange={f("type")}>
//                   {NEWS_TYPES.map((t) => (
//                     <option key={t}>{t}</option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label style={lbl}>Date</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. 1 Apr 2026"
//                   value={form.date}
//                   onChange={f("date")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Emoji</label>
//                 <select style={inp} value={form.emoji} onChange={f("emoji")}>
//                   {EMOJIS.map((e) => (
//                     <option key={e}>{e}</option>
//                   ))}
//                 </select>
//               </div>
//             </div>
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Description</label>
//               <textarea
//                 style={{ ...inp, minHeight: 80, resize: "vertical" }}
//                 placeholder="Describe the news or event…"
//                 value={form.desc}
//                 onChange={f("desc")}
//               />
//             </div>
//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save}>
//                 Publish
//               </Btn>
//               <Btn variant="subtle" onClick={() => setShowForm(false)}>
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : items.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No posts yet.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//           {items.map((item) => (
//             <div
//               key={item.id}
//               style={{
//                 background: "hsl(var(--secondary))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 10,
//                 padding: "12px 16px",
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 flexWrap: "wrap",
//                 gap: 10,
//               }}
//             >
//               <div>
//                 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                   <span style={{ fontSize: 20 }}>{item.emoji}</span>
//                   <span style={{ fontWeight: 700, fontSize: 14 }}>
//                     {item.title}
//                   </span>
//                   <span
//                     style={{
//                       fontSize: 10,
//                       fontWeight: 700,
//                       padding: "2px 8px",
//                       borderRadius: 20,
//                       background: "hsl(20 100% 50% / 0.15)",
//                       color: "hsl(20 100% 50%)",
//                     }}
//                   >
//                     {item.type}
//                   </span>
//                 </div>
//                 <div
//                   style={{
//                     fontSize: 12,
//                     color: "hsl(var(--muted-foreground))",
//                     marginTop: 3,
//                   }}
//                 >
//                   {item.date}
//                 </div>
//               </div>
//               <Btn variant="danger" size="sm" onClick={() => del(item.id)}>
//                 Delete
//               </Btn>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Members Manager ───────────────────────────────────────────────────────────
// function MembersManager({ toast }: any) {
//   const [members, setMembers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [saving, setSaving] = useState<string | null>(null);
//   const TIER_CONFIG = {
//     basic: { color: "#9ca3af", label: "Basic" },
//     silver: { color: "#e2e8f0", label: "Silver" },
//     gold: { color: "hsl(38 92% 50%)", label: "Gold" },
//   };
//   const loadMembers = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "mk2_users"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([uid, val]: [string, any]) => ({
//             uid,
//             ...val,
//             membership: val.membership ?? "basic",
//           }),
//         );
//         setMembers(list.sort((a, b) => b.createdAt - a.createdAt));
//       }
//     } catch {
//       toast("Failed to load members", "error");
//     }
//     setLoading(false);
//   };
//   useEffect(() => {
//     loadMembers();
//   }, []);
//   const setTier = async (uid: string, tier: string) => {
//     setSaving(uid);
//     try {
//       await set(ref(db, `mk2_users/${uid}/membership`), tier);
//       setMembers((prev) =>
//         prev.map((m) => (m.uid === uid ? { ...m, membership: tier } : m)),
//       );
//       toast(`Tier updated to ${tier} ✓`, "success");
//     } catch {
//       toast("Update failed", "error");
//     }
//     setSaving(null);
//   };
//   const filtered = members.filter(
//     (m) =>
//       m.name?.toLowerCase().includes(search.toLowerCase()) ||
//       m.email?.toLowerCase().includes(search.toLowerCase()),
//   );
//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Members ({members.length})
//         </div>
//         <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//           <input
//             style={{ ...inp, width: 200 }}
//             placeholder="Search name or email…"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//           />
//           <Btn variant="subtle" size="sm" onClick={loadMembers}>
//             ↻ Refresh
//           </Btn>
//         </div>
//       </div>
//       <div
//         style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
//       >
//         {(["basic", "silver", "gold"] as const).map((t) => {
//           const count = members.filter(
//             (m) => (m.membership ?? "basic") === t,
//           ).length;
//           const cfg = TIER_CONFIG[t];
//           return (
//             <div
//               key={t}
//               style={{
//                 background: `${cfg.color}15`,
//                 border: `1px solid ${cfg.color}40`,
//                 borderRadius: 8,
//                 padding: "6px 14px",
//                 fontSize: 12,
//                 fontWeight: 700,
//                 color: cfg.color,
//               }}
//             >
//               {cfg.label}: {count}
//             </div>
//           );
//         })}
//       </div>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading members…
//         </div>
//       ) : filtered.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No members found.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//           {filtered.map((m) => {
//             const cfg =
//               TIER_CONFIG[
//                 (m.membership ?? "basic") as keyof typeof TIER_CONFIG
//               ];
//             return (
//               <div
//                 key={m.uid}
//                 style={{
//                   background: "hsl(var(--secondary))",
//                   border: "1px solid hsl(var(--border))",
//                   borderRadius: 10,
//                   padding: "12px 16px",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                   flexWrap: "wrap",
//                   gap: 10,
//                   borderLeft: `3px solid ${cfg.color}`,
//                 }}
//               >
//                 <div>
//                   <div
//                     style={{
//                       fontWeight: 700,
//                       fontSize: 14,
//                       display: "flex",
//                       alignItems: "center",
//                       gap: 8,
//                     }}
//                   >
//                     {m.name || "Unnamed"}
//                     <span
//                       style={{
//                         fontSize: 10,
//                         fontWeight: 700,
//                         padding: "2px 8px",
//                         borderRadius: 20,
//                         background: `${cfg.color}20`,
//                         color: cfg.color,
//                       }}
//                     >
//                       {cfg.label}
//                     </span>
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 12,
//                       color: "hsl(var(--muted-foreground))",
//                       marginTop: 2,
//                     }}
//                   >
//                     {m.email} · {m.points ?? 0} pts · {m.checkIns?.length ?? 0}{" "}
//                     check-ins · 🎟 {m.classCredits ?? 0} credits
//                   </div>
//                 </div>
//                 <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
//                   <select
//                     value={m.membership ?? "basic"}
//                     onChange={(e) => setTier(m.uid, e.target.value)}
//                     disabled={saving === m.uid}
//                     style={{
//                       ...inp,
//                       width: "auto",
//                       padding: "6px 10px",
//                       fontSize: 12,
//                       borderColor: cfg.color,
//                       color: cfg.color,
//                     }}
//                   >
//                     <option value="basic">Basic (Free)</option>
//                     <option value="silver">Silver (R199/mo)</option>
//                     <option value="gold">Gold (R349/mo)</option>
//                   </select>
//                   {saving === m.uid && (
//                     <span
//                       style={{
//                         fontSize: 11,
//                         color: "hsl(var(--muted-foreground))",
//                       }}
//                     >
//                       Saving…
//                     </span>
//                   )}
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Packages Manager ──────────────────────────────────────────────────────────
// function PackagesManager({ toast }: any) {
//   const [packages, setPackages] = useState<any[]>([]);
//   const [members, setMembers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [editing, setEditing] = useState<any>(null);
//   const [assignUid, setAssignUid] = useState("");
//   const [assignCredits, setAssignCredits] = useState("10");
//   const [assignNote, setAssignNote] = useState("");
//   const [assigning, setAssigning] = useState(false);
//   const blank = {
//     name: "",
//     description: "",
//     credits: "10",
//     price: "299",
//     badge: "",
//     active: true,
//   };
//   const [form, setForm] = useState(blank);
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));

//   const loadPackages = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "packages"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([id, val]: [string, any]) => ({ id, ...val }),
//         );
//         setPackages(list.sort((a: any, b: any) => a.price - b.price));
//       } else setPackages([]);
//     } catch {
//       toast("Failed to load packages", "error");
//     }
//     setLoading(false);
//   };
//   const loadMembers = async () => {
//     try {
//       const snap = await get(ref(db, "mk2_users"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([uid, val]: [string, any]) => ({
//             uid,
//             name: val.name || "Unnamed",
//             email: val.email || "",
//             classCredits: val.classCredits ?? 0,
//           }),
//         );
//         setMembers(list.sort((a: any, b: any) => a.name.localeCompare(b.name)));
//       }
//     } catch {
//       /* non-critical */
//     }
//   };
//   useEffect(() => {
//     loadPackages();
//     loadMembers();
//   }, []);

//   const save = async () => {
//     if (!form.name || !form.credits || !form.price)
//       return toast("Fill in Name, Credits and Price", "error");
//     const data = {
//       name: form.name,
//       description: form.description,
//       credits: parseInt(form.credits),
//       price: parseInt(form.price),
//       badge: form.badge,
//       active: form.active,
//       updatedAt: Date.now(),
//     };
//     try {
//       if (editing) {
//         await set(ref(db, `packages/${editing.id}`), data);
//         toast("Updated ✓", "success");
//       } else {
//         await push(ref(db, "packages"), { ...data, createdAt: Date.now() });
//         toast("Package created ✓", "success");
//       }
//       setShowForm(false);
//       setEditing(null);
//       setForm(blank);
//       loadPackages();
//     } catch {
//       toast("Save failed", "error");
//     }
//   };
//   const toggleActive = async (pkg: any) => {
//     await set(ref(db, `packages/${pkg.id}/active`), !pkg.active);
//     toast(pkg.active ? "Package hidden" : "Package visible ✓", "info");
//     loadPackages();
//   };
//   const del = async (pkg: any) => {
//     if (!confirm(`Delete "${pkg.name}"?`)) return;
//     await remove(ref(db, `packages/${pkg.id}`));
//     toast("Deleted", "info");
//     loadPackages();
//   };
//   const startEdit = (pkg: any) => {
//     setEditing(pkg);
//     setForm({
//       name: pkg.name,
//       description: pkg.description || "",
//       credits: String(pkg.credits),
//       price: String(pkg.price),
//       badge: pkg.badge || "",
//       active: pkg.active !== false,
//     });
//     setShowForm(true);
//   };
//   const assignCreditsToUser = async () => {
//     if (!assignUid) return toast("Select a member", "error");
//     const amount = parseInt(assignCredits);
//     if (!amount || amount < 1)
//       return toast("Enter valid credit amount", "error");
//     setAssigning(true);
//     try {
//       const memberRef = ref(db, `mk2_users/${assignUid}/classCredits`);
//       const snap = await get(memberRef);
//       const current = snap.exists() ? (snap.val() as number) : 0;
//       await set(memberRef, current + amount);
//       await push(ref(db, `mk2_users/${assignUid}/creditHistory`), {
//         amount,
//         type: "manual_assign",
//         note: assignNote || "Admin assignment",
//         timestamp: Date.now(),
//         adminAssigned: true,
//       });
//       setMembers((prev) =>
//         prev.map((m) =>
//           m.uid === assignUid ? { ...m, classCredits: current + amount } : m,
//         ),
//       );
//       toast(`+${amount} credits assigned ✓`, "success");
//       setAssignNote("");
//     } catch {
//       toast("Assignment failed", "error");
//     }
//     setAssigning(false);
//   };
//   const selectedMember = members.find((m) => m.uid === assignUid);
//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 20,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Class Credit Packages ({packages.length})
//         </div>
//         <Btn
//           variant="primary"
//           size="sm"
//           onClick={() => {
//             setShowForm(!showForm);
//             setEditing(null);
//             setForm(blank);
//           }}
//         >
//           {showForm ? "✕ Cancel" : "+ New Package"}
//         </Btn>
//       </div>
//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
//               {editing ? "Edit Package" : "New Package"}
//             </div>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               <div style={{ gridColumn: "1/-1" }}>
//                 <label style={lbl}>Package Name</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. 10-Class Pack"
//                   value={form.name}
//                   onChange={f("name")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Credits</label>
//                 <input
//                   style={inp}
//                   type="number"
//                   placeholder="10"
//                   value={form.credits}
//                   onChange={f("credits")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Price (ZAR)</label>
//                 <input
//                   style={inp}
//                   type="number"
//                   placeholder="299"
//                   value={form.price}
//                   onChange={f("price")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Badge (optional)</label>
//                 <input
//                   style={inp}
//                   placeholder="Best Value"
//                   value={form.badge}
//                   onChange={f("badge")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Visible?</label>
//                 <select
//                   style={inp}
//                   value={form.active ? "true" : "false"}
//                   onChange={(e) =>
//                     setForm((p) => ({
//                       ...p,
//                       active: e.target.value === "true",
//                     }))
//                   }
//                 >
//                   <option value="true">✓ Visible</option>
//                   <option value="false">✕ Hidden</option>
//                 </select>
//               </div>
//             </div>
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Description</label>
//               <input
//                 style={inp}
//                 placeholder="e.g. Perfect for regular gym-goers"
//                 value={form.description}
//                 onChange={f("description")}
//               />
//             </div>
//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save}>
//                 {editing ? "Save Changes" : "Create Package"}
//               </Btn>
//               <Btn
//                 variant="subtle"
//                 onClick={() => {
//                   setShowForm(false);
//                   setEditing(null);
//                 }}
//               >
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : packages.length === 0 ? (
//         <div
//           style={{
//             color: "hsl(var(--muted-foreground))",
//             fontSize: 13,
//             padding: "20px 0",
//           }}
//         >
//           No packages yet.
//         </div>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
//             gap: 12,
//             marginBottom: 32,
//           }}
//         >
//           {packages.map((pkg) => (
//             <div
//               key={pkg.id}
//               style={{
//                 background: "hsl(var(--card))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 12,
//                 padding: 16,
//                 opacity: pkg.active ? 1 : 0.6,
//               }}
//             >
//               {pkg.badge && (
//                 <div
//                   style={{
//                     display: "inline-block",
//                     fontSize: 10,
//                     fontWeight: 700,
//                     padding: "2px 10px",
//                     borderRadius: 20,
//                     background: "hsl(20 100% 50% / 0.15)",
//                     color: "hsl(20 100% 50%)",
//                     border: "1px solid hsl(20 100% 50% / 0.3)",
//                     marginBottom: 10,
//                   }}
//                 >
//                   {pkg.badge}
//                 </div>
//               )}
//               <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
//                 {pkg.name}
//               </div>
//               <div
//                 style={{
//                   fontSize: 12,
//                   color: "hsl(var(--muted-foreground))",
//                   marginBottom: 10,
//                 }}
//               >
//                 {pkg.description}
//               </div>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "baseline",
//                   gap: 6,
//                   marginBottom: 4,
//                 }}
//               >
//                 <span
//                   style={{
//                     fontFamily: "var(--font-display)",
//                     fontSize: 28,
//                     color: "hsl(20 100% 50%)",
//                   }}
//                 >
//                   {pkg.credits}
//                 </span>
//                 <span
//                   style={{
//                     fontSize: 12,
//                     color: "hsl(var(--muted-foreground))",
//                   }}
//                 >
//                   credits
//                 </span>
//               </div>
//               <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
//                 R{pkg.price}
//               </div>
//               <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//                 <Btn variant="subtle" size="sm" onClick={() => startEdit(pkg)}>
//                   Edit
//                 </Btn>
//                 <Btn
//                   variant={pkg.active ? "subtle" : "green"}
//                   size="sm"
//                   onClick={() => toggleActive(pkg)}
//                 >
//                   {pkg.active ? "Hide" : "Show"}
//                 </Btn>
//                 <Btn variant="danger" size="sm" onClick={() => del(pkg)}>
//                   Delete
//                 </Btn>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//       <div
//         style={{
//           borderTop: "1px solid hsl(var(--border))",
//           paddingTop: 24,
//           marginTop: 8,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
//           Manually Assign Credits
//         </div>
//         <div
//           style={{
//             fontSize: 12,
//             color: "hsl(var(--muted-foreground))",
//             marginBottom: 16,
//           }}
//         >
//           Assign credits when a member pays cash or EFT. PayFast will automate
//           this once live.
//         </div>
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
//             gap: 12,
//             marginBottom: 14,
//           }}
//         >
//           <div>
//             <label style={lbl}>Member</label>
//             <select
//               style={inp}
//               value={assignUid}
//               onChange={(e) => setAssignUid(e.target.value)}
//             >
//               <option value="">— Select member —</option>
//               {members.map((m) => (
//                 <option key={m.uid} value={m.uid}>
//                   {m.name} ({m.email}) — {m.classCredits} credits
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label style={lbl}>Credits to Add</label>
//             <input
//               style={inp}
//               type="number"
//               min="1"
//               max="100"
//               value={assignCredits}
//               onChange={(e) => setAssignCredits(e.target.value)}
//             />
//           </div>
//           <div>
//             <label style={lbl}>Note (optional)</label>
//             <input
//               style={inp}
//               placeholder="e.g. Cash payment - 10-pack"
//               value={assignNote}
//               onChange={(e) => setAssignNote(e.target.value)}
//             />
//           </div>
//         </div>
//         {selectedMember && (
//           <div
//             style={{
//               fontSize: 12,
//               color: "hsl(var(--muted-foreground))",
//               marginBottom: 12,
//               padding: "8px 12px",
//               background: "hsl(var(--secondary))",
//               borderRadius: 8,
//             }}
//           >
//             {selectedMember.name} has{" "}
//             <strong style={{ color: "hsl(20 100% 50%)" }}>
//               {selectedMember.classCredits}
//             </strong>{" "}
//             credits → after:{" "}
//             <strong style={{ color: "hsl(142 72% 37%)" }}>
//               {selectedMember.classCredits + parseInt(assignCredits || "0")}
//             </strong>
//           </div>
//         )}
//         <Btn
//           variant="green"
//           onClick={assignCreditsToUser}
//           disabled={assigning || !assignUid}
//         >
//           {assigning ? "Assigning…" : `✓ Assign ${assignCredits} Credits`}
//         </Btn>
//       </div>
//     </div>
//   );
// }

// // ── Ad Enquiries Manager ──────────────────────────────────────────────────────
// function AdEnquiriesManager({ toast }: any) {
//   const [enquiries, setEnquiries] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState("all");
//   const load = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "ad_enquiries"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([k, v]: [string, any]) => ({ key: k, ...v }),
//         );
//         setEnquiries(
//           list.sort(
//             (a, b) =>
//               new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
//           ),
//         );
//       } else setEnquiries([]);
//     } catch {
//       toast("Failed to load enquiries", "error");
//     }
//     setLoading(false);
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   const updateStatus = async (key: string, status: string) => {
//     await set(ref(db, `ad_enquiries/${key}/status`), status);
//     setEnquiries((prev) =>
//       prev.map((e) => (e.key === key ? { ...e, status } : e)),
//     );
//     toast(`Status updated to ${status}`, "success");
//   };
//   const deleteEnquiry = async (key: string) => {
//     if (!confirm("Delete this enquiry?")) return;
//     await remove(ref(db, `ad_enquiries/${key}`));
//     setEnquiries((prev) => prev.filter((e) => e.key !== key));
//     toast("Deleted", "info");
//   };
//   const STATUS_COLORS: any = {
//     new: { bg: "hsl(20 100% 50% / 0.15)", color: "hsl(20 100% 50%)" },
//     contacted: { bg: "hsl(217 91% 53% / 0.15)", color: "hsl(217 91% 53%)" },
//     confirmed: { bg: "hsl(142 72% 37% / 0.15)", color: "hsl(142 72% 37%)" },
//     declined: { bg: "hsl(0 84% 51% / 0.15)", color: "hsl(0 84% 51%)" },
//   };
//   const filtered =
//     filter === "all" ? enquiries : enquiries.filter((e) => e.status === filter);
//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Ad Enquiries ({enquiries.length})
//         </div>
//         <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//           {["all", "new", "contacted", "confirmed", "declined"].map((s) => (
//             <button
//               key={s}
//               onClick={() => setFilter(s)}
//               style={{
//                 padding: "5px 12px",
//                 borderRadius: 20,
//                 fontSize: 11,
//                 fontWeight: 700,
//                 cursor: "pointer",
//                 textTransform: "capitalize",
//                 background:
//                   filter === s ? "hsl(20 100% 50%)" : "hsl(var(--secondary))",
//                 color: filter === s ? "#000" : "hsl(var(--foreground))",
//                 border: filter === s ? "none" : "1px solid hsl(var(--border))",
//               }}
//             >
//               {s}
//             </button>
//           ))}
//           <Btn variant="subtle" size="sm" onClick={load}>
//             ↻ Refresh
//           </Btn>
//         </div>
//       </div>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : filtered.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No enquiries found.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//           {filtered.map((e) => {
//             const sc = STATUS_COLORS[e.status] || STATUS_COLORS.new;
//             return (
//               <div
//                 key={e.key}
//                 style={{
//                   background: "hsl(var(--secondary))",
//                   border: "1px solid hsl(var(--border))",
//                   borderRadius: 10,
//                   padding: "14px 16px",
//                   borderLeft: `3px solid ${sc.color}`,
//                 }}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "flex-start",
//                     flexWrap: "wrap",
//                     gap: 10,
//                     marginBottom: 10,
//                   }}
//                 >
//                   <div>
//                     <div
//                       style={{
//                         fontWeight: 700,
//                         fontSize: 14,
//                         display: "flex",
//                         alignItems: "center",
//                         gap: 8,
//                       }}
//                     >
//                       {e.bizName}
//                       <span
//                         style={{
//                           fontSize: 10,
//                           fontWeight: 700,
//                           padding: "2px 8px",
//                           borderRadius: 20,
//                           background: sc.bg,
//                           color: sc.color,
//                           textTransform: "capitalize",
//                         }}
//                       >
//                         {e.status}
//                       </span>
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 12,
//                         color: "hsl(var(--muted-foreground))",
//                         marginTop: 3,
//                       }}
//                     >
//                       {e.contactName} · {e.email} {e.phone && `· ${e.phone}`}
//                     </div>
//                     {e.message && (
//                       <div
//                         style={{
//                           fontSize: 12,
//                           color: "hsl(var(--foreground))",
//                           marginTop: 6,
//                           fontStyle: "italic",
//                         }}
//                       >
//                         "{e.message}"
//                       </div>
//                     )}
//                   </div>
//                   <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
//                     <Btn
//                       variant="subtle"
//                       size="sm"
//                       onClick={() => updateStatus(e.key, "contacted")}
//                     >
//                       Contacted
//                     </Btn>
//                     <Btn
//                       variant="green"
//                       size="sm"
//                       onClick={() => updateStatus(e.key, "confirmed")}
//                     >
//                       ✓ Confirmed
//                     </Btn>
//                     <Btn
//                       variant="danger"
//                       size="sm"
//                       onClick={() => deleteEnquiry(e.key)}
//                     >
//                       Delete
//                     </Btn>
//                   </div>
//                 </div>
//                 <a
//                   href={`mailto:${e.email}?subject=Re: Advertising Enquiry — MK Two Rivers`}
//                   style={{
//                     fontSize: 11,
//                     fontWeight: 700,
//                     color: "hsl(217 91% 53%)",
//                     textDecoration: "none",
//                   }}
//                 >
//                   ✉ Reply via email →
//                 </a>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Feedback Manager ──────────────────────────────────────────────────────────
// function FeedbackManager({ toast }: any) {
//   const [feedback, setFeedback] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState("all");
//   const TYPES = [
//     "all",
//     "Feature suggestion",
//     "Bug / issue report",
//     "App improvement",
//     "General comment",
//   ];
//   const load = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "app_feedback"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([k, v]: [string, any]) => ({ key: k, ...v }),
//         );
//         setFeedback(
//           list.sort(
//             (a, b) =>
//               new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
//           ),
//         );
//       } else setFeedback([]);
//     } catch {
//       toast("Failed to load feedback", "error");
//     }
//     setLoading(false);
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   const deleteFb = async (key: string) => {
//     if (!confirm("Delete this feedback?")) return;
//     await remove(ref(db, `app_feedback/${key}`));
//     setFeedback((prev) => prev.filter((f) => f.key !== key));
//     toast("Deleted", "info");
//   };
//   const avgRating = feedback.length
//     ? (
//         feedback.reduce((s, f) => s + (f.rating || 0), 0) / feedback.length
//       ).toFixed(1)
//     : "—";
//   const filtered =
//     filter === "all" ? feedback : feedback.filter((f) => f.type === filter);
//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           App Feedback ({feedback.length}) · Avg: {avgRating}★
//         </div>
//         <Btn variant="subtle" size="sm" onClick={load}>
//           ↻ Refresh
//         </Btn>
//       </div>
//       <div
//         style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
//       >
//         {TYPES.map((t) => (
//           <button
//             key={t}
//             onClick={() => setFilter(t)}
//             style={{
//               padding: "5px 12px",
//               borderRadius: 20,
//               fontSize: 11,
//               fontWeight: 700,
//               cursor: "pointer",
//               background:
//                 filter === t ? "hsl(217 91% 53%)" : "hsl(var(--secondary))",
//               color: filter === t ? "#fff" : "hsl(var(--foreground))",
//               border: filter === t ? "none" : "1px solid hsl(var(--border))",
//             }}
//           >
//             {t === "all" ? "All" : t}
//           </button>
//         ))}
//       </div>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : filtered.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No feedback yet.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//           {filtered.map((f) => (
//             <div
//               key={f.key}
//               style={{
//                 background: "hsl(var(--secondary))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 10,
//                 padding: "12px 16px",
//                 borderLeft: "3px solid hsl(217 91% 53%)",
//               }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "flex-start",
//                   flexWrap: "wrap",
//                   gap: 8,
//                 }}
//               >
//                 <div>
//                   <div
//                     style={{
//                       fontWeight: 700,
//                       fontSize: 13,
//                       display: "flex",
//                       alignItems: "center",
//                       gap: 8,
//                     }}
//                   >
//                     {f.name}
//                     <span
//                       style={{
//                         fontSize: 10,
//                         padding: "2px 8px",
//                         borderRadius: 20,
//                         background: "hsl(217 91% 53% / 0.15)",
//                         color: "hsl(217 91% 53%)",
//                         fontWeight: 700,
//                       }}
//                     >
//                       {f.type}
//                     </span>
//                     <span
//                       style={{
//                         color: "hsl(38 92% 44%)",
//                         fontSize: 12,
//                         fontWeight: 700,
//                       }}
//                     >
//                       {"★".repeat(f.rating || 0)}
//                     </span>
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 11,
//                       color: "hsl(var(--muted-foreground))",
//                       marginTop: 2,
//                     }}
//                   >
//                     {f.email} ·{" "}
//                     {new Date(f.timestamp).toLocaleDateString("en-ZA")}
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 13,
//                       color: "hsl(var(--foreground))",
//                       marginTop: 6,
//                       lineHeight: 1.6,
//                     }}
//                   >
//                     {f.message}
//                   </div>
//                 </div>
//                 <Btn variant="danger" size="sm" onClick={() => deleteFb(f.key)}>
//                   Delete
//                 </Btn>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Instagram Setup ───────────────────────────────────────────────────────────
// function InstagramSetup() {
//   return (
//     <div>
//       <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
//         Instagram Auto-Sync Setup
//       </div>
//       <div
//         style={{
//           background: "hsl(var(--secondary))",
//           border: "1px solid hsl(20 100% 50% / 0.3)",
//           borderRadius: 12,
//           padding: 20,
//         }}
//       >
//         <div
//           style={{
//             fontWeight: 700,
//             color: "hsl(20 100% 50%)",
//             marginBottom: 8,
//           }}
//         >
//           Status: Pending Meta Approval
//         </div>
//         <div
//           style={{
//             fontSize: 13,
//             color: "hsl(var(--muted-foreground))",
//             lineHeight: 1.8,
//           }}
//         >
//           Once approved, new posts on the gym's Instagram will automatically
//           appear in the Gallery section.
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Terms Manager ─────────────────────────────────────────────────────────────
// function TermsManager({ toast }: any) {
//   const [records, setRecords] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const load = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "terms_acceptance"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([uid, val]: [string, any]) => ({ uid, ...val }),
//         );
//         setRecords(list.sort((a, b) => b.acceptedAt - a.acceptedAt));
//       } else setRecords([]);
//     } catch {
//       toast("Failed to load records", "error");
//     }
//     setLoading(false);
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           T&C Acceptance Records ({records.length})
//         </div>
//         <Btn variant="subtle" size="sm" onClick={load}>
//           ↻ Refresh
//         </Btn>
//       </div>
//       <div
//         style={{
//           fontSize: 12,
//           color: "hsl(var(--muted-foreground))",
//           marginBottom: 16,
//           padding: "10px 14px",
//           background: "hsl(142 72% 37% / 0.1)",
//           border: "1px solid hsl(142 72% 37% / 0.3)",
//           borderRadius: 8,
//         }}
//       >
//         ✓ These records confirm each member has accepted the Terms & Conditions.
//         POPIA compliant audit log.
//       </div>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : records.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No records yet.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//           {records.map((r) => (
//             <div
//               key={r.uid}
//               style={{
//                 background: "hsl(var(--secondary))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 10,
//                 padding: "12px 16px",
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 flexWrap: "wrap",
//                 gap: 10,
//                 borderLeft: "3px solid hsl(142 72% 37%)",
//               }}
//             >
//               <div>
//                 <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</div>
//                 <div
//                   style={{
//                     fontSize: 11,
//                     color: "hsl(var(--muted-foreground))",
//                     marginTop: 2,
//                   }}
//                 >
//                   {r.email} · Version: {r.termsVersion}
//                 </div>
//               </div>
//               <div
//                 style={{
//                   fontSize: 11,
//                   color: "hsl(var(--muted-foreground))",
//                   textAlign: "right",
//                 }}
//               >
//                 <div style={{ fontWeight: 700, color: "hsl(142 72% 37%)" }}>
//                   ✓ Accepted
//                 </div>
//                 <div>
//                   {new Date(r.acceptedAt).toLocaleDateString("en-ZA", {
//                     day: "numeric",
//                     month: "long",
//                     year: "numeric",
//                     hour: "2-digit",
//                     minute: "2-digit",
//                   })}
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Banners Manager ───────────────────────────────────────────────────────────
// function BannersManager({ toast }: any) {
//   const [banners, setBanners] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const blank = {
//     title: "",
//     subtitle: "",
//     emoji: "🔥",
//     imageUrl: "",
//     url: "",
//     cta: "Learn More",
//     color: "hsl(20 100% 50%)",
//     bgColor: "hsl(20 100% 50% / 0.06)",
//     active: true,
//     expiresAt: "",
//   };
//   const [form, setForm] = useState(blank);
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));
//   const load = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "ad_banners"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([id, val]: [string, any]) => ({ id, ...val }),
//         );
//         setBanners(
//           list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
//         );
//       } else setBanners([]);
//     } catch {
//       toast("Failed to load banners", "error");
//     }
//     setLoading(false);
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   const save = async () => {
//     if (!form.title) return toast("Enter a title", "error");
//     try {
//       await push(ref(db, "ad_banners"), {
//         ...form,
//         active: form.active === true || (form.active as any) === "true",
//         expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : null,
//         createdAt: Date.now(),
//       });
//       toast("Banner created ✓", "success");
//       setShowForm(false);
//       setForm(blank);
//       load();
//     } catch {
//       toast("Save failed", "error");
//     }
//   };
//   const toggleActive = async (banner: any) => {
//     await set(ref(db, `ad_banners/${banner.id}/active`), !banner.active);
//     toast(banner.active ? "Banner hidden" : "Banner live ✓", "info");
//     load();
//   };
//   const del = async (id: string) => {
//     if (!confirm("Delete this banner?")) return;
//     await remove(ref(db, `ad_banners/${id}`));
//     toast("Deleted", "info");
//     load();
//   };
//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Ad Banners ({banners.length})
//         </div>
//         <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
//           {showForm ? "✕ Cancel" : "+ New Banner"}
//         </Btn>
//       </div>
//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
//               New Banner
//             </div>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               {(
//                 [
//                   ["title", "Title *", "e.g. Ruimsig Pharmacy"],
//                   ["subtitle", "Subtitle", "Short tagline"],
//                   ["emoji", "Emoji", "🔥"],
//                   ["cta", "Button Text", "Learn More"],
//                   ["url", "Click URL", "https://..."],
//                   ["imageUrl", "Image URL (optional)", "https://..."],
//                   ["color", "Accent Color", "hsl(20 100% 50%)"],
//                   ["expiresAt", "Expires (optional)", ""],
//                 ] as any[]
//               ).map(([k, l, p]: any) => (
//                 <div key={k}>
//                   <label style={lbl}>{l}</label>
//                   <input
//                     style={inp}
//                     type={k === "expiresAt" ? "date" : "text"}
//                     placeholder={p}
//                     value={(form as any)[k]}
//                     onChange={f(k)}
//                   />
//                 </div>
//               ))}
//               <div>
//                 <label style={lbl}>Status</label>
//                 <select
//                   style={inp}
//                   value={String(form.active)}
//                   onChange={(e) =>
//                     setForm((p) => ({
//                       ...p,
//                       active: e.target.value === "true",
//                     }))
//                   }
//                 >
//                   <option value="true">✓ Live</option>
//                   <option value="false">✕ Hidden</option>
//                 </select>
//               </div>
//             </div>
//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save}>
//                 Create Banner
//               </Btn>
//               <Btn variant="subtle" onClick={() => setShowForm(false)}>
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : banners.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No banners yet.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//           {banners.map((b) => (
//             <div
//               key={b.id}
//               style={{
//                 background: "hsl(var(--secondary))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 10,
//                 padding: "12px 16px",
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 flexWrap: "wrap",
//                 gap: 10,
//                 borderLeft: `3px solid ${b.active ? b.color : "#666"}`,
//               }}
//             >
//               <div>
//                 <div
//                   style={{
//                     fontWeight: 700,
//                     fontSize: 14,
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 8,
//                   }}
//                 >
//                   {b.emoji} {b.title}
//                   <span
//                     style={{
//                       fontSize: 10,
//                       fontWeight: 700,
//                       padding: "2px 8px",
//                       borderRadius: 20,
//                       background: b.active
//                         ? "hsl(142 72% 37% / 0.15)"
//                         : "hsl(var(--secondary))",
//                       color: b.active
//                         ? "hsl(142 72% 37%)"
//                         : "hsl(var(--muted-foreground))",
//                     }}
//                   >
//                     {b.active ? "● Live" : "○ Hidden"}
//                   </span>
//                 </div>
//                 <div
//                   style={{
//                     fontSize: 12,
//                     color: "hsl(var(--muted-foreground))",
//                     marginTop: 2,
//                   }}
//                 >
//                   {b.subtitle}{" "}
//                   {b.expiresAt
//                     ? `· Expires ${new Date(b.expiresAt).toLocaleDateString("en-ZA")}`
//                     : "· No expiry"}
//                 </div>
//               </div>
//               <div style={{ display: "flex", gap: 8 }}>
//                 <Btn
//                   variant={b.active ? "subtle" : "green"}
//                   size="sm"
//                   onClick={() => toggleActive(b)}
//                 >
//                   {b.active ? "Hide" : "Go Live"}
//                 </Btn>
//                 <Btn variant="danger" size="sm" onClick={() => del(b.id)}>
//                   Delete
//                 </Btn>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Challenges Manager ────────────────────────────────────────────────────────
// function ChallengesManager({ toast }: any) {
//   const [challenges, setChallenges] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const blank = {
//     name: "",
//     exercise: "",
//     description: "",
//     startDate: "",
//     endDate: "",
//     metric: "reps",
//     prize: "",
//     color: "hsl(20 100% 50%)",
//     active: true,
//   };
//   const [form, setForm] = useState(blank);
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));
//   const load = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "challenges"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([id, val]: [string, any]) => ({ id, ...val }),
//         );
//         setChallenges(
//           list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
//         );
//       } else setChallenges([]);
//     } catch {
//       toast("Failed to load challenges", "error");
//     }
//     setLoading(false);
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   const save = async () => {
//     if (!form.name || !form.startDate || !form.endDate)
//       return toast("Fill in Name, Start and End Date", "error");
//     try {
//       await push(ref(db, "challenges"), {
//         ...form,
//         active: form.active === true || (form.active as any) === "true",
//         createdAt: Date.now(),
//       });
//       toast("Challenge created ✓", "success");
//       setShowForm(false);
//       setForm(blank);
//       load();
//     } catch {
//       toast("Save failed", "error");
//     }
//   };
//   const toggleActive = async (c: any) => {
//     await set(ref(db, `challenges/${c.id}/active`), !c.active);
//     toast(c.active ? "Challenge hidden" : "Challenge active ✓", "info");
//     load();
//   };
//   const del = async (id: string) => {
//     if (!confirm("Delete this challenge and all its entries?")) return;
//     await remove(ref(db, `challenges/${id}`));
//     await remove(ref(db, `challenge_entries/${id}`));
//     toast("Deleted", "info");
//     load();
//   };
//   const COLORS = [
//     "hsl(20 100% 50%)",
//     "hsl(263 85% 58%)",
//     "hsl(142 72% 37%)",
//     "hsl(217 91% 53%)",
//     "hsl(38 92% 44%)",
//     "hsl(187 85% 40%)",
//   ];
//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Challenges ({challenges.length})
//         </div>
//         <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
//           {showForm ? "✕ Cancel" : "+ New Challenge"}
//         </Btn>
//       </div>
//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
//               New Challenge
//             </div>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               {(
//                 [
//                   ["name", "Challenge Name *", "e.g. 30-Day Squat Challenge"],
//                   ["exercise", "Exercise", "e.g. Squat"],
//                   ["metric", "Metric", "e.g. kg, reps, time"],
//                   ["prize", "Prize", "e.g. Free 1-month membership"],
//                   ["startDate", "Start Date *", ""],
//                   ["endDate", "End Date *", ""],
//                 ] as any[]
//               ).map(([k, l, p]: any) => (
//                 <div key={k}>
//                   <label style={lbl}>{l}</label>
//                   <input
//                     style={inp}
//                     type={k.includes("Date") ? "date" : "text"}
//                     placeholder={p}
//                     value={(form as any)[k]}
//                     onChange={f(k)}
//                   />
//                 </div>
//               ))}
//               <div>
//                 <label style={lbl}>Status</label>
//                 <select
//                   style={inp}
//                   value={String(form.active)}
//                   onChange={(e) =>
//                     setForm((p) => ({
//                       ...p,
//                       active: e.target.value === "true",
//                     }))
//                   }
//                 >
//                   <option value="true">✓ Active</option>
//                   <option value="false">✕ Hidden</option>
//                 </select>
//               </div>
//               <div>
//                 <label style={lbl}>Color</label>
//                 <div
//                   style={{
//                     display: "flex",
//                     gap: 6,
//                     flexWrap: "wrap",
//                     marginTop: 4,
//                   }}
//                 >
//                   {COLORS.map((c) => (
//                     <button
//                       key={c}
//                       onClick={() => setForm((p) => ({ ...p, color: c }))}
//                       style={{
//                         width: 28,
//                         height: 28,
//                         borderRadius: "50%",
//                         background: c,
//                         border:
//                           form.color === c
//                             ? "3px solid white"
//                             : "2px solid transparent",
//                         cursor: "pointer",
//                       }}
//                     />
//                   ))}
//                 </div>
//               </div>
//             </div>
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Description</label>
//               <textarea
//                 style={{ ...inp, minHeight: 60, resize: "vertical" }}
//                 placeholder="Describe the challenge…"
//                 value={form.description}
//                 onChange={f("description")}
//               />
//             </div>
//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save}>
//                 Create Challenge
//               </Btn>
//               <Btn variant="subtle" onClick={() => setShowForm(false)}>
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : challenges.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No challenges yet. Create one above!
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//           {challenges.map((c) => (
//             <div
//               key={c.id}
//               style={{
//                 background: "hsl(var(--secondary))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 10,
//                 padding: "12px 16px",
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 flexWrap: "wrap",
//                 gap: 10,
//                 borderLeft: `3px solid ${c.color}`,
//               }}
//             >
//               <div>
//                 <div
//                   style={{
//                     fontWeight: 700,
//                     fontSize: 14,
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 8,
//                   }}
//                 >
//                   {c.name}
//                   <span
//                     style={{
//                       fontSize: 10,
//                       fontWeight: 700,
//                       padding: "2px 8px",
//                       borderRadius: 20,
//                       background: c.active
//                         ? "hsl(142 72% 37% / 0.15)"
//                         : "hsl(var(--secondary))",
//                       color: c.active
//                         ? "hsl(142 72% 37%)"
//                         : "hsl(var(--muted-foreground))",
//                     }}
//                   >
//                     {c.active ? "● Active" : "○ Hidden"}
//                   </span>
//                 </div>
//                 <div
//                   style={{
//                     fontSize: 12,
//                     color: "hsl(var(--muted-foreground))",
//                     marginTop: 2,
//                   }}
//                 >
//                   {c.startDate} → {c.endDate} · {c.metric} · 🏆 {c.prize}
//                 </div>
//               </div>
//               <div style={{ display: "flex", gap: 8 }}>
//                 <Btn
//                   variant={c.active ? "subtle" : "green"}
//                   size="sm"
//                   onClick={() => toggleActive(c)}
//                 >
//                   {c.active ? "Deactivate" : "Activate"}
//                 </Btn>
//                 <Btn variant="danger" size="sm" onClick={() => del(c.id)}>
//                   Delete
//                 </Btn>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//       <div
//         style={{
//           marginTop: 20,
//           padding: "10px 14px",
//           background: "hsl(217 91% 53% / 0.1)",
//           border: "1px solid hsl(217 91% 53% / 0.3)",
//           borderRadius: 8,
//           fontSize: 12,
//           color: "hsl(var(--muted-foreground))",
//         }}
//       >
//         ℹ️ Challenge entries are stored at{" "}
//         <strong style={{ color: "hsl(217 91% 53%)" }}>
//           challenge_entries/
//         </strong>{" "}
//         in Firebase. Make sure your rules allow read/write for authenticated
//         users.
//       </div>
//     </div>
//   );
// }

// // ── Rewards Manager ───────────────────────────────────────────────────────────
// function RewardsManager({ toast }: any) {
//   const CHECKINS_REQUIRED = 40;
//   const EXPIRY_DAYS = 60;
//   type RewardType = "inbody" | "buddy";
//   interface MemberReward {
//     uid: string;
//     name: string;
//     email: string;
//     checkIns: number;
//     cycleCheckIns: number;
//     progress: number;
//     rewardReady: boolean;
//     pendingReward?: {
//       type: RewardType;
//       earnedAt: number;
//       expiresAt: number;
//       expired: boolean;
//     };
//     redemptions: RedemptionRecord[];
//   }
//   interface RedemptionRecord {
//     id: string;
//     type: RewardType;
//     redeemedAt: number;
//     redeemedBy: string;
//     note: string;
//   }
//   const REWARD_LABELS: Record<RewardType, string> = {
//     inbody: "Free InBody Assessment",
//     buddy: "Bring-a-Buddy (Free Session)",
//   };
//   const REWARD_EMOJIS: Record<RewardType, string> = {
//     inbody: "📊",
//     buddy: "🤝",
//   };
//   const [members, setMembers] = useState<MemberReward[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState<"all" | "ready" | "progress">("all");
//   const [redeemTarget, setRedeemTarget] = useState<MemberReward | null>(null);
//   const [submitting, setSubmitting] = useState(false);
//   const [search, setSearch] = useState("");
//   const load = () => {
//     setLoading(true);
//     get(ref(db, "mk2_users")).then((snap) => {
//       if (!snap.exists()) {
//         setMembers([]);
//         setLoading(false);
//         return;
//       }
//       const list: MemberReward[] = [];
//       Object.entries(snap.val()).forEach(([uid, val]: [string, any]) => {
//         const totalCheckIns: number = Array.isArray(val.checkIns)
//           ? val.checkIns.length
//           : typeof val.checkIns === "number"
//             ? val.checkIns
//             : 0;
//         const rawRedemptions: RedemptionRecord[] = val.rewardRedemptions
//           ? Object.entries(val.rewardRedemptions).map(
//               ([id, r]: [string, any]) => ({ id, ...r }),
//             )
//           : [];
//         rawRedemptions.sort((a, b) => b.redeemedAt - a.redeemedAt);
//         const lastRedemptionAt =
//           rawRedemptions.length > 0 ? rawRedemptions[0].redeemedAt : 0;
//         let cycleCheckIns = 0;
//         if (Array.isArray(val.checkIns)) {
//           cycleCheckIns = val.checkIns.filter((ci: any) => {
//             const ts =
//               typeof ci === "number"
//                 ? ci
//                 : typeof ci === "string"
//                   ? new Date(ci).getTime()
//                   : 0;
//             return ts > lastRedemptionAt;
//           }).length;
//         } else {
//           cycleCheckIns =
//             lastRedemptionAt > 0
//               ? totalCheckIns -
//                 Math.floor(totalCheckIns / CHECKINS_REQUIRED) *
//                   CHECKINS_REQUIRED
//               : totalCheckIns;
//         }
//         const rewardReady = cycleCheckIns >= CHECKINS_REQUIRED;
//         const progress = Math.min(
//           100,
//           (cycleCheckIns / CHECKINS_REQUIRED) * 100,
//         );
//         const pendingRaw = val.pendingReward ?? null;
//         const pendingReward = pendingRaw
//           ? {
//               type: pendingRaw.type as RewardType,
//               earnedAt: pendingRaw.earnedAt,
//               expiresAt: pendingRaw.expiresAt,
//               expired: Date.now() > pendingRaw.expiresAt,
//             }
//           : rewardReady
//             ? {
//                 type: "inbody" as RewardType,
//                 earnedAt: Date.now(),
//                 expiresAt: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
//                 expired: false,
//               }
//             : undefined;
//         list.push({
//           uid,
//           name: val.name || "Unnamed",
//           email: val.email || "",
//           checkIns: totalCheckIns,
//           cycleCheckIns,
//           progress,
//           rewardReady,
//           pendingReward,
//           redemptions: rawRedemptions,
//         });
//       });
//       list.sort((a, b) => {
//         if (a.rewardReady !== b.rewardReady) return a.rewardReady ? -1 : 1;
//         return b.progress - a.progress;
//       });
//       setMembers(list);
//       setLoading(false);
//     });
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   const handleRedeem = async (type: RewardType, note: string) => {
//     if (!redeemTarget) return;
//     setSubmitting(true);
//     const { uid, name } = redeemTarget;
//     try {
//       const now = Date.now();
//       await push(ref(db, `mk2_users/${uid}/rewardRedemptions`), {
//         type,
//         redeemedAt: now,
//         redeemedBy: "Admin",
//         note: note || `Redeemed at reception`,
//       });
//       await set(ref(db, `mk2_users/${uid}/pendingReward`), null);
//       await set(ref(db, `mk2_users/${uid}/rewardCycleStart`), now);
//       toast(`✓ ${REWARD_LABELS[type]} redeemed for ${name}`, "success");
//       setRedeemTarget(null);
//       load();
//     } catch {
//       toast("Redemption failed", "error");
//     }
//     setSubmitting(false);
//   };
//   const filtered = members
//     .filter((m) => {
//       if (filter === "ready") return m.rewardReady;
//       if (filter === "progress") return !m.rewardReady;
//       return true;
//     })
//     .filter(
//       (m) =>
//         !search ||
//         m.name.toLowerCase().includes(search.toLowerCase()) ||
//         m.email.toLowerCase().includes(search.toLowerCase()),
//     );
//   const readyCount = members.filter((m) => m.rewardReady).length;
//   const ProgressBar = ({ pct, ready }: { pct: number; ready: boolean }) => (
//     <div
//       style={{
//         width: "100%",
//         height: 6,
//         background: "hsl(var(--border))",
//         borderRadius: 4,
//         overflow: "hidden",
//       }}
//     >
//       <div
//         style={{
//           width: `${Math.min(100, pct)}%`,
//           height: "100%",
//           background: ready ? "hsl(142 72% 37%)" : "hsl(20 100% 50%)",
//           borderRadius: 4,
//           transition: "width 0.4s ease",
//         }}
//       />
//     </div>
//   );
//   const RedeemModal = ({
//     member,
//     onClose,
//     onConfirm,
//     submitting,
//   }: {
//     member: MemberReward;
//     onClose: () => void;
//     onConfirm: (type: RewardType, note: string) => void;
//     submitting: boolean;
//   }) => {
//     const [type, setType] = useState<RewardType>("inbody");
//     const [note, setNote] = useState("");
//     return (
//       <div
//         style={{
//           position: "fixed",
//           inset: 0,
//           background: "rgba(0,0,0,0.7)",
//           zIndex: 200,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           padding: 20,
//         }}
//         onClick={onClose}
//       >
//         <motion.div
//           initial={{ opacity: 0, scale: 0.95 }}
//           animate={{ opacity: 1, scale: 1 }}
//           style={{
//             background: "hsl(var(--card))",
//             border: "1px solid hsl(var(--border))",
//             borderRadius: 16,
//             padding: 28,
//             width: "100%",
//             maxWidth: 440,
//           }}
//           onClick={(e) => e.stopPropagation()}
//         >
//           <div
//             style={{
//               fontFamily: "var(--font-display)",
//               fontSize: 22,
//               color: "hsl(20 100% 50%)",
//               marginBottom: 4,
//             }}
//           >
//             Redeem Reward
//           </div>
//           <div
//             style={{
//               fontSize: 13,
//               color: "hsl(var(--muted-foreground))",
//               marginBottom: 20,
//             }}
//           >
//             {member.name} has earned a reward for reaching {CHECKINS_REQUIRED}{" "}
//             check-ins.
//           </div>
//           <label style={lbl}>Reward Type</label>
//           <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
//             {(["inbody", "buddy"] as RewardType[]).map((t) => (
//               <button
//                 key={t}
//                 onClick={() => setType(t)}
//                 style={{
//                   flex: 1,
//                   padding: "12px 10px",
//                   borderRadius: 10,
//                   cursor: "pointer",
//                   border: `2px solid ${type === t ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
//                   background:
//                     type === t ? "hsl(20 100% 50% / 0.08)" : "transparent",
//                   textAlign: "center",
//                   fontFamily: "var(--font-body)",
//                 }}
//               >
//                 <div style={{ fontSize: 24, marginBottom: 4 }}>
//                   {REWARD_EMOJIS[t]}
//                 </div>
//                 <div
//                   style={{
//                     fontSize: 11,
//                     fontWeight: 700,
//                     color:
//                       type === t
//                         ? "hsl(20 100% 50%)"
//                         : "hsl(var(--foreground))",
//                   }}
//                 >
//                   {REWARD_LABELS[t]}
//                 </div>
//               </button>
//             ))}
//           </div>
//           <label style={lbl}>Note (optional)</label>
//           <input
//             style={{ ...inp, marginBottom: 20 }}
//             placeholder="e.g. Redeemed at front desk on 9 Apr"
//             value={note}
//             onChange={(e) => setNote(e.target.value)}
//           />
//           <div style={{ display: "flex", gap: 10 }}>
//             <Btn
//               variant="primary"
//               onClick={() => onConfirm(type, note)}
//               disabled={submitting}
//             >
//               {submitting ? "Redeeming…" : "✓ Confirm Redemption"}
//             </Btn>
//             <Btn variant="subtle" onClick={onClose}>
//               Cancel
//             </Btn>
//           </div>
//         </motion.div>
//       </div>
//     );
//   };
//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "flex-start",
//           marginBottom: 20,
//           flexWrap: "wrap",
//           gap: 12,
//         }}
//       >
//         <div>
//           <div style={{ fontWeight: 700, fontSize: 15 }}>
//             Rewards Management
//           </div>
//           <div
//             style={{
//               fontSize: 12,
//               color: "hsl(var(--muted-foreground))",
//               marginTop: 4,
//             }}
//           >
//             {CHECKINS_REQUIRED} check-ins = 1 reward · Redeem within{" "}
//             {EXPIRY_DAYS} days
//           </div>
//         </div>
//         {readyCount > 0 && (
//           <div
//             style={{
//               background: "hsl(142 72% 37% / 0.12)",
//               border: "1px solid hsl(142 72% 37% / 0.3)",
//               borderRadius: 10,
//               padding: "8px 16px",
//               fontSize: 13,
//               fontWeight: 700,
//               color: "hsl(142 72% 37%)",
//             }}
//           >
//             🎁 {readyCount} member{readyCount !== 1 ? "s" : ""} ready to redeem
//           </div>
//         )}
//       </div>
//       <div
//         style={{
//           background: "hsl(var(--secondary))",
//           border: "1px solid hsl(var(--border))",
//           borderRadius: 10,
//           padding: "12px 16px",
//           marginBottom: 20,
//           fontSize: 12,
//           color: "hsl(var(--muted-foreground))",
//           lineHeight: 1.7,
//         }}
//       >
//         <strong style={{ color: "hsl(var(--foreground))" }}>
//           Reward Rules:{" "}
//         </strong>
//         Every {CHECKINS_REQUIRED} gym check‑ins earns a member one reward —
//         either a{" "}
//         <strong style={{ color: "hsl(20 100% 50%)" }}>
//           Free InBody Assessment
//         </strong>{" "}
//         or a{" "}
//         <strong style={{ color: "hsl(20 100% 50%)" }}>
//           Bring‑a‑Buddy free session
//         </strong>
//         . Rewards must be redeemed within{" "}
//         <strong style={{ color: "hsl(20 100% 50%)" }}>
//           {EXPIRY_DAYS} days
//         </strong>{" "}
//         of earning. After redemption the cycle resets.
//       </div>
//       <div
//         style={{
//           display: "flex",
//           gap: 10,
//           marginBottom: 16,
//           flexWrap: "wrap",
//           alignItems: "center",
//         }}
//       >
//         {(
//           [
//             ["all", `All (${members.length})`],
//             ["ready", `🎁 Ready (${readyCount})`],
//             ["progress", `⏳ In Progress (${members.length - readyCount})`],
//           ] as const
//         ).map(([f, label]) => (
//           <button
//             key={f}
//             onClick={() => setFilter(f)}
//             style={{
//               padding: "5px 14px",
//               borderRadius: 20,
//               fontSize: 11,
//               fontWeight: 700,
//               cursor: "pointer",
//               background:
//                 filter === f ? "hsl(20 100% 50%)" : "hsl(var(--secondary))",
//               color: filter === f ? "#000" : "hsl(var(--foreground))",
//               border: filter === f ? "none" : "1px solid hsl(var(--border))",
//             }}
//           >
//             {label}
//           </button>
//         ))}
//         <input
//           style={{ ...inp, width: 200, marginLeft: "auto" }}
//           placeholder="Search name or email…"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//         />
//         <Btn variant="subtle" size="sm" onClick={load}>
//           ↻ Refresh
//         </Btn>
//       </div>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading members…
//         </div>
//       ) : filtered.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No members found.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//           {filtered.map((m) => {
//             const expired = m.pendingReward?.expired;
//             const borderColor = m.rewardReady
//               ? expired
//                 ? "hsl(0 84% 51%)"
//                 : "hsl(142 72% 37%)"
//               : "hsl(var(--border))";
//             return (
//               <div
//                 key={m.uid}
//                 style={{
//                   background: "hsl(var(--secondary))",
//                   border: "1px solid hsl(var(--border))",
//                   borderRadius: 12,
//                   padding: "14px 16px",
//                   borderLeft: `3px solid ${borderColor}`,
//                 }}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "flex-start",
//                     flexWrap: "wrap",
//                     gap: 10,
//                     marginBottom: 10,
//                   }}
//                 >
//                   <div>
//                     <div
//                       style={{
//                         fontWeight: 700,
//                         fontSize: 14,
//                         display: "flex",
//                         alignItems: "center",
//                         gap: 8,
//                       }}
//                     >
//                       {m.name}
//                       {m.rewardReady && !expired && (
//                         <span
//                           style={{
//                             fontSize: 10,
//                             fontWeight: 700,
//                             padding: "2px 8px",
//                             borderRadius: 20,
//                             background: "hsl(142 72% 37% / 0.15)",
//                             color: "hsl(142 72% 37%)",
//                           }}
//                         >
//                           🎁 Reward Ready
//                         </span>
//                       )}
//                       {m.rewardReady && expired && (
//                         <span
//                           style={{
//                             fontSize: 10,
//                             fontWeight: 700,
//                             padding: "2px 8px",
//                             borderRadius: 20,
//                             background: "hsl(0 84% 51% / 0.15)",
//                             color: "hsl(0 84% 51%)",
//                           }}
//                         >
//                           ⚠ Reward Expired
//                         </span>
//                       )}
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 12,
//                         color: "hsl(var(--muted-foreground))",
//                         marginTop: 2,
//                       }}
//                     >
//                       {m.email} · {m.checkIns} total check-ins
//                     </div>
//                   </div>
//                   {m.rewardReady && !expired && (
//                     <Btn
//                       variant="green"
//                       size="sm"
//                       onClick={() => setRedeemTarget(m)}
//                     >
//                       ✓ Redeem Reward
//                     </Btn>
//                   )}
//                 </div>
//                 <div style={{ marginBottom: 6 }}>
//                   <div
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       fontSize: 11,
//                       color: "hsl(var(--muted-foreground))",
//                       marginBottom: 4,
//                     }}
//                   >
//                     <span>
//                       {m.rewardReady
//                         ? "Current cycle complete ✓"
//                         : `${m.cycleCheckIns} / ${CHECKINS_REQUIRED} check-ins this cycle`}
//                     </span>
//                     <span style={{ fontWeight: 700 }}>
//                       {Math.round(m.progress)}%
//                     </span>
//                   </div>
//                   <ProgressBar pct={m.progress} ready={m.rewardReady} />
//                 </div>
//                 {m.rewardReady && m.pendingReward && !expired && (
//                   <div
//                     style={{
//                       fontSize: 11,
//                       color: "hsl(38 92% 44%)",
//                       marginTop: 6,
//                     }}
//                   >
//                     ⏰ Reward expires{" "}
//                     {new Date(m.pendingReward.expiresAt).toLocaleDateString(
//                       "en-ZA",
//                       { day: "numeric", month: "long", year: "numeric" },
//                     )}
//                   </div>
//                 )}
//                 {m.redemptions.length > 0 && (
//                   <details style={{ marginTop: 10 }}>
//                     <summary
//                       style={{
//                         fontSize: 11,
//                         color: "hsl(var(--muted-foreground))",
//                         cursor: "pointer",
//                         userSelect: "none",
//                       }}
//                     >
//                       {m.redemptions.length} previous redemption
//                       {m.redemptions.length !== 1 ? "s" : ""}
//                     </summary>
//                     <div
//                       style={{
//                         display: "flex",
//                         flexDirection: "column",
//                         gap: 4,
//                         marginTop: 8,
//                       }}
//                     >
//                       {m.redemptions.slice(0, 5).map((r) => (
//                         <div
//                           key={r.id}
//                           style={{
//                             fontSize: 11,
//                             color: "hsl(var(--muted-foreground))",
//                             display: "flex",
//                             gap: 8,
//                             padding: "4px 8px",
//                             background: "hsl(var(--background))",
//                             borderRadius: 6,
//                           }}
//                         >
//                           <span>{REWARD_EMOJIS[r.type]}</span>
//                           <span style={{ color: "hsl(var(--foreground))" }}>
//                             {REWARD_LABELS[r.type]}
//                           </span>
//                           <span style={{ marginLeft: "auto" }}>
//                             {new Date(r.redeemedAt).toLocaleDateString(
//                               "en-ZA",
//                               {
//                                 day: "numeric",
//                                 month: "short",
//                                 year: "numeric",
//                               },
//                             )}
//                           </span>
//                         </div>
//                       ))}
//                     </div>
//                   </details>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       )}
//       <AnimatePresence>
//         {redeemTarget && (
//           <RedeemModal
//             member={redeemTarget}
//             onClose={() => setRedeemTarget(null)}
//             onConfirm={handleRedeem}
//             submitting={submitting}
//           />
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// // ── Tabs ──────────────────────────────────────────────────────────────────────
// const TABS = [
//   { id: "members", label: "👥 Members", desc: "Manage user tiers" },
//   { id: "classes", label: "📅 Classes", desc: "Schedule & bookings" },
//   { id: "packages", label: "🎟 Packages", desc: "Class credit packages" },
//   { id: "gallery", label: "📸 Gallery", desc: "Add & remove items" },
//   { id: "news", label: "📢 News & Events", desc: "Post updates" },
//   { id: "ads", label: "📣 Ad Enquiries", desc: "Manage advertising" },
//   { id: "banners", label: "🖼 Ad Banners", desc: "Live banner ads" },
//   { id: "challenges", label: "🏁 Challenges", desc: "Create challenges" },
//   { id: "rewards", label: "🎁 Rewards", desc: "Check‑in rewards" },
//   { id: "feedback", label: "💬 Feedback", desc: "App feedback & ratings" },
//   { id: "terms", label: "📋 T&C Records", desc: "Acceptance audit log" },
//   { id: "instagram", label: "📱 Instagram", desc: "Auto-sync setup" },
// ];

// export function Admin() {
//   const [authed, setAuthed] = useState(
//     () => sessionStorage.getItem("mk2admin") === "true",
//   );
//   const [tab, setTab] = useState("members");
//   const [toastQ, setToastQ] = useState<any>(null);
//   const { isMobile } = useBreakpoint();
//   const toast = (msg: string, type: string) => setToastQ({ msg, type });
//   const login = () => {
//     sessionStorage.setItem("mk2admin", "true");
//     setAuthed(true);
//   };
//   const logout = () => {
//     sessionStorage.removeItem("mk2admin");
//     setAuthed(false);
//   };
//   if (!authed) return <AdminLogin onLogin={login} />;
//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         background: "hsl(var(--background))",
//         color: "hsl(var(--foreground))",
//         fontFamily: "var(--font-body)",
//         paddingBottom: 40,
//       }}
//     >
//       <nav
//         style={{
//           background: "hsl(0 0% 4%)",
//           borderBottom: "1px solid hsl(var(--border))",
//           padding: "0 24px",
//           height: 56,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           position: "sticky",
//           top: 0,
//           zIndex: 100,
//         }}
//       >
//         <div
//           style={{
//             fontFamily: "var(--font-display)",
//             fontSize: 20,
//             letterSpacing: "0.15em",
//             color: "hsl(20 100% 50%)",
//           }}
//         >
//           MK2R ADMIN
//         </div>
//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//           <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
//             Management Portal
//           </span>
//           <Btn variant="subtle" size="sm" onClick={logout}>
//             Sign Out
//           </Btn>
//         </div>
//       </nav>
//       <div
//         style={{
//           maxWidth: 1060,
//           margin: "0 auto",
//           padding: isMobile ? "20px 14px" : "32px 24px",
//         }}
//       >
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
//             gap: 10,
//             marginBottom: 28,
//           }}
//         >
//           {TABS.map((t) => (
//             <button
//               key={t.id}
//               onClick={() => setTab(t.id)}
//               style={{
//                 background:
//                   tab === t.id ? "hsl(20 100% 50%)" : "hsl(var(--card))",
//                 color: tab === t.id ? "#000" : "hsl(var(--foreground))",
//                 border: `1px solid ${tab === t.id ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
//                 borderRadius: 10,
//                 padding: "14px 16px",
//                 textAlign: "left",
//                 cursor: "pointer",
//                 fontFamily: "var(--font-body)",
//                 transition: "all 0.15s",
//               }}
//             >
//               <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
//               <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>
//                 {t.desc}
//               </div>
//             </button>
//           ))}
//         </div>
//         <motion.div
//           key={tab}
//           initial={{ opacity: 0, y: 6 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.2 }}
//           style={{
//             background: "hsl(var(--card))",
//             border: "1px solid hsl(var(--border))",
//             borderRadius: 14,
//             padding: isMobile ? 16 : 24,
//           }}
//         >
//           {tab === "members" && <MembersManager toast={toast} />}
//           {tab === "classes" && <ClassesManager toast={toast} />}
//           {tab === "packages" && <PackagesManager toast={toast} />}
//           {tab === "gallery" && <GalleryManager toast={toast} />}
//           {tab === "news" && <NewsManager toast={toast} />}
//           {tab === "ads" && <AdEnquiriesManager toast={toast} />}
//           {tab === "feedback" && <FeedbackManager toast={toast} />}
//           {tab === "instagram" && <InstagramSetup />}
//           {tab === "terms" && <TermsManager toast={toast} />}
//           {tab === "banners" && <BannersManager toast={toast} />}
//           {tab === "challenges" && <ChallengesManager toast={toast} />}
//           {tab === "rewards" && <RewardsManager toast={toast} />}
//         </motion.div>
//       </div>
//       {toastQ && <MToast {...toastQ} onDone={() => setToastQ(null)} />}
//     </div>
//   );
// }
