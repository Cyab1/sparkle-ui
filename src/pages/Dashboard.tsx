import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Btn } from "@/components/shared/Btn";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";

const NEWS_PREVIEW = [
  {
    emoji: "🏆",
    type: "Event",
    title: "30-Day Transformation Challenge",
    date: "1 Apr 2026",
    color: "hsl(20 100% 50%)",
  },
  {
    emoji: "🚴",
    type: "News",
    title: "New Spin Studio Opens",
    date: "20 Mar 2026",
    color: "hsl(217 91% 53%)",
  },
  {
    emoji: "🏃",
    type: "Event",
    title: "Charity Fun Run — 5km & 10km",
    date: "12 Apr 2026",
    color: "hsl(142 72% 37%)",
  },
];

export function Dashboard({ setPage }: { setPage: (p: string) => void }) {
  const { user } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  if (!user) return null;

  const thisWeek = user.workouts.filter(
    (w: any) => Date.now() - w.date < 7 * 86400000,
  ).length;
  const tier =
    user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
  const tierColor = {
    Gold: "hsl(38 92% 44%)",
    Silver: "#94a3b8",
    Bronze: "#a16207",
  }[tier]!;
  const nextTier = tier === "Gold" ? null : tier === "Silver" ? 500 : 200;
  const pct = nextTier ? Math.min(100, (user.points / nextTier) * 100) : 100;

  const stats = [
    {
      label: "Workouts Logged",
      sub: "via AI Planner",
      value: user.workouts.length,
      accent: "hsl(20 100% 50%)",
      icon: "⚡",
    },
    {
      label: "This Week",
      sub: "workouts logged",
      value: thisWeek,
      accent: "hsl(217 91% 53%)",
      icon: "📅",
    },
    {
      label: "Classes Booked",
      sub: "gym classes",
      value: user.bookings.length,
      accent: "hsl(263 85% 58%)",
      icon: "🏋️",
    },
    {
      label: "Check-ins",
      sub: "gym visits",
      value: user.checkIns.length,
      accent: "hsl(142 72% 37%)",
      icon: "✅",
    },
  ];

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-baseline gap-2.5 flex-wrap mb-1">
          <div
            className={`font-display tracking-[0.06em] leading-none ${isMobile ? "text-[32px]" : "text-[52px]"}`}
          >
            Welcome,
          </div>
          <div
            className={`font-display tracking-[0.06em] leading-none text-primary ${isMobile ? "text-[32px]" : "text-[52px]"}`}
          >
            {user.name.split(" ")[0]}
          </div>
        </div>
        <div className="text-muted-foreground text-sm">
          Goal: <strong className="text-foreground">{user.goal}</strong> ·
          Level: <strong className="text-foreground">{user.level}</strong>
        </div>
      </motion.div>

      {/* Stats */}
      <div
        className={`grid gap-3 mb-4 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}
      >
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`mk2-card ${isMobile ? "p-3.5" : "p-5"}`}
            style={{ borderLeft: `3px solid ${s.accent}` }}
          >
            <span className="text-lg block mb-2">{s.icon}</span>
            <div
              className={`font-display leading-none mb-1 ${isMobile ? "text-4xl" : "text-[44px]"}`}
              style={{ color: s.accent }}
            >
              {s.value}
            </div>
            <div className="text-[11px] font-bold text-foreground leading-tight">
              {s.label}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {s.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stat explanation strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mb-5 px-4 py-3 rounded-xl text-[11px] text-muted-foreground flex flex-wrap gap-x-6 gap-y-1"
        style={{
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
        }}
      >
        <span>
          ⚡ <strong className="text-foreground">Workouts</strong> = sessions
          logged via AI Planner
        </span>
        <span>
          🏋️ <strong className="text-foreground">Classes</strong> = gym classes
          booked &amp; attended
        </span>
        <span>
          ✅ <strong className="text-foreground">Check-ins</strong> = daily gym
          visits (+10 pts each)
        </span>
      </motion.div>

      {/* Rewards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mk2-card mb-5"
        style={{ borderLeft: `3px solid ${tierColor}` }}
      >
        <div className="flex justify-between items-center flex-wrap gap-2.5 mb-2.5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display text-[22px]">REWARDS</span>
              <Tag color={tierColor}>{tier} Member</Tag>
            </div>
            <div className="text-sm text-muted-foreground">
              <strong style={{ color: tierColor }}>{user.points} pts</strong>
              {nextTier
                ? ` · ${nextTier - user.points} pts to ${tier === "Bronze" ? "Silver" : "Gold"}`
                : " · Max tier 🏆"}
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => setPage("Checkin")}>
            ✅ Check In +10pts
          </Btn>
        </div>
        <div className="h-1.5 bg-secondary rounded overflow-hidden">
          <div
            className="h-full rounded transition-all duration-700"
            style={{ width: `${pct}%`, background: tierColor }}
          />
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">
          Silver (200pts) = 10% off · Gold (500pts) = 20% off classes
        </div>
      </motion.div>

      {/* Activity + News grid */}
      <div className={`grid gap-4 ${isTablet ? "grid-cols-1" : "grid-cols-3"}`}>
        {/* Training Log */}
        <div
          className="mk2-card"
          style={{ borderTop: "2px solid hsl(20 100% 50%)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold text-sm">⚡ Training Log</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Your AI Planner sessions
              </div>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setPage("Workout")}>
              + Log
            </Btn>
          </div>
          {user.workouts.length === 0 ? (
            <div className="text-muted-foreground text-xs leading-relaxed py-3 text-center">
              No sessions yet.
              <br />
              <span
                className="text-primary cursor-pointer font-bold"
                onClick={() => setPage("Workout")}
              >
                Try the AI Planner →
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {user.workouts
                .slice(-4)
                .reverse()
                .map((w: any, i: number) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2 border-b border-border text-xs"
                  >
                    <Tag color="hsl(20 100% 50%)">{w.type}</Tag>
                    <span className="text-muted-foreground">
                      {w.duration}min ·{" "}
                      {new Date(w.date).toLocaleDateString("en-ZA")}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Booked Classes */}
        <div
          className="mk2-card"
          style={{ borderTop: "2px solid hsl(263 85% 58%)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold text-sm">🏋️ Booked Classes</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Your upcoming gym classes
              </div>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setPage("Classes")}>
              Book
            </Btn>
          </div>
          {user.bookings.length === 0 ? (
            <div className="text-muted-foreground text-xs leading-relaxed py-3 text-center">
              No classes booked yet.
              <br />
              <span
                className="text-primary cursor-pointer font-bold"
                onClick={() => setPage("Classes")}
              >
                Browse classes →
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {user.bookings
                .slice(-4)
                .reverse()
                .map((b: any, i: number) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2 border-b border-border text-xs"
                  >
                    <Tag color="hsl(263 85% 58%)">{b.name}</Tag>
                    <span className="text-muted-foreground">
                      {b.date} · {b.time}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* News & Events */}
        <div
          className="mk2-card cursor-pointer hover:border-primary/30 transition-colors"
          style={{ borderTop: "2px solid hsl(38 92% 44%)" }}
          onClick={() => setPage("News")}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold text-sm">📢 News & Events</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                What's happening at MK2
              </div>
            </div>
            <span className="text-[10px] text-primary font-bold">
              View all →
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {NEWS_PREVIEW.map((n, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="flex items-center gap-2.5 py-2 border-b border-border"
              >
                <span className="text-lg shrink-0">{n.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{n.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                    <Tag color={n.color}>{n.type}</Tag>
                    <span>{n.date}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className={`grid gap-2 mt-4 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}
      >
        {[
          {
            label: "AI Workout",
            icon: "⚡",
            page: "Workout",
            color: "hsl(20 100% 50%)",
          },
          {
            label: "Book Class",
            icon: "📅",
            page: "Classes",
            color: "hsl(263 85% 58%)",
          },
          {
            label: "Leaderboard",
            icon: "🏆",
            page: "Leaderboard",
            color: "hsl(38 92% 44%)",
          },
          {
            label: "InBody Scan",
            icon: "📊",
            page: "InBody",
            color: "hsl(187 85% 40%)",
          },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => setPage(a.page)}
            className="mk2-card flex items-center gap-2.5 py-3 px-4 cursor-pointer hover:border-primary/30 transition-all duration-150 border-none text-left w-full"
            style={{ borderLeft: `3px solid ${a.color}` }}
          >
            <span className="text-xl">{a.icon}</span>
            <span className="font-bold text-xs">{a.label}</span>
          </button>
        ))}
      </motion.div>
    </div>
  );
}

// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { Btn } from "@/components/shared/Btn";
// import { Tag } from "@/components/shared/Tag";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";

// const statAccents = [
//   "hsl(20 100% 50%)",
//   "hsl(217 91% 53%)",
//   "hsl(263 85% 58%)",
//   "hsl(142 72% 37%)",
// ];

// export function Dashboard({ setPage }: { setPage: (p: string) => void }) {
//   const { user } = useAuth();
//   const { isMobile, isTablet } = useBreakpoint();
//   if (!user) return null;

//   const thisWeek = user.workouts.filter((w: any) => Date.now() - w.date < 7 * 86400000).length;
//   const tier = user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
//   const tierColor = { Gold: "hsl(38 92% 44%)", Silver: "#94a3b8", Bronze: "#a16207" }[tier];
//   const nextTier = tier === "Gold" ? null : tier === "Silver" ? 500 : 200;
//   const pct = nextTier ? Math.min(100, (user.points / nextTier) * 100) : 100;

//   const stats = [
//     { label: "Workouts", value: user.workouts.length, accent: statAccents[0] },
//     { label: "This Week", value: thisWeek, accent: statAccents[1] },
//     { label: "Classes", value: user.bookings.length, accent: statAccents[2] },
//     { label: "Check-ins", value: user.checkIns.length, accent: statAccents[3] },
//   ];

//   return (
//     <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
//       {/* Welcome */}
//       <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-baseline gap-2.5 flex-wrap mb-1">
//         <div className={`font-display tracking-[0.06em] leading-none ${isMobile ? "text-[32px]" : "text-[52px]"}`}>Welcome,</div>
//         <div className={`font-display tracking-[0.06em] leading-none text-primary ${isMobile ? "text-[32px]" : "text-[52px]"}`}>
//           {user.name.split(" ")[0]}
//         </div>
//       </motion.div>
//       <div className="text-muted-foreground text-sm mb-7">Goal: {user.goal} · Level: {user.level}</div>

//       {/* Stats */}
//       <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
//         {stats.map((s, i) => (
//           <motion.div
//             key={s.label}
//             initial={{ opacity: 0, y: 12 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: i * 0.08 }}
//             className={`mk2-card ${isMobile ? "p-3.5" : "p-5"}`}
//             style={{ borderLeft: `3px solid ${s.accent}` }}
//           >
//             <div className="text-[10px] text-muted-foreground uppercase tracking-[0.1em] mb-1.5">{s.label}</div>
//             <div className={`font-display leading-none ${isMobile ? "text-4xl" : "text-[44px]"}`} style={{ color: s.accent }}>
//               {s.value}
//             </div>
//           </motion.div>
//         ))}
//       </div>

//       {/* Points banner */}
//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         transition={{ delay: 0.3 }}
//         className="mk2-card mb-4"
//         style={{ borderLeft: `3px solid ${tierColor}` }}
//       >
//         <div className="flex justify-between items-center flex-wrap gap-2.5 mb-2.5">
//           <div>
//             <div className="flex items-center gap-2 mb-1">
//               <span className="font-display text-[22px]">REWARDS</span>
//               <Tag color={tierColor!}>{tier} Member</Tag>
//             </div>
//             <div className="text-sm text-muted-foreground">
//               <strong style={{ color: tierColor! }}>{user.points} pts</strong>
//               {nextTier ? ` · ${nextTier - user.points} pts to ${tier === "Bronze" ? "Silver" : "Gold"}` : " · Max tier 🏆"}
//             </div>
//           </div>
//           <Btn variant="ghost" size="sm" onClick={() => setPage("Checkin")}>Check In +10pts</Btn>
//         </div>
//         <div className="h-1.5 bg-secondary rounded overflow-hidden">
//           <div className="h-full rounded transition-all duration-700" style={{ width: `${pct}%`, background: tierColor! }} />
//         </div>
//         <div className="mt-2 text-[11px] text-muted-foreground">Silver (200pts) = 10% off · Gold (500pts) = 20% off classes</div>
//       </motion.div>

//       {/* Recent activity */}
//       <div className={`grid gap-4 ${isTablet ? "grid-cols-1" : "grid-cols-2"}`}>
//         <div className="mk2-card">
//           <div className="font-bold text-sm mb-3">Recent Workouts</div>
//           {user.workouts.length === 0 ? (
//             <div className="text-muted-foreground text-sm">No workouts yet. Try the AI Planner!</div>
//           ) : (
//             user.workouts.slice(-3).reverse().map((w: any, i: number) => (
//               <div key={i} className="flex justify-between items-center py-2 border-b border-border text-sm">
//                 <Tag color="hsl(20 100% 50%)">{w.type}</Tag>
//                 <span className="text-muted-foreground">{w.duration}min · {new Date(w.date).toLocaleDateString("en-ZA")}</span>
//               </div>
//             ))
//           )}
//         </div>
//         <div className="mk2-card">
//           <div className="font-bold text-sm mb-3">Upcoming Classes</div>
//           {user.bookings.length === 0 ? (
//             <div className="text-muted-foreground text-sm">No classes booked yet.</div>
//           ) : (
//             user.bookings.slice(-3).reverse().map((b: any, i: number) => (
//               <div key={i} className="flex justify-between items-center py-2 border-b border-border text-sm">
//                 <Tag color="hsl(217 91% 53%)">{b.name}</Tag>
//                 <span className="text-muted-foreground">{b.date} · {b.time}</span>
//               </div>
//             ))
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
