import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Btn } from "@/components/shared/Btn";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";

const statAccents = [
  "hsl(20 100% 50%)",
  "hsl(217 91% 53%)",
  "hsl(263 85% 58%)",
  "hsl(142 72% 37%)",
];

export function Dashboard({ setPage }: { setPage: (p: string) => void }) {
  const { user } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  if (!user) return null;

  const thisWeek = user.workouts.filter((w: any) => Date.now() - w.date < 7 * 86400000).length;
  const tier = user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
  const tierColor = { Gold: "hsl(38 92% 44%)", Silver: "#94a3b8", Bronze: "#a16207" }[tier];
  const nextTier = tier === "Gold" ? null : tier === "Silver" ? 500 : 200;
  const pct = nextTier ? Math.min(100, (user.points / nextTier) * 100) : 100;

  const stats = [
    { label: "Workouts", value: user.workouts.length, accent: statAccents[0] },
    { label: "This Week", value: thisWeek, accent: statAccents[1] },
    { label: "Classes", value: user.bookings.length, accent: statAccents[2] },
    { label: "Check-ins", value: user.checkIns.length, accent: statAccents[3] },
  ];

  return (
    <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-baseline gap-2.5 flex-wrap mb-1">
        <div className={`font-display tracking-[0.06em] leading-none ${isMobile ? "text-[32px]" : "text-[52px]"}`}>Welcome,</div>
        <div className={`font-display tracking-[0.06em] leading-none text-primary ${isMobile ? "text-[32px]" : "text-[52px]"}`}>
          {user.name.split(" ")[0]}
        </div>
      </motion.div>
      <div className="text-muted-foreground text-sm mb-7">Goal: {user.goal} · Level: {user.level}</div>

      {/* Stats */}
      <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`mk2-card ${isMobile ? "p-3.5" : "p-5"}`}
            style={{ borderLeft: `3px solid ${s.accent}` }}
          >
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.1em] mb-1.5">{s.label}</div>
            <div className={`font-display leading-none ${isMobile ? "text-4xl" : "text-[44px]"}`} style={{ color: s.accent }}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Points banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mk2-card mb-4"
        style={{ borderLeft: `3px solid ${tierColor}` }}
      >
        <div className="flex justify-between items-center flex-wrap gap-2.5 mb-2.5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display text-[22px]">REWARDS</span>
              <Tag color={tierColor!}>{tier} Member</Tag>
            </div>
            <div className="text-sm text-muted-foreground">
              <strong style={{ color: tierColor! }}>{user.points} pts</strong>
              {nextTier ? ` · ${nextTier - user.points} pts to ${tier === "Bronze" ? "Silver" : "Gold"}` : " · Max tier 🏆"}
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => setPage("Checkin")}>Check In +10pts</Btn>
        </div>
        <div className="h-1.5 bg-secondary rounded overflow-hidden">
          <div className="h-full rounded transition-all duration-700" style={{ width: `${pct}%`, background: tierColor! }} />
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">Silver (200pts) = 10% off · Gold (500pts) = 20% off classes</div>
      </motion.div>

      {/* Recent activity */}
      <div className={`grid gap-4 ${isTablet ? "grid-cols-1" : "grid-cols-2"}`}>
        <div className="mk2-card">
          <div className="font-bold text-sm mb-3">Recent Workouts</div>
          {user.workouts.length === 0 ? (
            <div className="text-muted-foreground text-sm">No workouts yet. Try the AI Planner!</div>
          ) : (
            user.workouts.slice(-3).reverse().map((w: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border text-sm">
                <Tag color="hsl(20 100% 50%)">{w.type}</Tag>
                <span className="text-muted-foreground">{w.duration}min · {new Date(w.date).toLocaleDateString("en-ZA")}</span>
              </div>
            ))
          )}
        </div>
        <div className="mk2-card">
          <div className="font-bold text-sm mb-3">Upcoming Classes</div>
          {user.bookings.length === 0 ? (
            <div className="text-muted-foreground text-sm">No classes booked yet.</div>
          ) : (
            user.bookings.slice(-3).reverse().map((b: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border text-sm">
                <Tag color="hsl(217 91% 53%)">{b.name}</Tag>
                <span className="text-muted-foreground">{b.date} · {b.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
