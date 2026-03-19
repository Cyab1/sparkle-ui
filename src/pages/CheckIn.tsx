import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent } from "@/lib/firebase";
import { Btn } from "@/components/shared/Btn";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";
import { useGeolocation } from "@/hooks/useGeolocation";

const REWARDS = [
  {
    pts: 200,
    label: "Silver Loyalty",
    desc: "10% off all classes",
    color: "#94a3b8",
  },
  {
    pts: 350,
    label: "Free Guest Pass",
    desc: "Bring a friend free",
    color: "hsl(20 100% 50%)",
  },
  {
    pts: 500,
    label: "Gold Loyalty",
    desc: "20% off all classes",
    color: "hsl(38 92% 44%)",
  },
  {
    pts: 750,
    label: "Free Month",
    desc: "1 month membership free",
    color: "hsl(142 72% 37%)",
  },
  {
    pts: 1000,
    label: "VIP Elite",
    desc: "25% lifetime discount",
    color: "hsl(263 85% 58%)",
  },
];

export function CheckIn() {
  const { user, updateUser, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const {
    nearGym,
    distanceM,
    loading: geoLoading,
    error: geoError,
    requestLocation,
  } = useGeolocation();

  if (!user) return null;

  const today = new Date().toLocaleDateString("en-ZA");
  const checkedToday = user.checkIns.some((c: any) => c.date === today);
  const tier =
    user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
  const tierColor = {
    Gold: "hsl(38 92% 44%)",
    Silver: "#94a3b8",
    Bronze: "#a16207",
  }[tier]!;
  const nextTier = tier === "Gold" ? null : tier === "Silver" ? 500 : 200;
  const membership = (user as any).membership ?? "basic";
  const memberColor =
    { basic: "#9ca3af", silver: "#e2e8f0", gold: "hsl(38 92% 50%)" }[
      membership
    ] ?? "#9ca3af";

  const doCheckIn = async () => {
    if (checkedToday) return toast("Already checked in today!", "error");
    if (!nearGym)
      return toast(
        "You must be at MK2R Ruimsig to check in (within 20m)",
        "error",
      );
    setLoading(true);
    const updated = {
      ...user,
      points: user.points + 10,
      checkIns: [
        ...user.checkIns,
        {
          date: today,
          time: new Date().toLocaleTimeString("en-ZA", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ],
    };
    await updateUser(updated);
    logEvent("gym_checkin", { points: updated.points });
    toast("Checked in! +10 points 🎉", "success");
    setLoading(false);
  };

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Earn points every visit · Unlock rewards & discounts">
        Gym <span className="text-primary">Check-In</span>
      </PageTitle>

      {/* Location status bar */}
      <div
        className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
        style={{
          background: nearGym ? "rgba(34,197,94,0.08)" : "rgba(255,82,0,0.08)",
          border: `1px solid ${nearGym ? "rgba(34,197,94,0.25)" : "rgba(255,82,0,0.2)"}`,
        }}
      >
        <span
          className="material-symbols-rounded text-xl"
          style={{ color: nearGym ? "#22c55e" : "hsl(20 100% 50%)" }}
        >
          {nearGym ? "location_on" : "location_off"}
        </span>
        <div className="flex-1">
          {geoLoading ? (
            <span className="text-muted-foreground">Detecting location…</span>
          ) : geoError ? (
            <span style={{ color: "hsl(20 100% 50%)" }}>
              Location error — {geoError}
            </span>
          ) : nearGym ? (
            <span style={{ color: "#22c55e" }}>
              ✓ You're at MK2R Ruimsig — ready to check in!
            </span>
          ) : distanceM !== null ? (
            <span style={{ color: "hsl(20 100% 50%)" }}>
              You're {distanceM}m from MK2R — must be within 20m to check in
            </span>
          ) : (
            <span className="text-muted-foreground">
              Tap to detect your location
            </span>
          )}
        </div>
        {!geoLoading && (
          <button
            onClick={requestLocation}
            className="text-[11px] font-bold border-none bg-transparent cursor-pointer"
            style={{ color: "hsl(20 100% 50%)" }}
          >
            {distanceM !== null ? "Refresh" : "Enable"}
          </button>
        )}
      </div>

      <div
        className={`grid gap-4 mb-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
      >
        {/* Check-in card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mk2-card text-center"
          style={{ borderTop: "3px solid hsl(20 100% 50%)" }}
        >
          <div
            className={`font-display leading-none mb-1.5 ${checkedToday ? "text-mk2-green" : "text-primary"}`}
            style={{ fontSize: 80 }}
          >
            {checkedToday ? "✓" : user.checkIns.length}
          </div>
          <div className="font-bold text-base mb-1">
            {checkedToday ? "You're checked in today!" : "Total check-ins"}
          </div>
          <div className="text-muted-foreground text-sm mb-4">
            {checkedToday
              ? "Come back tomorrow for more points"
              : "Must be at MK2R Ruimsig to check in"}
          </div>
          {!nearGym && !checkedToday && distanceM === null && (
            <Btn
              variant="ghost"
              size="lg"
              onClick={requestLocation}
              full
              className="mb-3"
            >
              📍 Detect My Location
            </Btn>
          )}
          <Btn
            variant={checkedToday || !nearGym ? "subtle" : "primary"}
            size="lg"
            onClick={doCheckIn}
            disabled={checkedToday || loading || !nearGym}
            full
            className={!checkedToday && nearGym ? "animate-pulse-glow" : ""}
          >
            {loading
              ? "Checking in…"
              : checkedToday
                ? "✓ Checked In Today"
                : !nearGym
                  ? "📍 Not at gym yet"
                  : "⚡ Check In Now (+10 pts)"}
          </Btn>
        </motion.div>

        {/* Points overview */}
        <div
          className="mk2-card"
          style={{ borderTop: `3px solid ${tierColor}` }}
        >
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="font-display text-[22px]">REWARDS</span>
            <Tag color={tierColor}>{tier} Loyalty</Tag>
            <Tag color={memberColor}>
              {membership.charAt(0).toUpperCase() + membership.slice(1)} Plan
            </Tag>
          </div>
          <div
            className="font-display text-5xl mb-1"
            style={{ color: tierColor }}
          >
            {user.points}
          </div>
          <div className="text-muted-foreground text-sm mb-3">
            {nextTier
              ? `${nextTier - user.points} pts to ${tier === "Bronze" ? "Silver" : "Gold"} loyalty`
              : "Max loyalty tier! 🏆"}
          </div>
          <div className="h-1.5 bg-secondary rounded overflow-hidden mb-2">
            <div
              className="h-full rounded transition-all duration-700"
              style={{
                width: `${nextTier ? Math.min(100, (user.points / nextTier) * 100) : 100}%`,
                background: tierColor,
              }}
            />
          </div>
          {user.checkIns.length > 0 && (
            <div className="max-h-[120px] overflow-y-auto flex flex-col gap-1 mt-3">
              {user.checkIns
                .slice()
                .reverse()
                .slice(0, 5)
                .map((c: any, i: number) => (
                  <div
                    key={i}
                    className="flex justify-between px-2.5 py-1.5 bg-secondary rounded text-[11px]"
                  >
                    <span className="text-primary font-bold">+10 pts</span>
                    <span className="text-muted-foreground">
                      {c.date} · {c.time}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Rewards grid */}
      <div className="mk2-card">
        <div className="font-bold text-sm mb-3">Reward Milestones</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
          {REWARDS.map((r) => {
            const unlocked = user.points >= r.pts;
            return (
              <motion.div
                key={r.pts}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`rounded-xl p-3.5 border transition-all ${unlocked ? "opacity-100" : "opacity-55"}`}
                style={{
                  background: unlocked ? `${r.color}18` : undefined,
                  borderColor: unlocked ? r.color : undefined,
                }}
              >
                <div
                  className="font-display text-xl"
                  style={{ color: unlocked ? r.color : undefined }}
                >
                  {r.pts} PTS
                </div>
                <div
                  className={`font-bold text-xs mt-1 ${unlocked ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {r.label}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {r.desc}
                </div>
                {unlocked && (
                  <div
                    className="mt-1.5 text-[10px] font-bold"
                    style={{ color: r.color }}
                  >
                    ✓ UNLOCKED
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
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

// const REWARDS = [
//   { pts: 200, label: "Silver Status", desc: "10% off all classes", color: "#94a3b8" },
//   { pts: 350, label: "Free Guest Pass", desc: "Bring a friend free", color: "hsl(20 100% 50%)" },
//   { pts: 500, label: "Gold Status", desc: "20% off all classes", color: "hsl(38 92% 44%)" },
//   { pts: 750, label: "Free Month", desc: "1 month membership free", color: "hsl(142 72% 37%)" },
//   { pts: 1000, label: "VIP Elite", desc: "25% lifetime discount", color: "hsl(263 85% 58%)" },
// ];

// export function CheckIn() {
//   const { user, updateUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [loading, setLoading] = useState(false);

//   if (!user) return null;

//   const today = new Date().toLocaleDateString("en-ZA");
//   const checkedToday = user.checkIns.some((c: any) => c.date === today);
//   const tier = user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
//   const tierColor = { Gold: "hsl(38 92% 44%)", Silver: "#94a3b8", Bronze: "#a16207" }[tier]!;
//   const nextTier = tier === "Gold" ? null : tier === "Silver" ? 500 : 200;

//   const doCheckIn = async () => {
//     if (checkedToday) return toast("Already checked in today!", "error");
//     setLoading(true);
//     const updated = {
//       ...user,
//       points: user.points + 10,
//       checkIns: [...user.checkIns, { date: today, time: new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) }],
//     };
//     await updateUser(updated);
//     logEvent("gym_checkin", { points: updated.points });
//     toast("Checked in! +10 points 🎉", "success");
//     setLoading(false);
//   };

//   return (
//     <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
//       <PageTitle sub="Earn points every visit · Unlock rewards & discounts">
//         Gym <span className="text-primary">Check-In</span>
//       </PageTitle>

//       <div className={`grid gap-4 mb-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
//         {/* Check-in card */}
//         <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mk2-card text-center" style={{ borderTop: "3px solid hsl(20 100% 50%)" }}>
//           <div className={`font-display leading-none mb-1.5 ${checkedToday ? "text-mk2-green" : "text-primary"}`} style={{ fontSize: 80 }}>
//             {checkedToday ? "✓" : user.checkIns.length}
//           </div>
//           <div className="font-bold text-base mb-1">{checkedToday ? "You're checked in today!" : "Total check-ins"}</div>
//           <div className="text-muted-foreground text-sm mb-4">{checkedToday ? "Come back tomorrow for more points" : "Tap below to check in and earn points"}</div>
//           <Btn
//             variant={checkedToday ? "subtle" : "primary"}
//             size="lg"
//             onClick={doCheckIn}
//             disabled={checkedToday || loading}
//             full
//             className={checkedToday ? "" : "animate-pulse-glow"}
//           >
//             {loading ? "Checking in…" : checkedToday ? "✓ Checked In Today" : "⚡ Check In Now (+10 pts)"}
//           </Btn>
//         </motion.div>

//         {/* Points overview */}
//         <div className="mk2-card" style={{ borderTop: `3px solid ${tierColor}` }}>
//           <div className="flex items-center gap-2 mb-3">
//             <span className="font-display text-[22px]">REWARDS</span>
//             <Tag color={tierColor}>{tier}</Tag>
//           </div>
//           <div className="font-display text-5xl mb-1" style={{ color: tierColor }}>{user.points}</div>
//           <div className="text-muted-foreground text-sm mb-3">
//             {nextTier ? `${nextTier - user.points} pts to ${tier === "Bronze" ? "Silver" : "Gold"}` : "Max tier reached! 🏆"}
//           </div>
//           <div className="h-1.5 bg-secondary rounded overflow-hidden mb-2">
//             <div className="h-full rounded transition-all duration-700" style={{ width: `${nextTier ? Math.min(100, (user.points / nextTier) * 100) : 100}%`, background: tierColor }} />
//           </div>
//           {user.checkIns.length > 0 && (
//             <div className="max-h-[120px] overflow-y-auto flex flex-col gap-1 mt-3">
//               {user.checkIns.slice().reverse().slice(0, 5).map((c: any, i: number) => (
//                 <div key={i} className="flex justify-between px-2.5 py-1.5 bg-secondary rounded text-[11px]">
//                   <span className="text-primary font-bold">+10 pts</span>
//                   <span className="text-muted-foreground">{c.date} · {c.time}</span>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Rewards grid */}
//       <div className="mk2-card">
//         <div className="font-bold text-sm mb-3">Reward Milestones</div>
//         <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
//           {REWARDS.map((r) => {
//             const unlocked = user.points >= r.pts;
//             return (
//               <motion.div
//                 key={r.pts}
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 className={`rounded-xl p-3.5 border transition-all ${unlocked ? "opacity-100" : "opacity-55"}`}
//                 style={{
//                   background: unlocked ? `${r.color}18` : undefined,
//                   borderColor: unlocked ? r.color : undefined,
//                 }}
//               >
//                 <div className="font-display text-xl" style={{ color: unlocked ? r.color : undefined }}>{r.pts} PTS</div>
//                 <div className={`font-bold text-xs mt-1 ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>{r.label}</div>
//                 <div className="text-[11px] text-muted-foreground mt-0.5">{r.desc}</div>
//                 {unlocked && <div className="mt-1.5 text-[10px] font-bold" style={{ color: r.color }}>✓ UNLOCKED</div>}
//               </motion.div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }
