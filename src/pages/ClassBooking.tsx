import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent, db } from "@/lib/firebase";
import { ref, onValue, set } from "firebase/database";
import { Btn } from "@/components/shared/Btn";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion, AnimatePresence } from "framer-motion";

// MK2R: Category colour codes — consistent across the whole app
export const CATEGORY_COLORS: Record<string, string> = {
  CrossFit: "hsl(20 100% 50%)", // MK2R orange
  Cardio: "hsl(0 84% 51%)", // red
  Strength: "hsl(38 92% 44%)", // amber
  Combat: "hsl(15 90% 50%)", // red-orange
  Core: "hsl(142 72% 37%)", // green
  Spin: "hsl(217 91% 53%)", // blue
  Flexibility: "hsl(263 85% 58%)", // purple
  Recovery: "hsl(187 85% 40%)", // teal
};

const CLASSES = [
  {
    name: "CrossFit WOD",
    time: "05:30",
    trainer: "Coach Marcus",
    spots: 12,
    subtitle: "Workout of the Day — go hard",
    category: "CrossFit",
    details: [
      "Daily programmed WOD",
      "Olympic lifting + gymnastics",
      "Scaled options available",
      "Community atmosphere",
      "Track personal records",
    ],
    duration: "60 min",
    intensity: "Very High",
  },
  {
    name: "HIIT Blast",
    time: "06:00",
    trainer: "Coach Sipho",
    spots: 8,
    subtitle: "High-intensity interval training",
    category: "Cardio",
    details: [
      "10 rounds Tabata circuits",
      "Kettlebell swings & burpees",
      "Heart rate zones 3–5",
      "Burns 400–600 kcal",
      "All fitness levels welcome",
    ],
    duration: "45 min",
    intensity: "High",
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
      "Progressive overload focus",
      "Builds lean muscle mass",
      "Intermediate–Advanced",
    ],
    duration: "50 min",
    intensity: "Medium–High",
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
      "Low impact, high output",
      "Clip-in shoes available",
      "Burns 500–800 kcal",
    ],
    duration: "45 min",
    intensity: "High",
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
      "Core conditioning rounds",
      "No experience needed",
      "Gloves & wraps provided",
    ],
    duration: "55 min",
    intensity: "High",
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
      "Targets transverse abdominis",
      "Lumbar spine stabilisation",
      "Injury rehab friendly",
      "Small group (max 8)",
    ],
    duration: "50 min",
    intensity: "Low–Medium",
  },
  {
    name: "CrossFit WOD PM",
    time: "19:00",
    trainer: "Coach Marcus",
    spots: 12,
    subtitle: "Evening WOD — same intensity",
    category: "CrossFit",
    details: [
      "Same WOD as morning session",
      "Olympic lifting + gymnastics",
      "Scaled options available",
      "Community atmosphere",
      "Track personal records",
    ],
    duration: "60 min",
    intensity: "Very High",
  },
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const intColor = (i: string) =>
  i.includes("Very")
    ? "hsl(0 84% 51%)"
    : i.includes("High")
      ? "hsl(20 100% 50%)"
      : i.includes("Medium")
        ? "hsl(38 92% 44%)"
        : "hsl(142 72% 37%)";

export function ClassBooking() {
  const { user, updateUser, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const [day, setDay] = useState(DAYS[Math.max(0, new Date().getDay() - 1)]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [classBookings, setClassBookings] = useState<
    Record<string, Record<string, any>>
  >({});
  const [showWhoBooked, setShowWhoBooked] = useState<string | null>(null);

  useEffect(() => {
    const bookingsRef = ref(db, "class_bookings");
    const unsub = onValue(bookingsRef, (snap) => {
      setClassBookings(snap.val() ?? {});
    });
    return () => unsub();
  }, []);

  if (!user) return null;

  const tier =
    user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
  const discount = tier === "Gold" ? 0.8 : tier === "Silver" ? 0.9 : 1;

  const classKey = (cls: any) => `${cls.name}_${day}`;
  const isBooked = (cls: any) => !!classBookings[classKey(cls)]?.[user.uid];
  const bookedCount = (cls: any) =>
    Object.keys(classBookings[classKey(cls)] ?? {}).length;
  const bookedList = (cls: any) =>
    Object.values(classBookings[classKey(cls)] ?? {});
  const spotsLeft = (cls: any) => Math.max(0, cls.spots - bookedCount(cls));

  const book = async (cls: any) => {
    if (isBooked(cls)) return toast("Already booked!", "error");
    if (spotsLeft(cls) === 0) return toast("Class is full!", "error");
    await set(ref(db, `class_bookings/${classKey(cls)}/${user.uid}`), {
      name: user.name,
      email: user.email,
      bookedAt: Date.now(),
    });
    const updated = {
      ...user,
      bookings: [...user.bookings, { ...cls, date: day }],
    };
    await updateUser(updated);
    logEvent("book_class", { class_name: cls.name, day });
    toast(`✓ ${cls.name} booked for ${day}`, "success");
  };

  const cancel = async (cls: any) => {
    await set(ref(db, `class_bookings/${classKey(cls)}/${user.uid}`), null);
    const updated = {
      ...user,
      bookings: user.bookings.filter(
        (b: any) => !(b.name === cls.name && b.date === day),
      ),
    };
    await updateUser(updated);
    toast("Booking cancelled", "info");
  };

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle
        sub={`${tier} member — ${discount < 1 ? `${Math.round((1 - discount) * 100)}% discount active` : "earn points for discounts"}`}
      >
        Class <span className="text-primary">Booking</span>
      </PageTitle>

      {/* Category colour legend */}
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

      {/* Day tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`px-3.5 py-2 border rounded-lg font-body font-bold text-[11px] uppercase tracking-wide cursor-pointer whitespace-nowrap transition-all duration-150 ${
              d === day
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {isMobile ? d.slice(0, 3) : d}
          </button>
        ))}
      </div>

      {/* Class cards */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
        {CLASSES.map((cls, i) => {
          const color = CATEGORY_COLORS[cls.category] ?? "hsl(20 100% 50%)";
          const booked = isBooked(cls);
          const open = expanded === cls.name;
          const left = spotsLeft(cls);
          const full = left === 0;
          const bookers = bookedList(cls);
          const showingWho = showWhoBooked === cls.name;
          return (
            <motion.div
              key={cls.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border rounded-xl overflow-hidden transition-colors duration-200"
              style={{
                borderColor: open ? color : "hsl(var(--border))",
                borderLeft: `3px solid ${color}`,
              }}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-display text-[19px] tracking-wide">
                      {cls.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {cls.subtitle}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="font-display text-2xl" style={{ color }}>
                      {cls.time}
                    </div>
                    <div
                      className={`text-[10px] font-bold ${full ? "text-red-400" : "text-muted-foreground"}`}
                    >
                      {full ? "FULL" : `${left}/${cls.spots} spots`}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap mb-2.5">
                  <Tag color={color}>{cls.category}</Tag>
                  <Tag color={intColor(cls.intensity)}>{cls.intensity}</Tag>
                  <Tag color="hsl(0 0% 35%)">⏱ {cls.duration}</Tag>
                </div>
                <div className="text-[11px] text-muted-foreground mb-3">
                  👤 {cls.trainer}
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  {booked ? (
                    <>
                      <Tag color="hsl(142 72% 37%)">✓ Booked</Tag>
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
                      variant="primary"
                      size="sm"
                      onClick={() => book(cls)}
                      disabled={full}
                    >
                      {full ? "Full" : "Book Now"}
                    </Btn>
                  )}
                  <button
                    onClick={() => setExpanded(open ? null : cls.name)}
                    className="bg-transparent border-none text-muted-foreground text-[11px] cursor-pointer font-body hover:text-foreground transition-colors"
                  >
                    {open ? "▲ Less" : "▼ Details"}
                  </button>
                  <button
                    onClick={() =>
                      setShowWhoBooked(showingWho ? null : cls.name)
                    }
                    className="bg-transparent border-none text-muted-foreground text-[11px] cursor-pointer font-body hover:text-foreground transition-colors ml-auto"
                  >
                    👥 {bookedCount(cls)}
                  </button>
                </div>
              </div>

              {open && (
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
                  {cls.details.map((d, di) => (
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
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0"
                              style={{ background: color }}
                            >
                              {b.name?.[0] ?? "?"}
                            </div>
                            <span className="text-foreground font-medium">
                              {b.name}
                            </span>
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

      {user.bookings.length > 0 && (
        <div className="mk2-card mt-7">
          <div className="font-bold text-sm mb-3">
            Your Bookings ({user.bookings.length})
          </div>
          {user.bookings.map((b: any, i: number) => {
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
                <span className="text-muted-foreground">{b.date}</span>
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

// import { useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { logEvent } from "@/lib/firebase";
// import { Btn } from "@/components/shared/Btn";
// import { Tag } from "@/components/shared/Tag";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";

// const CLASSES = [
//   { name: "HIIT Blast", time: "06:00", trainer: "Coach Sipho", spots: 8, color: "hsl(0 84% 51%)", subtitle: "High-intensity interval training", details: ["10 rounds Tabata circuits", "Kettlebell swings & burpees", "Heart rate zones 3–5", "Burns 400–600 kcal", "All fitness levels welcome"], duration: "45 min", intensity: "High", category: "Cardio" },
//   { name: "Yoga Flow", time: "07:30", trainer: "Ayanda M.", spots: 12, color: "hsl(263 85% 58%)", subtitle: "Restore, stretch & breathe", details: ["Vinyasa-style sequences", "Deep hip & spine openers", "Pranayama breathwork", "Improves posture & flexibility", "Mats provided"], duration: "60 min", intensity: "Low", category: "Flexibility" },
//   { name: "Strength Circuit", time: "09:00", trainer: "Coach Busi", spots: 6, color: "hsl(20 100% 50%)", subtitle: "Full-body resistance training", details: ["5 stations × 4 rounds", "Barbell, dumbbell & bodyweight", "Progressive overload focus", "Builds lean muscle mass", "Intermediate–Advanced"], duration: "50 min", intensity: "Medium–High", category: "Strength" },
//   { name: "Spin Class", time: "12:00", trainer: "Thandeka N.", spots: 15, color: "hsl(217 91% 53%)", subtitle: "Indoor cycling to the beat", details: ["Music-driven intervals", "Climbs, sprints & recoveries", "Low impact, high output", "Clip-in shoes available", "Burns 500–800 kcal"], duration: "45 min", intensity: "High", category: "Cardio" },
//   { name: "Boxing Fit", time: "17:00", trainer: "Coach Dlamini", spots: 10, color: "hsl(0 84% 51%)", subtitle: "Punch, duck, sweat, repeat", details: ["Pad work & shadow boxing", "Footwork & defence drills", "Core conditioning rounds", "No experience needed", "Gloves & wraps provided"], duration: "55 min", intensity: "High", category: "Combat" },
//   { name: "Pilates Core", time: "18:30", trainer: "Nomsa K.", spots: 8, color: "hsl(142 72% 37%)", subtitle: "Deep core & postural strength", details: ["Mat & reformer principles", "Targets transverse abdominis", "Lumbar spine stabilisation", "Injury rehab friendly", "Small group (max 8)"], duration: "50 min", intensity: "Low–Medium", category: "Core" },
//   { name: "CrossFit WOD", time: "19:00", trainer: "Coach Marcus", spots: 12, color: "hsl(20 100% 50%)", subtitle: "Workout of the Day — go hard", details: ["Daily programmed WOD", "Olympic lifting + gymnastics", "Scaled options available", "Community atmosphere", "Track personal records"], duration: "60 min", intensity: "Very High", category: "CrossFit" },
//   { name: "Evening Yoga", time: "20:00", trainer: "Zanele P.", spots: 10, color: "hsl(263 85% 58%)", subtitle: "Wind down & recover", details: ["Yin & restorative postures", "Long holds 3–5 min", "Fascia & connective tissue", "Perfect post-training", "Guided meditation close"], duration: "60 min", intensity: "Low", category: "Recovery" },
// ];

// const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// const intColor = (i: string) =>
//   i.includes("Very") ? "hsl(0 84% 51%)" : i.includes("High") ? "hsl(20 100% 50%)" : i.includes("Medium") ? "hsl(38 92% 44%)" : "hsl(142 72% 37%)";

// export function ClassBooking() {
//   const { user, updateUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [day, setDay] = useState(DAYS[Math.max(0, new Date().getDay() - 1)]);
//   const [expanded, setExpanded] = useState<string | null>(null);

//   if (!user) return null;

//   const tier = user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
//   const discount = tier === "Gold" ? 0.8 : tier === "Silver" ? 0.9 : 1;
//   const isBooked = (cls: any) => user.bookings.some((b: any) => b.name === cls.name && b.date === day);

//   const book = async (cls: any) => {
//     if (isBooked(cls)) return toast("Already booked!", "error");
//     const updated = { ...user, bookings: [...user.bookings, { ...cls, date: day }] };
//     await updateUser(updated);
//     logEvent("book_class", { class_name: cls.name, day });
//     toast(`✓ ${cls.name} booked for ${day}`, "success");
//   };

//   const cancel = async (cls: any) => {
//     const updated = { ...user, bookings: user.bookings.filter((b: any) => !(b.name === cls.name && b.date === day)) };
//     await updateUser(updated);
//     toast("Booking cancelled", "info");
//   };

//   return (
//     <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
//       <PageTitle sub={`${tier} member — ${discount < 1 ? `${Math.round((1 - discount) * 100)}% discount active` : "earn points for discounts"}`}>
//         Class <span className="text-primary">Booking</span>
//       </PageTitle>

//       {/* Day tabs */}
//       <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
//         {DAYS.map((d) => (
//           <button
//             key={d}
//             onClick={() => setDay(d)}
//             className={`px-3.5 py-2 border rounded-lg font-body font-bold text-[11px] uppercase tracking-wide cursor-pointer whitespace-nowrap transition-all duration-150 ${
//               d === day ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
//             }`}
//           >
//             {isMobile ? d.slice(0, 3) : d}
//           </button>
//         ))}
//       </div>

//       {/* Class cards */}
//       <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
//         {CLASSES.map((cls, i) => {
//           const booked = isBooked(cls);
//           const open = expanded === cls.name;
//           return (
//             <motion.div
//               key={cls.name}
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ delay: i * 0.05 }}
//               className={`bg-card border rounded-xl overflow-hidden transition-colors duration-200 ${open ? "" : "border-border"}`}
//               style={{ borderColor: open ? cls.color : undefined, borderLeft: `3px solid ${cls.color}` }}
//             >
//               <div className="p-4">
//                 <div className="flex justify-between items-start mb-2">
//                   <div>
//                     <div className="font-display text-[19px] tracking-wide">{cls.name}</div>
//                     <div className="text-[11px] text-muted-foreground mt-0.5">{cls.subtitle}</div>
//                   </div>
//                   <div className="text-right shrink-0 ml-2">
//                     <div className="font-display text-2xl" style={{ color: cls.color }}>{cls.time}</div>
//                     <div className="text-[10px] text-muted-foreground">{cls.spots} spots</div>
//                   </div>
//                 </div>
//                 <div className="flex gap-1.5 flex-wrap mb-2.5">
//                   <Tag color={cls.color}>{cls.category}</Tag>
//                   <Tag color={intColor(cls.intensity)}>{cls.intensity}</Tag>
//                   <Tag color="hsl(0 0% 35%)">⏱ {cls.duration}</Tag>
//                 </div>
//                 <div className="text-[11px] text-muted-foreground mb-3">👤 {cls.trainer}</div>
//                 <div className="flex gap-2 items-center flex-wrap">
//                   {booked ? (
//                     <>
//                       <Tag color="hsl(142 72% 37%)">✓ Booked</Tag>
//                       <Btn variant="subtle" size="sm" onClick={() => cancel(cls)}>Cancel</Btn>
//                     </>
//                   ) : (
//                     <Btn variant="primary" size="sm" onClick={() => book(cls)} accentColor={cls.color}>Book Now</Btn>
//                   )}
//                   <button
//                     onClick={() => setExpanded(open ? null : cls.name)}
//                     className="bg-transparent border-none text-muted-foreground text-[11px] cursor-pointer font-body hover:text-foreground transition-colors"
//                   >
//                     {open ? "▲ Less" : "▼ Details"}
//                   </button>
//                 </div>
//               </div>
//               {open && (
//                 <motion.div
//                   initial={{ height: 0, opacity: 0 }}
//                   animate={{ height: "auto", opacity: 1 }}
//                   className="bg-secondary border-t border-border px-4 py-3"
//                 >
//                   <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: cls.color }}>What's Included</div>
//                   {cls.details.map((d, di) => (
//                     <div key={di} className="flex gap-2 mb-1 text-xs text-muted-foreground">
//                       <span style={{ color: cls.color }}>▸</span>{d}
//                     </div>
//                   ))}
//                 </motion.div>
//               )}
//             </motion.div>
//           );
//         })}
//       </div>

//       {/* Your bookings */}
//       {user.bookings.length > 0 && (
//         <div className="mk2-card mt-7">
//           <div className="font-bold text-sm mb-3">Your Bookings ({user.bookings.length})</div>
//           {user.bookings.map((b: any, i: number) => (
//             <div key={i} className="flex justify-between items-center px-3 py-2 bg-secondary rounded-lg mb-1.5 text-xs flex-wrap gap-1.5">
//               <span className="font-bold">{b.name}</span>
//               <span className="text-muted-foreground">{b.date}</span>
//               <span className="text-muted-foreground">{b.time} · {b.trainer}</span>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
