import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent, db } from "@/lib/firebase";
import { ref, onValue, set } from "firebase/database";
import { Btn } from "@/components/shared/Btn";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion, AnimatePresence } from "framer-motion";

export const CATEGORY_COLORS: Record<string, string> = {
  CrossFit: "hsl(20 100% 50%)",
  Cardio: "hsl(0 84% 51%)",
  Strength: "hsl(38 92% 44%)",
  Combat: "hsl(15 90% 50%)",
  Core: "hsl(142 72% 37%)",
  Spin: "hsl(217 91% 53%)",
  Flexibility: "hsl(263 85% 58%)",
  Recovery: "hsl(187 85% 40%)",
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

const FALLBACK_CLASSES = [
  {
    name: "CrossFit WOD",
    time: "05:30",
    trainer: "Coach Marcus",
    spots: 12,
    subtitle: "Workout of the Day",
    category: "CrossFit",
    details: [
      "Daily programmed WOD",
      "Olympic lifting + gymnastics",
      "Scaled options available",
    ],
    duration: "60 min",
    intensity: "Very High",
    wod: "",
  },
  {
    name: "HIIT Blast",
    time: "06:00",
    trainer: "Coach Sipho",
    spots: 8,
    subtitle: "High-intensity intervals",
    category: "Cardio",
    details: [
      "10 rounds Tabata",
      "Kettlebell swings & burpees",
      "Burns 400–600 kcal",
    ],
    duration: "45 min",
    intensity: "High",
    wod: "",
  },
  {
    name: "Strength Circuit",
    time: "09:00",
    trainer: "Coach Busi",
    spots: 6,
    subtitle: "Full-body resistance training",
    category: "Strength",
    details: [
      "5 stations × 4 rounds",
      "Barbell, dumbbell & bodyweight",
      "Progressive overload",
    ],
    duration: "50 min",
    intensity: "Medium–High",
    wod: "",
  },
  {
    name: "Spin Class",
    time: "12:00",
    trainer: "Thandeka N.",
    spots: 15,
    subtitle: "Indoor cycling to the beat",
    category: "Spin",
    details: [
      "Music-driven intervals",
      "Climbs, sprints & recoveries",
      "Burns 500–800 kcal",
    ],
    duration: "45 min",
    intensity: "High",
    wod: "",
  },
  {
    name: "Boxing Fit",
    time: "17:00",
    trainer: "Coach Dlamini",
    spots: 10,
    subtitle: "Punch, duck, sweat, repeat",
    category: "Combat",
    details: [
      "Pad work & shadow boxing",
      "Footwork & defence drills",
      "Gloves provided",
    ],
    duration: "55 min",
    intensity: "High",
    wod: "",
  },
  {
    name: "Pilates Core",
    time: "18:30",
    trainer: "Nomsa K.",
    spots: 8,
    subtitle: "Deep core & postural strength",
    category: "Core",
    details: [
      "Mat & reformer principles",
      "Injury rehab friendly",
      "Small group max 8",
    ],
    duration: "50 min",
    intensity: "Low–Medium",
    wod: "",
  },
  {
    name: "CrossFit WOD PM",
    time: "19:00",
    trainer: "Coach Marcus",
    spots: 12,
    subtitle: "Evening WOD — same intensity",
    category: "CrossFit",
    details: [
      "Same WOD as morning",
      "Scaled options available",
      "Track personal records",
    ],
    duration: "60 min",
    intensity: "Very High",
    wod: "",
  },
];

const intColor = (i: string) =>
  i.includes("Very")
    ? "hsl(0 84% 51%)"
    : i.includes("High")
      ? "hsl(20 100% 50%)"
      : i.includes("Medium")
        ? "hsl(38 92% 44%)"
        : "hsl(142 72% 37%)";

// ── TIMEZONE-SAFE helpers ─────────────────────────────────────────────────────
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function getDayName(date: Date): string {
  return DAYS[[6, 0, 1, 2, 3, 4, 5][date.getDay()]];
}
function safeKey(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// ── Gold monthly credit top-up ────────────────────────────────────────────────
async function maybeTopUpGoldCredits(user: any, updateUser: any) {
  if (user.membership !== "gold") return;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  if (user.lastGoldTopUp === monthKey) return;
  const newCredits = Math.max(user.classCredits ?? 0, 10);
  await updateUser({
    ...user,
    classCredits: newCredits,
    lastGoldTopUp: monthKey,
  });
}

// ── Credit pill ───────────────────────────────────────────────────────────────
function CreditPill({
  credits,
  setPage,
}: {
  credits: number;
  setPage?: (p: string) => void;
}) {
  return (
    <button
      onClick={() => setPage?.("Membership")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 14px",
        borderRadius: 20,
        background:
          credits > 0 ? "hsl(20 100% 50% / 0.15)" : "hsl(0 84% 51% / 0.15)",
        border: `1px solid ${credits > 0 ? "hsl(20 100% 50% / 0.4)" : "hsl(0 84% 51% / 0.4)"}`,
        color: credits > 0 ? "hsl(20 100% 50%)" : "hsl(0 84% 51%)",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "var(--font-body)",
      }}
    >
      🎟 {credits} credit{credits !== 1 ? "s" : ""}
      {credits === 0 && (
        <span style={{ fontSize: 10, opacity: 0.8 }}>— Buy more →</span>
      )}
    </button>
  );
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({
  selectedDate,
  onSelect,
  bookedDates,
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  bookedDates: Set<string>;
}) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
    <div className="mk2-card mb-5" style={{ maxWidth: 320 }}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="text-muted-foreground hover:text-foreground w-7 h-7 flex items-center justify-center rounded transition-colors"
        >
          ←
        </button>
        <span className="font-bold text-xs">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="text-muted-foreground hover:text-foreground w-7 h-7 flex items-center justify-center rounded transition-colors"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 mb-0.5">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[9px] font-bold text-muted-foreground py-0.5"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const date = new Date(viewYear, viewMonth, day);
          date.setHours(0, 0, 0, 0);
          const key = formatDateKey(date);
          const isPast = date < today;
          const isToday = date.getTime() === today.getTime();
          const isSel = formatDateKey(selectedDate) === key;
          const hasBkg = bookedDates.has(key);
          return (
            <button
              key={i}
              onClick={() =>
                !isPast && onSelect(new Date(viewYear, viewMonth, day))
              }
              disabled={isPast}
              className={[
                "relative w-full aspect-square rounded text-[11px] font-semibold transition-all flex flex-col items-center justify-center leading-none",
                isPast
                  ? "opacity-20 cursor-not-allowed"
                  : "cursor-pointer hover:bg-secondary",
                isSel ? "bg-orange-500 text-black" : "",
                isToday && !isSel
                  ? "ring-1 ring-orange-500 text-orange-500"
                  : "",
              ].join(" ")}
            >
              {day}
              {hasBkg && !isSel && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2 text-[9px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
          Booked
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded ring-1 ring-orange-500 inline-block" />
          Today
        </div>
      </div>
    </div>
  );
}

// ── WOD Panel ─────────────────────────────────────────────────────────────────
function WodPanel({ cls, color }: { cls: any; color: string }) {
  const wod: string = (cls.wod || "").trim();
  if (!wod) return null;
  const lines = wod.split("\n");
  return (
    <div className="mt-3 rounded-xl p-3 text-xs leading-relaxed border border-border bg-background">
      <div className="mb-2 pb-2 border-b border-border">
        <div className="font-bold text-sm">{cls.trainer}</div>
        <div className="text-[11px]" style={{ color }}>
          {cls.category}
        </div>
      </div>
      <div>
        {lines.map((line, i) => {
          const t = line.trim();
          if (!t) return <div key={i} className="h-1.5" />;
          const isPart = /^part\s/i.test(t);
          const isHeader =
            !isPart &&
            (t.endsWith(":") ||
              (t === t.toUpperCase() && t.length < 40 && /[A-Z]/.test(t)));
          const isWeight = /^(comp|scaled|beg|rx)\s*:/i.test(t);
          if (isPart)
            return (
              <div key={i} className="font-bold mt-2" style={{ color }}>
                {t}
              </div>
            );
          if (isHeader)
            return (
              <div key={i} className="font-bold text-foreground mt-1">
                {t}
              </div>
            );
          if (isWeight)
            return (
              <div key={i} className="text-[10px] text-muted-foreground italic">
                {t}
              </div>
            );
          return (
            <div key={i} className="text-muted-foreground">
              {t}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ClassBooking({ setPage }: { setPage?: (p: string) => void }) {
  const { user, updateUser, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date(today));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showWhoBooked, setShowWhoBooked] = useState<string | null>(null);
  const [classBookings, setClassBookings] = useState<
    Record<string, Record<string, any>>
  >({});
  const [adminClasses, setAdminClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    if (user) maybeTopUpGoldCredits(user, updateUser);
  }, []);

  useEffect(() => {
    return onValue(ref(db, "admin_classes"), (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val())
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        setAdminClasses(list);
      } else setAdminClasses([]);
      setLoadingClasses(false);
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "class_bookings"), (snap) =>
      setClassBookings(snap.val() ?? {}),
    );
  }, []);

  if (!user) return null;

  const dateKey = formatDateKey(selectedDate);
  const dayName = getDayName(selectedDate);
  const CLASSES = adminClasses.length > 0 ? adminClasses : FALLBACK_CLASSES;
  const credits = user.classCredits ?? 0;

  const dayClasses = CLASSES.filter((cls) => {
    if (adminClasses.length > 0) {
      if (cls.scheduleType === "date") return cls.specificDate === dateKey;
      return cls.day === dayName;
    }
    return true;
  });

  const bKey = (cls: any) => `${safeKey(cls.name)}_${dateKey}`;
  const isBooked = (cls: any): boolean =>
    !!classBookings[bKey(cls)]?.[user.uid];
  const bookedCount = (cls: any): number =>
    Object.keys(classBookings[bKey(cls)] ?? {}).length;
  const bookedList = (cls: any): any[] =>
    Object.values(classBookings[bKey(cls)] ?? {});
  const spotsLeft = (cls: any): number =>
    Math.max(0, (cls.spots || 12) - bookedCount(cls));

  const bookedDates = new Set<string>(
    user.bookings.map((b: any) => b.dateKey).filter(Boolean),
  );
  const tier =
    user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
  const discount = tier === "Gold" ? 0.8 : tier === "Silver" ? 0.9 : 1;

  // ── Book ──────────────────────────────────────────────────────────────────
  const book = async (cls: any) => {
    if (isBooked(cls))
      return toast("You're already booked for this class!", "error");
    if (spotsLeft(cls) === 0) return toast("This class is full!", "error");

    const currentCredits = user.classCredits ?? 0;
    if (currentCredits < 1) {
      toast("No credits — buy a package to book classes!", "error");
      setTimeout(() => setPage?.("Membership"), 1500);
      return;
    }

    await set(ref(db, `class_bookings/${bKey(cls)}/${user.uid}`), {
      name: user.name,
      email: user.email,
      bookedAt: Date.now(),
    });

    const already = user.bookings.some(
      (b: any) => b.name === cls.name && b.dateKey === dateKey,
    );
    const newBookings = already
      ? user.bookings
      : [
          ...user.bookings,
          {
            ...cls,
            dateKey,
            date: dayName,
            displayDate: selectedDate.toLocaleDateString("en-ZA", {
              weekday: "short",
              day: "numeric",
              month: "short",
            }),
          },
        ];

    const newCredits = currentCredits - 1;
    await updateUser({
      ...user,
      classCredits: newCredits,
      bookings: newBookings,
    });

    // Log credit transaction (non-critical)
    try {
      const { push: fbPush } = await import("firebase/database");
      await fbPush(ref(db, `mk2_users/${user.uid}/creditHistory`), {
        amount: -1,
        type: "class_booking",
        note: `${cls.name} on ${dateKey}`,
        timestamp: Date.now(),
      });
    } catch {
      /* non-critical */
    }

    logEvent("book_class", { class_name: cls.name, date: dateKey });
    toast(
      `✓ ${cls.name} booked · ${newCredits} credit${newCredits !== 1 ? "s" : ""} left`,
      "success",
    );
  };

  // ── Cancel — refunds credit ───────────────────────────────────────────────
  const cancel = async (cls: any) => {
    if (
      !confirm(
        `Cancel ${cls.name} on ${selectedDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}?`,
      )
    )
      return;

    await set(ref(db, `class_bookings/${bKey(cls)}/${user.uid}`), null);

    const newCredits = (user.classCredits ?? 0) + 1;
    await updateUser({
      ...user,
      classCredits: newCredits,
      bookings: user.bookings.filter(
        (b: any) => !(b.name === cls.name && b.dateKey === dateKey),
      ),
    });

    try {
      const { push: fbPush } = await import("firebase/database");
      await fbPush(ref(db, `mk2_users/${user.uid}/creditHistory`), {
        amount: +1,
        type: "booking_cancelled",
        note: `Refund: ${cls.name} on ${dateKey}`,
        timestamp: Date.now(),
      });
    } catch {
      /* non-critical */
    }

    toast("Booking cancelled · 1 credit refunded", "info");
  };

  const displayDate = selectedDate.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const upcomingBookings = user.bookings
    .filter((b: any) => b.dateKey && parseDateKey(b.dateKey) >= today)
    .sort((a: any, bk: any) =>
      (a.dateKey || "").localeCompare(bk.dateKey || ""),
    );

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle
        sub={`${tier} member — ${discount < 1 ? `${Math.round((1 - discount) * 100)}% discount active` : "earn points for discounts"}`}
      >
        Class <span className="text-primary">Booking</span>
      </PageTitle>

      {/* Credit balance */}
      <div className="mb-5">
        <CreditPill credits={credits} setPage={setPage} />
        {credits === 0 && (
          <p className="mt-2 text-xs text-red-400">
            You need at least 1 credit to book.{" "}
            <button
              onClick={() => setPage?.("Membership")}
              className="underline font-bold"
            >
              Buy a package →
            </button>
          </p>
        )}
        {user.membership === "gold" && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            🏆 Gold member — 10 free credits top up on the 1st of each month
          </p>
        )}
      </div>

      <MiniCalendar
        selectedDate={selectedDate}
        onSelect={(d) => {
          setSelectedDate(d);
          setExpanded(null);
          setShowWhoBooked(null);
        }}
        bookedDates={bookedDates}
      />

      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <div className="font-bold text-base">{displayDate}</div>
          <div className="text-xs text-muted-foreground">
            {dayClasses.length} {dayClasses.length === 1 ? "class" : "classes"}{" "}
            available
          </div>
        </div>
        {adminClasses.length > 0 && (
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Live schedule
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div
            key={cat}
            className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: `${color}18`,
              color,
              border: `1px solid ${color}40`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: color }}
            />
            {cat}
          </div>
        ))}
      </div>

      {loadingClasses ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Loading classes…
        </div>
      ) : dayClasses.length === 0 ? (
        <div className="mk2-card flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-4xl">🗓</span>
          <p className="font-bold text-sm">
            No classes scheduled for {dayName}
          </p>
          <p className="text-xs text-muted-foreground">
            Select another date or check back when the schedule is updated.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
          {dayClasses.map((cls, i) => {
            const color = CATEGORY_COLORS[cls.category] ?? "hsl(20 100% 50%)";
            const booked = isBooked(cls);
            const open = expanded === cls.name;
            const left = spotsLeft(cls);
            const full = left === 0 && !booked;
            const bookers = bookedList(cls);
            const showingWho = showWhoBooked === cls.name;
            const details = Array.isArray(cls.details) ? cls.details : [];
            const hasWod = !!cls.wod?.trim();
            const canBook = credits > 0;

            return (
              <motion.div
                key={`${cls.name}_${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border rounded-xl overflow-hidden"
                style={{
                  borderColor: open ? color : "hsl(var(--border))",
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-display text-[17px] tracking-wide leading-tight">
                        {cls.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {cls.subtitle}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-2xl" style={{ color }}>
                        {cls.time}
                      </div>
                      <div
                        className={`text-[10px] font-bold ${full ? "text-red-400" : "text-muted-foreground"}`}
                      >
                        {booked ? (
                          <span className="text-green-400">✓ You're in</span>
                        ) : full ? (
                          "FULL"
                        ) : (
                          `${left}/${cls.spots} spots`
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap mb-2.5">
                    <Tag color={color}>{cls.category}</Tag>
                    {cls.intensity && (
                      <Tag color={intColor(cls.intensity)}>{cls.intensity}</Tag>
                    )}
                    {cls.duration && (
                      <Tag color="hsl(0 0% 35%)">⏱ {cls.duration}</Tag>
                    )}
                  </div>

                  <div className="text-[11px] text-muted-foreground mb-2">
                    👤 {cls.trainer}
                  </div>

                  {hasWod && <WodPanel cls={cls} color={color} />}

                  <div className="flex gap-2 items-center flex-wrap mt-3">
                    {booked ? (
                      <>
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                          style={{
                            background: "hsl(142 72% 37% / 0.15)",
                            color: "hsl(142 72% 37%)",
                            border: "1px solid hsl(142 72% 37% / 0.3)",
                          }}
                        >
                          ✓ Booked
                        </span>
                        <Btn
                          variant="subtle"
                          size="sm"
                          onClick={() => cancel(cls)}
                        >
                          Cancel
                        </Btn>
                      </>
                    ) : (
                      <Btn
                        variant={canBook && !full ? "primary" : "subtle"}
                        size="sm"
                        onClick={() => book(cls)}
                        disabled={full || !canBook}
                      >
                        {full
                          ? "Class Full"
                          : !canBook
                            ? "No Credits 🎟"
                            : "Book Now 🎟"}
                      </Btn>
                    )}

                    {!hasWod && details.length > 0 && (
                      <button
                        onClick={() => setExpanded(open ? null : cls.name)}
                        className="text-muted-foreground text-[11px] bg-transparent border-none cursor-pointer hover:text-foreground transition-colors"
                      >
                        {open ? "▲ Less" : "▼ Details"}
                      </button>
                    )}

                    <button
                      onClick={() =>
                        setShowWhoBooked(showingWho ? null : cls.name)
                      }
                      className="text-muted-foreground text-[11px] bg-transparent border-none cursor-pointer hover:text-foreground transition-colors ml-auto"
                    >
                      👥 {bookedCount(cls)}
                    </button>
                  </div>
                </div>

                {open && !hasWod && details.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="bg-secondary border-t border-border px-4 py-3"
                  >
                    <div
                      className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2"
                      style={{ color }}
                    >
                      What's Included
                    </div>
                    {details.map((d: string, di: number) => (
                      <div
                        key={di}
                        className="flex gap-2 mb-1 text-xs text-muted-foreground"
                      >
                        <span style={{ color }}>▸</span>
                        {d}
                      </div>
                    ))}
                  </motion.div>
                )}

                <AnimatePresence>
                  {showingWho && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-background border-t px-4 py-3"
                      style={{ borderColor: `${color}40` }}
                    >
                      <div
                        className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2"
                        style={{ color }}
                      >
                        Booked ({bookers.length}/{cls.spots})
                      </div>
                      {bookers.length === 0 ? (
                        <div className="text-xs text-muted-foreground">
                          No bookings yet — be first!
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {bookers.map((b: any, bi: number) => (
                            <div
                              key={bi}
                              className="flex items-center gap-2 text-xs"
                            >
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                                style={{ background: color }}
                              >
                                {b.name?.[0] ?? "?"}
                              </div>
                              <span className="font-medium">{b.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {upcomingBookings.length > 0 && (
        <div className="mk2-card mt-7">
          <div className="font-bold text-sm mb-3">
            Your Upcoming Bookings ({upcomingBookings.length})
          </div>
          {upcomingBookings.map((b: any, i: number) => {
            const bColor = CATEGORY_COLORS[b.category] ?? "hsl(20 100% 50%)";
            return (
              <div
                key={i}
                className="flex justify-between items-center px-3 py-2 rounded-lg mb-1.5 text-xs flex-wrap gap-1.5"
                style={{
                  background: `${bColor}10`,
                  border: `1px solid ${bColor}30`,
                }}
              >
                <span className="font-bold" style={{ color: bColor }}>
                  {b.name}
                </span>
                <span className="text-muted-foreground">
                  {b.displayDate || b.dateKey}
                </span>
                <span className="text-muted-foreground">
                  {b.time} · {b.trainer}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// import { useState, useEffect } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { logEvent, db } from "@/lib/firebase";
// import { ref, onValue, set } from "firebase/database";
// import { Btn } from "@/components/shared/Btn";
// import { Tag } from "@/components/shared/Tag";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion, AnimatePresence } from "framer-motion";

// export const CATEGORY_COLORS: Record<string, string> = {
//   CrossFit: "hsl(20 100% 50%)",
//   Cardio: "hsl(0 84% 51%)",
//   Strength: "hsl(38 92% 44%)",
//   Combat: "hsl(15 90% 50%)",
//   Core: "hsl(142 72% 37%)",
//   Spin: "hsl(217 91% 53%)",
//   Flexibility: "hsl(263 85% 58%)",
//   Recovery: "hsl(187 85% 40%)",
// };

// // Fallback classes used only if admin hasn't added any yet
// const FALLBACK_CLASSES = [
//   {
//     name: "CrossFit WOD",
//     time: "05:30",
//     trainer: "Coach Marcus",
//     spots: 12,
//     subtitle: "Workout of the Day",
//     category: "CrossFit",
//     details: [
//       "Daily programmed WOD",
//       "Olympic lifting + gymnastics",
//       "Scaled options available",
//     ],
//     duration: "60 min",
//     intensity: "Very High",
//   },
//   {
//     name: "HIIT Blast",
//     time: "06:00",
//     trainer: "Coach Sipho",
//     spots: 8,
//     subtitle: "High-intensity intervals",
//     category: "Cardio",
//     details: [
//       "10 rounds Tabata",
//       "Kettlebell swings & burpees",
//       "Burns 400–600 kcal",
//     ],
//     duration: "45 min",
//     intensity: "High",
//   },
//   {
//     name: "Strength Circuit",
//     time: "09:00",
//     trainer: "Coach Busi",
//     spots: 6,
//     subtitle: "Full-body resistance training",
//     category: "Strength",
//     details: [
//       "5 stations × 4 rounds",
//       "Barbell, dumbbell & bodyweight",
//       "Progressive overload",
//     ],
//     duration: "50 min",
//     intensity: "Medium–High",
//   },
//   {
//     name: "Spin Class",
//     time: "12:00",
//     trainer: "Thandeka N.",
//     spots: 15,
//     subtitle: "Indoor cycling to the beat",
//     category: "Spin",
//     details: [
//       "Music-driven intervals",
//       "Climbs, sprints & recoveries",
//       "Burns 500–800 kcal",
//     ],
//     duration: "45 min",
//     intensity: "High",
//   },
//   {
//     name: "Boxing Fit",
//     time: "17:00",
//     trainer: "Coach Dlamini",
//     spots: 10,
//     subtitle: "Punch, duck, sweat, repeat",
//     category: "Combat",
//     details: [
//       "Pad work & shadow boxing",
//       "Footwork & defence drills",
//       "Gloves provided",
//     ],
//     duration: "55 min",
//     intensity: "High",
//   },
//   {
//     name: "Pilates Core",
//     time: "18:30",
//     trainer: "Nomsa K.",
//     spots: 8,
//     subtitle: "Deep core & postural strength",
//     category: "Core",
//     details: [
//       "Mat & reformer principles",
//       "Injury rehab friendly",
//       "Small group max 8",
//     ],
//     duration: "50 min",
//     intensity: "Low–Medium",
//   },
//   {
//     name: "CrossFit WOD PM",
//     time: "19:00",
//     trainer: "Coach Marcus",
//     spots: 12,
//     subtitle: "Evening WOD — same intensity",
//     category: "CrossFit",
//     details: [
//       "Same WOD as morning",
//       "Scaled options available",
//       "Track personal records",
//     ],
//     duration: "60 min",
//     intensity: "Very High",
//   },
// ];

// const DAYS = [
//   "Monday",
//   "Tuesday",
//   "Wednesday",
//   "Thursday",
//   "Friday",
//   "Saturday",
//   "Sunday",
// ];

// const intColor = (i: string) =>
//   i.includes("Very")
//     ? "hsl(0 84% 51%)"
//     : i.includes("High")
//       ? "hsl(20 100% 50%)"
//       : i.includes("Medium")
//         ? "hsl(38 92% 44%)"
//         : "hsl(142 72% 37%)";

// export function ClassBooking() {
//   const { user, updateUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [day, setDay] = useState(DAYS[Math.max(0, new Date().getDay() - 1)]);
//   const [expanded, setExpanded] = useState<string | null>(null);
//   const [classBookings, setClassBookings] = useState<
//     Record<string, Record<string, any>>
//   >({});
//   const [showWhoBooked, setShowWhoBooked] = useState<string | null>(null);

//   // ── NEW: Read classes from Firebase admin_classes, fall back to hardcoded
//   const [adminClasses, setAdminClasses] = useState<any[]>([]);
//   const [loadingClasses, setLoadingClasses] = useState(true);

//   useEffect(() => {
//     // Listen to admin_classes in real-time
//     const classesRef = ref(db, "admin_classes");
//     const unsub = onValue(classesRef, (snap) => {
//       if (snap.exists()) {
//         const data = snap.val();
//         const list = Object.entries(data).map(([id, val]: [string, any]) => ({
//           id,
//           ...val,
//         }));
//         // Sort by time
//         list.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
//         setAdminClasses(list);
//       } else {
//         setAdminClasses([]); // Will use fallback
//       }
//       setLoadingClasses(false);
//     });
//     return () => unsub();
//   }, []);

//   useEffect(() => {
//     const bookingsRef = ref(db, "class_bookings");
//     const unsub = onValue(bookingsRef, (snap) => {
//       setClassBookings(snap.val() ?? {});
//     });
//     return () => unsub();
//   }, []);

//   if (!user) return null;

//   // Use admin classes if available, otherwise fall back to hardcoded
//   const CLASSES = adminClasses.length > 0 ? adminClasses : FALLBACK_CLASSES;

//   const tier =
//     user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
//   const discount = tier === "Gold" ? 0.8 : tier === "Silver" ? 0.9 : 1;

//   const classKey = (cls: any) => `${cls.name}_${day}`;
//   const isBooked = (cls: any) => !!classBookings[classKey(cls)]?.[user.uid];
//   const bookedCount = (cls: any) =>
//     Object.keys(classBookings[classKey(cls)] ?? {}).length;
//   const bookedList = (cls: any) =>
//     Object.values(classBookings[classKey(cls)] ?? {});
//   const spotsLeft = (cls: any) =>
//     Math.max(0, (cls.spots || 12) - bookedCount(cls));

//   const book = async (cls: any) => {
//     if (isBooked(cls)) return toast("Already booked!", "error");
//     if (spotsLeft(cls) === 0) return toast("Class is full!", "error");
//     await set(ref(db, `class_bookings/${classKey(cls)}/${user.uid}`), {
//       name: user.name,
//       email: user.email,
//       bookedAt: Date.now(),
//     });
//     const updated = {
//       ...user,
//       bookings: [...user.bookings, { ...cls, date: day }],
//     };
//     await updateUser(updated);
//     logEvent("book_class", { class_name: cls.name, day });
//     toast(`✓ ${cls.name} booked for ${day}`, "success");
//   };

//   const cancel = async (cls: any) => {
//     await set(ref(db, `class_bookings/${classKey(cls)}/${user.uid}`), null);
//     const updated = {
//       ...user,
//       bookings: user.bookings.filter(
//         (b: any) => !(b.name === cls.name && b.date === day),
//       ),
//     };
//     await updateUser(updated);
//     toast("Booking cancelled", "info");
//   };

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle
//         sub={`${tier} member — ${discount < 1 ? `${Math.round((1 - discount) * 100)}% discount active` : "earn points for discounts"}`}
//       >
//         Class <span className="text-primary">Booking</span>
//       </PageTitle>

//       {/* Admin source indicator */}
//       {adminClasses.length > 0 && (
//         <div className="mb-4 text-[11px] text-muted-foreground flex items-center gap-1.5">
//           <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
//           Live schedule from admin ({adminClasses.length} classes)
//         </div>
//       )}

//       {/* Category legend */}
//       <div className="flex gap-2 flex-wrap mb-4">
//         {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
//           <div
//             key={cat}
//             className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
//             style={{
//               background: `${color}18`,
//               color,
//               border: `1px solid ${color}40`,
//             }}
//           >
//             <span
//               className="w-2 h-2 rounded-full inline-block"
//               style={{ background: color }}
//             />
//             {cat}
//           </div>
//         ))}
//       </div>

//       {/* Day tabs */}
//       <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
//         {DAYS.map((d) => (
//           <button
//             key={d}
//             onClick={() => setDay(d)}
//             className={`px-3.5 py-2 border rounded-lg font-body font-bold text-[11px] uppercase tracking-wide cursor-pointer whitespace-nowrap transition-all duration-150 flex-shrink-0 ${
//               d === day
//                 ? "bg-primary text-primary-foreground border-primary"
//                 : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
//             }`}
//           >
//             {isMobile ? d.slice(0, 3) : d}
//           </button>
//         ))}
//       </div>

//       {loadingClasses ? (
//         <div className="text-center py-12 text-muted-foreground text-sm">
//           Loading classes…
//         </div>
//       ) : (
//         <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
//           {CLASSES.map((cls, i) => {
//             const color = CATEGORY_COLORS[cls.category] ?? "hsl(20 100% 50%)";
//             const booked = isBooked(cls);
//             const open = expanded === cls.name;
//             const left = spotsLeft(cls);
//             const full = left === 0;
//             const bookers = bookedList(cls);
//             const showingWho = showWhoBooked === cls.name;
//             const details = Array.isArray(cls.details) ? cls.details : [];
//             return (
//               <motion.div
//                 key={cls.name + i}
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ delay: i * 0.05 }}
//                 className="bg-card border rounded-xl overflow-hidden transition-colors duration-200"
//                 style={{
//                   borderColor: open ? color : "hsl(var(--border))",
//                   borderLeft: `3px solid ${color}`,
//                 }}
//               >
//                 <div className="p-4">
//                   <div className="flex justify-between items-start mb-2">
//                     <div className="flex-1 min-w-0 pr-2">
//                       <div className="font-display text-[17px] tracking-wide leading-tight">
//                         {cls.name}
//                       </div>
//                       <div className="text-[11px] text-muted-foreground mt-0.5">
//                         {cls.subtitle}
//                       </div>
//                     </div>
//                     <div className="text-right shrink-0">
//                       <div className="font-display text-2xl" style={{ color }}>
//                         {cls.time}
//                       </div>
//                       <div
//                         className={`text-[10px] font-bold ${full ? "text-red-400" : "text-muted-foreground"}`}
//                       >
//                         {full ? "FULL" : `${left}/${cls.spots} spots`}
//                       </div>
//                     </div>
//                   </div>
//                   <div className="flex gap-1.5 flex-wrap mb-2.5">
//                     <Tag color={color}>{cls.category}</Tag>
//                     {cls.intensity && (
//                       <Tag color={intColor(cls.intensity)}>{cls.intensity}</Tag>
//                     )}
//                     {cls.duration && (
//                       <Tag color="hsl(0 0% 35%)">⏱ {cls.duration}</Tag>
//                     )}
//                   </div>
//                   <div className="text-[11px] text-muted-foreground mb-3">
//                     👤 {cls.trainer}
//                   </div>
//                   <div className="flex gap-2 items-center flex-wrap">
//                     {booked ? (
//                       <>
//                         <Tag color="hsl(142 72% 37%)">✓ Booked</Tag>
//                         <Btn
//                           variant="subtle"
//                           size="sm"
//                           onClick={() => cancel(cls)}
//                         >
//                           Cancel
//                         </Btn>
//                       </>
//                     ) : (
//                       <Btn
//                         variant="primary"
//                         size="sm"
//                         onClick={() => book(cls)}
//                         disabled={full}
//                       >
//                         {full ? "Full" : "Book Now"}
//                       </Btn>
//                     )}
//                     {details.length > 0 && (
//                       <button
//                         onClick={() => setExpanded(open ? null : cls.name)}
//                         className="bg-transparent border-none text-muted-foreground text-[11px] cursor-pointer font-body hover:text-foreground transition-colors"
//                       >
//                         {open ? "▲ Less" : "▼ Details"}
//                       </button>
//                     )}
//                     <button
//                       onClick={() =>
//                         setShowWhoBooked(showingWho ? null : cls.name)
//                       }
//                       className="bg-transparent border-none text-muted-foreground text-[11px] cursor-pointer font-body hover:text-foreground transition-colors ml-auto"
//                     >
//                       👥 {bookedCount(cls)}
//                     </button>
//                   </div>
//                 </div>

//                 {open && details.length > 0 && (
//                   <motion.div
//                     initial={{ height: 0, opacity: 0 }}
//                     animate={{ height: "auto", opacity: 1 }}
//                     className="bg-secondary border-t border-border px-4 py-3"
//                   >
//                     <div
//                       className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2"
//                       style={{ color }}
//                     >
//                       What's Included
//                     </div>
//                     {details.map((d: string, di: number) => (
//                       <div
//                         key={di}
//                         className="flex gap-2 mb-1 text-xs text-muted-foreground"
//                       >
//                         <span style={{ color }}>▸</span>
//                         {d}
//                       </div>
//                     ))}
//                   </motion.div>
//                 )}

//                 <AnimatePresence>
//                   {showingWho && (
//                     <motion.div
//                       initial={{ height: 0, opacity: 0 }}
//                       animate={{ height: "auto", opacity: 1 }}
//                       exit={{ height: 0, opacity: 0 }}
//                       className="bg-background border-t px-4 py-3"
//                       style={{ borderColor: `${color}40` }}
//                     >
//                       <div
//                         className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2"
//                         style={{ color }}
//                       >
//                         Booked ({bookers.length}/{cls.spots})
//                       </div>
//                       {bookers.length === 0 ? (
//                         <div className="text-xs text-muted-foreground">
//                           No bookings yet — be first!
//                         </div>
//                       ) : (
//                         <div className="flex flex-col gap-1">
//                           {bookers.map((b: any, bi: number) => (
//                             <div
//                               key={bi}
//                               className="flex items-center gap-2 text-xs"
//                             >
//                               <div
//                                 className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0"
//                                 style={{ background: color }}
//                               >
//                                 {b.name?.[0] ?? "?"}
//                               </div>
//                               <span className="text-foreground font-medium">
//                                 {b.name}
//                               </span>
//                             </div>
//                           ))}
//                         </div>
//                       )}
//                     </motion.div>
//                   )}
//                 </AnimatePresence>
//               </motion.div>
//             );
//           })}
//         </div>
//       )}

//       {user.bookings.length > 0 && (
//         <div className="mk2-card mt-7">
//           <div className="font-bold text-sm mb-3">
//             Your Bookings ({user.bookings.length})
//           </div>
//           {user.bookings.map((b: any, i: number) => {
//             const bColor = CATEGORY_COLORS[b.category] ?? "hsl(20 100% 50%)";
//             return (
//               <div
//                 key={i}
//                 className="flex justify-between items-center px-3 py-2 rounded-lg mb-1.5 text-xs flex-wrap gap-1.5"
//                 style={{
//                   background: `${bColor}10`,
//                   border: `1px solid ${bColor}30`,
//                 }}
//               >
//                 <span className="font-bold" style={{ color: bColor }}>
//                   {b.name}
//                 </span>
//                 <span className="text-muted-foreground">{b.date}</span>
//                 <span className="text-muted-foreground">
//                   {b.time} · {b.trainer}
//                 </span>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// import { useState, useEffect } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { logEvent, db } from "@/lib/firebase";
// import { ref, onValue, set } from "firebase/database";
// import { Btn } from "@/components/shared/Btn";
// import { Tag } from "@/components/shared/Tag";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion, AnimatePresence } from "framer-motion";

// // MK2R: Category colour codes — consistent across the whole app
// export const CATEGORY_COLORS: Record<string, string> = {
//   CrossFit: "hsl(20 100% 50%)", // MK2R orange
//   Cardio: "hsl(0 84% 51%)", // red
//   Strength: "hsl(38 92% 44%)", // amber
//   Combat: "hsl(15 90% 50%)", // red-orange
//   Core: "hsl(142 72% 37%)", // green
//   Spin: "hsl(217 91% 53%)", // blue
//   Flexibility: "hsl(263 85% 58%)", // purple
//   Recovery: "hsl(187 85% 40%)", // teal
// };

// const CLASSES = [
//   {
//     name: "CrossFit WOD",
//     time: "05:30",
//     trainer: "Coach Marcus",
//     spots: 12,
//     subtitle: "Workout of the Day — go hard",
//     category: "CrossFit",
//     details: [
//       "Daily programmed WOD",
//       "Olympic lifting + gymnastics",
//       "Scaled options available",
//       "Community atmosphere",
//       "Track personal records",
//     ],
//     duration: "60 min",
//     intensity: "Very High",
//   },
//   {
//     name: "HIIT Blast",
//     time: "06:00",
//     trainer: "Coach Sipho",
//     spots: 8,
//     subtitle: "High-intensity interval training",
//     category: "Cardio",
//     details: [
//       "10 rounds Tabata circuits",
//       "Kettlebell swings & burpees",
//       "Heart rate zones 3–5",
//       "Burns 400–600 kcal",
//       "All fitness levels welcome",
//     ],
//     duration: "45 min",
//     intensity: "High",
//   },
//   {
//     name: "Strength Circuit",
//     time: "09:00",
//     trainer: "Coach Busi",
//     spots: 6,
//     subtitle: "Full-body resistance training",
//     category: "Strength",
//     details: [
//       "5 stations × 4 rounds",
//       "Barbell, dumbbell & bodyweight",
//       "Progressive overload focus",
//       "Builds lean muscle mass",
//       "Intermediate–Advanced",
//     ],
//     duration: "50 min",
//     intensity: "Medium–High",
//   },
//   {
//     name: "Spin Class",
//     time: "12:00",
//     trainer: "Thandeka N.",
//     spots: 15,
//     subtitle: "Indoor cycling to the beat",
//     category: "Spin",
//     details: [
//       "Music-driven intervals",
//       "Climbs, sprints & recoveries",
//       "Low impact, high output",
//       "Clip-in shoes available",
//       "Burns 500–800 kcal",
//     ],
//     duration: "45 min",
//     intensity: "High",
//   },
//   {
//     name: "Boxing Fit",
//     time: "17:00",
//     trainer: "Coach Dlamini",
//     spots: 10,
//     subtitle: "Punch, duck, sweat, repeat",
//     category: "Combat",
//     details: [
//       "Pad work & shadow boxing",
//       "Footwork & defence drills",
//       "Core conditioning rounds",
//       "No experience needed",
//       "Gloves & wraps provided",
//     ],
//     duration: "55 min",
//     intensity: "High",
//   },
//   {
//     name: "Pilates Core",
//     time: "18:30",
//     trainer: "Nomsa K.",
//     spots: 8,
//     subtitle: "Deep core & postural strength",
//     category: "Core",
//     details: [
//       "Mat & reformer principles",
//       "Targets transverse abdominis",
//       "Lumbar spine stabilisation",
//       "Injury rehab friendly",
//       "Small group (max 8)",
//     ],
//     duration: "50 min",
//     intensity: "Low–Medium",
//   },
//   {
//     name: "CrossFit WOD PM",
//     time: "19:00",
//     trainer: "Coach Marcus",
//     spots: 12,
//     subtitle: "Evening WOD — same intensity",
//     category: "CrossFit",
//     details: [
//       "Same WOD as morning session",
//       "Olympic lifting + gymnastics",
//       "Scaled options available",
//       "Community atmosphere",
//       "Track personal records",
//     ],
//     duration: "60 min",
//     intensity: "Very High",
//   },
// ];

// const DAYS = [
//   "Monday",
//   "Tuesday",
//   "Wednesday",
//   "Thursday",
//   "Friday",
//   "Saturday",
//   "Sunday",
// ];

// const intColor = (i: string) =>
//   i.includes("Very")
//     ? "hsl(0 84% 51%)"
//     : i.includes("High")
//       ? "hsl(20 100% 50%)"
//       : i.includes("Medium")
//         ? "hsl(38 92% 44%)"
//         : "hsl(142 72% 37%)";

// export function ClassBooking() {
//   const { user, updateUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [day, setDay] = useState(DAYS[Math.max(0, new Date().getDay() - 1)]);
//   const [expanded, setExpanded] = useState<string | null>(null);
//   const [classBookings, setClassBookings] = useState<
//     Record<string, Record<string, any>>
//   >({});
//   const [showWhoBooked, setShowWhoBooked] = useState<string | null>(null);

//   useEffect(() => {
//     const bookingsRef = ref(db, "class_bookings");
//     const unsub = onValue(bookingsRef, (snap) => {
//       setClassBookings(snap.val() ?? {});
//     });
//     return () => unsub();
//   }, []);

//   if (!user) return null;

//   const tier =
//     user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
//   const discount = tier === "Gold" ? 0.8 : tier === "Silver" ? 0.9 : 1;

//   const classKey = (cls: any) => `${cls.name}_${day}`;
//   const isBooked = (cls: any) => !!classBookings[classKey(cls)]?.[user.uid];
//   const bookedCount = (cls: any) =>
//     Object.keys(classBookings[classKey(cls)] ?? {}).length;
//   const bookedList = (cls: any) =>
//     Object.values(classBookings[classKey(cls)] ?? {});
//   const spotsLeft = (cls: any) => Math.max(0, cls.spots - bookedCount(cls));

//   const book = async (cls: any) => {
//     if (isBooked(cls)) return toast("Already booked!", "error");
//     if (spotsLeft(cls) === 0) return toast("Class is full!", "error");
//     await set(ref(db, `class_bookings/${classKey(cls)}/${user.uid}`), {
//       name: user.name,
//       email: user.email,
//       bookedAt: Date.now(),
//     });
//     const updated = {
//       ...user,
//       bookings: [...user.bookings, { ...cls, date: day }],
//     };
//     await updateUser(updated);
//     logEvent("book_class", { class_name: cls.name, day });
//     toast(`✓ ${cls.name} booked for ${day}`, "success");
//   };

//   const cancel = async (cls: any) => {
//     await set(ref(db, `class_bookings/${classKey(cls)}/${user.uid}`), null);
//     const updated = {
//       ...user,
//       bookings: user.bookings.filter(
//         (b: any) => !(b.name === cls.name && b.date === day),
//       ),
//     };
//     await updateUser(updated);
//     toast("Booking cancelled", "info");
//   };

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle
//         sub={`${tier} member — ${discount < 1 ? `${Math.round((1 - discount) * 100)}% discount active` : "earn points for discounts"}`}
//       >
//         Class <span className="text-primary">Booking</span>
//       </PageTitle>

//       {/* Category colour legend */}
//       <div className="flex gap-2 flex-wrap mb-4">
//         {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
//           <div
//             key={cat}
//             className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
//             style={{
//               background: `${color}18`,
//               color,
//               border: `1px solid ${color}40`,
//             }}
//           >
//             <span
//               className="w-2 h-2 rounded-full inline-block"
//               style={{ background: color }}
//             />
//             {cat}
//           </div>
//         ))}
//       </div>

//       {/* Day tabs */}
//       <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
//         {DAYS.map((d) => (
//           <button
//             key={d}
//             onClick={() => setDay(d)}
//             className={`px-3.5 py-2 border rounded-lg font-body font-bold text-[11px] uppercase tracking-wide cursor-pointer whitespace-nowrap transition-all duration-150 ${
//               d === day
//                 ? "bg-primary text-primary-foreground border-primary"
//                 : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
//             }`}
//           >
//             {isMobile ? d.slice(0, 3) : d}
//           </button>
//         ))}
//       </div>

//       {/* Class cards */}
//       <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
//         {CLASSES.map((cls, i) => {
//           const color = CATEGORY_COLORS[cls.category] ?? "hsl(20 100% 50%)";
//           const booked = isBooked(cls);
//           const open = expanded === cls.name;
//           const left = spotsLeft(cls);
//           const full = left === 0;
//           const bookers = bookedList(cls);
//           const showingWho = showWhoBooked === cls.name;
//           return (
//             <motion.div
//               key={cls.name}
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ delay: i * 0.05 }}
//               className="bg-card border rounded-xl overflow-hidden transition-colors duration-200"
//               style={{
//                 borderColor: open ? color : "hsl(var(--border))",
//                 borderLeft: `3px solid ${color}`,
//               }}
//             >
//               <div className="p-4">
//                 <div className="flex justify-between items-start mb-2">
//                   <div>
//                     <div className="font-display text-[19px] tracking-wide">
//                       {cls.name}
//                     </div>
//                     <div className="text-[11px] text-muted-foreground mt-0.5">
//                       {cls.subtitle}
//                     </div>
//                   </div>
//                   <div className="text-right shrink-0 ml-2">
//                     <div className="font-display text-2xl" style={{ color }}>
//                       {cls.time}
//                     </div>
//                     <div
//                       className={`text-[10px] font-bold ${full ? "text-red-400" : "text-muted-foreground"}`}
//                     >
//                       {full ? "FULL" : `${left}/${cls.spots} spots`}
//                     </div>
//                   </div>
//                 </div>
//                 <div className="flex gap-1.5 flex-wrap mb-2.5">
//                   <Tag color={color}>{cls.category}</Tag>
//                   <Tag color={intColor(cls.intensity)}>{cls.intensity}</Tag>
//                   <Tag color="hsl(0 0% 35%)">⏱ {cls.duration}</Tag>
//                 </div>
//                 <div className="text-[11px] text-muted-foreground mb-3">
//                   👤 {cls.trainer}
//                 </div>
//                 <div className="flex gap-2 items-center flex-wrap">
//                   {booked ? (
//                     <>
//                       <Tag color="hsl(142 72% 37%)">✓ Booked</Tag>
//                       <Btn
//                         variant="subtle"
//                         size="sm"
//                         onClick={() => cancel(cls)}
//                       >
//                         Cancel
//                       </Btn>
//                     </>
//                   ) : (
//                     <Btn
//                       variant="primary"
//                       size="sm"
//                       onClick={() => book(cls)}
//                       disabled={full}
//                     >
//                       {full ? "Full" : "Book Now"}
//                     </Btn>
//                   )}
//                   <button
//                     onClick={() => setExpanded(open ? null : cls.name)}
//                     className="bg-transparent border-none text-muted-foreground text-[11px] cursor-pointer font-body hover:text-foreground transition-colors"
//                   >
//                     {open ? "▲ Less" : "▼ Details"}
//                   </button>
//                   <button
//                     onClick={() =>
//                       setShowWhoBooked(showingWho ? null : cls.name)
//                     }
//                     className="bg-transparent border-none text-muted-foreground text-[11px] cursor-pointer font-body hover:text-foreground transition-colors ml-auto"
//                   >
//                     👥 {bookedCount(cls)}
//                   </button>
//                 </div>
//               </div>

//               {open && (
//                 <motion.div
//                   initial={{ height: 0, opacity: 0 }}
//                   animate={{ height: "auto", opacity: 1 }}
//                   className="bg-secondary border-t border-border px-4 py-3"
//                 >
//                   <div
//                     className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2"
//                     style={{ color }}
//                   >
//                     What's Included
//                   </div>
//                   {cls.details.map((d, di) => (
//                     <div
//                       key={di}
//                       className="flex gap-2 mb-1 text-xs text-muted-foreground"
//                     >
//                       <span style={{ color }}>▸</span>
//                       {d}
//                     </div>
//                   ))}
//                 </motion.div>
//               )}

//               <AnimatePresence>
//                 {showingWho && (
//                   <motion.div
//                     initial={{ height: 0, opacity: 0 }}
//                     animate={{ height: "auto", opacity: 1 }}
//                     exit={{ height: 0, opacity: 0 }}
//                     className="bg-background border-t px-4 py-3"
//                     style={{ borderColor: `${color}40` }}
//                   >
//                     <div
//                       className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2"
//                       style={{ color }}
//                     >
//                       Booked ({bookers.length}/{cls.spots})
//                     </div>
//                     {bookers.length === 0 ? (
//                       <div className="text-xs text-muted-foreground">
//                         No bookings yet — be first!
//                       </div>
//                     ) : (
//                       <div className="flex flex-col gap-1">
//                         {bookers.map((b: any, bi: number) => (
//                           <div
//                             key={bi}
//                             className="flex items-center gap-2 text-xs"
//                           >
//                             <div
//                               className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0"
//                               style={{ background: color }}
//                             >
//                               {b.name?.[0] ?? "?"}
//                             </div>
//                             <span className="text-foreground font-medium">
//                               {b.name}
//                             </span>
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </motion.div>
//           );
//         })}
//       </div>

//       {user.bookings.length > 0 && (
//         <div className="mk2-card mt-7">
//           <div className="font-bold text-sm mb-3">
//             Your Bookings ({user.bookings.length})
//           </div>
//           {user.bookings.map((b: any, i: number) => {
//             const bColor = CATEGORY_COLORS[b.category] ?? "hsl(20 100% 50%)";
//             return (
//               <div
//                 key={i}
//                 className="flex justify-between items-center px-3 py-2 rounded-lg mb-1.5 text-xs flex-wrap gap-1.5"
//                 style={{
//                   background: `${bColor}10`,
//                   border: `1px solid ${bColor}30`,
//                 }}
//               >
//                 <span className="font-bold" style={{ color: bColor }}>
//                   {b.name}
//                 </span>
//                 <span className="text-muted-foreground">{b.date}</span>
//                 <span className="text-muted-foreground">
//                   {b.time} · {b.trainer}
//                 </span>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }
