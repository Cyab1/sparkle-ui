import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent, db } from "@/lib/firebase";
import { ref, onValue, set, push } from "firebase/database";
import { Btn } from "@/components/shared/Btn";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion, AnimatePresence } from "framer-motion";

// ── Only MK2R categories ──────────────────────────────────────────────────────
export const CATEGORY_COLORS: Record<string, string> = {
  Crossfit: "hsl(20 100% 50%)",
  Gymnastics: "hsl(263 85% 58%)",
  Strength: "hsl(38 92% 44%)",
  "Olympic Lifting": "hsl(217 91% 53%)",
  "Saturday Smasher": "hsl(142 72% 37%)",
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
    spots: 20,
    subtitle: "Workout of the Day",
    category: "Crossfit",
    details: [
      "Daily programmed WOD",
      "Olympic lifting + gymnastics",
      "Scaled options available",
    ],
    duration: "60 min",
    intensity: "Very High",
    price: 250,
    chargeNonMembers: true,
  },
  {
    name: "Strength Circuit",
    time: "09:00",
    trainer: "Coach Busi",
    spots: 20,
    subtitle: "Full-body resistance training",
    category: "Strength",
    details: [
      "5 stations × 4 rounds",
      "Barbell, dumbbell & bodyweight",
      "Progressive overload",
    ],
    duration: "60 min",
    intensity: "Medium–High",
    price: 250,
    chargeNonMembers: true,
  },
  {
    name: "Gymnastics",
    time: "10:00",
    trainer: "Coach Nomsa",
    spots: 20,
    subtitle: "Movement & bodyweight skills",
    category: "Gymnastics",
    details: [
      "Handstands & ring work",
      "Pull-ups & muscle-ups",
      "All skill levels welcome",
    ],
    duration: "60 min",
    intensity: "Medium–High",
    price: 250,
    chargeNonMembers: true,
  },
  {
    name: "Olympic Lifting",
    time: "17:00",
    trainer: "Coach Dlamini",
    spots: 20,
    subtitle: "Snatch & clean and jerk",
    category: "Olympic Lifting",
    details: [
      "Technique-focused sessions",
      "Progressive loading",
      "Comp & scaled weights",
    ],
    duration: "60 min",
    intensity: "High",
    price: 250,
    chargeNonMembers: true,
  },
  {
    name: "Saturday Smasher",
    time: "08:00",
    trainer: "Coach Marcus",
    spots: 20,
    subtitle: "Weekend community WOD",
    category: "Saturday Smasher",
    details: [
      "Partner & team workouts",
      "Fun competitive format",
      "All levels welcome",
    ],
    duration: "60 min",
    intensity: "High",
    price: 250,
    chargeNonMembers: true,
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

// ─── TIMEZONE-SAFE date helpers ───────────────────────────────────────────────
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function getDayName(date: Date): string {
  return DAYS[[6, 0, 1, 2, 3, 4, 5][date.getDay()]];
}
export function safeKey(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, "_");
}
export function buildBookingKey(className: string, dateKey: string): string {
  return `${safeKey(className)}_${dateKey}`;
}

// ── TIME VALIDATION helper ───────────────────────────────────────────────────
function isClassTimePassed(classTime: string, selectedDate: Date): boolean {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(selectedDate);
  selected.setHours(0, 0, 0, 0);
  if (selected.getTime() !== today.getTime()) return false;
  const [hourStr, minuteStr] = classTime.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  if (hour < currentHour) return true;
  if (hour === currentHour && minute < currentMinute) return true;
  return false;
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
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />{" "}
          Booked
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded ring-1 ring-orange-500 inline-block" />{" "}
          Today
        </div>
      </div>
    </div>
  );
}

// ── WOD Panel — collapsible dropdown ─────────────────────────────────────────
function WodPanel({ cls, color }: { cls: any; color: string }) {
  const [open, setOpen] = useState(false);
  const wod: string = String(cls.wod ?? "").trim();
  if (!wod) return null;
  const lines = wod.split("\n");

  return (
    <div className="mt-3 rounded-xl border border-border overflow-hidden">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition-colors hover:bg-secondary"
        style={{
          background: "hsl(var(--secondary))",
          color,
          border: "none",
          cursor: "pointer",
        }}
      >
        <span className="flex items-center gap-2">
          <span>📋</span>
          <span>View Today's WOD</span>
        </span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>
          {open ? "▲ Hide" : "▼ Show"}
        </span>
      </button>

      {/* Collapsible content */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-3 pb-3 pt-2 text-xs leading-relaxed bg-background">
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
                      (t === t.toUpperCase() &&
                        t.length < 40 &&
                        /[A-Z]/.test(t)));
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
                      <div
                        key={i}
                        className="text-[10px] text-muted-foreground italic"
                      >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
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
  const [processingPayment, setProcessingPayment] = useState(false);

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

  const dayClasses = CLASSES.filter((cls) => {
    if (adminClasses.length > 0) {
      if (cls.scheduleType === "date") return cls.specificDate === dateKey;
      return cls.day === dayName;
    }
    return true;
  });

  const bKey = (cls: any) => buildBookingKey(cls.name, dateKey);
  const isBooked = (cls: any): boolean =>
    !!classBookings[bKey(cls)]?.[user.uid];
  const bookedCount = (cls: any): number =>
    Object.keys(classBookings[bKey(cls)] ?? {}).length;
  const bookedList = (cls: any): any[] =>
    Object.values(classBookings[bKey(cls)] ?? {});
  const spotsLeft = (cls: any): number =>
    Math.max(0, Number(cls.spots || 20) - bookedCount(cls));

  const bookedDates = new Set<string>(
    user.bookings.map((b: any) => b.dateKey).filter(Boolean),
  );

  const isMember = user.membership === "silver" || user.membership === "gold";

  // ── Determine if this class is chargeable for non-members ────────────────
  const isChargeable = (cls: any): boolean =>
    Boolean(cls.chargeNonMembers) && Number(cls.price) > 0;

  // ── Member: free booking ──────────────────────────────────────────────────
  const bookFree = async (cls: any) => {
    if (isBooked(cls))
      return toast("You're already booked for this class!", "error");
    if (spotsLeft(cls) === 0) return toast("This class is full!", "error");

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

    await updateUser({ ...user, bookings: newBookings });
    logEvent("book_class", { class_name: cls.name, date: dateKey });
    toast(`✓ ${cls.name} booked!`, "success");
  };

  // ── Non‑member: PayFast redirect ─────────────────────────────────────────
  const initiatePayFast = async (cls: any) => {
    if (isBooked(cls))
      return toast("You're already booked for this class!", "error");
    if (spotsLeft(cls) === 0) return toast("This class is full!", "error");
    setProcessingPayment(true);

    try {
      const pendingBookingRef = push(ref(db, "mk2_bookings"));
      const bookingId = pendingBookingRef.key;
      const price = cls.price || 250;

      await set(pendingBookingRef, {
        userId: user.uid,
        classId: cls.id || cls.name,
        className: cls.name,
        dateKey,
        dateDisplay: selectedDate.toLocaleDateString("en-ZA", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        time: cls.time,
        price,
        status: "pending_payment",
        createdAt: Date.now(),
      });

      const PAYFAST_MERCHANT_ID = "10000100";
      const PAYFAST_MERCHANT_KEY = "46f0cd694581a";
      const PAYFAST_BASE = "https://sandbox.payfast.co.za/eng/process";

      const formData = {
        merchant_id: PAYFAST_MERCHANT_ID,
        merchant_key: PAYFAST_MERCHANT_KEY,
        return_url: `${window.location.origin}/booking-success?bookingId=${bookingId}`,
        cancel_url: `${window.location.origin}/booking-cancel`,
        notify_url: `${window.location.origin}/api/payfast-webhook`,
        amount: price.toFixed(2),
        item_name: `${cls.name} - ${selectedDate.toLocaleDateString("en-ZA")}`,
        custom_str1: bookingId,
        email_address: user.email,
        name_first: user.name.split(" ")[0],
        name_last: user.name.split(" ").slice(1).join(" ") || "-",
      };

      const form = document.createElement("form");
      form.method = "POST";
      form.action = PAYFAST_BASE;
      for (const [k, v] of Object.entries(formData)) {
        const input = document.createElement("input");
        input.name = k;
        input.value = v as string;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error(err);
      toast("Payment initiation failed. Please try again.", "error");
      setProcessingPayment(false);
    }
  };

  const cancel = async (cls: any) => {
    if (
      !confirm(
        `Cancel ${cls.name} on ${selectedDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}?`,
      )
    )
      return;

    await set(ref(db, `class_bookings/${bKey(cls)}/${user.uid}`), null);
    await updateUser({
      ...user,
      bookings: user.bookings.filter(
        (b: any) => !(b.name === cls.name && b.dateKey === dateKey),
      ),
    });
    toast("Booking cancelled.", "info");
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
        sub={
          isMember
            ? "Book your classes below"
            : "Non-members pay per class · Upgrade to unlock unlimited bookings"
        }
      >
        Class <span className="text-primary">Booking</span>
      </PageTitle>

      {/* ── Non-member banner ─────────────────────────────────────────────── */}
      {!isMember && (
        <div
          className="mb-5 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-3"
          style={{
            background: "hsl(20 100% 50% / 0.1)",
            border: "1px solid hsl(20 100% 50% / 0.3)",
          }}
        >
          <div>
            <div className="font-bold text-sm">💪 Pay per class</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Members book all classes · Non-members pay per session via
              PayFast.
            </div>
          </div>
          <button
            onClick={() => setPage?.("Membership")}
            className="px-4 py-2 rounded-lg text-xs font-bold border-none cursor-pointer"
            style={{ background: "hsl(20 100% 50%)", color: "#000" }}
          >
            Upgrade to Membership →
          </button>
        </div>
      )}

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

      {/* ── Category legend ───────────────────────────────────────────────── */}
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
            Select another date or check back later.
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
            const hasWod = String(cls.wod ?? "").trim().length > 0;
            const isPassed = isClassTimePassed(cls.time, selectedDate);
            const chargeable = isChargeable(cls);

            // ── Button label & action logic ───────────────────────────────
            const bookLabel = full
              ? "Class Full"
              : isPassed
                ? "Class Passed"
                : isMember
                  ? "Book"
                  : chargeable
                    ? `Pay R${Number(cls.price).toFixed(0)} →`
                    : "Book";

            const handleBook = () => {
              if (isMember || !chargeable) {
                bookFree(cls);
              } else {
                initiatePayFast(cls);
              }
            };

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
                  {/* Header row */}
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
                      {/* Price badge for non-members only */}
                      {!isMember &&
                        !booked &&
                        !full &&
                        !isPassed &&
                        chargeable && (
                          <div
                            className="text-[11px] font-bold mt-1"
                            style={{ color }}
                          >
                            R{Number(cls.price).toFixed(0)}
                          </div>
                        )}
                      {isPassed && !booked && (
                        <div className="text-[10px] font-bold mt-1 text-red-400">
                          Class passed
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
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

                  {/* WOD — collapsible dropdown, hidden by default */}
                  {hasWod && <WodPanel cls={cls} color={color} />}

                  {/* Action row */}
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
                        variant={!full && !isPassed ? "primary" : "subtle"}
                        size="sm"
                        onClick={handleBook}
                        disabled={full || isPassed || processingPayment}
                      >
                        {bookLabel}
                      </Btn>
                    )}

                    {/* Details dropdown — only when no WOD */}
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

                {/* Details panel — only when no WOD */}
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
                        <span style={{ color }}>▸</span> {d}
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Who's booked panel */}
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

      {/* ── Upcoming bookings ─────────────────────────────────────────────── */}
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
// import { ref, onValue, set, push } from "firebase/database";
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

// const DAYS = [
//   "Monday",
//   "Tuesday",
//   "Wednesday",
//   "Thursday",
//   "Friday",
//   "Saturday",
//   "Sunday",
// ];
// const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
//     price: 150, // ZAR
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
//     price: 120,
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
//     price: 120,
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
//     price: 120,
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
//     price: 120,
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
//     price: 120,
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
//     price: 150,
//   },
// ];

// const intColor = (i: string) =>
//   i.includes("Very")
//     ? "hsl(0 84% 51%)"
//     : i.includes("High")
//       ? "hsl(20 100% 50%)"
//       : i.includes("Medium")
//         ? "hsl(38 92% 44%)"
//         : "hsl(142 72% 37%)";

// // ─── TIMEZONE-SAFE date helpers ───────────────────────────────────────────────
// export function formatDateKey(date: Date): string {
//   const y = date.getFullYear();
//   const m = String(date.getMonth() + 1).padStart(2, "0");
//   const d = String(date.getDate()).padStart(2, "0");
//   return `${y}-${m}-${d}`;
// }
// export function parseDateKey(key: string): Date {
//   const [y, m, d] = key.split("-").map(Number);
//   return new Date(y, m - 1, d);
// }
// export function getDayName(date: Date): string {
//   return DAYS[[6, 0, 1, 2, 3, 4, 5][date.getDay()]];
// }
// export function safeKey(str: string): string {
//   return str.replace(/[^a-zA-Z0-9_-]/g, "_");
// }
// export function buildBookingKey(className: string, dateKey: string): string {
//   return `${safeKey(className)}_${dateKey}`;
// }

// // ── Mini Calendar ─────────────────────────────────────────────────────────────
// function MiniCalendar({
//   selectedDate,
//   onSelect,
//   bookedDates,
// }: {
//   selectedDate: Date;
//   onSelect: (d: Date) => void;
//   bookedDates: Set<string>;
// }) {
//   const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
//   const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
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
//     <div className="mk2-card mb-5" style={{ maxWidth: 320 }}>
//       <div className="flex items-center justify-between mb-2">
//         <button
//           onClick={prevMonth}
//           className="text-muted-foreground hover:text-foreground w-7 h-7 flex items-center justify-center rounded transition-colors"
//         >
//           ←
//         </button>
//         <span className="font-bold text-xs">
//           {MONTH_NAMES[viewMonth]} {viewYear}
//         </span>
//         <button
//           onClick={nextMonth}
//           className="text-muted-foreground hover:text-foreground w-7 h-7 flex items-center justify-center rounded transition-colors"
//         >
//           →
//         </button>
//       </div>
//       <div className="grid grid-cols-7 mb-0.5">
//         {DAY_NAMES.map((d) => (
//           <div
//             key={d}
//             className="text-center text-[9px] font-bold text-muted-foreground py-0.5"
//           >
//             {d}
//           </div>
//         ))}
//       </div>
//       <div className="grid grid-cols-7 gap-0.5">
//         {cells.map((day, i) => {
//           if (!day) return <div key={i} />;
//           const date = new Date(viewYear, viewMonth, day);
//           date.setHours(0, 0, 0, 0);
//           const key = formatDateKey(date);
//           const isPast = date < today;
//           const isToday = date.getTime() === today.getTime();
//           const isSel = formatDateKey(selectedDate) === key;
//           const hasBkg = bookedDates.has(key);
//           return (
//             <button
//               key={i}
//               onClick={() =>
//                 !isPast && onSelect(new Date(viewYear, viewMonth, day))
//               }
//               disabled={isPast}
//               className={[
//                 "relative w-full aspect-square rounded text-[11px] font-semibold transition-all flex flex-col items-center justify-center leading-none",
//                 isPast
//                   ? "opacity-20 cursor-not-allowed"
//                   : "cursor-pointer hover:bg-secondary",
//                 isSel ? "bg-orange-500 text-black" : "",
//                 isToday && !isSel
//                   ? "ring-1 ring-orange-500 text-orange-500"
//                   : "",
//               ].join(" ")}
//             >
//               {day}
//               {hasBkg && !isSel && (
//                 <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
//               )}
//             </button>
//           );
//         })}
//       </div>
//       <div className="flex gap-3 mt-2 text-[9px] text-muted-foreground">
//         <div className="flex items-center gap-1">
//           <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
//           Booked
//         </div>
//         <div className="flex items-center gap-1">
//           <span className="w-3 h-3 rounded ring-1 ring-orange-500 inline-block" />
//           Today
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── WOD Panel ─────────────────────────────────────────────────────────────────
// function WodPanel({ cls, color }: { cls: any; color: string }) {
//   const wod: string = String(cls.wod ?? "").trim();
//   if (!wod) return null;
//   const lines = wod.split("\n");
//   return (
//     <div className="mt-3 rounded-xl p-3 text-xs leading-relaxed border border-border bg-background">
//       <div className="mb-2 pb-2 border-b border-border">
//         <div className="font-bold text-sm">{cls.trainer}</div>
//         <div className="text-[11px]" style={{ color }}>
//           {cls.category}
//         </div>
//       </div>
//       <div>
//         {lines.map((line, i) => {
//           const t = line.trim();
//           if (!t) return <div key={i} className="h-1.5" />;
//           const isPart = /^part\s/i.test(t);
//           const isHeader =
//             !isPart &&
//             (t.endsWith(":") ||
//               (t === t.toUpperCase() && t.length < 40 && /[A-Z]/.test(t)));
//           const isWeight = /^(comp|scaled|beg|rx)\s*:/i.test(t);
//           if (isPart)
//             return (
//               <div key={i} className="font-bold mt-2" style={{ color }}>
//                 {t}
//               </div>
//             );
//           if (isHeader)
//             return (
//               <div key={i} className="font-bold text-foreground mt-1">
//                 {t}
//               </div>
//             );
//           if (isWeight)
//             return (
//               <div key={i} className="text-[10px] text-muted-foreground italic">
//                 {t}
//               </div>
//             );
//           return (
//             <div key={i} className="text-muted-foreground">
//               {t}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// // ── Main Component ────────────────────────────────────────────────────────────
// export function ClassBooking({ setPage }: { setPage?: (p: string) => void }) {
//   const { user, updateUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   const [selectedDate, setSelectedDate] = useState<Date>(new Date(today));
//   const [expanded, setExpanded] = useState<string | null>(null);
//   const [showWhoBooked, setShowWhoBooked] = useState<string | null>(null);
//   const [classBookings, setClassBookings] = useState<
//     Record<string, Record<string, any>>
//   >({});
//   const [adminClasses, setAdminClasses] = useState<any[]>([]);
//   const [loadingClasses, setLoadingClasses] = useState(true);
//   const [processingPayment, setProcessingPayment] = useState(false);

//   useEffect(() => {
//     return onValue(ref(db, "admin_classes"), (snap) => {
//       if (snap.exists()) {
//         const list = Object.entries(snap.val())
//           .map(([id, val]: [string, any]) => ({ id, ...val }))
//           .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
//         setAdminClasses(list);
//       } else setAdminClasses([]);
//       setLoadingClasses(false);
//     });
//   }, []);

//   useEffect(() => {
//     return onValue(ref(db, "class_bookings"), (snap) =>
//       setClassBookings(snap.val() ?? {}),
//     );
//   }, []);

//   if (!user) return null;

//   const dateKey = formatDateKey(selectedDate);
//   const dayName = getDayName(selectedDate);
//   const CLASSES = adminClasses.length > 0 ? adminClasses : FALLBACK_CLASSES;

//   const dayClasses = CLASSES.filter((cls) => {
//     if (adminClasses.length > 0) {
//       if (cls.scheduleType === "date") return cls.specificDate === dateKey;
//       return cls.day === dayName;
//     }
//     return true;
//   });

//   const bKey = (cls: any) => buildBookingKey(cls.name, dateKey);

//   const isBooked = (cls: any): boolean =>
//     !!classBookings[bKey(cls)]?.[user.uid];
//   const bookedCount = (cls: any): number =>
//     Object.keys(classBookings[bKey(cls)] ?? {}).length;
//   const bookedList = (cls: any): any[] =>
//     Object.values(classBookings[bKey(cls)] ?? {});
//   const spotsLeft = (cls: any): number =>
//     Math.max(0, Number(cls.spots || 12) - bookedCount(cls));

//   const bookedDates = new Set<string>(
//     user.bookings.map((b: any) => b.dateKey).filter(Boolean),
//   );

//   const isMember = user.membership === "silver" || user.membership === "gold";

//   // ── Member: free booking ──────────────────────────────────────────────────
//   const bookFree = async (cls: any) => {
//     if (isBooked(cls))
//       return toast("You're already booked for this class!", "error");
//     if (spotsLeft(cls) === 0) return toast("This class is full!", "error");

//     await set(ref(db, `class_bookings/${bKey(cls)}/${user.uid}`), {
//       name: user.name,
//       email: user.email,
//       bookedAt: Date.now(),
//     });

//     const already = user.bookings.some(
//       (b: any) => b.name === cls.name && b.dateKey === dateKey,
//     );
//     const newBookings = already
//       ? user.bookings
//       : [
//           ...user.bookings,
//           {
//             ...cls,
//             dateKey,
//             date: dayName,
//             displayDate: selectedDate.toLocaleDateString("en-ZA", {
//               weekday: "short",
//               day: "numeric",
//               month: "short",
//             }),
//           },
//         ];

//     await updateUser({
//       ...user,
//       bookings: newBookings,
//     });

//     logEvent("book_class", { class_name: cls.name, date: dateKey });
//     toast(`✓ ${cls.name} booked!`, "success");
//   };

//   // ── Non‑member: PayFlow redirect ─────────────────────────────────────────
//   const initiatePayFast = async (cls: any) => {
//     if (isBooked(cls))
//       return toast("You're already booked for this class!", "error");
//     if (spotsLeft(cls) === 0) return toast("This class is full!", "error");
//     setProcessingPayment(true);

//     try {
//       // Create pending booking record
//       const pendingBookingRef = push(ref(db, "mk2_bookings"));
//       const bookingId = pendingBookingRef.key;
//       const price = cls.price || 150; // default R150 if not set

//       await set(pendingBookingRef, {
//         userId: user.uid,
//         classId: cls.id || cls.name,
//         className: cls.name,
//         dateKey,
//         dateDisplay: selectedDate.toLocaleDateString("en-ZA", {
//           weekday: "long",
//           day: "numeric",
//           month: "long",
//         }),
//         time: cls.time,
//         price,
//         status: "pending_payment",
//         createdAt: Date.now(),
//       });

//       // PayFast sandbox – use environment variables in production
//       const PAYFAST_MERCHANT_ID = "10000100";
//       const PAYFAST_MERCHANT_KEY = "46f0cd694581a";
//       const PAYFAST_BASE = "https://sandbox.payfast.co.za/eng/process";

//       const formData = {
//         merchant_id: PAYFAST_MERCHANT_ID,
//         merchant_key: PAYFAST_MERCHANT_KEY,
//         return_url: `${window.location.origin}/booking-success?bookingId=${bookingId}`,
//         cancel_url: `${window.location.origin}/booking-cancel`,
//         notify_url: `${window.location.origin}/api/payfast-webhook`, // your Cloud Function URL
//         amount: price.toFixed(2),
//         item_name: `${cls.name} - ${selectedDate.toLocaleDateString("en-ZA")}`,
//         custom_str1: bookingId,
//         email_address: user.email,
//         name_first: user.name.split(" ")[0],
//         name_last: user.name.split(" ").slice(1).join(" ") || "-",
//       };

//       // Submit POST form to PayFast
//       const form = document.createElement("form");
//       form.method = "POST";
//       form.action = PAYFAST_BASE;
//       for (const [k, v] of Object.entries(formData)) {
//         const input = document.createElement("input");
//         input.name = k;
//         input.value = v as string;
//         form.appendChild(input);
//       }
//       document.body.appendChild(form);
//       form.submit();
//     } catch (err) {
//       console.error(err);
//       toast("Payment initiation failed. Please try again.", "error");
//       setProcessingPayment(false);
//     }
//   };

//   const cancel = async (cls: any) => {
//     if (
//       !confirm(
//         `Cancel ${cls.name} on ${selectedDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}?`,
//       )
//     )
//       return;

//     await set(ref(db, `class_bookings/${bKey(cls)}/${user.uid}`), null);

//     await updateUser({
//       ...user,
//       bookings: user.bookings.filter(
//         (b: any) => !(b.name === cls.name && b.dateKey === dateKey),
//       ),
//     });

//     toast("Booking cancelled.", "info");
//   };

//   const displayDate = selectedDate.toLocaleDateString("en-ZA", {
//     weekday: "long",
//     day: "numeric",
//     month: "long",
//     year: "numeric",
//   });

//   const upcomingBookings = user.bookings
//     .filter((b: any) => b.dateKey && parseDateKey(b.dateKey) >= today)
//     .sort((a: any, bk: any) =>
//       (a.dateKey || "").localeCompare(bk.dateKey || ""),
//     );

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle
//         sub={isMember ? "Book classes for free" : "Pay per class via PayFast"}
//       >
//         Class <span className="text-primary">Booking</span>
//       </PageTitle>

//       {!isMember && (
//         <div
//           className="mb-5 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-3"
//           style={{
//             background: "hsl(20 100% 50% / 0.1)",
//             border: "1px solid hsl(20 100% 50% / 0.3)",
//           }}
//         >
//           <div>
//             <div className="font-bold text-sm">🚫 No credits needed</div>
//             <div className="text-xs text-muted-foreground mt-0.5">
//               Members book free. Non‑members pay per class.
//             </div>
//           </div>
//           <button
//             onClick={() => setPage?.("Membership")}
//             className="px-4 py-2 rounded-lg text-xs font-bold border-none cursor-pointer"
//             style={{ background: "hsl(20 100% 50%)", color: "#000" }}
//           >
//             Upgrade to Membership →
//           </button>
//         </div>
//       )}

//       <MiniCalendar
//         selectedDate={selectedDate}
//         onSelect={(d) => {
//           setSelectedDate(d);
//           setExpanded(null);
//           setShowWhoBooked(null);
//         }}
//         bookedDates={bookedDates}
//       />

//       <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
//         <div>
//           <div className="font-bold text-base">{displayDate}</div>
//           <div className="text-xs text-muted-foreground">
//             {dayClasses.length} {dayClasses.length === 1 ? "class" : "classes"}{" "}
//             available
//           </div>
//         </div>
//         {adminClasses.length > 0 && (
//           <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
//             <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
//             Live schedule
//           </div>
//         )}
//       </div>

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

//       {loadingClasses ? (
//         <div className="text-center py-12 text-muted-foreground text-sm">
//           Loading classes…
//         </div>
//       ) : dayClasses.length === 0 ? (
//         <div className="mk2-card flex flex-col items-center justify-center py-16 gap-3 text-center">
//           <span className="text-4xl">🗓</span>
//           <p className="font-bold text-sm">
//             No classes scheduled for {dayName}
//           </p>
//           <p className="text-xs text-muted-foreground">
//             Select another date or check back later.
//           </p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
//           {dayClasses.map((cls, i) => {
//             const color = CATEGORY_COLORS[cls.category] ?? "hsl(20 100% 50%)";
//             const booked = isBooked(cls);
//             const open = expanded === cls.name;
//             const left = spotsLeft(cls);
//             const full = left === 0 && !booked;
//             const bookers = bookedList(cls);
//             const showingWho = showWhoBooked === cls.name;
//             const details = Array.isArray(cls.details) ? cls.details : [];
//             const hasWod = String(cls.wod ?? "").trim().length > 0;

//             return (
//               <motion.div
//                 key={`${cls.name}_${i}`}
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ delay: i * 0.05 }}
//                 className="bg-card border rounded-xl overflow-hidden"
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
//                         {booked ? (
//                           <span className="text-green-400">✓ You're in</span>
//                         ) : full ? (
//                           "FULL"
//                         ) : (
//                           `${left}/${cls.spots} spots`
//                         )}
//                       </div>
//                       {!isMember && !booked && !full && (
//                         <div
//                           className="text-[11px] font-bold mt-1"
//                           style={{ color }}
//                         >
//                           R{cls.price || 150}
//                         </div>
//                       )}
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

//                   <div className="text-[11px] text-muted-foreground mb-2">
//                     👤 {cls.trainer}
//                   </div>

//                   {hasWod && <WodPanel cls={cls} color={color} />}

//                   <div className="flex gap-2 items-center flex-wrap mt-3">
//                     {booked ? (
//                       <>
//                         <span
//                           className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
//                           style={{
//                             background: "hsl(142 72% 37% / 0.15)",
//                             color: "hsl(142 72% 37%)",
//                             border: "1px solid hsl(142 72% 37% / 0.3)",
//                           }}
//                         >
//                           ✓ Booked
//                         </span>
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
//                         variant={!full ? "primary" : "subtle"}
//                         size="sm"
//                         onClick={() =>
//                           isMember ? bookFree(cls) : initiatePayFast(cls)
//                         }
//                         disabled={full || processingPayment}
//                       >
//                         {full
//                           ? "Class Full"
//                           : isMember
//                             ? "Book Free"
//                             : `Pay R${cls.price || 150} →`}
//                       </Btn>
//                     )}

//                     {!hasWod && details.length > 0 && (
//                       <button
//                         onClick={() => setExpanded(open ? null : cls.name)}
//                         className="text-muted-foreground text-[11px] bg-transparent border-none cursor-pointer hover:text-foreground transition-colors"
//                       >
//                         {open ? "▲ Less" : "▼ Details"}
//                       </button>
//                     )}

//                     <button
//                       onClick={() =>
//                         setShowWhoBooked(showingWho ? null : cls.name)
//                       }
//                       className="text-muted-foreground text-[11px] bg-transparent border-none cursor-pointer hover:text-foreground transition-colors ml-auto"
//                     >
//                       👥 {bookedCount(cls)}
//                     </button>
//                   </div>
//                 </div>

//                 {open && !hasWod && details.length > 0 && (
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
//                         <span style={{ color }}>▸</span> {d}
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
//                                 className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
//                                 style={{ background: color }}
//                               >
//                                 {b.name?.[0] ?? "?"}
//                               </div>
//                               <span className="font-medium">{b.name}</span>
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

//       {upcomingBookings.length > 0 && (
//         <div className="mk2-card mt-7">
//           <div className="font-bold text-sm mb-3">
//             Your Upcoming Bookings ({upcomingBookings.length})
//           </div>
//           {upcomingBookings.map((b: any, i: number) => {
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
//                 <span className="text-muted-foreground">
//                   {b.displayDate || b.dateKey}
//                 </span>
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
